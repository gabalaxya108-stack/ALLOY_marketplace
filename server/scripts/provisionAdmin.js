// server/scripts/provisionAdmin.js
// ALLOY Super Admin & Judge Admin — Secure Server-Side Provisioning Script
// Requires SUPABASE_SERVICE_ROLE_KEY. Configured via environment variables.
// Usage: npm run provision:admin

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple native .env loader without external dependencies
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  } catch (err) {
    console.warn('Note: Could not parse .env file:', err.message);
  }
}

loadEnv();

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const adminEmail = (process.env.ALLOY_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@alloy.market').trim();
const adminPassword = (process.env.ALLOY_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'alloyadminmarketplace-2026').trim();

const judgeEmail = (process.env.VITE_JUDGE_EMAIL || process.env.ALLOY_JUDGE_EMAIL || 'judge@alloy.market').trim();
const judgePassword = (process.env.VITE_JUDGE_PASSWORD || process.env.ALLOY_JUDGE_PASSWORD || 'JudgeAlloy2026!').trim();

async function provisionAccount(supabase, { email, password, role, fullName }) {
  console.log(`\n--- Provisioning account for: ${email} (Role: ${role}) ---`);
  let userId = null;

  // 1. Check if user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (!listError && usersData?.users) {
    const existing = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      userId = existing.id;
      console.log(`Found existing auth user: ${userId}`);

      // Ensure password and metadata match
      const updatePayload = {
        email_confirm: true,
        user_metadata: {
          role,
          full_name: fullName
        }
      };
      if (password) {
        updatePayload.password = password;
      }

      const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, updatePayload);
      if (updateErr) {
        console.warn(`Auth user update note: ${updateErr.message}`);
      } else {
        console.log(`Updated user credentials and verified metadata for ${email}`);
      }
    }
  }

  // 2. Create user if not present
  if (!userId) {
    const passwordToSet = password || `AlloyAdmin_${Math.random().toString(36).slice(2, 10)}!`;
    console.log(`Creating new auth user for ${email}...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: passwordToSet,
      email_confirm: true,
      user_metadata: {
        role,
        full_name: fullName
      }
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    userId = newUser.user.id;
    console.log(`Created user ${userId}`);
    if (!password) {
      console.log(`Generated Temporary Password: ${passwordToSet}`);
    }
  }

  // 3. Assign role in public.admin_roles (if table exists)
  try {
    const { error: adminRoleError } = await supabase.from('admin_roles').upsert({
      user_id: userId,
      role,
      is_active: true,
      granted_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (adminRoleError) {
      if (adminRoleError.code === 'PGRST205') {
        console.log(`Note: public.admin_roles table not yet in schema cache. Run schema.sql in Supabase SQL editor.`);
      } else {
        console.warn(`Admin role upsert note: ${adminRoleError.message}`);
      }
    } else {
      console.log(`Updated public.admin_roles entry for ${userId} (${role})`);
    }
  } catch (err) {
    console.warn(`Admin roles table access deferred:`, err.message);
  }

  // 4. Upsert profile in public.profiles (if table exists)
  try {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      role: 'admin',
      display_name: fullName,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (profileError) {
      if (profileError.code === 'PGRST205') {
        console.log(`Note: public.profiles table not yet in schema cache. Run schema.sql in Supabase SQL editor.`);
      } else {
        console.warn(`Profile upsert note: ${profileError.message}`);
      }
    } else {
      console.log(`Updated public.profiles record for ${userId}`);
    }
  } catch (err) {
    console.warn(`Profiles table access deferred:`, err.message);
  }

  // 5. Record Audit Event (if table exists)
  try {
    await supabase.from('audit_events').insert({
      actor_id: userId,
      actor_email: email,
      actor_role: 'system_provisioner',
      action: 'ADMIN_ACCOUNT_PROVISIONED',
      target_type: 'user',
      target_id: userId,
      target_name: email,
      reason: `Automated server-side provisioning for ${role}`,
      metadata: { timestamp: new Date().toISOString(), role }
    });
  } catch {
    // Ignore audit table access error if table not yet created
  }

  return userId;
}

async function runProvisioning() {
  console.log('================================================================');
  console.log(' ALLOY — Super Admin & Judge Provisioning Script');
  console.log('================================================================');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    // 1. Provision Judge Reviewer Account
    await provisionAccount(supabase, {
      email: judgeEmail,
      password: judgePassword,
      role: 'judge_admin',
      fullName: 'ALLOY Judge Reviewer'
    });

    // 2. Provision Primary Super Admin Account if configured
    if (adminEmail && adminEmail.toLowerCase() !== judgeEmail.toLowerCase()) {
      await provisionAccount(supabase, {
        email: adminEmail,
        password: adminPassword,
        role: 'super_admin',
        fullName: 'ALLOY Super Administrator'
      });
    }

    console.log('\n================================================================');
    console.log(' SUCCESS: Provisioning completed successfully!');
    console.log(` Judge Email : ${judgeEmail}`);
    console.log(` Judge Role  : judge_admin`);
    if (adminEmail) {
      console.log(` Admin Email : ${adminEmail}`);
      console.log(` Admin Role  : super_admin`);
    }
    console.log(' Portal      : Open #/admin/login in your browser');
    console.log('================================================================\n');
  } catch (err) {
    console.error('Provisioning failed:', err.message);
    process.exit(1);
  }
}

runProvisioning();
