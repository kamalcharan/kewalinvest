// frontend/src/components/jtbd/dashboard/DashboardFilters.tsx

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface DashboardFiltersProps {
  timeRange: 'today' | '7days' | '30days' | 'overdue' | 'custom';
  onTimeRangeChange: (range: 'today' | '7days' | '30days' | 'overdue' | 'custom') => void;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  priority: string;
  onPriorityChange: (priority: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  view: 'list' | 'calendar';
  onViewChange: (view: 'list' | 'calendar') => void;
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  timeRange,
  onTimeRangeChange,
  startDate = '',
  endDate = '',
  onDateRangeChange,
  priority,
  onPriorityChange,
  status,
  onStatusChange,
  view,
  onViewChange
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Time range options
  const timeRangeOptions = [
    { value: 'today', label: 'Today', icon: '📍' },
    { value: '7days', label: '7 Days', icon: '📅' },
    { value: '30days', label: '30 Days', icon: '🗓️' },
    { value: 'overdue', label: 'Overdue', icon: '⚠️' },
    { value: 'custom', label: 'Custom Range', icon: '📆' }
  ];

  // Handle date change with validation
  const handleStartDateChange = (newStartDate: string) => {
    if (onDateRangeChange) {
      // If end date exists and new start is after end, reset end date
      if (endDate && newStartDate > endDate) {
        onDateRangeChange(newStartDate, newStartDate);
      } else {
        onDateRangeChange(newStartDate, endDate);
      }
    }
  };

  const handleEndDateChange = (newEndDate: string) => {
    if (onDateRangeChange) {
      // If start date exists and new end is before start, adjust start date
      if (startDate && newEndDate < startDate) {
        onDateRangeChange(newEndDate, newEndDate);
      } else {
        onDateRangeChange(startDate, newEndDate);
      }
    }
  };

  // Icons
  const ListIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  return (
    <div style={{
      padding: '16px',
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Time Range Filter */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '600',
          color: colors.utility.secondaryText,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Time Range
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onTimeRangeChange(option.value as any)}
              style={{
                padding: '8px 16px',
                backgroundColor: timeRange === option.value ? colors.brand.primary : 'transparent',
                color: timeRange === option.value ? 'white' : colors.utility.primaryText,
                border: `1px solid ${timeRange === option.value ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (timeRange !== option.value) {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryText + '05';
                }
              }}
              onMouseLeave={(e) => {
                if (timeRange !== option.value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {timeRange === 'custom' && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px',
          border: `2px solid ${colors.brand.primary}40`
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: colors.brand.primary,
            marginBottom: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>📆</span>
            <span>Custom Date Range</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div>
              <label style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                marginBottom: '6px',
                display: 'block'
              }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                max={endDate || undefined}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${startDate ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: colors.utility.primaryText,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.brand.primary;
                }}
                onBlur={(e) => {
                  if (!startDate) {
                    e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                  }
                }}
              />
            </div>
            <div>
              <label style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                marginBottom: '6px',
                display: 'block'
              }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                min={startDate || undefined}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${endDate ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: colors.utility.primaryText,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.brand.primary;
                }}
                onBlur={(e) => {
                  if (!endDate) {
                    e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                  }
                }}
              />
            </div>
          </div>
          
          {/* Validation Message */}
          {(!startDate || !endDate) && (
            <div style={{
              marginTop: '8px',
              fontSize: '11px',
              color: colors.semantic.warning,
              fontStyle: 'italic'
            }}>
              ⚠️ Please select both start and end dates
            </div>
          )}
          
          {startDate && endDate && (
            <div style={{
              marginTop: '8px',
              fontSize: '11px',
              color: colors.semantic.success,
              fontWeight: '600'
            }}>
              ✓ {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days selected
            </div>
          )}
        </div>
      )}

      {/* Other Filters Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        {/* Priority Filter */}
        <div>
          <label style={{
            fontSize: '11px',
            fontWeight: '600',
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            display: 'block',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: colors.utility.primaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              fontSize: '12px',
              color: colors.utility.primaryText,
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.brand.primary;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
            }}
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Communication Status Filter */}
        <div>
          <label style={{
            fontSize: '11px',
            fontWeight: '600',
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            display: 'block',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Comm Status
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: colors.utility.primaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              fontSize: '12px',
              color: colors.utility.primaryText,
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.brand.primary;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
            }}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* View Toggle */}
        <div>
          <label style={{
            fontSize: '11px',
            fontWeight: '600',
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            display: 'block',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            View
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => onViewChange('list')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: view === 'list' ? colors.brand.primary : 'transparent',
                color: view === 'list' ? 'white' : colors.utility.primaryText,
                border: `1px solid ${view === 'list' ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (view !== 'list') {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryText + '05';
                }
              }}
              onMouseLeave={(e) => {
                if (view !== 'list') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <ListIcon />
              List
            </button>
            <button
              onClick={() => onViewChange('calendar')}
              style={{
                flex: 1,
                padding: '8px',
                backgroundColor: view === 'calendar' ? colors.brand.primary : 'transparent',
                color: view === 'calendar' ? 'white' : colors.utility.primaryText,
                border: `1px solid ${view === 'calendar' ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (view !== 'calendar') {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryText + '05';
                }
              }}
              onMouseLeave={(e) => {
                if (view !== 'calendar') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <CalendarIcon />
              Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;