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

export interface JTBDGoal {
  type: JTBDGoalType;
  name: string;
  targetAmount: number;
  currentProgress: number;
  targetDate: string;
  monthlyRequired: number;
  onTrack: boolean;
}

export interface JTBDRiskAssessment {
  currentRisk: number;
  recommendedRisk: number;
  deviation: number;
  action: 'increase' | 'decrease' | 'maintain';
}

export interface JTBDData {
  customerId: number;
  primaryGoal: JTBDGoal;
  riskAssessment: JTBDRiskAssessment;
  actions: JTBDAction[];
  insights: string[];
  nextReview: string;
  detailedAnalysis?: {
    strengthAreas: string[];
    improvementAreas: string[];
    peerComparison?: {
      percentile: number;
      message: string;
      avgPeerReturns: number;
      yourReturns: number;
    };
  };
  recommendations?: Array<{
    title: string;
    description: string;
    potentialSaving?: number;
    expectedImpact?: string;
    urgency?: string;
    priority: string;
    complexity: string;
  }>;
  upcomingEvents?: Array<{
    date: string;
    event: string;
    action?: string;
    amount?: number;
  }>;
}

export const mockJTBDData: Record<number, JTBDData> = {};

// Helper function to generate random JTBD data
const generateJTBDData = (customerId: number): JTBDData => {
  const goalTypes: JTBDGoalType[] = ['retirement', 'education', 'wealth-creation', 'tax-planning', 'emergency-fund'];
  const selectedGoal = goalTypes[Math.floor(Math.random() * goalTypes.length)];
  const progress = Math.floor(Math.random() * 100);
  const onTrack = progress > 40;
  const hasHighPriority = Math.random() > 0.5;
  const returns = Number((Math.random() * 20 + 5).toFixed(1));
  const avgPeerReturns = Number((Math.random() * 15 + 7).toFixed(1));
  
  const priorities: JTBDPriority[] = ['critical', 'high', 'medium', 'low'];
  const actionTypes: JTBDActionType[] = ['rebalancing', 'tax-saving', 'goal-based', 'risk-management', 'opportunity'];
  
  const numActions = Math.floor(Math.random() * 4) + 2; // 2-5 actions
  const actions: JTBDAction[] = [];
  
  for (let i = 0; i < numActions; i++) {
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    
    let title = '';
    let description = '';
    let impact = '';
    
    switch (actionType) {
      case 'rebalancing':
        title = progress > 70 ? 'Portfolio Review Due' : 'Urgent Rebalancing Required';
        description = 'Portfolio allocation has drifted from target. Rebalancing recommended.';
        impact = `Optimize returns by ${Math.floor(Math.random() * 5 + 2)}%`;
        break;
      case 'tax-saving':
        title = 'Tax Planning Opportunity';
        description = `Invest ₹${Math.floor(Math.random() * 100000 + 50000)} to maximize tax benefits`;
        impact = `Save ₹${Math.floor(Math.random() * 30000 + 10000)} in taxes`;
        break;
      case 'goal-based':
        title = onTrack ? 'Goal on Track' : 'Goal Adjustment Needed';
        description = onTrack 
          ? 'Continue current SIP to maintain trajectory'
          : `Increase SIP by ₹${Math.floor(Math.random() * 10000 + 5000)} to stay on track`;
        impact = onTrack ? 'Maintain goal timeline' : 'Get back on track';
        break;
      case 'risk-management':
        title = 'Risk Alignment Check';
        description = 'Portfolio risk level needs adjustment based on market conditions';
        impact = 'Reduce portfolio volatility';
        break;
      case 'opportunity':
        title = 'Investment Opportunity';
        description = 'Market conditions favorable for additional investment';
        impact = `Potential upside of ${Math.floor(Math.random() * 10 + 5)}%`;
        break;
    }
    
    actions.push({
      id: `jtbd-${customerId}-${i + 1}`,
      priority,
      type: actionType,
      title,
      description,
      impact,
      deadline: Math.random() > 0.5 ? `2025-0${Math.floor(Math.random() * 3) + 1}-${Math.floor(Math.random() * 28) + 1}` : undefined,
      estimatedValue: Math.random() > 0.3 ? Math.floor(Math.random() * 200000 + 20000) : undefined,
      actionButton: {
        label: actionType === 'tax-saving' ? 'Invest Now' : 'Review Details',
        action: `action-${actionType}`
      }
    });
  }
  
  // Sort actions by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  const targetYear = 2030 + Math.floor(Math.random() * 20);
  const monthlyRequired = Math.floor(Math.random() * 100000 + 15000);
  const targetAmount = monthlyRequired * 12 * (targetYear - 2025) * 1.5;
  
  return {
    customerId,
    primaryGoal: {
      type: selectedGoal,
      name: selectedGoal
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      targetAmount,
      currentProgress: progress,
      targetDate: `${targetYear}-12-31`,
      monthlyRequired,
      onTrack
    },
    riskAssessment: {
      currentRisk: Number((Math.random() * 4 + 4).toFixed(1)),
      recommendedRisk: Number((Math.random() * 4 + 4).toFixed(1)),
      deviation: Number((Math.random() * 30 - 15).toFixed(1)),
      action: ['increase', 'decrease', 'maintain'][Math.floor(Math.random() * 3)] as any
    },
    actions,
    insights: [
      onTrack 
        ? 'Portfolio performance is meeting expectations'
        : 'Portfolio needs attention to meet goals',
      `Current returns: ${returns}% vs peer average: ${avgPeerReturns}%`,
      hasHighPriority 
        ? 'Multiple high-priority actions pending'
        : 'Regular monitoring recommended'
    ],
    nextReview: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    detailedAnalysis: Math.random() > 0.3 ? {
      strengthAreas: [
        'Consistent investment discipline maintained',
        onTrack ? 'Portfolio aligned with goals' : 'Diversification strategy in place',
        'Good risk-adjusted returns'
      ],
      improvementAreas: [
        !onTrack ? 'Goal tracking needs improvement' : 'Consider international diversification',
        'Tax optimization opportunities available',
        'Regular rebalancing recommended'
      ],
      peerComparison: {
        percentile: Math.floor(Math.random() * 40 + 40),
        message: returns > avgPeerReturns 
          ? 'Outperforming peer group'
          : 'Performing in line with peers',
        avgPeerReturns,
        yourReturns: returns
      }
    } : undefined,
    recommendations: Math.random() > 0.5 ? [
      {
        title: 'Portfolio Rebalancing',
        description: 'Realign portfolio to target allocation',
        expectedImpact: 'Optimize risk-return profile',
        priority: hasHighPriority ? 'high' : 'medium',
        complexity: 'easy'
      },
      {
        title: 'Tax Harvesting',
        description: 'Book losses to offset capital gains',
        potentialSaving: Math.floor(Math.random() * 50000 + 10000),
        priority: 'medium',
        complexity: 'medium'
      }
    ] : undefined,
    upcomingEvents: Math.random() > 0.4 ? [
      {
        date: `2025-${String(Math.floor(Math.random() * 3) + 1).padStart(2, '0')}-15`,
        event: 'Quarterly Portfolio Review',
        action: 'Schedule call with advisor'
      },
      {
        date: `2025-02-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        event: 'SIP Due',
        amount: monthlyRequired
      },
      {
        date: '2025-03-31',
        event: 'Tax Planning Deadline',
        action: 'Complete 80C investments'
      }
    ] : undefined
  };
};

// Generate data for customers 269-298 (30 customers)
for (let i = 269; i <= 298; i++) {
  mockJTBDData[i] = generateJTBDData(i);
}

// Add a few detailed examples for customers 269-273
mockJTBDData[269] = {
  customerId: 269,
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
      id: 'jtbd-269-1',
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
      id: 'jtbd-269-2',
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
      id: 'jtbd-269-3',
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
  nextReview: '2025-01-15',
  detailedAnalysis: {
    strengthAreas: [
      'Consistent SIP discipline maintained for 4+ years',
      'Well-diversified across market caps',
      'Emergency fund fully funded (6 months expenses)'
    ],
    improvementAreas: [
      'Over-concentrated in equity (65% vs 60% target)',
      'No international diversification',
      'Tax harvesting opportunities not utilized'
    ],
    peerComparison: {
      percentile: 78,
      message: 'Portfolio performing better than 78% of similar investors',
      avgPeerReturns: 10.2,
      yourReturns: 13.9
    }
  },
  recommendations: [
    {
      title: 'Tax Loss Harvesting',
      description: 'Book losses in underperforming debt funds to offset gains',
      potentialSaving: 18500,
      priority: 'high',
      complexity: 'easy'
    },
    {
      title: 'Add Gold ETF',
      description: '5-10% allocation to Gold ETFs for portfolio stability',
      expectedImpact: 'Reduce portfolio volatility by 15%',
      priority: 'medium',
      complexity: 'easy'
    }
  ],
  upcomingEvents: [
    { date: '2025-01-15', event: 'Quarterly Portfolio Review', action: 'Schedule call with advisor' },
    { date: '2025-02-10', event: 'SIP Due - HDFC Top 100', amount: 25000 },
    { date: '2025-03-31', event: 'Tax Planning Deadline', action: 'Invest ₹50,000 for 80C' }
  ]
};

mockJTBDData[270] = {
  customerId: 270,
  primaryGoal: {
    type: 'wealth-creation',
    name: 'Wealth Accumulation',
    targetAmount: 10000000,
    currentProgress: 58,
    targetDate: '2035-12-31',
    monthlyRequired: 45000,
    onTrack: true
  },
  riskAssessment: {
    currentRisk: 7.2,
    recommendedRisk: 7.0,
    deviation: 2.8,
    action: 'maintain'
  },
  actions: [
    {
      id: 'jtbd-270-1',
      priority: 'medium',
      type: 'opportunity',
      title: 'Market Opportunity',
      description: 'Market correction presents buying opportunity in quality funds',
      impact: 'Potential upside of 15-20%',
      estimatedValue: 150000,
      actionButton: {
        label: 'Explore Options',
        action: 'opportunities'
      }
    },
    {
      id: 'jtbd-270-2',
      priority: 'low',
      type: 'tax-saving',
      title: 'Year-end Tax Planning',
      description: 'Additional ₹50,000 investment can save taxes',
      impact: 'Save ₹15,600 in taxes',
      deadline: '2025-03-31',
      estimatedValue: 15600,
      actionButton: {
        label: 'Plan Taxes',
        action: 'tax-planning'
      }
    }
  ],
  insights: [
    'Wealth creation goal on track - excellent progress',
    'Portfolio well-diversified across asset classes',
    'Continue current investment strategy'
  ],
  nextReview: '2025-02-01'
};

mockJTBDData[271] = {
  customerId: 271,
  primaryGoal: {
    type: 'education',
    name: 'Children Education Fund',
    targetAmount: 25000000,
    currentProgress: 35,
    targetDate: '2032-06-01',
    monthlyRequired: 75000,
    onTrack: false
  },
  riskAssessment: {
    currentRisk: 5.5,
    recommendedRisk: 6.5,
    deviation: -15.4,
    action: 'increase'
  },
  actions: [
    {
      id: 'jtbd-271-1',
      priority: 'critical',
      type: 'goal-based',
      title: 'Goal Gap Alert',
      description: 'Current investments insufficient to meet education goal',
      impact: 'Need ₹25,000 additional monthly SIP',
      actionButton: {
        label: 'Adjust Strategy',
        action: 'adjust-goal'
      }
    },
    {
      id: 'jtbd-271-2',
      priority: 'high',
      type: 'risk-management',
      title: 'Increase Equity Exposure',
      description: 'Conservative allocation limiting growth potential',
      impact: 'Improve returns by 3-4% annually',
      estimatedValue: 500000,
      actionButton: {
        label: 'Rebalance Portfolio',
        action: 'rebalance'
      }
    }
  ],
  insights: [
    'Education goal requires immediate attention',
    'Consider increasing SIP or adjusting timeline',
    'Education inflation at 10% - factor in rising costs'
  ],
  nextReview: '2025-01-05'
};

console.log(`Mock JTBD data generated for customers 269-298 (${Object.keys(mockJTBDData).length} total)`);