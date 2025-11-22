// backend/src/services/assetType.service.ts
// Service for Asset Types CRUD operations (Release 1.1 - Phase 1)

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  AssetType,
  CreateAssetTypeRequest,
  UpdateAssetTypeRequest,
  AssetTypeListResponse
} from '../types/assetType.types';

export class AssetTypeService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get all asset types
   */
  async getAllAssetTypes(activeOnly: boolean = true): Promise<AssetTypeListResponse> {
    const query = `
      SELECT *
      FROM m_asset_types
      ${activeOnly ? 'WHERE is_active = true' : ''}
      ORDER BY display_order, asset_type_name
    `;

    const result = await this.db.query(query);

    return {
      asset_types: result.rows,
      total: result.rows.length
    };
  }

  /**
   * Get asset type by ID
   */
  async getAssetTypeById(id: number): Promise<AssetType | null> {
    const query = 'SELECT * FROM m_asset_types WHERE id = $1';
    const result = await this.db.query(query, [id]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get asset type by code
   */
  async getAssetTypeByCode(code: string): Promise<AssetType | null> {
    const query = 'SELECT * FROM m_asset_types WHERE asset_type_code = $1';
    const result = await this.db.query(query, [code]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Create new asset type
   */
  async createAssetType(data: CreateAssetTypeRequest): Promise<AssetType> {
    // Check if code already exists
    const existing = await this.getAssetTypeByCode(data.asset_type_code);
    if (existing) {
      throw new Error(`Asset type with code '${data.asset_type_code}' already exists`);
    }

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
      data.display_order || 999,
      data.description || null
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update asset type
   */
  async updateAssetType(id: number, data: UpdateAssetTypeRequest): Promise<AssetType> {
    const existing = await this.getAssetTypeById(id);
    if (!existing) {
      throw new Error(`Asset type with ID ${id} not found`);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.asset_type_name !== undefined) {
      updates.push(`asset_type_name = $${paramIndex++}`);
      values.push(data.asset_type_name);
    }

    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }

    if (data.default_assumption_rate !== undefined) {
      updates.push(`default_assumption_rate = $${paramIndex++}`);
      values.push(data.default_assumption_rate);
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(data.is_active);
    }

    if (data.display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(data.display_order);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);

    const query = `
      UPDATE m_asset_types
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete (soft delete) asset type
   */
  async deleteAssetType(id: number): Promise<void> {
    const query = `
      UPDATE m_asset_types
      SET is_active = false
      WHERE id = $1
    `;

    await this.db.query(query, [id]);
  }
}

export const assetTypeService = new AssetTypeService();
