// frontend/src/components/jtbd/JTBDCard.tsx

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { JTBDConfiguration, PortfolioAlertConfig, TimeBasedConfig, ProfileTriggerConfig } from '../../types/jtbd.types';
import { useToggleJTBD, useDeleteJTBD } from '../../hooks/useJTBD';

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
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleMutation = useToggleJTBD();
  const deleteMutation = useDeleteJTBD();

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

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return '🔥 Today';
    }

    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return '⚡ Tomorrow';
    }

    // Check if within next 7 days
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil > 0 && daysUntil <= 7) {
      return `📍 ${date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`;
    }

    // Check if overdue
    if (daysUntil < 0) {
      return `⚠️ Overdue`;
    }

    // Format as date
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

  // Render configuration details (expandable)
  const renderConfigDetails = () => {
    if (!isExpanded) return null;

    return (
      <div style={{
        marginTop: '12px',
        padding: '12px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '6px',
        fontSize: '12px',
        color: colors.utility.secondaryText
      }}>
        {jtbd.jtbd_type === 'portfolio_alert' && (
          <div>
            <div><strong>Scheme Code:</strong> {(jtbd.config_data as PortfolioAlertConfig).scheme_code}</div>
            {(jtbd.config_data as PortfolioAlertConfig).folio_no && (
              <div><strong>Folio:</strong> {(jtbd.config_data as PortfolioAlertConfig).folio_no}</div>
            )}
            <div><strong>Frequency:</strong> {(jtbd.config_data as PortfolioAlertConfig).frequency}</div>
            {(jtbd.config_data as PortfolioAlertConfig).day_of_month && (
              <div><strong>Day of Month:</strong> {(jtbd.config_data as PortfolioAlertConfig).day_of_month}</div>
            )}
            <div><strong>Deviation:</strong> ±{(jtbd.config_data as PortfolioAlertConfig).deviation_days} days</div>
            <div><strong>Track for:</strong> {(jtbd.config_data as PortfolioAlertConfig).track_till_months} months</div>
          </div>
        )}

        {jtbd.jtbd_type === 'time_based' && (
          <div>
            <div><strong>Date:</strong> {(jtbd.config_data as TimeBasedConfig).alert_date}</div>
            <div><strong>Month:</strong> {(jtbd.config_data as TimeBasedConfig).alert_month}</div>
            <div><strong>Recurring:</strong> {(jtbd.config_data as TimeBasedConfig).is_recurring ? 'Yes' : 'No'}</div>
          </div>
        )}

        {jtbd.jtbd_type === 'profile_trigger' && (
          <div>
            <div><strong>Trigger:</strong> {(jtbd.config_data as ProfileTriggerConfig).trigger_type}</div>
            <div><strong>Days Before:</strong> {(jtbd.config_data as ProfileTriggerConfig).days_before}</div>
          </div>
        )}

        {jtbd.description && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${colors.utility.primaryText}10` }}>
            <strong>Notes:</strong> {jtbd.description}
          </div>
        )}
      </div>
    );
  };

  // Icons
  const EditIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const ChevronUpIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18,15 12,9 6,15" />
    </svg>
  );

  return (
    <>
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${jtbd.is_active ? colors.utility.primaryText + '10' : colors.utility.secondaryText + '40'}`,
          borderLeft: `3px solid ${getPriorityColor(jtbd.priority)}`,
          borderRadius: '8px',
          padding: compact ? '12px' : '16px',
          transition: 'all 0.2s ease',
          opacity: jtbd.is_active ? 1 : 0.6
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ flex: 1 }}>
            {/* Title */}
            <div style={{
              fontSize: compact ? '13px' : '14px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>{actionText.title}</span>
              {!jtbd.is_active && (
                <span style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  backgroundColor: colors.utility.secondaryText + '20',
                  color: colors.utility.secondaryText,
                  borderRadius: '4px',
                  fontWeight: '500'
                }}>
                  PAUSED
                </span>
              )}
            </div>

            {/* Subtitle */}
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginBottom: '8px'
            }}>
              {actionText.subtitle}
            </div>

            {/* Next Date & Priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {formatNextDate(jtbd.next_alert_date)}
              </div>

              <span style={{
                fontSize: '9px',
                padding: '2px 6px',
                backgroundColor: getPriorityColor(jtbd.priority) + '20',
                color: getPriorityColor(jtbd.priority),
                borderRadius: '4px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {jtbd.priority}
              </span>
            </div>
          </div>

          {/* Actions */}
          {!compact && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
              {/* Toggle Active/Inactive */}
              <button
                onClick={handleToggle}
                disabled={toggleMutation.isPending}
                title={jtbd.is_active ? 'Pause Alert' : 'Activate Alert'}
                style={{
                  padding: '6px',
                  backgroundColor: 'transparent',
                  color: jtbd.is_active ? colors.semantic.success : colors.utility.secondaryText,
                  border: `1px solid ${jtbd.is_active ? colors.semantic.success + '40' : colors.utility.secondaryText + '40'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '10px',
                  fontWeight: '500'
                }}
              >
                {jtbd.is_active ? '●' : '○'}
              </button>

              {/* Edit */}
              {onEdit && (
                <button
                  onClick={() => onEdit(jtbd.id)}
                  title="Edit Alert"
                  style={{
                    padding: '6px',
                    backgroundColor: 'transparent',
                    color: colors.semantic.info,
                    border: `1px solid ${colors.semantic.info}40`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
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
                  padding: '6px',
                  backgroundColor: 'transparent',
                  color: colors.semantic.error,
                  border: `1px solid ${colors.semantic.error}40`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <TrashIcon />
              </button>

              {/* Expand/Collapse */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Hide Details' : 'Show Details'}
                style={{
                  padding: '6px',
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.secondaryText}40`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </button>
            </div>
          )}
        </div>

        {/* Expandable Config Details */}
        {renderConfigDetails()}
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