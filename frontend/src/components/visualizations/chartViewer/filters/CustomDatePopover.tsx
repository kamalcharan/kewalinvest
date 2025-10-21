// frontend/src/components/visualizations/chartViewer/filters/CustomDatePopover.tsx
// Popover for custom date range selection

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import type { ChartColors } from '../../../../types/chartViewer.types';
import { isValidDateRange, getTodayISO } from '../../../../utils/timeRangeHelper';

interface CustomDatePopoverProps {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
  colors: ChartColors;
  isActive: boolean; // Whether custom period is currently selected
}

const CustomDatePopover: React.FC<CustomDatePopoverProps> = ({
  startDate,
  endDate,
  onApply,
  colors,
  isActive
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate);
  const [tempEndDate, setTempEndDate] = useState(endDate);
  const [error, setError] = useState<string>('');
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update temp values when props change
  useEffect(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
  }, [startDate, endDate]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setError('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setError('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleApply = () => {
    if (!tempStartDate || !tempEndDate) {
      setError('Both dates are required');
      return;
    }

    if (!isValidDateRange(tempStartDate, tempEndDate)) {
      setError('Start date must be before end date');
      return;
    }

    onApply(tempStartDate, tempEndDate);
    setIsOpen(false);
    setError('');
  };

  const handleCancel = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setIsOpen(false);
    setError('');
  };

  const today = getTodayISO();

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        title="Select custom date range"
        aria-label="Select custom date range"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          backgroundColor: isActive 
            ? colors.brand.primary 
            : colors.utility.secondaryBackground,
          color: isActive 
            ? 'white' 
            : colors.utility.primaryText,
          border: `1px solid ${
            isActive 
              ? colors.brand.primary 
              : colors.utility.primaryText + '20'
          }`,
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          minHeight: '32px',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
            e.currentTarget.style.borderColor = colors.brand.primary + '50';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
            e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
          }
        }}
      >
        <Calendar size={14} />
        <span>Custom</span>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Custom date range picker"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: '320px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}10`,
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}
            >
              Select Date Range
            </h4>
            <button
              onClick={handleCancel}
              aria-label="Close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                padding: 0,
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                color: colors.utility.secondaryText,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Date Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Start Date */}
            <div>
              <label
                htmlFor="start-date"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: colors.utility.secondaryText,
                  marginBottom: '6px'
                }}
              >
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={tempStartDate}
                onChange={(e) => {
                  setTempStartDate(e.target.value);
                  setError('');
                }}
                max={tempEndDate || today}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '4px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label
                htmlFor="end-date"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: colors.utility.secondaryText,
                  marginBottom: '6px'
                }}
              >
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={tempEndDate}
                onChange={(e) => {
                  setTempEndDate(e.target.value);
                  setError('');
                }}
                min={tempStartDate}
                max={today}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '4px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px',
                backgroundColor: colors.semantic.error + '10',
                border: `1px solid ${colors.semantic.error}30`,
                borderRadius: '4px',
                fontSize: '12px',
                color: colors.semantic.error
              }}
            >
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px'
            }}
          >
            <button
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!tempStartDate || !tempEndDate}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: (!tempStartDate || !tempEndDate)
                  ? colors.utility.secondaryText
                  : colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (!tempStartDate || !tempEndDate) ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                opacity: (!tempStartDate || !tempEndDate) ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (tempStartDate && tempEndDate) {
                  e.currentTarget.style.backgroundColor = colors.brand.secondary;
                }
              }}
              onMouseLeave={(e) => {
                if (tempStartDate && tempEndDate) {
                  e.currentTarget.style.backgroundColor = colors.brand.primary;
                }
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePopover;