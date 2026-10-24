// server/creatorDnaMiddleware.js
// ALLOY Marketplace — Dynamic Creator DNA Backend API Middleware
// Connect/Express compatible middleware handling Creator DNA analysis, status, and trait queries.

import { 
  executeCreatorDnaAnalysis, 
  getCreatorDna, 
  getCreatorDnaStatus 
} from './creatorDnaService.js';

function parseJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return Promise.resolve(req.body);
    if (typeof req.body === 'string') {
      try { return Promise.resolve(req.body.trim() ? JSON.parse(req.body) : {}); }
      catch (e) { return Promise.reject(new Error('Invalid JSON')); }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        const str = req.body.toString('utf8');
        return Promise.resolve(str.trim() ? JSON.parse(str) : {});
      } catch (e) { return Promise.reject(new Error('Invalid JSON')); }
    }
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-creator-id');
  } else if (typeof res.writeHead === 'function') {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-creator-id'
    });
  }
  res.end(JSON.stringify(data));
}

export function createCreatorDnaMiddleware() {
  return async function creatorDnaMiddleware(req, res, next) {
    const rawUrl = req.url || '';
    const url = rawUrl.split('?')[0];

    // CORS preflight
    if (req.method === 'OPTIONS' && (url.startsWith('/api/creator-dna') || url.startsWith('/api/ai/creator-dna'))) {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-creator-id');
      return res.end();
    }

    if (!url.startsWith('/api/creator-dna') && !url.startsWith('/api/ai/creator-dna')) {
      return next ? next() : res.end();
    }

    try {
      // 1. POST /api/creator-dna/analyze
      if ((url === '/api/creator-dna/analyze' || url === '/api/ai/creator-dna/analyze') && req.method === 'POST') {
        const callerHeader = req.headers['x-creator-id'] || req.headers['authorization'];
        if (!callerHeader) {
          return sendJson(res, 401, {
            ok: false,
            error: 'UNAUTHORIZED_CREATOR',
            message: 'Authentication header (x-creator-id or Authorization) is required to trigger DNA analysis.'
          });
        }

        const body = await parseJsonBody(req);
        const creatorId = body.creatorId || body.id || req.headers['x-creator-id'];
        if (!creatorId) {
          return sendJson(res, 400, { ok: false, error: 'creatorId is required for DNA analysis.' });
        }

        // Cross-creator protection: cannot trigger analysis on another creator's profile
        const authenticatedCallerId = req.headers['x-creator-id'];
        if (authenticatedCallerId && body.creatorId && authenticatedCallerId !== body.creatorId) {
          return sendJson(res, 403, {
            ok: false,
            error: 'FORBIDDEN',
            message: 'Creators can only trigger analysis for their own published portfolio.'
          });
        }

        const result = await executeCreatorDnaAnalysis(creatorId, {
          creator: body.creator,
          forceRefresh: Boolean(body.forceRefresh)
        });

        return sendJson(res, 200, result);
      }

      // 2. POST /api/creator-dna/refresh
      if ((url === '/api/creator-dna/refresh' || url === '/api/ai/creator-dna/refresh') && req.method === 'POST') {
        const callerHeader = req.headers['x-creator-id'] || req.headers['authorization'];
        if (!callerHeader) {
          return sendJson(res, 401, {
            ok: false,
            error: 'UNAUTHORIZED_CREATOR',
            message: 'Authentication header (x-creator-id or Authorization) is required to refresh DNA.'
          });
        }

        const body = await parseJsonBody(req);
        const creatorId = body.creatorId || body.id || req.headers['x-creator-id'];
        if (!creatorId) {
          return sendJson(res, 400, { ok: false, error: 'creatorId is required to refresh DNA.' });
        }

        // Cross-creator protection
        const authenticatedCallerId = req.headers['x-creator-id'];
        if (authenticatedCallerId && body.creatorId && authenticatedCallerId !== body.creatorId) {
          return sendJson(res, 403, {
            ok: false,
            error: 'FORBIDDEN',
            message: 'Creators can only refresh analysis for their own published portfolio.'
          });
        }

        const result = await executeCreatorDnaAnalysis(creatorId, {
          creator: body.creator,
          forceRefresh: true
        });

        return sendJson(res, 200, result);
      }

      // 3. GET /api/creator-dna/status/:analysisId
      if (url.includes('/status/')) {
        const parts = url.split('/status/');
        const analysisId = parts[1];
        if (!analysisId) {
          return sendJson(res, 400, { ok: false, error: 'analysisId is required.' });
        }
        const statusResult = getCreatorDnaStatus(analysisId);
        return sendJson(res, statusResult.ok ? 200 : 404, statusResult);
      }

      // 4. GET /api/creator-dna/:creatorId
      if (req.method === 'GET') {
        const segments = url.split('/').filter(Boolean);
        // segments: ['api', 'creator-dna', 'maya-chen']
        const creatorId = segments[segments.length - 1];
        if (!creatorId || creatorId === 'creator-dna') {
          return sendJson(res, 400, { ok: false, error: 'creatorId parameter missing in URL.' });
        }

        const result = await getCreatorDna(creatorId);
        return sendJson(res, 200, result);
      }

      return sendJson(res, 404, { ok: false, error: `Creator DNA endpoint "${url}" not found.` });
    } catch (err) {
      console.error('[Creator DNA API Error]:', err.message);
      return sendJson(res, 500, {
        ok: false,
        error: err.message || 'An error occurred during Creator DNA processing.'
      });
    }
  };
}
