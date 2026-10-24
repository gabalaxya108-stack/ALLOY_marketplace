// src/intelligence/campaignDNA.js
// Interprets campaign briefs into human-readable Campaign DNA

export function extractCampaignDNA(campaign) {
  if (!campaign) return null;

  const desc = (campaign.description || '').trim();
  const title = (campaign.title || '').trim();
  const fullText = `${title} ${desc}`.toLowerCase();

  // Fallback behavior if brief has insufficient details
  if (desc.length < 15) {
    return {
      isSufficient: false,
      message: 'Not enough information yet. Add more detail to your campaign brief to improve recommendations.',
      traits: ['General Campaign'],
      creativeDirection: 'Pending additional brief nuances.',
      industryFocus: 'General',
      tone: 'Balanced'
    };
  }

  // Deterministic semantic trait detection
  const detectedTraits = [];
  
  if (fullText.includes('warm') || fullText.includes('sun') || fullText.includes('mediterranean') || fullText.includes('golden')) {
    detectedTraits.push('Warm & Golden Light');
  }
  if (fullText.includes('skin') || fullText.includes('beauty') || fullText.includes('serum') || fullText.includes('hydration') || fullText.includes('glow')) {
    detectedTraits.push('Beauty & Skincare');
  }
  if (fullText.includes('macro') || fullText.includes('fluid') || fullText.includes('texture') || fullText.includes('droplet') || fullText.includes('detail')) {
    detectedTraits.push('Macro Textures');
  }
  if (fullText.includes('fashion') || fullText.includes('silk') || fullText.includes('runway') || fullText.includes('couture') || fullText.includes('apparel')) {
    detectedTraits.push('Fashion & Apparel');
  }
  if (fullText.includes('product') || fullText.includes('commercial') || fullText.includes('bottle') || fullText.includes('watch') || fullText.includes('hardware')) {
    detectedTraits.push('Product Advertising');
  }
  if (fullText.includes('cinematic') || fullText.includes('film') || fullText.includes('narrative') || fullText.includes('story') || fullText.includes('movie')) {
    detectedTraits.push('Cinematic Narrative');
  }
  if (fullText.includes('surreal') || fullText.includes('dream') || fullText.includes('space') || fullText.includes('architecture') || fullText.includes('3d')) {
    detectedTraits.push('Surreal & Spatial');
  }
  if (fullText.includes('social') || fullText.includes('instagram') || fullText.includes('tiktok') || fullText.includes('reel') || fullText.includes('vertical')) {
    detectedTraits.push('Social & Vertical');
  }
  if (fullText.includes('luxury') || fullText.includes('high-end') || fullText.includes('premium') || fullText.includes('fine')) {
    detectedTraits.push('Luxury Aesthetic');
  }

  // Ensure 4 to 6 strong traits
  if (detectedTraits.length < 3) {
    detectedTraits.push('Editorial Stills', 'Brand Storytelling');
  }

  // Synthesize creative direction interpretation line
  let creativeDirection = '';
  if (fullText.includes('skin') || fullText.includes('beauty')) {
    creativeDirection = 'Warm, human product storytelling with an editorial beauty feel and radiant macro lighting.';
  } else if (fullText.includes('fashion') || fullText.includes('couture')) {
    creativeDirection = 'Neoclassical high-fashion editorial with dramatic draping and sculptural silhouettes.';
  } else if (fullText.includes('product') || fullText.includes('watch') || fullText.includes('tech')) {
    creativeDirection = 'Crisp kinetic industrial commercial with zero-gravity product mechanics.';
  } else if (fullText.includes('surreal') || fullText.includes('architecture')) {
    creativeDirection = 'Immersive biophilic dreamscapes blending brutalist materiality and sunlight.';
  } else {
    creativeDirection = 'Cohesive contemporary visual campaign balancing editorial polish and commercial impact.';
  }

  return {
    isSufficient: true,
    traits: detectedTraits.slice(0, 5),
    creativeDirection,
    industryFocus: detectedTraits.includes('Beauty & Skincare') ? 'Beauty' : 'Commercial',
    budgetTier: campaign.budget ? String(campaign.budget).replace(/\$/g, '₹') : '₹50,000 – ₹1,00,000',
    timeline: campaign.timeline || '2–3 Weeks'
  };
}
