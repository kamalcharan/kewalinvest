// frontend/src/components/portfolio/PortfolioSnapshotsTable.tsx
// Portfolio Snapshots Table with tree structure showing all metrics
// Each scheme has 4 expandable rows: Units, NAV, Market Value, Performance

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ChevronDown, ChevronRight, TrendingUp, BarChart3, Wallet, LineChart, PieChart, Download } from 'lucide-react';
import { usePortfolioSnapshots, useNetworthSummary, useNetworthHistory } from '../../hooks/usePortfolioData';
import { useIndexReturnsTimeSeries } from '../../hooks/useMarketMetrics';
import { SchemeChartsModal } from './SchemeChartsModal';
import { getAssetTypeColor, getAssetTypeIcon, isSchemeAssetType } from '../../constants/assetTypes';
import * as XLSX from 'xlsx';

interface PortfolioSnapshotsTableProps {
  customerId: number;
  months?: number;
  benchmarkIndexId?: number; // Default: 1 (Nifty 50)
  benchmarkName?: string;    // Default: "Nifty 50"
}

type ExpandedRowType = 'units' | 'nav' | 'market_value' | 'performance';
type TabType = 'mf' | 'asset';

// Interfaces for MoM calculations
interface TotalMoMData {
  totalMarketValue: number;
  momPercentage: number;
}

interface MarketMoMData {
  closePrice: number;
  momPercentage: number;
  month: string;
}

interface AssetMoMData {
  assetType: string;
  monthlyData: {
    totalMarketValue: number;
    momPercentage: number;
  }[];
}

// Interface for Asset Type allocation display
interface AssetTypeAllocation {
  asset_type_code: string;
  asset_type_name: string;
  current_value: number;
  total_invested: number;
  total_returns: number;
  return_percentage: number;
  allocation_percentage: number;
  calculation_method: 'NAV' | 'ASSUMPTION' | 'MIXED';
}

export const PortfolioSnapshotsTable: React.FC<PortfolioSnapshotsTableProps> = ({
  customerId,
  months = 12,
  benchmarkIndexId = 1, // Nifty 50
  benchmarkName = 'Nifty 50',
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(new Set());
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('mf');

  const { data, isLoading, error, isError } = usePortfolioSnapshots(
    customerId,
    months
  );

  // Fetch benchmark index data (monthly granularity)
  const { data: benchmarkData } = useIndexReturnsTimeSeries(
    benchmarkIndexId,
    ['1m'],
    'monthly'
  );

  // Fetch networth summary for asset types breakdown
  const { data: networthData } = useNetworthSummary(
    { customerId },
    { enabled: customerId > 0 }
  );

  // Calculate date range for networth history (last N months)
  const dateRange = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }, [months]);

  // Fetch networth history for asset type MoM calculations
  const { data: networthHistoryData } = useNetworthHistory(
    {
      customerId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    },
    { enabled: customerId > 0 }
  );

  const schemes = data?.data?.schemes || [];
  const assetTypes = networthData?.data?.by_asset_type || [];

  // Initialize with all schemes expanded by default
  useEffect(() => {
    if (schemes.length > 0) {
      const allSchemeCodes = schemes.map((scheme: any) => scheme.scheme_code);
      setExpandedSchemes(new Set(allSchemeCodes));
    }
  }, [schemes.length]);

  const toggleSchemeExpansion = (schemeCode: string) => {
    const newExpanded = new Set(expandedSchemes);
    if (newExpanded.has(schemeCode)) {
      newExpanded.delete(schemeCode);
    } else {
      newExpanded.add(schemeCode);
    }
    setExpandedSchemes(newExpanded);
  };

  const expandAll = () => {
    const allSchemeCodes = schemes.map((scheme: any) => scheme.scheme_code);
    setExpandedSchemes(new Set(allSchemeCodes));
  };

  const collapseAll = () => {
    setExpandedSchemes(new Set());
  };

  const openChartModal = (scheme: any) => {
    setSelectedScheme(scheme);
    setIsChartModalOpen(true);
  };

  const closeChartModal = () => {
    setIsChartModalOpen(false);
    setSelectedScheme(null);
  };

  // Format month display (Nov'24)
  const formatMonthHeader = (monthData: any) => {
    if (monthData?.month_display) {
      const parts = monthData.month_display.split(' '); // "Nov 2024"
      return `${parts[0]}'${parts[1]?.slice(-2)}`; // "Nov'24"
    }
    return '';
  };

  // Format value based on type
  const formatValue = (value: number | undefined | null, type: 'units' | 'nav' | 'market_value' | 'percentage') => {
    if (value === undefined || value === null) return '-';

    switch (type) {
      case 'units':
        return value.toFixed(3);
      case 'nav':
        return `₹${value.toFixed(2)}`;
      case 'market_value':
        return `₹${(value / 100000).toFixed(2)}L`;
      case 'percentage':
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
      default:
        return value.toString();
    }
  };

  // Get month headers from first scheme's data (needed for useMemo below)
  const monthHeaders = schemes[0]?.monthly_data || [];

  // Calculate Total Portfolio MoM for each month
  // Sum market values across all schemes, then calculate MoM %
  // MUST be before early returns to follow React Hooks rules
  const totalPortfolioMoM = useMemo((): TotalMoMData[] => {
    if (schemes.length === 0 || !monthHeaders.length) return [];

    // For each month index, sum all schemes' market_value and net_cash_flow
    const totals = monthHeaders.map((_: any, monthIdx: number) => {
      let totalMarketValue = 0;
      let totalNetCashFlow = 0;

      schemes.forEach((scheme: any) => {
        const monthData = scheme.monthly_data?.[monthIdx];
        if (monthData?.market_value) {
          totalMarketValue += monthData.market_value;
        }
        if (monthData?.net_cash_flow) {
          totalNetCashFlow += monthData.net_cash_flow;
        }
      });

      return { totalMarketValue, totalNetCashFlow };
    });

    // Calculate MoM % for each month — cash-flow adjusted
    // Subtracts net cash flow so MoM reflects actual investment performance
    // Note: Data is in reverse chronological order (newest first)
    // So index 0 is current month, index 1 is previous month, etc.
    return totals.map((current: { totalMarketValue: number; totalNetCashFlow: number }, idx: number) => {
      const previousIdx = idx + 1; // Previous month is next index (older)
      const previous = totals[previousIdx];

      let momPercentage = 0;
      if (previous && previous.totalMarketValue > 0) {
        const adjustedChange = current.totalMarketValue - previous.totalMarketValue - current.totalNetCashFlow;
        momPercentage = (adjustedChange / previous.totalMarketValue) * 100;
      }

      return {
        totalMarketValue: current.totalMarketValue,
        momPercentage: Math.round(momPercentage * 100) / 100
      };
    });
  }, [schemes, monthHeaders]);

  // Calculate Asset Allocation data from networth summary
  // Shows all asset types (scheme categories + manual assets) with current values
  // Scheme categories derived from Scheme Category column (50+ types)
  const assetAllocationData = useMemo(() => {
    if (!assetTypes || assetTypes.length === 0) return [];

    // Sort: non-scheme assets first (by value), then scheme-based assets
    const sorted = [...assetTypes].sort((a: any, b: any) => {
      const aIsScheme = isSchemeAssetType(a.asset_type_code);
      const bIsScheme = isSchemeAssetType(b.asset_type_code);
      // Scheme-based assets go last
      if (aIsScheme && !bIsScheme) return 1;
      if (!aIsScheme && bIsScheme) return -1;
      // Sort by current value descending
      return b.current_value - a.current_value;
    });

    return sorted;
  }, [assetTypes]);

  // Calculate Asset Allocation MoM from networth history
  // Uses actual asset type breakdown with historical values
  // Aligns data to match MF tab's month count (uses monthHeaders length)
  const assetAllocationMoM = useMemo((): AssetMoMData[] => {
    const targetMonths = monthHeaders.length || months;

    // Use networth history if available
    if (networthHistoryData?.data?.chart_ready?.by_asset_type) {
      const chartData = networthHistoryData.data.chart_ready;
      const dates = chartData.dates || [];

      // Reverse to get newest first (like portfolio snapshots)
      const reversedDates = [...dates].reverse();

      // Sort: non-scheme assets first, then scheme-based assets
      const sortedAssetTypes = [...chartData.by_asset_type].sort((a: any, b: any) => {
        const aIsScheme = isSchemeAssetType(a.asset_type_code);
        const bIsScheme = isSchemeAssetType(b.asset_type_code);
        // Scheme-based assets go last
        if (aIsScheme && !bIsScheme) return 1;
        if (!aIsScheme && bIsScheme) return -1;
        // Sort by latest value descending
        const aLatest = a.values[a.values.length - 1] || 0;
        const bLatest = b.values[b.values.length - 1] || 0;
        return bLatest - aLatest;
      });

      return sortedAssetTypes.map((assetType: any) => {
        // Reverse values to match dates order (newest first)
        const reversedValues = [...assetType.values].reverse();

        // Pad to match target months count if needed
        const paddedValues = [...reversedValues];
        while (paddedValues.length < targetMonths) {
          paddedValues.push(0); // Pad older months with 0
        }
        // Trim if more data than needed
        const finalValues = paddedValues.slice(0, targetMonths);

        const monthlyData = finalValues.map((value: number, idx: number) => {
          const previousIdx = idx + 1;
          const previousValue = finalValues[previousIdx];

          let momPercentage = 0;
          if (previousValue && previousValue > 0) {
            momPercentage = ((value - previousValue) / previousValue) * 100;
          }

          return {
            totalMarketValue: value,
            momPercentage: Math.round(momPercentage * 100) / 100
          };
        });

        return {
          assetType: assetType.asset_type_code,
          assetTypeName: assetType.asset_type_name,
          color: assetType.color,
          monthlyData
        };
      });
    }

    // Fallback: use current networth summary data (no history)
    if (!assetAllocationData || assetAllocationData.length === 0) return [];

    // Create padded data to match target months
    return assetAllocationData.map((asset: any) => {
      const monthlyData = Array(targetMonths).fill(null).map((_, idx) => ({
        totalMarketValue: idx === 0 ? asset.current_value : 0,
        momPercentage: 0
      }));

      return {
        assetType: asset.asset_type_code,
        assetTypeName: asset.asset_type_name,
        monthlyData
      };
    });
  }, [networthHistoryData, assetAllocationData, monthHeaders.length, months]);

  // Calculate Market (Benchmark) MoM for each month
  // Uses benchmark index data to show market performance alongside portfolio
  const marketMoM = useMemo((): MarketMoMData[] => {
    if (!benchmarkData || !Array.isArray(benchmarkData) || benchmarkData.length === 0) return [];
    if (monthHeaders.length === 0) return [];

    // Sort benchmark data by date descending (newest first) to match portfolio data order
    const sortedBenchmark = [...benchmarkData].sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    // Create a map of month (YYYY-MM) to benchmark data
    const benchmarkByMonth = new Map<string, any>();
    sortedBenchmark.forEach((record: any) => {
      const date = new Date(record.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      // Only keep the latest (last day) record for each month
      if (!benchmarkByMonth.has(monthKey)) {
        benchmarkByMonth.set(monthKey, record);
      }
    });

    // Map portfolio months to benchmark data
    const result: MarketMoMData[] = [];

    for (let i = 0; i < monthHeaders.length; i++) {
      const monthData = monthHeaders[i];
      if (!monthData?.month) {
        result.push({ closePrice: 0, momPercentage: 0, month: '' });
        continue;
      }

      // month format is "YYYY-MM"
      const monthKey = monthData.month;
      const currentBenchmark = benchmarkByMonth.get(monthKey);

      // Get previous month's benchmark
      const prevMonthData = monthHeaders[i + 1];
      const prevMonthKey = prevMonthData?.month;
      const prevBenchmark = prevMonthKey ? benchmarkByMonth.get(prevMonthKey) : null;

      let momPercentage = 0;
      const closePrice = currentBenchmark?.close || 0;

      if (currentBenchmark && prevBenchmark && prevBenchmark.close > 0) {
        momPercentage = ((currentBenchmark.close - prevBenchmark.close) / prevBenchmark.close) * 100;
      }

      result.push({
        closePrice,
        momPercentage: Math.round(momPercentage * 100) / 100,
        month: monthKey
      });
    }

    return result;
  }, [benchmarkData, monthHeaders]);

  const allExpanded = expandedSchemes.size === schemes.length;
  const allCollapsed = expandedSchemes.size === 0;

  // Download spreadsheet with both MF and Asset sheets
  const downloadSpreadsheet = useCallback(() => {
    if (schemes.length === 0 || monthHeaders.length === 0) return;

    const wb = XLSX.utils.book_new();
    const monthLabels = monthHeaders.map((m: any) => formatMonthHeader(m));

    // ========== Sheet 1: MF Allocation ==========
    const mfRows: any[][] = [];

    // Header row
    mfRows.push(['Scheme Name', 'Metric', ...monthLabels]);

    // Scheme rows
    schemes.forEach((scheme: any) => {
      // MoM % row
      mfRows.push([
        scheme.scheme_name,
        'MoM %',
        ...scheme.monthly_data.map((m: any) => {
          const val = m.month_change_percentage;
          return val !== undefined && val !== null ? Math.round(val * 100) / 100 : '';
        })
      ]);

      // Units row
      mfRows.push([
        '',
        'Units',
        ...scheme.monthly_data.map((m: any) =>
          m.closing_units !== undefined && m.closing_units !== null
            ? Math.round(m.closing_units * 1000) / 1000
            : ''
        )
      ]);

      // NAV row
      mfRows.push([
        '',
        'NAV',
        ...scheme.monthly_data.map((m: any) => {
          if (!m.has_nav_data && !m.is_estimated) return 'No data';
          const val = m.closing_nav;
          return val !== undefined && val !== null ? Math.round(val * 100) / 100 : '';
        })
      ]);

      // Market Value row
      mfRows.push([
        '',
        'Market Value',
        ...scheme.monthly_data.map((m: any) =>
          m.market_value !== undefined && m.market_value !== null
            ? Math.round(m.market_value * 100) / 100
            : ''
        )
      ]);
    });

    // Empty separator row
    mfRows.push([]);

    // Total Portfolio row
    if (totalPortfolioMoM.length > 0) {
      mfRows.push([
        'Total Portfolio',
        'MoM %',
        ...totalPortfolioMoM.map((m: TotalMoMData) => m.momPercentage || '')
      ]);
      mfRows.push([
        '',
        'Market Value',
        ...totalPortfolioMoM.map((m: TotalMoMData) =>
          m.totalMarketValue ? Math.round(m.totalMarketValue * 100) / 100 : ''
        )
      ]);
    }

    // Benchmark row
    if (marketMoM.length > 0) {
      mfRows.push([
        benchmarkName,
        'MoM %',
        ...marketMoM.map((m: MarketMoMData) => m.momPercentage || '')
      ]);
      mfRows.push([
        '',
        'Close Price',
        ...marketMoM.map((m: MarketMoMData) =>
          m.closePrice ? Math.round(m.closePrice * 100) / 100 : ''
        )
      ]);
    }

    const mfSheet = XLSX.utils.aoa_to_sheet(mfRows);

    // Set column widths
    mfSheet['!cols'] = [
      { wch: 45 }, // Scheme Name
      { wch: 14 }, // Metric
      ...monthLabels.map(() => ({ wch: 12 }))
    ];

    XLSX.utils.book_append_sheet(wb, mfSheet, 'MF Allocation');

    // ========== Sheet 2: Asset Allocation ==========
    if (assetAllocationMoM.length > 0) {
      const assetRows: any[][] = [];

      // Header row
      assetRows.push(['Asset Type', 'Metric', ...monthLabels]);

      assetAllocationMoM.forEach((assetData: any) => {
        const displayName = assetData.assetTypeName || assetData.assetType;

        // Market Value row
        assetRows.push([
          displayName,
          'Market Value',
          ...assetData.monthlyData.map((m: any) =>
            m.totalMarketValue ? Math.round(m.totalMarketValue * 100) / 100 : ''
          )
        ]);

        // MoM % row
        assetRows.push([
          '',
          'MoM %',
          ...assetData.monthlyData.map((m: any) => m.momPercentage || '')
        ]);
      });

      // Empty separator
      assetRows.push([]);

      // Total Portfolio row
      if (totalPortfolioMoM.length > 0) {
        assetRows.push([
          'Total Portfolio',
          'MoM %',
          ...totalPortfolioMoM.map((m: TotalMoMData) => m.momPercentage || '')
        ]);
        assetRows.push([
          '',
          'Market Value',
          ...totalPortfolioMoM.map((m: TotalMoMData) =>
            m.totalMarketValue ? Math.round(m.totalMarketValue * 100) / 100 : ''
          )
        ]);
      }

      // Benchmark
      if (marketMoM.length > 0) {
        assetRows.push([
          benchmarkName,
          'MoM %',
          ...marketMoM.map((m: MarketMoMData) => m.momPercentage || '')
        ]);
      }

      const assetSheet = XLSX.utils.aoa_to_sheet(assetRows);
      assetSheet['!cols'] = [
        { wch: 30 },
        { wch: 14 },
        ...monthLabels.map(() => ({ wch: 12 }))
      ];
      XLSX.utils.book_append_sheet(wb, assetSheet, 'Asset Allocation');
    }

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Portfolio_Snapshots_${customerId}_${today}.xlsx`);
  }, [schemes, monthHeaders, totalPortfolioMoM, marketMoM, assetAllocationMoM, benchmarkName, customerId]);

  // Early returns AFTER all hooks
  if (isLoading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: colors.utility.secondaryText,
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px'
      }}>
        Loading portfolio snapshots...
      </div>
    );
  }

  if (isError || error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: `${colors.semantic.error}10`,
        border: `1px solid ${colors.semantic.error}`,
        borderRadius: '8px',
        color: colors.semantic.error
      }}>
        Failed to load portfolio snapshots
      </div>
    );
  }

  if (schemes.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: colors.utility.secondaryText,
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px'
      }}>
        No portfolio data available for the selected period
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: `2px solid ${colors.utility.primaryText}20`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color={colors.brand.primary} />
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                margin: '0'
              }}>
                Portfolio Snapshots - {months} Month View
              </h3>
            </div>
            <p style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              margin: '8px 0 0 0'
            }}>
              {activeTab === 'mf'
                ? 'Performance (MoM) shown by default • Click ▶ to expand Units, NAV, Market Value'
                : 'Asset allocation by type • MF, Gold, FD, Real Estate, etc.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Expand/Collapse All Buttons - Only for MF tab */}
            {activeTab === 'mf' && (
              <>
                <button
                  onClick={expandAll}
                  disabled={allExpanded}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: allExpanded ? colors.utility.secondaryText : colors.brand.primary,
                    backgroundColor: allExpanded ? colors.utility.primaryBackground : `${colors.brand.primary}10`,
                    border: `1px solid ${allExpanded ? colors.utility.primaryText + '20' : colors.brand.primary}`,
                    borderRadius: '6px',
                    cursor: allExpanded ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: allExpanded ? 0.5 : 1
                  }}
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  disabled={allCollapsed}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: allCollapsed ? colors.utility.secondaryText : colors.brand.primary,
                    backgroundColor: allCollapsed ? colors.utility.primaryBackground : `${colors.brand.primary}10`,
                    border: `1px solid ${allCollapsed ? colors.utility.primaryText + '20' : colors.brand.primary}`,
                    borderRadius: '6px',
                    cursor: allCollapsed ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: allCollapsed ? 0.5 : 1
                  }}
                >
                  Collapse All
                </button>
              </>
            )}

            {/* Download Spreadsheet Button - Always visible */}
            <button
              onClick={downloadSpreadsheet}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                fontWeight: '500',
                color: colors.semantic.success,
                backgroundColor: `${colors.semantic.success}10`,
                border: `1px solid ${colors.semantic.success}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Download as Excel spreadsheet"
            >
              <Download size={14} />
              Download
            </button>
          </div>
        </div>

        {/* Horizontal Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          backgroundColor: colors.utility.primaryBackground,
          padding: '4px',
          borderRadius: '8px',
          width: 'fit-content'
        }}>
          <button
            onClick={() => setActiveTab('mf')}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              color: activeTab === 'mf' ? colors.brand.primary : colors.utility.secondaryText,
              backgroundColor: activeTab === 'mf' ? colors.utility.secondaryBackground : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'mf' ? `0 2px 4px ${colors.utility.primaryText}10` : 'none'
            }}
          >
            <BarChart3 size={16} />
            MF Allocation
          </button>
          <button
            onClick={() => setActiveTab('asset')}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: '600',
              color: activeTab === 'asset' ? colors.brand.primary : colors.utility.secondaryText,
              backgroundColor: activeTab === 'asset' ? colors.utility.secondaryBackground : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'asset' ? `0 2px 4px ${colors.utility.primaryText}10` : 'none'
            }}
          >
            <PieChart size={16} />
            Asset Allocation
          </button>
        </div>
      </div>

      {/* Table Container with Fixed Header and Scrollable Body */}
      <div style={{
        maxHeight: '600px',
        overflow: 'auto',
        position: 'relative'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead style={{
            position: 'sticky',
            top: 0,
            zIndex: 3,
            backgroundColor: colors.utility.primaryBackground
          }}>
            <tr style={{
              backgroundColor: colors.utility.primaryBackground,
              borderBottom: `2px solid ${colors.utility.primaryText}20`
            }}>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                textTransform: 'uppercase',
                position: 'sticky',
                left: 0,
                backgroundColor: colors.utility.primaryBackground,
                zIndex: 4,
                minWidth: '320px',
                boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
              }}>
                Scheme Name
              </th>
              {monthHeaders.map((month: any, idx: number) => (
                <th
                  key={idx}
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: colors.utility.secondaryText,
                    textTransform: 'uppercase',
                    minWidth: '90px',
                    backgroundColor: idx === 0
                      ? `${colors.brand.primary}15`
                      : colors.utility.primaryBackground
                  }}
                >
                  {formatMonthHeader(month)}
                  {idx === 0 && (
                    <span style={{ marginLeft: '4px', color: colors.brand.primary }}>*</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* MF Allocation Tab - Scheme-based view */}
            {activeTab === 'mf' && schemes.map((scheme: any, schemeIdx: number) => {
              const isExpanded = expandedSchemes.has(scheme.scheme_code);

              return (
                <React.Fragment key={scheme.scheme_code}>
                  {/* Main Scheme Row */}
                  <tr
                    style={{
                      borderBottom: `1px solid ${colors.utility.primaryText}10`,
                      backgroundColor: schemeIdx % 2 === 0
                        ? colors.utility.secondaryBackground
                        : colors.utility.primaryBackground,
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleSchemeExpansion(scheme.scheme_code)}
                  >
                    <td style={{
                      padding: '12px 16px',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: schemeIdx % 2 === 0
                        ? colors.utility.secondaryBackground
                        : colors.utility.primaryBackground,
                      zIndex: 2,
                      boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: colors.utility.primaryText
                        }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: '700',
                            color: colors.utility.primaryText,
                            fontSize: '13px'
                          }}>
                            {scheme.scheme_name}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: colors.utility.secondaryText
                          }}>
                            {scheme.scheme_code} • {scheme.category}{scheme.sub_category ? ` • ${scheme.sub_category}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openChartModal(scheme);
                          }}
                          style={{
                            border: 'none',
                            background: `${colors.brand.primary}15`,
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.brand.primary,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `${colors.brand.primary}25`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = `${colors.brand.primary}15`;
                          }}
                          title="View Chart"
                        >
                          <BarChart3 size={16} />
                        </button>
                      </div>
                    </td>
                    {/* Show Performance (MoM) values directly in scheme row */}
                    {scheme.monthly_data.map((month: any, idx: number) => {
                      const changePercentage = month.month_change_percentage || 0;
                      return (
                        <td
                          key={idx}
                          style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontWeight: '600',
                            fontSize: '12px',
                            color: changePercentage >= 0
                              ? colors.semantic.success
                              : colors.semantic.error,
                            backgroundColor: idx === 0
                              ? `${colors.brand.primary}10`
                              : (schemeIdx % 2 === 0
                                ? colors.utility.secondaryBackground
                                : colors.utility.primaryBackground)
                          }}
                        >
                          {formatValue(changePercentage, 'percentage')}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Expandable Rows - Units */}
                  {isExpanded && (
                    <tr style={{
                      backgroundColor: `${colors.utility.primaryText}05`,
                      borderBottom: `1px solid ${colors.utility.primaryText}05`
                    }}>
                      <td style={{
                        padding: '8px 16px 8px 48px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        fontWeight: '500',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: `${colors.utility.primaryText}05`,
                        zIndex: 2,
                        boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📦</span>
                          <span>Units</span>
                        </div>
                      </td>
                      {scheme.monthly_data.map((month: any, idx: number) => (
                        <td
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontWeight: '500',
                            fontSize: '12px',
                            color: colors.utility.primaryText,
                            backgroundColor: idx === 0
                              ? `${colors.brand.primary}10`
                              : undefined
                          }}
                        >
                          {formatValue(month.closing_units, 'units')}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Expandable Rows - NAV */}
                  {isExpanded && (
                    <tr style={{
                      backgroundColor: `${colors.utility.primaryText}05`,
                      borderBottom: `1px solid ${colors.utility.primaryText}05`
                    }}>
                      <td style={{
                        padding: '8px 16px 8px 48px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        fontWeight: '500',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: `${colors.utility.primaryText}05`,
                        zIndex: 2,
                        boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>💰</span>
                          <span>NAV</span>
                        </div>
                      </td>
                      {scheme.monthly_data.map((month: any, idx: number) => {
                        const hasData = month.has_nav_data || month.is_estimated;
                        const isEstimated = month.is_estimated;
                        return (
                          <td
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              textAlign: 'right',
                              fontWeight: '500',
                              fontSize: '12px',
                              color: hasData
                                ? (isEstimated ? colors.semantic.warning : colors.utility.primaryText)
                                : colors.semantic.error,
                              backgroundColor: idx === 0
                                ? `${colors.brand.primary}10`
                                : undefined
                            }}
                          >
                            {hasData
                              ? `${formatValue(month.closing_nav, 'nav')}${isEstimated ? '**' : ''}`
                              : 'No data'}
                          </td>
                        );
                      })}
                    </tr>
                  )}

                  {/* Expandable Rows - Market Value */}
                  {isExpanded && (
                    <tr style={{
                      backgroundColor: `${colors.utility.primaryText}05`,
                      borderBottom: `1px solid ${colors.utility.primaryText}10`
                    }}>
                      <td style={{
                        padding: '8px 16px 8px 48px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        fontWeight: '500',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: `${colors.utility.primaryText}05`,
                        zIndex: 2,
                        boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📊</span>
                          <span>Market Value</span>
                        </div>
                      </td>
                      {scheme.monthly_data.map((month: any, idx: number) => (
                        <td
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontWeight: '500',
                            fontSize: '12px',
                            color: colors.utility.primaryText,
                            backgroundColor: idx === 0
                              ? `${colors.brand.primary}10`
                              : undefined
                          }}
                        >
                          {formatValue(month.market_value, 'market_value')}
                        </td>
                      ))}
                    </tr>
                  )}

                </React.Fragment>
              );
            })}

            {/* Total Portfolio MoM Row - Summary at bottom (MF tab only) */}
            {activeTab === 'mf' && totalPortfolioMoM.length > 0 && (
              <tr style={{
                borderTop: `3px solid ${colors.brand.primary}`,
                backgroundColor: `${colors.brand.primary}15`
              }}>
                <td style={{
                  padding: '14px 16px',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: `${colors.brand.primary}15`,
                  zIndex: 2,
                  boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: `${colors.brand.primary}20`
                    }}>
                      <Wallet size={16} color={colors.brand.primary} />
                    </div>
                    <div>
                      <div style={{
                        fontWeight: '700',
                        color: colors.brand.primary,
                        fontSize: '14px'
                      }}>
                        Total Portfolio
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: colors.utility.secondaryText
                      }}>
                        Performance (MoM)
                      </div>
                    </div>
                  </div>
                </td>
                {totalPortfolioMoM.map((monthData: TotalMoMData, idx: number) => {
                  const momPercentage = monthData.momPercentage || 0;
                  return (
                    <td
                      key={idx}
                      style={{
                        padding: '14px 12px',
                        textAlign: 'right',
                        fontWeight: '700',
                        fontSize: '13px',
                        color: momPercentage >= 0
                          ? colors.semantic.success
                          : colors.semantic.error,
                        backgroundColor: idx === 0
                          ? `${colors.brand.primary}25`
                          : `${colors.brand.primary}15`
                      }}
                    >
                      {formatValue(momPercentage, 'percentage')}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Market Performance MoM Row - Benchmark comparison (MF tab only) */}
            {activeTab === 'mf' && marketMoM.length > 0 && (
              <tr style={{
                borderTop: `1px solid ${colors.semantic.warning}40`,
                backgroundColor: `${colors.semantic.warning}12`
              }}>
                <td style={{
                  padding: '14px 16px',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: `${colors.semantic.warning}12`,
                  zIndex: 2,
                  boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: `${colors.semantic.warning}20`
                    }}>
                      <LineChart size={16} color={colors.semantic.warning} />
                    </div>
                    <div>
                      <div style={{
                        fontWeight: '700',
                        color: colors.semantic.warning,
                        fontSize: '14px'
                      }}>
                        {benchmarkName}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: colors.utility.secondaryText
                      }}>
                        Market Performance (MoM)
                      </div>
                    </div>
                  </div>
                </td>
                {marketMoM.map((monthData: MarketMoMData, idx: number) => {
                  const momPercentage = monthData.momPercentage || 0;
                  return (
                    <td
                      key={idx}
                      style={{
                        padding: '14px 12px',
                        textAlign: 'right',
                        fontWeight: '600',
                        fontSize: '13px',
                        color: momPercentage >= 0
                          ? colors.semantic.success
                          : colors.semantic.error,
                        backgroundColor: idx === 0
                          ? `${colors.semantic.warning}20`
                          : `${colors.semantic.warning}12`
                      }}
                    >
                      {formatValue(momPercentage, 'percentage')}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Asset Allocation Tab - Asset type based view (2 rows per asset: Value + MoM %) */}
            {activeTab === 'asset' && assetAllocationMoM.map((assetData: any, assetIdx: number) => {
              // Use color from data or get from constants
              const assetColor = assetData.color || getAssetTypeColor(assetData.assetType);
              const assetIcon = getAssetTypeIcon(assetData.assetType);
              // Display name: use assetTypeName if available, otherwise assetType code
              const displayName = assetData.assetTypeName || assetData.assetType;
              // Get current value from first month
              const currentValue = assetData.monthlyData[0]?.totalMarketValue || 0;
              const bgColor = assetIdx % 2 === 0
                ? colors.utility.secondaryBackground
                : colors.utility.primaryBackground;

              return (
                <React.Fragment key={assetData.assetType}>
                  {/* Row 1: Asset Name + Market Values */}
                  <tr style={{
                    borderBottom: `1px solid ${colors.utility.primaryText}05`,
                    backgroundColor: bgColor
                  }}>
                    <td style={{
                      padding: '14px 16px',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: bgColor,
                      zIndex: 2,
                      boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: `${assetColor}15`,
                          fontSize: '16px'
                        }}>
                          {assetIcon}
                        </div>
                        <div>
                          <div style={{
                            fontWeight: '700',
                            color: assetColor,
                            fontSize: '14px'
                          }}>
                            {displayName}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: colors.utility.secondaryText
                          }}>
                            Market Value
                          </div>
                        </div>
                      </div>
                    </td>
                    {assetData.monthlyData.map((monthData: any, idx: number) => (
                      <td
                        key={idx}
                        style={{
                          padding: '12px 12px',
                          textAlign: 'right',
                          fontWeight: '600',
                          fontSize: '12px',
                          color: colors.utility.primaryText,
                          backgroundColor: idx === 0 ? `${assetColor}10` : bgColor
                        }}
                      >
                        {formatValue(monthData.totalMarketValue, 'market_value')}
                      </td>
                    ))}
                  </tr>

                  {/* Row 2: MoM Percentage */}
                  <tr style={{
                    borderBottom: `1px solid ${colors.utility.primaryText}10`,
                    backgroundColor: bgColor
                  }}>
                    <td style={{
                      padding: '8px 16px 14px 16px',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: bgColor,
                      zIndex: 2,
                      boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        paddingLeft: '42px' // Align with text above (32px icon + 10px gap)
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: colors.utility.secondaryText,
                          fontWeight: '500'
                        }}>
                          📈 Performance (MoM)
                        </div>
                      </div>
                    </td>
                    {assetData.monthlyData.map((monthData: any, idx: number) => {
                      const momPercentage = monthData.momPercentage || 0;
                      return (
                        <td
                          key={idx}
                          style={{
                            padding: '8px 12px 14px 12px',
                            textAlign: 'right',
                            fontWeight: '600',
                            fontSize: '12px',
                            color: momPercentage >= 0
                              ? colors.semantic.success
                              : colors.semantic.error,
                            backgroundColor: idx === 0 ? `${assetColor}10` : bgColor
                          }}
                        >
                          {formatValue(momPercentage, 'percentage')}
                        </td>
                      );
                    })}
                  </tr>
                </React.Fragment>
              );
            })}

            {/* Total Portfolio MoM Row - Summary at bottom (Asset tab) */}
            {activeTab === 'asset' && totalPortfolioMoM.length > 0 && (
              <tr style={{
                borderTop: `3px solid ${colors.brand.primary}`,
                backgroundColor: `${colors.brand.primary}15`
              }}>
                <td style={{
                  padding: '14px 16px',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: `${colors.brand.primary}15`,
                  zIndex: 2,
                  boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: `${colors.brand.primary}20`
                    }}>
                      <Wallet size={16} color={colors.brand.primary} />
                    </div>
                    <div>
                      <div style={{
                        fontWeight: '700',
                        color: colors.brand.primary,
                        fontSize: '14px'
                      }}>
                        Total Portfolio
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: colors.utility.secondaryText
                      }}>
                        Performance (MoM)
                      </div>
                    </div>
                  </div>
                </td>
                {totalPortfolioMoM.map((monthData: TotalMoMData, idx: number) => {
                  const momPercentage = monthData.momPercentage || 0;
                  return (
                    <td
                      key={idx}
                      style={{
                        padding: '14px 12px',
                        textAlign: 'right',
                        fontWeight: '700',
                        fontSize: '13px',
                        color: momPercentage >= 0
                          ? colors.semantic.success
                          : colors.semantic.error,
                        backgroundColor: idx === 0
                          ? `${colors.brand.primary}25`
                          : `${colors.brand.primary}15`
                      }}
                    >
                      {formatValue(momPercentage, 'percentage')}
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Market Performance MoM Row - Benchmark comparison (Asset tab) */}
            {activeTab === 'asset' && marketMoM.length > 0 && (
              <tr style={{
                borderTop: `1px solid ${colors.semantic.warning}40`,
                backgroundColor: `${colors.semantic.warning}12`
              }}>
                <td style={{
                  padding: '14px 16px',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: `${colors.semantic.warning}12`,
                  zIndex: 2,
                  boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: `${colors.semantic.warning}20`
                    }}>
                      <LineChart size={16} color={colors.semantic.warning} />
                    </div>
                    <div>
                      <div style={{
                        fontWeight: '700',
                        color: colors.semantic.warning,
                        fontSize: '14px'
                      }}>
                        {benchmarkName}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: colors.utility.secondaryText
                      }}>
                        Market Performance (MoM)
                      </div>
                    </div>
                  </div>
                </td>
                {marketMoM.map((monthData: MarketMoMData, idx: number) => {
                  const momPercentage = monthData.momPercentage || 0;
                  return (
                    <td
                      key={idx}
                      style={{
                        padding: '14px 12px',
                        textAlign: 'right',
                        fontWeight: '600',
                        fontSize: '13px',
                        color: momPercentage >= 0
                          ? colors.semantic.success
                          : colors.semantic.error,
                        backgroundColor: idx === 0
                          ? `${colors.semantic.warning}20`
                          : `${colors.semantic.warning}12`
                      }}
                    >
                      {formatValue(momPercentage, 'percentage')}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: colors.utility.primaryBackground,
        borderTop: `1px solid ${colors.utility.primaryText}10`,
        fontSize: '12px',
        color: colors.utility.secondaryText
      }}>
        * Current month • ** NAV estimated (using latest available) • Click ▶ to expand Units, NAV, Market Value
      </div>

      {/* Chart Modal */}
      <SchemeChartsModal
        isOpen={isChartModalOpen}
        onClose={closeChartModal}
        scheme={selectedScheme}
      />
    </div>
  );
};

export default PortfolioSnapshotsTable;
