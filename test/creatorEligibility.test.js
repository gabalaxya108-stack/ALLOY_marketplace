// test/creatorEligibility.test.js
// Deterministic Creator Eligibility Engine Test Suite
// Verifies 3-outcome requirement evaluations (PASS, FAIL, UNKNOWN)
// and decision policy (ELIGIBLE, INELIGIBLE, REQUIRES_REVIEW) across all mandatory criteria.

import assert from 'node:assert/strict';
import {
  evaluateCreatorEligibility,
  evaluateCreatorsEligibility,
  ELIGIBILITY_OUTCOMES,
  ELIGIBILITY_STATUS,
  parseMonetaryValue,
  formatCurrency,
  isSkillCompatible,
  evaluateFormatsRequirement,
  evaluateBudgetRequirement
} from '../src/intelligence/eligibilityEngine.js';
import { CREATORS } from '../src/data/creatorsData.js';

console.log('\n================================================================');
console.log(' ALLOY — CREATOR ELIGIBILITY ENGINE TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

// Baseline creator from existing data
const maya = CREATORS.find(c => c.id === 'maya-chen');
assert(maya, 'Maya Chen must exist in creator database');

// ============================================================================
// TEST 1: All mandatory requirements pass
// ============================================================================
runTest('1. All mandatory requirements pass produces ELIGIBLE', () => {
  const campaign = {
    id: 'camp-all-pass',
    title: 'Cinematic Fashion Brand Film',
    requirements: {
      mandatory: {
        skills: ['AI Video', 'Visual Storytelling'],
        tools: ['Runway Gen-3'],
        styles: ['Cinematic'],
        budget: { amount: 10000, isNegotiable: false }
      }
    }
  };

  const creator = {
    ...maya,
    rate: 8000
  };

  const result = evaluateCreatorEligibility(campaign, creator);

  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.ELIGIBLE, 'Overall eligibility must be ELIGIBLE');
  assert.strictEqual(result.summary.failed, 0, 'Must have 0 failures');
  assert.strictEqual(result.summary.unknown, 0, 'Must have 0 unknowns');
  assert.strictEqual(result.summary.passed, 4, 'All 4 requirements must pass');
  result.requirements.forEach(req => {
    assert.strictEqual(req.status, ELIGIBILITY_OUTCOMES.PASS, `${req.requirement} must have PASS status`);
    assert(req.reason && req.reason.length > 5, 'Every requirement must include concise reason');
  });
});

// ============================================================================
// TEST 2: One mandatory requirement fails
// ============================================================================
runTest('2. One mandatory requirement fails produces INELIGIBLE', () => {
  const campaign = {
    id: 'camp-one-fail',
    requirements: {
      mandatory: {
        skills: ['AI Video'], // Maya has this => PASS
        tools: ['Houdini FX']  // Maya lacks this => FAIL
      }
    }
  };

  const result = evaluateCreatorEligibility(campaign, maya);

  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.INELIGIBLE, 'Overall eligibility must be INELIGIBLE');
  assert.strictEqual(result.summary.failed, 1, 'Exactly one failure');

  const toolsReq = result.requirements.find(r => r.requirement === 'tools');
  assert(toolsReq, 'Tools requirement must be in results');
  assert.strictEqual(toolsReq.status, ELIGIBILITY_OUTCOMES.FAIL);
  assert(toolsReq.reason.includes('Houdini FX'), 'Reason must identify missing tool');
  assert(toolsReq.evidence.missing.some(m => m.toLowerCase().includes('houdini fx')), 'Evidence must identify missing tool');
});

// ============================================================================
// TEST 3: Missing creator information produces UNKNOWN
// ============================================================================
runTest('3. Missing creator information produces UNKNOWN', () => {
  // Creator with omitted/undefined tools and availability
  const sparseCreator = {
    id: 'sparse-creator',
    name: 'Anonymous Candidate',
    capabilities: ['AI Video']
    // tools is undefined
    // availability is undefined
  };

  const campaign = {
    requirements: {
      mandatory: {
        tools: ['ComfyUI']
      }
    }
  };

  const result = evaluateCreatorEligibility(campaign, sparseCreator);

  assert.strictEqual(result.requirements.length, 1);
  const toolsReq = result.requirements[0];
  assert.strictEqual(toolsReq.status, ELIGIBILITY_OUTCOMES.UNKNOWN, 'Missing tools data must produce UNKNOWN');
  assert(toolsReq.reason.includes('missing'), 'Reason must explicitly explain data is missing');
  assert.strictEqual(toolsReq.evidence.actual, null, 'Actual evidence should reflect null/missing data');
});

// ============================================================================
// TEST 4: Confirmed failure takes precedence over unknown requirements
// ============================================================================
runTest('4. Confirmed failure takes precedence over unknown requirements', () => {
  const sparseCreator = {
    id: 'creator-partial',
    name: 'Partial Creator',
    capabilities: ['AI Photography'], // Lacks AI Video => confirmed FAIL
    tools: undefined,                 // Missing tools => UNKNOWN
    rate: undefined                   // Missing rate => UNKNOWN
  };

  const campaign = {
    requirements: {
      mandatory: {
        skills: ['AI Video'],                               // FAIL
        tools: ['Runway Gen-3'],                            // UNKNOWN
        budget: { amount: 10000, isNegotiable: false }       // UNKNOWN
      }
    }
  };

  const result = evaluateCreatorEligibility(campaign, sparseCreator);

  assert.strictEqual(result.summary.failed, 1, 'Must have 1 confirmed failure');
  assert.strictEqual(result.summary.unknown, 2, 'Must have 2 unknown requirements');
  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.INELIGIBLE, 'Confirmed failure takes precedence over unknowns');
});

// ============================================================================
// TEST 5: Unknown requirements with no failures produce REQUIRES_REVIEW
// ============================================================================
runTest('5. Unknown requirements with no failures produce REQUIRES_REVIEW', () => {
  const creatorWithoutRate = {
    ...maya,
    rate: undefined // Maya has all skills and tools, but rate is missing
  };

  const campaign = {
    requirements: {
      mandatory: {
        skills: ['AI Video'],
        tools: ['Runway Gen-3'],
        budget: { amount: 10000, isNegotiable: false }
      }
    }
  };

  const result = evaluateCreatorEligibility(campaign, creatorWithoutRate);

  assert.strictEqual(result.summary.failed, 0, 'No requirements failed');
  assert.strictEqual(result.summary.unknown, 1, 'Budget requirement is unknown');
  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.REQUIRES_REVIEW, 'No failures + unknowns must produce REQUIRES_REVIEW');
});

// ============================================================================
// TEST 6: Non-negotiable budget exceeded
// ============================================================================
runTest('6. Non-negotiable budget exceeded produces FAIL and INELIGIBLE', () => {
  const creator = {
    ...maya,
    rate: 15000 // Exceeds budget by $5,000
  };

  const campaign = {
    budget: '$10,000',
    isNegotiable: false, // Explicitly non-negotiable
    requirements: {
      mandatory: {
        budget: { amount: 10000, isNegotiable: false }
      }
    }
  };

  const result = evaluateCreatorEligibility(campaign, creator);

  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.INELIGIBLE);
  const budgetReq = result.requirements.find(r => r.requirement === 'budget');
  assert(budgetReq, 'Budget requirement evaluated');
  assert.strictEqual(budgetReq.status, ELIGIBILITY_OUTCOMES.FAIL, 'Exceeded non-negotiable budget must FAIL');
  assert.strictEqual(budgetReq.difference, 5000, 'Difference must equal $5,000');
  assert(budgetReq.reason.includes('exceeds non-negotiable campaign budget'), 'Reason must state non-negotiable budget exceeded');
  assert(budgetReq.reason.includes('$5,000'), 'Reason must state exact delta');
});

// ============================================================================
// TEST 7: Negotiable budget exceeded, with negotiation explicitly indicated
// ============================================================================
runTest('7. Negotiable budget exceeded indicates negotiation needed with difference disclosed', () => {
  const creator = {
    ...maya,
    rate: 12500 // Exceeds target by $2,500
  };

  const campaign = {
    budget: '$10,000',
    isNegotiable: true,
    requirements: {
      mandatory: {
        skills: ['AI Video'],
        budget: { amount: 10000, isNegotiable: true }
      }
    }
  };

  const result = evaluateCreatorEligibility(campaign, creator);

  // Negotiable budget above target must not fail eligibility
  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.ELIGIBLE, 'Negotiable budget must not fail overall eligibility');
  assert.strictEqual(result.requiresNegotiation, true, 'Result must explicitly flag requiresNegotiation');

  const budgetReq = result.requirements.find(r => r.requirement === 'budget');
  assert(budgetReq, 'Budget requirement evaluated');
  assert.strictEqual(budgetReq.status, ELIGIBILITY_OUTCOMES.PASS, 'Status must not be FAIL');
  assert.strictEqual(budgetReq.negotiationNeeded, true, 'negotiationNeeded flag must be true');
  assert.strictEqual(budgetReq.difference, 2500, 'Difference must equal $2,500');
  assert.strictEqual(budgetReq.formattedDifference, '+$2,500', 'Formatted difference must be disclosed');
  assert(budgetReq.reason.includes('negotiation is needed'), 'Reason must explicitly disclose negotiation is needed');
});

// ============================================================================
// TEST 8: Missing rate or budget
// ============================================================================
runTest('8. Missing rate or budget returns UNKNOWN without inferring affordability', () => {
  // Case A: Missing creator rate
  const creatorNoRate = { ...maya, rate: undefined };
  const campaignWithBudget = {
    requirements: {
      mandatory: { budget: '$8,000' }
    }
  };

  const resultA = evaluateCreatorEligibility(campaignWithBudget, creatorNoRate);
  const budgetReqA = resultA.requirements.find(r => r.requirement === 'budget');
  assert.strictEqual(budgetReqA.status, ELIGIBILITY_OUTCOMES.UNKNOWN);
  assert(budgetReqA.reason.includes('Creator rate is not specified'), 'Must not infer affordability');

  // Case B: Missing campaign budget
  const creatorWithRate = { ...maya, rate: 8000 };
  const campaignNoBudget = {
    budget: null,
    requirements: {
      mandatory: { budget: null }
    }
  };

  const resultB = evaluateCreatorEligibility(campaignNoBudget, creatorWithRate);
  const budgetReqB = resultB.requirements.find(r => r.requirement === 'budget');
  assert.strictEqual(budgetReqB.status, ELIGIBILITY_OUTCOMES.UNKNOWN);
  assert(budgetReqB.reason.includes('Campaign budget is not specified'), 'Must report missing campaign budget');
});

// ============================================================================
// TEST 9: Exact budget boundary
// ============================================================================
runTest('9. Exact budget boundary produces PASS without negotiation', () => {
  const creator = {
    ...maya,
    rate: 10000 // Exactly matches $10,000 ceiling
  };

  const campaign = {
    requirements: {
      mandatory: {
        budget: { amount: 10000, isNegotiable: false }
      }
    }
  };

  const result = evaluateCreatorEligibility(campaign, creator);
  const budgetReq = result.requirements.find(r => r.requirement === 'budget');

  assert.strictEqual(budgetReq.status, ELIGIBILITY_OUTCOMES.PASS, 'Exact boundary must PASS');
  assert.strictEqual(budgetReq.negotiationNeeded, false, 'No negotiation needed at exact boundary');
  assert.strictEqual(budgetReq.difference, 0, 'Difference must be 0');
  assert(budgetReq.reason.includes('exact campaign budget boundary'), 'Reason notes exact boundary');
});

// ============================================================================
// TEST 10: Multiple simultaneous requirements with independently explained results
// ============================================================================
runTest('10. Multiple simultaneous requirements with independently explained results', () => {
  const candidate = {
    id: 'complex-candidate',
    name: 'Elena Rostova',
    specialty: 'AI Fashion',
    capabilities: ['AI Video', 'Haute Couture'],
    tools: ['Midjourney v6.1'], // Missing Runway Gen-3
    styles: ['Cinematic', 'Luxury'],
    industries: ['Beauty & Skincare'],
    availability: 'Available for projects',
    rate: 7500, // Within budget ($10,000)
    projects: [{ id: 'p1', title: 'Work 1' }]
  };

  const campaign = {
    requirements: {
      mandatory: {
        skills: ['AI Video'],                          // PASS
        tools: ['Runway Gen-3'],                       // FAIL (only has Midjourney)
        styles: ['Cinematic'],                         // PASS
        industries: ['Beauty & Skincare'],             // PASS
        availability: 'Available for projects',        // PASS
        budget: { amount: 10000, isNegotiable: false } // PASS
      }
    }
  };

  const result = evaluateCreatorEligibility(campaign, candidate);

  assert.strictEqual(result.summary.totalEvaluated, 6, 'Must evaluate 6 distinct requirements');
  assert.strictEqual(result.summary.passed, 5, '5 requirements passed');
  assert.strictEqual(result.summary.failed, 1, '1 requirement failed');
  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.INELIGIBLE, 'Overall must be INELIGIBLE due to single failure');

  // Verify each requirement has distinct, non-empty reason and structured evidence
  result.requirements.forEach(req => {
    assert(req.requirement, 'Requirement name must be present');
    assert(['PASS', 'FAIL', 'UNKNOWN'].includes(req.status), 'Valid status');
    assert(req.reason && typeof req.reason === 'string', 'Reason must be string');
    assert(req.evidence && typeof req.evidence === 'object', 'Evidence must be structured object');
    assert(req.evidence.expected !== undefined, 'Evidence must record expected requirement');
  });

  const toolReq = result.requirements.find(r => r.requirement === 'tools');
  assert.strictEqual(toolReq.status, ELIGIBILITY_OUTCOMES.FAIL);
  assert(toolReq.reason.includes('Runway Gen-3') || toolReq.reason.includes('runway gen 3'));
});

// ============================================================================
// TEST 11: Schema Limitation - Unspecified budget negotiability
// ============================================================================
runTest('11. When campaign model cannot distinguish negotiability and rate exceeds budget, return UNKNOWN without guessing defaults', () => {
  const creator = {
    ...maya,
    rate: 15000
  };

  // Plain budget string without any negotiability indicator or flag
  const campaign = {
    budget: '$10,000'
    // isNegotiable is undefined
  };

  const result = evaluateCreatorEligibility(campaign, creator);
  const budgetReq = result.requirements.find(r => r.requirement === 'budget');

  assert.strictEqual(budgetReq.status, ELIGIBILITY_OUTCOMES.UNKNOWN);
  assert(budgetReq.reason.includes('does not specify whether budget is negotiable or firm'));
  assert.strictEqual(budgetReq.evidence.schemaLimitation, 'Budget negotiability is unspecified in campaign data model.');
  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.REQUIRES_REVIEW);
});

// ============================================================================
// TEST 12: Range budget parsing ("$5,000 – $10,000")
// ============================================================================
runTest('12. Range budgets correctly extract ceiling for upper boundary check', () => {
  const parsed = parseMonetaryValue('$5,000 – $10,000');
  assert.strictEqual(parsed.min, 5000);
  assert.strictEqual(parsed.max, 10000);

  const creatorWithin = { ...maya, rate: 9500 };
  const campaign = {
    budget: '$5,000 – $10,000',
    isNegotiable: false
  };

  const resWithin = evaluateCreatorEligibility(campaign, creatorWithin);
  const budgetReqWithin = resWithin.requirements.find(r => r.requirement === 'budget');
  assert.strictEqual(budgetReqWithin.status, ELIGIBILITY_OUTCOMES.PASS);

  const creatorExceeding = { ...maya, rate: 11000 };
  const resExceeding = evaluateCreatorEligibility(campaign, creatorExceeding);
  const budgetReqExceeding = resExceeding.requirements.find(r => r.requirement === 'budget');
  assert.strictEqual(budgetReqExceeding.status, ELIGIBILITY_OUTCOMES.FAIL);
  assert.strictEqual(budgetReqExceeding.difference, 1000);
});

// ============================================================================
// TEST 13: International currency handling (e.g. INR ₹85,000)
// ============================================================================
runTest('13. International currencies are parsed and formatted without corruption', () => {
  const parsed = parseMonetaryValue('₹85,000');
  assert.strictEqual(parsed.max, 85000);
  assert.strictEqual(parsed.currency, 'INR');

  const creator = { ...maya, rate: 90000 };
  const campaign = {
    budget: '₹85,000',
    isNegotiable: false
  };

  const res = evaluateCreatorEligibility(campaign, creator);
  const budgetReq = res.requirements.find(r => r.requirement === 'budget');
  assert.strictEqual(budgetReq.status, ELIGIBILITY_OUTCOMES.FAIL);
  assert(budgetReq.reason.includes('₹85,000'), 'Formatted with INR symbol');
  assert(budgetReq.reason.includes('₹5,000'), 'Delta formatted with INR symbol');
});

// ============================================================================
// TEST 14: Batch creator evaluation helper
// ============================================================================
runTest('14. Batch evaluation helper returns mapped results for all candidates', () => {
  const campaign = {
    requirements: {
      mandatory: {
        skills: ['AI Video']
      }
    }
  };

  const batchResults = evaluateCreatorsEligibility(campaign, CREATORS.slice(0, 3));
  assert.strictEqual(batchResults.length, 3);
  batchResults.forEach(res => {
    assert(res.creatorId, 'Each result must specify creatorId');
    assert([ELIGIBILITY_STATUS.ELIGIBLE, ELIGIBILITY_STATUS.INELIGIBLE, ELIGIBILITY_STATUS.REQUIRES_REVIEW].includes(res.eligibility));
  });
});

// ============================================================================
// TEST 15: Suitability score / high ranking CANNOT override mandatory failure
// ============================================================================
runTest('15. High suitability score or ranking CANNOT override mandatory failure', () => {
  // Candidate has high creative alignment / suitability, but fails a mandatory tool
  const creator = {
    ...maya,
    rate: 20000, // Exceeds budget
    suitabilityScore: 99,
    creativeFitLabel: '99% Perfect Creative Fit'
  };

  const campaign = {
    budget: '$10,000',
    isNegotiable: false,
    requirements: {
      mandatory: {
        budget: { amount: 10000, isNegotiable: false }
      }
    }
  };

  const result = evaluateCreatorEligibility(campaign, creator);
  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.INELIGIBLE, 'Mandatory failure must NEVER be overridden');
});

// ============================================================================
// TEST 16: Skill false positive prevention (generic vs specialized skills)
// ============================================================================
runTest('16. Generic skills cannot satisfy specialized requirements without evidence', () => {
  // Direct isSkillCompatible unit assertions:
  // 1. Generic skill cannot satisfy specialized requirement
  assert.strictEqual(
    isSkillCompatible('3D CGI product video', 'video'),
    false,
    'Generic "video" must not satisfy specialized "3D CGI product video"'
  );
  assert.strictEqual(
    isSkillCompatible('3D CGI product video', 'product video'),
    false,
    'Partial "product video" must not satisfy specialized "3D CGI product video" without 3D CGI evidence'
  );

  // 2. Exact match is preserved
  assert.strictEqual(
    isSkillCompatible('3D CGI product video', '3D CGI product video'),
    true,
    'Exact match must satisfy requirement'
  );

  // 3. Explicit synonym mapping is preserved
  assert.strictEqual(
    isSkillCompatible('AI Video', 'Generative Video'),
    true,
    'Explicit synonym cluster must satisfy requirement'
  );
  assert.strictEqual(
    isSkillCompatible('3D Modeling', '3D CGI'),
    true,
    '3D synonym cluster must satisfy requirement'
  );

  // 4. Directional containment: qualified creator skill satisfies base requirement
  assert.strictEqual(
    isSkillCompatible('Visual Storytelling', 'Cinematic Visual Storytelling'),
    true,
    'Qualified creator skill containing requirement must satisfy requirement'
  );

  // Campaign-level evaluation:
  const specializedCampaign = {
    requirements: {
      mandatory: {
        skills: ['3D CGI product video']
      }
    }
  };

  const genericCreator = {
    ...maya,
    capabilities: ['Video', 'Editing'],
    skills: ['Video', 'Editing']
  };
  const specializedCreator = {
    ...maya,
    capabilities: ['3D CGI product video', 'Motion Graphics'],
    skills: ['3D CGI product video', 'Motion Graphics']
  };

  const genericResult = evaluateCreatorEligibility(specializedCampaign, genericCreator);
  assert.strictEqual(genericResult.eligibility, ELIGIBILITY_STATUS.INELIGIBLE, 'Generic skill candidate must be INELIGIBLE');
  const genericSkillReq = genericResult.requirements.find(r => r.requirement === 'capabilities' || r.requirement === 'skills');
  assert(genericSkillReq, 'Capabilities requirement result must exist');
  assert.strictEqual(genericSkillReq.status, ELIGIBILITY_OUTCOMES.FAIL);
  assert(genericSkillReq.evidence.missing.includes('3D CGI product video'));

  const specializedResult = evaluateCreatorEligibility(specializedCampaign, specializedCreator);
  assert.strictEqual(specializedResult.eligibility, ELIGIBILITY_STATUS.ELIGIBLE, 'Specialized candidate must be ELIGIBLE');
  const specializedSkillReq = specializedResult.requirements.find(r => r.requirement === 'capabilities' || r.requirement === 'skills');
  assert(specializedSkillReq, 'Capabilities requirement result must exist');
  assert.strictEqual(specializedSkillReq.status, ELIGIBILITY_OUTCOMES.PASS);
});

// ============================================================================
// TEST 17: Format false positive prevention (generic video vs 9:16 vertical)
// ============================================================================
runTest('17. Generic video tag must not satisfy mandatory 9:16 vertical deliverable without explicit aspect evidence', () => {
  const verticalCampaign = {
    requirements: {
      mandatory: {
        formats: ['9:16 Vertical Video Loop']
      }
    }
  };

  // Creator has generic video tags and 16:9 landscape projects, but no vertical/portrait evidence
  const landscapeCreator = {
    ...maya,
    categoryTags: ['video', 'social', 'commercial'],
    specialty: 'Video Production',
    projects: [
      { id: 'p1', title: 'Landscape Brand Film', format: '16:9 Video', aspect: '16:9' },
      { id: 'p2', title: 'YouTube Feature', format: 'Landscape 4K', aspect: '16:9' }
    ]
  };

  // Direct format requirement check
  const formatCheck = evaluateFormatsRequirement(['9:16 Vertical Video Loop'], landscapeCreator);
  assert.strictEqual(
    formatCheck.status,
    ELIGIBILITY_OUTCOMES.UNKNOWN,
    'Must return UNKNOWN when vertical evidence is missing rather than falsely passing'
  );
  assert(
    formatCheck.reason.includes('no explicit portrait or vertical aspect records'),
    'Reason must explain insufficient vertical evidence'
  );
  assert.deepStrictEqual(formatCheck.evidence.insufficient, ['9:16 Vertical Video Loop']);

  // Full campaign evaluation must be REQUIRES_REVIEW (never PASS or ELIGIBLE)
  const result = evaluateCreatorEligibility(verticalCampaign, landscapeCreator);
  assert.strictEqual(
    result.eligibility,
    ELIGIBILITY_STATUS.REQUIRES_REVIEW,
    'Missing vertical evidence must produce REQUIRES_REVIEW'
  );
});

// ============================================================================
// TEST 18: Format evaluation passes when explicit vertical evidence exists
// ============================================================================
runTest('18. Explicit portrait/vertical deliverable evidence passes 9:16 requirement', () => {
  const verticalCampaign = {
    requirements: {
      mandatory: {
        formats: ['9:16 Vertical Video Loop']
      }
    }
  };

  // Creator with explicit 9:16 aspect portfolio project
  const verticalCreator = {
    ...maya,
    categoryTags: ['video', 'social'],
    specialty: 'Short-Form Video',
    projects: [
      { id: 'p1', title: 'TikTok Campaign', format: '9:16 Vertical Video Loop', aspect: '9:16' }
    ]
  };

  const formatCheck = evaluateFormatsRequirement(['9:16 Vertical Video Loop'], verticalCreator);
  assert.strictEqual(formatCheck.status, ELIGIBILITY_OUTCOMES.PASS, 'Explicit 9:16 project must PASS');

  const result = evaluateCreatorEligibility(verticalCampaign, verticalCreator);
  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.ELIGIBLE, 'Valid vertical evidence produces ELIGIBLE');
});

// ============================================================================
// TEST 19: Cross-currency budget comparison prevention
// ============================================================================
runTest('19. Cross-currency comparisons return UNKNOWN and do not compare raw amounts', () => {
  // Campaign in USD ($10,000 firm) vs Creator in INR (₹85,000)
  const usdCampaign = {
    budget: '$10,000',
    currency: 'USD',
    isNegotiable: false,
    requirements: {
      mandatory: {
        budget: { amount: 10000, currency: 'USD', isNegotiable: false }
      }
    }
  };

  const inrCreator = {
    ...maya,
    rate: '₹85,000',
    currency: 'INR'
  };

  // Direct budget requirement check
  const budgetCheck = evaluateBudgetRequirement(usdCampaign.requirements.mandatory.budget, inrCreator, usdCampaign);
  assert.strictEqual(
    budgetCheck.status,
    ELIGIBILITY_OUTCOMES.UNKNOWN,
    'Mismatched currencies must return UNKNOWN'
  );
  assert.strictEqual(
    budgetCheck.difference,
    null,
    'Must not calculate raw numeric difference across currencies'
  );
  assert.strictEqual(
    budgetCheck.evidence.currencyMismatch,
    true,
    'Evidence must flag currencyMismatch'
  );
  assert.strictEqual(budgetCheck.evidence.budgetCurrency, 'USD');
  assert.strictEqual(budgetCheck.evidence.rateCurrency, 'INR');
  assert(
    budgetCheck.reason.includes('explicit currency conversion'),
    'Reason must explain that explicit currency conversion is required'
  );
  assert(
    !budgetCheck.reason.includes('75,000'),
    'Must NEVER report a misleading raw difference like 75,000'
  );

  // Overall campaign eligibility check: must be REQUIRES_REVIEW (not INELIGIBLE)
  const result = evaluateCreatorEligibility(usdCampaign, inrCreator);
  assert.strictEqual(
    result.eligibility,
    ELIGIBILITY_STATUS.REQUIRES_REVIEW,
    'Cross-currency budget must produce REQUIRES_REVIEW, never false INELIGIBLE'
  );
});

// ============================================================================
// TEST 20: Compatible and unspecified currency preservation
// ============================================================================
runTest('20. Compatible currencies and genuinely unspecified currencies behave correctly', () => {
  // Case A: Genuinely unspecified creator currency adopts campaign context without guessing
  const usdCampaign = {
    budget: '$10,000',
    isNegotiable: false
  };
  const numericCreator = {
    ...maya,
    rate: 8000 // raw number, no currency
  };
  const resUnspecified = evaluateCreatorEligibility(usdCampaign, numericCreator);
  const budgetReqUnspecified = resUnspecified.requirements.find(r => r.requirement === 'budget');
  assert.strictEqual(budgetReqUnspecified.status, ELIGIBILITY_OUTCOMES.PASS);
  assert.strictEqual(budgetReqUnspecified.difference, 0);

  // Case B: Compatible currencies (both EUR) within budget => PASS
  const eurCampaign = {
    budget: '€5,000',
    currency: 'EUR',
    isNegotiable: false
  };
  const eurCreatorWithin = {
    ...maya,
    rate: '€4,500',
    currency: 'EUR'
  };
  const resEurWithin = evaluateCreatorEligibility(eurCampaign, eurCreatorWithin);
  const budgetReqEurWithin = resEurWithin.requirements.find(r => r.requirement === 'budget');
  assert.strictEqual(budgetReqEurWithin.status, ELIGIBILITY_OUTCOMES.PASS);

  // Case C: Compatible currencies (both EUR) exceeding non-negotiable budget => FAIL with delta
  const eurCreatorExceeding = {
    ...maya,
    rate: '€6,000',
    currency: 'EUR'
  };
  const resEurExceeding = evaluateCreatorEligibility(eurCampaign, eurCreatorExceeding);
  const budgetReqEurExceeding = resEurExceeding.requirements.find(r => r.requirement === 'budget');
  assert.strictEqual(budgetReqEurExceeding.status, ELIGIBILITY_OUTCOMES.FAIL);
  assert.strictEqual(budgetReqEurExceeding.difference, 1000);
  assert(budgetReqEurExceeding.reason.includes('€1,000'), 'Formatted in EUR');
});

// ============================================================================
// TEST 21: Maya Chen specialization mismatch vs ai photography
// ============================================================================
runTest('21. Maya Chen specialization mismatch against AI Photography is confirmed FAIL with verified secondary capabilities checked', () => {
  const photoCampaign = {
    id: 'camp-photo-spec',
    title: 'High Fashion Still Photography',
    requirements: {
      mandatory: {
        specialization: ['ai photography']
      }
    }
  };

  const result = evaluateCreatorEligibility(photoCampaign, maya);
  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.INELIGIBLE, 'Maya Chen must be INELIGIBLE for ai photography');
  assert.strictEqual(result.summary.failed, 1, 'Exactly one failure');

  const specReq = result.requirements.find(r => r.requirement === 'specialization');
  assert(specReq, 'Specialization requirement must be evaluated');
  assert.strictEqual(specReq.status, ELIGIBILITY_OUTCOMES.FAIL, 'Status must be FAIL');
  assert(specReq.reason.includes('AI Video'), 'Reason must mention creator specialty');
});

// ============================================================================
// TEST 22: Verified secondary capabilities satisfy specialization
// ============================================================================
runTest('22. Verified secondary capabilities satisfy specialization requirement', () => {
  const photoCampaign = {
    id: 'camp-photo-spec',
    requirements: {
      mandatory: {
        specialization: ['ai photography']
      }
    }
  };

  const creatorWithPhotoCapability = {
    id: 'creator-secondary-photo',
    name: 'Jordan Reed',
    specialty: 'Creative Direction',
    capabilities: ['AI Photography', 'Editorial Retouching', 'Prompt Engineering'],
    categoryTags: ['creative-direction', 'branding']
  };

  const result = evaluateCreatorEligibility(photoCampaign, creatorWithPhotoCapability);
  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.ELIGIBLE, 'Creator with verified secondary capability must be ELIGIBLE');
  const specReq = result.requirements.find(r => r.requirement === 'specialization');
  assert.strictEqual(specReq.status, ELIGIBILITY_OUTCOMES.PASS, 'Specialization requirement must PASS');
});

// ============================================================================
// TEST 23: Elena Rostova / Google Creator Studio unrecorded formats produce UNKNOWN
// ============================================================================
runTest('23. Creators with unspecified specialty and unrecorded format history produce UNKNOWN and REQUIRES_REVIEW for cinematic hero film', () => {
  const filmCampaign = {
    id: 'camp-hero-film',
    title: 'Cinematic Hero Campaign',
    requirements: {
      mandatory: {
        formats: ['cinematic hero film']
      }
    }
  };

  // Profile resembling database creator with unspecified specialty and unrecorded format evidence
  const unrecordedCreator = {
    id: 'elena-rostova-db',
    name: 'Elena Rostova',
    specialty: 'Unspecified',
    categoryTags: [],
    capabilities: [],
    projects: []
  };

  const result = evaluateCreatorEligibility(filmCampaign, unrecordedCreator);
  assert.strictEqual(result.eligibility, ELIGIBILITY_STATUS.REQUIRES_REVIEW, 'Must produce REQUIRES_REVIEW when format evidence is unrecorded');
  assert.strictEqual(result.summary.failed, 0, 'Must have 0 confirmed failures');
  assert.strictEqual(result.summary.unknown, 1, 'Must have 1 unknown requirement');

  const formatReq = result.requirements.find(r => r.requirement === 'formats');
  assert(formatReq, 'Formats requirement must be evaluated');
  assert.strictEqual(formatReq.status, ELIGIBILITY_OUTCOMES.UNKNOWN, 'Status must be UNKNOWN');
  assert(formatReq.reason.includes('not available'), 'Reason must indicate format history is not available');
});

console.log('\n----------------------------------------------------------------');
console.log(` SUMMARY: ${passedTests}/${totalTests} eligibility tests passed successfully.`);
console.log('----------------------------------------------------------------\n');
