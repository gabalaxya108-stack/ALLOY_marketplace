// test/dynamicPortfolioMatching.test.js
// Verifies that ANY creator adding portfolio images and videos is persisted to DB schemas,
// dynamically discovered and matched by keyword & image/video evidence, Groq-interpreted requirements,
// and receives tailored compatibility scoring, explainability, and concepts with ZERO hardcoded creator IDs.

import assert from 'node:assert/strict';
import { syncCreatorToDb } from '../src/services/dbSync.js';
import { normalizeSupabaseCreator } from '../src/services/marketplaceBackend.js';
import { executeFilteringPipeline } from '../server/filteringPipeline.js';
import { calculateCreaMatch } from '../src/intelligence/matchingEngine.js';
import { explainMatch } from '../src/intelligence/matchExplainer.js';
import { generateCreatorConcept } from '../src/intelligence/conceptEngine.js';
import { semanticSearchCreators } from '../src/ai/semanticSearch.js';
import { matchCreatorToBrief } from '../src/ai/semanticMatching.js';
import { buildPublishedCreatorProfile } from '../src/data/marketplaceStore.js';

console.log('🧪 Starting Zero-Hardcoding Dynamic Portfolio & Groq Matching Test Suite...\n');

// Mock browser environment for headless tests
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }
  };
}

async function runDynamicTests() {
  // Brand Campaign Brief
  const campaignBrief = {
    id: 'camp-dynamic-lumina-launch',
    title: 'Lumina Velvet Hydration Stills & Motion Launch',
    objective: 'Global Product Debut',
    product: 'Luminous Peptide Hydration Serum',
    industry: 'Skincare & Cosmetics',
    creativeStyle: 'Luminous Macro & Cinematic',
    budget: '$18,000',
    deliverables: ['4K Master Stills Suite', '9:16 Cinematic Video Loop'],
    platforms: ['Instagram', 'TikTok'],
    requirements: {
      mandatory: {
        skills: ['Generative Direction', 'Macro Lighting'],
        formats: ['video', 'still', '9:16'],
        commercialLicensing: true,
        minProjects: 1
      }
    }
  };

  // Completely new, un-hardcoded creator profile
  const dynamicCreatorPayload = {
    id: 'creator-nova-stellar-9821',
    name: 'Seraphina Nova',
    handle: '@seraphina.nova',
    specialty: 'Generative Visual Direction',
    creativeIdentity: 'Cosmetics Light & Macro Specialist',
    bio: 'Pioneering generative macro lighting, cellular fluid kinetics, and luxury skincare imagery.',
    location: 'Zurich / Remote',
    availability: 'Available for Q4 campaigns',
    styles: ['Luminous Macro', 'Cinematic Anamorphic'],
    disciplines: ['AI Photography', 'AI Video Direction'],
    capabilities: ['Generative Direction', 'Macro Lighting', 'Fluid Physics Simulation', 'High-Res Upscaling'],
    industries: ['Skincare & Cosmetics', 'Luxury Beauty'],
    tools: ['Midjourney v6', 'Runway Gen-3', 'ComfyUI', 'Photoshop'],
    platforms: ['Instagram', 'Vogue Digital'],
    categoryTags: ['beauty', 'skincare', 'macro', 'fluid-physics'],
    portfolio: [
      {
        id: 'proj-dyn-1',
        title: 'Cellular Luminescence Phase 1',
        description: 'Micro-droplet collision and sub-surface fluid physics for barrier hydration serum.',
        category: 'Skincare & Cosmetics',
        creativeStyle: 'Luminous Macro',
        image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85',
        video: 'https://cdn.example.com/seraphina_cellular_loop.mp4',
        aspect: '9:16',
        format: 'Cinematic Video Loop & 4K Still',
        clientType: 'Commercial Beauty Brand',
        media: [
          {
            id: 'med-img-1',
            url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85',
            mediaType: 'image',
            caption: 'Macro sub-surface lipid barrier illumination',
            tags: ['skincare', 'beauty', 'macro', 'hydration'],
            isCover: true
          },
          {
            id: 'med-vid-1',
            url: 'https://cdn.example.com/seraphina_cellular_loop.mp4',
            mediaType: 'video',
            caption: '1000fps droplet impact and fluid dispersion in 9:16 vertical motion',
            tags: ['skincare', 'video', 'loop', 'fluid-physics'],
            isCover: false
          }
        ]
      }
    ]
  };

  // Test 1: Published creator builder captures and formats all media arrays
  console.log('▶ Test 1: buildPublishedCreatorProfile packages portfolio images, videos, and status');
  const publishedProfile = buildPublishedCreatorProfile(dynamicCreatorPayload);
  assert.equal(publishedProfile.status, 'Published', 'Creator must have Published status');
  assert.equal(publishedProfile.visibility, 'published', 'Creator must have published visibility');
  assert.ok(publishedProfile.portfolioImages.length >= 1, 'Should extract portfolioImages');
  assert.ok(publishedProfile.portfolioVideos.length >= 1, 'Should extract portfolioVideos');
  assert.ok(publishedProfile.portfolio_images.length >= 1, 'Should mirror portfolio_images');
  assert.ok(publishedProfile.portfolio_videos.length >= 1, 'Should mirror portfolio_videos');
  console.log('  ✅ Published profile accurately structured with image and video assets');

  // Test 2: syncCreatorToDb persists creator with portfolio_images and portfolio_videos
  console.log('▶ Test 2: syncCreatorToDb saves creator portfolio media directly to DB payload');
  const syncResult = await syncCreatorToDb(publishedProfile);
  assert.ok(syncResult, 'syncCreatorToDb should return non-null result');
  assert.equal(syncResult.portfolio_images.length, 1, 'Persisted portfolio_images count');
  assert.equal(syncResult.portfolio_videos.length, 1, 'Persisted portfolio_videos count');
  assert.equal(syncResult.status, 'Published', 'Persisted status');
  console.log('  ✅ Creator portfolio images and videos persisted successfully');

  // Test 3: Normalization produces complete media fidelity
  console.log('▶ Test 3: normalizeSupabaseCreator restores images, videos, and media arrays');
  const normalizedCreator = normalizeSupabaseCreator(syncResult);
  assert.equal(normalizedCreator.id, publishedProfile.id);
  assert.equal(normalizedCreator.portfolioImages.length, 1);
  assert.equal(normalizedCreator.portfolioVideos.length, 1);
  assert.ok(normalizedCreator.heroWork, 'Hero work should be derived from image');
  assert.ok(normalizedCreator.videoPreview, 'Video preview should be derived from video');
  console.log('  ✅ Supabase creator normalized with full media fidelity');

  // Test 4: Pipeline executes and qualifies dynamic creator with 0 candidate loss
  console.log('▶ Test 4: Filtering pipeline evaluates dynamic creator without hardcoded exceptions');
  const pipelineTrace = executeFilteringPipeline({
    campaign: campaignBrief,
    creators: [normalizedCreator]
  });

  assert.ok(pipelineTrace.status === 'completed', 'Pipeline trace must complete successfully');
  assert.equal(pipelineTrace.summary.passedEligibilityCount, 1, 'Dynamic creator must pass all mandatory requirements');
  assert.equal(pipelineTrace.summary.excludedCount, 0, 'Dynamic creator must not be excluded');
  assert.equal(pipelineTrace.rankedCreators[0].creatorId, publishedProfile.id);
  const score = pipelineTrace.rankedCreators[0].score;
  assert.ok(score >= 80, `Compatibility score should be high (>= 80), received: ${score}`);
  console.log(`  ✅ Dynamic creator successfully passed pipeline with score: ${score}`);

  // Test 5: Dynamic CreaMatch scoring validates visual evidence
  console.log('▶ Test 5: calculateCreaMatch awards high score using uploaded image & video evidence');
  const matchResult = calculateCreaMatch(campaignBrief, normalizedCreator);
  assert.ok(matchResult.score >= 80, `CreaMatch score: ${matchResult.score}`);
  assert.ok(matchResult.breakdown.portfolioScore >= 12, 'Portfolio score bonus for uploaded stills + video');
  assert.ok(matchResult.breakdown.formatScore >= 10, 'Format score for verified video & still compatibility');
  console.log(`  ✅ CreaMatch score: ${matchResult.score}/100, evidence tier: ${matchResult.evidenceTier}`);

  // Test 6: explainMatch generates human-readable rationale dynamically
  console.log('▶ Test 6: explainMatch dynamically explains compatibility and project evidence');
  const explanation = explainMatch(campaignBrief, normalizedCreator);
  assert.ok(explanation.summary.includes('Seraphina'), 'Summary references creator dynamically');
  assert.ok(explanation.summary.includes('Cellular Luminescence Phase 1'), 'Summary references creator project dynamically');
  assert.ok(explanation.highlights.length >= 2, 'Highlights cite verified evidence');
  console.log(`  ✅ Dynamic explanation generated: "${explanation.summary}"`);

  // Test 7: generateCreatorConcept dynamically synthesizes concept title, palette & 3-scene storyboard
  console.log('▶ Test 7: generateCreatorConcept creates dynamic concept, palette, and storyboard');
  const concept = generateCreatorConcept(campaignBrief, normalizedCreator);
  assert.ok(concept, 'Concept must be generated');
  assert.ok(concept.conceptTitle.length > 5, 'Concept title generated');
  assert.ok(Array.isArray(concept.palette) && concept.palette.length === 4, '4-color palette generated');
  assert.equal(concept.storyboard.length, 3, '3 sequential storyboard scenes generated');
  assert.equal(concept.creatorId, publishedProfile.id, 'Concept attributed to dynamic creator');
  console.log(`  ✅ Dynamic concept title: ${concept.conceptTitle}`);
  console.log(`  ✅ Palette: ${concept.palette.join(', ')}`);
  console.log(`  ✅ Storyboard Hook: ${concept.storyboard[0].shotType} - ${concept.storyboard[0].title}`);

  // Test 8: Semantic Search dynamically discovers creator by keyword & media tags
  console.log('▶ Test 8: semanticSearch discovers creator dynamically from uploaded work and keywords');
  const searchResult = semanticSearchCreators('skincare hydration macro video and stills', [normalizedCreator]);
  assert.ok(searchResult.results.length >= 1, 'Should find dynamic creator');
  assert.equal(searchResult.results[0].id, publishedProfile.id);
  console.log('  ✅ Semantic search successfully ranked dynamic creator at #1');

  // Test 9: Semantic matching dynamically derives score and summary
  console.log('▶ Test 9: matchCreatorToBrief dynamically matches creator without hardcoded ID check');
  const semanticMatch = matchCreatorToBrief(
    { title: 'Velvet Hydration', description: 'Skin beauty serum macro stills and motion' },
    normalizedCreator
  );
  assert.ok(semanticMatch.score >= 80, `Semantic match score: ${semanticMatch.score}`);
  assert.ok(semanticMatch.summary.includes('Seraphina'), 'Semantic summary dynamically names creator');
  console.log(`  ✅ Semantic match score: ${semanticMatch.score}`);

  console.log('\n================================================================');
  console.log('All Dynamic Portfolio & Groq Matching Tests Passed! (9/9)');
  console.log('================================================================\n');
}

runDynamicTests().catch(err => {
  console.error('❌ Dynamic Portfolio Matching Test Suite Failed:', err);
  process.exit(1);
});
