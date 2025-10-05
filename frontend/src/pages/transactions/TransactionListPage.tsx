// frontend/src/pages/transactions/TransactionListPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { TransactionService, TransactionFilters as TransactionFiltersType } from '../../services/transaction.service';
import { TransactionListResponse, TransactionSummary, TransactionWithDetails } from '../../types/transaction.types';
import TransactionFilters from '../../components/transactions/TransactionFilters';
import TransactionTable from '../../components/transactions/TransactionTable';
import TransactionDetails from '../../components/transactions/TransactionDetails';

const TransactionListPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: transactionIdParam } = useParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // State management
const [filters, setFilters] = useState<TransactionFiltersType>({
    page: 1,
    page_size: 100,
    sort_by: 'txn_date',
    sort_order: 'desc'
  });

  const [transactions, setTransactions] = useState<TransactionListResponse | null>(null);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(
    transactionIdParam ? parseInt(transactionIdParam) : null
  );

  // Fetch transactions
  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await TransactionService.getTransactions(filters);
      if (response.success && response.data) {
        setTransactions(response.data);
      } else {
        setError(response.error || 'Failed to fetch transactions');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching transactions');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch summary
  const fetchSummary = async () => {
    try {
      const response = await TransactionService.getTransactionSummary(filters);
      if (response.success && response.data) {
        setSummary(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch summary:', err);
    }
  };

  // Load data on mount and filter changes
  useEffect(() => {
    fetchTransactions();
    fetchSummary();
  }, [filters]);

  // Handle transaction ID from URL
  useEffect(() => {
    if (transactionIdParam) {
      setSelectedTransactionId(parseInt(transactionIdParam));
    }
  }, [transactionIdParam]);

  // Handle filter changes
const handleFiltersChange = (newFilters: TransactionFiltersType) => {
        setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page || 1
    }));
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Handle sort change
  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sort_by: sortBy, sort_order: sortOrder }));
  };

  // Handle transaction row click
  const handleTransactionClick = (transaction: TransactionWithDetails) => {
    setSelectedTransactionId(transaction.id);
    navigate(`/transactions/${transaction.id}`);
  };

  // Handle edit transaction
  const handleEditTransaction = (transactionId: number) => {
    console.log('Edit transaction:', transactionId);
    // TODO: Implement edit functionality
  };

  // Handle delete transaction
  const handleDeleteTransaction = async (transactionId: number) => {
    try {
      await TransactionService.deleteTransaction(transactionId);
      fetchTransactions();
      fetchSummary();
    } catch (err: any) {
      console.error('Failed to delete transaction:', err);
    }
  };

  // Handle toggle portfolio flag
  const handleTogglePortfolioFlag = async (transactionId: number, currentFlag: boolean) => {
    try {
      await TransactionService.updatePortfolioFlag(transactionId, !currentFlag);
      fetchTransactions();
      fetchSummary();
    } catch (err: any) {
      console.error('Failed to toggle portfolio flag:', err);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setSelectedTransactionId(null);
    navigate('/transactions');
  };

  // Handle modal update
  const handleModalUpdate = () => {
    fetchTransactions();
    fetchSummary();
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!transactions?.transactions || transactions.transactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    const headers = [
      'Date',
      'Customer Name',
      'Scheme Name',
      'Type',
      'Amount',
      'Units',
      'NAV',
      'Folio',
      'Duplicate',
      'Portfolio Flag'
    ];

    const rows = transactions.transactions.map(txn => [
      TransactionService.formatDate(txn.txn_date),
      txn.customer_name || '',
      txn.scheme_name,
      TransactionService.getTransactionTypeLabel(txn.txn_type),
      txn.total_amount.toString(),
      TransactionService.formatUnits(txn.units),
      TransactionService.formatNAV(txn.nav),
      txn.folio_no || '',
      txn.is_potential_duplicate ? 'Yes' : 'No',
      txn.portfolio_flag ? 'Included' : 'Excluded'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Icons
  const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12,19 5,12 12,5" />
    </svg>
  );

  const DownloadIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,4 23,10 17,10" />
      <polyline points="1,20 1,14 7,14" />
      <path d="m20.49,9a9,9 0 1 1-2.13-5.36l4.64,4.36" />
    </svg>
  );

  const FileTextIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  );

  const AlertIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  // Error state
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          marginTop: '100px',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          border: `1px solid ${colors.semantic.error}30`
        }}>
          <div style={{ color: colors.semantic.error, marginBottom: '16px' }}>
            <AlertIcon />
          </div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Failed to Load Transactions
          </h2>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '24px'
          }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/customers')}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Back to Customers
            </button>
            <button
              onClick={() => {
                setError(null);
                fetchTransactions();
                fetchSummary();
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate('/customers')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <ArrowLeftIcon /> Back
            </button>

            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: colors.brand.primary,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FileTextIcon />
            </div>

            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: '0 0 4px 0'
              }}>
                Transactions
              </h1>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                margin: 0
              }}>
                View and manage all portfolio transactions
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                fetchTransactions();
                fetchSummary();
              }}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: isLoading ? 0.6 : 1
              }}
            >
              <RefreshIcon />
              Refresh
            </button>

            <button
              onClick={handleExportCSV}
              disabled={isLoading || !transactions?.transactions.length}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isLoading || !transactions?.transactions.length ? 0.6 : 1
              }}
            >
              <DownloadIcon />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.brand.primary,
              marginBottom: '4px'
            }}>
              {isLoading ? '...' : summary?.total_transactions.toLocaleString('en-IN') || '0'}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total Transactions
            </div>
          </div>

          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#10B981',
              marginBottom: '4px'
            }}>
              {isLoading ? '...' : formatCurrency(summary?.addition_amount || 0)}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Purchases ({summary?.addition_count || 0})
            </div>
          </div>

          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#EF4444',
              marginBottom: '4px'
            }}>
              {isLoading ? '...' : formatCurrency(summary?.deduction_amount || 0)}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Redemptions ({summary?.deduction_count || 0})
            </div>
          </div>

          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.semantic.warning,
              marginBottom: '4px'
            }}>
              {isLoading ? '...' : summary?.duplicate_count.toLocaleString('en-IN') || '0'}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Potential Duplicates
            </div>
          </div>
        </div>

        {/* Filters Component */}
        <TransactionFilters
          onFiltersChange={handleFiltersChange}
          initialFilters={filters}
          loading={isLoading}
        />

        {/* Transactions Table */}
        <div style={{ marginTop: '20px' }}>
          <TransactionTable
            transactions={transactions?.transactions || []}
            loading={isLoading}
            onRowClick={handleTransactionClick}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransaction}
            onTogglePortfolioFlag={handleTogglePortfolioFlag}
            pagination={transactions?.pagination || { page: 1, page_size: 100, total: 0, total_pages: 1 }}
            onPageChange={handlePageChange}
            onSortChange={handleSortChange}
          />
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransactionId && (
        <TransactionDetails
          transactionId={selectedTransactionId}
          onClose={handleCloseModal}
          onUpdate={handleModalUpdate}
        />
      )}
    </div>
  );
};

export default TransactionListPage;