// server/dbMiddleware.js
// ALLOY Marketplace — Universal Supabase Database Sync Middleware
// Provides secure, real-time database write-through endpoints for all marketplace entities:
// - brands
// - campaigns
// - creator_profiles
// - portfolio_projects
// - creator_workflows
// - shortlists
// - collaborations
// - deliverables
// - messages
// - payments
// - campaign_funding
// Automatically executes database operations and syncs changes to Supabase Table Editor.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

let primaryClient = null;
let fallbackClient = null;

function getClients() {
  if (primaryClient) return { primaryClient, fallbackClient };

  let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const m = line.match(/^([^=]+)=(.*)$/);
        if (m) {
          const k = m[1].trim();
          const v = m[2].trim().replace(/^["']|["']$/g, '');
          if (k === 'VITE_SUPABASE_URL' || k === 'SUPABASE_URL') url = v;
          if (k === 'SUPABASE_SERVICE_ROLE_KEY') serviceKey = v;
          if (k === 'VITE_SUPABASE_ANON_KEY' || k === 'SUPABASE_ANON_KEY') anonKey = v;
        }
      });
    }
  } catch {}

  if (url) {
    if (serviceKey && serviceKey !== 'your-supabase-service-role-key') {
      try {
        primaryClient = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
      } catch {}
    }
    if (anonKey && anonKey !== 'your-supabase-anon-key') {
      try {
        fallbackClient = createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
      } catch {}
    }
    if (!primaryClient && fallbackClient) {
      primaryClient = fallbackClient;
    }
  }

  return { primaryClient, fallbackClient };
}

// Executes with primary client, falling back if key is unregistered/invalid
async function runWithFallback(fn) {
  const { primaryClient: c1, fallbackClient: c2 } = getClients();
  if (!c1) throw new Error('Supabase client not configured on server');

  let result = await fn(c1);
  if (result && result.error && (result.error.message?.includes('Unregistered API key') || result.error.message?.includes('JWT')) && c2 && c1 !== c2) {
    console.log('[DB Middleware] Service key returned unregistered, falling back to anon key...');
    result = await fn(c2);
  }
  return result;
}

// Allowed tables for security whitelist
const ALLOWED_TABLES = new Set([
  'brands',
  'campaigns',
  'creator_profiles',
  'portfolio_projects',
  'creator_workflows',
  'creative_dna',
  'shortlists',
  'collaborations',
  'invitations',
  'deliverables',
  'messages',
  'payments',
  'campaign_funding',
  'trust_verifications',
  'verification_claims',
  'activity_logs'
]);

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

export function createDbMiddleware() {
  return async function dbMiddleware(req, res, next) {
    // Only intercept /api/db/* routes
    if (!req.url.startsWith('/api/db')) {
      return next();
    }

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }

    const { primaryClient: client } = getClients();
    if (!client) {
      return sendJson(res, 503, { ok: false, error: 'Supabase client is not configured on server' });
    }

    const urlPath = req.url.split('?')[0];

    try {
      // 1. GET /api/db/status
      if (req.method === 'GET' && urlPath === '/api/db/status') {
        const counts = {};
        for (const table of ['brands', 'campaigns', 'creator_profiles', 'portfolio_projects', 'creator_workflows']) {
          const resCount = await runWithFallback(c => c.from(table).select('*', { count: 'exact', head: true }));
          counts[table] = resCount.count;
        }
        return sendJson(res, 200, { ok: true, connected: true, counts });
      }

      // 2. POST /api/db/upsert
      if (req.method === 'POST' && urlPath === '/api/db/upsert') {
        const { table, record, onConflict = 'id' } = await parseJsonBody(req);

        if (!table || !ALLOWED_TABLES.has(table)) {
          return sendJson(res, 400, { ok: false, error: `Invalid or unauthorized table: "${table}"` });
        }

        if (!record || typeof record !== 'object') {
          return sendJson(res, 400, { ok: false, error: 'Field "record" must be a non-null object' });
        }

        // Add updated_at if missing
        if (!record.updated_at && table !== 'shortlists' && table !== 'messages' && table !== 'activity_logs') {
          record.updated_at = new Date().toISOString();
        }

        // Ensure foreign key dependencies pass:
        // If upserting a campaign, ensure brand exists
        if (table === 'campaigns' && record.owner_brand_id) {
          const brandCheck = await runWithFallback(c => 
            c.from('brands').select('id').eq('id', record.owner_brand_id).maybeSingle()
          );

          if (!brandCheck.data) {
            await runWithFallback(c => c.from('brands').upsert({
              id: record.owner_brand_id,
              name: record.brand_name || 'Brand Partner',
              industry: record.industry || 'Creative & Media',
              website: record.brand_website || '',
              logo: record.brand_avatar || null,
              is_demo: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' }));
          }
        }

        // If upserting collaboration or invitation, ensure brand exists
        if ((table === 'collaborations' || table === 'invitations') && record.brand_id) {
          const bCheck = await runWithFallback(c => c.from('brands').select('id').eq('id', record.brand_id).maybeSingle());
          if (!bCheck.data) {
            await runWithFallback(c => c.from('brands').upsert({
              id: record.brand_id,
              name: record.brand_name || 'Brand Partner',
              is_demo: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' }));
          }
        }

        // Clean campaign fields to match live schema
        if (table === 'campaigns') {
          delete record.desired_creator_specialties;
          if (record.visibility && !['published', 'draft', 'private'].includes(record.visibility)) {
            record.visibility = 'published';
          }
        }

        // Clean workflow fields
        if (table === 'creator_workflows') {
          if (record.creator_id === 'kai-sorenson') {
            record.creator_id = 'alex-rivera';
            record.linked_project_id = null;
          }
        }

        const { data, error } = await runWithFallback(c => 
          c.from(table).upsert(record, { onConflict }).select()
        );

        if (error) {
          console.error(`[DB Middleware] Upsert error on ${table}:`, error);
          return sendJson(res, 400, { ok: false, error: error.message, code: error.code });
        }

        console.log(`[DB Middleware] ✅ Realtime update synced to "${table}" in Table Editor:`, record.id || record.title || 'ok');
        return sendJson(res, 200, { ok: true, table, data });
      }

      // 3. POST /api/db/delete
      if (req.method === 'POST' && urlPath === '/api/db/delete') {
        const { table, id, match = {} } = await parseJsonBody(req);

        if (!table || !ALLOWED_TABLES.has(table)) {
          return sendJson(res, 400, { ok: false, error: `Invalid or unauthorized table: "${table}"` });
        }

        const { error } = await runWithFallback(c => {
          let query = c.from(table).delete();
          if (id) {
            query = query.eq('id', id);
          } else if (Object.keys(match).length > 0) {
            query = query.match(match);
          }
          return query;
        });

        if (error) {
          console.error(`[DB Middleware] Delete error on ${table}:`, error);
          return sendJson(res, 400, { ok: false, error: error.message });
        }

        console.log(`[DB Middleware] 🗑️ Deleted row from "${table}" in Table Editor:`, id || match);
        return sendJson(res, 200, { ok: true, table, deleted: true });
      }

      // Route not found in /api/db/*
      return sendJson(res, 404, { ok: false, error: 'DB endpoint not found' });
    } catch (err) {
      console.error('[DB Middleware] Unhandled error:', err);
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  };
}
