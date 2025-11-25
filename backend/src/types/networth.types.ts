// backend/src/types/networth.types.ts
// Type definitions for NetworthViewer APIs - Cycle 2
// Aggregates multi-asset portfolio snapshots for networth visualization

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Request parameters for networth summary
 */
export interface NetworthSummaryRequest {
  customer_id?: number;
  family_head_iwellcode?: string;  // For family view
  as_of_date?: Date;               // Optional: specific date (default: latest)
}

/**
 * Request parameters for networth history
 */
export interface NetworthHistoryRequest {
  customer_id?: number;
  family_head_iwellcode?: string;  // For family view
  start_date?: Date;               // Optional: filter start
  end_date?: Date;                 // Optional: filter end
  granularity?: 'monthly' | 'quarterly' | 'yearly';  // Default: monthly
}

/**
 * Request parameters for networth breakdown
 */
export interface NetworthBreakdownRequest {
  customer_id?: number;
  family_head_iwellcode?: string;  // For family view
  as_of_date?: Date;               // Optional: specific date (default: latest)
  asset_type_codes?: string[];     // Optional: filter by specific asset types
}

/**
 * Request parameters for goal achievability
 */
export interface NetworthGoalsRequest {
  customer_id?: number;
  family_head_iwellcode?: string;  // For family view
  projection_years?: number;       // How far to project (default: 10)
}

// ============================================================================
// RESPONSE TYPES - SUMMARY
// ============================================================================

/**
 * Asset type breakdown in summary
 */
export interface AssetTypeSummary {
  asset_type_code: string;
  asset_type_name: string;
  total_invested: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  allocation_percentage: number;  // % of total networth
  plan_count: number;             // Number of investment plans
  calculation_method: 'NAV' | 'ASSUMPTION' | 'MIXED';
}

/**
 * Networth summary response
 */
export interface NetworthSummaryResponse {
  customer_id?: number;
  customer_name?: string;
  family_head_iwellcode?: string;
  family_member_count?: number;
  as_of_date: Date;

  // Aggregated totals
  total_networth: number;
  total_invested: number;
  total_returns: number;
  overall_return_percentage: number;

  // Breakdown by asset type
  by_asset_type: AssetTypeSummary[];

  // Quick stats
  asset_type_count: number;
  total_investment_plans: number;

  // For chart rendering
  chart_data: {
    labels: string[];           // Asset type names
    values: number[];           // Current values
    colors: string[];           // Suggested colors
  };
}

// ============================================================================
// RESPONSE TYPES - HISTORY
// ============================================================================

/**
 * Single data point in networth history
 */
export interface NetworthHistoryPoint {
  date: string;                   // ISO date string (YYYY-MM-DD)
  snapshot_month_end: Date;
  total_networth: number;
  total_invested: number;
  total_returns: number;
  return_percentage: number;

  // Optional: breakdown by asset type for stacked charts
  by_asset_type?: {
    asset_type_code: string;
    current_value: number;
  }[];
}

/**
 * Networth history response (for timeline chart)
 */
export interface NetworthHistoryResponse {
  customer_id?: number;
  family_head_iwellcode?: string;

  // Data points for chart
  history: NetworthHistoryPoint[];

  // Summary statistics
  start_date: Date;
  end_date: Date;
  data_points: number;

  // Growth metrics
  starting_networth: number;
  ending_networth: number;
  absolute_growth: number;
  percentage_growth: number;

  // For frontend charting
  chart_ready: {
    dates: string[];              // X-axis labels
    networth_values: number[];    // Main line (total)
    invested_values: number[];    // Secondary line (cost basis)
    // For stacked area chart (optional)
    by_asset_type?: {
      asset_type_code: string;
      asset_type_name: string;
      values: number[];
      color: string;
    }[];
  };
}

// ============================================================================
// RESPONSE TYPES - BREAKDOWN
// ============================================================================

/**
 * Individual investment plan details
 */
export interface InvestmentPlanDetail {
  investment_plan_id: number;
  plan_name: string;
  asset_type_code: string;
  asset_type_name: string;
  principal_amount: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  growth_rate_applied: number | null;
  calculation_method: 'NAV' | 'ASSUMPTION';
  start_date: Date;
  investment_type: 'one_time' | 'sip' | 'recurring';
}

/**
 * Asset type with detailed breakdown
 */
export interface AssetTypeBreakdown {
  asset_type_code: string;
  asset_type_name: string;
  total_invested: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  allocation_percentage: number;
  default_assumption_rate: number;

  // Individual plans under this asset type
  investment_plans: InvestmentPlanDetail[];
}

/**
 * Networth breakdown response (detailed view)
 */
export interface NetworthBreakdownResponse {
  customer_id?: number;
  customer_name?: string;
  family_head_iwellcode?: string;
  as_of_date: Date;

  // Total networth
  total_networth: number;
  total_invested: number;

  // Detailed breakdown by asset type
  breakdown: AssetTypeBreakdown[];

  // Summary counts
  total_asset_types: number;
  total_investment_plans: number;
}

// ============================================================================
// RESPONSE TYPES - GOALS
// ============================================================================

/**
 * Goal with achievability projection
 */
export interface GoalAchievability {
  goal_id: number;
  goal_name: string;
  target_amount: number;
  target_date: Date;
  current_allocated_value: number;
  projected_value_at_target: number;
  shortfall_or_surplus: number;
  achievability_percentage: number;  // 100% = on track, >100% = surplus, <100% = shortfall
  status: 'on_track' | 'at_risk' | 'behind' | 'ahead';

  // Contributing assets
  contributing_assets: {
    asset_type_code: string;
    current_value: number;
    projected_value: number;
  }[];
}

/**
 * Networth goals response (goal achievability)
 */
export interface NetworthGoalsResponse {
  customer_id?: number;
  family_head_iwellcode?: string;
  projection_date: Date;

  // Current networth
  current_networth: number;
  projected_networth: number;  // At furthest goal date

  // Goals with achievability
  goals: GoalAchievability[];

  // Summary
  total_goals: number;
  goals_on_track: number;
  goals_at_risk: number;
  goals_behind: number;

  // Aggregate target vs projected
  total_target_amount: number;
  total_projected_amount: number;
  overall_achievability_percentage: number;
}

// ============================================================================
// INTERNAL/SERVICE TYPES
// ============================================================================

/**
 * Raw snapshot data from database query
 */
export interface RawSnapshotRow {
  customer_id: number;
  snapshot_month_end: Date;
  asset_type_code: string;
  investment_plan_id: number | null;
  total_invested: string | number;
  current_value: string | number;
  total_returns: string | number;
  return_percentage: string | number;
  calculation_method: string;
  growth_rate_applied: string | number | null;
  actual_amount: string | number | null;
}

/**
 * Family member for aggregation
 */
export interface FamilyMemberForNetworth {
  customer_id: number;
  customer_name: string;
  relationship: string;
  is_family_head: boolean;
}

/**
 * Asset type master data
 */
export interface AssetTypeMaster {
  id: number;
  asset_type_code: string;
  asset_type_name: string;
  default_assumption_rate: number;
  display_order: number;
  color_code?: string;
}

// ============================================================================
// API RESPONSE WRAPPER
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface NetworthApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================================================
// CHART CONFIGURATION
// ============================================================================

/**
 * Default colors for asset types (for consistent charting)
 */
export const ASSET_TYPE_COLORS: Record<string, string> = {
  MF: '#4F46E5',      // Indigo - Mutual Funds
  EQUITY: '#10B981',  // Emerald - Direct Equity
  GOLD: '#F59E0B',    // Amber - Gold
  SILVER: '#6B7280',  // Gray - Silver
  RE: '#8B5CF6',      // Violet - Real Estate
  FD: '#3B82F6',      // Blue - Fixed Deposits
  PPF: '#EC4899',     // Pink - PPF
  NSC: '#14B8A6',     // Teal - NSC
  OTHER: '#9CA3AF',   // Light Gray - Other
};

/**
 * Get color for asset type
 */
export function getAssetTypeColor(assetTypeCode: string): string {
  return ASSET_TYPE_COLORS[assetTypeCode] || ASSET_TYPE_COLORS.OTHER;
}
