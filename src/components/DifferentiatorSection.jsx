import React, { useState } from 'react';
import { 
  Dna, Sparkles, Sliders, MessageSquare, CheckCircle2, 
  ArrowRight, ShieldCheck, Layers, Eye, Users, ChevronRight 
} from 'lucide-react';

export default function DifferentiatorSection({ onExploreDiscover, onEnterBrandStudio }) {
  const [activeTab, setActiveTab] = useState('creator-dna');

  const differentiators = [
    {
      id: 'creator-dna',
      tag: 'CREATOR DNA',
      icon: Dna,
      title: 'Understand demonstrated creative style and capabilities.',
      desc: "Creator DNA analyzes verified portfolio pieces to uncover a creator's nuanced aesthetic signature—from optical lighting physics and tactile fabric simulations to narrative tone and color harmony.",
      accentClass: 'tag-lavender',
      badgeText: 'Core Platform Feature',
      mockupType: 'dna'
    },
    {
      id: 'creamatch',
      tag: 'CREAMATCH',
      icon: Sparkles,
      title: 'Discover creators based on campaign requirements and portfolio evidence.',
      desc: "Instead of subjective keyword searches, CreaMatch cross-examines your campaign brief against tangible portfolio evidence, generating contextual match scores and transparent explanations for why each creator fits.",
      accentClass: 'tag-peach',
      badgeText: 'Algorithmic Matching Engine',
      mockupType: 'match'
    },
    {
      id: 'creasim',
      tag: 'CREASIM',
      icon: Eye,
      title: 'Explore creator-specific campaign concepts before deciding whom to invite.',
      desc: "Preview how different creators would interpret your creative brief before committing your budget. Compare artistic angles, color palettes, and deliverable treatments side by side.",
      accentClass: 'tag-pink',
      badgeText: 'Interactive Concept Preview',
      mockupType: 'sim'
    },
    {
      id: 'collaboration',
      tag: 'CREATIVE COLLABORATION',
      icon: MessageSquare,
      title: 'Move seamlessly from invitation to submission, feedback, and approval.',
      desc: "A purpose-built workspace for creative directors and AI artists. Share high-resolution assets, review iterations, exchange contextual feedback, and sign off on final deliverables with zero friction.",
      accentClass: 'tag-mint',
      badgeText: 'Collaboration Workspace',
      mockupType: 'collab'
    }
  ];

  const currentDiff = differentiators.find(d => d.id === activeTab) || differentiators[0];

  return (
    <section className="section-differentiators" id="creative-connection">
      <div className="page-container">
        {/* Section Header */}
        <div className="section-header-centered">
          <div className="section-tag-pill">
            <span>The CreaSync Advantage</span>
          </div>
          <h2 className="section-headline-lg">
            More than a match.<br />
            A creative connection.
          </h2>
          <p className="section-subtitle-max">
            Traditional marketplaces match keywords. CreaSync connects creative visions through 
            deep aesthetic intelligence and streamlined creative collaboration.
          </p>
        </div>

        {/* Feature Selector Tabs */}
        <div className="diff-tabs-container">
          <div className="diff-tabs-list" role="tablist">
            {differentiators.map((diff) => {
              const Icon = diff.icon;
              const isActive = diff.id === activeTab;
              return (
                <button
                  key={diff.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`diff-tab-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(diff.id)}
                >
                  <Icon size={16} />
                  <span>{diff.tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Interactive Feature Showcase */}
        <div className="diff-showcase-panel">
          <div className="diff-grid">
            {/* Left Column: Feature Details */}
            <div className="diff-info-col">
              <div className="diff-badge-row">
                <span className={`diff-pill ${currentDiff.accentClass}`}>
                  {currentDiff.tag}
                </span>
                <span className="diff-engine-tag">
                  {currentDiff.badgeText}
                </span>
              </div>

              <h3 className="diff-title">
                {currentDiff.title}
              </h3>

              <p className="diff-description">
                {currentDiff.desc}
              </p>

              <div className="diff-highlights-list">
                {currentDiff.id === 'creator-dna' && (
                  <>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-lavender" />
                      <span>Extracts visual attributes: lighting, color poetry, and realism</span>
                    </div>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-lavender" />
                      <span>Builds verifiable creative signatures from published works</span>
                    </div>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-lavender" />
                      <span>Helps creators articulate what makes their vision distinct</span>
                    </div>
                  </>
                )}

                {currentDiff.id === 'creamatch' && (
                  <>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-peach" />
                      <span>Calculates multi-dimensional brief alignment percentages</span>
                    </div>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-peach" />
                      <span>Transparent explanations: “Why this creator matches this brief”</span>
                    </div>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-peach" />
                      <span>Eliminates weeks of manual creative scouting and screening</span>
                    </div>
                  </>
                )}

                {currentDiff.id === 'creasim' && (
                  <>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-pink" />
                      <span>Simulated concept moodboards tailored to each creator</span>
                    </div>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-pink" />
                      <span>Compare cinematic vs. kinetic vs. minimal product directions</span>
                    </div>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-pink" />
                      <span>Align internal stakeholders on creative treatment early</span>
                    </div>
                  </>
                )}

                {currentDiff.id === 'collaboration' && (
                  <>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-mint" />
                      <span>Direct invitation workflow with defined budgets and milestones</span>
                    </div>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-mint" />
                      <span>Integrated messaging, revision feedback, and iteration tracking</span>
                    </div>
                    <div className="diff-highlight-item">
                      <CheckCircle2 size={16} className="text-mint" />
                      <span>Final deliverable signoff and asset repository</span>
                    </div>
                  </>
                )}
              </div>

              <div className="diff-action-btn-row">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-md"
                  onClick={onExploreDiscover}
                >
                  <span>Explore Marketplace</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* Right Column: Visual Demonstration Card */}
            <div className="diff-visual-col">
              <div className="diff-card-mockup">
                {currentDiff.id === 'creator-dna' && (
                  <div className="mockup-dna-container">
                    <div className="mockup-header-row">
                      <div className="mockup-title">Creator DNA Profile • Ananya Roy</div>
                      <span className="dna-score-pill">Verified DNA</span>
                    </div>
                    <div className="dna-bars-group">
                      <div className="dna-bar-item">
                        <div className="dna-bar-labels">
                          <span>Haute Couture & Fabric Simulation</span>
                          <span className="dna-val">98%</span>
                        </div>
                        <div className="dna-progress-track">
                          <div className="dna-progress-fill" style={{ width: '98%', background: 'var(--accent-lavender-deep)' }} />
                        </div>
                      </div>
                      <div className="dna-bar-item">
                        <div className="dna-bar-labels">
                          <span>Macro Fluid & Surface Physics</span>
                          <span className="dna-val">94%</span>
                        </div>
                        <div className="dna-progress-track">
                          <div className="dna-progress-fill" style={{ width: '94%', background: 'var(--accent-peach-deep)' }} />
                        </div>
                      </div>
                      <div className="dna-bar-item">
                        <div className="dna-bar-labels">
                          <span>Architectural Studio Lighting</span>
                          <span className="dna-val">91%</span>
                        </div>
                        <div className="dna-progress-track">
                          <div className="dna-progress-fill" style={{ width: '91%', background: 'var(--accent-mint)' }} />
                        </div>
                      </div>
                      <div className="dna-bar-item">
                        <div className="dna-bar-labels">
                          <span>Cinematic Anamorphic Narrative</span>
                          <span className="dna-val">76%</span>
                        </div>
                        <div className="dna-progress-track">
                          <div className="dna-progress-fill" style={{ width: '76%', background: '#64748B' }} />
                        </div>
                      </div>
                    </div>
                    <div className="dna-tags-cloud">
                      <span className="dna-tag-pill">Tactile Organza</span>
                      <span className="dna-tag-pill">Sub-Surface Scattering</span>
                      <span className="dna-tag-pill">Paris Fashion Week Vibe</span>
                      <span className="dna-tag-pill">Monolithic Calm</span>
                    </div>
                  </div>
                )}

                {currentDiff.id === 'creamatch' && (
                  <div className="mockup-match-container">
                    <div className="mockup-header-row">
                      <div className="mockup-title">CreaMatch Breakdown • Lumina Skincare</div>
                      <span className="match-tag-pill">Overall: 96%</span>
                    </div>
                    <div className="match-reasons-list">
                      <div className="match-reason-box">
                        <span className="reason-bullet" />
                        <div>
                          <strong>Portfolio Evidence:</strong> 4 projects demonstrate macro droplet physics identical to brief requirements.
                        </div>
                      </div>
                      <div className="match-reason-box">
                        <span className="reason-bullet" />
                        <div>
                          <strong>Aesthetic Tone Alignment:</strong> Luminous sunlit warm editorial palette matches brand style guide.
                        </div>
                      </div>
                      <div className="match-reason-box">
                        <span className="reason-bullet" />
                        <div>
                          <strong>Deliverable Readiness:</strong> High-resolution 4K stills and vertical loops supported.
                        </div>
                      </div>
                    </div>
                    <div className="match-confidence-badge">
                      <ShieldCheck size={14} className="text-mint" />
                      <span>High Confidence Match based on 12 verified works</span>
                    </div>
                  </div>
                )}

                {currentDiff.id === 'creasim' && (
                  <div className="mockup-sim-container">
                    <div className="mockup-header-row">
                      <div className="mockup-title">CreaSim Concept Preview Treatment</div>
                      <span className="sim-tag-pill">Direction Preview</span>
                    </div>
                    <div className="sim-concept-box">
                      <div className="sim-concept-img-frame">
                        <img 
                          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80" 
                          alt="Concept Still"
                          className="sim-preview-thumb"
                        />
                      </div>
                      <div className="sim-concept-meta">
                        <h4>“Solar Radiance & Botanical Barrier”</h4>
                        <p>Simulating golden hour skin luminescence and organic fluid droplets.</p>
                        <div className="sim-specs-row">
                          <span>Mood: Editorial High-Glow</span>
                          <span>Format: 9:16 + 1:1</span>
                        </div>
                      </div>
                    </div>
                    <div className="sim-notice">
                      <Eye size={12} />
                      <span>Pre-visualization for stakeholder review</span>
                    </div>
                  </div>
                )}

                {currentDiff.id === 'collaboration' && (
                  <div className="mockup-collab-container">
                    <div className="mockup-header-row">
                      <div className="mockup-title">Collaboration Room • Lumina x Elena</div>
                      <span className="collab-status-pill">In Progress (v2)</span>
                    </div>
                    <div className="collab-chat-preview">
                      <div className="chat-bubble chat-brand">
                        <span className="chat-sender">Veda Creative Director</span>
                        <p>“The droplet refraction in render #3 is stunning. Can we warm the ambient background light slightly?”</p>
                      </div>
                      <div className="chat-bubble chat-creator">
                        <span className="chat-sender">Ananya Roy</span>
                        <p>“Updated! Added warm 3200K rim lighting. Uploading high-res revision v2.1 now.”</p>
                      </div>
                    </div>
                    <div className="collab-approval-bar">
                      <CheckCircle2 size={14} className="text-mint" />
                      <span>Milestone 1 Approved • Deliverable 2 of 3</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
