// backend/src/services/assetType.service.ts
// Service for Asset Types (Release 1.1 - Phase 1)

import pool from '../config/database';
import { AssetType, CreateAssetTypeRequest, UpdateAssetTypeRequest, AssetTypeListResponse } from '../types/assetType.types';

export class AssetTypeService {
  /**
   * Get all asset types
   */
  async getAllAssetTypes(activeOnly: boolean = true): Promise<AssetTypeListResponse> {
    const query = `
      SELECT
        id,
        asset_type_code,
        asset_type_name,
        category,
        default_assumption_rate,
        is_active,
        display_order,
        description,
        created_at,
        updated_at
      FROM m_asset_types
      ${activeOnly ? 'WHERE is_active = true' : ''}
      ORDER BY display_order ASC, asset_type_name ASC
    `;

    const result = await pool.query(query);

    return {
      asset_types: result.rows
    };
  }

  /**
   * Get asset type by ID
   */
  async getAssetTypeById(id: number): Promise<AssetType> {
    const query = `
      SELECT
        id,
        asset_type_code,
        asset_type_name,
        category,
        default_assumption_rate,
        is_active,
        display_order,
        description,
        created_at,
        updated_at
      FROM m_asset_types
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      throw new Error(`Asset type with ID ${id} not found`);
    }

    return result.rows[0];
  }

  /**
   * Get asset type by code
   */
  async getAssetTypeByCode(code: string): Promise<AssetType> {
    const query = `
      SELECT
        id,
        asset_type_code,
        asset_type_name,
        category,
        default_assumption_rate,
        is_active,
        display_order,
        description,
        created_at,
        updated_at
      FROM m_asset_types
      WHERE asset_type_code = $1
    `;

    const result = await pool.query(query, [code]);

    if (result.rows.length === 0) {
      throw new Error(`Asset type with code ${code} not found`);
    }

    return result.rows[0];
  }

  /**
   * Create new asset type (Admin only - for master data management)
   */
  async createAssetType(data: CreateAssetTypeRequest): Promise<AssetType> {
    const query = `
      INSERT INTO m_asset_types (
        asset_type_code,
        asset_type_name,
        category,
        default_assumption_rate,
        display_order,
        description
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.asset_type_code,
      data.asset_type_name,
      data.category || null,
      data.default_assumption_rate || null,
      data.display_order || 0,
      data.description || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Update asset type (Admin only - for master data management)
   */
  async updateAssetType(id: number, data: UpdateAssetTypeRequest): Promise<AssetType> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.asset_type_name !== undefined) {
      updates.push(`asset_type_name = $${paramCount++}`);
      values.push(data.asset_type_name);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(data.category);
    }
    if (data.default_assumption_rate !== undefined) {
      updates.push(`default_assumption_rate = $${paramCount++}`);
      values.push(data.default_assumption_rate);
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }
    if (data.display_order !== undefined) {
      updates.push(`display_order = $${paramCount++}`);
      values.push(data.display_order);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE m_asset_types
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error(`Asset type with ID ${id} not found`);
    }

    return result.rows[0];
  }

  /**
   * Delete asset type (Admin only - soft delete by setting is_active = false)
   */
  async deleteAssetType(id: number): Promise<void> {
    // Check if asset type is being used
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM t_customer_asset_assignments WHERE asset_type_id = $1 AND is_active = true',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete asset type that is currently in use by customer investments');
    }

    // Soft delete
    const result = await pool.query(
      'UPDATE m_asset_types SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      throw new Error(`Asset type with ID ${id} not found`);
    }
  }
}
