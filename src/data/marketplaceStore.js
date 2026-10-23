// src/data/marketplaceStore.js
// Centralized, synchronized state management connecting Brand Studio and Creator Studio
// Enforces brand ownership, data isolation, public vs private visibility, and cross-tab real-time sync.

import { INITIAL_CONNECTIONS, INITIAL_CREATOR_OPPORTUNITIES, INITIAL_CREATOR_INVITATIONS, INITIAL_CREATOR_PROJECTS } from './connectionsData.js';
import { CREATORS } from './creatorsData.js';
import { DEMO_WORKFLOWS } from './workflowsData.js';
import { createInitialTrustVerification } from './trustVerificationData.js';

const STORAGE_KEY = 'creasync_marketplace_state_v2';

// ----------------------------------------------------
// 1. BRAND DEFINITIONS (Demo Brands + Initial Registry)
// ----------------------------------------------------
export const DEMO_BRANDS = [
  {
    id: "brand-demo-lumina",
    name: "Lumina Botanica",
    handle: "@luminabotanica",
    logo: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80",
    coverImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85",
    industry: "Beauty & Skincare",
    website: "https://luminabotanica.co",
    description: "Pioneering organic cold-pressed botanicals for modern minimalist skincare rituals.",
    aesthetic: "Warm, Luminous & Organic",
    brandColors: ["#EB6E4B", "#FDF7ED", "#2E3A2F"],
    preferredPlatforms: ["Instagram", "TikTok", "Digital OOH"],
    isDemo: true
  },
  {
    id: "brand-demo-vanguard",
    name: "Vanguard Horology",
    handle: "@vanguard.watches",
    logo: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80",
    coverImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85",
    industry: "Consumer Tech & Hardware",
    website: "https://vanguardhorology.ch",
    description: "Swiss micro-machining and titanium escapements crafted for next-generation precision horology.",
    aesthetic: "Precise, Monochrome, Architectural",
    brandColors: ["#141312", "#A8A29E", "#7C3AED"],
    preferredPlatforms: ["YouTube", "Instagram", "Digital OOH"],
    isDemo: true
  }
];

// ----------------------------------------------------
// 2. CAMPAIGN DEFINITIONS WITH EXPLICIT OWNERSHIP
// ----------------------------------------------------
export const INITIAL_CAMPAIGNS = [
  {
    id: "camp-summer-skincare",
    ownerBrandId: "brand-demo-lumina",
    brandName: "Lumina Botanica",
    brandWebsite: "luminabotanica.co",
    brandAvatar: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80",
    title: "Summer Skincare & Radiant Hydration Launch",
    objective: "Product Launch",
    productOrService: "Botanical Barrier Restoration Serum",
    industry: "Beauty & Skincare",
    description: "We are launching our botanical barrier restoration serum. Looking for an AI creator who excels at macro fluid physics, radiant skin micro-textures, and warm Mediterranean sunlit aesthetics for digital editorial and vertical ads.",
    budget: "$5,000 – $10,000",
    currency: "USD",
    timeline: "2–3 Weeks",
    deadline: "Nov 20, 2026",
    targetAudience: "Aesthetic-conscious skincare enthusiasts aged 22–38",
    platforms: ["Instagram", "Digital OOH", "TikTok"],
    targetPlatforms: ["Instagram", "Digital OOH", "TikTok"],
    contentFormats: ["4K Stills Suite", "9:16 Vertical Loops"],
    creativeStyle: "Cinematic, Macro, Luminous",
    desiredCreatorSpecialties: ["AI Beauty", "Macro Viscosity", "AI Photography"],
    toneOfVoice: "Authentic, Warm, Editorial",
    deliverables: ["3x Key Campaign Stills (4K)", "2x Short-Form Kinetic Loops (9:16)", "Social Packaging Renders"],
    coverImage: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85",
    shortlist: ["elena-rostova", "zora-vance", "maya-chen"],
    status: "Active",
    visibility: "published", // 'draft' | 'published' | 'paused' | 'completed' | 'archived'
    createdAt: "2 days ago",
    updatedAt: "2 hours ago",
    isDemo: true
  },
  {
    id: "camp-vanguard-chrono",
    ownerBrandId: "brand-demo-vanguard",
    brandName: "Vanguard Horology",
    brandWebsite: "vanguardhorology.ch",
    brandAvatar: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80",
    title: "Titanium Kinetic Chrono Motion Series",
    objective: "Global Motion Teaser",
    productOrService: "Vanguard Kinetic Titanium Chronograph",
    industry: "Consumer Tech & Hardware",
    description: "Micro-machining exploded views, suspended titanium escapements, and minimal Scandinavian studio lighting for global digital launch.",
    budget: "$10,000 – $15,000",
    currency: "USD",
    timeline: "3 Weeks",
    deadline: "Dec 05, 2026",
    targetAudience: "Luxury horology collectors and industrial design enthusiasts",
    platforms: ["YouTube", "Instagram", "Digital OOH"],
    targetPlatforms: ["YouTube", "Instagram", "Digital OOH"],
    contentFormats: ["3D Kinetic Motion", "Macro Renders"],
    creativeStyle: "Minimal, Industrial, 3D Kinetic",
    desiredCreatorSpecialties: ["3D CGI", "AI Product Visuals", "Motion Design"],
    toneOfVoice: "Precise, Monochrome, Architectural",
    deliverables: ["1x Macro 3D Motion Pass", "1x Zero-Gravity Teaser Loop (15s)", "4x Monochromatic Key Stills"],
    coverImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85",
    shortlist: ["kai-sorenson", "alex-rivera"],
    status: "Active",
    visibility: "published",
    createdAt: "3 days ago",
    updatedAt: "Yesterday",
    isDemo: true
  },
  {
    id: "camp-solis-fragrance",
    ownerBrandId: "brand-demo-lumina",
    brandName: "Lumina Botanica",
    brandWebsite: "luminabotanica.co",
    brandAvatar: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80",
    title: "Solar Amber Eau de Parfum Stills",
    objective: "Editorial Lookbook",
    productOrService: "Solar Amber Fragrance",
    industry: "Luxury & Fragrance",
    description: "Luminous amber flacon resting on warm volcanic stone, catching golden hour solar flares and dry botanical wisps.",
    budget: "$6,500 – $9,000",
    currency: "USD",
    timeline: "2 Weeks",
    deadline: "Nov 30, 2026",
    targetAudience: "Luxury perfume consumers",
    platforms: ["Vogue Editorial", "Instagram"],
    targetPlatforms: ["Vogue Editorial", "Instagram"],
    contentFormats: ["Editorial Stills", "Refraction Loops"],
    creativeStyle: "Luxury, Ethereal, Golden Hour",
    desiredCreatorSpecialties: ["AI Fashion", "AI Photography"],
    toneOfVoice: "Evocative, Tactile, Poetic",
    deliverables: ["Refractive Glass Caustic Stills", "Editorial Print Spreads", "Slow-Motion Mist Reveal"],
    coverImage: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85",
    shortlist: ["sophie-mercier"],
    status: "Draft",
    visibility: "draft",
    createdAt: "1 week ago",
    updatedAt: "3 days ago",
    isDemo: true
  },
  {
    id: "camp-aether-nomad",
    ownerBrandId: "brand-demo-vanguard",
    brandName: "Vanguard Horology",
    brandWebsite: "vanguardhorology.ch",
    brandAvatar: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80",
    title: "AETHER Nomad Technical Carry Series",
    objective: "Brand Film & Lookbook",
    productOrService: "Nomad Precision Backpack",
    industry: "Lifestyle & Apparel",
    description: "Technical commuter waterproof carry film with 35mm grain and authentic street aesthetic.",
    budget: "$9,000",
    currency: "USD",
    timeline: "Completed",
    deadline: "Oct 15, 2026",
    targetAudience: "Urban minimalists & creative travelers",
    platforms: ["Instagram", "TikTok", "Vimeo"],
    targetPlatforms: ["Instagram", "TikTok", "Vimeo"],
    contentFormats: ["60s Anamorphic Film", "8 Narrative Stills"],
    creativeStyle: "Cinematic 35mm, Documentary",
    desiredCreatorSpecialties: ["AI Video", "Documentary"],
    toneOfVoice: "Raw, Energetic, Human",
    deliverables: ["60s Anamorphic Film", "8 Narrative Stills"],
    coverImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=85",
    shortlist: ["maya-chen"],
    status: "Completed",
    visibility: "completed",
    createdAt: "3 weeks ago",
    updatedAt: "1 week ago",
    isDemo: true
  }
];

// ----------------------------------------------------
// 3. INVITATIONS WITH EXPLICIT BRAND & CAMPAIGN IDS
// ----------------------------------------------------
export const INITIAL_BRAND_INVITATIONS = [
  {
    id: "inv-lumina-01",
    brandId: "brand-demo-lumina",
    campaignId: "camp-summer-skincare",
    campaignTitle: "Summer Skincare & Radiant Hydration Launch",
    brandName: "Lumina Botanica",
    brandAvatar: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=120&q=80",
    creatorId: "maya-chen",
    creatorName: "Maya Chen",
    creatorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    title: "Summer Skincare & Radiant Hydration Launch",
    budget: "$7,500",
    timeline: "3 Weeks",
    deliverables: "3x 4K Hero Key Visuals + 2x 9:16 Vertical Kinetic Loops",
    summary: "Direct invitation from Lumina Creative Director: We loved your cinematic lighting and macro fluid experiments. We'd love to commission key art for our upcoming barrier serum launch.",
    status: "accepted", // 'pending' | 'accepted' | 'declined'
    createdAt: "2 days ago",
    isDemo: true
  },
  {
    id: "inv-vanguard-02",
    brandId: "brand-demo-vanguard",
    campaignId: "camp-vanguard-chrono",
    campaignTitle: "Titanium Kinetic Chrono Motion Series",
    brandName: "Vanguard Horology",
    brandAvatar: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=120&q=80",
    creatorId: "kai-sorenson",
    creatorName: "Kai Sorenson",
    creatorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    title: "Titanium Kinetic Chrono Motion Series",
    budget: "$12,000",
    timeline: "4 Weeks",
    deliverables: "1x 45s Anamorphic Teaser + 6x High-Contrast 3D Stills",
    summary: "Direct brief: Suspended titanium escapement passes and exploded mechanical views for global digital campaign.",
    status: "pending",
    createdAt: "Yesterday",
    isDemo: true
  }
];

// ----------------------------------------------------
// 4. COLLABORATION PROJECTS WITH BRAND & CAMPAIGN IDS
// ----------------------------------------------------
export const INITIAL_COLLAB_PROJECTS = [
  {
    id: "proj-lumina-active",
    brandId: "brand-demo-lumina",
    campaignId: "camp-summer-skincare",
    campaignTitle: "Summer Skincare & Radiant Hydration Launch",
    brandName: "Lumina Botanica",
    brandContact: "Sophie Laurent (Creative Director)",
    creatorId: "maya-chen",
    creatorName: "Maya Chen",
    creatorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    status: "submitted", // 'in-progress' | 'submitted' | 'revision-requested' | 'approved' | 'completed'
    progressPercent: 85,
    milestone: "Milestone 2 of 3: Refined 4K Color Grading & Fluid Physics",
    deadline: "Nov 12, 2026",
    agreedBudget: "$7,500",
    deliverablesScope: "Key Campaign Stills (4K) & Kinetic Loops",
    latestFeedback: "“Deliverables submitted for review! Previews ready for creative director sign-off.”",
    submissionUrl: "https://creasync.storage/lumina-botanica-v2-masters.zip",
    submissionNotes: "Delivered 3x 4K high-res master renders with warm 3200K ambient grading and organic fluid caustics.",
    submissionPreviews: [
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80"
    ],
    feedbackHistory: [
      {
        id: "fb-1",
        author: "Sophie Laurent (Creative Director)",
        role: "brand",
        text: "“The droplet caustics in render 3 are breathtaking. Can we warm the ambient lighting slightly towards 3200K?”",
        timestamp: "Yesterday, 4:20 PM"
      }
    ],
    revisionHistory: [],
    createdAt: "5 days ago",
    updatedAt: "Yesterday",
    isDemo: true
  },
  {
    id: "proj-nomad-completed",
    brandId: "brand-demo-vanguard",
    campaignId: "camp-aether-nomad",
    campaignTitle: "AETHER Nomad Technical Carry Series",
    brandName: "Vanguard Horology",
    brandContact: "Marcus Vance (Brand Lead)",
    creatorId: "maya-chen",
    creatorName: "Maya Chen",
    creatorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
    status: "approved",
    progressPercent: 100,
    milestone: "Final Milestone: All Master Assets Approved",
    deadline: "Completed",
    agreedBudget: "$9,000",
    deliverablesScope: "60s Brand Film + 8 Narrative Stills",
    latestFeedback: "“Outstanding work. Approved and released final milestone payout. Thank you Maya!”",
    submissionUrl: "https://creasync.storage/aether-nomad-final-masters.zip",
    submissionNotes: "Delivered 4K ProRes 422 HQ + uncompressed 16-bit TIFF stills.",
    submissionPreviews: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
    ],
    feedbackHistory: [
      {
        id: "fb-nomad-1",
        author: "Marcus Vance",
        role: "brand",
        text: "“Final cuts look sensational. Exactly the mood we envisioned.”",
        timestamp: "3 weeks ago"
      }
    ],
    revisionHistory: [],
    createdAt: "3 weeks ago",
    updatedAt: "1 week ago",
    isDemo: true
  }
];

// ----------------------------------------------------
// 5. CONNECTIONS / MESSAGES WITH BRAND OWNERSHIP
// ----------------------------------------------------
export const INITIAL_BRAND_CONNECTIONS = [
  {
    id: "conn-maya-skincare",
    brandId: "brand-demo-lumina",
    campaignId: "camp-summer-skincare",
    campaignTitle: "Summer Skincare & Radiant Hydration Launch",
    brandName: "Lumina Botanica",
    creatorId: "maya-chen",
    creatorName: "Maya Chen",
    creatorRole: "Cinematic AI Director & Visual Worldbuilder",
    creatorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    creatorVisual: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=85",
    status: "connected",
    createdAt: "2 days ago",
    connectedAt: "Yesterday",
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
        senderName: "Maya Chen",
        text: "Thanks! I'd love to work on it. I'm especially interested in the visual storytelling direction and warm Mediterranean sunlight.",
        timestamp: "Today, 10:15 AM"
      }
    ],
    isDemo: true
  },
  {
    id: "conn-elena-skincare",
    brandId: "brand-demo-lumina",
    campaignId: "camp-summer-skincare",
    campaignTitle: "Summer Skincare & Radiant Hydration Launch",
    brandName: "Lumina Botanica",
    creatorId: "elena-rostova",
    creatorName: "Elena Rostova",
    creatorRole: "AI Fashion Director & Haute Couture Stylist",
    creatorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    creatorVisual: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
    status: "connected",
    createdAt: "1 day ago",
    connectedAt: "Today",
    messages: [
      {
        id: "msg-elena-1",
        sender: "brand",
        senderName: "Lumina Botanica",
        text: "Elena, your neoclassical silk and light work is breathtaking. We want that exact organic fluid elegance for our hydration serum key art.",
        timestamp: "Yesterday, 5:20 PM"
      },
      {
        id: "msg-elena-2",
        sender: "creator",
        senderName: "Elena Rostova",
        text: "Thank you! I envision translucent raw organza caustics floating through sunlit water droplets. Let's make it extraordinary.",
        timestamp: "Today, 11:30 AM"
      }
    ],
    isDemo: true
  }
];

// ----------------------------------------------------
// 6. INITIAL STATE & PERSISTENCE ENGINE
// ----------------------------------------------------
export function getInitialMarketplaceState() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.campaigns) && Array.isArray(parsed.brands)) {
          // Ensure creators array is present and normalized
          if (!Array.isArray(parsed.creators) || parsed.creators.length === 0) {
            parsed.creators = CREATORS;
          }
          // Ensure workflows array exists
          if (!Array.isArray(parsed.workflows) || parsed.workflows.length === 0) {
            parsed.workflows = DEMO_WORKFLOWS;
          }
          // Ensure creators array is present and normalized with workflows, trust verification, skills, and project workflows
          parsed.creators = parsed.creators.map(c => {
            let updatedC = { ...c };
            const seedCreator = CREATORS.find(sc => sc.id === updatedC.id) || null;

            if (!Array.isArray(updatedC.workflows) || updatedC.workflows.length === 0) {
              const matchedWfs = (parsed.workflows || DEMO_WORKFLOWS).filter(w => w.creatorId === updatedC.id);
              updatedC.workflows = matchedWfs;
            }
            if (!updatedC.trustVerification) {
              updatedC.trustVerification = createInitialTrustVerification(updatedC);
            }
            if (!Array.isArray(updatedC.technicalSkills) || updatedC.technicalSkills.length === 0) {
              updatedC.technicalSkills = seedCreator?.technicalSkills || [
                'AI video generation',
                'Prompt engineering',
                'ControlNet and reference-image conditioning',
                'Upscaling and frame interpolation',
                'ComfyUI node workflows'
              ];
            }
            if (!Array.isArray(updatedC.creativeSkills) || updatedC.creativeSkills.length === 0) {
              updatedC.creativeSkills = seedCreator?.creativeSkills || [
                'Visual storytelling',
                'Cinematic composition',
                'Art direction',
                'Color grading',
                'Lighting and visual aesthetics'
              ];
            }
            // Ensure projects retain or merge workflowStages
            if (Array.isArray(updatedC.projects)) {
              updatedC.projects = updatedC.projects.map(p => {
                const seedProj = seedCreator?.projects?.find(sp => sp.id === p.id);
                return {
                  ...p,
                  workflowStages: Array.isArray(p.workflowStages) && p.workflowStages.length > 0
                    ? p.workflowStages
                    : (seedProj?.workflowStages || [])
                };
              });
            }
            return updatedC;
          });
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using seed defaults:', e);
    }
  }

  const initialCreators = CREATORS.map(c => ({
    ...c,
    workflows: DEMO_WORKFLOWS.filter(w => w.creatorId === c.id),
    trustVerification: createInitialTrustVerification(c),
    technicalSkills: c.technicalSkills || [
      'AI video generation',
      'Prompt engineering',
      'ControlNet and reference-image conditioning',
      'Upscaling and frame interpolation',
      'ComfyUI node workflows'
    ],
    creativeSkills: c.creativeSkills || [
      'Visual storytelling',
      'Cinematic composition',
      'Art direction',
      'Color grading',
      'Lighting and visual aesthetics'
    ],
    projects: (c.projects || []).map(p => ({
      ...p,
      workflowStages: p.workflowStages || []
    }))
  }));

  return {
    brands: DEMO_BRANDS,
    activeBrandId: DEMO_BRANDS[0].id,
    isDemoMode: true,
    creators: initialCreators,
    workflows: DEMO_WORKFLOWS,
    activeCreatorId: initialCreators[0].id,
    myCreatorId: null,
    campaigns: INITIAL_CAMPAIGNS,
    activeCampaignId: INITIAL_CAMPAIGNS[0].id,
    projects: INITIAL_COLLAB_PROJECTS,
    invitations: INITIAL_BRAND_INVITATIONS,
    connections: INITIAL_BRAND_CONNECTIONS,
    opportunities: INITIAL_CREATOR_OPPORTUNITIES,
    shortlists: {
      "camp-summer-skincare": ["elena-rostova", "zora-vance", "maya-chen"],
      "camp-vanguard-chrono": ["kai-sorenson", "alex-rivera"],
      "camp-solis-fragrance": ["sophie-mercier"],
      "camp-aether-nomad": ["maya-chen"]
    }
  };
}

/**
 * Returns brand-facing public view of a creator, strictly filtering out private portfolio items and draft workflows
 * Also sanitizes trust verification to NEVER leak private identity documents or internal reviewer notes
 */
export function getPublicCreatorProfile(creator) {
  if (!creator) return null;
  const isDraft = creator.status === 'Draft' || creator.visibility === 'draft' || creator.visibility === 'private';
  const publishedProjects = (creator.projects || [])
    .filter(p => p.visibility !== 'private')
    .map(p => ({
      ...p,
      workflowStages: p.workflowStages || []
    }));
  // Brands have read-only access to published workflows only
  const publishedWorkflows = (creator.workflows || []).filter(w =>
    (w.visibility === 'published' || w.status === 'Published') && w.visibility !== 'private'
  );

  // Sanitize trust verification: strip private government document IDs and private compliance details
  let sanitizedTrust = null;
  if (creator.trustVerification) {
    sanitizedTrust = {
      ...creator.trustVerification,
      identity: creator.trustVerification.identity ? {
        status: creator.trustVerification.identity.status,
        provider: creator.trustVerification.identity.provider,
        legalName: creator.trustVerification.identity.legalName,
        issuingCountry: creator.trustVerification.identity.issuingCountry,
        documentType: creator.trustVerification.identity.documentType,
        // documentMaskedNumber and private files are explicitly stripped for brand privacy!
        reviewedAt: creator.trustVerification.identity.reviewedAt,
        isPrivate: true
      } : null
    };
  }

  return {
    ...creator,
    isDraft,
    projects: publishedProjects,
    workflows: publishedWorkflows,
    trustVerification: sanitizedTrust,
    technicalSkills: creator.technicalSkills || [],
    creativeSkills: creator.creativeSkills || []
  };
}

/**
 * Updates or adds a creator record in marketplace state
 */
export function updateCreatorRecord(state, updatedCreator) {
  if (!updatedCreator || !updatedCreator.id) return state;
  const currentCreators = state.creators && state.creators.length > 0 ? state.creators : CREATORS;
  const exists = currentCreators.some(c => c.id === updatedCreator.id);
  const updatedCreators = exists
    ? currentCreators.map(c => c.id === updatedCreator.id ? { ...c, ...updatedCreator } : c)
    : [updatedCreator, ...currentCreators];
  return {
    ...state,
    creators: updatedCreators
  };
}

/**
 * Saves or updates a creative workflow for a specific creator
 */
export function saveWorkflowRecord(state, creatorId, workflowData) {
  if (!creatorId || !workflowData || !workflowData.id) return state;

  const currentWorkflows = state.workflows || [];
  const existingWfIndex = currentWorkflows.findIndex(w => w.id === workflowData.id);
  const updatedWorkflows = existingWfIndex >= 0
    ? currentWorkflows.map(w => w.id === workflowData.id ? { ...w, ...workflowData, updatedAt: 'Just now' } : w)
    : [{ ...workflowData, updatedAt: 'Just now' }, ...currentWorkflows];

  // Update in creator record as well
  const currentCreators = state.creators || CREATORS;
  const updatedCreators = currentCreators.map(c => {
    if (c.id === creatorId) {
      const cWfs = c.workflows || [];
      const cIdx = cWfs.findIndex(w => w.id === workflowData.id);
      const nextCWfs = cIdx >= 0
        ? cWfs.map(w => w.id === workflowData.id ? { ...w, ...workflowData, updatedAt: 'Just now' } : w)
        : [{ ...workflowData, updatedAt: 'Just now' }, ...cWfs];
      return { ...c, workflows: nextCWfs };
    }
    return c;
  });

  return {
    ...state,
    workflows: updatedWorkflows,
    creators: updatedCreators
  };
}

/**
 * Deletes a workflow belonging to a creator
 */
export function deleteWorkflowRecord(state, creatorId, workflowId) {
  if (!creatorId || !workflowId) return state;

  const updatedWorkflows = (state.workflows || []).filter(w => w.id !== workflowId);
  const updatedCreators = (state.creators || CREATORS).map(c => {
    if (c.id === creatorId) {
      return {
        ...c,
        workflows: (c.workflows || []).filter(w => w.id !== workflowId)
      };
    }
    return c;
  });

  return {
    ...state,
    workflows: updatedWorkflows,
    creators: updatedCreators
  };
}

/**
 * Toggles published vs draft status for a workflow
 */
export function toggleWorkflowPublishRecord(state, creatorId, workflowId) {
  if (!creatorId || !workflowId) return state;

  let nextVisibility = 'published';
  let nextStatus = 'Published';

  const updatedWorkflows = (state.workflows || []).map(w => {
    if (w.id === workflowId) {
      const isCurrentlyPub = w.visibility === 'published' || w.status === 'Published';
      nextVisibility = isCurrentlyPub ? 'draft' : 'published';
      nextStatus = isCurrentlyPub ? 'Draft' : 'Published';
      return { ...w, visibility: nextVisibility, status: nextStatus, updatedAt: 'Just now' };
    }
    return w;
  });

  const updatedCreators = (state.creators || CREATORS).map(c => {
    if (c.id === creatorId) {
      return {
        ...c,
        workflows: (c.workflows || []).map(w => {
          if (w.id === workflowId) {
            return { ...w, visibility: nextVisibility, status: nextStatus, updatedAt: 'Just now' };
          }
          return w;
        })
      };
    }
    return c;
  });

  return {
    ...state,
    workflows: updatedWorkflows,
    creators: updatedCreators
  };
}

/**
 * Persists state to localStorage and fires cross-component and cross-tab events
 */
export function saveMarketplaceState(state) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent('creasync_store_change', { detail: state }));
    } catch (e) {
      console.warn('Could not persist to localStorage:', e);
    }
  }
}

/**
 * Subscribes to real-time state changes (intra-tab and cross-tab storage events)
 */
export function subscribeToMarketplace(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch (err) {
        console.warn('Failed to parse cross-tab storage event:', err);
      }
    }
  };

  const handleCustom = (e) => {
    if (e.detail) {
      callback(e.detail);
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener('creasync_store_change', handleCustom);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('creasync_store_change', handleCustom);
  };
}

export function resetMarketplaceState() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('creasync_marketplace_state_v1');
    } catch (e) {}
  }
  const defaultState = getInitialMarketplaceState();
  saveMarketplaceState(defaultState);
  return defaultState;
}

// ----------------------------------------------------
// 7b. CREATOR ONBOARDING DRAFT (local-only, unpublished scratch data)
// ----------------------------------------------------

const ONBOARDING_DRAFT_KEY = 'creasync_creator_onboarding_draft_v1';

/**
 * Loads an unfinished creator onboarding draft.
 * Returns null when the draft is absent, unparseable, or structurally invalid.
 * Drafts are local scratch data and stay separate from published creator records.
 */
export function loadCreatorOnboardingDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const { profileData, dnaResult } = parsed;
    if (profileData !== undefined && profileData !== null && (typeof profileData !== 'object' || Array.isArray(profileData))) {
      return null;
    }
    const step = Number(parsed.currentStep);
    return {
      currentStep: Number.isFinite(step) ? Math.min(8, Math.max(1, Math.round(step))) : 1,
      profileData: (profileData && typeof profileData === 'object') ? profileData : null,
      dnaResult: (dnaResult && typeof dnaResult === 'object' && !Array.isArray(dnaResult)) ? dnaResult : null
    };
  } catch (e) {
    console.warn('Could not read creator onboarding draft, ignoring it:', e);
    return null;
  }
}

/**
 * Persists unfinished onboarding progress in local browser storage only.
 * Never stores credentials, tokens, or authentication data.
 */
export function saveCreatorOnboardingDraft({ currentStep, profileData, dnaResult }) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      currentStep: currentStep || 1,
      profileData: profileData || null,
      dnaResult: dnaResult || null,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Could not persist creator onboarding draft:', e);
  }
}

/**
 * Removes the onboarding draft (called after successful publication).
 */
export function clearCreatorOnboardingDraft() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch (e) {}
}

// ----------------------------------------------------
// 8. UNIFIED STORE ACTIONS (CAMPAIGNS & BRANDS)
// ----------------------------------------------------

/**
 * Creates a new campaign with strict brand ownership and consistent schema
 */
export function createCampaignRecord(campaignData, brand) {
  const brandId = brand?.id || campaignData.ownerBrandId || DEMO_BRANDS[0].id;
  const brandName = brand?.name || campaignData.brandName || "Brand Partner";
  const brandAvatar = brand?.logo || campaignData.brandAvatar || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80";
  const brandWebsite = brand?.website || campaignData.brandWebsite || "brand.co";

  const visibility = campaignData.visibility || (campaignData.status === 'Draft' ? 'draft' : 'published');
  const status = campaignData.status || (visibility === 'draft' ? 'Draft' : 'Active');

  // Normalize deliverables
  let deliverables = campaignData.deliverables || [];
  if (typeof deliverables === 'string') {
    deliverables = deliverables.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(deliverables) || deliverables.length === 0) {
    deliverables = ['Key Campaign Visuals'];
  }

  // Normalize platforms
  let platforms = campaignData.platforms || campaignData.targetPlatforms || [];
  if (typeof platforms === 'string') {
    platforms = platforms.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(platforms) || platforms.length === 0) {
    platforms = ['Instagram'];
  }

  return {
    id: campaignData.id || `camp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ownerBrandId: brandId,
    brandId: brandId,
    owner_brand_id: brandId,
    brandName,
    brandAvatar,
    brandWebsite,
    title: campaignData.title || `${brandName} Campaign`,
    objective: campaignData.objective || "Product Launch",
    productOrService: campaignData.productOrService || campaignData.title || "",
    industry: campaignData.industry || brand?.industry || "Creative & Media",
    description: campaignData.description || campaignData.creativeDirection || "",
    desiredCreatorSpecialties: campaignData.desiredCreatorSpecialties || campaignData.specialties || ["AI Creative Direction"],
    creativeDirection: campaignData.creativeDirection || campaignData.description || "",
    creativeStyle: campaignData.creativeStyle || "Contemporary Editorial",
    toneOfVoice: campaignData.toneOfVoice || "Authentic & Premium",
    deliverables,
    platforms,
    targetPlatforms: platforms,
    contentFormats: campaignData.contentFormats || ["4K Stills Suite"],
    budget: campaignData.budget || "In Discussion",
    currency: campaignData.currency || "USD",
    timeline: campaignData.timeline || campaignData.deadline || "Flexible",
    deadline: campaignData.deadline || campaignData.timeline || "TBD",
    targetAudience: campaignData.targetAudience || campaignData.audience || "Modern consumers",
    coverImage: campaignData.coverImage || brand?.coverImage || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85",
    shortlist: campaignData.shortlist || [],
    status,
    visibility,
    createdAt: "Just now",
    updatedAt: "Just now",
    isDemo: !!brand?.isDemo
  };
}

/**
 * Creates a new brand profile record
 */
export function createBrandRecord(brandData) {
  const brandName = brandData.name || brandData.brandName || "My Brand";
  const brandId = brandData.id || `brand-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const handle = brandData.handle || `@${brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return {
    id: brandId,
    name: brandName,
    handle,
    logo: brandData.logo || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80",
    coverImage: brandData.coverImage || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85",
    industry: brandData.industry || "Creative & Media",
    website: brandData.website || "",
    description: brandData.description || "",
    aesthetic: brandData.aesthetic || brandData.aestheticPreference || "Refined & Modern",
    brandColors: brandData.brandColors || ["#EB6E4B", "#FDF7ED", "#2E3A2F"],
    preferredPlatforms: brandData.preferredPlatforms || ["Instagram", "Digital OOH"],
    isDemo: false
  };
}

/**
 * Unambiguous, semantically defensible mappings from creative disciplines
 * to canonical industry sectors in the Alloy marketplace taxonomy (FILTER_OPTIONS.industries).
 *
 * Disciplines that represent production mediums, formats, or crafts rather than commercial
 * industry sectors (e.g. '3D CGI', 'Animation & Motion', 'Video Editing', 'UGC', 'Editorial Storytelling',
 * 'AI Product Visuals') are intentionally excluded. When a mapping is absent or uncertain,
 * industries are left unresolved rather than misclassifying the creator under an unrelated sector.
 */
export const DISCIPLINE_TO_INDUSTRY_MAP = {
  'AI Fashion': 'Luxury & High Fashion',
  'AI Beauty': 'Beauty & Skincare',
  'Consumer Technology': 'Consumer Tech & Hardware',
  'Food & Beverage': 'Food & Beverage'
};

/**
 * Normalizes string arrays by trimming and removing empty values.
 */
function normalizeStringList(items, candidateObjectKeys = []) {
  if (!items) return [];
  const list = Array.isArray(items) ? items : [items];
  const out = [];
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      out.push(item.trim());
    } else if (item && typeof item === 'object') {
      for (const k of candidateObjectKeys) {
        if (typeof item[k] === 'string' && item[k].trim()) {
          out.push(item[k].trim());
          break;
        }
      }
    }
  }
  return Array.from(new Set(out));
}

/**
 * Builds a published creator profile record from onboarding form data and optional AI DNA.
 *
 * Rules:
 * 1. Preserves actual user-selected tools, disciplines/industries, and styles.
 * 2. Uses AI-generated profile data (dnaResult) ONLY as a fallback when user data is absent.
 * 3. Never overwrites genuine user selections with hardcoded example values.
 * 4. Handles missing or empty optional fields consistently with the existing profile model (empty arrays).
 */
export function buildPublishedCreatorProfile(profileData = {}, dnaResult = null) {
  const data = profileData || {};

  // 1. Resolve Tools: User explicit > Portfolio declared > AI DNA fallback > empty array
  let tools = normalizeStringList(data.tools);
  if (tools.length === 0) {
    const portfolioTools = normalizeStringList(
      (data.portfolio || []).flatMap(p => Array.isArray(p?.tools) ? p.tools : [])
    );
    if (portfolioTools.length > 0) {
      tools = portfolioTools;
    } else if (dnaResult) {
      const aiTools = normalizeStringList(dnaResult.tools);
      const aiProductionTools = normalizeStringList(dnaResult.productionTools, ['tool', 'name']);
      const aiProvenanceTools = normalizeStringList(dnaResult.provenance?.creatorProvided?.toolsUsed);
      const combinedAiTools = Array.from(new Set([...aiTools, ...aiProductionTools, ...aiProvenanceTools]));
      if (combinedAiTools.length > 0) {
        tools = combinedAiTools;
      }
    }
  }

  // 2. Resolve Styles: User explicit > AI DNA fallback > empty array
  let styles = normalizeStringList(data.styles);
  if (styles.length === 0 && dnaResult) {
    const aiStyles = normalizeStringList(dnaResult.styles);
    const aiCreativeStyles = normalizeStringList(dnaResult.creativeStyles, ['style', 'name']);
    const aiProvenanceStyles = normalizeStringList(dnaResult.provenance?.creatorProvided?.preferredStyles);
    const combinedAiStyles = Array.from(new Set([...aiStyles, ...aiCreativeStyles, ...aiProvenanceStyles]));
    if (combinedAiStyles.length > 0) {
      styles = combinedAiStyles;
    }
  }

  // 3. Resolve Disciplines & Capabilities: User explicit > AI DNA fallback > empty array
  const disciplines = normalizeStringList(data.disciplines);
  let capabilities = normalizeStringList(data.capabilities);
  if (capabilities.length === 0) {
    capabilities = disciplines.length > 0
      ? disciplines
      : (dnaResult ? normalizeStringList(dnaResult.capabilities) : []);
  }

  // 4. Resolve Industries: User explicit > Derived from user disciplines > AI DNA fallback > empty array
  let industries = normalizeStringList(data.industries);
  if (industries.length === 0) {
    if (disciplines.length > 0) {
      const mapped = disciplines
        .map(d => DISCIPLINE_TO_INDUSTRY_MAP[d])
        .filter(Boolean);
      industries = Array.from(new Set(mapped));
    }
    if (industries.length === 0 && dnaResult) {
      const aiIndustries = normalizeStringList(dnaResult.industries);
      const aiProvenanceIndustries = normalizeStringList(dnaResult.provenance?.creatorProvided?.declaredIndustries);
      const combinedAiIndustries = Array.from(new Set([...aiIndustries, ...aiProvenanceIndustries]));
      if (combinedAiIndustries.length > 0) {
        industries = combinedAiIndustries;
      }
    }
  }

  // 5. Resolve Specialty & Creative Identity
  const rawSpecialty = typeof data.specialty === 'string' ? data.specialty.trim() : '';
  const specialty = rawSpecialty || disciplines[0] || dnaResult?.provenance?.creatorProvided?.statedSpecialty || 'AI Visual Direction';

  const rawCreativeIdentity = typeof data.creativeIdentity === 'string' ? data.creativeIdentity.trim() : '';
  const creativeIdentity = rawCreativeIdentity || specialty;

  // 6. Handle & Unique ID
  const rawHandle = typeof data.handle === 'string' ? data.handle.trim() : '';
  const id = rawHandle
    ? rawHandle.replace('@', '').replace(/\./g, '-')
    : (typeof data.id === 'string' && data.id.trim() ? data.id.trim() : `creator-${Date.now()}`);

  const name = typeof data.name === 'string' && data.name.trim()
    ? data.name.trim()
    : 'Creative Artist';

  const handle = rawHandle
    ? (rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`)
    : '@creator.ai';

  const location = typeof data.location === 'string' && data.location.trim()
    ? data.location.trim()
    : 'Remote (Global)';

  const availability = typeof data.availability === 'string' && data.availability.trim()
    ? data.availability.trim()
    : 'Available for projects';

  const portfolio = Array.isArray(data.portfolio) ? data.portfolio : [];
  const heroWork = typeof data.heroWork === 'string' && data.heroWork.trim()
    ? data.heroWork.trim()
    : (portfolio[0]?.image || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85');

  const avatar = typeof data.avatar === 'string' && data.avatar.trim()
    ? data.avatar.trim()
    : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  const bio = typeof data.bio === 'string' && data.bio.trim()
    ? data.bio.trim()
    : 'AI Creator on Alloy.';

  return {
    id,
    name,
    handle,
    creativeIdentity,
    specialty,
    location,
    availability,
    statusBadge: 'Profile Live',
    status: 'Published',
    visibility: 'published',
    commercialLicensingVerified: data.commercialLicensingVerified !== undefined ? Boolean(data.commercialLicensingVerified) : true,
    heroWork,
    videoPreview: portfolio.find(p => p.video)?.video || data.videoPreview || null,
    portfolioMedia: portfolio.flatMap(p => p.media || []),
    portfolioImages: portfolio.map(p => p.image).filter(Boolean),
    portfolioVideos: portfolio.map(p => p.video).filter(Boolean),
    portfolio_media: portfolio.flatMap(p => p.media || []),
    portfolio_images: portfolio.map(p => p.image).filter(Boolean),
    portfolio_videos: portfolio.map(p => p.video).filter(Boolean),
    portfolio_projects: portfolio,
    avatar,
    bio,
    styles,
    disciplines,
    capabilities,
    industries,
    tools,
    experience: typeof data.experience === 'string' ? data.experience : '3+ years AI-native cinema',
    turnaround: typeof data.turnaround === 'string' ? data.turnaround : '48h concept boards',
    featured: typeof data.featured === 'boolean' ? data.featured : true,
    projects: portfolio,
    socials: (data.socials && typeof data.socials === 'object') ? data.socials : {},
    categoryTags: Array.isArray(data.categoryTags) ? data.categoryTags : [],
    technicalSkills: Array.isArray(data.technicalSkills) ? data.technicalSkills : [],
    creativeSkills: Array.isArray(data.creativeSkills) ? data.creativeSkills : [],
    dna: dnaResult || null
  };
}

export const createCreatorRecord = buildPublishedCreatorProfile;


// ----------------------------------------------------
// 9. BRAND DATA ISOLATION SELECTORS
// ----------------------------------------------------

/**
 * Derives data isolated strictly to the given brandId
 */
export function getBrandScopedData(state, brandId, isDemoMode = false) {
  const brands = state.brands || DEMO_BRANDS;
  let currentBrand = brands.find(b => b.id === brandId);
  if (!currentBrand && brandId && brandId.startsWith('brand-') && brandId !== 'brand-demo-lumina') {
    const rawName = brandId.replace(/^brand-/, '').replace(/-/g, ' ');
    currentBrand = {
      id: brandId,
      name: rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : 'Brand Studio',
      industry: 'Creative & Digital',
      description: 'Private studio workspace.',
      aesthetic: 'Modern & Editorial',
      isDemo: false
    };
  }
  if (!currentBrand) {
    currentBrand = DEMO_BRANDS[0];
  }

  // Strict Brand Isolation:
  // In real brand mode, ONLY campaigns owned by this specific brandId
  const campaigns = (state.campaigns || []).filter(c =>
    c.ownerBrandId === currentBrand.id ||
    c.brandId === currentBrand.id ||
    c.owner_brand_id === currentBrand.id
  );

  // Active campaign must strictly belong to this brand
  const activeCampaign = (state.activeCampaignId && campaigns.find(c => c.id === state.activeCampaignId)) || campaigns[0] || null;

  // Invitations strictly belonging to this brand
  const invitations = (state.invitations || []).filter(inv =>
    inv.brandId === currentBrand.id || (campaigns.length > 0 && campaigns.some(c => c.id === inv.campaignId))
  );

  // Collaborations / Projects strictly belonging to this brand
  const projects = (state.projects || []).filter(p =>
    p.brandId === currentBrand.id || (campaigns.length > 0 && campaigns.some(c => c.id === p.campaignId))
  );

  // Messaging connections strictly belonging to this brand
  const connections = (state.connections || []).filter(conn =>
    conn.brandId === currentBrand.id || (campaigns.length > 0 && campaigns.some(c => c.id === conn.campaignId))
  );

  // Brand-scoped shortlists strictly belonging to this brand's campaigns
  const shortlists = {};
  campaigns.forEach(c => {
    if (state.shortlists && state.shortlists[c.id]) {
      shortlists[c.id] = state.shortlists[c.id];
    }
  });

  return {
    currentBrand,
    campaigns,
    activeCampaign,
    invitations,
    projects,
    connections,
    shortlists
  };
}

/**
 * Derives public opportunities visible to creators in the marketplace
 * Strictly excludes private drafts and paused campaigns!
 */
export function getPublicCreatorOpportunities(state) {
  const publishedCampaignOpps = (state.campaigns || [])
    .filter(c => (c.visibility === 'published' || c.status === 'Active') && c.visibility !== 'draft' && c.visibility !== 'archived')
    .map(c => ({
      id: `opp-${c.id}`,
      campaignId: c.id,
      brand: c.brandName,
      title: c.title,
      budget: c.budget || 'In Discussion',
      timeline: c.timeline || c.deadline || 'Standard Production',
      creativeDirection: c.creativeStyle || c.description,
      requirements: Array.isArray(c.deliverables) ? c.deliverables : [c.deliverables || 'Production Assets'],
      whyItFits: `Direct opportunity published by ${c.brandName} for creators with relevant visual styles.`,
      status: 'new'
    }));

  // Combine with initial opportunities, deduplicating by campaignId
  const initialOpps = state.opportunities || INITIAL_CREATOR_OPPORTUNITIES;
  const campaignIdsSeen = new Set(publishedCampaignOpps.map(o => o.campaignId));

  const additionalOpps = initialOpps.filter(o => !campaignIdsSeen.has(o.campaignId));
  return [...publishedCampaignOpps, ...additionalOpps];
}

// ============================================================================
// TRUST CENTRE STORE RECORD MUTATORS (Local State & Broadcast)
// ============================================================================

export function getVerificationClaimsRecord(creatorId = null) {
  const state = getInitialMarketplaceState();
  let claims = state.verificationClaims || [];

  // If claims not yet initialized in state, seed with Maya Chen's demo claims
  if (claims.length === 0) {
    const maya = (state.creators || []).find(c => c.id === 'maya-chen') || state.creators?.[0];
    const tv = maya?.trustVerification || {};
    claims = [
      {
        id: 'claim-maya-email',
        creatorId: 'maya-chen',
        creatorName: 'Maya Chen',
        claimType: 'identity',
        claimTitle: 'Email Verification (maya.chen@alloy.market)',
        status: tv.email?.status || 'verified',
        evidenceType: 'Supabase Auth OTP Challenge',
        evidenceUrl: null,
        evidenceDetails: { method: 'cryptographic_magic_link' },
        isPrivate: false,
        reviewerNotes: tv.email?.notes || 'Cryptographically confirmed via Supabase Auth email challenge.',
        reviewedBy: 'System Automated Auth',
        reviewedAt: '2026-09-14T10:00:00Z',
        createdAt: '2026-09-14T09:30:00Z'
      },
      {
        id: 'claim-maya-id',
        creatorId: 'maya-chen',
        creatorName: 'Maya Chen',
        claimType: 'identity',
        claimTitle: 'Government Identity Verification (UK Passport)',
        status: tv.identity?.status || 'pending_review',
        evidenceType: 'Passport (United Kingdom)',
        evidenceUrl: 'https://vault.alloy.market/private/identity/doc_maya_enc.pdf',
        evidenceDetails: { legalName: 'Maya Li-Wei Chen', jurisdiction: 'United Kingdom (GB)', maskedNumber: '•••••• 8941' },
        isPrivate: true,
        reviewerNotes: 'Government document queued for compliance verification in encrypted storage.',
        reviewedBy: null,
        reviewedAt: null,
        createdAt: '2026-10-02T14:15:00Z'
      },
      {
        id: 'claim-maya-solarium',
        creatorId: 'maya-chen',
        creatorName: 'Maya Chen',
        claimType: 'portfolio',
        claimTitle: 'Portfolio Authenticity: Echoes of the Solarium',
        status: 'verified',
        evidenceType: 'ComfyUI JSON Graph & 4K ProRes Master',
        evidenceUrl: 'https://vault.alloy.market/audit/solarium_comfy_v4.json',
        evidenceDetails: { projectId: 'maya-proj-1', projectTitle: 'Echoes of the Solarium', seed: 48921104, format: 'ProRes 4444' },
        isPrivate: false,
        reviewerNotes: 'Inspected original node graph and verified seed reproducibility against finished 4K render.',
        reviewedBy: 'Elena Rostova (Lead Visual Auditor)',
        reviewedAt: '2026-10-06T14:22:00Z',
        createdAt: '2026-10-04T11:00:00Z'
      },
      {
        id: 'claim-maya-lumina',
        creatorId: 'maya-chen',
        creatorName: 'Maya Chen',
        claimType: 'portfolio',
        claimTitle: 'Portfolio Authenticity: Lumina Botanica Serums',
        status: 'pending_review',
        evidenceType: 'ControlNet Depth Passes & Raw PSD Layers',
        evidenceUrl: 'https://vault.alloy.market/audit/lumina_depth_passes.zip',
        evidenceDetails: { projectId: 'maya-proj-2', projectTitle: 'Lumina Botanica Serums', model: 'Midjourney v6.1 + ControlNet' },
        isPrivate: false,
        reviewerNotes: 'Queued for visual inspection of fluid droplet depth layers.',
        reviewedBy: null,
        reviewedAt: null,
        createdAt: '2026-10-08T09:40:00Z'
      },
      {
        id: 'claim-maya-runway',
        creatorId: 'maya-chen',
        creatorName: 'Maya Chen',
        claimType: 'ai_tools',
        claimTitle: 'AI Model Claim: Runway Gen-3 Alpha Kinetic Motion',
        status: 'verified',
        evidenceType: 'Master Timeline Generation Timestamps',
        evidenceUrl: null,
        evidenceDetails: { toolName: 'Runway Gen-3 Alpha', useCase: 'Primary kinetic motion synthesis' },
        isPrivate: false,
        reviewerNotes: 'Timestamp metadata in ProRes timeline confirms direct Runway export integration.',
        reviewedBy: 'Elena Rostova (Lead Visual Auditor)',
        reviewedAt: '2026-10-06T15:10:00Z',
        createdAt: '2026-10-04T11:00:00Z'
      },
      {
        id: 'claim-maya-licensing',
        creatorId: 'maya-chen',
        creatorName: 'Maya Chen',
        claimType: 'commercial_rights',
        claimTitle: 'Commercial Buyout & Model Terms Warranty',
        status: 'verified',
        evidenceType: 'Model Terms of Service Disclosure',
        evidenceUrl: null,
        evidenceDetails: { licenseTypeGranted: 'Full Commercial Buyout', exclusivityPeriod: '12 Months Category Exclusivity' },
        isPrivate: false,
        reviewerNotes: 'Confirmed commercial foundational model tier permits unrestricted commercial deliverables.',
        reviewedBy: 'Platform Legal Operations',
        reviewedAt: '2026-09-15T16:00:00Z',
        createdAt: '2026-09-15T14:00:00Z'
      }
    ];
  }

  if (creatorId) {
    return claims.filter(c => c.creatorId === creatorId);
  }
  return claims;
}

export function submitVerificationClaimRecord(claimData) {
  const state = getInitialMarketplaceState();
  const currentClaims = getVerificationClaimsRecord();

  const newClaim = {
    id: claimData.id || `claim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    creatorId: claimData.creatorId,
    creatorName: claimData.creatorName || claimData.creatorId,
    claimType: claimData.claimType,
    claimTitle: claimData.claimTitle,
    status: (claimData.status === 'self_declared') ? 'self_declared' : 'pending_review',
    evidenceType: claimData.evidenceType || 'Submitted Documentation',
    evidenceUrl: claimData.evidenceUrl || null,
    evidenceDetails: claimData.evidenceDetails || {},
    isPrivate: !!claimData.isPrivate,
    reviewerNotes: 'Queued for compliance review.',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existingIdx = currentClaims.findIndex(c => c.id === newClaim.id);
  let updatedClaims;
  if (existingIdx >= 0) {
    updatedClaims = currentClaims.map((c, i) => i === existingIdx ? newClaim : c);
  } else {
    updatedClaims = [newClaim, ...currentClaims];
  }

  const updatedState = {
    ...state,
    verificationClaims: updatedClaims
  };

  // Sync to creator's trustVerification structure
  if (state.creators && claimData.creatorId) {
    updatedState.creators = state.creators.map(cr => {
      if (cr.id === claimData.creatorId) {
        const tv = { ...(cr.trustVerification || {}) };
        if (claimData.claimType === 'portfolio') {
          tv.portfolioEvidence = [
            ...(tv.portfolioEvidence || []).filter(p => p.id !== newClaim.id),
            {
              id: newClaim.id,
              projectId: claimData.evidenceDetails?.projectId,
              projectTitle: claimData.claimTitle,
              evidenceType: newClaim.evidenceType,
              description: claimData.evidenceDetails?.description || newClaim.claimTitle,
              artifactUrl: newClaim.evidenceUrl,
              status: newClaim.status,
              submittedAt: 'Just now'
            }
          ];
        } else if (claimData.claimType === 'ai_tools') {
          tv.toolDeclarations = [
            ...(tv.toolDeclarations || []).filter(t => t.id !== newClaim.id),
            {
              id: newClaim.id,
              toolName: claimData.evidenceDetails?.toolName || claimData.claimTitle,
              useCase: claimData.evidenceDetails?.useCase || '',
              associatedWork: claimData.evidenceDetails?.associatedWork || 'Commercial Deliverables',
              provenance: 'evidence_attached',
              status: newClaim.status
            }
          ];
        } else if (claimData.claimType === 'commercial_rights') {
          tv.licensing = {
            ...(tv.licensing || {}),
            modelRightsDeclaration: claimData.evidenceDetails?.modelRightsDeclaration || claimData.claimTitle,
            licenseTypeGranted: claimData.evidenceDetails?.licenseTypeGranted || 'Full Commercial Buyout',
            exclusivityPeriod: claimData.evidenceDetails?.exclusivityPeriod || '12 Months Category Exclusivity',
            status: newClaim.status
          };
        } else if (claimData.claimType === 'identity') {
          tv.identity = {
            ...(tv.identity || {}),
            legalName: claimData.evidenceDetails?.legalName || '',
            issuingCountry: claimData.evidenceDetails?.jurisdiction || '',
            documentType: claimData.evidenceType || 'Passport',
            status: newClaim.status,
            isPrivate: true
          };
        }
        return { ...cr, trustVerification: tv };
      }
      return cr;
    });
  }

  saveMarketplaceState(updatedState);
  return newClaim;
}

export function reviewVerificationClaimRecord({ claimId, decision, notes = '', reviewerName = 'Platform Auditor' }) {
  const state = getInitialMarketplaceState();
  const currentClaims = getVerificationClaimsRecord();

  const target = currentClaims.find(c => c.id === claimId);
  if (!target) return null;

  let newStatus = 'verified';
  let auditAction = 'APPROVED';
  if (decision === 'REJECT') {
    newStatus = 'unable_to_verify';
    auditAction = 'REJECTED';
  } else if (decision === 'REQUEST_INFO' || decision === 'NEEDS_RENEWAL') {
    newStatus = 'needs_renewal';
    auditAction = 'REQUEST_INFO';
  }

  const now = new Date().toISOString();
  const updatedClaim = {
    ...target,
    status: newStatus,
    reviewerNotes: notes || (decision === 'APPROVE' ? 'Evidence inspected and confirmed authentic.' : 'Additional evidence requested.'),
    reviewedBy: reviewerName,
    reviewedAt: now,
    updatedAt: now
  };

  const updatedClaims = currentClaims.map(c => c.id === claimId ? updatedClaim : c);

  // Append to audit log
  const currentAuditLogs = state.verificationAuditLogs || [];
  const newAuditEntry = {
    id: `aud-${Date.now()}`,
    claimId: target.id,
    creatorId: target.creatorId,
    reviewerName,
    action: auditAction,
    notes: updatedClaim.reviewerNotes,
    createdAt: now
  };

  const updatedState = {
    ...state,
    verificationClaims: updatedClaims,
    verificationAuditLogs: [newAuditEntry, ...currentAuditLogs]
  };

  // Reflect on creator profile
  if (updatedState.creators && target.creatorId) {
    updatedState.creators = updatedState.creators.map(cr => {
      if (cr.id === target.creatorId) {
        const tv = { ...(cr.trustVerification || {}) };
        if (target.claimType === 'portfolio') {
          tv.portfolioEvidence = (tv.portfolioEvidence || []).map(p =>
            p.id === target.id || p.projectId === target.evidenceDetails?.projectId
              ? { ...p, status: newStatus, reviewedAt: now, reviewerNotes: notes }
              : p
          );
        } else if (target.claimType === 'ai_tools') {
          tv.toolDeclarations = (tv.toolDeclarations || []).map(t =>
            t.id === target.id
              ? { ...t, status: newStatus }
              : t
          );
        } else if (target.claimType === 'commercial_rights') {
          tv.licensing = {
            ...(tv.licensing || {}),
            status: newStatus
          };
        } else if (target.claimType === 'identity') {
          tv.identity = {
            ...(tv.identity || {}),
            status: newStatus,
            reviewedAt: now,
            reviewedBy: reviewerName,
            notes: notes
          };
        } else if (target.claimType === 'workflow') {
          tv.workflowVerification = {
            ...(tv.workflowVerification || {}),
            status: newStatus,
            auditedAt: now,
            auditorSummary: notes
          };
        }
        return { ...cr, trustVerification: tv };
      }
      return cr;
    });
  }

  saveMarketplaceState(updatedState);
  return { claim: updatedClaim, auditEntry: newAuditEntry };
}

/**
 * Record a verified Razorpay Test Mode funding transaction for a campaign
 */
export function recordCampaignFunding(campaignId, paymentData) {
  if (typeof window === 'undefined' || !campaignId || !paymentData) return null;
  const state = getInitialMarketplaceState();
  const campaigns = (state.campaigns || []).map(camp => {
    if (camp.id === campaignId) {
      const currentFunded = Number(camp.fundedAmountRupees || 0);
      const additionRupees = Number(paymentData.amount_rupees || (paymentData.amount / 100) || 0);
      const newTotalRupees = currentFunded + additionRupees;
      const verifiedPayments = Array.isArray(camp.verifiedPayments) ? [...camp.verifiedPayments] : [];
      verifiedPayments.push({
        paymentId: paymentData.payment_id || paymentData.paymentId,
        orderId: paymentData.order_id || paymentData.orderId,
        amountRupees: additionRupees,
        amountPaise: paymentData.amount,
        verifiedAt: paymentData.verified_at || paymentData.verifiedAt || new Date().toISOString()
      });
      return {
        ...camp,
        fundedAmountRupees: newTotalRupees,
        fundedAmountPaise: (camp.fundedAmountPaise || 0) + (paymentData.amount || 0),
        isFunded: true,
        fundingStatus: 'funded_test_mode',
        verifiedPayments,
        updatedAt: 'Just now'
      };
    }
    return camp;
  });

  const updatedState = { ...state, campaigns };
  saveMarketplaceState(updatedState);

  // Real-time synchronization to Supabase Table Editor (payments & campaign funding)
  if (typeof window !== 'undefined') {
    import('../services/dbSync.js').then(({ syncFundingToDb, syncCampaignToDb }) => {
      syncFundingToDb({
        campaignId,
        amountPaise: paymentData.amount,
        amountRupees: Number(paymentData.amount_rupees || (paymentData.amount / 100) || 0),
        currency: 'INR',
        paymentId: paymentData.payment_id || paymentData.paymentId,
        orderId: paymentData.order_id || paymentData.orderId,
        funderName: paymentData.funder_name || 'Brand Partner',
        verified: true
      }).catch(() => {});

      const updatedCamp = campaigns.find(c => c.id === campaignId);
      if (updatedCamp) {
        syncCampaignToDb(updatedCamp).catch(() => {});
      }
    }).catch(() => {});
  }

  return updatedState;
}
