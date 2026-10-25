-- ============================================================================
-- MIGRATION: 20261024_creator_dna_backend.sql
-- ALLOY / CREASYNC — Dynamic Creator DNA Analysis, Feature Evidence & Trait Aggregation
-- Review and execute this script in Supabase SQL Editor to support the dynamic
-- Creator DNA backend pipeline.
-- ============================================================================

-- 1. Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Creator DNA Analyses Table (Job Lifecycle & Session Summary)
CREATE TABLE IF NOT EXISTS public.creator_dna_analyses (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'insufficient_evidence')),
  eligible_asset_count INT NOT NULL DEFAULT 0,
  analysis_version TEXT NOT NULL DEFAULT '2.0.0',
  summary JSONB DEFAULT '{}'::jsonb,
  error_details JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_dna_analyses_creator ON public.creator_dna_analyses(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_dna_analyses_status ON public.creator_dna_analyses(status);

-- 3. Aggregated Creator DNA Traits Table (Output traits displayed in Creator Studio)
CREATE TABLE IF NOT EXISTS public.creator_dna_traits (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL REFERENCES public.creator_dna_analyses(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  trait_key TEXT NOT NULL,
  display_label TEXT NOT NULL,
  category TEXT NOT NULL,
  prevalence_score INT NOT NULL CHECK (prevalence_score BETWEEN 0 AND 100),
  evidence_confidence NUMERIC(4, 2) NOT NULL DEFAULT 0.85,
  supporting_asset_count INT NOT NULL DEFAULT 0,
  supporting_asset_refs JSONB DEFAULT '[]'::jsonb,
  color_accent TEXT NOT NULL DEFAULT 'var(--accent-lavender-deep)',
  rank_position INT NOT NULL DEFAULT 1,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_dna_traits_creator ON public.creator_dna_traits(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_dna_traits_analysis ON public.creator_dna_traits(analysis_id);

-- 4. Per-Asset Feature Evidence Table (Auditable extraction details per portfolio work)
CREATE TABLE IF NOT EXISTS public.creator_dna_asset_evidence (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL REFERENCES public.creator_dna_analyses(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  asset_id TEXT,
  extracted_traits JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_source TEXT NOT NULL DEFAULT 'visual_and_prompt',
  provider_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_dna_evidence_creator ON public.creator_dna_asset_evidence(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_dna_evidence_project ON public.creator_dna_asset_evidence(project_id);

-- 5. Safe Schema Extension: Add cached dna_summary JSONB column to creator_profiles
ALTER TABLE IF EXISTS public.creator_profiles 
  ADD COLUMN IF NOT EXISTS dna_summary JSONB DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.creator_profiles 
  ADD COLUMN IF NOT EXISTS dna_last_analyzed_at TIMESTAMPTZ;

-- 6. Row-Level Security (RLS) Policies
ALTER TABLE public.creator_dna_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_dna_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_dna_asset_evidence ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public Read for completed Creator DNA traits (enables marketplace matching & brand discovery)
DROP POLICY IF EXISTS "Public can view completed Creator DNA traits" ON public.creator_dna_traits;
CREATE POLICY "Public can view completed Creator DNA traits" ON public.creator_dna_traits
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view completed Creator DNA analyses" ON public.creator_dna_analyses;
CREATE POLICY "Public can view completed Creator DNA analyses" ON public.creator_dna_analyses
  FOR SELECT USING (status = 'completed' OR status = 'insufficient_evidence');

-- Policy 2: Authenticated Creator Access — creators can view their own full analyses and evidence
DROP POLICY IF EXISTS "Creators view own DNA analyses" ON public.creator_dna_analyses;
CREATE POLICY "Creators view own DNA analyses" ON public.creator_dna_analyses
  FOR SELECT USING (
    creator_id IN (
      SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators view own DNA evidence" ON public.creator_dna_asset_evidence;
CREATE POLICY "Creators view own DNA evidence" ON public.creator_dna_asset_evidence
  FOR SELECT USING (
    creator_id IN (
      SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy 3: Service-Role Full Access (Server backend manages analysis jobs and trait updates)
DROP POLICY IF EXISTS "Service role manages DNA analyses" ON public.creator_dna_analyses;
CREATE POLICY "Service role manages DNA analyses" ON public.creator_dna_analyses
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role manages DNA traits" ON public.creator_dna_traits;
CREATE POLICY "Service role manages DNA traits" ON public.creator_dna_traits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role manages DNA evidence" ON public.creator_dna_asset_evidence;
CREATE POLICY "Service role manages DNA evidence" ON public.creator_dna_asset_evidence
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
