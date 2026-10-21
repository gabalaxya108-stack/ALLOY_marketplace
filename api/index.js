// api/index.js
// Vercel Serverless Function entry point for CreaSync / ALLOY backend APIs
// Handles /api/ai/*, /api/pipeline/*, /api/trust/*, and /api/admin/*

import { createGroqMiddleware } from '../server/groqMiddleware.js';
import { createAdminMiddleware } from '../server/adminMiddleware.js';
import { createPaymentMiddleware } from '../server/paymentMiddleware.js';

const groqMiddleware = createGroqMiddleware();
const adminMiddleware = createAdminMiddleware();
const paymentMiddleware = createPaymentMiddleware();

export default function handler(req, res) {
  // Normalize req.url for Vercel serverless environment
  try {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const forwardedPath = req.headers['x-matched-path'] || 
                          req.headers['x-vercel-original-url'] || 
                          parsedUrl.searchParams.get('__path');

    if (forwardedPath && (!req.url.startsWith('/api/') || req.url.startsWith('/api/index.js'))) {
      parsedUrl.searchParams.delete('__path');
      const search = parsedUrl.searchParams.toString();
      req.url = forwardedPath + (search ? `?${search}` : '');
    }
  } catch (err) {
    // Keep req.url as is if URL parsing encounters any anomaly
  }

  // Chain middlewares
  groqMiddleware(req, res, () => {
    adminMiddleware(req, res, () => {
      paymentMiddleware(req, res, () => {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'API route not found' }));
      });
    });
  });
}
