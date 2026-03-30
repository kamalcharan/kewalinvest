// frontend/src/components/Import/SessionMetrics.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ImportSession } from '../../types/import.types';
import { apiService } from '../../services/api.service';
import { toastService } from '../../services/toast.service';
import ConfirmationDialog from '../ui/ConfirmationDialog';

interface DateCheckResult {
  sessionId: number;
  isTransactionImport: boolean;
  totalRecords: number;
  correctDates: number;
  wrongDates: number;
  noDate: number;
  hasIssues: boolean;
}

interface DateCorrectResult {
  sessionId: number;
  corrected: number;
  stagingUpdated: number;
  transactionsUpdated: number;
  message: string;
}

interface SessionMetricsProps {
  session: ImportSession | null;
  onStagingDeleted?: () => void;
}

// Get retention days from environment or default to 45
const STAGING_RETENTION_DAYS = 45;

const SessionMetrics: React.FC<SessionMetricsProps> = ({ session, onStagingDeleted }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Date correction state
  const [dateCheckResult, setDateCheckResult] = useState<DateCheckResult | null>(null);
  const [isCheckingDates, setIsCheckingDates] = useState(false);
  const [isCorrectingDates, setIsCorrectingDates] = useState(false);
  const [correctionResult, setCorrectionResult] = useState<DateCorrectResult | null>(null);

  const isTransactionSession = session
    ? (session.import_type === 'TransactionData' || (session.import_type as string) === 'transaction_import')
    : false;

  // Auto-check dates when a transaction session is selected
  useEffect(() => {
    if (session && isTransactionSession) {
      checkDates();
    } else {
      setDateCheckResult(null);
      setCorrectionResult(null);
    }
  }, [session?.id]);

  const checkDates = async () => {
    if (!session) return;
    setIsCheckingDates(true);
    setCorrectionResult(null);
    try {
      const response = await apiService.get<{ success: boolean; data: DateCheckResult }>(
        `/import/date-check/${session.id}`
      );
      if (response && response.success) {
        setDateCheckResult(response.data);
      }
    } catch (error: any) {
      console.error('Error checking dates:', error);
    } finally {
      setIsCheckingDates(false);
    }
  };

  const correctDates = async () => {
    if (!session) return;
    setIsCorrectingDates(true);
    try {
      const response = await apiService.post<{ success: boolean; data: DateCorrectResult }>(
        `/import/date-correct/${session.id}`
      );
      if (response && response.success) {
        setCorrectionResult(response.data);
        toastService.success(response.data.message);
        // Re-check to update the card stats
        await checkDates();
      }
    } catch (error: any) {
      console.error('Error correcting dates:', error);
      toastService.error(error.message || 'Failed to correct dates');
    } finally {
      setIsCorrectingDates(false);
    }
  };

  if (!session) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              padding: '20px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              border: `1px solid ${colors.utility.primaryText}10`,
              opacity: 0.5
            }}
          >
            <div style={{
              height: '24px',
              width: '60%',
              backgroundColor: colors.utility.primaryText + '10',
              borderRadius: '4px',
              marginBottom: '8px'
            }} />
            <div style={{
              height: '32px',
              width: '40%',
              backgroundColor: colors.utility.primaryText + '10',
              borderRadius: '4px'
            }} />
          </div>
        ))}
      </div>
    );
  }

  const _getSuccessRate = (): number => {
    if (session.total_records === 0) return 0;
    return Math.round((session.successful_records / session.total_records) * 100);
  };

  const _getProcessingDuration = (): string => {
    if (!session.processing_started_at || !session.processing_completed_at) {
      return 'N/A';
    }
    const start = new Date(session.processing_started_at).getTime();
    const end = new Date(session.processing_completed_at).getTime();
    const duration = end - start;

    if (duration < 60000) {
      return `${Math.round(duration / 1000)}s`;
    } else if (duration < 3600000) {
      return `${Math.round(duration / 60000)}m`;
    } else {
      return `${Math.round(duration / 3600000)}h`;
    }
  };

  const getSessionAging = (): { daysOld: number; daysUntilDeletion: number; isExpiringSoon: boolean } => {
    const createdAt = new Date(session.created_at).getTime();
    const now = Date.now();
    const ageInDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
    const daysUntilDeletion = Math.max(0, STAGING_RETENTION_DAYS - ageInDays);
    const isExpiringSoon = daysUntilDeletion <= 15 && daysUntilDeletion > 0;

    return { daysOld: ageInDays, daysUntilDeletion, isExpiringSoon };
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);

      // Define response type
      interface DeleteResponse {
        success: boolean;
        data?: {
          message: string;
          deleted_count: number;
          session_id: number;
          session_name: string;
        };
        error?: string;
      }

      const response = await apiService.delete<DeleteResponse>(`/import/staging/${session.id}`);

      if (response && response.success) {
        toastService.success(response.data?.message || 'Staging data deleted successfully');
        setShowDeleteDialog(false);
        if (onStagingDeleted) {
          onStagingDeleted();
        }
      } else {
        throw new Error(response?.error || 'Failed to delete staging data');
      }
    } catch (error: any) {
      console.error('Error deleting staging data:', error);
      toastService.error(error.message || 'Failed to delete staging data');
    } finally {
      setIsDeleting(false);
    }
  };

  const aging = getSessionAging();
  const stagingDeleted = (session as any).staging_data_deleted === true;

  const metrics = [
    {
      label: 'Total Records',
      value: session.total_records.toLocaleString(),
      icon: '📊',
      color: colors.utility.primaryText,
      bgColor: colors.utility.secondaryBackground,
      borderColor: colors.utility.primaryText + '20'
    },
    {
      label: 'Successful',
      value: session.successful_records.toLocaleString(),
      percentage: session.total_records > 0 
        ? `${Math.round((session.successful_records / session.total_records) * 100)}%`
        : '0%',
      icon: '✅',
      color: colors.semantic.success,
      bgColor: colors.semantic.success + '10',
      borderColor: colors.semantic.success + '30'
    },
    {
      label: 'Failed',
      value: session.failed_records.toLocaleString(),
      percentage: session.total_records > 0
        ? `${Math.round((session.failed_records / session.total_records) * 100)}%`
        : '0%',
      icon: '❌',
      color: colors.semantic.error,
      bgColor: colors.semantic.error + '10',
      borderColor: colors.semantic.error + '30'
    },
    {
      label: 'Duplicates',
      value: session.duplicate_records.toLocaleString(),
      percentage: session.total_records > 0
        ? `${Math.round((session.duplicate_records / session.total_records) * 100)}%`
        : '0%',
      icon: '⚠️',
      color: colors.semantic.warning,
      bgColor: colors.semantic.warning + '10',
      borderColor: colors.semantic.warning + '30'
    },
    {
      label: 'Orphans',
      value: (session.orphan_records || 0).toLocaleString(),
      percentage: session.total_records > 0
        ? `${Math.round(((session.orphan_records || 0) / session.total_records) * 100)}%`
        : '0%',
      icon: '👻',
      color: colors.utility.secondaryText,
      bgColor: colors.utility.primaryText + '08',
      borderColor: colors.utility.primaryText + '15'
    }
  ];

  return (
    <div>
      {/* Session Info Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '8px',
        marginBottom: '20px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        {/* Left side: Session info fields */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
          flex: 1
        }}>
          {/* Session ID */}
          <div>
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              display: 'block',
              marginBottom: '4px'
            }}>
              Session ID
            </span>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.brand.primary
            }}>
              #{session.id}
            </span>
          </div>

          {/* Status */}
          <div>
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              display: 'block',
              marginBottom: '4px'
            }}>
              Status
            </span>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: session.status === 'completed'
                ? colors.semantic.success + '20'
                : session.status === 'failed'
                  ? colors.semantic.error + '20'
                  : session.status === 'processing'
                    ? colors.semantic.info + '20'
                    : colors.semantic.warning + '20',
              color: session.status === 'completed'
                ? colors.semantic.success
                : session.status === 'failed'
                  ? colors.semantic.error
                  : session.status === 'processing'
                    ? colors.semantic.info
                    : colors.semantic.warning,
              textTransform: 'uppercase'
            }}>
              {session.status}
            </span>
          </div>

          {/* Staging Age or Deleted Badge */}
          {!stagingDeleted ? (
            <div>
              <span style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                display: 'block',
                marginBottom: '4px'
              }}>
                Staging Age
              </span>
              <div>
                <span style={{
                  fontSize: '16px',
                  color: aging.isExpiringSoon ? colors.semantic.warning : colors.utility.primaryText,
                  fontWeight: aging.isExpiringSoon ? '600' : '500'
                }}>
                  {aging.daysOld} {aging.daysOld === 1 ? 'day' : 'days'}
                </span>
                <span style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginLeft: '6px'
                }}>
                  (deletes in {aging.daysUntilDeletion} {aging.daysUntilDeletion === 1 ? 'day' : 'days'})
                </span>
              </div>
            </div>
          ) : (
            <div>
              <span style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                display: 'block',
                marginBottom: '4px'
              }}>
                Staging Status
              </span>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: colors.utility.secondaryText + '20',
                color: colors.utility.secondaryText
              }}>
                ✓ DELETED
              </span>
            </div>
          )}
        </div>

        {/* Right side: Delete button */}
        {!stagingDeleted && session.status !== 'processing' && session.status !== 'pending' && (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.semantic.error + '10',
              color: colors.semantic.error,
              border: `1px solid ${colors.semantic.error}30`,
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.backgroundColor = colors.semantic.error + '20';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDeleting) {
                e.currentTarget.style.backgroundColor = colors.semantic.error + '10';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {isDeleting ? (
              <>
                <span style={{ fontSize: '12px' }}>⏳</span>
                Deleting...
              </>
            ) : (
              <>
                <span style={{ fontSize: '12px' }}>🗑️</span>
                Delete Staging
              </>
            )}
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {metrics.map((metric, index) => (
          <div
            key={index}
            style={{
              padding: '20px',
              backgroundColor: metric.bgColor,
              borderRadius: '12px',
              border: `1px solid ${metric.borderColor}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Pattern */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '80px',
              opacity: 0.1,
              transform: 'rotate(-15deg)'
            }}>
              {metric.icon}
            </div>

            <div style={{
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {metric.label}
                </span>
                <span style={{
                  fontSize: '20px'
                }}>
                  {metric.icon}
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: metric.color
                }}>
                  {metric.value}
                </div>
                {metric.percentage && (
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: metric.color,
                    opacity: 0.8
                  }}>
                    ({metric.percentage})
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Date Correction Card - Only for transaction imports */}
        {isTransactionSession && (
          <div
            style={{
              padding: '20px',
              backgroundColor: dateCheckResult?.hasIssues
                ? colors.semantic.error + '10'
                : correctionResult
                  ? colors.semantic.success + '10'
                  : colors.brand.primary + '08',
              borderRadius: '12px',
              border: `1px solid ${
                dateCheckResult?.hasIssues
                  ? colors.semantic.error + '30'
                  : correctionResult
                    ? colors.semantic.success + '30'
                    : colors.brand.primary + '20'
              }`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Pattern */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '80px',
              opacity: 0.1,
              transform: 'rotate(-15deg)'
            }}>
              {dateCheckResult?.hasIssues ? '\u{1F4C5}' : '\u2705'}
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  DATE CHECK
                </span>
                <span style={{ fontSize: '20px' }}>
                  {isCheckingDates ? '\u23F3' : dateCheckResult?.hasIssues ? '\u{1F4C5}' : '\u2705'}
                </span>
              </div>

              {isCheckingDates ? (
                <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
                  Checking dates...
                </div>
              ) : dateCheckResult ? (
                <>
                  {/* Stats row */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: dateCheckResult.hasIssues ? colors.semantic.error : colors.semantic.success
                    }}>
                      {dateCheckResult.wrongDates > 0
                        ? dateCheckResult.wrongDates.toLocaleString()
                        : 'All OK'}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: colors.utility.secondaryText,
                      marginTop: '4px',
                      lineHeight: '1.4'
                    }}>
                      {dateCheckResult.correctDates.toLocaleString()} correct
                      {dateCheckResult.wrongDates > 0 && (
                        <span style={{ color: colors.semantic.error, fontWeight: '600' }}>
                          {' '} | {dateCheckResult.wrongDates.toLocaleString()} wrong
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Correction result message */}
                  {correctionResult && (
                    <div style={{
                      fontSize: '11px',
                      color: colors.semantic.success,
                      fontWeight: '600',
                      marginBottom: '8px',
                      padding: '6px 8px',
                      backgroundColor: colors.semantic.success + '10',
                      borderRadius: '4px',
                      lineHeight: '1.4'
                    }}>
                      {correctionResult.corrected} records corrected. {correctionResult.transactionsUpdated} transactions updated. Monthly sheets will now show correct month data.
                    </div>
                  )}

                  {/* Correct button */}
                  {dateCheckResult.hasIssues && (
                    <button
                      onClick={correctDates}
                      disabled={isCorrectingDates}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: colors.semantic.error,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: isCorrectingDates ? 'not-allowed' : 'pointer',
                        opacity: isCorrectingDates ? 0.7 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isCorrectingDates
                        ? 'Correcting...'
                        : `Correct ${dateCheckResult.wrongDates} Dates`}
                    </button>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
                  --
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        title="Delete Staging Data"
        description={`Are you sure you want to permanently delete all ${session?.total_records.toLocaleString()} staging records for this session? You will NOT be able to reprocess failed records after deletion. This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onClose={() => setShowDeleteDialog(false)}
        type="error"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default SessionMetrics;