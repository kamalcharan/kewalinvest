// frontend/src/pages/cruiseControl/AlertsTab.tsx
// UPDATED: Using compact card design matching CustomerView JTBDCard

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { RefreshCw, AlertCircle } from 'lucide-react';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';

interface Alert {
  id: number;
  customer_id: number;
  customer_name: string;
  jtbd_type: string;
  jtbd_category: string;
  title: string;
  description: string;
  priority: string;
  next_alert_date: string | null;
  is_active: boolean;
  config_data: any;
  created_at: string;
  completed_at: string | null;
  status: 'active' | 'acknowledged' | 'dismissed';
  notification_type?: string;
  scheme_name?: string;
  is_new?: boolean;
}

interface VisibleAlertsResponse {
  success: boolean;
  data: Alert[];
  meta?: {
    count: number;
    status: string;
    limit: number;
  };
}

interface AlertCounts {
  all: number;
  active: number;
  acknowledged: number;
  dismissed: number;
}

export const AlertsTab: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'dismissed'>('active');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<AlertCounts>({ all: 0, active: 0, acknowledged: 0, dismissed: 0 });

  // Fetch alert counts for all tabs
  const fetchCounts = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await apiService.get<{ success: boolean; data: AlertCounts }>(
        API_ENDPOINTS.JTBD.ALERT_COUNTS
      );

      if (response.success && response.data) {
        setCounts(response.data);
      }
    } catch (err) {
      console.error('Error fetching alert counts:', err);
    }
  }, [isAuthenticated]);

  // Fetch alerts from API
  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get<VisibleAlertsResponse>(
        `${API_ENDPOINTS.JTBD.VISIBLE_ALERTS}?status=${filter}&limit=100`
      );

      if (response.success) {
        setAlerts(response.data || []);
      } else {
        setError('Failed to load alerts');
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, filter]);

  // Fetch counts on mount
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Fetch alerts on mount and when filter changes
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Priority color (matching JTBDCard)
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return colors.semantic.error;
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.utility.secondaryText;
    }
  };

  // Get action-oriented display text (matching JTBDCard logic)
  const getActionText = (alert: Alert): { title: string; subtitle: string } => {
    const config = alert.config_data || {};

    switch (alert.jtbd_type) {
      case 'portfolio_alert':
      case 'goal_sip_plan': {
        const txnType = (config.txn_type || config.investment_type || '').toLowerCase();

        let title = '';
        if (txnType.includes('addition') || txnType.includes('sip')) {
          title = '💰 Investment Due';
        } else if (txnType.includes('redemption')) {
          title = '📤 Redemption Expected';
        } else if (txnType.includes('switch')) {
          title = '🔄 Switch Transaction Due';
        } else if (txnType.includes('recurring')) {
          title = '💰 Recurring Investment Due';
        } else {
          title = alert.title || `📋 ${config.txn_type || 'Payment'} Expected`;
        }

        const amount = config.amount || config.sip_amount;
        const schemeName = config.scheme_name || alert.scheme_name || '';
        const subtitle = amount
          ? `₹${Number(amount).toLocaleString('en-IN')} • ${schemeName}`
          : schemeName;
        return { title, subtitle };
      }

      case 'time_based': {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const title = config.is_recurring ? '🔔 Recurring Reminder' : '📅 One-time Reminder';
        const subtitle = config.alert_date && config.alert_month
          ? `${config.alert_date} ${monthNames[config.alert_month - 1]}`
          : alert.description || '';
        return { title, subtitle };
      }

      case 'profile_trigger': {
        const title = config.trigger_type === 'birthday' ? '🎂 Birthday Reminder' : '💑 Anniversary Reminder';
        const subtitle = config.days_before ? `${config.days_before} days before` : alert.description || '';
        return { title, subtitle };
      }

      case 'import_notification': {
        const notifType = config.notification_type;
        let title = '📋 Import Notification';
        if (notifType === 'new_mf_added') {
          title = '🆕 New MF Added';
        } else if (notifType === 'duplicate_mf_skipped') {
          title = '⏭️ Duplicate Scheme Skipped';
        }
        const subtitle = config.scheme_name || alert.description || '';
        return { title, subtitle };
      }

      default:
        return { title: alert.title, subtitle: alert.description || '' };
    }
  };

  // Format next alert date (matching JTBDCard)
  const formatNextDate = (dateString?: string | null): string => {
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

  const handleAcknowledge = async (alertId: number) => {
    try {
      const response = await apiService.patch<{ success: boolean }>(
        API_ENDPOINTS.JTBD.ACKNOWLEDGE_ALERT(alertId)
      );

      if (response.success) {
        setAlerts(prevAlerts =>
          prevAlerts.map(alert =>
            alert.id === alertId ? { ...alert, status: 'acknowledged' as const } : alert
          )
        );
        // Update counts
        setCounts(prev => ({
          ...prev,
          active: Math.max(0, prev.active - 1),
          acknowledged: prev.acknowledged + 1
        }));
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleDismiss = async (alertId: number) => {
    try {
      const response = await apiService.patch<{ success: boolean }>(
        API_ENDPOINTS.JTBD.DISMISS_ALERT(alertId)
      );

      if (response.success) {
        setAlerts(prevAlerts =>
          prevAlerts.map(alert =>
            alert.id === alertId ? { ...alert, status: 'dismissed' as const } : alert
          )
        );
        // Update counts
        setCounts(prev => ({
          ...prev,
          active: Math.max(0, prev.active - 1),
          dismissed: prev.dismissed + 1
        }));
      }
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const handleViewCustomer = (customerId: number) => {
    navigate(`/customers/${customerId}`);
  };

  // Icons (matching JTBDCard)
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

  const UserIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  return (
    <div>
      {/* Header with Refresh */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '6px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '10px',
          width: 'fit-content'
        }}>
          {(['all', 'active', 'acknowledged', 'dismissed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: filter === status ? colors.brand.primary : 'transparent',
                color: filter === status ? 'white' : colors.utility.primaryText,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              <span style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: filter === status
                  ? 'rgba(255,255,255,0.25)'
                  : status === 'active' && counts.active > 0
                    ? colors.semantic.error + '20'
                    : colors.utility.secondaryText + '15',
                color: filter === status
                  ? 'white'
                  : status === 'active' && counts.active > 0
                    ? colors.semantic.error
                    : colors.utility.secondaryText,
                fontWeight: '700'
              }}>
                {counts[status]}
              </span>
            </button>
          ))}
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchAlerts}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '16px',
          marginBottom: '16px',
          backgroundColor: `${colors.semantic.error}15`,
          border: `1px solid ${colors.semantic.error}40`,
          borderRadius: '8px',
          color: colors.semantic.error,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && alerts.length === 0 ? (
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '12px'
          }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                style={{
                  height: '70px',
                  backgroundColor: colors.utility.primaryBackground,
                  borderRadius: '8px',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  opacity: 0.6
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.6; }
            }
          `}</style>
        </div>
      ) : alerts.length === 0 ? (
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
            {filter === 'active' ? '🎉' : '📭'}
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
            {filter === 'active'
              ? 'All caught up! No alerts require your attention.'
              : `No ${filter} alerts found.`}
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px'
        }}>
          {/* Alert Cards - 2 Column Responsive Grid (matching JTBDList) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '12px'
          }}>
            {alerts.map(alert => {
              const actionText = getActionText(alert);
              const priorityColor = getPriorityColor(alert.priority);
              const isActive = alert.status === 'active';

              return (
                <div
                  key={alert.id}
                  style={{
                    backgroundColor: colors.utility.primaryBackground,
                    border: `1px solid ${isActive ? colors.utility.primaryText + '10' : colors.utility.secondaryText + '40'}`,
                    borderLeft: `3px solid ${priorityColor}`,
                    borderRadius: '6px',
                    padding: '10px 12px',
                    transition: 'all 0.2s ease',
                    opacity: isActive ? 1 : 0.6,
                    minHeight: '60px'
                  }}
                >
                  {/* Single Row Layout - Ultra Compact (matching JTBDCard) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                    {/* Left: Content - Takes most space */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Customer Name - Clickable */}
                      <div
                        onClick={() => handleViewCustomer(alert.customer_id)}
                        style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: colors.brand.primary,
                          marginBottom: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <UserIcon />
                        {alert.customer_name}
                        {alert.is_new && (
                          <span style={{
                            fontSize: '8px',
                            padding: '1px 4px',
                            backgroundColor: colors.semantic.success,
                            color: 'white',
                            borderRadius: '3px',
                            fontWeight: '700',
                            marginLeft: '4px'
                          }}>
                            NEW
                          </span>
                        )}
                      </div>

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
                        {alert.status === 'acknowledged' && (
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
                        {alert.status === 'dismissed' && (
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
                      </div>

                      {/* Subtitle - Truncated */}
                      {actionText.subtitle && (
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
                      )}

                      {/* Bottom Row: Date and Priority - Inline */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          color: colors.utility.primaryText
                        }}>
                          {formatNextDate(alert.next_alert_date)}
                        </div>

                        <span style={{
                          fontSize: '8px',
                          padding: '1px 5px',
                          backgroundColor: priorityColor + '20',
                          color: priorityColor,
                          borderRadius: '3px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {alert.priority}
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
                        {/* Acknowledge */}
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          title="Mark as Done"
                          style={{
                            padding: '5px',
                            backgroundColor: 'transparent',
                            color: colors.semantic.success,
                            border: `1px solid ${colors.semantic.success}80`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '26px',
                            minHeight: '26px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <CheckIcon />
                        </button>

                        {/* Dismiss */}
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          title="Dismiss Alert"
                          style={{
                            padding: '5px',
                            backgroundColor: 'transparent',
                            color: colors.utility.secondaryText,
                            border: `1px solid ${colors.utility.secondaryText}80`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '26px',
                            minHeight: '26px',
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
            })}
          </div>
        </div>
      )}
    </div>
  );
};
