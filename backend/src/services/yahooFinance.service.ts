// backend/src/services/yahooFinance.service.ts
// Yahoo Finance Data Source Service for Market Data

import { SimpleLogger } from './simpleLogger.service';

export interface YahooFinanceRecord {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  adj_close?: number;
  volume?: number;
}

export interface YahooFinanceResponse {
  success: boolean;
  data: YahooFinanceRecord[];
  symbol: string;
  error?: string;
  recordCount?: number;
}

export interface YahooFinanceOptions {
  requestId?: string;
  retryAttempts?: number;
  timeout?: number;
}

export class YahooFinanceService {
  private readonly BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  /**
   * Download historical data from Yahoo Finance
   * @param symbol Yahoo Finance symbol (e.g., "^NSEI")
   * @param startDate Start date for historical data
   * @param endDate End date for historical data
   * @param options Additional options for the request
   */
  async downloadHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date,
    options: YahooFinanceOptions = {}
  ): Promise<YahooFinanceResponse> {
    const {
      requestId = `hist_${symbol}_${Date.now()}`,
      retryAttempts = 3,
      timeout = 30000
    } = options;

    SimpleLogger.info('YahooFinance', 'Starting historical data download', 'downloadHistoricalData', {
      symbol,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      requestId
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const data = await this.fetchDataFromYahoo(symbol, startDate, endDate, timeout);
        
        SimpleLogger.info('YahooFinance', 'Historical data downloaded successfully', 'downloadHistoricalData', {
          symbol,
          recordCount: data.length,
          attempt,
          requestId
        });

        return {
          success: true,
          data,
          symbol,
          recordCount: data.length
        };

      } catch (error: any) {
        lastError = error;
        
        SimpleLogger.warn('YahooFinance', `Download attempt ${attempt} failed`, 'downloadHistoricalData', {
          symbol,
          attempt,
          error: error.message,
          requestId
        });

        if (attempt < retryAttempts) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await this.sleep(delayMs);
        }
      }
    }

    // All attempts failed
    const errorMessage = lastError?.message || 'Unknown error occurred';
    
    SimpleLogger.error('YahooFinance', 'All download attempts failed', 'downloadHistoricalData', {
      symbol,
      attempts: retryAttempts,
      error: errorMessage,
      requestId
    }, undefined, undefined, lastError?.stack);

    return {
      success: false,
      data: [],
      symbol,
      error: errorMessage
    };
  }

  /**
   * Download latest/current day data
   * @param symbol Yahoo Finance symbol
   */
  async downloadLatestData(
    symbol: string,
    options: YahooFinanceOptions = {}
  ): Promise<YahooFinanceResponse> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 5); // Get last 5 days to ensure we have data

    return this.downloadHistoricalData(symbol, yesterday, today, {
      ...options,
      requestId: options.requestId || `eod_${symbol}_${Date.now()}`
    });
  }

  /**
   * Fetch data from Yahoo Finance API
   */
  private async fetchDataFromYahoo(
    symbol: string,
    startDate: Date,
    endDate: Date,
    timeout: number
  ): Promise<YahooFinanceRecord[]> {
    // Convert dates to Unix timestamps
    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);

    // Build URL
    const url = `${this.BASE_URL}/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=history`;

    SimpleLogger.info('YahooFinance', 'Fetching data from Yahoo Finance', 'fetchDataFromYahoo', {
      symbol,
      url,
      period1,
      period2
    });

    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': this.USER_AGENT,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonData = await response.json();

      // Parse Yahoo Finance response
      return this.parseYahooFinanceResponse(jsonData, symbol);

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Parse Yahoo Finance JSON response
   */
  private parseYahooFinanceResponse(jsonData: any, symbol: string): YahooFinanceRecord[] {
    try {
      // Navigate to the data structure
      const chart = jsonData?.chart;
      if (!chart || chart.error) {
        throw new Error(chart?.error?.description || 'Invalid response from Yahoo Finance');
      }

      const result = chart.result?.[0];
      if (!result) {
        throw new Error('No data found in Yahoo Finance response');
      }

      const timestamps = result.timestamp;
      const quotes = result.indicators?.quote?.[0];
      const adjClose = result.indicators?.adjclose?.[0];

      if (!timestamps || !quotes || timestamps.length === 0) {
        // No trading data for the requested period (weekends, holidays, or future dates)
        SimpleLogger.info('YahooFinance', 'No trading data available for requested period', 'parseYahooFinanceResponse', {
          symbol,
          hasTimestamps: !!timestamps,
          hasQuotes: !!quotes,
          timestampCount: timestamps?.length || 0
        });
        return [];
      }

      // Build records array
      const records: YahooFinanceRecord[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        // Skip if any OHLC value is null (market holiday/no trading)
        if (
          quotes.open[i] === null ||
          quotes.high[i] === null ||
          quotes.low[i] === null ||
          quotes.close[i] === null
        ) {
          continue;
        }

        const record: YahooFinanceRecord = {
          date: new Date(timestamps[i] * 1000), // Convert Unix timestamp to Date
          open: this.roundToTwoDecimals(quotes.open[i]),
          high: this.roundToTwoDecimals(quotes.high[i]),
          low: this.roundToTwoDecimals(quotes.low[i]),
          close: this.roundToTwoDecimals(quotes.close[i]),
          volume: quotes.volume?.[i] || undefined,
          adj_close: adjClose?.adjclose?.[i] ? this.roundToTwoDecimals(adjClose.adjclose[i]) : undefined
        };

        records.push(record);
      }

      SimpleLogger.info('YahooFinance', 'Parsed Yahoo Finance response', 'parseYahooFinanceResponse', {
        symbol,
        totalTimestamps: timestamps.length,
        validRecords: records.length,
        dateRange: records.length > 0 ? {
          start: records[0].date.toISOString().split('T')[0],
          end: records[records.length - 1].date.toISOString().split('T')[0]
        } : null
      });

      return records;

    } catch (error: any) {
      SimpleLogger.error('YahooFinance', 'Failed to parse Yahoo Finance response', 'parseYahooFinanceResponse', {
        symbol,
        error: error.message
      }, undefined, undefined, error.stack);

      throw new Error(`Failed to parse Yahoo Finance data: ${error.message}`);
    }
  }

  /**
   * Validate symbol format
   */
  isValidSymbol(symbol: string): boolean {
    // Yahoo Finance symbols for NSE indices typically start with ^
    // Examples: ^NSEI, ^NSEBANK, ^CNXIT
    return /^(\^|)[A-Z0-9_\.]+$/i.test(symbol);
  }

  /**
   * Get symbol URL for user reference
   */
  getSymbolUrl(symbol: string): string {
    return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
  }

  /**
   * Helper: Round to 2 decimal places
   */
  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to Yahoo Finance
   */
  async testConnection(symbol: string = '^NSEI'): Promise<boolean> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      const result = await this.downloadHistoricalData(symbol, startDate, endDate, {
        requestId: 'connection_test',
        retryAttempts: 1,
        timeout: 10000
      });

      return result.success && result.data.length > 0;
    } catch (error: any) {
      SimpleLogger.error('YahooFinance', 'Connection test failed', 'testConnection', {
        symbol,
        error: error.message
      });
      return false;
    }
  }
}