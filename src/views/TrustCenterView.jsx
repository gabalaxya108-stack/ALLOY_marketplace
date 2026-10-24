// src/views/TrustCenterView.jsx
// CreaSync Professional Trust Centre
// Transparency and trust behind every creative collaboration.
// Supports Creator Submissions, Brand Transparency View, Public Badge Explanations, and Authorized Admin Review Panel.

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
  Upload,
  Cpu,
  Briefcase,
  Award,
  ExternalLink,
  RefreshCw,
  Check,
  X,
  Info,
  UserCheck,
  Send,
  HelpCircle,
  FileCheck2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  Key,
  Shield,
  Layers,
  ArrowUpRight,
  User
} from 'lucide-react';
import {
  VERIFICATION_STATUSES,
  STATUS_META,
  TRUST_OVERVIEW_CATEGORIES,
  BADGE_DEFINITIONS,
  PROVENANCE_LEVELS,
  getCreatorTrustBadges,
  calculateTrustSummary
} from '../data/trustVerificationData.js';
import {
  fetchVerificationClaims,
  submitVerificationClaim,
  reviewVerificationClaim,
  fetchVerificationAuditLog
} from '../services/marketplaceBackend.js';
import TrustOrbit from '../components/TrustOrbit.jsx';

export default function TrustCenterView({
  creators = [],
  activeCreatorId = 'maya-chen',
  currentUser = null,
  onUpdateCreator,
  onViewCreatorProfile,
  onBackToMarketplace
}) {
  // Current Creator Selection (defaults to Maya Chen or logged in creator)
  const [selectedCreatorId, setSelectedCreatorId] = useState(() => {
    if (currentUser?.profile?.role === 'creator' && currentUser?.id) {
      const match = creators.find(c => c.id === currentUser.id || c.handle === currentUser.handle);
      if (match) return match.id;
    }
    return activeCreatorId || (creators[0]?.id || 'maya-chen');
  });

  const activeCreator = useMemo(() => {
    return creators.find(c => c.id === selectedCreatorId) || creators[0] || null;
  }, [creators, selectedCreatorId]);

  // Main navigation tab inside Trust Centre:
  // 'overview' | 'requests' | 'admin-review' | 'badges-guide'
  const [activeTab, setActiveTab] = useState('overview');

  // Filter for requests list
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'identity' | 'portfolio' | 'tool' | 'licensing' | 'review-action' | 'badge-detail'
  const [selectedBadgeForDetail, setSelectedBadgeForDetail] = useState(null);
  const [selectedClaimForReview, setSelectedClaimForReview] = useState(null);
  const [toastNotice, setToastNotice] = useState(null);

  // Authorized Admin Mode state
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

  // Fetch claims and audit log for selected creator
  const loadTrustData = async () => {
    setIsLoadingClaims(true);
    try {
      const [fetchedClaims, fetchedLogs] = await Promise.all([
        fetchVerificationClaims(adminModeUnlocked ? null : selectedCreatorId, currentUser),
        fetchVerificationAuditLog(adminModeUnlocked ? null : selectedCreatorId)
      ]);
      setClaimsList(fetchedClaims || []);
      setAuditLogsList(fetchedLogs || []);
    } catch (e) {
      console.warn('[Trust Centre] Could not load claims:', e);
    } finally {
      setIsLoadingClaims(false);
    }
  };

  useEffect(() => {
    loadTrustData();
  }, [selectedCreatorId, adminModeUnlocked]);

  // Creator's trustVerification structure
  const trustData = activeCreator?.trustVerification || {};
  const trustSummary = calculateTrustSummary(trustData);
  const badges = useMemo(() => getCreatorTrustBadges(activeCreator), [activeCreator]);

  // Filtered claims for active creator
  const creatorClaims = useMemo(() => {
    if (!adminModeUnlocked) {
      return claimsList.filter(c => c.creatorId === selectedCreatorId);
    }
    return claimsList;
  }, [claimsList, selectedCreatorId, adminModeUnlocked]);

  const filteredClaims = useMemo(() => {
    if (statusFilter === 'all') return creatorClaims;
    return creatorClaims.filter(c => c.status === statusFilter);
  }, [creatorClaims, statusFilter]);

  // --- Submission Forms State ---
  const [identityForm, setIdentityForm] = useState({
    legalName: trustData.identity?.legalName || '',
    issuingCountry: trustData.identity?.issuingCountry || 'United Kingdom (GB)',
    documentType: trustData.identity?.documentType || 'Passport',
    documentNumber: ''
  });

  const [portfolioForm, setPortfolioForm] = useState({
    projectId: activeCreator?.projects?.[0]?.id || '',
    evidenceType: 'ComfyUI JSON Graph & Seed Logs',
    description: '',
    artifactUrl: ''
  });

  const [toolForm, setToolForm] = useState({
    toolName: '',
    useCase: '',
    associatedWork: activeCreator?.projects?.[0]?.title || 'General Production Pipeline',
    evidenceNote: '',
    evidenceUrl: ''
  });

  const [licensingForm, setLicensingForm] = useState({
    modelRightsDeclaration: trustData.licensing?.modelRightsDeclaration || 'Generated using commercially-cleared foundational models (Flux.1 Pro / Midjourney Pro) with full commercial output rights.',
    licenseTypeGranted: trustData.licensing?.licenseTypeGranted || 'Full Commercial Buyout (Worldwide Digital, OOH, Paid Media)',
    exclusivityPeriod: trustData.licensing?.exclusivityPeriod || '12 Months Category Exclusivity'
  });

  // Admin Review Form State
  const [reviewActionForm, setReviewActionForm] = useState({
    decision: 'APPROVE', // 'APPROVE' | 'REJECT' | 'REQUEST_INFO'
    notes: '',
    reviewerName: currentUser?.profile?.display_name || currentUser?.display_name || 'Ananya Roy (Lead Visual Auditor)'
  });

  // =========================================================================
  // SUBMISSION HANDLERS
  // =========================================================================

  const handleSubmitIdentity = async (e) => {
    e.preventDefault();
    if (!identityForm.legalName.trim()) {
      showToast('Please enter your legal name.');
      return;
    }

    const masked = identityForm.documentNumber
      ? `•••••• ${identityForm.documentNumber.slice(-4)}`
      : '•••••• 8941';

    const claimPayload = {
      id: `claim-${selectedCreatorId}-identity-${Date.now()}`,
      creatorId: selectedCreatorId,
      creatorName: activeCreator?.name || selectedCreatorId,
      claimType: 'identity',
      claimTitle: `Professional Legal Identity (${identityForm.documentType})`,
      status: 'pending_review', // Strict: always enters review queue
      evidenceType: identityForm.documentType,
      evidenceUrl: 'https://vault.alloy.market/private/identity/doc_enc.pdf',
      evidenceDetails: {
        legalName: identityForm.legalName.trim(),
        jurisdiction: identityForm.issuingCountry,
        maskedNumber: masked
      },
      isPrivate: true // Strictly confidential
    };

    try {
      await submitVerificationClaim(claimPayload, currentUser);
      showToast('Identity verification submitted! Documents are strictly private and never visible to hiring brands.');
      setActiveModal(null);
      loadTrustData();
    } catch (err) {
      showToast(`Submission error: ${err.message}`);
    }
  };

  const handleSubmitPortfolioEvidence = async (e) => {
    e.preventDefault();
    const selectedProj = (activeCreator?.projects || []).find(p => p.id === portfolioForm.projectId) || activeCreator?.projects?.[0];
    if (!selectedProj) {
      showToast('Please select a portfolio project.');
      return;
    }

    const claimPayload = {
      id: `claim-${selectedCreatorId}-pe-${Date.now()}`,
      creatorId: selectedCreatorId,
      creatorName: activeCreator?.name || selectedCreatorId,
      claimType: 'portfolio',
      claimTitle: `Portfolio Authenticity: ${selectedProj.title}`,
      status: 'pending_review', // Strict: never automatically verified
      evidenceType: portfolioForm.evidenceType,
      evidenceUrl: portfolioForm.artifactUrl.trim() || 'https://vault.alloy.market/audit/project_source_v1.zip',
      evidenceDetails: {
        projectId: selectedProj.id,
        projectTitle: selectedProj.title,
        description: portfolioForm.description.trim() || 'Process artifacts and generation seeds.'
      },
      isPrivate: false
    };

    try {
      await submitVerificationClaim(claimPayload, currentUser);
      showToast(`Authenticity evidence submitted for "${selectedProj.title}"! Queued for review.`);
      setActiveModal(null);
      loadTrustData();
    } catch (err) {
      showToast(`Submission error: ${err.message}`);
    }
  };

  const handleSubmitToolDeclaration = async (e) => {
    e.preventDefault();
    if (!toolForm.toolName.trim()) {
      showToast('Please enter an AI tool or model name.');
      return;
    }

    const isEvidenceAttached = !!toolForm.evidenceNote.trim() || !!toolForm.evidenceUrl.trim();
    const status = isEvidenceAttached ? 'pending_review' : 'self_declared';

    const claimPayload = {
      id: `claim-${selectedCreatorId}-tool-${Date.now()}`,
      creatorId: selectedCreatorId,
      creatorName: activeCreator?.name || selectedCreatorId,
      claimType: 'ai_tools',
      claimTitle: `AI Model Claim: ${toolForm.toolName.trim()}`,
      status,
      evidenceType: isEvidenceAttached ? 'Generation Seed Logs & Master Passes' : 'Creator Stated Tool',
      evidenceUrl: toolForm.evidenceUrl.trim() || null,
      evidenceDetails: {
        toolName: toolForm.toolName.trim(),
        useCase: toolForm.useCase.trim() || 'Generative concept synthesis and asset detailing.',
        associatedWork: toolForm.associatedWork,
        evidenceNote: toolForm.evidenceNote.trim() || 'Self-reported by creator'
      },
      isPrivate: false
    };

    try {
      await submitVerificationClaim(claimPayload, currentUser);
      showToast(isEvidenceAttached 
        ? `Tool claim with evidence queued for review!` 
        : `Tool "${toolForm.toolName}" added as self-declared.`);
      setActiveModal(null);
      loadTrustData();
    } catch (err) {
      showToast(`Submission error: ${err.message}`);
    }
  };

  const handleSubmitLicensing = async (e) => {
    e.preventDefault();
    const claimPayload = {
      id: `claim-${selectedCreatorId}-license-${Date.now()}`,
      creatorId: selectedCreatorId,
      creatorName: activeCreator?.name || selectedCreatorId,
      claimType: 'commercial_rights',
      claimTitle: 'Commercial Buyout & Model Terms Declaration',
      status: 'pending_review',
      evidenceType: 'Model Terms of Service Disclosure',
      evidenceUrl: null,
      evidenceDetails: {
        modelRightsDeclaration: licensingForm.modelRightsDeclaration,
        licenseTypeGranted: licensingForm.licenseTypeGranted,
        exclusivityPeriod: licensingForm.exclusivityPeriod
      },
      isPrivate: false
    };

    try {
      await submitVerificationClaim(claimPayload, currentUser);
      showToast('Commercial licensing disclosures updated and submitted for review!');
      setActiveModal(null);
      loadTrustData();
    } catch (err) {
      showToast(`Submission error: ${err.message}`);
    }
  };

  // =========================================================================
  // ADMIN REVIEW HANDLER
  // =========================================================================

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
      loadTrustData();
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
      setAdminPasscodeError('Invalid passcode. Use "alloy-admin" to authenticate review authority.');
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
          onClick={onBackToMarketplace}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}
        >
          <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>← Back to Marketplace</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Creator Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Inspecting Creator:
            </span>
            <select
              className="form-input"
              value={selectedCreatorId}
              onChange={(e) => setSelectedCreatorId(e.target.value)}
              style={{ fontSize: '0.84rem', padding: '6px 12px', minWidth: '180px', background: '#FFFFFF' }}
            >
              {creators.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.specialty || 'Creator'})
                </option>
              ))}
            </select>
          </div>

          {/* Public Profile Link */}
          {onViewCreatorProfile && activeCreator && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onViewCreatorProfile(activeCreator.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Eye size={14} />
              <span>View Public Profile</span>
            </button>
          )}

          {/* Admin Reviewer Toggle */}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              if (adminModeUnlocked) {
                setAdminModeUnlocked(false);
                showToast('Returned to Creator & Brand view mode.');
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
        background: 'linear-gradient(135deg, rgba(254, 252, 248, 0.95) 0%, rgba(248, 242, 253, 0.95) 100%)',
        border: '1px solid rgba(162, 142, 220, 0.28)',
        borderRadius: '20px',
        padding: '36px 40px',
        marginBottom: '32px',
        boxShadow: '0 4px 24px rgba(28, 25, 23, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '100px', background: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '14px' }}>
              <ShieldCheck size={14} />
              <span>Platform Verification Standard</span>
            </div>

            <h1 className="font-editorial" style={{ margin: '0 0 10px 0', fontSize: '2.5rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Trust Centre
            </h1>

            <p style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.6 }}>
              Transparency and trust behind every creative collaboration.
            </p>

            <p style={{ margin: '8px 0 0 0', fontSize: '0.88rem', color: 'var(--text-tertiary)', maxWidth: '640px' }}>
              Evidence-based verification for AI content creators. We audit original project files, model generation graphs, and commercial buyout terms to give hiring brands genuine confidence.
            </p>
          </div>

          {/* Creator Verification Progress Widget */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '20px 24px',
            minWidth: '280px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <img
                src={activeCreator?.avatar}
                alt={activeCreator?.name}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  {activeCreator?.name}
                </strong>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                  Verification Progress
                </span>
              </div>
            </div>

            {/* Progress Bar */}
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

            {/* Mini Status Breakdown Chips */}
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

        {/* View Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '28px', borderTop: '1px solid rgba(162, 142, 220, 0.2)', paddingTop: '20px', flexWrap: 'wrap' }}>
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
            <span>Verification Requests & Checks</span>
            <span style={{ marginLeft: '6px', padding: '1px 7px', borderRadius: '100px', background: 'rgba(0,0,0,0.1)', fontSize: '0.74rem' }}>
              {creatorClaims.length}
            </span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'badges-guide' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('badges-guide')}
          >
            Badges Transparency Guide
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
          TAB 1: OVERVIEW & 4 VERIFICATION CARDS
          ======================================================== */}
      {activeTab === 'overview' && (
        <div className="trust-overview-content">
          
          {/* ALLOY Trust Orbit (Interactive Animated Verification System) */}
          <TrustOrbit
            trustData={trustData}
            claims={claimsList}
            onOpenSubmissionModal={(modalType) => setActiveModal(modalType)}
            currentUser={currentUser}
            isBrand={false}
            entityName={activeCreator?.name || 'Creator'}
            onRefresh={loadTrustData}
          />

          {/* Public Verification Badges Live Preview */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '28px 32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span className="section-label" style={{ color: '#059669', marginBottom: '2px' }}>Profile Integration</span>
                <h3 className="font-editorial" style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                  Active Badges on {activeCreator?.name}’s Profile
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
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: meta.color,
                      background: meta.bg,
                      padding: '2px 7px',
                      borderRadius: '100px'
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
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="section-label" style={{ color: '#7C3AED' }}>Evidence Records</span>
              <h2 className="font-editorial" style={{ fontSize: '1.8rem', margin: '4px 0', color: 'var(--text-primary)' }}>
                Verification Claims & Evidence Submissions
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Itemized claims for {activeCreator?.name}. Claims require authorized reviewer approval to reach Verified status.
              </p>
            </div>

            {/* Quick Action Button */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setActiveModal('portfolio')}
              >
                + Submit New Evidence
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
              Loading verification records...
            </div>
          ) : filteredClaims.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', background: '#FFFFFF', borderRadius: '16px', border: '1px dashed var(--border-subtle)' }}>
              <AlertCircle size={36} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px' }} />
              <h3 className="font-editorial" style={{ margin: '0 0 6px 0', fontSize: '1.3rem' }}>
                No Claims Found in this Category
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Try switching the status filter or submit new supporting evidence.
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
                          {claim.claimType.replace('_', ' ')}
                        </span>

                        {claim.isPrivate && (
                          <span style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#7C3AED', background: 'rgba(124, 58, 237, 0.08)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
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
                              reviewerName: currentUser?.profile?.display_name || 'Ananya Roy (Lead Visual Auditor)'
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
          TAB 3: BADGES TRANSPARENCY GUIDE
          ======================================================== */}
      {activeTab === 'badges-guide' && (
        <div className="trust-badges-guide-content">
          <div style={{ marginBottom: '24px' }}>
            <span className="section-label" style={{ color: '#059669' }}>Full Transparency</span>
            <h2 className="font-editorial" style={{ fontSize: '1.8rem', margin: '4px 0', color: 'var(--text-primary)' }}>
              What Each Verification Badge Means
            </h2>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', maxWidth: '680px' }}>
              We believe trust requires knowing what was checked and what was not checked. Below is our complete disclosure framework for all badges displayed across creator profiles.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {Object.values(BADGE_DEFINITIONS).map(badge => (
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
                      What Was Checked:
                    </strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {badge.whatWasChecked}
                    </span>
                  </div>

                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
                      Audit Criteria:
                    </strong>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {badge.criteria}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px' }}>
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
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#7C3AED', background: 'rgba(124, 58, 237, 0.1)', padding: '3px 10px', borderRadius: '100px', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                <Key size={12} />
                <span>Authorized Reviewer Operations</span>
              </div>
              <h2 className="font-editorial" style={{ fontSize: '1.9rem', margin: 0, color: 'var(--text-primary)' }}>
                Compliance & Authenticity Review Panel
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                Inspect submitted evidence, record internal reviewer notes, and approve or reject verification claims.
              </p>
            </div>

            {adminModeUnlocked && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={loadTrustData}
                >
                  <RefreshCw size={13} style={{ marginRight: '5px' }} />
                  Refresh Claims Queue
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
                Ordinary creators and brands cannot approve verification claims. Enter the authorized reviewer credentials to access the compliance queue.
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
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>Total Queue</span>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {claimsList.length} Claims
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: '16px 20px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: '#8B5CF6', fontWeight: 700 }}>Pending Audit</span>
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
                Pending & Completed Audit Requests
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
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#7C3AED', background: 'rgba(124, 58, 237, 0.08)', padding: '2px 8px', borderRadius: '100px' }}>
                            Creator: {claim.creatorId}
                          </span>

                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '100px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`
                          }}>
                            {meta.label}
                          </span>

                          {claim.isPrivate && (
                            <span style={{ fontSize: '0.7rem', color: '#DC2626', background: 'rgba(220, 38, 38, 0.08)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
                              Sensitive ID Document
                            </span>
                          )}
                        </div>

                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.08rem', color: 'var(--text-primary)' }}>
                          {claim.claimTitle}
                        </h4>

                        <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px', fontSize: '0.82rem', marginBottom: '10px' }}>
                          <div style={{ marginBottom: '4px' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Evidence Type: </strong>
                            <span style={{ color: 'var(--text-secondary)' }}>{claim.evidenceType}</span>
                          </div>
                          {claim.evidenceDetails && Object.keys(claim.evidenceDetails).length > 0 && (
                            <div style={{ color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Details: </strong>
                              {JSON.stringify(claim.evidenceDetails)}
                            </div>
                          )}
                          {claim.reviewerNotes && (
                            <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(0,0,0,0.06)', color: 'var(--text-primary)' }}>
                              <strong>Audit Notes: </strong>
                              <em>{claim.reviewerNotes}</em>
                            </div>
                          )}
                        </div>

                        <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)' }}>
                          Submitted: {new Date(claim.createdAt).toLocaleString()} • {claim.reviewedBy ? `Last decision by ${claim.reviewedBy}` : 'Awaiting reviewer assignment'}
                        </div>
                      </div>

                      {/* Review Action Button */}
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setSelectedClaimForReview(claim);
                          setReviewActionForm({
                            decision: 'APPROVE',
                            notes: claim.reviewerNotes || '',
                            reviewerName: currentUser?.profile?.display_name || 'Ananya Roy (Lead Visual Auditor)'
                          });
                          setActiveModal('review-action');
                        }}
                      >
                        Audit / Change Decision
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Audit Trail Log */}
              <h3 className="font-editorial" style={{ fontSize: '1.3rem', marginBottom: '14px' }}>
                Immutable Audit Log
              </h3>

              <div style={{ background: '#FFFFFF', border: '1px solid var(--border-subtle)', borderRadius: '14px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Timestamp</th>
                      <th style={{ padding: '12px 16px' }}>Reviewer</th>
                      <th style={{ padding: '12px 16px' }}>Action</th>
                      <th style={{ padding: '12px 16px' }}>Notes / Rationales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogsList.map((log, i) => (
                      <tr key={log.id || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>
                          {new Date(log.createdAt || Date.now()).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                          {log.reviewerName}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '100px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: log.action === 'APPROVED' ? 'rgba(16, 185, 129, 0.12)' : (log.action === 'REJECTED' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(139, 92, 246, 0.12)'),
                            color: log.action === 'APPROVED' ? '#059669' : (log.action === 'REJECTED' ? '#DC2626' : '#7C3AED')
                          }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {log.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================
          MODALS & DRAWERS
          ======================================================== */}

      {/* 1. IDENTITY EVIDENCE MODAL */}
      {activeModal === 'identity' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} className="text-lavender" />
                <h3 className="font-editorial" style={{ margin: 0, fontSize: '1.4rem' }}>
                  Professional Identity Verification
                </h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'rgba(124, 58, 237, 0.08)', borderRadius: '12px', padding: '14px', fontSize: '0.84rem', color: '#7C3AED', marginBottom: '20px', display: 'flex', gap: '10px' }}>
              <Lock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Confidential Identity Protection: </strong>
                Your government identity documents are encrypted in private storage and strictly restricted to authorized compliance reviewers. They are never shared with or downloadable by hiring brands.
              </div>
            </div>

            <form onSubmit={handleSubmitIdentity}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Full Legal Name (as on government ID) *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={identityForm.legalName}
                  onChange={(e) => setIdentityForm({ ...identityForm, legalName: e.target.value })}
                  placeholder="e.g. Maya Li-Wei Chen"
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Issuing Country / Jurisdiction *
                  </label>
                  <select
                    className="form-input"
                    value={identityForm.issuingCountry}
                    onChange={(e) => setIdentityForm({ ...identityForm, issuingCountry: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px' }}
                  >
                    <option value="United Kingdom (GB)">United Kingdom (GB)</option>
                    <option value="United States (US)">United States (US)</option>
                    <option value="Germany (DE)">Germany (DE)</option>
                    <option value="France (FR)">France (FR)</option>
                    <option value="Canada (CA)">Canada (CA)</option>
                    <option value="Japan (JP)">Japan (JP)</option>
                    <option value="Other">Other Jurisdiction</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Document Type *
                  </label>
                  <select
                    className="form-input"
                    value={identityForm.documentType}
                    onChange={(e) => setIdentityForm({ ...identityForm, documentType: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px' }}
                  >
                    <option value="Passport">Passport</option>
                    <option value="National Identity Card">National Identity Card</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Document Reference / Last 4 Digits
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={identityForm.documentNumber}
                  onChange={(e) => setIdentityForm({ ...identityForm, documentNumber: e.target.value })}
                  placeholder="e.g. 8941"
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Confidential Identity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PORTFOLIO AUTHENTICITY EVIDENCE MODAL */}
      {activeModal === 'portfolio' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck2 size={20} className="text-lavender" />
                <h3 className="font-editorial" style={{ margin: 0, fontSize: '1.4rem' }}>
                  Submit Portfolio Authenticity Evidence
                </h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              <strong>Audit Policy: </strong>
              Submitting evidence references queues your item for manual inspection. Items enter <em>Pending Review</em> and are never automatically marked authentic upon upload.
            </div>

            <form onSubmit={handleSubmitPortfolioEvidence}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Associate with Portfolio Project *
                </label>
                <select
                  required
                  className="form-input"
                  value={portfolioForm.projectId}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, projectId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px' }}
                >
                  {(activeCreator?.projects || []).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.category || 'Visual'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Evidence Reference Type *
                </label>
                <select
                  className="form-input"
                  value={portfolioForm.evidenceType}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, evidenceType: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px' }}
                >
                  <option value="ComfyUI JSON Graph & Seed Logs">ComfyUI JSON Generation Graph & Seed Logs</option>
                  <option value="Raw Project Files (.blend, .c4d, .exr)">Raw 3D Project Files (.blend, .c4d, .exr)</option>
                  <option value="4K ProRes Master Timeline Passes">4K Uncompressed ProRes Master Timeline</option>
                  <option value="Layered PSD Separation Passes">Layered PSD Lighting Separation Passes</option>
                  <option value="Prompt History & Generation Seed Sheet">Prompt History & Generation Seed Sheet</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Artifact Storage URL or Public Archive Link
                </label>
                <input
                  type="url"
                  className="form-input"
                  value={portfolioForm.artifactUrl}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, artifactUrl: e.target.value })}
                  placeholder="https://vault.alloy.market/audit/your_project.zip"
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Process Description & Authorship Notes
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={portfolioForm.description}
                  onChange={(e) => setPortfolioForm({ ...portfolioForm, description: e.target.value })}
                  placeholder="Detail your workflow seeds, node setup, and human directional steps..."
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit for Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. AI TOOL & WORKFLOW CLAIM MODAL */}
      {activeModal === 'tool' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={20} className="text-lavender" />
                <h3 className="font-editorial" style={{ margin: 0, fontSize: '1.4rem' }}>
                  Declare AI Tool or Workflow Claim
                </h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitToolDeclaration}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Tool / Foundational Model Name *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={toolForm.toolName}
                  onChange={(e) => setToolForm({ ...toolForm, toolName: e.target.value })}
                  placeholder="e.g. Runway Gen-3 Alpha, Midjourney v6.1, Flux.1 Schnell"
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Primary Use Case & Role in Pipeline *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={toolForm.useCase}
                  onChange={(e) => setToolForm({ ...toolForm, useCase: e.target.value })}
                  placeholder="e.g. Kinetic camera trajectory synthesis and macro texture passes"
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Associated Portfolio Deliverable
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={toolForm.associatedWork}
                  onChange={(e) => setToolForm({ ...toolForm, associatedWork: e.target.value })}
                  placeholder="e.g. Echoes of the Solarium"
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Supporting Evidence Note (Optional — moves from Self-Declared to Pending Review)
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={toolForm.evidenceNote}
                  onChange={(e) => setToolForm({ ...toolForm, evidenceNote: e.target.value })}
                  placeholder="Provide seed logs or export timestamps to verify claim..."
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Tool Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. COMMERCIAL LICENSING MODAL */}
      {activeModal === 'licensing' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} className="text-lavender" />
                <h3 className="font-editorial" style={{ margin: 0, fontSize: '1.4rem' }}>
                  Commercial Usage Rights Declaration
                </h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'rgba(217, 119, 6, 0.08)', borderRadius: '12px', padding: '12px', fontSize: '0.82rem', color: '#B45309', marginBottom: '18px' }}>
              <strong>Truthful Warranty Notice: </strong>
              The platform audits whether declared foundational AI models permit commercial outputs under their terms of service. This disclosure does not constitute automated copyright indemnity or legal advice.
            </div>

            <form onSubmit={handleSubmitLicensing}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Commercial Model Clearance Declaration *
                </label>
                <textarea
                  required
                  className="form-input"
                  rows={3}
                  value={licensingForm.modelRightsDeclaration}
                  onChange={(e) => setLicensingForm({ ...licensingForm, modelRightsDeclaration: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Standard License Scope Granted
                  </label>
                  <select
                    className="form-input"
                    value={licensingForm.licenseTypeGranted}
                    onChange={(e) => setLicensingForm({ ...licensingForm, licenseTypeGranted: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px' }}
                  >
                    <option value="Full Commercial Buyout (Worldwide Digital, OOH, Paid Media)">Full Commercial Buyout</option>
                    <option value="Digital Media Commercial Buyout (Online Only)">Digital Media Buyout</option>
                    <option value="Social & Web Paid Advertising Rights">Social & Paid Ads</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Category Exclusivity Period
                  </label>
                  <select
                    className="form-input"
                    value={licensingForm.exclusivityPeriod}
                    onChange={(e) => setLicensingForm({ ...licensingForm, exclusivityPeriod: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px' }}
                  >
                    <option value="12 Months Category Exclusivity">12 Months Exclusivity</option>
                    <option value="6 Months Category Exclusivity">6 Months Exclusivity</option>
                    <option value="Non-Exclusive Commercial Rights">Non-Exclusive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Disclosures
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. BADGE DETAIL MODAL (Public explanation from badge clicks) */}
      {activeModal === 'badge-detail' && selectedBadgeForDetail && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-editorial" style={{ margin: 0, fontSize: '1.3rem' }}>
                    {selectedBadgeForDetail.title}
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                    {selectedBadgeForDetail.category}
                  </span>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Current Status Pill */}
            <div style={{ marginBottom: '16px' }}>
              <span style={{
                padding: '4px 12px',
                borderRadius: '100px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: STATUS_META[selectedBadgeForDetail.status]?.bg,
                color: STATUS_META[selectedBadgeForDetail.status]?.color
              }}>
                Current Status: {STATUS_META[selectedBadgeForDetail.status]?.label}
              </span>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
              {selectedBadgeForDetail.description}
            </p>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px', fontSize: '0.84rem', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  What Was Checked:
                </strong>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {selectedBadgeForDetail.whatWasChecked}
                </span>
              </div>

              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Audit Criteria:
                </strong>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {selectedBadgeForDetail.criteria}
                </span>
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}>
                <strong style={{ display: 'block', color: '#D97706', marginBottom: '2px' }}>
                  Truthful Limitations:
                </strong>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                  {selectedBadgeForDetail.limitations}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ADMIN REVIEW ACTION MODAL */}
      {activeModal === 'review-action' && selectedClaimForReview && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={20} className="text-lavender" />
                <h3 className="font-editorial" style={{ margin: 0, fontSize: '1.4rem' }}>
                  Audit Review Action
                </h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '14px', marginBottom: '18px', fontSize: '0.84rem' }}>
              <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Target: {selectedClaimForReview.claimTitle}
              </strong>
              <div style={{ color: 'var(--text-secondary)' }}>
                Creator: <strong>{selectedClaimForReview.creatorId}</strong> • Type: {selectedClaimForReview.claimType}
              </div>
              {selectedClaimForReview.evidenceUrl && (
                <div style={{ marginTop: '6px' }}>
                  <a href={selectedClaimForReview.evidenceUrl} target="_blank" rel="noreferrer" style={{ color: '#7C3AED', fontWeight: 600 }}>
                    Open Supporting Artifact URL ↗
                  </a>
                </div>
              )}
            </div>

            <form onSubmit={handleExecuteReview}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Review Decision *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setReviewActionForm({ ...reviewActionForm, decision: 'APPROVE' })}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: reviewActionForm.decision === 'APPROVE' ? '2px solid #059669' : '1px solid var(--border-subtle)',
                      background: reviewActionForm.decision === 'APPROVE' ? 'rgba(16, 185, 129, 0.12)' : '#FFFFFF',
                      color: reviewActionForm.decision === 'APPROVE' ? '#059669' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Approve (Verified)
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewActionForm({ ...reviewActionForm, decision: 'REQUEST_INFO' })}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: reviewActionForm.decision === 'REQUEST_INFO' ? '2px solid #EA580C' : '1px solid var(--border-subtle)',
                      background: reviewActionForm.decision === 'REQUEST_INFO' ? 'rgba(234, 88, 12, 0.12)' : '#FFFFFF',
                      color: reviewActionForm.decision === 'REQUEST_INFO' ? '#EA580C' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Request Info
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewActionForm({ ...reviewActionForm, decision: 'REJECT' })}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: reviewActionForm.decision === 'REJECT' ? '2px solid #DC2626' : '1px solid var(--border-subtle)',
                      background: reviewActionForm.decision === 'REJECT' ? 'rgba(220, 38, 38, 0.12)' : '#FFFFFF',
                      color: reviewActionForm.decision === 'REJECT' ? '#DC2626' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Reject Claim
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Auditor Name / Authority *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={reviewActionForm.reviewerName}
                  onChange={(e) => setReviewActionForm({ ...reviewActionForm, reviewerName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Internal Review Notes & Audit Rationales *
                </label>
                <textarea
                  required
                  className="form-input"
                  rows={3}
                  value={reviewActionForm.notes}
                  onChange={(e) => setReviewActionForm({ ...reviewActionForm, notes: e.target.value })}
                  placeholder="Record what parameters or metadata files were inspected..."
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Commit Review Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
