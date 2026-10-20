// src/views/AdminLoginView.jsx
// ALLOY — Super Admin Security Authentication Portal
// Fast Passkey Access (`alloyadminmarketplace-2026`) & Live Supabase Verification

import React, { useState } from 'react';
import { Shield, KeyRound, Eye, EyeOff, ArrowRight, ArrowLeft, AlertTriangle, CheckCircle2, Sparkles, Lock } from 'lucide-react';
import { loginWithAdminPasskey, loginAsAdmin } from '../services/adminApi';

export default function AdminLoginView({ onAdminAuthenticated }) {
  const [passkey, setPasskey] = useState('alloyadminmarketplace-2026');
  const [showPasskey, setShowPasskey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Primary Passkey submission: One-key entry for Super Admin
  const handlePasskeySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!passkey.trim()) {
      setErrorMsg('Please enter the secret administrative passkey.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await loginWithAdminPasskey(passkey);
      if (result.ok && result.user) {
        setSuccessMsg('Passkey verified. Opening Super Admin Console...');
        setTimeout(() => {
          if (onAdminAuthenticated) {
            onAdminAuthenticated(result.user);
          } else {
            window.location.hash = '/admin/dashboard';
          }
        }, 300);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Passkey verification failed. Please check the secret key.');
    } finally {
      setLoading(false);
    }
  };

  // Dedicated Judge Evaluation Autofill & Sign In
  const handleAutofillJudge = async () => {
    const judgeEmail = (import.meta.env.VITE_JUDGE_EMAIL || 'judge@alloy.market').trim();
    const judgePassword = (import.meta.env.VITE_JUDGE_PASSWORD || 'JudgeAlloy2026!').trim();

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('Authenticating Judge Evaluation session...');

    try {
      const result = await loginAsAdmin(judgeEmail, judgePassword);
      if (result.ok && result.user) {
        setTimeout(() => {
          if (onAdminAuthenticated) {
            onAdminAuthenticated(result.user);
          } else {
            window.location.hash = '/admin/dashboard';
          }
        }, 300);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Judge evaluation authentication failed.');
      setSuccessMsg('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="alloy-admin-login-page">
      {/* Background Decorative Atmosphere */}
      <div className="alloy-admin-login-glow" />

      <div className="alloy-admin-login-container">
        {/* Top Return Link */}
        <div className="alloy-admin-login-header">
          <button
            type="button"
            className="alloy-admin-back-btn"
            onClick={() => { window.location.hash = ''; }}
          >
            <ArrowLeft size={16} />
            <span>Return to Marketplace</span>
          </button>
        </div>

        {/* Central Auth Card */}
        <div className="alloy-admin-login-card">
          {/* Brand & Editorial Header */}
          <div className="alloy-admin-crest-section">
            <div className="alloy-admin-brand-lockup-center">
              <img 
                src="/assets/alloy-wordmark.webp" 
                alt="Alloy" 
                className="alloy-admin-login-logo" 
              />
            </div>

            <div className="alloy-admin-env-pill">
              <span className="alloy-admin-env-dot" />
              <span>SECURE CONSOLE • MASTER PASSKEY • LIVE SUPABASE</span>
            </div>

            <h1 className="alloy-admin-login-title font-editorial">
              Administrative <span className="title-accent-vision">Access</span>
            </h1>
            <p className="alloy-admin-login-subtitle">
              Super Admin & AlloyTrust Command Portal
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="alloy-admin-alert-banner">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="alloy-admin-alert-banner" style={{ background: '#f4fbf6', borderColor: '#bbf0c8', color: '#166534' }}>
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Passkey Entry Form */}
          <form onSubmit={handlePasskeySubmit} className="alloy-admin-form">
            <div className="alloy-admin-input-group">
              <div className="alloy-admin-label-split" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="admin-passkey" style={{ fontWeight: 600 }}>Secret Passkey</label>
                <span style={{ fontSize: '11px', color: '#EB6E4B', fontWeight: 500, letterSpacing: '0.02em' }}>Instant Access</span>
              </div>
              <div className="alloy-admin-input-wrapper">
                <KeyRound size={16} className="alloy-admin-field-icon" />
                <input
                  id="admin-passkey"
                  type={showPasskey ? 'text' : 'password'}
                  required
                  placeholder="alloyadminmarketplace-2026"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  autoComplete="current-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="alloy-admin-eye-toggle"
                  onClick={() => setShowPasskey(!showPasskey)}
                  aria-label={showPasskey ? 'Hide passkey' : 'Show passkey'}
                >
                  {showPasskey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Quick-fill helper button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', marginBottom: '16px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                Passkey: <code>alloyadminmarketplace-2026</code>
              </span>
              <button
                type="button"
                onClick={() => setPasskey('alloyadminmarketplace-2026')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EB6E4B',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Autofill Key
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="alloy-admin-submit-btn"
              id="admin-submit-btn"
            >
              {loading ? (
                <span>Unlocking Super Admin Console...</span>
              ) : (
                <>
                  <span>Enter Super Admin Portal</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Judge Evaluation Access Box */}
          <div className="alloy-admin-demo-box" style={{ marginTop: '22px' }}>
            <div className="alloy-admin-demo-header">
              <Shield size={14} className="text-bronze" />
              <span>Judge Evaluation Access</span>
            </div>
            <p className="alloy-admin-demo-text">
              Judges can also authenticate directly using the dedicated, low-privilege reviewer account to evaluate the live Super Admin console against Supabase.
            </p>
            <button
              type="button"
              id="autofill-judge-btn"
              className="alloy-admin-demo-btn"
              onClick={handleAutofillJudge}
              disabled={loading}
            >
              <Sparkles size={14} />
              <span>Autofill Judge Credentials & Sign In</span>
            </button>
          </div>

          {/* Footer Notice */}
          <div className="alloy-admin-card-footer">
            <span>Passkey access is authenticated and audited directly against your Supabase backend.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
