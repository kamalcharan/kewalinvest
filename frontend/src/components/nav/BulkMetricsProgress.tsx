// frontend/src/components/nav/BulkMetricsProgress.tsx
// Progress tracker component for bulk metrics calculation

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { BulkMetricsError } from '../../types/nav.types';

/**
 * Props for BulkMetricsProgress component
 */
interface BulkMetricsProgressProps {
  isOpen: boolean;
  current: number;
  total: number;
  successCount: number;
  failureCount: number;
  currentScheme?: string;
  errors?: BulkMetricsError[];
  onCancel?: () => void;
  onClose?: () => void;
}

/**
 * BulkMetricsProgress Component
 * Displays real-time progress for bulk metrics calculation
 * 
 * @example
 * ```tsx
 * <BulkMetricsProgress
 *   isOpen={isProcessing}
 *   current={progress.current}
 *   total={progress.total}
 *   successCount={progress.successCount}
 *   failureCount={progress.failureCount}
 *   currentScheme={progress.currentScheme}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export const BulkMetricsProgress: React.FC<BulkMetricsProgressProps> = ({
  isOpen,
  current,
  total,
  successCount,
  failureCount,
  currentScheme,
  errors = [],
  onCancel,
  onClose,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Calculate progress percentage
  const progressPercentage = total > 0 ? Math.round((current / total) * 100) : 0;

  // Check if complete
  const isComplete = current >= total && total > 0;

  // Calculate success rate
  const successRate = total > 0 
    ? ((successCount / total) * 100).toFixed(1) 
    : '0.0';

  // Don't render if not open
  if (!isOpen) return null;

  /**
   * Handle close (only available when complete)
   */
  const handleClose = () => {
    if (isComplete && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
      >
        {/* Modal Container */}
        <div
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: '0 0 8px 0',
            }}>
              {isComplete ? '✅ Calculation Complete' : '📊 Calculating Metrics'}
            </h2>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0,
            }}>
              {isComplete 
                ? 'Bulk metrics calculation finished'
                : 'Processing schemes in batches...'
              }
            </p>
          </div>

          {/* Progress Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}>
            {/* Total Progress */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: colors.brand.primary,
                marginBottom: '4px',
              }}>
                {current}/{total}
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
              }}>
                Processed
              </div>
            </div>

            {/* Success Count */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: colors.semantic.success,
                marginBottom: '4px',
              }}>
                {successCount}
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
              }}>
                Successful
              </div>
            </div>

            {/* Failure Count */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: failureCount > 0 ? colors.semantic.error : colors.utility.secondaryText,
                marginBottom: '4px',
              }}>
                {failureCount}
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
              }}>
                Failed
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
              }}>
                Progress
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: '700',
                color: colors.brand.primary,
              }}>
                {progressPercentage}%
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '6px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: colors.brand.primary,
                borderRadius: '6px',
                transition: 'width 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Animated shimmer effect */}
                {!isComplete && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-100%',
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shimmer 2s infinite',
                  }} />
                )}
              </div>
            </div>
          </div>

          {/* Current Scheme */}
          {!isComplete && currentScheme && (
            <div style={{
              backgroundColor: colors.brand.primary + '10',
              border: `1px solid ${colors.brand.primary}30`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '24px',
            }}>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginBottom: '4px',
              }}>
                Currently processing:
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                wordBreak: 'break-word',
              }}>
                {currentScheme}
              </div>
            </div>
          )}

          {/* Completion Summary */}
          {isComplete && (
            <div style={{
              backgroundColor: successRate === '100.0' 
                ? colors.semantic.success + '10'
                : colors.semantic.warning + '10',
              border: `1px solid ${successRate === '100.0' 
                ? colors.semantic.success + '30'
                : colors.semantic.warning + '30'}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px',
              }}>
                {successRate === '100.0' 
                  ? '🎉 All schemes calculated successfully!'
                  : `⚠️ ${successCount}/${total} schemes calculated successfully`
                }
              </div>
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
              }}>
                Success Rate: <strong>{successRate}%</strong>
              </div>
            </div>
          )}

          {/* Error List */}
          {isComplete && errors.length > 0 && (
            <div style={{
              marginBottom: '24px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.semantic.error,
                marginBottom: '12px',
              }}>
                ⚠️ Failed Schemes ({errors.length}):
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {errors.map((error, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: colors.semantic.error + '10',
                      border: `1px solid ${colors.semantic.error}30`,
                      borderRadius: '6px',
                      padding: '12px',
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      marginBottom: '4px',
                    }}>
                      {error.scheme_code}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: colors.semantic.error,
                    }}>
                      {error.error}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}>
            {!isComplete && onCancel && (
              <button
                onClick={onCancel}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: colors.semantic.error,
                  border: `2px solid ${colors.semantic.error}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.semantic.error + '10';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                ✕ Cancel
              </button>
            )}

            {isComplete && onClose && (
              <button
                onClick={handleClose}
                style={{
                  padding: '12px 32px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                ✓ Done
              </button>
            )}
          </div>

          {/* Processing Note */}
          {!isComplete && (
            <div style={{
              marginTop: '24px',
              padding: '12px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textAlign: 'center',
            }}>
              ℹ️ Processing in batches with delays to prevent server overload.
              <br />
              This may take a few minutes depending on the number of schemes.
            </div>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default BulkMetricsProgress;