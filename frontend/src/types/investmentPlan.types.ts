// frontend/src/types/investmentPlan.types.ts
// TypeScript types for Investment Plan management (Release 1.1 - Phase 1)

import { AssetType } from './assetType.types';

export type InvestmentType = 'one_time' | 'sip' | 'recurring';
export type InvestmentFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface InvestmentPlan {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  asset_type_id: number;

  // Investment Plan Details
  principal_amount: number;
  start_date: string;
  has_started: boolean;
  duration_months: number | null;
  duration_years: number | null;

  // Investment Type & Frequency
  investment_type: InvestmentType;
  recurring_amount: number | null;
  investment_frequency: InvestmentFrequency | null;

  // Growth & Returns
  custom_assumption_rate: number | null;

  // MF Specific
  scheme_code: string | null;

  // Metadata
  is_active: boolean;
  assigned_at: string;
  assigned_by: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;

  // Joined data (from backend)
  asset_type?: AssetType;
  asset_type_code?: string;
  asset_type_name?: string;
  category?: string;
  default_assumption_rate?: number;
  scheme_name?: string;
  scheme_alias_name?: string;
}

export interface CreateInvestmentPlanRequest {
  asset_type_id: number;
  principal_amount: number;
  start_date: string;
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

export interface InvestmentPlanCalculations {
  current_value: number;
  total_invested: number;
  gain_loss: number;
  gain_loss_percentage: number;
  effective_growth_rate: number;
  months_elapsed: number;
  years_elapsed: number;
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

// Helper to calculate investment values on frontend
export const calculateInvestmentValue = (plan: InvestmentPlan): InvestmentPlanCalculations => {
  const principal = plan.principal_amount || 0;
  const growthRate = (plan.custom_assumption_rate || plan.default_assumption_rate || 0) / 100;

  if (!plan.has_started || !plan.start_date) {
    return {
      current_value: principal,
      total_invested: principal,
      gain_loss: 0,
      gain_loss_percentage: 0,
      effective_growth_rate: plan.custom_assumption_rate || plan.default_assumption_rate || 0,
      months_elapsed: 0,
      years_elapsed: 0
    };
  }

  const startDate = new Date(plan.start_date);
  const today = new Date();
  const msElapsed = today.getTime() - startDate.getTime();
  const yearsElapsed = msElapsed / (1000 * 60 * 60 * 24 * 365.25);
  const monthsElapsed = Math.floor(yearsElapsed * 12);

  if (yearsElapsed <= 0) {
    return {
      current_value: principal,
      total_invested: principal,
      gain_loss: 0,
      gain_loss_percentage: 0,
      effective_growth_rate: plan.custom_assumption_rate || plan.default_assumption_rate || 0,
      months_elapsed: 0,
      years_elapsed: 0
    };
  }

  let currentValue = 0;
  let totalInvested = principal;

  if (plan.investment_type === 'one_time') {
    // Compound interest: FV = PV * (1 + r)^t
    currentValue = principal * Math.pow(1 + growthRate, yearsElapsed);
  } else if (plan.investment_type === 'sip' || plan.investment_type === 'recurring') {
    const recurringAmount = plan.recurring_amount || 0;

    // Calculate payments per year
    let paymentsPerYear = 12; // monthly by default
    if (plan.investment_frequency === 'quarterly') paymentsPerYear = 4;
    if (plan.investment_frequency === 'yearly') paymentsPerYear = 1;

    const periodicRate = growthRate / paymentsPerYear;
    const totalPayments = Math.floor(yearsElapsed * paymentsPerYear);

    // Future value of lump sum principal
    const principalFV = principal * Math.pow(1 + growthRate, yearsElapsed);

    // Future value of SIP payments
    let sipFV = 0;
    if (totalPayments > 0 && periodicRate > 0) {
      sipFV = recurringAmount * ((Math.pow(1 + periodicRate, totalPayments) - 1) / periodicRate) * (1 + periodicRate);
    } else {
      sipFV = recurringAmount * totalPayments;
    }

    currentValue = principalFV + sipFV;
    totalInvested = principal + (recurringAmount * totalPayments);
  } else {
    currentValue = principal;
  }

  const gainLoss = currentValue - totalInvested;
  const gainLossPercentage = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

  return {
    current_value: currentValue,
    total_invested: totalInvested,
    gain_loss: gainLoss,
    gain_loss_percentage: gainLossPercentage,
    effective_growth_rate: plan.custom_assumption_rate || plan.default_assumption_rate || 0,
    months_elapsed: monthsElapsed,
    years_elapsed: Math.round(yearsElapsed * 100) / 100
  };
};
