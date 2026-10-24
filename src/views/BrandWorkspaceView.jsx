// src/views/BrandWorkspaceView.jsx
// MILESTONE: BRAND STUDIO OVERHAUL — 9 COHESIVE SECTIONS, BRAND DATA ISOLATION, REAL-TIME SYNC
// 1. Overview | 2. Campaigns | 3. Discover Creators | 4. Shortlists | 5. Invitations
// 6. Collaborations | 7. Deliverables | 8. Messages | 9. Brand Profile & Settings

import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, SlidersHorizontal, Heart, Bookmark, BookmarkCheck,
  Sparkles, CheckCircle2, MessageSquare, ArrowRight, Eye, EyeOff, Send,
  Clock, DollarSign, Calendar, HelpCircle, Layers, Film, Zap,
  RotateCcw, Check, ExternalLink, ChevronRight, AlertCircle, FileText,
  Trash2, Filter, Upload, CheckCircle, Share2, Edit3, Compass,
  ChevronDown, Copy, Shield, ShieldAlert, ShieldCheck, X, Building, Globe, CheckSquare,
  CreditCard
} from 'lucide-react';

import { extractCampaignDNA } from '../intelligence/campaignDNA';
import { calculateCreaMatch } from '../intelligence/matchingEngine';
import { explainMatch } from '../intelligence/matchExplainer';
import { semanticCreatorSearch } from '../ai/semanticSearch';
import { generateCreaBrief, checkGroqStatus } from '../ai/groqClient';

import WhyThisCreatorModal from '../components/WhyThisCreatorModal';
import CreaSimModal from '../components/CreaSimModal';
import DeliverableReviewModal from '../components/DeliverableReviewModal';
import InviteModal from '../components/InviteModal';
import CreatorComparisonModal from '../components/CreatorComparisonModal';
import MessagesLoginWall from '../components/MessagesLoginWall';
import CampaignFundingModal from '../components/CampaignFundingModal';
import BrandTrustCenterView from './BrandTrustCenterView';
import DirectMessagesEmptyState from '../components/DirectMessagesEmptyState';
import { deduplicateMessages } from '../services/marketplaceBackend';

function formatBudgetDisplay(budget) {
  if (!budget) return 'In Discussion';
  if (typeof budget === 'number') {
    return `₹${budget.toLocaleString('en-IN')}`;
  }
  const str = String(budget).trim();
  if (str.startsWith('$') || str.includes('$')) {
    return str.replace(/\$/g, '₹');
  }
  if (!str.startsWith('₹') && !isNaN(Number(str.replace(/,/g, '')))) {
    return `₹${Number(str.replace(/,/g, '')).toLocaleString('en-IN')}`;
  }
  return str;
}

function formatDisplayDate(dateVal) {
  if (!dateVal) return 'Recently';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(dateVal);
  }
}


function BrandCreatorAvatarWithFallback({ avatarUrl, name, size = 52, className = '' }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const initials = useMemo(() => {
    if (!name || typeof name !== 'string') return 'CR';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'CR';
  }, [name]);

  if (!avatarUrl || hasError) {
    return (
      <div
        className={`inv-creator-avatar-fallback ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`
        }}
        aria-label={name || 'Creator'}
        title={name || 'Creator'}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={name || 'Creator'}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`
      }}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}

export default function BrandWorkspaceView({
  currentBrand = {
    id: "brand-demo-lumina",
    name: "Veda Botanics",
    handle: "@vedabotanics",
    logo: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80",
    coverImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85",
    industry: "Beauty & Skincare",
    website: "https://vedabotanics.in",
    description: "Pioneering organic cold-pressed botanicals for modern minimalist skincare rituals.",
    aesthetic: "Warm, Luminous & Organic",
    brandColors: ["#EB6E4B", "#FDF7ED", "#2E3A2F"],
    preferredPlatforms: ["Instagram", "TikTok", "Digital OOH"],
    isDemo: true
  },
  fundingRecords = [],
  allBrands = [],
  isDemoMode = true,
  onSwitchBrand,
  onCreateBrand,
  onUpdateBrand,
  onToggleDemoMode,
  onResetState,
  campaigns = [],
  activeCampaign,
  onSelectCampaign,
  onCreateCampaign,
  onUpdateCampaign,
  onDuplicateCampaign,
  onDeleteCampaign,
  applications = [],
  onAcceptApplication,
  onProposeCounterOffer,
  creators = [],
  shortlists = {},
  onToggleShortlist,
  invitations = [],
  onSendInvitation,
  projects = [],
  onRequestRevision,
  onApproveDeliverables,
  connections = [],
  onSendMessage,
  onSelectCreator,
  onRunFilteringPipeline,
  initialTab = 'overview',
  pipelineFilter = null,
  onClearPipelineFilter,
  onOpenPipelineTrace,
  onOpenTrustCenter,
  currentUser = null,
  onLoginSuccess,
  onOpenLogin,
  onNavigate,
  onExploreMarketplace
}) {
  // Navigation Tabs:
  // 'overview' | 'campaigns' | 'discover' | 'shortlists' | 'invitations' | 'collaborations' | 'deliverables' | 'messages' | 'brand-settings'
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');

  const handleNavigateToDiscover = () => {
    if (typeof onExploreMarketplace === 'function') {
      onExploreMarketplace();
    } else if (typeof onNavigate === 'function') {
      onNavigate('discover');
    } else {
      window.location.hash = 'discover';
    }
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (pipelineFilter) {
      setActiveTab('discover');
    }
  }, [pipelineFilter]);

  // Currently inspected campaign
  const inspectedCampaign = activeCampaign || campaigns[0] || null;

  // --- Brand Switcher Dropdown State ---
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isCreateBrandModalOpen, setIsCreateBrandModalOpen] = useState(false);
  const [newBrandForm, setNewBrandForm] = useState({
    name: '',
    industry: 'Beauty & Skincare',
    website: '',
    description: '',
    aesthetic: 'Clean & Minimal'
  });

  // --- Campaign Modal States ---
  const [isCampaignDetailOpen, setIsCampaignDetailOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState(null);
  const [counterOfferAppId, setCounterOfferAppId] = useState(null);
  const [counterOfferForm, setCounterOfferForm] = useState({
    proposedRate: '',
    proposedTimeline: '',
    note: ''
  });

  // --- Campaign Funding Modal State (Razorpay Test Mode) ---
  const [fundingCampaign, setFundingCampaign] = useState(null);
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);

  const handleOpenFundCampaign = (camp) => {
    setFundingCampaign(camp);
    setIsFundingModalOpen(true);
  };

  const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null); // null if creating
  const [campaignFormData, setCampaignFormData] = useState({
    title: '',
    objective: 'Product Launch',
    productOrService: '',
    industry: currentBrand?.industry || 'Beauty & Skincare',
    description: '',
    creativeStyle: 'Cinematic, Macro, Luminous',
    toneOfVoice: 'Authentic & Premium',
    deliverables: '3x 4K Master Stills, 2x 9:16 Vertical Loops',
    platforms: 'Instagram, TikTok',
    budget: '₹50,000 – ₹1,00,000',
    timeline: '3 Weeks',
    deadline: 'Nov 30, 2026',
    targetAudience: 'Aesthetic-conscious consumers',
    visibility: 'published',
    status: 'Active'
  });
  const [aiBriefPrompt, setAiBriefPrompt] = useState('');
  const [isAiBriefGenerating, setIsAiBriefGenerating] = useState(false);

  // --- Campaign Deletion Confirmation ---
  const [deletingCampaign, setDeletingCampaign] = useState(null);

  // --- External Modals ---
  const [whyModalCreator, setWhyModalCreator] = useState(null);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
  const [isCreaSimOpen, setIsCreaSimOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparisonCreatorIds, setComparisonCreatorIds] = useState(['maya-chen', 'zora-vance', 'kai-sorenson']);
  const [reviewModalProject, setReviewModalProject] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReviewModalRevisionMode, setIsReviewModalRevisionMode] = useState(false);
  const [inviteModalCreator, setInviteModalCreator] = useState(null);
  const [inviteModalInitialData, setInviteModalInitialData] = useState(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // --- Filter & Search States ---
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all'); // 'all' | 'Active' | 'Draft' | 'Paused' | 'Completed' | 'Archived'
  const [campaignSort, setCampaignSort] = useState('newest'); // 'newest' | 'budget' | 'alpha'

  const [discoverSearch, setDiscoverSearch] = useState('');
  const [discoverCategory, setDiscoverCategory] = useState('all');
  const [discoverStyle, setDiscoverStyle] = useState('all');
  const [discoverAvailability, setDiscoverAvailability] = useState('all');

  const [invitationsFilter, setInvitationsFilter] = useState('all'); // 'all' | 'pending' | 'accepted' | 'declined'
  const [deliverablesFilter, setDeliverablesFilter] = useState('all'); // 'all' | 'submitted' | 'revision-requested' | 'approved'
  const [shortlistCampaignFilter, setShortlistCampaignFilter] = useState(inspectedCampaign?.id || campaigns[0]?.id || 'all');

  // --- Messaging State ---
  const [selectedConnectionId, setSelectedConnectionId] = useState(connections[0]?.id || null);
  const [chatInputText, setChatInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendMessageError, setSendMessageError] = useState(null);

  // --- Brand Profile Settings Form ---
  const [brandProfileForm, setBrandProfileForm] = useState({
    name: currentBrand?.name || '',
    handle: currentBrand?.handle || '',
    logo: currentBrand?.logo || '',
    website: currentBrand?.website || '',
    industry: currentBrand?.industry || '',
    description: currentBrand?.description || '',
    aesthetic: currentBrand?.aesthetic || '',
    brandColors: currentBrand?.brandColors ? currentBrand.brandColors.join(', ') : '#EB6E4B, #FDF7ED, #2E3A2F',
    preferredPlatforms: currentBrand?.preferredPlatforms ? currentBrand.preferredPlatforms.join(', ') : 'Instagram, TikTok'
  });
  const [brandSaveNotice, setBrandSaveNotice] = useState(null);

  // Sync profile form when currentBrand changes
  useEffect(() => {
    if (currentBrand) {
      setBrandProfileForm({
        name: currentBrand.name || '',
        handle: currentBrand.handle || '',
        logo: currentBrand.logo || '',
        website: currentBrand.website || '',
        industry: currentBrand.industry || '',
        description: currentBrand.description || '',
        aesthetic: currentBrand.aesthetic || '',
        brandColors: currentBrand.brandColors ? currentBrand.brandColors.join(', ') : '',
        preferredPlatforms: currentBrand.preferredPlatforms ? currentBrand.preferredPlatforms.join(', ') : ''
      });
    }
  }, [currentBrand]);

  // Sync inspected campaign for shortlists if it changes
  useEffect(() => {
    if (inspectedCampaign?.id) {
      setShortlistCampaignFilter(inspectedCampaign.id);
    }
  }, [inspectedCampaign?.id]);

  // Derived real counts for overview (strictly from this brand's data!)
  const overviewMetrics = useMemo(() => {
    const activeCount = campaigns.filter(c => c.status === 'Active' || c.status === 'Active Brief').length;
    const draftCount = campaigns.filter(c => c.status === 'Draft' || c.visibility === 'draft').length;
    const pausedCount = campaigns.filter(c => c.status === 'Paused' || c.visibility === 'paused').length;
    const completedCount = campaigns.filter(c => c.status === 'Completed' || c.visibility === 'completed').length;
    const pendingInvitations = invitations.filter(inv => inv.status === 'pending').length;
    const deliverablesAwaitingReview = projects.filter(p => p.status === 'submitted').length;
    return {
      activeCount,
      draftCount,
      pausedCount,
      completedCount,
      pendingInvitations,
      deliverablesAwaitingReview
    };
  }, [campaigns, invitations, projects]);

  // Filtered campaigns for Campaigns tab
  const filteredCampaigns = useMemo(() => {
    let list = [...campaigns];

    if (campaignSearch.trim()) {
      const q = campaignSearch.toLowerCase();
      list = list.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.objective || '').toLowerCase().includes(q)
      );
    }

    if (campaignStatusFilter !== 'all') {
      list = list.filter(c => {
        if (campaignStatusFilter === 'Draft') return c.status === 'Draft' || c.visibility === 'draft';
        if (campaignStatusFilter === 'Active') return (c.status === 'Active' || c.status === 'Active Brief') && c.visibility !== 'draft' && c.visibility !== 'paused';
        if (campaignStatusFilter === 'Paused') return c.status === 'Paused' || c.visibility === 'paused';
        if (campaignStatusFilter === 'Completed') return c.status === 'Completed' || c.visibility === 'completed';
        if (campaignStatusFilter === 'Archived') return c.status === 'Archived' || c.visibility === 'archived';
        return true;
      });
    }

    if (campaignSort === 'budget') {
      list.sort((a, b) => (b.budget || '').localeCompare(a.budget || ''));
    } else if (campaignSort === 'alpha') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return list;
  }, [campaigns, campaignSearch, campaignStatusFilter, campaignSort]);

  // Discover Creators filtering
  const semanticResults = useMemo(() => {
    return semanticCreatorSearch(discoverSearch, creators);
  }, [discoverSearch, creators]);

  const filteredCreators = useMemo(() => {
    let list;

    // Campaign-specific pipeline filter: strict eligibility & preserved rank order
    if (pipelineFilter && Array.isArray(pipelineFilter.eligibleCreatorIds)) {
      const eligibleSet = new Set(pipelineFilter.eligibleCreatorIds);
      const matching = creators.filter(c => eligibleSet.has(c.id));

      if (Array.isArray(pipelineFilter.rankedOrder) && pipelineFilter.rankedOrder.length > 0) {
        const rankIndexMap = new Map();
        pipelineFilter.rankedOrder.forEach((item, idx) => {
          const id = typeof item === 'string' ? item : (item.id || item.creatorId);
          if (id) rankIndexMap.set(id, idx);
        });
        matching.sort((a, b) => {
          const rankA = rankIndexMap.has(a.id) ? rankIndexMap.get(a.id) : 9999;
          const rankB = rankIndexMap.has(b.id) ? rankIndexMap.get(b.id) : 9999;
          return rankA - rankB;
        });
      } else {
        const idOrder = new Map(pipelineFilter.eligibleCreatorIds.map((id, idx) => [id, idx]));
        matching.sort((a, b) => (idOrder.get(a.id) ?? 9999) - (idOrder.get(b.id) ?? 9999));
      }

      list = matching;
    } else {
      list = discoverSearch.trim() ? [...semanticResults.results] : [...creators];
    }

    if (pipelineFilter && discoverSearch.trim()) {
      const q = discoverSearch.toLowerCase();
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.specialty || '').toLowerCase().includes(q) ||
        (c.styles || []).some(s => s.toLowerCase().includes(q))
      );
    }

    if (discoverCategory !== 'all') {
      list = list.filter(c => {
        const catTags = c.categoryTags || [];
        const spec = (c.specialty || '').toLowerCase();
        return catTags.includes(discoverCategory) || spec.includes(discoverCategory);
      });
    }

    if (discoverStyle !== 'all') {
      list = list.filter(c => (c.styles || []).some(s => s.toLowerCase().includes(discoverStyle.toLowerCase())));
    }

    if (discoverAvailability !== 'all') {
      list = list.filter(c => (c.availability || '').toLowerCase().includes(discoverAvailability.toLowerCase()));
    }

    return list;
  }, [creators, discoverSearch, semanticResults, discoverCategory, discoverStyle, discoverAvailability, pipelineFilter]);

  // Shortlisted creators for current campaign
  const activeShortlistIds = useMemo(() => {
    if (shortlistCampaignFilter === 'all') {
      const allIds = new Set();
      Object.values(shortlists).forEach(ids => {
        if (Array.isArray(ids)) ids.forEach(id => allIds.add(id));
      });
      return Array.from(allIds);
    }
    return shortlists[shortlistCampaignFilter] || [];
  }, [shortlists, shortlistCampaignFilter]);

  const shortlistedCreatorsList = useMemo(() => {
    return creators.filter(c => activeShortlistIds.includes(c.id));
  }, [creators, activeShortlistIds]);

  // Top matched creators for active campaign in Overview
  const topOverviewMatches = useMemo(() => {
    if (!inspectedCampaign) return [];
    return creators
      .map(c => ({
        creator: c,
        match: calculateCreaMatch(inspectedCampaign, c),
        explanation: explainMatch(inspectedCampaign, c)
      }))
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 3);
  }, [creators, inspectedCampaign]);

  // Filtered Invitations
  const filteredInvitations = useMemo(() => {
    if (invitationsFilter === 'all') return invitations;
    return invitations.filter(inv => inv.status === invitationsFilter);
  }, [invitations, invitationsFilter]);

  // Filtered Deliverables
  const filteredDeliverables = useMemo(() => {
    const list = projects.filter(p => p.submissionUrl || p.status === 'submitted' || p.status === 'revision-requested' || p.status === 'approved');
    if (deliverablesFilter === 'all') return list;
    return list.filter(p => p.status === deliverablesFilter);
  }, [projects, deliverablesFilter]);

  // --- Handlers: Campaign Actions ---
  const handleOpenCreateCampaign = (initialMode = 'scratch') => {
    setEditingCampaignId(null);
    setCampaignFormData({
      title: '',
      objective: 'Product Launch',
      productOrService: '',
      industry: currentBrand?.industry || 'Beauty & Skincare',
      description: '',
      creativeStyle: currentBrand?.aesthetic || 'Cinematic, Macro, Luminous',
      toneOfVoice: 'Authentic & Premium',
      deliverables: '3x 4K Master Stills, 2x 9:16 Vertical Loops',
      platforms: currentBrand?.preferredPlatforms?.join(', ') || 'Instagram, TikTok',
      budget: '₹50,000 – ₹1,00,000',
      timeline: '3 Weeks',
      deadline: 'Nov 30, 2026',
      targetAudience: 'Aesthetic-conscious consumers',
      visibility: 'private', // Private by default
      applicationStatus: 'closed',
      isAcceptingApplications: false,
      creatorSlots: 1,
      isOpenEnded: false,
      isNegotiable: true,
      status: 'Draft'
    });
    setAiBriefPrompt('');
    setIsCreateEditModalOpen(true);
  };

  const handleOpenEditCampaign = (camp) => {
    setEditingCampaignId(camp.id);
    setCampaignFormData({
      title: camp.title || '',
      objective: camp.objective || 'Product Launch',
      productOrService: camp.productOrService || '',
      industry: camp.industry || currentBrand?.industry || 'Beauty & Skincare',
      description: camp.description || '',
      creativeStyle: camp.creativeStyle || '',
      toneOfVoice: camp.toneOfVoice || 'Authentic & Premium',
      deliverables: Array.isArray(camp.deliverables) ? camp.deliverables.join(', ') : camp.deliverables || '',
      platforms: Array.isArray(camp.platforms) ? camp.platforms.join(', ') : camp.platforms || 'Instagram',
      budget: camp.budget || '',
      timeline: camp.timeline || '',
      deadline: camp.deadline || '',
      targetAudience: camp.targetAudience || '',
      visibility: camp.visibility || 'private',
      applicationStatus: camp.applicationStatus || (camp.visibility === 'published' ? 'open' : 'closed'),
      isAcceptingApplications: camp.isAcceptingApplications ?? (camp.visibility === 'published'),
      creatorSlots: camp.creatorSlots ?? 1,
      isOpenEnded: camp.isOpenEnded ?? false,
      isNegotiable: camp.isNegotiable !== false,
      status: camp.status || 'Active'
    });
    setIsCreateEditModalOpen(true);
  };

  const handleSaveCampaignForm = (e, forcedVisibility = null) => {
    if (e) e.preventDefault();
    const vis = forcedVisibility || campaignFormData.visibility;
    const stat = vis === 'draft' || vis === 'private' ? (campaignFormData.status === 'Active' ? 'Active' : 'Draft') : 'Active';
    const isPublished = vis === 'published';

    const payload = {
      ...campaignFormData,
      visibility: vis,
      status: stat,
      isAcceptingApplications: isPublished ? (campaignFormData.applicationStatus !== 'closed') : false,
      applicationStatus: isPublished ? (campaignFormData.applicationStatus || 'open') : 'closed',
      creatorSlots: Number(campaignFormData.creatorSlots) || 1,
      deliverables: typeof campaignFormData.deliverables === 'string'
        ? campaignFormData.deliverables.split(',').map(s => s.trim()).filter(Boolean)
        : campaignFormData.deliverables,
      platforms: typeof campaignFormData.platforms === 'string'
        ? campaignFormData.platforms.split(',').map(s => s.trim()).filter(Boolean)
        : campaignFormData.platforms
    };

    if (editingCampaignId) {
      if (onUpdateCampaign) onUpdateCampaign(editingCampaignId, payload);
    } else {
      if (onCreateCampaign) onCreateCampaign(payload);
    }

    setIsCreateEditModalOpen(false);
  };

  // Run live Groq CreaBrief generation from prompt in modal
  const handleGenerateBriefWithGroq = async () => {
    if (!aiBriefPrompt.trim()) return;
    setIsAiBriefGenerating(true);
    try {
      const res = await generateCreaBrief(aiBriefPrompt);
      if (res && res.brief) {
        const b = res.brief;
        setCampaignFormData(prev => ({
          ...prev,
          title: b.title || prev.title,
          objective: b.objective || prev.objective,
          productOrService: b.productOrService || prev.productOrService,
          industry: b.industry || prev.industry,
          description: b.creativeDirection || prev.description,
          creativeStyle: b.creativeStyle || b.creativeDirection || prev.creativeStyle,
          toneOfVoice: b.desiredTone || prev.toneOfVoice,
          deliverables: b.deliverables || prev.deliverables,
          platforms: b.preferredPlatforms || prev.platforms,
          budget: b.budget || prev.budget,
          deadline: b.deadline || prev.deadline,
          targetAudience: b.targetAudience || prev.targetAudience
        }));
      }
    } catch (err) {
      console.error('[CreaBrief Error]:', err);
    } finally {
      setIsAiBriefGenerating(false);
    }
  };

  // Toggle Campaign Marketplace Publication
  const handleToggleCampaignState = (camp) => {
    if (!onUpdateCampaign) return;
    if (camp.visibility === 'published') {
      onUpdateCampaign(camp.id, {
        visibility: 'private',
        isAcceptingApplications: false,
        applicationStatus: 'closed'
      });
    } else {
      onUpdateCampaign(camp.id, {
        visibility: 'published',
        status: 'Active',
        isAcceptingApplications: true,
        applicationStatus: 'open'
      });
    }
  };

  // Toggle Application Acceptance (Open vs Closed)
  const handleToggleApplicationStatus = (camp) => {
    if (!onUpdateCampaign) return;
    const isNowOpen = camp.applicationStatus === 'closed';
    onUpdateCampaign(camp.id, {
      applicationStatus: isNowOpen ? 'open' : 'closed',
      isAcceptingApplications: isNowOpen
    });
  };

  const handleOpenDetailModal = (camp) => {
    setDetailCampaign(camp);
    setIsCampaignDetailOpen(true);
  };

  // Handle Invitation send confirmation
  const handleConfirmSendInvitation = (creator, messageText) => {
    if (!onSendInvitation || !inspectedCampaign) return;
    onSendInvitation({
      campaignId: inspectedCampaign.id,
      campaignTitle: inspectedCampaign.title,
      brandName: currentBrand?.name,
      creatorId: creator.id,
      creatorName: creator.name,
      creatorAvatar: creator.avatar,
      title: inspectedCampaign.title,
      budget: inspectedCampaign.budget ? String(inspectedCampaign.budget).replace(/\$/g, '₹') : '₹75,000',
      timeline: inspectedCampaign.timeline || inspectedCampaign.deadline || '3 Weeks',
      deliverables: Array.isArray(inspectedCampaign.deliverables) ? inspectedCampaign.deliverables.join(' • ') : inspectedCampaign.deliverables,
      summary: messageText || `Direct invitation from ${currentBrand?.name} to collaborate on ${inspectedCampaign.title}.`
    });
  };

  // Handle Send Message
  const handleSendMessageSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = chatInputText.trim();
    if (!trimmed || !selectedConnectionId || !onSendMessage || isSendingMessage) return;

    setIsSendingMessage(true);
    setSendMessageError(null);

    try {
      await onSendMessage(selectedConnectionId, {
        sender: 'brand',
        senderName: currentBrand?.name || 'Brand Partner',
        text: trimmed,
        timestamp: 'Just now'
      });
      setChatInputText('');
    } catch (err) {
      console.error('[BrandWorkspace] Send failed:', err);
      setSendMessageError(err.message || 'Failed to send message.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle Save Brand Profile
  const handleSaveBrandProfile = (e) => {
    e.preventDefault();
    if (!onUpdateBrand || !currentBrand) return;
    onUpdateBrand(currentBrand.id, {
      name: brandProfileForm.name,
      handle: brandProfileForm.handle,
      logo: brandProfileForm.logo,
      website: brandProfileForm.website,
      industry: brandProfileForm.industry,
      description: brandProfileForm.description,
      aesthetic: brandProfileForm.aesthetic,
      brandColors: brandProfileForm.brandColors.split(',').map(s => s.trim()).filter(Boolean),
      preferredPlatforms: brandProfileForm.preferredPlatforms.split(',').map(s => s.trim()).filter(Boolean)
    });
    setBrandSaveNotice('Brand profile saved successfully!');
    setTimeout(() => setBrandSaveNotice(null), 3000);
  };

  // Handle Create Brand Submission
  const handleCreateBrandSubmit = (e) => {
    e.preventDefault();
    if (!newBrandForm.name.trim() || !onCreateBrand) return;
    onCreateBrand({
      name: newBrandForm.name.trim(),
      industry: newBrandForm.industry,
      website: newBrandForm.website.trim(),
      description: newBrandForm.description.trim(),
      aesthetic: newBrandForm.aesthetic
    });
    setIsCreateBrandModalOpen(false);
    setNewBrandForm({ name: '', industry: 'Beauty & Skincare', website: '', description: '', aesthetic: 'Clean & Minimal' });
    setActiveTab('overview');
  };

  const activeConnection = connections.find(c => c.id === selectedConnectionId) || connections[0] || null;

  return (
    <div className="brand-workspace-view">
      <div className="page-container">

        {/* ========================================================
            TOP BAR: BRAND SWITCHER & WORKSPACE STATUS
            ======================================================== */}
        <div className="workspace-top-header studio-card">
          <div className="brand-switcher-wrap">
            <div
              className="brand-active-pill"
              onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
              tabIndex={0}
              role="button"
              id="brand-switcher-trigger"
            >
              <img
                src={currentBrand?.logo || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=80&q=80"}
                alt={currentBrand?.name}
                className="brand-avatar-mini"
              />
              <div className="brand-title-meta">
                <span className="brand-display-name">{currentBrand?.name || 'My Brand Workspace'}</span>
                <span className="brand-handle-text">{currentBrand?.industry || 'Creative Studio'}</span>
              </div>
              <ChevronDown size={14} className={`dropdown-chevron ${isBrandDropdownOpen ? 'open' : ''}`} />
            </div>

            {/* Demo vs Custom Badge */}
            {isDemoMode ? (
              <span className="badge-demo-mode" title="Exploring curated sample campaigns and workflows">
                <span className="live-pulse-dot mint" />
                <span>Explore Demo Mode</span>
              </span>
            ) : (
              <span className="badge-live-brand" title="Private workspace scoped strictly to this Brand ID">
                <Shield size={12} className="text-mint" />
                <span>Private Brand Workspace</span>
              </span>
            )}

            {/* Brand Switcher Dropdown */}
            {isBrandDropdownOpen && (
              <div className="brand-switcher-dropdown">
                {isDemoMode && allBrands.some(b => b.isDemo) && (
                  <>
                    <div className="dropdown-section-title">Demo Showcases</div>
                    {allBrands.filter(b => b.isDemo).map(b => (
                      <button
                        key={b.id}
                        type="button"
                        className={`dropdown-brand-item ${b.id === currentBrand?.id ? 'active' : ''}`}
                        onClick={() => {
                          if (onSwitchBrand) onSwitchBrand(b.id);
                          setIsBrandDropdownOpen(false);
                        }}
                      >
                        <img src={b.logo} alt={b.name} className="brand-item-thumb" />
                        <div className="brand-item-info">
                          <span className="brand-item-name">{b.name}</span>
                          <span className="brand-item-sub">{b.industry} • Demo</span>
                        </div>
                        {b.id === currentBrand?.id && <Check size={14} className="text-mint" />}
                      </button>
                    ))}
                    <div className="dropdown-divider" />
                  </>
                )}

                <div className="dropdown-section-title">{isDemoMode ? "Your Brands" : "Active Brand Studio"}</div>
                {allBrands.filter(b => !b.isDemo).map(b => (
                  <button
                    key={b.id}
                    type="button"
                    className={`dropdown-brand-item ${b.id === currentBrand?.id ? 'active' : ''}`}
                    onClick={() => {
                      if (onSwitchBrand) onSwitchBrand(b.id);
                      setIsBrandDropdownOpen(false);
                    }}
                  >
                    <img src={b.logo || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=80&q=80"} alt={b.name} className="brand-item-thumb" />
                    <div className="brand-item-info">
                      <span className="brand-item-name">{b.name}</span>
                      <span className="brand-item-sub">{b.industry}</span>
                    </div>
                    {b.id === currentBrand?.id && <Check size={14} className="text-mint" />}
                  </button>
                ))}

                <div className="dropdown-divider" />
                <button
                  type="button"
                  className="dropdown-action-btn"
                  onClick={() => {
                    setIsBrandDropdownOpen(false);
                    setIsCreateBrandModalOpen(true);
                  }}
                  id="create-new-brand-dropdown-btn"
                >
                  <Plus size={14} />
                  <span>Create New Brand Workspace</span>
                </button>

                {!isDemoMode && (
                  <button
                    type="button"
                    className="dropdown-action-btn secondary"
                    onClick={() => {
                      setActiveTab('brand-settings');
                      setIsBrandDropdownOpen(false);
                    }}
                  >
                    <SlidersHorizontal size={14} />
                    <span>Brand Profile & Settings</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="header-quick-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenCreateCampaign('scratch')}
              id="top-create-campaign-btn"
            >
              <Plus size={14} />
              <span>Create Campaign</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            9 COHESIVE NAVIGATION TABS
            ======================================================== */}
        <div className="workspace-subnav-bar">
          <div className="subnav-tabs-scroll">
            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
              id="tab-btn-overview"
            >
              Overview
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
              onClick={() => setActiveTab('campaigns')}
              id="tab-btn-campaigns"
            >
              Campaigns
              <span className="tab-count-pill">{campaigns.length}</span>
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'discover' ? 'active' : ''}`}
              onClick={() => setActiveTab('discover')}
              id="tab-btn-discover"
            >
              <Compass size={13} />
              <span>Discover Creators</span>
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'shortlists' ? 'active' : ''}`}
              onClick={() => setActiveTab('shortlists')}
              id="tab-btn-shortlists"
            >
              Shortlists
              {shortlistedCreatorsList.length > 0 && (
                <span className="tab-count-pill">{shortlistedCreatorsList.length}</span>
              )}
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'invitations' ? 'active' : ''}`}
              onClick={() => setActiveTab('invitations')}
              id="tab-btn-invitations"
            >
              Invitations
              {overviewMetrics.pendingInvitations > 0 && (
                <span className="tab-count-pill alert">{overviewMetrics.pendingInvitations}</span>
              )}
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'collaborations' ? 'active' : ''}`}
              onClick={() => setActiveTab('collaborations')}
              id="tab-btn-collaborations"
            >
              Collaborations
              <span className="tab-count-pill">{projects.length}</span>
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'deliverables' ? 'active' : ''}`}
              onClick={() => setActiveTab('deliverables')}
              id="tab-btn-deliverables"
            >
              Deliverables
              {overviewMetrics.deliverablesAwaitingReview > 0 && (
                <span className="tab-count-pill alert">{overviewMetrics.deliverablesAwaitingReview}</span>
              )}
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
              id="tab-btn-messages"
            >
              <MessageSquare size={13} />
              <span>Messages</span>
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'brand-settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('brand-settings')}
              id="tab-btn-settings"
            >
              Brand Profile
            </button>

            <button 
              type="button" 
              className={`workspace-tab-btn ${activeTab === 'trust' ? 'active' : ''}`}
              onClick={() => setActiveTab('trust')}
              id="tab-btn-trust"
            >
              <ShieldCheck size={13} />
              <span>Trust Centre</span>
              <span className="tab-count-pill highlight" style={{ marginLeft: '4px' }}>Verified</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            TAB 1: OVERVIEW (5 Core Questions + Real Counts)
            ======================================================== */}
        {activeTab === 'overview' && (
          <div className="studio-overview-content fade-in">

            {/* If 0 campaigns: Polish First-Visit Experience */}
            {campaigns.length === 0 ? (
              <div className="empty-first-brand-card studio-card text-center">
                <div className="empty-brand-icon-ring">
                  <Sparkles size={32} className="text-mint" />
                </div>
                <h2 className="empty-title font-editorial">
                  Welcome {currentBrand?.name || 'Brand Studio'}
                </h2>
                <p className="empty-subtext">
                  Your workspace is clean and ready. Create your first campaign brief or explore curated demo workflows to see Alloy in action.
                </p>

                <div className="first-choice-grid">
                  <div className="first-choice-box" onClick={() => handleOpenCreateCampaign('scratch')}>
                    <div className="choice-icon"><Plus size={20} /></div>
                    <h3>Create from Scratch</h3>
                    <p>Enter your deliverables, platforms, budget, and creative goals directly.</p>
                    <span className="btn btn-secondary btn-sm">Start Campaign</span>
                  </div>

                  <div 
                    className="first-choice-box highlighted" 
                    onClick={handleNavigateToDiscover}
                    id="btn-structure-brief-ai"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNavigateToDiscover();
                      }
                    }}
                  >
                    <div className="choice-icon"><Sparkles size={20} className="text-lavender" /></div>
                    <h3>Structure with Alloy Brief AI</h3>
                    <p>Write what you want in plain words. Groq AI structures deliverables and targets.</p>
                    <span className="btn btn-primary btn-sm" onClick={handleNavigateToDiscover}>Describe Brief</span>
                  </div>

                  {isDemoMode ? (
                    <div className="first-choice-box" onClick={() => onToggleDemoMode && onToggleDemoMode(true)}>
                      <div className="choice-icon"><Film size={20} /></div>
                      <h3>Explore Demo Experience</h3>
                      <p>Tour Veda Botanics and Kailash Horology sample briefs and collaborations.</p>
                      <span className="btn btn-secondary btn-sm">View Demo</span>
                    </div>
                  ) : (
                    <div className="first-choice-box" onClick={() => setActiveTab('discover')}>
                      <div className="choice-icon"><Compass size={20} className="text-mint" /></div>
                      <h3>Discover Verified Creators</h3>
                      <p>Browse top AI directors, photographers, and 3D visual artists to commission.</p>
                      <span className="btn btn-secondary btn-sm">Explore Creators</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* 1. What is happening with my campaigns? */}
                <div className="overview-question-group">
                  <div className="question-header">
                    <span className="question-number">01</span>
                    <h2 className="question-text">Campaign Status & Production Velocity</h2>
                    {isDemoMode && <span className="sample-label">Sample Data</span>}
                  </div>

                  <div className="metrics-real-grid">
                    <div className="metric-cell studio-card">
                      <span className="metric-label">Active Campaigns</span>
                      <div className="metric-number text-mint">{overviewMetrics.activeCount}</div>
                      <span className="metric-caption">Discoverable or in production</span>
                    </div>

                    <div className="metric-cell studio-card">
                      <span className="metric-label">Pending Invitations</span>
                      <div className={`metric-number ${overviewMetrics.pendingInvitations > 0 ? 'text-amber' : ''}`}>
                        {overviewMetrics.pendingInvitations}
                      </div>
                      <span className="metric-caption">Awaiting creator responses</span>
                    </div>

                    <div className="metric-cell studio-card">
                      <span className="metric-label">Deliverables to Review</span>
                      <div className={`metric-number ${overviewMetrics.deliverablesAwaitingReview > 0 ? 'text-lavender' : ''}`}>
                        {overviewMetrics.deliverablesAwaitingReview}
                      </div>
                      <span className="metric-caption">Master assets submitted</span>
                    </div>

                    <div className="metric-cell studio-card">
                      <span className="metric-label">Drafts</span>
                      <div className="metric-number">{overviewMetrics.draftCount}</div>
                      <span className="metric-caption">Unpublished concepts</span>
                    </div>

                    <div className="metric-cell studio-card">
                      <span className="metric-label">Completed</span>
                      <div className="metric-number">{overviewMetrics.completedCount}</div>
                      <span className="metric-caption">Archived & released</span>
                    </div>
                  </div>
                </div>

                {/* 2. Which campaigns need my attention? */}
                <div className="overview-question-group">
                  <div className="question-header">
                    <span className="question-number">02</span>
                    <h2 className="question-text">Campaigns Requiring Action</h2>
                  </div>

                  <div className="attention-campaigns-grid">
                    {campaigns.filter(c => c.status === 'Draft' || c.status === 'Active').length === 0 ? (
                      <div className="empty-state-card studio-card text-center" style={{ gridColumn: '1 / -1', padding: '28px 20px' }}>
                        <CheckCircle2 size={28} className="text-forest" style={{ margin: '0 auto 8px' }} />
                        <h4 style={{ margin: '0 0 4px', fontSize: '0.98rem', fontWeight: 600 }}>All campaigns are currently active or completed</h4>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>No campaigns currently require immediate publishing or status changes.</p>
                      </div>
                    ) : (
                      campaigns.filter(c => c.status === 'Draft' || c.status === 'Active').slice(0, 2).map(camp => (
                        <div key={camp.id} className="attention-card studio-card">
                          <div className="attention-meta">
                            <div className="attention-badge-row">
                              <span className={`status-pill ${camp.status.toLowerCase()}`}>{camp.status}</span>
                              <span className={`visibility-pill ${camp.visibility}`}>
                                {camp.visibility === 'published' ? 'Marketplace Live' : 'Private'}
                              </span>
                              {camp.fundedAmountRupees > 0 && (
                                <span className="camp-funded-pill">
                                  <ShieldCheck size={11} />
                                  ₹{Number(camp.fundedAmountRupees).toLocaleString('en-IN')} Funded
                                </span>
                              )}
                              <span className="badge badge-subtle" style={{ fontSize: '0.7rem' }}>
                                {camp.objective || 'Product Launch'}
                              </span>
                            </div>
                            <h3 className="attention-title">{camp.title}</h3>
                            <p className="attention-desc">{camp.description || 'No description provided.'}</p>
                            <div className="attention-meta-chips">
                              <span className="meta-chip">
                                <DollarSign size={12} className="inline-icon" />
                                {formatBudgetDisplay(camp.budget)}
                              </span>
                              <span className="meta-chip">
                                <Calendar size={12} className="inline-icon" />
                                {camp.deadline || camp.timeline || 'Flexible'}
                              </span>
                              {camp.deliverables && (
                                <span className="meta-chip">
                                  <Layers size={12} className="inline-icon" />
                                  {Array.isArray(camp.deliverables) ? camp.deliverables.slice(0, 2).join(' • ') : String(camp.deliverables).slice(0, 24)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="attention-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenDetailModal(camp)}
                              title="Inspect full campaign brief, requirements, and applications"
                            >
                              <FileText size={13} />
                              <span>Inspect Brief</span>
                            </button>
                            {camp.status === 'Draft' && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleToggleCampaignState(camp)}
                                title="Publish campaign to Creator Marketplace"
                              >
                                <Globe size={13} />
                                <span>Publish</span>
                              </button>
                            )}
                            {camp.status === 'Active' && onRunFilteringPipeline && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => onRunFilteringPipeline(camp)}
                                title="Execute Creator Filtering Pipeline"
                              >
                                <Sparkles size={13} className="text-mint" />
                                <span>Pipeline</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Which creators are worth reviewing? */}
                {topOverviewMatches.length > 0 && (
                  <div className="overview-question-group">
                    <div className="question-header">
                      <div className="title-with-pill">
                        <span className="question-number">03</span>
                        <h2 className="question-text">Recommended Creators for “{inspectedCampaign?.title}”</h2>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {onRunFilteringPipeline && inspectedCampaign && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onRunFilteringPipeline(inspectedCampaign)}
                            title="Execute backend filtering pipeline and view candidate execution trace"
                            id="run-filtering-pipeline-overview-btn"
                          >
                            <Sparkles size={13} className="text-mint" />
                            <span>Filtering Pipeline Trace</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setActiveTab('discover')}
                        >
                          <span>View All in Marketplace</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="top-matches-grid">
                      {topOverviewMatches.map(({ creator, match, explanation }) => {
                        // Extract real portfolio media asset
                        const featuredProject = Array.isArray(creator.projects) && creator.projects.length > 0
                          ? creator.projects[0]
                          : null;
                        const portfolioImage = featuredProject?.image || creator.heroWork || null;
                        const projectTitle = featuredProject?.title || null;
                        const projectFormat = featuredProject?.category || creator.specialty || null;

                        // Extract clean, authentic tags from actual creator data (deduplicated, max 3)
                        const displayTags = [];
                        if (creator.specialty) displayTags.push(creator.specialty);
                        (creator.styles || []).forEach(s => {
                          if (!displayTags.includes(s) && displayTags.length < 3) displayTags.push(s);
                        });
                        (creator.capabilities || []).forEach(c => {
                          if (!displayTags.includes(c) && displayTags.length < 3) displayTags.push(c);
                        });

                        // Grounded full match signal from real matching engine
                        const matchSignal = explanation?.summary || explanation?.topReason || explanation?.headline || null;
                        const matchHighlights = Array.isArray(explanation?.highlights) ? explanation.highlights : [];
                        const matchDimensions = explanation?.dimensions || null;

                        return (
                          <div key={creator.id} className="overview-creator-card studio-card">
                            {/* 1. Header: Avatar, Name, Specialization, Match Badge */}
                            <div className="creator-card-header">
                              <img
                                src={creator.avatar}
                                alt={creator.name}
                                className="creator-avatar"
                                onClick={() => onSelectCreator && onSelectCreator(creator.id)}
                                style={{ cursor: onSelectCreator ? 'pointer' : 'default' }}
                              />
                              <div className="creator-info">
                                <h4
                                  className="creator-name"
                                  onClick={() => onSelectCreator && onSelectCreator(creator.id)}
                                  style={{ cursor: onSelectCreator ? 'pointer' : 'default' }}
                                  title={onSelectCreator ? `View ${creator.name}'s profile` : creator.name}
                                >
                                  {creator.name}
                                </h4>
                                <span className="creator-role">{creator.specialty || creator.creativeIdentity}</span>
                              </div>
                              <div className="overview-match-badge" title={`Compatibility Score: ${match.score}% Fit`}>
                                <Sparkles size={11} className="match-badge-icon" />
                                <span>{match.score}% Fit</span>
                              </div>
                            </div>

                            {/* 2. Visual Portfolio Preview (Real assets only) */}
                            {portfolioImage && (
                              <div
                                className="overview-portfolio-preview"
                                onClick={() => onSelectCreator && onSelectCreator(creator.id)}
                                style={{ cursor: onSelectCreator ? 'pointer' : 'default' }}
                                title={projectTitle ? `Verified Work: ${projectTitle}` : 'Portfolio Preview'}
                              >
                                <img
                                  src={portfolioImage}
                                  alt={projectTitle || creator.name}
                                  className="overview-portfolio-img"
                                  loading="lazy"
                                />
                                {projectFormat && (
                                  <span className="overview-portfolio-format-badge">{projectFormat}</span>
                                )}
                                {projectTitle && (
                                  <div className="overview-portfolio-title-scrim">
                                    <span className="overview-portfolio-title-text">{projectTitle}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 3. Editorial Bio Summary (Readable 2-3 lines, no awkward truncation) */}
                            <p className="overview-creator-bio">
                              {creator.bio || creator.creativeIdentity || creator.introduction || creator.summary || 'Generative creative director specializing in AI visual production.'}
                            </p>

                            {/* 4. Verified Skill / Content Tags (Based on actual data) */}
                            {displayTags.length > 0 && (
                              <div className="overview-creator-tags">
                                {displayTags.map(tag => (
                                  <span key={tag} className="overview-creator-tag">{tag}</span>
                                ))}
                              </div>
                            )}

                            {/* 5. Full Grounded Match Signal */}
                            {(matchSignal || matchHighlights.length > 0) && (
                              <div className="overview-match-signal-block">
                                <div className="overview-match-signal-header">
                                  <div className="overview-match-signal-title">
                                    <Sparkles size={11} className="overview-match-signal-icon" />
                                    <span>Full Match Signal</span>
                                  </div>
                                  {explanation?.fitLabel && (
                                    <span className="overview-match-signal-tier">{explanation.fitLabel}</span>
                                  )}
                                </div>

                                {matchSignal && (
                                  <p className="overview-match-signal-summary">
                                    “{matchSignal}”
                                  </p>
                                )}

                                {matchHighlights.length > 0 && (
                                  <div className="overview-match-signal-highlights">
                                    {matchHighlights.slice(0, 2).map((item, idx) => (
                                      <div key={idx} className="overview-match-signal-highlight-row">
                                        <Check size={11} className="overview-match-signal-check" />
                                        <span>{item}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {matchDimensions && (
                                  <div className="overview-match-signal-dimensions">
                                    {matchDimensions.creativeStyle && (
                                      <span className="overview-match-dim-chip">
                                        <span className="dim-chip-k">Style</span>
                                        <span className="dim-chip-v">{matchDimensions.creativeStyle}</span>
                                      </span>
                                    )}
                                    {matchDimensions.portfolioRelevance && (
                                      <span className="overview-match-dim-chip">
                                        <span className="dim-chip-k">Portfolio</span>
                                        <span className="dim-chip-v">{matchDimensions.portfolioRelevance}</span>
                                      </span>
                                    )}
                                    {matchDimensions.contentFormat && (
                                      <span className="overview-match-dim-chip">
                                        <span className="dim-chip-k">Format</span>
                                        <span className="dim-chip-v">{matchDimensions.contentFormat}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 6. Action Footer: Why Fit (Secondary) & Invite (Primary) */}
                            <div className="creator-card-actions">
                              <button
                                type="button"
                                className="btn btn-overview-why"
                                onClick={() => {
                                  setWhyModalCreator(creator);
                                  setIsWhyModalOpen(true);
                                }}
                                title="Open algorithmic match compatibility breakdown"
                              >
                                <HelpCircle size={13} />
                                <span>Why Fit</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-overview-invite"
                                onClick={() => {
                                  setInviteModalCreator(creator);
                                  setIsInviteModalOpen(true);
                                }}
                                title={`Send campaign invitation to ${creator.name}`}
                              >
                                <Send size={13} />
                                <span>Invite</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Which invitations require action? */}
                {invitations.length > 0 && (
                  <div className="overview-question-group">
                    <div className="question-header">
                      <span className="question-number">04</span>
                      <h2 className="question-text">Recent Sent Invitations</h2>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setActiveTab('invitations')}
                      >
                        <span>View All ({invitations.length})</span>
                      </button>
                    </div>

                    <div className="overview-invitations-list studio-card">
                      {invitations.slice(0, 3).map(inv => (
                        <div key={inv.id} className="invitation-mini-row">
                          <img src={inv.creatorAvatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80"} alt={inv.creatorName} className="inv-mini-avatar" />
                          <div className="inv-mini-details">
                            <span className="inv-mini-creator">{inv.creatorName}</span>
                            <span className="inv-mini-campaign">Campaign: {inv.campaignTitle || inv.title}</span>
                          </div>
                          <div className="inv-mini-status">
                            <span className={`status-pill ${inv.status}`}>{inv.status}</span>
                            <span className="inv-mini-time">{inv.createdAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Which collaborations have pending deliverables? */}
                {projects.some(p => p.status === 'submitted') && (
                  <div className="overview-question-group">
                    <div className="question-header">
                      <span className="question-number">05</span>
                      <h2 className="question-text">Pending Deliverable Sign-Offs</h2>
                    </div>

                    <div className="pending-deliverables-banner studio-card">
                      <div className="banner-icon-box">
                        <AlertCircle size={24} className="text-lavender" />
                      </div>
                      <div className="banner-details">
                        <h3>Creator Submissions Waiting for Review</h3>
                        <p>You have {overviewMetrics.deliverablesAwaitingReview} deliverable package submitted by creative partners ready for master evaluation.</p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setActiveTab('deliverables')}
                      >
                        <span>Open Deliverables Queue</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: CAMPAIGNS (Management & CRUD)
            ======================================================== */}
        {activeTab === 'campaigns' && (
          <div className="studio-campaigns-content fade-in">
            {/* Top Toolbar */}
            <div className="campaigns-toolbar studio-card">
              <div className="toolbar-search-wrap">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search campaigns by name, objective, or brief…"
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="search-input-field"
                  id="campaign-search-input"
                />
              </div>

              <div className="toolbar-filter-tabs">
                {['all', 'Active', 'Draft', 'Paused', 'Completed'].map(st => (
                  <button
                    key={st}
                    type="button"
                    className={`filter-pill-btn ${campaignStatusFilter === st ? 'active' : ''}`}
                    onClick={() => setCampaignStatusFilter(st)}
                  >
                    {st === 'all' ? 'All Campaigns' : st}
                  </button>
                ))}
              </div>

              <div className="toolbar-actions-right">
                <select
                  className="sort-select"
                  value={campaignSort}
                  onChange={(e) => setCampaignSort(e.target.value)}
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="budget">Sort: Budget</option>
                  <option value="alpha">Sort: Title (A-Z)</option>
                </select>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpenCreateCampaign('scratch')}
                  id="new-campaign-btn-tab"
                >
                  <Plus size={14} />
                  <span>Create Campaign</span>
                </button>
              </div>
            </div>

            {/* Campaign Cards Grid */}
            {filteredCampaigns.length === 0 ? (
              <div className="empty-state-card studio-card text-center">
                <FileText size={32} className="text-tertiary" />
                <h3>No campaigns found</h3>
                <p>No campaigns match your current filters. Create a new campaign or clear your search.</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setCampaignSearch(''); setCampaignStatusFilter('all'); }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="campaigns-cards-grid">
                {filteredCampaigns.map(camp => (
                  <div key={camp.id} className="campaign-manage-card studio-card">
                    <div className="camp-card-cover-wrap">
                      <img
                        src={camp.coverImage || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80"}
                        alt={camp.title}
                        className="camp-card-cover"
                        loading="lazy"
                      />
                      <div className="camp-card-cover-overlay" />
                      <div className="camp-card-badges">
                        <span className={`status-pill ${camp.status ? camp.status.toLowerCase() : 'draft'}`}>
                          {camp.status || 'Draft'}
                        </span>
                        <span className={`visibility-pill ${camp.visibility || 'private'}`}>
                          {camp.visibility === 'published' ? 'Marketplace Live' : 'Private'}
                        </span>
                        {camp.fundedAmountRupees > 0 && (
                          <span className="camp-funded-pill">
                            <ShieldCheck size={11} />
                            ₹{Number(camp.fundedAmountRupees).toLocaleString('en-IN')} Funded
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="camp-card-body">
                      <span className="camp-card-objective">{camp.objective || 'Product Launch'}</span>
                      <h3 className="camp-card-title">{camp.title}</h3>
                      <p className="camp-card-desc">{camp.description || 'No description provided.'}</p>

                      <div className="camp-card-divider" />

                      <div className="camp-card-metadata-grid">
                        {/* Deliverables: Full-width row */}
                        <div className="camp-meta-cell camp-meta-full">
                          <span className="camp-meta-label">
                            <Layers size={12} className="camp-meta-icon" />
                            Deliverables
                          </span>
                          <span className="camp-meta-value">
                            {Array.isArray(camp.deliverables)
                              ? (camp.deliverables.length > 0 ? camp.deliverables.join(' • ') : 'Not specified')
                              : (camp.deliverables || 'Not specified')}
                          </span>
                        </div>

                        {/* Budget: Column 1 */}
                        <div className="camp-meta-cell">
                          <span className="camp-meta-label">
                            <DollarSign size={12} className="camp-meta-icon" />
                            Budget
                          </span>
                          <span className="camp-meta-value camp-meta-budget-val">
                            {formatBudgetDisplay(camp.budget)}
                          </span>
                        </div>

                        {/* Deadline: Column 2 */}
                        <div className="camp-meta-cell">
                          <span className="camp-meta-label">
                            <Calendar size={12} className="camp-meta-icon" />
                            Deadline
                          </span>
                          <span className="camp-meta-value">
                            {camp.deadline || camp.timeline || 'Flexible'}
                          </span>
                        </div>

                        {/* Platforms: Full-width row */}
                        <div className="camp-meta-cell camp-meta-full">
                          <span className="camp-meta-label">
                            <Globe size={12} className="camp-meta-icon" />
                            Platforms
                          </span>
                          <span className="camp-meta-value">
                            {Array.isArray(camp.platforms)
                              ? (camp.platforms.length > 0 ? camp.platforms.join(', ') : 'Instagram')
                              : (camp.platforms || 'Instagram')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="camp-card-footer">
                      <div className="camp-card-footer-top">
                        <span className="camp-card-updated">
                          <Clock size={11} className="camp-updated-icon" />
                          Updated {formatDisplayDate(camp.updatedAt || camp.createdAt)}
                        </span>
                      </div>

                      <div className="camp-card-actions-wrapper">
                        {/* Primary action row: Fund & Pipeline */}
                        <div className="camp-actions-primary-row">
                          <button
                            type="button"
                            className="btn btn-camp-primary btn-fund-action"
                            onClick={() => handleOpenFundCampaign(camp)}
                            title="Fund Campaign with Razorpay"
                            id={`fund-camp-btn-${camp.id}`}
                          >
                            <CreditCard size={13} />
                            <span>Fund</span>
                          </button>
                          {onRunFilteringPipeline && (
                            <button
                              type="button"
                              className="btn btn-camp-primary btn-pipeline-action"
                              onClick={() => onRunFilteringPipeline(camp)}
                              title="Execute Creator Filtering Pipeline"
                            >
                              <Sparkles size={13} className="text-mint" />
                              <span>Pipeline</span>
                            </button>
                          )}
                        </div>

                        {/* Secondary action row: View/Edit + Duplicate/Delete */}
                        <div className="camp-actions-secondary-row">
                          <div className="camp-actions-main-secondary">
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs camp-sub-btn"
                              onClick={() => handleOpenDetailModal(camp)}
                              title="Inspect Campaign Brief & Proposals"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs camp-sub-btn"
                              onClick={() => handleOpenEditCampaign(camp)}
                              title="Edit Campaign Brief"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>
                          </div>

                          <div className="camp-actions-utility-group">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs camp-icon-btn"
                              onClick={() => onDuplicateCampaign && onDuplicateCampaign(camp.id)}
                              title="Duplicate Campaign"
                              aria-label="Duplicate Campaign"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs camp-icon-btn text-danger"
                              onClick={() => setDeletingCampaign(camp)}
                              title="Delete Campaign"
                              aria-label="Delete Campaign"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: DISCOVER CREATORS (Connected Marketplace)
            ======================================================== */}
        {activeTab === 'discover' && (
          <div className="studio-discover-content fade-in">
            {/* Pipeline Filter Active Banner */}
            {pipelineFilter && (
              <div className="pipeline-filter-banner studio-card">
                <div className="filter-banner-content">
                  <div className="filter-banner-icon">
                    <Sparkles size={20} className="text-mint" />
                  </div>
                  <div className="filter-banner-text">
                    <div className="filter-banner-heading">
                      <strong>Filtered for Campaign:</strong> {pipelineFilter.campaignTitle || 'Campaign'}
                      {pipelineFilter.isStale && (
                        <span className="badge-stale" style={{ marginLeft: 8, background: 'rgba(235, 110, 75, 0.2)', color: '#eb6e4b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Brief Updated (Stale)
                        </span>
                      )}
                    </div>
                    <div className="filter-banner-sub">
                      Showing {filteredCreators.length} eligible creator{filteredCreators.length === 1 ? '' : 's'} matching mandatory pipeline requirements. Excluded candidates are filtered out.
                    </div>
                  </div>
                </div>
                <div className="filter-banner-actions">
                  {onOpenPipelineTrace && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onOpenPipelineTrace(pipelineFilter.campaignId)}
                    >
                      <Layers size={13} />
                      <span>View Pipeline Trace</span>
                    </button>
                  )}
                  {onClearPipelineFilter && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={onClearPipelineFilter}
                      title="Clear campaign filter and view all creators"
                    >
                      <X size={14} />
                      <span>Clear Filter</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="discover-toolbar studio-card">
              <div className="toolbar-search-wrap">
                <Search size={15} className="search-icon" />
                <input
                  type="text"
                  placeholder="Semantic search: 'liquid caustics', 'luxury 3D watch', '35mm grain'…"
                  value={discoverSearch}
                  onChange={(e) => setDiscoverSearch(e.target.value)}
                  className="search-input-field"
                />
              </div>

              <div className="toolbar-filter-tabs">
                {['all', 'Product Visuals', 'Beauty & Cosmetics', 'Fashion', 'Automotive', '3D Motion'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`filter-pill-btn ${discoverCategory === cat ? 'active' : ''}`}
                    onClick={() => setDiscoverCategory(cat)}
                  >
                    {cat === 'all' ? 'All Specialties' : cat}
                  </button>
                ))}

                <button
                  type="button"
                  className="filter-pill-btn"
                  onClick={() => setActiveTab('trust')}
                  style={{ 
                    marginLeft: 'auto', 
                    background: 'rgba(5, 150, 105, 0.08)', 
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    color: '#065F46',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Review Brand Trust and Verification Status"
                >
                  <ShieldCheck size={12} color="#059669" />
                  <span>Brand Trust Centre</span>
                </button>
              </div>
            </div>

            {/* Creators Grid / Empty State */}
            {filteredCreators.length === 0 ? (
              <div className="empty-state-card studio-card text-center" style={{ padding: '48px 24px', margin: '20px 0' }}>
                <AlertCircle size={36} className="text-tertiary" style={{ margin: '0 auto 12px' }} />
                <h3>{pipelineFilter ? 'No eligible creators match this campaign' : 'No creators found'}</h3>
                <p style={{ maxWidth: 480, margin: '0 auto 16px', color: 'var(--text-secondary)' }}>
                  {pipelineFilter
                    ? `None of the candidate creators met all mandatory eligibility requirements for ${pipelineFilter.campaignTitle || 'this campaign'}. Review the campaign brief or relax mandatory criteria.`
                    : 'No creators match your current search or filter criteria. Try adjusting your search query or specialty filters.'
                  }
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {pipelineFilter && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setActiveTab('campaigns');
                        const camp = campaigns.find(c => c.id === pipelineFilter.campaignId);
                        if (camp) handleOpenEditCampaign(camp);
                      }}
                    >
                      <Edit3 size={13} />
                      <span>Review Campaign Brief</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      if (onClearPipelineFilter) onClearPipelineFilter();
                      setDiscoverSearch('');
                      setDiscoverCategory('all');
                      setDiscoverStyle('all');
                      setDiscoverAvailability('all');
                    }}
                  >
                    <span>{pipelineFilter ? 'Clear Filter (View All Creators)' : 'Reset Filters'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="creators-marketplace-grid">
                {filteredCreators.map(creator => {
                  const isShortlisted = activeShortlistIds.includes(creator.id);
                  const matchData = inspectedCampaign ? calculateCreaMatch(inspectedCampaign, creator) : null;

                  return (
                    <div key={creator.id} className="creator-market-card studio-card">
                      <div className="market-card-header">
                        <img src={creator.avatar} alt={creator.name} className="market-creator-avatar" />
                        <div className="market-creator-meta">
                          <h3 className="market-creator-name">{creator.name}</h3>
                          <span className="market-creator-role">{creator.specialty || creator.creativeIdentity}</span>
                          <span className="market-creator-loc">{creator.location}</span>
                        </div>

                        {matchData && (
                          <div className="market-fit-badge">
                            <Sparkles size={11} className="text-mint" />
                            <span>{matchData.score}%</span>
                          </div>
                        )}
                      </div>

                      {/* Work Preview Image */}
                      <div className="market-preview-image-wrap">
                        <img
                          src={creator.heroWork || creator.projects?.[0]?.image || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80"}
                          alt={creator.name}
                          className="market-preview-img"
                        />
                      </div>

                      <p className="market-creator-bio">
                        {creator.bio || creator.introduction || creator.summary || creator.tagline || 'No introduction provided yet.'}
                      </p>

                      <div className="market-card-tags">
                        {(creator.styles || []).slice(0, 3).map((st, i) => (
                          <span key={i} className="market-style-tag">{st}</span>
                        ))}
                      </div>

                      <div className="market-card-actions">
                        <button
                          type="button"
                          className={`btn btn-xs ${isShortlisted ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => {
                            if (inspectedCampaign && onToggleShortlist) {
                              onToggleShortlist(inspectedCampaign.id, creator.id);
                            }
                          }}
                        >
                          <Bookmark size={12} />
                          <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-xs"
                          onClick={() => {
                            setWhyModalCreator(creator);
                            setIsWhyModalOpen(true);
                          }}
                        >
                          <span>Why Fit</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => {
                            setInviteModalCreator(creator);
                            setIsInviteModalOpen(true);
                          }}
                        >
                          <Send size={12} />
                          <span>Invite</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => onSelectCreator && onSelectCreator(creator.id)}
                        >
                          <span>Profile</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: SHORTLISTS (Brand-Scoped)
            ======================================================== */}
        {activeTab === 'shortlists' && (
          <div className="studio-shortlists-content fade-in">
            <div className="shortlists-header-bar studio-card">
              <div className="header-text-group">
                <h2>Campaign Shortlists</h2>
                <p>Saved creators ready for immediate invitation and commission.</p>
              </div>

              {campaigns.length > 0 && (
                <div className="shortlist-camp-select-wrap">
                  <span className="select-lbl">For Campaign:</span>
                  <select
                    className="camp-select-dropdown"
                    value={shortlistCampaignFilter}
                    onChange={(e) => setShortlistCampaignFilter(e.target.value)}
                  >
                    <option value="all">All Campaigns ({activeShortlistIds.length})</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {shortlistedCreatorsList.length === 0 ? (
              <div className="empty-state-card studio-card text-center">
                <Bookmark size={32} className="text-tertiary" />
                <h3>No creators shortlisted</h3>
                <p>You haven’t saved any creators to this shortlist yet.</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveTab('discover')}
                >
                  <Compass size={14} />
                  <span>Discover Creators</span>
                </button>
              </div>
            ) : (
              <div className="creators-marketplace-grid">
                {shortlistedCreatorsList.map(creator => (
                  <div key={creator.id} className="creator-market-card studio-card">
                    <div className="market-card-header">
                      <img src={creator.avatar} alt={creator.name} className="market-creator-avatar" />
                      <div className="market-creator-meta">
                        <h3 className="market-creator-name">{creator.name}</h3>
                        <span className="market-creator-role">{creator.specialty || creator.creativeIdentity}</span>
                      </div>
                    </div>

                    <div className="market-preview-image-wrap">
                      <img
                        src={creator.heroWork || creator.projects?.[0]?.image}
                        alt={creator.name}
                        className="market-preview-img"
                      />
                    </div>

                    <div className="market-card-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => {
                          setInviteModalCreator(creator);
                          setIsInviteModalOpen(true);
                        }}
                      >
                        <Send size={12} />
                        <span>Send Invitation</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-danger"
                        onClick={() => {
                          const targetCampId = shortlistCampaignFilter === 'all' ? (inspectedCampaign?.id || campaigns[0]?.id) : shortlistCampaignFilter;
                          if (targetCampId && onToggleShortlist) {
                            onToggleShortlist(targetCampId, creator.id);
                          }
                        }}
                      >
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 5: INVITATIONS (Brand-Scoped)
            ======================================================== */}
        {activeTab === 'invitations' && (
          <div className="studio-invitations-content fade-in">
            <div className="invitations-toolbar studio-card">
              <div className="toolbar-filter-tabs">
                {['all', 'pending', 'accepted', 'declined'].map(st => (
                  <button
                    key={st}
                    type="button"
                    className={`filter-pill-btn ${invitationsFilter === st ? 'active' : ''}`}
                    onClick={() => setInvitationsFilter(st)}
                  >
                    {st === 'all' ? 'All Invitations' : st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {filteredInvitations.length === 0 ? (
              <div className="empty-state-card studio-card text-center">
                <Send size={32} className="text-tertiary" />
                <h3>No invitations found</h3>
                <p>You haven’t sent any invitations matching this filter.</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setActiveTab('discover')}
                >
                  Find Creators to Invite
                </button>
              </div>
            ) : (
              <div className="invitations-list-stack">
                {filteredInvitations.map(inv => {
                  const matchedCamp = (campaigns || []).find(c => c.id === (inv.campaignId || inv.campaign_id));
                  const title = inv.campaignTitle || inv.title || matchedCamp?.title || 'Creative Campaign';
                  const budget = formatBudgetDisplay(inv.budget || matchedCamp?.budget);
                  const timeline = inv.timeline || matchedCamp?.timeline || 'Standard Timeline';
                  const deadline = inv.deadline || matchedCamp?.deadline;
                  const deliverables = inv.deliverables || (Array.isArray(matchedCamp?.deliverables) ? matchedCamp.deliverables.join(' • ') : matchedCamp?.deliverables) || 'Campaign Deliverables';
                  const summary = inv.summary || inv.message || `Direct invitation sent for "${title}".`;

                  return (
                    <div key={inv.id} className="invitation-card studio-card">
                      <div className="inv-card-left">
                        <BrandCreatorAvatarWithFallback
                          avatarUrl={inv.creatorAvatar}
                          name={inv.creatorName}
                          size={52}
                          className="inv-avatar-large"
                        />
                        <div className="inv-info-block">
                          <div className="inv-header-meta">
                            <h3 className="inv-creator-title">{inv.creatorName || 'Invited Creator'}</h3>
                            <span className={`status-pill ${inv.status}`}>{inv.status}</span>
                          </div>
                          <span className="inv-campaign-link">Campaign: <strong>{title}</strong></span>
                          {summary && <p className="inv-summary-quote">“{summary}”</p>}

                          <div className="inv-terms-row">
                            <span className="inv-term-budget"><strong>Budget:</strong> {budget}</span>
                            <span>•</span>
                            <span><strong>Timeline:</strong> {timeline}</span>
                            {deadline && (
                              <>
                                <span>•</span>
                                <span><strong>Deadline:</strong> {deadline}</span>
                              </>
                            )}
                            <span>•</span>
                            <span><strong>Deliverables:</strong> {typeof deliverables === 'string' ? deliverables : deliverables.join(' • ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="inv-card-actions">
                        <span className="inv-time-text">{inv.createdAt || 'Recently'}</span>
                        {inv.status === 'accepted' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setActiveTab('collaborations')}
                          >
                            <span>Open Project</span>
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 6: COLLABORATIONS (Active Production Projects)
            ======================================================== */}
        {activeTab === 'collaborations' && (
          <div className="studio-collabs-content fade-in">
            <div className="collabs-header studio-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2>Active Collaborations & Project Milestones</h2>
                <p>Track production progress, evaluate drafts, and approve master passes.</p>
              </div>
              <span className="badge badge-subtle" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                {projects.length} Active Production Workspace{projects.length === 1 ? '' : 's'}
              </span>
            </div>

            {projects.length === 0 ? (
              <div className="empty-state-card studio-card text-center" style={{ padding: '48px 24px', maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-secondary, #EEE7DE)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--accent-bronze, #99714F)' }}>
                  <Layers size={28} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  No Active Collaborations in Progress
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                  When creators accept your campaign invitations or when you accept creator proposals, dedicated collaboration workspaces with live milestones will appear here.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveTab('campaigns')}>
                    <span>Review Campaigns</span>
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setActiveTab('discover')}>
                    <Compass size={14} />
                    <span>Discover Creators</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="collabs-grid">
                {projects.map(proj => {
                  const statusLabel = proj.status === 'submitted' ? 'Needs Review' :
                                      proj.status === 'revision-requested' ? 'In Revision' :
                                      proj.status === 'approved' ? 'Completed' : 'In Production';
                  const statusClass = proj.status === 'submitted' ? 'alert' :
                                      proj.status === 'approved' ? 'active' :
                                      proj.status === 'revision-requested' ? 'paused' : 'active';
                  return (
                    <div key={proj.id} className="project-collab-card studio-card">
                      <div className="proj-header-row">
                        <div className="proj-creator-block">
                          <BrandCreatorAvatarWithFallback
                            avatarUrl={proj.creatorAvatar}
                            name={proj.creatorName}
                            size={44}
                            className="proj-creator-thumb"
                          />
                          <div>
                            <span className="proj-creator-role">Creative Partner</span>
                            <h4 style={{ margin: '2px 0 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {proj.creatorName}
                            </h4>
                            <span className="proj-creator-name" style={{ color: 'var(--accent-bronze)', fontSize: '0.78rem', fontWeight: 600 }}>
                              {proj.campaignTitle}
                            </span>
                          </div>
                        </div>
                        <span className={`status-pill ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className="proj-progress-section">
                        <div className="progress-labels">
                          <span className="progress-milestone-text">
                            <strong>Milestone:</strong> {proj.milestone}
                          </span>
                          <span className="progress-percent">{proj.progressPercent}%</span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${proj.progressPercent}%`,
                              background: proj.progressPercent === 100 ? '#10B981' : 'linear-gradient(90deg, #99714F 0%, #C7A47B 100%)'
                            }}
                          />
                        </div>
                      </div>

                      <div className="proj-meta-grid">
                        <div className="proj-meta-item">
                          <span className="proj-meta-lbl"><DollarSign size={11} /> Budget</span>
                          <span className="proj-meta-val">{proj.agreedBudget}</span>
                        </div>
                        <div className="proj-meta-item">
                          <span className="proj-meta-lbl"><Calendar size={11} /> Deadline</span>
                          <span className="proj-meta-val">{proj.deadline}</span>
                        </div>
                        <div className="proj-meta-item">
                          <span className="proj-meta-lbl"><Layers size={11} /> Scope</span>
                          <span className="proj-meta-val" title={proj.deliverablesScope}>{proj.deliverablesScope}</span>
                        </div>
                      </div>

                      {proj.latestFeedback && (
                        <div className="proj-feedback-callout">
                          <p style={{ margin: 0 }}>“{proj.latestFeedback}”</p>
                        </div>
                      )}

                      <div className="proj-actions-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 'auto' }}>
                        {proj.status === 'submitted' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setSelectedConnectionId(connections.find(c => c.creatorId === proj.creatorId)?.id || connections[0]?.id);
                                setActiveTab('messages');
                              }}
                              title="Message creator in workspace chat"
                            >
                              <MessageSquare size={13} />
                              <span>Message</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setReviewModalProject(proj);
                                setIsReviewModalOpen(true);
                              }}
                              title="Review creative submission files and provide feedback"
                            >
                              <Eye size={13} />
                              <span>Review Submission</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedConnectionId(connections.find(c => c.creatorId === proj.creatorId)?.id || connections[0]?.id);
                              setActiveTab('messages');
                            }}
                            title="Message creator in workspace chat"
                          >
                            <MessageSquare size={13} />
                            <span>Message Creator</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 7: DELIVERABLES (Dedicated Review Queue)
            ======================================================== */}
        {activeTab === 'deliverables' && (
          <div className="studio-deliverables-content fade-in">
            <div className="deliverables-toolbar studio-card">
              <div className="toolbar-filter-tabs">
                {[
                  { id: 'all', label: 'All Deliverables', count: projects.length },
                  { id: 'submitted', label: 'Needs Review', count: projects.filter(p => p.status === 'submitted').length },
                  { id: 'revision-requested', label: 'In Revision', count: projects.filter(p => p.status === 'revision-requested').length },
                  { id: 'approved', label: 'Approved', count: projects.filter(p => p.status === 'approved').length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`filter-pill-btn ${deliverablesFilter === tab.id ? 'active' : ''}`}
                    onClick={() => setDeliverablesFilter(tab.id)}
                  >
                    <span>{tab.label}</span>
                    <span className="badge badge-subtle" style={{ fontSize: '0.68rem', padding: '2px 6px', marginLeft: '6px' }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {filteredDeliverables.length === 0 ? (
              <div className="empty-state-card studio-card text-center" style={{ padding: '48px 24px', maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-secondary, #EEE7DE)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--accent-bronze, #99714F)' }}>
                  <CheckCircle2 size={28} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
                  {deliverablesFilter === 'all' ? 'No Deliverables in Production' :
                   deliverablesFilter === 'submitted' ? 'No Deliverables Awaiting Review' :
                   deliverablesFilter === 'revision-requested' ? 'No Deliverables in Revision' :
                   'No Approved Deliverables Yet'}
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
                  {deliverablesFilter === 'submitted'
                    ? 'All current creator submissions have been reviewed and addressed.'
                    : 'When creators upload master deliverables, video reels, and still assets, they will appear here for evaluation.'}
                </p>
                {deliverablesFilter !== 'all' && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDeliverablesFilter('all')}>
                    <span>Show All Deliverables</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="deliverables-queue-stack">
                {filteredDeliverables.map(proj => {
                  const statusLabel = proj.status === 'submitted' ? 'Needs Review' :
                                      proj.status === 'revision-requested' ? 'In Revision' :
                                      proj.status === 'approved' ? 'Approved & Released' : proj.status;
                  const statusClass = proj.status === 'submitted' ? 'alert' :
                                      proj.status === 'approved' ? 'active' : 'paused';
                  return (
                    <div key={proj.id} className="deliverable-card studio-card">
                      <div className="deliverable-card-header">
                        <div>
                          <span className="deliverable-campaign-tag">
                            <FileText size={11} />
                            {proj.campaignTitle}
                          </span>
                          <h3 className="deliverable-milestone">{proj.milestone}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <BrandCreatorAvatarWithFallback
                              avatarUrl={proj.creatorAvatar}
                              name={proj.creatorName}
                              size={24}
                            />
                            <span className="deliverable-creator" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              Submitted by <strong>{proj.creatorName}</strong> • Target: {proj.deadline}
                            </span>
                          </div>
                        </div>
                        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                      </div>

                      {proj.submissionNotes && (
                        <div className="submission-notes-box">
                          <strong style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-bronze)', display: 'block', marginBottom: '4px' }}>
                            Creator Notes & Context
                          </strong>
                          <p style={{ margin: 0 }}>{proj.submissionNotes}</p>
                        </div>
                      )}

                      {/* Previews Strip */}
                      {proj.submissionPreviews && proj.submissionPreviews.length > 0 && (
                        <div className="submission-previews-strip">
                          {proj.submissionPreviews.map((img, i) => (
                            <div key={i} className="preview-thumb-wrap">
                              <img src={img} alt={`Preview ${i + 1}`} className="preview-thumb-img" />
                            </div>
                          ))}
                        </div>
                      )}

                      {proj.submissionUrl && (
                        <div className="master-link-row">
                          <ExternalLink size={14} className="text-mint" />
                          <a href={proj.submissionUrl} target="_blank" rel="noopener noreferrer" className="master-download-link">
                            {proj.submissionUrl}
                          </a>
                        </div>
                      )}

                      <div className="deliverable-action-row">
                        {proj.status === 'submitted' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setReviewModalProject(proj);
                                setIsReviewModalRevisionMode(true);
                                setIsReviewModalOpen(true);
                              }}
                            >
                              <RotateCcw size={14} />
                              <span>Request Revision</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setReviewModalProject(proj);
                                setIsReviewModalRevisionMode(false);
                                setIsReviewModalOpen(true);
                              }}
                            >
                              <CheckCircle2 size={14} />
                              <span>Approve & Release Milestone</span>
                            </button>
                          </>
                        )}

                        {proj.status === 'approved' && (
                          <div className="approved-badge-msg">
                            <CheckCircle2 size={16} className="text-mint" />
                            <span>All master assets approved and milestone released.</span>
                          </div>
                        )}

                        {proj.status === 'revision-requested' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--accent-yellow-deep)', background: 'var(--accent-yellow-light)', padding: '6px 12px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--accent-yellow-border)' }}>
                            <RotateCcw size={13} />
                            <span>Revision requested. Waiting for updated creator deliverable.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 8: MESSAGES (Direct Creator Communication)
            ======================================================== */}
        {activeTab === 'messages' && (
          !currentUser ? (
            <div className="studio-messages-content fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '420px', padding: '24px 0' }}>
              <MessagesLoginWall
                initialRole="brand"
                onLoginSuccess={onLoginSuccess}
                onOpenEmailLogin={onOpenLogin}
              />
            </div>
          ) : (
          <div className="studio-messages-content fade-in">
            {connections.length === 0 ? (
              <DirectMessagesEmptyState
                role="brand"
                onExplore={handleNavigateToDiscover}
              />
            ) : (
              <div className="messages-layout-grid studio-card">
                {/* Thread list */}
                <div className="messages-sidebar">
                  <div className="messages-sidebar-header">
                    <h3>Direct Threads</h3>
                  </div>
                  <div className="messages-threads-list">
                    {connections.map(conn => (
                      <div
                        key={conn.id}
                        className={`thread-item ${conn.id === selectedConnectionId ? 'active' : ''}`}
                        onClick={() => setSelectedConnectionId(conn.id)}
                      >
                        <img src={conn.creatorAvatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=80&q=80"} alt={conn.creatorName} className="thread-avatar" />
                        <div className="thread-meta">
                          <span className="thread-name">{conn.creatorName}</span>
                          <span className="thread-camp">{conn.campaignTitle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat pane */}
                <div className="messages-chat-pane">
                  {activeConnection ? (
                    <>
                      <div className="chat-pane-header">
                        <div className="chat-partner-info">
                          <img src={activeConnection.creatorAvatar} alt={activeConnection.creatorName} className="chat-header-avatar" />
                          <div>
                            <h4>{activeConnection.creatorName}</h4>
                            <span>{activeConnection.campaignTitle}</span>
                          </div>
                        </div>
                      </div>

                      <div className="chat-messages-transcript">
                        {deduplicateMessages(activeConnection.messages || []).length === 0 ? (
                          <DirectMessagesEmptyState
                            type="empty-thread"
                            partnerName={activeConnection.creatorName}
                            role="brand"
                          />
                        ) : (
                          deduplicateMessages(activeConnection.messages || []).map(msg => (
                            <div key={msg.id} className={`chat-bubble-row ${msg.sender === 'brand' ? 'from-me' : 'from-them'}`}>
                              <div className="chat-bubble">
                                <span className="bubble-author">{msg.senderName}</span>
                                <p className="bubble-text">{msg.text}</p>
                                <span className="bubble-time">{msg.timestamp}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {sendMessageError && (
                        <div style={{ padding: '8px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '0.85rem', borderRadius: '6px', margin: '0 16px 8px' }}>
                          {sendMessageError}
                        </div>
                      )}

                      <form onSubmit={handleSendMessageSubmit} className="chat-input-bar">
                        <textarea
                          placeholder="Write a message to creative partner… (Enter to send, Shift+Enter for newline)"
                          value={chatInputText}
                          onChange={(e) => {
                            setChatInputText(e.target.value);
                            if (sendMessageError) setSendMessageError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessageSubmit(e);
                            }
                          }}
                          disabled={isSendingMessage}
                          rows={1}
                          className="chat-text-input"
                          style={{ resize: 'none', minHeight: '38px', padding: '8px 12px', fontFamily: 'inherit' }}
                        />
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm"
                          disabled={!chatInputText.trim() || isSendingMessage}
                        >
                          <Send size={14} />
                          <span>{isSendingMessage ? 'Sending...' : 'Send'}</span>
                        </button>
                      </form>
                    </>
                  ) : (
                    <DirectMessagesEmptyState
                      type="no-selection"
                      role="brand"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          )
        )}

        {/* ========================================================
            TAB 9: BRAND PROFILE & SETTINGS
            ======================================================== */}
        {activeTab === 'brand-settings' && (
          <div className="studio-settings-content fade-in">
            <div className="settings-split-grid">

              {/* Form 1: Brand Profile Information */}
              <div className="settings-card studio-card">
                <div className="card-header-with-badge">
                  <div>
                    <h2>Brand Identity & Profile</h2>
                    <p>Campaigns created by this brand inherit these creative direction defaults.</p>
                  </div>
                </div>

                {brandSaveNotice && (
                  <div className="save-success-banner">
                    <CheckCircle2 size={16} className="text-mint" />
                    <span>{brandSaveNotice}</span>
                  </div>
                )}

                <form onSubmit={handleSaveBrandProfile} className="settings-form">
                  <div className="form-group">
                    <label>Brand Name</label>
                    <input
                      type="text"
                      value={brandProfileForm.name}
                      onChange={(e) => setBrandProfileForm({ ...brandProfileForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-row">
                    <div className="form-group">
                      <label>Industry</label>
                      <input
                        type="text"
                        value={brandProfileForm.industry}
                        onChange={(e) => setBrandProfileForm({ ...brandProfileForm, industry: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Website</label>
                      <input
                        type="text"
                        value={brandProfileForm.website}
                        onChange={(e) => setBrandProfileForm({ ...brandProfileForm, website: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Brand Description & Mission</label>
                    <textarea
                      rows={3}
                      value={brandProfileForm.description}
                      onChange={(e) => setBrandProfileForm({ ...brandProfileForm, description: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Aesthetic Preference & Tone</label>
                    <input
                      type="text"
                      value={brandProfileForm.aesthetic}
                      onChange={(e) => setBrandProfileForm({ ...brandProfileForm, aesthetic: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Preferred Channels (comma separated)</label>
                    <input
                      type="text"
                      value={brandProfileForm.preferredPlatforms}
                      onChange={(e) => setBrandProfileForm({ ...brandProfileForm, preferredPlatforms: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-sm">
                    <Check size={14} />
                    <span>Save Brand Profile</span>
                  </button>
                </form>
              </div>

              {/* Form 2: Identity Scope & Storage Diagnostics */}
              <div className="settings-card studio-card">
                <h2>Workspace Identity & Data Isolation</h2>
                <p>Alloy client-side prototype identity controls.</p>

                <div className="identity-status-box">
                  <div className="status-row">
                    <span className="status-lbl">Active Brand ID:</span>
                    <span className="status-val code">{currentBrand?.id}</span>
                  </div>
                  <div className="status-row">
                    <span className="status-lbl">Identity Mode:</span>
                    <span className="status-val">{currentBrand?.isDemo ? 'Curated Demo Brand' : 'Custom Real Brand'}</span>
                  </div>
                  <div className="status-row">
                    <span className="status-lbl">Owned Campaigns:</span>
                    <span className="status-val">{campaigns.length} campaigns isolated to this ID</span>
                  </div>
                  <div className="status-row">
                    <span className="status-lbl">Cross-Tab Sync:</span>
                    <span className="status-val text-mint">Active (localStorage event bus)</span>
                  </div>
                </div>

                <div className="settings-actions-group">
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={() => setIsCreateBrandModalOpen(true)}
                  >
                    <Plus size={14} />
                    <span>Create Separate Brand Identity</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost btn-block text-danger"
                    onClick={() => {
                      if (confirm("Reset local storage back to demo seeds? Any custom campaigns will be reset.")) {
                        if (onResetState) onResetState();
                      }
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Reset Workspace to Initial State</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            TAB 10: BRAND TRUST CENTRE
            ======================================================== */}
        {activeTab === 'trust' && (
          <BrandTrustCenterView
            brand={currentBrand}
            currentUser={currentUser}
            campaigns={campaigns}
            fundingRecords={fundingRecords}
            collaborations={projects}
            invitations={invitations}
            onUpdateBrand={onUpdateBrand}
            onBackToWorkspace={() => setActiveTab('overview')}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

      </div>

      {/* ========================================================
          MODAL 1: CAMPAIGN DETAIL MODAL
          ======================================================== */}
      {isCampaignDetailOpen && detailCampaign && (
        <div className="modal-overlay" onClick={() => setIsCampaignDetailOpen(false)}>
          <div className="modal-content campaign-detail-sheet" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsCampaignDetailOpen(false)}
            >
              <X size={18} />
            </button>

            <div className="camp-detail-header">
              <div className="badges-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <span className={`status-pill ${detailCampaign.status.toLowerCase()}`}>{detailCampaign.status}</span>
                <span className={`visibility-pill ${detailCampaign.visibility}`}>
                  {detailCampaign.visibility === 'published' ? 'Marketplace Live' : 'Private'}
                </span>
                <span className="badge badge-subtle">
                  {detailCampaign.applicationStatus === 'closed' ? 'Applications Closed' : 'Accepting Applications'}
                </span>
                <span className="badge" style={{ background: 'var(--accent-lavender-light)', color: 'var(--accent-lavender-deep)' }}>
                  {detailCampaign.acceptedApplicationsCount || 0} / {detailCampaign.creatorSlots || 1} Slots Filled
                </span>
                <span className="badge badge-subtle">
                  {detailCampaign.isNegotiable !== false ? 'Budget Negotiable' : 'Fixed Budget'}
                </span>
              </div>
              <h2 className="detail-headline font-editorial" style={{ marginTop: '10px', marginBottom: '6px' }}>{detailCampaign.title}</h2>
              <p className="detail-subhead" style={{ color: 'var(--text-secondary)' }}>{detailCampaign.objective} • {detailCampaign.industry}</p>

              {/* Quick Marketplace Controls */}
              <div className="brand-campaign-control-bar">
                <div className="brand-control-status-group">
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Marketplace Visibility:</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {detailCampaign.visibility === 'published' ? 'Live & Discoverable in Creator Marketplace' : 'Private (Only invited creators can participate)'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => handleToggleCampaignState(detailCampaign)}
                  >
                    <Globe size={13} />
                    <span>{detailCampaign.visibility === 'published' ? 'Make Private' : 'Publish to Marketplace'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => handleToggleApplicationStatus(detailCampaign)}
                  >
                    <Layers size={13} />
                    <span>{detailCampaign.applicationStatus === 'closed' ? 'Open Applications' : 'Close Applications'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="camp-detail-body">
              {/* Section 1: Campaign Objective & Focus */}
              <div className="inspect-brief-section">
                <div className="inspect-section-header">
                  <Sparkles size={15} style={{ color: 'var(--accent-bronze)' }} />
                  <span className="inspect-section-kicker">01 • Campaign Objective & Focus</span>
                </div>
                <div className="inspect-overview-grid">
                  <div className="inspect-meta-box">
                    <span className="inspect-meta-lbl">Primary Objective</span>
                    <strong className="inspect-meta-val">{detailCampaign.objective || 'Product Launch'}</strong>
                  </div>
                  <div className="inspect-meta-box">
                    <span className="inspect-meta-lbl">Industry Category</span>
                    <strong className="inspect-meta-val">{detailCampaign.industry || 'Creative Direction'}</strong>
                  </div>
                  {detailCampaign.productOrService && (
                    <div className="inspect-meta-box">
                      <span className="inspect-meta-lbl">Product / Service</span>
                      <strong className="inspect-meta-val">{detailCampaign.productOrService}</strong>
                    </div>
                  )}
                  {detailCampaign.targetAudience && (
                    <div className="inspect-meta-box">
                      <span className="inspect-meta-lbl">Target Audience</span>
                      <strong className="inspect-meta-val">{detailCampaign.targetAudience}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Creative Direction & Tone */}
              <div className="inspect-brief-section">
                <div className="inspect-section-header">
                  <Film size={15} style={{ color: 'var(--accent-bronze)' }} />
                  <span className="inspect-section-kicker">02 • Creative Direction & Narrative</span>
                </div>
                <div className="inspect-creative-box">
                  <div className="inspect-tags-row">
                    {detailCampaign.creativeStyle && (
                      <span className="badge badge-subtle">
                        <strong>Style:</strong> {detailCampaign.creativeStyle}
                      </span>
                    )}
                    {detailCampaign.toneOfVoice && (
                      <span className="badge badge-subtle">
                        <strong>Tone:</strong> {detailCampaign.toneOfVoice}
                      </span>
                    )}
                  </div>
                  <p className="inspect-desc-text">
                    {detailCampaign.description || 'No detailed brief description provided.'}
                  </p>
                </div>
              </div>

              {/* Section 3: Deliverables & Channels */}
              <div className="inspect-brief-section">
                <div className="inspect-section-header">
                  <Layers size={15} style={{ color: 'var(--accent-bronze)' }} />
                  <span className="inspect-section-kicker">03 • Deliverables & Platforms</span>
                </div>
                <div className="inspect-deliverables-wrap">
                  <div className="inspect-deliverables-list">
                    {Array.isArray(detailCampaign.deliverables) ? (
                      detailCampaign.deliverables.map((item, idx) => (
                        <div key={idx} className="inspect-deliverable-item">
                          <CheckCircle2 size={14} className="text-forest" style={{ flexShrink: 0 }} />
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <div className="inspect-deliverable-item">
                        <CheckCircle2 size={14} className="text-forest" style={{ flexShrink: 0 }} />
                        <span>{detailCampaign.deliverables || 'Full Creative Deliverable Package'}</span>
                      </div>
                    )}
                  </div>
                  {detailCampaign.platforms && (
                    <div className="inspect-platforms-row">
                      <span className="spec-lbl" style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>Target Channels:</span>
                      <span className="spec-val" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {Array.isArray(detailCampaign.platforms) ? detailCampaign.platforms.join(', ') : detailCampaign.platforms}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Budget, Timeline & Capacity */}
              <div className="inspect-brief-section">
                <div className="inspect-section-header">
                  <DollarSign size={15} style={{ color: 'var(--accent-bronze)' }} />
                  <span className="inspect-section-kicker">04 • Budget, Timeline & Escrow</span>
                </div>
                <div className="detail-grid-specs" style={{ margin: 0 }}>
                  <div className="spec-box">
                    <span className="spec-lbl">Allocated Budget</span>
                    <span className="spec-val">{detailCampaign.budget || 'Flexible'}</span>
                  </div>
                  <div className="spec-box">
                    <span className="spec-lbl">Production Deadline</span>
                    <span className="spec-val">
                      {detailCampaign.isOpenEnded ? 'Open-ended' : (detailCampaign.deadline || detailCampaign.timeline || 'Flexible')}
                    </span>
                  </div>
                  <div className="spec-box">
                    <span className="spec-lbl">Creator Capacity</span>
                    <span className="spec-val">
                      {detailCampaign.remainingSlots !== undefined ? detailCampaign.remainingSlots : Math.max(0, (detailCampaign.creatorSlots || 1) - (detailCampaign.acceptedApplicationsCount || 0))} open of {detailCampaign.creatorSlots || 1} slots
                    </span>
                  </div>
                  {detailCampaign.fundedAmountRupees > 0 && (
                    <div className="spec-box" style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}>
                      <span className="spec-lbl" style={{ color: '#059669', fontWeight: 700 }}>Total Funded Escrow</span>
                      <span className="spec-val" style={{ color: '#059669', fontWeight: 700 }}>
                        ₹{Number(detailCampaign.fundedAmountRupees).toLocaleString('en-IN')} INR
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* CREATOR APPLICATIONS & PROPOSALS SECTION */}
              <div className="detail-section" style={{ marginTop: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '-0.01em' }}>
                      Creator Proposals ({applications.filter(a => a.campaignId === detailCampaign.id && !a.isHeld).length})
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                      Private proposals isolated from competing creators
                    </p>
                  </div>
                  {detailCampaign.visibility === 'published' && (
                    <span className="badge badge-subtle" style={{ fontSize: '0.74rem' }}>
                      Slot Capacity: {detailCampaign.remainingSlots !== undefined ? detailCampaign.remainingSlots : Math.max(0, (detailCampaign.creatorSlots || 1) - (detailCampaign.acceptedApplicationsCount || 0))} open
                    </span>
                  )}
                </div>

                {applications.filter(a => a.campaignId === detailCampaign.id && !a.isHeld).length === 0 ? (
                  <div style={{
                    padding: '32px 24px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-medium)',
                    background: 'var(--bg-card-subtle)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.88rem'
                  }}>
                    {detailCampaign.visibility !== 'published' ? (
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        This campaign is currently <strong>Private</strong>. Publish it to the Creator Marketplace to discover and receive creator applications.
                      </p>
                    ) : (
                      <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        No creator proposals received yet for this campaign. Verified creators will submit bids directly.
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {applications
                      .filter(a => a.campaignId === detailCampaign.id && !a.isHeld)
                      .map(app => {
                        const isCountering = counterOfferAppId === app.id;
                        const remaining = detailCampaign.remainingSlots !== undefined
                          ? detailCampaign.remainingSlots
                          : Math.max(0, (detailCampaign.creatorSlots || 1) - (detailCampaign.acceptedApplicationsCount || 0));

                        return (
                          <div
                            key={app.id}
                            className="brand-application-card"
                          >
                            <div className="brand-app-creator-header">
                              <div className="brand-app-creator-info">
                                <img
                                  src={app.creatorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"}
                                  alt={app.creatorName}
                                  className="brand-app-avatar"
                                />
                                <div className="brand-app-name-block">
                                  <h4>{app.creatorName}</h4>
                                  <span>
                                    {app.creatorRole || 'AI Creative Partner'} • Submitted {new Date(app.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <span className="badge" style={{
                                  fontSize: '0.74rem',
                                  padding: '5px 10px',
                                  borderRadius: 'var(--radius-pill)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                  fontWeight: 600,
                                  background: app.status === 'accepted' ? 'var(--accent-mint-light)' :
                                              app.status === 'counter_offered' ? 'var(--accent-yellow-light)' :
                                              'var(--accent-lavender-light)',
                                  color: app.status === 'accepted' ? 'var(--accent-mint)' :
                                         app.status === 'counter_offered' ? 'var(--accent-yellow-deep)' :
                                         'var(--accent-lavender-deep)',
                                  border: `1px solid ${
                                    app.status === 'accepted' ? 'var(--accent-mint-border)' :
                                    app.status === 'counter_offered' ? 'var(--accent-yellow-border)' :
                                    'var(--accent-lavender-border)'
                                  }`
                                }}>
                                  {app.status === 'pending_review' ? 'Review Pending' :
                                   app.status === 'counter_offered' ? 'Counter-Offer Sent' :
                                   app.status === 'accepted' ? 'Accepted & Active' : app.status}
                                </span>
                              </div>
                            </div>

                            {/* Proposed Terms */}
                            <div className="brand-app-terms-row">
                              <div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                                  Proposed Rate
                                </span>
                                <strong style={{ fontSize: '1.05rem', color: 'var(--accent-forest)' }}>{app.proposedPrice}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>
                                  Delivery Timeline
                                </span>
                                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>{app.deliveryTimeline || 'Standard'}</strong>
                              </div>
                              {app.counterOffer && (
                                <div>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-yellow-deep)', display: 'block', marginBottom: '2px' }}>
                                    Your Counter-Offer
                                  </span>
                                  <strong style={{ fontSize: '1.05rem', color: 'var(--accent-yellow-deep)' }}>
                                    {app.counterOffer.proposedRate} ({app.counterOffer.status})
                                  </strong>
                                </div>
                              )}
                            </div>

                            {/* Pitch Text */}
                            {app.pitchText && (
                              <div className="app-proposal-quote">
                                “{app.pitchText}”
                              </div>
                            )}

                            {/* Attached Evidence Projects */}
                            {(app.attachedProjectIds || []).length > 0 && (
                              <div className="brand-app-evidence-spotlight">
                                <span style={{ fontSize: '0.78rem', color: 'var(--accent-bronze)', fontWeight: 600 }}>
                                  Verification Evidence:
                                </span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                  {app.attachedProjectIds.length} portfolio project(s) attached and verified against campaign brief criteria.
                                </span>
                              </div>
                            )}

                            {/* Actions Row */}
                            {app.status === 'pending_review' && (
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  disabled={remaining <= 0}
                                  onClick={() => {
                                    if (onAcceptApplication) onAcceptApplication(app.id, detailCampaign.id);
                                  }}
                                  title={remaining <= 0 ? 'All campaign slots filled' : 'Accept proposal and start collaboration'}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>{remaining <= 0 ? 'All Slots Filled' : 'Accept Proposal'}</span>
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    if (isCountering) {
                                      setCounterOfferAppId(null);
                                    } else {
                                      setCounterOfferAppId(app.id);
                                      setCounterOfferForm({
                                        proposedRate: app.proposedPrice || '',
                                        proposedTimeline: app.deliveryTimeline || '',
                                        note: ''
                                      });
                                    }
                                  }}
                                >
                                  <span>{isCountering ? 'Cancel' : 'Propose Counter-Offer'}</span>
                                </button>
                              </div>
                            )}

                            {/* Message Creator — opens the canonical conversation for accepted applications */}
                            {app.status === 'accepted' && (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                <button
                                  type="button"
                                  id={`message-creator-btn-${app.id}`}
                                  className="btn btn-primary btn-sm"
                                  onClick={() => {
                                    const connId = `conn-${app.campaignId}-${app.creatorId}`;
                                    const matchingConn = (connections || []).find(c => c.id === connId || (c.campaignId === app.campaignId && c.creatorId === app.creatorId));
                                    if (matchingConn) {
                                      setSelectedConnectionId(matchingConn.id);
                                    } else {
                                      setSelectedConnectionId(connId);
                                    }
                                    setIsCampaignDetailOpen(false);
                                    setActiveTab('messages');
                                  }}
                                >
                                  <MessageSquare size={13} />
                                  <span>Message Creator</span>
                                </button>
                              </div>
                            )}

                            {/* Inline Counter Offer Form */}
                            {isCountering && (
                              <div style={{
                                padding: '16px 18px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-card-subtle)',
                                border: '1px solid var(--accent-gold)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                marginTop: '8px'
                              }}>
                                <h5 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--accent-bronze)', fontWeight: 600 }}>
                                  Propose Counter-Offer to {app.creatorName}
                                </h5>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                  <div>
                                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Counter Rate</label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={counterOfferForm.proposedRate}
                                      onChange={(e) => setCounterOfferForm(prev => ({ ...prev, proposedRate: e.target.value }))}
                                      placeholder="₹45,000"
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Counter Timeline</label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={counterOfferForm.proposedTimeline}
                                      onChange={(e) => setCounterOfferForm(prev => ({ ...prev, proposedTimeline: e.target.value }))}
                                      placeholder="10 Days"
                                      required
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Terms / Scope Adjustment Note</label>
                                  <textarea
                                    className="form-textarea"
                                    rows={2}
                                    value={counterOfferForm.note}
                                    onChange={(e) => setCounterOfferForm(prev => ({ ...prev, note: e.target.value }))}
                                    placeholder="Explain proposed rate adjustment or revised milestone schedule..."
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-xs"
                                    onClick={() => setCounterOfferAppId(null)}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-xs"
                                    onClick={() => {
                                      if (onProposeCounterOffer) {
                                        onProposeCounterOffer(app.id, counterOfferForm);
                                        setCounterOfferAppId(null);
                                      }
                                    }}
                                  >
                                    <span>Send Counter-Offer</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="detail-actions-footer">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setIsCampaignDetailOpen(false);
                    handleOpenFundCampaign(detailCampaign);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #EB6E4B 0%, #D45A37 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(235, 110, 75, 0.25)'
                  }}
                  id="fund-campaign-detail-action-btn"
                >
                  <CreditCard size={14} />
                  <span>Fund Campaign</span>
                </button>
                {onRunFilteringPipeline && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setIsCampaignDetailOpen(false);
                      onRunFilteringPipeline(detailCampaign);
                    }}
                  >
                    <Sparkles size={14} className="text-mint" />
                    <span>Execute Filtering Pipeline</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsCampaignDetailOpen(false);
                    handleOpenEditCampaign(detailCampaign);
                  }}
                >
                  <Edit3 size={14} />
                  <span>Edit Campaign</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    handleToggleCampaignState(detailCampaign);
                    setIsCampaignDetailOpen(false);
                  }}
                >
                  {detailCampaign.visibility === 'published' ? 'Pause Campaign' : 'Publish Opportunity'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: CREATE / EDIT CAMPAIGN MODAL (With Groq AI)
          ======================================================== */}
      {isCreateEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateEditModalOpen(false)}>
          <div className="modal-content campaign-create-sheet" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setIsCreateEditModalOpen(false)}
            >
              <X size={18} />
            </button>

            <div className="modal-header">
              <h2 className="font-editorial">
                {editingCampaignId ? 'Edit Campaign Brief' : 'Create New Campaign'}
              </h2>
              <p className="modal-sub">
                {editingCampaignId ? 'Update your campaign requirements and creative direction.' : 'Build a campaign brief to discover and invite world-class AI creators.'}
              </p>
            </div>

            {/* Natural Language AI Assistant Banner */}
            {!editingCampaignId && (
              <div className="ai-brief-assistant-box">
                <div className="assistant-header">
                  <Sparkles size={16} className="text-lavender" />
                  <span>Structure with Alloy Brief AI (Powered by Groq)</span>
                </div>
                <textarea
                  rows={2}
                  placeholder="e.g. 'Launching a minimal titanium watch. Need 3D exploded motion passes and zero-gravity loops for YouTube and Instagram...'"
                  value={aiBriefPrompt}
                  onChange={(e) => setAiBriefPrompt(e.target.value)}
                  className="ai-brief-textarea"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={handleGenerateBriefWithGroq}
                  disabled={isAiBriefGenerating || !aiBriefPrompt.trim()}
                >
                  {isAiBriefGenerating ? 'Analyzing with Groq AI…' : 'Populate Brief Fields'}
                </button>
              </div>
            )}

            <form onSubmit={handleSaveCampaignForm} className="campaign-form-grid">
              <div className="form-group full-width">
                <label>Campaign Title *</label>
                <input
                  type="text"
                  value={campaignFormData.title}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, title: e.target.value })}
                  placeholder="e.g. Summer Skincare & Radiant Hydration Launch"
                  required
                />
              </div>

              <div className="form-group">
                <label>Campaign Objective</label>
                <select
                  value={campaignFormData.objective}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, objective: e.target.value })}
                >
                  <option value="Product Launch">Product Launch</option>
                  <option value="Brand Film">Cinematic Brand Film</option>
                  <option value="Social Content Suite">Social Content Suite</option>
                  <option value="Lookbook & Stills">Editorial Lookbook & Stills</option>
                  <option value="Exploratory Concepting">Exploratory Concepting</option>
                </select>
              </div>

              <div className="form-group">
                <label>Product or Service</label>
                <input
                  type="text"
                  value={campaignFormData.productOrService}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, productOrService: e.target.value })}
                  placeholder="e.g. Barrier Restoration Serum"
                />
              </div>

              <div className="form-group full-width">
                <label>Brief Description & Creative Direction *</label>
                <textarea
                  rows={3}
                  value={campaignFormData.description}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, description: e.target.value })}
                  placeholder="Describe the desired visual aesthetic, worldbuilding, lighting, and mood..."
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Deliverables (comma separated) *</label>
                <input
                  type="text"
                  value={campaignFormData.deliverables}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, deliverables: e.target.value })}
                  placeholder="e.g. 3x 4K Master Stills, 2x 9:16 Vertical Loops"
                  required
                />
              </div>

              <div className="form-group">
                <label>Budget (Optional)</label>
                <input
                  type="text"
                  value={campaignFormData.budget}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, budget: e.target.value })}
                  placeholder="e.g. ₹50,000 – ₹1,00,000"
                />
              </div>

              <div className="form-group">
                <label>Budget Negotiability</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="radio"
                      name="isNegotiable"
                      checked={campaignFormData.isNegotiable !== false}
                      onChange={() => setCampaignFormData(prev => ({ ...prev, isNegotiable: true }))}
                    />
                    <span>Negotiable (Creators can propose custom rates)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="radio"
                      name="isNegotiable"
                      checked={campaignFormData.isNegotiable === false}
                      onChange={() => setCampaignFormData(prev => ({ ...prev, isNegotiable: false }))}
                    />
                    <span>Fixed Budget (Hard cap, non-negotiable)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Creator Slots Needed (Default: 1)</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={campaignFormData.creatorSlots || 1}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, creatorSlots: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>

              <div className="form-group">
                <label>Timeline or Deadline</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={!!campaignFormData.isOpenEnded}
                      onChange={(e) => setCampaignFormData(prev => ({ ...prev, isOpenEnded: e.target.checked }))}
                    />
                    <span>Open-ended (No hard deadline)</span>
                  </label>
                  {!campaignFormData.isOpenEnded && (
                    <input
                      type="text"
                      value={campaignFormData.deadline}
                      onChange={(e) => setCampaignFormData({ ...campaignFormData, deadline: e.target.value })}
                      placeholder="e.g. Nov 30, 2026 or 3 Weeks"
                    />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Target Platforms</label>
                <input
                  type="text"
                  value={campaignFormData.platforms}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, platforms: e.target.value })}
                  placeholder="e.g. Instagram, TikTok, Digital OOH"
                />
              </div>

              <div className="form-group">
                <label>Visibility Mode</label>
                <select
                  value={campaignFormData.visibility}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, visibility: e.target.value })}
                >
                  <option value="private">Private (Only invited creators can view & collaborate)</option>
                  <option value="published">Published to Marketplace (Creators discover & apply)</option>
                </select>
              </div>

              <div className="form-footer-actions full-width">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateEditModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={(e) => handleSaveCampaignForm(e, 'draft')}
                >
                  Save as Draft
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingCampaignId ? 'Update Campaign' : 'Save & Publish Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: DELETE CONFIRMATION
          ======================================================== */}
      {deletingCampaign && (
        <div className="modal-overlay" onClick={() => setDeletingCampaign(null)}>
          <div className="modal-content confirmation-sheet" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setDeletingCampaign(null)}>
              <X size={18} />
            </button>
            <div className="confirm-icon-box text-danger">
              <Trash2 size={28} />
            </div>
            <h2>Delete Campaign?</h2>
            <p>
              Are you sure you want to delete “<strong>{deletingCampaign.title}</strong>”? This action cannot be undone.
            </p>
            <div className="confirm-actions-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingCampaign(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary bg-danger"
                onClick={() => {
                  if (onDeleteCampaign) onDeleteCampaign(deletingCampaign.id);
                  setDeletingCampaign(null);
                }}
              >
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: CREATE BRAND WORKSPACE
          ======================================================== */}
      {isCreateBrandModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateBrandModalOpen(false)}>
          <div className="modal-content create-brand-sheet" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setIsCreateBrandModalOpen(false)}>
              <X size={18} />
            </button>
            <h2 className="font-editorial">Create Brand Workspace</h2>
            <p className="modal-sub">Each brand workspace has its own campaigns, shortlists, and invitations.</p>

            <form onSubmit={handleCreateBrandSubmit} className="brand-create-form">
              <div className="form-group">
                <label>Brand Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Solis Studio"
                  value={newBrandForm.name}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Industry</label>
                <select
                  value={newBrandForm.industry}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, industry: e.target.value })}
                >
                  <option value="Beauty & Skincare">Beauty & Skincare</option>
                  <option value="Luxury & High Fashion">Luxury & High Fashion</option>
                  <option value="Consumer Tech & Hardware">Consumer Tech & Hardware</option>
                  <option value="Beverage & Spirits">Beverage & Spirits</option>
                  <option value="Architecture & Hospitality">Architecture & Hospitality</option>
                </select>
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="text"
                  placeholder="https://solis.studio"
                  value={newBrandForm.website}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, website: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Aesthetic Direction</label>
                <input
                  type="text"
                  placeholder="e.g. Minimalist, Luminous, Sun-Drenched"
                  value={newBrandForm.aesthetic}
                  onChange={(e) => setNewBrandForm({ ...newBrandForm, aesthetic: e.target.value })}
                />
              </div>

              <div className="form-footer-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateBrandModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          EXTERNAL MODALS (Preserved)
          ======================================================== */}
      <WhyThisCreatorModal
        isOpen={isWhyModalOpen}
        onClose={() => {
          setIsWhyModalOpen(false);
          setWhyModalCreator(null);
        }}
        creator={whyModalCreator}
        campaign={inspectedCampaign}
        onInviteCreator={(c) => {
          setIsWhyModalOpen(false);
          setInviteModalCreator(c);
          setIsInviteModalOpen(true);
        }}
        onViewProfile={onSelectCreator}
      />

      <CreaSimModal
        isOpen={isCreaSimOpen}
        onClose={() => setIsCreaSimOpen(false)}
        activeCampaign={inspectedCampaign}
        creators={creators}
        onSelectCreator={onSelectCreator}
        onInviteCreator={(c) => {
          setIsCreaSimOpen(false);
          setInviteModalCreator(c);
          setIsInviteModalOpen(true);
        }}
      />

      <CreatorComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        creatorIds={comparisonCreatorIds}
        creators={creators}
        campaign={inspectedCampaign}
        onInviteCreator={(c) => {
          setIsComparisonOpen(false);
          setInviteModalCreator(c);
          setIsInviteModalOpen(true);
        }}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setInviteModalCreator(null);
        }}
        creator={inviteModalCreator}
        activeCampaign={inspectedCampaign}
        onInvitationSent={handleConfirmSendInvitation}
        onViewCampaign={() => {
          setIsInviteModalOpen(false);
          setActiveTab('invitations');
        }}
      />

      <DeliverableReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setReviewModalProject(null);
          setIsReviewModalRevisionMode(false);
        }}
        project={reviewModalProject}
        onRequestRevision={onRequestRevision}
        onApproveDeliverables={onApproveDeliverables}
        initialRevisionMode={isReviewModalRevisionMode}
      />

      {/* Razorpay Standard Checkout Campaign Funding Modal */}
      <CampaignFundingModal
        isOpen={isFundingModalOpen}
        onClose={() => {
          setIsFundingModalOpen(false);
          setFundingCampaign(null);
        }}
        campaign={fundingCampaign}
        currentUser={currentUser}
        onFundingSuccess={(payment) => {
          if (onUpdateCampaign && fundingCampaign) {
            const currentTotal = Number(fundingCampaign.fundedAmountRupees || 0);
            const added = Number(payment.amount_rupees || (payment.amount / 100) || 0);
            onUpdateCampaign(fundingCampaign.id, {
              fundedAmountRupees: currentTotal + added,
              isFunded: true
            });
          }
        }}
      />
    </div>
  );
}
