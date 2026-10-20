// server/scripts/testDb.js
// Database Connectivity & Health Diagnostic Tool for ALLOY / CreaSync

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Load .env
const envPath = resolve(__dirname, '../../.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = val;
      }
    }
  });
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

console.log('\n================================================================');
console.log('       ALLOY / CREASYNC — DATABASE HEALTH DIAGNOSTIC');
console.log('================================================================\n');

async function runDiagnostics() {
  let passedChecks = 0;
  let totalChecks = 0;

  function report(name, status, details = '') {
    totalChecks++;
    if (status) {
      passedChecks++;
      console.log(`✅ [PASS] ${name}${details ? ` -> ${details}` : ''}`);
    } else {
      console.log(`❌ [FAIL] ${name}${details ? ` -> ${details}` : ''}`);
    }
  }

  // --- CHECK 1: Environment Variables ---
  console.log('1. Checking Environment Variables:');
  const hasUrl = !!(supabaseUrl && supabaseUrl.startsWith('https://'));
  report('VITE_SUPABASE_URL', hasUrl, hasUrl ? supabaseUrl : 'Missing or invalid URL');

  const hasAnonKey = !!(anonKey && anonKey.length > 20);
  report('VITE_SUPABASE_ANON_KEY', hasAnonKey, hasAnonKey ? 'Present (safe for browser)' : 'Missing');

  const hasServiceKey = !!(serviceRoleKey && serviceRoleKey.length > 20);
  report('SUPABASE_SERVICE_ROLE_KEY', hasServiceKey, hasServiceKey ? 'Present (backend administrative secret)' : 'Optional/Missing');

  if (!hasUrl || !hasAnonKey) {
    console.log('\n⚠️  Cannot proceed with database connection test without valid URL and Anon Key.');
    process.exit(1);
  }

  // --- CHECK 2: Public Client Table Queries ---
  console.log('\n2. Testing Public Client Database Queries:');
  const client = createClient(supabaseUrl, anonKey);

  const tablesToCheck = [
    { table: 'creator_profiles', label: 'Creator Profiles' },
    { table: 'brands', label: 'Brands Directory' },
    { table: 'campaigns', label: 'Campaigns' },
    { table: 'portfolio_projects', label: 'Portfolio Projects' },
    { table: 'verification_claims', label: 'Trust Verification Claims' }
  ];

  for (const { table, label } of tablesToCheck) {
    try {
      const { data, count, error } = await client
        .from(table)
        .select('*', { count: 'exact', head: false });

      if (error) {
        report(`Query ${label} (${table})`, false, error.message);
      } else {
        const rowCount = data ? data.length : (count || 0);
        report(`Query ${label} (${table})`, true, `Found ${rowCount} records`);
      }
    } catch (err) {
      report(`Query ${label} (${table})`, false, err.message);
    }
  }

  // --- CHECK 3: Supabase Auth Verification ---
  console.log('\n3. Testing Supabase Auth:');
  const judgeEmail = env.VITE_JUDGE_EMAIL || 'judge@alloy.market';
  const judgePassword = env.VITE_JUDGE_PASSWORD || 'JudgeAlloy2026!';

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: judgeEmail,
      password: judgePassword
    });

    if (error) {
      report(`Sign in test account (${judgeEmail})`, false, error.message);
    } else {
      report(`Sign in test account (${judgeEmail})`, true, `Authenticated user ID: ${data.user.id}`);
    }
  } catch (err) {
    report(`Sign in test account (${judgeEmail})`, false, err.message);
  }

  // --- CHECK 4: Service Role Client & Admin Schema (if configured) ---
  if (hasServiceKey) {
    console.log('\n4. Testing Service Role Admin Access:');
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    try {
      const { data: adminRoles, error: adminRoleErr } = await adminClient
        .from('admin_roles')
        .select('id, user_id, role, is_active');

      if (adminRoleErr) {
        report('Query admin_roles table', false, adminRoleErr.message);
      } else {
        report('Query admin_roles table', true, `${adminRoles.length} active admin role(s) found`);
      }
    } catch (err) {
      report('Query admin_roles table', false, err.message);
    }

    try {
      const { data: profiles, error: profileErr } = await adminClient
        .from('profiles')
        .select('id, email, role');

      if (profileErr) {
        report('Query profiles table', false, profileErr.message);
      } else {
        report('Query profiles table', true, `${profiles.length} profile(s) synced`);
      }
    } catch (err) {
      report('Query profiles table', false, err.message);
    }

    try {
      const { data: config, error: configErr } = await adminClient
        .from('platform_config')
        .select('config_key');

      if (configErr) {
        report('Query platform_config table', false, configErr.message);
      } else {
        report('Query platform_config table', true, `${config.length} configuration keys loaded`);
      }
    } catch (err) {
      report('Query platform_config table', false, err.message);
    }
  }

  console.log('\n================================================================');
  console.log(` RESULT: ${passedChecks}/${totalChecks} Health Checks Passed`);
  console.log('================================================================\n');

  if (passedChecks === totalChecks) {
    console.log('🎉 Your Supabase database is 100% configured, active, and verified!\n');
  } else {
    console.log('⚠️  Some checks failed. Review the errors above.\n');
  }
}

runDiagnostics().catch(console.error);
