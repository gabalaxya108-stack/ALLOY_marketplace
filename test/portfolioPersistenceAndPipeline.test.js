// test/portfolioPersistenceAndPipeline.test.js
// Regression and End-to-End Test Suite for ALLOY Portfolio Persistence & AI Creator-Matching Integration
// Verifies:
// 1. Durable media persistence (never leaving permanent transient blob: URLs)
// 2. Project-level creative style evidence integration with attribution
// 3. Multi-project consideration without cross-project erasure
// 4. Invariant that matching style cannot bypass other mandatory failures
// 5. Preserving 3 eligibility outcomes: ELIGIBLE, INELIGIBLE, REQUIRES_REVIEW
// 6. Brand UI explainability and decision breakdown

import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { 
  validateMediaFile, 
  uploadPortfolioMedia, 
  deletePortfolioMedia, 
  rehydrateProjectMedia,
  resolveMediaUrl,
  getFromLocalMediaCache
} from '../src/services/mediaStorage.js';
import { 
  evaluateStylesRequirement, 
  evaluateCreatorEligibility,
  ELIGIBILITY_STATUS, 
  ELIGIBILITY_OUTCOMES 
} from '../src/intelligence/eligibilityEngine.js';
import { executeFilteringPipeline } from '../server/filteringPipeline.js';
import { 
  savePortfolioProject, 
  sanitizePipelineCandidates, 
  executeCampaignFilteringPipeline 
} from '../src/services/marketplaceBackend.js';
import { createGroqMiddleware } from '../server/groqMiddleware.js';
import { getInitialMarketplaceState, saveMarketplaceState } from '../src/data/marketplaceStore.js';
import { createServer } from 'vite';

console.log('🧪 Starting ALLOY Portfolio Persistence & AI Creator-Matching Test Suite...\n');

// Mock localStorage and window environment for Node.js test execution
const mockStorage = new Map();
const mockLocalStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { localStorage: mockLocalStorage };
}
globalThis.localStorage = mockLocalStorage;

async function runTestSuite() {
  let passedCount = 0;

  // =========================================================================
  // SECTION 1: DURABLE MEDIA PERSISTENCE TESTS
  // =========================================================================
  console.log('--- SECTION 1: Durable Portfolio Media Persistence ---');

  // Test 1.1: validateMediaFile accepts valid creative types and rejects invalid files
  console.log('▶ Test 1.1: File validation enforces supported creative formats and size limits');
  const validImage = { name: 'fashion_still.jpg', type: 'image/jpeg', size: 2 * 1024 * 1024 };
  const validVideo = { name: 'cinematic_loop.mp4', type: 'video/mp4', size: 15 * 1024 * 1024 };
  const invalidExe = { name: 'malicious.exe', type: 'application/x-msdownload', size: 500 };
  const oversizedFile = { name: 'huge_render.jpg', type: 'image/jpeg', size: 50 * 1024 * 1024 }; // 50MB > 20MB limit

  assert.equal(validateMediaFile(validImage).valid, true, 'JPG should be valid');
  assert.equal(validateMediaFile(validVideo).valid, true, 'MP4 should be valid');
  assert.equal(validateMediaFile(invalidExe).valid, false, 'EXE must be rejected');
  assert.equal(validateMediaFile(oversizedFile).valid, false, 'Oversized image must be rejected');
  console.log('  ✅ [PASS] File type and size constraints validated.');
  passedCount++;

  // Test 1.2: uploadPortfolioMedia stores durable storagePath and durable reference (not blob-only)
  console.log('▶ Test 1.2: uploadPortfolioMedia provides durable reference and isolated creator storagePath');
  const sampleUploadFile = {
    name: 'summer_solstice_macro.png',
    type: 'image/png',
    size: 512 * 1024
  };

  const uploadResult = await uploadPortfolioMedia(sampleUploadFile, 'creator-laxmibai-101');
  assert.ok(uploadResult.id, 'Upload result must contain stable id');
  assert.ok(uploadResult.storagePath.startsWith('portfolio/creator-laxmibai-101/'), 'storagePath must follow portfolio/{creatorId}/ convention');
  assert.ok(uploadResult.durableUrl, 'Must return durableUrl');
  assert.notEqual(uploadResult.storageType, 'local-blob', 'Storage type must be durable, not ephemeral local-blob');
  assert.ok(!uploadResult.durableUrl.startsWith('blob:'), 'durableUrl must never be an ephemeral browser blob: URL');
  console.log('  ✅ [PASS] Durable storagePath and durableUrl returned.');
  passedCount++;

  // Test 1.3: savePortfolioProject sanitizes transient blob: URLs and persists durable references
  console.log('▶ Test 1.3: savePortfolioProject replaces transient blob: URLs with durable references');
  const testCreatorId = 'creator-isolated-test-01';
  const rawProjectWithTransientBlob = {
    id: 'proj-transient-test-99',
    title: 'Echoes of the Solarium',
    description: '35mm anamorphic architectural study',
    category: 'Cinematic AI Video',
    creativeStyle: 'Cinematic',
    image: 'blob:http://localhost:5173/7a829e-128a-4412-fake-blob-url',
    video: null,
    media: [
      {
        id: 'm-blob-1',
        url: 'blob:http://localhost:5173/7a829e-128a-4412-fake-blob-url',
        durableUrl: 'https://cdn.example.com/storage/solarium_durable.jpg',
        storagePath: 'portfolio/creator-isolated-test-01/1729000_solarium.jpg',
        mediaType: 'image',
        isCover: true
      }
    ]
  };

  const savedProject = await savePortfolioProject(testCreatorId, rawProjectWithTransientBlob);
  assert.notEqual(savedProject.image, 'blob:http://localhost:5173/7a829e-128a-4412-fake-blob-url', 'Image must not retain transient blob URL');
  assert.equal(savedProject.image, 'https://cdn.example.com/storage/solarium_durable.jpg', 'Image must be normalized to durable reference');
  assert.equal(savedProject.media[0].url, 'https://cdn.example.com/storage/solarium_durable.jpg', 'Media item URL must be durable');
  console.log('  ✅ [PASS] Transient blob: URL safely replaced with durable reference.');
  passedCount++;

  // Test 1.4: deletePortfolioMedia rejects unauthorized modification across creators
  console.log('▶ Test 1.4: deletePortfolioMedia enforces creator isolation and rejects cross-creator deletion');
  let unauthorizedCaught = false;
  try {
    // Creator 'creator-A' attempts to delete media under 'creator-B'
    await deletePortfolioMedia('portfolio/creator-B/1729000_secret_footage.mp4', 'creator-A');
  } catch (err) {
    unauthorizedCaught = true;
    assert.ok(err.message.includes('Unauthorized'), `Error should cite unauthorized access: ${err.message}`);
  }
  assert.equal(unauthorizedCaught, true, 'Must reject unauthorized media deletion');

  // Authorized deletion passes
  const authorizedDelete = await deletePortfolioMedia('portfolio/creator-A/1729000_my_draft.jpg', 'creator-A');
  assert.equal(authorizedDelete.success, true, 'Authorized creator must be allowed to delete their own media');
  console.log('  ✅ [PASS] Cross-creator media modification rejected with authorization check.');
  passedCount++;

  // Test 1.5: rehydrateProjectMedia recovers media after session reload
  console.log('▶ Test 1.5: rehydrateProjectMedia resolves and rehydrates media without breaking UI');
  const projectToRehydrate = {
    id: 'proj-rehydrate-01',
    title: 'Neon Kinetic Loop',
    image: 'blob:http://localhost/expired-blob',
    media: [
      {
        id: 'med-rehydrate-1',
        url: 'blob:http://localhost/expired-blob',
        durableUrl: 'https://cdn.example.com/neon_kinetic.jpg',
        storagePath: 'portfolio/creator-A/neon.jpg',
        isCover: true
      }
    ]
  };

  const rehydrated = await rehydrateProjectMedia(projectToRehydrate);
  assert.ok(!rehydrated.image.startsWith('blob:'), 'Rehydrated image must not be an expired blob URL');
  assert.equal(rehydrated.image, 'https://cdn.example.com/neon_kinetic.jpg', 'Must rehydrate to durable reference');
  console.log('  ✅ [PASS] Media successfully rehydrated for cross-session survival.\n');
  passedCount++;


  // =========================================================================
  // SECTION 2: PROJECT-LEVEL PORTFOLIO EVIDENCE IN FILTERING PIPELINE
  // =========================================================================
  console.log('--- SECTION 2: Project-Level Portfolio Evidence in Eligibility Pipeline ---');

  // Test 2.1: Creator Laxmibai with creative_style = "Cinematic" on project satisfies style requirement
  console.log('▶ Test 2.1: Project-level creativeStyle = "Cinematic" satisfies campaign style requirement with attribution');
  const creatorLaxmibai = {
    id: 'creator-laxmibai-cinematic',
    name: 'Laxmibai Rao',
    specialty: 'Generative AI Director',
    styles: [], // Notice: profile styles is intentionally empty!
    capabilities: ['Cinematic Direction', 'Generative Video', 'Lighting Design'],
    tools: ['Midjourney v6', 'Runway Gen-3'],
    industries: ['Luxury Fashion'],
    commercialLicensingVerified: true,
    projects: [
      {
        id: 'proj-lax-01',
        title: 'Shadows of the Deccan Palace',
        category: 'Cinematic AI Video',
        creative_style: 'Cinematic', // Project-level evidence
        format: '9:16 Kinetic Video Reel',
        image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85',
        video: 'https://cdn.example.com/deccan_palace.mp4',
        clientType: 'Heritage Commercial Campaign'
      }
    ]
  };

  const styleResult = evaluateStylesRequirement(['Cinematic'], creatorLaxmibai);
  assert.ok(styleResult, 'evaluateStylesRequirement should return evaluation');
  assert.equal(styleResult.status, ELIGIBILITY_OUTCOMES.PASS, 'Should PASS on project-level style evidence');
  assert.equal(styleResult.evidence.matchedProjects.length, 1, 'Evidence must attribute the match to originating project');
  assert.equal(styleResult.evidence.matchedProjects[0].projectId, 'proj-lax-01');
  assert.equal(styleResult.evidence.matchedProjects[0].projectTitle, 'Shadows of the Deccan Palace');
  assert.equal(styleResult.evidence.matchedProjects[0].style, 'Cinematic');
  assert.equal(creatorLaxmibai.styles.length, 0, 'Creator profile styles must NOT be mutated or polluted');
  console.log('  ✅ [PASS] Laxmibai project-level "Cinematic" evidence recognized and attributed.');
  passedCount++;

  // Test 2.2: Multiple projects considered without cross-project erasure
  console.log('▶ Test 2.2: Evidence across multiple projects is aggregated without erasing valid evidence');
  const multiProjectCreator = {
    id: 'creator-multi-proj',
    name: 'Milan Kapoor',
    styles: [],
    capabilities: ['AI Direction'],
    projects: [
      {
        id: 'p-1',
        title: 'Project Minimalist Architecture',
        creativeStyle: 'Minimalist',
        format: '4K Stills'
      },
      {
        id: 'p-2',
        title: 'Project Solar Flare Cinema',
        creativeStyle: 'Cinematic',
        format: '9:16 Video'
      },
      {
        id: 'p-3',
        title: 'Untitled Work',
        creativeStyle: null // Missing style metadata must NOT erase p-1 or p-2!
      }
    ]
  };

  // Requirement demanding both Minimalist and Cinematic
  const multiStyleResult = evaluateStylesRequirement(['Minimalist', 'Cinematic'], multiProjectCreator);
  assert.equal(multiStyleResult.status, ELIGIBILITY_OUTCOMES.PASS, 'Both styles from distinct projects should satisfy requirement');
  assert.equal(multiStyleResult.evidence.matchedProjects.length, 2, 'Should attribute evidence to both originating projects');
  console.log('  ✅ [PASS] Multiple projects evaluated; missing metadata on project 3 did not erase valid evidence.');
  passedCount++;

  // Test 2.3: Missing metadata produces UNKNOWN / REQUIRES_REVIEW outcome
  console.log('▶ Test 2.3: Missing style metadata produces UNKNOWN (REQUIRES_REVIEW), never fake pass or blind rejection');
  const creatorWithoutStyleMetadata = {
    id: 'creator-no-style-meta',
    name: 'Taylor Quinn',
    styles: [],
    projects: [
      {
        id: 'p-blank',
        title: 'Raw Render 01',
        creativeStyle: '', // Empty
        format: '4K Stills'
      }
    ],
    capabilities: ['3D Modeling']
  };

  const unknownStyleResult = evaluateStylesRequirement(['Cinematic'], creatorWithoutStyleMetadata);
  assert.equal(unknownStyleResult.status, ELIGIBILITY_OUTCOMES.UNKNOWN, 'Missing style metadata must produce UNKNOWN');
  assert.ok(unknownStyleResult.reason.includes('not recorded'), 'Reason must explicitly cite unrecorded aesthetic style');

  const overallEval = evaluateCreatorEligibility({
    requirements: { mandatory: { styles: ['Cinematic'] } }
  }, creatorWithoutStyleMetadata);
  assert.equal(overallEval.eligibility, ELIGIBILITY_STATUS.REQUIRES_REVIEW, 'Overall eligibility must be REQUIRES_REVIEW');
  console.log('  ✅ [PASS] Missing metadata cleanly results in REQUIRES_REVIEW.');
  passedCount++;

  // Test 2.4: A matching style tag alone must NOT bypass other mandatory campaign requirements
  console.log('▶ Test 2.4: Matching style does NOT bypass other mandatory failures (remains INELIGIBLE)');
  const cinematicCreatorMissingTools = {
    id: 'creator-cinematic-no-tools',
    name: 'Aiden Cross',
    styles: ['Cinematic'],
    projects: [
      {
        id: 'p-cin',
        title: 'Cinematic Commercial',
        creativeStyle: 'Cinematic'
      }
    ],
    tools: ['Midjourney v6'], // Lacks required 'Runway Gen-3'
    capabilities: ['AI Direction'],
    commercialLicensingVerified: true
  };

  const strictCampaign = {
    id: 'camp-strict-cinematic',
    title: 'High-Speed Luxury Automotive Campaign',
    requirements: {
      mandatory: {
        styles: ['Cinematic'], // PASSES
        tools: ['Runway Gen-3'] // FAILS
      }
    }
  };

  const strictResult = evaluateCreatorEligibility(strictCampaign, cinematicCreatorMissingTools);
  assert.equal(strictResult.eligibility, ELIGIBILITY_STATUS.INELIGIBLE, 'Must remain INELIGIBLE due to mandatory toolchain failure');
  const styleReq = strictResult.requirements.find(r => r.requirement === 'styles');
  const toolReq = strictResult.requirements.find(r => r.requirement === 'tools');
  assert.equal(styleReq.status, ELIGIBILITY_OUTCOMES.PASS, 'Styles should pass');
  assert.equal(toolReq.status, ELIGIBILITY_OUTCOMES.FAIL, 'Tools must fail');
  console.log('  ✅ [PASS] Mandatory toolchain failure upheld; matching style cannot bypass strict requirements.');
  passedCount++;

  // Test 2.5: Style mismatch with recorded styles produces INELIGIBLE (FAIL)
  console.log('▶ Test 2.5: Recorded non-matching style produces INELIGIBLE (FAIL)');
  const animeCreator = {
    id: 'creator-anime',
    name: 'Kaito Tanaka',
    styles: ['Anime / Cel-Shaded'],
    projects: [
      {
        id: 'p-anime',
        title: 'Cyberpunk Shonen Odyssey',
        creativeStyle: 'Anime / Manga Cel-Shaded'
      }
    ],
    capabilities: ['Cel Animation']
  };

  const mismatchResult = evaluateStylesRequirement(['Cinematic Anamorphic'], animeCreator);
  assert.equal(mismatchResult.status, ELIGIBILITY_OUTCOMES.FAIL, 'Non-matching recorded style must produce FAIL');
  assert.ok(mismatchResult.reason.includes('do not include required style'), 'Must state reason for mismatch');
  console.log('  ✅ [PASS] Style mismatch correctly produces FAIL.\n');
  passedCount++;


  // =========================================================================
  // SECTION 3: FULL 7-STAGE PIPELINE & BRAND UI TRACEABILITY
  // =========================================================================
  console.log('--- SECTION 3: End-to-End Pipeline Execution & Brand UI Traceability ---');

  // Test 3.1: Complete pipeline execution with isolated candidates
  console.log('▶ Test 3.1: executeFilteringPipeline partitions candidatePool into ELIGIBLE, INELIGIBLE, and REQUIRES_REVIEW');
  const campaign = {
    id: 'camp-e2e-cinematic-luxury',
    title: 'Heritage Cashmere Cinematic Autumn Campaign',
    industry: 'Luxury Fashion',
    budget: '$15,000',
    timeline: '3 Weeks',
    requirements: {
      mandatory: {
        skills: ['Cinematic Direction'],
        styles: ['Cinematic'],
        tools: ['Midjourney v6'],
        commercialLicensing: true,
        minProjects: 1
      }
    }
  };

  const candidatePool = [
    // Candidate 1: Fully eligible via project-level style
    {
      id: 'cand-eligible-laxmibai',
      name: 'Laxmibai Rao',
      specialty: 'Generative Visual Direction',
      styles: [], // Empty profile styles; evidence in project!
      capabilities: ['Cinematic Direction', 'Lighting Design'],
      tools: ['Midjourney v6', 'Runway Gen-3'],
      commercialLicensingVerified: true,
      projects: [
        {
          id: 'proj-lax-e2e',
          title: 'Royal Heritage Loom',
          category: 'Luxury Fashion',
          creative_style: 'Cinematic',
          format: '4K Stills Suite',
          clientType: 'Commercial Luxury House',
          image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85',
          media: [
            { id: 'm-lax-1', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85', mediaType: 'image' }
          ]
        }
      ]
    },
    // Candidate 2: Ineligible due to missing tool
    {
      id: 'cand-ineligible-no-tool',
      name: 'Oliver Vance',
      specialty: 'Generative Visual Direction',
      styles: ['Cinematic'],
      capabilities: ['Cinematic Direction'],
      tools: ['Stable Diffusion XL'], // Missing Midjourney v6
      commercialLicensingVerified: true,
      projects: [{ id: 'p-ov', title: 'Work 1', creativeStyle: 'Cinematic' }]
    },
    // Candidate 3: Requires Review due to unrecorded style evidence
    {
      id: 'cand-review-missing-style',
      name: 'Elena Rostova',
      specialty: 'Generative Visual Direction',
      styles: [], // No styles recorded
      capabilities: ['Cinematic Direction'],
      tools: ['Midjourney v6'],
      commercialLicensingVerified: true,
      projects: [{ id: 'p-er', title: 'Work 2', creativeStyle: null }] // No project style recorded
    }
  ];

  const pipelineResult = executeFilteringPipeline({ campaign, creators: candidatePool });

  assert.equal(pipelineResult.contractVersion, '1.0.0', 'Contract version must be 1.0.0');
  assert.equal(pipelineResult.summary.totalCandidates, 3, 'Evaluated all 3 candidates with zero candidate loss');
  assert.equal(pipelineResult.summary.passedEligibilityCount, 1, 'Exactly 1 candidate must be ELIGIBLE');
  assert.equal(pipelineResult.summary.excludedCount, 1, 'Exactly 1 candidate must be INELIGIBLE');
  assert.equal(pipelineResult.summary.requiresReviewCount, 1, 'Exactly 1 candidate must REQUIRE REVIEW');

  assert.ok(pipelineResult.eligibleCreatorIds.includes('cand-eligible-laxmibai'), 'Laxmibai must be eligible');
  assert.ok(pipelineResult.exclusions.some(e => e.creatorId === 'cand-ineligible-no-tool'), 'Oliver Vance must be excluded');
  assert.ok(pipelineResult.requiresReview.some(r => r.creatorId === 'cand-review-missing-style'), 'Elena Rostova must require review');

  // Verify passedCreatorSummaries has projectStyles
  const briefStage = pipelineResult.stages.find(s => s.stageId === 'stage_01_brief_normalization');
  const summaryForLax = briefStage.passedCreatorSummaries.find(c => c.id === 'cand-eligible-laxmibai');
  assert.ok(summaryForLax, 'Laxmibai summary must be present');
  assert.ok(summaryForLax.projectStyles.includes('Cinematic'), 'passedCreatorSummaries must disclose projectStyles');

  console.log('  ✅ [PASS] Pipeline partitioned all 3 candidates with zero candidate loss.');
  passedCount++;

  // Test 3.2: Brand UI Exclusion titles and readable explanations via Vite SSR
  console.log('▶ Test 3.2: Brand UI dictionary provides human-readable titles for style mismatch');
  const viteServer = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });
  const { READABLE_EXCLUSION_TITLES } = await viteServer.ssrLoadModule('./src/components/PipelineTraceModal.jsx');
  assert.equal(READABLE_EXCLUSION_TITLES.STYLE_MISMATCH, 'Creative style mismatch with campaign requirements');
  assert.equal(READABLE_EXCLUSION_TITLES.INSUFFICIENT_PROJECTS, 'Portfolio evidence below required project threshold');
  await viteServer.close();
  console.log('  ✅ [PASS] Brand UI dictionary configured with style & portfolio descriptions.\n');
  passedCount++;

  // =========================================================================
  // SECTION 4: PIPELINE EXECUTION FAILURE REGRESSION & PAYLOAD RESILIENCE
  // =========================================================================
  console.log('--- SECTION 4: Pipeline Execution Failure Regression & Payload Resilience ---');

  // Test 4.1: Candidate sanitization strips large Data URIs while preserving all evaluation metadata
  console.log('▶ Test 4.1: sanitizePipelineCandidates strips heavy base64 Data URIs while preserving metadata');
  const heavyDataUri = 'data:image/jpeg;base64,' + 'A'.repeat(2 * 1024 * 1024); // 2MB simulated photo Data URI
  const rawCandidateWithHeavyMedia = [
    {
      id: 'creator-heavy-1',
      name: 'Heavy Media Creator',
      avatar: 'data:image/png;base64,' + 'B'.repeat(5000),
      specialty: 'Generative Visual Direction',
      capabilities: ['Cinematic Direction'],
      tools: ['Midjourney v6'],
      commercialLicensingVerified: true,
      projects: [
        {
          id: 'proj-heavy-1',
          title: 'Heavy Project Title',
          creativeStyle: 'Cinematic',
          category: 'Luxury Fashion',
          format: '4K Stills',
          image: heavyDataUri,
          storagePath: 'portfolio/creator-heavy-1/photo1.jpg',
          media: [
            {
              id: 'm-heavy-1',
              url: heavyDataUri,
              storagePath: 'portfolio/creator-heavy-1/photo1.jpg',
              mediaType: 'image'
            }
          ]
        }
      ]
    }
  ];

  const sanitized = sanitizePipelineCandidates(rawCandidateWithHeavyMedia);
  assert.equal(sanitized.length, 1);
  assert.equal(sanitized[0].id, 'creator-heavy-1');
  assert.equal(sanitized[0].projects[0].creativeStyle, 'Cinematic', 'Metadata creativeStyle must be preserved');
  assert.equal(sanitized[0].projects[0].format, '4K Stills', 'Metadata format must be preserved');
  assert.ok(!sanitized[0].projects[0].image.startsWith('data:'), 'Heavy Data URI must be stripped from project image');
  assert.equal(sanitized[0].projects[0].image, 'portfolio/creator-heavy-1/photo1.jpg', 'Storage path used as reference');
  assert.ok(!sanitized[0].projects[0].media[0].url.startsWith('data:'), 'Heavy Data URI must be stripped from media url');
  console.log('  ✅ [PASS] Candidate sanitization replaced heavy binary payloads with lightweight references without metadata loss.');
  passedCount++;

  // Test 4.2: Client-side executeCampaignFilteringPipeline succeeds with portfolio-laden candidate pool
  console.log('▶ Test 4.2: executeCampaignFilteringPipeline succeeds with candidate pool containing portfolio media');
  const clientExecResult = await executeCampaignFilteringPipeline(campaign, rawCandidateWithHeavyMedia);
  assert.equal(clientExecResult.ok, true, 'Pipeline execution must return ok: true');
  assert.ok(clientExecResult.summary, 'Summary must exist');
  assert.equal(clientExecResult.summary.totalCandidates, 1);
  console.log('  ✅ [PASS] executeCampaignFilteringPipeline executed and returned structured trace.');
  passedCount++;

  // Test 4.3: Server middleware accepts requests > 1MB without throwing "Payload too large"
  console.log('▶ Test 4.3: Server groqMiddleware handles requests > 1MB without throwing "Payload too large"');
  const middleware = createGroqMiddleware();
  const reqLarge = new EventEmitter();
  reqLarge.url = '/api/pipeline/filter';
  reqLarge.method = 'POST';
  reqLarge.headers = { 'content-type': 'application/json' };

  let statusLarge = null;
  let bodyLarge = null;
  const resLarge = {
    statusCode: 200,
    setHeader() {},
    end(p) {
      statusLarge = this.statusCode;
      if (p) try { bodyLarge = JSON.parse(p); } catch (e) {}
    }
  };

  const largePayloadPromise = new Promise(resolve => {
    const origEnd = resLarge.end.bind(resLarge);
    resLarge.end = (p) => {
      origEnd(p);
      resolve();
    };
  });

  middleware(reqLarge, resLarge, () => {});
  // Send 1.5MB request payload (would throw "Payload too large" under old 1MB limit)
  const simulated15MBString = 'X'.repeat(1500000);
  const largeRequestPayload = JSON.stringify({
    campaign,
    creators: [
      {
        id: 'creator-large-payload',
        name: 'Large Payload Creator',
        specialty: 'Generative Visual Direction',
        capabilities: ['Cinematic Direction'],
        tools: ['Midjourney v6'],
        notes: simulated15MBString,
        commercialLicensingVerified: true,
        projects: [{ id: 'p-1', title: 'P1', creativeStyle: 'Cinematic' }]
      }
    ]
  });

  reqLarge.emit('data', largeRequestPayload);
  reqLarge.emit('end');
  await largePayloadPromise;

  assert.equal(statusLarge, 200, 'Server must return 200 for payload > 1MB');
  assert.equal(bodyLarge.ok, true, 'Server must return ok: true');
  assert.ok(bodyLarge.rankedCreators, 'Must include rankedCreators');
  console.log('  ✅ [PASS] Server groqMiddleware successfully processed > 1MB payload without error.');
  passedCount++;

  // Test 4.4: Server middleware rejects payloads > 50MB with HTTP 413 PAYLOAD_TOO_LARGE
  console.log('▶ Test 4.4: Server groqMiddleware enforces 50MB ceiling with HTTP 413 PAYLOAD_TOO_LARGE');
  const reqOversized = new EventEmitter();
  reqOversized.url = '/api/pipeline/filter';
  reqOversized.method = 'POST';
  reqOversized.headers = { 'content-type': 'application/json' };
  reqOversized.destroy = () => {};

  let statusOversized = null;
  let bodyOversized = null;
  const resOversized = {
    statusCode: 200,
    setHeader() {},
    end(p) {
      statusOversized = this.statusCode;
      if (p) try { bodyOversized = JSON.parse(p); } catch (e) {}
    }
  };

  const oversizedPromise = new Promise(resolve => {
    const origEnd = resOversized.end.bind(resOversized);
    resOversized.end = (p) => {
      origEnd(p);
      resolve();
    };
  });

  middleware(reqOversized, resOversized, () => {});
  // Send a chunk that exceeds 50MB
  const chunk51MB = Buffer.alloc(51 * 1024 * 1024);
  reqOversized.emit('data', chunk51MB);
  await oversizedPromise;

  assert.equal(statusOversized, 413, 'Oversized payload must return HTTP 413');
  assert.equal(bodyOversized.ok, false);
  assert.equal(bodyOversized.code, 'PAYLOAD_TOO_LARGE');
  console.log('  ✅ [PASS] Server strictly enforces HTTP 413 PAYLOAD_TOO_LARGE above 50MB.\n');
  passedCount++;

  console.log('====================================================');
  console.log(`🎉 ALL ${passedCount} PERSISTENCE & PIPELINE TESTS PASSED CLEANLY!`);
  console.log('====================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
