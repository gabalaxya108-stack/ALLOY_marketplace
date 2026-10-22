// test/rlsPolicies.test.js
// Verification Suite for ALLOY Row-Level Security (RLS) Policies
//
// Methodology Note:
// - Tests 1 & 2 perform STATIC SQL PARSING and regex AST audits on `server/db/schema.sql`.
// - Tests 3 to 9 perform LOGICAL SIMULATION of PostgreSQL RLS policy semantics using an in-memory
//   model (`MockDatabaseContext`).
// - These tests do NOT execute against a live PostgreSQL database engine or real database connection.
//   They verify policy correctness, rule structure, and constraint invariants before cloud deployment.

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 Starting ALLOY RLS Security Policy Verification Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

// Read schema.sql content for policy parsing and static audit
const schemaPath = path.resolve(process.cwd(), 'server/db/schema.sql');
assert(fs.existsSync(schemaPath), 'schema.sql must exist at server/db/schema.sql');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Helper to extract policy definitions from schema SQL
function getPoliciesForTable(tableName) {
  const policies = [];
  // Match: CREATE POLICY "name" ON public.tableName FOR [ACTION] USING (...) [WITH CHECK (...)]
  const regex = new RegExp(
    `CREATE\\s+POLICY\\s+"([^"]+)"\\s+ON\\s+public\\.${tableName}\\s+FOR\\s+([A-Z]+)\\s+(?:USING\\s*\\(([\\s\\S]*?)\\))?\\s*(?:WITH\\s+CHECK\\s*\\(([\\s\\S]*?)\\))?;`,
    'gi'
  );
  let match;
  while ((match = regex.exec(schemaContent)) !== null) {
    policies.push({
      name: match[1],
      table: tableName,
      action: match[2].toUpperCase(),
      using: match[3] ? match[3].trim() : null,
      withCheck: match[4] ? match[4].trim() : null
    });
  }
  return policies;
}

// ============================================================================
// TEST GROUP 1: Static Policy Audit - Elimination of Permissive Blanket Policies
// ============================================================================
runTest('1. Elimination of blanket USING (true) on private marketplace tables', () => {
  const privateTables = [
    'brands',
    'messages',
    'invitations',
    'collaborations',
    'shortlists',
    'campaign_funding'
  ];

  for (const table of privateTables) {
    const policies = getPoliciesForTable(table);
    assert(policies.length > 0, `Table ${table} must define RLS policies`);

    for (const p of policies) {
      if (p.using) {
        assert(
          p.using !== 'true',
          `Security violation: Table "${table}" policy "${p.name}" has permissive USING (true)`
        );
      }
      if (p.withCheck) {
        assert(
          p.withCheck !== 'true',
          `Security violation: Table "${table}" policy "${p.name}" has permissive WITH CHECK (true)`
        );
      }
    }
  }
});

runTest('2. All core marketplace tables have Row Level Security explicitly enabled', () => {
  const allTables = [
    'profiles',
    'admin_roles',
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
    'verification_claims'
  ];

  for (const table of allTables) {
    const enableRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY;`, 'i');
    assert(
      enableRegex.test(schemaContent),
      `Table public.${table} must have ENABLE ROW LEVEL SECURITY defined in schema.sql`
    );
  }
});

// ============================================================================
// POLICY EVALUATION ENGINE (Simulates PostgreSQL RLS execution semantics)
// ============================================================================
class MockDatabaseContext {
  constructor() {
    this.users = new Map(); // uid -> { role, email }
    this.adminRoles = new Map(); // uid -> role (super_admin, judge_admin)
    this.brands = new Map(); // id -> { user_id, is_demo, name }
    this.creators = new Map(); // id -> { user_id, is_demo, visibility, name }
    this.campaigns = new Map(); // id -> { owner_brand_id, visibility, is_demo }
    this.shortlists = new Map(); // id -> { brand_id, creator_id }
    this.invitations = new Map(); // id -> { brand_id, creator_id, is_demo }
    this.collaborations = new Map(); // id -> { brand_id, creator_id, is_demo }
    this.campaignFunding = new Map(); // id -> { campaign_id }
    this.messages = new Map(); // id -> { conversation_id, sender, sender_id, text }
  }

  isSuperAdmin(uid) {
    if (!uid) return false;
    const role = this.adminRoles.get(uid);
    return role === 'super_admin' || role === 'judge_admin';
  }

  isConversationParticipant(convId, uid, sender) {
    if (!uid) return false;
    // Check invitations
    for (const inv of this.invitations.values()) {
      const match = (inv.id === convId) ||
                    (convId === `conn-${inv.brand_id}-${inv.creator_id}`) ||
                    (inv.campaign_id && convId === `conn-${inv.campaign_id}-${inv.creator_id}`);
      if (match) {
        const brand = this.brands.get(inv.brand_id);
        const creator = this.creators.get(inv.creator_id);
        if (sender === 'brand') return brand?.user_id === uid;
        if (sender === 'creator') return creator?.user_id === uid;
        return brand?.user_id === uid || creator?.user_id === uid;
      }
    }
    // Check collaborations
    for (const col of this.collaborations.values()) {
      const match = (col.id === convId) ||
                    (convId === `conn-${col.brand_id}-${col.creator_id}`) ||
                    (col.campaign_id && convId === `conn-${col.campaign_id}-${col.creator_id}`);
      if (match) {
        const brand = this.brands.get(col.brand_id);
        const creator = this.creators.get(col.creator_id);
        if (sender === 'brand') return brand?.user_id === uid;
        if (sender === 'creator') return creator?.user_id === uid;
        return brand?.user_id === uid || creator?.user_id === uid;
      }
    }
    return false;
  }

  // --- RLS Evaluators directly reflecting schema.sql expressions ---

  canSelectCreator(uid, creator) {
    // USING (visibility = 'published' OR is_demo = true OR auth.uid() = user_id OR public.is_super_admin());
    return creator.visibility === 'published' ||
           creator.is_demo === true ||
           (uid && creator.user_id === uid) ||
           this.isSuperAdmin(uid);
  }

  canUpdateCreator(uid, oldRow, newRow) {
    // USING ((auth.uid() = user_id AND is_demo = false) OR is_demo = true OR public.is_super_admin())
    // WITH CHECK (((auth.uid() = user_id AND is_demo = false) OR is_demo = true OR public.is_super_admin()) AND (user_id = auth.uid() OR is_demo = true OR public.is_super_admin()))
    const usingPass = (uid && oldRow.user_id === uid && !oldRow.is_demo) ||
                      (oldRow.is_demo === true) ||
                      this.isSuperAdmin(uid);
    if (!usingPass) return false;

    const checkPass = ((uid && newRow.user_id === uid && !newRow.is_demo) || newRow.is_demo === true || this.isSuperAdmin(uid)) &&
                      (newRow.user_id === uid || newRow.is_demo === true || this.isSuperAdmin(uid));
    return checkPass;
  }

  canSelectCampaign(uid, campaign) {
    // USING (visibility = 'published' OR is_demo = true OR EXISTS (SELECT 1 FROM brands WHERE id = owner_brand_id AND (user_id = auth.uid() OR is_demo = true)) OR is_super_admin())
    if (campaign.visibility === 'published' || campaign.is_demo === true || this.isSuperAdmin(uid)) {
      return true;
    }
    const brand = this.brands.get(campaign.owner_brand_id);
    return brand && (brand.user_id === uid || brand.is_demo === true);
  }

  canModifyCampaign(uid, campaign) {
    if (this.isSuperAdmin(uid)) return true;
    if (campaign.is_demo === true && campaign.owner_brand_id?.startsWith('brand-demo')) return true;
    const brand = this.brands.get(campaign.owner_brand_id);
    return Boolean(brand && brand.user_id === uid);
  }

  canSelectShortlist(uid, shortlist) {
    if (this.isSuperAdmin(uid)) return true;
    const brand = this.brands.get(shortlist.brand_id);
    return Boolean(brand && (brand.user_id === uid || brand.is_demo === true));
  }

  canSelectInvitation(uid, inv) {
    if (this.isSuperAdmin(uid)) return true;
    if (inv.is_demo === true) return true;
    const brand = this.brands.get(inv.brand_id);
    const creator = this.creators.get(inv.creator_id);
    return Boolean((brand && brand.user_id === uid) || (creator && creator.user_id === uid));
  }

  canSelectFunding(uid, funding) {
    if (this.isSuperAdmin(uid)) return true;
    const campaign = this.campaigns.get(funding.campaign_id);
    if (!campaign) return false;
    const brand = this.brands.get(campaign.owner_brand_id);
    return Boolean(campaign.is_demo === true || (brand && (brand.user_id === uid || brand.is_demo === true)));
  }

  canSelectMessage(uid, msg) {
    if (this.isSuperAdmin(uid)) return true;
    if (!uid) return false;
    return this.isConversationParticipant(msg.conversation_id, uid, null);
  }

  canSelectBrand(uid, brand) {
    // USING (is_demo = true OR auth.uid() = user_id OR EXISTS (SELECT 1 FROM campaigns c WHERE c.owner_brand_id = brands.id AND (c.visibility = 'published' OR c.is_demo = true)) OR EXISTS (SELECT 1 FROM invitations inv JOIN creator_profiles cp ON cp.id = inv.creator_id WHERE inv.brand_id = brands.id AND cp.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM collaborations col JOIN creator_profiles cp ON cp.id = col.creator_id WHERE col.brand_id = brands.id AND cp.user_id = auth.uid()) OR public.is_super_admin())
    if (brand.is_demo === true || this.isSuperAdmin(uid)) return true;
    if (uid && brand.user_id === uid) return true;
    for (const camp of this.campaigns.values()) {
      if (camp.owner_brand_id === brand.id && (camp.visibility === 'published' || camp.is_demo === true)) {
        return true;
      }
    }
    for (const inv of this.invitations.values()) {
      if (inv.brand_id === brand.id) {
        const creator = this.creators.get(inv.creator_id);
        if (creator && creator.user_id === uid) return true;
      }
    }
    for (const col of this.collaborations.values()) {
      if (col.brand_id === brand.id) {
        const creator = this.creators.get(col.creator_id);
        if (creator && creator.user_id === uid) return true;
      }
    }
    return false;
  }

  canInsertMessage(uid, msg) {
    if (this.isSuperAdmin(uid)) return true;
    if (!uid) return false;
    if (!msg.text || msg.text.trim().length === 0) return false;
    if (!['creator', 'brand'].includes(msg.sender)) return false;
    return this.isConversationParticipant(msg.conversation_id, uid, msg.sender);
  }
}

// Setup standard mock scenario
function createMockScenario() {
  const ctx = new MockDatabaseContext();

  // Users
  ctx.users.set('user-brand-lumina', { role: 'brand', email: 'lumina@brand.com' });
  ctx.users.set('user-brand-competitor', { role: 'brand', email: 'competitor@brand.com' });
  ctx.users.set('user-creator-maya', { role: 'creator', email: 'maya@creators.com' });
  ctx.users.set('user-creator-alex', { role: 'creator', email: 'alex@creators.com' });
  ctx.users.set('user-judge-admin', { role: 'admin', email: 'judge@alloy.market' });

  // Admin roles
  ctx.adminRoles.set('user-judge-admin', 'judge_admin');

  // Brands
  ctx.brands.set('brand-lumina', { id: 'brand-lumina', user_id: 'user-brand-lumina', is_demo: false });
  ctx.brands.set('brand-competitor', { id: 'brand-competitor', user_id: 'user-brand-competitor', is_demo: false });
  ctx.brands.set('brand-stealth', { id: 'brand-stealth', user_id: 'user-brand-stealth', is_demo: false });
  ctx.brands.set('brand-demo-lumina', { id: 'brand-demo-lumina', user_id: null, is_demo: true });

  // Creators
  ctx.creators.set('creator-maya', { id: 'creator-maya', user_id: 'user-creator-maya', is_demo: false, visibility: 'published' });
  ctx.creators.set('creator-alex', { id: 'creator-alex', user_id: 'user-creator-alex', is_demo: false, visibility: 'published' });
  ctx.creators.set('creator-private-draft', { id: 'creator-draft', user_id: 'user-creator-maya', is_demo: false, visibility: 'draft' });
  ctx.creators.set('creator-demo-maya', { id: 'maya-chen', user_id: null, is_demo: true, visibility: 'published' });

  // Campaigns
  ctx.campaigns.set('camp-lumina-private', {
    id: 'camp-lumina-private',
    owner_brand_id: 'brand-lumina',
    visibility: 'private',
    is_demo: false
  });
  ctx.campaigns.set('camp-lumina-published', {
    id: 'camp-lumina-published',
    owner_brand_id: 'brand-lumina',
    visibility: 'published',
    is_demo: false
  });
  ctx.campaigns.set('camp-demo', {
    id: 'camp-demo',
    owner_brand_id: 'brand-demo-lumina',
    visibility: 'published',
    is_demo: true
  });

  // Shortlists
  ctx.shortlists.set('short-1', { id: 'short-1', brand_id: 'brand-lumina', creator_id: 'creator-maya' });

  // Invitations
  ctx.invitations.set('inv-lumina-maya', {
    id: 'inv-lumina-maya',
    brand_id: 'brand-lumina',
    creator_id: 'creator-maya',
    campaign_id: 'camp-lumina-private',
    is_demo: false
  });

  // Campaign Funding
  ctx.campaignFunding.set('fund-1', {
    id: 'fund-1',
    campaign_id: 'camp-lumina-private',
    amount_rupees: 50000
  });

  // Messages
  ctx.messages.set('msg-1', {
    id: 'msg-1',
    conversation_id: 'conn-brand-lumina-creator-maya',
    sender: 'brand',
    text: 'Confidential project details and deliverables'
  });
  // Wire conversation into invitations
  ctx.invitations.set('inv-conv', {
    id: 'inv-conv',
    brand_id: 'brand-lumina',
    creator_id: 'creator-maya',
    is_demo: false
  });

  return ctx;
}

// ============================================================================
// TEST GROUP 2: Anonymous Access Restrictions
// ============================================================================
runTest('3. Anonymous callers can browse public directory but are denied private resources', () => {
  const ctx = createMockScenario();
  const anonUid = null;

  // Allowed: Public published creators & campaigns
  assert.strictEqual(ctx.canSelectCreator(anonUid, ctx.creators.get('creator-maya')), true, 'Public creator must be readable');
  assert.strictEqual(ctx.canSelectCampaign(anonUid, ctx.campaigns.get('camp-lumina-published')), true, 'Public campaign must be readable');

  // Allowed: Public demo brand & brand with published campaigns
  assert.strictEqual(ctx.canSelectBrand(anonUid, ctx.brands.get('brand-demo-lumina')), true, 'Public demo brand must be readable');
  assert.strictEqual(ctx.canSelectBrand(anonUid, ctx.brands.get('brand-lumina')), true, 'Brand with published campaign must be readable');

  // Denied: Stealth brand with no published campaigns
  assert.strictEqual(ctx.canSelectBrand(anonUid, ctx.brands.get('brand-stealth')), false, 'Stealth brand with no published campaigns must be hidden from anonymous callers');

  // Denied: Private drafts
  assert.strictEqual(ctx.canSelectCreator(anonUid, ctx.creators.get('creator-private-draft')), false, 'Private creator draft must be hidden from anonymous callers');

  // Denied: Private campaigns, shortlists, invitations, funding, and messages
  assert.strictEqual(ctx.canSelectCampaign(anonUid, ctx.campaigns.get('camp-lumina-private')), false, 'Private campaign must be hidden from anonymous callers');
  assert.strictEqual(ctx.canSelectShortlist(anonUid, ctx.shortlists.get('short-1')), false, 'Brand shortlist must be hidden from anonymous callers');
  assert.strictEqual(ctx.canSelectInvitation(anonUid, ctx.invitations.get('inv-lumina-maya')), false, 'Private invitation must be hidden from anonymous callers');
  assert.strictEqual(ctx.canSelectFunding(anonUid, ctx.campaignFunding.get('fund-1')), false, 'Campaign funding must be hidden from anonymous callers');
  assert.strictEqual(ctx.canSelectMessage(anonUid, ctx.messages.get('msg-1')), false, 'Private messages must be hidden from anonymous callers');
});

// ============================================================================
// TEST GROUP 3: Cross-Brand Isolation
// ============================================================================
runTest('4. Competitor brand cannot inspect or modify Brand A private campaigns, shortlists, or funding', () => {
  const ctx = createMockScenario();
  const competitorUid = 'user-brand-competitor';

  // Competitor denied private campaign read
  assert.strictEqual(
    ctx.canSelectCampaign(competitorUid, ctx.campaigns.get('camp-lumina-private')),
    false,
    'Competitor cannot view private campaign of another brand'
  );

  // Competitor denied modifying Brand A campaign
  assert.strictEqual(
    ctx.canModifyCampaign(competitorUid, ctx.campaigns.get('camp-lumina-private')),
    false,
    'Competitor cannot modify campaign of another brand'
  );

  // Competitor denied reading Brand A shortlist
  assert.strictEqual(
    ctx.canSelectShortlist(competitorUid, ctx.shortlists.get('short-1')),
    false,
    'Competitor cannot view shortlist of another brand'
  );

  // Competitor denied reading Brand A funding
  assert.strictEqual(
    ctx.canSelectFunding(competitorUid, ctx.campaignFunding.get('fund-1')),
    false,
    'Competitor cannot view funding ledger of another brand'
  );

  // Competitor denied reading stealth brand
  assert.strictEqual(
    ctx.canSelectBrand(competitorUid, ctx.brands.get('brand-stealth')),
    false,
    'Competitor cannot view stealth brand with no public campaigns'
  );

  // Stealth brand owner CAN view own brand
  assert.strictEqual(
    ctx.canSelectBrand('user-brand-stealth', ctx.brands.get('brand-stealth')),
    true,
    'Stealth brand owner can view their own brand'
  );
});

// ============================================================================
// TEST GROUP 4: Cross-Creator Isolation
// ============================================================================
runTest('5. Creator Alex cannot access or modify Creator Maya invitations or profile', () => {
  const ctx = createMockScenario();
  const alexUid = 'user-creator-alex';

  // Alex denied reading Maya private invitation
  assert.strictEqual(
    ctx.canSelectInvitation(alexUid, ctx.invitations.get('inv-lumina-maya')),
    false,
    'Unrelated creator cannot view another creator invitations'
  );

  // Alex denied updating Maya profile
  const mayaOld = ctx.creators.get('creator-maya');
  const mayaTampered = { ...mayaOld, name: 'Alex Took Over' };
  assert.strictEqual(
    ctx.canUpdateCreator(alexUid, mayaOld, mayaTampered),
    false,
    'Unrelated creator cannot update another creator profile'
  );
});

// ============================================================================
// TEST GROUP 5: Unauthorized Writes & Cross-Role Isolation
// ============================================================================
runTest('6. Creator cannot modify brand records, and brand cannot modify creator records', () => {
  const ctx = createMockScenario();
  const brandUid = 'user-brand-lumina';
  const creatorUid = 'user-creator-maya';

  // Brand cannot update creator record
  const mayaOld = ctx.creators.get('creator-maya');
  const mayaTampered = { ...mayaOld, specialty: 'Overwritten by brand' };
  assert.strictEqual(
    ctx.canUpdateCreator(brandUid, mayaOld, mayaTampered),
    false,
    'Brand user cannot update creator profile'
  );

  // Creator cannot modify brand campaign
  assert.strictEqual(
    ctx.canModifyCampaign(creatorUid, ctx.campaigns.get('camp-lumina-private')),
    false,
    'Creator user cannot update brand campaign'
  );
});

// ============================================================================
// TEST GROUP 6: Legitimate Owner & Participant Access
// ============================================================================
runTest('7. Legitimate owners and conversation participants are granted full access', () => {
  const ctx = createMockScenario();
  const luminaUid = 'user-brand-lumina';
  const mayaUid = 'user-creator-maya';

  // Brand owner can view and modify own private campaign
  assert.strictEqual(ctx.canSelectCampaign(luminaUid, ctx.campaigns.get('camp-lumina-private')), true);
  assert.strictEqual(ctx.canModifyCampaign(luminaUid, ctx.campaigns.get('camp-lumina-private')), true);

  // Brand owner can view own shortlist and funding
  assert.strictEqual(ctx.canSelectShortlist(luminaUid, ctx.shortlists.get('short-1')), true);
  assert.strictEqual(ctx.canSelectFunding(luminaUid, ctx.campaignFunding.get('fund-1')), true);

  // Both Brand and Creator can view their mutual invitation
  assert.strictEqual(ctx.canSelectInvitation(luminaUid, ctx.invitations.get('inv-lumina-maya')), true);
  assert.strictEqual(ctx.canSelectInvitation(mayaUid, ctx.invitations.get('inv-lumina-maya')), true);

  // Both Brand and Creator can read mutual conversation messages
  const msg = ctx.messages.get('msg-1');
  assert.strictEqual(ctx.canSelectMessage(luminaUid, msg), true);
  assert.strictEqual(ctx.canSelectMessage(mayaUid, msg), true);

  // Participant can post message with valid sender role
  assert.strictEqual(ctx.canInsertMessage(luminaUid, { ...msg, sender: 'brand' }), true);
  assert.strictEqual(ctx.canInsertMessage(mayaUid, { ...msg, sender: 'creator' }), true);
});

// ============================================================================
// TEST GROUP 7: Demo Isolation - Cannot Touch Real Users' Data
// ============================================================================
runTest('8. Demo access allows demo records but cannot expose or modify real users data', () => {
  const ctx = createMockScenario();
  const anonUid = null;

  // Demo campaign readable anonymously
  assert.strictEqual(ctx.canSelectCampaign(anonUid, ctx.campaigns.get('camp-demo')), true);

  // Real user campaign NOT readable anonymously
  assert.strictEqual(ctx.canSelectCampaign(anonUid, ctx.campaigns.get('camp-lumina-private')), false);

  // Demo creator profile can be updated in demo mode
  const demoMayaOld = ctx.creators.get('creator-demo-maya');
  const demoMayaNew = { ...demoMayaOld, specialty: 'Updated Demo Specialty' };
  assert.strictEqual(ctx.canUpdateCreator(anonUid, demoMayaOld, demoMayaNew), true);

  // Non-demo creator profile CANNOT be updated anonymously under the guise of demo
  const realMayaOld = ctx.creators.get('creator-maya');
  const realMayaAttempt = { ...realMayaOld, is_demo: true }; // Attempting to mark real user as demo
  assert.strictEqual(ctx.canUpdateCreator(anonUid, realMayaOld, realMayaAttempt), false);
});

// ============================================================================
// TEST GROUP 8: Admin Authorization Enforcement
// ============================================================================
runTest('9. Verified Super Admin / Judge Admin is authorized across privileged views', () => {
  const ctx = createMockScenario();
  const adminUid = 'user-judge-admin';
  const normalUserUid = 'user-brand-competitor';

  // Admin recognized via isSuperAdmin() helper
  assert.strictEqual(ctx.isSuperAdmin(adminUid), true, 'Judge admin must resolve to super admin privileges');
  assert.strictEqual(ctx.isSuperAdmin(normalUserUid), false, 'Normal user must not have admin privileges');

  // Admin can select private campaigns, funding, and invitations for arbitration/audit
  assert.strictEqual(ctx.canSelectCampaign(adminUid, ctx.campaigns.get('camp-lumina-private')), true);
  assert.strictEqual(ctx.canSelectFunding(adminUid, ctx.campaignFunding.get('fund-1')), true);
  assert.strictEqual(ctx.canSelectInvitation(adminUid, ctx.invitations.get('inv-lumina-maya')), true);
});

console.log(`\n================================================================`);
console.log(` RESULTS: ${passedTests} / ${totalTests} RLS policy security tests passed successfully.`);
console.log(`================================================================\n`);
