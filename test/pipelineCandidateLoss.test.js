// test/pipelineCandidateLoss.test.js
// Regression Test Suite: Pipeline Candidate Loss & AI-Assisted Flexible Brief Interpretation
// Verifies zero candidate loss across all 16 creators, disjoint outcome sets, and respectful brief analysis.

import assert from 'node:assert';
import { executeFilteringPipeline } from '../server/filteringPipeline.js';
import { CREATORS } from '../src/data/creatorsData.js';
import { analyzeBrief } from '../src/ai/briefAnalyzer.js';
import { getSmartClarification } from '../src/ai/smartClarifier.js';
import { ELIGIBILITY_STATUS, ELIGIBILITY_OUTCOMES } from '../src/intelligence/eligibilityEngine.js';

console.log('🧪 Starting Pipeline Candidate Loss & Brief Interpretation Regression Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

// ============================================================================
// TEST 1: Zero Candidate Loss & Disjoint Partitioning for "any creator could work"
// ============================================================================
runTest('Regression 1: Campaign with "any creator could work" accounts for all 16 creators with zero candidate loss', () => {
  const briefText = 'Any creator could work for our new initiative';
  const analysis = analyzeBrief(briefText);

  // Phase 2 assertions: AI Brief Interpretation respects flexibility
  assert.strictEqual(analysis.isFlexible, true, 'Brief analyzer must flag "any creator" as flexible');
  assert.strictEqual(analysis.hasExplicitFormat, false, 'Flexible brief must not invent explicit format');
  assert.strictEqual(analysis.hasExplicitStyle, false, 'Flexible brief must not invent explicit style');

  const smartQ = getSmartClarification(analysis);
  assert.strictEqual(smartQ, null, 'Smart clarifier must not demand narrowing questions for flexible briefs');

  // Verify mandatory requirements are empty (no artificial constraints)
  assert.deepStrictEqual(analysis.requirements.mandatory.formats, [], 'Mandatory formats must be empty for flexible brief');
  assert.deepStrictEqual(analysis.requirements.mandatory.specialization, [], 'Mandatory specialization must be empty for flexible brief');

  // Construct campaign adhering to CampaignModal behavior
  const campaign = {
    id: 'camp-flexible-test',
    title: analysis.title,
    description: briefText,
    budget: analysis.budget,
    timeline: analysis.timeline,
    desiredCreatorSpecialties: (analysis.hasExplicitFormat && !analysis.isFlexible) ? ['AI Photography'] : [],
    requirements: analysis.requirements
  };

  const candidatePool = [
    ...CREATORS,
    {
      id: 'candidate-15-unspecified-specialty',
      name: 'Taylor Quinn',
      specialty: null,
      capabilities: ['Creative Direction'],
      projects: [{ id: 'tq-1', title: 'Brand World', clientType: 'Editorial' }]
    },
    {
      id: 'candidate-16-unspecified-format',
      name: 'Jordan Lee',
      specialty: 'Visual Design',
      categoryTags: ['visuals'],
      capabilities: ['Visual Design'],
      projects: [{ id: 'jl-1', title: 'Studio Stills', aspect: null }]
    }
  ];
  assert.strictEqual(candidatePool.length, 16, 'Candidate pool must contain exactly 16 creators');

  const result = executeFilteringPipeline({
    campaign,
    creators: candidatePool
  });

  const rankedIds = new Set(result.rankedCreators.map(r => r.creatorId));
  const excludedIds = new Set(result.exclusions.map(e => e.creatorId));
  const reviewIds = new Set(result.requiresReview.map(r => r.creatorId));

  // 1. Zero candidate loss
  const totalAccountedFor = rankedIds.size + excludedIds.size + reviewIds.size;
  assert.strictEqual(
    totalAccountedFor,
    16,
    `Zero candidate loss: expected 16 evaluated creators accounted for, got ${totalAccountedFor}`
  );
  assert.strictEqual(
    result.summary.totalCandidates,
    16,
    'Pipeline summary totalCandidates must equal 16'
  );

  // 2. Pairwise disjoint sets (no overlap)
  for (const id of rankedIds) {
    assert(!excludedIds.has(id), `Creator ${id} cannot be in both ranked and exclusions`);
    assert(!reviewIds.has(id), `Creator ${id} cannot be in both ranked and requiresReview`);
  }
  for (const id of reviewIds) {
    assert(!excludedIds.has(id), `Creator ${id} cannot be in both requiresReview and exclusions`);
  }

  // 3. No artificial exclusions from invented formats or specialties
  const formatSpecialtyExclusions = result.exclusions.filter(
    e => e.code === 'FORMAT_UNSUPPORTED' || e.code === 'SPECIALIZATION_MISMATCH'
  );
  assert.strictEqual(
    formatSpecialtyExclusions.length,
    0,
    'Flexible brief must not generate artificial format or specialization exclusions'
  );
});

// ============================================================================
// TEST 2: Disjoint Partition Invariant Under Mixed Eligibility Outcomes
// ============================================================================
runTest('Regression 2: Three outcome sets strictly partition the candidate pool under diverse constraints', () => {
  // Campaign with strict budget, vertical format, and licensing requirements
  const campaign = {
    id: 'camp-mixed-test',
    title: 'Precision Mixed Outcome Campaign',
    budget: '$5,000',
    requirements: {
      mandatory: {
        skills: ['AI Video'],
        formats: ['9:16', 'vertical'],
        commercialLicensing: true,
        minProjects: 2
      },
      preferred: {
        styles: ['Cinematic'],
        platforms: ['Instagram']
      }
    }
  };

  const result = executeFilteringPipeline({
    campaign,
    creators: CREATORS
  });

  const rankedIds = new Set(result.rankedCreators.map(r => r.creatorId));
  const excludedIds = new Set(result.exclusions.map(e => e.creatorId));
  const reviewIds = new Set(result.requiresReview.map(r => r.creatorId));

  // Total must exactly equal candidate pool
  assert.strictEqual(
    rankedIds.size + excludedIds.size + reviewIds.size,
    CREATORS.length,
    `Outcome sets must sum to total candidate pool size (${CREATORS.length})`
  );

  // Summary counts must reflect the disjoint sets
  assert.strictEqual(result.summary.passedEligibilityCount, rankedIds.size);
  assert.strictEqual(result.summary.excludedCount, excludedIds.size);
  assert.strictEqual(result.summary.requiresReviewCount, reviewIds.size);

  // Disjointness check
  for (const id of rankedIds) {
    assert(!excludedIds.has(id), `Creator ${id} cannot appear in both ranked and excluded sets`);
    assert(!reviewIds.has(id), `Creator ${id} cannot appear in both ranked and review sets`);
  }
  for (const id of reviewIds) {
    assert(!excludedIds.has(id), `Creator ${id} cannot appear in both review and excluded sets`);
  }
});

// ============================================================================
// TEST 3: Candidates Dropped Before Stage 6 Are Never Lost
// ============================================================================
runTest('Regression 3: Creators dropped in early stages are safely assigned to Exclusion Ledger or Needs Review', () => {
  // Creator A: Has missing specialty and failed budget (confirmed failure)
  const creatorA = {
    id: 'creator-dropped-fail',
    name: 'Dropped Ineligible Candidate',
    specialty: null, // dropped in Stage 3 if specialty required
    capabilities: ['AI Video'],
    rates: { startingRate: '$15,000', isNegotiable: false },
    projects: [{ id: 'p1', title: 'Work', clientType: 'Brand Studio' }]
  };

  // Creator B: Has missing specialty and unknown budget (no confirmed failures)
  const creatorB = {
    id: 'creator-dropped-unknown',
    name: 'Dropped Unknown Candidate',
    specialty: null, // dropped in Stage 3 if specialty required
    capabilities: ['AI Video'],
    rates: null, // unknown budget
    projects: [{ id: 'p2', title: 'Work', clientType: 'Brand Studio' }]
  };

  const campaign = {
    id: 'camp-early-drop-test',
    title: 'Early Drop Campaign',
    budget: '$5,000',
    isNegotiable: false,
    requirements: {
      mandatory: {
        specialization: ['AI Photography']
      }
    }
  };

  const result = executeFilteringPipeline({
    campaign,
    creators: [creatorA, creatorB]
  });

  assert.strictEqual(result.summary.totalCandidates, 2);
  const totalReported = result.rankedCreators.length + result.exclusions.length + result.requiresReview.length;
  assert.strictEqual(totalReported, 2, 'Both early-dropped candidates must receive an outcome (0 loss)');

  // Creator A failed specialization -> must be in exclusions
  const exclA = result.exclusions.find(e => e.creatorId === 'creator-dropped-fail');
  assert(exclA, 'Candidate with failure must appear in Exclusion Ledger');

  // Creator B has unknown evidence without confirmed failure -> in review or exclusions per policy
  const hasOutcomeB = result.exclusions.some(e => e.creatorId === 'creator-dropped-unknown') ||
                      result.requiresReview.some(r => r.creatorId === 'creator-dropped-unknown');
  assert(hasOutcomeB, 'Candidate with missing evidence must appear in either Exclusion Ledger or Needs Review');
});

// ============================================================================
// TEST 4: Brief Analyzer Distinguishes Explicit Requirements vs Preferences
// ============================================================================
runTest('Regression 4: Brief analyzer preserves explicit formats while honoring flexible intents', () => {
  // Case A: Explicit brief
  const explicitBrief = 'I need an AI fashion film director for a 60s 4K cinematic commercial video';
  const explicitAnalysis = analyzeBrief(explicitBrief);
  assert.strictEqual(explicitAnalysis.isFlexible, false);
  assert.strictEqual(explicitAnalysis.hasExplicitFormat, true);
  assert(explicitAnalysis.requirements.mandatory.formats.length > 0, 'Explicit brief must extract mandatory format');

  // Case B: Flexible brief
  const flexibleBrief = 'We are open to any creator, style, or format for this experiment';
  const flexibleAnalysis = analyzeBrief(flexibleBrief);
  assert.strictEqual(flexibleAnalysis.isFlexible, true);
  assert.strictEqual(flexibleAnalysis.hasExplicitFormat, false);
  assert.deepStrictEqual(flexibleAnalysis.requirements.mandatory.formats, []);
  assert.deepStrictEqual(flexibleAnalysis.requirements.mandatory.specialization, []);

  // Case C: Unspecified brief (not explicitly flexible, but no format specified)
  const unspecifiedBrief = 'Launching a new boutique hotel in Kyoto';
  const unspecifiedAnalysis = analyzeBrief(unspecifiedBrief);
  assert.strictEqual(unspecifiedAnalysis.hasExplicitFormat, false);
  // Default format is a preference, not a mandatory constraint
  assert.deepStrictEqual(unspecifiedAnalysis.requirements.mandatory.formats, []);
});

console.log(`\n================================================================`);
console.log(` RESULTS: ${passedTests} / ${totalTests} regression tests passed successfully.`);
console.log(`================================================================\n`);
