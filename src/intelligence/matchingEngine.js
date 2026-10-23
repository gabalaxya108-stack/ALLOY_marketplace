// src/intelligence/matchingEngine.js
// CreaMatch Deterministic Compatibility Scoring Engine
// Evaluates 6 transparent dimensions based on actual campaign requirements and creator portfolio evidence

import { generateCreatorDNA } from './creatorDNA.js';
import { extractCampaignDNA } from './campaignDNA.js';

/**
 * Calculates a deterministic, explainable CreaMatch compatibility score
 * Dimensions:
 * 1. Creative Style Alignment (25 pts)
 * 2. Portfolio Relevance & Evidence (25 pts)
 * 3. Content Format Compatibility (15 pts)
 * 4. Industry Experience Fit (15 pts)
 * 5. Platform Compatibility (10 pts)
 * 6. Availability & Budget Alignment (10 pts)
 */
export function calculateCreaMatch(campaign, creator) {
  if (!campaign || !creator) {
    return {
      score: 50,
      fitLabel: 'Insufficient Data',
      confidence: 'limited',
      breakdown: { styleScore: 0, portfolioScore: 0, formatScore: 0, industryScore: 0, platformScore: 0, availabilityScore: 0 },
      isSufficient: false,
      evidenceTier: 'none'
    };
  }

  const campaignDNA = extractCampaignDNA(campaign);
  const creatorDNA = generateCreatorDNA(creator);

  const cTitle = (campaign.title || '').toLowerCase();
  const cDesc = (campaign.description || '').toLowerCase();
  const cStyle = (campaign.creativeStyle || '').toLowerCase();
  const cInd = (campaign.industry || '').toLowerCase();
  const cFormats = `${campaign.contentFormats || ''} ${campaign.deliverables || ''}`.toLowerCase();
  const cPlatforms = `${campaign.platforms || ''}`.toLowerCase();
  const cFull = `${cTitle} ${cDesc} ${cStyle} ${cInd} ${cFormats} ${cPlatforms}`;

  const projects = Array.isArray(creator.projects) && creator.projects.length > 0
    ? creator.projects
    : (Array.isArray(creator.portfolio_projects) && creator.portfolio_projects.length > 0
      ? creator.portfolio_projects
      : (Array.isArray(creator.portfolio) ? creator.portfolio : []));

  const allMedia = [
    ...(creator.portfolio_media || creator.portfolioMedia || []),
    ...projects.flatMap(p => p.media || [])
  ];

  const allImages = [
    creator.heroWork,
    creator.hero_work,
    ...(creator.portfolio_images || []),
    ...(creator.portfolioImages || []),
    ...projects.map(p => p.image)
  ].filter(Boolean);

  const allVideos = [
    creator.videoPreview,
    creator.video_preview,
    ...(creator.portfolio_videos || []),
    ...(creator.portfolioVideos || []),
    ...projects.map(p => p.video),
    ...allMedia.filter(m => m.mediaType === 'video' || m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov)(\?.*)?$/i.test(m.url || '')).map(m => m.url)
  ].filter(Boolean);

  // Creative styles from creator profile and uploaded portfolio projects
  const projectStyles = projects.flatMap(p => [
    p.creativeStyle,
    p.creative_style,
    p.category,
    p.creativeDirection,
    p.creative_direction
  ]).filter(Boolean).map(s => s.toLowerCase());

  const creatorStyles = Array.from(new Set([
    ...(creator.styles || []).map(s => s.toLowerCase()),
    ...projectStyles
  ]));

  const creatorIndustries = (creator.industries || []).map(i => i.toLowerCase());
  const creatorTags = (creator.categoryTags || []).map(t => t.toLowerCase());
  const creatorCaps = (creator.capabilities || []).map(c => c.toLowerCase());
  const creatorBio = (creator.bio || '').toLowerCase();
  const creatorSpecialty = (creator.specialty || '').toLowerCase();

  // ========================================================
  // DIMENSION 1: CREATIVE STYLE ALIGNMENT (25 pts)
  // ========================================================
  let styleScore = 5; // base

  // Style taxonomy checks
  const styleKeywords = [
    { key: 'cinematic', match: ['cinematic', '35mm', 'anamorphic', 'film', 'wong kar-wai', 'atmospheric', 'story-driven'] },
    { key: 'moody', match: ['moody', 'dark', 'shadow', 'contrast', 'noir', 'high-contrast', 'atmospheric'] },
    { key: 'minimal', match: ['minimal', 'clean', 'scandinavian', 'pure', 'restraint', 'editorial'] },
    { key: 'luminous', match: ['luminous', 'radiant', 'light', 'dewy', 'caustics', 'refraction', 'glow', 'sunlit'] },
    { key: 'macro', match: ['macro', 'micro', 'texture', 'viscosity', 'droplet', 'close-up', 'detail'] },
    { key: 'industrial', match: ['industrial', 'precision', 'hardware', 'metallic', 'titanium', 'machined', 'engineering'] },
    { key: 'botanical', match: ['botanical', 'organic', 'nature', 'flora', 'herbal', 'natural'] },
    { key: 'surreal', match: ['surreal', 'dream', 'ethereal', 'abstract', 'metaphysical'] },
    { key: 'editorial', match: ['editorial', 'fashion', 'couture', 'high fashion', 'vogue'] },
    { key: 'playful', match: ['playful', 'pop', 'kinetic', 'vibrant', 'fun', 'energetic'] }
  ];

  let matchedStyleCount = 0;
  styleKeywords.forEach(({ key, match }) => {
    const briefHasKey = match.some(m => cFull.includes(m));
    if (briefHasKey) {
      const creatorHasKey = match.some(m => 
        creatorStyles.some(s => s.includes(m)) ||
        creatorBio.includes(m) ||
        creatorCaps.some(c => c.includes(m)) ||
        creatorSpecialty.includes(m)
      );
      if (creatorHasKey) {
        matchedStyleCount++;
      }
    }
  });

  // Direct creator.styles exact match in campaign
  let directStyleMatches = 0;
  creatorStyles.forEach(s => {
    if (cFull.includes(s)) directStyleMatches++;
  });

  styleScore += (matchedStyleCount * 4.5) + (directStyleMatches * 3.0);
  styleScore = Math.min(25, Math.max(6, Math.round(styleScore)));

  // ========================================================
  // DIMENSION 2: PORTFOLIO RELEVANCE & EVIDENCE (25 pts)
  // Evaluates uploaded visual assets and projects
  // ========================================================
  let portfolioScore = 0;
  let evidenceTier = 'verified';

  const totalVerifiedAssets = projects.length + (allVideos.length > 0 ? 1 : 0) + (allImages.length > 0 ? 1 : 0);

  if (projects.length === 0 && allImages.length === 0 && allVideos.length === 0) {
    portfolioScore = 3; // Strict penalty for empty portfolio
    evidenceTier = 'sparse';
  } else if (projects.length <= 1 && totalVerifiedAssets <= 1) {
    portfolioScore = 6;
    evidenceTier = 'limited';
  } else {
    portfolioScore = 8; // Verified multi-project portfolio baseline
    evidenceTier = 'verified';
  }

  const wantsVideo = cFormats.includes('video') || cFormats.includes('loop') || cFormats.includes('motion') || cFormats.includes('reel');
  const wantsStill = cFormats.includes('still') || cFormats.includes('photo') || cFormats.includes('suite') || cFormats.includes('asset') || cFormats.includes('key art') || cFormats.includes('image');

  // Direct media bonus: rewards creators who uploaded the exact media format requested by the brand
  if (wantsVideo && allVideos.length > 0) {
    portfolioScore += 3.0;
  }
  if (wantsStill && allImages.length > 0) {
    portfolioScore += 2.0;
  }

  if (projects.length > 0) {
    let relevantProjectCount = 0;
    let highRelevanceCount = 0;

    projects.forEach(p => {
      const pText = `${p.title} ${p.description || ''} ${p.category || ''} ${p.creativeStyle || ''} ${p.creative_style || ''} ${p.creativeDirection || ''} ${p.clientType || ''} ${(p.capabilities || []).join(' ')}`.toLowerCase();
      
      let pMatches = 0;
      if (cInd && (pText.includes(cInd.split(' ')[0]) || pText.includes(cInd.split('&')[0]?.trim()))) pMatches += 2;
      if (cStyle && cStyle.split(',').some(s => pText.includes(s.trim()))) pMatches += 2;
      
      const domainTerms = ['skincare', 'beauty', 'serum', 'hydration', 'cosmetic', 'audio', 'headphone', 'watch', 'hardware', 'tech', 'fashion', 'silk', 'couture', 'beverage'];
      domainTerms.forEach(term => {
        if (cFull.includes(term) && pText.includes(term)) pMatches += 2;
      });

      if (pMatches >= 3) {
        highRelevanceCount++;
      } else if (pMatches >= 1) {
        relevantProjectCount++;
      }
    });

    const projectBonus = (highRelevanceCount * 6.5) + (relevantProjectCount * 3.5);
    portfolioScore += projectBonus;
  }

  portfolioScore = Math.min(25, Math.max(3, Math.round(portfolioScore)));

  // ========================================================
  // DIMENSION 3: CONTENT FORMAT COMPATIBILITY (15 pts)
  // Verifies format against both profile tags and uploaded media assets
  // ========================================================
  let formatScore = 5;

  const wants3D = cFormats.includes('3d') || cFormats.includes('spatial') || cFormats.includes('cgi') || cFormats.includes('render');

  const creatorHasVideo = creatorTags.includes('ai-video') || 
                          creatorTags.includes('motion') || 
                          creatorSpecialty.includes('video') || 
                          creatorSpecialty.includes('motion') ||
                          allVideos.length > 0 ||
                          projects.some(p => Boolean(p.video) || (p.format || '').toLowerCase().includes('video') || (p.format || '').toLowerCase().includes('motion'));

  const creatorHasStill = creatorTags.includes('ai-photography') || 
                          creatorTags.includes('product-visuals') || 
                          creatorSpecialty.includes('photography') || 
                          creatorSpecialty.includes('product') ||
                          allImages.length > 0 ||
                          projects.some(p => Boolean(p.image) || (p.format || '').toLowerCase().includes('still') || (p.format || '').toLowerCase().includes('photo'));

  const creatorHas3D = creatorTags.includes('3d') || creatorSpecialty.includes('3d') || creatorCaps.some(c => c.includes('3d'));

  if (wantsVideo && creatorHasVideo) formatScore += 4;
  if (wantsStill && creatorHasStill) formatScore += 3.5;
  if (wants3D && creatorHas3D) formatScore += 3.5;

  // Bonus if creator specializes in exact requested format combination
  if ((wantsVideo && wantsStill) && (creatorHasVideo && creatorHasStill)) {
    formatScore += 2;
  }

  formatScore = Math.min(15, Math.max(4, Math.round(formatScore)));

  // ========================================================
  // DIMENSION 4: INDUSTRY EXPERIENCE FIT (15 pts)
  // ========================================================
  let industryScore = 3;

  const directIndustryMatch = creatorIndustries.some(ind => {
    const key = ind.toLowerCase().split(' ')[0];
    return cInd.includes(key) || cFull.includes(key);
  });

  if (directIndustryMatch) {
    industryScore += 7;
  }

  // Check client types in past projects
  const hasClientMatch = projects.some(p => {
    const client = (p.clientType || '').toLowerCase();
    return cInd.split(' ')[0] && client.includes(cInd.split(' ')[0]);
  });

  if (hasClientMatch) {
    industryScore += 4;
  }

  // Secondary tag match
  if (creatorTags.some(t => cInd.includes(t) || cFull.includes(t))) {
    industryScore += 2;
  }

  industryScore = Math.min(15, Math.max(3, Math.round(industryScore)));

  // ========================================================
  // DIMENSION 5: PLATFORM COMPATIBILITY (10 pts)
  // ========================================================
  let platformScore = 3;
  const creatorPlatforms = (creator.platforms || []).map(p => p.toLowerCase());

  let platformMatches = 0;
  creatorPlatforms.forEach(pl => {
    const pWord = pl.split(' ')[0];
    if (cPlatforms.includes(pWord) || cFull.includes(pWord)) {
      platformMatches++;
    }
  });

  platformScore += platformMatches * 3.5;
  platformScore = Math.min(10, Math.max(3, Math.round(platformScore)));

  // ========================================================
  // DIMENSION 6: AVAILABILITY & BUDGET ALIGNMENT (10 pts)
  // ========================================================
  let availabilityScore = 2;
  const avail = (creator.availability || creator.statusBadge || '').toLowerCase();
  if (avail.includes('available')) {
    availabilityScore = 5;
  } else if (avail.includes('open') || avail.includes('booking') || avail.includes('q4')) {
    availabilityScore = 3.5;
  }

  let budgetScore = 4; // base market calibration
  if (campaign.budget) {
    budgetScore = 5; // confirmed alignment
  }

  const availabilityBudgetTotal = Math.min(10, availabilityScore + budgetScore);

  // ========================================================
  // COMPOSITE COMPATIBILITY CALCULATION
  // ========================================================
  const rawTotal = Math.round(styleScore + portfolioScore + formatScore + industryScore + platformScore + availabilityBudgetTotal);

  // Evidence confidence evaluation
  const isLimitedEvidence = projects.length === 0 || (projects.length <= 1 && totalVerifiedAssets <= 1);
  const confidence = isLimitedEvidence ? 'limited' : rawTotal >= 85 ? 'high' : 'medium';

  let fitLabel = `${rawTotal}% Creative Fit`;
  if (isLimitedEvidence) {
    fitLabel = `${rawTotal}% (Limited Evidence)`;
  } else if (rawTotal >= 90) {
    fitLabel = `${rawTotal}% Outstanding Fit`;
  } else if (rawTotal >= 80) {
    fitLabel = `${rawTotal}% Strong Fit`;
  } else {
    fitLabel = `${rawTotal}% Moderate Fit`;
  }

  return {
    score: rawTotal,
    fitLabel,
    confidence,
    isSufficient: !isLimitedEvidence,
    evidenceTier,
    breakdown: {
      styleScore,
      portfolioScore,
      formatScore,
      industryScore,
      platformScore,
      availabilityScore: Math.round(availabilityBudgetTotal)
    }
  };
}
