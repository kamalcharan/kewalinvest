// frontend/src/components/jtbd/JTBDCard.tsx
// UPDATED: Unified card design with Acknowledge/Dismiss actions (matching AlertsTab)

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { JTBDConfiguration, PortfolioAlertConfig, TimeBasedConfig, ProfileTriggerConfig } from '../../types/jtbd.types';
import { useAcknowledgeAlert, useDismissAlert } from '../../hooks/useJTBD';
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

  const acknowledgeMutation = useAcknowledgeAlert();
  const dismissMutation = useDismissAlert();

  // Handle goal_tracking type - render as GoalCard instead
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

  // Handle acknowledge (mark as done)
  const handleAcknowledge = async () => {
    try {
      await acknowledgeMutation.mutateAsync({
        alertId: jtbd.id,
        customerId: jtbd.customer_id
      });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  // Handle dismiss
  const handleDismiss = async () => {
    try {
      await dismissMutation.mutateAsync({
        alertId: jtbd.id,
        customerId: jtbd.customer_id
      });
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  // Determine alert status - using is_active as proxy for now
  // In future, this should come from the alert status field
  const isActive = jtbd.is_active;
  const isAcknowledged = false; // TODO: Add status field to JTBD type
  const isDismissed = false; // TODO: Add status field to JTBD type

  // Icons (matching AlertsTab)
  const CheckIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const XIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  return (
    <div
      style={{
        backgroundColor: colors.utility.primaryBackground,
        border: `1px solid ${isActive ? colors.utility.primaryText + '10' : colors.utility.secondaryText + '40'}`,
        borderLeft: `3px solid ${getPriorityColor(jtbd.priority)}`,
        borderRadius: '6px',
        padding: '10px 12px',
        transition: 'all 0.2s ease',
        opacity: isActive ? 1 : 0.6,
        minHeight: '60px'
      }}
    >
      {/* Single Row Layout - Ultra Compact (matching AlertsTab) */}
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
            {isAcknowledged && (
              <span style={{
                fontSize: '8px',
                padding: '1px 4px',
                backgroundColor: colors.semantic.success + '20',
                color: colors.semantic.success,
                borderRadius: '3px',
                fontWeight: '500',
                flexShrink: 0
              }}>
                DONE
              </span>
            )}
            {isDismissed && (
              <span style={{
                fontSize: '8px',
                padding: '1px 4px',
                backgroundColor: colors.utility.secondaryText + '20',
                color: colors.utility.secondaryText,
                borderRadius: '3px',
                fontWeight: '500',
                flexShrink: 0
              }}>
                DISMISSED
              </span>
            )}
            {!isActive && !isAcknowledged && !isDismissed && (
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

        {/* Right: Action Buttons - Compact (only for active alerts) */}
        {isActive && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            flexShrink: 0
          }}>
            {/* Acknowledge (Mark as Done) */}
            <button
              onClick={handleAcknowledge}
              disabled={acknowledgeMutation.isPending}
              title="Mark as Done"
              style={{
                padding: '5px',
                backgroundColor: 'transparent',
                color: colors.semantic.success,
                border: `1px solid ${colors.semantic.success}80`,
                borderRadius: '4px',
                cursor: acknowledgeMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '26px',
                minHeight: '26px',
                opacity: acknowledgeMutation.isPending ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              <CheckIcon />
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              disabled={dismissMutation.isPending}
              title="Dismiss Alert"
              style={{
                padding: '5px',
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.secondaryText}80`,
                borderRadius: '4px',
                cursor: dismissMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '26px',
                minHeight: '26px',
                opacity: dismissMutation.isPending ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              <XIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JTBDCard;
