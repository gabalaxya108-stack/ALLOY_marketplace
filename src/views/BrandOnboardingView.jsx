import React, { useState } from 'react';
import { 
  ArrowRight, ArrowLeft, Check, Sparkles, Briefcase, 
  Search, ShieldCheck, Compass, FileText, CheckCircle2, 
  Layers, Users, Building, Globe, DollarSign, Calendar, Eye 
} from 'lucide-react';
import { generateCreaBrief } from '../ai/groqClient';
import { calculateCreaMatch } from '../intelligence/matchingEngine';
import { explainMatch } from '../intelligence/matchExplainer';

export default function BrandOnboardingView({ 
  creators = [], 
  onCompleteBrandOnboarding, 
  onExploreMarketplace 
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Step 2: Brand Information
  const [brandInfo, setBrandInfo] = useState({
    brandName: '',
    industry: 'Beauty & Skincare',
    website: '',
    description: '',
    aestheticPreference: 'Clean & Minimal'
  });

  // Step 3: Campaign Intent
  const [campaignIntent, setCampaignIntent] = useState('Product Launch');

  // Step 4: Campaign Brief
  const [naturalPrompt, setNaturalPrompt] = useState('');
  const [isAnalyzingBrief, setIsAnalyzingBrief] = useState(false);
  const [briefSource, setBriefSource] = useState(null);
  const [campaignBrief, setCampaignBrief] = useState({
    title: '',
    objective: 'Product Launch',
    productOrService: '',
    targetAudience: '',
    creativeDirection: '',
    creativeStyle: 'Clean, Minimal, Luminous',
    desiredTone: 'Authentic & Premium',
    contentFormats: '4K Stills Suite, 9:16 Loops',
    deliverables: '3x Hero Stills, 2x Vertical Reels',
    preferredPlatforms: 'Instagram, TikTok',
    budget: '₹80,000',
    deadline: '3 weeks',
    requiredCreatorCapabilities: ['Macro Fluid Physics', 'High-Res Lighting']
  });

  // Intent Options
  const intentOptions = [
    { id: 'Product Launch', label: 'Launch a New Product', desc: 'Hero key visuals, 3D product renders, and high-impact launch assets.' },
    { id: 'Social Content', label: 'Create Social Content Suite', desc: 'Engaging short-form vertical reels, lifestyle stills, and community content.' },
    { id: 'Find UGC Creators', label: 'Find AI UGC Creators', desc: 'Authentic human-style creator reviews, unboxings, and relatable lifestyle stories.' },
    { id: 'Brand Film', label: 'Produce a Cinematic Brand Film', desc: 'Worldbuilding, 35mm atmospheric storytelling, and narrative brand mythology.' },
    { id: 'Explore Concepts', label: 'Explore Creative Directions', desc: 'Test multiple visual aesthetics before committing to full production.' },
    { id: 'Long-term Partners', label: 'Find Long-Term Creative Partners', desc: 'Establish an ongoing retainer with AI directors for continuous asset pipelines.' }
  ];

  // Industry Options
  const industryOptions = [
    'Beauty & Skincare',
    'Luxury & High Fashion',
    'Consumer Tech & Hardware',
    'Beverage & Spirits',
    'Architecture & Hospitality',
    'Wellness & Fitness',
    'Automotive & Spatial'
  ];

  // Demo auto-fill
  const handleAutoFillDemo = () => {
    setBrandInfo({
      brandName: 'Aura Botanica',
      industry: 'Beauty & Skincare',
      website: 'https://aurabotanica.com',
      description: 'Pioneering organic cold-pressed botanicals for modern minimalist skincare rituals.',
      aestheticPreference: 'Warm, Luminous & Organic'
    });
    setCampaignIntent('Product Launch');
    setNaturalPrompt('We are launching the Pure Hydration Elixir. Need 3 high-res macro stills and 2 vertical video loops highlighting dewdrop caustics, clean glass packaging, and glowing natural morning light for Instagram and TikTok.');
    setCampaignBrief({
      title: 'Pure Hydration Elixir Launch',
      objective: 'Product Launch',
      productOrService: 'Botanical Hydration Serum',
      targetAudience: 'Skincare enthusiasts aged 24-40 valuing clean luxury aesthetics',
      creativeDirection: 'Warm morning sunlight, crystalline water droplets, macro botanical textures, and tactile glass reflections.',
      creativeStyle: 'Luminous, Macro Viscosity, Clean Organic',
      desiredTone: 'Serene, Luminous, High-End',
      contentFormats: '4K Stills Suite, 9:16 Vertical Loops',
      deliverables: '3x Hero Master Stills, 2x 15s Vertical Loops',
      preferredPlatforms: 'Instagram, TikTok',
      budget: '₹65,000',
      deadline: '3 weeks',
      requiredCreatorCapabilities: ['Macro Viscosity', 'Sub-Surface Light Physics']
    });
  };

  // Run live Groq CreaBrief structuring
  const handleAnalyzeWithGroq = async () => {
    if (!naturalPrompt.trim()) return;
    setIsAnalyzingBrief(true);
    try {
      const res = await generateCreaBrief(naturalPrompt);
      if (res && res.brief) {
        setBriefSource(res.source);
        setCampaignBrief({
          title: res.brief.title || campaignBrief.title,
          objective: res.brief.objective || campaignIntent,
          productOrService: res.brief.productOrService || brandInfo.brandName,
          targetAudience: res.brief.targetAudience || 'Modern discerning consumers',
          creativeDirection: res.brief.creativeDirection || '',
          creativeStyle: res.brief.creativeStyle || res.brief.creativeDirection || 'Contemporary Luxury',
          desiredTone: res.brief.desiredTone || 'Authentic & Premium',
          contentFormats: res.brief.contentFormats || res.brief.deliverables || '4K Stills Suite',
          deliverables: res.brief.deliverables || 'Key Visuals & Motion Passes',
          preferredPlatforms: res.brief.preferredPlatforms || 'Instagram, TikTok',
          budget: res.brief.budget || null,
          deadline: res.brief.deadline || null,
          requiredCreatorCapabilities: res.brief.requiredCreatorCapabilities || []
        });
      }
    } catch (err) {
      console.warn('CreaBrief extraction failed, keeping current inputs:', err);
    } finally {
      setIsAnalyzingBrief(false);
    }
  };

  // Top matching creators for Step 5
  const matchedCreators = creators
    .map(creator => ({
      creator,
      match: calculateCreaMatch(campaignBrief, creator),
      explanation: explainMatch(campaignBrief, creator)
    }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 3);

  // Complete and enter Brand Studio
  const handleComplete = () => {
    const brandId = `brand-${Date.now()}`;
    const newBrand = {
      id: brandId,
      name: brandInfo.brandName || 'My Brand',
      handle: `@${(brandInfo.brandName || 'mybrand').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      logo: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80',
      coverImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=85',
      industry: brandInfo.industry || 'Beauty & Skincare',
      website: brandInfo.website || '',
      description: brandInfo.description || '',
      aesthetic: brandInfo.aestheticPreference || 'Clean & Minimal',
      brandColors: ["#EB6E4B", "#FDF7ED", "#2E3A2F"],
      preferredPlatforms: campaignBrief.preferredPlatforms ? campaignBrief.preferredPlatforms.split(', ') : ['Instagram'],
      isDemo: false
    };

    const finalCampaign = {
      id: `camp-${Date.now()}`,
      ownerBrandId: brandId,
      title: campaignBrief.title || `${newBrand.name} Campaign`,
      brandName: newBrand.name,
      brandAvatar: newBrand.logo,
      brandWebsite: newBrand.website,
      industry: brandInfo.industry,
      objective: campaignBrief.objective || campaignIntent,
      status: 'Active',
      visibility: 'published',
      budget: campaignBrief.budget || 'In Discussion',
      timeline: campaignBrief.deadline || 'Flexible',
      deadline: campaignBrief.deadline || '3 weeks',
      deliverables: campaignBrief.deliverables ? campaignBrief.deliverables.split(', ') : ['3x Hero Stills'],
      creativeStyle: campaignBrief.creativeStyle,
      description: campaignBrief.creativeDirection || brandInfo.description,
      platforms: campaignBrief.preferredPlatforms ? campaignBrief.preferredPlatforms.split(', ') : ['Instagram'],
      contentFormats: campaignBrief.contentFormats ? campaignBrief.contentFormats.split(', ') : ['4K Stills Suite'],
      createdAt: 'Just now',
      updatedAt: 'Just now',
      shortlistedCreators: matchedCreators.slice(0, 2).map(m => m.creator.id)
    };

    onCompleteBrandOnboarding({ brand: newBrand, campaign: finalCampaign });
  };

  return (
    <div className="brand-onboarding-view">
      <div className="page-container-narrow">
        {/* Step Progress Tracker */}
        <div className="onboarding-tracker-card">
          <div className="tracker-top-bar">
            <div className="tracker-title-group">
              <span className="tracker-phase-tag">Brand Onboarding</span>
              <h2 className="tracker-main-step font-editorial">
                Step {currentStep} of {totalSteps}: {
                  currentStep === 1 ? 'Welcome' :
                  currentStep === 2 ? 'Brand Information' :
                  currentStep === 3 ? 'Campaign Intent' :
                  currentStep === 4 ? 'Campaign Brief' :
                  currentStep === 5 ? 'Creator Discovery Preview' :
                  'Ready to Collaborate'
                }
              </h2>
            </div>

            <div className="tracker-actions">
              <button
                type="button"
                className="btn btn-subtle btn-sm"
                onClick={handleAutoFillDemo}
                title="Fill with Aura Botanica campaign sample"
              >
                <Sparkles size={13} />
                <span>Auto-Fill Sample</span>
              </button>
            </div>
          </div>

          <div className="tracker-progress-track">
            <div 
              className="tracker-progress-fill" 
              style={{ width: `${(currentStep / totalSteps) * 100}%` }} 
            />
          </div>
        </div>

        {/* STEP 1: WELCOME */}
        {currentStep === 1 && (
          <div className="onboarding-step-card">
            <div className="step-welcome-badge">
              <Briefcase size={16} />
              <span>For Brands & Agencies</span>
            </div>
            <h1 className="step-main-headline font-editorial">
              Let's find the right creative partner.
            </h1>
            <p className="step-main-sub">
              Alloy connects visionary brands with AI content creators who genuinely match your aesthetic. 
              In just a few steps, describe your campaign vision and discover verified talent with explainable creative fit.
            </p>

            <div className="welcome-value-grid">
              <div className="welcome-value-card">
                <Compass size={22} className="text-peach-deep" />
                <h4 className="value-card-title">Alloy Brief Intelligence</h4>
                <p className="value-card-desc">Type your idea naturally. We structure it into production-ready specifications without hallucinated budgets.</p>
              </div>
              <div className="welcome-value-card">
                <ShieldCheck size={22} className="text-lavender-deep" />
                <h4 className="value-card-title">Grounded Alloy Match</h4>
                <p className="value-card-desc">Every match recommendation cites verified past projects, eliminating guesswork.</p>
              </div>
              <div className="welcome-value-card">
                <Layers size={22} className="text-mint" />
                <h4 className="value-card-title">Alloy Studio Concepts</h4>
                <p className="value-card-desc">Explore tailored visual storyboards customized for individual creators before sending invitations.</p>
              </div>
            </div>

            <div className="step-footer-actions">
              <button 
                type="button" 
                className="btn btn-primary btn-lg"
                onClick={() => setCurrentStep(2)}
              >
                <span>Get Started</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: BRAND INFORMATION */}
        {currentStep === 2 && (
          <div className="onboarding-step-card">
            <h2 className="step-section-title font-editorial">Tell us about your brand</h2>
            <p className="step-section-desc">This helps creators understand your heritage and aesthetic context.</p>

            <div className="form-group">
              <label className="form-label">Brand or Company Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Aura Botanica, Kinetix Audio, Vanguard"
                value={brandInfo.brandName}
                onChange={(e) => setBrandInfo({ ...brandInfo, brandName: e.target.value })}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Industry *</label>
                <select
                  className="form-select"
                  value={brandInfo.industry}
                  onChange={(e) => setBrandInfo({ ...brandInfo, industry: e.target.value })}
                >
                  {industryOptions.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Website (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://yourbrand.com"
                  value={brandInfo.website}
                  onChange={(e) => setBrandInfo({ ...brandInfo, website: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Brand Ethos & Aesthetic Direction</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Describe your brand's visual identity (e.g. Organic textures, minimal typography, architectural lighting...)"
                value={brandInfo.description}
                onChange={(e) => setBrandInfo({ ...brandInfo, description: e.target.value })}
              />
            </div>

            <div className="step-footer-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setCurrentStep(1)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setCurrentStep(3)}
                disabled={!brandInfo.brandName.trim()}
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CAMPAIGN INTENT */}
        {currentStep === 3 && (
          <div className="onboarding-step-card">
            <h2 className="step-section-title font-editorial">What do you want to accomplish?</h2>
            <p className="step-section-desc">Select your primary campaign objective.</p>

            <div className="intent-selection-grid">
              {intentOptions.map(opt => (
                <div
                  key={opt.id}
                  className={`intent-card ${campaignIntent === opt.id ? 'active' : ''}`}
                  onClick={() => setCampaignIntent(opt.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="intent-radio">
                    {campaignIntent === opt.id ? <Check size={14} className="text-white" /> : null}
                  </div>
                  <div className="intent-text">
                    <h4 className="intent-label">{opt.label}</h4>
                    <p className="intent-desc">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="step-footer-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setCurrentStep(2)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  setCampaignBrief(prev => ({ ...prev, objective: campaignIntent }));
                  setCurrentStep(4);
                }}
              >
                <span>Continue to Brief</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CAMPAIGN BRIEF WITH CREABRIEF AI */}
        {currentStep === 4 && (
          <div className="onboarding-step-card">
            <div className="brief-step-header">
              <div>
                <h2 className="step-section-title font-editorial">Structure your campaign brief</h2>
                <p className="step-section-desc">Describe your campaign idea in natural words, or structure the parameters manually.</p>
              </div>

              {briefSource && (
                <span className={`ai-badge ${briefSource === 'groq' ? 'groq-badge' : 'fallback-badge'}`}>
                  <Sparkles size={12} />
                  <span>{briefSource === 'groq' ? 'Powered by Groq Llama 3.3' : 'Structured by Rule Engine'}</span>
                </span>
              )}
            </div>

            {/* Natural Language Prompt Assistant */}
            <div className="natural-prompt-assistant-box">
              <label className="form-label flex-between">
                <span>Describe your campaign concept naturally:</span>
                <span className="text-micro-hint">Groq will parse creative specs without hallucinating</span>
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="e.g. We need three short-form videos for a sustainable skincare launch. The audience is young adults interested in simple routines. The content should feel natural, warm, and educational with a budget of ₹65,000 in 3 weeks."
                value={naturalPrompt}
                onChange={(e) => setNaturalPrompt(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-subtle btn-sm mt-2"
                onClick={handleAnalyzeWithGroq}
                disabled={isAnalyzingBrief || !naturalPrompt.trim()}
              >
                <Sparkles size={14} className={isAnalyzingBrief ? 'spin-slow' : ''} />
                <span>{isAnalyzingBrief ? 'Analyzing with Groq AI...' : 'Structure with Alloy Brief AI'}</span>
              </button>
            </div>

            <div className="divider-subtle" />

            {/* Structured Parameters */}
            <div className="form-group">
              <label className="form-label">Campaign Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Pure Hydration Summer Series"
                value={campaignBrief.title}
                onChange={(e) => setCampaignBrief({ ...campaignBrief, title: e.target.value })}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Target Audience</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Aesthetic conscious consumers aged 25-45"
                  value={campaignBrief.targetAudience}
                  onChange={(e) => setCampaignBrief({ ...campaignBrief, targetAudience: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Deliverables Suite</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 3x 4K Master Stills, 2x 15s Loops"
                  value={campaignBrief.deliverables}
                  onChange={(e) => setCampaignBrief({ ...campaignBrief, deliverables: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Creative Direction & Visual Mood</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. High-speed macro water droplets, chiaroscuro lighting, tactile glass reflections."
                value={campaignBrief.creativeDirection}
                onChange={(e) => setCampaignBrief({ ...campaignBrief, creativeDirection: e.target.value })}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Budget (INR / ₹)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. ₹80,000"
                  value={campaignBrief.budget || ''}
                  onChange={(e) => setCampaignBrief({ ...campaignBrief, budget: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Timeline / Deadline</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 3 weeks"
                  value={campaignBrief.deadline || ''}
                  onChange={(e) => setCampaignBrief({ ...campaignBrief, deadline: e.target.value })}
                />
              </div>
            </div>

            <div className="step-footer-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setCurrentStep(3)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setCurrentStep(5)}
                disabled={!campaignBrief.title.trim()}
              >
                <span>Find Matching Creators</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: CREATOR DISCOVERY PREVIEW */}
        {currentStep === 5 && (
          <div className="onboarding-step-card">
            <div className="discovery-preview-header">
              <div className="section-pill-tag">
                <span className="pill-dot-sm" />
                <span>CreaMatch Intelligence Active</span>
              </div>
              <h2 className="step-section-title font-editorial">Top Matching Creators for Your Campaign</h2>
              <p className="step-section-desc">
                Based on your brief “{campaignBrief.title}”, here are creators with verified portfolio evidence matching your aesthetic.
              </p>
            </div>

            <div className="matched-talent-preview-list">
              {matchedCreators.map(({ creator, match, explanation }) => (
                <div key={creator.id} className="matched-talent-row-card">
                  <img src={creator.avatar} alt={creator.name} className="matched-avatar" />
                  
                  <div className="matched-talent-info">
                    <div className="matched-talent-top">
                      <h4 className="matched-name">{creator.name}</h4>
                      <span className="matched-score-badge">{match.score}% CreaMatch</span>
                    </div>
                    <span className="matched-role">{creator.creativeIdentity || creator.specialty}</span>
                    <p className="matched-rationale">{explanation.summary}</p>
                    
                    <div className="matched-evidence-tags">
                      <span className="evidence-chip">✓ Verified Project: {explanation.relevantProjects?.[0]?.title || creator.projects?.[0]?.title}</span>
                      <span className="evidence-chip">✓ {creator.turnaround}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="step-footer-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setCurrentStep(4)}
              >
                <ArrowLeft size={16} />
                <span>Back to Brief</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setCurrentStep(6)}
              >
                <span>Review & Enter Brand Studio</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: BRAND HOME / COMPLETION */}
        {currentStep === 6 && (
          <div className="onboarding-step-card text-center">
            <div className="success-icon-ring">
              <CheckCircle2 size={36} className="text-mint" />
            </div>
            <h1 className="step-main-headline font-editorial">
              Your campaign is ready to launch.
            </h1>
            <p className="step-main-sub">
              We’ve created your active campaign “<strong>{campaignBrief.title}</strong>” in Brand Studio with {matchedCreators.length} top-matched creators shortlisted and ready for direct collaboration.
            </p>

            <div className="launch-summary-card">
              <div className="summary-row">
                <span className="summary-label">Campaign:</span>
                <span className="summary-val">{campaignBrief.title}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Brand:</span>
                <span className="summary-val">{brandInfo.brandName}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Deliverables:</span>
                <span className="summary-val">{campaignBrief.deliverables}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Budget & Timeline:</span>
                <span className="summary-val">{campaignBrief.budget || 'Flexible'} • {campaignBrief.deadline || 'Standard'}</span>
              </div>
            </div>

            <div className="step-footer-actions justify-center">
              <button 
                type="button" 
                className="btn btn-primary btn-lg"
                onClick={handleComplete}
                id="enter-brand-studio-complete-btn"
              >
                <span>Enter Brand Studio</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
