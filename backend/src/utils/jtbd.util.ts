// backend/src/utils/jtbd.util.ts

import { PortfolioAlertConfig, TimeBasedConfig, ProfileTriggerConfig, CalculatedAlertInstance } from '../types/jtbd.types';

export class JTBDUtil {
  /**
   * Calculate next alert date for portfolio alerts
   */
  static calculatePortfolioNextDate(config: PortfolioAlertConfig): Date {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    let nextDate: Date;
    
    switch (config.frequency) {
      case 'monthly':
        nextDate = new Date(currentYear, currentMonth, config.day_of_month || 1);
        if (nextDate <= today) {
          nextDate = new Date(currentYear, currentMonth + 1, config.day_of_month || 1);
        }
        break;
        
      case 'quarterly':
        // Next quarter date
        const currentQuarter = Math.floor(currentMonth / 3);
        const nextQuarterMonth = (currentQuarter + 1) * 3;
        nextDate = new Date(currentYear, nextQuarterMonth, config.day_of_month || 1);
        if (nextDate <= today) {
          nextDate = new Date(currentYear, nextQuarterMonth + 3, config.day_of_month || 1);
        }
        break;
        
      case 'yearly':
        nextDate = new Date(currentYear, currentMonth, config.day_of_month || 1);
        if (nextDate <= today) {
          nextDate = new Date(currentYear + 1, currentMonth, config.day_of_month || 1);
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
   */
  static calculateAllOccurrences(config: PortfolioAlertConfig, startDate: Date = new Date()): CalculatedAlertInstance[] {
    const occurrences: CalculatedAlertInstance[] = [];
    const trackTillDate = new Date(startDate);
    trackTillDate.setMonth(trackTillDate.getMonth() + config.track_till_months);
    
    let currentDate = this.calculatePortfolioNextDate(config);
    let occurrenceNumber = 1;
    
    while (currentDate <= trackTillDate && occurrenceNumber <= 100) { // Safety limit
      // Calculate deviation range
      const minDate = new Date(currentDate);
      minDate.setDate(currentDate.getDate() - config.deviation_days);
      const maxDate = new Date(currentDate);
      maxDate.setDate(currentDate.getDate() + config.deviation_days);
      
      occurrences.push({
        occurrence_date: currentDate.toISOString().split('T')[0],
        occurrence_number: occurrenceNumber,
        within_range: true, // For calculated occurrences, always true
        amount: config.amount
      });
      
      // Calculate next occurrence based on frequency
      switch (config.frequency) {
        case 'monthly':
          currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
          break;
        case 'quarterly':
          currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 3));
          break;
        case 'yearly':
          currentDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
          break;
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
   */
  static calculateTimeNextDate(config: TimeBasedConfig): Date {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Create target date
    let nextDate = new Date(currentYear, config.alert_month - 1, config.alert_date);
    
    // If date has passed this year, use next year
    if (nextDate <= today) {
      if (config.is_recurring) {
        nextDate = new Date(currentYear + 1, config.alert_month - 1, config.alert_date);
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
   */
  private static getNextOccurrence(baseDate: Date, daysBefore: number): Date {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Create this year's occurrence
    let nextDate = new Date(currentYear, baseDate.getMonth(), baseDate.getDate());
    
    // Subtract days_before
    nextDate.setDate(nextDate.getDate() - daysBefore);
    
    // If already passed, use next year
    if (nextDate <= today) {
      nextDate = new Date(currentYear + 1, baseDate.getMonth(), baseDate.getDate());
      nextDate.setDate(nextDate.getDate() - daysBefore);
    }
    
    return nextDate;
  }
  
  /**
   * Validate portfolio alert configuration
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
    }
    
    return {
      is_valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate time-based configuration
   */
  static validateTimeConfig(config: TimeBasedConfig): { is_valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.alert_date || config.alert_date < 1 || config.alert_date > 31) {
      errors.push('alert_date must be between 1 and 31');
    }
    if (!config.alert_month || config.alert_month < 1 || config.alert_month > 12) {
      errors.push('alert_month must be between 1 and 12');
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
      case 'time_based':
        return `Alert on ${config.alert_date}/${config.alert_month}`;
      case 'profile_trigger':
        return `${config.trigger_type} reminder`;
      default:
        return 'JTBD Alert';
    }
  }
}