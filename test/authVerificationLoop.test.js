// test/authVerificationLoop.test.js
// ALLOY — Comprehensive Database Authentication, Account Verification,
// Direct Forgot-Password Flow, and Workspace Campaign Isolation Test Suite

import assert from 'node:assert';
import http from 'node:http';
import { createAdminMiddleware } from '../server/adminMiddleware.js';
import { getBrandScopedData, getInitialMarketplaceState } from '../src/data/marketplaceStore.js';

let server;
let baseUrl;

async function startTestServer() {
  const middleware = createAdminMiddleware();
  server = http.createServer((req, res) => {
    middleware(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
}

async function stopTestServer() {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runAllAuthVerificationTests() {
  console.log('🧪 Starting ALLOY Authentication Verification & Campaign Isolation Test Suite...\n');
  await startTestServer();

  try {
    // ------------------------------------------------------------------------
    // Test 1: Non-existent ID/email returns 404 ACCOUNT_NOT_FOUND (not allowed)
    // ------------------------------------------------------------------------
    console.log('▶ Test 1: Non-existent ID/email rejected with 404 ACCOUNT_NOT_FOUND');
    {
      const res = await request('/api/auth/login-verify', {
        method: 'POST',
        body: {
          email: 'unknown-intruder-999@example.com',
          password: 'SomePassword123!',
          role: 'brand'
        }
      });
      assert.strictEqual(res.status, 404, 'Expected status 404 for unknown user');
      assert.strictEqual(res.data.ok, false, 'Expected ok: false');
      assert.strictEqual(res.data.error, 'ACCOUNT_NOT_FOUND', 'Expected error code ACCOUNT_NOT_FOUND');
      assert.ok(
        res.data.message.includes('Account not found in our database') && res.data.message.includes('create an account first'),
        'Expected prompt to create account first'
      );
      console.log('  ✅ Non-existent user strictly rejected with prompt to create account first');
    }

    // ------------------------------------------------------------------------
    // Test 2: Existing ID/email with wrong password rejected with 401 INVALID_PASSWORD
    // ------------------------------------------------------------------------
    console.log('\n▶ Test 2: Existing account with wrong password rejected with 401 INVALID_PASSWORD');
    {
      const res = await request('/api/auth/login-verify', {
        method: 'POST',
        body: {
          email: 'lumina.demo@alloy.market',
          password: 'TotallyWrongPassword999!',
          role: 'brand'
        }
      });
      assert.strictEqual(res.status, 401, 'Expected status 401 for wrong password');
      assert.strictEqual(res.data.ok, false, 'Expected ok: false');
      assert.strictEqual(res.data.error, 'INVALID_PASSWORD', 'Expected error code INVALID_PASSWORD');
      assert.ok(
        res.data.message.includes('Incorrect password') && res.data.message.includes('reset your password'),
        'Expected prompt to reset password'
      );
      console.log('  ✅ Wrong password strictly rejected with prompt to reset password');
    }

    // ------------------------------------------------------------------------
    // Test 3: Correct ID & password admitted with role & profile info
    // ------------------------------------------------------------------------
    console.log('\n▶ Test 3: Correct credentials authenticated and admitted');
    {
      const res = await request('/api/auth/login-verify', {
        method: 'POST',
        body: {
          email: 'lumina.demo@alloy.market',
          password: 'AlloyDemo2026!',
          role: 'brand'
        }
      });
      assert.strictEqual(res.status, 200, 'Expected status 200 for correct credentials');
      assert.strictEqual(res.data.ok, true, 'Expected ok: true');
      assert.strictEqual(res.data.user.email, 'lumina.demo@alloy.market');
      assert.strictEqual(res.data.user.role, 'brand');
      assert.strictEqual(res.data.user.display_name, 'Lumina Botanica');
      console.log('  ✅ Legitimate credentials verified in DB and granted permission to enter');
    }

    // ------------------------------------------------------------------------
    // Test 4: Forgot password for non-existent account returns 404
    // ------------------------------------------------------------------------
    console.log('\n▶ Test 4: Password reset for unknown email rejected');
    {
      const res = await request('/api/auth/reset-password', {
        method: 'POST',
        body: {
          email: 'random-ghost-email@example.com',
          newPassword: 'BrandNewSecurePassword2026!'
        }
      });
      assert.strictEqual(res.status, 404, 'Expected status 404');
      assert.strictEqual(res.data.ok, false);
      assert.strictEqual(res.data.error, 'ACCOUNT_NOT_FOUND');
      console.log('  ✅ Cannot reset non-existent account; prompt to create account first');
    }

    // ------------------------------------------------------------------------
    // Test 5: Forgot password updates password directly throughout DB & platform
    // ------------------------------------------------------------------------
    console.log('\n▶ Test 5: Direct password reset updates credentials in DB and allows immediate login');
    {
      const targetEmail = 'lumina.demo@alloy.market';
      const updatedPassword = 'NewSecretPassword2026!';

      // 1. Reset password directly
      const resetRes = await request('/api/auth/reset-password', {
        method: 'POST',
        body: {
          email: targetEmail,
          newPassword: updatedPassword
        }
      });
      assert.strictEqual(resetRes.status, 200, 'Password reset must succeed');
      assert.strictEqual(resetRes.data.ok, true);

      // 2. Old password should now fail
      const oldLoginRes = await request('/api/auth/login-verify', {
        method: 'POST',
        body: { email: targetEmail, password: 'AlloyDemo2026!' }
      });
      assert.strictEqual(oldLoginRes.status, 401, 'Old password must now be rejected');

      // 3. New password should now succeed
      const newLoginRes = await request('/api/auth/login-verify', {
        method: 'POST',
        body: { email: targetEmail, password: updatedPassword }
      });
      assert.strictEqual(newLoginRes.status, 200, 'New password must succeed');
      assert.strictEqual(newLoginRes.data.user.email, targetEmail);

      // 4. Revert back to original demo password
      await request('/api/auth/reset-password', {
        method: 'POST',
        body: { email: targetEmail, newPassword: 'AlloyDemo2026!' }
      });
      console.log('  ✅ Direct password reset updated throughout platform and DB without external delays');
    }

    // ------------------------------------------------------------------------
    // Test 6: Registration (Fresh Start) rejects duplicate email with 409
    // ------------------------------------------------------------------------
    console.log('\n▶ Test 6: Fresh account registration checks existing users');
    {
      const dupRes = await request('/api/auth/register', {
        method: 'POST',
        body: {
          email: 'lumina.demo@alloy.market',
          password: 'SomePassword123!',
          role: 'brand',
          displayName: 'Duplicate Test'
        }
      });
      assert.strictEqual(dupRes.status, 409, 'Expected status 409 for existing email');
      assert.strictEqual(dupRes.data.error, 'ACCOUNT_EXISTS');
      console.log('  ✅ Duplicate registration prevented with prompt to sign in');
    }

    // ------------------------------------------------------------------------
    // Test 7: Strict Campaign Isolation — New Brand gets 0 other campaigns
    // ------------------------------------------------------------------------
    console.log('\n▶ Test 7: Strict Brand & Campaign Isolation — New brand cannot see other campaigns');
    {
      const state = getInitialMarketplaceState();
      const newBrandEmail = 'fresh-brand-studio@example.com';
      const emailKey = newBrandEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
      const customBrandId = `brand-${emailKey}`;

      // In real brand mode, scope state to customBrandId
      const brandScoped = getBrandScopedData(state, customBrandId, false);

      // Verify the new brand is isolated
      assert.strictEqual(brandScoped.currentBrand.id, customBrandId);
      assert.strictEqual(brandScoped.campaigns.length, 0, 'New brand must have 0 campaigns (fresh start)');

      // Confirm demo campaigns from Lumina Botanica or Vanguard are NOT leaked
      const hasLuminaCampaign = brandScoped.campaigns.some(c => c.id === 'camp-summer-skincare');
      const hasVanguardCampaign = brandScoped.campaigns.some(c => c.id === 'camp-vanguard-chrono');
      assert.strictEqual(hasLuminaCampaign, false, 'Must NEVER leak Lumina campaigns to new brand');
      assert.strictEqual(hasVanguardCampaign, false, 'Must NEVER leak Vanguard campaigns to new brand');

      // Now add a campaign created by this new brand
      const myNewCampaign = {
        id: 'camp-fresh-brand-001',
        ownerBrandId: customBrandId,
        brandId: customBrandId,
        title: 'Fresh Brand Autumn Launch'
      };
      const updatedState = {
        ...state,
        campaigns: [myNewCampaign, ...(state.campaigns || [])]
      };

      const updatedScoped = getBrandScopedData(updatedState, customBrandId, false);
      assert.strictEqual(updatedScoped.campaigns.length, 1);
      assert.strictEqual(updatedScoped.campaigns[0].id, 'camp-fresh-brand-001');
      assert.strictEqual(updatedScoped.campaigns[0].ownerBrandId, customBrandId);

      console.log('  ✅ New brand profile receives clean fresh start and is completely isolated from other brands campaigns');
    }

    console.log('\n======================================================');
    console.log('All Authentication Verification & Isolation Tests Passed! (7/7)');
    console.log('======================================================\n');
  } finally {
    await stopTestServer();
  }
}

runAllAuthVerificationTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
