// src/components/OrbitalCards.jsx
// ALLOY — Standalone Orbital Portfolio Cards Component
// Features:
// - 4 creative portfolio cards: Haute Couture / Fashion, Product Photography, Lifestyle / Cinema, Motion Design / 3D Spatial
// - Smooth continuous elliptical orbits with independent speeds, radii, and depth scaling
// - Thin SVG orbital track lines with floating champagne metallic beads
// - Interactive pause on hover, click actions for video modal and exploration
// - Built with smooth requestAnimationFrame / Framer Motion integration
// - Kept safely contained within viewport bounds without overlapping hero typography

import React, { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';

const PORTFOLIO_CARDS = [
  {
    id: 'fashion',
    category: 'Haute Couture',
    title: 'Cinematic Haute Couture',
    creator: 'Elena Rostova',
    videoSrc: '/assets/creasynq-universe.mp4',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=320&q=80',
    initialAngle: 0.15,
    speed: 0.12,
    radiusX: 250,
    radiusY: 110,
    tiltY: -45,
    hasPlay: true,
  },
  {
    id: 'product',
    category: 'Product Visuals',
    title: 'Aura Botanica Pure Hydration',
    creator: 'Zora Vance',
    videoSrc: '/assets/reference-video.mp4',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=320&q=80',
    initialAngle: Math.PI * 0.72,
    speed: 0.14,
    radiusX: 235,
    radiusY: 120,
    tiltY: -25,
    hasPlay: true,
  },
  {
    id: 'lifestyle',
    category: 'Brand Cinema',
    title: 'Alpine Horizon Anamorphic',
    creator: 'Maya Chen',
    videoSrc: '/assets/creasynq-universe.mp4',
    image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=320&q=80',
    initialAngle: Math.PI * 1.35,
    speed: 0.11,
    radiusX: 245,
    radiusY: 125,
    tiltY: 45,
    hasPlay: true,
  },
  {
    id: 'motion',
    category: 'Spatial Renders',
    title: 'Minimalist Tactile Objects',
    creator: 'Kaelen Mori',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=320&q=80',
    initialAngle: Math.PI * 1.88,
    speed: 0.13,
    radiusX: 215,
    radiusY: 115,
    tiltY: 65,
    hasPlay: false,
  }
];

export default function OrbitalCards({ onOpenVideo, onExploreWork }) {
  const [orbitTime, setOrbitTime] = useState(0);
  const isPausedRef = useRef(false);
  const [viewportWidth, setViewportWidth] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth : 1024;
  });

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (!isPausedRef.current) {
        setOrbitTime((prev) => prev + dt);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Responsive orbital scaling for phone screens (under 480px, 768px, desktop)
  const scaleFactor = viewportWidth < 440 ? 0.44 : (viewportWidth < 768 ? 0.62 : 1);
  const cardBaseScale = viewportWidth < 440 ? 0.74 : (viewportWidth < 768 ? 0.86 : 1);

  return (
    <div className="orbital-cards-container" aria-hidden="false">
      
      {/* 1. Luminous Thin Elliptical Orbital Filament Lines */}
      <svg 
        className="orbital-lines-svg" 
        viewBox="0 0 640 560" 
        fill="none" 
        aria-hidden="true"
        style={{
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'center center'
        }}
      >
        <ellipse
          cx="320"
          cy="265"
          rx="265"
          ry="135"
          stroke="rgba(216, 186, 150, 0.35)"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          transform="rotate(-6 320 265)"
        />
        <ellipse
          cx="320"
          cy="275"
          rx="230"
          ry="115"
          stroke="rgba(195, 160, 122, 0.28)"
          strokeWidth="1"
          transform="rotate(10 320 275)"
        />
      </svg>

      {/* 2. Traveling Champagne-Colored Metallic Spheres on Orbits */}
      {[0, 1, 2].map((idx) => {
        const angle = orbitTime * 0.22 + (idx * Math.PI * 2) / 3;
        const x = Math.cos(angle) * ((240 + idx * 10) * scaleFactor);
        const y = Math.sin(angle) * ((120 - idx * 5) * scaleFactor) + ((idx === 1 ? -15 : 10) * scaleFactor);
        return (
          <div
            key={`bead-${idx}`}
            className="orbital-metallic-sphere"
            style={{
              transform: `translate3d(-50%, -50%, 0) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`,
              zIndex: Math.sin(angle) > 0 ? 18 : 2
            }}
          />
        );
      })}

      {/* 3. The 4 Portfolio Cards */}
      {PORTFOLIO_CARDS.map((card) => {
        const angle = card.initialAngle + orbitTime * card.speed;
        const x = Math.cos(angle) * (card.radiusX * scaleFactor);
        const y = Math.sin(angle) * (card.radiusY * scaleFactor) + (card.tiltY * scaleFactor);
        const depth = Math.sin(angle); // -1 (back) to +1 (front)
        const scale = (0.94 + ((depth + 1) / 2) * 0.14) * cardBaseScale; // Dynamic scaled
        const zIndex = depth > 0 ? 25 : 4;
        const opacity = depth > 0 ? 1 : 0.88;

        const handleCardClick = () => {
          if (card.hasPlay && onOpenVideo) {
            onOpenVideo(card.title, card.creator, card.videoSrc);
          } else if (onExploreWork) {
            onExploreWork();
          }
        };

        return (
          <div
            key={card.id}
            className="orbital-portfolio-card"
            style={{
              transform: `translate3d(-50%, -50%, 0) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(2)})`,
              zIndex,
              opacity,
            }}
            onMouseEnter={() => { isPausedRef.current = true; }}
            onMouseLeave={() => { isPausedRef.current = false; }}
            onTouchStart={() => { isPausedRef.current = true; }}
            onTouchEnd={() => { setTimeout(() => { isPausedRef.current = false; }, 1200); }}
            onClick={handleCardClick}
            title={`${card.title} by ${card.creator}`}
          >
            <div className="card-thumb-wrapper">
              <img src={card.image} alt={card.title} className="card-thumb-image" loading="lazy" />
              {card.hasPlay && (
                <div className="card-play-badge">
                  <Play size={11} fill="currentColor" />
                </div>
              )}
            </div>
            <div className="card-info-badge">
              <span className="card-cat-label">{card.category}</span>
            </div>
          </div>
        );
      })}

    </div>
  );
}
