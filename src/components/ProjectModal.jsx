// src/components/ProjectModal.jsx
// Alloy — Portfolio Project Social Post & Case Study Experience
// Instagram-Inspired Two-Panel Social Layout with Complete Uncropped Media & Creator Interaction

import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Maximize2,
  Minimize2,
  Play,
  CheckCircle2,
  ShieldCheck,
  Briefcase,
  Layers,
  MessageSquare,
  Send,
  Lock,
  ChevronDown,
  ChevronUp,
  Sliders,
  FolderPlus
} from 'lucide-react';
import './ProjectModal.css';
import ProjectWorkflowTimeline from './ProjectWorkflowTimeline';
import ProjectWorkflowEditor from './ProjectWorkflowEditor';
import { DEMO_WORKFLOWS } from '../data/workflowsData';

const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80";

export default function ProjectModal({
  project,
  creator,
  onClose,
  onViewCreatorProfile,
  onCreateWorkspace,
  onSaveWorkflow,
  isCreatorOwner = false,
  currentUser = null,
  currentCreator = null,
  connections = [],
  onOpenConversation = null,
  onOpenLogin = null
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Comments state (Priority 3)
  const [comments, setComments] = useState(() => {
    return Array.isArray(project?.comments) ? [...project.comments] : [];
  });
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentFeedback, setCommentFeedback] = useState(null);

  // DM Request state (Priority 4)
  const [dmRequestStatus, setDmRequestStatus] = useState('idle'); // 'idle' | 'sending' | 'sent'
  const [dmFeedbackMessage, setDmFeedbackMessage] = useState(null);

  // Workflow builder / stages accordion state
  const [showWorkflowDetails, setShowWorkflowDetails] = useState(false);
  const [isWorkflowEditorOpen, setIsWorkflowEditorOpen] = useState(false);
  const [localWorkflowData, setLocalWorkflowData] = useState(() => ({
    title: project?.workflowTitle || project?.productionWorkflow?.title || '',
    overview: project?.workflowOverview || project?.productionWorkflow?.overview || '',
    steps: (project?.workflowStages && project.workflowStages.length > 0)
      ? project.workflowStages
      : []
  }));
  const [saveWorkflowFeedback, setSaveWorkflowFeedback] = useState(null);

  // Resolve author identity accurately without defaulting to logged-in user
  const resolvedCreator = useMemo(() => {
    if (creator && creator.name) return creator;
    if (project?.creator && project.creator.name) return project.creator;
    return {
      id: project?.creatorId || 'unknown-creator',
      name: project?.creatorName || 'Featured AI Director',
      creativeIdentity: 'Visual Worldbuilder & Generative Director',
      avatar: FALLBACK_AVATAR,
      tools: ['Midjourney v6.1', 'Runway Gen-3'],
      capabilities: ['Visual Direction', 'Generative Stills']
    };
  }, [creator, project]);

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
        name: `${project.title} (Motion Loop)`,
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

  // Resolve associated creative workflow if linked
  const allWorkflows = (resolvedCreator.workflows && resolvedCreator.workflows.length > 0)
    ? resolvedCreator.workflows
    : DEMO_WORKFLOWS.filter(w => w.creatorId === resolvedCreator.id);
  const associatedWorkflow = allWorkflows.find(w =>
    (w.linkedProjectId && w.linkedProjectId === project.id) ||
    (project.workflowId && w.id === project.workflowId)
  );

  const workflowStagesList = (localWorkflowData?.steps && localWorkflowData.steps.length > 0)
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
          })) : []));

  // Determine if the viewer is the creator author
  const isViewerTheAuthor = Boolean(
    (currentCreator && resolvedCreator && currentCreator.id === resolvedCreator.id) ||
    isCreatorOwner
  );

  // --- Priority 3: Comment Submission Handler ---
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    if (!currentUser && !currentCreator) {
      if (onOpenLogin) {
        onOpenLogin();
      }
      return;
    }

    if (isSubmittingComment) return;
    setIsSubmittingComment(true);

    const authorName = currentUser?.display_name ||
      currentUser?.user_metadata?.full_name ||
      currentCreator?.name ||
      (currentUser?.email ? currentUser.email.split('@')[0] : 'Community Creator');

    const authorAvatar = currentUser?.avatar_url ||
      currentCreator?.avatar ||
      FALLBACK_AVATAR;

    const newComment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      authorId: currentCreator?.id || currentUser?.id || 'anon',
      authorName,
      authorAvatar,
      text: trimmed,
      timestamp: 'Just now',
      isSessionOnly: true
    };

    setComments(prev => [...prev, newComment]);
    setNewCommentText('');
    setIsSubmittingComment(false);
    setCommentFeedback('Comment posted for this active session. (Database persistence pending backend migration).');
    setTimeout(() => setCommentFeedback(null), 5000);
  };

  // --- Priority 4: Request-to-DM Interaction Handler ---
  const handleDmRequest = () => {
    // 1. Prevent accidental self-messaging
    if (isViewerTheAuthor) {
      setDmFeedbackMessage({
        type: 'info',
        text: 'This is your own project.'
      });
      setTimeout(() => setDmFeedbackMessage(null), 4000);
      return;
    }

    // 2. Authentication check
    if (!currentUser && !currentCreator) {
      if (onOpenLogin) {
        onOpenLogin();
      }
      return;
    }

    // 3. Duplicate request guard
    if (dmRequestStatus === 'sending' || dmRequestStatus === 'sent') {
      setDmFeedbackMessage({
        type: 'info',
        text: `Message request already pending for ${resolvedCreator.name}.`
      });
      setTimeout(() => setDmFeedbackMessage(null), 4000);
      return;
    }

    // 4. Inspect existing connection
    const existingConn = (connections || []).find(c =>
      c.creatorId === resolvedCreator.id ||
      c.creator_id === resolvedCreator.id ||
      c.id === `conn-${resolvedCreator.id}`
    );

    if (existingConn && onOpenConversation) {
      onClose();
      onOpenConversation(existingConn);
      return;
    }

    // 5. Initiation feedback (Transparently noting peer messaging state)
    setDmRequestStatus('sending');
    setTimeout(() => {
      setDmRequestStatus('sent');
      setDmFeedbackMessage({
        type: 'success',
        text: `DM request sent to ${resolvedCreator.name}. (Note: Direct peer-to-peer creator messaging is awaiting backend conversation support).`
      });
      setTimeout(() => setDmFeedbackMessage(null), 6000);
    }, 400);
  };

  return (
    <div
      className="project-social-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-modal-title"
    >
      <div
        className={`project-social-modal ${isExpanded ? 'expanded-mode' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================
            1. LEFT PANEL: VISUAL MEDIA STAGE (UNCLIPPED ARTWORK)
            ======================================================== */}
        <section className="project-social-media-panel" aria-label="Project Visual Showcase">
          {/* Floating Badges */}
          <div className="project-social-media-badges">
            <span className="social-badge-pill">
              <Sparkles size={11} aria-hidden="true" />
              <span>{project.category || 'AI Visuals'}</span>
            </span>
            {project.featured && (
              <span className="social-badge-pill featured">
                ★ Featured Work
              </span>
            )}
            {hasVideo && (
              <span className="social-badge-pill">
                • 4K Video Loop
              </span>
            )}
          </div>

          {/* Floating Controls */}
          <div className="project-social-floating-controls">
            <button
              type="button"
              className="social-icon-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse View" : "Expand Media View"}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              className="social-icon-btn"
              onClick={onClose}
              aria-label="Close modal"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Media Viewport */}
          <div className="project-social-media-viewport">
            {isCurrentVideo || (hasVideo && isPlayingVideo) ? (
              <video
                key={videoSrc}
                src={videoSrc}
                autoPlay
                controls
                playsInline
                loop
                className="project-social-video"
              />
            ) : (
              <img
                src={currentMediaUrl}
                alt={project.title}
                className="project-social-img"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85";
                }}
              />
            )}

            {/* Video preview button if not playing */}
            {hasVideo && !isPlayingVideo && !isCurrentVideo && (
              <button
                type="button"
                className="social-play-motion-btn"
                onClick={() => setIsPlayingVideo(true)}
              >
                <Play size={14} fill="#FFFFFF" aria-hidden="true" />
                <span>Play Motion Preview</span>
              </button>
            )}
          </div>

          {/* Multi-Asset Gallery Selector Strip */}
          {mediaList.length > 1 && (
            <div className="project-social-thumbs-bar" role="tablist" aria-label="Media Assets">
              {mediaList.map((asset, idx) => {
                const isVid = asset.type === 'video' || asset.mediaType === 'video' || asset.mimeType?.startsWith('video/');
                const isActive = activeMediaIndex === idx;
                return (
                  <button
                    key={asset.id || idx}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`social-thumb-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveMediaIndex(idx);
                      setIsPlayingVideo(isVid);
                    }}
                    title={asset.name || `Asset ${idx + 1}`}
                  >
                    {isVid ? (
                      <video src={asset.url} />
                    ) : (
                      <img src={asset.url} alt="" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ========================================================
            2. RIGHT PANEL: EDITORIAL SOCIAL POST COLUMN
            ======================================================== */}
        <section className="project-social-details-panel" aria-label="Project Narrative and Community">
          {/* A. Author Identity Header */}
          <header className="project-social-author-header">
            <div
              className="social-author-info-group"
              onClick={() => {
                if (onViewCreatorProfile && resolvedCreator.id) {
                  onClose();
                  onViewCreatorProfile(resolvedCreator.id);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if (onViewCreatorProfile && resolvedCreator.id) {
                    onClose();
                    onViewCreatorProfile(resolvedCreator.id);
                  }
                }
              }}
              aria-label={`View ${resolvedCreator.name}'s profile`}
            >
              <img
                src={resolvedCreator.avatar || FALLBACK_AVATAR}
                alt=""
                className="social-author-avatar"
                onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
              />
              <div className="social-author-text">
                <span className="social-author-name">
                  {resolvedCreator.name}
                  <ShieldCheck size={14} style={{ color: 'var(--accent-forest, #214C35)' }} aria-label="Verified Creator" />
                </span>
                <span className="social-author-role">
                  {resolvedCreator.creativeIdentity || resolvedCreator.specialty || resolvedCreator.handle || 'AI Director'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-social-profile"
              onClick={() => {
                if (onViewCreatorProfile && resolvedCreator.id) {
                  onClose();
                  onViewCreatorProfile(resolvedCreator.id);
                }
              }}
              title={`View ${resolvedCreator.name}'s profile`}
            >
              <span>View Profile</span>
              <ArrowUpRight size={13} aria-hidden="true" />
            </button>
          </header>

          {/* B. Scrollable Stream Body */}
          <div className="project-social-scroll-stream">
            {/* Project Narrative & Caption */}
            <div className="project-social-narrative">
              <span className="project-social-category-tag">
                {project.category || 'AI Visual Direction'}
              </span>
              <h2 id="social-modal-title" className="project-social-title">
                {project.title}
              </h2>

              {project.description && (
                <p className="project-social-caption">
                  {project.description}
                </p>
              )}

              {project.creativeDirection && (
                <blockquote className="project-social-quote">
                  “{project.creativeDirection}”
                </blockquote>
              )}

              {/* Production Specifications Strip */}
              <div className="project-social-specs-strip" aria-label="Production Details">
                {project.tools && (
                  <span className="social-spec-tag tool">
                    <Layers size={11} aria-hidden="true" />
                    <span>{project.tools}</span>
                  </span>
                )}
                {project.role && (
                  <span className="social-spec-tag">
                    Role: {project.role}
                  </span>
                )}
                {project.clientType && (
                  <span className="social-spec-tag">
                    Scope: {project.clientType}
                  </span>
                )}
                {project.format && (
                  <span className="social-spec-tag">
                    Format: {project.format}
                  </span>
                )}
              </div>
            </div>

            <div className="social-divider" aria-hidden="true" />

            {/* Workflow Timeline Section (Expandable Accordion) */}
            {workflowStagesList.length > 0 && (
              <div>
                <button
                  type="button"
                  className="project-workflow-accordion-toggle"
                  onClick={() => setShowWorkflowDetails(!showWorkflowDetails)}
                  aria-expanded={showWorkflowDetails}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Sliders size={14} style={{ color: 'var(--accent-gold, #C7A47B)' }} />
                    <span>Production Node Graph ({workflowStagesList.length} Stages)</span>
                  </span>
                  {showWorkflowDetails ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {showWorkflowDetails && (
                  <div style={{ marginTop: '12px', animation: 'projectFadeIn 0.2s ease-out' }}>
                    <ProjectWorkflowTimeline
                      workflowStages={workflowStagesList}
                      workflowTitle={localWorkflowData?.title || project.workflowTitle || ''}
                      workflowOverview={localWorkflowData?.overview || project.workflowOverview || ''}
                      projectTitle={project.title}
                      canCreateWorkflow={isViewerTheAuthor}
                      onCreateWorkflow={() => isViewerTheAuthor && setIsWorkflowEditorOpen(true)}
                      onEditWorkflow={isViewerTheAuthor ? () => setIsWorkflowEditorOpen(true) : null}
                    />
                  </div>
                )}
              </div>
            )}

            {/* C. Community Comments Section (Priority 3) */}
            <section className="project-social-comments-section" aria-label="Community Comments">
              <div className="comments-header-row">
                <span className="comments-header-title">
                  <MessageSquare size={14} style={{ color: 'var(--accent-forest, #214C35)' }} aria-hidden="true" />
                  <span>Comments</span>
                  <span className="comments-count-badge">{comments.length}</span>
                </span>
                <span className="comment-persistence-note">Session feedback</span>
              </div>

              {/* Comments Stream */}
              <div className="comments-list" role="feed" aria-label="Comments feed">
                {comments.length === 0 ? (
                  <div className="comments-empty-notice">
                    No comments yet. Be the first creator to share thoughts or creative feedback on this piece.
                  </div>
                ) : (
                  comments.map((comm) => (
                    <article key={comm.id} className="comment-item">
                      <img
                        src={comm.authorAvatar || FALLBACK_AVATAR}
                        alt=""
                        className="comment-avatar"
                        onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
                      />
                      <div className="comment-content">
                        <div className="comment-author-row">
                          <span className="comment-author-name">{comm.authorName}</span>
                          <span className="comment-timestamp">• {comm.timestamp}</span>
                        </div>
                        <p className="comment-text">{comm.text}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {/* Comment Composer */}
              <form className="comment-composer-form" onSubmit={handleCommentSubmit}>
                <div className="comment-input-row">
                  <img
                    src={currentUser?.avatar_url || currentCreator?.avatar || FALLBACK_AVATAR}
                    alt=""
                    className="composer-user-avatar"
                    onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
                  />
                  <input
                    type="text"
                    className="comment-text-input"
                    placeholder={
                      currentUser || currentCreator
                        ? "Add creative feedback or leave a note..."
                        : "Sign in to join the discussion..."
                    }
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    disabled={isSubmittingComment}
                    aria-label="Add a comment"
                  />
                  <button
                    type="submit"
                    className="btn-comment-submit"
                    disabled={!newCommentText.trim() || isSubmittingComment}
                    title="Post comment"
                  >
                    <span>Post</span>
                  </button>
                </div>
                {commentFeedback && (
                  <span className="comment-persistence-note" role="status" style={{ color: '#059669' }}>
                    {commentFeedback}
                  </span>
                )}
              </form>
            </section>
          </div>

          {/* D. Sticky Actions Footer (Priority 4 & Workspace Initiation) */}
          <footer className="project-social-actions-footer">
            {/* Feedback notifications */}
            {dmFeedbackMessage && (
              <div className={`social-feedback-alert ${dmFeedbackMessage.type}`} role="status">
                {dmFeedbackMessage.type === 'success' ? (
                  <CheckCircle2 size={13} aria-hidden="true" />
                ) : (
                  <ShieldCheck size={13} aria-hidden="true" />
                )}
                <span>{dmFeedbackMessage.text}</span>
              </div>
            )}

            <div className="social-actions-row">
              {/* Message Creator / Request to DM Action (Priority 4) */}
              <button
                type="button"
                className={`btn-social-dm ${dmRequestStatus === 'sent' ? 'requested' : ''}`}
                onClick={handleDmRequest}
                disabled={isViewerTheAuthor || dmRequestStatus === 'sending'}
                title={
                  isViewerTheAuthor
                    ? "You are the author of this project"
                    : dmRequestStatus === 'sent'
                    ? "Request pending"
                    : `Send direct message request to ${resolvedCreator.name}`
                }
              >
                {isViewerTheAuthor ? (
                  <>
                    <Lock size={14} aria-hidden="true" />
                    <span>Your Project</span>
                  </>
                ) : dmRequestStatus === 'sent' ? (
                  <>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>Request Pending</span>
                  </>
                ) : (
                  <>
                    <Send size={14} aria-hidden="true" />
                    <span>Message Creator</span>
                  </>
                )}
              </button>

              {/* Create Workspace Collaboration Callout */}
              {onCreateWorkspace && (
                <button
                  type="button"
                  className="btn-social-workspace"
                  onClick={() => {
                    onClose();
                    onCreateWorkspace({
                      project,
                      creator: resolvedCreator,
                      suggestedName: `${project.title} Production Workspace`,
                      suggestedAesthetic: project.creativeStyle || project.style || 'Cinematic & Editorial'
                    });
                  }}
                  title="Launch dedicated collaboration workspace"
                >
                  <FolderPlus size={14} aria-hidden="true" />
                  <span>Create Workspace</span>
                </button>
              )}
            </div>
          </footer>
        </section>
      </div>

      {/* Structured Workflow Builder Modal for Creator Author */}
      {isWorkflowEditorOpen && (
        <ProjectWorkflowEditor
          isOpen={isWorkflowEditorOpen}
          onClose={() => setIsWorkflowEditorOpen(false)}
          initialData={localWorkflowData}
          projectTitle={project.title}
          onSave={async (data) => {
            setLocalWorkflowData(data);
            if (onSaveWorkflow) {
              await onSaveWorkflow(project.id, data);
            }
            setIsWorkflowEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}
