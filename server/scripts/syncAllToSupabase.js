// server/scripts/syncAllToSupabase.js
// Comprehensive Database Sync & Seed Utility for ALLOY Marketplace
// Populates and updates all sections in Supabase Table Editor:
// - brands
// - campaigns
// - creator_profiles
// - portfolio_projects
// - creator_workflows
// - shortlists

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { CREATORS } from '../../src/data/creatorsData.js';
import { DEMO_BRANDS, INITIAL_CAMPAIGNS } from '../../src/data/marketplaceStore.js';
import { DEMO_WORKFLOWS } from '../../src/data/workflowsData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env credentials
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const envConfig = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const k = match[1].trim();
        const v = match[2].trim().replace(/^["']|["']$/g, '');
        envConfig[k] = v;
      }
    });
  }
  return envConfig;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(url, key);

export async function syncAll() {
  console.log('\n======================================================');
  console.log(' ALLOY — COMPREHENSIVE SUPABASE TABLE EDITOR SYNC');
  console.log('======================================================');
  console.log('Target URL:', url);

  // 1. SYNC BRANDS
  console.log('\n[1/5] Syncing Brands to Supabase (table: brands)...');
  for (const b of DEMO_BRANDS) {
    const payload = {
      id: b.id,
      name: b.name,
      industry: b.industry || 'Creative & Media',
      website: b.website || '',
      logo: b.logo || null,
      cover_image: b.coverImage || null,
      description: b.description || '',
      aesthetic: b.aesthetic || '',
      brand_colors: b.brandColors || [],
      preferred_platforms: b.preferredPlatforms || [],
      is_demo: true,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('brands').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn(`  ❌ Failed to sync brand "${b.name}":`, error.message);
    } else {
      console.log(`  ✅ Brand synced: ${b.name} (${b.id})`);
    }
  }

  // 2. SYNC CAMPAIGNS
  console.log('\n[2/5] Syncing Campaigns to Supabase (table: campaigns)...');
  for (const c of INITIAL_CAMPAIGNS) {
    const payload = {
      id: c.id,
      owner_brand_id: c.ownerBrandId || 'brand-demo-lumina',
      brand_name: c.brandName || 'Lumina Botanica',
      brand_avatar: c.brandAvatar || null,
      brand_website: c.brandWebsite || null,
      title: c.title,
      objective: c.objective || 'Product Launch',
      product_or_service: c.productOrService || '',
      industry: c.industry || 'Beauty & Skincare',
      description: c.description || '',
      creative_direction: c.creativeDirection || '',
      creative_style: c.creativeStyle || '',
      tone_of_voice: c.toneOfVoice || '',
      deliverables: Array.isArray(c.deliverables) ? c.deliverables : [c.deliverables].filter(Boolean),
      platforms: c.platforms || [],
      budget: c.budget || '$5,000 – $10,000',
      currency: c.currency || 'USD',
      timeline: c.timeline || '2–3 Weeks',
      deadline: c.deadline || 'Nov 20, 2026',
      target_audience: c.targetAudience || '',
      cover_image: c.coverImage || null,
      status: c.status || 'Active',
      visibility: (c.visibility === 'draft' || c.visibility === 'private') ? c.visibility : 'published',
      is_demo: true,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('campaigns').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn(`  ❌ Failed to sync campaign "${c.title}":`, error.message);
    } else {
      console.log(`  ✅ Campaign synced: ${c.title} (${c.id})`);
    }
  }

  // 3. SYNC CREATOR PROFILES
  console.log(`\n[3/5] Syncing ${CREATORS.length} Creator Profiles (table: creator_profiles)...`);
  for (const cr of CREATORS) {
    const payload = {
      id: cr.id,
      name: cr.name,
      handle: cr.handle || `@${cr.id}`,
      creative_identity: cr.creativeIdentity || cr.role || '',
      bio: cr.bio || '',
      specialty: cr.specialty || cr.disciplines?.[0] || 'AI Visual Direction',
      location: cr.location || 'Global',
      availability: cr.availability || 'Available for projects',
      status_badge: cr.statusBadge || 'Available now',
      turnaround: cr.turnaround || '48h concept frames',
      experience: cr.experience || '3+ years generative art',
      hero_work: cr.heroWork || cr.projects?.[0]?.image || '',
      video_preview: cr.videoPreview || null,
      avatar: cr.avatar || '',
      styles: cr.styles || [],
      industries: cr.industries || [],
      capabilities: cr.capabilities || [],
      tools: cr.tools || [],
      platforms: cr.platforms || [],
      category_tags: cr.categoryTags || [],
      technical_skills: cr.technicalSkills || [],
      creative_skills: cr.creativeSkills || [],
      commercial_licensing_verified: Boolean(cr.commercialLicensingVerified ?? true),
      trust_verification: cr.trustVerification || {},
      status: cr.status || 'Published',
      visibility: cr.visibility || 'published',
      is_demo: Boolean(cr.isDemo ?? true),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('creator_profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn(`  ❌ Failed to sync creator "${cr.name}":`, error.message);
    } else {
      console.log(`  ✅ Creator synced: ${cr.name} (${cr.id})`);
    }

    // 4. SYNC PORTFOLIO PROJECTS FOR THIS CREATOR
    if (Array.isArray(cr.projects) && cr.projects.length > 0) {
      for (const p of cr.projects) {
        const projPayload = {
          id: p.id,
          creator_id: cr.id,
          title: p.title || 'Portfolio Work',
          description: p.description || '',
          category: p.category || 'Visual Art',
          creative_style: p.creativeStyle || '',
          tools: typeof p.tools === 'string' ? p.tools : (Array.isArray(p.tools) ? p.tools.join(', ') : ''),
          format: p.format || '4K Stills Suite',
          image: p.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85',
          video: p.video || null,
          aspect: p.aspect || '16:9',
          role: p.role || 'Lead Visual Artist',
          client_type: p.clientType || '',
          creative_direction: p.creativeDirection || '',
          capabilities: p.capabilities || [],
          media: p.media || [],
          workflow_id: p.workflowId || null,
          workflow_stages: p.workflowStages || [],
          production_workflow: p.productionWorkflow || {},
          visibility: p.visibility || 'published',
          featured: Boolean(p.featured),
          display_order: p.displayOrder || 0,
          updated_at: new Date().toISOString()
        };
        const { error: projErr } = await supabase.from('portfolio_projects').upsert(projPayload, { onConflict: 'id' });
        if (projErr) {
          console.warn(`    ⚠️ Project sync note ("${p.title}"):`, projErr.message);
        }
      }
    }
  }

  // 5. SYNC WORKFLOWS
  console.log(`\n[5/5] Syncing ${DEMO_WORKFLOWS.length} Creator Workflows (table: creator_workflows)...`);
  for (const w of DEMO_WORKFLOWS) {
    const wfPayload = {
      id: w.id,
      creator_id: (w.creatorId === 'kai-sorenson' ? 'alex-rivera' : (w.creatorId || 'maya-chen')),
      title: w.title,
      description: w.description || '',
      specialization: w.specialization || '',
      linked_project_id: (w.creatorId === 'kai-sorenson' ? null : (w.linkedProjectId || null)),
      linked_project_title: w.linkedProjectTitle || null,
      status: w.status || 'Published',
      visibility: w.visibility || 'published',
      human_involvement_notes: w.humanInvolvementNotes || '',
      steps: w.steps || [],
      is_demo: Boolean(w.isDemo ?? true),
      updated_at: new Date().toISOString()
    };
    const { error: wfErr } = await supabase.from('creator_workflows').upsert(wfPayload, { onConflict: 'id' });
    if (wfErr) {
      console.warn(`  ⚠️ Workflow sync note ("${w.title}"):`, wfErr.message);
    } else {
      console.log(`  ✅ Workflow synced: ${w.title} (${w.id})`);
    }
  }

  console.log('\n======================================================');
  console.log(' ALLOY TABLE EDITOR SYNC COMPLETE');
  console.log('======================================================\n');
}

// Execute if run directly
syncAll().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
