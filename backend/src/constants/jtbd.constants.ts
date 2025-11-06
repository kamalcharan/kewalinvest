// backend/src/constants/jtbd.constants.ts
// JTBD (Jobs To Be Done) Constants - Centralized taxonomy for all action tracking

// ============================================================================
// JTBD CATEGORIES - High-level grouping
// ============================================================================

export const JTBD_CATEGORY = {
  TRANSACTIONAL: 'transactional',  // Tracks state/data (goals, portfolio tracking)
  ALERT: 'alert',                   // Reminds about actions (SIPs, time-based, profile)
  MEETING: 'meeting',               // Meeting scheduling and tracking
} as const;

export type JTBDCategory = typeof JTBD_CATEGORY[keyof typeof JTBD_CATEGORY];

// ============================================================================
// JTBD TYPES - Specific type within each category
// ============================================================================

export const JTBD_TYPE = {
  // Transactional Types (State Tracking)
  GOAL_TRACKING: 'goal_tracking',

  // Alert Types (Action Reminders)
  PORTFOLIO_ALERT: 'portfolio_alert',      // Generic SIP/SWP alerts
  TIME_BASED: 'time_based',                // Date-based reminders
  PROFILE_TRIGGER: 'profile_trigger',      // Birthday/anniversary
  GOAL_SIP_PLAN: 'goal_sip_plan',          // SIP instances linked to goals

  // Meeting Types
  CLIENT_MEETING: 'client_meeting',
  PORTFOLIO_REVIEW: 'portfolio_review',
  GOAL_REVIEW: 'goal_review',
} as const;

export type JTBDType = typeof JTBD_TYPE[keyof typeof JTBD_TYPE];

// ============================================================================
// EXECUTION STATUS - For t_jtbd_executions table
// ============================================================================

export const EXECUTION_STATUS = {
  PLANNED: 'planned',           // Scheduled for future
  DUE: 'due',                   // Due today
  COMPLETED: 'completed',       // Successfully executed
  NOT_EXECUTED: 'not_executed', // Missed/skipped
  DELAYED: 'delayed',           // Executed but late
  FAILED: 'failed',             // Attempted but failed
  CANCELLED: 'cancelled',       // Cancelled by user
} as const;

export type ExecutionStatus = typeof EXECUTION_STATUS[keyof typeof EXECUTION_STATUS];

// ============================================================================
// PRIORITY LEVELS
// ============================================================================

export const JTBD_PRIORITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type JTBDPriority = typeof JTBD_PRIORITY[keyof typeof JTBD_PRIORITY];

// ============================================================================
// FREQUENCY OPTIONS (for portfolio alerts, SIPs)
// ============================================================================

export const JTBD_FREQUENCY = {
  DAILY: 'daily',
  FORTNIGHTLY: 'fortnightly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
  NA: 'NA',
} as const;

export type JTBDFrequency = typeof JTBD_FREQUENCY[keyof typeof JTBD_FREQUENCY];

// ============================================================================
// UI LABELS - Display names for frontend
// ============================================================================

export const JTBD_CATEGORY_LABELS = {
  [JTBD_CATEGORY.TRANSACTIONAL]: 'Goal Tracking',
  [JTBD_CATEGORY.ALERT]: 'Alerts & Reminders',
  [JTBD_CATEGORY.MEETING]: 'Meetings',
} as const;

export const JTBD_TYPE_LABELS = {
  // Transactional
  [JTBD_TYPE.GOAL_TRACKING]: 'Goal Tracking',

  // Alerts
  [JTBD_TYPE.PORTFOLIO_ALERT]: 'Portfolio Alert',
  [JTBD_TYPE.TIME_BASED]: 'Time-Based Reminder',
  [JTBD_TYPE.PROFILE_TRIGGER]: 'Profile Event',
  [JTBD_TYPE.GOAL_SIP_PLAN]: 'Goal SIP Plan',

  // Meetings
  [JTBD_TYPE.CLIENT_MEETING]: 'Client Meeting',
  [JTBD_TYPE.PORTFOLIO_REVIEW]: 'Portfolio Review',
  [JTBD_TYPE.GOAL_REVIEW]: 'Goal Review',
} as const;

export const EXECUTION_STATUS_LABELS = {
  [EXECUTION_STATUS.PLANNED]: 'Planned',
  [EXECUTION_STATUS.DUE]: 'Due',
  [EXECUTION_STATUS.COMPLETED]: 'Completed',
  [EXECUTION_STATUS.NOT_EXECUTED]: 'Not Executed',
  [EXECUTION_STATUS.DELAYED]: 'Delayed',
  [EXECUTION_STATUS.FAILED]: 'Failed',
  [EXECUTION_STATUS.CANCELLED]: 'Cancelled',
} as const;

export const PRIORITY_LABELS = {
  [JTBD_PRIORITY.CRITICAL]: 'Critical',
  [JTBD_PRIORITY.HIGH]: 'High',
  [JTBD_PRIORITY.MEDIUM]: 'Medium',
  [JTBD_PRIORITY.LOW]: 'Low',
} as const;

// ============================================================================
// UI COLORS - Type-based card colors for frontend
// ============================================================================

export const JTBD_TYPE_COLORS = {
  // Transactional
  [JTBD_TYPE.GOAL_TRACKING]: {
    bg: '#E0F2FE',        // Light blue
    border: '#0EA5E9',    // Sky blue
    text: '#075985',      // Dark sky blue
  },

  // Alerts
  [JTBD_TYPE.PORTFOLIO_ALERT]: {
    bg: '#F3E8FF',        // Light purple
    border: '#A855F7',    // Purple
    text: '#6B21A8',      // Dark purple
  },
  [JTBD_TYPE.TIME_BASED]: {
    bg: '#FEF3C7',        // Light yellow
    border: '#F59E0B',    // Amber
    text: '#92400E',      // Dark amber
  },
  [JTBD_TYPE.PROFILE_TRIGGER]: {
    bg: '#FCE7F3',        // Light pink
    border: '#EC4899',    // Pink
    text: '#9F1239',      // Dark pink
  },
  [JTBD_TYPE.GOAL_SIP_PLAN]: {
    bg: '#D1FAE5',        // Light green
    border: '#10B981',    // Green
    text: '#065F46',      // Dark green
  },

  // Meetings
  [JTBD_TYPE.CLIENT_MEETING]: {
    bg: '#DBEAFE',        // Light blue
    border: '#3B82F6',    // Blue
    text: '#1E40AF',      // Dark blue
  },
  [JTBD_TYPE.PORTFOLIO_REVIEW]: {
    bg: '#E0E7FF',        // Light indigo
    border: '#6366F1',    // Indigo
    text: '#3730A3',      // Dark indigo
  },
  [JTBD_TYPE.GOAL_REVIEW]: {
    bg: '#FEE2E2',        // Light red
    border: '#EF4444',    // Red
    text: '#991B1B',      // Dark red
  },
} as const;

// ============================================================================
// STATUS COLORS - For status badges
// ============================================================================

export const EXECUTION_STATUS_COLORS = {
  [EXECUTION_STATUS.PLANNED]: {
    bg: '#E5E7EB',        // Gray
    text: '#374151',
  },
  [EXECUTION_STATUS.DUE]: {
    bg: '#FEF3C7',        // Yellow
    text: '#92400E',
  },
  [EXECUTION_STATUS.COMPLETED]: {
    bg: '#D1FAE5',        // Green
    text: '#065F46',
  },
  [EXECUTION_STATUS.NOT_EXECUTED]: {
    bg: '#FEE2E2',        // Red
    text: '#991B1B',
  },
  [EXECUTION_STATUS.DELAYED]: {
    bg: '#FFEDD5',        // Orange
    text: '#9A3412',
  },
  [EXECUTION_STATUS.FAILED]: {
    bg: '#FEE2E2',        // Red
    text: '#991B1B',
  },
  [EXECUTION_STATUS.CANCELLED]: {
    bg: '#F3F4F6',        // Light gray
    text: '#6B7280',
  },
} as const;

// ============================================================================
// ICONS - For UI cards and lists
// ============================================================================

export const JTBD_TYPE_ICONS = {
  // Transactional
  [JTBD_TYPE.GOAL_TRACKING]: '🎯',

  // Alerts
  [JTBD_TYPE.PORTFOLIO_ALERT]: '📊',
  [JTBD_TYPE.TIME_BASED]: '⏰',
  [JTBD_TYPE.PROFILE_TRIGGER]: '🎂',
  [JTBD_TYPE.GOAL_SIP_PLAN]: '💰',

  // Meetings
  [JTBD_TYPE.CLIENT_MEETING]: '👥',
  [JTBD_TYPE.PORTFOLIO_REVIEW]: '📈',
  [JTBD_TYPE.GOAL_REVIEW]: '🎯',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get category for a given JTBD type
 */
export const getCategoryForType = (type: JTBDType): JTBDCategory => {
  switch (type) {
    case JTBD_TYPE.GOAL_TRACKING:
      return JTBD_CATEGORY.TRANSACTIONAL;

    case JTBD_TYPE.PORTFOLIO_ALERT:
    case JTBD_TYPE.TIME_BASED:
    case JTBD_TYPE.PROFILE_TRIGGER:
    case JTBD_TYPE.GOAL_SIP_PLAN:
      return JTBD_CATEGORY.ALERT;

    case JTBD_TYPE.CLIENT_MEETING:
    case JTBD_TYPE.PORTFOLIO_REVIEW:
    case JTBD_TYPE.GOAL_REVIEW:
      return JTBD_CATEGORY.MEETING;

    default:
      return JTBD_CATEGORY.ALERT;
  }
};

/**
 * Get all types for a given category
 */
export const getTypesForCategory = (category: JTBDCategory): JTBDType[] => {
  switch (category) {
    case JTBD_CATEGORY.TRANSACTIONAL:
      return [JTBD_TYPE.GOAL_TRACKING];

    case JTBD_CATEGORY.ALERT:
      return [
        JTBD_TYPE.PORTFOLIO_ALERT,
        JTBD_TYPE.TIME_BASED,
        JTBD_TYPE.PROFILE_TRIGGER,
        JTBD_TYPE.GOAL_SIP_PLAN,
      ];

    case JTBD_CATEGORY.MEETING:
      return [
        JTBD_TYPE.CLIENT_MEETING,
        JTBD_TYPE.PORTFOLIO_REVIEW,
        JTBD_TYPE.GOAL_REVIEW,
      ];

    default:
      return [];
  }
};

/**
 * Check if a type belongs to executions table
 */
export const isExecutionType = (type: JTBDType): boolean => {
  return type === JTBD_TYPE.GOAL_SIP_PLAN ||
         getCategoryForType(type) === JTBD_CATEGORY.MEETING;
};
