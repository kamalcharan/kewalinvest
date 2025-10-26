// frontend/src/components/monthly-tracking/MarketValueView.tsx
// View component for monthly market value tracking

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { BarChart2, Table as TableIcon } from 'lucide-react';
import MonthlyTrackingService, {
  MonthlyMarketValueResponse,
} from '../../services/monthlyTracking.service';
import { MonthlyDataChart } from './MonthlyDataChart';
import { MonthlyDataTable } from './MonthlyDataTable';

interface MarketValueViewProps {
  customerId: number;
  schemeCode: string;
  months?: number;
}

export const MarketValueView: React.FC<MarketValueViewProps> = ({
  customerId,
  schemeCode,
  months = 12,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyMarketValueResponse | null>(null);

  useEffect(() => {
    loadData();
  }, [customerId, schemeCode, months]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await MonthlyTrackingService.getMonthlyMarketValue(
        customerId,
        schemeCode,
        months
      );

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load monthly market value data');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: colors.utility.secondaryText,
        }}
      >
        Loading market value data...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: `${colors.semantic.error}10`,
          border: `1px solid ${colors.semantic.error}`,
          borderRadius: '8px',
          color: colors.semantic.error,
        }}
      >
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Prepare chart data (market value)
  const chartData = data.months.map((m) => ({
    month_display: m.month_display,
    value: m.market_value,
    label: `Value: ${formatCurrency(m.market_value)}`,
  }));

  // Prepare table columns
  const tableColumns = [
    {
      header: 'Month',
      accessor: 'month_display',
      align: 'left' as const,
    },
    {
      header: 'Units',
      accessor: 'current_month_units',
      align: 'right' as const,
      formatter: (value: number) => value.toFixed(3),
    },
    {
      header: 'Prev NAV',
      accessor: 'previous_month_nav',
      align: 'right' as const,
      formatter: (value: number) => `₹${value.toFixed(4)}`,
    },
    {
      header: 'Market Value',
      accessor: 'market_value',
      align: 'right' as const,
      formatter: (value: number) => <strong>{formatCurrency(value)}</strong>,
    },
    {
      header: 'Invested',
      accessor: 'invested_value',
      align: 'right' as const,
      formatter: (value: number) => formatCurrency(value),
    },
    {
      header: 'P&L',
      accessor: 'profit_loss',
      align: 'right' as const,
      formatter: (value: number) => {
        const color = value >= 0 ? colors.semantic.success : colors.semantic.error;
        return (
          <span style={{ color, fontWeight: 600 }}>
            {value >= 0 ? '+' : ''}{formatCurrency(value)}
          </span>
        );
      },
    },
    {
      header: 'P&L %',
      accessor: 'profit_loss_percentage',
      align: 'right' as const,
      formatter: (value: number) => {
        const color = value >= 0 ? colors.semantic.success : colors.semantic.error;
        return (
          <span style={{ color, fontWeight: 600 }}>
            {value >= 0 ? '+' : ''}{value.toFixed(2)}%
          </span>
        );
      },
    },
  ];

  // Prepare summary data
  const summaryData = [
    {
      label: 'Current Market Value',
      value: data.summary.current_market_value,
      formatter: (v: number) => formatCurrency(v),
    },
    {
      label: 'Total Invested',
      value: data.summary.total_invested,
      formatter: (v: number) => formatCurrency(v),
    },
    {
      label: 'Overall P&L',
      value: data.summary.overall_profit_loss,
      formatter: (v: number) => {
        const color = v >= 0 ? colors.semantic.success : colors.semantic.error;
        return (
          <span style={{ color, fontWeight: 700 }}>
            {v >= 0 ? '+' : ''}{formatCurrency(v)}
          </span>
        );
      },
    },
    {
      label: 'Overall P&L %',
      value: data.summary.overall_profit_loss_percentage,
      formatter: (v: number) => {
        const color = v >= 0 ? colors.semantic.success : colors.semantic.error;
        return (
          <span style={{ color, fontWeight: 700 }}>
            {v >= 0 ? '+' : ''}{v.toFixed(2)}%
          </span>
        );
      },
    },
    {
      label: 'Avg Monthly Value',
      value: data.summary.average_monthly_value,
      formatter: (v: number) => formatCurrency(v),
    },
  ];

  return (
    <div>
      {/* Header with toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: colors.text.primary,
            }}
          >
            Market Value
          </h2>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: colors.utility.secondaryText,
            }}
          >
            {data.scheme_name} ({data.scheme_code}) • Formula: Previous Month NAV × Current Month Units
          </p>
        </div>

        {/* View Toggle */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            backgroundColor: isDarkMode
              ? colors.backgrounds.elevated
              : colors.backgrounds.surface,
            borderRadius: '6px',
            padding: '4px',
            border: `1px solid ${colors.utility.secondaryText}20`,
          }}
        >
          <button
            onClick={() => setViewMode('chart')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor:
                viewMode === 'chart' ? colors.primary.main : 'transparent',
              color:
                viewMode === 'chart'
                  ? '#fff'
                  : colors.utility.secondaryText,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            <BarChart2 size={16} />
            Chart
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor:
                viewMode === 'table' ? colors.primary.main : 'transparent',
              color:
                viewMode === 'table'
                  ? '#fff'
                  : colors.utility.secondaryText,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            <TableIcon size={16} />
            Table
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'chart' ? (
        <MonthlyDataChart
          data={chartData}
          title="Monthly Market Value Trend"
          valueFormatter={(value) => formatCurrency(value)}
          color={colors.accent.green}
        />
      ) : (
        <MonthlyDataTable
          data={data.months}
          columns={tableColumns}
          title="Monthly Market Value Details"
          summary={summaryData}
        />
      )}
    </div>
  );
};
