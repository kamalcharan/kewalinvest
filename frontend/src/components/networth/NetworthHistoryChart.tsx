// frontend/src/components/networth/NetworthHistoryChart.tsx
// Timeline chart showing networth history with asset type breakdown
// Cycle 3 - Frontend Basic Display

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import {
  NetworthHistoryResponse,
  NetworthViewMode,
  getAssetTypeColor
} from '../../types/networth.types';
import { NetworthService } from '../../services/networth.service';

interface NetworthHistoryChartProps {
  data: NetworthHistoryResponse;
  height?: number;
  showInvested?: boolean;
  showLegend?: boolean;
}

const NetworthHistoryChart: React.FC<NetworthHistoryChartProps> = ({
  data,
  height = 300,
  showInvested = true,
  showLegend = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const [viewMode, setViewMode] = useState<NetworthViewMode>('combined');

  // Extract chart data
  const chartReady = data?.chart_ready;
  const hasAssetTypeData = chartReady?.by_asset_type && chartReady.by_asset_type.length > 0;

  // Transform data for Recharts
  const chartData = useMemo(() => {
    if (!chartReady) return [];

    return chartReady.dates.map((date, index) => {
      const dataPoint: Record<string, any> = {
        date: NetworthService.formatMonthYear(date),
        fullDate: date,
        networth: chartReady.networth_values[index] || 0,
        invested: chartReady.invested_values[index] || 0
      };

      // Add asset type values for stacked view
      if (chartReady.by_asset_type) {
        chartReady.by_asset_type.forEach(assetType => {
          dataPoint[assetType.asset_type_code] = assetType.values[index] || 0;
        });
      }

      return dataPoint;
    });
  }, [chartReady]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}20`,
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          {label}
        </div>

        {payload.map((entry: any, index: number) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              fontSize: '12px',
              padding: '4px 0'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: entry.color
              }} />
              <span style={{ color: colors.utility.secondaryText }}>
                {entry.name}
              </span>
            </div>
            <span style={{
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              {NetworthService.formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Growth metrics display
  const GrowthMetrics = () => (
    <div style={{
      display: 'flex',
      gap: '24px',
      marginBottom: '16px'
    }}>
      <div>
        <div style={{
          fontSize: '11px',
          color: colors.utility.secondaryText,
          textTransform: 'uppercase',
          marginBottom: '4px'
        }}>
          Starting Value
        </div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: colors.utility.primaryText
        }}>
          {NetworthService.formatCurrency(data.starting_networth)}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: '11px',
          color: colors.utility.secondaryText,
          textTransform: 'uppercase',
          marginBottom: '4px'
        }}>
          Current Value
        </div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: colors.utility.primaryText
        }}>
          {NetworthService.formatCurrency(data.ending_networth)}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: '11px',
          color: colors.utility.secondaryText,
          textTransform: 'uppercase',
          marginBottom: '4px'
        }}>
          Growth
        </div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: NetworthService.getReturnColor(data.percentage_growth)
        }}>
          {NetworthService.formatPercentage(data.percentage_growth)}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: '11px',
          color: colors.utility.secondaryText,
          textTransform: 'uppercase',
          marginBottom: '4px'
        }}>
          Absolute Change
        </div>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: NetworthService.getReturnColor(data.absolute_growth)
        }}>
          {NetworthService.formatCurrency(data.absolute_growth)}
        </div>
      </div>
    </div>
  );

  // View mode toggle
  const ViewModeToggle = () => (
    <div style={{
      display: 'flex',
      gap: '4px',
      padding: '4px',
      backgroundColor: colors.utility.primaryBackground,
      borderRadius: '8px',
      marginBottom: '16px'
    }}>
      <button
        onClick={() => setViewMode('combined')}
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: '500',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          backgroundColor: viewMode === 'combined' ? colors.brand.primary : 'transparent',
          color: viewMode === 'combined' ? '#ffffff' : colors.utility.secondaryText,
          transition: 'all 0.2s ease'
        }}
      >
        Combined
      </button>
      {hasAssetTypeData && (
        <button
          onClick={() => setViewMode('by_asset_type')}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: '500',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: viewMode === 'by_asset_type' ? colors.brand.primary : 'transparent',
            color: viewMode === 'by_asset_type' ? '#ffffff' : colors.utility.secondaryText,
            transition: 'all 0.2s ease'
          }}
        >
          By Asset Type
        </button>
      )}
    </div>
  );

  if (!chartData || chartData.length === 0) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        color: colors.utility.secondaryText
      }}>
        No history data available
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '4px'
          }}>
            Networth History
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            {data.data_points} data points from {NetworthService.formatDate(data.start_date)} to {NetworthService.formatDate(data.end_date)}
          </div>
        </div>

        <ViewModeToggle />
      </div>

      {/* Growth Metrics */}
      <GrowthMetrics />

      {/* Chart */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          {viewMode === 'combined' ? (
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.utility.primaryText + '15'}
              />
              <XAxis
                dataKey="date"
                stroke={colors.utility.secondaryText}
                style={{ fontSize: '11px' }}
                tickLine={false}
                axisLine={{ stroke: colors.utility.primaryText + '20' }}
              />
              <YAxis
                stroke={colors.utility.secondaryText}
                style={{ fontSize: '11px' }}
                tickFormatter={(value) => NetworthService.formatLargeCurrency(value)}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && (
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                  iconSize={8}
                />
              )}
              <Line
                type="monotone"
                dataKey="networth"
                name="Total Networth"
                stroke={colors.brand.primary}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, fill: colors.brand.primary }}
              />
              {showInvested && (
                <Line
                  type="monotone"
                  dataKey="invested"
                  name="Total Invested"
                  stroke={colors.utility.secondaryText}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: colors.utility.secondaryText }}
                />
              )}
            </LineChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={colors.utility.primaryText + '15'}
              />
              <XAxis
                dataKey="date"
                stroke={colors.utility.secondaryText}
                style={{ fontSize: '11px' }}
                tickLine={false}
                axisLine={{ stroke: colors.utility.primaryText + '20' }}
              />
              <YAxis
                stroke={colors.utility.secondaryText}
                style={{ fontSize: '11px' }}
                tickFormatter={(value) => NetworthService.formatLargeCurrency(value)}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && (
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                  iconSize={8}
                />
              )}
              {chartReady?.by_asset_type?.map((assetType, index) => (
                <Area
                  key={assetType.asset_type_code}
                  type="monotone"
                  dataKey={assetType.asset_type_code}
                  name={assetType.asset_type_name}
                  stackId="1"
                  stroke={getAssetTypeColor(assetType.asset_type_code)}
                  fill={getAssetTypeColor(assetType.asset_type_code)}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NetworthHistoryChart;
