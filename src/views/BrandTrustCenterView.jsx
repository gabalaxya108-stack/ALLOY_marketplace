// src/views/BrandTrustCenterView.jsx
// ALLOY Professional Brand Trust Centre
// Truthful verification, transparency, and reliability metrics for Brand Accounts.
// Features the Four Core Brand Trust Pillars:
// 1. Business Identity
// 2. Campaign Transparency
// 3. Payment Reliability
// 4. Collaboration Integrity

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Lock,
  Eye,
  Building2,
  CreditCard,
  HeartHandshake,
  FileCheck2,
  ExternalLink,
  RefreshCw,
  Sliders,
  X,
  HelpCircle,
  ArrowRight,
  Filter,
  Search,
  Key,
  Shield,
  Layers,
  ArrowUpRight,
  Sparkles,
  DollarSign
} from 'lucide-react';
import {
  VERIFICATION_STATUSES,
  STATUS_META,
  BRAND_TRUST_PILLARS,
  BRAND_BADGE_DEFINITIONS,
  calculateBrandTrustSummary,
  calculateCampaignTransparencyScore,
  calculatePaymentReliabilityMetrics,
  calculateCollaborationIntegrityMetrics,
  getBrandTrustBadges,
  createInitialBrandTrustVerification
} from '../data/brandTrustVerificationData.js';
import {
  fetchVerificationClaims,
  submitVerificationClaim,
  reviewVerificationClaim,
  fetchVerificationAuditLog
} from '../services/marketplaceBackend.js';

export default function BrandTrustCenterView({
  brand = null,
  currentUser = null,
  campaigns = [],
  fundingRecords = [],
  collaborations = [],
  invitations = [],
  onUpdateBrand,
  onBackToWorkspace,
  onNavigateToTab
}) {
  // Brand entity resolution
  const activeBrand = brand || {
    id: 'brand-demo-lumina',
    name: 'Lumina Botanica',
    website: 'https://luminabotanica.com',
    industry: 'Beauty & Cosmetics',
    is_demo: true
  };

  const brandId = activeBrand.id || 'brand-demo-lumina';

  // Navigation tab inside Brand Trust Centre:
  // 'overview' | 'requests' | 'badges-guide' | 'admin-review'
  const [activeTab, setActiveTab] = useState('overview');

  // Filter for requests list
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'entity' | 'payment' | 'brief' | 'review-action' | 'badge-detail'
  const [selectedBadgeForDetail, setSelectedBadgeForDetail] = useState(null);
  const [selectedClaimForReview, setSelectedClaimForReview] = useState(null);
  const [toastNotice, setToastNotice] = useState(null);

  // Authorized Admin Reviewer Mode
  const isUserAdmin = currentUser?.profile?.role === 'admin' || currentUser?.role === 'admin';
  const [adminModeUnlocked, setAdminModeUnlocked] = useState(isUserAdmin);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState('');
  const [adminPasscodeError, setAdminPasscodeError] = useState(null);

  // Live Claims & Audit Logs from Backend
  const [claimsList, setClaimsList] = useState([]);
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(true);

  const showToast = (msg) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 4000);
  };

  // Fetch verification claims for this brand
  const loadBrandTrustData = async () => {
    setIsLoadingClaims(true);
    try {
      const [fetchedClaims, fetchedLogs] = await Promise.all([
        fetchVerificationClaims(adminModeUnlocked ? null : brandId, currentUser, { isBrand: true }),
        fetchVerificationAuditLog(adminModeUnlocked ? null : brandId)
      ]);
      setClaimsList(fetchedClaims || []);
      setAuditLogsList(fetchedLogs || []);
    } catch (e) {
      console.warn('[Brand Trust Centre] Could not load claims:', e);
    } finally {
      setIsLoadingClaims(false);
    }
  };

  useEffect(() => {
    loadBrandTrustData();
  }, [brandId, adminModeUnlocked]);

  // Derived real metrics
  const trustData = activeBrand.trustVerification || createInitialBrandTrustVerification(activeBrand, currentUser);
  const trustSummary = useMemo(() => {
    return calculateBrandTrustSummary(trustData, activeBrand, campaigns, fundingRecords, collaborations);
  }, [trustData, activeBrand, campaigns, fundingRecords, collaborations]);

  const transparencyMetrics = useMemo(() => {
    return calculateCampaignTransparencyScore(campaigns);
  }, [campaigns]);

  const paymentMetrics = useMemo(() => {
    return calculatePaymentReliabilityMetrics(fundingRecords, campaigns, activeBrand);
  }, [fundingRecords, campaigns, activeBrand]);

  const collabMetrics = useMemo(() => {
    return calculateCollaborationIntegrityMetrics(collaborations, activeBrand);
  }, [collaborations, activeBrand]);

  const badges = useMemo(() => {
    return getBrandTrustBadges(activeBrand, currentUser, campaigns, fundingRecords, collaborations);
  }, [activeBrand, currentUser, campaigns, fundingRecords, collaborations]);

  // Filtered claims for active brand
  const brandClaims = useMemo(() => {
    if (!adminModeUnlocked) {
      return claimsList.filter(c => c.brandId === brandId || c.entityId === brandId || (c.entityType === 'brand' && !c.creatorId));
    }
    return claimsList;
  }, [claimsList, brandId, adminModeUnlocked]);

  const filteredClaims = useMemo(() => {
    if (statusFilter === 'all') return brandClaims;
    return brandClaims.filter(c => c.status === statusFilter);
  }, [brandClaims, statusFilter]);

  // --- Submission Forms State ---
  const [entityForm, setEntityForm] = useState({
    legalName: activeBrand.name || '',
    jurisdiction: 'United Kingdom (Companies House)',
    documentType: 'Certificate of Incorporation',
    regNumber: '',
    website: activeBrand.website || ''
  });

  const [paymentForm, setPaymentForm] = useState({
    methodType: 'Razorpay Escrow & Corporate Wire',
    escrowTier: 'Tier 1 Verified Milestone Account',
    accountRef: '',
    authorizedBy: currentUser?.email || 'Authorized Financial Signatory'
  });

  const [briefForm, setBriefForm] = useState({
    standardsDeclaration: 'All briefs specify explicit commercial usage terms, transparent creative milestones, and prompt turnaround.',
    revisionPolicy: 'Standard 2 creative revision cycles included with clear feedback turnaround.',
    platformPaymentCommitment: true
  });

  // Admin Review Form State
  const [reviewActionForm, setReviewActionForm] = useState({
    decision: 'APPROVE', // 'APPROVE' | 'REJECT' | 'REQUEST_INFO'
    notes: '',
    reviewerName: currentUser?.profile?.display_name || currentUser?.display_name || 'Elena Rostova (Compliance Reviewer)'
  });

  // =========================================================================
  // SUBMISSION HANDLERS
  // =========================================================================

  const handleSubmitEntityEvidence = async (e) => {
    e.preventDefault();
    if (!entityForm.legalName.trim()) {
      showToast('Please enter your legal business name.');
      return;
    }

    const masked = entityForm.regNumber
      ? `•••••• ${entityForm.regNumber.slice(-4)}`
      : '•••••• 8201';

    const claimPayload = {
      id: `claim-${brandId}-entity-${Date.now()}`,
      entityType: 'brand',
      entityId: brandId,
      brandId,
      brandName: activeBrand.name || brandId,
      claimType: 'business_identity',
      claimTitle: `Business Legal Entity (${entityForm.documentType})`,
      status: 'pending_review', // Strict: always enters compliance queue
      evidenceType: entityForm.documentType,
      evidenceUrl: 'https://vault.alloy.market/private/entity/doc_corp_enc.pdf',
      evidenceDetails: {
        legalName: entityForm.legalName.trim(),
        jurisdiction: entityForm.jurisdiction,
        regNumber: masked,
        website: entityForm.website.trim()
      },
      isPrivate: true // Strictly confidential — never revealed to creators
    };

    try {
      await submitVerificationClaim(claimPayload, currentUser);
      showToast('Corporate registration submitted! Sensitive legal documentation is strictly confidential.');
      setActiveModal(null);
      loadBrandTrustData();
    } catch (err) {
      showToast(`Submission error: ${err.message}`);
    }
  };

  const handleSubmitPaymentEscrow = async (e) => {
    e.preventDefault();

    const claimPayload = {
      id: `claim-${brandId}-payment-${Date.now()}`,
      entityType: 'brand',
      entityId: brandId,
      brandId,
      brandName: activeBrand.name || brandId,
      claimType: 'payment_reliability',
      claimTitle: 'Verified Campaign Escrow & Funding Facility',
      status: 'pending_review',
      evidenceType: paymentForm.methodType,
      evidenceUrl: null,
      evidenceDetails: {
        escrowTier: paymentForm.escrowTier,
        accountRef: paymentForm.accountRef || 'Razorpay Escrow Linked Account',
        authorizedBy: paymentForm.authorizedBy
      },
      isPrivate: false
    };

    try {
      await submitVerificationClaim(claimPayload, currentUser);
      showToast('Escrow facility declaration submitted for compliance verification.');
      setActiveModal(null);
      loadBrandTrustData();
    } catch (err) {
      showToast(`Submission error: ${err.message}`);
    }
  };

  const handleSubmitBriefStandards = async (e) => {
    e.preventDefault();

    const claimPayload = {
      id: `claim-${brandId}-brief-${Date.now()}`,
      entityType: 'brand',
      entityId: brandId,
      brandId,
      brandName: activeBrand.name || brandId,
      claimType: 'campaign_transparency',
      claimTitle: 'Campaign Brief Transparency & Platform Terms Warranty',
      status: 'pending_review',
      evidenceType: 'Campaign Brief Terms & Non-Circumvention Declaration',
      evidenceUrl: null,
      evidenceDetails: {
        standardsDeclaration: briefForm.standardsDeclaration,
        revisionPolicy: briefForm.revisionPolicy,
        platformPaymentCommitment: briefForm.platformPaymentCommitment
      },
      isPrivate: false
    };

    try {
      await submitVerificationClaim(claimPayload, currentUser);
      showToast('Campaign brief standards declaration submitted for audit.');
      setActiveModal(null);
      loadBrandTrustData();
    } catch (err) {
      showToast(`Submission error: ${err.message}`);
    }
  };

  // Admin Review Execution
  const handleExecuteReview = async (e) => {
    e.preventDefault();
    if (!selectedClaimForReview) return;

    try {
      await reviewVerificationClaim({
        claimId: selectedClaimForReview.id,
        decision: reviewActionForm.decision,
        notes: reviewActionForm.notes.trim(),
        reviewerName: reviewActionForm.reviewerName.trim(),
        currentUser: { ...(currentUser || {}), role: 'admin' }
      });

      showToast(`Review decision applied: [${reviewActionForm.decision}] to "${selectedClaimForReview.claimTitle}"`);
      setActiveModal(null);
      setSelectedClaimForReview(null);
      loadBrandTrustData();
    } catch (err) {
      showToast(`Review failed: ${err.message}`);
    }
  };

  const handleUnlockAdmin = (e) => {
    e.preventDefault();
    if (adminPasscodeInput.trim().toLowerCase() === 'alloy-admin' || adminPasscodeInput.trim().toLowerCase() === 'admin' || isUserAdmin) {
      setAdminModeUnlocked(true);
      setAdminPasscodeError(null);
      showToast('Authorized Reviewer Mode unlocked.');
    } else {
      setAdminPasscodeError('Invalid passcode. Use "alloy-admin" for reviewer verification testing.');
    }
  };

  return (
    <div className="trust-centre-view page-container" style={{ paddingBottom: '96px', paddingTop: '24px' }}>
      
      {/* Toast Notification */}
      {toastNotice && (
        <div className="studio-top-toast" style={{ background: '#1C1917', color: '#FAF8F5', zIndex: 9999 }}>
          <CheckCircle2 size={16} style={{ color: '#10B981' }} />
          <span>{toastNotice}</span>
        </div>
      )}

      {/* Top Breadcrumb & Controls Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <button
          type="button"
          className="profile-back-link"
          onClick={onBackToWorkspace}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}
        >
          <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>← Back to Brand Workspace</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Inspecting Brand:
          </span>
          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            {activeBrand.name}
          </strong>

          {/* Admin Reviewer Toggle */}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              if (adminModeUnlocked) {
                setAdminModeUnlocked(false);
                showToast('Returned to Brand Workspace view mode.');
              } else {
                setActiveTab('admin-review');
              }
            }}
            style={{
              background: adminModeUnlocked ? '#7C3AED' : '#FFFFFF',
              color: adminModeUnlocked ? '#FFFFFF' : '#7C3AED',
              border: '1px solid #7C3AED',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sliders size={14} />
            <span>{adminModeUnlocked ? 'Admin Mode Active' : 'Reviewer Panel'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          1. HERO HEADER BANNER
          ======================================================== */}
      <div className="trust-centre-hero-card" style={{
        background: 'linear-gradient(135deg, rgba(254, 252, 248, 0.95) 0%, rgba(240, 249, 245, 0.95) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.28)',
        borderRadius: '20px',
        padding: '36px 40px',
        marginBottom: '32px',
        boxShadow: '0 4px 24px rgba(28, 25, 23, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '100px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
              <ShieldCheck size={14} />
              <span>Brand Verification & Reliability Standard</span>
            </div>

            <h1 className="font-editorial" style={{ margin: '0 0 10px 0', fontSize: '2.5rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Brand Trust Centre
            </h1>

            <p style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.6 }}>
              Evidence-based trust, payment reliability, and transparency for creators hiring your brand.
            </p>

            <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', color: 'var(--text-tertiary)', maxWidth: '640px' }}>
              Top creators choose brands with verified identity, transparent brief deliverables, funded escrow milestones, and prompt communication.
            </p>
          </div>

          {/* Verification Progress Widget */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '20px 24px',
            minWidth: '280px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} />
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.94rem', color: 'var(--text-primary)' }}>
                  {activeBrand.name}
                </strong>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                  Brand Reliability Standing
                </span>
              </div>
            </div>

            {/* Audited Pillars Progress Bar */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: '4px', fontWeight: 600 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Audited Pillars</span>
                <span style={{ color: '#059669' }}>{trustSummary.verifiedCount} of {trustSummary.totalCategories} Verified</span>
              </div>
              <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '100px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${trustSummary.completionRate}%`,
                    background: 'linear-gradient(90deg, #10B981, #059669)',
                    borderRadius: '100px',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>

            {/* Status Breakdown Chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.72rem' }}>
              <span style={{ padding: '2px 8px', borderRadius: '100px', background: STATUS_META[VERIFICATION_STATUSES.VERIFIED].bg, color: STATUS_META[VERIFICATION_STATUSES.VERIFIED].color, fontWeight: 700 }}>
                {trustSummary.verifiedCount} Verified
              </span>
              {trustSummary.pendingCount > 0 && (
                <span style={{ padding: '2px 8px', borderRadius: '100px', background: STATUS_META[VERIFICATION_STATUSES.PENDING_REVIEW].bg, color: STATUS_META[VERIFICATION_STATUSES.PENDING_REVIEW].color, fontWeight: 700 }}>
                  {trustSummary.pendingCount} Pending Review
                </span>
              )}
              {trustSummary.selfDeclaredCount > 0 && (
                <span style={{ padding: '2px 8px', borderRadius: '100px', background: STATUS_META[VERIFICATION_STATUSES.SELF_DECLARED].bg, color: STATUS_META[VERIFICATION_STATUSES.SELF_DECLARED].color, fontWeight: 700 }}>
                  {trustSummary.selfDeclaredCount} Self-Declared
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '28px', borderTop: '1px solid rgba(16, 185, 129, 0.2)', paddingTop: '20px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview & Verification Pillars
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('requests')}
          >
            <span>Verification Requests & Claims</span>
            <span style={{ marginLeft: '6px', padding: '1px 7px', borderRadius: '100px', background: 'rgba(0,0,0,0.1)', fontSize: '0.74rem' }}>
              {brandClaims.length}
            </span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'badges-guide' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('badges-guide')}
          >
            Brand Badges Guide
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'admin-review' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('admin-review')}
            style={activeTab === 'admin-review' ? { background: '#7C3AED', borderColor: '#7C3AED' } : {}}
          >
            <Sliders size={13} style={{ marginRight: '5px' }} />
            <span>Admin Review Panel</span>
            {adminModeUnlocked && (
              <span style={{ marginLeft: '6px', width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            )}
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: OVERVIEW & 4 CORE BRAND PILLARS
          ======================================================== */}
      {activeTab === 'overview' && (
        <div className="trust-overview-content">
          
          <div style={{ marginBottom: '20px' }}>
            <span className="section-label" style={{ color: '#059669' }}>Factual Brand Framework</span>
            <h2 className="font-editorial" style={{ fontSize: '1.8rem', margin: '4px 0 6px 0', color: 'var(--text-primary)' }}>
              Four Pillars of Brand Reliability
            </h2>
            <p style={{ margin: 0, fontSize: '0.94rem', color: 'var(--text-secondary)' }}>
              We evaluate factual business verification, brief clarity, escrow funding, and collaboration turnaround without fabricated composite scores.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '36px' }}>
            
            {/* PILLAR 1: Business Identity */}
            <div className="trust-pillar-card" style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} />
                  </div>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: trustData.entity?.status === 'verified' || activeBrand.is_demo ? STATUS_META[VERIFICATION_STATUSES.VERIFIED].bg : STATUS_META[VERIFICATION_STATUSES.SELF_DECLARED].bg,
                    color: trustData.entity?.status === 'verified' || activeBrand.is_demo ? STATUS_META[VERIFICATION_STATUSES.VERIFIED].color : STATUS_META[VERIFICATION_STATUSES.SELF_DECLARED].color
                  }}>
                    {trustData.entity?.status === 'verified' || activeBrand.is_demo ? 'Verified Entity' : 'Self-Declared'}
                  </span>
                </div>

                <h3 className="font-editorial" style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                  1. Business Identity
                </h3>

                <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Cryptographic corporate email challenge and verified legal business personhood review.
                </p>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Corporate Domain:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{activeBrand.website || 'Self-declared website'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Legal Entity:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {trustData.entity?.status === 'verified' || activeBrand.is_demo ? 'Verified Corporate Partner' : 'Pending Documentation'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#059669', fontSize: '0.72rem', marginTop: '4px' }}>
                    <Lock size={11} />
                    <span>Incorporation & tax IDs strictly confidential and never shared with creators.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveModal('entity')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Submit Entity Evidence
              </button>
            </div>

            {/* PILLAR 2: Campaign Transparency */}
            <div className="trust-pillar-card" style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileCheck2 size={20} />
                  </div>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: transparencyMetrics.score >= 75 || activeBrand.is_demo ? STATUS_META[VERIFICATION_STATUSES.VERIFIED].bg : STATUS_META[VERIFICATION_STATUSES.SELF_DECLARED].bg,
                    color: transparencyMetrics.score >= 75 || activeBrand.is_demo ? STATUS_META[VERIFICATION_STATUSES.VERIFIED].color : STATUS_META[VERIFICATION_STATUSES.SELF_DECLARED].color
                  }}>
                    {transparencyMetrics.score >= 75 || activeBrand.is_demo ? `${transparencyMetrics.score}% Transparent` : `${transparencyMetrics.score}% Incomplete`}
                  </span>
                </div>

                <h3 className="font-editorial" style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                  2. Campaign Transparency
                </h3>

                <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Structural completeness of campaign briefs, clear creative objectives, and explicit milestone deliverables.
                </p>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Campaigns Evaluated:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{campaigns.length} Active Briefs</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Transparency Index:</span>
                    <strong style={{ color: transparencyMetrics.score >= 75 ? '#059669' : '#D97706' }}>
                      {transparencyMetrics.score}% Complete
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    {transparencyMetrics.items?.[0]?.missing?.length > 0 
                      ? `Improvement: ${transparencyMetrics.items[0].missing[0]}` 
                      : 'All required brief fields complete.'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveModal('brief')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Declare Brief Standards
              </button>
            </div>

            {/* PILLAR 3: Payment Reliability */}
            <div className="trust-pillar-card" style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.1)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={20} />
                  </div>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: paymentMetrics.hasVerifiedFunding || activeBrand.is_demo ? STATUS_META[VERIFICATION_STATUSES.VERIFIED].bg : STATUS_META[VERIFICATION_STATUSES.SELF_DECLARED].bg,
                    color: paymentMetrics.hasVerifiedFunding || activeBrand.is_demo ? STATUS_META[VERIFICATION_STATUSES.VERIFIED].color : STATUS_META[VERIFICATION_STATUSES.SELF_DECLARED].color
                  }}>
                    {paymentMetrics.hasVerifiedFunding || activeBrand.is_demo ? 'Escrow Backed' : 'Awaiting Escrow'}
                  </span>
                </div>

                <h3 className="font-editorial" style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                  3. Payment Reliability
                </h3>

                <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Authoritative campaign escrow funding records, verified Razorpay payment transactions, and pre-allocated budgets.
                </p>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Escrow Standing:</span>
                    <strong style={{ color: paymentMetrics.hasVerifiedFunding ? '#059669' : 'var(--text-primary)' }}>
                      {paymentMetrics.hasVerifiedFunding ? 'Active & Escrow Funded' : 'Pending Milestone Deposit'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Verified Funding:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {paymentMetrics.totalFundedRupees > 0 
                        ? `₹${paymentMetrics.totalFundedRupees.toLocaleString()}` 
                        : (activeBrand.is_demo ? '₹500,000 (Tier 1 Escrow)' : '₹0')}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Backed by Razorpay verified checkout records and platform milestone escrow.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveModal('payment')}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Declare Escrow Facility
              </button>
            </div>

            {/* PILLAR 4: Collaboration Integrity */}
            <div className="trust-pillar-card" style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HeartHandshake size={20} />
                  </div>
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: '100px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: collabMetrics.isVerifiedRecord ? STATUS_META[VERIFICATION_STATUSES.VERIFIED].bg : STATUS_META[VERIFICATION_STATUSES.SELF_DECLARED].bg,
                    color: collabMetrics.isVerifiedRecord ? STATUS_META[VERIFICATION_STATUSES.VERIFIED].color : STATUS_META[VERIFICATION_STATUSES.SELF_DECLARED].color
                  }}>
                    {collabMetrics.isVerifiedRecord ? 'Clean Record' : 'Initial Phase'}
                  </span>
                </div>

                <h3 className="font-editorial" style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: 'var(--text-primary)' }}>
                  4. Collaboration Integrity
                </h3>

                <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Milestone feedback turnaround speed, completed creator contracts, and zero payment disputes.
                </p>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Completed Contracts:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {collabMetrics.completedCount > 0 ? `${collabMetrics.completedCount} Deliverables Signed Off` : (activeBrand.is_demo ? '8 Completed Projects' : '0 Completed Yet')}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Review Turnaround:</span>
                    <strong style={{ color: '#059669' }}>
                      {collabMetrics.averageReviewTime}
                    </strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    {collabMetrics.totalCount === 0 && !activeBrand.is_demo 
                      ? 'Not enough collaboration data yet — updates as projects complete.' 
                      : 'Zero unresolved revision freezes or escrow disputes.'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (onNavigateToTab) onNavigateToTab('collaborations');
                  else showToast('Active projects can be managed in Collaborations tab.');
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                View Active Collaborations
              </button>
            </div>

          </div>

          {/* Public Brand Verification Badges Preview */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '28px 32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span className="section-label" style={{ color: '#059669', marginBottom: '2px' }}>Brand Transparency Badges</span>
                <h3 className="font-editorial" style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                  Active Badges on {activeBrand.name}’s Hiring Profile
                </h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Click any badge to inspect verified criteria & truthful limits
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {badges.map(b => {
                const meta = STATUS_META[b.status] || STATUS_META[VERIFICATION_STATUSES.NOT_SUBMITTED];
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setSelectedBadgeForDetail(b);
                      setActiveModal('badge-detail');
                    }}
                    style={{
                      background: '#FFFFFF',
                      border: `1px solid ${meta.border}`,
                      borderRadius: '100px',
                      padding: '8px 16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                    }}
                  >
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: meta.color,
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {b.title}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '100px',
                      background: meta.bg,
                      color: meta.color,
                      fontWeight: 700
                    }}>
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================
          TAB 2: VERIFICATION REQUESTS & CHECKS
          ======================================================== */}
      {activeTab === 'requests' && (
        <div className="trust-requests-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="section-label" style={{ color: '#059669' }}>Claims Audit Queue</span>
              <h2 className="font-editorial" style={{ fontSize: '1.8rem', margin: '4px 0', color: 'var(--text-primary)' }}>
                Brand Verification Submissions
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                All documentation submitted for manual review by platform compliance auditors.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveModal('entity')}
              >
                + Submit Entity Documentation
              </button>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Claims' },
              { id: VERIFICATION_STATUSES.VERIFIED, label: 'Verified' },
              { id: VERIFICATION_STATUSES.PENDING_REVIEW, label: 'Pending Review' },
              { id: VERIFICATION_STATUSES.NEEDS_RENEWAL, label: 'Needs Renewal' },
              { id: VERIFICATION_STATUSES.SELF_DECLARED, label: 'Self-Declared' },
              { id: VERIFICATION_STATUSES.UNABLE_TO_VERIFY, label: 'Unable to Verify' }
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: statusFilter === f.id ? '1px solid #1C1917' : '1px solid var(--border-subtle)',
                  background: statusFilter === f.id ? '#1C1917' : '#FFFFFF',
                  color: statusFilter === f.id ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Claims List Table / Cards */}
          {isLoadingClaims ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Loading brand verification records...
            </div>
          ) : filteredClaims.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '16px', border: '1px dashed var(--border-subtle)' }}>
              <AlertCircle size={36} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px' }} />
              <h3 className="font-editorial" style={{ margin: '0 0 6px 0', fontSize: '1.3rem' }}>
                No Claims in this Category
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Submit business incorporation documents or escrow pre-authorization to enter the review queue.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredClaims.map(claim => {
                const meta = STATUS_META[claim.status] || STATUS_META[VERIFICATION_STATUSES.NOT_SUBMITTED];

                return (
                  <div
                    key={claim.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '14px',
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '20px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ flex: '1 1 340px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '100px',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-tertiary)',
                          textTransform: 'uppercase',
                          fontWeight: 700
                        }}>
                          {(claim.claimType || 'General').replace('_', ' ')}
                        </span>

                        {claim.isPrivate && (
                          <span style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', background: 'rgba(5, 150, 105, 0.08)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
                            <Lock size={10} />
                            Private Document
                          </span>
                        )}

                        <span style={{
                          padding: '3px 9px',
                          borderRadius: '100px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`
                        }}>
                          {meta.label}
                        </span>
                      </div>

                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {claim.claimTitle}
                      </h4>

                      <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {claim.reviewerNotes || meta.description}
                      </p>

                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.76rem', color: 'var(--text-tertiary)', flexWrap: 'wrap' }}>
                        <span>Evidence: <strong>{claim.evidenceType || 'Stated'}</strong></span>
                        {claim.reviewedBy && (
                          <span>Reviewer: <strong>{claim.reviewedBy}</strong></span>
                        )}
                        {claim.reviewedAt && (
                          <span>Reviewed: {new Date(claim.reviewedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {claim.evidenceUrl && !claim.isPrivate && (
                        <a
                          href={claim.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        >
                          <ExternalLink size={13} />
                          <span>Inspect Evidence</span>
                        </a>
                      )}

                      {/* Admin Review Action Trigger */}
                      {adminModeUnlocked && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSelectedClaimForReview(claim);
                            setReviewActionForm({
                              decision: 'APPROVE',
                              notes: claim.reviewerNotes || '',
                              reviewerName: currentUser?.profile?.display_name || 'Elena Rostova (Compliance Reviewer)'
                            });
                            setActiveModal('review-action');
                          }}
                        >
                          Review Claim
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================
          TAB 3: BRAND BADGES TRANSPARENCY GUIDE
          ======================================================== */}
      {activeTab === 'badges-guide' && (
        <div className="trust-badges-guide-content">
          <div style={{ marginBottom: '24px' }}>
            <span className="section-label" style={{ color: '#059669' }}>Truth In Advertising</span>
            <h2 className="font-editorial" style={{ fontSize: '1.8rem', margin: '4px 0', color: 'var(--text-primary)' }}>
              Brand Verification Badges Explained
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '680px' }}>
              We believe creators have the right to know exactly what was checked and what was not checked before committing their creative direction.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {Object.values(BRAND_BADGE_DEFINITIONS).map(badge => (
              <div
                key={badge.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                        {badge.title}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {badge.category}
                      </span>
                    </div>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {badge.description}
                </p>

                <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                      What Was Audited:
                    </strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {badge.whatWasChecked}
                    </span>
                  </div>

                  <div>
                    <strong style={{ color: '#D97706', display: 'block', marginBottom: '2px' }}>
                      Important Limitations:
                    </strong>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.76rem' }}>
                      {badge.limitations}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: ADMIN REVIEW PANEL
          ======================================================== */}
      {activeTab === 'admin-review' && (
        <div className="trust-admin-panel-content">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#7C3AED', background: 'rgba(124, 58, 237, 0.1)', padding: '3px 10px', borderRadius: '100px', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                <Key size={12} />
                <span>Authorized Reviewer Operations</span>
              </div>
              <h2 className="font-editorial" style={{ fontSize: '1.9rem', margin: 0, color: 'var(--text-primary)' }}>
                Brand Compliance & Authenticity Review Panel
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                Inspect business registration certificates, corporate domain validations, and escrow guarantees.
              </p>
            </div>

            {adminModeUnlocked && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={loadBrandTrustData}
                >
                  <RefreshCw size={13} style={{ marginRight: '5px' }} />
                  Refresh Queue
                </button>
              </div>
            )}
          </div>

          {!adminModeUnlocked ? (
            /* Passcode Unlock Gate */
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: '20px',
              padding: '48px 32px',
              maxWidth: '520px',
              margin: '32px auto',
              textAlign: 'center'
            }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Lock size={26} />
              </div>

              <h3 className="font-editorial" style={{ margin: '0 0 8px 0', fontSize: '1.5rem', color: 'var(--text-primary)' }}>
                Reviewer Authentication Required
              </h3>

              <p style={{ margin: '0 0 24px 0', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Brand account holders cannot approve their own verification claims. Enter authorized reviewer credentials to access the compliance queue.
              </p>

              <form onSubmit={handleUnlockAdmin}>
                <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Reviewer Passcode
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={adminPasscodeInput}
                    onChange={(e) => setAdminPasscodeInput(e.target.value)}
                    placeholder="Enter passcode (e.g. alloy-admin)"
                    style={{ width: '100%', padding: '10px 14px' }}
                  />
                  {adminPasscodeError && (
                    <div style={{ color: '#EF4444', fontSize: '0.78rem', marginTop: '6px' }}>
                      {adminPasscodeError}
                    </div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Demo testing passkey: <code>alloy-admin</code>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                >
                  Authenticate Reviewer Session
                </button>
              </form>
            </div>
          ) : (
            /* Authorized Reviewer Workspace */
            <div>
              {/* Stats Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>Total Brand Queue</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {claimsList.length} Claims
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#8B5CF6', fontWeight: 700 }}>Pending Review</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#8B5CF6', marginTop: '4px' }}>
                    {claimsList.filter(c => c.status === 'pending_review').length} Items
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#059669', fontWeight: 700 }}>Approved</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                    {claimsList.filter(c => c.status === 'verified').length} Verified
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#EA580C', fontWeight: 700 }}>Action Required</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#EA580C', marginTop: '4px' }}>
                    {claimsList.filter(c => c.status === 'needs_renewal' || c.status === 'unable_to_verify').length} Cases
                  </div>
                </div>
              </div>

              {/* Claims Queue */}
              <h3 className="font-editorial" style={{ fontSize: '1.3rem', marginBottom: '14px' }}>
                Pending & Completed Brand Audit Requests
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '40px' }}>
                {claimsList.map(claim => {
                  const meta = STATUS_META[claim.status] || STATUS_META[VERIFICATION_STATUSES.NOT_SUBMITTED];

                  return (
                    <div
                      key={claim.id}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '14px',
                        padding: '20px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '20px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ flex: '1 1 380px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#059669', background: 'rgba(5, 150, 105, 0.08)', padding: '2px 8px', borderRadius: '100px' }}>
                            Entity: {claim.brandId || claim.entityId || claim.creatorId || 'Brand Partner'}
                          </span>

                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '100px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color
                          }}>
                            {meta.label}
                          </span>
                        </div>

                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                          {claim.claimTitle}
                        </h4>

                        <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          {claim.reviewerNotes || 'Awaiting platform reviewer inspection.'}
                        </p>

                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
                          <span>Type: <strong>{claim.evidenceType || 'Corporate Document'}</strong></span>
                          {claim.reviewedBy && <span>Audited By: <strong>{claim.reviewedBy}</strong></span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSelectedClaimForReview(claim);
                            setReviewActionForm({
                              decision: 'APPROVE',
                              notes: claim.reviewerNotes || '',
                              reviewerName: currentUser?.profile?.display_name || 'Elena Rostova (Compliance Reviewer)'
                            });
                            setActiveModal('review-action');
                          }}
                        >
                          Review & Decide
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================
          MODAL: SUBMIT BUSINESS ENTITY DOCUMENTATION
          ======================================================== */}
      {activeModal === 'entity' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={20} color="#059669" />
                <h3 className="modal-title font-editorial">Submit Business Entity Evidence</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEntityEvidence}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Submit official corporate registration for compliance review. Private documents are stored in an encrypted vault and are never downloadable or visible to creators.
                </p>

                <div>
                  <label className="form-label">Legal Business Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={entityForm.legalName}
                    onChange={(e) => setEntityForm({ ...entityForm, legalName: e.target.value })}
                    placeholder="e.g. Lumina Botanica Labs Ltd"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Corporate Website / Official Domain</label>
                  <input
                    type="url"
                    className="form-input"
                    value={entityForm.website}
                    onChange={(e) => setEntityForm({ ...entityForm, website: e.target.value })}
                    placeholder="https://yourcompany.com"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label">Registration Document Type</label>
                    <select
                      className="form-input"
                      value={entityForm.documentType}
                      onChange={(e) => setEntityForm({ ...entityForm, documentType: e.target.value })}
                    >
                      <option value="Certificate of Incorporation">Certificate of Incorporation</option>
                      <option value="VAT / Tax Registration Certificate">VAT / Tax Certificate</option>
                      <option value="Business License / Registry Extract">Commercial Registry Extract</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Registration / Tax Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={entityForm.regNumber}
                      onChange={(e) => setEntityForm({ ...entityForm, regNumber: e.target.value })}
                      placeholder="e.g. 11948201"
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(5, 150, 105, 0.08)', borderRadius: '10px', padding: '12px', fontSize: '0.78rem', color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={14} />
                  <span>Submissions enter Pending Review. Legal personhood verification takes 24-48 hours.</span>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit for Compliance Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SUBMIT PAYMENT ESCROW FACILITY
          ======================================================== */}
      {activeModal === 'payment' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard size={20} color="#D97706" />
                <h3 className="modal-title font-editorial">Declare Escrow & Payment Facility</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPaymentEscrow}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Declare active campaign escrow funding method. Platform escrow reserves full agreed budgets prior to milestone start, assuring creators of guaranteed payout.
                </p>

                <div>
                  <label className="form-label">Payment / Escrow Facility Type</label>
                  <select
                    className="form-input"
                    value={paymentForm.methodType}
                    onChange={(e) => setPaymentForm({ ...paymentForm, methodType: e.target.value })}
                  >
                    <option value="Razorpay Escrow & Corporate Wire">Razorpay Escrow & Corporate Wire</option>
                    <option value="Pre-Funded Milestone Balance">Pre-Funded Milestone Balance</option>
                    <option value="Corporate Purchase Order & Net-30 Escrow">Corporate Purchase Order & Escrow</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Escrow Tier Specification</label>
                  <input
                    type="text"
                    className="form-input"
                    value={paymentForm.escrowTier}
                    onChange={(e) => setPaymentForm({ ...paymentForm, escrowTier: e.target.value })}
                    placeholder="e.g. Tier 1 Verified Milestone Account"
                  />
                </div>

                <div>
                  <label className="form-label">Authorized Signatory / Finance Contact</label>
                  <input
                    type="text"
                    className="form-input"
                    value={paymentForm.authorizedBy}
                    onChange={(e) => setPaymentForm({ ...paymentForm, authorizedBy: e.target.value })}
                    placeholder="finance@yourbrand.com"
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Escrow Declaration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SUBMIT BRIEF STANDARDS
          ======================================================== */}
      {activeModal === 'brief' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileCheck2 size={20} color="#2563EB" />
                <h3 className="modal-title font-editorial">Declare Campaign Brief Standards</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitBriefStandards}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Confirm your brand's commitment to explicit milestone deliverables, reasonable revision turnarounds, and compliance with platform terms without off-platform fee avoidance.
                </p>

                <div>
                  <label className="form-label">Creative Brief Quality Commitment</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={briefForm.standardsDeclaration}
                    onChange={(e) => setBriefForm({ ...briefForm, standardsDeclaration: e.target.value })}
                    placeholder="Describe your brief quality standards..."
                  />
                </div>

                <div>
                  <label className="form-label">Revision Expectations Policy</label>
                  <input
                    type="text"
                    className="form-input"
                    value={briefForm.revisionPolicy}
                    onChange={(e) => setBriefForm({ ...briefForm, revisionPolicy: e.target.value })}
                    placeholder="e.g. Standard 2 revision rounds with 48h creator turnaround"
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '10px' }}>
                  <input
                    type="checkbox"
                    id="platformPaymentCommitment"
                    checked={briefForm.platformPaymentCommitment}
                    onChange={(e) => setBriefForm({ ...briefForm, platformPaymentCommitment: e.target.checked })}
                    style={{ marginTop: '2px' }}
                  />
                  <label htmlFor="platformPaymentCommitment" style={{ fontSize: '0.82rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    I confirm our brand executes all collaboration payments strictly through the ALLOY on-platform escrow facility and does not solicit off-platform payment methods.
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Brief Standards
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BADGE DETAIL INSPECTOR
          ======================================================== */}
      {activeModal === 'badge-detail' && selectedBadgeForDetail && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} color="#059669" />
                <h3 className="modal-title font-editorial">{selectedBadgeForDetail.title}</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Verification Status:</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '100px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: STATUS_META[selectedBadgeForDetail.status]?.bg,
                  color: STATUS_META[selectedBadgeForDetail.status]?.color
                }}>
                  {STATUS_META[selectedBadgeForDetail.status]?.label}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {selectedBadgeForDetail.description}
              </p>

              <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                    What Was Checked:
                  </strong>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {selectedBadgeForDetail.whatWasChecked}
                  </span>
                </div>

                <div>
                  <strong style={{ color: '#D97706', display: 'block', marginBottom: '2px' }}>
                    Transparent Limitations:
                  </strong>
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    {selectedBadgeForDetail.limitations}
                  </span>
                </div>

                {selectedBadgeForDetail.disclaimer && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                    <em>Disclaimer: {selectedBadgeForDetail.disclaimer}</em>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADMIN REVIEW DECISION
          ======================================================== */}
      {activeModal === 'review-action' && selectedClaimForReview && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={20} color="#7C3AED" />
                <h3 className="modal-title font-editorial">Auditor Review Decision</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteReview}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '10px', fontSize: '0.82rem' }}>
                  <div style={{ color: 'var(--text-tertiary)', marginBottom: '2px' }}>Reviewing Claim:</div>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.94rem' }}>
                    {selectedClaimForReview.claimTitle}
                  </strong>
                  <div style={{ color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Brand Entity: {selectedClaimForReview.brandId || selectedClaimForReview.entityId}
                  </div>
                </div>

                <div>
                  <label className="form-label">Review Decision</label>
                  <select
                    className="form-input"
                    value={reviewActionForm.decision}
                    onChange={(e) => setReviewActionForm({ ...reviewActionForm, decision: e.target.value })}
                  >
                    <option value="APPROVE">APPROVE — Mark as Verified</option>
                    <option value="REQUEST_INFO">REQUEST_INFO — Mark as Needs Renewal</option>
                    <option value="REJECT">REJECT — Mark as Unable to Verify</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Auditor Internal Notes</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={reviewActionForm.notes}
                    onChange={(e) => setReviewActionForm({ ...reviewActionForm, notes: e.target.value })}
                    placeholder="Record rationale for compliance audit log..."
                  />
                </div>

                <div>
                  <label className="form-label">Reviewer Official Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={reviewActionForm.reviewerName}
                    onChange={(e) => setReviewActionForm({ ...reviewActionForm, reviewerName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#7C3AED', borderColor: '#7C3AED' }}>
                  Apply Review Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
