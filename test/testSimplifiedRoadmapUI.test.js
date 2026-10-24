// test/testSimplifiedRoadmapUI.test.js
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('--- TEST SUITE: Simplified Roadmap UI & Clean Violet Theme ---');

const jsxPath = path.resolve('src/components/AlloyAIAssistant.jsx');
const cssPath = path.resolve('src/components/AlloyAIAssistant.css');
const appPath = path.resolve('src/App.jsx');

const jsxContent = fs.readFileSync(jsxPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const appContent = fs.readFileSync(appPath, 'utf8');

// Test 1: Complete removal of progress bar UI & state
console.log('\nTest 1: Complete removal of progress-tracking UI...');
assert.strictEqual(
  jsxContent.includes('chatbot-mainpage-progress-container'),
  false,
  'AlloyAIAssistant.jsx must not contain chatbot-mainpage-progress-container'
);
assert.strictEqual(
  jsxContent.includes('avatar-progress-ring-svg'),
  false,
  'AlloyAIAssistant.jsx must not contain avatar-progress-ring-svg'
);
assert.strictEqual(
  jsxContent.includes('mainPageProgress'),
  false,
  'AlloyAIAssistant.jsx must not contain mainPageProgress state'
);
assert.strictEqual(
  jsxContent.includes('isStepFulfilledByMainPage'),
  false,
  'AlloyAIAssistant.jsx must not contain isStepFulfilledByMainPage'
);
assert.strictEqual(
  jsxContent.includes('handleCycleStepStatus'),
  false,
  'AlloyAIAssistant.jsx must not contain handleCycleStepStatus'
);
assert.strictEqual(
  jsxContent.includes('handleToggleCheckItem'),
  false,
  'AlloyAIAssistant.jsx must not contain handleToggleCheckItem'
);
console.log('  ✓ Progress state, calculations, and progress containers completely removed.');

// Test 2: Complete removal of status pills and "Ask about this step" button
console.log('\nTest 2: Removal of status badges, completion percentage, and "Ask about this step"...');
assert.strictEqual(
  jsxContent.includes('Ask about this step'),
  false,
  'VisualRoadmap must not contain "Ask about this step" button'
);
assert.strictEqual(
  jsxContent.includes('roadmap-progress-card'),
  false,
  'VisualRoadmap must not contain roadmap-progress-card'
);
assert.strictEqual(
  jsxContent.includes('roadmap-progress-track'),
  false,
  'VisualRoadmap must not contain roadmap-progress-track'
);
assert.strictEqual(
  jsxContent.includes('step-status-pill'),
  false,
  'VisualRoadmap must not contain step-status-pill'
);
console.log('  ✓ Status badges and redundant buttons completely removed.');

// Test 3: Simplified Step Layout verification
console.log('\nTest 3: Simplified Step Layout verification...');
assert.ok(
  jsxContent.includes('step-num-eyebrow') && jsxContent.includes('STEP {stepNumStr}'),
  'Step must have STEP XX number eyebrow'
);
assert.ok(
  jsxContent.includes('step-title-text') && jsxContent.includes('{step.title}'),
  'Step must have short descriptive heading'
);
assert.ok(
  jsxContent.includes('step-instruction-text'),
  'Step must have concise instruction text'
);
assert.ok(
  jsxContent.includes('step-feature-link-btn'),
  'Step must support relevant destination link button'
);
assert.ok(
  jsxContent.includes('onToggleExpand'),
  'Steps must remain expandable and collapsible'
);
console.log('  ✓ Step layout strictly adheres to Step number, Heading, Concise instructions, and Action link.');

// Test 4: Visual Theme Colors in CSS
console.log('\nTest 4: Visual Theme Tokens & Contemporary Styling in CSS...');
assert.ok(
  cssContent.includes('#F7F7F5'),
  'CSS must include warm off-white background #F7F7F5'
);
assert.ok(
  cssContent.includes('#FFFFFF'),
  'CSS must include pure white card background #FFFFFF'
);
assert.ok(
  cssContent.includes('#242424'),
  'CSS must include charcoal primary text #242424'
);
assert.ok(
  cssContent.includes('#777777'),
  'CSS must include muted grey secondary text #777777'
);
assert.ok(
  cssContent.includes('#7257D5'),
  'CSS must include sophisticated violet accent #7257D5'
);
assert.ok(
  cssContent.includes('#EAEAEA'),
  'CSS must include subtle light grey borders #EAEAEA'
);
console.log('  ✓ Visual palette tokens strictly verified (#F7F7F5, #FFFFFF, #242424, #777777, #7257D5, #EAEAEA).');

// Test 5: Section 11 CSS removal
console.log('\nTest 5: Obsolete Section 11 CSS removal...');
assert.strictEqual(
  cssContent.includes('.chatbot-mainpage-progress-container'),
  false,
  'CSS must not contain .chatbot-mainpage-progress-container'
);
assert.strictEqual(
  cssContent.includes('.avatar-progress-ring-svg'),
  false,
  'CSS must not contain .avatar-progress-ring-svg'
);
console.log('  ✓ Obsolete Section 11 completely eradicated.');

// Test 6: App.jsx props cleanup
console.log('\nTest 6: App.jsx props cleanliness...');
assert.strictEqual(
  appContent.includes('currentView={currentView}\n          activeCreatorId={activeCreatorId}'),
  false,
  'App.jsx should not pass unused progress props to AlloyAIAssistant'
);
console.log('  ✓ App.jsx cleaned up.');

console.log('\n✅ ALL SIMPLIFIED ROADMAP TESTS PASSED CLEANLY!\n');
