// frontend/src/components/transactions/TransactionDetails.tsx

import React, { useState, useEffect } from 'react';
import { TransactionService } from '../../services/transaction.service';
import { TransactionWithDetails } from '../../types/transaction.types';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmationModal from './ConfirmationModal';

interface TransactionDetailsProps {
  transactionId: number;
  onClose: () => void;
  onUpdate?: () => void;
}

const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  transactionId,
  onClose,
  onUpdate
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [transaction, setTransaction] = useState<TransactionWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStagingData, setShowStagingData] = useState(false);
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPortfolioFlagModal, setShowPortfolioFlagModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch transaction details
  useEffect(() => {
    fetchTransaction();
  }, [transactionId]);

  const fetchTransaction = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await TransactionService.getTransactionById(transactionId);
      if (response.success && response.data) {
        setTransaction(response.data);
      } else {
        setError(response.error || 'Failed to fetch transaction');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (!transaction) return;
    
    setIsProcessing(true);
    try {
      const response = await TransactionService.deleteTransaction(transaction.id);
      if (response.success) {
        onUpdate?.();
        onClose();
      }
    } catch (err: any) {
      alert('Failed to delete transaction: ' + err.message);
      setIsProcessing(false);
    }
  };

  // Handle portfolio flag toggle
  const handlePortfolioFlagConfirm = async () => {
    if (!transaction) return;
    
    setIsProcessing(true);
    try {
      const response = await TransactionService.updatePortfolioFlag(
        transaction.id,
        !transaction.portfolio_flag
      );
      if (response.success) {
        setTransaction(prev => prev ? { ...prev, portfolio_flag: !prev.portfolio_flag } : null);
        setShowPortfolioFlagModal(false);
        onUpdate?.();
      }
    } catch (err: any) {
      alert('Failed to update portfolio flag: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Icons
  const XIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const ChevronUpIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18,15 12,9 6,15" />
    </svg>
  );

  const AlertTriangleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const FileIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  );

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '60px',
            textAlign: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            width: '40px',
            height: '40px',
            border: `4px solid ${colors.brand.primary}20`,
            borderTop: `4px solid ${colors.brand.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <div style={{
            marginTop: '16px',
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            Loading transaction...
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !transaction) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '400px',
            textAlign: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ color: colors.semantic.error, marginBottom: '16px' }}>
            <AlertTriangleIcon />
          </div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Failed to Load Transaction
          </h3>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '24px'
          }}>
            {error || 'Transaction not found'}
          </p>
          <button
            onClick={onClose}
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
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '24px'
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: `1px solid ${colors.utility.primaryText}10`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: 0
                }}>
                  Transaction #{transaction.id}
                </h2>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  backgroundColor: TransactionService.getTransactionTypeColor(transaction.txn_type) + '20',
                  color: TransactionService.getTransactionTypeColor(transaction.txn_type)
                }}>
                  {TransactionService.getTransactionTypeLabel(transaction.txn_type)}
                </span>
              </div>
              <div style={{
                fontSize: '13px',
                color: colors.utility.secondaryText
              }}>
                {TransactionService.formatDate(transaction.txn_date)}
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: colors.utility.secondaryText,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <XIcon />
            </button>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px'
          }}>
            {/* Main Details */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Transaction Details
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
              }}>
                <div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Customer
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: colors.utility.primaryText,
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <UserIcon />
                    {transaction.customer_name || `Customer #${transaction.customer_id}`}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Folio Number
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: colors.utility.primaryText,
                    fontWeight: '500'
                  }}>
                    {transaction.folio_no || 'N/A'}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Scheme
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: colors.utility.primaryText,
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <FileIcon />
                    {transaction.scheme_name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    marginTop: '2px'
                  }}>
                    Code: {transaction.scheme_code}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Amount
                  </div>
                  <div style={{
                    fontSize: '20px',
                    color: colors.utility.primaryText,
                    fontWeight: '700'
                  }}>
                    {TransactionService.formatAmount(transaction.total_amount)}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Units
                  </div>
                  <div style={{
                    fontSize: '20px',
                    color: colors.utility.primaryText,
                    fontWeight: '700'
                  }}>
                    {TransactionService.formatUnits(transaction.units)}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    NAV
                  </div>
                  <div style={{
                    fontSize: '16px',
                    color: colors.utility.primaryText,
                    fontWeight: '600'
                  }}>
                    ₹{TransactionService.formatNAV(transaction.nav)}
                  </div>
                </div>

                {transaction.stamp_duty && transaction.stamp_duty > 0 && (
                  <div>
                    <div style={{
                      fontSize: '11px',
                      color: colors.utility.secondaryText,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Stamp Duty
                    </div>
                    <div style={{
                      fontSize: '16px',
                      color: colors.utility.primaryText,
                      fontWeight: '600'
                    }}>
                      ₹{typeof transaction.stamp_duty === 'number' 
                        ? transaction.stamp_duty.toFixed(2) 
                        : parseFloat(transaction.stamp_duty || '0').toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Information */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Status
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Duplicate Status */}
                {transaction.is_potential_duplicate && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: colors.semantic.warning + '10',
                    borderLeft: `3px solid ${colors.semantic.warning}`,
                    borderRadius: '6px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                      color: colors.semantic.warning,
                      fontWeight: '600',
                      fontSize: '13px'
                    }}>
                      <AlertTriangleIcon />
                      Potential Duplicate
                    </div>
                    {transaction.duplicate_reason && (
                      <div style={{
                        fontSize: '12px',
                        color: colors.utility.secondaryText
                      }}>
                        {transaction.duplicate_reason}
                      </div>
                    )}
                  </div>
                )}

                {/* Portfolio Flag */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '6px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      marginBottom: '2px'
                    }}>
                      Portfolio Inclusion
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: colors.utility.secondaryText
                    }}>
                      {transaction.portfolio_flag ? 'Included in portfolio totals' : 'Excluded from portfolio totals'}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPortfolioFlagModal(true)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: transaction.portfolio_flag ? colors.semantic.error + '20' : colors.semantic.success + '20',
                      color: transaction.portfolio_flag ? colors.semantic.error : colors.semantic.success,
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {transaction.portfolio_flag ? 'Exclude' : 'Include'}
                  </button>
                </div>

                {/* Timestamps */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  fontSize: '11px',
                  color: colors.utility.secondaryText
                }}>
                  <div>
                    Created: {new Date(transaction.created_at).toLocaleString('en-IN')}
                  </div>
                  <div>
                    Updated: {new Date(transaction.updated_at).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Staging Data (Collapsible) */}
            {transaction.staging_data && Object.keys(transaction.staging_data).length > 0 && (
              <div style={{
                padding: '16px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px'
              }}>
                <button
                  onClick={() => setShowStagingData(!showStagingData)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: colors.utility.primaryText
                  }}
                >
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Staging Data ({Object.keys(transaction.staging_data).length} fields)
                  </span>
                  {showStagingData ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </button>

                {showStagingData && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: colors.utility.secondaryBackground,
                    borderRadius: '6px',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    <pre style={{
                      margin: 0,
                      fontSize: '11px',
                      color: colors.utility.primaryText,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}>
                      {JSON.stringify(transaction.staging_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div style={{
            padding: '20px 24px',
            borderTop: `1px solid ${colors.utility.primaryText}10`,
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.semantic.error + '20',
                color: colors.semantic.error,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <TrashIcon />
              Delete
            </button>

            <button
              onClick={onClose}
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
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Transaction"
        message={
          <>
            You are about to <strong style={{ color: colors.semantic.error }}>delete</strong> transaction{' '}
            <strong>#{transaction.id}</strong> dated{' '}
            <strong>{TransactionService.formatDate(transaction.txn_date)}</strong> with amount{' '}
            <strong>{TransactionService.formatAmount(transaction.total_amount)}</strong>.
            <br /><br />
            This action will mark the transaction as inactive but will not permanently delete it from the database. The transaction will no longer appear in your active transactions list.
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonColor="error"
        icon="error"
        loading={isProcessing}
      />

      {/* Portfolio Flag Confirmation Modal */}
      <ConfirmationModal
        isOpen={showPortfolioFlagModal}
        onClose={() => setShowPortfolioFlagModal(false)}
        onConfirm={handlePortfolioFlagConfirm}
        title={transaction.portfolio_flag ? 'Exclude from Portfolio' : 'Include in Portfolio'}
        message={
          transaction.portfolio_flag ? (
            <>
              You are about to <strong style={{ color: colors.semantic.warning }}>exclude</strong> this transaction from portfolio calculations.
              <br /><br />
              The transaction will remain in your records but will <strong>not be counted</strong> in portfolio totals and reports. This is useful for duplicate or test transactions.
              <br /><br />
              Portfolio totals will be automatically recalculated after this action.
            </>
          ) : (
            <>
              You are about to <strong style={{ color: colors.semantic.success }}>include</strong> this transaction in portfolio calculations.
              <br /><br />
              The transaction will be <strong>counted</strong> in all portfolio totals and reports.
              <br /><br />
              Portfolio totals will be automatically recalculated after this action.
            </>
          )
        }
        confirmText={transaction.portfolio_flag ? 'Exclude' : 'Include'}
        cancelText="Cancel"
        confirmButtonColor={transaction.portfolio_flag ? 'warning' : 'success'}
        icon={transaction.portfolio_flag ? 'warning' : 'success'}
        loading={isProcessing}
      />
    </>
  );
};

export default TransactionDetails;