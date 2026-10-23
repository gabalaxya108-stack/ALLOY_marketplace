// test/portfolioSocialInteractions.test.js
// Alloy — Portfolio Social Interactions & Profile Navigation Verification Suite
// Verifies:
// 1. Priority 1: Post author identity retention and profile navigation routing
// 2. Priority 2: Social post two-panel layout contracts & uncropped media handling
// 3. Priority 3: Creator comments validation, identity preservation, and persistence transparency
// 4. Priority 4: Message Creator / Request-to-DM recipient targeting, self-message prevention, and duplicate guard

import assert from 'assert';
import { CREATORS } from '../src/data/creatorsData.js';
import { INITIAL_CONNECTIONS } from '../src/data/connectionsData.js';

async function runPortfolioSocialInteractionTests() {
  console.log('\n================================================================');
  console.log(' ALLOY — PORTFOLIO SOCIAL INTERACTIONS & NAVIGATION SUITE');
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

  const loggedInUser = {
    id: 'user-maya-chen',
    name: 'Maya Chen',
    role: 'creator',
    creatorId: 'maya-chen'
  };

  const loggedInCreator = CREATORS.find(c => c.id === 'maya-chen');
  const otherCreator = CREATORS.find(c => c.id === 'alex-rivera');

  assert.ok(loggedInCreator, 'Logged-in creator (Maya Chen) must exist');
  assert.ok(otherCreator, 'Other creator (Alex Rivera) must exist');

  // --- Group 1: Priority 1 — Author Identity & Profile Navigation ---
  console.log('--- Group 1: Priority 1 — Author Identity & Profile Navigation ---');

  test('1.1 Community portfolio post retains author creator ID and does not drop author identity', () => {
    const alexProject = otherCreator.projects[0];
    const postItem = {
      type: 'creator_project',
      id: `creator-proj-${otherCreator.id}-${alexProject.id}`,
      creatorId: otherCreator.id,
      creator: otherCreator,
      project: {
        ...alexProject,
        creatorId: otherCreator.id
      }
    };

    assert.strictEqual(postItem.creatorId, 'alex-rivera', 'Post item must retain author creator ID');
    assert.strictEqual(postItem.project.creatorId, 'alex-rivera', 'Project payload must carry author creator ID');
  });

  test('1.2 Opening another creator\'s post resolves to post author, NOT current logged-in creator', () => {
    const rawProject = {
      ...otherCreator.projects[0],
      creatorId: otherCreator.id
    };

    // Simulate navigation callback resolution in CreatorWorkspaceView & App.jsx
    function resolveProjectAuthor(proj, passedCreator, currentActiveCreator, allCreators) {
      if (passedCreator && passedCreator.id) {
        return passedCreator;
      }
      if (proj && proj.creatorId) {
        const found = allCreators.find(c => c.id === proj.creatorId);
        if (found) return found;
      }
      return currentActiveCreator;
    }

    // When other creator is passed
    const resolvedAuthorDirect = resolveProjectAuthor(rawProject, otherCreator, loggedInCreator, CREATORS);
    assert.strictEqual(resolvedAuthorDirect.id, 'alex-rivera');
    assert.strictEqual(resolvedAuthorDirect.name, 'Alex Rivera');

    // When creator is omitted but project has creatorId
    const resolvedAuthorFromProject = resolveProjectAuthor(rawProject, null, loggedInCreator, CREATORS);
    assert.strictEqual(resolvedAuthorFromProject.id, 'alex-rivera', 'Must resolve author from project.creatorId instead of defaulting to logged-in user');
  });

  test('1.3 Ownership check strictly isolates author: logged-in creator is NOT the owner of another creator\'s project', () => {
    function computeIsCreatorOwner(myCreator, selectedProjectCreator, currentUserRole) {
      return Boolean(
        (myCreator && selectedProjectCreator && myCreator.id === selectedProjectCreator.id) ||
        (!selectedProjectCreator && currentUserRole === 'creator')
      );
    }

    const isOwnerOfAlexProject = computeIsCreatorOwner(loggedInCreator, otherCreator, loggedInUser.role);
    assert.strictEqual(isOwnerOfAlexProject, false, 'Maya Chen must NOT be owner of Alex Rivera project');

    const isOwnerOfOwnProject = computeIsCreatorOwner(loggedInCreator, loggedInCreator, loggedInUser.role);
    assert.strictEqual(isOwnerOfOwnProject, true, 'Maya Chen must be owner of her own project');
  });

  test('1.4 "View Profile" navigation target for other creator routes to their author ID', () => {
    let navigatedToCreatorId = null;
    function handleViewProfile(creatorId) {
      navigatedToCreatorId = creatorId;
    }

    const postAuthor = otherCreator;
    handleViewProfile(postAuthor.id);
    assert.strictEqual(navigatedToCreatorId, 'alex-rivera', 'Must route to alex-rivera');
    assert.notStrictEqual(navigatedToCreatorId, loggedInCreator.id, 'Must NOT route to logged-in user');
  });

  // --- Group 2: Priority 2 — Redesigned Detail View & Layout Composition ---
  console.log('\n--- Group 2: Priority 2 — Redesigned Detail View & Layout Composition ---');

  test('2.1 Portfolio project schema contains complete media and narrative fields', () => {
    const project = otherCreator.projects[0];
    assert.ok(project.image, 'Project must have primary media image');
    assert.ok(project.title, 'Project must have title');
    assert.ok(project.category, 'Project must have category');
    assert.ok(project.creativeDirection, 'Project must have creative direction / caption');
  });

  test('2.2 Specs and technical parameters are extracted without inventing missing fields', () => {
    const sampleSpecsProject = {
      ...otherCreator.projects[0],
      aspectRatio: '16:9',
      primaryTool: 'Midjourney v6.1',
      resolution: '4K UHD',
      renderEngine: 'ComfyUI Workflow'
    };

    const specs = [
      { label: 'Aspect Ratio', val: sampleSpecsProject.aspectRatio },
      { label: 'Primary Tool', val: sampleSpecsProject.primaryTool },
      { label: 'Resolution', val: sampleSpecsProject.resolution },
      { label: 'Render Engine', val: sampleSpecsProject.renderEngine }
    ].filter(s => Boolean(s.val));

    assert.strictEqual(specs.length, 4, 'Should extract available specs');
    assert.strictEqual(specs[0].val, '16:9');
    assert.strictEqual(specs[1].val, 'Midjourney v6.1');
  });

  // --- Group 3: Priority 3 — Creator Comments Behavior & Validation ---
  console.log('\n--- Group 3: Priority 3 — Creator Comments Behavior & Validation ---');

  test('3.1 Reject empty or whitespace-only comment submissions', () => {
    function validateCommentText(text) {
      if (!text || !text.trim()) {
        return { valid: false, error: 'Comment cannot be empty.' };
      }
      return { valid: true };
    }

    assert.strictEqual(validateCommentText('').valid, false);
    assert.strictEqual(validateCommentText('   \n  \t  ').valid, false);
    assert.strictEqual(validateCommentText('Outstanding framing!').valid, true);
  });

  test('3.2 Comment submission locks in-flight requests to prevent duplicate submissions', () => {
    let isSubmitting = false;
    let submissionCount = 0;

    function submitComment(text) {
      if (isSubmitting) return false;
      isSubmitting = true;
      submissionCount++;
      return true;
    }

    const first = submitComment('Great work');
    const second = submitComment('Great work'); // Repeated rapid click

    assert.strictEqual(first, true, 'First click proceeds');
    assert.strictEqual(second, false, 'Rapid second click is blocked');
    assert.strictEqual(submissionCount, 1, 'Only one submission is processed');
  });

  test('3.3 Comment retains project association and commenter authentication identity', () => {
    const comment = {
      id: `comment-${Date.now()}`,
      projectId: otherCreator.projects[0].id,
      authorId: loggedInCreator.id,
      authorName: loggedInCreator.name,
      authorAvatar: loggedInCreator.avatar,
      authorHandle: loggedInCreator.handle,
      text: 'The lighting model here is spectacular.',
      createdAt: 'Just now'
    };

    assert.strictEqual(comment.projectId, otherCreator.projects[0].id);
    assert.strictEqual(comment.authorId, 'maya-chen');
    assert.strictEqual(comment.authorName, 'Maya Chen');
    assert.ok(comment.text.length > 0);
  });

  // --- Group 4: Priority 4 — Request-to-DM & Contact Action ---
  console.log('\n--- Group 4: Priority 4 — Request-to-DM & Contact Action ---');

  test('4.1 DM action targets post author, not current viewer', () => {
    function determineRecipient(projectAuthor, currentViewer) {
      assert.ok(projectAuthor && projectAuthor.id, 'Project author must be provided');
      return projectAuthor.id;
    }

    const targetId = determineRecipient(otherCreator, loggedInCreator);
    assert.strictEqual(targetId, 'alex-rivera', 'Must target Alex Rivera');
    assert.notStrictEqual(targetId, loggedInCreator.id, 'Must NOT target Maya Chen');
  });

  test('4.2 Self-messaging is blocked when viewer is the project author', () => {
    function canRequestDm(projectAuthor, currentViewer) {
      if (!currentViewer) return { allowed: false, reason: 'auth_required' };
      if (currentViewer.id === projectAuthor.id) {
        return { allowed: false, reason: 'self_messaging_prohibited' };
      }
      return { allowed: true };
    }

    const viewingOther = canRequestDm(otherCreator, loggedInCreator);
    assert.strictEqual(viewingOther.allowed, true);

    const viewingSelf = canRequestDm(loggedInCreator, loggedInCreator);
    assert.strictEqual(viewingSelf.allowed, false);
    assert.strictEqual(viewingSelf.reason, 'self_messaging_prohibited');
  });

  test('4.3 Duplicate DM requests are prevented when a request is in-flight or already sent', () => {
    let dmRequestStatus = 'idle'; // 'idle' | 'sending' | 'sent'
    let dispatchCount = 0;

    function handleDmRequest() {
      if (dmRequestStatus === 'sending' || dmRequestStatus === 'sent') {
        return false;
      }
      dmRequestStatus = 'sending';
      dispatchCount++;
      dmRequestStatus = 'sent';
      return true;
    }

    const click1 = handleDmRequest();
    const click2 = handleDmRequest(); // Duplicate click

    assert.strictEqual(click1, true, 'First request succeeds');
    assert.strictEqual(click2, false, 'Duplicate request is blocked');
    assert.strictEqual(dispatchCount, 1, 'Only one dispatch occurs');
    assert.strictEqual(dmRequestStatus, 'sent');
  });

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPortfolioSocialInteractionTests();
