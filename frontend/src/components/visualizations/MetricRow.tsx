// frontend/src/components/visualizations/MetricRow.tsx
// Reusable compact metric row component for sidebar display

import React from 'react';
import type { ChartColors } from '../../types/chartViewer.types';

export type MetricTrend = 'up' | 'down' | 'neutral';
export type MetricFormat = 'percentage' | 'ratio' | 'number';

interface MetricRowProps {
  label: string;
  value: number | null | undefined;
  format?: MetricFormat;
  trend?: MetricTrend;
  colors: ChartColors;
  highlight?: boolean;
  decimals?: number;
}

const MetricRow: React.FC<MetricRowProps> = ({
  label,
  value,
  format = 'percentage',
  trend = 'neutral',
  colors,
  highlight = false,
  decimals = 2
}) => {
  // Format value based on type
  const formatValue = (val: number | null | undefined): string => {
    // FIXED: Validate number before formatting
    if (val === null || val === undefined || isNaN(Number(val))) {
      return '--';
    }

    const numVal = Number(val);
    if (isNaN(numVal)) {
      return '--';
    }

    switch (format) {
      case 'percentage':
        const sign = numVal >= 0 ? '+' : '';
        return `${sign}${numVal.toFixed(decimals)}%`;
      
      case 'ratio':
        return numVal.toFixed(decimals);
      
      case 'number':
        return numVal.toLocaleString('en-IN', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
      
      default:
        return numVal.toFixed(decimals);
    }
  };

  // Get value color based on trend and format
  const getValueColor = (): string => {
    // For percentages and trend-based metrics, use semantic colors
    if (format === 'percentage' && value !== null && value !== undefined) {
      const numVal = Number(value);
      if (!isNaN(numVal)) {
        if (numVal > 0) return colors.semantic.success;
        if (numVal < 0) return colors.semantic.error;
      }
    }
    
    // For ratios with highlight (like Sharpe > 1)
    if (highlight && format === 'ratio' && value !== null && value !== undefined) {
      const numVal = Number(value);
      if (!isNaN(numVal)) {
        if (numVal >= 1) return colors.semantic.success;
        if (numVal < 1) return colors.semantic.warning;
      }
    }
    
    // Default: primary text color (for volatility, etc.)
    return colors.utility.primaryText;
  };

  // Get trend arrow
  const getTrendArrow = (): string => {
    if (trend === 'up') return '▲';
    if (trend === 'down') return '▼';
    return '';
  };

  // Determine if value is valid
  const isValidValue = value !== null && value !== undefined && !isNaN(Number(value));
  const displayValue = formatValue(value);
  const valueColor = isValidValue ? getValueColor() : colors.utility.secondaryText;
  const trendArrow = isValidValue && trend !== 'neutral' ? getTrendArrow() : '';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: `1px solid ${colors.utility.primaryText}05`,
        transition: 'background-color 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = colors.utility.primaryText + '05';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: '13px',
          fontWeight: '500',
          color: colors.utility.secondaryText,
          letterSpacing: '0.3px'
        }}
      >
        {label}
      </span>

      {/* Value & Trend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span
          style={{
            fontSize: '16px',
            fontWeight: '700',
            color: valueColor,
            fontFamily: 'monospace',
            letterSpacing: '-0.5px'
          }}
        >
          {displayValue}
        </span>
        
        {trendArrow && (
          <span
            style={{
              fontSize: '12px',
              color: valueColor,
              opacity: 0.8
            }}
          >
            {trendArrow}
          </span>
        )}

        {highlight && isValidValue && (
          <span
            style={{
              fontSize: '14px',
              marginLeft: '2px'
            }}
          >
            ⭐
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricRow;