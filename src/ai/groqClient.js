// src/ai/groqClient.js
// Safe frontend client for Groq-powered intelligence in CreaSync
// Communicates ONLY with server-side /api/ai endpoints.
// NEVER contains or exposes secret API keys.
// Provides automatic fallback to local deterministic engines when offline or unconfigured.

import { analyzeBrief as deterministicAnalyzeBrief } from './briefAnalyzer.js';
import { generateCreatorDNA as deterministicCreatorDNA } from '../intelligence/creatorDNA.js';
import { generateCreatorConcept as deterministicCreatorConcept } from '../intelligence/conceptEngine.js';
import { explainMatch as deterministicExplainMatch } from '../intelligence/matchExplainer.js';
import { calculateCreaMatch as deterministicCalculateMatch } from '../intelligence/matchingEngine.js';

const API_BASE = typeof window !== 'undefined' ? '' : (typeof process !== 'undefined' && process.env?.API_BASE ? process.env.API_BASE : 'http://localhost:5173');

let healthCache = null;
let lastHealthCheck = 0;

/**
 * Checks server-side Groq configuration status
 */
export async function checkGroqStatus() {
  const now = Date.now();
  if (healthCache && (now - lastHealthCheck < 30000)) {
    return healthCache;
  }

  try {
    const res = await fetch(`${API_BASE}/api/ai/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      healthCache = data;
      lastHealthCheck = now;
      return data;
    }
  } catch (err) {
    // Network or server offline
  }

  healthCache = {
    ok: true,
    configured: false,
    status: 'fallback',
    model: 'deterministic-engine',
    message: 'Local deterministic intelligence engine active.'
  };
  lastHealthCheck = now;
  return healthCache;
}

/**
 * FEATURE 1: CreaBrief
 * Transforms natural language prompt into structured campaign brief.
 */
export async function generateCreaBrief(naturalPrompt) {
  if (!naturalPrompt || !naturalPrompt.trim()) {
    throw new Error('Please enter a campaign concept description.');
  }

  try {
    const res = await fetch(`${API_BASE}/api/ai/creabrief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: naturalPrompt })
    });

    if (res.ok) {
      const result = await res.json();
      if (result.ok && result.brief) {
        return {
          source: 'groq',
          isLiveAI: true,
          model: 'llama-3.3-70b',
          brief: result.brief
        };
      }
    }
  } catch (e) {
    console.warn('[CreaBrief] Remote Groq call skipped/failed, using deterministic fallback:', e);
  }

  // Graceful deterministic fallback
  const fallback = deterministicAnalyzeBrief(naturalPrompt);
  return {
    source: 'deterministic',
    isLiveAI: false,
    model: 'CreaBrief Rule Engine',
    brief: {
      title: fallback.title,
      objective: fallback.objective,
      productOrService: fallback.product,
      industry: fallback.industry || 'Consumer Tech & Hardware',
      targetAudience: fallback.targetAudience,
      creativeDirection: fallback.creativeStyle,
      creativeStyle: fallback.creativeStyle,
      desiredTone: fallback.toneOfVoice,
      contentFormats: fallback.contentFormat || fallback.deliverables,
      deliverables: fallback.deliverables,
      preferredPlatforms: fallback.preferredPlatform,
      requiredCreatorCapabilities: fallback.requiredCapabilities || [],
      budget: fallback.budget,
      deadline: fallback.timeline,
      mandatoryRequirements: fallback.mandatoryRequirements || [],
      optionalPreferences: fallback.optionalPreferences || [],
      missingInformation: fallback.missingInformation || [],
      clarifyingQuestions: fallback.clarifyingQuestions || []
    }
  };
}

/**
 * FEATURE 2: Creator DNA
 * Synthesizes grounded Creator DNA distinguishing 3-tier provenance.
 */
export async function generateCreatorDNA(creator) {
  if (!creator) return null;

  try {
    const res = await fetch(`${API_BASE}/api/ai/creatordna`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator })
    });

    if (res.ok) {
      const result = await res.json();
      if (result.ok && result.dna) {
        return {
          source: 'groq',
          isLiveAI: true,
          ...result.dna
        };
      }
    }
  } catch (e) {
    console.warn('[CreatorDNA] Remote Groq call skipped/failed, using deterministic fallback:', e);
  }

  const fallback = deterministicCreatorDNA(creator);
  return {
    source: 'deterministic',
    isLiveAI: false,
    ...fallback
  };
}

/**
 * FEATURE 3: CreaMatch & CreaScore Explanation
 * Evaluates creative compatibility and explains why creator fits with cited portfolio evidence.
 */
export async function evaluateMatchWithGroq(campaign, creator) {
  const deterministicScore = deterministicCalculateMatch(campaign, creator);
  const deterministicExpl = deterministicExplainMatch(campaign, creator);

  try {
    const res = await fetch(`${API_BASE}/api/ai/creamatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign, creator })
    });

    if (res.ok) {
      const result = await res.json();
      if (result.ok && result.matchAnalysis) {
        return {
          source: 'groq',
          isLiveAI: true,
          score: deterministicScore.score,
          breakdown: deterministicScore.breakdown,
          fitLabel: deterministicScore.fitLabel,
          evidenceTier: deterministicScore.evidenceTier,
          explanation: {
            ...deterministicExpl,
            summary: result.matchAnalysis.semanticAlignmentSummary || deterministicExpl.summary,
            requirementsSatisfied: result.matchAnalysis.requirementsSatisfied || deterministicExpl.highlights,
            identifiedUnknowns: result.matchAnalysis.identifiedUnknowns || [],
            potentialCreativeGaps: result.matchAnalysis.potentialCreativeGaps || [deterministicExpl.potentialGap],
            citedProjects: result.matchAnalysis.citedProjects || deterministicExpl.relevantProjects
          }
        };
      }
    }
  } catch (e) {
    console.warn('[CreaMatch] Remote Groq call skipped/failed, using deterministic fallback:', e);
  }

  return {
    source: 'deterministic',
    isLiveAI: false,
    score: deterministicScore.score,
    breakdown: deterministicScore.breakdown,
    fitLabel: deterministicScore.fitLabel,
    evidenceTier: deterministicScore.evidenceTier,
    explanation: deterministicExpl
  };
}

/**
 * FEATURE 4: CreaSim Concepts
 * Synthesizes 3 distinct, creator-specific concepts tailored to the brief.
 */
export async function generateCreaSimConcepts(campaign, creator, creatorDNA = {}) {
  try {
    const res = await fetch(`${API_BASE}/api/ai/creasim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign, creator, creatorDNA })
    });

    if (res.ok) {
      const result = await res.json();
      if (result.ok && Array.isArray(result.concepts) && result.concepts.length > 0) {
        return {
          source: 'groq',
          isLiveAI: true,
          concepts: result.concepts,
          disclaimer: result.disclaimer || "Concept Simulation synthesized by CreaSim using verified Creator DNA."
        };
      }
    }
  } catch (e) {
    console.warn('[CreaSim] Remote Groq call skipped/failed, using deterministic fallback:', e);
  }

  // Graceful fallback to deterministic concept engine
  const singleConcept = deterministicCreatorConcept(campaign, creator);
  return {
    source: 'deterministic',
    isLiveAI: false,
    concepts: [
      {
        id: 'concept-1',
        title: singleConcept.conceptTitle,
        creativeDirection: singleConcept.conceptNarrative,
        openingHook: singleConcept.storyboard?.[0]?.description || 'Cinematic opening hook',
        visualTreatment: singleConcept.aesthetic || 'Art-directed editorial lighting',
        connectionToObjective: `Directly aligns with ${campaign.objective || 'campaign launch'}`,
        whyItSuitsCreator: `Reflects ${creator.name}'s verified craft in ${creator.specialty}`,
        palette: singleConcept.palette || ["#1E1E24", "#C89D7C", "#FAF8F5", "#8A5A44"],
        storyboard: (singleConcept.storyboard || []).map((sc, i) => ({
          scene: `0${i + 1}`,
          type: sc.shotType || 'Scene',
          desc: sc.description
        })),
        suggestedDeliverable: campaign.deliverables || '4K Stills Suite'
      }
    ],
    disclaimer: "Concept Simulation synthesized by CreaSim using verified Creator DNA."
  };
}
