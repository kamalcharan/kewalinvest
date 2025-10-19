// backend/src/services/marketMetricsCalculator.service.ts
// Market Metrics Calculator - Optimized for incremental daily updates

import { MarketDataRecord } from '../types/market.types';
import { SimpleLogger } from './simpleLogger.service';

export interface PricePoint {
  date: Date;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface CalculatedMetrics {
  daily_return: number | null;
  return_1w: number | null;
  return_1m: number | null;
  return_3m: number | null;
  return_6m: number | null;
  return_1y: number | null;
  return_ytd: number | null;
  return_all: number | null;
  sd_7d: number | null;
  sd_14d: number | null;
  sd_21d: number | null;
  sd_42d: number | null;
  sd_3m: number | null;
  sd_6m: number | null;
  count_3m: number | null;
  count_42d: number | null;
  sharpe_ratio: number | null;
  max_drawdown: number | null;
  total_risk: number | null;
  cagr: number | null;
}

export class MarketMetricsCalculator {
  private riskFreeRate: number = 0.065; // 6.5% annual risk-free rate (assumption)

  /**
   * Calculate return between two prices
   * Return % = ((end_price - start_price) / start_price) * 100
   */
  private calculateReturn(endPrice: number, startPrice: number): number {
    if (startPrice === 0) return 0;
    return ((endPrice - startPrice) / startPrice) * 100;
  }

  /**
   * Calculate standard deviation of returns
   */
  private calculateStandardDeviation(prices: number[]): number {
    if (prices.length < 2) return 0;

    // Calculate returns from prices
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = this.calculateReturn(prices[i], prices[i - 1]);
      returns.push(ret);
    }

    // Calculate mean
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;

    // Calculate variance
    const variance = returns.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / returns.length;

    // Return std dev
    return Math.sqrt(variance);
  }

  /**
   * Calculate Sharpe Ratio
   * Sharpe = (Return - RiskFreeRate) / StdDeviation
   */
  private calculateSharpeRatio(periodReturn: number, periodStdDev: number): number {
    if (periodStdDev === 0) return 0;
    
    // Annualize if needed for consistency
    return (periodReturn - this.riskFreeRate) / periodStdDev;
  }

  /**
   * Calculate maximum drawdown
   * Max consecutive decline from peak to trough
   */
  private calculateMaxDrawdown(prices: number[]): number {
    if (prices.length === 0) return 0;

    let maxDrawdown = 0;
    let peak = prices[0];

    for (let i = 1; i < prices.length; i++) {
      const currentPrice = prices[i];
      const drawdown = ((currentPrice - peak) / peak) * 100;

      if (currentPrice > peak) {
        peak = currentPrice;
      }

      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Calculate CAGR (Compound Annual Growth Rate)
   * CAGR = (EndValue / StartValue)^(1/Years) - 1
   */
  private calculateCAGR(startPrice: number, endPrice: number, days: number): number {
    if (startPrice === 0 || days === 0) return 0;

    const years = days / 365;
    const cagr = Math.pow(endPrice / startPrice, 1 / years) - 1;

    return cagr * 100; // Convert to percentage
  }

  /**
   * Get prices for a specific window from historical data
   */
  private getPricesForWindow(allPrices: PricePoint[], days: number): number[] {
    if (allPrices.length === 0) return [];

    // Get last N days of data
    const windowData = allPrices.slice(Math.max(0, allPrices.length - days));
    return windowData.map(p => p.close);
  }

  /**
   * Find price from specific number of trading days ago
   */
  private getPriceFromDaysAgo(allPrices: PricePoint[], tradingDaysAgo: number): PricePoint | null {
    if (allPrices.length === 0) return null;
    
    const index = allPrices.length - 1 - tradingDaysAgo;
    if (index < 0) return null;

    return allPrices[index];
  }

  /**
   * Find price from specific date or get the closest prior date
   */
  private getPriceAtOrBeforeDate(allPrices: PricePoint[], targetDate: Date): PricePoint | null {
    for (let i = allPrices.length - 1; i >= 0; i--) {
      if (new Date(allPrices[i].date) <= targetDate) {
        return allPrices[i];
      }
    }
    return null;
  }

  /**
   * Get trading day count (filter out weekends)
   */
  private getWeekAgoDate(baseDate: Date): Date {
    const date = new Date(baseDate);
    let daysToGoBack = 7;

    while (daysToGoBack > 0) {
      date.setDate(date.getDate() - 1);
      const dayOfWeek = date.getDay();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysToGoBack--;
      }
    }

    return date;
  }

  /**
   * Get month ago date (end of previous month or max trading date)
   */
  private getMonthAgoDate(baseDate: Date): Date {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() - 1);
    date.setDate(0); // Last day of previous month
    return date;
  }

  /**
   * Get quarter ago date (90 days back, skipping weekends)
   */
  private getQuarterAgoDate(baseDate: Date): Date {
    const date = new Date(baseDate);
    let daysToGoBack = 90;

    while (daysToGoBack > 0) {
      date.setDate(date.getDate() - 1);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysToGoBack--;
      }
    }

    return date;
  }

  /**
   * Get year ago date (365 days back, skipping weekends)
   */
  private getYearAgoDate(baseDate: Date): Date {
    const date = new Date(baseDate);
    let daysToGoBack = 252; // ~252 trading days in a year

    while (daysToGoBack > 0) {
      date.setDate(date.getDate() - 1);
      const dayOfWeek = date.getDay();
      
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysToGoBack--;
      }
    }

    return date;
  }

  /**
   * Get year-to-date starting date
   */
  private getYTDStartDate(baseDate: Date): Date {
    return new Date(baseDate.getFullYear(), 0, 1);
  }

  /**
   * Calculate all metrics for a specific date
   * Optimized for daily incremental updates
   */
  async calculateMetricsForDate(
    todayPrice: PricePoint,
    allHistoricalPrices: PricePoint[]
  ): Promise<CalculatedMetrics> {
    try {
      const today = todayPrice.close;
      const todayDate = new Date(todayPrice.date);

      // Find price points for different lookback periods
      const yesterdayPrice = this.getPriceFromDaysAgo(allHistoricalPrices, 1);
      const weekAgoPrice = this.getPriceAtOrBeforeDate(allHistoricalPrices, this.getWeekAgoDate(todayDate));
      const monthAgoPrice = this.getPriceAtOrBeforeDate(allHistoricalPrices, this.getMonthAgoDate(todayDate));
      const quarterAgoPrice = this.getPriceAtOrBeforeDate(allHistoricalPrices, this.getQuarterAgoDate(todayDate));
      const yearAgoPrice = this.getPriceAtOrBeforeDate(allHistoricalPrices, this.getYearAgoDate(todayDate));
      const ytdStartPrice = this.getPriceAtOrBeforeDate(allHistoricalPrices, this.getYTDStartDate(todayDate));
      const allTimePrice = allHistoricalPrices.length > 0 ? allHistoricalPrices[0] : null;

      // Get prices for volatility windows
      const last7Days = this.getPricesForWindow(allHistoricalPrices, 7);
      const last14Days = this.getPricesForWindow(allHistoricalPrices, 14);
      const last21Days = this.getPricesForWindow(allHistoricalPrices, 21);
      const last42Days = this.getPricesForWindow(allHistoricalPrices, 42);
      const last90Days = this.getPricesForWindow(allHistoricalPrices, 90);
      const last180Days = this.getPricesForWindow(allHistoricalPrices, 180);

      // Calculate returns
      const dailyReturn = yesterdayPrice 
        ? this.calculateReturn(today, yesterdayPrice.close)
        : null;

      const return1w = weekAgoPrice
        ? this.calculateReturn(today, weekAgoPrice.close)
        : null;

      const return1m = monthAgoPrice
        ? this.calculateReturn(today, monthAgoPrice.close)
        : null;

      const return3m = quarterAgoPrice
        ? this.calculateReturn(today, quarterAgoPrice.close)
        : null;

      const return6m = this.getPriceAtOrBeforeDate(allHistoricalPrices, this.getYearAgoDate(new Date(todayDate.getTime() - 180 * 24 * 60 * 60 * 1000)))
        ? this.calculateReturn(today, this.getPriceAtOrBeforeDate(allHistoricalPrices, this.getYearAgoDate(new Date(todayDate.getTime() - 180 * 24 * 60 * 60 * 1000)))!.close)
        : null;

      const return1y = yearAgoPrice
        ? this.calculateReturn(today, yearAgoPrice.close)
        : null;

      const returnYtd = ytdStartPrice
        ? this.calculateReturn(today, ytdStartPrice.close)
        : null;

      const returnAll = allTimePrice
        ? this.calculateReturn(today, allTimePrice.close)
        : null;

      // Calculate volatilities
      const sd7d = last7Days.length > 1 ? this.calculateStandardDeviation(last7Days) : null;
      const sd14d = last14Days.length > 1 ? this.calculateStandardDeviation(last14Days) : null;
      const sd21d = last21Days.length > 1 ? this.calculateStandardDeviation(last21Days) : null;
      const sd42d = last42Days.length > 1 ? this.calculateStandardDeviation(last42Days) : null;
      const sd3m = last90Days.length > 1 ? this.calculateStandardDeviation(last90Days) : null;
      const sd6m = last180Days.length > 1 ? this.calculateStandardDeviation(last180Days) : null;

      // Calculate counts
      const count3m = last90Days.length;
      const count42d = last42Days.length;

      // Calculate Sharpe Ratio (using 30-day volatility)
      const sharpeRatio = sd30d && return1m
        ? this.calculateSharpeRatio(return1m, sd30d)
        : null;

      // Calculate Max Drawdown (last 252 days ~1 year)
      const last252Days = this.getPricesForWindow(allHistoricalPrices, 252);
      const maxDrawdown = last252Days.length > 0 ? this.calculateMaxDrawdown(last252Days) : null;

      // Calculate Total Risk (use latest 30-day volatility as proxy)
      const sd30d = this.getPricesForWindow(allHistoricalPrices, 30).length > 1
        ? this.calculateStandardDeviation(this.getPricesForWindow(allHistoricalPrices, 30))
        : null;

      // Calculate CAGR
      let cagr: number | null = null;
      if (yearAgoPrice && allHistoricalPrices.length > 252) {
        cagr = this.calculateCAGR(yearAgoPrice.close, today, 365);
      } else if (allTimePrice && allHistoricalPrices.length > 1) {
        const daysDiff = Math.max(1, allHistoricalPrices.length);
        cagr = this.calculateCAGR(allTimePrice.close, today, daysDiff);
      }

      const metrics: CalculatedMetrics = {
        daily_return: dailyReturn,
        return_1w: return1w,
        return_1m: return1m,
        return_3m: return3m,
        return_6m: return6m,
        return_1y: return1y,
        return_ytd: returnYtd,
        return_all: returnAll,
        sd_7d: sd7d,
        sd_14d: sd14d,
        sd_21d: sd21d,
        sd_42d: sd42d,
        sd_3m: sd3m,
        sd_6m: sd6m,
        count_3m: count3m,
        count_42d: count42d,
        sharpe_ratio: sharpeRatio,
        max_drawdown: maxDrawdown,
        total_risk: sd30d,
        cagr: cagr
      };

      return metrics;
    } catch (error: any) {
      SimpleLogger.error('MarketMetricsCalculator', 'Failed to calculate metrics', 'calculateMetricsForDate', {
        error: error.message
      }, undefined, undefined, error.stack);
      
      // Return all nulls on error
      return {
        daily_return: null,
        return_1w: null,
        return_1m: null,
        return_3m: null,
        return_6m: null,
        return_1y: null,
        return_ytd: null,
        return_all: null,
        sd_7d: null,
        sd_14d: null,
        sd_21d: null,
        sd_42d: null,
        sd_3m: null,
        sd_6m: null,
        count_3m: null,
        count_42d: null,
        sharpe_ratio: null,
        max_drawdown: null,
        total_risk: null,
        cagr: null
      };
    }
  }
}

export const marketMetricsCalculator = new MarketMetricsCalculator();