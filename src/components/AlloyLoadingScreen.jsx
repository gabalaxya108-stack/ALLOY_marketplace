// src/components/AlloyLoadingScreen.jsx
// ALLOY — Luxury Logo Intro & Loading Screen Animation
// Displays on initial site entry with authentic metallic emblem, orbital rings,
// ambient glow, smooth real-time progress, and seamless cinematic fade to main page.

import React, { useState, useEffect, useRef } from 'react';
import './AlloyLoadingScreen.css';

// Curated aesthetic collage items showcasing premier ALLOY Creators & Luxury Brands
const COLLAGE_ITEMS = [
  {
    id: 'creator-maya-cinematic',
    type: 'creator',
    name: 'Maya Chen',
    category: 'Cinematic AI Director',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=80',
    aspect: 'portrait'
  },
  {
    id: 'brand-lumina-skincare',
    type: 'brand',
    name: 'Lumina Botanica',
    category: 'Luxury Skincare',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=700&q=80',
    aspect: 'landscape'
  },
  {
    id: 'creator-elena-couture',
    type: 'creator',
    name: 'Elena Rostova',
    category: 'Haute Couture AI',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80',
    aspect: 'portrait'
  },
  {
    id: 'brand-vanguard-horology',
    type: 'brand',
    name: 'Vanguard Horology',
    category: 'Precision Watches',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80',
    aspect: 'square'
  },
  {
    id: 'creator-alex-3d',
    type: 'creator',
    name: 'Alex Rivera',
    category: '3D Spatial CGI',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80',
    aspect: 'landscape'
  },
  {
    id: 'creator-zora-beauty',
    type: 'creator',
    name: 'Zora Vance',
    category: 'Cosmetics Macro',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=700&q=80',
    aspect: 'portrait'
  },
  {
    id: 'brand-aura-privee',
    type: 'brand',
    name: 'Aura Privée',
    category: 'Neoclassical Silk',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=700&q=80',
    aspect: 'portrait'
  },
  {
    id: 'creator-sora-tokyo',
    type: 'creator',
    name: 'Sora Takahashi',
    category: 'Neo-Tokyo Nocturne',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80',
    aspect: 'square'
  },
  {
    id: 'brand-komorebi-spirits',
    type: 'brand',
    name: 'Komorebi Spirits',
    category: 'Artisanal Botanicals',
    image: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=700&q=80',
    aspect: 'landscape'
  },
  {
    id: 'creator-marcus-jewelry',
    type: 'creator',
    name: 'Marcus Vance',
    category: 'Fine Jewelry Stills',
    image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=700&q=80',
    aspect: 'portrait'
  },
  {
    id: 'brand-kyoto-pavilion',
    type: 'brand',
    name: 'Kyoto Pavilion',
    category: 'Zen Heritage',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=700&q=80',
    aspect: 'landscape'
  },
  {
    id: 'creator-aria-organza',
    type: 'creator',
    name: 'Aria Sterling',
    category: 'Weightless Organza',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=700&q=80',
    aspect: 'portrait'
  },
  {
    id: 'brand-synthetica-ceramics',
    type: 'brand',
    name: 'Synthetica',
    category: 'Tactile Ceramic Art',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=700&q=80',
    aspect: 'square'
  },
  {
    id: 'brand-velocita-drive',
    type: 'brand',
    name: 'Velocita Heritage',
    category: 'Editorial Automotive',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=700&q=80',
    aspect: 'landscape'
  },
  {
    id: 'creator-orbital-sci',
    type: 'creator',
    name: 'Orbital Solitude',
    category: 'Deep Space Key Art',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=700&q=80',
    aspect: 'portrait'
  },
  {
    id: 'brand-aether-quantum',
    type: 'brand',
    name: 'Aether Labs',
    category: 'Quantum Hardware',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=700&q=80',
    aspect: 'square'
  }
];

export default function AlloyLoadingScreen({ 
  onComplete, 
  minDuration = 2200 
}) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [statusText, setStatusText] = useState('Harmonizing Creative Intelligences...');
  const hasFinishedRef = useRef(false);

  // Trigger graceful exit sequence
  const triggerExit = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setProgress(100);
    setStatusText('Welcome to Alloy');
    setIsExiting(true);
    
    // Allow the CSS exit animation (850ms) to complete before unmounting
    setTimeout(() => {
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }, 850);
  };

  useEffect(() => {
    const startTime = performance.now();
    let animationFrameId;

    const updateProgress = (currentTime) => {
      if (hasFinishedRef.current) return;

      const elapsed = currentTime - startTime;
      const rawRatio = Math.min(elapsed / minDuration, 1);
      
      // Luxurious ease-out curve for smooth deceleration
      const easeRatio = 1 - Math.pow(1 - rawRatio, 2.5);
      const currentPct = Math.min(Math.floor(easeRatio * 100), 100);

      setProgress(currentPct);

      // Phase status labels
      if (currentPct < 35) {
        setStatusText('Harmonizing Creative Intelligences...');
      } else if (currentPct < 70) {
        setStatusText('Synthesizing Visual DNA & Style Embeddings...');
      } else if (currentPct < 98) {
        setStatusText('Aligning Creator Portfolios & Brand Campaigns...');
      } else {
        setStatusText('Welcome to Alloy');
      }

      if (rawRatio < 1) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        // Hold briefly at 100% for emotional impact, then exit
        setTimeout(() => {
          triggerExit();
        }, 180);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    // Keyboard accessibility: ESC to skip
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        triggerExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [minDuration]);

  return (
    <div 
      className={`alloy-loader-overlay ${isExiting ? 'is-exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Alloy Marketplace"
    >
      {/* Aesthetic Blurred Creators & Brands Collage Backdrop */}
      <div className="alloy-loader-collage-backdrop" aria-hidden="true">
        <div className="alloy-loader-collage-grid">
          {COLLAGE_ITEMS.map((item) => (
            <div 
              key={item.id} 
              className={`alloy-collage-tile tile-${item.aspect} tile-${item.type}`}
            >
              <img 
                src={item.image} 
                alt="" 
                className="alloy-collage-img" 
                loading="eager"
              />
              <div className="alloy-collage-badge">
                <span className={`alloy-badge-indicator is-${item.type}`} />
                <span className="alloy-badge-name">{item.name}</span>
                <span className="alloy-badge-sep">&bull;</span>
                <span className="alloy-badge-cat">{item.category}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Editorial Frosted Glass Veil & Soft Luxury Scrim */}
        <div className="alloy-loader-collage-veil" />
        <div className="alloy-loader-collage-grain" />
      </div>

      {/* Subtle luxury backdrop grid */}
      <div className="alloy-loader-ambient" aria-hidden="true">
        <div className="alloy-loader-grid" />
      </div>

      {/* Top Quick Skip Control */}
      <button 
        type="button" 
        className="alloy-loader-skip-btn"
        onClick={triggerExit}
        aria-label="Skip loading intro"
        title="Skip intro animation"
      >
        <span>Skip</span>
        <span className="alloy-loader-skip-key">ESC</span>
      </button>

      {/* Central Brand Showcase Core */}
      <div className="alloy-loader-content">
        
        {/* Emblem Stage */}
        <div className="alloy-emblem-stage">
          {/* Central Authentic Metallic Emblem */}
          <div className="alloy-emblem-wrapper">
            <img 
              src="/assets/alloy-emblem-transparent.webp" 
              alt="Alloy Emblem" 
              className="alloy-emblem-img"
              onError={(e) => {
                // Graceful fallback to png or favicon
                if (e.target.src.endsWith('.webp')) {
                  e.target.src = '/assets/alloy-emblem-transparent.png';
                } else {
                  e.target.src = '/assets/alloy-favicon.png';
                }
              }}
            />
            {/* Molten Shimmer Light Bar */}
            <div className="alloy-emblem-shimmer" />
          </div>
        </div>

        {/* Wordmark & Editorial Brand Name */}
        <div className="alloy-loader-brand">
          <img 
            src="/assets/alloy-wordmark.webp" 
            alt="Alloy" 
            className="alloy-loader-wordmark-img"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="alloy-loader-eyebrow-pill">
            <span className="alloy-loader-eyebrow-dot" />
            <span>THE AI CREATOR MARKETPLACE</span>
          </div>
        </div>

        {/* Dynamic Progress Indicator */}
        <div className="alloy-progress-container">
          <div className="alloy-progress-track">
            <div 
              className="alloy-progress-bar" 
              style={{ width: `${progress}%` }}
            >
              <span className="alloy-progress-glow-tip" />
            </div>
          </div>

          <div className="alloy-progress-meta">
            <span className="alloy-progress-status">{statusText}</span>
            <span className="alloy-progress-percent">{progress}%</span>
          </div>
        </div>

      </div>

      {/* Discreet Editorial Footer */}
      <div className="alloy-loader-footer" aria-hidden="true">
        Alloy Creative Synergy System &bull; 2026
      </div>
    </div>
  );
}
