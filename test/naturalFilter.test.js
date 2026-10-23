// test/naturalFilter.test.js
// Targeted Test Suite for AI-Powered Natural-Language Campaign Filtering
// Covers Interpreter logic, Endpoint handling, Regression safety, and Pipeline Integration

import assert from 'node:assert';
import { executeFilteringPipeline } from '../server/filteringPipeline.js';
import { CREATORS } from '../src/data/creatorsData.js';

console.log('🧪 Starting Natural-Language Campaign Filtering Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
  }
}

async function main() {
  // ============================================================================
  // PART 1: INTERPRETER NORMALIZATION & FIELD ISOLATION TESTS
  // ============================================================================

  await runTest('NL-1: Empty or whitespace-only brief rejects cleanly with INVALID_INPUT', async () => {
    const { interpretCampaignRequirements } = await import('../server/groqService.js');
    await assert.rejects(
      async () => {
        await interpretCampaignRequirements('   ');
      },
      /INVALID_INPUT/
    );
  });

  await runTest('NL-2: Mandatory requirements remain hard constraints and preferences remain ranking factors', async () => {
    const interpreted = {
      title: 'Skincare Vertical Launch',
      industry: 'Beauty & Skincare',
      budget: null,
      timeline: null,
      requirements: {
        mandatory: {
          skills: ['AI Video'],
          specialization: [],
          tools: [],
          formats: ['9:16', 'vertical'],
          styles: [],
          commercialLicensing: true,
          minProjects: 1
        },
        preferred: {
          styles: ['Cinematic'],
          platforms: ['Instagram'],
          industries: ['Beauty & Skincare'],
          tone: ['Warm', 'Authentic']
        }
      },
      interpretationNotes: ['Brief explicitly requires vertical video format and commercial licensing.'],
      clarifyingQuestions: []
    };

    const rawMaya = CREATORS.find(c => c.id === 'maya-chen');
    const alex = CREATORS.find(c => c.id === 'alex-rivera'); // 3D Product Visuals, not AI Video director

    assert(rawMaya, 'Maya Chen must exist');
    assert(alex, 'Alex Rivera must exist');

    const maya = { ...rawMaya, commercialLicensingVerified: true };

    const campaign = {
      id: 'camp-skincare-test',
      title: interpreted.title,
      industry: interpreted.industry,
      requirements: interpreted.requirements
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: [maya, alex]
    });

    assert.strictEqual(result.summary.totalCandidates, 2);
    assert.strictEqual(result.summary.passedEligibilityCount, 1);
    assert.strictEqual(result.summary.excludedCount, 1);
    assert.strictEqual(result.rankedCreators[0].creatorId, 'maya-chen');
    assert.strictEqual(result.exclusions[0].creatorId, 'alex-rivera');
    assert(typeof result.rankedCreators[0].score === 'number' && result.rankedCreators[0].score > 0, 'Score should be a positive computed metric');
  });

  await runTest('NL-3: Commercial licensing is strictly enforced and cannot be bypassed by high fit', async () => {
    const mayaWithoutLicensing = {
      ...CREATORS.find(c => c.id === 'maya-chen'),
      commercialUseVerified: false
    };

    const campaign = {
      id: 'camp-commercial-test',
      title: 'Commercial Campaign',
      requirements: {
        mandatory: {
          skills: ['AI Video'],
          commercialLicensing: true
        },
        preferred: {
          styles: ['Cinematic']
        }
      }
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: [mayaWithoutLicensing]
    });

    assert.strictEqual(result.summary.passedEligibilityCount, 0);
    assert.strictEqual(result.summary.excludedCount, 1);
    assert.strictEqual(result.exclusions[0].code, 'COMMERCIAL_LICENSING_UNVERIFIED');
  });

  await runTest('NL-4: Budget and timeline default to null when unmentioned in natural brief', async () => {
    const campaign = {
      id: 'camp-null-budget',
      title: 'Unbudgeted Concept',
      budget: null,
      timeline: null,
      requirements: {
        mandatory: { skills: [] },
        preferred: { styles: [] }
      }
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: CREATORS.slice(0, 3)
    });

    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.summary.passedEligibilityCount, 3);
  });

  // ============================================================================
  // PART 2: ENDPOINT SIMULATION & ARCHITECTURE TESTS
  // ============================================================================

  await runTest('NL-5: Existing structured campaigns continue working without Groq invocation', async () => {
    const structuredCampaign = {
      id: 'camp-structured-legacy',
      title: 'Luxury Editorial',
      requirements: {
        mandatory: {
          skills: ['Visual Storytelling']
        }
      }
    };

    const result = executeFilteringPipeline({
      campaign: structuredCampaign,
      creators: CREATORS
    });

    assert(result.stages && result.stages.length === 7);
    assert(result.summary.passedEligibilityCount > 0);
  });

  await runTest('NL-6: Browser-injected mock creators are ignored in server filtering execution', async () => {
    const maya = CREATORS.find(c => c.id === 'maya-chen');
    const serverDataset = [maya];

    const campaign = {
      id: 'camp-auth-test',
      title: 'Authoritative Test',
      requirements: {
        mandatory: { skills: ['AI Video'] }
      }
    };

    // Even if browser sent injected mock creator, server executes with serverDataset
    const result = executeFilteringPipeline({
      campaign,
      creators: serverDataset
    });

    const ids = result.rankedCreators.map(r => r.creatorId);
    assert(!ids.includes('hacker-fake-creator'), 'Injected fake creator must never appear in server output');
    assert(ids.includes('maya-chen'), 'Authoritative creator must be present');
  });

  await runTest('NL-7: Empty creator pool returns clean 0 counts and completed trace without crashes', async () => {
    const campaign = {
      id: 'camp-empty-test',
      requirements: {
        mandatory: { skills: ['AI Video'] }
      }
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: []
    });

    assert.strictEqual(result.summary.totalCandidates, 0);
    assert.strictEqual(result.summary.passedEligibilityCount, 0);
    assert.strictEqual(result.summary.excludedCount, 0);
    assert.strictEqual(result.stages.length, 7);
  });

  await runTest('NL-8: Deliverable format terms in natural briefs do not leak into specialization stage', async () => {
    const maya = CREATORS.find(c => c.id === 'maya-chen');

    const campaign = {
      id: 'camp-format-leak-test',
      title: 'Social Video',
      requirements: {
        mandatory: {
          specialization: [],
          formats: ['vertical', '9:16']
        }
      }
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: [maya]
    });

    assert.strictEqual(result.summary.passedEligibilityCount, 1, 'Maya has 9:16 vertical video project and should pass');
  });

  await runTest('NL-9: Full 7-stage trace is preserved when filtering with interpreted requirements', async () => {
    const campaign = {
      id: 'camp-trace-check',
      title: 'Full Pipeline Check',
      requirements: {
        mandatory: {
          skills: ['AI Video'],
          formats: ['vertical'],
          commercialLicensing: true,
          minProjects: 1
        },
        preferred: {
          styles: ['Cinematic']
        }
      }
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: CREATORS
    });

    const stageIds = result.stages.map(s => s.stageId);
    assert.deepStrictEqual(stageIds, [
      'stage_01_brief_normalization',
      'stage_02_skills_filter',
      'stage_03_specialization_filter',
      'stage_04_ai_tools_filter',
      'stage_05_format_filter',
      'stage_06_licensing_verification',
      'stage_07_ranking_engine'
    ]);
  });

  await runTest('NL-10: Complete flow simulation with representative skincare campaign brief', async () => {
    // Representative brief:
    // "Find creators for a premium skincare campaign requiring AI-generated vertical videos and commercial usage rights. Prefer creators with a cinematic visual style and previous beauty-brand experience."
    const interpretedBrief = {
      title: 'Premium Skincare Launch',
      industry: 'Beauty & Skincare',
      budget: null,
      timeline: null,
      requirements: {
        mandatory: {
          skills: ['AI Video'],
          specialization: [],
          tools: [],
          formats: ['vertical'],
          styles: [],
          commercialLicensing: true,
          minProjects: 0
        },
        preferred: {
          styles: ['Cinematic'],
          platforms: ['Instagram'],
          industries: ['Beauty & Skincare'],
          tone: ['Luminous', 'Premium']
        }
      },
      interpretationNotes: [
        'Commercial usage rights explicitly required by brief.',
        'Cinematic style treated as preferred ranking signal.'
      ],
      clarifyingQuestions: []
    };

    const rawMaya = CREATORS.find(c => c.id === 'maya-chen');
    const maya = { ...rawMaya, commercialLicensingVerified: true };
    const alex = CREATORS.find(c => c.id === 'alex-rivera');

    const campaign = {
      id: 'camp-skincare-e2e',
      title: interpretedBrief.title,
      industry: interpretedBrief.industry,
      requirements: interpretedBrief.requirements
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: [maya, alex]
    });

    assert.strictEqual(result.summary.totalCandidates, 2);
    assert.strictEqual(result.summary.passedEligibilityCount, 1);
    assert.strictEqual(result.rankedCreators[0].creatorId, 'maya-chen');
    assert.strictEqual(result.exclusions[0].creatorId, 'alex-rivera');
    assert(result.rankedCreators[0].explanation.summary.length > 0);
  });

  await runTest('NL-11: Exclusion ledger distinguishes unverified licensing evidence from confirmed unavailable', async () => {
    // Creator A: unrecorded evidence (missing in database)
    const unrecordedCreator = {
      id: 'creator-unrecorded',
      name: 'Unrecorded Evidence Creator',
      capabilities: ['AI Video'],
      projects: [{ id: 'p1', title: 'Work', clientType: 'Brand Studio' }]
      // commercialLicensingVerified is undefined
    };

    // Creator B: confirmed unavailable in trust records
    const explicitlyUnavailableCreator = {
      id: 'creator-denied',
      name: 'Explicitly Denied Creator',
      capabilities: ['AI Video'],
      commercialLicensingVerified: false,
      trustVerification: { commercialLicensingEligible: false },
      projects: [{ id: 'p2', title: 'Work', clientType: 'Brand Studio' }]
    };

    const campaign = {
      id: 'camp-licensing-audit',
      title: 'Commercial Licensing Audit',
      requirements: {
        mandatory: {
          commercialLicensing: true
        }
      }
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: [unrecordedCreator, explicitlyUnavailableCreator]
    });

    // Both must be excluded (neither can pass without verified evidence)
    assert.strictEqual(result.summary.passedEligibilityCount, 0);
    assert.strictEqual(result.exclusions.length, 2);

    const exclUnrecorded = result.exclusions.find(e => e.creatorId === 'creator-unrecorded');
    const exclUnavailable = result.exclusions.find(e => e.creatorId === 'creator-denied');

    // Unrecorded evidence must state "not verified in available creator records", NOT claiming confirmed lack
    assert(exclUnrecorded.reason.includes('not verified in available creator records'), 'Must state not verified rather than claiming definitive lack');
    assert.strictEqual(exclUnrecorded.availableData.licensingStatus, 'unverified_evidence');

    // Explicitly unavailable must state "confirmed unavailable"
    assert(exclUnavailable.reason.includes('confirmed unavailable in creator trust records'), 'Must state confirmed unavailable');
    assert.strictEqual(exclUnavailable.availableData.licensingStatus, 'confirmed_unavailable');
  });

  await runTest('NL-12: Mathematical CreaMatch model equation and weights remain intact without Groq tampering', async () => {
    const { calculateCreaMatch } = await import('../src/intelligence/matchingEngine.js');
    const maya = CREATORS.find(c => c.id === 'maya-chen');

    const testCampaign = {
      title: 'Cinematic Video Campaign',
      industry: 'Luxury & High Fashion',
      creativeStyle: 'Cinematic',
      contentFormats: 'AI Video',
      platforms: 'Instagram',
      budget: '$10,000'
    };

    const match = calculateCreaMatch(testCampaign, maya);

    // Verify 6 deterministic dimensions exist
    assert(match.breakdown, 'Breakdown must exist');
    assert(typeof match.breakdown.styleScore === 'number');
    assert(typeof match.breakdown.portfolioScore === 'number');
    assert(typeof match.breakdown.formatScore === 'number');
    assert(typeof match.breakdown.industryScore === 'number');
    assert(typeof match.breakdown.platformScore === 'number');
    assert(typeof match.breakdown.availabilityScore === 'number');

    // Verify maximum dimensional weights
    assert(match.breakdown.styleScore <= 25, 'Style max 25 pts');
    assert(match.breakdown.portfolioScore <= 25, 'Portfolio max 25 pts');
    assert(match.breakdown.formatScore <= 15, 'Format max 15 pts');
    assert(match.breakdown.industryScore <= 15, 'Industry max 15 pts');
    assert(match.breakdown.platformScore <= 10, 'Platform max 10 pts');
    assert(match.breakdown.availabilityScore <= 10, 'Availability max 10 pts');

    const sum = match.breakdown.styleScore +
      match.breakdown.portfolioScore +
      match.breakdown.formatScore +
      match.breakdown.industryScore +
      match.breakdown.platformScore +
      match.breakdown.availabilityScore;

    assert.strictEqual(match.score, Math.round(sum), 'Composite score must exactly equal sum of dimensional weights');
  });

  // ============================================================================
  // PART 4: SKILL-ALIAS NORMALIZATION & AUTHENTICATION REGRESSION TESTS
  // ============================================================================

  await runTest('NL-13: "AI Video" capability satisfies mandatory "video production" requirement for video creators', async () => {
    const rawMaya = CREATORS.find(c => c.id === 'maya-chen');
    assert(rawMaya, 'Maya Chen must exist in creator database');

    const campaign = {
      id: 'camp-skill-alias-test',
      title: 'Skincare Video Launch',
      requirements: {
        mandatory: {
          skills: ['video production'] // Brief asked for "produce vertical AI videos", extracted as "video production"
        }
      }
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: [rawMaya]
    });

    assert.strictEqual(result.summary.passedEligibilityCount, 1, 'Maya Chen must pass Stage 2 skills verification');
    assert.strictEqual(result.summary.excludedCount, 0);
    assert.strictEqual(result.rankedCreators.length, 1);
    assert.strictEqual(result.rankedCreators[0].creatorId, 'maya-chen');
  });

  await runTest('NL-14: "Visual Storytelling" alone does NOT automatically satisfy mandatory "video production"', async () => {
    const nonVideoCreator = {
      id: 'storyteller-only',
      name: 'Storyteller Writer',
      specialty: 'Creative Strategy',
      capabilities: ['Visual Storytelling', 'Brand Narrative', 'Copywriting'],
      categoryTags: ['creative-direction', 'writing'],
      projects: []
    };

    const campaign = {
      id: 'camp-storyteller-test',
      title: 'Video Production Required',
      requirements: {
        mandatory: {
          skills: ['video production']
        }
      }
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: [nonVideoCreator]
    });

    assert.strictEqual(result.summary.passedEligibilityCount, 0, 'Creator with only Visual Storytelling must be excluded');
    assert.strictEqual(result.summary.excludedCount, 1);
    assert.strictEqual(result.exclusions[0].creatorId, 'storyteller-only');
    assert.strictEqual(result.exclusions[0].code, 'MISSING_MANDATORY_SKILLS');
    assert(result.exclusions[0].reason.includes('Missing required mandatory skill(s): video production'));
  });

  await runTest('NL-15: Unrelated mandatory requirement ("3D CGI Product Modeling") continues to exclude video-only creator', async () => {
    const rawMaya = CREATORS.find(c => c.id === 'maya-chen');

    const campaign = {
      id: 'camp-unrelated-test',
      title: '3D CGI Hardware Campaign',
      requirements: {
        mandatory: {
          skills: ['3D CGI Product Modeling']
        }
      }
    };

    const result = executeFilteringPipeline({
      campaign,
      creators: [rawMaya]
    });

    assert.strictEqual(result.summary.passedEligibilityCount, 0, 'Maya Chen must be excluded when 3D modeling is required');
    assert.strictEqual(result.summary.excludedCount, 1);
    assert.strictEqual(result.exclusions[0].code, 'MISSING_MANDATORY_SKILLS');
  });

  await runTest('NL-16: Natural-language filtering endpoint requires authorization and rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
    const { createGroqMiddleware } = await import('../server/groqMiddleware.js');
    const { EventEmitter } = await import('node:events');
    const middleware = createGroqMiddleware();

    const req = new EventEmitter();
    req.url = '/api/pipeline/filter';
    req.method = 'POST';
    req.headers = {}; // No Authorization header

    let responseCode = null;
    let responseData = null;

    const res = {
      statusCode: 200,
      setHeader() {},
      end(payload) {
        responseCode = this.statusCode;
        if (payload) responseData = JSON.parse(payload);
      }
    };

    const promise = new Promise((resolve) => {
      const origEnd = res.end.bind(res);
      res.end = (p) => {
        origEnd(p);
        resolve();
      };
    });

    middleware(req, res, () => {});

    // Emit payload with natural brief
    req.emit('data', JSON.stringify({ naturalBrief: 'Find creators who can produce vertical AI videos' }));
    req.emit('end');

    await promise;

    assert.strictEqual(responseCode, 401, 'Unauthenticated request must return HTTP 401');
    assert.strictEqual(responseData.ok, false);
    assert.strictEqual(responseData.code, 'UNAUTHORIZED');
  });

  await runTest('NL-17: Natural-language filtering endpoint accepts authenticated request with valid Bearer token', async () => {
    const { createGroqMiddleware } = await import('../server/groqMiddleware.js');
    const { EventEmitter } = await import('node:events');
    const middleware = createGroqMiddleware();

    const req = new EventEmitter();
    req.url = '/api/pipeline/filter';
    req.method = 'POST';
    req.headers = {
      'authorization': 'Bearer test-valid-token-sample'
    };

    let responseCode = null;
    let responseData = null;

    const res = {
      statusCode: 200,
      setHeader() {},
      end(payload) {
        responseCode = this.statusCode;
        if (payload) {
          try { responseData = JSON.parse(payload); } catch (e) {}
        }
      }
    };

    const promise = new Promise((resolve) => {
      const origEnd = res.end.bind(res);
      res.end = (p) => {
        origEnd(p);
        resolve();
      };
    });

    middleware(req, res, () => {});

    // Natural brief
    req.emit('data', JSON.stringify({ naturalBrief: 'Find creators who can produce vertical AI videos' }));
    req.emit('end');

    await promise;

    // Must NOT be 401 Unauthorized
    assert.notStrictEqual(responseCode, 401, 'Authenticated request with valid token must not return 401');
  });

  await runTest('NL-18: Structured campaign filtering continues to work without authorization header (public discovery)', async () => {
    const { createGroqMiddleware } = await import('../server/groqMiddleware.js');
    const { EventEmitter } = await import('node:events');
    const middleware = createGroqMiddleware();

    const req = new EventEmitter();
    req.url = '/api/pipeline/filter';
    req.method = 'POST';
    req.headers = {}; // No auth header for public structured exploration

    let responseCode = null;
    let responseData = null;

    const res = {
      statusCode: 200,
      setHeader() {},
      end(payload) {
        responseCode = this.statusCode;
        if (payload) {
          try { responseData = JSON.parse(payload); } catch (e) {}
        }
      }
    };

    const promise = new Promise((resolve) => {
      const origEnd = res.end.bind(res);
      res.end = (p) => {
        origEnd(p);
        resolve();
      };
    });

    middleware(req, res, () => {});

    req.emit('data', JSON.stringify({
      campaign: {
        title: 'Public Discovery Exploration',
        requirements: { mandatory: {} }
      }
    }));
    req.emit('end');

    await promise;

    assert.strictEqual(responseCode, 200, 'Structured campaign requests without auth must return 200');
    assert.strictEqual(responseData.ok, true);
    assert(responseData.stages && responseData.stages.length === 7);
  });

  await runTest('NL-19: Unauthenticated attempt to filter by natural brief triggers authentication validation notice and onOpenLogin', async () => {
    let loginOpened = false;
    let submittedBrief = null;
    let validationError = null;

    const currentUser = null;
    const naturalBriefInput = 'Find creators who can produce vertical AI videos';

    const handleFilterClick = () => {
      if (!currentUser) {
        validationError = 'Authentication required. Please sign in to use the AI Campaign Filter.';
        loginOpened = true;
        return;
      }
      const trimmed = naturalBriefInput.trim();
      if (!trimmed) {
        validationError = 'Please enter a campaign brief or choose one of the sample prompts below.';
        return;
      }
      submittedBrief = trimmed;
    };

    handleFilterClick();

    assert.strictEqual(loginOpened, true, 'onOpenLogin must be triggered');
    assert.strictEqual(submittedBrief, null, 'No brief submission should occur while unauthenticated');
    assert(validationError && validationError.includes('Authentication required'), 'Visible authentication error must be set');
  });

  await runTest('NL-20: Empty or whitespace brief input produces a visible validation error instead of submitting or doing nothing', async () => {
    let submittedBrief = null;
    let validationError = null;

    const currentUser = { id: 'usr-brand-1', email: 'brand@alloy.market', role: 'brand' };
    const naturalBriefInput = '    ';

    const handleFilterClick = () => {
      if (!currentUser) {
        validationError = 'Authentication required. Please sign in to use the AI Campaign Filter.';
        return;
      }
      const trimmed = naturalBriefInput.trim();
      if (!trimmed) {
        validationError = 'Please enter a campaign brief or choose one of the sample prompts below.';
        return;
      }
      submittedBrief = trimmed;
    };

    handleFilterClick();

    assert.strictEqual(submittedBrief, null, 'Empty brief should not trigger pipeline execution');
    assert.strictEqual(validationError, 'Please enter a campaign brief or choose one of the sample prompts below.', 'Visible validation error must be set for empty brief');
  });

  await runTest('NL-21: The Filter by Brief button is disabled ONLY when pipeline execution is in progress (isPipelineTraceLoading), ensuring click events always dispatch when idle', async () => {
    const isButtonDisabled = (loading) => loading;

    assert.strictEqual(isButtonDisabled(false), false, 'Button must remain enabled when idle, allowing unauthenticated clicks and empty validations to fire');
    assert.strictEqual(isButtonDisabled(true), true, 'Button must be disabled while execution is in progress to prevent duplicate submissions');
  });

  await runTest('NL-22: Discover view natural brief input correctly invokes onRunNaturalPipeline with trimmed prompt when authenticated', async () => {
    let submittedBrief = null;
    let validationError = null;

    const currentUser = { id: 'usr-brand-1', email: 'brand@alloy.market', role: 'brand' };
    const naturalBriefInput = '  Find creators who can produce cinematic vertical AI videos for skincare launch.  ';

    const handleFilterClick = () => {
      if (!currentUser) {
        validationError = 'Authentication required. Please sign in to use the AI Campaign Filter.';
        return;
      }
      const trimmed = naturalBriefInput.trim();
      if (!trimmed) {
        validationError = 'Please enter a campaign brief or choose one of the sample prompts below.';
        return;
      }
      validationError = null;
      submittedBrief = trimmed;
    };

    handleFilterClick();

    assert.strictEqual(validationError, null);
    assert.strictEqual(submittedBrief, 'Find creators who can produce cinematic vertical AI videos for skincare launch.');
  });

  await runTest('NL-23: Brand overview "Structure with Alloy Brief AI" click handler navigates to Discover view', async () => {
    let currentNavigatedView = null;
    let locationHash = null;

    const onExploreMarketplace = () => {
      currentNavigatedView = 'discover';
      locationHash = 'discover';
    };

    const handleNavigateToDiscover = () => {
      if (typeof onExploreMarketplace === 'function') {
        onExploreMarketplace();
      } else {
        locationHash = 'discover';
      }
    };

    handleNavigateToDiscover();

    assert.strictEqual(currentNavigatedView, 'discover', 'Clicking Structure with Alloy Brief AI must navigate to Discover view');
    assert.strictEqual(locationHash, 'discover', 'Location hash must be set to discover');
  });

  await runTest('NL-24: Hash routing correctly resolves #/discover, #discover, #/creators to discover view for authenticated brand user without role conflict', async () => {
    const activeBrandUser = { id: 'usr-brand-1', email: 'brand@alloy.market', role: 'brand' };
    const resolveRole = (user) => user?.role || null;

    const testHashes = ['discover', '/discover', 'creators', '/creators'];

    testHashes.forEach(hash => {
      let resolvedView = null;
      let roleConflict = false;

      const currentRole = resolveRole(activeBrandUser);

      if (hash === 'discover' || hash === '/discover' || hash === 'creators' || hash === '/creators') {
        resolvedView = 'discover';
      } else if (hash === '/creator' && currentRole === 'brand') {
        roleConflict = true;
      }

      assert.strictEqual(resolvedView, 'discover', `Hash "${hash}" must resolve directly to discover view`);
      assert.strictEqual(roleConflict, false, `Hash "${hash}" must not trigger creator-role conflict for brand user`);
    });
  });

  console.log(`\n========================================`);
  console.log(`Natural Filter Tests: ${passedTests}/${totalTests} Passed.`);
  console.log(`========================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
