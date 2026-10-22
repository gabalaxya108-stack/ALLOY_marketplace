// server/index.js
// Standalone Production Node.js Server for ALLOY API & Static Assets
// Can be run via: node server/index.js

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGroqMiddleware } from './groqMiddleware.js';
import { createAdminMiddleware } from './adminMiddleware.js';
import { createPaymentMiddleware } from './paymentMiddleware.js';
import { createDbMiddleware } from './dbMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

const PORT = process.env.PORT || 3001;
const groqMiddleware = createGroqMiddleware();
const adminMiddleware = createAdminMiddleware();
const paymentMiddleware = createPaymentMiddleware();
const dbMiddleware = createDbMiddleware();

// Simple static file server helper for production bundles in dist/
function serveStatic(req, res, next) {
  if (!fs.existsSync(distDir)) return next();

  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const safePath = path.normalize(path.join(distDir, reqPath));
  if (!safePath.startsWith(distDir)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    const ext = path.extname(safePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.woff2': 'font/woff2'
    };
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    return fs.createReadStream(safePath).pipe(res);
  }

  // SPA fallback to index.html for non-API routes
  if (!req.url.startsWith('/api/')) {
    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html');
      return fs.createReadStream(indexPath).pipe(res);
    }
  }

  next();
}

const server = http.createServer((req, res) => {
  // Chain middlewares: dbMiddleware -> groqMiddleware -> adminMiddleware -> paymentMiddleware -> serveStatic -> 404
  dbMiddleware(req, res, () => {
    groqMiddleware(req, res, () => {
      adminMiddleware(req, res, () => {
        paymentMiddleware(req, res, () => {
          serveStatic(req, res, () => {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Endpoint not found' }));
          });
        });
      });
    });
  });
});

server.listen(PORT, () => {
  console.log(`[ALLOY Production Server] Running on http://localhost:${PORT}`);
});
