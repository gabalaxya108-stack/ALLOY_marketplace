// src/components/TrustOrbit.jsx
// ALLOY Trust Orbit — Interactive animated verification system
// Features:
// - Central stable emblem with ALLOY TRUST FRAMEWORK label and fine concentric orbital rings
// - Four orbital satellite nodes: Identity, Authenticity, AI Tools & Workflow, Commercial Rights
// - Honest verification-status indicators derived from live database claims
// - Integrated desktop orbit & connected-node vertical sequence on mobile
// - Expandable pillar inspector showing submitted evidence metadata, AI advisory findings, and reviewer notes

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  FileCheck2,
  Cpu,
  Lock,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Info,
  RefreshCw,
  FileText,
  ChevronRight,
  Layers
} from 'lucide-react';
import {
  VERIFICATION_STATUSES,
  STATUS_META
} from '../data/trustVerificationData.js';

export default function TrustOrbit({
  trustData = {},
  claims = [],
  onOpenSubmissionModal,
  currentUser = null,
  isBrand = false,
  entityName = 'Creator',
  onRefresh = null
}) {
  const [selectedPillarId, setSelectedPillarId] = useState('identity');
  const [hoveredPillarId, setHoveredPillarId] = useState(null);

  // Four Canonical Pillars Definition
  const pillars = useMemo(() => [
    {
      id: 'identity',
      claimType: 'identity',
      title: 'Identity',
      subtitle: isBrand ? 'Corporate Legal Entity' : 'Identity & Personhood',
      description: isBrand
        ? 'Verified corporate domain email authentication and official business registration records in confidential compliance review.'
        : 'Cryptographic email verification challenge and confidential legal personhood check without exposing private documents.',
      icon: UserCheck,
      modalType: 'identity',
      orbitAngle: 315, // Top Right
      positionStyle: { top: '8%', right: '12%' },
      color: '#059669',
      accentBg: 'rgba(5, 150, 105, 0.08)'
    },
    {
      id: 'authenticity',
      claimType: 'portfolio',
      title: 'Authenticity',
      subtitle: isBrand ? 'Campaign Brief Integrity' : 'Originality & Provenance',
      description: isBrand
        ? 'Evaluates active campaign deliverables, unambiguous creative scopes, and structured milestone deadlines.'
        : 'Evidence-backed review of original ComfyUI node graphs, ControlNet depth passes, raw renders, and generation seed logs.',
      icon: FileCheck2,
      modalType: 'portfolio',
      orbitAngle: 45, // Bottom Right
      positionStyle: { bottom: '8%', right: '12%' },
      color: '#D97706',
      accentBg: 'rgba(217, 119, 6, 0.08)'
    },
    {
      id: 'ai_tools',
      claimType: 'ai_tools',
      title: 'AI Tools & Workflow',
      subtitle: isBrand ? 'Creator Care & Turnaround' : 'Generative Stack Disclosure',
      description: isBrand
        ? 'Professional turnaround history on submitted drafts, contract fulfillment rate, and active creative feedback resolution.'
        : 'Transparent disclosure of generative model pipelines (Flux, Midjourney, Runway) and human-in-the-loop review checkpoints.',
      icon: Cpu,
      modalType: 'tool',
      orbitAngle: 135, // Bottom Left
      positionStyle: { bottom: '8%', left: '12%' },
      color: '#7C3AED',
      accentBg: 'rgba(124, 58, 237, 0.08)'
    },
    {
      id: 'commercial_rights',
      claimType: 'commercial_rights',
      title: 'Commercial Rights',
      subtitle: isBrand ? 'Escrow & Payment Reliability' : 'Licensing & Buyout Scope',
      description: isBrand
        ? 'Authoritative milestone escrow facility and verified Razorpay transaction backing for creator compensation.'
        : 'Model commercial license verification, clear client buyout boundaries, and foundational model derivative terms warranty.',
      icon: ShieldCheck,
      modalType: 'licensing',
      orbitAngle: 225, // Top Left
      positionStyle: { top: '8%', left: '12%' },
      color: '#9E744A',
      accentBg: 'rgba(158, 116, 74, 0.08)'
    }
  ], [isBrand]);

  // Compute live verification status for each pillar based on actual claims
  const pillarStatuses = useMemo(() => {
    const statuses = {};

    pillars.forEach(p => {
      // Find matching claims for this pillar
      const matchingClaims = claims.filter(c => 
        c.claimType === p.claimType || 
        (p.id === 'authenticity' && (c.claimType === 'portfolio' || c.claimType === 'brief_integrity')) ||
        (p.id === 'ai_tools' && (c.claimType === 'ai_tools' || c.claimType === 'workflow' || c.claimType === 'creator_care')) ||
        (p.id === 'commercial_rights' && (c.claimType === 'commercial_rights' || c.claimType === 'payment_escrow')) ||
        (p.id === 'identity' && (c.claimType === 'identity' || c.claimType === 'entity'))
      );

      let status = VERIFICATION_STATUSES.NOT_SUBMITTED;

      if (matchingClaims.some(c => c.status === 'verified')) {
        status = VERIFICATION_STATUSES.VERIFIED;
      } else if (matchingClaims.some(c => c.status === 'pending_review')) {
        status = VERIFICATION_STATUSES.PENDING_REVIEW;
      } else if (matchingClaims.some(c => c.status === 'needs_renewal')) {
        status = VERIFICATION_STATUSES.NEEDS_RENEWAL;
      } else if (matchingClaims.some(c => c.status === 'self_declared')) {
        status = VERIFICATION_STATUSES.SELF_DECLARED;
      } else if (matchingClaims.some(c => c.status === 'unable_to_verify')) {
        status = VERIFICATION_STATUSES.UNABLE_TO_VERIFY;
      } else {
        // Fallback to trustData properties
        if (p.id === 'identity' && (trustData.identity?.status === 'verified' || trustData.email?.status === 'verified')) {
          status = VERIFICATION_STATUSES.VERIFIED;
        } else if (p.id === 'commercial_rights' && (trustData.licensing?.status === 'verified' || trustData.escrow?.status === 'verified')) {
          status = VERIFICATION_STATUSES.VERIFIED;
        }
      }

      statuses[p.id] = {
        status,
        claims: matchingClaims,
        meta: STATUS_META[status] || STATUS_META[VERIFICATION_STATUSES.NOT_SUBMITTED]
      };
    });

    return statuses;
  }, [pillars, claims, trustData]);

  // Selected pillar details
  const activePillar = useMemo(() => {
    return pillars.find(p => p.id === selectedPillarId) || pillars[0];
  }, [pillars, selectedPillarId]);

  const activePillarData = pillarStatuses[activePillar.id] || {
    status: VERIFICATION_STATUSES.NOT_SUBMITTED,
    claims: [],
    meta: STATUS_META[VERIFICATION_STATUSES.NOT_SUBMITTED]
  };

  const primaryClaim = activePillarData.claims[0] || null;
  const aiReviewData = primaryClaim?.aiReview || primaryClaim?.evidenceDetails?.aiReview || null;

  return (
    <div className="alloy-trust-orbit-container" id="alloy-trust-orbit-root">
      
      {/* Editorial Header Strip */}
      <div className="trust-orbit-header-strip">
        <div>
          <div className="trust-orbit-eyebrow">
            <span className="trust-orbit-live-dot" />
            <span>ALLLOY DUAL-VERIFIED PROTOCOL</span>
          </div>
          <h2 className="trust-orbit-heading font-editorial">
            The Trust Orbit
          </h2>
          <p className="trust-orbit-subtext">
            Four independent verification pillars governing creative integrity, provenance, and legal clearance.
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            className="trust-orbit-refresh-btn"
            onClick={onRefresh}
            title="Refresh Live Verification Claims"
          >
            <RefreshCw size={14} />
            <span>Sync Status</span>
          </button>
        )}
      </div>

      {/* Main Orbit Stage & Details Grid */}
      <div className="trust-orbit-stage-grid">
        
        {/* ============================================================
            LEFT: The Animated Orbit Stage (Concentric Paths & Satellite Nodes)
            ============================================================ */}
        <div className="trust-orbit-visual-wrap" aria-label="Alloy Trust Orbit Visualization">
          
          <div className="trust-orbit-canvas">
            
            {/* Fine Concentric Orbital SVG Rings */}
            <svg 
              className="trust-orbit-rings-svg" 
              viewBox="0 0 540 540" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Outer Orbital Track */}
              <circle cx="270" cy="270" r="235" stroke="rgba(197, 168, 128, 0.28)" strokeWidth="1" strokeDasharray="4 6" />
              
              {/* Mid Orbital Track */}
              <circle cx="270" cy="270" r="175" stroke="rgba(158, 116, 74, 0.22)" strokeWidth="1.2" />
              
              {/* Inner Harmonic Orbit */}
              <circle cx="270" cy="270" r="115" stroke="rgba(45, 79, 62, 0.2)" strokeWidth="1" strokeDasharray="2 4" />
              
              {/* Animated Constellation Dash Path */}
              <circle 
                cx="270" 
                cy="270" 
                r="175" 
                stroke="rgba(197, 168, 128, 0.55)" 
                strokeWidth="1.5" 
                strokeDasharray="24 180" 
                className="orbit-rotating-dash"
              />
            </svg>

            {/* Stable Central Emblem (Non-rotating, grounded) */}
            <div className="trust-orbit-center-emblem">
              <div className="center-emblem-core">
                <div className="center-shield-icon">
                  <ShieldCheck size={28} className="text-bronze" />
                </div>
                <span className="center-emblem-label">ALLOY TRUST</span>
                <span className="center-emblem-sub">FRAMEWORK</span>
              </div>
            </div>

            {/* 4 Satellite Pillar Nodes (Desktop Positioned) */}
            <div className="trust-orbit-nodes-layer">
              {pillars.map((pillar) => {
                const info = pillarStatuses[pillar.id];
                const isSelected = selectedPillarId === pillar.id;
                const isHovered = hoveredPillarId === pillar.id;
                const PillarIcon = pillar.icon;

                return (
                  <button
                    key={pillar.id}
                    type="button"
                    className={`orbit-satellite-node ${isSelected ? 'node-selected' : ''} ${isHovered ? 'node-hovered' : ''}`}
                    style={pillar.positionStyle}
                    onClick={() => setSelectedPillarId(pillar.id)}
                    onMouseEnter={() => setHoveredPillarId(pillar.id)}
                    onMouseLeave={() => setHoveredPillarId(null)}
                    aria-label={`Select ${pillar.title} pillar, status: ${info.meta.label}`}
                    aria-pressed={isSelected}
                  >
                    <div className="node-icon-bubble" style={{ borderColor: isSelected ? pillar.color : undefined }}>
                      <PillarIcon size={20} style={{ color: pillar.color }} />
                      <span 
                        className="node-status-dot" 
                        style={{ background: info.meta.color }}
                        title={`Status: ${info.meta.label}`}
                      />
                    </div>

                    <div className="node-label-group">
                      <span className="node-pillar-title">{pillar.title}</span>
                      <span 
                        className="node-status-chip"
                        style={{ color: info.meta.color, background: info.meta.bg }}
                      >
                        {info.meta.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Quick Pillar Switcher Tabs (Accessible keyboard / mobile alternative) */}
          <div className="orbit-quick-tabs" role="tablist" aria-label="Verification Pillars">
            {pillars.map((p) => {
              const info = pillarStatuses[p.id];
              const isSelected = selectedPillarId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={`orbit-tab-pill ${isSelected ? 'tab-pill-active' : ''}`}
                  onClick={() => setSelectedPillarId(p.id)}
                >
                  <span className="tab-pill-indicator" style={{ background: info.meta.color }} />
                  <span>{p.title}</span>
                </button>
              );
            })}
          </div>

        </div>

        {/* ============================================================
            RIGHT: Live Pillar Inspection & Evidence Panel
            ============================================================ */}
        <div className="trust-orbit-detail-panel">
          
          {/* Header */}
          <div className="pillar-detail-header">
            <div className="pillar-header-left">
              <div 
                className="pillar-badge-circle" 
                style={{ background: activePillar.accentBg, color: activePillar.color }}
              >
                <activePillar.icon size={22} />
              </div>
              <div>
                <span className="pillar-eyebrow">PILLAR INSPECTOR</span>
                <h3 className="pillar-title font-editorial">{activePillar.title}</h3>
                <span className="pillar-subtitle">{activePillar.subtitle}</span>
              </div>
            </div>

            <div 
              className="pillar-status-tag"
              style={{
                color: activePillarData.meta.color,
                background: activePillarData.meta.bg,
                borderColor: activePillarData.meta.border
              }}
            >
              <span className="status-tag-dot" style={{ background: activePillarData.meta.color }} />
              <span>{activePillarData.meta.label}</span>
            </div>
          </div>

          {/* Description */}
          <p className="pillar-description-text">
            {activePillar.description}
          </p>

          {/* Live Persisted Evidence Metadata */}
          <div className="pillar-evidence-block">
            <div className="evidence-block-header">
              <div className="flex-items-center gap-2">
                <FileText size={15} className="text-secondary" />
                <span className="evidence-section-title">Submitted Evidence & Claims</span>
              </div>
              <span className="evidence-count-badge">
                {activePillarData.claims.length} {activePillarData.claims.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            {activePillarData.claims.length > 0 ? (
              <div className="claims-list-scroll">
                {activePillarData.claims.map((claim) => (
                  <div key={claim.id} className="claim-item-card">
                    <div className="claim-item-top">
                      <strong className="claim-item-title">{claim.claimTitle}</strong>
                      <span 
                        className="claim-mini-status"
                        style={{ color: (STATUS_META[claim.status] || STATUS_META.pending_review).color }}
                      >
                        {(STATUS_META[claim.status] || STATUS_META.pending_review).label}
                      </span>
                    </div>

                    <div className="claim-metadata-grid">
                      <div className="meta-pair">
                        <span className="meta-key">Evidence Type:</span>
                        <span className="meta-val">{claim.evidenceType || 'Document'}</span>
                      </div>
                      
                      <div className="meta-pair">
                        <span className="meta-key">Submitted At:</span>
                        <span className="meta-val">
                          {claim.createdAt ? new Date(claim.createdAt).toLocaleDateString() : 'Active'}
                        </span>
                      </div>

                      {claim.isPrivate && (
                        <div className="meta-pair private-notice">
                          <Lock size={12} />
                          <span>Confidential document isolated in encrypted vault.</span>
                        </div>
                      )}
                    </div>

                    {/* Reviewer Feedback / Super Admin Note */}
                    {claim.reviewerNotes && (
                      <div className="claim-reviewer-box">
                        <span className="reviewer-box-title">Auditor Review Note:</span>
                        <p className="reviewer-box-text">"{claim.reviewerNotes}"</p>
                        {claim.reviewedBy && (
                          <span className="reviewer-byline">— {claim.reviewedBy} ({claim.reviewedAt ? new Date(claim.reviewedAt).toLocaleDateString() : 'Verified'})</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-evidence-box">
                <Info size={16} className="text-tertiary" />
                <p>No documentation has been submitted for this pillar yet. Submit evidence below to queue for Super Admin review.</p>
              </div>
            )}
          </div>

          {/* AI-Assisted Evidence Assessment */}
          <div className="pillar-ai-advisory-block">
            <div className="ai-advisory-header">
              <div className="flex-items-center gap-2">
                <Sparkles size={16} className="text-bronze" />
                <span className="ai-section-title">AI-Assisted Evidence Assessment</span>
              </div>
              {aiReviewData && (
                <span className={`ai-risk-pill risk-${aiReviewData.risk_indicator || 'low'}`}>
                  {aiReviewData.risk_indicator === 'low' ? 'Low Risk' : (aiReviewData.risk_indicator === 'medium' ? 'Medium Advisory' : 'Inconclusive')}
                </span>
              )}
            </div>

            {aiReviewData ? (
              <div className="ai-findings-body">
                {Array.isArray(aiReviewData.findings) && aiReviewData.findings.length > 0 && (
                  <ul className="ai-findings-list">
                    {aiReviewData.findings.map((f, i) => (
                      <li key={i}>
                        <CheckCircle2 size={13} className="text-forest" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {Array.isArray(aiReviewData.missing_evidence) && aiReviewData.missing_evidence.length > 0 && (
                  <div className="ai-missing-box">
                    <span className="ai-sub-label">Evidence Required:</span>
                    <ul>
                      {aiReviewData.missing_evidence.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiReviewData.advisory_notes && (
                  <p className="ai-advisory-summary">
                    <strong>Advisory Note:</strong> {aiReviewData.advisory_notes}
                  </p>
                )}

                <div className="ai-disclaimer-footnote">
                  <span>Advisory only: Automated AI findings never grant final approval or rejection. Governed strictly by Super Admin audit.</span>
                </div>
              </div>
            ) : (
              <div className="ai-empty-state">
                <p>AI automated evidence pre-screening will execute on evidence submission.</p>
              </div>
            )}
          </div>

          {/* Action Trigger Button */}
          <div className="pillar-action-footer">
            <button
              type="button"
              className="btn btn-primary trust-submit-action-btn"
              onClick={() => onOpenSubmissionModal?.(activePillar.modalType)}
              id={`trust-orbit-submit-${activePillar.id}-btn`}
            >
              <span>Submit Evidence for {activePillar.title}</span>
              <ArrowRight size={15} />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
