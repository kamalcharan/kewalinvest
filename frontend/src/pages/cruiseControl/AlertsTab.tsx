// frontend/src/pages/cruiseControl/AlertsTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, CheckCircle, XCircle, Clock, RefreshCw, AlertCircle, User } from 'lucide-react';
import { JTBD_TYPE_ICONS, JTBD_TYPE_LABELS, JTBD_TYPE_COLORS } from '../../constants/jtbd.constants';
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

export const AlertsTab: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'dismissed'>('active');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch alerts on mount and when filter changes
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Get badge config based on jtbd_type
  const getBadgeConfig = (jtbdType: string) => {
    const typeColors = JTBD_TYPE_COLORS[jtbdType as keyof typeof JTBD_TYPE_COLORS];
    const defaultColor = colors.brand.secondary;

    return {
      label: JTBD_TYPE_LABELS[jtbdType as keyof typeof JTBD_TYPE_LABELS] || jtbdType,
      icon: JTBD_TYPE_ICONS[jtbdType as keyof typeof JTBD_TYPE_ICONS] || '📋',
      color: typeColors?.border || defaultColor
    };
  };

  const handleAcknowledge = async (alertId: number) => {
    try {
      const response = await apiService.patch(
        API_ENDPOINTS.JTBD.ACKNOWLEDGE_ALERT(alertId)
      );

      if (response.success) {
        // Update local state
        setAlerts(prevAlerts =>
          prevAlerts.map(alert =>
            alert.id === alertId ? { ...alert, status: 'acknowledged' as const } : alert
          )
        );
      }
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleDismiss = async (alertId: number) => {
    try {
      const response = await apiService.patch(
        API_ENDPOINTS.JTBD.DISMISS_ALERT(alertId)
      );

      if (response.success) {
        // Update local state
        setAlerts(prevAlerts =>
          prevAlerts.map(alert =>
            alert.id === alertId ? { ...alert, status: 'dismissed' as const } : alert
          )
        );
      }
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const handleViewCustomer = (customerId: number) => {
    navigate(`/customers/${customerId}`);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'No date';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 0) {
      // Future date
      const futureDays = Math.abs(diffDays);
      if (futureDays === 0) return 'Today';
      if (futureDays === 1) return 'Tomorrow';
      if (futureDays < 7) return `In ${futureDays}d`;
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

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

  // Filter alerts by status (for counting)
  const getStatusCount = (status: 'all' | 'active' | 'acknowledged' | 'dismissed') => {
    if (status === 'all') return alerts.length;
    return alerts.filter(a => a.status === status).length;
  };

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
          padding: '4px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          width: 'fit-content'
        }}>
          {(['all', 'active', 'acknowledged', 'dismissed'] as const).map(status => (
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
              {status} ({status === filter ? alerts.length : '...'})
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
          padding: '64px',
          textAlign: 'center',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px'
        }}>
          <RefreshCw size={48} className="animate-spin" style={{ color: colors.brand.primary, marginBottom: '16px' }} />
          <div style={{ fontSize: '16px', color: colors.utility.secondaryText }}>
            Loading alerts...
          </div>
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
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {alerts.map(alert => {
            const badgeConfig = getBadgeConfig(alert.jtbd_type);
            const isActive = alert.status === 'active';

            return (
              <div
                key={alert.id}
                style={{
                  padding: '16px',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `1px solid ${isActive ? `${badgeConfig.color}40` : `${colors.utility.primaryText}10`}`,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  transition: 'all 0.2s',
                  opacity: isActive ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${badgeConfig.color}60`;
                  e.currentTarget.style.boxShadow = `0 2px 8px ${badgeConfig.color}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isActive ? `${badgeConfig.color}40` : `${colors.utility.primaryText}10`;
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
                  flexShrink: 0,
                  fontSize: '20px'
                }}>
                  {alert.status === 'active' && badgeConfig.icon}
                  {alert.status === 'acknowledged' && <CheckCircle size={20} color={colors.semantic.success} />}
                  {alert.status === 'dismissed' && <XCircle size={20} color={colors.utility.secondaryText} />}
                </div>

                {/* Alert Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Alert Type Badge + New Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '3px 8px',
                      backgroundColor: `${badgeConfig.color}15`,
                      color: badgeConfig.color,
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {badgeConfig.label}
                    </div>
                    {alert.is_new && (
                      <div style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        backgroundColor: colors.semantic.success,
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '700'
                      }}>
                        NEW
                      </div>
                    )}
                  </div>

                  {/* Customer Name - Clickable */}
                  <div
                    onClick={() => handleViewCustomer(alert.customer_id)}
                    style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: colors.brand.primary,
                      marginBottom: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <User size={14} />
                    {alert.customer_name}
                  </div>

                  {/* Alert Title */}
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.utility.primaryText,
                    marginBottom: '4px'
                  }}>
                    {alert.title}
                  </div>

                  {/* Alert Description */}
                  {alert.description && (
                    <div style={{
                      fontSize: '13px',
                      color: colors.utility.secondaryText,
                      lineHeight: '1.5',
                      marginBottom: '8px'
                    }}>
                      {alert.description}
                    </div>
                  )}

                  {/* Time */}
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Clock size={12} />
                    {alert.next_alert_date
                      ? `Due: ${formatDate(alert.next_alert_date)}`
                      : `Created: ${formatDate(alert.created_at)}`}
                  </div>
                </div>

                {/* Action Buttons */}
                {isActive && (
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
                      Acknowledge
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
                      Dismiss
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
