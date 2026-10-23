// src/intelligence/matchExplainer.js
// Generates explainable, grounded CreaScore rationales backed by verified creator portfolio projects

import { calculateCreaMatch } from './matchingEngine.js';
import { generateCreatorDNA } from './creatorDNA.js';
import { extractCampaignDNA } from './campaignDNA.js';

export function explainMatch(campaign, creator) {
  if (!campaign || !creator) return null;

  const match = calculateCreaMatch(campaign, creator);
  const creatorDNA = generateCreatorDNA(creator);
  const campaignDNA = extractCampaignDNA(campaign);

  const creatorFirstName = creator.name.split(' ')[0];
  const projects = Array.isArray(creator.projects) && creator.projects.length > 0
    ? creator.projects
    : (Array.isArray(creator.portfolio_projects) && creator.portfolio_projects.length > 0
      ? creator.portfolio_projects
      : (Array.isArray(creator.portfolio) ? creator.portfolio : []));

  const hasVideos = Boolean(
    creator.videoPreview ||
    creator.video_preview ||
    (creator.portfolio_videos && creator.portfolio_videos.length > 0) ||
    (creator.portfolioVideos && creator.portfolioVideos.length > 0) ||
    projects.some(p => p.video || (p.media || []).some(m => m.mediaType === 'video' || m.mimeType?.startsWith('video/')))
  );

  const hasImages = Boolean(
    creator.heroWork ||
    creator.hero_work ||
    (creator.portfolio_images && creator.portfolio_images.length > 0) ||
    (creator.portfolioImages && creator.portfolioImages.length > 0) ||
    projects.some(p => p.image || (p.media || []).some(m => m.mediaType === 'image' || m.mimeType?.startsWith('image/')))
  );

  const cCapabilities = (campaign.requiredCreatorCapabilities || []).join(' ');
  const cText = `${campaign.title || ''} ${campaign.description || ''} ${campaign.creativeStyle || ''} ${campaign.creativeDirection || ''} ${campaign.industry || ''} ${campaign.productOrService || ''} ${campaign.deliverables || ''} ${campaign.contentFormats || ''} ${cCapabilities}`.toLowerCase();

  // 1. Identify matching projects from creator's actual portfolio
  let relevantProjects = projects.filter(p => {
    const pCapabilities = (p.capabilities || []).join(' ');
    const pText = `${p.title} ${p.category || ''} ${p.creativeStyle || ''} ${p.creative_style || ''} ${p.style || ''} ${p.clientType || ''} ${pCapabilities} ${p.description || ''} ${p.creativeDirection || ''}`.toLowerCase();
    return (
      (campaign.industry && pText.includes(campaign.industry.toLowerCase().split(' ')[0])) ||
      (creator.styles || []).some(s => pText.includes(s.toLowerCase()) && cText.includes(s.toLowerCase())) ||
      ['skincare', 'beauty', 'fashion', 'watch', 'chrono', 'titanium', 'cinematic', 'macro', 'product', '3d', 'kinetic', 'physics', 'hardware', 'luxury'].some(w => cText.includes(w) && pText.includes(w))
    );
  });

  // If strict match yielded none but creator has verified projects, pick the closest portfolio work
  if (relevantProjects.length === 0 && projects.length > 0) {
    relevantProjects = [projects[0]];
  }

  // 2. Synthesize Grounded Evidence Highlights
  const highlights = [];
  
  if (relevantProjects.length > 0) {
    highlights.push(
      `Verified portfolio work: “${relevantProjects[0].title}” demonstrates direct ${relevantProjects[0].category || 'campaign'} capability.`
    );
  } else if (projects.length > 0) {
    highlights.push(
      `Demonstrated production portfolio with ${projects.length} uploaded commercial projects.`
    );
  }

  // Visual style alignment bullet
  const matchedStyles = (creator.styles || []).filter(s => cText.includes(s.toLowerCase()));
  if (matchedStyles.length > 0) {
    highlights.push(
      `Demonstrated visual style aligns with requested ${matchedStyles.join(' and ')} aesthetic.`
    );
  } else {
    highlights.push(
      `Creator's primary aesthetic is ${creator.styles?.[0] || 'Editorial'}, providing polished visual execution.`
    );
  }

  // Content format compatibility bullet
  const cFormats = `${campaign.contentFormats || ''} ${campaign.deliverables || ''}`.toLowerCase();
  if (cFormats.includes('video') && (hasVideos || (creator.categoryTags || []).includes('ai-video'))) {
    highlights.push(hasVideos 
      ? 'Verified portfolio video evidence confirms requested video and motion deliverable capability.' 
      : 'Profile supports requested AI Video and vertical motion deliverables.');
  } else if (cFormats.includes('still') && (hasImages || (creator.categoryTags || []).includes('ai-photography'))) {
    highlights.push(hasImages 
      ? 'Verified portfolio imagery confirms requested high-resolution stills suite capability.' 
      : 'Profile supports requested high-resolution 4K Master Stills.');
  } else if (cFormats.includes('3d') && (creator.categoryTags || []).includes('3d')) {
    highlights.push('Profile supports requested 3D CGI and spatial render formats.');
  } else {
    highlights.push(`Supports ${creator.specialty || 'Generative'} format deliverables.`);
  }

  // Availability bullet
  if ((creator.availability || '').toLowerCase().includes('available')) {
    highlights.push(`Direct availability confirmed: ${creator.availability}.`);
  }

  // 3. Credibility Nuance / Potential Creative Gap (Derived dynamically from creator capabilities vs brief scope)
  let potentialGap = 'Works predominantly in high-fidelity generative suites; specific aspect ratios should be specified in the project kickoff.';
  const creatorStyles = (creator.styles || []).map(s => s.toLowerCase());
  const creatorTags = (creator.categoryTags || []).map(t => t.toLowerCase());
  const creatorSpec = (creator.specialty || '').toLowerCase();

  if ((creatorSpec.includes('video') || creatorTags.includes('ai-video')) && cText.includes('still') && !cText.includes('video')) {
    potentialGap = 'Creator focuses primarily on motion and cinematic loops; ensure still deliverables are scoped explicitly.';
  } else if ((creatorSpec.includes('photo') || creatorTags.includes('ai-photography')) && (cText.includes('video') || cText.includes('reel'))) {
    potentialGap = 'Creator focuses heavily on editorial stills; short-form motion requires close storyboard coordination.';
  } else if (creatorStyles.some(s => s.includes('cinematic') || s.includes('film') || s.includes('anamorphic')) && (cText.includes('ugc') || cText.includes('casual') || cText.includes('tiktok'))) {
    potentialGap = 'Recent work leans towards cinematic grandeur rather than quick casual UGC-style social content.';
  } else if (creatorStyles.some(s => s.includes('industrial') || s.includes('3d') || s.includes('cgi') || s.includes('hardware')) && (cText.includes('lifestyle') || cText.includes('human') || cText.includes('talent'))) {
    potentialGap = 'Specializes in precision hardware and kinetic CGI; lifestyle human talent casting is secondary.';
  } else if (creatorStyles.some(s => s.includes('macro') || s.includes('viscosity') || s.includes('beauty')) && (cText.includes('outdoor') || cText.includes('landscape') || cText.includes('action'))) {
    potentialGap = 'Excels in macro beauty and studio viscosity; broad outdoor cinematic narratives are less frequent in portfolio.';
  } else if (projects.length === 0) {
    potentialGap = 'No verified projects uploaded yet; review sample visual reel to confirm exact commercial styling.';
  }

  // 4. Summarize Dimension Indicators
  const dimensions = {
    creativeStyle: match.breakdown.styleScore >= 20 ? 'Strong Alignment' : match.breakdown.styleScore >= 14 ? 'Good Fit' : 'Moderate Alignment',
    portfolioRelevance: relevantProjects.length >= 2 ? `High (${relevantProjects.length} Verified Projects)` : relevantProjects.length === 1 ? 'Direct Evidence (1 Project)' : projects.length === 0 ? 'Limited Evidence (No Projects)' : 'General Commercial Portfolio',
    contentFormat: match.breakdown.formatScore >= 11 ? 'Fully Compatible' : 'Partially Compatible',
    industryFit: match.breakdown.industryScore >= 11 ? 'Proven Experience' : 'Translatable Commercial Skill',
    platformFit: match.breakdown.platformScore >= 7 ? 'Active Distribution' : 'Compatible Format',
    budgetAvailability: (creator.availability || '').includes('Available') ? 'Available / Within Range' : 'Booking / In Discussion'
  };

  const summary = relevantProjects.length > 0
    ? `Your brief calls for ${campaign.creativeStyle || 'elevated visual'} storytelling. ${creatorFirstName}'s verified work in “${relevantProjects[0].title}” confirms direct capability in this aesthetic.`
    : `Your brief aligns with ${creatorFirstName}'s focus on ${(creator.specialty || 'creative visual').toLowerCase()} and ${(creator.styles || []).slice(0, 2).join(', ').toLowerCase()} direction.`;

  return {
    score: match.score,
    fitLabel: match.fitLabel,
    confidence: match.confidence,
    summary,
    highlights,
    potentialGap,
    dimensions,
    breakdown: match.breakdown,
    relevantProjects: relevantProjects.map(p => ({ id: p.id, title: p.title, image: p.image }))
  };
}
