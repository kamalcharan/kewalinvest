// frontend/src/components/visualizations/chartViewer/filters/ChartTypeSelector.tsx
// Selector for chart visualization type

import React from 'react';
import { TrendingUp, AreaChart, BarChart3, GitCompare } from 'lucide-react';
import type { ChartColors, ChartType } from '../../../../types/chartViewer.types';

interface ChartTypeSelectorProps {
  value: ChartType;
  onChange: (chartType: ChartType) => void;
  colors: ChartColors;
  viewMode?: 'price' | 'returns';
}

const ChartTypeSelector: React.FC<ChartTypeSelectorProps> = ({
  value,
  onChange,
  colors,
  viewMode = 'price'
}) => {
  // Chart types available based on view mode
  const getAvailableChartTypes = () => {
    if (viewMode === 'returns') {
      // Returns view: Line and Bar charts
      return [
        { value: 'line' as ChartType, icon: <TrendingUp size={16} />, label: 'Line Chart', tooltip: 'Line chart' },
        { value: 'bar' as ChartType, icon: <BarChart3 size={16} />, label: 'Bar Chart', tooltip: 'Positive/Negative bars' }
      ];
    } else {
      // Price view: Line, Area, and Area with Baseline
      return [
        { value: 'line' as ChartType, icon: <TrendingUp size={16} />, label: 'Line Chart', tooltip: 'Line chart' },
        { value: 'area' as ChartType, icon: <AreaChart size={16} />, label: 'Area Chart', tooltip: 'Filled area chart' },
        { value: 'areaBaseline' as ChartType, icon: <GitCompare size={16} />, label: 'Area vs Baseline', tooltip: 'Area with baseline comparison' }
      ];
    }
  };

  const chartTypes = getAvailableChartTypes();

  // If current value is not available in the new view mode, switch to line
  React.useEffect(() => {
    const isAvailable = chartTypes.some(ct => ct.value === value);
    if (!isAvailable) {
      onChange('line');
    }
  }, [viewMode, value, chartTypes, onChange]);

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
      aria-label="Chart type selector"
    >
      {chartTypes.map((type) => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          title={type.tooltip}
          aria-label={type.tooltip}
          aria-pressed={value === type.value}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            backgroundColor: value === type.value 
              ? colors.brand.primary 
              : 'transparent',
            color: value === type.value 
              ? 'white' 
              : colors.utility.primaryText,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            minWidth: '44px',
            minHeight: '32px',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (value !== type.value) {
              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
            }
          }}
          onMouseLeave={(e) => {
            if (value !== type.value) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {type.icon}
        </button>
      ))}
    </div>
  );
};

export default ChartTypeSelector;