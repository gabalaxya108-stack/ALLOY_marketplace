// server/scripts/populateAllCreators.js
// Populates all 43 creator profiles and their portfolio projects in Supabase
// with 100% unique, non-repeating portfolio pieces across all 9 specialities.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = val;
      }
    }
  });
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Import the full creator definition library
import { CREATOR_DEFINITIONS } from './creatorDefinitions.js';

async function run() {
  console.log(`Starting population of ${CREATOR_DEFINITIONS.length} creators...`);

  // 1. Strict Duplicate Check: No portfolio project may be repeated across any creators!
  const projectImages = [];
  const projectMap = {};
  const heroImages = [];
  const heroMap = {};

  CREATOR_DEFINITIONS.forEach(c => {
    // Check hero uniqueness across all creators
    if (c.hero_work) {
      if (heroMap[c.hero_work]) {
        console.error(`DUPLICATE HERO IMAGE: ${c.hero_work} used in both ${c.id} and ${heroMap[c.hero_work]}`);
        process.exit(1);
      }
      heroMap[c.hero_work] = c.id;
      heroImages.push(c.hero_work);
    }

    // Check project uniqueness across all creators
    (c.projects || []).forEach(p => {
      if (p.image) {
        if (projectMap[p.image]) {
          console.error(`DUPLICATE PORTFOLIO PIECE: ${p.image} used in project ${p.id} (${c.id}) and ${projectMap[p.image]}`);
          process.exit(1);
        }
        projectMap[p.image] = `${c.id} -> ${p.id}`;
        projectImages.push(p.image);
      }
    });
  });

  const uniqueProjectImages = new Set(projectImages);
  console.log(`Total portfolio projects checked: ${projectImages.length}. Unique project images: ${uniqueProjectImages.size}.`);
  console.log(`Total creator heroes checked: ${heroImages.length}. Unique hero images: ${new Set(heroImages).size}.`);

  if (uniqueProjectImages.size !== projectImages.length) {
    console.error('ERROR: Duplicate portfolio project images found across creators!');
    process.exit(1);
  }
  console.log('✅ ZERO REPEATING PORTFOLIOS: Every single portfolio project and creator hero across all 43 creators is 100% unique!\n');

  // 2. Clear old portfolio projects for these creators to ensure clean slate without orphan duplicates
  console.log('Clearing old portfolio projects from DB...');
  const { error: deletePrjErr } = await client
    .from('portfolio_projects')
    .delete()
    .neq('id', 'keep-nothing-special');
  if (deletePrjErr) {
    console.warn('Warning during projects cleanup:', deletePrjErr.message);
  } else {
    console.log('Old projects cleared successfully.');
  }

  // 3. Populate each creator in creator_profiles and portfolio_projects
  let updatedProfilesCount = 0;
  let insertedProjectsCount = 0;

  for (const c of CREATOR_DEFINITIONS) {
    const { projects, ...profileData } = c;

    // A. Update or upsert creator profile
    const { error: profErr } = await client
      .from('creator_profiles')
      .upsert({
        ...profileData,
        portfolio_projects: projects,
        portfolio_images: projects.map(p => p.image),
        status: 'Published',
        visibility: 'published',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profErr) {
      console.error(`Failed to update profile [${c.id}]:`, profErr.message);
    } else {
      updatedProfilesCount++;
    }

    // B. Insert projects into portfolio_projects table
    if (projects && projects.length > 0) {
      const dbProjects = projects.map((p, idx) => ({
        id: p.id,
        creator_id: c.id,
        title: p.title,
        description: p.description,
        category: p.category,
        creative_style: p.creativeStyle || p.creative_style || 'Editorial & Cinematic',
        tools: p.tools,
        format: p.format || '4K Digital Master',
        image: p.image,
        video: p.video || null,
        aspect: p.aspect || 'landscape',
        role: p.role || 'Lead Visual Artist',
        client_type: p.clientType || p.client_type || 'Commercial Campaign',
        creative_direction: p.creativeDirection || p.creative_direction || '',
        capabilities: p.capabilities || [],
        media: p.media || [],
        visibility: 'published',
        featured: !!p.featured,
        display_order: idx + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: prjErr } = await client
        .from('portfolio_projects')
        .upsert(dbProjects, { onConflict: 'id' });

      if (prjErr) {
        console.error(`Failed to insert projects for [${c.id}]:`, prjErr.message);
      } else {
        insertedProjectsCount += dbProjects.length;
      }
    }
  }

  console.log(`\n🎉 DONE: Successfully updated ${updatedProfilesCount} creator profiles and inserted ${insertedProjectsCount} unique portfolio projects in Supabase DB!`);
}

run();
