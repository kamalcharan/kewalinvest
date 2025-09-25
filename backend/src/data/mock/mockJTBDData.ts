// src/data/mock/mockJTBDData.ts

export type JTBDPriority = 'critical' | 'high' | 'medium' | 'low';
export type JTBDActionType = 'rebalancing' | 'tax-saving' | 'goal-based' | 'risk-management' | 'opportunity';
export type JTBDGoalType = 'retirement' | 'education' | 'wealth-creation' | 'tax-planning' | 'emergency-fund';

export interface JTBDAction {
  id: string;
  priority: JTBDPriority;
  type: JTBDActionType;
  title: string;
  description: string;
  impact?: string;
  deadline?: string;
  estimatedValue?: number;
  actionButton?: {
    label: string;
    action: string;
  };
}

export interface JTBDData {
  customerId: number;
  primaryGoal: {
    type: JTBDGoalType;
    name: string;
    targetAmount: number;
    currentProgress: number; // percentage
    targetDate: string;
    monthlyRequired: number;
    onTrack: boolean;
  };
  riskAssessment: {
    currentRisk: number; // 1-10
    recommendedRisk: number; // 1-10
    deviation: number; // percentage deviation from ideal
    action: 'increase' | 'decrease' | 'maintain';
  };
  actions: JTBDAction[];
  insights: string[];
  nextReview: string;
}

export const mockJTBDData: Record<number, JTBDData> = {
  1: {
    customerId: 1,
    primaryGoal: {
      type: 'retirement',
      name: 'Retirement Planning',
      targetAmount: 50000000,
      currentProgress: 42,
      targetDate: '2045-12-31',
      monthlyRequired: 85000,
      onTrack: true
    },
    riskAssessment: {
      currentRisk: 6.5,
      recommendedRisk: 6.0,
      deviation: 8.3,
      action: 'decrease'
    },
    actions: [
      {
        id: 'jtbd-1-1',
        priority: 'high',
        type: 'rebalancing',
        title: 'Portfolio Rebalancing Required',
        description: 'Equity allocation is 8% above target. Consider booking profits.',
        impact: 'Reduce risk by 12% while maintaining returns',
        estimatedValue: 185000,
        actionButton: {
          label: 'Rebalance Now',
          action: 'rebalance'
        }
      },
      {
        id: 'jtbd-1-2',
        priority: 'medium',
        type: 'tax-saving',
        title: 'Tax Saving Opportunity',
        description: 'Invest ₹50,000 in ELSS to maximize 80C benefits',
        impact: 'Save ₹15,600 in taxes',
        deadline: '2025-03-31',
        estimatedValue: 15600,
        actionButton: {
          label: 'Invest in ELSS',
          action: 'invest-elss'
        }
      },
      {
        id: 'jtbd-1-3',
        priority: 'low',
        type: 'goal-based',
        title: 'SIP Top-up Recommendation',
        description: 'Increase SIP by ₹5,000 to stay on track for retirement goal',
        impact: 'Reach goal 2 years earlier',
        estimatedValue: 2400000,
        actionButton: {
          label: 'Increase SIP',
          action: 'modify-sip'
        }
      }
    ],
    insights: [
      'Portfolio has outperformed benchmark by 3.2% this year',
      'Current trajectory will achieve retirement goal 6 months ahead',
      'Consider adding gold allocation for better diversification'
    ],
    nextReview: '2025-01-15'
  },
  2: {
    customerId: 2,
    primaryGoal: {
      type: 'wealth-creation',
      name: 'Wealth Accumulation',
      targetAmount: 10000000,
      currentProgress: 18,
      targetDate: '2035-12-31',
      monthlyRequired: 45000,
      onTrack: false
    },
    riskAssessment: {
      currentRisk: 8.2,
      recommendedRisk: 7.0,
      deviation: 17.1,
      action: 'decrease'
    },
    actions: [
      {
        id: 'jtbd-2-1',
        priority: 'critical',
        type: 'risk-management',
        title: 'High Risk Alert',
        description: 'Portfolio concentrated in small-cap funds. Immediate diversification needed.',
        impact: 'Reduce potential loss by 35%',
        actionButton: {
          label: 'Diversify Portfolio',
          action: 'diversify'
        }
      },
      {
        id: 'jtbd-2-2',
        priority: 'high',
        type: 'rebalancing',
        title: 'Switch from Underperformers',
        description: 'Two funds consistently underperforming. Consider switching.',
        impact: 'Improve returns by 4-6% annually',
        estimatedValue: 95000,
        actionButton: {
          label: 'Review Funds',
          action: 'switch-funds'
        }
      },
      {
        id: 'jtbd-2-3',
        priority: 'medium',
        type: 'goal-based',
        title: 'Goal Realignment Needed',
        description: 'Current investments not aligned with wealth creation timeline',
        impact: 'Get back on track for 2035 target',
        actionButton: {
          label: 'Realign Strategy',
          action: 'realign-goal'
        }
      }
    ],
    insights: [
      'Portfolio volatility 40% higher than market average',
      'Need additional ₹15,000 monthly SIP to meet goal',
      'Recent market correction impacted small-cap holdings severely'
    ],
    nextReview: '2024-12-20'
  },
  3: {
    customerId: 3,
    primaryGoal: {
      type: 'education',
      name: 'Children Education Fund',
      targetAmount: 25000000,
      currentProgress: 68,
      targetDate: '2032-06-01',
      monthlyRequired: 55000,
      onTrack: true
    },
    riskAssessment: {
      currentRisk: 4.5,
      recommendedRisk: 5.5,
      deviation: -18.2,
      action: 'increase'
    },
    actions: [
      {
        id: 'jtbd-3-1',
        priority: 'medium',
        type: 'opportunity',
        title: 'Increase Equity Exposure',
        description: 'Conservative allocation may impact long-term goals. Consider adding equity.',
        impact: 'Potentially increase returns by 3-4% annually',
        estimatedValue: 210000,
        actionButton: {
          label: 'Add Equity Funds',
          action: 'add-equity'
        }
      },
      {
        id: 'jtbd-3-2',
        priority: 'low',
        type: 'tax-saving',
        title: 'HUF Tax Benefits Available',
        description: 'Create HUF to save additional ₹25,000 in taxes',
        impact: 'Annual tax saving of ₹25,000',
        deadline: '2025-03-31',
        estimatedValue: 25000,
        actionButton: {
          label: 'Learn More',
          action: 'huf-info'
        }
      }
    ],
    insights: [
      'Education inflation considered at 10% - on track',
      'Conservative approach ensuring capital protection',
      'Consider Sukanya Samriddhi for additional tax benefits'
    ],
    nextReview: '2025-02-01'
  },
  4: {
    customerId: 4,
    primaryGoal: {
      type: 'emergency-fund',
      name: 'Emergency Corpus',
      targetAmount: 600000,
      currentProgress: 145,
      targetDate: '2024-12-31',
      monthlyRequired: 0,
      onTrack: true
    },
    riskAssessment: {
      currentRisk: 7.8,
      recommendedRisk: 7.5,
      deviation: 4.0,
      action: 'maintain'
    },
    actions: [
      {
        id: 'jtbd-4-1',
        priority: 'high',
        type: 'goal-based',
        title: 'Emergency Fund Exceeded',
        description: 'Emergency fund goal achieved. Consider new investment goals.',
        impact: 'Optimize surplus funds for better returns',
        estimatedValue: 270000,
        actionButton: {
          label: 'Set New Goal',
          action: 'new-goal'
        }
      },
      {
        id: 'jtbd-4-2',
        priority: 'medium',
        type: 'opportunity',
        title: 'Start Retirement Planning',
        description: 'Age 28 - Perfect time to start retirement corpus',
        impact: 'Accumulate ₹5Cr by age 60',
        actionButton: {
          label: 'Plan Retirement',
          action: 'retirement-planning'
        }
      }
    ],
    insights: [
      'Excellent savings discipline - 145% of emergency goal achieved',
      'Ready for aggressive wealth creation strategies',
      'Consider international diversification'
    ],
    nextReview: '2025-01-10'
  },
  5: {
    customerId: 5,
    primaryGoal: {
      type: 'tax-planning',
      name: 'Tax Optimization',
      targetAmount: 500000,
      currentProgress: 72,
      targetDate: '2025-03-31',
      monthlyRequired: 35000,
      onTrack: true
    },
    riskAssessment: {
      currentRisk: 6.0,
      recommendedRisk: 6.0,
      deviation: 0,
      action: 'maintain'
    },
    actions: [
      {
        id: 'jtbd-5-1',
        priority: 'high',
        type: 'tax-saving',
        title: 'Complete 80C Investment',
        description: 'Invest remaining ₹40,000 for full 80C benefit',
        impact: 'Save ₹12,480 in taxes',
        deadline: '2025-03-31',
        estimatedValue: 12480,
        actionButton: {
          label: 'Invest Now',
          action: 'invest-80c'
        }
      },
      {
        id: 'jtbd-5-2',
        priority: 'medium',
        type: 'tax-saving',
        title: 'NPS Tier-1 for 80CCD(1B)',
        description: 'Additional ₹50,000 deduction available under 80CCD(1B)',
        impact: 'Save ₹15,600 extra in taxes',
        deadline: '2025-03-31',
        estimatedValue: 15600,
        actionButton: {
          label: 'Open NPS Account',
          action: 'open-nps'
        }
      }
    ],
    insights: [
      'Optimal asset allocation achieved',
      'Tax-efficient portfolio structure in place',
      'Consider tax harvesting for LTCG optimization'
    ],
    nextReview: '2025-01-05'
  }
};

// Generate simplified JTBD data for remaining customers
for (let i = 6; i <= 20; i++) {
  const goalTypes: JTBDGoalType[] = ['retirement', 'education', 'wealth-creation', 'tax-planning', 'emergency-fund'];
  const selectedGoal = goalTypes[Math.floor(Math.random() * goalTypes.length)];
  const progress = Math.floor(Math.random() * 100);
  const onTrack = progress > 40;
  
  mockJTBDData[i] = {
    customerId: i,
    primaryGoal: {
      type: selectedGoal,
      name: selectedGoal.charAt(0).toUpperCase() + selectedGoal.slice(1).replace('-', ' '),
      targetAmount: Math.floor(Math.random() * 50000000) + 1000000,
      currentProgress: progress,
      targetDate: `20${35 + Math.floor(Math.random() * 15)}-12-31`,
      monthlyRequired: Math.floor(Math.random() * 100000) + 10000,
      onTrack: onTrack
    },
    riskAssessment: {
      currentRisk: Number((Math.random() * 9 + 1).toFixed(1)),
      recommendedRisk: Number((Math.random() * 9 + 1).toFixed(1)),
      deviation: Number((Math.random() * 30 - 15).toFixed(1)),
      action: ['increase', 'decrease', 'maintain'][Math.floor(Math.random() * 3)] as any
    },
    actions: [
      {
        id: `jtbd-${i}-1`,
        priority: onTrack ? 'medium' : 'high',
        type: 'rebalancing',
        title: onTrack ? 'Regular Review Due' : 'Urgent Action Required',
        description: onTrack 
          ? 'Quarterly portfolio review recommended' 
          : 'Portfolio needs immediate attention',
        impact: `Improve returns by ${Math.floor(Math.random() * 5 + 1)}%`,
        actionButton: {
          label: 'Review Now',
          action: 'review'
        }
      },
      {
        id: `jtbd-${i}-2`,
        priority: 'medium',
        type: 'tax-saving',
        title: 'Tax Planning Opportunity',
        description: `Save up to ₹${Math.floor(Math.random() * 50000 + 10000)} in taxes`,
        deadline: '2025-03-31',
        estimatedValue: Math.floor(Math.random() * 50000 + 10000),
        actionButton: {
          label: 'Explore Options',
          action: 'tax-options'
        }
      }
    ],
    insights: [
      `Portfolio ${onTrack ? 'performing well' : 'needs attention'}`,
      `${onTrack ? 'On track' : 'Behind'} for primary goal`,
      'Regular monitoring recommended'
    ],
    nextReview: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`
  };
}