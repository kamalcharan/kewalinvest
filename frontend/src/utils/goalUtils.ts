// frontend/src/utils/goalUtils.ts

import {
  GoalConfiguration,
  GoalConfig,
  TimeBasedGoalConfig,
  PriceBasedGoalConfig,
  TimeAndPriceGoalConfig,
  GoalTrackingType,
  GoalFormData,
  GoalFormErrors,
  GoalStatusInfo,
  GoalActionItem,
  LinkedScheme,
  isTimeBasedGoal,
  isPriceBasedGoal,
  isTimeAndPriceGoal,
  SUCCESS_CONFIDENCE_LABELS,
  PRIORITY_OPTIONS
} from '../types/goal.types';

// ==================== FORMATTING UTILITIES ====================

/**
 * Format currency in Indian Rupee format
 * Examples: ₹50,00,000 or ₹2.5Cr
 */
export function formatCurrency(amount: number, compact: boolean = false): string {
  if (amount === 0) return '₹0';
  
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (compact) {
    if (absAmount >= 10000000) {
      // Crores
      return `${sign}₹${(absAmount / 10000000).toFixed(2)}Cr`;
    } else if (absAmount >= 100000) {
      // Lakhs
      return `${sign}₹${(absAmount / 100000).toFixed(2)}L`;
    } else if (absAmount >= 1000) {
      // Thousands
      return `${sign}₹${(absAmount / 1000).toFixed(1)}K`;
    }
  }
  
  // Full format with Indian number system
  return `${sign}₹${absAmount.toLocaleString('en-IN')}`;
}

/**
 * Format percentage with optional decimal places
 * Examples: 12.5% or +8.3%
 */
export function formatPercentage(value: number, decimals: number = 1, showSign: boolean = false): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format deviation percentage with color coding
 */
export function formatDeviation(deviation: number): { text: string; color: string } {
  const text = formatPercentage(deviation, 1, true);
  
  let color: string;
  if (Math.abs(deviation) < 5) {
    color = '#10B981'; // Green - on track
  } else if (deviation > 0) {
    color = '#3B82F6'; // Blue - ahead
  } else {
    color = '#F59E0B'; // Orange - behind
  }
  
  return { text, color };
}

/**
 * Format date in readable format
 * Examples: "31 Dec 2040", "15 Mar 2032"
 */
export function formatDate(dateString: string, format: 'short' | 'long' = 'short'): string {
  const date = new Date(dateString);
  
  if (format === 'short') {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } else {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}

/**
 * Format months into years and months
 * Examples: "2 years 3 months", "8 months", "3 years"
 */
export function formatMonths(months: number): string {
  if (months <= 0) return 'Now';
  if (months === Infinity) return 'Not achievable';
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) {
    return `${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  } else if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? 's' : ''}`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
  }
}

/**
 * Format time remaining until target date
 * Examples: "2 years away", "8 months away", "Overdue"
 */
export function formatTimeRemaining(targetDate: string): { text: string; color: string } {
  const today = new Date();
  const target = new Date(targetDate);
  const diffTime = target.getTime() - today.getTime();
  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  
  if (diffMonths < 0) {
    return { text: 'Overdue', color: '#DC2626' };
  } else if (diffMonths < 3) {
    return { text: `${diffMonths} month${diffMonths !== 1 ? 's' : ''} away`, color: '#F59E0B' };
  } else if (diffMonths < 12) {
    return { text: `${diffMonths} months away`, color: '#10B981' };
  } else {
    const years = Math.floor(diffMonths / 12);
    return { text: `${years} year${years !== 1 ? 's' : ''} away`, color: '#10B981' };
  }
}

/**
 * Format goal type into readable label
 */
export function getGoalTypeLabel(goalType: GoalTrackingType): string {
  switch (goalType) {
    case 'time_based_goal':
      return 'Time-Based Goal';
    case 'price_based_goal':
      return 'Price-Based Goal';
    case 'time_and_price_goal':
      return 'Time & Price Goal';
    default:
      return 'Unknown Goal Type';
  }
}

/**
 * Get short description for goal type
 */
export function getGoalTypeDescription(goalType: GoalTrackingType): string {
  switch (goalType) {
    case 'time_based_goal':
      return 'Fixed timeline, flexible amount';
    case 'price_based_goal':
      return 'Fixed amount, flexible timeline';
    case 'time_and_price_goal':
      return 'Both fixed, requires monitoring';
    default:
      return '';
  }
}

/**
 * Format priority into readable label with color
 */
export function getPriorityDisplay(priority: string): { label: string; color: string } {
  const option = PRIORITY_OPTIONS.find(p => p.value === priority);
  return option ? { label: option.label, color: option.color } : { label: 'Unknown', color: '#6B7280' };
}

// ==================== STATUS HELPERS ====================

/**
 * Get goal status with color and message
 * Uses Monte Carlo results from config_data (calculated by backend)
 */
export function getGoalStatus(goal: GoalConfiguration): GoalStatusInfo {
  const config = goal.config_data;

  // Time-based goal - always on track (timeline is fixed)
  if (isTimeBasedGoal(config)) {
    return {
      status: 'on_track',
      color: '#10B981',
      icon: '📅',
      label: 'On Track',
      message: 'Timeline is fixed, accumulating corpus'
    };
  }

  // Price-based goal - check pace
  if (isPriceBasedGoal(config)) {
    const paceStatus = config.pace_status || 'on_track';

    if (paceStatus === 'ahead') {
      return {
        status: 'ahead',
        color: '#3B82F6',
        icon: '🚀',
        label: 'Ahead of Schedule',
        message: `Will reach target ${Math.abs(config.pace_variance_months || 0)} months early`
      };
    } else if (paceStatus === 'behind') {
      return {
        status: 'behind',
        color: '#F59E0B',
        icon: '⚠️',
        label: 'Behind Schedule',
        message: `May take ${config.pace_variance_months || 0} extra months`
      };
    } else {
      return {
        status: 'on_track',
        color: '#10B981',
        icon: '✓',
        label: 'On Track',
        message: 'Progressing as expected'
      };
    }
  }

  // Time & price goal - USE MONTE CARLO RESULTS DIRECTLY
  if (isTimeAndPriceGoal(config)) {
    // Read Monte Carlo results from config_data
    const onTrack = config.on_track === true;
    const probability = config.probability_of_success || 0;
    const confidence = config.success_confidence || 'medium';

    // Simple logic based on Monte Carlo on_track flag
    if (onTrack) {
      // Goal is on track (corpus_gap >= 0 && probability >= 75%)
      if (probability >= 90) {
        return {
          status: 'ahead',
          color: '#10B981',
          icon: '🚀',
          label: 'Excellent',
          message: `${probability.toFixed(0)}% probability of success`
        };
      } else {
        return {
          status: 'on_track',
          color: '#10B981',
          icon: '✓',
          label: 'On Track',
          message: `${probability.toFixed(0)}% probability of success`
        };
      }
    } else {
      // Goal is NOT on track
      if (probability < 40) {
        return {
          status: 'behind',
          color: '#DC2626',
          icon: '🚨',
          label: 'Critical',
          message: `Only ${probability.toFixed(0)}% chance. Immediate action required.`
        };
      } else if (probability < 60) {
        return {
          status: 'behind',
          color: '#F59E0B',
          icon: '⚠️',
          label: 'Behind Schedule',
          message: `${probability.toFixed(0)}% chance. Action recommended.`
        };
      } else {
        return {
          status: 'behind',
          color: '#F59E0B',
          icon: '⚠️',
          label: 'Needs Attention',
          message: `${probability.toFixed(0)}% chance. Review allocations.`
        };
      }
    }
  }

  // Unknown goal type
  return {
    status: 'unknown',
    color: '#6B7280',
    icon: '?',
    label: 'Unknown',
    message: 'Status unavailable'
  };
}

/**
 * Get recommended actions for a goal
 */
export function getGoalActions(goal: GoalConfiguration): GoalActionItem[] {
  const config = goal.config_data;
  const actions: GoalActionItem[] = [];
  
  // Only time & price goals have actionable items
  if (isTimeAndPriceGoal(config)) {
    const actionRequired = config.action_required;
    
    if (actionRequired === 'increase_sip' && config.recommended_sip_increase) {
      actions.push({
        type: 'increase_sip',
        title: 'Increase Monthly SIP',
        description: `Add ${formatCurrency(config.recommended_sip_increase, true)} to monthly investment`,
        priority: config.probability_of_success! < 50 ? 'critical' : 'high',
        actionable: true,
        recommended_value: config.recommended_sip_increase,
        icon: '💰',
        color: '#F59E0B'
      });
    }
    
    if (actionRequired === 'rebalance_portfolio') {
      actions.push({
        type: 'rebalance',
        title: 'Rebalance Portfolio',
        description: 'Adjust asset allocation to match goal risk profile',
        priority: 'medium',
        actionable: true,
        icon: '⚖️',
        color: '#3B82F6'
      });
    }
    
    if (actionRequired === 'extend_timeline' && config.recommended_timeline_extension) {
      actions.push({
        type: 'extend_timeline',
        title: 'Consider Extending Timeline',
        description: `Add ${config.recommended_timeline_extension} months to make goal achievable`,
        priority: 'medium',
        actionable: true,
        recommended_value: config.recommended_timeline_extension,
        icon: '📅',
        color: '#6B7280'
      });
    }
    
    if (actionRequired === 'reduce_target') {
      actions.push({
        type: 'reduce_target',
        title: 'Revise Target Amount',
        description: 'Current trajectory suggests lowering target is prudent',
        priority: 'low',
        actionable: true,
        icon: '🎯',
        color: '#6B7280'
      });
    }
    
    // Celebration for on-track goals
    if (config.on_track && config.probability_of_success! >= 90) {
      actions.push({
        type: 'celebrate',
        title: 'Excellent Progress!',
        description: 'Keep up the good work. Goal is well on track.',
        priority: 'low',
        actionable: false,
        icon: '🎉',
        color: '#10B981'
      });
    }
  }
  
  return actions;
}

/**
 * Get confidence level display
 */
export function getConfidenceDisplay(confidence?: string): { label: string; color: string } {
  if (!confidence) return { label: 'Unknown', color: '#6B7280' };
  
  const display = SUCCESS_CONFIDENCE_LABELS[confidence];
  return display || { label: 'Unknown', color: '#6B7280' };
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Validate goal form data
 */
export function validateGoalForm(formData: GoalFormData): { isValid: boolean; errors: GoalFormErrors } {
  const errors: GoalFormErrors = {};
  
  // Common validations
  if (!formData.goal_name || formData.goal_name.trim().length === 0) {
    errors.goal_name = 'Goal name is required';
  } else if (formData.goal_name.trim().length > 100) {
    errors.goal_name = 'Goal name must be less than 100 characters';
  }
  
  if (!formData.expected_return_rate || formData.expected_return_rate <= 0) {
    errors.expected_return_rate = 'Expected return rate must be positive';
  } else if (formData.expected_return_rate > 50) {
    errors.expected_return_rate = 'Expected return rate seems unrealistic (>50%)';
  }
  
  if (formData.monthly_contribution < 0) {
    errors.monthly_contribution = 'Monthly contribution cannot be negative';
  }
  
  if (!formData.linked_schemes || formData.linked_schemes.length === 0) {
    errors.linked_schemes = 'At least one scheme must be linked';
  } else {
    const totalAllocation = formData.linked_schemes.reduce((sum, s) => sum + s.allocation_percentage, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      errors.linked_schemes = `Allocation must sum to 100% (currently ${totalAllocation.toFixed(1)}%)`;
    }
  }
  
  // Type-specific validations
  if (formData.goal_type === 'time_based_goal') {
    if (!formData.target_date) {
      errors.target_date = 'Target date is required for time-based goals';
    } else {
      const targetDate = new Date(formData.target_date);
      const today = new Date();
      if (targetDate <= today) {
        errors.target_date = 'Target date must be in the future';
      }
    }
  }
  
  if (formData.goal_type === 'price_based_goal') {
    if (!formData.target_amount || formData.target_amount <= 0) {
      errors.target_amount = 'Target amount must be positive';
    }
  }
  
  if (formData.goal_type === 'time_and_price_goal') {
    if (!formData.target_date) {
      errors.target_date = 'Target date is required';
    } else {
      const targetDate = new Date(formData.target_date);
      const today = new Date();
      if (targetDate <= today) {
        errors.target_date = 'Target date must be in the future';
      }
    }
    
    if (!formData.target_amount || formData.target_amount <= 0) {
      errors.target_amount = 'Target amount must be positive';
    }
  }
  
  if (!formData.title || formData.title.trim().length === 0) {
    errors.title = 'Title is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate scheme allocation
 */
export function validateSchemeAllocation(schemes: LinkedScheme[]): { isValid: boolean; error?: string } {
  if (schemes.length === 0) {
    return { isValid: false, error: 'At least one scheme must be selected' };
  }
  
  const totalAllocation = schemes.reduce((sum, s) => sum + s.allocation_percentage, 0);
  
  if (Math.abs(totalAllocation - 100) > 0.01) {
    return { 
      isValid: false, 
      error: `Total allocation must be 100% (currently ${totalAllocation.toFixed(1)}%)`
    };
  }
  
  for (const scheme of schemes) {
    if (scheme.allocation_percentage <= 0) {
      return { 
        isValid: false, 
        error: `${scheme.scheme_name} must have allocation > 0%` 
      };
    }
    if (scheme.allocation_percentage > 100) {
      return { 
        isValid: false, 
        error: `${scheme.scheme_name} cannot have allocation > 100%` 
      };
    }
  }
  
  return { isValid: true };
}

// ==================== CALCULATION UTILITIES ====================

/**
 * Calculate months between two dates
 */
export function getMonthsBetweenDates(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  
  return Math.max(0, years * 12 + months);
}

/**
 * Check if goal is achievable with current parameters
 */
export function isGoalAchievable(
  targetAmount: number,
  currentValue: number,
  monthlyContribution: number,
  annualReturnRate: number,
  months: number
): { achievable: boolean; shortfall?: number } {
  const monthlyRate = annualReturnRate / 12 / 100;
  
  // Calculate future value
  const fvLumpSum = currentValue * Math.pow(1 + monthlyRate, months);
  const fvAnnuity = monthlyContribution * 
    (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * 
    (1 + monthlyRate);
  
  const projectedValue = fvLumpSum + fvAnnuity;
  
  if (projectedValue >= targetAmount) {
    return { achievable: true };
  } else {
    return { achievable: false, shortfall: targetAmount - projectedValue };
  }
}

// ==================== DISPLAY HELPERS ====================

/**
 * Generate auto-title for goal if not provided
 */
export function generateGoalTitle(
  goalType: GoalTrackingType,
  targetAmount?: number,
  targetDate?: string,
  goalName?: string
): string {
  if (goalName) {
    return goalName;
  }
  
  const typeLabel = getGoalTypeLabel(goalType);
  
  if (goalType === 'time_based_goal' && targetDate) {
    const year = new Date(targetDate).getFullYear();
    return `Retirement by ${year}`;
  }
  
  if (goalType === 'price_based_goal' && targetAmount) {
    return `Accumulate ${formatCurrency(targetAmount, true)}`;
  }
  
  if (goalType === 'time_and_price_goal' && targetAmount && targetDate) {
    const year = new Date(targetDate).getFullYear();
    return `${formatCurrency(targetAmount, true)} by ${year}`;
  }
  
  return `New ${typeLabel}`;
}

/**
 * Get icon for goal type
 */
export function getGoalTypeIcon(goalType: GoalTrackingType): string {
  switch (goalType) {
    case 'time_based_goal':
      return '📅';
    case 'price_based_goal':
      return '💰';
    case 'time_and_price_goal':
      return '🎯';
    default:
      return '📊';
  }
}

/**
 * Get color for goal type
 */
export function getGoalTypeColor(goalType: GoalTrackingType): string {
  switch (goalType) {
    case 'time_based_goal':
      return '#3B82F6'; // Blue
    case 'price_based_goal':
      return '#10B981'; // Green
    case 'time_and_price_goal':
      return '#F59E0B'; // Orange
    default:
      return '#6B7280'; // Gray
  }
}

/**
 * Sort goals by priority and status
 */
export function sortGoals(goals: GoalConfiguration[]): GoalConfiguration[] {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  
  return [...goals].sort((a, b) => {
    // First by active status
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1;
    }
    
    // Then by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    
    // Finally by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Filter goals by status
 */
export function filterGoalsByStatus(
  goals: GoalConfiguration[],
  status: 'on_track' | 'behind' | 'ahead' | 'all'
): GoalConfiguration[] {
  if (status === 'all') return goals;
  
  return goals.filter(goal => {
    const goalStatus = getGoalStatus(goal);
    return goalStatus.status === status;
  });
}