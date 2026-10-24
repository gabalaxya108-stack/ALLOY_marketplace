// server/scripts/resetAllPasswords.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
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
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

async function run() {
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: usersData, error: uErr } = await client.auth.admin.listUsers({ perPage: 1000 });
  if (uErr) {
    console.error('Failed to list users:', uErr);
    return;
  }

  const users = usersData?.users || [];
  console.log(`Found ${users.length} users in Supabase Auth. Setting passwords to '11223344'...`);

  let count = 0;
  for (const u of users) {
    try {
      const { error } = await client.auth.admin.updateUserById(u.id, {
        password: '11223344',
        email_confirm: true
      });
      if (error) {
        console.warn(`Failed for ${u.email}:`, error.message);
      } else {
        count++;
      }
    } catch (e) {
      console.warn(`Error updating ${u.email}:`, e.message);
    }
  }

  console.log(`Successfully updated ${count}/${users.length} user passwords to '11223344'.`);
}

run();
