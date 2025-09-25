// src/components/visualizations/PortfolioDonutChart.tsx

import React, { useMemo } from 'react';
import { AssetAllocation } from '../../types/portfolio.types';
import { useTheme } from '../../contexts/ThemeContext';

interface PortfolioDonutChartProps {
  allocation: AssetAllocation;
  size?: number;
  strokeWidth?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  interactive?: boolean;
}

const PortfolioDonutChart: React.FC<PortfolioDonutChartProps> = ({
  allocation,
  size = 180,
  strokeWidth = 30,
  showLabels = true,
  showLegend = true,
  interactive = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [hoveredSegment, setHoveredSegment] = React.useState<string | null>(null);

  // Asset type colors
  const assetColors = {
    equity: '#3B82F6',
    debt: '#F59E0B',
    hybrid: '#8B5CF6',
    liquid: '#10B981'
  };

  // Calculate segments
  const segments = useMemo(() => {
    const data = [
      { name: 'Equity', value: allocation.equity.percentage, amount: allocation.equity.value, color: assetColors.equity },
      { name: 'Debt', value: allocation.debt.percentage, amount: allocation.debt.value, color: assetColors.debt },
      { name: 'Hybrid', value: allocation.hybrid.percentage, amount: allocation.hybrid.value, color: assetColors.hybrid },
      { name: 'Liquid', value: allocation.liquid.percentage, amount: allocation.liquid.value, color: assetColors.liquid }
    ].filter(item => item.value > 0);

    let cumulativePercentage = 0;
    return data.map(item => {
      const startAngle = (cumulativePercentage * 360) / 100;
      cumulativePercentage += item.value;
      const endAngle = (cumulativePercentage * 360) / 100;
      return { ...item, startAngle, endAngle };
    });
  }, [allocation]);

  // Calculate path for each segment
  const createPath = (startAngle: number, endAngle: number, isHovered: boolean = false) => {
    const radius = (size - strokeWidth) / 2;
    const centerX = size / 2;
    const centerY = size / 2;
    const hoverScale = isHovered ? 1.05 : 1;
    const actualRadius = radius * hoverScale;
    
    const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
    const endAngleRad = ((endAngle - 90) * Math.PI) / 180;
    
    const x1 = centerX + actualRadius * Math.cos(startAngleRad);
    const y1 = centerY + actualRadius * Math.sin(startAngleRad);
    const x2 = centerX + actualRadius * Math.cos(endAngleRad);
    const y2 = centerY + actualRadius * Math.sin(endAngleRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${actualRadius} ${actualRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Calculate total value
  const totalValue = allocation.equity.value + allocation.debt.value + 
                     allocation.hybrid.value + allocation.liquid.value;

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
                {segments.find(s => s.name === hoveredSegment)?.value}%
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
                flex: 1
              }}>
                {segment.name}
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {segment.value}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioDonutChart;