// frontend/src/components/portfolio/SchemeChartsModal.tsx
// Modal displaying 4 charts for a scheme: Units, NAV, Market Value, Performance

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { X } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';

interface SchemeChartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheme: {
    scheme_code: string;
    scheme_name: string;
    category: string;
    sub_category: string;
    monthly_data: Array<{
      month: string;
      month_display: string;
      closing_units: number;
      opening_nav: number;
      closing_nav: number;
      has_nav_data: boolean;
      market_value: number;
      month_change_percentage: number;
    }>;
  } | null;
}

export const SchemeChartsModal: React.FC<SchemeChartsModalProps> = ({
  isOpen,
  onClose,
  scheme
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  if (!isOpen || !scheme) return null;

  // Prepare chart data (reverse to show oldest to newest for charts)
  const chartData = [...scheme.monthly_data].reverse().map((month) => ({
    month: month.month_display?.split(' ')[0] || month.month, // "Nov" from "Nov 2024"
    fullMonth: month.month_display,
    units: month.closing_units || 0,
    nav: month.has_nav_data ? month.closing_nav : null,
    marketValue: (month.market_value || 0) / 100000, // Convert to lakhs
    performance: month.month_change_percentage || 0
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.primaryText}20`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{
            margin: '0 0 8px 0',
            fontWeight: '600',
            color: colors.utility.primaryText,
            fontSize: '12px'
          }}>
            {payload[0]?.payload?.fullMonth}
          </p>
          {payload.map((entry: any, index: number) => {
            const isValidNumber = entry.value !== null && entry.value !== undefined && typeof entry.value === 'number';
            const formattedValue = isValidNumber ? entry.value.toFixed(2) : 'No data';

            return (
              <p key={index} style={{
                margin: '4px 0',
                color: entry.color,
                fontSize: '11px'
              }}>
                {entry.name}: {formattedValue}
                {entry.dataKey === 'marketValue' && isValidNumber && ' L'}
                {entry.dataKey === 'performance' && isValidNumber && ' %'}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1400px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `2px solid ${colors.utility.primaryText}20`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'sticky',
          top: 0,
          backgroundColor: colors.utility.primaryBackground,
          zIndex: 10
        }}>
          <div>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: colors.utility.primaryText
            }}>
              {scheme.scheme_name}
            </h2>
            <p style={{
              margin: '0',
              fontSize: '13px',
              color: colors.utility.secondaryText
            }}>
              {scheme.scheme_code} • {scheme.category}{scheme.sub_category ? ` • ${scheme.sub_category}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.utility.secondaryText,
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Charts Grid */}
        <div style={{
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px'
        }}>
          {/* Chart 1: Units */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📦</span>
              <span>Units Trend</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${colors.utility.primaryText}20`} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: colors.utility.secondaryText, fontSize: 11 }}
                  stroke={colors.utility.primaryText}
                  strokeOpacity={0.2}
                />
                <YAxis
                  tick={{ fill: colors.utility.secondaryText, fontSize: 11 }}
                  stroke={colors.utility.primaryText}
                  strokeOpacity={0.2}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: colors.utility.secondaryText }}
                />
                <Bar
                  dataKey="units"
                  fill={colors.brand.primary}
                  name="Closing Units"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: NAV */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>💰</span>
              <span>NAV Trend</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${colors.utility.primaryText}20`} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: colors.utility.secondaryText, fontSize: 11 }}
                  stroke={colors.utility.primaryText}
                  strokeOpacity={0.2}
                />
                <YAxis
                  tick={{ fill: colors.utility.secondaryText, fontSize: 11 }}
                  stroke={colors.utility.primaryText}
                  strokeOpacity={0.2}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: colors.utility.secondaryText }}
                />
                <Line
                  type="monotone"
                  dataKey="nav"
                  stroke={colors.semantic.success}
                  strokeWidth={2}
                  dot={{ fill: colors.semantic.success, r: 3 }}
                  activeDot={{ r: 5 }}
                  name="Closing NAV (₹)"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Market Value */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📊</span>
              <span>Market Value Trend</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMV" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.brand.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.brand.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={`${colors.utility.primaryText}20`} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: colors.utility.secondaryText, fontSize: 11 }}
                  stroke={colors.utility.primaryText}
                  strokeOpacity={0.2}
                />
                <YAxis
                  tick={{ fill: colors.utility.secondaryText, fontSize: 11 }}
                  stroke={colors.utility.primaryText}
                  strokeOpacity={0.2}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: colors.utility.secondaryText }}
                />
                <Area
                  type="monotone"
                  dataKey="marketValue"
                  stroke={colors.brand.primary}
                  strokeWidth={2}
                  fill="url(#colorMV)"
                  name="Market Value (₹ Lakhs)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 4: Performance */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📈</span>
              <span>Performance (MoM %)</span>
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${colors.utility.primaryText}20`} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: colors.utility.secondaryText, fontSize: 11 }}
                  stroke={colors.utility.primaryText}
                  strokeOpacity={0.2}
                />
                <YAxis
                  tick={{ fill: colors.utility.secondaryText, fontSize: 11 }}
                  stroke={colors.utility.primaryText}
                  strokeOpacity={0.2}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', color: colors.utility.secondaryText }}
                />
                <Bar
                  dataKey="performance"
                  name="MoM Change %"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.performance >= 0 ? colors.semantic.success : colors.semantic.error}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemeChartsModal;
