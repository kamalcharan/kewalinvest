// backend/src/utils/jtbd.util.ts

import { PortfolioAlertConfig, TimeBasedConfig, ProfileTriggerConfig, CalculatedAlertInstance } from '../types/jtbd.types';

export class JTBDUtil {
  /**
   * SMART DATE HELPERS
   */
  
  /**
   * Check if a year is a leap year
   */
  private static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }
  
  /**
   * Get the actual last day of a month (handles Feb, 30-day months, etc.)
   */
  private static getDaysInMonth(year: number, month: number): number {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Adjust February for leap years
    if (month === 1 && this.isLeapYear(year)) {
      return 29;
    }
    
    return daysInMonth[month];
  }
  
  /**
   * Adjust day to be valid for the given month (smart month-end logic)
   * Examples:
   * - Feb 31 → Feb 28 (or 29 in leap year)
   * - Apr 31 → Apr 30
   * - Jan 31 → Jan 31 (valid)
   */
  private static adjustDayForMonth(year: number, month: number, requestedDay: number): number {
    const maxDay = this.getDaysInMonth(year, month);
    return Math.min(requestedDay, maxDay);
  }
  
  /**
   * Create a date with smart month-end adjustment
   */
  private static createSmartDate(year: number, month: number, requestedDay: number): Date {
    const adjustedDay = this.adjustDayForMonth(year, month, requestedDay);
    return new Date(year, month, adjustedDay);
  }

  /**
   * Calculate next alert date for portfolio alerts
   * NOW WITH SMART MONTH-END LOGIC
   */
  static calculatePortfolioNextDate(config: PortfolioAlertConfig): Date {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const requestedDay = config.day_of_month || 1;
    
    let nextDate: Date;
    
    switch (config.frequency) {
      case 'monthly':
        // Try current month first
        nextDate = this.createSmartDate(currentYear, currentMonth, requestedDay);
        if (nextDate <= today) {
          // Move to next month
          nextDate = this.createSmartDate(currentYear, currentMonth + 1, requestedDay);
        }
        break;
        
      case 'quarterly':
        // Next quarter date
        const currentQuarter = Math.floor(currentMonth / 3);
        const nextQuarterMonth = (currentQuarter + 1) * 3;
        nextDate = this.createSmartDate(currentYear, nextQuarterMonth, requestedDay);
        if (nextDate <= today) {
          nextDate = this.createSmartDate(currentYear, nextQuarterMonth + 3, requestedDay);
        }
        break;
        
      case 'yearly':
        // Try this year first
        nextDate = this.createSmartDate(currentYear, currentMonth, requestedDay);
        if (nextDate <= today) {
          // Move to next year
          nextDate = this.createSmartDate(currentYear + 1, currentMonth, requestedDay);
        }
        break;
        
      case 'fortnightly':
        nextDate = new Date(today);
        nextDate.setDate(today.getDate() + 14);
        break;
        
      case 'daily':
        nextDate = new Date(today);
        nextDate.setDate(today.getDate() + 1);
        break;
        
      case 'NA':
      default:
        // No recurring date
        return new Date(9999, 11, 31); // Far future date
    }
    
    return nextDate;
  }
  
  /**
   * Calculate all future occurrences for portfolio alert
   * NOW WITH SMART MONTH-END LOGIC
   */
  static calculateAllOccurrences(config: PortfolioAlertConfig, startDate: Date = new Date()): CalculatedAlertInstance[] {
    const occurrences: CalculatedAlertInstance[] = [];
    const trackTillDate = new Date(startDate);
    trackTillDate.setMonth(trackTillDate.getMonth() + config.track_till_months);
    
    let currentDate = this.calculatePortfolioNextDate(config);
    let occurrenceNumber = 1;
    const requestedDay = config.day_of_month || 1;
    
    while (currentDate <= trackTillDate && occurrenceNumber <= 100) { // Safety limit
      occurrences.push({
        occurrence_date: currentDate.toISOString().split('T')[0],
        occurrence_number: occurrenceNumber,
        within_range: true, // For calculated occurrences, always true
        amount: config.amount
      });
      
      // Calculate next occurrence based on frequency WITH SMART DATE LOGIC
      switch (config.frequency) {
        case 'monthly': {
          const nextYear = currentDate.getFullYear();
          const nextMonth = currentDate.getMonth() + 1;
          currentDate = this.createSmartDate(nextYear, nextMonth, requestedDay);
          break;
        }
        case 'quarterly': {
          const nextYear = currentDate.getFullYear();
          const nextMonth = currentDate.getMonth() + 3;
          currentDate = this.createSmartDate(nextYear, nextMonth, requestedDay);
          break;
        }
        case 'yearly': {
          const nextYear = currentDate.getFullYear() + 1;
          const nextMonth = currentDate.getMonth();
          currentDate = this.createSmartDate(nextYear, nextMonth, requestedDay);
          break;
        }
        case 'fortnightly':
          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 14));
          break;
        case 'daily':
          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
          break;
        default:
          return occurrences; // No more occurrences for 'NA'
      }
      
      occurrenceNumber++;
    }
    
    return occurrences;
  }
  
  /**
   * Calculate next date for time-based alerts
   * NOW WITH SMART MONTH-END LOGIC
   */
  static calculateTimeNextDate(config: TimeBasedConfig): Date {
    const today = new Date();
    const currentYear = today.getFullYear();
    const requestedMonth = config.alert_month - 1; // JS months are 0-indexed
    const requestedDay = config.alert_date;
    
    // Create target date with smart month-end adjustment
    let nextDate = this.createSmartDate(currentYear, requestedMonth, requestedDay);
    
    // If date has passed this year, use next year
    if (nextDate <= today) {
      if (config.is_recurring) {
        nextDate = this.createSmartDate(currentYear + 1, requestedMonth, requestedDay);
      } else {
        // Non-recurring, no next date
        return new Date(9999, 11, 31);
      }
    }
    
    return nextDate;
  }
  
  /**
   * Calculate next date for profile trigger alerts
   */
  static calculateProfileNextDate(config: ProfileTriggerConfig, customerBirthday?: Date, customerAnniversary?: Date): Date {
    if (config.trigger_type === 'birthday' && customerBirthday) {
      return this.getNextOccurrence(customerBirthday, config.days_before);
    }
    
    if (config.trigger_type === 'anniversary' && customerAnniversary) {
      return this.getNextOccurrence(customerAnniversary, config.days_before);
    }
    
    // No valid date available
    return new Date(9999, 11, 31);
  }
  
  /**
   * Helper: Get next occurrence of a date with days_before offset
   * NOW WITH SMART MONTH-END LOGIC for Feb 29 birthdays
   */
  private static getNextOccurrence(baseDate: Date, daysBefore: number): Date {
    const today = new Date();
    const currentYear = today.getFullYear();
    const month = baseDate.getMonth();
    const requestedDay = baseDate.getDate();
    
    // Create this year's occurrence with smart date adjustment
    let nextDate = this.createSmartDate(currentYear, month, requestedDay);
    
    // Subtract days_before
    nextDate.setDate(nextDate.getDate() - daysBefore);
    
    // If already passed, use next year
    if (nextDate <= today) {
      nextDate = this.createSmartDate(currentYear + 1, month, requestedDay);
      nextDate.setDate(nextDate.getDate() - daysBefore);
    }
    
    return nextDate;
  }
  
  /**
   * VALIDATION FUNCTIONS
   */
  
  /**
   * Validate portfolio alert configuration
   * NOW WITH ENHANCED DATE VALIDATION
   */
  static validatePortfolioConfig(config: PortfolioAlertConfig): { is_valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.scheme_code) errors.push('scheme_code is required');
    if (!config.scheme_name) errors.push('scheme_name is required');
    if (!config.txn_type_id) errors.push('txn_type_id is required');
    if (!config.frequency) errors.push('frequency is required');
    if (config.amount <= 0) errors.push('amount must be positive');
    if (config.track_till_months <= 0) errors.push('track_till_months must be positive');
    if (config.deviation_days < 0) errors.push('deviation_days cannot be negative');
    
    if (['monthly', 'quarterly', 'yearly'].includes(config.frequency)) {
      if (!config.day_of_month || config.day_of_month < 1 || config.day_of_month > 31) {
        errors.push('day_of_month must be between 1 and 31');
      }
      // Note: We don't validate against specific months here because smart logic handles it
      // e.g., Feb 31 will auto-adjust to Feb 28/29
    }
    
    return {
      is_valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate time-based configuration
   * NOW WITH ENHANCED DATE VALIDATION
   */
  static validateTimeConfig(config: TimeBasedConfig): { is_valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.alert_date || config.alert_date < 1 || config.alert_date > 31) {
      errors.push('alert_date must be between 1 and 31');
    }
    if (!config.alert_month || config.alert_month < 1 || config.alert_month > 12) {
      errors.push('alert_month must be between 1 and 12');
    }
    
    // Optional: Warn if date is invalid for month (but don't fail - smart logic will adjust)
    if (config.alert_date && config.alert_month) {
      const currentYear = new Date().getFullYear();
      const maxDay = this.getDaysInMonth(currentYear, config.alert_month - 1);
      if (config.alert_date > maxDay) {
        // This is just informational - the smart logic will handle it
        console.log(`INFO: Day ${config.alert_date} adjusted to ${maxDay} for month ${config.alert_month}`);
      }
    }
    
    return {
      is_valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate profile trigger configuration
   */
  static validateProfileConfig(config: ProfileTriggerConfig): { is_valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!['birthday', 'anniversary'].includes(config.trigger_type)) {
      errors.push('trigger_type must be "birthday" or "anniversary"');
    }
    if (config.days_before < 0) {
      errors.push('days_before cannot be negative');
    }
    if (config.days_before > 365) {
      errors.push('days_before cannot exceed 365 days');
    }
    
    return {
      is_valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Generate title if not provided
   */
  static generateTitle(type: string, config: any): string {
    switch (type) {
      case 'portfolio_alert':
        return `${config.txn_type} alert for ${config.scheme_name}`;
      case 'time_based': {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[config.alert_month - 1] || '';
        return `Alert on ${config.alert_date} ${monthName}`;
      }
      case 'profile_trigger': {
        const typeLabel = config.trigger_type === 'birthday' ? 'Birthday' : 'Anniversary';
        return `${typeLabel} reminder (${config.days_before} days before)`;
      }
      default:
        return 'JTBD Alert';
    }
  }
  
  /**
   * UTILITY EXPORT: Get month info (for debugging/logging)
   */
  static getMonthInfo(year: number, month: number): { daysInMonth: number; isLeapYear: boolean } {
    return {
      daysInMonth: this.getDaysInMonth(year, month),
      isLeapYear: this.isLeapYear(year)
    };
  }
}