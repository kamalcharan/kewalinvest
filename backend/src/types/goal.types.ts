// backend/src/types/goal.types.ts

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

// ==================== WITHDRAWAL ====================
export interface GoalWithdrawal {
  id: string; // Client-generated ID (e.g., "w1", "w2")
  amount: number;
  withdrawal_date: string; // ISO date
  reason: string;
  sequence: number; // Order of withdrawal (1, 2, 3...)
}

export interface WithdrawalValidationError {
  field: string;
  message: string;
  withdrawalId?: string;
}

export interface WithdrawalValidationResult {
  isValid: boolean;
  errors: WithdrawalValidationError[];
}

// ==================== VALIDATION FUNCTIONS ====================
export function validateWithdrawals(
  withdrawals: GoalWithdrawal[] | undefined,
  targetAmount: number | undefined,
  targetDate: string | undefined
): WithdrawalValidationResult {
  const errors: WithdrawalValidationError[] = [];

  if (!withdrawals || withdrawals.length === 0) {
    return { isValid: true, errors: [] };
  }

  // REMOVED: Target amount validation - not required for time-based goals
  // Time-based goals only have target_date, not target_amount
  // if (!targetAmount) {
  //   errors.push({
  //     field: 'target_amount',
  //     message: 'Target amount is required when withdrawals are specified'
  //   });
  // }

  // REMOVED: Target date validation - not required for price-based goals
  // Price-based goals only have target_amount, not target_date
  // Date validation will be skipped if target_date is not provided
  // if (!targetDate) {
  //   errors.push({
  //     field: 'target_date',
  //     message: 'Target date is required when withdrawals are specified'
  //   });
  // }

  const targetDateObj = targetDate ? new Date(targetDate) : null;
  let totalWithdrawalAmount = 0;

  for (const withdrawal of withdrawals) {
    // Validate withdrawal amount
    if (!withdrawal.amount || withdrawal.amount <= 0) {
      errors.push({
        field: 'withdrawal_amount',
        message: 'Withdrawal amount must be greater than 0',
        withdrawalId: withdrawal.id
      });
    }

    // Validate withdrawal date
    if (!withdrawal.withdrawal_date) {
      errors.push({
        field: 'withdrawal_date',
        message: 'Withdrawal date is required',
        withdrawalId: withdrawal.id
      });
    } else {
      const withdrawalDate = new Date(withdrawal.withdrawal_date);

      // Check if withdrawal date is before target date
      if (targetDateObj && withdrawalDate >= targetDateObj) {
        errors.push({
          field: 'withdrawal_date',
          message: 'Withdrawal date must be before target date',
          withdrawalId: withdrawal.id
        });
      }

      // Check if withdrawal date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (withdrawalDate < today) {
        errors.push({
          field: 'withdrawal_date',
          message: 'Withdrawal date cannot be in the past',
          withdrawalId: withdrawal.id
        });
      }
    }

    // Validate reason
    if (!withdrawal.reason || withdrawal.reason.trim().length === 0) {
      errors.push({
        field: 'withdrawal_reason',
        message: 'Withdrawal reason is required',
        withdrawalId: withdrawal.id
      });
    }

    totalWithdrawalAmount += withdrawal.amount;
  }

  // Validate total withdrawal amount < target amount
  if (targetAmount && totalWithdrawalAmount >= targetAmount) {
    errors.push({
      field: 'total_withdrawals',
      message: `Total withdrawals (${totalWithdrawalAmount}) must be less than target amount (${targetAmount})`
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ==================== BASE GOAL CONFIG ====================
export interface BaseGoalConfig {
  goal_name: string;
  goal_type: GoalTrackingType;

  // Start date (can be future)
  start_date?: string; // ISO date - defaults to today if not provided

  // REMOVED: Assumptions now come from asset types
  // expected_return_rate moved to asset level
  // inflation_rate moved to asset level

  // DEPRECATED: Portfolio mapping via schemes (Phase 1)
  // Use GoalInvestmentAllocation table instead (Phase 2)
  linked_schemes?: {
    scheme_code: string;
    scheme_name: string;
    allocation_percentage: number;
  }[];

  // DEPRECATED: Investment plan mapping (Phase 2)
  // Use t_goal_investment_allocations table with asset types
  linked_investments?: {
    investment_plan_id: number;
    allocation_percentage: number;
  }[];

  // Investment tracking
  current_value: number; // Auto-calculated from portfolio
  monthly_contribution: number; // Current SIP amount

  // NEW: Withdrawal support
  has_withdrawals?: boolean; // Does this goal have intermediate withdrawals?
  withdrawals?: GoalWithdrawal[]; // Array of planned withdrawals

  // NEW: Asset type allocations (for planning/pie chart display)
  asset_allocations?: Array<{
    asset_type_code: string;
    asset_type_name: string;
    allocation_percentage: number;
    default_assumption_rate: number;
  }>;
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

// ==================== GOAL TRACKING STATUS ====================
export interface GoalTrackingStatus {
  goal_id: number;
  customer_id: number;
  goal_name: string;
  goal_type: GoalTrackingType;

  // Performance tracking
  current_value: number;
  expected_value: number; // What should be there at this point
  performance_percentage: number; // current / expected * 100

  // Status
  is_on_track: boolean; // performance >= 100%
  variance_percentage: number; // performance - 100

  // Watchlist
  is_in_watchlist: boolean;
  watchlist_added_at?: string;
  watchlist_reason?: string;

  // Last updated
  last_calculated_at: string;
}

// ==================== ASSET ALLOCATION UTILIZATION ====================
// DEPRECATED: Scheme-based allocation (Phase 1)
export interface SchemeAllocationUtilization {
  scheme_code: string;
  scheme_name: string;
  total_portfolio_value: number;
  allocated_value: number;
  allocated_percentage: number;
  available_value: number;
  available_percentage: number;
  is_fully_allocated: boolean;
  allocation_breakdown: {
    goal_id: number;
    goal_name: string;
    allocation_percentage: number;
    allocation_value: number;
  }[];
}

// NEW Phase 2: Investment plan allocation utilization
export interface InvestmentAllocationUtilization {
  investment_plan_id: number;
  asset_type_code: string;
  asset_type_name: string;
  current_value: number;
  allocated_value: number;
  allocated_percentage: number;
  available_value: number;
  available_percentage: number;
  is_fully_allocated: boolean;
  allocation_breakdown: {
    goal_id: number;
    goal_name: string;
    allocation_percentage: number;
    allocation_value: number;
  }[];
}