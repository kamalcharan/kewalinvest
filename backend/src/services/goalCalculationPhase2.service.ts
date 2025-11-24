// backend/src/services/goalCalculationPhase2.service.ts
// Phase 2: Goal calculation service based on investment plans

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  GoalCalculationResult,
  GoalInvestmentAllocation,
  GoalWithCalculations,
  GoalWithdrawal
} from '../types/goal.types';
import { GoalInvestmentAllocationService } from './goalInvestmentAllocation.service';

export class GoalCalculationPhase2Service {
  private db: Pool;
  private allocationService: GoalInvestmentAllocationService;

  constructor() {
    this.db = pool;
    this.allocationService = new GoalInvestmentAllocationService();
  }

  /**
   * Calculate current value of an investment plan
   */
  private calculateInvestmentCurrentValue(
    investment: any,
    asOfDate: Date = new Date()
  ): number {
    const {
      principal_amount,
      start_date,
      has_started,
      duration_months,
      duration_years,
      investment_type,
      recurring_amount,
      investment_frequency,
      custom_assumption_rate,
      default_assumption_rate
    } = investment;

    // If investment hasn't started, current value is 0
    if (!has_started) {
      return 0;
    }

    const startDate = new Date(start_date);
    const monthsElapsed = this.getMonthsDifference(startDate, asOfDate);

    if (monthsElapsed <= 0) {
      return 0;
    }

    // Use custom rate if available, otherwise default
    const annualRate = custom_assumption_rate || default_assumption_rate;
    const monthlyRate = annualRate / 100 / 12;

    if (investment_type === 'one_time') {
      // Compound interest: FV = PV * (1 + r)^n
      return principal_amount * Math.pow(1 + monthlyRate, monthsElapsed);
    } else if (investment_type === 'sip' || investment_type === 'recurring') {
      // Future value of annuity + principal
      // FV = PMT * [((1 + r)^n - 1) / r]
      const monthlyInvestment = recurring_amount || 0;

      // Calculate frequency multiplier
      let paymentsPerYear = 12;
      if (investment_frequency === 'quarterly') paymentsPerYear = 4;
      else if (investment_frequency === 'yearly') paymentsPerYear = 1;

      const totalPayments = Math.floor(monthsElapsed / (12 / paymentsPerYear));

      if (totalPayments === 0) {
        return principal_amount;
      }

      // Adjust rate for payment frequency
      const effectiveRate = annualRate / 100 / paymentsPerYear;

      // Future value of periodic payments
      const sipFV = monthlyInvestment * ((Math.pow(1 + effectiveRate, totalPayments) - 1) / effectiveRate) * (1 + effectiveRate);

      // Future value of initial principal
      const principalFV = principal_amount * Math.pow(1 + monthlyRate, monthsElapsed);

      return sipFV + principalFV;
    }

    return principal_amount;
  }

  /**
   * Calculate goal progress
   */
  async calculateGoalProgress(
    tenantId: number,
    isLive: boolean,
    goalId: number
  ): Promise<GoalCalculationResult> {
    // Get goal details from t_jtbd_configurations
    const goalQuery = `
      SELECT
        id, title, config_data
      FROM t_jtbd_configurations
      WHERE id = $1
        AND tenant_id = $2
        AND is_live = $3
        AND jtbd_category = 'transactional'
        AND is_active = true
    `;

    const goalResult = await this.db.query(goalQuery, [goalId, tenantId, isLive]);

    if (goalResult.rows.length === 0) {
      throw new Error('Goal not found');
    }

    const goal = goalResult.rows[0];
    const configData = goal.config_data;

    // Extract target amount and date from config
    const targetAmount = configData.target_amount || 0;
    const targetDate = configData.target_date ? new Date(configData.target_date) : null;

    if (!targetAmount || !targetDate) {
      throw new Error('Goal must have target_amount and target_date');
    }

    // Get all investment allocations for this goal
    const allocations = await this.allocationService.getAllocationsForGoal(
      tenantId,
      isLive,
      goalId
    );

    // Calculate current amount from all allocated investments
    let currentAmount = 0;
    const assetBreakdown: Record<string, number> = {};

    for (const allocation of allocations) {
      if (allocation.investment_plan) {
        const investmentValue = this.calculateInvestmentCurrentValue(allocation.investment_plan);
        const allocatedValue = investmentValue * (allocation.allocated_percentage / 100);

        currentAmount += allocatedValue;

        // Track by asset type
        const assetType = allocation.investment_plan.asset_type_name;
        assetBreakdown[assetType] = (assetBreakdown[assetType] || 0) + allocatedValue;
      }
    }

    // Calculate progress percentage
    const progressPercentage = (currentAmount / targetAmount) * 100;

    // Calculate time remaining
    const now = new Date();
    const timeRemainingMonths = this.getMonthsDifference(now, targetDate);

    // Project future value at target date
    const projectedAmount = await this.projectFutureValue(
      allocations,
      targetDate
    );

    // Calculate shortfall or surplus
    const shortfallSurplus = projectedAmount - targetAmount;

    // Determine if on track
    const isOnTrack = projectedAmount >= targetAmount;

    // Calculate weighted average return rate from asset allocations
    const weightedReturnRate = this.calculateWeightedReturnRate(allocations);

    // Extract withdrawals from config
    const withdrawals = configData.withdrawals || [];

    // Calculate monthly SIP required to reach target (with withdrawals)
    const monthlyRequired = this.calculateRequiredMonthlySIPWithWithdrawals(
      currentAmount,
      targetAmount,
      timeRemainingMonths,
      weightedReturnRate,
      withdrawals,
      targetDate
    );

    // Calculate risk level based on asset allocation
    const riskLevel = this.calculateRiskLevel(assetBreakdown);

    return {
      goal_id: goalId,
      current_amount: Math.round(currentAmount),
      progress_percentage: Math.round(progressPercentage * 100) / 100,
      projected_amount: Math.round(projectedAmount),
      monthly_sip_required: Math.round(monthlyRequired),
      is_on_track: isOnTrack,
      risk_level: riskLevel,
      time_remaining_months: Math.max(0, timeRemainingMonths),
      projected_completion_date: isOnTrack ? this.calculateProjectedCompletionDate(currentAmount, targetAmount, monthlyRequired, 8) : null,
      shortfall_surplus: Math.round(shortfallSurplus)
    };
  }

  /**
   * Project future value at target date
   */
  private async projectFutureValue(
    allocations: GoalInvestmentAllocation[],
    targetDate: Date
  ): Promise<number> {
    let totalProjected = 0;

    for (const allocation of allocations) {
      if (allocation.investment_plan) {
        const futureValue = this.calculateInvestmentCurrentValue(
          allocation.investment_plan,
          targetDate
        );
        const allocatedValue = futureValue * (allocation.allocated_percentage / 100);
        totalProjected += allocatedValue;
      }
    }

    return totalProjected;
  }

  /**
   * Calculate required monthly SIP
   */
  private calculateRequiredMonthlySIP(
    currentAmount: number,
    targetAmount: number,
    monthsRemaining: number,
    annualReturnRate: number
  ): number {
    if (monthsRemaining <= 0) {
      return 0;
    }

    const shortfall = targetAmount - currentAmount;
    if (shortfall <= 0) {
      return 0;
    }

    const monthlyRate = annualReturnRate / 100 / 12;

    // PMT = FV * r / ((1 + r)^n - 1)
    const required = shortfall * monthlyRate / (Math.pow(1 + monthlyRate, monthsRemaining) - 1);

    return required;
  }

  /**
   * Calculate risk level based on asset allocation
   */
  private calculateRiskLevel(
    assetBreakdown: Record<string, number>
  ): 'low' | 'medium' | 'high' {
    const total = Object.values(assetBreakdown).reduce((sum, val) => sum + val, 0);

    if (total === 0) {
      return 'medium';
    }

    // Calculate equity exposure
    const equityAssets = ['Mutual Fund', 'Equity', 'NPS'];
    const equityValue = equityAssets.reduce((sum, asset) => {
      return sum + (assetBreakdown[asset] || 0);
    }, 0);

    const equityPercentage = (equityValue / total) * 100;

    if (equityPercentage >= 70) {
      return 'high';
    } else if (equityPercentage >= 40) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Calculate projected completion date
   */
  private calculateProjectedCompletionDate(
    currentAmount: number,
    targetAmount: number,
    monthlySIP: number,
    annualReturnRate: number
  ): string | null {
    if (monthlySIP === 0) {
      return null;
    }

    const monthlyRate = annualReturnRate / 100 / 12;
    const shortfall = targetAmount - currentAmount;

    // Solve for n: FV = PMT * [((1 + r)^n - 1) / r]
    // n = log(1 + (FV * r / PMT)) / log(1 + r)
    const months = Math.log(1 + (shortfall * monthlyRate / monthlySIP)) / Math.log(1 + monthlyRate);

    const projectedDate = new Date();
    projectedDate.setMonth(projectedDate.getMonth() + Math.ceil(months));

    return projectedDate.toISOString().split('T')[0];
  }

  /**
   * Get months difference between two dates
   */
  private getMonthsDifference(startDate: Date, endDate: Date): number {
    const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthsDiff = endDate.getMonth() - startDate.getMonth();
    return yearsDiff * 12 + monthsDiff;
  }

  /**
   * Get asset breakdown for a goal
   */
  async getAssetBreakdown(
    tenantId: number,
    isLive: boolean,
    goalId: number
  ): Promise<Record<string, number>> {
    const allocations = await this.allocationService.getAllocationsForGoal(
      tenantId,
      isLive,
      goalId
    );

    const assetBreakdown: Record<string, number> = {};

    for (const allocation of allocations) {
      if (allocation.investment_plan) {
        const investmentValue = this.calculateInvestmentCurrentValue(allocation.investment_plan);
        const allocatedValue = investmentValue * (allocation.allocated_percentage / 100);

        const assetType = allocation.investment_plan.asset_type_name;
        assetBreakdown[assetType] = (assetBreakdown[assetType] || 0) + allocatedValue;
      }
    }

    return assetBreakdown;
  }

  /**
   * Calculate weighted average return rate from asset allocations
   */
  private calculateWeightedReturnRate(allocations: GoalInvestmentAllocation[]): number {
    if (allocations.length === 0) {
      return 8; // Default fallback rate
    }

    let totalValue = 0;
    let weightedSum = 0;

    for (const allocation of allocations) {
      if (allocation.investment_plan) {
        const investmentValue = this.calculateInvestmentCurrentValue(allocation.investment_plan);
        const allocatedValue = investmentValue * (allocation.allocated_percentage / 100);

        // Use custom rate if available, otherwise default
        const rate = allocation.investment_plan.custom_assumption_rate ||
                    allocation.investment_plan.default_assumption_rate;

        totalValue += allocatedValue;
        weightedSum += allocatedValue * rate;
      }
    }

    if (totalValue === 0) {
      return 8; // Default fallback rate
    }

    return weightedSum / totalValue;
  }

  /**
   * Calculate required monthly SIP with withdrawals factored in
   */
  private calculateRequiredMonthlySIPWithWithdrawals(
    currentAmount: number,
    targetAmount: number,
    timeRemainingMonths: number,
    annualReturnRate: number,
    withdrawals: GoalWithdrawal[],
    targetDate: Date
  ): number {
    if (timeRemainingMonths <= 0) {
      return 0;
    }

    const monthlyRate = annualReturnRate / 100 / 12;

    // Calculate total amount needed considering withdrawals
    let adjustedTarget = targetAmount;
    const now = new Date();

    // For each withdrawal, calculate its present value and add to target
    for (const withdrawal of withdrawals) {
      const withdrawalDate = new Date(withdrawal.withdrawal_date);
      const monthsToWithdrawal = this.getMonthsDifference(now, withdrawalDate);

      if (monthsToWithdrawal > 0) {
        // Discount withdrawal amount to present value and add to target
        // We need more money to account for withdrawals
        const monthsAfterWithdrawal = this.getMonthsDifference(withdrawalDate, targetDate);

        // The withdrawal amount needs to grow after being withdrawn
        // So we need to have accumulated it by the withdrawal date
        adjustedTarget += withdrawal.amount / Math.pow(1 + monthlyRate, monthsAfterWithdrawal);
      }
    }

    // Standard SIP calculation with adjusted target
    const futureValueFactor = Math.pow(1 + monthlyRate, timeRemainingMonths);
    const numerator = (adjustedTarget - currentAmount * futureValueFactor) * monthlyRate;
    const denominator = futureValueFactor - 1;

    if (denominator === 0) {
      return 0;
    }

    return Math.max(0, numerator / denominator);
  }
}
