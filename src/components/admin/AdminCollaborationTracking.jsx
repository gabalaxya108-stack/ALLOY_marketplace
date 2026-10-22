// src/components/admin/AdminCollaborationTracking.jsx
// ALLOY Super Admin — Collaboration Tracking & Escrow Milestone Management

import React, { useState } from 'react';
import {
  GitPullRequest,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Eye,
  X,
  MessageSquare,
  Edit2,
  Save,
  Check
} from 'lucide-react';

export default function AdminCollaborationTracking({
  collaborations = [],
  onInterveneCollab,
  onEditCollaboration
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [editingCollab, setEditingCollab] = useState(null);
  const [editForm, setEditForm] = useState({
    status: 'active',
    deliverableStatus: 'Active',
    budget: '',
    progressPercent: 50,
    milestone: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (collab) => {
    setEditingCollab(collab);
    setEditForm({
      status: collab.status || 'active',
      deliverableStatus: collab.deliverableStatus || collab.status || 'Active',
      budget: collab.budget || '',
      progressPercent: collab.progressPercent || collab.progress || 50,
      milestone: collab.milestone || collab.currentMilestone || ''
    });
  };

  const handleSaveCollab = async (e) => {
    e.preventDefault();
    if (!editingCollab || !onEditCollaboration) return;
    setIsSaving(true);
    try {
      await onEditCollaboration({
        ...editingCollab,
        status: editForm.status,
        deliverableStatus: editForm.deliverableStatus,
        budget: editForm.budget,
        progressPercent: Number(editForm.progressPercent) || 0,
        progress: Number(editForm.progressPercent) || 0,
        milestone: editForm.milestone
      });
      setEditingCollab(null);
    } catch (err) {
      console.error('Failed to update collaboration:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCollabs = collaborations.filter((collab) => {
    const matchesSearch =
      (collab.campaignTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collab.creatorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collab.brandName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collab.status || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="alloy-admin-section">
      <div className="alloy-admin-section-header">
        <div>
          <h2 className="alloy-admin-section-title">Collaboration & Escrow Tracking</h2>
          <p className="alloy-admin-section-sub">
            Real-time pipeline of active brand-creator contracts, work submission milestones, and dispute mediation.
          </p>
        </div>
        <div className="alloy-admin-counter-pill">
          <span>{filteredCollabs.length} Active Collaborations</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="alloy-admin-filter-bar">
        <div className="alloy-admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search collaborations by brand, creator, or campaign name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Collaborations Table */}
      <div className="alloy-admin-table-container">
        <table className="alloy-admin-table">
          <thead>
            <tr>
              <th>Campaign Contract</th>
              <th>Brand Sponsor</th>
              <th>Matched Creator</th>
              <th>Contract Milestone</th>
              <th>Escrow Allocation</th>
              <th className="text-right">Administrative Oversight</th>
            </tr>
          </thead>
          <tbody>
            {filteredCollabs.length === 0 ? (
              <tr>
                <td colSpan="6" className="alloy-admin-empty-cell">
                  No active collaborations matching search criteria.
                </td>
              </tr>
            ) : (
              filteredCollabs.map((collab) => {
                const isDisputed = collab.status === 'revision-requested' || collab.status === 'disputed';
                const isApproved = collab.status === 'approved' || collab.status === 'completed';

                return (
                  <tr key={collab.id}>
                    <td>
                      <div className="alloy-admin-entity-cell">
                        <div className="alloy-admin-brand-thumb collab">
                          <GitPullRequest size={16} />
                        </div>
                        <div>
                          <div className="alloy-admin-entity-name">{collab.campaignTitle || collab.campaign_title || 'Direct Collaboration'}</div>
                          <div className="alloy-admin-entity-id">{collab.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{collab.brandName || collab.brand_name || 'Brand Partner'}</td>
                    <td>
                      <div className="font-medium text-white">{collab.creatorName || collab.creator_name || 'Creator'}</div>
                    </td>
                    <td>
                      <span className={`alloy-admin-collab-badge ${isDisputed ? 'disputed' : isApproved ? 'approved' : 'active'}`}>
                        {isDisputed ? <AlertTriangle size={12} /> : isApproved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        <span>{collab.deliverableStatus || collab.status || 'Active'}</span>
                      </span>
                    </td>
                    <td>
                      <span className="alloy-admin-pill-budget">
                        {collab.budget ? String(collab.budget).replace(/\$/g, '₹') : 'Unspecified'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="alloy-admin-action-row">
                        <button
                          type="button"
                          className="alloy-admin-btn-table"
                          onClick={() => setSelectedCollab(collab)}
                        >
                          <Eye size={14} />
                          <span>Track</span>
                        </button>
                        <button
                          type="button"
                          className="alloy-admin-btn-table"
                          onClick={() => startEdit(collab)}
                          title="Edit Collaboration & Escrow State"
                        >
                          <Edit2 size={14} />
                          <span>Edit</span>
                        </button>
                        {isDisputed && (
                          <button
                            type="button"
                            className="alloy-admin-btn-table warning"
                            onClick={() => onInterveneCollab?.(collab.id)}
                            title="Open Super Admin Mediation"
                          >
                            <ShieldAlert size={14} />
                            <span>Mediate</span>
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

      {/* Collab Inspection Modal */}
      {selectedCollab && (
        <div className="alloy-modal-backdrop" onClick={() => setSelectedCollab(null)}>
          <div className="alloy-admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="alloy-admin-modal-header">
              <div className="alloy-admin-modal-title-group">
                <GitPullRequest size={20} className="text-amber-400" />
                <h3>Collaboration Audit: {selectedCollab.campaignTitle || selectedCollab.campaign_title || 'Active Contract'}</h3>
              </div>
              <button
                type="button"
                className="alloy-modal-close"
                onClick={() => setSelectedCollab(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="alloy-admin-modal-body">
              <div className="alloy-admin-dossier-grid">
                <div className="alloy-admin-dossier-item">
                  <span className="label">Brand</span>
                  <span className="val">{selectedCollab.brandName || selectedCollab.brand_name || 'Brand Partner'}</span>
                </div>
                <div className="alloy-admin-dossier-item">
                  <span className="label">Creator</span>
                  <span className="val">{selectedCollab.creatorName || selectedCollab.creator_name || 'Creator'}</span>
                </div>
                <div className="alloy-admin-dossier-item">
                  <span className="label">Escrow Value</span>
                  <span className="val text-amber-400 font-mono">{String(selectedCollab.budget || '₹8,500').replace(/\$/g, '₹')}</span>
                </div>
                <div className="alloy-admin-dossier-item">
                  <span className="label">Milestone State</span>
                  <span className="val text-emerald-400">{selectedCollab.deliverableStatus || selectedCollab.status}</span>
                </div>
              </div>

              <div className="alloy-admin-brief-box mt-4">
                <div className="label mb-1 text-xs text-zinc-400 uppercase font-mono">Escrow Vault Verification</div>
                <p className="text-sm text-zinc-200">
                  Funds held in platform escrow. Payout released automatically upon brand final deliverable sign-off or Super Admin dispute clearance.
                </p>
              </div>

              <div className="alloy-admin-modal-actions mt-6 flex justify-between items-center">
                <button
                  type="button"
                  className="alloy-admin-btn-primary"
                  onClick={() => {
                    const target = selectedCollab;
                    setSelectedCollab(null);
                    startEdit(target);
                  }}
                >
                  <Edit2 size={14} />
                  <span>Edit Contract Milestone</span>
                </button>
                <button
                  type="button"
                  className="alloy-admin-btn-secondary"
                  onClick={() => setSelectedCollab(null)}
                >
                  Close Tracking Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Collaboration & Milestone Modal */}
      {editingCollab && (
        <div className="alloy-modal-backdrop" onClick={() => setEditingCollab(null)}>
          <div className="alloy-admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="alloy-admin-modal-header">
              <div className="alloy-admin-modal-title-group">
                <Edit2 size={20} className="text-amber-400" />
                <h3>Edit Contract: {editingCollab.campaignTitle || editingCollab.title || editingCollab.id}</h3>
              </div>
              <button
                type="button"
                className="alloy-modal-close"
                onClick={() => setEditingCollab(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCollab} className="alloy-admin-modal-body">
              <div className="alloy-admin-form-group mb-3">
                <label className="text-xs text-zinc-400 uppercase font-mono">Contract Milestone / Stage</label>
                <select
                  value={editForm.deliverableStatus}
                  onChange={(e) => setEditForm({ ...editForm, deliverableStatus: e.target.value, status: e.target.value.toLowerCase() })}
                  className="alloy-admin-input w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                >
                  <option value="Active">Active / In Progress</option>
                  <option value="submission_pending">Submission Pending</option>
                  <option value="in_review">In Review / Submitted</option>
                  <option value="revision-requested">Revision Requested</option>
                  <option value="approved">Approved</option>
                  <option value="completed">Completed & Escrow Released</option>
                  <option value="disputed">Disputed / In Escrow Hold</option>
                </select>
              </div>

              <div className="alloy-admin-form-group mb-3">
                <label className="text-xs text-zinc-400 uppercase font-mono">Current Milestone Title</label>
                <input
                  type="text"
                  value={editForm.milestone}
                  onChange={(e) => setEditForm({ ...editForm, milestone: e.target.value })}
                  placeholder="e.g. Concept Draft, First Cut, Final 4K Master"
                  className="alloy-admin-input w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                />
              </div>

              <div className="alloy-admin-form-grid grid grid-cols-2 gap-3 mb-3">
                <div className="alloy-admin-form-group">
                  <label className="text-xs text-zinc-400 uppercase font-mono">Escrow Budget</label>
                  <input
                    type="text"
                    value={editForm.budget}
                    onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                    placeholder="₹12,000"
                    className="alloy-admin-input w-full mt-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div className="alloy-admin-form-group">
                  <label className="text-xs text-zinc-400 uppercase font-mono">Progress Percentage ({editForm.progressPercent}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editForm.progressPercent}
                    onChange={(e) => setEditForm({ ...editForm, progressPercent: Number(e.target.value) })}
                    className="w-full mt-2 accent-amber-400"
                  />
                </div>
              </div>

              <div className="alloy-admin-brief-box mt-3 text-xs text-zinc-400">
                Changes saved here persist forever in Supabase and update Brand Workspace, Creator Workspace, and Campaign Workspaces instantly.
              </div>

              <div className="alloy-admin-modal-actions mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  className="alloy-admin-btn-secondary"
                  onClick={() => setEditingCollab(null)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="alloy-admin-btn-primary flex items-center gap-2"
                  disabled={isSaving}
                >
                  <Save size={16} />
                  <span>{isSaving ? 'Saving to Database...' : 'Save & Propagate Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
