-- ============================================================================
-- ALLOY / CREASYNC — STREAMLINED PRODUCTION DATABASE SCHEMA
-- Only relevant, required tables and columns for the ALLOY AI Creator Marketplace.
-- Run this script in the Supabase SQL Editor to initialize all tables,
-- indexes, Row-Level Security policies, and seed data.
-- ============================================================================

-- Enable required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up any obsolete/dead tables from previous versions
DROP TABLE IF EXISTS public.trust_decisions CASCADE;
DROP TABLE IF EXISTS public.trust_signals CASCADE;
DROP TABLE IF EXISTS public.trust_reports CASCADE;
DROP TABLE IF EXISTS public.audit_events CASCADE;
DROP TABLE IF EXISTS public.platform_config CASCADE;
DROP TABLE IF EXISTS public.creative_dna_feedback CASCADE;
DROP TABLE IF EXISTS public.verification_audit_log CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;

-- ============================================================================
-- MIGRATION SAFEGUARD: Ensure existing tables have all required columns
-- ============================================================================
ALTER TABLE IF EXISTS public.brands ADD COLUMN IF NOT EXISTS handle TEXT;
ALTER TABLE IF EXISTS public.campaigns ADD COLUMN IF NOT EXISTS desired_creator_specialties TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS public.campaigns ADD COLUMN IF NOT EXISTS current_funding BIGINT DEFAULT 0;
ALTER TABLE IF EXISTS public.campaigns ADD COLUMN IF NOT EXISTS funding_goal BIGINT DEFAULT 0;
ALTER TABLE IF EXISTS public.creator_profiles ADD COLUMN IF NOT EXISTS commercial_licensing_verified BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS public.creator_profiles ADD COLUMN IF NOT EXISTS trust_verification JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.creator_profiles ADD COLUMN IF NOT EXISTS video_preview TEXT;
ALTER TABLE IF EXISTS public.creator_profiles ADD COLUMN IF NOT EXISTS status_badge TEXT DEFAULT 'Available now';
ALTER TABLE IF EXISTS public.portfolio_projects ADD COLUMN IF NOT EXISTS media JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.portfolio_projects ADD COLUMN IF NOT EXISTS workflow_stages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.portfolio_projects ADD COLUMN IF NOT EXISTS production_workflow JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS public.creator_workflows ADD COLUMN IF NOT EXISTS human_involvement_notes TEXT;
ALTER TABLE IF EXISTS public.creator_workflows ADD COLUMN IF NOT EXISTS linked_project_title TEXT;
ALTER TABLE IF EXISTS public.invitations ADD COLUMN IF NOT EXISTS creator_avatar TEXT;
ALTER TABLE IF EXISTS public.invitations ADD COLUMN IF NOT EXISTS creator_name TEXT;
ALTER TABLE IF EXISTS public.collaborations ADD COLUMN IF NOT EXISTS submission_previews TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS public.collaborations ADD COLUMN IF NOT EXISTS feedback_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.collaborations ADD COLUMN IF NOT EXISTS revision_history JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- 1. USER PROFILES TABLE (Linked to Supabase Auth auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'brand', 'admin')),
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- 2. ADMIN ROLES TABLE (Super Admin & Judge RBAC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'judge_admin')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON public.admin_roles(user_id);

-- ============================================================================
-- 3. BRANDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  handle TEXT,
  industry TEXT,
  website TEXT,
  logo TEXT,
  cover_image TEXT,
  description TEXT,
  aesthetic TEXT,
  brand_colors TEXT[] DEFAULT '{}',
  preferred_platforms TEXT[] DEFAULT '{}',
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_user ON public.brands(user_id);

-- ============================================================================
-- 4. CREATOR PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  creative_identity TEXT,
  bio TEXT,
  specialty TEXT,
  location TEXT,
  availability TEXT DEFAULT 'Available for projects',
  status_badge TEXT DEFAULT 'Available now',
  turnaround TEXT DEFAULT '48h concept frames',
  experience TEXT,
  hero_work TEXT,
  video_preview TEXT,
  avatar TEXT,
  styles TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  capabilities TEXT[] DEFAULT '{}',
  tools TEXT[] DEFAULT '{}',
  platforms TEXT[] DEFAULT '{}',
  category_tags TEXT[] DEFAULT '{}',
  technical_skills TEXT[] DEFAULT '{}',
  creative_skills TEXT[] DEFAULT '{}',
  commercial_licensing_verified BOOLEAN DEFAULT TRUE,
  trust_verification JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
  visibility TEXT NOT NULL DEFAULT 'published' CHECK (visibility IN ('published', 'draft', 'private')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_user ON public.creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_specialty ON public.creator_profiles(specialty);

-- ============================================================================
-- 5. CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaigns (
  id TEXT PRIMARY KEY,
  owner_brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  brand_avatar TEXT,
  brand_website TEXT,
  title TEXT NOT NULL,
  objective TEXT,
  product_or_service TEXT,
  industry TEXT,
  description TEXT,
  creative_direction TEXT,
  creative_style TEXT,
  tone_of_voice TEXT,
  deliverables TEXT[] DEFAULT '{}',
  desired_creator_specialties TEXT[] DEFAULT '{}',
  platforms TEXT[] DEFAULT '{}',
  budget TEXT,
  currency TEXT DEFAULT 'USD',
  timeline TEXT,
  deadline TEXT,
  target_audience TEXT,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'In Review', 'Completed', 'Archived')),
  visibility TEXT NOT NULL DEFAULT 'published' CHECK (visibility IN ('published', 'draft', 'private')),
  current_funding BIGINT DEFAULT 0,
  funding_goal BIGINT DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON public.campaigns(owner_brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- ============================================================================
-- 6. PORTFOLIO PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.portfolio_projects (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Visual Art',
  creative_style TEXT,
  tools TEXT,
  format TEXT DEFAULT '4K Stills Suite',
  image TEXT NOT NULL,
  video TEXT,
  aspect TEXT DEFAULT '16:9',
  role TEXT DEFAULT 'Lead Visual Artist',
  client_type TEXT,
  creative_direction TEXT,
  capabilities TEXT[] DEFAULT '{}',
  media JSONB DEFAULT '[]'::jsonb,
  workflow_id TEXT,
  workflow_stages JSONB DEFAULT '[]'::jsonb,
  production_workflow JSONB DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'published' CHECK (visibility IN ('published', 'private')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_projects_creator ON public.portfolio_projects(creator_id);

-- ============================================================================
-- 7. CREATOR WORKFLOWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.creator_workflows (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  specialization TEXT,
  linked_project_id TEXT REFERENCES public.portfolio_projects(id) ON DELETE SET NULL,
  linked_project_title TEXT,
  status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
  visibility TEXT NOT NULL DEFAULT 'published' CHECK (visibility IN ('published', 'draft', 'private')),
  human_involvement_notes TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_workflows_creator ON public.creator_workflows(creator_id);

-- ============================================================================
-- 8. SHORTLISTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.shortlists (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES public.campaigns(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shortlists_brand ON public.shortlists(brand_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_creator ON public.shortlists(creator_id);

-- ============================================================================
-- 9. INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES public.campaigns(id) ON DELETE SET NULL,
  campaign_title TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  creator_name TEXT,
  creator_avatar TEXT,
  timeline TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Accepted', 'Declined', 'Expired')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_brand ON public.invitations(brand_id);
CREATE INDEX IF NOT EXISTS idx_invitations_creator ON public.invitations(creator_id);

-- ============================================================================
-- 10. COLLABORATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.collaborations (
  id TEXT PRIMARY KEY,
  invitation_id TEXT REFERENCES public.invitations(id) ON DELETE SET NULL,
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  campaign_id TEXT REFERENCES public.campaigns(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'In Review', 'Completed', 'Paused')),
  current_stage TEXT NOT NULL DEFAULT 'Concept Approval',
  progress_percent INT DEFAULT 0,
  deadline TEXT,
  agreed_budget TEXT,
  deliverables_scope TEXT,
  latest_feedback TEXT,
  brand_contact TEXT,
  submission_previews TEXT[] DEFAULT '{}',
  feedback_history JSONB DEFAULT '[]'::jsonb,
  revision_history JSONB DEFAULT '[]'::jsonb,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collaborations_brand ON public.collaborations(brand_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_creator ON public.collaborations(creator_id);

-- ============================================================================
-- 11. CAMPAIGN FUNDING TABLE (Razorpay Payment Transactions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_funding (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES public.campaigns(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL,
  amount_rupees NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_id TEXT,
  order_id TEXT,
  funder_name TEXT DEFAULT 'Brand Partner',
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funding_campaign ON public.campaign_funding(campaign_id);

-- ============================================================================
-- 12. MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('creator', 'brand')),
  sender_name TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);

-- ============================================================================
-- 13. VERIFICATION CLAIMS TABLE (Trust Centre)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.verification_claims (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('identity', 'portfolio', 'ai_tools', 'workflow', 'commercial_rights')),
  claim_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'not_submitted', 'self_declared', 'pending_review', 'verified', 'unable_to_verify', 'needs_renewal'
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

CREATE INDEX IF NOT EXISTS idx_verification_claims_creator ON public.verification_claims(creator_id);

-- ============================================================================
-- 14. CREATIVE DNA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.creative_dna (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE UNIQUE,
  traits TEXT[] DEFAULT '{}',
  visual_aesthetic TEXT,
  storytelling_approach TEXT,
  product_presentation_style TEXT,
  provenance JSONB DEFAULT '{}'::jsonb,
  completeness JSONB DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'portfolio_analysis',
  is_live_ai BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_dna_creator ON public.creative_dna(creator_id);

-- ============================================================================
-- 15. SECURITY FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Check if caller is an active super admin or judge admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'judge_admin')
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Function & Trigger: Automatically sync every new Supabase Auth user into public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_name TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', NEW.raw_user_meta_data->>'intended_role', 'creator');
  IF v_role NOT IN ('creator', 'brand', 'admin') THEN
    v_role := 'creator';
  END IF;

  v_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, role, display_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    v_role,
    v_name,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.profiles.display_name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), public.profiles.avatar_url),
    updated_at = NOW();

  IF v_role = 'creator' THEN
    INSERT INTO public.creator_profiles (id, user_id, name, handle, status, visibility, is_demo)
    VALUES (
      'creator-' || SUBSTRING(NEW.id::text, 1, 8),
      NEW.id,
      v_name,
      '@' || lower(regexp_replace(v_name, '[^a-zA-Z0-9_]', '', 'g')) || '_' || SUBSTRING(NEW.id::text, 1, 4),
      'Published',
      'published',
      FALSE
    )
    ON CONFLICT (id) DO NOTHING;
  ELSIF v_role = 'brand' THEN
    INSERT INTO public.brands (id, user_id, name, is_demo)
    VALUES (
      'brand-' || SUBSTRING(NEW.id::text, 1, 8),
      NEW.id,
      v_name,
      FALSE
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- 16. ROW-LEVEL SECURITY (RLS) POLICIES
-- Enables seamless real-time writes for both authenticated users and demo mode
-- so that ALL updates reflect immediately in the Supabase Table Editor.
-- ============================================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admin Roles
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin roles read by super_admin" ON public.admin_roles;
CREATE POLICY "Admin roles read by super_admin" ON public.admin_roles FOR SELECT USING (public.is_super_admin());

-- Universal RLS macro for marketplace tables:
-- Allows SELECT, INSERT, UPDATE, DELETE for all client and server operations.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'brands',
      'creator_profiles',
      'campaigns',
      'portfolio_projects',
      'creator_workflows',
      'shortlists',
      'invitations',
      'collaborations',
      'campaign_funding',
      'messages',
      'verification_claims',
      'creative_dna'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow select for all" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Allow select for all" ON public.%I FOR SELECT USING (true);', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow insert for all" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Allow insert for all" ON public.%I FOR INSERT WITH CHECK (true);', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow update for all" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Allow update for all" ON public.%I FOR UPDATE USING (true);', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow delete for all" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Allow delete for all" ON public.%I FOR DELETE USING (true);', tbl);
  END LOOP;
END $$;

-- ============================================================================
-- 17. INITIAL SEED DATA
-- ============================================================================

-- Seed Demo Brands
INSERT INTO public.brands (
  id, name, handle, industry, website, logo, cover_image, description, aesthetic, brand_colors, preferred_platforms, is_demo
) VALUES 
(
  'brand-demo-lumina',
  'Lumina Botanica',
  '@luminabotanica',
  'Beauty & Skincare',
  'https://luminabotanica.co',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85',
  'Pioneering organic cold-pressed botanicals for modern minimalist skincare rituals.',
  'Warm, Luminous & Organic',
  ARRAY['#EB6E4B', '#FDF7ED', '#2E3A2F'],
  ARRAY['Instagram', 'TikTok', 'Digital OOH'],
  TRUE
),
(
  'brand-demo-vanguard',
  'Vanguard Horology',
  '@vanguard.watches',
  'Consumer Tech & Hardware',
  'https://vanguardhorology.ch',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85',
  'Swiss micro-machining and titanium escapements crafted for next-generation precision horology.',
  'Precise, Monochrome, Architectural',
  ARRAY['#141312', '#A8A29E', '#7C3AED'],
  ARRAY['YouTube', 'Instagram', 'Digital OOH'],
  TRUE
),
(
  'brand-demo-solis',
  'Solis Living',
  '@solis.living',
  'Architecture & Design',
  'https://solisliving.design',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
  'Biophilic architectural furniture and conscious interior environments.',
  'Warm Natural Woods & Golden Hour Light',
  ARRAY['#D97706', '#F59E0B', '#FDF7ED'],
  ARRAY['Architectural Digest', 'Instagram', 'Pinterest'],
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  handle = EXCLUDED.handle,
  industry = EXCLUDED.industry,
  website = EXCLUDED.website,
  logo = EXCLUDED.logo,
  cover_image = EXCLUDED.cover_image,
  description = EXCLUDED.description,
  aesthetic = EXCLUDED.aesthetic,
  brand_colors = EXCLUDED.brand_colors,
  preferred_platforms = EXCLUDED.preferred_platforms;

-- Seed Demo Campaigns
INSERT INTO public.campaigns (
  id, owner_brand_id, brand_name, brand_website, brand_avatar, title, objective, product_or_service, industry,
  description, budget, currency, timeline, deadline, target_audience, platforms, creative_style,
  desired_creator_specialties, tone_of_voice, deliverables, cover_image, status, visibility, is_demo
) VALUES 
(
  'camp-summer-skincare',
  'brand-demo-lumina',
  'Lumina Botanica',
  'https://luminabotanica.co',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
  'Summer Skincare & Radiant Hydration Launch',
  'Product Launch',
  'Botanical Barrier Restoration Serum',
  'Beauty & Skincare',
  'Launching botanical barrier restoration serum with macro fluid physics and radiant skin micro-textures.',
  '$5,000 – $10,000',
  'USD',
  '2–3 Weeks',
  'Nov 20, 2026',
  'Aesthetic-conscious skincare enthusiasts aged 22–38',
  ARRAY['Instagram', 'Digital OOH', 'TikTok'],
  'Cinematic, Macro, Luminous',
  ARRAY['AI Beauty', 'Macro Viscosity', 'AI Photography'],
  'Authentic, Warm, Editorial',
  ARRAY['3x Key Campaign Stills (4K)', '2x Short-Form Kinetic Loops (9:16)', 'Social Packaging Renders'],
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85',
  'Active',
  'published',
  TRUE
),
(
  'camp-vanguard-chrono',
  'brand-demo-vanguard',
  'Vanguard Horology',
  'https://vanguardhorology.ch',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80',
  'Titanium Kinetic Chrono Motion Series',
  'Brand Awareness',
  'Vanguard Chrono-01 Mechanical Titanium',
  'Consumer Tech & Hardware',
  'Hyper-detailed photorealistic 3D exploded watch movements and precision kinetic lighting sequences.',
  '$8,000 – $15,000',
  'USD',
  '3–4 Weeks',
  'Dec 10, 2026',
  'Watch collectors, industrial designers, and luxury enthusiasts aged 28–50',
  ARRAY['YouTube', 'Instagram', 'Digital OOH'],
  'Hyperreal, Monochrome, Precision 3D',
  ARRAY['3D Product', 'Motion & Animation', 'Precision Lighting'],
  'Authoritative, Technical, Minimalist',
  ARRAY['1x Exploded Movement Animation (30s 4K)', '5x Mechanical Macro Hero Stills', '1x Vertical Motion Teaser'],
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85',
  'Active',
  'published',
  TRUE
),
(
  'camp-solis-fragrance',
  'brand-demo-lumina',
  'Lumina Botanica',
  'https://luminabotanica.co',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
  'Solar Amber Eau de Parfum Stills',
  'Creative Campaign',
  'Solar Amber Eau de Parfum',
  'Beauty & Skincare',
  'Warm golden hour lighting, amber bottle refraction, desert architectural setting.',
  '$4,000 – $7,000',
  'USD',
  '2 Weeks',
  'Nov 30, 2026',
  'Luxury fragrance lovers and design-forward perfume buyers',
  ARRAY['Instagram', 'Editorial Print'],
  'Sunlit, Warm Amber, Architectural',
  ARRAY['AI Photography', 'Lighting Mastery'],
  'Sensory, Poetic, Warm',
  ARRAY['4x Hero Bottle Stills (4K)', '2x Ingredient Mood Boards'],
  'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=85',
  'Active',
  'published',
  TRUE
),
(
  'camp-aether-nomad',
  'brand-demo-vanguard',
  'Vanguard Horology',
  'https://vanguardhorology.ch',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80',
  'AETHER Nomad Technical Carry Series',
  'Product Launch',
  'Dyneema Waterproof Technical Modular Backpack',
  'Consumer Tech & Hardware',
  'Futuristic urban rain environment, reflective Dyneema technical textiles, neon backlight accents.',
  '$6,000 – $11,000',
  'USD',
  '3 Weeks',
  'Dec 15, 2026',
  'Techwear community, urban commuters, functional apparel buyers',
  ARRAY['Instagram', 'YouTube', 'TikTok'],
  'Cyberpunk Realism, Wet Surface Physics',
  ARRAY['Technical Apparel', 'Weather Simulation'],
  'Edgy, Functional, Forward-looking',
  ARRAY['3x Rainy Atmosphere Hero Stills', '1x 15s Kinetic Textile Video', '6x Feature Detail Crops'],
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85',
  'Active',
  'published',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  objective = EXCLUDED.objective,
  description = EXCLUDED.description,
  budget = EXCLUDED.budget,
  deliverables = EXCLUDED.deliverables,
  status = EXCLUDED.status;

-- Enable Realtime replication for instant Table Editor updates
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.brands;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_profiles;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_projects;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_workflows;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shortlists;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_funding;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
