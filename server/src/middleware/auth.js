import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-defined demo profiles matching seed.sql for instant local offline drill verification
const DEMO_ACCOUNTS = {
  'demo-token-citizen': {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'arif.hyd@example.com',
    full_name: 'Mohammed Arif',
    phone: '+91-9849033331',
    role: 'citizen',
    agency_name: null,
    phone_verified: true,
    sms_enabled: true,
  },
  'demo-token-responder': {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'vikram.ndrf@resq.gov.in',
    full_name: 'Inspector K. Vikram',
    phone: '+91-9849022221',
    role: 'responder',
    agency_name: '10th Battalion NDRF (Inflatable Boat Rescue)',
    phone_verified: true,
    sms_enabled: true,
  },
  'demo-token-admin': {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@resq.gov.in',
    full_name: 'Suresh Reddy',
    phone: '+91-9849011111',
    role: 'admin',
    agency_name: 'Telangana State Disaster Management Authority (TSDMA)',
    phone_verified: true,
    sms_enabled: true,
  }
};

/**
 * Returns custom demo citizen dynamically loaded from server/.demo-citizen.json or env
 */
function getCustomDemoCitizen() {
  try {
    const cachePath = path.resolve(__dirname, '../../.demo-citizen.json');
    if (fs.existsSync(cachePath)) {
      return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    }
  } catch (e) {
    // Non-blocking
  }
  if (process.env.DEMO_CITIZEN_EMAIL) {
    return {
      id: '00000000-0000-0000-0000-000000000099',
      email: process.env.DEMO_CITIZEN_EMAIL,
      full_name: process.env.DEMO_CITIZEN_NAME || 'Demo Citizen',
      phone: process.env.DEMO_CITIZEN_PHONE ? `+91-${process.env.DEMO_CITIZEN_PHONE.replace(/\D/g, '').slice(-10)}` : '+91-9876543210',
      role: 'citizen',
      agency_name: null,
      phone_verified: true,
      sms_enabled: true,
      token: 'demo-token-citizen-custom',
    };
  }
  return null;
}

/**
 * Authentication Middleware
 * Validates Supabase JWT Bearer token or demo test token from Authorization header.
 * Attaches req.user and req.profile.
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization header. Expected Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Empty authorization token provided'
      });
    }

    // 1. Fast-path for verified demo drill tokens
    if (DEMO_ACCOUNTS[token]) {
      const demoProfile = DEMO_ACCOUNTS[token];
      req.user = { id: demoProfile.id, email: demoProfile.email, role: demoProfile.role };
      req.profile = demoProfile;
      return next();
    }

    if (token === 'demo-token-citizen-custom') {
      const customCitizen = getCustomDemoCitizen();
      if (customCitizen) {
        req.user = { id: customCitizen.id, email: customCitizen.email, role: 'citizen' };
        req.profile = customCitizen;
        return next();
      }
    }

    // 2. Real Supabase JWT Verification
    const isMockUrl = !process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('127.0.0.1') || process.env.SUPABASE_URL.includes('localhost') || process.env.SUPABASE_URL.includes('your-project-id');
    
    if (isMockUrl) {
      // If server is in mock/unconnected environment and token wasn't a valid demo token
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or unrecognized authorization token'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error ? error.message : 'Invalid or expired token'
      });
    }

    // Query profiles table for operational role and metadata
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = user;
    req.profile = profile || {
      id: user.id,
      email: user.email,
      role: 'citizen',
      full_name: user.user_metadata?.full_name || user.email.split('@')[0],
    };

    next();
  } catch (err) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate request',
      details: err.message
    });
  }
};

export default requireAuth;
