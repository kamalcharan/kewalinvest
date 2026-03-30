// backend/src/services/amfiDataSource.service.ts
// UPDATED: Added MFAPI.in integration for historical NAV data
// REMOVED: Broken AMFI historical download endpoint

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
  requestId?: string;
  retryAttempts?: number;
  retryDelay?: number;
  rateLimitDelay?: number;
  timeout?: number;
  validateData?: boolean;
}

// NEW: MFAPI.in specific response interface
export interface MfapiResponse {
  meta: {
    fund_house: string;
    scheme_name: string;
    scheme_code: number;
  };
  data: Array<{
    date: string;
    nav: string;
  }>;
  status: string;
}

export class AmfiDataSourceService {
  private readonly DAILY_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';
  private readonly MFAPI_BASE_URL = 'https://api.mfapi.in/mf';
  
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;
  private readonly DEFAULT_RATE_LIMIT_DELAY = 500; // 500ms for MFAPI
  private readonly DEFAULT_TIMEOUT = 30000;
  
  private requestCache = new Map<string, Promise<AmfiApiResponse>>();
  private lastRequestTime = 0;

  constructor() {}

  /**
   * Download daily NAV data for all schemes (UNCHANGED)
   */
  async downloadDailyNavData(options: AmfiDownloadOptions = {}): Promise<AmfiApiResponse> {
    const requestId = options.requestId || `daily_${new Date().toISOString().split('T')[0]}`;
    
    try {
      if (this.requestCache.has(requestId)) {
        SimpleLogger.info('AmfiDataSource', 'Daily NAV request already in progress, returning cached promise', 'downloadDailyNavData', { requestId });
        return await this.requestCache.get(requestId)!;
      }

      const requestPromise = this.executeDailyDownload(requestId, options);
      this.requestCache.set(requestId, requestPromise);

      const result = await requestPromise;
      setTimeout(() => this.requestCache.delete(requestId), 60000);

      return result;
    } catch (error: any) {
      this.requestCache.delete(requestId);
      SimpleLogger.error('AmfiDataSource', 'Daily NAV download failed', 'downloadDailyNavData', {
        requestId, error: error.message
      }, undefined, undefined, error.stack);
      throw error;
    }
  }

  /**
   * NEW: Download historical NAV data from MFAPI.in
   * Provides complete history for a single scheme in one API call
   */
  async downloadFromMFAPI(
    schemeCode: string, 
    startDate?: Date, 
    endDate?: Date,
    options: AmfiDownloadOptions = {}
  ): Promise<AmfiApiResponse> {
    const startTime = Date.now();
    const requestId = options.requestId || `mfapi_${schemeCode}_${Date.now()}`;

    try {
      // Validate scheme code
      if (!schemeCode || schemeCode.trim() === '') {
        throw new Error('Valid scheme code is required');
      }

      const trimmedSchemeCode = schemeCode.trim();
      const url = `${this.MFAPI_BASE_URL}/${trimmedSchemeCode}`;

      SimpleLogger.info('AmfiDataSource', 'Starting MFAPI download', 'downloadFromMFAPI', {
        requestId, schemeCode: trimmedSchemeCode, url
      });

      // Rate limiting: enforce 500ms minimum between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.DEFAULT_RATE_LIMIT_DELAY) {
        const waitTime = this.DEFAULT_RATE_LIMIT_DELAY - timeSinceLastRequest;
        await this.sleep(waitTime);
      }

      // Make request with retry logic
      const retryAttempts = options.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS;
      const timeout = options.timeout || this.DEFAULT_TIMEOUT;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          this.lastRequestTime = Date.now();

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const mfapiData = await response.json() as MfapiResponse;

          // Validate response
          if (!mfapiData.data || mfapiData.data.length === 0) {
            throw new Error('No NAV data returned from MFAPI.in');
          }

          // Convert MFAPI format to internal format
          const parsedData = this.convertMfapiToInternal(mfapiData);

          // Apply date range filtering if provided
          let filteredData = parsedData;
          if (startDate || endDate) {
            filteredData = parsedData.filter(record => {
              if (!record.nav_date) return false;
              if (startDate && record.nav_date < startDate) return false;
              if (endDate && record.nav_date > endDate) return false;
              return true;
            });

            if (filteredData.length === 0) {
              SimpleLogger.warn('AmfiDataSource', 'No records found in specified date range', 'downloadFromMFAPI', {
                requestId, schemeCode: trimmedSchemeCode, startDate, endDate, totalRecords: parsedData.length
              });
            }
          }

          const processingTime = Date.now() - startTime;

          SimpleLogger.info('AmfiDataSource', 'MFAPI download completed successfully', 'downloadFromMFAPI', {
            requestId, schemeCode: trimmedSchemeCode, totalRecords: filteredData.length, processingTime
          });

          return {
            success: true,
            data: filteredData,
            source: 'historical',
            requestId,
            totalRecords: filteredData.length,
            processingTime
          };

        } catch (fetchError: any) {
          lastError = fetchError;
          
          SimpleLogger.error('AmfiDataSource', `MFAPI request attempt ${attempt} failed`, 'downloadFromMFAPI', {
            requestId, schemeCode: trimmedSchemeCode, attempt, error: fetchError.message
          });

          if (attempt < retryAttempts) {
            const delay = this.DEFAULT_RETRY_DELAY * Math.pow(2, attempt - 1);
            SimpleLogger.info('AmfiDataSource', `Retrying MFAPI request in ${delay}ms`, 'downloadFromMFAPI', {
              requestId, attempt, delay
            });
            await this.sleep(delay);
          }
        }
      }

      throw lastError || new Error('All retry attempts failed');

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      SimpleLogger.error('AmfiDataSource', 'MFAPI download failed', 'downloadFromMFAPI', {
        requestId, schemeCode, startDate, endDate, error: error.message, processingTime
      }, undefined, undefined, error.stack);
      
      return {
        success: false,
        error: error.message || 'MFAPI download failed',
        source: 'historical',
        requestId,
        totalRecords: 0,
        processingTime
      };
    }
  }

  /**
   * NEW: Convert MFAPI.in response to internal ParsedNavRecord format
   */
  private convertMfapiToInternal(mfapiResponse: MfapiResponse): ParsedNavRecord[] {
    try {
      if (!mfapiResponse.data || mfapiResponse.data.length === 0) {
        return [];
      }

      const schemeCode = String(mfapiResponse.meta.scheme_code);
      const schemeName = mfapiResponse.meta.scheme_name;

      const parsedRecords: ParsedNavRecord[] = [];

      for (const entry of mfapiResponse.data) {
        try {
          const navDate = this.parseMfapiDate(entry.date);
          const navValue = parseFloat(entry.nav);

          if (!navDate || isNaN(navValue) || navValue <= 0) {
            continue;
          }

          const record: ParsedNavRecord = {
            scheme_code: schemeCode,
            scheme_name: schemeName,
            nav_value: navValue,
            nav_date: navDate,
            repurchase_price: undefined,
            sale_price: undefined,
            isin_div_payout_growth: undefined,
            isin_div_reinvestment: undefined
          };

          parsedRecords.push(record);
        } catch (entryError: any) {
          SimpleLogger.error('AmfiDataSource', 'Failed to parse MFAPI entry', 'convertMfapiToInternal', {
            entry, error: entryError.message
          });
        }
      }

      return parsedRecords;
    } catch (error: any) {
      SimpleLogger.error('AmfiDataSource', 'Failed to convert MFAPI response', 'convertMfapiToInternal', {
        error: error.message
      }, undefined, undefined, error.stack);
      return [];
    }
  }

  /**
   * NEW: Parse MFAPI date format (DD-MM-YYYY) to Date object
   */
  private parseMfapiDate(dateStr: string): Date | null {
    try {
      if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '') {
        return null;
      }

      const trimmed = dateStr.trim();
      const parts = trimmed.split('-');

      if (parts.length !== 3) {
        return null;
      }

      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return null;
      }

      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900) {
        return null;
      }

      // Use UTC to avoid timezone mismatches with date filtering and PostgreSQL storage
      const date = new Date(Date.UTC(year, month - 1, day));

      if (date.getUTCFullYear() !== year ||
          date.getUTCMonth() !== (month - 1) ||
          date.getUTCDate() !== day) {
        return null;
      }

      return date;
    } catch (error: any) {
      SimpleLogger.error('AmfiDataSource', 'Date parsing failed', 'parseMfapiDate', {
        dateStr, error: error.message
      });
      return null;
    }
  }

  /**
   * Download NAV data for specific scheme (daily) - UNCHANGED
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

  private async executeDailyDownload(requestId: string, options: AmfiDownloadOptions): Promise<AmfiApiResponse> {
    const startTime = Date.now();

    try {
      SimpleLogger.info('AmfiDataSource', 'Starting daily NAV download', 'executeDailyDownload', { requestId });

      const body = await this.makeAmfiRequest(this.DAILY_NAV_URL, options);
      const parsedData = this.parseDailyNavData(body);

      if (options.validateData !== false) {
        this.validateNavData(parsedData);
      }

      const processingTime = Date.now() - startTime;

      SimpleLogger.info('AmfiDataSource', 'Daily NAV download completed successfully', 'executeDailyDownload', {
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

  private async makeAmfiRequest(url: string, options: AmfiDownloadOptions): Promise<string> {
    const retryAttempts = options.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS;
    const retryDelay = options.retryDelay || this.DEFAULT_RETRY_DELAY;
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const rateLimitDelay = options.rateLimitDelay || this.DEFAULT_RATE_LIMIT_DELAY;

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

        SimpleLogger.info('AmfiDataSource', 'AMFI API request successful', 'makeAmfiRequest', {
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

        if (attempt < retryAttempts) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          SimpleLogger.info('AmfiDataSource', `Retrying AMFI API request in ${delay}ms`, 'makeAmfiRequest', { url, attempt, delay });
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  // ==================== DATA PARSING METHODS ====================

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
          
          for (let j = 0; j < 6; j++) {
            record[headers[j]] = funds[i][j];
          }

          const parsedRecord: ParsedNavRecord = {
            scheme_code: record['Scheme Code']?.trim() || '',
            scheme_name: record['Scheme Name']?.trim() || '',
            nav_value: this.parseFloatSafe(record['Net Asset Value']),
            nav_date: this.parseNavDate(record['Date']),
            isin_div_payout_growth: record['ISIN Div Payout/ ISIN Growth']?.trim(),
            isin_div_reinvestment: record['ISIN Div Reinvestment']?.trim()
          };

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

  // ==================== UTILITY METHODS ====================

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
    if (invalidPercentage > 10) {
      throw new Error(`Data quality issue: ${invalidPercentage.toFixed(1)}% invalid records`);
    }

    SimpleLogger.info('AmfiDataSource', 'NAV data validation completed', 'validateNavData', {
      totalRecords: data.length, invalidRecords, invalidPercentage: invalidPercentage.toFixed(1)
    });
  }

  private parseFloatSafe(value: string): number {
    if (!value || value.trim() === '' || value.trim() === '-' || value.trim() === 'N.A.') {
      return 0;
    }
    
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }

  private parseNavDate(dateStr: string): Date | null {
    try {
      if (!dateStr || dateStr.trim() === '') {
        return null;
      }

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

      // Use UTC to avoid timezone mismatches with date filtering and PostgreSQL storage
      const date = new Date(Date.UTC(year, month, day));

      if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
        return null;
      }

      return date;
    } catch (error) {
      SimpleLogger.error('AmfiDataSource', 'Failed to parse NAV date', 'parseNavDate', { dateStr });
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public clearCache(): void {
    this.requestCache.clear();
    SimpleLogger.info('AmfiDataSource', 'Request cache cleared', 'clearCache');
  }

  public getCacheStats(): { activeRequests: number; cacheKeys: string[] } {
    return {
      activeRequests: this.requestCache.size,
      cacheKeys: Array.from(this.requestCache.keys())
    };
  }
}