// src/types/jtbd.types.ts

// Priority levels for JTBD actions
export type JTBDPriority = 'critical' | 'high' | 'medium' | 'low';

// Types of actions in JTBD framework
export type JTBDActionType = 
  | 'rebalancing' 
  | 'tax-saving' 
  | 'goal-based' 
  | 'risk-management' 
  | 'opportunity'
  | 'compliance'
  | 'review';

// Goal categories
export type JTBDGoalType = 
  | 'retirement' 
  | 'education' 
  | 'wealth-creation' 
  | 'tax-planning' 
  | 'emergency-fund'
  | 'property'
  | 'marriage'
  | 'travel'
  | 'healthcare';

// Individual action item
export interface JTBDAction {
  id: string;
  priority: JTBDPriority;
  type: JTBDActionType;
  title: string;
  description: string;
  impact?: string;
  deadline?: string;
  estimatedValue?: number;
  percentageImpact?: number;
  actionButton?: {
    label: string;
    action: string;
    enabled?: boolean;
  };
  completed?: boolean;
  completedDate?: string;
}

// Primary goal tracking
export interface JTBDGoal {
  type: JTBDGoalType;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  currentProgress: number; // percentage (0-100)
  targetDate: string;
  monthlyRequired: number;
  onTrack: boolean;
  yearsRemaining?: number;
  shortfall?: number;
}

// Risk assessment and recommendations
export interface JTBDRiskAssessment {
  currentRisk: number; // 1-10 scale
  recommendedRisk: number; // 1-10 scale
  deviation: number; // percentage deviation from ideal
  action: 'increase' | 'decrease' | 'maintain';
  riskCapacity?: number; // 1-10 scale
  riskTolerance?: number; // 1-10 scale
  message?: string;
}

// Main JTBD data structure
export interface JTBDData {
  customerId: number;
  primaryGoal: JTBDGoal;
  secondaryGoals?: JTBDGoal[];
  riskAssessment: JTBDRiskAssessment;
  actions: JTBDAction[];
  insights: string[];
  nextReview: string;
  lastReview?: string;
  overallScore?: number; // 0-100 health score
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

// JTBD filters for dashboard
export interface JTBDFilters {
  priority?: JTBDPriority[];
  actionType?: JTBDActionType[];
  goalType?: JTBDGoalType[];
  onTrackOnly?: boolean;
  hasDeadline?: boolean;
  sortBy?: 'priority' | 'deadline' | 'value' | 'impact';
  sortOrder?: 'asc' | 'desc';
}

// JTBD metrics for analytics
export interface JTBDMetrics {
  totalActions: number;
  criticalActions: number;
  highPriorityActions: number;
  completedActions: number;
  upcomingDeadlines: number;
  totalEstimatedValue: number;
  goalsOnTrack: number;
  goalsOffTrack: number;
  averageProgress: number;
}

// Customer JTBD summary for list views
export interface CustomerJTBDSummary {
  customerId: number;
  customerName: string;
  topPriority?: JTBDAction;
  actionCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  goalProgress: number;
  nextReview: string;
  overallHealth: 'excellent' | 'good' | 'fair' | 'needs-attention';
}

// Action recommendation engine output
export interface JTBDRecommendation {
  customerId: number;
  recommendationType: 'automated' | 'advisor-suggested' | 'ai-generated';
  confidence: number; // 0-100
  reasoning: string[];
  suggestedActions: JTBDAction[];
  expectedOutcome: string;
  alternativeOptions?: JTBDAction[];
}

// Progress tracking over time
export interface JTBDProgressHistory {
  date: string;
  goalProgress: number;
  completedActions: number;
  portfolioValue: number;
  riskScore: number;
}

// Integration with portfolio data
export interface JTBDPortfolioAlignment {
  isAligned: boolean;
  alignmentScore: number; // 0-100
  gaps: Array<{
    area: string;
    current: string;
    recommended: string;
    action: string;
  }>;
  opportunities: Array<{
    type: string;
    description: string;
    potentialValue: number;
  }>;
}