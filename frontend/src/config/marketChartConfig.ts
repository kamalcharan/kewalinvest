// frontend/src/config/marketChartConfig.ts

/**
 * Market Analysis Chart Configuration
 * Centralized configuration for all chart-related settings and defaults
 */

/**
 * IMPORTANT: All colors should come from ThemeContext via useTheme() hook
 * Do NOT hardcode colors here. The theme is dynamic and user-selectable.
 * 
 * Use in components:
 * const { theme, isDarkMode } = useTheme();
 * const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
 * 
 * For chart line colors:
 * - User can customize with hex color picker (stored in userPreferences)
 * - Default fallback to theme.colors.brand.primary
 */

// ==================== COLOR CONFIGURATION ====================

/**
 * User-customizable color presets for hex picker
 * These are suggestions; user can input any valid hex color
 */
export const CHART_COLOR_PRESETS = [
  '#f83b46', // Red
  '#ff6a73', // Light Red
  '#0299ff', // Blue
  '#6bbd78', // Green
  '#ec9c4b', // Orange
  '#9b59b6', // Purple
  '#3498db', // Sky Blue
  '#1abc9c', // Turquoise
  '#34495e', // Dark Gray
  '#e74c3c', // Dark Red
] as const;

// ==================== CHART DIMENSIONS ====================

export const CHART_DIMENSIONS = {
  graph: {
    minHeight: 400,
    defaultHeight: 500,
    maxHeight: 800,
    padding: {
      top: 5,
      right: 30,
      bottom: 5,
      left: 20,
    }
  },
  table: {
    pageSize: 50,
    minHeight: 400,
    headerHeight: 50,
    rowHeight: 50,
  },
  card: {
    minWidth: 150,
    defaultWidth: 200,
    padding: 16,
  }
} as const;

// ==================== TIME PERIOD CONFIGURATION ====================

export const TIME_PERIODS = {
  '1w': {
    label: '1 Week',
    shortLabel: '1W',
    days: 7,
    description: 'Last 7 days'
  },
  '1m': {
    label: '1 Month',
    shortLabel: '1M',
    days: 30,
    description: 'Last 30 days'
  },
  '3m': {
    label: '3 Months',
    shortLabel: '3M',
    days: 90,
    description: 'Last 3 months'
  },
  '6m': {
    label: '6 Months',
    shortLabel: '6M',
    days: 180,
    description: 'Last 6 months'
  },
  '1y': {
    label: '1 Year',
    shortLabel: '1Y',
    days: 365,
    description: 'Last 12 months'
  },
  'all': {
    label: 'All Time',
    shortLabel: 'All',
    days: null,
    description: 'All available data'
  },
  'custom': {
    label: 'Custom',
    shortLabel: 'Custom',
    days: null,
    description: 'User-defined date range'
  }
} as const;

export const TIME_PERIOD_OPTIONS = Object.entries(TIME_PERIODS).map(([key, value]) => ({
  value: key,
  label: value.label,
  shortLabel: value.shortLabel,
  description: value.description
}));

// ==================== GRANULARITY CONFIGURATION ====================

export const GRANULARITIES = {
  'daily': {
    label: 'Daily',
    description: 'Day-by-day data',
    abbreviation: 'D'
  },
  'weekly': {
    label: 'Weekly',
    description: 'Week-by-week data',
    abbreviation: 'W'
  },
  'monthly': {
    label: 'Monthly',
    description: 'Month-by-month data',
    abbreviation: 'M'
  }
} as const;

export const GRANULARITY_OPTIONS = Object.entries(GRANULARITIES).map(([key, value]) => ({
  value: key,
  label: value.label,
  description: value.description,
  abbreviation: value.abbreviation
}));

// ==================== RETURNS CONFIGURATION ====================

export const RETURN_PERIODS = {
  '1m': '1 Month',
  '3m': '3 Months',
  '6m': '6 Months',
  '1y': '1 Year',
  'ytd': 'Year-to-Date',
  'all': 'All-Time'
} as const;

export const RETURN_PERIODS_ARRAY = Object.entries(RETURN_PERIODS).map(([key, label]) => ({
  key,
  label
}));

// ==================== VOLATILITY CONFIGURATION ====================

export const VOLATILITY_WINDOWS = {
  '7d': '7 Days',
  '14d': '14 Days',
  '21d': '21 Days',
  '30d': '30 Days',
  '60d': '60 Days',
  '90d': '90 Days'
} as const;

export const VOLATILITY_WINDOWS_ARRAY = Object.entries(VOLATILITY_WINDOWS).map(([key, label]) => ({
  key,
  label
}));

// ==================== STATISTICS CONFIGURATION ====================

export const STATISTICS_METRICS = {
  daily_return: {
    label: 'Daily Return',
    format: 'percent',
    unit: '%',
    description: 'Daily percentage change'
  },
  cagr: {
    label: 'CAGR',
    format: 'percent',
    unit: '%',
    description: 'Compound Annual Growth Rate'
  },
  sharpe_ratio: {
    label: 'Sharpe Ratio',
    format: 'decimal',
    unit: '',
    description: 'Risk-adjusted return ratio'
  },
  max_drawdown: {
    label: 'Max Drawdown',
    format: 'percent',
    unit: '%',
    description: 'Maximum peak-to-trough decline'
  },
  total_risk: {
    label: 'Total Risk',
    format: 'percent',
    unit: '%',
    description: 'Overall risk measure'
  },
  volatility_30d: {
    label: 'Volatility (30D)',
    format: 'percent',
    unit: '%',
    description: '30-day rolling volatility'
  },
  volatility_60d: {
    label: 'Volatility (60D)',
    format: 'percent',
    unit: '%',
    description: '60-day rolling volatility'
  }
} as const;

// ==================== DASHBOARD KPI CONFIGURATION ====================

export const DASHBOARD_KPI_DEFAULTS = {
  best_performer: {
    label: 'Best Performer',
    icon: '📈',
    status: 'neutral'
  },
  worst_performer: {
    label: 'Most Volatile',
    icon: '📊',
    status: 'neutral'
  },
  market_breadth: {
    label: 'Market Breadth',
    icon: '📋',
    status: 'neutral',
    unit: '%'
  },
  avg_correlation: {
    label: 'Avg Correlation',
    icon: '🔗',
    status: 'neutral'
  }
} as const;

// ==================== CACHE CONFIGURATION ====================

export const CACHE_DURATIONS = {
  metrics: 5 * 60 * 1000,        // 5 minutes
  chartData: 3 * 60 * 1000,      // 3 minutes
  dashboardStats: 5 * 60 * 1000, // 5 minutes
  indices: 10 * 60 * 1000,       // 10 minutes
  preferences: 1 * 60 * 1000,    // 1 minute
} as const;

export const CACHE_GC_TIMES = {
  metrics: 10 * 60 * 1000,       // 10 minutes
  chartData: 10 * 60 * 1000,     // 10 minutes
  dashboardStats: 15 * 60 * 1000,// 15 minutes
  indices: 30 * 60 * 1000,       // 30 minutes
  preferences: 5 * 60 * 1000,    // 5 minutes
} as const;

// ==================== PAGINATION CONFIGURATION ====================

export const PAGINATION_DEFAULTS = {
  pageSize: 50,
  minPageSize: 10,
  maxPageSize: 100,
} as const;

// ==================== CHART ANIMATION CONFIGURATION ====================

export const CHART_ANIMATIONS = {
  enabled: true,
  duration: 300,
  easing: 'ease-in-out'
} as const;

// ==================== FORMAT CONFIGURATION ====================

export const NUMBER_FORMATS = {
  percent: (value: number, decimals: number = 2): string => {
    return `${(value >= 0 ? '+' : '')}${value.toFixed(decimals)}%`;
  },
  decimal: (value: number, decimals: number = 4): string => {
    return value.toFixed(decimals);
  },
  currency: (value: number, decimals: number = 2): string => {
    return `₹${value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  },
  integer: (value: number): string => {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
} as const;

// ==================== DATE FORMAT CONFIGURATION ====================

export const DATE_FORMATS = {
  chart: 'MMM DD, YYYY',          // "Jan 01, 2024"
  table: 'DD-MMM-YYYY',           // "01-Jan-2024"
  display: 'DD MMMM YYYY',        // "01 January 2024"
  iso: 'YYYY-MM-DD',              // "2024-01-01"
  api: 'YYYY-MM-DD',              // "2024-01-01"
} as const;

// ==================== VALIDATION CONFIGURATION ====================

export const VALIDATION_RULES = {
  hexColor: /^#[0-9A-F]{6}$/i,
  indexId: (id: number): boolean => id > 0,
  dateRange: (start: Date, end: Date): boolean => start < end,
  maxDateRange: 20 * 365, // 20 years in days
} as const;

// ==================== TOOLTIP CONFIGURATION ====================

export const TOOLTIP_CONFIG = {
  enabled: true,
  backgroundColor: '#f1f4f8',
  borderColor: '#677681',
  borderWidth: 1,
  borderRadius: 8,
  padding: 12,
  fontSize: 12,
  delay: 200,
} as const;

// ==================== AXIS CONFIGURATION ====================

export const AXIS_CONFIG = {
  x: {
    fontSize: 12,
    tickMargin: 5,
  },
  y: {
    fontSize: 12,
    tickMargin: 5,
  }
} as const;

// ==================== GRID CONFIGURATION ====================

export const GRID_CONFIG = {
  enabled: true,
  strokeDasharray: '3 3',
  stroke: '#e0e0e0',
  opacity: 0.3,
} as const;

// ==================== LEGEND CONFIGURATION ====================

export const LEGEND_CONFIG = {
  enabled: true,
  position: 'top',
  fontSize: 13,
  iconType: 'line',
  padding: 10,
} as const;

// ==================== ERROR MESSAGES ====================

export const ERROR_MESSAGES = {
  NO_DATA: 'No data available for the selected period',
  INVALID_DATE_RANGE: 'Invalid date range. Start date must be before end date.',
  DATE_RANGE_TOO_LARGE: 'Date range too large. Maximum 20 years allowed.',
  INVALID_INDEX_ID: 'Invalid index ID',
  CALCULATION_FAILED: 'Failed to calculate metrics. Please try again.',
  FETCH_FAILED: 'Failed to fetch data. Please check your connection.',
  SAVE_PREFERENCE_FAILED: 'Failed to save preference',
  INVALID_COLOR: 'Invalid color format. Use hex format #RRGGBB',
} as const;

// ==================== SUCCESS MESSAGES ====================

export const SUCCESS_MESSAGES = {
  METRICS_CALCULATED: 'Metrics calculated successfully',
  PREFERENCE_SAVED: 'Preference saved successfully',
  DATA_EXPORTED: 'Data exported successfully',
  CHART_LOADED: 'Chart data loaded',
} as const;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get days for a time period
 */
export function getDaysForPeriod(period: keyof typeof TIME_PERIODS): number | null {
  return TIME_PERIODS[period].days;
}

/**
 * Get label for a time period
 */
export function getLabelForPeriod(period: keyof typeof TIME_PERIODS): string {
  return TIME_PERIODS[period].label;
}

/**
 * Get label for a granularity
 */
export function getLabelForGranularity(granularity: keyof typeof GRANULARITIES): string {
  return GRANULARITIES[granularity].label;
}

/**
 * Format number based on type
 */
export function formatNumber(
  value: number | null | undefined,
  format: keyof typeof NUMBER_FORMATS = 'decimal'
): string {
  if (value === null || value === undefined) return '--';
  return NUMBER_FORMATS[format](value);
}

/**
 * Get appropriate status for value
 */
export function getValueStatus(value: number | null | undefined): 'positive' | 'negative' | 'neutral' {
  if (value === null || value === undefined) return 'neutral';
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
  return VALIDATION_RULES.hexColor.test(color);
}

/**
 * Get date range limits for validation
 */
export function getDateRangeLimits(): { min: Date; max: Date } {
  const max = new Date();
  const min = new Date();
  min.setFullYear(min.getFullYear() - 20); // 20 years back
  return { min, max };
}