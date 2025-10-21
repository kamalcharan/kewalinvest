// frontend/src/utils/timeRangeHelper.ts
// Utility functions to convert time periods to date ranges

export type TimePeriod = '1w' | '1m' | '3m' | '6m' | '1y' | 'ytd' | 'all' | 'custom';

export interface DateRange {
  startDate: string;  // ISO format: YYYY-MM-DD
  endDate: string;    // ISO format: YYYY-MM-DD
}

/**
 * Convert time period string to date range
 * Returns null for 'all' and 'custom' (need special handling)
 * 
 * @param period - Time period string
 * @param referenceDate - Optional reference date (default: today)
 * @returns DateRange or null
 */
export function getDateRangeFromPeriod(
  period: TimePeriod,
  referenceDate?: Date
): DateRange | null {
  const today = referenceDate ? new Date(referenceDate) : new Date();
  const endDate = formatDateISO(today);

  switch (period) {
    case '1w': {
      // 1 week = 7 days
      const startDate = subtractDays(today, 7);
      return { startDate: formatDateISO(startDate), endDate };
    }

    case '1m': {
      // 1 month = 30 days
      const startDate = subtractDays(today, 30);
      return { startDate: formatDateISO(startDate), endDate };
    }

    case '3m': {
      // 3 months = 90 days
      const startDate = subtractDays(today, 90);
      return { startDate: formatDateISO(startDate), endDate };
    }

    case '6m': {
      // 6 months = 180 days
      const startDate = subtractDays(today, 180);
      return { startDate: formatDateISO(startDate), endDate };
    }

    case '1y': {
      // 1 year = 365 days
      const startDate = subtractDays(today, 365);
      return { startDate: formatDateISO(startDate), endDate };
    }

    case 'ytd': {
      // Year to date - from January 1st of current year
      const startDate = new Date(today.getFullYear(), 0, 1);
      return { startDate: formatDateISO(startDate), endDate };
    }

    case 'all':
      // No date filtering - return null
      return null;

    case 'custom':
      // Custom range should be handled separately
      return null;

    default:
      return null;
  }
}

/**
 * Subtract days from a date
 */
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get display label for time period
 */
export function getTimePeriodLabel(period: TimePeriod): string {
  const labels: Record<TimePeriod, string> = {
    '1w': '1 Week',
    '1m': '1 Month',
    '3m': '3 Months',
    '6m': '6 Months',
    '1y': '1 Year',
    'ytd': 'Year to Date',
    'all': 'All Time',
    'custom': 'Custom Range'
  };
  return labels[period] || period;
}

/**
 * Get short display label for time period (for buttons)
 */
export function getTimePeriodShortLabel(period: TimePeriod): string {
  const labels: Record<TimePeriod, string> = {
    '1w': '1W',
    '1m': '1M',
    '3m': '3M',
    '6m': '6M',
    '1y': '1Y',
    'ytd': 'YTD',
    'all': 'All',
    'custom': 'Custom'
  };
  return labels[period] || period;
}

/**
 * Validate date range
 * Ensures start date is before end date
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    return start <= end;
  } catch {
    return false;
  }
}

/**
 * Parse date string to Date object
 * Handles multiple formats
 */
export function parseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Get date range with buffer days
 * Useful for ensuring enough data for calculations
 * 
 * @param period - Time period
 * @param bufferDays - Additional days to include before start date
 */
export function getDateRangeWithBuffer(
  period: TimePeriod,
  bufferDays: number = 30
): DateRange | null {
  const range = getDateRangeFromPeriod(period);
  
  if (!range) {
    return null;
  }

  const startDate = new Date(range.startDate);
  const bufferedStartDate = subtractDays(startDate, bufferDays);

  return {
    startDate: formatDateISO(bufferedStartDate),
    endDate: range.endDate
  };
}

/**
 * Get approximate number of trading days for a period
 * Useful for estimating data points
 */
export function getApproxTradingDays(period: TimePeriod): number | null {
  // Assuming ~252 trading days per year
  const tradingDaysPerYear = 252;
  
  switch (period) {
    case '1w':
      return 5; // 5 trading days in a week
    case '1m':
      return 21; // ~21 trading days in a month
    case '3m':
      return 63; // ~63 trading days in 3 months
    case '6m':
      return 126; // ~126 trading days in 6 months
    case '1y':
      return tradingDaysPerYear;
    case 'ytd': {
      // Calculate days from start of year to today
      const today = new Date();
      const yearStart = new Date(today.getFullYear(), 0, 1);
      const daysDiff = Math.floor((today.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
      return Math.floor(daysDiff * (tradingDaysPerYear / 365));
    }
    case 'all':
    case 'custom':
      return null;
    default:
      return null;
  }
}

/**
 * Check if period requires date range filtering
 */
export function requiresDateRange(period: TimePeriod): boolean {
  return period !== 'all';
}

/**
 * Get today's date in ISO format
 */
export function getTodayISO(): string {
  return formatDateISO(new Date());
}

/**
 * Get date N days ago in ISO format
 */
export function getDaysAgoISO(days: number): string {
  const date = subtractDays(new Date(), days);
  return formatDateISO(date);
}

/**
 * Format date for display (more readable)
 */
export function formatDateDisplay(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Get date range description for display
 */
export function getDateRangeDescription(period: TimePeriod): string {
  const range = getDateRangeFromPeriod(period);
  
  if (!range) {
    return period === 'all' ? 'All available data' : 'Custom date range';
  }

  return `${formatDateDisplay(range.startDate)} to ${formatDateDisplay(range.endDate)}`;
}