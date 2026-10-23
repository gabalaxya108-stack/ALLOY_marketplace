-- ============================================================================
-- MIGRATION: 20261023_campaign_applications.sql
-- ALLOY / CREASYNC — Durable Marketplace Applications & Atomic Capacity Management
-- Review and execute this script in Supabase SQL Editor.
-- ============================================================================

-- 1. Ensure foreign key column exists on collaborations
ALTER TABLE IF EXISTS public.collaborations
  ADD COLUMN IF NOT EXISTS application_id TEXT;

-- 2. Create the campaign_applications table
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

-- 3. Indexes for high-performance application queries & brand lookups
CREATE INDEX IF NOT EXISTS idx_campaign_apps_campaign ON public.campaign_applications(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_apps_brand ON public.campaign_applications(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaign_apps_creator ON public.campaign_applications(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaign_apps_status ON public.campaign_applications(status);
CREATE INDEX IF NOT EXISTS idx_campaign_apps_created_at ON public.campaign_applications(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Creators can read their own applications (including held ones)
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

-- Policy 2: Brands can read applications for their campaigns ONLY IF eligible and not held
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

-- Policy 3: Creators can insert their own application
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

-- Policy 4: Participant updates (Brand counters/accepts; Creator accepts/declines counter)
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

-- 5. Atomic Slot Capacity Acceptance Function (Transactional RPC)
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
