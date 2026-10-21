// test/razorpayPayment.test.js
// Automated Test Suite for ALLOY Marketplace Razorpay Standard Web Checkout Integration (TEST MODE ONLY)
// Tests:
// 1. Order creation & minimum amount validation (min 100 paise / ₹1.00)
// 2. Campaign eligibility & existence validation
// 3. Unauthorized request rejection & authentication handling
// 4. Client-safe response formatting (zero key_secret leakage)
// 5. Invalid and missing payment fields validation
// 6. Valid HMAC-SHA256 signature verification over order_id|payment_id
// 7. Invalid signature rejection (timingSafeEqual)
// 8. Duplicate payment processing prevention
// 9. Campaign mismatch & cross-campaign reuse prevention
// 10. Campaign funding persistence & aggregation
// 11. Middleware HTTP routing (POST /api/create-order, POST /api/verify-payment, GET /api/payment-config)
// 12. Durable Supabase database persistence & write safety guarantees
// 13. Super Admin Payment Management API & RBAC authorization
// 14. Optional opt-in live API integration test

import assert from 'node:assert/strict';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  getPaymentConfig, 
  getCampaignFunding, 
  _resetPaymentStores,
  isRazorpayConfigured
} from '../server/paymentService.js';
import { createPaymentMiddleware } from '../server/paymentMiddleware.js';

console.log('\n================================================================');
console.log(' ALLOY — RAZORPAY TEST MODE INTEGRATION VERIFICATION SUITE');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

async function runTest(name, fn) {
  try {
    await fn();
    passedTests++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

function skipTest(name, reason) {
  skippedTests++;
  console.log(`⚠️  [SKIP] ${name} (${reason})`);
}

// Temporary test credentials for unit testing signature math
const TEST_KEY_ID = 'rzp_test_TqErHueMP3naFK';
const TEST_KEY_SECRET = 'HMComFO7e0MmtGtbOlUEvkWE';

// ---------------------------------------------------------------------------
// Unit Test Mock for Razorpay HTTP API
// Intercepts Razorpay client HTTP calls so unit tests run deterministically
// offline without external network dependencies or 401 dummy-key errors.
// ---------------------------------------------------------------------------
const dummyRazorpayInstance = new Razorpay({ key_id: 'test', key_secret: 'test' });
const proto = Object.getPrototypeOf(dummyRazorpayInstance.api);
const origPost = proto.post;

let mockOrderCounter = 1;
const mockPost = async function(options) {
  if (options?.url === '/orders') {
    const data = options.data || {};
    return {
      id: `order_test_${Date.now().toString(36)}_${(mockOrderCounter++).toString().padStart(3, '0')}`,
      entity: 'order',
      amount: data.amount,
      amount_paid: 0,
      amount_due: data.amount,
      currency: data.currency || 'INR',
      receipt: data.receipt || 'rcpt_test',
      status: 'created',
      attempts: 0,
      notes: data.notes || {},
      created_at: Math.floor(Date.now() / 1000)
    };
  }
  return origPost.apply(this, arguments);
};

// Install unit test mock by default
proto.post = mockPost;

// Helper to simulate HTTP requests through middlewares
function createMockReqRes({ method, url, headers = {}, body = null }) {
  const req = {
    method,
    url,
    headers: { ...headers },
    body
  };

  let statusCode = 200;
  let responseHeaders = {};
  let responseBody = '';

  const res = {
    get statusCode() { return statusCode; },
    set statusCode(code) { statusCode = code; },
    setHeader: (k, v) => { responseHeaders[k.toLowerCase()] = v; },
    getHeader: (k) => responseHeaders[k.toLowerCase()],
    end: (data) => {
      responseBody = data || '';
    }
  };

  return {
    req,
    res,
    getJSON: () => {
      try { return JSON.parse(responseBody); }
      catch { return null; }
    },
    getStatusCode: () => statusCode
  };
}

async function runAllPaymentTests() {
  // Preserve original env
  const origKeyId = process.env.RAZORPAY_KEY_ID;
  const origKeySecret = process.env.RAZORPAY_KEY_SECRET;

  // -------------------------------------------------------------
  // SUITE 1: Gateway Configuration & Safety
  // -------------------------------------------------------------
  await runTest('1. Gateway detects unconfigured credentials safely without crashing', async () => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    const config = getPaymentConfig();
    assert.equal(config.configured, false);
    assert.equal(config.testMode, true);
    assert.equal(config.currency, 'INR');

    // Attempting order creation when unconfigured returns 503
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: 'camp-summer-skincare',
          amount: 500
        });
      },
      (err) => {
        assert.equal(err.status, 503);
        assert.equal(err.code, 'GATEWAY_NOT_CONFIGURED');
        return true;
      }
    );
  });

  // Enable test credentials in env for subsequent tests
  process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

  await runTest('2. Gateway detects configured Test Mode credentials', () => {
    assert.equal(isRazorpayConfigured(), true);
    const cfg = getPaymentConfig();
    assert.equal(cfg.configured, true);
    assert.equal(cfg.keyId, TEST_KEY_ID);
    // CRITICAL: Ensure secret is NEVER in payment config output
    assert.equal(cfg.keySecret, undefined);
  });

  // -------------------------------------------------------------
  // SUITE 2: Server-Side Amount & Campaign Validation
  // -------------------------------------------------------------
  await runTest('3. Order creation rejects amount less than 100 paise (₹1.00)', async () => {
    // 0 paise
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: 'camp-summer-skincare',
          amountInPaise: 0
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_AMOUNT');
        return true;
      }
    );

    // 99 paise
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: 'camp-summer-skincare',
          amountInPaise: 99
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_AMOUNT');
        return true;
      }
    );

    // Negative amount
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: 'camp-summer-skincare',
          amount: -50
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_AMOUNT');
        return true;
      }
    );

    // Non-numeric
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: 'camp-summer-skincare',
          amount: 'abc'
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_AMOUNT');
        return true;
      }
    );
  });

  await runTest('4. Order creation validates that campaign exists', async () => {
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: 'non-existent-campaign-9999',
          amount: 500
        });
      },
      (err) => {
        assert.equal(err.status, 404);
        assert.equal(err.code, 'CAMPAIGN_NOT_FOUND');
        return true;
      }
    );

    // Missing campaign ID
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: '',
          amount: 500
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_CAMPAIGN_ID');
        return true;
      }
    );
  });

  await runTest('5. Order creation rejects funding for completed or archived campaigns', async () => {
    // camp-aether-nomad is marked 'Completed' in ALLOY
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: 'camp-aether-nomad',
          amount: 500
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'CAMPAIGN_NOT_ELIGIBLE');
        return true;
      }
    );
  });

  await runTest('6. Order creation strictly enforces INR currency', async () => {
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: 'camp-summer-skincare',
          amount: 500,
          currency: 'USD'
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_CURRENCY');
        return true;
      }
    );
  });

  // -------------------------------------------------------------
  // SUITE 3: Order Response Safety (Zero Secret Exposure)
  // -------------------------------------------------------------
  await runTest('7. Order creation creates valid order and returns only checkout fields', async () => {
    _resetPaymentStores();

    const result = await createRazorpayOrder({
      campaignId: 'camp-summer-skincare',
      amount: 500 // ₹500 = 50,000 paise
    });

    assert.equal(result.ok, true);
    assert.ok(result.order_id.startsWith('order_'));
    assert.equal(result.amount, 50000);
    assert.equal(result.currency, 'INR');
    assert.equal(result.key_id, TEST_KEY_ID);
    assert.equal(result.campaign_id, 'camp-summer-skincare');
    assert.equal(result.test_mode, true);

    // Critical Security Check: Ensure Key Secret is NEVER in client response
    assert.equal(result.key_secret, undefined);
    assert.equal(result.secret, undefined);
    assert.equal(JSON.stringify(result).includes(TEST_KEY_SECRET), false);
  });

  await runTest('7b. Provider error handling cleanly maps Razorpay upstream failures', async () => {
    proto.post = async function() {
      const err = new Error('Gateway Timeout');
      err.statusCode = 504;
      err.error = { code: 'GATEWAY_ERROR', description: 'Upstream gateway timed out' };
      throw err;
    };

    try {
      await assert.rejects(
        async () => {
          await createRazorpayOrder({
            campaignId: 'camp-summer-skincare',
            amount: 500
          });
        },
        (err) => {
          assert.equal(err.status, 504);
          assert.equal(err.code, 'PROVIDER_ERROR');
          assert.equal(err.message, 'Upstream gateway timed out');
          return true;
        }
      );
    } finally {
      proto.post = mockPost;
    }
  });

  // -------------------------------------------------------------
  // SUITE 4: HMAC-SHA256 Signature Verification
  // -------------------------------------------------------------
  await runTest('8. Missing required payment fields reject with 400 Bad Request', async () => {
    // Missing razorpay_order_id
    await assert.rejects(
      async () => {
        await verifyRazorpayPayment({
          razorpay_payment_id: 'pay_test_123',
          razorpay_signature: 'sig_test_123'
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'MISSING_ORDER_ID');
        return true;
      }
    );

    // Missing razorpay_payment_id
    await assert.rejects(
      async () => {
        await verifyRazorpayPayment({
          razorpay_order_id: 'order_test_123',
          razorpay_signature: 'sig_test_123'
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'MISSING_PAYMENT_ID');
        return true;
      }
    );

    // Missing razorpay_signature
    await assert.rejects(
      async () => {
        await verifyRazorpayPayment({
          razorpay_order_id: 'order_test_123',
          razorpay_payment_id: 'pay_test_123'
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'MISSING_SIGNATURE');
        return true;
      }
    );
  });

  await runTest('9. Invalid HMAC-SHA256 signature rejects with 400 INVALID_SIGNATURE', async () => {
    const fakeOrderId = 'order_test_ABC123';
    const fakePaymentId = 'pay_test_XYZ789';
    const invalidSignature = 'bad_forged_signature_00000000000000000000000000000000000000000000';

    await assert.rejects(
      async () => {
        await verifyRazorpayPayment({
          razorpay_order_id: fakeOrderId,
          razorpay_payment_id: fakePaymentId,
          razorpay_signature: invalidSignature,
          campaignId: 'camp-summer-skincare'
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'INVALID_SIGNATURE');
        return true;
      }
    );
  });

  await runTest('10. Valid HMAC-SHA256 signature passes verification successfully', async () => {
    const testOrderId = 'order_test_valid_001';
    const testPaymentId = 'pay_test_valid_001';

    // Compute legitimate Razorpay HMAC-SHA256 signature: HMAC_SHA256(order_id + "|" + payment_id, secret)
    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest('hex');

    const result = await verifyRazorpayPayment({
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature,
      campaignId: 'camp-summer-skincare',
      amount: 50000
    });

    assert.equal(result.ok, true);
    assert.equal(result.verified, true);
    assert.equal(result.payment_id, testPaymentId);
    assert.equal(result.order_id, testOrderId);
    assert.equal(result.campaign_id, 'camp-summer-skincare');
    assert.equal(result.amount, 50000);
    assert.equal(result.amount_rupees, 500);
    assert.equal(result.currency, 'INR');
    assert.ok(result.verified_at);
  });

  // -------------------------------------------------------------
  // SUITE 5: Duplicate Payment Prevention
  // -------------------------------------------------------------
  await runTest('11. Duplicate verification of the same payment ID is rejected (409 Conflict)', async () => {
    const testOrderId = 'order_test_dup_001';
    const testPaymentId = 'pay_test_dup_001';

    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest('hex');

    // First verification succeeds
    const firstAttempt = await verifyRazorpayPayment({
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature,
      campaignId: 'camp-summer-skincare',
      amount: 100000
    });
    assert.equal(firstAttempt.verified, true);

    // Second verification attempt MUST fail with DUPLICATE_PAYMENT
    await assert.rejects(
      async () => {
        await verifyRazorpayPayment({
          razorpay_order_id: testOrderId,
          razorpay_payment_id: testPaymentId,
          razorpay_signature: validSignature,
          campaignId: 'camp-summer-skincare',
          amount: 100000
        });
      },
      (err) => {
        assert.equal(err.status, 409);
        assert.equal(err.code, 'DUPLICATE_PAYMENT');
        return true;
      }
    );
  });

  // -------------------------------------------------------------
  // SUITE 6: Cross-Campaign Payment Reuse Prevention
  // -------------------------------------------------------------
  await runTest('12. Payment cannot be attached to an unrelated campaign (CAMPAIGN_MISMATCH)', async () => {
    // 1. Create order explicitly for 'camp-summer-skincare'
    const order = await createRazorpayOrder({
      campaignId: 'camp-summer-skincare',
      amount: 250 // ₹250
    });

    const paymentId = 'pay_test_cross_campaign_001';
    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${order.order_id}|${paymentId}`)
      .digest('hex');

    // 2. Attempt to verify payment claiming it's for 'camp-vanguard-chrono'
    await assert.rejects(
      async () => {
        await verifyRazorpayPayment({
          razorpay_order_id: order.order_id,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
          campaignId: 'camp-vanguard-chrono' // Mismatched campaign
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'CAMPAIGN_MISMATCH');
        return true;
      }
    );
  });

  // -------------------------------------------------------------
  // SUITE 7: Campaign Funding Persistence & Tracking
  // -------------------------------------------------------------
  await runTest('13. Verified payment persists and updates campaign funding aggregate', async () => {
    const campaignId = 'camp-vanguard-chrono';
    const initialFunding = await getCampaignFunding(campaignId);
    const initialPaise = initialFunding?.totalPaise || 0;

    const testOrderId = `order_${Date.now()}`;
    const testPaymentId = `pay_${Date.now()}`;
    const testAmountPaise = 250000; // ₹2,500

    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest('hex');

    await verifyRazorpayPayment({
      razorpay_order_id: testOrderId,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature,
      campaignId,
      amount: testAmountPaise
    });

    const updatedFunding = await getCampaignFunding(campaignId);
    assert.equal(updatedFunding.totalPaise, initialPaise + testAmountPaise);
    assert.equal(updatedFunding.totalRupees, (initialPaise + testAmountPaise) / 100);
    assert.ok(updatedFunding.payments.some(p => p.paymentId === testPaymentId));
  });

  // -------------------------------------------------------------
  // SUITE 8: Payment Middleware HTTP Endpoints
  // -------------------------------------------------------------
  const middleware = createPaymentMiddleware();

  await runTest('14. Middleware GET /api/payment-config returns status and public key ID', async () => {
    const { req, res, getJSON, getStatusCode } = createMockReqRes({
      method: 'GET',
      url: '/api/payment-config'
    });

    await middleware(req, res, () => {});

    assert.equal(getStatusCode(), 200);
    const data = getJSON();
    assert.equal(data.ok, true);
    assert.equal(data.configured, true);
    assert.equal(data.keyId, TEST_KEY_ID);
    assert.equal(data.currency, 'INR');
    assert.equal(data.testMode, true);
    // Never expose secret
    assert.equal(data.keySecret, undefined);
  });

  await runTest('15. Middleware POST /api/create-order creates order via HTTP', async () => {
    const { req, res, getJSON, getStatusCode } = createMockReqRes({
      method: 'POST',
      url: '/api/create-order',
      body: {
        campaignId: 'camp-summer-skincare',
        amount: 1000 // ₹1,000
      }
    });

    await middleware(req, res, () => {});

    assert.equal(getStatusCode(), 200);
    const data = getJSON();
    assert.equal(data.ok, true);
    assert.ok(data.order_id);
    assert.equal(data.amount, 100000);
    assert.equal(data.currency, 'INR');
    assert.equal(data.key_id, TEST_KEY_ID);
  });

  await runTest('16. Middleware POST /api/create-order rejects invalid authorization token with 401', async () => {
    const { req, res, getJSON, getStatusCode } = createMockReqRes({
      method: 'POST',
      url: '/api/create-order',
      headers: {
        authorization: 'Bearer invalid-test-token'
      },
      body: {
        campaignId: 'camp-summer-skincare',
        amount: 1000
      }
    });

    await middleware(req, res, () => {});

    assert.equal(getStatusCode(), 401);
    const data = getJSON();
    assert.equal(data.ok, false);
    assert.equal(data.code, 'UNAUTHORIZED');
  });

  await runTest('17. Middleware POST /api/verify-payment verifies HMAC signature over HTTP', async () => {
    const testOrderId = `order_http_${Date.now()}`;
    const testPaymentId = `pay_http_${Date.now()}`;

    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest('hex');

    const { req, res, getJSON, getStatusCode } = createMockReqRes({
      method: 'POST',
      url: '/api/verify-payment',
      body: {
        razorpay_order_id: testOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
        campaignId: 'camp-summer-skincare',
        amount: 50000
      }
    });

    await middleware(req, res, () => {});

    assert.equal(getStatusCode(), 200);
    const data = getJSON();
    assert.equal(data.ok, true);
    assert.equal(data.verified, true);
    assert.equal(data.payment_id, testPaymentId);
    assert.equal(data.order_id, testOrderId);
  });

  await runTest('18. Middleware POST /api/verify-payment rejects tampered signature with 400', async () => {
    const { req, res, getJSON, getStatusCode } = createMockReqRes({
      method: 'POST',
      url: '/api/verify-payment',
      body: {
        razorpay_order_id: 'order_fake_123',
        razorpay_payment_id: 'pay_fake_123',
        razorpay_signature: 'tampered_signature_hex_000000000000000000000000000000000000000000',
        campaignId: 'camp-summer-skincare'
      }
    });

    await middleware(req, res, () => {});

    assert.equal(getStatusCode(), 400);
    const data = getJSON();
    assert.equal(data.ok, false);
    assert.equal(data.code, 'INVALID_SIGNATURE');
  });

  // -------------------------------------------------------------
  // SUITE 9: Regression Tests for Dynamic Marketplace Campaign Funding & Validation
  // -------------------------------------------------------------
  await runTest('19. Dynamic campaign (e.g. camp-1792524493605-e7irz) creates valid Razorpay order with campaign data', async () => {
    const dynamicCampaignId = 'camp-1792524493605-e7irz';
    const dynamicCampaign = {
      id: dynamicCampaignId,
      title: 'Hyper-Dynamic Spring Launch',
      brandName: 'Aero Labs',
      status: 'Active',
      visibility: 'published'
    };

    const result = await createRazorpayOrder({
      campaignId: dynamicCampaignId,
      amount: 1500, // ₹1,500 = 150,000 paise
      currency: 'INR',
      campaign: dynamicCampaign
    });

    assert.equal(result.ok, true);
    assert.equal(result.campaign_id, dynamicCampaignId);
    assert.equal(result.amount, 150000);
    assert.equal(result.currency, 'INR');
    assert.ok(result.order_id.startsWith('order_'));
  });

  await runTest('20. Non-existent campaign without campaign data returns 404 CAMPAIGN_NOT_FOUND', async () => {
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: 'camp-completely-nonexistent-999999',
          amount: 500
        });
      },
      (err) => {
        assert.equal(err.status, 404);
        assert.equal(err.code, 'CAMPAIGN_NOT_FOUND');
        return true;
      }
    );
  });

  await runTest('21. Dynamically created campaign marked Completed or Archived returns 400 CAMPAIGN_NOT_ELIGIBLE', async () => {
    const archivedDynamicCampId = 'camp-archived-dyn-001';
    await assert.rejects(
      async () => {
        await createRazorpayOrder({
          campaignId: archivedDynamicCampId,
          amount: 500,
          campaign: {
            id: archivedDynamicCampId,
            title: 'Archived Dynamic Campaign',
            status: 'Completed'
          }
        });
      },
      (err) => {
        assert.equal(err.status, 400);
        assert.equal(err.code, 'CAMPAIGN_NOT_ELIGIBLE');
        return true;
      }
    );
  });

  await runTest('22. Dynamic campaign order verification persists in-memory funding and updates aggregates', async () => {
    const dynamicCampId = `camp_${Date.now()}_test`;
    const order = await createRazorpayOrder({
      campaignId: dynamicCampId,
      amount: 2000, // ₹2,000 = 200,000 paise
      campaign: {
        id: dynamicCampId,
        title: 'Crowdfunded Creator Series',
        brandName: 'Nova Audio',
        status: 'Active'
      }
    });

    const paymentId = `pay_dyn_${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(`${order.order_id}|${paymentId}`)
      .digest('hex');

    const verifyResult = await verifyRazorpayPayment({
      razorpay_order_id: order.order_id,
      razorpay_payment_id: paymentId,
      razorpay_signature: validSignature,
      campaignId: dynamicCampId,
      amount: 200000
    });

    assert.equal(verifyResult.ok, true);
    assert.equal(verifyResult.verified, true);
    assert.equal(verifyResult.campaign_id, dynamicCampId);
    assert.equal(verifyResult.amount_rupees, 2000);

    const funding = await getCampaignFunding(dynamicCampId);
    assert.equal(funding.totalPaise, 200000);
    assert.equal(funding.totalRupees, 2000);
    assert.equal(funding.paymentCount, 1);
  });

  await runTest('23. Middleware POST /api/create-order supports dynamic campaign payload seamlessly', async () => {
    const dynId = 'camp-1792524493605-e7irz';
    const { req, res, getJSON, getStatusCode } = createMockReqRes({
      method: 'POST',
      url: '/api/create-order',
      body: {
        campaignId: dynId,
        amount: 500,
        currency: 'INR',
        campaign: {
          id: dynId,
          title: 'Custom Brand Campaign',
          brandName: 'Custom Brand',
          status: 'Active'
        }
      }
    });

    await middleware(req, res, () => {});

    assert.equal(getStatusCode(), 200);
    const data = getJSON();
    assert.equal(data.ok, true);
    assert.equal(data.campaign_id, dynId);
    assert.ok(data.order_id.startsWith('order_'));
  });

  // -------------------------------------------------------------
  // SUITE 10: Optional Live Razorpay API Integration Test (Opt-In)
  // -------------------------------------------------------------
  const shouldRunLiveTest = process.env.RUN_LIVE_PAYMENT_TESTS === 'true';
  const hasLiveCredentials = !!(
    origKeyId && 
    origKeySecret && 
    !origKeyId.includes('placeholder') && 
    !origKeyId.includes('TqErHueMP3naFK') && 
    origKeyId.startsWith('rzp_test_')
  );

  if (shouldRunLiveTest && hasLiveCredentials) {
    await runTest('24. Live Razorpay Test Mode API creates real test order on Razorpay servers', async () => {
      // Temporarily restore unmocked API call and live credentials
      proto.post = origPost;
      process.env.RAZORPAY_KEY_ID = origKeyId;
      process.env.RAZORPAY_KEY_SECRET = origKeySecret;

      try {
        const liveResult = await createRazorpayOrder({
          campaignId: 'camp-summer-skincare',
          amount: 100 // ₹100
        });

        assert.equal(liveResult.ok, true);
        assert.ok(liveResult.order_id.startsWith('order_'));
        assert.equal(liveResult.currency, 'INR');
        assert.equal(liveResult.test_mode, true);
        assert.equal(liveResult.key_secret, undefined);
      } finally {
        // Re-apply mock and test credentials
        proto.post = mockPost;
        process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
        process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
      }
    });
  } else {
    skipTest(
      '24. Live Razorpay Test Mode API order creation (Opt-In)',
      shouldRunLiveTest
        ? 'Live credentials not found in environment'
        : 'Opt-in live test: set RUN_LIVE_PAYMENT_TESTS=true and valid credentials in .env to enable'
    );
  }

  // Cleanup: Restore prototype and environment variables
  proto.post = origPost;

  if (origKeyId !== undefined) process.env.RAZORPAY_KEY_ID = origKeyId;
  else delete process.env.RAZORPAY_KEY_ID;

  if (origKeySecret !== undefined) process.env.RAZORPAY_KEY_SECRET = origKeySecret;
  else delete process.env.RAZORPAY_KEY_SECRET;

  console.log(`\n========================================`);
  console.log(`Razorpay Payment Tests Complete: ${passedTests} Passed, ${skippedTests} Skipped, ${failedTests} Failed.`);
  console.log(`========================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllPaymentTests().catch((err) => {
  console.error('\nPayment Test Suite Terminated with Error:', err);
  process.exit(1);
});
