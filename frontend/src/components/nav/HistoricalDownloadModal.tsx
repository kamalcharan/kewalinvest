// frontend/src/components/nav/HistoricalDownloadModal.tsx
// UPDATED: Fixed TypeScript errors and added sequential download support with chunking preview

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useDownloads } from '../../hooks/useNavData';
import { toastService } from '../../services/toast.service';
import { NavService } from '../../services/nav.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import type { SchemeBookmark, SequentialDownloadResponse } from '../../services/nav.service';

interface HistoricalDownloadModalProps {
  isOpen: boolean;
  bookmark: SchemeBookmark | null;
  onClose: () => void;
  onDownloadStarted?: (parentJobId: number) => void;
  onShowProgress?: (parentJobId: number) => void;
}

interface DatePreset {
  label: string;
  days: number;
  description: string;
}

interface ChunkingInfo {
  totalDays: number;
  chunksRequired: number;
  chunkSize: number;
  estimatedTime: string;
  chunkDetails: Array<{
    chunkNumber: number;
    startDate: string;
    endDate: string;
    dayCount: number;
  }>;
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

  // Date presets with updated descriptions for 90-day limit
  const datePresets: DatePreset[] = [
    { label: 'Last 30 Days', days: 30, description: 'Single download' },
    { label: 'Last 90 Days', days: 90, description: 'Single download' },
    { label: 'Last 6 Months', days: 180, description: '2 downloads needed' },
    { label: 'Last 1 Year', days: 365, description: '5 downloads needed' },
    { label: 'Since Inception', days: -1, description: 'Variable downloads' }
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

    // Set default start date to 90 days before end date (single download)
    const defaultStartDate = new Date(defaultEndDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - 89); // 90 days
    
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
      
      // FIXED: Check launch_date property (now exists in SchemeBookmark)
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

    // Use the validation from NavService
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

  const calculateChunkingInfo = (): ChunkingInfo => {
    const totalDays = calculateDayCount();
    const chunksRequired = Math.ceil(totalDays / 90);
    const chunkSize = Math.min(90, totalDays);
    
    // Calculate chunk details
    const chunkDetails: ChunkingInfo['chunkDetails'] = [];
    if (startDate && endDate) {
      const chunks = NavService.calculateChunks(new Date(startDate), new Date(endDate));
      chunks.forEach((chunk, index) => {
        chunkDetails.push({
          chunkNumber: index + 1,
          startDate: chunk.start_date.toISOString().split('T')[0],
          endDate: chunk.end_date.toISOString().split('T')[0],
          dayCount: chunk.day_count
        });
      });
    }
    
    // Estimate time based on chunks
    const baseTimePerChunk = 45; // 45 seconds per chunk (more realistic)
    const totalEstimatedSeconds = chunksRequired * baseTimePerChunk;
    
    let estimatedTime: string;
    if (totalEstimatedSeconds < 60) {
      estimatedTime = `~${totalEstimatedSeconds} seconds`;
    } else if (totalEstimatedSeconds < 3600) {
      estimatedTime = `~${Math.round(totalEstimatedSeconds / 60)} minutes`;
    } else {
      estimatedTime = `~${Math.round(totalEstimatedSeconds / 3600)} hours`;
    }

    return {
      totalDays,
      chunksRequired,
      chunkSize,
      estimatedTime,
      chunkDetails
    };
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
      const chunkingInfo = calculateChunkingInfo();
      
      FrontendErrorLogger.info(
        'Starting historical download',
        'HistoricalDownloadModal',
        {
          bookmarkId: bookmark.id,
          schemeId: bookmark.scheme_id,
          startDate,
          endDate,
          dayCount: chunkingInfo.totalDays,
          chunksRequired: chunkingInfo.chunksRequired,
          selectedPreset
        }
      );

      // FIXED: Use scheme_id array as expected by backend
      const request = {
        scheme_ids: [bookmark.scheme_id],
        start_date: startDate,
        end_date: endDate
      };

      const result: SequentialDownloadResponse = await triggerHistoricalDownload(request);

      // FIXED: Use parent_job_id from SequentialDownloadResponse
      const jobId = result.parent_job_id;

      if (chunkingInfo.chunksRequired > 1) {
        toastService.success(`Sequential download started! ${chunkingInfo.chunksRequired} downloads will run automatically. Estimated time: ${chunkingInfo.estimatedTime}`);
      } else {
        toastService.success(`Historical download started! Estimated time: ${chunkingInfo.estimatedTime}`);
      }
      
      // FIXED: Pass parent_job_id to callbacks
      onDownloadStarted?.(jobId);
      onShowProgress?.(jobId);
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

  const chunkingInfo = calculateChunkingInfo();
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
            {/* FIXED: Use launch_date from bookmark */}
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
                  setSelectedPreset(null); // Clear preset selection
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
                  setSelectedPreset(null); // Clear preset selection
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

          {/* Enhanced Chunking Preview */}
          {chunkingInfo.totalDays > 0 && isValidRange && (
            <div style={{
              padding: '16px',
              backgroundColor: chunkingInfo.chunksRequired > 1 
                ? colors.semantic.warning + '10' 
                : colors.semantic.success + '10',
              borderRadius: '8px',
              border: `1px solid ${chunkingInfo.chunksRequired > 1 
                ? colors.semantic.warning + '30' 
                : colors.semantic.success + '30'}`,
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
                lineHeight: '1.5',
                marginBottom: '12px'
              }}>
                • <strong>Date range:</strong> {chunkingInfo.totalDays} days ({new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()})<br/>
                • <strong>Downloads needed:</strong> {chunkingInfo.chunksRequired} 
                  {chunkingInfo.chunksRequired > 1 && ' (due to 90-day limit)'}<br/>
                • <strong>Estimated time:</strong> {chunkingInfo.estimatedTime}<br/>
                {chunkingInfo.chunksRequired > 1 && (
                  <>• <strong>Sequential processing:</strong> Downloads will run automatically one after another</>
                )}
              </div>

              {/* Detailed Chunk Breakdown for Multi-Chunk Downloads */}
              {chunkingInfo.chunksRequired > 1 && chunkingInfo.chunkDetails.length > 0 && (
                <div style={{
                  backgroundColor: colors.utility.primaryBackground,
                  padding: '12px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.utility.primaryText}10`
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '8px'
                  }}>
                    Chunk Breakdown:
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '8px',
                    maxHeight: '120px',
                    overflowY: 'auto'
                  }}>
                    {chunkingInfo.chunkDetails.slice(0, 6).map((chunk) => (
                      <div
                        key={chunk.chunkNumber}
                        style={{
                          fontSize: '11px',
                          color: colors.utility.secondaryText,
                          padding: '6px 8px',
                          backgroundColor: colors.utility.secondaryBackground,
                          borderRadius: '4px',
                          border: `1px solid ${colors.utility.primaryText}10`
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                          Chunk {chunk.chunkNumber}
                        </div>
                        <div>{new Date(chunk.startDate).toLocaleDateString()} to {new Date(chunk.endDate).toLocaleDateString()}</div>
                        <div style={{ opacity: 0.8 }}>({chunk.dayCount} days)</div>
                      </div>
                    ))}
                    {chunkingInfo.chunkDetails.length > 6 && (
                      <div style={{
                        fontSize: '11px',
                        color: colors.utility.secondaryText,
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontStyle: 'italic'
                      }}>
                        +{chunkingInfo.chunkDetails.length - 6} more chunks...
                      </div>
                    )}
                  </div>
                </div>
              )}
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
            disabled={isSubmitting || !isValidRange || chunkingInfo.totalDays === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: (isSubmitting || !isValidRange || chunkingInfo.totalDays === 0)
                ? colors.utility.secondaryText 
                : colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (isSubmitting || !isValidRange || chunkingInfo.totalDays === 0) 
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
              <>
                📥 Start {chunkingInfo.chunksRequired > 1 ? 'Sequential ' : ''}Download
                {chunkingInfo.chunksRequired > 1 && (
                  <span style={{
                    fontSize: '11px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}>
                    {chunkingInfo.chunksRequired} chunks
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* Enhanced Help Text */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '6px',
          fontSize: '12px',
          color: colors.utility.secondaryText
        }}>
          <strong>How it works:</strong> Historical downloads are automatically split into 90-day chunks due to AMFI restrictions. 
          {chunkingInfo.chunksRequired > 1 && ' Your request will be processed as multiple sequential downloads.'} 
          All downloads run in the background and you'll be notified when complete. You can track progress in the download monitor.
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