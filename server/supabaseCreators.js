import { createClient } from '@supabase/supabase-js';

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key || !url.startsWith('https://')) {
    return null;
  }

  return { url, key };
}

function normalizeCreator(row) {
  const rawProjects = (Array.isArray(row.projects) && row.projects.length > 0)
    ? row.projects
    : (Array.isArray(row.portfolio_projects) && row.portfolio_projects.length > 0
      ? row.portfolio_projects
      : (Array.isArray(row.portfolio) ? row.portfolio : []));

  const portfolioMedia = Array.isArray(row.portfolio_media) ? row.portfolio_media : [];
  const portfolioImages = Array.isArray(row.portfolio_images) ? row.portfolio_images : [];
  const portfolioVideos = Array.isArray(row.portfolio_videos) ? row.portfolio_videos : [];

  const heroWork = row.hero_work || portfolioImages[0] || rawProjects[0]?.image || '';
  const videoPreview = row.video_preview || portfolioVideos[0] || rawProjects.find(p => p.video)?.video || null;

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
    heroWork,
    videoPreview,
    avatar: row.avatar,
    styles: row.styles || [],
    industries: row.industries || [],
    capabilities: row.capabilities || [],
    tools: row.tools || [],
    platforms: row.platforms || [],
    categoryTags: row.category_tags || [],
    portfolioMedia,
    portfolioImages,
    portfolioVideos,
    status: row.status,
    visibility: row.visibility,
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    commercialLicensingVerified: row.commercial_licensing_verified !== undefined 
      ? Boolean(row.commercial_licensing_verified) 
      : (row.commercialLicensingVerified !== undefined ? Boolean(row.commercialLicensingVerified) : undefined),
    trustVerification: row.trust_verification || row.trustVerification || null,
    projects: rawProjects.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category,
      creativeStyle: project.creative_style || project.creativeStyle,
      tools: project.tools,
      format: project.format,
      image: project.image,
      video: project.video,
      aspect: project.aspect,
      role: project.role,
      clientType: project.client_type || project.clientType,
      creativeDirection: project.creative_direction || project.creativeDirection,
      capabilities: project.capabilities || [],
      media: project.media || [],
      workflowId: project.workflow_id || project.workflowId,
      visibility: project.visibility,
      featured: Boolean(project.featured),
      displayOrder: project.display_order ?? project.displayOrder,
      createdAt: project.created_at || project.createdAt,
      updatedAt: project.updated_at || project.updatedAt
    })),
    creativeDNA: row.creative_dna?.[0] ? {
      traits: row.creative_dna[0].traits || [],
      visualAesthetic: row.creative_dna[0].visual_aesthetic,
      storytellingApproach: row.creative_dna[0].storytelling_approach,
      productPresentationStyle: row.creative_dna[0].product_presentation_style,
      provenance: row.creative_dna[0].provenance || {},
      completeness: row.creative_dna[0].completeness || {},
      source: row.creative_dna[0].source,
      isLiveAI: Boolean(row.creative_dna[0].is_live_ai)
    } : null,
    workflows: (row.workflows || []).map(workflow => ({
      id: workflow.id,
      creatorId: workflow.creator_id,
      title: workflow.title,
      description: workflow.description,
      specialization: workflow.specialization,
      linkedProjectId: workflow.linked_project_id,
      linkedProjectTitle: workflow.linked_project_title,
      status: workflow.status,
      visibility: workflow.visibility,
      humanInvolvementNotes: workflow.human_involvement_notes,
      steps: workflow.steps || [],
      isDemo: Boolean(workflow.is_demo)
    }))
  };
}

export async function fetchSupabaseCreators() {
  const config = getSupabaseConfig();

  if (!config) {
    return { configured: false, creators: [] };
  }

  const supabase = createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data, error } = await supabase
    .from('creator_profiles')
    .select(`
      *,
      projects:portfolio_projects(*),
      creative_dna(*),
      workflows:creator_workflows(*)
    `)
    .in('visibility', ['published', 'Published'])
    .in('status', ['published', 'Published']);

  if (error) {
    throw new Error(`Supabase creator query failed: ${error.message}`);
  }

  return {
    configured: true,
    creators: (data || []).map(normalizeCreator)
  };
}
