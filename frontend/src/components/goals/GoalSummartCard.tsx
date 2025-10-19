// frontend/src/components/goals/GoalSummaryCard.tsx

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useGoalSummary } from '../../hooks/useGoals';
import { formatCurrency, formatPercentage } from '../../utils/goalUtils';

interface GoalSummaryCardProps {
  customerId: number;
  onClick?: () => void;
  compact?: boolean;
}

const GoalSummaryCard: React.FC<GoalSummaryCardProps> = ({
  customerId,
  onClick,
  compact = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const { data: summary, isLoading, error } = useGoalSummary(customerId);

  // Icons
  const TargetIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const AlertIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const RocketIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4.5 16.5c-1.5-1.26-2-5-2-5s3.044-1.968 6-2 6 .75 6 1.972M12 15l5 5M12 12l6-6" />
      <circle cx="9" cy="5" r="2" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderRadius: '8px',
        padding: compact ? '12px' : '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: compact ? '80px' : '120px',
        color: colors.utility.secondaryText
      }}>
        <div style={{ fontSize: '13px', fontWeight: '500' }}>Loading goals...</div>
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
        padding: compact ? '12px' : '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minHeight: compact ? '80px' : '120px'
      }}>
        <AlertIcon />
        <div style={{ fontSize: '13px', color: colors.semantic.error }}>
          Failed to load goal summary
        </div>
      </div>
    );
  }

  // No goals state
  if (!summary || summary.total_goals === 0) {
    return (
      <div
        onClick={onClick}
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          border: `2px dashed ${colors.utility.primaryText}20`,
          borderRadius: '8px',
          padding: compact ? '12px' : '16px',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          minHeight: compact ? '80px' : '120px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}
        onMouseEnter={(e) => {
          if (onClick) {
            e.currentTarget.style.borderColor = colors.brand.primary;
            e.currentTarget.style.backgroundColor = colors.brand.primary + '10';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
          e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
        }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎯</div>
        <div style={{ fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '4px' }}>
          No Goals Yet
        </div>
        <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
          Create your first financial goal
        </div>
      </div>
    );
  }

  // Status breakdown
  const onTrackPercentage = summary.total_goals > 0 
    ? (summary.goals_on_track / summary.total_goals) * 100 
    : 0;

  const aheadPercentage = summary.total_goals > 0 
    ? (summary.goals_ahead / summary.total_goals) * 100 
    : 0;

  const behindPercentage = summary.total_goals > 0 
    ? (summary.goals_behind / summary.total_goals) * 100 
    : 0;

  // Overall progress
  const overallProgress = summary.average_progress || 0;

  // Color coding for overall progress
  let progressColor = '#10B981'; // Green
  if (overallProgress < 50) {
    progressColor = '#DC2626'; // Red
  } else if (overallProgress < 75) {
    progressColor = '#F59E0B'; // Orange
  }

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderRadius: '8px',
        padding: compact ? '12px' : '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = colors.brand.primary + '40';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${colors.brand.primary}15`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.utility.primaryText + '10';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: compact ? '8px' : '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: colors.brand.primary + '20',
            color: colors.brand.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TargetIcon />
          </div>
          <div>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              Financial Goals
            </div>
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText
            }}>
              {summary.total_goals} goal{summary.total_goals !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {onClick && (
          <div style={{ color: colors.brand.primary, opacity: 0.5 }}>
            <ChevronRightIcon />
          </div>
        )}
      </div>

      {/* Progress Bar with Overall Stats */}
      <div style={{ marginBottom: compact ? '10px' : '12px' }}>
        {/* Overall Progress Percentage */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            fontWeight: '500'
          }}>
            Average Progress
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '700',
            color: progressColor
          }}>
            {formatPercentage(overallProgress, 1)}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: colors.utility.primaryText + '10',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${Math.min(100, overallProgress)}%`,
            height: '100%',
            backgroundColor: progressColor,
            transition: 'width 0.3s ease',
            borderRadius: '3px'
          }} />
        </div>
      </div>

      {/* Status Breakdown - 3 Status Mini Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: compact ? '6px' : '8px',
        marginBottom: compact ? '8px' : '12px'
      }}>
        {/* On Track */}
        <div style={{
          padding: compact ? '8px' : '10px',
          backgroundColor: '#10B981' + '15',
          border: `1px solid ${'#10B981'}30`,
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '10px',
            color: colors.utility.secondaryText,
            marginBottom: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px'
          }}>
            <CheckIcon />
            <span>On Track</span>
          </div>
          <div style={{
            fontSize: compact ? '13px' : '14px',
            fontWeight: '700',
            color: '#10B981'
          }}>
            {summary.goals_on_track}
          </div>
          <div style={{
            fontSize: '9px',
            color: colors.utility.secondaryText,
            marginTop: '2px'
          }}>
            {formatPercentage(onTrackPercentage, 0)}
          </div>
        </div>

        {/* Ahead */}
        <div style={{
          padding: compact ? '8px' : '10px',
          backgroundColor: '#3B82F6' + '15',
          border: `1px solid ${'#3B82F6'}30`,
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '10px',
            color: colors.utility.secondaryText,
            marginBottom: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px'
          }}>
            <RocketIcon />
            <span>Ahead</span>
          </div>
          <div style={{
            fontSize: compact ? '13px' : '14px',
            fontWeight: '700',
            color: '#3B82F6'
          }}>
            {summary.goals_ahead}
          </div>
          <div style={{
            fontSize: '9px',
            color: colors.utility.secondaryText,
            marginTop: '2px'
          }}>
            {formatPercentage(aheadPercentage, 0)}
          </div>
        </div>

        {/* Behind */}
        <div style={{
          padding: compact ? '8px' : '10px',
          backgroundColor: '#F59E0B' + '15',
          border: `1px solid ${'#F59E0B'}30`,
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '10px',
            color: colors.utility.secondaryText,
            marginBottom: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px'
          }}>
            <AlertIcon />
            <span>Behind</span>
          </div>
          <div style={{
            fontSize: compact ? '13px' : '14px',
            fontWeight: '700',
            color: '#F59E0B'
          }}>
            {summary.goals_behind}
          </div>
          <div style={{
            fontSize: '9px',
            color: colors.utility.secondaryText,
            marginTop: '2px'
          }}>
            {formatPercentage(behindPercentage, 0)}
          </div>
        </div>
      </div>

      {/* Portfolio Summary - 2 Mini Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: compact ? '6px' : '8px',
        padding: compact ? '8px' : '10px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '6px'
      }}>
        <div>
          <div style={{
            fontSize: '10px',
            color: colors.utility.secondaryText,
            marginBottom: '2px'
          }}>
            Current Value
          </div>
          <div style={{
            fontSize: compact ? '12px' : '13px',
            fontWeight: '700',
            color: colors.utility.primaryText
          }}>
            {formatCurrency(summary.total_current_value, true)}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: '10px',
            color: colors.utility.secondaryText,
            marginBottom: '2px'
          }}>
            Target Value
          </div>
          <div style={{
            fontSize: compact ? '12px' : '13px',
            fontWeight: '700',
            color: colors.utility.primaryText
          }}>
            {formatCurrency(summary.total_target_corpus, true)}
          </div>
        </div>
      </div>

      {/* Gap Summary */}
      <div style={{
        marginTop: compact ? '8px' : '10px',
        padding: compact ? '6px 8px' : '8px 10px',
        backgroundColor: colors.brand.primary + '10',
        border: `1px solid ${colors.brand.primary}30`,
        borderRadius: '6px',
        fontSize: '11px',
        color: colors.utility.primaryText,
        fontWeight: '500',
        textAlign: 'center'
      }}>
        {summary.total_target_corpus > summary.total_current_value ? (
          <>
            Gap: {formatCurrency(summary.total_target_corpus - summary.total_current_value, true)}
          </>
        ) : (
          <>
            Surplus: {formatCurrency(summary.total_current_value - summary.total_target_corpus, true)}
          </>
        )}
      </div>
    </div>
  );
};

export default GoalSummaryCard;