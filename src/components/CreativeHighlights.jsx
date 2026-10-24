// src/components/CreativeHighlights.jsx
// SECTION C: Creative Highlights
// Inspired by Apple's product introduction highlights: compact, visual, editorial arrangement before deep technical details.

import React from 'react';
import { Compass, Sparkles, Eye, Layers, ArrowRight } from 'lucide-react';

export default function CreativeHighlights({ 
  onExploreDiscover, 
  onExploreConcepts, 
  onExploreWorkspaces 
}) {
  const highlights = [
    {
      id: 'highlight-discover',
      number: '01',
      label: 'Discover Talent',
      title: 'Discover creative talent with proven aesthetic craft.',
      description: 'Explore curated AI directors, 3D artists, and visual stylists whose portfolios demonstrate real mastery in light, texture, and storytelling.',
      tag: 'Curated Roster',
      accentColor: 'var(--accent-lavender)',
      accentBorder: 'rgba(139, 92, 246, 0.25)',
      previewImage: '/portfolios/maya-chen-portfolio.jpg',
      meta: '14 Vetted Creators • Verified Portfolios',
      action: onExploreDiscover
    },
    {
      id: 'highlight-match',
      number: '02',
      label: 'Understand Fit',
      title: 'Understand creative fit backed by tangible evidence.',
      description: 'CreaMatch evaluates style, format, and past client projects across 6 deterministic dimensions—explaining exactly why a creator fits your brief.',
      tag: 'CreaMatch & CreaScore',
      accentColor: 'var(--accent-peach)',
      accentBorder: 'rgba(249, 115, 22, 0.25)',
      previewImage: '/portfolios/alex-rivera-portfolio.jpg',
      meta: '6-Dimension Evaluation • Zero Astrology',
      action: onExploreDiscover
    },
    {
      id: 'highlight-concepts',
      number: '03',
      label: 'Explore Concepts',
      title: 'Explore campaign concepts before you hire.',
      description: 'Preview creator-specific creative directions with CreaSim™—synthesizing 3-scene storyboards, lighting palettes, and aesthetic interpretations.',
      tag: 'CreaSim Previews',
      accentColor: 'var(--accent-pink)',
      accentBorder: 'rgba(236, 72, 153, 0.25)',
      previewImage: '/portfolios/elena-rostova-portfolio.jpg',
      meta: '3-Scene Storyboards • Palettes & Turnarounds',
      action: onExploreConcepts
    },
    {
      id: 'highlight-collaborate',
      number: '04',
      label: 'Seamless Collaboration',
      title: 'Collaborate seamlessly from brief to delivery.',
      description: 'Manage invitations, milestones, frame-by-frame deliverable reviews, and approvals within dedicated workspaces designed for creative production.',
      tag: 'Dedicated Workspaces',
      accentColor: 'var(--accent-mint)',
      accentBorder: 'rgba(16, 185, 129, 0.25)',
      previewImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=85',
      meta: 'Brand Studio & Creator Studio Connected',
      action: onExploreWorkspaces
    }
  ];

  return (
    <section className="section-highlights" id="highlights">
      <div className="page-container">
        {/* Section Header with Apple-grade restrained elegance */}
        <div className="highlights-header">
          <div className="section-pill-tag">
            <span className="pill-dot-sm" />
            <span>Platform Highlights</span>
          </div>
          <h2 className="highlights-headline">
            Creativity, engineered with intention.
          </h2>
          <p className="highlights-subhead">
            Everything you need to discover exceptional AI talent, align on creative directions, 
            and bring ambitious visual campaigns to life.
          </p>
        </div>

        {/* Highlights Editorial Grid */}
        <div className="highlights-grid">
          {highlights.map((item) => (
            <div 
              key={item.id} 
              className="highlight-card"
              style={{ '--card-accent': item.accentColor, '--card-border': item.accentBorder }}
              onClick={item.action}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => e.key === 'Enter' && item.action && item.action()}
            >
              {/* Top metadata */}
              <div className="highlight-top">
                <span className="highlight-number">{item.number}</span>
                <span className="highlight-tag-badge">{item.tag}</span>
              </div>

              {/* Visual Composition Container (Deliberate Aspect Ratio) */}
              <div className="highlight-visual-box">
                <img 
                  src={item.previewImage} 
                  alt={item.title}
                  className="highlight-img"
                  loading="lazy"
                />
                <div className="highlight-visual-overlay" />
                <span className="highlight-meta-pill">{item.meta}</span>
              </div>

              {/* Text content */}
              <div className="highlight-body">
                <h3 className="highlight-title">{item.title}</h3>
                <p className="highlight-desc">{item.description}</p>
                <div className="highlight-action-row">
                  <span className="highlight-action-text">{item.label}</span>
                  <ArrowRight size={14} className="highlight-arrow" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
