// src/components/GlobalMessagingDrawer.jsx
// Persistent, Instagram-inspired desktop direct messaging interface for CreaSync
// Floating bottom-right launcher, 40% sliding drawer, thread search, chronological stream,
// multi-line composer with Enter to send, Shift+Enter for newlines, and reliable delivery states.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  ArrowLeft, 
  Search, 
  Sparkles, 
  CheckCheck, 
  Check, 
  Clock, 
  AlertCircle, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { deduplicateMessages } from '../services/marketplaceBackend';
import MessagesLoginWall from './MessagesLoginWall';
import DirectMessagesEmptyState from './DirectMessagesEmptyState';

export default function GlobalMessagingDrawer({
  isOpen,
  onOpen,
  onClose,
  connections = [],
  activeConnectionId = null,
  onSelectConnection,
  currentUser = null,
  currentUserRole = 'brand', // 'brand' | 'creator'
  currentBrand = null,
  currentCreator = null,
  onSendMessage,
  onViewProfile,
  onViewProject,
  onOpenLogin,
  onLoginSuccess,
  onExplore
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const drawerRef = useRef(null);

  // Determine current active participant identities
  const myRole = currentUserRole || (currentBrand ? 'brand' : 'creator');
  const myName = myRole === 'brand' 
    ? (currentBrand?.name || currentUser?.user_metadata?.full_name || 'Brand Partner')
    : (currentCreator?.name || currentUser?.user_metadata?.full_name || 'Creator');

  const myId = myRole === 'brand' 
    ? (currentBrand?.id || 'brand-general')
    : (currentCreator?.id || 'creator-general');

  // Filter conversations authorized for current participant (strictly gated to authenticated users)
  const authorizedConnections = useMemo(() => {
    if (!currentUser) return [];
    return (connections || []).filter(conn => {
      // In demo mode or general browsing, preserve accessibility
      if (!myId || myId === 'brand-general' || myId === 'creator-general') return true;
      if (myRole === 'brand') {
        return !conn.brandId || conn.brandId === myId || conn.brandId === 'brand-general';
      }
      if (myRole === 'creator') {
        return !conn.creatorId || conn.creatorId === myId || conn.creatorId === 'creator-general';
      }
      return true;
    });
  }, [connections, myRole, myId, currentUser]);

  // Filtered by search query
  const displayedConversations = useMemo(() => {
    if (!searchQuery.trim()) return authorizedConnections;
    const q = searchQuery.toLowerCase().trim();
    return authorizedConnections.filter(c => {
      const otherName = myRole === 'brand' ? (c.creatorName || '') : (c.brandName || '');
      const campaign = c.campaignTitle || '';
      const lastMsg = (c.messages && c.messages[c.messages.length - 1]?.text) || '';
      return (
        otherName.toLowerCase().includes(q) ||
        campaign.toLowerCase().includes(q) ||
        lastMsg.toLowerCase().includes(q)
      );
    });
  }, [authorizedConnections, searchQuery, myRole]);

  // Active connection object
  const activeConnection = useMemo(() => {
    if (!activeConnectionId) return null;
    return authorizedConnections.find(c => c.id === activeConnectionId) || null;
  }, [authorizedConnections, activeConnectionId]);

  // Compute unread count (if any)
  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return authorizedConnections.reduce((count, conn) => {
      const lastMsg = conn.messages && conn.messages[conn.messages.length - 1];
      if (lastMsg && lastMsg.sender !== myRole && conn.isUnread) {
        return count + 1;
      }
      return count;
    }, 0);
  }, [authorizedConnections, myRole, currentUser]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (activeConnection && isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConnection?.messages, activeConnectionId, isOpen]);

  // Focus textarea when entering active connection
  useEffect(() => {
    if (activeConnection && isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [activeConnectionId, isOpen]);

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (activeConnectionId) {
          // If in active thread, escape can return to conversation list
          onSelectConnection(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeConnectionId, onClose, onSelectConnection]);

  // Auto-resize composer textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [messageInput]);

  // Submission handler
  const handleSend = async (textToSend = null) => {
    const text = (textToSend !== null ? textToSend : messageInput).trim();
    if (!text || isSending || !activeConnection || !currentUser) return;

    setIsSending(true);
    setSendError(null);

    const msgPayload = {
      sender: myRole,
      senderName: myName,
      text,
      timestamp: 'Just now'
    };

    try {
      if (onSendMessage) {
        await onSendMessage(activeConnection.id, msgPayload);
      }
      setMessageInput('');
      setLastFailedMessage(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('[Messaging] Failed to deliver message:', err);
      setSendError(err.message || 'Failed to send message. Please retry.');
      setLastFailedMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard Enter vs Shift+Enter handler
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherPartyName = activeConnection 
    ? (myRole === 'brand' ? activeConnection.creatorName : activeConnection.brandName)
    : '';

  const otherPartyAvatar = activeConnection 
    ? (myRole === 'brand' ? activeConnection.creatorAvatar : (activeConnection.brandLogo || activeConnection.creatorAvatar))
    : '';

  return (
    <>
      {/* 1. Global Floating Launcher (Bottom-Right) */}
      {!isOpen && (
        <button
          type="button"
          className="global-messaging-launcher"
          onClick={onOpen}
          aria-label="Open Direct Messages"
          title="Direct Messages"
          id="global-messaging-launcher-btn"
        >
          <div className="launcher-icon-wrap">
            <MessageSquare size={22} className="launcher-icon" />
            {unreadCount > 0 && (
              <span className="launcher-unread-badge" aria-label={`${unreadCount} unread messages`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="launcher-label">Messages</span>
        </button>
      )}

      {/* 2. Sliding Drawer Backdrop */}
      {isOpen && (
        <div 
          className="global-messaging-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 3. Instagram-Inspired Sliding Drawer */}
      <aside
        ref={drawerRef}
        className={`global-messaging-drawer ${isOpen ? 'drawer-open' : 'drawer-closed'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Direct Messaging"
      >
        {/* Drawer Header */}
        <div className="global-messaging-header">
          {activeConnection ? (
            <div className="drawer-header-left">
              <button
                type="button"
                className="drawer-back-btn"
                onClick={() => onSelectConnection(null)}
                aria-label="Back to conversations list"
                title="Back to conversations"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="drawer-header-participant">
                <div className="drawer-avatar-wrap">
                  <img 
                    src={otherPartyAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"} 
                    alt={otherPartyName} 
                    className="drawer-avatar-img"
                  />
                  <span className="drawer-online-dot" />
                </div>
                <div className="drawer-title-group">
                  <div className="drawer-participant-name-row">
                    <span className="drawer-participant-name">{otherPartyName}</span>
                    <ShieldCheck size={14} className="verified-icon" title="Verified CreaMatch Partner" />
                  </div>
                  <span className="drawer-participant-sub">
                    {activeConnection.campaignTitle || 'Direct Collaboration'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="drawer-header-left">
              <div className="drawer-icon-bubble">
                <MessageSquare size={18} />
              </div>
              <div>
                <h2 className="drawer-main-title">Direct Messages</h2>
                <span className="drawer-count-sub">
                  {authorizedConnections.length} {authorizedConnections.length === 1 ? 'conversation' : 'conversations'}
                </span>
              </div>
            </div>
          )}

          <div className="drawer-header-actions">
            {activeConnection && myRole === 'brand' && onViewProfile && activeConnection.creatorId && (
              <button
                type="button"
                className="btn btn-subtle btn-xs drawer-action-btn"
                onClick={() => onViewProfile(activeConnection.creatorId)}
                title="View Creator Portfolio"
              >
                <span>Portfolio</span>
                <ExternalLink size={12} />
              </button>
            )}
            <button
              type="button"
              className="drawer-close-btn"
              onClick={onClose}
              aria-label="Close Messages Drawer"
              id="global-messaging-close-btn"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body: Auth Wall OR Conversation List OR Active Chat Thread */}
        <div className="global-messaging-body">
          {!currentUser ? (
            <MessagesLoginWall
              isCompact={true}
              initialRole={currentUserRole || 'brand'}
              onLoginSuccess={onLoginSuccess}
              onOpenEmailLogin={onOpenLogin}
            />
          ) : !activeConnection ? (
            /* CONVERSATION LIST VIEW */
            <div className="global-messaging-list-view">
              {/* Search Bar */}
              <div className="drawer-search-wrap">
                <Search size={15} className="drawer-search-icon" />
                <input
                  type="text"
                  className="drawer-search-input"
                  placeholder="Search messages or partners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search conversations"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="drawer-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Conversations Stream */}
              <div className="drawer-conversations-stream">
                {displayedConversations.length === 0 ? (
                  searchQuery ? (
                    <div className="drawer-empty-state">
                      <div className="drawer-empty-icon-box">
                        <MessageSquare size={28} />
                      </div>
                      <h3 className="drawer-empty-title">No matching conversations</h3>
                      <p className="drawer-empty-desc">
                        Try searching with a different name or campaign keyword.
                      </p>
                    </div>
                  ) : (
                    <DirectMessagesEmptyState
                      role={myRole}
                      onExplore={onExplore ? () => { onClose(); onExplore(); } : undefined}
                    />
                  )
                ) : (
                  displayedConversations.map((conn) => {
                    const isSelected = conn.id === activeConnectionId;
                    const partnerName = myRole === 'brand' ? (conn.creatorName || 'Creator') : (conn.brandName || 'Brand Partner');
                    const partnerAvatar = myRole === 'brand' ? conn.creatorAvatar : (conn.brandLogo || conn.creatorAvatar);
                    const lastMsg = conn.messages && conn.messages.length > 0 
                      ? conn.messages[conn.messages.length - 1] 
                      : null;
                    const lastMsgText = lastMsg ? lastMsg.text : 'No messages yet';
                    const lastMsgTime = lastMsg ? (lastMsg.timestamp || 'Recently') : (conn.createdAt || 'Just now');
                    const isFromMe = lastMsg && lastMsg.sender === myRole;

                    return (
                      <div
                        key={conn.id}
                        className={`drawer-conversation-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => onSelectConnection(conn.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onSelectConnection(conn.id)}
                      >
                        <div className="drawer-card-avatar-wrap">
                          <img 
                            src={partnerAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"} 
                            alt={partnerName}
                            className="drawer-card-avatar"
                          />
                          <span className="drawer-card-online-dot" />
                        </div>
                        <div className="drawer-card-info">
                          <div className="drawer-card-top-row">
                            <span className="drawer-card-partner-name">{partnerName}</span>
                            <span className="drawer-card-time">{lastMsgTime}</span>
                          </div>
                          <div className="drawer-card-campaign-title">
                            {conn.campaignTitle || 'CreaMatch Project'}
                          </div>
                          <div className="drawer-card-preview-row">
                            <p className="drawer-card-preview-text">
                              {isFromMe ? <span className="preview-you">You: </span> : null}
                              {lastMsgText}
                            </p>
                            {conn.isUnread && <span className="drawer-unread-dot" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* ACTIVE CHAT THREAD VIEW */
            <div className="global-messaging-thread-view">
              {/* Context Banner */}
              <div className="drawer-context-banner">
                <Sparkles size={13} className="sparkle-gold-icon" />
                <span>
                  Connected via <strong>CreaMatch</strong> • {activeConnection.campaignTitle || 'Direct Collaboration'}
                </span>
              </div>

              {/* Message Stream */}
              <div className="drawer-messages-stream" role="log" aria-live="polite">
                {(() => {
                  const threadMessages = deduplicateMessages(activeConnection.messages || []);
                  if (threadMessages.length === 0) {
                    return (
                      <DirectMessagesEmptyState
                        type="empty-thread"
                        partnerName={otherPartyName}
                        role={myRole}
                      />
                    );
                  }
                  return threadMessages.map((msg, index) => {
                    const isMe = msg.sender === myRole;
                    const isPending = msg.isPending;
                    const isError = msg.isError;

                    return (
                      <div
                        key={msg.id || `msg-${index}`}
                        className={`drawer-bubble-row ${isMe ? 'row-mine' : 'row-theirs'}`}
                      >
                        {!isMe && (
                          <img 
                            src={otherPartyAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"} 
                            alt={msg.senderName || otherPartyName}
                            className="drawer-bubble-avatar"
                          />
                        )}
                        <div className={`drawer-bubble ${isMe ? 'bubble-mine' : 'bubble-theirs'} ${isPending ? 'bubble-pending' : ''} ${isError ? 'bubble-error' : ''}`}>
                          <div className="drawer-bubble-sender">
                            {msg.senderName || (isMe ? myName : otherPartyName)}
                          </div>
                          <div className="drawer-bubble-text">
                            {msg.text}
                          </div>
                          <div className="drawer-bubble-meta">
                            <span className="drawer-bubble-timestamp">{msg.timestamp || 'Just now'}</span>
                            {isMe && (
                              <span className="drawer-bubble-status">
                                {isPending ? (
                                  <Clock size={11} className="status-clock" title="Sending..." />
                                ) : isError ? (
                                  <AlertCircle size={11} className="status-error" title="Failed to deliver" />
                                ) : (
                                  <CheckCheck size={12} className="status-delivered" title="Delivered" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Error Alert Banner */}
              {sendError && (
                <div className="drawer-send-error-banner" role="alert">
                  <div className="error-banner-content">
                    <AlertCircle size={14} className="error-banner-icon" />
                    <span>{sendError}</span>
                  </div>
                  {lastFailedMessage && (
                    <button
                      type="button"
                      className="error-retry-btn"
                      onClick={() => handleSend(lastFailedMessage)}
                      disabled={isSending}
                    >
                      Retry
                    </button>
                  )}
                </div>
              )}

              {/* Composer */}
              <div className="drawer-composer-bar">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="drawer-composer-form"
                >
                  <textarea
                    ref={textareaRef}
                    className="drawer-composer-textarea"
                    placeholder={`Message ${otherPartyName}... (Enter to send, Shift+Enter for newline)`}
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      if (sendError) setSendError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    disabled={isSending}
                    rows={1}
                    aria-label="Type message"
                  />
                  <button
                    type="submit"
                    className="drawer-composer-send-btn"
                    disabled={!messageInput.trim() || isSending}
                    aria-label="Send message"
                    title={isSending ? 'Sending...' : 'Send message (Enter)'}
                  >
                    {isSending ? (
                      <span className="drawer-send-spinner" />
                    ) : (
                      <Send size={15} />
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
