// frontend/src/pages/dataops/CourseCorrectionPage.tsx
// Course Correction - Scheme Code Migration Tool
// Simplified flow: Customer → Schemes → Target → Confirm

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomers } from '../../hooks/useCustomers';
import {
  useCorrections,
  useCustomerSchemes,
  useSchemeSearch,
  useCreateCorrection,
  useExecuteCorrection,
  useRollbackCorrection,
  useDeleteCorrection,
  useMarkSnapshotDone
} from '../../hooks/useCourseCorrection';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  History,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  User,
  XCircle
} from 'lucide-react';
import type {
  CourseCorrection,
  CourseCorrectionStatus,
  CustomerScheme,
  SchemeSearchResult
} from '../../types/courseCorrection.types';

type WizardStep = 'list' | 'search-customer' | 'select-scheme' | 'select-target' | 'confirm';

interface SelectedCustomer {
  id: number;
  name: string;
}

const CourseCorrectionPage: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('list');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<CustomerScheme | null>(null);
  const [selectedTargetScheme, setSelectedTargetScheme] = useState<SchemeSearchResult | null>(null);
  const [notes, setNotes] = useState('');
  const [targetSearch, setTargetSearch] = useState('');

  // List state
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CourseCorrectionStatus | ''>('');

  // Queries
  const { data: correctionsData, isLoading: correctionsLoading, refetch } = useCorrections({
    page,
    page_size: 15,
    status: statusFilter || undefined
  });
  const { data: customersData, isLoading: customersLoading } = useCustomers({
    search: customerSearch,
    page: 1,
    page_size: 20
  });
  const { data: customerSchemes, isLoading: schemesLoading } = useCustomerSchemes(selectedCustomer?.id || null);
  const { data: schemeSearchResults, isLoading: searchLoading } = useSchemeSearch(targetSearch);

  // Mutations
  const createMutation = useCreateCorrection();
  const executeMutation = useExecuteCorrection();
  const rollbackMutation = useRollbackCorrection();
  const deleteMutation = useDeleteCorrection();
  const snapshotMutation = useMarkSnapshotDone();

  const corrections = correctionsData?.corrections || [];
  const pagination = correctionsData;
  const customers = customersData?.customers || [];

  // Handlers
  const resetWizard = () => {
    setWizardStep('list');
    setCustomerSearch('');
    setSelectedCustomer(null);
    setSelectedScheme(null);
    setSelectedTargetScheme(null);
    setNotes('');
    setTargetSearch('');
  };

  const handleCreateCorrection = async () => {
    if (!selectedCustomer || !selectedScheme || !selectedTargetScheme) return;

    await createMutation.mutateAsync({
      customer_id: selectedCustomer.id,
      source_scheme_code: selectedScheme.scheme_code,
      target_scheme_code: selectedTargetScheme.scheme_code,
      notes: notes || undefined
    });

    resetWizard();
    refetch();
  };

  const handleExecute = async (id: number) => {
    if (window.confirm('Execute this migration? Transactions will be updated.')) {
      await executeMutation.mutateAsync(id);
      refetch();
    }
  };

  const handleRollback = async (id: number) => {
    if (window.confirm('Rollback this migration? Transactions will be restored to original scheme code.')) {
      await rollbackMutation.mutateAsync(id);
      refetch();
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this pending correction?')) {
      await deleteMutation.mutateAsync(id);
      refetch();
    }
  };

  const handleSnapshotDone = async (id: number) => {
    await snapshotMutation.mutateAsync(id);
    refetch();
  };

  // Formatting helpers
  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: CourseCorrectionStatus) => {
    const styles: Record<CourseCorrectionStatus, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: '#fef3c7', text: '#92400e', icon: <Clock size={12} /> },
      completed: { bg: '#d1fae5', text: '#065f46', icon: <Check size={12} /> },
      rolled_back: { bg: '#e0e7ff', text: '#3730a3', icon: <RotateCcw size={12} /> },
      failed: { bg: '#fee2e2', text: '#991b1b', icon: <XCircle size={12} /> }
    };
    const s = styles[status];
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: s.bg,
        color: s.text
      }}>
        {s.icon} {status.replace('_', ' ')}
      </span>
    );
  };

  // Card style helper
  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.utility.secondaryBackground,
    borderRadius: '12px',
    border: `1px solid ${colors.utility.primaryText}20`,
    padding: '20px'
  };

  // ============================================================================
  // RENDER: History List
  // ============================================================================
  const renderHistoryList = () => (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Database size={28} color={colors.brand.primary} />
            Course Correction
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: colors.utility.secondaryText }}>
            Fix scheme code mappings for individual customers
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => refetch()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: colors.utility.primaryText
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => setWizardStep('search-customer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              backgroundColor: colors.brand.primary,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff'
            }}
          >
            <Plus size={16} /> New Migration
          </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <label style={{ fontSize: '14px', color: colors.utility.secondaryText }}>Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as CourseCorrectionStatus | ''); setPage(1); }}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${colors.utility.primaryText}20`,
            backgroundColor: colors.utility.primaryBackground,
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="rolled_back">Rolled Back</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {correctionsLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>Loading...</div>
        ) : corrections.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
            <History size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No course corrections found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: colors.utility.secondaryBackground }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: colors.utility.secondaryText }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: colors.utility.secondaryText }}>Customer</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: colors.utility.secondaryText }}>From → To</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: colors.utility.secondaryText }}>Txns</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: colors.utility.secondaryText }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: colors.utility.secondaryText }}>Snapshot</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: colors.utility.secondaryText }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map((c: CourseCorrection) => (
                <tr key={c.id} style={{ borderTop: `1px solid ${colors.utility.primaryText}20` }}>
                  <td style={{ padding: '12px 16px', color: colors.utility.primaryText }}>{formatDate(c.created_at)}</td>
                  <td style={{ padding: '12px 16px', color: colors.utility.primaryText, fontWeight: 500 }}>{c.customer_name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: colors.semantic.error }}>{c.source_scheme_code}</span>
                      <ArrowRight size={14} color={colors.utility.secondaryText} />
                      <span style={{ color: colors.semantic.success }}>{c.target_scheme_code}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.utility.primaryText }}>{c.transaction_count}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{getStatusBadge(c.status)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {c.status === 'completed' && !c.snapshot_regenerated ? (
                      <button
                        onClick={() => handleSnapshotDone(c.id)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          backgroundColor: '#fef3c7',
                          border: '1px solid #f59e0b',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#92400e'
                        }}
                        title="Mark as regenerated after you regenerate snapshots"
                      >
                        Mark Done
                      </button>
                    ) : c.snapshot_regenerated ? (
                      <Check size={16} color={colors.semantic.success} />
                    ) : (
                      <span style={{ color: colors.utility.secondaryText }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      {c.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleExecute(c.id)}
                            disabled={executeMutation.isPending}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: colors.semantic.success,
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: '#fff',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Play size={12} /> Execute
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deleteMutation.isPending}
                            style={{
                              padding: '6px',
                              backgroundColor: 'transparent',
                              border: `1px solid ${colors.utility.primaryText}20`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: colors.semantic.error
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {c.status === 'completed' && (
                        <button
                          onClick={() => handleRollback(c.id)}
                          disabled={rollbackMutation.isPending}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'transparent',
                            border: `1px solid ${colors.utility.primaryText}20`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: colors.utility.primaryText,
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <RotateCcw size={12} /> Rollback
                        </button>
                      )}
                      {(c.status === 'rolled_back' || c.status === 'failed') && (
                        <span style={{ color: colors.utility.secondaryText, fontSize: '12px' }}>-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 12px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
            Page {page} of {pagination.total_pages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
            disabled={page === pagination.total_pages}
            style={{
              padding: '8px 12px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              cursor: page === pagination.total_pages ? 'not-allowed' : 'pointer',
              opacity: page === pagination.total_pages ? 0.5 : 1
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </>
  );

  // ============================================================================
  // RENDER: Step 1 - Search Customer
  // ============================================================================
  const renderSearchCustomer = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={resetWizard} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.utility.secondaryText }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: colors.utility.primaryText }}>
          Step 1: Search Customer
        </h2>
      </div>

      <div style={cardStyle}>
        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.utility.secondaryText }} />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}20`,
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Results */}
        {customersLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: colors.utility.secondaryText }}>Searching...</div>
        ) : customerSearch.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: colors.utility.secondaryText }}>
            Enter at least 2 characters to search
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: colors.utility.secondaryText }}>No customers found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {customers.map((c: any) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCustomer({ id: c.id, name: c.name });
                  setWizardStep('select-scheme');
                }}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  cursor: 'pointer',
                  backgroundColor: colors.utility.primaryBackground,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = colors.brand.primary}
                onMouseOut={(e) => e.currentTarget.style.borderColor = `${colors.utility.primaryText}20`}
              >
                <User size={20} color={colors.utility.secondaryText} />
                <div>
                  <div style={{ fontWeight: 600, color: colors.utility.primaryText }}>{c.name}</div>
                  {c.iwell_code && (
                    <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                      Code: {c.iwell_code}
                    </div>
                  )}
                </div>
                <ChevronRight size={20} color={colors.utility.secondaryText} style={{ marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: Step 2 - Select Scheme (from customer's transactions)
  // ============================================================================
  const renderSelectScheme = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => setWizardStep('search-customer')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.utility.secondaryText }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: colors.utility.primaryText }}>
          Step 2: Select Wrong Scheme
        </h2>
      </div>

      {/* Selected customer */}
      <div style={{ ...cardStyle, marginBottom: '16px', backgroundColor: colors.utility.secondaryBackground }}>
        <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '4px' }}>Customer</div>
        <div style={{ fontWeight: 600, color: colors.utility.primaryText, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={18} />
          {selectedCustomer?.name}
        </div>
      </div>

      {/* Schemes list */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: colors.utility.primaryText }}>
          Schemes in Customer's Portfolio
        </h3>

        {schemesLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>Loading schemes...</div>
        ) : !customerSchemes || customerSchemes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>
            No schemes found for this customer
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {customerSchemes.map((s: CustomerScheme) => (
              <div
                key={s.scheme_code}
                onClick={() => { setSelectedScheme(s); setWizardStep('select-target'); }}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  cursor: 'pointer',
                  backgroundColor: colors.utility.primaryBackground
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = colors.brand.primary}
                onMouseOut={(e) => e.currentTarget.style.borderColor = `${colors.utility.primaryText}20`}
              >
                <div style={{ fontWeight: 600, color: colors.utility.primaryText }}>
                  {s.scheme_name || s.scheme_code}
                </div>
                <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                  {s.amc_name && `${s.amc_name} • `}Code: <strong>{s.scheme_code}</strong>
                </div>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                  {s.transaction_count} transactions • {formatCurrency(s.total_invested)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: Step 3 - Select Target Scheme
  // ============================================================================
  const renderSelectTarget = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => setWizardStep('select-scheme')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.utility.secondaryText }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: colors.utility.primaryText }}>
          Step 3: Select Correct Scheme
        </h2>
      </div>

      {/* Summary */}
      <div style={{ ...cardStyle, marginBottom: '16px', backgroundColor: colors.utility.secondaryBackground }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>Customer</div>
            <div style={{ fontWeight: 600, color: colors.utility.primaryText }}>{selectedCustomer?.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>Wrong Scheme Code</div>
            <div style={{ fontWeight: 600, color: colors.semantic.error }}>{selectedScheme?.scheme_code}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>Transactions</div>
            <div style={{ fontWeight: 600, color: colors.utility.primaryText }}>{selectedScheme?.transaction_count}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={cardStyle}>
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: colors.utility.secondaryText }} />
          <input
            type="text"
            placeholder="Search for correct scheme (min 2 characters)..."
            value={targetSearch}
            onChange={(e) => setTargetSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}20`,
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {searchLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: colors.utility.secondaryText }}>Searching...</div>
        ) : targetSearch.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: colors.utility.secondaryText }}>Enter at least 2 characters to search</div>
        ) : schemeSearchResults?.schemes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: colors.utility.secondaryText }}>No schemes found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {schemeSearchResults?.schemes.map((s: SchemeSearchResult) => {
              const isSameAsSource = s.scheme_code === selectedScheme?.scheme_code;
              return (
                <div
                  key={s.scheme_code}
                  onClick={() => {
                    if (!isSameAsSource) {
                      setSelectedTargetScheme(s);
                      setWizardStep('confirm');
                    }
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: `1px solid ${isSameAsSource ? colors.semantic.error : `${colors.utility.primaryText}20`}`,
                    cursor: isSameAsSource ? 'not-allowed' : 'pointer',
                    backgroundColor: isSameAsSource ? colors.utility.secondaryBackground : colors.utility.primaryBackground,
                    opacity: isSameAsSource ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!isSameAsSource) e.currentTarget.style.borderColor = colors.brand.primary;
                  }}
                  onMouseOut={(e) => {
                    if (!isSameAsSource) e.currentTarget.style.borderColor = `${colors.utility.primaryText}20`;
                  }}
                >
                  <div style={{ fontWeight: 600, color: colors.utility.primaryText }}>{s.scheme_name}</div>
                  <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                    {s.amc_name} • Code: {s.scheme_code}
                    {isSameAsSource && <span style={{ color: colors.semantic.error }}> (Same as source)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: Step 4 - Confirm
  // ============================================================================
  const renderConfirm = () => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => setWizardStep('select-target')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.utility.secondaryText }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: colors.utility.primaryText }}>
          Step 4: Confirm Migration
        </h2>
      </div>

      <div style={cardStyle}>
        {/* Warning */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '16px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <AlertTriangle size={20} color="#92400e" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '14px', color: '#92400e' }}>
            This will create a migration record in <strong>pending</strong> status. You will need to click <strong>Execute</strong> to apply the changes.
            After execution, remember to <strong>regenerate snapshots</strong> for this customer.
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'start' }}>
            <span style={{ fontWeight: 600, color: colors.utility.secondaryText }}>Customer:</span>
            <span style={{ color: colors.utility.primaryText }}>{selectedCustomer?.name}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'start' }}>
            <span style={{ fontWeight: 600, color: colors.utility.secondaryText }}>Transactions:</span>
            <span style={{ color: colors.utility.primaryText }}>{selectedScheme?.transaction_count}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'start' }}>
            <span style={{ fontWeight: 600, color: colors.utility.secondaryText }}>Total Invested:</span>
            <span style={{ color: colors.utility.primaryText }}>{formatCurrency(selectedScheme?.total_invested || 0)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'start' }}>
            <span style={{ fontWeight: 600, color: colors.utility.secondaryText }}>From (Wrong):</span>
            <div>
              <span style={{ color: colors.semantic.error, fontWeight: 600 }}>{selectedScheme?.scheme_code}</span>
              <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>{selectedScheme?.scheme_name}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px', alignItems: 'start' }}>
            <span style={{ fontWeight: 600, color: colors.utility.secondaryText }}>To (Correct):</span>
            <div>
              <span style={{ color: colors.semantic.success, fontWeight: 600 }}>{selectedTargetScheme?.scheme_code}</span>
              <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>{selectedTargetScheme?.scheme_name}</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: colors.utility.secondaryText }}>
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this correction..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}20`,
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={resetWizard}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: colors.utility.primaryText
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateCorrection}
            disabled={createMutation.isPending}
            style={{
              padding: '12px 24px',
              backgroundColor: colors.brand.primary,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {createMutation.isPending ? 'Creating...' : <><Plus size={16} /> Create Migration</>}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {wizardStep === 'list' && renderHistoryList()}
      {wizardStep === 'search-customer' && renderSearchCustomer()}
      {wizardStep === 'select-scheme' && renderSelectScheme()}
      {wizardStep === 'select-target' && renderSelectTarget()}
      {wizardStep === 'confirm' && renderConfirm()}
    </div>
  );
};

export default CourseCorrectionPage;
