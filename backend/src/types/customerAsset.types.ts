// backend/src/types/customerAsset.types.ts
// TypeScript types for Customer Asset Assignments (Release 1.1 - Phase 1)
// NOTE: This is an alias module for investmentPlan.types.ts
// The t_customer_asset_assignments table is the Investment Plan table

import {
  InvestmentPlan,
  InvestmentPlanWithCalculations,
  CreateInvestmentPlanRequest,
  UpdateInvestmentPlanRequest,
  FamilyInvestmentSummary,
  InvestmentType,
  InvestmentFrequency
} from './investmentPlan.types';
import { AssetType } from './assetType.types';

// Aliases for backward compatibility
export type CustomerAssetAssignment = InvestmentPlan;

// Custom type for customer asset with details (Phase 1 simplified view)
export interface CustomerAssetAssignmentWithDetails {
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
  asset_type: AssetType;
  customer_name?: string;
  assigned_by_name?: string;
}

// Request types (simplified for Phase 1 assignment)
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

// Response types
export interface CustomerAssetListResponse {
  assignments: CustomerAssetAssignmentWithDetails[];
  total: number;
}

// Individual asset summary item
export interface FamilyAssetSummary {
  asset_type_code: string;
  asset_type_name: string;
  category: string;
  family_member_count: number;
  member_names: string;
}

export interface FamilyAssetListResponse {
  family_head_iwell_code: string;
  family_head_name: string;
  total_members: number;
  asset_summary: FamilyAssetSummary[];
}

// Re-export from investmentPlan.types for convenience
export type {
  InvestmentPlan,
  InvestmentPlanWithCalculations,
  CreateInvestmentPlanRequest,
  UpdateInvestmentPlanRequest,
  FamilyInvestmentSummary,
  InvestmentType,
  InvestmentFrequency,
  AssetType
};
