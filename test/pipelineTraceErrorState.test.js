// test/pipelineTraceErrorState.test.js
// Verification suite for Alloy PipelineTrace error-state defect fix and empty-pool handling

import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

console.log('\n================================================================');
console.log(' ALLOY — PIPELINE TRACE ERROR STATE & EMPTY POOL TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
const totalExpected = 11;

function runTest(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

function buildSevenStages(inputCount = 0) {
  const stageDefs = [
    { id: 'stage_01_brief_normalization', name: 'Brief Normalization' },
    { id: 'stage_02_skills_filter', name: 'Mandatory Skills Filter' },
    { id: 'stage_03_specialization_filter', name: 'Specialization Fit Filter' },
    { id: 'stage_04_ai_tools_filter', name: 'AI Tools & Models Filter' },
    { id: 'stage_05_format_filter', name: 'Deliverable Format Filter' },
    { id: 'stage_06_commercial_licensing', name: 'Commercial Licensing Filter' },
    { id: 'stage_07_ranking_engine', name: 'CreaMatch Scoring & Ranking Engine' }
  ];

  return stageDefs.map((def, idx) => ({
    stageId: def.id,
    stageNumber: idx + 1,
    stageName: def.name,
    description: `Stage ${idx + 1} description`,
    inputCount,
    passedCount: inputCount,
    rejectedCount: 0,
    rejections: []
  }));
}

async function main() {
  const viteServer = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  const { default: PipelineTraceModal } = await viteServer.ssrLoadModule('./src/components/PipelineTraceModal.jsx');
  const { default: CampaignModal } = await viteServer.ssrLoadModule('./src/components/CampaignModal.jsx');

  // Test 1: Failed pipeline request shows explicit error UI, NOT a completed trace
  runTest('1. A failed pipeline request shows an error, not a completed trace', () => {
    const errorMsg = 'Creator data could not be loaded from Supabase. The pipeline was not run against fallback data.';
    let retried = false;

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        pipelineTrace: null,
        error: errorMsg,
        onRetry: () => { retried = true; }
      })
    );

    assert.ok(html.includes('Pipeline Execution Failed'), 'Must display Pipeline Execution Failed title');
    assert.ok(html.includes(errorMsg), 'Must display exact error message from failed pipeline request');
    assert.ok(html.includes('Authoritative Data Integrity Notice'), 'Must display Authoritative Data Integrity Notice');
    assert.ok(html.includes('Retry Pipeline Execution'), 'Must display Retry Pipeline Execution action');
    assert.ok(html.includes('Status: Failed'), 'Header must show Failed status badge');

    // Crucial: Must NOT fabricate completed indicators or false zero-result summaries
    assert.ok(!html.includes('7 Stages Computed'), 'Must NOT display 7 Stages Computed');
    assert.ok(!html.includes('Stages Computed'), 'Must NOT display any Stages Computed message');
    assert.ok(!html.includes('Presentation Complete'), 'Must NOT display Presentation Complete');
    assert.ok(!html.includes('pipeline-kpi-bar'), 'Must NOT render KPI bar with fabricated counts');
    assert.ok(!html.includes('horizontal-stages-track'), 'Must NOT render stages track when execution failed');
  });

  // Test 2: Unexecuted pipeline (null trace when idle) displays unexecuted error state
  runTest('2. An unexecuted pipeline (null trace, not loading) renders an explicit error state', () => {
    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        isLoading: false,
        pipelineTrace: null,
        error: null
      })
    );

    assert.ok(html.includes('Pipeline Execution Failed'), 'Must show Pipeline Execution Failed');
    assert.ok(!html.includes('7 Stages Computed'), 'Must NOT display 7 Stages Computed');
    assert.ok(!html.includes('Presentation Complete'), 'Must NOT display Presentation Complete');
    assert.ok(!html.includes('pipeline-kpi-bar'), 'Must NOT render fabricated KPI bar');
  });

  // Test 3: Failed pipeline response object (ok: false or trace.error) renders error state
  runTest('3. A trace object with ok: false or trace.error displays error UI', () => {
    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        pipelineTrace: {
          ok: false,
          error: 'SUPABASE_CREATOR_FETCH_FAILED'
        }
      })
    );

    assert.ok(html.includes('Pipeline Execution Failed'), 'Must show Pipeline Execution Failed');
    assert.ok(html.includes('SUPABASE_CREATOR_FETCH_FAILED'), 'Must show the failure code');
    assert.ok(!html.includes('7 Stages Computed'), 'Must NOT show 7 Stages Computed');
    assert.ok(!html.includes('Presentation Complete'), 'Must NOT show Presentation Complete');
  });

  // Test 4: Legitimate empty-pool state displays zero creators with clear empty-pool explanation
  runTest('4. A valid trace with zero candidates displays a legitimate empty-pool state', () => {
    const emptyPoolTrace = {
      ok: true,
      source: 'supabase',
      summary: {
        totalCandidates: 0,
        passedEligibilityCount: 0,
        excludedCount: 0,
        requiresReviewCount: 0
      },
      stages: buildSevenStages(0),
      rankedCreators: [],
      requiresReview: [],
      exclusions: []
    };

    // Render Execution Stages tab
    const pipelineHtml = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'pipeline',
        skipAnimation: true,
        pipelineTrace: emptyPoolTrace
      })
    );

    assert.ok(pipelineHtml.includes('Authoritative Pool'), 'Must render Authoritative Pool KPI');
    assert.ok(pipelineHtml.includes('0 Creators'), 'Must render 0 Creators');
    assert.ok(pipelineHtml.includes('7 Stages Computed'), 'Must render 7 Stages Computed when all 7 stages ran');
    assert.ok(pipelineHtml.includes('Pipeline Executed (Empty Creator Pool)'), 'Must indicate execution over empty pool');
    assert.ok(pipelineHtml.includes('Empty Authoritative Pool:'), 'Must show empty pool banner');
    assert.ok(!pipelineHtml.includes('Connection failed'), 'Must NOT describe as connection failure');

    // Render Eligible tab
    const eligibleHtml = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'eligible',
        skipAnimation: true,
        pipelineTrace: emptyPoolTrace
      })
    );

    assert.ok(eligibleHtml.includes('Authoritative Creator Pool is Empty'), 'Eligible tab must state Authoritative Creator Pool is Empty');
    assert.ok(eligibleHtml.includes('The authoritative creator pool currently contains 0 creators'), 'Must explain pool contains 0 creators');
    assert.ok(!eligibleHtml.includes('No Creators Met All Mandatory Requirements'), 'Must NOT blame creators for failing requirements when pool was empty');

    // Render Review tab
    const reviewHtml = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'review',
        skipAnimation: true,
        pipelineTrace: emptyPoolTrace
      })
    );
    assert.ok(reviewHtml.includes('No review candidates could be evaluated because the authoritative creator pool is empty.'), 'Review tab must explain empty pool');

    // Render Exclusions tab
    const exclusionsHtml = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'exclusions',
        skipAnimation: true,
        pipelineTrace: emptyPoolTrace
      })
    );
    assert.ok(exclusionsHtml.includes('No candidates were evaluated because the creator pool was empty.'), 'Exclusions tab must explain empty pool');
  });

  // Test 5: Valid nonempty trace still renders all seven stages and eligibility outcomes
  runTest('5. A valid nonempty trace still renders all seven stages and its eligibility outcomes', () => {
    const nonemptyTrace = {
      ok: true,
      source: 'supabase',
      summary: {
        totalCandidates: 3,
        passedEligibilityCount: 1,
        excludedCount: 1,
        requiresReviewCount: 1
      },
      stages: buildSevenStages(3),
      rankedCreators: [
        {
          creatorId: 'c-elena',
          score: 95,
          fitLabel: 'Exceptional Fit',
          creator: {
            id: 'c-elena',
            name: 'Elena Rostova',
            avatar: 'https://images.unsplash.com/elena',
            specialty: '3D CGI & Motion',
            styles: ['Hyperrealistic']
          },
          explanation: { summary: 'Matched 3D mandatory requirement' }
        }
      ],
      requiresReview: [
        {
          creatorId: 'c-rev',
          creatorName: 'Jordan Smith',
          unknownRequirements: [{ requirement: 'licensing', status: 'UNKNOWN', reason: 'Commercial license pending' }],
          reasons: ['Commercial license pending']
        }
      ],
      exclusions: [
        {
          creatorId: 'c-ex',
          creatorName: 'Excluded Artist',
          code: 'MISSING_MANDATORY_SKILLS',
          reason: 'Lacks required 3D skills',
          stage: 'stage_02_skills_filter'
        }
      ]
    };

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'pipeline',
        skipAnimation: true,
        pipelineTrace: nonemptyTrace
      })
    );

    assert.ok(html.includes('3 Creators'), 'Must display 3 Creators in pool');
    assert.ok(html.includes('1 Qualified'), 'Must display 1 Qualified');
    assert.ok(html.includes('1 Review'), 'Must display 1 Review');
    assert.ok(html.includes('1 Removed'), 'Must display 1 Removed');
    assert.ok(html.includes('Execution Stages (7)'), 'Must render all 7 execution stages');
    assert.ok(html.includes('Ranked Eligible Creators (1)'), 'Must show 1 ranked creator');
    assert.ok(html.includes('Needs Review (1)'), 'Must show 1 review candidate');
    assert.ok(html.includes('Exclusion Ledger (1)'), 'Must show 1 exclusion');
  });

  // Test 6: Existing review, exclusion, and ranking displays remain distinct and unchanged
  runTest('6. Existing review, exclusion, and ranking displays remain unchanged', () => {
    const trace = {
      ok: true,
      summary: { totalCandidates: 3, passedEligibilityCount: 1, excludedCount: 1, requiresReviewCount: 1 },
      stages: buildSevenStages(3),
      rankedCreators: [
        {
          creatorId: 'c-1',
          score: 91,
          fitLabel: 'Strong Fit',
          creator: { id: 'c-1', name: 'Ranked Star', avatar: 'https://example.com/star', specialty: 'AI Video', styles: ['Cinematic'] },
          explanation: { summary: 'Passed all criteria' }
        }
      ],
      requiresReview: [
        {
          creatorId: 'c-2',
          creatorName: 'Review Candidate',
          unknownRequirements: [{ requirement: 'formats', status: 'UNKNOWN', reason: '9:16 format unconfirmed' }],
          reasons: ['9:16 format unconfirmed']
        }
      ],
      exclusions: [
        {
          creatorId: 'c-3',
          creatorName: 'Excluded Creator',
          code: 'COMMERCIAL_LICENSING_UNVERIFIED',
          reason: 'Commercial licensing not verified',
          stage: 'stage_06_commercial_licensing'
        }
      ]
    };

    // 1. Eligible Tab
    const eligibleHtml = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'eligible',
        skipAnimation: true,
        pipelineTrace: trace
      })
    );
    assert.ok(eligibleHtml.includes('Ranked Star'), 'Eligible tab must render ranked creator');
    assert.ok(!eligibleHtml.includes('Review Candidate'), 'Eligible tab must NOT contain review candidate');
    assert.ok(!eligibleHtml.includes('Excluded Creator'), 'Eligible tab must NOT contain excluded candidate');

    // 2. Review Tab
    const reviewHtml = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'review',
        skipAnimation: true,
        pipelineTrace: trace
      })
    );
    assert.ok(reviewHtml.includes('Review Candidate'), 'Review tab must render review candidate');
    assert.ok(reviewHtml.includes('9:16 format unconfirmed'), 'Review tab must render reason');
    assert.ok(!reviewHtml.includes('Ranked Star'), 'Review tab must NOT contain eligible creator');
    assert.ok(!reviewHtml.includes('Excluded Creator'), 'Review tab must NOT contain excluded creator');

    // 3. Exclusions Tab
    const exclusionsHtml = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'exclusions',
        skipAnimation: true,
        pipelineTrace: trace
      })
    );
    assert.ok(exclusionsHtml.includes('Excluded Creator'), 'Exclusions tab must render excluded creator');
    assert.ok(exclusionsHtml.includes('Commercial licensing not verified'), 'Exclusions tab must render readable reason');
    assert.ok(!exclusionsHtml.includes('Ranked Star'), 'Exclusions tab must NOT contain eligible creator');
    assert.ok(!exclusionsHtml.includes('Review Candidate'), 'Exclusions tab must NOT contain review candidate');
  });

  // Test 7: Loading state renders the server execution spinner, not an error or completed state
  runTest('7. Loading state renders execution spinner, not an error or completed trace', () => {
    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        isLoading: true,
        pipelineTrace: null,
        error: null
      })
    );

    assert.ok(html.includes('Executing Server-Side Filtering Pipeline…'), 'Must display loading title');
    assert.ok(html.includes('Querying authoritative creator records'), 'Must display loading explanation');
    assert.ok(!html.includes('Pipeline Execution Failed'), 'Must NOT display error title');
    assert.ok(!html.includes('7 Stages Computed'), 'Must NOT display completed stages');
    assert.ok(!html.includes('Presentation Complete'), 'Must NOT display Presentation Complete');
  });

  // Test 8: CampaignModal review stage handles undefined traits and missing optional fields
  runTest('8. CampaignModal renders review stage without crashing when analysis.traits is undefined or absent', () => {
    const analysisWithoutTraits = {
      creativeDirection: 'Editorial Luxury',
      contentFormat: '4K Stills Suite',
      // traits is intentionally undefined
      audience: 'Global',
      platform: 'Instagram'
      // budget, timeline are null / undefined
    };

    const html = renderToStaticMarkup(
      React.createElement(CampaignModal, {
        isOpen: true,
        initialStage: 'review',
        initialAnalysis: analysisWithoutTraits
      })
    );

    assert.ok(html.includes('Alloy Understood Your Brief'), 'Must render brief review header');
    assert.ok(html.includes('Editorial Luxury'), 'Must render creative direction');
    assert.ok(html.includes('Campaign DNA:'), 'Must render Campaign DNA section');
    assert.ok(html.includes('Flexible / Not specified'), 'Must render fallback budget');
    assert.ok(html.includes('Flexible / Open'), 'Must render fallback timeline');
  });

  // Test 9: Zero eligible creators scenario (3 evaluated, 3 excluded) renders clear empty state and inspection routes
  runTest('9. Zero eligible creators scenario (3 evaluated, 3 excluded) renders empty state and navigation routes', () => {
    const zeroEligibleTrace = {
      ok: true,
      source: 'supabase',
      summary: {
        totalCandidates: 3,
        passedEligibilityCount: 0,
        excludedCount: 3,
        requiresReviewCount: 0
      },
      stages: buildSevenStages(3),
      rankedCreators: [],
      requiresReview: [],
      exclusions: [
        {
          creatorId: 'c-1',
          creatorName: 'Creator One',
          code: 'MISSING_MANDATORY_SKILLS',
          reason: 'Lacks required technical skills',
          stage: 'stage_02_skills_filter'
        },
        {
          creatorId: 'c-2',
          creatorName: 'Creator Two',
          code: 'SPECIALIZATION_MISMATCH',
          reason: 'Specialization mismatch with campaign category',
          stage: 'stage_03_specialization_filter'
        },
        {
          creatorId: 'c-3',
          creatorName: 'Creator Three',
          code: 'FORMAT_UNSUPPORTED',
          reason: 'Deliverable format unsupported in verified portfolio',
          stage: 'stage_05_format_filter'
        }
      ]
    };

    let editCampaignCalled = false;

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'eligible',
        skipAnimation: true,
        pipelineTrace: zeroEligibleTrace,
        onEditCampaign: () => { editCampaignCalled = true; }
      })
    );

    assert.ok(html.includes('No Creators Met All Mandatory Requirements'), 'Must display clear empty state heading');
    assert.ok(html.includes('View Pipeline Execution'), 'Must provide route to inspect pipeline execution');
    assert.ok(html.includes('View Exclusion Ledger'), 'Must provide route to inspect exclusion ledger');
    assert.ok(html.includes('Adjust Campaign Brief'), 'Must provide route to adjust campaign brief');
    assert.ok(!html.includes('eligible-creator-card'), 'Must not render creator cards when 0 eligible');

    // Also verify exclusion ledger preserves the 3 exclusions with reasons
    const exclusionsHtml = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'exclusions',
        skipAnimation: true,
        pipelineTrace: zeroEligibleTrace
      })
    );
    assert.ok(exclusionsHtml.includes('Creator One'), 'Exclusions must preserve Creator One');
    assert.ok(exclusionsHtml.includes('Creator Two'), 'Exclusions must preserve Creator Two');
    assert.ok(exclusionsHtml.includes('Creator Three'), 'Exclusions must preserve Creator Three');
    assert.ok(exclusionsHtml.includes('Exclusion Ledger (3)'), 'Tab badge must reflect 3 exclusions');
  });

  // Test 10: Ranked eligible creators list handles missing optional creator and explanation fields without throwing
  runTest('10. Ranked eligible creators list handles missing optional fields without throwing', () => {
    const traceWithIncompleteCreators = {
      ok: true,
      source: 'supabase',
      summary: { totalCandidates: 1, passedEligibilityCount: 1, excludedCount: 0, requiresReviewCount: 0 },
      stages: buildSevenStages(1),
      rankedCreators: [
        {
          creatorId: 'c-minimal',
          score: 88,
          // creator object missing optional avatar, specialty, styles
          creator: { id: 'c-minimal', name: 'Minimal Creator' },
          // explanation missing highlights
          explanation: { summary: 'Met core requirements' }
        }
      ],
      requiresReview: [],
      exclusions: []
    };

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'eligible',
        skipAnimation: true,
        pipelineTrace: traceWithIncompleteCreators
      })
    );

    assert.ok(html.includes('Minimal Creator'), 'Must render creator name');
    assert.ok(html.includes('Met core requirements'), 'Must render explanation summary');
    assert.ok(html.includes('88%'), 'Must render score');
  });

  // Test 11: CampaignModal clarification stage handles missing or empty options array without throwing
  runTest('11. CampaignModal clarification stage handles undefined options array without throwing', () => {
    const html = renderToStaticMarkup(
      React.createElement(CampaignModal, {
        isOpen: true,
        initialStage: 'clarify',
        initialClarification: {
          question: 'Which visual style do you prefer?'
          // options is intentionally undefined
        }
      })
    );

    assert.ok(html.includes('Which visual style do you prefer?'), 'Must render clarification question');
    assert.ok(html.includes('Skip clarification and proceed'), 'Must render skip button');
  });

  await viteServer.close();

  console.log(`\n================================================================`);
  console.log(` RESULTS: ${passedTests} / ${totalExpected} tests passed successfully.`);
  console.log(`================================================================\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
