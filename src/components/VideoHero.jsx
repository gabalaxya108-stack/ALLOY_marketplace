import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Sparkles, Film } from 'lucide-react';

export default function VideoHero({ onExploreClick }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [activeSource, setActiveSource] = useState('universe'); // 'universe' or 'reference'
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  const scenes = [
    {
      id: 'fashion',
      label: '01 Fashion & Haute Couture',
      creator: 'Ananya Roy',
      role: 'AI Fashion Director',
      poster: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=85'
    },
    {
      id: 'cinematic',
      label: '02 Cinematic Brand Worlds',
      creator: 'Maya Sharma',
      role: 'Cinematic AI Director',
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1400&q=85'
    },
    {
      id: 'product',
      label: '03 Precision Hardware & 3D',
      creator: 'Aarav Kapoor',
      role: 'AI Product Advertiser',
      poster: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1400&q=85'
    },
    {
      id: 'characters',
      label: '04 Digital Humans & Editorial',
      creator: 'Karan Taneja',
      role: 'AI Character Sculptor',
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1400&q=85'
    }
  ];

  // Auto rotate scene info every 3.5 seconds to match video reel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSceneIndex((prev) => (prev + 1) % scenes.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const currentScene = scenes[currentSceneIndex];
  const videoSrc = activeSource === 'universe' 
    ? '/assets/creasynq-universe.mp4' 
    : '/assets/reference-video.mp4';

  return (
    <div className="hero-video-container">
      <div className="hero-video-wrapper">
        {!hasError ? (
          <video
            ref={videoRef}
            key={videoSrc}
            className="hero-video-element"
            src={videoSrc}
            poster={currentScene.poster}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onError={() => setHasError(true)}
          />
        ) : (
          <img 
            src={currentScene.poster} 
            alt="Alloy Creative Universe" 
            className="hero-video-element"
          />
        )}

        {/* Soft Organic Vignette & Gradient Blending Overlay */}
        <div className="hero-video-overlay-gradient" />

        {/* Floating Creative Scene Bar */}
        <div className="hero-video-footer">
          <div className="video-scene-indicator">
            <span className="live-pulse-dot" />
            <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>
              {currentScene.creator}
            </span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span style={{ opacity: 0.85 }}>
              {currentScene.role}
            </span>
          </div>

          <div className="video-controls-group">
            {/* Quick Reel Switcher */}
            <button 
              type="button" 
              className="video-control-btn"
              title={activeSource === 'universe' ? "Switch to Reference Reel" : "Switch to Universe Reel"}
              onClick={() => setActiveSource(activeSource === 'universe' ? 'reference' : 'universe')}
              style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)' }}
            >
              {activeSource === 'universe' ? 'Reel 01' : 'Reel 02'}
            </button>

            <button 
              type="button" 
              className="video-control-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause Video" : "Play Video"}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            </button>

            <button 
              type="button" 
              className="video-control-btn"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute Video" : "Mute Video"}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* Scene Navigation Pills */}
      <div className="video-scenes-nav">
        {scenes.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            className={`scene-nav-pill ${idx === currentSceneIndex ? 'active' : ''}`}
            onClick={() => setCurrentSceneIndex(idx)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
