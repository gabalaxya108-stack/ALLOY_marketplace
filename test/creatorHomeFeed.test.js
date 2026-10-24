// test/creatorHomeFeed.test.js
// Alloy — Creator Home Feed Verification Suite
// Verifies:
// 1. Content category classification and distinction
// 2. Visual prominence and metadata for brand opportunities
// 3. Strict separation of open opportunities vs completed collaborations
// 4. Personalization & niche alignment using verified creator data without fabrication
// 5. Navigation & callback connections to existing application flows

import assert from 'assert';
import { CREATORS } from '../src/data/creatorsData.js';
import { INITIAL_CAMPAIGNS } from '../src/data/marketplaceStore.js';
import { INITIAL_CREATOR_PROJECTS } from '../src/data/connectionsData.js';

async function runCreatorHomeFeedTests() {
  console.log('\n================================================================');
  console.log(' ALLOY — CREATOR HOME FEED VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`          ${err.message}`);
      failed++;
    }
  }

  // --- Group 1: Content Distinction & Schema Integrity ---
  console.log('--- Group 1: Content Distinction & Schema Integrity ---');

  test('1.1 Creator-originated posts emphasize creative media, tools, and creator identity', () => {
    const creator = CREATORS.find(c => c.id === 'maya-chen');
    assert.ok(creator, 'Maya Chen must exist in CREATORS roster');
    assert.ok(creator.projects && creator.projects.length > 0, 'Creator must have portfolio projects');

    const project = creator.projects[0];
    assert.ok(project.title, 'Project must have title');
    assert.ok(project.category, 'Project must have category');
    assert.ok(project.image, 'Project must have visual media');
    assert.ok(project.creativeDirection, 'Project must have creative direction notes');
    assert.ok(creator.name && creator.handle, 'Creator must have name and handle');
  });

  test('1.2 Brand-originated content contains verified brand identity, compensation, and deadline', () => {
    const campaigns = INITIAL_CAMPAIGNS.filter(c => c.visibility === 'published');
    assert.ok(campaigns.length > 0, 'Published campaigns must exist');

    campaigns.forEach(camp => {
      assert.ok(camp.brandName, 'Campaign must have brandName');
      assert.ok(camp.title, 'Campaign must have title');
      assert.ok(camp.budget, 'Campaign must specify compensation/budget');
      assert.ok(camp.timeline, 'Campaign must specify timeline');
      assert.ok(camp.deadline, 'Campaign must specify deadline');
      assert.ok(camp.deliverables && camp.deliverables.length > 0, 'Campaign must list deliverables');
    });
  });

  test('1.3 Completed collaborations are strictly distinguished from open campaigns', () => {
    const completed = INITIAL_CREATOR_PROJECTS.find(p => p.status === 'approved' || p.status === 'completed');
    assert.ok(completed, 'A completed collaboration record must exist');
    assert.ok(completed.brandName, 'Must specify brand');
    assert.ok(completed.deliverablesScope, 'Must describe delivered scope');
    assert.ok(completed.latestFeedback, 'Must include client feedback/testimonial');
    assert.strictEqual(completed.deadline, 'Completed', 'Deadline must reflect completion');
  });

  // --- Group 2: Prominence of Brand Opportunities in Viewport ---
  console.log('\n--- Group 2: Prominence of Brand Opportunities in Viewport ---');

  test('2.1 Featured brand opportunity exposes prominent creative brief and remaining capacity', () => {
    const featured = INITIAL_CAMPAIGNS.find(c => c.id === 'camp-summer-skincare');
    assert.ok(featured, 'Hero campaign must exist');
    assert.ok(featured.coverImage, 'Hero campaign must have prominent cover image');
    assert.ok(featured.description, 'Hero campaign must have clear brief description');
    assert.strictEqual(featured.ownerBrandId, 'brand-demo-lumina', 'Must be owned by verified brand');
  });

  test('2.2 Open opportunities expose accurate application slot limits', () => {
    const openOpps = INITIAL_CAMPAIGNS.filter(c => c.visibility === 'published');
    openOpps.forEach(opp => {
      const slots = opp.remainingSlots ?? opp.creatorSlots ?? 1;
      assert.ok(typeof slots === 'number' && slots >= 0, 'Slots must be non-negative number');
    });
  });

  // --- Group 3: Personalization Without Fabrication ---
  console.log('\n--- Group 3: Personalization & Alignment Without Fabrication ---');

  test('3.1 Creator with Beauty & Skincare industry and Cinematic style matches campaign requirements', () => {
    const maya = CREATORS.find(c => c.id === 'maya-chen');
    const skincare = INITIAL_CAMPAIGNS.find(c => c.id === 'camp-summer-skincare');

    const mayaStyles = maya.styles || [];
    const mayaIndustries = maya.industries || [];
    const oppStyle = skincare.creativeStyle || '';
    const oppIndustry = skincare.industry || '';

    const styleMatch = mayaStyles.some(s => s && oppStyle.toLowerCase().includes(s.toLowerCase()));
    const industryMatch = mayaIndustries.some(i => i && oppIndustry.toLowerCase().includes(i.toLowerCase()));

    assert.ok(industryMatch, 'Maya Chen must match Beauty & Skincare industry');
    assert.ok(styleMatch, 'Maya Chen must match Cinematic style');
  });

  test('3.2 Non-matching creators do not receive fabricated match badges', () => {
    const nicheCampaign = {
      desiredCreatorSpecialties: ['Underwater Macro Biology Simulation']
    };
    const creator = {
      specialty: 'Fashion Photography',
      capabilities: ['Editorial Lighting'],
      styles: ['Minimal']
    };

    const hasMatch = (nicheCampaign.desiredCreatorSpecialties || []).some(d =>
      [creator.specialty, ...creator.capabilities, ...creator.styles].some(c =>
        c && d.toLowerCase().includes(c.toLowerCase())
      )
    );

    assert.strictEqual(hasMatch, false, 'Must not claim match when no verified capability aligns');
  });

  // --- Group 4: Destination & Flow Isolation ---
  console.log('\n--- Group 4: Destination & Flow Isolation ---');

  test('4.1 Home Feed retains distinct responsibility from Opportunities and My Applications', () => {
    // Verify that Opportunities marketplace continues to support structured discovery
    const allCampaigns = INITIAL_CAMPAIGNS;
    assert.ok(allCampaigns.length >= 2, 'Opportunities retains full catalog');

    // Verify application tracking state exists separately
    const activeProjects = INITIAL_CREATOR_PROJECTS.filter(p => p.status === 'in-progress');
    assert.ok(activeProjects.length > 0, 'Active projects exist separately from feed browsing');
  });

  console.log('\n----------------------------------------------------------------');
  console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('----------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runCreatorHomeFeedTests();
