// src/components/ConversationModal.jsx
// Minimal, clean communication layer between Brand and Creator

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { deduplicateMessages } from '../services/marketplaceBackend';
import DirectMessagesEmptyState from './DirectMessagesEmptyState';

export default function ConversationModal({
  isOpen,
  onClose,
  connection,
  currentUserRole = 'brand', // 'brand' | 'creator'
  onSendMessage,
  onViewProfile
}) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, connection?.messages]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !connection) return null;

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setErrorMsg(null);

    try {
      if (onSendMessage) {
        await onSendMessage(connection.id, {
          sender: currentUserRole,
          senderName: currentUserRole === 'brand' ? connection.brandName : connection.creatorName,
          text: trimmed,
          timestamp: 'Just now'
        });
      }
      setInputText('');
    } catch (err) {
      console.error('[ConversationModal] Send failed:', err);
      setErrorMsg(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherPartyName = currentUserRole === 'brand' ? connection.creatorName : connection.brandName;
  const otherPartyRole = currentUserRole === 'brand' ? connection.creatorRole : connection.campaignTitle;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content conversation-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="conversation-header">
          <div className="conversation-header-left">
            <div className="conversation-avatar-wrap">
              <img 
                src={connection.creatorAvatar} 
                alt={connection.creatorName} 
                className="conversation-avatar-img"
              />
              <span className="conversation-online-dot" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="conversation-title">{otherPartyName}</h3>
                <span className="conversation-status-badge">
                  <CheckCircle2 size={12} />
                  <span>CONNECTED</span>
                </span>
              </div>
              <p className="conversation-subtitle">
                {connection.campaignTitle}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentUserRole === 'brand' && onViewProfile && (
              <button 
                type="button" 
                className="btn btn-subtle btn-sm"
                onClick={() => {
                  onClose();
                  onViewProfile(connection.creatorId);
                }}
              >
                <span>View Portfolio</span>
                <ArrowUpRight size={13} />
              </button>
            )}
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={onClose}
              aria-label="Close Conversation"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Quiet Context Banner */}
        <div className="conversation-context-banner">
          <Sparkles size={14} className="sparkle-gold-icon" />
          <span>
            Connected via <strong>CreaMatch</strong> • Both parties have agreed to explore this creative direction.
          </span>
        </div>

        {/* Message Stream */}
        <div className="conversation-messages-stream">
          {deduplicateMessages(connection.messages || []).length === 0 ? (
            <DirectMessagesEmptyState
              type="empty-thread"
              partnerName={otherPartyName}
              role={currentUserRole}
            />
          ) : (
            deduplicateMessages(connection.messages || []).map((msg) => {
              const isMe = msg.sender === currentUserRole;
              return (
                <div 
                  key={msg.id} 
                  className={`message-bubble-row ${isMe ? 'my-message-row' : 'their-message-row'}`}
                >
                  <div className={`message-bubble ${isMe ? 'my-bubble' : 'their-bubble'}`}>
                    <div className="message-sender-label">
                      {msg.senderName}
                    </div>
                    <div className="message-text">
                      {msg.text}
                    </div>
                    <div className="message-timestamp">
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error message if send failed */}
        {errorMsg && (
          <div style={{ padding: '8px 16px', background: '#FEF2F2', color: '#DC2626', fontSize: '0.8rem', borderTop: '1px solid #FEE2E2' }}>
            {errorMsg}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="conversation-input-bar">
          <textarea
            className="conversation-input-field"
            placeholder={`Message ${otherPartyName ? otherPartyName.split(' ')[0] : 'partner'}... (Enter to send, Shift+Enter for newline)`}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            onKeyDown={handleTextareaKeyDown}
            disabled={isSending}
            rows={1}
            style={{ resize: 'none', minHeight: '36px', maxHeight: '100px', padding: '8px 12px', fontFamily: 'inherit' }}
            autoFocus
          />
          <button 
            type="submit" 
            className="btn btn-primary btn-sm conversation-send-btn"
            disabled={!inputText.trim() || isSending}
          >
            <Send size={14} />
            <span>{isSending ? 'Sending...' : 'Send'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

