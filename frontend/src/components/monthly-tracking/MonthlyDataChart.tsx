// frontend/src/components/monthly-tracking/MonthlyDataChart.tsx
// Reusable line chart component for monthly tracking data

import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface DataPoint {
  month_display: string; // "Jan 2025"
  value: number;
  label?: string; // Optional label for tooltip
}

interface MonthlyDataChartProps {
  data: DataPoint[];
  title: string;
  valueFormatter?: (value: number) => string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export const MonthlyDataChart: React.FC<MonthlyDataChartProps> = ({
  data,
  title,
  valueFormatter = (value) => value.toFixed(2),
  color,
  height = 300,
  showGrid = true,
  showTooltip = true,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Chart dimensions
  const padding = { top: 40, right: 20, bottom: 60, left: 60 };
  const width = 800;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Default color
  const lineColor = color || colors.primary.main;

  // Calculate min/max values
  const { minValue, maxValue } = useMemo(() => {
    if (data.length === 0) {
      return { minValue: 0, maxValue: 100 };
    }
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 10;
    return {
      minValue: min - padding,
      maxValue: max + padding
    };
  }, [data]);

  // Generate path for line
  const linePath = useMemo(() => {
    if (data.length === 0) return '';

    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const y =
        padding.top +
        chartHeight -
        ((d.value - minValue) / (maxValue - minValue)) * chartHeight;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    return points.join(' ');
  }, [data, chartWidth, chartHeight, minValue, maxValue, padding]);

  // Generate area path
  const areaPath = useMemo(() => {
    if (data.length === 0) return '';

    const linePoints = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const y =
        padding.top +
        chartHeight -
        ((d.value - minValue) / (maxValue - minValue)) * chartHeight;
      return `${x},${y}`;
    });

    const bottomLeft = `${padding.left},${padding.top + chartHeight}`;
    const bottomRight = `${padding.left + chartWidth},${padding.top + chartHeight}`;

    return `M ${linePoints.join(' L ')} L ${bottomRight} L ${bottomLeft} Z`;
  }, [data, chartWidth, chartHeight, minValue, maxValue, padding]);

  // Generate Y-axis labels
  const yAxisLabels = useMemo(() => {
    const labelCount = 5;
    return Array.from({ length: labelCount }, (_, i) => {
      const value = maxValue - (i / (labelCount - 1)) * (maxValue - minValue);
      const y = padding.top + (i / (labelCount - 1)) * chartHeight;
      return { value, y };
    });
  }, [minValue, maxValue, chartHeight, padding]);

  // State for tooltip
  const [tooltipData, setTooltipData] = React.useState<{
    x: number;
    y: number;
    data: DataPoint;
  } | null>(null);

  // Handle mouse move over chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!showTooltip || data.length === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find closest data point
    const relativeX = mouseX - padding.left;
    const index = Math.round((relativeX / chartWidth) * (data.length - 1));

    if (index >= 0 && index < data.length) {
      const dataPoint = data[index];
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y =
        padding.top +
        chartHeight -
        ((dataPoint.value - minValue) / (maxValue - minValue)) * chartHeight;

      setTooltipData({ x, y, data: dataPoint });
    }
  };

  const handleMouseLeave = () => {
    setTooltipData(null);
  };

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: colors.utility.secondaryText,
          backgroundColor: isDarkMode
            ? colors.backgrounds.elevated
            : colors.backgrounds.surface,
          borderRadius: '8px',
          border: `1px solid ${colors.utility.secondaryText}20`,
        }}
      >
        No data available for the selected period
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: isDarkMode
          ? colors.backgrounds.elevated
          : colors.backgrounds.surface,
        borderRadius: '8px',
        padding: '20px',
        border: `1px solid ${colors.utility.secondaryText}20`,
      }}
    >
      <h3
        style={{
          margin: '0 0 20px 0',
          fontSize: '16px',
          fontWeight: 600,
          color: colors.text.primary,
        }}
      >
        {title}
      </h3>

      <svg
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Grid lines */}
        {showGrid &&
          yAxisLabels.map((label, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={label.y}
              x2={padding.left + chartWidth}
              y2={label.y}
              stroke={`${colors.utility.secondaryText}20`}
              strokeWidth={1}
            />
          ))}

        {/* Y-axis labels */}
        {yAxisLabels.map((label, i) => (
          <text
            key={i}
            x={padding.left - 10}
            y={label.y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={12}
            fill={colors.utility.secondaryText}
          >
            {valueFormatter(label.value)}
          </text>
        ))}

        {/* Area fill */}
        <path
          d={areaPath}
          fill={`${lineColor}15`}
          stroke="none"
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = padding.left + (i / (data.length - 1)) * chartWidth;
          const y =
            padding.top +
            chartHeight -
            ((d.value - minValue) / (maxValue - minValue)) * chartHeight;

          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill={lineColor}
              stroke={colors.backgrounds.surface}
              strokeWidth={2}
            />
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = padding.left + (i / (data.length - 1)) * chartWidth;
          const showLabel = i % Math.ceil(data.length / 6) === 0 || i === data.length - 1;

          if (!showLabel) return null;

          return (
            <text
              key={i}
              x={x}
              y={padding.top + chartHeight + 20}
              textAnchor="middle"
              fontSize={12}
              fill={colors.utility.secondaryText}
            >
              {d.month_display}
            </text>
          );
        })}

        {/* Tooltip */}
        {tooltipData && (
          <g>
            {/* Tooltip line */}
            <line
              x1={tooltipData.x}
              y1={padding.top}
              x2={tooltipData.x}
              y2={padding.top + chartHeight}
              stroke={lineColor}
              strokeWidth={1}
              strokeDasharray="4,4"
            />

            {/* Tooltip box */}
            <rect
              x={tooltipData.x - 70}
              y={tooltipData.y - 50}
              width={140}
              height={40}
              fill={isDarkMode ? colors.backgrounds.surface : '#fff'}
              stroke={colors.utility.secondaryText}
              strokeWidth={1}
              rx={4}
            />

            {/* Tooltip text */}
            <text
              x={tooltipData.x}
              y={tooltipData.y - 32}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill={colors.text.primary}
            >
              {tooltipData.data.month_display}
            </text>
            <text
              x={tooltipData.x}
              y={tooltipData.y - 18}
              textAnchor="middle"
              fontSize={14}
              fontWeight={700}
              fill={lineColor}
            >
              {valueFormatter(tooltipData.data.value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
