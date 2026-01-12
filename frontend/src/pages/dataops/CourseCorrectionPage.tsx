// frontend/src/pages/dataops/CourseCorrectionPage.tsx
// Course Correction - Scheme Code Migration Tool
// Flow: Navigate from Customer List → Select scheme to correct → Select target → Confirm
// Layout: 3 columns - 25% schemes | 50% transactions | 25% search/select

import React, { useState, useEffect } from 'react';
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
import { TransactionService, TransactionFilters } from '../../services/transaction.service';
import { TransactionWithDetails } from '../../types/transaction.types';
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

type PageView = 'empty' | 'customer-view' | 'history';

const CourseCorrectionPage: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get customerId from URL query params
  const customerId = searchParams.get('customerId') ? parseInt(searchParams.get('customerId')!) : null;

  // Page state
  const [pageView, setPageView] = useState<PageView>(customerId ? 'customer-view' : 'empty');
  const [selectedScheme, setSelectedScheme] = useState<PortfolioHolding | null>(null);
  const [selectedTargetScheme, setSelectedTargetScheme] = useState<SchemeSearchResult | null>(null);
  const [notes, setNotes] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Transaction state
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionTotal, setTransactionTotal] = useState(0);

  // History list state
  const [historyPage, setHistoryPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CourseCorrectionStatus | ''>();

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

  // Fetch transactions when scheme is selected
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!customerId || !selectedScheme) {
        setTransactions([]);
        setTransactionTotal(0);
        return;
      }

      setTransactionsLoading(true);
      try {
        const filters: TransactionFilters = {
          customer_id: customerId,
          scheme_code: selectedScheme.scheme_code,
          page: transactionPage,
          page_size: 20,
          sort_by: 'txn_date',
          sort_order: 'desc'
        };
        const response = await TransactionService.getTransactions(filters);
        if (response.success) {
          setTransactions(response.data.transactions);
          setTransactionTotal(response.data.pagination.total);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [customerId, selectedScheme?.scheme_code, transactionPage]);

  // Reset selection
  const resetSelection = () => {
    setSelectedScheme(null);
    setSelectedTargetScheme(null);
    setNotes('');
    setTargetSearch('');
    setShowConfirmModal(false);
    setTransactionPage(1);
  };

  // Handle scheme selection
  const handleSchemeSelect = (holding: PortfolioHolding) => {
    setSelectedScheme(holding);
    setSelectedTargetScheme(null);
    setTargetSearch('');
    setTransactionPage(1);
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

    resetSelection();
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
  // RENDER: 3-Column Layout (Schemes | Transactions | Search)
  // ============================================================================
  const renderThreeColumnLayout = () => (
    <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 280px)', minHeight: '500px' }}>
      {/* LEFT COLUMN - 25% - MF Schemes */}
      <div style={{
        ...cardStyle,
        width: '25%',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: '600',
          color: colors.utility.secondaryText,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Select Scheme to Correct
        </h3>

        {portfolioLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.utility.secondaryText }}>
            <div>Loading...</div>
          </div>
        ) : holdings.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.utility.secondaryText }}>
            <Package size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '13px', textAlign: 'center' }}>No schemes found</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {holdings.map((holding: PortfolioHolding) => {
              const isSelected = selectedScheme?.scheme_code === holding.scheme_code;
              return (
                <div
                  key={holding.scheme_code}
                  onClick={() => handleSchemeSelect(holding)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: isSelected
                      ? `2px solid ${colors.brand.primary}`
                      : `1px solid ${colors.utility.primaryText}15`,
                    backgroundColor: isSelected
                      ? colors.brand.primary + '10'
                      : colors.utility.primaryBackground,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '4px',
                    lineHeight: '1.3',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {holding.scheme_name || holding.scheme_code}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: colors.utility.secondaryText,
                    marginBottom: '6px'
                  }}>
                    {holding.scheme_code}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: colors.brand.primary
                  }}>
                    {formatCurrency(holding.current_value || 0)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MIDDLE COLUMN - 50% - Transactions */}
      <div style={{
        ...cardStyle,
        width: '50%',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {!selectedScheme ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.utility.secondaryText
          }}>
            <ArrowRight size={48} style={{ opacity: 0.2, marginBottom: '16px', transform: 'rotate(180deg)' }} />
            <p style={{ margin: 0, fontSize: '15px', fontWeight: '500' }}>Select a scheme</p>
            <p style={{ margin: '8px 0 0', fontSize: '13px' }}>to view its transactions</p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: `1px solid ${colors.utility.primaryText}10`
            }}>
              <div>
                <h3 style={{
                  margin: '0 0 4px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}>
                  {selectedScheme.scheme_name}
                </h3>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText, fontFamily: 'monospace' }}>
                  {selectedScheme.scheme_code} • {transactionTotal} transactions
                </div>
              </div>
              <button
                onClick={resetSelection}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  color: colors.utility.secondaryText
                }}
              >
                Clear
              </button>
            </div>

            {transactionsLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: colors.utility.secondaryText }}>Loading transactions...</div>
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.utility.secondaryText }}>
                <p style={{ margin: 0 }}>No transactions found</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: colors.utility.primaryBackground, position: 'sticky', top: 0 }}>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: colors.utility.secondaryText }}>Date</th>
                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: colors.utility.secondaryText }}>Type</th>
                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: colors.utility.secondaryText }}>Amount</th>
                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: colors.utility.secondaryText }}>Units</th>
                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: colors.utility.secondaryText }}>NAV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.id} style={{ borderTop: `1px solid ${colors.utility.primaryText}08` }}>
                          <td style={{ padding: '8px', color: colors.utility.primaryText }}>
                            {formatDate(txn.txn_date)}
                          </td>
                          <td style={{ padding: '8px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 600,
                              backgroundColor: txn.txn_type === 'Addition' ? colors.semantic.success + '20' : colors.semantic.error + '20',
                              color: txn.txn_type === 'Addition' ? colors.semantic.success : colors.semantic.error
                            }}>
                              {txn.txn_type_name || txn.txn_type || 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500, color: colors.utility.primaryText }}>
                            {formatCurrency(txn.total_amount)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: colors.utility.secondaryText }}>
                            {parseFloat(String(txn.units || 0)).toFixed(3)}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', color: colors.utility.secondaryText }}>
                            {parseFloat(String(txn.nav || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {transactionTotal > 20 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.utility.primaryText}10` }}>
                    <button
                      onClick={() => setTransactionPage(p => Math.max(1, p - 1))}
                      disabled={transactionPage === 1}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: colors.utility.secondaryBackground,
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '4px',
                        cursor: transactionPage === 1 ? 'not-allowed' : 'pointer',
                        opacity: transactionPage === 1 ? 0.5 : 1,
                        fontSize: '12px'
                      }}
                    >
                      Prev
                    </button>
                    <span style={{ fontSize: '12px', color: colors.utility.secondaryText, padding: '4px 8px' }}>
                      Page {transactionPage} of {Math.ceil(transactionTotal / 20)}
                    </span>
                    <button
                      onClick={() => setTransactionPage(p => p + 1)}
                      disabled={transactionPage >= Math.ceil(transactionTotal / 20)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: colors.utility.secondaryBackground,
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '4px',
                        cursor: transactionPage >= Math.ceil(transactionTotal / 20) ? 'not-allowed' : 'pointer',
                        opacity: transactionPage >= Math.ceil(transactionTotal / 20) ? 0.5 : 1,
                        fontSize: '12px'
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* RIGHT COLUMN - 25% - Search & Select Target */}
      <div style={{
        ...cardStyle,
        width: '25%',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: '600',
          color: colors.utility.secondaryText,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Select Target Scheme
        </h3>

        {!selectedScheme ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.utility.secondaryText
          }}>
            <Search size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '13px', textAlign: 'center' }}>
              Select a source scheme first
            </p>
          </div>
        ) : (
          <>
            {/* Selected Source */}
            <div style={{
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: colors.semantic.error + '10',
              border: `1px solid ${colors.semantic.error}30`,
              marginBottom: '12px'
            }}>
              <div style={{ fontSize: '10px', color: colors.semantic.error, fontWeight: 600, marginBottom: '2px' }}>
                FROM (Wrong Code)
              </div>
              <div style={{
                fontSize: '11px',
                color: colors.utility.primaryText,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {selectedScheme.scheme_name}
              </div>
              <div style={{ fontSize: '10px', fontFamily: 'monospace', color: colors.utility.secondaryText }}>
                {selectedScheme.scheme_code}
              </div>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.utility.secondaryText
                }}
              />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 32px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Search Results */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searchLoading ? (
                <div style={{ padding: '20px', textAlign: 'center', color: colors.utility.secondaryText, fontSize: '12px' }}>
                  Searching...
                </div>
              ) : targetSearch.length < 2 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: colors.utility.secondaryText, fontSize: '12px' }}>
                  Type at least 2 characters
                </div>
              ) : schemeSearchResults?.schemes.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: colors.utility.secondaryText, fontSize: '12px' }}>
                  No schemes found for "{targetSearch}"
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {schemeSearchResults?.schemes.map((s: SchemeSearchResult) => {
                    const isSameAsSource = s.scheme_code === selectedScheme?.scheme_code;
                    const isSelected = selectedTargetScheme?.scheme_code === s.scheme_code;
                    return (
                      <div
                        key={s.scheme_code}
                        onClick={() => {
                          if (!isSameAsSource) {
                            setSelectedTargetScheme(s);
                          }
                        }}
                        style={{
                          padding: '10px',
                          borderRadius: '6px',
                          border: isSelected
                            ? `2px solid ${colors.semantic.success}`
                            : isSameAsSource
                            ? `1px solid ${colors.semantic.error}30`
                            : `1px solid ${colors.utility.primaryText}15`,
                          cursor: isSameAsSource ? 'not-allowed' : 'pointer',
                          backgroundColor: isSelected
                            ? colors.semantic.success + '10'
                            : isSameAsSource
                            ? colors.semantic.error + '05'
                            : colors.utility.primaryBackground,
                          opacity: isSameAsSource ? 0.5 : 1
                        }}
                      >
                        <div style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: colors.utility.primaryText,
                          marginBottom: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {s.scheme_name}
                        </div>
                        <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
                          <span style={{ fontFamily: 'monospace' }}>{s.scheme_code}</span>
                          {isSameAsSource && <span style={{ color: colors.semantic.error, marginLeft: '4px' }}>(same)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Target & Action Button */}
            {selectedTargetScheme && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.utility.primaryText}10` }}>
                <div style={{
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor: colors.semantic.success + '10',
                  border: `1px solid ${colors.semantic.success}30`,
                  marginBottom: '10px'
                }}>
                  <div style={{ fontSize: '10px', color: colors.semantic.success, fontWeight: 600, marginBottom: '2px' }}>
                    TO (Correct Code)
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.primaryText,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {selectedTargetScheme.scheme_name}
                  </div>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: colors.utility.secondaryText }}>
                    {selectedTargetScheme.scheme_code}
                  </div>
                </div>

                <button
                  onClick={() => setShowConfirmModal(true)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: colors.brand.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Plus size={14} />
                  Create Migration
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: Confirm Modal
  // ============================================================================
  const renderConfirmModal = () => {
    if (!showConfirmModal || !selectedScheme || !selectedTargetScheme) return null;

    return (
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
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600, color: colors.utility.primaryText }}>
            Confirm Migration
          </h3>

          {/* Warning */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <AlertTriangle size={18} color="#92400e" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.4' }}>
              This creates a migration record in <strong>pending</strong> status. Execute from history to apply changes.
            </div>
          </div>

          {/* Migration Summary */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: colors.semantic.error + '08',
              border: `1px solid ${colors.semantic.error}30`,
              marginBottom: '8px'
            }}>
              <div style={{ fontSize: '10px', color: colors.semantic.error, fontWeight: 600 }}>FROM</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: colors.utility.primaryText }}>{selectedScheme.scheme_name}</div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: colors.utility.secondaryText }}>{selectedScheme.scheme_code}</div>
            </div>
            <div style={{ textAlign: 'center', color: colors.utility.secondaryText, margin: '4px 0' }}>
              <ArrowRight size={20} style={{ transform: 'rotate(90deg)' }} />
            </div>
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: colors.semantic.success + '08',
              border: `1px solid ${colors.semantic.success}30`
            }}>
              <div style={{ fontSize: '10px', color: colors.semantic.success, fontWeight: 600 }}>TO</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: colors.utility.primaryText }}>{selectedTargetScheme.scheme_name}</div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: colors.utility.secondaryText }}>{selectedTargetScheme.scheme_code}</div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 600, color: colors.utility.secondaryText }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${colors.utility.primaryText}20`,
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '13px',
                minHeight: '60px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowConfirmModal(false)}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: colors.utility.primaryText
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCorrection}
              disabled={createMutation.isPending}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.brand.primary,
                border: 'none',
                borderRadius: '8px',
                cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: '#fff',
                opacity: createMutation.isPending ? 0.7 : 1
              }}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Migration'}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
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
      {customerId && pageView === 'customer-view' && renderThreeColumnLayout()}

      {/* Confirm Modal */}
      {renderConfirmModal()}
    </div>
  );
};

export default CourseCorrectionPage;
