// test/publicMetrics.test.js
// Automated Verification Suite for ALLOY Homepage Live Super Admin Metrics
// Verifies:
// 1. Dedicated read-only endpoint GET /api/public-metrics returns live aggregate counts
// 2. Response shape strictly contains verifiedCreators, verifiedBrands, campaignOversight
// 3. Absolute privacy preservation (zero emails, personal records, admin tokens or secrets leaked)
// 4. Method restriction (only GET allowed, non-GET rejected with 405)
// 5. Database correspondence with Super Admin oversight records
// 6. Support for /api/metrics alias

import assert from 'assert';
import fs from 'fs';
import http from 'http';
import { createClient } from '@supabase/supabase-js';
import { createAdminMiddleware } from '../server/adminMiddleware.js';

// Load environment configuration
const env = {};
if (fs.existsSync('.env')) {
  fs.readFileSync('.env', 'utf8').replace(/\r/g, '').split('\n').forEach(l => {
    const idx = l.indexOf('=');
    if (idx !== -1) {
      const k = l.slice(0, idx).trim();
      const v = l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (k && !k.startsWith('#')) env[k] = v;
    }
  });
}

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

async function runPublicMetricsTests() {
  console.log('\n================================================================');
  console.log(' ALLOY — HOMEPAGE LIVE SUPER ADMIN METRICS VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`          ${err.message}`);
      failed++;
    }
  }

  // Setup test server with adminMiddleware
  const adminMiddleware = createAdminMiddleware();
  const server = http.createServer((req, res) => {
    adminMiddleware(req, res, () => {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    });
  });

  const TEST_PORT = 3987;
  await new Promise(resolve => server.listen(TEST_PORT, resolve));

  try {
    // Test 1: GET /api/public-metrics returns 200 and valid JSON
    await test('1. GET /api/public-metrics returns 200 OK and valid JSON', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/public-metrics`);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.ok, true, 'Expected data.ok to be true');
    });

    // Test 2: Metrics response matches exact specified aggregate shape
    await test('2. Response contains verifiedCreators, verifiedBrands, and campaignOversight numeric counts', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/public-metrics`);
      const data = await res.json();
      
      assert.strictEqual(typeof data.verifiedCreators, 'number', 'verifiedCreators must be a number');
      assert.strictEqual(typeof data.verifiedBrands, 'number', 'verifiedBrands must be a number');
      assert.strictEqual(typeof data.campaignOversight, 'number', 'campaignOversight must be a number');

      assert(data.verifiedCreators >= 0, 'verifiedCreators must be non-negative');
      assert(data.verifiedBrands >= 0, 'verifiedBrands must be non-negative');
      assert(data.campaignOversight >= 0, 'campaignOversight must be non-negative');
    });

    // Test 3: Zero sensitive data leaked in response
    await test('3. Privacy verification: zero emails, user records, admin tokens, or secrets exposed', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/public-metrics`);
      const text = await res.text();
      const data = JSON.parse(text);

      const forbiddenKeys = ['email', 'password', 'token', 'secret', 'user', 'profiles', 'admin', 'notes', 'signals'];
      for (const k of forbiddenKeys) {
        assert(!data[k], `Response must not contain sensitive key "${k}"`);
      }
      assert(!text.includes('@'), 'Response must not contain any email addresses');
      assert(!text.includes('eyJ'), 'Response must not contain any JWT tokens');
    });

    // Test 4: Method restrictions enforce GET-only read endpoint
    await test('4. Security: Non-GET methods (POST, PUT, DELETE) are rejected with 405 Method Not Allowed', async () => {
      const postRes = await fetch(`http://localhost:${TEST_PORT}/api/public-metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fake: 'data' })
      });
      assert.strictEqual(postRes.status, 405, `Expected 405 for POST, got ${postRes.status}`);

      const deleteRes = await fetch(`http://localhost:${TEST_PORT}/api/public-metrics`, {
        method: 'DELETE'
      });
      assert.strictEqual(deleteRes.status, 405, `Expected 405 for DELETE, got ${deleteRes.status}`);
    });

    // Test 5: /api/metrics alias also resolves identically
    await test('5. Route alias /api/metrics responds with identical aggregate metrics', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/metrics`);
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      const data = await res.json();
      assert.strictEqual(data.ok, true);
      assert.strictEqual(typeof data.verifiedCreators, 'number');
      assert.strictEqual(typeof data.verifiedBrands, 'number');
      assert.strictEqual(typeof data.campaignOversight, 'number');
    });

    // Test 6: Database ground-truth consistency check
    await test('6. Database consistency: aggregate numbers strictly derive from live Supabase tables', async () => {
      if (!supabaseUrl || !supabaseKey) {
        console.log('   (Skipping direct DB comparison: Supabase credentials not set)');
        return;
      }
      const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const [cRes, bRes, campRes] = await Promise.all([
        client.from('creator_profiles').select('id', { count: 'exact', head: true }).neq('status', 'suspended').neq('status', 'Archived'),
        client.from('brands').select('id', { count: 'exact', head: true }),
        client.from('campaigns').select('id', { count: 'exact', head: true })
      ]);

      const res = await fetch(`http://localhost:${TEST_PORT}/api/public-metrics`);
      const data = await res.json();

      if (cRes.count != null) {
        assert.strictEqual(data.verifiedCreators, cRes.count, 'verifiedCreators matches live DB record count');
      }
      if (bRes.count != null) {
        assert.strictEqual(data.verifiedBrands, bRes.count, 'verifiedBrands matches live DB record count');
      }
      if (campRes.count != null) {
        assert.strictEqual(data.campaignOversight, campRes.count, 'campaignOversight matches live DB record count');
      }
    });

    // Test 7: Cache-Control and CORS Headers
    await test('7. Caching and CORS: sends proper no-store cache-control and permissive CORS headers', async () => {
      const res = await fetch(`http://localhost:${TEST_PORT}/api/public-metrics`);
      const cacheControl = res.headers.get('cache-control') || '';
      assert(cacheControl.includes('no-store'), 'cache-control must include no-store to prevent stale numbers');
      assert.strictEqual(res.headers.get('access-control-allow-origin'), '*', 'CORS allow-origin must be * for public hero');
    });

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(` Public Metrics Suite: ${passed}/${passed + failed} Tests Passed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPublicMetricsTests().catch(err => {
  console.error('Test suite runner failed:', err);
  process.exit(1);
});
