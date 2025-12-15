// backend/src/jobs/navDownload.executor.ts
// NAV Download Job Executor - Daily 9 PM, Failover 10 PM

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  JobType,
  JobExecutor,
  JobExecutionContext,
  JobExecutionResult,
  NavDownloadExecutionData
} from '../types/jobs.types';
import { AmfiDataSourceService } from '../services/amfiDataSource.service';
import { NavService } from '../services/nav.service';
import { SimpleLogger } from '../services/simpleLogger.service';

/**
 * NAV Download Job Executor
 *
 * Downloads NAV data for all bookmarked schemes across all tenants.
 * This is a GLOBAL job - runs once and updates data for all tenants.
 *
 * Schedule: Daily 9 PM IST
 * Failover: 10 PM IST (if primary fails)
 */
export class NavDownloadExecutor implements JobExecutor {
  readonly jobType = JobType.NAV_DOWNLOAD;
  private db: Pool;
  private amfiService: AmfiDataSourceService;
  private navService: NavService;

  constructor() {
    this.db = pool;
    this.amfiService = new AmfiDataSourceService();
    this.navService = new NavService();
  }

  /**
   * Execute the NAV download job
   */
  async execute(context: JobExecutionContext): Promise<JobExecutionResult> {
    const startTime = Date.now();
    const executionData: NavDownloadExecutionData = {
      download_date: new Date(),
      schemes_processed: 0,
      schemes_updated: 0,
      schemes_failed: 0,
      errors: []
    };

    try {
      SimpleLogger.info('NavDownloadJob', 'Starting NAV download', 'execute', {
        trigger_source: context.trigger_source,
        tenant_id: context.tenant_id,
        is_live: context.is_live
      });

      // Step 1: Get all bookmarked scheme codes across all tenants
      const bookmarkedSchemes = await this.getAllBookmarkedSchemes();

      if (bookmarkedSchemes.length === 0) {
        SimpleLogger.warn('NavDownloadJob', 'No bookmarked schemes found', 'execute');
        return {
          success: true,
          execution_data: {
            ...executionData,
            message: 'No bookmarked schemes to process'
          },
          execution_duration_ms: Date.now() - startTime
        };
      }

      executionData.schemes_processed = bookmarkedSchemes.length;
      SimpleLogger.info('NavDownloadJob', `Found ${bookmarkedSchemes.length} bookmarked schemes`, 'execute');

      // Step 2: Download NAV data from AMFI
      const requestId = `nav_download_${Date.now()}`;
      const amfiResponse = await this.amfiService.downloadDailyNavData({ requestId });

      if (!amfiResponse.success || !amfiResponse.data) {
        throw new Error(`AMFI download failed: ${amfiResponse.error || 'Unknown error'}`);
      }

      const navData = amfiResponse.data;
      SimpleLogger.info('NavDownloadJob', `Downloaded ${navData.length} NAV records from AMFI`, 'execute');

      // Step 3: Filter for bookmarked schemes only
      const schemeCodeSet = new Set(bookmarkedSchemes.map(s => s.scheme_code));
      const filteredNavData = navData.filter(record => schemeCodeSet.has(record.scheme_code));

      SimpleLogger.info('NavDownloadJob', `Filtered to ${filteredNavData.length} records for bookmarked schemes`, 'execute');

      // Step 4: Update NAV data in database (global update)
      // Since NAV data is global, we update t_nav_data which is shared
      const updateResult = await this.updateGlobalNavData(filteredNavData);

      executionData.schemes_updated = updateResult.updated;
      executionData.schemes_failed = updateResult.failed;

      if (updateResult.errors) {
        executionData.errors = updateResult.errors;
      }

      // Step 5: Update last NAV download timestamp for all bookmarked schemes
      await this.updateBookmarkNavStatus(bookmarkedSchemes.map(s => s.scheme_code));

      SimpleLogger.info('NavDownloadJob', 'NAV download completed', 'execute', {
        schemes_processed: executionData.schemes_processed,
        schemes_updated: executionData.schemes_updated,
        schemes_failed: executionData.schemes_failed,
        duration_ms: Date.now() - startTime
      });

      return {
        success: true,
        execution_data: executionData,
        execution_duration_ms: Date.now() - startTime
      };

    } catch (error: any) {
      SimpleLogger.error('NavDownloadJob', 'NAV download failed', 'execute', {
        error: error.message
      }, undefined, undefined, error.stack);

      return {
        success: false,
        execution_data: executionData,
        execution_duration_ms: Date.now() - startTime,
        error: error.message,
        error_details: { stack: error.stack }
      };
    }
  }

  /**
   * Get all bookmarked schemes across all tenants
   */
  private async getAllBookmarkedSchemes(): Promise<Array<{ scheme_code: string; scheme_name: string }>> {
    const query = `
      SELECT DISTINCT s.scheme_code, s.scheme_name
      FROM t_scheme_bookmarks sb
      JOIN t_scheme_masters s ON sb.scheme_id = s.id
      WHERE sb.is_active = true
      ORDER BY s.scheme_code
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Update global NAV data
   * NAV data is stored globally and shared across all tenants
   */
  private async updateGlobalNavData(navRecords: any[]): Promise<{
    updated: number;
    failed: number;
    errors?: Array<{ scheme_code: string; error_message: string }>;
  }> {
    const errors: Array<{ scheme_code: string; error_message: string }> = [];
    let updated = 0;
    let failed = 0;

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // First, get all scheme_ids for the scheme_codes we need
      const schemeCodes = [...new Set(navRecords.map(r => r.scheme_code))];
      const schemeQuery = `
        SELECT id, scheme_code FROM t_scheme_details
        WHERE scheme_code = ANY($1) AND is_active = true
      `;
      const schemeResult = await client.query(schemeQuery, [schemeCodes]);
      const schemeMap = new Map(schemeResult.rows.map(r => [r.scheme_code, r.id]));

      // Process records in batches
      const batchSize = 500;
      for (let i = 0; i < navRecords.length; i += batchSize) {
        const batch = navRecords.slice(i, i + batchSize);

        for (const record of batch) {
          try {
            const schemeId = schemeMap.get(record.scheme_code);
            if (!schemeId) {
              failed++;
              continue; // Skip records without valid scheme_id
            }

            const upsertQuery = `
              INSERT INTO t_nav_data (
                scheme_id, scheme_code, nav_date, nav_value,
                repurchase_price, sale_price, is_live, data_source
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (scheme_id, nav_date, is_live)
              DO UPDATE SET
                nav_value = EXCLUDED.nav_value,
                repurchase_price = EXCLUDED.repurchase_price,
                sale_price = EXCLUDED.sale_price,
                updated_at = CURRENT_TIMESTAMP
            `;

            await client.query(upsertQuery, [
              schemeId,
              record.scheme_code,
              record.nav_date,
              record.nav_value,
              record.repurchase_price || null,
              record.sale_price || null,
              true, // is_live
              'daily' // data_source
            ]);
            updated++;
          } catch (recordError: any) {
            failed++;
            errors.push({
              scheme_code: record.scheme_code,
              error_message: recordError.message
            });
          }
        }
      }

      await client.query('COMMIT');
    } catch (error: any) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return { updated, failed, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Update bookmark status with latest NAV download info
   */
  private async updateBookmarkNavStatus(schemeCodes: string[]): Promise<void> {
    if (schemeCodes.length === 0) return;

    // Get latest NAV dates for schemes
    const query = `
      UPDATE t_scheme_bookmarks sb
      SET
        latest_nav_date = (
          SELECT MAX(nav_date)
          FROM t_nav_data nd
          JOIN t_scheme_masters ms ON nd.scheme_code = ms.scheme_code
          WHERE ms.id = sb.scheme_id
        ),
        updated_at = CURRENT_TIMESTAMP
      WHERE sb.scheme_id IN (
        SELECT id FROM t_scheme_masters WHERE scheme_code = ANY($1)
      )
    `;

    await this.db.query(query, [schemeCodes]);
  }

  /**
   * Validate job configuration
   */
  validateConfig(config: any): boolean {
    // NAV download doesn't require specific configuration
    return true;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): any {
    return {
      download_type: 'daily',
      include_all_tenants: true
    };
  }
}

// Export singleton instance
export const navDownloadExecutor = new NavDownloadExecutor();
