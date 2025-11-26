// frontend/src/constants/jtbd.constants.ts
// JTBD (Jobs To Be Done) Constants - Frontend (matches backend)

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
  IMPORT_NOTIFICATION: 'import_notification', // Auto-generated from transaction imports

  // Meeting Types
  CLIENT_MEETING: 'client_meeting',
  PORTFOLIO_REVIEW: 'portfolio_review',
  GOAL_REVIEW: 'goal_review',
} as const;

export type JTBDType = typeof JTBD_TYPE[keyof typeof JTBD_TYPE];

// ============================================================================
// EXECUTION STATUS - For executions (meetings, SIP plans)
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
// UI LABELS - Display names
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
  [JTBD_TYPE.IMPORT_NOTIFICATION]: 'Import Notification',

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

export const FREQUENCY_LABELS = {
  [JTBD_FREQUENCY.DAILY]: 'Daily',
  [JTBD_FREQUENCY.FORTNIGHTLY]: 'Fortnightly',
  [JTBD_FREQUENCY.MONTHLY]: 'Monthly',
  [JTBD_FREQUENCY.QUARTERLY]: 'Quarterly',
  [JTBD_FREQUENCY.YEARLY]: 'Yearly',
  [JTBD_FREQUENCY.NA]: 'N/A',
} as const;

// ============================================================================
// UI COLORS - Tailwind classes for cards
// ============================================================================

export const JTBD_TYPE_COLORS = {
  // Transactional
  [JTBD_TYPE.GOAL_TRACKING]: {
    bg: 'bg-sky-50',
    border: 'border-sky-500',
    text: 'text-sky-900',
    badge: 'bg-sky-100 text-sky-800',
  },

  // Alerts
  [JTBD_TYPE.PORTFOLIO_ALERT]: {
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    text: 'text-purple-900',
    badge: 'bg-purple-100 text-purple-800',
  },
  [JTBD_TYPE.TIME_BASED]: {
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-800',
  },
  [JTBD_TYPE.PROFILE_TRIGGER]: {
    bg: 'bg-pink-50',
    border: 'border-pink-500',
    text: 'text-pink-900',
    badge: 'bg-pink-100 text-pink-800',
  },
  [JTBD_TYPE.GOAL_SIP_PLAN]: {
    bg: 'bg-green-50',
    border: 'border-green-500',
    text: 'text-green-900',
    badge: 'bg-green-100 text-green-800',
  },
  [JTBD_TYPE.IMPORT_NOTIFICATION]: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-500',
    text: 'text-cyan-900',
    badge: 'bg-cyan-100 text-cyan-800',
  },

  // Meetings
  [JTBD_TYPE.CLIENT_MEETING]: {
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    text: 'text-blue-900',
    badge: 'bg-blue-100 text-blue-800',
  },
  [JTBD_TYPE.PORTFOLIO_REVIEW]: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-500',
    text: 'text-indigo-900',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  [JTBD_TYPE.GOAL_REVIEW]: {
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-900',
    badge: 'bg-red-100 text-red-800',
  },
} as const;

// ============================================================================
// STATUS COLORS - For status badges
// ============================================================================

export const EXECUTION_STATUS_COLORS = {
  [EXECUTION_STATUS.PLANNED]: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    dot: 'bg-gray-400',
  },
  [EXECUTION_STATUS.DUE]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    dot: 'bg-yellow-500',
  },
  [EXECUTION_STATUS.COMPLETED]: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    dot: 'bg-green-500',
  },
  [EXECUTION_STATUS.NOT_EXECUTED]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    dot: 'bg-red-500',
  },
  [EXECUTION_STATUS.DELAYED]: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    dot: 'bg-orange-500',
  },
  [EXECUTION_STATUS.FAILED]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    dot: 'bg-red-500',
  },
  [EXECUTION_STATUS.CANCELLED]: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
} as const;

// ============================================================================
// PRIORITY COLORS
// ============================================================================

export const PRIORITY_COLORS = {
  [JTBD_PRIORITY.CRITICAL]: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    dot: 'bg-red-600',
  },
  [JTBD_PRIORITY.HIGH]: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    dot: 'bg-orange-600',
  },
  [JTBD_PRIORITY.MEDIUM]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    dot: 'bg-yellow-600',
  },
  [JTBD_PRIORITY.LOW]: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    dot: 'bg-blue-600',
  },
} as const;

// ============================================================================
// ICONS - Emoji icons for UI
// ============================================================================

export const JTBD_TYPE_ICONS = {
  // Transactional
  [JTBD_TYPE.GOAL_TRACKING]: '🎯',

  // Alerts
  [JTBD_TYPE.PORTFOLIO_ALERT]: '📊',
  [JTBD_TYPE.TIME_BASED]: '⏰',
  [JTBD_TYPE.PROFILE_TRIGGER]: '🎂',
  [JTBD_TYPE.GOAL_SIP_PLAN]: '💰',
  [JTBD_TYPE.IMPORT_NOTIFICATION]: '📥',

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
    case JTBD_TYPE.IMPORT_NOTIFICATION:
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
        JTBD_TYPE.IMPORT_NOTIFICATION,
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
 * Check if a type belongs to executions
 */
export const isExecutionType = (type: JTBDType): boolean => {
  return type === JTBD_TYPE.GOAL_SIP_PLAN ||
         getCategoryForType(type) === JTBD_CATEGORY.MEETING;
};

/**
 * Get relative date label (for timeline grouping)
 */
export const getRelativeDateLabel = (date: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return 'This Week';
  if (diffDays <= 30) return 'This Month';
  return 'Later';
};

/**
 * Format date for display
 */
export const formatJTBDDate = (date: string): string => {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Get days until/since date
 */
export const getDaysFromNow = (date: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};
