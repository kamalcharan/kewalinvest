// frontend/src/types/assetType.types.ts
// Frontend types for Asset Types (Release 1.1 - Phase 1)

export interface AssetType {
  id: number;
  asset_type_code: string;
  asset_type_name: string;
  category: string | null;
  default_assumption_rate: number | null;
  is_active: boolean;
  display_order: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerAssetAssignment {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  asset_type_id: number;
  is_active: boolean;
  assigned_at: string;
  assigned_by: number | null;
  notes: string | null;
  asset_type?: AssetType;
  customer_name?: string;
  assigned_by_name?: string;
}

// Asset type codes matching m_asset_types table in database
export enum AssetTypeCode {
  MF = 'MF',
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  EQUITY = 'EQUITY',
  FD = 'FD',
  PPF = 'PPF',
  EPF = 'EPF',
  NPS = 'NPS',
  REAL_ESTATE = 'REAL_ESTATE',
  INSURANCE = 'INSURANCE',
  // Additional codes (not in default seed but may be added)
  NSC = 'NSC',
  BONDS = 'BONDS'
}
