// src/services/dbSync.js
// ALLOY Marketplace — Universal Supabase Database Synchronization Service
// Ensures that whenever ANY change occurs in the application (Brand, Campaign,
// Creator Profile, Skills, Projects, Workflows, Shortlists, Deliverables, Payments),
// the respective row in Supabase's Table Editor is IMMEDIATELY updated in real time.

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

/**
 * Universal record upsert delegator:
 * 1. Tries /api/db/upsert (Server endpoint with SUPABASE_SERVICE_ROLE_KEY to guarantee RLS bypass)
 * 2. Falls back to direct client-side Supabase upsert if server endpoint is unreachable
 */
async function upsertRecord(table, record, onConflict = 'id') {
  if (!table || !record) return null;

  try {
    const res = await fetch('/api/db/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, record, onConflict })
    });

    if (res.ok) {
      const json = await res.json();
      console.log(`[DbSync] ⚡ Table Editor updated via API -> "${table}":`, record.id || record.title || 'ok');
      return json.data;
    }
  } catch (err) {
    // Serverless endpoint offline or static host, continue to client fallback
  }

  // Fallback: direct Supabase client call
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from(table).upsert(record, { onConflict }).select();
      if (!error) {
        console.log(`[DbSync] ⚡ Table Editor updated via Supabase Client -> "${table}":`, record.id || 'ok');
        return data;
      }
      console.warn(`[DbSync] Supabase direct upsert on "${table}" warning:`, error.message);
    } catch (clientErr) {
      console.warn(`[DbSync] Supabase direct client error on "${table}":`, clientErr);
    }
  }

  return null;
}

/**
 * Universal record deletion delegator:
 * 1. Tries /api/db/delete via server endpoint
 * 2. Falls back to direct client-side Supabase delete
 */
async function deleteRecord(table, id, match = null) {
  if (!table) return false;

  try {
    const res = await fetch('/api/db/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, id, match })
    });

    if (res.ok) {
      console.log(`[DbSync] 🗑️ Deleted from "${table}" via API:`, id || match);
      return true;
    }
  } catch (err) {
    // API offline, fallback
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from(table).delete();
      if (id) query = query.eq('id', id);
      else if (match) query = query.match(match);
      await query;
      console.log(`[DbSync] 🗑️ Deleted from "${table}" via Supabase Client:`, id || match);
      return true;
    } catch (clientErr) {
      console.warn(`[DbSync] Delete error on "${table}":`, clientErr);
    }
  }

  return false;
}

// ============================================================================
// 1. BRAND SYNCHRONIZATION (Table: brands)
// ============================================================================
export async function syncBrandToDb(brand, userId = null) {
  if (!brand || !brand.id) return null;

  const payload = {
    id: brand.id,
    name: brand.name || 'Brand Partner',
    industry: brand.industry || 'Creative & Media',
    website: brand.website || '',
    logo: brand.logo || null,
    cover_image: brand.coverImage || brand.cover_image || null,
    description: brand.description || '',
    aesthetic: brand.aesthetic || '',
    brand_colors: brand.brandColors || brand.brand_colors || [],
    preferred_platforms: brand.preferredPlatforms || brand.preferred_platforms || [],
    is_demo: Boolean(brand.isDemo ?? true),
    updated_at: new Date().toISOString()
  };

  if (userId || brand.userId || brand.user_id) {
    payload.user_id = userId || brand.userId || brand.user_id;
  }

  return upsertRecord('brands', payload);
}

// ============================================================================
// 2. CAMPAIGN SYNCHRONIZATION (Table: campaigns)
// ============================================================================
export async function syncCampaignToDb(campaign, brand = null, userId = null) {
  if (!campaign || !campaign.id) return null;

  const ownerBrandId = campaign.ownerBrandId || campaign.owner_brand_id || (brand && brand.id) || 'brand-demo-lumina';
  const brandName = campaign.brandName || campaign.brand_name || (brand && brand.name) || 'Lumina Botanica';

  // Ensure visibility matches check constraint: ('published', 'draft', 'private')
  let visibility = campaign.visibility || 'published';
  if (!['published', 'draft', 'private'].includes(visibility)) {
    visibility = 'published';
  }

  const payload = {
    id: campaign.id,
    owner_brand_id: ownerBrandId,
    brand_name: brandName,
    brand_avatar: campaign.brandAvatar || campaign.brand_avatar || (brand && (brand.logo || brand.avatar)) || null,
    brand_website: campaign.brandWebsite || campaign.brand_website || (brand && brand.website) || null,
    title: campaign.title || 'Untitled Campaign',
    objective: campaign.objective || 'Product Launch',
    product_or_service: campaign.productOrService || campaign.product_or_service || '',
    industry: campaign.industry || (brand && brand.industry) || 'Creative & Media',
    description: campaign.description || '',
    creative_direction: campaign.creativeDirection || campaign.creative_direction || '',
    creative_style: campaign.creativeStyle || campaign.creative_style || '',
    tone_of_voice: campaign.toneOfVoice || campaign.tone_of_voice || '',
    deliverables: Array.isArray(campaign.deliverables) ? campaign.deliverables : [campaign.deliverables].filter(Boolean),
    platforms: Array.isArray(campaign.platforms) ? campaign.platforms : (campaign.targetPlatforms || []),
    budget: campaign.budget || '$5,000 – $10,000',
    currency: campaign.currency || 'USD',
    timeline: campaign.timeline || '2–3 Weeks',
    deadline: campaign.deadline || 'Nov 20, 2026',
    target_audience: campaign.targetAudience || campaign.target_audience || '',
    cover_image: campaign.coverImage || campaign.cover_image || null,
    status: campaign.status || 'Active',
    visibility,
    is_demo: Boolean(campaign.isDemo ?? true),
    updated_at: new Date().toISOString()
  };

  return upsertRecord('campaigns', payload);
}

export async function deleteCampaignFromDb(campaignId) {
  if (!campaignId) return false;
  return deleteRecord('campaigns', campaignId);
}

// ============================================================================
// 3. CREATOR PROFILE SYNCHRONIZATION (Table: creator_profiles)
// ============================================================================
export async function syncCreatorToDb(creator, userId = null) {
  if (!creator || !creator.id) return null;

  // Resolve projects from creator.projects, creator.portfolio, or creator.portfolio_projects
  const projects = Array.isArray(creator.projects) && creator.projects.length > 0
    ? creator.projects
    : (Array.isArray(creator.portfolio) && creator.portfolio.length > 0
      ? creator.portfolio
      : (Array.isArray(creator.portfolio_projects) ? creator.portfolio_projects : []));

  // Aggregate all uploaded images and videos from portfolio items
  const portfolioImages = [];
  const portfolioVideos = [];
  const portfolioMedia = [];

  // Add creator top-level visual items if present
  if (creator.heroWork || creator.hero_work) {
    portfolioImages.push(creator.heroWork || creator.hero_work);
  }
  if (creator.videoPreview || creator.video_preview) {
    portfolioVideos.push(creator.videoPreview || creator.video_preview);
  }

  // Iterate projects to harvest images, videos, and media assets
  projects.forEach(p => {
    if (p.image && !portfolioImages.includes(p.image)) {
      portfolioImages.push(p.image);
    }
    if (p.video && !portfolioVideos.includes(p.video)) {
      portfolioVideos.push(p.video);
    }
    if (Array.isArray(p.media)) {
      p.media.forEach(m => {
        if (!portfolioMedia.some(existing => existing.id === m.id || (m.url && existing.url === m.url))) {
          portfolioMedia.push(m);
        }
        if (m.url) {
          const isVid = m.mediaType === 'video' || m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov)(\?.*)?$/i.test(m.url);
          if (isVid && !portfolioVideos.includes(m.url)) {
            portfolioVideos.push(m.url);
          } else if (!isVid && !portfolioImages.includes(m.url)) {
            portfolioImages.push(m.url);
          }
        }
      });
    }
  });

  // Include any extra media directly on creator
  const extraMedia = Array.isArray(creator.portfolio_media)
    ? creator.portfolio_media
    : (Array.isArray(creator.portfolioMedia) ? creator.portfolioMedia : []);
  extraMedia.forEach(m => {
    if (!portfolioMedia.some(existing => existing.id === m.id || (m.url && existing.url === m.url))) {
      portfolioMedia.push(m);
    }
    if (m.url) {
      const isVid = m.mediaType === 'video' || m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov)(\?.*)?$/i.test(m.url);
      if (isVid && !portfolioVideos.includes(m.url)) {
        portfolioVideos.push(m.url);
      } else if (!isVid && !portfolioImages.includes(m.url)) {
        portfolioImages.push(m.url);
      }
    }
  });

  // Preserve creator profile styles cleanly without mutating creator.styles with project styles
  const creatorProfileStyles = Array.isArray(creator.styles) ? [...creator.styles] : [];

  const heroWork = creator.heroWork || creator.hero_work || portfolioImages[0] || (projects[0]?.image) || '';
  const videoPreview = creator.videoPreview || creator.video_preview || portfolioVideos[0] || (projects.find(p => p.video)?.video) || null;

  const payload = {
    id: creator.id,
    name: creator.name || 'AI Creator',
    handle: creator.handle || `@${creator.id}`,
    creative_identity: creator.creativeIdentity || creator.creative_identity || creator.role || '',
    bio: creator.bio || '',
    specialty: creator.specialty || (Array.isArray(creator.disciplines) ? creator.disciplines[0] : 'AI Visual Direction'),
    location: creator.location || 'Global',
    availability: creator.availability || 'Available for projects',
    status_badge: creator.statusBadge || creator.status_badge || 'Available now',
    turnaround: creator.turnaround || '48h concept frames',
    experience: creator.experience || '3+ years generative art',
    hero_work: heroWork,
    video_preview: videoPreview,
    avatar: creator.avatar || '',
    styles: creatorProfileStyles,
    industries: creator.industries || [],
    capabilities: creator.capabilities || [],
    tools: creator.tools || [],
    platforms: creator.platforms || [],
    category_tags: creator.categoryTags || creator.category_tags || [],
    technical_skills: creator.technicalSkills || creator.technical_skills || [],
    creative_skills: creator.creativeSkills || creator.creative_skills || [],
    commercial_licensing_verified: Boolean(creator.commercialLicensingVerified ?? true),
    trust_verification: creator.trustVerification || creator.trust_verification || {},
    portfolio_media: portfolioMedia,
    portfolio_images: portfolioImages,
    portfolio_videos: portfolioVideos,
    portfolio_projects: projects,
    status: creator.status || 'Published',
    visibility: creator.visibility || 'published',
    is_demo: Boolean(creator.isDemo ?? true),
    updated_at: new Date().toISOString()
  };

  if (userId || creator.userId || creator.user_id) {
    payload.user_id = userId || creator.userId || creator.user_id;
  }

  const res = await upsertRecord('creator_profiles', payload);

  // Synchronize creator's attached projects if present
  if (Array.isArray(projects) && projects.length > 0) {
    for (const proj of projects) {
      await syncProjectToDb(creator.id, proj);
    }
  }

  // Synchronize creator's workflows if present
  if (Array.isArray(creator.workflows) && creator.workflows.length > 0) {
    for (const wf of creator.workflows) {
      await syncWorkflowToDb(creator.id, wf);
    }
  }

  return res || payload;
}

// ============================================================================
// 4. PORTFOLIO PROJECT SYNCHRONIZATION (Table: portfolio_projects)
// ============================================================================
export async function syncProjectToDb(creatorId, project) {
  if (!creatorId || !project || !project.id) return null;

  // Resolve cover image and video from media if missing
  const mediaList = Array.isArray(project.media) ? [...project.media] : [];
  const coverItem = mediaList.find(m => m.isCover) || mediaList[0];
  const videoItem = mediaList.find(m => m.mediaType === 'video' || m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov)(\?.*)?$/i.test(m.url || ''));

  const finalImage = project.image || coverItem?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85';
  const finalVideo = project.video || videoItem?.url || null;

  // Ensure media array is non-empty if image or video exists
  if (mediaList.length === 0) {
    if (finalImage) {
      mediaList.push({
        id: `media-${project.id}-img`,
        url: finalImage,
        mediaType: 'image',
        name: `${project.title || 'Project'} Cover`,
        isCover: true
      });
    }
    if (finalVideo) {
      mediaList.push({
        id: `media-${project.id}-vid`,
        url: finalVideo,
        mediaType: 'video',
        name: `${project.title || 'Project'} Video Reel`,
        isCover: !finalImage
      });
    }
  }

  const payload = {
    id: project.id,
    creator_id: creatorId,
    title: project.title || 'Portfolio Work',
    description: project.description || '',
    category: project.category || 'Visual Art',
    creative_style: project.creativeStyle || project.creative_style || '',
    tools: typeof project.tools === 'string' ? project.tools : (Array.isArray(project.tools) ? project.tools.join(', ') : ''),
    format: project.format || '4K Stills Suite',
    image: finalImage,
    video: finalVideo,
    aspect: project.aspect || '16:9',
    role: project.role || 'Lead Visual Artist',
    client_type: project.clientType || project.client_type || '',
    creative_direction: project.creativeDirection || project.creative_direction || '',
    capabilities: project.capabilities || [],
    media: mediaList,
    workflow_id: project.workflowId || project.workflow_id || null,
    workflow_stages: project.workflowStages || project.workflow_stages || [],
    production_workflow: project.productionWorkflow || project.production_workflow || {},
    visibility: project.visibility === 'private' ? 'private' : 'published',
    featured: Boolean(project.featured),
    display_order: project.displayOrder || project.display_order || 0,
    updated_at: new Date().toISOString()
  };

  const res = await upsertRecord('portfolio_projects', payload);
  return res || payload;
}

export async function deleteProjectFromDb(creatorId, projectId) {
  if (!projectId) return false;
  return deleteRecord('portfolio_projects', projectId);
}

// ============================================================================
// 5. CREATOR WORKFLOW SYNCHRONIZATION (Table: creator_workflows)
// ============================================================================
export async function syncWorkflowToDb(creatorId, workflow) {
  if (!workflow || !workflow.id) return null;

  const resolvedCreatorId = (workflow.creatorId === 'kai-sorenson' ? 'alex-rivera' : (creatorId || workflow.creatorId || 'maya-chen'));

  const payload = {
    id: workflow.id,
    creator_id: resolvedCreatorId,
    title: workflow.title || 'Creator Workflow Pipeline',
    description: workflow.description || '',
    specialization: workflow.specialization || '',
    linked_project_id: (resolvedCreatorId === 'alex-rivera' && workflow.creatorId === 'kai-sorenson') ? null : (workflow.linkedProjectId || workflow.linked_project_id || null),
    linked_project_title: workflow.linkedProjectTitle || workflow.linked_project_title || null,
    status: workflow.status || 'Published',
    visibility: (workflow.visibility === 'draft' || workflow.visibility === 'private') ? workflow.visibility : 'published',
    human_involvement_notes: workflow.humanInvolvementNotes || workflow.human_involvement_notes || '',
    steps: workflow.steps || [],
    is_demo: Boolean(workflow.isDemo ?? true),
    updated_at: new Date().toISOString()
  };

  return upsertRecord('creator_workflows', payload);
}

export async function deleteWorkflowFromDb(creatorId, workflowId) {
  if (!workflowId) return false;
  return deleteRecord('creator_workflows', workflowId);
}

// ============================================================================
// 6. SHORTLIST SYNCHRONIZATION (Table: shortlists)
// ============================================================================
export async function syncShortlistToDb(brandId, campaignId, creatorId, isShortlisted) {
  if (!creatorId) return null;

  const resolvedBrandId = brandId || 'brand-demo-lumina';
  const shortlistId = `shortlist-${resolvedBrandId}-${creatorId}`;

  if (isShortlisted) {
    const payload = {
      id: shortlistId,
      brand_id: resolvedBrandId,
      creator_id: creatorId,
      campaign_id: campaignId || null
    };
    return upsertRecord('shortlists', payload);
  } else {
    return deleteRecord('shortlists', shortlistId);
  }
}

// ============================================================================
// 7. PAYMENTS & FUNDING SYNCHRONIZATION (Tables: payments, campaign_funding)
// ============================================================================
export async function syncFundingToDb(fundingRecord) {
  if (!fundingRecord) return null;

  const payload = {
    id: fundingRecord.id || `funding-${Date.now()}`,
    campaign_id: fundingRecord.campaignId || fundingRecord.campaign_id,
    amount_paise: fundingRecord.amountPaise || fundingRecord.amount_paise || (fundingRecord.amountRupees ? Number(fundingRecord.amountRupees) * 100 : 0),
    amount_rupees: fundingRecord.amountRupees || fundingRecord.amount_rupees || 0,
    currency: fundingRecord.currency || 'INR',
    payment_id: fundingRecord.paymentId || fundingRecord.payment_id || null,
    order_id: fundingRecord.orderId || fundingRecord.order_id || null,
    funder_name: fundingRecord.funderName || fundingRecord.funder_name || 'Brand Partner',
    verified: Boolean(fundingRecord.verified ?? true),
    created_at: fundingRecord.createdAt || new Date().toISOString()
  };

  return upsertRecord('campaign_funding', payload);
}

// ============================================================================
// 8. COLLABORATION SYNCHRONIZATION (Table: collaborations)
// ============================================================================
export async function syncCollaborationToDb(collab) {
  if (!collab || !collab.id) return null;

  let status = collab.status || 'Active';
  if (['in_progress', 'in-progress', 'active'].includes(String(status).toLowerCase())) {
    status = 'Active';
  } else if (String(status).toLowerCase() === 'in review' || String(status).toLowerCase() === 'in_review') {
    status = 'In Review';
  } else if (String(status).toLowerCase() === 'completed') {
    status = 'Completed';
  } else if (String(status).toLowerCase() === 'paused') {
    status = 'Paused';
  }

  const payload = {
    id: collab.id,
    brand_id: collab.brandId || collab.brand_id || 'brand-demo-lumina',
    creator_id: collab.creatorId || collab.creator_id || 'maya-chen',
    campaign_id: collab.campaignId || collab.campaign_id || null,
    project_name: collab.projectName || collab.project_name || collab.campaignTitle || collab.title || 'Creative Collaboration',
    brand_name: collab.brandName || collab.brand_name || 'Brand Partner',
    creator_name: collab.creatorName || collab.creator_name || 'Creator',
    status,
    current_stage: collab.currentStage || collab.current_stage || collab.milestone || 'Concept Approval',
    progress_percent: typeof collab.progressPercent === 'number' ? collab.progressPercent : (collab.progress_percent || 30),
    deadline: collab.deadline || null,
    agreed_budget: collab.agreedBudget || collab.agreed_budget || collab.budget || 'In Discussion',
    deliverables_scope: collab.deliverablesScope || collab.deliverables_scope || '',
    latest_feedback: collab.latestFeedback || collab.latest_feedback || null,
    brand_contact: collab.brandContact || collab.brand_contact || 'Creative Director',
    submission_previews: Array.isArray(collab.submissionPreviews) ? collab.submissionPreviews : (collab.submission_previews || []),
    feedback_history: Array.isArray(collab.feedbackHistory) ? collab.feedbackHistory : (collab.feedback_history || []),
    revision_history: Array.isArray(collab.revisionHistory) ? collab.revisionHistory : (collab.revision_history || []),
    is_demo: Boolean(collab.isDemo ?? true),
    updated_at: new Date().toISOString()
  };

  return upsertRecord('collaborations', payload);
}

// ============================================================================
// 9. INVITATION SYNCHRONIZATION (Table: invitations)
// ============================================================================
export async function syncInvitationToDb(invitation) {
  if (!invitation || !invitation.id) return null;

  let status = invitation.status || 'Pending';
  const lower = String(status).toLowerCase();
  if (lower === 'pending') status = 'Pending';
  else if (lower === 'accepted') status = 'Accepted';
  else if (lower === 'declined') status = 'Declined';
  else if (lower === 'expired') status = 'Expired';
  else status = 'Pending';

  const payload = {
    id: invitation.id,
    brand_id: invitation.brandId || invitation.brand_id || 'brand-demo-lumina',
    creator_id: invitation.creatorId || invitation.creator_id || 'maya-chen',
    campaign_id: invitation.campaignId || invitation.campaign_id || null,
    campaign_title: invitation.campaignTitle || invitation.campaign_title || invitation.title || 'Creative Commission',
    brand_name: invitation.brandName || invitation.brand_name || 'Brand Partner',
    creator_name: invitation.creatorName || invitation.creator_name || 'Creator',
    creator_avatar: invitation.creatorAvatar || invitation.creator_avatar || null,
    timeline: invitation.timeline || '3 Weeks',
    message: invitation.message || invitation.summary || '',
    status,
    is_demo: Boolean(invitation.isDemo ?? true),
    updated_at: new Date().toISOString()
  };

  return upsertRecord('invitations', payload);
}

// ============================================================================
// 10. MESSAGE SYNCHRONIZATION (Table: messages)
// ============================================================================
export async function syncMessageToDb(msg) {
  if (!msg || !msg.id) return null;

  const payload = {
    id: msg.id,
    conversation_id: msg.conversationId || msg.conversation_id || 'conn-general',
    sender: msg.sender === 'brand' ? 'brand' : 'creator',
    sender_name: msg.senderName || msg.sender_name || (msg.sender === 'brand' ? 'Brand' : 'Creator'),
    text: msg.text || '',
    created_at: msg.timestamp || msg.created_at || new Date().toISOString()
  };

  return upsertRecord('messages', payload);
}

// ============================================================================
// 11. VERIFICATION CLAIM SYNCHRONIZATION (Table: verification_claims)
// ============================================================================
export async function syncVerificationClaimToDb(claim) {
  if (!claim || !claim.id) return null;

  const payload = {
    id: claim.id,
    creator_id: claim.creatorId || claim.creator_id || 'maya-chen',
    claim_type: claim.claimType || claim.claim_type || 'identity',
    claim_title: claim.claimTitle || claim.claim_title || 'Verification Claim',
    status: claim.status || 'pending_review',
    evidence_type: claim.evidenceType || claim.evidence_type || 'url',
    evidence_url: claim.evidenceUrl || claim.evidence_url || null,
    evidence_details: claim.evidenceDetails || claim.evidence_details || {},
    is_private: Boolean(claim.isPrivate ?? false),
    reviewer_notes: claim.reviewerNotes || claim.reviewer_notes || null,
    reviewed_by: claim.reviewedBy || claim.reviewed_by || null,
    reviewed_at: claim.reviewedAt || claim.reviewed_at || null,
    updated_at: new Date().toISOString()
  };

  return upsertRecord('verification_claims', payload);
}
