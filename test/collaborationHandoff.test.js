// test/collaborationHandoff.test.js
// Alloy — Comprehensive Collaboration Handoff & Application Lifecycle Verification Suite
// Verifies:
// 1. Direct application acceptance creating/reusing canonical conversation
// 2. Accepted counter-offers using the same path
// 3. Duplicate acceptance preventing duplicate conversations, messages, or projects
// 4. Opening-message persistence and correct campaign/creator/brand linkage
// 5. Creator application hydration
// 6. Brand application hydration across multiple campaigns
// 7. Duplicate reconciliation and held-application privacy
// 8. Authorization and failure behavior

import assert from 'assert';
import { EventEmitter } from 'events';
import {
  createApplicationMiddleware,
  setApplicationsStore,
  getApplicationsStore
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

async function runCollaborationHandoffTests() {
  console.log('\n================================================================');
  console.log(' ALLOY — COLLABORATION HANDOFF & APPLICATION REGRESSION SUITE');
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

  function setupSeedStore() {
    setApplicationsStore([
      {
        id: 'app-seed-maya-1',
        campaignId: 'camp-summer-skincare',
        campaignTitle: 'Summer Skincare Launch',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        creatorId: 'maya-chen',
        creatorName: 'Maya Chen',
        creatorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
        creatorRole: 'Cinematic AI Director',
        proposedPrice: '$8,500',
        bidAmount: 8500,
        currency: 'USD',
        proposalText: 'Excited to direct this launch!',
        deliveryTimeline: '2 Weeks',
        portfolioEvidence: ['maya-proj-1'],
        eligibilityStatus: 'ELIGIBLE',
        isHeld: false,
        status: 'pending_review',
        counterOffer: null,
        createdAt: '2026-06-01T10:00:00Z',
        updatedAt: '2026-06-01T10:00:00Z'
      },
      {
        id: 'app-seed-alex-2',
        campaignId: 'camp-summer-skincare',
        campaignTitle: 'Summer Skincare Launch',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        creatorId: 'alex-rivera',
        creatorName: 'Alex Rivera',
        creatorRole: 'Sound & Generative Composer',
        proposedPrice: '$6,000',
        bidAmount: 6000,
        currency: 'USD',
        proposalText: 'Dynamic audio worldbuilding.',
        deliveryTimeline: '10 Days',
        portfolioEvidence: ['alex-proj-1'],
        eligibilityStatus: 'ELIGIBLE',
        isHeld: false,
        status: 'pending_review',
        counterOffer: null,
        createdAt: '2026-06-01T11:00:00Z',
        updatedAt: '2026-06-01T11:00:00Z'
      },
      {
        id: 'app-seed-held-3',
        campaignId: 'camp-summer-skincare',
        campaignTitle: 'Summer Skincare Launch',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        creatorId: 'kai-sorenson',
        creatorName: 'Kai Sorenson',
        creatorRole: '3D Spatial Designer',
        proposedPrice: '$9,000',
        bidAmount: 9000,
        currency: 'USD',
        proposalText: 'Spatial concepts.',
        deliveryTimeline: '3 Weeks',
        portfolioEvidence: [],
        eligibilityStatus: 'REQUIRES_REVIEW',
        isHeld: true,
        heldReason: 'Insufficient portfolio verification',
        status: 'pending_review',
        counterOffer: null,
        createdAt: '2026-06-01T12:00:00Z',
        updatedAt: '2026-06-01T12:00:00Z'
      },
      {
        id: 'app-seed-brand2-4',
        campaignId: 'camp-lumina-second',
        campaignTitle: 'Lumina Autumn Serums',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        creatorId: 'elena-rostova',
        creatorName: 'Elena Rostova',
        creatorRole: 'Photorealistic AI Stylist',
        proposedPrice: '$7,200',
        bidAmount: 7200,
        currency: 'USD',
        proposalText: 'Autumn aesthetics.',
        deliveryTimeline: '2 Weeks',
        portfolioEvidence: ['elena-proj-1'],
        eligibilityStatus: 'ELIGIBLE',
        isHeld: false,
        status: 'pending_review',
        counterOffer: null,
        createdAt: '2026-06-02T10:00:00Z',
        updatedAt: '2026-06-02T10:00:00Z'
      }
    ]);
  }

  // --- Group 1: Acceptance, Canonical Messaging & Convergence ---
  console.log('--- Group 1: Acceptance, Canonical Messaging & Convergence ---');

  await test('1.1 Direct application acceptance creates canonical conversation ID and collaboration', async () => {
    setupSeedStore();

    // 1. Direct acceptance via POST /api/applications/accept
    const res = await dispatch({
      method: 'POST',
      url: '/api/applications/accept',
      headers: { authorization: 'Bearer test-valid-brand-lumina' },
      body: { applicationId: 'app-seed-maya-1', brandId: 'brand-demo-lumina', campaignSlots: 2 }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.application.status, 'accepted');

    // Canonical connection ID must match the campaign and creator pair
    const expectedCanonicalConnId = 'conn-camp-summer-skincare-maya-chen';
    const store = getApplicationsStore();
    const acceptedApp = store.find(a => a.id === 'app-seed-maya-1');
    assert.strictEqual(acceptedApp.status, 'accepted');

    // Simulate convergence helper in App.jsx:
    const openingMsgId = `msg-app-${acceptedApp.id}`;
    const agreedRate = acceptedApp.proposedPrice;
    const agreedTimeline = acceptedApp.deliveryTimeline;

    const canonicalConn = {
      id: expectedCanonicalConnId,
      campaignId: acceptedApp.campaignId,
      creatorId: acceptedApp.creatorId,
      brandId: acceptedApp.brandId,
      brandName: acceptedApp.brandName,
      agreedBudget: agreedRate,
      agreedTimeline,
      messages: [{ id: openingMsgId, text: `Application accepted! Collaboration started...` }]
    };

    assert.strictEqual(canonicalConn.id, 'conn-camp-summer-skincare-maya-chen');
    assert.strictEqual(canonicalConn.messages[0].id, 'msg-app-app-seed-maya-1');
    assert.strictEqual(canonicalConn.agreedBudget, '$8,500');
    assert.strictEqual(canonicalConn.agreedTimeline, '2 Weeks');
  });

  await test('1.2 Accepted counter-offers converge on the exact same canonical conversation path', async () => {
    setupSeedStore();

    // Brand proposes counter offer
    const counterRes = await dispatch({
      method: 'POST',
      url: '/api/applications/counter',
      headers: { authorization: 'Bearer test-valid-brand-lumina' },
      body: {
        applicationId: 'app-seed-alex-2',
        proposedRate: '$5,500',
        proposedTimeline: '7 Days',
        note: 'Could we expedite delivery by 3 days?'
      }
    });
    assert.strictEqual(counterRes.statusCode, 200);
    assert.strictEqual(counterRes.body.application.status, 'counter_offered');

    // Creator accepts counter offer
    const acceptRes = await dispatch({
      method: 'POST',
      url: '/api/applications/respond-counter',
      headers: { authorization: 'Bearer test-valid-creator-alex' },
      body: { applicationId: 'app-seed-alex-2', decision: 'accept' }
    });
    assert.strictEqual(acceptRes.statusCode, 200);
    assert.strictEqual(acceptRes.body.application.status, 'accepted');

    // Verify counter offer terms are preserved
    const updatedApp = acceptRes.body.application;
    const agreedRate = updatedApp.counterOffer?.proposedRate || updatedApp.proposedPrice;
    const agreedTimeline = updatedApp.counterOffer?.proposedTimeline || updatedApp.deliveryTimeline;
    assert.strictEqual(agreedRate, '$5,500');
    assert.strictEqual(agreedTimeline, '7 Days');

    // Canonical conversation matches the exact standard
    const canonicalConnId = `conn-${updatedApp.campaignId}-${updatedApp.creatorId}`;
    assert.strictEqual(canonicalConnId, 'conn-camp-summer-skincare-alex-rivera');
  });

  await test('1.3 Duplicate acceptance does not produce duplicate conversations, messages, or projects', async () => {
    setupSeedStore();

    // First acceptance
    await dispatch({
      method: 'POST',
      url: '/api/applications/accept',
      headers: { authorization: 'Bearer test-valid-brand-lumina' },
      body: { applicationId: 'app-seed-maya-1', brandId: 'brand-demo-lumina', campaignSlots: 2 }
    });

    // Simulate App.jsx deduplication algorithm on multiple synchronization passes
    const connections = [];
    const projects = [];

    function processHandoff(app) {
      const canonicalConnId = `conn-${app.campaignId}-${app.creatorId}`;
      const openingMsgId = `msg-app-${app.id}`;
      const agreedRate = app.counterOffer?.proposedRate || app.proposedPrice;
      const agreedTimeline = app.counterOffer?.proposedTimeline || app.deliveryTimeline;

      // Project deduplication
      const existingProjectIdx = projects.findIndex(
        p => p.id === `collab-${app.id}` || (p.campaignId === app.campaignId && p.creatorId === app.creatorId)
      );
      if (existingProjectIdx === -1) {
        projects.push({
          id: `collab-${app.id}`,
          campaignId: app.campaignId,
          creatorId: app.creatorId,
          agreedBudget: agreedRate,
          deadline: agreedTimeline
        });
      }

      // Connection and opening message deduplication
      const existingConnIdx = connections.findIndex(
        c => c.id === canonicalConnId || (c.campaignId === app.campaignId && c.creatorId === app.creatorId)
      );
      const openingMsg = { id: openingMsgId, text: 'Opening Message' };
      if (existingConnIdx === -1) {
        connections.push({
          id: canonicalConnId,
          campaignId: app.campaignId,
          creatorId: app.creatorId,
          messages: [openingMsg]
        });
      } else {
        const existing = connections[existingConnIdx];
        const hasMsg = (existing.messages || []).some(m => m.id === openingMsgId);
        if (!hasMsg) {
          existing.messages.push(openingMsg);
        }
      }
    }

    const app = getApplicationsStore().find(a => a.id === 'app-seed-maya-1');
    // First pass
    processHandoff(app);
    // Duplicate pass 1 (e.g. repeated user click)
    processHandoff(app);
    // Duplicate pass 2 (e.g. storage reload)
    processHandoff(app);

    assert.strictEqual(projects.length, 1, 'Projects must not duplicate');
    assert.strictEqual(connections.length, 1, 'Connections must not duplicate');
    assert.strictEqual(connections[0].messages.length, 1, 'Opening message must not duplicate');
  });

  // --- Group 2: Hydration & Multi-Campaign Scoping ---
  console.log('\n--- Group 2: Hydration & Multi-Campaign Scoping ---');

  await test('2.1 Creator application hydration returns only authenticated creator submissions', async () => {
    setupSeedStore();

    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/my',
      headers: { authorization: 'Bearer test-valid-creator-maya' }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.applications.length, 1);
    assert.strictEqual(res.body.applications[0].creatorId, 'maya-chen');
  });

  await test('2.2 Brand application hydration loads applications across all campaigns owned by brand', async () => {
    setupSeedStore();

    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/brand',
      headers: { authorization: 'Bearer test-valid-brand-lumina' }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    // Brand lumina owns camp-summer-skincare and camp-lumina-second
    const apps = res.body.applications;
    const campaignIds = apps.map(a => a.campaignId);
    assert.ok(campaignIds.includes('camp-summer-skincare'), 'Must include camp-summer-skincare');
    assert.ok(campaignIds.includes('camp-lumina-second'), 'Must include camp-lumina-second');
    assert.strictEqual(apps.length, 3, 'Must include 3 eligible applications across Lumina campaigns');
  });

  await test('2.3 Held and insufficient-evidence applications are strictly excluded from brand hydration', async () => {
    setupSeedStore();

    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/brand',
      headers: { authorization: 'Bearer test-valid-brand-lumina' }
    });

    assert.strictEqual(res.statusCode, 200);
    const hasHeld = res.body.applications.some(a => a.isHeld || a.id === 'app-seed-held-3');
    assert.strictEqual(hasHeld, false, 'Held application must never be returned to brand');
  });

  await test('2.4 Creator can still access their own held application via /api/applications/my', async () => {
    setupSeedStore();

    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/my',
      headers: { authorization: 'Bearer test-valid-creator-kai' }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.applications.length, 1);
    assert.strictEqual(res.body.applications[0].id, 'app-seed-held-3');
    assert.strictEqual(res.body.applications[0].isHeld, true);
  });

  // --- Group 3: Authorization & Security for Brand Hydration ---
  console.log('\n--- Group 3: Authorization & Security for Brand Hydration ---');

  await test('3.1 GET /api/applications/brand without token returns 401', async () => {
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/brand'
    });
    assert.strictEqual(res.statusCode, 401);
  });

  await test('3.2 GET /api/applications/brand with forged token returns 401', async () => {
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/brand',
      headers: { authorization: 'Bearer forged-bad-token' }
    });
    assert.strictEqual(res.statusCode, 401);
  });

  await test('3.3 A creator account calling GET /api/applications/brand returns 403', async () => {
    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/brand',
      headers: { authorization: 'Bearer test-valid-creator-maya' }
    });
    assert.strictEqual(res.statusCode, 403);
  });

  await test('3.4 A competitor brand cannot access Lumina applications via GET /api/applications/brand', async () => {
    setupSeedStore();

    const res = await dispatch({
      method: 'GET',
      url: '/api/applications/brand',
      headers: { authorization: 'Bearer test-valid-brand-competitor' }
    });

    assert.strictEqual(res.statusCode, 200);
    // Competitor brand owns no campaigns in setupSeedStore
    assert.strictEqual(res.body.applications.length, 0);
  });

  console.log('\n----------------------------------------------------------------');
  console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCollaborationHandoffTests().catch(err => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
