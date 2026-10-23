// src/components/CampaignModal.jsx
// Natural-Language Campaign Creation with AI Brief Understanding, Smart Follow-Up, and Signature WOW Transition

import React, { useState } from 'react';
import { X, ArrowRight, Check, Sparkles, Edit3, ArrowLeft, RefreshCw } from 'lucide-react';
import { analyzeBrief, analyzeBriefAsync } from '../ai/briefAnalyzer';
import { getSmartClarification } from '../ai/smartClarifier';

export default function CampaignModal({
  isOpen,
  onClose,
  onCampaignCreated,
  activeBrand,
  initialStage = 'input',
  initialAnalysis = null,
  initialClarification = null,
  initialNaturalText = ''
}) {
  // Mode: 'input' | 'clarify' | 'processing' | 'review' | 'transitioning'
  const [stage, setStage] = useState(initialStage);
  const [naturalText, setNaturalText] = useState(initialNaturalText);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [clarification, setClarification] = useState(initialClarification);
  const [transitionStatusText, setTransitionStatusText] = useState('Understanding your creative direction…');

  // Marketplace publication settings (Private by default)
  const [isMarketplacePublished, setIsMarketplacePublished] = useState(false);
  const [isAcceptingApplications, setIsAcceptingApplications] = useState(true);
  const [creatorSlots, setCreatorSlots] = useState(1);
  const [deadlineType, setDeadlineType] = useState('open-ended'); // 'open-ended' | 'date'
  const [customDeadline, setCustomDeadline] = useState('');
  const [isBudgetNegotiable, setIsBudgetNegotiable] = useState(true);

  if (!isOpen) return null;

  const demoExamples = [
    "I’m launching a premium skincare product for young women in India. I want warm cinematic Instagram videos that feel authentic rather than like traditional advertising. We have around ₹1 lakh and need the first assets within three weeks.",
    "I need an AI creator for an avant-garde fashion film to debut at digital Milan Fashion Week. High-contrast neoclassical silk drapery, 4K resolution.",
    "Launching a minimal titanium chronograph watch. Looking for micro-machining exploded 3D views and zero-gravity fluid dynamics.",
    "Need an energetic, thumb-stopping 9:16 vertical social video for our sparkling organic beverage launch targeting Gen Z."
  ];

  const handleStartAnalysis = (e) => {
    if (e) e.preventDefault();
    if (!naturalText.trim()) return;

    // Fast, elegant processing
    setStage('processing');
    setTransitionStatusText('Reading your campaign brief…');

    setTimeout(async () => {
      setTransitionStatusText('Structuring creative direction with Groq AI…');

      try {
        const result = await analyzeBriefAsync(naturalText);
        setAnalysis(result);

        // Check if smart clarification is needed (Part 3)
        const smartQ = getSmartClarification(result);
        if (smartQ) {
          setClarification(smartQ);
          setStage('clarify');
        } else {
          setStage('review');
        }
      } catch (err) {
        console.warn('[CampaignModal] Groq analysis fallback:', err);
        const fallback = analyzeBrief(naturalText);
        setAnalysis(fallback);
        setStage('review');
      }
    }, 350);
  };

  const handleApplyClarification = (option) => {
    setSelectedClarificationOption(option);
    const enrichedText = `${naturalText}. Visual format requested: ${option}.`;
    setNaturalText(enrichedText);

    setStage('processing');
    setTransitionStatusText('Updating brief understanding with Groq AI…');

    setTimeout(async () => {
      try {
        const enrichedResult = await analyzeBriefAsync(enrichedText);
        setAnalysis(enrichedResult);
        setClarification(null);
        setStage('review');
      } catch (err) {
        const fallback = analyzeBrief(enrichedText);
        setAnalysis(fallback);
        setClarification(null);
        setStage('review');
      }
    }, 350);
  };

  // Part 24: Signature "WOW" Moment Transition
  const handleConfirmAndFindCreators = () => {
    setStage('transitioning');
    setTransitionStatusText('Synthesizing Campaign DNA…');

    setTimeout(() => {
      setTransitionStatusText('Finding creators who fit…');

      setTimeout(() => {
        const newCampaign = {
          id: `camp-${Date.now()}`,
          ownerBrandId: activeBrand?.id,
          brandName: activeBrand?.name || 'Brand Partner',
          brandAvatar: activeBrand?.logo || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80",
          brandWebsite: activeBrand?.website || 'brand.co',
          title: analysis.title || `${activeBrand?.name || 'Curated'} Creative Launch`,
          description: naturalText,
          budget: analysis.budget,
          timeline: analysis.timeline,
          status: 'Active',
          visibility: isMarketplacePublished ? 'published' : 'private',
          isMarketplacePublished: Boolean(isMarketplacePublished),
          isAcceptingApplications: isMarketplacePublished ? Boolean(isAcceptingApplications) : false,
          applicationStatus: (isMarketplacePublished && isAcceptingApplications) ? 'open' : 'closed',
          creatorSlots: Math.max(1, parseInt(creatorSlots, 10) || 1),
          acceptedApplicationsCount: 0,
          remainingSlots: Math.max(1, parseInt(creatorSlots, 10) || 1),
          isOpenEnded: deadlineType === 'open-ended',
          deadline: (deadlineType === 'date' && customDeadline) ? customDeadline : null,
          isNegotiable: Boolean(isBudgetNegotiable),
          createdAt: 'Just now',
          updatedAt: 'Just now',
          targetAudience: analysis.audience,
          platforms: analysis.platform ? [analysis.platform] : ['Instagram'],
          contentFormats: analysis.contentFormat ? [analysis.contentFormat] : ['4K Stills Suite'],
          deliverables: analysis.deliverables || [analysis.contentFormat || 'Key Campaign Visuals'],
          creativeDirection: analysis.creativeDirection,
          creativeStyle: analysis.creativeDirection || 'Contemporary Luxury',
          desiredCreatorSpecialties: (analysis.hasExplicitFormat && !analysis.isFlexible)
            ? (analysis.contentFormat?.toLowerCase().includes('video') ? ['AI Video'] : analysis.contentFormat?.toLowerCase().includes('3d') ? ['3D'] : ['AI Photography'])
            : [],
          requirements: analysis.requirements || {
            mandatory: {
              formats: (analysis.hasExplicitFormat && !analysis.isFlexible && analysis.contentFormat) ? [analysis.contentFormat] : [],
              styles: (analysis.hasExplicitStyle && !analysis.isFlexible && analysis.creativeDirection) ? [analysis.creativeDirection] : []
            },
            preferred: {
              platforms: analysis.platform ? [analysis.platform] : ['Instagram'],
              industries: analysis.industry ? [analysis.industry] : []
            }
          },
          traits: Array.isArray(analysis?.traits) ? analysis.traits : (Array.isArray(analysis?.styleTokens) ? analysis.styleTokens : []),
          shortlist: []
        };

        onCampaignCreated(newCampaign, { openPipelineTrace: true });
        // Reset state
        setStage('input');
        setNaturalText('');
        setAnalysis(null);
        setClarification(null);
      }, 600);
    }, 550);
  };

  const handleResetToEdit = () => {
    setStage('input');
  };

  const handleClose = () => {
    setStage('input');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content campaign-modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={handleClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* 1. INPUT STAGE: Natural-Language Brief */}
        {stage === 'input' && (
          <div className="step-content-fade">
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="live-pulse-dot" />
                <span className="section-label" style={{ marginBottom: 0, color: 'var(--accent-lavender-deep)' }}>
                  Natural-Language Brief
                </span>
              </div>
              <h2 className="modal-title font-editorial" style={{ fontSize: '2.5rem' }}>
                Describe what you want to create.
              </h2>
              <p className="modal-subtitle">
                Speak naturally. Alloy extracts the creative direction, deliverables, timeline, and platform automatically.
              </p>
            </div>

            <form onSubmit={handleStartAnalysis}>
              <div className="form-group">
                <textarea
                  rows={5}
                  required
                  className="form-textarea natural-brief-textarea"
                  placeholder="e.g. I’m launching a premium skincare product for young women in India. I want warm cinematic Instagram videos that feel authentic rather than like traditional advertising. We have around ₹1 lakh and need the first assets within three weeks."
                  value={naturalText}
                  onChange={(e) => setNaturalText(e.target.value)}
                  autoFocus
                />
              </div>

              {/* One-Click Real Inspiration Examples */}
              <div className="brief-examples-drawer">
                <span className="sidebar-heading" style={{ display: 'block', marginBottom: '8px' }}>
                  Try an example brief:
                </span>
                <div className="brief-examples-list">
                  {demoExamples.map((ex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="brief-example-chip"
                      onClick={() => setNaturalText(ex)}
                    >
                      <span>"{ex.slice(0, 75)}..."</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions-footer" style={{ marginTop: '28px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={!naturalText.trim()}
                >
                  <Sparkles size={16} />
                  <span>Understand My Brief</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. CLARIFY STAGE: Smart Follow-Up Question (Part 3) */}
        {stage === 'clarify' && clarification && (
          <div className="step-content-fade">
            <div className="modal-header" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="live-pulse-dot" />
                <span className="section-label" style={{ marginBottom: 0, color: 'var(--accent-lavender-deep)' }}>
                  Quick Creative Check
                </span>
              </div>
              <h2 className="modal-title font-editorial" style={{ fontSize: '2.3rem' }}>
                {clarification.question}
              </h2>
              <p className="modal-subtitle">
                Clarifying this helps Alloy pinpoint the exact creators who match your format.
              </p>
            </div>

            <div className="clarification-options-grid">
              {(Array.isArray(clarification?.options) ? clarification.options : []).map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  className="clarification-option-card"
                  onClick={() => handleApplyClarification(opt)}
                >
                  <span className="clarification-opt-text">{opt}</span>
                  <ArrowRight size={15} />
                </button>
              ))}
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn btn-subtle btn-sm"
                onClick={() => setStage('review')}
              >
                Skip clarification and proceed
              </button>
            </div>
          </div>
        )}

        {/* 3. PROCESSING & TRANSITION STAGE (Part 2 & Part 24) */}
        {(stage === 'processing' || stage === 'transitioning') && (
          <div className="ai-processing-state-wrap">
            <div className="ai-processing-visual">
              <span className="ai-processing-ring" />
              <Sparkles size={28} className="sparkle-gold-icon" />
            </div>
            <h3 className="font-editorial" style={{ fontSize: '2.2rem', marginTop: '18px' }}>
              {transitionStatusText}
            </h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.92rem', marginTop: '6px' }}>
              Matching against verified portfolio patterns and Creative DNA...
            </p>
          </div>
        )}

        {/* 4. REVIEW STAGE: AI Brief Understanding (Part 2) */}
        {stage === 'review' && analysis && (
          <div className="step-content-fade">
            <div className="modal-header" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="live-pulse-dot" />
                <span className="section-label" style={{ marginBottom: 0, color: 'var(--accent-lavender-deep)' }}>
                  Alloy Understood Your Brief
                </span>
              </div>
              <h2 className="modal-title font-editorial" style={{ fontSize: '2.3rem' }}>
                Here’s what we understood.
              </h2>
            </div>

            {/* Concise Structured Summary Grid */}
            <div className="understood-summary-grid">
              <div className="understood-cell">
                <span className="understood-label">Creative Direction</span>
                <span className="understood-val font-editorial">{analysis.creativeDirection || analysis.creativeStyle || 'Contemporary Luxury'}</span>
              </div>

              <div className="understood-cell">
                <span className="understood-label">Content Format</span>
                <span className="understood-val">{analysis.contentFormat || 'Key Campaign Visuals'}</span>
              </div>

              <div className="understood-cell">
                <span className="understood-label">Audience</span>
                <span className="understood-val">{analysis.audience || analysis.targetAudience || 'Target Audience'}</span>
              </div>

              <div className="understood-cell">
                <span className="understood-label">Platform</span>
                <span className="understood-val">{analysis.platform || analysis.preferredPlatform || 'Multi-platform'}</span>
              </div>

              <div className="understood-cell">
                <span className="understood-label">Budget</span>
                <span className="understood-val">{analysis.budget || 'Flexible / Not specified'}</span>
              </div>

              <div className="understood-cell">
                <span className="understood-label">Timeline</span>
                <span className="understood-val">{analysis.timeline || 'Flexible / Open'}</span>
              </div>
            </div>

            {/* Derived Campaign DNA Pill Row */}
            <div className="campaign-dna-inline-strip">
              <span className="sidebar-heading" style={{ marginBottom: 0 }}>Campaign DNA:</span>
              <div className="chip-cloud" style={{ display: 'inline-flex', gap: '6px' }}>
                {(Array.isArray(analysis?.traits) ? analysis.traits : (Array.isArray(analysis?.styleTokens) ? analysis.styleTokens : [])).length > 0 ? (
                  (Array.isArray(analysis?.traits) ? analysis.traits : (Array.isArray(analysis?.styleTokens) ? analysis.styleTokens : [])).map((t, i) => (
                    <span key={i} className="campaign-dna-pill" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                      {t}
                    </span>
                  ))
                ) : (
                  <span className="campaign-dna-pill" style={{ fontSize: '0.75rem', padding: '3px 10px', opacity: 0.7 }}>
                    {analysis?.creativeStyle || analysis?.industry || 'General Creative'}
                  </span>
                )}
              </div>
            </div>

            {/* Marketplace & Discovery Configuration (Private by default) */}
            <div className="marketplace-modal-settings" style={{
              marginTop: '24px',
              padding: '20px 22px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                      Creator Marketplace Discovery
                    </span>
                    <span className={`badge ${isMarketplacePublished ? 'badge-primary' : 'badge-subtle'}`} style={{
                      fontSize: '0.72rem',
                      background: isMarketplacePublished ? 'var(--accent-forest)' : undefined,
                      color: isMarketplacePublished ? '#FAF8F5' : undefined
                    }}>
                      {isMarketplacePublished ? 'Public Marketplace' : 'Private (Brand-Only)'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Allow verified creators to discover this brief in the feed and submit proposals.
                  </p>
                </div>
                <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '10px', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={isMarketplacePublished}
                    onChange={(e) => setIsMarketplacePublished(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-forest)' }}
                  />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {isMarketplacePublished ? 'Marketplace Active' : 'Make Public'}
                  </span>
                </label>
              </div>

              {isMarketplacePublished ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '16px',
                  marginTop: '14px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-light)'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Creator Slots
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={creatorSlots}
                      onChange={(e) => setCreatorSlots(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Application Deadline
                    </label>
                    <select
                      value={deadlineType}
                      onChange={(e) => setDeadlineType(e.target.value)}
                      className="form-input"
                      style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                    >
                      <option value="open-ended">Open-ended (until filled)</option>
                      <option value="date">Specific deadline</option>
                    </select>
                    {deadlineType === 'date' && (
                      <input
                        type="date"
                        value={customDeadline}
                        onChange={(e) => setCustomDeadline(e.target.value)}
                        className="form-input"
                        style={{ marginTop: '8px', padding: '8px 12px', fontSize: '0.88rem' }}
                      />
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Application Terms
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={isAcceptingApplications}
                          onChange={(e) => setIsAcceptingApplications(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-forest)' }}
                        />
                        Accept Applications
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={isBudgetNegotiable}
                          onChange={(e) => setIsBudgetNegotiable(e.target.checked)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--accent-forest)' }}
                        />
                        Budget is Negotiable
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  fontSize: '0.84rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1rem' }}>🔒</span>
                  <span><strong>Private Campaign:</strong> Only creators you invite directly through Alloy's matching engine can see and participate.</span>
                </div>
              )}
            </div>

            {/* Actions: Looks right? */}
            <div className="modal-actions-footer" style={{ marginTop: '28px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetToEdit}
              >
                <Edit3 size={14} />
                <span>Edit Brief</span>
              </button>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleConfirmAndFindCreators}
              >
                <Sparkles size={16} />
                <span>Yes, Find Creators</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
