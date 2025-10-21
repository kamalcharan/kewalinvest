// frontend/src/components/visualizations/chartViewer/filters/ViewModeToggle.tsx
// Toggle between graph and table display modes

import React from 'react';
import { BarChart3, Table } from 'lucide-react';
import type { ChartColors, DisplayMode } from '../../../../types/chartViewer.types';

interface ViewModeToggleProps {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
  colors: ChartColors;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  value,
  onChange,
  colors
}) => {
  const modes: Array<{ value: DisplayMode; icon: React.ReactNode; label: string }> = [
    { value: 'graph', icon: <BarChart3 size={16} />, label: 'Graph View' },
    { value: 'table', icon: <Table size={16} />, label: 'Table View' }
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
      aria-label="View mode selector"
    >
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          title={mode.label}
          aria-label={mode.label}
          aria-pressed={value === mode.value}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 12px',
            backgroundColor: value === mode.value 
              ? colors.brand.primary 
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
            minWidth: '44px',
            minHeight: '32px'
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
        </button>
      ))}
    </div>
  );
};

export default ViewModeToggle;