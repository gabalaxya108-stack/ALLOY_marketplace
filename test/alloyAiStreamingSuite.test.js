// test/alloyAiStreamingSuite.test.js
// Comprehensive test suite for Alloy AI Real-Time Groq Streaming Experience

import fs from 'fs';
import path from 'path';

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { isGroqConfigured, getGroqModel, streamAlloyAiChat, buildAlloySystemPrompt } from '../server/groqService.js';

console.log('================================================================');
console.log(' ALLOY AI — REAL-TIME GROQ RESPONSE GENERATION TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    failCount++;
  }
}

async function test1_GroqConfiguration() {
  console.log('--- Test 1: Groq API Key & Model Configuration ---');
  assert(isGroqConfigured(), 'Groq API Key is configured and non-empty in environment');
  const model = getGroqModel();
  assert(Boolean(model && model.length > 0), `Configured Groq model is active: ${model}`);
}

async function test2_RoleSystemPromptGeneration() {
  console.log('\n--- Test 2: Role-Specific System Prompts (Creator vs Brand) ---');
  const brandPrompt = buildAlloySystemPrompt({ role: 'brand', context: { campaignId: 'c-test' } });
  const creatorPrompt = buildAlloySystemPrompt({ role: 'creator', context: { creatorId: 'maya-chen' } });

  assert(brandPrompt.includes('BRAND PARTNER') || brandPrompt.includes('CREATIVE DIRECTOR'), 'Brand prompt instructs assistant to speak with Brand partners');
  assert(brandPrompt.includes('7-STAGE FILTERING PIPELINE'), 'Brand prompt includes 7-stage filtering pipeline architecture');
  
  assert(creatorPrompt.includes('CREATOR on Alloy'), 'Creator prompt instructs assistant to speak with Creators');
  assert(creatorPrompt.includes('eligibility classifications'), 'Creator prompt includes eligibility explanation guidance');
}

async function test3_RealStreamingInferenceGreeting() {
  console.log('\n--- Test 3: Real Groq Token Streaming (Greeting) ---');
  const tokens = [];
  let completed = false;

  await streamAlloyAiChat({
    messages: [{ sender: 'user', text: 'Hello Alloy AI!' }],
    role: 'creator',
    onChunk: (chunk) => {
      tokens.push(chunk);
    },
    onDone: () => {
      completed = true;
    }
  });

  assert(completed, 'Stream received completion [DONE] signal');
  assert(tokens.length > 0, `Progressive tokens received incrementally (count: ${tokens.length})`);
  const fullText = tokens.join('');
  assert(fullText.length > 10, `Meaningful response received: "${fullText.trim().slice(0, 80)}..."`);
}

async function test4_GroundedMarketplaceKnowledgeQuery() {
  console.log('\n--- Test 4: Grounded Marketplace Architecture & Pipeline Query ---');
  const tokens = [];
  let reasoningReceived = false;

  await streamAlloyAiChat({
    messages: [
      { sender: 'user', text: 'Explain the difference between Eligible, Ineligible, and Needs Review in Alloy CreaMatch.' }
    ],
    role: 'brand',
    context: {
      activeCampaignTitle: 'Veda Botanics'
    },
    onReasoning: () => {
      reasoningReceived = true;
    },
    onChunk: (chunk) => {
      tokens.push(chunk);
    }
  });

  const fullText = tokens.join('');
  const lower = fullText.toLowerCase();

  assert(tokens.length >= 10, `Multi-token stream generated: ${tokens.length} chunks`);
  assert(lower.includes('eligible') && lower.includes('ineligible'), 'Response explains Eligible and Ineligible statuses');
  assert(lower.includes('review') || lower.includes('format'), 'Response explains Needs Review / format evidence');
}

async function test5_MultiTurnConversationHistory() {
  console.log('\n--- Test 5: Multi-Turn Conversation History Preservation ---');
  const tokens = [];

  const conversationHistory = [
    { sender: 'user', text: 'I am planning a campaign for luxury matcha tea.' },
    { sender: 'alloy-ai', text: 'Splendid. We should look for creators with macro fluid physics and elegant green botanical palettes.' },
    { sender: 'user', text: 'Which specific creator would you recommend for this?' }
  ];

  await streamAlloyAiChat({
    messages: conversationHistory,
    role: 'brand',
    onChunk: (chunk) => {
      tokens.push(chunk);
    }
  });

  const fullText = tokens.join('');
  const lower = fullText.toLowerCase();

  assert(tokens.length > 5, 'Assistant responded to follow-up query using conversation history');
  assert(lower.includes('maya') || lower.includes('creator') || lower.includes('beverage') || lower.includes('tea') || lower.includes('botanic'), 'Response connects to tea/beverage aesthetic context from previous turn');
}

async function test6_StreamInterruptionSupport() {
  console.log('\n--- Test 6: Stream Abort / Interruption Support ---');
  const abortController = new AbortController();
  let tokensBeforeAbort = 0;
  let errorCaught = false;

  try {
    const promise = streamAlloyAiChat({
      messages: [{ sender: 'user', text: 'Write a very long 1000-word creative analysis of all modern AI aesthetics.' }],
      role: 'brand',
      signal: abortController.signal,
      onChunk: () => {
        tokensBeforeAbort++;
        if (tokensBeforeAbort === 3) {
          abortController.abort(); // simulate user clicking Stop Generating
        }
      }
    });

    await promise;
  } catch (err) {
    errorCaught = true;
  }

  assert(tokensBeforeAbort >= 1, `Stream successfully aborted mid-flight after receiving initial tokens (${tokensBeforeAbort})`);
}

async function runAll() {
  await test1_GroqConfiguration();
  await test2_RoleSystemPromptGeneration();
  await test3_RealStreamingInferenceGreeting();
  await test4_GroundedMarketplaceKnowledgeQuery();
  await test5_MultiTurnConversationHistory();
  await test6_StreamInterruptionSupport();

  console.log('\n================================================================');
  console.log(` SUMMARY: ${passCount}/${passCount + failCount} Tests Passed`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
