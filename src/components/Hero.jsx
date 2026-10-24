// src/components/Hero.jsx
// ALLOY — Redesigned Editorial Hero Section with Original Campaign Artwork
// Incorporates the newly generated original Alloy campaign masterpiece:
// - Left: Eyebrow pill, editorial serif headline, refined copy, dual CTAs, live database-backed stats
// - Right: Prominent, high-resolution editorial campaign image with subtle depth

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { subscribeToMarketplace } from '../data/marketplaceStore';

export default function Hero({ 
  onFindCreator, 
  onJoinCreator, 
  onExploreWork,
  onSelectCreator,
  onStartJudgeTour
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [metrics, setMetrics] = useState({
    verifiedCreators: null,
    verifiedBrands: null,
    campaignOversight: null,
    loading: true,
    error: false
  });

  const isMountedRef = useRef(true);
  const refreshTimeoutRef = useRef(null);

  const fetchLiveMetrics = useCallback(async (isBackground = false) => {
    try {
      const res = await fetch('/api/public-metrics');
      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.ok && isMountedRef.current) {
        setMetrics(prev => ({
          verifiedCreators: typeof data.verifiedCreators === 'number' ? data.verifiedCreators : (prev.verifiedCreators ?? 0),
          verifiedBrands: typeof data.verifiedBrands === 'number' ? data.verifiedBrands : (prev.verifiedBrands ?? 0),
          campaignOversight: typeof data.campaignOversight === 'number' ? data.campaignOversight : (prev.campaignOversight ?? 0),
          loading: false,
          error: false
        }));
        return;
      }
      throw new Error(data?.error || 'Invalid metrics response structure');
    } catch (err) {
      // Direct client-side Supabase read fallback if server middleware is unreachable
      if (isSupabaseConfigured() && supabase) {
        try {
          const [cRes, bRes, campRes] = await Promise.all([
            supabase.from('creator_profiles').select('id', { count: 'exact', head: true }).neq('status', 'suspended').neq('status', 'Archived'),
            supabase.from('brands').select('id', { count: 'exact', head: true }),
            supabase.from('campaigns').select('id', { count: 'exact', head: true })
          ]);
          if (isMountedRef.current) {
            setMetrics({
              verifiedCreators: cRes.count ?? 0,
              verifiedBrands: bRes.count ?? 0,
              campaignOversight: campRes.count ?? 0,
              loading: false,
              error: false
            });
            return;
          }
        } catch {
          // Fall through to error state handling
        }
      }

      if (isMountedRef.current) {
        // Retain last known metrics if available; flag error only if no numbers exist yet
        setMetrics(prev => ({
          ...prev,
          loading: false,
          error: prev.verifiedCreators === null
        }));
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchLiveMetrics(false);

    // Debounced refresher to avoid burst queries
    const triggerDebouncedRefresh = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        fetchLiveMetrics(true);
      }, 300);
    };

    // 1. Refresh when window regains focus
    const handleFocus = () => fetchLiveMetrics(true);
    window.addEventListener('focus', handleFocus);

    // 2. Refresh on periodic interval (30s)
    const intervalId = setInterval(() => fetchLiveMetrics(true), 30000);

    // 3. Subscribe to local store cross-tab & within-session events
    const unsubStore = subscribeToMarketplace(() => {
      triggerDebouncedRefresh();
    });

    // 4. Subscribe to Supabase Realtime Postgres Changes
    let realtimeChannel = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        realtimeChannel = supabase.channel('alloy-hero-live-metrics')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'creator_profiles' }, () => triggerDebouncedRefresh())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'brands' }, () => triggerDebouncedRefresh())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => triggerDebouncedRefresh())
          .subscribe();
      } catch (subErr) {
        console.warn('[Hero Realtime] Subscription notice:', subErr.message);
      }
    }

    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
      if (typeof unsubStore === 'function') unsubStore();
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [fetchLiveMetrics]);

  return (
    <section className="alloy-editorial-hero" id="home">
      <div className="page-container-wide alloy-editorial-container">
        
        {/* ============================================================
            LEFT COLUMN: Editorial Typography, Actions & Traction Stats
            ============================================================ */}
        <div className="alloy-hero-left">
          
          {/* Eyebrow Pill */}
          <div className="hero-eyebrow-pill">
            <span className="hero-eyebrow-dot" />
            <span>THE AI CREATOR MARKETPLACE</span>
          </div>

          {/* Master Headline */}
          <h1 className="hero-title-editorial font-editorial">
            Different minds.<br />
            <span className="title-accent-vision">
              One vision.
            </span>
          </h1>

          {/* Supporting Description */}
          <p className="hero-desc-editorial">
            Discover AI creators, explore distinctive creative work, and connect with the right talent to bring your next campaign to life.
          </p>

          {/* Dual Primary / Secondary CTAs */}
          <div className="hero-editorial-actions">
            <button 
              type="button" 
              className="btn-hire-creator"
              onClick={onExploreWork || onFindCreator}
              id="hero-explore-creators-btn"
            >
              <span>Explore Creators</span>
              <ArrowRight size={14} />
            </button>

            <button 
              type="button" 
              className="btn-become-creator"
              onClick={onJoinCreator}
              id="hero-become-creator-btn"
            >
              <span>I'm a Creator</span>
            </button>

            {onStartJudgeTour && (
              <button 
                type="button" 
                className="btn-hero-tour"
                onClick={onStartJudgeTour}
                id="hero-judge-tour-btn"
                aria-label="Start Judge Demo Tour"
              >
                <Sparkles size={14} className="text-bronze" />
                <span>Start Judge Demo</span>
              </button>
            )}
          </div>

          {/* Verified Traction Stats Strip (Live Super Admin Data) */}
          <div className="hero-stats-strip" id="hero-live-metrics-strip" aria-label="Platform Statistics">
            {/* Metric 1: Verified Creators */}
            <div className="stat-unit" id="hero-metric-creators">
              <span className="stat-digits font-editorial">
                {metrics.loading && metrics.verifiedCreators === null ? (
                  <span className="stat-placeholder" aria-label="Loading verified creators count">—</span>
                ) : (
                  (metrics.verifiedCreators ?? 0).toLocaleString()
                )}
              </span>
              <span className="stat-caption">VERIFIED CREATORS</span>
            </div>

            <div className="stat-separator" />

            {/* Metric 2: Verified Brands */}
            <div className="stat-unit" id="hero-metric-brands">
              <span className="stat-digits font-editorial">
                {metrics.loading && metrics.verifiedBrands === null ? (
                  <span className="stat-placeholder" aria-label="Loading verified brands count">—</span>
                ) : (
                  (metrics.verifiedBrands ?? 0).toLocaleString()
                )}
              </span>
              <span className="stat-caption">VERIFIED BRANDS</span>
            </div>

            <div className="stat-separator" />

            {/* Metric 3: Campaign Oversight */}
            <div className="stat-unit" id="hero-metric-campaigns">
              <span className="stat-digits font-editorial">
                {metrics.loading && metrics.campaignOversight === null ? (
                  <span className="stat-placeholder" aria-label="Loading campaign oversight count">—</span>
                ) : (
                  (metrics.campaignOversight ?? 0).toLocaleString()
                )}
              </span>
              <span className="stat-caption">CAMPAIGN OVERSIGHT</span>
            </div>
          </div>

        </div>

        {/* ============================================================
            RIGHT COLUMN: The Original Editorial Campaign Centerpiece
            ============================================================ */}
        <div className="alloy-hero-right">
          <div className={`hero-artwork-frame ${imageLoaded ? 'artwork-loaded' : ''}`}>
            
            <img 
              src="/assets/alloy-creative-hero.webp" 
              alt="Alloy Editorial Creative Campaign Composition — Haute couture, beauty, spatial CGI, and architectural artwork" 
              className="hero-campaign-artwork"
              onLoad={() => setImageLoaded(true)}
              loading="eager"
            />

            {/* Subtle Editorial Caption Badge */}
            <div className="artwork-editorial-badge">
              <Sparkles size={12} className="badge-sparkle-icon" />
              <span>Curated Creative Direction • 2026 Collection</span>
            </div>

          </div>
        </div>

      </div>

      {/* Subtle Scroll Indicator */}
      <div 
        className="hero-scroll-indicator"
        onClick={() => {
          const el = document.getElementById('how-it-works') || document.querySelector('main > section:nth-of-type(2)');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        aria-label="Scroll to explore"
      >
        <div className="scroll-arrow-circle">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </div>
        <span className="scroll-caption-text">Scroll to explore</span>
      </div>

    </section>
  );
}
