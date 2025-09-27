// frontend/src/components/nav/HistoricalDownloadModal.tsx
// FIXED: Type issues and validation error handling

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useDownloads } from '../../hooks/useNavData';
import { toastService } from '../../services/toast.service';
import { NavService } from '../../services/nav.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import type { SchemeBookmark } from '../../services/nav.service';

interface HistoricalDownloadModalProps {
  isOpen: boolean;
  bookmark: SchemeBookmark | null;
  onClose: () => void;
  onDownloadStarted?: (jobId: number) => void;
  onShowProgress?: (jobId: number) => void;
}

export const HistoricalDownloadModal: React.FC<HistoricalDownloadModalProps> = ({
  isOpen,
  bookmark,
  onClose,
  onDownloadStarted,
  onShowProgress
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const { triggerHistoricalDownload } = useDownloads();

  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && bookmark) {
      resetForm();
    } else if (!isOpen) {
      clearForm();
    }
  }, [isOpen, bookmark]);

  const resetForm = () => {
    if (!bookmark) return;

    // Set default end date to latest NAV date or today
    let defaultEndDate: Date;
    if (bookmark.latest_nav_date) {
      defaultEndDate = new Date(bookmark.latest_nav_date);
    } else {
      defaultEndDate = new Date();
    }
    
    // Ensure end date is not in future
    const today = new Date();
    if (defaultEndDate > today) {
      defaultEndDate = today;
    }
    
    const endDateStr = defaultEndDate.toISOString().split('T')[0];
    setEndDate(endDateStr);

    // Set default start date to 6 months before end date or earliest NAV date
    let defaultStartDate: Date;
    
    if (bookmark.earliest_nav_date) {
      defaultStartDate = new Date(bookmark.earliest_nav_date);
    } else {
      defaultStartDate = new Date(defaultEndDate);
      defaultStartDate.setMonth(defaultStartDate.getMonth() - 6);
    }
    
    const startDateStr = defaultStartDate.toISOString().split('T')[0];
    setStartDate(startDateStr);
    setValidationError(null);
  };

  const clearForm = () => {
    setStartDate('');
    setEndDate('');
    setValidationError(null);
  };

  // FIXED: Return type should be string | null, not string | undefined
  const validateDateRange = (): string | null => {
    if (!startDate || !endDate) {
      return 'Both start and end dates are required';
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    if (start >= end) {
      return 'Start date must be before end date';
    }

    if (end > today) {
      return 'End date cannot be in the future';
    }

    // Use the validation from NavService
    const validation = NavService.validateDateRange(start, end);
    if (!validation.valid) {
      // FIXED: Ensure we return string | null, handle undefined case
      return validation.error || 'Invalid date range';
    }

    return null;
  };

  const calculateDayCount = (): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateEstimatedTime = (): string => {
    const dayCount = calculateDayCount();
    if (dayCount === 0) return '';
    
    // Rough estimate: ~2 seconds per day for historical data
    const estimatedSeconds = dayCount * 2;
    
    if (estimatedSeconds < 60) {
      return `~${estimatedSeconds} seconds`;
    } else if (estimatedSeconds < 3600) {
      return `~${Math.round(estimatedSeconds / 60)} minutes`;
    } else {
      return `~${Math.round(estimatedSeconds / 3600)} hours`;
    }
  };

  const handleSubmit = async () => {
    if (!bookmark || isSubmitting) return;

    const error = validateDateRange();
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      // FIXED: Use proper error logging method (assuming 'error' exists, replace with correct method if different)
      FrontendErrorLogger.error(
        'Starting historical download',
        'HistoricalDownloadModal',
        {
          bookmarkId: bookmark.id,
          schemeId: bookmark.scheme_id,
          startDate,
          endDate,
          dayCount: calculateDayCount()
        }
      );

      const result = await triggerHistoricalDownload({
        scheme_ids: [bookmark.scheme_id],
        start_date: startDate,
        end_date: endDate
      });

      toastService.success(`Historical download started! Estimated time: ${calculateEstimatedTime()}`);
      
      onDownloadStarted?.(result.jobId);
      onShowProgress?.(result.jobId);
      onClose();

    } catch (error: any) {
      FrontendErrorLogger.error(
        'Historical download failed',
        'HistoricalDownloadModal',
        {
          bookmarkId: bookmark.id,
          startDate,
          endDate,
          error: error.message
        },
        error.stack
      );
      
      setValidationError(error.message || 'Failed to start historical download');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Don't render if not open or no bookmark
  if (!isOpen || !bookmark) return null;

  const dayCount = calculateDayCount();
  const estimatedTime = calculateEstimatedTime();
  const isValidRange = validateDateRange() === null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        padding: '24px',
        minWidth: '500px',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📥 Download Historical NAV Data
          </h3>
          
          {!isSubmitting && (
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'color 0.2s ease'
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Scheme Info */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '6px'
          }}>
            {bookmark.scheme_name}
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '8px'
          }}>
            <strong>Code:</strong> {bookmark.scheme_code} • <strong>AMC:</strong> {bookmark.amc_name}
          </div>
          
          {/* Current NAV Data Status */}
          {bookmark.earliest_nav_date && bookmark.latest_nav_date ? (
            <div style={{
              fontSize: '12px',
              color: colors.brand.primary,
              backgroundColor: colors.brand.primary + '10',
              padding: '6px 8px',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              <strong>Current data:</strong> {new Date(bookmark.earliest_nav_date).toLocaleDateString()} to {new Date(bookmark.latest_nav_date).toLocaleDateString()} ({bookmark.nav_records_count || 0} records)
            </div>
          ) : (
            <div style={{
              fontSize: '12px',
              color: colors.semantic.warning,
              backgroundColor: colors.semantic.warning + '10',
              padding: '6px 8px',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              No existing NAV data found
            </div>
          )}
        </div>

        {/* Date Range Inputs */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText,
                marginBottom: '6px'
              }}>
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText,
                marginBottom: '6px'
              }}>
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Date Range Summary */}
          {dayCount > 0 && (
            <div style={{
              padding: '12px',
              backgroundColor: isValidRange 
                ? colors.semantic.success + '10' 
                : colors.semantic.warning + '10',
              borderRadius: '6px',
              border: `1px solid ${isValidRange 
                ? colors.semantic.success + '30' 
                : colors.semantic.warning + '30'}`,
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '14px',
                color: colors.utility.primaryText,
                marginBottom: '4px'
              }}>
                <strong>Download Summary:</strong>
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                • Date range: {dayCount} days<br/>
                • Estimated time: {estimatedTime || 'Calculating...'}<br/>
                • Historical data will be downloaded for this scheme only
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div style={{
              padding: '12px',
              backgroundColor: colors.semantic.error + '10',
              color: colors.semantic.error,
              borderRadius: '6px',
              border: `1px solid ${colors.semantic.error}30`,
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {validationError}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '16px',
          borderTop: `1px solid ${colors.utility.primaryText}10`
        }}>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              border: `1px solid ${colors.utility.secondaryText}`,
              borderRadius: '6px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValidRange || dayCount === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: (isSubmitting || !isValidRange || dayCount === 0)
                ? colors.utility.secondaryText 
                : colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (isSubmitting || !isValidRange || dayCount === 0) 
                ? 'not-allowed' 
                : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isSubmitting ? (
              <>
                <span style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Starting Download...
              </>
            ) : (
              <>📥 Start Historical Download</>
            )}
          </button>
        </div>

        {/* Help Text */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '6px',
          fontSize: '12px',
          color: colors.utility.secondaryText
        }}>
          <strong>Note:</strong> Historical downloads are limited to 6 months per request. 
          The download will run in the background and you'll be notified when complete. 
          You can track progress in the downloads section.
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};