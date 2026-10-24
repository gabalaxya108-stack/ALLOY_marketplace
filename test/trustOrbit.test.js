// test/trustOrbit.test.js
// Automated verification suite for ALLOY Trust Orbit
// Validates:
// 1. Claim submission (submitVerificationClaim)
// 2. Groq AI advisory analysis (analyzeVerificationClaim schema & guardrails)
// 3. Super Admin authorization & human review execution (reviewVerificationClaim)
// 4. Privacy protection & document masking (getVerificationClaims)
// 5. Profile badge synchronization (getCreatorTrustBadges)
// 6. HTTP API endpoints (groqMiddleware & adminMiddleware)

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  submitVerificationClaim,
  reviewVerificationClaim,
  getVerificationClaims,
  runClaimAiReview
} from '../server/trustService.js';
import { analyzeVerificationClaim } from '../server/trustAiReview.js';
import { getCreatorTrustBadges, VERIFICATION_STATUSES } from '../src/data/trustVerificationData.js';
import { createGroqMiddleware } from '../server/groqMiddleware.js';
import { createAdminMiddleware } from '../server/adminMiddleware.js';

function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.replace(/\r/g, '').split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            process.env[key] = val;
          }
        }
      });
    }
  } catch {}
}

loadEnv();

function mockResponse() {
  let statusCode = 200;
  const headers = {};
  let body = '';

  return {
    get statusCode() { return statusCode; },
    set statusCode(code) { statusCode = code; },
    setHeader: (name, val) => { headers[name.toLowerCase()] = val; },
    getHeader: (name) => headers[name.toLowerCase()],
    get headers() { return headers; },
    end: (data) => { body = data; },
    json: () => {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    },
    get rawBody() { return body; }
  };
}

async function runTests() {
  console.log('\n=== RUNNING ALLOY TRUST ORBIT VERIFICATION SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function record(name, condition, errorMsg = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${errorMsg ? `— ${errorMsg}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Claim Submission with Advisory AI Evaluation
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: Claim Submission & Advisory AI ---');
  let testClaimId = null;
  try {
    const claimPayload = {
      creatorId: 'test-creator-001',
      entityName: 'Test Creator Studio',
      pillar: 'portfolio',
      entityType: 'creator',
      evidenceDetails: {
        portfolio_url: 'https://vault.alloy.market/portfolio/sample',
        workflow_type: 'ComfyUI LoRA generation',
        seed_logs: 'Seed #94827104, Euler ancestral 30 steps',
        notes: 'Original master renders provided with workflow json.'
      }
    };

    const result = await submitVerificationClaim(claimPayload);
    const claimObj = result?.claim || result;
    testClaimId = claimObj?.id;

    record('Claim submission returns success', result && (result.ok === true || !!result.id));
    record('Claim has generated ID', !!testClaimId);
    record('Initial status is pending_review', claimObj?.status === 'pending_review');
    record('Advisory AI review is attached', !!claimObj?.aiReview || !!claimObj?.ai_review);

    const aiReview = claimObj?.aiReview || claimObj?.ai_review;
    if (aiReview) {
      record('AI review has valid risk_indicator', ['low', 'medium', 'moderate', 'high', 'inconclusive', 'unconfigured', 'unknown'].includes(aiReview.risk_indicator));
      record('AI review has findings array', Array.isArray(aiReview.findings));
      record('AI review contains advisory notes', typeof aiReview.advisory_notes === 'string');
    }
  } catch (err) {
    record('Claim submission executed without crash', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 2: Groq AI Evidence Analysis Schema & Guardrails
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Groq AI Evidence Guardrails ---');
  try {
    const directAnalysis = await analyzeVerificationClaim({
      pillar: 'commercial_rights',
      claimType: 'commercial_rights',
      entityType: 'brand',
      entityName: 'Acme International',
      evidenceDetails: {
        registration_number: 'US-DEL-984210',
        business_address: '100 Innovation Way, Suite 400',
        commercial_terms: '100% upfront escrow buyout with category exclusivity'
      }
    });

    record('Direct AI analysis returns schema-compliant object', !!directAnalysis);
    record('Direct AI analysis includes risk_indicator', typeof directAnalysis.risk_indicator === 'string');
    record('Direct AI analysis includes confidence numeric score', typeof directAnalysis.confidence === 'number');
    record('Direct AI analysis includes missing_evidence array', Array.isArray(directAnalysis.missing_evidence));
  } catch (err) {
    record('Direct AI analysis executed without crash', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 3: Super Admin Authorization & Decision Authority
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Super Admin Authorization & Decisions ---');
  if (testClaimId) {
    try {
      // 3A: Unauthorized user cannot approve
      let unauthCaught = false;
      try {
        await reviewVerificationClaim({
          claimId: testClaimId,
          decision: 'approved',
          notes: 'Attempt unauthorized approval',
          isAuthorized: false
        });
      } catch (err) {
        unauthCaught = true;
      }
      record('Unauthorized reviewer is rejected', unauthCaught);

      // 3B: Super Admin executes approval
      const adminApproval = await reviewVerificationClaim({
        claimId: testClaimId,
        decision: 'approved',
        notes: 'Audited ComfyUI nodes and seed logs. Verification verified.',
        reviewerName: 'Super Admin Elena',
        isAuthorized: true
      });

      const approvedClaim = adminApproval?.claim || adminApproval;
      record('Super Admin approval succeeds', adminApproval && (adminApproval.ok === true || !!approvedClaim));
      record('Updated status is verified', approvedClaim?.status === 'verified');
      record('Reviewer notes are preserved', approvedClaim?.reviewerNotes === 'Audited ComfyUI nodes and seed logs. Verification verified.');
    } catch (err) {
      record('Super Admin review flow executed', false, err.message);
    }
  }

  // -------------------------------------------------------------
  // TEST 4: Privacy Isolation & Document Masking
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Privacy Isolation & Masking ---');
  try {
    // Submit claim with confidential document URL and tax ID
    const privClaim = await submitVerificationClaim({
      creatorId: 'privacy-test-creator',
      entityName: 'Private Creator',
      pillar: 'identity',
      isPrivate: true,
      evidenceUrl: 'https://secure-vault.alloy.market/passports/secret-id-9912.pdf',
      evidenceDetails: {
        jurisdiction: 'United States',
        regNumber: '•••••• Confidential Pass',
        tax_id: '12-3456789'
      }
    });

    const privClaimId = privClaim?.claim?.id || privClaim?.id;

    // Fetch as public / non-admin user
    const publicClaims = getVerificationClaims({ isAdmin: false, currentUserId: 'third-party-user' });
    const publicClaim = (Array.isArray(publicClaims) ? publicClaims : publicClaims.claims || []).find((c) => c.id === privClaimId);

    if (publicClaim) {
      const isUrlMasked = publicClaim.evidenceUrl === null;
      const isDetailsMasked = publicClaim.evidenceDetails?.masked === true;
      record('Confidential document URL is masked for public callers', isUrlMasked);
      record('Confidential document details are masked for public callers', isDetailsMasked);
    } else {
      record('Privacy isolation retrieved claims', false, 'Claim not found in public query');
    }

    // Fetch as Super Admin
    const adminClaims = getVerificationClaims({ isAdmin: true });
    const adminClaim = (Array.isArray(adminClaims) ? adminClaims : adminClaims.claims || []).find((c) => c.id === privClaimId);
    if (adminClaim) {
      const isDocVisible = adminClaim.evidenceUrl && adminClaim.evidenceUrl.includes('secret-id-9912.pdf');
      record('Confidential document URL is accessible to Super Admin', !!isDocVisible);
    }
  } catch (err) {
    record('Privacy isolation executed without crash', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 5: Public Profile Badge Synchronization
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Profile Badge Synchronization ---');
  try {
    const unverifiedCreator = {
      id: 'test-creator-unverified',
      name: 'Unverified Creator',
      trustVerification: {
        identity: { status: 'not_submitted' },
        portfolio: { status: 'not_submitted' }
      }
    };

    const initialBadges = getCreatorTrustBadges(unverifiedCreator);
    const initialIdentityBadge = initialBadges.find((b) => b.id === 'identity-verified');
    record('Initial creator identity badge is not_submitted', initialIdentityBadge?.status === VERIFICATION_STATUSES.NOT_SUBMITTED);

    // After approval of identity and commercial rights
    const approvedCreator = {
      id: 'test-creator-unverified',
      name: 'Unverified Creator',
      commercial_licensing_verified: true,
      trustVerification: {
        identity: { status: 'verified', reviewedAt: new Date().toISOString() },
        portfolio: { status: 'verified' }
      }
    };

    const approvedBadges = getCreatorTrustBadges(approvedCreator);
    const approvedIdentityBadge = approvedBadges.find((b) => b.id === 'identity-verified');
    const approvedLicensingBadge = approvedBadges.find((b) => b.id === 'commercial-use-declared');

    record('Approved creator identity badge updates to verified', approvedIdentityBadge?.status === VERIFICATION_STATUSES.VERIFIED);
    record('Approved creator commercial badge updates to verified', approvedLicensingBadge?.status === VERIFICATION_STATUSES.VERIFIED);
  } catch (err) {
    record('Profile badge synchronization check executed', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 6: HTTP API Route Integration
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: HTTP Middleware Routes ---');
  try {
    const groqMw = createGroqMiddleware();
    const adminMw = createAdminMiddleware();

    // 6A: GET /api/trust/claims
    const reqClaims = {
      method: 'GET',
      url: '/api/trust/claims',
      headers: {}
    };
    const resClaims = mockResponse();
    await groqMw(reqClaims, resClaims, () => {});
    const claimsJson = resClaims.json();
    record('GET /api/trust/claims returns 200 JSON', resClaims.statusCode === 200 && claimsJson && claimsJson.ok === true);
    record('Claims list is an array', Array.isArray(claimsJson?.claims));

    // 6B: Admin Claims Route with Auth Check
    const reqAdminClaims = {
      method: 'GET',
      url: '/api/admin/verification-claims',
      headers: { 'x-reviewer-auth': 'alloy-admin-verified' }
    };
    const resAdminClaims = mockResponse();
    await adminMw(reqAdminClaims, resAdminClaims, () => {});
    const adminClaimsJson = resAdminClaims.json();
    record('GET /api/admin/verification-claims returns 200 for authenticated Super Admin', resAdminClaims.statusCode === 200 && adminClaimsJson?.ok === true);
  } catch (err) {
    record('HTTP routes executed without crash', false, err.message);
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
