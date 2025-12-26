// frontend/src/components/portfolio/NetworthProjectionChart.tsx
// Supports both: Customer Networth View (customerId) and Individual Goal View (goalId)
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Target, ArrowDown, Maximize2, Minimize2, Camera } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNetworthHistory, useNetworthSummary } from '../../hooks/usePortfolioData';
import { useGoal, useGoalHistory } from '../../hooks/useGoals';
import { PortfolioService } from '../../services/portfolio.service';
import { isTimeAndPriceGoal, isPriceBasedGoal, isTimeBasedGoal } from '../../types/goal.types';
import { toggleFullscreen, isFullscreen, onFullscreenChange, isFullscreenSupported } from '../../utils/fullscreenUtils';
import { exportChartToPNG, generateFilename } from '../../utils/exportUtils';

interface NetworthProjectionChartProps {
  // Customer networth mode (provide customerId)
  customerId?: number;
  familyHeadIwellcode?: string;
  // Goal progress mode (provide goalId)
  goalId?: number;
  // Common props
  height?: number;
  goals?: GoalMarker[];
  withdrawals?: WithdrawalMarker[];
  showProjection?: boolean;
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

type TimeframePeriod = '1M' | '1Y' | '2Y' | '3Y' | '4Y' | '5Y' | 'CUSTOM';
type DataGranularity = 'monthly' | 'quarterly' | '6months' | 'yearly';
type ChartType = 'line' | 'smooth' | 'area';

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
  goalId,
  height = 300,
  goals = [],
  withdrawals = [],
  showProjection = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Determine mode: Goal view or Customer Networth view
  const isGoalMode = !!goalId;

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
  const [customYears, setCustomYears] = useState<number>(10); // For extended projections (6-20 years)
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>(['ALL']);
  const [assumptionRate, setAssumptionRate] = useState(8); // Default 8% annual growth
  const [dataGranularity, setDataGranularity] = useState<DataGranularity>('monthly');
  const [chartType, setChartType] = useState<ChartType>('line');

  // Fullscreen state
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  // Chart element ID for fullscreen and export
  const chartElementId = `networth-projection-chart-${customerId || goalId || 'default'}`;

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenMode(isFullscreen());
    };
    const cleanup = onFullscreenChange(handleFullscreenChange);
    return cleanup;
  }, []);

  // Fullscreen handler
  const handleFullscreenToggle = useCallback(async () => {
    try {
      await toggleFullscreen(chartElementId);
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, [chartElementId]);

  // Tooltip state
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // ===== GOAL MODE: Fetch goal data =====
  // Hooks have built-in enabled: goalId > 0, so they won't fetch if goalId is 0
  const { data: goalData, isLoading: goalLoading } = useGoal(goalId || 0);
  const { data: goalHistoryData, isLoading: goalHistoryLoading } = useGoalHistory(goalId || 0);

  // Export PNG handler (must be after goalData is declared)
  const handleExportPNG = useCallback(async () => {
    try {
      setExportStatus('exporting');
      const filename = generateFilename(
        isGoalMode ? (goalData?.title || 'Goal') : 'Networth',
        'projection-chart'
      );
      const result = await exportChartToPNG(chartElementId, { filename });
      if (result.success) {
        setExportStatus('success');
        setTimeout(() => setExportStatus('idle'), 2000);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    }
  }, [chartElementId, isGoalMode, goalData]);

  // Extract goal-specific data
  const goalConfig = useMemo(() => {
    if (!isGoalMode || !goalData) return null;
    const cfg = goalData.config_data;

    let targetAmount: number | null = null;
    let targetDate: string | null = null;
    let goalWithdrawals: WithdrawalMarker[] = [];

    if (isTimeAndPriceGoal(cfg)) {
      targetAmount = cfg.target_amount;
      targetDate = cfg.target_date;
      goalWithdrawals = (cfg.withdrawals || []).map((w, idx) => ({
        id: idx,
        name: w.reason || 'Withdrawal',
        amount: w.amount,
        date: w.withdrawal_date
      }));
    } else if (isPriceBasedGoal(cfg)) {
      targetAmount = cfg.target_amount;
      targetDate = cfg.projected_achievement_date || null;
      goalWithdrawals = (cfg.withdrawals || []).map((w, idx) => ({
        id: idx,
        name: w.reason || 'Withdrawal',
        amount: w.amount,
        date: w.withdrawal_date
      }));
    } else if (isTimeBasedGoal(cfg)) {
      targetDate = cfg.target_date;
      targetAmount = cfg.projected_corpus || null;
      goalWithdrawals = (cfg.withdrawals || []).map((w, idx) => ({
        id: idx,
        name: w.reason || 'Withdrawal',
        amount: w.amount,
        date: w.withdrawal_date
      }));
    }

    return {
      title: goalData.title,
      targetAmount,
      targetDate,
      withdrawals: goalWithdrawals,
      currentValue: cfg.current_value || 0,
      monthlyContribution: cfg.monthly_contribution || 0
    };
  }, [isGoalMode, goalData]);

  // Goal history values
  const goalHistoricalData = useMemo(() => {
    if (!isGoalMode || !goalHistoryData || goalHistoryData.length === 0) {
      return { values: [], dates: [] };
    }
    const sorted = [...goalHistoryData].sort((a, b) =>
      new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
    );
    return {
      values: sorted.map(s => s.current_value),
      dates: sorted.map(s => s.snapshot_date)
    };
  }, [isGoalMode, goalHistoryData]);

  // Effective withdrawals: use goal's withdrawals in goal mode, otherwise use prop
  const effectiveWithdrawals = isGoalMode ? (goalConfig?.withdrawals || []) : withdrawals;

  // Calculate date range based on timeframe
  // Always fetch 24 months of history to ensure data availability, then filter on frontend
  const dateRange = useMemo(() => {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month

    // Always fetch 24 months of history to ensure we have data
    const fetchStartDate = new Date(now);
    fetchStartDate.setMonth(fetchStartDate.getMonth() - 24);

    // Determine how many months to DISPLAY based on timeframe
    let displayHistoricalMonths: number;
    let projectionMonths: number;

    switch (timeframePeriod) {
      case '1M':
        displayHistoricalMonths = 1;
        projectionMonths = 1;
        break;
      case '1Y':
        displayHistoricalMonths = 12;
        projectionMonths = 12;
        break;
      case '2Y':
        displayHistoricalMonths = 24;
        projectionMonths = 24;
        break;
      case '3Y':
        displayHistoricalMonths = 24; // Show max 24 months history
        projectionMonths = 36;
        break;
      case '4Y':
        displayHistoricalMonths = 24;
        projectionMonths = 48;
        break;
      case '5Y':
        displayHistoricalMonths = 24;
        projectionMonths = 60;
        break;
      case 'CUSTOM':
        displayHistoricalMonths = 24;
        projectionMonths = customYears * 12; // Convert years to months
        break;
      default:
        displayHistoricalMonths = 12;
        projectionMonths = 12;
    }

    return {
      startDate: fetchStartDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      displayHistoricalMonths,
      projectionMonths
    };
  }, [timeframePeriod, customYears]);

  // ===== CUSTOMER MODE: Fetch networth data =====
  const { data: summaryData, isLoading: summaryLoading } = useNetworthSummary(
    { customerId: customerId || 0, familyHeadIwellcode },
    { enabled: !isGoalMode && (!!customerId || !!familyHeadIwellcode) }
  );

  const { data: historyData, isLoading: historyLoading } = useNetworthHistory(
    {
      customerId: customerId || 0,
      familyHeadIwellcode,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    },
    { enabled: !isGoalMode && (!!customerId || !!familyHeadIwellcode) }
  );

  // Build asset type options from customer's actual asset types only
  // Only shows asset types the customer has data for (not all master data)
  const assetTypeOptions = useMemo((): AssetTypeSelection[] => {
    const options: AssetTypeSelection[] = [
      { code: 'ALL', name: 'All Assets', selected: selectedAssetTypes.includes('ALL'), color: colors.brand.primary, hasData: true }
    ];

    // Only add asset types that customer actually has (from by_asset_type)
    if (summaryData?.data?.by_asset_type) {
      summaryData.data.by_asset_type.forEach(at => {
        options.push({
          code: at.asset_type_code,
          name: at.asset_type_name,
          selected: selectedAssetTypes.includes(at.asset_type_code),
          color: PortfolioService.getAssetTypeColor(at.asset_type_code),
          hasData: true // All items shown are selectable
        });
      });
    }

    return options;
  }, [summaryData, selectedAssetTypes, colors.brand.primary]);

  // Process historical data - slice to display only the requested months
  // Works for both goal mode and customer networth mode
  const historicalValues = useMemo(() => {
    // GOAL MODE: Use goal history data
    if (isGoalMode) {
      if (goalHistoricalData.values.length === 0) return [];
      const sliceCount = Math.min(dateRange.displayHistoricalMonths, goalHistoricalData.values.length);
      return goalHistoricalData.values.slice(-sliceCount);
    }

    // CUSTOMER MODE: Use networth history data
    if (!historyData?.data?.history || historyData.data.history.length === 0) return [];

    const allValues = historyData.data.history.map(point => {
      if (selectedAssetTypes.includes('ALL')) {
        return point.total_networth;
      }
      return point.by_asset_type
        .filter(at => selectedAssetTypes.includes(at.asset_type_code))
        .reduce((sum, at) => sum + at.current_value, 0);
    });

    const sliceCount = Math.min(dateRange.displayHistoricalMonths, allValues.length);
    return allValues.slice(-sliceCount);
  }, [isGoalMode, goalHistoricalData, historyData, selectedAssetTypes, dateRange.displayHistoricalMonths]);

  // Historical dates for X-axis - also sliced to match
  const historicalDates = useMemo(() => {
    // GOAL MODE
    if (isGoalMode) {
      if (goalHistoricalData.dates.length === 0) return [];
      const sliceCount = Math.min(dateRange.displayHistoricalMonths, goalHistoricalData.dates.length);
      return goalHistoricalData.dates.slice(-sliceCount);
    }

    // CUSTOMER MODE
    if (!historyData?.data?.history || historyData.data.history.length === 0) return [];
    const allDates = historyData.data.history.map(point => point.date);
    const sliceCount = Math.min(dateRange.displayHistoricalMonths, allDates.length);
    return allDates.slice(-sliceCount);
  }, [isGoalMode, goalHistoricalData, historyData, dateRange.displayHistoricalMonths]);

  // Calculate projections with withdrawals
  const { projectionValues, projectionDates, withdrawalIndices } = useMemo(() => {
    if (!showProjection || historicalValues.length === 0) {
      return { projectionValues: [], projectionDates: [], withdrawalIndices: [] };
    }

    const lastValue = historicalValues[historicalValues.length - 1];
    const monthlyGrowthRate = Math.pow(1 + assumptionRate / 100, 1 / 12) - 1;

    // In goal mode, also add monthly contribution
    const monthlyContribution = isGoalMode ? (goalConfig?.monthlyContribution || 0) : 0;

    const projections: number[] = [];
    const dates: string[] = [];
    const withdrawalIdx: number[] = [];

    let currentValue = lastValue;
    const now = new Date();

    // Use effectiveWithdrawals (goal's withdrawals in goal mode, prop withdrawals in customer mode)
    const sortedWithdrawals = [...effectiveWithdrawals].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 0; i < dateRange.projectionMonths; i++) {
      const projDate = new Date(now);
      projDate.setMonth(projDate.getMonth() + i + 1);
      const dateStr = projDate.toISOString().split('T')[0].slice(0, 7);

      // Apply growth + monthly contribution (for goals)
      currentValue = currentValue * (1 + monthlyGrowthRate) + monthlyContribution;

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
  }, [historicalValues, assumptionRate, dateRange.projectionMonths, effectiveWithdrawals, showProjection, isGoalMode, goalConfig]);

  // Get granularity step (months per data point) and label
  const granularityConfig = useMemo(() => {
    switch (dataGranularity) {
      case 'quarterly': return { step: 3, label: 'Quarterly' };
      case '6months': return { step: 6, label: '6-Monthly' };
      case 'yearly': return { step: 12, label: 'Yearly' };
      default: return { step: 1, label: 'Monthly' };
    }
  }, [dataGranularity]);

  // Aggregate projection data based on granularity
  const aggregatedProjection = useMemo(() => {
    if (granularityConfig.step === 1) {
      // No aggregation needed for monthly
      return { values: projectionValues, dates: projectionDates };
    }

    const aggregatedValues: number[] = [];
    const aggregatedDates: string[] = [];

    for (let i = 0; i < projectionValues.length; i += granularityConfig.step) {
      // Take the value at the end of each period
      const endIndex = Math.min(i + granularityConfig.step - 1, projectionValues.length - 1);
      aggregatedValues.push(projectionValues[endIndex]);
      aggregatedDates.push(projectionDates[endIndex]);
    }

    return { values: aggregatedValues, dates: aggregatedDates };
  }, [projectionValues, projectionDates, granularityConfig.step]);

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

  // Format date for tooltip (e.g., "November 2024" or "Jan 2025")
  // Uses display dates (aggregated projection)
  const formatTooltipDate = (index: number): string => {
    const tooltipDates = [...historicalDates, ...displayProjectionDates];
    if (index >= 0 && index < tooltipDates.length) {
      const dateStr = tooltipDates[index];
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return '';
  };

  // Get tooltip info for an index - uses displayProjectionValues
  const getTooltipInfo = (index: number) => {
    const isProjection = index >= historicalValues.length;
    const value = isProjection
      ? displayProjectionValues[index - historicalValues.length]
      : historicalValues[index];

    // Calculate change from previous period
    let changePercent = 0;
    let changeAmount = 0;
    let isDecreasing = false;
    if (index > 0) {
      const prevValue = index >= historicalValues.length
        ? (index === historicalValues.length ? historicalValues[historicalValues.length - 1] : displayProjectionValues[index - historicalValues.length - 1])
        : historicalValues[index - 1];
      changeAmount = value - prevValue;
      changePercent = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0;
      isDecreasing = value < prevValue;
    }

    return {
      date: formatTooltipDate(index),
      value,
      isProjection,
      isDecreasing,
      changePercent,
      changeAmount
    };
  };

  // Loading state - check based on mode
  const isLoading = isGoalMode
    ? (goalLoading || goalHistoryLoading)
    : (summaryLoading || historyLoading);

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
        <div style={{ color: colors.utility.secondaryText }}>
          {isGoalMode ? 'Loading goal progress...' : 'Loading networth data...'}
        </div>
      </div>
    );
  }

  // Check if we have any data at all from the API
  const hasAnyHistoryData = isGoalMode
    ? (goalHistoricalData.values.length > 0)
    : (historyData?.data?.history && historyData.data.history.length > 0);

  // No data state
  if ((!isGoalMode && !summaryData?.data) || (!hasAnyHistoryData && historicalValues.length === 0)) {
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
          {isGoalMode ? 'No goal progress history available' : 'No networth history available'}
        </div>
        <div style={{ fontSize: '12px', color: colors.utility.secondaryText, opacity: 0.7 }}>
          {isGoalMode ? 'Progress snapshots will appear after monthly updates' : 'Portfolio snapshots will appear after month-end processing'}
        </div>
      </div>
    );
  }

  // If we have data but the sliced array is empty, show fallback
  if (historicalValues.length === 0 && hasAnyHistoryData) {
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
          Limited data for {timeframePeriod} view
        </div>
        <div style={{ fontSize: '12px', color: colors.utility.secondaryText, opacity: 0.7 }}>
          Try selecting a longer timeframe (1Y or 24M)
        </div>
      </div>
    );
  }

  const currentNetworth = historicalValues[historicalValues.length - 1];
  const projectedNetworth = projectionValues[projectionValues.length - 1] || currentNetworth;
  const projectedGrowth = currentNetworth > 0
    ? ((projectedNetworth - currentNetworth) / currentNetworth) * 100
    : 0;

  // Use aggregated projection for display
  const displayProjectionValues = aggregatedProjection.values;
  const displayProjectionDates = aggregatedProjection.dates;

  // Combine all values for scale calculation (use raw values for proper min/max)
  const allValues = [...historicalValues, ...projectionValues];
  const minValue = Math.min(...allValues) * 0.95;
  const maxValue = Math.max(...allValues) * 1.05;
  const valueRange = maxValue - minValue;

  // Combined display values for chart rendering
  const displayAllValues = [...historicalValues, ...displayProjectionValues];

  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartInnerWidth = chartWidth - padding.left - padding.right;

  // Scale functions - use displayAllValues for x positioning
  const xScale = (index: number) => padding.left + (index / (displayAllValues.length - 1)) * chartInnerWidth;
  const yScale = (value: number) => padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

  // Helper function to generate smooth bezier curve path
  const generateSmoothPath = (values: number[], startIndex: number = 0): string => {
    if (values.length < 2) return '';

    const points = values.map((v, i) => ({
      x: xScale(startIndex + i),
      y: yScale(v)
    }));

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      // Calculate control points for smooth curve (Catmull-Rom to Bezier)
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    return path;
  };

  // Generate smooth historical path (single color, no segments)
  const smoothHistoricalPath = useMemo(() => {
    if (chartType !== 'smooth' || historicalValues.length < 2) return '';
    return generateSmoothPath(historicalValues, 0);
  }, [chartType, historicalValues, displayAllValues.length]);

  // Generate smooth projection path
  const smoothProjectionPath = useMemo(() => {
    if (chartType !== 'smooth' || displayProjectionValues.length < 1) return '';
    // Include last historical point to connect smoothly
    const combinedValues = [historicalValues[historicalValues.length - 1], ...displayProjectionValues];
    return generateSmoothPath(combinedValues, historicalValues.length - 1);
  }, [chartType, historicalValues, displayProjectionValues, displayAllValues.length]);

  // Generate paths - with segments for RED when decreasing
  // Build historical path with segments (green for growth, RED for ANY decrease)
  const historicalSegments: { path: string; color: string }[] = [];

  if (historicalValues.length > 1) {
    let prevValue = historicalValues[0];
    let currentSegmentPath = `M ${xScale(0)},${yScale(historicalValues[0])}`;
    let currentSegmentIsDecreasing = false;

    for (let i = 1; i < historicalValues.length; i++) {
      const v = historicalValues[i];
      const x = xScale(i);
      const y = yScale(v);
      const isDecreasing = v < prevValue;

      if (i === 1) {
        currentSegmentIsDecreasing = isDecreasing;
        currentSegmentPath += ` L ${x},${y}`;
      } else {
        if (isDecreasing !== currentSegmentIsDecreasing) {
          // Direction changed - save current segment
          historicalSegments.push({
            path: currentSegmentPath,
            color: currentSegmentIsDecreasing ? '#EF4444' : '#10B981'
          });
          // Start new segment from previous point
          const prevX = xScale(i - 1);
          const prevY = yScale(historicalValues[i - 1]);
          currentSegmentPath = `M ${prevX},${prevY} L ${x},${y}`;
          currentSegmentIsDecreasing = isDecreasing;
        } else {
          currentSegmentPath += ` L ${x},${y}`;
        }
      }
      prevValue = v;
    }

    // Add final segment
    if (currentSegmentPath.includes('L')) {
      historicalSegments.push({
        path: currentSegmentPath,
        color: currentSegmentIsDecreasing ? '#EF4444' : '#10B981'
      });
    }
  } else if (historicalValues.length === 1) {
    // Single point - no line needed, just the dot
  }

  // Legacy single path for fallback (keeping for reference)
  const historicalPath = historicalValues
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale(v)}`)
    .join(' ');

  // Projection path - connect from last historical point
  const projectionStartX = xScale(historicalValues.length - 1);
  const projectionStartY = yScale(historicalValues[historicalValues.length - 1]);

  // Build projection path with segments (green for growth, RED for ANY decrease)
  // Uses displayProjectionValues for aggregated rendering
  const projectionSegments: { path: string; color: string }[] = [];

  if (displayProjectionValues.length > 0) {
    let prevValue = historicalValues[historicalValues.length - 1];
    let currentSegmentPath = `M ${projectionStartX},${projectionStartY}`;
    let currentSegmentIsDecreasing = false;

    displayProjectionValues.forEach((v, i) => {
      const pointIndex = historicalValues.length + i;
      const x = xScale(pointIndex);
      const y = yScale(v);
      const isDecreasing = v < prevValue;

      // If this is the first point, just add it
      if (i === 0) {
        currentSegmentIsDecreasing = isDecreasing;
        currentSegmentPath += ` L ${x},${y}`;
      } else {
        // Check if direction changed
        if (isDecreasing !== currentSegmentIsDecreasing) {
          // Save current segment
          projectionSegments.push({
            path: currentSegmentPath,
            color: currentSegmentIsDecreasing ? '#EF4444' : '#10B981' // Red if decreasing, Green if increasing
          });

          // Start new segment from previous point
          const prevX = xScale(pointIndex - 1);
          const prevY = yScale(displayProjectionValues[i - 1]);
          currentSegmentPath = `M ${prevX},${prevY} L ${x},${y}`;
          currentSegmentIsDecreasing = isDecreasing;
        } else {
          // Continue current segment
          currentSegmentPath += ` L ${x},${y}`;
        }
      }

      prevValue = v;
    });

    // Add final segment
    if (currentSegmentPath.includes('L')) {
      projectionSegments.push({
        path: currentSegmentPath,
        color: currentSegmentIsDecreasing ? '#EF4444' : '#10B981'
      });
    }
  }

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    minValue + (valueRange * i) / (yTicks - 1)
  );

  // X-axis labels (show every few months) - use display dates
  const allDates = [...historicalDates, ...displayProjectionDates];
  const xTickInterval = Math.max(1, Math.floor(allDates.length / 6));

  // Dot size - DOUBLED as requested
  const dotSize = 10;

  return (
    <div
      id={chartElementId}
      ref={chartContainerRef}
      style={{
        backgroundColor: isFullscreenMode ? colors.utility.primaryBackground : colors.utility.secondaryBackground,
        borderRadius: isFullscreenMode ? '0' : '12px',
        padding: isFullscreenMode ? '32px' : '24px',
        width: '100%',
        height: isFullscreenMode ? '100vh' : 'auto',
        overflow: isFullscreenMode ? 'auto' : 'visible'
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
            {isGoalMode ? (goalConfig?.title || 'Goal Progress') : 'Networth Projection'}
          </h3>
          <p style={{
            fontSize: '13px',
            color: colors.utility.secondaryText,
            margin: '4px 0 0 0'
          }}>
            {isGoalMode
              ? `${historicalDates.length} snapshots${showProjection ? ` • ${projectionDates.length}M projection @ ${assumptionRate}%` : ''}`
              : `Historical + ${granularityConfig.label} projection @ ${assumptionRate}% p.a.`
            }
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Timeframe selector */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {(['1M', '1Y', '2Y', '3Y', '4Y', '5Y'] as TimeframePeriod[]).map(period => (
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
            {/* Custom years dropdown for 6-20 years */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <select
                value={timeframePeriod === 'CUSTOM' ? customYears : ''}
                onChange={(e) => {
                  const years = parseInt(e.target.value);
                  if (years) {
                    setCustomYears(years);
                    setTimeframePeriod('CUSTOM');
                  }
                }}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: timeframePeriod === 'CUSTOM' ? 'none' : `1px solid ${colors.utility.primaryText}20`,
                  backgroundColor: timeframePeriod === 'CUSTOM' ? colors.brand.primary : 'transparent',
                  color: timeframePeriod === 'CUSTOM' ? 'white' : colors.utility.secondaryText,
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  appearance: 'none',
                  paddingRight: '24px',
                  minWidth: '70px'
                }}
              >
                <option value="" disabled style={{ color: colors.utility.secondaryText }}>
                  More...
                </option>
                {[6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 35, 40, 45, 50].map(years => (
                  <option key={years} value={years} style={{ color: colors.utility.primaryText, backgroundColor: colors.utility.secondaryBackground }}>
                    {years}Y
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                style={{
                  position: 'absolute',
                  right: '8px',
                  pointerEvents: 'none',
                  color: timeframePeriod === 'CUSTOM' ? 'white' : colors.utility.secondaryText
                }}
              />
            </div>
          </div>

          {/* Asset selector dropdown - only in customer networth mode */}
          {!isGoalMode && (
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
          )}

          {/* Fullscreen Button */}
          {isFullscreenSupported() && (
            <button
              onClick={handleFullscreenToggle}
              title={isFullscreenMode ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: `1px solid ${colors.utility.primaryText}20`,
                backgroundColor: 'transparent',
                color: colors.utility.primaryText,
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isFullscreenMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {isFullscreenMode ? 'Exit' : 'Full'}
            </button>
          )}

          {/* Export PNG Button */}
          <button
            onClick={handleExportPNG}
            disabled={exportStatus === 'exporting'}
            title="Export chart as PNG"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: `1px solid ${
                exportStatus === 'success' ? '#10B981' :
                exportStatus === 'error' ? '#EF4444' :
                colors.utility.primaryText + '20'
              }`,
              backgroundColor: exportStatus === 'success' ? '#10B98115' :
                exportStatus === 'error' ? '#EF444415' : 'transparent',
              color: exportStatus === 'success' ? '#10B981' :
                exportStatus === 'error' ? '#EF4444' :
                colors.utility.primaryText,
              fontSize: '11px',
              fontWeight: '500',
              cursor: exportStatus === 'exporting' ? 'wait' : 'pointer',
              transition: 'all 0.2s',
              opacity: exportStatus === 'exporting' ? 0.7 : 1
            }}
          >
            <Camera size={14} />
            {exportStatus === 'exporting' ? '...' :
             exportStatus === 'success' ? '✓' :
             exportStatus === 'error' ? '✗' : 'PNG'}
          </button>
        </div>
      </div>

      {/* Granularity and Chart Type Toggles */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '16px',
        marginBottom: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Data Granularity Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Data:</span>
          <div style={{
            display: 'flex',
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '6px',
            padding: '2px'
          }}>
            {(['monthly', 'quarterly', '6months', 'yearly'] as DataGranularity[]).map(g => (
              <button
                key={g}
                onClick={() => setDataGranularity(g)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: dataGranularity === g ? colors.brand.primary : 'transparent',
                  color: dataGranularity === g ? 'white' : colors.utility.secondaryText,
                  fontSize: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {g === 'monthly' ? 'M' : g === 'quarterly' ? 'Q' : g === '6months' ? '6M' : 'Y'}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Type Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Chart:</span>
          <div style={{
            display: 'flex',
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '6px',
            padding: '2px'
          }}>
            {(['line', 'smooth', 'area'] as ChartType[]).map(t => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: chartType === t ? colors.brand.primary : 'transparent',
                  color: chartType === t ? 'white' : colors.utility.secondaryText,
                  fontSize: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize'
                }}
              >
                {t}
              </button>
            ))}
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
          {historicalValues.length > 0 && displayProjectionValues.length > 0 && (
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

          {/* Area fill for chart type 'area' */}
          {chartType === 'area' && (
            <>
              {/* Historical area fill - gradient from green to transparent */}
              <defs>
                <linearGradient id="historicalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="projectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {/* Historical area */}
              {historicalValues.length > 1 && (
                <path
                  d={`
                    M ${xScale(0)},${yScale(historicalValues[0])}
                    ${historicalValues.slice(1).map((v, i) => `L ${xScale(i + 1)},${yScale(v)}`).join(' ')}
                    L ${xScale(historicalValues.length - 1)},${padding.top + chartHeight}
                    L ${xScale(0)},${padding.top + chartHeight}
                    Z
                  `}
                  fill="url(#historicalGradient)"
                />
              )}
              {/* Projection area */}
              {displayProjectionValues.length > 0 && (
                <path
                  d={`
                    M ${xScale(historicalValues.length - 1)},${yScale(historicalValues[historicalValues.length - 1])}
                    ${displayProjectionValues.map((v, i) => `L ${xScale(historicalValues.length + i)},${yScale(v)}`).join(' ')}
                    L ${xScale(historicalValues.length + displayProjectionValues.length - 1)},${padding.top + chartHeight}
                    L ${xScale(historicalValues.length - 1)},${padding.top + chartHeight}
                    Z
                  `}
                  fill="url(#projectionGradient)"
                />
              )}
            </>
          )}

          {/* Historical line - smooth curve or segmented based on chartType */}
          {chartType === 'smooth' ? (
            // Single smooth curve for historical data
            smoothHistoricalPath && (
              <path
                d={smoothHistoricalPath}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          ) : (
            // Segmented lines (green for growth, RED for decrease)
            historicalSegments.map((segment, i) => (
              <path
                key={`hist-seg-${i}`}
                d={segment.path}
                fill="none"
                stroke={segment.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))
          )}

          {/* Projection line - smooth curve or segmented based on chartType */}
          {chartType === 'smooth' ? (
            // Single smooth curve for projection data
            smoothProjectionPath && (
              <path
                d={smoothProjectionPath}
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="8,4"
                opacity="0.9"
              />
            )
          ) : (
            // Segmented lines (green for growth, red for drops)
            projectionSegments.map((segment, i) => (
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
            ))
          )}

          {/* Historical dots - DOUBLED SIZE with hover */}
          {historicalValues.map((value, i) => (
            <circle
              key={`hist-${i}`}
              cx={xScale(i)}
              cy={yScale(value)}
              r={hoveredIndex === i ? dotSize / 2 + 2 : dotSize / 2}
              fill="#10B981"
              stroke="white"
              strokeWidth={hoveredIndex === i ? 3 : 2}
              style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => {
                setHoveredIndex(i);
                setMousePosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                setMousePosition({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}

          {/* Projection dots - DOUBLED SIZE with hover - uses displayProjectionValues */}
          {displayProjectionValues.map((value, i) => {
            const pointIndex = historicalValues.length + i;
            // Check if value decreased from previous point
            const prevValue = i === 0
              ? historicalValues[historicalValues.length - 1]
              : displayProjectionValues[i - 1];
            const isDecreasing = value < prevValue;
            // RED for any decrease, GREEN for growth
            const dotColor = isDecreasing ? '#EF4444' : '#10B981';
            const isHovered = hoveredIndex === pointIndex;

            return (
              <circle
                key={`proj-${i}`}
                cx={xScale(pointIndex)}
                cy={yScale(value)}
                r={isHovered ? dotSize / 2 + 2 : dotSize / 2}
                fill="white"
                stroke={dotColor}
                strokeWidth={isHovered ? 3.5 : 2.5}
                strokeDasharray="2,2"
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => {
                  setHoveredIndex(pointIndex);
                  setMousePosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  setMousePosition({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHoveredIndex(null)}
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

          {/* Withdrawal markers - INVERTED TRIANGLE */}
          {effectiveWithdrawals.map(withdrawal => {
            const wDate = new Date(withdrawal.date);
            const now = new Date();
            const monthsFromNow = (wDate.getFullYear() - now.getFullYear()) * 12 +
              (wDate.getMonth() - now.getMonth());

            if (monthsFromNow <= 0 || monthsFromNow > dateRange.projectionMonths) return null;

            const index = historicalValues.length + monthsFromNow - 1;
            if (index >= allValues.length) return null;

            const x = xScale(index);
            const y = yScale(projectionValues[monthsFromNow - 1] || 0);

            // Inverted triangle (pointing down) - size 16px
            const triangleSize = 16;
            const trianglePath = `M ${x - triangleSize/2},${y - triangleSize/3} L ${x + triangleSize/2},${y - triangleSize/3} L ${x},${y + triangleSize*2/3} Z`;

            return (
              <g key={`withdrawal-${withdrawal.id}`}>
                {/* Vertical line from top to withdrawal point */}
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={y - triangleSize/2}
                  stroke="#EF4444"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                  opacity="0.6"
                />
                {/* Inverted triangle marker */}
                <path
                  d={trianglePath}
                  fill="#EF4444"
                  stroke="white"
                  strokeWidth="2"
                />
                {/* Withdrawal label */}
                <text
                  x={x}
                  y={y + triangleSize + 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#EF4444"
                  fontWeight="600"
                >
                  -{formatCurrency(withdrawal.amount)}
                </text>
                {/* Withdrawal name */}
                <text
                  x={x}
                  y={y - triangleSize - 5}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#EF4444"
                  fontWeight="500"
                >
                  {withdrawal.name.length > 15 ? withdrawal.name.slice(0, 12) + '...' : withdrawal.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (() => {
          const info = getTooltipInfo(hoveredIndex);
          return (
            <div
              style={{
                position: 'fixed',
                left: mousePosition.x + 15,
                top: mousePosition.y - 80,
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '10px',
                padding: '12px 16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                zIndex: 9999,
                pointerEvents: 'none',
                minWidth: '180px'
              }}
            >
              {/* Badge for projection/historical */}
              <div style={{
                display: 'inline-block',
                backgroundColor: info.isProjection
                  ? (info.isDecreasing ? '#EF444420' : '#10B98120')
                  : colors.brand.primary + '20',
                color: info.isProjection
                  ? (info.isDecreasing ? '#EF4444' : '#10B981')
                  : colors.brand.primary,
                fontSize: '9px',
                fontWeight: '600',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: '4px',
                marginBottom: '8px',
                letterSpacing: '0.5px'
              }}>
                {info.isProjection
                  ? (info.isDecreasing ? 'Decline' : 'Projected')
                  : 'Historical'}
              </div>

              {/* Date/Month */}
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '4px'
              }}>
                {info.date}
              </div>

              {/* Value */}
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: info.isDecreasing ? '#EF4444' : '#10B981',
                marginBottom: '6px'
              }}>
                {formatCurrency(info.value)}
              </div>

              {/* Change from previous month */}
              {hoveredIndex > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: info.changeAmount >= 0 ? '#10B981' : '#EF4444',
                  paddingTop: '6px',
                  borderTop: `1px solid ${colors.utility.primaryText}15`
                }}>
                  {info.changeAmount >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>
                    {info.changeAmount >= 0 ? '+' : ''}{formatCurrency(info.changeAmount)}
                  </span>
                  <span style={{ color: colors.utility.secondaryText }}>
                    ({info.changePercent >= 0 ? '+' : ''}{info.changePercent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginTop: '16px',
        fontSize: '12px',
        color: colors.utility.secondaryText,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '24px',
            height: '3px',
            backgroundColor: '#10B981',
            borderRadius: '2px'
          }} />
          <span>Growth</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '24px',
            height: '3px',
            backgroundColor: '#EF4444',
            borderRadius: '2px'
          }} />
          <span>Decrease</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '24px',
            height: '3px',
            backgroundColor: '#10B981',
            borderRadius: '2px',
            backgroundImage: 'repeating-linear-gradient(90deg, #10B981 0px, #10B981 6px, transparent 6px, transparent 10px)'
          }} />
          <span>Projected</span>
        </div>
        {effectiveWithdrawals.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Inverted triangle icon */}
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M2,4 L14,4 L8,14 Z" fill="#EF4444" stroke="white" strokeWidth="1" />
            </svg>
            <span>Withdrawal</span>
          </div>
        )}
        {goals.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Target size={10} color="white" />
            </div>
            <span>Goal Target</span>
          </div>
        )}
      </div>

      {/* Growth Rate Input */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <span style={{ fontSize: '12px', color: colors.utility.secondaryText, whiteSpace: 'nowrap' }}>
          Growth Rate:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number"
            step="0.5"
            value={assumptionRate}
            onChange={e => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                setAssumptionRate(value);
              }
            }}
            style={{
              width: '70px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: `1px solid ${colors.utility.primaryText}20`,
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.brand.primary,
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center',
              outline: 'none'
            }}
          />
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.brand.primary
          }}>
            % p.a.
          </span>
        </div>
      </div>
    </div>
  );
};

export default NetworthProjectionChart;
