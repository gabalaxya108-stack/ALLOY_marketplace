// src/components/AlloyAIAssistant.jsx
// ALLOY — Roadmap-Based Intelligent Response System & Sculptural Core Identity
// Features:
// 1. Genuine Groq-powered real-time streaming inference via Server-Sent Events (/api/ai/chat/stream)
// 2. Structured, Actionable Roadmap Parser & Interactive Timeline Component:
//    - Clear Goal & Starting Point
//    - Sequential numbered steps with vertical connected timeline
//    - What to do, Why it matters, Interactive Action Checklists, Expected Outcomes, and Alloy Feature links
//    - Step status indicators: Not started, In progress, Completed, Blocked
//    - Expand / Collapse steps, Ask follow-up about individual step, Copy / Export roadmap
// 3. Fallback to direct concise markdown for simple factual questions (no forced roadmaps)
// 4. Role-aware roadmaps (Creator profile/bids/eligibility vs Brand campaign/CreaMatch/CreaSim/escrow)
// 5. Multi-stage processing animation with official Alloy Core sculptural symbol:
//    - Understanding -> Building your roadmap -> Streaming tokens -> Completed

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  ArrowRight, 
  Copy, 
  Check, 
  RotateCcw, 
  Square, 
  AlertCircle, 
  ShieldCheck, 
  Compass, 
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  MessageSquare,
  ListChecks,
  FileText,
  Share2
} from 'lucide-react';
import './AlloyAIAssistant.css';

// Role-Aware Quick Suggestion Starters
const CREATOR_ROADMAP_SUGGESTIONS = [
  { label: '🗺️ Profile & Bidding Roadmap', query: 'Create an actionable roadmap to set up my creator profile, complete portfolio verification, and prepare competitive bids on Alloy.' },
  { label: '🎯 Campaign Eligibility Roadmap', query: 'Create a roadmap for understanding campaign eligibility and passing the 7-stage filter.' },
  { label: '✨ Improve CreaMatch Score', query: 'What steps should I take to improve my CreaMatch score across Style Fit, Tool Proficiency, and Historical Reliability?' },
  { label: '📜 Commercial Licensing & Escrow', query: 'Create a roadmap for understanding Alloy commercial licensing terms, copyright clarity, and milestone escrow payouts.' }
];

const BRAND_ROADMAP_SUGGESTIONS = [
  { label: '🗺️ Campaign Launch Roadmap', query: 'Create an actionable roadmap to define campaign deliverables, set budget boundaries, and discover creators on Alloy.' },
  { label: '📊 7-Stage Filter & CreaMatch', query: 'Create a roadmap for evaluating creator candidates through the 7-stage filter and CreaMatch composite scores.' },
  { label: '🎬 Concept Simulation with CreaSim', query: 'How can I use CreaSim concept simulation to explore visual directions before contract commitment?' },
  { label: '🛡️ Trust Orbit & Escrow Roadmap', query: 'Create a roadmap for setting up milestone escrow and verifying creator portfolio provenance.' }
];

export default function AlloyAIAssistant({
  onNavigate,
  onOpenCreatorProfile,
  currentUser = null,
  activeCampaign = null,
  marketplaceData = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'alloy-ai',
      text: `### Goal: Get Started with Alloy AI

#### Starting Point
Welcome to Alloy. Follow these simple steps to explore verified creators, set up your brief, and get started.

#### Roadmap
1. **Browse Verified Creators**
   - **What to do:** Look through verified creators who specialize in AI video, 3D art, and editorial photography.
   - **Alloy Feature:** Discover Creators

2. **Set Up Your Brief or Profile**
   - **What to do:** Define your project requirements, deliverables, and timeline boundaries.
   - **Alloy Feature:** Brand Workspace

3. **Verify Trust & Escrow**
   - **What to do:** Review cryptographic provenance and secure milestone protection.
   - **Alloy Feature:** Trust Center

#### Next Action
Click one of the suggested prompts or ask any question to get started.`,
      timestamp: 'Active Now',
      actions: [
        { label: 'Explore Directory', view: 'discover' },
        { label: 'Trust Center', view: 'trust-center' }
      ]
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [activeStage, setActiveStage] = useState('idle'); // 'idle' | 'understanding' | 'processing' | 'generating' | 'completed' | 'error'
  const [activeStatusText, setActiveStatusText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [lastErrorPrompt, setLastErrorPrompt] = useState(null);

  // In-session interactive state for roadmaps (step expansion)
  const [roadmapInteractions, setRoadmapInteractions] = useState({});

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Resolve active role
  const userRole = useMemo(() => {
    if (currentUser?.profile?.role) return currentUser.profile.role;
    if (currentUser?.role) return currentUser.role;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('creasync_active_role');
      if (stored === 'brand' || stored === 'creator') return stored;
    }
    return 'brand';
  }, [currentUser]);

  const activeSuggestions = useMemo(() => {
    return userRole === 'creator' ? CREATOR_ROADMAP_SUGGESTIONS : BRAND_ROADMAP_SUGGESTIONS;
  }, [userRole]);

  // Build active workspace context for Groq
  const contextPayload = useMemo(() => {
    const ctx = {
      userRole,
      userName: currentUser?.profile?.display_name || currentUser?.display_name || 'Studio Member',
      isDemo: currentUser?.isDemoOnly || false
    };

    if (activeCampaign) {
      ctx.activeCampaign = {
        id: activeCampaign.id,
        title: activeCampaign.title,
        industry: activeCampaign.industry,
        budget: activeCampaign.budget,
        deadline: activeCampaign.deadline,
        deliverables: activeCampaign.deliverables,
        status: activeCampaign.status
      };
    }

    if (marketplaceData?.creators) {
      ctx.sampleFeaturedCreators = marketplaceData.creators.slice(0, 4).map(c => ({
        id: c.id,
        name: c.name,
        specialty: c.specialty,
        tools: c.tools || []
      }));
    }

    return ctx;
  }, [userRole, currentUser, activeCampaign, marketplaceData]);

  // Auto-scroll chat history during stream
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeStage, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen]);

  // Clean up abort controller on unmount or close
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsOpen(false);
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // ---------------------------------------------------------------------------
  // Interactive Roadmap Handlers
  // ---------------------------------------------------------------------------
  const handleToggleStepExpand = (msgId, stepNumber) => {
    setRoadmapInteractions(prev => {
      const currentMsgState = prev[msgId] || { expandedSteps: {}, stepStatus: {}, checkedItems: {} };
      const currentExpanded = currentMsgState.expandedSteps?.[stepNumber] ?? true;
      return {
        ...prev,
        [msgId]: {
          ...currentMsgState,
          expandedSteps: {
            ...currentMsgState.expandedSteps,
            [stepNumber]: !currentExpanded
          }
        }
      };
    });
  };

  const handleToggleAllExpand = (msgId, shouldExpand, steps) => {
    setRoadmapInteractions(prev => {
      const currentMsgState = prev[msgId] || { expandedSteps: {}, stepStatus: {}, checkedItems: {} };
      const updatedExpanded = {};
      steps.forEach(s => {
        updatedExpanded[s.number] = shouldExpand;
      });
      return {
        ...prev,
        [msgId]: {
          ...currentMsgState,
          allExpanded: shouldExpand,
          expandedSteps: updatedExpanded
        }
      };
    });
  };

  const handleFeatureNavigate = (featureName) => {
    const view = mapFeatureToView(featureName);
    if (view && onNavigate) {
      onNavigate(view);
      setIsOpen(false);
    }
  };

  const handleCopyRoadmap = (msgId, roadmap) => {
    if (!roadmap) return;
    const msgState = roadmapInteractions[msgId] || { stepStatus: {}, checkedItems: {} };

    let text = `# Goal: ${roadmap.goal}\n\n`;
    if (roadmap.startingPoint) {
      text += `## Starting Point\n${roadmap.startingPoint}\n\n`;
    }
    text += `## Roadmap\n`;
    roadmap.steps.forEach(s => {
      const status = msgState.stepStatus?.[s.number] || s.status || 'not_started';
      text += `\n### Step ${s.number}: ${s.title} [Status: ${formatStatusLabel(status)}]\n`;
      if (s.what) text += `- What: ${s.what}\n`;
      if (s.why) text += `- Why: ${s.why}\n`;
      if (s.checklist?.length > 0) {
        text += `- Action Checklist:\n`;
        s.checklist.forEach((item, cIdx) => {
          const isChecked = msgState.checkedItems?.[`${s.number}-${cIdx}`] ?? item.checked;
          text += `  - [${isChecked ? 'x' : ' '}] ${item.text}\n`;
        });
      }
      if (s.outcome) text += `- Expected Outcome: ${s.outcome}\n`;
      if (s.feature) text += `- Alloy Feature: ${s.feature}\n`;
    });

    if (roadmap.dependencies) {
      text += `\n## Dependencies\n${roadmap.dependencies}\n`;
    }
    if (roadmap.nextAction) {
      text += `\n## Immediate Next Action\n${roadmap.nextAction}\n`;
    }

    try {
      navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  // ---------------------------------------------------------------------------
  // Real-time Groq Streaming Execution
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (customPrompt = null) => {
    const promptText = (customPrompt || inputText).trim();
    if (!promptText || activeStage !== 'idle') return;

    if (!customPrompt) setInputText('');
    setLastErrorPrompt(null);

    // 1. Immediately display user message
    const userMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: 'Just now'
    };

    // 2. Prepare assistant placeholder with Stage 1 (Message Received)
    const assistantId = `ai-${Date.now()}`;
    const initialAssistantMsg = {
      id: assistantId,
      sender: 'alloy-ai',
      text: '',
      isStreaming: true,
      timestamp: 'Building roadmap…',
      actions: []
    };

    setMessages(prev => [...prev, userMessage, initialAssistantMsg]);

    // Stage 1: Understanding objective
    setActiveStage('understanding');
    setActiveStatusText('Understanding your objective…');

    // Create abort controller for streaming cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const historyForBackend = messages
      .filter(m => m.id !== 'welcome-1')
      .slice(-6)
      .map(m => ({
        sender: m.sender,
        text: m.text
      }));
    historyForBackend.push({ sender: 'user', text: promptText });

    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({
          messages: historyForBackend,
          role: userRole,
          context: contextPayload
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Groq stream failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is not readable for streaming.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();

          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);

            if (parsed.type === 'stage') {
              // Contextual Stage Updates: Understanding -> Building roadmap -> Streaming
              if (parsed.stage === 'understanding') {
                setActiveStage('understanding');
                setActiveStatusText(parsed.status || 'Understanding your objective…');
              } else if (parsed.stage === 'processing' || parsed.stage === 'reviewing') {
                setActiveStage('processing');
                setActiveStatusText(parsed.status || 'Building your roadmap…');
              } else if (parsed.stage === 'generating') {
                setActiveStage('generating');
                setActiveStatusText(parsed.status || 'Streaming roadmap…');
              }
            } else if (parsed.type === 'chunk') {
              // Progressive token delivery
              setActiveStage('generating');
              setActiveStatusText('Streaming roadmap…');
              accumulatedText += (parsed.text || '');

              setMessages(prev => prev.map(m => {
                if (m.id === assistantId) {
                  return { ...m, text: accumulatedText };
                }
                return m;
              }));
            } else if (parsed.type === 'done') {
              break;
            } else if (parsed.type === 'error') {
              throw new Error(parsed.error || 'AI generation encountered an error.');
            }
          } catch (jsonErr) {
            // Non-JSON or incomplete line
          }
        }
      }

      // Generation Completed
      setActiveStage('idle');
      setActiveStatusText('');
      setMessages(prev => prev.map(m => {
        if (m.id === assistantId) {
          return {
            ...m,
            isStreaming: false,
            timestamp: 'Just now',
            actions: deriveContextualActions(accumulatedText)
          };
        }
        return m;
      }));

    } catch (err) {
      if (abortController.signal.aborted) {
        // User intentionally cancelled stream
        setActiveStage('idle');
        setActiveStatusText('');
        setMessages(prev => prev.map(m => {
          if (m.id === assistantId) {
            return {
              ...m,
              isStreaming: false,
              text: m.text ? m.text + '\n\n*(Generation stopped by user)*' : '*(Generation stopped)*',
              timestamp: 'Stopped'
            };
          }
          return m;
        }));
        return;
      }

      console.error('[Alloy AI Stream Error]:', err);
      setActiveStage('error');
      setLastErrorPrompt(promptText);
      setActiveStatusText('Generation interrupted.');

      setMessages(prev => prev.map(m => {
        if (m.id === assistantId) {
          return {
            ...m,
            isStreaming: false,
            isError: true,
            text: "I encountered a network or model interruption while streaming from Groq. You can retry your question below, or explore verified marketplace creators directly.",
            timestamp: 'Error',
            actions: [
              { label: 'Explore Directory', view: 'discover' },
              { label: 'Trust Center', view: 'trust-center' }
            ]
          };
        }
        return m;
      }));
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCopyMessage = (msgId, text) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(msgId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const handleRegenerateLast = () => {
    if (activeStage !== 'idle') return;
    const lastUserMsg = [...messages].reverse().find(m => m.sender === 'user');
    if (!lastUserMsg) return;

    setMessages(prev => {
      const idx = prev.map(m => m.sender).lastIndexOf('alloy-ai');
      if (idx !== -1 && idx > 0) {
        return prev.slice(0, idx);
      }
      return prev;
    });

    handleSendMessage(lastUserMsg.text);
  };

  const handleClearHistory = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveStage('idle');
    setActiveStatusText('');
    setRoadmapInteractions({});
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'alloy-ai',
        text: "### Goal: Ready to Assist Your Studio\n\n#### Starting Point\nYour workspace session has been refreshed. I am ready to guide your next strategic objective.\n\n#### Next Action\nSelect a suggestion chip above or ask any question to build your action roadmap.",
        timestamp: 'Just now'
      }
    ]);
  };

  const handleActionClick = (action) => {
    if (action.view && onNavigate) {
      onNavigate(action.view, action.extraId);
      setIsOpen(false);
    } else if (action.creatorId && onOpenCreatorProfile) {
      onOpenCreatorProfile(action.creatorId);
      setIsOpen(false);
    }
  };

  return (
    <div className="alloy-assistant-root">
      {/* ========================================================
          1. FLOATING ABSTRACT SCULPTURAL AVATAR (Idle & Hover)
          ======================================================== */}
      {!isOpen && (
        <div 
          className="alloy-sculptural-avatar-container"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Gentle Editorial Hover Pill: "Talk to Alloy AI" */}
          <div className={`alloy-avatar-hover-label ${isHovered ? 'is-visible' : ''}`}>
            <span className="hover-label-sparkle">✦</span>
            <span className="hover-label-title">Talk to Alloy AI</span>
          </div>

          {/* Abstract Sculptural Button (Alloy Core Identity) */}
          <button
            type="button"
            className="alloy-sculptural-avatar-btn"
            onClick={() => setIsOpen(true)}
            aria-label="Talk to Alloy AI Assistant"
            id="alloy-ai-sculptural-avatar-trigger"
          >
            {/* Ambient Warm Golden Aura */}
            <div className="avatar-ambient-halo" aria-hidden="true" />

            {/* Orbiting Translucent Glass Crystals */}
            <div className="avatar-orbit-track" aria-hidden="true">
              <span className="orbiting-glass-shard shard-1" />
              <span className="orbiting-glass-shard shard-2" />
              <span className="orbiting-glass-shard shard-3" />
              <span className="orbiting-gold-bead bead-1" />
            </div>

            {/* Inner Luminous A-Shaped Glow Core */}
            <div className="avatar-luminous-a-core" aria-hidden="true">
              <svg viewBox="0 0 100 100" className="a-core-svg">
                <defs>
                  <linearGradient id="alloyCoreGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF7E6" stopOpacity="0.95" />
                    <stop offset="45%" stopColor="#F5D298" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#D4A373" stopOpacity="0.3" />
                  </linearGradient>
                  <filter id="coreGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M50 14 L78 84 L64 84 L57 66 L43 66 L36 84 L22 84 Z M47 34 L45 57 L55 57 Z"
                  fill="url(#alloyCoreGlowGrad)"
                  filter="url(#coreGlowFilter)"
                  className="a-core-path"
                />
              </svg>
            </div>

            {/* Central Interlocking Ribbons */}
            <div className="avatar-sculpture-wrapper">
              <img
                src="/assets/alloy-emblem-transparent.png"
                alt="Alloy Architectural Ribbon Sculpture"
                className="avatar-sculpture-img"
              />
              <div className="avatar-specular-sweep" aria-hidden="true" />
            </div>

            {/* Translucent Convex Glass Lens Overlay */}
            <div className="avatar-glass-lens" aria-hidden="true" />
            <span className="avatar-presence-indicator" title="Alloy AI Online" />
          </button>
        </div>
      )}

      {/* ========================================================
          2. EXPANDED ALLOY AI CHAT PANEL
          ======================================================== */}
      {isOpen && (
        <div 
          className="alloy-ai-chat-panel" 
          role="dialog" 
          aria-label="Alloy AI Chat"
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Panel Header */}
          <div className="chat-panel-header">
            <div className="header-brand-wrap">
              <div className={`header-mini-sculpture ${activeStage !== 'idle' ? 'is-processing' : ''}`}>
                <img
                  src="/assets/alloy-emblem-transparent.png"
                  alt="Alloy AI"
                  className="header-mini-img"
                />
              </div>
              <div className="header-meta-col">
                <h3 className="header-title">Alloy AI</h3>
                <span className="header-subtitle">
                  <span className={`status-live-dot ${activeStage !== 'idle' ? 'is-pulsing' : ''}`} />
                  Roadmap Strategist
                </span>
              </div>
            </div>

            <div className="header-controls">
              <button
                type="button"
                className="header-icon-btn"
                onClick={handleClearHistory}
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                className="header-icon-btn close-btn"
                onClick={handleClose}
                title="Close"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Real Processing Stage Banner (When Active) */}
          {activeStage !== 'idle' && (
            <div className="ai-processing-stage-strip">
              <div className="stage-symbol-indicator">
                <div className="stage-symbol-glow" />
                <span className="stage-symbol-icon">✦</span>
              </div>
              <div className="stage-status-content">
                <span className="stage-status-title">
                  {activeStage === 'understanding' && 'Stage 1: Objective Received'}
                  {activeStage === 'processing' && 'Stage 2: Building your roadmap…'}
                  {activeStage === 'generating' && 'Stage 3: Streaming Roadmap'}
                  {activeStage === 'error' && 'Stream Interrupted'}
                </span>
                <span className="stage-status-detail">{activeStatusText}</span>
              </div>
              {activeStage !== 'error' && (
                <button
                  type="button"
                  className="btn-stop-generating"
                  onClick={handleStopGenerating}
                  title="Stop generating response"
                >
                  <Square size={10} fill="currentColor" />
                  <span>Stop</span>
                </button>
              )}
            </div>
          )}

          {/* Role-Aware Suggestion Starter Chips (When Idle) */}
          {activeStage === 'idle' && (
            <div className="chat-suggestions-bar">
              <div className="suggestions-scroll">
                {activeSuggestions.map((sugg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="suggestion-chip"
                    onClick={() => handleSendMessage(sugg.query)}
                  >
                    {sugg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Message Stream */}
          <div className="chat-stream-body">
            {messages.map((msg) => {
              const parsedRoadmap = msg.sender === 'alloy-ai' ? parseRoadmapFromMarkdown(msg.text) : null;
              const isRoadmapView = parsedRoadmap && parsedRoadmap.isRoadmap;

              return (
                <div
                  key={msg.id}
                  className={`chat-bubble-row ${msg.sender === 'user' ? 'is-user' : 'is-ai'} ${isRoadmapView ? 'is-roadmap-bubble' : ''}`}
                >
                  {msg.sender === 'alloy-ai' && (
                    <div className={`chat-bubble-avatar ${msg.isStreaming ? 'avatar-streaming' : ''}`}>
                      <img
                        src="/assets/alloy-emblem-transparent.png"
                        alt="Alloy"
                        className="bubble-avatar-img"
                      />
                      {msg.isStreaming && <span className="bubble-avatar-core-halo" />}
                    </div>
                  )}

                  <div className="chat-bubble-content">
                    {/* Stage 1 & 2 Loading State before tokens arrive */}
                    {msg.isStreaming && !msg.text && (
                      <div className="stream-pre-token-state">
                        <div className="pre-token-symbol">
                          <span className="pre-token-core" />
                        </div>
                        <span className="pre-token-text">{activeStatusText || 'Building your roadmap…'}</span>
                      </div>
                    )}

                    {/* Render Content: Visual Roadmap or Clean Progressive Markdown */}
                    {msg.text && (
                      <div className={`bubble-text ${msg.isError ? 'bubble-text-error' : ''}`}>
                        {isRoadmapView ? (
                          <VisualRoadmap
                            messageId={msg.id}
                            roadmap={parsedRoadmap}
                            isStreaming={msg.isStreaming}
                            interactions={roadmapInteractions[msg.id] || {}}
                            onToggleExpand={(stepNum) => handleToggleStepExpand(msg.id, stepNum)}
                            onToggleAllExpand={(shouldExp, steps) => handleToggleAllExpand(msg.id, shouldExp, steps)}
                            onNavigateFeature={handleFeatureNavigate}
                            onCopyRoadmap={() => handleCopyRoadmap(msg.id, parsedRoadmap)}
                            onRegenerate={handleRegenerateLast}
                            copied={copiedId === msg.id}
                          />
                        ) : (
                          <>
                            {renderProgressiveMarkdown(msg.text)}
                            {msg.isStreaming && (
                              <span className="streaming-cursor" aria-hidden="true">▍</span>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Contextual Action Links (For direct answers) */}
                    {!isRoadmapView && Array.isArray(msg.actions) && msg.actions.length > 0 && !msg.isStreaming && (
                      <div className="bubble-actions-row">
                        {msg.actions.map((act, actIdx) => (
                          <button
                            key={actIdx}
                            type="button"
                            className="bubble-action-btn"
                            onClick={() => handleActionClick(act)}
                          >
                            <span>{act.label}</span>
                            <ArrowRight size={11} />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Message Actions Bar (Copy & Regenerate for standard messages) */}
                    {!isRoadmapView && (
                      <div className="bubble-meta-row">
                        <span className="bubble-timestamp">{msg.timestamp}</span>

                        {msg.sender === 'alloy-ai' && !msg.isStreaming && (
                          <div className="message-actions-group">
                            <button
                              type="button"
                              className="msg-action-pill"
                              onClick={() => handleCopyMessage(msg.id, msg.text)}
                              title="Copy response to clipboard"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check size={11} className="text-forest-copied" />
                                  <span className="text-forest-copied">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className="msg-action-pill"
                              onClick={handleRegenerateLast}
                              title="Regenerate response from Groq"
                            >
                              <RotateCcw size={11} />
                              <span>Regenerate</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Error banner with direct Retry */}
            {activeStage === 'error' && lastErrorPrompt && (
              <div className="chat-error-retry-strip">
                <AlertCircle size={14} className="error-strip-icon" />
                <span className="error-strip-text">Generation was interrupted.</span>
                <button
                  type="button"
                  className="btn-retry-action"
                  onClick={() => handleSendMessage(lastErrorPrompt)}
                >
                  <RotateCcw size={12} />
                  <span>Retry Question</span>
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Composer Footer */}
          <form
            className="chat-composer-footer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="chat-composer-input"
              placeholder={
                activeStage !== 'idle'
                  ? 'Building your roadmap…'
                  : userRole === 'creator'
                  ? 'Ask for a roadmap on bids, eligibility, portfolio…'
                  : 'Ask for a roadmap on campaigns, briefs, CreaMatch…'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={activeStage !== 'idle'}
            />

            {activeStage !== 'idle' ? (
              <button
                type="button"
                className="chat-composer-stop-btn"
                onClick={handleStopGenerating}
                title="Stop streaming response"
                aria-label="Stop generation"
              >
                <Square size={13} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                className="chat-composer-send-btn"
                disabled={!inputText.trim()}
                aria-label="Send message to Alloy AI"
              >
                <Send size={14} />
              </button>
            )}
          </form>

          {/* Footer Identity Sub-Note */}
          <div className="chat-panel-footer-note">
            <span>Alloy Intelligent Roadmap Engine · Groq AI</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-Component: Simplified Visual Action Roadmap
// ---------------------------------------------------------------------------
function VisualRoadmap({
  messageId,
  roadmap,
  isStreaming,
  interactions = {},
  onToggleExpand,
  onToggleAllExpand,
  onNavigateFeature,
  onCopyRoadmap,
  onRegenerate,
  copied
}) {
  const { goal, startingPoint, steps = [], dependencies, nextAction } = roadmap;
  const { expandedSteps = {}, allExpanded = true } = interactions;

  return (
    <div className="alloy-visual-roadmap-container">
      {/* 1. Header Card with Goal & Global Controls */}
      <div className="roadmap-header-card">
        <div className="roadmap-header-top-row">
          <span className="roadmap-badge-tag">Roadmap</span>
        </div>

        {goal && <h3 className="roadmap-goal-title">{goal}</h3>}

        {startingPoint && (
          <p className="roadmap-starting-point">{startingPoint}</p>
        )}
      </div>

      {/* 2. Simplified Step Cards List */}
      <div className="roadmap-steps-list">
        {steps.map((step) => {
          const isCurrentExpanded = expandedSteps[step.number] ?? true;
          const instructionText = (step.what || step.why || step.outcome || '').trim();
          const stepNumStr = step.number < 10 ? `0${step.number}` : `${step.number}`;

          return (
            <div 
              key={step.number} 
              className={`roadmap-step-card ${isCurrentExpanded ? 'is-expanded' : 'is-collapsed'}`}
            >
              {/* Step Card Header */}
              <div 
                className="step-card-header"
                onClick={() => onToggleExpand(step.number)}
              >
                <div className="step-title-col">
                  <span className="step-num-eyebrow">STEP {stepNumStr}</span>
                  <h4 className="step-title-text">{step.title}</h4>
                </div>

                <button
                  type="button"
                  className="step-expand-toggle-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(step.number);
                  }}
                  aria-label={isCurrentExpanded ? 'Collapse step' : 'Expand step'}
                >
                  {isCurrentExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>

              {/* Step Card Expandable Body */}
              {isCurrentExpanded && (
                <div className="step-card-body">
                  {instructionText && (
                    <p className="step-instruction-text">{instructionText}</p>
                  )}

                  {/* Relevant action or destination link, if required */}
                  {step.feature && (
                    <div className="step-action-row">
                      <button
                        type="button"
                        className="step-feature-link-btn"
                        onClick={() => onNavigateFeature(step.feature)}
                        title={`Open ${step.feature}`}
                      >
                        <span>Open {step.feature}</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Footer Dependencies or Next Action (if present) */}
      {(nextAction || dependencies) && (
        <div className="roadmap-footer-note-card">
          {nextAction && (
            <div className="roadmap-footer-note-item">
              <span className="footer-note-tag">Next Action</span>
              <p className="footer-note-text">{nextAction}</p>
            </div>
          )}
          {dependencies && (
            <div className="roadmap-footer-note-item">
              <span className="footer-note-tag">Dependencies</span>
              <p className="footer-note-text">{dependencies}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers: Structured Roadmap Parser
// ---------------------------------------------------------------------------
function parseRoadmapFromMarkdown(text) {
  if (!text || typeof text !== 'string') return { isRoadmap: false };

  // Detect roadmap indicators
  const hasRoadmapHeader = /(?:###?\s*(?:C\.\s*)?Roadmap|####?\s*Roadmap|\bRoadmap\b)/i.test(text);
  const hasGoalHeader = /(?:###?\s*(?:A\.\s*)?Goal|Goal:|\bGoal\b)/i.test(text);
  const hasTableSignal = /\|\s*#\s*\|\s*Step\s*\|/i.test(text);
  const hasStepSignal = /(?:^|\n)\s*(?:\d+\.|\bStep\s*\d+:?)\s+\*{0,2}/m.test(text);

  if (!hasRoadmapHeader && !hasGoalHeader && !hasTableSignal && !hasStepSignal) {
    return { isRoadmap: false };
  }

  // 1. Extract Goal
  let goal = '';
  const goalMatch = text.match(/(?:###?\s*(?:A\.\s*)?Goal:?\s*(.*?)(?=\n|$)|##\s*(?:A\.\s*)?Goal:?\s*(.*?)(?=\n|$))/i);
  if (goalMatch) {
    const rawGoal = (goalMatch[1] || goalMatch[2] || '').trim();
    if (rawGoal) {
      goal = rawGoal.replace(/^\*{1,2}|\*{1,2}$/g, '').trim();
    } else {
      // Look at next non-empty line
      const afterGoal = text.slice((goalMatch.index || 0) + goalMatch[0].length);
      const nextLine = afterGoal.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('---'));
      if (nextLine) goal = nextLine.replace(/^\*{1,2}|\*{1,2}$/g, '').trim();
    }
  }

  // 2. Extract Starting Point
  let startingPoint = '';
  const startMatch = text.match(/(?:####?\s*(?:B\.\s*)?Starting\s*Point:?\s*\n)([\s\S]*?)(?=\n####?|\n###|\n##|\n---|---|$)/i);
  if (startMatch) {
    startingPoint = startMatch[1].replace(/---/g, '').trim();
  }

  // 3. Extract Dependencies
  let dependencies = '';
  const depMatch = text.match(/(?:####?\s*(?:D\.\s*)?Dependencies:?\s*\n|###\s*(?:D\.\s*)?Dependencies:?\s*\n)([\s\S]*?)(?=\n####?|\n###|\n##|\n---|---|$)/i);
  if (depMatch) {
    dependencies = depMatch[1].replace(/---/g, '').trim();
  }

  // 4. Extract Next Action
  let nextAction = '';
  const nextMatch = text.match(/(?:####?\s*(?:E\.\s*)?Next\s*Action:?\s*\n|###\s*(?:E\.\s*)?Next\s*Action:?\s*\n|##\s*(?:E\.\s*)?Next\s*Action:?\s*\n)([\s\S]*?)(?=\n####?|\n###|\n##|\n---|---|$)/i);
  if (nextMatch) {
    nextAction = nextMatch[1].replace(/---/g, '').trim();
  }

  const steps = [];

  // Branch A: Check if Roadmap is formatted as a Markdown Table
  if (hasTableSignal) {
    const lines = text.split('\n');
    const tableHeaderIdx = lines.findIndex(l => /\|\s*#\s*\|\s*Step\s*\|/i.test(l));
    if (tableHeaderIdx !== -1) {
      const headerCols = lines[tableHeaderIdx].split('|').map(c => c.trim().toLowerCase()).filter(Boolean);
      
      const colIdx = {
        num: headerCols.findIndex(c => c === '#' || c === 'no' || c === 'step #'),
        title: headerCols.findIndex(c => c === 'step' || c.includes('title') || c.includes('step title')),
        what: headerCols.findIndex(c => c.includes('what')),
        why: headerCols.findIndex(c => c.includes('why')),
        checklist: headerCols.findIndex(c => c.includes('checklist') || c.includes('action')),
        outcome: headerCols.findIndex(c => c.includes('outcome') || c.includes('deliverable')),
        feature: headerCols.findIndex(c => c.includes('feature') || c.includes('alloy')),
        status: headerCols.findIndex(c => c.includes('status'))
      };

      for (let i = tableHeaderIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('|')) {
          if (line.startsWith('---') || line === '') continue;
          break; // end of table
        }
        if (/^\|\s*[-:]+/.test(line)) continue; // separator row

        const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === ''));
        if (cells.length < 2) continue;

        const rawTitle = cells[colIdx.title !== -1 ? colIdx.title : 1] || '';
        const cleanTitle = rawTitle.replace(/^\*{1,2}|\*{1,2}$/g, '').trim();
        if (!cleanTitle) continue;

        const rawWhat = colIdx.what !== -1 ? (cells[colIdx.what] || '') : '';
        const rawWhy = colIdx.why !== -1 ? (cells[colIdx.why] || '') : '';
        const rawChecklist = colIdx.checklist !== -1 ? (cells[colIdx.checklist] || '') : '';
        const rawOutcome = colIdx.outcome !== -1 ? (cells[colIdx.outcome] || '') : '';
        const rawFeature = colIdx.feature !== -1 ? (cells[colIdx.feature] || '') : '';
        const rawStatus = colIdx.status !== -1 ? (cells[colIdx.status] || '') : '';

        // Parse action checklist items from cell
        const checklist = [];
        const checkItems = rawChecklist.split(/<br\s*\/?>|\n|•/g).map(s => s.trim()).filter(Boolean);
        for (const it of checkItems) {
          const checkMatch = it.match(/^\[([ xX])\]\s*(.*)$/);
          if (checkMatch) {
            checklist.push({
              checked: checkMatch[1].toLowerCase() === 'x',
              text: checkMatch[2].trim()
            });
          } else {
            checklist.push({
              checked: false,
              text: it.replace(/^[•\-*]\s*/, '').trim()
            });
          }
        }

        let status = 'not_started';
        const s = rawStatus.toLowerCase();
        if (s.includes('completed') || s.includes('done')) status = 'completed';
        else if (s.includes('progress') || s.includes('active')) status = 'in_progress';
        else if (s.includes('blocked') || s.includes('hold')) status = 'blocked';

        steps.push({
          number: steps.length + 1,
          title: cleanTitle,
          what: rawWhat.replace(/<br\s*\/?>/g, ' ').trim(),
          why: rawWhy.replace(/<br\s*\/?>/g, ' ').trim(),
          checklist,
          outcome: rawOutcome.replace(/<br\s*\/?>/g, ' ').trim(),
          feature: rawFeature.replace(/<br\s*\/?>/g, ' ').trim(),
          status
        });
      }
    }
  }

  // Branch B: If table parsing did not extract steps, parse from standard list chunks
  if (steps.length === 0) {
    let roadmapText = '';
    const roadmapSectionMatch = text.match(/(?:(?:###|####|##)\s*(?:[A-Z]\.\s*)?.*Roadmap.*?\n)([\s\S]*?)(?=(?:\n###|\n####|\n##)\s*(?:[A-Z]\.\s*)?(?:Dependencies|Next\s*Action)|$)/i);
    roadmapText = roadmapSectionMatch ? roadmapSectionMatch[1] : text;

    const stepChunks = roadmapText.split(/(?=(?:^|\n)\s*(?:(?:\d+\.|\bStep\s*\d+:?)\s+))/m).filter(c => c.trim().length > 0);

    for (const chunk of stepChunks) {
      const titleMatch = chunk.match(/(?:^|\n)\s*(?:\d+\.|\bStep\s*(\d+)?:?)\s*\*{0,2}(.*?)\*{0,2}(?:\n|$)/);
      if (!titleMatch) continue;

      const rawTitle = (titleMatch[2] || '').trim().replace(/^\*{1,2}|\*{1,2}$/g, '');
      if (!rawTitle) continue;

      const whatMatch = chunk.match(/-\s*\*{0,2}What(?:'s| to do| needs to be done)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
      const what = whatMatch ? whatMatch[1].trim() : '';

      const whyMatch = chunk.match(/-\s*\*{0,2}Why(?: it matters| this matters)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
      const why = whyMatch ? whyMatch[1].trim() : '';

      const checklist = [];
      const checklistMatch = chunk.match(/-\s*\*{0,2}Action(?: checklist| items)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}(?:Expected|Alloy|Status)|\n\s*#|$)/i);
      if (checklistMatch) {
        const items = checklistMatch[1].split('\n');
        for (const item of items) {
          const trimmedItem = item.trim();
          const checkMatch = trimmedItem.match(/^[-*]\s*\[([ xX])\]\s*(.*)$/);
          if (checkMatch) {
            checklist.push({
              checked: checkMatch[1].toLowerCase() === 'x',
              text: checkMatch[2].trim()
            });
          } else if (trimmedItem.match(/^[-*✦•]\s+(.*)$/)) {
            const itemText = trimmedItem.replace(/^[-*✦•]\s+/, '').trim();
            if (itemText && !itemText.toLowerCase().startsWith('what') && !itemText.toLowerCase().startsWith('why')) {
              checklist.push({
                checked: false,
                text: itemText
              });
            }
          }
        }
      }

      const outcomeMatch = chunk.match(/-\s*\*{0,2}Expected outcome:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
      const outcome = outcomeMatch ? outcomeMatch[1].trim() : '';

      const featureMatch = chunk.match(/-\s*\*{0,2}(?:Alloy\s*)?Feature(?: or capability)?:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
      const feature = featureMatch ? featureMatch[1].trim() : '';

      const statusMatch = chunk.match(/-\s*\*{0,2}Status:?\*{0,2}\s*([\s\S]*?)(?=\n\s*-\s*\*{0,2}|\n\s*#|$)/i);
      let status = 'not_started';
      if (statusMatch) {
        const s = statusMatch[1].toLowerCase();
        if (s.includes('completed') || s.includes('done')) status = 'completed';
        else if (s.includes('progress') || s.includes('active')) status = 'in_progress';
        else if (s.includes('blocked') || s.includes('hold')) status = 'blocked';
      }

      steps.push({
        number: steps.length + 1,
        title: rawTitle,
        what,
        why,
        checklist,
        outcome,
        feature,
        status
      });
    }
  }

  // If fewer than 2 steps and no explicit goal, it is a direct answer
  if (steps.length < 2 && !goal) {
    return { isRoadmap: false };
  }

  return {
    isRoadmap: true,
    goal: goal || 'Action Roadmap',
    startingPoint,
    steps,
    dependencies,
    nextAction,
    rawText: text
  };
}

function formatStatusLabel(status) {
  switch (status) {
    case 'completed': return 'Completed';
    case 'in_progress': return 'In progress';
    case 'blocked': return 'Blocked';
    default: return 'Not started';
  }
}

function mapFeatureToView(featureName) {
  if (!featureName) return 'discover';
  const f = featureName.toLowerCase();
  if (f.includes('workspace') || f.includes('brief') || f.includes('brand') || f.includes('launch')) {
    return 'brand-workspace';
  }
  if (f.includes('discover') || f.includes('creator') || f.includes('creamatch') || f.includes('directory') || f.includes('filter')) {
    return 'discover';
  }
  if (f.includes('trust') || f.includes('escrow') || f.includes('orbit') || f.includes('provenance') || f.includes('licens')) {
    return 'trust-center';
  }
  if (f.includes('profile') || f.includes('portfolio') || f.includes('studio') || f.includes('bid')) {
    return 'creator-studio';
  }
  return 'discover';
}

// ---------------------------------------------------------------------------
// Helpers: Progressive Safe Markdown Parser (For Direct Answers)
// ---------------------------------------------------------------------------
function renderProgressiveMarkdown(rawText) {
  if (!rawText) return null;

  const segments = rawText.split(/(```[\s\S]*?```)/g);

  return segments.map((seg, sIdx) => {
    if (seg.startsWith('```')) {
      const match = seg.match(/^```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```?$/);
      const codeLang = match?.[1] || '';
      const codeBody = match?.[2] || seg.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/```$/, '');
      return (
        <pre key={sIdx} className="alloy-code-block">
          {codeLang && <span className="code-lang-tag">{codeLang}</span>}
          <code>{codeBody}</code>
        </pre>
      );
    }

    const paragraphs = seg.split(/\n{2,}/);
    return (
      <React.Fragment key={sIdx}>
        {paragraphs.map((para, pIdx) => {
          const lines = para.split('\n');

          const isTable = lines.length >= 2 && lines.some(l => l.includes('|'));
          if (isTable) {
            return renderMarkdownTable(lines, `${sIdx}-${pIdx}`);
          }

          return (
            <div key={`${sIdx}-${pIdx}`} className="formatted-paragraph">
              {lines.map((line, lIdx) => {
                const trimmed = line.trim();

                if (trimmed.startsWith('### ')) {
                  return (
                    <h4 key={lIdx} className="formatted-heading-3">
                      {renderInlineFormatting(trimmed.slice(4))}
                    </h4>
                  );
                }
                if (trimmed.startsWith('## ')) {
                  return (
                    <h3 key={lIdx} className="formatted-heading-2">
                      {renderInlineFormatting(trimmed.slice(3))}
                    </h3>
                  );
                }
                if (trimmed.startsWith('# ')) {
                  return (
                    <h2 key={lIdx} className="formatted-heading-1">
                      {renderInlineFormatting(trimmed.slice(2))}
                    </h2>
                  );
                }

                if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('✦ ') || trimmed.startsWith('• ')) {
                  const content = trimmed.replace(/^[-*✦•]\s+/, '');
                  return (
                    <div key={lIdx} className="bullet-row">
                      <span className="bullet-symbol">✦</span>
                      <span className="bullet-text">{renderInlineFormatting(content)}</span>
                    </div>
                  );
                }

                const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
                if (numMatch) {
                  return (
                    <div key={lIdx} className="num-list-row">
                      <span className="num-counter">{numMatch[1]}.</span>
                      <span className="num-text">{renderInlineFormatting(numMatch[2])}</span>
                    </div>
                  );
                }

                return (
                  <p key={lIdx} className="standard-line">
                    {renderInlineFormatting(line)}
                  </p>
                );
              })}
            </div>
          );
        })}
      </React.Fragment>
    );
  });
}

function renderMarkdownTable(lines, keyPrefix) {
  const tableRows = lines
    .filter(l => l.includes('|') && !l.match(/^\s*\|?\s*[-:]+[-| :]*$/))
    .map(l => l.split('|').map(c => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === '') && !(idx === arr.length - 1 && c === '')));

  if (tableRows.length === 0) return null;
  const header = tableRows[0];
  const rows = tableRows.slice(1);

  return (
    <div key={keyPrefix} className="alloy-table-wrapper">
      <table className="alloy-markdown-table">
        <thead>
          <tr>
            {header.map((col, cIdx) => (
              <th key={cIdx}>{renderInlineFormatting(col)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td key={cIdx}>{renderInlineFormatting(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInlineFormatting(text) {
  if (!text) return null;

  const codeParts = text.split(/(`[^`]+`)/g);

  return codeParts.map((cPart, cIdx) => {
    if (cPart.startsWith('`') && cPart.endsWith('`') && cPart.length >= 2) {
      return <code key={cIdx} className="inline-code">{cPart.slice(1, -1)}</code>;
    }

    let sanitized = cPart;
    const asterisksCount = (sanitized.match(/\*\*/g) || []).length;
    if (asterisksCount % 2 !== 0) {
      sanitized += '**';
    }

    const boldParts = sanitized.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((bPart, bIdx) => {
      if (bPart.startsWith('**') && bPart.endsWith('**')) {
        return <strong key={`${cIdx}-${bIdx}`} className="font-semibold markdown-bold">{bPart.slice(2, -2)}</strong>;
      }
      return bPart;
    });
  });
}

function deriveContextualActions(responseText) {
  const actions = [];
  const lower = responseText.toLowerCase();

  if (lower.includes('discover') || lower.includes('creator') || lower.includes('portfolio') || lower.includes('julian') || lower.includes('maya')) {
    actions.push({ label: 'Explore Creators', view: 'discover' });
  }

  if (lower.includes('brief') || lower.includes('campaign') || lower.includes('brand workspace')) {
    actions.push({ label: 'Brand Studio', view: 'brand-workspace' });
  }

  if (lower.includes('trust') || lower.includes('escrow') || lower.includes('verification') || lower.includes('license')) {
    actions.push({ label: 'Trust Center', view: 'trust-center' });
  }

  return actions.slice(0, 3);
}
