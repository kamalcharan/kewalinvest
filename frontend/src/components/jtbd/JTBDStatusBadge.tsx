// frontend/src/components/jtbd/JTBDStatusBadge.tsx

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalSummary } from '../../types/goal.types';
import { formatCurrency } from '../../utils/goalUtils';

interface JTBDStatusBadgeProps {
  // Mode selection
  mode?: 'alerts' | 'goals';
  
  // ALERTS MODE props (existing functionality)
  jtbdCount?: number;
  nextAlertDate?: string;
  criticalCount?: number;
  
  // GOALS MODE props (new functionality)
  goalSummary?: GoalSummary;
  
  // Common props
  onClick?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const JTBDStatusBadge: React.FC<JTBDStatusBadgeProps> = ({
  mode = 'alerts',
  jtbdCount = 0,
  nextAlertDate,
  criticalCount = 0,
  goalSummary,
  onClick,
  size = 'medium'
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Size configurations
  const sizeConfig = {
    small: {
      fontSize: '10px',
      padding: '2px 6px',
      iconSize: 10,
      gap: '3px'
    },
    medium: {
      fontSize: '11px',
      padding: '4px 8px',
      iconSize: 12,
      gap: '4px'
    },
    large: {
      fontSize: '12px',
      padding: '6px 12px',
      iconSize: 14,
      gap: '6px'
    }
  };

  const config = sizeConfig[size];

  // ==================== ALERTS MODE (EXISTING) ====================
  if (mode === 'alerts') {
    const hasSetup = jtbdCount > 0;
    const hasCritical = criticalCount > 0;

    // Color scheme based on status
    const getColors = () => {
      if (!hasSetup) {
        return {
          bg: colors.utility.secondaryText + '20',
          text: colors.utility.secondaryText,
          border: colors.utility.secondaryText + '40'
        };
      }
      
      if (hasCritical) {
        return {
          bg: colors.semantic.error + '20',
          text: colors.semantic.error,
          border: colors.semantic.error + '40'
        };
      }

      return {
        bg: colors.semantic.success + '20',
        text: colors.semantic.success,
        border: colors.semantic.success + '40'
      };
    };

    const colorScheme = getColors();

    // Format next alert date
    const formatNextDate = (dateString?: string): string => {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      }

      if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      }

      const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0 && daysUntil <= 7) {
        return `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
      }

      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    };

    // Icons
    const BellIcon = () => (
      <svg 
        width={config.iconSize} 
        height={config.iconSize} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );

    const AlertIcon = () => (
      <svg 
        width={config.iconSize} 
        height={config.iconSize} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );

    const PlusIcon = () => (
      <svg 
        width={config.iconSize} 
        height={config.iconSize} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );

    // Tooltip content
    const getTooltipContent = () => {
      if (!hasSetup) {
        return 'No alerts configured. Click to setup.';
      }

      const parts = [`${jtbdCount} active alert${jtbdCount > 1 ? 's' : ''}`];
      
      if (criticalCount > 0) {
        parts.push(`${criticalCount} critical`);
      }

      if (nextAlertDate) {
        parts.push(`Next: ${formatNextDate(nextAlertDate)}`);
      }

      return parts.join(' • ');
    };

    return (
      <div
        onClick={onClick}
        title={getTooltipContent()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: config.gap,
          padding: config.padding,
          borderRadius: '8px',
          fontSize: config.fontSize,
          fontWeight: '600',
          backgroundColor: colorScheme.bg,
          color: colorScheme.text,
          border: `1px solid ${colorScheme.border}`,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          if (onClick) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = `0 2px 8px ${colorScheme.border}`;
          }
        }}
        onMouseLeave={(e) => {
          if (onClick) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        {!hasSetup ? <PlusIcon /> : hasCritical ? <AlertIcon /> : <BellIcon />}
        <span>
          {!hasSetup ? 'Setup Alerts' : `Alerts (${jtbdCount})`}
        </span>
        {hasSetup && nextAlertDate && size !== 'small' && (
          <>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ opacity: 0.8 }}>
              {formatNextDate(nextAlertDate)}
            </span>
          </>
        )}
      </div>
    );
  }

  // ==================== GOALS MODE (NEW) ====================
  if (mode === 'goals') {
    if (!goalSummary) {
      // No goal data available
      return (
        <div
          onClick={onClick}
          title="No goals configured. Click to setup."
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: config.gap,
            padding: config.padding,
            borderRadius: '8px',
            fontSize: config.fontSize,
            fontWeight: '600',
            backgroundColor: colors.utility.secondaryText + '20',
            color: colors.utility.secondaryText,
            border: `1px solid ${colors.utility.secondaryText}40`,
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}
          onMouseEnter={(e) => {
            if (onClick) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 2px 8px ${colors.utility.secondaryText}40`;
            }
          }}
          onMouseLeave={(e) => {
            if (onClick) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <svg 
            width={config.iconSize} 
            height={config.iconSize} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Setup Goals</span>
        </div>
      );
    }

    const totalGoals = goalSummary.total_goals;
    const goalsBehind = goalSummary.goals_behind;
    const goalsAhead = goalSummary.goals_ahead;
    const goalsOnTrack = goalSummary.goals_on_track;
    const avgProgress = goalSummary.average_progress;

    // Determine color scheme based on goal status
    const getGoalColors = () => {
      if (goalsBehind > 0) {
        return {
          bg: colors.semantic.error + '20',
          text: colors.semantic.error,
          border: colors.semantic.error + '40',
          icon: '⚠️'
        };
      } else if (goalsAhead > 0) {
        return {
          bg: colors.brand.primary + '20',
          text: colors.brand.primary,
          border: colors.brand.primary + '40',
          icon: '🚀'
        };
      } else {
        return {
          bg: colors.semantic.success + '20',
          text: colors.semantic.success,
          border: colors.semantic.success + '40',
          icon: '✓'
        };
      }
    };

    const colorScheme = getGoalColors();

    // Goal icon
    const GoalIcon = () => (
      <svg 
        width={config.iconSize} 
        height={config.iconSize} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );

    // Tooltip content for goals
    const getGoalTooltip = () => {
      const parts = [`${totalGoals} goal${totalGoals > 1 ? 's' : ''}`];
      
      if (goalsOnTrack > 0) {
        parts.push(`${goalsOnTrack} on track`);
      }
      if (goalsBehind > 0) {
        parts.push(`${goalsBehind} behind`);
      }
      if (goalsAhead > 0) {
        parts.push(`${goalsAhead} ahead`);
      }
      
      parts.push(`${avgProgress.toFixed(1)}% avg progress`);
      parts.push(`${formatCurrency(goalSummary.total_current_value, true)} / ${formatCurrency(goalSummary.total_target_corpus, true)}`);

      return parts.join(' • ');
    };

    return (
      <div
        onClick={onClick}
        title={getGoalTooltip()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: config.gap,
          padding: config.padding,
          borderRadius: '8px',
          fontSize: config.fontSize,
          fontWeight: '600',
          backgroundColor: colorScheme.bg,
          color: colorScheme.text,
          border: `1px solid ${colorScheme.border}`,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
          userSelect: 'none'
        }}
        onMouseEnter={(e) => {
          if (onClick) {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = `0 2px 8px ${colorScheme.border}`;
          }
        }}
        onMouseLeave={(e) => {
          if (onClick) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        {/* Icon */}
        <GoalIcon />

        {/* Main text */}
        <span>
          Goals ({totalGoals})
        </span>

        {/* Progress indicator */}
        {size !== 'small' && (
          <>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ opacity: 0.8 }}>
              {avgProgress.toFixed(0)}%
            </span>
          </>
        )}

        {/* Behind count indicator (if any) */}
        {goalsBehind > 0 && size !== 'small' && (
          <span style={{
            marginLeft: '2px',
            padding: '1px 4px',
            backgroundColor: colors.semantic.error,
            color: 'white',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: '700'
          }}>
            {goalsBehind}
          </span>
        )}
      </div>
    );
  }

  return null;
};

export default JTBDStatusBadge;