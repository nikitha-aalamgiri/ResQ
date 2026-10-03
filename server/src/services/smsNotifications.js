import { supabase } from '../config/supabase.js';
import { sendSms, maskPhone, normalizeIndianPhone, SmsError } from './sms.js';
import { getSOSById } from './sosStore.js';

// In-Memory store for offline/demo operation
const inMemorySmsLogs = [];
// In-Memory rate limit tracking: userId -> Array of timestamps (ms)
const rateLimitBuckets = new Map();

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SMS_PER_WINDOW = 6;

/**
 * Checks whether user has exceeded the rate limit of 6 SMS / 10 minutes
 * @param {string} userId
 * @returns {boolean} true if allowed, false if rate limited
 */
function checkAndRecordRateLimit(userId) {
  if (!userId) return true;
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  const timestamps = (rateLimitBuckets.get(userId) || []).filter((t) => t > cutoff);
  if (timestamps.length >= MAX_SMS_PER_WINDOW) {
    rateLimitBuckets.set(userId, timestamps);
    return false;
  }

  timestamps.push(now);
  rateLimitBuckets.set(userId, timestamps);
  return true;
}

/**
 * Helper to reset rate limits for testing
 */
export function resetRateLimits() {
  rateLimitBuckets.clear();
}

/**
 * Helper to clear in-memory logs for testing
 */
export function clearInMemorySmsLogs() {
  inMemorySmsLogs.length = 0;
}

/**
 * Retrieves all SMS logs for a given SOS incident
 * @param {string} sosId
 * @returns {Promise<Array>}
 */
export async function getSmsLogsBySosId(sosId) {
  try {
    const isMockUrl = !process.env.SUPABASE_URL ||
      process.env.SUPABASE_URL.includes('127.0.0.1') ||
      process.env.SUPABASE_URL.includes('your-project-id');

    if (!isMockUrl) {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('sos_id', sosId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    // Fallback to in-memory
  }

  return inMemorySmsLogs
    .filter((l) => l.sos_id === sosId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Retrieves all SMS logs for a user (citizen)
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getSmsLogsByUserId(userId) {
  try {
    const isMockUrl = !process.env.SUPABASE_URL ||
      process.env.SUPABASE_URL.includes('127.0.0.1') ||
      process.env.SUPABASE_URL.includes('your-project-id');

    if (!isMockUrl) {
      const { data, error } = await supabase
        .from('sms_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    // Fallback to in-memory
  }

  return inMemorySmsLogs
    .filter((l) => l.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Internal helper to save an SMS log entry to in-memory store and Supabase
 */
async function recordSmsLog(entry) {
  const log = {
    id: entry.id || `sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: entry.user_id || null,
    sos_id: entry.sos_id || null,
    phone_masked: entry.phone_masked,
    event_type: entry.event_type,
    provider: entry.provider || 'mock',
    provider_request_id: entry.provider_request_id || null,
    status: entry.status,
    error_code: entry.error_code || null,
    created_at: entry.created_at || new Date().toISOString(),
    sent_at: entry.sent_at || null,
  };

  // 1. Update/Add in-memory
  const existingIdx = inMemorySmsLogs.findIndex((l) => l.id === log.id);
  if (existingIdx >= 0) {
    inMemorySmsLogs[existingIdx] = { ...inMemorySmsLogs[existingIdx], ...log };
  } else {
    inMemorySmsLogs.push(log);
  }

  // 2. Sync to Supabase
  try {
    const isMockUrl = !process.env.SUPABASE_URL ||
      process.env.SUPABASE_URL.includes('127.0.0.1') ||
      process.env.SUPABASE_URL.includes('your-project-id');

    if (!isMockUrl) {
      const { error } = await supabase.from('sms_logs').upsert(log, { onConflict: 'id' });
      if (error && error.code === '23505') {
        // Unique conflict on (sos_id, event_type) WHERE status IN ('pending', 'sent')
        return { duplicate: true };
      }
    }
  } catch (e) {
    // Non-blocking in mock mode
  }

  return { success: true, log };
}

/**
 * Core notification trigger:
 * Evaluates citizen preferences, checks deduplication, enforces rate limits,
 * logs pending status, dispatches SMS via provider abstraction, and updates log status.
 *
 * Guaranteed NEVER to throw to the caller and NEVER to mutate the SOS row.
 *
 * @param {Object} params
 * @param {string} params.sosId - SOS identifier (e.g. "FQ1024")
 * @param {string} params.eventType - 'SOS_CREATED' | 'RESPONDER_ASSIGNED' | 'ON_THE_WAY' | 'ARRIVED' | 'RESCUED'
 * @param {Object} [params.extra] - Additional metadata such as shelter name or priority
 * @returns {Promise<Object>} Status of notification dispatch
 */
export async function notifySosEvent({ sosId, eventType, extra = {} }) {
  try {
    if (!sosId || !eventType) {
      return { skipped: true, reason: 'MISSING_PARAMS' };
    }

    // 1. Load SOS request record
    const sos = await getSOSById(sosId);
    if (!sos) {
      console.warn(`[SMS Notification] SOS record ${sosId} not found, skipping SMS.`);
      return { skipped: true, reason: 'SOS_NOT_FOUND' };
    }

    const userId = sos.citizen_id;
    let citizenPhone = sos.citizen_phone;
    let smsEnabled = true;

    // 2. Load Citizen profile to check sms_enabled and canonical phone
    if (userId) {
      try {
        const isMockUrl = !process.env.SUPABASE_URL ||
          process.env.SUPABASE_URL.includes('127.0.0.1') ||
          process.env.SUPABASE_URL.includes('your-project-id');

        if (!isMockUrl) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone, sms_enabled, phone_verified')
            .eq('id', userId)
            .single();

          if (profile) {
            if (profile.phone) citizenPhone = profile.phone;
            if (profile.sms_enabled !== undefined) smsEnabled = Boolean(profile.sms_enabled);
          }
        }
      } catch (err) {
        // Non-blocking fallback
      }
    }

    if (extra.sms_enabled !== undefined) {
      smsEnabled = Boolean(extra.sms_enabled);
    } else if (sos.sms_enabled !== undefined) {
      smsEnabled = Boolean(sos.sms_enabled);
    }

    const maskedPhone = maskPhone(citizenPhone || '');

    // 3. Skip condition: sms_enabled is false
    if (!smsEnabled) {
      console.log(`[SMS Notification] User ${userId} has sms_enabled=false. Logging 'skipped' (SMS_DISABLED).`);
      await recordSmsLog({
        user_id: userId,
        sos_id: sosId,
        phone_masked: maskedPhone,
        event_type: eventType,
        provider: process.env.SMS_PROVIDER || 'mock',
        status: 'skipped',
        error_code: 'SMS_DISABLED',
      });
      return { status: 'skipped', error_code: 'SMS_DISABLED' };
    }

    // 4. Skip condition: Missing phone number
    if (!citizenPhone || !citizenPhone.trim()) {
      console.log(`[SMS Notification] Citizen phone missing for SOS ${sosId}. Logging 'skipped' (NO_PHONE).`);
      await recordSmsLog({
        user_id: userId,
        sos_id: sosId,
        phone_masked: '******0000',
        event_type: eventType,
        provider: process.env.SMS_PROVIDER || 'mock',
        status: 'skipped',
        error_code: 'NO_PHONE',
      });
      return { status: 'skipped', error_code: 'NO_PHONE' };
    }

    // 5. Deduplication check: Do not re-send if pending or sent already exists for (sosId, eventType)
    const existingLogs = inMemorySmsLogs.filter(
      (l) => l.sos_id === sosId && l.event_type === eventType && (l.status === 'pending' || l.status === 'sent')
    );
    if (existingLogs.length > 0) {
      console.log(`[SMS Notification] Duplicate detected for SOS ${sosId} and event ${eventType}. Skipping.`);
      return { status: 'skipped', reason: 'DUPLICATE_EVENT' };
    }

    // 6. Rate Limit Check (6 SMS per user per 10 minutes)
    const withinRateLimit = checkAndRecordRateLimit(userId);
    if (!withinRateLimit) {
      console.warn(`[SMS Notification] Rate limit exceeded for user ${userId}. Logging 'failed' (SMS_RATE_LIMITED).`);
      await recordSmsLog({
        user_id: userId,
        sos_id: sosId,
        phone_masked: maskedPhone,
        event_type: eventType,
        provider: process.env.SMS_PROVIDER || 'mock',
        status: 'failed',
        error_code: 'SMS_RATE_LIMITED',
      });
      return { status: 'failed', error_code: 'SMS_RATE_LIMITED' };
    }

    // 7. Insert pending log row
    const logId = `sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const pendingResult = await recordSmsLog({
      id: logId,
      user_id: userId,
      sos_id: sosId,
      phone_masked: maskedPhone,
      event_type: eventType,
      provider: process.env.SMS_PROVIDER || 'mock',
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (pendingResult.duplicate) {
      console.log(`[SMS Notification] DB unique constraint stopped duplicate for ${sosId}:${eventType}.`);
      return { status: 'skipped', reason: 'DUPLICATE_EVENT' };
    }

    // 8. Assemble template variables
    const variables = {
      SOS_ID: sos.id,
      PRIORITY: (extra.priority || sos.priority || 'HIGH').toUpperCase(),
      ...(extra.shelter ? { SHELTER: extra.shelter } : {}),
    };

    // 9. Dispatch via Provider
    try {
      const sendResult = await sendSms({
        to: citizenPhone,
        eventType,
        variables,
        sosId: sos.id,
      });

      // 10. Update log to 'sent'
      await recordSmsLog({
        id: logId,
        user_id: userId,
        sos_id: sosId,
        phone_masked: sendResult.phone_masked || maskedPhone,
        event_type: eventType,
        provider: sendResult.provider,
        provider_request_id: sendResult.provider_request_id,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

      return {
        status: 'sent',
        provider: sendResult.provider,
        provider_request_id: sendResult.provider_request_id,
        preview: sendResult.preview,
      };
    } catch (err) {
      const errorCode = err instanceof SmsError ? err.code : 'SMS_PROVIDER_FAILED';
      console.error(`[SMS Notification] Send failed for ${sosId}:${eventType} -> code=${errorCode}`);

      // 11. Update log to 'failed' with stable error code
      await recordSmsLog({
        id: logId,
        user_id: userId,
        sos_id: sosId,
        phone_masked: maskedPhone,
        event_type: eventType,
        provider: process.env.SMS_PROVIDER || 'mock',
        status: 'failed',
        error_code: errorCode,
      });

      return { status: 'failed', error_code: errorCode };
    }
  } catch (unexpected) {
    console.error('[SMS Notification] Unexpected internal error:', unexpected);
    return { status: 'failed', error_code: 'SMS_PROVIDER_FAILED' };
  }
}
