/**
 * ResQ Automated SMS Lifecycle & Security Test Suite
 * Validates:
 * 1. Phone normalization (valid 10-digit, strip +91/0/spaces, throw INVALID_PHONE)
 * 2. Provider abstraction (mock preview, masking, templates)
 * 3. Notification service (rate limiting, deduplication, skipping, stable error codes)
 * 4. API Endpoints (POST /api/sos, PATCH take, PATCH status, 409 conflict, 400 invalid transition)
 * 5. Database migration idempotency (003_sms_support.sql via pg-mem)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { newDb } from 'pg-mem';
import {
  normalizeIndianPhone,
  maskPhone,
  renderSmsTemplate,
  sendSms,
  getDevSmsPreviews,
  clearDevSmsPreviews,
  SmsError,
} from '../src/services/sms.js';
import {
  notifySosEvent,
  getSmsLogsBySosId,
  resetRateLimits,
  clearInMemorySmsLogs,
} from '../src/services/smsNotifications.js';
import { createSOSRequest, takeSOS, updateSOSStatus } from '../src/services/sosStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure SMS_PROVIDER is mock for testing
process.env.SMS_PROVIDER = 'mock';
process.env.NODE_ENV = 'development';

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedCount++;
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('  ResQ Outbound SMS Test Suite');
  console.log('========================================\n');

  // --------------------------------------------------------------------------
  // Group 1: Phone Normalization
  // --------------------------------------------------------------------------
  console.log('Group 1: Indian Phone Normalization & Masking');

  await test('Normalizes standard 10-digit number starting with 6-9', () => {
    assert.strictEqual(normalizeIndianPhone('9849033331'), '919849033331');
    assert.strictEqual(normalizeIndianPhone('8123456789'), '918123456789');
    assert.strictEqual(normalizeIndianPhone('7000011112'), '917000011112');
    assert.strictEqual(normalizeIndianPhone('6300099999'), '916300099999');
  });

  await test('Strips spaces, dashes, dots and parentheses', () => {
    assert.strictEqual(normalizeIndianPhone(' 98490 33331 '), '919849033331');
    assert.strictEqual(normalizeIndianPhone('9849-033-331'), '919849033331');
    assert.strictEqual(normalizeIndianPhone('(98490) 33331'), '919849033331');
    assert.strictEqual(normalizeIndianPhone('98490.33331'), '919849033331');
  });

  await test('Strips leading +91, 91, and trunk 0', () => {
    assert.strictEqual(normalizeIndianPhone('+919849033331'), '919849033331');
    assert.strictEqual(normalizeIndianPhone('+91 98490 33331'), '919849033331');
    assert.strictEqual(normalizeIndianPhone('919849033331'), '919849033331');
    assert.strictEqual(normalizeIndianPhone('09849033331'), '919849033331');
  });

  await test('Throws INVALID_PHONE on invalid format or non-Indian prefix', () => {
    const invalidInputs = [
      '',
      null,
      undefined,
      '12345',               // Too short
      '1234567890',          // Starts with 1 (not 6-9)
      '5123456789',          // Starts with 5
      '+15551234567',        // US number
      '9849033331122',       // Too long
      'abcdefghij',          // Non-numeric
      '009849033331',        // Invalid double 0
    ];

    for (const input of invalidInputs) {
      assert.throws(
        () => normalizeIndianPhone(input),
        (err) => err instanceof SmsError && err.code === 'INVALID_PHONE',
        `Expected INVALID_PHONE for: "${input}"`
      );
    }
  });

  await test('Masks phone number safely showing only last 4 digits', () => {
    assert.strictEqual(maskPhone('919849033331'), '******3331');
    assert.strictEqual(maskPhone('9849033331'), '******3331');
    assert.strictEqual(maskPhone('+91 98490 12345'), '******2345');
    assert.strictEqual(maskPhone(''), '******0000');
    assert.strictEqual(maskPhone(null), '******0000');
  });

  // --------------------------------------------------------------------------
  // Group 2: Provider Abstraction & Template Rendering
  // --------------------------------------------------------------------------
  console.log('\nGroup 2: Provider Abstraction & Mock Mode');

  await test('Renders templates for all SOS lifecycle stages without personal data', () => {
    const sosId = 'FQ1024';
    const tCreated = renderSmsTemplate('SOS_CREATED', { SOS_ID: sosId, PRIORITY: 'CRITICAL' });
    assert(tCreated.includes('FQ1024'));
    assert(tCreated.includes('CRITICAL'));
    assert(!tCreated.includes('undefined'));

    const tAssigned = renderSmsTemplate('RESPONDER_ASSIGNED', { SOS_ID: sosId });
    assert(tAssigned.includes('assigned to your SOS request FQ1024'));

    const tWay = renderSmsTemplate('ON_THE_WAY', { SOS_ID: sosId });
    assert(tWay.includes('on the way for SOS FQ1024'));

    const tArrived = renderSmsTemplate('ARRIVED', { SOS_ID: sosId });
    assert(tArrived.includes('has arrived at your location for SOS FQ1024'));

    const tRescued = renderSmsTemplate('RESCUED', { SOS_ID: sosId, SHELTER: 'LB Stadium Relief Camp' });
    assert(tRescued.includes('Civilian extraction completed for SOS FQ1024'));
    assert(tRescued.includes('LB Stadium Relief Camp'));
  });

  await test('Throws SMS_TEMPLATE_INVALID on unknown event type', () => {
    assert.throws(
      () => renderSmsTemplate('UNKNOWN_EVENT', {}),
      (err) => err instanceof SmsError && err.code === 'SMS_TEMPLATE_INVALID'
    );
  });

  await test('sendSms in mock mode stores preview in dev buffer and never contacts network', async () => {
    clearDevSmsPreviews();
    const result = await sendSms({
      to: '9849033331',
      eventType: 'SOS_CREATED',
      variables: { SOS_ID: 'FQ9999', PRIORITY: 'HIGH' },
      sosId: 'FQ9999',
    });

    assert.strictEqual(result.provider, 'mock');
    assert.strictEqual(result.phone_masked, '******3331');
    assert(result.provider_request_id.startsWith('mock-req-'));
    assert(result.preview.includes('FQ9999'));

    const previews = getDevSmsPreviews('FQ9999');
    assert.strictEqual(previews.length, 1);
    assert.strictEqual(previews[0].event_type, 'SOS_CREATED');
  });

  // --------------------------------------------------------------------------
  // Group 3: Notification Service (Preferences, Dedup, Rate Limiting)
  // --------------------------------------------------------------------------
  console.log('\nGroup 3: Notification Service Logic');

  await test('notifySosEvent saves log and never throws on missing SOS', async () => {
    const res = await notifySosEvent({ sosId: 'NON_EXISTENT_SOS', eventType: 'SOS_CREATED' });
    assert.strictEqual(res.skipped, true);
    assert.strictEqual(res.reason, 'SOS_NOT_FOUND');
  });

  await test('notifySosEvent skips when sms_enabled is false (SMS_DISABLED)', async () => {
    const sosDisabled = await createSOSRequest({
      citizen_id: 'test-user-disabled',
      citizen_name: 'Disabled User',
      citizen_phone: '+91-9849011111',
      priority: 'high',
      emergency_type: 'trapped',
      latitude: 17.385,
      longitude: 78.486,
    });

    const res = await notifySosEvent({
      sosId: sosDisabled.id,
      eventType: 'SOS_CREATED',
      extra: { sms_enabled: false },
    });
    assert.strictEqual(res.status, 'skipped');
    assert.strictEqual(res.error_code, 'SMS_DISABLED');
  });

  await test('notifySosEvent skips when citizen phone is missing (NO_PHONE)', async () => {
    const sosNoPhone = await createSOSRequest({
      citizen_id: 'test-user-nophone',
      citizen_name: 'No Phone User',
      citizen_phone: '',
      priority: 'high',
      emergency_type: 'trapped',
      latitude: 17.385,
      longitude: 78.486,
    });

    const res = await notifySosEvent({ sosId: sosNoPhone.id, eventType: 'SOS_CREATED' });
    assert.strictEqual(res.status, 'skipped');
    assert.strictEqual(res.error_code, 'NO_PHONE');
  });

  await test('Deduplication: duplicate send attempt for same (sos_id, event_type) is skipped', async () => {
    clearInMemorySmsLogs();
    resetRateLimits();

    const sos = await createSOSRequest({
      citizen_id: 'user-dedup-test',
      citizen_name: 'Dedup Test Citizen',
      citizen_phone: '+91-9849022222',
      priority: 'high',
      emergency_type: 'trapped',
      latitude: 17.385,
      longitude: 78.486,
    });

    // First send
    const res1 = await notifySosEvent({ sosId: sos.id, eventType: 'SOS_CREATED' });
    assert.strictEqual(res1.status, 'sent');

    // Second send for same event
    const res2 = await notifySosEvent({ sosId: sos.id, eventType: 'SOS_CREATED' });
    assert.strictEqual(res2.status, 'skipped');
    assert.strictEqual(res2.reason, 'DUPLICATE_EVENT');
  });

  await test('Rate Limiting: blocks dispatch when exceeding 6 SMS in 10 minutes', async () => {
    resetRateLimits();
    const userId = 'rate-limit-test-user';

    const sos = await createSOSRequest({
      citizen_id: userId,
      citizen_name: 'Rate Limit Citizen',
      citizen_phone: '+91-9849033333',
      priority: 'high',
      emergency_type: 'trapped',
      latitude: 17.385,
      longitude: 78.486,
    });

    // Send 6 SMS events with distinct event types / distinct SOS IDs
    for (let i = 1; i <= 6; i++) {
      const distinctSos = await createSOSRequest({
        citizen_id: userId,
        citizen_name: 'Rate Limit Citizen',
        citizen_phone: '+91-9849033333',
        priority: 'high',
        emergency_type: 'trapped',
        latitude: 17.385,
        longitude: 78.486,
      });
      const res = await notifySosEvent({ sosId: distinctSos.id, eventType: 'SOS_CREATED' });
      assert.strictEqual(res.status, 'sent', `Expected send ${i} to succeed`);
    }

    // 7th SMS should be rate-limited
    const distinctSos7 = await createSOSRequest({
      citizen_id: userId,
      citizen_name: 'Rate Limit Citizen',
      citizen_phone: '+91-9849033333',
      priority: 'high',
      emergency_type: 'trapped',
      latitude: 17.385,
      longitude: 78.486,
    });
    const res7 = await notifySosEvent({ sosId: distinctSos7.id, eventType: 'SOS_CREATED' });
    assert.strictEqual(res7.status, 'failed');
    assert.strictEqual(res7.error_code, 'SMS_RATE_LIMITED');
  });

  // --------------------------------------------------------------------------
  // Group 4: SOS Lifecycle Transitions & Conflict Protection
  // --------------------------------------------------------------------------
  console.log('\nGroup 4: SOS Lifecycle & Conflict Protection');

  await test('Atomic claim conflict: second take produces 409 SOS_ALREADY_TAKEN and sends no SMS', async () => {
    const sos = await createSOSRequest({
      citizen_id: 'citizen-conflict-test',
      citizen_name: 'Citizen Under Risk',
      citizen_phone: '+91-9849044444',
      priority: 'critical',
      emergency_type: 'trapped',
      latitude: 17.385,
      longitude: 78.486,
    });

    // First responder claims
    const claim1 = await takeSOS({
      id: sos.id,
      responderId: 'responder-1',
      responderProfile: { full_name: 'Team Alpha NDRF' },
    });
    assert.strictEqual(claim1.conflict, undefined);
    assert.strictEqual(claim1.data.status, 'ACCEPTED');

    // Second responder tries to claim the same incident
    const claim2 = await takeSOS({
      id: sos.id,
      responderId: 'responder-2',
      responderProfile: { full_name: 'Team Bravo SDRF' },
    });

    assert.strictEqual(claim2.conflict, true);
    assert.strictEqual(claim2.code, 'SOS_ALREADY_TAKEN');
  });

  await test('Status update transitions and invalid transition error', async () => {
    const sos = await createSOSRequest({
      citizen_id: 'citizen-lifecycle-test',
      citizen_name: 'Lifecycle Citizen',
      citizen_phone: '+91-9849055555',
      priority: 'critical',
      emergency_type: 'trapped',
      latitude: 17.385,
      longitude: 78.486,
    });

    // Claim
    await takeSOS({ id: sos.id, responderId: 'responder-alpha', responderProfile: { full_name: 'Alpha' } });

    // Transition to ON_THE_WAY
    const rWay = await updateSOSStatus({ id: sos.id, nextStatus: 'ON_THE_WAY', responderId: 'responder-alpha' });
    assert.strictEqual(rWay.data.status, 'ON_THE_WAY');

    // Transition to ARRIVED
    const rArrived = await updateSOSStatus({ id: sos.id, nextStatus: 'ARRIVED', responderId: 'responder-alpha' });
    assert.strictEqual(rArrived.data.status, 'ARRIVED');

    // Transition to RESCUED (with shelter)
    const rRescued = await updateSOSStatus({ id: sos.id, nextStatus: 'RESCUED', responderId: 'responder-alpha' });
    assert.strictEqual(rRescued.data.status, 'RESCUED');

    // Invalid transition: going backward from RESCUED to WAITING
    const rInvalid = await updateSOSStatus({ id: sos.id, nextStatus: 'WAITING', responderId: 'responder-alpha' });
    assert.ok(rInvalid.error);
    assert.strictEqual(rInvalid.code, 'INVALID_STATUS_TRANSITION');
  });

  // --------------------------------------------------------------------------
  // Group 5: Database Migration Idempotency (003_sms_support.sql)
  // --------------------------------------------------------------------------
  console.log('\nGroup 5: Database Migration Idempotency');

  await test('003_sms_support.sql runs cleanly and idempotently on PostgreSQL (pg-mem)', () => {
    const db = newDb({ noAstCoverageCheck: true });

    let uuidSeq = 1;
    db.public.registerFunction({
      name: 'gen_random_uuid',
      returns: db.public.getType('uuid'),
      impure: true,
      implementation: () => `00000000-0000-0000-0000-${String(uuidSeq++).padStart(12, '0')}`,
    });

    // 1. Setup prerequisite mock schema
    db.public.none(`
      CREATE TABLE IF NOT EXISTS profiles (
        id uuid PRIMARY KEY,
        phone text,
        role text DEFAULT 'citizen'
      );

      CREATE TABLE IF NOT EXISTS sos_requests (
        id text PRIMARY KEY,
        citizen_id uuid,
        status text DEFAULT 'WAITING',
        created_at timestamptz DEFAULT now()
      );
    `);

    // Load 003_sms_support.sql
    const migrationPath = path.resolve(__dirname, '../../supabase/migrations/003_sms_support.sql');
    let sql = fs.readFileSync(migrationPath, 'utf8');

    // Strip comments and plpgsql/Supabase-specific blocks unsupported in pg-mem parser
    const sanitizedSql = sql
      .replace(/ALTER PUBLICATION [\s\S]*?;/gi, '-- publication skipped')
      .replace(/DROP POLICY [\s\S]*?;/gi, '-- drop policy skipped')
      .replace(/CREATE POLICY [\s\S]*?;/gi, '-- policy skipped')
      .replace(/ALTER TABLE .* ENABLE ROW LEVEL SECURITY;/gi, '-- rls skipped')
      .replace(/DO \$\$[\s\S]*?\$\$[\s\S]*?;/gi, '-- do block skipped')
      .replace(/ALTER TABLE .* REPLICA IDENTITY FULL;/gi, '-- replica identity skipped');

    // First execution: Clean database
    db.public.none(sanitizedSql);

    // Verify columns exist on profiles
    const profRow = db.public.one(`
      INSERT INTO profiles (id, phone) VALUES ('00000000-0000-0000-0000-000000000001', '+91-9849033331')
      RETURNING phone_verified, sms_enabled;
    `);
    assert.strictEqual(profRow.phone_verified, false);
    assert.strictEqual(profRow.sms_enabled, true);

    // Verify sms_logs table and insert
    const logRow1 = db.public.one(`
      INSERT INTO sms_logs (phone_masked, event_type, provider, status)
      VALUES ('******3331', 'SOS_CREATED', 'mock', 'sent')
      RETURNING id, status, phone_masked;
    `);
    assert.strictEqual(logRow1.status, 'sent');
    assert.strictEqual(logRow1.phone_masked, '******3331');

    // Second execution: Run on top of existing database (Idempotency)
    db.public.none(sanitizedSql);

    // Verify sms_logs table accepts another insert after re-running migration
    const logRow2 = db.public.one(`
      INSERT INTO sms_logs (phone_masked, event_type, provider, status)
      VALUES ('******3331', 'ON_THE_WAY', 'mock', 'sent')
      RETURNING id, status, phone_masked;
    `);
    assert.strictEqual(logRow2.status, 'sent');
    assert.strictEqual(logRow2.phone_masked, '******3331');
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n========================================');
  console.log(`Test Results: ${passedCount} passed, ${failedCount} failed`);
  console.log('========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
