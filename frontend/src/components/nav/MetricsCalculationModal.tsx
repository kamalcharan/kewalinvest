// frontend/src/components/nav/MetricsCalculationModal.tsx
// FIXED: SchemeReadiness structure and validation

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCalculateMetricsFromBookmark } from '../../hooks/useMetricsCalculation';
import { schemeAnalysisService } from '../../services/schemeAnalysis.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import type { SchemeBookmark } from '../../types/nav.types';

/**
 * Props for MetricsCalculationModal
 */
interface MetricsCalculationModalProps {
  isOpen: boolean;
  bookmark: SchemeBookmark | null;
  onClose: () => void;
  onCalculationStarted?: (schemeId: number) => void;
  onCalculationComplete?: (schemeId: number) => void;
}

/**
 * MetricsCalculationModal Component
 * Modal for triggering metrics calculation with options
 */
export const MetricsCalculationModal: React.FC<MetricsCalculationModalProps> = ({
  isOpen,
  bookmark,
  onClose,
  onCalculationStarted,
  onCalculationComplete,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Local state
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [useSpecificDate, setUseSpecificDate] = useState(false);
  const [forceRecalculate, setForceRecalculate] = useState(false);

  // Hook for calculation
  const { calculateFromBookmark, isCalculating, error } = useCalculateMetricsFromBookmark({
    onSuccess: (data, params) => {
      FrontendErrorLogger.info(
        'Metrics calculation completed successfully',
        'MetricsCalculationModal',
        {
          schemeId: params.bookmark.scheme_id, // FIXED: Access via bookmark
          date: data.date,
          calculationTime: data.calculation_time_ms,
        }
      );

      // Call completion callback
      if (onCalculationComplete && bookmark) {
        onCalculationComplete(bookmark.scheme_id);
      }

      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAsOfDate('');
      setUseSpecificDate(false);
      setForceRecalculate(false);
    }
  }, [isOpen]);

  // Don't render if not open or no bookmark
  if (!isOpen || !bookmark) return null;

  /**
   * Validate scheme readiness
   * FIXED: Pass full bookmark object
   */
  const readiness = schemeAnalysisService.validateSchemeReadiness(bookmark);

  /**
   * Check if can proceed
   * FIXED: Check status instead of ready property
   */
  const canProceed = readiness.status === 'ready' || readiness.status === 'partial';

  /**
   * Handle calculation trigger
   */
  const handleCalculate = async () => {
    if (!bookmark) return;

    FrontendErrorLogger.info(
      'Triggering metrics calculation from modal',
      'MetricsCalculationModal.handleCalculate',
      {
        schemeId: bookmark.scheme_id,
        useSpecificDate,
        asOfDate,
        forceRecalculate,
      }
    );

    // Call started callback
    if (onCalculationStarted) {
      onCalculationStarted(bookmark.scheme_id);
    }

    try {
      await calculateFromBookmark(bookmark, {
        as_of_date: useSpecificDate && asOfDate ? asOfDate : undefined,
        recalculate: forceRecalculate,
      });
    } catch (error: any) {
      // Error is already handled by the hook
      FrontendErrorLogger.error(
        'Calculation trigger failed',
        'MetricsCalculationModal.handleCalculate',
        {
          schemeId: bookmark.scheme_id,
          error: error.message,
        }
      );
    }
  };

  /**
   * Get today's date in YYYY-MM-DD format
   */
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  /**
   * Get earliest allowed date (earliest NAV date)
   */
  const getMinDate = () => {
    if (bookmark.earliest_nav_date) {
      return bookmark.earliest_nav_date.split('T')[0];
    }
    return undefined;
  };

  /**
   * Get latest allowed date (latest NAV date or today)
   */
  const getMaxDate = () => {
    if (bookmark.latest_nav_date) {
      return bookmark.latest_nav_date.split('T')[0];
    }
    return getTodayDate();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
      >
        {/* Modal Container */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: 0,
            }}>
              📊 Calculate Metrics
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ×
            </button>
          </div>

          {/* Scheme Info */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px',
            }}>
              {bookmark.scheme_name}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              fontSize: '12px',
              color: colors.utility.secondaryText,
            }}>
              <div><strong>Code:</strong> {bookmark.scheme_code}</div>
              <div><strong>AMC:</strong> {bookmark.amc_name}</div>
              <div>
                <strong>NAV Records:</strong> {bookmark.nav_records_count.toLocaleString()}
                {bookmark.earliest_nav_date && bookmark.latest_nav_date && (
                  <span style={{ marginLeft: '8px' }}>
                    ({new Date(bookmark.earliest_nav_date).toLocaleDateString('en-IN')} 
                    {' '}-{' '}
                    {new Date(bookmark.latest_nav_date).toLocaleDateString('en-IN')})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Readiness Warning - FIXED: Check status */}
          {readiness.status === 'no_data' && (
            <div style={{
              backgroundColor: colors.semantic.error + '10',
              border: `1px solid ${colors.semantic.error}30`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '13px',
              color: colors.semantic.error,
            }}>
              <strong>⚠️ Cannot Calculate:</strong> {readiness.message}
            </div>
          )}

          {readiness.status === 'partial' && (
            <div style={{
              backgroundColor: colors.semantic.warning + '10',
              border: `1px solid ${colors.semantic.warning}30`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '13px',
              color: colors.semantic.warning,
            }}>
              <strong>⚠️ Limited Data:</strong> {readiness.message}
            </div>
          )}

          {/* Calculation Options */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '20px',
          }}>
            {/* Date Option */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: colors.utility.primaryText,
                cursor: 'pointer',
                marginBottom: '8px',
              }}>
                <input
                  type="checkbox"
                  checked={useSpecificDate}
                  onChange={(e) => setUseSpecificDate(e.target.checked)}
                  disabled={isCalculating}
                  style={{ cursor: 'pointer' }}
                />
                Calculate for specific date
              </label>

              {useSpecificDate && (
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  min={getMinDate()}
                  max={getMaxDate()}
                  disabled={isCalculating}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '6px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              )}

              {!useSpecificDate && (
                <div style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText,
                  marginTop: '4px',
                }}>
                  Will calculate using latest available NAV data
                </div>
              )}
            </div>

            {/* Force Recalculate Option */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: colors.utility.primaryText,
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={forceRecalculate}
                  onChange={(e) => setForceRecalculate(e.target.checked)}
                  disabled={isCalculating}
                  style={{ cursor: 'pointer' }}
                />
                Force recalculate (even if metrics exist)
              </label>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginTop: '4px',
                marginLeft: '24px',
              }}>
                Recalculates metrics even if they were already calculated for this date
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              backgroundColor: colors.semantic.error + '10',
              border: `1px solid ${colors.semantic.error}30`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '13px',
              color: colors.semantic.error,
            }}>
              <strong>Error:</strong> {error.message}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}>
            <button
              onClick={onClose}
              disabled={isCalculating}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.secondaryText}`,
                borderRadius: '6px',
                cursor: isCalculating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                opacity: isCalculating ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isCalculating) {
                  e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleCalculate}
              disabled={isCalculating || !canProceed} // FIXED: Use canProceed
              style={{
                padding: '10px 20px',
                backgroundColor: (!canProceed || isCalculating) // FIXED
                  ? colors.utility.secondaryText
                  : colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (!canProceed || isCalculating) ? 'not-allowed' : 'pointer', // FIXED
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                opacity: (!canProceed || isCalculating) ? 0.6 : 1, // FIXED
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (canProceed && !isCalculating) { // FIXED
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (canProceed && !isCalculating) { // FIXED
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {isCalculating ? (
                <>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  Calculating...
                </>
              ) : (
                <>📊 Calculate Metrics</>
              )}
            </button>
          </div>

          {/* Info Text */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: colors.brand.primary + '10',
            border: `1px solid ${colors.brand.primary}30`,
            borderRadius: '8px',
            fontSize: '12px',
            color: colors.utility.secondaryText,
          }}>
            <strong style={{ color: colors.utility.primaryText }}>ℹ️ Note:</strong>
            {' '}Metrics calculation may take a few seconds depending on the amount of NAV data. 
            You'll be notified when the calculation is complete.
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default MetricsCalculationModal;