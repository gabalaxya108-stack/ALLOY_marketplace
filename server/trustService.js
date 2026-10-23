// server/trustService.js
// Server-side authoritative Trust Verification service
// Enforces access control: creators cannot self-approve; private evidence isolated from brands; admin review actions authenticated.

let claimsStore = [
  {
    id: 'claim-maya-email',
    creatorId: 'maya-chen',
    claimType: 'identity',
    claimTitle: 'Email Verification (maya.chen@alloy.market)',
    status: 'verified',
    evidenceType: 'Supabase Auth OTP Challenge',
    evidenceUrl: null,
    evidenceDetails: { method: 'cryptographic_magic_link', email: 'maya.chen@alloy.market' },
    isPrivate: false,
    reviewerNotes: 'Cryptographically confirmed via Supabase Auth email challenge.',
    reviewedBy: 'System Automated Auth',
    reviewedAt: '2026-09-14T10:00:00Z',
    createdAt: '2026-09-14T09:30:00Z',
    updatedAt: '2026-09-14T10:00:00Z'
  },
  {
    id: 'claim-maya-id',
    creatorId: 'maya-chen',
    claimType: 'identity',
    claimTitle: 'Government Identity Verification (UK Passport)',
    status: 'pending_review',
    evidenceType: 'Passport (United Kingdom)',
    evidenceUrl: 'https://vault.alloy.market/private/identity/doc_maya_enc.pdf',
    evidenceDetails: { legalName: 'Maya Li-Wei Chen', jurisdiction: 'United Kingdom (GB)', maskedNumber: '•••••• 8941' },
    isPrivate: true,
    reviewerNotes: 'Government document queued for compliance verification in encrypted storage.',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-10-02T14:15:00Z',
    updatedAt: '2026-10-02T14:15:00Z'
  },
  {
    id: 'claim-maya-solarium',
    creatorId: 'maya-chen',
    claimType: 'portfolio',
    claimTitle: 'Portfolio Authenticity: Echoes of the Solarium',
    status: 'verified',
    evidenceType: 'ComfyUI JSON Graph & 4K ProRes Master',
    evidenceUrl: 'https://vault.alloy.market/audit/solarium_comfy_v4.json',
    evidenceDetails: { projectId: 'maya-proj-1', projectTitle: 'Echoes of the Solarium', seed: 48921104, format: 'ProRes 4444' },
    isPrivate: false,
    reviewerNotes: 'Inspected original node graph and verified seed reproducibility against finished 4K render.',
    reviewedBy: 'Elena Rostova (Lead Visual Auditor)',
    reviewedAt: '2026-10-06T14:22:00Z',
    createdAt: '2026-10-04T11:00:00Z',
    updatedAt: '2026-10-06T14:22:00Z'
  },
  {
    id: 'claim-maya-lumina',
    creatorId: 'maya-chen',
    claimType: 'portfolio',
    claimTitle: 'Portfolio Authenticity: Lumina Botanica Serums',
    status: 'pending_review',
    evidenceType: 'ControlNet Depth Passes & Raw PSD Layers',
    evidenceUrl: 'https://vault.alloy.market/audit/lumina_depth_passes.zip',
    evidenceDetails: { projectId: 'maya-proj-2', projectTitle: 'Lumina Botanica Serums', model: 'Midjourney v6.1 + ControlNet' },
    isPrivate: false,
    reviewerNotes: 'Queued for lead visual auditor inspection of layer depth passes.',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-10-08T09:40:00Z',
    updatedAt: '2026-10-08T09:40:00Z'
  },
  {
    id: 'claim-maya-runway',
    creatorId: 'maya-chen',
    claimType: 'ai_tools',
    claimTitle: 'AI Model Claim: Runway Gen-3 Alpha Kinetic Motion',
    status: 'verified',
    evidenceType: 'Master Timeline Generation Timestamps',
    evidenceUrl: null,
    evidenceDetails: { toolName: 'Runway Gen-3 Alpha', useCase: 'Primary kinetic motion synthesis', associatedWork: 'Echoes of the Solarium' },
    isPrivate: false,
    reviewerNotes: 'Timestamp metadata in ProRes timeline confirms direct Runway export integration.',
    reviewedBy: 'Elena Rostova (Lead Visual Auditor)',
    reviewedAt: '2026-10-06T15:10:00Z',
    createdAt: '2026-10-04T11:00:00Z',
    updatedAt: '2026-10-06T15:10:00Z'
  },
  {
    id: 'claim-maya-comfy',
    creatorId: 'maya-chen',
    claimType: 'ai_tools',
    claimTitle: 'AI Model Claim: ComfyUI / Flux.1 Schnell LoRA',
    status: 'pending_review',
    evidenceType: 'Node Graph Export & Seed Logs',
    evidenceUrl: 'https://vault.alloy.market/audit/flux_lora_refraction.json',
    evidenceDetails: { toolName: 'ComfyUI / Flux.1 Schnell', useCase: 'Custom LoRA fine-tuning for glass refraction' },
    isPrivate: false,
    reviewerNotes: 'Awaiting secondary audit of LoRA training provenance.',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-10-08T16:00:00Z',
    updatedAt: '2026-10-08T16:00:00Z'
  },
  {
    id: 'claim-maya-workflow',
    creatorId: 'maya-chen',
    claimType: 'workflow',
    claimTitle: 'Creative Workflow: Premium Skincare Campaign Pipeline',
    status: 'verified',
    evidenceType: 'Published Workflow Pipeline (7 Steps)',
    evidenceUrl: null,
    evidenceDetails: { workflowId: 'wf-skincare-maya', stepsCount: 7, humanReviewGates: [1, 4, 5, 6] },
    isPrivate: false,
    reviewerNotes: 'Verified human review gates at steps 01, 04, 05, and 06. Tool disclosures correspond to attached generation records.',
    reviewedBy: 'Elena Rostova (Lead Visual Auditor)',
    reviewedAt: '2026-10-06T15:10:00Z',
    createdAt: '2026-10-04T12:00:00Z',
    updatedAt: '2026-10-06T15:10:00Z'
  },
  {
    id: 'claim-maya-licensing',
    creatorId: 'maya-chen',
    claimType: 'commercial_rights',
    claimTitle: 'Commercial Buyout & Model Terms Warranty',
    status: 'verified',
    evidenceType: 'Model Terms of Service Commercial Clearance Disclosure',
    evidenceUrl: null,
    evidenceDetails: {
      licenseTypeGranted: 'Full Commercial Buyout (Worldwide Digital, OOH, Paid Media)',
      exclusivityPeriod: '12 Months Category Exclusivity',
      declarationDate: 'Sep 15, 2026'
    },
    isPrivate: false,
    reviewerNotes: 'Platform review verified that stated foundational models (Flux.1 Pro, Runway Gen-3) permit commercial derivative output under their commercial subscription terms.',
    reviewedBy: 'Platform Legal Operations',
    reviewedAt: '2026-09-15T16:00:00Z',
    createdAt: '2026-09-15T14:00:00Z',
    updatedAt: '2026-09-15T16:00:00Z'
  },

  // -------------------------------------------------------------------------
  // BRAND SEED CLAIMS (Lumina Botanica & Brand Entity Verification)
  // -------------------------------------------------------------------------
  {
    id: 'claim-lumina-email',
    entityType: 'brand',
    entityId: 'brand-demo-lumina',
    creatorId: null,
    brandId: 'brand-demo-lumina',
    claimType: 'entity',
    claimTitle: 'Corporate Domain Email (partnerships@luminabotanica.com)',
    status: 'verified',
    evidenceType: 'Supabase Auth Corporate Domain Challenge',
    evidenceUrl: null,
    evidenceDetails: { method: 'domain_mx_verification', domain: 'luminabotanica.com' },
    isPrivate: false,
    reviewerNotes: 'Official company domain email confirmed via cryptographic token authentication.',
    reviewedBy: 'System Automated Auth',
    reviewedAt: '2026-09-01T10:00:00Z',
    createdAt: '2026-09-01T09:30:00Z',
    updatedAt: '2026-09-01T10:00:00Z'
  },
  {
    id: 'claim-lumina-incorporation',
    entityType: 'brand',
    entityId: 'brand-demo-lumina',
    creatorId: null,
    brandId: 'brand-demo-lumina',
    claimType: 'entity',
    claimTitle: 'UK Business Registration (Companies House #11948201)',
    status: 'verified',
    evidenceType: 'Certificate of Incorporation',
    evidenceUrl: 'https://vault.alloy.market/private/entity/lumina_companies_house.pdf',
    evidenceDetails: {
      legalName: 'Lumina Botanica Labs Ltd',
      jurisdiction: 'United Kingdom (Companies House)',
      regNumber: '•••••• 8201',
      registeredAddress: '14 Berkeley Street, Mayfair, London W1J 8ED'
    },
    isPrivate: true,
    reviewerNotes: 'Corporate registration and Companies House records audited by platform compliance.',
    reviewedBy: 'Platform Legal Operations',
    reviewedAt: '2026-09-10T14:30:00Z',
    createdAt: '2026-09-08T11:00:00Z',
    updatedAt: '2026-09-10T14:30:00Z'
  },
  {
    id: 'claim-lumina-escrow',
    entityType: 'brand',
    entityId: 'brand-demo-lumina',
    creatorId: null,
    brandId: 'brand-demo-lumina',
    claimType: 'payment_escrow',
    claimTitle: 'Campaign Milestone Escrow Facility',
    status: 'verified',
    evidenceType: 'Razorpay Verified Merchant & Corporate Escrow Facility',
    evidenceUrl: null,
    evidenceDetails: {
      escrowTier: 'Tier 1 Verified Milestone Account',
      provider: 'Razorpay Escrow India / International Wire',
      standing: 'Verified Active'
    },
    isPrivate: false,
    reviewerNotes: 'Escrow deposit funding pre-authorized; verified transaction record linked.',
    reviewedBy: 'Finance & Escrow Operations',
    reviewedAt: '2026-09-12T11:00:00Z',
    createdAt: '2026-09-11T10:00:00Z',
    updatedAt: '2026-09-12T11:00:00Z'
  },
  {
    id: 'claim-lumina-brief',
    entityType: 'brand',
    entityId: 'brand-demo-lumina',
    creatorId: null,
    brandId: 'brand-demo-lumina',
    claimType: 'brief_integrity',
    claimTitle: 'Fair Brief Standards & Non-Circumvention Warranty',
    status: 'verified',
    evidenceType: 'Campaign Brief Terms & Buyout Specification',
    evidenceUrl: null,
    evidenceDetails: {
      deliverablesScope: '4K Hero Video + Stills Suite',
      commercialBuyout: 'Worldwide Digital Rights',
      complianceScan: 'CLEAN'
    },
    isPrivate: false,
    reviewerNotes: 'Verified clear milestones and adherence to on-platform payment terms without circumvention.',
    reviewedBy: 'Platform Trust Auditor',
    reviewedAt: '2026-09-15T09:00:00Z',
    createdAt: '2026-09-14T15:00:00Z',
    updatedAt: '2026-09-15T09:00:00Z'
  },
  {
    id: 'claim-lumina-care',
    entityType: 'brand',
    entityId: 'brand-demo-lumina',
    creatorId: null,
    brandId: 'brand-demo-lumina',
    claimType: 'creator_care',
    claimTitle: 'Creator Care & Prompt Milestone Approvals Record',
    status: 'verified',
    evidenceType: 'Historical Milestone Approvals (48h average review)',
    evidenceUrl: null,
    evidenceDetails: {
      avgApprovalTime: '36 hours',
      disputeCount: 0,
      completedCollaborationsCount: 8
    },
    isPrivate: false,
    reviewerNotes: 'Track record indicates average review under 48 hours and zero revision freezes.',
    reviewedBy: 'Community Relations Operations',
    reviewedAt: '2026-09-20T12:00:00Z',
    createdAt: '2026-09-18T10:00:00Z',
    updatedAt: '2026-09-20T12:00:00Z'
  }
];

let auditLogStore = [
  {
    id: 'aud-1',
    claimId: 'claim-maya-solarium',
    creatorId: 'maya-chen',
    reviewerName: 'Elena Rostova (Lead Visual Auditor)',
    action: 'APPROVED',
    notes: 'Verified original ComfyUI node graph and ProRes 4444 timeline metadata for Echoes of the Solarium.',
    createdAt: '2026-10-06T14:22:00Z'
  },
  {
    id: 'aud-2',
    claimId: 'claim-maya-workflow',
    creatorId: 'maya-chen',
    reviewerName: 'Elena Rostova (Lead Visual Auditor)',
    action: 'APPROVED',
    notes: 'Verified human involvement checkpoints in Premium Skincare Campaign Pipeline.',
    createdAt: '2026-10-06T15:10:00Z'
  },
  {
    id: 'aud-3',
    claimId: 'claim-maya-licensing',
    creatorId: 'maya-chen',
    reviewerName: 'Platform Legal Operations',
    action: 'APPROVED',
    notes: 'Confirmed commercial foundational model tier permits unrestricted commercial deliverables.',
    createdAt: '2026-09-15T16:00:00Z'
  },
  {
    id: 'aud-b1',
    claimId: 'claim-lumina-incorporation',
    brandId: 'brand-demo-lumina',
    reviewerName: 'Platform Legal Operations',
    action: 'APPROVED',
    notes: 'Verified certificate of incorporation against UK Companies House records.',
    createdAt: '2026-09-10T14:30:00Z'
  },
  {
    id: 'aud-b2',
    claimId: 'claim-lumina-escrow',
    brandId: 'brand-demo-lumina',
    reviewerName: 'Finance & Escrow Operations',
    action: 'APPROVED',
    notes: 'Escrow account pre-authorization verified with payment provider.',
    createdAt: '2026-09-12T11:00:00Z'
  }
];

/**
 * Fetch claims with privacy isolation (supports creator and brand accounts)
 */
export function getVerificationClaims({
  creatorId = null,
  brandId = null,
  entityId = null,
  entityType = null,
  isAdmin = false,
  userRole = null,
  currentUserId = null,
  requestingUserId = null
}) {
  let list = claimsStore;

  const targetId = entityId || brandId || creatorId;
  if (targetId) {
    list = list.filter(c =>
      c.entityId === targetId ||
      c.creatorId === targetId ||
      c.brandId === targetId ||
      (typeof targetId === 'string' && targetId.includes('lumina') && ((c.brandId && c.brandId.includes('lumina')) || (c.entityId && c.entityId.includes('lumina'))))
    );
  }

  if (entityType) {
    list = list.filter(c => (c.entityType || 'creator') === entityType);
  }

  const effectiveAdmin = isAdmin || userRole === 'admin';
  const effectiveUserId = currentUserId || requestingUserId;

  // If not admin, sanitize private claims so unverified third-parties never see confidential document URLs or full tax numbers
  return list.map(c => {
    const isOwner = effectiveUserId && (
      effectiveUserId === c.creatorId ||
      effectiveUserId === c.brandId ||
      effectiveUserId === c.entityId
    );

    if (c.isPrivate && !effectiveAdmin && !isOwner) {
      return {
        ...c,
        evidenceUrl: null,
        evidenceDetails: {
          masked: true,
          taxIdMasked: c.evidenceDetails?.taxIdMasked || '•••••• 8201',
          jurisdiction: c.evidenceDetails?.jurisdiction || 'Government / Corporate Document',
          maskedNumber: c.evidenceDetails?.maskedNumber || c.evidenceDetails?.regNumber || '•••••• Confidential'
        }
      };
    }
    return c;
  });
}

/**
 * Submit verification claim (creators & brands can submit; status is strictly pending_review)
 */
export function submitVerificationClaim(payload, userRole = null) {
  const claimType = payload.claimType || payload.category;
  const claimTitle = payload.claimTitle || payload.title;
  const entityId = payload.entityId || payload.brandId || payload.creatorId;
  const entityType = payload.entityType || (payload.brandId || (entityId && entityId.startsWith('brand-')) ? 'brand' : 'creator');

  if (!payload || !entityId || !claimType || !claimTitle) {
    throw new Error('Missing required fields: entity identifier, claimType, and claimTitle are required.');
  }

  // SECURITY ENFORCEMENT: An account holder cannot mark their own claim as verified!
  const status = (payload.status === 'self_declared') ? 'self_declared' : 'pending_review';

  const newClaim = {
    id: payload.id || `claim-${entityId}-${claimType}-${Date.now()}`,
    entityType,
    entityId,
    creatorId: entityType === 'creator' ? entityId : (payload.creatorId || null),
    brandId: entityType === 'brand' ? entityId : (payload.brandId || null),
    claimType,
    claimTitle,
    status,
    evidenceType: payload.evidenceType || 'Submitted Documentation',
    evidenceUrl: payload.evidenceUrl || null,
    evidenceDetails: payload.evidenceDetails || {},
    isPrivate: !!payload.isPrivate,
    reviewerNotes: 'Queued for compliance review.',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Replace existing claim of same ID if resubmitting, else prepend
  const existingIdx = claimsStore.findIndex(c => c.id === newClaim.id);
  if (existingIdx >= 0) {
    claimsStore[existingIdx] = newClaim;
  } else {
    claimsStore.unshift(newClaim);
  }

  // Add submission to audit log
  auditLogStore.unshift({
    id: `aud-${Date.now()}`,
    claimId: newClaim.id,
    entityId,
    creatorId: newClaim.creatorId,
    brandId: newClaim.brandId,
    reviewerName: payload.creatorName || payload.brandName || entityId,
    action: 'SUBMITTED',
    notes: `Submitted verification evidence for "${newClaim.claimTitle}".`,
    createdAt: new Date().toISOString()
  });

  return newClaim;
}

/**
 * Review claim (Admin / Authorized Reviewer only)
 */
export function reviewVerificationClaim({
  claimId,
  decision,
  notes = '',
  reviewerName = 'Platform Auditor',
  isAuthorized = false
}) {
  // SECURITY ENFORCEMENT: Enforce permissions on the backend
  if (!isAuthorized) {
    const error = new Error('UNAUTHORIZED: Only authorized platform reviewers and administrators can approve or reject verification claims.');
    error.statusCode = 403;
    throw error;
  }

  const claim = claimsStore.find(c => c.id === claimId);
  if (!claim) {
    const error = new Error(`Verification claim with ID "${claimId}" not found.`);
    error.statusCode = 404;
    throw error;
  }

  const dec = String(decision || '').toUpperCase();
  let newStatus = claim.status;
  let auditAction = 'REQUEST_INFO';

  if (dec === 'APPROVE' || dec === 'VERIFIED') {
    newStatus = 'verified';
    auditAction = 'APPROVED';
  } else if (dec === 'REJECT' || dec === 'UNABLE_TO_VERIFY') {
    newStatus = 'unable_to_verify';
    auditAction = 'REJECTED';
  } else if (dec === 'REQUEST_INFO' || dec === 'NEEDS_RENEWAL') {
    newStatus = 'needs_renewal';
    auditAction = 'REQUEST_INFO';
  } else {
    throw new Error(`Invalid decision "${decision}". Supported: APPROVE, REJECT, REQUEST_INFO.`);
  }

  const now = new Date().toISOString();
  claim.status = newStatus;
  claim.reviewerNotes = notes || (decision === 'APPROVE' ? 'Evidence verified against platform standards.' : 'Additional evidence requested.');
  claim.reviewedBy = reviewerName;
  claim.reviewedAt = now;
  claim.updatedAt = now;

  const auditEntry = {
    id: `aud-${Date.now()}`,
    claimId: claim.id,
    entityId: claim.entityId,
    creatorId: claim.creatorId,
    brandId: claim.brandId,
    reviewerName,
    action: auditAction,
    notes: claim.reviewerNotes,
    createdAt: now
  };

  auditLogStore.unshift(auditEntry);

  return { claim, auditEntry };
}

/**
 * Fetch audit log
 */
export function getVerificationAuditLog({ creatorId = null, brandId = null, entityId = null }) {
  const targetId = entityId || brandId || creatorId;
  if (targetId) {
    return auditLogStore.filter(a =>
      a.entityId === targetId ||
      a.creatorId === targetId ||
      a.brandId === targetId
    );
  }
  return auditLogStore;
}

