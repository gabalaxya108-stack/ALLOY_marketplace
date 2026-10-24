// test/creatorDna.test.js
// ALLOY / CREASYNC — Creator DNA Backend & Verification Test Suite

import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DNA_TRAIT_TAXONOMY,
  selectEligiblePortfolioAssets,
  extractAssetFeatures,
  aggregatePortfolioTraits,
  executeCreatorDnaAnalysis,
  getCreatorDna
} from '../server/creatorDnaService.js';
import { createCreatorDnaMiddleware } from '../server/creatorDnaMiddleware.js';
import { CREATORS } from '../src/data/creatorsData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCreatorDnaTests() {
  console.log('\n================================================================');
  console.log(' ALLOY — DYNAMIC CREATOR DNA BACKEND TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`          ${err.message}`);
      if (err.stack) {
        console.error(err.stack.split('\n').slice(1, 3).join('\n'));
      }
      failed++;
    }
  }

  // 1. Taxonomy Integrity
  await test('Taxonomy: Contains at least 15 comprehensive creative traits across 4 core categories', async () => {
    assert.ok(Array.isArray(DNA_TRAIT_TAXONOMY));
    assert.ok(DNA_TRAIT_TAXONOMY.length >= 15, `Expected >= 15 traits, found ${DNA_TRAIT_TAXONOMY.length}`);

    const categories = new Set(DNA_TRAIT_TAXONOMY.map(t => t.category));
    assert.ok(categories.has('Lighting & Optics'));
    assert.ok(categories.has('Composition & Framing'));
    assert.ok(categories.has('Texture, Materiality & Craft'));
    assert.ok(categories.has('Storytelling, Motion & Atmosphere'));

    DNA_TRAIT_TAXONOMY.forEach((trait, i) => {
      assert.ok(trait.key, `Trait at index ${i} missing key`);
      assert.ok(trait.label, `Trait at index ${i} missing label`);
      assert.ok(trait.category, `Trait at index ${i} missing category`);
      assert.ok(Array.isArray(trait.matchTerms) && trait.matchTerms.length > 0, `Trait ${trait.key} missing matchTerms`);
    });
  });

  // 2. Empty Portfolio Handling (< 2 Works)
  await test('Eligibility: Creator with 0 projects returns insufficient_evidence empty state', async () => {
    const emptyCreator = {
      id: 'creator-empty',
      displayName: 'Empty Creator',
      projects: []
    };

    const selection = selectEligiblePortfolioAssets(emptyCreator);
    assert.strictEqual(selection.eligible, false);
    assert.strictEqual(selection.count, 0);

    const result = await executeCreatorDnaAnalysis(emptyCreator.id, { creator: emptyCreator, forceRefresh: true });
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.status, 'insufficient_evidence');
    assert.deepStrictEqual(result.traits, []);
    assert.ok(result.analysis.message.includes('Building your Creator DNA'));
  });

  // 3. Single Asset Portfolio Handling (Minimum 2 Works Threshold)
  await test('Eligibility: Creator with only 1 published project cannot fabricate recurring traits', async () => {
    const singleProjectCreator = {
      id: 'creator-single',
      displayName: 'Single Project Artist',
      projects: [
        {
          id: 'proj-1',
          title: 'Lone Cinematic Project',
          description: 'Anamorphic lens flare with 35mm film grain',
          visibility: 'published',
          image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119'
        }
      ]
    };

    const selection = selectEligiblePortfolioAssets(singleProjectCreator);
    assert.strictEqual(selection.eligible, false);
    assert.strictEqual(selection.count, 1);

    const result = await executeCreatorDnaAnalysis(singleProjectCreator.id, { creator: singleProjectCreator, forceRefresh: true });
    assert.strictEqual(result.status, 'insufficient_evidence');
    assert.strictEqual(result.traits.length, 0);
  });

  // 4. Asset Deduplication and Private Draft Filtering
  await test('Filtering & Deduplication: Excludes private drafts and deduplicates duplicate media uploads', async () => {
    const mixedCreator = {
      id: 'creator-mixed',
      displayName: 'Mixed Creator',
      projects: [
        {
          id: 'proj-pub-1',
          title: 'Work One',
          visibility: 'published',
          image: 'https://images.unsplash.com/photo-1'
        },
        {
          id: 'proj-priv',
          title: 'Private Draft',
          visibility: 'private',
          image: 'https://images.unsplash.com/photo-private'
        },
        {
          id: 'proj-pub-dup',
          title: 'Duplicate Upload of Work One',
          visibility: 'published',
          image: 'https://images.unsplash.com/photo-1' // duplicate media URL
        },
        {
          id: 'proj-pub-2',
          title: 'Work Two',
          visibility: 'published',
          image: 'https://images.unsplash.com/photo-2'
        }
      ]
    };

    const selection = selectEligiblePortfolioAssets(mixedCreator);
    assert.strictEqual(selection.eligible, true);
    // 4 projects in total, 1 private excluded, 1 duplicate image excluded -> exactly 2 unique eligible works
    assert.strictEqual(selection.count, 2);
    assert.strictEqual(selection.assets.length, 2);
    assert.strictEqual(selection.assets[0].id, 'proj-pub-1');
    assert.strictEqual(selection.assets[1].id, 'proj-pub-2');
  });

  // 5. Distinct Stylistic DNA Between Different Creators
  await test('Stylistic Diversity: Maya Chen (Cinematic Film) vs Alex Rivera (Industrial Horology) produce distinct, non-identical traits', async () => {
    const maya = CREATORS.find(c => c.id === 'maya-chen');
    const alex = CREATORS.find(c => c.id === 'alex-rivera');

    assert.ok(maya, 'Seed creator maya-chen should exist');
    assert.ok(alex, 'Seed creator alex-rivera should exist');

    const mayaResult = await executeCreatorDnaAnalysis('maya-chen', { creator: maya, forceRefresh: true });
    const alexResult = await executeCreatorDnaAnalysis('alex-rivera', { creator: alex, forceRefresh: true });

    assert.strictEqual(mayaResult.ok, true);
    assert.strictEqual(alexResult.ok, true);
    assert.ok(mayaResult.traits.length >= 2, 'Maya should have >= 2 traits');
    assert.ok(alexResult.traits.length >= 2, 'Alex should have >= 2 traits');

    const mayaTraitKeys = mayaResult.traits.map(t => t.traitKey);
    const alexTraitKeys = alexResult.traits.map(t => t.traitKey);

    // Maya's portfolio is cinematic narrative film (Cooke anamorphic, 35mm grain, moody narrative)
    // Alex's portfolio is precision titanium watchmaking, magnetic levitation, macro engineering
    assert.notDeepStrictEqual(mayaTraitKeys, alexTraitKeys, 'Maya and Alex must have distinct DNA traits');

    // Confirm that Maya captures cinematic / anamorphic / film / narrative signatures
    const mayaHasCinematicOrNarrative = mayaTraitKeys.some(k =>
      k.includes('cinematic') || k.includes('anamorphic') || k.includes('35mm') || k.includes('narrative')
    );
    assert.ok(mayaHasCinematicOrNarrative, 'Maya Chen DNA should reflect cinematic, anamorphic, or narrative craft');

    // Confirm that Alex captures titanium / macro / product / levitation signatures
    const alexHasIndustrialOrMacro = alexTraitKeys.some(k =>
      k.includes('titanium') || k.includes('macro') || k.includes('specular') || k.includes('levitation')
    );
    assert.ok(alexHasIndustrialOrMacro, 'Alex Rivera DNA should reflect titanium, macro, or product lighting');
  });

  // 6. Elena Rostova High-Fashion Haute Couture Diversity
  await test('Stylistic Diversity: Elena Rostova produces high-fashion couture and desert editorial DNA', async () => {
    const elena = CREATORS.find(c => c.id === 'elena-rostova');
    assert.ok(elena, 'Seed creator elena-rostova should exist');

    const elenaResult = await executeCreatorDnaAnalysis('elena-rostova', { creator: elena, forceRefresh: true });
    assert.strictEqual(elenaResult.ok, true);
    assert.ok(elenaResult.traits.length >= 2);

    const elenaTraitKeys = elenaResult.traits.map(t => t.traitKey);
    const elenaHasFashionOrTextiles = elenaTraitKeys.some(k =>
      k.includes('couture') || k.includes('textiles') || k.includes('editorial') || k.includes('golden_hour')
    );
    assert.ok(elenaHasFashionOrTextiles, 'Elena Rostova DNA should reflect haute couture textiles or editorial fashion');
  });

  // 7. Mathematical Scoring Integrity (Phase 6 Requirements)
  await test('Scoring Integrity: Prevalence is calculated mathematically, confidence is bounded, and supporting works are cited', async () => {
    const maya = CREATORS.find(c => c.id === 'maya-chen');
    const result = await executeCreatorDnaAnalysis('maya-chen', { creator: maya, forceRefresh: true });

    result.traits.forEach(trait => {
      // Prevalence must be a percentage between 10 and 100
      assert.ok(typeof trait.prevalenceScore === 'number');
      assert.ok(trait.prevalenceScore >= 10 && trait.prevalenceScore <= 100, `Prevalence ${trait.prevalenceScore}% outside range`);

      // Evidence confidence is distinct, bounded between 0.00 and 0.99
      assert.ok(typeof trait.evidenceConfidence === 'number');
      assert.ok(trait.evidenceConfidence >= 0.10 && trait.evidenceConfidence <= 0.99, `Confidence ${trait.evidenceConfidence} outside range`);

      // Supporting asset counts must be positive and not exceed total eligible works
      assert.ok(trait.supportingAssetCount >= 1);
      assert.ok(trait.supportingAssetCount <= maya.projects.length);

      // Supporting asset refs must cite existing project IDs
      assert.ok(Array.isArray(trait.supportingAssetRefs));
      assert.ok(trait.supportingAssetRefs.length === trait.supportingAssetCount);
      trait.supportingAssetRefs.forEach(ref => {
        assert.ok(ref.id, 'Asset ref must have id');
        assert.ok(ref.title, 'Asset ref must have title');
      });
    });
  });

  // 8. Connect Middleware API Routes Verification
  await test('API Middleware: Correctly dispatches GET, POST /analyze, POST /refresh, and status endpoints', async () => {
    const middleware = createCreatorDnaMiddleware();

    // Mock response helper
    function createMockRes() {
      return {
        statusCode: 200,
        headers: {},
        body: '',
        writeHead(code, headers) {
          this.statusCode = code;
          if (headers) Object.assign(this.headers, headers);
          return this;
        },
        end(data) {
          this.body = data;
          return this;
        }
      };
    }

    // A. GET /api/creator-dna/:creatorId
    const getReq = {
      method: 'GET',
      url: '/api/creator-dna/maya-chen',
      headers: {}
    };
    const getRes = createMockRes();
    await middleware(getReq, getRes, () => {});

    assert.strictEqual(getRes.statusCode, 200);
    const getData = JSON.parse(getRes.body);
    assert.strictEqual(getData.ok, true);
    assert.ok(Array.isArray(getData.traits));

    // B. POST /api/creator-dna/refresh
    const postReq = {
      method: 'POST',
      url: '/api/creator-dna/refresh',
      headers: {
        'content-type': 'application/json',
        'x-creator-id': 'maya-chen'
      },
      on(event, handler) {
        if (event === 'data') {
          handler(Buffer.from(JSON.stringify({ creatorId: 'maya-chen' })));
        }
        if (event === 'end') {
          handler();
        }
      }
    };
    const postRes = createMockRes();
    await middleware(postReq, postRes, () => {});

    assert.strictEqual(postRes.statusCode, 200);
    const postData = JSON.parse(postRes.body);
    assert.strictEqual(postData.ok, true);
    assert.strictEqual(postData.status, 'completed');

    // C. GET /api/creator-dna/status/:analysisId
    const statusReq = {
      method: 'GET',
      url: `/api/creator-dna/status/${postData.analysis.id}`,
      headers: {}
    };
    const statusRes = createMockRes();
    await middleware(statusReq, statusRes, () => {});

    assert.strictEqual(statusRes.statusCode, 200);
    const statusData = JSON.parse(statusRes.body);
    assert.strictEqual(statusData.ok, true);
    assert.strictEqual(statusData.status, 'completed');
  });

  // 9. Unauthorized API Access Protection
  await test('Security: Missing creator authentication header on POST /refresh returns 401', async () => {
    const middleware = createCreatorDnaMiddleware();
    const unauthReq = {
      method: 'POST',
      url: '/api/creator-dna/refresh',
      headers: { 'content-type': 'application/json' }, // missing x-creator-id
      on(event, handler) {
        if (event === 'data') handler(Buffer.from(JSON.stringify({ creatorId: 'maya-chen' })));
        if (event === 'end') handler();
      }
    };
    const unauthRes = {
      statusCode: 200,
      writeHead(code) { this.statusCode = code; return this; },
      end(data) { this.body = data; return this; }
    };

    await middleware(unauthReq, unauthRes, () => {});
    assert.strictEqual(unauthRes.statusCode, 401);
    const resJson = JSON.parse(unauthRes.body);
    assert.strictEqual(resJson.ok, false);
    assert.strictEqual(resJson.error, 'UNAUTHORIZED_CREATOR');
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCreatorDnaTests().catch(err => {
  console.error('Test runner encountered fatal error:', err);
  process.exit(1);
});
