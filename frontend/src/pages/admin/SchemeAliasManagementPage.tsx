// frontend/src/pages/admin/SchemeAliasManagementPage.tsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { SchemeAliasService, SchemeAliasWithScheme, SchemeAliasFilters } from '../../services/schemeAlias.service';
import { toastService } from '../../services/toast.service';

const SchemeAliasManagementPage: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // State
  const [aliases, setAliases] = useState<SchemeAliasWithScheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'auto' | 'manual' | 'import'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [totalAliases, setTotalAliases] = useState(0);
  const [statistics, setStatistics] = useState<any>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAlias, setSelectedAlias] = useState<SchemeAliasWithScheme | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    scheme_code: '',
    alias_name: '',
    source: 'manual' as 'manual' | 'import'
  });

  const [bulkFormData, setBulkFormData] = useState({
    scheme_code: '',
    aliases: ''
  });

  const pageSize = 50;

  // Fetch aliases
  const fetchAliases = async () => {
    setIsLoading(true);
    try {
      const filters: SchemeAliasFilters = {
        page,
        page_size: pageSize
      };

      if (searchQuery) filters.search = searchQuery;
      if (sourceFilter !== 'all') filters.source = sourceFilter as any;
      if (statusFilter === 'active') filters.is_active = true;
      if (statusFilter === 'inactive') filters.is_active = false;

      const response = await SchemeAliasService.getAliases(filters);

      if (response.success && response.data) {
        setAliases(response.data);
        setTotalAliases(response.total || 0);
      } else {
        toastService.error(response.error || 'Failed to fetch aliases');
      }
    } catch (error: any) {
      console.error('Error fetching aliases:', error);
      toastService.error('Failed to fetch aliases');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await SchemeAliasService.getStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAliases();
    fetchStatistics();
  }, [page, searchQuery, sourceFilter, statusFilter]);

  // Handle add alias
  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await SchemeAliasService.createAlias(formData);

      if (response.success) {
        toastService.success('Alias created successfully');
        setShowAddModal(false);
        setFormData({ scheme_code: '', alias_name: '', source: 'manual' });
        fetchAliases();
        fetchStatistics();
      } else {
        toastService.error(response.error || 'Failed to create alias');
      }
    } catch (error: any) {
      console.error('Error creating alias:', error);
      toastService.error('Failed to create alias');
    }
  };

  // Handle bulk add
  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const aliasesList = bulkFormData.aliases
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const response = await SchemeAliasService.bulkCreateAliases({
        scheme_code: bulkFormData.scheme_code,
        aliases: aliasesList,
        source: 'manual'
      });

      if (response.success) {
        toastService.success(`Created ${response.created} aliases, skipped ${response.skipped}`);
        if (response.errors.length > 0) {
          console.warn('Bulk creation errors:', response.errors);
        }
        setShowBulkModal(false);
        setBulkFormData({ scheme_code: '', aliases: '' });
        fetchAliases();
        fetchStatistics();
      } else {
        toastService.error('Failed to bulk create aliases');
      }
    } catch (error: any) {
      console.error('Error bulk creating aliases:', error);
      toastService.error('Failed to bulk create aliases');
    }
  };

  // Handle update
  const handleUpdateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlias) return;

    try {
      const response = await SchemeAliasService.updateAlias(selectedAlias.id, {
        alias_name: formData.alias_name
      });

      if (response.success) {
        toastService.success('Alias updated successfully');
        setShowEditModal(false);
        setSelectedAlias(null);
        fetchAliases();
      } else {
        toastService.error(response.error || 'Failed to update alias');
      }
    } catch (error: any) {
      console.error('Error updating alias:', error);
      toastService.error('Failed to update alias');
    }
  };

  // Handle delete
  const handleDeleteAlias = async (aliasId: number) => {
    if (!window.confirm('Are you sure you want to delete this alias?')) return;

    try {
      const response = await SchemeAliasService.deleteAlias(aliasId);

      if (response.success) {
        toastService.success('Alias deleted successfully');
        fetchAliases();
        fetchStatistics();
      } else {
        toastService.error(response.error || 'Failed to delete alias');
      }
    } catch (error: any) {
      console.error('Error deleting alias:', error);
      toastService.error('Failed to delete alias');
    }
  };

  // Handle backfill
  const handleBackfill = async () => {
    if (!window.confirm('This will auto-create aliases for schemes without them. Continue?')) return;

    try {
      toastService.info('Starting backfill... This may take a moment.');
      const response = await SchemeAliasService.backfillAliases();

      if (response.success && response.data) {
        toastService.success(`Backfilled ${response.data.created} aliases`);
        fetchAliases();
        fetchStatistics();
      } else {
        toastService.error(response.error || 'Failed to backfill aliases');
      }
    } catch (error: any) {
      console.error('Error backfilling aliases:', error);
      toastService.error('Failed to backfill aliases');
    }
  };

  const totalPages = Math.ceil(totalAliases / pageSize);

  return (
    <div style={{ padding: '24px', backgroundColor: colors.utility.primaryBackground, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: colors.utility.primaryText, marginBottom: '8px' }}>
          Scheme Alias Management
        </h1>
        <p style={{ color: colors.utility.secondaryText }}>
          Manage scheme name variations for flexible transaction imports
        </p>
      </div>

      {/* Statistics */}
      {statistics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <StatCard
            label="Total Aliases"
            value={statistics.total_aliases}
            colors={colors}
          />
          <StatCard
            label="Active Aliases"
            value={statistics.active_aliases}
            colors={colors}
          />
          <StatCard
            label="Schemes with Aliases"
            value={statistics.schemes_with_aliases}
            colors={colors}
          />
          <StatCard
            label="Avg per Scheme"
            value={statistics.avg_aliases_per_scheme.toFixed(1)}
            colors={colors}
          />
        </div>
      )}

      {/* Actions and Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            + Add Alias
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.brand.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Bulk Import
          </button>
          <button
            onClick={handleBackfill}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.semantic.info,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Auto-Backfill
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search aliases or scheme names..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              minWidth: '250px'
            }}
          />
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value as any);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText
            }}
          >
            <option value="all">All Sources</option>
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
            <option value="import">Import</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Aliases Table */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: colors.utility.secondaryText }}>
            Loading aliases...
          </div>
        ) : aliases.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: colors.utility.secondaryText }}>
            No aliases found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: colors.utility.secondaryBackground }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', color: colors.utility.primaryText, fontWeight: '600' }}>Alias Name</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colors.utility.primaryText, fontWeight: '600' }}>Scheme Code</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colors.utility.primaryText, fontWeight: '600' }}>Scheme Name</th>
                <th style={{ padding: '12px', textAlign: 'left', color: colors.utility.primaryText, fontWeight: '600' }}>Source</th>
                <th style={{ padding: '12px', textAlign: 'center', color: colors.utility.primaryText, fontWeight: '600' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', color: colors.utility.primaryText, fontWeight: '600' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((alias) => (
                <tr key={alias.id} style={{ borderBottom: `1px solid ${colors.utility.primaryText}20` }}>
                  <td style={{ padding: '12px', color: colors.utility.primaryText }}>{alias.alias_name}</td>
                  <td style={{ padding: '12px', color: colors.utility.secondaryText, fontFamily: 'monospace' }}>
                    {alias.scheme_code}
                  </td>
                  <td style={{ padding: '12px', color: colors.utility.secondaryText, fontSize: '14px' }}>
                    {alias.scheme_name}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: alias.source === 'auto' ? colors.semantic.info + '20' : colors.brand.primary + '20',
                      color: alias.source === 'auto' ? colors.semantic.info : colors.brand.primary
                    }}>
                      {alias.source}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: alias.is_active ? colors.semantic.success + '20' : colors.semantic.error + '20',
                      color: alias.is_active ? colors.semantic.success : colors.semantic.error
                    }}>
                      {alias.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setSelectedAlias(alias);
                        setFormData({ ...formData, alias_name: alias.alias_name });
                        setShowEditModal(true);
                      }}
                      style={{
                        padding: '4px 8px',
                        marginRight: '4px',
                        backgroundColor: colors.brand.secondary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAlias(alias.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: colors.semantic.error,
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginTop: '24px'
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              backgroundColor: page === 1 ? `${colors.utility.primaryText}20` : colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: page === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          <span style={{
            padding: '8px 16px',
            color: colors.utility.primaryText
          }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '8px 16px',
              backgroundColor: page === totalPages ? `${colors.utility.primaryText}20` : colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: page === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <Modal
          title="Add Scheme Alias"
          onClose={() => setShowAddModal(false)}
          colors={colors}
        >
          <form onSubmit={handleAddAlias}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.utility.primaryText }}>
                Scheme Code *
              </label>
              <input
                type="text"
                required
                value={formData.scheme_code}
                onChange={(e) => setFormData({ ...formData, scheme_code: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
                placeholder="e.g., 119551"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.utility.primaryText }}>
                Alias Name *
              </label>
              <input
                type="text"
                required
                value={formData.alias_name}
                onChange={(e) => setFormData({ ...formData, alias_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
                placeholder="e.g., Axis Tax Saver"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Add Alias
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <Modal
          title="Bulk Import Aliases"
          onClose={() => setShowBulkModal(false)}
          colors={colors}
        >
          <form onSubmit={handleBulkAdd}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.utility.primaryText }}>
                Scheme Code *
              </label>
              <input
                type="text"
                required
                value={bulkFormData.scheme_code}
                onChange={(e) => setBulkFormData({ ...bulkFormData, scheme_code: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
                placeholder="e.g., 119551"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.utility.primaryText }}>
                Aliases (one per line) *
              </label>
              <textarea
                required
                rows={8}
                value={bulkFormData.aliases}
                onChange={(e) => setBulkFormData({ ...bulkFormData, aliases: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}
                placeholder="Axis Tax Saver&#10;Axis ELSS&#10;Axis Long Term Equity"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Import Aliases
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAlias && (
        <Modal
          title="Edit Alias"
          onClose={() => {
            setShowEditModal(false);
            setSelectedAlias(null);
          }}
          colors={colors}
        >
          <form onSubmit={handleUpdateAlias}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.utility.primaryText }}>
                Scheme: {selectedAlias.scheme_name}
              </label>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.utility.secondaryText, fontSize: '12px' }}>
                Code: {selectedAlias.scheme_code}
              </label>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: colors.utility.primaryText }}>
                Alias Name *
              </label>
              <input
                type="text"
                required
                value={formData.alias_name}
                onChange={(e) => setFormData({ ...formData, alias_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedAlias(null);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: `${colors.utility.primaryText}20`,
                  color: colors.utility.primaryText,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Update Alias
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// Helper Components
const StatCard: React.FC<{ label: string; value: string | number; colors: any }> = ({ label, value, colors }) => (
  <div style={{
    backgroundColor: colors.utility.secondaryBackground,
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }}>
    <div style={{ color: colors.utility.secondaryText, fontSize: '14px', marginBottom: '8px' }}>
      {label}
    </div>
    <div style={{ color: colors.utility.primaryText, fontSize: '24px', fontWeight: 'bold' }}>
      {value}
    </div>
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; colors: any; children: React.ReactNode }> = ({
  title,
  onClose,
  colors,
  children
}) => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  }}>
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '8px',
      padding: '24px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: colors.utility.primaryText, margin: 0 }}>
          {title}
        </h2>
        <button
          onClick={onClose}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: colors.utility.secondaryText
          }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default SchemeAliasManagementPage;
