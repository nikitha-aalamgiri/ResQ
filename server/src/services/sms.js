/**
 * ResQ Outbound SMS Service Provider Abstraction
 * Supports MSG91 Flow API and Mock provider for offline/demo operation.
 * Adheres strictly to security rules: no raw personal numbers stored, server-only secrets.
 */

export class SmsError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'SmsError';
    this.code = code;
  }
}

// In-Memory map for mock preview (accessible only in non-production via GET /api/dev/sms-preview/:sosId)
const smsPreviewMap = new Map();

/**
 * Normalizes Indian phone numbers:
 * - Strips whitespace, dashes, parentheses, dots
 * - Strips leading +91, 91, or 0
 * - Validates exactly 10 digits starting with 6, 7, 8, or 9
 * - Outputs canonical 12-digit string: "91" + 10 digits
 */
export function normalizeIndianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    throw new SmsError('INVALID_PHONE', 'Phone number is required and must be a string');
  }

  // Remove common punctuation and whitespace
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '').trim();

  // Strip leading '+' if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Strip leading '91' country code if 12 digits
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Strip leading trunk prefix '0'
    cleaned = cleaned.substring(1);
  }

  // Exactly 10 digits starting with 6-9
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!indianMobileRegex.test(cleaned)) {
    throw new SmsError('INVALID_PHONE', 'Phone number must be a valid 10-digit Indian mobile starting with 6-9');
  }

  return `91${cleaned}`;
}

/**
 * Masks phone number for safe storage and logging (e.g. "******6632")
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '******0000';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '******0000';
  const last4 = digits.slice(-4);
  return `******${last4}`;
}

/**
 * Renders human-readable SMS body for events
 */
export function renderSmsTemplate(eventType, variables = {}) {
  const sosId = variables.SOS_ID || variables.sos_id || 'FQ----';
  const priority = (variables.PRIORITY || variables.priority || 'HIGH').toUpperCase();
  const shelter = variables.SHELTER || variables.shelter || null;

  switch (eventType) {
    case 'SOS_CREATED':
      return `ResQ Alert: SOS request ${sosId} received. Triage priority: ${priority}. Emergency response teams have been notified.`;
    case 'RESPONDER_ASSIGNED':
      return `ResQ Update: A responder unit has been assigned to your SOS request ${sosId}. Rescue mobilization is underway.`;
    case 'ON_THE_WAY':
      return `ResQ Update: Rescue team is on the way for SOS ${sosId}. Please stay in a safe, elevated location.`;
    case 'ARRIVED':
      return `ResQ Update: Rescue team has arrived at your location for SOS ${sosId}. Follow field instructions.`;
    case 'RESCUED':
      if (shelter) {
        return `ResQ Update: Civilian extraction completed for SOS ${sosId}. Recommended relief shelter: ${shelter}.`;
      }
      return `ResQ Update: Civilian extraction completed for SOS ${sosId}. Follow rescue officers to nearest camp.`;
    default:
      throw new SmsError('SMS_TEMPLATE_INVALID', `Unknown SMS event type '${eventType}'`);
  }
}

/**
 * Returns Flow ID configured for MSG91 based on event
 */
function getMsg91FlowId(eventType) {
  switch (eventType) {
    case 'SOS_CREATED':
      return process.env.MSG91_FLOW_ID_SOS_CREATED;
    case 'RESPONDER_ASSIGNED':
      return process.env.MSG91_FLOW_ID_RESPONDER_ASSIGNED;
    case 'ON_THE_WAY':
      return process.env.MSG91_FLOW_ID_ON_THE_WAY;
    case 'ARRIVED':
      return process.env.MSG91_FLOW_ID_ARRIVED;
    case 'RESCUED':
      return process.env.MSG91_FLOW_ID_RESCUED;
    default:
      return null;
  }
}

/**
 * Dispatches an SMS via configured provider ("msg91" or "mock")
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (normalized Indian number)
 * @param {string} params.eventType - 'SOS_CREATED' | 'RESPONDER_ASSIGNED' | 'ON_THE_WAY' | 'ARRIVED' | 'RESCUED'
 * @param {Object} params.variables - Key-value parameters for SMS template
 * @param {string} [params.sosId] - Optional SOS request ID for dev preview tracking
 * @returns {Promise<{ provider: string, provider_request_id: string, phone_masked: string, preview?: string }>}
 */
export async function sendSms({ to, eventType, variables = {}, sosId = null }) {
  const normalizedPhone = normalizeIndianPhone(to);
  const maskedPhone = maskPhone(normalizedPhone);
  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase().trim();

  // Validate template rendering before attempting send
  const renderedText = renderSmsTemplate(eventType, variables);

  if (provider === 'msg91') {
    const authKey = process.env.MSG91_AUTH_KEY;
    const senderId = process.env.MSG91_SENDER_ID;
    const flowId = getMsg91FlowId(eventType);

    if (!authKey || !senderId || !flowId) {
      console.warn(`[SMS] MSG91 missing required configuration (authKey: ${!!authKey}, senderId: ${!!senderId}, flowId: ${!!flowId})`);
      throw new SmsError('SMS_PROVIDER_NOT_CONFIGURED', 'MSG91 credentials or Flow ID missing in server environment');
    }

    // 5-second timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('https://control.msg91.com/api/v5/flow', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authkey: authKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          flow_id: flowId,
          sender: senderId,
          recipients: [
            {
              mobiles: normalizedPhone,
              ...variables,
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const resBody = await response.json().catch(() => ({}));

      if (!response.ok || resBody.type === 'error') {
        console.error(`[SMS] MSG91 Gateway rejected dispatch to ${maskedPhone}: status=${response.status}`);
        throw new SmsError('SMS_PROVIDER_FAILED', 'Upstream SMS provider rejected request');
      }

      const providerRequestId = resBody.message || resBody.request_id || `msg91-${Date.now()}`;
      console.log(`[SMS:msg91] Dispatched ${eventType} to ${maskedPhone} (RequestId: ${providerRequestId})`);

      return {
        provider: 'msg91',
        provider_request_id: String(providerRequestId),
        phone_masked: maskedPhone,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof SmsError) throw err;
      if (err.name === 'AbortError') {
        console.error(`[SMS] MSG91 Gateway timed out after 5000ms for recipient ${maskedPhone}`);
        throw new SmsError('SMS_PROVIDER_FAILED', 'MSG91 request timed out');
      }
      console.error(`[SMS] MSG91 network error: ${err.message}`);
      throw new SmsError('SMS_PROVIDER_FAILED', 'Failed to connect to MSG91 gateway');
    }
  }

  // Default: Mock Provider
  const mockRequestId = `mock-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  console.log(`[SMS:mock] Event: ${eventType} | To: ${maskedPhone} | Text: "${renderedText}"`);

  // Store in-memory preview for development UI
  const targetSosId = sosId || variables.SOS_ID || variables.sos_id;
  if (targetSosId) {
    const list = smsPreviewMap.get(targetSosId) || [];
    list.unshift({
      event_type: eventType,
      message: renderedText,
      phone_masked: maskedPhone,
      provider: 'mock',
      provider_request_id: mockRequestId,
      sent_at: new Date().toISOString(),
    });
    smsPreviewMap.set(targetSosId, list.slice(0, 10)); // keep last 10
  }

  return {
    provider: 'mock',
    provider_request_id: mockRequestId,
    phone_masked: maskedPhone,
    preview: renderedText,
  };
}

/**
 * Dev-only helper to inspect previews in mock mode
 */
export function getDevSmsPreviews(sosId) {
  return smsPreviewMap.get(sosId) || [];
}

/**
 * Dev-only helper to clear mock previews
 */
export function clearDevSmsPreviews() {
  smsPreviewMap.clear();
}
