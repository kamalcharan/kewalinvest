// backend/src/services/customerAsset.service.ts
// Service for Customer Asset Assignments (Release 1.1 - Phase 1)

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  CustomerAssetAssignment,
  CustomerAssetAssignmentWithDetails,
  AssignAssetRequest,
  BulkAssignAssetRequest,
  RemoveAssetRequest,
  CustomerAssetListResponse,
  FamilyAssetSummary,
  FamilyAssetListResponse
} from '../types/customerAsset.types';

export class CustomerAssetService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get customer's assigned assets
   */
  async getCustomerAssets(
    customerId: number,
    tenantId: number,
    isLive: boolean
  ): Promise<CustomerAssetListResponse> {
    const query = `
      SELECT
        caa.*,
        at.asset_type_code,
        at.asset_type_name,
        at.category,
        at.default_assumption_rate,
        at.display_order,
        at.description,
        c.name as customer_name,
        u.email as assigned_by_name
      FROM t_customer_asset_assignments caa
      JOIN m_asset_types at ON caa.asset_type_id = at.id
      JOIN t_customers cust ON caa.customer_id = cust.id
      JOIN t_contacts c ON cust.contact_id = c.id
      LEFT JOIN t_users u ON caa.assigned_by = u.id
      WHERE caa.customer_id = $1
        AND caa.tenant_id = $2
        AND caa.is_live = $3
        AND caa.is_active = true
        AND at.is_active = true
      ORDER BY at.display_order, at.asset_type_name
    `;

    const result = await this.db.query(query, [customerId, tenantId, isLive]);

    const assignments: CustomerAssetAssignmentWithDetails[] = result.rows.map(row => ({
      id: row.id,
      tenant_id: row.tenant_id,
      is_live: row.is_live,
      customer_id: row.customer_id,
      asset_type_id: row.asset_type_id,
      is_active: row.is_active,
      assigned_at: row.assigned_at,
      assigned_by: row.assigned_by,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      asset_type: {
        id: row.asset_type_id,
        asset_type_code: row.asset_type_code,
        asset_type_name: row.asset_type_name,
        category: row.category,
        default_assumption_rate: row.default_assumption_rate,
        is_active: true,
        display_order: row.display_order,
        description: row.description,
        created_at: row.created_at,
        updated_at: row.updated_at
      },
      customer_name: row.customer_name,
      assigned_by_name: row.assigned_by_name
    }));

    return {
      assignments,
      total: assignments.length
    };
  }

  /**
   * Assign asset to customer
   */
  async assignAsset(
    data: AssignAssetRequest,
    tenantId: number,
    isLive: boolean,
    assignedBy: number
  ): Promise<CustomerAssetAssignment> {
    // Check if already assigned
    const existingQuery = `
      SELECT id FROM t_customer_asset_assignments
      WHERE customer_id = $1
        AND asset_type_id = $2
        AND tenant_id = $3
        AND is_live = $4
    `;

    const existing = await this.db.query(existingQuery, [
      data.customer_id,
      data.asset_type_id,
      tenantId,
      isLive
    ]);

    if (existing.rows.length > 0) {
      // Reactivate if inactive
      const updateQuery = `
        UPDATE t_customer_asset_assignments
        SET is_active = true,
            assigned_by = $1,
            notes = $2,
            assigned_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;

      const result = await this.db.query(updateQuery, [
        assignedBy,
        data.notes || null,
        existing.rows[0].id
      ]);

      return result.rows[0];
    }

    // Create new assignment
    const insertQuery = `
      INSERT INTO t_customer_asset_assignments (
        tenant_id,
        is_live,
        customer_id,
        asset_type_id,
        assigned_by,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.db.query(insertQuery, [
      tenantId,
      isLive,
      data.customer_id,
      data.asset_type_id,
      assignedBy,
      data.notes || null
    ]);

    return result.rows[0];
  }

  /**
   * Bulk assign assets to customer
   */
  async bulkAssignAssets(
    data: BulkAssignAssetRequest,
    tenantId: number,
    isLive: boolean,
    assignedBy: number
  ): Promise<CustomerAssetAssignment[]> {
    const assignments: CustomerAssetAssignment[] = [];

    for (const assetTypeId of data.asset_type_ids) {
      const assignment = await this.assignAsset(
        {
          customer_id: data.customer_id,
          asset_type_id: assetTypeId,
          notes: data.notes
        },
        tenantId,
        isLive,
        assignedBy
      );

      assignments.push(assignment);
    }

    return assignments;
  }

  /**
   * Remove asset assignment from customer
   */
  async removeAsset(
    data: RemoveAssetRequest,
    tenantId: number,
    isLive: boolean
  ): Promise<void> {
    const query = `
      UPDATE t_customer_asset_assignments
      SET is_active = false
      WHERE customer_id = $1
        AND asset_type_id = $2
        AND tenant_id = $3
        AND is_live = $4
    `;

    await this.db.query(query, [
      data.customer_id,
      data.asset_type_id,
      tenantId,
      isLive
    ]);
  }

  /**
   * Get family asset summary (aggregated across family members)
   */
  async getFamilyAssets(
    familyHeadIwellCode: string,
    tenantId: number,
    isLive: boolean
  ): Promise<FamilyAssetListResponse> {
    // Get family head details
    const familyHeadQuery = `
      SELECT cust.id, c.name
      FROM t_customers cust
      JOIN t_contacts c ON cust.contact_id = c.id
      WHERE cust.iwell_code = $1
        AND cust.tenant_id = $2
        AND cust.is_live = $3
    `;

    const familyHeadResult = await this.db.query(familyHeadQuery, [
      familyHeadIwellCode,
      tenantId,
      isLive
    ]);

    if (familyHeadResult.rows.length === 0) {
      throw new Error(`Family head with iwell_code '${familyHeadIwellCode}' not found`);
    }

    const familyHeadName = familyHeadResult.rows[0].name;

    // Use the helper function from migration
    const assetSummaryQuery = `
      SELECT * FROM get_family_asset_types($1)
    `;

    const result = await this.db.query(assetSummaryQuery, [familyHeadIwellCode]);

    const assetSummary: FamilyAssetSummary[] = result.rows.map(row => ({
      asset_type_code: row.asset_type_code,
      asset_type_name: row.asset_type_name,
      category: row.category,
      family_member_count: row.family_member_count,
      member_names: row.member_names
    }));

    // Get total family member count
    const memberCountQuery = `
      SELECT COUNT(DISTINCT cust.id) as total
      FROM t_customers cust
      WHERE cust.family_head_iwell_code = $1
        AND cust.tenant_id = $2
        AND cust.is_live = $3
    `;

    const memberCount = await this.db.query(memberCountQuery, [
      familyHeadIwellCode,
      tenantId,
      isLive
    ]);

    return {
      family_head_iwell_code: familyHeadIwellCode,
      family_head_name: familyHeadName,
      total_members: memberCount.rows[0]?.total || 0,
      asset_summary: assetSummary
    };
  }

  /**
   * Bulk assign assets to all family members
   */
  async bulkAssignToFamily(
    familyHeadIwellCode: string,
    assetTypeIds: number[],
    tenantId: number,
    isLive: boolean,
    assignedBy: number,
    notes?: string
  ): Promise<{ assigned_count: number; family_member_count: number }> {
    // Get all family members
    const familyMembersQuery = `
      SELECT cust.id
      FROM t_customers cust
      WHERE cust.family_head_iwell_code = $1
        AND cust.tenant_id = $2
        AND cust.is_live = $3
    `;

    const familyMembers = await this.db.query(familyMembersQuery, [
      familyHeadIwellCode,
      tenantId,
      isLive
    ]);

    let assignedCount = 0;

    for (const member of familyMembers.rows) {
      const assignments = await this.bulkAssignAssets(
        {
          customer_id: member.id,
          asset_type_ids: assetTypeIds,
          notes
        },
        tenantId,
        isLive,
        assignedBy
      );

      assignedCount += assignments.length;
    }

    return {
      assigned_count: assignedCount,
      family_member_count: familyMembers.rows.length
    };
  }
}

export const customerAssetService = new CustomerAssetService();
