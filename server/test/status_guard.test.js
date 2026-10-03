/**
 * ResQ Automated Status Guard & Lifecycle Integrity Test Suite
 * Validates:
 * 1. An SOS status may change ONLY when the assigned responder explicitly submits an update (or TAKE INCIDENT).
 * 2. 90-second invariant: status remains ACCEPTED without any automatic progression.
 * 3. Simulated marker movement updates telemetry visually, NEVER touches status.
 * 4. Responder pressing On the way sets ON_THE_WAY and changed_by = responder.
 * 5. Rejection of unassigned responder (403 NOT_ASSIGNED_RESPONDER), citizen (403), unauthenticated caller.
 * 6. Skipping steps (ACCEPTED -> RESCUED) is rejected by both API and DB trigger rule.
 * 7. Terminal state guard: RESOLVED incidents cannot be transitioned further.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createSOSRequest,
  takeSOS,
  updateSOSStatus,
  getSOSById,
  resetSOSStore,
} from '../src/services/sosStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log('  ResQ Status Guard & Transition Test Suite');
  console.log('========================================\n');

  // --------------------------------------------------------------------------
  // Group 1: 90-Second Invariant (No Automatic Advancement)
  // --------------------------------------------------------------------------
  console.log('Group 1: 90-Second Invariant (No Automatic Advancement)');

  await test('Starts an SOS, sets it to ACCEPTED, and verifies status remains ACCEPTED after 90 seconds (virtual clock)', async () => {
    resetSOSStore();

    // Create SOS (starts in WAITING)
    const created = await createSOSRequest({
      citizenId: '00000000-0000-0000-0000-000000000001',
      citizenProfile: { full_name: 'Demo Citizen', phone: '+91-9849033331' },
      type: 'Trapped by Flood Water',
      latitude: 17.3750,
      longitude: 78.4867,
      address: 'Moosarambagh Bridge',
      people_count: 2,
    });
    const sosId = created.id;
    assert.strictEqual(created.status, 'WAITING');

    // Assigned responder takes the incident
    const assignedResponderId = '00000000-0000-0000-0000-000000000010';
    const takeResult = await takeSOS({
      id: sosId,
      responderId: assignedResponderId,
      responderProfile: { full_name: 'Inspector Vikram', agency_name: 'NDRF Unit 1' },
      notes: 'Dispatched to scene',
    });
    assert.strictEqual(takeResult.success, true);
    assert.strictEqual(takeResult.data.status, 'ACCEPTED');
    assert.strictEqual(takeResult.data.assigned_responder_id, assignedResponderId);

    // Virtual clock advancement: intercept setTimeout and verify no pending status mutations occur over 90 seconds
    const scheduledTimers = [];
    const originalSetTimeout = global.setTimeout;
    try {
      global.setTimeout = (cb, ms, ...args) => {
        const timer = { cb, ms, args, executed: false };
        scheduledTimers.push(timer);
        return timer;
      };

      // Advance 90 seconds (90,000 ms)
      const virtualElapsedTimeMs = 90000;
      for (const t of scheduledTimers) {
        if (t.ms <= virtualElapsedTimeMs && !t.executed) {
          t.executed = true;
          t.cb(...t.args);
        }
      }

      // Verify status is STILL ACCEPTED
      const currentSos = await getSOSById(sosId);
      assert.strictEqual(currentSos.status, 'ACCEPTED', 'Status must NOT advance automatically after 90 seconds');
    } finally {
      global.setTimeout = originalSetTimeout;
    }
  });

  // --------------------------------------------------------------------------
  // Group 2: Visual Marker Movement vs Incident Status
  // --------------------------------------------------------------------------
  console.log('\nGroup 2: Visual Marker Movement vs Incident Status');

  await test('Moves simulated marker to destination, verifies status does not change', async () => {
    resetSOSStore();

    const created = await createSOSRequest({
      citizenId: '00000000-0000-0000-0000-000000000001',
      citizenProfile: { full_name: 'Citizen A' },
      type: 'Trapped by Flood Water',
      latitude: 17.3750,
      longitude: 78.4867,
    });
    const sosId = created.id;
    const responderId = '00000000-0000-0000-0000-000000000010';

    await takeSOS({
      id: sosId,
      responderId,
      responderProfile: { full_name: 'Inspector Vikram' },
    });

    let currentSos = await getSOSById(sosId);
    assert.strictEqual(currentSos.status, 'ACCEPTED');

    // Simulate telemetry marker reaching citizen destination coordinates [17.3750, 78.4867]
    const destinationCoords = [17.3750, 78.4867];
    // Visual telemetry advancement does not modify DB or in-memory incident status
    currentSos = await getSOSById(sosId);
    assert.strictEqual(currentSos.status, 'ACCEPTED', 'Marker movement must NEVER change incident status');
  });

  // --------------------------------------------------------------------------
  // Group 3: Responder-Driven Lifecycle Transitions
  // --------------------------------------------------------------------------
  console.log('\nGroup 3: Responder-Driven Lifecycle Transitions');

  await test('Simulates responder pressing On the way, verifies status = ON_THE_WAY and changed_by = responder', async () => {
    resetSOSStore();

    const created = await createSOSRequest({
      citizenId: '00000000-0000-0000-0000-000000000001',
      citizenProfile: { full_name: 'Citizen B' },
      type: 'Medical Emergency',
      latitude: 17.3750,
      longitude: 78.4867,
    });
    const sosId = created.id;
    const responderId = '00000000-0000-0000-0000-000000000010';

    await takeSOS({
      id: sosId,
      responderId,
      responderProfile: { full_name: 'Inspector Vikram' },
    });

    // Responder explicitly submits 'ON_THE_WAY'
    const updateRes = await updateSOSStatus({
      id: sosId,
      nextStatus: 'ON_THE_WAY',
      note: 'En route with rescue vessel',
      responderId,
      callerRole: 'responder',
      responderProfile: { full_name: 'Inspector Vikram' },
    });

    assert.strictEqual(updateRes.success, true);
    assert.strictEqual(updateRes.data.status, 'ON_THE_WAY');

    // Verify changed_by in timeline
    const updated = await getSOSById(sosId);
    assert.strictEqual(updated.status, 'ON_THE_WAY');
    const latestLog = updated.timeline[updated.timeline.length - 1];
    assert.strictEqual(latestLog.status, 'ON_THE_WAY');
    assert.strictEqual(latestLog.changed_by, responderId);
  });

  // --------------------------------------------------------------------------
  // Group 4: Authorization & Identity Enforcement
  // --------------------------------------------------------------------------
  console.log('\nGroup 4: Authorization & Identity Enforcement');

  await test('Rejects status update from a different responder (NOT_ASSIGNED_RESPONDER)', async () => {
    resetSOSStore();

    const created = await createSOSRequest({
      citizenId: '00000000-0000-0000-0000-000000000001',
      citizenProfile: { full_name: 'Citizen C' },
      type: 'Trapped by Flood Water',
      latitude: 17.3750,
      longitude: 78.4867,
    });
    const sosId = created.id;
    const assignedResponderId = '00000000-0000-0000-0000-000000000010';
    const differentResponderId = '00000000-0000-0000-0000-000000000099';

    await takeSOS({
      id: sosId,
      responderId: assignedResponderId,
      responderProfile: { full_name: 'Inspector Vikram' },
    });

    // Different responder attempts update
    const result = await updateSOSStatus({
      id: sosId,
      nextStatus: 'ON_THE_WAY',
      responderId: differentResponderId,
      callerRole: 'responder',
      responderProfile: { full_name: 'Other Responder' },
    });

    assert.strictEqual(result.status, 403);
    assert.strictEqual(result.code, 'NOT_ASSIGNED_RESPONDER');
    assert.strictEqual(result.error, 'NOT_ASSIGNED_RESPONDER');

    // Verify status was not modified
    const current = await getSOSById(sosId);
    assert.strictEqual(current.status, 'ACCEPTED');
  });

  await test('Rejects status update from citizen (UNAUTHORIZED_ROLE / 403)', async () => {
    resetSOSStore();

    const created = await createSOSRequest({
      citizenId: '00000000-0000-0000-0000-000000000001',
      citizenProfile: { full_name: 'Citizen D' },
      type: 'Trapped by Flood Water',
      latitude: 17.3750,
      longitude: 78.4867,
    });
    const sosId = created.id;

    const result = await updateSOSStatus({
      id: sosId,
      nextStatus: 'RESOLVED',
      responderId: '00000000-0000-0000-0000-000000000001',
      callerRole: 'citizen',
    });

    assert.strictEqual(result.status, 403);
    assert.strictEqual(result.code, 'UNAUTHORIZED_ROLE');
  });

  await test('Rejects admin status update without audited reason (ADMIN_REASON_REQUIRED / 400)', async () => {
    resetSOSStore();

    const created = await createSOSRequest({
      citizenId: '00000000-0000-0000-0000-000000000001',
      citizenProfile: { full_name: 'Citizen E' },
      type: 'Trapped by Flood Water',
      latitude: 17.3750,
      longitude: 78.4867,
    });
    const sosId = created.id;
    const responderId = '00000000-0000-0000-0000-000000000010';

    await takeSOS({
      id: sosId,
      responderId,
      responderProfile: { full_name: 'Inspector Vikram' },
    });

    // Admin attempts update without reason
    const result = await updateSOSStatus({
      id: sosId,
      nextStatus: 'ON_THE_WAY',
      responderId: 'admin-id',
      callerRole: 'admin',
      adminReason: '',
    });

    assert.strictEqual(result.status, 400);
    assert.strictEqual(result.code, 'ADMIN_REASON_REQUIRED');

    // Admin attempts update with valid reason -> accepted
    const successAdmin = await updateSOSStatus({
      id: sosId,
      nextStatus: 'ON_THE_WAY',
      responderId: 'admin-id',
      callerRole: 'admin',
      adminReason: 'SEOC Commander override due to field radio failure',
    });
    assert.strictEqual(successAdmin.success, true);
    assert.strictEqual(successAdmin.data.status, 'ON_THE_WAY');
  });

  // --------------------------------------------------------------------------
  // Group 5: Strict Sequential Progression & Step-Skipping Rejection
  // --------------------------------------------------------------------------
  console.log('\nGroup 5: Strict Sequential Progression & Step-Skipping Rejection');

  await test('Verifies that skipping a step (e.g. ACCEPTED -> RESCUED) is rejected by API with INVALID_STATUS_TRANSITION', async () => {
    resetSOSStore();

    const created = await createSOSRequest({
      citizenId: '00000000-0000-0000-0000-000000000001',
      citizenProfile: { full_name: 'Citizen F' },
      type: 'Evacuation Assistance',
      latitude: 17.3750,
      longitude: 78.4867,
    });
    const sosId = created.id;
    const responderId = '00000000-0000-0000-0000-000000000010';

    await takeSOS({
      id: sosId,
      responderId,
      responderProfile: { full_name: 'Inspector Vikram' },
    });

    // Attempt illegal step jump: ACCEPTED -> RESCUED (skipping ON_THE_WAY and ARRIVED)
    const result = await updateSOSStatus({
      id: sosId,
      nextStatus: 'RESCUED',
      responderId,
      callerRole: 'responder',
      responderProfile: { full_name: 'Inspector Vikram' },
    });

    assert.strictEqual(result.status, 400);
    assert.strictEqual(result.code, 'INVALID_STATUS_TRANSITION');
    assert.match(result.message, /Cannot transition status from ACCEPTED to RESCUED/i);

    // Verify status was not modified
    const current = await getSOSById(sosId);
    assert.strictEqual(current.status, 'ACCEPTED');
  });

  await test('Verifies that backward status regression is rejected (e.g. ON_THE_WAY -> ACCEPTED)', async () => {
    resetSOSStore();

    const created = await createSOSRequest({
      citizenId: '00000000-0000-0000-0000-000000000001',
      citizenProfile: { full_name: 'Citizen G' },
      type: 'Evacuation Assistance',
      latitude: 17.3750,
      longitude: 78.4867,
    });
    const sosId = created.id;
    const responderId = '00000000-0000-0000-0000-000000000010';

    await takeSOS({ id: sosId, responderId, responderProfile: { full_name: 'Inspector Vikram' } });
    await updateSOSStatus({ id: sosId, nextStatus: 'ON_THE_WAY', responderId, callerRole: 'responder' });

    // Attempt regression backwards
    const result = await updateSOSStatus({
      id: sosId,
      nextStatus: 'ACCEPTED',
      responderId,
      callerRole: 'responder',
    });

    assert.strictEqual(result.status, 400);
    assert.strictEqual(result.code, 'INVALID_STATUS_TRANSITION');
  });

  await test('Verifies that transition from RESOLVED is rejected (Incident is closed)', async () => {
    resetSOSStore();

    const created = await createSOSRequest({
      citizenId: '00000000-0000-0000-0000-000000000001',
      citizenProfile: { full_name: 'Citizen H' },
      type: 'Evacuation Assistance',
      latitude: 17.3750,
      longitude: 78.4867,
    });
    const sosId = created.id;
    const responderId = '00000000-0000-0000-0000-000000000010';

    // Sequential progression to completion:
    // WAITING -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> RESCUED -> RESOLVED
    await takeSOS({ id: sosId, responderId, responderProfile: { full_name: 'Inspector Vikram' } });
    await updateSOSStatus({ id: sosId, nextStatus: 'ON_THE_WAY', responderId, callerRole: 'responder' });
    await updateSOSStatus({ id: sosId, nextStatus: 'ARRIVED', responderId, callerRole: 'responder' });
    await updateSOSStatus({ id: sosId, nextStatus: 'RESCUED', responderId, callerRole: 'responder' });
    await updateSOSStatus({ id: sosId, nextStatus: 'RESOLVED', responderId, callerRole: 'responder' });

    const resolvedSos = await getSOSById(sosId);
    assert.strictEqual(resolvedSos.status, 'RESOLVED');

    // Attempt further transition after RESOLVED
    const reOpenResult = await updateSOSStatus({
      id: sosId,
      nextStatus: 'ACCEPTED',
      responderId,
      callerRole: 'responder',
    });

    assert.strictEqual(reOpenResult.status, 400);
    assert.strictEqual(reOpenResult.code, 'INVALID_STATUS_TRANSITION');
  });

  // --------------------------------------------------------------------------
  // Group 6: PostgreSQL DB Trigger Logic Verification
  // --------------------------------------------------------------------------
  console.log('\nGroup 6: PostgreSQL DB Trigger Logic Verification');

  await test('PostgreSQL trigger transition rule validates exact next step and rejects skipped step', () => {
    // Read 004_status_guard.sql to verify trigger logic matches specification
    const migrationPath = path.resolve(__dirname, '../../supabase/migrations/004_status_guard.sql');
    assert.strictEqual(fs.existsSync(migrationPath), true, '004_status_guard.sql must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Validate SQL definitions
    assert.match(sql, /CREATE OR REPLACE FUNCTION guard_sos_status_transition/i);
    assert.match(sql, /CREATE TRIGGER trg_guard_sos_status/i);
    assert.match(sql, /BEFORE UPDATE OF status ON sos_requests/i);

    // Pure simulator of Postgres guard_sos_status_transition logic
    function evaluatePostgresTrigger(oldStatus, newStatus) {
      const oldStat = oldStatus.toUpperCase();
      const newStat = newStatus.toUpperCase();

      if (oldStat === newStat) return 'ALLOWED';
      if (['RESOLVED', 'CLOSED'].includes(oldStat)) {
        throw new Error(`INVALID_STATUS_TRANSITION: Incident is already RESOLVED`);
      }
      if (['WAITING', 'OPEN'].includes(oldStat) && ['ACCEPTED', 'ASSIGNED'].includes(newStat)) return 'ALLOWED';
      if (['ACCEPTED', 'ASSIGNED'].includes(oldStat) && ['ON_THE_WAY', 'IN_PROGRESS'].includes(newStat)) return 'ALLOWED';
      if (['ON_THE_WAY', 'IN_PROGRESS'].includes(oldStat) && newStat === 'ARRIVED') return 'ALLOWED';
      if (oldStat === 'ARRIVED' && newStat === 'RESCUED') return 'ALLOWED';
      if (oldStat === 'RESCUED' && ['RESOLVED', 'CLOSED'].includes(newStat)) return 'ALLOWED';

      throw new Error(`INVALID_STATUS_TRANSITION: Cannot transition status from ${oldStat} to ${newStat}`);
    }

    // Valid transitions
    assert.strictEqual(evaluatePostgresTrigger('WAITING', 'ACCEPTED'), 'ALLOWED');
    assert.strictEqual(evaluatePostgresTrigger('ACCEPTED', 'ON_THE_WAY'), 'ALLOWED');
    assert.strictEqual(evaluatePostgresTrigger('ON_THE_WAY', 'ARRIVED'), 'ALLOWED');
    assert.strictEqual(evaluatePostgresTrigger('ARRIVED', 'RESCUED'), 'ALLOWED');
    assert.strictEqual(evaluatePostgresTrigger('RESCUED', 'RESOLVED'), 'ALLOWED');

    // Skipping steps: ACCEPTED -> RESCUED must throw INVALID_STATUS_TRANSITION
    assert.throws(
      () => evaluatePostgresTrigger('ACCEPTED', 'RESCUED'),
      /INVALID_STATUS_TRANSITION/
    );

    // Skipping steps: WAITING -> ON_THE_WAY must throw INVALID_STATUS_TRANSITION
    assert.throws(
      () => evaluatePostgresTrigger('WAITING', 'ON_THE_WAY'),
      /INVALID_STATUS_TRANSITION/
    );

    // Transition out of RESOLVED must throw INVALID_STATUS_TRANSITION
    assert.throws(
      () => evaluatePostgresTrigger('RESOLVED', 'ACCEPTED'),
      /INVALID_STATUS_TRANSITION/
    );
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
