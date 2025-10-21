// frontend/src/utils/formatters.ts
// Formatting utilities for chart display values

/**
 * Format price value with Indian Rupee symbol
 * @param value - Price value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price string (e.g., "₹25,585.30")
 */
export function formatPrice(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return '--';
  }

  return `₹${numValue.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

/**
 * Format percentage value with +/- sign
 * @param value - Percentage value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., "+5.23%", "-2.45%")
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return '--';
  }

  const sign = numValue >= 0 ? '+' : '';
  return `${sign}${numValue.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviations (K, M, B)
 * Used primarily for volume display
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Abbreviated string (e.g., "1.5M", "250.3K", "2.1B")
 */
export function formatLargeNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return '--';
  }

  const absValue = Math.abs(numValue);
  const sign = numValue < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    // Billions
    return `${sign}${(absValue / 1_000_000_000).toFixed(decimals)}B`;
  } else if (absValue >= 1_000_000) {
    // Millions
    return `${sign}${(absValue / 1_000_000).toFixed(decimals)}M`;
  } else if (absValue >= 1_000) {
    // Thousands
    return `${sign}${(absValue / 1_000).toFixed(decimals)}K`;
  } else {
    return `${sign}${absValue.toFixed(decimals)}`;
  }
}

/**
 * Format number with specified precision
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return '--';
  }

  return numValue.toFixed(decimals);
}

/**
 * Format number with Indian locale (commas)
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number with commas
 */
export function formatNumberWithCommas(
  value: number | null | undefined, 
  decimals: number = 2
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }

  const numValue = Number(value);
  if (isNaN(numValue)) {
    return '--';
  }

  return numValue.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format chart value based on view mode
 * @param value - Value to format
 * @param viewMode - 'price' or 'returns'
 * @param decimals - Number of decimal places
 * @returns Formatted string appropriate for view mode
 */
export function formatChartValue(
  value: number | null | undefined,
  viewMode: 'price' | 'returns',
  decimals: number = 2
): string {
  if (viewMode === 'returns') {
    return formatPercentage(value, decimals);
  }
  return formatPrice(value, decimals);
}

/**
 * Format tooltip label (date display)
 * @param dateString - Date string to format
 * @returns Formatted date string
 */
export function formatTooltipLabel(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Format date for X-axis labels
 * Shortened format for space constraints
 * @param dateString - Date string to format
 * @param granularity - Data granularity
 * @returns Formatted date string
 */
export function formatXAxisDate(
  dateString: string,
  granularity: 'daily' | 'weekly' | 'monthly'
): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }

    switch (granularity) {
      case 'monthly':
        return date.toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit'
        });
      case 'weekly':
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short'
        });
      case 'daily':
      default:
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: '2-digit'
        });
    }
  } catch {
    return dateString;
  }
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 20): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format file size in bytes to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validate and sanitize hex color code
 * @param color - Hex color string
 * @returns Valid hex color or default
 */
export function sanitizeHexColor(color: string, defaultColor: string = '#f83b46'): string {
  const hexRegex = /^#[0-9A-F]{6}$/i;
  return hexRegex.test(color) ? color : defaultColor;
}

/**
 * Get color based on numeric value (positive/negative/neutral)
 * @param value - Numeric value to evaluate
 * @param positiveColor - Color for positive values
 * @param negativeColor - Color for negative values
 * @param neutralColor - Color for zero/neutral values
 * @returns Appropriate color
 */
export function getValueColor(
  value: number | null | undefined,
  positiveColor: string,
  negativeColor: string,
  neutralColor: string
): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return neutralColor;
  }

  const numValue = Number(value);
  if (numValue > 0) return positiveColor;
  if (numValue < 0) return negativeColor;
  return neutralColor;
}