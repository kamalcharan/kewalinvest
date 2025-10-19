// frontend/src/components/goals/GoalCard.tsx

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalConfiguration, isTimeBasedGoal, isPriceBasedGoal, isTimeAndPriceGoal } from '../../types/goal.types';
import { useDeleteGoal } from '../../hooks/useGoals';
import {
  formatCurrency,
  formatDate,
  formatMonths,
  formatPercentage,
  getGoalStatus,
  getGoalActions,
  getGoalTypeIcon,
  getGoalTypeColor,
  getPriorityDisplay
} from '../../utils/goalUtils';

interface GoalCardProps {
  goal: GoalConfiguration;
  onEdit?: (goalId: number) => void;
  onRecalculate?: (goalId: number) => void;
  compact?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onRecalculate,
  compact = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteMutation = useDeleteGoal();

  const config = goal.config_data;
  const status = getGoalStatus(goal);
  const actions = getGoalActions(goal);
  const priorityDisplay = getPriorityDisplay(goal.priority);
  const goalTypeIcon = getGoalTypeIcon(config.goal_type);
  const goalTypeColor = getGoalTypeColor(config.goal_type);

  // Get key metrics based on goal type
  const getKeyMetrics = () => {
    if (isTimeBasedGoal(config)) {
      return {
        primary: formatCurrency(config.projected_corpus || 0, true),
        primaryLabel: 'Projected Corpus',
        secondary: formatDate(config.target_date),
        secondaryLabel: 'Target Date',
        progress: null
      };
    }
    
    if (isPriceBasedGoal(config)) {
      const progress = config.current_value > 0 && config.target_amount > 0
        ? (config.current_value / config.target_amount) * 100
        : 0;
      
      return {
        primary: formatCurrency(config.target_amount, true),
        primaryLabel: 'Target Amount',
        secondary: config.projected_achievement_date 
          ? formatDate(config.projected_achievement_date)
          : 'Calculating...',
        secondaryLabel: 'Expected By',
        progress
      };
    }
    
    if (isTimeAndPriceGoal(config)) {
      const progress = config.progress_percentage || 0;
      
      return {
        primary: formatCurrency(config.target_amount, true),
        primaryLabel: 'Target',
        secondary: formatDate(config.target_date),
        secondaryLabel: 'By',
        progress,
        gap: config.corpus_gap,
        probability: config.probability_of_success
      };
    }
    
    return null;
  };

  const metrics = getKeyMetrics();

  // Handle delete
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ 
        id: goal.id, 
        customerId: goal.customer_id 
      });
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  // Icons
  const EditIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );

  const PauseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );

  const PlayIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );

  return (
    <>
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${goal.is_active ? colors.utility.primaryText + '10' : colors.utility.secondaryText + '40'}`,
          borderLeft: `4px solid ${goalTypeColor}`,
          borderRadius: '8px',
          padding: '14px 16px',
          transition: 'all 0.2s ease',
          opacity: goal.is_active ? 1 : 0.6,
          minHeight: compact ? '100px' : '140px'
        }}
      >
        {/* HEADER ROW */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
          {/* Left: Icon + Title + Status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {/* Goal Type Icon */}
              <span style={{ fontSize: '18px' }}>{goalTypeIcon}</span>
              
              {/* Title */}
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}>
                {goal.title}
              </div>
              
              {/* Status Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                backgroundColor: status.color + '20',
                border: `1px solid ${status.color}40`,
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600',
                color: status.color,
                whiteSpace: 'nowrap'
              }}>
                <span>{status.icon}</span>
                <span>{status.label}</span>
              </div>
            </div>

            {/* Goal Name (from config) */}
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText,
              marginBottom: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {config.goal_name}
            </div>

            {/* Priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '9px',
                padding: '2px 5px',
                backgroundColor: priorityDisplay.color + '20',
                color: priorityDisplay.color,
                borderRadius: '3px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {priorityDisplay.label}
              </span>
              
              {!goal.is_active && (
                <span style={{
                  fontSize: '9px',
                  padding: '2px 5px',
                  backgroundColor: colors.utility.secondaryText + '20',
                  color: colors.utility.secondaryText,
                  borderRadius: '3px',
                  fontWeight: '500'
                }}>
                  PAUSED
                </span>
              )}
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            flexShrink: 0,
            marginLeft: '12px'
          }}>
            {/* Recalculate */}
            {onRecalculate && (
              <button
                onClick={() => onRecalculate(goal.id)}
                title="Recalculate Goal"
                style={{
                  padding: '6px',
                  backgroundColor: 'transparent',
                  color: colors.brand.primary,
                  border: `1px solid ${colors.brand.primary}40`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '28px',
                  minHeight: '28px'
                }}
              >
                <RefreshIcon />
              </button>
            )}

            {/* Edit */}
            {onEdit && (
              <button
                onClick={() => onEdit(goal.id)}
                title="Edit Goal"
                style={{
                  padding: '6px',
                  backgroundColor: 'transparent',
                  color: colors.semantic.info,
                  border: `1px solid ${colors.semantic.info}40`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '28px',
                  minHeight: '28px'
                }}
              >
                <EditIcon />
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Goal"
              style={{
                padding: '6px',
                backgroundColor: 'transparent',
                color: colors.semantic.error,
                border: `1px solid ${colors.semantic.error}40`,
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '28px',
                minHeight: '28px'
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        {metrics && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Primary Metric */}
              <div>
                <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
                  {metrics.primaryLabel}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: colors.utility.primaryText }}>
                  {metrics.primary}
                </div>
              </div>

              {/* Secondary Metric */}
              <div>
                <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
                  {metrics.secondaryLabel}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: colors.utility.primaryText }}>
                  {metrics.secondary}
                </div>
              </div>
            </div>

            {/* Progress Bar (for goals with target amount) */}
            {metrics.progress !== null && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
                    {formatCurrency(config.current_value, true)} / {formatCurrency(isTimeAndPriceGoal(config) ? config.target_amount : isPriceBasedGoal(config) ? config.target_amount : 0, true)}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: status.color }}>
                    {formatPercentage(metrics.progress, 1)}
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  backgroundColor: colors.utility.primaryText + '10',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min(100, metrics.progress)}%`,
                    height: '100%',
                    backgroundColor: status.color,
                    transition: 'width 0.3s ease',
                    borderRadius: '3px'
                  }} />
                </div>
              </div>
            )}

            {/* Additional Info for Time & Price Goals */}
            {isTimeAndPriceGoal(config) && metrics.probability !== undefined && (
              <div style={{ marginTop: '6px', display: 'flex', gap: '12px', fontSize: '10px' }}>
                <div>
                  <span style={{ color: colors.utility.secondaryText }}>Success: </span>
                  <span style={{ 
                    fontWeight: '600', 
                    color: metrics.probability >= 75 ? '#10B981' : metrics.probability >= 60 ? '#F59E0B' : '#DC2626'
                  }}>
                    {formatPercentage(metrics.probability, 0)}
                  </span>
                </div>
                {metrics.gap !== undefined && (
                  <div>
                    <span style={{ color: colors.utility.secondaryText }}>Gap: </span>
                    <span style={{ 
                      fontWeight: '600', 
                      color: metrics.gap >= 0 ? '#10B981' : '#DC2626'
                    }}>
                      {metrics.gap >= 0 ? '+' : ''}{formatCurrency(metrics.gap, true)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ACTIONS / RECOMMENDATIONS */}
        {!compact && actions.length > 0 && actions[0].actionable && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: actions[0].color + '10',
            border: `1px solid ${actions[0].color}40`,
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>{actions[0].icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: colors.utility.primaryText }}>
                  {actions[0].title}
                </div>
                <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginTop: '2px' }}>
                  {actions[0].description}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATUS MESSAGE (compact mode) */}
        {compact && (
          <div style={{
            marginTop: '6px',
            fontSize: '10px',
            color: colors.utility.secondaryText,
            fontStyle: 'italic'
          }}>
            {status.message}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '12px'
            }}>
              Delete Goal?
            </h3>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '20px'
            }}>
              Are you sure you want to delete "{goal.title}"? This will permanently remove the goal and all its history. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.secondaryText}40`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.semantic.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  opacity: deleteMutation.isPending ? 0.6 : 1
                }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoalCard;