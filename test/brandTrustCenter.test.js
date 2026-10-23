// test/brandTrustCenter.test.js
// ALLOY Brand Trust Centre Comprehensive Verification & Regression Protection Test Suite

import assert from 'assert';
import {
  BRAND_TRUST_PILLARS,
  BRAND_BADGE_DEFINITIONS,
  VERIFICATION_STATUSES,
  STATUS_META,
  calculateBrandTrustSummary,
  calculateCampaignTransparencyScore,
  calculatePaymentReliabilityMetrics,
  calculateCollaborationIntegrityMetrics,
  getBrandTrustBadges,
  createInitialBrandTrustVerification
} from '../src/data/brandTrustVerificationData.js';

import {
  getVerificationClaims,
  submitVerificationClaim,
  reviewVerificationClaim,
  getVerificationAuditLog
} from '../server/trustService.js';

import {
  getVerificationClaimsRecord,
  submitVerificationClaimRecord,
  reviewVerificationClaimRecord
} from '../src/data/marketplaceStore.js';

async function runBrandTrustCenterTests() {
  console.log('\n================================================================');
  console.log(' ALLOY — BRAND TRUST CENTRE VERIFICATION & REGRESSION SUITE');
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

  // =========================================================================
  // PILLAR 1: Four Brand Trust Pillars Structure
  // =========================================================================
  await test('Pillar Schema: Exactly 4 canonical brand trust pillars are defined with required attributes', async () => {
    assert.strictEqual(Array.isArray(BRAND_TRUST_PILLARS), true);
    assert.strictEqual(BRAND_TRUST_PILLARS.length, 4);

    const pillarIds = BRAND_TRUST_PILLARS.map(c => c.id);
    assert.deepStrictEqual(pillarIds, [
      'business_identity',
      'campaign_transparency',
      'payment_reliability',
      'collaboration_integrity'
    ]);

    for (const pillar of BRAND_TRUST_PILLARS) {
      assert(pillar.title, `Pillar ${pillar.id} must have a title`);
      assert(pillar.shortDesc, `Pillar ${pillar.id} must have a shortDesc`);
      assert(pillar.explanation, `Pillar ${pillar.id} must have an explanation`);
      assert(pillar.icon, `Pillar ${pillar.id} must have an icon`);
    }
  });

  // =========================================================================
  // PILLAR 2: Factual Summary Calculation & Absence of Fake Scores
  // =========================================================================
  await test('Trust Summary: Audited completion rate matches verified pillars without inventing fake composite scores', async () => {
    const mockBrand = {
      id: 'brand-test-1',
      name: 'Acme AI Studios',
      website: 'https://acme.ai'
    };

    // Case A: 0 pillars verified
    const emptyTrustData = {
      email: { status: 'pending_review' },
      entity: { status: 'not_submitted' },
      campaignTransparency: { status: 'not_submitted' },
      payment: { status: 'not_submitted' },
      collaborationIntegrity: { status: 'not_submitted' }
    };
    const summaryZero = calculateBrandTrustSummary(emptyTrustData, mockBrand, [], [], []);
    assert.strictEqual(typeof summaryZero.completionRate, 'number');
    assert.strictEqual(summaryZero.verifiedCount, 0);
    assert.strictEqual(summaryZero.totalCategories, 4);
    assert.strictEqual(summaryZero.completionRate, 0);
    assert.strictEqual(summaryZero.compositeScore, undefined, 'Must NOT invent an arbitrary composite score');

    // Case B: 2 pillars verified (Identity + Payment)
    const twoVerifiedTrustData = {
      email: { status: 'verified' },
      entity: { status: 'verified' },
      campaignTransparency: { status: 'self_declared' },
      payment: { status: 'verified' },
      collaborationIntegrity: { status: 'self_declared' }
    };
    const summaryTwo = calculateBrandTrustSummary(twoVerifiedTrustData, mockBrand, [], [], []);
    assert.strictEqual(summaryTwo.verifiedCount, 2);
    assert.strictEqual(summaryTwo.completionRate, 50);

    // Case C: All 4 verified
    const allVerifiedTrustData = {
      email: { status: 'verified' },
      entity: { status: 'verified' },
      campaignTransparency: { status: 'verified' },
      payment: { status: 'verified' },
      collaborationIntegrity: { status: 'verified' }
    };
    const summaryAll = calculateBrandTrustSummary(allVerifiedTrustData, mockBrand, [], [], []);
    assert.strictEqual(summaryAll.verifiedCount, 4);
    assert.strictEqual(summaryAll.completionRate, 100);
  });

  // =========================================================================
  // PILLAR 3: Campaign Transparency Calculation
  // =========================================================================
  await test('Campaign Transparency: Real campaign evaluation calculates factual completeness', async () => {
    // Empty campaign list
    const emptyResult = calculateCampaignTransparencyScore([]);
    assert.strictEqual(emptyResult.totalCampaigns, 0);
    assert.strictEqual(emptyResult.score, 0);
    assert.strictEqual(emptyResult.status, 'not_submitted');

    // Partial campaign
    const partialCampaigns = [
      {
        id: 'camp-1',
        title: 'Minimal Brief',
        objective: 'Product Launch',
        budget: '$1,000'
        // Missing deliverables, timeline, target_audience
      }
    ];
    const partialResult = calculateCampaignTransparencyScore(partialCampaigns);
    assert.strictEqual(partialResult.totalCampaigns, 1);
    assert(partialResult.score > 0 && partialResult.score < 100);
    assert(partialResult.items[0].missing.length > 0);

    // Fully detailed campaign
    const completeCampaigns = [
      {
        id: 'camp-2',
        title: 'Complete Luxury Launch',
        objective: 'Brand Awareness',
        description: 'Detailed campaign brief with specific visual guidelines and requirements.',
        budget: '$8,000',
        timeline: '3 Weeks',
        deliverables: ['3x 4K Stills', '1x 9:16 Video Loop'],
        creative_direction: 'Editorial Macro Luminous',
        target_audience: 'Tech early adopters'
      }
    ];
    const completeResult = calculateCampaignTransparencyScore(completeCampaigns);
    assert.strictEqual(completeResult.totalCampaigns, 1);
    assert.strictEqual(completeResult.score, 100);
    assert.strictEqual(completeResult.status, 'verified');
    assert.strictEqual(completeResult.items[0].missing.length, 0);
  });

  // =========================================================================
  // PILLAR 4: Payment Reliability Metrics
  // =========================================================================
  await test('Payment Reliability: Derives metrics from real Razorpay funding records', async () => {
    const mockFunding = [
      {
        id: 'fund-1',
        brandId: 'brand-test-1',
        campaignId: 'camp-1',
        amount_rupees: 50000,
        currency: 'INR',
        status: 'captured',
        method: 'card',
        created_at: '2026-10-15T10:00:00Z'
      },
      {
        id: 'fund-2',
        brandId: 'brand-test-1',
        campaignId: 'camp-2',
        amount_rupees: 75000,
        currency: 'INR',
        status: 'captured',
        method: 'upi',
        created_at: '2026-10-18T10:00:00Z'
      }
    ];

    const metrics = calculatePaymentReliabilityMetrics(mockFunding, [], {});
    assert.strictEqual(metrics.totalFundedRupees, 125000);
    assert.strictEqual(metrics.verifiedTransactionsCount, 2);
    assert.strictEqual(metrics.hasVerifiedFunding, true);
    assert.strictEqual(metrics.escrowAccountStanding, 'Active & Funded');

    // Empty funding record
    const emptyMetrics = calculatePaymentReliabilityMetrics([], [], {});
    assert.strictEqual(emptyMetrics.totalFundedRupees, 0);
    assert.strictEqual(emptyMetrics.verifiedTransactionsCount, 0);
    assert.strictEqual(emptyMetrics.hasVerifiedFunding, false);
    assert.strictEqual(emptyMetrics.escrowAccountStanding, 'Awaiting First Milestone Escrow Deposit');
  });

  // =========================================================================
  // PILLAR 5: Collaboration Integrity Metrics & Empty State Handling
  // =========================================================================
  await test('Collaboration Integrity: Gracefully displays No data yet when untracked', async () => {
    const brandWithNoHistory = { id: 'brand-new-1', name: 'Fresh Startup' };
    const integrityEmpty = calculateCollaborationIntegrityMetrics([], brandWithNoHistory);

    assert.strictEqual(integrityEmpty.totalCount, 0);
    assert.strictEqual(integrityEmpty.completedCount, 0);
    assert.strictEqual(integrityEmpty.isVerifiedRecord, false);
    assert.strictEqual(integrityEmpty.averageReviewTime, 'No data yet');

    const mockCollabs = [
      { id: 'collab-1', status: 'Completed', creatorRating: 5 },
      { id: 'collab-2', status: 'Completed', creatorRating: 4.8 }
    ];
    const integrityFull = calculateCollaborationIntegrityMetrics(mockCollabs, brandWithNoHistory);
    assert.strictEqual(integrityFull.totalCount, 2);
    assert.strictEqual(integrityFull.completedCount, 2);
    assert.strictEqual(integrityFull.isVerifiedRecord, true);
    assert.strictEqual(integrityFull.averageReviewTime, '48 hours');
  });

  // =========================================================================
  // PILLAR 6: Brand Badges Derivation
  // =========================================================================
  await test('Brand Badges: Derived strictly from verified states and factual metrics', async () => {
    const mockBrand = {
      id: 'brand-test-1',
      name: 'Acme Corp',
      website: 'https://acme.com',
      trustVerification: {
        email: { status: 'verified', verifiedAt: '2026-10-01' },
        entity: { status: 'verified', reviewedAt: '2026-10-02' },
        campaignTransparency: { status: 'verified' },
        payment: { status: 'verified' },
        collaborationIntegrity: { status: 'verified' }
      }
    };
    const mockUser = { email: 'admin@acme.com', email_confirmed_at: '2026-10-01' };

    const badges = getBrandTrustBadges(mockBrand, mockUser, [], [], []);
    assert(Array.isArray(badges));
    assert.strictEqual(badges.length, 5);

    const emailBadge = badges.find(b => b.id === 'business-email-verified');
    assert(emailBadge);
    assert.strictEqual(emailBadge.status, 'verified');

    const entityBadge = badges.find(b => b.id === 'business-entity-verified');
    assert(entityBadge);
    assert.strictEqual(entityBadge.status, 'verified');
  });

  // =========================================================================
  // BACKEND SECURITY 1: Privacy Masking
  // =========================================================================
  await test('Backend Security: Private evidence is masked for unauthorized/public requests', async () => {
    // Request claims without admin role or brand ownership
    const publicClaims = getVerificationClaims({
      brandId: 'brand-lumina',
      userRole: 'creator',
      requestingUserId: 'creator-random-123'
    });

    const incClaim = publicClaims.find(c => c.id === 'claim-lumina-incorporation');
    assert(incClaim, 'Incorporation claim should be present');
    assert.strictEqual(incClaim.isPrivate, true);
    assert.strictEqual(incClaim.evidenceUrl, null, 'Private evidence URL must be stripped for non-owners');
    assert(incClaim.evidenceDetails.taxIdMasked, 'Private sensitive tax ID should remain masked');
    assert.strictEqual(incClaim.evidenceDetails.documentVaultKey, undefined, 'Internal vault keys must not leak');

    // Request as authorized admin
    const adminClaims = getVerificationClaims({
      brandId: 'brand-lumina',
      userRole: 'admin',
      requestingUserId: 'admin-super-1'
    });
    const incAdminClaim = adminClaims.find(c => c.id === 'claim-lumina-incorporation');
    assert(incAdminClaim.evidenceUrl !== null, 'Admin should see evidence link');
  });

  // =========================================================================
  // BACKEND SECURITY 2: Non-Admin Cannot Self-Approve
  // =========================================================================
  await test('Backend Security: Brand cannot self-approve claims, defaults to pending_review', async () => {
    const submitted = submitVerificationClaim({
      entityId: 'brand-test-unauthorized',
      entityType: 'brand',
      claimType: 'business_identity',
      claimTitle: 'Tampered Approval Claim',
      status: 'verified', // Tampered request payload trying to self-verify
      evidenceType: 'Self Statement'
    }, 'brand');

    assert.strictEqual(submitted.status, 'pending_review', 'Must force pending_review on non-admin submission');
  });

  // =========================================================================
  // BACKEND SECURITY 3: Review Permissions & Audit Trail
  // =========================================================================
  await test('Backend Security: Only authorized admins can review claims and audit logs are recorded', async () => {
    // Non-admin review attempt
    assert.throws(() => {
      reviewVerificationClaim({
        claimId: 'claim-lumina-email',
        decision: 'APPROVE',
        isAuthorized: false
      });
    }, /UNAUTHORIZED/);

    // Authorized admin review
    const result = reviewVerificationClaim({
      claimId: 'claim-lumina-email',
      decision: 'APPROVE',
      notes: 'Admin automated audit confirmation',
      reviewerName: 'Chief Trust Officer',
      isAuthorized: true
    });

    assert.strictEqual(result.claim.status, 'verified');
    assert.strictEqual(result.claim.reviewedBy, 'Chief Trust Officer');

    // Audit log check
    const auditLogs = getVerificationAuditLog({ brandId: 'brand-demo-lumina' });
    assert(auditLogs.length > 0);
    const latest = auditLogs[0];
    assert.strictEqual(latest.reviewerName, 'Chief Trust Officer');
    assert.strictEqual(latest.action, 'APPROVED');
  });

  // =========================================================================
  // STORE PERSISTENCE: Brand and Creator Claims Coexistence
  // =========================================================================
  await test('Store Isolation: Brand seed claims and Creator claims coexist safely in local store', async () => {
    // Creator query
    const creatorClaims = getVerificationClaimsRecord('maya-chen');
    assert(creatorClaims.length > 0, 'Creator claims must be returned');
    assert(creatorClaims.every(c => c.creatorId === 'maya-chen' || c.entityId === 'maya-chen'));

    // Brand query
    const brandClaims = getVerificationClaimsRecord('brand-demo-lumina');
    assert(brandClaims.length > 0, 'Brand claims must be returned');
    assert(brandClaims.some(c => c.id === 'claim-lumina-incorporation'));
    assert(brandClaims.every(c => c.brandId === 'brand-demo-lumina' || c.entityId === 'brand-demo-lumina' || c.id.startsWith('claim-lumina')));
  });

  // =========================================================================
  // RESULTS SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(` TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBrandTrustCenterTests().catch(err => {
  console.error('Fatal error running Brand Trust Centre test suite:', err);
  process.exit(1);
});
