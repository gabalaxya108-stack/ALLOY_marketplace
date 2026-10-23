// src/intelligence/eligibilityEngine.js
// Deterministic, explainable Creator Eligibility Engine for hybrid marketplace matching.
// Evaluates mandatory campaign requirements independently with 3 explicit outcomes:
// PASS, FAIL, or UNKNOWN.
//
// Decision Policy:
// - Any confirmed mandatory FAIL => INELIGIBLE
// - No FAIL and >= 1 UNKNOWN => REQUIRES_REVIEW
// - All applicable mandatory requirements PASS => ELIGIBLE
// Suitability scores and ranking must NEVER override a mandatory failure.

/**
 * Three explicit requirement evaluation outcomes.
 * Missing or ambiguous information is never coerced into PASS or FAIL.
 */
export const ELIGIBILITY_OUTCOMES = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  UNKNOWN: 'UNKNOWN'
});

/**
 * Overall creator eligibility decision states.
 */
export const ELIGIBILITY_STATUS = Object.freeze({
  ELIGIBLE: 'ELIGIBLE',
  INELIGIBLE: 'INELIGIBLE',
  REQUIRES_REVIEW: 'REQUIRES_REVIEW'
});

/**
 * Normalizes string tokens for deterministic comparison.
 */
export function normalizeToken(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/[-_]/g, ' ');
}

/**
 * Normalizes an array or delimited string of tokens into a flat array of clean tokens.
 */
export function normalizeTokenArray(input) {
  if (!input) return [];
  if (typeof input === 'string') {
    return input
      .split(/[,|/]/)
      .map(normalizeToken)
      .filter(Boolean);
  }
  if (Array.isArray(input)) {
    return input
      .map(item => (typeof item === 'string' ? normalizeToken(item) : ''))
      .filter(Boolean);
  }
  return [];
}

/**
 * Extracts raw trimmed non-empty string items preserving original casing.
 */
export function toRawArray(input) {
  if (!input) return [];
  if (typeof input === 'string') {
    return input
      .split(/[,|/]/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(input)) {
    return input
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  return [];
}

/**
 * Known capability clusters where equivalent terminology denotes the same underlying skill.
 */
const SKILL_EQUIVALENCE_CLUSTERS = [
  new Set([
    'video production',
    'ai video',
    'ai video production',
    'video generation',
    'ai video generation',
    'generative video',
    'video creation',
    'motion video'
  ]),
  new Set([
    'photography',
    'ai photography',
    'ai photo',
    'photorealistic stills',
    'stills creation',
    'editorial photography'
  ]),
  new Set([
    '3d modeling',
    '3d cgi',
    'spatial 3d',
    '3d render',
    'spatial renders',
    'cgi simulation'
  ])
];

/**
 * Checks if a candidate skill token satisfies a required skill token.
 * Prevents generic skills (e.g. "video") from falsely satisfying specialized requirements (e.g. "3D CGI product video").
 */
export function isSkillCompatible(reqSkill, creatorSkill) {
  if (!reqSkill || !creatorSkill) return false;
  const normReq = normalizeToken(reqSkill);
  const normSkill = normalizeToken(creatorSkill);

  // 1. Exact token match
  if (normSkill === normReq) return true;

  // 2. Explicit synonym equivalence clusters
  for (const cluster of SKILL_EQUIVALENCE_CLUSTERS) {
    if (cluster.has(normReq) && cluster.has(normSkill)) {
      return true;
    }
  }

  // 3. Constrained directional containment:
  // Creator's demonstrated skill is a qualified phrase containing the required skill as a complete word/phrase
  // (e.g. creator skill "cinematic visual storytelling" satisfies required "visual storytelling").
  // Reverse containment (normReq.includes(normSkill)) is removed so generic "video" cannot satisfy specialized "3d cgi product video".
  if (normSkill.includes(normReq)) {
    const escaped = normReq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`);
    if (regex.test(normSkill)) {
      return true;
    }
  }

  return false;
}

/**
 * Parses numeric monetary values and currency from budget/rate strings or objects.
 * Handles single amounts ("$8,000", 8000), ranges ("$5,000 – $10,000"), and currency markers.
 * Does not guess a currency when genuinely unspecified.
 */
export function parseMonetaryValue(val, fallbackCurrency = null) {
  if (val === null || val === undefined) return null;

  if (typeof val === 'number') {
    return isNaN(val) ? null : { min: val, max: val, target: val, currency: fallbackCurrency || null };
  }

  if (typeof val === 'object') {
    const min = typeof val.min === 'number' ? val.min : (typeof val.amount === 'number' ? val.amount : null);
    const max = typeof val.max === 'number' ? val.max : (typeof val.amount === 'number' ? val.amount : null);
    const target = typeof val.target === 'number' ? val.target : (max ?? min);
    const currency = val.currency || fallbackCurrency || null;
    if (min === null && max === null) return null;
    return { min: min ?? max, max: max ?? min, target: target ?? max ?? min, currency };
  }

  if (typeof val === 'string') {
    const cleaned = val.trim();
    if (!cleaned || cleaned.toLowerCase() === 'in discussion' || cleaned.toLowerCase() === 'open' || cleaned.toLowerCase() === 'flexible') {
      return null;
    }

    // Detect explicit currency symbol or standard 3-letter code
    let currency = null;
    if (cleaned.includes('₹') || cleaned.toUpperCase().includes('INR')) currency = 'INR';
    else if (cleaned.includes('€') || cleaned.toUpperCase().includes('EUR')) currency = 'EUR';
    else if (cleaned.includes('£') || cleaned.toUpperCase().includes('GBP')) currency = 'GBP';
    else if (cleaned.includes('$') || cleaned.toUpperCase().includes('USD')) currency = 'USD';
    else if (fallbackCurrency) currency = fallbackCurrency;

    // Extract all numeric groups (supporting commas e.g. 5,000 or 10000)
    const matches = cleaned.match(/[\d,]+(\.\d+)?/g);
    if (!matches || matches.length === 0) return null;

    const nums = matches
      .map(m => parseFloat(m.replace(/,/g, '')))
      .filter(n => !isNaN(n));

    if (nums.length === 0) return null;

    if (nums.length === 1) {
      return { min: nums[0], max: nums[0], target: nums[0], currency };
    }

    // Range like "$5,000 – $10,000"
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return { min, max, target: max, currency };
  }

  return null;
}

/**
 * Formats a monetary number into a clean currency string.
 */
export function formatCurrency(amount, currency = 'USD') {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Unspecified';
  const symbol = currency === 'INR' ? '₹' : (currency === 'EUR' ? '€' : (currency === 'GBP' ? '£' : '$'));
  return `${symbol}${amount.toLocaleString('en-US')}`;
}

// ============================================================================
// INDIVIDUAL MANDATORY REQUIREMENT EVALUATORS
// Each evaluator returns:
// {
//   requirement: string,
//   status: 'PASS' | 'FAIL' | 'UNKNOWN',
//   reason: string,
//   evidence: { expected, actual, ... }
// }
// ============================================================================

/**
 * Evaluates mandatory creator capabilities / technical skills.
 */
export function evaluateCapabilitiesRequirement(requiredSkills, creator) {
  const rawList = toRawArray(requiredSkills);
  if (rawList.length === 0) return null;

  // Check if creator has recorded skills data
  const hasCaps = Array.isArray(creator?.capabilities);
  const hasTech = Array.isArray(creator?.technicalSkills);
  const hasCreative = Array.isArray(creator?.creativeSkills);
  const hasProjects = Array.isArray(creator?.projects) && creator.projects.length > 0;

  if (!creator || (!hasCaps && !hasTech && !hasCreative && !hasProjects && !creator.specialty)) {
    return {
      requirement: 'capabilities',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: 'Creator has no recorded skills, capabilities, or portfolio data to evaluate against required skills.',
      evidence: {
        expected: rawList,
        actual: null
      }
    };
  }

  const creatorCaps = normalizeTokenArray(creator.capabilities);
  const creatorSkills = normalizeTokenArray(creator.skills);
  const creatorTech = normalizeTokenArray(creator.technicalSkills);
  const creatorCreative = normalizeTokenArray(creator.creativeSkills);
  const creatorTags = normalizeTokenArray(creator.categoryTags);
  const projectCaps = (creator.projects || []).flatMap(p => normalizeTokenArray(p.capabilities));
  const specialtyToken = normalizeToken(creator.specialty);

  const combined = new Set([
    ...creatorCaps,
    ...creatorSkills,
    ...creatorTech,
    ...creatorCreative,
    ...creatorTags,
    ...projectCaps,
    specialtyToken
  ]);

  const missing = [];
  const matched = [];

  for (const rawReq of rawList) {
    const isMatch = Array.from(combined).some(skill => isSkillCompatible(rawReq, skill));
    if (isMatch) {
      matched.push(rawReq);
    } else {
      missing.push(rawReq);
    }
  }

  if (missing.length === 0) {
    return {
      requirement: 'capabilities',
      status: ELIGIBILITY_OUTCOMES.PASS,
      reason: `All required skills satisfied (${rawList.join(', ')}).`,
      evidence: {
        expected: rawList,
        actual: matched
      }
    };
  }

  return {
    requirement: 'capabilities',
    status: ELIGIBILITY_OUTCOMES.FAIL,
    reason: `Missing required mandatory skill(s): ${missing.join(', ')}. Demonstrated skills: ${Array.from(combined).slice(0, 4).join(', ') || 'None recorded'}.`,
    evidence: {
      expected: rawList,
      actual: Array.from(combined),
      missing
    }
  };
}

/**
 * Evaluates mandatory specialization domain.
 */
export function evaluateSpecializationRequirement(requiredSpecialization, creator) {
  const rawList = toRawArray(requiredSpecialization);
  if (rawList.length === 0) return null;

  const specialtyRaw = creator?.specialty;
  const specialty = normalizeToken(specialtyRaw);
  const creativeIdentity = normalizeToken(creator?.creativeIdentity);
  const categoryTags = normalizeTokenArray(creator?.categoryTags);
  const capabilities = normalizeTokenArray(creator?.capabilities);

  const hasSpecialty = specialty && specialty !== 'unspecified' && specialty !== 'unknown';
  const hasSpecEvidence = Boolean(
    hasSpecialty ||
    creativeIdentity ||
    categoryTags.length > 0 ||
    capabilities.length > 0
  );

  if (!creator || !hasSpecEvidence) {
    return {
      requirement: 'specialization',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: 'Creator specialty and category information is missing from profile.',
      evidence: {
        expected: rawList,
        actual: null
      }
    };
  }

  const isMatch = rawList.some(rawSpec => {
    const spec = normalizeToken(rawSpec);
    return (hasSpecialty && (specialty.includes(spec) || spec.includes(specialty))) ||
           (creativeIdentity && (creativeIdentity.includes(spec) || spec.includes(creativeIdentity))) ||
           categoryTags.some(t => t.includes(spec) || spec.includes(t)) ||
           capabilities.some(c => c.includes(spec) || spec.includes(c));
  });

  if (isMatch) {
    return {
      requirement: 'specialization',
      status: ELIGIBILITY_OUTCOMES.PASS,
      reason: `Creator specialty (${creator.specialty || creator.creativeIdentity || capabilities[0]}) matches required specialization (${rawList.join(' or ')}).`,
      evidence: {
        expected: rawList,
        actual: creator.specialty || creator.creativeIdentity || categoryTags
      }
    };
  }

  return {
    requirement: 'specialization',
    status: ELIGIBILITY_OUTCOMES.FAIL,
    reason: `Creator specialty (${creator.specialty || 'Unspecified'}) does not match required specialization (${rawList.join(' or ')}).`,
    evidence: {
      expected: rawList,
      actual: creator.specialty || categoryTags,
      missing: rawList
    }
  };
}

/**
 * Evaluates mandatory AI tools / toolchain requirements.
 */
export function evaluateToolsRequirement(requiredTools, creator) {
  const rawList = toRawArray(requiredTools);
  if (rawList.length === 0) return null;

  const projects = Array.isArray(creator?.projects) && creator.projects.length > 0
    ? creator.projects
    : (Array.isArray(creator?.portfolio_projects) && creator.portfolio_projects.length > 0
      ? creator.portfolio_projects
      : (Array.isArray(creator?.portfolio) ? creator.portfolio : []));

  const hasTools = Array.isArray(creator?.tools) && creator.tools.length > 0;
  const hasProjectTools = projects.some(p => Boolean(p.tools && (Array.isArray(p.tools) ? p.tools.length > 0 : String(p.tools).trim() !== '')));

  if (!creator || (!hasTools && !hasProjectTools)) {
    return {
      requirement: 'tools',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: 'Creator toolchain information is missing from profile records.',
      evidence: {
        expected: rawList,
        actual: null
      }
    };
  }

  const creatorTools = normalizeTokenArray(creator.tools);
  const projectTools = projects.flatMap(p => normalizeTokenArray(toRawArray(p.tools)));
  const combinedTools = new Set([...creatorTools, ...projectTools]);

  const missing = [];
  const matched = [];

  for (const rawReq of rawList) {
    const req = normalizeToken(rawReq);
    const isMatch = Array.from(combinedTools).some(t => t.includes(req) || req.includes(t));
    if (isMatch) {
      matched.push(rawReq);
    } else {
      missing.push(rawReq);
    }
  }

  if (missing.length === 0) {
    return {
      requirement: 'tools',
      status: ELIGIBILITY_OUTCOMES.PASS,
      reason: `Required AI tool(s) verified in creator toolchain (${rawList.join(', ')}).`,
      evidence: {
        expected: rawList,
        actual: matched
      }
    };
  }

  return {
    requirement: 'tools',
    status: ELIGIBILITY_OUTCOMES.FAIL,
    reason: `Lacks verified production experience in requested tool(s): ${missing.join(', ')}. Verified tools: ${(creator.tools || []).join(', ') || 'None recorded'}.`,
    evidence: {
      expected: rawList,
      actual: Array.from(combinedTools),
      missing
    }
  };
}

/**
 * Detects whether a format token explicitly specifies vertical, portrait, or 9:16 aspect ratio.
 */
export function isVerticalFormatToken(token) {
  if (!token || typeof token !== 'string') return false;
  const t = normalizeToken(token);
  return t.includes('9:16') ||
         t.includes('9 16') ||
         t.includes('9/16') ||
         t.includes('vertical') ||
         t.includes('portrait');
}

/**
 * Checks if creator data contains explicit portrait/vertical/aspect-ratio evidence.
 * A generic "video" or "social" tag is strictly insufficient and will not pass.
 */
export function hasExplicitVerticalEvidence(creator) {
  if (!creator) return false;

  // 1. Portfolio project-level aspect, format, or project-specific capabilities
  const projects = Array.isArray(creator.projects) ? creator.projects : [];
  const hasProjectAspect = projects.some(p => {
    return isVerticalFormatToken(p.aspect) ||
           isVerticalFormatToken(p.format) ||
           (Array.isArray(p.capabilities) && p.capabilities.some(isVerticalFormatToken));
  });
  if (hasProjectAspect) return true;

  // 2. Explicit top-level creator capabilities specifying vertical/portrait
  const creatorCaps = normalizeTokenArray(creator.capabilities);
  if (creatorCaps.some(isVerticalFormatToken)) return true;

  // 3. Explicit category tags specifying vertical/portrait (not generic video or social)
  const creatorTags = normalizeTokenArray(creator.categoryTags);
  if (creatorTags.some(isVerticalFormatToken)) return true;

  return false;
}

/**
 * Evaluates mandatory deliverable format / content type requirements.
 */
export function evaluateFormatsRequirement(requiredFormats, creator) {
  const rawList = toRawArray(requiredFormats);
  if (rawList.length === 0) return null;

  const projects = Array.isArray(creator?.projects) && creator.projects.length > 0
    ? creator.projects
    : (Array.isArray(creator?.portfolio_projects) && creator.portfolio_projects.length > 0
      ? creator.portfolio_projects
      : (Array.isArray(creator?.portfolio) ? creator.portfolio : []));

  const creatorTags = normalizeTokenArray(creator?.categoryTags);
  const creatorCaps = normalizeTokenArray(creator?.capabilities);
  const creatorSpecialty = normalizeToken(creator?.specialty);
  const projectFormats = projects.map(p => normalizeToken(p.format || p.aspect || p.category));

  const hasSpecialty = creatorSpecialty && creatorSpecialty !== 'unspecified' && creatorSpecialty !== 'unknown';
  const hasFormatEvidence = Boolean(
    hasSpecialty ||
    creatorTags.length > 0 ||
    creatorCaps.length > 0 ||
    projectFormats.length > 0
  );

  if (!creator || !hasFormatEvidence) {
    return {
      requirement: 'formats',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: 'Creator deliverable format history is not available.',
      evidence: {
        expected: rawList,
        actual: null
      }
    };
  }

  const missing = [];
  const matched = [];
  const insufficientEvidence = [];

  for (const rawReq of rawList) {
    const reqFormat = normalizeToken(rawReq);
    let isSupported = false;

    if (isVerticalFormatToken(reqFormat)) {
      if (hasExplicitVerticalEvidence(creator)) {
        isSupported = true;
      } else {
        insufficientEvidence.push(rawReq);
        continue;
      }
    } else if (reqFormat.includes('video') || reqFormat.includes('motion') || reqFormat.includes('loop') || reqFormat.includes('reel') || reqFormat.includes('film') || reqFormat.includes('cinema')) {
      isSupported = creatorTags.some(t => t.includes('video') || t.includes('motion') || t.includes('film') || t.includes('cinema')) ||
                    (hasSpecialty && (creatorSpecialty.includes('video') || creatorSpecialty.includes('motion') || creatorSpecialty.includes('film') || creatorSpecialty.includes('cinema'))) ||
                    creatorCaps.some(c => c.includes('video') || c.includes('motion') || c.includes('film') || c.includes('cinema')) ||
                    projectFormats.some(f => f.includes('video') || f.includes('motion') || f.includes('film') || f.includes('cinema'));
    } else if (reqFormat.includes('still') || reqFormat.includes('photo') || reqFormat.includes('key art')) {
      isSupported = creatorTags.some(t => t.includes('photo') || t.includes('product')) ||
                    (hasSpecialty && (creatorSpecialty.includes('photo') || creatorSpecialty.includes('product'))) ||
                    creatorCaps.some(c => c.includes('photo') || c.includes('still')) ||
                    projectFormats.some(f => f.includes('photo') || f.includes('still') || f.includes('portrait') || f.includes('landscape'));
    } else if (reqFormat.includes('3d') || reqFormat.includes('spatial') || reqFormat.includes('cgi') || reqFormat.includes('render')) {
      isSupported = creatorTags.some(t => t.includes('3d')) ||
                    (hasSpecialty && creatorSpecialty.includes('3d')) ||
                    creatorCaps.some(c => c.includes('3d')) ||
                    projectFormats.some(f => f.includes('3d') || f.includes('render'));
    } else {
      isSupported = creatorTags.some(t => t.includes(reqFormat)) ||
                    creatorCaps.some(c => c.includes(reqFormat)) ||
                    projectFormats.some(f => f.includes(reqFormat));
    }

    if (isSupported) {
      matched.push(rawReq);
    } else {
      missing.push(rawReq);
    }
  }

  if (missing.length > 0) {
    return {
      requirement: 'formats',
      status: ELIGIBILITY_OUTCOMES.FAIL,
      reason: `Deliverable format requirement not satisfied: ${missing.join(', ')}. Creator specializes in ${creator.specialty || 'other formats'}.`,
      evidence: {
        expected: rawList,
        actual: { specialty: creator.specialty, tags: creator.categoryTags, projects: projectFormats },
        missing
      }
    };
  }

  if (insufficientEvidence.length > 0) {
    return {
      requirement: 'formats',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: `Insufficient aspect-ratio or deliverable format evidence to verify support for: ${insufficientEvidence.join(', ')}. Portfolio contains no explicit portrait or vertical aspect records.`,
      evidence: {
        expected: rawList,
        actual: { specialty: creator.specialty, tags: creator.categoryTags, projects: projectFormats },
        insufficient: insufficientEvidence
      }
    };
  }

  return {
    requirement: 'formats',
    status: ELIGIBILITY_OUTCOMES.PASS,
    reason: `Creator supports required deliverable format(s): ${rawList.join(', ')}.`,
    evidence: {
      expected: rawList,
      actual: matched
    }
  };
}

/**
 * Evaluates mandatory aesthetic style requirements.
 * Evaluates both creator profile styles and project-level creativeStyle evidence
 * with project attribution, preserving project isolation.
 */
export function evaluateStylesRequirement(requiredStyles, creator) {
  const rawList = toRawArray(requiredStyles);
  if (rawList.length === 0) return null;

  const profileStyles = Array.isArray(creator?.styles) ? creator.styles : [];
  const projects = Array.isArray(creator?.projects) && creator.projects.length > 0
    ? creator.projects
    : (Array.isArray(creator?.portfolio_projects) && creator.portfolio_projects.length > 0
      ? creator.portfolio_projects
      : (Array.isArray(creator?.portfolio) ? creator.portfolio : []));

  // Harvest project-level style evidence attributable to originating projects
  const projectStyleEntries = [];
  projects.forEach(p => {
    if (!p) return;
    const rawStyle = p.creativeStyle || p.creative_style || p.style;
    const stylesFromP = [];
    if (typeof rawStyle === 'string' && rawStyle.trim()) {
      stylesFromP.push(...rawStyle.split(/[,|/]/).map(s => s.trim()).filter(Boolean));
    } else if (Array.isArray(p.styles)) {
      stylesFromP.push(...p.styles.filter(s => typeof s === 'string' && s.trim()));
    }
    if (stylesFromP.length > 0) {
      projectStyleEntries.push({
        projectId: p.id,
        projectTitle: p.title || 'Portfolio Work',
        styles: stylesFromP
      });
    }
  });

  const hasProfileStyles = profileStyles.length > 0;
  const hasProjectStyles = projectStyleEntries.length > 0;

  // If no style metadata exists on profile or projects, return UNKNOWN (requires review)
  if (!creator || (!hasProfileStyles && !hasProjectStyles)) {
    return {
      requirement: 'styles',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: 'Creator aesthetic styles are not recorded in profile or portfolio projects; aesthetic alignment cannot be determined.',
      evidence: {
        expected: rawList,
        actual: null,
        projectEvidence: []
      }
    };
  }

  const missing = [];
  const matched = [];
  const allMatchedProjects = [];

  for (const rawReq of rawList) {
    const req = normalizeToken(rawReq);

    // 1. Profile-level match check
    const profileMatch = profileStyles.find(s => {
      const norm = normalizeToken(s);
      return norm.includes(req) || req.includes(norm);
    });

    // 2. Project-level attributable evidence check
    const matchedProjectsForReq = [];
    projectStyleEntries.forEach(pe => {
      pe.styles.forEach(s => {
        const norm = normalizeToken(s);
        if (norm.includes(req) || req.includes(norm)) {
          const entry = {
            projectId: pe.projectId,
            projectTitle: pe.projectTitle,
            style: s
          };
          matchedProjectsForReq.push(entry);
          if (!allMatchedProjects.some(amp => amp.projectId === entry.projectId && amp.style === entry.style)) {
            allMatchedProjects.push(entry);
          }
        }
      });
    });

    if (profileMatch || matchedProjectsForReq.length > 0) {
      matched.push({
        requirement: rawReq,
        profileMatch: profileMatch || null,
        projectEvidence: matchedProjectsForReq
      });
    } else {
      missing.push(rawReq);
    }
  }

  if (missing.length === 0) {
    const hasProjectProof = allMatchedProjects.length > 0;
    const hasProfileProof = matched.some(m => m.profileMatch);
    let reasonText = `Creator aesthetic style aligns with required style(s): ${rawList.join(', ')}.`;

    if (hasProjectProof && hasProfileProof) {
      reasonText = `Creator aesthetic style aligns with required style(s): ${rawList.join(', ')} (supported by profile and portfolio project evidence: ${allMatchedProjects.map(p => `"${p.projectTitle}" [${p.style}]`).join(', ')}).`;
    } else if (hasProjectProof) {
      reasonText = `Creator aesthetic style aligns with required style(s): ${rawList.join(', ')} (supported by portfolio project evidence from: ${allMatchedProjects.map(p => `"${p.projectTitle}" [${p.style}]`).join(', ')}).`;
    }

    return {
      requirement: 'styles',
      status: ELIGIBILITY_OUTCOMES.PASS,
      reason: reasonText,
      evidence: {
        expected: rawList,
        actual: matched.map(m => m.requirement),
        matchedDetails: matched,
        matchedProjects: allMatchedProjects,
        projectEvidence: allMatchedProjects,
        source: hasProjectProof ? (hasProfileProof ? 'hybrid_profile_and_project' : 'portfolio_project') : 'creator_profile'
      }
    };
  }

  const allRecordedStyles = [...profileStyles, ...projectStyleEntries.flatMap(pe => pe.styles)];
  return {
    requirement: 'styles',
    status: ELIGIBILITY_OUTCOMES.FAIL,
    reason: `Creator styles (${allRecordedStyles.join(', ') || 'recorded'}) do not include required style(s): ${missing.join(', ')}.`,
    evidence: {
      expected: rawList,
      actual: profileStyles,
      projectStyles: projectStyleEntries,
      missing
    }
  };
}

/**
 * Evaluates mandatory industry experience requirements.
 */
export function evaluateIndustriesRequirement(requiredIndustries, creator) {
  const rawList = toRawArray(requiredIndustries);
  if (rawList.length === 0) return null;

  const hasIndustries = Array.isArray(creator?.industries);
  const hasProjects = Array.isArray(creator?.projects) && creator.projects.some(p => p.clientType);

  if (!creator || (!hasIndustries && !hasProjects)) {
    return {
      requirement: 'industries',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: 'Creator industry experience is not recorded in profile.',
      evidence: {
        expected: rawList,
        actual: null
      }
    };
  }

  const creatorIndustries = normalizeTokenArray(creator.industries);
  const projectClientTypes = (creator.projects || []).map(p => normalizeToken(p.clientType)).filter(Boolean);
  const combinedIndustries = new Set([...creatorIndustries, ...projectClientTypes]);

  const missing = [];
  const matched = [];

  for (const rawReq of rawList) {
    const req = normalizeToken(rawReq);
    const isMatch = Array.from(combinedIndustries).some(ind => ind.includes(req) || req.includes(ind));
    if (isMatch) {
      matched.push(rawReq);
    } else {
      missing.push(rawReq);
    }
  }

  if (missing.length === 0) {
    return {
      requirement: 'industries',
      status: ELIGIBILITY_OUTCOMES.PASS,
      reason: `Creator has demonstrated experience in required industry (${rawList.join(', ')}).`,
      evidence: {
        expected: rawList,
        actual: matched
      }
    };
  }

  return {
    requirement: 'industries',
    status: ELIGIBILITY_OUTCOMES.FAIL,
    reason: `Creator lacks demonstrated experience in required industry (${missing.join(', ')}). Recorded industries: ${(creator.industries || []).join(', ') || 'None'}.`,
    evidence: {
      expected: rawList,
      actual: Array.from(combinedIndustries),
      missing
    }
  };
}

/**
 * Evaluates mandatory availability conditions.
 */
export function evaluateAvailabilityRequirement(requiredAvailability, creator) {
  if (!requiredAvailability) return null;
  const normReq = normalizeToken(typeof requiredAvailability === 'string' ? requiredAvailability : requiredAvailability.status);
  if (!normReq) return null;

  if (!creator || creator.availability === undefined) {
    return {
      requirement: 'availability',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: 'Creator availability status is missing or unrecorded in profile.',
      evidence: {
        expected: requiredAvailability,
        actual: null
      }
    };
  }

  const normAvail = normalizeToken(creator.availability);
  if (!normAvail) {
    return {
      requirement: 'availability',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: 'Creator availability field is empty; active availability cannot be determined.',
      evidence: {
        expected: requiredAvailability,
        actual: ''
      }
    };
  }

  // Exact or semantic availability match
  const isAvailableNow = normAvail.includes('available');
  const reqRequiresImmediate = normReq.includes('available') || normReq.includes('immediate');

  let passes = false;
  if (normAvail === normReq || normAvail.includes(normReq) || normReq.includes(normAvail)) {
    passes = true;
  } else if (reqRequiresImmediate && isAvailableNow) {
    passes = true;
  }

  if (passes) {
    return {
      requirement: 'availability',
      status: ELIGIBILITY_OUTCOMES.PASS,
      reason: `Creator availability (${creator.availability}) satisfies mandatory campaign availability (${typeof requiredAvailability === 'string' ? requiredAvailability : JSON.stringify(requiredAvailability)}).`,
      evidence: {
        expected: requiredAvailability,
        actual: creator.availability
      }
    };
  }

  return {
    requirement: 'availability',
    status: ELIGIBILITY_OUTCOMES.FAIL,
    reason: `Creator availability (${creator.availability}) does not satisfy mandatory requirement (${typeof requiredAvailability === 'string' ? requiredAvailability : JSON.stringify(requiredAvailability)}).`,
    evidence: {
      expected: requiredAvailability,
      actual: creator.availability
    }
  };
}

/**
 * Evaluates mandatory commercial licensing verification.
 */
export function evaluateCommercialLicensingRequirement(requiresLicense, creator) {
  if (!requiresLicense) return null;

  if (!creator) {
    return {
      requirement: 'commercialLicensing',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: 'Creator profile is missing; commercial licensing status cannot be determined.',
      evidence: { expected: true, actual: null }
    };
  }

  const isVerified = Boolean(
    creator.trustVerification?.commercialLicensingEligible ||
    creator.commercialLicensingVerified ||
    creator.trustVerification?.licensing?.status === 'verified' ||
    creator.commercialUseVerified === true
  );

  const isExplicitlyUnavailable = Boolean(
    creator.trustVerification?.commercialLicensingEligible === false ||
    creator.commercialLicensingVerified === false ||
    creator.trustVerification?.licensing?.status === 'unable_to_verify' ||
    creator.commercialUseVerified === false
  );

  if (isVerified) {
    return {
      requirement: 'commercialLicensing',
      status: ELIGIBILITY_OUTCOMES.PASS,
      reason: 'Commercial licensing credentials are confirmed verified in creator trust records.',
      evidence: { expected: true, actual: true }
    };
  }

  if (isExplicitlyUnavailable) {
    return {
      requirement: 'commercialLicensing',
      status: ELIGIBILITY_OUTCOMES.FAIL,
      reason: 'Enterprise commercial-use licensing credentials are confirmed unavailable in creator trust records.',
      evidence: { expected: true, actual: false }
    };
  }

  return {
    requirement: 'commercialLicensing',
    status: ELIGIBILITY_OUTCOMES.UNKNOWN,
    reason: 'Formal enterprise commercial-use licensing credentials are not verified in available creator records.',
    evidence: { expected: true, actual: null }
  };
}

/**
 * Evaluates mandatory minimum portfolio project threshold.
 */
export function evaluatePortfolioThresholdRequirement(minProjects, creator) {
  const threshold = typeof minProjects === 'number' ? minProjects : 0;
  if (threshold <= 0) return null;

  const projects = Array.isArray(creator?.projects)
    ? creator.projects
    : (Array.isArray(creator?.portfolio_projects)
      ? creator.portfolio_projects
      : (Array.isArray(creator?.portfolio) ? creator.portfolio : null));

  if (!creator || !Array.isArray(projects)) {
    return {
      requirement: 'minProjects',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: 'Creator portfolio project records are unverified or missing.',
      evidence: { expected: threshold, actual: null }
    };
  }

  const count = projects.length;
  if (count >= threshold) {
    return {
      requirement: 'minProjects',
      status: ELIGIBILITY_OUTCOMES.PASS,
      reason: `Creator portfolio contains ${count} verified project(s), satisfying required minimum of ${threshold}.`,
      evidence: { expected: threshold, actual: count }
    };
  }

  return {
    requirement: 'minProjects',
    status: ELIGIBILITY_OUTCOMES.FAIL,
    reason: `Requires at least ${threshold} verified portfolio project(s); found ${count}.`,
    evidence: { expected: threshold, actual: count }
  };
}

/**
 * Evaluates budget compatibility respecting negotiable vs. non-negotiable terms.
 *
 * Rules:
 * - Missing rate or budget => UNKNOWN (never infer affordability)
 * - Non-negotiable budget exceeded by creator rate => FAIL
 * - Negotiable budget exceeded => PASS with negotiation needed and exact delta disclosed (does not fail eligibility)
 * - Rate <= budget => PASS
 * - Exact budget boundary => PASS
 * - If negotiability cannot be distinguished from campaign schema, do not guess a default => UNKNOWN if exceeded.
 */
export function evaluateBudgetRequirement(budgetRequirement, creator, campaign = {}) {
  if (budgetRequirement === undefined && campaign.budget === undefined && campaign.budgetRequirement === undefined) {
    return null;
  }

  // Resolve raw budget from requirement configuration or campaign
  const rawBudget = (typeof budgetRequirement === 'object' && budgetRequirement !== null)
    ? (budgetRequirement.amount ?? budgetRequirement.budget ?? budgetRequirement.max ?? campaign.budget)
    : (budgetRequirement !== undefined && budgetRequirement !== null ? budgetRequirement : campaign.budget);

  // Fallback / explicit currency on requirement / campaign / creator
  const budgetCurrency = (typeof budgetRequirement === 'object' && budgetRequirement !== null && budgetRequirement.currency)
    ? budgetRequirement.currency
    : (campaign?.currency || null);
  const creatorCurrency = creator?.currency || null;

  // Resolve creator rate from creator record (rate, startingRate, minimumRate, dayRate, pricing)
  const rawRate = creator?.rate ??
                  creator?.startingRate ??
                  creator?.minimumRate ??
                  creator?.dayRate ??
                  creator?.pricing;

  const parsedBudget = parseMonetaryValue(rawBudget, budgetCurrency);
  const parsedRate = parseMonetaryValue(rawRate, creatorCurrency);

  // Rule: Missing creator rate or campaign budget => UNKNOWN
  if (!parsedBudget || !parsedRate) {
    const missingWhat = !parsedBudget && !parsedRate
      ? 'Both campaign budget and creator rate are missing'
      : (!parsedBudget ? 'Campaign budget is not specified or unparseable' : 'Creator rate is not specified in profile');

    return {
      requirement: 'budget',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      reason: `${missingWhat}; affordability compatibility cannot be determined without inferring rates.`,
      evidence: {
        expected: rawBudget ?? null,
        actual: rawRate ?? null
      }
    };
  }

  // Rule: Cross-currency comparison
  // If both rate and budget currencies are known and differ, return UNKNOWN without comparing raw numeric amounts or reporting a misleading difference.
  if (parsedBudget.currency && parsedRate.currency && parsedBudget.currency !== parsedRate.currency) {
    return {
      requirement: 'budget',
      status: ELIGIBILITY_OUTCOMES.UNKNOWN,
      negotiationNeeded: null,
      difference: null,
      reason: `Cross-currency budget comparison between campaign budget (${parsedBudget.currency}) and creator rate (${parsedRate.currency}) requires explicit currency conversion; raw numeric values cannot be compared directly.`,
      evidence: {
        expected: formatCurrency(parsedBudget.max, parsedBudget.currency),
        actual: formatCurrency(parsedRate.min, parsedRate.currency),
        budgetCurrency: parsedBudget.currency,
        rateCurrency: parsedRate.currency,
        currencyMismatch: true
      }
    };
  }

  // Resolve negotiability
  let isNegotiable = undefined;
  if (typeof budgetRequirement === 'object' && budgetRequirement !== null) {
    if (typeof budgetRequirement.isNegotiable === 'boolean') isNegotiable = budgetRequirement.isNegotiable;
    else if (typeof budgetRequirement.negotiable === 'boolean') isNegotiable = budgetRequirement.negotiable;
  }
  if (isNegotiable === undefined) {
    if (typeof campaign.isNegotiable === 'boolean') isNegotiable = campaign.isNegotiable;
    else if (typeof campaign.negotiable === 'boolean') isNegotiable = campaign.negotiable;
    else if (typeof campaign.budgetNegotiable === 'boolean') isNegotiable = campaign.budgetNegotiable;
  }

  // Textual hints on brief or budget string
  if (isNegotiable === undefined) {
    const textToCheck = `${campaign.budgetType || ''} ${typeof rawBudget === 'string' ? rawBudget : ''}`.toLowerCase();
    if (textToCheck.includes('non-negotiable') || textToCheck.includes('firm') || textToCheck.includes('fixed')) {
      isNegotiable = false;
    } else if (textToCheck.includes('negotiable') || textToCheck.includes('flexible') || textToCheck.includes('in discussion')) {
      isNegotiable = true;
    }
  }

  const budgetCeiling = parsedBudget.max;
  const creatorAmount = parsedRate.min; // Most favorable demonstrated rate
  const currency = parsedBudget.currency || parsedRate.currency || 'USD';

  // Rule: Exact budget boundary or rate within budget
  if (creatorAmount <= budgetCeiling) {
    const isExactBoundary = creatorAmount === budgetCeiling;
    return {
      requirement: 'budget',
      status: ELIGIBILITY_OUTCOMES.PASS,
      negotiationNeeded: false,
      difference: 0,
      reason: isExactBoundary
        ? `Creator rate (${formatCurrency(creatorAmount, currency)}) meets the exact campaign budget boundary (${formatCurrency(budgetCeiling, currency)}).`
        : `Creator rate (${formatCurrency(creatorAmount, currency)}) is within the campaign budget (${formatCurrency(budgetCeiling, currency)}).`,
      evidence: {
        expected: formatCurrency(budgetCeiling, currency),
        actual: formatCurrency(creatorAmount, currency),
        isNegotiable: isNegotiable ?? 'unspecified'
      }
    };
  }

  // Creator rate exceeds budget ceiling
  const delta = creatorAmount - budgetCeiling;

  // Case A: Non-negotiable budget exceeded => FAIL
  if (isNegotiable === false) {
    return {
      requirement: 'budget',
      status: ELIGIBILITY_OUTCOMES.FAIL,
      negotiationNeeded: false,
      difference: delta,
      reason: `Creator rate (${formatCurrency(creatorAmount, currency)}) exceeds non-negotiable campaign budget (${formatCurrency(budgetCeiling, currency)}) by ${formatCurrency(delta, currency)}.`,
      evidence: {
        expected: formatCurrency(budgetCeiling, currency),
        actual: formatCurrency(creatorAmount, currency),
        difference: delta,
        formattedDifference: `+${formatCurrency(delta, currency)}`,
        isNegotiable: false
      }
    };
  }

  // Case B: Negotiable budget exceeded => Does NOT fail eligibility. Discloses negotiation needed and difference.
  if (isNegotiable === true) {
    return {
      requirement: 'budget',
      status: ELIGIBILITY_OUTCOMES.PASS,
      negotiationNeeded: true,
      difference: delta,
      formattedDifference: `+${formatCurrency(delta, currency)}`,
      reason: `Creator rate (${formatCurrency(creatorAmount, currency)}) exceeds target budget (${formatCurrency(budgetCeiling, currency)}) by ${formatCurrency(delta, currency)}. Budget is negotiable; negotiation is needed.`,
      evidence: {
        expected: formatCurrency(budgetCeiling, currency),
        actual: formatCurrency(creatorAmount, currency),
        difference: delta,
        formattedDifference: `+${formatCurrency(delta, currency)}`,
        isNegotiable: true,
        negotiationNeeded: true
      }
    };
  }

  // Case C: Schema cannot distinguish negotiable from non-negotiable.
  // Rule: Do not invent a default; report schema limitation.
  return {
    requirement: 'budget',
    status: ELIGIBILITY_OUTCOMES.UNKNOWN,
    negotiationNeeded: null,
    difference: delta,
    formattedDifference: `+${formatCurrency(delta, currency)}`,
    reason: `Creator rate (${formatCurrency(creatorAmount, currency)}) exceeds budget ceiling (${formatCurrency(budgetCeiling, currency)}) by ${formatCurrency(delta, currency)}, but campaign schema does not specify whether budget is negotiable or firm; compatibility cannot be established without guessing negotiability policy.`,
    evidence: {
      expected: formatCurrency(budgetCeiling, currency),
      actual: formatCurrency(creatorAmount, currency),
      difference: delta,
      formattedDifference: `+${formatCurrency(delta, currency)}`,
      isNegotiable: undefined,
      schemaLimitation: 'Budget negotiability is unspecified in campaign data model.'
    }
  };
}

// ============================================================================
// MAIN ELIGIBILITY ENGINE ENTRY POINT
// ============================================================================

/**
 * Evaluates a single creator against mandatory campaign requirements.
 * Pure function with explicit inputs and outputs.
 *
 * @param {Object} campaign - Campaign brief or requirement specification
 * @param {Object} creator - Creator candidate profile
 * @returns {Object} Structured eligibility result
 */
export function evaluateCreatorEligibility(campaign = {}, creator = {}) {
  const brief = campaign || {};
  const cand = creator || {};
  const hasMandatoryConfig = Boolean(brief.requirements && 'mandatory' in brief.requirements);
  const rawMandatory = brief.requirements?.mandatory || {};

  // Extract explicit mandatory constraints from brief
  const mandatorySpecs = {
    skills: rawMandatory.skills ?? rawMandatory.capabilities ?? brief.requiredSkills ?? brief.mandatorySkills,
    specialization: rawMandatory.specialization ?? (hasMandatoryConfig ? undefined : brief.desiredCreatorSpecialties) ?? brief.mandatorySpecialization,
    tools: rawMandatory.tools ?? brief.requiredTools ?? brief.mandatoryTools,
    formats: rawMandatory.formats ?? rawMandatory.contentFormats ?? (hasMandatoryConfig ? undefined : brief.contentFormats) ?? brief.mandatoryFormats,
    styles: rawMandatory.styles ?? rawMandatory.creativeStyle ?? (hasMandatoryConfig ? undefined : brief.creativeStyle) ?? brief.mandatoryStyles,
    industries: rawMandatory.industries ?? rawMandatory.industry ?? (hasMandatoryConfig ? undefined : brief.industry) ?? brief.mandatoryIndustries,
    availability: rawMandatory.availability ?? brief.requiredAvailability ?? brief.availabilityCondition,
    commercialLicensing: rawMandatory.commercialLicensing ?? brief.requiresCommercialLicense ?? brief.requiresCommercialLicensing,
    minProjects: rawMandatory.minProjects ?? (hasMandatoryConfig ? undefined : brief.minProjects),
    budget: ('budget' in rawMandatory)
      ? rawMandatory.budget
      : (brief.budgetRequirement ?? (hasMandatoryConfig ? undefined : (brief.budget !== undefined ? { budget: brief.budget, isNegotiable: brief.isNegotiable ?? brief.negotiable } : undefined)))
  };

  const evaluatedRequirements = [];

  // 1. Capabilities / Skills
  if (mandatorySpecs.skills !== undefined && mandatorySpecs.skills !== null) {
    const res = evaluateCapabilitiesRequirement(mandatorySpecs.skills, cand);
    if (res) evaluatedRequirements.push(res);
  }

  // 2. Specialization
  if (mandatorySpecs.specialization !== undefined && mandatorySpecs.specialization !== null) {
    const res = evaluateSpecializationRequirement(mandatorySpecs.specialization, cand);
    if (res) evaluatedRequirements.push(res);
  }

  // 3. Tools
  if (mandatorySpecs.tools !== undefined && mandatorySpecs.tools !== null) {
    const res = evaluateToolsRequirement(mandatorySpecs.tools, cand);
    if (res) evaluatedRequirements.push(res);
  }

  // 4. Formats
  if (mandatorySpecs.formats !== undefined && mandatorySpecs.formats !== null) {
    const res = evaluateFormatsRequirement(mandatorySpecs.formats, cand);
    if (res) evaluatedRequirements.push(res);
  }

  // 5. Styles
  if (mandatorySpecs.styles !== undefined && mandatorySpecs.styles !== null) {
    const res = evaluateStylesRequirement(mandatorySpecs.styles, cand);
    if (res) evaluatedRequirements.push(res);
  }

  // 6. Industries
  if (mandatorySpecs.industries !== undefined && mandatorySpecs.industries !== null) {
    const res = evaluateIndustriesRequirement(mandatorySpecs.industries, cand);
    if (res) evaluatedRequirements.push(res);
  }

  // 7. Availability
  if (mandatorySpecs.availability !== undefined && mandatorySpecs.availability !== null) {
    const res = evaluateAvailabilityRequirement(mandatorySpecs.availability, cand);
    if (res) evaluatedRequirements.push(res);
  }

  // 8. Commercial Licensing
  if (mandatorySpecs.commercialLicensing !== undefined && mandatorySpecs.commercialLicensing !== null) {
    const res = evaluateCommercialLicensingRequirement(mandatorySpecs.commercialLicensing, cand);
    if (res) evaluatedRequirements.push(res);
  }

  // 9. Portfolio Projects
  if (mandatorySpecs.minProjects !== undefined && mandatorySpecs.minProjects !== null) {
    const res = evaluatePortfolioThresholdRequirement(mandatorySpecs.minProjects, cand);
    if (res) evaluatedRequirements.push(res);
  }

  // 10. Budget
  if (mandatorySpecs.budget !== undefined) {
    const res = evaluateBudgetRequirement(mandatorySpecs.budget, cand, brief);
    if (res) evaluatedRequirements.push(res);
  }

  // When no mandatory requirements are specified
  if (evaluatedRequirements.length === 0) {
    return {
      eligibility: ELIGIBILITY_STATUS.ELIGIBLE,
      creatorId: cand.id || 'unidentified-creator',
      creatorName: cand.name || 'Anonymous Creator',
      campaignId: brief.id || 'unspecified-campaign',
      requiresNegotiation: false,
      requirements: [],
      reasons: ['No explicit mandatory requirements configured; candidate meets base eligibility.'],
      summary: {
        totalEvaluated: 0,
        passed: 0,
        failed: 0,
        unknown: 0
      }
    };
  }

  // ==========================================================================
  // DECISION POLICY:
  // - Any confirmed mandatory FAIL => INELIGIBLE
  // - No FAIL and >= 1 UNKNOWN => REQUIRES_REVIEW
  // - All applicable mandatory requirements PASS => ELIGIBLE
  // ==========================================================================
  const failures = evaluatedRequirements.filter(r => r.status === ELIGIBILITY_OUTCOMES.FAIL);
  const unknowns = evaluatedRequirements.filter(r => r.status === ELIGIBILITY_OUTCOMES.UNKNOWN);
  const passes = evaluatedRequirements.filter(r => r.status === ELIGIBILITY_OUTCOMES.PASS);

  let eligibility;
  if (failures.length > 0) {
    eligibility = ELIGIBILITY_STATUS.INELIGIBLE;
  } else if (unknowns.length > 0) {
    eligibility = ELIGIBILITY_STATUS.REQUIRES_REVIEW;
  } else {
    eligibility = ELIGIBILITY_STATUS.ELIGIBLE;
  }

  const requiresNegotiation = evaluatedRequirements.some(r => Boolean(r.negotiationNeeded));
  const reasons = evaluatedRequirements.map(r => r.reason);

  return {
    eligibility,
    creatorId: cand.id || 'unidentified-creator',
    creatorName: cand.name || 'Anonymous Creator',
    campaignId: brief.id || 'unspecified-campaign',
    requiresNegotiation,
    requirements: evaluatedRequirements,
    reasons,
    summary: {
      totalEvaluated: evaluatedRequirements.length,
      passed: passes.length,
      failed: failures.length,
      unknown: unknowns.length
    }
  };
}

/**
 * Batch evaluates candidate creators against a campaign's mandatory requirements.
 *
 * @param {Object} campaign
 * @param {Array<Object>} creators
 * @returns {Array<Object>} Array of eligibility results
 */
export function evaluateCreatorsEligibility(campaign = {}, creators = []) {
  if (!Array.isArray(creators)) return [];
  return creators.map(c => evaluateCreatorEligibility(campaign, c));
}
