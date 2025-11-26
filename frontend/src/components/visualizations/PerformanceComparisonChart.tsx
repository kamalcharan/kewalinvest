// frontend/src/components/visualizations/PerformanceComparisonChart.tsx
// Recharts-based performance chart with index comparison support
// Designed to be asset-agnostic (works for MF, Stocks, Gold, RE, FD)

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceDataPoint {
  date: string;
  value: number;
  invested?: number;
  returns?: number;
  returnPercentage?: number;
  momChangePercentage?: number | null;
}

export interface ComparisonDataPoint {
  date: string;
  value: number;
}

export interface PerformanceComparisonChartProps {
  // Primary data (portfolio/asset performance)
  data: PerformanceDataPoint[];

  // Comparison data (index/benchmark)
  comparisonData?: ComparisonDataPoint[];
  comparisonName?: string;
  showComparison?: boolean;

  // Display options
  viewMode?: 'absolute' | 'percentage';  // absolute = ₹ values, percentage = % from start
  height?: number;

  // Labels
  primaryLabel?: string;

  // Colors (optional - uses theme by default)
  primaryColor?: string;
  comparisonColor?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize data to percentage change from starting point
 * First point becomes 0%, subsequent points show % change from start
 */
function normalizeToPercentage(data: { date: string; value: number }[]): { date: string; value: number }[] {
  if (!data || data.length === 0) return [];

  const startValue = data[0].value;
  if (startValue === 0) return data.map(d => ({ date: d.date, value: 0 }));

  return data.map(d => ({
    date: d.date,
    value: ((d.value - startValue) / startValue) * 100
  }));
}

/**
 * Match comparison data to primary data dates
 * Uses closest date on or before each primary date
 */
function matchDates(
  primaryData: { date: string; value: number }[],
  comparisonData: { date: string; value: number }[]
): { date: string; value: number }[] {
  if (!comparisonData || comparisonData.length === 0) return [];

  // Create a map for quick lookup
  const comparisonMap = new Map<string, number>();
  comparisonData.forEach(d => {
    comparisonMap.set(d.date.substring(0, 10), d.value); // Normalize date format
  });

  // Sort comparison dates for finding closest
  const sortedComparisonDates = comparisonData
    .map(d => new Date(d.date))
    .sort((a, b) => a.getTime() - b.getTime());

  return primaryData.map(primary => {
    const primaryDate = primary.date.substring(0, 10);

    // Try exact match first
    if (comparisonMap.has(primaryDate)) {
      return { date: primary.date, value: comparisonMap.get(primaryDate)! };
    }

    // Find closest date on or before
    const primaryDateTime = new Date(primary.date).getTime();
    let closestValue = comparisonData[0].value;

    for (const compDate of sortedComparisonDates) {
      if (compDate.getTime() <= primaryDateTime) {
        const dateKey = compDate.toISOString().substring(0, 10);
        closestValue = comparisonMap.get(dateKey) || closestValue;
      } else {
        break;
      }
    }

    return { date: primary.date, value: closestValue };
  });
}

/**
 * Format value for display
 */
function formatValue(value: number, isPercentage: boolean): string {
  if (isPercentage) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  // Format as currency (Indian format)
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)}L`;
  }
  return `₹${value.toLocaleString('en-IN')}`;
}

/**
 * Format date for X-axis
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  colors: any;
  isPercentage: boolean;
  primaryLabel: string;
  comparisonName?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  colors,
  isPercentage,
  primaryLabel,
  comparisonName
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const date = new Date(label || '');
  const formattedDate = date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}20`,
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '180px'
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          marginBottom: '8px',
          fontWeight: '500'
        }}
      >
        {formattedDate}
      </div>

      {payload.map((entry: any, index: number) => (
        <div
          key={index}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: index < payload.length - 1 ? '6px' : 0
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: colors.utility.primaryText
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: entry.color
              }}
            />
            {entry.name}
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: isPercentage
                ? entry.value >= 0 ? '#10B981' : '#EF4444'
                : colors.utility.primaryText
            }}
          >
            {formatValue(entry.value, isPercentage)}
          </span>
        </div>
      ))}

      {/* Show difference if comparison exists */}
      {payload.length === 2 && (
        <>
          <div
            style={{
              height: '1px',
              backgroundColor: colors.utility.primaryText + '15',
              margin: '8px 0'
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px'
            }}
          >
            <span style={{ color: colors.utility.secondaryText }}>
              Difference
            </span>
            <span
              style={{
                fontWeight: '600',
                color: payload[0].value >= payload[1].value ? '#10B981' : '#EF4444'
              }}
            >
              {formatValue(payload[0].value - payload[1].value, isPercentage)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PerformanceComparisonChart: React.FC<PerformanceComparisonChartProps> = ({
  data,
  comparisonData,
  comparisonName = 'Index',
  showComparison = true,
  viewMode = 'percentage',
  height = 400,
  primaryLabel = 'Portfolio',
  primaryColor,
  comparisonColor
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Use theme colors if not provided
  const portfolioColor = primaryColor || colors.brand.primary;
  const indexColor = comparisonColor || '#FCD34D'; // Yellow/gold for index

  const isPercentage = viewMode === 'percentage';

  // Process chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Prepare primary data
    const primaryData = data.map(d => ({
      date: d.date,
      value: d.value
    }));

    // Normalize if percentage view
    const normalizedPrimary = isPercentage
      ? normalizeToPercentage(primaryData)
      : primaryData;

    // Process comparison data if available
    let normalizedComparison: { date: string; value: number }[] = [];
    if (showComparison && comparisonData && comparisonData.length > 0) {
      // Match comparison dates to primary dates
      const matchedComparison = matchDates(primaryData, comparisonData);

      // Normalize if percentage view
      normalizedComparison = isPercentage
        ? normalizeToPercentage(matchedComparison)
        : matchedComparison;
    }

    // Combine into chart data format
    return normalizedPrimary.map((primary, index) => ({
      date: primary.date,
      portfolio: primary.value,
      ...(normalizedComparison.length > index && {
        comparison: normalizedComparison[index].value
      })
    }));
  }, [data, comparisonData, showComparison, isPercentage]);

  // Calculate Y-axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];

    const allValues = chartData.flatMap(d => [
      d.portfolio,
      d.comparison
    ]).filter(v => v !== undefined) as number[];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;

    return [
      Math.floor(min - padding),
      Math.ceil(max + padding)
    ];
  }, [chartData]);

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '12px',
          color: colors.utility.secondaryText
        }}
      >
        <span style={{ fontSize: '48px', opacity: 0.5 }}>📊</span>
        <span>No performance data available</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={colors.utility.primaryText}
            strokeOpacity={0.1}
          />

          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke={colors.utility.secondaryText}
            fontSize={11}
            tickMargin={10}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={yDomain}
            tickFormatter={(value) => formatValue(value, isPercentage)}
            stroke={colors.utility.secondaryText}
            fontSize={11}
            tickMargin={10}
            width={70}
          />

          {/* Zero reference line for percentage view */}
          {isPercentage && (
            <ReferenceLine
              y={0}
              stroke={colors.utility.secondaryText}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          )}

          <Tooltip
            content={
              <CustomTooltip
                colors={colors}
                isPercentage={isPercentage}
                primaryLabel={primaryLabel}
                comparisonName={comparisonName}
              />
            }
          />

          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '13px'
            }}
          />

          {/* Portfolio/Asset Line */}
          <Line
            type="monotone"
            dataKey="portfolio"
            name={primaryLabel}
            stroke={portfolioColor}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 6,
              fill: portfolioColor,
              stroke: colors.utility.secondaryBackground,
              strokeWidth: 2
            }}
          />

          {/* Comparison/Index Line */}
          {showComparison && comparisonData && comparisonData.length > 0 && (
            <Line
              type="monotone"
              dataKey="comparison"
              name={comparisonName}
              stroke={indexColor}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{
                r: 5,
                fill: indexColor,
                stroke: colors.utility.secondaryBackground,
                strokeWidth: 2
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceComparisonChart;
