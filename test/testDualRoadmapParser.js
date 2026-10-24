// test/testDualRoadmapParser.js
import assert from 'assert';

function parseRoadmapFromMarkdown(text) {
  if (!text || typeof text !== 'string') return { isRoadmap: false };

  // Detect roadmap indicators
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
      // Look at next non-empty line
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

  // Check if Roadmap is formatted as a Markdown Table
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
          break; // end of table
        }
        if (/^\|\s*[-:]+/.test(line)) continue; // separator row

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

        // Parse action checklist items from cell
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

  // If table parsing did not extract steps, parse from standard list chunks
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

// Test with Groq's table output
const realGroqTable = `### Goal  
**Launch a high‑impact, luxury‑skin‑care campaign on Alloy that secures a top‑tier creator, aligns on premium visual language, and delivers approved assets on schedule with escrow‑protected payment.**  

---

#### Starting Point  
You are a Brand Partner/Creative Director with a defined luxury‑skin‑care product line, a fixed campaign budget of **$120,000**, and an intended launch window of **8 weeks**. The brief is ready in draft form but has not yet been ingested into Alloy, and no creators have been shortlisted.  

---

## Roadmap  

| # | Step | What to do | Why it matters | Action checklist | Expected outcome | Alloy Feature | Status |
|---|------|------------|----------------|------------------|------------------|---------------|--------|
| 1 | **Brief Ingestion & Normalization (Stage 1)** | Upload the full creative brief into the **Brand Workspace → Brief Builder** and tag every hard constraint (e.g., 9:16 vertical video, 4K resolution, ISO‑compliant product shots) vs. optional aesthetic preferences (e.g., pastel palette, ethereal motion). | Creates a machine‑readable brief that powers the 7‑stage filtering pipeline and guarantees that mandatory requirements are enforced automatically. | • Open Brief Builder  <br>• Paste final brief text  <br>• Highlight mandatory items → “Hard Constraint”  <br>• Highlight aesthetic wishes → “Optional Preference”  <br>• Save & Run Normalization | A normalized brief with explicit **Hard Constraints** and **Optional Preferences** ready for creator discovery. | Brand Workspace – Brief Builder | Not started |
| 2 | **Define Technical & Budget Parameters (Stage 4)** | Set the non‑negotiable budget ceiling ($120 k) and indicate any negotiable leeway (e.g., up to 10 % for additional deliverables). Confirm required deliverable formats (9:16 video, 3‑D product render, carousel images). | Stage 4 enforces budget boundaries and flags creators whose rate expectations exceed the ceiling, while still allowing flexible negotiation on optional extras. | • In Brief Builder → “Budget & Rates” tab  <br>• Enter **Hard Budget** = $120 k  <br>• Set **Negotiable Leeway** = 10 %  <br>• List required formats (9:16, 4K, 3‑D)  <br>• Save | Budget constraints locked; Alloy will auto‑filter creators outside the range. | Brand Workspace – Budget Settings | Not started |

---

### Dependencies  
- **Step 2** cannot be completed until **Step 1** is finished.

---

## Next Action  
**Open the Brand Workspace → Brief Builder, paste your final brief, and click Run Normalization.**
`;

const res = parseRoadmapFromMarkdown(realGroqTable);
assert.strictEqual(res.isRoadmap, true);
assert.strictEqual(res.steps.length, 2);
assert.strictEqual(res.steps[0].title, 'Brief Ingestion & Normalization (Stage 1)');
assert.strictEqual(res.steps[0].checklist.length, 5);
assert.strictEqual(res.steps[0].checklist[0].text, 'Open Brief Builder');
assert.strictEqual(res.steps[0].feature, 'Brand Workspace – Brief Builder');
assert.ok(res.dependencies.replace(/\*\*/g, '').includes('Step 2 cannot be completed until Step 1'));
assert.ok(res.nextAction.replace(/\*\*/g, '').includes('Open the Brand Workspace'));
console.log('✅ Real Groq Markdown Table Roadmap successfully parsed with all 2 steps and 5 checklists!');
