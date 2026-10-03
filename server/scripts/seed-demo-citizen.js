import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { supabase } from '../src/config/supabase.js';
import { normalizeIndianPhone, maskPhone } from '../src/services/sms.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function seedDemoCitizen() {
  console.log('=== ResQ Demo Citizen Provisioning Script ===');

  const name = process.env.DEMO_CITIZEN_NAME || 'Demo Citizen';
  const email = process.env.DEMO_CITIZEN_EMAIL || 'citizen.demo@example.com';
  const rawPhone = process.env.DEMO_CITIZEN_PHONE || '9876543210';

  console.log(`Citizen Name : ${name}`);
  console.log(`Citizen Email: ${email}`);

  let normalizedPhone;
  try {
    normalizedPhone = normalizeIndianPhone(rawPhone);
    console.log(`Phone (Masked): ${maskPhone(normalizedPhone)} [Format: +${normalizedPhone}]`);
  } catch (err) {
    console.error(`❌ Invalid DEMO_CITIZEN_PHONE: ${err.message}`);
    process.exit(1);
  }

  const formattedDisplayPhone = `+${normalizedPhone.slice(0, 2)}-${normalizedPhone.slice(2)}`;

  // Deterministic UUID for demo citizen to maintain idempotency
  const DEMO_CITIZEN_UUID = '00000000-0000-0000-0000-000000000099';

  // 1. Attempt Supabase Service Role provision if available
  const isMockUrl = !process.env.SUPABASE_URL ||
    process.env.SUPABASE_URL.includes('127.0.0.1') ||
    process.env.SUPABASE_URL.includes('localhost') ||
    process.env.SUPABASE_URL.includes('your-project-id');

  let remoteSuccess = false;

  if (!isMockUrl && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      console.log('Connecting to Supabase via Service Role...');

      // Find or create auth user
      let userId = DEMO_CITIZEN_UUID;
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingUser = userList?.users?.find((u) => u.email === email);

      if (existingUser) {
        userId = existingUser.id;
        console.log(`Found existing auth user: ${userId}`);
      } else {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: 'DemoCitizenPassword123!',
          email_confirm: true,
          user_metadata: { full_name: name, role: 'citizen' },
        });

        if (createError) {
          console.warn(`Auth user creation notice: ${createError.message}`);
        } else if (newUser?.user) {
          userId = newUser.user.id;
          console.log(`Created new auth user: ${userId}`);
        }
      }

      // Upsert profile
      const { error: profileError } = await supabase.from('profiles').upsert(
        {
          id: userId,
          email,
          full_name: name,
          phone: formattedDisplayPhone,
          role: 'citizen',
          sms_enabled: true,
          phone_verified: true, // for demo only
          is_available: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (profileError) {
        console.warn(`Profile upsert notice: ${profileError.message}`);
      } else {
        console.log('✅ Supabase profile successfully provisioned with phone_verified=true, sms_enabled=true');
        remoteSuccess = true;
      }
    } catch (dbErr) {
      console.warn(`Supabase connection note: ${dbErr.message}`);
    }
  }

  // 2. Cache demo citizen profile for local offline / mock drill support
  const localCachePath = path.resolve(__dirname, '../.demo-citizen.json');
  const demoRecord = {
    id: DEMO_CITIZEN_UUID,
    email,
    full_name: name,
    phone: formattedDisplayPhone,
    raw_phone: normalizedPhone,
    role: 'citizen',
    sms_enabled: true,
    phone_verified: true,
    token: 'demo-token-citizen-custom',
    seeded_at: new Date().toISOString(),
  };

  fs.writeFileSync(localCachePath, JSON.stringify(demoRecord, null, 2), 'utf8');
  console.log(`✅ Local demo credentials cached in server/.demo-citizen.json`);
  console.log(`   Token for automated tests: "Bearer demo-token-citizen-custom"`);
  console.log(`\n🎉 Demo citizen successfully prepared: sms_enabled=true, phone_verified=true`);
}

seedDemoCitizen().catch((err) => {
  console.error('Fatal error seeding demo citizen:', err);
  process.exit(1);
});
