// src/components/admin/AdminCreatorManagement.jsx
// ALLOY Super Admin — Creator Network & Portfolio DNA Governance

import React, { useState } from 'react';
import {
  Users,
  Search,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Palette,
  X,
  Filter,
  Edit3,
  Save
} from 'lucide-react';

export default function AdminCreatorManagement({
  creators = [],
  onUpdateCreatorStatus,
  onEditCreator
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [editingCreator, setEditingCreator] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Extract unique specialties
  const specialties = Array.from(new Set(creators.map(c => c.specialty).filter(Boolean)));

  const filteredCreators = creators.filter((creator) => {
    const matchesSearch =
      (creator.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (creator.handle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (creator.specialty || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (creator.bio || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSpecialty = specialtyFilter === 'all' || creator.specialty === specialtyFilter;
    return matchesSearch && matchesSpecialty;
  });

  const handleSaveCreatorEdits = (e) => {
    e.preventDefault();
    if (!editingCreator) return;
    onEditCreator?.(editingCreator);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setEditingCreator(null);
    }, 600);
  };

  return (
    <div className="alloy-admin-section">
      <div className="alloy-admin-section-header">
        <div>
          <h2 className="alloy-admin-section-title">Creator Network Oversight</h2>
          <p className="alloy-admin-section-sub">
            Governance of verified talent, aesthetic DNA models, and portfolio authenticity.
          </p>
        </div>
        <div className="alloy-admin-counter-pill">
          <span>{filteredCreators.length === creators.length ? `${creators.length} Creators in Network` : `${filteredCreators.length} of ${creators.length} Creators in Network`}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="alloy-admin-filter-bar">
        <div className="alloy-admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search creators by name, handle, aesthetic DNA, or specialty..."
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
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="alloy-admin-select"
          >
            <option value="all">All Specialties</option>
            {specialties.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Creators Table */}
      <div className="alloy-admin-table-container">
        <table className="alloy-admin-table">
          <thead>
            <tr>
              <th>Creator Profile</th>
              <th>Primary Discipline</th>
              <th>Rate / Allocation</th>
              <th>Location</th>
              <th>Verified Projects</th>
              <th className="text-right">Governance Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCreators.length === 0 ? (
              <tr>
                <td colSpan="6" className="alloy-admin-empty-cell">
                  No creators found matching the current criteria.
                </td>
              </tr>
            ) : (
              filteredCreators.map((creator) => {
                const projectsCount = creator.portfolio?.length || creator.projects?.length || 0;
                const isSuspended = creator.status === 'suspended';

                return (
                  <tr key={creator.id}>
                    <td>
                      <div className="alloy-admin-entity-cell">
                        {creator.avatar ? (
                          <img
                            src={creator.avatar}
                            alt={creator.name}
                            className="alloy-admin-avatar-img"
                          />
                        ) : (
                          <div className="alloy-admin-brand-thumb creator">
                            <Users size={16} />
                          </div>
                        )}
                        <div>
                          <div className="alloy-admin-entity-name flex items-center gap-1.5">
                            <span>{creator.name}</span>
                            <span className="alloy-admin-verified-tick" title="Platform Verified">✓</span>
                          </div>
                          <div className="alloy-admin-entity-id">{creator.handle || `@${creator.id}`}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="alloy-admin-pill-neutral">
                        {creator.specialty || 'Creative Direction'}
                      </span>
                    </td>
                    <td>{(creator.rate || '₹3,000 / project').replace(/\$/g, '₹')}</td>
                    <td>{creator.location || 'Remote Worldwide'}</td>
                    <td>{projectsCount} Works</td>
                    <td className="text-right">
                      <div className="alloy-admin-action-row">
                        <button
                          type="button"
                          className="alloy-admin-btn-table"
                          onClick={() => setEditingCreator({ ...creator })}
                          title="Edit Creator Profile & Attributes"
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="alloy-admin-btn-table"
                          onClick={() => setSelectedCreator(creator)}
                          title="View Creator DNA Dossier"
                        >
                          <Eye size={14} />
                          <span>Dossier</span>
                        </button>
                        {isSuspended ? (
                          <button
                            type="button"
                            className="alloy-admin-btn-table success"
                            onClick={() => onUpdateCreatorStatus?.(creator.id, 'active')}
                          >
                            <ShieldCheck size={14} />
                            <span>Activate</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="alloy-admin-btn-table danger"
                            onClick={() => onUpdateCreatorStatus?.(creator.id, 'suspended')}
                          >
                            <ShieldAlert size={14} />
                            <span>Suspend</span>
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

      {/* Creator Modal */}
      {selectedCreator && (() => {
        const projectsCount = selectedCreator.portfolio?.length || selectedCreator.projects?.length || 4;
        const isSuspended = selectedCreator.status === 'suspended';
        const rateDisplay = (selectedCreator.rate || '₹3,500 / project').replace(/\$/g, '₹');

        return (
          <div className="alloy-modal-backdrop" onClick={() => setSelectedCreator(null)}>
            <div className="alloy-admin-modal-card wide" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="alloy-admin-modal-header">
                <div className="alloy-admin-modal-title-group">
                  <Palette size={20} className="text-amber-400" />
                  <h3>Creator DNA Dossier</h3>
                </div>
                <button
                  type="button"
                  className="alloy-modal-close"
                  onClick={() => setSelectedCreator(null)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Two-Column Dossier Body */}
              <div className="alloy-dossier-layout">
                {/* Left Column — Profile */}
                <div className="alloy-dossier-profile">
                  <div className="alloy-dossier-portrait-wrap">
                    {selectedCreator.avatar ? (
                      <img
                        src={selectedCreator.avatar}
                        alt={selectedCreator.name}
                        className="alloy-dossier-portrait"
                      />
                    ) : (
                      <div className="alloy-dossier-portrait-placeholder">
                        <Users size={36} />
                      </div>
                    )}
                  </div>
                  <h4 className="alloy-dossier-name">{selectedCreator.name}</h4>
                  <p className="alloy-dossier-handle">{selectedCreator.handle || `@${selectedCreator.id}`}</p>
                  <span className="alloy-admin-pill-neutral" style={{ marginTop: '8px', display: 'inline-block' }}>
                    {selectedCreator.specialty || 'Creative Direction'}
                  </span>
                  <p className="alloy-dossier-bio">
                    {selectedCreator.bio || 'High-concept multidisciplinary visual artist delivering award-winning campaigns across luxury, fashion, and editorial spaces.'}
                  </p>
                </div>

                {/* Right Column — Metadata Cards */}
                <div className="alloy-dossier-meta">
                  <div className="alloy-dossier-meta-grid">
                    <div className="alloy-admin-dossier-item">
                      <span className="label">Rate / Allocation</span>
                      <span className="val">{rateDisplay}</span>
                    </div>
                    <div className="alloy-admin-dossier-item">
                      <span className="label">Aesthetic Fit Index</span>
                      <span className="val" style={{ color: 'var(--admin-accent-forest)' }}>96% Match</span>
                    </div>
                    <div className="alloy-admin-dossier-item">
                      <span className="label">AlloyTrust Standing</span>
                      <span className="val" style={{ color: 'var(--admin-accent-forest)' }}>A+ Clean Compliance</span>
                    </div>
                    <div className="alloy-admin-dossier-item">
                      <span className="label">Location</span>
                      <span className="val">{selectedCreator.location || 'Remote Worldwide'}</span>
                    </div>
                    <div className="alloy-admin-dossier-item">
                      <span className="label">Verified Projects</span>
                      <span className="val">{projectsCount} Works</span>
                    </div>
                    <div className="alloy-admin-dossier-item">
                      <span className="label">Network Status</span>
                      <span className="val" style={{ color: isSuspended ? '#c04030' : 'var(--admin-accent-forest)' }}>
                        {isSuspended ? '⬤ Suspended' : '⬤ Active'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="alloy-admin-modal-actions" style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className="alloy-admin-btn-secondary"
                  onClick={() => {
                    const toEdit = { ...selectedCreator };
                    setSelectedCreator(null);
                    setEditingCreator(toEdit);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit3 size={15} />
                  <span>Edit Creator</span>
                </button>
                <button
                  type="button"
                  className="alloy-admin-btn-secondary"
                  onClick={() => setSelectedCreator(null)}
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Creator Modal */}
      {editingCreator && (
        <div className="alloy-modal-backdrop" onClick={() => setEditingCreator(null)}>
          <div className="alloy-admin-modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div className="alloy-admin-modal-header">
              <div className="alloy-admin-modal-title-group">
                <Edit3 size={20} className="text-amber-400" />
                <h3>Edit Creator Profile: {editingCreator.name}</h3>
              </div>
              <button
                type="button"
                className="alloy-modal-close"
                onClick={() => setEditingCreator(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCreatorEdits} className="alloy-admin-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="alloy-admin-input-group">
                  <label>Creator Full Name *</label>
                  <input
                    type="text"
                    required
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCreator.name || ''}
                    onChange={(e) => setEditingCreator({ ...editingCreator, name: e.target.value })}
                  />
                </div>
                <div className="alloy-admin-input-group">
                  <label>Handle</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCreator.handle || ''}
                    onChange={(e) => setEditingCreator({ ...editingCreator, handle: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="alloy-admin-input-group">
                  <label>Primary Discipline / Specialty</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCreator.specialty || ''}
                    onChange={(e) => setEditingCreator({ ...editingCreator, specialty: e.target.value })}
                  />
                </div>
                <div className="alloy-admin-input-group">
                  <label>Creative Identity / Subtitle</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCreator.creativeIdentity || editingCreator.creative_identity || ''}
                    onChange={(e) => setEditingCreator({ ...editingCreator, creativeIdentity: e.target.value, creative_identity: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                <div className="alloy-admin-input-group">
                  <label>Location / Timezone</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCreator.location || ''}
                    onChange={(e) => setEditingCreator({ ...editingCreator, location: e.target.value })}
                  />
                </div>
                <div className="alloy-admin-input-group">
                  <label>Availability</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCreator.availability || 'Available for projects'}
                    onChange={(e) => setEditingCreator({ ...editingCreator, availability: e.target.value })}
                  />
                </div>
                <div className="alloy-admin-input-group">
                  <label>Status Badge</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCreator.statusBadge || editingCreator.status_badge || 'Available now'}
                    onChange={(e) => setEditingCreator({ ...editingCreator, statusBadge: e.target.value, status_badge: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="alloy-admin-input-group">
                  <label>Turnaround Specification</label>
                  <input
                    type="text"
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCreator.turnaround || '48h concept frames'}
                    onChange={(e) => setEditingCreator({ ...editingCreator, turnaround: e.target.value })}
                  />
                </div>
                <div className="alloy-admin-input-group">
                  <label>Governance Status</label>
                  <select
                    className="alloy-admin-textarea"
                    style={{ height: '42px', resize: 'none' }}
                    value={editingCreator.status || 'Published'}
                    onChange={(e) => setEditingCreator({ ...editingCreator, status: e.target.value })}
                  >
                    <option value="Published">Published (Active)</option>
                    <option value="Draft">Draft Mode</option>
                    <option value="Archived">Archived</option>
                    <option value="suspended">Suspended / Restricted</option>
                  </select>
                </div>
              </div>

              <div className="alloy-admin-input-group">
                <label>Creative Bio / Mission</label>
                <textarea
                  rows={3}
                  className="alloy-admin-textarea"
                  value={editingCreator.bio || ''}
                  onChange={(e) => setEditingCreator({ ...editingCreator, bio: e.target.value })}
                />
              </div>

              <div className="alloy-admin-modal-actions" style={{ marginTop: '16px' }}>
                <button
                  type="submit"
                  className="alloy-admin-btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Save size={16} />
                  <span>{saveSuccess ? 'Saved to DB & Website!' : 'Save Creator Changes'}</span>
                </button>
                <button
                  type="button"
                  className="alloy-admin-btn-secondary"
                  onClick={() => setEditingCreator(null)}
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
