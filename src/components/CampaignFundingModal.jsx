// src/components/CampaignFundingModal.jsx
// ALLOY Marketplace — Razorpay Standard Web Checkout (TEST MODE ONLY)
// Features: Server-side order creation, HMAC-SHA256 verification, dynamic SDK loader,
// dismissal & failure handling, duplicate protection, and verified state display.

import React, { useState, useEffect } from 'react';
import {
  X, CheckCircle2, AlertTriangle, ShieldCheck, CreditCard,
  Sparkles, Loader2, RefreshCw, ArrowRight, IndianRupee, ExternalLink
} from 'lucide-react';
import { createOrder, verifyPayment, loadRazorpayScript, getPaymentGatewayConfig } from '../services/paymentApi';
import { recordCampaignFunding } from '../data/marketplaceStore';

export default function CampaignFundingModal({
  isOpen,
  onClose,
  campaign,
  currentUser = null,
  onFundingSuccess = null
}) {
  const [amountRupees, setAmountRupees] = useState(1000);
  const [selectedPreset, setSelectedPreset] = useState(1000);

  // Status stages: 'input' | 'creating_order' | 'checkout_open' | 'verifying' | 'success' | 'error'
  const [stage, setStage] = useState('input');
  const [errorMessage, setErrorMessage] = useState(null);
  const [dismissedNotice, setDismissedNotice] = useState(null);
  const [verifiedPayment, setVerifiedPayment] = useState(null);
  const [gatewayStatus, setGatewayStatus] = useState(null);

  // Preset options in INR
  const presetOptions = [500, 1000, 2500, 5000, 10000];

  useEffect(() => {
    if (isOpen) {
      setStage('input');
      setErrorMessage(null);
      setDismissedNotice(null);
      setVerifiedPayment(null);
      // Pre-load script in background
      loadRazorpayScript().catch(() => {});
      // Check config status
      getPaymentGatewayConfig().then(cfg => setGatewayStatus(cfg)).catch(() => {});
    }
  }, [isOpen, campaign?.id]);

  if (!isOpen || !campaign) return null;

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setAmountRupees(preset);
    setErrorMessage(null);
    setDismissedNotice(null);
  };

  const handleCustomAmountChange = (e) => {
    const val = e.target.value;
    setSelectedPreset(null);
    setAmountRupees(val);
    setErrorMessage(null);
    setDismissedNotice(null);
  };

  const handleStartCheckout = async (e) => {
    if (e) e.preventDefault();
    if (stage === 'creating_order' || stage === 'verifying') return;

    const numAmount = Number(amountRupees);
    if (!Number.isFinite(numAmount) || numAmount < 1) {
      setErrorMessage('Minimum funding amount is ₹1.00 (100 paise).');
      return;
    }

    setErrorMessage(null);
    setDismissedNotice(null);
    setStage('creating_order');

    try {
      // 1. Ensure Razorpay checkout script is loaded
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady || typeof window.Razorpay === 'undefined') {
        throw new Error('Could not load Razorpay Standard Checkout SDK. Please check your internet connection.');
      }

      // 2. Request backend order creation
      const orderData = await createOrder({
        campaignId: campaign.id,
        amount: numAmount,
        currency: 'INR',
        campaign: {
          id: campaign.id,
          title: campaign.title || `${campaign.brandName || 'Brand'} Campaign`,
          brandName: campaign.brandName || 'Brand Partner',
          status: campaign.status || 'Active',
          visibility: campaign.visibility || 'published'
        },
        funderInfo: {
          id: currentUser?.id || 'demo-brand-funder',
          name: currentUser?.displayName || currentUser?.name || 'ALLOY Brand Funder'
        }
      });

      if (!orderData || !orderData.order_id) {
        throw new Error('Order creation failed: No order reference returned from server.');
      }

      setStage('checkout_open');

      // 3. Initialize Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        name: 'ALLOY Marketplace',
        description: `Fund Campaign: ${campaign.title.slice(0, 45)}`,
        image: campaign.brandAvatar || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
        order_id: orderData.order_id,
        prefill: {
          name: currentUser?.displayName || currentUser?.name || 'Alloy Sponsor',
          email: currentUser?.email || 'sponsor@alloy.market',
          contact: '9999999999'
        },
        notes: {
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          mode: 'TEST_MODE_ONLY'
        },
        theme: {
          color: '#EB6E4B' // Alloy primary accent
        },
        modal: {
          ondismiss: function () {
            setStage('input');
            setDismissedNotice('Razorpay checkout window was dismissed. No charges were made.');
          }
        },
        handler: async function (response) {
          // Success callback from Razorpay modal
          // CRITICAL: Do NOT mark campaign funded yet! Send to server for HMAC-SHA256 verification.
          setStage('verifying');
          try {
            const verification = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              campaignId: campaign.id,
              amount: orderData.amount
            });

            if (verification && verification.verified) {
              // Persist locally in state store
              recordCampaignFunding(campaign.id, verification);

              setVerifiedPayment(verification);
              setStage('success');

              if (onFundingSuccess) {
                onFundingSuccess(verification);
              }
            } else {
              throw new Error('Backend signature verification rejected the payment.');
            }
          } catch (verErr) {
            console.error('[Verification Failed]:', verErr);
            setErrorMessage(verErr.message || 'Signature verification failed. The payment could not be authenticated.');
            setStage('error');
          }
        }
      };

      const rzpInstance = new window.Razorpay(options);

      rzpInstance.on('payment.failed', function (failureResponse) {
        console.warn('[Razorpay Payment Failed Event]:', failureResponse);
        const desc = failureResponse.error?.description || failureResponse.error?.reason || 'Payment was declined in test mode.';
        setErrorMessage(`Payment declined: ${desc}`);
        setStage('input');
      });

      rzpInstance.open();
    } catch (err) {
      console.error('[Checkout Flow Error]:', err);
      setErrorMessage(err.message || 'An error occurred while preparing your Razorpay checkout.');
      setStage('error');
    }
  };

  const handleClose = () => {
    if (stage === 'creating_order' || stage === 'verifying') return;
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div
        className="modal-content funding-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          borderRadius: '24px',
          padding: '32px',
          background: 'var(--bg-card, #FFFFFF)',
          boxShadow: '0 25px 60px -15px rgba(20, 19, 18, 0.35)',
          border: '1px solid var(--border-light, #E2E8F0)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          className="modal-close-btn"
          onClick={handleClose}
          disabled={stage === 'creating_order' || stage === 'verifying'}
          aria-label="Close"
          style={{ position: 'absolute', top: '18px', right: '18px' }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="live-pulse-dot mint" />
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#059669',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '3px 10px',
              borderRadius: '100px',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}>
              Razorpay Standard Checkout • TEST MODE
            </span>
          </div>

          <h2 className="font-editorial" style={{ fontSize: '1.9rem', margin: '4px 0 6px', color: 'var(--text-primary)' }}>
            Fund Campaign
          </h2>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {campaign.title}
          </p>
        </div>

        {/* Prominent Test Mode Labeling Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.8) 0%, rgba(253, 230, 138, 0.4) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '14px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', color: '#92400E', lineHeight: 1.5 }}>
            <strong>Razorpay Sandbox Mode:</strong> Real money, bank cards, and creator payouts are never touched. You can complete this transaction using Razorpay test credentials.
          </div>
        </div>

        {/* Dismissed notification */}
        {dismissedNotice && stage !== 'success' && (
          <div style={{
            background: 'rgba(241, 245, 249, 0.9)',
            border: '1px solid #CBD5E1',
            borderRadius: '12px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '0.82rem',
            color: '#475569'
          }}>
            {dismissedNotice}
          </div>
        )}

        {/* Error notification */}
        {errorMessage && stage !== 'success' && (
          <div style={{
            background: 'rgba(254, 242, 242, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '18px',
            fontSize: '0.84rem',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STAGE 1: INPUT / AMOUNT SELECTION */}
        {(stage === 'input' || stage === 'creating_order' || stage === 'checkout_open' || stage === 'error') && (
          <form onSubmit={handleStartCheckout}>
            {/* Campaign Summary Card */}
            <div style={{
              background: 'var(--bg-secondary, #F8FAFC)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '14px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                  Brand Partner
                </span>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {campaign.brandName || 'Alloy Brand'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                  Target Budget
                </span>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {campaign.budget || 'Flexible'}
                </div>
              </div>

              {campaign.fundedAmountRupees > 0 && (
                <div>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#059669', fontWeight: 700 }}>
                    Already Funded
                  </span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#059669' }}>
                    ₹{Number(campaign.fundedAmountRupees).toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>

            {/* Amount Selection Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                Select Funding Amount (INR)
              </label>

              {/* Preset Chips */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {presetOptions.map((preset) => {
                  const isActive = selectedPreset === preset && Number(amountRupees) === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      disabled={stage === 'creating_order'}
                      style={{
                        padding: '10px 0',
                        borderRadius: '10px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        border: isActive ? '2px solid var(--accent-primary, #EB6E4B)' : '1px solid var(--border-medium, #CBD5E1)',
                        background: isActive ? 'rgba(235, 110, 75, 0.08)' : '#FFFFFF',
                        color: isActive ? 'var(--accent-primary, #EB6E4B)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </button>
                  );
                })}
              </div>

              {/* Custom Input */}
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--text-tertiary)'
                }}>
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter custom amount in INR"
                  value={amountRupees}
                  onChange={handleCustomAmountChange}
                  disabled={stage === 'creating_order'}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 32px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    outline: 'none',
                    background: '#FFFFFF'
                  }}
                />
              </div>
              <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Minimum amount: ₹1.00 (100 paise). Currency: Indian Rupee (INR).
              </span>
            </div>

            {/* Test Helper Notes */}
            <div style={{
              background: 'rgba(248, 250, 252, 0.8)',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '24px',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                How to test in Razorpay Modal:
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.5 }}>
                <li>Select <strong>Netbanking</strong> or <strong>Card</strong> or <strong>UPI</strong>.</li>
                <li>Click <strong>Success</strong> in the Razorpay test simulator.</li>
                <li>The server will automatically verify the HMAC-SHA256 signature before confirming.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={stage === 'creating_order'}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={stage === 'creating_order' || Number(amountRupees) < 1}
                id="fund-campaign-proceed-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: '220px',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #EB6E4B 0%, #D45A37 100%)',
                  boxShadow: '0 4px 14px rgba(235, 110, 75, 0.35)'
                }}
              >
                {stage === 'creating_order' ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Creating Order…</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    <span>Proceed to Pay (₹{Number(amountRupees || 0).toLocaleString('en-IN')})</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STAGE 2: VERIFYING SIGNATURE */}
        {stage === 'verifying' && (
          <div style={{ padding: '36px 12px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(235, 110, 75, 0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px'
            }}>
              <RefreshCw size={28} className="spinner" style={{ color: '#EB6E4B' }} />
            </div>
            <h3 className="font-editorial" style={{ fontSize: '1.6rem', margin: '0 0 8px' }}>
              Verifying Payment Signature…
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '380px', marginInline: 'auto' }}>
              Comparing HMAC-SHA256 signature server-side using constant-time verification. Do not close this window.
            </p>
          </div>
        )}

        {/* STAGE 3: SUCCESS (VERIFIED BY BACKEND) */}
        {stage === 'success' && verifiedPayment && (
          <div style={{ textAlign: 'center', padding: '12px 0 0' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '2px solid rgba(16, 185, 129, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: '#059669'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <span style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#059669',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '4px 12px',
              borderRadius: '100px',
              display: 'inline-block',
              marginBottom: '8px'
            }}>
              Verified via HMAC-SHA256 • TEST MODE
            </span>

            <h3 className="font-editorial" style={{ fontSize: '1.9rem', margin: '0 0 6px', color: 'var(--text-primary)' }}>
              Campaign Successfully Funded!
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <strong>₹{verifiedPayment.amount_rupees.toLocaleString('en-IN')} INR</strong> allocated in sandbox to <strong>{campaign.title}</strong>.
            </p>

            {/* Receipt Summary Card */}
            <div style={{
              background: 'var(--bg-secondary, #F8FAFC)',
              border: '1px solid var(--border-light, #E2E8F0)',
              borderRadius: '16px',
              padding: '18px 20px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>
                    Razorpay Payment ID
                  </span>
                  <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {verifiedPayment.payment_id}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>
                    Order Reference ID
                  </span>
                  <strong style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {verifiedPayment.order_id}
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>
                    Amount Verified
                  </span>
                  <strong style={{ color: '#059669' }}>
                    ₹{verifiedPayment.amount_rupees.toLocaleString('en-IN')} INR
                  </strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700, display: 'block' }}>
                    Verified Timestamp
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {new Date(verifiedPayment.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </strong>
                </div>
              </div>

              <div style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.76rem',
                color: '#059669'
              }}>
                <ShieldCheck size={14} />
                <span>Cryptographic HMAC-SHA256 signature validated over order_id|payment_id</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block btn-lg"
              onClick={handleClose}
              id="funding-modal-done-btn"
            >
              Done & Return to Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
