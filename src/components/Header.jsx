// src/components/Header.jsx
// ALLOY — Clean Editorial Navigation Bar with Full Auth & Workspace Integration
// Minimal, elevated, typography-first header supporting both authenticated users & guests

import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, LogIn, LogOut, ChevronRight, Sparkles } from 'lucide-react';

export default function Header({ 
  currentView, 
  onNavigate, 
  onOpenCampaignModal, 
  onOpenCreatorModal,
  onOpenRoleSelect,
  onOpenLogin,
  onOpenForBrandsModal,
  onOpenForCreatorsModal,
  onOpenMessages,
  onOpenJudgeTour,
  activeCampaign,
  createdCreatorProfile,
  currentUser = null,
  onLogout = null
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open & handle Escape key
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  const handleLinkClick = (action) => {
    setMobileMenuOpen(false);
    if (typeof action === 'function') {
      action();
    }
  };

  const scrollToSection = (sectionId) => {
    setMobileMenuOpen(false);
    if (currentView !== 'home') {
      onNavigate('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Extract user details defensively
  const displayName = currentUser?.user_metadata?.full_name 
    || currentUser?.user_metadata?.name 
    || currentUser?.profile?.display_name 
    || currentUser?.display_name 
    || currentUser?.email?.split('@')[0] 
    || 'User';

  const avatarUrl = currentUser?.user_metadata?.avatar_url 
    || currentUser?.profile?.avatar_url 
    || currentUser?.avatar_url 
    || '';

  const rawRole = currentUser?.profile?.role 
    || currentUser?.user_metadata?.intended_role 
    || (currentUser?.role && currentUser.role !== 'authenticated' ? currentUser.role : null)
    || (typeof window !== 'undefined' ? localStorage.getItem('creasync_active_role') : null);

  const activeRole = (rawRole === 'creator' || rawRole === 'brand') ? rawRole : null;

  const handleGoToWorkspace = () => {
    if (activeRole === 'creator') {
      onNavigate('creator-workspace');
    } else if (activeRole === 'brand') {
      onNavigate('brand-workspace');
    } else if (typeof onOpenRoleSelect === 'function') {
      onOpenRoleSelect();
    } else {
      onNavigate('home');
    }
  };

  return (
    <header className={`header-nav ${scrolled ? 'header-scrolled' : ''}`}>
      <div className="header-container">
        
        {/* Brand Wordmark */}
        <a 
          href="#home" 
          className="logo-link alloy-logo-link"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick(() => onNavigate('home'));
          }}
          aria-label="Alloy Home"
        >
          <img 
            src="/assets/alloy-wordmark.webp" 
            alt="Alloy" 
            className="alloy-nav-wordmark-img" 
          />
        </a>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <ul className="nav-links">
            <li 
              className={`nav-item ${currentView === 'discover' ? 'active' : ''}`}
              onClick={() => handleLinkClick(() => onNavigate('discover'))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleLinkClick(() => onNavigate('discover'))}
            >
              Creators
            </li>
            <li 
              className="nav-item"
              onClick={() => handleLinkClick(() => scrollToSection('for-brands'))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleLinkClick(() => scrollToSection('for-brands'))}
            >
              For Brands
            </li>
            <li 
              className="nav-item"
              onClick={() => handleLinkClick(() => scrollToSection('how-it-works'))}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleLinkClick(() => scrollToSection('how-it-works'))}
            >
              How It Works
            </li>
          </ul>
        </nav>

        {/* Right Nav: Actions */}
        <div className="nav-actions">
          {onOpenJudgeTour && (
            <button 
              type="button" 
              className="header-tour-btn"
              onClick={onOpenJudgeTour}
              aria-label="Start Judge Demo Tour"
              id="header-judge-tour-btn"
              title="Interactive Judge Demo Walkthrough"
            >
              <Sparkles size={13} className="text-bronze" />
              <span>Judge Demo</span>
            </button>
          )}

          {currentUser ? (
            <div className="header-auth-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* User Identity Pill / Workspace Link */}
              <button
                type="button"
                onClick={handleGoToWorkspace}
                className="header-user-pill"
                title={`Enter ${activeRole === 'creator' ? 'Creator' : 'Brand'} Workspace`}
                id="header-user-profile-pill"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.75)',
                  border: '1px solid #E2DBD0',
                  borderRadius: '9999px',
                  padding: '4px 12px 4px 5px',
                  cursor: 'pointer'
                }}
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={displayName} 
                    style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} 
                  />
                ) : (
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#EDE5D8',
                    color: '#9E744A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="header-user-name" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#191816' }}>
                  {displayName}
                </span>
                {currentUser?.isDemoOnly && (
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: '#FAF3EA',
                    border: '1px solid #E5DAC8',
                    color: '#8F663B',
                    marginLeft: '4px'
                  }}>
                    Demo
                  </span>
                )}
              </button>


              {/* Workspace Action Button */}
              <button 
                type="button" 
                className="btn btn-primary btn-sm alloy-nav-btn header-workspace-btn"
                onClick={handleGoToWorkspace}
                aria-label="Open Workspace"
                id="header-workspace-btn"
              >
                <span>{activeRole === 'creator' ? 'Creator Studio' : activeRole === 'brand' ? 'Brand Studio' : 'Workspace'}</span>
                <ArrowRight size={13} />
              </button>

              {/* Log Out Button */}
              <button
                type="button"
                id="header-logout-btn"
                className="btn-link-login header-logout-btn"
                onClick={onLogout}
                aria-label="Log Out"
                title="Log Out"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <LogOut size={13} />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div className="header-anon-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                type="button" 
                className="btn-link-login"
                onClick={() => { window.location.hash = '/admin/login'; }}
                aria-label="Super Admin"
                id="header-admin-btn"
              >
                <span>Super Admin</span>
              </button>

              <button 
                type="button" 
                className="btn-link-login"
                onClick={onOpenLogin}
                aria-label="Log in"
                id="header-login-btn"
              >
                <span>Log in</span>
              </button>
              
              <button 
                type="button" 
                className="btn btn-primary btn-sm alloy-nav-btn header-get-started-btn"
                onClick={onOpenRoleSelect}
                aria-label="Get started"
                id="header-get-started-btn"
              >
                <span>Get Started</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-menu-btn"
            id="mobile-nav-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <>
          <div 
            className="mobile-drawer-overlay"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="mobile-menu-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
            <div className="mobile-drawer-header">
              <a 
                href="#home" 
                className="logo-link alloy-logo-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(() => onNavigate('home'));
                }}
              >
                <img 
                  src="/assets/alloy-wordmark.webp" 
                  alt="Alloy" 
                  className="alloy-nav-wordmark-img" 
                  style={{ height: '24px' }}
                />
              </a>
              <button
                type="button"
                className="mobile-drawer-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Drawer User Identity Card */}
            {currentUser && (
              <div 
                className="mobile-drawer-user-card"
                onClick={() => handleLinkClick(handleGoToWorkspace)}
                role="button"
                tabIndex={0}
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={displayName} 
                    className="mobile-drawer-avatar"
                  />
                ) : (
                  <div className="mobile-drawer-avatar-fallback">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="mobile-drawer-user-info">
                  <span className="mobile-drawer-user-name">{displayName}</span>
                  <span className="mobile-drawer-user-role">
                    {activeRole === 'creator' ? 'Creator Studio' : activeRole === 'brand' ? 'Brand Studio' : 'Workspace'}
                  </span>
                </div>
                <ChevronRight size={16} className="mobile-drawer-user-chevron" />
              </div>
            )}

            <ul className="mobile-nav-links">
              <li onClick={() => handleLinkClick(() => onNavigate('discover'))}>
                <span>Creators</span>
                <ChevronRight size={16} className="mobile-nav-chevron" />
              </li>
              <li onClick={() => handleLinkClick(() => scrollToSection('for-brands'))}>
                <span>For Brands</span>
                <ChevronRight size={16} className="mobile-nav-chevron" />
              </li>
              <li onClick={() => handleLinkClick(() => scrollToSection('how-it-works'))}>
                <span>How It Works</span>
                <ChevronRight size={16} className="mobile-nav-chevron" />
              </li>
            </ul>

            <div className="mobile-drawer-footer">
              {onOpenJudgeTour && (
                <button
                  type="button"
                  className="header-tour-btn w-full"
                  onClick={() => handleLinkClick(onOpenJudgeTour)}
                  style={{ justifyContent: 'center', padding: '12px 16px', marginBottom: '10px' }}
                  id="mobile-judge-tour-btn"
                >
                  <Sparkles size={14} className="text-bronze" />
                  <span>Start Judge Demo Tour</span>
                </button>
              )}
              {currentUser ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={() => handleLinkClick(handleGoToWorkspace)}
                  >
                    <span>{activeRole === 'creator' ? 'Creator Studio' : activeRole === 'brand' ? 'Brand Studio' : 'Workspace'}</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary w-full"
                    onClick={() => handleLinkClick(onLogout)}
                    style={{ color: '#b91c1c' }}
                  >
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary w-full"
                    onClick={() => handleLinkClick(() => { window.location.hash = '/admin/login'; })}
                  >
                    <span>Super Admin</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary w-full"
                    onClick={() => handleLinkClick(onOpenLogin)}
                  >
                    <span>Log in</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary w-full"
                    onClick={() => handleLinkClick(onOpenRoleSelect)}
                  >
                    <span>Get Started</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
