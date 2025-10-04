// backend/src/utils/transaction.util.ts

import { TransactionDuplicateCheck, TransactionValidationResult } from '../types/transaction.types';

export class TransactionUtil {
  /**
   * Format transaction date to YYYY-MM-DD
   */
  static formatTransactionDate(date: Date | string): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Format amount to 2 decimal places
   */
  static formatAmount(amount: number): number {
    if (!amount || isNaN(amount)) return 0;
    return Math.round(amount * 100) / 100;
  }

  /**
   * Format units to 4 decimal places
   */
  static formatUnits(units: number): number {
    if (!units || isNaN(units)) return 0;
    return Math.round(units * 10000) / 10000;
  }

  /**
   * Format NAV to 4 decimal places
   */
  static formatNAV(nav: number): number {
    if (!nav || isNaN(nav)) return 0;
    return Math.round(nav * 10000) / 10000;
  }

  /**
   * Calculate units from amount and NAV
   */
  static calculateUnits(amount: number, nav: number): number {
    if (!amount || !nav || nav === 0) return 0;
    return this.formatUnits(amount / nav);
  }

  /**
   * Calculate amount from units and NAV
   */
  static calculateAmount(units: number, nav: number): number {
    if (!units || !nav) return 0;
    return this.formatAmount(units * nav);
  }

  /**
   * Validate transaction data
   */
  static validateTransaction(data: any): TransactionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.customer_id) {
      errors.push('Customer ID is required');
    }

    if (!data.scheme_code) {
      errors.push('Scheme code is required');
    }

    if (!data.txn_type_id) {
      errors.push('Transaction type is required');
    }

    if (!data.txn_date) {
      errors.push('Transaction date is required');
    } else {
      // Validate date format
      const dateObj = new Date(data.txn_date);
      if (isNaN(dateObj.getTime())) {
        errors.push('Invalid transaction date format');
      } else {
        // Check if date is in future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dateObj > today) {
          warnings.push('Transaction date is in the future');
        }

        // Check if date is too old (more than 10 years)
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
        if (dateObj < tenYearsAgo) {
          warnings.push('Transaction date is more than 10 years old');
        }
      }
    }

    if (!data.total_amount && data.total_amount !== 0) {
      errors.push('Total amount is required');
    } else if (data.total_amount < 0) {
      errors.push('Total amount cannot be negative');
    }

    if (!data.units && data.units !== 0) {
      errors.push('Units are required');
    } else if (data.units < 0) {
      errors.push('Units cannot be negative');
    }

    if (!data.nav && data.nav !== 0) {
      errors.push('NAV is required');
    } else if (data.nav <= 0) {
      errors.push('NAV must be greater than zero');
    }

    // Validate stamp duty if provided
    if (data.stamp_duty && data.stamp_duty < 0) {
      warnings.push('Stamp duty cannot be negative');
    }

    // Validate calculated values match
    if (data.units && data.nav && data.total_amount) {
      const calculatedAmount = this.calculateAmount(data.units, data.nav);
      const difference = Math.abs(calculatedAmount - data.total_amount);
      
      // Allow 1 rupee tolerance for rounding
      if (difference > 1) {
        warnings.push(
          `Amount mismatch: units (${data.units}) × NAV (${data.nav}) = ${calculatedAmount}, ` +
          `but total amount is ${data.total_amount}. Difference: ${difference.toFixed(2)}`
        );
      }
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
      is_duplicate: false
    };
  }

  /**
   * Generate duplicate check hash
   */
  static generateDuplicateHash(check: TransactionDuplicateCheck): string {
    const parts = [
      check.customer_id,
      check.scheme_code,
      this.formatTransactionDate(check.txn_date),
      this.formatAmount(check.total_amount),
      check.txn_type_id
    ];
    return parts.join('|');
  }

  /**
   * Check if two transactions are duplicates
   */
  static isDuplicate(txn1: TransactionDuplicateCheck, txn2: TransactionDuplicateCheck): boolean {
    return this.generateDuplicateHash(txn1) === this.generateDuplicateHash(txn2);
  }

  /**
   * Generate duplicate reason message
   */
  static generateDuplicateReason(existingCount: number = 1): string {
    return `Duplicate transaction detected: same customer, scheme, date, amount, and type. ` +
           `Found ${existingCount} existing transaction(s) with identical details.`;
  }

  /**
   * Parse transaction date from various formats
   */
  static parseTransactionDate(dateString: string): Date | null {
    if (!dateString) return null;

    // Try standard ISO format first
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try DD-MM-YYYY format
    const ddmmyyyy = dateString.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try DD-MM-YY format
    const ddmmyy = dateString.match(/^(\d{2})[-\/](\d{2})[-\/](\d{2})$/);
    if (ddmmyy) {
      const [, day, month, year] = ddmmyy;
      const fullYear = parseInt(year) <= 30 ? `20${year}` : `19${year}`;
      date = new Date(`${fullYear}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try YYYY-MM-DD format (should work with standard parsing but explicit)
    const yyyymmdd = dateString.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
    if (yyyymmdd) {
      const [, year, month, day] = yyyymmdd;
      date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  /**
   * Sanitize scheme code (uppercase, remove spaces)
   */
  static sanitizeSchemeCode(schemeCode: string): string {
    if (!schemeCode) return '';
    return schemeCode.toUpperCase().replace(/\s+/g, '').trim();
  }

  /**
   * Sanitize folio number (uppercase, trim)
   */
  static sanitizeFolioNumber(folioNo: string): string {
    if (!folioNo) return '';
    return folioNo.toUpperCase().trim();
  }

  /**
   * Build transaction filters SQL WHERE clause
   */
  static buildFilterWhereClause(
    filters: Record<string, any>,
    paramOffset: number = 1
  ): { where: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = paramOffset;

    if (filters.customer_id) {
      conditions.push(`customer_id = $${paramIndex}`);
      params.push(filters.customer_id);
      paramIndex++;
    }

    if (filters.scheme_code) {
      conditions.push(`scheme_code = $${paramIndex}`);
      params.push(this.sanitizeSchemeCode(filters.scheme_code));
      paramIndex++;
    }

    if (filters.start_date) {
      conditions.push(`txn_date >= $${paramIndex}`);
      params.push(filters.start_date);
      paramIndex++;
    }

    if (filters.end_date) {
      conditions.push(`txn_date <= $${paramIndex}`);
      params.push(filters.end_date);
      paramIndex++;
    }

    if (filters.txn_type_id) {
      conditions.push(`txn_type_id = $${paramIndex}`);
      params.push(filters.txn_type_id);
      paramIndex++;
    }

    if (filters.is_potential_duplicate !== undefined) {
      conditions.push(`is_potential_duplicate = $${paramIndex}`);
      params.push(filters.is_potential_duplicate);
      paramIndex++;
    }

    if (filters.portfolio_flag !== undefined) {
      conditions.push(`portfolio_flag = $${paramIndex}`);
      params.push(filters.portfolio_flag);
      paramIndex++;
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
    return { where, params };
  }

  /**
   * Calculate date range statistics
   */
  static calculateDateRange(transactions: Array<{ txn_date: Date }>): {
    earliest: Date | null;
    latest: Date | null;
    days: number;
  } {
    if (!transactions || transactions.length === 0) {
      return { earliest: null, latest: null, days: 0 };
    }

    const dates = transactions
      .map(t => new Date(t.txn_date))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) {
      return { earliest: null, latest: null, days: 0 };
    }

    const earliest = dates[0];
    const latest = dates[dates.length - 1];
    const days = Math.ceil((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));

    return { earliest, latest, days };
  }

  /**
   * Group transactions by scheme
   */
  static groupByScheme<T extends { scheme_code: string }>(
    transactions: T[]
  ): Map<string, T[]> {
    const grouped = new Map<string, T[]>();

    transactions.forEach(txn => {
      const code = txn.scheme_code;
      if (!grouped.has(code)) {
        grouped.set(code, []);
      }
      grouped.get(code)!.push(txn);
    });

    return grouped;
  }

  /**
   * Group transactions by month
   */
  static groupByMonth<T extends { txn_date: Date }>(
    transactions: T[]
  ): Map<string, T[]> {
    const grouped = new Map<string, T[]>();

    transactions.forEach(txn => {
      const date = new Date(txn.txn_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }
      grouped.get(monthKey)!.push(txn);
    });

    return grouped;
  }

  /**
   * Calculate transaction summary statistics
   */
  static calculateSummary(transactions: Array<{
    total_amount: number;
    units: number;
    txn_type?: 'Addition' | 'Deduction';
    is_potential_duplicate?: boolean;
  }>): {
    total_transactions: number;
    total_amount: number;
    total_units: number;
    addition_count: number;
    deduction_count: number;
    addition_amount: number;
    deduction_amount: number;
    duplicate_count: number;
  } {
    const summary = {
      total_transactions: transactions.length,
      total_amount: 0,
      total_units: 0,
      addition_count: 0,
      deduction_count: 0,
      addition_amount: 0,
      deduction_amount: 0,
      duplicate_count: 0
    };

    transactions.forEach(txn => {
      summary.total_amount += txn.total_amount || 0;
      summary.total_units += txn.units || 0;

      if (txn.txn_type === 'Addition') {
        summary.addition_count++;
        summary.addition_amount += txn.total_amount || 0;
      } else if (txn.txn_type === 'Deduction') {
        summary.deduction_count++;
        summary.deduction_amount += txn.total_amount || 0;
      }

      if (txn.is_potential_duplicate) {
        summary.duplicate_count++;
      }
    });

    return summary;
  }

  /**
   * Sort transactions by date (descending by default)
   */
  static sortByDate<T extends { txn_date: Date }>(
    transactions: T[],
    ascending: boolean = false
  ): T[] {
    return [...transactions].sort((a, b) => {
      const dateA = new Date(a.txn_date).getTime();
      const dateB = new Date(b.txn_date).getTime();
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }
}