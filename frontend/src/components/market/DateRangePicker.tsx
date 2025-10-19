// frontend/src/components/market/DateRangePicker.tsx
// Date range selection modal for historical downloads

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { X, Calendar, AlertCircle } from 'lucide-react';

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
  indexName: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  indexName,
  defaultStartDate,
  defaultEndDate
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Calculate default dates (20 years ago to today)
  const today = new Date();
  const twentyYearsAgo = new Date(today);
  twentyYearsAgo.setFullYear(today.getFullYear() - 20);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // State
  const [startDate, setStartDate] = useState(
    defaultStartDate || formatDate(twentyYearsAgo)
  );
  const [endDate, setEndDate] = useState(
    defaultEndDate || formatDate(today)
  );
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset dates when modal opens
  useEffect(() => {
    if (isOpen) {
      setStartDate(defaultStartDate || formatDate(twentyYearsAgo));
      setEndDate(defaultEndDate || formatDate(today));
      setError(null);
      setIsProcessing(false);
    }
  }, [isOpen, defaultStartDate, defaultEndDate]);

  // Validate date range
  const validateDates = useCallback((start: string, end: string): string | null => {
    if (!start || !end) {
      return 'Both dates are required';
    }

    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    const todayDateObj = new Date(formatDate(today));

    // Check if dates are valid
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return 'Invalid date format';
    }

    // Start date must be before end date
    if (startDateObj >= endDateObj) {
      return 'Start date must be before end date';
    }

    // End date cannot be in the future
    if (endDateObj > todayDateObj) {
      return 'End date cannot be in the future';
    }

    // Calculate date range in years
    const yearsDiff = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    // Maximum 20 years range
    if (yearsDiff > 20) {
      return 'Date range cannot exceed 20 years';
    }

    // Start date cannot be too far in the past (e.g., before 1990)
    const minDate = new Date('1990-01-01');
    if (startDateObj < minDate) {
      return 'Start date cannot be before 1990';
    }

    return null;
  }, [today]);

  // Handle quick select
  const handleQuickSelect = useCallback((years: number) => {
    const end = formatDate(today);
    const start = new Date(today);
    start.setFullYear(today.getFullYear() - years);
    
    const newStartDate = formatDate(start);
    setStartDate(newStartDate);
    setEndDate(end);
    
    // Validate
    const validationError = validateDates(newStartDate, end);
    setError(validationError);
  }, [today, validateDates]);

  // Handle start date change
  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    
    // Validate
    const validationError = validateDates(newStartDate, endDate);
    setError(validationError);
  }, [endDate, validateDates]);

  // Handle end date change
  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    
    // Validate
    const validationError = validateDates(startDate, newEndDate);
    setError(validationError);
  }, [startDate, validateDates]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    // Final validation
    const validationError = validateDates(startDate, endDate);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsProcessing(true);
    
    // Call parent confirm handler
    onConfirm(startDate, endDate);
    
    // Reset state
    setTimeout(() => {
      setIsProcessing(false);
    }, 500);
  }, [startDate, endDate, validateDates, onConfirm]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (!isProcessing) {
      onClose();
    }
  }, [isProcessing, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onClose();
    }
  }, [isProcessing, onClose]);

  if (!isOpen) return null;

  // Quick select options
  const quickSelectOptions = [
    { label: '1 Year', years: 1 },
    { label: '5 Years', years: 5 },
    { label: '10 Years', years: 10 },
    { label: '20 Years', years: 20 }
  ];

  // Get selected quick option
  const getSelectedQuickOption = () => {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const yearsDiff = Math.round(
      (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    );
    
    return quickSelectOptions.find(opt => opt.years === yearsDiff);
  };

  const selectedOption = getSelectedQuickOption();

  return (
    <div
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
        padding: '16px'
      }}
      onClick={handleBackdropClick}
    >
      {/* Modal */}
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          position: 'relative',
          animation: 'slideIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px 20px',
          borderBottom: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
              }}>
                <Calendar size={20} color={colors.brand.primary} />
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: 0
                }}>
                  Select Date Range
                </h2>
              </div>
              <p style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {indexName}
              </p>
            </div>
            
            {!isProcessing && (
              <button
                onClick={handleCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: colors.utility.secondaryText,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Date Inputs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Start Date */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                disabled={isProcessing}
                max={formatDate(today)}
                min="1990-01-01"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${error ? colors.semantic.error : colors.utility.primaryText}20`,
                  borderRadius: '8px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: isProcessing ? 'not-allowed' : 'text',
                  opacity: isProcessing ? 0.6 : 1
                }}
                onFocus={(e) => {
                  if (!isProcessing && !error) {
                    e.currentTarget.style.borderColor = colors.brand.primary + '50';
                  }
                }}
                onBlur={(e) => {
                  if (!error) {
                    e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                  }
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                disabled={isProcessing}
                max={formatDate(today)}
                min={startDate || '1990-01-01'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${error ? colors.semantic.error : colors.utility.primaryText}20`,
                  borderRadius: '8px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: isProcessing ? 'not-allowed' : 'text',
                  opacity: isProcessing ? 0.6 : 1
                }}
                onFocus={(e) => {
                  if (!isProcessing && !error) {
                    e.currentTarget.style.borderColor = colors.brand.primary + '50';
                  }
                }}
                onBlur={(e) => {
                  if (!error) {
                    e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                  }
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: colors.semantic.error + '10',
              border: `1px solid ${colors.semantic.error}30`,
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <AlertCircle size={16} color={colors.semantic.error} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{
                fontSize: '13px',
                color: colors.semantic.error,
                lineHeight: '1.4'
              }}>
                {error}
              </div>
            </div>
          )}

          {/* Quick Select */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Quick Select
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px'
            }}>
              {quickSelectOptions.map((option) => {
                const isSelected = selectedOption?.years === option.years;
                
                return (
                  <button
                    key={option.years}
                    onClick={() => handleQuickSelect(option.years)}
                    disabled={isProcessing}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: isSelected
                        ? colors.brand.primary
                        : 'transparent',
                      color: isSelected
                        ? 'white'
                        : colors.utility.primaryText,
                      border: `1px solid ${isSelected
                        ? colors.brand.primary
                        : colors.utility.primaryText + '30'}`,
                      borderRadius: '6px',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      opacity: isProcessing ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isProcessing && !isSelected) {
                        e.currentTarget.style.backgroundColor = colors.brand.primary + '10';
                        e.currentTarget.style.borderColor = colors.brand.primary + '50';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = colors.utility.primaryText + '30';
                      }
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info Message */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: colors.semantic.info + '10',
            border: `1px solid ${colors.semantic.info}30`,
            borderRadius: '8px',
            fontSize: '12px',
            color: colors.utility.secondaryText,
            lineHeight: '1.5'
          }}>
            💡 <strong>Tip:</strong> Default range is 20 years. Maximum range allowed is 20 years.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: colors.utility.primaryText,
              border: `1px solid ${colors.utility.primaryText}30`,
              borderRadius: '8px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              opacity: isProcessing ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) {
                e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isProcessing || !!error}
            style={{
              padding: '10px 20px',
              backgroundColor: (isProcessing || error)
                ? colors.utility.secondaryText
                : colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (isProcessing || error) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              opacity: (isProcessing || error) ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isProcessing && !error) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isProcessing ? 'Processing...' : '📥 Download'}
          </button>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default DateRangePicker;