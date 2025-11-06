// backend/src/services/bookmarkImport.service.ts
// Service for importing scheme bookmarks and auto-generating aliases

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import { SimpleLogger } from './simpleLogger.service';

export interface BookmarkImportRow {
  scheme_code: string;
  isin: string;
  scheme_name: string;
}

export interface BookmarkImportResult {
  success: boolean;
  totalRows: number;
  bookmarksCreated: number;
  bookmarksUpdated: number;
  aliasesCreated: number;
  errors: Array<{ row: number; scheme_code: string; error: string }>;
  duration: number;
}

export interface BookmarkStats {
  total_bookmarks: number;
  unique_amcs: number;
  total_aliases: number;
  oldest_bookmark: Date | null;
  newest_bookmark: Date | null;
}

export class BookmarkImportService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Import bookmarks from CSV and auto-generate aliases
   * This is the main entry point for bookmark import
   */
  async importBookmarks(
    tenantId: number,
    isLive: boolean,
    userId: number,
    rows: BookmarkImportRow[]
  ): Promise<BookmarkImportResult> {
    const startTime = Date.now();
    const errors: Array<{ row: number; scheme_code: string; error: string }> = [];
    let bookmarksCreated = 0;
    let bookmarksUpdated = 0;
    let aliasesCreated = 0;

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      console.log(`[BookmarkImport] Starting import for tenant ${tenantId}, ${rows.length} rows`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 1;

        try {
          // Validate row data
          if (!row.scheme_code || !row.scheme_name) {
            errors.push({
              row: rowNumber,
              scheme_code: row.scheme_code || 'MISSING',
              error: 'Missing required fields: scheme_code or scheme_name'
            });
            continue;
          }

          // Clean and normalize data
          const cleanSchemeCode = row.scheme_code.trim();
          const cleanSchemeName = row.scheme_name.trim();
          const cleanIsin = row.isin?.trim() || '';

          // Step 1: Validate scheme exists in master
          const schemeQuery = `
            SELECT id, scheme_code, scheme_name, scheme_nav_name, amc_name
            FROM t_scheme_details
            WHERE scheme_code = $1 AND is_active = true
            LIMIT 1
          `;
          const schemeResult = await client.query(schemeQuery, [cleanSchemeCode]);

          if (schemeResult.rows.length === 0) {
            errors.push({
              row: rowNumber,
              scheme_code: cleanSchemeCode,
              error: `Scheme code not found in master data (t_scheme_details)`
            });
            continue;
          }

          const masterScheme = schemeResult.rows[0];

          // Step 2: Insert or Update bookmark
          const bookmarkQuery = `
            INSERT INTO t_scheme_bookmarks (
              tenant_id, user_id, scheme_id, scheme_code, 
              scheme_name, amc_name, is_live, is_active, daily_download_enabled
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, false)
            ON CONFLICT (tenant_id, scheme_id, is_live)
            DO UPDATE SET
              user_id = EXCLUDED.user_id,
              scheme_code = EXCLUDED.scheme_code,
              scheme_name = EXCLUDED.scheme_name,
              amc_name = EXCLUDED.amc_name,
              is_active = true,
              updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) AS inserted
          `;

          const bookmarkResult = await client.query(bookmarkQuery, [
            tenantId,
            userId,
            masterScheme.id,
            cleanSchemeCode,
            cleanSchemeName,  // Customer's name from CSV (their software's name)
            masterScheme.amc_name,
            isLive
          ]);

          // Track if this was insert or update
          if (bookmarkResult.rows[0].inserted) {
            bookmarksCreated++;
          } else {
            bookmarksUpdated++;
          }

          // Step 3: Auto-generate aliases for this bookmark
          // IMPORTANT: Alias failures should NOT block bookmark creation
          // Generate exactly 2 aliases: customer name + master nav name
          const aliasesToCreate = this.generateAliasVariations(
            cleanSchemeName,              // Customer's name from CSV
            masterScheme.scheme_nav_name  // Master scheme_nav_name
          );

          // Create aliases (global, shared across all tenants)
          for (const alias of aliasesToCreate) {
            try {
              // NOTE: Aliases are universal/global across all tenants
              // ON CONFLICT DO NOTHING handles duplicates from other tenants
              const aliasQuery = `
                INSERT INTO t_scheme_aliases (scheme_id, scheme_code, alias_name, source, created_by)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (alias_name_normalized) DO NOTHING
                RETURNING id
              `;

              const aliasResult = await client.query(aliasQuery, [
                masterScheme.id,
                cleanSchemeCode,
                alias.aliasName,
                alias.source,  // 'csv_upload' or 'master_nav'
                userId
              ]);

              if (aliasResult.rows.length > 0) {
                aliasesCreated++;
              } else {
                // Alias already exists (from this or another tenant) - this is OK
                console.log(`[BookmarkImport] Alias "${alias.aliasName}" already exists (universal) - skipping`);
              }

            } catch (aliasError: any) {
              // Log but don't fail bookmark import if alias creation fails
              console.warn(`[BookmarkImport] Alias creation failed for "${alias.aliasName}":`, aliasError.message);
            }
          }

        } catch (error: any) {
          errors.push({
            row: rowNumber,
            scheme_code: row.scheme_code || 'UNKNOWN',
            error: error.message
          });
          console.error(`[BookmarkImport] Error processing row ${rowNumber}:`, error);
        }
      }

      await client.query('COMMIT');

      const duration = Date.now() - startTime;

      console.log(`[BookmarkImport] Complete: ${bookmarksCreated} created, ${bookmarksUpdated} updated, ${aliasesCreated} aliases, ${errors.length} errors, ${duration}ms`);

      SimpleLogger.info('BookmarkImportService', 'Bookmark import completed', 'importBookmarks', {
        tenantId,
        totalRows: rows.length,
        bookmarksCreated,
        bookmarksUpdated,
        aliasesCreated,
        errorCount: errors.length,
        duration
      }, userId, tenantId);

      return {
        success: errors.length === 0,
        totalRows: rows.length,
        bookmarksCreated,
        bookmarksUpdated,
        aliasesCreated,
        errors,
        duration
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[BookmarkImport] Fatal error during import:', error);
      
      SimpleLogger.error('BookmarkImportService', 'Bookmark import failed', 'importBookmarks', {
        tenantId, rowCount: rows.length, error: error.message
      }, userId, tenantId, error.stack);

      throw new Error(`Bookmark import failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Generate alias variations for a scheme
   * Creates exactly 2 aliases per scheme:
   * 1. Customer's fund name from CSV (source: 'csv_upload')
   * 2. Master scheme_nav_name (source: 'master_nav')
   */
  private generateAliasVariations(
    customerFundName: string,
    masterNavName: string | null
  ): Array<{ aliasName: string; source: string }> {
    const aliases: Array<{ aliasName: string; source: string }> = [];

    // Alias 1: Customer's custom fund name from CSV
    if (customerFundName && customerFundName.trim()) {
      aliases.push({
        aliasName: customerFundName.trim(),
        source: 'csv_upload'
      });
    }

    // Alias 2: Master scheme_nav_name (if different from customer name)
    if (masterNavName && masterNavName.trim()) {
      const normalizedCustomer = customerFundName.trim().toUpperCase().replace(/\s+/g, ' ');
      const normalizedMaster = masterNavName.trim().toUpperCase().replace(/\s+/g, ' ');
      
      // Only add if different (avoid duplicate)
      if (normalizedCustomer !== normalizedMaster) {
        aliases.push({
          aliasName: masterNavName.trim(),
          source: 'master_nav'
        });
      }
    }

    return aliases;
  }

  /**
   * Check if tenant has bookmarks (prerequisite for transaction import)
   */
  async hasBookmarks(tenantId: number, isLive: boolean): Promise<boolean> {
    try {
      const query = `
        SELECT EXISTS (
          SELECT 1 FROM t_scheme_bookmarks
          WHERE tenant_id = $1 AND is_live = $2 AND is_active = true
        ) as has_bookmarks
      `;

      const result = await this.db.query(query, [tenantId, isLive]);
      return result.rows[0].has_bookmarks;

    } catch (error: any) {
      console.error('[BookmarkImport] Error checking bookmarks:', error);
      SimpleLogger.error('BookmarkImportService', 'Failed to check bookmarks', 'hasBookmarks', {
        tenantId, isLive, error: error.message
      }, undefined, tenantId, error.stack);
      return false;
    }
  }

  /**
   * Get bookmark statistics for a tenant
   */
  async getBookmarkStats(tenantId: number, isLive: boolean): Promise<BookmarkStats> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_bookmarks,
          COUNT(DISTINCT amc_name) as unique_amcs,
          MIN(created_at) as oldest_bookmark,
          MAX(created_at) as newest_bookmark,
          (
            SELECT COUNT(*) 
            FROM t_scheme_aliases sa
            JOIN t_scheme_bookmarks b ON sa.scheme_id = b.scheme_id
            WHERE b.tenant_id = $1 
              AND b.is_live = $2 
              AND b.is_active = true
              AND sa.is_active = true
          ) as total_aliases
        FROM t_scheme_bookmarks
        WHERE tenant_id = $1 AND is_live = $2 AND is_active = true
      `;

      const result = await this.db.query(query, [tenantId, isLive]);
      return result.rows[0];

    } catch (error: any) {
      console.error('[BookmarkImport] Error fetching stats:', error);
      SimpleLogger.error('BookmarkImportService', 'Failed to fetch bookmark stats', 'getBookmarkStats', {
        tenantId, isLive, error: error.message
      }, undefined, tenantId, error.stack);
      
      throw error;
    }
  }

  /**
   * Get list of bookmarks with details
   */
  async getBookmarks(
    tenantId: number,
    isLive: boolean,
    options?: { limit?: number; offset?: number }
  ): Promise<any[]> {
    try {
      const { limit = 100, offset = 0 } = options || {};

      const query = `
        SELECT 
          b.id,
          b.scheme_id,
          b.scheme_code,
          b.scheme_name,
          b.amc_name,
          b.daily_download_enabled,
          b.created_at,
          b.updated_at,
          (
            SELECT COUNT(*) 
            FROM t_scheme_aliases sa
            WHERE sa.scheme_id = b.scheme_id AND sa.is_active = true
          ) as alias_count
        FROM t_scheme_bookmarks b
        WHERE b.tenant_id = $1 
          AND b.is_live = $2 
          AND b.is_active = true
        ORDER BY b.amc_name, b.scheme_name
        LIMIT $3 OFFSET $4
      `;

      const result = await this.db.query(query, [tenantId, isLive, limit, offset]);
      return result.rows;

    } catch (error: any) {
      console.error('[BookmarkImport] Error fetching bookmarks:', error);
      SimpleLogger.error('BookmarkImportService', 'Failed to fetch bookmarks', 'getBookmarks', {
        tenantId, isLive, error: error.message
      }, undefined, tenantId, error.stack);
      
      throw error;
    }
  }

  /**
   * Delete a bookmark (soft delete)
   */
  async deleteBookmark(
    tenantId: number,
    isLive: boolean,
    bookmarkId: number
  ): Promise<void> {
    try {
      const query = `
        UPDATE t_scheme_bookmarks
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      `;

      await this.db.query(query, [bookmarkId, tenantId, isLive]);

      SimpleLogger.info('BookmarkImportService', 'Bookmark deleted', 'deleteBookmark', {
        bookmarkId, tenantId, isLive
      }, undefined, tenantId);

    } catch (error: any) {
      console.error('[BookmarkImport] Error deleting bookmark:', error);
      SimpleLogger.error('BookmarkImportService', 'Failed to delete bookmark', 'deleteBookmark', {
        bookmarkId, tenantId, isLive, error: error.message
      }, undefined, tenantId, error.stack);
      
      throw error;
    }
  }
}