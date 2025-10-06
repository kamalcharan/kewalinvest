// frontend/src/components/transactions/TransactionTable.tsx

import React, { useState } from 'react';
import { TransactionWithDetails } from '../../types/transaction.types';
import { TransactionService } from '../../services/transaction.service';
import { useTheme } from '../../contexts/ThemeContext';

interface TransactionTableProps {
  transactions: TransactionWithDetails[];
  loading?: boolean;
  onRowClick?: (transaction: TransactionWithDetails) => void;
  onDelete?: (transactionId: number) => void;
  onTogglePortfolioFlag?: (transactionId: number, currentFlag: boolean) => void;
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  onPageChange: (page: number) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  loading = false,
  onRowClick,
  onDelete,
  onTogglePortfolioFlag,
  pagination,
  onPageChange,
  onSortChange
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [sortBy, setSortBy] = useState<string>('txn_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Handle sort
  const handleSort = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(column);
    setSortOrder(newSortOrder);
    if (onSortChange) {
      onSortChange(column, newSortOrder);
    }
  };

  // Format helpers
  const formatCurrency = (value: number): string => {
    return TransactionService.formatAmount(value);
  };

  const formatDate = (dateString: string): string => {
    return TransactionService.formatDate(dateString);
  };

  const getTypeColor = (txnType?: 'Addition' | 'Deduction'): string => {
    return TransactionService.getTransactionTypeColor(txnType);
  };

  const getTypeLabel = (txnType?: 'Addition' | 'Deduction'): string => {
    return TransactionService.getTransactionTypeLabel(txnType);
  };

  // Icons
  const EyeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const AlertTriangleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const ChevronLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15,18 9,12 15,6" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );

  const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            style={{
              height: '140px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              animation: 'pulse 1.5s ease-in-out infinite',
              opacity: 0.6
            }}
          />
        ))}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <div style={{
        padding: '80px 20px',
        textAlign: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `2px dashed ${colors.utility.primaryText}20`
      }}>
        <div style={{
          marginBottom: '16px',
          opacity: 0.5,
          color: colors.utility.secondaryText
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10,9 9,9 8,9" />
          </svg>
        </div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          No transactions found
        </h3>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText
        }}>
          Try adjusting your filters or import transaction data
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results Summary */}
      <div style={{
        fontSize: '14px',
        color: colors.utility.secondaryText,
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>
          Showing {((pagination.page - 1) * pagination.page_size) + 1}-
          {Math.min(pagination.page * pagination.page_size, pagination.total)} of{' '}
          {pagination.total.toLocaleString()} transactions
        </span>
        
        {/* Sort Options */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: colors.utility.secondaryText }}>Sort by:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [col, ord] = e.target.value.split('-');
              handleSort(col);
            }}
            style={{
              padding: '6px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="txn_date-desc">Date (Newest)</option>
            <option value="txn_date-asc">Date (Oldest)</option>
            <option value="total_amount-desc">Amount (High to Low)</option>
            <option value="total_amount-asc">Amount (Low to High)</option>
            <option value="scheme_name-asc">Scheme (A-Z)</option>
            <option value="scheme_name-desc">Scheme (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Transaction Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              border: `1px solid ${colors.utility.primaryText}10`,
              padding: '20px',
              transition: 'all 0.2s ease',
              cursor: onRowClick ? 'pointer' : 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 2px 8px ${colors.utility.primaryText}15`;
              e.currentTarget.style.borderColor = colors.brand.primary + '40';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = colors.utility.primaryText + '10';
            }}
          >
            {/* Card Header - Date, Type, and Actions */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}>
                  {formatDate(transaction.txn_date)}
                </div>
                
                <span style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: getTypeColor(transaction.txn_type) + '20',
                  color: getTypeColor(transaction.txn_type)
                }}>
                  {getTypeLabel(transaction.txn_type)}
                </span>

                {/* Status Badges */}
                {transaction.is_potential_duplicate && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: '600',
                      backgroundColor: colors.semantic.warning + '20',
                      color: colors.semantic.warning
                    }}
                    title={transaction.duplicate_reason || 'Potential duplicate'}
                  >
                    <AlertTriangleIcon />
                    Duplicate
                  </div>
                )}

                {!transaction.portfolio_flag && (
                  <div
                    style={{
                      display: 'inline-flex',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: '600',
                      backgroundColor: colors.utility.secondaryText + '20',
                      color: colors.utility.secondaryText
                    }}
                    title="Excluded from portfolio"
                  >
                    Excluded
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick?.(transaction);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: colors.utility.primaryBackground,
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '6px',
                    color: colors.utility.primaryText,
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.brand.primary + '20';
                    e.currentTarget.style.borderColor = colors.brand.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                    e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                  }}
                >
                  <EyeIcon />
                  View
                </button>


              </div>
            </div>

            {/* Card Body - Main Transaction Info */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 3fr 1fr 1fr 1fr',
              gap: '20px',
              alignItems: 'start'
            }}>
              {/* Customer Info */}
              <div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <UserIcon />
                  Customer
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '2px'
                }}>
                  {transaction.customer_name || 'Unknown Customer'}
                </div>
                {transaction.iwell_code && (
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText
                  }}>
                    {transaction.iwell_code}
                  </div>
                )}
              </div>

              {/* Scheme Info */}
              <div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Scheme
                </div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: colors.utility.primaryText,
                  lineHeight: '1.4'
                }}>
                  {transaction.scheme_name}
                </div>
                {transaction.folio_no && (
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginTop: '4px'
                  }}>
                    Folio: {transaction.folio_no}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Amount
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: colors.utility.primaryText
                }}>
                  {formatCurrency(transaction.total_amount)}
                </div>
              </div>

              {/* Units */}
              <div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Units
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}>
                  {TransactionService.formatUnits(transaction.units)}
                </div>
              </div>

              {/* NAV */}
              <div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  NAV
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText
                }}>
                  ₹{TransactionService.formatNAV(transaction.nav)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '13px',
            color: colors.utility.secondaryText
          }}>
            Page {pagination.page} of {pagination.total_pages}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                backgroundColor: pagination.page > 1 ? colors.utility.primaryBackground : 'transparent',
                color: pagination.page > 1 ? colors.utility.primaryText : colors.utility.secondaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                cursor: pagination.page > 1 ? 'pointer' : 'not-allowed',
                fontSize: '13px'
              }}
            >
              <ChevronLeftIcon />
              Previous
            </button>

            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.total_pages}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                backgroundColor: pagination.page < pagination.total_pages ? colors.utility.primaryBackground : 'transparent',
                color: pagination.page < pagination.total_pages ? colors.utility.primaryText : colors.utility.secondaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                cursor: pagination.page < pagination.total_pages ? 'pointer' : 'not-allowed',
                fontSize: '13px'
              }}
            >
              Next
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;