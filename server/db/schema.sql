-- ============================================================================
-- ALLOY / CREASYNC MASTER UNIFIED DATABASE SCHEMA (PostgreSQL / Supabase)
-- Single Source of Truth for Database Initialization & Governance
-- Run this script once in the Supabase SQL Editor to initialize all tables,
-- functions, constraints, indexes, RLS security policies, and realtime triggers.
-- ============================================================================

-- Enable required cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USER PROFILES TABLE (Linked to Supabase Auth auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('creator', 'brand', 'admin')),
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- 2. ADMIN ROLES TABLE (Privileged Super Admin & Judge RBAC)
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

CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON public.admin_roles(is_active);

-- ============================================================================
-- 3. CREATOR PROFILES TABLE
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

CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON public.creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_visibility ON public.creator_profiles(visibility);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_specialty ON public.creator_profiles(specialty);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_technical_skills ON public.creator_profiles USING gin (technical_skills);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_creative_skills ON public.creator_profiles USING gin (creative_skills);

-- ============================================================================
-- 4. PORTFOLIO PROJECTS TABLE
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
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_visibility ON public.portfolio_projects(visibility);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_featured ON public.portfolio_projects(featured);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_workflow_stages ON public.portfolio_projects USING gin (workflow_stages);

-- ============================================================================
-- 5. CREATOR WORKFLOWS TABLE
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
CREATE INDEX IF NOT EXISTS idx_creator_workflows_visibility ON public.creator_workflows(visibility);

-- ============================================================================
-- 6. CREATIVE DNA DOSSIER & FEEDBACK TABLES
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

CREATE TABLE IF NOT EXISTS public.creative_dna_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  trait_name TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('confirm', 'modify', 'reject')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_dna_feedback_creator ON public.creative_dna_feedback(creator_id);

-- ============================================================================
-- 7. BRANDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_brands_user_id ON public.brands(user_id);

-- ============================================================================
-- 8. CAMPAIGNS TABLE
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
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON public.campaigns(owner_brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

-- ============================================================================
-- 9. SHORTLISTS TABLE
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
-- 10. INVITATIONS TABLE
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
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

-- ============================================================================
-- 11. COLLABORATIONS TABLE
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
CREATE INDEX IF NOT EXISTS idx_collaborations_status ON public.collaborations(status);

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
-- 13. ACTIVITY LOGS AUDIT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('creator', 'brand', 'system', 'admin')),
  actor_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- ============================================================================
-- 14. VERIFICATION CLAIMS & AUDIT LOG TABLES (Trust Centre)
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
  evidence_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  reviewer_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_claims_creator ON public.verification_claims(creator_id);
CREATE INDEX IF NOT EXISTS idx_verification_claims_status ON public.verification_claims(status);
CREATE INDEX IF NOT EXISTS idx_verification_claims_type ON public.verification_claims(claim_type);
CREATE INDEX IF NOT EXISTS idx_verification_claims_private ON public.verification_claims(is_private);

CREATE TABLE IF NOT EXISTS public.verification_audit_log (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL,
  creator_id TEXT NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'APPROVED', 'REJECTED', 'REQUEST_INFO', 'SUBMITTED', 'RENEWAL_REQUESTED'
  )),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_audit_creator ON public.verification_audit_log(creator_id);
CREATE INDEX IF NOT EXISTS idx_verification_audit_claim ON public.verification_audit_log(claim_id);
CREATE INDEX IF NOT EXISTS idx_verification_audit_created ON public.verification_audit_log(created_at DESC);

-- ============================================================================
-- 15. SUPER ADMIN GOVERNANCE TABLES (AlloyTrust & Platform Management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trust_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('brand', 'creator', 'campaign', 'collaboration', 'content')),
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_category TEXT DEFAULT 'low' CHECK (risk_category IN ('low', 'medium', 'high', 'critical')),
  evidence_confidence TEXT DEFAULT 'low' CHECK (evidence_confidence IN ('low', 'medium', 'high', 'verified')),
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'needs_review', 'verification_requested', 'under_investigation',
    'cleared', 'restricted', 'resolved'
  )),
  assigned_reviewer UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_reports_entity ON public.trust_reports(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_trust_reports_status ON public.trust_reports(status);
CREATE INDEX IF NOT EXISTS idx_trust_reports_risk ON public.trust_reports(risk_category);
CREATE INDEX IF NOT EXISTS idx_trust_reports_created ON public.trust_reports(created_at DESC);

CREATE TABLE IF NOT EXISTS public.trust_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.trust_reports(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'rule_match', 'ai_analysis', 'user_report', 'manual_observation',
    'profile_change', 'url_suspicious', 'identity_mismatch',
    'duplicate_content', 'credential_request', 'off_platform_request'
  )),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  evidence_data JSONB DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'system' CHECK (source IN ('system', 'ai', 'admin', 'user', 'automated_rule')),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_signals_report ON public.trust_signals(report_id);
CREATE INDEX IF NOT EXISTS idx_trust_signals_type ON public.trust_signals(signal_type);

CREATE TABLE IF NOT EXISTS public.trust_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.trust_reports(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'status_change', 'add_note', 'mark_false_positive', 'clear',
    'escalate', 'restrict_account', 'restore_account',
    'restrict_campaign', 'restore_campaign', 'resolve',
    'request_verification', 'assign_reviewer'
  )),
  previous_status TEXT,
  new_status TEXT,
  reason TEXT,
  internal_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_decisions_report ON public.trust_decisions(report_id);
CREATE INDEX IF NOT EXISTS idx_trust_decisions_reviewer ON public.trust_decisions(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_trust_decisions_created ON public.trust_decisions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON public.audit_events(action);
CREATE INDEX IF NOT EXISTS idx_audit_events_target ON public.audit_events(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON public.audit_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_config (config_key, config_value, description) VALUES
  ('trust_observation_period_days', '14'::jsonb, 'Initial observation period for new accounts in days'),
  ('risk_review_threshold', '60'::jsonb, 'Risk score threshold that triggers mandatory review'),
  ('max_profile_changes_per_day', '5'::jsonb, 'Maximum profile changes allowed per day before flagging'),
  ('trust_report_retention_days', '365'::jsonb, 'Days to retain resolved trust reports')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================================
-- 16. SECURITY HELPER FUNCTIONS & TRIGGERS
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

-- Trigger: Prevent unauthorized privilege escalation to role='admin' on profiles
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_admin_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role <> 'admin') THEN
    IF NOT (
      current_user = 'service_role'
      OR coalesce((auth.jwt() ->> 'role'), '') = 'service_role'
      OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
      OR public.is_super_admin()
    ) THEN
      RAISE EXCEPTION 'Access Denied: Administrative role assignments require verified Super Admin authorization.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_unauthorized_admin_profile ON public.profiles;
CREATE TRIGGER trg_prevent_unauthorized_admin_profile
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_admin_profile_role();

-- Function: Validate Conversation Participant Authorization for Messaging
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id TEXT,
  p_user_id UUID,
  p_sender TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    -- Case 1: Conversation anchored by an invitation
    SELECT 1 FROM public.invitations inv
    JOIN public.brands b ON b.id = inv.brand_id
    JOIN public.creator_profiles c ON c.id = inv.creator_id
    WHERE (
      (inv.campaign_id IS NOT NULL AND p_conversation_id = ('conn-' || inv.campaign_id || '-' || inv.creator_id))
      OR p_conversation_id = ('conn-' || inv.brand_id || '-' || inv.creator_id)
      OR p_conversation_id = inv.id
    )
    AND (
      CASE 
        WHEN p_sender = 'brand' THEN b.user_id = p_user_id
        WHEN p_sender = 'creator' THEN c.user_id = p_user_id
        ELSE (b.user_id = p_user_id OR c.user_id = p_user_id)
      END
    )

    UNION ALL

    -- Case 2: Conversation anchored by an active collaboration
    SELECT 1 FROM public.collaborations col
    JOIN public.brands b ON b.id = col.brand_id
    JOIN public.creator_profiles c ON c.id = col.creator_id
    WHERE (
      (col.campaign_id IS NOT NULL AND p_conversation_id = ('conn-' || col.campaign_id || '-' || col.creator_id))
      OR p_conversation_id = ('conn-' || col.brand_id || '-' || col.creator_id)
      OR p_conversation_id = col.id
    )
    AND (
      CASE 
        WHEN p_sender = 'brand' THEN b.user_id = p_user_id
        WHEN p_sender = 'creator' THEN c.user_id = p_user_id
        ELSE (b.user_id = p_user_id OR c.user_id = p_user_id)
      END
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_conversation_participant(TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(TEXT, UUID, TEXT) TO authenticated;

-- Function & Trigger: Automatically sync every new Supabase Auth user into public.profiles
-- and create their initial creator_profile or brand entry in the Supabase Table Editor
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
  -- Never abort auth signup if secondary profile sync encounters an edge case
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Attach trigger to auth.users if permissions allow (standard Supabase pattern)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Graceful bypass if schema editor lacks direct auth schema trigger privileges
  NULL;
END $$;

-- ============================================================================
-- 17. ROW LEVEL SECURITY (RLS) POLICIES
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
  USING (visibility = 'published' OR is_demo = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Creator self update" ON public.creator_profiles;
CREATE POLICY "Creator self update" ON public.creator_profiles FOR UPDATE
  USING (auth.uid() = user_id OR is_demo = true);

-- Portfolio Projects
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public portfolio read" ON public.portfolio_projects;
CREATE POLICY "Public portfolio read" ON public.portfolio_projects FOR SELECT
  USING (visibility = 'published' OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = portfolio_projects.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ));
DROP POLICY IF EXISTS "Creator portfolio insert" ON public.portfolio_projects;
CREATE POLICY "Creator portfolio insert" ON public.portfolio_projects FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = portfolio_projects.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ));
DROP POLICY IF EXISTS "Creator portfolio update" ON public.portfolio_projects;
CREATE POLICY "Creator portfolio update" ON public.portfolio_projects FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = portfolio_projects.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ));
DROP POLICY IF EXISTS "Creator portfolio delete" ON public.portfolio_projects;
CREATE POLICY "Creator portfolio delete" ON public.portfolio_projects FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = portfolio_projects.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ));

-- Creator Workflows
ALTER TABLE public.creator_workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workflows public read" ON public.creator_workflows;
CREATE POLICY "Workflows public read" ON public.creator_workflows FOR SELECT
  USING (visibility = 'published' OR is_demo = true OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creator_workflows.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ));
DROP POLICY IF EXISTS "Workflows owner insert" ON public.creator_workflows;
CREATE POLICY "Workflows owner insert" ON public.creator_workflows FOR INSERT
  WITH CHECK (is_demo = true OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creator_workflows.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ));
DROP POLICY IF EXISTS "Workflows owner update" ON public.creator_workflows;
CREATE POLICY "Workflows owner update" ON public.creator_workflows FOR UPDATE
  USING (is_demo = true OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creator_workflows.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ));
DROP POLICY IF EXISTS "Workflows owner delete" ON public.creator_workflows;
CREATE POLICY "Workflows owner delete" ON public.creator_workflows FOR DELETE
  USING (is_demo = true OR EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creator_workflows.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ));

-- Creative DNA
ALTER TABLE public.creative_dna ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Creative DNA public read" ON public.creative_dna;
CREATE POLICY "Creative DNA public read" ON public.creative_dna FOR SELECT USING (true);
DROP POLICY IF EXISTS "Creative DNA update" ON public.creative_dna;
CREATE POLICY "Creative DNA update" ON public.creative_dna FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.creator_profiles c WHERE c.id = creative_dna.creator_id AND (c.user_id = auth.uid() OR c.is_demo = true)
  ));

-- Creative DNA Feedback
ALTER TABLE public.creative_dna_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "DNA feedback insert" ON public.creative_dna_feedback;
CREATE POLICY "DNA feedback insert" ON public.creative_dna_feedback FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "DNA feedback read" ON public.creative_dna_feedback;
CREATE POLICY "DNA feedback read" ON public.creative_dna_feedback FOR SELECT USING (true);

-- Brands
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Brands public read" ON public.brands;
CREATE POLICY "Brands public read" ON public.brands FOR SELECT USING (true);
DROP POLICY IF EXISTS "Brand owner update" ON public.brands;
CREATE POLICY "Brand owner update" ON public.brands FOR UPDATE USING (auth.uid() = user_id OR is_demo = true);

-- Campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Campaigns public read" ON public.campaigns;
CREATE POLICY "Campaigns public read" ON public.campaigns FOR SELECT
  USING (visibility = 'published' OR is_demo = true OR EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = campaigns.owner_brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
  ));
DROP POLICY IF EXISTS "Brand owner campaign insert" ON public.campaigns;
CREATE POLICY "Brand owner campaign insert" ON public.campaigns FOR INSERT
  WITH CHECK (is_demo = true OR EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = campaigns.owner_brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
  ));
DROP POLICY IF EXISTS "Brand owner campaign update" ON public.campaigns;
CREATE POLICY "Brand owner campaign update" ON public.campaigns FOR UPDATE
  USING (is_demo = true OR EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = campaigns.owner_brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
  ));

-- Shortlists
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shortlists brand read" ON public.shortlists;
CREATE POLICY "Shortlists brand read" ON public.shortlists FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = shortlists.brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
  ));
DROP POLICY IF EXISTS "Shortlists brand insert" ON public.shortlists;
CREATE POLICY "Shortlists brand insert" ON public.shortlists FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = shortlists.brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
  ));
DROP POLICY IF EXISTS "Shortlists brand delete" ON public.shortlists;
CREATE POLICY "Shortlists brand delete" ON public.shortlists FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = shortlists.brand_id AND (b.user_id = auth.uid() OR b.is_demo = true)
  ));

-- Invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invitations participant read" ON public.invitations;
CREATE POLICY "Invitations participant read" ON public.invitations FOR SELECT
  USING (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = invitations.brand_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = invitations.creator_id AND c.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Invitations brand insert" ON public.invitations;
CREATE POLICY "Invitations brand insert" ON public.invitations FOR INSERT
  WITH CHECK (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = invitations.brand_id AND b.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Invitations participant update" ON public.invitations;
CREATE POLICY "Invitations participant update" ON public.invitations FOR UPDATE
  USING (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = invitations.brand_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = invitations.creator_id AND c.user_id = auth.uid())
  );

-- Collaborations
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Collaborations participant read" ON public.collaborations;
CREATE POLICY "Collaborations participant read" ON public.collaborations FOR SELECT
  USING (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = collaborations.brand_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = collaborations.creator_id AND c.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Collaborations participant update" ON public.collaborations;
CREATE POLICY "Collaborations participant update" ON public.collaborations FOR UPDATE
  USING (
    is_demo = true
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = collaborations.brand_id AND b.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = collaborations.creator_id AND c.user_id = auth.uid())
  );

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages participant read" ON public.messages;
CREATE POLICY "Messages participant read" ON public.messages FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND public.is_conversation_participant(conversation_id, auth.uid(), NULL)
  );
DROP POLICY IF EXISTS "Messages participant insert" ON public.messages;
CREATE POLICY "Messages participant insert" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND LENGTH(TRIM(text)) > 0
    AND sender IN ('creator', 'brand')
    AND public.is_conversation_participant(conversation_id, auth.uid(), sender)
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
-- 18. SUPABASE REALTIME REPLICATION CONFIGURATION
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborations;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
