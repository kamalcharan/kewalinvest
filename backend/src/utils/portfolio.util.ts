// backend/src/utils/portfolio.util.ts

export class PortfolioUtil {
  /**
   * Calculate return percentage
   */
  static calculateReturnPercentage(invested: number, currentValue: number): number {
    if (!invested || invested === 0) return 0;
    return Math.round(((currentValue - invested) / invested) * 10000) / 100;
  }

  /**
   * Calculate absolute returns
   */
  static calculateReturns(invested: number, currentValue: number): number {
    return Math.round((currentValue - invested) * 100) / 100;
  }

  /**
   * Calculate current value from units and NAV
   */
  static calculateCurrentValue(units: number, nav: number): number {
    if (!units || !nav) return 0;
    return Math.round(units * nav * 100) / 100;
  }

  /**
   * Calculate allocation percentage
   */
  static calculateAllocationPercentage(value: number, totalValue: number): number {
    if (!totalValue || totalValue === 0) return 0;
    return Math.round((value / totalValue) * 10000) / 100;
  }

  /**
   * Calculate XIRR (Extended Internal Rate of Return)
   * Using Newton-Raphson method for IRR calculation
   */
  static calculateXIRR(
    cashFlows: Array<{ date: Date; amount: number }>,
    guess: number = 0.1
  ): number {
    if (!cashFlows || cashFlows.length < 2) return 0;

    // Sort cash flows by date
    const sortedFlows = [...cashFlows].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstDate = new Date(sortedFlows[0].date);
    
    // Convert dates to days from first date
    const flows = sortedFlows.map(cf => ({
      days: this.daysBetween(firstDate, new Date(cf.date)),
      amount: cf.amount
    }));

    // Newton-Raphson iteration
    let rate = guess;
    const maxIterations = 100;
    const tolerance = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0;

      flows.forEach(flow => {
        const daysFraction = flow.days / 365;
        const discount = Math.pow(1 + rate, daysFraction);
        npv += flow.amount / discount;
        dnpv -= flow.amount * daysFraction / (discount * (1 + rate));
      });

      const newRate = rate - npv / dnpv;
      
      if (Math.abs(newRate - rate) < tolerance) {
        return Math.round(newRate * 10000) / 100; // Return as percentage
      }

      rate = newRate;
    }

    return 0; // Failed to converge
  }

  /**
   * Calculate CAGR (Compound Annual Growth Rate)
   */
  static calculateCAGR(
    initialValue: number,
    finalValue: number,
    years: number
  ): number {
    if (!initialValue || initialValue === 0 || !years || years === 0) return 0;
    
    const cagr = (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
    return Math.round(cagr * 100) / 100;
  }

  /**
   * Calculate days between two dates
   */
  static daysBetween(date1: Date, date2: Date): number {
    const diff = new Date(date2).getTime() - new Date(date1).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate years between two dates (with fractions)
   */
  static yearsBetween(date1: Date, date2: Date): number {
    const days = this.daysBetween(date1, date2);
    return days / 365;
  }

  /**
   * Calculate weighted average NAV
   */
  static calculateWeightedAverageNAV(
    transactions: Array<{ units: number; nav: number }>
  ): number {
    if (!transactions || transactions.length === 0) return 0;

    let totalUnits = 0;
    let weightedSum = 0;

    transactions.forEach(txn => {
      if (txn.units > 0) { // Only consider purchases
        totalUnits += txn.units;
        weightedSum += txn.units * txn.nav;
      }
    });

    if (totalUnits === 0) return 0;
    return Math.round((weightedSum / totalUnits) * 10000) / 10000;
  }

  /**
   * Group portfolio by category
   */
  static groupByCategory<T extends { category?: string }>(
    holdings: T[]
  ): Map<string, T[]> {
    const grouped = new Map<string, T[]>();

    holdings.forEach(holding => {
      const category = holding.category || 'Uncategorized';
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(holding);
    });

    return grouped;
  }

  /**
   * Calculate category-wise allocation
   */
  static calculateCategoryAllocation(
    holdings: Array<{
      category?: string;
      total_invested: number;
      current_value: number;
    }>,
    totalValue: number
  ): Array<{
    category: string;
    total_invested: number;
    current_value: number;
    percentage: number;
    scheme_count: number;
    returns: number;
    return_percentage: number;
  }> {
    const categoryMap = new Map<string, {
      total_invested: number;
      current_value: number;
      scheme_count: number;
    }>();

    // Aggregate by category
    holdings.forEach(holding => {
      const category = holding.category || 'Uncategorized';
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          total_invested: 0,
          current_value: 0,
          scheme_count: 0
        });
      }

      const stats = categoryMap.get(category)!;
      stats.total_invested += holding.total_invested;
      stats.current_value += holding.current_value;
      stats.scheme_count++;
    });

    // Convert to array with calculations
    const allocation: Array<{
      category: string;
      total_invested: number;
      current_value: number;
      percentage: number;
      scheme_count: number;
      returns: number;
      return_percentage: number;
    }> = [];

    categoryMap.forEach((stats, category) => {
      allocation.push({
        category,
        total_invested: this.roundAmount(stats.total_invested),
        current_value: this.roundAmount(stats.current_value),
        percentage: this.calculateAllocationPercentage(stats.current_value, totalValue),
        scheme_count: stats.scheme_count,
        returns: this.calculateReturns(stats.total_invested, stats.current_value),
        return_percentage: this.calculateReturnPercentage(stats.total_invested, stats.current_value)
      });
    });

    // Sort by current value descending
    return allocation.sort((a, b) => b.current_value - a.current_value);
  }

  /**
   * Calculate portfolio summary from holdings
   */
  static calculatePortfolioSummary(
    holdings: Array<{
      total_invested: number;
      current_value: number;
    }>
  ): {
    total_invested: number;
    current_value: number;
    total_returns: number;
    return_percentage: number;
    total_schemes: number;
  } {
    let total_invested = 0;
    let current_value = 0;

    holdings.forEach(holding => {
      total_invested += holding.total_invested || 0;
      current_value += holding.current_value || 0;
    });

    return {
      total_invested: this.roundAmount(total_invested),
      current_value: this.roundAmount(current_value),
      total_returns: this.calculateReturns(total_invested, current_value),
      return_percentage: this.calculateReturnPercentage(total_invested, current_value),
      total_schemes: holdings.length
    };
  }

  /**
   * Calculate day change (requires previous day value)
   */
  static calculateDayChange(
    currentValue: number,
    previousValue: number
  ): {
    amount: number;
    percentage: number;
  } {
    const amount = this.roundAmount(currentValue - previousValue);
    const percentage = previousValue !== 0 
      ? Math.round(((currentValue - previousValue) / previousValue) * 10000) / 100
      : 0;

    return { amount, percentage };
  }

  /**
   * Calculate moving average
   */
  static calculateMovingAverage(
    values: number[],
    period: number
  ): number[] {
    if (values.length < period) return [];

    const movingAverages: number[] = [];

    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      movingAverages.push(this.roundAmount(sum / period));
    }

    return movingAverages;
  }

  /**
   * Calculate volatility (standard deviation of returns)
   */
  static calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return Math.round(stdDev * 100) / 100;
  }

  /**
   * Calculate Sharpe Ratio
   */
  static calculateSharpeRatio(
    portfolioReturn: number,
    riskFreeRate: number,
    volatility: number
  ): number {
    if (volatility === 0) return 0;
    
    const sharpe = (portfolioReturn - riskFreeRate) / volatility;
    return Math.round(sharpe * 100) / 100;
  }

  /**
   * Sort holdings by value (descending by default)
   */
  static sortByValue<T extends { current_value: number }>(
    holdings: T[],
    ascending: boolean = false
  ): T[] {
    return [...holdings].sort((a, b) => 
      ascending 
        ? a.current_value - b.current_value
        : b.current_value - a.current_value
    );
  }

  /**
   * Sort holdings by returns percentage
   */
  static sortByReturns<T extends { return_percentage: number }>(
    holdings: T[],
    ascending: boolean = false
  ): T[] {
    return [...holdings].sort((a, b) => 
      ascending 
        ? a.return_percentage - b.return_percentage
        : b.return_percentage - a.return_percentage
    );
  }

  /**
   * Filter holdings by minimum value
   */
  static filterByMinValue<T extends { current_value: number }>(
    holdings: T[],
    minValue: number
  ): T[] {
    return holdings.filter(h => h.current_value >= minValue);
  }

  /**
   * Filter holdings by category
   */
  static filterByCategory<T extends { category?: string }>(
    holdings: T[],
    categories: string[]
  ): T[] {
    return holdings.filter(h => 
      categories.includes(h.category || 'Uncategorized')
    );
  }

  /**
   * Get top performers
   */
  static getTopPerformers<T extends { return_percentage: number }>(
    holdings: T[],
    count: number = 5
  ): T[] {
    return this.sortByReturns(holdings, false).slice(0, count);
  }

  /**
   * Get bottom performers
   */
  static getBottomPerformers<T extends { return_percentage: number }>(
    holdings: T[],
    count: number = 5
  ): T[] {
    return this.sortByReturns(holdings, true).slice(0, count);
  }

  /**
   * Round amount to 2 decimal places
   */
  static roundAmount(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Round percentage to 2 decimal places
   */
  static roundPercentage(percentage: number): number {
    return Math.round(percentage * 100) / 100;
  }

  /**
   * Format currency (Indian Rupees)
   */
  static formatCurrency(amount: number): string {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    
    // Convert to lakhs/crores format
    if (absAmount >= 10000000) { // 1 crore
      return `${sign}₹${(absAmount / 10000000).toFixed(2)}Cr`;
    } else if (absAmount >= 100000) { // 1 lakh
      return `${sign}₹${(absAmount / 100000).toFixed(2)}L`;
    } else if (absAmount >= 1000) { // 1 thousand
      return `${sign}₹${(absAmount / 1000).toFixed(2)}K`;
    } else {
      return `${sign}₹${absAmount.toFixed(2)}`;
    }
  }

  /**
   * Build portfolio filters SQL WHERE clause
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
      params.push(filters.scheme_code);
      paramIndex++;
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(filters.category);
      paramIndex++;
    }

    if (filters.sub_category) {
      conditions.push(`sub_category = $${paramIndex}`);
      params.push(filters.sub_category);
      paramIndex++;
    }

    if (filters.min_value) {
      conditions.push(`current_value >= $${paramIndex}`);
      params.push(filters.min_value);
      paramIndex++;
    }

    if (filters.max_value) {
      conditions.push(`current_value <= $${paramIndex}`);
      params.push(filters.max_value);
      paramIndex++;
    }

    const where = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
    return { where, params };
  }
}