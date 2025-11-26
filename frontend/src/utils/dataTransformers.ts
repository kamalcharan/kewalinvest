// frontend/src/utils/dataTransformers.ts
// Data transformation utilities for chart processing

import type {
  ChartDataPoint,
  ProcessedChartData,
  BaselineRegion,
  ViewMode,
  ChartType
} from '../types/chartViewer.types';

/**
 * Calculate period-over-period returns
 * Transforms price data into percentage change data
 * 
 * @param data - Array of chart data points
 * @returns Data with returnValue calculated for each point
 */
export function calculateReturns(data: ChartDataPoint[]): ProcessedChartData[] {
  if (!data || data.length === 0) return [];

  return data.map((point, index) => {
    // First data point has no previous value, return 0
    if (index === 0) {
      return {
        ...point,
        displayValue: parseFloat(point.value.toFixed(4)),
        returnValue: 0
      };
    }

    const prevValue = data[index - 1].value;
    
    // Handle division by zero or invalid previous value
    if (!prevValue || prevValue === 0) {
      return {
        ...point,
        displayValue: parseFloat(point.value.toFixed(4)),
        returnValue: 0
      };
    }

    // Calculate percentage return: ((current - previous) / previous) * 100
    const returnValue = ((point.value - prevValue) / prevValue) * 100;

    return {
      ...point,
      displayValue: parseFloat(point.value.toFixed(4)),
      returnValue: parseFloat(returnValue.toFixed(4))
    };
  });
}

/**
 * Identify baseline regions for conditional area fill
 * Splits data into regions above and below baseline
 * 
 * @param data - Array of processed chart data
 * @param baseline - Baseline value to compare against
 * @returns Array of regions with above/below classification
 */
export function calculateBaselineRegions(
  data: ProcessedChartData[],
  baseline: number
): BaselineRegion[] {
  if (!data || data.length === 0) return [];

  const regions: BaselineRegion[] = [];
  let currentRegion: BaselineRegion | null = null;

  data.forEach((point, index) => {
    const isAbove = point.value >= baseline;

    // Mark point for conditional styling
    point.aboveBaseline = isAbove;

    // Start new region or continue existing one
    if (!currentRegion || currentRegion.isAbove !== isAbove) {
      // Save previous region if exists
      if (currentRegion) {
        regions.push(currentRegion);
      }

      // Start new region
      currentRegion = {
        startIndex: index,
        endIndex: index,
        isAbove,
        data: [point]
      };
    } else {
      // Continue current region
      currentRegion.endIndex = index;
      currentRegion.data.push(point);
    }
  });

  // Add final region
  if (currentRegion) {
    regions.push(currentRegion);
  }

  return regions;
}

/**
 * Prepare chart data based on view mode and chart type
 * Main data processing pipeline
 * 
 * @param rawData - Raw data from API
 * @param viewMode - 'price' or 'returns'
 * @param chartType - Type of chart being rendered
 * @param baseline - Optional baseline value for area charts
 * @returns Processed data ready for chart rendering
 */
export function prepareChartData(
  rawData: ChartDataPoint[],
  viewMode: ViewMode,
  chartType: ChartType,
  baseline?: number | null
): ProcessedChartData[] {
  if (!rawData || rawData.length === 0) return [];

  // Step 1: Sort by date (rawDate timestamp)
  let processed = [...rawData].sort((a, b) => a.rawDate - b.rawDate);

  // Step 2: Filter out invalid data points
  processed = processed.filter(
    (item) =>
      item.value !== null &&
      item.value !== undefined &&
      !isNaN(Number(item.value))
  );

  // Step 3: Transform based on view mode
  let result: ProcessedChartData[] = processed.map((item) => ({
    ...item,
    displayValue: parseFloat(item.value.toFixed(4))
  }));

  if (viewMode === 'returns') {
    result = calculateReturns(processed);
  }

  // Step 4: Apply chart-type specific transformations
  if (chartType === 'areaBaseline' && baseline !== null && baseline !== undefined) {
    calculateBaselineRegions(result, baseline);
  }

  if (chartType === 'bar') {
    // Add color coding for positive/negative bars
    result = result.map((point) => ({
      ...point,
      barColor: (viewMode === 'returns' ? point.returnValue || 0 : point.value) >= 0 
        ? 'success' 
        : 'error'
    }));
  }

  return result;
}

/**
 * Calculate baseline value from data
 * Used to determine initial baseline for area charts
 * 
 * @param data - Chart data
 * @param type - 'first' | 'average' | 'median'
 * @returns Calculated baseline value
 */
export function calculateBaseline(
  data: ChartDataPoint[],
  type: 'first' | 'average' | 'median' = 'first'
): number | null {
  if (!data || data.length === 0) return null;

  switch (type) {
    case 'first':
      return data[0].value;

    case 'average': {
      const sum = data.reduce((acc, point) => acc + point.value, 0);
      return sum / data.length;
    }

    case 'median': {
      const sorted = [...data].sort((a, b) => a.value - b.value);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1].value + sorted[mid].value) / 2
        : sorted[mid].value;
    }

    default:
      return data[0].value;
  }
}

/**
 * Aggregate data points for better visualization on large datasets
 * Downsamples data while preserving key features
 * 
 * @param data - Original data
 * @param maxPoints - Maximum number of points to return
 * @returns Downsampled data
 */
export function downsampleData(
  data: ChartDataPoint[],
  maxPoints: number = 1000
): ChartDataPoint[] {
  if (!data || data.length <= maxPoints) return data;

  const step = Math.ceil(data.length / maxPoints);
  const downsampled: ChartDataPoint[] = [];

  for (let i = 0; i < data.length; i += step) {
    // For each bucket, take the point or aggregate
    const bucket = data.slice(i, i + step);
    
    if (bucket.length === 1) {
      downsampled.push(bucket[0]);
    } else {
      // Aggregate bucket - preserve high, low, first, last
      const aggregated: ChartDataPoint = {
        date: bucket[0].date,
        value: bucket[bucket.length - 1].value, // Close = last value
        open: bucket[0].value, // Open = first value
        high: Math.max(...bucket.map(p => p.high || p.value)),
        low: Math.min(...bucket.map(p => p.low || p.value)),
        volume: bucket.reduce((sum, p) => sum + (p.volume || 0), 0),
        rawDate: bucket[0].rawDate
      };
      downsampled.push(aggregated);
    }
  }

  return downsampled;
}

/**
 * Handle missing data points in time series
 * Forward-fills missing values
 * 
 * @param data - Data with potential gaps
 * @returns Data with gaps filled
 */
export function fillMissingData(data: ChartDataPoint[]): ChartDataPoint[] {
  if (!data || data.length === 0) return [];

  const filled: ChartDataPoint[] = [];
  let lastValidPoint: ChartDataPoint | null = null;

  for (const point of data) {
    if (point.value !== null && point.value !== undefined && !isNaN(point.value)) {
      filled.push(point);
      lastValidPoint = point;
    } else if (lastValidPoint) {
      // Forward fill with last valid value
      filled.push({
        ...point,
        value: lastValidPoint.value,
        open: lastValidPoint.open,
        high: lastValidPoint.high,
        low: lastValidPoint.low
      });
    }
  }

  return filled;
}

/**
 * Calculate statistics for a dataset
 * Useful for displaying summary metrics
 * 
 * @param data - Chart data
 * @returns Statistics object
 */
export function calculateDataStats(data: ChartDataPoint[]) {
  if (!data || data.length === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      median: 0,
      first: 0,
      last: 0,
      change: 0,
      changePercent: 0
    };
  }

  const values = data.map(p => p.value);
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mid = Math.floor(sorted.length / 2);

  const first = data[0].value;
  const last = data[data.length - 1].value;
  const change = last - first;
  const changePercent = first !== 0 ? (change / first) * 100 : 0;

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    average: sum / values.length,
    median: sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid],
    first,
    last,
    change,
    changePercent
  };
}

/**
 * Detect outliers in dataset using IQR method
 * Can be used to flag unusual data points
 * 
 * @param data - Chart data
 * @returns Indices of outlier points
 */
export function detectOutliers(data: ChartDataPoint[]): number[] {
  if (!data || data.length < 4) return [];

  const values = data.map(p => p.value);
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outlierIndices: number[] = [];
  data.forEach((point, index) => {
    if (point.value < lowerBound || point.value > upperBound) {
      outlierIndices.push(index);
    }
  });

  return outlierIndices;
}

/**
 * Validate data integrity
 * Checks for common data quality issues
 * 
 * @param data - Data to validate
 * @returns Validation result with issues found
 */
export function validateChartData(data: ChartDataPoint[]): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!data || data.length === 0) {
    issues.push('No data provided');
    return { isValid: false, issues };
  }

  // Check for null/undefined values
  const invalidPoints = data.filter(
    p => p.value === null || p.value === undefined || isNaN(p.value)
  );
  if (invalidPoints.length > 0) {
    issues.push(`${invalidPoints.length} points have invalid values`);
  }

  // Check for duplicate dates
  const dates = data.map(p => p.date);
  const uniqueDates = new Set(dates);
  if (dates.length !== uniqueDates.size) {
    issues.push('Duplicate dates found in dataset');
  }

  // Check date ordering
  for (let i = 1; i < data.length; i++) {
    if (data[i].rawDate < data[i - 1].rawDate) {
      issues.push('Data is not sorted by date');
      break;
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}


/**
 * Calculate month-over-month changes for portfolio performance data
 *
 * Calculates TWO types of MoM:
 * 1. mom_change_percentage: Portfolio VALUE change (includes new investments)
 * 2. returns_mom_percentage: True RETURNS change (excludes new investment impact)
 *
 * Also detects significant new investments (>10% of portfolio) and flags them
 *
 * @param performanceData - Portfolio performance data from API
 * @returns Performance data with MoM calculations
 */
export function calculatePortfolioMoM<T extends {
  current_value?: number | null;
  invested?: number | null;
  returns?: number | null;
  date: string
}>(
  performanceData: T[]
): (T & {
  mom_change_percentage: number | null;
  mom_change_absolute: number | null;
  returns_mom_percentage: number | null;
  investment_change: number | null;
  is_significant_investment: boolean;
})[] {
  if (!performanceData || performanceData.length === 0) return [];

  // Sort by date ascending
  const sorted = [...performanceData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sorted.map((point, index) => {
    // First data point has no previous month to compare
    if (index === 0) {
      return {
        ...point,
        mom_change_percentage: null,
        mom_change_absolute: null,
        returns_mom_percentage: null,
        investment_change: null,
        is_significant_investment: false,
      };
    }

    const currentValue = point.current_value ?? 0;
    const previousValue = sorted[index - 1].current_value ?? 0;
    const currentInvested = (point as any).invested ?? 0;
    const previousInvested = (sorted[index - 1] as any).invested ?? 0;
    const currentReturns = (point as any).returns ?? 0;
    const previousReturns = (sorted[index - 1] as any).returns ?? 0;

    // Calculate investment change
    const investmentChange = currentInvested - previousInvested;

    // Detect significant new investment (>10% of previous portfolio value)
    const isSignificantInvestment = previousValue > 0
      ? Math.abs(investmentChange) > (previousValue * 0.10)
      : false;

    // Handle division by zero for portfolio value MoM
    if (previousValue === 0) {
      return {
        ...point,
        mom_change_percentage: null,
        mom_change_absolute: currentValue - previousValue,
        returns_mom_percentage: null,
        investment_change: investmentChange,
        is_significant_investment: isSignificantInvestment,
      };
    }

    // Calculate portfolio VALUE MoM (traditional calculation)
    const momChangeAbsolute = currentValue - previousValue;
    const momChangePercentage = (momChangeAbsolute / previousValue) * 100;

    // Calculate RETURNS-based MoM (true market growth)
    // This measures how much the RETURNS changed relative to previous portfolio value
    // Returns MoM = (current_returns - previous_returns) / previous_value * 100
    // This excludes the impact of new money added
    const returnsChange = currentReturns - previousReturns;
    const returnsMomPercentage = (returnsChange / previousValue) * 100;

    return {
      ...point,
      mom_change_percentage: parseFloat(momChangePercentage.toFixed(2)),
      mom_change_absolute: parseFloat(momChangeAbsolute.toFixed(2)),
      returns_mom_percentage: parseFloat(returnsMomPercentage.toFixed(2)),
      investment_change: parseFloat(investmentChange.toFixed(2)),
      is_significant_investment: isSignificantInvestment,
    };
  });
}

/**
 * Get color for month-over-month change
 * 
 * @param change - MoM change percentage
 * @returns CSS color string
 */
export function getMoMColor(change: number | null): string {
  if (change === null) return '#6B7280'; // Gray
  return change >= 0 ? '#10B981' : '#EF4444'; // Green or Red
}

/**
 * Get arrow icon for month-over-month change
 * 
 * @param change - MoM change percentage
 * @returns Arrow character
 */
export function getMoMArrow(change: number | null): string {
  if (change === null) return '→';
  return change >= 0 ? '▲' : '▼';
}