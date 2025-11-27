// src/components/visualizations/AssetTypePerformanceChart.tsx
// Reusable performance chart component for any asset type

import React, { useState, useEffect, useMemo } from 'react';
import { Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { UserPreferencesService } from '../../services/userPreferences.service';
import { MarketService } from '../../services/market.service';
import { toggleFullscreen, isFullscreen, onFullscreenChange, isFullscreenSupported } from '../../utils/fullscreenUtils';
import PerformanceComparisonChart from './PerformanceComparisonChart';
import ChartExport from './chartViewer/export/ChartExport';
import { IndexSelector } from '../performance/IndexSelector';
import type { MarketIndex } from '../../types/market.types';

interface PerformanceDataPoint {
  date: string;
  value: number;
  invested?: number;
  returns?: number;
  return_percentage?: number;
}

interface AssetTypePerformanceChartProps {
  customerId: number;
  assetTypeCode: string;
  assetTypeName: string;
  // Performance data for this asset type
  performanceData: PerformanceDataPoint[];
  // Optional: dates array for alignment
  dates?: string[];
  // Chart size
  height?: number;
  // Optional color override
  color?: string;
}

// Calculate MoM changes
const calculateMoM = (data: PerformanceDataPoint[]): (PerformanceDataPoint & {
  mom_change_percentage: number | null;
  returns_mom_percentage: number | null;
  is_significant_investment: boolean;
  investment_change: number;
})[] => {
  if (data.length < 2) return data.map(d => ({
    ...d,
    mom_change_percentage: null,
    returns_mom_percentage: null,
    is_significant_investment: false,
    investment_change: 0
  }));

  return data.map((point, index) => {
    if (index === 0) {
      return {
        ...point,
        mom_change_percentage: null,
        returns_mom_percentage: null,
        is_significant_investment: false,
        investment_change: 0
      };
    }

    const prev = data[index - 1];
    const prevValue = prev.value || 0;
    const currValue = point.value || 0;
    const prevInvested = prev.invested || 0;
    const currInvested = point.invested || 0;

    // Value-based MoM
    const mom_change_percentage = prevValue > 0
      ? ((currValue - prevValue) / prevValue) * 100
      : 0;

    // Investment change
    const investment_change = currInvested - prevInvested;
    const is_significant_investment = prevValue > 0 && investment_change > prevValue * 0.1;

    // Returns-based MoM (excludes new investments)
    const prevReturns = prev.returns ?? (prevValue - prevInvested);
    const currReturns = point.returns ?? (currValue - currInvested);
    const returnsDiff = currReturns - prevReturns;
    const returns_mom_percentage = prevValue > 0
      ? (returnsDiff / prevValue) * 100
      : 0;

    return {
      ...point,
      mom_change_percentage,
      returns_mom_percentage,
      is_significant_investment,
      investment_change
    };
  });
};

const getMoMArrow = (value: number): string => {
  if (value > 0) return '▲';
  if (value < 0) return '▼';
  return '–';
};

// Calculate MoM changes for index data
const calculateIndexMoM = (data: Array<{ date: string; value: number }>): Array<{ date: string; value: number }> => {
  if (data.length < 2) return data.map(d => ({ date: d.date, value: 0 }));

  return data.map((point, index) => {
    if (index === 0) {
      return { date: point.date, value: 0 };
    }
    const prev = data[index - 1];
    const prevValue = prev.value || 0;
    const momPercentage = prevValue > 0
      ? ((point.value - prevValue) / prevValue) * 100
      : 0;
    return { date: point.date, value: momPercentage };
  });
};

const AssetTypePerformanceChart: React.FC<AssetTypePerformanceChartProps> = ({
  customerId,
  assetTypeCode,
  assetTypeName,
  performanceData,
  dates,
  height = 280,
  color
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Index comparison state
  const [defaultComparisonIndex, setDefaultComparisonIndex] = useState<MarketIndex | null>(null);
  const [comparisonIndexData, setComparisonIndexData] = useState<Array<{ date: string; value: number }>>([]);
  const [isLoadingIndexComparison, setIsLoadingIndexComparison] = useState(false);
  const [showComparison, setShowComparison] = useState(true);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // Chart view mode: cumulative (% from start) or mom (month-over-month)
  const [chartViewMode, setChartViewMode] = useState<'cumulative' | 'mom'>('cumulative');

  const chartId = `performance-chart-${customerId}-${assetTypeCode}`;

  // Calculate MoM for the data
  const dataWithMoM = useMemo(() => calculateMoM(performanceData), [performanceData]);

  // Get latest MoM data
  const latestMoMData = useMemo(() => {
    if (dataWithMoM.length < 2) return null;
    const latest = dataWithMoM[dataWithMoM.length - 1];
    return {
      returnsMoM: latest.returns_mom_percentage,
      valueMoM: latest.mom_change_percentage,
      isSignificantInvestment: latest.is_significant_investment,
      investmentChange: latest.investment_change
    };
  }, [dataWithMoM]);

  const latestMoM = latestMoMData?.returnsMoM ?? null;

  // Compute index MoM data when in MoM view mode
  const indexMoMData = useMemo(() => {
    if (chartViewMode !== 'mom' || comparisonIndexData.length === 0) return [];
    return calculateIndexMoM(comparisonIndexData);
  }, [chartViewMode, comparisonIndexData]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Load default comparison index
  useEffect(() => {
    const loadDefaultIndexComparison = async () => {
      if (performanceData.length === 0) return;

      try {
        setIsLoadingIndexComparison(true);

        const prefResponse = await UserPreferencesService.getDefaultComparisonIndex();
        if (!prefResponse.success || !prefResponse.data?.default_comparison_index_id) {
          setDefaultComparisonIndex(null);
          setComparisonIndexData([]);
          return;
        }

        const indexId = prefResponse.data.default_comparison_index_id;
        const indexResponse = await MarketService.getIndexById(indexId);
        if (!indexResponse.success || !indexResponse.data) return;

        setDefaultComparisonIndex(indexResponse.data);

        const startDate = performanceData[0].date;
        const endDate = performanceData[performanceData.length - 1].date;

        const monthlyDataResponse = await MarketService.getIndexMonthlyDataForComparison(
          indexId,
          startDate,
          endDate
        );

        if (monthlyDataResponse.success && monthlyDataResponse.data && monthlyDataResponse.data.length > 0) {
          setComparisonIndexData(monthlyDataResponse.data);
          setShowComparison(true);
        }
      } catch (error) {
        console.error('Error loading index comparison:', error);
      } finally {
        setIsLoadingIndexComparison(false);
      }
    };

    loadDefaultIndexComparison();
  }, [performanceData]);

  // Handle index selection
  const handleIndexSelect = async (index: MarketIndex | null) => {
    if (!index) {
      setDefaultComparisonIndex(null);
      setComparisonIndexData([]);
      setShowComparison(false);
      return;
    }

    if (performanceData.length === 0) return;

    try {
      setIsLoadingIndexComparison(true);
      setDefaultComparisonIndex(index);

      const startDate = performanceData[0].date;
      const endDate = performanceData[performanceData.length - 1].date;

      const monthlyDataResponse = await MarketService.getIndexMonthlyDataForComparison(
        index.id,
        startDate,
        endDate
      );

      if (monthlyDataResponse.success && monthlyDataResponse.data) {
        setComparisonIndexData(monthlyDataResponse.data);
        setShowComparison(true);
      }
    } catch (error) {
      console.error('Error loading index comparison:', error);
    } finally {
      setIsLoadingIndexComparison(false);
    }
  };

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenMode(isFullscreen());
    };
    const cleanup = onFullscreenChange(handleFullscreenChange);
    return cleanup;
  }, []);

  const handleFullscreenToggle = async () => {
    try {
      await toggleFullscreen(chartId);
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  // Get current value for empty state
  const currentValue = performanceData.length > 0
    ? performanceData[performanceData.length - 1].value
    : 0;

  return (
    <div
      id={chartId}
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: isFullscreenMode ? '0' : '12px',
        padding: '24px',
        position: 'relative',
        ...(isFullscreenMode && {
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw'
        })
      }}
    >
      {/* Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            backgroundColor: color || colors.brand.primary,
            display: 'inline-block'
          }} />
          Portfolio Performance - {assetTypeName}
        </h3>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* MoM Badge */}
          {latestMoMData && dataWithMoM.length > 1 && (
            <>
              {latestMoM !== null && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: latestMoM >= 0
                      ? colors.semantic.success + '20'
                      : colors.semantic.error + '20',
                    border: `1px solid ${latestMoM >= 0 ? colors.semantic.success : colors.semantic.error}40`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  <span style={{ fontSize: '12px' }}>
                    {latestMoM >= 0 ? '📈' : '📉'}
                  </span>
                  <span style={{
                    color: latestMoM >= 0 ? colors.semantic.success : colors.semantic.error
                  }}>
                    {getMoMArrow(latestMoM)} {Math.abs(latestMoM).toFixed(2)}%
                  </span>
                  <span style={{
                    fontSize: '10px',
                    color: colors.utility.secondaryText
                  }}>
                    returns MoM
                  </span>
                </div>
              )}
              {latestMoMData.isSignificantInvestment && latestMoMData.investmentChange > 0 && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: colors.brand.primary + '15',
                    border: `1px solid ${colors.brand.primary}30`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  <span style={{ fontSize: '12px' }}>💰</span>
                  <span style={{ color: colors.brand.primary }}>
                    +{formatCurrency(latestMoMData.investmentChange)}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    color: colors.utility.secondaryText
                  }}>
                    new investment
                  </span>
                </div>
              )}
            </>
          )}

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            borderRadius: '8px',
            overflow: 'hidden',
            border: `1px solid ${colors.utility.primaryText}20`
          }}>
            <button
              onClick={() => setChartViewMode('cumulative')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: chartViewMode === 'cumulative'
                  ? colors.brand.primary
                  : colors.utility.primaryBackground,
                color: chartViewMode === 'cumulative'
                  ? '#ffffff'
                  : colors.utility.secondaryText,
                transition: 'all 0.2s ease'
              }}
            >
              Cumulative
            </button>
            <button
              onClick={() => setChartViewMode('mom')}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                border: 'none',
                borderLeft: `1px solid ${colors.utility.primaryText}20`,
                cursor: 'pointer',
                backgroundColor: chartViewMode === 'mom'
                  ? colors.brand.primary
                  : colors.utility.primaryBackground,
                color: chartViewMode === 'mom'
                  ? '#ffffff'
                  : colors.utility.secondaryText,
                transition: 'all 0.2s ease'
              }}
            >
              MoM
            </button>
          </div>

          {/* Index Selector */}
          <div style={{ minWidth: '180px' }}>
            <IndexSelector
              selectedIndexId={defaultComparisonIndex?.id || null}
              onIndexSelect={handleIndexSelect}
              disabled={isLoadingIndexComparison}
              placeholder="Compare with index..."
            />
          </div>

          {/* Toggle comparison visibility */}
          {defaultComparisonIndex && comparisonIndexData.length > 0 && (
            <button
              onClick={() => setShowComparison(!showComparison)}
              title={showComparison ? 'Hide comparison' : 'Show comparison'}
              style={{
                padding: '6px 10px',
                backgroundColor: showComparison ? colors.brand.primary + '20' : 'transparent',
                color: showComparison ? colors.brand.primary : colors.utility.secondaryText,
                border: `1px solid ${showComparison ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              {showComparison ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          )}

          {/* Fullscreen Button */}
          {isFullscreenSupported() && (
            <button
              onClick={handleFullscreenToggle}
              title={isFullscreenMode ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
              style={{
                padding: '6px 12px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              {isFullscreenMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {isFullscreenMode ? 'Exit' : 'Fullscreen'}
            </button>
          )}

          {/* Export Button */}
          <ChartExport
            elementId={chartId}
            indexName={assetTypeName}
            colors={colors}
          />
        </div>
      </div>

      {/* Chart Area */}
      <div style={{
        height: isFullscreenMode ? 'auto' : `${height}px`,
        flex: isFullscreenMode ? 1 : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: isFullscreenMode ? '400px' : 'auto'
      }}>
        {dataWithMoM && dataWithMoM.length > 1 ? (
          <div style={{ width: '100%', height: '100%' }}>
            <PerformanceComparisonChart
              data={dataWithMoM.map(p => ({
                date: p.date,
                value: p.value ?? 0,
                invested: p.invested,
                returns: p.returns,
                returnPercentage: p.return_percentage,
                momChangePercentage: p.returns_mom_percentage,
                isSignificantInvestment: p.is_significant_investment
              }))}
              comparisonData={chartViewMode === 'mom' ? indexMoMData : comparisonIndexData}
              comparisonName={defaultComparisonIndex?.index_name || 'Index'}
              showComparison={showComparison && !isLoadingIndexComparison && (chartViewMode === 'mom' ? indexMoMData.length > 0 : comparisonIndexData.length > 0)}
              viewMode={chartViewMode === 'mom' ? 'mom' : 'percentage'}
              height={isFullscreenMode ? window.innerHeight - 200 : height}
              primaryLabel={assetTypeName}
              primaryColor={color}
            />
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textAlign: 'center',
              marginTop: '8px'
            }}>
              {chartViewMode === 'cumulative'
                ? `Showing cumulative % returns from start (${dataWithMoM.length} months)`
                : `Showing month-over-month % changes (${dataWithMoM.length} months)`
              }
              {showComparison && defaultComparisonIndex && (chartViewMode === 'mom' ? indexMoMData.length > 0 : comparisonIndexData.length > 0) && (
                <span style={{ marginLeft: '8px', color: '#FCD34D' }}>
                  • vs {defaultComparisonIndex.index_name}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '48px',
              fontWeight: '700',
              color: color || colors.brand.primary,
              marginBottom: '12px'
            }}>
              {formatCurrency(currentValue)}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '8px'
            }}>
              Current {assetTypeName} Value
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              fontStyle: 'italic'
            }}>
              Historical performance data will appear as more data is recorded
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetTypePerformanceChart;
