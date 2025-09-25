// src/hooks/useJTBDData.ts

import { useState, useEffect, useMemo } from 'react';
import { JTBDData, JTBDFilters, JTBDMetrics, CustomerJTBDSummary } from '../types/jtbd.types';
import { mockJTBDData } from '../data/mock/mockJTBDData';

interface UseJTBDDataOptions {
  customerId?: number;
  filters?: JTBDFilters;
  includeMetrics?: boolean;
}

interface UseJTBDDataReturn {
  jtbd: JTBDData | null;
  jtbdList: JTBDData[];
  metrics: JTBDMetrics | null;
  summaries: CustomerJTBDSummary[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useJTBDData = (options: UseJTBDDataOptions = {}): UseJTBDDataReturn => {
  const { customerId, filters, includeMetrics = false } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState(Date.now());

  // Simulate API call delay
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [customerId, lastFetch]);

  // Get single JTBD data
  const jtbd = useMemo(() => {
    if (!customerId) return null;
    return mockJTBDData[customerId] || null;
  }, [customerId]);

  // Get filtered JTBD list
  const jtbdList = useMemo(() => {
    let result = Object.values(mockJTBDData);
    
    if (!filters) return result;
    
    // Apply filters
    if (filters.priority && filters.priority.length > 0) {
      result = result.filter(j => 
        j.actions.some(a => filters.priority!.includes(a.priority))
      );
    }
    
    if (filters.actionType && filters.actionType.length > 0) {
      result = result.filter(j =>
        j.actions.some(a => filters.actionType!.includes(a.type))
      );
    }
    
    if (filters.goalType && filters.goalType.length > 0) {
      result = result.filter(j => filters.goalType!.includes(j.primaryGoal.type));
    }
    
    if (filters.onTrackOnly) {
      result = result.filter(j => j.primaryGoal.onTrack);
    }
    
    if (filters.hasDeadline) {
      result = result.filter(j => 
        j.actions.some(a => a.deadline !== undefined)
      );
    }
    
    // Apply sorting
    if (filters.sortBy) {
      result.sort((a, b) => {
        switch (filters.sortBy) {
          case 'priority': {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const aPriority = Math.min(...a.actions.map(act => priorityOrder[act.priority]));
            const bPriority = Math.min(...b.actions.map(act => priorityOrder[act.priority]));
            return filters.sortOrder === 'asc' ? aPriority - bPriority : bPriority - aPriority;
          }
          case 'deadline': {
            const aDeadline = a.actions
              .filter(act => act.deadline)
              .map(act => new Date(act.deadline!).getTime())
              .sort()[0] || Infinity;
            const bDeadline = b.actions
              .filter(act => act.deadline)
              .map(act => new Date(act.deadline!).getTime())
              .sort()[0] || Infinity;
            return filters.sortOrder === 'asc' ? aDeadline - bDeadline : bDeadline - aDeadline;
          }
          case 'value': {
            const aValue = a.actions.reduce((sum, act) => sum + (act.estimatedValue || 0), 0);
            const bValue = b.actions.reduce((sum, act) => sum + (act.estimatedValue || 0), 0);
            return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
          }
          case 'impact': {
            const aProgress = a.primaryGoal.currentProgress;
            const bProgress = b.primaryGoal.currentProgress;
            return filters.sortOrder === 'asc' ? aProgress - bProgress : bProgress - aProgress;
          }
          default:
            return 0;
        }
      });
    }
    
    return result;
  }, [filters]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!includeMetrics) return null;
    
    const allJTBD = Object.values(mockJTBDData);
    
    let totalActions = 0;
    let criticalActions = 0;
    let highPriorityActions = 0;
    let completedActions = 0;
    let upcomingDeadlines = 0;
    let totalEstimatedValue = 0;
    let goalsOnTrack = 0;
    let goalsOffTrack = 0;
    let totalProgress = 0;
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    allJTBD.forEach(jtbd => {
      jtbd.actions.forEach(action => {
        totalActions++;
        if (action.priority === 'critical') criticalActions++;
        if (action.priority === 'critical' || action.priority === 'high') highPriorityActions++;
        // Skip completed check as it's optional in our current implementation
        if (action.deadline && new Date(action.deadline) <= thirtyDaysFromNow) upcomingDeadlines++;
        totalEstimatedValue += action.estimatedValue || 0;
      });
      
      if (jtbd.primaryGoal.onTrack) goalsOnTrack++;
      else goalsOffTrack++;
      
      totalProgress += jtbd.primaryGoal.currentProgress;
    });
    
    return {
      totalActions,
      criticalActions,
      highPriorityActions,
      completedActions,
      upcomingDeadlines,
      totalEstimatedValue,
      goalsOnTrack,
      goalsOffTrack,
      averageProgress: totalProgress / allJTBD.length
    };
  }, [includeMetrics]);

  // Generate customer summaries
  const summaries = useMemo(() => {
    return Object.values(mockJTBDData).map(jtbd => {
      const actionCount = {
        critical: jtbd.actions.filter(a => a.priority === 'critical').length,
        high: jtbd.actions.filter(a => a.priority === 'high').length,
        medium: jtbd.actions.filter(a => a.priority === 'medium').length,
        low: jtbd.actions.filter(a => a.priority === 'low').length
      };
      
      let overallHealth: CustomerJTBDSummary['overallHealth'];
      if (actionCount.critical > 0 || !jtbd.primaryGoal.onTrack) {
        overallHealth = 'needs-attention';
      } else if (actionCount.high > 2) {
        overallHealth = 'fair';
      } else if (jtbd.primaryGoal.currentProgress > 70) {
        overallHealth = 'excellent';
      } else {
        overallHealth = 'good';
      }
      
      return {
        customerId: jtbd.customerId,
        customerName: `Customer ${jtbd.customerId}`, // In real app, would fetch from customer data
        topPriority: jtbd.actions[0],
        actionCount,
        goalProgress: jtbd.primaryGoal.currentProgress,
        nextReview: jtbd.nextReview,
        overallHealth
      };
    });
  }, []);

  const refetch = () => {
    setLastFetch(Date.now());
  };

  return {
    jtbd,
    jtbdList,
    metrics,
    summaries,
    isLoading,
    error,
    refetch
  };
};

// Hook for urgent actions across all customers
export const useUrgentActions = (daysAhead: number = 30) => {
  const { jtbdList } = useJTBDData();
  
  const urgentActions = useMemo(() => {
    const actions: Array<{
      customerId: number;
      customerName: string;
      action: any;
      daysUntilDeadline: number;
    }> = [];
    
    const now = new Date();
    const cutoffDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    jtbdList.forEach(jtbd => {
      jtbd.actions
        .filter(action => {
          if (action.priority === 'critical' || action.priority === 'high') return true;
          if (action.deadline && new Date(action.deadline) <= cutoffDate) return true;
          return false;
        })
        .forEach(action => {
          const daysUntilDeadline = action.deadline
            ? Math.ceil((new Date(action.deadline).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            : Infinity;
          
          actions.push({
            customerId: jtbd.customerId,
            customerName: `Customer ${jtbd.customerId}`,
            action,
            daysUntilDeadline
          });
        });
    });
    
    // Sort by urgency
    actions.sort((a, b) => {
      // Priority first
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.action.priority] ?? 4;
      const bPriority = priorityOrder[b.action.priority] ?? 4;
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Then by deadline
      return a.daysUntilDeadline - b.daysUntilDeadline;
    });
    
    return actions;
  }, [jtbdList, daysAhead]);
  
  return urgentActions;
};

// Hook for goal progress tracking
export const useGoalProgress = (customerId?: number) => {
  const { jtbd, jtbdList } = useJTBDData({ customerId });
  
  const goalProgress = useMemo(() => {
    if (customerId && jtbd) {
      // Single customer progress
      return {
        primaryGoal: jtbd.primaryGoal,
        isOnTrack: jtbd.primaryGoal.onTrack,
        progressPercentage: jtbd.primaryGoal.currentProgress,
        monthlyRequired: jtbd.primaryGoal.monthlyRequired,
        timeRemaining: (() => {
          const now = new Date();
          const target = new Date(jtbd.primaryGoal.targetDate);
          const months = (target.getFullYear() - now.getFullYear()) * 12 + 
                        (target.getMonth() - now.getMonth());
          return months;
        })()
      };
    } else {
      // All customers aggregate
      const onTrackCount = jtbdList.filter(j => j.primaryGoal.onTrack).length;
      const avgProgress = jtbdList.reduce((sum, j) => sum + j.primaryGoal.currentProgress, 0) / jtbdList.length;
      
      return {
        totalGoals: jtbdList.length,
        onTrackCount,
        offTrackCount: jtbdList.length - onTrackCount,
        averageProgress: avgProgress,
        criticalGoals: jtbdList.filter(j => j.primaryGoal.currentProgress < 30 && !j.primaryGoal.onTrack)
      };
    }
  }, [customerId, jtbd, jtbdList]);
  
  return goalProgress;
};