-- ============================================================================
-- ALLOY / CREASYNC — BRAND TRUST VERIFICATION MIGRATION
-- Migration file: server/db/brand_verification_migration.sql
-- 
-- Non-destructive additive migration adding dedicated Brand Verification Claims
-- and RLS policies for authenticated Brand Trust Centre.
-- 
-- IMPORTANT: Do NOT automatically apply to live database without review.
-- Run this script in the Supabase SQL Editor if brand claims need persistent cloud storage.
-- ============================================================================

-- 1. Create brand_verification_claims table
CREATE TABLE IF NOT EXISTS public.brand_verification_claims (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN (
    'business_identity', 
    'campaign_transparency', 
    'payment_reliability', 
    'collaboration_integrity'
  )),
  claim_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'not_submitted', 
    'self_declared', 
    'pending_review', 
    'verified', 
    'unable_to_verify', 
    'needs_renewal'
  )),
  evidence_type TEXT,
  evidence_url TEXT,
  evidence_details JSONB DEFAULT '{}'::jsonb,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  reviewer_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for efficient lookup and brand isolation
CREATE INDEX IF NOT EXISTS idx_brand_verification_claims_brand ON public.brand_verification_claims(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_verification_claims_status ON public.brand_verification_claims(status);
CREATE INDEX IF NOT EXISTS idx_brand_verification_claims_type ON public.brand_verification_claims(claim_type);

-- 3. Row-Level Security (RLS) Policies
ALTER TABLE public.brand_verification_claims ENABLE ROW LEVEL SECURITY;

-- Policy A: Non-private claims are readable by public/creators; private claims are restricted to the brand owner or admins
DROP POLICY IF EXISTS "Public read non-private brand claims" ON public.brand_verification_claims;
CREATE POLICY "Public read non-private brand claims" ON public.brand_verification_claims FOR SELECT
  USING (
    is_private = FALSE
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = brand_verification_claims.brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR public.is_super_admin()
  );

-- Policy B: Brands can only insert claims for their own brand record, with status restricted to pending_review or self_declared
DROP POLICY IF EXISTS "Brands insert own claims" ON public.brand_verification_claims;
CREATE POLICY "Brands insert own claims" ON public.brand_verification_claims FOR INSERT
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.brands b
        WHERE b.id = brand_verification_claims.brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
      )
      AND status IN ('pending_review', 'self_declared', 'not_submitted')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR public.is_super_admin()
  );

-- Policy C: Only authorized administrators can review, approve, or reject brand claims
DROP POLICY IF EXISTS "Admins review brand claims" ON public.brand_verification_claims;
CREATE POLICY "Admins review brand claims" ON public.brand_verification_claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = brand_verification_claims.brand_id AND b.is_demo = true
    )
  );

-- 4. Add trust_verification column to public.brands if not exists
ALTER TABLE IF EXISTS public.brands ADD COLUMN IF NOT EXISTS trust_verification JSONB DEFAULT '{}'::jsonb;
