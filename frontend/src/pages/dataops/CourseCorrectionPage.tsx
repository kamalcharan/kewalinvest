// frontend/src/pages/dataops/CourseCorrectionPage.tsx
// Course Correction - Scheme Code Migration Tool
// Flow: Navigate from Customer List → Select scheme to correct → Select target → Confirm

import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomer } from '../../hooks/useCustomers';
import { usePortfolioData } from '../../hooks/usePortfolioData';
import {
  useCorrections,
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
  GitBranch,
  History,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  User,
  Users,
  XCircle,
  TrendingUp,
  TrendingDown,
  Package
} from 'lucide-react';
import type {
  CourseCorrection,
  CourseCorrectionStatus,
  SchemeSearchResult
} from '../../types/courseCorrection.types';
import type { PortfolioHolding } from '../../types/portfolio.types';

type PageView = 'empty' | 'customer-schemes' | 'select-target' | 'confirm' | 'history';

const CourseCorrectionPage: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get customerId from URL query params
  const customerId = searchParams.get('customerId') ? parseInt(searchParams.get('customerId')!) : null;

  // Page state
  const [pageView, setPageView] = useState<PageView>(customerId ? 'customer-schemes' : 'empty');
  const [selectedScheme, setSelectedScheme] = useState<PortfolioHolding | null>(null);
  const [selectedTargetScheme, setSelectedTargetScheme] = useState<SchemeSearchResult | null>(null);
  const [notes, setNotes] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // History list state
  const [historyPage, setHistoryPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CourseCorrectionStatus | ''>('');

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useCustomer(customerId || 0);

  // Fetch portfolio data (holdings = MF schemes)
  const { portfolio, isLoading: portfolioLoading } = usePortfolioData({
    customerId: customerId || undefined,
    autoFetch: !!customerId
  });

  // Fetch corrections history for this customer
  const { data: correctionsData, isLoading: correctionsLoading, refetch } = useCorrections({
    page: historyPage,
    page_size: 10,
    status: statusFilter || undefined,
    customer_id: customerId || undefined
  });

  // Scheme search for target selection
  const { data: schemeSearchResults, isLoading: searchLoading } = useSchemeSearch(targetSearch);

  // Mutations
  const createMutation = useCreateCorrection();
  const executeMutation = useExecuteCorrection();
  const rollbackMutation = useRollbackCorrection();
  const deleteMutation = useDeleteCorrection();
  const snapshotMutation = useMarkSnapshotDone();

  const corrections = correctionsData?.corrections || [];
  const holdings = portfolio?.holdings || [];

  // Reset to scheme selection
  const resetToSchemes = () => {
    setPageView('customer-schemes');
    setSelectedScheme(null);
    setSelectedTargetScheme(null);
    setNotes('');
    setTargetSearch('');
  };

  // Handle create correction
  const handleCreateCorrection = async () => {
    if (!customerId || !selectedScheme || !selectedTargetScheme) return;

    await createMutation.mutateAsync({
      customer_id: customerId,
      source_scheme_code: selectedScheme.scheme_code,
      target_scheme_code: selectedTargetScheme.scheme_code,
      notes: notes || undefined
    });

    resetToSchemes();
    refetch();
  };

  // Handle execute
  const handleExecute = async (id: number) => {
    if (window.confirm('Execute this migration? Transactions will be updated.')) {
      await executeMutation.mutateAsync(id);
      refetch();
    }
  };

  // Handle rollback
  const handleRollback = async (id: number) => {
    if (window.confirm('Rollback this migration? Transactions will be restored to original scheme code.')) {
      await rollbackMutation.mutateAsync(id);
      refetch();
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this pending correction?')) {
      await deleteMutation.mutateAsync(id);
      refetch();
    }
  };

  // Handle snapshot done
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
    padding: '24px'
  };

  // ============================================================================
  // RENDER: Empty State (No customer selected)
  // ============================================================================
  const renderEmptyState = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px'
    }}>
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: colors.brand.primary + '15',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '32px'
      }}>
        <GitBranch size={56} color={colors.brand.primary} />
      </div>

      <h1 style={{
        fontSize: '28px',
        fontWeight: '700',
        color: colors.utility.primaryText,
        margin: '0 0 12px 0',
        textAlign: 'center'
      }}>
        Course Correction
      </h1>

      <p style={{
        fontSize: '16px',
        color: colors.utility.secondaryText,
        margin: '0 0 8px 0',
        textAlign: 'center',
        maxWidth: '500px',
        lineHeight: '1.6'
      }}>
        Fix scheme code mappings for customers when wrong codes were imported.
      </p>

      <p style={{
        fontSize: '14px',
        color: colors.utility.secondaryText,
        margin: '0 0 32px 0',
        textAlign: 'center',
        maxWidth: '450px'
      }}>
        To get started, navigate to a customer from the Customers list and click the Course Correction icon.
      </p>

      <button
        onClick={() => navigate('/customers')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '14px 28px',
          backgroundColor: colors.brand.primary,
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Users size={18} />
        Go to Customers
      </button>

      {/* View History Link */}
      <button
        onClick={() => {
          setShowHistory(true);
          setPageView('history');
        }}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: 'transparent',
          color: colors.utility.secondaryText,
          border: `1px solid ${colors.utility.primaryText}20`,
          borderRadius: '8px',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <History size={16} />
        View All Corrections History
      </button>
    </div>
  );

  // ============================================================================
  // RENDER: Customer Banner
  // ============================================================================
  const renderCustomerBanner = () => {
    if (!customer) return null;

    return (
      <div style={{
        ...cardStyle,
        marginBottom: '24px',
        background: `linear-gradient(135deg, ${colors.brand.primary}10 0%, ${colors.brand.secondary}10 100%)`,
        borderColor: colors.brand.primary + '30'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: colors.brand.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '22px',
              fontWeight: '600'
            }}>
              {customer.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {customer.prefix} {customer.name}
              </h2>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '4px',
                fontSize: '14px',
                color: colors.utility.secondaryText
              }}>
                {customer.iwell_code && (
                  <span style={{ fontFamily: 'monospace' }}>IWell: {customer.iwell_code}</span>
                )}
                {portfolio && (
                  <>
                    <span>•</span>
                    <span>{holdings.length} schemes</span>
                    <span>•</span>
                    <span style={{ color: colors.brand.primary, fontWeight: '500' }}>
                      {formatCurrency(portfolio.summary?.current_value || 0)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                backgroundColor: showHistory ? colors.brand.primary : colors.utility.secondaryBackground,
                color: showHistory ? '#fff' : colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <History size={16} />
              {showHistory ? 'Hide History' : 'Show History'}
            </button>
            <button
              onClick={() => navigate(`/customers/${customerId}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                color: colors.utility.primaryText
              }}
            >
              <User size={16} />
              View Profile
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: History Table (for this customer or all)
  // ============================================================================
  const renderHistoryTable = () => (
    <div style={{ ...cardStyle, marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <History size={18} />
          {customerId ? 'Correction History' : 'All Corrections History'}
        </h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as CourseCorrectionStatus | ''); setHistoryPage(1); }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: `1px solid ${colors.utility.primaryText}20`,
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '13px'
            }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rolled_back">Rolled Back</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={() => refetch()}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              color: colors.utility.primaryText
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {correctionsLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
          Loading...
        </div>
      ) : corrections.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
          <History size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ margin: 0 }}>No corrections found</p>
        </div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: colors.utility.primaryBackground }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: colors.utility.secondaryText }}>Date</th>
                {!customerId && <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: colors.utility.secondaryText }}>Customer</th>}
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: colors.utility.secondaryText }}>From → To</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: colors.utility.secondaryText }}>Txns</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: colors.utility.secondaryText }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: colors.utility.secondaryText }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map((c: CourseCorrection) => (
                <tr key={c.id} style={{ borderTop: `1px solid ${colors.utility.primaryText}10` }}>
                  <td style={{ padding: '10px 12px', color: colors.utility.primaryText }}>{formatDate(c.created_at)}</td>
                  {!customerId && <td style={{ padding: '10px 12px', color: colors.utility.primaryText, fontWeight: 500 }}>{c.customer_name}</td>}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <span style={{ color: colors.semantic.error, fontFamily: 'monospace' }}>{c.source_scheme_code}</span>
                      <ArrowRight size={12} color={colors.utility.secondaryText} />
                      <span style={{ color: colors.semantic.success, fontFamily: 'monospace' }}>{c.target_scheme_code}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: colors.utility.primaryText }}>{c.transaction_count}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{getStatusBadge(c.status)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      {c.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleExecute(c.id)}
                            disabled={executeMutation.isPending}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: colors.semantic.success,
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: '#fff',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Play size={10} /> Execute
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deleteMutation.isPending}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'transparent',
                              border: `1px solid ${colors.utility.primaryText}20`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: colors.semantic.error
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                      {c.status === 'completed' && (
                        <>
                          {!c.snapshot_regenerated && (
                            <button
                              onClick={() => handleSnapshotDone(c.id)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '10px',
                                backgroundColor: '#fef3c7',
                                border: '1px solid #f59e0b',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                color: '#92400e'
                              }}
                              title="Mark snapshot as regenerated"
                            >
                              Mark Done
                            </button>
                          )}
                          <button
                            onClick={() => handleRollback(c.id)}
                            disabled={rollbackMutation.isPending}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: 'transparent',
                              border: `1px solid ${colors.utility.primaryText}20`,
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: colors.utility.primaryText,
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <RotateCcw size={10} /> Rollback
                          </button>
                        </>
                      )}
                      {(c.status === 'rolled_back' || c.status === 'failed') && (
                        <span style={{ color: colors.utility.secondaryText, fontSize: '11px' }}>-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {correctionsData && correctionsData.total_pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                style={{
                  padding: '6px 10px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  cursor: historyPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: historyPage === 1 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                Page {historyPage} of {correctionsData.total_pages}
              </span>
              <button
                onClick={() => setHistoryPage(p => Math.min(correctionsData.total_pages, p + 1))}
                disabled={historyPage === correctionsData.total_pages}
                style={{
                  padding: '6px 10px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  cursor: historyPage === correctionsData.total_pages ? 'not-allowed' : 'pointer',
                  opacity: historyPage === correctionsData.total_pages ? 0.5 : 1
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Back button when viewing all history */}
      {!customerId && pageView === 'history' && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => setPageView('empty')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              cursor: 'pointer',
              color: colors.utility.primaryText,
              fontSize: '14px'
            }}
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER: Customer Schemes (MF Holdings)
  // ============================================================================
  const renderCustomerSchemes = () => (
    <div style={cardStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            Select Scheme to Correct
          </h3>
          <p style={{
            margin: '4px 0 0',
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            Choose the scheme with incorrect code that needs to be migrated
          </p>
        </div>
      </div>

      {portfolioLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: colors.utility.secondaryText }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `3px solid ${colors.brand.primary}20`,
            borderTop: `3px solid ${colors.brand.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Loading schemes...
        </div>
      ) : holdings.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: colors.utility.secondaryText }}>
          <Package size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ margin: 0, fontSize: '16px' }}>No schemes found for this customer</p>
          <p style={{ margin: '8px 0 0', fontSize: '14px' }}>Import transactions first to see holdings</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '16px'
        }}>
          {holdings.map((holding: PortfolioHolding) => {
            const returnPct = holding.return_percentage || 0;
            const isPositive = returnPct >= 0;

            return (
              <div
                key={holding.scheme_code}
                onClick={() => {
                  setSelectedScheme(holding);
                  setPageView('select-target');
                }}
                style={{
                  padding: '20px',
                  borderRadius: '10px',
                  border: `1px solid ${colors.utility.primaryText}15`,
                  backgroundColor: colors.utility.primaryBackground,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = colors.brand.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${colors.utility.primaryText}15`;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '8px',
                  lineHeight: '1.4'
                }}>
                  {holding.scheme_name || holding.scheme_code}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: colors.utility.secondaryText,
                  marginBottom: '12px'
                }}>
                  <span style={{
                    fontFamily: 'monospace',
                    backgroundColor: colors.utility.primaryText + '10',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    {holding.scheme_code}
                  </span>
                  {holding.amc_name && (
                    <>
                      <span>•</span>
                      <span>{holding.amc_name}</span>
                    </>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
                      Current Value
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                      {formatCurrency(holding.current_value || 0)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
                      Returns
                    </div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isPositive ? colors.semantic.success : colors.semantic.error,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {isPositive ? '+' : ''}{returnPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  // ============================================================================
  // RENDER: Select Target Scheme
  // ============================================================================
  const renderSelectTarget = () => (
    <div>
      {/* Back button and header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={resetToSchemes}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.utility.secondaryText,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: colors.utility.primaryText }}>
          Select Correct Scheme
        </h2>
      </div>

      {/* Selected scheme summary */}
      <div style={{
        ...cardStyle,
        marginBottom: '20px',
        backgroundColor: colors.semantic.error + '08',
        borderColor: colors.semantic.error + '30'
      }}>
        <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
          Scheme to Replace (Wrong Code)
        </div>
        <div style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
          {selectedScheme?.scheme_name}
        </div>
        <div style={{
          fontSize: '13px',
          color: colors.semantic.error,
          fontFamily: 'monospace',
          marginTop: '4px'
        }}>
          Code: {selectedScheme?.scheme_code}
        </div>
        <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginTop: '4px' }}>
          Value: {formatCurrency(selectedScheme?.current_value || 0)}
        </div>
      </div>

      {/* Search */}
      <div style={cardStyle}>
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.utility.secondaryText
            }}
          />
          <input
            type="text"
            placeholder="Search for correct scheme by name or code..."
            value={targetSearch}
            onChange={(e) => setTargetSearch(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '14px 14px 14px 44px',
              borderRadius: '10px',
              border: `1px solid ${colors.utility.primaryText}20`,
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '15px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {searchLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
            Searching...
          </div>
        ) : targetSearch.length < 2 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
            Enter at least 2 characters to search
          </div>
        ) : schemeSearchResults?.schemes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
            No schemes found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {schemeSearchResults?.schemes.map((s: SchemeSearchResult) => {
              const isSameAsSource = s.scheme_code === selectedScheme?.scheme_code;
              return (
                <div
                  key={s.scheme_code}
                  onClick={() => {
                    if (!isSameAsSource) {
                      setSelectedTargetScheme(s);
                      setPageView('confirm');
                    }
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: `1px solid ${isSameAsSource ? colors.semantic.error + '50' : colors.utility.primaryText + '15'}`,
                    cursor: isSameAsSource ? 'not-allowed' : 'pointer',
                    backgroundColor: isSameAsSource ? colors.semantic.error + '05' : colors.utility.primaryBackground,
                    opacity: isSameAsSource ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSameAsSource) {
                      e.currentTarget.style.borderColor = colors.brand.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSameAsSource) {
                      e.currentTarget.style.borderColor = `${colors.utility.primaryText}15`;
                    }
                  }}
                >
                  <div style={{ fontWeight: '600', color: colors.utility.primaryText, marginBottom: '4px' }}>
                    {s.scheme_name}
                  </div>
                  <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                    {s.amc_name} • Code: <span style={{ fontFamily: 'monospace' }}>{s.scheme_code}</span>
                    {isSameAsSource && (
                      <span style={{ color: colors.semantic.error, marginLeft: '8px' }}>(Same as source)</span>
                    )}
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
  // RENDER: Confirm
  // ============================================================================
  const renderConfirm = () => (
    <div>
      {/* Back button and header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setPageView('select-target')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.utility.secondaryText,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: colors.utility.primaryText }}>
          Confirm Migration
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
          borderRadius: '10px',
          marginBottom: '24px'
        }}>
          <AlertTriangle size={20} color="#92400e" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '14px', color: '#92400e', lineHeight: '1.5' }}>
            This will create a migration record in <strong>pending</strong> status. Click <strong>Execute</strong> to apply changes.
            After execution, remember to <strong>regenerate snapshots</strong> for this customer.
          </div>
        </div>

        {/* Migration Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '20px',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          {/* From */}
          <div style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: colors.semantic.error + '08',
            border: `1px solid ${colors.semantic.error}30`
          }}>
            <div style={{ fontSize: '11px', color: colors.semantic.error, fontWeight: '600', marginBottom: '8px' }}>
              FROM (Wrong)
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '4px' }}>
              {selectedScheme?.scheme_name}
            </div>
            <div style={{ fontSize: '13px', color: colors.utility.secondaryText, fontFamily: 'monospace' }}>
              {selectedScheme?.scheme_code}
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight size={28} color={colors.utility.secondaryText} />

          {/* To */}
          <div style={{
            padding: '20px',
            borderRadius: '10px',
            backgroundColor: colors.semantic.success + '08',
            border: `1px solid ${colors.semantic.success}30`
          }}>
            <div style={{ fontSize: '11px', color: colors.semantic.success, fontWeight: '600', marginBottom: '8px' }}>
              TO (Correct)
            </div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '4px' }}>
              {selectedTargetScheme?.scheme_name}
            </div>
            <div style={{ fontSize: '13px', color: colors.utility.secondaryText, fontFamily: 'monospace' }}>
              {selectedTargetScheme?.scheme_code}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '600',
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this correction..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
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
            onClick={resetToSchemes}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '10px',
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
              borderRadius: '10px',
              cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: createMutation.isPending ? 0.7 : 1
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

  // Loading state
  if (customerId && (customerLoading || portfolioLoading)) {
    return (
      <div style={{
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: `3px solid ${colors.brand.primary}20`,
            borderTop: `3px solid ${colors.brand.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ color: colors.utility.secondaryText }}>Loading customer data...</div>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      {customerId && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <GitBranch size={28} color={colors.brand.primary} />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
              Course Correction
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: colors.utility.secondaryText }}>
            Fix scheme code mappings for this customer
          </p>
        </div>
      )}

      {/* Customer Banner (when customer selected) */}
      {customerId && customer && renderCustomerBanner()}

      {/* History Table (toggleable) */}
      {((customerId && showHistory) || pageView === 'history') && renderHistoryTable()}

      {/* Main Content based on page view */}
      {!customerId && pageView === 'empty' && renderEmptyState()}
      {!customerId && pageView === 'history' && null /* History already rendered above */}
      {customerId && pageView === 'customer-schemes' && renderCustomerSchemes()}
      {customerId && pageView === 'select-target' && renderSelectTarget()}
      {customerId && pageView === 'confirm' && renderConfirm()}
    </div>
  );
};

export default CourseCorrectionPage;
