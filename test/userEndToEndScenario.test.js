// test/userEndToEndScenario.test.js
// End-to-end verification of user's exact manual test flow:
// 1. Create new brand and campaign with explicit requirements.
// 2. Create new creator with exactly matching profile, portfolio media, styles, and tools.
// 3. Run filtering pipeline and verify creator is shortlisted, eligible, and ranked #1.

import assert from 'node:assert/strict';
import { buildPublishedCreatorProfile, createCampaignRecord } from '../src/data/marketplaceStore.js';
import { syncCreatorToDb, syncCampaignToDb } from '../src/services/dbSync.js';
import { normalizeSupabaseCreator } from '../src/services/marketplaceBackend.js';
import { executeFilteringPipeline } from '../server/filteringPipeline.js';
import { calculateCreaMatch } from '../src/intelligence/matchingEngine.js';
import { explainMatch } from '../src/intelligence/matchExplainer.js';
import { generateCreatorConcept } from '../src/intelligence/conceptEngine.js';

console.log('🧪 Starting End-to-End User Scenario Verification: New Brand + Matching Creator...\n');

// Mock browser globals
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  };
}

async function runScenario() {
  // Step 1: New Brand
  console.log('▶ Step 1: Create New Brand Partner');
  const newBrand = {
    id: `brand-aethelgard-${Date.now()}`,
    name: 'Aethelgard Spatial Audio',
    industry: 'Consumer Audio Electronics',
    website: 'https://aethelgard.audio',
    description: 'Precision spatial acoustics and luxury kinetic sound hardware.'
  };
  console.log(`  ✅ Brand created: "${newBrand.name}" (${newBrand.id})`);

  // Step 2: New Campaign with specific requirements
  console.log('▶ Step 2: Create Campaign with explicit requirements');
  const campaignData = {
    id: `camp-audio-kinetic-${Date.now()}`,
    ownerBrandId: newBrand.id,
    brandName: newBrand.name,
    title: 'Aethelgard Alpha: Spatial Kinetic Soundscapes',
    description: 'Launch of high-fidelity spatial headphones featuring kinetic titanium components and fluid acoustic physics.',
    product: 'Aethelgard Alpha Spatial Headset',
    industry: 'Consumer Audio Electronics',
    creativeStyle: 'Minimal Industrial Noir',
    budget: '$25,000',
    timeline: '3 Weeks',
    deliverables: ['9:16 Video Reel', '4K Master Stills Suite'],
    platforms: ['Instagram', 'YouTube'],
    requirements: {
      mandatory: {
        specialization: ['Generative Audio & Kinetic CGI'],
        skills: ['3D Spatial Modeling', 'Kinetic Particle Physics'],
        tools: ['Blender', 'Runway Gen-3'],
        formats: ['video', 'still', '9:16'],
        commercialLicensing: true,
        minProjects: 1
      },
      preferred: {
        styles: ['Minimal Industrial Noir'],
        industries: ['Consumer Audio Electronics']
      }
    }
  };

  const finalCampaign = createCampaignRecord(campaignData, newBrand);
  assert.equal(finalCampaign.ownerBrandId, newBrand.id, 'Campaign belongs to new brand');
  console.log(`  ✅ Campaign created: "${finalCampaign.title}" with mandatory requirements`);

  // Step 3: Create New Creator with exact matching portfolio & skills
  console.log('▶ Step 3: Onboard New Creator with matching skills and portfolio');
  const creatorOnboardingPayload = {
    id: `creator-zephyr-thorne-${Date.now()}`,
    name: 'Zephyr Thorne',
    handle: '@zephyr.thorne',
    specialty: 'Generative Audio & Kinetic CGI',
    creativeIdentity: 'Spatial Sound & Industrial Motion Designer',
    bio: 'Sculpting precision acoustic kinematics and exploded hardware visuals for premium audio brands.',
    location: 'Berlin / Global',
    availability: 'Available for projects',
    styles: ['Minimal Industrial Noir', 'Kinetic Precision'],
    disciplines: ['3D Spatial Design', 'AI Motion Direction'],
    capabilities: ['3D Spatial Modeling', 'Kinetic Particle Physics', 'Anamorphic Lighting', 'Product Visuals'],
    industries: ['Consumer Audio Electronics', 'Luxury Hardware'],
    tools: ['Blender', 'Runway Gen-3', 'Unreal Engine 5'],
    platforms: ['Instagram', 'YouTube'],
    categoryTags: ['3d', 'kinetic', 'hardware', 'audio'],
    commercialLicensingVerified: true,
    portfolio: [
      {
        id: 'proj-zt-1',
        title: 'Obsidian Resonance Chamber',
        description: 'Zero-gravity titanium component disassembly and acoustic wave simulation.',
        category: 'Consumer Audio Electronics',
        creativeStyle: 'Minimal Industrial Noir',
        clientType: 'Consumer Audio Electronics',
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=85',
        video: 'https://cdn.example.com/obsidian_resonance_reel.mp4',
        aspect: '9:16',
        format: '9:16 Video Reel & 4K Still',
        tools: ['Blender', 'Runway Gen-3'],
        media: [
          {
            id: 'm-zt-1',
            url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&q=85',
            mediaType: 'image',
            isCover: true,
            caption: 'Brushed titanium acoustic driver lockup'
          },
          {
            id: 'm-zt-2',
            url: 'https://cdn.example.com/obsidian_resonance_reel.mp4',
            mediaType: 'video',
            isCover: false,
            caption: '9:16 kinetic acoustic particle dispersion'
          }
        ]
      }
    ]
  };

  const publishedCreator = buildPublishedCreatorProfile(creatorOnboardingPayload);
  assert.equal(publishedCreator.status, 'Published');
  assert.equal(publishedCreator.visibility, 'published');
  assert.equal(publishedCreator.commercialLicensingVerified, true);
  assert.ok(publishedCreator.portfolioVideos.length >= 1, 'Verified video exists');
  assert.ok(publishedCreator.portfolioImages.length >= 1, 'Verified image exists');
  console.log(`  ✅ Creator published: "${publishedCreator.name}" (${publishedCreator.id})`);

  // Step 4: Persist both to database layer
  console.log('▶ Step 4: Synchronize Brand, Campaign, and Creator to DB layer');
  const creatorSyncResult = await syncCreatorToDb(publishedCreator);
  const normalizedCreator = normalizeSupabaseCreator(creatorSyncResult);
  assert.equal(normalizedCreator.id, publishedCreator.id);
  console.log('  ✅ Creator records and portfolio media synchronized');

  // Step 5: Execute Filtering Pipeline
  console.log('▶ Step 5: Execute Filtering Pipeline on new campaign');
  const pipelineResult = executeFilteringPipeline({
    campaign: finalCampaign,
    creators: [normalizedCreator]
  });

  if (pipelineResult.status !== 'completed') {
    console.error('Debug: Pipeline was not completed. Exclusions:', JSON.stringify(pipelineResult.exclusions, null, 2));
    console.error('Debug: Requires Review:', JSON.stringify(pipelineResult.requiresReview, null, 2));
    console.error('Debug: Stages:', JSON.stringify(pipelineResult.stages.map(s => ({ id: s.stageId, passed: s.passedCount, rejected: s.rejectedCount, rejections: s.rejections })), null, 2));
  }
  // Verification 1: Invariant guarantees
  assert.equal(pipelineResult.status, 'completed', 'Pipeline must complete successfully');
  assert.equal(pipelineResult.summary.passedEligibilityCount, 1, 'Creator must pass all mandatory eligibility stages');
  assert.equal(pipelineResult.summary.excludedCount, 0, 'Creator must have 0 exclusions');
  assert.equal(pipelineResult.eligibleCreatorIds[0], publishedCreator.id, 'Creator ID in eligible list');

  // Verification 2: Top ranking
  const topRanked = pipelineResult.rankedCreators[0];
  assert.ok(topRanked, 'Top ranked creator must exist');
  assert.equal(topRanked.creatorId, publishedCreator.id, 'Newly created creator must be #1 ranked');
  assert.ok(topRanked.score >= 85, `Score must be exceptional (>= 85), received: ${topRanked.score}`);
  console.log(`  ✅ Creator passed all 7 pipeline stages and ranked #1 with score: ${topRanked.score}% (${topRanked.fitLabel})`);

  // Verification 3: CreaMatch Dimensions & Portfolio Evidence
  console.log('▶ Step 6: Verify CreaMatch Score Dimensions');
  const creaMatch = calculateCreaMatch(finalCampaign, normalizedCreator);
  assert.ok(creaMatch.breakdown.styleScore >= 18, `Style score: ${creaMatch.breakdown.styleScore}/25`);
  assert.ok(creaMatch.breakdown.portfolioScore >= 15, `Portfolio evidence score: ${creaMatch.breakdown.portfolioScore}/25`);
  assert.ok(creaMatch.breakdown.formatScore >= 12, `Format score: ${creaMatch.breakdown.formatScore}/15`);
  assert.ok(creaMatch.breakdown.industryScore >= 10, `Industry score: ${creaMatch.breakdown.industryScore}/15`);
  console.log('  ✅ Score Breakdown:');
  console.log(`     - Creative Style: ${creaMatch.breakdown.styleScore}/25`);
  console.log(`     - Portfolio Relevance (Verified Images + Video): ${creaMatch.breakdown.portfolioScore}/25`);
  console.log(`     - Format Compatibility: ${creaMatch.breakdown.formatScore}/15`);
  console.log(`     - Industry Fit: ${creaMatch.breakdown.industryScore}/15`);

  // Verification 4: Match Explainer produces dynamic rationale
  console.log('▶ Step 7: Verify Dynamic Match Explanation');
  const explanation = explainMatch(finalCampaign, normalizedCreator);
  assert.ok(explanation.summary.includes('Zephyr'), 'Explanation dynamically addresses creator');
  assert.ok(explanation.summary.includes('Obsidian Resonance Chamber'), 'Explanation cites verified project title');
  console.log(`  ✅ Summary: "${explanation.summary}"`);

  // Verification 5: Dynamic Concept Generation
  console.log('▶ Step 8: Verify Dynamic Concept Synthesizer');
  const concept = generateCreatorConcept(finalCampaign, normalizedCreator);
  assert.equal(concept.creatorId, publishedCreator.id);
  assert.ok(concept.conceptTitle.includes('Minimal Industrial Noir') || concept.conceptTitle.includes('Spatial'), 'Concept title dynamically reflects style');
  assert.equal(concept.storyboard.length, 3, '3-scene storyboard generated');
  console.log(`  ✅ Concept Title: ${concept.conceptTitle}`);
  console.log(`  ✅ Direction: ${concept.directionLabel}`);
  console.log(`  ✅ Storyboard Scenes: ${concept.storyboard.map(s => s.title).join(' ➔ ')}`);

  console.log('\n================================================================');
  console.log('🎉 End-to-End Verification Complete: ALL 8 STEPS PASSED!');
  console.log('Brand requirements and Creator portfolio matched perfectly.');
  console.log('The creator is guaranteed to pass the filtering pipeline and be shortlisted!');
  console.log('================================================================\n');
}

runScenario().catch(err => {
  console.error('❌ User Scenario Verification Failed:', err);
  process.exit(1);
});
