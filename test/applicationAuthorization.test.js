// test/applicationAuthorization.test.js
// Focused Automated Verification Suite for Application Endpoint Authorization & Security

import assert from 'assert';
import { EventEmitter } from 'events';
import {
  createApplicationMiddleware,
  setApplicationsStore
} from '../server/applicationMiddleware.js';

function createMockReqRes({ method, url, headers = {}, body = null }) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = { ...headers };

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, val) {
      this.headers[key.toLowerCase()] = val;
    },
    end(data) {
      try {
        this.body = data ? JSON.parse(data) : null;
      } catch (e) {
        this.body = data;
      }
      if (this._onEnd) this._onEnd(this);
    }
  };

  const promise = new Promise(resolve => {
    res._onEnd = resolve;
  });

  process.nextTick(() => {
    if (body) {
      req.emit('data', JSON.stringify(body));
    }
    req.emit('end');
  });

  return { req, res, promise };
}

async function runApplicationAuthorizationTests() {
  console.log('\n================================================================');
  console.log(' ALLOY — APPLICATION AUTHORIZATION & PRIVACY VERIFICATION SUITE');
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
      failed++;
    }
  }

  const middleware = createApplicationMiddleware();

  // Helper to execute request through middleware
  async function dispatch(options) {
    const { req, res, promise } = createMockReqRes(options);
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    if (nextCalled) {
      return { statusCode: 404, body: { error: 'Route fell through to next()' } };
    }
    await promise;
    return res;
  }

  function resetStore() {
    setApplicationsStore([
      {
        id: 'app-test-1',
        campaignId: 'camp-summer-skincare',
        campaignTitle: 'Summer Skincare Launch',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        creatorId: 'maya-chen',
        creatorName: 'Maya Chen',
        creatorAvatar: 'https://example.com/maya.png',
        proposedPrice: '$8,500',
        bidAmount: 8500,
        currency: 'USD',
        proposalText: 'Excited to direct this launch!',
        deliveryTimeline: '2 Weeks',
        portfolioEvidence: ['p1'],
        eligibilityStatus: 'ELIGIBLE',
        isHeld: false,
        status: 'pending_review',
        counterOffer: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'app-test-held',
        campaignId: 'camp-summer-skincare',
        campaignTitle: 'Summer Skincare Launch',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        creatorId: 'novice-creator',
        creatorName: 'Novice Creator',
        creatorAvatar: 'https://example.com/novice.png',
        proposedPrice: '$4,000',
        bidAmount: 4000,
        currency: 'USD',
        proposalText: 'Interested in working with you',
        deliveryTimeline: '1 Week',
        portfolioEvidence: [],
        eligibilityStatus: 'REQUIRES_REVIEW',
        isHeld: true,
        heldReason: 'Insufficient format evidence',
        status: 'held',
        counterOffer: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
  }

  // ==========================================================================
  // GROUP 1: Missing or Invalid Authentication (401)
  // ==========================================================================
  console.log('--- Group 1: Missing & Invalid Authentication Verification (401) ---');

  await test('1.1 GET campaign applications without token returns 401', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/campaign/camp-summer-skincare',
      headers: {}
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('1.2 GET campaign applications with forged token returns 401', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/campaign/camp-summer-skincare',
      headers: { 'authorization': 'Bearer forged.token.signature' }
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('1.3 POST /api/applications/counter without token returns 401', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/counter',
      headers: {},
      body: { applicationId: 'app-test-1', proposedPrice: '$7,000' }
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('1.4 POST /api/applications/respond-counter without token returns 401', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/respond-counter',
      headers: {},
      body: { applicationId: 'app-test-1', decision: 'accept' }
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('1.5 POST /api/applications/accept without token returns 401', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/accept',
      headers: {},
      body: { applicationId: 'app-test-1' }
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('1.6 GET /api/applications/my without token returns 401', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/my',
      headers: {}
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('1.7 GET /api/applications/my with forged token returns 401', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/my',
      headers: { 'authorization': 'Bearer forged.invalid.token' }
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('1.8 POST /api/applications/submit without token returns 401', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: {},
      body: { campaign: { id: 'camp-summer-skincare' }, proposedPrice: '$5,000' }
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  await test('1.9 POST /api/applications/submit with forged token returns 401', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer forged.invalid.token' },
      body: { campaign: { id: 'camp-summer-skincare' }, proposedPrice: '$5,000' }
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.code, 'UNAUTHORIZED');
  });

  // ==========================================================================
  // GROUP 2: Creator Isolation — Cannot respond to another creator's counter or view/submit other creators' apps
  // ==========================================================================
  console.log('\n--- Group 2: Creator Isolation & Anti-Spoofing (403) ---');

  await test('2.1 A creator cannot respond to another creator\'s counter-offer', async () => {
    resetStore();
    // Application belongs to 'maya-chen'. Request is made by 'test-valid-other-creator' (alex-rivera).
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/respond-counter',
      headers: { 'authorization': 'Bearer test-valid-other-creator' },
      body: { applicationId: 'app-test-1', decision: 'accept' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.match(res.body.error, /own applications/i);
  });

  await test('2.2 Spoofing creatorId in request body does NOT bypass creator check', async () => {
    resetStore();
    // Attacker sends token for alex-rivera, but puts creatorId: 'maya-chen' in body
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/respond-counter',
      headers: { 'authorization': 'Bearer test-valid-other-creator' },
      body: { applicationId: 'app-test-1', decision: 'accept', creatorId: 'maya-chen' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.match(res.body.error, /own applications/i);
  });

  await test('2.3 Omitting creatorId in request body still enforces session ownership', async () => {
    resetStore();
    // Attacker sends token for alex-rivera with no creatorId in body
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/respond-counter',
      headers: { 'authorization': 'Bearer test-valid-other-creator' },
      body: { applicationId: 'app-test-1', decision: 'accept' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('2.4 A creator cannot retrieve another creator\'s applications by spoofing x-creator-id header', async () => {
    resetStore();
    // Authenticated as alex-rivera ('test-valid-other-creator'). Spoofs x-creator-id header for maya-chen.
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/my',
      headers: {
        'authorization': 'Bearer test-valid-other-creator',
        'x-creator-id': 'maya-chen'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    // Should NOT return maya-chen's applications; alex has no applications in store
    assert.strictEqual(res.body.applications.length, 0);
  });

  await test('2.5 A creator cannot retrieve another creator\'s applications by spoofing query parameters', async () => {
    resetStore();
    // Authenticated as alex-rivera ('test-valid-other-creator'). Spoofs ?creatorId=maya-chen
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/my?creatorId=maya-chen',
      headers: {
        'authorization': 'Bearer test-valid-other-creator'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    // Should NOT return maya-chen's applications
    assert.strictEqual(res.body.applications.length, 0);
  });

  await test('2.6 A creator cannot submit under another creator\'s identity by spoofing request body', async () => {
    resetStore();
    // Authenticated as alex-rivera ('test-valid-other-creator'). Submits with creator.id: 'maya-chen'
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-other-creator' },
      body: {
        campaign: {
          id: 'camp-summer-skincare',
          title: 'Summer Skincare Launch',
          visibility: 'published',
          isAcceptingApplications: true,
          creatorSlots: 2,
          budget: '$10,000'
        },
        creator: {
          id: 'maya-chen',
          name: 'Maya Chen'
        },
        proposedPrice: '$5,000'
      }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.match(res.body.error, /cannot submit applications on behalf of another creator/i);
  });

  // ==========================================================================
  // GROUP 3: Brand Isolation — Cannot access or modify other brands' campaigns
  // ==========================================================================
  console.log('\n--- Group 3: Brand Isolation & Ownership (403) ---');

  await test('3.1 A brand cannot view applications belonging to another brand\'s campaign', async () => {
    resetStore();
    // Campaign belongs to 'brand-demo-lumina'. Competitor brand tries to view it.
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/campaign/camp-summer-skincare',
      headers: { 'authorization': 'Bearer test-valid-other-brand' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.match(res.body.error, /do not own this campaign/i);
  });

  await test('3.2 Spoofing brandId in query param does NOT grant access to another brand\'s campaign', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/campaign/camp-summer-skincare?brandId=brand-demo-lumina',
      headers: { 'authorization': 'Bearer test-valid-other-brand' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('3.3 A brand cannot propose a counter-offer on another brand\'s application', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/counter',
      headers: { 'authorization': 'Bearer test-valid-other-brand' },
      body: { applicationId: 'app-test-1', proposedPrice: '$6,000' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.match(res.body.error, /owner brand/i);
  });

  await test('3.4 Spoofing brandId in counter body does NOT bypass brand ownership check', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/counter',
      headers: { 'authorization': 'Bearer test-valid-other-brand' },
      body: { applicationId: 'app-test-1', proposedPrice: '$6,000', brandId: 'brand-demo-lumina' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('3.5 A brand cannot accept an application belonging to another brand', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/accept',
      headers: { 'authorization': 'Bearer test-valid-other-brand' },
      body: { applicationId: 'app-test-1' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('3.6 Spoofing brandId in accept body does NOT bypass brand ownership check', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/accept',
      headers: { 'authorization': 'Bearer test-valid-other-brand' },
      body: { applicationId: 'app-test-1', brandId: 'brand-demo-lumina' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  // ==========================================================================
  // GROUP 4: Role-Based Access Enforcement
  // ==========================================================================
  console.log('\n--- Group 4: Role-Based Access Control ---');

  await test('4.1 A creator cannot call GET campaign applications (brand-only)', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/campaign/camp-summer-skincare',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('4.2 A creator cannot call POST /api/applications/counter (brand-only)', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/counter',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: { applicationId: 'app-test-1', proposedPrice: '$6,000' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('4.3 A brand cannot call POST /api/applications/respond-counter (creator-only)', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/respond-counter',
      headers: { 'authorization': 'Bearer test-valid-brand-lumina' },
      body: { applicationId: 'app-test-1', decision: 'accept' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
  });

  await test('4.4 A brand cannot call GET /api/applications/my (creator-only)', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/my',
      headers: { 'authorization': 'Bearer test-valid-brand-lumina' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.match(res.body.error, /Only creator accounts/i);
  });

  await test('4.5 An admin cannot call GET /api/applications/my (creator-only)', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/my',
      headers: { 'authorization': 'Bearer test-valid-admin' }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.match(res.body.error, /Only creator accounts/i);
  });

  await test('4.6 A brand cannot call POST /api/applications/submit (creator-only)', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-brand-lumina' },
      body: {
        campaign: { id: 'camp-summer-skincare' },
        proposedPrice: '$5,000'
      }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.match(res.body.error, /Only creator accounts/i);
  });

  await test('4.7 An admin cannot call POST /api/applications/submit (creator-only)', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-admin' },
      body: {
        campaign: { id: 'camp-summer-skincare' },
        proposedPrice: '$5,000'
      }
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN');
    assert.match(res.body.error, /Only creator accounts/i);
  });

  // ==========================================================================
  // GROUP 5: Legitimate Authorized Requests (200)
  // ==========================================================================
  console.log('\n--- Group 5: Legitimate Authorized Requests (200) ---');

  await test('5.1 Legitimate campaign owner brand can view applications', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/campaign/camp-summer-skincare',
      headers: { 'authorization': 'Bearer test-valid-brand-lumina' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(Array.isArray(res.body.applications));
    assert.strictEqual(res.body.applications.length, 1);
    assert.strictEqual(res.body.applications[0].id, 'app-test-1');
  });

  await test('5.2 Legitimate campaign owner brand can propose counter-offer', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/counter',
      headers: { 'authorization': 'Bearer test-valid-brand-lumina' },
      body: {
        applicationId: 'app-test-1',
        proposedPrice: '$7,500',
        proposedTimeline: '10 Days',
        message: 'Can we deliver slightly faster?'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.application.status, 'counter_offered');
    assert.strictEqual(res.body.application.counterOffer.proposedPrice, '$7,500');
  });

  await test('5.3 Legitimate creator can accept counter-offer', async () => {
    // app-test-1 is now in counter_offered state
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/respond-counter',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: { applicationId: 'app-test-1', decision: 'accept' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.status, 'accepted');
    assert.ok(res.body.collaboration, 'Collaboration was generated upon mutual acceptance');
    assert.strictEqual(res.body.collaboration.agreedBudget, '$7,500');
  });

  await test('5.4 Legitimate campaign owner brand can directly accept application', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/accept',
      headers: { 'authorization': 'Bearer test-valid-brand-lumina' },
      body: { applicationId: 'app-test-1', campaignSlots: 2 }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.status, 'accepted');
    assert.strictEqual(res.body.remainingSlots, 1);
    assert.ok(res.body.collaboration, 'Collaboration project generated');
  });

  await test('5.5 Legitimate authenticated creator can retrieve their own applications', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/my',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.ok(Array.isArray(res.body.applications));
    assert.strictEqual(res.body.applications.length, 1);
    assert.strictEqual(res.body.applications[0].creatorId, 'maya-chen');
  });

  await test('5.6 Legitimate authenticated creator can submit an eligible application', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: {
          id: 'camp-summer-skincare',
          title: 'Summer Skincare Launch',
          ownerBrandId: 'brand-demo-lumina',
          brandName: 'Lumina Botanica',
          visibility: 'published',
          isAcceptingApplications: true,
          applicationStatus: 'open',
          creatorSlots: 2,
          remainingSlots: 2,
          deadline: 'Open-ended',
          isNegotiable: true,
          budget: '$10,000',
          contentFormats: ['AI Video'],
          creativeStyle: 'Cinematic & Editorial'
        },
        creator: {
          id: 'maya-chen',
          name: 'Maya Chen',
          rate: '$8,000',
          styles: ['Cinematic & Editorial'],
          formats: ['AI Video'],
          projects: [
            {
              id: 'p1',
              title: 'Botanical Elegance',
              creativeStyle: 'Cinematic & Editorial',
              format: 'AI Video',
              aspectRatio: '16:9'
            }
          ]
        },
        proposedPrice: '$8,000',
        proposalText: 'Excited to direct this launch!',
        deliveryTimeline: '10 Days'
      }
    });
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.isHeld, false);
    assert.strictEqual(res.body.application.creatorId, 'maya-chen');
    assert.strictEqual(res.body.application.eligibilityStatus, 'ELIGIBLE');
  });

  await test('5.7 Incompatible submission preserves hold behavior and explanation (INELIGIBLE)', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: {
          id: 'camp-summer-skincare',
          title: 'Summer Skincare Launch',
          ownerBrandId: 'brand-demo-lumina',
          brandName: 'Lumina Botanica',
          visibility: 'published',
          isAcceptingApplications: true,
          applicationStatus: 'open',
          creatorSlots: 2,
          remainingSlots: 2,
          deadline: 'Open-ended',
          isNegotiable: true,
          budget: '$10,000',
          contentFormats: ['AI Video'],
          creativeStyle: 'Cinematic & Editorial'
        },
        creator: {
          id: 'maya-chen',
          name: 'Maya Chen',
          rate: '$5,000',
          styles: ['Pixel Art'],
          formats: ['2D Sprite Sheet'],
          projects: []
        },
        proposedPrice: '$5,000',
        proposalText: 'Applying despite different medium'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.isHeld, true);
    assert.strictEqual(res.body.eligibilityStatus, 'INELIGIBLE');
    assert.strictEqual(res.body.application.isHeld, true);
    assert.ok(res.body.message.includes('blocked from brand review') || res.body.message.includes('held'));
  });

  await test('5.8 Insufficient evidence submission preserves hold behavior and guidance (REQUIRES_REVIEW)', async () => {
    resetStore();
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/submit',
      headers: { 'authorization': 'Bearer test-valid-creator-maya' },
      body: {
        campaign: {
          id: 'camp-summer-skincare',
          title: 'Summer Skincare Launch',
          ownerBrandId: 'brand-demo-lumina',
          brandName: 'Lumina Botanica',
          visibility: 'published',
          isAcceptingApplications: true,
          applicationStatus: 'open',
          creatorSlots: 2,
          remainingSlots: 2,
          deadline: 'Open-ended',
          isNegotiable: true,
          budget: '$10,000',
          contentFormats: ['9:16 Vertical Video'],
          creativeStyle: 'Cinematic & Editorial'
        },
        creator: {
          id: 'maya-chen',
          name: 'Maya Chen',
          rate: '$6,000',
          styles: ['Cinematic & Editorial'],
          formats: ['AI Video'],
          projects: [
            {
              id: 'p-no-ar',
              title: 'Video Without Aspect Ratio',
              creativeStyle: 'Cinematic & Editorial',
              format: 'AI Video'
            }
          ]
        },
        proposedPrice: '$6,000',
        proposalText: 'Need to add aspect ratio proof'
      }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.isHeld, true);
    assert.strictEqual(res.body.eligibilityStatus, 'REQUIRES_REVIEW');
    assert.strictEqual(res.body.application.isHeld, true);
  });

  // ==========================================================================
  // GROUP 6: Held Applications Privacy Rule
  // ==========================================================================
  console.log('\n--- Group 6: Held Applications Privacy Enforcement ---');

  await test('6.1 Held and insufficient-evidence applications remain 100% hidden from brand review', async () => {
    resetStore();
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/campaign/camp-summer-skincare',
      headers: { 'authorization': 'Bearer test-valid-brand-lumina' }
    });
    assert.strictEqual(res.statusCode, 200);
    const returnedIds = res.body.applications.map(a => a.id);
    assert.ok(!returnedIds.includes('app-test-held'), 'Held application must NOT be returned to brand');
    assert.strictEqual(res.body.applications.every(a => !a.isHeld && a.eligibilityStatus === 'ELIGIBLE'), true);
  });

  await test('6.2 Brand cannot view newly submitted held or insufficient-evidence applications', async () => {
    // Both eligible (app-test-1) and held (app-test-held) in store
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/campaign/camp-summer-skincare',
      headers: { 'authorization': 'Bearer test-valid-brand-lumina' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.applications.every(a => !a.isHeld), true);
  });

  // ==========================================================================
  // GROUP 7: Production / Test Separation Verification
  // ==========================================================================
  console.log('\n--- Group 7: Production / Test Separation Verification ---');

  await test('7.1 Test tokens are blocked with 401 in production (NODE_ENV=production)', async () => {
    resetStore();
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const res = await dispatch({
        method: 'GET',
        url: '/api/applications/campaign/camp-summer-skincare',
        headers: { 'authorization': 'Bearer test-valid-brand-lumina' }
      });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
      assert.match(res.body.error, /production/i);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  await test('7.2 Generic test tokens are blocked with 401 in production (NODE_ENV=production)', async () => {
    resetStore();
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const res = await dispatch({
        method: 'POST',
        url: '/api/applications/accept',
        headers: { 'authorization': 'Bearer authenticated-session-token' },
        body: { applicationId: 'app-test-1' }
      });
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body.code, 'UNAUTHORIZED');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });

  await test('7.3 Test tokens are permitted in development / testing environments', async () => {
    resetStore();
    assert.notStrictEqual(process.env.NODE_ENV, 'production');
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/campaign/camp-summer-skincare',
      headers: { 'authorization': 'Bearer test-valid-brand-lumina' }
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
  });

  console.log('\n----------------------------------------------------------------');
  console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runApplicationAuthorizationTests();
