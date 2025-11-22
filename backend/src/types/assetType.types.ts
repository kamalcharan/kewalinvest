// backend/src/types/assetType.types.ts
// Type definitions for Asset Types (Release 1.1 - Phase 1)

export interface AssetType {
  id: number;
  asset_type_code: string;
  asset_type_name: string;
  category: string | null;
  default_assumption_rate: number | null;
  is_active: boolean;
  display_order: number;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAssetTypeRequest {
  asset_type_code: string;
  asset_type_name: string;
  category?: string;
  default_assumption_rate?: number;
  display_order?: number;
  description?: string;
}

export interface UpdateAssetTypeRequest {
  asset_type_name?: string;
  category?: string;
  default_assumption_rate?: number;
  is_active?: boolean;
  display_order?: number;
  description?: string;
}

export interface AssetTypeListResponse {
  asset_types: AssetType[];
  total: number;
}

export enum AssetCategory {
  EQUITY = 'equity',
  DEBT = 'debt',
  COMMODITY = 'commodity',
  REAL_ESTATE = 'real_estate',
  FIXED_INCOME = 'fixed_income',
  EQUITY_DEBT = 'equity/debt'
}

// Pre-defined asset type codes
export enum AssetTypeCode {
  MF = 'MF',
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  EQUITY = 'EQUITY',
  FD = 'FD',
  PPF = 'PPF',
  NSC = 'NSC',
  RE = 'RE',
  BONDS = 'BONDS'
}
