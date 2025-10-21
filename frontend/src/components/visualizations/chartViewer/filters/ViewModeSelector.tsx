// frontend/src/components/visualizations/chartViewer/filters/ViewModeSelector.tsx
// Selector for data view mode (Price vs Returns)

import React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';
import type { ChartColors, ViewMode } from '../../../../types/chartViewer.types';

interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (viewMode: ViewMode) => void;
  colors: ChartColors;
}

const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  value,
  onChange,
  colors
}) => {
  const modes: Array<{ 
    value: ViewMode; 
    icon: React.ReactNode; 
    label: string; 
    tooltip: string 
  }> = [
    { 
      value: 'price', 
      icon: <DollarSign size={16} />, 
      label: 'Price', 
      tooltip: 'Show absolute price values' 
    },
    { 
      value: 'returns', 
      icon: <TrendingUp size={16} />, 
      label: 'Returns', 
      tooltip: 'Show percentage returns' 
    }
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
      aria-label="Data view mode selector"
    >
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          title={mode.tooltip}
          aria-label={mode.tooltip}
          aria-pressed={value === mode.value}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: value === mode.value 
              ? colors.semantic.info 
              : 'transparent',
            color: value === mode.value 
              ? 'white' 
              : colors.utility.primaryText,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            minWidth: '80px',
            minHeight: '32px',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (value !== mode.value) {
              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
            }
          }}
          onMouseLeave={(e) => {
            if (value !== mode.value) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {mode.icon}
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewModeSelector;