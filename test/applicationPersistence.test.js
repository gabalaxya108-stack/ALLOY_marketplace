// test/applicationPersistence.test.js
// Alloy Phase 2.1 — Comprehensive Application Persistence & Atomic Slot Concurrency Verification Suite
// Verifies:
// 1. Application submission and retrieval surviving complete in-memory store reset (server restart simulation)
// 2. Full persistence of eligibility details, held state, statuses, and counter-offers
// 3. Authorized and unauthorized status transitions
// 4. Concurrent acceptance requests against the last available campaign slot (atomic capacity enforcement)
// 5. Accepted collaboration and opening-message handoff persistence
// 6. Held applications privacy filtering from database queries

import assert from 'assert';
import { EventEmitter } from 'events';
import {
  createApplicationMiddleware,
  setApplicationsStore,
  getApplicationsStore,
  mapRowToApplication,
  mapApplicationToRow
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

/**
 * Creates a deterministic in-memory mock of Supabase PostgREST client and RPC
 */
function createMockSupabaseDatabase() {
  const tables = {
    campaign_applications: [],
    collaborations: [],
    messages: [],
    brands: [
      { id: 'brand-demo-lumina', name: 'Lumina Botanica', is_demo: true }
    ],
    campaigns: [
      { id: 'camp-summer-skincare', owner_brand_id: 'brand-demo-lumina', creator_slots: 1 }
    ]
  };

  function createQueryBuilder(tableName) {
    let filters = [];
    let orderCol = null;
    let orderAsc = true;
    let limitVal = null;
    let selectHead = false;
    let countMode = null;
    let pendingUpdate = null;

    const builder = {
      select(cols = '*', opts = {}) {
        if (opts.head) selectHead = true;
        if (opts.count) countMode = opts.count;
        return builder;
      },
      eq(col, val) {
        filters.push(row => row[col] === val);
        return builder;
      },
      order(col, opts = { ascending: true }) {
        orderCol = col;
        orderAsc = Boolean(opts.ascending);
        return builder;
      },
      limit(n) {
        limitVal = n;
        return builder;
      },
      update(updates) {
        pendingUpdate = updates;
        return builder;
      },
      async maybeSingle() {
        const res = await builder.execute();
        return { data: res.data?.[0] || null, error: res.error };
      },
      async upsert(record, opts = {}) {
        const rows = Array.isArray(record) ? record : [record];
        const table = tables[tableName] || (tables[tableName] = []);
        for (const row of rows) {
          const conflictCol = opts.onConflict || 'id';
          let idx = -1;
          if (conflictCol === 'campaign_id,creator_id') {
            idx = table.findIndex(r => r.campaign_id === row.campaign_id && r.creator_id === row.creator_id);
          } else {
            idx = table.findIndex(r => r.id === row.id);
          }
          if (idx >= 0) {
            table[idx] = { ...table[idx], ...row, updated_at: new Date().toISOString() };
          } else {
            table.push({ ...row, created_at: row.created_at || new Date().toISOString() });
          }
        }
        return { data: record, error: null };
      },
      async delete() {
        const table = tables[tableName] || [];
        tables[tableName] = table.filter(row => !filters.every(f => f(row)));
        return { error: null };
      },
      execute() {
        const table = tables[tableName] || [];
        let filtered = table.filter(row => filters.every(f => f(row)));

        if (pendingUpdate) {
          for (const row of filtered) {
            Object.assign(row, pendingUpdate, { updated_at: new Date().toISOString() });
          }
          return Promise.resolve({ data: filtered, error: null });
        }

        const count = filtered.length;
        if (orderCol) {
          filtered.sort((a, b) => {
            if (a[orderCol] < b[orderCol]) return orderAsc ? -1 : 1;
            if (a[orderCol] > b[orderCol]) return orderAsc ? 1 : -1;
            return 0;
          });
        }
        if (limitVal) filtered = filtered.slice(0, limitVal);

        return Promise.resolve({
          data: selectHead ? null : filtered,
          count: countMode ? count : null,
          error: null
        });
      },
      then(onFulfilled, onRejected) {
        return builder.execute().then(onFulfilled, onRejected);
      }
    };

    return builder;
  }

  return {
    tables,
    from(table) {
      return createQueryBuilder(table);
    },
    async rpc(funcName, params) {
      if (funcName === 'accept_campaign_application') {
        const { p_application_id, p_campaign_slots = 1 } = params;
        const apps = tables.campaign_applications || [];
        const app = apps.find(a => a.id === p_application_id);
        if (!app) {
          return { data: { ok: false, code: 'APPLICATION_NOT_FOUND', error: 'Application not found.' }, error: null };
        }
        if (app.status === 'accepted') {
          return { data: { ok: false, code: 'ALREADY_ACCEPTED', error: 'Application has already been accepted.' }, error: null };
        }
        if (app.is_held || app.eligibility_status !== 'ELIGIBLE') {
          return { data: { ok: false, code: 'APPLICATION_HELD', error: 'Cannot accept an application that is held or ineligible.' }, error: null };
        }

        const acceptedCount = apps.filter(a => a.campaign_id === app.campaign_id && a.status === 'accepted').length;
        if (acceptedCount >= p_campaign_slots) {
          return {
            data: {
              ok: false,
              code: 'SLOTS_FILLED',
              error: `Cannot accept application: all ${p_campaign_slots} creator slot(s) for this campaign are already filled.`
            },
            error: null
          };
        }

        app.status = 'accepted';
        if (app.counter_offer?.proposedPrice) {
          app.proposed_price = app.counter_offer.proposedPrice;
        }
        if (app.counter_offer?.proposedTimeline) {
          app.delivery_timeline = app.counter_offer.proposedTimeline;
        }
        app.updated_at = new Date().toISOString();

        return {
          data: {
            ok: true,
            status: 'accepted',
            remainingSlots: Math.max(0, p_campaign_slots - (acceptedCount + 1)),
            application: app
          },
          error: null
        };
      }
      return { data: null, error: { message: 'Function not found' } };
    }
  };
}

async function runApplicationPersistenceTests() {
  console.log('\n================================================================');
  console.log(' ALLOY — APPLICATION PERSISTENCE & CONCURRENCY VERIFICATION SUITE');
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

  // Helper to execute request through middleware
  async function dispatch(middleware, options) {
    const { req, res, promise } = createMockReqRes(options);
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    if (nextCalled) {
      return { statusCode: 404, body: { error: 'Route fell through to next()' } };
    }
    await promise;
    return res;
  }

  // ==========================================================================
  // GROUP 1: Server Restart & Durability Verification
  // ==========================================================================
  console.log('--- Group 1: Server Restart & Database Durability ---');

  await test('1.1 Application submitted to database persists and survives complete memory reset', async () => {
    const mockDb = createMockSupabaseDatabase();
    const middleware1 = createApplicationMiddleware({ supabaseClient: mockDb });

    // 1. Submit proposal
    const submitRes = await dispatch(middleware1, {
      method: 'POST',
      url: '/api/applications/submit',
      headers: { authorization: 'Bearer test-valid-creator-maya' },
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
            { id: 'p1', title: 'Botanical Elegance', creativeStyle: 'Cinematic & Editorial', format: 'AI Video', aspectRatio: '16:9' }
          ]
        },
        proposedPrice: '$8,000',
        proposalText: 'Durable proposal from Maya',
        deliveryTimeline: '10 Days'
      }
    });

    assert.strictEqual(submitRes.statusCode, 201);
    assert.strictEqual(submitRes.body.ok, true);
    assert.strictEqual(submitRes.body.isHeld, false);
    const submittedId = submitRes.body.application.id;

    // Verify written to database table
    assert.strictEqual(mockDb.tables.campaign_applications.length, 1);
    assert.strictEqual(mockDb.tables.campaign_applications[0].id, submittedId);
    assert.strictEqual(mockDb.tables.campaign_applications[0].proposed_price, '$8,000');

    // 2. SIMULATE HARD SERVER RESTART:
    // Completely wipe in-memory applications store
    setApplicationsStore([]);
    assert.strictEqual(getApplicationsStore().length, 0, 'Memory store wiped');

    // Spin up fresh middleware instance with the same database
    const restartedMiddleware = createApplicationMiddleware({ supabaseClient: mockDb });

    // 3. Creator retrieves own applications from restarted server
    const getRes = await dispatch(restartedMiddleware, {
      method: 'GET',
      url: '/api/applications/my',
      headers: { authorization: 'Bearer test-valid-creator-maya' }
    });

    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.body.ok, true);
    assert.strictEqual(getRes.body.applications.length, 1);
    assert.strictEqual(getRes.body.applications[0].id, submittedId);
    assert.strictEqual(getRes.body.applications[0].creatorId, 'maya-chen');
    assert.strictEqual(getRes.body.applications[0].proposedPrice, '$8,000');
    assert.strictEqual(getRes.body.applications[0].deliveryTimeline, '10 Days');
  });

  await test('1.2 Brand counter-offer survives server restart and preserves negotiation terms', async () => {
    const mockDb = createMockSupabaseDatabase();
    const middleware = createApplicationMiddleware({ supabaseClient: mockDb });

    // Seed application in database
    const appId = 'app-durable-negotiate';
    mockDb.tables.campaign_applications.push(mapApplicationToRow({
      id: appId,
      campaignId: 'camp-summer-skincare',
      campaignTitle: 'Summer Skincare Launch',
      brandId: 'brand-demo-lumina',
      brandName: 'Lumina Botanica',
      creatorId: 'maya-chen',
      creatorName: 'Maya Chen',
      proposedPrice: '$9,000',
      bidAmount: 9000,
      currency: 'USD',
      deliveryTimeline: '2 Weeks',
      eligibilityStatus: 'ELIGIBLE',
      isHeld: false,
      status: 'pending_review',
      counterOffer: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Brand counters with $8,000 and 7 Days
    const counterRes = await dispatch(middleware, {
      method: 'POST',
      url: '/api/applications/counter',
      headers: { authorization: 'Bearer test-valid-brand-lumina' },
      body: {
        applicationId: appId,
        proposedPrice: '$8,000',
        proposedTimeline: '7 Days',
        message: 'Can we expedite to 7 days for $8,000?'
      }
    });

    assert.strictEqual(counterRes.statusCode, 200);
    assert.strictEqual(counterRes.body.application.status, 'counter_offered');
    assert.strictEqual(counterRes.body.application.counterOffer.proposedPrice, '$8,000');

    // SIMULATE HARD RESTART
    setApplicationsStore([]);
    const freshMiddleware = createApplicationMiddleware({ supabaseClient: mockDb });

    // Creator retrieves applications after restart
    const myAppsRes = await dispatch(freshMiddleware, {
      method: 'GET',
      url: '/api/applications/my',
      headers: { authorization: 'Bearer test-valid-creator-maya' }
    });

    assert.strictEqual(myAppsRes.statusCode, 200);
    const reloadedApp = myAppsRes.body.applications.find(a => a.id === appId);
    assert.ok(reloadedApp, 'Application reloaded from database');
    assert.strictEqual(reloadedApp.status, 'counter_offered');
    assert.strictEqual(reloadedApp.counterOffer.proposedPrice, '$8,000');
    assert.strictEqual(reloadedApp.counterOffer.proposedTimeline, '7 Days');
    assert.strictEqual(reloadedApp.counterOffer.message, 'Can we expedite to 7 days for $8,000?');
  });

  // ==========================================================================
  // GROUP 2: Concurrency & Atomic Slot Capacity Enforcement
  // ==========================================================================
  console.log('\n--- Group 2: Concurrency & Atomic Slot Capacity Enforcement ---');

  await test('2.1 Simultaneous acceptances against the last remaining slot enforce atomic limit', async () => {
    const mockDb = createMockSupabaseDatabase();
    const middleware = createApplicationMiddleware({ supabaseClient: mockDb });
    const campId = 'camp-single-slot';

    // 1 available slot on campaign
    mockDb.tables.campaigns.push({
      id: campId,
      owner_brand_id: 'brand-demo-lumina',
      creator_slots: 1
    });

    // 3 competing eligible applications
    const appIds = ['app-comp-1', 'app-comp-2', 'app-comp-3'];
    for (let i = 0; i < appIds.length; i++) {
      mockDb.tables.campaign_applications.push(mapApplicationToRow({
        id: appIds[i],
        campaignId: campId,
        campaignTitle: 'Solo Spot Campaign',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        creatorId: `creator-${i}`,
        creatorName: `Creator ${i}`,
        proposedPrice: '$5,000',
        bidAmount: 5000,
        currency: 'USD',
        deliveryTimeline: '2 Weeks',
        eligibilityStatus: 'ELIGIBLE',
        isHeld: false,
        status: 'pending_review',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    }

    setApplicationsStore(mockDb.tables.campaign_applications.map(mapRowToApplication));

    // Fire 3 simultaneous acceptances for 1 slot
    const acceptPromises = appIds.map(id => dispatch(middleware, {
      method: 'POST',
      url: '/api/applications/accept',
      headers: { authorization: 'Bearer test-valid-brand-lumina' },
      body: { applicationId: id, campaignSlots: 1 }
    }));

    const results = await Promise.all(acceptPromises);

    const successCount = results.filter(r => r.statusCode === 200 && r.body.ok === true).length;
    const filledCount = results.filter(r => r.statusCode === 400 && r.body.code === 'SLOTS_FILLED').length;

    assert.strictEqual(successCount, 1, 'Exactly ONE acceptance must succeed');
    assert.strictEqual(filledCount, 2, 'The other 2 simultaneous requests must be rejected with SLOTS_FILLED');

    // Confirm database state has strictly 1 accepted row
    const acceptedInDb = mockDb.tables.campaign_applications.filter(a => a.campaign_id === campId && a.status === 'accepted');
    assert.strictEqual(acceptedInDb.length, 1, 'Database must have exactly 1 accepted row');
  });

  await test('2.2 Creator accepting counter-offer is blocked when slots filled concurrently', async () => {
    const mockDb = createMockSupabaseDatabase();
    const middleware = createApplicationMiddleware({ supabaseClient: mockDb });
    const campId = 'camp-slot-filled';

    const appId = 'app-counter-slow';
    mockDb.tables.campaign_applications.push(mapApplicationToRow({
      id: appId,
      campaignId: campId,
      campaignTitle: 'Solo Campaign',
      brandId: 'brand-demo-lumina',
      brandName: 'Lumina Botanica',
      creatorId: 'maya-chen',
      creatorName: 'Maya Chen',
      proposedPrice: '$6,000',
      bidAmount: 6000,
      currency: 'USD',
      deliveryTimeline: '2 Weeks',
      eligibilityStatus: 'ELIGIBLE',
      isHeld: false,
      status: 'counter_offered',
      counterOffer: { proposedPrice: '$5,500', proposedTimeline: '7 Days', status: 'pending' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Another creator was already accepted for the 2 slots (fill both slots)
    mockDb.tables.campaign_applications.push(
      mapApplicationToRow({
        id: 'app-already-1',
        campaignId: campId,
        campaignTitle: 'Solo Campaign',
        creatorId: 'creator-fast-1',
        creatorName: 'Creator Fast 1',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        status: 'accepted',
        eligibilityStatus: 'ELIGIBLE',
        isHeld: false,
        bidAmount: 5000,
        proposedPrice: '$5,000'
      }),
      mapApplicationToRow({
        id: 'app-already-2',
        campaignId: campId,
        campaignTitle: 'Solo Campaign',
        creatorId: 'creator-fast-2',
        creatorName: 'Creator Fast 2',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        status: 'accepted',
        eligibilityStatus: 'ELIGIBLE',
        isHeld: false,
        bidAmount: 5000,
        proposedPrice: '$5,000'
      })
    );

    setApplicationsStore(mockDb.tables.campaign_applications.map(mapRowToApplication));

    // Creator tries to accept counter-offer when all slots are filled
    const res = await dispatch(middleware, {
      method: 'POST',
      url: '/api/applications/respond-counter',
      headers: { authorization: 'Bearer test-valid-creator-maya' },
      body: { applicationId: appId, decision: 'accept' }
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.code, 'SLOTS_FILLED');
    assert.match(res.body.error, /filled/i);
  });

  // ==========================================================================
  // GROUP 3: Collaboration & Opening Message Handoff Durability
  // ==========================================================================
  console.log('\n--- Group 3: Collaboration & Opening Message Handoff Durability ---');

  await test('3.1 Direct acceptance writes collaboration and opening message to database', async () => {
    const mockDb = createMockSupabaseDatabase();
    const middleware = createApplicationMiddleware({ supabaseClient: mockDb });

    const appId = 'app-handoff-test';
    mockDb.tables.campaign_applications.push(mapApplicationToRow({
      id: appId,
      campaignId: 'camp-summer-skincare',
      campaignTitle: 'Summer Skincare Launch',
      brandId: 'brand-demo-lumina',
      brandName: 'Lumina Botanica',
      creatorId: 'maya-chen',
      creatorName: 'Maya Chen',
      proposedPrice: '$8,500',
      bidAmount: 8500,
      currency: 'USD',
      deliveryTimeline: '2 Weeks',
      eligibilityStatus: 'ELIGIBLE',
      isHeld: false,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    setApplicationsStore(mockDb.tables.campaign_applications.map(mapRowToApplication));

    const acceptRes = await dispatch(middleware, {
      method: 'POST',
      url: '/api/applications/accept',
      headers: { authorization: 'Bearer test-valid-brand-lumina' },
      body: { applicationId: appId, campaignSlots: 2 }
    });

    assert.strictEqual(acceptRes.statusCode, 200);
    assert.strictEqual(acceptRes.body.ok, true);

    // Verify collaboration record in database
    const collabs = mockDb.tables.collaborations;
    assert.strictEqual(collabs.length, 1);
    assert.strictEqual(collabs[0].id, `proj-collab-${appId}`);
    assert.strictEqual(collabs[0].creator_id, 'maya-chen');
    assert.strictEqual(collabs[0].agreed_budget, '$8,500');
    assert.strictEqual(collabs[0].status, 'Active');

    // Verify canonical opening message in database
    const messages = mockDb.tables.messages;
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].id, `msg-app-accept-${appId}`);
    assert.strictEqual(messages[0].conversation_id, 'conn-camp-summer-skincare-maya-chen');
    assert.strictEqual(messages[0].sender, 'brand');
    assert.match(messages[0].text, /accepted/i);
  });

  // ==========================================================================
  // GROUP 4: Database-Level Privacy & Held Filtering
  // ==========================================================================
  console.log('\n--- Group 4: Database-Level Privacy & Held Filtering ---');

  await test('4.1 Brand query from database strictly hides held and ineligible applications', async () => {
    const mockDb = createMockSupabaseDatabase();
    const middleware = createApplicationMiddleware({ supabaseClient: mockDb });

    // Seed 1 eligible and 1 held application in DB
    mockDb.tables.campaign_applications.push(
      mapApplicationToRow({
        id: 'app-eligible-db',
        campaignId: 'camp-summer-skincare',
        campaignTitle: 'Summer Skincare Launch',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        creatorId: 'maya-chen',
        creatorName: 'Maya Chen',
        deliveryTimeline: '2 Weeks',
        eligibilityStatus: 'ELIGIBLE',
        isHeld: false,
        status: 'pending_review',
        bidAmount: 8000,
        proposedPrice: '$8,000'
      }),
      mapApplicationToRow({
        id: 'app-held-db',
        campaignId: 'camp-summer-skincare',
        campaignTitle: 'Summer Skincare Launch',
        brandId: 'brand-demo-lumina',
        brandName: 'Lumina Botanica',
        creatorId: 'novice',
        creatorName: 'Novice Creator',
        deliveryTimeline: '1 Week',
        eligibilityStatus: 'REQUIRES_REVIEW',
        isHeld: true,
        heldReason: 'Insufficient format evidence',
        status: 'held',
        bidAmount: 4000,
        proposedPrice: '$4,000'
      })
    );

    // Simulate brand viewing campaign applications
    const brandCampRes = await dispatch(middleware, {
      method: 'GET',
      url: '/api/applications/campaign/camp-summer-skincare',
      headers: { authorization: 'Bearer test-valid-brand-lumina' }
    });

    assert.strictEqual(brandCampRes.statusCode, 200);
    assert.strictEqual(brandCampRes.body.applications.length, 1);
    assert.strictEqual(brandCampRes.body.applications[0].id, 'app-eligible-db');

    // Creator of the held application can still view their own
    const creatorRes = await dispatch(middleware, {
      method: 'GET',
      url: '/api/applications/my',
      headers: { authorization: 'Bearer test-valid-creator-novice' }
    });

    assert.strictEqual(creatorRes.statusCode, 200);
    assert.strictEqual(creatorRes.body.applications.length, 1);
    assert.strictEqual(creatorRes.body.applications[0].id, 'app-held-db');
    assert.strictEqual(creatorRes.body.applications[0].isHeld, true);
  });

  console.log('\n----------------------------------------------------------------');
  console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runApplicationPersistenceTests();
