// server/groqService.js
// Server-side Groq API Service for CreaSync
// Strictly runs in Node.js — NEVER exposed to the frontend or bundled client code.
// Uses official Groq REST API endpoint (OpenAI-compatible) with native fetch.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

/**
 * Validates whether the Groq API key is present and configured.
 * Does NOT log or leak the key.
 */
export function isGroqConfigured() {
  const key = process.env.GROQ_API_KEY;
  return typeof key === 'string' && key.trim().length > 0 && !key.includes('your_groq_api_key');
}

export function getGroqModel() {
  return process.env.GROQ_MODEL || DEFAULT_MODEL;
}

/**
 * Low-level server-side caller to Groq Chat Completion API
 */
async function callGroqChat({ messages, temperature = 0.2, jsonMode = true, maxTokens = 2048 }) {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_CONFIG_MISSING: GROQ_API_KEY environment variable is not configured.');
  }

  const apiKey = process.env.GROQ_API_KEY.trim();
  const model = getGroqModel();

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorMessage = `Groq API responded with status ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error && parsed.error.message) {
        errorMessage = parsed.error.message;
      }
    } catch {
      // non-JSON error
    }
    const err = new Error(errorMessage);
    err.status = response.status;
    err.code = response.status === 429 ? 'RATE_LIMIT' : 'GROQ_API_ERROR';
    throw err;
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '{}';

  if (jsonMode) {
    try {
      return JSON.parse(rawContent);
    } catch (parseError) {
      console.error('[Groq Server] JSON parse error on response:', rawContent);
      throw new Error('MALFORMED_AI_RESPONSE: Groq returned invalid JSON format.');
    }
  }

  return rawContent;
}

// =========================================================================
// 1. FEATURE: CREABRIEF
// Turns natural-language campaign text into a structured brief.
// STRICT: Does NOT invent budgets or deadlines. Distinguishes explicit from inferred.
// =========================================================================
export async function generateCreaBrief(naturalPrompt) {
  if (!naturalPrompt || typeof naturalPrompt !== 'string' || naturalPrompt.trim().length === 0) {
    throw new Error('INVALID_INPUT: Campaign description is empty.');
  }

  const systemPrompt = `You are CreaBrief, an expert creative agency producer and brief architect for CreaSync, an AI creative marketplace connecting brands with AI creators.

Analyze the user's natural language campaign concept and extract a structured campaign brief.
Follow these CRITICAL RULES:
1. PRESERVE ORIGINAL INTENT without hallucinating details.
2. DO NOT INVENT BUDGETS OR DEADLINES. If the user did not explicitly state a budget or deadline, set their values to null and note them in "missingInformation".
3. DISTINGUISH EXPLICIT REQUIREMENTS from INFERRED SUGGESTIONS clearly.
4. Output MUST be valid JSON adhering strictly to the schema below.

JSON SCHEMA:
{
  "title": "string (Concise, punchy campaign title)",
  "objective": "string (e.g. Product Launch, Brand Film, Editorial Lookbook, Social Performance)",
  "productOrService": "string (The core product, brand, or service being promoted)",
  "targetAudience": "string (Target demographic & aesthetic sensibility)",
  "creativeDirection": "string (Visual narrative, optical style, mood, lighting)",
  "desiredTone": "string (e.g. Authentic, Warm, Editorial, Luminous, Moody, Kinetic)",
  "deliverables": "string (Explicit or proposed deliverables suite, e.g. 3x 4K Stills, 2x 9:16 Loops)",
  "preferredPlatforms": "string (Platforms specified, e.g. Instagram, TikTok, Digital OOH, YouTube)",
  "requiredCreatorCapabilities": ["string (e.g. Macro fluid physics, 3D spatial renders, 35mm grain)"],
  "budget": "string or null (ONLY if explicitly stated by user, e.g. '$8,000', else null)",
  "deadline": "string or null (ONLY if explicitly stated by user, e.g. '3 weeks', else null)",
  "mandatoryRequirements": ["string (Requirements explicitly specified by brand)"],
  "optionalPreferences": ["string (Preferences inferred to enhance the brief)"],
  "missingInformation": [
    {
      "field": "string (e.g. budget, timeline, deliverableCount)",
      "label": "string",
      "prompt": "string (Helpful guidance for the brand on what to decide)"
    }
  ],
  "clarifyingQuestions": ["string (1-3 targeted questions to refine artistic scope)"]
}`;

  const userMessage = `Natural campaign concept:\n"""${naturalPrompt}"""`;

  const parsed = await callGroqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.1,
    jsonMode: true
  });

  const lowerPrompt = naturalPrompt.toLowerCase();
  const isFlexible = Boolean(
    lowerPrompt.includes('any creator') ||
    lowerPrompt.includes('all creators') ||
    lowerPrompt.includes('open to any') ||
    lowerPrompt.includes('flexible') ||
    lowerPrompt.includes('no preference')
  );

  const formatText = parsed.contentFormats || parsed.deliverables || '';
  const hasExplicitFormat = !isFlexible && Boolean(
    lowerPrompt.includes('reel') || lowerPrompt.includes('short-form') || lowerPrompt.includes('vertical') ||
    lowerPrompt.includes('loop') || lowerPrompt.includes('9:16') || lowerPrompt.includes('film') ||
    lowerPrompt.includes('cinema') || lowerPrompt.includes('video') || lowerPrompt.includes('commercial') ||
    lowerPrompt.includes('still') || lowerPrompt.includes('photo') || lowerPrompt.includes('render') ||
    lowerPrompt.includes('3d') || lowerPrompt.includes('cgi') || lowerPrompt.includes('motion')
  );

  const rawMandatory = Array.isArray(parsed.mandatoryRequirements) ? parsed.mandatoryRequirements : [];
  const commercialLicensing = rawMandatory.some(r => typeof r === 'string' && (r.toLowerCase().includes('commercial') || r.toLowerCase().includes('license')));
  const rawSkills = Array.isArray(parsed.requiredCreatorCapabilities) ? parsed.requiredCreatorCapabilities : [];

  const requirements = parsed.requirements || {
    mandatory: {
      skills: rawSkills,
      specialization: [],
      tools: [],
      formats: hasExplicitFormat && formatText ? [formatText] : [],
      styles: [],
      commercialLicensing,
      minProjects: 0
    },
    preferred: {
      styles: parsed.creativeStyle ? [parsed.creativeStyle] : [],
      platforms: parsed.preferredPlatforms ? [parsed.preferredPlatforms] : ['Instagram'],
      industries: parsed.industry ? [parsed.industry] : [],
      tone: parsed.desiredTone ? [parsed.desiredTone] : []
    }
  };

  // Server-side validation
  return {
    title: parsed.title || 'Creative Campaign Brief',
    objective: parsed.objective || 'Product Launch',
    productOrService: parsed.productOrService || 'Featured Product',
    industry: parsed.industry || (parsed.productOrService?.toLowerCase().includes('skin') ? 'Beauty & Skincare' : parsed.productOrService?.toLowerCase().includes('chrono') || parsed.productOrService?.toLowerCase().includes('watch') ? 'Consumer Tech & Hardware' : 'General Commercial'),
    targetAudience: parsed.targetAudience || 'Aesthetic-conscious consumers',
    creativeDirection: parsed.creativeDirection || 'Contemporary visual storytelling',
    creativeStyle: parsed.creativeStyle || parsed.creativeDirection || 'Cinematic, Moody, Macro, Industrial Precision',
    desiredTone: parsed.desiredTone || 'Authentic & Editorial',
    contentFormats: parsed.contentFormats || parsed.deliverables || '4K Stills Suite, 9:16 Kinetic Loops',
    deliverables: parsed.deliverables || 'Hero Key Visuals & Loops',
    preferredPlatforms: parsed.preferredPlatforms || 'Instagram, Digital OOH',
    requiredCreatorCapabilities: rawSkills,
    budget: parsed.budget || null,
    deadline: parsed.deadline || null,
    mandatoryRequirements: rawMandatory,
    optionalPreferences: Array.isArray(parsed.optionalPreferences) ? parsed.optionalPreferences : [],
    missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
    clarifyingQuestions: Array.isArray(parsed.clarifyingQuestions) ? parsed.clarifyingQuestions : [],
    isFlexible,
    hasExplicitFormat,
    requirements
  };
}

// =========================================================================
// 2. FEATURE: CREATOR DNA
// Generates grounded representation of creator identity with 3-tier provenance.
// =========================================================================
export async function generateCreatorDNA(creator) {
  if (!creator) throw new Error('INVALID_INPUT: Creator profile is missing.');

  const projects = creator.projects || [];
  const systemPrompt = `You are the Creator DNA Synthesizer on CreaSync.
Analyze an AI creator's profile and verified portfolio projects.
Generate an evidence-grounded profile distinguishing between:
1. Creator-Provided: Stated preferences, bio, tools declared by creator.
2. Portfolio-Supported: Proven facts extracted from verified uploaded projects (aspect ratios, techniques, categories, clients).
3. AI-Inferred: Synthesized creative traits (optical signatures, storytelling rhythms, product presentation style).

RULES:
- DO NOT claim a creator has capabilities not backed by projects or bio.
- If projects array is empty or small, highlight uncertainty and state that evidence is limited.
- Output valid JSON strictly conforming to schema.

JSON SCHEMA:
{
  "creatorId": "string",
  "visualAesthetic": "string (Concise signature aesthetic, e.g. 'Cinematic 35mm with Anamorphic Sun Flares')",
  "storytellingApproach": "string (Narrative pacing and thematic tendencies)",
  "productPresentationStyle": "string (How physical/digital products are staged)",
  "provenance": {
    "creatorProvided": {
      "bio": "string",
      "statedSpecialty": "string",
      "preferredStyles": ["string"],
      "toolsUsed": ["string"]
    },
    "portfolioSupported": {
      "totalVerifiedProjects": "number",
      "demonstratedFormats": ["string"],
      "demonstratedCapabilities": ["string"],
      "verifiedClients": ["string"]
    },
    "aiInferred": {
      "derivedPacing": "string",
      "colorSensitivity": "string",
      "opticalSignature": "string"
    }
  },
  "strengths": ["string (Key demonstrated creative strengths)"],
  "completeness": {
    "tier": "string ('Verified Portfolio' | 'Developing Portfolio' | 'Self-Reported Only')",
    "isVerified": "boolean",
    "notes": "string (Statement on evidence depth and what is needed)"
  }
}`;

  const creatorSummary = {
    id: creator.id,
    name: creator.name,
    specialty: creator.specialty,
    bio: creator.bio,
    styles: creator.styles || [],
    tools: creator.tools || [],
    categoryTags: creator.categoryTags || [],
    projects: projects.map(p => ({
      title: p.title,
      category: p.category,
      clientType: p.clientType,
      creativeDirection: p.creativeDirection,
      capabilities: p.capabilities,
      description: p.description
    }))
  };

  const parsed = await callGroqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Creator data:\n${JSON.stringify(creatorSummary, null, 2)}` }
    ],
    temperature: 0.1,
    jsonMode: true
  });

  return parsed;
}

// =========================================================================
// 3. FEATURE: CREAMATCH & CREASCORE (Semantic Interpretation & Grounded Explanation)
// =========================================================================
export async function evaluateCreaMatchAndScore(campaign, creator) {
  if (!campaign || !creator) throw new Error('INVALID_INPUT: Campaign or creator missing.');

  const projects = creator.projects || [];
  const systemPrompt = `You are CreaMatch & CreaScore on CreaSync.
You evaluate the creative compatibility between a brand's campaign brief and an AI creator's verified profile.
You provide an evidence-based explanation (CreaScore) grounded ONLY in actual facts.

RULES:
- CITE actual projects by title from the creator's portfolio.
- DO NOT invent projects, audience metrics, or awards.
- Explicitly state UNKNOWNS (e.g. if budget or audience data is unavailable, note it as unverified).
- Assess creative style nuance, format fit, and potential gaps honestly.

JSON SCHEMA:
{
  "semanticAlignmentSummary": "string (Why this creator specifically suits the brief)",
  "citedProjects": [
    {
      "title": "string (Exact title of verified project from creator's portfolio)",
      "relevance": "string (Why this project proves capability for the brief)"
    }
  ],
  "requirementsSatisfied": ["string (Requirements confirmed by portfolio evidence)"],
  "identifiedUnknowns": ["string (Unknown parameters, e.g. audience retention, unstated budget)"],
  "potentialCreativeGaps": ["string (Nuances or constraints for the brand to coordinate)"],
  "styleCompatibilityAnalysis": "string (Detailed comparison of campaign tone vs creator's optical signature)"
}`;

  const context = {
    campaign: {
      title: campaign.title,
      objective: campaign.objective,
      industry: campaign.industry,
      creativeStyle: campaign.creativeStyle,
      toneOfVoice: campaign.toneOfVoice,
      deliverables: campaign.deliverables,
      budget: campaign.budget,
      timeline: campaign.timeline
    },
    creator: {
      name: creator.name,
      specialty: creator.specialty,
      bio: creator.bio,
      styles: creator.styles,
      tools: creator.tools,
      projects: projects.map(p => ({
        title: p.title,
        category: p.category,
        clientType: p.clientType,
        creativeDirection: p.creativeDirection,
        description: p.description
      }))
    }
  };

  const parsed = await callGroqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Evaluate match:\n${JSON.stringify(context, null, 2)}` }
    ],
    temperature: 0.1,
    jsonMode: true
  });

  return parsed;
}

// =========================================================================
// 4. FEATURE: CREASIM (Creator-Tailored Campaign Concept Synthesis)
// =========================================================================
export async function generateCreaSimConcepts(campaign, creator, creatorDNA = {}) {
  if (!campaign || !creator) throw new Error('INVALID_INPUT: Campaign or creator missing.');

  const systemPrompt = `You are CreaSim™, an AI creative director synthesizing creator-specific campaign directions on CreaSync.
Generate 3 distinct, high-concept creative directions tailored to BOTH:
1. The brand's campaign brief (objective, product, audience)
2. The creator's signature aesthetic and Creator DNA (tools, lighting, pacing)

CRITICAL RULES:
- The concepts must be tailored to THIS creator's unique style, not generic ideas.
- DO NOT claim these concepts are completed work; they are simulated creative directions.
- Return structured concepts with storyboards, lighting, and palette.

JSON SCHEMA:
{
  "concepts": [
    {
      "id": "string (e.g. 'concept-1')",
      "title": "string (Evocative direction title in quotes)",
      "creativeDirection": "string (Core visual proposition)",
      "openingHook": "string (The first 3 seconds hook)",
      "visualTreatment": "string (Camera, lighting, materials, texture)",
      "connectionToObjective": "string (How this solves the brand's campaign goal)",
      "whyItSuitsCreator": "string (Direct link to creator's documented style/tools)",
      "palette": ["#HEX1", "#HEX2", "#HEX3", "#HEX4"],
      "storyboard": [
        { "scene": "01", "type": "string", "desc": "string" },
        { "scene": "02", "type": "string", "desc": "string" },
        { "scene": "03", "type": "string", "desc": "string" }
      ],
      "suggestedDeliverable": "string"
    }
  ],
  "disclaimer": "Concept Simulation synthesized by CreaSim using verified Creator DNA. Demonstrates creative direction potential, not pre-existing client work."
}`;

  const context = {
    campaign: {
      title: campaign.title,
      product: campaign.product || campaign.industry,
      objective: campaign.objective,
      creativeStyle: campaign.creativeStyle,
      deliverables: campaign.deliverables
    },
    creator: {
      name: creator.name,
      specialty: creator.specialty,
      styles: creator.styles,
      visualAesthetic: creatorDNA.visualAesthetic || creator.specialty,
      storytellingApproach: creatorDNA.storytellingApproach || creator.bio,
      pastProjects: (creator.projects || []).slice(0, 3).map(p => p.title)
    }
  };

  const parsed = await callGroqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate concepts:\n${JSON.stringify(context, null, 2)}` }
    ],
    temperature: 0.3,
    jsonMode: true
  });

  return parsed;
}

// =========================================================================
// 5. FEATURE: CAMPAIGN REQUIREMENT INTERPRETER
// Converts natural-language briefs into structured pipeline requirements.
// AI interprets intent; deterministic pipeline code decides eligibility.
// =========================================================================
export async function interpretCampaignRequirements(naturalBrief) {
  if (typeof naturalBrief !== 'string' || !naturalBrief.trim()) {
    throw new Error('INVALID_INPUT: Natural-language campaign brief is empty.');
  }

  const systemPrompt = `
You are CreaSync's campaign requirement interpreter for an AI creator marketplace.

Convert a brand's natural-language campaign brief into structured creator-matching requirements.

Return valid JSON with exactly these fields:
{
  "title": "string",
  "industry": "string",
  "budget": "string or null",
  "timeline": "string or null",
  "mandatory": {
    "skills": ["string"],
    "specialization": ["string"],
    "tools": ["string"],
    "formats": ["string"],
    "styles": ["string"],
    "commercialLicensing": false,
    "minProjects": 0
  },
  "preferred": {
    "styles": ["string"],
    "platforms": ["string"],
    "industries": ["string"],
    "tone": ["string"]
  },
  "interpretationNotes": ["string"],
  "clarifyingQuestions": ["string"]
}

Critical Rules:
1. Put a requirement under mandatory ONLY when the brand explicitly requires it or clearly makes it a hard condition of the campaign (e.g. "requiring", "must have", "mandatory", "need creators who can produce vertical video").
2. Words such as "preferably", "prefer", "ideally", "would be nice", "bonus", or "experience with X is a plus" indicate ranking preferences. Always place them under preferred.
3. Visual and creative styles (e.g. "cinematic", "editorial", "luxury", "surreal", "minimal") belong under preferred.styles for compatibility ranking, NOT mandatory, unless explicitly demanded with hard constraint words like "must strictly be" or "mandatory style".
4. Deliverable formats or aspect ratios (e.g. "vertical video", "9:16", "4K stills", "loops", "3D render") belong under formats, NOT specialization. Never put aspect ratios or format terms under specialization.
5. Do NOT infer commercial licensing from the mere fact that a campaign is commercial, promotes a product, or represents a brand. Set commercialLicensing to true ONLY when the brief explicitly specifies commercial usage rights, commercial licensing, or commercial license required.
6. Do not invent tools, skills, qualifications, budget, or deadlines. Set budget and timeline to null unless explicitly stated with figures or timeframes in the brief.
7. Set minProjects to a non-negative integer. Use 0 unless a minimum number of portfolio projects is explicitly required.
8. Use empty arrays for unsupported or unspecified attributes. Keep requirements concise and suitable for deterministic matching against creator profiles.
9. If the brief is ambiguous, record observations in interpretationNotes or questions in clarifyingQuestions instead of guessing or inventing facts.
10. Do not evaluate or invent facts about any creator. Return JSON only.
`;

  const parsed = await callGroqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Campaign brief:\n"""${naturalBrief.trim()}"""` }
    ],
    temperature: 0.1,
    jsonMode: true,
    maxTokens: 1600
  });

  const list = value => {
    if (Array.isArray(value)) {
      return value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return [value.trim()];
    }
    return [];
  };

  const mandatory = parsed.mandatory || parsed.requirements?.mandatory || {};
  const preferred = parsed.preferred || parsed.requirements?.preferred || {};

  let minProjects = 0;
  if (typeof mandatory.minProjects === 'number' && Number.isFinite(mandatory.minProjects)) {
    minProjects = Math.max(0, Math.floor(mandatory.minProjects));
  } else if (typeof mandatory.minProjects === 'string') {
    const parsedNum = parseInt(mandatory.minProjects, 10);
    if (!isNaN(parsedNum) && parsedNum >= 0) minProjects = parsedNum;
  }

  const commercialLicensing = mandatory.commercialLicensing === true || mandatory.commercialLicensing === 'true';

  const budget = typeof parsed.budget === 'string' && parsed.budget.trim() && !['null', 'none', 'undefined', 'n/a'].includes(parsed.budget.trim().toLowerCase())
    ? parsed.budget.trim()
    : null;

  const timeline = typeof parsed.timeline === 'string' && parsed.timeline.trim() && !['null', 'none', 'undefined', 'n/a'].includes(parsed.timeline.trim().toLowerCase())
    ? parsed.timeline.trim()
    : null;

  // Safeguard: Separate format/aspect terms from specialization if LLM miscategorized
  const rawMandatorySpec = list(mandatory.specialization);
  const isFormatTerm = term => {
    const t = term.toLowerCase();
    return t.includes('9:16') || t.includes('vertical') || t.includes('horizontal') || t.includes('aspect') || t.includes('format') || t.includes('loop') || t.includes('still');
  };
  const cleanMandatorySpec = rawMandatorySpec.filter(s => !isFormatTerm(s));
  const formatFromSpec = rawMandatorySpec.filter(s => isFormatTerm(s));
  const combinedMandatoryFormats = Array.from(new Set([...list(mandatory.formats), ...formatFromSpec]));

  return {
    title: typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim()
      : 'Campaign Brief',
    industry: typeof parsed.industry === 'string' && parsed.industry.trim()
      ? parsed.industry.trim()
      : 'General Commercial',
    budget,
    timeline,
    requirements: {
      mandatory: {
        skills: list(mandatory.skills),
        specialization: cleanMandatorySpec,
        tools: list(mandatory.tools),
        formats: combinedMandatoryFormats,
        styles: list(mandatory.styles),
        commercialLicensing,
        minProjects
      },
      preferred: {
        styles: list(preferred.styles),
        platforms: list(preferred.platforms),
        industries: list(preferred.industries),
        tone: list(preferred.tone)
      }
    },
    interpretationNotes: list(parsed.interpretationNotes || parsed.notes),
    clarifyingQuestions: list(parsed.clarifyingQuestions || parsed.questions)
  };
}

// =========================================================================
// 5. FEATURE: ALLOY AI REAL-TIME STREAMING CHAT
// True Groq-powered token streaming with role adaptation & grounded context
// =========================================================================
export function buildAlloySystemPrompt({ role = 'brand', context = {} }) {
  const roleDirective = role === 'creator'
    ? `You are guiding a CREATOR on Alloy.
Primary Roadmaps you orchestrate:
1. Setting up verified creator profile, bio, and handles.
2. Completing portfolio with authenticated format evidence (9:16 vertical video, 3D spatial renders, 4K stills).
3. Discovering open published campaigns and filtering by creative fit.
4. Understanding campaign eligibility classifications (Eligible, Ineligible reasons, and Needs Review format guidance).
5. Reviewing CreaMatch composite scores (Style Fit, Tool Proficiency, Reliability).
6. Preparing, pricing, and submitting competitive bids with clear deliverable timelines.
7. Milestone escrow, revision protocols, copyright licensing terms, and payout tracking.`
    : `You are guiding a BRAND PARTNER or CREATIVE DIRECTOR on Alloy.
Primary Roadmaps you orchestrate:
1. Defining campaign objectives, creative direction, and technical specs.
2. Structuring briefs with mandatory vs optional parameters for Stage 1 normalization.
3. Discovering creators through the 7-stage autonomous filtering pipeline.
4. Comparing candidates using verified portfolio evidence and CreaMatch scores.
5. Simulating concept execution with CreaSim before contract commitment.
6. Evaluating creator trust, portfolio provenance, and dispute protection via Trust Orbit.
7. Finalizing milestone contracts and funding safe Razorpay escrow.
8. Managing deliverable review and milestone approval workflows.`;

  const contextStr = context && Object.keys(context).length > 0
    ? `\nCURRENT ACTIVE WORKSPACE CONTEXT:\n${JSON.stringify(context, null, 2)}\n`
    : '';

  return `You are ALLOY AI, the intelligent roadmap guide, strategist, and execution concierge of ALLOY (AI Creator Marketplace).
Your responsibility is to turn users' goals into clear, practical, sequential, and achievable action plans.

${roleDirective}
${contextStr}
CORE MARKETPLACE ARCHITECTURE YOU GOVERN:
1. THE 7-STAGE FILTERING PIPELINE:
   - Stage 1: Brief Ingestion & Normalization (extracts explicit hard constraints vs optional aesthetic preferences).
   - Stage 2: Format & Tool Evidence (verifies past commercial deliverable evidence like 9:16 vertical video or 3D spatial renders).
   - Stage 3: Specialization Alignment (validates primary creative disciplines before secondary crafts).
   - Stage 4: Budget Boundary & Leeway Analysis (enforces non-negotiable budget bounds while identifying negotiable rate leeway).
   - Stage 5: Slot Capacity & Quota Protection (guards against oversubscribed campaigns).
   - Stage 6: Shortlist Protection (creators shortlisted by a brand are protected from contradictory downstream hold rejections).
   - Stage 7: CreaMatch Scoring (composite score calculated from Style Fit, Tool Proficiency, and Historical Reliability).

2. ELIGIBILITY OUTCOMES:
   - ELIGIBLE: Creator satisfies all mandatory requirements and is within negotiable budget bounds.
   - INELIGIBLE: Confirmed failure on an explicit mandatory requirement (with clear, transparent explanation).
   - NEEDS REVIEW (REQUIRES_REVIEW): Unrecorded format evidence history or currency mismatch that needs manual brand review rather than arbitrary rejection.

3. CREASIM & CREATIVE SIMULATION:
   - Pre-production concept narrative generation simulating how a creator's DNA will execute a brand's brief before contract commitment.

4. TRUST ORBIT & VERIFICATION:
   - Cryptographic portfolio provenance to prevent stolen or fabricated portfolio claims.
   - Milestone escrow with Razorpay integration — funds held safely and released only upon deliverable approval.
   - Multi-tenant data isolation and copyright licensing clarity.

RESPONSE ARCHITECTURE & PHILOSOPHY:
Every response must help the user understand:
1. Where they are currently.
2. What they need to achieve.
3. What steps they should follow.
4. What they need to do at each step.
5. What outcome they should expect.
6. What action they should take next.

ADAPTIVE FORMATTING RULES:
- ALWAYS GIVE ANSWERS IN STEPS. Never output large unbroken text paragraphs or essays.
- IF A ROADMAP IS REQUIRED (for campaigns, bidding, portfolio verification, multi-phase goals, or troubleshooting):
  -> Provide the full structured **ACTION ROADMAP** (Goal, Starting Point, Roadmap steps, Dependencies, Next Action).
- IF A ROADMAP IS NOT REQUIRED (for simple questions, facts, definitions, quick how-to, or explanations):
  -> DO NOT write text paragraphs. Answer directly in **concise numbered steps** (1, 2, 3...) with clear, simple takeaways.

STANDARD ROADMAP SPECIFICATION (When creating a roadmap):
### Goal: [Clear heading describing what the user wants to achieve]

#### Starting Point
[1-2 sentences explaining current situation, available information, and any important missing details]

#### Roadmap
1. **[Step Title]**
   - **What to do:** [1-2 sentences describing the specific task]
   - **Why it matters:** [Why this step is critical for success in Alloy's pipeline/matching]
   - **Action checklist:**
     - [ ] [Concrete micro-action]
     - [ ] [Concrete micro-action]
   - **Expected outcome:** [Measurable outcome or deliverable]
   - **Alloy Feature:** [Relevant feature: Brand Workspace, Brief Builder, Discover Creators, Creator Profile, Trust Center, or Escrow]
   - **Status:** Not started

2. **[Step Title]**
   ... (repeat for remaining sequential steps)

#### Dependencies
[Briefly explain which steps depend on earlier steps]

#### Next Action
[Exactly ONE clear, concrete action the user can take immediately to begin]

COMMUNICATION PRINCIPLES:
- Use simple, everyday layman language. Keep answers crisp, clear, and easy to understand.
- Avoid heavy technical jargon, buzzwords, or dense walls of text.
- Be direct and concise: explain steps and concepts in simple plain English.
- Avoid vague motivational advice. Give practical, easy-to-follow actions.
- Never invent non-existent platform functionality, false creator scores, fake transaction IDs, or fabricated platform metrics.
- Never claim an action was completed when recommending it.
- Reference real platform creators (Maya Sharma, Julian Vance, Ananya Roy, Zephyr Studio) or active campaigns (Veda Botanics, Midnight Amber, Solstice Audio) when relevant.`;
}

export async function streamAlloyAiChat({
  messages = [],
  role = 'brand',
  context = {},
  signal,
  onChunk,
  onReasoning,
  onDone,
  onError
}) {
  if (!isGroqConfigured()) {
    throw new Error('GROQ_CONFIG_MISSING: GROQ_API_KEY environment variable is not configured.');
  }

  const apiKey = process.env.GROQ_API_KEY.trim();
  const model = getGroqModel();
  const systemPrompt = buildAlloySystemPrompt({ role, context });

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-10).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text || m.content || ''
    }))
  ];

  const body = {
    model,
    messages: formattedMessages,
    temperature: 0.5,
    max_tokens: 2048,
    stream: true
  };

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    let errorMessage = `Groq API responded with status ${response.status}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error?.message) errorMessage = parsed.error.message;
    } catch {}
    const err = new Error(errorMessage);
    err.status = response.status;
    err.code = response.status === 429 ? 'RATE_LIMIT' : 'GROQ_API_ERROR';
    throw err;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();

        if (dataStr === '[DONE]') {
          if (onDone) onDone();
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta;
          if (delta) {
            if (delta.reasoning && onReasoning) {
              onReasoning(delta.reasoning);
            }
            if (delta.content && onChunk) {
              onChunk(delta.content);
            }
          }
        } catch {
          // Continue parsing buffer
        }
      }
    }

    if (onDone) onDone();
  } catch (streamErr) {
    if (signal?.aborted) return;
    if (onError) onError(streamErr);
    else throw streamErr;
  }
}

