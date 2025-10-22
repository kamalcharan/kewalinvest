// frontend/src/utils/schemeDataTransformers.ts
// Utility functions for transforming scheme NAV data
// Handles NAV-specific transformations (no OHLC, no volume)

import type {
  NavTimeSeriesDataPoint,
  SchemeMetricsResponse
} from '../types/nav.types';
import type { ProcessedChartData } from '../types/chartViewer.types';

/**
 * Transform NAV time series data to ChartViewer format
 * NAV doesn't have OHLC data - we use nav_value for all price fields
 * 
 * @param data - Raw NAV time series data from API
 * @returns Processed chart data for ChartViewer component
 */
export function transformNavToChartData(
  data: NavTimeSeriesDataPoint[]
): ProcessedChartData[] {
  if (!data || data.length === 0) {
    return [];
  }

  return data.map((point) => {
    // Parse date
    const dateObj = new Date(point.date);
    
    // Format date for display (e.g., "15 Jan 2024")
    const formattedDate = dateObj.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    // NAV only has single value - use for all OHLC fields
    const navValue = Number(point.nav_value);

    return {
      date: formattedDate,
      value: navValue,
      displayValue: Number(navValue.toFixed(2)),
      open: navValue,
      high: navValue,
      low: navValue,
      volume: null, // NAV doesn't have volume
      rawDate: dateObj.getTime(),
      returnValue: point.has_metrics ? point.return_1m : undefined,
    } as ProcessedChartData;  // <-- Add type assertion here
  });
}
/**
 * Prepare metrics for sidebar display
 * Maps scheme metrics to sidebar-compatible format
 * 
 * @param metricsResponse - Latest metrics response from API
 * @returns Metrics object compatible with MetricsSidebar component
 */
export function prepareMetricsForSidebar(
  metricsResponse: SchemeMetricsResponse | null | undefined
): {
  return_1m?: number | null;
  return_3m?: number | null;
  return_6m?: number | null;
  return_1y?: number | null;
  return_ytd?: number | null;
  return_all?: number | null;
  volatility_7d?: number | null;
  volatility_14d?: number | null;
  volatility_30d?: number | null;
  volatility_60d?: number | null;
  volatility_90d?: number | null;
  cagr?: number | null;
  sharpe_ratio?: number | null;
  max_drawdown?: number | null;
  total_risk?: number | null;
} | null {
  if (!metricsResponse || !metricsResponse.metrics) {
    return null;
  }

  const metrics = metricsResponse.metrics;

  return {
    // Returns
    return_1m: metrics.return_1m,
    return_3m: metrics.return_3m,
    return_6m: metrics.return_6m,
    return_1y: metrics.return_1y,
    return_ytd: metrics.return_ytd,
    return_all: metrics.return_all,
    
    // Volatility (map to sidebar naming convention)
    volatility_7d: metrics.sd_7d,
    volatility_14d: metrics.sd_14d,
    volatility_30d: metrics.sd_21d,   // 21d maps to "30d" label
    volatility_60d: metrics.sd_42d,   // 42d maps to "60d" label
    volatility_90d: metrics.sd_3m,    // 3m maps to "90d" label
    
    // Key metrics
    cagr: metrics.cagr,
    sharpe_ratio: metrics.sharpe_ratio,
    max_drawdown: metrics.max_drawdown,
    total_risk: metrics.total_risk,
  };
}

/**
 * Extract latest metrics from time series data
 * Useful when time series includes metrics but we want latest values
 * 
 * @param data - NAV time series data with metrics
 * @returns Latest metrics or null if no metrics available
 */
export function extractLatestMetrics(
  data: NavTimeSeriesDataPoint[]
): {
  return_1m?: number | null;
  return_3m?: number | null;
  return_6m?: number | null;
  return_1y?: number | null;
  return_ytd?: number | null;
  return_all?: number | null;
  volatility_7d?: number | null;
  volatility_14d?: number | null;
  volatility_30d?: number | null;
  volatility_60d?: number | null;
  volatility_90d?: number | null;
  cagr?: number | null;
  sharpe_ratio?: number | null;
  max_drawdown?: number | null;
  total_risk?: number | null;
} | null {
  if (!data || data.length === 0) {
    return null;
  }

  // Get latest data point
  const latest = data[data.length - 1];

  if (!latest.has_metrics) {
    return null;
  }

  return {
    // Returns
    return_1m: latest.return_1m,
    return_3m: latest.return_3m,
    return_6m: latest.return_6m,
    return_1y: latest.return_1y,
    return_ytd: latest.return_ytd,
    return_all: latest.return_all,
    
    // Volatility
    volatility_7d: latest.sd_7d,
    volatility_14d: latest.sd_14d,
    volatility_30d: latest.sd_21d,
    volatility_60d: latest.sd_42d,
    volatility_90d: latest.sd_3m,
    
    // Key metrics
    cagr: latest.cagr,
    sharpe_ratio: latest.sharpe_ratio,
    max_drawdown: latest.max_drawdown,
    total_risk: latest.total_risk,
  };
}

/**
 * Format date for display
 * Converts YYYY-MM-DD to readable format
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "15 Jan 2024")
 */
export function formatDateForChart(dateString: string): string {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Calculate return percentage from NAV values
 * Used for chart transformations when metrics not available
 * 
 * @param currentNav - Current NAV value
 * @param previousNav - Previous NAV value
 * @returns Return percentage
 */
export function calculateReturn(
  currentNav: number,
  previousNav: number
): number | null {
  if (!currentNav || !previousNav || previousNav === 0) {
    return null;
  }

  return ((currentNav - previousNav) / previousNav) * 100;
}

/**
 * Get latest NAV value from time series
 * 
 * @param data - NAV time series data
 * @returns Latest NAV value and date
 */
export function getLatestNav(
  data: NavTimeSeriesDataPoint[]
): { value: number; date: string } | null {
  if (!data || data.length === 0) {
    return null;
  }

  const latest = data[data.length - 1];
  return {
    value: latest.nav_value,
    date: latest.date,
  };
}

/**
 * Check if scheme has sufficient data for charting
 * 
 * @param data - NAV time series data
 * @param minimumPoints - Minimum required data points (default: 2)
 * @returns True if sufficient data available
 */
export function hasSufficientData(
  data: NavTimeSeriesDataPoint[],
  minimumPoints: number = 2
): boolean {
  return data && data.length >= minimumPoints;
}

/**
 * Get date range summary from time series data
 * 
 * @param data - NAV time series data
 * @returns Date range summary
 */
export function getDateRangeSummary(
  data: NavTimeSeriesDataPoint[]
): {
  startDate: string;
  endDate: string;
  totalDays: number;
  formattedRange: string;
} | null {
  if (!data || data.length === 0) {
    return null;
  }

  const startDate = data[0].date;
  const endDate = data[data.length - 1].date;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const formattedRange = `${formatDateForChart(startDate)} - ${formatDateForChart(endDate)}`;

  return {
    startDate,
    endDate,
    totalDays,
    formattedRange,
  };
}