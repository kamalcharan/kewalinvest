// backend/src/types/goal.types.ts

export type GoalTrackingType = 'time_based_goal' | 'price_based_goal' | 'time_and_price_goal';

// ==================== BASE GOAL CONFIG ====================
export interface BaseGoalConfig {
  goal_name: string;
  goal_type: GoalTrackingType;
  expected_return_rate: number; // Annual percentage: 12 = 12% p.a.
  inflation_rate?: number; // Optional: default 6%
  
  // Portfolio mapping
  linked_schemes: {
    scheme_code: string;
    scheme_name: string;
    allocation_percentage: number; // What % of this scheme is for this goal
  }[];
  
  // Investment tracking
  current_value: number; // Auto-calculated from portfolio
  monthly_contribution: number; // Current SIP amount
}

// ==================== TIME-BASED GOAL ====================
export interface TimeBasedGoalConfig extends BaseGoalConfig {
  goal_type: 'time_based_goal';
  
  // Fixed constraint
  target_date: string; // ISO date: "2040-12-31"
  
  // Flexible outcomes
  projected_corpus: number; // Calculated: What they'll have
  inflation_adjusted_corpus: number; // Real value after inflation
  
  // Additional fields
  notes?: string;
}

// ==================== PRICE-BASED GOAL ====================
export interface PriceBasedGoalConfig extends BaseGoalConfig {
  goal_type: 'price_based_goal';
  
  // Fixed constraint
  target_amount: number; // e.g., 20000000 (2 Cr)
  
  // Flexible outcomes
  projected_achievement_date: string; // Calculated: "2032-03-15"
  months_to_achievement: number; // How many months away
  
  // Pace tracking
  pace_status: 'ahead' | 'on_track' | 'behind';
  pace_variance_months: number; // +6 months ahead, -3 months behind
}

// ==================== TIME & PRICE-BASED GOAL ====================
export interface TimeAndPriceGoalConfig extends BaseGoalConfig {
  goal_type: 'time_and_price_goal';
  
  // Both constraints fixed
  target_date: string; // "2035-01-01"
  target_amount: number; // 5000000 (50L)
  
  // Gap analysis
  required_monthly_sip: number; // What SHOULD they invest
  current_monthly_sip: number; // What they ARE investing
  monthly_sip_gap: number; // Shortfall/surplus
  
  // Progress tracking
  projected_corpus: number; // What they'll have at target_date
  corpus_gap: number; // Shortfall/surplus vs target_amount
  progress_percentage: number; // 0-100%
  
  // Risk assessment
  probability_of_success: number; // 0-100%, Monte Carlo simulation
  success_confidence: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  
  // Status
  on_track: boolean;
  deviation_percentage: number; // +12% ahead, -8% behind
  
  // Corrective actions
  action_required: 'increase_sip' | 'rebalance_portfolio' | 'extend_timeline' | 'reduce_target' | 'none';
  recommended_sip_increase?: number; // e.g., +3500 per month
  recommended_timeline_extension?: number; // e.g., +12 months
  
  // Milestones
  milestones?: GoalMilestone[];
}

// Milestone tracking
export interface GoalMilestone {
  milestone_date: string;
  target_corpus: number;
  achieved: boolean;
  achieved_date?: string;
  achieved_corpus?: number;
}

// ==================== UNION TYPE ====================
export type GoalConfig = TimeBasedGoalConfig | PriceBasedGoalConfig | TimeAndPriceGoalConfig;

// ==================== GOAL PROGRESS HISTORY ====================
export interface GoalProgressSnapshot {
  id: number;
  goal_id: number;
  snapshot_date: string;
  current_value: number;
  monthly_contribution: number;
  projected_corpus?: number;
  projected_achievement_date?: string;
  probability_of_success?: number;
  on_track?: boolean;
  deviation_percentage?: number;
  created_at: string;
}

// ==================== GOAL RECALCULATION RESULT ====================
export interface GoalRecalculationResult {
  goal_id: number;
  recalculated_at: string;
  
  // Updated values
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
  corpus_change_from_last: number; // +2.3% or -1.1%
  timeline_change_from_last?: number; // +2 months or -1 month
  
  // Alerts triggered
  alerts_triggered: string[]; // ["corpus_gap_increased", "behind_schedule"]
}

// ==================== API REQUEST/RESPONSE ====================
export interface CreateGoalRequest {
  customer_id: number;
  goal_type: GoalTrackingType;
  title: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  config_data: GoalConfig;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  config_data?: Partial<GoalConfig>;
}

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