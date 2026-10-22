// test/creatorOnboarding.test.js
// Verification suite for Creator Onboarding publication, profile data preservation,
// and real store persistence lifecycle.

import assert from 'node:assert/strict';
import {
  buildPublishedCreatorProfile,
  createCreatorRecord,
  DISCIPLINE_TO_INDUSTRY_MAP,
  saveCreatorOnboardingDraft,
  loadCreatorOnboardingDraft,
  clearCreatorOnboardingDraft,
  updateCreatorRecord,
  getInitialMarketplaceState,
  getPublicCreatorProfile
} from '../src/data/marketplaceStore.js';

// Setup minimal localStorage mock for Node.js test runner
const memoryStorage = {};
const mockStorage = {
  getItem: (key) => memoryStorage[key] || null,
  setItem: (key, val) => { memoryStorage[key] = String(val); },
  removeItem: (key) => { delete memoryStorage[key]; },
  clear: () => { Object.keys(memoryStorage).forEach(k => delete memoryStorage[k]); }
};

if (typeof global.localStorage === 'undefined') {
  global.localStorage = mockStorage;
  global.sessionStorage = mockStorage;
  global.window = {
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    dispatchEvent: () => {}
  };
}

console.log('\n================================================================');
console.log(' ALLOY — CREATOR ONBOARDING DATA PRESERVATION SUITE');
console.log('================================================================\n');

let passedTests = 0;
const totalExpected = 10;

function runTest(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// Test 1: Non-fashion creator publishing a profile with distinct tools, disciplines, and styles
runTest('1. Non-fashion creator publishes profile with distinct tools, disciplines, and styles', () => {
  const profileData = {
    name: 'Alex Rivera',
    handle: '@alexrivera.3d',
    creativeIdentity: 'AI Product Advertiser & 3D Spatial Technologist',
    location: 'Stockholm / San Francisco',
    bio: 'Pioneering product advertising for next-generation hardware and precision robotics.',
    disciplines: ['3D CGI', 'Consumer Technology'],
    styles: ['Minimal', 'Photorealistic', 'Surreal'],
    tools: ['Blender 4.2', 'Unreal Engine 5', 'ComfyUI'],
    industries: ['Consumer Tech & Hardware', 'Automotive'],
    portfolio: [
      {
        id: 'work-1',
        title: 'Chronos Titanium Assembly',
        category: 'Product Advertising',
        image: 'https://example.com/chronos.jpg'
      }
    ]
  };

  const profile = buildPublishedCreatorProfile(profileData, null);

  // Tools must match user's explicit tools — NOT hardcoded fashion tools
  assert.deepEqual(
    profile.tools,
    ['Blender 4.2', 'Unreal Engine 5', 'ComfyUI'],
    'Creator tools must preserve user-selected 3D/tech tools'
  );
  assert.ok(!profile.tools.includes('Photoshop'), 'Must not inject unselected Photoshop');

  // Styles must be preserved — NOT omitted
  assert.deepEqual(
    profile.styles,
    ['Minimal', 'Photorealistic', 'Surreal'],
    'Creator styles must be preserved and present on published profile'
  );

  // Disciplines & capabilities must be preserved
  assert.deepEqual(profile.disciplines, ['3D CGI', 'Consumer Technology']);
  assert.deepEqual(profile.capabilities, ['3D CGI', 'Consumer Technology']);

  // Industries must reflect user selection — NOT hardcoded Luxury Fashion
  assert.deepEqual(profile.industries, ['Consumer Tech & Hardware', 'Automotive']);
  assert.ok(!profile.industries.includes('Luxury Fashion'), 'Must not force Luxury Fashion onto non-fashion creator');

  // Specialty and handle
  assert.equal(profile.specialty, '3D CGI');
  assert.equal(profile.id, 'alexrivera-3d');
  assert.equal(profile.handle, '@alexrivera.3d');
});

// Test 2: Preservation of user selections when conflicting AI-generated profile data is present
runTest('2. Preservation of user selections when conflicting AI DNA data is present', () => {
  const profileData = {
    name: 'Kira Thorne',
    handle: '@kirathorne',
    tools: ['Cinema 4D', 'Redshift'],
    styles: ['Cyberpunk', 'Isometric'],
    disciplines: ['Animation & Motion'],
    industries: ['Entertainment & Music']
  };

  // Conflicting / generic AI DNA result
  const dnaResult = {
    tools: ['Midjourney v6.1', 'Runway Gen-3'],
    styles: ['Haute Couture', 'Editorial'],
    creativeStyles: [
      { style: 'Haute Couture', provenance: 'AI-inferred' },
      { style: 'Editorial', provenance: 'AI-inferred' }
    ],
    productionTools: [
      { tool: 'Midjourney v6.1', provenance: 'AI-inferred' }
    ],
    industries: ['Luxury Fashion'],
    capabilities: ['Editorial Fashion'],
    provenance: {
      creatorProvided: {
        toolsUsed: ['Midjourney v6.1'],
        preferredStyles: ['Haute Couture'],
        declaredIndustries: ['Luxury Fashion']
      }
    }
  };

  const profile = buildPublishedCreatorProfile(profileData, dnaResult);

  // User explicit selections MUST WIN over AI DNA
  assert.deepEqual(profile.tools, ['Cinema 4D', 'Redshift'], 'User-declared tools must take precedence over AI DNA');
  assert.deepEqual(profile.styles, ['Cyberpunk', 'Isometric'], 'User-declared styles must take precedence over AI DNA');
  assert.deepEqual(profile.disciplines, ['Animation & Motion'], 'User disciplines must take precedence');
  assert.deepEqual(profile.capabilities, ['Animation & Motion'], 'User capabilities must take precedence');
  assert.deepEqual(profile.industries, ['Entertainment & Music'], 'User industries must take precedence');
});

// Test 3: Fallback to AI-generated profile data when user-provided optional fields are absent
runTest('3. Fallback to AI-generated profile data when user-provided optional fields are absent', () => {
  const profileData = {
    name: 'Elena Rostova',
    handle: '@elena.cine',
    tools: [], // User did not specify tools
    styles: [], // User did not specify styles
    disciplines: [], // User did not specify disciplines
    industries: [] // User did not specify industries
  };

  const dnaResult = {
    tools: ['Runway Gen-3 Alpha', 'Flux.1 Pro'],
    creativeStyles: [
      { style: 'Cinematic Anamorphic', provenance: 'Portfolio-supported' },
      { style: 'Cold Studio Chiaroscuro', provenance: 'AI-inferred' }
    ],
    industries: ['Architecture & Hospitality'],
    capabilities: ['Spatial Worldbuilding', 'Atmospheric Lighting'],
    provenance: {
      creatorProvided: {
        statedSpecialty: 'Generative Cinema'
      }
    }
  };

  const profile = buildPublishedCreatorProfile(profileData, dnaResult);

  // AI-generated data should act as fallback
  assert.deepEqual(profile.tools, ['Runway Gen-3 Alpha', 'Flux.1 Pro'], 'Tools must fall back to AI DNA');
  assert.deepEqual(
    profile.styles,
    ['Cinematic Anamorphic', 'Cold Studio Chiaroscuro'],
    'Styles must fall back to AI DNA creativeStyles'
  );
  assert.deepEqual(profile.industries, ['Architecture & Hospitality'], 'Industries must fall back to AI DNA');
  assert.deepEqual(profile.capabilities, ['Spatial Worldbuilding', 'Atmospheric Lighting'], 'Capabilities must fall back to AI DNA');
  assert.equal(profile.specialty, 'Generative Cinema', 'Specialty must fall back to AI DNA stated specialty');
});

// Test 4: Graceful handling when BOTH user-provided and AI-generated optional fields are absent
runTest('4. Graceful handling when BOTH user-provided and AI optional fields are absent', () => {
  const profileData = {
    name: 'Jordan Minimal',
    handle: '@jordan.min',
    tools: [],
    styles: [],
    disciplines: [],
    industries: []
  };

  const profile = buildPublishedCreatorProfile(profileData, null);

  // Must not crash or inject hardcoded fashion data
  assert.deepEqual(profile.tools, [], 'Empty tools array when no user or AI data');
  assert.deepEqual(profile.styles, [], 'Empty styles array when no user or AI data');
  assert.deepEqual(profile.disciplines, [], 'Empty disciplines array when no user or AI data');
  assert.deepEqual(profile.capabilities, [], 'Empty capabilities array when no user or AI data');
  assert.deepEqual(profile.industries, [], 'Empty industries array when no user or AI data');
  assert.equal(profile.specialty, 'AI Visual Direction', 'Default specialty applied gracefully');
  assert.equal(profile.statusBadge, 'Profile Live');
});

// Test 5: Fallback to portfolio project tools when user did not declare top-level tools
runTest('5. Fallback to portfolio project tools when top-level tools are absent', () => {
  const profileData = {
    name: 'Devin Spatial',
    handle: '@devin.spatial',
    tools: [], // No explicit top-level tools
    portfolio: [
      { id: 'p1', title: 'Macro Liquid', tools: ['Houdini', 'Octane'] },
      { id: 'p2', title: 'Zero Gravity', tools: ['Houdini', 'Blender 4.2'] }
    ]
  };

  // Even if generic AI DNA exists, portfolio-grounded evidence takes precedence
  const dnaResult = {
    tools: ['Generic AI Model']
  };

  const profile = buildPublishedCreatorProfile(profileData, dnaResult);

  // Should extract deduplicated tools from portfolio items
  assert.deepEqual(
    profile.tools,
    ['Houdini', 'Octane', 'Blender 4.2'],
    'Tools must extract from uploaded portfolio items'
  );
});

// Test 6: Derivation of industry from creative disciplines without misclassifying uncertain mappings
runTest('6. Derivation of industry from creative disciplines without misclassifying uncertain mappings', () => {
  const profileData = {
    name: 'Sofia Culinary',
    handle: '@sofia.culinary',
    disciplines: ['Food & Beverage', 'Travel & Hospitality'],
    industries: [] // Not explicitly set
  };

  const profile = buildPublishedCreatorProfile(profileData, null);

  // Food & Beverage maps directly to Food & Beverage
  // Travel & Hospitality must NOT fabricate Architecture & Hospitality
  assert.deepEqual(
    profile.industries,
    ['Food & Beverage'],
    'Industries must map defensible disciplines and leave uncertain mappings unresolved'
  );
  assert.ok(
    !profile.industries.includes('Architecture & Hospitality'),
    'Must not misclassify culinary/travel creator as Architecture'
  );
});

// Test 7: Handle normalization and ID generation
runTest('7. Handle normalization and ID generation', () => {
  const profileData = {
    name: 'Marcus Web',
    handle: '@marcus.web.visuals'
  };

  const profile = buildPublishedCreatorProfile(profileData, null);

  assert.equal(profile.id, 'marcus-web-visuals', 'All dots and @ must be sanitized into valid ID');
  assert.equal(profile.handle, '@marcus.web.visuals', 'Handle must retain original formatted string');
});

// Test 8: Julian Vance demo auto-fill compatibility
runTest('8. Julian Vance demo profile retains intended demo tools and industries', () => {
  const julianDemo = {
    name: 'Julian Vance',
    handle: '@julianvance.ai',
    creativeIdentity: 'AI Fashion & Cinematic Narrative Director',
    disciplines: ['AI Fashion', 'AI Product Visuals', '3D CGI', 'Editorial Storytelling'],
    styles: ['Editorial', 'Cinematic', 'Luxury', 'Minimal'],
    tools: ['Midjourney v6.1', 'Runway Gen-3', 'ComfyUI', 'Photoshop'],
    industries: ['Luxury Fashion', 'Editorial', 'Product Advertising']
  };

  const profile = buildPublishedCreatorProfile(julianDemo, null);

  assert.equal(profile.name, 'Julian Vance');
  assert.equal(profile.specialty, 'AI Fashion');
  assert.deepEqual(profile.tools, ['Midjourney v6.1', 'Runway Gen-3', 'ComfyUI', 'Photoshop']);
  assert.deepEqual(profile.industries, ['Luxury Fashion', 'Editorial', 'Product Advertising']);
  assert.deepEqual(profile.styles, ['Editorial', 'Cinematic', 'Luxury', 'Minimal']);
});

// Test 9: Production craft disciplines do not invent fabricated industries
runTest('9. Production craft disciplines do not invent fabricated industries', () => {
  const profileData = {
    name: 'Liam Craft',
    handle: '@liam.motion',
    disciplines: ['3D CGI', 'Animation & Motion', 'Video Editing', 'UGC'],
    industries: [] // No explicit industries
  };

  const profile = buildPublishedCreatorProfile(profileData, null);

  // Mediums/crafts must not fabricate commercial industries like Consumer Tech or Entertainment
  assert.deepEqual(
    profile.industries,
    [],
    'Production craft disciplines must leave industries unresolved instead of fabricating sectors'
  );
  assert.deepEqual(
    profile.disciplines,
    ['3D CGI', 'Animation & Motion', 'Video Editing', 'UGC'],
    'Disciplines must be preserved intact'
  );
  assert.deepEqual(
    profile.capabilities,
    ['3D CGI', 'Animation & Motion', 'Video Editing', 'UGC'],
    'Capabilities must reflect the selected disciplines'
  );
});

// Test 10: Real onboarding publication, draft lifecycle, and store integration path
runTest('10. Real onboarding publication, draft lifecycle, and store integration path', () => {
  mockStorage.clear();

  const draftInput = {
    currentStep: 4,
    profileData: {
      name: 'Maya Lin',
      handle: '@mayalin.3d',
      creativeIdentity: '3D Spatial Technologist',
      disciplines: ['Consumer Technology'],
      styles: ['Photorealistic', 'Minimal'],
      tools: ['Blender 4.2', 'Unreal Engine 5'],
      industries: ['Consumer Tech & Hardware'],
      portfolio: [
        { id: 'w1', title: 'Macro Titanium', image: 'https://example.com/macro.jpg' }
      ]
    },
    dnaResult: null
  };

  // 1. Save draft to local storage
  saveCreatorOnboardingDraft(draftInput);

  // 2. Load draft and verify draft preservation
  const restoredDraft = loadCreatorOnboardingDraft();
  assert.ok(restoredDraft, 'Draft must be restored from storage');
  assert.equal(restoredDraft.currentStep, 4);
  assert.deepEqual(restoredDraft.profileData.tools, ['Blender 4.2', 'Unreal Engine 5'], 'Draft must preserve tools');
  assert.deepEqual(restoredDraft.profileData.industries, ['Consumer Tech & Hardware'], 'Draft must preserve industries');

  // 3. Publish profile using restored data
  const publishedCreator = buildPublishedCreatorProfile(restoredDraft.profileData, restoredDraft.dnaResult);
  assert.equal(publishedCreator.id, 'mayalin-3d');
  assert.deepEqual(publishedCreator.tools, ['Blender 4.2', 'Unreal Engine 5']);
  assert.deepEqual(publishedCreator.styles, ['Photorealistic', 'Minimal']);

  // 4. Draft cleanup on publication
  clearCreatorOnboardingDraft();
  assert.equal(loadCreatorOnboardingDraft(), null, 'Draft must be cleared after publication');

  // 5. Store integration via updateCreatorRecord
  const initialState = getInitialMarketplaceState();
  const nextState = updateCreatorRecord(initialState, publishedCreator);
  const foundCreator = nextState.creators.find(c => c.id === 'mayalin-3d');
  assert.ok(foundCreator, 'Published creator must exist in marketplace store state');
  assert.deepEqual(foundCreator.tools, ['Blender 4.2', 'Unreal Engine 5']);
  assert.deepEqual(foundCreator.styles, ['Photorealistic', 'Minimal']);
  assert.deepEqual(foundCreator.industries, ['Consumer Tech & Hardware']);

  // 6. Public projection via getPublicCreatorProfile
  const publicProfile = getPublicCreatorProfile(foundCreator);
  assert.ok(publicProfile, 'Public profile projection must succeed');
  assert.deepEqual(publicProfile.tools, ['Blender 4.2', 'Unreal Engine 5']);
  assert.deepEqual(publicProfile.styles, ['Photorealistic', 'Minimal']);
  assert.deepEqual(publicProfile.industries, ['Consumer Tech & Hardware']);
});

console.log('\n----------------------------------------------------------------');
console.log(` SUMMARY: ${passedTests}/${totalExpected} tests passed successfully.`);
console.log('----------------------------------------------------------------\n');
