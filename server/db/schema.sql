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
ALTER TABLE IF EXISTS public.collaborations ADD COLUMN IF NOT EXISTS application_id TEXT;

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
-- 9B. CAMPAIGN APPLICATIONS TABLE (Creator Bids & Pre-Bid Eligibility Outcomes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.campaign_applications (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_title TEXT NOT NULL,
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,
  creator_avatar TEXT,
  creator_role TEXT,
  proposed_price TEXT NOT NULL,
  bid_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  proposal_text TEXT,
  delivery_timeline TEXT,
  portfolio_evidence JSONB DEFAULT '[]'::jsonb,
  eligibility_status TEXT NOT NULL CHECK (eligibility_status IN ('ELIGIBLE', 'INELIGIBLE', 'REQUIRES_REVIEW')),
  eligibility_report JSONB DEFAULT '{}'::jsonb,
  is_held BOOLEAN NOT NULL DEFAULT FALSE,
  held_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'counter_offered', 'accepted', 'declined', 'held')),
  counter_offer JSONB DEFAULT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_campaign_creator_application UNIQUE (campaign_id, creator_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_apps_campaign ON public.campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_apps_brand ON public.campaign_applications(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaign_apps_creator ON public.campaign_applications(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_apps_status ON public.campaign_applications(status);
CREATE INDEX IF NOT EXISTS idx_campaign_apps_created_at ON public.campaign_applications(created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_campaign_funding_campaign ON public.campaign_funding(campaign_id);

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
-- ATOMIC APPLICATION ACCEPTANCE FUNCTION (Slot-Capacity Transactional RPC)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_campaign_application(
  p_application_id TEXT,
  p_campaign_slots INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_app RECORD;
  v_campaign RECORD;
  v_slots INT;
  v_accepted_count INT;
BEGIN
  -- Lock application row for update to serialize concurrent acceptances
  SELECT * INTO v_app
  FROM public.campaign_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'APPLICATION_NOT_FOUND', 'error', 'Application not found.');
  END IF;

  IF v_app.status = 'accepted' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_ACCEPTED', 'error', 'Application has already been accepted.');
  END IF;

  IF v_app.is_held OR v_app.status = 'held' OR v_app.eligibility_status != 'ELIGIBLE' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'APPLICATION_HELD', 'error', 'Cannot accept an application that is held or ineligible.');
  END IF;

  -- Lock campaign row if it exists
  SELECT * INTO v_campaign
  FROM public.campaigns
  WHERE id = v_app.campaign_id
  FOR UPDATE;

  IF p_campaign_slots IS NOT NULL AND p_campaign_slots > 0 THEN
    v_slots := p_campaign_slots;
  ELSIF v_campaign.id IS NOT NULL AND v_campaign.creator_slots IS NOT NULL AND v_campaign.creator_slots > 0 THEN
    v_slots := v_campaign.creator_slots;
  ELSE
    v_slots := 1;
  END IF;

  -- Count currently accepted applications for this campaign
  SELECT COUNT(*) INTO v_accepted_count
  FROM public.campaign_applications
  WHERE campaign_id = v_app.campaign_id
    AND status = 'accepted';

  IF v_accepted_count >= v_slots THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'SLOTS_FILLED',
      'error', format('Cannot accept application: all %s creator slot(s) for this campaign are already filled.', v_slots)
    );
  END IF;

  -- Perform the atomic status update
  UPDATE public.campaign_applications
  SET status = 'accepted',
      proposed_price = COALESCE(counter_offer->>'proposedPrice', proposed_price),
      delivery_timeline = COALESCE(counter_offer->>'proposedTimeline', delivery_timeline),
      updated_at = NOW()
  WHERE id = p_application_id
  RETURNING * INTO v_app;

  -- Update campaign remaining slots if campaign row exists
  IF v_campaign.id IS NOT NULL THEN
    UPDATE public.campaigns
    SET remaining_slots = GREATEST(0, v_slots - (v_accepted_count + 1)),
        updated_at = NOW()
    WHERE id = v_campaign.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'accepted',
    'remainingSlots', GREATEST(0, v_slots - (v_accepted_count + 1)),
    'application', to_jsonb(v_app)
  );
END;
$$;

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

-- Creator Profiles
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public creator read" ON public.creator_profiles;
CREATE POLICY "Public creator read" ON public.creator_profiles FOR SELECT
  USING (visibility = 'published' OR is_demo = true OR auth.uid() = user_id OR public.is_super_admin());
DROP POLICY IF EXISTS "Creator self insert" ON public.creator_profiles;
CREATE POLICY "Creator self insert" ON public.creator_profiles FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND is_demo = false)
    OR (is_demo = true AND auth.uid() IS NULL)
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Creator self update" ON public.creator_profiles;
CREATE POLICY "Creator self update" ON public.creator_profiles FOR UPDATE
  USING (
    (auth.uid() = user_id AND is_demo = false)
    OR is_demo = true
    OR public.is_super_admin()
  )
  WITH CHECK (
    ((auth.uid() = user_id AND is_demo = false) OR is_demo = true OR public.is_super_admin())
    AND (user_id = auth.uid() OR is_demo = true OR public.is_super_admin())
  );
DROP POLICY IF EXISTS "Creator self delete" ON public.creator_profiles;
CREATE POLICY "Creator self delete" ON public.creator_profiles FOR DELETE
  USING (auth.uid() = user_id OR public.is_super_admin());

-- Portfolio Projects
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public portfolio read" ON public.portfolio_projects;
CREATE POLICY "Public portfolio read" ON public.portfolio_projects FOR SELECT
  USING (visibility = 'published' OR is_demo = true OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = portfolio_projects.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin());
DROP POLICY IF EXISTS "Creator portfolio insert" ON public.portfolio_projects;
CREATE POLICY "Creator portfolio insert" ON public.portfolio_projects FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = portfolio_projects.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin());
DROP POLICY IF EXISTS "Creator portfolio update" ON public.portfolio_projects;
CREATE POLICY "Creator portfolio update" ON public.portfolio_projects FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = portfolio_projects.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin())
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = portfolio_projects.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin());
DROP POLICY IF EXISTS "Creator portfolio delete" ON public.portfolio_projects;
CREATE POLICY "Creator portfolio delete" ON public.portfolio_projects FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = portfolio_projects.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin());

-- Creator Workflows
ALTER TABLE public.creator_workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workflows public read" ON public.creator_workflows;
CREATE POLICY "Workflows public read" ON public.creator_workflows FOR SELECT
  USING (visibility = 'published' OR is_demo = true OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creator_workflows.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin());
DROP POLICY IF EXISTS "Workflows owner insert" ON public.creator_workflows;
CREATE POLICY "Workflows owner insert" ON public.creator_workflows FOR INSERT
  WITH CHECK (is_demo = true OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creator_workflows.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin());
DROP POLICY IF EXISTS "Workflows owner update" ON public.creator_workflows;
CREATE POLICY "Workflows owner update" ON public.creator_workflows FOR UPDATE
  USING (is_demo = true OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creator_workflows.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin())
  WITH CHECK (is_demo = true OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creator_workflows.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin());
DROP POLICY IF EXISTS "Workflows owner delete" ON public.creator_workflows;
CREATE POLICY "Workflows owner delete" ON public.creator_workflows FOR DELETE
  USING (is_demo = true OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creator_workflows.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin());

-- Creative DNA
ALTER TABLE public.creative_dna ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Creative DNA public read" ON public.creative_dna;
CREATE POLICY "Creative DNA public read" ON public.creative_dna FOR SELECT USING (true);
DROP POLICY IF EXISTS "Creative DNA update" ON public.creative_dna;
CREATE POLICY "Creative DNA update" ON public.creative_dna FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creative_dna.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin())
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creative_dna.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ) OR public.is_super_admin());

-- Creative DNA Feedback
ALTER TABLE public.creative_dna_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "DNA feedback insert" ON public.creative_dna_feedback;
CREATE POLICY "DNA feedback insert" ON public.creative_dna_feedback FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "DNA feedback read" ON public.creative_dna_feedback;
CREATE POLICY "DNA feedback read" ON public.creative_dna_feedback FOR SELECT USING (true);

-- Brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Brands public read" ON public.brands;
CREATE POLICY "Brands public read" ON public.brands FOR SELECT
  USING (
    is_demo = true
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.owner_brand_id = brands.id AND (c.visibility = 'published' OR c.is_demo = true)
    )
    OR EXISTS (
      SELECT 1 FROM public.invitations inv
      JOIN public.creator_profiles cp ON cp.id = inv.creator_id
      WHERE inv.brand_id = brands.id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.collaborations col
      JOIN public.creator_profiles cp ON cp.id = col.creator_id
      WHERE col.brand_id = brands.id AND cp.user_id = auth.uid()
    )
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Brand self insert" ON public.brands;
CREATE POLICY "Brand self insert" ON public.brands FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND is_demo = false)
    OR (is_demo = true AND auth.uid() IS NULL)
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Brand owner update" ON public.brands;
CREATE POLICY "Brand owner update" ON public.brands FOR UPDATE
  USING (
    (auth.uid() = user_id AND is_demo = false)
    OR is_demo = true
    OR public.is_super_admin()
  )
  WITH CHECK (
    ((auth.uid() = user_id AND is_demo = false) OR is_demo = true OR public.is_super_admin())
    AND (user_id = auth.uid() OR is_demo = true OR public.is_super_admin())
  );
DROP POLICY IF EXISTS "Brand owner delete" ON public.brands;
CREATE POLICY "Brand owner delete" ON public.brands FOR DELETE
  USING (auth.uid() = user_id OR public.is_super_admin());

-- Campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaigns public read" ON public.campaigns;
CREATE POLICY "Campaigns public read" ON public.campaigns FOR SELECT
  USING (visibility = 'published' OR is_demo = true OR EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = campaigns.owner_brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
  ) OR public.is_super_admin());
DROP POLICY IF EXISTS "Brand owner campaign insert" ON public.campaigns;
CREATE POLICY "Brand owner campaign insert" ON public.campaigns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands b WHERE b.id = campaigns.owner_brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
    )
    OR (is_demo = true AND owner_brand_id LIKE 'brand-demo%')
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Brand owner campaign update" ON public.campaigns;
CREATE POLICY "Brand owner campaign update" ON public.campaigns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b WHERE b.id = campaigns.owner_brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
    )
    OR is_demo = true
    OR public.is_super_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands b WHERE b.id = campaigns.owner_brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
    )
    OR is_demo = true
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Brand owner campaign delete" ON public.campaigns;
CREATE POLICY "Brand owner campaign delete" ON public.campaigns FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b WHERE b.id = campaigns.owner_brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
    )
    OR public.is_super_admin()
  );

-- Shortlists
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shortlists brand read" ON public.shortlists;
CREATE POLICY "Shortlists brand read" ON public.shortlists FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = shortlists.brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
  ) OR public.is_super_admin());
DROP POLICY IF EXISTS "Shortlists brand insert" ON public.shortlists;
CREATE POLICY "Shortlists brand insert" ON public.shortlists FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = shortlists.brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
  ) OR public.is_super_admin());
DROP POLICY IF EXISTS "Shortlists brand delete" ON public.shortlists;
CREATE POLICY "Shortlists brand delete" ON public.shortlists FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = shortlists.brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
  ) OR public.is_super_admin());

-- Invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invitations participant read" ON public.invitations;
CREATE POLICY "Invitations participant read" ON public.invitations FOR SELECT
  USING (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = invitations.brand_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = invitations.creator_id AND c.user_id = auth.uid())
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Invitations brand insert" ON public.invitations;
CREATE POLICY "Invitations brand insert" ON public.invitations FOR INSERT
  WITH CHECK (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = invitations.brand_id AND b.user_id = auth.uid())
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Invitations participant update" ON public.invitations;
CREATE POLICY "Invitations participant update" ON public.invitations FOR UPDATE
  USING (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = invitations.brand_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = invitations.creator_id AND c.user_id = auth.uid())
    OR public.is_super_admin()
  )
  WITH CHECK (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = invitations.brand_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = invitations.creator_id AND c.user_id = auth.uid())
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Invitations brand delete" ON public.invitations;
CREATE POLICY "Invitations brand delete" ON public.invitations FOR DELETE
  USING (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = invitations.brand_id AND b.user_id = auth.uid())
    OR public.is_super_admin()
  );

-- Campaign Applications
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applications creator read" ON public.campaign_applications;
CREATE POLICY "Applications creator read" ON public.campaign_applications FOR SELECT
  USING (
    is_demo = true
    OR EXISTS (
      SELECT 1 FROM public.creator_profiles c
      WHERE c.id = campaign_applications.creator_id AND c.user_id = auth.uid()
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Applications brand read eligible" ON public.campaign_applications;
CREATE POLICY "Applications brand read eligible" ON public.campaign_applications FOR SELECT
  USING (
    is_demo = true
    OR (
      EXISTS (
        SELECT 1 FROM public.brands b
        WHERE b.id = campaign_applications.brand_id AND b.user_id = auth.uid()
      )
      AND is_held = false
      AND eligibility_status = 'ELIGIBLE'
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Applications creator insert" ON public.campaign_applications;
CREATE POLICY "Applications creator insert" ON public.campaign_applications FOR INSERT
  WITH CHECK (
    is_demo = true
    OR EXISTS (
      SELECT 1 FROM public.creator_profiles c
      WHERE c.id = campaign_applications.creator_id AND c.user_id = auth.uid()
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Applications participant update" ON public.campaign_applications;
CREATE POLICY "Applications participant update" ON public.campaign_applications FOR UPDATE
  USING (
    is_demo = true
    OR EXISTS (
      SELECT 1 FROM public.creator_profiles c
      WHERE c.id = campaign_applications.creator_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = campaign_applications.brand_id AND b.user_id = auth.uid()
    )
    OR public.is_super_admin()
  );

-- Collaborations
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Collaborations participant read" ON public.collaborations;
CREATE POLICY "Collaborations participant read" ON public.collaborations FOR SELECT
  USING (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = collaborations.brand_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = collaborations.creator_id AND c.user_id = auth.uid())
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Collaborations participant insert" ON public.collaborations;
CREATE POLICY "Collaborations participant insert" ON public.collaborations FOR INSERT
  WITH CHECK (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = collaborations.brand_id AND b.user_id = auth.uid())
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Collaborations participant update" ON public.collaborations;
CREATE POLICY "Collaborations participant update" ON public.collaborations FOR UPDATE
  USING (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = collaborations.brand_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = collaborations.creator_id AND c.user_id = auth.uid())
    OR public.is_super_admin()
  )
  WITH CHECK (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = collaborations.brand_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = collaborations.creator_id AND c.user_id = auth.uid())
    OR public.is_super_admin()
  );

-- Campaign Funding (Razorpay Payment Transactions)
ALTER TABLE public.campaign_funding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaign funding participant read" ON public.campaign_funding;
CREATE POLICY "Campaign funding participant read" ON public.campaign_funding FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.brands b ON b.id = c.owner_brand_id
      WHERE c.id = campaign_funding.campaign_id
        AND (b.user_id = auth.uid() OR c.is_demo = true OR b.is_demo = true)
    )
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Campaign funding brand insert" ON public.campaign_funding;
CREATE POLICY "Campaign funding brand insert" ON public.campaign_funding FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.brands b ON b.id = c.owner_brand_id
      WHERE c.id = campaign_funding.campaign_id
        AND (b.user_id = auth.uid() OR c.is_demo = true OR b.is_demo = true)
    )
    OR public.is_super_admin()
  );

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages participant read" ON public.messages;
CREATE POLICY "Messages participant read" ON public.messages FOR SELECT
  USING (
    (
      auth.uid() IS NOT NULL
      AND public.is_conversation_participant(conversation_id, auth.uid(), NULL)
    )
    OR public.is_super_admin()
  );
DROP POLICY IF EXISTS "Messages participant insert" ON public.messages;
CREATE POLICY "Messages participant insert" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND LENGTH(TRIM(text)) > 0
    AND sender IN ('creator', 'brand')
    AND (
      public.is_conversation_participant(conversation_id, auth.uid(), sender)
      OR public.is_super_admin()
    )
  );

-- Activity Logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Activity logs read" ON public.activity_logs;
CREATE POLICY "Activity logs read" ON public.activity_logs FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL OR public.is_super_admin());
DROP POLICY IF EXISTS "Activity logs insert" ON public.activity_logs;
CREATE POLICY "Activity logs insert" ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- Verification Claims (Trust Centre)
ALTER TABLE public.verification_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read non-private claims" ON public.verification_claims;
CREATE POLICY "Public read non-private claims" ON public.verification_claims FOR SELECT
  USING (
    is_private = FALSE
    OR EXISTS (
      SELECT 1 FROM public.creator_profiles c
      WHERE c.id = verification_claims.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Creators insert claims" ON public.verification_claims;
CREATE POLICY "Creators insert claims" ON public.verification_claims FOR INSERT
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.creator_profiles c
        WHERE c.id = verification_claims.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
      )
      AND status IN ('pending_review', 'self_declared', 'not_submitted')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Admins manage claim decisions" ON public.verification_claims;
CREATE POLICY "Admins manage claim decisions" ON public.verification_claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.creator_profiles c
      WHERE c.id = verification_claims.creator_id AND c.is_demo = true
    )
  );

-- Verification Audit Log
ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit log read" ON public.verification_audit_log;
CREATE POLICY "Audit log read" ON public.verification_audit_log FOR SELECT USING (true);
DROP POLICY IF EXISTS "Audit log insert" ON public.verification_audit_log;
CREATE POLICY "Audit log insert" ON public.verification_audit_log FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR public.is_super_admin()
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = verification_audit_log.creator_id AND c.is_demo = true)
  );

-- Trust Reports & Governance Tables (Super Admin Only)
ALTER TABLE public.trust_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trust reports super_admin select" ON public.trust_reports;
CREATE POLICY "Trust reports super_admin select" ON public.trust_reports FOR SELECT USING (public.is_super_admin());
DROP POLICY IF EXISTS "Trust reports super_admin manage" ON public.trust_reports;
CREATE POLICY "Trust reports super_admin manage" ON public.trust_reports FOR ALL USING (public.is_super_admin());

ALTER TABLE public.trust_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trust signals super_admin select" ON public.trust_signals;
CREATE POLICY "Trust signals super_admin select" ON public.trust_signals FOR SELECT USING (public.is_super_admin());
DROP POLICY IF EXISTS "Trust signals super_admin manage" ON public.trust_signals;
CREATE POLICY "Trust signals super_admin manage" ON public.trust_signals FOR ALL USING (public.is_super_admin());

ALTER TABLE public.trust_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Trust decisions super_admin select" ON public.trust_decisions;
CREATE POLICY "Trust decisions super_admin select" ON public.trust_decisions FOR SELECT USING (public.is_super_admin());
DROP POLICY IF EXISTS "Trust decisions super_admin insert" ON public.trust_decisions;
CREATE POLICY "Trust decisions super_admin insert" ON public.trust_decisions FOR INSERT WITH CHECK (public.is_super_admin());

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Audit events super_admin select" ON public.audit_events;
CREATE POLICY "Audit events super_admin select" ON public.audit_events FOR SELECT USING (public.is_super_admin());
DROP POLICY IF EXISTS "Audit events super_admin insert" ON public.audit_events;
CREATE POLICY "Audit events super_admin insert" ON public.audit_events FOR INSERT WITH CHECK (public.is_super_admin());

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform config super_admin select" ON public.platform_config;
CREATE POLICY "Platform config super_admin select" ON public.platform_config FOR SELECT USING (public.is_super_admin());
DROP POLICY IF EXISTS "Platform config super_admin manage" ON public.platform_config;
CREATE POLICY "Platform config super_admin manage" ON public.platform_config FOR ALL USING (public.is_super_admin());

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
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.brands;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_profiles;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.portfolio_projects;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_workflows;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.shortlists;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_funding;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
