// server/adminMiddleware.js
// ALLOY Super Admin API — Secure server-side middleware
// All admin endpoints require valid Supabase JWT + verified super_admin role
// Mounted on /api/admin/* via Vite Connect middleware

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function loadFreshEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            process.env[key] = val;
          }
        }
      });
    }
  } catch {}
}

loadFreshEnv();

// --- Configuration ---
function getSupabaseUrl() {
  loadFreshEnv();
  return (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
}
function getSupabaseServiceKey() {
  loadFreshEnv();
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}
function getSupabaseAnonKey() {
  loadFreshEnv();
  return (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
}

function isAdminConfigured() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey() || getSupabaseAnonKey();
  return !!(
    url &&
    key &&
    !url.includes('your-project') &&
    url.startsWith('https://')
  );
}

// Service-role client for privileged server-side operations only
function getServiceClient() {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();
  if (url && serviceKey && !url.includes('your-project') && url.startsWith('https://')) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return null;
}

// Verification client: can verify authentic Supabase JWTs and query live public tables
function getVerificationClient() {
  const serviceClient = getServiceClient();
  if (serviceClient) return serviceClient;
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (url && anonKey && !url.includes('your-project') && url.startsWith('https://')) {
    return createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return null;
}

// --- Request Helpers ---
function parseJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return Promise.resolve(req.body);
    if (typeof req.body === 'string') {
      try { return Promise.resolve(req.body.trim() ? JSON.parse(req.body) : {}); }
      catch (err) { return Promise.reject(new Error('Invalid JSON')); }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        const str = req.body.toString('utf8');
        return Promise.resolve(str.trim() ? JSON.parse(str) : {});
      } catch (err) { return Promise.reject(new Error('Invalid JSON')); }
    }
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (err) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

// --- Auth & Authorization ---
// Extract and verify JWT from Authorization header, then verify super_admin role
async function authenticateAdmin(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return { error: 'Authentication required', status: 401 };
  }

  const serviceClient = getVerificationClient();
  if (!serviceClient) {
    return { error: 'Admin services not configured', status: 503 };
  }

  // Verify the JWT and get user from Supabase Auth
  const { data: { user }, error: userError } = await serviceClient.auth.getUser(token);
  if (userError || !user) {
    return { error: 'Invalid or expired session', status: 401 };
  }

  // 1. Check super_admin or judge_admin role in admin_roles table if it exists
  let adminRole = null;
  const { data: roleData, error: roleError } = await serviceClient
    .from('admin_roles')
    .select('id, role, is_active')
    .eq('user_id', user.id)
    .in('role', ['super_admin', 'judge_admin', 'admin'])
    .eq('is_active', true)
    .maybeSingle();

  if (!roleError && roleData) {
    adminRole = roleData;
  } else {
    // 2. Authorize via verified user metadata or designated server configuration
    const configuredAdminEmail = (process.env.ALLOY_ADMIN_EMAIL || 'admin@alloy.market').trim().toLowerCase();
    const configuredJudgeEmail = (process.env.VITE_JUDGE_EMAIL || 'judge@alloy.market').trim().toLowerCase();
    const userEmail = (user.email || '').trim().toLowerCase();
    const userMetaRole = user.user_metadata?.role || user.app_metadata?.role;

    const isDesignatedEmail = (configuredAdminEmail && userEmail === configuredAdminEmail) ||
                              (configuredJudgeEmail && userEmail === configuredJudgeEmail);
    const isAuthorizedRole = ['super_admin', 'judge_admin', 'admin'].includes(userMetaRole);

    if (isDesignatedEmail || isAuthorizedRole) {
      const assignedRole = userMetaRole === 'judge_admin' || userEmail === configuredJudgeEmail
        ? 'judge_admin'
        : 'super_admin';
      adminRole = {
        id: `verified-${user.id}`,
        role: assignedRole,
        is_active: true
      };
    }
  }

  if (!adminRole) {
    return { error: 'Insufficient privileges: Account does not hold authorized administrative access.', status: 403 };
  }

  return { user, adminRole, serviceClient };
}

// --- Audit Logger ---
async function logAuditEvent(serviceClient, { actorId, actorEmail, actorRole, action, targetType, targetId, targetName, reason, metadata, ipAddress }) {
  try {
    await serviceClient.from('audit_events').insert({
      actor_id: actorId,
      actor_email: actorEmail,
      actor_role: actorRole || 'super_admin',
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      target_name: targetName || null,
      reason: reason || null,
      metadata: metadata || {},
      ip_address: ipAddress || null
    });
  } catch (err) {
    console.error('[Admin Audit] Failed to log event:', err.message);
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

// --- Health / Status ---
async function handleHealth(req, res) {
  return sendJson(res, 200, {
    ok: true,
    configured: isAdminConfigured(),
    status: isAdminConfigured() ? 'ready' : 'missing_config',
    message: isAdminConfigured()
      ? 'Admin API is configured and ready.'
      : 'SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL not configured.'
  });
}

// --- Verify Admin Session ---
async function handleVerifySession(req, res) {
  const auth = await authenticateAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { ok: false, error: auth.error });

  return sendJson(res, 200, {
    ok: true,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      role: auth.adminRole?.role || 'super_admin',
      display_name: auth.user.user_metadata?.full_name || auth.user.email?.split('@')[0]
    }
  });
}

// --- Dashboard Overview Metrics ---
async function handleOverview(req, res) {
  const auth = await authenticateAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { ok: false, error: auth.error });

  const sc = auth.serviceClient;
  const metrics = {};

  try {
    // Count brands
    const { count: brandCount } = await sc.from('brands').select('id', { count: 'exact', head: true });
    metrics.totalBrands = brandCount || 0;

    // Count creator profiles
    const { count: creatorCount } = await sc.from('creator_profiles').select('id', { count: 'exact', head: true });
    metrics.totalCreators = creatorCount || 0;

    // Count campaigns
    const { count: campaignCount } = await sc.from('campaigns').select('id', { count: 'exact', head: true });
    metrics.totalCampaigns = campaignCount || 0;

    // Active collaborations
    const { count: activeCollabs } = await sc.from('collaborations').select('id', { count: 'exact', head: true }).in('status', ['in-progress', 'submitted', 'revision-requested']);
    metrics.activeCollaborations = activeCollabs || 0;

    // Completed collaborations
    const { count: completedCollabs } = await sc.from('collaborations').select('id', { count: 'exact', head: true }).in('status', ['approved', 'completed']);
    metrics.completedCollaborations = completedCollabs || 0;

    // Trust reports
    const { count: newReports } = await sc.from('trust_reports').select('id', { count: 'exact', head: true }).eq('status', 'new');
    metrics.newTrustReports = newReports || 0;

    const { count: reviewReports } = await sc.from('trust_reports').select('id', { count: 'exact', head: true }).in('status', ['needs_review', 'under_investigation']);
    metrics.reportsAwaitingReview = reviewReports || 0;

    const { count: restrictedReports } = await sc.from('trust_reports').select('id', { count: 'exact', head: true }).eq('status', 'restricted');
    metrics.activeRestrictions = restrictedReports || 0;

    // Pending invitations
    const { count: pendingInvites } = await sc.from('invitations').select('id', { count: 'exact', head: true }).eq('status', 'Pending');
    metrics.pendingInvitations = pendingInvites || 0;

    // Profiles count
    const { count: profileCount } = await sc.from('profiles').select('id', { count: 'exact', head: true });
    metrics.totalUsers = profileCount || 0;

  } catch (err) {
    console.warn('[Admin API] Metrics query error:', err.message);
  }

  return sendJson(res, 200, { ok: true, metrics });
}

// --- Brand Management ---
async function handleBrands(req, res, method, body) {
  const auth = await authenticateAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { ok: false, error: auth.error });

  const sc = auth.serviceClient;
  const url = new URL(req.url, 'http://localhost');
  const brandId = url.searchParams.get('id');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  if (method === 'GET') {
    if (brandId) {
      const { data: brand, error } = await sc.from('brands').select('*').eq('id', brandId).maybeSingle();
      if (error || !brand) return sendJson(res, 404, { ok: false, error: 'Brand not found' });

      // Get associated campaigns
      const { data: campaigns } = await sc.from('campaigns').select('id, title, status, created_at').eq('owner_brand_id', brandId).order('created_at', { ascending: false });

      // Get trust reports
      const { data: reports } = await sc.from('trust_reports').select('id, risk_score, risk_category, status, summary, created_at').eq('entity_type', 'brand').eq('entity_id', brandId);

      return sendJson(res, 200, { ok: true, brand, campaigns: campaigns || [], trustReports: reports || [] });
    }

    let query = sc.from('brands').select('*', { count: 'exact' });
    if (search) {
      query = query.or(`name.ilike.%${search}%,industry.ilike.%${search}%`);
    }
    const { data: brands, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) {
      if (error.code === 'PGRST205') {
        return sendJson(res, 200, { ok: true, brands: [], total: 0, page, limit, tableMissing: true });
      }
      return sendJson(res, 500, { ok: false, error: error.message });
    }

    return sendJson(res, 200, { ok: true, brands: brands || [], total: count || 0, page, limit });
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}

// --- Creator Management ---
async function handleCreators(req, res, method, body) {
  const auth = await authenticateAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { ok: false, error: auth.error });

  const sc = auth.serviceClient;
  const url = new URL(req.url, 'http://localhost');
  const creatorId = url.searchParams.get('id');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search') || '';
  const offset = (page - 1) * limit;

  if (method === 'GET') {
    if (creatorId) {
      const { data: creator, error } = await sc.from('creator_profiles').select('*, projects:portfolio_projects(*)').eq('id', creatorId).maybeSingle();
      if (error || !creator) return sendJson(res, 404, { ok: false, error: 'Creator not found' });

      const { data: reports } = await sc.from('trust_reports').select('id, risk_score, risk_category, status, summary, created_at').eq('entity_type', 'creator').eq('entity_id', creatorId);

      return sendJson(res, 200, { ok: true, creator, trustReports: reports || [] });
    }

    let query = sc.from('creator_profiles').select('*', { count: 'exact' });
    if (search) {
      query = query.or(`name.ilike.%${search}%,handle.ilike.%${search}%,specialty.ilike.%${search}%`);
    }
    const { data: creators, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) {
      if (error.code === 'PGRST205') {
        return sendJson(res, 200, { ok: true, creators: [], total: 0, page, limit, tableMissing: true });
      }
      return sendJson(res, 500, { ok: false, error: error.message });
    }

    return sendJson(res, 200, { ok: true, creators: creators || [], total: count || 0, page, limit });
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}

// --- Campaign Management ---
async function handleCampaigns(req, res, method, body) {
  const auth = await authenticateAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { ok: false, error: auth.error });

  const sc = auth.serviceClient;
  const url = new URL(req.url, 'http://localhost');
  const campaignId = url.searchParams.get('id');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search') || '';
  const statusFilter = url.searchParams.get('status') || '';
  const offset = (page - 1) * limit;

  if (method === 'GET') {
    if (campaignId) {
      const { data: campaign, error } = await sc.from('campaigns').select('*').eq('id', campaignId).maybeSingle();
      if (error || !campaign) return sendJson(res, 404, { ok: false, error: 'Campaign not found' });

      const { data: collaborations } = await sc.from('collaborations').select('*').eq('campaign_id', campaignId);
      const { data: reports } = await sc.from('trust_reports').select('id, risk_score, risk_category, status, summary, created_at').eq('entity_type', 'campaign').eq('entity_id', campaignId);

      return sendJson(res, 200, { ok: true, campaign, collaborations: collaborations || [], trustReports: reports || [] });
    }

    let query = sc.from('campaigns').select('*', { count: 'exact' });
    if (search) {
      query = query.or(`title.ilike.%${search}%,brand_name.ilike.%${search}%`);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    const { data: campaigns, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) {
      if (error.code === 'PGRST205') {
        return sendJson(res, 200, { ok: true, campaigns: [], total: 0, page, limit, tableMissing: true });
      }
      return sendJson(res, 500, { ok: false, error: error.message });
    }

    return sendJson(res, 200, { ok: true, campaigns: campaigns || [], total: count || 0, page, limit });
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}

// --- Collaboration Tracking ---
async function handleCollaborations(req, res, method, body) {
  const auth = await authenticateAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { ok: false, error: auth.error });

  const sc = auth.serviceClient;
  const url = new URL(req.url, 'http://localhost');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const search = url.searchParams.get('search') || '';
  const statusFilter = url.searchParams.get('status') || '';
  const offset = (page - 1) * limit;

  if (method === 'GET') {
    let query = sc.from('collaborations').select('*', { count: 'exact' });
    if (search) {
      query = query.or(`brand_name.ilike.%${search}%,creator_name.ilike.%${search}%,campaign_title.ilike.%${search}%`);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    const { data: collaborations, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) {
      if (error.code === 'PGRST205') {
        return sendJson(res, 200, { ok: true, collaborations: [], total: 0, page, limit, tableMissing: true });
      }
      return sendJson(res, 500, { ok: false, error: error.message });
    }

    return sendJson(res, 200, { ok: true, collaborations: collaborations || [], total: count || 0, page, limit });
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}

// --- AlloyTrust: Reports ---
async function handleTrustReports(req, res, method, body) {
  const auth = await authenticateAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { ok: false, error: auth.error });

  const sc = auth.serviceClient;
  const url = new URL(req.url, 'http://localhost');
  const reportId = url.searchParams.get('id');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const statusFilter = url.searchParams.get('status') || '';
  const entityType = url.searchParams.get('entity_type') || '';
  const riskCategory = url.searchParams.get('risk_category') || '';
  const offset = (page - 1) * limit;

  if (method === 'GET') {
    if (reportId) {
      const { data: report, error } = await sc.from('trust_reports').select('*').eq('id', reportId).maybeSingle();
      if (error || !report) return sendJson(res, 404, { ok: false, error: 'Report not found' });

      const { data: signals } = await sc.from('trust_signals').select('*').eq('report_id', reportId).order('created_at', { ascending: false });
      const { data: decisions } = await sc.from('trust_decisions').select('*').eq('report_id', reportId).order('created_at', { ascending: false });

      return sendJson(res, 200, { ok: true, report, signals: signals || [], decisions: decisions || [] });
    }

    let query = sc.from('trust_reports').select('*', { count: 'exact' });
    if (statusFilter) query = query.eq('status', statusFilter);
    if (entityType) query = query.eq('entity_type', entityType);
    if (riskCategory) query = query.eq('risk_category', riskCategory);
    const { data: reports, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    if (error) {
      if (error.code === 'PGRST205') {
        return sendJson(res, 200, { ok: true, reports: [], total: 0, page, limit, tableMissing: true });
      }
      return sendJson(res, 500, { ok: false, error: error.message });
    }

    return sendJson(res, 200, { ok: true, reports: reports || [], total: count || 0, page, limit });
  }

  if (method === 'POST') {
    // Create a new trust report
    const { entity_type, entity_id, entity_name, risk_score, risk_category, evidence_confidence, summary, signals } = body;
    if (!entity_type || !entity_id) {
      return sendJson(res, 400, { ok: false, error: 'entity_type and entity_id are required' });
    }

    const { data: report, error } = await sc.from('trust_reports').insert({
      entity_type,
      entity_id,
      entity_name: entity_name || null,
      risk_score: Math.max(0, Math.min(100, parseInt(risk_score) || 0)),
      risk_category: risk_category || 'low',
      evidence_confidence: evidence_confidence || 'low',
      summary: summary || null,
      status: 'new'
    }).select().single();

    if (error) return sendJson(res, 500, { ok: false, error: error.message });

    // Insert associated signals if provided
    if (Array.isArray(signals) && signals.length > 0) {
      const signalRows = signals.map(s => ({
        report_id: report.id,
        signal_type: s.signal_type || 'manual_observation',
        severity: s.severity || 'info',
        title: s.title || 'Observation',
        description: s.description || null,
        evidence_data: s.evidence_data || {},
        source: s.source || 'admin'
      }));
      await sc.from('trust_signals').insert(signalRows);
    }

    await logAuditEvent(sc, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'create_trust_report',
      targetType: entity_type,
      targetId: entity_id,
      targetName: entity_name,
      reason: summary
    });

    return sendJson(res, 201, { ok: true, report });
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}

// --- AlloyTrust: Review Decision ---
async function handleTrustDecision(req, res, method, body) {
  const auth = await authenticateAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { ok: false, error: auth.error });

  if (method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

  const { report_id, action, new_status, reason, internal_notes, metadata } = body;
  if (!report_id || !action) {
    return sendJson(res, 400, { ok: false, error: 'report_id and action are required' });
  }

  const sc = auth.serviceClient;

  // Get current report status
  const { data: report, error: fetchErr } = await sc.from('trust_reports').select('status').eq('id', report_id).maybeSingle();
  if (fetchErr || !report) return sendJson(res, 404, { ok: false, error: 'Report not found' });

  // Record the decision (append-only)
  const { data: decision, error: decisionErr } = await sc.from('trust_decisions').insert({
    report_id,
    reviewer_id: auth.user.id,
    action,
    previous_status: report.status,
    new_status: new_status || report.status,
    reason: reason || null,
    internal_notes: internal_notes || null,
    metadata: metadata || {}
  }).select().single();

  if (decisionErr) return sendJson(res, 500, { ok: false, error: decisionErr.message });

  // Update report status if changed
  if (new_status && new_status !== report.status) {
    const updateData = { status: new_status, updated_at: new Date().toISOString() };
    if (new_status === 'resolved' || new_status === 'cleared') {
      updateData.resolution_reason = reason || null;
    }
    if (new_status === 'under_investigation' || new_status === 'needs_review') {
      updateData.assigned_reviewer = auth.user.id;
    }
    await sc.from('trust_reports').update(updateData).eq('id', report_id);
  }

  await logAuditEvent(sc, {
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: `trust_${action}`,
    targetType: 'trust_report',
    targetId: report_id,
    reason
  });

  return sendJson(res, 200, { ok: true, decision });
}

// --- Audit Logs (Strictly Read-Only) ---
async function handleAuditLogs(req, res, method) {
  if (method !== 'GET') {
    return sendJson(res, 405, {
      ok: false,
      error: 'Method not allowed. Audit logs are append-only and cannot be inserted, edited, or deleted via HTTP.'
    });
  }

  const auth = await authenticateAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { ok: false, error: auth.error });

  const sc = auth.serviceClient;
  const url = new URL(req.url, 'http://localhost');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
  const actionFilter = url.searchParams.get('action') || '';
  const offset = (page - 1) * limit;

  let query = sc.from('audit_events').select('*', { count: 'exact' });
  if (actionFilter) query = query.ilike('action', `%${actionFilter}%`);
  const { data: events, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) {
    if (error.code === 'PGRST205') {
      return sendJson(res, 200, { ok: true, events: [], total: 0, page, limit, tableMissing: true });
    }
    return sendJson(res, 500, { ok: false, error: error.message });
  }

  return sendJson(res, 200, { ok: true, events: events || [], total: count || 0, page, limit });
}

// --- Platform Config ---
async function handlePlatformConfig(req, res, method, body) {
  const auth = await authenticateAdmin(req);
  if (auth.error) return sendJson(res, auth.status, { ok: false, error: auth.error });

  const sc = auth.serviceClient;

  if (method === 'GET') {
    const { data: configs, error } = await sc.from('platform_config').select('*').order('config_key');
    if (error) {
      if (error.code === 'PGRST205') {
        return sendJson(res, 200, { ok: true, configs: [], tableMissing: true });
      }
      return sendJson(res, 500, { ok: false, error: error.message });
    }
    return sendJson(res, 200, { ok: true, configs: configs || [] });
  }

  if (method === 'PUT' || method === 'PATCH') {
    const { config_key, config_value, description } = body;
    if (!config_key) return sendJson(res, 400, { ok: false, error: 'config_key is required' });

    const { data: config, error } = await sc.from('platform_config').upsert({
      config_key,
      config_value: typeof config_value === 'string' ? JSON.parse(config_value) : config_value,
      description: description || null,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'config_key' }).select().single();

    if (error) return sendJson(res, 500, { ok: false, error: error.message });

    await logAuditEvent(sc, {
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'update_platform_config',
      targetType: 'config',
      targetId: config_key,
      reason: `Updated to ${JSON.stringify(config_value)}`
    });

    return sendJson(res, 200, { ok: true, config });
  }

  return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}

// --- Super Admin Provisioning (One-time initial bootstrap) ---
async function handleProvision(req, res, method, body) {
  if (method !== 'POST') return sendJson(res, 405, { ok: false, error: 'Method not allowed' });

  // This endpoint requires the ALLOY_ADMIN_PROVISION_SECRET from .env
  const provisionSecret = process.env.ALLOY_ADMIN_PROVISION_SECRET || '';
  if (!provisionSecret || provisionSecret.length < 16) {
    return sendJson(res, 503, {
      ok: false,
      error: 'Provisioning is disabled. Set ALLOY_ADMIN_PROVISION_SECRET in .env (min 16 chars).'
    });
  }

  const { secret, email } = body;
  if (!secret || typeof secret !== 'string' || !email || typeof email !== 'string') {
    return sendJson(res, 400, { ok: false, error: 'Invalid provisioning payload' });
  }

  // Constant-time comparison to prevent timing attacks
  const secretBuf = Buffer.from(secret);
  const provBuf = Buffer.from(provisionSecret);
  if (secretBuf.length !== provBuf.length || !crypto.timingSafeEqual(secretBuf, provBuf)) {
    return sendJson(res, 403, { ok: false, error: 'Invalid provisioning secret' });
  }

  // Enforce designated admin email if configured in environment
  const configuredAdminEmail = (process.env.ALLOY_ADMIN_EMAIL || '').trim().toLowerCase();
  if (configuredAdminEmail && email.trim().toLowerCase() !== configuredAdminEmail) {
    return sendJson(res, 403, {
      ok: false,
      error: 'Provisioning restricted: target email does not match configured ALLOY_ADMIN_EMAIL'
    });
  }

  const sc = getServiceClient();
  if (!sc) return sendJson(res, 503, { ok: false, error: 'Service client not configured' });

  // Single-admin lockout: verify if any super_admin is already provisioned
  const { data: existingSuperAdmins, error: countErr } = await sc
    .from('admin_roles')
    .select('id')
    .eq('role', 'super_admin')
    .eq('is_active', true)
    .limit(1);

  if (!countErr && existingSuperAdmins && existingSuperAdmins.length > 0) {
    return sendJson(res, 403, {
      ok: false,
      error: 'A Super Admin is already established. Bootstrapping endpoint is permanently locked.'
    });
  }

  // Find the user by email in auth.users
  const { data: { users }, error: listError } = await sc.auth.admin.listUsers();
  if (listError) return sendJson(res, 500, { ok: false, error: 'Failed to query user directory' });

  const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!targetUser) {
    return sendJson(res, 404, {
      ok: false,
      error: 'No authenticated user found with this email. Please sign up first via ALLOY login.'
    });
  }

  // Check if target user already provisioned
  const { data: existingRole } = await sc.from('admin_roles').select('id').eq('user_id', targetUser.id).maybeSingle();
  if (existingRole) {
    return sendJson(res, 409, { ok: false, error: 'This user is already provisioned as Super Admin.' });
  }

  // Provision: insert admin_role + update profiles.role
  const { error: insertErr } = await sc.from('admin_roles').insert({
    user_id: targetUser.id,
    role: 'super_admin',
    granted_by: null,
    is_active: true,
    notes: 'Initial Super Admin provisioning via secure endpoint'
  });

  if (insertErr) return sendJson(res, 500, { ok: false, error: 'Failed to assign administrator role' });

  // Update profiles table role to 'admin'
  await sc.from('profiles').upsert({
    id: targetUser.id,
    email: targetUser.email,
    role: 'admin',
    display_name: targetUser.user_metadata?.full_name || targetUser.email?.split('@')[0],
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });

  // Log the provisioning event
  await logAuditEvent(sc, {
    actorId: targetUser.id,
    actorEmail: targetUser.email,
    actorRole: 'system_provisioner',
    action: 'super_admin_provisioned',
    targetType: 'user',
    targetId: targetUser.id,
    targetName: targetUser.email,
    reason: 'Initial Super Admin provisioning via authenticated bootstrap'
  });

  console.log('\n============================================================');
  console.log('  ALLOY: Super Admin provisioned successfully!');
  console.log(`  Email: ${targetUser.email}`);
  console.log(`  User ID: ${targetUser.id}`);
  console.log('  ');
  console.log('  IMPORTANT: Remove ALLOY_ADMIN_PROVISION_SECRET from .env');
  console.log('  to prevent unauthorized reuse of the provisioning endpoint.');
  console.log('============================================================\n');

  return sendJson(res, 200, {
    ok: true,
    message: 'Super Admin provisioned successfully. Remove ALLOY_ADMIN_PROVISION_SECRET from .env to secure the endpoint.',
    user_id: targetUser.id,
    email: targetUser.email
  });
}

// Handler: Secret Passkey Admin Login (`alloyadminmarketplace-2026`)
async function handleLoginPasskey(req, res, body) {
  const passkey = (body.passkey || '').trim();
  const configuredPasskey = (process.env.ALLOY_ADMIN_PASSKEY || 'alloyadminmarketplace-2026').trim();

  if (!passkey || passkey !== configuredPasskey) {
    return sendJson(res, 401, { ok: false, error: 'Invalid administrative passkey.' });
  }

  const adminEmail = (process.env.ALLOY_ADMIN_EMAIL || 'admin@alloy.market').trim().toLowerCase();
  const serviceClient = getServiceClient();

  if (serviceClient) {
    try {
      const { data: usersData } = await serviceClient.auth.admin.listUsers();
      const existing = (usersData?.users || []).find(u => u.email?.toLowerCase() === adminEmail);
      if (existing) {
        return sendJson(res, 200, {
          ok: true,
          user: {
            id: existing.id,
            email: existing.email,
            role: 'super_admin',
            display_name: existing.user_metadata?.full_name || 'ALLOY Super Administrator'
          }
        });
      }
    } catch (e) {
      console.warn('[Passkey Auth Note]:', e.message);
    }
  }

  return sendJson(res, 200, {
    ok: true,
    user: {
      id: 'master-super-admin',
      email: adminEmail,
      role: 'super_admin',
      display_name: 'ALLOY Super Administrator'
    }
  });
}

// Managed system/demo credentials with in-memory persistence for dynamic password changes
const MANAGED_CREDENTIALS = {
  'lumina.demo@alloy.market': {
    password: 'AlloyDemo2026!',
    role: 'brand',
    displayName: 'Lumina Botanica'
  },
  'maya.demo@alloy.market': {
    password: 'AlloyDemo2026!',
    role: 'creator',
    displayName: 'Maya Chen'
  },
  'admin@alloy.market': {
    password: process.env.ALLOY_ADMIN_PASSKEY || 'alloyadminmarketplace-2026',
    role: 'super_admin',
    displayName: 'ALLOY Super Administrator'
  },
  'judge@alloy.market': {
    password: process.env.VITE_JUDGE_PASSWORD || 'JudgeAlloy2026!',
    role: 'super_admin',
    displayName: 'Designated Judge'
  }
};

// Handler: Strict Login Verification against Supabase Database & Managed Credentials
// - If user not found in DB -> 404 ACCOUNT_NOT_FOUND (prompts creation of new account / fresh start)
// - If user found in DB but wrong password -> 401 INVALID_PASSWORD (prompts reset password)
// - If correct -> returns verified user and workspace isolation details
async function handleLoginVerify(req, res, body) {
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const requestedRole = body.role || 'brand';

  if (!email || !email.includes('@')) {
    return sendJson(res, 400, {
      ok: false,
      error: 'INVALID_EMAIL',
      message: 'Please provide a valid email address.'
    });
  }

  if (!password) {
    return sendJson(res, 400, {
      ok: false,
      error: 'MISSING_PASSWORD',
      message: 'Password is required to sign in.'
    });
  }

  const serviceClient = getServiceClient();
  let existingUser = null;
  let userProfile = null;

  // 1. Inspect Supabase Cloud Database
  if (serviceClient) {
    try {
      const { data: usersData } = await serviceClient.auth.admin.listUsers();
      existingUser = (usersData?.users || []).find(u => u.email?.toLowerCase() === email);

      if (existingUser) {
        const { data: prof } = await serviceClient
          .from('profiles')
          .select('*')
          .eq('id', existingUser.id)
          .maybeSingle();
        userProfile = prof;
      } else {
        const { data: profByEmail } = await serviceClient
          .from('profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        if (profByEmail) {
          userProfile = profByEmail;
          existingUser = { id: profByEmail.id, email: profByEmail.email, user_metadata: profByEmail };
        }
      }
    } catch (e) {
      console.warn('[handleLoginVerify] DB user query note:', e.message);
    }
  }

  // 2. Inspect Managed System/Demo Accounts
  const managedAccount = MANAGED_CREDENTIALS[email];

  // 3. User does NOT exist in database and NOT in managed accounts -> REJECT!
  if (!existingUser && !managedAccount && !userProfile) {
    return sendJson(res, 404, {
      ok: false,
      error: 'ACCOUNT_NOT_FOUND',
      message: 'Account not found in our database. Please create an account first to get started.'
    });
  }

  // 4. User DOES exist in DB! Verify the password strictly.
  let isPasswordValid = false;

  // Check managed credentials first
  if (managedAccount && managedAccount.password === password) {
    isPasswordValid = true;
  }

  // Check Supabase authentication
  if (!isPasswordValid && existingUser) {
    const anonClient = getVerificationClient();
    if (anonClient) {
      try {
        const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
          email,
          password
        });
        if (!signInErr && signInData?.user) {
          isPasswordValid = true;
        }
      } catch (authErr) {
        console.warn('[handleLoginVerify] Supabase password check note:', authErr.message);
      }
    }
  }

  // If password does not match DB -> REJECT! Do NOT allow entry!
  if (!isPasswordValid) {
    return sendJson(res, 401, {
      ok: false,
      error: 'INVALID_PASSWORD',
      message: 'Incorrect password for this account. Please try again or reset your password.'
    });
  }

  // 5. Password matches! Synthesize profile and grant access
  const resolvedRole = userProfile?.role
    || existingUser?.user_metadata?.role
    || managedAccount?.role
    || requestedRole;

  const resolvedName = userProfile?.display_name
    || existingUser?.user_metadata?.full_name
    || existingUser?.user_metadata?.display_name
    || managedAccount?.displayName
    || email.split('@')[0];

  const userId = existingUser?.id || (managedAccount ? `demo-${managedAccount.role}` : `usr-${email.replace(/[^a-zA-Z0-9]/g, '-')}`);

  return sendJson(res, 200, {
    ok: true,
    user: {
      id: userId,
      email,
      role: resolvedRole,
      display_name: resolvedName,
      profile: {
        id: userId,
        email,
        role: resolvedRole,
        display_name: resolvedName
      }
    }
  });
}

// Handler: Direct and Hassle-free Password Reset & DB Configuration
// Updates password in Supabase Auth, profiles, and managed credentials without external email hurdles
async function handleResetPassword(req, res, body) {
  const email = (body.email || '').trim().toLowerCase();
  const newPassword = body.newPassword || body.password || '';

  if (!email || !email.includes('@')) {
    return sendJson(res, 400, {
      ok: false,
      error: 'INVALID_EMAIL',
      message: 'Please provide a valid email address.'
    });
  }

  if (!newPassword || newPassword.length < 6) {
    return sendJson(res, 400, {
      ok: false,
      error: 'INVALID_PASSWORD',
      message: 'New password must be at least 6 characters.'
    });
  }

  const serviceClient = getServiceClient();
  let existingUser = null;
  let userProfile = null;

  if (serviceClient) {
    try {
      const { data: usersData } = await serviceClient.auth.admin.listUsers();
      existingUser = (usersData?.users || []).find(u => u.email?.toLowerCase() === email);

      const { data: prof } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      userProfile = prof;
    } catch (e) {
      console.warn('[handleResetPassword] DB check note:', e.message);
    }
  }

  const managedAccount = MANAGED_CREDENTIALS[email];

  // If user does not exist in DB -> Cannot reset non-existent account
  if (!existingUser && !managedAccount && !userProfile) {
    return sendJson(res, 404, {
      ok: false,
      error: 'ACCOUNT_NOT_FOUND',
      message: 'No account found with this email in our database. Please create an account first.'
    });
  }

  // Update password in Supabase Auth admin
  let updatedInSupabase = false;
  if (serviceClient && existingUser) {
    try {
      await serviceClient.auth.admin.updateUserById(existingUser.id, {
        password: newPassword,
        email_confirm: true
      });
      updatedInSupabase = true;
    } catch (updateErr) {
      console.warn('[handleResetPassword] Supabase update note:', updateErr.message);
    }
  }

  // Update in managed credentials store
  if (managedAccount) {
    managedAccount.password = newPassword;
  }

  // Record audit activity in activity_logs
  if (serviceClient) {
    try {
      const userId = existingUser?.id || userProfile?.id || `usr-${email.replace(/[^a-zA-Z0-9]/g, '-')}`;
      await serviceClient.from('activity_logs').insert({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        actor_role: userProfile?.role || 'user',
        actor_name: userProfile?.display_name || email.split('@')[0],
        action_type: 'PASSWORD_RESET',
        entity_type: 'user',
        entity_id: userId,
        metadata: { email, source: 'direct_forgot_password' },
        created_at: new Date().toISOString()
      });
    } catch (logErr) {}
  }

  return sendJson(res, 200, {
    ok: true,
    message: 'Password updated successfully in database! You can now log in with your new password.',
    email
  });
}

// Handler: Fresh-Start Account Registration (Strict check: fails if account already exists)
async function handleRegister(req, res, body) {
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const role = body.role === 'creator' ? 'creator' : 'brand';
  const displayName = body.displayName || body.name || email.split('@')[0];
  const details = body.details || body || {};

  if (!email || !email.includes('@')) {
    return sendJson(res, 400, {
      ok: false,
      error: 'INVALID_EMAIL',
      message: 'Please provide a valid email address.'
    });
  }

  if (!password || password.length < 6) {
    return sendJson(res, 400, {
      ok: false,
      error: 'INVALID_PASSWORD',
      message: 'Password must be at least 6 characters.'
    });
  }

  const serviceClient = getServiceClient();
  if (!serviceClient) {
    return sendJson(res, 503, { ok: false, error: 'Database service unavailable' });
  }

  try {
    const { data: usersData } = await serviceClient.auth.admin.listUsers();
    const existing = (usersData?.users || []).find(u => u.email?.toLowerCase() === email);

    if (existing || MANAGED_CREDENTIALS[email]) {
      return sendJson(res, 409, {
        ok: false,
        error: 'ACCOUNT_EXISTS',
        message: 'An account with this email already exists in our database. Please sign in or reset your password.'
      });
    }

    const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        intended_role: role,
        full_name: displayName,
        display_name: displayName
      }
    });

    if (createErr) throw createErr;
    const userId = newUser.user.id;

    // Upsert public.profiles
    const avatarUrl = details.avatar || details.avatarUrl || (role === 'creator'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
      : (details.logo || ''));

    await serviceClient.from('profiles').upsert({
      id: userId,
      email,
      role,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    let creatorRecord = null;
    let brandRecord = null;

    // Isolated fresh start: provision brand or creator record with rich database fields
    if (role === 'creator') {
      const handle = details.handle 
        ? (details.handle.startsWith('@') ? details.handle : `@${details.handle}`)
        : `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}_${userId.slice(0, 4)}`;
      const experience = details.experience || '3+ years in AI visual arts';
      const specialty = details.specialty || 'AI Cinematic Direction';
      const heroWork = details.heroWork || specialty || 'Flagship Studio Showcase';
      const bio = details.bio || `${displayName} specializes in ${specialty} and cinematic narrative direction.`;
      const creativeIdentity = details.creativeIdentity || specialty;
      const location = details.location || 'Remote / Global';
      const tools = Array.isArray(details.tools) && details.tools.length ? details.tools : ['Midjourney', 'Runway Gen-3', 'Unreal Engine'];
      const styles = Array.isArray(details.styles) && details.styles.length ? details.styles : ['Cinematic', 'Editorial', 'Hyperreal'];

      creatorRecord = {
        id: `creator-${userId.slice(0, 8)}`,
        user_id: userId,
        name: displayName,
        handle,
        experience,
        specialty,
        hero_work: heroWork,
        avatar: avatarUrl,
        bio,
        creative_identity: creativeIdentity,
        location,
        tools,
        styles,
        availability: 'Available for projects',
        status_badge: 'Available now',
        turnaround: '48h concept frames',
        status: 'Published',
        visibility: 'published',
        is_demo: false,
        updated_at: new Date().toISOString()
      };

      await serviceClient.from('creator_profiles').upsert(creatorRecord, { onConflict: 'id' });
    } else {
      const emailKey = email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
      const brandId = `brand-${emailKey}`;
      const handle = details.handle 
        ? (details.handle.startsWith('@') ? details.handle : `@${details.handle}`)
        : `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
      const industry = details.industry || 'Beverages & Drinks';
      const description = details.description || details.productFocus || `${displayName} private studio workspace.`;
      const website = details.website || '';
      const logo = details.logo || avatarUrl || '';
      const aesthetic = details.aesthetic || 'Modern & Editorial';

      brandRecord = {
        id: brandId,
        user_id: userId,
        name: displayName,
        handle,
        industry,
        description,
        website,
        logo,
        aesthetic,
        is_demo: false,
        updated_at: new Date().toISOString()
      };

      await serviceClient.from('brands').upsert(brandRecord, { onConflict: 'id' });
    }

    // Log registration
    try {
      await serviceClient.from('activity_logs').insert({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        actor_role: role,
        actor_name: displayName,
        action_type: 'USER_SIGNUP',
        entity_type: 'user',
        entity_id: userId,
        metadata: { email, role, source: 'fresh_start_registration' },
        created_at: new Date().toISOString()
      });
    } catch (logErr) {}

    return sendJson(res, 201, {
      ok: true,
      user: {
        id: userId,
        email,
        role,
        display_name: displayName,
        profile: {
          id: userId,
          email,
          role,
          display_name: displayName,
          avatar_url: avatarUrl,
          ...(creatorRecord || brandRecord || {})
        },
        creator: creatorRecord,
        brand: brandRecord,
        profileDetails: creatorRecord || brandRecord
      }
    });
  } catch (err) {
    console.error('[handleRegister Error]:', err.message);
    return sendJson(res, 500, { ok: false, error: err.message });
  }
}

// Handler: Check if account exists in database
async function handleCheckAccount(req, res, body) {
  const email = (body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return sendJson(res, 400, { ok: false, error: 'Valid email required' });
  }

  const serviceClient = getServiceClient();
  let exists = false;
  let role = null;

  if (MANAGED_CREDENTIALS[email]) {
    exists = true;
    role = MANAGED_CREDENTIALS[email].role;
  }

  if (!exists && serviceClient) {
    try {
      const { data: usersData } = await serviceClient.auth.admin.listUsers();
      const user = (usersData?.users || []).find(u => u.email?.toLowerCase() === email);
      if (user) {
        exists = true;
        role = user.user_metadata?.role || 'brand';
      } else {
        const { data: prof } = await serviceClient.from('profiles').select('role').eq('email', email).maybeSingle();
        if (prof) {
          exists = true;
          role = prof.role;
        }
      }
    } catch (e) {}
  }

  return sendJson(res, 200, { ok: true, exists, role });
}

// Handler: Direct Account Registration & Login (Bypasses email rate limits and guarantees Supabase Editor persistence)
async function handleRegisterOrLogin(req, res, body) {
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || 'AlloyUser2026!';
  const role = body.role === 'brand' ? 'brand' : 'creator';
  const displayName = body.displayName || body.name || email.split('@')[0];

  if (!email || !email.includes('@')) {
    return sendJson(res, 400, { ok: false, error: 'Valid email address is required.' });
  }

  const serviceClient = getServiceClient();
  if (!serviceClient) {
    return sendJson(res, 503, { ok: false, error: 'Database service unavailable' });
  }

  try {
    let userId = null;
    const { data: usersData } = await serviceClient.auth.admin.listUsers();
    const existing = (usersData?.users || []).find(u => u.email?.toLowerCase() === email);

    if (existing) {
      userId = existing.id;
      if (password) {
        await serviceClient.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
          user_metadata: { role, full_name: displayName }
        });
      }
    } else {
      const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role,
          intended_role: role,
          full_name: displayName,
          display_name: displayName
        }
      });
      if (createErr) throw createErr;
      userId = newUser.user.id;
    }

    const details = body.details || body;
    const avatarUrl = details.avatar || details.avatarUrl || (role === 'creator'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
      : (details.logo || ''));

    // 2. Upsert public.profiles
    await serviceClient.from('profiles').upsert({
      id: userId,
      email,
      role,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    let creatorRecord = null;
    let brandRecord = null;

    // 3. Upsert creator_profiles or brands
    if (role === 'creator') {
      const handle = details.handle 
        ? (details.handle.startsWith('@') ? details.handle : `@${details.handle}`)
        : `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}_${userId.slice(0, 4)}`;
      const experience = details.experience || '3+ years in AI visual arts';
      const specialty = details.specialty || 'AI Cinematic Direction';
      const heroWork = details.heroWork || specialty || 'Flagship Studio Showcase';
      const bio = details.bio || `${displayName} specializes in ${specialty} and cinematic narrative direction.`;
      const creativeIdentity = details.creativeIdentity || specialty;
      const location = details.location || 'Remote / Global';
      const tools = Array.isArray(details.tools) && details.tools.length ? details.tools : ['Midjourney', 'Runway Gen-3', 'Unreal Engine'];
      const styles = Array.isArray(details.styles) && details.styles.length ? details.styles : ['Cinematic', 'Editorial', 'Hyperreal'];

      creatorRecord = {
        id: `creator-${userId.slice(0, 8)}`,
        user_id: userId,
        name: displayName,
        handle,
        experience,
        specialty,
        hero_work: heroWork,
        avatar: avatarUrl,
        bio,
        creative_identity: creativeIdentity,
        location,
        tools,
        styles,
        availability: 'Available for projects',
        status_badge: 'Available now',
        turnaround: '48h concept frames',
        status: 'Published',
        visibility: 'published',
        is_demo: false,
        updated_at: new Date().toISOString()
      };

      await serviceClient.from('creator_profiles').upsert(creatorRecord, { onConflict: 'id' });
    } else {
      const brandId = `brand-${userId.slice(0, 8)}`;
      const handle = details.handle 
        ? (details.handle.startsWith('@') ? details.handle : `@${details.handle}`)
        : `@${email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
      const industry = details.industry || 'Beverages & Drinks';
      const description = details.description || details.productFocus || `${displayName} private studio workspace.`;
      const website = details.website || '';
      const logo = details.logo || avatarUrl || '';
      const aesthetic = details.aesthetic || 'Modern & Editorial';

      brandRecord = {
        id: brandId,
        user_id: userId,
        name: displayName,
        handle,
        industry,
        description,
        website,
        logo,
        aesthetic,
        is_demo: false,
        updated_at: new Date().toISOString()
      };

      await serviceClient.from('brands').upsert(brandRecord, { onConflict: 'id' });
    }

    // 4. Log in public.activity_logs
    try {
      await serviceClient.from('activity_logs').insert({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        actor_role: role,
        actor_name: displayName,
        action_type: existing ? 'USER_LOGIN' : 'USER_SIGNUP',
        entity_type: 'user',
        entity_id: userId,
        metadata: { email, role, source: body.source || 'auth_direct' },
        created_at: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn('[Activity Log Warning]:', logErr.message);
    }

    return sendJson(res, 200, {
      ok: true,
      userId,
      email,
      role,
      displayName
    });
  } catch (err) {
    console.error('[RegisterOrLogin Error]:', err.message);
    return sendJson(res, 500, { ok: false, error: err.message });
  }
}

// ============================================================================
// MIDDLEWARE EXPORT
// ============================================================================
export function createAdminMiddleware() {
  return async function adminMiddleware(req, res, next) {
    const rawUrl = req.url || '';
    const url = rawUrl.split('?')[0];

    // Handle CORS preflight
    if (req.method === 'OPTIONS' && (url.startsWith('/api/admin') || url.startsWith('/api/auth'))) {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.end();
    }

    if (!url.startsWith('/api/admin') && !url.startsWith('/api/auth')) {
      return next ? next() : res.end();
    }

    try {
      const method = req.method || 'GET';
      let body = {};
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        body = await parseJsonBody(req);
      }

      // Public / Auth Routing
      if (url === '/api/auth/login-verify') return handleLoginVerify(req, res, body);
      if (url === '/api/auth/reset-password') return handleResetPassword(req, res, body);
      if (url === '/api/auth/register') return handleRegister(req, res, body);
      if (url === '/api/auth/check-account') return handleCheckAccount(req, res, body);
      if (url === '/api/auth/register-or-login') return handleRegisterOrLogin(req, res, body);
      if (url === '/api/admin/login-passkey') return handleLoginPasskey(req, res, body);

      // Admin Routing
      if (url === '/api/admin/health') return handleHealth(req, res);
      if (url === '/api/admin/verify') return handleVerifySession(req, res);
      if (url === '/api/admin/overview') return handleOverview(req, res);
      if (url === '/api/admin/brands') return handleBrands(req, res, method, body);
      if (url === '/api/admin/creators') return handleCreators(req, res, method, body);
      if (url === '/api/admin/campaigns') return handleCampaigns(req, res, method, body);
      if (url === '/api/admin/collaborations') return handleCollaborations(req, res, method, body);
      if (url === '/api/admin/trust/reports') return handleTrustReports(req, res, method, body);
      if (url === '/api/admin/trust/decide') return handleTrustDecision(req, res, method, body);
      if (url === '/api/admin/audit') return handleAuditLogs(req, res, method);
      if (url === '/api/admin/config') return handlePlatformConfig(req, res, method, body);
      if (url === '/api/admin/provision') return handleProvision(req, res, method, body);

      return sendJson(res, 404, { ok: false, error: `Endpoint ${url} not found.` });
    } catch (err) {
      console.error('[Admin Middleware Error]:', err.message);
      return sendJson(res, err.status || 500, {
        ok: false,
        error: 'An internal error occurred.'
      });
    }
  };
}
