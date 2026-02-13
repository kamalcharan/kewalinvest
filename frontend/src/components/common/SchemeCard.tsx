// frontend/src/components/common/SchemeCard.tsx
// Unified reusable scheme card component used across the application

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Check } from 'lucide-react';

export interface SchemeCardData {
  scheme_code: string;
  scheme_name: string;
  category?: string;
  sub_category?: string;
  current_value?: number;
  allocation?: number; // 0-100
  return_percentage?: number;
  fund_name?: string;
}

interface SchemeCardProps {
  scheme: SchemeCardData;

  // Selection mode (for goal creation)
  isSelectable?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  onSelect?: (scheme: SchemeCardData) => void;

  // Display options
  showAllocation?: boolean;
  showValue?: boolean;
  showReturn?: boolean;
  showCategory?: boolean;

  // Allocation input (for goal editing)
  allocationInput?: number;
  onAllocationChange?: (percentage: number) => void;

  // Visual style
  compact?: boolean;
}

export const SchemeCard: React.FC<SchemeCardProps> = ({
  scheme,
  isSelectable = false,
  isSelected = false,
  isDisabled = false,
  onSelect,
  showAllocation = false,
  showValue = false,
  showReturn = false,
  showCategory = true,
  allocationInput,
  onAllocationChange,
  compact = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const allocation = scheme.allocation || 0;
  const availablePercentage = 100 - allocation;
  const isFullyAllocated = allocation >= 100;

  // Format helpers
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null || value === 0) return '-';
    return `₹${(value / 100000).toFixed(2)}L`;
  };

  const formatPercentage = (value?: number) => {
    if (value === undefined || value === null || value === 0) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getReturnColor = (returnPct?: number) => {
    if (returnPct === undefined || returnPct === null) return colors.utility.secondaryText;
    return returnPct >= 0 ? colors.semantic.success : colors.semantic.error;
  };

  const handleClick = () => {
    if (isSelectable && !isDisabled && onSelect) {
      onSelect(scheme);
    }
  };

  const cardPadding = compact ? '12px' : '16px';
  const titleSize = compact ? '13px' : '14px';
  const textSize = compact ? '11px' : '12px';

  return (
    <div
      onClick={handleClick}
      style={{
        padding: cardPadding,
        backgroundColor: isSelected
          ? `${colors.brand.primary}10`
          : colors.utility.primaryBackground,
        border: `2px solid ${
          isSelected
            ? colors.brand.primary
            : isDisabled
              ? colors.utility.primaryText + '10'
              : colors.utility.primaryText + '20'
        }`,
        borderRadius: '8px',
        cursor: isSelectable && !isDisabled ? 'pointer' : 'default',
        opacity: isDisabled ? 0.6 : 1,
        transition: 'all 0.2s',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (isSelectable && !isDisabled && !isSelected) {
          e.currentTarget.style.borderColor = colors.brand.primary + '60';
          e.currentTarget.style.backgroundColor = `${colors.brand.primary}05`;
        }
      }}
      onMouseLeave={(e) => {
        if (isSelectable && !isDisabled && !isSelected) {
          e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
          e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
        }
      }}
    >
      {/* Selection Indicator */}
      {isSelectable && isSelected && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: colors.brand.primary,
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Check size={14} color="white" />
        </div>
      )}

      {/* Scheme Name and Code */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: compact ? '6px' : '8px',
        paddingRight: isSelectable && isSelected ? '28px' : '0'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: titleSize,
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '4px',
            lineHeight: '1.3'
          }}>
            {scheme.fund_name || scheme.scheme_name}
          </div>
          <div style={{
            fontSize: textSize,
            color: colors.utility.secondaryText
          }}>
            {scheme.scheme_code}
          </div>
        </div>
      </div>

      {/* Category/Sub-category */}
      {showCategory && (scheme.category || scheme.sub_category) && (
        <div style={{
          fontSize: textSize,
          color: colors.utility.secondaryText,
          marginBottom: compact ? '6px' : '8px'
        }}>
          {scheme.category}{scheme.sub_category ? ` • ${scheme.sub_category}` : ''}
        </div>
      )}

      {/* Value and Return Row */}
      {(showValue || showReturn) && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: compact ? '6px' : '8px'
        }}>
          {showValue && (
            <div style={{
              fontSize: textSize,
              color: colors.utility.secondaryText
            }}>
              Value: <span style={{ fontWeight: '600', color: colors.utility.primaryText }}>
                {formatCurrency(scheme.current_value)}
              </span>
            </div>
          )}
          {showReturn && (
            <div style={{
              fontSize: textSize,
              fontWeight: '600',
              color: getReturnColor(scheme.return_percentage)
            }}>
              {formatPercentage(scheme.return_percentage)}
            </div>
          )}
        </div>
      )}

      {/* Allocation Display */}
      {showAllocation && (
        <div style={{
          marginTop: compact ? '8px' : '10px',
          paddingTop: compact ? '8px' : '10px',
          borderTop: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px'
          }}>
            <span style={{
              fontSize: textSize,
              color: colors.utility.secondaryText
            }}>
              Allocated
            </span>
            <span style={{
              fontSize: textSize,
              fontWeight: '600',
              color: isFullyAllocated ? colors.semantic.error : colors.utility.primaryText
            }}>
              {allocation.toFixed(1)}%
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            width: '100%',
            height: '6px',
            backgroundColor: colors.utility.primaryText + '10',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(allocation, 100)}%`,
              height: '100%',
              backgroundColor: isFullyAllocated ? colors.semantic.error : colors.brand.primary,
              transition: 'width 0.3s'
            }} />
          </div>

          {availablePercentage > 0 && (
            <div style={{
              fontSize: '10px',
              color: colors.semantic.success,
              marginTop: '4px'
            }}>
              {availablePercentage.toFixed(1)}% available
            </div>
          )}

          {isFullyAllocated && (
            <div style={{
              fontSize: '10px',
              color: colors.semantic.error,
              marginTop: '4px',
              fontWeight: '600'
            }}>
              Fully allocated
            </div>
          )}
        </div>
      )}

      {/* Allocation Input */}
      {onAllocationChange !== undefined && (
        <div style={{
          marginTop: compact ? '8px' : '10px',
          paddingTop: compact ? '8px' : '10px',
          borderTop: `1px solid ${colors.utility.primaryText}10`
        }}>
          <label style={{
            display: 'block',
            fontSize: textSize,
            color: colors.utility.secondaryText,
            marginBottom: '6px'
          }}>
            Allocate to this goal (max: {availablePercentage.toFixed(1)}%)
          </label>
          <input
            type="number"
            min="0"
            max={availablePercentage}
            step="0.1"
            value={allocationInput || 0}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              const capped = Math.min(Math.max(value, 0), availablePercentage);
              onAllocationChange(capped);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: textSize,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText
            }}
          />
        </div>
      )}

      {/* Disabled overlay message */}
      {isDisabled && isFullyAllocated && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.utility.primaryBackground + 'E0',
          borderRadius: '8px',
          fontSize: textSize,
          fontWeight: '600',
          color: colors.semantic.error
        }}>
          100% Allocated
        </div>
      )}
    </div>
  );
};

export default SchemeCard;
