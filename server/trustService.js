// server/trustService.js
// Server-side authoritative Trust Verification service
// Enforces access control: creators cannot self-approve; private evidence isolated from brands; admin review actions authenticated.
// Integrated with server-side Groq AI advisory analysis and Supabase verification persistence.

import { analyzeVerificationClaim } from './trustAiReview.js';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function getSupabaseClient() {
  try {
    let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    let key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.replace(/\r/g, '').split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const idx = trimmed.indexOf('=');
            if (idx !== -1) {
              const k = trimmed.slice(0, idx).trim();
              const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
              process.env[k] = v;
            }
          }
        });
        url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      }
    }

    if (url && key && url.startsWith('https://')) {
      return createClient(url, key, { auth: { persistSession: false } });
    }
  } catch (err) {
    console.warn('[Trust Service] Supabase init note:', err.message);
  }
  return null;
}

let claimsStore = [
  {
    id: 'claim-maya-email',
    creatorId: 'maya-chen',
    entityType: 'creator',
    entityId: 'maya-chen',
    claimType: 'identity',
    claimTitle: 'Email Verification (maya.chen@alloy.market)',
    status: 'verified',
    evidenceType: 'Supabase Auth OTP Challenge',
    evidenceUrl: null,
    evidenceDetails: { 
      method: 'cryptographic_magic_link', 
      email: 'maya.chen@alloy.market',
      aiReview: {
        status: 'completed',
        model: 'openai/gpt-oss-120b',
        reviewed_at: '2026-09-14T09:35:00Z',
        risk_indicator: 'low',
        confidence: 'high',
        findings: ['Cryptographic magic link OTP confirmed against verified user profile.', 'Registered domain corresponds to authorized platform creator.'],
        missing_evidence: [],
        inconsistencies: [],
        advisory_notes: 'Identity channel authenticated. Recommended for email-verified badge.'
      }
    },
    aiReview: {
      status: 'completed',
      model: 'openai/gpt-oss-120b',
      reviewed_at: '2026-09-14T09:35:00Z',
      risk_indicator: 'low',
      confidence: 'high',
      findings: ['Cryptographic magic link OTP confirmed against verified user profile.', 'Registered domain corresponds to authorized platform creator.'],
      missing_evidence: [],
      inconsistencies: [],
      advisory_notes: 'Identity channel authenticated. Recommended for email-verified badge.'
    },
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
    entityType: 'creator',
    entityId: 'maya-chen',
    claimType: 'identity',
    claimTitle: 'Government Identity Verification (UK Passport)',
    status: 'pending_review',
    evidenceType: 'Passport (United Kingdom)',
    evidenceUrl: 'https://vault.alloy.market/private/identity/doc_maya_enc.pdf',
    evidenceDetails: { 
      legalName: 'Maya Li-Wei Chen', 
      jurisdiction: 'United Kingdom (GB)', 
      maskedNumber: '•••••• 8941',
      aiReview: {
        status: 'completed',
        model: 'openai/gpt-oss-120b',
        reviewed_at: '2026-10-02T14:18:00Z',
        risk_indicator: 'low',
        confidence: 'high',
        findings: ['Legal name matches registered creator handle and payment account.', 'Valid UK jurisdiction format detected with masked passport number.'],
        missing_evidence: ['Requires human compliance officer to inspect encrypted document signature.'],
        inconsistencies: [],
        advisory_notes: 'Evidence conforms to confidential personhood verification standards. Super Admin approval recommended.'
      }
    },
    aiReview: {
      status: 'completed',
      model: 'openai/gpt-oss-120b',
      reviewed_at: '2026-10-02T14:18:00Z',
      risk_indicator: 'low',
      confidence: 'high',
      findings: ['Legal name matches registered creator handle and payment account.', 'Valid UK jurisdiction format detected with masked passport number.'],
      missing_evidence: ['Requires human compliance officer to inspect encrypted document signature.'],
      inconsistencies: [],
      advisory_notes: 'Evidence conforms to confidential personhood verification standards. Super Admin approval recommended.'
    },
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
    entityType: 'creator',
    entityId: 'maya-chen',
    claimType: 'portfolio',
    claimTitle: 'Portfolio Authenticity: Echoes of the Solarium',
    status: 'verified',
    evidenceType: 'ComfyUI JSON Graph & 4K ProRes Master',
    evidenceUrl: 'https://vault.alloy.market/audit/solarium_comfy_v4.json',
    evidenceDetails: { 
      projectId: 'maya-proj-1', 
      projectTitle: 'Echoes of the Solarium', 
      seed: 48921104, 
      format: 'ProRes 4444',
      aiReview: {
        status: 'completed',
        model: 'openai/gpt-oss-120b',
        reviewed_at: '2026-10-04T11:05:00Z',
        risk_indicator: 'low',
        confidence: 'high',
        findings: ['ComfyUI JSON workflow contains 28 node connections confirming original synthesis.', 'Generation seed 48921104 and ProRes 4444 frame rates are fully consistent.'],
        missing_evidence: [],
        inconsistencies: [],
        advisory_notes: 'High workflow authenticity confidence. Genuine generative project confirmed.'
      }
    },
    aiReview: {
      status: 'completed',
      model: 'openai/gpt-oss-120b',
      reviewed_at: '2026-10-04T11:05:00Z',
      risk_indicator: 'low',
      confidence: 'high',
      findings: ['ComfyUI JSON workflow contains 28 node connections confirming original synthesis.', 'Generation seed 48921104 and ProRes 4444 frame rates are fully consistent.'],
      missing_evidence: [],
      inconsistencies: [],
      advisory_notes: 'High workflow authenticity confidence. Genuine generative project confirmed.'
    },
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
    entityType: 'creator',
    entityId: 'maya-chen',
    claimType: 'portfolio',
    claimTitle: 'Portfolio Authenticity: Lumina Botanica Serums',
    status: 'pending_review',
    evidenceType: 'ControlNet Depth Passes & Raw PSD Layers',
    evidenceUrl: 'https://vault.alloy.market/audit/lumina_depth_passes.zip',
    evidenceDetails: { 
      projectId: 'maya-proj-2', 
      projectTitle: 'Lumina Botanica Serums', 
      model: 'Midjourney v6.1 + ControlNet',
      aiReview: {
        status: 'completed',
        model: 'openai/gpt-oss-120b',
        reviewed_at: '2026-10-08T09:44:00Z',
        risk_indicator: 'medium',
        confidence: 'moderate',
        findings: ['Layer depth passes provided for Lumina Serums commercial mockup.', 'ControlNet edge guidance confirmed in multi-pass export.'],
        missing_evidence: ['Full resolution master PSD with unflattened adjustment layers recommended.'],
        inconsistencies: [],
        advisory_notes: 'Evidence supports original asset creation. Additional master layer review suggested.'
      }
    },
    aiReview: {
      status: 'completed',
      model: 'openai/gpt-oss-120b',
      reviewed_at: '2026-10-08T09:44:00Z',
      risk_indicator: 'medium',
      confidence: 'moderate',
      findings: ['Layer depth passes provided for Lumina Serums commercial mockup.', 'ControlNet edge guidance confirmed in multi-pass export.'],
      missing_evidence: ['Full resolution master PSD with unflattened adjustment layers recommended.'],
      inconsistencies: [],
      advisory_notes: 'Evidence supports original asset creation. Additional master layer review suggested.'
    },
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
    entityType: 'creator',
    entityId: 'maya-chen',
    claimType: 'ai_tools',
    claimTitle: 'AI Model Claim: Runway Gen-3 Alpha Kinetic Motion',
    status: 'verified',
    evidenceType: 'Master Timeline Generation Timestamps',
    evidenceUrl: null,
    evidenceDetails: { 
      toolName: 'Runway Gen-3 Alpha', 
      useCase: 'Primary kinetic motion synthesis', 
      associatedWork: 'Echoes of the Solarium',
      aiReview: {
        status: 'completed',
        model: 'openai/gpt-oss-120b',
        reviewed_at: '2026-10-04T11:05:00Z',
        risk_indicator: 'low',
        confidence: 'high',
        findings: ['Timeline timestamps match Runway Gen-3 rendering metadata directly.', 'Commercial motion generation disclosure matches final delivery.'],
        missing_evidence: [],
        inconsistencies: [],
        advisory_notes: 'Valid model disclosure. Verified for tool claim badge.'
      }
    },
    aiReview: {
      status: 'completed',
      model: 'openai/gpt-oss-120b',
      reviewed_at: '2026-10-04T11:05:00Z',
      risk_indicator: 'low',
      confidence: 'high',
      findings: ['Timeline timestamps match Runway Gen-3 rendering metadata directly.', 'Commercial motion generation disclosure matches final delivery.'],
      missing_evidence: [],
      inconsistencies: [],
      advisory_notes: 'Valid model disclosure. Verified for tool claim badge.'
    },
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
    entityType: 'creator',
    entityId: 'maya-chen',
    claimType: 'ai_tools',
    claimTitle: 'AI Model Claim: ComfyUI / Flux.1 Schnell LoRA',
    status: 'pending_review',
    evidenceType: 'Node Graph Export & Seed Logs',
    evidenceUrl: 'https://vault.alloy.market/audit/flux_lora_refraction.json',
    evidenceDetails: { 
      toolName: 'ComfyUI / Flux.1 Schnell', 
      useCase: 'Custom LoRA fine-tuning for glass refraction',
      aiReview: {
        status: 'completed',
        model: 'openai/gpt-oss-120b',
        reviewed_at: '2026-10-08T16:05:00Z',
        risk_indicator: 'low',
        confidence: 'high',
        findings: ['Flux.1 Schnell node graph export verified with custom LoRA weights reference.', 'Prompt logs contain exact prompt syntax for refraction styling.'],
        missing_evidence: [],
        inconsistencies: [],
        advisory_notes: 'Consistent model disclosure. Conforms to AI tools pillar criteria.'
      }
    },
    aiReview: {
      status: 'completed',
      model: 'openai/gpt-oss-120b',
      reviewed_at: '2026-10-08T16:05:00Z',
      risk_indicator: 'low',
      confidence: 'high',
      findings: ['Flux.1 Schnell node graph export verified with custom LoRA weights reference.', 'Prompt logs contain exact prompt syntax for refraction styling.'],
      missing_evidence: [],
      inconsistencies: [],
      advisory_notes: 'Consistent model disclosure. Conforms to AI tools pillar criteria.'
    },
    isPrivate: false,
    reviewerNotes: 'Awaiting secondary audit of LoRA training provenance.',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-10-08T16:00:00Z',
    updatedAt: '2026-10-08T16:00:00Z'
  },
  {
    id: 'claim-maya-licensing',
    creatorId: 'maya-chen',
    entityType: 'creator',
    entityId: 'maya-chen',
    claimType: 'commercial_rights',
    claimTitle: 'Commercial Buyout & Model Terms Warranty',
    status: 'verified',
    evidenceType: 'Model Terms of Service Commercial Clearance Disclosure',
    evidenceUrl: null,
    evidenceDetails: {
      licenseTypeGranted: 'Full Commercial Buyout (Worldwide Digital, OOH, Paid Media)',
      exclusivityPeriod: '12 Months Category Exclusivity',
      declarationDate: 'Sep 15, 2026',
      aiReview: {
        status: 'completed',
        model: 'openai/gpt-oss-120b',
        reviewed_at: '2026-09-15T14:05:00Z',
        risk_indicator: 'low',
        confidence: 'high',
        findings: ['Flux.1 Pro and Runway commercial enterprise terms permit full derivative buyout.', 'Warranty disclaimer matches platform legal template requirements.'],
        missing_evidence: [],
        inconsistencies: [],
        advisory_notes: 'Commercial licensing scope verified. Recommended for commercial rights badge.'
      }
    },
    aiReview: {
      status: 'completed',
      model: 'openai/gpt-oss-120b',
      reviewed_at: '2026-09-15T14:05:00Z',
      risk_indicator: 'low',
      confidence: 'high',
      findings: ['Flux.1 Pro and Runway commercial enterprise terms permit full derivative buyout.', 'Warranty disclaimer matches platform legal template requirements.'],
      missing_evidence: [],
      inconsistencies: [],
      advisory_notes: 'Commercial licensing scope verified. Recommended for commercial rights badge.'
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
    claimType: 'identity',
    claimTitle: 'Corporate Domain Email (partnerships@luminabotanica.com)',
    status: 'verified',
    evidenceType: 'Supabase Auth Corporate Domain Challenge',
    evidenceUrl: null,
    evidenceDetails: { 
      method: 'domain_mx_verification', 
      domain: 'luminabotanica.com',
      aiReview: {
        status: 'completed',
        model: 'openai/gpt-oss-120b',
        reviewed_at: '2026-09-01T09:35:00Z',
        risk_indicator: 'low',
        confidence: 'high',
        findings: ['Corporate domain MX records resolve to active corporate mailserver.', 'Email authentication challenge confirmed.'],
        missing_evidence: [],
        inconsistencies: [],
        advisory_notes: 'Domain email authenticated.'
      }
    },
    aiReview: {
      status: 'completed',
      model: 'openai/gpt-oss-120b',
      reviewed_at: '2026-09-01T09:35:00Z',
      risk_indicator: 'low',
      confidence: 'high',
      findings: ['Corporate domain MX records resolve to active corporate mailserver.', 'Email authentication challenge confirmed.'],
      missing_evidence: [],
      inconsistencies: [],
      advisory_notes: 'Domain email authenticated.'
    },
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
    claimType: 'identity',
    claimTitle: 'UK Business Registration (Companies House #11948201)',
    status: 'verified',
    evidenceType: 'Certificate of Incorporation',
    evidenceUrl: 'https://vault.alloy.market/private/entity/lumina_companies_house.pdf',
    evidenceDetails: {
      legalName: 'Lumina Botanica Labs Ltd',
      jurisdiction: 'United Kingdom (Companies House)',
      regNumber: '•••••• 8201',
      registeredAddress: '14 Berkeley Street, Mayfair, London W1J 8ED',
      aiReview: {
        status: 'completed',
        model: 'openai/gpt-oss-120b',
        reviewed_at: '2026-09-08T11:05:00Z',
        risk_indicator: 'low',
        confidence: 'high',
        findings: ['Legal entity registration aligns with official UK Companies House format.', 'Registered address matches verified billing profile.'],
        missing_evidence: [],
        inconsistencies: [],
        advisory_notes: 'Business entity document verified.'
      }
    },
    aiReview: {
      status: 'completed',
      model: 'openai/gpt-oss-120b',
      reviewed_at: '2026-09-08T11:05:00Z',
      risk_indicator: 'low',
      confidence: 'high',
      findings: ['Legal entity registration aligns with official UK Companies House format.', 'Registered address matches verified billing profile.'],
      missing_evidence: [],
      inconsistencies: [],
      advisory_notes: 'Business entity document verified.'
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
    claimType: 'commercial_rights',
    claimTitle: 'Campaign Milestone Escrow Facility',
    status: 'verified',
    evidenceType: 'Razorpay Verified Merchant & Corporate Escrow Facility',
    evidenceUrl: null,
    evidenceDetails: {
      escrowTier: 'Tier 1 Verified Milestone Account',
      provider: 'Razorpay Escrow India / International Wire',
      standing: 'Verified Active',
      aiReview: {
        status: 'completed',
        model: 'openai/gpt-oss-120b',
        reviewed_at: '2026-09-11T10:05:00Z',
        risk_indicator: 'low',
        confidence: 'high',
        findings: ['Payment gateway merchant ID verified for milestone escrow settlement.', 'Active deposit record present on platform ledger.'],
        missing_evidence: [],
        inconsistencies: [],
        advisory_notes: 'Payment and escrow facilities active.'
      }
    },
    aiReview: {
      status: 'completed',
      model: 'openai/gpt-oss-120b',
      reviewed_at: '2026-09-11T10:05:00Z',
      risk_indicator: 'low',
      confidence: 'high',
      findings: ['Payment gateway merchant ID verified for milestone escrow settlement.', 'Active deposit record present on platform ledger.'],
      missing_evidence: [],
      inconsistencies: [],
      advisory_notes: 'Payment and escrow facilities active.'
    },
    isPrivate: false,
    reviewerNotes: 'Escrow deposit funding pre-authorized; verified transaction record linked.',
    reviewedBy: 'Finance & Escrow Operations',
    reviewedAt: '2026-09-12T11:00:00Z',
    createdAt: '2026-09-11T10:00:00Z',
    updatedAt: '2026-09-12T11:00:00Z'
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
  pillar = null,
  claimType = null,
  status = null,
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

  if (entityType && entityType !== 'all') {
    list = list.filter(c => (c.entityType || 'creator') === entityType);
  }

  const requestedPillar = pillar || claimType;
  if (requestedPillar && requestedPillar !== 'all') {
    list = list.filter(c => c.claimType === requestedPillar);
  }

  if (status && status !== 'all') {
    list = list.filter(c => c.status === status);
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
          taxIdMasked: true,
          jurisdiction: c.evidenceDetails?.jurisdiction || 'Confidential Compliance Document',
          maskedNumber: c.evidenceDetails?.maskedNumber || c.evidenceDetails?.regNumber || '•••••• Confidential',
          aiReview: c.evidenceDetails?.aiReview ? {
            status: c.evidenceDetails.aiReview.status,
            risk_indicator: c.evidenceDetails.aiReview.risk_indicator,
            reviewed_at: c.evidenceDetails.aiReview.reviewed_at
          } : undefined
        }
      };
    }
    return c;
  });
}

/**
 * Submit verification claim (creators & brands can submit; status is strictly pending_review)
 * Triggers server-side Groq AI evidence analysis automatically and syncs to Supabase.
 * Returns a dual Promise/Object compatible with both synchronous and async callers.
 */
export function submitVerificationClaim(payload, userRole = null) {
  const claimType = payload.claimType || payload.category || payload.pillar;
  const claimTitle = payload.claimTitle || payload.title || (claimType ? `${claimType.replace(/_/g, ' ').toUpperCase()} Verification Claim` : 'Verification Submission');
  const entityId = payload.entityId || payload.brandId || payload.creatorId;
  const entityType = payload.entityType || (payload.brandId || (entityId && entityId.startsWith('brand-')) ? 'brand' : 'creator');

  if (!payload || !entityId || !claimType) {
    throw new Error('Missing required fields: entity identifier, and claimType (or pillar) are required.');
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

  const baseResult = { ok: true, claim: newClaim, ...newClaim };

  const asyncWork = async () => {
    // Run server-side AI advisory review
    try {
      const aiReview = await analyzeVerificationClaim(newClaim);
      newClaim.aiReview = aiReview;
      newClaim.evidenceDetails = {
        ...newClaim.evidenceDetails,
        aiReview
      };
    } catch (aiErr) {
      console.warn('[Trust Service] AI analysis error notice:', aiErr.message);
      newClaim.aiReview = {
        status: 'failed',
        model: null,
        reviewed_at: new Date().toISOString(),
        risk_indicator: 'inconclusive',
        findings: ['AI review encountered an error. Queued for manual auditor review.'],
        missing_evidence: [],
        inconsistencies: [],
        advisory_notes: 'Manual Super Admin inspection required.'
      };
    }

    // Persist creator claim to Supabase verification_claims if possible
    const sb = getSupabaseClient();
    if (sb && entityType === 'creator') {
      try {
        await sb.from('verification_claims').upsert({
          id: newClaim.id,
          creator_id: newClaim.creatorId,
          claim_type: newClaim.claimType,
          claim_title: newClaim.claimTitle,
          status: newClaim.status,
          evidence_type: newClaim.evidenceType,
          evidence_url: newClaim.evidenceUrl,
          evidence_details: newClaim.evidenceDetails,
          is_private: newClaim.isPrivate,
          reviewer_notes: newClaim.reviewerNotes,
          reviewed_by: newClaim.reviewedBy,
          reviewed_at: newClaim.reviewedAt,
          created_at: newClaim.createdAt,
          updated_at: newClaim.updatedAt
        });
      } catch (dbErr) {
        console.warn('[Trust Service] Supabase upsert note:', dbErr.message);
      }
    }

    return { ok: true, claim: newClaim, ...newClaim };
  };

  const promise = asyncWork();
  Object.assign(promise, baseResult);
  return promise;
}

/**
 * Review claim (Super Admin / Authorized Reviewer only)
 * Returns a dual Promise/Object compatible with both synchronous and async callers.
 */
export function reviewVerificationClaim({
  claimId,
  decision,
  notes = '',
  reviewerName = 'Platform Auditor',
  isAuthorized = false
}) {
  // SECURITY ENFORCEMENT: Enforce permissions on the backend synchronously
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

  if (dec === 'APPROVE' || dec === 'APPROVED' || dec === 'VERIFIED') {
    newStatus = 'verified';
    auditAction = 'APPROVED';
  } else if (dec === 'REJECT' || dec === 'REJECTED' || dec === 'UNABLE_TO_VERIFY') {
    newStatus = 'unable_to_verify';
    auditAction = 'REJECTED';
  } else if (dec === 'REQUEST_INFO' || dec === 'NEEDS_INFO' || dec === 'NEEDS_RENEWAL') {
    newStatus = 'needs_renewal';
    auditAction = 'REQUEST_INFO';
  } else {
    throw new Error(`Invalid decision "${decision}". Supported: APPROVE, REJECT, REQUEST_INFO.`);
  }

  const now = new Date().toISOString();
  claim.status = newStatus;
  claim.reviewerNotes = notes || (dec === 'APPROVE' ? 'Evidence verified against platform standards.' : 'Additional evidence requested.');
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

  const resultPayload = { ok: true, claim, auditEntry };

  const asyncSync = async () => {
    // Sync to Supabase
    const sb = getSupabaseClient();
    if (sb) {
      try {
        if (claim.entityType === 'creator' && claim.creatorId) {
          // 1. Update verification_claims row
          await sb.from('verification_claims').update({
            status: newStatus,
            reviewer_notes: claim.reviewerNotes,
            reviewed_by: reviewerName,
            reviewed_at: now,
            updated_at: now
          }).eq('id', claimId);

          // 2. If approved, sync creator_profiles status
          if (newStatus === 'verified') {
            const { data: creatorRow } = await sb.from('creator_profiles').select('trust_verification, commercial_licensing_verified').eq('id', claim.creatorId).maybeSingle();
            const currentTv = (creatorRow && creatorRow.trust_verification) ? creatorRow.trust_verification : {};

            if (claim.claimType === 'identity') {
              currentTv.identity = { status: 'verified', reviewedAt: now, notes: claim.reviewerNotes };
            } else if (claim.claimType === 'portfolio') {
              currentTv.portfolioEvidence = [...(currentTv.portfolioEvidence || []).filter(e => e.id !== claimId), { id: claimId, status: 'verified', reviewedAt: now }];
            } else if (claim.claimType === 'ai_tools') {
              currentTv.toolsStatus = 'verified';
            } else if (claim.claimType === 'commercial_rights') {
              currentTv.licensing = { status: 'verified', declarationDate: now };
            }

            const updatePayload = {
              trust_verification: currentTv,
              updated_at: now
            };
            if (claim.claimType === 'commercial_rights') {
              updatePayload.commercial_licensing_verified = true;
            }

            await sb.from('creator_profiles').update(updatePayload).eq('id', claim.creatorId);
          }
        }
      } catch (dbErr) {
        console.warn('[Trust Service] Supabase decision sync note:', dbErr.message);
      }
    }
    return resultPayload;
  };

  const promise = asyncSync();
  Object.assign(promise, resultPayload);
  return promise;
}

/**
 * Triggers or re-runs AI advisory review on an existing claim
 */
export async function runClaimAiReview({ claimId }) {
  const claim = claimsStore.find(c => c.id === claimId);
  if (!claim) {
    const error = new Error(`Verification claim with ID "${claimId}" not found.`);
    error.statusCode = 404;
    throw error;
  }

  const aiReview = await analyzeVerificationClaim(claim);
  claim.aiReview = aiReview;
  claim.evidenceDetails = {
    ...claim.evidenceDetails,
    aiReview
  };
  claim.updatedAt = new Date().toISOString();

  // Persist to Supabase if applicable
  const sb = getSupabaseClient();
  if (sb && claim.entityType === 'creator') {
    try {
      await sb.from('verification_claims').update({
        evidence_details: claim.evidenceDetails,
        updated_at: claim.updatedAt
      }).eq('id', claimId);
    } catch (err) {
      console.warn('[Trust Service] Supabase AI review sync notice:', err.message);
    }
  }

  return { ok: true, claim, aiReview };
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
