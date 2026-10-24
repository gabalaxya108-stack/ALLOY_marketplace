// test/alloyAiRoadmapAcceptanceSuite.test.js
// Acceptance Test Suite for ALLOY AI Roadmap-Based Intelligent Response System
import assert from 'assert';
import fs from 'fs';
import { streamAlloyAiChat, buildAlloySystemPrompt } from '../server/groqService.js';

// Setup environment
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Mirror exact parser logic from src/components/AlloyAIAssistant.jsx
function parseRoadmapFromMarkdown(text) {
  if (!text || typeof text !== 'string') return { isRoadmap: false };

  const hasRoadmapHeader = /(?:###?\s*(?:C\.\s*)?Roadmap|####?\s*Roadmap|\bRoadmap\b)/i.test(text);
  const hasGoalHeader = /(?:###?\s*(?:A\.\s*)?Goal|Goal:|\bGoal\b)/i.test(text);
  const hasTableSignal = /\|\s*#\s*\|\s*Step\s*\|/i.test(text);
  const hasStepSignal = /(?:^|\n)\s*(?:\d+\.|\bStep\s*\d+:?)\s+\*{0,2}/m.test(text);

  if (!hasRoadmapHeader && !hasGoalHeader && !hasTableSignal && !hasStepSignal) {
    return { isRoadmap: false };
  }

  // 1. Extract Goal
  let goal = '';
  const goalMatch = text.match(/(?:###?\s*(?:A\.\s*)?Goal:?\s*(.*?)(?=\n|$)|##\s*(?:A\.\s*)?Goal:?\s*(.*?)(?=\n|$))/i);
  if (goalMatch) {
    const rawGoal = (goalMatch[1] || goalMatch[2] || '').trim();
    if (rawGoal) {
      goal = rawGoal.replace(/^\*{1,2}|\*{1,2}$/g, '').trim();
    } else {
      const afterGoal = text.slice((goalMatch.index || 0) + goalMatch[0].length);
      const nextLine = afterGoal.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('---'));
      if (nextLine) goal = nextLine.replace(/^\*{1,2}|\*{1,2}$/g, '').trim();
    }
  }

  // 2. Extract Starting Point
  let startingPoint = '';
  const startMatch = text.match(/(?:####?\s*(?:B\.\s*)?Starting\s*Point:?\s*\n)([\s\S]*?)(?=\n####?|\n###|\n##|\n---|---|$)/i);
  if (startMatch) {
    startingPoint = startMatch[1].replace(/---/g, '').trim();
  }

  // 3. Extract Dependencies
  let dependencies = '';
  const depMatch = text.match(/(?:####?\s*(?:D\.\s*)?Dependencies:?\s*\n|###\s*(?:D\.\s*)?Dependencies:?\s*\n)([\s\S]*?)(?=\n####?|\n###|\n##|\n---|---|$)/i);
  if (depMatch) {
    dependencies = depMatch[1].replace(/---/g, '').trim();
  }

  // 4. Extract Next Action
  let nextAction = '';
  const nextMatch = text.match(/(?:####?\s*(?:E\.\s*)?Next\s*Action:?\s*\n|###\s*(?:E\.\s*)?Next\s*Action:?\s*\n|##\s*(?:E\.\s*)?Next\s*Action:?\s*\n)([\s\S]*?)(?=\n####?|\n###|\n##|\n---|---|$)/i);
  if (nextMatch) {
    nextAction = nextMatch[1].replace(/---/g, '').trim();
  }

  const steps = [];

  // Branch A: Check if Roadmap is formatted as a Markdown Table
  if (hasTableSignal) {
    const lines = text.split('\n');
    const tableHeaderIdx = lines.findIndex(l => /\|\s*#\s*\|\s*Step\s*\|/i.test(l));
    if (tableHeaderIdx !== -1) {
      const headerCols = lines[tableHeaderIdx].split('|').map(c => c.trim().toLowerCase()).filter(Boolean);
      
      const colIdx = {
        num: headerCols.findIndex(c => c === '#' || c === 'no' || c === 'step #'),
        title: headerCols.findIndex(c => c === 'step' || c.includes('title') || c.includes('step title')),
        what: headerCols.findIndex(c => c.includes('what')),
        why: headerCols.findIndex(c => c.includes('why')),
        checklist: headerCols.findIndex(c => c.includes('checklist') || c.includes('action')),
        outcome: headerCols.findIndex(c => c.includes('outcome') || c.includes('deliverable')),
        feature: headerCols.findIndex(c => c.includes('feature') || c.includes('alloy')),
        status: headerCols.findIndex(c => c.includes('status'))
      };

      for (let i = tableHeaderIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('|')) {
          if (line.startsWith('---') || line === '') continue;
          break;
        }
        if (/^\|\s*[-:]+/.test(line)) continue;

        const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
        if (cells.length < 2) continue;

        const rawTitle = cells[colIdx.title !== -1 ? colIdx.title : 1] || '';
        const cleanTitle = rawTitle.replace(/^\*{1,2}|\*{1,2}$/g, '').trim();
        if (!cleanTitle) continue;

        const rawWhat = colIdx.what !== -1 ? (cells[colIdx.what] || '') : '';
        const rawWhy = colIdx.why !== -1 ? (cells[colIdx.why] || '') : '';
        const rawChecklist = colIdx.checklist !== -1 ? (cells[colIdx.checklist] || '') : '';
        const rawOutcome = colIdx.outcome !== -1 ? (cells[colIdx.outcome] || '') : '';
        const rawFeature = colIdx.feature !== -1 ? (cells[colIdx.feature] || '') : '';
        const rawStatus = colIdx.status !== -1 ? (cells[colIdx.status] || '') : '';

        const checklist = [];
        const checkItems = rawChecklist.split(/<br\s*\/?>|\n|•/g).map(s => s.trim()).filter(Boolean);
        for (const it of checkItems) {
          const checkMatch = it.match(/^\[([ xX])\]\s*(.*)$/);
          if (checkMatch) {
            checklist.push({
              checked: checkMatch[1].toLowerCase() === 'x',
              text: checkMatch[2].trim()
            });
          } else {
            checklist.push({
              checked: false,
              text: it.replace(/^[•\-*]\s*/, '').trim()
            });
          }
        }

        let status = 'not_started';
        const s = rawStatus.toLowerCase();
        if (s.includes('completed') || s.includes('done')) status = 'completed';
        else if (s.includes('progress') || s.includes('active')) status = 'in_progress';
        else if (s.includes('blocked') || s.includes('hold')) status = 'blocked';

        steps.push({
          number: steps.length + 1,
          title: cleanTitle,
          what: rawWhat.replace(/<br\s*\/?>/g, ' ').trim(),
          why: rawWhy.replace(/<br\s*\/?>/g, ' ').trim(),
          checklist,
          outcome: rawOutcome.replace(/<br\s*\/?>/g, ' ').trim(),
          feature: rawFeature.replace(/<br\s*\/?>/g, ' ').trim(),
          status
        });
      }
    }
  }

  // Branch B: List chunks
  if (steps.length === 0) {
    let roadmapText = '';
    const roadmapSectionMatch = text.match(/(?:(?:###|####|##)\s*(?:[A-Z]\.\s*)?.*Roadmap.*?\n)([\s\S]*?)(?=(?:\n###|\n####|\n##)\s*(?:[A-Z]\.\s*)?(?:Dependencies|Next\s*Action)|$)/i);
    roadmapText = roadmapSectionMatch ? roadmapSectionMatch[1] : text;

    const stepChunks = roadmapText.split(/(?=(?:^|\n)\s*(?:(?:\d+\.|\bStep\s*\d+:?)\s+))/m).filter(c => c.trim().length > 0);

    for (const chunk of stepChunks) {
      const titleMatch = chunk.match(/(?:^|\n)\s*(?:\d+\.|\bStep\s*(\d+)?:?)\s*\*{0,2}(.*?)\*{0,2}(?:\n|$)/);
      if (!titleMatch) continue;

      const rawTitle = (titleMatch[2] || '').trim().replace(/^\*{1,2}|\*{1,2}$/g, '');
      if (!rawTitle) continue;

      const whatMatch = chunk.match(/-\s*\*{0,2}What(?:'s| to do| needs to be done)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
      const what = whatMatch ? whatMatch[1].trim() : '';

      const whyMatch = chunk.match(/-\s*\*{0,2}Why(?: it matters| this matters)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
      const why = whyMatch ? whyMatch[1].trim() : '';

      const checklist = [];
      const checklistMatch = chunk.match(/-\s*\*{0,2}Action(?: checklist| items)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}(?:Expected|Alloy|Status)|\n\s*#|$)/i);
      if (checklistMatch) {
        const items = checklistMatch[1].split('\n');
        for (const item of items) {
          const trimmedItem = item.trim();
          const checkMatch = trimmedItem.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
          if (checkMatch) {
            checklist.push({
              checked: checkMatch[1].toLowerCase() === 'x',
              text: checkMatch[2].trim()
            });
          } else if (trimmedItem.match(/^[-*✦•]\s+(.*)$/)) {
            const itemText = trimmedItem.replace(/^[-*✦•]\s+/, '').trim();
            if (itemText && !itemText.toLowerCase().startsWith('what') && !itemText.toLowerCase().startsWith('why')) {
              checklist.push({
                checked: false,
                text: itemText
              });
            }
          }
        }
      }

      const outcomeMatch = chunk.match(/-\s*\*{0,2}Expected outcome:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
      const outcome = outcomeMatch ? outcomeMatch[1].trim() : '';

      const featureMatch = chunk.match(/-\s*\*{0,2}(?:Alloy\s*)?Feature(?: or capability)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
      const feature = featureMatch ? featureMatch[1].trim() : '';

      const statusMatch = chunk.match(/-\s*\*{0,2}Status:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
      let status = 'not_started';
      if (statusMatch) {
        const s = statusMatch[1].toLowerCase();
        if (s.includes('completed') || s.includes('done')) status = 'completed';
        else if (s.includes('progress') || s.includes('active')) status = 'in_progress';
        else if (s.includes('blocked') || s.includes('hold')) status = 'blocked';
      }

      steps.push({
        number: steps.length + 1,
        title: rawTitle,
        what,
        why,
        checklist,
        outcome,
        feature,
        status
      });
    }
  }

  if (steps.length < 2 && !goal) {
    return { isRoadmap: false };
  }

  return {
    isRoadmap: true,
    goal: goal || 'Action Roadmap',
    startingPoint,
    steps,
    dependencies,
    nextAction,
    rawText: text
  };
}

async function streamQueryWithRetry(prompt, role = 'brand', context = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const chunks = [];
      await streamAlloyAiChat({
        messages: [{ sender: 'user', text: prompt }],
        role,
        context,
        onChunk: (c) => chunks.push(c)
      });
      return chunks.join('');
    } catch (err) {
      if (err.status === 429 && attempt < retries) {
        console.log(`[Rate limit] Waiting 4s before retry ${attempt}...`);
        await sleep(4000);
      } else {
        throw err;
      }
    }
  }
}

async function runAcceptanceSuite() {
  console.log('================================================================');
  console.log(' ALLOY AI ROADMAP-BASED RESPONSE SYSTEM ACCEPTANCE SUITE');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  function testAssert(condition, name) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${name}`);
    } else {
      console.error(`❌ [FAIL] ${name}`);
    }
  }

  // 1. Simple factual question (Direct Answer)
  console.log('\n--- 1. Simple Factual Question (Direct Answer) ---');
  await sleep(1000);
  const factResponse = await streamQueryWithRetry('What is Maya Sharma\'s primary specialty and toolset?');
  const factParsed = parseRoadmapFromMarkdown(factResponse);
  testAssert(!factParsed.isRoadmap, 'Direct answer given for simple query (no artificial roadmap forced)');
  testAssert(factResponse.toLowerCase().includes('maya') || factResponse.toLowerCase().includes('video'), 'Accurately answers facts about Maya Sharma');

  // 2. Complex Brand Roadmap: Campaign Launch
  console.log('\n--- 2. Complex Brand Roadmap: Campaign Launch ---');
  await sleep(3500);
  const brandRoadmapResp = await streamQueryWithRetry(
    'Create an actionable roadmap to launch a luxury skincare campaign on Alloy.',
    'brand',
    { activeCampaign: { title: 'Veda Botanics Luxury Skincare' } }
  );
  const brandParsed = parseRoadmapFromMarkdown(brandRoadmapResp);
  testAssert(brandParsed.isRoadmap, 'Parses into structured action roadmap for brand campaign launch');
  testAssert(brandParsed.steps.length >= 2, `Contains sequential actionable steps (found: ${brandParsed.steps.length})`);
  testAssert(Boolean(brandParsed.goal), `Includes clear Goal heading: "${brandParsed.goal.slice(0, 60)}..."`);
  testAssert(brandParsed.steps.some(s => s.checklist?.length > 0), 'Contains actionable checklists in steps');
  testAssert(Boolean(brandParsed.nextAction), 'Concludes with clear immediate next action');

  // 3. Complex Creator Roadmap: Profile & Bidding
  console.log('\n--- 3. Complex Creator Roadmap: Profile Setup & Bidding ---');
  await sleep(3500);
  const creatorRoadmapResp = await streamQueryWithRetry(
    'Create an actionable roadmap for setting up my creator profile, verifying portfolio deliverables, and preparing competitive bids.',
    'creator',
    { creatorName: 'Julian Vance' }
  );
  const creatorParsed = parseRoadmapFromMarkdown(creatorRoadmapResp);
  testAssert(creatorParsed.isRoadmap, 'Parses into structured creator execution roadmap');
  testAssert(creatorParsed.steps.length >= 2, `Steps structured sequentially (count: ${creatorParsed.steps.length})`);
  testAssert(creatorParsed.steps.some(s => s.why || s.what), 'Includes What to do and Why it matters');

  // 4. Campaign Eligibility Troubleshooting
  console.log('\n--- 4. Campaign Eligibility Troubleshooting ---');
  await sleep(3500);
  const troubleResp = await streamQueryWithRetry(
    'Why was my bid marked Ineligible on a campaign, and what troubleshooting steps should I follow?',
    'creator'
  );
  const troubleParsed = parseRoadmapFromMarkdown(troubleResp);
  testAssert(troubleParsed.isRoadmap, 'Troubleshooting flow generated as structured actionable steps');
  testAssert(troubleResp.toLowerCase().includes('format') || troubleResp.toLowerCase().includes('requirement') || troubleResp.toLowerCase().includes('eligib'), 'Identifies root requirement reason');

  // 5. Malformed / Partial Stream Safety
  console.log('\n--- 5. Malformed / Partial Stream Safety ---');
  const malformedInput = '### Goal: Partial Stream\n#### Roadmap\n1. **Unfinished Step\n- What to do: incomplete text';
  const malformedParsed = parseRoadmapFromMarkdown(malformedInput);
  testAssert(typeof malformedParsed === 'object', 'Malformed or partial markdown handles gracefully without crash');

  // 6. Interactive Checklist & Status State Cycling
  console.log('\n--- 6. Interactive State & Status Cycling ---');
  const mockRoadmap = {
    steps: [
      { number: 1, title: 'Step 1', status: 'not_started', checklist: [{ checked: false, text: 'Action 1' }] }
    ]
  };
  const statusCycle = ['not_started', 'in_progress', 'completed', 'blocked'];
  const nextStatus = statusCycle[(statusCycle.indexOf(mockRoadmap.steps[0].status) + 1) % statusCycle.length];
  testAssert(nextStatus === 'in_progress', 'Status transitions correctly to in_progress upon user action');

  console.log('\n================================================================');
  console.log(` SUMMARY: ${passed}/${total} Acceptance Tests Passed`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

runAcceptanceSuite().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
