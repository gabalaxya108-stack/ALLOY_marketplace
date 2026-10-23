import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Palette, Eye, EyeOff, Star, Plus, MessageSquare, Briefcase, ExternalLink, 
  CheckCircle, ArrowRight, Dna, CheckCircle2, X, Send, ChevronRight, Check,
  Clock, DollarSign, Calendar, Sparkles, Filter, Bookmark, BookmarkCheck,
  Edit3, Trash2, Upload, AlertCircle, FileText, UserCheck, ShieldCheck,
  ArrowUp, ArrowDown, Globe, Lock, Cpu, Play, Minimize2, Wrench, Compass, Layers,
  Workflow, Video
} from 'lucide-react';
import { generateCreatorDNA } from '../intelligence/creatorDNA';
import { generateCreatorDNA as generateCreatorDNAWithGroq } from '../ai/groqClient';
import { INITIAL_CREATOR_INVITATIONS, INITIAL_CREATOR_PROJECTS } from '../data/connectionsData';
import { DEMO_WORKFLOWS, WORKFLOW_SPECIALIZATIONS, createBlankWorkflow } from '../data/workflowsData';
import WorkflowTimeline from '../components/WorkflowTimeline';
import WorkflowEditorModal from '../components/WorkflowEditorModal';
import TrustCenter from '../components/TrustCenter';
import MultiFormatUploader from '../components/MultiFormatUploader';
import CreatorSkillsManager from '../components/CreatorSkillsManager';
import ProjectWorkflowEditor from '../components/ProjectWorkflowEditor';
import { createInitialTrustVerification } from '../data/trustVerificationData';
import MessagesLoginWall from '../components/MessagesLoginWall';
import { deduplicateMessages } from '../services/marketplaceBackend';

function formatInvitationField(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'Not specified in this invitation';
}

export default function CreatorWorkspaceView({ 
  creator, 
  currentUser,
  onUpdateCreator,
  onViewPublicProfile,
  onExploreMarketplace,
  connections = [],
  onOpenConversation,
  opportunities = [],
  onOpportunityResponse,
  invitations: propInvitations,
  onAcceptInvitation: propOnAcceptInvitation,
  onDeclineInvitation: propOnDeclineInvitation,
  projects: propProjects,
  onSubmitDeliverables: propOnSubmitDeliverables,
  onSendMessage: propOnSendMessage,
  onSelectProject: propOnSelectProject,
  initialTab = 'overview',
  onLoginSuccess,
  onOpenLogin
}) {
  const [activeCreator, setActiveCreator] = useState(creator || {});
  const [activeTab, setActiveTab] = useState(initialTab || 'overview'); // 'overview' | 'portfolio' | 'opportunities' | 'invitations' | 'projects' | 'messages' | 'profile' | 'trust'

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Workflows state
  const [workflowsList, setWorkflowsList] = useState(() => {
    if (creator?.workflows && creator.workflows.length > 0) return creator.workflows;
    return DEMO_WORKFLOWS.filter(w => w.creatorId === creator?.id);
  });
  const [isWorkflowEditorOpen, setIsWorkflowEditorOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [previewingWorkflow, setPreviewingWorkflow] = useState(null);
  const [workflowFilter, setWorkflowFilter] = useState('all'); // 'all' | 'published' | 'draft'

  // Portfolio state
  const [projectsList, setProjectsList] = useState(creator?.projects || []);
  const [portfolioCategoryFilter, setPortfolioCategoryFilter] = useState('all');
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const handleOpenProject = (proj) => {
    if (propOnSelectProject) {
      propOnSelectProject(proj, activeCreator || creator);
    }
  };

  // Sync state when creator prop updates
  useEffect(() => {
    if (creator) {
      const initializedCreator = {
        ...creator,
        trustVerification: creator.trustVerification || createInitialTrustVerification(creator, currentUser)
      };
      setActiveCreator(initializedCreator);
      setProjectsList(creator.projects || []);
      if (creator.workflows && creator.workflows.length > 0) {
        setWorkflowsList(creator.workflows);
      } else {
        const matching = DEMO_WORKFLOWS.filter(w => w.creatorId === creator.id);
        setWorkflowsList(matching);
      }
      if (creator.creativeDNA) {
        setCustomAiDNA(creator.creativeDNA);
      }
    }
  }, [creator, currentUser]);

  // New Project Form State
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    category: 'Product Visuals',
    creativeStyle: 'Cinematic & Editorial',
    tools: 'Midjourney v6, Runway Gen-3',
    format: '4K Stills Suite',
    platform: 'Campaign OOH & Digital',
    image: '',
    video: null,
    visibility: 'published',
    featured: false,
    role: 'Lead Visual Artist',
    clientType: 'Commercial Campaign',
    workflowId: '',
    workflowStages: [],
    media: []
  });
  const [projectFormErrors, setProjectFormErrors] = useState({});

  // Opportunities & Saved state
  const [opportunitiesList, setOpportunitiesList] = useState(opportunities);
  const [savedOppIds, setSavedOppIds] = useState(['opp-summer-skincare']);
  const [selectedOpportunityForModal, setSelectedOpportunityForModal] = useState(null);
  const [applyModalOpp, setApplyModalOpp] = useState(null);
  const [applyNoteText, setApplyNoteText] = useState('');

  // Synchronize opportunities when published by brands,
  // preserving any locally-applied statuses that are not in the parent prop.
  useEffect(() => {
    if (opportunities) {
      setOpportunitiesList(prev => {
        // Build a set of IDs that have been locally marked as 'applied'
        const appliedIds = new Set(
          prev.filter(o => o.status === 'applied').map(o => o.id)
        );
        // Merge parent opportunities while preserving applied status
        return opportunities.map(o =>
          appliedIds.has(o.id) ? { ...o, status: 'applied' } : o
        );
      });
    }
  }, [opportunities]);

  // Invitations state (synced with shared props)
  const [localInvitationsList, setLocalInvitationsList] = useState(INITIAL_CREATOR_INVITATIONS);
  const invitationsList = propInvitations || localInvitationsList;
  const [invitationNotice, setInvitationNotice] = useState(null);
  const [invitationToConfirm, setInvitationToConfirm] = useState(null);

  // Consent dialog keyboard access: initial focus, Tab containment, Escape, focus restoration
  const consentDialogRef = useRef(null);
  const consentInitialFocusRef = useRef(null);
  const consentOpenerRef = useRef(null);

  useEffect(() => {
    if (!invitationToConfirm) return undefined;

    const dialog = consentDialogRef.current;
    if (!dialog) return undefined;

    const opener = document.activeElement;
    consentOpenerRef.current = opener instanceof HTMLElement && opener !== document.body ? opener : null;

    (consentInitialFocusRef.current || dialog).focus();

    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setInvitationToConfirm(null);
        return;
      }
      if (event.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (!dialog.contains(current) || !items.includes(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const openerToRestore = consentOpenerRef.current;
      consentOpenerRef.current = null;
      if (openerToRestore && typeof openerToRestore.focus === 'function' && document.contains(openerToRestore)) {
        openerToRestore.focus();
      }
    };
  }, [invitationToConfirm]);

  // Projects / Collaborations state (synced with shared props)
  const [localProjects, setLocalProjects] = useState(INITIAL_CREATOR_PROJECTS);
  const projectsCollaborations = propProjects || localProjects;
  const [submitModalProject, setSubmitModalProject] = useState(null);
  const [deliverableForm, setDeliverableForm] = useState({
    assetsUrl: '',
    notes: '',
    milestone: 'Milestone 2 of 3'
  });

  // Messages state
  const [creatorConnections, setCreatorConnections] = useState(() => {
    return connections.length > 0 ? connections : [
      {
        id: "conn-maya-skincare",
        brandId: "brand-demo-lumina",
        creatorId: "maya-chen",
        campaignId: "camp-summer-skincare",
        campaignTitle: "Summer Skincare & Radiant Hydration Launch",
        brandName: "Lumina Botanica",
        status: "connected",
        messages: [
          {
            id: "msg-1",
            sender: "brand",
            senderName: "Lumina Botanica",
            text: "Hi Maya, we loved your cinematic product work. We'd love to explore this direction for our summer launch.",
            timestamp: "Yesterday, 3:45 PM"
          },
          {
            id: "msg-2",
            sender: "creator",
            senderName: activeCreator.name || "Maya Chen",
            text: "Thanks! I'd love to work on it. I'm especially interested in the visual storytelling direction and warm Mediterranean sunlight.",
            timestamp: "Today, 10:15 AM"
          }
        ]
      }
    ];
  });

  // Single source of truth: synchronize with connections prop while preserving local demo fallback
  const activeConnectionsList = useMemo(() => {
    const forMe = (connections || []).filter(c => !c.creatorId || c.creatorId === activeCreator?.id);
    if (forMe.length > 0) return forMe;
    if ((connections || []).length > 0) return connections;
    return creatorConnections;
  }, [connections, activeCreator?.id, creatorConnections]);

  const [selectedConnectionId, setSelectedConnectionId] = useState(() => {
    const initial = (connections && connections.length > 0) ? connections : creatorConnections;
    return initial[0]?.id || null;
  });
  const [chatInputText, setChatInputText] = useState('');
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [chatErrorMessage, setChatErrorMessage] = useState(null);

  // Keep selectedConnectionId pointing to a valid connection
  useEffect(() => {
    if (activeConnectionsList.length > 0) {
      if (!selectedConnectionId || !activeConnectionsList.some(c => c.id === selectedConnectionId)) {
        setSelectedConnectionId(activeConnectionsList[0].id);
      }
    }
  }, [activeConnectionsList, selectedConnectionId]);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: activeCreator.name || 'Maya Chen',
    creativeIdentity: activeCreator.creativeIdentity || 'Cinematic AI Director & Visual Worldbuilder',
    bio: activeCreator.bio || 'Directing cinematic narrative commercials, evocative brand mythologies, and cinematic product worlds with 35mm grain.',
    location: activeCreator.location || 'London / New York (GMT/EST)',
    availability: activeCreator.availability || 'Available for projects',
    avatar: activeCreator.avatar || ''
  });
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [profileSuccessNotice, setProfileSuccessNotice] = useState(false);

  const handleOpenEditProfile = () => {
    setProfileForm({
      name: activeCreator.name || 'Maya Chen',
      creativeIdentity: activeCreator.creativeIdentity || 'Cinematic AI Director & Visual Worldbuilder',
      bio: activeCreator.bio || '',
      location: activeCreator.location || 'London / New York',
      availability: activeCreator.availability || 'Available for projects',
      avatar: activeCreator.avatar || ''
    });
    setIsEditProfileModalOpen(true);
  };
  const [customAiDNA, setCustomAiDNA] = useState(null);
  const [isDnaAnalyzing, setIsDnaAnalyzing] = useState(false);

  // Creator DNA attributes calculation (live Groq or deterministic fallback)
  const creatorDNA = customAiDNA || generateCreatorDNA(activeCreator);

  const handleRegenerateDNA = async () => {
    setIsDnaAnalyzing(true);
    try {
      const res = await generateCreatorDNAWithGroq(activeCreator);
      if (res) {
        setCustomAiDNA(res);
        if (onUpdateCreator) {
          onUpdateCreator({ ...activeCreator, creativeDNA: res });
        }
      }
    } catch (e) {
      console.error('[Creator DNA UI] Error updating DNA:', e);
    } finally {
      setIsDnaAnalyzing(false);
    }
  };

  // Quick stats
  const portfolioCompletion = Math.min(100, Math.round((projectsList.length / 5) * 100));

  // --- Handlers: Creative Workflows ---
  const handleOpenCreateWorkflow = (templateSpec = null) => {
    const blank = createBlankWorkflow(activeCreator?.id || 'maya-chen', templateSpec || activeCreator?.specialty);
    setEditingWorkflow(blank);
    setIsWorkflowEditorOpen(true);
  };

  const handleEditWorkflow = (wf) => {
    setEditingWorkflow(wf);
    setIsWorkflowEditorOpen(true);
  };

  const handleSaveWorkflow = (savedWorkflow) => {
    let updated;
    const exists = workflowsList.some(w => w.id === savedWorkflow.id);
    if (exists) {
      updated = workflowsList.map(w => w.id === savedWorkflow.id ? { ...w, ...savedWorkflow } : w);
    } else {
      updated = [savedWorkflow, ...workflowsList];
    }
    setWorkflowsList(updated);
    const updatedCreator = { ...activeCreator, workflows: updated };
    setActiveCreator(updatedCreator);
    if (onUpdateCreator) {
      onUpdateCreator(updatedCreator);
    }
    setInvitationNotice(`Workflow “${savedWorkflow.title}” saved successfully!`);
    setTimeout(() => setInvitationNotice(null), 4000);
  };

  const handleDeleteWorkflow = (wfId) => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this creative workflow?')) {
      return;
    }
    const updated = workflowsList.filter(w => w.id !== wfId);
    setWorkflowsList(updated);
    const updatedCreator = { ...activeCreator, workflows: updated };
    setActiveCreator(updatedCreator);
    if (onUpdateCreator) {
      onUpdateCreator(updatedCreator);
    }
    setInvitationNotice('Workflow removed from Creator Studio.');
    setTimeout(() => setInvitationNotice(null), 3000);
  };

  const handleTogglePublishWorkflow = (wfId) => {
    const updated = workflowsList.map(w => {
      if (w.id === wfId) {
        const isCurrentlyPub = w.visibility === 'published' || w.status === 'Published';
        const nextVis = isCurrentlyPub ? 'draft' : 'published';
        const nextStatus = isCurrentlyPub ? 'Draft' : 'Published';
        return { ...w, visibility: nextVis, status: nextStatus, updatedAt: 'Just now' };
      }
      return w;
    });
    setWorkflowsList(updated);
    const updatedCreator = { ...activeCreator, workflows: updated };
    setActiveCreator(updatedCreator);
    if (onUpdateCreator) {
      onUpdateCreator(updatedCreator);
    }
    const target = updated.find(w => w.id === wfId);
    setInvitationNotice(`Workflow ${target?.visibility === 'published' ? 'published to brand profile' : 'moved to private drafts'}!`);
    setTimeout(() => setInvitationNotice(null), 3500);
  };

  // --- Handlers: Portfolio Project ---
  const handleOpenAddProject = (existing = null) => {
    if (existing) {
      setEditingProject(existing);
      const initialMedia = (existing.media && existing.media.length > 0)
        ? existing.media
        : (existing.image ? [{
            id: `media-init-${Date.now()}`,
            url: existing.image,
            name: existing.title || 'Primary Visual',
            size: 0,
            mimeType: existing.video ? 'video/mp4' : 'image/jpeg',
            mediaType: existing.video ? 'video' : 'image',
            isCover: true
          }] : []);

      setProjectForm({
        title: existing.title || '',
        description: existing.description || '',
        category: existing.category || 'Product Visuals',
        creativeStyle: existing.creativeStyle || 'Cinematic & Editorial',
        tools: existing.tools || 'Midjourney v6, Runway Gen-3',
        format: existing.format || '4K Stills Suite',
        platform: existing.platform || 'Campaign OOH & Digital',
        image: existing.image || '',
        video: existing.video || null,
        visibility: existing.visibility || 'published',
        featured: !!existing.featured,
        role: existing.role || 'Lead Visual Artist',
        clientType: existing.clientType || 'Commercial Campaign',
        workflowId: existing.workflowId || '',
        workflowStages: existing.workflowStages || [],
        workflowTitle: existing.workflowTitle || existing.productionWorkflow?.title || '',
        workflowOverview: existing.workflowOverview || existing.productionWorkflow?.overview || '',
        media: initialMedia
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        title: '',
        description: '',
        category: 'Product Visuals',
        creativeStyle: 'Cinematic & Editorial',
        tools: 'Midjourney v6, Runway Gen-3',
        format: '4K Stills Suite',
        platform: 'Campaign OOH & Digital',
        image: '',
        video: null,
        visibility: 'published',
        featured: false,
        role: 'Lead Visual Artist',
        clientType: 'Commercial Campaign',
        workflowId: '',
        workflowStages: [],
        workflowTitle: '',
        workflowOverview: '',
        media: []
      });
    }
    setProjectFormErrors({});
    setIsAddProjectModalOpen(true);
  };

  const handleUpdateSkills = ({ technicalSkills, creativeSkills }) => {
    const updated = {
      ...activeCreator,
      technicalSkills,
      creativeSkills
    };
    setActiveCreator(updated);
    if (onUpdateCreator) {
      onUpdateCreator(updated);
    }
  };

  const handleSaveProject = (e) => {
    e.preventDefault();
    const errors = {};
    if (!projectForm.title.trim()) errors.title = 'Project title is required';
    if (!projectForm.description.trim()) errors.description = 'Description is required';

    const mediaList = projectForm.media || [];
    const coverItem = mediaList.find(m => m.isCover) || mediaList[0];
    const videoItem = mediaList.find(m => m.mediaType === 'video' || m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov)(\?.*)?$/i.test(m.url || ''));

    const finalImage = coverItem ? coverItem.url : (projectForm.image || '');
    const finalVideo = videoItem ? videoItem.url : (projectForm.video || null);

    if (!finalImage.trim() && mediaList.length === 0) {
      errors.image = 'At least one creative asset (image or video) is required';
    }

    if (Object.keys(errors).length > 0) {
      setProjectFormErrors(errors);
      return;
    }

    const projectPayload = {
      ...projectForm,
      workflowStages: projectForm.workflowStages || [],
      image: finalImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85",
      video: finalVideo,
      media: mediaList
    };

    let updatedList;
    if (editingProject) {
      updatedList = projectsList.map(p => 
        p.id === editingProject.id 
          ? { ...p, ...projectPayload }
          : p
      );
    } else {
      const newProj = {
        id: `proj-${Date.now()}`,
        ...projectPayload,
        createdAt: 'Just now'
      };
      updatedList = [newProj, ...projectsList];
    }

    const allPortfolioImages = updatedList.map(p => p.image).filter(Boolean);
    const allPortfolioVideos = updatedList.map(p => p.video).filter(Boolean);
    const allPortfolioMedia = updatedList.flatMap(p => p.media || []);

    const updatedCreator = {
      ...activeCreator,
      projects: updatedList,
      portfolioMedia: allPortfolioMedia,
      portfolioImages: allPortfolioImages,
      portfolioVideos: allPortfolioVideos,
      heroWork: activeCreator.heroWork || allPortfolioImages[0] || '',
      videoPreview: activeCreator.videoPreview || allPortfolioVideos[0] || null
    };

    setProjectsList(updatedList);
    if (onUpdateCreator) {
      onUpdateCreator(updatedCreator);
    }

    setIsAddProjectModalOpen(false);
  };

  const handleDeleteProject = (projId) => {
    if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to delete this project from your portfolio?')) {
      return;
    }
    const updatedList = projectsList.filter(p => p.id !== projId);
    setProjectsList(updatedList);
    if (onUpdateCreator) {
      const allPortfolioImages = updatedList.map(p => p.image).filter(Boolean);
      const allPortfolioVideos = updatedList.map(p => p.video).filter(Boolean);
      const allPortfolioMedia = updatedList.flatMap(p => p.media || []);
      onUpdateCreator({
        ...activeCreator,
        projects: updatedList,
        portfolioMedia: allPortfolioMedia,
        portfolioImages: allPortfolioImages,
        portfolioVideos: allPortfolioVideos
      });
    }
  };

  const handleToggleVisibility = (projId) => {
    const updatedList = projectsList.map(p => {
      if (p.id === projId) {
        const nextVis = p.visibility === 'private' ? 'published' : 'private';
        return { ...p, visibility: nextVis };
      }
      return p;
    });
    setProjectsList(updatedList);
    if (onUpdateCreator) {
      onUpdateCreator({ ...activeCreator, projects: updatedList });
    }
  };

  const handleToggleFeatured = (projId) => {
    const updatedList = projectsList.map(p => {
      if (p.id === projId) {
        return { ...p, featured: !p.featured };
      }
      return p;
    });
    setProjectsList(updatedList);
    if (onUpdateCreator) {
      onUpdateCreator({ ...activeCreator, projects: updatedList });
    }
  };

  const handleReorderProject = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= projectsList.length) return;
    const newList = [...projectsList];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIdx, 0, moved);
    setProjectsList(newList);
    if (onUpdateCreator) {
      onUpdateCreator({ ...activeCreator, projects: newList });
    }
  };

  // --- Handlers: Opportunities ---
  const handleToggleSaveOpportunity = (oppId) => {
    setSavedOppIds(prev => 
      prev.includes(oppId) ? prev.filter(id => id !== oppId) : [...prev, oppId]
    );
  };

  const handleOpenApplyModal = (opp) => {
    setApplyModalOpp(opp);
    setApplyNoteText(`Hi ${opp.brand}, I'm excited about your ${opp.title}. My visual style in ${activeCreator.creativeIdentity || 'generative direction'} aligns directly with your deliverables.`);
  };

  const handleSendApplication = (e) => {
    e.preventDefault();
    if (!applyModalOpp) return;

    if (onOpportunityResponse) {
      // Parent creates the authoritative connection in marketplaceData.connections;
      // it will flow back via the connections prop and activeConnectionsList.
      // The selection-validity useEffect (line 138) will auto-select the new connection.
      onOpportunityResponse(applyModalOpp, applyNoteText);
    } else {
      // Demo/standalone fallback: no parent handler, so manage connections locally
      const newConn = {
        id: `conn-opp-${applyModalOpp.id}-${Date.now()}`,
        campaignTitle: applyModalOpp.title,
        brandName: applyModalOpp.brand,
        status: 'connected',
        messages: [
          {
            id: `msg-${Date.now()}`,
            sender: 'creator',
            senderName: activeCreator.name,
            text: applyNoteText,
            timestamp: 'Just now'
          }
        ]
      };
      setCreatorConnections(prev => [newConn, ...prev]);
      setSelectedConnectionId(newConn.id);
    }

    // Update opportunity status
    setOpportunitiesList(prev => prev.map(o => 
      o.id === applyModalOpp.id ? { ...o, status: 'applied' } : o
    ));

    setApplyModalOpp(null);
    setInvitationNotice(`Application sent to ${applyModalOpp.brand}! Connection opened in Messages.`);
    setTimeout(() => setInvitationNotice(null), 4000);
  };

  // --- Handlers: Invitations (Accept / Decline) ---
  const handleAcceptInvitation = (invitation) => {
    if (propOnAcceptInvitation) {
      propOnAcceptInvitation(invitation);
    } else {
      setLocalInvitationsList(prev => prev.map(inv => 
        inv.id === invitation.id ? { ...inv, status: 'accepted' } : inv
      ));
      const newProject = {
        id: `proj-collab-${invitation.id}`,
        campaignId: invitation.campaignId,
        campaignTitle: invitation.title,
        brandName: invitation.brandName || invitation.brand,
        brandContact: "Creative Director",
        status: "in-progress",
        progressPercent: 30,
        milestone: "Milestone 1 of 3: Moodboard & Concept Alignment",
        deadline: invitation.timeline,
        agreedBudget: invitation.budget,
        deliverablesScope: invitation.deliverables,
        latestFeedback: "“Invitation accepted. Welcome to the team! Looking forward to first concept passes.”",
        submissionUrl: "",
        submissionNotes: ""
      };
      setLocalProjects(prev => [newProject, ...prev]);
    }

    setInvitationNotice(`Invitation from ${invitation.brandName || invitation.brand} accepted! Collaboration project activated.`);
    setTimeout(() => setInvitationNotice(null), 5000);
  };

  const handleDeclineInvitation = (invitation) => {
    if (propOnDeclineInvitation) {
      propOnDeclineInvitation(invitation);
    } else {
      setLocalInvitationsList(prev => prev.map(inv => 
        inv.id === invitation.id ? { ...inv, status: 'declined' } : inv
      ));
    }
    setInvitationNotice(`Invitation from ${invitation.brandName || invitation.brand} politely declined.`);
    setTimeout(() => setInvitationNotice(null), 4000);
  };

  // --- Handlers: Invitation Acceptance Consent ---
  const handleConfirmInvitationAcceptance = () => {
    const invitation = invitationToConfirm;
    if (!invitation) return;
    // Close before invoking so a rapid re-click on Confirm cannot accept twice
    setInvitationToConfirm(null);
    handleAcceptInvitation(invitation);
  };

  // --- Handlers: Projects (Deliverable Submission) ---
  const handleSubmitDeliverables = (e) => {
    e.preventDefault();
    if (!submitModalProject || !deliverableForm.assetsUrl.trim()) return;

    if (propOnSubmitDeliverables) {
      propOnSubmitDeliverables(submitModalProject.id, {
        assetsUrl: deliverableForm.assetsUrl.trim(),
        notes: deliverableForm.notes.trim(),
        milestone: deliverableForm.milestone
      });
    } else {
      setLocalProjects(prev => prev.map(p => {
        if (p.id === submitModalProject.id) {
          return {
            ...p,
            status: 'submitted',
            progressPercent: Math.min(100, p.progressPercent + 25),
            submissionUrl: deliverableForm.assetsUrl,
            submissionNotes: deliverableForm.notes,
            latestFeedback: "“Deliverables received! Brand creative director reviewing passes.”"
          };
        }
        return p;
      }));
    }

    setSubmitModalProject(null);
    setDeliverableForm({ assetsUrl: '', notes: '', milestone: 'Milestone 2 of 3' });
    setInvitationNotice(`Deliverables submitted for ${submitModalProject.campaignTitle}!`);
    setTimeout(() => setInvitationNotice(null), 4000);
  };

  // --- Handlers: Chat Messages ---
  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = chatInputText.trim();
    if (!trimmed || !selectedConnectionId || isSendingChatMessage) return;

    setIsSendingChatMessage(true);
    setChatErrorMessage(null);

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'creator',
      senderName: activeCreator.name || 'Creator',
      text: trimmed,
      timestamp: 'Just now'
    };

    try {
      if (propOnSendMessage) {
        await propOnSendMessage(selectedConnectionId, newMsg);
      } else {
        setCreatorConnections(prev => prev.map(c => {
          if (c.id === selectedConnectionId) {
            return {
              ...c,
              messages: [...(c.messages || []), newMsg]
            };
          }
          return c;
        }));
      }
      setChatInputText('');
    } catch (err) {
      console.error('[CreatorWorkspace] Send failed:', err);
      setChatErrorMessage(err.message || 'Failed to send message.');
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  // --- Handlers: Profile Save ---
  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    const updated = {
      ...activeCreator,
      ...profileForm
    };
    setActiveCreator(updated);
    if (onUpdateCreator) {
      onUpdateCreator(updated);
    }
    setProfileSuccessNotice(true);
    setTimeout(() => setProfileSuccessNotice(false), 3500);
    setIsEditProfileModalOpen(false);
  };

  const activeConnection = activeConnectionsList.find(c => c.id === selectedConnectionId) || activeConnectionsList[0] || null;

  const filteredProjects = portfolioCategoryFilter === 'all'
    ? projectsList
    : projectsList.filter(p => p.category?.toLowerCase().includes(portfolioCategoryFilter.toLowerCase()));

  return (
    <div className="creator-studio-workspace">
      {/* Studio Banner Notice */}
      {invitationNotice && (
        <div className="studio-top-toast">
          <CheckCircle2 size={16} />
          <span>{invitationNotice}</span>
        </div>
      )}

      <div className="page-container">
        {/* Workspace Top Header Bar */}
        <div className="studio-workspace-header">
          <div className="studio-header-welcome">
            <div className="studio-identity-pill">
              <span className="dot-pulse" />
              <span>Creator Studio • Portfolio-First Workspace</span>
            </div>
            <h1 className="studio-welcome-title">
              Your next creative chapter starts here.
            </h1>
            <p className="studio-welcome-sub">
              Manage your portfolio, accept brand invitations, collaborate on active briefs, and showcase your Creator DNA.
            </p>
          </div>

          <div className="studio-header-actions">
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={onViewPublicProfile}
            >
              <Eye size={15} />
              <span>Public Profile</span>
            </button>

            <button 
              type="button" 
              className="btn btn-primary btn-sm studio-add-work-btn"
              onClick={() => handleOpenAddProject()}
            >
              <Plus size={15} />
              <span>Add to Portfolio</span>
            </button>
          </div>
        </div>

        {/* Studio Primary Navigation Tabs */}
        <div className="studio-nav-bar" role="tablist" aria-label="Creator Studio Navigation">
          <button 
            type="button" 
            role="tab" 
            aria-selected={activeTab === 'overview'}
            className={`studio-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span>Overview</span>
          </button>

          <button 
            type="button" 
            role="tab" 
            aria-selected={activeTab === 'portfolio'}
            className={`studio-tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveTab('portfolio')}
          >
            <span>My Portfolio</span>
            <span className="tab-count-pill">{projectsList.length}</span>
          </button>

          <button 
            type="button" 
            role="tab" 
            aria-selected={activeTab === 'workflows'}
            className={`studio-tab-btn ${activeTab === 'workflows' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflows')}
          >
            <span>Workflows</span>
          </button>

          <button 
            type="button" 
            role="tab" 
            aria-selected={activeTab === 'opportunities'}
            className={`studio-tab-btn ${activeTab === 'opportunities' ? 'active' : ''}`}
            onClick={() => setActiveTab('opportunities')}
          >
            <span>Opportunities</span>
            <span className="tab-count-pill">{opportunitiesList.length}</span>
          </button>

          <button 
            type="button" 
            role="tab" 
            aria-selected={activeTab === 'invitations'}
            className={`studio-tab-btn ${activeTab === 'invitations' ? 'active' : ''}`}
            onClick={() => setActiveTab('invitations')}
          >
            <span>Invitations</span>
            <span className="tab-count-pill highlight">{invitationsList.filter(i => i.status === 'pending').length}</span>
          </button>

          <button 
            type="button" 
            role="tab" 
            aria-selected={activeTab === 'projects'}
            className={`studio-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <span>Projects</span>
            <span className="tab-count-pill">{projectsCollaborations.length}</span>
          </button>

          <button 
            type="button" 
            role="tab" 
            aria-selected={activeTab === 'messages'}
            className={`studio-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            <span>Messages</span>
            <span className="tab-count-pill">{activeConnectionsList.length}</span>
          </button>

          <button 
            type="button" 
            role="tab" 
            aria-selected={activeTab === 'profile'}
            className={`studio-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span>Profile & DNA</span>
          </button>

          <button 
            type="button" 
            role="tab" 
            aria-selected={activeTab === 'trust'}
            className={`studio-tab-btn ${activeTab === 'trust' ? 'active' : ''}`}
            onClick={() => setActiveTab('trust')}
          >
            <ShieldCheck size={14} style={{ marginRight: '5px' }} />
            <span>Trust Center</span>
            <span className="tab-count-pill highlight">Verified</span>
          </button>
        </div>

        {/* ========================================================
            TAB 1: OVERVIEW
            ======================================================== */}
        {activeTab === 'overview' && (
          <div className="studio-overview-view">
            {/* Top Grid: Profile Summary & Creator DNA */}
            <div className="overview-summary-grid">
              {/* Creator Profile Summary Card */}
              <div className="studio-card overview-profile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                  <div className="overview-avatar-row" style={{ margin: 0 }}>
                    <div 
                      className="overview-avatar-wrap" 
                      onClick={handleOpenEditProfile}
                      style={{ cursor: 'pointer' }}
                      title="Click to edit profile photo"
                    >
                      <img 
                        src={activeCreator.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"} 
                        alt={activeCreator.name}
                        className="overview-avatar-img"
                      />
                      <span className="avatar-online-dot" />
                    </div>

                    <div className="overview-name-meta">
                      <div className="overview-name-badge">
                        <h2 className="overview-creator-name">{activeCreator.name || 'Maya Chen'}</h2>
                        <span className="status-badge-verified">
                          <CheckCircle2 size={13} />
                          <span>Verified AI Creator</span>
                        </span>
                      </div>
                      <p className="overview-creator-role">{activeCreator.creativeIdentity || 'Cinematic AI Director & Visual Worldbuilder'}</p>
                      <span className="overview-creator-loc">{activeCreator.location || 'London / New York'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleOpenEditProfile}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title="Edit your creator profile details"
                  >
                    <Edit3 size={14} />
                    <span>Edit Profile</span>
                  </button>
                </div>

                <p className="overview-bio-text">
                  {activeCreator.bio || 'Directing cinematic narrative commercials, evocative brand mythologies, and cinematic product worlds.'}
                </p>

                {/* Progress & Availability Bars */}
                <div className="overview-metrics-row">
                  <div className="metric-box">
                    <span className="metric-label">Portfolio Completion</span>
                    <div className="metric-progress-bar">
                      <div className="metric-progress-fill" style={{ width: `${portfolioCompletion}%` }} />
                    </div>
                    <span className="metric-val">{portfolioCompletion}% Complete</span>
                  </div>

                  <div className="metric-box">
                    <span className="metric-label">Availability Status</span>
                    <span className="availability-pill active-available">
                      <span className="dot-green" />
                      <span>{activeCreator.availability || 'Available for projects'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Creator DNA Preview Card */}
              <div className="studio-card overview-dna-card">
                <div className="dna-card-header">
                  <div className="dna-header-title">
                    <Dna size={16} className="text-lavender" />
                    <h3>Creator DNA Summary</h3>
                  </div>
                  <span className="dna-verified-pill">Portfolio-Derived</span>
                </div>

                <p className="dna-desc">
                  Nuanced visual attributes extracted from your published commercial works and aesthetic prompt signatures.
                </p>

                <div className="dna-attributes-list">
                  <div className="dna-attribute-item">
                    <div className="dna-attr-label">
                      <span>Cinematic Anamorphic Lighting</span>
                      <span className="dna-attr-val">96%</span>
                    </div>
                    <div className="dna-attr-bar">
                      <div className="dna-attr-fill" style={{ width: '96%', background: 'var(--accent-lavender-deep)' }} />
                    </div>
                  </div>

                  <div className="dna-attribute-item">
                    <div className="dna-attr-label">
                      <span>Story-Driven Narrative Atmosphere</span>
                      <span className="dna-attr-val">94%</span>
                    </div>
                    <div className="dna-attr-bar">
                      <div className="dna-attr-fill" style={{ width: '94%', background: 'var(--accent-peach-deep)' }} />
                    </div>
                  </div>

                  <div className="dna-attribute-item">
                    <div className="dna-attr-label">
                      <span>35mm Film Grain & Organic Caustics</span>
                      <span className="dna-attr-val">92%</span>
                    </div>
                    <div className="dna-attr-bar">
                      <div className="dna-attr-fill" style={{ width: '92%', background: 'var(--accent-mint-deep)' }} />
                    </div>
                  </div>

                  <div className="dna-attribute-item">
                    <div className="dna-attr-label">
                      <span>High-Fashion Macro Physics</span>
                      <span className="dna-attr-val">88%</span>
                    </div>
                    <div className="dna-attr-bar">
                      <div className="dna-attr-fill" style={{ width: '88%', background: '#64748B' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical & Creative Skills Disciplines Block */}
            <CreatorSkillsManager 
              creator={activeCreator} 
              onUpdateSkills={handleUpdateSkills} 
              isEditable={true} 
            />

            {/* Middle Section: Recent Portfolio Highlights */}
            <div className="overview-section-block">
              <div className="overview-block-header">
                <div>
                  <h3 className="overview-block-title">My Portfolio Showcase</h3>
                  <p className="overview-block-subtitle">High-fidelity project previews visible to brands and agencies.</p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab('portfolio')}
                >
                  <span>View All ({projectsList.length})</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="overview-portfolio-grid">
                {projectsList.slice(0, 3).map((proj) => (
                  <div 
                    key={proj.id} 
                    className="overview-project-card"
                    onClick={() => handleOpenProject(proj)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenProject(proj);
                      }
                    }}
                    title={`Click to view project brief & details for ${proj.title}`}
                  >
                    <div className="overview-proj-img-wrap">
                      <img 
                        src={proj.image} 
                        alt={proj.title}
                        className="overview-proj-img"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85";
                        }}
                      />
                      <span className="overview-proj-tag">{proj.category || 'Product'}</span>
                      <div className="overview-click-cue">
                        <Eye size={13} />
                        <span>View Brief</span>
                      </div>
                    </div>
                    <div className="overview-proj-body">
                      <h4 className="overview-proj-name">{proj.title}</h4>
                      <p className="overview-proj-desc">{proj.description}</p>
                      <span className="overview-view-link">View Project Details →</span>
                    </div>
                  </div>
                ))}

                <button 
                  type="button" 
                  className="overview-add-card-placeholder"
                  onClick={() => handleOpenAddProject()}
                >
                  <Plus size={24} />
                  <span>Add New Project</span>
                  <small>Upload stills, video loops, or CGI key art</small>
                </button>
              </div>
            </div>

            {/* Bottom Row: Pending Invitations & New Opportunities Glance */}
            <div className="overview-activity-grid">
              {/* Pending Invitations Glance */}
              <div className="studio-card activity-card">
                <div className="activity-card-header">
                  <div className="activity-header-left">
                    <Sparkles size={16} className="text-peach" />
                    <h4>Pending Brand Invitations</h4>
                  </div>
                  <button 
                    type="button" 
                    className="link-subtle"
                    onClick={() => setActiveTab('invitations')}
                  >
                    Manage Invitations →
                  </button>
                </div>

                <div className="activity-items-list">
                  {invitationsList.filter(i => i.status === 'pending').slice(0, 2).map((inv) => (
                    <div key={inv.id} className="activity-item-row">
                      <img src={inv.brandAvatar} alt={inv.brand} className="activity-brand-avatar" />
                      <div className="activity-item-details">
                        <span className="activity-brand-name">{inv.brand}</span>
                        <span className="activity-camp-title">{inv.title}</span>
                        <div className="activity-meta-pills">
                          <span>{inv.budget}</span>
                          <span>{inv.timeline}</span>
                        </div>
                      </div>
                      <div className="activity-quick-actions">
                        <button 
                          type="button" 
                          className="btn btn-primary btn-xs"
                          onClick={() => setInvitationToConfirm(inv)}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                  {invitationsList.filter(i => i.status === 'pending').length === 0 && (
                    <p className="empty-subtle">No pending invitations. Active collaborations will appear in Projects.</p>
                  )}
                </div>
              </div>

              {/* Opportunities Glance */}
              <div className="studio-card activity-card">
                <div className="activity-card-header">
                  <div className="activity-header-left">
                    <Briefcase size={16} className="text-lavender" />
                    <h4>Recommended Opportunities</h4>
                  </div>
                  <button 
                    type="button" 
                    className="link-subtle"
                    onClick={() => setActiveTab('opportunities')}
                  >
                    Browse All →
                  </button>
                </div>

                <div className="activity-items-list">
                  {opportunitiesList.slice(0, 2).map((opp) => (
                    <div key={opp.id} className="activity-item-row">
                      <div className="activity-item-details">
                        <span className="activity-brand-name">{opp.brand}</span>
                        <span className="activity-camp-title">{opp.title}</span>
                        <p className="activity-fit-reason">{opp.whyItFits}</p>
                      </div>
                      <button 
                        type="button" 
                        className={`btn ${opp.status === 'applied' ? 'btn-secondary' : 'btn-primary'} btn-xs`}
                        onClick={() => handleOpenApplyModal(opp)}
                        disabled={opp.status === 'applied'}
                      >
                        {opp.status === 'applied' ? 'Interest Expressed' : 'Apply'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: MY PORTFOLIO
            ======================================================== */}
        {activeTab === 'portfolio' && (
          <div className="studio-portfolio-view">
            {/* Filter and Action Header */}
            <div className="portfolio-subnav-row">
              <div className="portfolio-filters-group">
                {['all', 'product', 'fashion', 'video', '3d'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`portfolio-filter-pill ${portfolioCategoryFilter === cat ? 'active' : ''}`}
                    onClick={() => setPortfolioCategoryFilter(cat)}
                  >
                    {cat === 'all' ? 'All Works' : cat.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={onViewPublicProfile}
                  title="Preview your public brand-facing portfolio"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Eye size={14} />
                  <span>Preview as Brand</span>
                </button>

                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenAddProject()}
                >
                  <Plus size={15} />
                  <span>Add Project</span>
                </button>
              </div>
            </div>

            {/* Consistent Grid with Uniform Aspect Ratio */}
            {filteredProjects.length > 0 ? (
              <div className="portfolio-workspace-grid">
                {filteredProjects.map((proj, idx) => (
                  <div 
                    key={proj.id} 
                    className="portfolio-card-item"
                    onClick={() => handleOpenProject(proj)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenProject(proj);
                      }
                    }}
                    title={`Click to view brief description & details for ${proj.title}`}
                  >
                    <div className="portfolio-item-media" style={{ position: 'relative' }}>
                      <img 
                        src={proj.image} 
                        alt={proj.title}
                        className="portfolio-item-img"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=85";
                        }}
                      />
                      <span className="portfolio-cat-badge">{proj.category || 'Visual Art'}</span>

                      {/* Mixed Media / Video Indicators */}
                      <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', gap: '5px', zIndex: 4 }}>
                        {Boolean((proj.media && proj.media.some(m => m.mediaType === 'video')) || proj.video) && (
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '2px 7px',
                            borderRadius: '100px',
                            background: 'rgba(15, 23, 42, 0.85)',
                            backdropFilter: 'blur(4px)',
                            color: '#38BDF8',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            border: '1px solid rgba(56, 189, 248, 0.3)'
                          }}>
                            <Video size={10} /> Video
                          </span>
                        )}
                        {Boolean(proj.media && proj.media.length > 1) && (
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '2px 7px',
                            borderRadius: '100px',
                            background: 'rgba(15, 23, 42, 0.85)',
                            backdropFilter: 'blur(4px)',
                            color: '#F1F5F9',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            border: '1px solid rgba(255, 255, 255, 0.2)'
                          }}>
                            <Layers size={10} /> {proj.media.length} Media
                          </span>
                        )}
                      </div>

                      {/* Clickable Hover Cue */}
                      <div className="portfolio-media-click-hint">
                        <div className="portfolio-media-hint-pill">
                          <Eye size={15} />
                          <span>View Project Details</span>
                        </div>
                      </div>

                      {/* Top Badges: Visibility & Featured */}
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px', zIndex: 4 }}>
                        {proj.featured && (
                          <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '100px', background: 'rgba(245, 158, 11, 0.9)', color: '#FFFFFF', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            ★ Featured
                          </span>
                        )}
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '3px 8px', 
                          borderRadius: '100px', 
                          background: proj.visibility === 'private' ? 'rgba(239, 68, 68, 0.85)' : 'rgba(16, 185, 129, 0.85)', 
                          color: '#FFFFFF', 
                          fontWeight: 600 
                        }}>
                          {proj.visibility === 'private' ? 'Private Draft' : 'Published'}
                        </span>
                      </div>

                      <div className="portfolio-hover-controls" style={{ zIndex: 5 }}>
                        <button
                          type="button"
                          className="control-icon-btn"
                          title={proj.visibility === 'private' ? "Publish Project (Visible to Brands)" : "Make Private (Hide from Brands)"}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleVisibility(proj.id);
                          }}
                        >
                          {proj.visibility === 'private' ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          type="button"
                          className="control-icon-btn"
                          title={proj.featured ? "Remove from Featured" : "Feature on Portfolio"}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleFeatured(proj.id);
                          }}
                        >
                          <Star size={14} fill={proj.featured ? "#F59E0B" : "none"} stroke={proj.featured ? "#F59E0B" : "currentColor"} />
                        </button>
                        <button 
                          type="button" 
                          className="control-icon-btn"
                          title="Edit Project"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddProject(proj);
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          type="button" 
                          className="control-icon-btn danger"
                          title="Delete Project"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(proj.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="portfolio-item-info">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <h3 className="portfolio-item-title portfolio-item-title-clickable" style={{ margin: 0 }}>
                          {proj.title}
                        </h3>
                        <div style={{ display: 'inline-flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="reorder-arrow-btn"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderProject(projectsList.findIndex(p => p.id === proj.id), -1);
                            }}
                            title="Move Earlier"
                            style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', padding: '3px 5px', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            className="reorder-arrow-btn"
                            disabled={idx === filteredProjects.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderProject(projectsList.findIndex(p => p.id === proj.id), 1);
                            }}
                            title="Move Later"
                            style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '4px', padding: '3px 5px', cursor: idx === filteredProjects.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === filteredProjects.length - 1 ? 0.4 : 1 }}
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                      </div>

                      {proj.role && (
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>
                          Role: {proj.role} {proj.clientType ? `• ${proj.clientType}` : ''}
                        </p>
                      )}

                      <p className="portfolio-item-desc">{proj.description}</p>
                      
                      <div className="portfolio-item-tags">
                        <span className="tag-chip">{proj.creativeStyle || 'Cinematic'}</span>
                        <span className="tag-chip">{proj.tools || 'Midjourney'}</span>
                        {proj.visibility === 'private' && (
                          <span className="tag-chip" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontWeight: 600 }}>
                            Hidden from Brands
                          </span>
                        )}
                      </div>

                      <div className="portfolio-view-details-link">
                        <Eye size={13} />
                        <span>View Project Details & Brief →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="portfolio-empty-state">
                <Palette size={48} className="empty-state-icon" />
                <h3 className="empty-state-title">Your work deserves to be seen.</h3>
                <p className="empty-state-desc">
                  Add your first project to start building your portfolio and receiving tailored brand opportunities.
                </p>
                <button 
                  type="button" 
                  className="btn btn-primary btn-md"
                  onClick={() => handleOpenAddProject()}
                >
                  <Plus size={16} />
                  <span>Create Your First Project</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB: CREATIVE WORKFLOW MANAGEMENT
            ======================================================== */}
        {activeTab === 'workflows' && (
          <div className="studio-workflows-view">
            {/* Header / Intro Strip */}
            <div className="portfolio-subnav-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="section-label-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Workflow size={13} />
                  <span>Production Pipelines</span>
                </span>
                <h2 className="section-title-sm" style={{ margin: '4px 0 6px 0', fontSize: '1.45rem' }}>
                  Creative Workflow & Methodology
                </h2>
                <p className="section-desc-sm" style={{ maxWidth: '640px', margin: 0 }}>
                  Standardize, manage, and publish your production pipelines. Document tools, AI models, and human artistry so brands understand your craft before commissioning work.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={onViewPublicProfile}
                  title="View how brands see your published workflows"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Eye size={14} />
                  <span>View Public Profile</span>
                </button>

                <button 
                  type="button" 
                  className="btn btn-primary btn-sm studio-add-work-btn"
                  onClick={() => handleOpenCreateWorkflow()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>Create Workflow</span>
                </button>
              </div>
            </div>

            {/* Quick-Starter Demonstration Templates Bar */}
            <div style={{ 
              marginTop: '16px', 
              padding: '16px 20px', 
              background: 'linear-gradient(135deg, rgba(253, 247, 237, 0.8) 0%, rgba(246, 240, 232, 0.6) 100%)', 
              border: '1px solid rgba(235, 110, 75, 0.2)', 
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: 'var(--accent-primary, #EB6E4B)' }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Start from a proven production template:
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => handleOpenCreateWorkflow("Beauty & Skincare")}
                  style={{ fontSize: '0.78rem', background: '#FFFFFF' }}
                >
                  + Skincare Campaign Process
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => handleOpenCreateWorkflow("Product Visualization")}
                  style={{ fontSize: '0.78rem', background: '#FFFFFF' }}
                >
                  + Product Viz Pipeline
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => handleOpenCreateWorkflow("Motion Design")}
                  style={{ fontSize: '0.78rem', background: '#FFFFFF' }}
                >
                  + Motion Teaser Process
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => handleOpenCreateWorkflow("Fashion Campaigns")}
                  style={{ fontSize: '0.78rem', background: '#FFFFFF' }}
                >
                  + Haute Couture Lookbook
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div className="portfolio-filters-group">
                <button
                  type="button"
                  className={`portfolio-filter-pill ${workflowFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setWorkflowFilter('all')}
                >
                  All Workflows ({workflowsList.length})
                </button>
                <button
                  type="button"
                  className={`portfolio-filter-pill ${workflowFilter === 'published' ? 'active' : ''}`}
                  onClick={() => setWorkflowFilter('published')}
                >
                  Published ({workflowsList.filter(w => w.visibility === 'published' || w.status === 'Published').length})
                </button>
                <button
                  type="button"
                  className={`portfolio-filter-pill ${workflowFilter === 'draft' ? 'active' : ''}`}
                  onClick={() => setWorkflowFilter('draft')}
                >
                  Drafts ({workflowsList.filter(w => w.visibility !== 'published' && w.status !== 'Published').length})
                </button>
              </div>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Only published workflows are visible to brands in your public profile.
              </span>
            </div>

            {/* Workflows Cards Grid */}
            {workflowsList.filter(w => {
              if (workflowFilter === 'published') return w.visibility === 'published' || w.status === 'Published';
              if (workflowFilter === 'draft') return w.visibility !== 'published' && w.status !== 'Published';
              return true;
            }).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {workflowsList
                  .filter(w => {
                    if (workflowFilter === 'published') return w.visibility === 'published' || w.status === 'Published';
                    if (workflowFilter === 'draft') return w.visibility !== 'published' && w.status !== 'Published';
                    return true;
                  })
                  .map((wf) => {
                    const isPub = wf.visibility === 'published' || wf.status === 'Published';
                    const stepCount = (wf.steps || []).length;
                    const toolsSummary = Array.from(new Set(
                      (wf.steps || []).flatMap(s => Array.isArray(s.tools) ? s.tools : String(s.tools || '').split(',').map(t => t.trim()))
                    )).filter(Boolean).slice(0, 5);

                    return (
                      <div 
                        key={wf.id}
                        className="studio-card workflow-manage-card"
                        style={{
                          background: 'var(--bg-card, #FFFFFF)',
                          border: '1px solid var(--border-light, #E2E8F0)',
                          borderRadius: '18px',
                          padding: '24px 28px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                        }}
                      >
                        {/* Top Metadata Strip */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.07em',
                              color: 'var(--accent-primary, #EB6E4B)',
                              background: 'rgba(235, 110, 75, 0.08)',
                              padding: '3px 10px',
                              borderRadius: '100px'
                            }}>
                              {wf.specialization || 'Creative Specialization'}
                            </span>

                            {/* Status indicator button / badge */}
                            <span style={{
                              fontSize: '0.74rem',
                              padding: '3px 10px',
                              borderRadius: '100px',
                              fontWeight: 600,
                              background: isPub ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                              color: isPub ? '#059669' : '#B45309',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isPub ? '#10B981' : '#F59E0B' }} />
                              <span>{isPub ? 'Published (Brand-Visible)' : 'Draft (Private to You)'}</span>
                            </span>

                            {wf.isDemo && (
                              <span style={{ fontSize: '0.7rem', color: '#64748B', background: 'rgba(100, 116, 139, 0.1)', padding: '2px 8px', borderRadius: '100px', fontWeight: 600 }}>
                                Demo Sample
                              </span>
                            )}
                          </div>

                          <span style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
                            Updated {wf.updatedAt || 'Recently'}
                          </span>
                        </div>

                        {/* Workflow Headline & Synopsis */}
                        <div>
                          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {wf.title}
                          </h3>
                          <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '820px' }}>
                            {wf.description}
                          </p>
                        </div>

                        {/* Linked Portfolio Item Banner (if linked) */}
                        {wf.linkedProjectId && (
                          <div style={{
                            padding: '10px 16px',
                            borderRadius: '10px',
                            background: 'var(--bg-card-subtle, #FAF9F6)',
                            border: '1px solid var(--border-light, #E2E8F0)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem' }}>
                              <Layers size={15} style={{ color: 'var(--accent-primary, #EB6E4B)' }} />
                              <span>
                                Associated Portfolio Case Study: <strong style={{ color: 'var(--text-primary)' }}>{wf.linkedProjectTitle || 'Case Study Project'}</strong>
                              </span>
                            </div>

                            {projectsList.find(p => p.id === wf.linkedProjectId) && (
                              <button
                                type="button"
                                className="link-subtle"
                                onClick={() => handleOpenProject(projectsList.find(p => p.id === wf.linkedProjectId))}
                                style={{ fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={13} />
                                <span>Inspect Work</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Pipeline Specs Summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'var(--bg-secondary, #FDF7ED)', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(235, 110, 75, 0.15)' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                              Pipeline Stages
                            </span>
                            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {stepCount} Ordered Production Steps
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                              AI Tools & Models
                            </span>
                            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {toolsSummary.length > 0 ? toolsSummary.join(', ') : 'Custom AI Latent Stack'}
                            </span>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                              Human Role
                            </span>
                            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                              {wf.humanInvolvementNotes ? 'Documented Artistry & Direction' : 'Stated Generative Execution'}
                            </span>
                          </div>
                        </div>

                        {/* Action Control Buttons Bar (All Functional) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-light, #E2E8F0)', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setPreviewingWorkflow(wf)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Eye size={14} />
                              <span>Preview Timeline</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleEditWorkflow(wf)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Edit3 size={14} />
                              <span>Edit Workflow</span>
                            </button>

                            <button
                              type="button"
                              className={`btn ${isPub ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                              onClick={() => handleTogglePublishWorkflow(wf.id)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              {isPub ? <Lock size={14} /> : <Globe size={14} />}
                              <span>{isPub ? 'Unpublish (Make Draft)' : 'Publish to Brands'}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            className="btn-icon-subtle"
                            onClick={() => handleDeleteWorkflow(wf.id)}
                            title="Delete this workflow"
                            style={{ color: '#EF4444', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* Empty State */
              <div className="portfolio-empty-state" style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '18px', border: '1px dashed var(--border-subtle)' }}>
                <Workflow size={48} className="empty-state-icon" style={{ color: 'var(--accent-primary, #EB6E4B)', margin: '0 auto 14px' }} />
                <h3 className="empty-state-title" style={{ fontSize: '1.45rem', marginBottom: '8px' }}>
                  Demystify your creative process.
                </h3>
                <p className="empty-state-desc" style={{ maxWidth: '540px', margin: '0 auto 20px', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                  Documenting your creative workflows proves your craft to brands, demonstrates your human-in-the-loop artistry, and speeds up commercial commissions.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-md"
                    onClick={() => handleOpenCreateWorkflow("Beauty & Skincare")}
                  >
                    <Sparkles size={16} />
                    <span>Use Skincare Campaign Template</span>
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-secondary btn-md"
                    onClick={() => handleOpenCreateWorkflow()}
                  >
                    <Plus size={16} />
                    <span>Start from Scratch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: OPPORTUNITIES
            ======================================================== */}
        {activeTab === 'opportunities' && (
          <div className="studio-opportunities-view">
            <div className="section-intro-bar">
              <div>
                <h2 className="section-title-sm">Campaign Opportunities</h2>
                <p className="section-desc-sm">Curated commercial briefs matching your Creator DNA and verified portfolio strengths.</p>
              </div>
            </div>

            <div className="opportunities-grid-view">
              {opportunitiesList.map((opp) => {
                const isSaved = savedOppIds.includes(opp.id);
                return (
                  <div key={opp.id} className="studio-card opportunity-card-item">
                    <div className="opp-header-row">
                      <div className="opp-brand-info">
                        <span className="opp-brand-name">{opp.brand}</span>
                        <h3 className="opp-campaign-title">{opp.title}</h3>
                      </div>
                      <button 
                        type="button" 
                        className={`btn-icon-bookmark ${isSaved ? 'saved' : ''}`}
                        onClick={() => handleToggleSaveOpportunity(opp.id)}
                        title={isSaved ? "Saved" : "Save opportunity"}
                      >
                        {isSaved ? <BookmarkCheck size={18} className="text-peach" /> : <Bookmark size={18} />}
                      </button>
                    </div>

                    <div className="opp-specs-chips">
                      <span className="spec-chip">
                        <DollarSign size={13} />
                        <span>{opp.budget}</span>
                      </span>
                      <span className="spec-chip">
                        <Clock size={13} />
                        <span>{opp.timeline}</span>
                      </span>
                    </div>

                    <p className="opp-direction-text">{opp.creativeDirection}</p>

                    <div className="opp-requirements-box">
                      <span className="box-mini-title">Key Deliverables:</span>
                      <ul className="req-list">
                        {(opp.requirements || []).map((req, rIdx) => (
                          <li key={rIdx}>{req}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="opp-match-fit-note">
                      <Sparkles size={14} className="text-lavender" />
                      <span>{opp.whyItFits}</span>
                    </div>

                    <div className="opp-card-actions">
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedOpportunityForModal(opp)}
                      >
                        <span>View Brief</span>
                      </button>

                      <button 
                        type="button" 
                        className={`btn ${opp.status === 'applied' ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                        onClick={() => handleOpenApplyModal(opp)}
                        disabled={opp.status === 'applied'}
                      >
                        <span>{opp.status === 'applied' ? 'Interest Expressed' : 'Apply / Express Interest'}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: INVITATIONS (Dedicated Brand Invitation System)
            ======================================================== */}
        {activeTab === 'invitations' && (
          <div className="studio-invitations-view">
            <div className="section-intro-bar">
              <div>
                <h2 className="section-title-sm">Direct Brand Invitations</h2>
                <p className="section-desc-sm">Invitations sent specifically to you by creative directors and brands ready to commission work.</p>
              </div>
            </div>

            <div className="invitations-list-container">
              {invitationsList.map((inv) => (
                <div key={inv.id} className={`studio-card invitation-item-card ${inv.status}`}>
                  <div className="inv-top-bar">
                    <div className="inv-brand-badge-wrap">
                      <img src={inv.brandAvatar} alt={inv.brand} className="inv-brand-avatar" />
                      <div>
                        <span className="inv-brand-label">{inv.brand}</span>
                        <h3 className="inv-campaign-heading">{inv.title}</h3>
                      </div>
                    </div>

                    <span className={`inv-status-pill ${inv.status}`}>
                      {inv.status === 'pending' && 'Pending Your Review'}
                      {inv.status === 'accepted' && 'Accepted & Active'}
                      {inv.status === 'declined' && 'Declined'}
                    </span>
                  </div>

                  <p className="inv-summary-quote">
                    “{inv.summary}”
                  </p>

                  <div className="inv-details-grid">
                    <div className="inv-detail-box">
                      <span className="detail-label">Agreed Budget</span>
                      <span className="detail-value">{inv.budget}</span>
                    </div>
                    <div className="inv-detail-box">
                      <span className="detail-label">Timeline & Delivery</span>
                      <span className="detail-value">{inv.timeline}</span>
                    </div>
                    <div className="inv-detail-box">
                      <span className="detail-label">Deliverables Required</span>
                      <span className="detail-value">{inv.deliverables}</span>
                    </div>
                  </div>

                  {inv.status === 'pending' && (
                    <div className="inv-actions-row">
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDeclineInvitation(inv)}
                      >
                        Decline
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary btn-sm"
                        onClick={() => setInvitationToConfirm(inv)}
                      >
                        <Check size={15} />
                        <span>Accept Invitation & Open Studio</span>
                      </button>
                    </div>
                  )}

                  {inv.status === 'accepted' && (
                    <div className="inv-accepted-footer">
                      <CheckCircle2 size={15} className="text-mint" />
                      <span>Collaboration project active in Projects tab. Direct chat enabled in Messages.</span>
                      <button 
                        type="button" 
                        className="link-subtle"
                        onClick={() => setActiveTab('projects')}
                      >
                        Go to Project →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: PROJECTS (Active Collaborations)
            ======================================================== */}
        {activeTab === 'projects' && (
          <div className="studio-projects-view">
            <div className="section-intro-bar">
              <div>
                <h2 className="section-title-sm">Active & Completed Collaborations</h2>
                <p className="section-desc-sm">Track milestones, submit deliverables, and review client feedback in one place.</p>
              </div>
            </div>

            <div className="projects-collaborations-grid">
              {projectsCollaborations.map((proj) => (
                <div key={proj.id} className="studio-card project-collab-card">
                  <div className="collab-header">
                    <div>
                      <span className="collab-brand-tag">{proj.brandName} • {proj.brandContact}</span>
                      <h3 className="collab-title">{proj.campaignTitle}</h3>
                    </div>
                    <span className={`collab-status-badge ${proj.status}`}>
                      {proj.status === 'in-progress' && 'In Progress'}
                      {proj.status === 'submitted' && 'Review in Progress'}
                      {proj.status === 'revision-requested' && 'Revision Requested'}
                      {proj.status === 'approved' && 'Approved & Paid'}
                    </span>
                  </div>

                  {/* Progress Milestone Bar */}
                  <div className="collab-milestone-section">
                    <div className="milestone-label-row">
                      <span className="milestone-name">{proj.milestone}</span>
                      <span className="milestone-percent">{proj.progressPercent}%</span>
                    </div>
                    <div className="milestone-track">
                      <div className="milestone-fill" style={{ width: `${proj.progressPercent}%` }} />
                    </div>
                  </div>

                  <div className="collab-meta-row">
                    <span><strong>Deadline:</strong> {proj.deadline}</span>
                    <span><strong>Budget:</strong> {proj.agreedBudget}</span>
                    <span><strong>Scope:</strong> {proj.deliverablesScope}</span>
                  </div>

                  {/* Revision Alert Callout */}
                  {proj.status === 'revision-requested' && (
                    <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', margin: '14px 0', fontSize: '0.86rem', color: '#B45309' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
                        <AlertCircle size={14} />
                        <span>Action Required: Brand Lead Requested Revisions</span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        {proj.latestFeedback || 'Please review requested lighting and color adjustments and resubmit deliverables.'}
                      </p>
                    </div>
                  )}

                  {/* Latest Client Feedback */}
                  {proj.status !== 'revision-requested' && proj.latestFeedback && (
                    <div className="collab-feedback-callout">
                      <MessageSquare size={14} className="text-peach" />
                      <p>{proj.latestFeedback}</p>
                    </div>
                  )}

                  {/* Action Row */}
                  <div className="collab-actions-row">
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('messages')}
                    >
                      <MessageSquare size={14} />
                      <span>Open Messages</span>
                    </button>

                    {proj.status !== 'approved' && (
                      <button 
                        type="button" 
                        className="btn btn-primary btn-sm"
                        style={proj.status === 'revision-requested' ? { background: '#D97706', borderColor: '#D97706' } : {}}
                        onClick={() => {
                          setSubmitModalProject(proj);
                          setDeliverableForm({
                            assetsUrl: proj.submissionUrl || '',
                            notes: proj.submissionNotes || '',
                            milestone: proj.milestone || 'Milestone 2 of 3'
                          });
                        }}
                      >
                        <Upload size={14} />
                        <span>{proj.status === 'revision-requested' ? 'Resubmit Revised Deliverable' : proj.status === 'submitted' ? 'Update Deliverable' : 'Submit Deliverable'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: MESSAGES
            ======================================================== */}
        {activeTab === 'messages' && (
          !currentUser ? (
            <div className="studio-messages-view" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '420px', padding: '24px 0' }}>
              <MessagesLoginWall
                initialRole="creator"
                onLoginSuccess={onLoginSuccess}
                onOpenEmailLogin={onOpenLogin}
              />
            </div>
          ) : (
          <div className="studio-messages-view">
            <div className="studio-chat-container studio-card">
              {/* Left Conversations Sidebar */}
              <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                  <h4>Collaborations ({activeConnectionsList.length})</h4>
                </div>
                <div className="chat-threads-list">
                  {activeConnectionsList.map((conn) => (
                    <button
                      key={conn.id}
                      type="button"
                      className={`chat-thread-btn ${conn.id === selectedConnectionId ? 'active' : ''}`}
                      onClick={() => setSelectedConnectionId(conn.id)}
                    >
                      <div className="thread-avatar">
                        <Briefcase size={16} />
                      </div>
                      <div className="thread-info">
                        <span className="thread-brand">{conn.brandName}</span>
                        <span className="thread-brief">{conn.campaignTitle}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Active Conversation Room */}
              <div className="chat-main-room">
                <div className="chat-room-header">
                  <div className="room-brand-meta">
                    <h4>{activeConnection?.brandName}</h4>
                    <span className="room-brief-title">{activeConnection?.campaignTitle}</span>
                  </div>
                  <span className="room-status-badge">Connected Room</span>
                </div>

                <div className="chat-messages-history">
                  {deduplicateMessages(activeConnection?.messages || []).map((msg) => (
                    <div key={msg.id} className={`chat-message-bubble ${msg.sender === 'creator' ? 'outgoing' : 'incoming'}`}>
                      <span className="bubble-sender">{msg.senderName}</span>
                      <p className="bubble-text">{msg.text}</p>
                      <span className="bubble-time">{msg.timestamp}</span>
                    </div>
                  ))}
                </div>

                {chatErrorMessage && (
                  <div style={{ padding: '8px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '0.85rem', borderRadius: '6px', margin: '0 16px 8px' }}>
                    {chatErrorMessage}
                  </div>
                )}

                <form onSubmit={handleSendChatMessage} className="chat-compose-form">
                  <textarea 
                    className="form-input chat-input" 
                    placeholder={`Message ${activeConnection?.brandName || 'partner'}... (Enter to send, Shift+Enter for newline)`}
                    value={chatInputText}
                    onChange={(e) => {
                      setChatInputText(e.target.value);
                      if (chatErrorMessage) setChatErrorMessage(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChatMessage(e);
                      }
                    }}
                    disabled={isSendingChatMessage}
                    rows={1}
                    style={{ resize: 'none', minHeight: '38px', padding: '8px 12px', fontFamily: 'inherit' }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm chat-send-btn"
                    disabled={!chatInputText.trim() || isSendingChatMessage}
                  >
                    <Send size={15} />
                    <span>{isSendingChatMessage ? 'Sending...' : 'Send'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
          )
        )}

        {/* ========================================================
            TAB 7: PROFILE & CREATOR DNA
            ======================================================== */}
        {activeTab === 'profile' && (
          <div className="studio-profile-view">
            {profileSuccessNotice && (
              <div className="notice-banner-success">
                <CheckCircle2 size={16} />
                <span>Profile changes successfully updated and published to your public creator page!</span>
              </div>
            )}

            <div className="profile-layout-grid">
              <div className="studio-card profile-form-card">
                <h3 className="card-section-title">Edit Creator Profile</h3>
                <p className="card-section-sub">Update your positioning, bio, and project availability.</p>

                <form onSubmit={handleSaveProfile} className="profile-edit-form">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Creative Identity & Positioning</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={profileForm.creativeIdentity}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, creativeIdentity: e.target.value }))}
                      placeholder="e.g. Cinematic AI Director & Visual Worldbuilder"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bio Statement</label>
                    <textarea 
                      className="form-textarea" 
                      rows={4}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Location / Timezone</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={profileForm.location}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Availability Status</label>
                      <select 
                        className="form-input"
                        value={profileForm.availability}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, availability: e.target.value }))}
                      >
                        <option value="Available for projects">Available for projects</option>
                        <option value="Booking for Q4">Booking for Q4</option>
                        <option value="Open to select opportunities">Open to select opportunities</option>
                        <option value="Currently Booked">Currently Booked</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
                    <button type="submit" className="btn btn-primary btn-md">
                      <span>Save Profile Changes</span>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-md"
                      onClick={onViewPublicProfile}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Eye size={15} />
                      <span>View Public Profile</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Creator DNA Detailed Provenance Card */}
              <div className="studio-card profile-dna-detail-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 className="card-section-title" style={{ margin: 0 }}>Creator DNA Dossier</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleRegenerateDNA}
                      disabled={isDnaAnalyzing}
                      style={{ fontSize: '0.74rem', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Sparkles size={11} style={{ color: 'var(--accent-lavender-deep)' }} />
                      <span>{isDnaAnalyzing ? 'Analyzing with AI...' : 'Regenerate DNA Insights'}</span>
                    </button>
                    <span style={{ fontSize: '0.74rem', padding: '3px 8px', borderRadius: '100px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontWeight: 600 }}>
                      {creatorDNA.completeness?.tier || 'Verified Portfolio'}
                    </span>
                  </div>
                </div>
                <p className="card-section-sub">Transparent creative fingerprint distinguishing self-reported and verified evidence.</p>

                {creatorDNA.completeness && creatorDNA.completeness.isVerified === false && (
                  <div style={{ padding: '10px 14px', background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', borderRadius: '8px', marginTop: '10px', fontSize: '0.8rem', color: '#B45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>Limited portfolio evidence detected. Upload 2+ projects with documented tools and categories to verify your visual craft.</span>
                  </div>
                )}

                <div className="dna-detailed-list" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Category 1: Portfolio-Verified Evidence */}
                  <div style={{ padding: '12px 14px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#059669' }}>Portfolio-Verified Evidence</strong>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#059669', fontWeight: 600 }}>Verified</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      • <strong>{creatorDNA.provenance.portfolioSupported.totalVerifiedProjects} real projects</strong> verified in your public portfolio.
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      • Verified formats: {creatorDNA.provenance.portfolioSupported.demonstratedFormats.join(', ')}
                    </p>
                  </div>

                  {/* Category 2: AI-Inferred Aesthetic Attributes */}
                  <div style={{ padding: '12px 14px', background: 'rgba(124, 58, 237, 0.06)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.84rem', color: 'var(--accent-lavender-deep)' }}>AI-Inferred Creative Attributes</strong>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-lavender-deep)', fontWeight: 600 }}>Synthesized</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div><strong>Visual Aesthetic:</strong> {creatorDNA.visualAesthetic}</div>
                      <div><strong>Storytelling Approach:</strong> {creatorDNA.storytellingApproach}</div>
                      <div><strong>Product Presentation:</strong> {creatorDNA.productPresentationStyle}</div>
                    </div>
                  </div>

                  {/* Category 3: Creator-Declared Information */}
                  <div style={{ padding: '12px 14px', background: 'rgba(0, 0, 0, 0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>Creator-Declared Setup</strong>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 600 }}>Self-Reported</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Tools: {creatorDNA.provenance.creatorProvided.toolsUsed.join(', ')}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Active Platforms: {creatorDNA.provenance.creatorProvided.platformsActive.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="dna-info-callout" style={{ marginTop: '16px' }}>
                  <ShieldCheck size={16} className="text-lavender" />
                  <span>No client names or private audience stats are fabricated. Your DNA evolves transparently as you add projects.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 8: TRUST CENTER
            ======================================================== */}
        {activeTab === 'trust' && (
          <TrustCenter
            creator={activeCreator}
            currentUser={currentUser}
            projects={projectsList}
            workflows={workflowsList}
            onUpdateCreator={(upd) => {
              setActiveCreator(upd);
              if (onUpdateCreator) onUpdateCreator(upd);
            }}
            onViewPublicProfile={onViewPublicProfile}
          />
        )}
      </div>

      {/* ========================================================
          MODAL: EDIT CREATOR PROFILE (From Overview or Studio)
          ======================================================== */}
      {isEditProfileModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsEditProfileModalOpen(false)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <button 
              type="button" 
              className="modal-close-btn"
              onClick={() => setIsEditProfileModalOpen(false)}
            >
              <X size={18} />
            </button>

            <div className="modal-header-block">
              <span className="section-label-pill">Creator Profile</span>
              <h2 className="modal-title font-editorial">Edit Profile</h2>
              <p className="modal-sub">Update your public positioning, bio, location, and availability for hiring brands.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="modal-form">
              {/* Avatar Preview & URL */}
              <div className="form-group">
                <label className="form-label">Profile Avatar URL</label>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <img 
                    src={profileForm.avatar || activeCreator.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"} 
                    alt="Preview"
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-light, #E2E8F0)' }}
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80";
                    }}
                  />
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="https://images.unsplash.com/..."
                    value={profileForm.avatar}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, avatar: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  placeholder="e.g. Maya Chen"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Creative Identity & Positioning</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Cinematic AI Director & Visual Worldbuilder"
                  value={profileForm.creativeIdentity}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, creativeIdentity: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bio Statement</label>
                <textarea 
                  className="form-textarea" 
                  rows={4}
                  placeholder="Directing cinematic narrative commercials, evocative brand mythologies, and cinematic product worlds..."
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Location / Timezone</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. London / New York"
                    value={profileForm.location}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Availability Status</label>
                  <select 
                    className="form-input"
                    value={profileForm.availability}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, availability: e.target.value }))}
                  >
                    <option value="Available for projects">Available for projects</option>
                    <option value="Booking for Q4">Booking for Q4</option>
                    <option value="Open to select opportunities">Open to select opportunities</option>
                    <option value="Currently Booked">Currently Booked</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsEditProfileModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD / EDIT PORTFOLIO PROJECT
          ======================================================== */}
      {isAddProjectModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddProjectModalOpen(false)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close-btn"
              onClick={() => setIsAddProjectModalOpen(false)}
            >
              <X size={18} />
            </button>

            <div className="modal-header-block">
              <span className="section-label-pill">Portfolio Project</span>
              <h2 className="modal-title">{editingProject ? 'Edit Project' : 'Add to Portfolio'}</h2>
              <p className="modal-sub">Publish high-resolution work to showcase your visual craft to brands.</p>
            </div>

            <form onSubmit={handleSaveProject} className="modal-form">
              <div className="form-group">
                <label className="form-label">Project Title *</label>
                <input 
                  type="text" 
                  className={`form-input ${projectFormErrors.title ? 'error' : ''}`}
                  placeholder="e.g. Echoes of the Solarium"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                />
                {projectFormErrors.title && <span className="error-text">{projectFormErrors.title}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Description & Creative Concept *</label>
                <textarea 
                  className={`form-textarea ${projectFormErrors.description ? 'error' : ''}`}
                  rows={3}
                  placeholder="Describe the aesthetic, lighting, and creative direction..."
                  value={projectForm.description}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                />
                {projectFormErrors.description && <span className="error-text">{projectFormErrors.description}</span>}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-input"
                    value={projectForm.category}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="Product Visuals">Product Visuals</option>
                    <option value="Fashion & Runway">Fashion & Runway</option>
                    <option value="Cinematic AI Video">Cinematic AI Video</option>
                    <option value="3D Art & Spatial">3D Art & Spatial</option>
                    <option value="Advertising Campaign">Advertising Campaign</option>
                    <option value="Social Content">Social Content</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Creative Style</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. 35mm Cinematic, Editorial"
                    value={projectForm.creativeStyle}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, creativeStyle: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Tools Used</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. Midjourney v6, Runway Gen-3"
                    value={projectForm.tools}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, tools: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Content Format</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. 4K Stills Suite, 9:16 Video"
                    value={projectForm.format}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, format: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Creator Role / Contribution</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. Generative Director & Editor"
                    value={projectForm.role}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, role: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Client or Campaign Context</label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="e.g. Heritage Luxury House"
                    value={projectForm.clientType}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, clientType: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Visibility Status</label>
                  <select 
                    className="form-input"
                    value={projectForm.visibility}
                    onChange={(e) => setProjectForm(prev => ({ ...prev, visibility: e.target.value }))}
                  >
                    <option value="published">Published (Visible to Brands on Public Profile)</option>
                    <option value="private">Private Draft (Hidden from Brands)</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '28px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    <input 
                      type="checkbox"
                      checked={projectForm.featured}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, featured: e.target.checked }))}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-lavender-deep)' }}
                    />
                    <span>Highlight as Featured Work</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Link Creative Workflow (Optional)</label>
                <select 
                  className="form-input"
                  value={projectForm.workflowId || ''}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, workflowId: e.target.value }))}
                >
                  <option value="">No linked workflow</option>
                  {workflowsList.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.title} ({w.specialization})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                  Attaches a verified production timeline to this case study.
                </span>
              </div>

              {/* Multi-Format Creative Work Uploader */}
              <div className="form-group">
                <MultiFormatUploader
                  media={projectForm.media || []}
                  creatorId={activeCreator?.id || 'creator-1'}
                  onChange={(newMedia) => {
                    const cover = newMedia.find(m => m.isCover) || newMedia[0];
                    const firstVid = newMedia.find(m => m.mediaType === 'video' || m.mimeType?.startsWith('video/'));
                    setProjectForm(prev => ({
                      ...prev,
                      media: newMedia,
                      image: cover ? cover.url : prev.image,
                      video: firstVid ? firstVid.url : prev.video
                    }));
                    if (newMedia.length > 0 && projectFormErrors.image) {
                      setProjectFormErrors(prev => ({ ...prev, image: null }));
                    }
                  }}
                />
                {projectFormErrors.image && <span className="error-text">{projectFormErrors.image}</span>}
              </div>

              {/* Dedicated AI Production Workflow for this Project */}
              <div className="form-group">
                <ProjectWorkflowEditor
                  workflowData={{
                    title: projectForm.workflowTitle || '',
                    overview: projectForm.workflowOverview || '',
                    steps: projectForm.workflowStages || []
                  }}
                  workflowStages={projectForm.workflowStages || []}
                  workflowTitle={projectForm.workflowTitle || ''}
                  workflowOverview={projectForm.workflowOverview || ''}
                  projectTitle={projectForm.title}
                  onChange={(wfData, stepsList) => setProjectForm(prev => ({
                    ...prev,
                    workflowStages: stepsList || wfData.steps || [],
                    workflowTitle: wfData.title || '',
                    workflowOverview: wfData.overview || ''
                  }))}
                />
              </div>

              <div className="modal-actions-row">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-md"
                  onClick={() => setIsAddProjectModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-md">
                  <span>{editingProject ? 'Save Changes' : 'Publish to Portfolio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SUBMIT DELIVERABLES
          ======================================================== */}
      {submitModalProject && (
        <div className="modal-backdrop" onClick={() => setSubmitModalProject(null)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close-btn"
              onClick={() => setSubmitModalProject(null)}
            >
              <X size={18} />
            </button>

            <div className="modal-header-block">
              <span className="section-label-pill">Milestone Delivery</span>
              <h2 className="modal-title">Submit Deliverables</h2>
              <p className="modal-sub">
                Deliver assets for <strong>{submitModalProject.campaignTitle}</strong> ({submitModalProject.brandName}).
              </p>
            </div>

            <form onSubmit={handleSubmitDeliverables} className="modal-form">
              <div className="form-group">
                <label className="form-label">Deliverable Master Asset URL (Cloud Storage / Drive / WeTransfer) *</label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="https://drive.google.com/... or https://wetransfer.com/..."
                  required
                  value={deliverableForm.assetsUrl}
                  onChange={(e) => setDeliverableForm(prev => ({ ...prev, assetsUrl: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Milestone Scope</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={deliverableForm.milestone}
                  onChange={(e) => setDeliverableForm(prev => ({ ...prev, milestone: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes for Creative Director</label>
                <textarea 
                  className="form-textarea" 
                  rows={3}
                  placeholder="Detail changes made, color grade passes, or resolution specs..."
                  value={deliverableForm.notes}
                  onChange={(e) => setDeliverableForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="modal-actions-row">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-md"
                  onClick={() => setSubmitModalProject(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-md">
                  <Upload size={14} />
                  <span>Submit Deliverable for Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: APPLY / EXPRESS INTEREST IN OPPORTUNITY
          ======================================================== */}
      {applyModalOpp && (
        <div className="modal-backdrop" onClick={() => setApplyModalOpp(null)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close-btn"
              onClick={() => setApplyModalOpp(null)}
            >
              <X size={18} />
            </button>

            <div className="modal-header-block">
              <span className="section-label-pill">Express Interest</span>
              <h2 className="modal-title">Apply to {applyModalOpp.brand}</h2>
              <p className="modal-sub">
                Brief: <strong>{applyModalOpp.title}</strong> • Budget: {applyModalOpp.budget}
              </p>
            </div>

            <form onSubmit={handleSendApplication} className="modal-form">
              <div className="form-group">
                <label className="form-label">Message / Creative Pitch Note</label>
                <textarea 
                  className="form-textarea" 
                  rows={4}
                  value={applyNoteText}
                  onChange={(e) => setApplyNoteText(e.target.value)}
                />
              </div>

              <div className="opp-modal-summary-box">
                <span><strong>Deliverables:</strong> {(applyModalOpp.requirements || []).join(' • ')}</span>
                <span><strong>Timeline:</strong> {applyModalOpp.timeline}</span>
              </div>

              <div className="modal-actions-row">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-md"
                  onClick={() => setApplyModalOpp(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-md">
                  <Send size={14} />
                  <span>Send Pitch Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: FULL OPPORTUNITY BRIEF
          ======================================================== */}
      {selectedOpportunityForModal && (
        <div className="modal-backdrop" onClick={() => setSelectedOpportunityForModal(null)}>
          <div className="creator-modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="modal-close-btn"
              onClick={() => setSelectedOpportunityForModal(null)}
            >
              <X size={18} />
            </button>

            <div className="modal-header-block">
              <span className="section-label-pill">{selectedOpportunityForModal.brand}</span>
              <h2 className="modal-title">{selectedOpportunityForModal.title}</h2>
              <div className="brief-chips-row">
                <span className="spec-chip">Budget: {selectedOpportunityForModal.budget}</span>
                <span className="spec-chip">Timeline: {selectedOpportunityForModal.timeline}</span>
              </div>
            </div>

            <div className="brief-content-body">
              <div className="brief-section">
                <h4>Creative Direction</h4>
                <p>{selectedOpportunityForModal.creativeDirection}</p>
              </div>

              <div className="brief-section">
                <h4>Key Deliverables</h4>
                <ul className="req-list">
                  {(selectedOpportunityForModal.requirements || []).map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>

              <div className="brief-section">
                <h4>Why CreaMatch Surfaced This</h4>
                <p>{selectedOpportunityForModal.whyItFits}</p>
              </div>
            </div>

            <div className="modal-actions-row">
              <button 
                type="button" 
                className="btn btn-secondary btn-md"
                onClick={() => setSelectedOpportunityForModal(null)}
              >
                Close
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-md"
                onClick={() => {
                  const opp = selectedOpportunityForModal;
                  setSelectedOpportunityForModal(null);
                  handleOpenApplyModal(opp);
                }}
              >
                <span>Apply to Campaign</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: INVITATION ACCEPTANCE — INFORMED CONSENT
          ======================================================== */}
      {invitationToConfirm && (
        <div className="modal-backdrop" onClick={() => setInvitationToConfirm(null)}>
          <div
            className="creator-modal-card invitation-consent-modal"
            ref={consentDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invitation-consent-title"
            aria-describedby="invitation-consent-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-btn"
              aria-label="Close confirmation dialog"
              onClick={() => setInvitationToConfirm(null)}
            >
              <X size={18} />
            </button>

            <div className="modal-header-block">
              <span className="section-label-pill">Informed Consent</span>
              <h2 className="modal-title" id="invitation-consent-title" tabIndex={-1} ref={consentInitialFocusRef}>
                Confirm collaboration terms
              </h2>
              <p className="modal-sub" id="invitation-consent-desc">
                Accepting this invitation will activate the collaboration project below under the
                following terms. Please review them carefully before confirming.
              </p>
            </div>

            <div className="invitation-consent-body">
              <div className="consent-counterparty-box">
                <span className="consent-brand-name">
                  {formatInvitationField(invitationToConfirm.brand, invitationToConfirm.brandName)}
                </span>
                <span className="consent-campaign-title">
                  {formatInvitationField(invitationToConfirm.title)}
                </span>
              </div>

              <div className="consent-terms-list">
                <div className="consent-term-row">
                  <span className="consent-term-label">Budget / Compensation</span>
                  <span className="consent-term-value">{formatInvitationField(invitationToConfirm.budget)}</span>
                </div>

                <div className="consent-term-row">
                  <span className="consent-term-label">Timeline / Delivery</span>
                  <span className="consent-term-value">{formatInvitationField(invitationToConfirm.timeline)}</span>
                </div>

                <div className="consent-term-row">
                  <span className="consent-term-label">Required Deliverables</span>
                  <span className="consent-term-value">{formatInvitationField(invitationToConfirm.deliverables)}</span>
                </div>
              </div>

              <p className="consent-review-notice">
                Once accepted, a collaboration project is created in your Projects tab. By confirming,
                you agree to deliver under the terms shown above.
              </p>
            </div>

            <div className="modal-actions-row">
              <button
                type="button"
                className="btn btn-secondary btn-md"
                onClick={() => setInvitationToConfirm(null)}
              >
                Go Back
              </button>
              <button
                type="button"
                className="btn btn-primary btn-md"
                onClick={handleConfirmInvitationAcceptance}
              >
                <Check size={15} />
                <span>Confirm Acceptance</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Editor Modal */}
      {isWorkflowEditorOpen && (
        <WorkflowEditorModal
          workflow={editingWorkflow}
          creatorId={activeCreator?.id || 'maya-chen'}
          portfolioProjects={projectsList}
          onSave={handleSaveWorkflow}
          onClose={() => {
            setIsWorkflowEditorOpen(false);
            setEditingWorkflow(null);
          }}
        />
      )}

      {/* Workflow Preview Modal */}
      {previewingWorkflow && (
        <div className="modal-overlay" onClick={() => setPreviewingWorkflow(null)} role="dialog" aria-modal="true">
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '20px', padding: '24px 32px', background: 'var(--bg-card, #FFFFFF)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-primary, #EB6E4B)', fontWeight: 700 }}>
                Workflow Preview • Brand View
              </span>
              <button 
                type="button" 
                className="modal-close-btn"
                onClick={() => setPreviewingWorkflow(null)}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <WorkflowTimeline 
              workflow={previewingWorkflow} 
              isReadOnly={true}
              onSelectProject={(projId) => {
                const p = projectsList.find(item => item.id === projId);
                if (p) handleOpenProject(p);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
