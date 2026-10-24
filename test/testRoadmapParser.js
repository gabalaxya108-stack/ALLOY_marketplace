// test/testRoadmapParser.js
import assert from 'assert';

function parseRoadmap(text) {
  if (!text || typeof text !== 'string') return { isRoadmap: false };

  // Quick check for roadmap signals
  const hasRoadmapHeader = /(?:###?\s*(?:C\.\s*)?Roadmap|####?\s*Roadmap|\bRoadmap\b)/i.test(text);
  const hasGoalHeader = /(?:###?\s*(?:A\.\s*)?Goal|Goal:)/i.test(text);
  const hasStepSignal = /(?:^|\n)\s*(?:\d+\.|\bStep\s*\d+:?)\s+\*{0,2}/m.test(text);

  if (!hasRoadmapHeader && !hasGoalHeader && !hasStepSignal) {
    return { isRoadmap: false };
  }

  // Extract Goal
  let goal = '';
  const goalMatch = text.match(/(?:###?\s*(?:A\.\s*)?Goal:?\s*(.*?)(?=\n|$)|##\s*(?:A\.\s*)?Goal:?\s*(.*?)(?=\n|$))/i);
  if (goalMatch) {
    goal = (goalMatch[1] || goalMatch[2] || '').trim().replace(/^\*{1,2}|\*{1,2}$/g, '');
  }

  // Extract Starting Point
  let startingPoint = '';
  const startMatch = text.match(/(?:####?\s*(?:B\.\s*)?Starting\s*Point:?\s*\n)([\s\S]*?)(?=\n####?|\n###|$)/i);
  if (startMatch) {
    startingPoint = startMatch[1].trim();
  }

  // Extract Dependencies
  let dependencies = '';
  const depMatch = text.match(/(?:####?\s*(?:D\.\s*)?Dependencies:?\s*\n)([\s\S]*?)(?=\n####?|\n###|$)/i);
  if (depMatch) {
    dependencies = depMatch[1].trim();
  }

  // Extract Next Action
  let nextAction = '';
  const nextMatch = text.match(/(?:####?\s*(?:E\.\s*)?Next\s*Action:?\s*\n)([\s\S]*?)(?=\n####?|\n###|$)/i);
  if (nextMatch) {
    nextAction = nextMatch[1].trim();
  }

  // Extract Roadmap section
  let roadmapText = '';
  const roadmapSectionMatch = text.match(/(?:####?\s*(?:C\.\s*)?Roadmap:?\s*\n)([\s\S]*?)(?=\n####?\s*(?:D\.\s*)?Dependencies|\n####?\s*(?:E\.\s*)?Next\s*Action|\n###|$)/i);
  if (roadmapSectionMatch) {
    roadmapText = roadmapSectionMatch[1];
  } else {
    roadmapText = text;
  }

  // Extract Steps
  const stepChunks = roadmapText.split(/(?=(?:^|\n)\s*(?:\d+\.|\bStep\s*\d+:?)\s+)/m).filter(c => c.trim().length > 0);
  const steps = [];

  for (const chunk of stepChunks) {
    const titleMatch = chunk.match(/(?:^|\n)\s*(?:\d+\.|\bStep\s*(\d+)?:?)\s*\*{0,2}(.*?)\*{0,2}(?:\n|$)/);
    if (!titleMatch) continue;

    const rawTitle = (titleMatch[2] || '').trim().replace(/^\*{1,2}|\*{1,2}$/g, '');
    if (!rawTitle) continue;

    // What to do
    const whatMatch = chunk.match(/-\s*\*{0,2}What(?:'s| to do| needs to be done)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
    const what = whatMatch ? whatMatch[1].trim() : '';

    // Why it matters
    const whyMatch = chunk.match(/-\s*\*{0,2}Why(?: it matters| this matters)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
    const why = whyMatch ? whyMatch[1].trim() : '';

    // Action checklist
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

    // Expected outcome
    const outcomeMatch = chunk.match(/-\s*\*{0,2}Expected outcome:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
    const outcome = outcomeMatch ? outcomeMatch[1].trim() : '';

    // Alloy Feature
    const featureMatch = chunk.match(/-\s*\*{0,2}(?:Alloy\s*)?Feature(?: or capability)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
    const feature = featureMatch ? featureMatch[1].trim() : '';

    // Status
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

// Test case 1: Standard full roadmap
const sampleFullRoadmap = `
### Goal: Launch a Luxury Skincare AI Video Campaign on Alloy

#### Starting Point
You have a luxury skincare brand brief ready, but haven't yet defined mandatory format specs.

#### Roadmap

1. **Define Deliverables & Format Verification**
   - **What to do:** Specify exact aspect ratios (9:16 vertical video and 4K macro stills) and tools required.
   - **Why it matters:** Stage 2 format filtering requires proven commercial deliverable evidence before creators can qualify.
   - **Action checklist:**
     - [ ] Define required video resolution and aspect ratios
     - [ ] Set minimum proven commercial deliverables
   - **Expected outcome:** Clear technical brief with Stage 1 & 2 constraint boundaries.
   - **Alloy Feature:** Brief Builder
   - **Status:** Not started

2. **Discover & Compare Creators via CreaMatch**
   - **What to do:** Filter directory candidates and evaluate 7-stage CreaMatch scores.
   - **Why it matters:** Ensures creators meet Style Fit, Tool Proficiency, and Historical Reliability benchmarks.
   - **Action checklist:**
     - [ ] Review top-matched creators in Beauty & Skincare
     - [ ] Compare verified portfolio evidence
   - **Expected outcome:** Curated shortlist of 3-5 verified creator candidates.
   - **Alloy Feature:** Discover Creators
   - **Status:** Not started

#### Dependencies
Step 2 depends on Step 1 (brief requirements must be defined before matching).

#### Next Action
Open the Brief Builder in Brand Workspace and input your 9:16 vertical video deliverable specifications.
`;

const res1 = parseRoadmap(sampleFullRoadmap);
assert.strictEqual(res1.isRoadmap, true);
assert.strictEqual(res1.goal, 'Launch a Luxury Skincare AI Video Campaign on Alloy');
assert.strictEqual(res1.steps.length, 2);
assert.strictEqual(res1.steps[0].title, 'Define Deliverables & Format Verification');
assert.strictEqual(res1.steps[0].checklist.length, 2);
assert.strictEqual(res1.steps[0].feature, 'Brief Builder');
assert.ok(res1.dependencies.includes('Step 2 depends on Step 1'));
assert.ok(res1.nextAction.includes('Open the Brief Builder'));

// Test case 2: Simple factual question (must NOT be parsed as roadmap)
const simpleAnswer = `Maya Sharma specializes in **Cinematic AI Video** with 35mm anamorphic sun flares, hyper-realistic product staging, and generative kinetic pacing. Her verified tools include Midjourney v6, Runway Gen-3 Alpha, and After Effects.`;
const res2 = parseRoadmap(simpleAnswer);
assert.strictEqual(res2.isRoadmap, false);

console.log('✅ All Roadmap Parser tests passed successfully!');
