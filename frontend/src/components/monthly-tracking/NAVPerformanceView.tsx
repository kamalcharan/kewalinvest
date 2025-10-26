// frontend/src/components/monthly-tracking/NAVPerformanceView.tsx
// View component for monthly NAV performance tracking

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { BarChart2, Table as TableIcon } from 'lucide-react';
import MonthlyTrackingService, {
  MonthlyNAVResponse,
} from '../../services/monthlyTracking.service';
import { MonthlyDataChart } from './MonthlyDataChart';
import { MonthlyDataTable } from './MonthlyDataTable';

interface NAVPerformanceViewProps {
  customerId: number;
  schemeCode: string;
  months?: number;
}

export const NAVPerformanceView: React.FC<NAVPerformanceViewProps> = ({
  customerId,
  schemeCode,
  months = 12,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyNAVResponse | null>(null);

  useEffect(() => {
    loadData();
  }, [customerId, schemeCode, months]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await MonthlyTrackingService.getMonthlyNAV(
        customerId,
        schemeCode,
        months
      );

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load monthly NAV data');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
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
        Loading NAV data...
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

  // Prepare chart data (closing NAV)
  const chartData = data.months.map((m) => ({
    month_display: m.month_display,
    value: m.closing_nav,
    label: `NAV: ₹${m.closing_nav.toFixed(4)}`,
  }));

  // Prepare table columns
  const tableColumns = [
    {
      header: 'Month',
      accessor: 'month_display',
      align: 'left' as const,
    },
    {
      header: 'Opening NAV',
      accessor: 'opening_nav',
      align: 'right' as const,
      formatter: (value: number) => `₹${value.toFixed(4)}`,
    },
    {
      header: 'Closing NAV',
      accessor: 'closing_nav',
      align: 'right' as const,
      formatter: (value: number) => <strong>₹{value.toFixed(4)}</strong>,
    },
    {
      header: 'Low',
      accessor: 'lowest_nav',
      align: 'right' as const,
      formatter: (value: number) => (
        <span style={{ color: colors.semantic.error }}>
          ₹{value.toFixed(4)}
        </span>
      ),
    },
    {
      header: 'High',
      accessor: 'highest_nav',
      align: 'right' as const,
      formatter: (value: number) => (
        <span style={{ color: colors.semantic.success }}>
          ₹{value.toFixed(4)}
        </span>
      ),
    },
    {
      header: 'Change',
      accessor: 'nav_change',
      align: 'right' as const,
      formatter: (value: number) => {
        const color = value >= 0 ? colors.semantic.success : colors.semantic.error;
        return (
          <span style={{ color }}>
            {value >= 0 ? '+' : ''}₹{value.toFixed(4)}
          </span>
        );
      },
    },
    {
      header: 'Change %',
      accessor: 'nav_change_percentage',
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
    {
      header: 'Days',
      accessor: 'days_tracked',
      align: 'center' as const,
    },
  ];

  // Prepare summary data
  const summaryData = [
    {
      label: 'Current NAV',
      value: data.summary.current_nav,
      formatter: (v: number) => `₹${v.toFixed(4)}`,
    },
    {
      label: 'Average NAV',
      value: data.summary.average_nav,
      formatter: (v: number) => `₹${v.toFixed(4)}`,
    },
    {
      label: 'Overall Change',
      value: data.summary.overall_change_percentage,
      formatter: (v: number) => {
        const color = v >= 0 ? colors.semantic.success : colors.semantic.error;
        return (
          <span style={{ color }}>
            {v >= 0 ? '+' : ''}{v.toFixed(2)}%
          </span>
        );
      },
    },
    ...(data.summary.best_month
      ? [
          {
            label: 'Best Month',
            value: `${data.summary.best_month.month} (${data.summary.best_month.change_percentage >= 0 ? '+' : ''}${data.summary.best_month.change_percentage.toFixed(2)}%)`,
            formatter: (v: string) => v,
          },
        ]
      : []),
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
            NAV Performance
          </h2>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: colors.utility.secondaryText,
            }}
          >
            {data.scheme_name} ({data.scheme_code})
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
          title="Monthly NAV Trend"
          valueFormatter={(value) => `₹${value.toFixed(4)}`}
          color={colors.accent.blue}
        />
      ) : (
        <MonthlyDataTable
          data={data.months}
          columns={tableColumns}
          title="Monthly NAV Details"
          summary={summaryData}
        />
      )}
    </div>
  );
};
