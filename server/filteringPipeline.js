// server/filteringPipeline.js
// Deterministic, explainable Campaign-to-Creator Filtering & Ranking Pipeline
// Executes on the server environment to enforce hard eligibility criteria before ranking.

import { CREATORS } from '../src/data/creatorsData.js';
import { calculateCreaMatch } from '../src/intelligence/matchingEngine.js';
import { explainMatch } from '../src/intelligence/matchExplainer.js';
import {
  evaluateCreatorEligibility,
  ELIGIBILITY_STATUS,
  ELIGIBILITY_OUTCOMES,
  isSkillCompatible,
  hasExplicitVerticalEvidence
} from '../src/intelligence/eligibilityEngine.js';

/**
 * Human-readable failed requirement dictionary
 */
export const READABLE_EXCLUSION_TITLES = {
  COMMERCIAL_LICENSING_UNVERIFIED: 'Commercial licensing not verified',
  PORTFOLIO_THRESHOLD_UNMET: 'Portfolio evidence below required threshold',
  MISSING_MANDATORY_SKILLS: 'Required mandatory skills missing',
  SPECIALIZATION_MISMATCH: 'Specialization mismatch',
  TOOL_CHAIN_INCOMPATIBLE: 'Required AI tools/models not in verified toolchain',
  FORMAT_UNSUPPORTED: 'Deliverable format unsupported',
  BUDGET_EXCEEDED: 'Rate exceeds campaign budget'
};

export function formatExclusionLabel(code) {
  if (!code) return 'Requirement not satisfied';
  if (READABLE_EXCLUSION_TITLES[code]) return READABLE_EXCLUSION_TITLES[code];
  return code.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Normalizes string tokens for robust, deterministic matching
 */
function normalizeToken(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().trim().replace(/[-_]/g, ' ');
}

/**
 * Normalizes an array of tokens
 */
function normalizeTokenArray(arr) {
  if (!arr) return [];
  if (typeof arr === 'string') {
    return arr.split(/[,|/]/).map(normalizeToken).filter(Boolean);
  }
  if (Array.isArray(arr)) {
    return arr.map(normalizeToken).filter(Boolean);
  }
  return [];
}

/**
 * Extracts and normalizes campaign requirements into distinct mandatory constraints and preferred signals
 */
export function normalizeCampaignBrief(campaign = {}) {
  const brief = campaign || {};
  const rawRequirements = brief.requirements || {};
  const hasMandatoryConfig = Boolean(brief.requirements && 'mandatory' in brief.requirements);
  const rawMandatory = rawRequirements.mandatory || {};

  // Extract explicit mandatory constraints
  const rawMandatorySpec = normalizeTokenArray(
    rawMandatory.specialization ?? (hasMandatoryConfig ? [] : (rawRequirements.specialization || brief.desiredCreatorSpecialties || brief.specialty))
  );
  const isFormatTerm = term => term.includes('9:16') || term.includes('vertical') || term.includes('horizontal') || term.includes('format') || term.includes('deliverable') || term.includes('still');
  const specialization = rawMandatorySpec.filter(s => !isFormatTerm(s));
  const formatFromSpec = rawMandatorySpec.filter(s => isFormatTerm(s));

  const rawFormats = normalizeTokenArray(
    rawMandatory.formats ?? rawMandatory.contentFormats ?? (hasMandatoryConfig ? [] : (rawRequirements.formats || brief.contentFormats || brief.deliverables))
  );
  const formats = Array.from(new Set([...rawFormats, ...formatFromSpec]));

  const mandatory = {
    skills: normalizeTokenArray(rawMandatory.skills ?? (hasMandatoryConfig ? [] : (rawRequirements.skills || brief.requiredSkills))),
    specialization,
    tools: normalizeTokenArray(rawMandatory.tools ?? (hasMandatoryConfig ? [] : (rawRequirements.tools || brief.requiredTools))),
    formats,
    styles: normalizeTokenArray(rawMandatory.styles ?? rawMandatory.creativeStyle ?? (hasMandatoryConfig ? [] : (rawRequirements.styles || brief.creativeStyle))),
    commercialLicensing: Boolean(rawMandatory.commercialLicensing ?? (hasMandatoryConfig ? false : (rawRequirements.commercialLicensing ?? brief.requiresCommercialLicense))),
    minProjects: typeof (rawMandatory.minProjects ?? (hasMandatoryConfig ? 0 : rawRequirements.minProjects)) === 'number'
      ? (rawMandatory.minProjects ?? (hasMandatoryConfig ? 0 : rawRequirements.minProjects))
      : (hasMandatoryConfig ? 0 : (brief.requiresVerifiedPortfolio ? 1 : 0))
  };

  // If explicit mandatory was empty, extract keywords intelligently from brief fields as preferences unless explicitly flagged
  const preferred = {
    styles: normalizeTokenArray(rawRequirements.preferred?.styles || brief.creativeStyle || brief.styles),
    platforms: normalizeTokenArray(rawRequirements.preferred?.platforms || brief.platforms),
    industries: normalizeTokenArray(rawRequirements.preferred?.industries || brief.industry),
    tone: normalizeTokenArray(rawRequirements.preferred?.tone || brief.toneOfVoice)
  };

  // Normalized query summary representation
  return {
    campaignId: brief.id || `camp-${Date.now()}`,
    title: brief.title || 'Untitled Campaign',
    industry: brief.industry || 'General',
    budget: brief.budget || 'Open / Flexible',
    timeline: brief.timeline || 'Flexible',
    mandatory,
    preferred,
    rawBrief: brief
  };
}

/**
 * STAGE 1: Brief Validation & Requirements Normalization
 */
function stageBriefNormalization(normalizedBrief, candidatePool) {
  const stageId = 'stage_01_brief_normalization';
  const stageName = 'Brief Validation & Requirement Extraction';
  const description = 'Validate campaign parameters and extract mandatory constraints vs. preferred signals.';

  const mandatoryCount = Object.values(normalizedBrief.mandatory).reduce((acc, val) => {
    if (Array.isArray(val)) return acc + val.length;
    if (typeof val === 'boolean' && val) return acc + 1;
    if (typeof val === 'number' && val > 0) return acc + 1;
    return acc;
  }, 0);

  const warnings = [];
  if (mandatoryCount === 0) {
    warnings.push({
      code: 'NO_MANDATORY_CONSTRAINTS',
      message: 'Brief specifies no strict mandatory constraints; all candidate creators will pass to subsequent compatibility evaluation.'
    });
  }

  return {
    stageId,
    stageName,
    description,
    inputCount: candidatePool.length,
    passedCount: candidatePool.length,
    rejectedCount: 0,
    unknownCount: 0,
    rejections: [],
    warnings,
    passedCandidates: candidatePool,
    extractedMandatory: normalizedBrief.mandatory,
    extractedPreferred: normalizedBrief.preferred
  };
}

/**
 * STAGE 2: Mandatory Skills & Technical Capabilities Filter
 */
function stageSkillsFilter(mandatorySkills, candidatePool) {
  const stageId = 'stage_02_skills_filter';
  const stageName = 'Mandatory Skills & Capabilities Verification';
  const description = 'Verify creator profile and portfolio demonstrate required core skills and capabilities.';

  if (!mandatorySkills || mandatorySkills.length === 0) {
    return {
      stageId,
      stageName,
      description,
      inputCount: candidatePool.length,
      passedCount: candidatePool.length,
      rejectedCount: 0,
      unknownCount: 0,
      rejections: [],
      passedCandidates: candidatePool,
      bypassed: true
    };
  }

  const passedCandidates = [];
  const rejections = [];
  let unknownCount = 0;

  for (const creator of candidatePool) {
    const creatorCaps = normalizeTokenArray(creator.capabilities);
    const creatorTags = normalizeTokenArray(creator.categoryTags);
    const projectCaps = (creator.projects || []).flatMap(p => normalizeTokenArray(p.capabilities));
    const combinedSkills = new Set([...creatorCaps, ...creatorTags, ...projectCaps, normalizeToken(creator.specialty)]);

    const missingSkills = [];
    for (const reqSkill of mandatorySkills) {
      const isMatch = Array.from(combinedSkills).some(skill =>
        isSkillCompatible(reqSkill, skill)
      );
      if (!isMatch) {
        missingSkills.push(reqSkill);
      }
    }

    if (missingSkills.length === 0) {
      passedCandidates.push(creator);
    } else {
      if (!creator.capabilities || creator.capabilities.length === 0) {
        unknownCount++;
      }
      rejections.push({
        creatorId: creator.id,
        creatorName: creator.name,
        stage: stageId,
        code: 'MISSING_MANDATORY_SKILLS',
        reason: `Missing required mandatory skill(s): ${missingSkills.join(', ')}. Demonstrated skills: ${(creator.capabilities || []).slice(0, 3).join(', ') || 'None recorded'}.`,
        missingFields: missingSkills,
        availableData: creator.capabilities || [],
        requiredFields: mandatorySkills
      });
    }
  }

  return {
    stageId,
    stageName,
    description,
    inputCount: candidatePool.length,
    passedCount: passedCandidates.length,
    rejectedCount: rejections.length,
    unknownCount,
    rejections,
    passedCandidates,
    requiredSkills: mandatorySkills
  };
}

/**
 * STAGE 3: Specialization & Domain Category Filter
 */
function stageSpecializationFilter(mandatorySpecialization, candidatePool) {
  const stageId = 'stage_03_specialization_filter';
  const stageName = 'Specialization & Primary Domain Fit';
  const description = 'Confirm creator primary specialty or category domain matches campaign requirements.';

  if (!mandatorySpecialization || mandatorySpecialization.length === 0) {
    return {
      stageId,
      stageName,
      description,
      inputCount: candidatePool.length,
      passedCount: candidatePool.length,
      rejectedCount: 0,
      unknownCount: 0,
      rejections: [],
      passedCandidates: candidatePool,
      bypassed: true
    };
  }

  const passedCandidates = [];
  const rejections = [];
  let unknownCount = 0;

  for (const creator of candidatePool) {
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

    if (!hasSpecEvidence) {
      unknownCount++;
      continue;
    }

    const hasSpecMatch = mandatorySpecialization.some(spec => {
      return (hasSpecialty && (specialty.includes(spec) || spec.includes(specialty))) ||
             (creativeIdentity && (creativeIdentity.includes(spec) || spec.includes(creativeIdentity))) ||
             categoryTags.some(t => t.includes(spec) || spec.includes(t)) ||
             capabilities.some(c => c.includes(spec) || spec.includes(c));
    });

    if (hasSpecMatch) {
      passedCandidates.push(creator);
    } else {
      rejections.push({
        creatorId: creator.id,
        creatorName: creator.name,
        stage: stageId,
        code: 'SPECIALIZATION_MISMATCH',
        reason: `Creator specialty (${creator.specialty || 'Unspecified'}) does not match required specialization (${mandatorySpecialization.join(' or ')}).`,
        missingFields: mandatorySpecialization,
        availableData: { specialty: creator.specialty, tags: creator.categoryTags, capabilities: creator.capabilities },
        requiredFields: mandatorySpecialization
      });
    }
  }

  return {
    stageId,
    stageName,
    description,
    inputCount: candidatePool.length,
    passedCount: passedCandidates.length,
    rejectedCount: rejections.length,
    unknownCount,
    rejections,
    passedCandidates,
    requiredSpecialization: mandatorySpecialization
  };
}

/**
 * STAGE 4: AI Tools & Model Generation Pipeline Compatibility Filter
 */
function stageAiToolsFilter(mandatoryTools, candidatePool) {
  const stageId = 'stage_04_ai_tools_filter';
  const stageName = 'AI Tools & Generation Pipeline Alignment';
  const description = 'Ensure creator actively operates with the specific AI toolchains or models requested.';

  if (!mandatoryTools || mandatoryTools.length === 0) {
    return {
      stageId,
      stageName,
      description,
      inputCount: candidatePool.length,
      passedCount: candidatePool.length,
      rejectedCount: 0,
      unknownCount: 0,
      rejections: [],
      passedCandidates: candidatePool,
      bypassed: true
    };
  }

  const passedCandidates = [];
  const rejections = [];
  let unknownCount = 0;

  for (const creator of candidatePool) {
    const creatorTools = normalizeTokenArray(creator.tools);
    const projectTools = (creator.projects || []).flatMap(p => normalizeTokenArray(p.tools));
    const combinedTools = new Set([...creatorTools, ...projectTools]);

    const missingTools = [];
    for (const reqTool of mandatoryTools) {
      const isMatch = Array.from(combinedTools).some(t =>
        t.includes(reqTool) || reqTool.includes(t)
      );
      if (!isMatch) {
        missingTools.push(reqTool);
      }
    }

    if (missingTools.length === 0) {
      passedCandidates.push(creator);
    } else {
      if (!creator.tools || creator.tools.length === 0) unknownCount++;
      rejections.push({
        creatorId: creator.id,
        creatorName: creator.name,
        stage: stageId,
        code: 'TOOL_CHAIN_INCOMPATIBLE',
        reason: `Lacks verified production experience in requested tool(s): ${missingTools.join(', ')}. Verified tools: ${(creator.tools || []).join(', ') || 'None recorded'}.`,
        missingFields: missingTools,
        availableData: creator.tools || [],
        requiredFields: mandatoryTools
      });
    }
  }

  return {
    stageId,
    stageName,
    description,
    inputCount: candidatePool.length,
    passedCount: passedCandidates.length,
    rejectedCount: rejections.length,
    unknownCount,
    rejections,
    passedCandidates,
    requiredTools: mandatoryTools
  };
}

/**
 * STAGE 5: Content Type & Deliverable Format Filter
 */
function stageFormatFilter(mandatoryFormats, candidatePool) {
  const stageId = 'stage_05_format_filter';
  const stageName = 'Deliverable Format & Content Type Compatibility';
  const description = 'Verify creator produces the required output formats (e.g., 9:16 vertical, 4K stills, cinematic loops, 3D).';

  if (!mandatoryFormats || mandatoryFormats.length === 0) {
    return {
      stageId,
      stageName,
      description,
      inputCount: candidatePool.length,
      passedCount: candidatePool.length,
      rejectedCount: 0,
      unknownCount: 0,
      rejections: [],
      passedCandidates: candidatePool,
      bypassed: true
    };
  }

  const passedCandidates = [];
  const rejections = [];
  let unknownCount = 0;

  for (const creator of candidatePool) {
    const creatorTags = normalizeTokenArray(creator?.categoryTags);
    const creatorCaps = normalizeTokenArray(creator?.capabilities);
    const creatorSpecialty = normalizeToken(creator?.specialty);
    const projects = Array.isArray(creator?.projects) && creator.projects.length > 0
      ? creator.projects
      : (Array.isArray(creator?.portfolio_projects) && creator.portfolio_projects.length > 0
        ? creator.portfolio_projects
        : (Array.isArray(creator?.portfolio) ? creator.portfolio : []));
    const projectFormats = projects.map(p => normalizeToken(p.format || p.aspect || p.category));

    // Inspect actual uploaded media assets for verified format proof
    const hasUploadedVideo = Boolean(
      creator?.videoPreview ||
      (Array.isArray(creator?.portfolioVideos) && creator.portfolioVideos.length > 0) ||
      (Array.isArray(creator?.portfolio_videos) && creator.portfolio_videos.length > 0) ||
      projects.some(p => Boolean(p.video) || (p.media || []).some(m => m.mediaType === 'video' || m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov)(\?.*)?$/i.test(m.url || ''))) ||
      (Array.isArray(creator?.portfolio_media) && creator.portfolio_media.some(m => m.mediaType === 'video' || m.mimeType?.startsWith('video/') || /\.(mp4|webm|mov)(\?.*)?$/i.test(m.url || '')))
    );

    const hasUploadedStill = Boolean(
      creator?.heroWork ||
      (Array.isArray(creator?.portfolioImages) && creator.portfolioImages.length > 0) ||
      (Array.isArray(creator?.portfolio_images) && creator.portfolio_images.length > 0) ||
      projects.some(p => Boolean(p.image) || (p.media || []).some(m => m.mediaType === 'image' || m.mimeType?.startsWith('image/'))) ||
      (Array.isArray(creator?.portfolio_media) && creator.portfolio_media.some(m => m.mediaType === 'image' || m.mimeType?.startsWith('image/')))
    );

    const hasVerticalAspect = Boolean(
      projects.some(p => {
        const aspect = (p.aspect || '').toLowerCase();
        const fmt = (p.format || '').toLowerCase();
        return aspect.includes('9:16') || aspect.includes('portrait') || aspect.includes('vertical') ||
               fmt.includes('9:16') || fmt.includes('portrait') || fmt.includes('vertical') ||
               (p.media || []).some(m => (m.aspect || '').includes('9:16') || (m.aspect || '').includes('portrait'));
      })
    );

    const hasSpecialty = creatorSpecialty && creatorSpecialty !== 'unspecified' && creatorSpecialty !== 'unknown';
    const hasFormatEvidence = Boolean(
      hasSpecialty ||
      creatorTags.length > 0 ||
      creatorCaps.length > 0 ||
      projectFormats.length > 0 ||
      hasUploadedVideo ||
      hasUploadedStill
    );

    if (!hasFormatEvidence) {
      unknownCount++;
      continue;
    }

    // Check capability for video, stills, 3D, motion
    const missingFormats = [];

    for (const rawReq of mandatoryFormats) {
      const reqFormat = normalizeToken(rawReq);
      let isSupported = false;

      if (reqFormat.includes('video') || reqFormat.includes('motion') || reqFormat.includes('loop') || reqFormat.includes('reel') || reqFormat.includes('film') || reqFormat.includes('cinema')) {
        isSupported = hasUploadedVideo ||
                      creatorTags.some(t => t.includes('video') || t.includes('motion') || t.includes('film') || t.includes('cinema')) ||
                      (hasSpecialty && (creatorSpecialty.includes('video') || creatorSpecialty.includes('motion') || creatorSpecialty.includes('film') || creatorSpecialty.includes('cinema'))) ||
                      creatorCaps.some(c => c.includes('video') || c.includes('motion') || c.includes('film') || c.includes('cinema')) ||
                      projectFormats.some(f => f.includes('video') || f.includes('motion') || f.includes('film') || f.includes('cinema'));
      } else if (reqFormat.includes('still') || reqFormat.includes('photo') || reqFormat.includes('key art') || reqFormat.includes('image')) {
        isSupported = hasUploadedStill ||
                      creatorTags.some(t => t.includes('photo') || t.includes('product') || t.includes('image')) ||
                      (hasSpecialty && (creatorSpecialty.includes('photo') || creatorSpecialty.includes('product') || creatorSpecialty.includes('image'))) ||
                      creatorCaps.some(c => c.includes('photo') || c.includes('still')) ||
                      projectFormats.some(f => f.includes('photo') || f.includes('still') || f.includes('portrait') || f.includes('landscape') || f.includes('image'));
      } else if (reqFormat.includes('3d') || reqFormat.includes('spatial') || reqFormat.includes('cgi') || reqFormat.includes('render')) {
        isSupported = creatorTags.some(t => t.includes('3d')) ||
                      (hasSpecialty && creatorSpecialty.includes('3d')) ||
                      creatorCaps.some(c => c.includes('3d')) ||
                      projectFormats.some(f => f.includes('3d') || f.includes('render'));
      } else if (reqFormat.includes('9:16') || reqFormat.includes('vertical') || reqFormat.includes('portrait')) {
        isSupported = hasExplicitVerticalEvidence(creator) ||
                      hasVerticalAspect ||
                      projectFormats.some(f => f.includes('portrait') || f.includes('vertical') || f.includes('9:16')) ||
                      creatorTags.some(t => t.includes('social') || t.includes('video'));
      } else {
        // Generic format match in tags, capabilities, or projects
        isSupported = creatorTags.some(t => t.includes(reqFormat)) ||
                      creatorCaps.some(c => c.includes(reqFormat)) ||
                      projectFormats.some(f => f.includes(reqFormat));
      }

      if (!isSupported) {
        missingFormats.push(rawReq);
      }
    }

    if (missingFormats.length === 0) {
      passedCandidates.push(creator);
    } else {
      rejections.push({
        creatorId: creator.id,
        creatorName: creator.name,
        stage: stageId,
        code: 'FORMAT_UNSUPPORTED',
        reason: `Deliverable format requirement not satisfied: ${missingFormats.join(', ')}. Creator specializes in ${creator.specialty || 'other formats'}.`,
        missingFields: missingFormats,
        availableData: { specialty: creator.specialty, tags: creator.categoryTags, capabilities: creator.capabilities, hasUploadedVideo, hasUploadedStill },
        requiredFields: mandatoryFormats
      });
    }
  }

  return {
    stageId,
    stageName,
    description,
    inputCount: candidatePool.length,
    passedCount: passedCandidates.length,
    rejectedCount: rejections.length,
    unknownCount,
    rejections,
    passedCandidates,
    requiredFormats: mandatoryFormats
  };
}

/**
 * STAGE 6: Commercial Readiness & Portfolio Verification Filter
 */
function stageLicensingVerificationFilter(mandatoryConfig, candidatePool) {
  const stageId = 'stage_06_licensing_verification';
  const stageName = 'Commercial Portfolio & Licensing Verification';
  const description = 'Ensure creator has verified commercial client experience and meet minimum portfolio requirements.';

  const { commercialLicensing, minProjects = 0 } = mandatoryConfig;

  if (!commercialLicensing && minProjects <= 0) {
    return {
      stageId,
      stageName,
      description,
      inputCount: candidatePool.length,
      passedCount: candidatePool.length,
      rejectedCount: 0,
      unknownCount: 0,
      rejections: [],
      passedCandidates: candidatePool,
      bypassed: true
    };
  }

  const passedCandidates = [];
  const rejections = [];
  let unknownCount = 0;

  for (const creator of candidatePool) {
    const projects = Array.isArray(creator.projects) && creator.projects.length > 0
      ? creator.projects
      : (Array.isArray(creator.portfolio_projects) && creator.portfolio_projects.length > 0
        ? creator.portfolio_projects
        : (Array.isArray(creator.portfolio) ? creator.portfolio : []));
    const totalMediaAssets = (creator.portfolio_images?.length || 0) + (creator.portfolio_videos?.length || 0) + (creator.portfolio_media?.length || 0);
    const effectiveProjectCount = Math.max(projects.length, Math.ceil(totalMediaAssets / 2));
    const hasEnoughProjects = projects.length >= minProjects || (totalMediaAssets > 0 && effectiveProjectCount >= minProjects);

    // Distinguish commercial-project client experience from enterprise licensing verification
    const hasCommercialClientWork = projects.some(p => Boolean(p.clientType && p.clientType.trim() !== ''));
    const isLicensingVerified = Boolean(
      creator.trustVerification?.commercialLicensingEligible ||
      creator.commercialLicensingVerified
    );
    const isLicensingExplicitlyUnavailable = Boolean(
      creator.trustVerification?.commercialLicensingEligible === false ||
      creator.commercialLicensingVerified === false ||
      creator.commercialLicensingEligible === false
    );
    const licensingEvidenceStatus = isLicensingVerified
      ? 'verified'
      : (isLicensingExplicitlyUnavailable ? 'confirmed_unavailable' : 'unverified_evidence');

    const failedReasons = [];
    if (minProjects > 0 && !hasEnoughProjects) {
      failedReasons.push(`Requires at least ${minProjects} verified portfolio project(s); found ${projects.length}`);
    }

    if (commercialLicensing && !isLicensingVerified) {
      unknownCount++;
      if (isLicensingExplicitlyUnavailable) {
        if (hasCommercialClientWork) {
          failedReasons.push('Creator has commercial client project experience, but enterprise commercial-use licensing credentials are confirmed unavailable in creator trust records');
        } else {
          failedReasons.push('Enterprise commercial-use licensing authorization is confirmed unavailable in creator trust records');
        }
      } else {
        if (hasCommercialClientWork) {
          failedReasons.push('Creator has commercial client project experience, but formal enterprise commercial-use licensing credentials are not verified in available creator records');
        } else {
          failedReasons.push('Formal enterprise commercial-use licensing credentials are not verified in available creator records');
        }
      }
    }

    if (failedReasons.length === 0) {
      passedCandidates.push(creator);
    } else {
      rejections.push({
        creatorId: creator.id,
        creatorName: creator.name,
        stage: stageId,
        code: isLicensingVerified ? 'PORTFOLIO_THRESHOLD_UNMET' : 'COMMERCIAL_LICENSING_UNVERIFIED',
        reason: failedReasons.join('. '),
        missingFields: commercialLicensing && !isLicensingVerified ? ['commercial_licensing_verification'] : ['verified_portfolio_projects'],
        availableData: {
          projectCount: projects.length,
          hasCommercialClientWork,
          isLicensingVerified,
          licensingStatus: licensingEvidenceStatus
        },
        requiredFields: { commercialLicensing, minProjects }
      });
    }
  }

  return {
    stageId,
    stageName,
    description,
    inputCount: candidatePool.length,
    passedCount: passedCandidates.length,
    rejectedCount: rejections.length,
    unknownCount,
    rejections,
    passedCandidates,
    requiredLicensing: { commercialLicensing, minProjects }
  };
}

/**
 * STAGE 7: Creative Fit & Compatibility Ranking (Executes ONLY on eligible creators)
 */
function stageCreativeFitRanking(campaign, eligibleCandidates) {
  const stageId = 'stage_07_ranking_engine';
  const stageName = 'Creative Fit & Compatibility Scoring';
  const description = 'Score and rank eligible candidates using deterministic CreaMatch compatibility and evidence explanations.';

  if (eligibleCandidates.length === 0) {
    return {
      stageId,
      stageName,
      description,
      inputCount: 0,
      passedCount: 0,
      rejectedCount: 0,
      rankedResults: []
    };
  }

  const rankedResults = eligibleCandidates.map(creator => {
    const match = calculateCreaMatch(campaign, creator);
    const explanation = explainMatch(campaign, creator);

    return {
      creatorId: creator.id,
      creator: {
        id: creator.id,
        name: creator.name,
        handle: creator.handle,
        avatar: creator.avatar,
        specialty: creator.specialty,
        creativeIdentity: creator.creativeIdentity,
        bio: creator.bio,
        location: creator.location,
        availability: creator.availability,
        statusBadge: creator.statusBadge,
        styles: creator.styles,
        industries: creator.industries,
        capabilities: creator.capabilities,
        tools: creator.tools,
        heroWork: creator.heroWork,
        projects: (creator.projects || []).slice(0, 3)
      },
      score: match.score,
      fitLabel: match.fitLabel,
      confidence: match.confidence,
      evidenceTier: match.evidenceTier,
      isSufficient: match.isSufficient,
      breakdown: match.breakdown,
      explanation: {
        summary: explanation?.summary || `Compatible across ${creator.specialty} and ${(creator.styles || []).slice(0, 2).join(', ')}.`,
        highlights: explanation?.highlights || [],
        potentialGap: explanation?.potentialGap || '',
        dimensions: explanation?.dimensions || {}
      }
    };
  });

  // Sort strictly by compatibility score descending
  rankedResults.sort((a, b) => b.score - a.score);

  return {
    stageId,
    stageName,
    description,
    inputCount: eligibleCandidates.length,
    passedCount: rankedResults.length,
    rejectedCount: 0,
    rankedResults
  };
}

/**
 * MAIN BACKEND PIPELINE ENTRY POINT
 * Executes the entire deterministic campaign-to-creator filtering pipeline.
 *
 * @param {Object} params
 * @param {Object} params.campaign - Campaign brief object
 * @param {Array} [params.creators] - Optional authoritative creators list (defaults to system CREATORS)
 * @param {Object} [params.options] - Execution options
 * @returns {Object} Complete pipeline trace response contract
 */
export function executeFilteringPipeline({ campaign = {}, creators = null, options = {} } = {}) {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const startTime = Date.now();

  // Authoritative candidate pool
  const candidatePool = Array.isArray(creators) ? [...creators] : [...CREATORS];
  const totalCandidates = candidatePool.length;

  // Step 1: Normalize Brief
  const normalizedBrief = normalizeCampaignBrief(campaign);

  // Trace collector
  const stages = [];
  const globalExclusions = [];
  const globalWarnings = [];

  // 1. Stage A: Brief Normalization
  const s1 = stageBriefNormalization(normalizedBrief, candidatePool);
  stages.push(s1);
  if (s1.warnings) globalWarnings.push(...s1.warnings);

  // 2. Stage B1: Mandatory Skills Filter
  const s2 = stageSkillsFilter(normalizedBrief.mandatory.skills, s1.passedCandidates);
  stages.push(s2);
  s2.rejections.forEach(r => globalExclusions.push(r));

  // 3. Stage B2: Specialization Fit Filter
  const s3 = stageSpecializationFilter(normalizedBrief.mandatory.specialization, s2.passedCandidates);
  stages.push(s3);
  s3.rejections.forEach(r => globalExclusions.push(r));

  // 4. Stage B3: AI Tools & Models Filter
  const s4 = stageAiToolsFilter(normalizedBrief.mandatory.tools, s3.passedCandidates);
  stages.push(s4);
  s4.rejections.forEach(r => globalExclusions.push(r));

  // 5. Stage B4: Content Format Filter
  const s5 = stageFormatFilter(normalizedBrief.mandatory.formats, s4.passedCandidates);
  stages.push(s5);
  s5.rejections.forEach(r => globalExclusions.push(r));

  // 6. Stage B5: Commercial & Verification Filter
  const s6 = stageLicensingVerificationFilter(normalizedBrief.mandatory, s5.passedCandidates);
  stages.push(s6);
  s6.rejections.forEach(r => globalExclusions.push(r));

  // Prepare unified campaign model integrating normalized mandatory & preferred requirements
  const safeCampaign = campaign || {};
  const unifiedCampaign = {
    ...safeCampaign,
    id: normalizedBrief.campaignId || safeCampaign.id,
    title: normalizedBrief.title || safeCampaign.title,
    budget: safeCampaign.budget || normalizedBrief.budget,
    timeline: safeCampaign.timeline || normalizedBrief.timeline,
    requirements: {
      mandatory: {
        ...(safeCampaign.requirements?.mandatory || {}),
        skills: normalizedBrief.mandatory.skills,
        specialization: normalizedBrief.mandatory.specialization,
        tools: normalizedBrief.mandatory.tools,
        formats: normalizedBrief.mandatory.formats,
        styles: normalizedBrief.mandatory.styles,
        commercialLicensing: normalizedBrief.mandatory.commercialLicensing,
        minProjects: normalizedBrief.mandatory.minProjects
      },
      preferred: {
        ...(safeCampaign.requirements?.preferred || {}),
        ...normalizedBrief.preferred
      }
    }
  };

  // Evaluate every candidate in the candidate pool using the deterministic eligibility engine
  const eligibilityMap = new Map();
  for (const creator of candidatePool) {
    const evalRes = evaluateCreatorEligibility(unifiedCampaign, creator);
    eligibilityMap.set(creator.id, evalRes);
  }

  // Phase 1 Fix: Ensure every evaluated creator receives EXACTLY ONE outcome with zero candidate loss:
  // 1. ELIGIBLE -> ranked results
  // 2. INELIGIBLE -> Exclusion Ledger
  // 3. REQUIRES_REVIEW -> Needs Review

  // Track any candidate in candidatePool that has INELIGIBLE status so they enter the Exclusion Ledger
  for (const c of candidatePool) {
    const evalRes = eligibilityMap.get(c.id);
    if (evalRes && evalRes.eligibility === ELIGIBILITY_STATUS.INELIGIBLE) {
      if (!globalExclusions.some(e => e.creatorId === c.id)) {
        const failedReq = evalRes.requirements?.find(r => r.status === ELIGIBILITY_OUTCOMES.FAIL);
        const code = failedReq?.code ||
                     (failedReq?.requirement === 'budget' ? 'BUDGET_EXCEEDED' :
                      failedReq?.requirement === 'capabilities' ? 'SKILL_MISMATCH' :
                      failedReq?.requirement === 'specialization' ? 'SPECIALIZATION_MISMATCH' :
                      failedReq?.requirement === 'tools' ? 'TOOL_UNSUPPORTED' :
                      failedReq?.requirement === 'formats' ? 'FORMAT_UNSUPPORTED' :
                      failedReq?.requirement === 'commercialLicensing' ? 'COMMERCIAL_LICENSE_MISSING' :
                      failedReq?.requirement === 'styles' ? 'STYLE_MISMATCH' :
                      failedReq?.requirement === 'industries' ? 'INDUSTRY_MISMATCH' :
                      failedReq?.requirement === 'availability' ? 'AVAILABILITY_MISMATCH' :
                      failedReq?.requirement === 'minProjects' ? 'INSUFFICIENT_PROJECTS' :
                      'REQUIREMENT_NOT_SATISFIED');
        globalExclusions.push({
          creatorId: c.id,
          creatorName: c.name,
          stage: 'stage_06_licensing_verification',
          code,
          reason: failedReq?.reason || evalRes.reasons?.[0] || 'Mandatory campaign requirement not satisfied',
          missingFields: [failedReq?.requirement || 'requirement'],
          availableData: failedReq?.evidence || {},
          requiredFields: failedReq?.evidence?.expected || null
        });
      }
    }
  }

  // Update excludedCreatorIds with all confirmed exclusions (stage rejections + engine ineligibles)
  const excludedCreatorIds = new Set(globalExclusions.map(e => e.creatorId));

  // Disjoint partitioning:
  // Group 1: Review candidates (UNKNOWN evidence without confirmed failures or stage rejections)
  const reviewCandidates = candidatePool.filter(c => {
    if (excludedCreatorIds.has(c.id)) return false;
    const evalRes = eligibilityMap.get(c.id);
    return evalRes && evalRes.eligibility === ELIGIBILITY_STATUS.REQUIRES_REVIEW;
  });

  const reviewCreatorIds = new Set(reviewCandidates.map(c => c.id));

  // Group 2: Eligible candidates (all mandatory requirements pass with confirmed evidence)
  const eligibleCandidates = candidatePool.filter(c => {
    if (excludedCreatorIds.has(c.id)) return false;
    const evalRes = eligibilityMap.get(c.id);
    return evalRes && evalRes.eligibility === ELIGIBILITY_STATUS.ELIGIBLE;
  });

  const eligibleCreatorIds = new Set(eligibleCandidates.map(c => c.id));

  // Group 3: Clean exclusions (truly ineligible candidates; review & eligible candidates are strictly omitted)
  const seenExclusionIds = new Set();
  const cleanExclusions = [];
  for (const exc of globalExclusions) {
    if (reviewCreatorIds.has(exc.creatorId)) continue;
    if (eligibleCreatorIds.has(exc.creatorId)) continue;
    if (seenExclusionIds.has(exc.creatorId)) continue;
    seenExclusionIds.add(exc.creatorId);
    cleanExclusions.push(exc);
  }

  // Zero-loss invariant guarantee: Ensure every candidate from candidatePool is assigned exactly one outcome
  for (const c of candidatePool) {
    if (!eligibleCreatorIds.has(c.id) && !reviewCreatorIds.has(c.id) && !seenExclusionIds.has(c.id)) {
      const evalRes = eligibilityMap.get(c.id);
      seenExclusionIds.add(c.id);
      cleanExclusions.push({
        creatorId: c.id,
        creatorName: c.name,
        stage: 'stage_06_licensing_verification',
        code: 'REQUIREMENT_NOT_SATISFIED',
        reason: evalRes?.reasons?.[0] || 'Mandatory campaign requirement not satisfied',
        missingFields: ['requirement'],
        availableData: {},
        requiredFields: null
      });
    }
  }

  const requiresReview = reviewCandidates.map(c => {
    const evalRes = eligibilityMap.get(c.id);
    const unknownReqs = (evalRes?.requirements || []).filter(r => r.status === ELIGIBILITY_OUTCOMES.UNKNOWN);
    return {
      creatorId: c.id,
      creatorName: c.name,
      creator: {
        id: c.id,
        name: c.name,
        handle: c.handle,
        avatar: c.avatar,
        specialty: c.specialty,
        creativeIdentity: c.creativeIdentity,
        bio: c.bio,
        location: c.location,
        availability: c.availability,
        statusBadge: c.statusBadge,
        styles: c.styles,
        industries: c.industries,
        capabilities: c.capabilities,
        tools: c.tools,
        heroWork: c.heroWork,
        projects: (c.projects || []).slice(0, 3)
      },
      eligibility: ELIGIBILITY_STATUS.REQUIRES_REVIEW,
      reasons: evalRes?.reasons || [],
      unknownRequirements: unknownReqs,
      requirements: evalRes?.requirements || [],
      summary: evalRes?.summary || { totalEvaluated: 0, passed: 0, failed: 0, unknown: unknownReqs.length }
    };
  });

  // 7. Stage C & D: Creative Fit Ranking & Explanations on Eligible Candidates
  const s7 = stageCreativeFitRanking(safeCampaign, eligibleCandidates);
  stages.push(s7);

  const durationMs = Date.now() - startTime;
  const status = eligibleCandidates.length > 0 ? 'completed' : 'empty';

  return {
    contractVersion: '1.0.0',
    executionId,
    timestamp: new Date().toISOString(),
    durationMs,
    status,
    campaignId: normalizedBrief.campaignId,
    campaignTitle: normalizedBrief.title,
    summary: {
      totalCandidates,
      passedEligibilityCount: eligibleCandidates.length,
      excludedCount: cleanExclusions.length,
      requiresReviewCount: requiresReview.length,
      reviewCount: requiresReview.length,
      isSuccess: true,
      hasEligibleCreators: eligibleCandidates.length > 0
    },
    normalizedBrief: {
      title: normalizedBrief.title,
      industry: normalizedBrief.industry,
      mandatory: normalizedBrief.mandatory,
      preferred: normalizedBrief.preferred
    },
    stages: stages.map(s => ({
      stageId: s.stageId,
      stageName: s.stageName,
      description: s.description,
      inputCount: s.inputCount,
      passedCount: s.passedCount,
      rejectedCount: s.rejectedCount,
      unknownCount: s.unknownCount || 0,
      bypassed: !!s.bypassed,
      rejections: s.rejections || [],
      // Stage-specific criteria & metadata for the frontend inspector
      ...(s.requiredSkills ? { requiredSkills: s.requiredSkills } : {}),
      ...(s.requiredSpecialization ? { requiredSpecialization: s.requiredSpecialization } : {}),
      ...(s.requiredTools ? { requiredTools: s.requiredTools } : {}),
      ...(s.requiredFormats ? { requiredFormats: s.requiredFormats } : {}),
      ...(s.requiredLicensing ? { requiredLicensing: s.requiredLicensing } : {}),
      ...(s.extractedMandatory ? { extractedMandatory: s.extractedMandatory } : {}),
      ...(s.extractedPreferred ? { extractedPreferred: s.extractedPreferred } : {}),
      ...(s.warnings ? { warnings: s.warnings } : {}),
      // Summaries of creators who passed this stage with stage-relevant evidence
      passedCreatorSummaries: (s.passedCandidates || []).slice(0, 10).map(c => ({
        id: c.id,
        name: c.name,
        specialty: c.specialty,
        avatar: c.avatar,
        capabilities: (c.capabilities || []).slice(0, 3),
        tools: (c.tools || []).slice(0, 3),
        categoryTags: (c.categoryTags || []).slice(0, 3),
        projectCount: (c.projects || []).length,
        isLicensingVerified: Boolean(c.trustVerification?.commercialLicensingEligible || c.commercialLicensingVerified)
      }))
    })),
    eligibleCreatorIds: eligibleCandidates.map(c => c.id),
    rankedCreators: s7.rankedResults,
    requiresReview,
    requiresReviewCreators: requiresReview,
    exclusions: cleanExclusions,
    warnings: globalWarnings
  };
}
