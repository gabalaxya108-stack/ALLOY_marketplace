// src/components/AlloyLoadingScreen.jsx
// ALLOY — Luxury Logo Intro & Loading Screen Animation
// Displays on initial site entry with authentic metallic emblem, orbital rings,
// ambient glow, smooth real-time progress, and seamless cinematic fade to main page.

import React, { useState, useEffect, useRef } from 'react';
import './AlloyLoadingScreen.css';

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
        setStatusText('Aligning Creator Portfolios...');
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
