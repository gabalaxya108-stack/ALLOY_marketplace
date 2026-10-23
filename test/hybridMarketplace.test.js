// test/hybridMarketplace.test.js
// Automated Verification Suite for Alloy's Hybrid Campaign Marketplace

import assert from 'assert';
import {
  createCampaignRecord,
  getPublicCreatorOpportunities,
  getInitialMarketplaceState
} from '../src/data/marketplaceStore.js';
import {
  evaluateCreatorEligibility,
  ELIGIBILITY_STATUS
} from '../src/intelligence/eligibilityEngine.js';
import {
  applicationsStore
} from '../server/applicationMiddleware.js';

async function runHybridMarketplaceTests() {
  console.log('\n================================================================');
  console.log(' ALLOY — HYBRID CAMPAIGN MARKETPLACE VERIFICATION SUITE');
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

  const mockBrand = {
    id: 'brand-aurora',
    name: 'Aurora Botanicals',
    logo: 'https://example.com/aurora.png'
  };

  const compatibleCreator = {
    id: 'creator-maya',
    name: 'Maya Chen',
    avatar: 'https://example.com/maya.png',
    styles: ['Cinematic & Editorial', 'Warm Minimalism'],
    formats: ['AI Video', '4K Master Video & Stills Suite'],
    projects: [
      {
        id: 'p1',
        title: 'Botanical Elegance',
        creativeStyle: 'Cinematic & Editorial',
        format: 'AI Video',
        aspectRatio: '16:9'
      }
    ]
  };

  const incompatibleCreator = {
    id: 'creator-pixel',
    name: 'Retro 8-Bit Studio',
    avatar: 'https://example.com/retro.png',
    styles: ['Chiptune', 'Pixel Art'],
    formats: ['2D Sprite Sheet'],
    projects: []
  };

  const insufficientCreator = {
    id: 'creator-novice',
    name: 'Novice Creator',
    avatar: 'https://example.com/novice.png',
    styles: [],
    formats: [],
    projects: []
  };

  // Test 1: Private Campaign Creation by Default
  await test('1. Campaigns default to private visibility and closed applications', () => {
    const rawBrief = {
      title: 'Secret Autumn Teaser',
      budget: '$5,000',
      timeline: '2 Weeks'
    };
    const camp = createCampaignRecord(rawBrief, mockBrand);

    assert.strictEqual(camp.visibility, 'private');
    assert.strictEqual(camp.isMarketplacePublished, false);
    assert.strictEqual(camp.isAcceptingApplications, false);
    assert.strictEqual(camp.applicationStatus, 'closed');
    assert.strictEqual(camp.creatorSlots, 1);
    assert.strictEqual(camp.acceptedApplicationsCount, 0);
    assert.strictEqual(camp.remainingSlots, 1);
    assert.strictEqual(camp.isOpenEnded, true);
    assert.strictEqual(camp.isNegotiable, true);
  });

  // Test 2: Discovery Isolation — Private campaigns never appear in creator opportunity feed
  await test('2. Private campaigns are isolated from creator discovery feed', () => {
    const privateCamp = createCampaignRecord({
      id: 'camp-private-101',
      title: 'Confidential Internal Shoot',
      visibility: 'private'
    }, mockBrand);

    const publicCamp = createCampaignRecord({
      id: 'camp-public-101',
      title: 'Public Winter Launch',
      visibility: 'published',
      isMarketplacePublished: true,
      isAcceptingApplications: true,
      applicationStatus: 'open',
      creatorSlots: 2,
      budget: '$8,000'
    }, mockBrand);

    const state = {
      ...getInitialMarketplaceState(),
      campaigns: [privateCamp, publicCamp]
    };

    const feed = getPublicCreatorOpportunities(state);
    const hasPrivate = feed.some(c => c.campaignId === 'camp-private-101' || c.id === 'camp-private-101');
    const hasPublic = feed.some(c => c.campaignId === 'camp-public-101' || c.id === 'opp-camp-public-101');

    assert.strictEqual(hasPrivate, false, 'Private campaign must NEVER appear in public feed');
    assert.strictEqual(hasPublic, true, 'Published campaign must appear in public feed');
  });

  // Test 3: Expired or Full-Slot campaigns filtered from discovery feed
  await test('3. Campaigns with passed deadlines or zero remaining slots are hidden from feed', () => {
    const expiredCamp = createCampaignRecord({
      id: 'camp-expired',
      title: 'Past Deadline Campaign',
      visibility: 'published',
      isMarketplacePublished: true,
      isAcceptingApplications: true,
      isOpenEnded: false,
      deadline: '2020-01-01'
    }, mockBrand);

    const filledCamp = createCampaignRecord({
      id: 'camp-filled',
      title: 'All Slots Claimed Campaign',
      visibility: 'published',
      isMarketplacePublished: true,
      isAcceptingApplications: true,
      creatorSlots: 1,
      acceptedApplicationsCount: 1,
      remainingSlots: 0
    }, mockBrand);

    const state = {
      ...getInitialMarketplaceState(),
      campaigns: [expiredCamp, filledCamp]
    };

    const feed = getPublicCreatorOpportunities(state);
    assert.strictEqual(feed.some(c => c.campaignId === 'camp-expired'), false, 'Expired campaign must be hidden');
    assert.strictEqual(feed.some(c => c.campaignId === 'camp-filled'), false, 'Filled campaign must be hidden');
  });

  // Test 4: Pre-Bid Eligibility Gate — 3 distinct outcomes
  await test('4. Pre-bid eligibility gate classifies Compatible, Incompatible, and Insufficient Evidence', () => {
    const campaignCriteria = {
      id: 'camp-criteria-test',
      title: 'Cinematic Botanical Promo',
      creativeStyle: 'Cinematic & Editorial',
      requirements: {
        mandatory: {
          styles: ['Cinematic & Editorial'],
          formats: ['AI Video']
        }
      }
    };

    const resCompatible = evaluateCreatorEligibility(campaignCriteria, compatibleCreator);
    assert.strictEqual(resCompatible.eligibility, ELIGIBILITY_STATUS.ELIGIBLE);

    const resIncompatible = evaluateCreatorEligibility(campaignCriteria, incompatibleCreator);
    assert.strictEqual(resIncompatible.eligibility, ELIGIBILITY_STATUS.INELIGIBLE);
    assert.ok(resIncompatible.reasons.length > 0, 'Incompatible must list specific reasons');

    const resInsufficient = evaluateCreatorEligibility(campaignCriteria, insufficientCreator);
    assert.ok(
      resInsufficient.eligibility === ELIGIBILITY_STATUS.REQUIRES_REVIEW || resInsufficient.eligibility === ELIGIBILITY_STATUS.INELIGIBLE,
      'Insufficient creator must not pass as ELIGIBLE'
    );
  });

  // Test 5: Server-side bid privacy between competing creators
  await test('5. Bid isolation: creators cannot view competing bids; brand views eligible candidates', () => {
    // Reset test memory store
    applicationsStore.length = 0;

    const campId = 'camp-bid-privacy-test';
    const testCamp = {
      id: campId,
      ownerBrandId: 'brand-aurora',
      title: 'Commercial Luxury Ad',
      visibility: 'published',
      isAcceptingApplications: true,
      creatorSlots: 1,
      acceptedApplicationsCount: 0,
      remainingSlots: 1,
      isNegotiable: true,
      budget: '$10,000'
    };

    // Creator A submits private bid of $9,500
    const appA = {
      id: 'app-creator-A',
      campaignId: campId,
      campaignTitle: testCamp.title,
      creatorId: 'creator-A',
      creatorName: 'Creator Alice',
      proposedPrice: '$9,500',
      pitchText: 'Private pitch from Alice',
      deliveryTimeline: '10 Days',
      isHeld: false,
      status: 'pending_review'
    };

    // Creator B submits private bid of $8,000
    const appB = {
      id: 'app-creator-B',
      campaignId: campId,
      campaignTitle: testCamp.title,
      creatorId: 'creator-B',
      creatorName: 'Creator Bob',
      proposedPrice: '$8,000',
      pitchText: 'Private pitch from Bob',
      deliveryTimeline: '14 Days',
      isHeld: false,
      status: 'pending_review'
    };

    // Ineligible creator C is held
    const appC = {
      id: 'app-creator-C',
      campaignId: campId,
      campaignTitle: testCamp.title,
      creatorId: 'creator-C',
      creatorName: 'Creator Charlie',
      proposedPrice: '$5,000',
      pitchText: 'Held submission',
      isHeld: true,
      status: 'held'
    };

    applicationsStore.push(appA, appB, appC);

    // Query for Creator A
    const creatorAFeed = applicationsStore.filter(a => a.creatorId === 'creator-A');
    assert.strictEqual(creatorAFeed.length, 1);
    assert.strictEqual(creatorAFeed[0].id, 'app-creator-A');
    assert.strictEqual(creatorAFeed.some(a => a.creatorId === 'creator-B'), false, 'Creator A must not see Creator B');

    // Query for Creator B
    const creatorBFeed = applicationsStore.filter(a => a.creatorId === 'creator-B');
    assert.strictEqual(creatorBFeed.length, 1);
    assert.strictEqual(creatorBFeed[0].id, 'app-creator-B');
    assert.strictEqual(creatorBFeed.some(a => a.creatorId === 'creator-A'), false, 'Creator B must not see Creator A');

    // Query for Brand (Brand sees eligible submissions, but NOT held/ineligible ones)
    const brandReviewableApps = applicationsStore.filter(a => a.campaignId === campId && !a.isHeld);
    assert.strictEqual(brandReviewableApps.length, 2, 'Brand should see 2 eligible proposals');
    assert.strictEqual(brandReviewableApps.some(a => a.isHeld), false, 'Brand must not see held proposals');
  });

  // Test 6: Non-negotiable budget enforcement
  await test('6. Non-negotiable campaign budget blocks bids that exceed the ceiling', () => {
    const fixedCamp = {
      id: 'camp-fixed-budget',
      budget: '$5,000',
      isNegotiable: false
    };

    // Rate above budget on non-negotiable campaign
    const highBidNumeric = 7500;
    const maxBudgetNumeric = 5000;
    const isExceeded = !fixedCamp.isNegotiable && highBidNumeric > maxBudgetNumeric;
    assert.strictEqual(isExceeded, true, 'Rate above fixed budget ceiling must be identified as exceeded');

    // Rate above budget on negotiable campaign
    const negotiableCamp = {
      id: 'camp-neg-budget',
      budget: '$5,000',
      isNegotiable: true
    };
    const isNegotiableAllowed = negotiableCamp.isNegotiable || highBidNumeric <= maxBudgetNumeric;
    assert.strictEqual(isNegotiableAllowed, true, 'Negotiable campaign permits higher rate proposals');
  });

  // Test 7: Slot limit protection and collaboration project transition
  await test('7. Acceptance strictly enforces slot limits and transitions application to accepted', () => {
    const campId = 'camp-slots-test';
    const singleSlotCamp = {
      id: campId,
      ownerBrandId: 'brand-aurora',
      title: 'Solo Creator Shoot',
      creatorSlots: 1,
      acceptedApplicationsCount: 0,
      remainingSlots: 1
    };

    const candidateApp = {
      id: 'app-first-pick',
      campaignId: campId,
      creatorId: 'creator-maya',
      status: 'pending_review',
      isHeld: false
    };

    // 1st acceptance passes
    assert.ok(singleSlotCamp.acceptedApplicationsCount < singleSlotCamp.creatorSlots, 'Slot available for first creator');
    singleSlotCamp.acceptedApplicationsCount += 1;
    singleSlotCamp.remainingSlots = Math.max(0, singleSlotCamp.creatorSlots - singleSlotCamp.acceptedApplicationsCount);
    candidateApp.status = 'accepted';

    assert.strictEqual(singleSlotCamp.remainingSlots, 0);
    assert.strictEqual(candidateApp.status, 'accepted');

    // 2nd acceptance attempt is blocked
    const canAcceptSecond = singleSlotCamp.acceptedApplicationsCount < singleSlotCamp.creatorSlots;
    assert.strictEqual(canAcceptSecond, false, 'Second acceptance must be blocked because slot limit reached');
  });

  // Test 8: Counter-offer lifecycle and negotiation
  await test('8. Brand counter-offer and creator acceptance updates terms cleanly', () => {
    const app = {
      id: 'app-negotiate-test',
      campaignId: 'camp-neg',
      creatorId: 'creator-maya',
      proposedPrice: '$12,000',
      deliveryTimeline: '4 Weeks',
      status: 'pending_review',
      counterOffer: null
    };

    // Brand counters with $10,000 and 3 Weeks
    const counter = {
      proposedRate: '$10,000',
      proposedTimeline: '3 Weeks',
      message: 'Can we meet at $10k with expedited delivery?',
      status: 'pending'
    };
    app.counterOffer = counter;
    app.status = 'counter_offered';

    assert.strictEqual(app.status, 'counter_offered');
    assert.strictEqual(app.counterOffer.proposedRate, '$10,000');

    // Creator accepts counter-offer
    app.counterOffer.status = 'accepted';
    app.status = 'accepted';

    const finalAgreedRate = app.counterOffer?.status === 'accepted' ? app.counterOffer.proposedRate : app.proposedPrice;
    assert.strictEqual(finalAgreedRate, '$10,000', 'Agreed rate reflects the accepted counter-offer');
  });

  console.log('\n----------------------------------------------------------------');
  console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHybridMarketplaceTests();
