// src/components/CreaMatchSection.jsx
// SECTION 5 — Show How Matching Works
// Heading: "Not just discovered. Well matched."
// Explaining style alignment, portfolio evidence, and campaign requirements using existing engine.

import React, { useState } from 'react';
import { Sparkles, ArrowRight, Check, SlidersHorizontal } from 'lucide-react';
import { calculateCreaMatch } from '../intelligence/matchingEngine';
import { explainMatch } from '../intelligence/matchExplainer';

export default function CreaMatchSection({ creators = [], onExploreDiscover, onEnterBrandStudio }) {
  const sampleCampaigns = [
    {
      id: 'lumina-skincare',
      label: 'Botanical Skincare Brief',
      title: 'Veda Botanics — Pure Hydration Campaign',
      industry: 'Beauty & Skincare',
      creativeStyle: 'Clean, Minimal, Luminous, Botanical, Organic',
      contentFormats: ['4K Stills Suite', 'E-Commerce Hero Assets'],
      platforms: ['Instagram', 'Digital OOH'],
      budget: '₹50,000 – ₹1,00,000',
      timeline: '2–3 Weeks',
      deliverables: '3x Hero Stills, 2x Vertical Loops'
    },
    {
      id: 'obsidian-audio',
      label: 'Industrial Audio Hardware Brief',
      title: 'Dhvani Acoustics — Spatial Headphone Debut',
      industry: 'Consumer Tech & Hardware',
      creativeStyle: 'Cinematic, Moody, Macro, Industrial Precision',
      contentFormats: ['4K Stills Suite', '9:16 Kinetic Loops'],
      platforms: ['Instagram', 'YouTube'],
      budget: '₹80,000 – ₹1,20,000',
      timeline: '3 Weeks',
      deliverables: '4K Exploded CGI Stills, 15s Kinetic Loop'
    }
  ];

  const [activeCampIndex, setActiveCampIndex] = useState(0);
  const currentCampaign = sampleCampaigns[activeCampIndex];

  // Evaluate matching across prominent creators using genuine engine
  const evaluatedTalent = ['zora-vance', 'alex-rivera', 'maya-chen', 'elena-rostova']
    .map(id => creators.find(c => c.id === id))
    .filter(Boolean)
    .map(creator => ({
      creator,
      match: calculateCreaMatch(currentCampaign, creator),
      explanation: explainMatch(currentCampaign, creator)
    }))
    .sort((a, b) => b.match.score - a.match.score);

  const bestMatch = evaluatedTalent[0];

  return (
    <section className="alloy-matching-section" id="matching">
      <div className="page-container alloy-matching-container">
        
        {/* Section Header */}
        <div className="alloy-matching-header">
          <div className="section-pill-badge">
            <span className="pill-dot" />
            <span>INTELLIGENT MATCHING</span>
          </div>

          <h2 className="matching-headline font-editorial">
            Not just discovered. Well matched.
          </h2>

          <p className="matching-subtext">
            Finding a creator involves more than searching names: creative style, portfolio evidence, specialization, and campaign requirements all help inform a suitable match.
          </p>

          {/* Campaign Brief Selector */}
          <div className="matching-brief-switcher">
            <span className="switcher-label">Sample Brief:</span>
            <div className="switcher-pills">
              {sampleCampaigns.map((camp, idx) => (
                <button
                  key={camp.id}
                  type="button"
                  className={`switcher-pill ${activeCampIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveCampIndex(idx)}
                >
                  <span>{camp.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Matching Analysis Editorial Card */}
        {bestMatch && (
          <div className="matching-preview-card">
            <div className="matching-card-left">
              <div className="matching-brief-meta">
                <span className="brief-tag">{currentCampaign.industry}</span>
                <h3 className="brief-title font-editorial">{currentCampaign.title}</h3>
                <p className="brief-style-desc">
                  Required Style: <strong>{currentCampaign.creativeStyle}</strong>
                </p>
              </div>

              <div className="matching-dimensions-list">
                <h4 className="dimensions-title">Portfolio Evidence Alignment</h4>
                <div className="dimension-row">
                  <span className="dimension-name">Style Consistency</span>
                  <div className="dimension-bar-track">
                    <div className="dimension-bar-fill" style={{ width: `${bestMatch.match.score}%` }} />
                  </div>
                  <span className="dimension-val">{bestMatch.match.score}%</span>
                </div>
                <div className="dimension-row">
                  <span className="dimension-name">Specialization Fit</span>
                  <div className="dimension-bar-track">
                    <div className="dimension-bar-fill" style={{ width: `${Math.min(bestMatch.match.score + 2, 98)}%` }} />
                  </div>
                  <span className="dimension-val">{Math.min(bestMatch.match.score + 2, 98)}%</span>
                </div>
                <div className="dimension-row">
                  <span className="dimension-name">Technical Capability</span>
                  <div className="dimension-bar-track">
                    <div className="dimension-bar-fill" style={{ width: '95%' }} />
                  </div>
                  <span className="dimension-val">95%</span>
                </div>
              </div>
            </div>

            <div className="matching-card-right">
              <div className="recommended-creator-box">
                <div className="creator-header-row">
                  <img 
                    src={bestMatch.creator.avatar} 
                    alt={bestMatch.creator.name} 
                    className="creator-avatar-img"
                  />
                  <div className="creator-info-meta">
                    <span className="creator-badge-recommended">Top Fit Creator</span>
                    <h4 className="creator-name font-editorial">{bestMatch.creator.name}</h4>
                    <span className="creator-specialty">{bestMatch.creator.creativeIdentity || bestMatch.creator.primaryMedium}</span>
                  </div>
                </div>

                <div className="creator-work-preview-thumb">
                  <img 
                    src={bestMatch.creator.projects?.[0]?.image || bestMatch.creator.heroWork} 
                    alt="Featured creator work" 
                    className="matched-work-image"
                  />
                  <div className="matched-work-caption">
                    <span>Portfolio Proof: {bestMatch.creator.projects?.[0]?.title || 'Featured Project'}</span>
                  </div>
                </div>

                <div className="match-explanation-quote">
                  <p>
                    "{bestMatch.explanation.rationale || `Proven commercial expertise aligning directly with ${currentCampaign.industry.toLowerCase()} creative direction.`}"
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="matching-action-row">
          <button
            type="button"
            className="btn-editorial-dark"
            onClick={onExploreDiscover}
            id="matching-explore-matches-btn"
          >
            <span>Explore AI creators & matches</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </section>
  );
}
