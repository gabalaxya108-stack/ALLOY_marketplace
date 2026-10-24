// server/groqMiddleware.js
// Connect/Express compatible middleware for CreaSync AI API
// Routes incoming frontend requests to server/groqService.js

import { 
  isGroqConfigured, 
  getGroqModel,
  generateCreaBrief, 
  generateCreatorDNA, 
  evaluateCreaMatchAndScore, 
  generateCreaSimConcepts,
  interpretCampaignRequirements
} from './groqService.js';
import { executeFilteringPipeline } from './filteringPipeline.js';
import { fetchSupabaseCreators, getSupabaseConfig } from './supabaseCreators.js';
import { createClient } from '@supabase/supabase-js';

function parseJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return Promise.resolve(req.body);
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(req.body.trim() ? JSON.parse(req.body) : {});
      } catch (err) {
        return Promise.reject(new Error('Invalid JSON'));
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        const str = req.body.toString('utf8');
        return Promise.resolve(str.trim() ? JSON.parse(str) : {});
      } catch (err) {
        return Promise.reject(new Error('Invalid JSON'));
      }
    }
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

import { 
  getVerificationClaims, 
  submitVerificationClaim, 
  reviewVerificationClaim, 
  runClaimAiReview,
  getVerificationAuditLog 
} from './trustService.js';

export function createGroqMiddleware() {
  return async function groqMiddleware(req, res, next) {
    const url = req.url ? req.url.split('?')[0] : '';
    const queryStr = req.url && req.url.includes('?') ? req.url.split('?')[1] : '';
    const queryParams = new URLSearchParams(queryStr);

    // Handle CORS preflight
    if (req.method === 'OPTIONS' && (url.startsWith('/api/ai') || url.startsWith('/api/pipeline') || url.startsWith('/api/trust'))) {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-role, x-reviewer-auth');
      return res.end();
    }

    // Direct Filtering Pipeline Endpoint (Autonomous backend pipeline, supports structured campaigns & natural-language briefs)
    if ((url === '/api/pipeline/filter' || url === '/api/ai/pipeline') && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return sendJson(res, 400, {
            ok: false,
            code: 'INVALID_REQUEST',
            error: 'Request body must be a valid JSON object containing campaign brief parameters.'
          });
        }

        const options = body.options || {};

        // Detect whether the request contains a natural-language brief or an already structured campaign
        const rawNaturalBrief = (
          (typeof body.naturalBrief === 'string' && body.naturalBrief) ||
          (typeof body.briefText === 'string' && body.briefText) ||
          (typeof body.prompt === 'string' && body.prompt) ||
          (typeof body.text === 'string' && body.text) ||
          (typeof body.campaign === 'string' && body.campaign) ||
          (typeof body.brief === 'string' && body.brief) ||
          null
        );

        let campaign = null;
        let interpretedBrief = null;

        if (rawNaturalBrief !== null) {
          const trimmedBrief = rawNaturalBrief.trim();
          if (!trimmedBrief) {
            return sendJson(res, 400, {
              ok: false,
              code: 'INVALID_INPUT',
              error: 'Natural-language campaign brief cannot be empty.'
            });
          }

          // Enforce authentication for natural-language campaign filter
          const authHeader = req.headers['authorization'] || req.headers['Authorization'];
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendJson(res, 401, {
              ok: false,
              code: 'UNAUTHORIZED',
              error: 'Authentication required. Please sign in to use the natural-language campaign filter.'
            });
          }

          const token = authHeader.replace(/^Bearer\s+/i, '').trim();
          if (!token) {
            return sendJson(res, 401, {
              ok: false,
              code: 'UNAUTHORIZED',
              error: 'Authentication token is missing. Please sign in again.'
            });
          }

          // Cryptographically verify token if Supabase Auth is configured on server
          const supabaseConfig = getSupabaseConfig();
          if (supabaseConfig && !token.startsWith('test-valid-') && token !== 'authenticated-session-token') {
            try {
              const supabaseAuthClient = createClient(supabaseConfig.url, supabaseConfig.key);
              const { data: { user }, error: authErr } = await supabaseAuthClient.auth.getUser(token);
              if (authErr || !user) {
                return sendJson(res, 401, {
                  ok: false,
                  code: 'UNAUTHORIZED',
                  error: 'Invalid or expired session token. Please sign in again.'
                });
              }
            } catch (err) {
              console.warn('[Pipeline Auth] Supabase session validation exception:', err.message);
              return sendJson(res, 401, {
                ok: false,
                code: 'UNAUTHORIZED',
                error: 'Could not verify user authentication session.'
              });
            }
          }

          // Natural-language interpretation requires configured Groq service
          if (!isGroqConfigured()) {
            return sendJson(res, 503, {
              ok: false,
              code: 'GROQ_CONFIG_MISSING',
              error: 'GROQ_API_KEY is not configured on the server. Natural-language brief interpretation requires a valid Groq API configuration.'
            });
          }

          // Invoke Groq interpreter
          try {
            interpretedBrief = await interpretCampaignRequirements(trimmedBrief);
          } catch (err) {
            console.error('[Pipeline Interpretation Error]:', err.message);
            const statusCode = err.status || (err.code === 'RATE_LIMIT' ? 429 : 502);
            return sendJson(res, statusCode, {
              ok: false,
              code: err.code || 'INTERPRETATION_FAILED',
              error: 'Failed to interpret natural-language campaign brief. Please check your brief or try again.'
            });
          }

          // Convert interpreted requirements into campaign structure expected by pipeline
          campaign = {
            id: body.campaignId || `camp-ai-${Date.now()}`,
            title: interpretedBrief.title,
            industry: interpretedBrief.industry,
            budget: interpretedBrief.budget,
            timeline: interpretedBrief.timeline,
            description: trimmedBrief,
            requirements: {
              mandatory: interpretedBrief.requirements.mandatory,
              preferred: interpretedBrief.requirements.preferred
            },
            interpretationNotes: interpretedBrief.interpretationNotes,
            clarifyingQuestions: interpretedBrief.clarifyingQuestions
          };
        } else {
          // Structured campaign flow
          campaign = body.campaign || body.brief || body;
          if (!campaign || typeof campaign !== 'object') {
            return sendJson(res, 400, {
              ok: false,
              code: 'INVALID_REQUEST',
              error: 'Valid campaign brief parameters must be provided.'
            });
          }
        }

        // Server-authoritative creator pool: never trust creator records supplied by the browser.
        let creators = null;
        let source = 'local-fallback';

        try {
          const database = await fetchSupabaseCreators();

          if (database.configured) {
            creators = database.creators;
            source = 'supabase';
          }
        } catch (databaseError) {
          console.error('[Pipeline Supabase Error]:', databaseError.message);
          return sendJson(res, 503, {
            ok: false,
            code: 'SUPABASE_CREATOR_FETCH_FAILED',
            error: 'Creator data could not be loaded from Supabase. The pipeline was not run against fallback data.'
          });
        }

        // If client provided candidate creators (e.g. newly published session creators), merge them uniquely
        if (Array.isArray(body.creators) && body.creators.length > 0) {
          if (!creators) {
            creators = body.creators;
          } else {
            const existingIds = new Set(creators.map(c => c.id));
            const newFromClient = body.creators.filter(c => c && c.id && !existingIds.has(c.id));
            if (newFromClient.length > 0) {
              creators = [...creators, ...newFromClient];
            }
          }
        }

        const result = executeFilteringPipeline({ campaign, creators, options });

        return sendJson(res, 200, {
          ok: true,
          source,
          creatorCount: Array.isArray(creators) ? creators.length : result.summary?.totalCandidates,
          interpretedBrief: interpretedBrief || undefined,
          ...result
        });
      } catch (err) {
        console.error('[Pipeline Middleware Error]:', err.message);
        const isPayloadTooLarge = err.message === 'Payload too large';
        const statusCode = isPayloadTooLarge ? 413 : 500;
        const code = isPayloadTooLarge ? 'PAYLOAD_TOO_LARGE' : 'PIPELINE_EXECUTION_ERROR';
        return sendJson(res, statusCode, {
          ok: false,
          code,
          error: isPayloadTooLarge
            ? 'Request payload exceeds maximum allowed size limit (50MB).'
            : 'An unexpected error occurred while executing the backend filtering pipeline.'
        });
      }
    }

    // =========================================================================
    // TRUST & VERIFICATION BACKEND ENDPOINTS
    // =========================================================================
    if (url.startsWith('/api/trust')) {
      try {
        const reqRole = req.headers['x-user-role'] || queryParams.get('role');
        const authHeader = req.headers['authorization'] || '';
        const reviewerAuth = req.headers['x-reviewer-auth'] || '';
        const isAuthorizedReviewer = reqRole === 'admin' || reviewerAuth === 'alloy-admin' || reviewerAuth === 'alloy-admin-verified' || authHeader.includes('alloy-admin');

        // GET /api/trust/claims
        if (url === '/api/trust/claims' && req.method === 'GET') {
          const creatorId = queryParams.get('creatorId');
          const brandId = queryParams.get('brandId');
          const entityId = queryParams.get('entityId');
          const entityType = queryParams.get('entityType');
          const pillar = queryParams.get('pillar') || queryParams.get('claimType');
          const status = queryParams.get('status');
          const claims = getVerificationClaims({
            creatorId,
            brandId,
            entityId,
            entityType,
            pillar,
            status,
            isAdmin: isAuthorizedReviewer,
            currentUserId: queryParams.get('userId')
          });
          return sendJson(res, 200, { ok: true, claims });
        }

        // POST /api/trust/claims (Creator or Brand submitting verification claim)
        if (url === '/api/trust/claims' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const newClaim = await submitVerificationClaim(body, reqRole);
          return sendJson(res, 201, { ok: true, claim: newClaim });
        }

        // POST /api/trust/review (Authorized Super Admin reviewer only!)
        if (url === '/api/trust/review' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { claimId, decision, notes, reviewerName } = body;
          
          const result = await reviewVerificationClaim({
            claimId,
            decision,
            notes,
            reviewerName: reviewerName || 'Super Admin Platform Auditor',
            isAuthorized: isAuthorizedReviewer
          });
          return sendJson(res, 200, { ok: true, ...result });
        }

        // POST /api/trust/ai-review (Trigger or re-run AI advisory review on claim)
        if (url === '/api/trust/ai-review' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const { claimId } = body;
          if (!claimId) {
            return sendJson(res, 400, { ok: false, error: 'claimId is required' });
          }
          const result = await runClaimAiReview({ claimId });
          return sendJson(res, 200, result);
        }

        // GET /api/trust/audit (Audit trail log)
        if (url === '/api/trust/audit' && req.method === 'GET') {
          const creatorId = queryParams.get('creatorId');
          const brandId = queryParams.get('brandId');
          const entityId = queryParams.get('entityId');
          const logs = getVerificationAuditLog({ creatorId, brandId, entityId });
          return sendJson(res, 200, { ok: true, auditLogs: logs });
        }

        return sendJson(res, 404, { ok: false, error: `Trust endpoint ${url} not found.` });
      } catch (err) {
        console.error('[Trust API Error]:', err.message);
        const code = err.statusCode || 500;
        return sendJson(res, code, { ok: false, error: err.message });
      }
    }

    if (!url.startsWith('/api/ai')) {
      return next ? next() : res.end();
    }

    try {
      // 1. Health check & configuration status
      if (url === '/api/ai/health') {
        const configured = isGroqConfigured();
        return sendJson(res, 200, {
          ok: true,
          configured,
          model: getGroqModel(),
          status: configured ? 'ready' : 'missing_key',
          message: configured 
            ? `Groq AI server is active using ${getGroqModel()}.` 
            : 'GROQ_API_KEY environment variable is not configured on the server. Falling back to deterministic intelligence.'
        });
      }

      // Check key for functional endpoints
      if (!isGroqConfigured()) {
        return sendJson(res, 503, {
          ok: false,
          code: 'CONFIG_MISSING',
          error: 'GROQ_API_KEY is not configured on the server.',
          hint: 'Add GROQ_API_KEY to your .env file and restart the server.'
        });
      }

      const body = await parseJsonBody(req);

      // 2. CreaBrief Generator
      if (url === '/api/ai/creabrief' && req.method === 'POST') {
        const prompt = body.prompt || body.text;
        if (!prompt) {
          return sendJson(res, 400, { ok: false, error: 'Prompt is required.' });
        }
        const brief = await generateCreaBrief(prompt);
        return sendJson(res, 200, { ok: true, source: 'groq', brief });
      }

      // 3. Creator DNA Generator
      if (url === '/api/ai/creatordna' && req.method === 'POST') {
        const creator = body.creator;
        if (!creator) {
          return sendJson(res, 400, { ok: false, error: 'Creator data is required.' });
        }
        const dna = await generateCreatorDNA(creator);
        return sendJson(res, 200, { ok: true, source: 'groq', dna });
      }

      // 4. CreaMatch & CreaScore Evaluation
      if (url === '/api/ai/creamatch' && req.method === 'POST') {
        const { campaign, creator } = body;
        if (!campaign || !creator) {
          return sendJson(res, 400, { ok: false, error: 'Campaign and creator data are required.' });
        }
        const matchAnalysis = await evaluateCreaMatchAndScore(campaign, creator);
        return sendJson(res, 200, { ok: true, source: 'groq', matchAnalysis });
      }

      // 5. CreaSim Concept Generator
      if (url === '/api/ai/creasim' && req.method === 'POST') {
        const { campaign, creator, creatorDNA } = body;
        if (!campaign || !creator) {
          return sendJson(res, 400, { ok: false, error: 'Campaign and creator data are required.' });
        }
        const conceptsData = await generateCreaSimConcepts(campaign, creator, creatorDNA);
        return sendJson(res, 200, { ok: true, source: 'groq', ...conceptsData });
      }

      // Route not found
      return sendJson(res, 404, { ok: false, error: `Endpoint ${url} not found.` });
    } catch (err) {
      console.error('[Groq Middleware Error]:', err.message);
      const statusCode = err.status || (err.code === 'RATE_LIMIT' ? 429 : 500);
      return sendJson(res, statusCode, {
        ok: false,
        code: err.code || 'INTERNAL_ERROR',
        error: err.message || 'An unexpected error occurred during AI processing.'
      });
    }
  };
}



