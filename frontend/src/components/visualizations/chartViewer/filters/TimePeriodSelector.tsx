// frontend/src/components/visualizations/chartViewer/filters/TimePeriodSelector.tsx
// Selector for time period filtering

import React from 'react';
import type { ChartColors } from '../../../../types/chartViewer.types';
import type { TimePeriod } from '../../../../utils/timeRangeHelper';
import { getTimePeriodShortLabel } from '../../../../utils/timeRangeHelper';

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  colors: ChartColors;
}

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  value,
  onChange,
  colors
}) => {
  const periods: TimePeriod[] = ['1w', '1m', '3m', '6m', '1y', 'ytd', 'all', 'custom'];

  const getTooltip = (period: TimePeriod): string => {
    const tooltips: Record<TimePeriod, string> = {
      '1w': '1 Week',
      '1m': '1 Month',
      '3m': '3 Months',
      '6m': '6 Months',
      '1y': '1 Year',
      'ytd': 'Year to Date',
      'all': 'All Time',
      'custom': 'Custom Date Range'
    };
    return tooltips[period];
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}
      role="group"
      aria-label="Time period selector"
    >
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          title={getTooltip(period)}
          aria-label={getTooltip(period)}
          aria-pressed={value === period}
          style={{
            padding: '6px 14px',
            backgroundColor: value === period 
              ? colors.brand.primary 
              : colors.utility.secondaryBackground,
            color: value === period 
              ? 'white' 
              : colors.utility.primaryText,
            border: `1px solid ${
              value === period 
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
            if (value !== period) {
              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              e.currentTarget.style.borderColor = colors.brand.primary + '50';
            }
          }}
          onMouseLeave={(e) => {
            if (value !== period) {
              e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
              e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
            }
          }}
        >
          {getTimePeriodShortLabel(period)}
        </button>
      ))}
    </div>
  );
};

export default TimePeriodSelector;