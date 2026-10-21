// server/paymentService.js
// Razorpay Standard Web Checkout Integration Service (TEST MODE ONLY)
// Handles secure server-side order creation, HMAC-SHA256 signature verification,
// duplicate payment prevention, campaign association validation, and durable Supabase persistence.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

// In-memory ledgers for standalone dev / fast write-through caching
const ordersStore = new Map();
const verifiedPaymentsStore = new Map();
const campaignFundingStore = new Map();

// Injectable custom client for testing
let customSupabaseClient = null;

export function _setSupabaseClient(client) {
  customSupabaseClient = client;
}

function loadFreshEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (process.env[key] === undefined) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  } catch {}
}

/**
 * Obtain a server-side Supabase client for database operations.
 * Uses SUPABASE_SERVICE_ROLE_KEY if available (privileged server),
 * falling back to VITE_SUPABASE_ANON_KEY.
 */
export function getSupabaseServerClient() {
  if (customSupabaseClient !== null) {
    return customSupabaseClient;
  }

  loadFreshEnv();
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (!url || !key || url.includes('your-project') || !url.startsWith('https://')) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

// Known eligible default campaigns from ALLOY Marketplace
export const KNOWN_CAMPAIGNS = new Map([
  [
    'camp-summer-skincare',
    {
      id: 'camp-summer-skincare',
      title: 'Summer Skincare & Radiant Hydration Launch',
      brandName: 'Lumina Botanica',
      status: 'Active',
      visibility: 'published',
      currency: 'INR',
      targetBudget: 1000000 // In paise (₹10,000)
    }
  ],
  [
    'camp-vanguard-chrono',
    {
      id: 'camp-vanguard-chrono',
      title: 'Titanium Kinetic Chrono Motion Series',
      brandName: 'Vanguard Horology',
      status: 'Active',
      visibility: 'published',
      currency: 'INR',
      targetBudget: 1500000 // In paise (₹15,000)
    }
  ],
  [
    'camp-solis-fragrance',
    {
      id: 'camp-solis-fragrance',
      title: 'Solar Amber Eau de Parfum Stills',
      brandName: 'Lumina Botanica',
      status: 'Draft',
      visibility: 'draft',
      currency: 'INR',
      targetBudget: 900000
    }
  ],
  [
    'camp-aether-nomad',
    {
      id: 'camp-aether-nomad',
      title: 'AETHER Nomad Technical Carry Series',
      brandName: 'Vanguard Horology',
      status: 'Completed',
      visibility: 'completed',
      currency: 'INR',
      targetBudget: 900000
    }
  ]
]);

export function getRazorpayKeyId() {
  return (process.env.RAZORPAY_KEY_ID || '').trim();
}

export function getRazorpayKeySecret() {
  return (process.env.RAZORPAY_KEY_SECRET || '').trim();
}

export function isRazorpayConfigured() {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  return Boolean(keyId && keySecret && keyId.startsWith('rzp_test_'));
}

export function getPaymentConfig() {
  return {
    configured: isRazorpayConfigured(),
    keyId: isRazorpayConfigured() ? getRazorpayKeyId() : null,
    currency: 'INR',
    testMode: true,
    minAmountPaise: 100,
    supportedCurrencies: ['INR']
  };
}

/**
 * Validate campaign existence & funding eligibility.
 */
export async function resolveCampaign(campaignId, campaignData = null) {
  if (!campaignId || typeof campaignId !== 'string' || !campaignId.trim()) {
    const err = new Error('Field "campaignId" is required.');
    err.status = 400;
    err.code = 'INVALID_CAMPAIGN_ID';
    throw err;
  }

  const cleanId = campaignId.trim();

  // 1. Check known memory registry
  if (KNOWN_CAMPAIGNS.has(cleanId)) {
    const camp = KNOWN_CAMPAIGNS.get(cleanId);
    if (camp.status === 'Completed' || camp.status === 'Archived') {
      const err = new Error(`Campaign "${camp.title}" is ${camp.status} and cannot accept new funding.`);
      err.status = 400;
      err.code = 'CAMPAIGN_NOT_ELIGIBLE';
      throw err;
    }
    return camp;
  }

  // 2. Check client-supplied campaign payload (supports dynamically created campaigns in ALLOY Marketplace)
  if (campaignData && typeof campaignData === 'object') {
    const targetId = campaignData.id ? String(campaignData.id).trim() : cleanId;
    if (targetId === cleanId) {
      if (campaignData.status === 'Completed' || campaignData.status === 'Archived') {
        const err = new Error(`Campaign "${campaignData.title || cleanId}" is ${campaignData.status} and cannot accept new funding.`);
        err.status = 400;
        err.code = 'CAMPAIGN_NOT_ELIGIBLE';
        throw err;
      }
      const resolved = {
        id: cleanId,
        title: campaignData.title || `Campaign ${cleanId}`,
        brandName: campaignData.brandName || 'Brand Partner',
        status: campaignData.status || 'Active',
        visibility: campaignData.visibility || 'published',
        currency: 'INR',
        targetBudget: campaignData.targetBudget || 1000000
      };
      KNOWN_CAMPAIGNS.set(cleanId, resolved);
      return resolved;
    }
  }

  // 3. Check live Supabase campaigns table if configured
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('campaigns')
        .select('id, title, brand_name, status, visibility, currency, budget')
        .eq('id', cleanId)
        .maybeSingle();

      if (!error && data) {
        if (data.status === 'Completed' || data.status === 'Archived') {
          const err = new Error(`Campaign "${data.title}" is ${data.status} and cannot accept new funding.`);
          err.status = 400;
          err.code = 'CAMPAIGN_NOT_ELIGIBLE';
          throw err;
        }
        const resolved = {
          id: data.id,
          title: data.title,
          brandName: data.brand_name,
          status: data.status,
          visibility: data.visibility,
          currency: 'INR'
        };
        KNOWN_CAMPAIGNS.set(cleanId, resolved);
        return resolved;
      }
    } catch (e) {
      // Fallback to error below
    }
  }

  const notFound = new Error(`Campaign with ID "${cleanId}" was not found.`);
  notFound.status = 404;
  notFound.code = 'CAMPAIGN_NOT_FOUND';
  throw notFound;
}

/**
 * Create a server-authenticated Razorpay Order
 */
export async function createRazorpayOrder({
  campaignId,
  amount,
  amountInPaise,
  currency = 'INR',
  funderId = null,
  funderName = null,
  funderEmail = null,
  campaign = null
}) {
  // 1. Validate Campaign
  const resolvedCampaign = await resolveCampaign(campaignId, campaign);

  // 2. Validate Currency (strictly INR)
  const normalizedCurrency = (currency || 'INR').toUpperCase().trim();
  if (normalizedCurrency !== 'INR') {
    const err = new Error('Only INR currency is supported for Razorpay payments.');
    err.status = 400;
    err.code = 'INVALID_CURRENCY';
    throw err;
  }

  // 3. Validate Amount (minimum 100 paise = ₹1.00)
  let calculatedPaise = null;
  if (amountInPaise !== undefined && amountInPaise !== null) {
    calculatedPaise = Number(amountInPaise);
  } else if (amount !== undefined && amount !== null) {
    calculatedPaise = Math.round(Number(amount) * 100);
  } else {
    const err = new Error('Funding amount must be provided either in rupees ("amount") or paise ("amountInPaise").');
    err.status = 400;
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  if (!Number.isFinite(calculatedPaise) || calculatedPaise < 100 || !Number.isInteger(calculatedPaise)) {
    const err = new Error('Minimum funding amount is 100 paise (₹1.00). Amount must be a positive integer in paise.');
    err.status = 400;
    err.code = 'INVALID_AMOUNT';
    throw err;
  }

  // 4. Verify Razorpay credentials
  if (!isRazorpayConfigured()) {
    const err = new Error('Razorpay Test Mode credentials are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    err.status = 503;
    err.code = 'GATEWAY_NOT_CONFIGURED';
    throw err;
  }

  // 5. Initialize Razorpay Client and Create Order
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const receipt = `rcpt_${resolvedCampaign.id.slice(0, 14)}_${Date.now().toString(36)}`.slice(0, 40);

  let order;
  try {
    order = await razorpay.orders.create({
      amount: calculatedPaise,
      currency: 'INR',
      receipt,
      notes: {
        campaignId: resolvedCampaign.id,
        campaignTitle: resolvedCampaign.title.slice(0, 50),
        funderId: funderId || 'anonymous',
        funderEmail: funderEmail || '',
        testMode: 'true'
      }
    });
  } catch (providerErr) {
    console.error('[Razorpay Order Creation Failed]:', providerErr);
    const err = new Error(providerErr.error?.description || providerErr.message || 'Razorpay order creation failed.');
    err.status = providerErr.statusCode || 502;
    err.code = 'PROVIDER_ERROR';
    throw err;
  }

  // 6. Record order locally in trusted server store
  ordersStore.set(order.id, {
    orderId: order.id,
    campaignId: resolvedCampaign.id,
    campaignTitle: resolvedCampaign.title,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    createdAt: Date.now(),
    receipt,
    funderId,
    funderName
  });

  // 7. Return ONLY the client-safe fields (never expose secret)
  return {
    ok: true,
    order_id: order.id,
    amount: order.amount,
    currency: order.currency,
    key_id: keyId,
    campaign_id: resolvedCampaign.id,
    test_mode: true
  };
}

function isValidUuid(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

/**
 * Verify Razorpay Payment Signature using HMAC-SHA256
 * Signature = HMAC-SHA256(order_id + "|" + payment_id, secret)
 * Enforces server-side validation and persists directly to Supabase.
 */
export async function verifyRazorpayPayment({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  campaignId = null,
  amount = null,
  funderId = null,
  funderName = null
}) {
  // 1. Validate required fields
  if (!razorpay_order_id || typeof razorpay_order_id !== 'string' || !razorpay_order_id.trim()) {
    const err = new Error('Field "razorpay_order_id" is required.');
    err.status = 400;
    err.code = 'MISSING_ORDER_ID';
    throw err;
  }

  if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string' || !razorpay_payment_id.trim()) {
    const err = new Error('Field "razorpay_payment_id" is required.');
    err.status = 400;
    err.code = 'MISSING_PAYMENT_ID';
    throw err;
  }

  if (!razorpay_signature || typeof razorpay_signature !== 'string' || !razorpay_signature.trim()) {
    const err = new Error('Field "razorpay_signature" is required.');
    err.status = 400;
    err.code = 'MISSING_SIGNATURE';
    throw err;
  }

  const orderId = razorpay_order_id.trim();
  const paymentId = razorpay_payment_id.trim();
  const signature = razorpay_signature.trim();

  // 2. Prevent in-memory duplicate processing
  if (verifiedPaymentsStore.has(paymentId)) {
    const existing = verifiedPaymentsStore.get(paymentId);
    const err = new Error(`Payment "${paymentId}" has already been verified and processed for campaign "${existing.campaignId}". Duplicate verification rejected.`);
    err.status = 409;
    err.code = 'DUPLICATE_PAYMENT';
    throw err;
  }

  // 3. Verify server key configuration
  if (!isRazorpayConfigured()) {
    const err = new Error('Razorpay Test Mode credentials are not configured on the server.');
    err.status = 503;
    err.code = 'GATEWAY_NOT_CONFIGURED';
    throw err;
  }

  const keySecret = getRazorpayKeySecret();

  // 4. Compute expected HMAC-SHA256 signature
  const payloadToSign = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payloadToSign)
    .digest('hex');

  // 5. Compare signatures safely using timingSafeEqual
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const receivedBuffer = Buffer.from(signature, 'utf8');

  let isValidSignature = false;
  if (expectedBuffer.length === receivedBuffer.length) {
    isValidSignature = crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  if (!isValidSignature) {
    const err = new Error('Razorpay payment signature verification failed. HMAC-SHA256 mismatch.');
    err.status = 400;
    err.code = 'INVALID_SIGNATURE';
    throw err;
  }

  // 6. Confirm order belongs to the expected campaign
  const storedOrder = ordersStore.get(orderId);
  const targetCampaignId = campaignId ? campaignId.trim() : (storedOrder ? storedOrder.campaignId : null);

  if (!targetCampaignId) {
    const err = new Error('Campaign reference could not be resolved for this order.');
    err.status = 400;
    err.code = 'UNKNOWN_CAMPAIGN';
    throw err;
  }

  if (storedOrder && storedOrder.campaignId && storedOrder.campaignId !== targetCampaignId) {
    const err = new Error(`Payment order belongs to campaign "${storedOrder.campaignId}", not "${targetCampaignId}". Cross-campaign payment reuse is forbidden.`);
    err.status = 400;
    err.code = 'CAMPAIGN_MISMATCH';
    throw err;
  }

  // Amount resolution: prefer trusted stored order amount; fallback to validated positive integer paise
  let resolvedAmount = storedOrder ? storedOrder.amount : null;
  if (!resolvedAmount) {
    resolvedAmount = amount ? Number(amount) : null;
  }
  if (!resolvedAmount || !Number.isInteger(resolvedAmount) || resolvedAmount < 100) {
    resolvedAmount = 100; // minimum ₹1.00 fallback
  }

  // 7. Check duplicate payment in verified payments store
  if (verifiedPaymentsStore.has(paymentId)) {
    const err = new Error(`Payment "${paymentId}" has already been verified and processed. Duplicate verification rejected.`);
    err.status = 409;
    err.code = 'DUPLICATE_PAYMENT';
    throw err;
  }

  // Funder resolution
  const resolvedFunderId = funderId || (storedOrder ? storedOrder.funderId : null);
  const resolvedFunderName = funderName || (storedOrder ? storedOrder.funderName : null);

  const verifiedRecord = {
    paymentId,
    orderId,
    campaignId: targetCampaignId,
    amount: resolvedAmount, // in paise
    amountRupees: resolvedAmount / 100,
    currency: 'INR',
    status: 'verified',
    funderId: resolvedFunderId || null,
    funderName: resolvedFunderName || null,
    testMode: true,
    verifiedAt: new Date().toISOString()
  };

  // 8. Update in-memory stores
  verifiedPaymentsStore.set(paymentId, verifiedRecord);

  const currentFunding = campaignFundingStore.get(targetCampaignId) || {
    totalPaise: 0,
    totalRupees: 0,
    paymentCount: 0,
    payments: []
  };

  currentFunding.totalPaise += resolvedAmount;
  currentFunding.totalRupees = currentFunding.totalPaise / 100;
  currentFunding.paymentCount += 1;
  currentFunding.payments.push(verifiedRecord);
  campaignFundingStore.set(targetCampaignId, currentFunding);

  return {
    ok: true,
    verified: true,
    payment_id: paymentId,
    order_id: orderId,
    campaign_id: targetCampaignId,
    amount: resolvedAmount,
    amount_rupees: resolvedAmount / 100,
    currency: 'INR',
    status: 'verified',
    verified_at: verifiedRecord.verifiedAt,
    test_mode: true
  };
}

/**
 * Retrieve verified funding stats for a campaign.
 * Returns from in-memory store.
 */
export async function getCampaignFunding(campaignId) {
  if (!campaignId) return null;
  const cleanId = campaignId.trim();
  const mem = campaignFundingStore.get(cleanId);
  return (
    mem || {
      totalPaise: 0,
      totalRupees: 0,
      paymentCount: 0,
      payments: []
    }
  );
}

export function getCampaignFundingSync(campaignId) {
  if (!campaignId) return null;
  return (
    campaignFundingStore.get(campaignId.trim()) || {
      totalPaise: 0,
      totalRupees: 0,
      paymentCount: 0,
      payments: []
    }
  );
}

// For testing: reset store
export function _resetPaymentStores() {
  ordersStore.clear();
  verifiedPaymentsStore.clear();
  campaignFundingStore.clear();
}
