import React, { useState, useMemo } from 'react';
import CreatorCard from '../components/CreatorCard';
import { CATEGORIES, FILTER_OPTIONS } from '../data/creatorsData';
import { calculateCreaMatch } from '../intelligence/matchingEngine';
import { semanticCreatorSearch } from '../ai/semanticSearch';
import { Search, SlidersHorizontal, Heart, X, ArrowLeft, RotateCcw, Sparkles, ArrowUpDown, Cpu, ShieldCheck, AlertTriangle, Loader2, Send, Lock } from 'lucide-react';

export default function DiscoverView({ 
  creators, 
  onSelectCreator, 
  activeCampaign, 
  onBackToCampaign,
  savedCreatorIds = [],
  onToggleSaveCreator,
  onWhyClick,
  pipelineFilter = null,
  onClearPipelineFilter,
  onOpenPipelineTrace,
  onRunNaturalPipeline,
  isPipelineTraceLoading = false,
  pipelineError = null,
  currentUser = null,
  onOpenLogin = null
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [naturalBriefInput, setNaturalBriefInput] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOnlySaved, setShowOnlySaved] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  
  // Sorting inside campaign context: 'recommended' | 'best-fit' | 'recent' | 'available'
  const [sortBy, setSortBy] = useState('recommended');

  // Filter state
  const [filters, setFilters] = useState({
    industry: 'All Industries',
    style: 'All Styles',
    availability: 'All Availability'
  });

  const searchSuggestions = [
    "cinematic luxury fashion creator",
    "AI creator for a skincare product launch",
    "surreal product advertising",
    "Instagram creator for a Gen Z campaign",
    "minimal 3D tech advertising"
  ];

  const activeFiltersCount = 
    (filters.industry !== 'All Industries' ? 1 : 0) +
    (filters.style !== 'All Styles' ? 1 : 0) +
    (filters.availability !== 'All Availability' ? 1 : 0);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setShowOnlySaved(false);
    setSortBy('recommended');
    setFilters({
      industry: 'All Industries',
      style: 'All Styles',
      availability: 'All Availability'
    });
  };

  // Compute semantic search
  const semanticResult = useMemo(() => {
    return semanticCreatorSearch(searchQuery, creators);
  }, [searchQuery, creators]);

  const interpretedTokens = semanticResult.interpretedTokens;

  // Filter and sort creators
  const processedCreators = useMemo(() => {
    let list;

    if (pipelineFilter && Array.isArray(pipelineFilter.eligibleCreatorIds)) {
      const eligibleSet = new Set(pipelineFilter.eligibleCreatorIds);
      const matching = creators.filter(c => eligibleSet.has(c.id));

      if (Array.isArray(pipelineFilter.rankedOrder) && pipelineFilter.rankedOrder.length > 0) {
        const rankIndexMap = new Map();
        pipelineFilter.rankedOrder.forEach((item, idx) => {
          const id = typeof item === 'string' ? item : (item.id || item.creatorId);
          if (id) rankIndexMap.set(id, idx);
        });
        matching.sort((a, b) => {
          const rankA = rankIndexMap.has(a.id) ? rankIndexMap.get(a.id) : 9999;
          const rankB = rankIndexMap.has(b.id) ? rankIndexMap.get(b.id) : 9999;
          return rankA - rankB;
        });
      } else {
        const idOrder = new Map(pipelineFilter.eligibleCreatorIds.map((id, idx) => [id, idx]));
        matching.sort((a, b) => (idOrder.get(a.id) ?? 9999) - (idOrder.get(b.id) ?? 9999));
      }

      list = matching;
    } else {
      list = searchQuery.trim() ? [...semanticResult.results] : [...creators];
    }

    list = list.filter((c) => {
      // Saved filter
      if (showOnlySaved && !savedCreatorIds.includes(c.id)) {
        return false;
      }

      // Horizontal Category Match
      if (selectedCategory !== 'all') {
        const matchesCategoryTag = Array.isArray(c.categoryTags) && c.categoryTags.includes(selectedCategory);
        const matchesSpecialty = typeof c.specialty === 'string' && c.specialty.toLowerCase().replace(/\s+/g, '-').includes(selectedCategory);
        const matchesCapability = Array.isArray(c.capabilities) && c.capabilities.some(cap => 
          typeof cap === 'string' && cap.toLowerCase().replace(/\s+/g, '-').includes(selectedCategory)
        );
        if (!matchesCategoryTag && !matchesSpecialty && !matchesCapability) {
          return false;
        }
      }

      // Popover Filters
      if (filters.industry !== 'All Industries') {
        if (!Array.isArray(c.industries) || !c.industries.includes(filters.industry)) return false;
      }

      if (filters.style !== 'All Styles') {
        if (!Array.isArray(c.styles) || !c.styles.includes(filters.style)) return false;
      }

      if (filters.availability !== 'All Availability') {
        if (c.availability !== filters.availability) return false;
      }

      return true;
    });

    // Sorting logic (especially inside campaign context when no pipeline filter)
    if (!pipelineFilter && activeCampaign && !searchQuery.trim()) {
      if (sortBy === 'recommended' || sortBy === 'best-fit') {
        list = [...list].sort((a, b) => {
          const matchA = calculateCreaMatch(activeCampaign, a).score;
          const matchB = calculateCreaMatch(activeCampaign, b).score;
          return matchB - matchA;
        });
      } else if (sortBy === 'available') {
        list = [...list].sort((a, b) => {
          const availA = a.availability.includes('Available') ? 1 : 0;
          const availB = b.availability.includes('Available') ? 1 : 0;
          return availB - availA;
        });
      }
    }

    return list;
  }, [creators, semanticResult, selectedCategory, searchQuery, showOnlySaved, savedCreatorIds, filters, sortBy, activeCampaign, pipelineFilter]);

  return (
    <div className="discover-view">
      <div className="page-container">
        {/* Campaign Context Banner (when navigating from Campaign Studio) */}
        {activeCampaign && (
          <div className="campaign-context-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={onBackToCampaign}
              >
                <ArrowLeft size={14} />
                <span>Return to Campaign Studio</span>
              </button>
              <div>
                <span className="section-label" style={{ marginBottom: 0, color: 'var(--accent-lavender-deep)' }}>
                  Browsing for this campaign
                </span>
                <div style={{ fontWeight: 600, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                  {activeCampaign.title}
                </div>
              </div>
            </div>

            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Alloy Match scores calculated for your brief.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {pipelineError && (
          <div className="studio-card" style={{ marginBottom: 20, padding: '14px 18px', border: '1px solid #fca5a5', borderLeft: '5px solid #dc2626', background: '#fef2f2', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={18} color="#dc2626" />
                <div>
                  <strong style={{ color: '#991b1b', fontSize: '0.92rem', fontWeight: 700 }}>Pipeline Filter Error:</strong>
                  <span style={{ fontSize: '0.86rem', color: '#7f1d1d', marginLeft: 8, fontWeight: 500 }}>{pipelineError}</span>
                </div>
              </div>
              {onClearPipelineFilter && (
                <button type="button" className="btn btn-ghost btn-xs" onClick={onClearPipelineFilter} style={{ color: '#991b1b' }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Campaign Pipeline Filter Banner */}
        {pipelineFilter && (
          <div className="pipeline-filter-banner studio-card" style={{ marginBottom: 24, padding: '16px 20px', background: '#ffffff', border: '1px solid var(--border-medium, #d1d5db)' }}>
            <div className="filter-banner-content" style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="filter-banner-icon">
                    <Sparkles size={20} style={{ color: '#059669' }} />
                  </div>
                  <div>
                    <div className="filter-banner-heading" style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                      <strong>Active Filter:</strong> {pipelineFilter.campaignTitle || 'Campaign Requirements'}
                      {pipelineFilter.isStale && (
                        <span className="badge-stale" style={{ marginLeft: 8, background: '#ffedd5', color: '#c2410c', border: '1px solid #fdba74', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                          Brief Updated (Stale)
                        </span>
                      )}
                      <span className="badge-subtle" style={{ marginLeft: 8, fontSize: '0.75rem', fontWeight: 600, color: '#334155', background: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                        Source: {pipelineFilter.source === 'supabase' ? 'Supabase Authoritative' : 'Local Fallback'}
                      </span>
                    </div>
                    <div className="filter-banner-sub" style={{ fontSize: '0.86rem', color: '#334155', marginTop: 2, fontWeight: 500 }}>
                      {pipelineFilter.has100Match
                        ? `Showing ${processedCreators.length} creator${processedCreators.length === 1 ? '' : 's'} with 100% match to your campaign brief.`
                        : `Showing ${processedCreators.length} top-tier creator${processedCreators.length === 1 ? '' : 's'} offering up to ${pipelineFilter.maxScoreAchieved || 85}% creative match for your campaign's creative demands.`}
                    </div>
                  </div>
                </div>

                <div className="filter-banner-actions" style={{ display: 'flex', gap: 8 }}>
                  {onOpenPipelineTrace && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenPipelineTrace(pipelineFilter.campaignId)}
                      style={{ fontWeight: 600 }}
                    >
                      <Sparkles size={13} style={{ color: '#059669' }} />
                      <span>Inspect 7-Stage Trace</span>
                    </button>
                  )}
                  {onClearPipelineFilter && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={onClearPipelineFilter}
                      title="Clear campaign filter and view all creators"
                      style={{ fontWeight: 600, color: '#475569' }}
                    >
                      <X size={14} />
                      <span>Clear Filter</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Requirement Summary Pills */}
              {pipelineFilter.interpretedBrief?.requirements && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>Mandatory:</span>
                  {(pipelineFilter.interpretedBrief.requirements.mandatory.skills || []).map((s, i) => (
                    <span key={`ms-${i}`} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>{s}</span>
                  ))}
                  {(pipelineFilter.interpretedBrief.requirements.mandatory.formats || []).map((f, i) => (
                    <span key={`mf-${i}`} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>{f}</span>
                  ))}
                  {pipelineFilter.interpretedBrief.requirements.mandatory.commercialLicensing && (
                    <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>Commercial License Required</span>
                  )}

                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', marginLeft: 8 }}>Preferred:</span>
                  {(pipelineFilter.interpretedBrief.requirements.preferred.styles || []).map((s, i) => (
                    <span key={`ps-${i}`} style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #34d399', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>{s}</span>
                  ))}
                  {(pipelineFilter.interpretedBrief.requirements.preferred.industries || []).map((ind, i) => (
                    <span key={`pi-${i}`} style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #34d399', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>{ind}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Discovery Hero Section */}
        <div className="discover-header">
          <div className="section-label">AI Creator Marketplace</div>
          <h1 className="discover-title font-editorial">
            {activeCampaign 
              ? `Creators for ${activeCampaign.title}`
              : "Find your next creator."}
          </h1>
          <p className="discover-sub">
            {activeCampaign
              ? "Based on your brief, these creators are especially aligned with your creative direction and deliverables."
              : "Explore AI creators making everything from cinematic campaigns to product visuals."}
          </p>

          {/* AI Campaign Brief Pipeline Filter Card */}
          <div className="studio-card ai-campaign-filter-card" style={{
            margin: '20px 0 24px',
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(20, 20, 24, 0.95) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} style={{ color: '#059669' }} />
                <strong className="filter-card-heading" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  AI Natural-Language Campaign Filter
                </strong>
              </div>
              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: 600, 
                color: '#334155', 
                background: 'rgba(255, 255, 255, 0.9)', 
                padding: '2px 8px', 
                borderRadius: '4px', 
                border: '1px solid rgba(0,0,0,0.1)' 
              }}>
                7-Stage Deterministic Enforcement
              </span>
            </div>

            <p className="filter-card-desc" style={{ fontSize: '0.88rem', color: '#1e293b', margin: '0 0 14px 0', lineHeight: 1.55, fontWeight: 500 }}>
              Describe your campaign in plain language. CreaSync interprets hard mandatory requirements vs. ranking preferences, retrieves authoritative creator data from Supabase, and computes grounded matches.
            </p>

            {/* Authenticated vs Logged-Out states */}
            {!currentUser && (
              <div className="filter-auth-lock-banner" style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#34d399'
                  }}>
                    <Lock size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>
                      Sign In Required to Use AI Campaign Filter
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: 2 }}>
                      Natural-language creator discovery is protected. Sign in with a brand or creator account to unlock brief interpretation.
                    </div>
                  </div>
                </div>

                {onOpenLogin && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm btn-filter-primary"
                    style={{ minWidth: 140, fontWeight: 700 }}
                    onClick={onOpenLogin}
                  >
                    <span>Sign In to Unlock</span>
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  className="discover-brief-textarea"
                  style={{
                    width: '100%',
                    minHeight: '84px',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.94)',
                    border: '1.5px solid rgba(255, 255, 255, 0.35)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.92rem',
                    lineHeight: '1.45',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    cursor: isPipelineTraceLoading ? 'not-allowed' : 'text'
                  }}
                  placeholder="e.g. Find creators who can produce cinematic vertical AI videos for a premium skincare launch. Commercial usage rights are required. Preferably, they should have experience with beauty brands."
                  value={naturalBriefInput}
                  onChange={(e) => {
                    setNaturalBriefInput(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isPipelineTraceLoading}
                />
              </div>

              {/* Inline Validation & Pipeline Error Notices */}
              {validationError && (
                <div
                  className="brief-validation-alert"
                  role="alert"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.84rem',
                    color: '#fca5a5'
                  }}
                >
                  <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>{validationError}</span>
                </div>
              )}
              {pipelineError && !validationError && (
                <div
                  className="brief-pipeline-error-alert"
                  role="alert"
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.84rem',
                    color: '#fca5a5'
                  }}
                >
                  <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600 }}>{pipelineError}</span>
                </div>
              )}

              {/* Action buttons and example chips */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                {/* Example Quick Pills */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ fontSize: '0.78rem', color: '#f8fafc', fontWeight: 700 }}>Try:</span>
                  {[
                    { label: "Skincare Launch (Video + Commercial)", text: "Find creators who can produce cinematic vertical AI videos for a premium skincare launch. Commercial usage rights are required. Preferably, they should have experience with beauty brands." },
                    { label: "High Fashion Editorial", text: "Looking for an AI fashion director for an editorial lookbook. Experience with luxury fashion brands preferred." },
                    { label: "3D Product CGI", text: "Looking for 3D CGI product animation for consumer hardware. Must have 3D modeling skills and commercial licensing." }
                  ].map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      className="search-suggestion-chip"
                      style={{ fontSize: '0.76rem', padding: '4px 10px', color: '#ffffff' }}
                      onClick={() => {
                        setNaturalBriefInput(ex.text);
                        if (validationError) setValidationError(null);
                      }}
                      disabled={isPipelineTraceLoading}
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {naturalBriefInput && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-filter-clear"
                      onClick={() => {
                        setNaturalBriefInput('');
                        if (validationError) setValidationError(null);
                      }}
                      disabled={isPipelineTraceLoading}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    id="filter-by-brief-btn"
                    className="btn btn-primary btn-sm btn-filter-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: '150px', justifyContent: 'center' }}
                    onClick={() => {
                      if (!currentUser) {
                        setValidationError("Authentication required. Please sign in to use the AI Campaign Filter.");
                        if (onOpenLogin) onOpenLogin();
                        return;
                      }
                      const trimmed = naturalBriefInput.trim();
                      if (!trimmed) {
                        setValidationError("Please enter a campaign brief or choose one of the sample prompts below.");
                        return;
                      }
                      setValidationError(null);
                      if (onRunNaturalPipeline) {
                        onRunNaturalPipeline(trimmed);
                      }
                    }}
                    disabled={isPipelineTraceLoading}
                  >
                    {isPipelineTraceLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" style={{ color: '#ffffff' }} />
                        <span style={{ color: '#ffffff', fontWeight: 600 }}>Evaluating Pipeline…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} style={{ color: '#ffffff' }} />
                        <span style={{ color: '#ffffff', fontWeight: 700 }}>Filter by Brief</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Prominent Search Field with Rotating Suggestions */}
          <div className="discover-search-container">
            <div className="discover-search-input-wrapper">
              <Search 
                size={20} 
                className="discover-search-icon"
              />
              <input
                type="text"
                className="discover-search-input"
                placeholder="Describe the creator you're looking for…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Quick Suggestion Pills */}
            <div className="search-suggestions-row">
              <span className="suggestions-label">Try searching:</span>
              {searchSuggestions.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  className="search-suggestion-chip"
                  onClick={() => setSearchQuery(sug)}
                >
                  "{sug}"
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal Category System + Sorting & Filter Controls */}
          <div className="category-and-filter-row">
            {/* Horizontal Categories */}
            <div className="horizontal-categories-scroll">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id && !showOnlySaved;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-chip ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setShowOnlySaved(false);
                    }}
                  >
                    <span>{cat.name}</span>
                    {cat.count && (
                      <span 
                        style={{ 
                          fontSize: '0.72rem', 
                          opacity: isActive ? 0.9 : 0.6,
                          fontWeight: 600,
                          marginLeft: '2px'
                        }}
                      >
                        {cat.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filter & Sort Actions Group */}
            <div className="filter-controls-group">
              {/* Campaign Sort Control (Section 10 of Prompt 3) */}
              {activeCampaign && (
                <div className="sort-control-wrap">
                  <select 
                    className="form-select form-select-sm sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="recommended">Sort: Recommended</option>
                    <option value="best-fit">Best Creative Fit</option>
                    <option value="available">Available Now</option>
                    <option value="recent">Recently Added</option>
                  </select>
                </div>
              )}

              {/* Saved Creators Toggle */}
              <button
                type="button"
                className={`filter-icon-btn ${showOnlySaved ? 'active' : ''}`}
                onClick={() => setShowOnlySaved(!showOnlySaved)}
                title="View saved creators"
              >
                <Heart size={14} fill={showOnlySaved ? "#EF4444" : "none"} stroke={showOnlySaved ? "#EF4444" : "currentColor"} />
                <span>Saved ({savedCreatorIds.length})</span>
              </button>

              {/* Compact Filters Popover Button */}
              <button
                type="button"
                className={`filter-icon-btn ${activeFiltersCount > 0 ? 'active' : ''}`}
                onClick={() => setShowFilterPopover(!showFilterPopover)}
              >
                <SlidersHorizontal size={14} />
                <span>Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
              </button>
            </div>
          </div>

          {/* Compact Filter Popover Sheet */}
          {showFilterPopover && (
            <div className="filter-popover-card">
              <div className="filter-popover-header">
                <h4>Refine Creators</h4>
                <button 
                  type="button" 
                  className="filter-reset-link"
                  onClick={handleResetFilters}
                >
                  <RotateCcw size={12} />
                  <span>Reset All</span>
                </button>
              </div>

              <div className="filter-popover-grid">
                <div className="filter-popover-col">
                  <label>Industry</label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.industry}
                    onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                  >
                    {FILTER_OPTIONS.industries.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-popover-col">
                  <label>Aesthetic Style</label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.style}
                    onChange={(e) => setFilters({ ...filters, style: e.target.value })}
                  >
                    {FILTER_OPTIONS.styles.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-popover-col">
                  <label>Availability</label>
                  <select
                    className="form-select form-select-sm"
                    value={filters.availability}
                    onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                  >
                    {FILTER_OPTIONS.availability.map((av) => (
                      <option key={av} value={av}>{av}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Natural Language Search Interpretation Bar */}
        {searchQuery.trim() && (
          <div className="search-understanding-bar">
            <div className="search-understanding-left">
              <span className="search-understood-prefix">You searched:</span>
              <span className="search-understood-query">"{searchQuery}"</span>
              <span className="search-understood-dot">•</span>
              <span className="search-understood-prefix">Alloy AI understood:</span>
              <div className="search-understood-tokens">
                {interpretedTokens && interpretedTokens.length > 0 ? (
                  interpretedTokens.map((token, idx) => (
                    <span key={idx} className="understood-token-pill">{token}</span>
                  ))
                ) : (
                  <span className="understood-token-pill">Creative Match</span>
                )}
              </div>
            </div>
            <div className="search-understood-count">
              {processedCreators.length} {processedCreators.length === 1 ? 'creator' : 'creators'} found
            </div>
          </div>
        )}

        {/* Discovery Results Overview Bar */}
        {!searchQuery.trim() && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            <div>
              <span>Showing <strong>{processedCreators.length}</strong> {selectedCategory === 'all' ? 'curated AI creators' : `${selectedCategory} creators`}</span>
              {activeFiltersCount > 0 && (
                <span style={{ marginLeft: '8px', color: 'var(--accent-lavender-deep, #7C3AED)' }}>• {activeFiltersCount} filter(s) active</span>
              )}
            </div>
            {(activeFiltersCount > 0 || selectedCategory !== 'all' || showOnlySaved) && (
              <button 
                type="button" 
                onClick={handleResetFilters}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--accent-lavender-deep, #7C3AED)', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.82rem'
                }}
              >
                <RotateCcw size={12} />
                <span>Reset View</span>
              </button>
            )}
          </div>
        )}

        {/* Creator Masonry Grid */}
        {processedCreators.length > 0 ? (
          <div className="creator-masonry-gallery">
            {processedCreators.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                onSelect={onSelectCreator}
                isSaved={savedCreatorIds.includes(creator.id)}
                onToggleSave={onToggleSaveCreator}
                activeCampaign={activeCampaign}
                onWhyClick={onWhyClick}
              />
            ))}
          </div>
        ) : (
          <div className="discover-empty-state">
            <h3 className="font-editorial empty-state-title">
              {showOnlySaved 
                ? "No saved creators yet." 
                : "Nothing matches this creative direction."}
            </h3>
            <p className="empty-state-desc">
              {showOnlySaved
                ? "Click the heart icon on any creator card or profile to curate your campaign shortlist."
                : "Try a broader creative direction or clear your keyword filters."}
            </p>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={handleResetFilters}
            >
              <RotateCcw size={14} />
              <span>Reset Search & Filters</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
