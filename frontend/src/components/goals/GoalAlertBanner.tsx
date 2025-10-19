// frontend/src/components/goals/GoalAlertBanner.tsx
// FIXED: All TypeScript errors resolved

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomerGoals } from '../../hooks/useGoals';
import { getGoalStatus, getGoalActions } from '../../utils/goalUtils';
import { GoalConfiguration, isTimeAndPriceGoal } from '../../types/goal.types';

interface GoalAlertBannerProps {
  customerId: number;
  onActionClick?: () => void;
}

const GoalAlertBanner: React.FC<GoalAlertBannerProps> = ({
  customerId,
  onActionClick
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const { data: goals, isLoading, error } = useCustomerGoals(customerId);

  // Icons
  const AlertTriangleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const AlertCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );

  // Filter goals that need attention
  const goalsNeedingAttention = React.useMemo(() => {
    if (!goals) return [];

    return goals.filter(goal => {
      const config = goal.config_data;
      const status = getGoalStatus(goal);

      // Include behind schedule goals
      if (status.status === 'behind') {
        return true;
      }

      // Include time & price goals with low success probability
      if (isTimeAndPriceGoal(config)) {
        if (config.probability_of_success && config.probability_of_success < 60) {
          return true;
        }
        // Include goals that require action
        if (config.action_required && config.action_required !== 'none') {
          return true;
        }
      }

      return false;
    }).sort((a, b) => {
      // Sort by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [goals]);

  // Get most urgent goal
  const mostUrgentGoal = goalsNeedingAttention.length > 0 ? goalsNeedingAttention[0] : null;
  const mostUrgentAction = mostUrgentGoal ? getGoalActions(mostUrgentGoal)[0] : null;

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: colors.utility.secondaryText
      }}>
        <div style={{ fontSize: '12px', fontWeight: '500' }}>Loading alerts...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        backgroundColor: colors.semantic.error + '10',
        border: `1px solid ${colors.semantic.error}40`,
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <AlertCircleIcon />
        <div style={{ fontSize: '12px', color: colors.semantic.error }}>
          Failed to load goal alerts
        </div>
      </div>
    );
  }

  // No alerts state - render nothing
  if (goalsNeedingAttention.length === 0) {
    return null;
  }

  // Determine banner severity
  const criticalGoals = goalsNeedingAttention.filter(g => g.priority === 'critical');
  const highPriorityGoals = goalsNeedingAttention.filter(g => g.priority === 'high');
  
  const isCritical = criticalGoals.length > 0;

  // Determine which icon to use
  const BannerIcon = isCritical ? AlertCircleIcon : AlertTriangleIcon;

  // Color scheme based on severity
  let bannerBg = colors.semantic.warning + '15'; // Yellow default
  let bannerBorder = colors.semantic.warning + '40';
  let bannerColor = colors.semantic.warning;

  if (isCritical) {
    bannerBg = colors.semantic.error + '15'; // Red for critical
    bannerBorder = colors.semantic.error + '40';
    bannerColor = colors.semantic.error;
  }

  return (
    <div
      style={{
        backgroundColor: bannerBg,
        border: `1px solid ${bannerBorder}`,
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
        animation: 'slideDown 0.3s ease-out'
      }}
    >
      {/* Animated gradient background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(90deg, ${bannerColor}20 0%, transparent 50%, ${bannerColor}10 100%)`,
        opacity: 0.5,
        animation: 'shimmer 3s infinite',
        pointerEvents: 'none'
      }} />

      {/* Content */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: bannerColor + '25',
          color: bannerColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <BannerIcon />
        </div>

        {/* Text Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '2px'
          }}>
            {goalsNeedingAttention.length} goal{goalsNeedingAttention.length !== 1 ? 's' : ''} need{goalsNeedingAttention.length === 1 ? 's' : ''} attention
          </div>

          {/* Most urgent action */}
          {mostUrgentGoal && (
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: bannerColor,
                flexShrink: 0
              }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {mostUrgentGoal.title}
                {mostUrgentAction && `: ${mostUrgentAction.title}`}
              </span>
            </div>
          )}

          {/* Summary badges */}
          {(criticalGoals.length > 0 || highPriorityGoals.length > 0) && (
            <div style={{
              display: 'flex',
              gap: '6px',
              marginTop: '4px',
              flexWrap: 'wrap'
            }}>
              {criticalGoals.length > 0 && (
                <span style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  backgroundColor: colors.semantic.error + '30',
                  color: colors.semantic.error,
                  borderRadius: '3px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {criticalGoals.length} Critical
                </span>
              )}
              {highPriorityGoals.length > 0 && (
                <span style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  backgroundColor: '#F97316' + '30',
                  color: '#F97316',
                  borderRadius: '3px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {highPriorityGoals.length} High
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={onActionClick}
        style={{
          padding: '8px 12px',
          backgroundColor: bannerColor,
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'all 0.2s ease',
          position: 'relative',
          zIndex: 2,
          boxShadow: `0 2px 8px ${bannerColor}30`
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9';
          e.currentTarget.style.transform = 'translateX(2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        <span>Review</span>
        <ChevronRightIcon />
      </button>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default GoalAlertBanner;