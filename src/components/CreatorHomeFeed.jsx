// src/components/CreatorHomeFeed.jsx
// ALLOY — Creator Home Feed & Community Dispatches
// Merges expressive creative inspiration with live brand opportunity discovery.

import React, { useState, useMemo } from 'react';
import {
  Compass, Sparkles, Briefcase, ExternalLink, ArrowRight, CheckCircle2,
  Clock, DollarSign, Calendar, Filter, Bookmark, BookmarkCheck,
  ShieldCheck, Layers, Award, Check, UserCheck, Eye, EyeOff, Play,
  ChevronRight, ArrowUpRight, MessageSquare
} from 'lucide-react';
import { CREATORS } from '../data/creatorsData';
import { INITIAL_CAMPAIGNS } from '../data/marketplaceStore';
import './CreatorHomeFeed.css';

// Fallback images in case an external URL encounters network issues
const FALLBACK_MEDIA_IMAGE = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

export default function CreatorHomeFeed({
  creator,
  opportunities = [],
  myApplications = [],
  collaborations = [],
  onApply,
  onViewDetails,
  onOpenProject,
  onViewCreatorProfile,
  onGoToOpportunities,
  onGoToApplications
}) {
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'opportunities' | 'creator-works' | 'showcases'
  const [savedItemIds, setSavedItemIds] = useState(['opp-summer-skincare']);
  const [imageErrorMap, setImageErrorMap] = useState({});

  const handleImageError = (id) => {
    setImageErrorMap(prev => ({ ...prev, [id]: true }));
  };

  const toggleSave = (id) => {
    setSavedItemIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 1. Curate Brand Opportunities from real props / store
  const openOpportunities = useMemo(() => {
    // Prefer passed opportunities (synchronized from parent), fallback to initial campaigns
    const source = (opportunities && opportunities.length > 0)
      ? opportunities
      : INITIAL_CAMPAIGNS.filter(c => c.visibility === 'published');

    return source.map(opp => {
      const hasApplied = myApplications.some(
        a => a.campaignId === opp.id || a.campaignId === opp.campaignId
      );
      const isClosed = opp.status === 'completed' || opp.applicationStatus === 'closed' || (opp.remainingSlots !== undefined && opp.remainingSlots <= 0);

      // Check for niche alignment with logged-in creator using verified portfolio data
      let nicheMatchText = null;
      if (creator) {
        const creatorStyles = creator.styles || [];
        const creatorIndustries = creator.industries || [];
        const creatorSpecialties = [creator.specialty, ...(creator.capabilities || [])].filter(Boolean);
        const desired = opp.desiredCreatorSpecialties || opp.requirements || [];
        const oppStyle = opp.creativeStyle || '';
        const oppIndustry = opp.industry || '';

        const styleMatch = creatorStyles.some(s => s && oppStyle.toLowerCase().includes(s.toLowerCase()));
        const industryMatch = creatorIndustries.some(i => i && oppIndustry.toLowerCase().includes(i.toLowerCase()));
        const specialtyMatch = desired.some(d =>
          creatorSpecialties.some(s => s && d.toLowerCase().includes(s.toLowerCase()))
        );

        if (industryMatch && (styleMatch || specialtyMatch)) {
          nicheMatchText = `Creative Alignment • Matches your ${opp.industry} & ${creator.specialty || 'cinematic'} focus`;
        } else if (industryMatch) {
          nicheMatchText = `Industry Match • Aligned with your ${opp.industry} portfolio`;
        } else if (styleMatch || specialtyMatch) {
          nicheMatchText = `Style Match • Matches your ${creator.specialty || 'visual'} focus`;
        }
      }

      return {
        feedType: 'brand-opportunity',
        id: opp.id,
        rawOpp: opp,
        brandName: opp.brandName || opp.brand || 'Brand Partner',
        brandAvatar: opp.brandAvatar || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
        brandIndustry: opp.industry || 'Commercial Creative',
        title: opp.title,
        brief: opp.description || opp.creativeDirection || 'Looking for an AI creator to deliver high-fidelity campaign assets.',
        coverImage: opp.coverImage || (opp.deliverables?.[0] ? FALLBACK_MEDIA_IMAGE : null),
        budget: opp.budget || '$5,000 – $10,000',
        timeline: opp.timeline || '2–3 Weeks',
        deadline: opp.deadline || 'Open Brief',
        deliverables: opp.deliverables || opp.requirements || ['Campaign Key Stills', 'Motion Loops'],
        remainingSlots: opp.remainingSlots ?? opp.creatorSlots ?? 1,
        totalSlots: opp.creatorSlots ?? 1,
        hasApplied,
        isClosed,
        nicheMatchText,
        isFeatured: opp.id === 'camp-summer-skincare' || opp.isFeatured
      };
    });
  }, [opportunities, myApplications, creator]);

  // Featured hero opportunity (the top active opportunity with cover image)
  const featuredOpportunity = useMemo(() => {
    return openOpportunities.find(o => o.isFeatured && !o.isClosed) || openOpportunities[0] || null;
  }, [openOpportunities]);

  // 2. Curate Creator-Originated Works from community roster & active creator
  const creatorPosts = useMemo(() => {
    const posts = [];

    // Include the active creator's own published works if available
    if (creator && creator.projects && creator.projects.length > 0) {
      creator.projects.slice(0, 2).forEach((proj, idx) => {
        posts.push({
          feedType: 'creator-work',
          id: `my-post-${proj.id || idx}`,
          creatorId: creator.id,
          creatorName: creator.name || 'You',
          creatorHandle: creator.handle || '@me',
          creatorAvatar: creator.avatar || FALLBACK_AVATAR,
          creatorRole: creator.creativeIdentity || creator.specialty || 'AI Visual Artist',
          projectTitle: proj.title,
          projectCategory: proj.category || 'AI Visuals',
          projectDescription: proj.description,
          creativeDirection: proj.creativeDirection,
          tools: proj.tools || 'Midjourney v6.1, Runway Gen-3',
          capabilities: proj.capabilities || ['Visual Storytelling', 'Cinematic Composition'],
          mediaImage: proj.image || FALLBACK_MEDIA_IMAGE,
          mediaAspect: proj.aspect || 'landscape',
          clientType: proj.clientType || 'Original Series',
          timestamp: 'Your Portfolio Showcase',
          rawProject: { ...proj, creatorId: creator.id },
          rawCreator: creator
        });
      });
    }

    // Curate rich works from community creators in CREATORS
    const communityList = CREATORS.filter(c => c.id !== creator?.id);
    communityList.forEach((c, idx) => {
      const heroProject = c.projects?.[0];
      if (heroProject) {
        posts.push({
          feedType: 'creator-work',
          id: `comm-post-${c.id}-${heroProject.id || idx}`,
          creatorId: c.id,
          creatorName: c.name,
          creatorHandle: c.handle,
          creatorAvatar: c.avatar || FALLBACK_AVATAR,
          creatorRole: c.creativeIdentity || c.specialty,
          projectTitle: heroProject.title,
          projectCategory: heroProject.category,
          projectDescription: heroProject.description,
          creativeDirection: heroProject.creativeDirection,
          tools: heroProject.tools || 'Midjourney v6.1, Stable Diffusion',
          capabilities: heroProject.capabilities || [],
          mediaImage: heroProject.image || FALLBACK_MEDIA_IMAGE,
          mediaAspect: heroProject.aspect || 'landscape',
          clientType: heroProject.clientType || 'Commercial Showcase',
          timestamp: idx % 2 === 0 ? '4 hours ago' : 'Yesterday',
          rawProject: { ...heroProject, creatorId: c.id },
          rawCreator: c
        });
      }
    });

    return posts;
  }, [creator]);

  // 3. Curate Completed Collaboration Showcases
  const completedShowcases = useMemo(() => {
    // Showcases from completed projects
    const showcases = [];

    // Check for approved/completed projects in collaborations
    (collaborations || []).forEach(proj => {
      if (proj.status === 'completed' || proj.status === 'approved') {
        showcases.push({
          feedType: 'completed-showcase',
          id: `showcase-${proj.id}`,
          brandName: proj.brandName || 'Brand Partner',
          brandAvatar: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80',
          creatorName: creator?.name || 'Maya Chen',
          creatorAvatar: creator?.avatar || FALLBACK_AVATAR,
          campaignTitle: proj.campaignTitle || 'Commercial Commission',
          deliverablesScope: proj.deliverablesScope || 'Completed deliverables suite',
          agreedBudget: proj.agreedBudget || '$9,000',
          testimonial: proj.latestFeedback || '“Outstanding work. Approved and released final milestone payout.”',
          testimonialAuthor: proj.brandContact || 'Brand Creative Lead',
          rawProject: proj
        });
      }
    });

    // Default canonical showcase if none in prop state (e.g. Aether Nomad 28L)
    if (showcases.length === 0) {
      showcases.push({
        feedType: 'completed-showcase',
        id: 'showcase-aether-nomad',
        brandName: 'Aether Carry Goods',
        brandAvatar: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=200&q=80',
        creatorName: 'Maya Chen',
        creatorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
        campaignTitle: 'AETHER Nomad 28L Campus Series',
        deliverablesScope: '60s Brand Film + 8 Narrative Stills (4K ProRes Master Deliverable)',
        agreedBudget: '$9,000',
        testimonial: '“Outstanding work. Approved and released final milestone payout. Thank you Maya!”',
        testimonialAuthor: 'Marcus Vance (Brand Lead)',
        rawProject: null
      });
    }

    return showcases;
  }, [collaborations, creator]);

  // Combined, purposefully interleaved feed stream
  const feedItems = useMemo(() => {
    if (activeCategory === 'opportunities') {
      return openOpportunities;
    }
    if (activeCategory === 'creator-works') {
      return creatorPosts;
    }
    if (activeCategory === 'showcases') {
      return completedShowcases;
    }

    // 'all' category: Interleave creator works, brand opportunities, and completed collaborations
    const combined = [];
    const oppCopy = [...openOpportunities];
    const postCopy = [...creatorPosts];
    const showCopy = [...completedShowcases];

    // If featured opportunity exists, take it out so it's not rendered redundantly in the stream
    const oppStream = oppCopy.filter(o => o.id !== featuredOpportunity?.id);

    let postIdx = 0;
    let oppIdx = 0;
    let showIdx = 0;

    // Pattern: 1 Creator Work -> 1 Brand Opportunity -> 1 Creator Work -> 1 Completed Showcase...
    while (postIdx < postCopy.length || oppIdx < oppStream.length || showIdx < showCopy.length) {
      if (postIdx < postCopy.length) combined.push(postCopy[postIdx++]);
      if (oppIdx < oppStream.length) combined.push(oppStream[oppIdx++]);
      if (postIdx < postCopy.length) combined.push(postCopy[postIdx++]);
      if (showIdx < showCopy.length) combined.push(showCopy[showIdx++]);
    }

    return combined;
  }, [activeCategory, openOpportunities, creatorPosts, completedShowcases, featuredOpportunity]);

  return (
    <div className="creator-home-feed-container" role="region" aria-label="Creator Community Home Feed">
      {/* ----------------------------------------------------
          1. HEADER & EDITORIAL DISPATCH INTRO
          ---------------------------------------------------- */}
      <section className="feed-header-section">
        <div className="feed-header-top">
          <div>
            <div className="feed-kicker-row">
              <span className="feed-live-dot" aria-hidden="true" />
              <span className="feed-kicker-text">Live Community Dispatch & Opportunities</span>
            </div>
            <h1 className="feed-main-title">
              Welcome back{creator?.name ? `, ${creator.name.split(' ')[0]}` : ''}.
            </h1>
            <p className="feed-main-subtitle">
              Explore groundbreaking creative experiments from fellow AI directors and discover active commercial briefs tailored for your portfolio.
            </p>
          </div>

          <div className="feed-quick-stats" aria-label="Creator Feed Activity Summary">
            <div className="feed-stat-item">
              <span className="feed-stat-num">{openOpportunities.filter(o => !o.isClosed).length}</span>
              <span className="feed-stat-label">Open Briefs</span>
            </div>
            <div className="feed-stat-divider" aria-hidden="true" />
            <div className="feed-stat-item">
              <span className="feed-stat-num">{myApplications.length}</span>
              <span className="feed-stat-label">Your Bids</span>
            </div>
            <div className="feed-stat-divider" aria-hidden="true" />
            <div className="feed-stat-item">
              <span className="feed-stat-num">{CREATORS.length}</span>
              <span className="feed-stat-label">AI Roster</span>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <nav className="feed-filter-bar" role="tablist" aria-label="Feed Content Filters">
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'all'}
            className={`feed-filter-pill ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            <Compass size={14} aria-hidden="true" />
            <span>All Dispatches</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'opportunities'}
            className={`feed-filter-pill ${activeCategory === 'opportunities' ? 'active' : ''}`}
            onClick={() => setActiveCategory('opportunities')}
          >
            <Briefcase size={14} aria-hidden="true" />
            <span>Brand Opportunities</span>
            <span className="feed-filter-count">{openOpportunities.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'creator-works'}
            className={`feed-filter-pill ${activeCategory === 'creator-works' ? 'active' : ''}`}
            onClick={() => setActiveCategory('creator-works')}
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>Creator Works</span>
            <span className="feed-filter-count">{creatorPosts.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'showcases'}
            className={`feed-filter-pill ${activeCategory === 'showcases' ? 'active' : ''}`}
            onClick={() => setActiveCategory('showcases')}
          >
            <Award size={14} aria-hidden="true" />
            <span>Completed Collaborations</span>
            <span className="feed-filter-count">{completedShowcases.length}</span>
          </button>
        </nav>
      </section>

      {/* ----------------------------------------------------
          2. FEATURED HERO OPPORTUNITY (INITIAL VIEWPORT PROMINENCE)
          Rendered when on 'all' or 'opportunities' to guarantee
          brand opportunities have immediate visual presence.
          ---------------------------------------------------- */}
      {(activeCategory === 'all' || activeCategory === 'opportunities') && featuredOpportunity && (
        <article
          className="feed-featured-opportunity"
          aria-label={`Featured Brand Opportunity: ${featuredOpportunity.title} by ${featuredOpportunity.brandName}`}
        >
          {/* Left Media Column */}
          <div className="featured-media-container">
            <img
              src={imageErrorMap[featuredOpportunity.id] ? FALLBACK_MEDIA_IMAGE : (featuredOpportunity.coverImage || FALLBACK_MEDIA_IMAGE)}
              alt={`${featuredOpportunity.title} campaign visual`}
              className="featured-cover-img"
              onError={() => handleImageError(featuredOpportunity.id)}
            />
            <div className="featured-media-overlay">
              <span className="featured-badge-pill">
                <Sparkles size={12} aria-hidden="true" />
                Featured Brand Opportunity
              </span>
              <span className="featured-slots-chip">
                <CheckCircle2 size={13} style={{ color: 'var(--accent-gold)' }} aria-hidden="true" />
                {featuredOpportunity.remainingSlots} of {featuredOpportunity.totalSlots} creator slot{featuredOpportunity.totalSlots > 1 ? 's' : ''} available
              </span>
            </div>
          </div>

          {/* Right Content Panel */}
          <div className="featured-content-panel">
            <div>
              <div className="featured-brand-row">
                <img
                  src={featuredOpportunity.brandAvatar}
                  alt={featuredOpportunity.brandName}
                  className="featured-brand-avatar"
                  onError={(e) => { e.target.src = FALLBACK_AVATAR; }}
                />
                <div>
                  <span className="featured-brand-name">
                    {featuredOpportunity.brandName}
                    <ShieldCheck size={14} style={{ color: 'var(--accent-gold)' }} title="Verified Brand Partner" aria-label="Verified Brand Partner" />
                  </span>
                  <span className="featured-brand-industry">{featuredOpportunity.brandIndustry}</span>
                </div>
              </div>

              <h2 className="featured-campaign-title">
                {featuredOpportunity.title}
              </h2>

              <p className="featured-brief-text">
                {featuredOpportunity.brief}
              </p>
            </div>

            {/* Opportunity Specs Grid */}
            <div className="featured-specs-grid" aria-label="Campaign Compensation and Timeline">
              <div className="featured-spec-box">
                <span className="featured-spec-label">Compensation</span>
                <span className="featured-spec-value gold">{featuredOpportunity.budget}</span>
              </div>
              <div className="featured-spec-box">
                <span className="featured-spec-label">Timeline</span>
                <span className="featured-spec-value">{featuredOpportunity.timeline}</span>
              </div>
              <div className="featured-spec-box">
                <span className="featured-spec-label">Deadline</span>
                <span className="featured-spec-value">{featuredOpportunity.deadline}</span>
              </div>
            </div>

            {/* Deliverables summary */}
            <div className="featured-deliverables-row" aria-label="Deliverables">
              {featuredOpportunity.deliverables.slice(0, 3).map((deliv, dIdx) => (
                <span key={dIdx} className="featured-deliverable-tag">
                  {deliv}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div className="featured-actions-row">
              {featuredOpportunity.hasApplied ? (
                <button
                  type="button"
                  className="btn-featured-apply applied"
                  onClick={onGoToApplications}
                  style={{ background: '#374151', color: '#E5E7EB' }}
                >
                  <Check size={15} aria-hidden="true" />
                  <span>Proposal Submitted</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-featured-apply"
                  onClick={() => onApply && onApply(featuredOpportunity.rawOpp)}
                >
                  <span>Apply to Campaign</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                className="btn-featured-details"
                onClick={() => onViewDetails && onViewDetails(featuredOpportunity.rawOpp)}
              >
                <span>View Full Brief</span>
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </article>
      )}

      {/* ----------------------------------------------------
          3. MAIN FEED STREAM
          ---------------------------------------------------- */}
      <main className="feed-stream-container" aria-label="Community & Opportunities Stream">
        {feedItems.length === 0 ? (
          <div className="feed-empty-state">
            <Compass size={40} className="feed-empty-icon" aria-hidden="true" />
            <h3 className="feed-empty-title">No dispatches match this category</h3>
            <p className="feed-empty-desc">
              Try switching back to "All Dispatches" to view community creations and active commercial briefs.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setActiveCategory('all')}
            >
              Reset Category
            </button>
          </div>
        ) : (
          feedItems.map(item => {
            // ------------------------------------------------
            // RENDER ITEM A: CREATOR-ORIGINATED WORK POST
            // ------------------------------------------------
            if (item.feedType === 'creator-work') {
              return (
                <article
                  key={item.id}
                  className={`feed-card creator-work-card ${item.mediaAspect === 'portrait' ? 'has-portrait-media' : ''}`}
                  aria-label={`Creator Work: ${item.projectTitle} by ${item.creatorName}`}
                >
                  {/* Creator Header */}
                  <header className="card-creator-header">
                    <div
                      className="creator-identity-group"
                      onClick={() => onViewCreatorProfile && onViewCreatorProfile(item.creatorId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onViewCreatorProfile && onViewCreatorProfile(item.creatorId);
                        }
                      }}
                      aria-label={`View ${item.creatorName}'s profile`}
                    >
                      <img
                        src={item.creatorAvatar}
                        alt=""
                        className="creator-feed-avatar"
                        onError={(e) => { e.target.src = FALLBACK_AVATAR; }}
                      />
                      <div>
                        <span className="creator-name-title">
                          {item.creatorName}
                          <UserCheck size={14} style={{ color: 'var(--accent-forest)' }} aria-label="Verified Creator" />
                        </span>
                        <span className="creator-niche-sub">{item.creatorRole}</span>
                      </div>
                    </div>

                    <span className="card-time-badge">{item.timestamp}</span>
                  </header>

                  {/* Media Viewport */}
                  <div
                    className={`card-media-viewport ${item.mediaAspect === 'portrait' ? 'aspect-portrait' : ''}`}
                    onClick={() => onOpenProject && onOpenProject(item.rawProject, item.rawCreator)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onOpenProject && onOpenProject(item.rawProject, item.rawCreator);
                      }
                    }}
                    aria-label={`Open media view for ${item.projectTitle}`}
                  >
                    <img
                      src={imageErrorMap[item.id] ? FALLBACK_MEDIA_IMAGE : item.mediaImage}
                      alt={item.projectTitle}
                      className="card-media-img"
                      onError={() => handleImageError(item.id)}
                    />
                    <div className="card-media-badge">
                      <Sparkles size={12} aria-hidden="true" />
                      <span>{item.projectCategory}</span>
                    </div>
                  </div>

                  {/* Creator Body */}
                  <div className="card-creator-body">
                    <h3 className="card-project-title">
                      {item.projectTitle}
                    </h3>

                    {item.projectDescription && (
                      <p className="card-project-description">
                        {item.projectDescription}
                      </p>
                    )}

                    {item.creativeDirection && (
                      <blockquote className="card-creative-direction-quote">
                        “{item.creativeDirection}”
                      </blockquote>
                    )}

                    {/* Tools and Capabilities Tags */}
                    <div className="card-tags-row">
                      <span className="card-tool-tag">
                        <Layers size={11} aria-hidden="true" />
                        {item.tools}
                      </span>
                      {item.capabilities.map((cap, capIdx) => (
                        <span key={capIdx} className="card-capability-tag">
                          {cap}
                        </span>
                      ))}
                    </div>

                    {/* Footer Actions */}
                    <footer className="card-footer-actions">
                      <button
                        type="button"
                        className="btn-card-explore"
                        onClick={() => onOpenProject && onOpenProject(item.rawProject, item.rawCreator)}
                      >
                        <span>Explore Project Details</span>
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        className="btn-card-profile"
                        onClick={() => onViewCreatorProfile && onViewCreatorProfile(item.creatorId)}
                      >
                        View {item.creatorName.split(' ')[0]}'s Profile
                      </button>
                    </footer>
                  </div>
                </article>
              );
            }

            // ------------------------------------------------
            // RENDER ITEM B: BRAND-ORIGINATED OPEN OPPORTUNITY
            // ------------------------------------------------
            if (item.feedType === 'brand-opportunity') {
              const isSaved = savedItemIds.includes(item.id);

              return (
                <article
                  key={item.id}
                  className="feed-card brand-opportunity-card"
                  aria-label={`Brand Opportunity: ${item.title} by ${item.brandName}`}
                >
                  {/* Distinctive Brand Opportunity Kicker Strip */}
                  <div className="card-brand-kicker-strip">
                    <span className="brand-opportunity-kicker">
                      <Briefcase size={13} aria-hidden="true" />
                      Brand Opportunity • Open Commercial Brief
                    </span>

                    <button
                      type="button"
                      className="btn-icon-bookmark"
                      onClick={() => toggleSave(item.id)}
                      title={isSaved ? "Saved" : "Save opportunity"}
                      aria-label={isSaved ? "Remove from saved" : "Save opportunity"}
                    >
                      {isSaved ? <BookmarkCheck size={17} style={{ color: 'var(--accent-gold)' }} /> : <Bookmark size={17} />}
                    </button>
                  </div>

                  <div className="card-brand-body">
                    {/* Brand Top Row */}
                    <header className="brand-card-top-row">
                      <div className="brand-identity-stack">
                        <img
                          src={item.brandAvatar}
                          alt=""
                          className="brand-card-logo"
                          onError={(e) => { e.target.src = FALLBACK_AVATAR; }}
                        />
                        <div>
                          <span className="brand-card-name">
                            {item.brandName}
                            <ShieldCheck size={14} style={{ color: 'var(--accent-forest)' }} title="Verified Brand Partner" aria-label="Verified Brand Partner" />
                          </span>
                          <span className="brand-card-industry">{item.brandIndustry}</span>
                        </div>
                      </div>

                      <span className="featured-slots-chip" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }}>
                        <CheckCircle2 size={13} style={{ color: 'var(--accent-forest)' }} aria-hidden="true" />
                        {item.remainingSlots} of {item.totalSlots} slot{item.totalSlots > 1 ? 's' : ''} left
                      </span>
                    </header>

                    {/* Campaign Title & Brief */}
                    <div>
                      <h3 className="brand-card-campaign-title">
                        {item.title}
                      </h3>
                      <p className="brand-card-brief">
                        {item.brief}
                      </p>
                    </div>

                    {/* Niche Match Banner (Personalization without fabrication) */}
                    {item.nicheMatchText && (
                      <div className="brand-match-banner" role="status">
                        <Sparkles size={14} aria-hidden="true" />
                        <span>{item.nicheMatchText}</span>
                      </div>
                    )}

                    {/* Specs Strip */}
                    <div className="brand-specs-strip" aria-label="Campaign Parameters">
                      <span className="brand-spec-pill budget">
                        <DollarSign size={14} aria-hidden="true" />
                        {item.budget}
                      </span>
                      <span className="brand-spec-pill">
                        <Clock size={14} aria-hidden="true" />
                        {item.timeline}
                      </span>
                      <span className="brand-spec-pill">
                        <Calendar size={14} aria-hidden="true" />
                        Deadline: {item.deadline}
                      </span>
                    </div>

                    {/* Deliverables summary */}
                    <div className="featured-deliverables-row">
                      {item.deliverables.map((deliv, dIdx) => (
                        <span key={dIdx} className="card-capability-tag">
                          {deliv}
                        </span>
                      ))}
                    </div>

                    {/* Card Actions */}
                    <footer className="brand-card-actions">
                      {item.hasApplied ? (
                        <button
                          type="button"
                          className="btn-brand-apply applied"
                          onClick={onGoToApplications}
                        >
                          <Check size={14} aria-hidden="true" />
                          <span>Proposal Submitted</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-brand-apply"
                          onClick={() => onApply && onApply(item.rawOpp)}
                        >
                          <span>Apply to Campaign</span>
                          <ArrowRight size={14} aria-hidden="true" />
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-brand-details"
                        onClick={() => onViewDetails && onViewDetails(item.rawOpp)}
                      >
                        <span>View Brief Details</span>
                      </button>
                    </footer>
                  </div>
                </article>
              );
            }

            // ------------------------------------------------
            // RENDER ITEM C: COMPLETED COLLABORATION SHOWCASE
            // ------------------------------------------------
            if (item.feedType === 'completed-showcase') {
              return (
                <article
                  key={item.id}
                  className="feed-card collaboration-showcase-card"
                  aria-label={`Completed Collaboration: ${item.campaignTitle} with ${item.brandName}`}
                >
                  {/* Distinct Showcase Header Strip */}
                  <div className="showcase-header-strip">
                    <span className="showcase-status-badge">
                      <Award size={13} aria-hidden="true" />
                      Completed Collaboration Showcase • Not Accepting Applications
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--accent-bronze)', fontWeight: 600 }}>
                      Delivered & Verified
                    </span>
                  </div>

                  {/* Partnership Identifiers */}
                  <div className="showcase-partnership-row">
                    <div className="showcase-avatars-joined" aria-label={`${item.brandName} and ${item.creatorName}`}>
                      <img
                        src={item.brandAvatar}
                        alt={item.brandName}
                        className="showcase-brand-avatar"
                        onError={(e) => { e.target.src = FALLBACK_AVATAR; }}
                      />
                      <img
                        src={item.creatorAvatar}
                        alt={item.creatorName}
                        className="showcase-creator-avatar"
                        onError={(e) => { e.target.src = FALLBACK_AVATAR; }}
                      />
                    </div>

                    <div className="showcase-partnership-names">
                      <h3 className="showcase-partner-title">
                        {item.brandName} × {item.creatorName}
                      </h3>
                      <span className="showcase-scope-subtitle">
                        {item.campaignTitle} • {item.deliverablesScope}
                      </span>
                    </div>
                  </div>

                  {/* Client Feedback / Outcome Quote */}
                  <blockquote className="showcase-testimonial-box">
                    <p className="showcase-quote-text">
                      {item.testimonial}
                    </p>
                    <cite className="showcase-quote-author">
                      — {item.testimonialAuthor}
                    </cite>
                  </blockquote>

                  {/* Showcase Meta Details */}
                  <footer className="showcase-details-row">
                    <span><strong>Agreed Compensation:</strong> {item.agreedBudget}</span>
                    <span style={{ color: 'var(--accent-forest)', fontWeight: 600 }}>
                      <CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                      All Milestone Deliverables Approved
                    </span>
                  </footer>
                </article>
              );
            }

            return null;
          })
        )}
      </main>
    </div>
  );
}
