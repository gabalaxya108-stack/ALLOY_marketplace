// src/components/admin/AdminAlloyTrust.jsx
// ALLOY — AlloyTrust Trust & Safety Command Center & Intelligence Engine
// Features: Dual-mode with Trust Orbit Verification Claims Review & Fraud Surveillance
// Theme: ALLOY Luxury Editorial Theme • Warm Ivory, Deep Forest Green & Muted Bronze

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRight,
  Clock,
  Lock,
  RefreshCw,
  Search,
  X,
  FileText,
  UserCheck,
  Building2,
  Cpu,
  FileCheck,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import {
  getRiskBadgeColor,
  SIGNAL_CATALOG,
  RISK_THRESHOLDS
} from '../../services/alloyTrustEngine';
import {
  fetchAdminVerificationClaims,
  reviewAdminVerificationClaim,
  triggerAdminVerificationAiReview
} from '../../services/adminApi';

const PILLAR_META = {
  identity: { label: 'Identity Verification', icon: UserCheck, color: '#2563EB' },
  portfolio: { label: 'Portfolio Authenticity', icon: ShieldCheck, color: '#214C35' },
  ai_tools: { label: 'AI Tool Transparency', icon: Cpu, color: '#7C3AED' },
  commercial_rights: { label: 'Commercial Rights', icon: FileCheck, color: '#99714F' }
};

// Safe helper to resolve pillar metadata
function resolvePillar(claim) {
  const rawPillar = claim?.pillar || claim?.claimType || claim?.claim_type || '';
  if (PILLAR_META[rawPillar]) {
    return PILLAR_META[rawPillar];
  }
  const cleanLabel = rawPillar
    ? rawPillar.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Verification Claim';
  return { label: cleanLabel, icon: FileCheck, color: '#99714F' };
}

// Safe helper to resolve submitter entity info
function resolveEntityInfo(claim) {
  if (!claim) {
    return { isBrand: false, name: 'Not specified', id: 'Not specified', typeLabel: 'Not specified' };
  }
  const isBrand =
    claim.entity_type === 'brand' ||
    claim.entityType === 'brand' ||
    (claim.brandId && !claim.creatorId) ||
    (claim.brand_id && !claim.creator_id);

  const name =
    claim.entity_name ||
    claim.entityName ||
    claim.creator_name ||
    claim.brand_name ||
    claim.creatorId ||
    claim.brandId ||
    claim.entityId ||
    'Not specified';

  const id =
    claim.creatorId ||
    claim.creator_id ||
    claim.brandId ||
    claim.brand_id ||
    claim.entityId ||
    claim.entity_id ||
    claim.id ||
    'Not specified';

  const typeLabel = isBrand ? 'Brand Partner' : 'Creator Account';

  return { isBrand, name, id, typeLabel };
}

// Safe date formatter (never fabricates or substitutes current time)
function formatDate(dateVal) {
  if (!dateVal) return 'Not specified';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Not specified';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return 'Not specified';
  }
}

function formatDateTime(dateVal) {
  if (!dateVal) return 'Not specified';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Not specified';
    return d.toLocaleString();
  } catch {
    return 'Not specified';
  }
}

// Safe confidence formatter (GUARANTEED NEVER TO RETURN NaN%)
function formatConfidence(conf) {
  if (conf === null || conf === undefined || conf === '') return null;
  if (typeof conf === 'number') {
    if (isNaN(conf)) return null;
    const pct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
    return `${pct}%`;
  }
  if (typeof conf === 'string') {
    const cleaned = conf.trim().toLowerCase();
    if (cleaned === 'high') return 'High';
    if (cleaned === 'moderate' || cleaned === 'medium') return 'Moderate';
    if (cleaned === 'low') return 'Low';
    const parsed = parseFloat(cleaned.replace('%', ''));
    if (!isNaN(parsed)) {
      const pct = parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
      return `${pct}%`;
    }
  }
  return null;
}

// Safe risk badge styling
function getRiskStyle(riskIndicator) {
  const r = (riskIndicator || '').toLowerCase();
  if (r === 'low') {
    return {
      label: 'Low Risk',
      bg: 'rgba(33, 76, 53, 0.08)',
      color: '#214C35',
      border: 'rgba(33, 76, 53, 0.25)'
    };
  }
  if (r === 'moderate' || r === 'medium') {
    return {
      label: 'Moderate Risk',
      bg: 'rgba(180, 133, 48, 0.1)',
      color: '#926114',
      border: 'rgba(180, 133, 48, 0.3)'
    };
  }
  if (r === 'high' || r === 'critical') {
    return {
      label: 'High Risk',
      bg: 'rgba(220, 38, 38, 0.08)',
      color: '#B91C1C',
      border: 'rgba(220, 38, 38, 0.25)'
    };
  }
  return {
    label: 'Inconclusive',
    bg: '#F2E8DF',
    color: '#77716A',
    border: '#D5CCC0'
  };
}

export default function AdminAlloyTrust({
  reports = [],
  onSubmitDecision,
  onRunTrustScan
}) {
  // Mode switcher: 'claims' (Trust Orbit claims review) vs 'surveillance' (Risk reports)
  const [activeSubTab, setActiveSubTab] = useState('claims');

  // Verification Claims State
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [claimsSearch, setClaimsSearch] = useState('');
  const [claimsEntityType, setClaimsEntityType] = useState('all');
  const [claimsPillar, setClaimsPillar] = useState('all');
  const [claimsStatus, setClaimsStatus] = useState('all');
  const [claimsRisk, setClaimsRisk] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimDecisionNotes, setClaimDecisionNotes] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [aiReviewInProgress, setAiReviewInProgress] = useState(false);
  const [reviewMessage, setReviewMessage] = useState(null);

  // Surveillance State (Legacy)
  const [selectedReport, setSelectedReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [scanRunning, setScanRunning] = useState(false);

  // Load verification claims
  const loadClaims = useCallback(async () => {
    setLoadingClaims(true);
    try {
      const res = await fetchAdminVerificationClaims({});
      if (res && res.ok && Array.isArray(res.claims)) {
        setClaims(res.claims);
      }
    } catch (err) {
      console.warn('[AdminAlloyTrust] Error loading verification claims:', err);
    } finally {
      setLoadingClaims(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // Filter verification claims
  const filteredClaims = claims.filter((c) => {
    const entityInfo = resolveEntityInfo(c);
    const pillarInfo = resolvePillar(c);
    const claimId = c.id || '';
    const matchesSearch =
      entityInfo.name.toLowerCase().includes(claimsSearch.toLowerCase()) ||
      claimId.toLowerCase().includes(claimsSearch.toLowerCase()) ||
      pillarInfo.label.toLowerCase().includes(claimsSearch.toLowerCase());

    const matchesEntity =
      claimsEntityType === 'all' ||
      (claimsEntityType === 'brand' && entityInfo.isBrand) ||
      (claimsEntityType === 'creator' && !entityInfo.isBrand);

    const rawPillar = c.pillar || c.claimType || c.claim_type || '';
    const matchesPillar = claimsPillar === 'all' || rawPillar === claimsPillar;
    const matchesStatus = claimsStatus === 'all' || c.status === claimsStatus;

    const aiReview = c.ai_review || c.aiReview || {};
    const risk = (aiReview.risk_indicator || 'unknown').toLowerCase();
    const matchesRisk =
      claimsRisk === 'all' ||
      risk === claimsRisk ||
      (claimsRisk === 'moderate' && risk === 'medium');

    return matchesSearch && matchesEntity && matchesPillar && matchesStatus && matchesRisk;
  });

  const pendingClaimsCount = claims.filter((c) => c.status === 'pending_review').length;

  // Execute verification decision
  const handleExecuteClaimDecision = async (decision) => {
    if (!selectedClaim) return;
    if (!claimDecisionNotes.trim()) {
      alert('Please enter a decision memo to document the justification for this audit decision.');
      return;
    }

    setActionInProgress(true);
    setReviewMessage(null);
    try {
      const res = await reviewAdminVerificationClaim({
        claimId: selectedClaim.id,
        decision,
        notes: claimDecisionNotes.trim(),
        reviewerName: 'Super Admin'
      });

      if (res && res.ok) {
        setReviewMessage({
          type: 'success',
          text: `Claim ${selectedClaim.id} successfully updated to "${decision.toUpperCase()}".`
        });
        // Update local claims state immediately
        setClaims((prev) =>
          prev.map((c) =>
            c.id === selectedClaim.id
              ? {
                  ...c,
                  status: decision,
                  reviewer_notes: claimDecisionNotes.trim(),
                  reviewerNotes: claimDecisionNotes.trim(),
                  reviewed_at: new Date().toISOString()
                }
              : c
          )
        );
        setSelectedClaim(null);
        setClaimDecisionNotes('');
        await loadClaims();
      } else {
        setReviewMessage({
          type: 'error',
          text: res?.error || 'Failed to record decision.'
        });
      }
    } catch (err) {
      setReviewMessage({
        type: 'error',
        text: err.message || 'An error occurred while executing review decision.'
      });
    } finally {
      setActionInProgress(false);
    }
  };

  // Re-run AI assessment
  const handleTriggerAiReview = async (claimId) => {
    setAiReviewInProgress(true);
    try {
      const res = await triggerAdminVerificationAiReview({ claimId });
      if (res && res.ok && res.aiReview) {
        setSelectedClaim((prev) =>
          prev && prev.id === claimId
            ? { ...prev, ai_review: res.aiReview, aiReview: res.aiReview }
            : prev
        );
        setClaims((prev) =>
          prev.map((c) =>
            c.id === claimId ? { ...c, ai_review: res.aiReview, aiReview: res.aiReview } : c
          )
        );
      }
    } catch (err) {
      alert(`Evidence assessment notice: ${err.message}`);
    } finally {
      setAiReviewInProgress(false);
    }
  };

  // Surveillance Filter
  const filteredReports = reports.filter((rep) => {
    const matchesSearch =
      (rep.entity_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.summary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.id || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || rep.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || rep.risk_category === riskFilter;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  const handleExecuteDecision = async (decisionType) => {
    if (!selectedReport) return;
    setActionInProgress(true);

    try {
      await onSubmitDecision?.({
        reportId: selectedReport.id,
        decision: decisionType,
        notes: decisionNotes || `Super Admin executed ${decisionType.toUpperCase()} action.`,
        actionTaken:
          decisionType === 'approve'
            ? 'CLEARED_RISK'
            : decisionType === 'suspend'
            ? 'IMPOSED_RESTRICTION'
            : 'FLAGGED_MONITORING',
        entityId: selectedReport.entity_id,
        entityType: selectedReport.entity_type
      });
      setSelectedReport(null);
      setDecisionNotes('');
    } catch (err) {
      console.error('Error executing decision:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleTriggerScan = async () => {
    setScanRunning(true);
    try {
      await onRunTrustScan?.();
    } finally {
      setScanRunning(false);
    }
  };

  return (
    <div className="alloy-admin-section">
      {/* Top Hero Banner */}
      <div className="alloy-admin-trust-hero">
        <div className="alloy-admin-trust-hero-content">
          <div className="alloy-admin-hero-badge trust">
            <ShieldCheck size={14} />
            <span>ALLOY TRUST FRAMEWORK & VERIFICATION SUITE</span>
          </div>
          <h2 className="alloy-admin-section-title">AlloyTrust Command & Verification Center</h2>
          <p className="alloy-admin-section-sub">
            Advisory AI-assisted evidence analysis, multi-pillar verification dossiers, and human-in-the-loop audit authority.
          </p>
        </div>

        <div className="alloy-admin-hero-actions" style={{ display: 'flex', gap: '10px' }}>
          {activeSubTab === 'claims' ? (
            <button
              type="button"
              className="alloy-admin-btn-primary"
              onClick={loadClaims}
              disabled={loadingClaims}
            >
              <RefreshCw size={15} className={loadingClaims ? 'animate-spin' : ''} />
              <span>{loadingClaims ? 'Syncing Claims...' : 'Refresh Claims Queue'}</span>
            </button>
          ) : (
            <button
              type="button"
              className="alloy-admin-btn-primary"
              onClick={handleTriggerScan}
              disabled={scanRunning}
            >
              <RefreshCw size={15} className={scanRunning ? 'animate-spin' : ''} />
              <span>{scanRunning ? 'Analyzing Signals...' : 'Run Automated Platform Scan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          padding: '0 0 16px 0',
          borderBottom: '1px solid var(--admin-border-light, #E4DDD4)',
          marginBottom: '22px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('claims')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            background: activeSubTab === 'claims' ? '#FFFFFF' : 'transparent',
            border: activeSubTab === 'claims' ? '1.5px solid var(--admin-border-medium, #D5CCC0)' : '1.5px solid transparent',
            color: activeSubTab === 'claims' ? 'var(--admin-text-primary, #191816)' : 'var(--admin-text-secondary, #77716A)',
            fontWeight: activeSubTab === 'claims' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: activeSubTab === 'claims' ? 'var(--admin-shadow-xs, 0 1px 3px rgba(26, 25, 24, 0.04))' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <ShieldCheck size={16} color={activeSubTab === 'claims' ? '#99714F' : '#77716A'} />
          <span>Trust Orbit Verification Queue</span>
          {pendingClaimsCount > 0 && (
            <span
              style={{
                background: '#99714F',
                color: '#FFFFFF',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                marginLeft: '4px'
              }}
            >
              {pendingClaimsCount} pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('surveillance')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            background: activeSubTab === 'surveillance' ? '#FFFFFF' : 'transparent',
            border: activeSubTab === 'surveillance' ? '1.5px solid var(--admin-border-medium, #D5CCC0)' : '1.5px solid transparent',
            color: activeSubTab === 'surveillance' ? 'var(--admin-text-primary, #191816)' : 'var(--admin-text-secondary, #77716A)',
            fontWeight: activeSubTab === 'surveillance' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: activeSubTab === 'surveillance' ? 'var(--admin-shadow-xs, 0 1px 3px rgba(26, 25, 24, 0.04))' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <ShieldAlert size={16} color={activeSubTab === 'surveillance' ? '#99714F' : '#77716A'} />
          <span>Fraud & Escrow Risk Surveillance</span>
          {reports.length > 0 && (
            <span
              style={{
                background: '#EFE7DC',
                color: 'var(--admin-text-secondary, #77716A)',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
                marginLeft: '4px'
              }}
            >
              {reports.length}
            </span>
          )}
        </button>
      </div>

      {reviewMessage && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: reviewMessage.type === 'success' ? 'rgba(33, 76, 53, 0.08)' : 'rgba(220, 38, 38, 0.08)',
            border: reviewMessage.type === 'success' ? '1px solid rgba(33, 76, 53, 0.25)' : '1px solid rgba(220, 38, 38, 0.25)',
            color: reviewMessage.type === 'success' ? '#214C35' : '#B91C1C',
            fontSize: '0.88rem',
            fontWeight: 500
          }}
        >
          {reviewMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{reviewMessage.text}</span>
          <button
            type="button"
            onClick={() => setReviewMessage(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: TRUST ORBIT VERIFICATION CLAIMS QUEUE                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'claims' && (
        <>
          {/* Filter Bar */}
          <div className="alloy-admin-filter-bar">
            <div className="alloy-admin-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search claims by claimant name, ID, or pillar..."
                value={claimsSearch}
                onChange={(e) => setClaimsSearch(e.target.value)}
              />
              {claimsSearch && (
                <button type="button" onClick={() => setClaimsSearch('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="alloy-admin-filter-group" style={{ flexWrap: 'wrap' }}>
              <select
                value={claimsEntityType}
                onChange={(e) => setClaimsEntityType(e.target.value)}
                className="alloy-admin-select"
              >
                <option value="all">All Accounts (Creators & Brands)</option>
                <option value="creator">Creators Only</option>
                <option value="brand">Brands Only</option>
              </select>

              <select
                value={claimsPillar}
                onChange={(e) => setClaimsPillar(e.target.value)}
                className="alloy-admin-select"
              >
                <option value="all">All Orbit Pillars</option>
                <option value="identity">Identity Verification</option>
                <option value="portfolio">Portfolio Authenticity</option>
                <option value="ai_tools">AI Tool Transparency</option>
                <option value="commercial_rights">Commercial Rights</option>
              </select>

              <select
                value={claimsStatus}
                onChange={(e) => setClaimsStatus(e.target.value)}
                className="alloy-admin-select"
              >
                <option value="all">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="verified">Verified / Approved</option>
                <option value="needs_renewal">Needs Information</option>
                <option value="unable_to_verify">Rejected</option>
              </select>

              <select
                value={claimsRisk}
                onChange={(e) => setClaimsRisk(e.target.value)}
                className="alloy-admin-select"
              >
                <option value="all">All Evidence Risk Tiers</option>
                <option value="low">Low Risk (Favorable)</option>
                <option value="moderate">Moderate Risk (Caution)</option>
                <option value="high">High Risk (Anomalies)</option>
              </select>
            </div>
          </div>

          {/* Claims Table */}
          <div className="alloy-admin-table-container">
            <table className="alloy-admin-table">
              <thead>
                <tr>
                  <th>Claimant / Account</th>
                  <th>Orbit Pillar</th>
                  <th>Evidence Risk Assessment</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="alloy-admin-empty-cell">
                      {loadingClaims ? 'Loading verification submissions...' : 'No verification claims match current filters.'}
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => {
                    const pillarInfo = resolvePillar(claim);
                    const PillarIcon = pillarInfo.icon;
                    const entity = resolveEntityInfo(claim);
                    const aiReview = claim.ai_review || claim.aiReview || {};
                    const riskStyle = getRiskStyle(aiReview.risk_indicator);
                    const formattedConfidence = formatConfidence(aiReview.confidence);

                    const rawDate = claim.submitted_at || claim.submittedAt || claim.created_at || claim.createdAt;
                    const submittedDisplay = formatDate(rawDate);

                    return (
                      <tr
                        key={claim.id}
                        style={{
                          borderLeft: claim.status === 'pending_review' ? '3px solid #99714F' : 'none'
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: entity.isBrand ? 'rgba(59, 130, 246, 0.08)' : 'rgba(33, 76, 53, 0.08)',
                                border: entity.isBrand ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(33, 76, 53, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: entity.isBrand ? '#2563EB' : '#214C35',
                                flexShrink: 0
                              }}
                            >
                              {entity.isBrand ? <Building2 size={16} /> : <UserCheck size={16} />}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--admin-text-primary, #191816)', fontSize: '13px' }}>
                                {entity.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--admin-text-tertiary, #968F87)', fontFamily: 'var(--admin-font-mono)' }}>
                                {entity.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PillarIcon size={14} style={{ color: pillarInfo.color }} />
                            <span style={{ fontSize: '13px', color: 'var(--admin-text-primary, #191816)', fontWeight: 500 }}>
                              {pillarInfo.label}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                padding: '3px 9px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: riskStyle.bg,
                                color: riskStyle.color,
                                border: `1px solid ${riskStyle.border}`
                              }}
                            >
                              {riskStyle.label}
                            </span>
                            {formattedConfidence && (
                              <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary, #77716A)', fontWeight: 500 }}>
                                {formattedConfidence} conf
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--admin-text-secondary, #77716A)' }}>
                            {submittedDisplay}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`alloy-admin-status-badge ${
                              claim.status === 'verified' || claim.status === 'approved'
                                ? 'verified'
                                : claim.status === 'unable_to_verify' || claim.status === 'rejected'
                                ? 'restricted'
                                : 'warning'
                            }`}
                          >
                            {claim.status === 'verified' || claim.status === 'approved'
                              ? 'VERIFIED'
                              : claim.status === 'unable_to_verify' || claim.status === 'rejected'
                              ? 'REJECTED'
                              : claim.status === 'needs_renewal' || claim.status === 'needs_info'
                              ? 'NEEDS INFO'
                              : 'PENDING REVIEW'}
                          </span>
                        </td>

                        <td className="text-right">
                          <button
                            type="button"
                            className="alloy-admin-btn-table highlight"
                            onClick={() => {
                              setSelectedClaim(claim);
                              setClaimDecisionNotes(claim.reviewer_notes || claim.reviewerNotes || '');
                            }}
                          >
                            <Eye size={14} />
                            <span>Inspect Evidence</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Inspect Evidence / Trust Orbit Verification Dossier Modal */}
          {selectedClaim && (
            <div className="alloy-admin-modal-backdrop" onClick={() => setSelectedClaim(null)}>
              <div
                className="alloy-admin-modal-card wide"
                onClick={(e) => e.stopPropagation()}
                style={{
                  maxWidth: '840px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  background: '#FFFFFF',
                  border: '1.5px solid var(--admin-border-light, #E4DDD4)',
                  boxShadow: '0 24px 60px rgba(25, 24, 22, 0.16)'
                }}
              >
                {/* Modal Header */}
                <div className="alloy-admin-modal-header" style={{ borderBottom: '1px solid var(--admin-border-light, #E4DDD4)', paddingBottom: '16px', marginBottom: '20px' }}>
                  <div className="alloy-admin-modal-title-group">
                    <ShieldCheck size={24} style={{ color: '#99714F' }} />
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '1.3rem',
                          fontFamily: "var(--admin-font-editorial, 'Instrument Serif', Georgia, serif)",
                          fontWeight: 500,
                          color: 'var(--admin-text-primary, #191816)'
                        }}
                      >
                        Trust Orbit Verification Dossier
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--admin-text-secondary, #77716A)' }}>
                        Claim ID: <span style={{ fontFamily: 'var(--admin-font-mono)' }}>{selectedClaim.id}</span> • Pillar: <strong style={{ color: 'var(--admin-text-primary, #191816)' }}>{resolvePillar(selectedClaim).label}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="alloy-modal-close"
                    onClick={() => setSelectedClaim(null)}
                    style={{
                      background: 'var(--admin-bg-subtle, #FAF7F2)',
                      border: '1px solid var(--admin-border-light, #E4DDD4)',
                      borderRadius: '8px',
                      padding: '6px',
                      cursor: 'pointer',
                      color: 'var(--admin-text-secondary, #77716A)'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="alloy-admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* SECTION 1: Claim Details */}
                  {(() => {
                    const entity = resolveEntityInfo(selectedClaim);
                    const pillar = resolvePillar(selectedClaim);
                    const rawDate = selectedClaim.submitted_at || selectedClaim.submittedAt || selectedClaim.created_at || selectedClaim.createdAt;

                    return (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '14px',
                          background: 'var(--admin-bg-subtle, #FAF7F2)',
                          padding: '16px 20px',
                          borderRadius: '12px',
                          border: '1px solid var(--admin-border-light, #E4DDD4)'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary, #77716A)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px' }}>
                            Claimant Account
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--admin-text-primary, #191816)', fontWeight: 600 }}>
                            {entity.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-tertiary, #968F87)', fontFamily: 'var(--admin-font-mono)' }}>
                            {entity.typeLabel} • {entity.id}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary, #77716A)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px' }}>
                            Verification Pillar
                          </div>
                          <div style={{ fontSize: '14px', color: 'var(--admin-text-primary, #191816)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <pillar.icon size={15} style={{ color: pillar.color }} />
                            <span>{pillar.label}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary, #77716A)', marginTop: '2px' }}>
                            Claim Title: {selectedClaim.claimTitle || selectedClaim.claim_title || 'Formal Claim'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary, #77716A)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '4px' }}>
                            Current Review Status
                          </div>
                          <div>
                            <span
                              className={`alloy-admin-status-badge ${
                                selectedClaim.status === 'verified' || selectedClaim.status === 'approved'
                                  ? 'verified'
                                  : selectedClaim.status === 'unable_to_verify' || selectedClaim.status === 'rejected'
                                  ? 'restricted'
                                  : 'warning'
                              }`}
                            >
                              {selectedClaim.status === 'verified' || selectedClaim.status === 'approved'
                                ? 'VERIFIED'
                                : selectedClaim.status === 'unable_to_verify' || selectedClaim.status === 'rejected'
                                ? 'REJECTED'
                                : selectedClaim.status === 'needs_renewal' || selectedClaim.status === 'needs_info'
                                ? 'NEEDS INFO'
                                : 'PENDING REVIEW'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-tertiary, #968F87)', marginTop: '4px' }}>
                            Submitted: {formatDateTime(rawDate)}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SECTION 2: Submitted Evidence */}
                  {(() => {
                    const rawDetails = selectedClaim.evidence_details || selectedClaim.evidenceDetails || {};
                    const evidenceEntries = typeof rawDetails === 'object' && rawDetails !== null
                      ? Object.entries(rawDetails).filter(([k]) => k !== 'aiReview' && k !== 'ai_review')
                      : [];

                    const hasEvidence = evidenceEntries.length > 0 || !!selectedClaim.evidenceUrl || !!selectedClaim.evidence_url;

                    return (
                      <div
                        style={{
                          background: '#FFFFFF',
                          padding: '20px',
                          borderRadius: '12px',
                          border: '1.5px solid var(--admin-border-light, #E4DDD4)',
                          boxShadow: 'var(--admin-shadow-xs, 0 1px 3px rgba(26, 25, 24, 0.03))'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--admin-border-light, #E4DDD4)', paddingBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={17} style={{ color: '#99714F' }} />
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--admin-text-primary, #191816)', fontWeight: 600 }}>
                                Submitted Evidentiary Artifacts & Claims
                              </h4>
                              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--admin-text-secondary, #77716A)' }}>
                                Evidence artifacts and disclosures submitted for platform compliance review.
                              </p>
                            </div>
                          </div>
                          {selectedClaim.evidenceType && (
                            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: 'var(--admin-bg-muted, #F2E8DF)', color: '#99714F', fontWeight: 600 }}>
                              {selectedClaim.evidenceType}
                            </span>
                          )}
                        </div>

                        {hasEvidence ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(selectedClaim.evidenceUrl || selectedClaim.evidence_url) && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--admin-border-light, #E4DDD4)', fontSize: '13px' }}>
                                <span style={{ color: 'var(--admin-text-secondary, #77716A)', fontWeight: 600 }}>
                                  Artifact URL / Attachment:
                                </span>
                                <a
                                  href={selectedClaim.evidenceUrl || selectedClaim.evidence_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#99714F', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                >
                                  <span>View Artifact</span>
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            )}

                            {evidenceEntries.map(([key, val]) => {
                              const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                              const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
                              const isLink = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));

                              return (
                                <div
                                  key={key}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #F0EAE1',
                                    fontSize: '13px'
                                  }}
                                >
                                  <span style={{ color: 'var(--admin-text-secondary, #77716A)', fontWeight: 600, minWidth: '160px' }}>
                                    {label}:
                                  </span>
                                  <span style={{ color: 'var(--admin-text-primary, #191816)', fontWeight: 500, maxWidth: '65%', textAlign: 'right', wordBreak: 'break-word' }}>
                                    {isLink ? (
                                      <a
                                        href={val}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#99714F', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <span>{val}</span>
                                        <ExternalLink size={11} />
                                      </a>
                                    ) : (
                                      valStr
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '16px',
                              textAlign: 'center',
                              color: 'var(--admin-text-secondary, #77716A)',
                              fontStyle: 'italic',
                              background: 'var(--admin-bg-subtle, #FAF7F2)',
                              borderRadius: '8px',
                              border: '1px dashed var(--admin-border-medium, #D5CCC0)',
                              fontSize: '13px'
                            }}
                          >
                            No supporting evidence has been submitted for this claim.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* SECTION 3: AI-Assisted Evidence Assessment */}
                  {(() => {
                    const ai = selectedClaim.ai_review || selectedClaim.aiReview;
                    const hasAi = !!ai && (ai.risk_indicator || ai.status === 'completed');
                    const riskStyle = getRiskStyle(ai?.risk_indicator);
                    const formattedConfidence = formatConfidence(ai?.confidence);

                    return (
                      <div
                        style={{
                          background: '#F4F8F5',
                          border: '1.5px solid rgba(33, 76, 53, 0.25)',
                          borderRadius: '12px',
                          padding: '20px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '14px',
                            flexWrap: 'wrap',
                            gap: '12px',
                            borderBottom: '1px solid rgba(33, 76, 53, 0.15)',
                            paddingBottom: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(33, 76, 53, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#214C35'
                              }}
                            >
                              <Sparkles size={17} />
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#214C35', fontWeight: 700 }}>
                                AI-Assisted Evidence Assessment
                              </h4>
                              <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary, #77716A)' }}>
                                Advisory analysis for Super Admin audit review • Vendor-neutral automated evaluation
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {hasAi && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '4px 10px',
                                  borderRadius: '999px',
                                  background: riskStyle.bg,
                                  border: `1px solid ${riskStyle.border}`
                                }}
                              >
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: riskStyle.color }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: riskStyle.color }}>
                                  {riskStyle.label}
                                </span>
                                {formattedConfidence && (
                                  <span style={{ fontSize: '11px', color: 'var(--admin-text-secondary, #77716A)', fontWeight: 600 }}>
                                    ({formattedConfidence} conf)
                                  </span>
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleTriggerAiReview(selectedClaim.id)}
                              disabled={aiReviewInProgress}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                padding: '6px 12px',
                                background: '#FFFFFF',
                                border: '1px solid var(--admin-border-medium, #D5CCC0)',
                                color: 'var(--admin-text-primary, #191816)',
                                borderRadius: '6px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <RefreshCw size={12} className={aiReviewInProgress ? 'animate-spin' : ''} />
                              <span>{aiReviewInProgress ? 'Reassessing...' : 'Reassess Evidence'}</span>
                            </button>
                          </div>
                        </div>

                        {hasAi ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Assessment Findings */}
                            {Array.isArray(ai.findings) && ai.findings.length > 0 && (
                              <div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#214C35', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                  Assessment Findings:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--admin-text-primary, #191816)', lineHeight: 1.6 }}>
                                  {ai.findings.map((f, i) => (
                                    <li key={i}>{f}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Evidence Required */}
                            {Array.isArray(ai.missing_evidence) && ai.missing_evidence.length > 0 && (
                              <div
                                style={{
                                  background: '#FFFBEB',
                                  padding: '12px 16px',
                                  borderRadius: '8px',
                                  border: '1px solid #FDE68A'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                  <AlertTriangle size={14} />
                                  <span>Evidence Required:</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#92400E', lineHeight: 1.55 }}>
                                  {ai.missing_evidence.map((m, i) => (
                                    <li key={i}>{m}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Inconsistencies */}
                            {Array.isArray(ai.inconsistencies) && ai.inconsistencies.length > 0 && (
                              <div
                                style={{
                                  background: '#FEF2F2',
                                  padding: '12px 16px',
                                  borderRadius: '8px',
                                  border: '1px solid #FECACA'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                                  <AlertTriangle size={14} />
                                  <span>Inconsistencies Identified:</span>
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#B91C1C', lineHeight: 1.55 }}>
                                  {ai.inconsistencies.map((inc, i) => (
                                    <li key={i}>{inc}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Advisory notes */}
                            {ai.advisory_notes && (
                              <div
                                style={{
                                  fontSize: '13px',
                                  color: 'var(--admin-text-primary, #191816)',
                                  fontStyle: 'italic',
                                  background: 'rgba(33, 76, 53, 0.05)',
                                  borderLeft: '3px solid #214C35',
                                  padding: '10px 14px',
                                  borderRadius: '0 8px 8px 0',
                                  lineHeight: 1.55
                                }}
                              >
                                "{ai.advisory_notes}"
                              </div>
                            )}

                            <div style={{ fontSize: '11px', color: 'var(--admin-text-secondary, #77716A)', borderTop: '1px solid rgba(33, 76, 53, 0.12)', paddingTop: '8px' }}>
                              Advisory only: Automated assessment assists reviewer evaluation. Verification authority remains exclusively with Super Admin.
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '16px',
                              textAlign: 'center',
                              color: 'var(--admin-text-secondary, #77716A)',
                              fontSize: '13px',
                              background: '#FFFFFF',
                              borderRadius: '8px',
                              border: '1px dashed var(--admin-border-medium, #D5CCC0)'
                            }}
                          >
                            AI assessment has not been generated yet for this claim. Click "Reassess Evidence" to run automated evaluation.
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* SECTION 4: Super Admin Decision Controls */}
                  <div
                    style={{
                      background: 'var(--admin-bg-subtle, #FAF7F2)',
                      border: '1.5px solid var(--admin-border-medium, #D5CCC0)',
                      borderRadius: '12px',
                      padding: '20px'
                    }}
                  >
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#99714F',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '8px'
                      }}
                    >
                      Super Admin Final Decision Memo (Mandatory & Audit-Logged)
                    </label>

                    <textarea
                      rows={3}
                      className="alloy-admin-textarea"
                      placeholder="Enter verification audit notes, grounds for approval, or specific missing evidence requested from submitter..."
                      value={claimDecisionNotes}
                      onChange={(e) => setClaimDecisionNotes(e.target.value)}
                      style={{ width: '100%', marginBottom: '16px' }}
                    />

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={actionInProgress}
                        onClick={() => handleExecuteClaimDecision('approved')}
                        style={{
                          flex: 1,
                          minWidth: '180px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          background: '#214C35',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Approve & Verify Pillar</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionInProgress}
                        onClick={() => handleExecuteClaimDecision('needs_info')}
                        style={{
                          flex: 1,
                          minWidth: '180px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          background: '#99714F',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <HelpCircle size={16} />
                        <span>Request Additional Info</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionInProgress}
                        onClick={() => handleExecuteClaimDecision('rejected')}
                        style={{
                          flex: 1,
                          minWidth: '180px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          background: '#FFF1F2',
                          color: '#B91C1C',
                          border: '1px solid #FECDD3',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <XCircle size={16} />
                        <span>Reject Claim</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALLOYTRUST FRAUD & ESCROW SURVEILLANCE                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'surveillance' && (
        <>
          {/* Signal Weight Catalog Preview */}
          <div className="alloy-admin-panel catalog-strip">
            <div className="alloy-admin-strip-title">Active Safety Signal Catalog:</div>
            <div className="alloy-admin-signals-scroll">
              {SIGNAL_CATALOG.map((sig) => (
                <div key={sig.id} className="alloy-admin-signal-pill">
                  <span className="dot" />
                  <span className="name">{sig.name}</span>
                  <span className="weight">+{sig.defaultWeight} pts</span>
                </div>
              ))}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="alloy-admin-filter-bar">
            <div className="alloy-admin-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search reports by entity name, ID, or incident summary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')}>
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="alloy-admin-filter-group">
              <Filter size={14} />
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="alloy-admin-select"
              >
                <option value="all">All Risk Tiers</option>
                <option value="critical">Critical (85-100)</option>
                <option value="high">High (60-84)</option>
                <option value="moderate">Moderate (30-59)</option>
                <option value="low">Low (0-29)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="alloy-admin-select"
              >
                <option value="all">All Statuses</option>
                <option value="needs_review">Needs Review</option>
                <option value="under_investigation">Under Investigation</option>
                <option value="restricted">Restricted / Quarantined</option>
                <option value="cleared">Cleared / Approved</option>
              </select>
            </div>
          </div>

          {/* Reports Table */}
          <div className="alloy-admin-table-container">
            <table className="alloy-admin-table">
              <thead>
                <tr>
                  <th>Risk Score</th>
                  <th>Flagged Entity</th>
                  <th>Type</th>
                  <th>Incident Summary</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="alloy-admin-empty-cell">
                      No risk reports found matching query filters.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const badge = getRiskBadgeColor(report.risk_category);
                    return (
                      <tr key={report.id} className={report.risk_category === 'critical' ? 'row-critical' : ''}>
                        <td>
                          <div className="alloy-admin-score-cell">
                            <span
                              className="alloy-admin-score-badge"
                              style={{
                                backgroundColor: badge.bg,
                                color: badge.text,
                                borderColor: badge.border
                              }}
                            >
                              {report.risk_score}
                            </span>
                            <span className="alloy-admin-score-tier" style={{ color: badge.text }}>
                              {report.risk_category?.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--admin-text-primary, #191816)' }}>{report.entity_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--admin-text-tertiary, #968F87)', fontFamily: 'var(--admin-font-mono)' }}>{report.id}</div>
                        </td>
                        <td>
                          <span className="alloy-admin-pill-neutral">
                            {report.entity_type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ maxWidth: '400px', fontSize: '13px', color: 'var(--admin-text-primary, #191816)' }}>
                          {report.summary}
                        </td>
                        <td>
                          <span className={`alloy-admin-status-badge ${report.status === 'cleared' ? 'verified' : report.status === 'restricted' ? 'restricted' : 'warning'}`}>
                            {report.status?.replace('_', ' ')?.toUpperCase()}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="alloy-admin-btn-table highlight"
                            onClick={() => setSelectedReport(report)}
                          >
                            <Eye size={14} />
                            <span>Investigate</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Investigation Dossier & Decision Drawer */}
          {selectedReport && (
            <div className="alloy-admin-modal-backdrop" onClick={() => setSelectedReport(null)}>
              <div className="alloy-admin-modal-card wide" onClick={(e) => e.stopPropagation()}>
                <div className="alloy-admin-modal-header">
                  <div className="alloy-admin-modal-title-group">
                    <ShieldAlert size={22} className="text-amber-400" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: "var(--admin-font-editorial, 'Instrument Serif', Georgia, serif)", color: 'var(--admin-text-primary, #191816)' }}>
                        AlloyTrust Incident Dossier: {selectedReport.id}
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--admin-text-secondary, #77716A)' }}>
                        Target Entity: <strong style={{ color: 'var(--admin-text-primary, #191816)' }}>{selectedReport.entity_name}</strong> ({selectedReport.entity_type})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="alloy-modal-close"
                    onClick={() => setSelectedReport(null)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="alloy-admin-modal-body">
                  {/* Risk Level Banner */}
                  <div className="alloy-admin-investigate-score-box">
                    <div className="flex items-center gap-4">
                      <div
                        className="alloy-admin-investigate-score-circle"
                        style={{
                          borderColor: getRiskBadgeColor(selectedReport.risk_category).text,
                          color: getRiskBadgeColor(selectedReport.risk_category).text
                        }}
                      >
                        <span className="text-3xl font-mono font-bold">{selectedReport.risk_score}</span>
                        <span className="text-[10px] uppercase font-mono tracking-wider">/ 100</span>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--admin-text-primary, #191816)' }}>
                          Risk Stratification: {selectedReport.risk_category?.toUpperCase()}
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--admin-text-secondary, #77716A)' }}>
                          Computed from deterministic integrity rules, velocity analysis, and behavioral heuristics.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Signals Breakdown */}
                  <div className="alloy-admin-investigate-signals mt-4">
                    <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--admin-text-secondary, #77716A)', fontFamily: 'var(--admin-font-mono)', marginBottom: '8px' }}>
                      Triggered Intelligence Signals
                    </h4>
                    <div className="alloy-admin-signals-list">
                      {(selectedReport.signals && selectedReport.signals.length > 0) ? (
                        selectedReport.signals.map((sig, idx) => (
                          <div key={idx} className="alloy-admin-signal-row">
                            <div className="alloy-admin-signal-name">
                              <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                              <span>{sig.name || sig.id}</span>
                            </div>
                            <div className="alloy-admin-signal-detail">{sig.details}</div>
                            <div className="alloy-admin-signal-pts">+{sig.impact || 20} pts</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--admin-text-tertiary, #968F87)', padding: '8px 0' }}>
                          No high-severity individual signals logged; composite threshold evaluation.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reasoning Summary */}
                  <div className="alloy-admin-brief-box mt-4" style={{ background: 'var(--admin-bg-subtle, #FAF7F2)', border: '1px solid var(--admin-border-light, #E4DDD4)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--admin-text-secondary, #77716A)', fontFamily: 'var(--admin-font-mono)', marginBottom: '4px', fontWeight: 600 }}>
                      AlloyTrust Synthesis & Context
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--admin-text-primary, #191816)', lineHeight: 1.55 }}>
                      {selectedReport.summary}
                    </p>
                  </div>

                  {/* Decision Notes */}
                  <div className="alloy-admin-decision-notes-section mt-4">
                    <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: 'var(--admin-text-secondary, #77716A)', fontFamily: 'var(--admin-font-mono)', marginBottom: '6px', fontWeight: 600 }}>
                      Super Admin Decision Memo (Audit Immutable)
                    </label>
                    <textarea
                      className="alloy-admin-textarea"
                      rows={2}
                      placeholder="Record formal justification for the decision..."
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="alloy-admin-investigate-actions mt-6">
                    <button
                      type="button"
                      className="alloy-admin-btn-action clear"
                      disabled={actionInProgress}
                      onClick={() => handleExecuteDecision('approve')}
                    >
                      <CheckCircle2 size={16} />
                      <span>Clear & Approve Entity</span>
                    </button>

                    <button
                      type="button"
                      className="alloy-admin-btn-action monitor"
                      disabled={actionInProgress}
                      onClick={() => handleExecuteDecision('flag')}
                    >
                      <Eye size={16} />
                      <span>Flag for Active Monitoring</span>
                    </button>

                    <button
                      type="button"
                      className="alloy-admin-btn-action restrict"
                      disabled={actionInProgress}
                      onClick={() => handleExecuteDecision('suspend')}
                    >
                      <Lock size={16} />
                      <span>Impose Quarantine / Freeze</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
