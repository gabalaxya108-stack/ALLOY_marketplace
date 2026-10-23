// src/components/LoginModal.jsx
// ALLOY — Luxury Blended Editorial Login & Workspace Entry Modal
// Seamless integration of Google OAuth, role preselection,
// protected action notices, and 1-click evaluation demos.

import React, { useState, useEffect } from 'react';
import {
  X, Briefcase, Palette, ArrowRight, ShieldCheck,
  Mail, Lock, UserPlus, AlertCircle, Loader, Sparkles, Check,
  KeyRound, RotateCcw, Camera, AtSign, Clock, Award, Building, Globe,
  ArrowLeft, CheckCircle2, ChevronRight
} from 'lucide-react';
import {
  signIn,
  signUp,
  verifyLogin,
  resetPassword,
  registerAccount,
  signInWithGoogle,
  getBackendStatus,
  getGoogleClientId,
  setGoogleClientId
} from '../services/marketplaceBackend';

const CURATED_AVATARS = [
  { id: 'av1', label: 'Editorial', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
  { id: 'av2', label: 'Studio', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
  { id: 'av3', label: 'Minimal', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
  { id: 'av4', label: 'Cinematic', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80' }
];

const CREATOR_EXPERIENCE_OPTIONS = [
  '3+ years in AI Video & Cinema',
  '5+ years Senior Visual Director',
  '1-2 years Emerging AI Creator',
  '8+ years Veteran Director & CGI Specialist'
];

const CREATOR_SPECIALTY_OPTIONS = [
  'AI Cinematic Video & Animation',
  'Luxury Drinks & Beverage Visuals',
  'High-Fashion Synthetic Editorial',
  '3D Spatial Product Visuals',
  'Architectural & World-Building Stills'
];

const BRAND_INDUSTRY_OPTIONS = [
  'Beverages & Drinks',
  'Luxury Beauty & Skincare',
  'Fashion & Haute Couture',
  'Consumer Electronics & Spatial Tech',
  'Creative Agency & Media Studio'
];

export default function LoginModal({
  isOpen,
  onClose,
  onLoginBrand,
  onLoginCreator,
  onLoginSuccess,
  initialRole = 'brand',
  pendingActionNotice = null
}) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [signupStep, setSignupStep] = useState(1); // 1: Credentials, 2: Mandatory (*), 3: Visual (Skip)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState(initialRole || 'brand'); // 'brand' | 'creator'
  
  // Rich profile fields demanded by database
  const [handle, setHandle] = useState('');
  const [experience, setExperience] = useState('3+ years in AI Video & Cinema');
  const [specialty, setSpecialty] = useState('AI Cinematic Video & Animation');
  const [industry, setIndustry] = useState('Beverages & Drinks');
  const [productFocus, setProductFocus] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(CURATED_AVATARS[0].url);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [aesthetic, setAesthetic] = useState('Modern & Editorial');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState(''); // 'ACCOUNT_NOT_FOUND' | 'INVALID_PASSWORD' | 'ACCOUNT_EXISTS'
  const [successMsg, setSuccessMsg] = useState('');
  const [isDemoFallbackOpen, setIsDemoFallbackOpen] = useState(false);
  const [demoFallbackData, setDemoFallbackData] = useState(null);
  const [isGoogleSetupOpen, setIsGoogleSetupOpen] = useState(false);
  const [customGoogleClientId, setCustomGoogleClientId] = useState(getGoogleClientId() || '');

  // Dedicated demo credentials for evaluation
  const DEMO_CREDENTIALS = {
    brand: {
      email: 'lumina.demo@alloy.market',
      password: 'AlloyDemo2026!',
      role: 'brand',
      displayName: 'Lumina Botanica'
    },
    creator: {
      email: 'maya.demo@alloy.market',
      password: 'AlloyDemo2026!',
      role: 'creator',
      displayName: 'Maya Chen'
    }
  };

  // Synchronize initial role when modal is opened for a specific target action
  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole, isOpen]);

  if (!isOpen) return null;

  // Autofill demo credentials into form (Phase 5)
  const handleAutofillDemo = (roleKey) => {
    const creds = DEMO_CREDENTIALS[roleKey];
    if (!creds) return;
    setAuthMode('signin');
    setSelectedRole(creds.role);
    setEmail(creds.email);
    setPassword(creds.password);
    setConfirmPassword('');
    setErrorMsg('');
    setErrorCode('');
    setDemoFallbackData(null);
  };

  // Switch role handler - when in login mode, auto-populates pre-verified demo credentials for that studio
  const handleSelectRole = (roleKey) => {
    setSelectedRole(roleKey);
    if (authMode === 'signin') {
      const creds = DEMO_CREDENTIALS[roleKey];
      if (creds) {
        setEmail(creds.email);
        setPassword(creds.password);
      }
    }
  };

  // Helper to ensure every account is saved and updated directly in Supabase tables
  const saveAndAuthenticateToSupabase = async (targetEmail, targetPassword, targetRole, targetName) => {
    try {
      const res = await fetch('/api/auth/register-or-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          password: targetPassword || 'AlloyUser2026!',
          role: targetRole,
          displayName: targetName,
          source: 'login_modal'
        })
      });
      const data = await res.json();
      if (data.ok && data.userId) {
        await signIn(targetEmail, targetPassword || 'AlloyUser2026!').catch(() => {});
        return {
          id: data.userId,
          email: data.email,
          role: data.role,
          display_name: data.displayName,
          profile: {
            id: data.userId,
            email: data.email,
            role: data.role,
            display_name: data.displayName
          }
        };
      }
    } catch (apiErr) {
      console.warn('[Supabase Sync Fallback]:', apiErr.message);
    }
    return null;
  };

  // Initiates Google OAuth with preselected role
  const handleGoogleSignIn = async () => {
    if (!selectedRole || (selectedRole !== 'brand' && selectedRole !== 'creator')) {
      setErrorMsg('Please select a workspace role (Brand or Creator) before continuing.');
      return;
    }

    setErrorMsg('');
    setErrorCode('');
    setSuccessMsg('');
    setIsDemoFallbackOpen(false);
    setDemoFallbackData(null);
    setLoading(true);

    try {
      const targetRole = selectedRole;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('creasync_intended_role', targetRole);
          localStorage.setItem('creasync_intended_role', targetRole);
          localStorage.setItem('creasync_active_role', targetRole);
        } catch (e) {}
      }

      await signInWithGoogle({ role: targetRole });
      // Browser redirects to Google OAuth (accounts.google.com) to ask for Gmail
    } catch (err) {
      setLoading(false);
      if (err.code === 'google_config_required' || err.code === 'google_not_enabled') {
        setIsGoogleSetupOpen(true);
      } else {
        setErrorMsg(err.message || 'Google OAuth failed to initialize.');
      }
    }
  };

  const handleSaveGoogleClientIdAndLaunch = (e) => {
    e.preventDefault();
    if (!customGoogleClientId.trim()) {
      setErrorMsg('Please enter your Google Client ID from Google Cloud Console.');
      return;
    }
    setGoogleClientId(customGoogleClientId.trim());
    setIsGoogleSetupOpen(false);
    setErrorMsg('');
    // Immediately launch Google OAuth flow
    handleGoogleSignIn();
  };

  // 1-Click Demo Evaluation Sign In
  const handleQuickDemoEnter = (roleToEnter, customUser = null) => {
    const role = roleToEnter || selectedRole || 'brand';
    const fallbackUser = customUser || {
      id: `user-${role}-${Date.now()}`,
      email: role === 'brand' ? 'lumina.demo@alloy.market' : 'maya.demo@alloy.market',
      role,
      display_name: role === 'brand' ? 'Lumina Botanica' : 'Maya Chen',
      isDemoOnly: true,
      profile: {
        id: `user-${role}-${Date.now()}`,
        email: role === 'brand' ? 'lumina.demo@alloy.market' : 'maya.demo@alloy.market',
        role,
        display_name: role === 'brand' ? 'Lumina Botanica' : 'Maya Chen',
        isDemoOnly: true
      }
    };

    if (role === 'brand' && onLoginBrand) {
      onLoginBrand(fallbackUser);
    } else if (onLoginCreator) {
      onLoginCreator(fallbackUser);
    }
    if (onClose) onClose();
  };

  const executeRegistration = async (isSkippingVisualStep = false) => {
    setErrorMsg('');
    setErrorCode('');
    setSuccessMsg('');
    setLoading(true);

    const safeHandle = handle.trim() 
      ? (handle.trim().startsWith('@') ? handle.trim() : `@${handle.trim()}`)
      : `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

    const profileDetails = selectedRole === 'creator' ? {
      handle: safeHandle,
      experience: experience || '3+ years in AI Video & Cinema',
      specialty: specialty || 'AI Cinematic Video & Animation',
      heroWork: specialty || 'AI Cinematic Direction',
      avatar: (!isSkippingVisualStep && avatarUrl) ? avatarUrl : CURATED_AVATARS[0].url,
      bio: (!isSkippingVisualStep && bio.trim()) 
        ? bio.trim() 
        : `${displayName || 'Creator'} specializes in ${specialty || 'AI Cinematic Direction'} and generative cinema storytelling.`,
      creativeIdentity: specialty || 'AI Creative Director',
      location: (!isSkippingVisualStep && location.trim()) ? location.trim() : 'Remote / Global',
      tools: ['Midjourney', 'Runway Gen-3', 'Unreal Engine'],
      styles: ['Cinematic', 'Editorial', 'Hyperreal']
    } : {
      handle: safeHandle,
      industry: industry || 'Beverages & Drinks',
      description: (!isSkippingVisualStep && productFocus.trim()) 
        ? productFocus.trim() 
        : `${displayName || 'Brand'} private studio workspace.`,
      productFocus: productFocus || `${displayName || 'Brand'} private studio workspace.`,
      website: (!isSkippingVisualStep && website.trim()) ? website.trim() : '',
      logo: (!isSkippingVisualStep && avatarUrl) ? avatarUrl : '',
      aesthetic: (!isSkippingVisualStep && aesthetic.trim()) ? aesthetic.trim() : 'Modern & Editorial'
    };

    try {
      const result = await registerAccount(email, password, selectedRole, displayName, profileDetails);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('creasync_active_role', selectedRole);
        } catch (e) {}
      }
      setSuccessMsg('Studio account created and registered in database! Entering your fresh workspace...');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(result?.user, selectedRole);
        } else if (selectedRole === 'brand') {
          onLoginBrand(result?.user);
        } else {
          onLoginCreator(result?.user);
        }
        if (onClose) onClose();
      }, 500);
    } catch (err) {
      if (err.code === 'ACCOUNT_EXISTS' || err.message?.toLowerCase().includes('already exists')) {
        setErrorCode('ACCOUNT_EXISTS');
        setErrorMsg('An account with this email already exists in our database. Please sign in or reset your password.');
        setSignupStep(1);
      } else {
        setErrorMsg(err.message || 'Account creation failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Continue = (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setErrorMsg('');
    if (!handle) {
      const suggested = `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
      setHandle(suggested);
    }
    if (!displayName) {
      const suggestedName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      setDisplayName(suggestedName);
    }
    setSignupStep(2);
  };

  const handleStep2Continue = (e) => {
    if (e) e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg(selectedRole === 'creator' ? 'Please provide your Full Name / Studio Name (* required).' : 'Please provide your Brand or Company Name (* required).');
      return;
    }
    if (!handle.trim()) {
      setErrorMsg('Please provide a unique handle (* required).');
      return;
    }
    if (selectedRole === 'creator') {
      if (!experience.trim()) {
        setErrorMsg('Please select or specify your professional experience / age (* required).');
        return;
      }
      if (!specialty.trim()) {
        setErrorMsg('Please select or specify your primary creative work / specialty (* required).');
        return;
      }
    } else {
      if (!industry.trim()) {
        setErrorMsg('Please specify your industry sector (* required).');
        return;
      }
      if (!productFocus.trim()) {
        setErrorMsg('Please specify your primary work or product focus (* required).');
        return;
      }
    }
    setErrorMsg('');
    setSignupStep(3);
  };

  // Credentials submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorCode('');
    setSuccessMsg('');
    setIsDemoFallbackOpen(false);
    setDemoFallbackData(null);

    if (authMode === 'signup') {
      if (signupStep === 1) {
        return handleStep1Continue(e);
      }
      if (signupStep === 2) {
        return handleStep2Continue(e);
      }
      return executeRegistration(false);
    } else if (authMode === 'forgot') {
      // Direct hassle-free password reset
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please re-enter your new password.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setErrorMsg('New password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      try {
        await resetPassword(email, password);
        setSuccessMsg('Password updated successfully in database! Signing you into your workspace...');
        // Immediate login with newly configured password
        const loginRes = await verifyLogin(email, password, selectedRole).catch(() => null);
        const verifiedUser = loginRes?.user || {
          id: `usr-${email.replace(/[^a-zA-Z0-9]/g, '-')}`,
          email,
          role: selectedRole,
          display_name: displayName || email.split('@')[0],
          profile: {
            id: `usr-${email.replace(/[^a-zA-Z0-9]/g, '-')}`,
            email,
            role: selectedRole,
            display_name: displayName || email.split('@')[0]
          }
        };
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(verifiedUser, selectedRole);
          } else if (selectedRole === 'brand') {
            onLoginBrand(verifiedUser);
          } else {
            onLoginCreator(verifiedUser);
          }
          if (onClose) onClose();
        }, 600);
      } catch (err) {
        if (err.code === 'ACCOUNT_NOT_FOUND' || err.message?.toLowerCase().includes('not found')) {
          setErrorCode('ACCOUNT_NOT_FOUND');
          setErrorMsg('No account found with this email in our database. Please create an account first.');
        } else {
          setErrorMsg(err.message || 'Failed to update password.');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Login mode: Strict database check! NO auto-admit!
      try {
        const result = await signIn(email, password);
        const role = result?.user?.profile?.role || selectedRole;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('creasync_active_role', role);
          } catch (e) {}
        }
        setSuccessMsg('Authenticated against database! Entering workspace...');
        setTimeout(() => {
          if (onLoginSuccess) {
            onLoginSuccess(result?.user, role);
          } else if (role === 'brand') {
            onLoginBrand(result?.user);
          } else {
            onLoginCreator(result?.user);
          }
          if (onClose) onClose();
        }, 400);
      } catch (err) {
        if (err.code === 'ACCOUNT_NOT_FOUND' || err.message?.toLowerCase().includes('not found')) {
          setErrorCode('ACCOUNT_NOT_FOUND');
          setErrorMsg('Account not found in our database. Please create an account first to get started.');
        } else if (err.code === 'INVALID_PASSWORD' || err.message?.toLowerCase().includes('incorrect password') || err.message?.toLowerCase().includes('invalid login credentials')) {
          setErrorCode('INVALID_PASSWORD');
          setErrorMsg('Incorrect password for this account. Please try again or reset your password.');
        } else {
          setErrorCode('AUTH_ERROR');
          setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="alloy-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="alloy-login-card-editorial" onClick={(e) => e.stopPropagation()}>

        {/* Floating Close Button */}
        <button
          type="button"
          className="alloy-modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* ========================================================
            COLUMN 1: High-Contrast, Elegant Auth Form (Compact Single Page)
            ======================================================== */}
        <div className="alloy-login-form-col">

          {/* Brand Wordmark & Eyebrow Row */}
          <div className="alloy-login-brand-header">
            <div className="alloy-login-brand-row">
              <img
                src="/assets/alloy-wordmark.webp"
                alt="Alloy"
                className="alloy-login-logo-img"
              />
              <div className="alloy-login-pill">
                <Sparkles size={10} className="pill-star" />
                <span>
                  {authMode === 'signup'
                    ? 'FRESH START WORKSPACE'
                    : authMode === 'forgot'
                    ? 'CREDENTIAL UPDATE'
                    : 'WORKSPACE ENTRY'}
                </span>
              </div>
            </div>

            <h2 id="login-modal-title" className="alloy-login-headline font-editorial">
              {authMode === 'signup'
                ? (signupStep === 1
                    ? 'Create Your Studio Account'
                    : signupStep === 2
                    ? `${selectedRole === 'creator' ? 'Creator' : 'Brand'} Studio Essentials`
                    : 'Visuals & Creative Bio')
                : authMode === 'forgot'
                ? 'Reset Account Password'
                : 'Login to Alloy'}
            </h2>
          </div>

          {/* Progressive Studio Onboarding Step Indicator */}
          {authMode === 'signup' && (
            <div className="auth-step-track">
              <div className="auth-step-dot-group">
                <div className={`auth-step-dot ${signupStep === 1 ? 'is-active' : (signupStep > 1 ? 'is-done' : '')}`}>
                  {signupStep > 1 ? '✓' : '1'}
                </div>
                <span className="auth-step-label">Account</span>
              </div>
              <ChevronRight size={12} style={{ color: '#A09689' }} />
              <div className="auth-step-dot-group">
                <div className={`auth-step-dot ${signupStep === 2 ? 'is-active' : (signupStep > 2 ? 'is-done' : '')}`}>
                  {signupStep > 2 ? '✓' : '2'}
                </div>
                <span className="auth-step-label">Studio *</span>
              </div>
              <ChevronRight size={12} style={{ color: '#A09689' }} />
              <div className="auth-step-dot-group">
                <div className={`auth-step-dot ${signupStep === 3 ? 'is-active' : ''}`}>
                  3
                </div>
                <span className="auth-step-label">Visuals (Skip)</span>
              </div>
            </div>
          )}

          {/* Pending Action Callout Notice (if triggered by a protected action) */}
          {pendingActionNotice && (
            <div className="alloy-pending-notice">
              <ShieldCheck size={13} className="notice-icon" />
              <span>{pendingActionNotice}</span>
            </div>
          )}

          {/* PRIMARY FIRST SECTION: Google OAuth 2.0 Direct Sign In (Hidden in forgot password or step 2/3) */}
          {authMode !== 'forgot' && !(authMode === 'signup' && signupStep > 1) && (
            <div className="alloy-google-hero-section mb-2">
              {/* Role Preselection / Selector (Inline) */}
              <div className="auth-role-select-group mb-3">
                <label className="text-[11px] uppercase font-mono text-zinc-400 block mb-1.5">1. Select Your Workspace</label>
                <div className="auth-role-picker">
                  <button
                    type="button"
                    className={`role-pill-btn ${selectedRole === 'brand' ? 'is-selected' : ''}`}
                    onClick={() => handleSelectRole('brand')}
                  >
                    <Briefcase size={13} />
                    <span>Brand Studio</span>
                    {selectedRole === 'brand' && <Check size={11} className="role-check" />}
                  </button>

                  <button
                    type="button"
                    className={`role-pill-btn ${selectedRole === 'creator' ? 'is-selected' : ''}`}
                    onClick={() => handleSelectRole('creator')}
                  >
                    <Palette size={13} />
                    <span>Creator Studio</span>
                    {selectedRole === 'creator' && <Check size={11} className="role-check" />}
                  </button>
                </div>
              </div>

              {/* Google OAuth Action Button */}
              <button
                type="button"
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="btn-google-oauth w-full shadow-lg"
                title="Authenticate with your verified Google / Gmail account"
              >
                {loading ? (
                  <Loader size={16} className="auth-spinner" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span className="font-semibold text-sm">
                  {loading
                    ? 'Connecting to Google...'
                    : authMode === 'signup'
                      ? `Sign up with Google as ${selectedRole === 'brand' ? 'Brand' : 'Creator'}`
                      : `Continue with Google as ${selectedRole === 'brand' ? 'Brand' : 'Creator'}`}
                </span>
              </button>

              {/* Google Cloud Console Setup Prompt if credentials needed */}
              {isGoogleSetupOpen && (
                <div className="alloy-google-setup-card mt-3 p-3.5 bg-zinc-900 border border-amber-500/40 rounded-lg text-left">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs">
                      <Sparkles size={14} />
                      <span>Google Cloud Console Client ID</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGoogleSetupOpen(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-300 mb-2 leading-relaxed">
                    Enter your Web Client ID from Google Cloud Console to prompt account selection:
                  </p>
                  <div className="bg-black/60 p-2 rounded text-[10px] font-mono text-zinc-400 mb-2 space-y-0.5">
                    <div>Redirect URI: <span className="text-amber-300">http://localhost:5173</span></div>
                  </div>
                  <form onSubmit={handleSaveGoogleClientIdAndLaunch} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                      value={customGoogleClientId}
                      onChange={(e) => setCustomGoogleClientId(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs rounded whitespace-nowrap"
                    >
                      Launch Google
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Form Divider / Mode Guidance */}
          {!(authMode === 'signup' && signupStep > 1) && (
            <div className="alloy-auth-divider my-3">
              <span>
                {authMode === 'forgot'
                  ? 'Direct Password Update'
                  : 'Or Sign In with Email & Password'}
              </span>
            </div>
          )}

          {/* Mode Switcher: Login vs Create Account vs Forgot Password Loop */}
          {!(authMode === 'signup' && signupStep > 1) && (
            <div className="alloy-auth-toggle-bar">
              {authMode === 'forgot' ? (
                <button
                  type="button"
                  className="auth-toggle-tab is-active w-full text-center"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMsg('');
                    setErrorCode('');
                    setConfirmPassword('');
                  }}
                >
                  ← Back to Login
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`auth-toggle-tab ${authMode === 'signin' ? 'is-active' : ''}`}
                    onClick={() => {
                      setAuthMode('signin');
                      setErrorMsg('');
                      setErrorCode('');
                      setIsDemoFallbackOpen(false);
                      const creds = DEMO_CREDENTIALS[selectedRole];
                      if (creds) {
                        setEmail(creds.email);
                        setPassword(creds.password);
                      }
                    }}
                    id="auth-tab-signin"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className={`auth-toggle-tab ${authMode === 'signup' ? 'is-active' : ''}`}
                    onClick={() => {
                      setAuthMode('signup');
                      setSignupStep(1);
                      setErrorMsg('');
                      setErrorCode('');
                      setIsDemoFallbackOpen(false);
                    }}
                    id="auth-tab-signup"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 2 & 3 Editorial Helper Guidance */}
          {authMode === 'signup' && signupStep === 2 && (
            <div style={{ fontSize: '0.74rem', color: '#685F53', marginBottom: '10px', textAlign: 'left', lineHeight: 1.45, background: '#FAF7F2', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E8DFD3' }}>
              Starred fields (<span className="auth-req-star">*</span>) are required to create your verified database profile.
            </div>
          )}

          {authMode === 'signup' && signupStep === 3 && (
            <div style={{ fontSize: '0.74rem', color: '#685F53', marginBottom: '10px', textAlign: 'left', lineHeight: 1.45, background: '#FAF7F2', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E8DFD3' }}>
              Personalize your visual identity now, or tap <strong>Skip for now</strong> to launch immediately with luxury presets.
            </div>
          )}

          {/* Error / Success Messages with Action Loops */}
          {errorMsg && (
            <div className="auth-alert alert-error" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{errorMsg}</span>
                <button type="button" onClick={() => { setErrorMsg(''); setErrorCode(''); }} className="alert-close-btn">
                  <X size={12} />
                </button>
              </div>

              {/* Action Buttons for smooth looping */}
              {errorCode === 'ACCOUNT_NOT_FOUND' && (
                <button
                  type="button"
                  className="auth-alert-action-btn"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMsg('');
                    setErrorCode('');
                  }}
                >
                  <UserPlus size={12} />
                  <span>Create Account (Fresh Start) →</span>
                </button>
              )}

              {errorCode === 'INVALID_PASSWORD' && (
                <button
                  type="button"
                  className="auth-alert-action-btn"
                  onClick={() => {
                    setAuthMode('forgot');
                    setErrorMsg('');
                    setErrorCode('');
                    setConfirmPassword('');
                  }}
                >
                  <KeyRound size={12} />
                  <span>Forgot / Change Password →</span>
                </button>
              )}

              {errorCode === 'ACCOUNT_EXISTS' && (
                <button
                  type="button"
                  className="auth-alert-action-btn"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMsg('');
                    setErrorCode('');
                  }}
                >
                  <ArrowRight size={12} />
                  <span>Sign In with Existing Account →</span>
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="auth-alert alert-success">
              <ShieldCheck size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Honest Demo Mode Fallback Card (Phase 6) */}
          {demoFallbackData && (
            <div className="demo-oauth-notice-banner" style={{ marginTop: '4px', marginBottom: '10px' }}>
              <div className="notice-banner-text">
                <p style={{ fontWeight: 600, color: '#3A2E1F' }}>
                  Explore as {demoFallbackData.displayName}
                </p>
                <span style={{ fontSize: '0.68rem', color: '#6E5C46', display: 'block', marginTop: '2px' }}>
                  Restricted demo session — full access to brand & creator workflows without waiting.
                </span>
              </div>
              <button
                type="button"
                className="btn-demo-quick-action"
                onClick={() => handleQuickDemoEnter(demoFallbackData.role, {
                  id: `demo-${demoFallbackData.role}-${Date.now()}`,
                  email: demoFallbackData.email || `${demoFallbackData.role}@demo.alloy`,
                  role: demoFallbackData.role,
                  display_name: demoFallbackData.displayName,
                  isDemoOnly: true,
                  profile: {
                    id: `demo-${demoFallbackData.role}-${Date.now()}`,
                    email: demoFallbackData.email || `${demoFallbackData.role}@demo.alloy`,
                    role: demoFallbackData.role,
                    display_name: demoFallbackData.displayName,
                    isDemoOnly: true
                  }
                })}
              >
                <span>Continue in Demo Mode →</span>
              </button>
            </div>
          )}

          {/* Credentials & Progressive Studio Setup Form */}
          <form onSubmit={handleSubmit} className="alloy-auth-form">
            {/* SIGNUP STEP 1: Account Credentials */}
            {authMode === 'signup' && signupStep === 1 && (
              <>
                <div className="auth-field-row">
                  <div className="auth-field-header">
                    <label htmlFor="auth-email" className="auth-field-title">
                      Work Email <span className="auth-req-star">*</span>
                    </label>
                  </div>
                  <div className="auth-input-container">
                    <Mail size={14} className="auth-input-icon" />
                    <input
                      id="auth-email"
                      type="email"
                      className="auth-text-input"
                      placeholder="e.g. director@studio.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="auth-field-row">
                  <div className="auth-field-header">
                    <label htmlFor="auth-password" className="auth-field-title">
                      Studio Password <span className="auth-req-star">*</span>
                    </label>
                  </div>
                  <div className="auth-input-container">
                    <Lock size={14} className="auth-input-icon" />
                    <input
                      id="auth-password"
                      type="password"
                      className="auth-text-input"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" id="btn-step1-continue">
                  <span>Continue to Studio Setup</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}

            {/* SIGNUP STEP 2: Mandatory Core Studio & Creator Details */}
            {authMode === 'signup' && signupStep === 2 && (
              <>
                <div className="auth-field-row">
                  <div className="auth-field-header">
                    <label htmlFor="auth-name" className="auth-field-title">
                      {selectedRole === 'creator' ? 'Full Name / Studio Name' : 'Brand / Company Name'} <span className="auth-req-star">*</span>
                    </label>
                  </div>
                  <div className="auth-input-container">
                    <UserPlus size={14} className="auth-input-icon" />
                    <input
                      id="auth-name"
                      type="text"
                      className="auth-text-input"
                      placeholder={selectedRole === 'creator' ? "e.g. Elena Rostova / Lumina Studio" : "e.g. Lumina Botanica"}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="auth-field-row">
                  <div className="auth-field-header">
                    <label htmlFor="auth-handle" className="auth-field-title">
                      Unique Studio Handle <span className="auth-req-star">*</span>
                    </label>
                  </div>
                  <div className="auth-input-container">
                    <AtSign size={14} className="auth-input-icon" />
                    <input
                      id="auth-handle"
                      type="text"
                      className="auth-text-input"
                      placeholder="@handle"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {selectedRole === 'creator' ? (
                  <>
                    <div className="auth-field-row">
                      <div className="auth-field-header">
                        <label htmlFor="auth-experience" className="auth-field-title">
                          Experience & Professional Age <span className="auth-req-star">*</span>
                        </label>
                      </div>
                      <div className="auth-input-container">
                        <Clock size={14} className="auth-input-icon" />
                        <input
                          id="auth-experience"
                          type="text"
                          className="auth-text-input"
                          placeholder="e.g. 3+ years in AI Video & Cinema"
                          value={experience}
                          onChange={(e) => setExperience(e.target.value)}
                          required
                        />
                      </div>
                      <div className="auth-chips-grid">
                        {CREATOR_EXPERIENCE_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`auth-chip-btn ${experience === opt ? 'is-active' : ''}`}
                            onClick={() => setExperience(opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="auth-field-row">
                      <div className="auth-field-header">
                        <label htmlFor="auth-specialty" className="auth-field-title">
                          Primary Work / Specialty <span className="auth-req-star">*</span>
                        </label>
                      </div>
                      <div className="auth-input-container">
                        <Award size={14} className="auth-input-icon" />
                        <input
                          id="auth-specialty"
                          type="text"
                          className="auth-text-input"
                          placeholder="e.g. AI Cinematic Video & Animation"
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          required
                        />
                      </div>
                      <div className="auth-chips-grid">
                        {CREATOR_SPECIALTY_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`auth-chip-btn ${specialty === opt ? 'is-active' : ''}`}
                            onClick={() => setSpecialty(opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="auth-field-row">
                      <div className="auth-field-header">
                        <label htmlFor="auth-industry" className="auth-field-title">
                          Industry Sector <span className="auth-req-star">*</span>
                        </label>
                      </div>
                      <div className="auth-input-container">
                        <Building size={14} className="auth-input-icon" />
                        <input
                          id="auth-industry"
                          type="text"
                          className="auth-text-input"
                          placeholder="e.g. Beverages & Drinks"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          required
                        />
                      </div>
                      <div className="auth-chips-grid">
                        {BRAND_INDUSTRY_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`auth-chip-btn ${industry === opt ? 'is-active' : ''}`}
                            onClick={() => setIndustry(opt)}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="auth-field-row">
                      <div className="auth-field-header">
                        <label htmlFor="auth-product-focus" className="auth-field-title">
                          Primary Work / Product Focus <span className="auth-req-star">*</span>
                        </label>
                      </div>
                      <div className="auth-input-container">
                        <Briefcase size={14} className="auth-input-icon" />
                        <input
                          id="auth-product-focus"
                          type="text"
                          className="auth-text-input"
                          placeholder="e.g. Functional sparkling botanicals & restorative elixirs"
                          value={productFocus}
                          onChange={(e) => setProductFocus(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="auth-nav-action-row">
                  <button
                    type="button"
                    className="auth-nav-back-btn"
                    onClick={() => setSignupStep(1)}
                  >
                    <ArrowLeft size={13} />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    id="btn-step2-continue"
                  >
                    <span>Continue to Visuals</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}

            {/* SIGNUP STEP 3: Instagram-Style Skippable Visual Profile & Bio */}
            {authMode === 'signup' && signupStep === 3 && (
              <>
                <div className="auth-field-row">
                  <div className="auth-field-header">
                    <label className="auth-field-title">
                      {selectedRole === 'creator' ? 'Profile Avatar' : 'Brand Logo'}
                    </label>
                    <span className="auth-opt-badge">Optional (Skippable)</span>
                  </div>
                  <div className="auth-avatar-section">
                    <img
                      src={avatarUrl || (selectedRole === 'creator' ? CURATED_AVATARS[0].url : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80')}
                      alt="Avatar preview"
                      className="auth-avatar-preview"
                      onError={(e) => { e.target.src = CURATED_AVATARS[0].url; }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.68rem', color: '#736B5E', marginBottom: '4px' }}>
                        Tap preset or paste direct URL:
                      </div>
                      <div className="auth-avatar-presets">
                        {CURATED_AVATARS.map((av) => (
                          <img
                            key={av.id}
                            src={av.url}
                            alt={av.label}
                            title={av.label}
                            className={`auth-preset-thumb ${avatarUrl === av.url ? 'is-selected' : ''}`}
                            onClick={() => setAvatarUrl(av.url)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="auth-input-container">
                    <Camera size={14} className="auth-input-icon" />
                    <input
                      type="url"
                      className="auth-text-input"
                      placeholder="Paste image URL (optional)"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="auth-field-row">
                  <div className="auth-field-header">
                    <label htmlFor="auth-bio" className="auth-field-title">
                      {selectedRole === 'creator' ? 'Studio Bio / Philosophy' : 'Brand Summary / Vision'}
                    </label>
                    <span className="auth-opt-badge">Optional (Skippable)</span>
                  </div>
                  <textarea
                    id="auth-bio"
                    className="auth-textarea"
                    rows={2}
                    placeholder={selectedRole === 'creator'
                      ? "e.g. Exploring sensory realism, synthetic cinematography, and luxury brand narratives..."
                      : "e.g. Crafted botanicals redefining modern luxury hydration through conscious alchemy..."}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>

                <div className="auth-field-row">
                  <div className="auth-field-header">
                    <label htmlFor="auth-location" className="auth-field-title">
                      Location / Studio Base
                    </label>
                    <span className="auth-opt-badge">Optional (Skippable)</span>
                  </div>
                  <div className="auth-input-container">
                    <Globe size={14} className="auth-input-icon" />
                    <input
                      id="auth-location"
                      type="text"
                      className="auth-text-input"
                      placeholder="e.g. Tokyo & London (or Remote)"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                {selectedRole === 'brand' && (
                  <>
                    <div className="auth-field-row">
                      <div className="auth-field-header">
                        <label htmlFor="auth-website" className="auth-field-title">Official Website</label>
                        <span className="auth-opt-badge">Optional</span>
                      </div>
                      <div className="auth-input-container">
                        <Globe size={14} className="auth-input-icon" />
                        <input
                          id="auth-website"
                          type="url"
                          className="auth-text-input"
                          placeholder="https://yourbrand.com"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="auth-field-row">
                      <div className="auth-field-header">
                        <label htmlFor="auth-aesthetic" className="auth-field-title">Brand Aesthetic</label>
                        <span className="auth-opt-badge">Optional</span>
                      </div>
                      <div className="auth-input-container">
                        <Sparkles size={14} className="auth-input-icon" />
                        <input
                          id="auth-aesthetic"
                          type="text"
                          className="auth-text-input"
                          placeholder="e.g. Modern Minimalist Luxury"
                          value={aesthetic}
                          onChange={(e) => setAesthetic(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="auth-nav-action-row">
                  <button
                    type="button"
                    className="auth-skip-btn"
                    onClick={() => executeRegistration(true)}
                    disabled={loading}
                    id="auth-skip-step3-btn"
                    title="Skip optional visuals and launch immediately with luxury curated presets"
                  >
                    <span>Skip for now →</span>
                  </button>
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={loading}
                    id="auth-complete-step3-btn"
                  >
                    {loading ? (
                      <>
                        <Loader size={14} className="auth-spinner" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete & Launch</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>

                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="auth-back-link"
                    onClick={() => setSignupStep(2)}
                  >
                    <ArrowLeft size={12} />
                    <span>Back to Studio Essentials</span>
                  </button>
                </div>
              </>
            )}

            {/* SIGNIN & FORGOT PASSWORD MODES */}
            {authMode !== 'signup' && (
              <>
                <div className="auth-input-container">
                  <Mail size={14} className="auth-input-icon" />
                  <input
                    id="auth-email"
                    type="email"
                    className="auth-text-input"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="auth-input-container">
                  <Lock size={14} className="auth-input-icon" />
                  <input
                    id="auth-password"
                    type="password"
                    className="auth-text-input"
                    placeholder={authMode === 'forgot' ? "New Password (min. 6 characters)" : "Password (min. 6 characters)"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                {authMode === 'forgot' && (
                  <div className="auth-input-container">
                    <KeyRound size={14} className="auth-input-icon" />
                    <input
                      id="auth-confirm-password"
                      type="password"
                      className="auth-text-input"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                )}

                {/* Forgot Password Link in Signin Mode */}
                {authMode === 'signin' && (
                  <div className="auth-forgot-row">
                    <span className="auth-db-verified-badge">DB-VERIFIED SECURE ACCESS</span>
                    <button
                      type="button"
                      className="auth-forgot-btn"
                      onClick={() => {
                        setAuthMode('forgot');
                        setErrorMsg('');
                        setErrorCode('');
                        setConfirmPassword('');
                      }}
                      id="btn-forgot-password-link"
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <button type="submit" className="auth-submit-btn" disabled={loading} id="auth-submit-btn">
                  {loading ? (
                    <>
                      <Loader size={14} className="auth-spinner" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {authMode === 'forgot'
                          ? 'Update Password & Enter Workspace'
                          : `Login to ${selectedRole === 'brand' ? 'Brand Studio' : 'Creator Studio'}`}
                      </span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </>
            )}
          </form>

          {/* 1-Click Evaluation Demo Autofill Bar (Only shown on Signin or Step 1) */}
          {!(authMode === 'signup' && signupStep > 1) && (
            <div className="alloy-demo-bar">
              <span className="demo-bar-label">Autofill Demo:</span>
              <div className="demo-bar-actions">
                <button
                  type="button"
                  className={`demo-pill-btn brand-demo ${selectedRole === 'brand' && email === DEMO_CREDENTIALS.brand.email ? 'is-active-demo' : ''}`}
                  id="demo-login-brand-btn"
                  onClick={() => handleAutofillDemo('brand')}
                  title="Autofill Lumina Botanica credentials"
                >
                  <Briefcase size={12} />
                  <span>Lumina Botanica</span>
                </button>

                <button
                  type="button"
                  className={`demo-pill-btn creator-demo ${selectedRole === 'creator' && email === DEMO_CREDENTIALS.creator.email ? 'is-active-demo' : ''}`}
                  id="demo-login-creator-btn"
                  onClick={() => handleAutofillDemo('creator')}
                  title="Autofill Maya Chen credentials"
                >
                  <Palette size={12} />
                  <span>Maya Chen</span>
                </button>
              </div>
            </div>
          )}

          {/* Direct Demo Entry Link (Phase 7 Option B: Explore without credentials) */}
          {!(authMode === 'signup' && signupStep > 1) && (
            <div style={{ textAlign: 'center', marginTop: '6px' }}>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8F8880',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '2px 6px',
                  fontFamily: 'inherit'
                }}
                onClick={() => handleQuickDemoEnter(selectedRole)}
                id="btn-explore-as-demo-direct"
              >
                Or explore Alloy instantly as demo {selectedRole === 'brand' ? 'Brand' : 'Creator'} →
              </button>
            </div>
          )}

          {/* Footer Security Badge */}
          <div className="alloy-auth-footer-badge">
            <ShieldCheck size={12} className="badge-shield-icon" />
            <span>Isolated multi-tenant workspace security</span>
          </div>

        </div>

        {/* ========================================================
            COLUMN 2: Seamlessly Blended Visual Showcase
            ======================================================== */}
        <div className="alloy-login-visual-col">
          <div className="visual-blended-frame">
            <div className="visual-sculpture-wrapper">
              <img
                src="/assets/alloy-emblem-transparent.png"
                alt="Alloy Intertwined Creative Sculpture"
                className="blended-sculpture-img"
              />
            </div>

            {/* Soft Ambient Blend Overlay */}
            <div className="visual-ambient-overlay" aria-hidden="true" />

            {/* Elegant Editorial Quote Badge */}
            <div className="visual-quote-badge">
              <span className="quote-eyebrow">THE ALLOY CONCEPT</span>
              <p className="quote-text font-editorial">
                “Creativity and technology intertwined to connect visionary brands with world-class AI creators.”
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
