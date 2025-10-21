// frontend/src/components/visualizations/chartViewer/filters/GranularitySelector.tsx
// Selector for data granularity (Daily, Weekly, Monthly)

import React from 'react';
import type { ChartColors, Granularity } from '../../../../types/chartViewer.types';

interface GranularitySelectorProps {
  value: Granularity;
  onChange: (granularity: Granularity) => void;
  colors: ChartColors;
}

const GranularitySelector: React.FC<GranularitySelectorProps> = ({
  value,
  onChange,
  colors
}) => {
  const options: Array<{ value: Granularity; label: string; tooltip: string }> = [
    { value: 'daily', label: 'D', tooltip: 'Daily' },
    { value: 'weekly', label: 'W', tooltip: 'Weekly' },
    { value: 'monthly', label: 'M', tooltip: 'Monthly' }
  ];

  return (
    <div
      style={{
        display: 'inline-flex',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '6px',
        padding: '3px',
        border: `1px solid ${colors.utility.primaryText}10`,
        gap: '2px'
      }}
      role="group"
      aria-label="Data granularity selector"
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          title={option.tooltip}
          aria-label={option.tooltip}
          aria-pressed={value === option.value}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 14px',
            backgroundColor: value === option.value 
              ? colors.brand.secondary 
              : 'transparent',
            color: value === option.value 
              ? 'white' 
              : colors.utility.primaryText,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: value === option.value ? '600' : '500',
            transition: 'all 0.2s ease',
            minWidth: '40px',
            minHeight: '32px',
            letterSpacing: '0.5px'
          }}
          onMouseEnter={(e) => {
            if (value !== option.value) {
              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
            }
          }}
          onMouseLeave={(e) => {
            if (value !== option.value) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default GranularitySelector;