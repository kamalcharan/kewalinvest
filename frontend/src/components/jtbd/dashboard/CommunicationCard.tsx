// frontend/src/components/jtbd/dashboard/CommunicationCard.tsx

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { JTBDWithCommunication } from '../../../types/jtbd.types';
import CommunicationStatusBadge from './CommunicationStatusBadge';

interface CommunicationCardProps {
  alert: JTBDWithCommunication;
  onViewCustomer: (customerId: number) => void;
  onViewDetails: (alertId: number) => void;
  compact?: boolean;
}

const CommunicationCard: React.FC<CommunicationCardProps> = ({
  alert,
  onViewCustomer,
  onViewDetails,
  compact = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Priority colors
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#DC2626';
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.utility.secondaryText;
    }
  };

  // Channel icons
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return '📧';
      case 'whatsapp': return '💬';
      case 'sms': return '📱';
      default: return '📮';
    }
  };

  // Format date
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not scheduled';
    
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
    if (daysUntil < 0) {
      return `${Math.abs(daysUntil)} days ago`;
    }
    if (daysUntil <= 7) {
      return `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
    }

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Icons
  const UserIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const EyeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  if (compact) {
    // Compact view for list
    return (
      <div
        onClick={() => onViewDetails(alert.id)}
        style={{
          padding: '12px',
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.primaryText}10`,
          borderLeft: `3px solid ${getPriorityColor(alert.priority)}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(4px)';
          e.currentTarget.style.boxShadow = `0 2px 8px ${colors.utility.primaryText}10`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Priority Dot */}
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getPriorityColor(alert.priority),
              flexShrink: 0
            }}
          />

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {alert.title}
            </div>
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText
            }}>
              {alert.customer_name}
            </div>
          </div>

          {/* Status & Date */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0
          }}>
            <CommunicationStatusBadge status={alert.communication_status} size="small" showText={false} />
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText,
              minWidth: '60px',
              textAlign: 'right'
            }}>
              {formatDate(alert.next_alert_date)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderLeft: `4px solid ${getPriorityColor(alert.priority)}`,
        borderRadius: '12px',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 12px ${colors.utility.primaryText}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '4px'
          }}>
            {alert.title}
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <UserIcon />
            <span>{alert.customer_name}</span>
          </div>
        </div>

        {/* Priority Badge */}
        <div
          style={{
            padding: '4px 8px',
            backgroundColor: getPriorityColor(alert.priority) + '20',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: '600',
            color: getPriorityColor(alert.priority),
            textTransform: 'uppercase'
          }}
        >
          {alert.priority}
        </div>
      </div>

      {/* Communication Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '12px',
        padding: '12px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '8px'
      }}>
        {/* Status */}
        <div>
          <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Status
          </div>
          <CommunicationStatusBadge status={alert.communication_status} size="medium" />
        </div>

        {/* Channel */}
        <div>
          <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Channel
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText }}>
            {getChannelIcon(alert.communication_channel)} {alert.communication_channel.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Dates & Metrics */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '11px', color: colors.utility.secondaryText }}>
        <div>
          <span style={{ fontWeight: '600' }}>Alert:</span> {formatDate(alert.next_alert_date)}
        </div>
        {alert.communication_scheduled_at && (
          <div>
            <span style={{ fontWeight: '600' }}>Scheduled:</span> {formatDate(alert.communication_scheduled_at)}
          </div>
        )}
        {alert.communication_sent_at && (
          <div>
            <span style={{ fontWeight: '600' }}>Sent:</span> {formatDate(alert.communication_sent_at)}
          </div>
        )}
      </div>

      {/* Engagement Metrics (if sent) */}
      {alert.communication_status === 'sent' && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {alert.communication_read && (
            <div style={{
              padding: '4px 8px',
              backgroundColor: '#10B981' + '20',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              color: '#10B981'
            }}>
              👁️ Read
            </div>
          )}
          {alert.communication_clicked && (
            <div style={{
              padding: '4px 8px',
              backgroundColor: '#3B82F6' + '20',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              color: '#3B82F6'
            }}>
              🖱️ Clicked
            </div>
          )}
        </div>
      )}

      {/* Error Message (if failed) */}
      {alert.communication_status === 'failed' && alert.communication_error && (
        <div style={{
          padding: '8px',
          backgroundColor: '#EF4444' + '10',
          border: `1px solid #EF444440`,
          borderRadius: '6px',
          fontSize: '11px',
          color: '#EF4444',
          marginBottom: '12px'
        }}>
          ⚠️ {alert.communication_error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onViewCustomer(alert.customer_id)}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.brand.primary}40`,
            borderRadius: '6px',
            color: colors.brand.primary,
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <UserIcon />
          View Customer
        </button>
        <button
          onClick={() => onViewDetails(alert.id)}
          style={{
            flex: 1,
            padding: '8px',
            backgroundColor: colors.brand.primary,
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <EyeIcon />
          View Details
        </button>
      </div>
    </div>
  );
};

export default CommunicationCard;