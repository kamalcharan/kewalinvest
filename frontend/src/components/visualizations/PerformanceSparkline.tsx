// src/components/visualizations/PerformanceSparkline.tsx

import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface PerformanceSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  showArea?: boolean;
  showDots?: boolean;
  showBaseline?: boolean;
  color?: string;
  gradientColor?: string;
  interactive?: boolean;
  showTooltip?: boolean;
}

const PerformanceSparkline: React.FC<PerformanceSparklineProps> = ({
  data,
  width = 120,
  height = 40,
  showArea = true,
  showDots = false,
  showBaseline = true,
  color,
  gradientColor,
  interactive = true,
  showTooltip = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });

  // Calculate if overall trend is positive
  const isPositive = useMemo(() => {
    if (data.length < 2) return true;
    return data[data.length - 1] >= data[0];
  }, [data]);

  // Determine line color
  const lineColor = color || (isPositive ? '#10B981' : '#EF4444');
  const areaGradientColor = gradientColor || lineColor;

  // Calculate points
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    
    return data.map((value, index) => ({
      x: (index / (Math.max(data.length - 1, 1))) * (width - padding * 2) + padding,
      y: height - ((value - min) / range * (height - padding * 2) + padding),
      value,
      index,
      percentage: ((value - data[0]) / data[0] * 100).toFixed(1)
    }));
  }, [data, width, height]);

  // Create SVG path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  }, [points]);

  // Create area path
  const areaPath = useMemo(() => {
    if (points.length === 0 || !showArea) return '';
    const baseline = showBaseline && data[0] ? 
      height - ((data[0] - Math.min(...data)) / (Math.max(...data) - Math.min(...data) || 1) * (height - 4) + 2) :
      height;
    
    return `${linePath} L ${points[points.length - 1].x},${baseline} L ${points[0].x},${baseline} Z`;
  }, [points, linePath, showArea, showBaseline, data, height]);

  // Calculate baseline Y position
  const baselineY = useMemo(() => {
    if (!showBaseline || !data[0] || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return height - ((data[0] - min) / range * (height - 4) + 2);
  }, [data, height, showBaseline]);

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (!interactive) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find nearest point
    let nearestIndex = 0;
    let minDistance = Infinity;
    
    points.forEach((point, index) => {
      const distance = Math.abs(point.x - x);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });
    
    if (minDistance < 10) {
      setHoveredIndex(nearestIndex);
      setMousePosition({ x: e.clientX, y: e.clientY });
    } else {
      setHoveredIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Format value for tooltip
  const formatValue = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Month names for tooltip
  const getMonthName = (index: number): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const monthIndex = (currentMonth - (data.length - 1 - index) + 12) % 12;
    return months[monthIndex];
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg
        width={width}
        height={height}
        style={{ display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`sparkline-gradient-${data.join('')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={areaGradientColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={areaGradientColor} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        {showBaseline && baselineY !== null && (
          <line
            x1={0}
            y1={baselineY}
            x2={width}
            y2={baselineY}
            stroke={colors.utility.secondaryText}
            strokeWidth="1"
            strokeDasharray="2,2"
            opacity="0.3"
          />
        )}

        {/* Area under line */}
        {showArea && areaPath && (
          <path
            d={areaPath}
            fill={`url(#sparkline-gradient-${data.join('')})`}
            style={{ transition: 'all 0.3s ease' }}
          />
        )}

        {/* Main line */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ 
            transition: 'all 0.3s ease',
            filter: hoveredIndex !== null ? 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' : 'none'
          }}
        />

        {/* Dots */}
        {(showDots || hoveredIndex !== null) && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={hoveredIndex === index ? 4 : (showDots ? 2 : 0)}
            fill={lineColor}
            stroke="white"
            strokeWidth={hoveredIndex === index ? 2 : 0}
            style={{
              transition: 'all 0.2s ease',
              opacity: hoveredIndex === index ? 1 : (showDots ? 0.7 : 0)
            }}
          />
        ))}

        {/* Interactive overlay */}
        {interactive && (
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="transparent"
            style={{ cursor: 'crosshair' }}
          />
        )}
      </svg>

      {/* Tooltip */}
      {showTooltip && interactive && hoveredIndex !== null && points[hoveredIndex] && (
        <div
          style={{
            position: 'fixed',
            left: mousePosition.x + 10,
            top: mousePosition.y - 40,
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '6px',
            padding: '6px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 9999,
            pointerEvents: 'none',
            fontSize: '11px'
          }}
        >
          <div style={{
            color: colors.utility.secondaryText,
            marginBottom: '2px'
          }}>
            {getMonthName(hoveredIndex)}
          </div>
          <div style={{
            color: colors.utility.primaryText,
            fontWeight: '600'
          }}>
            {formatValue(points[hoveredIndex].value)}
          </div>
          {hoveredIndex > 0 && (
            <div style={{
              color: points[hoveredIndex].value >= data[0] ? '#10B981' : '#EF4444',
              fontSize: '10px',
              marginTop: '2px'
            }}>
              {points[hoveredIndex].value >= data[0] ? '+' : ''}{points[hoveredIndex].percentage}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceSparkline;