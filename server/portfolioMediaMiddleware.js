// server/portfolioMediaMiddleware.js
// Middleware to serve and synchronize generated creator portfolio media assets
// Resolves assets from public/portfolios or the agent brain artifact directory

import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\pushk\\.gemini\\antigravity-ide\\brain\\db994c70-0461-4c03-9b33-c5abe8c4e93b';
const PUBLIC_PORTFOLIOS_DIR = path.resolve(process.cwd(), 'public/portfolios');
const PUBLIC_ASSETS_DIR = path.resolve(process.cwd(), 'public/assets');

// Explicit mapping of generated images to creator portfolio filenames
export const CREATOR_PORTFOLIO_MAP = {
  'maya-chen': {
    filename: 'maya-chen-portfolio.jpg',
    artifactPrefix: 'maya_cinematic_hero'
  },
  'alex-rivera': {
    filename: 'alex-rivera-portfolio.jpg',
    artifactPrefix: 'alex_product_hero'
  },
  'elena-rostova': {
    filename: 'elena-rostova-portfolio.jpg',
    artifactPrefix: 'elena_fashion_hero'
  },
  'zora-vance': {
    filename: 'zora-vance-portfolio.jpg',
    artifactPrefix: 'zora_beauty_hero'
  },
  'tariq-al-mansoor': {
    filename: 'tariq-al-mansoor-portfolio.jpg',
    artifactPrefix: 'tariq_architecture_hero'
  },
  'sophie-mercier': {
    filename: 'sophie-mercier-portfolio.jpg',
    artifactPrefix: 'sophie_jewelry_hero'
  },
  'amara-diallo': {
    filename: 'amara-diallo-portfolio.jpg',
    artifactPrefix: 'amara_culinary_hero'
  },
  'kenji-takahashi': {
    filename: 'kenji-takahashi-portfolio.jpg',
    artifactPrefix: 'kenji_character_hero'
  },
  'nina-novak': {
    filename: 'nina-novak-portfolio.jpg',
    artifactPrefix: 'nina_pop_hero'
  },
  'mateo-cruz': {
    filename: 'mateo-cruz-portfolio.jpg',
    artifactPrefix: 'mateo_desert_hero'
  },
  'liam-oconnor': {
    filename: 'liam-oconnor-portfolio.jpg',
    artifactPrefix: 'liam_chrome_hero'
  },
  'saffron-chen': {
    filename: 'saffron-chen-portfolio.jpg',
    artifactPrefix: 'saffron_dream_hero'
  },
  'julian-thorne': {
    filename: 'julian-thorne-portfolio.jpg',
    assetFallback: 'alloy-login-artwork.jpg'
  },
  'chloe-davenport': {
    filename: 'chloe-davenport-portfolio.png',
    assetFallback: 'alloy-sculpture-backdrop.png'
  }
};

export function syncPortfolioAssets() {
  try {
    if (!fs.existsSync(PUBLIC_PORTFOLIOS_DIR)) {
      fs.mkdirSync(PUBLIC_PORTFOLIOS_DIR, { recursive: true });
    }

    let brainFiles = [];
    if (fs.existsSync(ARTIFACT_DIR)) {
      brainFiles = fs.readdirSync(ARTIFACT_DIR);
    }

    for (const [creatorId, item] of Object.entries(CREATOR_PORTFOLIO_MAP)) {
      const destPath = path.join(PUBLIC_PORTFOLIOS_DIR, item.filename);

      // Check if mapped to a generated artifact
      if (item.artifactPrefix) {
        const matched = brainFiles.find(f => f.startsWith(item.artifactPrefix) && /\.(jpg|jpeg|png)$/i.test(f));
        if (matched) {
          const srcPath = path.join(ARTIFACT_DIR, matched);
          fs.copyFileSync(srcPath, destPath);
          console.log(`[PortfolioMedia] Synced ${matched} -> ${item.filename}`);
          continue;
        }
      }

      // Fallback from public/assets if specified
      if (item.assetFallback) {
        const srcAssetPath = path.join(PUBLIC_ASSETS_DIR, item.assetFallback);
        if (fs.existsSync(srcAssetPath)) {
          fs.copyFileSync(srcAssetPath, destPath);
          console.log(`[PortfolioMedia] Synced asset fallback ${item.assetFallback} -> ${item.filename}`);
        }
      }
    }
  } catch (err) {
    console.error('[PortfolioMedia] Error syncing assets:', err);
  }
}

export function createPortfolioMediaMiddleware() {
  // Sync all mapped creator portfolios immediately on boot
  syncPortfolioAssets();

  return function portfolioMediaMiddleware(req, res, next) {
    const url = req.url.split('?')[0];

    // Manual re-sync endpoint
    if (url === '/api/sync-portfolio-assets') {
      syncPortfolioAssets();
      const files = fs.readdirSync(PUBLIC_PORTFOLIOS_DIR);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true, count: files.length, files }));
    }

    // Serve /portfolios/* or /portfolio-media/*
    if (url.startsWith('/portfolios/') || url.startsWith('/portfolio-media/')) {
      const filename = path.basename(url);
      const filePath = path.join(PUBLIC_PORTFOLIOS_DIR, filename);

      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp'
        };
        res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    next();
  };
}
