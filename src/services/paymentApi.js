// src/services/paymentApi.js
// Frontend API client for Razorpay Standard Checkout & Campaign Funding
// Test Mode Only — Communicates with /api/create-order and /api/verify-payment

import { supabase } from '../lib/supabaseClient';

/**
 * Dynamically load the Razorpay checkout.js script if not already present on window
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[Razorpay] Failed to load checkout script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Helper to retrieve active Supabase bearer token if session exists
 */
async function getAuthToken() {
  try {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || null;
    }
  } catch (e) {
    // Session token retrieval optional
  }
  return null;
}

/**
 * Request Razorpay Order Creation from backend
 * @param {Object} params
 * @param {string} params.campaignId - Campaign ID to fund
 * @param {number} params.amount - Funding amount (in Rupees or paise)
 * @param {number} [params.amountInPaise] - Explicit paise amount
 * @param {string} [params.currency='INR'] - Currency code
 */
export async function createOrder({ campaignId, amount, amountInPaise, currency = 'INR', funderInfo = {}, campaign = null }) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (funderInfo.id) headers['x-funder-id'] = funderInfo.id;
  if (funderInfo.name) headers['x-funder-name'] = funderInfo.name;

  const response = await fetch('/api/create-order', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      campaignId,
      amount,
      amountInPaise,
      currency,
      campaign
    })
  });

  const data = await response.json().catch(() => ({
    ok: false,
    error: 'Failed to parse order response from server.'
  }));

  if (!response.ok || !data.ok) {
    const error = new Error(data.error || `Server returned ${response.status}`);
    error.status = response.status;
    error.code = data.code || 'ORDER_FAILED';
    throw error;
  }

  return data;
}

/**
 * Verify Razorpay payment signature on backend
 * @param {Object} params
 * @param {string} params.razorpay_order_id
 * @param {string} params.razorpay_payment_id
 * @param {string} params.razorpay_signature
 * @param {string} params.campaignId
 * @param {number} [params.amount]
 */
export async function verifyPayment({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  campaignId,
  amount
}) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/verify-payment', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      campaignId,
      amount
    })
  });

  const data = await response.json().catch(() => ({
    ok: false,
    error: 'Failed to parse verification response from server.'
  }));

  if (!response.ok || !data.ok) {
    const error = new Error(data.error || 'Payment signature verification failed.');
    error.status = response.status;
    error.code = data.code || 'VERIFICATION_FAILED';
    throw error;
  }

  return data;
}

/**
 * Get gateway status & public Key ID
 */
export async function getPaymentGatewayConfig() {
  try {
    const res = await fetch('/api/payment-config');
    if (!res.ok) return { ok: false, configured: false };
    return await res.json();
  } catch (err) {
    return { ok: false, configured: false, error: err.message };
  }
}

/**
 * Fetch campaign funding stats
 */
export async function fetchCampaignFunding(campaignId) {
  try {
    const res = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/funding`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.funding || null;
  } catch (e) {
    return null;
  }
}
