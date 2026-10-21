// src/components/ProjectModal.jsx
// Complete Single-Page Work Showcase & Case Study Experience
// Displays all information from high-res media display to comprehensive production specs.
// Strictly excludes any 'Invite this Creator' button.

import React, { useState, useMemo } from 'react';
import { X, ArrowRight, Sparkles, Layers, Maximize2, Minimize2, Play, Volume2, VolumeX, Eye, CheckCircle2, Sliders, Palette, Cpu, Film, GitCommit, ChevronLeft, ChevronRight, ShieldCheck, Briefcase, Plus, FolderPlus, ArrowUpRight, Edit3, Loader2 } from 'lucide-react';
import WorkflowTimeline from './WorkflowTimeline';
import ProjectWorkflowTimeline from './ProjectWorkflowTimeline';
import ProjectWorkflowEditor from './ProjectWorkflowEditor';
import { DEMO_WORKFLOWS } from '../data/workflowsData';
import { createDefaultWorkflowStages } from '../data/creatorSkillsData';

export default function ProjectModal({ 
  project, 
  creator, 
  onClose, 
  onViewCreatorProfile,
  onCreateWorkspace,
  onOpenCreatorStudio,
  onSaveWorkflow,
  isCreatorOwner = true
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Workflow builder modal states
  const [isWorkflowEditorOpen, setIsWorkflowEditorOpen] = useState(false);
  const [localWorkflowData, setLocalWorkflowData] = useState(() => {
    return {
      title: project?.workflowTitle || project?.productionWorkflow?.title || '',
      overview: project?.workflowOverview || project?.productionWorkflow?.overview || '',
      steps: (project?.workflowStages && project.workflowStages.length > 0)
        ? project.workflowStages
        : []
    };
  });
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
  const [saveWorkflowFeedback, setSaveWorkflowFeedback] = useState(null); // { type: 'success' | 'error', message: string }

  const resolvedCreator = creator || {
    name: 'AI Creator',
    creativeIdentity: 'Visual Worldbuilder & Director',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    tools: ['Midjourney v6', 'Runway Gen-3'],
    capabilities: ['Generative Stills', 'Visual Direction']
  };

  // Compile full media list supporting multiple attached images & videos
  const mediaList = useMemo(() => {
    if (!project) return [];
    if (project.media && project.media.length > 0) {
      return project.media;
    }
    const list = [];
    if (project.image) {
      list.push({
        id: 'med-cover',
        url: project.image,
        type: 'image',
        mediaType: 'image',
        name: project.title,
        isCover: true
      });
    }
    if (project.video || project.videoPreview || (project.category === 'AI Video' && resolvedCreator.videoPreview)) {
      list.push({
        id: 'med-video',
        url: project.video || project.videoPreview || resolvedCreator.videoPreview,
        type: 'video',
        mediaType: 'video',
        name: `${project.title} (Motion Pass)`,
        isCover: false
      });
    }
    return list;
  }, [project, resolvedCreator]);

  if (!project) return null;
  const activeMedia = mediaList[activeMediaIndex] || mediaList[0] || null;
  const isCurrentVideo = activeMedia ? (
    activeMedia.type === 'video' || 
    activeMedia.mediaType === 'video' || 
    activeMedia.mimeType?.startsWith('video/')
  ) : false;
  const currentMediaUrl = activeMedia ? activeMedia.url : project.image;

  const hasVideo = !!(project.video || project.videoPreview || (project.category === 'AI Video' && resolvedCreator.videoPreview) || isCurrentVideo);
  const videoSrc = isCurrentVideo ? currentMediaUrl : (project.video || project.videoPreview || resolvedCreator.videoPreview);

  const roleText = project.role || resolvedCreator.creativeIdentity || "Lead Visual Artist";
  const clientText = project.clientType || "Commercial & Editorial";
  const styleText = project.creativeStyle || project.style || (resolvedCreator.styles ? resolvedCreator.styles[0] : "Cinematic & Editorial");
  const toolsText = project.tools || (Array.isArray(resolvedCreator.tools) ? resolvedCreator.tools.join(', ') : "Midjourney v6, Runway Gen-3");
  const formatText = project.format || (project.category === 'AI Video' ? '4K Video Master Loop' : 'High-Resolution 4K Key Art Stills');
  const platformText = project.platform || "Campaign OOH, Social & Digital";
  const tagsList = project.capabilities || resolvedCreator.capabilities || ['Generative Cinema', 'Visual Direction'];

  // Resolve associated creative workflow if linked
  const allWorkflows = (resolvedCreator.workflows && resolvedCreator.workflows.length > 0)
    ? resolvedCreator.workflows
    : DEMO_WORKFLOWS.filter(w => w.creatorId === resolvedCreator.id);
  const associatedWorkflow = allWorkflows.find(w => 
    (w.linkedProjectId && w.linkedProjectId === project.id) ||
    (project.workflowId && w.id === project.workflowId)
  );

  return (
    <div className={`modal-overlay ${isExpanded ? 'modal-expanded-overlay' : ''}`} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="project-modal-headline">
      <div 
        className={`modal-content project-case-study-modal ${isExpanded ? 'expanded-case-study' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: isExpanded ? '96vw' : '880px', maxHeight: '92vh', overflowY: 'auto', padding: '0', borderRadius: '22px', border: '1px solid rgba(226, 232, 240, 0.85)', background: 'var(--bg-card, #FFFFFF)' }}
      >
        {/* Top Floating Controls */}
        <div className="project-modal-top-bar-controls" style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20, display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="modal-icon-control-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse View" : "Expand Media"}
            aria-label={isExpanded ? "Collapse" : "Expand"}
            style={{ background: 'rgba(20, 19, 18, 0.75)', backdropFilter: 'blur(8px)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close modal"
            style={{ background: 'rgba(20, 19, 18, 0.75)', backdropFilter: 'blur(8px)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.25)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Large Cinematic Media Dominating the Top View */}
        <div className={`project-modal-hero-media ${isExpanded ? 'media-full-expand' : ''}`} style={{ margin: 0, borderRadius: '21px 21px 0 0', position: 'relative', width: '100%', maxHeight: isExpanded ? '65vh' : '460px', background: '#121110', overflow: 'hidden' }}>
          {isCurrentVideo || (hasVideo && isPlayingVideo) ? (
            <div className="project-video-player-wrap" style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000000' }}>
              <video 
                key={videoSrc}
                src={videoSrc}
                autoPlay
                controls
                playsInline
                loop
                muted={isMuted}
                className="project-modal-video"
                style={{ width: '100%', maxHeight: isExpanded ? '65vh' : '460px', objectFit: 'contain', display: 'block' }}
              />
            </div>
          ) : (
            <div className="project-image-hero-wrap" style={{ width: '100%', height: '100%', position: 'relative' }}>
              <img 
                src={currentMediaUrl} 
                alt={project.title} 
                className="project-modal-img"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85";
                }}
              />
              {hasVideo && (
                <button 
                  type="button" 
                  className="project-play-video-cta"
                  onClick={() => setIsPlayingVideo(true)}
                  style={{ position: 'absolute', bottom: '20px', left: '20px', background: 'rgba(20, 19, 18, 0.85)', backdropFilter: 'blur(10px)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '10px 20px', borderRadius: '100px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
                >
                  <Play size={16} fill="#FFFFFF" />
                  <span>Play Cinematic Motion Preview</span>
                </button>
              )}
            </div>
          )}

          {/* Badges on Media */}
          <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px', zIndex: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.76rem', padding: '5px 12px', borderRadius: '100px', background: 'rgba(20, 19, 18, 0.8)', backdropFilter: 'blur(8px)', color: '#FFFFFF', fontWeight: 600, border: '1px solid rgba(255, 255, 255, 0.2)' }}>
              {project.category || 'Visual Art'}
            </span>
            {project.featured && (
              <span style={{ fontSize: '0.76rem', padding: '5px 12px', borderRadius: '100px', background: 'rgba(245, 158, 11, 0.95)', color: '#FFFFFF', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                ★ Featured Work
              </span>
            )}
            {project.visibility && (
              <span style={{ fontSize: '0.76rem', padding: '5px 12px', borderRadius: '100px', background: project.visibility === 'private' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)', color: '#FFFFFF', fontWeight: 600 }}>
                {project.visibility === 'private' ? 'Private Draft' : 'Published'}
              </span>
            )}
            {hasVideo && (
              <span style={{ fontSize: '0.76rem', padding: '5px 12px', borderRadius: '100px', background: 'rgba(20, 19, 18, 0.8)', backdropFilter: 'blur(8px)', color: '#FFFFFF', fontWeight: 600, border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                • 4K Video Loop
              </span>
            )}
          </div>
        </div>

        {/* Multi-Format Gallery Selector Strip */}
        {mediaList.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 24px',
            background: 'var(--bg-secondary, #F8FAFC)',
            borderBottom: '1px solid var(--border-subtle, #E2E8F0)',
            overflowX: 'auto'
          }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 700, flexShrink: 0 }}>
              Project Media ({mediaList.length}):
            </span>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '2px 0' }}>
              {mediaList.map((asset, idx) => {
                const isVid = asset.type === 'video' || asset.mediaType === 'video' || asset.mimeType?.startsWith('video/');
                const isActive = activeMediaIndex === idx;
                return (
                  <button
                    key={asset.id || idx}
                    type="button"
                    onClick={() => {
                      setActiveMediaIndex(idx);
                      setIsPlayingVideo(isVid);
                    }}
                    style={{
                      width: '64px',
                      height: '46px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: isActive ? '2px solid var(--accent-primary, #EB6E4B)' : '1px solid var(--border-medium, #CBD5E1)',
                      position: 'relative',
                      cursor: 'pointer',
                      padding: 0,
                      background: '#0F172A',
                      flexShrink: 0,
                      boxShadow: isActive ? '0 0 0 2px rgba(235, 110, 75, 0.2)' : 'none',
                      transition: 'transform 0.15s ease'
                    }}
                    title={asset.name || `Asset ${idx + 1}`}
                  >
                    {isVid ? (
                      <video src={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={asset.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {isVid && (
                      <span style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#FFFFFF'
                      }}>
                        <Play size={12} fill="#FFFFFF" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Comprehensive Details Body */}
        <div className="project-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header Row: Title, Creator Attribution, and Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div className="project-modal-header-col" style={{ flex: 1, minWidth: '220px' }}>
              <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent-primary, #EB6E4B)', fontWeight: 700 }}>
                Case Study & Portfolio Showcase
              </span>
              <h2 id="project-modal-headline" className="font-editorial" style={{ fontSize: '1.9rem', fontWeight: 700, lineHeight: 1.25, margin: '6px 0 10px', color: 'var(--text-primary)' }}>
                {project.title}
              </h2>

              {/* Creator Attribution Pill */}
              <div 
                className="project-modal-creator-pill"
                onClick={() => {
                  if (onViewCreatorProfile && resolvedCreator.id) {
                    onClose();
                    onViewCreatorProfile(resolvedCreator.id);
                  }
                }}
                style={{ cursor: onViewCreatorProfile && resolvedCreator.id ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '4px 14px 4px 4px', borderRadius: '100px', background: 'var(--bg-secondary, #F4EFEA)', border: '1px solid var(--border-light, #E2E8F0)' }}
              >
                <img 
                  src={resolvedCreator.avatar} 
                  alt={resolvedCreator.name} 
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{resolvedCreator.name}</span>
                  {resolvedCreator.creativeIdentity && (
                    <span style={{ color: 'var(--text-secondary)' }}> • {resolvedCreator.creativeIdentity}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {onCreateWorkspace && (
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onClose();
                    onCreateWorkspace({
                      project,
                      creator: resolvedCreator,
                      suggestedName: `${project.title} Production Workspace`,
                      suggestedAesthetic: project.creativeStyle || project.style || 'Cinematic & Editorial'
                    });
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
                    borderColor: 'transparent',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)'
                  }}
                  title="Create a dedicated collaboration workspace for this project"
                >
                  <FolderPlus size={15} />
                  <span>Create Workspace</span>
                </button>
              )}

              {onViewCreatorProfile && resolvedCreator.id && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onClose();
                    onViewCreatorProfile(resolvedCreator.id);
                  }}
                  title="View creator public portfolio"
                >
                  <span>View Full Profile</span>
                  <ArrowRight size={14} />
                </button>
              )}

              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>

          {/* Quick Workspace Callout Option Strip */}
          {onCreateWorkspace && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(99, 102, 241, 0.08) 100%)',
              border: '1px solid rgba(124, 58, 237, 0.2)',
              borderRadius: '14px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(124, 58, 237, 0.12)',
                  color: '#7C3AED',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Briefcase size={16} />
                </span>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Inspired by this work? Spin up a dedicated project workspace.
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Collaborate directly with <strong>{resolvedCreator.name}</strong>, coordinate deliverables, and track AI workflow milestones.
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  onCreateWorkspace({
                    project,
                    creator: resolvedCreator,
                    suggestedName: `${project.title} Production Workspace`,
                    suggestedAesthetic: project.creativeStyle || project.style || 'Cinematic & Editorial'
                  });
                }}
                style={{
                  color: '#6D28D9',
                  borderColor: 'rgba(124, 58, 237, 0.3)',
                  background: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>Launch Workspace</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
          )}

          {/* 3. Concept & Brief Overview Callout Block */}
          <div style={{ background: 'linear-gradient(135deg, rgba(253, 247, 237, 0.85) 0%, rgba(246, 240, 232, 0.6) 100%)', border: '1px solid rgba(235, 110, 75, 0.25)', borderRadius: '16px', padding: '22px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent-primary, #EB6E4B)' }}>
              <Sparkles size={16} />
              <span>Brief Description & Creative Concept</span>
            </div>
            <p style={{ margin: 0, fontSize: '1.02rem', lineHeight: 1.65, color: 'var(--text-primary)', fontWeight: 400 }}>
              {project.description}
            </p>
          </div>

          {/* 4. Creative Direction & Artistry (if present) */}
          {project.creativeDirection && (
            <div style={{ padding: '20px 24px', background: 'var(--bg-card-subtle, #F8F9FA)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: '14px' }}>
              <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary, #64748B)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Creative Direction & Lighting Choreography
              </span>
              <p style={{ margin: 0, fontSize: '0.94rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                {project.creativeDirection}
              </p>
            </div>
          )}

          {/* 5. Production Specifications Grid */}
          <div>
            <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary, #64748B)', fontWeight: 700, display: 'block', marginBottom: '12px' }}>
              Production Details & Specifications
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'var(--bg-card-subtle, #F8F9FA)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary, #64748B)' }}>
                  Role / Craft
                </span>
                <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {roleText}
                </span>
              </div>

              <div style={{ background: 'var(--bg-card-subtle, #F8F9FA)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary, #64748B)' }}>
                  Client / Scope
                </span>
                <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {clientText}
                </span>
              </div>

              <div style={{ background: 'var(--bg-card-subtle, #F8F9FA)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary, #64748B)' }}>
                  Creative Style
                </span>
                <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {styleText}
                </span>
              </div>

              <div style={{ background: 'var(--bg-card-subtle, #F8F9FA)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary, #64748B)' }}>
                  Tools & Pipeline
                </span>
                <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {toolsText}
                </span>
              </div>

              <div style={{ background: 'var(--bg-card-subtle, #F8F9FA)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary, #64748B)' }}>
                  Asset Deliverable Format
                </span>
                <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatText}
                </span>
              </div>

              <div style={{ background: 'var(--bg-card-subtle, #F8F9FA)', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: '12px', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary, #64748B)' }}>
                  Target Distribution
                </span>
                <span style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {platformText}
                </span>
              </div>
            </div>
          </div>

          {/* Individual AI Production Workflow belonging to this Project */}
          <div style={{ marginTop: '6px' }}>
            {saveWorkflowFeedback && (
              <div style={{
                marginBottom: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: saveWorkflowFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${saveWorkflowFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: saveWorkflowFeedback.type === 'success' ? '#059669' : '#DC2626'
              }}>
                {saveWorkflowFeedback.type === 'success' ? <CheckCircle2 size={15} /> : <ShieldCheck size={15} />}
                <span>{saveWorkflowFeedback.message}</span>
              </div>
            )}

            <ProjectWorkflowTimeline
              workflowStages={(localWorkflowData?.steps && localWorkflowData.steps.length > 0)
                ? localWorkflowData.steps
                : ((project.workflowStages && project.workflowStages.length > 0)
                    ? project.workflowStages
                    : (associatedWorkflow?.steps ? associatedWorkflow.steps.map((st, i) => ({
                        id: st.id || `st-${i}`,
                        order: i + 1,
                        stageNumber: i + 1,
                        stepName: st.title || st.stepName,
                        description: st.description,
                        tools: st.tools || [],
                        notes: st.notes || st.processNotes || st.humanInvolvementNotes
                      })) : []))}
              workflowTitle={localWorkflowData?.title || project.workflowTitle || ''}
              workflowOverview={localWorkflowData?.overview || project.workflowOverview || ''}
              projectTitle={project.title}
              canCreateWorkflow={isCreatorOwner}
              onCreateWorkflow={() => {
                if (!isCreatorOwner) {
                  // Non-owner (e.g. brand) safeguard
                  setSaveWorkflowFeedback({
                    type: 'error',
                    message: 'Only the creator who produced this piece can author its official production workflow. Use "Create Workspace" above to propose a collaboration.'
                  });
                  setTimeout(() => setSaveWorkflowFeedback(null), 5000);
                  return;
                }
                // Open empty structured editor for this specific project
                setIsWorkflowEditorOpen(true);
              }}
              onEditWorkflow={isCreatorOwner ? () => setIsWorkflowEditorOpen(true) : null}
            />
          </div>

          {/* Workflow Creation & Editing Modal Backdrop */}
          {isWorkflowEditorOpen && (
            <div 
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(6px)',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}
              onClick={() => setIsWorkflowEditorOpen(false)}
            >
              <div 
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  maxWidth: '780px',
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  padding: '28px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-light, #E2E8F0)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--accent-lavender-deep, #7C3AED)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <Layers size={13} />
                      Individual AI Production Workflow
                    </span>
                    <h3 style={{ margin: '4px 0 2px', fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Document Workflow for: {project.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      Detail your step-by-step generative pipeline, models, and craft methodology.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsWorkflowEditorOpen(false)}
                    style={{
                      background: 'rgba(0,0,0,0.05)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748B'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Pre-fill Summary Tags */}
                <div style={{
                  background: 'var(--bg-secondary, #FAF8F5)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <span><strong>Project ID:</strong> {project.id}</span>
                  {project.creativeStyle && <span><strong>Style:</strong> {project.creativeStyle}</span>}
                  {project.tools && <span><strong>Declared Tools:</strong> {project.tools}</span>}
                  {project.format && <span><strong>Format:</strong> {project.format}</span>}
                </div>

                {/* Reusable Stage Editor Component */}
                <ProjectWorkflowEditor
                  workflowData={localWorkflowData}
                  workflowStages={localWorkflowData?.steps || []}
                  workflowTitle={localWorkflowData?.title || ''}
                  workflowOverview={localWorkflowData?.overview || ''}
                  projectId={project.id}
                  projectTitle={project.title}
                  onChange={(updatedData) => setLocalWorkflowData(updatedData)}
                  isSaving={isSavingWorkflow}
                  onCancel={() => setIsWorkflowEditorOpen(false)}
                  onSave={async (savedData, steps) => {
                    setIsSavingWorkflow(true);
                    try {
                      if (onSaveWorkflow) {
                        await onSaveWorkflow(project.id, savedData);
                      }
                      setLocalWorkflowData(savedData);
                      setSaveWorkflowFeedback({
                        type: 'success',
                        message: `Workflow successfully saved with ${steps.length} production ${steps.length === 1 ? 'step' : 'steps'}.`
                      });
                      setIsWorkflowEditorOpen(false);
                      setTimeout(() => setSaveWorkflowFeedback(null), 4000);
                    } catch (saveErr) {
                      console.error('Failed to save project workflow:', saveErr);
                      setSaveWorkflowFeedback({
                        type: 'error',
                        message: `Failed to persist workflow: ${saveErr.message || 'Network error'}`
                      });
                    } finally {
                      setIsSavingWorkflow(false);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Relevant Technical Skills Demonstrated */}
          {resolvedCreator.technicalSkills && resolvedCreator.technicalSkills.length > 0 && (
            <div style={{
              background: 'rgba(240, 253, 250, 0.6)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              borderRadius: '14px',
              padding: '16px 20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Cpu size={14} style={{ color: '#0891B2' }} />
                <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#0E7490', fontWeight: 700 }}>
                  Relevant Technical Skills & AI Disciplines
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {resolvedCreator.technicalSkills.map((ts, i) => (
                  <span key={i} style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    color: '#0F766E'
                  }}>
                    {ts}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Commercial Usage & Licensing Disclosures */}
          <div style={{
            background: 'var(--bg-card-subtle, #F8FAFC)',
            border: '1px solid var(--border-light, #E2E8F0)',
            borderRadius: '14px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} style={{ color: '#059669', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Commercial Usage & Generative Rights Clearance
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Tools utilized ({toolsText}) declared under commercial licensing terms for brand deliverables.
                </div>
              </div>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '100px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#059669'
            }}>
              Commercial Clearance Declared
            </span>
          </div>

          {/* 6. Verified Capabilities & Craft Tags */}
          {tagsList && tagsList.length > 0 && (
            <div>
              <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary, #64748B)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                Verified Craft Capabilities & Tags
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {tagsList.map((tag, i) => (
                  <span key={i} className="skill-chip" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer Note & Bottom Close */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '18px', borderTop: '1px solid var(--border-light, #E2E8F0)', marginTop: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
              Provenance: <strong>Verified Commercial & Creative Work</strong>
            </span>

            <button 
              type="button" 
              className="btn btn-secondary btn-md"
              onClick={onClose}
            >
              Close Showcase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
