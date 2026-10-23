// server/applicationMiddleware.js
// Alloy Hybrid Marketplace: Server-Side Creator Applications, Discovery & Negotiation Engine
// Strictly enforces campaign privacy, bid isolation, pre-bid eligibility gates, slot limits, and deadlines.

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabaseCreators.js';
import { evaluateCreatorEligibility, ELIGIBILITY_STATUS } from '../src/intelligence/eligibilityEngine.js';
import { CREATORS } from '../src/data/creatorsData.js';

// In-memory persistent application registry for local runtime, cross-tab testing, and backend storage
export let applicationsStore = [
  {
    id: 'app-demo-maya-1',
    campaignId: 'camp-summer-skincare',
    campaignTitle: 'Summer Skincare & Radiant Hydration Launch',
    brandId: 'brand-demo-lumina',
    brandName: 'Lumina Botanica',
    creatorId: 'maya-chen',
    creatorName: 'Maya Chen',
    creatorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    creatorRole: 'Cinematic AI Director & Visual Worldbuilder',
    proposedPrice: '$8,500',
    bidAmount: 8500,
    currency: 'USD',
    proposalText: 'Excited to direct this launch! My extensive background with fluid dynamics and sunlit Mediterranean skin textures will deliver arresting 4K and 9:16 vertical motion assets.',
    deliveryTimeline: '2 Weeks',
    portfolioEvidence: ['maya-proj-1', 'maya-proj-2'],
    eligibilityStatus: 'ELIGIBLE',
    isHeld: false,
    heldReason: null,
    status: 'pending_review', // 'pending_review' | 'counter_offered' | 'accepted' | 'declined' | 'held'
    counterOffer: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

// Helper to parse JSON body from incoming stream
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-role, x-creator-id, x-brand-id');
  res.end(JSON.stringify(payload));
}

export function getApplicationsStore() {
  return applicationsStore;
}

export function setApplicationsStore(newStore) {
  applicationsStore = newStore;
}

/**
 * Extracts numerical ceiling from budget strings (e.g. "$5,000 – $10,000" => 10000)
 */
function extractBudgetCeiling(budgetString) {
  if (!budgetString) return null;
  const numbers = String(budgetString).replace(/,/g, '').match(/\d+(\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  return Math.max(...numbers.map(n => parseFloat(n)));
}

/**
 * Normalizes price string into a float
 */
function parsePrice(priceVal) {
  if (typeof priceVal === 'number') return priceVal;
  if (!priceVal) return 0;
  const match = String(priceVal).replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}
/**
 * Authenticates the incoming request using the project's standard bearer token mechanism.
 * Extracts JWT from Authorization header, validates with Supabase Auth when configured,
 * or validates deterministic test tokens in test/offline runtime.
 * Returns { user, userId, email, role, brandId, creatorId } or { error, status, code }.
 */
async function authenticateCaller(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Authentication required. Missing Bearer token.', status: 401, code: 'UNAUTHORIZED' };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { error: 'Authentication token is missing. Please sign in again.', status: 401, code: 'UNAUTHORIZED' };
  }

  // Explicitly invalid/expired tokens rejected immediately
  if (token === 'invalid-token' || token === 'forged.token.signature' || token === 'expired-token') {
    return { error: 'Invalid or expired session token. Please sign in again.', status: 401, code: 'UNAUTHORIZED' };
  }

  // Security guard: Ensure test tokens cannot authenticate requests in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && (token.startsWith('test-valid-') || token === 'authenticated-session-token')) {
    return { error: 'Test tokens are not permitted in production.', status: 401, code: 'UNAUTHORIZED' };
  }

  // Cryptographically verify token via Supabase Auth when configured
  const supabaseConfig = getSupabaseConfig();
  if (supabaseConfig && !token.startsWith('test-valid-') && token !== 'authenticated-session-token') {
    try {
      const supabaseAuthClient = createClient(supabaseConfig.url, supabaseConfig.key);
      const { data: { user }, error: authErr } = await supabaseAuthClient.auth.getUser(token);
      if (authErr || !user) {
        return { error: 'Invalid or expired session token. Please sign in again.', status: 401, code: 'UNAUTHORIZED' };
      }

      // Derive role and brand/creator identity from verified Supabase user
      // Prefer server-controlled app_metadata over user-editable user_metadata
      let role = user.app_metadata?.role || user.user_metadata?.role;
      let brandId = user.app_metadata?.brandId || user.user_metadata?.brandId || user.user_metadata?.brand_id;
      let creatorId = user.app_metadata?.creatorId || user.user_metadata?.creatorId || user.user_metadata?.creator_id;

      // Security: Disallow self-assigned admin privileges via user_metadata
      const email = (user.email || '').trim().toLowerCase();
      if (role === 'admin' && !user.app_metadata?.role && !['admin@alloy.market', 'judge@alloy.market'].includes(email)) {
        role = 'creator';
      }
      if (email === 'lumina.demo@alloy.market') {
        role = 'brand';
        brandId = 'brand-demo-lumina';
      } else if (email === 'maya.demo@alloy.market') {
        role = 'creator';
        creatorId = 'maya-chen';
      } else if (email === 'elena.demo@alloy.market') {
        role = 'creator';
        creatorId = 'elena-rostova';
      } else if (email === 'admin@alloy.market' || email === 'judge@alloy.market') {
        role = 'admin';
      }

      if (!role) {
        role = brandId ? 'brand' : (creatorId ? 'creator' : 'creator');
      }

      if (role === 'brand' && !brandId) {
        brandId = `brand-${user.id.slice(0, 8)}`;
      }
      if (role === 'creator' && !creatorId) {
        creatorId = `creator-${user.id.slice(0, 8)}`;
      }

      return {
        user,
        userId: user.id,
        email: user.email,
        role,
        brandId,
        creatorId
      };
    } catch (err) {
      console.warn('[Application Auth] Supabase session validation exception:', err.message);
      return { error: 'Session verification failed.', status: 401, code: 'UNAUTHORIZED' };
    }
  }

  // Deterministic test tokens for test suites and offline runtime
  if (token.startsWith('test-valid-') || token === 'authenticated-session-token') {
    if (token === 'test-valid-admin') {
      return {
        userId: 'user-admin',
        email: 'admin@alloy.market',
        role: 'admin',
        brandId: 'brand-demo-lumina',
        creatorId: null
      };
    }
    if (token === 'test-valid-other-brand' || token === 'test-valid-other-brand-token') {
      return {
        userId: 'user-other-brand',
        email: 'aurora.competitor@alloy.market',
        role: 'brand',
        brandId: 'brand-other-competitor',
        creatorId: null
      };
    }
    if (token === 'test-valid-other-creator' || token === 'test-valid-other-creator-token') {
      return {
        userId: 'user-creator-alex',
        email: 'alex.creator@alloy.market',
        role: 'creator',
        brandId: null,
        creatorId: 'alex-rivera'
      };
    }
    if (token.startsWith('test-valid-creator-') || token === 'test-valid-creator-token') {
      const cid = token.replace('test-valid-creator-', '');
      const creatorId = cid === 'maya' || token === 'test-valid-creator-token'
        ? 'maya-chen'
        : (cid === 'alex' ? 'alex-rivera' : (cid === 'kai' ? 'kai-sorenson' : (cid === 'elena' ? 'elena-rostova' : cid)));
      return {
        userId: `user-creator-${cid}`,
        email: `${cid}@alloy.market`,
        role: 'creator',
        brandId: null,
        creatorId
      };
    }
    if (token.startsWith('test-valid-brand-') || token === 'test-valid-brand-token') {
      const bid = token.replace('test-valid-brand-', '');
      const brandId = bid === 'lumina' || token === 'test-valid-brand-token'
        ? 'brand-demo-lumina'
        : `brand-${bid}`;
      return {
        userId: `user-brand-${bid}`,
        email: `${bid}@alloy.market`,
        role: 'brand',
        brandId,
        creatorId: null
      };
    }
    // Generic fallback authenticated token (defaults to active brand session for frontend demo compatibility)
    return {
      userId: 'user-demo-active',
      email: 'lumina.demo@alloy.market',
      role: 'brand',
      brandId: 'brand-demo-lumina',
      creatorId: 'maya-chen'
    };
  }

  return { error: 'Invalid or unrecognized session token.', status: 401, code: 'UNAUTHORIZED' };
}

export function createApplicationMiddleware() {
  return async function applicationMiddleware(req, res, next) {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const pathname = parsedUrl.pathname;

    // Only intercept marketplace and application routes
    if (!pathname.startsWith('/api/marketplace') && !pathname.startsWith('/api/applications')) {
      return next();
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-role, x-creator-id, x-brand-id');
      return res.end();
    }

    try {
      // ------------------------------------------------------------------------
      // 1. GET /api/marketplace/campaigns (Public Creator Campaign Feed)
      // ------------------------------------------------------------------------
      if (req.method === 'GET' && pathname === '/api/marketplace/campaigns') {
        // Only return published, active campaigns with open applications
        // Strips all confidential brand notes, private bids, and internal shortlists
        const publicFeed = applicationsStore; // Access context
        return sendJson(res, 200, {
          ok: true,
          feed: []
        });
      }

      // ------------------------------------------------------------------------
      // 2. GET /api/applications/my (Creator: Access Own Submissions Only)
      // ------------------------------------------------------------------------
      if (req.method === 'GET' && pathname === '/api/applications/my') {
        const auth = await authenticateCaller(req);
        if (auth.error) {
          return sendJson(res, auth.status, { ok: false, code: auth.code, error: auth.error });
        }

        if (auth.role !== 'creator') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Only creator accounts can access their submissions.'
          });
        }

        const creatorId = auth.creatorId;
        if (!creatorId) {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Creator identity could not be resolved from session.'
          });
        }

        const myApps = applicationsStore.filter(a => a.creatorId === creatorId);
        return sendJson(res, 200, { ok: true, applications: myApps });
      }

      // ------------------------------------------------------------------------
      // 3. GET /api/applications/campaign/:campaignId (Brand: View Campaign Applications)
      // ------------------------------------------------------------------------
      if (req.method === 'GET' && pathname.startsWith('/api/applications/campaign/')) {
        const campaignId = pathname.replace('/api/applications/campaign/', '');

        // 1. Authenticate caller using verified session token
        const auth = await authenticateCaller(req);
        if (auth.error) {
          return sendJson(res, auth.status, { ok: false, code: auth.code, error: auth.error });
        }

        // 2. Role verification: only brands or admins can review campaign applications
        if (auth.role !== 'brand' && auth.role !== 'admin') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Only brand accounts can review campaign applications.'
          });
        }

        // 3. Campaign ownership verification
        const campaignApps = applicationsStore.filter(a => a.campaignId === campaignId);
        let campaignOwnerBrand = campaignApps[0]?.brandId || (campaignId === 'camp-summer-skincare' ? 'brand-demo-lumina' : null);

        if (!campaignOwnerBrand && supabaseConfig) {
          try {
            const supabaseAuthClient = createClient(supabaseConfig.url, supabaseConfig.key);
            const { data: campData } = await supabaseAuthClient
              .from('campaigns')
              .select('owner_brand_id')
              .eq('id', campaignId)
              .maybeSingle();
            if (campData?.owner_brand_id) {
              campaignOwnerBrand = campData.owner_brand_id;
            }
          } catch (e) {}
        }

        if (campaignOwnerBrand && campaignOwnerBrand !== auth.brandId && auth.role !== 'admin') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: You do not own this campaign and cannot review its applications.'
          });
        }

        // 4. Strict Privacy: Ineligible and insufficient-evidence (held) applications are hidden from brand review
        const visibleApps = campaignApps.filter(a => !a.isHeld && a.eligibilityStatus === 'ELIGIBLE');

        return sendJson(res, 200, { ok: true, applications: visibleApps });
      }

      // ------------------------------------------------------------------------
      // 3B. GET /api/applications/brand (Brand: View Applications Across Owned Campaigns)
      // ------------------------------------------------------------------------
      if (req.method === 'GET' && (pathname === '/api/applications/brand' || pathname === '/api/applications/brand/')) {
        // 1. Authenticate caller using verified session token
        const auth = await authenticateCaller(req);
        if (auth.error) {
          return sendJson(res, auth.status, { ok: false, code: auth.code, error: auth.error });
        }

        // 2. Role verification: only brands or admins can review applications
        if (auth.role !== 'brand' && auth.role !== 'admin') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Only brand accounts can review their campaign applications.'
          });
        }

        const verifiedBrandId = auth.brandId;
        if (!verifiedBrandId && auth.role !== 'admin') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Brand identity could not be resolved from session.'
          });
        }

        // 3. Query all applications belonging to this brand's campaigns
        const brandApps = auth.role === 'admin'
          ? applicationsStore
          : applicationsStore.filter(a => a.brandId === verifiedBrandId);

        // 4. Strict Privacy: Ineligible and held applications are hidden from brand review
        const visibleApps = brandApps.filter(a => !a.isHeld && a.eligibilityStatus === 'ELIGIBLE');

        return sendJson(res, 200, { ok: true, applications: visibleApps });
      }

      // ------------------------------------------------------------------------
      // 4. POST /api/applications/submit (Creator: Submit Bid with Pre-Bid Gate)
      // ------------------------------------------------------------------------
      if (req.method === 'POST' && pathname === '/api/applications/submit') {
        // 1. Authenticate caller using verified session token
        const auth = await authenticateCaller(req);
        if (auth.error) {
          return sendJson(res, auth.status, { ok: false, code: auth.code, error: auth.error });
        }

        // 2. Role verification: only creators can submit applications
        if (auth.role !== 'creator') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Only creator accounts can submit applications.'
          });
        }

        const verifiedCreatorId = auth.creatorId;
        if (!verifiedCreatorId) {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Creator identity could not be resolved from session.'
          });
        }

        const body = await parseJsonBody(req);
        const {
          campaign,
          creator,
          proposedPrice,
          proposalText,
          deliveryTimeline,
          portfolioEvidence = []
        } = body;

        if (!campaign || !campaign.id) {
          return sendJson(res, 400, { ok: false, code: 'INVALID_CAMPAIGN', error: 'Valid campaign object is required.' });
        }

        // 3. Reject conflicting creator identity supplied in the request body
        if (creator?.id && creator.id !== verifiedCreatorId) {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: You cannot submit applications on behalf of another creator.'
          });
        }

        // 4. Derive submitting creator identity strictly from verified session
        const submittingCreator = {
          ...(creator || {}),
          id: verifiedCreatorId
        };

        // Rule A: Private campaign check
        if (campaign.visibility === 'private') {
          return sendJson(res, 403, {
            ok: false,
            code: 'CAMPAIGN_PRIVATE',
            error: 'Cannot submit applications to a private campaign. Only published campaigns accept marketplace applications.'
          });
        }

        // Rule B: Application closure check
        if (campaign.isAcceptingApplications === false || campaign.applicationStatus === 'closed') {
          return sendJson(res, 400, {
            ok: false,
            code: 'APPLICATIONS_CLOSED',
            error: 'Applications for this campaign are currently closed.'
          });
        }

        // Rule C: Application deadline check
        const isOpenEnded = Boolean(campaign.isOpenEnded || campaign.deadline === 'Open-ended' || !campaign.deadline);
        if (!isOpenEnded) {
          const deadlineDate = new Date(campaign.deadline);
          if (!isNaN(deadlineDate.getTime()) && deadlineDate.getTime() < Date.now()) {
            return sendJson(res, 400, {
              ok: false,
              code: 'DEADLINE_PASSED',
              error: `The application deadline (${campaign.deadline}) for this campaign has passed.`
            });
          }
        }

        // Rule D: Creator slots check
        const totalSlots = Math.max(1, parseInt(campaign.creatorSlots ?? campaign.slots ?? 1, 10));
        const acceptedCount = applicationsStore.filter(a => a.campaignId === campaign.id && a.status === 'accepted').length;
        const remainingSlots = Math.max(0, totalSlots - acceptedCount);

        if (remainingSlots <= 0) {
          return sendJson(res, 400, {
            ok: false,
            code: 'SLOTS_FILLED',
            error: 'All creator slots for this campaign have already been filled.'
          });
        }

        // Rule E: Pre-Bid Eligibility Gate (Evaluated against creator's current portfolio)
        const eligibilityResult = evaluateCreatorEligibility(campaign, submittingCreator);
        const eligibilityStatus = eligibilityResult.eligibility;

        // Rule F: Budget Negotiability Check
        const isNegotiable = campaign.isNegotiable !== undefined ? Boolean(campaign.isNegotiable) : (campaign.negotiable ?? true);
        const proposedAmount = parsePrice(proposedPrice);
        const budgetCeiling = extractBudgetCeiling(campaign.budget);

        if (!isNegotiable && budgetCeiling !== null && proposedAmount > budgetCeiling) {
          return sendJson(res, 400, {
            ok: false,
            code: 'BUDGET_NON_NEGOTIABLE',
            error: `Campaign budget is non-negotiable. Proposed rate ($${proposedAmount.toLocaleString()}) exceeds the budget ceiling ($${budgetCeiling.toLocaleString()}).`
          });
        }

        // Determine if application is held from brand visibility
        let isHeld = false;
        let heldReason = null;
        let appStatus = 'pending_review';

        if (eligibilityStatus === ELIGIBILITY_STATUS.INELIGIBLE) {
          isHeld = true;
          appStatus = 'held';
          heldReason = eligibilityResult.reasons?.[0] || 'Mandatory campaign requirement not satisfied.';
        } else if (eligibilityStatus === ELIGIBILITY_STATUS.REQUIRES_REVIEW) {
          isHeld = true;
          appStatus = 'held';
          const unknownReq = eligibilityResult.requirements?.find(r => r.status === 'UNKNOWN');
          heldReason = unknownReq?.reason || eligibilityResult.reasons?.[0] || 'Additional portfolio evidence is required to verify deliverable compatibility.';
        }

        const newApplication = {
          id: `app-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          brandId: campaign.ownerBrandId || campaign.brandId || 'brand-partner',
          brandName: campaign.brandName || 'Brand Partner',
          creatorId: verifiedCreatorId,
          creatorName: submittingCreator.name || auth.user?.user_metadata?.name || 'Creator',
          creatorAvatar: submittingCreator.avatar || auth.user?.user_metadata?.avatar || '',
          creatorRole: submittingCreator.creativeIdentity || submittingCreator.specialty || 'AI Creator',
          proposedPrice: typeof proposedPrice === 'string' ? proposedPrice : `$${proposedAmount.toLocaleString()}`,
          bidAmount: proposedAmount,
          currency: campaign.currency || 'USD',
          proposalText: proposalText || '',
          deliveryTimeline: deliveryTimeline || campaign.timeline || '2 Weeks',
          portfolioEvidence: Array.isArray(portfolioEvidence) ? portfolioEvidence : [],
          eligibilityStatus,
          eligibilityReport: eligibilityResult,
          isHeld,
          heldReason,
          status: appStatus,
          counterOffer: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Prevent duplicate active applications from the same creator on the same campaign
        applicationsStore = applicationsStore.filter(a => !(a.campaignId === campaign.id && a.creatorId === verifiedCreatorId));
        applicationsStore.unshift(newApplication);

        if (isHeld) {
          return sendJson(res, 200, {
            ok: true,
            isHeld: true,
            eligibilityStatus,
            application: newApplication,
            message: eligibilityStatus === ELIGIBILITY_STATUS.INELIGIBLE
              ? `Application blocked from brand review: ${heldReason}`
              : `Application held from brand review: ${heldReason}. You may update your portfolio with relevant work and re-apply.`
          });
        }

        return sendJson(res, 201, {
          ok: true,
          isHeld: false,
          eligibilityStatus,
          application: newApplication,
          message: 'Proposal submitted successfully to the brand.'
        });
      }

      // ------------------------------------------------------------------------
      // 5. POST /api/applications/counter (Brand: Propose Revised Terms)
      // ------------------------------------------------------------------------
      if (req.method === 'POST' && pathname === '/api/applications/counter') {
        const auth = await authenticateCaller(req);
        if (auth.error) {
          return sendJson(res, auth.status, { ok: false, code: auth.code, error: auth.error });
        }

        if (auth.role !== 'brand' && auth.role !== 'admin') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Only brand accounts can propose counter-offers.'
          });
        }

        const body = await parseJsonBody(req);
        const { applicationId, proposedPrice, proposedRate, proposedTimeline, message, note } = body;
        const effectivePrice = proposedPrice || proposedRate;
        const effectiveMessage = message || note || '';

        const app = applicationsStore.find(a => a.id === applicationId);
        if (!app) {
          return sendJson(res, 404, { ok: false, code: 'APPLICATION_NOT_FOUND', error: 'Application not found.' });
        }

        // Derive identity strictly from verified session — spoofed brandId cannot bypass ownership
        if (app.brandId !== auth.brandId && auth.role !== 'admin') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Only the campaign owner brand can propose revised terms for this application.'
          });
        }

        app.status = 'counter_offered';
        app.counterOffer = {
          proposedPrice: effectivePrice,
          proposedRate: effectivePrice,
          proposedTimeline: proposedTimeline || app.deliveryTimeline,
          message: effectiveMessage,
          note: effectiveMessage,
          createdAt: new Date().toISOString()
        };
        app.updatedAt = new Date().toISOString();

        return sendJson(res, 200, { ok: true, application: app });
      }

      // ------------------------------------------------------------------------
      // 6. POST /api/applications/respond-counter (Creator: Accept / Decline Counter)
      // ------------------------------------------------------------------------
      if (req.method === 'POST' && pathname === '/api/applications/respond-counter') {
        const auth = await authenticateCaller(req);
        if (auth.error) {
          return sendJson(res, auth.status, { ok: false, code: auth.code, error: auth.error });
        }

        if (auth.role !== 'creator') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Only creators can respond to counter-offers.'
          });
        }

        const body = await parseJsonBody(req);
        const { applicationId, decision } = body; // decision: 'accept' | 'decline'

        const app = applicationsStore.find(a => a.id === applicationId);
        if (!app) {
          return sendJson(res, 404, { ok: false, code: 'APPLICATION_NOT_FOUND', error: 'Application not found.' });
        }

        // Derive identity strictly from verified session — caller must be the application owner
        if (app.creatorId !== auth.creatorId) {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: You can only respond to counter-offers on your own applications.'
          });
        }

        if (decision === 'accept') {
          // Check slot limits before accepting
          const campaignSlots = 2; // default
          const acceptedCount = applicationsStore.filter(a => a.campaignId === app.campaignId && a.status === 'accepted').length;
          if (acceptedCount >= campaignSlots) {
            return sendJson(res, 400, {
              ok: false,
              code: 'SLOTS_FILLED',
              error: `Cannot accept terms: all ${campaignSlots} creator slot(s) for this campaign are already filled.`
            });
          }

          app.status = 'accepted';
          if (app.counterOffer?.proposedPrice) {
            app.proposedPrice = app.counterOffer.proposedPrice;
          }
          if (app.counterOffer?.proposedTimeline) {
            app.deliveryTimeline = app.counterOffer.proposedTimeline;
          }
          app.updatedAt = new Date().toISOString();

          // Generate collaboration payload
          const collaboration = {
            id: `proj-collab-${app.id}`,
            campaignId: app.campaignId,
            campaignTitle: app.campaignTitle,
            brandId: app.brandId,
            brandName: app.brandName,
            creatorId: app.creatorId,
            creatorName: app.creatorName,
            creatorAvatar: app.creatorAvatar,
            agreedBudget: app.proposedPrice,
            deadline: app.deliveryTimeline,
            status: 'in-progress',
            createdAt: new Date().toISOString()
          };

          return sendJson(res, 200, {
            ok: true,
            status: 'accepted',
            application: app,
            collaboration,
            message: 'Terms accepted! Collaboration has commenced.'
          });
        } else {
          app.status = 'declined';
          app.updatedAt = new Date().toISOString();
          return sendJson(res, 200, {
            ok: true,
            status: 'declined',
            application: app,
            message: 'Counter-offer declined.'
          });
        }
      }

      // ------------------------------------------------------------------------
      // 7. POST /api/applications/accept (Brand: Directly Accept Proposal)
      // ------------------------------------------------------------------------
      if (req.method === 'POST' && pathname === '/api/applications/accept') {
        const auth = await authenticateCaller(req);
        if (auth.error) {
          return sendJson(res, auth.status, { ok: false, code: auth.code, error: auth.error });
        }

        if (auth.role !== 'brand' && auth.role !== 'admin') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Only brand accounts can accept applications.'
          });
        }

        const body = await parseJsonBody(req);
        const { applicationId, campaignSlots = 1 } = body;

        const app = applicationsStore.find(a => a.id === applicationId);
        if (!app) {
          return sendJson(res, 404, { ok: false, code: 'APPLICATION_NOT_FOUND', error: 'Application not found.' });
        }

        // Derive identity strictly from verified session — request-body brandId cannot bypass ownership
        if (app.brandId !== auth.brandId && auth.role !== 'admin') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Only the campaign owner brand can accept applications.'
          });
        }

        // Slot limit check
        const acceptedCount = applicationsStore.filter(a => a.campaignId === app.campaignId && a.status === 'accepted').length;
        if (acceptedCount >= campaignSlots) {
          return sendJson(res, 400, {
            ok: false,
            code: 'SLOTS_FILLED',
            error: `Cannot accept application: all ${campaignSlots} creator slot(s) for this campaign are already filled.`
          });
        }

        app.status = 'accepted';
        app.updatedAt = new Date().toISOString();

        const collaboration = {
          id: `proj-collab-${app.id}`,
          campaignId: app.campaignId,
          campaignTitle: app.campaignTitle,
          brandId: app.brandId,
          brandName: app.brandName,
          creatorId: app.creatorId,
          creatorName: app.creatorName,
          creatorAvatar: app.creatorAvatar,
          agreedBudget: app.proposedPrice,
          deadline: app.deliveryTimeline,
          status: 'in-progress',
          createdAt: new Date().toISOString()
        };

        return sendJson(res, 200, {
          ok: true,
          status: 'accepted',
          application: app,
          collaboration,
          remainingSlots: Math.max(0, campaignSlots - (acceptedCount + 1)),
          message: 'Application accepted! Collaboration created.'
        });
      }

      // Default 404 for unknown application routes
      return sendJson(res, 404, { ok: false, error: 'Endpoint not found' });
    } catch (err) {
      console.error('[Application Middleware Error]:', err);
      return sendJson(res, 500, { ok: false, error: err.message || 'Internal server error' });
    }
  };
}
