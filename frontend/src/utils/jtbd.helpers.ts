// frontend/src/utils/jtbd.helpers.ts

import { JTBDWithCommunication, CommunicationStatus, TimeBucket, GroupedAlerts } from '../types/jtbd.types';

/**
 * Format date for display
 */
export const formatAlertDate = (dateString?: string): string => {
  if (!dateString) return 'Not scheduled';
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Check if today
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }

  // Check if tomorrow
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }

  // Check if within next 7 days
  const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil > 0 && daysUntil <= 7) {
    return `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
  }

  // Check if overdue
  if (daysUntil < 0) {
    return `${Math.abs(daysUntil)} days ago`;
  }

  // Format as date
  return date.toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Calculate days until alert date
 */
export const getDaysUntilAlert = (dateString?: string): number => {
  if (!dateString) return Infinity;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const alertDate = new Date(dateString);
  alertDate.setHours(0, 0, 0, 0);
  
  return Math.ceil((alertDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Get priority color
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical': return '#DC2626';
    case 'high': return '#F97316';
    case 'medium': return '#F59E0B';
    case 'low': return '#10B981';
    default: return '#6B7280';
  }
};

/**
 * Get communication status color
 */
export const getCommStatusColor = (status: CommunicationStatus): string => {
  switch (status) {
    case 'pending': return '#F59E0B';
    case 'scheduled': return '#3B82F6';
    case 'sent': return '#10B981';
    case 'failed': return '#EF4444';
    case 'cancelled': return '#6B7280';
    default: return '#6B7280';
  }
};

/**
 * Get channel icon emoji
 */
export const getChannelIcon = (channel: string): string => {
  switch (channel) {
    case 'email': return '📧';
    case 'whatsapp': return '💬';
    case 'sms': return '📱';
    default: return '📮';
  }
};

/**
 * Get JTBD type label
 */
export const getJTBDTypeLabel = (type: string): string => {
  switch (type) {
    case 'portfolio_alert': return 'Portfolio Alert';
    case 'time_based': return 'Time-Based';
    case 'profile_trigger': return 'Profile Trigger';
    default: return type;
  }
};

/**
 * Filter alerts by communication status
 */
export const filterByCommStatus = (
  alerts: JTBDWithCommunication[],
  status?: CommunicationStatus
): JTBDWithCommunication[] => {
  if (!status) return alerts;
  return alerts.filter(alert => alert.communication_status === status);
};

/**
 * Filter alerts by priority
 */
export const filterByPriority = (
  alerts: JTBDWithCommunication[],
  priority?: string
): JTBDWithCommunication[] => {
  if (!priority) return alerts;
  return alerts.filter(alert => alert.priority === priority);
};

/**
 * Sort alerts by next alert date
 */
export const sortByAlertDate = (
  alerts: JTBDWithCommunication[],
  ascending: boolean = true
): JTBDWithCommunication[] => {
  return [...alerts].sort((a, b) => {
    const dateA = a.next_alert_date ? new Date(a.next_alert_date).getTime() : Infinity;
    const dateB = b.next_alert_date ? new Date(b.next_alert_date).getTime() : Infinity;
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

/**
 * Group alerts by date
 */
export const groupAlertsByDate = (
  alerts: JTBDWithCommunication[]
): Map<string, JTBDWithCommunication[]> => {
  const grouped = new Map<string, JTBDWithCommunication[]>();
  
  alerts.forEach(alert => {
    if (!alert.next_alert_date) return;
    
    const dateKey = new Date(alert.next_alert_date).toISOString().split('T')[0];
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(alert);
  });
  
  return grouped;
};

/**
 * Calculate dashboard statistics
 */
export const calculateDashboardStats = (alerts: JTBDWithCommunication[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    total: alerts.length,
    critical: alerts.filter(a => a.priority === 'critical').length,
    today: alerts.filter(a => {
      if (!a.next_alert_date) return false;
      const alertDate = new Date(a.next_alert_date);
      alertDate.setHours(0, 0, 0, 0);
      return alertDate.getTime() === today.getTime();
    }).length,
    overdue: alerts.filter(a => {
      if (!a.next_alert_date) return false;
      return new Date(a.next_alert_date) < today;
    }).length,
    scheduled: alerts.filter(a => a.communication_status === 'scheduled').length,
    sent: alerts.filter(a => a.communication_status === 'sent').length,
  };
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(2)}K`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

/**
 * Get date range for filter
 */
export const getDateRange = (range: 'today' | '7days' | '30days' | 'overdue'): { start: Date; end: Date } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (range) {
    case 'today':
      return { start: today, end: today };
    case '7days':
      const sevenDays = new Date(today);
      sevenDays.setDate(sevenDays.getDate() + 7);
      return { start: today, end: sevenDays };
    case '30days':
      const thirtyDays = new Date(today);
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return { start: today, end: thirtyDays };
    case 'overdue':
      const pastDate = new Date(today);
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      return { start: pastDate, end: today };
    default:
      return { start: today, end: today };
  }
};

/**
 * TIMELINE VIEW HELPERS
 */

/**
 * Determine which time bucket an alert belongs to
 */
export const getTimeBucketForAlert = (dateString?: string): TimeBucket => {
  if (!dateString) return 'later';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const alertDate = new Date(dateString);
  alertDate.setHours(0, 0, 0, 0);
  
  const daysUntil = Math.ceil((alertDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Overdue
  if (daysUntil < 0) {
    return 'overdue';
  }
  
  // Today
  if (daysUntil === 0) {
    return 'today';
  }
  
  // Tomorrow
  if (daysUntil === 1) {
    return 'tomorrow';
  }
  
  // This week (2-7 days)
  if (daysUntil >= 2 && daysUntil <= 7) {
    return 'this_week';
  }
  
  // Later (8+ days)
  return 'later';
};

/**
 * Get metadata for a time bucket
 */
export const getTimeBucketMeta = (bucket: TimeBucket): { label: string; icon: string; color: string } => {
  switch (bucket) {
    case 'overdue':
      return { label: 'OVERDUE', icon: '🔴', color: '#DC2626' };
    case 'today':
      return { label: 'TODAY', icon: '📍', color: '#F97316' };
    case 'tomorrow':
      return { label: 'TOMORROW', icon: '⚡', color: '#F59E0B' };
    case 'this_week':
      return { label: 'THIS WEEK', icon: '📅', color: '#3B82F6' };
    case 'later':
      return { label: 'LATER', icon: '📆', color: '#6B7280' };
    default:
      return { label: 'UNKNOWN', icon: '📋', color: '#6B7280' };
  }
};

/**
 * Group alerts by time buckets for timeline view
 */
export const groupAlertsByTimeBucket = (
  alerts: JTBDWithCommunication[]
): GroupedAlerts[] => {
  // Initialize buckets
  const buckets: Record<TimeBucket, JTBDWithCommunication[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    this_week: [],
    later: []
  };
  
  // Group alerts into buckets
  alerts.forEach(alert => {
    const bucket = getTimeBucketForAlert(alert.next_alert_date);
    buckets[bucket].push(alert);
  });
  
  // Convert to GroupedAlerts array with metadata
  const bucketOrder: TimeBucket[] = ['overdue', 'today', 'tomorrow', 'this_week', 'later'];
  
  return bucketOrder.map(bucket => {
    const meta = getTimeBucketMeta(bucket);
    return {
      bucket,
      label: meta.label,
      icon: meta.icon,
      color: meta.color,
      count: buckets[bucket].length,
      alerts: buckets[bucket].sort((a, b) => {
        // Sort by priority first (critical > high > medium > low)
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Then by date (earliest first)
        if (a.next_alert_date && b.next_alert_date) {
          return new Date(a.next_alert_date).getTime() - new Date(b.next_alert_date).getTime();
        }
        
        return 0;
      })
    };
  });
  // REMOVED: .filter(group => group.count > 0); 
  // Now returns ALL buckets, even empty ones
};