import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import CreativeShowcase from './components/CreativeShowcase';
import CreativeHighlights from './components/CreativeHighlights';
import CreatorDNASection from './components/CreatorDNASection';
import CreaMatchSection from './components/CreaMatchSection';
import TwoJourneysSection from './components/TwoJourneysSection';
import WorkspaceEntryCards from './components/WorkspaceEntryCards';
import ProductPreview from './components/ProductPreview';
import HowItWorks from './components/HowItWorks';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

import DiscoverView from './views/DiscoverView';
import CreatorProfileView from './views/CreatorProfileView';
import BrandWorkspaceView from './views/BrandWorkspaceView';
import BrandOnboardingView from './views/BrandOnboardingView';
import CreatorOnboardingView from './views/CreatorOnboardingView';
import CreatorWorkspaceView from './views/CreatorWorkspaceView';
import TrustCenterView from './views/TrustCenterView';
import BrandTrustCenterView from './views/BrandTrustCenterView';
import AdminLoginView from './views/AdminLoginView';
import AdminDashboardView from './views/AdminDashboardView';
import { verifyAdminSession, getAdminActiveSession } from './services/adminApi';

import ProjectModal from './components/ProjectModal';
import CampaignModal from './components/CampaignModal';
import InviteModal from './components/InviteModal';
import ForBrandsModal from './components/ForBrandsModal';
import ForCreatorsModal from './components/ForCreatorsModal';
import WhyThisCreatorModal from './components/WhyThisCreatorModal';
import ConversationModal from './components/ConversationModal';
import GlobalMessagingDrawer from './components/GlobalMessagingDrawer';
import RoleSelectModal from './components/RoleSelectModal';
import LoginModal from './components/LoginModal';
import RoleConflictModal from './components/RoleConflictModal';
import MessagesLoginWall from './components/MessagesLoginWall';
import JudgeDemoWalkthrough from './components/JudgeDemoWalkthrough';
import AlloyLoadingScreen from './components/AlloyLoadingScreen';
import { Sparkles } from 'lucide-react';

import { CREATORS } from './data/creatorsData';
import PipelineTraceModal from './components/PipelineTraceModal';
import {
  getInitialMarketplaceState,
  saveMarketplaceState,
  subscribeToMarketplace,
  getBrandScopedData,
  getPublicCreatorOpportunities,
  createCampaignRecord,
  createBrandRecord,
  resetMarketplaceState,
  updateCreatorRecord,
  getPublicCreatorProfile,
  INITIAL_CAMPAIGNS
} from './data/marketplaceStore';
import {
  fetchCreators as fetchBackendCreators,
  fetchCampaigns as fetchBackendCampaigns,
  fetchBrands as fetchBackendBrands,
  fetchInvitations as fetchBackendInvitations,
  fetchCollaborations as fetchBackendCollaborations,
  fetchShortlists as fetchBackendShortlists,
  saveCreator as saveBackendCreator,
  saveCampaign as saveBackendCampaign,
  deleteCampaign as deleteBackendCampaign,
  saveBrand as saveBackendBrand,
  savePortfolioProject as saveBackendProject,
  sendInvitation as sendBackendInvitation,
  updateInvitationStatus as updateBackendInvitationStatus,
  saveCollaboration as saveBackendCollaboration,
  submitDeliverables as submitBackendDeliverables,
  requestRevision as requestBackendRevision,
  approveDeliverables as approveBackendDeliverables,
  toggleShortlist as toggleBackendShortlist,
  sendBackendMessage,
  fetchBackendMessages,
  subscribeToMessages,
  subscribeToInvitations,
  subscribeToCollaborations,
  subscribeToCampaigns,
  subscribeToBrands,
  subscribeToCreators,
  getBackendStatus,
  getCurrentUser,
  signOut as backendSignOut,
  syncUserProfileSafely,
  updateUserRoleExplicitly,
  executeCampaignFilteringPipeline,
  deduplicateMessages,
  reconcileMessages,
  handleGoogleTokenResponse
} from './services/marketplaceBackend';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';

// Safely resolve the active role without letting Supabase default 'authenticated' confuse role logic
function resolveUserRole(user) {
  if (!user) {
    if (typeof window !== 'undefined') {
      const active = localStorage.getItem('creasync_active_role');
      if (active === 'brand' || active === 'creator') return active;
    }
    return null;
  }
  if (user.profile?.role === 'brand' || user.profile?.role === 'creator') {
    return user.profile.role;
  }
  if (user.user_metadata?.intended_role === 'brand' || user.user_metadata?.intended_role === 'creator') {
    return user.user_metadata.intended_role;
  }
  if (user.user_metadata?.role === 'brand' || user.user_metadata?.role === 'creator') {
    return user.user_metadata.role;
  }
  if (user.role === 'brand' || user.role === 'creator') {
    return user.role;
  }
  if (typeof window !== 'undefined') {
    const active = localStorage.getItem('creasync_active_role');
    if (active === 'brand' || active === 'creator') return active;
    const intended = sessionStorage.getItem('creasync_intended_role') || localStorage.getItem('creasync_intended_role');
    if (intended === 'brand' || intended === 'creator') return intended;
  }
  return null;
}

export default function App() {
  // Active Authenticated User & Protected Action Queue
  const [currentUser, setCurrentUser] = useState(null);
  const currentUserRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);
  const [loginInitialRole, setLoginInitialRole] = useState('brand');
  const [loginNotice, setLoginNotice] = useState(null);

  // Synchronously update both the ref and the React state
  const updateActiveUser = (user) => {
    currentUserRef.current = user;
    setCurrentUser(user);
  };

  const [currentView, setCurrentView] = useState('home'); // includes admin-login and admin-dashboard
  const [activeCreatorId, setActiveCreatorId] = useState(null);
  const [currentAdmin, setCurrentAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('alloy_super_admin_session') || 'null');
    } catch {
      return null;
    }
  });
  const [initialBrandTab, setInitialBrandTab] = useState('overview');
  const [initialCreatorTab, setInitialCreatorTab] = useState('overview');

  // Judge Demo Walkthrough state with persistent completion/dismissal memory
  const [isJudgeTourOpen, setIsJudgeTourOpen] = useState(() => {
    try {
      const completed = localStorage.getItem('alloy_judge_tour_completed');
      const dismissed = localStorage.getItem('alloy_judge_tour_dismissed');
      return !completed && !dismissed;
    } catch {
      return false;
    }
  });

  // --- Filtering Pipeline Trace States ---
  const [pipelineTrace, setPipelineTrace] = useState(null);
  const [isPipelineTraceModalOpen, setIsPipelineTraceModalOpen] = useState(false);
  const [isPipelineTraceLoading, setIsPipelineTraceLoading] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState(null);
  const [pipelineError, setPipelineError] = useState(null);
  const pipelineRunVersionRef = useRef(0);
  const lastPipelineCampaignRef = useRef(null);

  // Centralized persistent state (synced with localStorage & reactive cross-tab events)
  const [marketplaceData, setMarketplaceData] = useState(() => getInitialMarketplaceState());
  const creatorsList = marketplaceData.creators && marketplaceData.creators.length > 0 ? marketplaceData.creators : CREATORS;

  const {
    brands = [],
    activeBrandId,
    isDemoMode = true,
    campaigns = [],
    activeCampaignId,
    projects = [],
    invitations = [],
    shortlists = {},
    connections = [],
    opportunities = []
  } = marketplaceData;

  // Persist state updates to localStorage & broadcast event
  useEffect(() => {
    saveMarketplaceState(marketplaceData);
  }, [marketplaceData]);

  // Subscribe to storage & cross-tab events for real-time synchronization
  useEffect(() => {
    const unsubscribe = subscribeToMarketplace((newState) => {
      setMarketplaceData(newState);
    });
    return () => unsubscribe();
  }, []);

  // Sync with cloud backend on mount if Supabase is active
  useEffect(() => {
    let isMounted = true;
    const syncBackend = async () => {
      try {
        const [
          cloudCreators,
          cloudCampaigns,
          cloudBrands,
          cloudInvs,
          cloudCollabs,
          cloudShortlists
        ] = await Promise.allSettled([
          fetchBackendCreators(),
          fetchBackendCampaigns(),
          fetchBackendBrands(),
          fetchBackendInvitations(),
          fetchBackendCollaborations(),
          fetchBackendShortlists()
        ]);

        if (!isMounted) return;

        setMarketplaceData(prev => {
          const next = { ...prev };
          if (cloudCreators.status === 'fulfilled' && cloudCreators.value?.length > 0) {
            next.creators = cloudCreators.value;
          }
          if (cloudCampaigns.status === 'fulfilled' && cloudCampaigns.value?.length > 0) {
            next.campaigns = cloudCampaigns.value;
          }
          if (cloudBrands.status === 'fulfilled' && cloudBrands.value?.length > 0) {
            next.brands = cloudBrands.value;
          }
          if (cloudInvs.status === 'fulfilled' && cloudInvs.value?.length > 0) {
            next.invitations = cloudInvs.value;
          }
          if (cloudCollabs.status === 'fulfilled' && cloudCollabs.value?.length > 0) {
            next.projects = cloudCollabs.value;
          }
          if (cloudShortlists.status === 'fulfilled' && typeof cloudShortlists.value === 'object' && Object.keys(cloudShortlists.value || {}).length > 0) {
            next.shortlists = cloudShortlists.value;
          }
          return next;
        });
      } catch (e) {
        console.warn('[CreaSync] Initial cloud sync deferred to local cache:', e);
      }
    };
    syncBackend();

    // Supabase Realtime listeners for live multi-user / multi-tab synchronicity
    const unsubInv = subscribeToInvitations(payload => {
      if (payload?.new) {
        fetchBackendInvitations().then(freshInvs => {
          if (isMounted && freshInvs?.length) {
            setMarketplaceData(prev => ({ ...prev, invitations: freshInvs }));
          }
        }).catch(() => { });
      }
    });

    const unsubCollab = subscribeToCollaborations(payload => {
      if (payload?.new) {
        fetchBackendCollaborations().then(freshCollabs => {
          if (isMounted && freshCollabs?.length) {
            setMarketplaceData(prev => ({ ...prev, projects: freshCollabs }));
          }
        }).catch(() => { });
      }
    });

    const unsubCamp = subscribeToCampaigns(payload => {
      if (payload?.new) {
        fetchBackendCampaigns().then(freshCamps => {
          if (isMounted && freshCamps?.length) {
            setMarketplaceData(prev => ({ ...prev, campaigns: freshCamps }));
          }
        }).catch(() => { });
      }
    });

    const unsubBrand = subscribeToBrands(payload => {
      if (payload?.new) {
        fetchBackendBrands().then(freshBrands => {
          if (isMounted && freshBrands?.length) {
            setMarketplaceData(prev => ({ ...prev, brands: freshBrands }));
          }
        }).catch(() => { });
      }
    });

    const unsubCreator = subscribeToCreators(payload => {
      if (payload?.new) {
        fetchBackendCreators().then(freshCreators => {
          if (isMounted && freshCreators?.length) {
            setMarketplaceData(prev => ({ ...prev, creators: freshCreators }));
          }
        }).catch(() => { });
      }
    });

    return () => {
      isMounted = false;
      unsubInv();
      unsubCollab();
      unsubCamp();
      unsubBrand();
      unsubCreator();
    };
  }, []);

  // Supabase Realtime message subscription - strictly gated to authenticated sessions
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    const unsubMsg = subscribeToMessages(null, (newMsg) => {
      if (!isMounted || !newMsg || !newMsg.conversationId) return;
      setMarketplaceData(prev => {
        let matched = false;
        const nextConns = (prev.connections || []).map(conn => {
          const canonicalMatch = conn.id === newMsg.conversationId ||
            (conn.campaignId && conn.creatorId && newMsg.conversationId === `conn-${conn.campaignId}-${conn.creatorId}`);
          if (canonicalMatch) {
            matched = true;
            return {
              ...conn,
              messages: reconcileMessages(conn.messages || [], newMsg)
            };
          }
          return conn;
        });
        if (!matched) return prev;
        return { ...prev, connections: nextConns };
      });
    });

    return () => {
      isMounted = false;
      if (typeof unsubMsg === 'function') {
        unsubMsg();
      }
    };
  }, [currentUser?.id]);

  // Derive effective active brand ID strictly aligned with currentUser
  const effectiveBrandId = useMemo(() => {
    const role = resolveUserRole(currentUser);
    if (role === 'brand' && currentUser?.email && currentUser.email !== 'lumina.demo@alloy.market') {
      const emailKey = currentUser.email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '-');
      return `brand-${emailKey}`;
    }
    return activeBrandId || 'brand-demo-lumina';
  }, [currentUser, activeBrandId]);

  // Derived Brand-Scoped Data (Strict Data Isolation)
  const brandScoped = getBrandScopedData(marketplaceData, effectiveBrandId, isDemoMode);
  const currentBrand = brandScoped.currentBrand;
  const brandCampaigns = brandScoped.campaigns;
  const activeCampaign = brandScoped.activeCampaign || brandCampaigns[0] || null;
  const brandInvitations = brandScoped.invitations;
  const brandProjects = brandScoped.projects;
  const brandShortlists = brandScoped.shortlists;

  // Derive synchronized connections ensuring all invitations have matching threads
  // and both Brand and Creator share the exact same canonical conversation ID
  const synchronizedConnections = useMemo(() => {
    if (!currentUser) return [];
    const conns = [...connections];
    (invitations || []).forEach(inv => {
      if (!inv.creatorId) return;
      const canonicalId = inv.campaignId
        ? `conn-${inv.campaignId}-${inv.creatorId}`
        : `conn-${inv.brandId || 'brand-general'}-${inv.creatorId}`;

      const existingIndex = conns.findIndex(c =>
        c.id === canonicalId || c.id === inv.id || (c.creatorId === inv.creatorId && c.campaignId === inv.campaignId)
      );

      const initialMsg = {
        id: `msg-inv-${inv.id}`,
        sender: 'brand',
        senderName: inv.brandName || 'Brand Partner',
        text: inv.summary || `Direct invitation from ${inv.brandName || 'Brand Partner'} to collaborate.`,
        timestamp: inv.createdAt || 'Just now'
      };

      if (existingIndex === -1) {
        conns.push({
          id: canonicalId,
          brandId: inv.brandId || 'brand-general',
          creatorId: inv.creatorId,
          creatorName: inv.creatorName,
          creatorRole: "Creative Partner",
          creatorAvatar: inv.creatorAvatar,
          campaignId: inv.campaignId,
          campaignTitle: inv.campaignTitle,
          brandName: inv.brandName || 'Brand Partner',
          status: 'connected',
          createdAt: inv.createdAt || 'Just now',
          connectedAt: 'Just now',
          messages: [initialMsg]
        });
      } else {
        const existing = conns[existingIndex];
        if (!existing.messages || existing.messages.length === 0) {
          conns[existingIndex] = {
            ...existing,
            messages: [initialMsg]
          };
        }
      }
    });
    return conns.map(conn => ({
      ...conn,
      messages: deduplicateMessages(conn.messages || [])
    }));
  }, [connections, invitations, currentUser]);

  // Derived Brand Connections from synchronized connections
  const brandConnections = useMemo(() => {
    if (!currentUser) return [];
    return synchronizedConnections.filter(conn =>
      !conn.brandId || conn.brandId === currentBrand?.id || conn.brandId === 'brand-general'
    );
  }, [synchronizedConnections, currentBrand?.id, currentUser]);

  // Visible brands: When a real brand user is logged in, ONLY their brand is in the architecture (no demo brands!)
  const visibleBrands = useMemo(() => {
    if (!currentUser || currentUser.email === 'lumina.demo@alloy.market') {
      const demoList = (marketplaceData.brands || DEMO_BRANDS).filter(b => b.isDemo);
      return demoList.length > 0 ? demoList : (marketplaceData.brands || DEMO_BRANDS);
    }
    const myBrands = (marketplaceData.brands || []).filter(b => !b.isDemo && (b.id === effectiveBrandId || b.userId === currentUser.id));
    if (myBrands.length > 0) return myBrands;
    return currentBrand ? [currentBrand] : [];
  }, [marketplaceData.brands, effectiveBrandId, currentUser, currentBrand]);

  // Public Creator Opportunities (strictly published only)
  const publicOpportunities = getPublicCreatorOpportunities(marketplaceData);

  // Saved / Favorited creators
  const [savedCreatorIds, setSavedCreatorIds] = useState(['elena-rostova', 'kai-sorenson']);

  // Modals state
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteTargetCreator, setInviteTargetCreator] = useState(null);

  // Persistent pointer to the creator profile published on this device or matching authenticated creator
  const myCreator = useMemo(() => {
    const role = resolveUserRole(currentUser);
    if (role === 'creator') {
      if (currentUser?.email === 'maya.demo@alloy.market') {
        return creatorsList.find(c => c.id === 'maya-chen') || creatorsList[0] || null;
      }
      const matched = creatorsList.find(c =>
        c.user_id === currentUser?.id ||
        c.userId === currentUser?.id ||
        c.email === currentUser?.email ||
        (currentUser?.id && c.id === `creator-${currentUser.id.slice(0, 8)}`) ||
        (currentUser?.email && c.id === `creator-${currentUser.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-')}`)
      );
      if (matched) return matched;

      if (currentUser?.email) {
        const creatorId = `creator-${currentUser.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-')}`;
        return {
          id: creatorId,
          name: currentUser.display_name || currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
          handle: `@${currentUser.email.split('@')[0]}`,
          specialty: 'AI Digital Art & Visuals',
          location: 'Global / Remote',
          bio: 'Verified digital creator on Alloy.',
          creativeIdentity: 'Modern Editorial & Digital Aesthetics',
          rating: 5.0,
          collaborationsCount: 0,
          status: 'Published',
          isDemo: false
        };
      }
    }

    const myCreatorId = marketplaceData.myCreatorId || null;
    return myCreatorId ? (creatorsList.find(c => c.id === myCreatorId) || null) : null;
  }, [currentUser, creatorsList, marketplaceData.myCreatorId]);

  // Creator-Scoped Invitations: strictly invitations for this creator
  const creatorInvitations = useMemo(() => {
    if (!myCreator) return invitations;
    const filtered = (invitations || []).filter(inv =>
      inv.creatorId === myCreator.id ||
      inv.creator_id === myCreator.id ||
      (myCreator.id === 'maya-chen' && (inv.creatorId === 'maya-chen' || inv.creatorName === 'Maya Chen'))
    );
    return filtered.length > 0 ? filtered : (myCreator.id === 'maya-chen' ? invitations : filtered);
  }, [invitations, myCreator]);

  // Creator-Scoped Projects (Active Collaborations): strictly collaborations for this creator
  const creatorProjects = useMemo(() => {
    if (!myCreator) return projects;
    const filtered = (projects || []).filter(p =>
      p.creatorId === myCreator.id ||
      p.creator_id === myCreator.id ||
      (myCreator.id === 'maya-chen' && (p.creatorId === 'maya-chen' || p.creatorName === 'Maya Chen'))
    );
    return filtered.length > 0 ? filtered : (myCreator.id === 'maya-chen' ? projects : filtered);
  }, [projects, myCreator]);

  // Informative Modals & Authentication
  const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isForBrandsOpen, setIsForBrandsOpen] = useState(false);
  const [isForCreatorsOpen, setIsForCreatorsOpen] = useState(false);

  // Project detail modal
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectCreator, setSelectedProjectCreator] = useState(null);

  // Why this creator explanation modal
  const [whyModalCreator, setWhyModalCreator] = useState(null);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);

  // Direct 1-on-1 Conversation modal
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [activeConversationConnection, setActiveConversationConnection] = useState(null);
  const [conversationUserRole, setConversationUserRole] = useState('brand');

  // Global Direct Messaging Drawer State
  const [isMessagingDrawerOpen, setIsMessagingDrawerOpen] = useState(false);
  const [activeMessagingConnectionId, setActiveMessagingConnectionId] = useState(null);

  // Synchronize active conversation object whenever connection state updates
  useEffect(() => {
    if (activeConversationConnection?.id) {
      const updated = (marketplaceData.connections || []).find(c => c.id === activeConversationConnection.id);
      if (updated && updated !== activeConversationConnection) {
        setActiveConversationConnection(updated);
      }
    }
  }, [marketplaceData.connections]);



  // Role Conflict Resolution State
  const [isRoleConflictOpen, setIsRoleConflictOpen] = useState(false);
  const [conflictAttemptedRole, setConflictAttemptedRole] = useState('brand');

  // Authentication & OAuth session synchronization
  useEffect(() => {
    let isMounted = true;
    let authListener = null;

    // Check for direct Google Cloud Console OAuth 2.0 return (#id_token=...)
    if (typeof window !== 'undefined' && window.location.hash.includes('id_token=')) {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const idToken = hashParams.get('id_token');
        if (idToken) {
          const intendedRole = sessionStorage.getItem('creasync_intended_role')
            || localStorage.getItem('creasync_intended_role')
            || 'brand';

          // Clean up URL hash cleanly
          window.history.replaceState(null, '', window.location.pathname + window.location.search);

          handleGoogleTokenResponse(idToken, intendedRole).then(authedUser => {
            if (!isMounted || !authedUser) return;
            updateActiveUser(authedUser);
            setAuthLoading(false);
            executePendingActionOrRoute(authedUser, intendedRole);
          }).catch(e => {
            console.warn('[Google OAuth] Direct token handling error:', e);
          });
          return;
        }
      } catch (hashErr) {
        console.warn('[Google OAuth] Hash extraction note:', hashErr);
      }
    }

    if (isSupabaseConfigured() && supabase) {
      // 1. Validate session against Supabase Auth server on mount
      getCurrentUser().then(user => {
        if (!isMounted) return;
        if (user) {
          updateActiveUser(user);
          syncUserProfileSafely(user, null);
        } else {
          const localUser = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('creasync_active_user') || 'null')
            : null;
          if (localUser) {
            updateActiveUser(localUser);
          } else {
            updateActiveUser(null);
          }
        }
        setAuthLoading(false);
      }).catch(err => {
        console.warn('[CreaSync Auth] Session validation note:', err);
        const localUser = typeof window !== 'undefined'
          ? JSON.parse(localStorage.getItem('creasync_active_user') || 'null')
          : null;
        if (localUser) {
          updateActiveUser(localUser);
        } else {
          updateActiveUser(null);
        }
        if (isMounted) setAuthLoading(false);
      });

      // 2. Reactively handle OAuth callbacks & auth transitions without races
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN') {
          if (session?.user) {
            // Retrieve intended role preserved across OAuth redirect
            let intendedRole = null;
            if (typeof window !== 'undefined') {
              try {
                intendedRole = sessionStorage.getItem('creasync_intended_role')
                  || localStorage.getItem('creasync_intended_role');
              } catch (e) { }
            }

            // Sync user profile (preserves existing verified profile roles!)
            const syncedProfile = await syncUserProfileSafely(session.user, intendedRole);

            // Validate user and load verified database profile
            const verifiedUser = await getCurrentUser();
            const active = verifiedUser || { ...session.user, profile: syncedProfile };
            if (syncedProfile && active) {
              active.profile = syncedProfile;
            }
            const activeRole = active?.profile?.role
              || (active?.role !== 'authenticated' ? active?.role : null)
              || intendedRole
              || (typeof window !== 'undefined' ? localStorage.getItem('creasync_active_role') : null)
              || 'brand';

            active.role = activeRole;
            if (!active.profile) {
              active.profile = { role: activeRole };
            } else {
              active.profile.role = activeRole;
            }

            if (typeof window !== 'undefined') {
              localStorage.setItem('creasync_active_user', JSON.stringify(active));
              localStorage.setItem('creasync_active_role', activeRole);
            }

            updateActiveUser(active);
            setAuthLoading(false);

            // Detect if this event is an active OAuth return, pending action, or fresh login
            const hasPendingAction = typeof window !== 'undefined' && !!sessionStorage.getItem('creasync_pending_action');
            const isOAuthReturn = !!intendedRole || (typeof window !== 'undefined' && (
              window.location.hash.includes('access_token=') ||
              window.location.search.includes('code=')
            ));

            if (isOAuthReturn || hasPendingAction) {
              executePendingActionOrRoute(active, intendedRole);
            }
          }
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            const verifiedUser = await getCurrentUser();
            updateActiveUser(verifiedUser || session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          updateActiveUser(null);
          setAuthLoading(false);
        }
      });

      authListener = subscription;
    } else {
      // Fallback for offline/local simulation
      getCurrentUser().then(user => {
        if (isMounted) {
          if (user) {
            updateActiveUser(user);
          }
          setAuthLoading(false);
        }
      }).catch(() => {
        if (isMounted) setAuthLoading(false);
      });
    }

    return () => {
      isMounted = false;
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, []);

  // Executes pending action queued before login/OAuth redirect, or routes to appropriate workspace
  const executePendingActionOrRoute = (user, explicitRole = null) => {
    if (user) {
      updateActiveUser(user);
    }
    const activeUser = user || currentUserRef.current || currentUser;

    let action = pendingAction;
    if (!action) {
      try {
        const stored = sessionStorage.getItem('creasync_pending_action');
        if (stored) {
          action = JSON.parse(stored);
        }
      } catch (e) { }
    }

    try {
      sessionStorage.removeItem('creasync_pending_action');
    } catch (e) { }
    setPendingAction(null);
    setLoginNotice(null);
    setIsLoginOpen(false); // Close login modal on successful authentication

    // Role-based routing hierarchy:
    // 1. Database-verified profile role (Preserve existing persisted role!)
    // 2. Explicit role passed to this execution (if user had no existing profile role)
    // 3. Stored intent from current login flow (if user had no existing profile role)
    // 4. User metadata (role or intended_role)
    // 5. Active role stored in localStorage
    const storedIntent = typeof window !== 'undefined'
      ? (sessionStorage.getItem('creasync_intended_role') || localStorage.getItem('creasync_intended_role'))
      : null;
    const storedActive = typeof window !== 'undefined'
      ? localStorage.getItem('creasync_active_role')
      : null;

    const existingProfileRole = (activeUser?.profile?.role === 'creator' || activeUser?.profile?.role === 'brand')
      ? activeUser.profile.role
      : null;

    const resolvedRole = existingProfileRole
      || (explicitRole === 'creator' || explicitRole === 'brand' ? explicitRole : null)
      || (storedIntent === 'creator' || storedIntent === 'brand' ? storedIntent : null)
      || resolveUserRole(activeUser)
      || (storedActive === 'creator' || storedActive === 'brand' ? storedActive : null);

    if (resolvedRole === 'brand' || resolvedRole === 'creator') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('creasync_active_role', resolvedRole);
      }
      if (activeUser) {
        if (!activeUser.profile || !activeUser.profile.role) {
          activeUser.profile = { ...(activeUser.profile || {}), role: resolvedRole };
        }
        activeUser.role = resolvedRole;
        if (typeof window !== 'undefined') {
          localStorage.setItem('creasync_active_user', JSON.stringify(activeUser));
        }
      }
    }

    // Consume one-time OAuth intent after routing
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('creasync_intended_role');
        localStorage.removeItem('creasync_intended_role');
      } catch (e) { }
    }

    if (action) {
      switch (action.type) {
        case 'CREATE_CAMPAIGN':
          setIsCampaignModalOpen(true);
          return;
        case 'INVITE_CREATOR':
          if (action.creator) {
            setInviteTargetCreator(action.creator);
            setIsInviteModalOpen(true);
          }
          return;
        case 'TOGGLE_SAVE':
          if (action.creatorId) {
            setSavedCreatorIds(prev =>
              prev.includes(action.creatorId)
                ? prev.filter(id => id !== action.creatorId)
                : [...prev, action.creatorId]
            );
          }
          return;
        case 'OPEN_CONVERSATION':
          if (action.connection) {
            setActiveConversationConnection(action.connection);
            setConversationUserRole(action.userRole || 'brand');
            setIsConversationOpen(true);
          }
          return;
        case 'OPEN_MESSAGES':
          if (action.connId) {
            setActiveMessagingConnectionId(action.connId);
          }
          setCurrentView('messages');
          window.location.hash = '/messages';
          setIsMessagingDrawerOpen(true);
          return;
        case 'PUBLISH_CREATOR':
          if (action.creator) {
            // Same persistence path as handlePublishCreator — ownership pointer must land
            // in localStorage before backend sync to avoid stale shared-store snapshots
            saveMarketplaceState({
              ...updateCreatorRecord(getInitialMarketplaceState(), action.creator),
              myCreatorId: action.creator.id
            });
            setMarketplaceData(prev => ({
              ...updateCreatorRecord(prev, action.creator),
              myCreatorId: action.creator.id
            }));
            setActiveCreatorId(action.creator.id);
            saveBackendCreator(action.creator).catch(err => {
              console.warn('[CreaSync] Background creator sync deferred:', err);
            });
            navigateTo('creator-workspace', null, activeUser);
          }
          return;
        case 'NAVIGATE':
          if (action.view === 'brand-workspace') {
            if (resolvedRole === 'brand') {
              navigateTo('brand-workspace', null, activeUser);
            } else if (resolvedRole === 'creator') {
              setConflictAttemptedRole('brand');
              setIsRoleConflictOpen(true);
            } else {
              setIsRoleSelectOpen(true);
            }
            return;
          } else if (action.view === 'creator-workspace') {
            if (resolvedRole === 'creator') {
              navigateTo('creator-workspace', null, activeUser);
            } else if (resolvedRole === 'brand') {
              setConflictAttemptedRole('creator');
              setIsRoleConflictOpen(true);
            } else {
              setIsRoleSelectOpen(true);
            }
            return;
          } else if (action.view) {
            navigateTo(action.view, null, activeUser);
            return;
          }
          break;
        default:
          break;
      }
    }

    if (resolvedRole === 'creator') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('creasync_active_role', 'creator');
      }
      navigateTo('creator-workspace', null, activeUser);
    } else if (resolvedRole === 'brand') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('creasync_active_role', 'brand');
      }
      navigateTo('brand-workspace', null, activeUser);
    } else {
      // Missing role: prompt explicitly
      console.warn('[CreaSync Auth] Missing role for authenticated user; opening role selection');
      setIsRoleSelectOpen(true);
    }
  };

  // Guard wrapper for actions that require authentication
  const requireAuth = (actionConfig, onAuthorized) => {
    const activeUser = currentUserRef.current || currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('creasync_active_user') || 'null') : null);
    if (activeUser) {
      if (typeof onAuthorized === 'function') {
        onAuthorized();
      }
      return true;
    }

    setPendingAction(actionConfig);
    const targetRole = actionConfig.role || 'brand';
    try {
      sessionStorage.setItem('creasync_pending_action', JSON.stringify(actionConfig));
      sessionStorage.setItem('creasync_intended_role', targetRole);
      localStorage.setItem('creasync_intended_role', targetRole);
    } catch (e) { }

    setLoginInitialRole(targetRole);
    setLoginNotice(actionConfig.notice || 'Authentication required to proceed');
    setIsLoginOpen(true);
    return false;
  };

  // Contextual authentication for "I want to hire"
  const handleHireAction = () => {
    const activeUser = currentUserRef.current || currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('creasync_active_user') || 'null') : null);
    if (!activeUser) {
      requireAuth({
        type: 'NAVIGATE',
        view: 'brand-workspace',
        role: 'brand',
        notice: 'Please sign in to access Brand Studio and hire creators'
      }, () => {
        navigateTo('brand-workspace');
      });
      return;
    }

    const currentRole = resolveUserRole(activeUser);

    if (currentRole === 'brand') {
      navigateTo('brand-workspace', null, activeUser);
    } else if (currentRole === 'creator') {
      // Explicit role conflict handling without silent overwrite
      setConflictAttemptedRole('brand');
      setIsRoleConflictOpen(true);
    } else {
      // Missing role: prompt explicitly
      setIsRoleSelectOpen(true);
    }
  };

  // Contextual authentication for "I'm a creator"
  const handleCreatorAction = () => {
    const activeUser = currentUserRef.current || currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('creasync_active_user') || 'null') : null);
    if (!activeUser) {
      requireAuth({
        type: 'NAVIGATE',
        view: 'creator-workspace',
        role: 'creator',
        notice: 'Please sign in to access Creator Studio and build your portfolio'
      }, () => {
        navigateTo('creator-workspace');
      });
      return;
    }

    const currentRole = resolveUserRole(activeUser);

    if (currentRole === 'creator') {
      navigateTo('creator-workspace', null, activeUser);
    } else if (currentRole === 'brand') {
      // Explicit role conflict handling without silent overwrite
      setConflictAttemptedRole('creator');
      setIsRoleConflictOpen(true);
    } else {
      // Missing role: prompt explicitly
      setIsRoleSelectOpen(true);
    }
  };

  const handleLogout = async () => {
    await backendSignOut();
    updateActiveUser(null);
    setPendingAction(null);
    setLoginNotice(null);
    setIsLoginOpen(false);
    setIsMessagingDrawerOpen(false);
    setIsConversationOpen(false);
    setActiveMessagingConnectionId(null);
    setActiveConversationConnection(null);
    handleSwitchBrand('brand-demo-lumina');
    handleToggleDemoMode(true);
    try {
      sessionStorage.removeItem('creasync_pending_action');
      sessionStorage.removeItem('creasync_intended_role');
      localStorage.removeItem('creasync_active_user');
      localStorage.removeItem('creasync_active_role');
    } catch (e) { }
    navigateTo('home', null, null);
  };

  const handleOpenWhyModal = (creator) => {
    setWhyModalCreator(creator);
    setIsWhyModalOpen(true);
  };

  const handleOpenConversation = (conn, userRole = 'brand') => {
    requireAuth(
      { type: 'OPEN_CONVERSATION', connection: conn, userRole, role: userRole, notice: 'Please sign in to access collaboration discussions' },
      () => {
        setActiveConversationConnection(conn);
        setConversationUserRole(userRole);
        setActiveMessagingConnectionId(conn?.id || null);
        setIsMessagingDrawerOpen(true);
      }
    );
  };

  // --- Context-Aware Direct Messages Navigation ---
  const handleOpenMessages = (connId = null) => {
    const activeUser = currentUserRef.current || currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('creasync_active_user') || 'null') : null);
    const connIdStr = typeof connId === 'string' ? connId : (connId?.id || connId?.conversationId || connId?.connectionId);
    if (connIdStr) {
      setActiveMessagingConnectionId(connIdStr);
    }

    if (!activeUser) {
      try {
        sessionStorage.setItem('creasync_pending_action', JSON.stringify({
          type: 'OPEN_MESSAGES',
          connId: connIdStr || null
        }));
      } catch (e) { }
      setIsMessagingDrawerOpen(false);
      navigateTo('messages', connIdStr || null);
      return;
    }

    navigateTo('messages', connIdStr || null);
    setIsMessagingDrawerOpen(true);
  };

  // --- Robust Messaging Action with Optimistic Update and Rollback ---
  const sendingMessageLocksRef = useRef(new Set());

  const handleSendMessage = async (connectionIdOrPayload, newMsg) => {
    // Robustly resolve the conversation ID and message payload regardless of calling convention
    const conversationId = typeof connectionIdOrPayload === 'string'
      ? connectionIdOrPayload
      : (connectionIdOrPayload?.conversationId || connectionIdOrPayload?.connectionId || connectionIdOrPayload?.id);
    const connectionId = conversationId;

    if (!conversationId) {
      throw new Error('Conversation ID is required.');
    }

    const activeUser = currentUserRef.current || currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('creasync_active_user') || 'null') : null);
    if (!activeUser) {
      requireAuth({
        type: 'OPEN_MESSAGES',
        connId: connectionId,
        role: activeRole || 'brand',
        notice: 'Please sign in to send messages'
      });
      throw new Error('Authentication required to send messages.');
    }

    const payload = (typeof connectionIdOrPayload === 'object' && connectionIdOrPayload !== null && !newMsg)
      ? connectionIdOrPayload
      : (newMsg || {});

    const trimmedText = (payload?.text || '').trim();
    if (!trimmedText) {
      throw new Error('Message cannot be empty or whitespace-only.');
    }

    const matchesConn = (c) => c.id === connectionId || (c.campaignId && c.creatorId && connectionId === `conn-${c.campaignId}-${c.creatorId}`);

    // Verify conversation authorization
    if (synchronizedConnections.length > 0) {
      const targetConn = synchronizedConnections.find(matchesConn);
      if (!targetConn) {
        throw new Error('Unauthorized conversation access.');
      }
    }

    // Duplicate submission guard per connection
    const lockKey = `${connectionId}:${trimmedText}`;
    if (sendingMessageLocksRef.current.has(lockKey)) {
      console.warn('[Messaging] Duplicate message send rejected for in-flight request');
      return;
    }
    sendingMessageLocksRef.current.add(lockKey);

    const tempMsgId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const senderRole = payload.sender || (currentView === 'creator-workspace' ? 'creator' : 'brand');
    const senderName = payload.senderName || (senderRole === 'creator' ? (activeCreator?.name || 'Creator') : (currentBrand?.name || 'Brand Partner'));
    const timestampStr = payload.timestamp || 'Just now';

    const optimisticMessage = {
      id: tempMsgId,
      conversationId,
      sender: senderRole,
      senderName,
      text: trimmedText,
      timestamp: timestampStr,
      createdAt: new Date().toISOString(),
      isPending: true
    };

    // 1. Optimistic update in marketplace state with deduplication
    setMarketplaceData(prev => {
      let found = false;
      const nextConnections = (prev.connections || []).map(conn => {
        if (matchesConn(conn)) {
          found = true;
          return {
            ...conn,
            messages: reconcileMessages(conn.messages || [], optimisticMessage)
          };
        }
        return conn;
      });

      if (!found) {
        nextConnections.unshift({
          id: connectionId,
          status: 'connected',
          createdAt: 'Just now',
          messages: [optimisticMessage]
        });
      }

      return {
        ...prev,
        connections: nextConnections
      };
    });

    // Update active conversation modal reference immediately
    setActiveConversationConnection(prev => {
      if (!prev || !matchesConn(prev)) return prev;
      return {
        ...prev,
        messages: reconcileMessages(prev.messages || [], optimisticMessage)
      };
    });

    try {
      // 2. Asynchronous backend persistence
      const persisted = await sendBackendMessage({
        conversationId,
        connectionId,
        sender: senderRole,
        senderName,
        text: trimmedText,
        timestamp: timestampStr,
        userId: activeUser?.id,
        actorName: senderName
      });

      // 3. Reconcile optimistic message with persisted message
      setMarketplaceData(prev => ({
        ...prev,
        connections: (prev.connections || []).map(conn => {
          if (matchesConn(conn)) {
            return {
              ...conn,
              messages: reconcileMessages(conn.messages || [], persisted, tempMsgId)
            };
          }
          return conn;
        })
      }));

      setActiveConversationConnection(prev => {
        if (!prev || !matchesConn(prev)) return prev;
        return {
          ...prev,
          messages: reconcileMessages(prev.messages || [], persisted, tempMsgId)
        };
      });

      return persisted;
    } catch (err) {
      console.error('[Messaging] Persistence failed, rolling back optimistic update:', err);
      // 4. Reliable rollback on error
      setMarketplaceData(prev => ({
        ...prev,
        connections: (prev.connections || []).map(conn => {
          if (matchesConn(conn)) {
            return {
              ...conn,
              messages: (conn.messages || []).filter(m => m.id !== tempMsgId)
            };
          }
          return conn;
        })
      }));

      setActiveConversationConnection(prev => {
        if (!prev || !matchesConn(prev)) return prev;
        return {
          ...prev,
          messages: (prev.messages || []).filter(m => m.id !== tempMsgId)
        };
      });

      throw err;
    } finally {
      sendingMessageLocksRef.current.delete(lockKey);
    }
  };

  // Hash & URL Synchronization with Protected Route Guards
  // Stabilized with ref so creator state updates do not re-trigger scroll or auth-dependent effects
  const creatorsListRef = useRef(creatorsList);
  useEffect(() => {
    creatorsListRef.current = creatorsList;
  }, [creatorsList]);

  useEffect(() => {
    if (authLoading) return; // Prevent race conditions during initial session restoration

    const handleLocationChange = () => {
      const hash = window.location.hash.replace('#', '');
      const activeUser = currentUserRef.current || currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('creasync_active_user') || 'null') : null);
      const currentRole = resolveUserRole(activeUser);

      if (hash.startsWith('/creator/join')) {
        setCurrentView('creator-join');
      } else if (hash === '/creator') {
        // Protected Route Guard: Creator Studio
        if (!activeUser) {
          requireAuth({
            type: 'NAVIGATE',
            view: 'creator-workspace',
            role: 'creator',
            notice: 'Please sign in to access Creator Studio'
          });
          setCurrentView('home');
          window.location.hash = '';
          return;
        }

        if (currentRole === 'creator') {
          setCurrentView('creator-workspace');
        } else if (currentRole === 'brand') {
          setConflictAttemptedRole('creator');
          setIsRoleConflictOpen(true);
          setCurrentView('home');
          window.location.hash = '';
        } else {
          setIsRoleSelectOpen(true);
          setCurrentView('home');
          window.location.hash = '';
        }
      } else if (hash.startsWith('/creator/')) {
        const id = hash.replace('/creator/', '');
        const found = creatorsListRef.current.find(c => c.id === id);
        if (found) {
          setActiveCreatorId(id);
          setCurrentView('creator-profile');
        } else {
          // Missing creator: surface it explicitly instead of showing another creator's profile
          setActiveCreatorId(id || null);
          setCurrentView('creator-not-found');
        }
      } else if (hash === 'discover') {
        setCurrentView('discover');
      } else if (hash === 'brand-trust-center' || hash === '/brand/trust-center' || hash === '/brand-trust-center') {
        setCurrentView('brand-trust-center');
      } else if (hash === 'trust-center' || hash === '/trust-center') {
        const role = resolveUserRole(activeUser);
        if (role === 'brand') {
          setCurrentView('brand-trust-center');
        } else {
          setCurrentView('trust-center');
        }
      } else if (hash === '/brand/onboard') {
        setCurrentView('brand-onboard');
      } else if (hash === '/brand') {
        // Protected Route Guard: Brand Studio
        if (!activeUser) {
          requireAuth({
            type: 'NAVIGATE',
            view: 'brand-workspace',
            role: 'brand',
            notice: 'Please sign in to access Brand Studio'
          });
          setCurrentView('home');
          window.location.hash = '';
          return;
        }

        if (currentRole === 'brand') {
          setCurrentView('brand-workspace');
        } else if (currentRole === 'creator') {
          setConflictAttemptedRole('brand');
          setIsRoleConflictOpen(true);
          setCurrentView('home');
          window.location.hash = '';
        } else {
          setIsRoleSelectOpen(true);
          setCurrentView('home');
          window.location.hash = '';
        }
      } else if (hash === 'messages' || hash.startsWith('/messages') || hash.startsWith('messages')) {
        const parts = hash.replace(/^\/?messages\/?/, '');
        const targetConnId = parts || null;
        if (targetConnId) {
          setActiveMessagingConnectionId(targetConnId);
        }
        setCurrentView('messages');
        if (activeUser) {
          handleOpenMessages(targetConnId);
        }
      } else if (hash === '/admin/login' || hash === 'admin/login') {
        setCurrentView('admin-login');
      } else if (hash === '/admin/dashboard' || hash === 'admin/dashboard' || hash === '/admin' || hash === 'admin') {
        // Super Admin Guard
        const storedAdmin = getAdminActiveSession();
        if (storedAdmin && (storedAdmin.role === 'super_admin' || storedAdmin.role === 'admin' || storedAdmin.role === 'judge_admin')) {
          setCurrentAdmin(storedAdmin);
          setCurrentView('admin-dashboard');
        } else {
          verifyAdminSession().then(res => {
            if (res.ok && res.user) {
              setCurrentAdmin(res.user);
              setCurrentView('admin-dashboard');
            } else {
              setCurrentView('admin-login');
              window.location.hash = '/admin/login';
            }
          }).catch(() => {
            setCurrentView('admin-login');
            window.location.hash = '/admin/login';
          });
        }
      } else {
        setCurrentView('home');
      }
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleLocationChange);
    handleLocationChange();
    return () => window.removeEventListener('hashchange', handleLocationChange);
  }, [authLoading, currentUser]);

  const navigateTo = (view, extraId = null, overrideUser = null) => {
    const activeUser = overrideUser || currentUserRef.current || currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('creasync_active_user') || 'null') : null);
    const currentRole = resolveUserRole(activeUser);

    if (view === 'brand-workspace') {
      if (!activeUser) {
        requireAuth({
          type: 'NAVIGATE',
          view: 'brand-workspace',
          role: 'brand',
          notice: 'Please sign in to access Brand Studio'
        });
        return;
      }
      if (currentRole === 'creator') {
        setConflictAttemptedRole('brand');
        setIsRoleConflictOpen(true);
        return;
      }
      if (activeUser.email && activeUser.email !== 'lumina.demo@alloy.market') {
        const emailKey = activeUser.email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '-');
        const customBrandId = `brand-${emailKey}`;
        setMarketplaceData(prev => {
          if (prev.activeBrandId !== customBrandId) {
            const existingBrand = (prev.brands || []).find(b => b.id === customBrandId);
            const brandName = activeUser.profile?.display_name || activeUser.display_name || activeUser.email.split('@')[0];
            const updatedBrands = existingBrand ? prev.brands : [
              {
                id: customBrandId,
                name: brandName,
                industry: 'Creative & Digital',
                description: `${brandName} private studio workspace.`,
                aesthetic: 'Modern & Editorial',
                isDemo: false
              },
              ...(prev.brands || [])
            ];
            return {
              ...prev,
              brands: updatedBrands,
              activeBrandId: customBrandId,
              isDemoMode: false
            };
          }
          return prev;
        });
      }
      setCurrentView('brand-workspace');
      window.location.hash = '/brand';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'creator-workspace') {
      if (!activeUser) {
        requireAuth({
          type: 'NAVIGATE',
          view: 'creator-workspace',
          role: 'creator',
          notice: 'Please sign in to access Creator Studio'
        });
        return;
      }
      if (currentRole === 'brand') {
        setConflictAttemptedRole('creator');
        setIsRoleConflictOpen(true);
        return;
      }
      setCurrentView('creator-workspace');
      window.location.hash = '/creator';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }


    setCurrentView(view);
    if (view === 'creator-profile' && extraId) {
      setActiveCreatorId(extraId);
      window.location.hash = `/creator/${extraId}`;
    } else if (view === 'discover') {
      window.location.hash = 'discover';
    } else if (view === 'brand-trust-center') {
      window.location.hash = '/brand/trust-center';
    } else if (view === 'trust-center') {
      const userRole = resolveUserRole(currentUser);
      if (userRole === 'brand') {
        window.location.hash = '/brand/trust-center';
      } else {
        window.location.hash = '/trust-center';
      }
    } else if (view === 'brand-onboard') {
      window.location.hash = '/brand/onboard';
    } else if (view === 'creator-join') {
      window.location.hash = '/creator/join';
    } else if (view === 'messages') {
      window.location.hash = '/messages';
      if (extraId) setActiveMessagingConnectionId(extraId);
    } else {
      window.location.hash = '';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle Save Creator (Favorites) - Protected Action
  const handleToggleSaveCreator = (creatorId) => {
    requireAuth(
      { type: 'TOGGLE_SAVE', creatorId, role: 'brand', notice: 'Please sign in to save creators to your shortlist' },
      () => {
        setSavedCreatorIds((prev) =>
          prev.includes(creatorId)
            ? prev.filter(id => id !== creatorId)
            : [...prev, creatorId]
        );
      }
    );
  };

  // --- Brand Management Handlers ---
  const handleSwitchBrand = (brandId) => {
    const targetBrand = (marketplaceData.brands || []).find(b => b.id === brandId);
    setMarketplaceData(prev => ({
      ...prev,
      activeBrandId: brandId,
      isDemoMode: !!targetBrand?.isDemo
    }));
  };

  const handleCreateBrand = (newBrandData) => {
    const newBrand = createBrandRecord(newBrandData);
    setMarketplaceData(prev => ({
      ...prev,
      brands: [newBrand, ...(prev.brands || [])],
      activeBrandId: newBrand.id,
      isDemoMode: false
    }));
    saveBackendBrand(newBrand, currentUser?.id).catch(err => {
      console.warn('[CreaSync] Background brand sync deferred:', err);
    });
  };

  const handleUpdateBrand = (brandId, updates) => {
    setMarketplaceData(prev => {
      const updated = (prev.brands || []).map(b => b.id === brandId ? { ...b, ...updates } : b);
      const target = updated.find(b => b.id === brandId);
      if (target) {
        saveBackendBrand(target, currentUser?.id).catch(err => {
          console.warn('[CreaSync] Background brand update sync deferred:', err);
        });
      }
      return {
        ...prev,
        brands: updated,
        campaigns: (prev.campaigns || []).map(c => c.ownerBrandId === brandId ? {
          ...c,
          brandName: updates.name || c.brandName,
          brandAvatar: updates.logo || c.brandAvatar,
          brandWebsite: updates.website || c.brandWebsite
        } : c)
      };
    });
  };

  const handleToggleDemoMode = (demoActive) => {
    const demoBrand = (marketplaceData.brands || []).find(b => b.isDemo) || marketplaceData.brands?.[0];
    setMarketplaceData(prev => ({
      ...prev,
      isDemoMode: demoActive,
      activeBrandId: demoActive ? demoBrand?.id || prev.activeBrandId : prev.activeBrandId
    }));
  };

  const handleResetState = () => {
    const fresh = resetMarketplaceState();
    setMarketplaceData(fresh);
  };

  const handleRunFilteringPipeline = async (targetCampaign) => {
    const isNatural = typeof targetCampaign === 'string' || (targetCampaign && typeof targetCampaign.naturalBrief === 'string');
    const campaignToRun = isNatural
      ? targetCampaign
      : (targetCampaign || (marketplaceData.campaigns || []).find(c => c.id === marketplaceData.activeCampaignId) || marketplaceData.campaigns?.[0]);
    if (!campaignToRun) return;

    lastPipelineCampaignRef.current = campaignToRun;
    setIsPipelineTraceLoading(true);
    setPipelineError(null);
    const currentVersion = ++pipelineRunVersionRef.current;
    try {
      // Pass null creators to ensure authoritative server-side creator data is used
      const trace = await executeCampaignFilteringPipeline(campaignToRun, null);
      if (currentVersion === pipelineRunVersionRef.current) {
        setPipelineError(null);
        setPipelineTrace({
          ...trace,
          isStale: false,
          staleReason: null
        });
        setPipelineFilter({
          campaignId: trace.campaignId || (trace.interpretedBrief ? 'ai-natural-brief' : (typeof campaignToRun === 'object' ? campaignToRun?.id : 'ai-natural-brief')),
          campaignTitle: trace.interpretedBrief?.title || trace.campaignTitle || 'AI Campaign Filter',
          eligibleCreatorIds: trace.eligibleCreatorIds || [],
          rankedOrder: trace.rankedCreators || [],
          source: trace.source,
          interpretedBrief: trace.interpretedBrief,
          isStale: false
        });
        setIsPipelineTraceModalOpen(true);
      }
    } catch (err) {
      console.error('[App] Pipeline execution error:', err);
      if (currentVersion === pipelineRunVersionRef.current) {
        setPipelineError(err.message || 'Pipeline execution failed.');
        setPipelineTrace(prev => prev ? {
          ...prev,
          isStale: true,
          staleReason: `Pipeline run failed: ${err.message || 'Execution error'}. Displaying previous results as stale.`
        } : null);
        setPipelineFilter(prev => prev ? {
          ...prev,
          isStale: true,
          staleReason: `Pipeline run failed: ${err.message || 'Execution error'}. Displaying previous results as stale.`
        } : null);
        setIsPipelineTraceModalOpen(true);
      }
    } finally {
      if (currentVersion === pipelineRunVersionRef.current) {
        setIsPipelineTraceLoading(false);
      }
    }
  };

  // --- Campaign Handlers ---
  const handleSelectCampaign = (campId) => {
    setMarketplaceData(prev => ({
      ...prev,
      activeCampaignId: campId
    }));
  };

  const handleCampaignCreated = async (newCampaignData, options = {}) => {
    const finalCamp = createCampaignRecord(newCampaignData, currentBrand);
    setMarketplaceData(prev => ({
      ...prev,
      campaigns: [finalCamp, ...(prev.campaigns || [])],
      activeCampaignId: finalCamp.id
    }));
    // Asynchronously synchronize with backend cloud store
    saveBackendCampaign(finalCamp, currentBrand, currentUser?.id).catch(err => {
      console.warn('[CreaSync] Background campaign sync deferred:', err);
    });
    setIsCampaignModalOpen(false);
    navigateTo('brand-workspace');

    // Run backend filtering pipeline and present real execution trace
    try {
      lastPipelineCampaignRef.current = finalCamp;
      setIsPipelineTraceLoading(true);
      setPipelineError(null);
      const trace = await executeCampaignFilteringPipeline(finalCamp, null);
      setPipelineTrace({
        ...trace,
        isStale: false,
        staleReason: null
      });
      setIsPipelineTraceModalOpen(true);
    } catch (pipelineErr) {
      console.warn('[App] Pipeline trace presentation deferred:', pipelineErr);
      setPipelineError(pipelineErr.message || 'Pipeline execution failed.');
    } finally {
      setIsPipelineTraceLoading(false);
    }
  };

  const handleUpdateCampaign = async (campaignId, updates) => {
    let updatedCampaign = null;
    setMarketplaceData(prev => {
      const updatedList = (prev.campaigns || []).map(c => {
        if (c.id === campaignId) {
          updatedCampaign = { ...c, ...updates, updatedAt: 'Just now' };
          saveBackendCampaign(updatedCampaign, currentBrand, currentUser?.id).catch(err => {
            console.warn('[CreaSync] Background campaign update sync deferred:', err);
          });
          return updatedCampaign;
        }
        return c;
      });
      return {
        ...prev,
        campaigns: updatedList
      };
    });

    if (!updatedCampaign) {
      const existing = (marketplaceData.campaigns || []).find(c => c.id === campaignId);
      if (existing) {
        updatedCampaign = { ...existing, ...updates };
        saveBackendCampaign(updatedCampaign, currentBrand, currentUser?.id).catch(err => {
          console.warn('[CreaSync] Background campaign update sync deferred:', err);
        });
      }
    }

    if (!updatedCampaign) return;

    lastPipelineCampaignRef.current = updatedCampaign;

    // Fix 1: Automatically rerun pipeline after Update Campaign and show running/presenting state
    setIsPipelineTraceLoading(true);
    setPipelineError(null);
    setIsPipelineTraceModalOpen(true);

    const isCurrentTraceCampaign = pipelineTrace && (pipelineTrace.campaignId === campaignId || !pipelineTrace.campaignId);
    const isCurrentFilterCampaign = pipelineFilter && pipelineFilter.campaignId === campaignId;

    // Invalidate prior trace immediately: retain prior results labeled as stale while re-running
    setPipelineTrace(prev => prev ? {
      ...prev,
      isStale: true,
      staleReason: 'Campaign brief requirements updated. Re-evaluating pipeline…'
    } : null);

    if (isCurrentFilterCampaign) {
      setPipelineFilter(prev => prev ? {
        ...prev,
        isStale: true,
        staleReason: 'Campaign brief requirements updated. Re-running pipeline…'
      } : null);
    }

    // Race condition guard: increment version token so older responses cannot overwrite newer results
    const currentVersion = ++pipelineRunVersionRef.current;

    try {
      const freshTrace = await executeCampaignFilteringPipeline(updatedCampaign, null);

      // Replace prior results only after a successful new run
      if (currentVersion === pipelineRunVersionRef.current) {
        setPipelineError(null);
        setPipelineTrace({
          ...freshTrace,
          isStale: false,
          staleReason: null
        });

        // Update Discover Creators filter with the exact new eligible set and ranking
        if (isCurrentFilterCampaign) {
          setPipelineFilter({
            campaignId,
            campaignTitle: updatedCampaign.title || freshTrace.campaignTitle,
            eligibleCreatorIds: freshTrace.eligibleCreatorIds || [],
            rankedOrder: freshTrace.rankedCreators || [],
            isStale: false
          });
        }
      }
    } catch (err) {
      console.warn('[App] Pipeline rerun failed after brief update:', err);
      // If execution fails, preserve error in state
      if (currentVersion === pipelineRunVersionRef.current) {
        setPipelineError(err.message || 'Pipeline execution failed.');
        setPipelineTrace(prev => prev ? {
          ...prev,
          isStale: true,
          staleReason: `Pipeline re-evaluation failed: ${err.message || 'Execution error'}. Displaying previous results as stale.`
        } : null);

        if (isCurrentFilterCampaign) {
          setPipelineFilter(prev => prev ? {
            ...prev,
            isStale: true,
            staleReason: `Pipeline re-evaluation failed: ${err.message || 'Execution error'}. Displaying previous results as stale.`
          } : null);
        }
      }
    } finally {
      if (currentVersion === pipelineRunVersionRef.current) {
        setIsPipelineTraceLoading(false);
      }
    }
  };

  const handleDuplicateCampaign = (campaignId) => {
    const target = (marketplaceData.campaigns || []).find(c => c.id === campaignId);
    if (!target) return;
    const duplicated = {
      ...target,
      id: `camp-${Date.now()}`,
      title: `${target.title} (Copy)`,
      status: 'Draft',
      visibility: 'draft',
      createdAt: 'Just now',
      updatedAt: 'Just now',
      shortlist: []
    };
    setMarketplaceData(prev => ({
      ...prev,
      campaigns: [duplicated, ...(prev.campaigns || [])],
      activeCampaignId: duplicated.id
    }));
    saveBackendCampaign(duplicated, currentBrand, currentUser?.id).catch(err => {
      console.warn('[CreaSync] Background campaign duplicate sync deferred:', err);
    });
  };

  const handleDeleteCampaign = (campaignId) => {
    setMarketplaceData(prev => {
      const remaining = (prev.campaigns || []).filter(c => c.id !== campaignId);
      const nextActive = remaining.find(c => c.ownerBrandId === currentBrand?.id)?.id || remaining[0]?.id || null;
      const newShortlists = { ...(prev.shortlists || {}) };
      delete newShortlists[campaignId];
      deleteBackendCampaign(campaignId).catch(err => {
        console.warn('[CreaSync] Background campaign delete sync deferred:', err);
      });
      return {
        ...prev,
        campaigns: remaining,
        activeCampaignId: nextActive,
        shortlists: newShortlists
      };
    });
  };

  // --- Shortlist Handlers ---
  const handleToggleShortlist = (campaignId, creatorId) => {
    setMarketplaceData(prev => {
      const currentList = prev.shortlists[campaignId] || [];
      const updatedList = currentList.includes(creatorId)
        ? currentList.filter(id => id !== creatorId)
        : [...currentList, creatorId];
      toggleBackendShortlist(currentBrand?.id || 'brand-active', campaignId, creatorId).catch(err => {
        console.warn('[CreaSync] Background shortlist toggle sync deferred:', err);
      });
      return {
        ...prev,
        shortlists: {
          ...prev.shortlists,
          [campaignId]: updatedList
        }
      };
    });
  };

  // --- Invitation Handlers (Connected Journey: Part 10) ---
  const handleSendInvitation = (invData) => {
    const newInvitation = {
      id: `inv-${Date.now()}`,
      brandId: currentBrand?.id || 'brand-general',
      campaignId: invData.campaignId || activeCampaign?.id || 'camp-general',
      campaignTitle: invData.campaignTitle || activeCampaign?.title || 'Creative Campaign',
      brandName: invData.brandName || currentBrand?.name || 'Brand Partner',
      brandAvatar: currentBrand?.logo || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=120&q=80",
      creatorId: invData.creatorId,
      creatorName: invData.creatorName,
      creatorAvatar: invData.creatorAvatar,
      title: invData.title || activeCampaign?.title || 'Creative Commission',
      budget: invData.budget || activeCampaign?.budget || 'In Discussion',
      timeline: invData.timeline || activeCampaign?.timeline || '3 Weeks',
      deliverables: invData.deliverables || (Array.isArray(activeCampaign?.deliverables) ? activeCampaign.deliverables.join(' • ') : activeCampaign?.deliverables || '3x 4K Master Renders'),
      summary: invData.summary || `Direct invitation from ${currentBrand?.name || 'Brand Partner'} to collaborate.`,
      status: 'pending',
      createdAt: 'Just now'
    };

    // Open canonical connection thread in messages
    const canonicalConnId = newInvitation.campaignId
      ? `conn-${newInvitation.campaignId}-${invData.creatorId}`
      : `conn-${currentBrand?.id || 'brand-general'}-${invData.creatorId}`;

    newInvitation.conversationId = canonicalConnId;

    const initialMsgObj = {
      id: `msg-inv-${newInvitation.id}`,
      conversationId: canonicalConnId,
      sender: 'brand',
      senderName: currentBrand?.name || 'Brand Partner',
      text: newInvitation.summary,
      timestamp: 'Just now'
    };

    const newConn = {
      id: canonicalConnId,
      brandId: currentBrand?.id || 'brand-general',
      creatorId: invData.creatorId,
      creatorName: invData.creatorName,
      creatorRole: "Creative Partner",
      creatorAvatar: invData.creatorAvatar,
      campaignId: newInvitation.campaignId,
      campaignTitle: newInvitation.campaignTitle,
      brandName: currentBrand?.name || 'Brand Partner',
      status: 'connected',
      createdAt: 'Just now',
      connectedAt: 'Just now',
      messages: [initialMsgObj]
    };

    setMarketplaceData(prev => {
      const existingConnIndex = (prev.connections || []).findIndex(c =>
        c.id === canonicalConnId || (c.creatorId === invData.creatorId && c.campaignId === newInvitation.campaignId)
      );
      const nextConns = existingConnIndex >= 0
        ? prev.connections.map((c, i) => i === existingConnIndex ? { ...c, ...newConn, messages: (c.messages && c.messages.length > 0) ? c.messages : [initialMsgObj] } : c)
        : [newConn, ...(prev.connections || [])];

      return {
        ...prev,
        invitations: [newInvitation, ...prev.invitations],
        connections: nextConns
      };
    });

    sendBackendInvitation(newInvitation, currentBrand?.name, currentUser?.id).catch(err => {
      console.warn('[CreaSync] Background invitation send sync deferred:', err);
    });
  };

  // Creator Accepts Invitation -> Spawns/Activates Project
  const handleAcceptInvitation = (invitation) => {
    const existingProject = projects.find(p => p.campaignId === invitation.campaignId && p.creatorId === invitation.creatorId);

    const newProject = existingProject ? {
      ...existingProject,
      status: 'in-progress'
    } : {
      id: `proj-collab-${invitation.id}`,
      brandId: invitation.brandId || currentBrand?.id || 'brand-general',
      campaignId: invitation.campaignId,
      campaignTitle: invitation.title || invitation.campaignTitle,
      brandName: invitation.brandName || invitation.brand,
      brandContact: "Creative Director",
      creatorId: invitation.creatorId,
      creatorName: invitation.creatorName || "Maya Chen",
      creatorAvatar: invitation.creatorAvatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
      status: "in-progress",
      progressPercent: 30,
      milestone: "Milestone 1 of 3: Moodboard & Concept Alignment",
      deadline: invitation.timeline,
      agreedBudget: invitation.budget,
      deliverablesScope: invitation.deliverables,
      latestFeedback: "“Invitation accepted! Collaboration started. Looking forward to first visual passes.”",
      submissionUrl: "",
      submissionNotes: "",
      submissionPreviews: [],
      feedbackHistory: [
        {
          id: `fb-${Date.now()}`,
          author: invitation.brandName || invitation.brand,
          role: "brand",
          text: "“Welcome to the project! Concept alignment underway.”",
          timestamp: "Just now"
        }
      ],
      revisionHistory: []
    };

    setMarketplaceData(prev => ({
      ...prev,
      invitations: prev.invitations.map(inv => inv.id === invitation.id ? { ...inv, status: 'accepted' } : inv),
      projects: existingProject
        ? prev.projects.map(p => p.id === existingProject.id ? newProject : p)
        : [newProject, ...prev.projects]
    }));

    updateBackendInvitationStatus(invitation.id, 'accepted', currentUser?.display_name, currentUser?.id).catch(err => {
      console.warn('[CreaSync] Background invitation accept sync deferred:', err);
    });
    saveBackendCollaboration(newProject, currentUser?.display_name, currentUser?.id).catch(err => {
      console.warn('[CreaSync] Background collaboration sync deferred:', err);
    });
  };

  // Creator Declines Invitation
  const handleDeclineInvitation = (invitation) => {
    setMarketplaceData(prev => ({
      ...prev,
      invitations: prev.invitations.map(inv => inv.id === invitation.id ? { ...inv, status: 'declined' } : inv)
    }));
    updateBackendInvitationStatus(invitation.id, 'declined', currentUser?.display_name, currentUser?.id).catch(err => {
      console.warn('[CreaSync] Background invitation decline sync deferred:', err);
    });
  };

  // --- Collaboration Lifecycle Handlers: Submit -> Review -> Revise -> Approve ---
  const handleSubmitDeliverables = (projectId, { assetsUrl, notes, milestone }) => {
    setMarketplaceData(prev => ({
      ...prev,
      projects: prev.projects.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            status: 'submitted',
            progressPercent: Math.min(95, p.progressPercent + 20),
            submissionUrl: assetsUrl,
            submissionNotes: notes,
            milestone: milestone || p.milestone,
            latestFeedback: "“Deliverables submitted for review! Brand creative director evaluating master passes.”",
            submissionPreviews: p.submissionPreviews?.length > 0 ? p.submissionPreviews : [
              "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
              "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80"
            ]
          };
        }
        return p;
      })
    }));

    submitBackendDeliverables(projectId, { assetsUrl, notes, milestone }, currentUser?.display_name, currentUser?.id).catch(err => {
      console.warn('[CreaSync] Background deliverable submission sync deferred:', err);
    });
  };

  const handleRequestRevision = (projectId, { revisionNotes }) => {
    const newFb = {
      id: `fb-${Date.now()}`,
      author: "Brand Creative Director",
      role: "brand",
      text: `“Revision requested: ${revisionNotes}”`,
      timestamp: "Just now"
    };

    setMarketplaceData(prev => ({
      ...prev,
      projects: prev.projects.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            status: 'revision-requested',
            latestFeedback: `“Revision requested: ${revisionNotes}”`,
            feedbackHistory: [newFb, ...(p.feedbackHistory || [])]
          };
        }
        return p;
      })
    }));

    requestBackendRevision(projectId, { revisionNotes }, currentUser?.display_name, currentUser?.id).catch(err => {
      console.warn('[CreaSync] Background revision request sync deferred:', err);
    });
  };

  const handleApproveDeliverables = (projectId, { approvalNotes }) => {
    const newFb = {
      id: `fb-${Date.now()}`,
      author: "Brand Creative Director",
      role: "brand",
      text: approvalNotes ? `“Approved: ${approvalNotes}”` : "“Deliverables approved! Final milestone unlocked & payout released.”",
      timestamp: "Just now"
    };

    setMarketplaceData(prev => ({
      ...prev,
      projects: prev.projects.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            status: 'approved',
            progressPercent: 100,
            milestone: "Final Milestone: All Master Assets Approved & Released",
            latestFeedback: "“Outstanding work! Master passes approved and payout released.”",
            feedbackHistory: [newFb, ...(p.feedbackHistory || [])]
          };
        }
        return p;
      })
    }));

    approveBackendDeliverables(projectId, { approvalNotes }, currentUser?.display_name, currentUser?.id).catch(err => {
      console.warn('[CreaSync] Background deliverable approval sync deferred:', err);
    });
  };

  // Creator Profile & Portfolio Management (Unified Single Source of Truth)
  const handleUpdateCreator = (updatedCreator) => {
    if (!updatedCreator || !updatedCreator.id) return;
    setMarketplaceData(prev => updateCreatorRecord(prev, updatedCreator));
    // Asynchronously synchronize with backend cloud store
    saveBackendCreator(updatedCreator).catch(err => {
      console.warn('[CreaSync] Background creator sync deferred:', err);
    });
  };

  // Creator Onboarding Completed - Protected Action
  const handlePublishCreator = (newCreator) => {
    requireAuth(
      { type: 'PUBLISH_CREATOR', creator: newCreator, role: 'creator', notice: 'Please sign in to publish your creator profile to the marketplace' },
      () => {
        // Persist ownership pointer to localStorage before backend sync to avoid stale snapshots
        saveMarketplaceState({
          ...updateCreatorRecord(getInitialMarketplaceState(), newCreator),
          myCreatorId: newCreator.id
        });
        setMarketplaceData(prev => ({
          ...updateCreatorRecord(prev, newCreator),
          myCreatorId: newCreator.id
        }));
        setActiveCreatorId(newCreator.id);
        saveBackendCreator(newCreator).catch(err => {
          console.warn('[CreaSync] Background creator sync deferred:', err);
        });
        navigateTo('creator-workspace');
      }
    );
  };

  const handleOpenCreatorProfile = (creatorId) => {
    setActiveCreatorId(creatorId);
    navigateTo('creator-profile', creatorId);
  };

  const handleSelectProject = (project, creator) => {
    setSelectedProject(project);
    setSelectedProjectCreator(creator);
  };

  const handleCreateWorkspaceFromProject = ({ project, creator, suggestedName, suggestedAesthetic }) => {
    // If user is brand, create/launch a brand workspace or pre-fill campaign/collaboration workspace
    const targetBrand = currentBrand || visibleBrands[0];
    const userRole = resolveUserRole(currentUser);

    if (userRole === 'creator') {
      // Navigate to creator studio projects/collaborations
      setInitialCreatorTab('projects');
      navigateTo('creator-workspace');
      return;
    }

    // Launch Brand Studio workspace with pre-populated project collaboration context
    if (targetBrand) {
      // Create new campaign or activate workspace
      const newCampaign = {
        id: `camp-proj-${Date.now()}`,
        ownerBrandId: targetBrand.id,
        title: suggestedName || `${project.title} Production Collaboration`,
        brandName: targetBrand.name,
        brandAvatar: targetBrand.logo,
        status: 'active',
        budget: '$8,000 - $14,000',
        timeline: '3-4 Weeks Production',
        objective: `Commission and produce creative deliverables based on ${project.title}.`,
        aesthetic: suggestedAesthetic || project.creativeStyle || 'Cinematic & Editorial',
        deliverables: project.format || '4K Master Video & Stills Suite',
        tools: project.tools || 'Midjourney v6, Runway Gen-3',
        description: project.description || 'Dedicated commercial production workspace.',
        createdAt: 'Just now'
      };

      setMarketplaceData(prev => ({
        ...prev,
        campaigns: [newCampaign, ...(prev.campaigns || [])],
        activeCampaignId: newCampaign.id
      }));

      saveBackendCampaign(newCampaign, targetBrand, currentUser?.id).catch(err => {
        console.warn('[CreaSync] Background campaign sync deferred:', err);
      });

      setInitialBrandTab('overview');
      navigateTo('brand-workspace');
    } else {
      setInitialBrandTab('overview');
      navigateTo('brand-workspace');
    }
  };

  // Authorize & save dedicated AI production workflow for a specific portfolio project
  const handleSaveProjectWorkflow = async (projectId, stages) => {
    const creatorId = selectedProjectCreator?.id || myCreator?.id || 'maya-chen';

    // Normalize incoming workflow data
    const isObjectWorkflow = stages && typeof stages === 'object' && !Array.isArray(stages);
    const stepsArray = isObjectWorkflow ? (stages.steps || []) : (Array.isArray(stages) ? stages : []);
    const wfTitle = isObjectWorkflow ? (stages.title || '') : '';
    const wfOverview = isObjectWorkflow ? (stages.overview || '') : '';

    // 1. Update project in marketplaceData creators
    setMarketplaceData(prev => {
      const updatedCreators = (prev.creators || CREATORS).map(c => {
        if (c.id === creatorId) {
          const updatedProjects = (c.projects || []).map(p => {
            if (p.id === projectId) {
              return {
                ...p,
                workflowStages: stepsArray,
                workflowTitle: wfTitle || p.workflowTitle || '',
                workflowOverview: wfOverview || p.workflowOverview || '',
                productionWorkflow: {
                  ...(p.productionWorkflow || {}),
                  title: wfTitle || p.productionWorkflow?.title || '',
                  overview: wfOverview || p.productionWorkflow?.overview || '',
                  steps: stepsArray
                },
                updatedAt: 'Just now'
              };
            }
            return p;
          });
          return {
            ...c,
            projects: updatedProjects
          };
        }
        return c;
      });

      return {
        ...prev,
        creators: updatedCreators
      };
    });

    // 2. Also update selectedProject state in-memory so modal view updates instantly
    setSelectedProject(prev => {
      if (prev && prev.id === projectId) {
        return {
          ...prev,
          workflowStages: stepsArray,
          workflowTitle: wfTitle || prev.workflowTitle || '',
          workflowOverview: wfOverview || prev.workflowOverview || '',
          productionWorkflow: {
            ...(prev.productionWorkflow || {}),
            title: wfTitle || prev.productionWorkflow?.title || '',
            overview: wfOverview || prev.productionWorkflow?.overview || '',
            steps: stepsArray
          }
        };
      }
      return prev;
    });

    // 3. Persist to Supabase backend through savePortfolioProject
    const targetProject = (selectedProjectCreator?.projects || []).find(p => p.id === projectId) || selectedProject;
    if (targetProject) {
      await saveBackendProject(creatorId, {
        ...targetProject,
        workflowStages: stepsArray,
        workflowTitle: wfTitle || targetProject.workflowTitle || '',
        workflowOverview: wfOverview || targetProject.workflowOverview || '',
        productionWorkflow: {
          ...(targetProject.productionWorkflow || {}),
          title: wfTitle || targetProject.productionWorkflow?.title || '',
          overview: wfOverview || targetProject.productionWorkflow?.overview || '',
          steps: stepsArray
        }
      });
    }
  };

  const handleOpenInviteModal = (creator) => {
    requireAuth(
      { type: 'INVITE_CREATOR', creator, role: 'brand', notice: `Please sign in to invite ${creator?.name || 'this creator'}` },
      () => {
        setInviteTargetCreator(creator);
        setIsInviteModalOpen(true);
      }
    );
  };

  const handleOpportunityResponse = (opportunity, message) => {
    const creator = myCreator;
    if (!creator) return;
    const newConn = {
      id: `conn-opp-${opportunity.id}-${Date.now()}`,
      creatorId: creator.id,
      creatorName: creator.name,
      creatorRole: creator.creativeIdentity,
      creatorAvatar: creator.avatar,
      creatorVisual: creator.projects?.[0]?.image || creator.heroWork,
      campaignId: opportunity.campaignId || 'camp-opp',
      campaignTitle: opportunity.title,
      brandName: opportunity.brand,
      status: 'connected',
      createdAt: 'Just now',
      connectedAt: 'Just now',
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'creator',
          senderName: creator.name,
          text: message || "I'm interested in collaborating on this brief!",
          timestamp: 'Just now'
        }
      ]
    };
    setMarketplaceData(prev => ({
      ...prev,
      connections: [newConn, ...prev.connections.filter(c => c.campaignTitle !== opportunity.title)]
    }));
  };

  const activeCreator = activeCreatorId
    ? (creatorsList.find(c => c.id === activeCreatorId) || null)
    : null;

  return (
    <div className="creasynq-app">
      {/* Luxury Brand Logo Loading Intro Screen */}
      {showLoadingScreen && (
        <AlloyLoadingScreen
          onComplete={() => setShowLoadingScreen(false)}
        />
      )}
      {/* Keep public navigation out of the dedicated admin screens. */}
      {currentView !== 'admin-login' && currentView !== 'admin-dashboard' && (
        <Header
          currentView={currentView}
          onNavigate={(v) => navigateTo(v)}
          onOpenCampaignModal={() => requireAuth({ type: 'CREATE_CAMPAIGN', role: 'brand', notice: 'Please sign in to start a new campaign' }, () => setIsCampaignModalOpen(true))}
          onOpenCreatorModal={() => navigateTo('creator-join')}
          onOpenRoleSelect={() => setIsRoleSelectOpen(true)}
          onOpenLogin={() => {
            setLoginNotice(null);
            setIsLoginOpen(true);
          }}
          onOpenForBrandsModal={() => setIsForBrandsOpen(true)}
          onOpenForCreatorsModal={() => setIsForCreatorsOpen(true)}
          onOpenMessages={handleOpenMessages}
          onOpenJudgeTour={() => setIsJudgeTourOpen(true)}
          activeCampaign={activeCampaign}
          createdCreatorProfile={myCreator}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Main Views */}
      <main>
        {/* VIEW 1: ALLOY MASTER LANDING PAGE */}
        {currentView === 'home' && (
          <>
            {/* 1. Master Editorial Hero with 3D ALLOY Animation Engine */}
            <Hero
              onFindCreator={handleHireAction}
              onJoinCreator={handleCreatorAction}
              onExploreWork={() => navigateTo('discover')}
              onSelectCreator={handleOpenCreatorProfile}
              onStartJudgeTour={() => setIsJudgeTourOpen(true)}
            />

            {/* 2. Curated Creative Portfolio Showcase ("Meet creativity in every direction.") */}
            <CreativeShowcase
              creators={creatorsList}
              onSelectProject={handleSelectProject}
              onSelectCreator={handleOpenCreatorProfile}
              onExploreAll={() => navigateTo('discover')}
            />

            {/* 3. How ALLOY Works (3 Connected Steps + Dual Paths) */}
            <HowItWorks
              onFindCreators={handleHireAction}
              onBuildPortfolio={handleCreatorAction}
            />

            {/* 4. Creator DNA Architecture ("Every creator has a signature.") */}
            <CreatorDNASection
              creators={creatorsList}
              onSelectCreator={handleOpenCreatorProfile}
            />

            {/* 5. Two Clear User Journeys (For Brands & For Creators) */}
            <TwoJourneysSection
              onFindCreators={handleHireAction}
              onJoinAlloy={handleCreatorAction}
              onExploreBrandStudio={handleHireAction}
              onBuildCreatorProfile={handleCreatorAction}
            />

            {/* 6. Show How Matching Works (Explainable Style Alignment) */}
            <CreaMatchSection
              creators={creatorsList}
              onExploreDiscover={() => navigateTo('discover')}
              onEnterBrandStudio={handleHireAction}
            />

            {/* 7. CreaSim Interactive Concept Storyboards ("See what the collaboration could become.") */}
            <ProductPreview
              onSelectCreator={handleOpenCreatorProfile}
              onExploreMarketplace={() => navigateTo('discover')}
            />

            {/* 8. Final Closing Banner & Direct Collaboration Actions */}
            <FinalCTA
              onFindCreator={handleHireAction}
              onJoinCreator={handleCreatorAction}
            />
          </>
        )}

        {/* VIEW 2: DISCOVER MARKETPLACE */}
        {currentView === 'discover' && (
          <DiscoverView
            creators={creatorsList}
            onSelectCreator={handleOpenCreatorProfile}
            activeCampaign={activeCampaign}
            onBackToCampaign={() => navigateTo('brand-workspace')}
            savedCreatorIds={savedCreatorIds}
            onToggleSaveCreator={handleToggleSaveCreator}
            onWhyClick={handleOpenWhyModal}
            onInviteCreator={handleOpenInviteModal}
            pipelineFilter={pipelineFilter}
            onClearPipelineFilter={() => {
              setPipelineFilter(null);
              setPipelineError(null);
            }}
            onOpenPipelineTrace={handleRunFilteringPipeline}
            onRunNaturalPipeline={handleRunFilteringPipeline}
            isPipelineTraceLoading={isPipelineTraceLoading}
            pipelineError={pipelineError}
            currentUser={currentUser}
            onOpenLogin={() => {
              setLoginNotice('Sign in to filter creators using AI natural language.');
              setLoginInitialRole('brand');
              setIsLoginOpen(true);
            }}
          />
        )}

        {/* VIEW 3: BRAND STUDIO (Overhauled Multi-Section Brand Experience) */}
        {currentView === 'brand-workspace' && (
          <BrandWorkspaceView
            currentBrand={currentBrand}
            allBrands={visibleBrands}
            isDemoMode={isDemoMode}
            onSwitchBrand={handleSwitchBrand}
            onCreateBrand={handleCreateBrand}
            onUpdateBrand={handleUpdateBrand}
            onToggleDemoMode={handleToggleDemoMode}
            onResetState={handleResetState}
            campaigns={brandCampaigns}
            activeCampaign={activeCampaign}
            onSelectCampaign={handleSelectCampaign}
            onCreateCampaign={handleCampaignCreated}
            onUpdateCampaign={handleUpdateCampaign}
            onDuplicateCampaign={handleDuplicateCampaign}
            onDeleteCampaign={handleDeleteCampaign}
            creators={creatorsList}
            shortlists={brandShortlists}
            onToggleShortlist={handleToggleShortlist}
            invitations={brandInvitations}
            onSendInvitation={handleSendInvitation}
            projects={brandProjects}
            onRequestRevision={handleRequestRevision}
            onApproveDeliverables={handleApproveDeliverables}
            connections={brandConnections}
            onSendMessage={handleSendMessage}
            onSelectCreator={handleOpenCreatorProfile}
            onRunFilteringPipeline={handleRunFilteringPipeline}
            initialTab={initialBrandTab}
            pipelineFilter={pipelineFilter}
            onClearPipelineFilter={() => setPipelineFilter(null)}
            onOpenPipelineTrace={(campaignId) => {
              const camp = (marketplaceData.campaigns || []).find(c => c.id === campaignId) || activeCampaign;
              if (camp) {
                handleRunFilteringPipeline(camp);
              } else {
                setIsPipelineTraceModalOpen(true);
              }
            }}
            fundingRecords={marketplaceData.campaignFunding || []}
            onOpenTrustCenter={() => {
              setInitialBrandTab('trust');
              navigateTo('brand-workspace');
            }}
            currentUser={currentUser}
            onLoginSuccess={(user, role) => executePendingActionOrRoute(user, role)}
            onOpenLogin={() => {
              setLoginNotice('Please sign in to access your direct messages');
              setIsLoginOpen(true);
            }}
          />
        )}

        {/* VIEW 3B: BRAND ONBOARDING (Guided Campaign Setup & Discovery) */}
        {currentView === 'brand-onboard' && (
          <BrandOnboardingView
            creators={creatorsList}
            onCompleteBrandOnboarding={({ brand, campaign }) => {
              const finalBrand = createBrandRecord(brand);
              const finalCampaign = createCampaignRecord(campaign, finalBrand);
              setMarketplaceData(prev => ({
                ...prev,
                brands: [finalBrand, ...(prev.brands || [])],
                activeBrandId: finalBrand.id,
                isDemoMode: false,
                campaigns: [finalCampaign, ...(prev.campaigns || [])],
                activeCampaignId: finalCampaign.id
              }));
              // Real-time write-through to Supabase Table Editor
              saveBackendBrand(finalBrand, currentUser?.id).catch(err => {
                console.warn('[CreaSync] Background brand sync deferred:', err);
              });
              saveBackendCampaign(finalCampaign, finalBrand, currentUser?.id).catch(err => {
                console.warn('[CreaSync] Background campaign sync deferred:', err);
              });
              navigateTo('brand-workspace');
            }}
            onExploreMarketplace={() => navigateTo('discover')}
          />
        )}

        {/* VIEW 4: CREATOR MICROSITE & ONBOARDING */}
        {currentView === 'creator-join' && (
          <CreatorOnboardingView
            onPublishCreator={handlePublishCreator}
            onExploreMarketplace={() => navigateTo('discover')}
          />
        )}

        {/* VIEW 5: CREATOR WORKSPACE / STUDIO (Milestone 2 Experience connected to Brand Studio) */}
        {currentView === 'creator-workspace' && myCreator && (
          <CreatorWorkspaceView
            creator={myCreator}
            currentUser={currentUser}
            onUpdateCreator={handleUpdateCreator}
            onViewPublicProfile={() => handleOpenCreatorProfile(myCreator.id)}
            onExploreMarketplace={() => navigateTo('discover')}
            connections={synchronizedConnections}
            onOpenConversation={(conn) => handleOpenConversation(conn, 'creator')}
            opportunities={publicOpportunities}
            onOpportunityResponse={handleOpportunityResponse}
            invitations={creatorInvitations}
            onAcceptInvitation={handleAcceptInvitation}
            onDeclineInvitation={handleDeclineInvitation}
            projects={creatorProjects}
            onSubmitDeliverables={handleSubmitDeliverables}
            onSendMessage={handleSendMessage}
            onSelectProject={handleSelectProject}
            initialTab={initialCreatorTab}
            onLoginSuccess={(user, role) => executePendingActionOrRoute(user, role)}
            onOpenLogin={() => {
              setLoginNotice('Please sign in to access your direct messages');
              setIsLoginOpen(true);
            }}
          />
        )}

        {/* VIEW 5b: CREATOR WORKSPACE EMPTY STATE (no published creator on this device) */}
        {currentView === 'creator-workspace' && !myCreator && (
          <div className="page-container-narrow" style={{ padding: '96px 24px', textAlign: 'center' }}>
            <h2 className="step-main-headline font-editorial">No Creator Studio On This Device Yet</h2>
            <p className="step-main-sub" style={{ margin: '12px auto 28px', maxWidth: '560px' }}>
              Your Creator Studio opens after you publish a creator profile. Finish creator onboarding to publish your identity and portfolio for brands to discover.
            </p>
            <div className="step-footer-actions justify-center">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => navigateTo('creator-join')}
              >
                <span>Start Creator Onboarding</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => navigateTo('discover')}
              >
                <span>Explore Creator Marketplace</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 6: CREATOR PUBLIC PROFILE */}
        {currentView === 'creator-profile' && activeCreator && (
          <CreatorProfileView
            creator={activeCreator}
            activeCampaign={activeCampaign}
            campaigns={brandCampaigns}
            shortlists={brandShortlists}
            onToggleShortlist={handleToggleShortlist}
            onSelectCampaign={handleSelectCampaign}
            connections={connections}
            onOpenConversation={(conn) => handleOpenConversation(conn, 'brand')}
            onBack={() => navigateTo('discover')}
            onSelectProject={handleSelectProject}
            onInviteCreator={handleOpenInviteModal}
            isSaved={savedCreatorIds.includes(activeCreator.id)}
            onToggleSave={handleToggleSaveCreator}
            onUpdateCreator={handleUpdateCreator}
            isCurrentCreatorOwner={myCreator?.id === activeCreator?.id}
            onEditInStudio={() => navigateTo('creator-workspace')}
          />
        )}

        {/* VIEW 6b: CREATOR NOT FOUND (explicit — never substitutes another creator's profile) */}
        {(currentView === 'creator-not-found' || (currentView === 'creator-profile' && !activeCreator)) && (
          <div className="page-container-narrow" style={{ padding: '96px 24px', textAlign: 'center' }}>
            <h2 className="step-main-headline font-editorial">Creator Profile Not Found</h2>
            <p className="step-main-sub" style={{ margin: '12px auto 28px', maxWidth: '560px' }}>
              We couldn't find a creator matching this link on this device. The profile may have been unpublished, or the link may be incorrect.
            </p>
            <div className="step-footer-actions justify-center">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => navigateTo('discover')}>
                <span>Back to Marketplace</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 7: DEDICATED TRUST CENTRE */}
        {currentView === 'trust-center' && (
          <TrustCenterView
            creators={creatorsList}
            activeCreatorId={activeCreator?.id || myCreator?.id || 'maya-chen'}
            currentUser={currentUser}
            onUpdateCreator={handleUpdateCreator}
            onViewCreatorProfile={handleOpenCreatorProfile}
            onBackToMarketplace={() => navigateTo('discover')}
          />
        )}

        {/* VIEW 7B: DEDICATED BRAND TRUST CENTRE */}
        {currentView === 'brand-trust-center' && (
          <BrandTrustCenterView
            brand={currentBrand}
            currentUser={currentUser}
            campaigns={brandCampaigns}
            fundingRecords={marketplaceData.campaignFunding || []}
            collaborations={brandProjects}
            invitations={brandInvitations}
            onUpdateBrand={handleUpdateBrand}
            onBackToWorkspace={() => navigateTo('brand-workspace')}
            onNavigateToTab={(tab) => {
              setInitialBrandTab(tab);
              navigateTo('brand-workspace');
            }}
          />
        )}

        {/* VIEW 8: SUPER ADMIN SECURITY LOGIN */}
        {currentView === 'admin-login' && (
          <AdminLoginView
            onAdminAuthenticated={(user) => {
              setCurrentAdmin(user);
              setCurrentView('admin-dashboard');
              window.location.hash = '/admin/dashboard';
            }}
          />
        )}

        {/* VIEW 9: SUPER ADMIN & ALLOYTRUST DASHBOARD */}
        {currentView === 'admin-dashboard' && (
          <AdminDashboardView
            adminUser={currentAdmin}
            onLogout={() => {
              setCurrentAdmin(null);
              try { localStorage.removeItem('alloy_super_admin_session'); } catch { /* ignore storage errors */ }
              setCurrentView('home');
              window.location.hash = '';
            }}
          />
        )}

        {/* VIEW 10: MESSAGES (Dedicated CreaSynq Messages Page with Login Wall) */}
        {currentView === 'messages' && (
          !currentUser ? (
            <div className="page-container" style={{ padding: '72px 24px', minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessagesLoginWall
                onLoginSuccess={(user, role) => {
                  executePendingActionOrRoute(user, role);
                }}
                onOpenEmailLogin={() => {
                  setLoginNotice('Please sign in to access your direct messages');
                  setIsLoginOpen(true);
                }}
              />
            </div>
          ) : (
            resolveUserRole(currentUser) === 'creator' && myCreator ? (
              <CreatorWorkspaceView
                creator={myCreator}
                currentUser={currentUser}
                onUpdateCreator={handleUpdateCreator}
                onViewPublicProfile={() => handleOpenCreatorProfile(myCreator.id)}
                onExploreMarketplace={() => navigateTo('discover')}
                connections={synchronizedConnections}
                onOpenConversation={(conn) => handleOpenConversation(conn, 'creator')}
                opportunities={publicOpportunities}
                onOpportunityResponse={handleOpportunityResponse}
                invitations={creatorInvitations}
                onAcceptInvitation={handleAcceptInvitation}
                onDeclineInvitation={handleDeclineInvitation}
                projects={creatorProjects}
                onSubmitDeliverables={handleSubmitDeliverables}
                onSendMessage={handleSendMessage}
                onSelectProject={handleSelectProject}
                initialTab="messages"
                onLoginSuccess={(user, role) => executePendingActionOrRoute(user, role)}
                onOpenLogin={() => setIsLoginOpen(true)}
              />
            ) : (
              <BrandWorkspaceView
                currentUser={currentUser}
                currentBrand={currentBrand}
                allBrands={visibleBrands}
                isDemoMode={isDemoMode}
                onSwitchBrand={handleSwitchBrand}
                onCreateBrand={handleCreateBrand}
                onUpdateBrand={handleUpdateBrand}
                onToggleDemoMode={handleToggleDemoMode}
                onResetState={handleResetState}
                campaigns={brandCampaigns}
                activeCampaign={activeCampaign}
                onSelectCampaign={handleSelectCampaign}
                onCreateCampaign={handleCampaignCreated}
                onUpdateCampaign={handleUpdateCampaign}
                onDuplicateCampaign={handleDuplicateCampaign}
                onDeleteCampaign={handleDeleteCampaign}
                creators={creatorsList}
                shortlists={brandShortlists}
                onToggleShortlist={handleToggleShortlist}
                invitations={brandInvitations}
                onSendInvitation={handleSendInvitation}
                projects={brandProjects}
                onRequestRevision={handleRequestRevision}
                onApproveDeliverables={handleApproveDeliverables}
                connections={brandConnections}
                onSendMessage={handleSendMessage}
                onSelectCreator={handleOpenCreatorProfile}
                onRunFilteringPipeline={handleRunFilteringPipeline}
                initialTab="messages"
                pipelineFilter={pipelineFilter}
                onClearPipelineFilter={() => setPipelineFilter(null)}
                fundingRecords={marketplaceData.campaignFunding || []}
                onOpenTrustCenter={() => {
                  setInitialBrandTab('trust');
                  navigateTo('brand-workspace');
                }}
                onLoginSuccess={(user, role) => executePendingActionOrRoute(user, role)}
                onOpenLogin={() => setIsLoginOpen(true)}
              />
            )
          )
        )}
      </main>

      {/* SECTION K: Clean Footer (Preserved exactly for all public views) */}
      {currentView !== 'admin-login' && currentView !== 'admin-dashboard' && (
        <Footer
          onNavigate={(v) => navigateTo(v)}
          onOpenCampaignModal={() => requireAuth({ type: 'CREATE_CAMPAIGN', role: 'brand', notice: 'Please sign in to start a new campaign' }, () => setIsCampaignModalOpen(true))}
          onOpenCreatorModal={handleCreatorAction}
          onEnterBrandStudio={handleHireAction}
          onEnterCreatorStudio={handleCreatorAction}
          onOpenLogin={() => {
            setLoginNotice(null);
            setLoginInitialRole('brand');
            setIsLoginOpen(true);
          }}
          onOpenRoleSelect={() => setIsRoleSelectOpen(true)}
        />
      )}

      {/* Role Selection Modal */}
      <RoleSelectModal
        isOpen={isRoleSelectOpen}
        onClose={() => setIsRoleSelectOpen(false)}
        onSelectBrand={() => {
          setIsRoleSelectOpen(false);
          if (currentUser) {
            updateUserRoleExplicitly(currentUser, 'brand').then(() => {
              setCurrentUser(prev => ({ ...prev, role: 'brand', profile: { ...prev?.profile, role: 'brand' } }));
              navigateTo('brand-workspace');
            });
          } else {
            handleHireAction();
          }
        }}
        onSelectCreator={() => {
          setIsRoleSelectOpen(false);
          if (currentUser) {
            updateUserRoleExplicitly(currentUser, 'creator').then(() => {
              setCurrentUser(prev => ({ ...prev, role: 'creator', profile: { ...prev?.profile, role: 'creator' } }));
              navigateTo('creator-workspace');
            });
          } else {
            handleCreatorAction();
          }
        }}
      />

      {/* Role Conflict Resolution Modal */}
      <RoleConflictModal
        isOpen={isRoleConflictOpen}
        onClose={() => setIsRoleConflictOpen(false)}
        currentRole={currentUser?.profile?.role || currentUser?.role || (typeof window !== 'undefined' ? localStorage.getItem('creasync_active_role') : null) || 'brand'}
        attemptedRole={conflictAttemptedRole}
        userName={currentUser?.user_metadata?.full_name || currentUser?.profile?.display_name || currentUser?.email?.split('@')[0] || 'User'}
        onGoToAuthorizedWorkspace={() => {
          const activeRole = currentUser?.profile?.role || currentUser?.role || localStorage.getItem('creasync_active_role');
          if (activeRole === 'creator') {
            navigateTo('creator-workspace');
          } else {
            navigateTo('brand-workspace');
          }
        }}
        onLogout={handleLogout}
      />

      {/* Login Authentication Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => {
          setIsLoginOpen(false);
          setLoginNotice(null);
          setPendingAction(null);
          try {
            sessionStorage.removeItem('creasync_pending_action');
          } catch (e) { }
        }}
        initialRole={loginInitialRole}
        pendingActionNotice={loginNotice}
        onLoginSuccess={(user, role) => {
          setIsLoginOpen(false);
          setLoginNotice(null);
          const targetRole = role || user?.profile?.role || (user?.role !== 'authenticated' ? user?.role : null) || 'brand';
          if (targetRole === 'brand') {
            const isLuminaDemo = !user || (!user.email || user.email === 'lumina.demo@alloy.market');
            const brandUser = user ? {
              ...user,
              role: 'brand',
              isDemoOnly: isLuminaDemo,
              profile: {
                ...(user?.profile || {}),
                role: 'brand',
                display_name: user?.profile?.display_name || user?.user_metadata?.full_name || user?.display_name || (isLuminaDemo ? 'Lumina Botanica' : (user.email ? user.email.split('@')[0] : 'Brand Studio')),
                isDemoOnly: isLuminaDemo
              }
            } : {
              id: 'brand-demo-lumina',
              email: 'lumina.demo@alloy.market',
              role: 'brand',
              display_name: 'Lumina Botanica',
              isDemoOnly: true,
              profile: {
                id: 'brand-demo-lumina',
                email: 'lumina.demo@alloy.market',
                role: 'brand',
                display_name: 'Lumina Botanica',
                isDemoOnly: true
              }
            };
            localStorage.setItem('creasync_active_user', JSON.stringify(brandUser));
            localStorage.setItem('creasync_active_role', 'brand');
            updateActiveUser(brandUser);

            if (isLuminaDemo) {
              handleSwitchBrand('brand-demo-lumina');
              handleToggleDemoMode(true);
            } else {
              const emailKey = (brandUser.email || brandUser.id || 'custom').toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '-');
              const customBrandId = `brand-${emailKey}`;
              const brandName = brandUser.profile?.display_name || brandUser.display_name || (brandUser.email ? brandUser.email.split('@')[0] : 'My Brand Studio');

              const brandRecord = {
                id: customBrandId,
                userId: brandUser.id,
                name: brandName,
                industry: 'Creative & Digital',
                description: `${brandName} private studio workspace.`,
                aesthetic: 'Modern & Editorial',
                isDemo: false
              };

              setMarketplaceData(prev => {
                const existingBrand = (prev.brands || []).find(b => b.id === customBrandId);
                if (!existingBrand) {
                  return {
                    ...prev,
                    brands: [brandRecord, ...(prev.brands || [])],
                    activeBrandId: customBrandId,
                    isDemoMode: false
                  };
                }
                return {
                  ...prev,
                  activeBrandId: customBrandId,
                  isDemoMode: false
                };
              });

              saveBackendBrand(brandRecord, brandUser.id).catch(err => {
                console.warn('[CreaSync] Background brand sync deferred:', err);
              });
            }
            executePendingActionOrRoute(brandUser, 'brand');
          } else {
            const isDemo = !user || (!user.email || user.email === 'maya.demo@alloy.market') || !!user.isDemoOnly;
            const creatorUser = user ? {
              ...user,
              role: 'creator',
              isDemoOnly: isDemo,
              profile: {
                ...(user?.profile || {}),
                role: 'creator',
                display_name: user?.profile?.display_name || user?.user_metadata?.full_name || user?.display_name || (isDemo ? 'Maya Chen' : (user.email ? user.email.split('@')[0] : 'Creator Studio')),
                isDemoOnly: isDemo
              }
            } : {
              id: 'maya-chen',
              email: 'maya.demo@alloy.market',
              role: 'creator',
              display_name: 'Maya Chen',
              isDemoOnly: true,
              profile: {
                id: 'maya-chen',
                email: 'maya.demo@alloy.market',
                role: 'creator',
                display_name: 'Maya Chen',
                isDemoOnly: true
              }
            };
            localStorage.setItem('creasync_active_user', JSON.stringify(creatorUser));
            localStorage.setItem('creasync_active_role', 'creator');
            updateActiveUser(creatorUser);
            handleToggleDemoMode(isDemo);
            executePendingActionOrRoute(creatorUser, 'creator');
          }
        }}
        onLoginBrand={(user) => {
          setIsLoginOpen(false);
          setLoginNotice(null);
          const isLuminaDemo = !user || (!user.email || user.email === 'lumina.demo@alloy.market');
          const brandUser = user ? {
            ...user,
            role: 'brand',
            isDemoOnly: isLuminaDemo,
            profile: {
              ...(user?.profile || {}),
              role: 'brand',
              display_name: user?.profile?.display_name || user?.user_metadata?.full_name || user?.display_name || (isLuminaDemo ? 'Lumina Botanica' : (user.email ? user.email.split('@')[0] : 'Brand Studio')),
              isDemoOnly: isLuminaDemo
            }
          } : {
            id: 'brand-demo-lumina',
            email: 'lumina.demo@alloy.market',
            role: 'brand',
            display_name: 'Lumina Botanica',
            isDemoOnly: true,
            profile: {
              id: 'brand-demo-lumina',
              email: 'lumina.demo@alloy.market',
              role: 'brand',
              display_name: 'Lumina Botanica',
              isDemoOnly: true
            }
          };
          localStorage.setItem('creasync_active_user', JSON.stringify(brandUser));
          localStorage.setItem('creasync_active_role', 'brand');
          updateActiveUser(brandUser);

          if (isLuminaDemo) {
            handleSwitchBrand('brand-demo-lumina');
            handleToggleDemoMode(true);
          } else {
            const emailKey = (brandUser.email || brandUser.id || 'custom').toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '-');
            const customBrandId = `brand-${emailKey}`;
            const brandName = brandUser.profile?.display_name || brandUser.display_name || (brandUser.email ? brandUser.email.split('@')[0] : 'My Brand Studio');

            const brandRecord = {
              id: customBrandId,
              userId: brandUser.id,
              name: brandName,
              industry: 'Creative & Digital',
              description: `${brandName} private studio workspace.`,
              aesthetic: 'Modern & Editorial',
              isDemo: false
            };

            setMarketplaceData(prev => {
              const existingBrand = (prev.brands || []).find(b => b.id === customBrandId);
              if (!existingBrand) {
                return {
                  ...prev,
                  brands: [brandRecord, ...(prev.brands || [])],
                  activeBrandId: customBrandId,
                  isDemoMode: false
                };
              }
              return {
                ...prev,
                activeBrandId: customBrandId,
                isDemoMode: false
              };
            });

            saveBackendBrand(brandRecord, brandUser.id).catch(err => {
              console.warn('[CreaSync] Background brand sync deferred:', err);
            });
          }
          executePendingActionOrRoute(brandUser, 'brand');
        }}
        onLoginCreator={(user) => {
          setIsLoginOpen(false);
          setLoginNotice(null);
          const isDemo = !user || (!user.email || user.email === 'maya.demo@alloy.market') || !!user.isDemoOnly;
          const creatorUser = user ? {
            ...user,
            role: 'creator',
            isDemoOnly: isDemo,
            profile: {
              ...(user?.profile || {}),
              role: 'creator',
              display_name: user?.profile?.display_name || user?.user_metadata?.full_name || user?.display_name || (isDemo ? 'Maya Chen' : (user.email ? user.email.split('@')[0] : 'Creator Studio')),
              isDemoOnly: isDemo
            }
          } : {
            id: 'maya-chen',
            email: 'maya.demo@alloy.market',
            role: 'creator',
            display_name: 'Maya Chen',
            isDemoOnly: true,
            profile: {
              id: 'maya-chen',
              email: 'maya.demo@alloy.market',
              role: 'creator',
              display_name: 'Maya Chen',
              isDemoOnly: true
            }
          };
          localStorage.setItem('creasync_active_user', JSON.stringify(creatorUser));
          localStorage.setItem('creasync_active_role', 'creator');
          updateActiveUser(creatorUser);
          handleToggleDemoMode(isDemo);
          executePendingActionOrRoute(creatorUser, 'creator');
        }}
      />

      {/* Additional Modals */}
      <CampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onCampaignCreated={handleCampaignCreated}
        activeBrand={currentBrand}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        creator={inviteTargetCreator}
        activeCampaign={activeCampaign}
        onInvitationSent={(creator, msg) => handleSendInvitation({
          creatorId: creator.id,
          creatorName: creator.name,
          creatorAvatar: creator.avatar,
          summary: msg
        })}
        onViewCampaign={() => {
          setIsInviteModalOpen(false);
          navigateTo('brand-workspace');
        }}
      />

      <ForBrandsModal
        isOpen={isForBrandsOpen}
        onClose={() => setIsForBrandsOpen(false)}
        onStartCampaign={() => {
          setIsForBrandsOpen(false);
          setIsCampaignModalOpen(true);
        }}
      />

      <ForCreatorsModal
        isOpen={isForCreatorsOpen}
        onClose={() => setIsForCreatorsOpen(false)}
        onJoinCreator={() => {
          setIsForCreatorsOpen(false);
          navigateTo('creator-join');
        }}
      />

      <WhyThisCreatorModal
        isOpen={isWhyModalOpen}
        onClose={() => {
          setIsWhyModalOpen(false);
          setWhyModalCreator(null);
        }}
        creator={whyModalCreator}
        campaign={activeCampaign}
        onInviteCreator={handleOpenInviteModal}
        onViewProfile={handleOpenCreatorProfile}
      />

      <ConversationModal
        isOpen={isConversationOpen}
        onClose={() => {
          setIsConversationOpen(false);
          setActiveConversationConnection(null);
        }}
        connection={activeConversationConnection}
        currentUserRole={conversationUserRole}
        onSendMessage={handleSendMessage}
        onViewProfile={handleOpenCreatorProfile}
      />

      {/* Global Messaging Persistent Drawer & Floating Launcher */}
      {currentView !== 'admin-login' && currentView !== 'admin-dashboard' && currentView !== 'messages' && (
        <GlobalMessagingDrawer
          isOpen={isMessagingDrawerOpen}
          onOpen={() => handleOpenMessages()}
          onClose={() => {
            setIsMessagingDrawerOpen(false);
            setActiveMessagingConnectionId(null);
          }}
          connections={synchronizedConnections}
          activeConnectionId={activeMessagingConnectionId}
          onSelectConnection={(connId) => setActiveMessagingConnectionId(connId)}
          currentUser={currentUser}
          currentUserRole={resolveUserRole(currentUser) || 'brand'}
          currentBrand={currentBrand}
          currentCreator={activeCreator}
          onSendMessage={handleSendMessage}
          onViewProfile={handleOpenCreatorProfile}
          onOpenLogin={() => setIsLoginOpen(true)}
          onLoginSuccess={(user, role) => executePendingActionOrRoute(user, role)}
          onViewProject={(proj) => {
            setSelectedProject(proj);
            setIsMessagingDrawerOpen(false);
          }}
        />
      )}

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          creator={selectedProjectCreator}
          onClose={() => {
            setSelectedProject(null);
            setSelectedProjectCreator(null);
          }}
          onViewCreatorProfile={handleOpenCreatorProfile}
          onCreateWorkspace={handleCreateWorkspaceFromProject}
          onSaveWorkflow={handleSaveProjectWorkflow}
          isCreatorOwner={
            // Creator owns project if logged in as creator and matches creator id, or in demo creator mode
            resolveUserRole(currentUser) === 'creator' ||
            (myCreator && myCreator.id === selectedProjectCreator?.id) ||
            (!currentUser && currentView === 'creator-workspace')
          }
        />
      )}

      {/* Campaign-to-Creator Backend Filtering Pipeline Visualizer */}
      <PipelineTraceModal
        isOpen={isPipelineTraceModalOpen}
        onClose={() => setIsPipelineTraceModalOpen(false)}
        pipelineTrace={pipelineTrace}
        isLoading={isPipelineTraceLoading}
        error={pipelineError}
        campaign={lastPipelineCampaignRef.current || activeCampaign}
        onRetry={() => {
          const target = lastPipelineCampaignRef.current || activeCampaign || (marketplaceData.campaigns || []).find(c => c.id === marketplaceData.activeCampaignId) || marketplaceData.campaigns?.[0];
          if (target) {
            handleRunFilteringPipeline(target);
          }
        }}
        onEditCampaign={() => {
          setIsPipelineTraceModalOpen(false);
          setIsCampaignModalOpen(true);
        }}
        onSelectCreator={handleOpenCreatorProfile}
        onViewAllEligible={(filterPayload) => {
          setIsPipelineTraceModalOpen(false);
          setPipelineFilter(filterPayload);
          setInitialBrandTab('discover');
          navigateTo('brand-workspace');
        }}
      />

      {/* Interactive Judge Demo Guided Walkthrough */}
      <JudgeDemoWalkthrough
        isOpen={isJudgeTourOpen}
        onClose={() => setIsJudgeTourOpen(false)}
        onNavigate={(view, extraId) => {
          if (view === 'creator-profile' && extraId) {
            handleOpenCreatorProfile(extraId);
          } else {
            navigateTo(view, extraId);
          }
        }}
        onOpenMessages={() => {
          setIsMessagingDrawerOpen(true);
        }}
        onEnableDemoCreator={() => {
          const active = currentUserRef.current || currentUser;
          if (!active) {
            const demoCreatorUser = {
              id: 'elena-rostova',
              email: 'elena.demo@alloy.market',
              role: 'creator',
              display_name: 'Elena Rostova',
              isDemoOnly: true,
              profile: {
                id: 'elena-rostova',
                email: 'elena.demo@alloy.market',
                role: 'creator',
                display_name: 'Elena Rostova',
                isDemoOnly: true
              }
            };
            try {
              localStorage.setItem('creasync_active_user', JSON.stringify(demoCreatorUser));
              localStorage.setItem('creasync_active_role', 'creator');
            } catch (e) { }
            updateActiveUser(demoCreatorUser);
          }
          if (!marketplaceData.myCreatorId) {
            const demoId = marketplaceData.creators?.[0]?.id || 'elena-rostova';
            setMarketplaceData(prev => ({ ...prev, myCreatorId: demoId }));
          }
        }}
        currentView={currentView}
      />

      {/* Persistent floating launcher to reopen the Judge Demo tour at any time */}
      {!isJudgeTourOpen && currentView !== 'admin-login' && currentView !== 'admin-dashboard' && (
        <button
          type="button"
          className="judge-tour-launcher-btn"
          id="judge-tour-floating-launcher"
          onClick={() => setIsJudgeTourOpen(true)}
          aria-label="Open Judge Demo Tour"
          title="Take the interactive Judge Demo tour"
        >
          <Sparkles size={14} className="text-bronze" />
          <span>Judge Demo Tour</span>
        </button>
      )}
    </div>
  );
}
