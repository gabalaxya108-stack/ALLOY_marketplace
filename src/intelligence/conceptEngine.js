// src/intelligence/conceptEngine.js
// Dynamic CreaSim Concept Synthesizer
// Generates creator-specific creative concepts tailored to BOTH:
// 1. The campaign brief requirements (title, objective, product, industry, platforms)
// 2. The selected creator's documented Creator DNA (aesthetic, tools, storytelling approach)

import { generateCreatorDNA } from './creatorDNA.js';
import { defaultAIProvider } from '../ai/provider.js';

/**
 * Generates an explainable creative concept connecting a creator to a campaign
 */
export function generateCreatorConcept(campaign, creator) {
  if (!campaign || !creator) return null;

  const creatorDNA = generateCreatorDNA(creator);
  const cacheKey = `concept_${campaign.id}_${creator.id}`;

  return defaultAIProvider.analyze(cacheKey, `${campaign.title}:${creator.name}`, () => {
    return buildDeterministicConcept(campaign, creator, creatorDNA);
  });
}

function buildDeterministicConcept(campaign, creator, creatorDNA) {
  const cTitle = campaign.title || 'Creative Campaign';
  const cProduct = campaign.product || campaign.industry || 'Product';
  const cStyle = campaign.creativeStyle || 'Contemporary';
  const creatorFirst = creator.name.split(' ')[0];

  const allStyles = [
    ...(creator.styles || []),
    creator.specialty,
    creator.creativeIdentity,
    ...(creator.categoryTags || []),
    creatorDNA.visualAesthetic
  ].filter(Boolean).map(s => String(s).toLowerCase()).join(' ');

  // 1. Dynamic concept palette synthesized from visual aesthetic and style signals
  let palette = ["#1E1E24", "#92140C", "#FFF8F0", "#FFCF99"];
  if (allStyles.includes('warm') || allStyles.includes('golden') || allStyles.includes('anamorphic') || allStyles.includes('cinematic')) {
    palette = ["#201A18", "#C89D7C", "#E3D5CA", "#8A5A44"];
  } else if (allStyles.includes('silk') || allStyles.includes('couture') || allStyles.includes('parisian') || allStyles.includes('luxury')) {
    palette = ["#141416", "#D8D4D5", "#F7F4EA", "#B5A895"];
  } else if (allStyles.includes('botanical') || allStyles.includes('viscosity') || allStyles.includes('droplet') || allStyles.includes('organic')) {
    palette = ["#FAF8F5", "#DDE5B6", "#ADC178", "#6C584C"];
  } else if (allStyles.includes('scandinavian') || allStyles.includes('monolith') || allStyles.includes('minimal')) {
    palette = ["#111111", "#4A4E69", "#9A8C98", "#F2E9E4"];
  } else if (allStyles.includes('kinetic') || allStyles.includes('3d') || allStyles.includes('velocity') || allStyles.includes('neon')) {
    palette = ["#0F1016", "#3A86FF", "#8338EC", "#FF006E"];
  } else if (allStyles.includes('crystal') || allStyles.includes('prismatic') || allStyles.includes('refraction')) {
    palette = ["#1C1D21", "#E0B1CB", "#BE95C4", "#9F86C0"];
  }

  // 2. Dynamic Concept Title tailored to product and creator style
  const primaryAesthetic = creatorDNA.visualAesthetic ? creatorDNA.visualAesthetic.split(',')[0].trim() : 'Art-Directed Vision';
  const primaryStyle = (creator.styles && creator.styles[0]) ? creator.styles[0] : (creator.specialty || 'Creative Direction');
  const conceptTitle = `“${primaryAesthetic}: ${primaryStyle} & ${cProduct} Narrative”`;

  // 3. Dynamic Storyboard sequences (3 sequential scenes tailored to creator format & storytelling)
  const isVideoOrMotion = (creator.specialty || '').toLowerCase().includes('video') ||
                          (creator.categoryTags || []).some(t => t.toLowerCase().includes('video') || t.toLowerCase().includes('motion')) ||
                          Boolean(creator.videoPreview);
  const is3D = (creator.specialty || '').toLowerCase().includes('3d') ||
               (creator.categoryTags || []).some(t => t.toLowerCase().includes('3d'));

  const storyboard = [
    {
      sceneNumber: 1,
      shotType: is3D ? "Exploded 3D Precision Spatial Hook" : (isVideoOrMotion ? "Atmospheric Cinematic Hook" : "High-Fidelity Macro Establishing"),
      timing: "0:00 – 0:05",
      title: `${primaryStyle} (Hook)`,
      description: is3D
        ? `Zero-gravity exploded spatial reveal of ${cProduct} elements with micro-geometry synchronization and clean refractive highlights.`
        : (isVideoOrMotion
            ? `Opening dynamic reveal establishing the ${primaryAesthetic.toLowerCase()} mood, warm atmospheric lighting, and high-impact brand presence.`
            : `High-resolution macro establishing composition showcasing tactile textures and ambient illumination on ${cProduct}.`),
      focus: is3D ? "Precision spatial dynamics and optical realism." : (isVideoOrMotion ? "High-impact visual engagement for modern feeds." : "Tactile clarity and photographic depth of field.")
    },
    {
      sceneNumber: 2,
      shotType: isVideoOrMotion ? "Tactile Slow-Motion Interaction" : "Editorial Product Focus",
      timing: "0:05 – 0:18",
      title: "Core Creative Exploration",
      description: `In-depth exploration presenting ${cProduct} with ${creatorDNA.productPresentationStyle}. Framing tactile material interactions, micro-textures, and emotional brand resonance.`,
      focus: "Authentic materiality, tactile fidelity, and narrative cohesion."
    },
    {
      sceneNumber: 3,
      shotType: isVideoOrMotion ? "Seamless Looping Hero Resolve" : "Master Key Art Frame",
      timing: "0:18 – 0:30",
      title: `${cTitle} Hero Resolve`,
      description: `Clean resolve positioning ${cProduct} in authoritative visual balance. Verified commercial deliverable lockup tailored for digital campaigns and high-conversion distribution.`,
      focus: "Memorable brand recall and quiet luxury resonance."
    }
  ];

  // Narrative Description
  const narrative = `An art-directed visual interpretation of ${cTitle} by ${creator.name}. Leveraging ${creatorDNA.provenance.creatorProvided.toolsUsed.slice(0, 2).join(' and ')}, this direction bridges ${campaign.industry || 'the brand'} with ${creatorDNA.visualAesthetic.toLowerCase()}.`;

  // Why this concept fits this creator
  const fitExplanation = `${creatorFirst}'s verified portfolio demonstrates mastery in ${creatorDNA.traits.slice(0, 2).join(' and ')}, utilizing ${creatorDNA.tools[0] || 'advanced generative engines'}. This concept translates their documented ${creatorDNA.storytellingApproach} into an actionable campaign framework.`;

  return {
    id: `concept-${campaign.id}-${creator.id}`,
    campaignId: campaign.id,
    creatorId: creator.id,
    creatorName: creator.name,
    creatorRole: creator.creativeIdentity,
    creatorAvatar: creator.avatar,
    conceptTitle,
    directionLabel: creatorDNA.visualAesthetic.split(',')[0],
    visualAesthetic: creatorDNA.visualAesthetic,
    targetAesthetic: creatorDNA.visualAesthetic,
    storytellingApproach: creatorDNA.storytellingApproach,
    narrative,
    storyboard,
    recommendedFormat: creator.specialty === 'AI Video' ? '60s 4K Hero Film & 2x 9:16 Loops' : '4K Master Stills Suite (6 Visuals)',
    palette,
    estimatedTurnaround: creator.turnaround || '2 Weeks',
    sampleVisual: creator.projects?.[0]?.image || creator.heroWork,
    fitExplanation,
    disclaimer: `Concept Simulation: Synthesized from ${creator.name}'s verified Creator DNA and campaign brief parameters. Demonstrates artistic creative potential, not a pre-existing client deliverable.`
  };
}
