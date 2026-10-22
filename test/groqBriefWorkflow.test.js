// test/groqBriefWorkflow.test.js
// Focused Test Suite: Campaign Brief -> Groq Workflow Integration
// Verifies brief submission, Groq response parsing, separation from deterministic eligibility, and fallback handling.
// NOTE: Does NOT make real network or Groq API calls; mocks the provider per requirements.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeBriefAsync, analyzeBrief, normalizeAiBriefResponse } from '../src/ai/briefAnalyzer.js';
import { executeFilteringPipeline } from '../server/filteringPipeline.js';
import { CREATORS } from '../src/data/creatorsData.js';
import { ELIGIBILITY_STATUS, ELIGIBILITY_OUTCOMES } from '../src/intelligence/eligibilityEngine.js';

console.log('🧪 Starting Groq Campaign Brief Workflow Test Suite...\n');

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

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

// ============================================================================
// TEST 1: End-to-End Workflow: Brief -> Groq Interpretation -> Structured Requirements
// ============================================================================
await runAsyncTest('Workflow 1: Campaign brief sends to Groq provider and response produces structured requirements', async () => {
  const briefText = 'Looking for an AI video director to create 9:16 vertical reels for our luxury jewelry brand. Commercial license required.';

  // Mock Groq provider response (simulating server/groqService.js output)
  const mockGroqResponse = {
    title: 'Aura Fine Jewelry Launch',
    objective: 'Product Launch',
    productOrService: 'Fine Jewelry',
    industry: 'Luxury & High Fashion',
    targetAudience: 'Affluent luxury consumers',
    creativeDirection: 'Luminous macro refraction and warm golden hour specular highlights',
    creativeStyle: 'Cinematic, Luxury, Macro Specular',
    desiredTone: 'Refined and elevated',
    contentFormats: '9:16 Vertical Video Reels',
    deliverables: '3x 9:16 Vertical Reels, 2x Master Stills',
    preferredPlatforms: 'Instagram Reels',
    requiredCreatorCapabilities: ['AI Video', 'Macro Lighting'],
    budget: null,
    deadline: null,
    mandatoryRequirements: ['Commercial license required', '9:16 vertical video format'],
    optionalPreferences: ['Experience with luxury goods'],
    isFlexible: false,
    hasExplicitFormat: true
  };

  let providerCalledWith = null;
  const mockFetcher = async (prompt) => {
    providerCalledWith = prompt;
    return mockGroqResponse;
  };

  const result = await analyzeBriefAsync(briefText, { fetcher: mockFetcher });

  assert.strictEqual(providerCalledWith, briefText, 'Full campaign brief must be passed to the Groq provider');
  assert.strictEqual(result.source, 'groq-mock', 'Result must indicate Groq provider source');
  assert.strictEqual(result.isLiveAI, true, 'isLiveAI must be true when answered by Groq provider');
  assert.strictEqual(result.title, 'Aura Fine Jewelry Launch');
  assert.strictEqual(result.industry, 'Luxury & High Fashion');
  assert.strictEqual(result.hasExplicitFormat, true, 'Must preserve explicit format extracted by Groq');

  // Verify structured requirements object produced for deterministic pipeline
  assert(result.requirements, 'Structured requirements must be produced from Groq response');
  assert(Array.isArray(result.requirements.mandatory.skills), 'Mandatory skills must be an array');
  assert(result.requirements.mandatory.skills.includes('AI Video'), 'Mandatory skills must include AI Video');
  assert(result.requirements.mandatory.formats.includes('9:16 Vertical Video Reels'), 'Mandatory formats must contain 9:16 deliverable');
  assert.strictEqual(result.requirements.mandatory.commercialLicensing, true, 'Commercial licensing must be set to true');
});

// ============================================================================
// TEST 2: Hand-off to Deterministic Eligibility Pipeline
// ============================================================================
await runAsyncTest('Workflow 2: AI-interpreted requirements feed into deterministic eligibility without altering decision policy', async () => {
  const mockGroqResponse = {
    title: 'Solar Amber Fragrance Debut',
    industry: 'Luxury & Fragrance',
    budget: '$10,000',
    contentFormats: 'Cinematic 4K Video',
    requiredCreatorCapabilities: ['AI Video'],
    mandatoryRequirements: ['Enterprise commercial license required'],
    isFlexible: false,
    hasExplicitFormat: true
  };

  const analysis = normalizeAiBriefResponse(mockGroqResponse, 'Solar amber fragrance debut', 'solar amber fragrance debut', 'groq-mock');

  // Build campaign record as CampaignModal does
  const campaign = {
    id: 'camp-groq-hand-off-test',
    title: analysis.title,
    industry: analysis.industry,
    budget: analysis.budget,
    description: 'Solar amber fragrance debut',
    desiredCreatorSpecialties: ['AI Video'],
    requirements: analysis.requirements
  };

  // Maya Chen has commercialLicensingVerified: false in raw CREATORS, so she will fail licensing
  const maya = CREATORS.find(c => c.id === 'maya-chen');
  assert(maya, 'Maya Chen must exist in candidate pool');

  const result = executeFilteringPipeline({
    campaign,
    creators: [maya]
  });

  // Deterministic eligibility engine must decide outcome, NOT the LLM
  assert.strictEqual(result.summary.totalCandidates, 1);
  assert.strictEqual(result.rankedCreators.length, 0, 'Cannot pass deterministic filter due to unverified licensing');
  assert.strictEqual(result.exclusions.length, 1, 'Unverified licensing candidate must be in Exclusion Ledger');
  assert.strictEqual(result.exclusions[0].creatorId, 'maya-chen');
  assert.strictEqual(result.exclusions[0].code, 'COMMERCIAL_LICENSING_UNVERIFIED');
});

// ============================================================================
// TEST 3: Flexible Briefs Via Groq Never Invent Mandatory Constraints
// ============================================================================
await runAsyncTest('Workflow 3: Groq flexible brief response preserves open constraints across candidate pool', async () => {
  const briefText = 'Open to any creator, style, or format for this initiative';

  const mockGroqResponse = {
    title: 'Open Creative Initiative',
    objective: 'Brand Experimentation',
    industry: 'General Commercial',
    contentFormats: 'Open Multi-format',
    deliverables: 'Flexible assets',
    requiredCreatorCapabilities: [],
    mandatoryRequirements: [],
    isFlexible: true,
    hasExplicitFormat: false
  };

  const analysis = await analyzeBriefAsync(briefText, {
    fetcher: async () => mockGroqResponse
  });

  assert.strictEqual(analysis.isFlexible, true);
  assert.strictEqual(analysis.hasExplicitFormat, false);
  assert.deepStrictEqual(analysis.requirements.mandatory.formats, []);
  assert.deepStrictEqual(analysis.requirements.mandatory.skills, []);

  // Hand-off to deterministic pipeline
  const campaign = {
    id: 'camp-flexible-groq-test',
    title: analysis.title,
    desiredCreatorSpecialties: [],
    requirements: analysis.requirements
  };

  const result = executeFilteringPipeline({
    campaign,
    creators: CREATORS
  });

  assert.strictEqual(result.summary.totalCandidates, CREATORS.length);
  // Zero artificial exclusions for formats or specialties
  const artificialExclusions = result.exclusions.filter(
    e => e.code === 'FORMAT_UNSUPPORTED' || e.code === 'SPECIALIZATION_MISMATCH'
  );
  assert.strictEqual(artificialExclusions.length, 0, 'Must produce 0 artificial format/specialty exclusions');
});

// ============================================================================
// TEST 4: Fallback Resilience When Backend Groq Service Fails
// ============================================================================
await runAsyncTest('Workflow 4: analyzeBriefAsync falls back to deterministic rule engine when Groq fails', async () => {
  const prompt = 'Looking for an AI video director for an avant-garde fashion film';

  // Simulate remote network failure
  const failingFetcher = async () => {
    throw new Error('Network timeout connecting to Groq AI service');
  };

  const result = await analyzeBriefAsync(prompt, { fetcher: failingFetcher });

  assert(result, 'Must return a valid brief object despite Groq error');
  assert.strictEqual(result.source || 'deterministic', 'deterministic', 'Should cleanly execute fallback');
  assert(result.title.length > 0, 'Title must be extracted via deterministic fallback');
  assert(result.contentFormat.toLowerCase().includes('film') || result.contentFormat.toLowerCase().includes('video'));
  assert(result.requirements, 'Structured requirements must still be generated');
});

// ============================================================================
// TEST 5: API Key Isolation & Client Security
// ============================================================================
runTest('Workflow 5: Client-side files never reference or expose GROQ_API_KEY', () => {
  const clientFiles = [
    'src/ai/briefAnalyzer.js',
    'src/ai/groqClient.js',
    'src/ai/provider.js',
    'src/components/CampaignModal.jsx',
    'src/services/marketplaceBackend.js'
  ];

  for (const relPath of clientFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    assert(
      !content.includes('GROQ_API_KEY'),
      `Security violation: ${relPath} references GROQ_API_KEY directly. Keys must remain strictly in server-side code.`
    );
  }
});

console.log(`\n================================================================`);
console.log(` RESULTS: ${passedTests} / ${totalTests} Groq workflow tests passed successfully.`);
console.log(`================================================================\n`);
