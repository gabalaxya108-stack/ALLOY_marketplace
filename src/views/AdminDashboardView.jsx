// src/views/AdminDashboardView.jsx
// ALLOY Super Admin — Master Executive Dashboard Container

import React, { useState, useEffect } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminOverview from '../components/admin/AdminOverview';
import AdminAlloyTrust from '../components/admin/AdminAlloyTrust';
import AdminBrandManagement from '../components/admin/AdminBrandManagement';
import AdminCreatorManagement from '../components/admin/AdminCreatorManagement';
import AdminCampaignManagement from '../components/admin/AdminCampaignManagement';
import AdminCollaborationTracking from '../components/admin/AdminCollaborationTracking';
import AdminAuditLog from '../components/admin/AdminAuditLog';
import AdminPlatformControls from '../components/admin/AdminPlatformControls';

import {
  fetchOverviewMetrics,
  fetchAdminBrands,
  fetchAdminCreators,
  fetchAdminCampaigns,
  fetchAdminCollaborations,
  fetchTrustReports,
  submitTrustDecision,
  fetchAuditLogs,
  fetchPlatformConfig,
  updatePlatformConfig,
  logoutAdmin
} from '../services/adminApi';
import { runAlloyTrustAnalysis } from '../services/alloyTrustEngine';
import {
  saveBrand as saveBackendBrand,
  saveCreator as saveBackendCreator,
  saveCampaign as saveBackendCampaign,
  saveCollaboration as saveBackendCollaboration
} from '../services/marketplaceBackend';
import { subscribeToMarketplace } from '../data/marketplaceStore';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { RefreshCw, Bell, Search } from 'lucide-react';

export default function AdminDashboardView({ adminUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Core Live Data States
  const [metrics, setMetrics] = useState({});
  const [trustReports, setTrustReports] = useState([]);
  const [brands, setBrands] = useState([]);
  const [creators, setCreators] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [collaborations, setCollaborations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [platformConfig, setPlatformConfig] = useState({});

  const loadAllData = async () => {
    try {
      const [
        metricsRes,
        reportsRes,
        brandsRes,
        creatorsRes,
        campaignsRes,
        collabsRes,
        auditRes,
        configRes
      ] = await Promise.allSettled([
        fetchOverviewMetrics(),
        fetchTrustReports(),
        fetchAdminBrands(),
        fetchAdminCreators(),
        fetchAdminCampaigns(),
        fetchAdminCollaborations(),
        fetchAuditLogs(),
        fetchPlatformConfig()
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value?.metrics) {
        setMetrics(metricsRes.value.metrics);
      }
      if (reportsRes.status === 'fulfilled' && reportsRes.value?.reports) {
        setTrustReports(reportsRes.value.reports);
      }
      if (brandsRes.status === 'fulfilled' && brandsRes.value?.brands) {
        setBrands(brandsRes.value.brands);
      }
      if (creatorsRes.status === 'fulfilled' && creatorsRes.value?.creators) {
        setCreators(creatorsRes.value.creators);
      }
      if (campaignsRes.status === 'fulfilled' && campaignsRes.value?.campaigns) {
        setCampaigns(campaignsRes.value.campaigns);
      }
      if (collabsRes.status === 'fulfilled' && collabsRes.value?.collaborations) {
        setCollaborations(collabsRes.value.collaborations);
      }
      if (auditRes.status === 'fulfilled' && auditRes.value?.logs) {
        setAuditLogs(auditRes.value.logs);
      }
      if (configRes.status === 'fulfilled' && configRes.value?.config) {
        setPlatformConfig(configRes.value.config);
      }

      setLastRefreshed(new Date());
      setLoadError(null);
    } catch (err) {
      console.error('Error loading admin dashboard state:', err);
      setLoadError(err.message || 'Failed to synchronize live records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // 1. Subscribe to local store changes (intra-tab & cross-tab events from website)
    const unsubStore = subscribeToMarketplace((latestState) => {
      if (latestState) {
        if (Array.isArray(latestState.brands) && latestState.brands.length > 0) {
          setBrands(latestState.brands);
        }
        if (Array.isArray(latestState.creators) && latestState.creators.length > 0) {
          setCreators(latestState.creators);
        }
        if (Array.isArray(latestState.campaigns) && latestState.campaigns.length > 0) {
          setCampaigns(latestState.campaigns);
        }
        if (Array.isArray(latestState.projects)) {
          setCollaborations(latestState.projects);
        }
        setLastRefreshed(new Date());
      }
    });

    // 2. Subscribe to Supabase Cloud Realtime changes for instant multi-user synchronisation
    let realtimeChannel = null;
    if (isSupabaseConfigured() && supabase) {
      try {
        realtimeChannel = supabase.channel('alloy-admin-realtime-feed')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'brands' }, () => loadAllData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'creator_profiles' }, () => loadAllData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => loadAllData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'collaborations' }, () => loadAllData())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_funding' }, () => loadAllData())
          .subscribe();
      } catch (subErr) {
        console.warn('[Admin Live Feed] Realtime subscription notice:', subErr);
      }
    }

    // Auto-refresh fallback every 60 seconds
    const interval = setInterval(() => {
      loadAllData();
    }, 60000);

    return () => {
      clearInterval(interval);
      if (typeof unsubStore === 'function') unsubStore();
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Submit Trust Decision
  const handleSubmitDecision = async (decisionPayload) => {
    await submitTrustDecision(decisionPayload);
    // Refresh reports and audit logs
    const [reportsRes, auditRes] = await Promise.all([
      fetchTrustReports(),
      fetchAuditLogs()
    ]);
    if (reportsRes.reports) setTrustReports(reportsRes.reports);
    if (auditRes.logs) setAuditLogs(auditRes.logs);
  };

  // Run Real-Time Platform Safety Scan
  const handleRunTrustScan = async () => {
    // Run evaluation against an active campaign or brand
    const targetCampaign = campaigns[0] || { id: 'cmp-01', title: 'Seasonal Collection', budget: '₹85,000' };
    const scanResult = await runAlloyTrustAnalysis({
      entityType: 'campaign',
      entityId: targetCampaign.id,
      entityName: targetCampaign.title,
      contentPayload: targetCampaign
    });

    const newReport = {
      id: scanResult.reportId,
      entity_type: scanResult.entityType,
      entity_id: scanResult.entityId,
      entity_name: scanResult.entityName,
      risk_score: scanResult.riskScore,
      risk_category: scanResult.riskCategory,
      status: scanResult.riskScore > 60 ? 'needs_review' : 'cleared',
      summary: scanResult.summary,
      signals: scanResult.signalsTriggered,
      created_at: scanResult.timestamp
    };

    setTrustReports(prev => [newReport, ...prev]);
  };

  // --- BRAND MANAGEMENT HANDLERS (DB + STORE SYNC) ---
  const handleUpdateBrandStatus = async (brandId, status) => {
    setBrands(prev => prev.map(b => b.id === brandId ? { ...b, status } : b));
    const target = brands.find(b => b.id === brandId);
    if (target) {
      const updated = { ...target, status, updatedAt: new Date().toISOString() };
      try {
        await saveBackendBrand(updated);
      } catch (err) {
        console.warn('[Admin] Failed to persist brand status change to DB:', err);
      }
    }
  };

  const handleEditBrand = async (updatedBrand) => {
    if (!updatedBrand || !updatedBrand.id) return;
    setBrands(prev => prev.map(b => b.id === updatedBrand.id ? { ...b, ...updatedBrand } : b));
    try {
      await saveBackendBrand(updatedBrand);
    } catch (err) {
      console.warn('[Admin] Failed to persist brand edits to DB:', err);
    }
  };

  // --- CREATOR MANAGEMENT HANDLERS (DB + STORE SYNC) ---
  const handleUpdateCreatorStatus = async (creatorId, status) => {
    setCreators(prev => prev.map(c => c.id === creatorId ? { ...c, status } : c));
    const target = creators.find(c => c.id === creatorId);
    if (target) {
      const updated = { ...target, status, updatedAt: new Date().toISOString() };
      try {
        await saveBackendCreator(updated);
      } catch (err) {
        console.warn('[Admin] Failed to persist creator status change to DB:', err);
      }
    }
  };

  const handleEditCreator = async (updatedCreator) => {
    if (!updatedCreator || !updatedCreator.id) return;
    setCreators(prev => prev.map(c => c.id === updatedCreator.id ? { ...c, ...updatedCreator } : c));
    try {
      await saveBackendCreator(updatedCreator);
    } catch (err) {
      console.warn('[Admin] Failed to persist creator edits to DB:', err);
    }
  };

  // --- CAMPAIGN MANAGEMENT HANDLERS (DB + STORE SYNC) ---
  const handleUpdateCampaignStatus = async (campaignId, status) => {
    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status } : c));
    const target = campaigns.find(c => c.id === campaignId);
    if (target) {
      const updated = { ...target, status, updatedAt: new Date().toISOString() };
      try {
        await saveBackendCampaign(updated);
      } catch (err) {
        console.warn('[Admin] Failed to persist campaign status change to DB:', err);
      }
    }
  };

  const handleEditCampaign = async (updatedCampaign) => {
    if (!updatedCampaign || !updatedCampaign.id) return;
    setCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? { ...c, ...updatedCampaign } : c));
    try {
      await saveBackendCampaign(updatedCampaign);
    } catch (err) {
      console.warn('[Admin] Failed to persist campaign edits to DB:', err);
    }
  };

  // --- COLLABORATION MANAGEMENT HANDLERS (DB + STORE SYNC) ---
  const handleEditCollaboration = async (updatedCollab) => {
    if (!updatedCollab || !updatedCollab.id) return;
    setCollaborations(prev => prev.map(c => c.id === updatedCollab.id ? { ...c, ...updatedCollab } : c));
    try {
      await saveBackendCollaboration(updatedCollab);
    } catch (err) {
      console.warn('[Admin] Failed to persist collaboration edits to DB:', err);
    }
  };

  // Save Platform Config
  const handleSaveConfig = async (formData) => {
    for (const [key, val] of Object.entries(formData)) {
      await updatePlatformConfig(key, val, `Updated via Platform Controls`);
    }
    setPlatformConfig(formData);
    const auditRes = await fetchAuditLogs();
    if (auditRes.logs) setAuditLogs(auditRes.logs);
  };

  const handleLogoutAdmin = async () => {
    await logoutAdmin();
    if (onLogout) {
      onLogout();
    } else {
      window.location.hash = '';
    }
  };

  const pendingReportsCount = trustReports.filter(r => r.status === 'needs_review' || r.status === 'under_investigation').length;

  return (
    <div className="alloy-admin-dashboard-container">
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingReportsCount={pendingReportsCount}
        adminUser={adminUser}
        onLogout={handleLogoutAdmin}
      />

      {/* Main Workspace Content */}
      <main className="alloy-admin-main-stage">
        {/* Top Header Bar */}
        <header className="alloy-admin-top-nav">
          <div className="alloy-admin-top-left">
            <span className="alloy-admin-breadcrumb-root">ALLOY Console</span>
            <span className="alloy-admin-breadcrumb-sep">/</span>
            <span className="alloy-admin-breadcrumb-active">
              {activeTab === 'overview' && 'Platform Overview'}
              {activeTab === 'alloy-trust' && 'AlloyTrust Command'}
              {activeTab === 'brands' && 'Brand Registry'}
              {activeTab === 'creators' && 'Creator Network'}
              {activeTab === 'campaigns' && 'Campaign Oversight'}
              {activeTab === 'collaborations' && 'Collaboration Tracking'}
              {activeTab === 'audit' && 'Security Audit Log'}
              {activeTab === 'controls' && 'Platform Controls'}
            </span>
          </div>

          <div className="alloy-admin-top-right">
            <button
              type="button"
              className="alloy-admin-icon-btn"
              onClick={handleRefresh}
              title="Refresh Live Data"
              disabled={refreshing}
              id="admin-refresh-btn"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <div className="alloy-admin-status-pill" title="Connected to Supabase project">
              <span className="alloy-admin-status-dot" style={{ backgroundColor: '#10b981' }} />
              <span>Live Supabase • {lastRefreshed ? `Synced ${lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'Connecting...'}</span>
            </div>
          </div>
        </header>

        {loadError && (
          <div className="alloy-admin-alert-banner" style={{ margin: '16px 24px 0' }}>
            <span>{loadError}</span>
          </div>
        )}

        {/* View Section Switcher */}
        <div className="alloy-admin-content-viewport">
          {loading ? (
            <div className="alloy-admin-loading-state">
              <RefreshCw size={24} className="animate-spin text-amber-400" />
              <span>Synchronizing Super Admin Datastore...</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <AdminOverview
                  metrics={metrics}
                  trustReports={trustReports}
                  onNavigateTab={setActiveTab}
                  onRunScan={handleRunTrustScan}
                />
              )}

              {activeTab === 'alloy-trust' && (
                <AdminAlloyTrust
                  reports={trustReports}
                  onSubmitDecision={handleSubmitDecision}
                  onRunTrustScan={handleRunTrustScan}
                />
              )}

              {activeTab === 'brands' && (
                <AdminBrandManagement
                  brands={brands}
                  onUpdateBrandStatus={handleUpdateBrandStatus}
                  onEditBrand={handleEditBrand}
                />
              )}

              {activeTab === 'creators' && (
                <AdminCreatorManagement
                  creators={creators}
                  onUpdateCreatorStatus={handleUpdateCreatorStatus}
                  onEditCreator={handleEditCreator}
                />
              )}

              {activeTab === 'campaigns' && (
                <AdminCampaignManagement
                  campaigns={campaigns}
                  onUpdateCampaignStatus={handleUpdateCampaignStatus}
                  onEditCampaign={handleEditCampaign}
                />
              )}

              {activeTab === 'collaborations' && (
                <AdminCollaborationTracking
                  collaborations={collaborations}
                  onInterveneCollab={() => setActiveTab('alloy-trust')}
                  onEditCollaboration={handleEditCollaboration}
                />
              )}

              {activeTab === 'audit' && (
                <AdminAuditLog
                  auditLogs={auditLogs}
                />
              )}

              {activeTab === 'controls' && (
                <AdminPlatformControls
                  config={platformConfig}
                  onSaveConfig={handleSaveConfig}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
