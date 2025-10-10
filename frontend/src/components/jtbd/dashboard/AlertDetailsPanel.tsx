// frontend/src/components/jtbd/dashboard/AlertDetailsPanel.tsx

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { JTBDWithCommunication, PortfolioAlertConfig, TimeBasedConfig, ProfileTriggerConfig } from '../../../types/jtbd.types';
import CommunicationStatusBadge from './CommunicationStatusBadge';

interface AlertDetailsPanelProps {
  alert: JTBDWithCommunication | null;
  isOpen: boolean;
  onClose: () => void;
}

const AlertDetailsPanel: React.FC<AlertDetailsPanelProps> = ({
  alert,
  isOpen,
  onClose
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  if (!isOpen || !alert) return null;

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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Icons
  const XIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  // Render configuration details based on type
  const renderConfigDetails = () => {
    switch (alert.jtbd_type) {
      case 'portfolio_alert': {
        const config = alert.config_data as PortfolioAlertConfig;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <DetailRow label="Scheme" value={config.scheme_name} />
            <DetailRow label="Scheme Code" value={config.scheme_code} />
            {config.folio_no && <DetailRow label="Folio Number" value={config.folio_no} />}
            <DetailRow label="Transaction Type" value={config.txn_type} />
            <DetailRow label="Frequency" value={config.frequency.toUpperCase()} />
            {config.day_of_month && <DetailRow label="Day of Month" value={config.day_of_month.toString()} />}
            <DetailRow label="Expected Amount" value={`₹${config.amount.toLocaleString('en-IN')}`} />
            <DetailRow label="Deviation" value={`±${config.deviation_days} days`} />
            <DetailRow label="Track Duration" value={`${config.track_till_months} months`} />
          </div>
        );
      }

      case 'time_based': {
        const config = alert.config_data as TimeBasedConfig;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <DetailRow label="Alert Date" value={`${config.alert_date} ${monthNames[config.alert_month - 1]}`} />
            <DetailRow label="Recurrence" value={config.is_recurring ? 'Yearly' : 'One-time'} />
          </div>
        );
      }

      case 'profile_trigger': {
        const config = alert.config_data as ProfileTriggerConfig;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <DetailRow label="Trigger Type" value={config.trigger_type === 'birthday' ? 'Birthday' : 'Anniversary'} />
            <DetailRow label="Alert Timing" value={`${config.days_before} days before`} />
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '450px',
          maxWidth: '90vw',
          backgroundColor: colors.utility.primaryBackground,
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: 0
            }}>
              Alert Details
            </h3>
            <p style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              margin: '4px 0 0 0'
            }}>
              ID: {alert.id}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.utility.secondaryText,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px'
        }}>
          {/* Title & Priority */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: colors.utility.secondaryBackground,
            borderLeft: `4px solid ${getPriorityColor(alert.priority)}`,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              {alert.title}
            </div>
            {alert.description && (
              <div style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                marginBottom: '12px',
                lineHeight: '1.5'
              }}>
                {alert.description}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                padding: '4px 10px',
                backgroundColor: getPriorityColor(alert.priority) + '20',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                color: getPriorityColor(alert.priority),
                textTransform: 'uppercase'
              }}>
                {alert.priority}
              </div>
              <div style={{
                padding: '4px 10px',
                backgroundColor: colors.brand.primary + '20',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                color: colors.brand.primary,
                textTransform: 'uppercase'
              }}>
                {alert.jtbd_type.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <Section title="Customer Information" icon={<UserIcon />}>
            <DetailRow label="Name" value={alert.customer_name} />
            {alert.customer_email && <DetailRow label="Email" value={alert.customer_email} />}
            {alert.customer_mobile && <DetailRow label="Mobile" value={alert.customer_mobile} />}
          </Section>

          {/* Communication Status */}
          <Section title="Communication Status" icon="📡">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Status</span>
                <CommunicationStatusBadge status={alert.communication_status} size="medium" />
              </div>
              <DetailRow 
                label="Channel" 
                value={`${getChannelIcon(alert.communication_channel)} ${alert.communication_channel.toUpperCase()}`} 
              />
              {alert.communication_scheduled_at && (
                <DetailRow label="Scheduled For" value={formatDate(alert.communication_scheduled_at)} />
              )}
              {alert.communication_sent_at && (
                <DetailRow label="Sent At" value={formatDate(alert.communication_sent_at)} />
              )}
              {alert.communication_status === 'failed' && alert.communication_error && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#EF4444' + '10',
                  border: `1px solid #EF444440`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#EF4444'
                }}>
                  <strong>Error:</strong> {alert.communication_error}
                </div>
              )}
            </div>
          </Section>

          {/* Engagement Metrics */}
          {alert.communication_status === 'sent' && (
            <Section title="Engagement Metrics" icon="📊">
              <div style={{ display: 'flex', gap: '12px' }}>
                <MetricCard
                  label="Opened"
                  value={alert.communication_read ? 'Yes' : 'No'}
                  color={alert.communication_read ? '#10B981' : '#6B7280'}
                  icon={alert.communication_read ? '✓' : '○'}
                />
                <MetricCard
                  label="Clicked"
                  value={alert.communication_clicked ? 'Yes' : 'No'}
                  color={alert.communication_clicked ? '#3B82F6' : '#6B7280'}
                  icon={alert.communication_clicked ? '✓' : '○'}
                />
              </div>
            </Section>
          )}

          {/* Alert Configuration */}
          <Section title="Alert Configuration" icon="⚙️">
            {renderConfigDetails()}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.utility.primaryText}10` }}>
              <DetailRow label="Next Alert Date" value={formatDate(alert.next_alert_date)} />
              <DetailRow label="Status" value={alert.is_active ? '✓ Active' : '○ Inactive'} />
            </div>
          </Section>

          {/* Timestamps */}
          <Section title="System Information" icon="🕐">
            <DetailRow label="Created At" value={formatDate(alert.created_at)} />
            <DetailRow label="Last Updated" value={formatDate(alert.updated_at)} />
          </Section>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};

// Helper Components
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`
      }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          margin: 0
        }}>
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0'
    }}>
      <span style={{
        fontSize: '12px',
        color: colors.utility.secondaryText,
        fontWeight: '500'
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '13px',
        color: colors.utility.primaryText,
        fontWeight: '600',
        textAlign: 'right',
        maxWidth: '60%',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {value}
      </span>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; color: string; icon: string }> = ({ label, value, color, icon }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  return (
    <div style={{
      flex: 1,
      padding: '12px',
      backgroundColor: color + '10',
      border: `1px solid ${color}40`,
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '20px',
        fontWeight: '700',
        color: color,
        marginBottom: '4px'
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: '11px',
        color: colors.utility.secondaryText,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '2px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '13px',
        fontWeight: '600',
        color: color
      }}>
        {value}
      </div>
    </div>
  );
};

export default AlertDetailsPanel;