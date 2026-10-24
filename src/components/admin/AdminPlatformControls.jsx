// src/components/admin/AdminPlatformControls.jsx
// ALLOY Super Admin — Platform Controls, Governance Flags & Safety Thresholds

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  Percent,
  DollarSign
} from 'lucide-react';

export default function AdminPlatformControls({
  config = {},
  onSaveConfig
}) {
  const [formData, setFormData] = useState({
    maintenance_mode: false,
    allow_new_registrations: true,
    alloy_trust_auto_flag: true,
    auto_flag_threshold: 65,
    critical_quarantine_threshold: 85,
    platform_fee_percent: 5.0,
    max_unverified_campaign_budget: 50000,
    ...config
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(prev => ({ ...prev, ...config }));
    }
  }, [config]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setSavedSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (onSaveConfig) {
        await onSaveConfig(formData);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="alloy-admin-section">
      <div className="alloy-admin-section-header">
        <div>
          <h2 className="alloy-admin-section-title">Platform Governance & Risk Thresholds</h2>
          <p className="alloy-admin-section-sub">
            Real-time toggles and cryptographic guardrails applied across the ALLOY marketplace.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="alloy-admin-success-banner">
          <CheckCircle2 size={16} />
          <span>Platform parameters updated successfully and committed to the security audit trail.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="alloy-admin-controls-grid">
        {/* Card 1: Safety Thresholds */}
        <div className="alloy-admin-control-card">
          <div className="alloy-admin-control-card-header">
            <Shield size={18} className="text-amber-400" />
            <h3>AlloyTrust Risk Engine Tuning</h3>
          </div>

          <div className="alloy-admin-control-body">
            <div className="alloy-admin-control-toggle-row">
              <div>
                <div className="font-medium text-white text-sm">Automated Heuristic Auto-Flagging</div>
                <div className="text-xs text-zinc-400">Trigger surveillance reports when signals cross tolerance</div>
              </div>
              <input
                type="checkbox"
                className="alloy-admin-switch"
                checked={formData.alloy_trust_auto_flag}
                onChange={(e) => handleChange('alloy_trust_auto_flag', e.target.checked)}
              />
            </div>

            <div className="alloy-admin-slider-group mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300">Priority Review Threshold</span>
                <span className="font-mono text-amber-400">{formData.auto_flag_threshold} pts</span>
              </div>
              <input
                type="range"
                min="40"
                max="80"
                value={formData.auto_flag_threshold}
                onChange={(e) => handleChange('auto_flag_threshold', parseInt(e.target.value, 10))}
                className="alloy-admin-slider"
              />
            </div>

            <div className="alloy-admin-slider-group mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300">Immediate Quarantine Threshold</span>
                <span className="font-mono text-red-400">{formData.critical_quarantine_threshold} pts</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                value={formData.critical_quarantine_threshold}
                onChange={(e) => handleChange('critical_quarantine_threshold', parseInt(e.target.value, 10))}
                className="alloy-admin-slider"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Financial Governance */}
        <div className="alloy-admin-control-card">
          <div className="alloy-admin-control-card-header">
            <DollarSign size={18} className="text-emerald-400" />
            <h3>Escrow & Platform Economics</h3>
          </div>

          <div className="alloy-admin-control-body">
            <div className="alloy-admin-input-group">
              <label>Platform Commission Take Rate (%)</label>
              <div className="alloy-admin-input-wrapper">
                <Percent size={15} className="alloy-admin-field-icon" />
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="25"
                  value={formData.platform_fee_percent}
                  onChange={(e) => handleChange('platform_fee_percent', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="alloy-admin-input-group mt-3">
              <label>Unverified Brand Max Campaign Budget (₹)</label>
              <div className="alloy-admin-input-wrapper">
                <DollarSign size={15} className="alloy-admin-field-icon" />
                <input
                  type="number"
                  step="5000"
                  min="10000"
                  max="200000"
                  value={formData.max_unverified_campaign_budget}
                  onChange={(e) => handleChange('max_unverified_campaign_budget', parseInt(e.target.value, 10))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Platform Availability */}
        <div className="alloy-admin-control-card">
          <div className="alloy-admin-control-card-header">
            <Lock size={18} className="text-amber-400" />
            <h3>Platform Availability</h3>
          </div>

          <div className="alloy-admin-control-body">
            <div className="alloy-admin-control-toggle-row">
              <div>
                <div className="font-medium text-white text-sm">Allow New Registrations</div>
                <div className="text-xs text-zinc-400">Open portal for incoming creators and brand applications</div>
              </div>
              <input
                type="checkbox"
                className="alloy-admin-switch"
                checked={formData.allow_new_registrations}
                onChange={(e) => handleChange('allow_new_registrations', e.target.checked)}
              />
            </div>

            <div className="alloy-admin-control-toggle-row mt-4">
              <div>
                <div className="font-medium text-white text-sm">Emergency Maintenance Mode</div>
                <div className="text-xs text-zinc-400">Temporarily restrict public marketplace access to Super Admins</div>
              </div>
              <input
                type="checkbox"
                className="alloy-admin-switch"
                checked={formData.maintenance_mode}
                onChange={(e) => handleChange('maintenance_mode', e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="alloy-admin-controls-actions">
          <button
            type="submit"
            className="alloy-admin-btn-primary"
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? 'Committing Parameters...' : 'Save & Enforce Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
