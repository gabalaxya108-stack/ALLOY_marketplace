import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Check, Sparkles, Plus, Trash2, 
  Eye, Globe, ExternalLink, Image as ImageIcon, Dna, 
  CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, Layers, Sliders 
} from 'lucide-react';
import { generateCreatorDNA as groqGenerateCreatorDNA } from '../ai/groqClient';
import {
  loadCreatorOnboardingDraft,
  saveCreatorOnboardingDraft,
  clearCreatorOnboardingDraft,
  buildPublishedCreatorProfile
} from '../data/marketplaceStore';

const TOTAL_ONBOARDING_STEPS = 8;

const createDefaultProfileData = () => ({
  name: '',
  handle: '',
  creativeIdentity: '',
  location: 'London / New York',
  bio: '',
  experience: '3+ years AI-native cinema',
  turnaround: '48h concept boards',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  disciplines: ['AI Fashion', 'AI Photography', 'AI Product Visuals'],
  styles: ['Editorial', 'Cinematic', 'Luxury', 'Minimal'],
  tools: [],
  industries: [],
  availability: 'Available for projects',
  socials: {
    instagram: '',
    tiktok: '',
    youtube: '',
    portfolioUrl: ''
  },
  portfolio: [
    {
      id: 'work-1',
      title: 'Aura Privée — Neoclassical Silk & Light',
      category: 'Fashion & Editorial',
      aspect: 'portrait',
      format: '4K Stills Suite',
      image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85',
      description: 'Synthetic haute couture campaign exploring luminous chiffon, micro-pleating, and chiaroscuro studio lighting.',
      role: 'Creative Director & AI Artist'
    },
    {
      id: 'work-2',
      title: 'Chronos Titanium — Kinetic Micro-Machining',
      category: 'Product Advertising',
      aspect: 'landscape',
      format: '3D CGI Motion Reel',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85',
      description: 'Ultra-crisp macro close-ups of brushed titanium watch gears floating in magnetic zero-gravity suspension.',
      role: '3D Spatial Technologist'
    }
  ]
});

/**
 * Builds onboarding form state from a stored draft.
 * Falls back to defaults for any missing or malformed field.
 */
const buildInitialProfileData = (draftProfileData) => {
  const defaults = createDefaultProfileData();
  if (!draftProfileData || typeof draftProfileData !== 'object' || Array.isArray(draftProfileData)) {
    return defaults;
  }
  const asString = (value, fallback) => (typeof value === 'string' ? value : fallback);
  const asStringArray = (value, fallback) => (
    Array.isArray(value) && value.every(item => typeof item === 'string') ? value : fallback
  );
  const socials = (draftProfileData.socials && typeof draftProfileData.socials === 'object' && !Array.isArray(draftProfileData.socials))
    ? draftProfileData.socials
    : {};
  const portfolio = Array.isArray(draftProfileData.portfolio)
    ? draftProfileData.portfolio
        .filter(item => item && typeof item === 'object' && typeof item.image === 'string' && item.image.trim())
        .map((item, index) => ({
          id: asString(item.id, `work-${index + 1}`),
          title: asString(item.title, 'Untitled Work'),
          category: asString(item.category, 'Product Visuals'),
          aspect: asString(item.aspect, 'portrait'),
          format: asString(item.format, '4K Stills Suite'),
          image: item.image,
          description: asString(item.description, ''),
          role: asString(item.role, 'Lead AI Creator')
        }))
    : null;
  return {
    ...defaults,
    name: asString(draftProfileData.name, defaults.name),
    handle: asString(draftProfileData.handle, defaults.handle),
    creativeIdentity: asString(draftProfileData.creativeIdentity, defaults.creativeIdentity),
    location: asString(draftProfileData.location, defaults.location),
    bio: asString(draftProfileData.bio, defaults.bio),
    experience: asString(draftProfileData.experience, defaults.experience),
    turnaround: asString(draftProfileData.turnaround, defaults.turnaround),
    avatar: asString(draftProfileData.avatar, defaults.avatar),
    availability: asString(draftProfileData.availability, defaults.availability),
    disciplines: asStringArray(draftProfileData.disciplines, defaults.disciplines),
    styles: asStringArray(draftProfileData.styles, defaults.styles),
    tools: asStringArray(draftProfileData.tools, defaults.tools || []),
    industries: asStringArray(draftProfileData.industries, defaults.industries || []),
    socials: {
      instagram: asString(socials.instagram, defaults.socials.instagram),
      tiktok: asString(socials.tiktok, defaults.socials.tiktok),
      youtube: asString(socials.youtube, defaults.socials.youtube),
      portfolioUrl: asString(socials.portfolioUrl, defaults.socials.portfolioUrl)
    },
    portfolio: portfolio || defaults.portfolio
  };
};

/**
 * Clamps a resumed step so a draft can never bypass the existing validation gates.
 */
const resolveResumeStep = (step, data) => {
  let resolved = Number.isFinite(step) ? Math.min(TOTAL_ONBOARDING_STEPS, Math.max(1, Math.round(step))) : 1;
  if (resolved >= 5 && data.portfolio.length < 2) resolved = 4;
  if (resolved >= 4 && data.disciplines.length === 0) resolved = 3;
  if (resolved >= 3 && !data.name.trim()) resolved = 2;
  return resolved;
};

export default function CreatorOnboardingView({ onPublishCreator, onExploreMarketplace }) {
  // Restore an unfinished onboarding draft once (local-only scratch data; never credentials)
  const [resumeState] = useState(() => {
    const draft = loadCreatorOnboardingDraft();
    const restoredData = buildInitialProfileData(draft?.profileData);
    return {
      profileData: restoredData,
      currentStep: resolveResumeStep(draft?.currentStep, restoredData),
      dnaResult: draft?.dnaResult || null
    };
  });
  const [currentStep, setCurrentStep] = useState(resumeState.currentStep);
  const totalSteps = TOTAL_ONBOARDING_STEPS;

  // Form State (initialized from the restored draft when resuming)
  const [profileData, setProfileData] = useState(resumeState.profileData);

  // Step 4: New portfolio item buffer
  const [newProject, setNewProject] = useState({
    title: '',
    category: 'Product Visuals',
    format: '4K Stills Suite',
    aspect: 'portrait',
    image: '',
    description: '',
    role: 'Lead AI Creator'
  });
  const [showAddProject, setShowAddProject] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState('');

  // Step 6: Creative DNA generation state (restored DNA resumes with the draft)
  const [dnaResult, setDnaResult] = useState(resumeState.dnaResult);
  const [isGeneratingDNA, setIsGeneratingDNA] = useState(false);

  // Persist unfinished onboarding progress locally so it can be resumed after leaving or reloading.
  // Cleared after successful publication; never stores credentials or tokens.
  useEffect(() => {
    const isPristine = currentStep === 1
      && !dnaResult
      && JSON.stringify(profileData) === JSON.stringify(createDefaultProfileData());
    if (isPristine) {
      clearCreatorOnboardingDraft();
      return;
    }
    saveCreatorOnboardingDraft({ currentStep, profileData, dnaResult });
  }, [currentStep, profileData, dnaResult]);

  // Available Specialties
  const disciplineOptions = [
    'UGC',
    'AI Fashion',
    'AI Beauty',
    'AI Product Visuals',
    '3D CGI',
    'Video Editing',
    'Animation & Motion',
    'Food & Beverage',
    'Travel & Hospitality',
    'Consumer Technology',
    'Editorial Storytelling'
  ];

  // Available Styles
  const styleOptions = [
    'Cinematic',
    'Editorial',
    'Minimal',
    'Surreal',
    'Luxury',
    'Photorealistic',
    'Playful',
    'Atmospheric'
  ];

  const toggleDiscipline = (item) => {
    setProfileData(prev => ({
      ...prev,
      disciplines: prev.disciplines.includes(item)
        ? prev.disciplines.filter(d => d !== item)
        : [...prev.disciplines, item]
    }));
  };

  const toggleStyle = (item) => {
    setProfileData(prev => ({
      ...prev,
      styles: prev.styles.includes(item)
        ? prev.styles.filter(s => s !== item)
        : [...prev.styles, item]
    }));
  };

  // Demo Auto-fill
  const handleAutoFillDemo = () => {
    setProfileData({
      name: 'Julian Vance',
      handle: '@julianvance.ai',
      creativeIdentity: 'AI Fashion & Cinematic Narrative Director',
      location: 'Paris / London (CET)',
      bio: 'Directing AI visual campaigns at the intersection of haute couture and speculative cinema. Sculpting impossible textures, light choreographies, and editorial moodboards.',
      experience: '3.5 years AI-native cinema',
      turnaround: '48h concept boards',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      disciplines: ['AI Fashion', 'AI Product Visuals', '3D CGI', 'Editorial Storytelling'],
      styles: ['Editorial', 'Cinematic', 'Luxury', 'Minimal'],
      tools: ['Midjourney v6.1', 'Runway Gen-3', 'ComfyUI', 'Photoshop'],
      industries: ['Luxury Fashion', 'Editorial', 'Product Advertising'],
      availability: 'Available for projects',
      socials: {
        instagram: 'https://instagram.com/julianvance.ai',
        tiktok: 'https://tiktok.com/@julianvance',
        youtube: 'https://youtube.com/@julianvance',
        portfolioUrl: 'https://julianvance.design'
      },
      portfolio: [
        {
          id: 'demo-1',
          title: 'Aura Privée — Neoclassical Silk & Light',
          category: 'Fashion & Editorial',
          aspect: 'portrait',
          format: '4K Stills Suite',
          image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85',
          description: 'A 16-piece synthetic editorial collection capturing flowing raw silk, dramatic architectural lighting, and bespoke jewelry.',
          role: 'Creative Director & AI Artist'
        },
        {
          id: 'demo-2',
          title: 'Chronos Titanium — Kinetic Micro-Machining',
          category: 'Product Advertising',
          aspect: 'landscape',
          format: '3D CGI Motion Reel',
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85',
          description: 'Ultra-crisp macro close-ups of brushed titanium watch gears floating in magnetic zero-gravity suspension.',
          role: '3D Spatial Technologist'
        },
        {
          id: 'demo-3',
          title: 'Sanctuary of the Red Dune',
          category: 'Surreal Architecture',
          aspect: 'landscape',
          format: 'Atmospheric Video Loop',
          image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85',
          description: 'A rammed-earth luxury villa nestled inside a crimson canyon with reflecting pools.',
          role: 'AI Architectural Worldbuilder'
        }
      ]
    });
  };

  // Add Portfolio Item
  const handleAddProject = () => {
    if (!newProject.title.trim() || !newProject.image.trim()) {
      setUploadFeedback('Please provide both a project title and an image URL.');
      return;
    }
    const created = {
      id: `proj-${Date.now()}`,
      ...newProject
    };
    setProfileData(prev => ({
      ...prev,
      portfolio: [created, ...prev.portfolio]
    }));
    setNewProject({
      title: '',
      category: 'Product Visuals',
      format: '4K Stills Suite',
      aspect: 'portrait',
      image: '',
      description: '',
      role: 'Lead AI Creator'
    });
    setShowAddProject(false);
    setUploadFeedback('✓ Project added successfully to your portfolio.');
    setTimeout(() => setUploadFeedback(''), 4000);
  };

  const handleRemoveProject = (id) => {
    setProfileData(prev => ({
      ...prev,
      portfolio: prev.portfolio.filter(p => p.id !== id)
    }));
  };

  // Generate Creator DNA with Groq in Step 6
  const handleGenerateDNA = async () => {
    setIsGeneratingDNA(true);
    try {
      const creatorPayload = {
        name: profileData.name || 'Creative Artist',
        specialty: profileData.disciplines[0] || 'AI Visual Direction',
        bio: profileData.bio,
        styles: profileData.styles,
        projects: profileData.portfolio,
        tools: (Array.isArray(profileData.tools) && profileData.tools.length > 0)
          ? profileData.tools
          : undefined
      };
      const dna = await groqGenerateCreatorDNA(creatorPayload);
      setDnaResult(dna);
    } catch (err) {
      console.warn('DNA generation failed, using structured fallback:', err);
    } finally {
      setIsGeneratingDNA(false);
    }
  };

  // Publish Creator Profile
  const handlePublish = () => {
    const finalCreator = buildPublishedCreatorProfile(profileData, dnaResult);

    // Draft is finalized once the creator profile is published
    clearCreatorOnboardingDraft();
    onPublishCreator(finalCreator);
  };

  return (
    <div className="creator-onboarding-view">
      <div className="page-container-narrow">
        {/* Step Progress Tracker */}
        <div className="onboarding-tracker-card">
          <div className="tracker-top-bar">
            <div className="tracker-title-group">
              <span className="tracker-phase-tag">Creator Onboarding</span>
              <h2 className="tracker-main-step font-editorial">
                Step {currentStep} of {totalSteps}: {
                  currentStep === 1 ? 'Welcome' :
                  currentStep === 2 ? 'Creator Identity' :
                  currentStep === 3 ? 'Creative Specialties' :
                  currentStep === 4 ? 'Portfolio Showcase' :
                  currentStep === 5 ? 'Social Platforms' :
                  currentStep === 6 ? 'Creative DNA Synthesis' :
                  currentStep === 7 ? 'Profile Preview' :
                  'Creator Home'
                }
              </h2>
            </div>

            <div className="tracker-actions">
              <button
                type="button"
                className="btn btn-subtle btn-sm"
                onClick={handleAutoFillDemo}
                title="Fill with Julian Vance demo profile"
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
            <div className="step-welcome-badge creator-welcome-badge">
              <Sparkles size={16} />
              <span>For AI Content Creators</span>
            </div>
            <h1 className="step-main-headline font-editorial">
              Let's build your creative identity.
            </h1>
            <p className="step-main-sub">
              Alloy is where exceptional AI creators connect with brands commissioning high-value campaigns. 
              In 7 simple steps, create an evidence-grounded profile showcasing your verified work, unlock your Creator DNA, and start receiving direct invitations.
            </p>

            <div className="welcome-value-grid">
              <div className="welcome-value-card">
                <Dna size={22} className="text-lavender-deep" />
                <h4 className="value-card-title">Evidence-Backed DNA</h4>
                <p className="value-card-desc">Your profile categorizes capabilities by Creator-Provided, Portfolio-Supported, and AI-Inferred provenance.</p>
              </div>
              <div className="welcome-value-card">
                <ShieldCheck size={22} className="text-peach-deep" />
                <h4 className="value-card-title">Direct Invitations</h4>
                <p className="value-card-desc">No unpaid spec pitches. Brands discover you based on creative alignment and send funded briefs.</p>
              </div>
              <div className="welcome-value-card">
                <Layers size={22} className="text-mint" />
                <h4 className="value-card-title">Seamless Delivery</h4>
                <p className="value-card-desc">Manage review rounds, revision feedback, and milestone payments all in your Creator Studio.</p>
              </div>
            </div>

            <div className="step-footer-actions">
              <button 
                type="button" 
                className="btn btn-primary btn-lg"
                onClick={() => setCurrentStep(2)}
              >
                <span>Begin Profile Setup</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CREATOR IDENTITY */}
        {currentStep === 2 && (
          <div className="onboarding-step-card">
            <h2 className="step-section-title font-editorial">Your Creative Identity</h2>
            <p className="step-section-desc">How you will appear to creative directors and brands.</p>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Display Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Julian Vance"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Handle *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="@yourhandle.ai"
                  value={profileData.handle}
                  onChange={(e) => setProfileData({ ...profileData, handle: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Creative Headline / Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. AI Fashion & Cinematic Narrative Director"
                value={profileData.creativeIdentity}
                onChange={(e) => setProfileData({ ...profileData, creativeIdentity: e.target.value })}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Location / Timezone</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Paris / London (CET)"
                  value={profileData.location}
                  onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Avatar Image URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={profileData.avatar}
                  onChange={(e) => setProfileData({ ...profileData, avatar: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Bio & Artistic Philosophy</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Describe your creative approach, lighting preferences, and generative workflows..."
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
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
                disabled={!profileData.name.trim()}
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CREATIVE SPECIALTIES */}
        {currentStep === 3 && (
          <div className="onboarding-step-card">
            <h2 className="step-section-title font-editorial">Creative Specialties & Visual Styles</h2>
            <p className="step-section-desc">Select the disciplines and aesthetics that best characterize your portfolio.</p>

            <div className="specialties-group">
              <label className="form-label">Primary Creative Disciplines (Select at least 2)</label>
              <div className="pills-selection-grid">
                {disciplineOptions.map(item => (
                  <button
                    key={item}
                    type="button"
                    className={`pill-choice-btn ${profileData.disciplines.includes(item) ? 'active' : ''}`}
                    onClick={() => toggleDiscipline(item)}
                  >
                    {profileData.disciplines.includes(item) && <Check size={13} />}
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="specialties-group mt-4">
              <label className="form-label">Artistic Styles & Aesthetics</label>
              <div className="pills-selection-grid">
                {styleOptions.map(item => (
                  <button
                    key={item}
                    type="button"
                    className={`pill-choice-btn ${profileData.styles.includes(item) ? 'active' : ''}`}
                    onClick={() => toggleStyle(item)}
                  >
                    {profileData.styles.includes(item) && <Check size={13} />}
                    <span>{item}</span>
                  </button>
                ))}
              </div>
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
                onClick={() => setCurrentStep(4)}
                disabled={profileData.disciplines.length === 0}
              >
                <span>Continue to Portfolio</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: PORTFOLIO SHOWCASE */}
        {currentStep === 4 && (
          <div className="onboarding-step-card">
            <div className="portfolio-step-header">
              <div>
                <h2 className="step-section-title font-editorial">Showcase Your Strongest Work</h2>
                <p className="step-section-desc">Every recommendation is backed by portfolio evidence. Add at least 2 high-res works.</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddProject(!showAddProject)}
              >
                <Plus size={14} />
                <span>Add Project</span>
              </button>
            </div>

            {uploadFeedback && (
              <div className="upload-feedback-toast">
                <span>{uploadFeedback}</span>
              </div>
            )}

            {/* Add Project Form Drawer */}
            {showAddProject && (
              <div className="add-project-drawer">
                <h4 className="drawer-title font-editorial">Add New Portfolio Work</h4>
                
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Project Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Lumina Silk & Light Capsule"
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Fashion & Editorial, Product CGI"
                      value={newProject.category}
                      onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">Image or Video Poster URL *</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://images.unsplash.com/..."
                      value={newProject.image}
                      onChange={(e) => setNewProject({ ...newProject, image: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Format / Deliverable</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 4K Stills Suite, 9:16 Kinetic Loop"
                      value={newProject.format}
                      onChange={(e) => setNewProject({ ...newProject, format: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Project Description</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Technical techniques used (e.g. caustic refractions, micro-pleating, 35mm grain)..."
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  />
                </div>

                <div className="drawer-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowAddProject(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleAddProject}
                  >
                    Save to Portfolio
                  </button>
                </div>
              </div>
            )}

            {/* Current Portfolio List */}
            <div className="portfolio-items-grid">
              {profileData.portfolio.map((proj) => (
                <div key={proj.id} className="portfolio-item-card">
                  <img src={proj.image} alt={proj.title} className="portfolio-card-thumb" />
                  <div className="portfolio-card-body">
                    <div className="portfolio-card-header">
                      <h4 className="portfolio-card-title">{proj.title}</h4>
                      <button
                        type="button"
                        className="btn-icon-subtle text-danger"
                        onClick={() => handleRemoveProject(proj.id)}
                        title="Remove project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <span className="portfolio-card-cat">{proj.category} • {proj.format || '4K Asset'}</span>
                    <p className="portfolio-card-desc">{proj.description}</p>
                  </div>
                </div>
              ))}
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
                disabled={profileData.portfolio.length < 2}
              >
                <span>Continue to Social Links</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SOCIAL PLATFORMS */}
        {currentStep === 5 && (
          <div className="onboarding-step-card">
            <h2 className="step-section-title font-editorial">Social Platforms & Verification Links</h2>
            <p className="step-section-desc">Add your public channels so brands can explore your extended social presence.</p>

            <div className="form-group">
              <label className="form-label">Instagram Profile URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://instagram.com/yourhandle"
                value={profileData.socials.instagram}
                onChange={(e) => setProfileData({
                  ...profileData,
                  socials: { ...profileData.socials, instagram: e.target.value }
                })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">TikTok Profile URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://tiktok.com/@yourhandle"
                value={profileData.socials.tiktok}
                onChange={(e) => setProfileData({
                  ...profileData,
                  socials: { ...profileData.socials, tiktok: e.target.value }
                })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">YouTube / Vimeo Showreel URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://youtube.com/@yourchannel or Vimeo"
                value={profileData.socials.youtube}
                onChange={(e) => setProfileData({
                  ...profileData,
                  socials: { ...profileData.socials, youtube: e.target.value }
                })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">External Portfolio / Website</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://yourportfolio.design"
                value={profileData.socials.portfolioUrl}
                onChange={(e) => setProfileData({
                  ...profileData,
                  socials: { ...profileData.socials, portfolioUrl: e.target.value }
                })}
              />
            </div>

            <div className="step-footer-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setCurrentStep(4)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => {
                  setCurrentStep(6);
                  handleGenerateDNA();
                }}
              >
                <span>Synthesize Creator DNA</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: CREATIVE DNA SYNTHESIS (WITH GROQ) */}
        {currentStep === 6 && (
          <div className="onboarding-step-card">
            <div className="dna-step-header">
              <div className="section-pill-tag">
                <span className="pill-dot-sm" />
                <span>Evidence-Grounded Creator DNA</span>
              </div>
              <h2 className="step-section-title font-editorial">Your Creator DNA Dossier</h2>
              <p className="step-section-desc">
                Alloy evaluates your profile and verified portfolio using AI to extract grounded attributes categorized into three provenance tiers.
              </p>
            </div>

            {isGeneratingDNA ? (
              <div className="dna-loading-state">
                <RefreshCw size={28} className="spin-slow text-lavender-deep" />
                <p className="loading-text font-editorial">Synthesizing Creator DNA with Groq AI...</p>
                <span className="loading-sub">Analyzing portfolio evidence against commercial taxonomy</span>
              </div>
            ) : (
              <div className="dna-dossier-card">
                {/* Provenance Legend */}
                <div className="provenance-legend">
                  <span className="legend-tag prov-creator">1. Creator-Provided</span>
                  <span className="legend-tag prov-portfolio">2. Portfolio-Supported</span>
                  <span className="legend-tag prov-inferred">3. AI-Inferred</span>
                </div>

                {/* Verification Status */}
                <div className="dna-verification-box">
                  <ShieldCheck size={16} className="text-mint" />
                  <span>{dnaResult?.completeness?.message || 'Portfolio-Verified Creator: Evidence grounded in 2+ commercial works.'}</span>
                </div>

                {/* Styles and Specialties */}
                <div className="dna-attributes-grid">
                  <div className="dna-attr-col">
                    <span className="attr-label">Creative Styles:</span>
                    <div className="attr-chips-list">
                      {(dnaResult?.creativeStyles || [
                        { style: 'Editorial Haute Couture', provenance: 'Portfolio-supported' },
                        { style: 'Kinetic 3D Hardware', provenance: 'Portfolio-supported' },
                        { style: 'Cold Studio Chiaroscuro', provenance: 'AI-inferred' }
                      ]).map((item, idx) => (
                        <div key={idx} className="attr-chip-row">
                          <span className="chip-name">{item.style}</span>
                          <span className={`chip-badge ${item.provenance === 'Creator-provided' ? 'prov-creator' : item.provenance === 'Portfolio-supported' ? 'prov-portfolio' : 'prov-inferred'}`}>
                            {item.provenance}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="dna-attr-col">
                    <span className="attr-label">Demonstrated Strengths:</span>
                    <div className="attr-chips-list">
                      {(dnaResult?.demonstratedStrengths || [
                        { strength: 'Micro-Machining Animation', provenance: 'Portfolio-supported' },
                        { strength: 'Chiffon & Fabric Dynamics', provenance: 'Portfolio-supported' },
                        { strength: 'Commercial Lighting', provenance: 'AI-inferred' }
                      ]).map((item, idx) => (
                        <div key={idx} className="attr-chip-row">
                          <span className="chip-name">{item.strength}</span>
                          <span className={`chip-badge ${item.provenance === 'Creator-provided' ? 'prov-creator' : item.provenance === 'Portfolio-supported' ? 'prov-portfolio' : 'prov-inferred'}`}>
                            {item.provenance}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dna-re-analyze-action">
                  <button
                    type="button"
                    className="btn btn-subtle btn-sm"
                    onClick={handleGenerateDNA}
                    disabled={isGeneratingDNA}
                  >
                    <RefreshCw size={12} />
                    <span>Regenerate DNA Insights</span>
                  </button>
                </div>
              </div>
            )}

            <div className="step-footer-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setCurrentStep(5)}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setCurrentStep(7)}
              >
                <span>Preview Public Profile</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: PROFILE PREVIEW */}
        {currentStep === 7 && (
          <div className="onboarding-step-card">
            <div className="preview-step-header">
              <div>
                <h2 className="step-section-title font-editorial">Public Profile Preview</h2>
                <p className="step-section-desc">Here is how your profile and portfolio will be presented to brands and agencies.</p>
              </div>
              <span className="status-badge-chip">
                <Eye size={13} />
                <span>Live Marketplace Preview</span>
              </span>
            </div>

            {/* Profile Mockup Frame */}
            <div className="public-profile-mock-frame">
              <div className="mock-cover-area">
                <img src={profileData.portfolio[0]?.image} alt="Hero Work" className="mock-cover-img" />
              </div>

              <div className="mock-profile-header">
                <img src={profileData.avatar} alt={profileData.name} className="mock-avatar-img" />
                <div className="mock-info-group">
                  <h3 className="mock-display-name">{profileData.name || 'Creative Artist'}</h3>
                  <span className="mock-handle-line">{profileData.handle} • {profileData.location}</span>
                  <p className="mock-tagline font-editorial">{profileData.creativeIdentity}</p>
                </div>
                <div className="mock-availability-chip">
                  <CheckCircle2 size={13} className="text-mint" />
                  <span>{profileData.availability}</span>
                </div>
              </div>

              <div className="mock-bio-box">
                <p>{profileData.bio}</p>
              </div>

              <div className="mock-disciplines-row">
                {profileData.disciplines.map(d => (
                  <span key={d} className="mock-disc-pill">{d}</span>
                ))}
              </div>

              <div className="mock-portfolio-preview-grid">
                {profileData.portfolio.slice(0, 3).map(p => (
                  <div key={p.id} className="mock-thumb-box">
                    <img src={p.image} alt={p.title} />
                    <span className="mock-thumb-title">{p.title}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="step-footer-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setCurrentStep(6)}
              >
                <ArrowLeft size={16} />
                <span>Back to DNA</span>
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => setCurrentStep(8)}
              >
                <span>Save & Activate Profile</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 8: CREATOR HOME / COMPLETION */}
        {currentStep === 8 && (
          <div className="onboarding-step-card text-center">
            <div className="success-icon-ring">
              <CheckCircle2 size={36} className="text-mint" />
            </div>
            <h1 className="step-main-headline font-editorial">
              Welcome to Alloy Studio.
            </h1>
            <p className="step-main-sub">
              Your profile is now live. Creative agencies and brands searching for {profileData.disciplines[0] || 'AI content'} can discover your verified portfolio and send direct campaign invitations.
            </p>

            <div className="launch-summary-card">
              <div className="summary-row">
                <span className="summary-label">Creator:</span>
                <span className="summary-val">{profileData.name} ({profileData.handle})</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Specialty:</span>
                <span className="summary-val">{profileData.creativeIdentity}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Portfolio Items:</span>
                <span className="summary-val">{profileData.portfolio.length} Commercial Works Verified</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Creator DNA:</span>
                <span className="summary-val">Tier 1: Portfolio-Supported Grounding</span>
              </div>
            </div>

            <div className="step-footer-actions justify-center">
              <button 
                type="button" 
                className="btn btn-primary btn-lg"
                onClick={handlePublish}
                id="enter-creator-studio-complete-btn"
              >
                <span>Enter Creator Studio</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
