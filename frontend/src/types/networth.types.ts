// frontend/src/types/networth.types.ts
// Type definitions for NetworthViewer - Cycle 3 Frontend
// Mirrors backend API responses from backend/src/types/networth.types.ts

// ============================================================================
// REQUEST TYPES
// ============================================================================

/**
 * Request parameters for networth summary
 */
export interface NetworthSummaryRequest {
  customer_id?: number;
  family_head_iwellcode?: string;
  as_of_date?: string;  // ISO date string
}

/**
 * Request parameters for networth history
 */
export interface NetworthHistoryRequest {
  customer_id?: number;
  family_head_iwellcode?: string;
  start_date?: string;
  end_date?: string;
  granularity?: 'monthly' | 'quarterly' | 'yearly';
}

/**
 * Request parameters for networth breakdown
 */
export interface NetworthBreakdownRequest {
  customer_id?: number;
  family_head_iwellcode?: string;
  as_of_date?: string;
  asset_type_codes?: string[];
}

/**
 * Request parameters for goal achievability
 */
export interface NetworthGoalsRequest {
  customer_id?: number;
  family_head_iwellcode?: string;
  projection_years?: number;
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
  allocation_percentage: number;
  plan_count: number;
  calculation_method: 'NAV' | 'ASSUMPTION' | 'MIXED';
}

/**
 * Chart data structure for frontend rendering
 */
export interface ChartData {
  labels: string[];
  values: number[];
  colors: string[];
}

/**
 * Networth summary response
 */
export interface NetworthSummaryResponse {
  customer_id?: number;
  customer_name?: string;
  family_head_iwellcode?: string;
  family_member_count?: number;
  as_of_date: string;

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
  chart_data: ChartData;
}

// ============================================================================
// RESPONSE TYPES - HISTORY
// ============================================================================

/**
 * Asset type value in history point
 */
export interface AssetTypeHistoryValue {
  asset_type_code: string;
  current_value: number;
}

/**
 * Single data point in networth history
 */
export interface NetworthHistoryPoint {
  date: string;
  snapshot_month_end: string;
  total_networth: number;
  total_invested: number;
  total_returns: number;
  return_percentage: number;
  by_asset_type?: AssetTypeHistoryValue[];
}

/**
 * Chart-ready asset type series
 */
export interface AssetTypeChartSeries {
  asset_type_code: string;
  asset_type_name: string;
  values: number[];
  color: string;
}

/**
 * Chart-ready data for timeline rendering
 */
export interface ChartReadyData {
  dates: string[];
  networth_values: number[];
  invested_values: number[];
  by_asset_type?: AssetTypeChartSeries[];
}

/**
 * Networth history response
 */
export interface NetworthHistoryResponse {
  customer_id?: number;
  family_head_iwellcode?: string;

  // Data points for chart
  history: NetworthHistoryPoint[];

  // Summary statistics
  start_date: string;
  end_date: string;
  data_points: number;

  // Growth metrics
  starting_networth: number;
  ending_networth: number;
  absolute_growth: number;
  percentage_growth: number;

  // For frontend charting
  chart_ready: ChartReadyData;
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
  start_date: string;
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
  investment_plans: InvestmentPlanDetail[];
}

/**
 * Networth breakdown response
 */
export interface NetworthBreakdownResponse {
  customer_id?: number;
  customer_name?: string;
  family_head_iwellcode?: string;
  as_of_date: string;

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
 * Contributing asset to a goal
 */
export interface ContributingAsset {
  asset_type_code: string;
  current_value: number;
  projected_value: number;
}

/**
 * Goal with achievability projection
 */
export interface GoalAchievability {
  goal_id: number;
  goal_name: string;
  target_amount: number;
  target_date: string;
  current_allocated_value: number;
  projected_value_at_target: number;
  shortfall_or_surplus: number;
  achievability_percentage: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'ahead';
  contributing_assets: ContributingAsset[];
}

/**
 * Networth goals response
 */
export interface NetworthGoalsResponse {
  customer_id?: number;
  family_head_iwellcode?: string;
  projection_date: string;

  // Current networth
  current_networth: number;
  projected_networth: number;

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
// API RESPONSE WRAPPERS
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

// Type aliases for API responses
export type NetworthSummaryApiResponse = NetworthApiResponse<NetworthSummaryResponse>;
export type NetworthHistoryApiResponse = NetworthApiResponse<NetworthHistoryResponse>;
export type NetworthBreakdownApiResponse = NetworthApiResponse<NetworthBreakdownResponse>;
export type NetworthGoalsApiResponse = NetworthApiResponse<NetworthGoalsResponse>;

// ============================================================================
// CHART CONFIGURATION
// ============================================================================

/**
 * Default colors for asset types (matching backend)
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

/**
 * Asset type display names
 */
export const ASSET_TYPE_NAMES: Record<string, string> = {
  MF: 'Mutual Funds',
  EQUITY: 'Direct Equity',
  GOLD: 'Gold',
  SILVER: 'Silver',
  RE: 'Real Estate',
  FD: 'Fixed Deposits',
  PPF: 'PPF',
  NSC: 'NSC',
  OTHER: 'Other',
};

// ============================================================================
// VIEW STATE TYPES
// ============================================================================

/**
 * View mode for networth chart
 */
export type NetworthViewMode = 'combined' | 'by_asset_type';

/**
 * Granularity for history chart
 */
export type HistoryGranularity = 'monthly' | 'quarterly' | 'yearly';

/**
 * Tab selection for NetworthViewer
 */
export type NetworthTab = 'summary' | 'history' | 'breakdown' | 'goals';
