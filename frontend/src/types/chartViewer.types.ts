// frontend/src/types/chartViewer.types.ts
// Type definitions for ChartViewer and related components

import type { TimePeriod } from '../utils/timeRangeHelper';

/**
 * Chart type options
 */
export type ChartType = 'line' | 'area' | 'areaBaseline' | 'bar';

/**
 * View mode - determines what data is displayed
 */
export type ViewMode = 'price' | 'returns';

/**
 * Display mode - graph or table
 */
export type DisplayMode = 'graph' | 'table';

/**
 * Granularity options for data aggregation
 */
export type Granularity = 'daily' | 'weekly' | 'monthly';

/**
 * Base chart data point from API
 */
export interface ChartDataPoint {
  date: string;           // Display date string
  value: number;          // Close price (primary value)
  open?: number | null;   // Opening price
  high?: number | null;   // High price
  low?: number | null;    // Low price
  volume?: number | null; // Trading volume
  rawDate: number;        // Unix timestamp for sorting
}

/**
 * Processed chart data with calculated fields
 */
export interface ProcessedChartData extends ChartDataPoint {
  displayValue: number;      // Formatted value for display (rounded)
  returnValue?: number;      // Period-over-period return percentage
  aboveBaseline?: boolean;   // For conditional area fill
  barColor?: string;         // For bar chart conditional coloring
}

/**
 * Baseline configuration for area chart
 */
export interface BaselineConfig {
  value: number;             // Baseline value (e.g., starting price, benchmark)
  label?: string;            // Display label
  type: 'fixed' | 'dynamic'; // Fixed value or calculated
}

/**
 * Region above or below baseline
 */
export interface BaselineRegion {
  startIndex: number;
  endIndex: number;
  isAbove: boolean;  // true = above baseline, false = below
  data: ProcessedChartData[];
}

/**
 * Filter state for chart controls
 */
export interface ChartFilters {
  chartType: ChartType;
  viewMode: ViewMode;
  displayMode: DisplayMode;
  granularity: Granularity;
  timePeriod: TimePeriod;
  customStartDate: string;
  customEndDate: string;
  lineColor: string;
  showVolume: boolean;
  baselineValue: number | null;
  // NEW: Comparison fields
  showComparison: boolean;           // Toggle for index comparison overlay
  comparisonIndexId: number | null;  // Selected comparison index ID
}

/**
 * Theme colors for chart components
 */
export interface ChartColors {
  brand: {
    primary: string;
    secondary: string;
  };
  utility: {
    primaryText: string;
    secondaryText: string;
    primaryBackground: string;
    secondaryBackground: string;
  };
  semantic: {
    success: string;
    error: string;
    warning: string;
    info: string;
  };
}

/**
 * Chart configuration object
 */
export interface ChartConfig {
  colors: ChartColors;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  grid: {
    strokeDasharray: string;
    stroke: string;
    strokeOpacity: number;
  };
  xAxis: {
    stroke: string;
    style: React.CSSProperties;
    angle?: number;
    textAnchor?: 'start' | 'middle' | 'end' | 'inherit';
    height?: number;
    interval?: 'preserveStart' | 'preserveEnd' | 'preserveStartEnd' | number;
  };
  yAxis: {
    stroke: string;
    style: React.CSSProperties;
    domain: [string | number, string | number];
  };
  legend: {
    wrapperStyle: React.CSSProperties;
  };
  tooltip: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    labelColor: string;
  };
}

/**
 * Props for main ChartViewer component
 */
export interface ChartViewerProps {
  // Index information
  indexName: string;
  indexId: number;
  
  // Data
  data?: ChartDataPoint[];
  isLoading?: boolean;
  error?: string;
  
  // Display options
  showColorPicker?: boolean;
  allowExport?: boolean;
  
  // Current filter values (parent-controlled)
  chartType?: ChartType;
  viewMode?: ViewMode;
  displayMode?: DisplayMode;
  granularity?: Granularity;
  timePeriod?: TimePeriod;
  customStartDate?: string;
  customEndDate?: string;
  lineColor?: string;
  showVolume?: boolean;
  baselineValue?: number | null;
  
  // Callbacks for filter changes
  onChartTypeChange?: (chartType: ChartType) => void;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onDisplayModeChange?: (displayMode: DisplayMode) => void;
  onGranularityChange?: (granularity: Granularity) => void;
  onTimePeriodChange?: (period: TimePeriod) => void;
  onCustomDateApply?: (startDate: string, endDate: string) => void;
  onColorChange?: (color: string) => void;
  onVolumeToggle?: (show: boolean) => void;
  onBaselineChange?: (value: number | null) => void;
}

/**
 * Props for filter toolbar
 */
export interface CompactFilterToolbarProps {
  filters: ChartFilters;
  onFilterChange: {
    chartType: (type: ChartType) => void;
    viewMode: (mode: ViewMode) => void;
    displayMode: (mode: DisplayMode) => void;
    granularity: (gran: Granularity) => void;
    timePeriod: (period: TimePeriod) => void;
    customDates: (start: string, end: string) => void;
    color: (color: string) => void;
    volume: (show: boolean) => void;
    baseline: (value: number | null) => void;
    // NEW: Comparison callbacks
    comparison: (show: boolean) => void;
    comparisonIndex: (indexId: number | null) => void;
  };
  colors: ChartColors;
  showColorPicker?: boolean;
  showComparison?: boolean;  // NEW: Enable/disable comparison section in toolbar
  allowExport?: boolean;
  onExport?: () => void;
}

/**
 * Props for individual chart view components
 */
export interface BaseChartViewProps {
  data: ProcessedChartData[];
  config: ChartConfig;
  lineColor: string;
  indexName: string;
  showVolume?: boolean;
  viewMode: ViewMode;
}

/**
 * Props for area baseline chart
 */
export interface AreaBaselineChartViewProps extends BaseChartViewProps {
  baseline: number;
  baselineLabel?: string;
}

/**
 * Props for volume overlay
 */
export interface VolumeOverlayProps {
  data: ProcessedChartData[];
  config: ChartConfig;
  height?: number;
}

/**
 * Props for data table
 */
export interface DataTableProps {
  data: ProcessedChartData[];
  colors: ChartColors;
  viewMode: ViewMode;
  pageSize?: number;
}

/**
 * Props for table pagination
 */
export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  colors: ChartColors;
}

/**
 * Props for chart tooltip
 */
export interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  colors: ChartColors;
  lineColor: string;
  viewMode: ViewMode;
}

/**
 * Export options
 */
export interface ExportOptions {
  filename: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  format?: 'png' | 'jpeg';
  quality?: number;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  error?: string;
  blob?: Blob;
}