// src/components/CreaSimModal.jsx
// Part 5: CreaSim — Creator-Specific Creative Concepts
// Uses dynamic conceptEngine to generate tailored concepts with 3-scene storyboards

import React, { useState } from 'react';
import { 
  X, Sparkles, Film, Zap, Layers, Compass, ArrowRight, 
  Bookmark, Check, Send, User, ChevronRight, CheckCircle2, Sliders, RefreshCw
} from 'lucide-react';
import { generateCreatorConcept } from '../intelligence/conceptEngine';
import { calculateCreaMatch } from '../intelligence/matchingEngine';
import { generateCreaSimConcepts } from '../ai/groqClient';

export default function CreaSimModal({ 
  isOpen, 
  onClose, 
  campaign, 
  creators = [],
  onInviteCreator,
  onShortlistCreator,
  onViewProfile,
  isShortlisted = () => false
}) {
  const [activeDirectionIndex, setActiveDirectionIndex] = useState(0);
  const [savedConceptIds, setSavedConceptIds] = useState([]);
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);
  const [aiCustomConcepts, setAiCustomConcepts] = useState({});

  if (!isOpen || !campaign) return null;

  // Selected creators representing distinct creative perspectives
  const candidateCreators = creators.slice(0, 4);

  // Generate dynamic concepts tailored to campaign + each creator
  const dynamicDirections = candidateCreators.map((c, idx) => {
    const aiConcept = aiCustomConcepts[c.id];
    const defaultConcept = generateCreatorConcept(campaign, c);
    const match = calculateCreaMatch(campaign, c);

    if (aiConcept) {
      return {
        ...defaultConcept,
        ...aiConcept,
        fitScore: match.fitLabel,
        icon: c.specialty === 'AI Video' ? Film : c.specialty === '3D' ? Zap : Layers,
        turnaround: c.turnaround || '2 Weeks',
        isGroqGenerated: true
      };
    }

    return {
      ...defaultConcept,
      fitScore: match.fitLabel,
      icon: c.specialty === 'AI Video' ? Film : c.specialty === '3D' ? Zap : Layers,
      turnaround: c.turnaround || '2 Weeks',
      isGroqGenerated: false
    };
  });

  const currentConcept = dynamicDirections[activeDirectionIndex] || dynamicDirections[0];
  const matchingCreator = candidateCreators[activeDirectionIndex] || candidateCreators[0];

  const handleSynthesizeWithGroq = async () => {
    if (!matchingCreator) return;
    setIsGeneratingWithAI(true);
    try {
      const res = await generateCreaSimConcepts(campaign, matchingCreator);
      if (res && res.concepts && res.concepts.length > 0) {
        const first = res.concepts[0];
        setAiCustomConcepts(prev => ({
          ...prev,
          [matchingCreator.id]: {
            conceptTitle: first.title,
            conceptNarrative: first.creativeDirection,
            aesthetic: first.visualTreatment,
            palette: first.palette || ["#1E1E24", "#C89D7C", "#FAF8F5", "#8A5A44"],
            storyboard: (first.storyboard || []).map(sc => ({
              shotType: sc.type || 'Scene',
              description: sc.desc
            }))
          }
        }));
      }
    } catch (e) {
      console.error('[CreaSim] Groq generation error:', e);
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  const isSaved = savedConceptIds.includes(currentConcept.id);
  const isCreatorShortlisted = isShortlisted(currentConcept.creatorId);

  const handleToggleSaveConcept = () => {
    setSavedConceptIds(prev => 
      prev.includes(currentConcept.id) 
      ? prev.filter(id => id !== currentConcept.id) 
      : [...prev, currentConcept.id]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content creasim-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1050px', width: '96vw', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <button 
          type="button" 
          className="modal-close-btn" 
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="live-pulse-dot" />
            <span className="section-label" style={{ marginBottom: 0, color: 'var(--accent-lavender-deep)' }}>
              CreaSim™ Concept Simulation Studio
            </span>
          </div>

          <h2 className="font-editorial" style={{ fontSize: '2.4rem', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            Explore Creator-Specific Concepts
          </h2>

          <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0 }}>
            Compare how different creative minds interpret your brief: <strong>{campaign.title}</strong>
          </p>
        </div>

        {/* Creator Direction Switcher Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
          {dynamicDirections.map((d, index) => {
            const Icon = d.icon;
            const isActive = index === activeDirectionIndex;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveDirectionIndex(index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '100px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: isActive ? '1px solid var(--text-primary)' : '1px solid var(--border-subtle)',
                  background: isActive ? 'var(--text-primary)' : 'var(--bg-secondary)',
                  color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={14} />
                <span>{d.directionLabel}</span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  opacity: 0.85, 
                  padding: '2px 6px', 
                  borderRadius: '10px',
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)' 
                }}>
                  {d.creatorName.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Concept Detail View */}
        <div className="creasim-concept-grid" style={{ display: 'grid', gap: '28px', alignItems: 'start' }}>
          {/* Left Column: Visual Preview & Storyboard */}
          <div>
            <div style={{ 
              position: 'relative', 
              borderRadius: '16px', 
              overflow: 'hidden', 
              aspectRatio: '16/10',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
            }}>
              <img 
                src={currentConcept.sampleVisual} 
                alt={currentConcept.conceptTitle}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(20, 19, 18, 0.75)',
                backdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '100px',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Sparkles size={12} style={{ color: 'var(--accent-mint)' }} />
                <span>{currentConcept.fitScore}</span>
              </div>

              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                color: '#FFFFFF'
              }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)' }}>
                  Demonstration Simulation
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.92rem', fontWeight: 500 }}>
                  {currentConcept.visualAesthetic}
                </p>
              </div>
            </div>

            {/* Color Palette & Specs */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginTop: '16px',
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: '12px'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>
                  Aesthetic Color Palette
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {currentConcept.palette.map((hex, i) => (
                    <div 
                      key={i} 
                      title={hex} 
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: hex, 
                        border: '1px solid rgba(0,0,0,0.1)' 
                      }} 
                    />
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                  Production Turnaround
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {currentConcept.estimatedTurnaround}
                </span>
              </div>
            </div>

            {/* Creator Attribution Box */}
            <div style={{ 
              marginTop: '16px', 
              padding: '16px', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                onClick={() => onViewProfile && onViewProfile(matchingCreator.id)}
              >
                <img 
                  src={matchingCreator.avatar} 
                  alt={matchingCreator.name} 
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} 
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {matchingCreator.name}
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                    {matchingCreator.creativeIdentity}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onViewProfile && onViewProfile(matchingCreator.id)}
              >
                <span>View Dossier</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Right Column: Narrative, 3-Scene Storyboard & Actions */}
          <div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span className="section-label" style={{ color: 'var(--accent-lavender-deep)', marginBottom: '4px' }}>
                  Concept Narrative {currentConcept.isGroqGenerated ? '• Groq Llama 3.3 Synthesized' : ''}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSynthesizeWithGroq}
                  disabled={isGeneratingWithAI}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '4px 10px' }}
                >
                  <Sparkles size={12} style={{ color: 'var(--accent-lavender-deep)' }} />
                  <span>{isGeneratingWithAI ? 'Synthesizing with Groq...' : `Synthesize with Groq AI`}</span>
                </button>
              </div>
              <h3 className="font-editorial" style={{ fontSize: '1.75rem', margin: '4px 0 10px 0', lineHeight: 1.25 }}>
                {currentConcept.conceptTitle}
              </h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>
                {currentConcept.narrative || currentConcept.conceptNarrative}
              </p>
            </div>

            {/* 3-Scene Storyboard Sequence */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '8px' }}>
                3-Scene Storyboard Sequence
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentConcept.storyboard.map((scene) => (
                  <div key={scene.sceneNumber} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong>Scene {scene.sceneNumber}: {scene.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{scene.timing}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{scene.description}</p>
                    <span style={{ display: 'block', marginTop: '4px', fontSize: '0.74rem', color: 'var(--accent-lavender-deep)' }}>
                      Focus: {scene.focus}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation of Why the Concept Fits the Creator */}
            <div style={{ padding: '12px 14px', background: 'rgba(232, 227, 245, 0.4)', borderRadius: '10px', marginBottom: '18px', fontSize: '0.82rem' }}>
              <strong>Why this fits {currentConcept.creatorName.split(' ')[0]}:</strong>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {currentConcept.fitExplanation}
              </p>
            </div>

            {/* Honest Simulation Disclaimer Notice */}
            <div style={{ 
              padding: '10px 14px', 
              background: 'rgba(0, 0, 0, 0.04)', 
              borderRadius: '8px', 
              fontSize: '0.76rem', 
              color: 'var(--text-tertiary)',
              lineHeight: 1.45,
              marginBottom: '20px'
            }}>
              <strong>Honest Simulation Notice:</strong> {currentConcept.disclaimer}
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleToggleSaveConcept}
                  style={{ justifyContent: 'center' }}
                >
                  <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
                  <span>{isSaved ? "Concept Saved" : "Save Concept"}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onShortlistCreator && onShortlistCreator(currentConcept.creatorId)}
                  style={{ justifyContent: 'center' }}
                >
                  {isCreatorShortlisted ? (
                    <>
                      <CheckCircle2 size={14} style={{ color: 'var(--accent-mint)' }} />
                      <span>Shortlisted</span>
                    </>
                  ) : (
                    <span>Add to Shortlist</span>
                  )}
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => {
                  onClose();
                  if (onInviteCreator) {
                    onInviteCreator(matchingCreator, {
                      conceptTitle: currentConcept.conceptTitle,
                      conceptDeliverables: currentConcept.recommendedFormat
                    });
                  }
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Send size={15} />
                <span>Invite {currentConcept.creatorName.split(' ')[0]} with this Concept</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
