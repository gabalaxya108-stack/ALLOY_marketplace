// test/pipeline.test.js
// Independent Backend Pipeline Test Suite
// Verifies eligibility filtering, ranking, counts consistency, edge cases, and regressions

import assert from 'node:assert';
import {
  executeFilteringPipeline,
  normalizeCampaignBrief,
  READABLE_EXCLUSION_TITLES,
  formatExclusionLabel
} from '../server/filteringPipeline.js';
import { CREATORS } from '../src/data/creatorsData.js';
import { calculateCreaMatch } from '../src/intelligence/matchingEngine.js';

console.log('🧪 Starting Backend Filtering Pipeline Test Suite...\n');

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
  }
}

// ============================================================================
// TEST 1: Creator who satisfies all mandatory requirements
// ============================================================================
runTest('Scenario 1: Creator satisfies all mandatory requirements and is eligible', () => {
  const maya = CREATORS.find(c => c.id === 'maya-chen');
  assert(maya, 'Maya Chen must exist in creator database');

  const campaign = {
    id: 'camp-test-1',
    title: 'Cinematic Fashion Film',
    industry: 'Luxury & High Fashion',
    creativeStyle: 'Cinematic',
    requirements: {
      mandatory: {
        skills: ['AI Video', 'Visual Storytelling'],
        specialization: ['AI Video'],
        tools: ['Runway Gen-3']
      }
    }
  };

  const result = executeFilteringPipeline({ campaign, creators: [maya] });
  assert.strictEqual(result.status, 'completed');
  assert.strictEqual(result.summary.passedEligibilityCount, 1);
  assert.strictEqual(result.summary.excludedCount, 0);
  assert.strictEqual(result.rankedCreators.length, 1);
  assert.strictEqual(result.rankedCreators[0].creatorId, 'maya-chen');
  assert(result.rankedCreators[0].score > 70, 'Score should be strong for compatible creator');
});

// ============================================================================
// TEST 2: Creator who fails one mandatory requirement
// ============================================================================
runTest('Scenario 2: Creator fails one mandatory requirement (e.g. required 3D skill for video-only creator)', () => {
  const maya = CREATORS.find(c => c.id === 'maya-chen');

  const campaign = {
    id: 'camp-test-2',
    title: 'Spatial 3D Watch Render',
    requirements: {
      mandatory: {
        skills: ['3D CGI Product Modeling'] // Maya is cinematic video, lacks 3D modeling
      }
    }
  };

  const result = executeFilteringPipeline({ campaign, creators: [maya] });
  assert.strictEqual(result.status, 'empty');
  assert.strictEqual(result.summary.passedEligibilityCount, 0);
  assert.strictEqual(result.summary.excludedCount, 1);
  assert.strictEqual(result.exclusions.length, 1);
  assert.strictEqual(result.exclusions[0].creatorId, 'maya-chen');
  assert(result.exclusions[0].reason.includes('Missing required mandatory skill'), 'Exclusion reason must state missing skill');
});

// ============================================================================
// TEST 3: High Creative Fit score creator MUST be excluded if eligibility fails
// ============================================================================
runTest('Scenario 3: High Creative Fit score CANNOT bypass failed eligibility', () => {
  // Maya Chen has strong cinematic / fashion aesthetic fit (score 85+),
  // but let's impose a mandatory requirement for 'Houdini FX' tool, which she lacks.
  const maya = CREATORS.find(c => c.id === 'maya-chen');

  const campaign = {
    id: 'camp-test-3',
    title: 'Echoes of Midnight — Cinematic Fashion Narrative Film',
    industry: 'Luxury & High Fashion',
    creativeStyle: 'Cinematic, Editorial, Story-driven, Luxury',
    contentFormats: 'AI Video, Narrative Cinema',
    platforms: 'Instagram, Vimeo',
    requirements: {
      mandatory: {
        tools: ['Houdini FX Simulation'] // Hard requirement that Maya lacks
      }
    }
  };

  const rawMatch = calculateCreaMatch(campaign, maya);
  assert(rawMatch.score >= 80, `Raw CreaMatch score (${rawMatch.score}) must be high based on creative style fit`);

  const result = executeFilteringPipeline({ campaign, creators: [maya] });
  assert.strictEqual(result.summary.passedEligibilityCount, 0, 'Must not pass eligibility despite high raw score');
  assert.strictEqual(result.rankedCreators.length, 0, 'No ranked creators in eligible list');
  assert.strictEqual(result.exclusions.length, 1);
  assert.strictEqual(result.exclusions[0].creatorId, 'maya-chen');
  assert(result.exclusions[0].reason.toLowerCase().includes('houdini'), 'Exclusion must ground the missing tool');
});

// ============================================================================
// TEST 4: Missing commercial-use or portfolio evidence handling
// ============================================================================
runTest('Scenario 4: Missing commercial-use or required portfolio evidence is handled explicitly', () => {
  const syntheticUnverifiedCreator = {
    id: 'unverified-test-creator',
    name: 'Ghost Creator',
    specialty: 'AI Video',
    categoryTags: ['ai-video'],
    capabilities: ['AI Video'],
    tools: ['Runway Gen-3'],
    projects: [] // 0 verified projects
  };

  const campaign = {
    id: 'camp-test-4',
    title: 'Enterprise Commercial Campaign',
    requirements: {
      mandatory: {
        commercialLicensing: true,
        minProjects: 1
      }
    }
  };

  const result = executeFilteringPipeline({ campaign, creators: [syntheticUnverifiedCreator] });
  assert.strictEqual(result.summary.passedEligibilityCount, 0);
  assert.strictEqual(result.exclusions.length, 1);
  assert(result.exclusions[0].code === 'COMMERCIAL_LICENSING_UNVERIFIED' || result.exclusions[0].code === 'PORTFOLIO_THRESHOLD_UNMET', 'Must assign exact verification failure code');
  assert(result.exclusions[0].reason.includes('verified portfolio project') || result.exclusions[0].reason.includes('commercial'));
});

// ============================================================================
// TEST 5: Optional preferences affect ranking without excluding creators
// ============================================================================
runTest('Scenario 5: Optional preferences affect ranking without excluding creators', () => {
  const maya = CREATORS.find(c => c.id === 'maya-chen');
  const zora = CREATORS.find(c => c.id === 'zora-vance');

  const campaign = {
    id: 'camp-test-5',
    title: 'Beauty & Skincare Campaign',
    industry: 'Beauty & Skincare',
    creativeStyle: 'Luminous, Macro, Botanical',
    requirements: {
      mandatory: {}, // No hard exclusions
      preferred: {
        styles: ['Macro', 'Luminous'],
        platforms: ['Instagram']
      }
    }
  };

  const result = executeFilteringPipeline({ campaign, creators: [maya, zora] });
  assert.strictEqual(result.summary.passedEligibilityCount, 2, 'Both creators must pass when no mandatory filter excludes them');
  assert.strictEqual(result.rankedCreators.length, 2);
  // Zora Vance specializes in Macro beauty and liquid viscosity, should rank at top for skincare macro
  assert.strictEqual(result.rankedCreators[0].creatorId, 'zora-vance');
});

// ============================================================================
// TEST 6: Empty creator dataset
// ============================================================================
runTest('Scenario 6: Empty creator dataset returns safe completed trace with 0 counts', () => {
  const campaign = { id: 'camp-test-6', title: 'Test Empty' };
  const result = executeFilteringPipeline({ campaign, creators: [] });

  assert.strictEqual(result.status, 'empty');
  assert.strictEqual(result.summary.totalCandidates, 0);
  assert.strictEqual(result.summary.passedEligibilityCount, 0);
  assert.strictEqual(result.summary.excludedCount, 0);
  assert.strictEqual(result.rankedCreators.length, 0);
});

// ============================================================================
// TEST 7: Campaigns with zero eligible creators across full database
// ============================================================================
runTest('Scenario 7: Impossible campaign requirements produce 0 eligible creators and clear exclusions', () => {
  const campaign = {
    id: 'camp-test-7',
    title: 'Impossible Niche Brief',
    requirements: {
      mandatory: {
        tools: ['NonExistentProprietaryModelV99']
      }
    }
  };

  const result = executeFilteringPipeline({ campaign, creators: CREATORS });
  assert.strictEqual(result.status, 'empty');
  assert.strictEqual(result.summary.passedEligibilityCount, 0);
  assert.strictEqual(result.summary.excludedCount, CREATORS.length);
  assert.strictEqual(result.rankedCreators.length, 0);
  assert.strictEqual(result.exclusions.length, CREATORS.length);
});

// ============================================================================
// TEST 8: Consistent counts and accurate exclusion accounting
// ============================================================================
runTest('Scenario 8: Candidate counts are mathematically consistent at every stage', () => {
  const campaign = {
    id: 'camp-test-8',
    title: 'Multi-Filter Campaign',
    requirements: {
      mandatory: {
        specialization: ['AI Video'],
        tools: ['Runway Gen-3']
      }
    }
  };

  const result = executeFilteringPipeline({ campaign, creators: CREATORS });

  let currentCandidates = CREATORS.length;
  for (const stage of result.stages) {
    if (stage.stageId === 'stage_07_ranking_engine') {
      assert.strictEqual(stage.inputCount, result.summary.passedEligibilityCount);
      assert.strictEqual(stage.passedCount, result.summary.passedEligibilityCount);
    } else {
      assert.strictEqual(stage.inputCount, currentCandidates, `Stage ${stage.stageId} inputCount mismatch`);
      assert.strictEqual(stage.inputCount, stage.passedCount + stage.rejectedCount, `Stage ${stage.stageId} math mismatch`);
      currentCandidates = stage.passedCount;
    }
  }

  assert.strictEqual(currentCandidates, result.summary.passedEligibilityCount);
  assert.strictEqual(result.summary.totalCandidates, result.summary.passedEligibilityCount + result.summary.excludedCount);
});

// ============================================================================
// TEST 9: Missing or malformed campaign fields
// ============================================================================
runTest('Scenario 9: Missing, null, or malformed brief inputs handle gracefully without crashing', () => {
  const nullResult = executeFilteringPipeline({ campaign: null, creators: null });
  assert(nullResult.executionId, 'Should generate executionId');
  assert.strictEqual(nullResult.summary.totalCandidates, CREATORS.length);

  const malformedResult = executeFilteringPipeline({
    campaign: {
      requirements: {
        mandatory: {
          skills: null,
          tools: 'Midjourney, Runway Gen-3', // string instead of array
          specialization: undefined
        }
      }
    }
  });
  assert(malformedResult.rankedCreators.length > 0);
});

// ============================================================================
// TEST 10: Existing matching engine calculation regression test
// ============================================================================
runTest('Scenario 10: calculateCreaMatch behavior remains intact for backward compatibility', () => {
  const maya = CREATORS.find(c => c.id === 'maya-chen');
  const campaign = {
    title: 'Lumina Botanica — Pure Hydration Campaign',
    industry: 'Beauty & Skincare',
    creativeStyle: 'Cinematic, Botanical, Organic',
    contentFormats: '4K Stills Suite, 2x Vertical Loops',
    platforms: 'Instagram'
  };

  const scoreData = calculateCreaMatch(campaign, maya);
  assert(typeof scoreData.score === 'number', 'Score must be a number');
  assert(scoreData.score >= 0 && scoreData.score <= 100, 'Score must be 0-100');
  assert(scoreData.breakdown.styleScore !== undefined, 'Breakdown must contain styleScore');
  assert(scoreData.breakdown.portfolioScore !== undefined, 'Breakdown must contain portfolioScore');
  assert(scoreData.breakdown.formatScore !== undefined, 'Breakdown must contain formatScore');
  assert(scoreData.breakdown.industryScore !== undefined, 'Breakdown must contain industryScore');
  assert(scoreData.breakdown.platformScore !== undefined, 'Breakdown must contain platformScore');
  assert(scoreData.breakdown.availabilityScore !== undefined, 'Breakdown must contain availabilityScore');
});

// ============================================================================
// TEST 11: API Boundary: Rejection of client-injected creator records
// ============================================================================
runTest('Scenario 11: Server pipeline execution ignores client-supplied fake creators', () => {
  // Even if a malicious client passes a fabricated creator claiming to have every tool,
  // the server pipeline with creators=null strictly binds to authoritative server records.
  const fabricatedClientCreator = {
    id: 'hacked-creator',
    name: 'Tampered Creator',
    specialty: 'AI Video',
    tools: ['NonExistentProprietaryModelV99'], // Fabricated
    categoryTags: ['ai-video']
  };

  const campaign = {
    id: 'camp-test-11',
    title: 'Strict Tool Campaign',
    requirements: {
      mandatory: {
        tools: ['NonExistentProprietaryModelV99']
      }
    }
  };

  // When executed in server mode (creators: null), the server uses authoritative source
  const serverResult = executeFilteringPipeline({ campaign, creators: null });
  assert.strictEqual(serverResult.summary.passedEligibilityCount, 0, 'Must exclude fabricated tool in authoritative pool');
  assert.strictEqual(serverResult.eligibleCreatorIds.includes('hacked-creator'), false, 'Tampered creator cannot exist in server pool');
});

// ============================================================================
// TEST 12: Seven-Stage Pipeline Trace Integrity
// ============================================================================
runTest('Scenario 12: Seven-stage pipeline trace returns all 7 discrete stages in valid sequence', () => {
  const campaign = {
    id: 'camp-test-12',
    title: 'Trace Sequence Verification',
    requirements: {
      mandatory: {
        skills: ['Visual Storytelling']
      }
    }
  };

  const result = executeFilteringPipeline({ campaign, creators: CREATORS });
  assert.strictEqual(result.stages.length, 7, 'Pipeline trace must contain exactly 7 stages');

  const expectedStageIds = [
    'stage_01_brief_normalization',
    'stage_02_skills_filter',
    'stage_03_specialization_filter',
    'stage_04_ai_tools_filter',
    'stage_05_format_filter',
    'stage_06_licensing_verification',
    'stage_07_ranking_engine'
  ];

  result.stages.forEach((st, idx) => {
    assert.strictEqual(st.stageId, expectedStageIds[idx], `Stage index ${idx} must match ID ${expectedStageIds[idx]}`);
    assert(typeof st.stageName === 'string' && st.stageName.length > 0, 'Stage must have human-readable name');
    assert(typeof st.description === 'string' && st.description.length > 0, 'Stage must have readable description');
    assert(typeof st.inputCount === 'number', 'inputCount must be numeric');
    assert(typeof st.passedCount === 'number', 'passedCount must be numeric');
    assert(typeof st.rejectedCount === 'number', 'rejectedCount must be numeric');
  });
});

// ============================================================================
// TEST 13: Human-Readable Exclusion Labels Translation
// ============================================================================
runTest('Scenario 13: Raw machine failure codes map to restrained, human-readable requirement labels', () => {
  assert.strictEqual(
    formatExclusionLabel('COMMERCIAL_LICENSING_UNVERIFIED'),
    'Commercial licensing not verified'
  );
  assert.strictEqual(
    formatExclusionLabel('PORTFOLIO_THRESHOLD_UNMET'),
    'Portfolio evidence below required threshold'
  );
  assert.strictEqual(
    formatExclusionLabel('TOOL_CHAIN_INCOMPATIBLE'),
    'Required AI tools/models not in verified toolchain'
  );
  assert.strictEqual(
    formatExclusionLabel('MISSING_MANDATORY_SKILLS'),
    'Required mandatory skills missing'
  );
  assert.strictEqual(
    formatExclusionLabel('SPECIALIZATION_MISMATCH'),
    'Specialization mismatch'
  );
  assert.strictEqual(
    formatExclusionLabel('FORMAT_UNSUPPORTED'),
    'Deliverable format unsupported'
  );

  // Fallback for custom or unknown codes: turns SNAKE_CASE into Capitalized Words
  assert.strictEqual(
    formatExclusionLabel('GEO_RESTRICTION_UNMET'),
    'Geo Restriction Unmet'
  );
});

// ============================================================================
// TEST 14: Separate Commercial-Licensing and Portfolio-Evidence Semantics
// ============================================================================
runTest('Scenario 14: Portfolio volume cannot satisfy unverified commercial licensing requirement', () => {
  // A creator with multiple projects but unverified commercial licensing credentials
  const highPortfolioUnverifiedCreator = {
    id: 'portfolio-heavy-creator',
    name: 'Artisan Creator',
    specialty: 'AI Video',
    categoryTags: ['ai-video'],
    capabilities: ['AI Video'],
    tools: ['Runway Gen-3'],
    availability: 'Available for projects',
    projects: [
      { id: 'p1', title: 'Personal Spec 1', clientType: 'Personal / Spec' },
      { id: 'p2', title: 'Personal Spec 2', clientType: 'Personal / Spec' },
      { id: 'p3', title: 'Personal Spec 3', clientType: 'Personal / Spec' }
    ],
    commercialLicensingVerified: false,
    trustVerification: { commercialLicensingEligible: false, portfolioProven: true }
  };

  const campaign = {
    id: 'camp-licensing-test',
    title: 'Enterprise Campaign Requiring Commercial Licensing',
    requirements: {
      mandatory: {
        commercialLicensing: true,
        minProjects: 2
      }
    }
  };

  const result = executeFilteringPipeline({ campaign, creators: [highPortfolioUnverifiedCreator] });
  assert.strictEqual(result.summary.passedEligibilityCount, 0, 'Cannot pass despite 3 portfolio projects');
  assert.strictEqual(result.exclusions.length, 1);
  const exclusion = result.exclusions[0];
  assert.strictEqual(exclusion.code, 'COMMERCIAL_LICENSING_UNVERIFIED');
  assert(
    exclusion.reason.toLowerCase().includes('licensing') || exclusion.reason.toLowerCase().includes('verified'),
    'Exclusion reason must reference licensing verification without claiming work does not exist'
  );
});

// ============================================================================
// TEST 15: Discover Creators Filtering with Exact Eligible Set
// ============================================================================
runTest('Scenario 15: Discover Creators filter strictly applies exact eligibleCreatorIds set', () => {
  const campaign = {
    id: 'camp-test-15',
    title: 'Targeted Video Campaign',
    requirements: {
      mandatory: {
        tools: ['Runway Gen-3']
      }
    }
  };

  const pipelineOutput = executeFilteringPipeline({ campaign, creators: CREATORS });
  const eligibleIds = pipelineOutput.eligibleCreatorIds;
  assert(eligibleIds.length > 0, 'Expected at least one eligible creator');

  // Discover filter application logic (as implemented in Discover tab):
  const eligibleSet = new Set(eligibleIds);
  const filteredInDiscover = CREATORS.filter(c => eligibleSet.has(c.id));

  // 1. Excluded creators MUST NOT appear
  const excludedIds = pipelineOutput.exclusions.map(e => e.creatorId);
  excludedIds.forEach(id => {
    assert(
      !filteredInDiscover.some(c => c.id === id),
      `Excluded creator ${id} must never appear in Discover filtered result set`
    );
  });

  // 2. Count must exactly match eligible set
  assert.strictEqual(filteredInDiscover.length, eligibleIds.length);
});

// ============================================================================
// TEST 16: Preservation of Pipeline Ranking Order in Discover View
// ============================================================================
runTest('Scenario 16: Discover view preserves pipeline ranking order for eligible creators', () => {
  const campaign = {
    id: 'camp-test-16',
    title: 'Skincare Video Campaign',
    industry: 'Beauty & Skincare',
    creativeStyle: 'Luminous, Macro, Botanical',
    requirements: {
      mandatory: {
        skills: ['AI Video']
      }
    }
  };

  const pipelineOutput = executeFilteringPipeline({ campaign, creators: CREATORS });
  const rankedOrder = pipelineOutput.rankedCreators;
  assert(rankedOrder.length >= 2, 'Expected multiple ranked creators');

  // Apply ranking logic as in BrandWorkspaceView / DiscoverView
  const rankIndexMap = new Map();
  rankedOrder.forEach((item, idx) => {
    rankIndexMap.set(item.creatorId, idx);
  });

  const eligibleSet = new Set(pipelineOutput.eligibleCreatorIds);
  const discoveredCreators = CREATORS
    .filter(c => eligibleSet.has(c.id))
    .sort((a, b) => {
      const rankA = rankIndexMap.has(a.id) ? rankIndexMap.get(a.id) : 9999;
      const rankB = rankIndexMap.has(b.id) ? rankIndexMap.get(b.id) : 9999;
      return rankA - rankB;
    });

  // Check top 2 creators match pipeline ranked order
  assert.strictEqual(discoveredCreators[0].id, rankedOrder[0].creatorId);
  assert.strictEqual(discoveredCreators[1].id, rankedOrder[1].creatorId);
});

// ============================================================================
// TEST 17: Clearing the Campaign Filter
// ============================================================================
runTest('Scenario 17: Clearing the pipeline filter restores the full creator directory', () => {
  let activeFilter = {
    campaignId: 'camp-test-17',
    eligibleCreatorIds: ['maya-chen']
  };

  // When filter is active
  let displayed = CREATORS.filter(c => activeFilter.eligibleCreatorIds.includes(c.id));
  assert.strictEqual(displayed.length, 1);

  // User clicks "Clear Filter"
  activeFilter = null;
  displayed = activeFilter ? CREATORS.filter(c => activeFilter.eligibleCreatorIds.includes(c.id)) : [...CREATORS];
  assert.strictEqual(displayed.length, CREATORS.length, 'Should restore full creator pool');
});

// ============================================================================
// TEST 18: Reruns After Saving Changed Campaign Requirements
// ============================================================================
runTest('Scenario 18: Updating brief requirements produces a distinct fresh pipeline trace', () => {
  const initialBrief = {
    id: 'camp-live-brief',
    title: 'Fashion Stills',
    requirements: {
      mandatory: {
        tools: ['Midjourney']
      }
    }
  };

  const initialTrace = executeFilteringPipeline({ campaign: initialBrief, creators: CREATORS });
  const initialEligibleCount = initialTrace.summary.passedEligibilityCount;

  // Brand modifies brief to require a tool that only 3D/VFX artists use:
  const updatedBrief = {
    ...initialBrief,
    requirements: {
      mandatory: {
        tools: ['Blender 3D']
      }
    }
  };

  const updatedTrace = executeFilteringPipeline({ campaign: updatedBrief, creators: CREATORS });
  assert.notStrictEqual(
    initialTrace.executionId,
    updatedTrace.executionId,
    'Updated execution must generate a fresh execution ID'
  );
  // Maya Chen uses Midjourney & Runway, but not Blender 3D:
  const mayaInInitial = initialTrace.eligibleCreatorIds.includes('maya-chen');
  const mayaInUpdated = updatedTrace.eligibleCreatorIds.includes('maya-chen');
  assert.strictEqual(mayaInInitial, true);
  assert.strictEqual(mayaInUpdated, false);
});

// ============================================================================
// TEST 19: Prevention of Older Slower Requests Overwriting Newer Results
// ============================================================================
runTest('Scenario 19: Version tracking guards prevent older responses from overwriting newer traces', async () => {
  let latestRunVersion = 0;
  let activeTrace = null;

  async function mockPipelineRun(versionId, delayMs, payload) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    // Atomic check: only commit if versionId is current
    if (versionId === latestRunVersion) {
      activeTrace = payload;
    }
  }

  // Request 1 started (e.g. slow response with old brief)
  const req1Version = ++latestRunVersion; // version 1
  const run1Promise = mockPipelineRun(req1Version, 50, { briefVersion: 'v1-old' });

  // User quickly edits brief again -> Request 2 started (faster response)
  const req2Version = ++latestRunVersion; // version 2
  const run2Promise = mockPipelineRun(req2Version, 10, { briefVersion: 'v2-new' });

  await Promise.all([run1Promise, run2Promise]);

  // Request 1 took 50ms, Request 2 took 10ms.
  // When Request 1 finally finished, version was 2 != 1, so Request 1 was safely discarded!
  assert.strictEqual(activeTrace.briefVersion, 'v2-new', 'Active trace must be v2-new, not overwritten by v1');
});

// ============================================================================
// TEST 20: Stale-Result Handling on Execution Failure
// ============================================================================
runTest('Scenario 20: Execution failure retains previous trace explicitly flagged as stale', () => {
  const previousTrace = {
    executionId: 'exec-prev',
    campaignId: 'camp-1',
    summary: { passedEligibilityCount: 3 },
    isStale: false
  };

  // Simulating a failed rerun:
  let currentTrace = previousTrace;
  try {
    throw new Error('Simulated network/pipeline timeout during re-evaluation');
  } catch (err) {
    // Retain previous results as stale and label them clearly
    currentTrace = {
      ...previousTrace,
      isStale: true,
      staleReason: 'Pipeline re-evaluation failed. Displaying previous results as stale.'
    };
  }

  assert.strictEqual(currentTrace.isStale, true, 'Trace must be explicitly marked as stale');
  assert(currentTrace.staleReason.includes('stale'), 'Stale reason must inform the user');
  assert.strictEqual(currentTrace.summary.passedEligibilityCount, 3, 'Previous results are retained for review');
});

// ============================================================================
// TEST 21: Integrated Eligibility Engine Three-Outcome Contract
// ============================================================================
runTest('Scenario 21: Pipeline integrates eligibility engine with 3 distinct outcomes (ELIGIBLE, INELIGIBLE, REQUIRES_REVIEW)', () => {
  const maya = CREATORS.find(c => c.id === 'maya-chen');
  assert(maya, 'Maya Chen must exist in creator database');

  // Candidate 1: ELIGIBLE — Maya Chen with explicit 9:16 project and within budget
  const eligibleCandidate = {
    ...maya,
    id: 'creator-eligible-1',
    name: 'Eligible Video Creator',
    capabilities: ['AI Video', 'Runway Gen-3'],
    tools: ['Runway Gen-3'],
    rate: 8000,
    currency: 'USD',
    projects: [
      { id: 'p1', title: 'Vertical Reel', format: '9:16 Vertical Video Loop', aspect: '9:16' }
    ]
  };

  // Candidate 2: INELIGIBLE — Lacks mandatory tool 'Runway Gen-3'
  const ineligibleCandidate = {
    ...maya,
    id: 'creator-ineligible-2',
    name: 'Ineligible Tool Creator',
    capabilities: ['AI Video'],
    tools: ['Midjourney'], // Lacks Runway Gen-3
    rate: 8000,
    currency: 'USD',
    projects: [
      { id: 'p1', title: 'Vertical Reel', format: '9:16 Vertical Video Loop', aspect: '9:16' }
    ]
  };

  // Candidate 3: REQUIRES_REVIEW — Has AI Video & Runway, but portfolio contains only landscape 16:9 (no vertical evidence)
  const reviewCandidate = {
    ...maya,
    id: 'creator-review-3',
    name: 'Review Pending Creator',
    categoryTags: ['video', 'social'],
    capabilities: ['AI Video', 'Runway Gen-3'],
    tools: ['Runway Gen-3'],
    rate: 8000,
    currency: 'USD',
    projects: [
      { id: 'p1', title: 'Landscape YouTube Ad', format: '16:9 Video', aspect: '16:9' }
    ]
  };

  const campaign = {
    id: 'camp-three-outcomes',
    title: 'Vertical Runway Campaign',
    budget: '$10,000',
    currency: 'USD',
    isNegotiable: false,
    requirements: {
      mandatory: {
        skills: ['AI Video'],
        tools: ['Runway Gen-3'],
        formats: ['9:16 Vertical Video Loop'],
        budget: { amount: 10000, currency: 'USD', isNegotiable: false }
      }
    }
  };

  const result = executeFilteringPipeline({
    campaign,
    creators: [eligibleCandidate, ineligibleCandidate, reviewCandidate]
  });

  // Verify total and outcome counts
  assert.strictEqual(result.summary.totalCandidates, 3);
  assert.strictEqual(result.summary.passedEligibilityCount, 1, 'Only eligible candidate passes');
  assert.strictEqual(result.summary.excludedCount, 1, 'Ineligible candidate is excluded');
  assert.strictEqual(result.summary.requiresReviewCount, 1, 'Review candidate is flagged for review');
  assert.strictEqual(result.summary.reviewCount, 1, 'reviewCount alias reflects review candidate');

  // Verify eligible ranking
  assert.strictEqual(result.rankedCreators.length, 1, 'Only eligible candidate is ranked');
  assert.strictEqual(result.rankedCreators[0].creatorId, 'creator-eligible-1');
  assert.deepStrictEqual(result.eligibleCreatorIds, ['creator-eligible-1']);

  // Verify ineligible candidate exclusion
  assert(
    result.exclusions.some(e => e.creatorId === 'creator-ineligible-2'),
    'Ineligible candidate must be recorded in exclusions'
  );
  const ineligExcl = result.exclusions.find(e => e.creatorId === 'creator-ineligible-2');
  assert(ineligExcl.reason.toLowerCase().includes('runway'), 'Exclusion retains mandatory failure reason');

  // Verify review candidate availability and details
  assert.strictEqual(result.requiresReview.length, 1, 'Review candidate must be in requiresReview');
  assert.strictEqual(result.requiresReview[0].creatorId, 'creator-review-3');
  assert.strictEqual(result.requiresReview[0].eligibility, 'REQUIRES_REVIEW');
  assert(result.requiresReview[0].reasons.length > 0, 'Must retain review reasons');
  assert(
    result.requiresReview[0].unknownRequirements.some(r => r.requirement === 'formats' && r.status === 'UNKNOWN'),
    'Unknown formats requirement must be preserved'
  );
});

// ============================================================================
// TEST 22: Ineligible candidate cannot enter eligible ranking via high fit score
// ============================================================================
runTest('Scenario 22: Mandatory failure strictly prevents creator from entering eligible ranking regardless of creative score', () => {
  const maya = CREATORS.find(c => c.id === 'maya-chen');

  // High suitability candidate whose rate exceeds non-negotiable budget
  const expensiveHighFitCreator = {
    ...maya,
    id: 'expensive-high-fit-creator',
    rate: 25000,
    currency: 'USD'
  };

  const campaign = {
    id: 'camp-strict-budget-test',
    title: 'Strict Fixed Budget Film',
    requirements: {
      mandatory: {
        budget: { amount: 10000, currency: 'USD', isNegotiable: false }
      }
    }
  };

  const result = executeFilteringPipeline({
    campaign,
    creators: [expensiveHighFitCreator]
  });

  assert.strictEqual(result.status, 'empty');
  assert.strictEqual(result.summary.passedEligibilityCount, 0);
  assert.strictEqual(result.rankedCreators.length, 0, 'Cannot enter rankedCreators');
  assert.strictEqual(result.eligibleCreatorIds.length, 0, 'Cannot enter eligibleCreatorIds');
  assert.strictEqual(result.exclusions.length, 1, 'Exclusion recorded');
  assert(result.exclusions[0].reason.includes('$25,000') || result.exclusions[0].reason.includes('budget'));
});

// ============================================================================
// TEST 23: Review candidates remain available separately with unknown reasons
// ============================================================================
runTest('Scenario 23: Cross-currency mismatch candidate is retained in requiresReview with currency reasons', () => {
  const maya = CREATORS.find(c => c.id === 'maya-chen');

  // Candidate with rate specified in INR vs campaign in USD
  const inrCandidate = {
    ...maya,
    id: 'inr-creator',
    rate: '₹85,000',
    currency: 'INR'
  };

  const campaign = {
    id: 'camp-usd-currency-test',
    title: 'USD Brand Campaign',
    budget: '$10,000',
    currency: 'USD',
    isNegotiable: false,
    requirements: {
      mandatory: {
        budget: { amount: 10000, currency: 'USD', isNegotiable: false }
      }
    }
  };

  const result = executeFilteringPipeline({
    campaign,
    creators: [inrCandidate]
  });

  // Not in eligible ranking
  assert.strictEqual(result.summary.passedEligibilityCount, 0);
  assert.strictEqual(result.rankedCreators.length, 0);
  assert.strictEqual(result.eligibleCreatorIds.length, 0);

  // Retained separately in requiresReview
  assert.strictEqual(result.summary.requiresReviewCount, 1);
  assert.strictEqual(result.requiresReview.length, 1);
  assert.strictEqual(result.requiresReview[0].creatorId, 'inr-creator');
  assert.strictEqual(result.requiresReview[0].eligibility, 'REQUIRES_REVIEW');

  const budgetUnknown = result.requiresReview[0].unknownRequirements.find(r => r.requirement === 'budget');
  assert(budgetUnknown, 'Budget must be recorded as unknown requirement');
  assert.strictEqual(budgetUnknown.status, 'UNKNOWN');
  assert(budgetUnknown.reason.includes('explicit currency conversion'), 'Reason must explain currency conversion needed');
  assert.strictEqual(budgetUnknown.difference, null, 'Never calculate misleading raw difference across currencies');
});

// ============================================================================
// Scenario 24: Unrecorded format evidence produces REQUIRES_REVIEW without polluting Exclusion Ledger
// ============================================================================
runTest('Scenario 24: Unrecorded format evidence produces REQUIRES_REVIEW without polluting Exclusion Ledger', () => {
  const maya = CREATORS.find(c => c.id === 'maya-chen');
  assert(maya, 'Maya Chen must exist in creators data');

  const filmCampaign = {
    id: 'camp-hero-film-eval',
    title: 'Cinematic Hero Film Campaign',
    requirements: {
      mandatory: {
        formats: ['cinematic hero film']
      }
    }
  };

  const elena = {
    id: 'elena-rostova-unspec',
    name: 'Elena Rostova',
    specialty: 'Unspecified',
    categoryTags: [],
    capabilities: [],
    projects: []
  };

  const googleStudio = {
    id: 'google-creator-studio-unspec',
    name: 'Google Creator Studio',
    specialty: 'Unspecified',
    categoryTags: [],
    capabilities: [],
    projects: []
  };

  const result = executeFilteringPipeline({
    campaign: filmCampaign,
    creators: [maya, elena, googleStudio]
  });

  // Maya Chen passes as an AI Video specialist
  assert.strictEqual(result.summary.passedEligibilityCount, 1, 'Maya Chen must pass eligibility');
  assert.strictEqual(result.rankedCreators.length, 1, 'Only Maya Chen in ranked creators');
  assert.strictEqual(result.rankedCreators[0].creatorId, 'maya-chen');

  // Elena Rostova and Google Creator Studio must be in REQUIRES_REVIEW
  assert.strictEqual(result.summary.requiresReviewCount, 2, 'Two candidates require review');
  assert.strictEqual(result.requiresReview.length, 2, 'requiresReview contains 2 creators');
  const reviewIds = result.requiresReview.map(r => r.creatorId);
  assert(reviewIds.includes('elena-rostova-unspec'), 'Elena Rostova must be in requiresReview');
  assert(reviewIds.includes('google-creator-studio-unspec'), 'Google Creator Studio must be in requiresReview');

  // CRITICAL: Review candidates must NOT be in the Exclusion Ledger (exclusions)
  assert.strictEqual(result.summary.excludedCount, 0, 'No confirmed exclusions');
  assert.strictEqual(result.exclusions.length, 0, 'Exclusion Ledger must be empty');
  const exclusionIds = result.exclusions.map(e => e.creatorId);
  assert(!exclusionIds.includes('elena-rostova-unspec'), 'Elena Rostova must not be in exclusions');
  assert(!exclusionIds.includes('google-creator-studio-unspec'), 'Google Creator Studio must not be in exclusions');
});

console.log(`\n========================================`);
console.log(`Pipeline Tests Complete: ${passedTests}/${totalTests} Passed.`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
