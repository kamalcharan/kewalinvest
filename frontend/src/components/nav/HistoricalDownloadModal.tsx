// frontend/src/components/nav/HistoricalDownloadModal.tsx
// UPDATED: Simplified for MFAPI.in - removed all chunking complexity

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

interface DatePreset {
  label: string;
  days: number;
  description: string;
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
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // UPDATED: Simplified date presets without chunking references
  const datePresets: DatePreset[] = [
    { label: 'Last 30 Days', days: 30, description: 'Recent month' },
    { label: 'Last 90 Days', days: 90, description: '3 months' },
    { label: 'Last 6 Months', days: 180, description: '6 months' },
    { label: 'Last 1 Year', days: 365, description: '1 year' },
    { label: 'Since Inception', days: -1, description: 'Full history' }
  ];

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

    // Set default start date to 90 days before end date
    const defaultStartDate = new Date(defaultEndDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - 89);
    
    const startDateStr = defaultStartDate.toISOString().split('T')[0];
    setStartDate(startDateStr);
    setValidationError(null);
    setSelectedPreset('Last 90 Days');
  };

  const clearForm = () => {
    setStartDate('');
    setEndDate('');
    setValidationError(null);
    setSelectedPreset(null);
  };

  const handlePresetSelection = (preset: DatePreset) => {
    if (!bookmark) return;

    setSelectedPreset(preset.label);
    setValidationError(null);

    const today = new Date();
    let endDate = today;
    
    // Use latest NAV date if available and more recent
    if (bookmark.latest_nav_date) {
      const latestNavDate = new Date(bookmark.latest_nav_date);
      if (latestNavDate < today) {
        endDate = latestNavDate;
      }
    }

    const endDateStr = endDate.toISOString().split('T')[0];
    setEndDate(endDateStr);

    if (preset.days === -1) {
      // Since inception - use launch date or earliest NAV date
      let inceptionDate: Date;
      
      if (bookmark.launch_date) {
        inceptionDate = new Date(bookmark.launch_date);
      } else if (bookmark.earliest_nav_date) {
        inceptionDate = new Date(bookmark.earliest_nav_date);
      } else {
        // Fallback to 1 year ago
        inceptionDate = new Date(endDate);
        inceptionDate.setFullYear(inceptionDate.getFullYear() - 1);
      }
      
      const startDateStr = inceptionDate.toISOString().split('T')[0];
      setStartDate(startDateStr);
    } else {
      // Calculate start date based on preset days
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (preset.days - 1));
      
      const startDateStr = startDate.toISOString().split('T')[0];
      setStartDate(startDateStr);
    }
  };

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

    // Use simplified validation from NavService
    const validation = NavService.validateDateRange(start, end);
    if (!validation.valid) {
      return validation.error || 'Invalid date range';
    }

    return null;
  };

  const calculateDayCount = (): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  // SIMPLIFIED: No chunking calculations needed
  const getEstimatedTime = (): string => {
    // MFAPI.in provides full history in ~2 seconds per scheme
    return '~2 minutes';
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
      const dayCount = calculateDayCount();
      
      FrontendErrorLogger.info(
        'Starting historical download',
        'HistoricalDownloadModal',
        {
          bookmarkId: bookmark.id,
          schemeId: bookmark.scheme_id,
          startDate,
          endDate,
          dayCount,
          selectedPreset
        }
      );

      const request = {
        scheme_ids: [bookmark.scheme_id],
        start_date: startDate,
        end_date: endDate
      };

      const result = await triggerHistoricalDownload(request);
      
      // SIMPLIFIED: Single success message without chunking complexity
      const estimatedMinutes = Math.ceil(result.estimated_time_ms / 60000);
      toastService.success(
        `Historical download started! Estimated time: ${estimatedMinutes} minute${estimatedMinutes > 1 ? 's' : ''}`
      );
      
      onDownloadStarted?.(result.job_id);
      onShowProgress?.(result.job_id);
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
        minWidth: '600px',
        maxWidth: '800px',
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
            {bookmark.launch_date && (
              <> • <strong>Launch Date:</strong> {new Date(bookmark.launch_date).toLocaleDateString()}</>
            )}
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

        {/* Date Preset Buttons */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Quick Date Selection
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '8px',
            marginBottom: '16px'
          }}>
            {datePresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetSelection(preset)}
                disabled={isSubmitting}
                style={{
                  padding: '10px 12px',
                  backgroundColor: selectedPreset === preset.label 
                    ? colors.brand.primary 
                    : colors.utility.secondaryBackground,
                  color: selectedPreset === preset.label 
                    ? 'white' 
                    : colors.utility.primaryText,
                  border: `1px solid ${selectedPreset === preset.label 
                    ? colors.brand.primary 
                    : colors.utility.primaryText + '20'}`,
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ marginBottom: '2px' }}>{preset.label}</div>
                <div style={{
                  fontSize: '10px',
                  opacity: 0.8
                }}>
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Custom Date Range
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: colors.utility.secondaryText,
                marginBottom: '4px'
              }}>
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedPreset(null);
                }}
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
                fontSize: '12px',
                fontWeight: '500',
                color: colors.utility.secondaryText,
                marginBottom: '4px'
              }}>
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedPreset(null);
                }}
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

          {/* SIMPLIFIED: Download Preview - No Chunking Info */}
          {dayCount > 0 && isValidRange && (
            <div style={{
              padding: '16px',
              backgroundColor: colors.semantic.success + '10',
              borderRadius: '8px',
              border: `1px solid ${colors.semantic.success}30`,
              marginBottom: '16px'
            }}>
              <div style={{
                fontSize: '14px',
                color: colors.utility.primaryText,
                marginBottom: '8px',
                fontWeight: '600'
              }}>
                Download Preview
              </div>
              <div style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                lineHeight: '1.5'
              }}>
                • <strong>Date range:</strong> {dayCount} days ({new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()})<br/>
                • <strong>Scheme:</strong> {bookmark.scheme_name}<br/>
                • <strong>Estimated time:</strong> {getEstimatedTime()}<br/>
                • Full history will be downloaded in a single operation
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
              <>📥 Start Download</>
            )}
          </button>
        </div>

        {/* UPDATED: Simplified Help Text */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '6px',
          fontSize: '12px',
          color: colors.utility.secondaryText
        }}>
          <strong>How it works:</strong> MFAPI.in provides complete historical data in a single download. 
          Your selected date range will be filtered from the full history. The download runs in the background 
          and you'll be notified when complete.
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