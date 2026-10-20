// src/services/marketplaceBackend.js
// Dual-Engine Marketplace Service Layer
// Seamlessly delegates to live Supabase cloud database when configured,
// and gracefully falls back to persistent local marketplace store for offline/local development.

import { supabase, isSupabaseConfigured, supabaseUrl } from '../lib/supabaseClient.js';
import { 
  getInitialMarketplaceState, 
  saveMarketplaceState, 
  updateCreatorRecord,
  createCampaignRecord,
  createBrandRecord,
  getPublicCreatorProfile,
  saveWorkflowRecord,
  deleteWorkflowRecord,
  toggleWorkflowPublishRecord,
  getVerificationClaimsRecord,
  submitVerificationClaimRecord,
  reviewVerificationClaimRecord
} from '../data/marketplaceStore.js';
import { CREATORS } from '../data/creatorsData.js';

/**
 * Returns backend status descriptor
 */
export function getBackendStatus() {
  const configured = isSupabaseConfigured();
  return {
    engine: configured ? 'supabase' : 'local-persistent',
    isLiveCloud: configured,
    database: configured ? 'PostgreSQL (Supabase)' : 'Browser Local Storage Engine',
    authProvider: configured ? 'Supabase Auth' : 'Local Workspace Session'
  };
}

// ============================================================================
// 1. AUTHENTICATION & USER SESSIONS
// ============================================================================

/**
 * Safely synchronizes an authenticated user's metadata to public.profiles table.
 * Preserves existing database roles to prevent unverified client metadata from
 * overwriting authorized user roles. Never silently overwrites an existing user's
 * stored role with a default role, and handles missing roles explicitly.
 */
export async function syncUserProfileSafely(user, preferredRole = null) {
  if (!isSupabaseConfigured() || !supabase || !user) return null;
  try {
    // 1. Fetch existing profile to preserve existing server-authorized role
    let existingProfile = null;
    try {
      const { data: fetchedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      existingProfile = fetchedProfile;
    } catch (fetchErr) {
      // Table may not exist yet or query blocked by RLS
    }

    // 2. Identify explicit role chosen for this authentication flow (if any)
    let explicitIntent = null;
    if (preferredRole === 'creator' || preferredRole === 'brand') {
      explicitIntent = preferredRole;
    } else if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('creasync_intended_role') 
        || localStorage.getItem('creasync_intended_role');
      if (stored === 'creator' || stored === 'brand') {
        explicitIntent = stored;
      }
    }

    // 3. Resolve role with strict priority:
    // - CRITICAL: If user has an existing verified database profile role ('creator' or 'brand'), PRESERVE it!
    //   Do NOT overwrite an existing user's stored role with a newly selected client role or default role.
    // - Otherwise, if the user explicitly selected a role for this registration/login flow (explicitIntent), honor that selection.
    // - Otherwise, check auth metadata (role or intended_role).
    // - Otherwise, check active role stored from a previous verified workspace session.
    let resolvedRole = null;
    if (existingProfile?.role === 'creator' || existingProfile?.role === 'brand') {
      resolvedRole = existingProfile.role;
    } else if (explicitIntent === 'creator' || explicitIntent === 'brand') {
      resolvedRole = explicitIntent;
    } else if (user.user_metadata?.role === 'creator' || user.user_metadata?.role === 'brand') {
      resolvedRole = user.user_metadata.role;
    } else if (user.user_metadata?.intended_role === 'creator' || user.user_metadata?.intended_role === 'brand') {
      resolvedRole = user.user_metadata.intended_role;
    } else if (typeof window !== 'undefined') {
      const storedActive = localStorage.getItem('creasync_active_role');
      if (storedActive === 'creator' || storedActive === 'brand') {
        resolvedRole = storedActive;
      }
    }

    // Default to creator if role undetermined so new users are never omitted
    if (!resolvedRole) {
      resolvedRole = 'creator';
    }

    const displayName = existingProfile?.display_name 
      || user.user_metadata?.full_name 
      || user.user_metadata?.name 
      || user.email?.split('@')[0] 
      || '';

    const avatarUrl = existingProfile?.avatar_url 
      || user.user_metadata?.avatar_url 
      || '';

    const { data, error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      role: resolvedRole,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' }).select().maybeSingle();

    if (error) {
      console.warn('[CreaSync Auth] Profiles sync note:', error.message);
    }

    // Automatically sync linked creator_profiles or brands table for Table Editor visibility
    try {
      if (resolvedRole === 'creator') {
        const cleanHandle = `@${(displayName || user.email?.split('@')[0] || 'creator').toLowerCase().replace(/[^a-z0-9_]/g, '')}_${user.id.slice(0, 4)}`;
        await supabase.from('creator_profiles').upsert({
          id: `creator-${user.id.slice(0, 8)}`,
          user_id: user.id,
          name: displayName || 'Creator Studio',
          handle: cleanHandle,
          status: 'Published',
          visibility: 'published',
          is_demo: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } else if (resolvedRole === 'brand') {
        await supabase.from('brands').upsert({
          id: `brand-${user.id.slice(0, 8)}`,
          user_id: user.id,
          name: displayName || 'Brand Studio',
          is_demo: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      }

      // Record in Supabase Activity Logs table
      await logActivity({
        actorRole: resolvedRole,
        actorName: displayName || user.email,
        actionType: 'USER_LOGIN',
        entityType: 'user',
        entityId: user.id,
        metadata: { email: user.email, role: resolvedRole },
        userId: user.id
      });
    } catch (linkedSyncErr) {
      console.warn('[CreaSync Auth] Secondary entity sync note:', linkedSyncErr?.message || linkedSyncErr);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('creasync_active_role', resolvedRole);
    }

    return data || existingProfile || { ...user, role: resolvedRole };
  } catch (err) {
    console.warn('[CreaSync Auth] Optional profiles sync bypassed:', err?.message || err);
    return null;
  }
}

/**
 * Explicitly updates the user's profile role when requested deliberately by the user
 * (e.g. through the role conflict resolution dialog or explicit settings).
 * Never called automatically during session restoration or OAuth return.
 */
export async function updateUserRoleExplicitly(user, newRole) {
  if (!user || (newRole !== 'creator' && newRole !== 'brand')) return null;

  if (typeof window !== 'undefined') {
    localStorage.setItem('creasync_active_role', newRole);
    try {
      const activeUser = localStorage.getItem('creasync_active_user');
      if (activeUser) {
        const parsed = JSON.parse(activeUser);
        parsed.role = newRole;
        localStorage.setItem('creasync_active_user', JSON.stringify(parsed));
      }
    } catch (e) {}
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        role: newRole,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }).select().maybeSingle();

      if (error) {
        console.warn('[CreaSync Auth] Profile role update note:', error.message);
      }
      return data || { ...user, role: newRole };
    } catch (err) {
      console.warn('[CreaSync Auth] Profile role update deferred:', err);
    }
  }

  return { ...user, role: newRole };
}

/**
 * Initiates Google OAuth authentication via Supabase Auth
 * Requires active Supabase configuration in .env. Does NOT mock authentication.
 */
export async function signInWithGoogle({ role = 'brand', redirectTo } = {}) {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Google Authentication requires Supabase to be configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }

  // Validate target role
  const targetRole = role === 'creator' ? 'creator' : 'brand';

  // Preserve intended role across browser redirect in both sessionStorage and localStorage
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('creasync_intended_role', targetRole);
      localStorage.setItem('creasync_intended_role', targetRole);
      localStorage.setItem('creasync_active_role', targetRole);
    } catch (e) {}
  }

  const callbackUrl = redirectTo || (typeof window !== 'undefined' ? window.location.origin : '');

  // Pre-validate whether Google OAuth is enabled in Supabase to prevent showing raw 400 error page
  if (supabaseUrl) {
    try {
      const probeUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(callbackUrl)}`;
      const probe = await fetch(probeUrl);
      if (probe.status === 400) {
        const errData = await probe.json().catch(() => ({}));
        if (errData.msg?.includes('not enabled') || errData.error_code === 'validation_failed') {
          const customErr = new Error('Google OAuth provider is not enabled in Supabase dashboard.');
          customErr.code = 'google_not_enabled';
          throw customErr;
        }
      }
    } catch (probeErr) {
      if (probeErr.code === 'google_not_enabled') {
        throw probeErr;
      }
    }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      },
      data: {
        intended_role: targetRole,
        role: targetRole
      }
    }
  });

  if (error) throw error;
  return data;
}

export async function signUp(email, password, role = 'creator', displayName = '') {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, display_name: displayName, intended_role: role }
      }
    });
    if (error) {
      if (error.code === 'over_email_send_rate_limit' || error.status === 429) {
        try {
          const res = await fetch('/api/auth/register-or-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role, displayName, source: 'rate_limit_bypass' })
          });
          const adminResult = await res.json();
          if (adminResult.ok) {
            const signInRes = await supabase.auth.signInWithPassword({ email, password });
            if (signInRes.data?.session) {
              return { user: signInRes.data.user, session: signInRes.data.session };
            }
          }
        } catch (adminFallbackErr) {
          console.warn('[CreaSync Auth] Rate-limit bypass note:', adminFallbackErr);
        }
      }

      const customErr = new Error(
        error.code === 'over_email_send_rate_limit' || error.status === 429
          ? 'Account creation is temporarily rate-limited by email services. You can continue exploring Alloy in demo mode.'
          : error.message
      );
      customErr.status = error.status;
      customErr.code = error.code;
      throw customErr;
    }

    // If Supabase created the user but did not return a session (email confirmation required)
    if (data.user && !data.session) {
      // Auto-confirm via server provisioner so user isn't stuck waiting for email
      try {
        const res = await fetch('/api/auth/register-or-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role, displayName, source: 'auto_confirm' })
        });
        const adminResult = await res.json();
        if (adminResult.ok) {
          const signInRes = await supabase.auth.signInWithPassword({ email, password });
          if (signInRes.data?.session) {
            return { user: signInRes.data.user, session: signInRes.data.session };
          }
        }
      } catch (autoConfirmErr) {
        console.warn('[CreaSync Auth] Auto-confirm note:', autoConfirmErr);
      }

      const confirmErr = new Error('Registration created. Email confirmation is required by Supabase to establish session, or you can continue exploring Alloy in demo mode.');
      confirmErr.code = 'confirmation_required';
      confirmErr.status = 200;
      throw confirmErr;
    }

    // Defensively create or update profile record if session exists
    if (data.user && data.session) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          role: role,
          display_name: displayName || email.split('@')[0],
          updated_at: new Date().toISOString()
        });

        // Automatically provision brand or creator record in Supabase tables
        if (role === 'brand') {
          const emailKey = email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '-');
          const brandId = `brand-${emailKey}`;
          const brandName = displayName || email.split('@')[0] || 'Brand Studio';
          await supabase.from('brands').upsert({
            id: brandId,
            user_id: data.user.id,
            name: brandName,
            industry: 'Creative & Digital',
            description: `${brandName} private studio workspace.`,
            aesthetic: 'Modern & Editorial',
            is_demo: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        } else if (role === 'creator') {
          const emailKey = email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '-');
          const creatorId = `creator-${emailKey}`;
          const creatorName = displayName || email.split('@')[0] || 'Creator Studio';
          const handle = `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
          await supabase.from('creator_profiles').upsert({
            id: creatorId,
            user_id: data.user.id,
            name: creatorName,
            handle,
            status: 'Published',
            visibility: 'published',
            is_demo: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        }

        await logActivity({
          actorRole: role,
          actorName: displayName || email.split('@')[0],
          actionType: 'USER_REGISTERED',
          entityType: 'user',
          entityId: data.user.id,
          metadata: { email, role },
          userId: data.user.id
        });
      } catch (profileErr) {
        console.warn('[CreaSync Auth] Profiles/Brands upsert note:', profileErr?.message || profileErr);
      }
    }
    const userWithProfile = data.user ? {
      ...data.user,
      role,
      profile: {
        id: data.user.id,
        email: data.user.email,
        role,
        display_name: displayName || email.split('@')[0]
      }
    } : null;

    if (typeof window !== 'undefined' && userWithProfile) {
      localStorage.setItem('creasync_active_user', JSON.stringify(userWithProfile));
      localStorage.setItem('creasync_active_role', role);
    }

    return { user: userWithProfile, session: data.session };
  }

  // Local fallback: Simulated session for demo/offline evaluation
  const mockUser = {
    id: `user-${Date.now()}`,
    email,
    role,
    display_name: displayName || email.split('@')[0],
    profile: {
      id: `user-${Date.now()}`,
      email,
      role,
      display_name: displayName || email.split('@')[0]
    }
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem('creasync_active_user', JSON.stringify(mockUser));
    localStorage.setItem('creasync_active_role', role);
  }
  return { user: mockUser, session: { access_token: 'mock-token' } };
}

export async function signIn(email, password) {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      const customErr = new Error(error.message);
      customErr.status = error.status;
      customErr.code = error.code;
      throw customErr;
    }

    // Safely resolve user profile or synthesize role
    let profile = null;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
      profile = profileData || null;
    } catch (e) {}

    const resolvedRole = profile?.role 
      || data.user.user_metadata?.role 
      || data.user.user_metadata?.intended_role 
      || (typeof window !== 'undefined' ? localStorage.getItem('creasync_active_role') : null)
      || (email.toLowerCase().includes('creator') ? 'creator' : 'brand');

    const synthesizedProfile = profile || {
      id: data.user.id,
      email: data.user.email,
      role: resolvedRole,
      display_name: data.user.user_metadata?.full_name || email.split('@')[0]
    };

    const userWithProfile = {
      ...data.user,
      role: resolvedRole,
      profile: synthesizedProfile
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('creasync_active_user', JSON.stringify(userWithProfile));
      localStorage.setItem('creasync_active_role', resolvedRole);
    }

    return { user: userWithProfile, session: data.session };
  }

  // Local fallback: Simulated user for demo/offline evaluation
  const mockRole = email.toLowerCase().includes('creator') ? 'creator' : 'brand';
  const mockUser = {
    id: `user-${email.replace(/[^a-zA-Z0-9]/g, '-')}`,
    email,
    role: mockRole,
    display_name: email.split('@')[0],
    profile: {
      id: `user-${email.replace(/[^a-zA-Z0-9]/g, '-')}`,
      email,
      role: mockRole,
      display_name: email.split('@')[0]
    }
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem('creasync_active_user', JSON.stringify(mockUser));
    localStorage.setItem('creasync_active_role', mockRole);
  }
  return { user: mockUser, session: { access_token: 'mock-token' } };
}

export async function signOut() {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) console.warn('[CreaSync Auth] Supabase signOut notice:', error.message);
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('creasync_active_user');
    localStorage.removeItem('creasync_intended_role');
    localStorage.removeItem('creasync_active_role');
    try {
      sessionStorage.removeItem('creasync_pending_action');
      sessionStorage.removeItem('creasync_intended_role');
    } catch (e) {}
  }
  return { ok: true };
}

export async function getCurrentUser() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) {
        // Safely attempt to fetch profile without failing authentication if table is absent
        let profile = null;
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          profile = profileData || null;
        } catch (profileErr) {
          // Table may not exist or RLS may restrict query
        }

        // If database profile query didn't return a record, synthesize profile from verified session state
        if (!profile) {
          const fallbackRole = (user.user_metadata?.intended_role === 'creator' || user.user_metadata?.intended_role === 'brand')
            ? user.user_metadata.intended_role
            : (user.user_metadata?.role === 'creator' || user.user_metadata?.role === 'brand')
              ? user.user_metadata.role
              : (typeof window !== 'undefined' && (localStorage.getItem('creasync_active_role') === 'creator' || localStorage.getItem('creasync_active_role') === 'brand'))
                ? localStorage.getItem('creasync_active_role')
                : null;

          if (fallbackRole) {
            profile = {
              id: user.id,
              email: user.email,
              role: fallbackRole,
              display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
              avatar_url: user.user_metadata?.avatar_url || ''
            };
          }
        }

        const fullUser = { 
          ...user, 
          role: profile?.role || (user.role !== 'authenticated' ? user.role : null) || 'brand',
          profile 
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem('creasync_active_user', JSON.stringify(fullUser));
          if (profile?.role) {
            localStorage.setItem('creasync_active_role', profile.role);
          }
        }
        return fullUser;
      }
    } catch (e) {
      // Fall through to local session check
    }
  }

  // Fallback to local stored session if no live cloud session
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('creasync_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

// ============================================================================
// 2. DATA NORMALIZATION HELPERS (PostgreSQL snake_case <-> Frontend camelCase)
// ============================================================================

export function normalizeSupabaseWorkflow(row) {
  if (!row) return null;
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    description: row.description,
    specialization: row.specialization,
    linkedProjectId: row.linked_project_id,
    linkedProjectTitle: row.linked_project_title,
    status: row.status || 'Published',
    visibility: row.visibility || 'published',
    humanInvolvementNotes: row.human_involvement_notes,
    steps: Array.isArray(row.steps) ? row.steps : [],
    isDemo: !!row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function normalizeSupabaseCreator(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    handle: row.handle,
    creativeIdentity: row.creative_identity,
    bio: row.bio,
    specialty: row.specialty,
    location: row.location,
    availability: row.availability,
    statusBadge: row.status_badge,
    turnaround: row.turnaround,
    experience: row.experience,
    heroWork: row.hero_work,
    videoPreview: row.video_preview,
    avatar: row.avatar,
    styles: row.styles || [],
    industries: row.industries || [],
    capabilities: row.capabilities || [],
    tools: row.tools || [],
    platforms: row.platforms || [],
    categoryTags: row.category_tags || [],
    technicalSkills: row.technical_skills || row.technicalSkills || [],
    creativeSkills: row.creative_skills || row.creativeSkills || [],
    status: row.status,
    visibility: row.visibility,
    isDemo: !!row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    projects: (row.projects || []).map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      creativeStyle: p.creative_style,
      tools: p.tools,
      format: p.format,
      image: p.image,
      video: p.video,
      aspect: p.aspect,
      role: p.role,
      clientType: p.client_type,
      creativeDirection: p.creative_direction,
      capabilities: p.capabilities || [],
      media: p.media || [],
      workflowId: p.workflow_id,
      workflowStages: p.workflow_stages || p.workflowStages || [],
      productionWorkflow: p.production_workflow || p.productionWorkflow || null,
      workflowTitle: p.workflow_title || p.workflowTitle || p.production_workflow?.title || '',
      workflowOverview: p.workflow_overview || p.workflowOverview || p.production_workflow?.overview || '',
      visibility: p.visibility,
      featured: !!p.featured,
      displayOrder: p.display_order,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    })),
    creativeDNA: row.creative_dna?.[0] ? {
      traits: row.creative_dna[0].traits || [],
      visualAesthetic: row.creative_dna[0].visual_aesthetic,
      storytellingApproach: row.creative_dna[0].storytelling_approach,
      productPresentationStyle: row.creative_dna[0].product_presentation_style,
      provenance: row.creative_dna[0].provenance || {},
      completeness: row.creative_dna[0].completeness || {},
      source: row.creative_dna[0].source,
      isLiveAI: !!row.creative_dna[0].is_live_ai
    } : null,
    workflows: (row.workflows || []).map(normalizeSupabaseWorkflow)
  };
}

export function normalizeSupabaseBrand(row) {
  if (!row) return null;
  const brandName = row.name || 'Brand Partner';
  return {
    id: row.id,
    userId: row.user_id,
    name: brandName,
    handle: '@' + brandName.toLowerCase().replace(/[^a-z0-9]/g, ''),
    industry: row.industry,
    website: row.website,
    logo: row.logo,
    coverImage: row.cover_image,
    description: row.description,
    aesthetic: row.aesthetic,
    brandColors: row.brand_colors || [],
    preferredPlatforms: row.preferred_platforms || [],
    isDemo: !!row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function normalizeSupabaseCampaign(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerBrandId: row.owner_brand_id,
    brandName: row.brand_name,
    brandAvatar: row.brand_avatar,
    brandWebsite: row.brand_website,
    title: row.title,
    objective: row.objective || 'Product Launch',
    productOrService: row.product_or_service || '',
    industry: row.industry,
    description: row.description,
    creativeDirection: row.creative_direction,
    creativeStyle: row.creative_style,
    toneOfVoice: row.tone_of_voice,
    desiredCreatorSpecialties: row.desired_creator_specialties || [],
    deliverables: row.deliverables || [],
    platforms: row.platforms || [],
    targetPlatforms: row.target_platforms || row.platforms || [],
    contentFormats: row.content_formats || [],
    budget: row.budget,
    currency: row.currency || 'USD',
    timeline: row.timeline,
    deadline: row.deadline,
    targetAudience: row.target_audience,
    coverImage: row.cover_image,
    status: row.status || 'Active',
    visibility: row.visibility || 'published',
    isDemo: !!row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function normalizeSupabaseInvitation(row) {
  if (!row) return null;
  return {
    id: row.id,
    brandId: row.brand_id,
    campaignId: row.campaign_id,
    creatorId: row.creator_id,
    campaignTitle: row.campaign_title,
    brandName: row.brand_name,
    brandAvatar: row.brand_logo,
    creatorName: row.creator_name,
    creatorAvatar: row.creator_avatar,
    title: row.campaign_title,
    budget: row.budget,
    timeline: row.timeline || row.deadline,
    deadline: row.deadline,
    deliverables: row.deliverables,
    summary: row.summary,
    status: (row.status || 'pending').toLowerCase(),
    isDemo: !!row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function normalizeSupabaseCollaboration(row) {
  if (!row) return null;
  return {
    id: row.id,
    brandId: row.brand_id,
    creatorId: row.creator_id,
    campaignId: row.campaign_id,
    campaignTitle: row.campaign_title,
    brandName: row.brand_name,
    brandContact: row.brand_contact || 'Creative Director',
    creatorName: row.creator_name,
    creatorAvatar: row.creator_avatar,
    status: row.status || 'in-progress',
    progressPercent: typeof row.progress_percent === 'number' ? row.progress_percent : 0,
    milestone: row.milestone,
    deadline: row.deadline,
    agreedBudget: row.agreed_budget || row.budget,
    deliverablesScope: row.deliverables_scope || (Array.isArray(row.deliverables) ? row.deliverables.join(' • ') : row.deliverables) || '',
    latestFeedback: row.latest_feedback || '',
    submissionUrl: row.submission_url || '',
    submissionNotes: row.submission_notes || '',
    submissionPreviews: Array.isArray(row.submission_previews) ? row.submission_previews : [],
    feedbackHistory: Array.isArray(row.feedback_history) ? row.feedback_history : [],
    revisionHistory: Array.isArray(row.revision_history) ? row.revision_history : [],
    isDemo: !!row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ============================================================================
// 3. ACTIVITY LOGGING SERVICE
// Strictly audit logs marketplace events without auth secrets/passwords.
// ============================================================================

export async function logActivity({ 
  actorRole = 'system', 
  actorName = 'System', 
  actionType, 
  entityType, 
  entityId, 
  metadata = {}, 
  userId = null 
}) {
  if (!actionType || !entityType || !entityId) return null;

  // Sanitize metadata: remove any tokens, passwords, secrets defensively
  const sanitized = { ...metadata };
  delete sanitized.password;
  delete sanitized.access_token;
  delete sanitized.refresh_token;
  delete sanitized.token;

  const logRecord = {
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId || null,
    actor_role: actorRole,
    actor_name: actorName,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId,
    metadata: sanitized,
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert(logRecord)
        .select()
        .single();
      if (!error && data) return data;
      if (error) console.info('[CreaSync Audit] Activity log note:', error.message);
    } catch (e) {
      // Activity logging does not block main flow if table is yet to be created
    }
  }

  return logRecord;
}

export async function fetchActivityLogs({ entityType = null, entityId = null, limit = 50 } = {}) {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (entityType) query = query.eq('entity_type', entityType);
      if (entityId) query = query.eq('entity_id', entityId);
      const { data, error } = await query;
      if (error) throw error;
      if (data) return data;
    } catch (err) {
      console.warn('[Supabase] Could not fetch activity logs:', err.message);
    }
  }
  return [];
}

// ============================================================================
// 4. CREATORS, PORTFOLIO PROJECTS & DNA
// ============================================================================

export async function fetchCreators() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: creators, error } = await supabase
        .from('creator_profiles')
        .select(`
          *,
          projects:portfolio_projects(*),
          creative_dna(*),
          workflows:creator_workflows(*)
        `);
      if (error) throw error;
      if (creators && creators.length > 0) {
        return creators.map(normalizeSupabaseCreator);
      }
    } catch (err) {
      console.warn('[Supabase] Failed to fetch creators from cloud:', err.message);
      // If table absent in initial setup, propagate or fall back safely
    }
  }

  // Local persistent engine fallback
  const state = getInitialMarketplaceState();
  return state.creators || CREATORS;
}

export async function fetchCreatorById(creatorId) {
  if (!creatorId) return null;
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('creator_profiles')
        .select(`
          *,
          projects:portfolio_projects(*),
          creative_dna(*),
          workflows:creator_workflows(*)
        `)
        .eq('id', creatorId)
        .single();
      if (error) throw error;
      if (data) return normalizeSupabaseCreator(data);
    } catch (err) {
      console.warn(`[Supabase] Could not fetch creator ${creatorId}:`, err.message);
    }
  }

  const state = getInitialMarketplaceState();
  return (state.creators || CREATORS).find(c => c.id === creatorId) || null;
}

export async function saveCreator(creatorData, userId = null) {
  if (!creatorData || !creatorData.id) {
    throw new Error('Invalid creator data: id is required.');
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      // Resolve user_id: explicit userId, or active auth user session
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        resolvedUserId = user?.id || null;
      }

      const upsertPayload = {
        id: creatorData.id,
        name: creatorData.name,
        handle: creatorData.handle,
        creative_identity: creatorData.creativeIdentity,
        bio: creatorData.bio,
        specialty: creatorData.specialty,
        location: creatorData.location,
        availability: creatorData.availability,
        status_badge: creatorData.statusBadge,
        turnaround: creatorData.turnaround,
        experience: creatorData.experience,
        hero_work: creatorData.heroWork,
        avatar: creatorData.avatar,
        styles: creatorData.styles || [],
        industries: creatorData.industries || [],
        capabilities: creatorData.capabilities || [],
        tools: creatorData.tools || [],
        platforms: creatorData.platforms || [],
        category_tags: creatorData.categoryTags || [],
        technical_skills: creatorData.technicalSkills || creatorData.technical_skills || [],
        creative_skills: creatorData.creativeSkills || creatorData.creative_skills || [],
        status: creatorData.status || 'Published',
        visibility: creatorData.visibility || 'published',
        is_demo: !!creatorData.isDemo,
        updated_at: new Date().toISOString()
      };
      if (resolvedUserId) {
        upsertPayload.user_id = resolvedUserId;
      }

      const { data, error } = await supabase
        .from('creator_profiles')
        .upsert(upsertPayload)
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: 'creator',
        actorName: creatorData.name,
        actionType: 'CREATOR_PROFILE_SAVED',
        entityType: 'creator_profile',
        entityId: creatorData.id,
        metadata: { specialty: creatorData.specialty, status: creatorData.status },
        userId: resolvedUserId
      });

      // Synchronize local cache with confirmed write
      const state = getInitialMarketplaceState();
      saveMarketplaceState(updateCreatorRecord(state, creatorData));

      return data;
    } catch (err) {
      console.error('[Supabase] Database error saving creator profile:', err);
      throw new Error(`Failed to save creator profile to database: ${err.message}`);
    }
  }

  // Local persistent engine fallback
  const state = getInitialMarketplaceState();
  const nextState = updateCreatorRecord(state, creatorData);
  saveMarketplaceState(nextState);
  return creatorData;
}

export async function savePortfolioProject(creatorId, project) {
  if (!creatorId || !project || !project.id) {
    throw new Error('creatorId and project.id are required.');
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('portfolio_projects')
        .upsert({
          id: project.id,
          creator_id: creatorId,
          title: project.title,
          description: project.description,
          category: project.category,
          creative_style: project.creativeStyle,
          tools: project.tools,
          format: project.format,
          image: project.image,
          video: project.video || null,
          media: project.media || [],
          workflow_id: project.workflowId || null,
          workflow_stages: project.workflowStages || project.workflow_stages || [],
          production_workflow: project.productionWorkflow || project.production_workflow || {},
          aspect: project.aspect || '16:9',
          role: project.role,
          client_type: project.clientType,
          creative_direction: project.creativeDirection,
          capabilities: project.capabilities || [],
          visibility: project.visibility || 'published',
          featured: !!project.featured,
          display_order: project.displayOrder || 0,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: 'creator',
        actorName: creatorId,
        actionType: 'PORTFOLIO_PROJECT_SAVED',
        entityType: 'portfolio_project',
        entityId: project.id,
        metadata: { title: project.title, category: project.category }
      });

      // Synchronize local cache
      const state = getInitialMarketplaceState();
      const creator = (state.creators || CREATORS).find(c => c.id === creatorId);
      if (creator) {
        const existingIdx = (creator.projects || []).findIndex(p => p.id === project.id);
        const updatedProjects = existingIdx >= 0
          ? creator.projects.map(p => p.id === project.id ? { ...p, ...project } : p)
          : [project, ...(creator.projects || [])];
        saveMarketplaceState(updateCreatorRecord(state, { ...creator, projects: updatedProjects }));
      }

      return data;
    } catch (err) {
      console.error('[Supabase] Database error saving portfolio project:', err);
      throw new Error(`Failed to save portfolio project to database: ${err.message}`);
    }
  }

  // Local fallback
  const state = getInitialMarketplaceState();
  const creator = (state.creators || CREATORS).find(c => c.id === creatorId);
  if (creator) {
    const existingIdx = (creator.projects || []).findIndex(p => p.id === project.id);
    const updatedProjects = existingIdx >= 0
      ? creator.projects.map(p => p.id === project.id ? { ...p, ...project } : p)
      : [project, ...(creator.projects || [])];
    saveMarketplaceState(updateCreatorRecord(state, { ...creator, projects: updatedProjects }));
  }
  return project;
}

export async function deletePortfolioProject(creatorId, projectId) {
  if (!creatorId || !projectId) {
    throw new Error('creatorId and projectId are required.');
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('portfolio_projects')
        .delete()
        .eq('id', projectId)
        .eq('creator_id', creatorId);
      if (error) throw error;

      await logActivity({
        actorRole: 'creator',
        actorName: creatorId,
        actionType: 'PORTFOLIO_PROJECT_DELETED',
        entityType: 'portfolio_project',
        entityId: projectId
      });

      // Synchronize local cache
      const state = getInitialMarketplaceState();
      const creator = (state.creators || CREATORS).find(c => c.id === creatorId);
      if (creator) {
        const updatedProjects = (creator.projects || []).filter(p => p.id !== projectId);
        saveMarketplaceState(updateCreatorRecord(state, { ...creator, projects: updatedProjects }));
      }

      return { ok: true, id: projectId };
    } catch (err) {
      console.error('[Supabase] Database error deleting portfolio project:', err);
      throw new Error(`Failed to delete project from database: ${err.message}`);
    }
  }

  // Local fallback
  const state = getInitialMarketplaceState();
  const creator = (state.creators || CREATORS).find(c => c.id === creatorId);
  if (creator) {
    const updatedProjects = (creator.projects || []).filter(p => p.id !== projectId);
    saveMarketplaceState(updateCreatorRecord(state, { ...creator, projects: updatedProjects }));
  }
  return { ok: true, id: projectId };
}

export async function saveCreativeDNA(creatorId, dna) {
  if (!creatorId || !dna) return dna;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('creative_dna')
        .upsert({
          id: `dna-${creatorId}`,
          creator_id: creatorId,
          traits: dna.traits || [],
          visual_aesthetic: dna.visualAesthetic,
          storytelling_approach: dna.storytellingApproach,
          product_presentation_style: dna.productPresentationStyle,
          provenance: dna.provenance || {},
          completeness: dna.completeness || {},
          source: dna.source || 'deterministic',
          is_live_ai: !!dna.isLiveAI,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;

      const state = getInitialMarketplaceState();
      const creator = (state.creators || CREATORS).find(c => c.id === creatorId);
      if (creator) {
        saveMarketplaceState(updateCreatorRecord(state, { ...creator, creativeDNA: dna }));
      }

      return data;
    } catch (err) {
      console.error('[Supabase] Database error saving Creative DNA:', err);
      throw new Error(`Failed to save Creative DNA: ${err.message}`);
    }
  }

  // Local fallback
  const state = getInitialMarketplaceState();
  const creator = (state.creators || CREATORS).find(c => c.id === creatorId);
  if (creator) {
    saveMarketplaceState(updateCreatorRecord(state, { ...creator, creativeDNA: dna }));
  }
  return dna;
}

// ============================================================================
// 5. BRANDS, CAMPAIGNS & SHORTLISTS
// ============================================================================

export async function fetchBrands() {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from('brands').select('*');
      if (error) throw error;
      if (data) {
        return data.map(normalizeSupabaseBrand);
      }
    } catch (err) {
      console.warn('[Supabase] Could not fetch brands from cloud:', err.message);
    }
  }
  const state = getInitialMarketplaceState();
  return state.brands;
}

export async function saveBrand(brandData, userId = null) {
  if (!brandData || !brandData.id) {
    throw new Error('Invalid brandData: id is required.');
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        resolvedUserId = user?.id || null;
      }

      const upsertPayload = {
        id: brandData.id,
        name: brandData.name,
        industry: brandData.industry,
        website: brandData.website,
        logo: brandData.logo,
        cover_image: brandData.coverImage,
        description: brandData.description,
        aesthetic: brandData.aesthetic,
        brand_colors: brandData.brandColors || [],
        preferred_platforms: brandData.preferredPlatforms || [],
        is_demo: true,
        updated_at: new Date().toISOString()
      };
      if (resolvedUserId) {
        upsertPayload.user_id = resolvedUserId;
      }

      const { data, error } = await supabase
        .from('brands')
        .upsert(upsertPayload)
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: 'brand',
        actorName: brandData.name,
        actionType: 'BRAND_SAVED',
        entityType: 'brand',
        entityId: brandData.id,
        userId: resolvedUserId
      });

      // Synchronize local cache
      const state = getInitialMarketplaceState();
      const exists = (state.brands || []).some(b => b.id === brandData.id);
      const updatedBrands = exists
        ? state.brands.map(b => b.id === brandData.id ? { ...b, ...brandData } : b)
        : [brandData, ...(state.brands || [])];
      saveMarketplaceState({ ...state, brands: updatedBrands });

      return data;
    } catch (err) {
      console.error('[Supabase] Database error saving brand:', err);
      throw new Error(`Failed to save brand to database: ${err.message}`);
    }
  }

  // Local fallback
  const state = getInitialMarketplaceState();
  const exists = (state.brands || []).some(b => b.id === brandData.id);
  const updatedBrands = exists
    ? state.brands.map(b => b.id === brandData.id ? { ...b, ...brandData } : b)
    : [brandData, ...(state.brands || [])];
  saveMarketplaceState({ ...state, brands: updatedBrands });
  return brandData;
}

export async function fetchCampaigns(brandId = null) {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from('campaigns').select('*');
      if (brandId) {
        query = query.eq('owner_brand_id', brandId);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        return data.map(normalizeSupabaseCampaign);
      }
    } catch (err) {
      console.warn('[Supabase] Could not fetch campaigns from cloud:', err.message);
    }
  }

  const state = getInitialMarketplaceState();
  return brandId 
    ? (state.campaigns || []).filter(c => c.ownerBrandId === brandId)
    : (state.campaigns || []);
}

export async function saveCampaign(campaignData, brand, userId = null) {
  const finalRecord = createCampaignRecord(campaignData, brand);

  if (isSupabaseConfigured() && supabase) {
    try {
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        resolvedUserId = user?.id || null;
      }

      // Ensure parent brand exists in Supabase so Foreign Key constraint passes
      if (finalRecord.ownerBrandId) {
        const brandPayload = {
          id: finalRecord.ownerBrandId,
          name: finalRecord.brandName || (brand && brand.name) || 'Brand Partner',
          industry: finalRecord.industry || (brand && brand.industry) || 'Creative & Media',
          website: finalRecord.brandWebsite || (brand && brand.website) || '',
          logo: finalRecord.brandAvatar || (brand && brand.logo) || null,
          is_demo: true,
          updated_at: new Date().toISOString()
        };
        if (resolvedUserId) {
          brandPayload.user_id = resolvedUserId;
        }
        await supabase.from('brands').upsert(brandPayload, { onConflict: 'id' });
      }

      const { data, error } = await supabase
        .from('campaigns')
        .upsert({
          id: finalRecord.id,
          owner_brand_id: finalRecord.ownerBrandId,
          brand_name: finalRecord.brandName,
          brand_avatar: finalRecord.brandAvatar,
          brand_website: finalRecord.brandWebsite,
          title: finalRecord.title,
          objective: finalRecord.objective,
          product_or_service: finalRecord.productOrService,
          industry: finalRecord.industry,
          description: finalRecord.description,
          creative_direction: finalRecord.creativeDirection,
          creative_style: finalRecord.creativeStyle,
          tone_of_voice: finalRecord.toneOfVoice,
          desired_creator_specialties: finalRecord.desiredCreatorSpecialties || [],
          deliverables: finalRecord.deliverables || [],
          platforms: finalRecord.platforms || [],
          budget: finalRecord.budget,
          currency: finalRecord.currency,
          timeline: finalRecord.timeline,
          deadline: finalRecord.deadline,
          target_audience: finalRecord.targetAudience,
          cover_image: finalRecord.coverImage,
          status: finalRecord.status,
          visibility: finalRecord.visibility,
          is_demo: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: 'brand',
        actorName: finalRecord.brandName,
        actionType: 'CAMPAIGN_SAVED',
        entityType: 'campaign',
        entityId: finalRecord.id,
        metadata: { title: finalRecord.title, budget: finalRecord.budget, status: finalRecord.status },
        userId
      });

      // Synchronize local cache
      const state = getInitialMarketplaceState();
      const exists = (state.campaigns || []).some(c => c.id === finalRecord.id);
      const updatedCampaigns = exists
        ? state.campaigns.map(c => c.id === finalRecord.id ? { ...c, ...finalRecord } : c)
        : [finalRecord, ...(state.campaigns || [])];
      saveMarketplaceState({ ...state, campaigns: updatedCampaigns, activeCampaignId: finalRecord.id });

      return data;
    } catch (err) {
      console.error('[Supabase] Database error saving campaign:', err);
      throw new Error(`Failed to save campaign to database: ${err.message}`);
    }
  }

  // Local fallback
  const state = getInitialMarketplaceState();
  const exists = (state.campaigns || []).some(c => c.id === finalRecord.id);
  const updatedCampaigns = exists
    ? state.campaigns.map(c => c.id === finalRecord.id ? { ...c, ...finalRecord } : c)
    : [finalRecord, ...(state.campaigns || [])];
  saveMarketplaceState({ ...state, campaigns: updatedCampaigns, activeCampaignId: finalRecord.id });
  return finalRecord;
}

export async function deleteCampaign(campaignId) {
  if (!campaignId) return { ok: false };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);
      if (error) throw error;

      await logActivity({
        actorRole: 'brand',
        actorName: 'Brand',
        actionType: 'CAMPAIGN_DELETED',
        entityType: 'campaign',
        entityId: campaignId
      });

      const state = getInitialMarketplaceState();
      const remaining = (state.campaigns || []).filter(c => c.id !== campaignId);
      const newShortlists = { ...(state.shortlists || {}) };
      delete newShortlists[campaignId];
      saveMarketplaceState({ ...state, campaigns: remaining, shortlists: newShortlists });

      return { ok: true, id: campaignId };
    } catch (err) {
      console.error('[Supabase] Database error deleting campaign:', err);
      throw new Error(`Failed to delete campaign from database: ${err.message}`);
    }
  }

  const state = getInitialMarketplaceState();
  const remaining = (state.campaigns || []).filter(c => c.id !== campaignId);
  const newShortlists = { ...(state.shortlists || {}) };
  delete newShortlists[campaignId];
  saveMarketplaceState({ ...state, campaigns: remaining, shortlists: newShortlists });
  return { ok: true, id: campaignId };
}

export async function fetchShortlists(brandId = null) {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from('shortlists').select('*');
      if (brandId) query = query.eq('brand_id', brandId);
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        const shortlistsMap = {};
        data.forEach(row => {
          if (!shortlistsMap[row.campaign_id]) {
            shortlistsMap[row.campaign_id] = [];
          }
          shortlistsMap[row.campaign_id].push(row.creator_id);
        });
        return shortlistsMap;
      }
    } catch (err) {
      console.warn('[Supabase] Could not fetch shortlists from cloud:', err.message);
    }
  }

  const state = getInitialMarketplaceState();
  return state.shortlists || {};
}

export async function toggleShortlist(brandIdOrCampaignId, campaignIdOrCreatorId, optionalCreatorId) {
  let brandId = brandIdOrCampaignId;
  let campaignId = campaignIdOrCreatorId;
  let creatorId = optionalCreatorId;

  if (!optionalCreatorId) {
    campaignId = brandIdOrCampaignId;
    creatorId = campaignIdOrCreatorId;
    brandId = null;
  }

  if (!brandId || brandId === 'brand-active' || brandId === 'brand-general') {
    const state = getInitialMarketplaceState();
    const camp = (state.campaigns || []).find(c => c.id === campaignId);
    brandId = camp?.ownerBrandId || 'brand-demo-lumina';
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: existing } = await supabase
        .from('shortlists')
        .select('id')
        .eq('campaign_id', campaignId)
        .eq('creator_id', creatorId)
        .maybeSingle();

      if (existing) {
        const { error: delErr } = await supabase
          .from('shortlists')
          .delete()
          .eq('id', existing.id);
        if (delErr) throw delErr;

        await logActivity({
          actorRole: 'brand',
          actorName: brandId,
          actionType: 'SHORTLIST_REMOVED',
          entityType: 'creator_profile',
          entityId: creatorId,
          metadata: { campaignId }
        });

        // Update local state
        const state = getInitialMarketplaceState();
        const cur = (state.shortlists?.[campaignId] || []).filter(id => id !== creatorId);
        saveMarketplaceState({ ...state, shortlists: { ...state.shortlists, [campaignId]: cur } });

        return { isShortlisted: false, creatorId, campaignId };
      } else {
        if (brandId) {
          await supabase.from('brands').upsert({
            id: brandId,
            name: 'Brand Partner',
            is_demo: true,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        }
        const newId = `sl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const { error: insErr } = await supabase
          .from('shortlists')
          .insert({
            id: newId,
            brand_id: brandId,
            campaign_id: campaignId,
            creator_id: creatorId
          });
        if (insErr) throw insErr;

        await logActivity({
          actorRole: 'brand',
          actorName: brandId,
          actionType: 'SHORTLIST_ADDED',
          entityType: 'creator_profile',
          entityId: creatorId,
          metadata: { campaignId }
        });

        const state = getInitialMarketplaceState();
        const cur = [...(state.shortlists?.[campaignId] || []), creatorId];
        saveMarketplaceState({ ...state, shortlists: { ...state.shortlists, [campaignId]: cur } });

        return { isShortlisted: true, creatorId, campaignId };
      }
    } catch (err) {
      console.error('[Supabase] Database error toggling shortlist:', err);
      throw new Error(`Failed to update shortlist in database: ${err.message}`);
    }
  }

  // Local fallback
  const state = getInitialMarketplaceState();
  const currentShortlist = state.shortlists?.[campaignId] || [];
  const exists = currentShortlist.includes(creatorId);
  const updatedList = exists
    ? currentShortlist.filter(id => id !== creatorId)
    : [...currentShortlist, creatorId];

  saveMarketplaceState({
    ...state,
    shortlists: {
      ...state.shortlists,
      [campaignId]: updatedList
    }
  });
  return { isShortlisted: !exists, list: updatedList, creatorId, campaignId };
}

// ============================================================================
// 6. INVITATIONS & COLLABORATIONS
// ============================================================================

export async function fetchInvitations(actorId = null, role = null) {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from('invitations').select('*');
      if (actorId && role === 'creator') {
        query = query.eq('creator_id', actorId);
      } else if (actorId && role === 'brand') {
        query = query.eq('brand_id', actorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        return data.map(normalizeSupabaseInvitation);
      }
    } catch (err) {
      console.warn('[Supabase] Could not fetch invitations from cloud:', err.message);
    }
  }

  const state = getInitialMarketplaceState();
  const invs = state.invitations || [];
  if (actorId && role === 'creator') {
    return invs.filter(i => i.creatorId === actorId);
  }
  if (actorId && role === 'brand') {
    return invs.filter(i => i.brandId === actorId);
  }
  return invs;
}

export async function sendInvitation(invitationData, actorName = null, userId = null) {
  const invRecord = {
    id: invitationData.id || `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    brandId: invitationData.brandId,
    campaignId: invitationData.campaignId,
    creatorId: invitationData.creatorId,
    campaignTitle: invitationData.campaignTitle || invitationData.title,
    brandName: invitationData.brandName,
    brandLogo: invitationData.brandLogo || invitationData.brandAvatar,
    creatorName: invitationData.creatorName,
    creatorAvatar: invitationData.creatorAvatar,
    budget: invitationData.budget,
    timeline: invitationData.timeline || invitationData.deadline,
    deadline: invitationData.deadline || invitationData.timeline,
    deliverables: typeof invitationData.deliverables === 'string'
      ? invitationData.deliverables
      : (Array.isArray(invitationData.deliverables) ? invitationData.deliverables.join(' • ') : ''),
    summary: invitationData.summary,
    status: (invitationData.status || 'Pending').toLowerCase(),
    isDemo: !!invitationData.isDemo
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      if (invRecord.brandId) {
        const brandPayload = {
          id: invRecord.brandId,
          name: invRecord.brandName || 'Brand Partner',
          logo: invRecord.brandLogo || null,
          is_demo: !userId,
          updated_at: new Date().toISOString()
        };
        if (userId) {
          brandPayload.user_id = userId;
        }
        await supabase.from('brands').upsert(brandPayload, { onConflict: 'id' });
      }

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          id: invRecord.id,
          brand_id: invRecord.brandId,
          campaign_id: invRecord.campaignId,
          creator_id: invRecord.creatorId,
          campaign_title: invRecord.campaignTitle,
          brand_name: invRecord.brandName,
          brand_logo: invRecord.brandLogo,
          creator_name: invRecord.creatorName,
          creator_avatar: invRecord.creatorAvatar,
          budget: invRecord.budget,
          timeline: invRecord.timeline,
          deadline: invRecord.deadline,
          deliverables: invRecord.deliverables,
          summary: invRecord.summary,
          status: invRecord.status,
          is_demo: true
        })
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: 'brand',
        actorName: actorName || invRecord.brandName,
        actionType: 'INVITATION_SENT',
        entityType: 'invitation',
        entityId: invRecord.id,
        metadata: {
          creatorId: invRecord.creatorId,
          creatorName: invRecord.creatorName,
          campaignTitle: invRecord.campaignTitle,
          budget: invRecord.budget
        },
        userId
      });

      // Persist initial invitation message to Supabase messages table if summary exists
      const canonicalConnId = invRecord.campaignId
        ? `conn-${invRecord.campaignId}-${invRecord.creatorId}`
        : `conn-${invRecord.brandId || 'brand-general'}-${invRecord.creatorId}`;

      if (invRecord.summary) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            await supabase.from('messages').insert({
              id: `msg-inv-${invRecord.id}`,
              conversation_id: canonicalConnId,
              sender: 'brand',
              sender_name: invRecord.brandName || 'Brand Partner',
              text: invRecord.summary,
              created_at: new Date().toISOString()
            });
          }
        } catch (msgErr) {
          console.warn('[Supabase] Initial message persistence deferred:', msgErr.message);
        }
      }

      // Synchronize local cache with both invitation and canonical connection thread
      const state = getInitialMarketplaceState();
      const existingConnIndex = (state.connections || []).findIndex(c => 
        c.id === canonicalConnId || (c.creatorId === invRecord.creatorId && c.campaignId === invRecord.campaignId)
      );
      const initialMessageObj = {
        id: `msg-inv-${invRecord.id}`,
        conversationId: canonicalConnId,
        sender: 'brand',
        senderName: invRecord.brandName || 'Brand Partner',
        text: invRecord.summary || `Direct invitation from ${invRecord.brandName || 'Brand Partner'} to collaborate.`,
        timestamp: 'Just now'
      };
      const connRecord = {
        id: canonicalConnId,
        brandId: invRecord.brandId,
        creatorId: invRecord.creatorId,
        creatorName: invRecord.creatorName,
        creatorRole: "Creative Partner",
        creatorAvatar: invRecord.creatorAvatar,
        campaignId: invRecord.campaignId,
        campaignTitle: invRecord.campaignTitle,
        brandName: invRecord.brandName,
        status: 'connected',
        createdAt: 'Just now',
        connectedAt: 'Just now',
        messages: [initialMessageObj]
      };
      const nextConnections = existingConnIndex >= 0
        ? state.connections.map((c, i) => i === existingConnIndex ? { ...c, ...connRecord, messages: (c.messages && c.messages.length > 0) ? c.messages : [initialMessageObj] } : c)
        : [connRecord, ...(state.connections || [])];

      saveMarketplaceState({
        ...state,
        invitations: [normalizeSupabaseInvitation(data), ...(state.invitations || [])],
        connections: nextConnections
      });

      return normalizeSupabaseInvitation(data);
    } catch (err) {
      console.error('[Supabase] Database error sending invitation:', err);
      throw new Error(`Failed to send invitation to database: ${err.message}`);
    }
  }

  // Local fallback
  const canonicalConnId = invRecord.campaignId
    ? `conn-${invRecord.campaignId}-${invRecord.creatorId}`
    : `conn-${invRecord.brandId || 'brand-general'}-${invRecord.creatorId}`;

  const state = getInitialMarketplaceState();
  const existingConnIndex = (state.connections || []).findIndex(c => 
    c.id === canonicalConnId || (c.creatorId === invRecord.creatorId && c.campaignId === invRecord.campaignId)
  );
  const initialMessageObj = {
    id: `msg-inv-${invRecord.id}`,
    conversationId: canonicalConnId,
    sender: 'brand',
    senderName: invRecord.brandName || 'Brand Partner',
    text: invRecord.summary || `Direct invitation from ${invRecord.brandName || 'Brand Partner'} to collaborate.`,
    timestamp: 'Just now'
  };
  const connRecord = {
    id: canonicalConnId,
    brandId: invRecord.brandId,
    creatorId: invRecord.creatorId,
    creatorName: invRecord.creatorName,
    creatorRole: "Creative Partner",
    creatorAvatar: invRecord.creatorAvatar,
    campaignId: invRecord.campaignId,
    campaignTitle: invRecord.campaignTitle,
    brandName: invRecord.brandName,
    status: 'connected',
    createdAt: 'Just now',
    connectedAt: 'Just now',
    messages: [initialMessageObj]
  };
  const nextConnections = existingConnIndex >= 0
    ? state.connections.map((c, i) => i === existingConnIndex ? { ...c, ...connRecord, messages: (c.messages && c.messages.length > 0) ? c.messages : [initialMessageObj] } : c)
    : [connRecord, ...(state.connections || [])];

  const nextState = {
    ...state,
    invitations: [invRecord, ...(state.invitations || [])],
    connections: nextConnections
  };
  saveMarketplaceState(nextState);
  return invRecord;
}

export async function updateInvitationStatus(invitationId, newStatus, actorName = null, userId = null) {
  if (!invitationId || !newStatus) return null;
  const statusStr = newStatus.toLowerCase();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .update({
          status: statusStr,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: 'creator',
        actorName: actorName || 'Creator',
        actionType: statusStr === 'accepted' ? 'INVITATION_ACCEPTED' : 'INVITATION_DECLINED',
        entityType: 'invitation',
        entityId: invitationId,
        metadata: { status: statusStr },
        userId
      });

      // Sync local cache
      const state = getInitialMarketplaceState();
      const updatedInvs = (state.invitations || []).map(i =>
        i.id === invitationId ? { ...i, status: statusStr } : i
      );
      saveMarketplaceState({ ...state, invitations: updatedInvs });

      return normalizeSupabaseInvitation(data);
    } catch (err) {
      console.error(`[Supabase] Database error updating invitation ${invitationId}:`, err);
      throw new Error(`Failed to update invitation status: ${err.message}`);
    }
  }

  // Local fallback
  const state = getInitialMarketplaceState();
  const updatedInvs = (state.invitations || []).map(i =>
    i.id === invitationId ? { ...i, status: statusStr } : i
  );
  saveMarketplaceState({ ...state, invitations: updatedInvs });
  return { id: invitationId, status: statusStr };
}

export async function fetchCollaborations(actorId = null, role = null) {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from('collaborations').select('*');
      if (actorId && role === 'creator') {
        query = query.eq('creator_id', actorId);
      } else if (actorId && role === 'brand') {
        query = query.eq('brand_id', actorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        return data.map(normalizeSupabaseCollaboration);
      }
    } catch (err) {
      console.warn('[Supabase] Could not fetch collaborations from cloud:', err.message);
    }
  }

  const state = getInitialMarketplaceState();
  const projs = state.projects || [];
  if (actorId && role === 'creator') {
    return projs.filter(p => p.creatorId === actorId);
  }
  if (actorId && role === 'brand') {
    return projs.filter(p => p.brandId === actorId);
  }
  return projs;
}

export async function saveCollaboration(collabData, actorName = null, userId = null) {
  if (!collabData) {
    throw new Error('Invalid collabData: object is required.');
  }
  const collabId = collabData.id || `collab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (isSupabaseConfigured() && supabase) {
    try {
      if (collabData.brandId) {
        await supabase.from('brands').upsert({
          id: collabData.brandId,
          name: collabData.brandName || 'Brand Partner',
          is_demo: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      }

      const payload = {
        id: collabId,
        brand_id: collabData.brandId,
        creator_id: collabData.creatorId,
        campaign_id: collabData.campaignId || null,
        campaign_title: collabData.campaignTitle || collabData.title || 'Creative Collaboration',
        brand_name: collabData.brandName || 'Brand Partner',
        creator_name: collabData.creatorName || 'Creator',
        creator_avatar: collabData.creatorAvatar || null,
        brand_contact: collabData.brandContact || 'Creative Director',
        budget: collabData.agreedBudget || collabData.budget || 'In Discussion',
        agreed_budget: collabData.agreedBudget || collabData.budget || 'In Discussion',
        milestone: collabData.milestone || 'Milestone 1 of 3',
        progress_percent: typeof collabData.progressPercent === 'number' ? collabData.progressPercent : 30,
        deadline: collabData.deadline || null,
        deliverables: Array.isArray(collabData.deliverables) ? collabData.deliverables : [],
        deliverables_scope: collabData.deliverablesScope || '',
        submission_url: collabData.submissionUrl || null,
        submission_notes: collabData.submissionNotes || null,
        revision_notes: collabData.revisionNotes || null,
        latest_feedback: collabData.latestFeedback || null,
        submission_previews: Array.isArray(collabData.submissionPreviews) ? collabData.submissionPreviews : [],
        feedback_history: Array.isArray(collabData.feedbackHistory) ? collabData.feedbackHistory : [],
        status: (collabData.status === 'active' || collabData.status === 'in_progress') ? 'in-progress' : (collabData.status || 'in-progress'),
        is_demo: true,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('collaborations')
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: collabData.actorRole || 'creator',
        actorName: actorName || collabData.creatorName || 'User',
        actionType: 'COLLABORATION_UPDATED',
        entityType: 'collaboration',
        entityId: collabData.id,
        metadata: {
          campaignTitle: payload.campaign_title,
          status: payload.status,
          progressPercent: payload.progress_percent
        },
        userId
      });

      // Synchronize local cache
      const state = getInitialMarketplaceState();
      const exists = (state.projects || []).some(p => p.id === collabData.id);
      const updatedProjects = exists
        ? state.projects.map(p => p.id === collabData.id ? { ...p, ...collabData } : p)
        : [collabData, ...(state.projects || [])];
      saveMarketplaceState({ ...state, projects: updatedProjects });

      return normalizeSupabaseCollaboration(data);
    } catch (err) {
      console.error('[Supabase] Database error saving collaboration:', err);
      throw new Error(`Failed to save collaboration to database: ${err.message}`);
    }
  }

  // Local fallback
  const state = getInitialMarketplaceState();
  const exists = (state.projects || []).some(p => p.id === collabData.id);
  const updatedProjects = exists
    ? state.projects.map(p => p.id === collabData.id ? { ...p, ...collabData } : p)
    : [collabData, ...(state.projects || [])];
  saveMarketplaceState({ ...state, projects: updatedProjects });
  return collabData;
}

export async function submitDeliverables(collabId, { assetsUrl, notes, milestone, previews = [] }, actorName = null, userId = null) {
  if (!collabId || !assetsUrl) {
    throw new Error('collabId and assetsUrl are required for submission.');
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: current } = await supabase
        .from('collaborations')
        .select('*')
        .eq('id', collabId)
        .single();

      const nextPreviews = previews.length > 0 
        ? previews 
        : (current?.submission_previews?.length ? current.submission_previews : [
            'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80'
          ]);

      const { data, error } = await supabase
        .from('collaborations')
        .update({
          status: 'submitted',
          submission_url: assetsUrl,
          submission_notes: notes || '',
          milestone: milestone || current?.milestone || 'Milestone 2 of 3',
          progress_percent: 85,
          submission_previews: nextPreviews,
          latest_feedback: '“Deliverables submitted for review! Brand creative director evaluating master passes.”',
          updated_at: new Date().toISOString()
        })
        .eq('id', collabId)
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: 'creator',
        actorName: actorName || 'Creator',
        actionType: 'DELIVERABLES_SUBMITTED',
        entityType: 'collaboration',
        entityId: collabId,
        metadata: { assetsUrl, milestone: milestone || 'Milestone 2 of 3' },
        userId
      });

      return normalizeSupabaseCollaboration(data);
    } catch (err) {
      console.error('[Supabase] Database error submitting deliverables:', err);
      throw new Error(`Failed to submit deliverables to database: ${err.message}`);
    }
  }

  // Local fallback
  return null;
}

export async function requestRevision(collabId, { revisionNotes, feedbackText }, actorName = null, userId = null) {
  if (!collabId || !revisionNotes) {
    throw new Error('collabId and revisionNotes are required.');
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: current } = await supabase
        .from('collaborations')
        .select('*')
        .eq('id', collabId)
        .single();

      const newFb = {
        id: `fb-${Date.now()}`,
        author: actorName || 'Brand Creative Director',
        role: 'brand',
        text: feedbackText || `“Revision requested: ${revisionNotes}”`,
        timestamp: 'Just now'
      };

      const updatedHistory = [newFb, ...(current?.feedback_history || [])];

      const { data, error } = await supabase
        .from('collaborations')
        .update({
          status: 'revision-requested',
          revision_notes: revisionNotes,
          latest_feedback: newFb.text,
          feedback_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', collabId)
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: 'brand',
        actorName: actorName || 'Brand Partner',
        actionType: 'REVISION_REQUESTED',
        entityType: 'collaboration',
        entityId: collabId,
        metadata: { revisionNotes },
        userId
      });

      return normalizeSupabaseCollaboration(data);
    } catch (err) {
      console.error('[Supabase] Database error requesting revision:', err);
      throw new Error(`Failed to request revision in database: ${err.message}`);
    }
  }

  return null;
}

export async function approveDeliverables(collabId, { approvalNotes, feedbackText }, actorName = null, userId = null) {
  if (!collabId) {
    throw new Error('collabId is required.');
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: current } = await supabase
        .from('collaborations')
        .select('*')
        .eq('id', collabId)
        .single();

      const newFb = {
        id: `fb-${Date.now()}`,
        author: actorName || 'Brand Creative Director',
        role: 'brand',
        text: feedbackText || (approvalNotes ? `“Approved: ${approvalNotes}”` : '“Deliverables approved! Final milestone unlocked & payout released.”'),
        timestamp: 'Just now'
      };

      const updatedHistory = [newFb, ...(current?.feedback_history || [])];

      const { data, error } = await supabase
        .from('collaborations')
        .update({
          status: 'approved',
          progress_percent: 100,
          milestone: 'Final Milestone: All Master Assets Approved & Released',
          latest_feedback: '“Outstanding work! Master passes approved and payout released.”',
          feedback_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', collabId)
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: 'brand',
        actorName: actorName || 'Brand Partner',
        actionType: 'DELIVERABLES_APPROVED',
        entityType: 'collaboration',
        entityId: collabId,
        metadata: { approvalNotes: approvalNotes || 'Approved' },
        userId
      });

      return normalizeSupabaseCollaboration(data);
    } catch (err) {
      console.error('[Supabase] Database error approving deliverables:', err);
      throw new Error(`Failed to approve deliverables in database: ${err.message}`);
    }
  }

  return null;
}

// ============================================================================
// 7. CREATIVE WORKFLOWS (Database-Backed)
// ============================================================================

export async function fetchCreatorWorkflows(creatorId, includeDrafts = true) {
  if (!creatorId) return [];

  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from('creator_workflows')
        .select('*')
        .eq('creator_id', creatorId);

      if (!includeDrafts) {
        query = query.eq('visibility', 'published');
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) {
        return data.map(normalizeSupabaseWorkflow);
      }
    } catch (err) {
      console.warn(`[Supabase] Could not fetch workflows for creator ${creatorId}:`, err.message);
    }
  }

  // Local fallback
  const state = getInitialMarketplaceState();
  const creator = (state.creators || []).find(c => c.id === creatorId);
  const workflows = creator?.workflows || (state.workflows || []).filter(w => w.creatorId === creatorId);
  if (!includeDrafts) {
    return workflows.filter(w => (w.visibility === 'published' || w.status === 'Published') && w.visibility !== 'private');
  }
  return workflows;
}

export async function saveCreatorWorkflow(creatorId, workflowData, userId = null) {
  if (!creatorId || !workflowData || !workflowData.id) {
    throw new Error('creatorId and workflowData.id are required.');
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('creator_workflows')
        .upsert({
          id: workflowData.id,
          creator_id: creatorId,
          title: workflowData.title,
          description: workflowData.description,
          specialization: workflowData.specialization,
          linked_project_id: workflowData.linkedProjectId || null,
          linked_project_title: workflowData.linkedProjectTitle || null,
          status: workflowData.status || 'Published',
          visibility: workflowData.visibility || 'published',
          human_involvement_notes: workflowData.humanInvolvementNotes,
          steps: Array.isArray(workflowData.steps) ? workflowData.steps : [],
          is_demo: !!workflowData.isDemo,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;

      await logActivity({
        actorRole: 'creator',
        actorName: creatorId,
        actionType: 'WORKFLOW_SAVED',
        entityType: 'workflow',
        entityId: workflowData.id,
        metadata: { title: workflowData.title, specialization: workflowData.specialization },
        userId
      });

      // Synchronize local cache
      const state = getInitialMarketplaceState();
      saveMarketplaceState(saveWorkflowRecord(state, creatorId, workflowData));

      return normalizeSupabaseWorkflow(data);
    } catch (err) {
      console.error('[Supabase] Database error saving creator workflow:', err);
      throw new Error(`Failed to save workflow to database: ${err.message}`);
    }
  }

  // Local fallback
  const state = getInitialMarketplaceState();
  const nextState = saveWorkflowRecord(state, creatorId, workflowData);
  saveMarketplaceState(nextState);
  return workflowData;
}

export async function deleteCreatorWorkflow(creatorId, workflowId) {
  if (!creatorId || !workflowId) {
    throw new Error('creatorId and workflowId are required.');
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('creator_workflows')
        .delete()
        .eq('id', workflowId)
        .eq('creator_id', creatorId);
      if (error) throw error;

      await logActivity({
        actorRole: 'creator',
        actorName: creatorId,
        actionType: 'WORKFLOW_DELETED',
        entityType: 'workflow',
        entityId: workflowId
      });

      const state = getInitialMarketplaceState();
      saveMarketplaceState(deleteWorkflowRecord(state, creatorId, workflowId));

      return { ok: true, id: workflowId };
    } catch (err) {
      console.error('[Supabase] Database error deleting workflow:', err);
      throw new Error(`Failed to delete workflow from database: ${err.message}`);
    }
  }

  const state = getInitialMarketplaceState();
  const nextState = deleteWorkflowRecord(state, creatorId, workflowId);
  saveMarketplaceState(nextState);
  return { ok: true, id: workflowId };
}

export async function toggleCreatorWorkflowPublish(creatorId, workflowId) {
  if (!creatorId || !workflowId) {
    throw new Error('creatorId and workflowId are required.');
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: current } = await supabase
        .from('creator_workflows')
        .select('visibility, status')
        .eq('id', workflowId)
        .single();

      const isPub = current?.visibility === 'published' || current?.status === 'Published';
      const nextVis = isPub ? 'draft' : 'published';
      const nextStatus = isPub ? 'Draft' : 'Published';

      const { data, error } = await supabase
        .from('creator_workflows')
        .update({
          visibility: nextVis,
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId)
        .select()
        .single();
      if (error) throw error;

      const state = getInitialMarketplaceState();
      saveMarketplaceState(toggleWorkflowPublishRecord(state, creatorId, workflowId));

      return normalizeSupabaseWorkflow(data);
    } catch (err) {
      console.error('[Supabase] Database error toggling workflow publish state:', err);
      throw new Error(`Failed to toggle workflow publish status: ${err.message}`);
    }
  }

  const state = getInitialMarketplaceState();
  const nextState = toggleWorkflowPublishRecord(state, creatorId, workflowId);
  saveMarketplaceState(nextState);
  return { ok: true };
}

// ============================================================================
// 8. CREATOR TRUST VERIFICATION
// ============================================================================

export async function fetchCreatorTrustVerification(creatorId) {
  const state = getInitialMarketplaceState();
  const creator = (state.creators || []).find(c => c.id === creatorId);
  return creator?.trustVerification || null;
}

export async function saveCreatorTrustVerification(creatorId, trustData) {
  const state = getInitialMarketplaceState();
  const creators = (state.creators || []).map(c => {
    if (c.id === creatorId) {
      return {
        ...c,
        trustVerification: {
          ...c.trustVerification,
          ...trustData,
          lastUpdated: 'Just now'
        }
      };
    }
    return c;
  });
  const nextState = { ...state, creators };
  saveMarketplaceState(nextState);
  return trustData;
}

// 8. CAMPAIGN-TO-CREATOR FILTERING PIPELINE SERVICE LAYER
// ============================================================================

import { executeFilteringPipeline } from '../../server/filteringPipeline.js';

/**
 * Executes the backend campaign-to-creator filtering pipeline.
 * Tries the live server endpoint /api/pipeline/filter first.
 * If running in static/offline client mode, executes the deterministic pipeline engine directly.
 *
 * @param {Object} campaign - Campaign brief or configuration
 * @param {Array} [creators] - Optional candidate creators list
 * @returns {Promise<Object>} Execution trace contract
 */
export async function executeCampaignFilteringPipeline(campaign, creators = null, options = {}) {
  const isNatural = typeof campaign === 'string' || (campaign && typeof campaign.naturalBrief === 'string');
  const payload = isNatural
    ? { naturalBrief: typeof campaign === 'string' ? campaign : campaign.naturalBrief, options }
    : { campaign, creators, options };

  // Prepare request headers; attach authenticated session token if available
  const headers = { 'Content-Type': 'application/json' };
  if (isNatural) {
    let token = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        const sessionRes = await supabase.auth.getSession();
        if (sessionRes?.data?.session?.access_token) {
          token = sessionRes.data.session.access_token;
        }
      } catch (e) {}
    }
    if (!token && typeof window !== 'undefined') {
      try {
        const activeUser = JSON.parse(localStorage.getItem('creasync_active_user') || 'null');
        if (activeUser) {
          token = activeUser.token || activeUser.access_token || 'authenticated-session-token';
        }
      } catch (e) {}
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // 1. Try server endpoint
  try {
    const res = await fetch('/api/pipeline/filter', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(data.error || `Pipeline request failed with status ${res.status}`);
      error.status = res.status;
      error.code = data.code || 'PIPELINE_ERROR';
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) {
      throw err;
    }
    if (isNatural) {
      throw new Error(err.message || 'Natural-language brief interpretation requires an active server connection.');
    }
    // Fall back to direct local engine execution if server endpoint is unreachable
    console.info('[Pipeline Service] Server endpoint deferred, executing deterministic pipeline engine:', err.message);
  }

  // 2. Direct engine execution fallback for structured campaigns
  const pool = creators || (getInitialMarketplaceState().creators || CREATORS);
  const result = executeFilteringPipeline({ campaign, creators: pool, options });
  return { ok: true, source: 'client-deterministic-fallback', ...result };
}

/**
 * Convenience helper to execute natural-language brief filtering.
 */
export async function filterCreatorsWithNaturalBrief(naturalBrief, options = {}) {
  return executeCampaignFilteringPipeline({ naturalBrief }, null, options);
}

// ============================================================================
// 9. REALTIME SUBSCRIPTIONS (Database-Backed Live Updates)
// ============================================================================

export function subscribeToInvitations(callback) {
  if (!isSupabaseConfigured() || !supabase || typeof callback !== 'function') {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('public:invitations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invitations' }, payload => {
        try {
          callback(payload);
        } catch (e) {
          console.warn('[Realtime] Invitation event callback error:', e);
        }
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  } catch (err) {
    console.warn('[Realtime] Could not subscribe to invitations:', err);
    return () => {};
  }
}

export function subscribeToCollaborations(callback) {
  if (!isSupabaseConfigured() || !supabase || typeof callback !== 'function') {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('public:collaborations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collaborations' }, payload => {
        try {
          callback(payload);
        } catch (e) {
          console.warn('[Realtime] Collaboration event callback error:', e);
        }
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  } catch (err) {
    console.warn('[Realtime] Could not subscribe to collaborations:', err);
    return () => {};
  }
}

export function subscribeToCampaigns(callback) {
  if (!isSupabaseConfigured() || !supabase || typeof callback !== 'function') {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('public:campaigns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, payload => {
        try {
          callback(payload);
        } catch (e) {
          console.warn('[Realtime] Campaign event callback error:', e);
        }
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  } catch (err) {
    console.warn('[Realtime] Could not subscribe to campaigns:', err);
    return () => {};
  }
}

export function subscribeToActivityLogs(callback) {
  if (!isSupabaseConfigured() || !supabase || typeof callback !== 'function') {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('public:activity_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, payload => {
        try {
          callback(payload);
        } catch (e) {
          console.warn('[Realtime] Activity log event callback error:', e);
        }
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  } catch (err) {
    console.warn('[Realtime] Could not subscribe to activity logs:', err);
    return () => {};
  }
}

// ============================================================================
// 10. MESSAGING SYSTEM (Persistent Cloud & Local Store with Realtime Sync)
// ============================================================================

export function normalizeSupabaseMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    sender: row.sender,
    senderName: row.sender_name,
    text: row.text,
    createdAt: row.created_at,
    timestamp: formatMessageTimestamp(row.created_at)
  };
}

function formatMessageTimestamp(isoString) {
  if (!isoString) return 'Just now';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Just now';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;
    const isYesterday = (now.getTime() - d.getTime()) < 86400000 * 2;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
  } catch {
    return 'Just now';
  }
}

export function deduplicateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  const seenIds = new Set();
  const deduped = [];

  for (const msg of messages) {
    if (!msg) continue;
    const msgId = msg.id || (msg._id ? String(msg._id) : null);
    if (msgId) {
      if (seenIds.has(msgId)) {
        continue;
      }
      seenIds.add(msgId);
    }
    deduped.push(msg);
  }

  return deduped;
}

export function reconcileMessages(currentMessages, newMessage, tempIdToRemove = null) {
  if (!Array.isArray(currentMessages)) return newMessage ? [newMessage] : [];
  if (!newMessage) return deduplicateMessages(currentMessages);

  const msgs = [...currentMessages];

  // 1. Explicit temporary ID replacement / drop
  if (tempIdToRemove) {
    const tempIndex = msgs.findIndex(m => m.id === tempIdToRemove);
    if (tempIndex !== -1) {
      const alreadyHasNewId = msgs.some((m, idx) => idx !== tempIndex && m.id === newMessage.id);
      if (alreadyHasNewId) {
        msgs.splice(tempIndex, 1);
      } else {
        msgs[tempIndex] = { ...newMessage, isPending: false };
      }
      return deduplicateMessages(msgs);
    }
  }

  // 2. Exact message ID match: update existing record in place
  const exactIdIndex = msgs.findIndex(m => m.id === newMessage.id);
  if (exactIdIndex !== -1) {
    msgs[exactIdIndex] = { ...msgs[exactIdIndex], ...newMessage, isPending: false };
    return deduplicateMessages(msgs);
  }

  // 3. Pending optimistic message match (reconciles Realtime event or store update)
  const pendingIndex = msgs.findIndex(m => m.isPending && m.text === newMessage.text && m.sender === newMessage.sender);
  if (pendingIndex !== -1) {
    msgs[pendingIndex] = { ...newMessage, isPending: false };
    return deduplicateMessages(msgs);
  }

  // 4. Append message without duplicates
  msgs.push({ ...newMessage, isPending: false });
  return deduplicateMessages(msgs);
}

/**
 * Fetches chronological messages for a conversation
 */
export async function fetchMessages(conversationIdOrTarget) {
  const targetId = typeof conversationIdOrTarget === 'string'
    ? conversationIdOrTarget
    : (conversationIdOrTarget?.conversationId || conversationIdOrTarget?.connectionId || conversationIdOrTarget?.id);
  if (!targetId) return [];

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', targetId)
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          return deduplicateMessages(data.map(normalizeSupabaseMessage));
        }
      }
    } catch (err) {
      console.warn('[Supabase] Could not fetch messages from cloud:', err.message);
    }
  }

  // Local fallback: read from marketplace connections
  const state = getInitialMarketplaceState();
  const conn = (state.connections || []).find(c => c.id === targetId || (c.campaignId && c.creatorId && targetId === `conn-${c.campaignId}-${c.creatorId}`));
  return deduplicateMessages(conn?.messages || []);
}

/**
 * Sends a message in a conversation.
 * Validates input, persists to Supabase (or local fallback), updates cache, and returns the message.
 */
export async function sendMessage({ conversationId, connectionId, sender, senderName, text, timestamp, userId = null, actorName = null }) {
  const targetConversationId = conversationId || connectionId;
  if (!targetConversationId) {
    throw new Error('Conversation ID is required to send a message.');
  }
  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new Error('Message cannot be empty or whitespace-only.');
  }

  const validSender = (sender === 'brand' || sender === 'creator') ? sender : 'brand';
  const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();

  const msgPayload = {
    id: msgId,
    conversationId: targetConversationId,
    sender: validSender,
    senderName: senderName || (validSender === 'brand' ? 'Brand Partner' : 'Creator'),
    text: trimmed,
    timestamp: timestamp || 'Just now',
    createdAt: nowIso
  };

  if (isSupabaseConfigured() && supabase) {
    let authUser = null;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      authUser = sessionData?.session?.user || null;
    } catch (sessionErr) {
      authUser = null;
    }

    // Only route to Supabase if a valid authenticated cloud session exists and caller is not a mock demo ID
    if (authUser && userId && !String(userId).startsWith('maya-chen') && !String(userId).startsWith('demo-')) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            id: msgPayload.id,
            conversation_id: targetConversationId,
            sender: msgPayload.sender,
            sender_name: msgPayload.senderName,
            text: msgPayload.text,
            created_at: nowIso
          })
          .select()
          .single();

        if (error) throw error;

        await logActivity({
          actorRole: validSender,
          actorName: actorName || msgPayload.senderName,
          actionType: 'MESSAGE_SENT',
          entityType: 'message',
          entityId: msgPayload.id,
          metadata: {
            conversationId: targetConversationId,
            textLength: trimmed.length
          },
          userId: authUser.id
        });

        const normalizedPersisted = normalizeSupabaseMessage(data);

        // Update local cache without creating duplicates
        const state = getInitialMarketplaceState();
        const updatedConns = (state.connections || []).map(conn => {
          if (conn.id === targetConversationId || (conn.campaignId && conn.creatorId && targetConversationId === `conn-${conn.campaignId}-${conn.creatorId}`)) {
            return {
              ...conn,
              updatedAt: nowIso,
              messages: reconcileMessages(conn.messages || [], normalizedPersisted)
            };
          }
          return conn;
        });
        saveMarketplaceState({ ...state, connections: updatedConns });

        return normalizedPersisted;
      } catch (err) {
        console.error('[Supabase] Database error sending message:', err);
        throw new Error(`Failed to send message: ${err.message}`);
      }
    } else {
      // In unauthenticated demo mode, route directly to local marketplace store without failing Supabase RLS
      console.info('[Messaging] Unauthenticated demo session: persisting message directly to local store.');
    }
  }

  // Local persistent fallback for demo mode
  const state = getInitialMarketplaceState();
  let connFound = false;
  const updatedConns = (state.connections || []).map(conn => {
    if (conn.id === targetConversationId || (conn.campaignId && conn.creatorId && targetConversationId === `conn-${conn.campaignId}-${conn.creatorId}`)) {
      connFound = true;
      return {
        ...conn,
        updatedAt: nowIso,
        messages: reconcileMessages(conn.messages || [], msgPayload)
      };
    }
    return conn;
  });

  if (!connFound) {
    // If conversation wasn't in state.connections, create a connection entry
    updatedConns.unshift({
      id: targetConversationId,
      status: 'connected',
      updatedAt: nowIso,
      messages: [msgPayload]
    });
  }

  saveMarketplaceState({ ...state, connections: updatedConns });
  return msgPayload;
}

/**
 * Subscribes to real-time message events for a conversation
 */
export function subscribeToMessages(conversationIdOrTarget, callback) {
  if (!isSupabaseConfigured() || !supabase || typeof callback !== 'function') {
    return () => {};
  }

  const targetId = typeof conversationIdOrTarget === 'string'
    ? conversationIdOrTarget
    : (conversationIdOrTarget?.conversationId || conversationIdOrTarget?.connectionId || null);

  try {
    const channelName = targetId ? `public:messages:${targetId}` : 'public:messages';
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, payload => {
        try {
          if (payload.new) {
            if (!targetId || payload.new.conversation_id === targetId) {
              callback(normalizeSupabaseMessage(payload.new));
            }
          }
        } catch (e) {
          console.warn('[Realtime] Message event callback error:', e);
        }
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  } catch (err) {
    console.warn('[Realtime] Could not subscribe to messages:', err);
    return () => {};
  }
}

export {
  sendMessage as sendBackendMessage,
  fetchMessages as fetchBackendMessages
};

// ============================================================================
// 12. TRUST CENTRE & VERIFICATION SERVICE METHODS
// Dual-engine: attempts /api/trust or Supabase table, with local store fallback
// ============================================================================

export async function fetchVerificationClaims(creatorId = null, currentUser = null) {
  const isAdmin = currentUser?.profile?.role === 'admin' || currentUser?.role === 'admin';
  const roleHeader = isAdmin ? 'admin' : (currentUser?.profile?.role || currentUser?.role || 'creator');
  
  // 1. Try local/internal backend endpoint
  try {
    const query = new URLSearchParams();
    if (creatorId) query.set('creatorId', creatorId);
    if (roleHeader) query.set('role', roleHeader);
    if (currentUser?.id) query.set('userId', currentUser.id);

    const res = await fetch(`/api/trust/claims?${query.toString()}`, {
      headers: {
        'x-user-role': roleHeader,
        ...(isAdmin ? { 'x-reviewer-auth': 'alloy-admin-verified' } : {})
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.ok && Array.isArray(data.claims)) {
        return data.claims;
      }
    }
  } catch (apiErr) {
    // API server not reachable or offline; fall back to cloud DB or local store
  }

  // 2. Try Supabase cloud table if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from('verification_claims').select('*');
      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(d => ({
          id: d.id,
          creatorId: d.creator_id,
          claimType: d.claim_type,
          claimTitle: d.claim_title,
          status: d.status,
          evidenceType: d.evidence_type,
          evidenceUrl: d.evidence_url,
          evidenceDetails: d.evidence_details,
          isPrivate: d.is_private,
          reviewerNotes: d.reviewer_notes,
          reviewedBy: d.reviewed_by,
          reviewedAt: d.reviewed_at,
          createdAt: d.created_at,
          updatedAt: d.updated_at
        }));
      }
    } catch (dbErr) {
      console.warn('[CreaSync Trust] Cloud table query note:', dbErr);
    }
  }

  // 3. Fallback to localStorage synchronous record store
  return getVerificationClaimsRecord(creatorId);
}

export async function submitVerificationClaim(claimData, currentUser = null) {
  const userRole = currentUser?.profile?.role || currentUser?.role || 'creator';

  // 1. Try internal backend API
  try {
    const res = await fetch('/api/trust/claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': userRole
      },
      body: JSON.stringify(claimData)
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.ok && data.claim) {
        // Also update local cache for synchronous reactivity
        submitVerificationClaimRecord(data.claim);
        return data.claim;
      }
    }
  } catch (apiErr) {
    // Fallback below
  }

  // 2. Try Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const claimRow = {
        id: claimData.id || `claim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        creator_id: claimData.creatorId,
        claim_type: claimData.claimType,
        claim_title: claimData.claimTitle,
        status: (claimData.status === 'self_declared') ? 'self_declared' : 'pending_review',
        evidence_type: claimData.evidenceType || 'Submitted Documentation',
        evidence_url: claimData.evidenceUrl || null,
        evidence_details: claimData.evidenceDetails || {},
        is_private: !!claimData.isPrivate,
        created_at: new Date().toISOString()
      };
      await supabase.from('verification_claims').upsert(claimRow);
    } catch (dbErr) {
      console.warn('[CreaSync Trust] Cloud upsert note:', dbErr);
    }
  }

  // 3. Synchronous local store save
  return submitVerificationClaimRecord(claimData);
}

export async function reviewVerificationClaim({ claimId, decision, notes = '', reviewerName = 'Platform Auditor', currentUser = null }) {
  const isAdmin = currentUser?.profile?.role === 'admin' || currentUser?.role === 'admin';
  const roleHeader = isAdmin ? 'admin' : (currentUser?.profile?.role || currentUser?.role || 'admin');

  // 1. Try internal backend API (enforces permissions on backend)
  try {
    const res = await fetch('/api/trust/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': roleHeader,
        'x-reviewer-auth': 'alloy-admin-verified'
      },
      body: JSON.stringify({
        claimId,
        decision,
        notes,
        reviewerName
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.ok && data.claim) {
        reviewVerificationClaimRecord({ claimId, decision, notes, reviewerName });
        return data;
      }
    }
  } catch (apiErr) {
    // Fallback below
  }

  // 2. Try Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      let newStatus = 'verified';
      if (decision === 'REJECT') newStatus = 'unable_to_verify';
      else if (decision === 'REQUEST_INFO' || decision === 'NEEDS_RENEWAL') newStatus = 'needs_renewal';

      const now = new Date().toISOString();
      await supabase.from('verification_claims').update({
        status: newStatus,
        reviewer_notes: notes,
        reviewed_by: reviewerName,
        reviewed_at: now,
        updated_at: now
      }).eq('id', claimId);

      await supabase.from('verification_audit_log').insert({
        id: `aud-${Date.now()}`,
        claim_id: claimId,
        creator_id: 'maya-chen',
        reviewer_name: reviewerName,
        action: decision === 'APPROVE' ? 'APPROVED' : (decision === 'REJECT' ? 'REJECTED' : 'REQUEST_INFO'),
        notes,
        created_at: now
      });
    } catch (dbErr) {
      console.warn('[CreaSync Trust] Cloud review note:', dbErr);
    }
  }

  // 3. Synchronous local store review
  return reviewVerificationClaimRecord({ claimId, decision, notes, reviewerName });
}

export async function fetchVerificationAuditLog(creatorId = null) {
  try {
    const res = await fetch(`/api/trust/audit${creatorId ? `?creatorId=${creatorId}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && Array.isArray(data.auditLogs)) {
        return data.auditLogs;
      }
    }
  } catch (apiErr) {
    // Fallback
  }

  const state = getInitialMarketplaceState();
  let logs = state.verificationAuditLogs || [];
  if (creatorId) {
    logs = logs.filter(l => l.creatorId === creatorId);
  }
  return logs;
}

