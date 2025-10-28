// backend/src/services/schemeAlias.service.ts

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import {
  SchemeAlias,
  SchemeAliasWithScheme,
  SchemeLookupResult,
  CreateSchemeAliasRequest,
  UpdateSchemeAliasRequest,
  BulkCreateAliasesRequest,
  SchemeAliasResponse,
  SchemeAliasListResponse,
  SchemeAliasDeleteResponse,
  BulkCreateAliasesResponse,
  SchemeLookupResponse,
  SchemeAliasFilters,
  AliasStatistics
} from '../types/scheme.types';

export class SchemeAliasService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * PRIMARY FUNCTION: Lookup scheme by alias name
   * Used during transaction import to find scheme_id from scheme_name in CSV
   */
  async lookupSchemeByAlias(aliasName: string): Promise<SchemeLookupResponse> {
    try {
      console.log(`[SchemeAliasService] Looking up scheme for alias: "${aliasName}"`);

      const query = `SELECT * FROM lookup_scheme_by_alias($1)`;
      const result = await this.db.query(query, [aliasName]);

      if (result.rows.length > 0) {
        const match = result.rows[0];
        console.log(`[SchemeAliasService] ✓ Found: ${match.scheme_code} - ${match.scheme_name} (via alias: "${match.matched_alias}")`);
        return {
          success: true,
          data: match
        };
      }

      console.warn(`[SchemeAliasService] ✗ No scheme found for alias: "${aliasName}"`);
      return {
        success: false,
        error: 'No matching scheme found'
      };
    } catch (error: any) {
      console.error('[SchemeAliasService] Error in lookupSchemeByAlias:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all aliases with optional filters
   */
  async getAliases(filters: SchemeAliasFilters = {}): Promise<SchemeAliasListResponse> {
    try {
      const page = filters.page || 1;
      const pageSize = filters.page_size || 100;
      const offset = (page - 1) * pageSize;

      const conditions: string[] = ['1=1']; // Always true base condition
      const params: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (filters.scheme_id !== undefined) {
        conditions.push(`sa.scheme_id = $${paramIndex++}`);
        params.push(filters.scheme_id);
      }

      if (filters.scheme_code) {
        conditions.push(`sa.scheme_code = $${paramIndex++}`);
        params.push(filters.scheme_code);
      }

      if (filters.search) {
        conditions.push(`(sa.alias_name ILIKE $${paramIndex} OR sd.scheme_name ILIKE $${paramIndex} OR sd.scheme_code ILIKE $${paramIndex})`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters.source) {
        conditions.push(`sa.source = $${paramIndex++}`);
        params.push(filters.source);
      }

      if (filters.is_active !== undefined) {
        conditions.push(`sa.is_active = $${paramIndex++}`);
        params.push(filters.is_active);
      }

      // Count total matching records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM t_scheme_aliases sa
        JOIN t_scheme_details sd ON sa.scheme_id = sd.id
        WHERE ${conditions.join(' AND ')}
      `;
      const countResult = await this.db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated data
      params.push(pageSize, offset);
      const dataQuery = `
        SELECT
          sa.*,
          sd.scheme_name,
          sd.scheme_nav_name,
          sd.amc_name
        FROM t_scheme_aliases sa
        JOIN t_scheme_details sd ON sa.scheme_id = sd.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY sd.scheme_name ASC, sa.alias_name ASC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const dataResult = await this.db.query(dataQuery, params);

      return {
        success: true,
        data: dataResult.rows,
        total,
        page,
        page_size: pageSize
      };
    } catch (error: any) {
      console.error('[SchemeAliasService] Error in getAliases:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get single alias by ID
   */
  async getAliasById(aliasId: number): Promise<SchemeAliasResponse> {
    try {
      const query = `
        SELECT
          sa.*,
          sd.scheme_name,
          sd.scheme_nav_name,
          sd.amc_name
        FROM t_scheme_aliases sa
        JOIN t_scheme_details sd ON sa.scheme_id = sd.id
        WHERE sa.id = $1
      `;

      const result = await this.db.query(query, [aliasId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Alias not found'
        };
      }

      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error: any) {
      console.error('[SchemeAliasService] Error in getAliasById:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create new alias
   */
  async createAlias(
    userId: number,
    request: CreateSchemeAliasRequest
  ): Promise<SchemeAliasResponse> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Determine scheme_id
      let schemeId = request.scheme_id;

      if (!schemeId && request.scheme_code) {
        // Look up by scheme_code
        const schemeQuery = `
          SELECT id, scheme_code, scheme_name
          FROM t_scheme_details
          WHERE scheme_code = $1 AND is_active = true
          LIMIT 1
        `;
        const schemeResult = await client.query(schemeQuery, [request.scheme_code]);

        if (schemeResult.rows.length === 0) {
          throw new Error(`Scheme not found with code: ${request.scheme_code}`);
        }

        schemeId = schemeResult.rows[0].id;
      }

      if (!schemeId) {
        throw new Error('Either scheme_id or scheme_code is required');
      }

      // Get scheme details for denormalization
      const schemeQuery = `
        SELECT id, scheme_code, scheme_name
        FROM t_scheme_details
        WHERE id = $1 AND is_active = true
      `;
      const schemeResult = await client.query(schemeQuery, [schemeId]);

      if (schemeResult.rows.length === 0) {
        throw new Error('Scheme not found or inactive');
      }

      const scheme = schemeResult.rows[0];

      // Insert alias
      const insertQuery = `
        INSERT INTO t_scheme_aliases (
          scheme_id, scheme_code, alias_name, source, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const insertResult = await client.query(insertQuery, [
        schemeId,
        scheme.scheme_code,
        request.alias_name.trim(),
        request.source || 'manual',
        true,
        userId
      ]);

      await client.query('COMMIT');

      console.log(`[SchemeAliasService] ✓ Created alias "${request.alias_name}" for scheme ${scheme.scheme_code} - ${scheme.scheme_name}`);

      // Return full record with scheme details
      const aliasResponse = await this.getAliasById(insertResult.rows[0].id);
      return aliasResponse;

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[SchemeAliasService] Error in createAlias:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return {
          success: false,
          error: 'This alias already exists and maps to a different scheme'
        };
      }

      return {
        success: false,
        error: error.message
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update alias
   */
  async updateAlias(
    aliasId: number,
    request: UpdateSchemeAliasRequest
  ): Promise<SchemeAliasResponse> {
    try {
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (request.alias_name !== undefined) {
        updates.push(`alias_name = $${paramIndex++}`);
        params.push(request.alias_name.trim());
      }

      if (request.is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(request.is_active);
      }

      if (updates.length === 0) {
        return {
          success: false,
          error: 'No updates provided'
        };
      }

      params.push(aliasId);

      const query = `
        UPDATE t_scheme_aliases
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++}
        RETURNING *
      `;

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Alias not found'
        };
      }

      console.log(`[SchemeAliasService] ✓ Updated alias ID ${aliasId}`);

      return await this.getAliasById(aliasId);
    } catch (error: any) {
      console.error('[SchemeAliasService] Error in updateAlias:', error);

      if (error.code === '23505') {
        return {
          success: false,
          error: 'This alias already exists and maps to a different scheme'
        };
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete alias (soft delete by setting is_active = false)
   */
  async deleteAlias(aliasId: number): Promise<SchemeAliasDeleteResponse> {
    try {
      const query = `
        UPDATE t_scheme_aliases
        SET is_active = false
        WHERE id = $1
        RETURNING id
      `;

      const result = await this.db.query(query, [aliasId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Alias not found'
        };
      }

      console.log(`[SchemeAliasService] ✓ Deleted (deactivated) alias ID ${aliasId}`);

      return {
        success: true,
        message: 'Alias deleted successfully'
      };
    } catch (error: any) {
      console.error('[SchemeAliasService] Error in deleteAlias:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Bulk create multiple aliases for one scheme
   */
  async bulkCreateAliases(
    userId: number,
    request: BulkCreateAliasesRequest
  ): Promise<BulkCreateAliasesResponse> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get scheme by code
      const schemeQuery = `
        SELECT id, scheme_code, scheme_name
        FROM t_scheme_details
        WHERE scheme_code = $1 AND is_active = true
      `;

      const schemeResult = await client.query(schemeQuery, [request.scheme_code]);

      if (schemeResult.rows.length === 0) {
        throw new Error(`Scheme with code ${request.scheme_code} not found`);
      }

      const scheme = schemeResult.rows[0];
      let created = 0;
      let skipped = 0;
      const errors: Array<{ alias: string; error: string }> = [];

      // Insert each alias
      for (const aliasName of request.aliases) {
        if (!aliasName || aliasName.trim() === '') {
          skipped++;
          continue;
        }

        try {
          const insertQuery = `
            INSERT INTO t_scheme_aliases (
              scheme_id, scheme_code, alias_name, source, is_active, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (alias_name_normalized) DO NOTHING
            RETURNING id
          `;

          const insertResult = await client.query(insertQuery, [
            scheme.id,
            scheme.scheme_code,
            aliasName.trim(),
            request.source || 'manual',
            true,
            userId
          ]);

          if (insertResult.rows.length > 0) {
            created++;
          } else {
            skipped++;
          }
        } catch (error: any) {
          console.error(`[SchemeAliasService] Error inserting alias "${aliasName}":`, error);
          errors.push({
            alias: aliasName,
            error: error.message
          });
        }
      }

      await client.query('COMMIT');

      console.log(`[SchemeAliasService] ✓ Bulk import for ${scheme.scheme_code}: created ${created}, skipped ${skipped}, errors ${errors.length}`);

      return {
        success: true,
        created,
        skipped,
        errors
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[SchemeAliasService] Error in bulkCreateAliases:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get alias statistics (for dashboard)
   */
  async getStatistics(): Promise<AliasStatistics> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_aliases,
          COUNT(*) FILTER (WHERE is_active = true) as active_aliases,
          COUNT(DISTINCT scheme_id) as schemes_with_aliases,
          ROUND(AVG(alias_count), 2) as avg_aliases_per_scheme,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_additions
        FROM t_scheme_aliases sa
        LEFT JOIN (
          SELECT scheme_id, COUNT(*) as alias_count
          FROM t_scheme_aliases
          WHERE is_active = true
          GROUP BY scheme_id
        ) counts ON sa.scheme_id = counts.scheme_id
      `;

      const result = await this.db.query(query);
      const row = result.rows[0];

      return {
        total_aliases: parseInt(row.total_aliases),
        active_aliases: parseInt(row.active_aliases),
        schemes_with_aliases: parseInt(row.schemes_with_aliases),
        avg_aliases_per_scheme: parseFloat(row.avg_aliases_per_scheme) || 0,
        recent_additions: parseInt(row.recent_additions)
      };
    } catch (error: any) {
      console.error('[SchemeAliasService] Error in getStatistics:', error);
      throw error;
    }
  }

  /**
   * Backfill: Auto-create aliases for schemes that don't have any
   * Useful for newly added schemes
   */
  async backfillMissingAliases(userId: number): Promise<{ created: number }> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Insert scheme_name as alias for schemes without aliases
      const insertNameQuery = `
        INSERT INTO t_scheme_aliases (
          scheme_id, scheme_code, alias_name, source, is_active, created_by
        )
        SELECT
          sd.id,
          sd.scheme_code,
          sd.scheme_name,
          'auto',
          true,
          $1
        FROM t_scheme_details sd
        WHERE sd.is_active = true
          AND sd.scheme_name IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM t_scheme_aliases sa
            WHERE sa.scheme_id = sd.id
              AND sa.alias_name_normalized = REGEXP_REPLACE(TRIM(UPPER(sd.scheme_name)), '\\s+', ' ', 'g')
          )
        ON CONFLICT (alias_name_normalized) DO NOTHING
        RETURNING id
      `;

      const nameResult = await client.query(insertNameQuery, [userId]);
      const createdFromName = nameResult.rows.length;

      // Insert scheme_nav_name as alias (if different)
      const insertNavNameQuery = `
        INSERT INTO t_scheme_aliases (
          scheme_id, scheme_code, alias_name, source, is_active, created_by
        )
        SELECT
          sd.id,
          sd.scheme_code,
          sd.scheme_nav_name,
          'auto',
          true,
          $1
        FROM t_scheme_details sd
        WHERE sd.is_active = true
          AND sd.scheme_nav_name IS NOT NULL
          AND TRIM(sd.scheme_nav_name) != ''
          AND REGEXP_REPLACE(TRIM(UPPER(sd.scheme_nav_name)), '\\s+', ' ', 'g') !=
              REGEXP_REPLACE(TRIM(UPPER(sd.scheme_name)), '\\s+', ' ', 'g')
          AND NOT EXISTS (
            SELECT 1 FROM t_scheme_aliases sa
            WHERE sa.scheme_id = sd.id
              AND sa.alias_name_normalized = REGEXP_REPLACE(TRIM(UPPER(sd.scheme_nav_name)), '\\s+', ' ', 'g')
          )
        ON CONFLICT (alias_name_normalized) DO NOTHING
        RETURNING id
      `;

      const navNameResult = await client.query(insertNavNameQuery, [userId]);
      const createdFromNavName = navNameResult.rows.length;

      await client.query('COMMIT');

      const totalCreated = createdFromName + createdFromNavName;

      console.log(`[SchemeAliasService] ✓ Backfilled ${totalCreated} aliases (${createdFromName} from scheme_name, ${createdFromNavName} from scheme_nav_name)`);

      return {
        created: totalCreated
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[SchemeAliasService] Error in backfillMissingAliases:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
