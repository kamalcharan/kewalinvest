// backend/src/services/goal.calculator.service.ts

import {
  TimeBasedGoalConfig,
  PriceBasedGoalConfig,
  TimeAndPriceGoalConfig
} from '../types/goal.types';

export class GoalCalculatorService {
  
  /**
   * Calculate Future Value of Annuity (for SIP calculations)
   */
  private calculateFutureValue(
    presentValue: number,
    monthlyPayment: number,
    annualRate: number,
    months: number
  ): number {
    const monthlyRate = annualRate / 12 / 100;
    
    // FV of lump sum
    const fvLumpSum = presentValue * Math.pow(1 + monthlyRate, months);
    
    // FV of annuity
    const fvAnnuity = monthlyPayment * 
      (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * 
      (1 + monthlyRate);
    
    return fvLumpSum + fvAnnuity;
  }

  /**
   * Calculate required monthly SIP to reach target
   */
  private calculateRequiredSIP(
    targetAmount: number,
    currentValue: number,
    months: number,
    annualRate: number
  ): number {
    const monthlyRate = annualRate / 12 / 100;
    
    // Future value of current corpus
    const fvCurrent = currentValue * Math.pow(1 + monthlyRate, months);
    
    // Amount needed from SIP
    const amountNeeded = targetAmount - fvCurrent;
    
    if (amountNeeded <= 0) return 0;
    
    // Calculate SIP
    const sip = amountNeeded / 
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate));
    
    return Math.max(0, sip);
  }

  /**
   * Calculate months to reach target amount
   * Returns a reasonable maximum (600 months = 50 years) if target cannot be reached
   */
  private calculateMonthsToTarget(
    targetAmount: number,
    currentValue: number,
    monthlySIP: number,
    annualRate: number
  ): number {
    const MAX_MONTHS = 600; // 50 years maximum
    const monthlyRate = annualRate / 12 / 100;

    // Edge case: target already reached
    if (currentValue >= targetAmount) {
      return 0;
    }

    // Edge case: no SIP and no current value - cannot reach target
    if (monthlySIP === 0 && currentValue === 0) {
      return MAX_MONTHS; // Return maximum instead of Infinity
    }

    if (monthlySIP === 0) {
      // Only growth on existing corpus
      const months = Math.log(targetAmount / currentValue) / Math.log(1 + monthlyRate);
      return Math.min(Math.ceil(months), MAX_MONTHS);
    }

    // Solve FV equation for n (using numerical approximation)
    let months = 1;
    let fv = 0;

    while (fv < targetAmount && months < MAX_MONTHS) {
      fv = this.calculateFutureValue(currentValue, monthlySIP, annualRate, months);
      if (fv >= targetAmount) break;
      months++;
    }

    return Math.min(months, MAX_MONTHS);
  }

  /**
   * Monte Carlo simulation for success probability
   */
  private monteCarloSimulation(
    currentValue: number,
    monthlySIP: number,
    targetAmount: number,
    months: number,
    expectedReturn: number,
    returnVolatility: number = 15, // Standard deviation in %
    simulations: number = 1000
  ): number {
    let successCount = 0;
    
    for (let sim = 0; sim < simulations; sim++) {
      let corpus = currentValue;
      
      for (let month = 0; month < months; month++) {
        // Random return based on normal distribution
        const randomReturn = this.normalRandom(expectedReturn / 12, returnVolatility / Math.sqrt(12));
        const monthlyReturn = randomReturn / 100;
        
        // Apply return and add SIP
        corpus = corpus * (1 + monthlyReturn) + monthlySIP;
      }
      
      if (corpus >= targetAmount) {
        successCount++;
      }
    }
    
    return (successCount / simulations) * 100;
  }

  /**
   * Generate random number from normal distribution (Box-Muller transform)
   */
  private normalRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * RECALCULATE TIME-BASED GOAL
   */
  public async recalculateTimeBasedGoal(
    config: TimeBasedGoalConfig,
    currentPortfolioValue: number
  ): Promise<Partial<TimeBasedGoalConfig>> {
    const targetDate = new Date(config.target_date);
    const today = new Date();
    const monthsRemaining = this.getMonthsDifference(today, targetDate);
    
    if (monthsRemaining <= 0) {
      return {
        projected_corpus: currentPortfolioValue,
        inflation_adjusted_corpus: currentPortfolioValue
      };
    }

    // DEPRECATED: Assumptions moved to asset types - using defaults
    const expectedReturnRate = 12; // Default return rate
    const inflationRate = 6; // Default inflation rate

    const projectedCorpus = this.calculateFutureValue(
      currentPortfolioValue,
      config.monthly_contribution,
      expectedReturnRate,
      monthsRemaining
    );

    const inflationAdjusted = projectedCorpus / Math.pow(1 + inflationRate / 100, monthsRemaining / 12);
    
    return {
      current_value: currentPortfolioValue,
      projected_corpus: Math.round(projectedCorpus),
      inflation_adjusted_corpus: Math.round(inflationAdjusted)
    };
  }

  /**
   * RECALCULATE PRICE-BASED GOAL
   */
  public async recalculatePriceBasedGoal(
    config: PriceBasedGoalConfig,
    currentPortfolioValue: number
  ): Promise<Partial<PriceBasedGoalConfig>> {
    // Ensure we have valid values
    const targetAmount = config.target_amount || 0;
    const monthlyContribution = config.monthly_contribution || 0;

    // Validation: target_amount must be positive
    if (targetAmount <= 0) {
      throw new Error('Target amount must be positive for price-based goals');
    }

    // Already achieved
    if (currentPortfolioValue >= targetAmount) {
      return {
        current_value: currentPortfolioValue,
        projected_achievement_date: new Date().toISOString().split('T')[0],
        months_to_achievement: 0,
        pace_status: 'ahead',
        pace_variance_months: 0
      };
    }

    // DEPRECATED: Assumptions moved to asset types - using defaults
    const expectedReturnRate = 12; // Default return rate

    const monthsToTarget = this.calculateMonthsToTarget(
      targetAmount,
      currentPortfolioValue,
      monthlyContribution,
      expectedReturnRate
    );

    // Ensure months is a valid, finite number
    const validMonths = Math.min(
      Math.max(0, Math.ceil(monthsToTarget)),
      600 // 50 years max
    );

    const achievementDate = new Date();
    achievementDate.setMonth(achievementDate.getMonth() + validMonths);

    // Determine pace based on contribution level
    let paceStatus: 'ahead' | 'on_track' | 'behind' = 'on_track';
    if (monthlyContribution === 0 && currentPortfolioValue === 0) {
      paceStatus = 'behind'; // No investment and no corpus
    } else if (validMonths >= 600) {
      paceStatus = 'behind'; // Taking too long to reach target
    }

    return {
      current_value: currentPortfolioValue,
      projected_achievement_date: achievementDate.toISOString().split('T')[0],
      months_to_achievement: validMonths,
      pace_status: paceStatus,
      pace_variance_months: 0 // Calculate based on previous snapshot
    };
  }

  /**
   * RECALCULATE TIME & PRICE-BASED GOAL (Most Complex)
   */
  public async recalculateTimeAndPriceGoal(
    config: TimeAndPriceGoalConfig,
    currentPortfolioValue: number
  ): Promise<Partial<TimeAndPriceGoalConfig>> {
    const targetDate = new Date(config.target_date);
    const today = new Date();
    const monthsRemaining = this.getMonthsDifference(today, targetDate);

    // Safely get current monthly SIP (default to 0 if not set)
    const currentMonthlySIP = config.current_monthly_sip || config.monthly_contribution || 0;

    if (monthsRemaining <= 0) {
      // Goal date passed
      return {
        current_value: currentPortfolioValue,
        projected_corpus: currentPortfolioValue,
        corpus_gap: currentPortfolioValue - config.target_amount,
        on_track: currentPortfolioValue >= config.target_amount,
        action_required: 'none'
      };
    }

    // DEPRECATED: Assumptions moved to asset types - using defaults
    const expectedReturnRate = 12; // Default return rate

    // Calculate required SIP
    const requiredSIP = this.calculateRequiredSIP(
      config.target_amount,
      currentPortfolioValue,
      monthsRemaining,
      expectedReturnRate
    );

    // Calculate projected corpus with current SIP
    const projectedCorpus = this.calculateFutureValue(
      currentPortfolioValue,
      currentMonthlySIP,
      expectedReturnRate,
      monthsRemaining
    );

    const corpusGap = projectedCorpus - config.target_amount;
    const progressPercentage = Math.min(100, (currentPortfolioValue / config.target_amount) * 100);
    const deviationPercentage = ((projectedCorpus - config.target_amount) / config.target_amount) * 100;

    // Monte Carlo for probability
    const probability = this.monteCarloSimulation(
      currentPortfolioValue,
      currentMonthlySIP,
      config.target_amount,
      monthsRemaining,
      expectedReturnRate
    );
    
    // Determine confidence level
    let confidence: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
    if (probability >= 90) confidence = 'very_high';
    else if (probability >= 75) confidence = 'high';
    else if (probability >= 60) confidence = 'medium';
    else if (probability >= 40) confidence = 'low';
    else confidence = 'very_low';
    
    // Determine action required
    let actionRequired: TimeAndPriceGoalConfig['action_required'] = 'none';
    let recommendedSIPIncrease: number | undefined;

    if (corpusGap < 0) {
      const sipGap = requiredSIP - currentMonthlySIP;
      if (sipGap > 0) {
        actionRequired = 'increase_sip';
        recommendedSIPIncrease = Math.ceil(sipGap);
      }
    }

    return {
      current_value: currentPortfolioValue,
      required_monthly_sip: Math.round(requiredSIP),
      current_monthly_sip: currentMonthlySIP,
      monthly_sip_gap: Math.round(requiredSIP - currentMonthlySIP),
      projected_corpus: Math.round(projectedCorpus),
      corpus_gap: Math.round(corpusGap),
      progress_percentage: Math.round(progressPercentage * 10) / 10,
      probability_of_success: Math.round(probability * 10) / 10,
      success_confidence: confidence,
      on_track: corpusGap >= 0 && probability >= 75,
      deviation_percentage: Math.round(deviationPercentage * 10) / 10,
      action_required: actionRequired,
      recommended_sip_increase: recommendedSIPIncrease
    };
  }

  /**
   * Helper: Get months difference between two dates
   */
  private getMonthsDifference(startDate: Date, endDate: Date): number {
    const years = endDate.getFullYear() - startDate.getFullYear();
    const months = endDate.getMonth() - startDate.getMonth();
    return years * 12 + months;
  }
}