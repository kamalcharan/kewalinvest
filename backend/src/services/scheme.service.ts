// backend/src/services/scheme.service.ts
import { Pool } from 'pg';
import { pool } from '../config/database';

export interface SchemeMaster {
  id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  master_type: 'scheme_type' | 'scheme_category';
  code: string;
  name: string;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface SchemeDetail {
  id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  amc_name: string;
  scheme_code: string;
  scheme_name: string;
  scheme_type_id?: number;
  scheme_category_id?: number;
  scheme_nav_name?: string;
  scheme_minimum_amount?: number;
  launch_date?: Date;
  closure_date?: Date;
  isin_div_payout?: string;
  isin_growth?: string;
  isin_div_reinvestment?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
}

export class SchemeService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get all scheme types
   */
  async getSchemeTypes(tenantId: number, isLive: boolean): Promise<SchemeMaster[]> {
    try {
      const query = `
        SELECT * FROM t_scheme_masters
        WHERE tenant_id = $1 
          AND is_live = $2 
          AND master_type = 'scheme_type'
          AND is_active = true
        ORDER BY display_order, name
      `;
      
      const result = await this.db.query(query, [tenantId, isLive]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching scheme types:', error);
      throw error;
    }
  }

  /**
   * Get all scheme categories
   */
  async getSchemeCategories(tenantId: number, isLive: boolean): Promise<SchemeMaster[]> {
    try {
      const query = `
        SELECT * FROM t_scheme_masters
        WHERE tenant_id = $1 
          AND is_live = $2 
          AND master_type = 'scheme_category'
          AND is_active = true
        ORDER BY display_order, name
      `;
      
      const result = await this.db.query(query, [tenantId, isLive]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching scheme categories:', error);
      throw error;
    }
  }

  /**
   * Get master data by name for matching during import
   */
  async getMasterByName(
    tenantId: number, 
    isLive: boolean, 
    masterType: string, 
    name: string
  ): Promise<SchemeMaster | null> {
    try {
      const query = `
        SELECT * FROM t_scheme_masters
        WHERE tenant_id = $1 
          AND is_live = $2 
          AND master_type = $3
          AND LOWER(TRIM(name)) = LOWER(TRIM($4))
          AND is_active = true
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, masterType, name]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching master by name:', error);
      throw error;
    }
  }

  /**
   * Get scheme by code
   */
  async getSchemeByCode(
    tenantId: number,
    isLive: boolean,
    schemeCode: string
  ): Promise<SchemeDetail | null> {
    try {
      const query = `
        SELECT * FROM t_scheme_details
        WHERE tenant_id = $1 
          AND is_live = $2 
          AND scheme_code = $3
          AND is_active = true
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, schemeCode]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching scheme by code:', error);
      throw error;
    }
  }

  /**
   * Get scheme by ID - ADDED METHOD TO FIX BOOKMARK ISSUE
   */
  async getSchemeById(
    tenantId: number,
    isLive: boolean,
    schemeId: number
  ): Promise<SchemeDetail | null> {
    try {
      const query = `
        SELECT * FROM t_scheme_details
        WHERE tenant_id = $1 
          AND is_live = $2 
          AND id = $3
          AND is_active = true
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, schemeId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching scheme by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new scheme
   */
  async createScheme(scheme: Partial<SchemeDetail>): Promise<SchemeDetail> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const query = `
        INSERT INTO t_scheme_details (
          tenant_id, is_live, amc_name, scheme_code, scheme_name,
          scheme_type_id, scheme_category_id, scheme_nav_name,
          scheme_minimum_amount, launch_date, closure_date,
          isin_div_payout, isin_growth, isin_div_reinvestment,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;
      
      const values = [
        scheme.tenant_id,
        scheme.is_live,
        scheme.amc_name,
        scheme.scheme_code,
        scheme.scheme_name,
        scheme.scheme_type_id || null,
        scheme.scheme_category_id || null,
        scheme.scheme_nav_name || null,
        scheme.scheme_minimum_amount || null,
        scheme.launch_date || null,
        scheme.closure_date || null,
        scheme.isin_div_payout || null,
        scheme.isin_growth || null,
        scheme.isin_div_reinvestment || null,
        scheme.created_by || null
      ];
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating scheme:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update existing scheme
   */
  async updateScheme(
    tenantId: number,
    isLive: boolean,
    schemeCode: string,
    updates: Partial<SchemeDetail>
  ): Promise<SchemeDetail | null> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build dynamic update query
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;
      
      // Add fields to update
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'tenant_id' && key !== 'is_live' && key !== 'scheme_code') {
          updateFields.push(`${key} = $${paramIndex}`);
          queryParams.push((updates as any)[key]);
          paramIndex++;
        }
      });
      
      if (updateFields.length === 0) {
        return null;
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      
      const query = `
        UPDATE t_scheme_details 
        SET ${updateFields.join(', ')}
        WHERE tenant_id = $${paramIndex} 
          AND is_live = $${paramIndex + 1} 
          AND scheme_code = $${paramIndex + 2}
        RETURNING *
      `;
      
      queryParams.push(tenantId, isLive, schemeCode);
      
      const result = await client.query(query, queryParams);
      await client.query('COMMIT');
      
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating scheme:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if scheme exists (for duplicate detection)
   */
  async checkSchemeDuplicate(
    tenantId: number,
    isLive: boolean,
    schemeCode: string
  ): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM t_scheme_details
        WHERE tenant_id = $1 
          AND is_live = $2 
          AND scheme_code = $3
          AND is_active = true
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, schemeCode]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('Error checking scheme duplicate:', error);
      throw error;
    }
  }

  /**
   * Validate ISIN format
   */
  validateISIN(isin: string): boolean {
    if (!isin || isin.trim() === '') return true; // Empty is valid
    
    // Generic ISIN format: 2 letter country code + 9 alphanumeric + 1 check digit
    const isinPattern = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
    return isinPattern.test(isin.toUpperCase());
  }

  /**
   * Get all schemes with pagination
   */
  async getSchemes(
  tenantId: number,
  isLive: boolean,
  params: {
    page?: number;
    pageSize?: number;
    search?: string;
    amcName?: string;
    schemeType?: number;
    schemeCategory?: number;
  }
): Promise<{
  schemes: SchemeDetail[];
  total: number;
  page: number;
  pageSize: number;
}> {
  try {
    const { page = 1, pageSize = 20, search, amcName, schemeType, schemeCategory } = params;
    const offset = (page - 1) * pageSize;
    
    let baseQuery = `
      FROM t_scheme_details sd
      LEFT JOIN t_scheme_masters st ON sd.scheme_type_id = st.id
      LEFT JOIN t_scheme_masters sc ON sd.scheme_category_id = sc.id
      WHERE sd.tenant_id = $1 AND sd.is_live = $2 AND sd.is_active = true
    `;
    
    const queryParams: any[] = [tenantId, isLive];
    let paramIndex = 3;
    
    // Add filters
    if (search) {
      baseQuery += ` AND (sd.scheme_name ILIKE $${paramIndex} OR sd.scheme_code ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (amcName) {
      baseQuery += ` AND sd.amc_name = $${paramIndex}`;
      queryParams.push(amcName);
      paramIndex++;
    }
    
    if (schemeType) {
      baseQuery += ` AND sd.scheme_type_id = $${paramIndex}`;
      queryParams.push(schemeType);
      paramIndex++;
    }
    
    if (schemeCategory) {
      baseQuery += ` AND sd.scheme_category_id = $${paramIndex}`;
      queryParams.push(schemeCategory);
      paramIndex++;
    }
    
    // Get total count with proper error handling
    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    const countResult = await this.db.query(countQuery, queryParams);
    const total = countResult.rows.length > 0 && countResult.rows[0]?.total ? 
      parseInt(countResult.rows[0].total) : 0;
    
    // Early return for empty results
    if (total === 0) {
      return {
        schemes: [],
        total: 0,
        page,
        pageSize
      };
    }
    
    // Get paginated data
    const dataQuery = `
      SELECT sd.*, 
             st.name as scheme_type_name,
             sc.name as scheme_category_name
      ${baseQuery}
      ORDER BY sd.scheme_name ASC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(pageSize, offset);
    const result = await this.db.query(dataQuery, queryParams);
    
    return {
      schemes: result.rows || [],
      total,
      page,
      pageSize
    };
  } catch (error) {
    console.error('Error fetching schemes:', error);
    throw error;
  }
}
}