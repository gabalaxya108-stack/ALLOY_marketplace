// src/components/WorkspaceEntryCards.jsx
// SECTION I: Two Workspaces, One Ecosystem
// For Brands: "Find your next creative partner." -> "Explore Brand Studio"
// For Creators: "Let your work open new doors." -> "Explore Creator Studio"
// Distinct, complementary visual treatments for both environments.

import React from 'react';
import { 
  Palette, Briefcase, ArrowRight, CheckCircle2, 
  Dna, Sparkles, MessageSquare, Layers, FileText, 
  Send, Bookmark, ShieldCheck 
} from 'lucide-react';

export default function WorkspaceEntryCards({ onEnterCreatorStudio, onEnterBrandStudio }) {
  return (
    <section className="section-workspace-entries" id="workspaces">
      <div className="page-container">
        {/* Section Header */}
        <div className="workspaces-section-header">
          <div className="section-pill-tag">
            <span className="pill-dot-sm" />
            <span>Dual Creative Workspaces</span>
          </div>
          <h2 className="section-headline-lg font-editorial">
            Two workspaces. One shared ecosystem.
          </h2>
          <p className="section-subtitle-max">
            Built for how creative work actually happens. Brands discover, brief, and collaborate. 
            Creators showcase, curate, and produce.
          </p>
        </div>

        {/* Distinct Complementary Layout */}
        <div className="workspaces-dual-container">
          {/* SECTION 1: FOR BRANDS */}
          <div className="workspace-block brand-ecosystem-block" id="brand-studio">
            <div className="workspace-split-content">
              <div className="workspace-copy-col">
                <div className="workspace-role-pill brand-pill">
                  <Briefcase size={13} />
                  <span>For Brands & Agencies</span>
                </div>
                <h3 className="workspace-main-headline font-editorial">
                  Find your next creative partner.
                </h3>
                <p className="workspace-main-desc">
                  Define your campaign vision in natural language, evaluate creators with 
                  explainable CreaMatch intelligence, compare shortlists side by side, and 
                  manage collaborative milestones from invitation to final master approval.
                </p>

                <div className="workspace-feature-checks">
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-peach-deep" />
                    <span>AI-assisted campaign briefs without hallucinated budgets</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-peach-deep" />
                    <span>Deterministic 6-dimension CreaMatch compatibility scoring</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-peach-deep" />
                    <span>Side-by-side shortlist comparisons and concept synthesis</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-peach-deep" />
                    <span>Direct invitations and frame-level deliverable review rounds</span>
                  </div>
                </div>

                <div className="workspace-action-row">
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    onClick={onEnterBrandStudio}
                    id="enter-brand-studio-btn"
                  >
                    <span>Explore Brand Studio</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Brand Visual Treatment: Campaign Studio Interface Preview */}
              <div className="workspace-graphic-col brand-graphic">
                <div className="brand-workspace-preview-mock">
                  <div className="mock-top-nav">
                    <span className="mock-dot red" />
                    <span className="mock-dot yellow" />
                    <span className="mock-dot green" />
                    <span className="mock-title">Brand Studio — Active Campaign</span>
                  </div>
                  <div className="mock-body">
                    <div className="mock-brief-header">
                      <span className="mock-campaign-tag">Veda Botanics</span>
                      <h4 className="mock-brief-title font-editorial">Pure Hydration Launch</h4>
                      <span className="mock-budget-pill">₹50,000 – ₹1,00,000</span>
                    </div>

                    <div className="mock-match-card">
                      <img 
                        src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=300&q=80" 
                        alt="Zoya Merchant"
                        className="mock-creator-thumb"
                      />
                      <div className="mock-match-info">
                        <span className="mock-match-name">Zoya Merchant</span>
                        <span className="mock-match-spec">Macro Beauty & Cosmetics</span>
                        <div className="mock-score-pill">
                          <Sparkles size={11} />
                          <span>97% CreaMatch Fit</span>
                        </div>
                      </div>
                    </div>

                    <div className="mock-deliverables-strip">
                      <span className="strip-item">3x 4K Stills</span>
                      <span className="strip-item">2x 9:16 Loops</span>
                      <span className="strip-item active-strip">Milestone 1 Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: FOR CREATORS */}
          <div className="workspace-block creator-ecosystem-block" id="creator-studio">
            <div className="workspace-split-content creator-reverse">
              {/* Creator Visual Treatment: Atelier Portfolio & DNA Preview */}
              <div className="workspace-graphic-col creator-graphic">
                <div className="creator-workspace-preview-mock">
                  <div className="mock-top-nav">
                    <span className="mock-dot red" />
                    <span className="mock-dot yellow" />
                    <span className="mock-dot green" />
                    <span className="mock-title">Creator Studio — Creative Atelier</span>
                  </div>
                  <div className="mock-creator-body">
                    <div className="mock-atelier-header">
                      <img 
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80" 
                        alt="Maya Sharma"
                        className="mock-atelier-avatar"
                      />
                      <div>
                        <h4 className="mock-atelier-name font-editorial">Maya Sharma</h4>
                        <span className="mock-atelier-role">Cinematic AI Director</span>
                      </div>
                      <span className="mock-dna-pill">
                        <Dna size={12} />
                        <span>DNA Verified</span>
                      </span>
                    </div>

                    <div className="mock-portfolio-quad">
                      <img 
                        src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80" 
                        alt="Work 1" 
                        className="quad-thumb"
                      />
                      <img 
                        src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80" 
                        alt="Work 2" 
                        className="quad-thumb"
                      />
                    </div>

                    <div className="mock-opportunity-pill">
                      <span className="opp-dot" />
                      <span>New Invitation: Aether Nomad Campaign (₹80K – ₹1.2L)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="workspace-copy-col">
                <div className="workspace-role-pill creator-pill">
                  <Palette size={13} />
                  <span>For AI Content Creators</span>
                </div>
                <h3 className="workspace-main-headline font-editorial">
                  Let your work open new doors.
                </h3>
                <p className="workspace-main-desc">
                  Showcase high-resolution portfolio master files, build an authentic Creator DNA 
                  grounded in verified production work, discover tailored brand opportunities, 
                  and collaborate with global creative directors on clear commercial terms.
                </p>

                <div className="workspace-feature-checks">
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-lavender-deep" />
                    <span>Curate 4K stills, kinetic loops, and video reels with zero distortion</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-lavender-deep" />
                    <span>Automated Creator DNA reflecting real tools, formats, and style</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-lavender-deep" />
                    <span>Receive structured campaign invitations with defined milestones</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 size={16} className="text-lavender-deep" />
                    <span>Manage messaging, asset delivery, and client approvals effortlessly</span>
                  </div>
                </div>

                <div className="workspace-action-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-lg"
                    onClick={onEnterCreatorStudio}
                    id="enter-creator-studio-btn"
                  >
                    <span>Explore Creator Studio</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
