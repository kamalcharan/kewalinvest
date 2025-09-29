// backend/src/services/amfiDataSource.service.ts
// File 5/14: AMFI API integration with idempotency and race condition handling
// UPDATED: Fixed historical endpoint with mf=62 parameter and 90-day limit

import { SimpleLogger } from './simpleLogger.service';
import { ParsedNavRecord } from '../types/nav.types';

export interface AmfiApiResponse {
  success: boolean;
  data?: ParsedNavRecord[];
  error?: string;
  source: 'daily' | 'historical';
  requestId: string;
  totalRecords: number;
  processingTime: number;
}

export interface AmfiDownloadOptions {
  requestId?: string;              // For idempotency tracking
  retryAttempts?: number;          // Default: 3
  retryDelay?: number;             // Default: 1000ms
  rateLimitDelay?: number;         // Default: 1000ms (1 req/sec)
  timeout?: number;                // Default: 30000ms
  validateData?: boolean;          // Default: true
}

export class AmfiDataSourceService {
  private readonly DAILY_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';
  private readonly HISTORICAL_BASE_URL = 'http://portal.amfiindia.com/DownloadNAVHistoryReport_Po.aspx';
  
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;
  private readonly DEFAULT_RATE_LIMIT_DELAY = 1000; // 1 request per second
  private readonly DEFAULT_TIMEOUT = 30000;
  
  // In-memory cache for request deduplication (prevent concurrent identical requests)
  private requestCache = new Map<string, Promise<AmfiApiResponse>>();
  private lastRequestTime = 0;

  constructor() {}

  /**
   * Download daily NAV data for all schemes
   * Idempotent: Same requestId returns cached result
   */
  async downloadDailyNavData(options: AmfiDownloadOptions = {}): Promise<AmfiApiResponse> {
    const requestId = options.requestId || `daily_${new Date().toISOString().split('T')[0]}`;
    
    try {
      // Check for concurrent requests with same ID (prevents race conditions)
      if (this.requestCache.has(requestId)) {
        SimpleLogger.error('AmfiDataSource', 'Daily NAV request already in progress, returning cached promise', 'downloadDailyNavData', { requestId });
        return await this.requestCache.get(requestId)!;
      }

      // Create and cache the request promise
      const requestPromise = this.executeDailyDownload(requestId, options);
      this.requestCache.set(requestId, requestPromise);

      const result = await requestPromise;

      // Clean up cache after completion
      setTimeout(() => this.requestCache.delete(requestId), 60000); // Cache for 1 minute

      return result;

    } catch (error: any) {
      // Clean up cache on error
      this.requestCache.delete(requestId);
      
      SimpleLogger.error('AmfiDataSource', 'Daily NAV download failed', 'downloadDailyNavData', {
        requestId, error: error.message
      }, undefined, undefined, error.stack);
      
      throw error;
    }
  }

  /**
   * Download historical NAV data for date range
   * Idempotent: Same date range returns same data
   */
  async downloadHistoricalNavData(
    startDate: Date, 
    endDate: Date, 
    options: AmfiDownloadOptions = {}
  ): Promise<AmfiApiResponse> {
    const startDateStr = this.formatDate(startDate);
    const endDateStr = this.formatDate(endDate);
    const requestId = options.requestId || `historical_${startDateStr}_${endDateStr}`;
    
    try {
      // Validate date range
      if (startDate > endDate) {
        throw new Error('Start date cannot be after end date');
      }

      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) { // UPDATED: Changed from 183 to 90 days (AMFI restriction)
        throw new Error('Historical download limited to 90 days per request (AMFI restriction)');
      }

      // Check for concurrent requests
      if (this.requestCache.has(requestId)) {
        SimpleLogger.error('AmfiDataSource', 'Historical NAV request already in progress', 'downloadHistoricalNavData', { requestId, startDate, endDate });
        return await this.requestCache.get(requestId)!;
      }

      // Create and cache the request promise
      const requestPromise = this.executeHistoricalDownload(startDate, endDate, requestId, options);
      this.requestCache.set(requestId, requestPromise);

      const result = await requestPromise;

      // Clean up cache
      setTimeout(() => this.requestCache.delete(requestId), 300000); // Cache for 5 minutes

      return result;

    } catch (error: any) {
      this.requestCache.delete(requestId);
      
      SimpleLogger.error('AmfiDataSource', 'Historical NAV download failed', 'downloadHistoricalNavData', {
        requestId, startDate, endDate, error: error.message
      }, undefined, undefined, error.stack);
      
      throw error;
    }
  }

  /**
   * Download NAV data for specific scheme (daily)
   */
  async downloadSchemeNavData(schemeCode: string, options: AmfiDownloadOptions = {}): Promise<AmfiApiResponse> {
    const requestId = options.requestId || `scheme_${schemeCode}_${new Date().toISOString().split('T')[0]}`;
    
    try {
      if (this.requestCache.has(requestId)) {
        return await this.requestCache.get(requestId)!;
      }

      const requestPromise = this.executeSchemeDownload(schemeCode, requestId, options);
      this.requestCache.set(requestId, requestPromise);

      const result = await requestPromise;
      setTimeout(() => this.requestCache.delete(requestId), 60000);

      return result;

    } catch (error: any) {
      this.requestCache.delete(requestId);
      throw error;
    }
  }

  // ==================== PRIVATE EXECUTION METHODS ====================

  /**
   * Execute daily NAV download with retry logic
   */
  private async executeDailyDownload(requestId: string, options: AmfiDownloadOptions): Promise<AmfiApiResponse> {
    const startTime = Date.now();

    try {
      SimpleLogger.error('AmfiDataSource', 'Starting daily NAV download', 'executeDailyDownload', { requestId });

      const body = await this.makeAmfiRequest(this.DAILY_NAV_URL, options);
      const parsedData = this.parseDailyNavData(body);

      if (options.validateData !== false) {
        this.validateNavData(parsedData);
      }

      const processingTime = Date.now() - startTime;

      SimpleLogger.error('AmfiDataSource', 'Daily NAV download completed successfully', 'executeDailyDownload', {
        requestId, totalRecords: parsedData.length, processingTime
      });

      return {
        success: true,
        data: parsedData,
        source: 'daily',
        requestId,
        totalRecords: parsedData.length,
        processingTime
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        source: 'daily',
        requestId,
        totalRecords: 0,
        processingTime
      };
    }
  }

  /**
   * Execute historical NAV download with retry logic
   */
  private async executeHistoricalDownload(
    startDate: Date, 
    endDate: Date, 
    requestId: string, 
    options: AmfiDownloadOptions
  ): Promise<AmfiApiResponse> {
    const startTime = Date.now();

    try {
      const startDateStr = this.formatDate(startDate);
      const endDateStr = this.formatDate(endDate);
      // UPDATED: Added mf=62 parameter to fix 404 error
      const url = `${this.HISTORICAL_BASE_URL}?mf=62&frmdt=${startDateStr}&todt=${endDateStr}&tp=1`;

      SimpleLogger.error('AmfiDataSource', 'Starting historical NAV download', 'executeHistoricalDownload', {
        requestId, startDate, endDate, url
      });

      const body = await this.makeAmfiRequest(url, options);
      const parsedData = this.parseHistoricalNavData(body);

      if (options.validateData !== false) {
        this.validateNavData(parsedData);
      }

      const processingTime = Date.now() - startTime;

      SimpleLogger.error('AmfiDataSource', 'Historical NAV download completed successfully', 'executeHistoricalDownload', {
        requestId, totalRecords: parsedData.length, processingTime
      });

      return {
        success: true,
        data: parsedData,
        source: 'historical',
        requestId,
        totalRecords: parsedData.length,
        processingTime
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        source: 'historical',
        requestId,
        totalRecords: 0,
        processingTime
      };
    }
  }

  /**
   * Execute single scheme NAV download
   */
  private async executeSchemeDownload(schemeCode: string, requestId: string, options: AmfiDownloadOptions): Promise<AmfiApiResponse> {
    const startTime = Date.now();

    try {
      const body = await this.makeAmfiRequest(this.DAILY_NAV_URL, options);
      const allData = this.parseDailyNavData(body);
      const schemeData = allData.filter(record => record.scheme_code === schemeCode);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: schemeData,
        source: 'daily',
        requestId,
        totalRecords: schemeData.length,
        processingTime
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        source: 'daily',
        requestId,
        totalRecords: 0,
        processingTime
      };
    }
  }

  // ==================== HTTP REQUEST HANDLING ====================

  /**
   * Make HTTP request to AMFI with rate limiting and retry logic
   */
  private async makeAmfiRequest(url: string, options: AmfiDownloadOptions): Promise<string> {
    const retryAttempts = options.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS;
    const retryDelay = options.retryDelay || this.DEFAULT_RETRY_DELAY;
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const rateLimitDelay = options.rateLimitDelay || this.DEFAULT_RATE_LIMIT_DELAY;

    // Rate limiting: Ensure minimum delay between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < rateLimitDelay) {
      const waitTime = rateLimitDelay - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        this.lastRequestTime = Date.now();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/plain, text/html, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Referer': 'http://portal.amfiindia.com/'
  },
  signal: controller.signal
});

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const body = await response.text();
        
        if (!body || body.trim().length === 0) {
          throw new Error('Empty response from AMFI API');
        }

        SimpleLogger.error('AmfiDataSource', 'AMFI API request successful', 'makeAmfiRequest', {
          url, attempt, responseLength: body.length
        });

        return body;

      } catch (error: any) {
        lastError = error;
        
        SimpleLogger.error('AmfiDataSource', `AMFI API request attempt ${attempt} failed`, 'makeAmfiRequest', {
          url, attempt, error: error.message
        });

        if (error.name === 'AbortError') {
          lastError = new Error(`Request timeout after ${timeout}ms`);
        }

        // If this isn't the last attempt, wait before retrying
        if (attempt < retryAttempts) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          SimpleLogger.error('AmfiDataSource', `Retrying AMFI API request in ${delay}ms`, 'makeAmfiRequest', { url, attempt, delay });
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  // ==================== DATA PARSING METHODS ====================

  /**
   * Parse daily NAV data (based on your provided logic)
   */
  private parseDailyNavData(body: string): ParsedNavRecord[] {
    try {
      const fundData: ParsedNavRecord[] = [];
      const bodyClean = body.replace(/\r?\n/g, "\n");
      const bodyArr = bodyClean.split("\n");
      const funds = bodyArr.map((str) => str.split(";"));
      const headers = funds[0];

      for (let i = 1; i < funds.length; i++) {
        if (funds[i].length === 6 && funds[i][0].trim() !== '') {
          const record: any = {};
          
          // Map headers to record
          for (let j = 0; j < 6; j++) {
            record[headers[j]] = funds[i][j];
          }

          // Convert to our internal format
          const parsedRecord: ParsedNavRecord = {
            scheme_code: record['Scheme Code']?.trim() || '',
            scheme_name: record['Scheme Name']?.trim() || '',
            nav_value: this.parseFloatSafe(record['Net Asset Value']),
            nav_date: this.parseNavDate(record['Date']),
            isin_div_payout_growth: record['ISIN Div Payout/ ISIN Growth']?.trim(),
            isin_div_reinvestment: record['ISIN Div Reinvestment']?.trim()
          };

          // Only include valid records
          if (parsedRecord.scheme_code && parsedRecord.nav_value > 0 && parsedRecord.nav_date) {
            fundData.push(parsedRecord);
          }
        }
      }

      return fundData;

    } catch (error: any) {
      SimpleLogger.error('AmfiDataSource', 'Failed to parse daily NAV data', 'parseDailyNavData', {
        error: error.message, bodyLength: body.length
      });
      throw new Error(`Failed to parse daily NAV data: ${error.message}`);
    }
  }

  /**
   * Parse historical NAV data (based on your provided logic)
   */
  private parseHistoricalNavData(body: string): ParsedNavRecord[] {
    try {
      const fundData: ParsedNavRecord[] = [];
      const bodyClean = body.replace(/\r?\n/g, "\n");
      const bodyArr = bodyClean.split("\n");
      const funds = bodyArr.map((str) => str.split(";"));
      const headers = funds[0];

      for (let i = 1; i < funds.length; i++) {
        if (funds[i].length === 8 && funds[i][0].trim() !== '') {
          const record: any = {};
          
          // Map headers to record (skip columns 2, 3, 5, 6 as per your logic)
          for (let j = 0; j < 8; j++) {
            if (j === 2 || j === 3 || j === 5 || j === 6) {
              continue; // Skip these columns
            }
            record[headers[j]] = funds[i][j];
          }

          // Convert to our internal format
          const parsedRecord: ParsedNavRecord = {
            scheme_code: record['Scheme Code']?.trim() || '',
            scheme_name: record['Scheme Name']?.trim() || '',
            nav_value: this.parseFloatSafe(record['Net Asset Value']),
            repurchase_price: this.parseFloatSafe(record['Repurchase Price']),
            sale_price: this.parseFloatSafe(record['Sale Price']),
            nav_date: this.parseNavDate(record['Date'])
          };

          // Only include valid records
          if (parsedRecord.scheme_code && parsedRecord.nav_value > 0 && parsedRecord.nav_date) {
            fundData.push(parsedRecord);
          }
        }
      }

      return fundData;

    } catch (error: any) {
      SimpleLogger.error('AmfiDataSource', 'Failed to parse historical NAV data', 'parseHistoricalNavData', {
        error: error.message, bodyLength: body.length
      });
      throw new Error(`Failed to parse historical NAV data: ${error.message}`);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Validate NAV data for consistency
   */
  private validateNavData(data: ParsedNavRecord[]): void {
    if (!data || data.length === 0) {
      throw new Error('No valid NAV records found');
    }

    let invalidRecords = 0;
    for (const record of data) {
      if (!record.scheme_code || !record.scheme_name || !record.nav_value || !record.nav_date) {
        invalidRecords++;
      }
    }

    const invalidPercentage = (invalidRecords / data.length) * 100;
    if (invalidPercentage > 10) { // More than 10% invalid records
      throw new Error(`Data quality issue: ${invalidPercentage.toFixed(1)}% invalid records`);
    }

    SimpleLogger.error('AmfiDataSource', 'NAV data validation completed', 'validateNavData', {
      totalRecords: data.length, invalidRecords, invalidPercentage: invalidPercentage.toFixed(1)
    });
  }

  /**
   * Parse float values safely
   */
  private parseFloatSafe(value: string): number {
    if (!value || value.trim() === '' || value.trim() === '-' || value.trim() === 'N.A.') {
      return 0;
    }
    
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse NAV date from AMFI format (DD-MMM-YYYY)
   */
  private parseNavDate(dateStr: string): Date | null {
    try {
      if (!dateStr || dateStr.trim() === '') {
        return null;
      }

      // AMFI format: "25-Sep-2024"
      const parts = dateStr.trim().split('-');
      if (parts.length !== 3) {
        return null;
      }

      const day = parseInt(parts[0]);
      const monthStr = parts[1];
      const year = parseInt(parts[2]);

      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };

      const month = monthMap[monthStr];
      if (month === undefined) {
        return null;
      }

      const date = new Date(year, month, day);
      
      // Validate the date
      if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
      }

      return date;

    } catch (error) {
      SimpleLogger.error('AmfiDataSource', 'Failed to parse NAV date', 'parseNavDate', { dateStr });
      return null;
    }
  }

  /**
   * Format date for AMFI API (DD-MMM-YYYY)
   */
 private formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];  // ← FIX: use month name
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;  // Will output: 27-May-2025 (CORRECT)
}

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear request cache (for testing or cleanup)
   */
  public clearCache(): void {
    this.requestCache.clear();
    SimpleLogger.error('AmfiDataSource', 'Request cache cleared', 'clearCache');
  }

  /**
   * Get cache statistics (for monitoring)
   */
  public getCacheStats(): { activeRequests: number; cacheKeys: string[] } {
    return {
      activeRequests: this.requestCache.size,
      cacheKeys: Array.from(this.requestCache.keys()    )
    };
  }
}