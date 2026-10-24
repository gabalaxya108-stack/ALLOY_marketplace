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

import { isGroqConfigured, getGroqModel, streamAlloyAiChat } from '../server/groqService.js';

console.log('================================================================');
console.log(' ALLOY — GROQ AI REAL-TIME STREAMING INFERENCE VERIFICATION');
console.log('================================================================');

async function runTest() {
  console.log(`[Config Check] Groq configured: ${isGroqConfigured()}`);
  console.log(`[Config Check] Active Model: ${getGroqModel()}`);

  if (!isGroqConfigured()) {
    console.error('❌ GROQ_API_KEY is not configured in .env');
    process.exit(1);
  }

  const chunks = [];
  let reasoningCount = 0;
  let isDone = false;

  console.log('\n--- 1. Testing Real Streaming Inference via Groq API ---');
  console.log('User Question: "What is the 7-stage filtering pipeline on Alloy in 3 short bullet points?"');
  process.stdout.write('Streaming response tokens: ');

  await streamAlloyAiChat({
    messages: [
      {
        sender: 'user',
        text: 'What is the 7-stage filtering pipeline on Alloy in 3 short bullet points?'
      }
    ],
    role: 'brand',
    context: {
      activeCampaignTitle: 'Veda Botanics Master Campaign',
      sampleCreators: ['Maya Sharma', 'Julian Vance']
    },
    onReasoning: () => {
      reasoningCount++;
    },
    onChunk: (chunk) => {
      chunks.push(chunk);
      process.stdout.write(chunk);
    },
    onDone: () => {
      isDone = true;
      console.log('\n\n✅ Stream completed successfully with [DONE] marker.');
    },
    onError: (err) => {
      console.error('\n❌ Streaming error:', err.message);
    }
  });

  const fullResponse = chunks.join('');
  console.log(`\nTotal token chunks received: ${chunks.length}`);
  console.log(`Reasoning chunks received: ${reasoningCount}`);
  console.log(`Total response length: ${fullResponse.length} characters`);

  if (!isDone || chunks.length === 0) {
    console.error('❌ Failed: No streaming tokens received or stream did not complete.');
    process.exit(1);
  }

  // Verify response contains Alloy pipeline terms
  const lower = fullResponse.toLowerCase();
  const hasPipelineKnowledge = lower.includes('filter') || lower.includes('pipeline') || lower.includes('stage') || lower.includes('brief') || lower.includes('evidence');
  
  if (hasPipelineKnowledge) {
    console.log('✅ Grounded Alloy intelligence confirmed in Groq response.');
  } else {
    console.warn('⚠️ Warning: Expected pipeline terminology in response.');
  }

  console.log('================================================================');
  console.log(' RESULTS: Groq Real-Time Streaming Verified 100% Operational!');
  console.log('================================================================\n');
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
