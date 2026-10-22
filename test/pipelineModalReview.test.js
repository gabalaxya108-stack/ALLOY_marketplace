// test/pipelineModalReview.test.js
// Verification suite for Alloy PipelineTraceModal REQUIRES_REVIEW handling and UI presentation

import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

console.log('\n================================================================');
console.log(' ALLOY — PIPELINE TRACE MODAL REVIEW CANDIDATE TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
const totalExpected = 8;

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

async function main() {
  const viteServer = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  const { default: PipelineTraceModal } = await viteServer.ssrLoadModule('./src/components/PipelineTraceModal.jsx');

  // Test 1: KPI bar displays Requires Review count
  runTest('1. KPI bar displays Requires Review count correctly', () => {
    const mockTrace = {
      campaignId: 'camp-summer-2026',
      campaignTitle: 'Summer Campaign',
      summary: {
        totalCandidates: 12,
        passedEligibilityCount: 5,
        excludedCount: 5,
        requiresReviewCount: 2
      },
      stages: [],
      rankedCreators: [],
      requiresReview: [
        { creatorId: 'c1', creatorName: 'Review Candidate 1' },
        { creatorId: 'c2', creatorName: 'Review Candidate 2' }
      ],
      exclusions: []
    };

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        pipelineTrace: mockTrace
      })
    );

    assert.ok(html.includes('Requires Review'), 'KPI area must display Requires Review label');
    assert.ok(html.includes('2 Review'), 'KPI area must display "2 Review"');
  });

  // Test 2: Needs Review tab displays badge count
  runTest('2. Needs Review tab button shows badge count of review candidates', () => {
    const mockTrace = {
      campaignId: 'camp-summer-2026',
      summary: { requiresReviewCount: 3 },
      stages: [],
      rankedCreators: [],
      requiresReview: [
        { creatorId: 'c1', creatorName: 'Candidate 1' },
        { creatorId: 'c2', creatorName: 'Candidate 2' },
        { creatorId: 'c3', creatorName: 'Candidate 3' }
      ],
      exclusions: []
    };

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        pipelineTrace: mockTrace
      })
    );

    assert.ok(html.includes('Needs Review (3)'), 'Tab button must show "Needs Review (3)"');
  });

  // Test 3: Review candidates rendered with creator name, unverified requirements, and reasons
  runTest('3. Review tab renders candidates with creator name, unverified requirements, and human-readable reasons', () => {
    const mockTrace = {
      campaignId: 'camp-ai-fashion',
      summary: { requiresReviewCount: 1 },
      stages: [],
      rankedCreators: [],
      requiresReview: [
        {
          creatorId: 'c-rev-maya',
          creatorName: 'Maya Lin',
          creator: {
            id: 'c-rev-maya',
            name: 'Maya Lin',
            specialty: 'Generative AI Fashion',
            avatar: 'https://images.unsplash.com/photo-1'
          },
          unknownRequirements: [
            { requirement: 'formats', status: 'UNKNOWN', reason: 'Ambiguous 9:16 vertical video support requires creator confirmation' },
            { requirement: 'tools', status: 'UNKNOWN', reason: 'Kling 1.5 experience not verified in portfolio projects' }
          ],
          reasons: [
            'Ambiguous 9:16 vertical video support requires creator confirmation',
            'Kling 1.5 experience not verified in portfolio projects'
          ]
        }
      ],
      exclusions: []
    };

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'review',
        pipelineTrace: mockTrace
      })
    );

    assert.ok(html.includes('Maya Lin'), 'Candidate name must be displayed');
    assert.ok(html.includes('(c-rev-maya)'), 'Creator ID must be displayed');
    assert.ok(html.includes('Requires Review'), 'Status badge must state Requires Review');
    assert.ok(html.includes('formats'), 'Unverified format requirement must be displayed');
    assert.ok(html.includes('tools'), 'Unverified tools requirement must be displayed');
    assert.ok(html.includes('Ambiguous 9:16 vertical video support requires creator confirmation'), 'First reason must be displayed');
    assert.ok(html.includes('Kling 1.5 experience not verified in portfolio projects'), 'Second reason must be displayed');
  });

  // Test 4: Does not classify unknown requirements as failures
  runTest('4. Does not label unknown requirements as failures or rejections', () => {
    const mockTrace = {
      summary: { requiresReviewCount: 1 },
      stages: [],
      rankedCreators: [],
      requiresReview: [
        {
          creatorId: 'c-rev-1',
          creatorName: 'Jordan Smith',
          unknownRequirements: [{ requirement: 'licensing', status: 'UNKNOWN', reason: 'Commercial licensing unconfirmed' }],
          reasons: ['Commercial licensing unconfirmed']
        }
      ],
      exclusions: []
    };

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'review',
        pipelineTrace: mockTrace
      })
    );

    assert.ok(html.includes('Awaiting Manual Review'), 'Must clearly state status is Awaiting Manual Review');
    assert.ok(html.includes('Not classified as failure'), 'Must state that candidate is not classified as failure');
  });

  // Test 5: Safe fallbacks for missing name and missing fields
  runTest('5. Gracefully handles missing creator names, IDs, and empty objects', () => {
    const mockTrace = {
      stages: [],
      rankedCreators: [],
      requiresReview: [
        {}, // completely empty candidate object
        { creatorId: 'c-partial' }
      ],
      exclusions: []
    };

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'review',
        pipelineTrace: mockTrace
      })
    );

    assert.ok(html.includes('Unnamed Creator'), 'Must safely fall back to Unnamed Creator');
    assert.ok(html.includes('c-partial'), 'Must render available partial ID');
  });

  // Test 6: Zero review candidates renders clean empty state without crashing
  runTest('6. Zero review candidates renders clean empty state', () => {
    const mockTrace = {
      summary: { totalCandidates: 8, passedEligibilityCount: 4, excludedCount: 4, requiresReviewCount: 0 },
      stages: [],
      rankedCreators: [],
      requiresReview: [],
      exclusions: []
    };

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'review',
        pipelineTrace: mockTrace
      })
    );

    assert.ok(html.includes('No Candidates Require Review'), 'Must render clean empty state message');
    assert.ok(html.includes('0 Review'), 'KPI bar must render 0 Review');
    assert.ok(html.includes('Needs Review (0)'), 'Tab button must show Needs Review (0)');
  });

  // Test 7: Handles absent / undefined / null review data without crashing
  runTest('7. Handles null or absent requiresReview data without crashing', () => {
    const mockTrace = {
      summary: null,
      stages: [],
      rankedCreators: [],
      exclusions: []
      // requiresReview is completely absent
    };

    const html = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'review',
        pipelineTrace: mockTrace
      })
    );

    assert.ok(html.includes('0 Review'), 'KPI bar must default to 0 Review');
    assert.ok(html.includes('Needs Review (0)'), 'Tab button must default to Needs Review (0)');
    assert.ok(html.includes('No Candidates Require Review'), 'Empty state must render safely');
  });

  // Test 8: Ranked creators and exclusion ledger remain separate and unchanged
  runTest('8. Ranked eligible creators and exclusion ledger remain distinct and unpolluted', () => {
    const mockTrace = {
      campaignId: 'camp-clean',
      stages: [],
      summary: { totalCandidates: 3, passedEligibilityCount: 1, excludedCount: 1, requiresReviewCount: 1 },
      rankedCreators: [
        {
          creatorId: 'c-eligible',
          score: 92,
          fitLabel: 'Exceptional Fit',
          creator: { id: 'c-eligible', name: 'Eligible Star', avatar: '', specialty: 'AI Motion', styles: ['Cinematic'] },
          explanation: { summary: 'Passed all criteria' }
        }
      ],
      requiresReview: [
        { creatorId: 'c-review', creatorName: 'Review Candidate', reasons: ['Needs confirmation'] }
      ],
      exclusions: [
        { creatorId: 'c-excluded', creatorName: 'Excluded Candidate', code: 'FORMAT_UNSUPPORTED', reason: 'Unsupported format', stage: 'stage_05_format_filter' }
      ]
    };

    // Render eligible tab
    const eligibleHtml = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'eligible',
        pipelineTrace: mockTrace
      })
    );
    assert.ok(eligibleHtml.includes('Eligible Star'), 'Eligible tab must render eligible creator');
    assert.ok(!eligibleHtml.includes('Review Candidate'), 'Eligible tab must NOT contain review candidate');
    assert.ok(!eligibleHtml.includes('Excluded Candidate'), 'Eligible tab must NOT contain excluded candidate');

    // Render exclusions tab
    const exclusionHtml = renderToStaticMarkup(
      React.createElement(PipelineTraceModal, {
        isOpen: true,
        initialTab: 'exclusions',
        pipelineTrace: mockTrace
      })
    );
    assert.ok(exclusionHtml.includes('Excluded Candidate'), 'Exclusions tab must render excluded candidate');
    assert.ok(!exclusionHtml.includes('Eligible Star'), 'Exclusions tab must NOT contain eligible creator');
    assert.ok(!exclusionHtml.includes('Review Candidate'), 'Exclusions tab must NOT contain review candidate');
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
