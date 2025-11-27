// frontend/src/components/transactions/DuplicateReviewPanel.tsx

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { TransactionService, TransactionFilters } from '../../services/transaction.service';
import { TransactionWithDetails } from '../../types/transaction.types';
import { useTheme } from '../../contexts/ThemeContext';

interface DuplicateReviewPanelProps {
  customerId?: number;
  schemeCode?: string;
  onUpdate?: () => void;
}

type GroupByOption = 'fund' | 'customer' | 'date';

interface GroupedDuplicates {
  key: string;
  label: string;
  transactions: TransactionWithDetails[];
  totalAmount: number;
  includedCount: number;
  excludedCount: number;
}

const DuplicateReviewPanel: React.FC<DuplicateReviewPanelProps> = ({
  customerId,
  schemeCode,
  onUpdate
}) => {
  const queryClient = useQueryClient();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [duplicates, setDuplicates] = useState<TransactionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByOption>('fund');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch duplicates
  useEffect(() => {
    fetchDuplicates();
  }, [customerId, schemeCode]);

  const fetchDuplicates = async () => {
    setIsLoading(true);
    try {
      const filters: TransactionFilters = {
        is_potential_duplicate: true,
        page: 1,
        page_size: 1000
      };

      if (customerId) filters.customer_id = customerId;
      if (schemeCode) filters.scheme_code = schemeCode;

      const response = await TransactionService.getTransactions(filters);
      if (response.success && response.data) {
        setDuplicates(response.data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch duplicates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Group duplicates
  const groupedDuplicates: GroupedDuplicates[] = React.useMemo(() => {
    const groups = new Map<string, TransactionWithDetails[]>();

    duplicates.forEach(txn => {
      let key: string;
      let label: string;

      switch (groupBy) {
        case 'fund':
          key = txn.scheme_code;
          label = txn.scheme_name;
          break;
        case 'customer':
          key = txn.customer_id.toString();
          label = txn.customer_name || `Customer #${txn.customer_id}`;
          break;
        case 'date':
          key = txn.txn_date.split('T')[0];
          label = TransactionService.formatDate(txn.txn_date);
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(txn);
    });

    return Array.from(groups.entries()).map(([key, transactions]) => {
      const totalAmount = transactions.reduce((sum, t) => sum + t.total_amount, 0);
      const includedCount = transactions.filter(t => t.portfolio_flag).length;
      const excludedCount = transactions.length - includedCount;

      return {
        key,
        label: transactions[0] ? (
          groupBy === 'fund' ? transactions[0].scheme_name :
          groupBy === 'customer' ? (transactions[0].customer_name || `Customer #${transactions[0].customer_id}`) :
          TransactionService.formatDate(transactions[0].txn_date)
        ) : key,
        transactions,
        totalAmount,
        includedCount,
        excludedCount
      };
    }).sort((a, b) => b.transactions.length - a.transactions.length);
  }, [duplicates, groupBy]);

  // Toggle group expansion
  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Toggle single transaction
  const handleToggleSingle = async (transactionId: number, currentFlag: boolean) => {
    try {
      await TransactionService.updatePortfolioFlag(transactionId, !currentFlag);
      await fetchDuplicates();
      onUpdate?.();
      // Invalidate networth/portfolio queries to refresh charts
      queryClient.invalidateQueries({ queryKey: ['networth'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    } catch (err) {
      console.error('Failed to toggle portfolio flag:', err);
    }
  };

  // Bulk exclude group
  const handleBulkExclude = async (transactions: TransactionWithDetails[]) => {
    const includedTxns = transactions.filter(t => t.portfolio_flag);
    if (includedTxns.length === 0) return;

    try {
      await Promise.all(
        includedTxns.map(t => TransactionService.updatePortfolioFlag(t.id, false))
      );
      await fetchDuplicates();
      onUpdate?.();
      // Invalidate networth/portfolio queries to refresh charts
      queryClient.invalidateQueries({ queryKey: ['networth'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    } catch (err) {
      console.error('Failed to bulk exclude:', err);
    }
  };

  // Bulk include group
  const handleBulkInclude = async (transactions: TransactionWithDetails[]) => {
    const excludedTxns = transactions.filter(t => !t.portfolio_flag);
    if (excludedTxns.length === 0) return;

    try {
      await Promise.all(
        excludedTxns.map(t => TransactionService.updatePortfolioFlag(t.id, true))
      );
      await fetchDuplicates();
      onUpdate?.();
      // Invalidate networth/portfolio queries to refresh charts
      queryClient.invalidateQueries({ queryKey: ['networth'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    } catch (err) {
      console.error('Failed to bulk include:', err);
    }
  };

  // Calculate totals
  const totalDuplicates = duplicates.length;
  const totalExcluded = duplicates.filter(t => !t.portfolio_flag).length;
  const totalExcludedAmount = duplicates
    .filter(t => !t.portfolio_flag)
    .reduce((sum, t) => sum + t.total_amount, 0);

  // Icons
  const AlertTriangleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const ChevronUpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18,15 12,9 6,15" />
    </svg>
  );

  if (isLoading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: `4px solid ${colors.brand.primary}20`,
          borderTop: `4px solid ${colors.brand.primary}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
          Loading duplicates...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (duplicates.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `2px dashed ${colors.utility.primaryText}20`
      }}>
        <div style={{
          marginBottom: '16px',
          color: colors.semantic.success,
          opacity: 0.5
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        </div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          No Duplicates Found
        </h3>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText
        }}>
          All transactions are unique
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '24px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            <AlertTriangleIcon />
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: 0
            }}>
              Review Duplicate Transactions
            </h3>
          </div>
          <div style={{
            fontSize: '13px',
            color: colors.utility.secondaryText
          }}>
            {totalDuplicates} potential duplicate{totalDuplicates !== 1 ? 's' : ''} found
            {totalExcluded > 0 && ` • ${totalExcluded} excluded (${TransactionService.formatAmount(totalExcludedAmount)})`}
          </div>
        </div>

        {/* Group By Selector */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '6px'
        }}>
          {[
            { value: 'fund' as const, label: 'Fund' },
            { value: 'customer' as const, label: 'Customer' },
            { value: 'date' as const, label: 'Date' }
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setGroupBy(option.value)}
              style={{
                padding: '6px 12px',
                backgroundColor: groupBy === option.value ? colors.brand.primary : 'transparent',
                color: groupBy === option.value ? 'white' : colors.utility.primaryText,
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped Duplicates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {groupedDuplicates.map(group => (
          <div
            key={group.key}
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}10`,
              overflow: 'hidden'
            }}
          >
            {/* Group Header */}
            <div
              style={{
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: expandedGroups.has(group.key) ? colors.utility.secondaryBackground : 'transparent'
              }}
              onClick={() => toggleGroup(group.key)}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '4px'
                }}>
                  {group.label}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText
                }}>
                  {group.transactions.length} duplicate{group.transactions.length !== 1 ? 's' : ''} • 
                  {group.includedCount} included, {group.excludedCount} excluded • 
                  Total: {TransactionService.formatAmount(group.totalAmount)}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {expandedGroups.has(group.key) ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </div>
            </div>

            {/* Group Transactions */}
            {expandedGroups.has(group.key) && (
              <div style={{
                padding: '16px',
                borderTop: `1px solid ${colors.utility.primaryText}10`
              }}>
                {/* Bulk Actions */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <button
                    onClick={() => handleBulkExclude(group.transactions)}
                    disabled={group.includedCount === 0}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: colors.semantic.error + '20',
                      color: colors.semantic.error,
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      opacity: group.includedCount === 0 ? 0.5 : 1
                    }}
                  >
                    Exclude All ({group.includedCount})
                  </button>

                  <button
                    onClick={() => handleBulkInclude(group.transactions)}
                    disabled={group.excludedCount === 0}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: colors.semantic.success + '20',
                      color: colors.semantic.success,
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      opacity: group.excludedCount === 0 ? 0.5 : 1
                    }}
                  >
                    Include All ({group.excludedCount})
                  </button>
                </div>

                {/* Transaction List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.transactions.map(txn => (
                    <div
                      key={txn.id}
                      style={{
                        padding: '12px',
                        backgroundColor: colors.utility.secondaryBackground,
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: txn.portfolio_flag ? 1 : 0.6
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '500',
                          color: colors.utility.primaryText,
                          marginBottom: '4px'
                        }}>
                          {TransactionService.formatDate(txn.txn_date)} • 
                          {TransactionService.formatAmount(txn.total_amount)} • 
                          {TransactionService.formatUnits(txn.units)} units @ ₹{TransactionService.formatNAV(txn.nav)}
                        </div>
                        {txn.duplicate_reason && (
                          <div style={{
                            fontSize: '11px',
                            color: colors.utility.secondaryText
                          }}>
                            {txn.duplicate_reason}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleSingle(txn.id, txn.portfolio_flag)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: txn.portfolio_flag ? colors.semantic.error + '20' : colors.semantic.success + '20',
                          color: txn.portfolio_flag ? colors.semantic.error : colors.semantic.success,
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {txn.portfolio_flag ? 'Exclude' : 'Include'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DuplicateReviewPanel;