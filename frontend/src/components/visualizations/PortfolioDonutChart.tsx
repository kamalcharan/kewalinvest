// src/components/visualizations/PortfolioDonutChart.tsx

import React, { useMemo } from 'react';
import { AssetAllocation } from '../../types/portfolio.types';
import { useTheme } from '../../contexts/ThemeContext';

interface PortfolioDonutChartProps {
  allocation: AssetAllocation[];
  size?: number;
  strokeWidth?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  interactive?: boolean;
  totalValue?: number; // ✅ NEW: Accept total from parent
}

const PortfolioDonutChart: React.FC<PortfolioDonutChartProps> = ({
  allocation,
  size = 180,
  strokeWidth = 30,
  showLabels = true,
  showLegend = true,
  interactive = true,
  totalValue: propTotalValue // ✅ NEW: Get from props
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [hoveredSegment, setHoveredSegment] = React.useState<string | null>(null);

  // Asset type colors
  const assetColors: Record<string, string> = {
    'Equity': '#3B82F6',
    'Debt': '#F59E0B',
    'Hybrid': '#8B5CF6',
    'Liquid': '#10B981',
    'Money Market': '#10B981',
    'Gold': '#EAB308',
    'Other': '#6B7280'
  };

  const getCategoryColor = (category: string): string => {
    return assetColors[category] || assetColors['Other'];
  };

  // ✅ FIX: Use prop total if provided, otherwise calculate from allocation
  const totalValue = propTotalValue ?? allocation.reduce((sum, item) => sum + item.current_value, 0);

  // Calculate segments from API data
  const segments = useMemo(() => {
    // Filter out zero/negative values
    const data = allocation
      .filter(item => item.percentage > 0 && item.current_value > 0)
      .map(item => ({
        name: item.category,
        value: item.percentage,
        amount: item.current_value,
        color: getCategoryColor(item.category)
      }));

    // ✅ ENHANCEMENT: Sort by value descending for better visual hierarchy
    const sortedData = data.sort((a, b) => b.value - a.value);

    let cumulativePercentage = 0;
    return sortedData.map(item => {
      const startAngle = (cumulativePercentage * 360) / 100;
      cumulativePercentage += item.value;
      const endAngle = (cumulativePercentage * 360) / 100;
      return { ...item, startAngle, endAngle };
    });
  }, [allocation, propTotalValue]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // ✅ ENHANCEMENT: Calculate actual percentage sum for validation
  const totalPercentage = segments.reduce((sum, s) => sum + s.value, 0);
  const showPercentageWarning = Math.abs(totalPercentage - 100) > 0.5; // More than 0.5% off

  return (
    <div style={{ position: 'relative' }}>
      {/* Donut Chart */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - strokeWidth) / 2}
            fill="none"
            stroke={colors.utility.primaryText + '10'}
            strokeWidth={strokeWidth}
          />
          
          {/* Segments */}
          {segments.map((segment) => {
            const isHovered = hoveredSegment === segment.name;
            const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);
            const strokeDasharray = `${(segment.value / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((segment.startAngle / 360) * circumference);
            
            return (
              <g key={segment.name}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={(size - strokeWidth) / 2}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  style={{
                    transition: 'all 0.3s ease',
                    cursor: interactive ? 'pointer' : 'default',
                    opacity: hoveredSegment && !isHovered ? 0.6 : 1,
                    filter: isHovered ? 'brightness(1.1)' : 'none'
                  }}
                  onMouseEnter={() => interactive && setHoveredSegment(segment.name)}
                  onMouseLeave={() => interactive && setHoveredSegment(null)}
                />
              </g>
            );
          })}
        </svg>
        
        {/* Center text */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          {hoveredSegment ? (
            <>
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                marginBottom: '4px'
              }}>
                {hoveredSegment}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: colors.utility.primaryText
              }}>
                {segments.find(s => s.name === hoveredSegment)?.value.toFixed(1)}%
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginTop: '2px'
              }}>
                {formatCurrency(segments.find(s => s.name === hoveredSegment)?.amount || 0)}
              </div>
            </>
          ) : (
            <>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginBottom: '4px'
              }}>
                Total Value
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: colors.utility.primaryText
              }}>
                {formatCurrency(totalValue)}
              </div>
              {/* ✅ DEBUG: Show if percentages don't add up (remove in production) */}
              {showPercentageWarning && (
                <div style={{
                  fontSize: '9px',
                  color: colors.semantic.warning,
                  marginTop: '2px'
                }}>
                  {totalPercentage.toFixed(1)}%
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Legend */}
      {showLegend && (
        <div style={{
          marginTop: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px'
        }}>
          {segments.map(segment => (
            <div
              key={segment.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px',
                borderRadius: '4px',
                cursor: interactive ? 'pointer' : 'default',
                backgroundColor: hoveredSegment === segment.name ? colors.utility.primaryText + '10' : 'transparent',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={() => interactive && setHoveredSegment(segment.name)}
              onMouseLeave={() => interactive && setHoveredSegment(null)}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: segment.color,
                flexShrink: 0
              }} />
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {segment.name}
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {segment.value.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioDonutChart;