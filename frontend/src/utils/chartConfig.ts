// frontend/src/utils/chartConfig.ts
// Chart configuration utilities based on theme

import type { ChartConfig, ChartColors } from '../types/chartViewer.types';

/**
 * Generate chart configuration from theme colors
 * Creates consistent styling across all chart types
 * 
 * @param colors - Theme colors object
 * @param dataLength - Number of data points (affects label density)
 * @returns Complete chart configuration
 */
export function getChartConfig(
  colors: ChartColors,
  dataLength: number = 100
): ChartConfig {
  // Determine if labels should be rotated based on data density
  const shouldRotateLabels = dataLength > 50;
  const labelInterval: 'preserveStartEnd' | 'preserveStart' = 
    dataLength > 100 ? 'preserveStartEnd' : 'preserveStart';

  return {
    colors,
    
    margin: {
      top: 5,
      right: 30,
      left: 20,
      bottom: shouldRotateLabels ? 80 : 50
    },

    grid: {
      strokeDasharray: '3 3',
      stroke: colors.utility.primaryText,
      strokeOpacity: 0.15
    },

    xAxis: {
      stroke: colors.utility.secondaryText,
      style: {
        fontSize: '12px',
        fill: colors.utility.secondaryText
      },
      angle: shouldRotateLabels ? -45 : 0,
      textAnchor: shouldRotateLabels ? ('end' as const) : ('middle' as const),
      height: shouldRotateLabels ? 80 : 50,
      interval: labelInterval as any
    },

    yAxis: {
      stroke: colors.utility.secondaryText,
      style: {
        fontSize: '12px',
        fill: colors.utility.secondaryText
      },
      domain: ['auto', 'auto']
    },

    legend: {
      wrapperStyle: {
        fontSize: '13px',
        color: colors.utility.primaryText,
        paddingTop: '10px'
      }
    },

    tooltip: {
      backgroundColor: colors.utility.primaryBackground,
      borderColor: colors.utility.primaryText + '20',
      textColor: colors.utility.primaryText,
      labelColor: colors.utility.secondaryText
    }
  };
}

/**
 * Get line stroke width based on data density
 * Thinner lines for dense data, thicker for sparse data
 * 
 * @param dataLength - Number of data points
 * @returns Stroke width in pixels
 */
export function getLineStrokeWidth(dataLength: number): number {
  if (dataLength > 500) return 1;
  if (dataLength > 200) return 1.5;
  return 2;
}

/**
 * Get dot configuration based on data density
 * Show dots only for sparse data
 * 
 * @param dataLength - Number of data points
 * @returns Dot configuration object
 */
export function getDotConfig(dataLength: number): { show: boolean; radius: number } {
  return {
    show: dataLength <= 50,
    radius: dataLength <= 20 ? 4 : 3
  };
}

/**
 * Get chart height based on layout
 * 
 * @param showVolume - Whether volume overlay is shown
 * @returns Height in pixels
 */
export function getChartHeight(showVolume: boolean): number {
  return showVolume ? 450 : 500;
}

/**
 * Get volume chart height
 * 
 * @returns Height in pixels for volume bar chart
 */
export function getVolumeChartHeight(): number {
  return 100;
}

/**
 * Get color for positive/negative values
 * 
 * @param value - Numeric value
 * @param colors - Theme colors
 * @returns Color string
 */
export function getValueColor(value: number, colors: ChartColors): string {
  if (value > 0) return colors.semantic.success;
  if (value < 0) return colors.semantic.error;
  return colors.utility.secondaryText;
}

/**
 * Get background color for positive/negative values
 * Lighter version for backgrounds
 * 
 * @param value - Numeric value
 * @param colors - Theme colors
 * @returns Color string with opacity
 */
export function getValueBackgroundColor(value: number, colors: ChartColors): string {
  if (value > 0) return colors.semantic.success + '15';
  if (value < 0) return colors.semantic.error + '15';
  return colors.utility.primaryBackground;
}

/**
 * Get bar color for bar chart
 * Returns full color, not just key
 * 
 * @param value - Bar value
 * @param colors - Theme colors
 * @returns Full color hex code
 */
export function getBarColor(value: number, colors: ChartColors): string {
  return value >= 0 ? colors.semantic.success : colors.semantic.error;
}

/**
 * Get area fill gradient ID
 * Used for creating gradient fills in area charts
 * 
 * @param indexId - Unique identifier
 * @returns Gradient ID string
 */
export function getAreaGradientId(indexId: number): string {
  return `areaGradient-${indexId}`;
}

/**
 * Create gradient definition for area chart
 * 
 * @param id - Gradient ID
 * @param color - Base color
 * @param startOpacity - Opacity at top
 * @param endOpacity - Opacity at bottom
 * @returns Gradient definition object
 */
export function createAreaGradient(
  id: string,
  color: string,
  startOpacity: number = 0.8,
  endOpacity: number = 0.1
) {
  return {
    id,
    type: 'linear',
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
    stops: [
      { offset: '0%', stopColor: color, stopOpacity: startOpacity },
      { offset: '100%', stopColor: color, stopOpacity: endOpacity }
    ]
  };
}

/**
 * Get animation configuration
 * 
 * @param enableAnimation - Whether animation is enabled
 * @returns Animation config object
 */
export function getAnimationConfig(enableAnimation: boolean = true) {
  return {
    animationDuration: enableAnimation ? 500 : 0,
    animationBegin: 0,
    animationEasing: 'ease-in-out' as const
  };
}

/**
 * Get responsive breakpoints for chart layout
 * 
 * @returns Breakpoint configuration
 */
export function getChartBreakpoints() {
  return {
    mobile: 768,
    tablet: 1024,
    desktop: 1440
  };
}

/**
 * Get axis tick count based on screen size
 * 
 * @param screenWidth - Current screen width
 * @returns Number of ticks to show
 */
export function getAxisTickCount(screenWidth: number): number {
  const breakpoints = getChartBreakpoints();
  
  if (screenWidth < breakpoints.mobile) return 3;
  if (screenWidth < breakpoints.tablet) return 5;
  return 8;
}

/**
 * Default chart colors (fallback)
 */
export const DEFAULT_CHART_COLORS: ChartColors = {
  brand: {
    primary: '#f83b46',
    secondary: '#ff6a73'
  },
  utility: {
    primaryText: '#141518',
    secondaryText: '#677681',
    primaryBackground: '#f1f4f8',
    secondaryBackground: '#ffffff'
  },
  semantic: {
    success: '#6bbd78',
    error: '#ff5963',
    warning: '#ec9c4b',
    info: '#0299ff'
  }
};

/**
 * Chart type specific settings
 */
export const CHART_TYPE_CONFIG = {
  line: {
    strokeWidth: 2,
    smoothing: 'monotone' as const,
    showDots: true,
    fillArea: false
  },
  area: {
    strokeWidth: 2,
    smoothing: 'monotone' as const,
    showDots: false,
    fillArea: true,
    fillOpacity: 0.3
  },
  bar: {
    barSize: 20,
    maxBarSize: 40,
    radius: [4, 4, 0, 0] as [number, number, number, number]
  },
  volume: {
    barSize: 8,
    opacity: 0.6,
    showInTooltip: true
  }
} as const;

/**
 * Export settings
 */
export const EXPORT_CONFIG = {
  png: {
    defaultWidth: 1200,
    defaultHeight: 600,
    quality: 1.0,
    backgroundColor: '#ffffff'
  },
  filename: {
    prefix: 'chart-export',
    dateFormat: 'YYYY-MM-DD',
    extension: 'png'
  }
} as const;

/**
 * Chart container settings
 */
export const CONTAINER_CONFIG = {
  minHeight: 400,
  maxHeight: 800,
  defaultHeight: 500,
  padding: 20,
  borderRadius: 8
} as const;

/**
 * Table settings
 */
export const TABLE_CONFIG = {
  defaultPageSize: 50,
  pageSizes: [25, 50, 100, 200],
  maxRowsBeforePagination: 50
} as const;

/**
 * Tooltip settings
 */
export const TOOLTIP_CONFIG = {
  offset: 10,
  padding: 12,
  borderRadius: 8,
  fontSize: 12,
  labelFontSize: 12,
  valueFontSize: 16,
  maxWidth: 200
} as const;