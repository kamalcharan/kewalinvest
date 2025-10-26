// frontend/src/components/monthly-tracking/UnitsPerMonthView.tsx
// View component for monthly units tracking

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { BarChart2, Table as TableIcon } from 'lucide-react';
import MonthlyTrackingService, {
  MonthlyUnitsResponse,
} from '../../services/monthlyTracking.service';
import { MonthlyDataChart } from './MonthlyDataChart';
import { MonthlyDataTable } from './MonthlyDataTable';

interface UnitsPerMonthViewProps {
  customerId: number;
  schemeCode: string;
  months?: number;
}

export const UnitsPerMonthView: React.FC<UnitsPerMonthViewProps> = ({
  customerId,
  schemeCode,
  months = 12,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyUnitsResponse | null>(null);

  useEffect(() => {
    loadData();
  }, [customerId, schemeCode, months]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await MonthlyTrackingService.getMonthlyUnits(
        customerId,
        schemeCode,
        months
      );

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load monthly units data');
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
        Loading units data...
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

  // Prepare chart data
  const chartData = data.months.map((m) => ({
    month_display: m.month_display,
    value: m.closing_units,
    label: `Units: ${m.closing_units.toFixed(3)}`,
  }));

  // Prepare table columns
  const tableColumns = [
    {
      header: 'Month',
      accessor: 'month_display',
      align: 'left' as const,
    },
    {
      header: 'Opening',
      accessor: 'opening_units',
      align: 'right' as const,
      formatter: (value: number) => value.toFixed(3),
    },
    {
      header: 'Added',
      accessor: 'units_added',
      align: 'right' as const,
      formatter: (value: number) => (
        <span style={{ color: colors.semantic.success }}>
          +{value.toFixed(3)}
        </span>
      ),
    },
    {
      header: 'Redeemed',
      accessor: 'units_redeemed',
      align: 'right' as const,
      formatter: (value: number) => (
        <span style={{ color: colors.semantic.error }}>
          -{value.toFixed(3)}
        </span>
      ),
    },
    {
      header: 'Net Change',
      accessor: 'net_change',
      align: 'right' as const,
      formatter: (value: number) => {
        const color = value >= 0 ? colors.semantic.success : colors.semantic.error;
        return (
          <span style={{ color, fontWeight: 600 }}>
            {value >= 0 ? '+' : ''}{value.toFixed(3)}
          </span>
        );
      },
    },
    {
      header: 'Closing',
      accessor: 'closing_units',
      align: 'right' as const,
      formatter: (value: number) => (
        <strong>{value.toFixed(3)}</strong>
      ),
    },
    {
      header: 'Txns',
      accessor: 'transaction_count',
      align: 'center' as const,
    },
  ];

  // Prepare summary data
  const summaryData = [
    {
      label: 'Current Units',
      value: data.summary.current_units,
      formatter: (v: number) => v.toFixed(3),
    },
    {
      label: 'Total Added',
      value: data.summary.total_units_added,
      formatter: (v: number) => `+${v.toFixed(3)}`,
    },
    {
      label: 'Total Redeemed',
      value: data.summary.total_units_redeemed,
      formatter: (v: number) => `-${v.toFixed(3)}`,
    },
    {
      label: 'Avg Monthly Units',
      value: data.summary.average_monthly_units,
      formatter: (v: number) => v.toFixed(3),
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
            Units Per Month
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
          title="Monthly Units Trend"
          valueFormatter={(value) => value.toFixed(3)}
          color={colors.primary.main}
        />
      ) : (
        <MonthlyDataTable
          data={data.months}
          columns={tableColumns}
          title="Monthly Units Breakdown"
          summary={summaryData}
        />
      )}
    </div>
  );
};
