// src/components/visualizations/PerformanceSparkline.tsx

import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getMoMColor, getMoMArrow } from '../../utils/dataTransformers';
import { PortfolioPerformanceMetric } from '../../types/portfolio.types';
import { IndexComparisonOverlay } from '../performance/IndexComparisonOverlay';

interface PerformanceSparklineProps {
  performanceData?: PortfolioPerformanceMetric[];  // Raw performance data with dates
  data: number[];                                   // Array of values
  width?: number;
  height?: number;
  showArea?: boolean;
  showDots?: boolean;
  showBaseline?: boolean;
  color?: string;
  gradientColor?: string;
  interactive?: boolean;
  showTooltip?: boolean;
  timeframe?: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  showTimelineMarkers?: boolean;
  timelineMarkerSize?: number;
  // Comparison props
comparisonData?: Array<{date: string, value: number}>; 
  comparisonIndexName?: string;                    // Name of comparison index
  showComparison?: boolean;                        // Enable/disable comparison overlay
}

const PerformanceSparkline: React.FC<PerformanceSparklineProps> = ({
  performanceData,
  data,
  width = 120,
  height = 40,
  showArea = true,
  showDots = false,
  showBaseline = true,
  color,
  gradientColor,
  interactive = true,
  showTooltip = true,
  timeframe = 'ALL',
  showTimelineMarkers = true,
  timelineMarkerSize = 5,
  comparisonData,
  comparisonIndexName,
  showComparison = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });

  // ============================================
  // TIMELINE LOGIC
  // ============================================
  const filterPerformanceByTimeframe = (
    performanceData: PortfolioPerformanceMetric[],
    timeframe: '1M' | '3M' | '6M' | '1Y' | 'ALL'
  ): PortfolioPerformanceMetric[] => {
    if (!performanceData || performanceData.length === 0) return [];
    
    const now = new Date();
    let cutoffDate: Date;

    switch (timeframe) {
      case '1M':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3M':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6M':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1Y':
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'ALL':
        return performanceData;
      default:
        return performanceData;
    }

    return performanceData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });
  };

  // Get timeline marker indices
  const getTimelineMarkers = useMemo(() => {
    if (!performanceData || !showTimelineMarkers) return [];

    const filteredData = filterPerformanceByTimeframe(performanceData, timeframe);
    if (filteredData.length === 0) return [];

    const monthlyIndices: number[] = [];
    let lastMonth = -1;

    filteredData.forEach((item) => {
      const date = new Date(item.date);
      const month = date.getMonth();
      
      if (month !== lastMonth) {
        monthlyIndices.push(performanceData.indexOf(item));
        lastMonth = month;
      }
    });

    // Always include the last point
    if (filteredData.length > 0) {
      const lastIndex = performanceData.indexOf(filteredData[filteredData.length - 1]);
      if (!monthlyIndices.includes(lastIndex)) {
        monthlyIndices.push(lastIndex);
      }
    }

    return monthlyIndices;
  }, [performanceData, timeframe, showTimelineMarkers]);

  // ============================================
  // CHART RENDERING LOGIC
  // ============================================
  const isPositive = useMemo(() => {
    if (data.length < 2) return true;
    return data[data.length - 1] >= data[0];
  }, [data]);

  const lineColor = color || (isPositive ? '#10B981' : '#EF4444');
  const areaGradientColor = gradientColor || lineColor;

  const points = useMemo(() => {
    if (!data || data.length === 0) return [];

    const min = Math.min(...data);
    const max = Math.max(...data);
    const rawRange = max - min;

    // FIX: If range is too small (flat line), use 5% of average value as minimum range
    // This prevents the graph from appearing as a straight line when values don't vary much
    const avgValue = data.reduce((sum, val) => sum + val, 0) / data.length;
    const minRange = avgValue * 0.05; // 5% of average
    const range = Math.max(rawRange, minRange) || 1;

    const padding = 2;

    return data.map((value, index) => ({
      x: (index / (Math.max(data.length - 1, 1))) * (width - padding * 2) + padding,
      y: height - ((value - min) / range * (height - padding * 2) + padding),
      value,
      index,
      percentage: ((value - data[0]) / data[0] * 100).toFixed(1)
    }));
  }, [data, width, height]);

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0 || !showArea) return '';
    const baseline = showBaseline && data[0] ? 
      height - ((data[0] - Math.min(...data)) / (Math.max(...data) - Math.min(...data) || 1) * (height - 4) + 2) :
      height;
    
    return `${linePath} L ${points[points.length - 1].x},${baseline} L ${points[0].x},${baseline} Z`;
  }, [points, linePath, showArea, showBaseline, data, height]);

  const baselineY = useMemo(() => {
    if (!showBaseline || !data[0] || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return height - ((data[0] - min) / range * (height - 4) + 2);
  }, [data, height, showBaseline]);

  const handleMouseMove = (e: React.MouseEvent<SVGElement>) => {
    if (!interactive) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
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

  const formatValue = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

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

        {/* Dots - with timeline marker logic */}
        {(showDots || hoveredIndex !== null) && points.map((point, index) => {
          const isTimelineMarker = getTimelineMarkers.includes(index);
          const dotRadius = hoveredIndex === index 
            ? 5 
            : (isTimelineMarker ? timelineMarkerSize : (showDots ? 2 : 0));
          
          let dotColor = lineColor;
          if (isTimelineMarker && performanceData && performanceData[index]) {
            const momChange = performanceData[index].mom_change_percentage;
            if (momChange !== null && momChange !== undefined) {
              dotColor = momChange >= 0 ? '#10B981' : '#EF4444';
            }
          }
          
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={dotRadius}
              fill={dotColor}
              stroke="white"
              strokeWidth={hoveredIndex === index ? 2 : (isTimelineMarker ? 1.5 : 0)}
              style={{
                transition: 'all 0.2s ease',
                opacity: hoveredIndex === index 
                  ? 1 
                  : (isTimelineMarker ? 1 : (showDots ? 0.7 : 0)),
                filter: isTimelineMarker ? 'drop-shadow(0 0 2px rgba(0,0,0,0.1))' : 'none'
              }}
            />
          );
        })}

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

      {/* Index Comparison Overlay - WITH DATE MATCHING */}
      {showComparison && comparisonData && comparisonData.length > 0 && performanceData && (
        <IndexComparisonOverlay
          portfolioData={performanceData.map(p => ({ date: p.date, value: p.current_value }))}
  indexData={comparisonData}  // ✅ Just pass it through!
          width={width}
          height={height}
          indexName={comparisonIndexName || 'Index'}
          showLabel={true}
          useDateMatching={true}
        />
      )}

      {/* Tooltip */}
      {showTooltip && interactive && hoveredIndex !== null && points[hoveredIndex] && performanceData && performanceData[hoveredIndex] && (
        <div
          style={{
            position: 'fixed',
            left: mousePosition.x + 10,
            top: mousePosition.y - 60,
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            pointerEvents: 'none',
            fontSize: '11px',
            minWidth: '160px'
          }}
        >
          {/* Date */}
          <div style={{
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            fontSize: '10px',
            fontWeight: '500'
          }}>
            {performanceData[hoveredIndex].date 
              ? new Date(performanceData[hoveredIndex].date).toLocaleDateString('en-IN', { 
                  month: 'short', 
                  year: 'numeric' 
                })
              : getMonthName(hoveredIndex)
            }
          </div>
          
          {/* Portfolio Value */}
          <div style={{
            color: colors.utility.primaryText,
            fontWeight: '700',
            fontSize: '14px',
            marginBottom: '6px'
          }}>
            {formatValue(points[hoveredIndex].value)}
          </div>
          
          {/* Total Returns */}
          {hoveredIndex > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
              paddingBottom: '6px'
            }}>
              <span style={{ 
                color: colors.utility.secondaryText, 
                fontSize: '10px' 
              }}>
                Total Return:
              </span>
              <span style={{
                color: points[hoveredIndex].value >= data[0] ? '#10B981' : '#EF4444',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                {points[hoveredIndex].value >= data[0] ? '+' : ''}
                {points[hoveredIndex].percentage}%
              </span>
            </div>
          )}
          
          {/* Month-over-Month Change */}
          {hoveredIndex > 0 && 
           performanceData[hoveredIndex].mom_change_percentage !== null && 
           performanceData[hoveredIndex].mom_change_percentage !== undefined && (
            <>
              <div style={{
                height: '1px',
                backgroundColor: colors.utility.primaryText + '15',
                margin: '6px 0'
              }} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: getMoMColor(performanceData[hoveredIndex].mom_change_percentage!) + '10',
                padding: '4px 8px',
                borderRadius: '4px',
                marginTop: '4px'
              }}>
                <span style={{ 
                  color: colors.utility.secondaryText, 
                  fontSize: '10px',
                  fontWeight: '500'
                }}>
                  vs Prev Month:
                </span>
                <span style={{
                  color: getMoMColor(performanceData[hoveredIndex].mom_change_percentage!),
                  fontSize: '12px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{getMoMArrow(performanceData[hoveredIndex].mom_change_percentage!)}</span>
                  <span>{Math.abs(performanceData[hoveredIndex].mom_change_percentage!).toFixed(2)}%</span>
                </span>
              </div>
              
              {/* Absolute Change Amount */}
              {performanceData[hoveredIndex].mom_change_absolute !== null && 
               performanceData[hoveredIndex].mom_change_absolute !== undefined && (
                <div style={{
                  fontSize: '9px',
                  color: colors.utility.secondaryText,
                  textAlign: 'right',
                  marginTop: '2px',
                  fontStyle: 'italic'
                }}>
                  {performanceData[hoveredIndex].mom_change_absolute! >= 0 ? '+' : ''}
                  {formatValue(Math.abs(performanceData[hoveredIndex].mom_change_absolute!))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceSparkline;