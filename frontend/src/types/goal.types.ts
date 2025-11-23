// frontend/src/types/goal.types.ts

/**
 * GOAL TRACKING TYPES
 * Matches backend goal.types.ts
 */

export type GoalTrackingType = 'time_based_goal' | 'price_based_goal' | 'time_and_price_goal';

// ==================== PHASE 2: INVESTMENT PLAN ALLOCATION ====================
export interface GoalInvestmentAllocation {
  id: number;
  tenant_id: number;
  is_live: boolean;
  goal_id: number;
  investment_plan_id: number;
  allocated_percentage: number;
  allocated_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: number | null;

  // Joined data (optional)
  investment_plan?: InvestmentPlan;
  current_value?: number;
}

export interface InvestmentPlan {
  id: number;
  customer_id: number;
  asset_type_id: number;
  asset_type_code: string;
  asset_type_name: string;
  principal_amount: number;
  start_date: string;
  has_started: boolean;
  duration_months: number | null;
  duration_years: number | null;
  investment_type: 'one_time' | 'sip' | 'recurring';
  recurring_amount: number | null;
  investment_frequency: 'monthly' | 'quarterly' | 'yearly' | null;
  custom_assumption_rate: number | null;
  default_assumption_rate: number;
  scheme_code: string | null;
  current_value?: number;
}

export interface GoalCalculationResult {
  goal_id: number;
  current_amount: number;
  progress_percentage: number;
  projected_amount: number;
  monthly_sip_required: number;
  is_on_track: boolean;
  risk_level: 'low' | 'medium' | 'high';
  time_remaining_months: number;
  projected_completion_date: string | null;
  shortfall_surplus: number;
  asset_breakdown?: Record<string, number>; // Optional: breakdown by asset type
}

export interface GoalWithCalculations {
  goal_id: number;
  goal_name: string;
  target_amount: number;
  target_date: string;
  current_amount: number;
  progress_percentage: number;
  projected_amount: number;
  monthly_sip_required: number;
  is_on_track: boolean;
  risk_level: 'low' | 'medium' | 'high';
  investment_allocations: GoalInvestmentAllocation[];
  asset_breakdown: Record<string, number>;
}

// ==================== SCHEME LINKING (DEPRECATED - Phase 1) ====================
// DEPRECATED: Use GoalInvestmentAllocation instead
export interface LinkedScheme {
  scheme_code: string;
  scheme_name: string;
  allocation_percentage: number; // Must sum to 100 across all linked schemes
}

// NEW Phase 2: Investment plan linking
export interface LinkedInvestment {
  investment_plan_id: number;
  allocation_percentage: number;
}

// ==================== BASE GOAL CONFIG ====================
export interface BaseGoalConfig {
  goal_name: string;
  goal_type: GoalTrackingType;
  expected_return_rate: number; // Annual percentage: 12 = 12% p.a.
  inflation_rate?: number; // Optional: default 6%

  // DEPRECATED: Portfolio mapping via schemes (Phase 1)
  linked_schemes?: LinkedScheme[];

  // NEW Phase 2: Investment plan mapping
  linked_investments?: LinkedInvestment[];

  // Investment tracking
  current_value: number; // Auto-calculated from portfolio
  monthly_contribution: number; // Current SIP amount

  // Optional notes
  notes?: string;
}

// ==================== TIME-BASED GOAL ====================
export interface TimeBasedGoalConfig extends BaseGoalConfig {
  goal_type: 'time_based_goal';
  
  // Fixed constraint
  target_date: string; // ISO date: "2040-12-31"
  
  // Flexible outcomes (calculated by backend)
  projected_corpus?: number;
  inflation_adjusted_corpus?: number;
}

// ==================== PRICE-BASED GOAL ====================
export interface PriceBasedGoalConfig extends BaseGoalConfig {
  goal_type: 'price_based_goal';
  
  // Fixed constraint
  target_amount: number; // e.g., 20000000 (2 Cr)
  
  // Flexible outcomes (calculated by backend)
  projected_achievement_date?: string; // "2032-03-15"
  months_to_achievement?: number;
  
  // Pace tracking
  pace_status?: 'ahead' | 'on_track' | 'behind';
  pace_variance_months?: number; // +6 or -3
}

// ==================== TIME & PRICE-BASED GOAL ====================
export interface TimeAndPriceGoalConfig extends BaseGoalConfig {
  goal_type: 'time_and_price_goal';
  
  // Both constraints fixed
  target_date: string; // "2035-01-01"
  target_amount: number; // 5000000 (50L)
  
  // Gap analysis (calculated by backend)
  required_monthly_sip?: number;
  current_monthly_sip?: number;
  monthly_sip_gap?: number;
  
  // Progress tracking
  projected_corpus?: number;
  corpus_gap?: number;
  progress_percentage?: number; // 0-100
  
  // Risk assessment
  probability_of_success?: number; // 0-100
  success_confidence?: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  
  // Status
  on_track?: boolean;
  deviation_percentage?: number; // +12 or -8
  
  // Corrective actions
  action_required?: 'increase_sip' | 'rebalance_portfolio' | 'extend_timeline' | 'reduce_target' | 'none';
  recommended_sip_increase?: number;
  recommended_timeline_extension?: number;
  
  // Milestones
  milestones?: GoalMilestone[];
}

// ==================== MILESTONE ====================
export interface GoalMilestone {
  milestone_date: string;
  target_corpus: number;
  achieved: boolean;
  achieved_date?: string;
  achieved_corpus?: number;
}

// ==================== UNION TYPE ====================
export type GoalConfig = TimeBasedGoalConfig | PriceBasedGoalConfig | TimeAndPriceGoalConfig;

// ==================== GOAL CONFIGURATION (from t_jtbd_configurations) ====================
export interface GoalConfiguration {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  jtbd_type: 'goal_tracking';
  title: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  is_active: boolean;
  is_in_watchlist?: boolean;
  config_data: GoalConfig;
  next_alert_date?: string; // Not used for goals
  created_by: number;
  created_at: string;
  updated_at: string;
}

// ==================== PROGRESS SNAPSHOT ====================
export interface GoalProgressSnapshot {
  id: number;
  tenant_id: number;
  is_live: boolean;
  goal_id: number;
  snapshot_date: string;
  current_value: number;
  monthly_contribution: number;
  projected_corpus?: number;
  projected_achievement_date?: string;
  probability_of_success?: number;
  on_track?: boolean;
  deviation_percentage?: number;
  recalculation_trigger: string;
  created_at: string;
}

// ==================== GOAL ALERT ====================
export interface GoalAlert {
  id: number;
  tenant_id: number;
  is_live: boolean;
  goal_id: number;
  customer_id: number;
  alert_type: string; // 'behind_schedule', 'low_probability', 'milestone_achieved'
  severity: 'critical' | 'warning' | 'info';
  message: string;
  action_required?: string;
  action_details?: any;
  is_acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: number;
  created_at: string;
}

// ==================== API REQUEST TYPES ====================
export interface CreateGoalRequest {
  customer_id: number;
  goal_type: GoalTrackingType;
  title: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  config_data: Partial<GoalConfig>; // User provides base fields, backend calculates rest
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  config_data?: Partial<GoalConfig>;
}

// ==================== API RESPONSE TYPES ====================
export interface GoalSummary {
  customer_id: number;
  total_goals: number;
  goals_on_track: number;
  goals_behind: number;
  goals_ahead: number;
  total_target_corpus: number;
  total_current_value: number;
  average_progress: number;
}

export interface GoalRecalculationResult {
  goal_id: number;
  recalculated_at: string;
  current_value: number;
  
  // For time-based
  projected_corpus?: number;
  
  // For price-based
  projected_achievement_date?: string;
  months_to_achievement?: number;
  
  // For time & price
  projected_corpus_at_target?: number;
  corpus_gap?: number;
  probability_of_success?: number;
  required_monthly_sip?: number;
  monthly_sip_gap?: number;
  
  // Change indicators
  corpus_change_from_last: number; // Percentage
  timeline_change_from_last?: number; // Months
  
  // Alerts
  alerts_triggered: string[];
}

// ==================== FORM STATE TYPES ====================
export interface GoalFormData {
  // Common fields
  goal_name: string;
  goal_type: GoalTrackingType;
  expected_return_rate: number;
  inflation_rate: number;
  monthly_contribution: number;
  linked_schemes: LinkedScheme[];
  notes?: string;
  
  // Time-based specific
  target_date?: string;
  
  // Price-based specific
  target_amount?: number;
  
  // Priority & metadata
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description?: string;
}

export interface GoalFormErrors {
  goal_name?: string;
  expected_return_rate?: string;
  monthly_contribution?: string;
  linked_schemes?: string;
  target_date?: string;
  target_amount?: string;
  title?: string;
  [key: string]: string | undefined;
}

// ==================== UI HELPER TYPES ====================
export interface GoalTypeOption {
  value: GoalTrackingType;
  label: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}

export interface GoalStatusInfo {
  status: 'on_track' | 'behind' | 'ahead' | 'unknown';
  color: string;
  icon: string;
  label: string;
  message: string;
}

export interface GoalActionItem {
  type: 'increase_sip' | 'rebalance' | 'extend_timeline' | 'reduce_target' | 'celebrate';
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionable: boolean;
  recommended_value?: number;
  icon: string;
  color: string;
}

// ==================== CHART DATA TYPES ====================
export interface GoalProgressChartData {
  date: string;
  current_value: number;
  projected_value?: number;
  target_value?: number;
  milestone?: string;
}

export interface GoalProjectionPoint {
  month: string;
  projected_corpus: number;
  target_corpus?: number;
  upper_bound?: number; // For Monte Carlo visualization
  lower_bound?: number;
}

// ==================== FILTER/SORT TYPES ====================
export interface GoalFilters {
  goal_type?: GoalTrackingType;
  status?: 'on_track' | 'behind' | 'ahead';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  is_active?: boolean;
}

export interface GoalSortOption {
  field: 'created_at' | 'target_date' | 'priority' | 'progress_percentage' | 'target_amount';
  order: 'asc' | 'desc';
}

// ==================== VALIDATION TYPES ====================
export interface GoalValidationResult {
  is_valid: boolean;
  errors: GoalFormErrors;
  warnings?: string[];
}

// ==================== DISPLAY HELPERS ====================
export interface GoalDisplayInfo {
  goal: GoalConfiguration;
  status: GoalStatusInfo;
  actions: GoalActionItem[];
  next_milestone?: GoalMilestone;
  days_to_target?: number;
  formatted_target_amount?: string;
  formatted_current_value?: string;
  formatted_gap?: string;
}

// ==================== SCHEME ALLOCATION HELPERS ====================
export interface SchemeAllocationState {
  scheme_code: string;
  scheme_name: string;
  current_allocation: number;
  is_selected: boolean;
  available_value: number; // Current portfolio value
}

export interface SchemeAllocationError {
  scheme_code: string;
  error: string;
}

// ==================== CONSTANTS ====================
export const GOAL_TYPE_OPTIONS: GoalTypeOption[] = [
  {
    value: 'time_based_goal',
    label: 'Time-Based Goal',
    description: 'Fixed retirement date - flexible corpus amount',
    icon: '📅',
    color: '#3B82F6', // blue
    features: ['Fixed timeline', 'Flexible amount', 'Retirement planning', 'Inflation adjusted']
  },
  {
    value: 'price_based_goal',
    label: 'Price-Based Goal',
    description: 'Fixed target amount - flexible timeline',
    icon: '💰',
    color: '#10B981', // green
    features: ['Fixed amount', 'Flexible timeline', 'Major purchases', 'Achievement tracking']
  },
  {
    value: 'time_and_price_goal',
    label: 'Time & Price Goal',
    description: 'Both date and amount fixed - requires monitoring',
    icon: '🎯',
    color: '#F59E0B', // orange
    features: ['Fixed timeline', 'Fixed amount', 'Education planning', 'Continuous monitoring']
  }
];

export const DEFAULT_RETURN_RATE = 12; // 12% p.a.
export const DEFAULT_INFLATION_RATE = 6; // 6% p.a.
export const DEFAULT_PRIORITY: 'medium' = 'medium';

export const PRIORITY_OPTIONS = [
  { value: 'critical' as const, label: 'Critical', color: '#DC2626' },
  { value: 'high' as const, label: 'High', color: '#F97316' },
  { value: 'medium' as const, label: 'Medium', color: '#F59E0B' },
  { value: 'low' as const, label: 'Low', color: '#10B981' }
];

export const SUCCESS_CONFIDENCE_LABELS: Record<string, { label: string; color: string }> = {
  very_high: { label: 'Very High (90%+)', color: '#10B981' },
  high: { label: 'High (75-90%)', color: '#3B82F6' },
  medium: { label: 'Medium (60-75%)', color: '#F59E0B' },
  low: { label: 'Low (40-60%)', color: '#F97316' },
  very_low: { label: 'Very Low (<40%)', color: '#DC2626' }
};

// ==================== TYPE GUARDS ====================
export function isTimeBasedGoal(config: GoalConfig): config is TimeBasedGoalConfig {
  return config.goal_type === 'time_based_goal';
}

export function isPriceBasedGoal(config: GoalConfig): config is PriceBasedGoalConfig {
  return config.goal_type === 'price_based_goal';
}

export function isTimeAndPriceGoal(config: GoalConfig): config is TimeAndPriceGoalConfig {
  return config.goal_type === 'time_and_price_goal';
}

// ==================== UTILITY TYPES ====================
export interface GoalMetrics {
  total_invested: number;
  total_returns: number;
  return_percentage: number;
  months_elapsed: number;
  months_remaining?: number;
}

export interface GoalComparison {
  goal_a: GoalConfiguration;
  goal_b: GoalConfiguration;
  comparison_metrics: {
    progress_diff: number;
    risk_diff: number;
    timeline_diff?: number;
    amount_diff?: number;
  };
}