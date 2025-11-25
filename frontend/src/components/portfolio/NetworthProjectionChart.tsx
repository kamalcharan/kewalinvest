// frontend/src/components/portfolio/NetworthProjectionChart.tsx
import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNetworthHistory, useNetworthSummary } from '../../hooks/usePortfolioData';
import PerformanceSparkline from '../visualizations/PerformanceSparkline';
import { PortfolioService } from '../../services/portfolio.service';

interface NetworthProjectionChartProps {
  customerId: number;
  familyHeadIwellcode?: string;
  height?: number;
}

type TimeframePeriod = '3M' | '6M' | '1Y' | '24M';

interface AssetTypeSelection {
  code: string;
  name: string;
  selected: boolean;
  color: string;
}

export const NetworthProjectionChart: React.FC<NetworthProjectionChartProps> = ({
  customerId,
  familyHeadIwellcode,
  height = 300
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // State
  const [timeframePeriod, setTimeframePeriod] = useState<TimeframePeriod>('1Y');
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>(['ALL']);
  const [assumptionRate, setAssumptionRate] = useState(8); // Default 8% annual growth

  // Calculate date range based on timeframe
  const dateRange = useMemo(() => {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month

    let historicalMonths: number;
    let projectionMonths: number;

    switch (timeframePeriod) {
      case '3M':
        historicalMonths = 3;
        projectionMonths = 3;
        break;
      case '6M':
        historicalMonths = 6;
        projectionMonths = 6;
        break;
      case '1Y':
        historicalMonths = 12;
        projectionMonths = 12;
        break;
      case '24M':
        historicalMonths = 12;
        projectionMonths = 12;
        break;
      default:
        historicalMonths = 12;
        projectionMonths = 12;
    }

    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - historicalMonths);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      historicalMonths,
      projectionMonths
    };
  }, [timeframePeriod]);

  // Fetch data
  const { data: summaryData, isLoading: summaryLoading } = useNetworthSummary(
    { customerId, familyHeadIwellcode },
    { enabled: !!customerId || !!familyHeadIwellcode }
  );

  const { data: historyData, isLoading: historyLoading } = useNetworthHistory(
    {
      customerId,
      familyHeadIwellcode,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    },
    { enabled: !!customerId || !!familyHeadIwellcode }
  );

  // Build asset type options from summary data
  const assetTypeOptions = useMemo((): AssetTypeSelection[] => {
    if (!summaryData?.data?.by_asset_type) return [];

    return [
      { code: 'ALL', name: 'All Assets', selected: selectedAssetTypes.includes('ALL'), color: colors.brand.primary },
      ...summaryData.data.by_asset_type.map(at => ({
        code: at.asset_type_code,
        name: at.asset_type_name,
        selected: selectedAssetTypes.includes(at.asset_type_code),
        color: PortfolioService.getAssetTypeColor(at.asset_type_code)
      }))
    ];
  }, [summaryData, selectedAssetTypes, colors.brand.primary]);

  // Process historical data
  const historicalValues = useMemo(() => {
    if (!historyData?.data?.history) return [];

    return historyData.data.history.map(point => {
      if (selectedAssetTypes.includes('ALL')) {
        return point.total_networth;
      }

      // Sum only selected asset types
      return point.by_asset_type
        .filter(at => selectedAssetTypes.includes(at.asset_type_code))
        .reduce((sum, at) => sum + at.current_value, 0);
    });
  }, [historyData, selectedAssetTypes]);

  // Calculate projections
  const projectionValues = useMemo(() => {
    if (historicalValues.length === 0) return [];

    const lastValue = historicalValues[historicalValues.length - 1];
    const monthlyGrowthRate = Math.pow(1 + assumptionRate / 100, 1 / 12) - 1;

    const projections: number[] = [];
    let currentValue = lastValue;

    for (let i = 0; i < dateRange.projectionMonths; i++) {
      currentValue = currentValue * (1 + monthlyGrowthRate);
      projections.push(Math.round(currentValue));
    }

    return projections;
  }, [historicalValues, assumptionRate, dateRange.projectionMonths]);

  // Handle asset type selection
  const handleAssetTypeToggle = (code: string) => {
    if (code === 'ALL') {
      setSelectedAssetTypes(['ALL']);
    } else {
      const newSelection = selectedAssetTypes.filter(c => c !== 'ALL');

      if (newSelection.includes(code)) {
        const filtered = newSelection.filter(c => c !== code);
        setSelectedAssetTypes(filtered.length > 0 ? filtered : ['ALL']);
      } else {
        setSelectedAssetTypes([...newSelection, code]);
      }
    }
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const isLoading = summaryLoading || historyLoading;

  if (isLoading) {
    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: height + 100
      }}>
        <div style={{ color: colors.utility.secondaryText }}>Loading networth data...</div>
      </div>
    );
  }

  if (!summaryData?.data || historicalValues.length === 0) {
    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: height + 100,
        flexDirection: 'column',
        gap: '8px'
      }}>
        <TrendingUp size={32} style={{ color: colors.utility.secondaryText, opacity: 0.5 }} />
        <div style={{ color: colors.utility.secondaryText }}>No networth history available</div>
      </div>
    );
  }

  const currentNetworth = historicalValues[historicalValues.length - 1];
  const projectedNetworth = projectionValues[projectionValues.length - 1] || currentNetworth;
  const projectedGrowth = ((projectedNetworth - currentNetworth) / currentNetworth) * 100;

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <TrendingUp size={20} />
            Networth Projection
          </h3>
          <p style={{
            fontSize: '13px',
            color: colors.utility.secondaryText,
            margin: '4px 0 0 0'
          }}>
            Historical performance + projected growth @ {assumptionRate}% p.a.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Timeframe selector */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['3M', '6M', '1Y', '24M'] as TimeframePeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setTimeframePeriod(period)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: timeframePeriod === period ? colors.brand.primary : 'transparent',
                  color: timeframePeriod === period ? 'white' : colors.utility.secondaryText,
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Asset selector dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAssetSelector(!showAssetSelector)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${colors.utility.primaryText}20`,
                backgroundColor: 'transparent',
                color: colors.utility.primaryText,
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {selectedAssetTypes.includes('ALL') ? 'All Assets' : `${selectedAssetTypes.length} selected`}
              {showAssetSelector ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showAssetSelector && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 100,
                minWidth: '180px',
                padding: '8px'
              }}>
                {assetTypeOptions.map(option => (
                  <label
                    key={option.code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssetTypes.includes(option.code)}
                      onChange={() => handleAssetTypeToggle(option.code)}
                      style={{ accentColor: option.color }}
                    />
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: option.color
                      }}
                    />
                    <span style={{
                      fontSize: '13px',
                      color: colors.utility.primaryText
                    }}>
                      {option.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Current Networth */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px',
          borderLeft: `4px solid ${colors.brand.primary}`
        }}>
          <div style={{ fontSize: '11px', color: colors.utility.secondaryText, textTransform: 'uppercase', fontWeight: '600' }}>
            Current
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: colors.utility.primaryText }}>
            {formatCurrency(currentNetworth)}
          </div>
        </div>

        {/* Projected Networth */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px',
          borderLeft: '4px solid #10B981'
        }}>
          <div style={{ fontSize: '11px', color: colors.utility.secondaryText, textTransform: 'uppercase', fontWeight: '600' }}>
            Projected ({dateRange.projectionMonths}M)
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#10B981' }}>
            {formatCurrency(projectedNetworth)}
          </div>
        </div>

        {/* Expected Growth */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px',
          borderLeft: `4px solid ${projectedGrowth >= 0 ? '#10B981' : '#EF4444'}`
        }}>
          <div style={{ fontSize: '11px', color: colors.utility.secondaryText, textTransform: 'uppercase', fontWeight: '600' }}>
            Expected Growth
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: projectedGrowth >= 0 ? '#10B981' : '#EF4444'
          }}>
            +{projectedGrowth.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <PerformanceSparkline
          data={historicalValues}
          projectionData={projectionValues}
          showProjection={true}
          width={600}
          height={height - 20}
          showArea={true}
          showDots={true}
          interactive={true}
          showTimelineMarkers={true}
          timelineMarkerSize={5}
        />
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        marginTop: '16px',
        fontSize: '12px',
        color: colors.utility.secondaryText
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '24px',
            height: '3px',
            backgroundColor: '#10B981',
            borderRadius: '2px'
          }} />
          <span>Historical</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '24px',
            height: '3px',
            backgroundColor: '#10B981',
            borderRadius: '2px',
            backgroundImage: 'repeating-linear-gradient(90deg, #10B981 0px, #10B981 6px, transparent 6px, transparent 10px)'
          }} />
          <span>Projected @ {assumptionRate}% p.a.</span>
        </div>
      </div>

      {/* Assumption Rate Slider */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <span style={{ fontSize: '12px', color: colors.utility.secondaryText, whiteSpace: 'nowrap' }}>
          Growth Rate:
        </span>
        <input
          type="range"
          min="4"
          max="15"
          step="0.5"
          value={assumptionRate}
          onChange={e => setAssumptionRate(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: colors.brand.primary }}
        />
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: colors.brand.primary,
          minWidth: '45px'
        }}>
          {assumptionRate}%
        </span>
      </div>
    </div>
  );
};

export default NetworthProjectionChart;
