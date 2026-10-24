// src/components/ProductPreview.jsx
// SECTION G: CreaSim — From Brief to Creative Concept
// Headline: "See what the collaboration could become."
// Interactive before-and-after experience:
// 1. A brand defines its campaign.
// 2. A creator is selected.
// 3. CreaSim proposes creator-specific concepts.
// 4. The brand explores the direction.

import React, { useState } from 'react';
import { 
  Sparkles, Film, Zap, Layers, ArrowRight, CheckCircle2, 
  Eye, Compass, Sliders, ChevronRight, User, ExternalLink, ShieldAlert 
} from 'lucide-react';

export default function ProductPreview({ onSelectCreator, onExploreMarketplace }) {
  const [activeDirectionIndex, setActiveDirectionIndex] = useState(0);

  const campaignBrief = {
    title: "AETHER Nomad 28L — Modular Campus & Travel Pack",
    category: "Consumer Lifestyle & Travel",
    targetAudience: "Design-conscious creators & urban commuters",
    deliverables: "4K Hero Key Visuals • 60s Film • 2x 9:16 Social Loops",
    budget: "₹80,000 – ₹1,20,000"
  };

  const directions = [
    {
      id: "cinematic",
      tabLabel: "Cinematic Narrative",
      creator: {
        id: "maya-chen",
        name: "Maya Sharma",
        handle: "@mayasharma.ai",
        role: "Cinematic AI Director",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
        matchScore: "98%",
        matchLabel: "Storytelling & Atmosphere"
      },
      conceptTitle: "“The 5:40 AM Commute: From Lecture Hall to Foggy Coast”",
      conceptNarrative: "A cinematic film following a student filmmaker navigating rain-slicked transit, quiet library corridors, and an impromptu midnight road trip. Shot with 35mm anamorphic grain, deep shadows, and emotional naturalism.",
      aesthetic: "35mm Anamorphic, Wong Kar-wai color poetry, Dusk Rain",
      palette: ["#1F2421", "#364958", "#89909F", "#E9D8A6"],
      storyboard: [
        { scene: "01", type: "Atmospheric Hook", desc: "Low-angle dawn rain refractions across bus windows with subtle golden lens flare." },
        { scene: "02", type: "Sensory Tracking", desc: "Slow-motion macro glide over modular weatherproof zippers and ripstop fabric seams." },
        { scene: "03", type: "Hero Resolve", desc: "Arriving at foggy ocean cliffside; pack resting on stone plinth in natural golden hour light." }
      ],
      heroImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
      accentPill: "var(--accent-lavender)"
    },
    {
      id: "spatial-3d",
      tabLabel: "Precision 3D Spatial",
      creator: {
        id: "alex-rivera",
        name: "Aarav Kapoor",
        handle: "@aaravkapoor.3d",
        role: "Product Visuals Specialist",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        matchScore: "95%",
        matchLabel: "Industrial Craft & Motion"
      },
      conceptTitle: "“Micro-Machined Anatomy: Zero-Gravity Component Explode”",
      conceptNarrative: "High-contrast 3D spatial animation deconstructing the pack into its internal magnetic partitions, ergonomic strap foam, and waterproof membrane in mid-air suspension.",
      aesthetic: "Studio Rim Lighting, Mathematical Geometry, Precision CGI",
      palette: ["#0F1016", "#3A86FF", "#8338EC", "#FF006E"],
      storyboard: [
        { scene: "01", type: "Exploded Hook", desc: "Zero-gravity levitation of titanium clips and internal laptop sleeve separating in clean sync." },
        { scene: "02", type: "Hydrophobic Pass", desc: "Hyper-macro water droplets bouncing off hydrophobic textile with mathematical physics." },
        { scene: "03", type: "Reassembly Hero", desc: "Tactile snap of magnetic Fidlock buckles as the pack locks into final commercial form." }
      ],
      heroImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=85",
      accentPill: "var(--accent-peach)"
    },
    {
      id: "couture",
      tabLabel: "Haute Couture Form",
      creator: {
        id: "elena-rostova",
        name: "Ananya Roy",
        handle: "@ananya.atelier",
        role: "AI Fashion Director",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
        matchScore: "92%",
        matchLabel: "Materiality & High Fashion"
      },
      conceptTitle: "“Sculptural Monolith: Organic Drapery & Classical Shadow”",
      conceptNarrative: "Editorial luxury presentation framing the technical travel pack as a sculptural design object draped in translucent silk organza against architectural limestone pillars.",
      aesthetic: "Neoclassical Architecture, Silk Physics, Editorial Vogue Stills",
      palette: ["#141416", "#D8D4D5", "#F7F4EA", "#B5A895"],
      storyboard: [
        { scene: "01", type: "Sculptural Hook", desc: "Translucent silk organza billows across the pack surface in slow-motion zero-gravity." },
        { scene: "02", type: "Textile Contrast", desc: "Extreme macro juxtaposition of rugged ripstop nylon against gossamer evening couture fabric." },
        { scene: "03", type: "Vogue Spread", desc: "Sweeping vertical editorial frame suitable for digital lookbooks and high-fashion OOH." }
      ],
      heroImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=85",
      accentPill: "var(--accent-pink)"
    }
  ];

  const currentDir = directions[activeDirectionIndex];

  return (
    <section className="section-creasim-preview" id="interactive-preview">
      <div className="page-container">
        {/* Section Header */}
        <div className="creasim-header">
          <div className="section-pill-tag">
            <span className="pill-dot-sm" />
            <span>CreaSim™ Concept Synthesis</span>
          </div>
          <h2 className="section-headline-lg font-editorial">
            See what the collaboration could become.
          </h2>
          <p className="section-subtitle-max">
            Before extending an invitation, CreaSim synthesizes creator-specific concept storyboards 
            based on your campaign brief and the artist's verified Creator DNA.
          </p>

          {/* 4-Step Collaborative Journey Flow */}
          <div className="creasim-steps-tracker">
            <div className="sim-step completed">
              <span className="sim-step-badge">1</span>
              <span>Define Campaign Brief</span>
            </div>
            <span className="sim-step-divider" />
            <div className="sim-step completed">
              <span className="sim-step-badge">2</span>
              <span>Select Candidate Creator</span>
            </div>
            <span className="sim-step-divider" />
            <div className="sim-step active">
              <span className="sim-step-badge">3</span>
              <span>Synthesize Concepts</span>
            </div>
            <span className="sim-step-divider" />
            <div className="sim-step">
              <span className="sim-step-badge">4</span>
              <span>Explore Creative Direction</span>
            </div>
          </div>
        </div>

        {/* Direction Switcher Tabs */}
        <div className="creasim-direction-tabs">
          {directions.map((dir, idx) => (
            <button
              key={dir.id}
              type="button"
              className={`creasim-tab-btn ${idx === activeDirectionIndex ? 'active' : ''}`}
              onClick={() => setActiveDirectionIndex(idx)}
            >
              <img 
                src={dir.creator.avatar} 
                alt={dir.creator.name} 
                className="creasim-tab-avatar" 
              />
              <div className="creasim-tab-text">
                <span className="creasim-tab-name">{dir.creator.name}</span>
                <span className="creasim-tab-label">{dir.tabLabel}</span>
              </div>
              <span className="creasim-tab-score">{dir.creator.matchScore}</span>
            </button>
          ))}
        </div>

        {/* Grand Concept Showcase Card */}
        <div className="creasim-canvas-card">
          {/* Top Concept Meta Bar */}
          <div className="canvas-topbar">
            <div className="canvas-title-group">
              <span className="canvas-brief-context">Campaign: {campaignBrief.title}</span>
              <h3 className="canvas-concept-title font-editorial">{currentDir.conceptTitle}</h3>
            </div>
            <div className="canvas-creator-badge">
              <img 
                src={currentDir.creator.avatar} 
                alt={currentDir.creator.name} 
                className="canvas-avatar"
              />
              <div>
                <span className="canvas-c-name">{currentDir.creator.name}</span>
                <span className="canvas-c-role">{currentDir.creator.role}</span>
              </div>
            </div>
          </div>

          {/* Cinematic 16:9 Hero Visual */}
          <div className="canvas-visual-frame">
            <img 
              src={currentDir.heroImage} 
              alt={currentDir.conceptTitle}
              className="canvas-hero-img"
              loading="lazy"
            />
            <div className="canvas-visual-gradient" />
            
            <div className="canvas-floating-aesthetic">
              <Sparkles size={13} className="text-lavender" />
              <span>Aesthetic: {currentDir.aesthetic}</span>
            </div>
          </div>

          {/* Lower Storyboard & Production Specs */}
          <div className="canvas-lower-grid">
            {/* Left: 3-Scene Storyboard Sequence */}
            <div className="canvas-storyboard-col">
              <h4 className="canvas-subheading font-editorial">3-Scene Storyboard Sequence</h4>
              <div className="canvas-scenes-list">
                {currentDir.storyboard.map((sc, i) => (
                  <div key={i} className="canvas-scene-item">
                    <span className="scene-num">Scene {sc.scene}</span>
                    <div className="scene-text-col">
                      <span className="scene-type">{sc.type}</span>
                      <p className="scene-desc">{sc.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Narrative & Color Palette */}
            <div className="canvas-specs-col">
              <h4 className="canvas-subheading font-editorial">Creative Direction Narrative</h4>
              <p className="canvas-narrative-text">{currentDir.conceptNarrative}</p>

              <div className="canvas-palette-box">
                <span className="canvas-palette-label">Art-Directed Color Harmonies:</span>
                <div className="palette-swatches-row">
                  {currentDir.palette.map((hex, i) => (
                    <div key={i} className="palette-swatch-item">
                      <span className="swatch-circle" style={{ backgroundColor: hex }} />
                      <span className="swatch-hex">{hex}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulation Disclaimer Notice */}
              <div className="canvas-disclaimer-box">
                <ShieldAlert size={15} className="text-peach-deep" />
                <span>
                  <strong>Concept Simulation:</strong> Synthesized from verified Creator DNA and brief parameters. Demonstrates artistic creative potential, not a pre-existing client deliverable.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
