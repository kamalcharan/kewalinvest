// frontend/src/components/portfolio/NetworthProjectionChart.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Target, ArrowDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNetworthHistory, useNetworthSummary, useAssetTypes } from '../../hooks/usePortfolioData';
import { PortfolioService } from '../../services/portfolio.service';

interface NetworthProjectionChartProps {
  customerId: number;
  familyHeadIwellcode?: string;
  height?: number;
  goals?: GoalMarker[];
  withdrawals?: WithdrawalMarker[];
}

interface GoalMarker {
  id: number;
  name: string;
  targetAmount: number;
  targetDate: string; // YYYY-MM-DD
}

interface WithdrawalMarker {
  id: number;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
}

type TimeframePeriod = '1M' | '3M' | '6M' | '1Y' | '24M';

interface AssetTypeSelection {
  code: string;
  name: string;
  selected: boolean;
  color: string;
  hasData: boolean; // Whether customer has this asset type
}

export const NetworthProjectionChart: React.FC<NetworthProjectionChartProps> = ({
  customerId,
  familyHeadIwellcode,
  height = 300,
  goals = [],
  withdrawals = []
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Responsive chart width
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(800);

  useEffect(() => {
    const updateWidth = () => {
      if (chartContainerRef.current) {
        setChartWidth(chartContainerRef.current.offsetWidth - 80); // Account for padding and axis
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

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
      case '1M':
        historicalMonths = 1;
        projectionMonths = 1;
        break;
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

  // Fetch ALL asset types from master data (DB-driven)
  const { data: assetTypesData } = useAssetTypes();

  // Build asset type options from MASTER DATA + summary data
  const assetTypeOptions = useMemo((): AssetTypeSelection[] => {
    const options: AssetTypeSelection[] = [
      { code: 'ALL', name: 'All Assets', selected: selectedAssetTypes.includes('ALL'), color: colors.brand.primary, hasData: true }
    ];

    // Get asset types that customer actually has
    const customerAssetTypes = new Set(
      summaryData?.data?.by_asset_type?.map(at => at.asset_type_code) || []
    );

    // Use master data for all asset types
    const masterAssetTypes = assetTypesData?.data?.asset_types || assetTypesData?.asset_types || [];

    if (masterAssetTypes.length > 0) {
      // Add all asset types from master data
      masterAssetTypes.forEach(at => {
        options.push({
          code: at.asset_type_code,
          name: at.asset_type_name,
          selected: selectedAssetTypes.includes(at.asset_type_code),
          color: PortfolioService.getAssetTypeColor(at.asset_type_code),
          hasData: customerAssetTypes.has(at.asset_type_code)
        });
      });
    } else if (summaryData?.data?.by_asset_type) {
      // Fallback to summary data if master data not loaded
      summaryData.data.by_asset_type.forEach(at => {
        options.push({
          code: at.asset_type_code,
          name: at.asset_type_name,
          selected: selectedAssetTypes.includes(at.asset_type_code),
          color: PortfolioService.getAssetTypeColor(at.asset_type_code),
          hasData: true
        });
      });
    }

    return options;
  }, [summaryData, assetTypesData, selectedAssetTypes, colors.brand.primary]);

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

  // Historical dates for X-axis
  const historicalDates = useMemo(() => {
    if (!historyData?.data?.history) return [];
    return historyData.data.history.map(point => point.date);
  }, [historyData]);

  // Calculate projections with withdrawals
  const { projectionValues, projectionDates, withdrawalIndices } = useMemo(() => {
    if (historicalValues.length === 0) return { projectionValues: [], projectionDates: [], withdrawalIndices: [] };

    const lastValue = historicalValues[historicalValues.length - 1];
    const monthlyGrowthRate = Math.pow(1 + assumptionRate / 100, 1 / 12) - 1;

    const projections: number[] = [];
    const dates: string[] = [];
    const withdrawalIdx: number[] = [];

    let currentValue = lastValue;
    const now = new Date();

    // Sort withdrawals by date
    const sortedWithdrawals = [...withdrawals].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 0; i < dateRange.projectionMonths; i++) {
      const projDate = new Date(now);
      projDate.setMonth(projDate.getMonth() + i + 1);
      const dateStr = projDate.toISOString().split('T')[0].slice(0, 7); // YYYY-MM

      // Apply growth
      currentValue = currentValue * (1 + monthlyGrowthRate);

      // Check for withdrawals this month
      const monthWithdrawals = sortedWithdrawals.filter(w => {
        const wDate = w.date.slice(0, 7);
        return wDate === dateStr;
      });

      if (monthWithdrawals.length > 0) {
        const totalWithdrawal = monthWithdrawals.reduce((sum, w) => sum + w.amount, 0);
        currentValue = currentValue - totalWithdrawal;
        withdrawalIdx.push(historicalValues.length + i);
      }

      projections.push(Math.round(Math.max(0, currentValue)));
      dates.push(projDate.toISOString().split('T')[0]);
    }

    return { projectionValues: projections, projectionDates: dates, withdrawalIndices: withdrawalIdx };
  }, [historicalValues, assumptionRate, dateRange.projectionMonths, withdrawals]);

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

  // Format for Y-axis (shorter)
  const formatYAxis = (value: number): string => {
    if (value >= 10000000) {
      return `${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) {
      return `${(value / 100000).toFixed(0)}L`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
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
        <div style={{ color: colors.utility.secondaryText }}>
          No networth history available
        </div>
      </div>
    );
  }

  const currentNetworth = historicalValues[historicalValues.length - 1];
  const projectedNetworth = projectionValues[projectionValues.length - 1] || currentNetworth;
  const projectedGrowth = ((projectedNetworth - currentNetworth) / currentNetworth) * 100;

  // Combine all values for scale calculation
  const allValues = [...historicalValues, ...projectionValues];
  const minValue = Math.min(...allValues) * 0.95;
  const maxValue = Math.max(...allValues) * 1.05;
  const valueRange = maxValue - minValue;

  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartInnerWidth = chartWidth - padding.left - padding.right;

  // Scale functions
  const xScale = (index: number) => padding.left + (index / (allValues.length - 1)) * chartInnerWidth;
  const yScale = (value: number) => padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

  // Generate paths
  const historicalPath = historicalValues
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale(v)}`)
    .join(' ');

  // Projection path - connect from last historical point
  const projectionStartX = xScale(historicalValues.length - 1);
  const projectionStartY = yScale(historicalValues[historicalValues.length - 1]);

  // Build projection path with segments (green for growth, red for withdrawal drops)
  const projectionSegments: { path: string; color: string }[] = [];
  let currentPath = `M ${projectionStartX},${projectionStartY}`;
  let prevValue = historicalValues[historicalValues.length - 1];
  let segmentStart = historicalValues.length - 1;
  let isWithdrawalSegment = false;

  projectionValues.forEach((v, i) => {
    const pointIndex = historicalValues.length + i;
    const x = xScale(pointIndex);
    const y = yScale(v);
    const isWithdrawal = withdrawalIndices.includes(pointIndex);
    const isDecreasing = v < prevValue;

    // Check if we need to start a new segment
    if (isWithdrawal && !isWithdrawalSegment) {
      // Save current green segment and start red
      if (currentPath !== `M ${projectionStartX},${projectionStartY}`) {
        projectionSegments.push({ path: currentPath, color: '#10B981' }); // Green
      }
      currentPath = `M ${xScale(pointIndex - 1)},${yScale(projectionValues[i - 1] || historicalValues[historicalValues.length - 1])}`;
      isWithdrawalSegment = true;
    } else if (!isDecreasing && isWithdrawalSegment) {
      // End red segment and start green
      projectionSegments.push({ path: currentPath + ` L ${x},${y}`, color: '#EF4444' }); // Red
      currentPath = `M ${x},${y}`;
      isWithdrawalSegment = false;
    }

    currentPath += ` L ${x},${y}`;
    prevValue = v;
  });

  // Add final segment
  if (currentPath.includes('L')) {
    projectionSegments.push({
      path: currentPath,
      color: isWithdrawalSegment ? '#EF4444' : '#10B981'
    });
  }

  // If no segments created, create single green projection
  if (projectionSegments.length === 0 && projectionValues.length > 0) {
    let fullPath = `M ${projectionStartX},${projectionStartY}`;
    projectionValues.forEach((v, i) => {
      fullPath += ` L ${xScale(historicalValues.length + i)},${yScale(v)}`;
    });
    projectionSegments.push({ path: fullPath, color: '#10B981' });
  }

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    minValue + (valueRange * i) / (yTicks - 1)
  );

  // X-axis labels (show every few months)
  const allDates = [...historicalDates, ...projectionDates];
  const xTickInterval = Math.max(1, Math.floor(allDates.length / 6));

  // Dot size - DOUBLED as requested
  const dotSize = 10;

  return (
    <div
      ref={chartContainerRef}
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        width: '100%'
      }}
    >
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
          {/* Timeframe selector - NOW INCLUDES 1M */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['1M', '3M', '6M', '1Y', '24M'] as TimeframePeriod[]).map(period => (
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
                minWidth: '200px',
                padding: '8px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {assetTypeOptions.map(option => (
                  <label
                    key={option.code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      cursor: option.hasData || option.code === 'ALL' ? 'pointer' : 'not-allowed',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s',
                      opacity: option.hasData || option.code === 'ALL' ? 1 : 0.5
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssetTypes.includes(option.code)}
                      onChange={() => handleAssetTypeToggle(option.code)}
                      disabled={!option.hasData && option.code !== 'ALL'}
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
                      color: colors.utility.primaryText,
                      flex: 1
                    }}>
                      {option.name}
                    </span>
                    {!option.hasData && option.code !== 'ALL' && (
                      <span style={{
                        fontSize: '10px',
                        color: colors.utility.secondaryText,
                        fontStyle: 'italic'
                      }}>
                        (no data)
                      </span>
                    )}
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
            {projectedGrowth >= 0 ? '+' : ''}{projectedGrowth.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart with X and Y axes */}
      <div style={{ width: '100%', overflow: 'visible' }}>
        <svg width={chartWidth} height={height} style={{ overflow: 'visible' }}>
          {/* Y-axis */}
          <g>
            {/* Y-axis line */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={padding.left}
              y2={padding.top + chartHeight}
              stroke={colors.utility.primaryText + '30'}
              strokeWidth="1"
            />
            {/* Y-axis ticks and labels */}
            {yTickValues.map((value, i) => {
              const y = yScale(value);
              return (
                <g key={i}>
                  <line
                    x1={padding.left - 5}
                    y1={y}
                    x2={padding.left}
                    y2={y}
                    stroke={colors.utility.primaryText + '50'}
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill={colors.utility.secondaryText}
                  >
                    {formatYAxis(value)}
                  </text>
                  {/* Grid line */}
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + chartInnerWidth}
                    y2={y}
                    stroke={colors.utility.primaryText + '10'}
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                </g>
              );
            })}
          </g>

          {/* X-axis */}
          <g>
            {/* X-axis line */}
            <line
              x1={padding.left}
              y1={padding.top + chartHeight}
              x2={padding.left + chartInnerWidth}
              y2={padding.top + chartHeight}
              stroke={colors.utility.primaryText + '30'}
              strokeWidth="1"
            />
            {/* X-axis labels */}
            {allDates.map((date, i) => {
              if (i % xTickInterval !== 0 && i !== allDates.length - 1) return null;
              const x = xScale(i);
              const isProjection = i >= historicalValues.length;
              const dateObj = new Date(date);
              const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1={padding.top + chartHeight}
                    x2={x}
                    y2={padding.top + chartHeight + 5}
                    stroke={colors.utility.primaryText + '50'}
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={padding.top + chartHeight + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fill={isProjection ? '#10B981' : colors.utility.secondaryText}
                    fontStyle={isProjection ? 'italic' : 'normal'}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Vertical line separating historical from projection */}
          {historicalValues.length > 0 && projectionValues.length > 0 && (
            <line
              x1={xScale(historicalValues.length - 1)}
              y1={padding.top}
              x2={xScale(historicalValues.length - 1)}
              y2={padding.top + chartHeight}
              stroke={colors.utility.primaryText + '20'}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )}

          {/* Historical line (solid green) */}
          <path
            d={historicalPath}
            fill="none"
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Projection segments (green for growth, red for withdrawal drops) */}
          {projectionSegments.map((segment, i) => (
            <path
              key={i}
              d={segment.path}
              fill="none"
              stroke={segment.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8,4"
              opacity="0.9"
            />
          ))}

          {/* Historical dots - DOUBLED SIZE */}
          {historicalValues.map((value, i) => (
            <circle
              key={`hist-${i}`}
              cx={xScale(i)}
              cy={yScale(value)}
              r={dotSize / 2}
              fill="#10B981"
              stroke="white"
              strokeWidth="2"
            />
          ))}

          {/* Projection dots - DOUBLED SIZE */}
          {projectionValues.map((value, i) => {
            const pointIndex = historicalValues.length + i;
            const isWithdrawal = withdrawalIndices.includes(pointIndex);
            const dotColor = isWithdrawal ? '#EF4444' : '#10B981';

            return (
              <circle
                key={`proj-${i}`}
                cx={xScale(pointIndex)}
                cy={yScale(value)}
                r={dotSize / 2}
                fill="white"
                stroke={dotColor}
                strokeWidth="2.5"
                strokeDasharray={isWithdrawal ? "0" : "2,2"}
              />
            );
          })}

          {/* Goal markers */}
          {goals.map(goal => {
            const targetDate = new Date(goal.targetDate);
            const now = new Date();
            const monthsFromNow = (targetDate.getFullYear() - now.getFullYear()) * 12 +
              (targetDate.getMonth() - now.getMonth());

            if (monthsFromNow <= 0 || monthsFromNow > dateRange.projectionMonths) return null;

            const index = historicalValues.length + monthsFromNow - 1;
            if (index >= allValues.length) return null;

            const x = xScale(index);
            const y = yScale(goal.targetAmount);

            return (
              <g key={`goal-${goal.id}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + chartHeight}
                  stroke="#F59E0B"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.6"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={12}
                  fill="#F59E0B"
                  stroke="white"
                  strokeWidth="2"
                />
                <Target size={14} x={x - 7} y={y - 7} color="white" />
                <text
                  x={x}
                  y={y - 20}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#F59E0B"
                  fontWeight="600"
                >
                  {goal.name}
                </text>
              </g>
            );
          })}

          {/* Withdrawal markers */}
          {withdrawals.map(withdrawal => {
            const wDate = new Date(withdrawal.date);
            const now = new Date();
            const monthsFromNow = (wDate.getFullYear() - now.getFullYear()) * 12 +
              (wDate.getMonth() - now.getMonth());

            if (monthsFromNow <= 0 || monthsFromNow > dateRange.projectionMonths) return null;

            const index = historicalValues.length + monthsFromNow - 1;
            if (index >= allValues.length) return null;

            const x = xScale(index);
            const y = yScale(projectionValues[monthsFromNow - 1] || 0);

            return (
              <g key={`withdrawal-${withdrawal.id}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={10}
                  fill="#EF4444"
                  stroke="white"
                  strokeWidth="2"
                />
                <ArrowDown size={12} x={x - 6} y={y - 6} color="white" />
                <text
                  x={x}
                  y={y + 22}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#EF4444"
                  fontWeight="600"
                >
                  -{formatCurrency(withdrawal.amount)}
                </text>
              </g>
            );
          })}
        </svg>
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
        {withdrawals.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '24px',
              height: '3px',
              backgroundColor: '#EF4444',
              borderRadius: '2px'
            }} />
            <span>Withdrawal Impact</span>
          </div>
        )}
      </div>

      {/* Assumption Rate Slider - MAX INCREASED TO 30% */}
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
          max="30"
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
