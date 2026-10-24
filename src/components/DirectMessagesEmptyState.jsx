// src/components/DirectMessagesEmptyState.jsx
// Premium Editorial Empty State for Direct Messages across Alloy
// Supports: 'no-conversations', 'empty-thread', 'no-selection', 'loading', 'error'

import React from 'react';
import { ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

export default function DirectMessagesEmptyState({
  type = 'no-conversations', // 'no-conversations' | 'empty-thread' | 'no-selection' | 'loading' | 'error'
  role = 'brand', // 'brand' | 'creator'
  onExplore,
  partnerName,
  errorMessage,
  onRetry,
  className = ''
}) {
  // 1. Loading State
  if (type === 'loading') {
    return (
      <div className={`dm-empty-state-wrap dm-loading-state ${className}`} role="status" aria-live="polite">
        <div className="dm-loading-spinner" />
        <h4 className="dm-loading-text">Loading conversations...</h4>
      </div>
    );
  }

  // 2. Error State with Retry
  if (type === 'error') {
    return (
      <div className={`dm-empty-state-wrap dm-error-state ${className}`} role="alert">
        <div className="dm-empty-icon-container error">
          <AlertCircle size={28} className="dm-error-icon" />
        </div>
        <h3 className="dm-empty-heading">Unable to load messages</h3>
        <p className="dm-empty-description">
          {errorMessage || 'A network error prevented loading your conversation history.'}
        </p>
        {onRetry && (
          <button
            type="button"
            className="btn btn-secondary btn-sm dm-retry-btn"
            onClick={onRetry}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        )}
      </div>
    );
  }

  // 3. In-Conversation Empty Thread (Conversation selected, but no messages yet)
  if (type === 'empty-thread') {
    return (
      <div className={`dm-thread-empty-state ${className}`} role="status">
        <div className="dm-thread-empty-icon-wrap">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="8" y="10" width="32" height="22" rx="6" stroke="var(--accent-forest, #214C35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="rgba(33,76,53,0.04)" />
            <path d="M14 32V37L20 32" stroke="var(--accent-forest, #214C35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 18H31" stroke="var(--accent-forest, #214C35)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <path d="M17 23H25" stroke="var(--accent-forest, #214C35)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          </svg>
        </div>
        <h4 className="dm-thread-empty-heading">Start the conversation</h4>
        <p className="dm-thread-empty-description">
          {partnerName
            ? `Send the first message to discuss creative direction, deliverables, and timelines with ${partnerName}.`
            : 'Send the first message to discuss creative direction, deliverables, and campaign timelines.'}
        </p>
      </div>
    );
  }

  // 4. No Conversation Selected (Sidebar has threads, but none clicked)
  if (type === 'no-selection') {
    return (
      <div className={`dm-empty-state-wrap dm-no-selection ${className}`} role="status">
        <div className="dm-empty-icon-container">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="8" y="10" width="32" height="22" rx="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 32V37L20 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="18" cy="21" r="1.5" fill="currentColor" />
            <circle cx="24" cy="21" r="1.5" fill="currentColor" />
            <circle cx="30" cy="21" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <h3 className="dm-empty-heading">Select a conversation</h3>
        <p className="dm-empty-description">
          Choose a thread from the sidebar to view message history and continue your collaboration.
        </p>
      </div>
    );
  }

  // 5. Default: No conversations at all
  const isBrand = role === 'brand';
  const ctaText = isBrand ? 'Explore Creators' : 'Explore Brands';

  return (
    <div className={`dm-empty-state-wrap ${className}`} role="status">
      <div className="dm-empty-icon-container">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="dm-empty-svg">
          <rect x="9" y="11" width="36" height="25" rx="7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="rgba(33,76,53,0.03)" opacity="0.45" />
          <path d="M17 36V41L24 36" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" />
          <path d="M18 20H32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
          <path d="M18 25H26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
          <rect x="19" y="25" width="36" height="25" rx="7" stroke="var(--accent-forest, #214C35)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" fill="#FFFFFF" />
          <path d="M47 50V55L40 50" stroke="var(--accent-forest, #214C35)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="30" cy="37.5" r="1.5" fill="var(--accent-forest, #214C35)" />
          <circle cx="37" cy="37.5" r="1.5" fill="var(--accent-forest, #214C35)" />
          <circle cx="44" cy="37.5" r="1.5" fill="var(--accent-forest, #214C35)" />
        </svg>
      </div>

      <h3 className="dm-empty-heading">Your conversations start here</h3>
      
      <p className="dm-empty-description">
        Connect with brands and creators, discuss campaign ideas, and bring your next collaboration to life. Your conversations will appear here once you start connecting.
      </p>

      {onExplore && (
        <button
          type="button"
          className="btn btn-primary dm-empty-cta-btn"
          onClick={onExplore}
          id="dm-empty-explore-cta"
        >
          <span>{ctaText}</span>
          <ArrowRight size={14} className="dm-empty-cta-arrow" />
        </button>
      )}
    </div>
  );
}
