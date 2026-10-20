-- ============================================================================
-- ALLOY / CREASYNC MASTER SEED DATA SCRIPT (PostgreSQL / Supabase)
-- Seeds initial curated creators, demo brands, sample campaigns, workflows,
-- creative DNA, and verification claims.
-- Run this AFTER running schema.sql in your new Supabase SQL Editor.
-- ============================================================================

-- 1. Insert Initial Demo Brands
INSERT INTO public.brands (
  id, name, industry, website, logo, cover_image, description, aesthetic, brand_colors, preferred_platforms, is_demo
) VALUES 
(
  'brand-demo-lumina',
  'Lumina Botanica',
  'Beauty & Skincare',
  'luminabotanica.com',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85',
  'High-performance botanical skincare formulations engineered with plant stem cells.',
  'Luminous, Dewy & Ethereal',
  ARRAY['#EB6E4B', '#FDF7ED', '#2E3A2F'],
  ARRAY['Instagram', 'Digital OOH', 'Vogue Editorial'],
  TRUE
),
(
  'brand-demo-vanguard',
  'Vanguard Horology',
  'Luxury & Watches',
  'vanguardhorology.ch',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85',
  'Precision avant-garde mechanical timepieces forged from aerospace-grade titanium.',
  'Minimalist Titanium & High-Contrast Shadow',
  ARRAY['#141312', '#E5E5E5', '#3B82F6'],
  ARRAY['Instagram', 'YouTube 4K', 'Monocle'],
  TRUE
),
(
  'brand-demo-solis',
  'Solis Living',
  'Architecture & Design',
  'solisliving.design',
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
  industry = EXCLUDED.industry,
  website = EXCLUDED.website,
  logo = EXCLUDED.logo,
  cover_image = EXCLUDED.cover_image,
  description = EXCLUDED.description,
  aesthetic = EXCLUDED.aesthetic,
  brand_colors = EXCLUDED.brand_colors,
  preferred_platforms = EXCLUDED.preferred_platforms;

-- 2. Insert Maya Chen Creator Profile
INSERT INTO public.creator_profiles (
  id, name, handle, creative_identity, bio, specialty, location, availability, status_badge,
  turnaround, experience, hero_work, avatar, styles, industries, capabilities, tools, platforms,
  category_tags, technical_skills, creative_skills, commercial_licensing_verified, status, visibility, is_demo
) VALUES (
  'maya-chen',
  'Maya Chen',
  '@mayachen.ai',
  'Cinematic AI Director & Visual Worldbuilder',
  'Directing cinematic narrative commercials, evocative brand mythologies, and cinematic product worlds. Combining 35mm anamorphic grain, Wong Kar-wai color poetry, and Denis Villeneuve scale in generative cinema.',
  'AI Video',
  'London / New York (GMT/EST)',
  'Available for projects',
  'Available now',
  '48h concept boards',
  '4 years AI-native cinema',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=85',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  ARRAY['Cinematic', 'Editorial', 'Story-driven', 'Luxury'],
  ARRAY['Beauty & Skincare', 'Luxury & High Fashion', 'Entertainment & Music'],
  ARRAY['AI Video', 'Visual Storytelling', 'Product Campaigns', 'Atmospheric Advertising', 'Creative Direction'],
  ARRAY['Runway Gen-3', 'Midjourney v6.1', 'ComfyUI', 'Luma Dream Machine', 'Premiere Pro'],
  ARRAY['Vimeo Staff Picks', 'Instagram', 'Film Festivals'],
  ARRAY['ai-video', 'creative-direction', 'advertising', 'fashion'],
  ARRAY['ComfyUI Node Graphs', 'Runway Gen-3 Motion Synthesis', 'ControlNet Conditioning', 'LoRA Model Tuning'],
  ARRAY['Cinematic Storyboarding', 'Color Theory & Grade', 'Worldbuilding', 'Lighting Choreography'],
  TRUE,
  'Published',
  'published',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  handle = EXCLUDED.handle,
  creative_identity = EXCLUDED.creative_identity,
  bio = EXCLUDED.bio,
  specialty = EXCLUDED.specialty,
  location = EXCLUDED.location,
  availability = EXCLUDED.availability,
  status_badge = EXCLUDED.status_badge,
  turnaround = EXCLUDED.turnaround,
  experience = EXCLUDED.experience,
  hero_work = EXCLUDED.hero_work,
  avatar = EXCLUDED.avatar,
  styles = EXCLUDED.styles,
  industries = EXCLUDED.industries,
  capabilities = EXCLUDED.capabilities,
  tools = EXCLUDED.tools,
  platforms = EXCLUDED.platforms,
  category_tags = EXCLUDED.category_tags,
  technical_skills = EXCLUDED.technical_skills,
  creative_skills = EXCLUDED.creative_skills,
  commercial_licensing_verified = EXCLUDED.commercial_licensing_verified;

-- 3. Insert Maya Chen Portfolio Projects
INSERT INTO public.portfolio_projects (
  id, creator_id, title, description, category, format, image, aspect, role, client_type, creative_direction, capabilities, visibility, featured, display_order, workflow_stages
) VALUES 
(
  'maya-proj-1',
  'maya-chen',
  'Echoes of the Solarium — Mid-Century Brand Odyssey',
  'A cinematic brand film set in a mid-century botanical observatory, following celestial light refractions across polished glass and raw bronze.',
  'AI Video',
  '4K Stills Suite',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=85',
  'landscape',
  'Generative Director & Editor',
  'Heritage Luxury House',
  'Warm 35mm anamorphic lenses with golden volumetric dust beams and slow mechanical camera tracking.',
  ARRAY['Narrative Cinema', 'Volumetric Lighting', 'Sound-Design Sync'],
  'published',
  TRUE,
  0,
  '[
    {"stage": "Creative Direction", "details": "Anamorphic optics, volumetric lighting lookbook, and color palettes."},
    {"stage": "ComfyUI Node Generation", "details": "Multi-pass diffusion rendering with ControlNet depth alignment."},
    {"stage": "Runway Gen-3 Kinetic Motion", "details": "Motion synthesis at 24fps with camera tracking choreography."},
    {"stage": "DaVinci Resolve Finishing", "details": "ACES color pipeline, film grain emulation, and 4K ProRes mastering."}
  ]'::jsonb
),
(
  'maya-proj-2',
  'maya-chen',
  'Neon Monsoon — Neo-Tokyo Nocturne',
  'Atmospheric street cinematography and fluid motion stills capturing rain-drenched neon reflections in an evocative cyber-noir setting.',
  'AI Video',
  '9:16 Video Loop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=85',
  'portrait',
  'Director & Colorist',
  'Global Streaming Teaser',
  'Reflective asphalt caustics, soft sodium vapor glow, and melancholic anamorphic flares.',
  ARRAY['Short-Form Video', 'Color Grading', 'Atmospheric Stills'],
  'published',
  FALSE,
  1,
  '[
    {"stage": "Concept Frames", "details": "Midjourney v6.1 mood exploration with custom neon prompt weighting."},
    {"stage": "Temporal Coherence", "details": "Frame interpolation and fluid rain droplet dynamics."},
    {"stage": "Mobile Optimization", "details": "9:16 vertical crop composition and seamless looping transition."}
  ]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  format = EXCLUDED.format,
  image = EXCLUDED.image,
  aspect = EXCLUDED.aspect,
  role = EXCLUDED.role,
  client_type = EXCLUDED.client_type,
  creative_direction = EXCLUDED.creative_direction,
  capabilities = EXCLUDED.capabilities,
  workflow_stages = EXCLUDED.workflow_stages;

-- 4. Insert Maya Chen Creative Workflows
INSERT INTO public.creator_workflows (
  id, creator_id, title, description, specialization, linked_project_id, linked_project_title, status, visibility, human_involvement_notes, steps, is_demo
) VALUES (
  'workflow-maya-cinematic',
  'maya-chen',
  'End-to-End Generative Commercial Cinema Pipeline',
  'A rigorous 4-phase production methodology ensuring absolute character consistency, brand aesthetic fidelity, and broadcast-ready delivery.',
  'AI Commercial Direction',
  'maya-proj-1',
  'Echoes of the Solarium — Mid-Century Brand Odyssey',
  'Published',
  'published',
  'Human director controls lighting balance, optical character consistency, and frame-accurate pacing at each milestone.',
  '[
    {"order": 1, "name": "Concept Moodboarding & Lore", "tool": "Midjourney + Claude 3.5", "output": "9-frame visual treatment"},
    {"order": 2, "name": "Node Graph Synthesis", "tool": "ComfyUI + ControlNet", "output": "Full-resolution keyframes"},
    {"order": 3, "name": "Kinetic Motion Passes", "tool": "Runway Gen-3 Alpha", "output": "24fps raw motion clips"},
    {"order": 4, "name": "Pro Master Color & Conform", "tool": "DaVinci Resolve Studio", "output": "ProRes 4444 Master"}
  ]'::jsonb,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  specialization = EXCLUDED.specialization,
  steps = EXCLUDED.steps;

-- 5. Insert Maya Chen Creative DNA
INSERT INTO public.creative_dna (
  id, creator_id, traits, visual_aesthetic, storytelling_approach, product_presentation_style, source, is_live_ai
) VALUES (
  'dna-maya-chen',
  'maya-chen',
  ARRAY['Atmospheric Chiaroscuro', 'Poetic Realism', 'Anamorphic Textures', 'Tactile Materiality', 'Slow Cinema Choreography'],
  'Deep botanical amber, reflective obsidian, and golden morning diffusion with 35mm grain authenticity.',
  'Subtle non-linear vignettes that immerse the viewer into brand lore before revealing the hero product.',
  'Hero product integrated organically into high-concept environments rather than artificial studio backdrops.',
  'portfolio_analysis',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  traits = EXCLUDED.traits,
  visual_aesthetic = EXCLUDED.visual_aesthetic,
  storytelling_approach = EXCLUDED.storytelling_approach,
  product_presentation_style = EXCLUDED.product_presentation_style;

-- 6. Insert Demo Campaigns
INSERT INTO public.campaigns (
  id, owner_brand_id, brand_name, brand_avatar, brand_website, title, objective, product_or_service,
  industry, description, creative_direction, creative_style, tone_of_voice, deliverables, platforms,
  budget, currency, timeline, deadline, target_audience, cover_image, status, visibility, is_demo
) VALUES (
  'camp-summer-skincare',
  'brand-demo-lumina',
  'Lumina Botanica',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
  'luminabotanica.com',
  'Summer Skincare & Radiant Hydration Launch',
  'Product Launch',
  'Radiant Hydration Serum',
  'Beauty & Skincare',
  'Cinematic visual product campaign capturing sun-drenched hydration and cellular dewiness on sun-kissed skin.',
  'Organic natural morning sunlight, macro fluid droplets on botanical leaves, gentle motion caustics.',
  'Luminous, Dewy & Ethereal',
  'Evocative, Sensory, Poetic',
  ARRAY['3x 4K Hero Key Art Stills', '2x 9:16 Kinetic Fluid Motion Loops', '1x 30s Master Cinematic Teaser'],
  ARRAY['Instagram', 'Digital OOH', 'Vogue Editorial'],
  '$8,500 – $12,000',
  'USD',
  '3 Weeks',
  'Nov 15, 2026',
  'Conscious luxury skincare consumers aged 24-42',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85',
  'Active',
  'published',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  objective = EXCLUDED.objective,
  product_or_service = EXCLUDED.product_or_service,
  industry = EXCLUDED.industry,
  description = EXCLUDED.description,
  deliverables = EXCLUDED.deliverables,
  budget = EXCLUDED.budget;

-- 7. Insert Verification Claims for Maya Chen (Trust Centre)
INSERT INTO public.verification_claims (
  id, creator_id, claim_type, claim_title, status, evidence_type, evidence_url, evidence_details, is_private, reviewer_notes, reviewed_by, reviewed_at
) VALUES 
(
  'claim-maya-email',
  'maya-chen',
  'identity',
  'Email Verification (maya.chen@alloy.market)',
  'verified',
  'Supabase Auth OTP Challenge',
  NULL,
  '{"method": "cryptographic_magic_link", "email": "maya.chen@alloy.market"}'::jsonb,
  FALSE,
  'Cryptographically confirmed via Supabase Auth email challenge.',
  'System Automated Auth',
  NOW() - INTERVAL '30 days'
),
(
  'claim-maya-id',
  'maya-chen',
  'identity',
  'Government Identity Verification',
  'pending_review',
  'Passport (UK)',
  'vault://identity/maya_chen_passport_enc.pdf',
  '{"legalName": "Maya Li-Wei Chen", "jurisdiction": "GB", "maskedNumber": "•••••• 8941"}'::jsonb,
  TRUE,
  'Government document queued for compliance verification in encrypted storage.',
  NULL,
  NULL
),
(
  'claim-maya-solarium',
  'maya-chen',
  'portfolio',
  'Portfolio Authenticity: Echoes of the Solarium',
  'verified',
  'ComfyUI JSON Graph & 4K ProRes Master',
  'https://vault.alloy.market/audit/solarium_comfy_v4.json',
  '{"projectId": "maya-proj-1", "seed": 48921104, "format": "ProRes 4444"}'::jsonb,
  FALSE,
  'Inspected original node graph and verified seed reproducibility against finished 4K render.',
  'Elena Rostova (Lead Visual Auditor)',
  NOW() - INTERVAL '5 days'
),
(
  'claim-maya-lumina',
  'maya-chen',
  'portfolio',
  'Portfolio Authenticity: Lumina Botanica Serums',
  'pending_review',
  'ControlNet Depth Passes & Raw PSD Layers',
  'https://vault.alloy.market/audit/lumina_depth_passes.zip',
  '{"projectId": "maya-proj-2", "model": "Midjourney v6.1 + ControlNet"}'::jsonb,
  FALSE,
  'Under visual inspection for fluid droplet depth layer authenticity.',
  NULL,
  NULL
),
(
  'claim-maya-runway',
  'maya-chen',
  'ai_tools',
  'AI Model Claim: Runway Gen-3 Alpha Kinetic Motion',
  'verified',
  'Master Timeline Generation Timestamps',
  NULL,
  '{"toolName": "Runway Gen-3 Alpha", "useCase": "Kinetic motion synthesis"}'::jsonb,
  FALSE,
  'Timestamp metadata in ProRes timeline confirms direct Runway export integration.',
  'Elena Rostova (Lead Visual Auditor)',
  NOW() - INTERVAL '5 days'
),
(
  'claim-maya-licensing',
  'maya-chen',
  'commercial_rights',
  'Commercial Buyout & Model Terms Warranty',
  'verified',
  'Model Terms of Service Disclosure',
  NULL,
  '{"licenseType": "Full Commercial Buyout", "exclusivity": "12 Months Category Exclusivity"}'::jsonb,
  FALSE,
  'Confirmed foundational models permit commercial derivative output under Pro terms.',
  'Platform Legal Operations',
  NOW() - INTERVAL '25 days'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  reviewer_notes = EXCLUDED.reviewer_notes,
  reviewed_by = EXCLUDED.reviewed_by;

-- 8. Insert Verification Audit Log
INSERT INTO public.verification_audit_log (
  id, claim_id, creator_id, reviewer_name, action, notes
) VALUES
(
  'audit-maya-1',
  'claim-maya-solarium',
  'maya-chen',
  'Elena Rostova (Lead Visual Auditor)',
  'APPROVED',
  'Node graph parameters match showcase pieces. Provenance confirmed.'
),
(
  'audit-maya-2',
  'claim-maya-licensing',
  'maya-chen',
  'Platform Legal Operations',
  'APPROVED',
  'Commercial model tier licensing confirmed compliant for commercial campaign usage.'
)
ON CONFLICT (id) DO NOTHING;
