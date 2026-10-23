// server/applicationMiddleware.js
// Alloy Hybrid Marketplace: Server-Side Creator Applications, Discovery & Negotiation Engine
// Strictly enforces campaign privacy, bid isolation, pre-bid eligibility gates, slot limits, and deadlines.
// Provides dual-layer durability: PostgreSQL / Supabase write-through with atomic RPC slot management,
// plus in-memory fallback cache for high performance and offline test determinism.

import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabaseCreators.js';
import { evaluateCreatorEligibility, ELIGIBILITY_STATUS } from '../src/intelligence/eligibilityEngine.js';
import { CREATORS } from '../src/data/creatorsData.js';

// In-memory persistent application registry for local runtime, cross-tab testing, and offline fallback
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

// Per-campaign in-process promise locks to serialize concurrent slot checks
const campaignLocks = new Map();

export async function withCampaignLock(campaignId, fn) {
  const key = campaignId || 'global';
  const prevPromise = campaignLocks.get(key) || Promise.resolve();
  let release;
  const currentPromise = new Promise(resolve => { release = resolve; });
  campaignLocks.set(key, prevPromise.then(() => currentPromise));
  await prevPromise;
  try {
    return await fn();
  } finally {
    release();
    if (campaignLocks.get(key) === currentPromise) {
      campaignLocks.delete(key);
    }
  }
}

/**
 * Maps database snake_case row to camelCase application object
 */
export function mapRowToApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    campaignId: row.campaign_id,
    campaignTitle: row.campaign_title,
    brandId: row.brand_id,
    brandName: row.brand_name,
    creatorId: row.creator_id,
    creatorName: row.creator_name,
    creatorAvatar: row.creator_avatar || '',
    creatorRole: row.creator_role || '',
    proposedPrice: row.proposed_price,
    bidAmount: Number(row.bid_amount),
    currency: row.currency || 'USD',
    proposalText: row.proposal_text || '',
    deliveryTimeline: row.delivery_timeline || '',
    portfolioEvidence: Array.isArray(row.portfolio_evidence) ? row.portfolio_evidence : [],
    eligibilityStatus: row.eligibility_status,
    eligibilityReport: row.eligibility_report || null,
    isHeld: Boolean(row.is_held),
    heldReason: row.held_reason || null,
    status: row.status,
    counterOffer: row.counter_offer || null,
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Maps camelCase application object to database snake_case row
 */
export function mapApplicationToRow(app) {
  if (!app) return null;
  return {
    id: app.id,
    campaign_id: app.campaignId,
    campaign_title: app.campaignTitle,
    brand_id: app.brandId,
    brand_name: app.brandName,
    creator_id: app.creatorId,
    creator_name: app.creatorName,
    creator_avatar: app.creatorAvatar || '',
    creator_role: app.creatorRole || '',
    proposed_price: app.proposedPrice,
    bid_amount: app.bidAmount || parsePrice(app.proposedPrice),
    currency: app.currency || 'USD',
    proposal_text: app.proposalText || '',
    delivery_timeline: app.deliveryTimeline || '',
    portfolio_evidence: Array.isArray(app.portfolioEvidence) ? app.portfolioEvidence : [],
    eligibility_status: app.eligibilityStatus,
    eligibility_report: app.eligibilityReport || {},
    is_held: Boolean(app.isHeld),
    held_reason: app.heldReason || null,
    status: app.status,
    counter_offer: app.counterOffer || null,
    is_demo: Boolean(app.isDemo ?? false),
    created_at: app.createdAt || new Date().toISOString(),
    updated_at: app.updatedAt || new Date().toISOString()
  };
}

// Resolves or creates a Supabase client with service-role or anon privileges
export function getSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = (serviceKey && serviceKey !== 'your-supabase-service-role-key') ? serviceKey : config.key;
  try {
    return createClient(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  } catch (e) {
    return null;
  }
}

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
async function authenticateCaller(req, customSupabaseClient = null) {
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
  if ((customSupabaseClient || supabaseConfig) && !token.startsWith('test-valid-') && token !== 'authenticated-session-token') {
    try {
      const authClient = customSupabaseClient || createClient(supabaseConfig.url, supabaseConfig.key);
      const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
      if (authErr || !user) {
        return { error: 'Invalid or expired session token. Please sign in again.', status: 401, code: 'UNAUTHORIZED' };
      }

      // Derive role and brand/creator identity from verified Supabase user
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

export function createApplicationMiddleware(options = {}) {
  // Allow injecting custom Supabase client (e.g. for deterministic persistence tests)
  const explicitClient = options.supabaseClient || null;

  function getClient() {
    return explicitClient || getSupabaseClient();
  }

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

    const dbClient = getClient();

    try {
      // ------------------------------------------------------------------------
      // 1. GET /api/marketplace/campaigns (Public Creator Campaign Feed)
      // ------------------------------------------------------------------------
      if (req.method === 'GET' && pathname === '/api/marketplace/campaigns') {
        return sendJson(res, 200, {
          ok: true,
          feed: []
        });
      }

      // ------------------------------------------------------------------------
      // 2. GET /api/applications/my (Creator: Access Own Submissions Only)
      // ------------------------------------------------------------------------
      if (req.method === 'GET' && pathname === '/api/applications/my') {
        const auth = await authenticateCaller(req, dbClient);
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

        // 1. Query database when configured
        if (dbClient) {
          try {
            const { data, error } = await dbClient
              .from('campaign_applications')
              .select('*')
              .eq('creator_id', creatorId)
              .order('created_at', { ascending: false });

            if (!error && Array.isArray(data)) {
              const mapped = data.map(mapRowToApplication);
              // Converge in-memory store with database records
              for (const app of mapped) {
                const idx = applicationsStore.findIndex(a => a.id === app.id);
                if (idx >= 0) applicationsStore[idx] = app;
                else applicationsStore.unshift(app);
              }
              return sendJson(res, 200, { ok: true, applications: mapped });
            }
          } catch (dbErr) {
            console.warn('[Application Middleware] Database read error, falling back to memory:', dbErr.message);
          }
        }

        // 2. Memory store fallback
        const myApps = applicationsStore.filter(a => a.creatorId === creatorId);
        return sendJson(res, 200, { ok: true, applications: myApps });
      }

      // ------------------------------------------------------------------------
      // 3. GET /api/applications/campaign/:campaignId (Brand: View Campaign Applications)
      // ------------------------------------------------------------------------
      if (req.method === 'GET' && pathname.startsWith('/api/applications/campaign/')) {
        const campaignId = pathname.replace('/api/applications/campaign/', '');

        // 1. Authenticate caller using verified session token
        const auth = await authenticateCaller(req, dbClient);
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
        let campaignOwnerBrand = null;
        if (dbClient) {
          try {
            const { data: campData } = await dbClient
              .from('campaigns')
              .select('owner_brand_id')
              .eq('id', campaignId)
              .maybeSingle();
            if (campData?.owner_brand_id) {
              campaignOwnerBrand = campData.owner_brand_id;
            }
          } catch (e) {}
        }

        if (!campaignOwnerBrand) {
          const matchingApp = applicationsStore.find(a => a.campaignId === campaignId);
          campaignOwnerBrand = matchingApp?.brandId || (campaignId === 'camp-summer-skincare' ? 'brand-demo-lumina' : null);
        }

        if (campaignOwnerBrand && campaignOwnerBrand !== auth.brandId && auth.role !== 'admin') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: You do not own this campaign and cannot review its applications.'
          });
        }

        // 4. Query database when configured with strict privacy filter (no held applications)
        if (dbClient) {
          try {
            const { data, error } = await dbClient
              .from('campaign_applications')
              .select('*')
              .eq('campaign_id', campaignId)
              .eq('is_held', false)
              .eq('eligibility_status', 'ELIGIBLE')
              .order('created_at', { ascending: false });

            if (!error && Array.isArray(data)) {
              const visibleApps = data.map(mapRowToApplication);
              for (const app of visibleApps) {
                const idx = applicationsStore.findIndex(a => a.id === app.id);
                if (idx >= 0) applicationsStore[idx] = app;
                else applicationsStore.unshift(app);
              }
              return sendJson(res, 200, { ok: true, applications: visibleApps });
            }
          } catch (dbErr) {
            console.warn('[Application Middleware] Database read error, falling back to memory:', dbErr.message);
          }
        }

        // 5. Memory store fallback with strict privacy filter
        const visibleApps = applicationsStore.filter(a => a.campaignId === campaignId && !a.isHeld && a.eligibilityStatus === 'ELIGIBLE');
        return sendJson(res, 200, { ok: true, applications: visibleApps });
      }

      // ------------------------------------------------------------------------
      // 3B. GET /api/applications/brand (Brand: View Applications Across Owned Campaigns)
      // ------------------------------------------------------------------------
      if (req.method === 'GET' && (pathname === '/api/applications/brand' || pathname === '/api/applications/brand/')) {
        const auth = await authenticateCaller(req, dbClient);
        if (auth.error) {
          return sendJson(res, auth.status, { ok: false, code: auth.code, error: auth.error });
        }

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

        // 1. Query database when configured
        if (dbClient) {
          try {
            let query = dbClient
              .from('campaign_applications')
              .select('*')
              .eq('is_held', false)
              .eq('eligibility_status', 'ELIGIBLE')
              .order('created_at', { ascending: false });

            if (auth.role !== 'admin') {
              query = query.eq('brand_id', verifiedBrandId);
            }

            const { data, error } = await query;
            if (!error && Array.isArray(data)) {
              const visibleApps = data.map(mapRowToApplication);
              for (const app of visibleApps) {
                const idx = applicationsStore.findIndex(a => a.id === app.id);
                if (idx >= 0) applicationsStore[idx] = app;
                else applicationsStore.unshift(app);
              }
              return sendJson(res, 200, { ok: true, applications: visibleApps });
            }
          } catch (dbErr) {
            console.warn('[Application Middleware] Database read error, falling back to memory:', dbErr.message);
          }
        }

        // 2. Memory store fallback
        const brandApps = auth.role === 'admin'
          ? applicationsStore
          : applicationsStore.filter(a => a.brandId === verifiedBrandId);
        const visibleApps = brandApps.filter(a => !a.isHeld && a.eligibilityStatus === 'ELIGIBLE');
        return sendJson(res, 200, { ok: true, applications: visibleApps });
      }

      // ------------------------------------------------------------------------
      // 4. POST /api/applications/submit (Creator: Submit Bid with Pre-Bid Gate)
      // ------------------------------------------------------------------------
      if (req.method === 'POST' && pathname === '/api/applications/submit') {
        const auth = await authenticateCaller(req, dbClient);
        if (auth.error) {
          return sendJson(res, auth.status, { ok: false, code: auth.code, error: auth.error });
        }

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

        // Reject conflicting creator identity supplied in request body
        if (creator?.id && creator.id !== verifiedCreatorId) {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: You cannot submit applications on behalf of another creator.'
          });
        }

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
        let acceptedCount = 0;
        if (dbClient) {
          try {
            const { count } = await dbClient
              .from('campaign_applications')
              .select('*', { count: 'exact', head: true })
              .eq('campaign_id', campaign.id)
              .eq('status', 'accepted');
            acceptedCount = count ?? 0;
          } catch (e) {
            acceptedCount = applicationsStore.filter(a => a.campaignId === campaign.id && a.status === 'accepted').length;
          }
        } else {
          acceptedCount = applicationsStore.filter(a => a.campaignId === campaign.id && a.status === 'accepted').length;
        }

        const remainingSlots = Math.max(0, totalSlots - acceptedCount);
        if (remainingSlots <= 0) {
          return sendJson(res, 400, {
            ok: false,
            code: 'SLOTS_FILLED',
            error: 'All creator slots for this campaign have already been filled.'
          });
        }

        // Rule E: Pre-Bid Eligibility Gate
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

        // Persist to database if configured
        if (dbClient) {
          try {
            // Ensure brand exists for demo foreign key compatibility
            if (newApplication.brandId) {
              const { data: bData } = await dbClient.from('brands').select('id').eq('id', newApplication.brandId).maybeSingle();
              if (!bData) {
                await dbClient.from('brands').upsert({
                  id: newApplication.brandId,
                  name: newApplication.brandName || 'Brand Partner',
                  is_demo: true,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
              }
            }

            await dbClient.from('campaign_applications').upsert(mapApplicationToRow(newApplication), {
              onConflict: 'campaign_id,creator_id'
            });
          } catch (dbErr) {
            console.warn('[Application Middleware] Database upsert notice:', dbErr.message);
          }
        }

        // Prevent duplicate active applications from the same creator in memory
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
        const auth = await authenticateCaller(req, dbClient);
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

        let app = applicationsStore.find(a => a.id === applicationId);

        // If not in memory, query database
        if (!app && dbClient) {
          try {
            const { data: row } = await dbClient.from('campaign_applications').select('*').eq('id', applicationId).maybeSingle();
            if (row) {
              app = mapRowToApplication(row);
              applicationsStore.unshift(app);
            }
          } catch (e) {}
        }

        if (!app) {
          return sendJson(res, 404, { ok: false, code: 'APPLICATION_NOT_FOUND', error: 'Application not found.' });
        }

        // Derive identity strictly from verified session
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
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        app.updatedAt = new Date().toISOString();

        // Persist to database if configured
        if (dbClient) {
          try {
            await dbClient.from('campaign_applications').update({
              status: 'counter_offered',
              counter_offer: app.counterOffer,
              updated_at: app.updatedAt
            }).eq('id', app.id);
          } catch (dbErr) {
            console.warn('[Application Middleware] Database counter update notice:', dbErr.message);
          }
        }

        return sendJson(res, 200, { ok: true, application: app });
      }

      // ------------------------------------------------------------------------
      // 6. POST /api/applications/respond-counter (Creator: Accept / Decline Counter)
      // ------------------------------------------------------------------------
      if (req.method === 'POST' && pathname === '/api/applications/respond-counter') {
        const auth = await authenticateCaller(req, dbClient);
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
        const { applicationId, decision } = body;

        let app = applicationsStore.find(a => a.id === applicationId);

        if (!app && dbClient) {
          try {
            const { data: row } = await dbClient.from('campaign_applications').select('*').eq('id', applicationId).maybeSingle();
            if (row) {
              app = mapRowToApplication(row);
              applicationsStore.unshift(app);
            }
          } catch (e) {}
        }

        if (!app) {
          return sendJson(res, 404, { ok: false, code: 'APPLICATION_NOT_FOUND', error: 'Application not found.' });
        }

        // Caller must be the application owner
        if (app.creatorId !== auth.creatorId) {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: You can only respond to counter-offers on your own applications.'
          });
        }

        if (decision === 'accept') {
          const campaignSlots = 2; // default

          // Atomically check and update capacity via database RPC or campaign lock
          return await withCampaignLock(app.campaignId, async () => {
            // Attempt atomic database RPC if configured
            if (dbClient) {
              try {
                const { data: rpcRes, error: rpcErr } = await dbClient.rpc('accept_campaign_application', {
                  p_application_id: app.id,
                  p_campaign_slots: campaignSlots
                });

                if (!rpcErr && rpcRes) {
                  if (rpcRes.ok === false) {
                    return sendJson(res, 400, {
                      ok: false,
                      code: rpcRes.code || 'SLOTS_FILLED',
                      error: rpcRes.error || `Cannot accept terms: all ${campaignSlots} creator slot(s) for this campaign are already filled.`
                    });
                  }
                  if (rpcRes.application) {
                    const updated = mapRowToApplication(rpcRes.application);
                    Object.assign(app, updated);
                  }
                }
              } catch (e) {
                // RPC fallback: check count manually
                const { count } = await dbClient
                  .from('campaign_applications')
                  .select('*', { count: 'exact', head: true })
                  .eq('campaign_id', app.campaignId)
                  .eq('status', 'accepted');
                if ((count ?? 0) >= campaignSlots) {
                  return sendJson(res, 400, {
                    ok: false,
                    code: 'SLOTS_FILLED',
                    error: `Cannot accept terms: all ${campaignSlots} creator slot(s) for this campaign are already filled.`
                  });
                }
              }
            }

            // In-memory slot check
            const acceptedCount = applicationsStore.filter(a => a.campaignId === app.campaignId && a.status === 'accepted' && a.id !== app.id).length;
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
              app.bidAmount = parsePrice(app.proposedPrice);
            }
            if (app.counterOffer?.proposedTimeline) {
              app.deliveryTimeline = app.counterOffer.proposedTimeline;
            }
            app.updatedAt = new Date().toISOString();

            // Persist status update to database
            if (dbClient) {
              try {
                await dbClient.from('campaign_applications').update({
                  status: 'accepted',
                  proposed_price: app.proposedPrice,
                  bid_amount: app.bidAmount,
                  delivery_timeline: app.deliveryTimeline,
                  updated_at: app.updatedAt
                }).eq('id', app.id);
              } catch (e) {}
            }

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

            // Auto-persist collaboration and canonical opening message to database
            if (dbClient) {
              try {
                await dbClient.from('collaborations').upsert({
                  id: collaboration.id,
                  campaign_id: app.campaignId,
                  brand_id: app.brandId,
                  creator_id: app.creatorId,
                  project_name: app.campaignTitle,
                  brand_name: app.brandName,
                  creator_name: app.creatorName,
                  status: 'Active',
                  agreed_budget: app.proposedPrice,
                  deadline: app.deliveryTimeline,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

                await dbClient.from('messages').upsert({
                  id: `msg-app-accept-${app.id}`,
                  conversation_id: `conn-${app.campaignId}-${app.creatorId}`,
                  sender: 'brand',
                  sender_name: app.brandName || 'Brand Partner',
                  text: `Hi ${app.creatorName}! Your counter-offer for "${app.campaignTitle}" has been accepted. Agreed rate: ${app.proposedPrice}, timeline: ${app.deliveryTimeline}. Looking forward to working with you!`,
                  created_at: new Date().toISOString()
                }, { onConflict: 'id' });
              } catch (e) {
                console.warn('[Application Middleware] Collaboration auto-persist deferred:', e.message);
              }
            }

            return sendJson(res, 200, {
              ok: true,
              status: 'accepted',
              application: app,
              collaboration,
              message: 'Terms accepted! Collaboration has commenced.'
            });
          });
        } else {
          app.status = 'declined';
          app.updatedAt = new Date().toISOString();
          if (app.counterOffer) {
            app.counterOffer.status = 'declined';
          }

          if (dbClient) {
            try {
              await dbClient.from('campaign_applications').update({
                status: 'declined',
                counter_offer: app.counterOffer,
                updated_at: app.updatedAt
              }).eq('id', app.id);
            } catch (e) {}
          }

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
        const auth = await authenticateCaller(req, dbClient);
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

        let app = applicationsStore.find(a => a.id === applicationId);

        if (!app && dbClient) {
          try {
            const { data: row } = await dbClient.from('campaign_applications').select('*').eq('id', applicationId).maybeSingle();
            if (row) {
              app = mapRowToApplication(row);
              applicationsStore.unshift(app);
            }
          } catch (e) {}
        }

        if (!app) {
          return sendJson(res, 404, { ok: false, code: 'APPLICATION_NOT_FOUND', error: 'Application not found.' });
        }

        // Ownership check
        if (app.brandId !== auth.brandId && auth.role !== 'admin') {
          return sendJson(res, 403, {
            ok: false,
            code: 'FORBIDDEN',
            error: 'Access denied: Only the campaign owner brand can accept applications.'
          });
        }

        // Atomically serialize slot checks and acceptances
        return await withCampaignLock(app.campaignId, async () => {
          // Attempt atomic database RPC if configured
          if (dbClient) {
            try {
              const { data: rpcRes, error: rpcErr } = await dbClient.rpc('accept_campaign_application', {
                p_application_id: app.id,
                p_campaign_slots: campaignSlots
              });

              if (!rpcErr && rpcRes) {
                if (rpcRes.ok === false) {
                  return sendJson(res, 400, {
                    ok: false,
                    code: rpcRes.code || 'SLOTS_FILLED',
                    error: rpcRes.error || `Cannot accept application: all ${campaignSlots} creator slot(s) for this campaign are already filled.`
                  });
                }
                if (rpcRes.application) {
                  const updated = mapRowToApplication(rpcRes.application);
                  Object.assign(app, updated);
                }
              }
            } catch (e) {
              // RPC fallback: check count manually
              const { count } = await dbClient
                .from('campaign_applications')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_id', app.campaignId)
                .eq('status', 'accepted');
              if ((count ?? 0) >= campaignSlots) {
                return sendJson(res, 400, {
                  ok: false,
                  code: 'SLOTS_FILLED',
                  error: `Cannot accept application: all ${campaignSlots} creator slot(s) for this campaign are already filled.`
                });
              }
            }
          }

          // In-memory slot check
          const acceptedCount = applicationsStore.filter(a => a.campaignId === app.campaignId && a.status === 'accepted' && a.id !== app.id).length;
          if (acceptedCount >= campaignSlots) {
            return sendJson(res, 400, {
              ok: false,
              code: 'SLOTS_FILLED',
              error: `Cannot accept application: all ${campaignSlots} creator slot(s) for this campaign are already filled.`
            });
          }

          app.status = 'accepted';
          app.updatedAt = new Date().toISOString();

          // Persist status update to database
          if (dbClient) {
            try {
              await dbClient.from('campaign_applications').update({
                status: 'accepted',
                updated_at: app.updatedAt
              }).eq('id', app.id);
            } catch (e) {}
          }

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

          // Auto-persist collaboration and canonical opening message to database
          if (dbClient) {
            try {
              await dbClient.from('collaborations').upsert({
                id: collaboration.id,
                campaign_id: app.campaignId,
                brand_id: app.brandId,
                creator_id: app.creatorId,
                project_name: app.campaignTitle,
                brand_name: app.brandName,
                creator_name: app.creatorName,
                status: 'Active',
                agreed_budget: app.proposedPrice,
                deadline: app.deliveryTimeline,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });

              await dbClient.from('messages').upsert({
                id: `msg-app-accept-${app.id}`,
                conversation_id: `conn-${app.campaignId}-${app.creatorId}`,
                sender: 'brand',
                sender_name: app.brandName || 'Brand Partner',
                text: `Hi ${app.creatorName}! Your application for "${app.campaignTitle}" has been accepted. Agreed rate: ${app.proposedPrice}, timeline: ${app.deliveryTimeline}. Looking forward to working with you!`,
                created_at: new Date().toISOString()
              }, { onConflict: 'id' });
            } catch (e) {
              console.warn('[Application Middleware] Collaboration auto-persist deferred:', e.message);
            }
          }

          return sendJson(res, 200, {
            ok: true,
            status: 'accepted',
            application: app,
            collaboration,
            remainingSlots: Math.max(0, campaignSlots - (acceptedCount + 1)),
            message: 'Application accepted! Collaboration created.'
          });
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
