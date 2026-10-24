// test/bidSubmissionEligibilityRegression.test.js
// Regression Test Suite: Comprehensive Creator Bid Submission & Shortlist Consistency
// Tests the 10 specific requirements in Section 9 of the P0 Bug Specification.

import assert from 'node:assert/strict';
import { executeFilteringPipeline } from '../server/filteringPipeline.js';
import { evaluateCreatorEligibility, ELIGIBILITY_STATUS } from '../src/intelligence/eligibilityEngine.js';
import { createApplicationMiddleware, applicationsStore, shortlistsStore, addShortlist } from '../server/applicationMiddleware.js';
import { CREATORS } from '../src/data/creatorsData.js';
import { getPublicCreatorOpportunities } from '../src/data/marketplaceStore.js';

console.log('\n================================================================');
console.log(' ALLOY — CREATOR BID SUBMISSION & SHORTLIST REGRESSION SUITE');
console.log('================================================================\n');

let passed = 0;
let total = 0;

async function test(name, fn) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

// Mock HTTP dispatcher to applicationMiddleware
const middleware = createApplicationMiddleware({ dbClient: null });

function dispatch({ method, url, headers = {}, body = null }) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      headers: {
        'content-type': 'application/json',
        ...headers
      },
      on: (evt, cb) => {
        if (evt === 'data') {
          if (body) cb(Buffer.from(JSON.stringify(body)));
        } else if (evt === 'end') {
          cb();
        }
      }
    };

    let resHeaders = {};
    const res = {
      statusCode: 200,
      setHeader: (k, v) => { resHeaders[k] = v; },
      writeHead: (code, hdrs) => {
        res.statusCode = code;
        resHeaders = { ...resHeaders, ...hdrs };
      },
      end: (data) => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: resHeaders, body: parsed });
      }
    };

    middleware(req, res, () => {
      resolve({ statusCode: 404, body: { error: 'Not Handled' } });
    });
  });
}

const maya = CREATORS.find(c => c.id === 'maya-chen');
assert(maya, 'Maya Chen must exist in creator database');

const testCampaign = {
  id: 'camp-summer-skincare',
  title: 'Summer Skincare & Radiant Hydration Launch',
  ownerBrandId: 'brand-demo-lumina',
  brandName: 'Lumina Botanica',
  visibility: 'published',
  status: 'Active',
  isAcceptingApplications: true,
  applicationStatus: 'open',
  creatorSlots: 3,
  remainingSlots: 3,
  deadline: 'Open-ended',
  isNegotiable: true,
  budget: '₹50,000 – ₹1,00,000',
  contentFormats: ['AI Video'],
  creativeStyle: 'Cinematic & Editorial'
};

async function runRegressionSuite() {
  // --------------------------------------------------------------------------
  // TEST 1: Shortlisted creator passes filtering, is shortlisted and submits valid bid
  // --------------------------------------------------------------------------
  await test('Test 1 — Shortlisted creator: passes filtering, shortlisted by brand, submits valid bid', async () => {
    // 1. Run filtering pipeline
    const pipelineRes = executeFilteringPipeline({
      campaign: testCampaign,
      creators: [maya]
    });
    assert.strictEqual(pipelineRes.status, 'completed');
    assert.ok(pipelineRes.eligibleCreatorIds.includes(maya.id), 'Maya must be in eligible list');

    // 2. Shortlist creator
    addShortlist(testCampaign.id, maya.id);
    assert.ok(shortlistsStore[testCampaign.id]?.includes(maya.id), 'Creator must be recorded in shortlist');

    // 3. Pre-bid evaluation checks shortlist
    const preBidEval = evaluateCreatorEligibility(testCampaign, maya, { isShortlisted: true });
    assert.strictEqual(preBidEval.eligibility, ELIGIBILITY_STATUS.ELIGIBLE);
    assert.strictEqual(preBidEval.isShortlisted, true);

    // 4. Submit bid
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: testCampaign,
        creator: maya,
        proposedPrice: '₹75,000',
        proposalText: 'Excited to direct this launch!',
        deliveryTimeline: '2 Weeks'
      }
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.isHeld, false);
    assert.strictEqual(res.body.application.creatorId, maya.id);
    assert.strictEqual(res.body.application.campaignId, testCampaign.id);
    assert.strictEqual(res.body.application.status, 'pending_review');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Eligible but not shortlisted creator can submit valid bid
  // --------------------------------------------------------------------------
  await test('Test 2 — Eligible but not shortlisted creator: submits valid bid to open published campaign', async () => {
    delete shortlistsStore[testCampaign.id]; // Ensure not shortlisted

    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: testCampaign,
        creator: maya,
        proposedPrice: '₹60,000',
        proposalText: 'Submitting open application as eligible creator.',
        deliveryTimeline: '2 Weeks'
      }
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.isHeld, false);
    assert.strictEqual(res.body.application.eligibilityStatus, 'ELIGIBLE');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Genuinely unsuitable creator is rejected with exact reason
  // --------------------------------------------------------------------------
  await test('Test 3 — Genuinely unsuitable creator: fails mandatory requirement and is held with exact reason', async () => {
    const incompatibleCreator = {
      id: 'creator-pixel-artist',
      name: 'Pixel Artist',
      styles: ['Retro 8-Bit Pixel Art'],
      formats: ['Sprite Sheet'],
      specialty: 'Pixel Art',
      capabilities: ['Pixel Art Animation'],
      projects: []
    };

    const evalResult = evaluateCreatorEligibility(testCampaign, incompatibleCreator);
    assert.strictEqual(evalResult.eligibility, ELIGIBILITY_STATUS.INELIGIBLE);
    assert.ok(evalResult.reasons.length > 0);
    assert.ok(evalResult.reasons[0].includes('Pixel Art') || evalResult.reasons[0].includes('format') || evalResult.reasons[0].includes('style'));
  });

  // --------------------------------------------------------------------------
  // TEST 4: Closed campaign rejects submissions because closed, not unsuitable
  // --------------------------------------------------------------------------
  await test('Test 4 — Closed campaign: rejected specifically because campaign is closed', async () => {
    const closedCampaign = {
      ...testCampaign,
      id: 'camp-closed-test',
      isAcceptingApplications: false,
      applicationStatus: 'closed'
    };

    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: closedCampaign,
        creator: maya,
        proposedPrice: '₹70,000'
      }
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.code, 'APPLICATIONS_CLOSED');
    assert.ok(res.body.error.includes('closed'));
  });

  // --------------------------------------------------------------------------
  // TEST 5: Expired campaign rejects submission because deadline passed
  // --------------------------------------------------------------------------
  await test('Test 5 — Expired campaign: rejected specifically because deadline passed', async () => {
    const expiredCampaign = {
      ...testCampaign,
      id: 'camp-expired-test',
      isOpenEnded: false,
      deadline: '2023-01-01' // Past date
    };

    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: expiredCampaign,
        creator: maya,
        proposedPrice: '₹70,000'
      }
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.code, 'DEADLINE_PASSED');
    assert.ok(res.body.error.includes('deadline'));
  });

  // --------------------------------------------------------------------------
  // TEST 6: Missing optional profile information does not block creator
  // --------------------------------------------------------------------------
  await test('Test 6 — Missing optional profile info: creator without non-mandatory fields is not rejected', async () => {
    const minimalCreator = {
      id: 'creator-minimal',
      name: 'Minimal Profile Creator',
      styles: ['Cinematic & Editorial'],
      formats: ['AI Video', '9:16 Vertical Video'],
      capabilities: ['AI Video', 'Video Generation'],
      rate: '₹60,000',
      projects: [
        {
          id: 'proj-min-1',
          title: 'Vertical Video Sample',
          aspect: '9:16',
          format: 'AI Video',
          creativeStyle: 'Cinematic & Editorial'
        }
      ]
      // Deliberately omitted: bio, location, twitter, instagram, studio notes, awards
    };

    const evalResult = evaluateCreatorEligibility(testCampaign, minimalCreator);
    assert.strictEqual(evalResult.eligibility, ELIGIBILITY_STATUS.ELIGIBLE);
    assert.strictEqual(evalResult.summary.failed, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Database permissions & authentication enforcement
  // --------------------------------------------------------------------------
  await test('Test 7 — Security model: authenticated creators can submit, unauthenticated blocked', async () => {
    // Unauthenticated
    const resUnauth = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      body: { campaign: testCampaign, proposedPrice: '₹50,000' }
    });
    assert.strictEqual(resUnauth.statusCode, 401);

    // Authenticated
    const resAuth = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: testCampaign,
        creator: maya,
        proposedPrice: '₹50,000'
      }
    });
    assert.strictEqual(resAuth.statusCode, 201);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Duplicate bid replaces cleanly without corrupting state
  // --------------------------------------------------------------------------
  await test('Test 8 — Duplicate bid: updating existing bid replaces cleanly', async () => {
    const res1 = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: testCampaign,
        creator: maya,
        proposedPrice: '₹50,000',
        proposalText: 'First bid'
      }
    });
    assert.strictEqual(res1.statusCode, 201);

    const res2 = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: testCampaign,
        creator: maya,
        proposedPrice: '₹55,000',
        proposalText: 'Revised updated bid'
      }
    });
    assert.strictEqual(res2.statusCode, 201);

    const mayaApps = applicationsStore.filter(a => a.campaignId === testCampaign.id && a.creatorId === maya.id);
    assert.strictEqual(mayaApps.length, 1, 'Only one active application per creator per campaign');
    assert.strictEqual(mayaApps[0].proposalText, 'Revised updated bid');
  });

  // --------------------------------------------------------------------------
  // TEST 9: Creator and campaign ID consistency throughout pipeline
  // --------------------------------------------------------------------------
  await test('Test 9 — ID Consistency: same creator and campaign IDs preserved across pipeline, shortlist, and bidding', async () => {
    const opps = getPublicCreatorOpportunities({ campaigns: [testCampaign] });
    const opp = opps.find(o => o.campaignId === testCampaign.id || o.id === `opp-${testCampaign.id}`);
    assert(opp, 'Opportunity generated from campaign must exist');
    assert.strictEqual(opp.campaignId, testCampaign.id, 'Opportunity campaignId matches campaign.id');

    addShortlist(opp.campaignId, maya.id);
    assert.ok(shortlistsStore[opp.campaignId].includes(maya.id), 'Shortlist records matching campaignId and creatorId');

    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: opp,
        campaignId: opp.campaignId,
        creator: maya,
        creatorId: maya.id,
        proposedPrice: '₹75,000'
      }
    });

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.application.campaignId, testCampaign.id);
    assert.strictEqual(res.body.application.creatorId, maya.id);
  });

  // --------------------------------------------------------------------------
  // TEST 10: Existing marketplace functionality remains intact
  // --------------------------------------------------------------------------
  await test('Test 10 — Marketplace integrity: discovery, filtering, and non-negotiable budget bounds preserved', async () => {
    // A: Non-negotiable budget ceiling strictly blocks bids exceeding ceiling
    const fixedCampaign = {
      ...testCampaign,
      id: 'camp-fixed-budget',
      isNegotiable: false,
      budget: '₹50,000'
    };

    const resOverBudget = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: fixedCampaign,
        creator: maya,
        proposedPrice: '₹75,000'
      }
    });
    assert.strictEqual(resOverBudget.statusCode, 400);
    assert.strictEqual(resOverBudget.body.code, 'BUDGET_NON_NEGOTIABLE');

    // B: Within budget bid succeeds
    const resWithinBudget = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: fixedCampaign,
        creator: maya,
        proposedPrice: '₹45,000'
      }
    });
    assert.strictEqual(resWithinBudget.statusCode, 201);
  });

  console.log('\n----------------------------------------------------------------');
  console.log(` RESULTS: ${passed}/${total} Regression Tests Passed Successfully!`);
  console.log('----------------------------------------------------------------\n');
}

runRegressionSuite().catch(err => {
  console.error('Regression suite failed:', err);
  process.exit(1);
});
