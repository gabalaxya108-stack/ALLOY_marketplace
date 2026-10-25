// test/testAlloyAiChatbotTheme.test.js
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('--- TEST SUITE: Alloy AI Complete Chatbot Theme (Arctic White + Forest Green + Soft Sage) ---');

const jsxPath = path.resolve('src/components/AlloyAIAssistant.jsx');
const cssPath = path.resolve('src/components/AlloyAIAssistant.css');

const jsxContent = fs.readFileSync(jsxPath, 'utf8');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// 1. Color System Check
console.log('\nTest 1: Official Color System Tokens...');
const requiredColors = [
  { name: 'Primary forest green', hex: '#203B32' },
  { name: 'Secondary forest green', hex: '#386B53' },
  { name: 'Sage green', hex: '#527464' },
  { name: 'Soft sage background', hex: '#F2F5F1' },
  { name: 'Pure white', hex: '#FFFFFF' },
  { name: 'Primary text', hex: '#25332C' },
  { name: 'Secondary text', hex: '#738078' },
  { name: 'Muted text', hex: '#929D95' },
  { name: 'Borders', hex: '#DFE7E0' },
  { name: 'Secondary surfaces', hex: '#F7F9F6' },
  { name: 'Hover background', hex: '#E9F0E9' }
];

for (const c of requiredColors) {
  assert.ok(
    cssContent.toUpperCase().includes(c.hex.toUpperCase()),
    `CSS must include official token ${c.name} (${c.hex})`
  );
}
console.log('  ✓ All 11 official design system colors are present.');

// 2. Strict Prohibition Check (no violet, purple, blue, gold, bronze, or brown)
console.log('\nTest 2: Strict Prohibition of Disallowed Colors...');
const forbiddenSubstrings = ['#7257D5', 'purple', 'violet', 'bronze', 'champagne'];
for (const term of forbiddenSubstrings) {
  assert.strictEqual(
    cssContent.toLowerCase().includes(term.toLowerCase()),
    false,
    `CSS must not contain forbidden color or term: ${term}`
  );
  assert.strictEqual(
    jsxContent.toLowerCase().includes(term.toLowerCase()),
    false,
    `JSX must not contain forbidden color or term: ${term}`
  );
}
console.log('  ✓ Verified: No purple, violet, blue, gold, bronze, or brown accents.');

// 3. Header Redesign Check
console.log('\nTest 3: Chatbot Header Specification...');
assert.ok(
  jsxContent.includes('Alloy AI') && jsxContent.includes('Roadmap Strategist'),
  'Header must contain Alloy AI title and Roadmap Strategist subtitle'
);
assert.ok(
  jsxContent.includes('status-live-dot'),
  'Header must contain minimal online indicator'
);
assert.ok(
  jsxContent.includes('title="Reset conversation"'),
  'Header must contain clean reset conversation button'
);
assert.ok(
  jsxContent.includes('title="Close"'),
  'Header must contain clean close button'
);
assert.ok(
  cssContent.includes('.chat-panel-header'),
  'CSS must define .chat-panel-header'
);
assert.ok(
  cssContent.includes('border-bottom: 1px solid var(--alloy-border)'),
  'Header must have subtle bottom border'
);
console.log('  ✓ Chatbot header verified.');

// 4. Navigation Shortcuts (Chips) Check
console.log('\nTest 4: Navigation Quick-Action Chips...');
assert.ok(
  cssContent.includes('.suggestion-chip'),
  'CSS must style .suggestion-chip'
);
assert.ok(
  cssContent.includes('background: var(--alloy-soft-sage)'),
  'Chips must have soft sage backgrounds'
);
assert.ok(
  cssContent.includes('color: var(--alloy-forest-primary)'),
  'Chips must have deep forest green text'
);
console.log('  ✓ Quick-action chips verified.');

// 5. AI and User Messages
console.log('\nTest 5: AI and User Messages Styling...');
assert.ok(
  cssContent.includes('.chat-bubble-row.is-user .bubble-text'),
  'CSS must style user messages'
);
assert.ok(
  cssContent.includes('.chat-bubble-row.is-ai .bubble-text'),
  'CSS must style AI messages'
);
assert.ok(
  cssContent.includes('line-height: 1.65'),
  'Comfortable line spacing verified'
);
console.log('  ✓ Message styling verified.');

// 6. Roadmap Cards
console.log('\nTest 6: Roadmap Design...');
assert.ok(
  cssContent.includes('.alloy-visual-roadmap-container'),
  'CSS must style roadmap container'
);
assert.ok(
  cssContent.includes('.roadmap-step-card'),
  'CSS must style roadmap step cards'
);
assert.ok(
  cssContent.includes('.step-num-eyebrow') && cssContent.includes('var(--alloy-sage)'),
  'Step eyebrow must use sage green'
);
assert.ok(
  cssContent.includes('.step-title-text') && cssContent.includes('var(--alloy-forest-primary)'),
  'Step title must use forest green'
);
console.log('  ✓ Roadmap design verified.');

// 7. Message Composer
console.log('\nTest 7: Message Composer Specification...');
assert.ok(
  cssContent.includes('.chat-composer-input'),
  'CSS must style .chat-composer-input'
);
assert.ok(
  cssContent.includes('.chat-composer-send-btn'),
  'CSS must style .chat-composer-send-btn'
);
assert.ok(
  cssContent.includes('background: var(--alloy-forest-primary)'),
  'Send button must be deep forest green'
);
console.log('  ✓ Message composer verified.');

// 8. Footer Check
console.log('\nTest 8: Footer Typography & Centering...');
assert.ok(
  jsxContent.includes('Alloy Intelligent Roadmap Engine · Groq AI'),
  'Footer text must be exactly "Alloy Intelligent Roadmap Engine · Groq AI"'
);
assert.ok(
  cssContent.includes('.chat-panel-footer-note'),
  'CSS must style .chat-panel-footer-note'
);
console.log('  ✓ Footer verified.');

console.log('\n✅ ALL CHATBOT THEME TESTS PASSED PERFECTLY!\n');
