// src/ai/semanticSearch.js
// Semantic natural-language creator discovery across Creator DNA and portfolio content

import { analyzeCreatorPortfolio } from './creatorAnalyzer.js';

export function semanticCreatorSearch(query = '', creators = []) {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: '',
      interpretedTokens: [],
      results: creators,
      count: creators.length
    };
  }

  const lower = trimmed.toLowerCase();

  // 1. Semantic Token & Concept Extraction
  const understood = [];
  if (lower.includes('luxury') || lower.includes('premium') || lower.includes('high-end')) understood.push('Luxury');
  if (lower.includes('fashion') || lower.includes('couture') || lower.includes('runway')) understood.push('Fashion');
  if (lower.includes('cinematic') || lower.includes('movie') || lower.includes('film')) understood.push('Cinematic');
  if (lower.includes('skincare') || lower.includes('beauty') || lower.includes('cosmetic')) understood.push('Beauty & Skincare');
  if (lower.includes('product') || lower.includes('commercial')) understood.push('Product Advertising');
  if (lower.includes('3d') || lower.includes('cgi') || lower.includes('spatial')) understood.push('3D');
  if (lower.includes('tech') || lower.includes('hardware') || lower.includes('watch')) understood.push('Technology');
  if (lower.includes('surreal') || lower.includes('dreamy') || lower.includes('dream')) understood.push('Surreal');
  if (lower.includes('editorial') || lower.includes('lookbook')) understood.push('Editorial');
  if (lower.includes('instagram') || lower.includes('reel') || lower.includes('social') || lower.includes('gen z')) understood.push('Instagram');
  if (lower.includes('minimal') || lower.includes('clean')) understood.push('Minimal');
  if (lower.includes('food') || lower.includes('culinary')) understood.push('Food & Beverage');

  // If no high-level concepts matched, use meaningful keywords
  if (understood.length === 0) {
    const rawWords = lower.replace(/[^a-z0-9 ]/g, '').split(' ')
      .filter(w => !['a', 'an', 'the', 'for', 'who', 'makes', 'want', 'i', 'with', 'and', 'someone', 'creator', 'good', 'at'].includes(w));
    rawWords.slice(0, 3).forEach(w => understood.push(w.charAt(0).toUpperCase() + w.slice(1)));
  }

  // 2. Score Each Creator
  const scored = creators.map((creator) => {
    let score = 0;
    const analysis = analyzeCreatorPortfolio(creator);

    const allMediaCaptions = [
      ...(creator.portfolioMedia || creator.portfolio_media || []).map(m => `${m.caption || ''} ${(m.tags || []).join(' ')}`),
      ...(creator.portfolioImages || creator.portfolio_images || []),
      ...(creator.portfolioVideos || creator.portfolio_videos || [])
    ].join(' ').toLowerCase();

    const searchableCorpus = [
      creator.name,
      creator.creativeIdentity,
      creator.bio,
      creator.specialty,
      ...(creator.styles || []),
      ...(creator.industries || []),
      ...(creator.capabilities || []),
      ...(creator.platforms || []),
      ...(creator.categoryTags || []),
      allMediaCaptions,
      ...(creator.projects || []).map(p => `${p.title} ${p.description || ''} ${p.creativeDirection || ''} ${p.category || ''} ${p.creativeStyle || ''}`)
    ].join(' ').toLowerCase();

    // Specific query domain matching evaluated dynamically across creator profile & portfolio
    const matchesDomain = (keywords) => {
      return keywords.some(kw => 
        searchableCorpus.includes(kw) ||
        (creator.categoryTags || []).some(t => t.toLowerCase().includes(kw)) ||
        (creator.styles || []).some(s => s.toLowerCase().includes(kw)) ||
        (creator.industries || []).some(ind => ind.toLowerCase().includes(kw))
      );
    };

    if (lower.includes('skincare') || lower.includes('beauty')) {
      if (matchesDomain(['skincare', 'beauty', 'cosmetics', 'serum', 'hydration', 'botanical', 'viscosity'])) score += 50;
    }

    if (lower.includes('fashion') || lower.includes('couture') || lower.includes('luxury')) {
      if (matchesDomain(['fashion', 'couture', 'luxury', 'apparel', 'silk', 'editorial', 'vogue'])) score += 50;
    }

    if (lower.includes('3d') || lower.includes('tech') || lower.includes('hardware')) {
      if (matchesDomain(['3d', 'tech', 'hardware', 'spatial', 'industrial', 'render', 'cgi'])) score += 50;
    }

    if (lower.includes('surreal')) {
      if (matchesDomain(['surreal', 'dream', 'ethereal', 'abstract', 'metaphysical'])) score += 45;
    }

    if (lower.includes('instagram') || lower.includes('gen z') || lower.includes('social') || lower.includes('reel')) {
      if (matchesDomain(['instagram', 'social', 'reel', 'tiktok', 'vertical', '9:16', 'short-form'])) score += 45;
    }

    if (lower.includes('cinematic')) {
      if (matchesDomain(['cinematic', 'film', 'anamorphic', '35mm', 'atmospheric', 'motion'])) score += 40;
    }

    // Token frequency score
    understood.forEach(tok => {
      const tokLower = tok.toLowerCase();
      if (searchableCorpus.includes(tokLower)) score += 15;
      if ((creator.styles || []).some(s => s.toLowerCase().includes(tokLower))) score += 20;
      if ((creator.capabilities || []).some(c => c.toLowerCase().includes(tokLower))) score += 20;
    });

    return {
      creator,
      score
    };
  });

  // Sort creators by score descending
  const sorted = scored
    .sort((a, b) => b.score - a.score)
    .filter(item => item.score > 10)
    .map(item => item.creator);

  // Fallback to all creators if query matched nothing at all
  const results = sorted.length > 0 ? sorted : [];

  return {
    query: trimmed,
    interpretedTokens: understood,
    results,
    count: results.length
  };
}

export const semanticSearchCreators = semanticCreatorSearch;
