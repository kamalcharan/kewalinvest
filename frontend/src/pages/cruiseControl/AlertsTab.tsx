// frontend/src/pages/cruiseControl/AlertsTab.tsx
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Bell, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Alert {
  id: number;
  type: 'jtbd_trigger' | 'goal_progress' | 'goal_due';
  customer_name: string;
  message: string;
  status: 'active' | 'acknowledged' | 'dismissed';
  triggered_at: string;
}

// Dummy alert data
const DUMMY_ALERTS: Alert[] = [
  {
    id: 1,
    type: 'goal_due',
    customer_name: 'Rajesh Kumar',
    message: 'Goal "Retirement Planning" is due in 30 days',
    status: 'active',
    triggered_at: '2025-01-23T10:00:00Z'
  },
  {
    id: 2,
    type: 'jtbd_trigger',
    customer_name: 'Priya Sharma',
    message: 'Profile trigger: Review portfolio performance',
    status: 'active',
    triggered_at: '2025-01-23T09:30:00Z'
  },
  {
    id: 3,
    type: 'goal_progress',
    customer_name: 'Amit Patel',
    message: 'Goal "Child Education" is behind by 15%',
    status: 'active',
    triggered_at: '2025-01-23T08:45:00Z'
  },
  {
    id: 4,
    type: 'goal_due',
    customer_name: 'Sunita Mehta',
    message: 'Goal "Home Purchase" is due in 60 days',
    status: 'active',
    triggered_at: '2025-01-22T15:20:00Z'
  },
  {
    id: 5,
    type: 'jtbd_trigger',
    customer_name: 'Vikram Singh',
    message: 'Profile trigger: Tax planning consultation',
    status: 'active',
    triggered_at: '2025-01-22T11:00:00Z'
  },
  {
    id: 6,
    type: 'goal_progress',
    customer_name: 'Anjali Reddy',
    message: 'Goal "Emergency Fund" completed! 🎉',
    status: 'acknowledged',
    triggered_at: '2025-01-21T14:30:00Z'
  },
  {
    id: 7,
    type: 'goal_due',
    customer_name: 'Rahul Verma',
    message: 'Goal "Vehicle Purchase" is due in 15 days',
    status: 'active',
    triggered_at: '2025-01-21T10:15:00Z'
  }
];

export const AlertsTab: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'dismissed'>('active');
  const [alerts, setAlerts] = useState<Alert[]>(DUMMY_ALERTS);

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.status === filter;
  });

  const alertTypeBadgeConfig = {
    jtbd_trigger: { label: 'JTBD Trigger', color: colors.brand.secondary },
    goal_progress: { label: 'Goal Progress', color: colors.semantic.warning },
    goal_due: { label: 'Goal Due', color: colors.semantic.error }
  };

  const handleAcknowledge = (alertId: number) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
      )
    );
  };

  const handleDismiss = (alertId: number) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, status: 'dismissed' } : alert
      )
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div>
      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        padding: '4px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '8px',
        width: 'fit-content'
      }}>
        {(['all', 'active', 'acknowledged', 'dismissed'] as const).map(status => {
          const count = alerts.filter(a => status === 'all' || a.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: filter === status ? colors.brand.primary : 'transparent',
                color: filter === status ? 'white' : colors.utility.primaryText,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'capitalize'
              }}
            >
              {status} ({count})
            </button>
          );
        })}
      </div>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <div style={{
          padding: '64px',
          textAlign: 'center',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px'
          }}>
            🎉
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            No {filter} alerts
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            All caught up! No alerts require your attention.
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {filteredAlerts.map(alert => {
            const badgeConfig = alertTypeBadgeConfig[alert.type];

            return (
              <div
                key={alert.id}
                style={{
                  padding: '16px',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `1px solid ${alert.status === 'active' ? `${badgeConfig.color}40` : `${colors.utility.primaryText}10`}`,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  transition: 'all 0.2s',
                  opacity: alert.status === 'active' ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${badgeConfig.color}60`;
                  e.currentTarget.style.boxShadow = `0 2px 8px ${badgeConfig.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = alert.status === 'active' ? `${badgeConfig.color}40` : `${colors.utility.primaryText}10`;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Alert Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: `${badgeConfig.color}10`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {alert.status === 'active' && <Bell size={20} color={badgeConfig.color} />}
                  {alert.status === 'acknowledged' && <CheckCircle size={20} color={colors.semantic.success} />}
                  {alert.status === 'dismissed' && <XCircle size={20} color={colors.utility.secondaryText} />}
                </div>

                {/* Alert Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Alert Type Badge */}
                  <div style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    backgroundColor: `${badgeConfig.color}15`,
                    color: badgeConfig.color,
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {badgeConfig.label}
                  </div>

                  {/* Customer Name */}
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '4px'
                  }}>
                    {alert.customer_name}
                  </div>

                  {/* Alert Message */}
                  <div style={{
                    fontSize: '14px',
                    color: colors.utility.secondaryText,
                    lineHeight: '1.5',
                    marginBottom: '8px'
                  }}>
                    {alert.message}
                  </div>

                  {/* Time */}
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Clock size={12} />
                    {formatDate(alert.triggered_at)}
                  </div>
                </div>

                {/* Action Buttons */}
                {alert.status === 'active' && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minWidth: '120px'
                  }}>
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: '600',
                        backgroundColor: colors.semantic.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      ✓ Acknowledge
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: '600',
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.primaryText,
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      ✕ Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
