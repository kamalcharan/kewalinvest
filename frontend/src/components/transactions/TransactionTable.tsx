// frontend/src/components/transactions/TransactionTable.tsx

import React, { useState } from 'react';
import { TransactionWithDetails } from '../../types/transaction.types';
import { TransactionService } from '../../services/transaction.service';
import { useTheme } from '../../contexts/ThemeContext';

interface TransactionTableProps {
  transactions: TransactionWithDetails[];
  loading?: boolean;
  onRowClick?: (transaction: TransactionWithDetails) => void;
  onEdit?: (transactionId: number) => void;
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
  onEdit,
  onDelete,
  onTogglePortfolioFlag,
  pagination,
  onPageChange,
  onSortChange
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('txn_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Handle row selection
  const handleRowSelection = (transactionId: number, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(transactionId);
      } else {
        newSet.delete(transactionId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(transactions.map(t => t.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

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
  const ChevronUpIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18,15 12,9 6,15" />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const MoreVerticalIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );

  const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const ToggleIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="5" width="22" height="14" rx="7" ry="7" />
      <circle cx="16" cy="12" r="3" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );

  const AlertTriangleIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

  const allSelected = transactions.length > 0 && selectedRows.size === transactions.length;
  const someSelected = selectedRows.size > 0 && selectedRows.size < transactions.length;

  // Loading skeleton
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            style={{
              height: '60px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
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
        padding: '60px 20px',
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
      {/* Table Container */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        overflow: 'hidden',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                backgroundColor: colors.utility.primaryBackground,
                borderBottom: `1px solid ${colors.utility.primaryText}10`
              }}>
                {/* Checkbox */}
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  width: '40px'
                }}>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: `2px solid ${allSelected ? colors.brand.primary : colors.utility.secondaryText}`,
                      backgroundColor: allSelected ? colors.brand.primary : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onClick={() => handleSelectAll(!allSelected)}
                  >
                    {allSelected && <CheckIcon />}
                    {someSelected && !allSelected && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: colors.brand.primary,
                        borderRadius: '2px'
                      }} />
                    )}
                  </div>
                </th>

                {/* Date */}
                <th
                  onClick={() => handleSort('txn_date')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: colors.utility.secondaryText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Date
                    {sortBy === 'txn_date' && (
                      sortOrder === 'desc' ? <ChevronDownIcon /> : <ChevronUpIcon />
                    )}
                  </div>
                </th>

                {/* Customer */}
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Customer
                </th>

                {/* Scheme */}
                <th
                  onClick={() => handleSort('scheme_name')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: colors.utility.secondaryText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Scheme
                    {sortBy === 'scheme_name' && (
                      sortOrder === 'desc' ? <ChevronDownIcon /> : <ChevronUpIcon />
                    )}
                  </div>
                </th>

                {/* Type */}
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Type
                </th>

                {/* Amount */}
                <th
                  onClick={() => handleSort('total_amount')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: colors.utility.secondaryText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    Amount
                    {sortBy === 'total_amount' && (
                      sortOrder === 'desc' ? <ChevronDownIcon /> : <ChevronUpIcon />
                    )}
                  </div>
                </th>

                {/* Units */}
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Units
                </th>

                {/* NAV */}
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  NAV
                </th>

                {/* Status */}
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Status
                </th>

                {/* Actions */}
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '60px'
                }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {transactions.map((transaction, index) => (
                <tr
                  key={transaction.id}
                  style={{
                    borderBottom: index < transactions.length - 1 ? `1px solid ${colors.utility.primaryText}10` : 'none',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.15s ease'
                  }}
                  onClick={() => onRowClick?.(transaction)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Checkbox */}
                  <td
                    style={{ padding: '12px 16px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: `2px solid ${selectedRows.has(transaction.id) ? colors.brand.primary : colors.utility.secondaryText}`,
                        backgroundColor: selectedRows.has(transaction.id) ? colors.brand.primary : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleRowSelection(transaction.id, !selectedRows.has(transaction.id))}
                    >
                      {selectedRows.has(transaction.id) && <CheckIcon />}
                    </div>
                  </td>

                  {/* Date */}
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: colors.utility.primaryText,
                    fontWeight: '500'
                  }}>
                    {formatDate(transaction.txn_date)}
                  </td>

                  {/* Customer */}
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: colors.utility.primaryText
                  }}>
                    <div>
                      <div style={{ fontWeight: '500' }}>
                        {transaction.customer_name || 'Unknown Customer'}
                      </div>
                      {transaction.iwell_code && (
                        <div style={{
                          fontSize: '11px',
                          color: colors.utility.secondaryText,
                          marginTop: '2px'
                        }}>
                          {transaction.iwell_code}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Scheme */}
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: colors.utility.primaryText,
                    maxWidth: '250px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={transaction.scheme_name}
                  >
                    {transaction.scheme_name}
                  </td>

                  {/* Type */}
                  <td style={{ padding: '12px 16px' }}>
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
                  </td>

                  {/* Amount */}
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.utility.primaryText
                  }}>
                    {formatCurrency(transaction.total_amount)}
                  </td>

                  {/* Units */}
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: '13px',
                    color: colors.utility.primaryText
                  }}>
                    {TransactionService.formatUnits(transaction.units)}
                  </td>

                  {/* NAV */}
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: '13px',
                    color: colors.utility.secondaryText
                  }}>
                    ₹{TransactionService.formatNAV(transaction.nav)}
                  </td>

                  {/* Status */}
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      {transaction.is_potential_duplicate && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 6px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '600',
                            backgroundColor: colors.semantic.warning + '20',
                            color: colors.semantic.warning
                          }}
                          title={transaction.duplicate_reason || 'Potential duplicate'}
                        >
                          <AlertTriangleIcon />
                        </div>
                      )}
                      {!transaction.portfolio_flag && (
                        <div
                          style={{
                            display: 'inline-flex',
                            padding: '3px 6px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '600',
                            backgroundColor: colors.utility.secondaryText + '20',
                            color: colors.utility.secondaryText,
                            textDecoration: 'line-through'
                          }}
                          title="Excluded from portfolio"
                        >
                          ✗
                        </div>
                      )}
                      {transaction.portfolio_flag && !transaction.is_potential_duplicate && (
                        <div
                          style={{
                            display: 'inline-flex',
                            padding: '3px 6px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '600',
                            backgroundColor: colors.semantic.success + '20',
                            color: colors.semantic.success
                          }}
                          title="Included in portfolio"
                        >
                          ✓
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td
                    style={{ padding: '12px 16px', textAlign: 'center', position: 'relative' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setOpenMenuId(openMenuId === transaction.id ? null : transaction.id)}
                      style={{
                        padding: '4px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: colors.utility.secondaryText,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <MoreVerticalIcon />
                    </button>

                    {/* Actions Menu */}
                    {openMenuId === transaction.id && (
                      <>
                        {/* Backdrop */}
                        <div
                          style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999
                          }}
                          onClick={() => setOpenMenuId(null)}
                        />

                        {/* Menu */}
                        <div
                          style={{
                            position: 'absolute',
                            right: '16px',
                            top: '40px',
                            backgroundColor: colors.utility.secondaryBackground,
                            border: `1px solid ${colors.utility.primaryText}10`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 1000,
                            minWidth: '180px',
                            overflow: 'hidden'
                          }}
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              onRowClick?.(transaction);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '13px',
                              color: colors.utility.primaryText,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              borderBottom: `1px solid ${colors.utility.primaryText}10`
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <EyeIcon />
                            View Details
                          </button>

                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              onEdit?.(transaction.id);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '13px',
                              color: colors.utility.primaryText,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              borderBottom: `1px solid ${colors.utility.primaryText}10`
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <EditIcon />
                            Edit
                          </button>

                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              onTogglePortfolioFlag?.(transaction.id, transaction.portfolio_flag);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '13px',
                              color: colors.utility.primaryText,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              borderBottom: `1px solid ${colors.utility.primaryText}10`
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <ToggleIcon />
                            {transaction.portfolio_flag ? 'Exclude from Portfolio' : 'Include in Portfolio'}
                          </button>

                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              if (window.confirm(`Delete transaction from ${formatDate(transaction.txn_date)}?`)) {
                                onDelete?.(transaction.id);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              textAlign: 'left',
                              fontSize: '13px',
                              color: colors.semantic.error,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.semantic.error + '10';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <TrashIcon />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px'
        }}>
          <div style={{
            fontSize: '13px',
            color: colors.utility.secondaryText
          }}>
            Showing {((pagination.page - 1) * pagination.page_size) + 1} to{' '}
            {Math.min(pagination.page * pagination.page_size, pagination.total)} of{' '}
            {pagination.total} transactions
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

            <span style={{
              padding: '8px 16px',
              fontSize: '13px',
              color: colors.utility.primaryText
            }}>
              Page {pagination.page} of {pagination.total_pages}
            </span>

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

      {/* Bulk Actions Bar */}
      {selectedRows.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '16px 24px',
          backgroundColor: colors.brand.primary,
          color: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 100
        }}>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            {selectedRows.size} transaction{selectedRows.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedRows(new Set())}
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionTable;