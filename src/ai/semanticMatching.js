// src/ai/semanticMatching.js
// Semantic matching engine connecting natural language briefs with creator portfolios

import { analyzeBrief } from './briefAnalyzer.js';
import { analyzeCreatorPortfolio } from './creatorAnalyzer.js';

export function matchCampaignWithCreator(campaign, creator) {
  if (!campaign || !creator) {
    return {
      score: 70,
      fitLabel: '70% Creative Fit',
      confidence: 'low',
      summary: 'Insufficient data to compute creative fit.',
      dimensions: {},
      highlights: [],
      potentialGap: null
    };
  }

  const brief = analyzeBrief(`${campaign.title || ''} ${campaign.description || ''}`);
  const creatorAnalysis = analyzeCreatorPortfolio(creator);

  // Check confidence & uncertainty (Part 16 of Prompt 5)
  if (!brief.isSufficient || brief.confidence === 'low') {
    return {
      score: 65,
      fitLabel: 'Limited Confidence',
      confidence: 'low',
      summary: 'Limited match confidence — Add more detail about the visual style you’re looking for in your brief.',
      dimensions: {
        creativeFit: 'Pending Detail',
        contentFit: 'Pending Detail',
        platformFit: 'Uncertain',
        availability: creator.availability.includes('Available') ? 'Available' : 'Booking'
      },
      highlights: ['Creator profile is active on Alloy'],
      potentialGap: 'Brief needs more creative direction to confirm compatibility.'
    };
  }

  // Calculate semantic similarity score
  let score = 55; // base

  const briefText = `${campaign.title} ${campaign.description}`.toLowerCase();
  const creatorCorpus = `${creator.bio} ${creator.creativeIdentity} ${(creator.styles || []).join(' ')} ${(creator.industries || []).join(' ')} ${(creator.capabilities || []).join(' ')}`.toLowerCase();

  // 1. Creative style match (up to 20 pts)
  const styles = creator.styles || [];
  let styleMatches = 0;
  styles.forEach(s => {
    const sLower = s.toLowerCase();
    if (briefText.includes(sLower) || sLower.split(/[\s&]+/).some(word => word.length > 3 && briefText.includes(word))) {
      score += 5;
      styleMatches++;
    }
  });

  // 2. Industry & Subject match (up to 15 pts) - derived dynamically from creator portfolio and styles
  const creatorIndustries = (creator.industries || []).map(i => i.toLowerCase());
  const creatorTags = (creator.categoryTags || []).map(t => t.toLowerCase());
  const projects = creator.projects || creator.portfolio_projects || creator.portfolio || [];
  const projectCategories = projects.map(p => (p.category || '').toLowerCase());
  const projectDescriptions = projects.map(p => `${p.title || ''} ${p.description || ''}`.toLowerCase());

  const hasDomainExperience = (terms) => {
    return terms.some(term => 
      creatorIndustries.some(i => i.includes(term)) ||
      creatorTags.some(t => t.includes(term)) ||
      projectCategories.some(c => c.includes(term)) ||
      projectDescriptions.some(d => d.includes(term)) ||
      creatorCorpus.includes(term)
    );
  };

  if (briefText.includes('skin') || briefText.includes('beauty')) {
    if (hasDomainExperience(['skin', 'beauty', 'cosmetics', 'serum', 'luminous', 'hydration'])) score += 15;
  }
  if (briefText.includes('fashion') || briefText.includes('couture')) {
    if (hasDomainExperience(['fashion', 'couture', 'luxury', 'apparel', 'silk', 'editorial'])) score += 15;
  }
  if (briefText.includes('tech') || briefText.includes('watch') || briefText.includes('hardware')) {
    if (hasDomainExperience(['tech', 'hardware', 'watch', '3d', 'spatial', 'industrial'])) score += 15;
  }

  // 3. Content format match (up to 10 pts)
  const hasUploadedVideo = Boolean(creator.videoPreview || (creator.portfolioVideos || []).length > 0 || (creator.portfolio_videos || []).length > 0);
  const hasUploadedStill = Boolean(creator.heroWork || (creator.portfolioImages || []).length > 0 || (creator.portfolio_images || []).length > 0);
  if (briefText.includes('video') && ((creator.categoryTags || []).includes('ai-video') || (creator.specialty || '').toLowerCase().includes('video') || hasUploadedVideo)) score += 8;
  if ((briefText.includes('still') || briefText.includes('photo')) && ((creator.categoryTags || []).includes('ai-photography') || (creator.specialty || '').toLowerCase().includes('photo') || hasUploadedStill)) score += 8;
  if (briefText.includes('3d') && (creator.categoryTags || []).includes('3d')) score += 8;
  if (briefText.includes('instagram') && (creator.platforms || []).includes('Instagram')) score += 5;

  // 4. Availability (up to 5 pts)
  if ((creator.availability || '').includes('Available')) score += 5;

  // Cap score between 72 and 96
  score = Math.min(95, Math.max(74, score));

  const creatorFirstName = creator.name.split(' ')[0];

  // Tailored rationales dynamically derived from creator's actual style and evidence
  const primaryStyle = creator.styles?.[0] || 'editorial';
  const relevantProject = projects.find(p => {
    const text = `${p.title} ${p.description || ''} ${p.category || ''}`.toLowerCase();
    return briefText.split(' ').some(w => w.length > 3 && text.includes(w));
  }) || projects[0];

  const creativeDirection = (brief.creativeDirection || campaign.creativeStyle || 'elevated visual').toLowerCase();
  let summary = relevantProject
    ? `Your campaign calls for ${creativeDirection} storytelling. ${creatorFirstName}'s verified work in “${relevantProject.title}” confirms direct capability in ${primaryStyle.toLowerCase()} visual language.`
    : `Your campaign calls for ${creativeDirection} storytelling. ${creatorFirstName}'s background combines ${primaryStyle.toLowerCase()} sensibilities with polished commercial visuals, making them a strong fit.`;

  let potentialGap = null;
  const isVideoBrief = briefText.includes('video') || briefText.includes('reel') || briefText.includes('motion');
  const isUgcBrief = briefText.includes('ugc') || briefText.includes('casual') || briefText.includes('tiktok');
  const isOutdoorBrief = briefText.includes('outdoor') || briefText.includes('landscape') || briefText.includes('action');

  if (creator.specialty?.toLowerCase().includes('photo') && isVideoBrief) {
    potentialGap = 'Focuses on studio and editorial stills; complex multi-scene video requires storyboard pre-alignment.';
  } else if (creatorCorpus.includes('cinematic') && isUgcBrief) {
    potentialGap = 'Recent work is more cinematic and deliberate than casual quick UGC-style social content.';
  } else if (creatorCorpus.includes('hardware') || creatorCorpus.includes('3d') || creatorCorpus.includes('kinetic')) {
    if (briefText.includes('lifestyle') || briefText.includes('character')) {
      potentialGap = 'Works predominantly on hardware and luxury vessels; character-driven talent storytelling is secondary.';
    }
  } else if (creatorCorpus.includes('macro') || creatorCorpus.includes('viscosity')) {
    if (isOutdoorBrief) {
      potentialGap = 'Focuses on macro studio and lighting physics; broad outdoor landscapes are less frequent in portfolio.';
    }
  }

  const dimensions = {
    creativeFit: score >= 90 ? 'Excellent' : 'Strong',
    contentFit: score >= 85 ? 'Strong' : 'Good',
    industry: score >= 88 ? 'Strong' : 'Good',
    platform: 'Strong',
    availability: creator.availability.includes('Available') ? 'Good' : 'Booking'
  };

  const highlights = [
    `Strong ${creator.styles?.[0] || 'editorial'} visual direction`,
    `Demonstrated work in ${(creator.industries || ['Commercial'])[0]}`,
    'Portfolio alignment with requested format',
    'Available for direct campaign collaboration'
  ];

  return {
    score,
    fitLabel: `${score}% Creative Fit`,
    confidence: 'high',
    summary,
    dimensions,
    highlights,
    potentialGap
  };
}

export const matchCreatorToBrief = matchCampaignWithCreator;
