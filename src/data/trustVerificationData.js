// src/data/trustVerificationData.js
// Alloy Creator Trust Verification System
// Truthful verification categories, evidence schemas, status helpers, and demo profiles.

/**
 * 3. Canonical Verification Status System
 * Implement these statuses consistently across the Trust Centre and creator profiles:
 * - Not Submitted
 * - Self-Declared
 * - Pending Review
 * - Verified
 * - Unable to Verify
 * - Needs Renewal
 */
export const VERIFICATION_STATUSES = {
  NOT_SUBMITTED: 'not_submitted',
  SELF_DECLARED: 'self_declared',
  PENDING_REVIEW: 'pending_review',
  VERIFIED: 'verified',
  UNABLE_TO_VERIFY: 'unable_to_verify',
  NEEDS_RENEWAL: 'needs_renewal',

  // Backward-compatibility aliases
  NOT_STARTED: 'not_submitted',
  IN_PROGRESS: 'pending_review',
  SUBMITTED: 'pending_review',
  UNDER_REVIEW: 'pending_review',
  ACTION_REQUIRED: 'needs_renewal',
  REVIEWED: 'verified',
  NOT_VERIFIED: 'unable_to_verify'
};

export const STATUS_META = {
  [VERIFICATION_STATUSES.NOT_SUBMITTED]: {
    label: 'Not Submitted',
    badgeClass: 'status-not-submitted',
    color: '#78716C',
    bg: 'rgba(120, 113, 108, 0.12)',
    border: 'rgba(120, 113, 108, 0.25)',
    description: 'No documentation or evidence has been submitted yet for this claim.'
  },
  [VERIFICATION_STATUSES.SELF_DECLARED]: {
    label: 'Self-Declared',
    badgeClass: 'status-self-declared',
    color: '#D97706',
    bg: 'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.28)',
    description: 'Claimed by the creator. Awaiting supporting evidence submission and audit.'
  },
  [VERIFICATION_STATUSES.PENDING_REVIEW]: {
    label: 'Pending Review',
    badgeClass: 'status-pending-review',
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.14)',
    border: 'rgba(139, 92, 246, 0.3)',
    description: 'Evidence submitted and queued for manual inspection by an authorized platform reviewer.'
  },
  [VERIFICATION_STATUSES.VERIFIED]: {
    label: 'Verified',
    badgeClass: 'status-verified',
    color: '#059669',
    bg: 'rgba(16, 185, 129, 0.14)',
    border: 'rgba(16, 185, 129, 0.3)',
    description: 'Audited and confirmed against original source files, auth proofs, or model terms.'
  },
  [VERIFICATION_STATUSES.UNABLE_TO_VERIFY]: {
    label: 'Unable to Verify',
    badgeClass: 'status-unable-to-verify',
    color: '#DC2626',
    bg: 'rgba(220, 38, 38, 0.12)',
    border: 'rgba(220, 38, 38, 0.25)',
    description: 'Evidence was insufficient, inconclusive, or rejected during reviewer audit.'
  },
  [VERIFICATION_STATUSES.NEEDS_RENEWAL]: {
    label: 'Needs Renewal',
    badgeClass: 'status-needs-renewal',
    color: '#EA580C',
    bg: 'rgba(234, 88, 12, 0.14)',
    border: 'rgba(234, 88, 12, 0.3)',
    description: 'Reviewer requested updated documentation, higher-resolution project evidence, or clarification.'
  }
};

/**
 * 4 Core Verification Overview Pillars
 */
export const TRUST_OVERVIEW_CATEGORIES = [
  {
    id: 'identity',
    title: 'Identity Verification',
    shortDesc: 'Cryptographic email challenge & confidential professional legal personhood check.',
    icon: 'UserCheck',
    explanation: 'Authenticates genuine ownership of contact channels and verifies identity via secure compliance review without exposing sensitive documents.'
  },
  {
    id: 'portfolio',
    title: 'Portfolio Authenticity',
    shortDesc: 'Evidence-backed review of original project files, ComfyUI node graphs, & seeds.',
    icon: 'FileCheck2',
    explanation: 'Confirms that portfolio deliverables originate from original workflows and creator project files, avoiding plagiarized or scraped assets.'
  },
  {
    id: 'ai_tools',
    title: 'AI Tools & Workflow',
    shortDesc: 'Distinction between self-declared tools and audited model generation pipelines.',
    icon: 'Cpu',
    explanation: 'Audits generative model stacks, prompt seed sheets, and human-in-the-loop review checkpoints within commercial production timelines.'
  },
  {
    id: 'commercial_rights',
    title: 'Commercial Usage Rights',
    shortDesc: 'Transparent licensing scope, foundational model terms, & buyout boundaries.',
    icon: 'ShieldCheck',
    explanation: 'Captures applicable model licenses, platforms, and usage warranties. Verifies model terms permit commercial output while noting legal disclaimers.'
  }
];

/**
 * 5. Public Creator Profile Integration — 6 Concise Badges with Clear Scopes
 */
export const BADGE_DEFINITIONS = {
  EMAIL_VERIFIED: {
    id: 'email-verified',
    key: 'email',
    title: 'Email Verified',
    category: 'Identity Verification',
    icon: 'CheckCircle2',
    description: 'Contact channel cryptographically authenticated via Supabase Auth / OTP link.',
    whatWasChecked: 'Verified that the creator owns and controls the registered email address via single-use cryptographic token or magic link.',
    criteria: 'Active user authentication record with confirmed email challenge.',
    limitations: 'Confirms communication reachability only. Does not guarantee legal business identity or financial background.',
    disclaimer: 'Email verification confirms communication ownership, not corporate entity legitimacy.'
  },
  IDENTITY_VERIFIED: {
    id: 'identity-verified',
    key: 'identity',
    title: 'Identity Verified',
    category: 'Identity Verification',
    icon: 'UserCheck',
    description: 'Professional personhood checked by platform compliance in private audit.',
    whatWasChecked: 'Government-issued identity document inspected in private encrypted vault by authorized auditor.',
    criteria: 'Matching legal name, issuing jurisdiction, and valid non-expired documentation.',
    limitations: 'Private verification for trust compliance. Sensitive documents are never shared with or downloadable by hiring brands.',
    disclaimer: 'Confirms personhood verification. Does not constitute platform endorsement, financial insurance, or employee status.'
  },
  TOOL_CLAIM_VERIFIED: {
    id: 'tool-claim-verified',
    key: 'tools',
    title: 'Tool Claim Verified',
    category: 'AI Tools & Workflow',
    icon: 'Cpu',
    description: 'Generative software and AI model claims backed by generation logs & seeds.',
    whatWasChecked: 'Specific model claims (e.g. Runway Gen-3, Midjourney v6, ComfyUI/Flux) verified against attached generation timestamps and project metadata.',
    criteria: 'Seed reference sheets, node graph exports, or native timeline metadata.',
    limitations: 'Audited claims apply specifically to the submitted deliverables and do not imply automated future output quality.',
    disclaimer: 'Tool verification confirms historical use of claimed models, not subjective artistic capability.'
  },
  WORKFLOW_REVIEWED: {
    id: 'workflow-reviewed',
    key: 'workflow',
    title: 'Workflow Reviewed',
    category: 'AI Tools & Workflow',
    icon: 'Sliders',
    description: 'Human-in-the-loop checkpoints and production steps audited by lead reviewer.',
    whatWasChecked: 'Multi-stage production pipeline inspected to verify human creative direction, editing passes, and color grading gates.',
    criteria: 'Published workflow steps with demonstrable review gates and intermediate deliverables.',
    limitations: 'Verifies structured production methodology; production speed on future campaigns depends on specific project brief requirements.',
    disclaimer: 'Audited workflow reflects documented creative process, not an automated delivery guarantee.'
  },
  PORTFOLIO_EVIDENCE_REVIEWED: {
    id: 'portfolio-evidence-reviewed',
    key: 'portfolio',
    title: 'Portfolio Evidence Reviewed',
    category: 'Portfolio Authenticity',
    icon: 'FileCheck2',
    description: 'Original source files, ComfyUI graphs, or raw timeline passes inspected.',
    whatWasChecked: 'Raw project files (.blend, .c4d, .exr, ProRes 4444 master timeline, or node graph JSON) matched against final showcase pieces.',
    criteria: 'Matching generation parameters, seed values, layer breakdown, and authorship provenance.',
    limitations: 'Applies specifically to audited portfolio items. Unsubmitted portfolio works remain self-declared until inspected.',
    disclaimer: 'Authenticity review verifies authorship provenance for inspected works. Does not constitute legal copyright registration.'
  },
  COMMERCIAL_USE_DECLARED: {
    id: 'commercial-use-declared',
    key: 'licensing',
    title: 'Commercial-Use Information Declared',
    category: 'Commercial Usage Rights',
    icon: 'ShieldCheck',
    description: 'Foundational model licensing terms & commercial buyout scope disclosed.',
    whatWasChecked: 'Verified that declared foundational AI models permit commercial deliverables under their current terms of service, and clear buyout rights are specified.',
    criteria: 'Disclosed foundational models with commercial tier validation and explicit category exclusivity terms.',
    limitations: 'Platform reviews model terms of service; creator self-declares IP clearance. The platform does not provide legal copyright warranty or indemnity.',
    disclaimer: 'Commercial information is declared by creator and reviewed against known model licensing. Not legal advice or indemnification.'
  }
};

export const PROVENANCE_LEVELS = {
  CREATOR_DECLARED: {
    key: 'creator_declared',
    label: 'Creator-Declared',
    color: '#78716C',
    bg: 'rgba(120, 113, 108, 0.1)',
    explanation: 'Self-reported by creator. Not verified by external review.'
  },
  EVIDENCE_ATTACHED: {
    key: 'evidence_attached',
    label: 'Evidence Supplied',
    color: '#B45309',
    bg: 'rgba(245, 158, 11, 0.12)',
    explanation: 'Supporting artifacts or generation records supplied by creator.'
  },
  AUDITED_VERIFIED: {
    key: 'audited_verified',
    label: 'Platform Audited',
    color: '#059669',
    bg: 'rgba(16, 185, 129, 0.15)',
    explanation: 'Confirmed through authorized review or cryptographic verification.'
  }
};

/**
 * Resolves creator trust badges with accurate claim-specific status
 */
export function getCreatorTrustBadges(creator = {}) {
  const trustData = creator.trustVerification || createInitialTrustVerification(creator);

  // 1. Email Status
  const emailStatus = trustData.email?.status === 'verified'
    ? VERIFICATION_STATUSES.VERIFIED
    : (trustData.email?.status || VERIFICATION_STATUSES.NOT_SUBMITTED);

  // 2. Identity Status
  const identityStatus = (trustData.identity?.status === 'verified' || creator.identity_verified || creator.is_verified)
    ? VERIFICATION_STATUSES.VERIFIED
    : (trustData.identity?.status || VERIFICATION_STATUSES.NOT_SUBMITTED);

  // 3. Tool Claim Status
  const hasAuditedTools = (trustData.toolDeclarations || []).some(td => td.status === 'verified' || td.status === 'reviewed') || trustData.ai_tools?.status === 'verified';
  const hasPendingTools = (trustData.toolDeclarations || []).some(td => td.status === 'pending_review' || td.status === 'submitted' || td.status === 'under_review') || trustData.ai_tools?.status === 'pending_review';
  const toolStatus = hasAuditedTools 
    ? VERIFICATION_STATUSES.VERIFIED 
    : (hasPendingTools ? VERIFICATION_STATUSES.PENDING_REVIEW : ((trustData.toolDeclarations || []).length > 0 ? VERIFICATION_STATUSES.SELF_DECLARED : VERIFICATION_STATUSES.NOT_SUBMITTED));

  // 4. Workflow Status
  const wfStatus = trustData.workflowVerification?.status === 'verified' || trustData.workflowVerification?.status === 'reviewed'
    ? VERIFICATION_STATUSES.VERIFIED
    : (trustData.workflowVerification?.status || VERIFICATION_STATUSES.NOT_SUBMITTED);

  // 5. Portfolio Evidence Status
  const hasAuditedEvidence = (trustData.portfolioEvidence || []).some(pe => pe.status === 'verified' || pe.status === 'reviewed') || trustData.portfolio?.status === 'verified';
  const hasPendingEvidence = (trustData.portfolioEvidence || []).some(pe => pe.status === 'pending_review' || pe.status === 'submitted' || pe.status === 'under_review') || trustData.portfolio?.status === 'pending_review';
  const portfolioStatus = hasAuditedEvidence 
    ? VERIFICATION_STATUSES.VERIFIED 
    : (hasPendingEvidence ? VERIFICATION_STATUSES.PENDING_REVIEW : ((creator.projects || []).length > 0 ? VERIFICATION_STATUSES.SELF_DECLARED : VERIFICATION_STATUSES.NOT_SUBMITTED));

  // 6. Commercial Rights Status
  const licensingStatus = trustData.licensing?.status === 'verified' || trustData.licensing?.status === 'reviewed' || creator.commercial_licensing_verified || creator.commercialLicensingVerified || trustData.commercial_rights?.status === 'verified'
    ? VERIFICATION_STATUSES.VERIFIED
    : (trustData.licensing?.modelRightsDeclaration ? VERIFICATION_STATUSES.SELF_DECLARED : VERIFICATION_STATUSES.NOT_SUBMITTED);

  return [
    {
      ...BADGE_DEFINITIONS.EMAIL_VERIFIED,
      status: emailStatus,
      verifiedAt: trustData.email?.verifiedAt || null,
      notes: trustData.email?.notes || 'Cryptographic email verification.'
    },
    {
      ...BADGE_DEFINITIONS.IDENTITY_VERIFIED,
      status: identityStatus,
      verifiedAt: trustData.identity?.reviewedAt || null,
      notes: trustData.identity?.notes || 'Confidential legal personhood check.'
    },
    {
      ...BADGE_DEFINITIONS.TOOL_CLAIM_VERIFIED,
      status: toolStatus,
      verifiedAt: hasAuditedTools ? 'Verified by visual auditor' : null,
      notes: `${(trustData.toolDeclarations || []).length} tool declarations logged.`
    },
    {
      ...BADGE_DEFINITIONS.WORKFLOW_REVIEWED,
      status: wfStatus,
      verifiedAt: trustData.workflowVerification?.auditedAt || null,
      notes: trustData.workflowVerification?.auditorSummary || 'Production steps documented.'
    },
    {
      ...BADGE_DEFINITIONS.PORTFOLIO_EVIDENCE_REVIEWED,
      status: portfolioStatus,
      verifiedAt: hasAuditedEvidence ? 'Source files audited' : null,
      notes: `${(trustData.portfolioEvidence || []).length} evidence packs referenced.`
    },
    {
      ...BADGE_DEFINITIONS.COMMERCIAL_USE_DECLARED,
      status: licensingStatus,
      verifiedAt: trustData.licensing?.declarationDate || null,
      notes: trustData.licensing?.licenseTypeGranted || 'Commercial scope stated.'
    }
  ];
}

/**
 * Calculates genuine verification summary stats without arbitrary composite scores
 */
export function calculateTrustSummary(trustData) {
  if (!trustData) {
    return {
      totalCategories: 4,
      verifiedCount: 0,
      pendingCount: 0,
      selfDeclaredCount: 0,
      needsRenewalCount: 0,
      notSubmittedCount: 4,
      completionRate: 0
    };
  }

  let verifiedCount = 0;
  let pendingCount = 0;
  let selfDeclaredCount = 0;
  let needsRenewalCount = 0;
  let unableToVerifyCount = 0;
  let notSubmittedCount = 0;

  // Check 1: Identity (Email + Legal Identity)
  const isEmailVerified = trustData.email?.status === VERIFICATION_STATUSES.VERIFIED || trustData.email?.status === 'verified';
  const isIdentityVerified = trustData.identity?.status === VERIFICATION_STATUSES.VERIFIED || trustData.identity?.status === 'verified';
  if (isEmailVerified || isIdentityVerified) verifiedCount++;
  else if (trustData.identity?.status === VERIFICATION_STATUSES.PENDING_REVIEW || trustData.identity?.status === 'submitted' || trustData.identity?.status === 'under_review') pendingCount++;
  else notSubmittedCount++;

  // Check 2: Portfolio Authenticity
  const evidenceList = trustData.portfolioEvidence || [];
  if (evidenceList.some(e => e.status === VERIFICATION_STATUSES.VERIFIED || e.status === 'reviewed')) verifiedCount++;
  else if (evidenceList.some(e => e.status === VERIFICATION_STATUSES.PENDING_REVIEW || e.status === 'submitted' || e.status === 'under_review')) pendingCount++;
  else if (evidenceList.some(e => e.status === VERIFICATION_STATUSES.NEEDS_RENEWAL || e.status === 'action_required')) needsRenewalCount++;
  else if (evidenceList.length > 0) selfDeclaredCount++;
  else notSubmittedCount++;

  // Check 3: AI Tools & Workflow
  const toolList = trustData.toolDeclarations || [];
  const wfVerified = trustData.workflowVerification?.status === VERIFICATION_STATUSES.VERIFIED || trustData.workflowVerification?.status === 'reviewed';
  if (wfVerified || toolList.some(t => t.status === VERIFICATION_STATUSES.VERIFIED || t.status === 'reviewed')) verifiedCount++;
  else if (toolList.some(t => t.status === VERIFICATION_STATUSES.PENDING_REVIEW || t.status === 'submitted' || t.status === 'under_review')) pendingCount++;
  else if (toolList.length > 0) selfDeclaredCount++;
  else notSubmittedCount++;

  // Check 4: Commercial Usage Rights
  if (trustData.licensing?.status === VERIFICATION_STATUSES.VERIFIED || trustData.licensing?.status === 'reviewed') verifiedCount++;
  else if (trustData.licensing?.status === VERIFICATION_STATUSES.PENDING_REVIEW || trustData.licensing?.status === 'submitted' || trustData.licensing?.status === 'under_review') pendingCount++;
  else if (trustData.licensing?.modelRightsDeclaration) selfDeclaredCount++;
  else notSubmittedCount++;

  const totalCategories = 4;
  const completionRate = Math.round((verifiedCount / totalCategories) * 100);

  return {
    totalCategories,
    verifiedCount,
    pendingCount,
    selfDeclaredCount,
    needsRenewalCount,
    unableToVerifyCount,
    notSubmittedCount,
    completionRate
  };
}

/**
 * Generates initial trust verification record for a creator
 */
export function createInitialTrustVerification(creator = {}, currentUser = null) {
  // Check genuine auth email confirmation
  const isEmailConfirmed = !!(currentUser?.email_confirmed_at || currentUser?.user_metadata?.email_verified);
  const emailState = isEmailConfirmed 
    ? VERIFICATION_STATUSES.VERIFIED 
    : (currentUser?.email ? VERIFICATION_STATUSES.PENDING_REVIEW : VERIFICATION_STATUSES.NOT_SUBMITTED);

  // Check if creator already has custom trust verification
  if (creator.trustVerification) {
    return {
      ...creator.trustVerification,
      email: {
        ...creator.trustVerification.email,
        status: isEmailConfirmed ? VERIFICATION_STATUSES.VERIFIED : (creator.trustVerification.email?.status || emailState),
        emailAddress: currentUser?.email || creator.email || 'creator@alloy.market',
        verifiedAt: isEmailConfirmed ? (currentUser?.email_confirmed_at || 'Recently confirmed') : (creator.trustVerification.email?.verifiedAt || null)
      }
    };
  }

  // Realistic sample trust records for demo creators
  const isMaya = creator.id === 'maya-chen' || (!creator.id && creator.name?.includes('Maya'));

  return {
    isDemoProfile: !!creator.featured || isMaya,
    lastUpdated: 'Today',
    
    // A. Account & Email Verification
    email: {
      status: isEmailConfirmed ? VERIFICATION_STATUSES.VERIFIED : (isMaya ? VERIFICATION_STATUSES.VERIFIED : VERIFICATION_STATUSES.NOT_SUBMITTED),
      emailAddress: currentUser?.email || (isMaya ? 'maya.chen@alloy.market' : 'creator@alloy.market'),
      verifiedAt: isEmailConfirmed ? (currentUser?.email_confirmed_at || 'Authenticated session') : (isMaya ? 'Sep 14, 2026 via Supabase Auth' : null),
      notes: isEmailConfirmed 
        ? 'Cryptographically verified through Supabase magic link / OTP.' 
        : (isMaya ? 'Verified through platform email challenge.' : 'Awaiting confirmation.')
    },

    // B. Identity Verification (Private legal personhood check)
    identity: {
      status: isMaya ? VERIFICATION_STATUSES.PENDING_REVIEW : VERIFICATION_STATUSES.NOT_SUBMITTED,
      provider: 'Alloy Secure Identity Prototype (Stripe Identity Bridge)',
      legalName: isMaya ? 'Maya Li-Wei Chen' : '',
      issuingCountry: isMaya ? 'United Kingdom (GB)' : '',
      documentType: isMaya ? 'Passport' : '',
      documentMaskedNumber: isMaya ? '•••••• 8941' : '',
      submittedAt: isMaya ? 'Oct 02, 2026' : null,
      reviewedAt: null,
      reviewedBy: null,
      notes: isMaya ? 'Legal document submission under compliance queue. Documents stored in private encrypted bucket; never shared with brands.' : '',
      isPrivate: true
    },

    // C. Portfolio Authenticity Evidence
    portfolioEvidence: [
      {
        id: 'pe-maya-1',
        projectId: 'maya-proj-1',
        projectTitle: 'Echoes of the Solarium — Mid-Century Brand Odyssey',
        evidenceType: 'Raw Project Files & ComfyUI Generation Graph',
        description: 'Original ComfyUI JSON pipeline export, seed parameters (Seed #48921104), and 4K uncompressed ProRes 4444 master timeline with 35mm grain pass.',
        artifactUrl: 'https://vault.alloy.market/audit/solarium_comfy_v4.json',
        status: VERIFICATION_STATUSES.VERIFIED,
        submittedAt: 'Oct 04, 2026',
        reviewedAt: 'Oct 06, 2026',
        reviewerNotes: 'Verified prompt seeds match final output. Confirmed original node graph authoring.'
      },
      {
        id: 'pe-maya-2',
        projectId: 'maya-proj-2',
        projectTitle: 'Lumina Botanica — Bio-Luminescent Serums',
        evidenceType: 'Model Seed Logs & Depth Map Passes',
        description: 'Midjourney v6 seed reference sheet, ControlNet depth map passes for fluid droplets, and raw PSD layers separating lighting reflections.',
        artifactUrl: 'https://vault.alloy.market/audit/lumina_depth_passes.zip',
        status: VERIFICATION_STATUSES.PENDING_REVIEW,
        submittedAt: 'Oct 08, 2026',
        reviewedAt: null,
        reviewerNotes: 'Queued for visual authenticity review.'
      }
    ],

    // D. AI Tools and Models Declarations
    toolDeclarations: [
      {
        id: 'td-1',
        toolName: 'Runway Gen-3 Alpha',
        useCase: 'Primary kinetic motion synthesis and camera trajectory simulation.',
        associatedWork: 'Echoes of the Solarium',
        provenance: PROVENANCE_LEVELS.AUDITED_VERIFIED.key,
        status: VERIFICATION_STATUSES.VERIFIED,
        evidenceNote: 'Video master contains generation timestamp metadata.'
      },
      {
        id: 'td-2',
        toolName: 'Midjourney v6.1',
        useCase: 'Initial lighting concept boards and botanical macro texture generation.',
        associatedWork: 'Lumina Botanica Serums',
        provenance: PROVENANCE_LEVELS.EVIDENCE_ATTACHED.key,
        status: VERIFICATION_STATUSES.PENDING_REVIEW,
        evidenceNote: 'Seed logs attached in portfolio evidence.'
      },
      {
        id: 'td-3',
        toolName: 'ComfyUI / Flux.1 Schnell',
        useCase: 'Custom LoRA fine-tuning for glass refraction and fluid viscosity.',
        associatedWork: 'Kinetic Brand Idents',
        provenance: PROVENANCE_LEVELS.EVIDENCE_ATTACHED.key,
        status: VERIFICATION_STATUSES.PENDING_REVIEW,
        evidenceNote: 'ComfyUI workflow JSON supplied.'
      },
      {
        id: 'td-4',
        toolName: 'DaVinci Resolve Studio',
        useCase: 'Human color grading, 35mm grain matching, and acoustic tempo sync.',
        associatedWork: 'All Commercial Deliverables',
        provenance: PROVENANCE_LEVELS.CREATOR_DECLARED.key,
        status: VERIFICATION_STATUSES.SELF_DECLARED,
        evidenceNote: 'Self-reported post-production software.'
      }
    ],

    // E. Creative Workflow Verification
    workflowVerification: {
      linkedWorkflowId: 'wf-skincare-maya',
      workflowTitle: 'Premium Skincare Campaign Pipeline',
      status: isMaya ? VERIFICATION_STATUSES.VERIFIED : VERIFICATION_STATUSES.NOT_SUBMITTED,
      reviewedStepsCount: 7,
      totalStepsCount: 7,
      humanInvolvementAudited: true,
      auditedAt: isMaya ? 'Oct 06, 2026' : null,
      auditorSummary: 'Verified human review gates at steps 01, 04, 05, and 06. Tool disclosures correspond to attached generation records.'
    },

    // F. Platform Engagement & Delivery History
    platformHistory: {
      hasHistory: isMaya,
      completedEngagementsCount: isMaya ? 2 : 0,
      totalMilestonesDelivered: isMaya ? 6 : 0,
      onTimeDeliveryRate: isMaya ? '100%' : 'N/A',
      activeContractsCount: 1,
      disputeCount: 0,
      records: isMaya ? [
        {
          id: 'eng-1',
          campaignTitle: 'Summer Skincare & Radiant Hydration Launch',
          brandName: 'Lumina Botanica',
          deliverablesSubmitted: 3,
          completedAt: 'Oct 01, 2026',
          status: 'Completed & Released'
        },
        {
          id: 'eng-2',
          campaignTitle: 'Solar Amber Eau de Parfum Visuals',
          brandName: 'Lumina Botanica',
          deliverablesSubmitted: 3,
          completedAt: 'Sep 22, 2026',
          status: 'Completed & Released'
        }
      ] : []
    },

    // G. Commercial-Use and Licensing Disclosures
    licensing: {
      modelRightsDeclaration: 'Commercial-Clearance Guarantee: Generated using commercially-cleared foundational models (Flux.1 / Midjourney Pro) and proprietary trained LoRAs. No copyrighted third-party IP or artist style mimicry without written consent.',
      licenseTypeGranted: 'Full Commercial Buyout (Worldwide Digital, OOH, Paid Media)',
      exclusivityPeriod: '12 Months Category Exclusivity upon final milestone release',
      status: VERIFICATION_STATUSES.VERIFIED,
      declarationDate: 'Sep 15, 2026',
      isLegallyCertified: false,
      disclaimer: 'Creator self-declaration. Platform review verifies that stated foundational models permit commercial output under their respective commercial terms.'
    },

    // Audit Trail: Preserves review decisions by authorized reviewers
    auditLog: [
      {
        id: 'aud-1',
        timestamp: 'Oct 06, 2026 • 14:22 UTC',
        reviewer: 'Elena Rostova (Lead Visual Auditor)',
        category: 'Portfolio Authenticity',
        action: 'APPROVED',
        notes: 'Verified original ComfyUI node graph and ProRes 4444 timeline metadata for Echoes of the Solarium.'
      },
      {
        id: 'aud-2',
        timestamp: 'Oct 06, 2026 • 15:10 UTC',
        reviewer: 'Elena Rostova (Lead Visual Auditor)',
        category: 'Creative Workflow',
        action: 'APPROVED',
        notes: 'Verified human involvement checkpoints in Premium Skincare Campaign Pipeline.'
      }
    ]
  };
}
