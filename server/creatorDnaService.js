// server/creatorDnaService.js
// ALLOY / CREASYNC — Production-Oriented Dynamic Creator DNA Backend Service
// Extracts visual & creative features from actual published portfolio works,
// aggregates evidence mathematically, and selects genuine, distinctive traits per creator.

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig, fetchSupabaseCreators } from './supabaseCreators.js';
import { CREATORS } from '../src/data/creatorsData.js';
import { isGroqConfigured, callGroqChat } from './groqService.js';

// ============================================================================
// 1. EXTENSIBLE VISUAL & CREATIVE FEATURE TAXONOMY
// ============================================================================
export const DNA_TRAIT_TAXONOMY = [
  // --- CATEGORY: LIGHTING & OPTICS ---
  {
    key: 'cinematic_anamorphic_lighting',
    label: 'Cinematic Anamorphic Lighting',
    category: 'Lighting & Optics',
    color: 'var(--accent-lavender-deep)',
    matchTerms: [
      'anamorphic', 'cooke', 'cinematic', 'streak', 'lens flare', 'bokeh',
      'volumetric light', 'shaft', 'dust motes', 'halation', 'wong kar-wai'
    ]
  },
  {
    key: 'volumetric_sunlight_caustics',
    label: 'Volumetric Sunlight & Organic Caustics',
    category: 'Lighting & Optics',
    color: 'var(--accent-mint-deep)',
    matchTerms: [
      'caustic', 'sunlight', 'sunbeam', 'refraction', 'golden hour',
      'dappled light', 'botanical glass', 'solarium', 'underwater light', 'radiant'
    ]
  },
  {
    key: 'chiaroscuro_rim_lighting',
    label: 'Chiaroscuro & Specular Rim Lighting',
    category: 'Lighting & Optics',
    color: '#F59E0B',
    matchTerms: [
      'chiaroscuro', 'rim light', 'edge light', 'high contrast', 'noir',
      'specular', 'dark studio', 'shadow', 'silhouette', 'moody lighting'
    ]
  },
  {
    key: 'soft_diffuse_daylight',
    label: 'Soft Diffuse Daylight & High-Key Fill',
    category: 'Lighting & Optics',
    color: '#38BDF8',
    matchTerms: [
      'diffuse', 'soft light', 'high-key', 'cloudy day', 'daylight',
      'scandinavian light', 'clean studio', 'shadowless', 'ambient glow'
    ]
  },
  {
    key: 'atmospheric_tungsten_haze',
    label: 'Atmospheric Tungsten & Warm Haze',
    category: 'Lighting & Optics',
    color: 'var(--accent-peach-deep)',
    matchTerms: [
      'tungsten', 'warm haze', 'smoke', 'amber', 'interior night',
      'incandescent', 'lantern', 'dusk', 'warm glow', 'sunset'
    ]
  },
  {
    key: 'prismatic_luminescence',
    label: 'Pristine Luminescence & Prismatic Dispersion',
    category: 'Lighting & Optics',
    color: '#C084FC',
    matchTerms: [
      'luminescence', 'prismatic', 'chromatic dispersion', 'dispersion',
      'refractive', 'crystal', 'iridescent', 'caustics', 'spectral'
    ]
  },

  // --- CATEGORY: COMPOSITION & FRAMING ---
  {
    key: 'macro_fluid_physics',
    label: 'Macro Fluid Dynamics & Viscosity',
    category: 'Composition & Framing',
    color: '#06B6D4',
    matchTerms: [
      'fluid', 'viscosity', 'droplet', 'liquid', 'splash', 'emulsion',
      'serum', 'bead', 'flow physics', 'water tension', 'gel'
    ]
  },
  {
    key: 'extreme_macro_details',
    label: 'Extreme Macro & Micro-Surface Physics',
    category: 'Composition & Framing',
    color: '#64748B',
    matchTerms: [
      'macro', 'micro', 'cellular', 'close-up', 'extreme close up',
      'pore', 'fiber', 'micro-machining', 'nanoscale', 'micro-texture'
    ]
  },
  {
    key: 'architectural_symmetry',
    label: 'Monumental Architectural Symmetry',
    category: 'Composition & Framing',
    color: '#6366F1',
    matchTerms: [
      'monumental', 'architecture', 'symmetrical', 'brutalist', 'monolith',
      'perspective', 'grid', 'facade', 'structure', 'geometry', 'interior'
    ]
  },
  {
    key: 'zero_gravity_levitation',
    label: 'Zero-Gravity Levitation & Exploded Views',
    category: 'Composition & Framing',
    color: '#EC4899',
    matchTerms: [
      'zero-gravity', 'levitation', 'floating', 'exploded view', 'disassembly',
      'magnetic suspension', 'anti-gravity', 'kinetic mechanical', 'airborne'
    ]
  },
  {
    key: 'editorial_wide_tableau',
    label: 'Editorial Wide-Angle Cinematic Tableau',
    category: 'Composition & Framing',
    color: '#8B5CF6',
    matchTerms: [
      'wide-angle', 'tableau', 'editorial spread', 'panoramic', 'landscape',
      'vista', 'environmental portrait', 'scale', 'epic scope'
    ]
  },

  // --- CATEGORY: TEXTURE, MATERIALITY & CRAFT ---
  {
    key: 'analog_35mm_grain',
    label: '35mm Film Grain & Organic Caustics',
    category: 'Texture, Materiality & Craft',
    color: 'var(--accent-mint-deep)',
    matchTerms: [
      '35mm', 'grain', 'film grain', 'kodak', 'fuji', 'organic texture',
      'analogue', 'chemical', 'silver halide', 'emulsion film'
    ]
  },
  {
    key: 'haute_couture_textiles',
    label: 'High-Fashion Haute Couture Textile Physics',
    category: 'Texture, Materiality & Craft',
    color: 'var(--accent-peach-deep)',
    matchTerms: [
      'couture', 'silk', 'fabric', 'pleat', 'drapery', 'draping',
      'textile', 'chiffon', 'velvet', 'garment', 'fashion', 'runway', 'sewing'
    ]
  },
  {
    key: 'anodized_matte_finishes',
    label: 'Machined Titanium & Anodized Matte Surfaces',
    category: 'Texture, Materiality & Craft',
    color: '#64748B',
    matchTerms: [
      'titanium', 'anodized', 'matte', 'aluminum', 'brushed metal',
      'machined', 'bezel', 'hardware', 'metallic', 'precision engineering'
    ]
  },
  {
    key: 'crystalline_ice_glass',
    label: 'Crystalline Ice & Frosted Botanical Refraction',
    category: 'Texture, Materiality & Craft',
    color: '#0EA5E9',
    matchTerms: [
      'ice', 'frost', 'condensation', 'crystalline', 'shards',
      'frozen', 'botanical spirits', 'chilled', 'glass', 'sub-zero'
    ]
  },
  {
    key: 'monochromatic_industrial',
    label: 'Monochromatic Industrial Precision',
    category: 'Texture, Materiality & Craft',
    color: '#475569',
    matchTerms: [
      'monochromatic', 'industrial', 'minimalist', 'clean lines',
      'silicon', 'circuit', 'semiconductor', 'quantum', 'tech key art'
    ]
  },

  // --- CATEGORY: STORYTELLING, MOTION & ATMOSPHERE ---
  {
    key: 'story_driven_narrative',
    label: 'Story-Driven Narrative Atmosphere',
    category: 'Storytelling, Motion & Atmosphere',
    color: 'var(--accent-peach-deep)',
    matchTerms: [
      'narrative', 'story-driven', 'storytelling', 'odyssey', 'character',
      'brand film', 'cinematic journey', 'mythology', 'commercial narrative'
    ]
  },
  {
    key: 'kinetic_velocity_motion',
    label: 'High-Tempo Kinetic Motion & Parallax',
    category: 'Storytelling, Motion & Atmosphere',
    color: '#EF4444',
    matchTerms: [
      'kinetic', 'velocity', 'high-speed', 'dynamic camera', 'tracking shot',
      'parallax', 'temporal interpolation', 'motion brush', 'speed'
    ]
  },
  {
    key: 'slow_burn_worldbuilding',
    label: 'Slow-Burn Atmospheric Worldbuilding',
    category: 'Storytelling, Motion & Atmosphere',
    color: 'var(--accent-lavender-deep)',
    matchTerms: [
      'worldbuilding', 'slow-burn', 'atmospheric', 'contemplative',
      'scale', 'epic', 'immersive universe', 'ethereal', 'poetic'
    ]
  },
  {
    key: 'sensory_tactile_reveal',
    label: 'Sensory Tactile Reveal & Product Focus',
    category: 'Storytelling, Motion & Atmosphere',
    color: '#10B981',
    matchTerms: [
      'sensory', 'tactile', 'product reveal', 'tabletop', 'commercial stills',
      'haptic', 'materiality', 'touch', 'packaging reveal'
    ]
  }
];

// In-memory runtime persistence store for offline/local environments & test isolation
export const dnaAnalysesStore = new Map();
export const dnaTraitsStore = new Map();
export const dnaEvidenceStore = new Map();

// Helper to normalize strings
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().replace(/[-_/]/g, ' ').trim();
}

/**
 * 2. SELECT ELIGIBLE PORTFOLIO ASSETS
 * Filters to published, non-deleted commercial works belonging to the creator.
 * Deduplicates identical or repeated uploads.
 */
export function selectEligiblePortfolioAssets(creator) {
  if (!creator) return { eligible: false, count: 0, assets: [], reason: 'No creator data provided.' };

  const rawProjects = Array.isArray(creator.projects) && creator.projects.length > 0
    ? creator.projects
    : (Array.isArray(creator.portfolio_projects) && creator.portfolio_projects.length > 0
      ? creator.portfolio_projects
      : (Array.isArray(creator.portfolio) ? creator.portfolio : []));

  // Filter 1: Published status & active availability
  const publishedProjects = rawProjects.filter(p => {
    if (!p) return false;
    if (p.visibility && p.visibility === 'private') return false;
    if (p.status && (p.status === 'draft' || p.status === 'deleted')) return false;
    return Boolean(p.title && (p.image || p.video || (p.media && p.media.length > 0)));
  });

  // Filter 2: Deduplicate by media URL and title to prevent identical uploads from skewing statistics
  const seenMedia = new Set();
  const seenTitles = new Set();
  const deduplicatedAssets = [];

  for (const proj of publishedProjects) {
    const rawMedia = proj.image || proj.video || (proj.media && proj.media[0]?.url) || '';
    const cleanMedia = rawMedia ? rawMedia.split('?')[0].trim().toLowerCase() : '';
    const cleanTitle = normalizeText(proj.title);

    // If this identical media asset has already been processed, skip duplicate upload
    if (cleanMedia && seenMedia.has(cleanMedia)) {
      continue;
    }
    // If this exact project title with no distinct media has already been processed, skip
    if (cleanTitle && seenTitles.has(cleanTitle)) {
      continue;
    }

    if (cleanMedia) seenMedia.add(cleanMedia);
    if (cleanTitle) seenTitles.add(cleanTitle);

    deduplicatedAssets.push({
      id: proj.id || `proj_${deduplicatedAssets.length + 1}`,
      title: proj.title,
      description: proj.description || '',
      creativeDirection: proj.creativeDirection || '',
      category: proj.category || '',
      style: proj.style || proj.creativeStyle || '',
      tools: proj.tools || '',
      capabilities: Array.isArray(proj.capabilities) ? proj.capabilities : [],
      clientType: proj.clientType || '',
      aspect: proj.aspect || '16:9',
      image: proj.image,
      video: proj.video,
      media: Array.isArray(proj.media) ? proj.media : [],
      workflowStages: Array.isArray(proj.workflowStages) ? proj.workflowStages : []
    });
  }

  const count = deduplicatedAssets.length;
  // A minimum of 2 published works is required to identify recurring craft patterns
  const eligible = count >= 2;
  const reason = eligible
    ? `Identified ${count} published portfolio works eligible for DNA analysis.`
    : (count === 1
        ? 'A single portfolio work is insufficient to detect recurring stylistic patterns. Publish at least 2 works to unlock your Creator DNA.'
        : 'No published commercial portfolio assets found. Publish works in your studio to generate your Creator DNA.');

  return {
    eligible,
    count,
    assets: deduplicatedAssets,
    reason
  };
}

/**
 * 3. EXTRACT VISUAL & CREATIVE FEATURES PER ASSET
 * Extracts structured traits with evidence strengths (0.0 to 1.0).
 */
export function extractAssetFeatures(asset, creator = null) {
  const detectedTraits = [];

  // Construct combined evidence text from asset
  const workflowNotes = (asset.workflowStages || []).map(s => `${s.title || ''} ${s.description || ''} ${s.processNotes || ''}`).join(' ');
  const corpus = normalizeText(`
    ${asset.title} 
    ${asset.description} 
    ${asset.creativeDirection} 
    ${asset.category} 
    ${asset.style} 
    ${asset.tools} 
    ${asset.capabilities.join(' ')} 
    ${asset.clientType} 
    ${workflowNotes}
  `);

  // Media flags
  const isVideo = Boolean(asset.video || (asset.media || []).some(m => m.mediaType === 'video' || (m.mimeType && m.mimeType.startsWith('video/'))));
  const isSquareOrPortrait = asset.aspect === 'portrait' || asset.aspect === 'square';

  for (const trait of DNA_TRAIT_TAXONOMY) {
    let matchScore = 0;
    let matchedKeywords = [];

    // Keyword match testing
    for (const term of trait.matchTerms) {
      if (corpus.includes(term)) {
        matchScore += 0.35;
        matchedKeywords.push(term);
      }
    }

    // Contextual amplification based on asset structure
    if (trait.key === 'kinetic_velocity_motion' && isVideo) {
      matchScore += 0.30;
      matchedKeywords.push('video-format');
    }
    if (trait.key === 'macro_fluid_physics' && (corpus.includes('fluid') || corpus.includes('droplet') || corpus.includes('viscosity'))) {
      matchScore += 0.25;
    }
    if (trait.key === 'haute_couture_textiles' && (corpus.includes('fashion') || corpus.includes('couture') || corpus.includes('silk'))) {
      matchScore += 0.25;
    }
    if (trait.key === 'anodized_matte_finishes' && (corpus.includes('titanium') || corpus.includes('watch') || corpus.includes('hardware'))) {
      matchScore += 0.25;
    }
    if (trait.key === 'cinematic_anamorphic_lighting' && (corpus.includes('cinematic') || corpus.includes('anamorphic') || corpus.includes('35mm'))) {
      matchScore += 0.25;
    }

    // Clamp strength between 0 and 1
    const strength = Math.min(1.0, Math.round(matchScore * 100) / 100);

    if (strength >= 0.35) {
      detectedTraits.push({
        traitKey: trait.key,
        label: trait.label,
        category: trait.category,
        strength,
        matchedKeywords: Array.from(new Set(matchedKeywords)),
        evidenceSource: asset.workflowStages?.length > 0 ? 'workflow_and_visual' : 'portfolio_metadata'
      });
    }
  }

  return {
    projectId: asset.id,
    title: asset.title,
    detectedTraits
  };
}

/**
 * 4. DETERMINISTIC PORTFOLIO AGGREGATION & TRAIT RANKING
 * Aggregates evidence across all works, computes prevalence and confidence,
 * and selects the top distinctive traits.
 */
export function aggregatePortfolioTraits(assetEvidenceList, totalEligibleWorks) {
  if (!assetEvidenceList || assetEvidenceList.length === 0 || totalEligibleWorks <= 0) {
    return [];
  }

  const traitMap = new Map();

  // Initialize all traits from taxonomy
  for (const t of DNA_TRAIT_TAXONOMY) {
    traitMap.set(t.key, {
      traitKey: t.key,
      displayLabel: t.label,
      category: t.category,
      color: t.color,
      supportingWorks: [],
      strengths: []
    });
  }

  // Populate detections
  for (const evidence of assetEvidenceList) {
    for (const detected of evidence.detectedTraits) {
      const entry = traitMap.get(detected.traitKey);
      if (entry) {
        entry.supportingWorks.push({
          id: evidence.projectId,
          title: evidence.title,
          strength: detected.strength
        });
        entry.strengths.push(detected.strength);
      }
    }
  }

  const candidateTraits = [];

  for (const [key, data] of traitMap.entries()) {
    const supportingCount = data.supportingWorks.length;
    if (supportingCount > 0) {
      const avgStrength = data.strengths.reduce((a, b) => a + b, 0) / supportingCount;
      // Mathematical prevalence across all eligible works (percentage 0–100)
      const rawPrevalence = (supportingCount / totalEligibleWorks) * 100;
      const prevalenceScore = Math.min(100, Math.max(10, Math.round(rawPrevalence)));

      // Evidence confidence: validated metric balancing mean strength and repetition depth
      // Confidence is grounded in how many independent works confirm the trait
      const sampleFactor = Math.min(1.0, 0.70 + (supportingCount / totalEligibleWorks) * 0.30);
      const evidenceConfidence = Math.min(0.99, Math.round(avgStrength * sampleFactor * 100) / 100);

      // Deterministic ranking score: balances prevalence across portfolio and internal visual strength
      const rankScore = Math.round((prevalenceScore * 0.60) + (avgStrength * 100 * 0.40));

      candidateTraits.push({
        traitKey: data.traitKey,
        displayLabel: data.displayLabel,
        category: data.category,
        prevalenceScore,
        evidenceConfidence,
        supportingAssetCount: supportingCount,
        supportingAssetRefs: data.supportingWorks.map(w => ({ id: w.id, title: w.title })),
        colorAccent: data.color,
        rankScore
      });
    }
  }

  // Rank traits descending by rankScore
  candidateTraits.sort((a, b) => b.rankScore - a.rankScore);

  // Return the top 3–5 strongly supported traits
  const selectedTraits = candidateTraits.slice(0, 4).map((trait, index) => ({
    ...trait,
    rankPosition: index + 1
  }));

  return selectedTraits;
}

/**
 * 5. EXECUTE COMPLETE CREATOR DNA ANALYSIS
 * Orchestrates asset selection, feature extraction, mathematical aggregation,
 * and dual-layer durability (Supabase + In-Memory Store).
 */
export async function executeCreatorDnaAnalysis(creatorId, options = {}) {
  const { creator = null, forceRefresh = false } = options;
  const analysisId = `dna_anal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startedAt = new Date().toISOString();

  // Resolve target creator
  let targetCreator = creator;
  if (!targetCreator) {
    targetCreator = CREATORS.find(c => c.id === creatorId) || null;
    if (!targetCreator) {
      try {
        const { creators } = await fetchSupabaseCreators();
        targetCreator = creators.find(c => c.id === creatorId) || null;
      } catch (e) {
        // Continue with local fallback
      }
    }
  }

  if (!targetCreator) {
    const errorAnalysis = {
      id: analysisId,
      creatorId,
      status: 'failed',
      eligibleAssetCount: 0,
      analysisVersion: '2.0.0',
      errorDetails: { message: `Creator profile "${creatorId}" not found.` },
      startedAt,
      completedAt: new Date().toISOString()
    };
    dnaAnalysesStore.set(creatorId, errorAnalysis);
    return { ok: false, status: 'failed', analysis: errorAnalysis, traits: [] };
  }

  // Cache check: return existing completed analysis if portfolio unchanged and not forced
  if (!forceRefresh && dnaAnalysesStore.has(creatorId)) {
    const existing = dnaAnalysesStore.get(creatorId);
    if (existing && existing.status === 'completed' && dnaTraitsStore.has(creatorId)) {
      return {
        ok: true,
        status: 'completed',
        cached: true,
        analysis: existing,
        traits: dnaTraitsStore.get(creatorId) || []
      };
    }
  }

  // Step 1: Select eligible portfolio assets
  const selection = selectEligiblePortfolioAssets(targetCreator);

  if (!selection.eligible) {
    const insufficientAnalysis = {
      id: analysisId,
      creatorId,
      status: 'insufficient_evidence',
      eligibleAssetCount: selection.count,
      analysisVersion: '2.0.0',
      message: 'Building your Creator DNA: At least 2 published portfolio works are required to establish recurring visual craft patterns.',
      reason: selection.reason,
      startedAt,
      completedAt: new Date().toISOString()
    };

    dnaAnalysesStore.set(creatorId, insufficientAnalysis);
    dnaTraitsStore.set(creatorId, []);

    // Sync to target creator object
    if (targetCreator.creativeDNA) {
      targetCreator.creativeDNA.dnaSummary = {
        status: 'insufficient_evidence',
        eligibleCount: selection.count,
        traits: []
      };
    }

    return {
      ok: true,
      status: 'insufficient_evidence',
      analysis: insufficientAnalysis,
      traits: []
    };
  }

  // Step 2: Extract features per asset
  const assetEvidenceList = [];
  for (const asset of selection.assets) {
    const evidence = extractAssetFeatures(asset, targetCreator);
    assetEvidenceList.push(evidence);
  }

  // Step 3: Aggregate traits across portfolio
  const aggregatedTraits = aggregatePortfolioTraits(assetEvidenceList, selection.count);

  const completedAt = new Date().toISOString();
  const completedAnalysis = {
    id: analysisId,
    creatorId,
    status: 'completed',
    eligibleAssetCount: selection.count,
    analysisVersion: '2.0.0',
    startedAt,
    completedAt,
    summary: {
      creatorName: targetCreator.name,
      specialty: targetCreator.specialty,
      traitsCount: aggregatedTraits.length,
      topTrait: aggregatedTraits[0]?.displayLabel || 'Contemporary Vision'
    }
  };

  // Persist to in-memory store
  dnaAnalysesStore.set(creatorId, completedAnalysis);
  dnaTraitsStore.set(creatorId, aggregatedTraits);
  dnaEvidenceStore.set(creatorId, assetEvidenceList);

  // Persist to creator profile instance
  if (!targetCreator.creativeDNA) targetCreator.creativeDNA = {};
  targetCreator.creativeDNA.dnaSummary = {
    status: 'completed',
    analysisId,
    lastAnalyzedAt: completedAt,
    eligibleCount: selection.count,
    traits: aggregatedTraits
  };

  // Attempt database write-through if Supabase service client is configured
  try {
    const config = getSupabaseConfig();
    const primaryClient = config ? config.primaryClient : null;
    if (primaryClient) {
      await primaryClient.from('creator_dna_analyses').upsert({
        id: analysisId,
        creator_id: creatorId,
        status: 'completed',
        eligible_asset_count: selection.count,
        analysis_version: '2.0.0',
        summary: completedAnalysis.summary,
        started_at: startedAt,
        completed_at: completedAt
      }, { onConflict: 'id' });

      // Clean old traits and insert new traits
      await primaryClient.from('creator_dna_traits').delete().eq('creator_id', creatorId);
      if (aggregatedTraits.length > 0) {
        const rows = aggregatedTraits.map((t, idx) => ({
          id: `trait_${analysisId}_${t.traitKey}`,
          analysis_id: analysisId,
          creator_id: creatorId,
          trait_key: t.traitKey,
          display_label: t.displayLabel,
          category: t.category,
          prevalence_score: t.prevalenceScore,
          evidence_confidence: t.evidenceConfidence,
          supporting_asset_count: t.supportingAssetCount,
          supporting_asset_refs: t.supportingAssetRefs,
          color_accent: t.colorAccent,
          rank_position: idx + 1
        }));
        await primaryClient.from('creator_dna_traits').insert(rows);
      }

      // Update creator_profiles cached summary
      await primaryClient.from('creator_profiles').update({
        dna_summary: {
          status: 'completed',
          analysisId,
          lastAnalyzedAt: completedAt,
          eligibleCount: selection.count,
          traits: aggregatedTraits
        },
        dna_last_analyzed_at: completedAt
      }).eq('id', creatorId);
    }
  } catch (dbErr) {
    // Non-fatal for local dev / offline testing
    console.warn('[CreatorDNA Service] Cloud DB sync deferred to memory store:', dbErr.message);
  }

  return {
    ok: true,
    status: 'completed',
    analysis: completedAnalysis,
    traits: aggregatedTraits
  };
}

/**
 * 6. GET CREATOR DNA
 * Returns current analysis and traits for a given creator. Automatically analyzes if not yet run.
 */
export async function getCreatorDna(creatorId, creator = null) {
  if (!creatorId) return { ok: false, error: 'creatorId is required' };

  if (dnaAnalysesStore.has(creatorId)) {
    const analysis = dnaAnalysesStore.get(creatorId);
    const traits = dnaTraitsStore.get(creatorId) || [];
    return {
      ok: true,
      status: analysis.status,
      analysis,
      traits
    };
  }

  // Not yet analyzed: execute analysis on demand
  return await executeCreatorDnaAnalysis(creatorId, { creator });
}

/**
 * 7. GET ANALYSIS JOB STATUS
 */
export function getCreatorDnaStatus(analysisId) {
  for (const [creatorId, analysis] of dnaAnalysesStore.entries()) {
    if (analysis.id === analysisId) {
      const traits = dnaTraitsStore.get(creatorId) || [];
      return { ok: true, status: analysis.status, analysis, traits };
    }
  }
  return { ok: false, status: 'not_found', error: `Analysis "${analysisId}" not found.` };
}
