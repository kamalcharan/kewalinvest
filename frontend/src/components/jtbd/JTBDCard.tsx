// frontend/src/components/jtbd/JTBDCard.tsx
// UPDATED: Added goal_tracking type handling

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { JTBDConfiguration, PortfolioAlertConfig, TimeBasedConfig, ProfileTriggerConfig } from '../../types/jtbd.types';
import { useToggleJTBD, useDeleteJTBD } from '../../hooks/useJTBD';
import GoalCard from '../goals/GoalCard';

interface JTBDCardProps {
  jtbd: JTBDConfiguration;
  onEdit?: (jtbdId: number) => void;
  compact?: boolean;
}

const JTBDCard: React.FC<JTBDCardProps> = ({
  jtbd,
  onEdit,
  compact = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleMutation = useToggleJTBD();
  const deleteMutation = useDeleteJTBD();

  // UPDATED: Handle goal_tracking type - render as GoalCard instead
  if (jtbd.jtbd_type === 'goal_tracking') {
  return (
    <GoalCard
      goal={jtbd as any}
      onEdit={() => onEdit?.(jtbd.id)}
      compact={compact}
    />
  );
}

  // Get action-oriented display text
  const getActionText = (): { title: string; subtitle: string; icon: string } => {
    switch (jtbd.jtbd_type) {
      case 'portfolio_alert': {
        const config = jtbd.config_data as PortfolioAlertConfig;
        const txnType = config.txn_type.toLowerCase();
        
        let title = '';
        if (txnType.includes('addition') || txnType.includes('sip')) {
          title = '💰 Investment Due';
        } else if (txnType.includes('redemption')) {
          title = '📤 Redemption Expected';
        } else if (txnType.includes('switch')) {
          title = '🔄 Switch Transaction Due';
        } else {
          title = `📋 ${config.txn_type} Expected`;
        }

        const subtitle = `₹${config.amount.toLocaleString('en-IN')} • ${config.scheme_name}`;
        return { title, subtitle, icon: '💼' };
      }

      case 'time_based': {
        const config = jtbd.config_data as TimeBasedConfig;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const title = config.is_recurring ? '🔔 Recurring Reminder' : '📅 One-time Reminder';
        const subtitle = `${config.alert_date} ${monthNames[config.alert_month - 1]}`;
        return { title, subtitle, icon: '📆' };
      }

      case 'profile_trigger': {
        const config = jtbd.config_data as ProfileTriggerConfig;
        const title = config.trigger_type === 'birthday' ? '🎂 Birthday Reminder' : '💑 Anniversary Reminder';
        const subtitle = `${config.days_before} days before`;
        return { title, subtitle, icon: config.trigger_type === 'birthday' ? '🎉' : '💐' };
      }

      default:
        return { title: jtbd.title, subtitle: '', icon: '📌' };
    }
  };

  const actionText = getActionText();

  // Format next alert date
  const formatNextDate = (dateString?: string): string => {
    if (!dateString) return 'Not scheduled';
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return '🔥 Today';
    }

    if (date.toDateString() === tomorrow.toDateString()) {
      return '⚡ Tomorrow';
    }

    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil > 0 && daysUntil <= 7) {
      return `📍 ${date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`;
    }

    if (daysUntil < 0) {
      return `⚠️ Overdue`;
    }

    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  // Priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return colors.semantic.error;
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.utility.secondaryText;
    }
  };

  // Handle toggle
  const handleToggle = async () => {
    try {
      await toggleMutation.mutateAsync(jtbd.id);
    } catch (error) {
      console.error('Failed to toggle JTBD:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ 
        id: jtbd.id, 
        customerId: jtbd.customer_id 
      });
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete JTBD:', error);
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
          border: `1px solid ${jtbd.is_active ? colors.utility.primaryText + '10' : colors.utility.secondaryText + '40'}`,
          borderLeft: `3px solid ${getPriorityColor(jtbd.priority)}`,
          borderRadius: '6px',
          padding: '10px 12px',
          transition: 'all 0.2s ease',
          opacity: jtbd.is_active ? 1 : 0.6,
          minHeight: '60px',
          maxHeight: '80px'
        }}
      >
        {/* Single Row Layout - Ultra Compact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Left: Content - Takes most space */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title with Status Badge - Single Line */}
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflow: 'hidden'
            }}>
              <span style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap',
                flex: 1
              }}>
                {actionText.title}
              </span>
              {!jtbd.is_active && (
                <span style={{
                  fontSize: '8px',
                  padding: '1px 4px',
                  backgroundColor: colors.utility.secondaryText + '20',
                  color: colors.utility.secondaryText,
                  borderRadius: '3px',
                  fontWeight: '500',
                  flexShrink: 0
                }}>
                  PAUSED
                </span>
              )}
            </div>

            {/* Subtitle - Truncated */}
            <div style={{
              fontSize: '10px',
              color: colors.utility.secondaryText,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {actionText.subtitle}
            </div>

            {/* Bottom Row: Date and Priority - Inline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {formatNextDate(jtbd.next_alert_date)}
              </div>

              <span style={{
                fontSize: '8px',
                padding: '1px 5px',
                backgroundColor: getPriorityColor(jtbd.priority) + '20',
                color: getPriorityColor(jtbd.priority),
                borderRadius: '3px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {jtbd.priority}
              </span>
            </div>
          </div>

          {/* Right: Action Buttons - Compact */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '3px',
            flexShrink: 0 
          }}>
            {/* Toggle Active/Inactive */}
            <button
              onClick={handleToggle}
              disabled={toggleMutation.isPending}
              title={jtbd.is_active ? 'Pause Alert' : 'Activate Alert'}
              style={{
                padding: '5px',
                backgroundColor: 'transparent',
                color: jtbd.is_active ? colors.semantic.success : colors.utility.secondaryText,
                border: `1px solid ${jtbd.is_active ? colors.semantic.success + '40' : colors.utility.secondaryText + '40'}`,
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '26px',
                minHeight: '26px'
              }}
            >
              {jtbd.is_active ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Edit */}
            {onEdit && (
              <button
                onClick={() => onEdit(jtbd.id)}
                title="Edit Alert"
                style={{
                  padding: '5px',
                  backgroundColor: 'transparent',
                  color: colors.semantic.info,
                  border: `1px solid ${colors.semantic.info}40`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '26px',
                  minHeight: '26px'
                }}
              >
                <EditIcon />
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Alert"
              style={{
                padding: '5px',
                backgroundColor: 'transparent',
                color: colors.semantic.error,
                border: `1px solid ${colors.semantic.error}40`,
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '26px',
                minHeight: '26px'
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </div>
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
              Delete Alert?
            </h3>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '20px'
            }}>
              Are you sure you want to delete "{actionText.title}"? This action cannot be undone.
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
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JTBDCard;