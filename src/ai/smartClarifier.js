// src/ai/smartClarifier.js
// Identifies genuinely missing information and poses 1 lightweight question to avoid long questionnaires

export function getSmartClarification(briefAnalysis) {
  if (!briefAnalysis) return null;

  const { isSufficient, missingFields = [], rawText = '', industry, isFlexible } = briefAnalysis;

  if (isFlexible) {
    return null; // Brief is intentionally open/flexible; do not force clarification questions
  }

  if (isSufficient && missingFields.length === 0) {
    return null; // Brief is clear, no follow-up needed
  }

  const lower = rawText.toLowerCase();

  // Case 1: Fashion brand without content format specified
  if (lower.includes('fashion') && (!lower.includes('film') && !lower.includes('photo') && !lower.includes('social') && !lower.includes('stills'))) {
    return {
      field: 'contentFormat',
      question: 'What kind of content are you looking for?',
      options: [
        'AI fashion film',
        'Product campaign',
        'Social content',
        'Editorial visuals'
      ]
    };
  }

  // Case 2: Skincare / Beauty without format
  if (lower.includes('skincare') || lower.includes('beauty')) {
    return {
      field: 'contentFormat',
      question: 'What is your primary visual deliverable?',
      options: [
        'Cinematic video for Instagram',
        'Macro texture stills for web & print',
        '3D packaging & fluid loops',
        'Organic UGC-style clips'
      ]
    };
  }

  // Case 3: Very generic input: "I need a creator" or "I want something premium"
  if (rawText.length < 35 || lower.includes('need a creator') || lower.includes('want something')) {
    return {
      field: 'creativeDirection',
      question: 'What type of creative work are you looking to produce?',
      options: [
        'Cinematic video storytelling',
        '3D & precision product advertising',
        'High fashion & editorial lookbooks',
        'Beauty & luminous skincare visuals'
      ]
    };
  }

  // Case 4: Missing timeline or platform
  if (missingFields.includes('contentFormat')) {
    return {
      field: 'contentFormat',
      question: 'What format do you need most?',
      options: [
        'Short-form vertical video (9:16)',
        'High-resolution key art stills',
        'Full 3D product motion render',
        'Multi-asset campaign package'
      ]
    };
  }

  return null;
}
