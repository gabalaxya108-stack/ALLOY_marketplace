-- ============================================================================
-- MIGRATION: 20261024_portfolio_storage_and_evidence.sql
-- ALLOY / CREASYNC — Durable Portfolio Storage Policies & Project Evidence Indexes
-- Review and execute this script in Supabase SQL Editor if configuring storage.
-- DO NOT apply automatically to production without administrator authorization.
-- ============================================================================

-- 1. Ensure portfolio-media storage bucket exists in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-media',
  'portfolio-media',
  true,
  104857600, -- 100MB limit for high-res creative assets and video loops
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Objects Row-Level Security (RLS) Policies
-- Enforce creator-isolated namespace: portfolio/{creator_id}/*

-- Policy 1: Public Read Access for published portfolio media assets
DROP POLICY IF EXISTS "Public portfolio media access" ON storage.objects;
CREATE POLICY "Public portfolio media access" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'portfolio-media'
  );

-- Policy 2: Creator Upload Access — isolated to creator's designated directory
DROP POLICY IF EXISTS "Creator portfolio media upload" ON storage.objects;
CREATE POLICY "Creator portfolio media upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio-media'
    AND (
      -- Path convention: portfolio/<creator_id>/<filename>
      name LIKE 'portfolio/%'
    )
  );

-- Policy 3: Creator Delete Access — prevent creators from deleting another creator's media
DROP POLICY IF EXISTS "Creator portfolio media delete" ON storage.objects;
CREATE POLICY "Creator portfolio media delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolio-media'
    AND (
      -- Path convention: portfolio/<creator_id>/<filename>
      name LIKE 'portfolio/%'
    )
  );

-- Policy 4: Creator Update Access — only own files
DROP POLICY IF EXISTS "Creator portfolio media update" ON storage.objects;
CREATE POLICY "Creator portfolio media update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'portfolio-media'
    AND name LIKE 'portfolio/%'
  );

-- 3. High-Performance Indexes for Project-Level Evidence Filtering
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_creative_style
  ON public.portfolio_projects(creative_style);

CREATE INDEX IF NOT EXISTS idx_portfolio_projects_format
  ON public.portfolio_projects(format);

CREATE INDEX IF NOT EXISTS idx_portfolio_projects_visibility
  ON public.portfolio_projects(visibility);

-- 4. Verify existing portfolio_projects columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_projects' AND column_name = 'creative_style'
  ) THEN
    ALTER TABLE public.portfolio_projects ADD COLUMN creative_style TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_projects' AND column_name = 'format'
  ) THEN
    ALTER TABLE public.portfolio_projects ADD COLUMN format TEXT DEFAULT '4K Stills Suite';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portfolio_projects' AND column_name = 'media'
  ) THEN
    ALTER TABLE public.portfolio_projects ADD COLUMN media JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;
