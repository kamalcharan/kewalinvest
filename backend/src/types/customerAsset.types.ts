// backend/src/types/customerAsset.types.ts
// Type definitions for Customer Asset Assignments (Release 1.1 - Phase 1)

import { AssetType } from './assetType.types';

export interface CustomerAssetAssignment {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  asset_type_id: number;
  is_active: boolean;
  assigned_at: Date;
  assigned_by: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerAssetAssignmentWithDetails extends CustomerAssetAssignment {
  asset_type: AssetType;
  customer_name?: string;
  assigned_by_name?: string;
}

export interface AssignAssetRequest {
  customer_id: number;
  asset_type_id: number;
  notes?: string;
}

export interface BulkAssignAssetRequest {
  customer_id: number;
  asset_type_ids: number[];
  notes?: string;
}

export interface RemoveAssetRequest {
  customer_id: number;
  asset_type_id: number;
}

export interface CustomerAssetListResponse {
  assignments: CustomerAssetAssignmentWithDetails[];
  total: number;
}

export interface FamilyAssetSummary {
  asset_type_code: string;
  asset_type_name: string;
  category: string | null;
  family_member_count: number;
  member_names: string[];
}

export interface FamilyAssetListResponse {
  family_head_iwell_code: string;
  family_head_name: string;
  total_members: number;
  asset_summary: FamilyAssetSummary[];
}
