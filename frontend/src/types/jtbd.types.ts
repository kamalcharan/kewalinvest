// frontend/src/types/jtbd.types.ts

// ============================================
// CORE JTBD TYPES (Aligned with Backend)
// ============================================

export type JTBDType = 'portfolio_alert' | 'time_based' | 'profile_trigger' | 'goal_tracking';
export type JTBDPriority = 'critical' | 'high' | 'medium' | 'low';
export type JTBDFrequency = 'daily' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | 'NA';

// Portfolio Alert Configuration
export interface PortfolioAlertConfig {
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
  txn_type_id: number;
  txn_type: string;
  frequency: JTBDFrequency;
  day_of_month?: number;
  deviation_days: number;
  amount: number;
  track_till_months: number;
}

// Time-Based Alert Configuration
export interface TimeBasedConfig {
  alert_date: number; // Day of month (1-31)
  alert_month: number; // Month (1-12)
  is_recurring: boolean;
}

// Profile Trigger Configuration
export interface ProfileTriggerConfig {
  trigger_type: 'birthday' | 'anniversary';
  days_before: number;
}

// Main JTBD Configuration (matches backend exactly)
export interface JTBDConfiguration {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  jtbd_type: JTBDType;
  title: string;
  description?: string;
  priority: JTBDPriority;
  is_active: boolean;
  config_data: PortfolioAlertConfig | TimeBasedConfig | ProfileTriggerConfig;
  next_alert_date?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Create JTBD Request
export interface CreateJTBDRequest {
  customer_id: number;
  jtbd_type: JTBDType;
  title?: string;
  description?: string;
  priority?: JTBDPriority;
  config_data: PortfolioAlertConfig | TimeBasedConfig | ProfileTriggerConfig;
}

// Update JTBD Request
export interface UpdateJTBDRequest {
  title?: string;
  description?: string;
  priority?: JTBDPriority;
  is_active?: boolean;
  config_data?: PortfolioAlertConfig | TimeBasedConfig | ProfileTriggerConfig;
}

// JTBD List Response
export interface JTBDListResponse {
  jtbds: JTBDConfiguration[];
  total: number;
}

// Dashboard Statistics (matches backend exactly)
export interface JTBDDashboardStats {
  total: number;
  by_type: {
    portfolio_alert: number;
    time_based: number;
    profile_trigger: number;
  };
  by_priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  active_count: number;
  customers_without_jtbd: number;
}

// Customer JTBD Summary (matches backend exactly)
export interface CustomerJTBDSummary {
  customer_id: number;
  jtbd_count: number;
  jtbd_setup_status: 'not_setup' | 'active';
  next_alert_date?: string;
  critical_count: number;
  high_count?: number;
  active_count?: number;
}

// Calculated Alert Instance (for portfolio occurrences)
export interface CalculatedAlertInstance {
  occurrence_date: string;
  occurrence_number: number;
  within_range: boolean;
  amount: number;
}

// Customer Scheme (for dropdown)
export interface CustomerScheme {
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
}

// Transaction Type (for dropdown)
export interface TransactionType {
  id: number;
  txn_code: string;
  txn_name: string;
  txn_type: 'Addition' | 'Deduction';
}

// ============================================
// LEGACY TYPES (For future features)
// ============================================

export type JTBDActionType = 
  | 'rebalancing' 
  | 'tax-saving' 
  | 'goal-based' 
  | 'risk-management' 
  | 'opportunity'
  | 'compliance'
  | 'review';

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

export interface JTBDGoal {
  type: JTBDGoalType;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  currentProgress: number;
  targetDate: string;
  monthlyRequired: number;
  onTrack: boolean;
  yearsRemaining?: number;
  shortfall?: number;
}

export interface JTBDRiskAssessment {
  currentRisk: number;
  recommendedRisk: number;
  deviation: number;
  action: 'increase' | 'decrease' | 'maintain';
  riskCapacity?: number;
  riskTolerance?: number;
  message?: string;
}

export interface JTBDData {
  customerId: number;
  primaryGoal: JTBDGoal;
  secondaryGoals?: JTBDGoal[];
  riskAssessment: JTBDRiskAssessment;
  actions: JTBDAction[];
  insights: string[];
  nextReview: string;
  lastReview?: string;
  overallScore?: number;
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

export interface JTBDFilters {
  priority?: JTBDPriority[];
  actionType?: JTBDActionType[];
  goalType?: JTBDGoalType[];
  onTrackOnly?: boolean;
  hasDeadline?: boolean;
  sortBy?: 'priority' | 'deadline' | 'value' | 'impact';
  sortOrder?: 'asc' | 'desc';
}

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

export interface JTBDRecommendation {
  customerId: number;
  recommendationType: 'automated' | 'advisor-suggested' | 'ai-generated';
  confidence: number;
  reasoning: string[];
  suggestedActions: JTBDAction[];
  expectedOutcome: string;
  alternativeOptions?: JTBDAction[];
}

export interface JTBDProgressHistory {
  date: string;
  goalProgress: number;
  completedActions: number;
  portfolioValue: number;
  riskScore: number;
}

export interface JTBDPortfolioAlignment {
  isAligned: boolean;
  alignmentScore: number;
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

// ==================== DASHBOARD TYPES ====================

// Communication Types
export type CommunicationStatus = 'pending' | 'scheduled' | 'sent' | 'failed' | 'cancelled';
export type CommunicationChannel = 'email' | 'whatsapp' | 'sms';

// Extended JTBD with Communication Data
export interface JTBDWithCommunication extends JTBDConfiguration {
  customer_name: string;
  customer_email?: string;
  customer_mobile?: string;
  
  // Communication fields (DUMMY DATA for now)
  communication_status: CommunicationStatus;
  communication_channel: CommunicationChannel;
  communication_sent_at?: string;
  communication_scheduled_at?: string;
  communication_read?: boolean;
  communication_clicked?: boolean;
  communication_error?: string;
}

// Dashboard Alert (lightweight)
export interface DashboardAlert {
  id: number;
  title: string;
  customer_id: number;
  customer_name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  jtbd_type: 'portfolio_alert' | 'time_based' | 'profile_trigger';
  next_alert_date: string;
  communication_status: CommunicationStatus;
}

// Alerts grouped by date
export interface AlertsByDate {
  alert_date: string;
  alert_count: number;
  alerts: DashboardAlert[];
}

// Timeline view types
export type TimeBucket = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later';

export interface GroupedAlerts {
  bucket: TimeBucket;
  label: string;
  icon: string;
  color: string;
  count: number;
  alerts: JTBDWithCommunication[];
}