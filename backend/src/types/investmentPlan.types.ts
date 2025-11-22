// backend/src/types/investmentPlan.types.ts
// TypeScript types for Investment Plan management (Release 1.1 - Phase 1)

import { AssetType } from './assetType.types';

export interface InvestmentPlan {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  asset_type_id: number;

  // Investment Plan Details
  principal_amount: number | null;
  start_date: string | null;
  has_started: boolean;
  duration_months: number | null;
  duration_years: number | null;

  // Investment Type & Frequency
  investment_type: InvestmentType | null;
  recurring_amount: number | null;
  investment_frequency: InvestmentFrequency | null;

  // Growth & Returns
  custom_assumption_rate: number | null;

  // MF Specific
  scheme_code: string | null;

  // Metadata
  is_active: boolean;
  assigned_at: Date;
  assigned_by: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;

  // Joined data (optional)
  asset_type?: AssetType;
  scheme_details?: SchemeBookmark;
}

export type InvestmentType = 'one_time' | 'sip' | 'recurring';

export type InvestmentFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface CreateInvestmentPlanRequest {
  customer_id: number;
  asset_type_id: number;
  principal_amount: number;
  start_date: string; // ISO date string
  has_started: boolean;
  duration_months?: number;
  duration_years?: number;
  investment_type: InvestmentType;
  recurring_amount?: number;
  investment_frequency?: InvestmentFrequency;
  custom_assumption_rate?: number;
  scheme_code?: string;
  notes?: string;
}

export interface UpdateInvestmentPlanRequest {
  principal_amount?: number;
  start_date?: string;
  has_started?: boolean;
  duration_months?: number;
  duration_years?: number;
  investment_type?: InvestmentType;
  recurring_amount?: number;
  investment_frequency?: InvestmentFrequency;
  custom_assumption_rate?: number;
  notes?: string;
}

export interface InvestmentPlanWithCalculations extends InvestmentPlan {
  calculated_current_value: number;
  total_invested: number;
  gain_loss: number;
  effective_growth_rate: number; // custom_assumption_rate or asset_type default
}

export interface FamilyInvestmentSummary {
  family_head_id: number;
  family_head_iwell_code: string;
  total_principal: number;
  total_current_value: number;
  total_gain_loss: number;
  investments_by_asset_type: {
    asset_type_code: string;
    asset_type_name: string;
    count: number;
    total_principal: number;
    total_current_value: number;
  }[];
  family_members: {
    customer_id: number;
    customer_name: string;
    total_principal: number;
    total_current_value: number;
    investment_count: number;
  }[];
}

export interface SchemeBookmark {
  id: number;
  scheme_code: string;
  scheme_name: string;
  scheme_category: string | null;
  alias_name: string | null;
}

// Validation helper types
export interface InvestmentPlanValidationError {
  field: string;
  message: string;
}

export interface InvestmentPlanValidationResult {
  valid: boolean;
  errors: InvestmentPlanValidationError[];
}
