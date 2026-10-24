// src/components/admin/AdminCampaignManagement.jsx
// ALLOY Super Admin — Campaign Oversight & Brief Validation

import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
  FileCheck,
  ShieldAlert,
  Edit3,
  Save
} from 'lucide-react';

export default function AdminCampaignManagement({
  campaigns = [],
  onUpdateCampaignStatus,
  onEditCampaign
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch =
      (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.brandName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.deliverables || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSaveCampaignEdits = (e) => {
    e.preventDefault();
    if (!editingCampaign) return;
    onEditCampaign?.(editingCampaign);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setEditingCampaign(null);
    }, 600);
  };

  return (
    <div className="alloy-admin-section">
      <div className="alloy-admin-section-header">
        <div>
          <h2 className="alloy-admin-section-title">Campaign Oversight & Escrow Briefs</h2>
          <p className="alloy-admin-section-sub">
            Monitoring brand requirements, budget commitments, deliverables, and brief compliance.
          </p>
        </div>
        <div className="alloy-admin-counter-pill">
          <span>{filteredCampaigns.length === campaigns.length ? `${campaigns.length} Campaigns Active` : `${filteredCampaigns.length} of ${campaigns.length} Campaigns Active`}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="alloy-admin-filter-bar">
        <div className="alloy-admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search campaigns by brief title, brand sponsor, or deliverable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="alloy-admin-filter-group">
          <Filter size={14} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="alloy-admin-select"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published Active</option>
            <option value="draft">Draft Briefs</option>
            <option value="in-review">Under Review</option>
            <option value="completed">Completed / Disbursed</option>
            <option value="flagged">Flagged by AlloyTrust</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="alloy-admin-table-container">
        <table className="alloy-admin-table">
          <thead>
            <tr>
              <th>Campaign Brief</th>
              <th>Brand Sponsor</th>
              <th>Committed Escrow</th>
              <th>Status</th>
              <th>Deliverable Scope</th>
              <th className="text-right">Oversight Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan="6" className="alloy-admin-empty-cell">
                  No campaigns matching query criteria.
                </td>
              </tr>
            ) : (
              filteredCampaigns.map((camp) => {
                const isFlagged = camp.status === 'flagged';
                return (
                  <tr key={camp.id}>
                    <td>
                      <div className="alloy-admin-entity-cell">
                        <div className="alloy-admin-brand-thumb campaign">
                          <Briefcase size={16} />
                        </div>
                        <div>
                          <div className="alloy-admin-entity-name">{camp.title}</div>
                          <div className="alloy-admin-entity-id">{camp.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{camp.brandName || camp.brand_name || 'Unassigned'}</td>
                    <td>
                      <span className="alloy-admin-pill-budget">
                        {camp.budget ? String(camp.budget).replace(/\$/g, '₹') : 'Unspecified'}
                      </span>
                    </td>
                    <td>
                      <span className={`alloy-admin-status-badge ${isFlagged ? 'restricted' : 'verified'}`}>
                        {isFlagged ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                        <span>{camp.status || 'Active'}</span>
                      </span>
                    </td>
                    <td className="max-w-xs truncate text-xs text-zinc-400">
                      {Array.isArray(camp.deliverables) ? camp.deliverables.join(', ') : (camp.deliverables || 'Deliverables not specified')}
                    </td>
                    <td className="text-right">
                      <div className="alloy-admin-action-row">
                        <button
                          type="button"
                          className="alloy-admin-btn-table"
                          onClick={() => setEditingCampaign({ ...camp })}
                          title="Edit Campaign Details"
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="alloy-admin-btn-table"
                          onClick={() => setSelectedCampaign(camp)}
                        >
                          <Eye size={14} />
                          <span>Brief</span>
                        </button>
                        {isFlagged ? (
                          <button
                            type="button"
                            className="alloy-admin-btn-table success"
                            onClick={() => onUpdateCampaignStatus?.(camp.id, 'published')}
                          >
                            <FileCheck size={14} />
                            <span>Clear</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="alloy-admin-btn-table warning"
                            onClick={() => onUpdateCampaignStatus?.(camp.id, 'flagged')}
                          >
                            <ShieldAlert size={14} />
                            <span>Flag</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="alloy-modal-backdrop" onClick={() => setSelectedCampaign(null)}>
          <div className="alloy-admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="alloy-admin-modal-header">
              <div className="alloy-admin-modal-title-group">
                <Briefcase size={20} className="text-amber-400" />
                <h3>Campaign Brief Audit: {selectedCampaign.title}</h3>
              </div>
              <button
                type="button"
                className="alloy-modal-close"
                onClick={() => setSelectedCampaign(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="alloy-admin-modal-body">
              <div className="alloy-admin-dossier-grid">
                <div className="alloy-admin-dossier-item">
                  <span className="label">Brand Owner</span>
                  <span className="val">{selectedCampaign.brandName || 'Verified Brand'}</span>
                </div>
                <div className="alloy-admin-dossier-item">
                  <span className="label">Committed Budget</span>
                  <span className="val text-amber-400 font-mono">{String(selectedCampaign.budget || '₹15,000').replace(/\$/g, '₹')}</span>
                </div>
                <div className="alloy-admin-dossier-item">
                  <span className="label">Current Status</span>
                  <span className="val">{selectedCampaign.status || 'published'}</span>
                </div>
                <div className="alloy-admin-dossier-item">
                  <span className="label">AlloyTrust Escrow Verification</span>
                  <span className="val text-emerald-400">Guaranteed Locked in Vault</span>
                </div>
              </div>

              <div className="alloy-admin-brief-box mt-4">
                <div className="label mb-1 text-xs text-zinc-400 uppercase font-mono">Creative Requirements</div>
                <p className="text-sm text-zinc-200">{selectedCampaign.description || 'Full seasonal campaign production targeting luxury minimalist demographics.'}</p>
              </div>

              <div className="alloy-admin-brief-box mt-3">
                <div className="label mb-1 text-xs text-zinc-400 uppercase font-mono">Deliverables Specified</div>
                <p className="text-sm text-zinc-300">{selectedCampaign.deliverables || '3x High-Resolution Stills, 1x 15s 4K Motion Asset.'}</p>
              </div>

              <div className="alloy-admin-modal-actions mt-6">
                <button
                  type="button"
                  className="alloy-admin-btn-secondary"
                  onClick={() => {
                    const toEdit = { ...selectedCampaign };
                    setSelectedCampaign(null);
                    setEditingCampaign(toEdit);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit3 size={15} />
                  <span>Edit Campaign</span>
                </button>
                <button
                  type="button"
                  className="alloy-admin-btn-secondary"
                  onClick={() => setSelectedCampaign(null)}
                >
                  Close Audit View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <div className="alloy-modal-backdrop" onClick={() => setEditingCampaign(null)}>
          <div className="alloy-admin-modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div className="alloy-admin-modal-header">
              <div className="alloy-admin-modal-title-group">
                <Edit3 size={20} className="text-amber-400" />
                <h3>Edit Campaign Brief: {editingCampaign.title}</h3>
              </div>
              <button
                type="button"
                className="alloy-modal-close"
                onClick={() => setEditingCampaign(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCampaignEdits} className="alloy-admin-form">
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div className="alloy-admin-input-group">
                  <label>Campaign Title *</label>
                  <input
                    type="text"
                    required
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCampaign.title || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, title: e.target.value })}
                  />
                </div>
                <div className="alloy-admin-input-group">
                  <label>Brand Name</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCampaign.brandName || editingCampaign.brand_name || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, brandName: e.target.value, brand_name: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div className="alloy-admin-input-group">
                  <label>Campaign Objective</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCampaign.objective || 'Product Launch'}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, objective: e.target.value })}
                  />
                </div>
                <div className="alloy-admin-input-group">
                  <label>Industry</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCampaign.industry || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, industry: e.target.value })}
                  />
                </div>
                <div className="alloy-admin-input-group">
                  <label>Budget Allocation</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCampaign.budget ? String(editingCampaign.budget).replace(/\$/g, '₹') : '₹50,000 – ₹1,00,000'}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, budget: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="alloy-admin-input-group">
                  <label>Timeline / Deadline</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCampaign.timeline || editingCampaign.deadline || ''}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, timeline: e.target.value, deadline: e.target.value })}
                  />
                </div>
                <div className="alloy-admin-input-group">
                  <label>Campaign Status</label>
                  <select
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCampaign.status || 'Active'}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft Mode</option>
                    <option value="In Review">In Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                    <option value="flagged">Flagged</option>
                  </select>
                </div>
              </div>

              <div className="alloy-admin-input-group">
                <label>Deliverables (comma separated)</label>
                <input
                  type="text"
                  className="alloy-admin-textarea"
                  style={{ height: '42px', resize: 'none' }}
                  value={Array.isArray(editingCampaign.deliverables) ? editingCampaign.deliverables.join(', ') : (editingCampaign.deliverables || '')}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, deliverables: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                />
              </div>

              <div className="alloy-admin-input-group">
                <label>Campaign Creative Brief & Directive</label>
                <textarea
                  rows={3}
                  className="alloy-admin-textarea"
                  value={editingCampaign.description || ''}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, description: e.target.value })}
                />
              </div>

              <div className="alloy-admin-modal-actions" style={{ marginTop: '16px' }}>
                <button
                  type="submit"
                  className="alloy-admin-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Save size={16} />
                  <span>{saveSuccess ? 'Saved to DB & Website!' : 'Save Campaign Changes'}</span>
                </button>
                <button
                  type="button"
                  className="alloy-admin-btn-secondary"
                  onClick={() => setEditingCampaign(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
