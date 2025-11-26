// frontend/src/components/cruiseControl/AlertBellIcon.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, X, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { JTBD_TYPE_ICONS } from '../../constants/jtbd.constants';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';

interface Alert {
  id: number;
  customer_id: number;
  customer_name: string;
  jtbd_type: string;
  jtbd_category: string;
  title: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  next_alert_date?: string;
  created_at: string;
  config_data?: {
    notification_type?: string;
    scheme_name?: string;
    customer_name?: string;
    sip_amount?: number;
  };
  notification_type?: string;
  scheme_name?: string;
  is_new?: boolean;
}

interface LatestAlertsResponse {
  success: boolean;
  data: Alert[];
  meta?: {
    count: number;
    limit: number;
  };
}

interface AlertBellIconProps {
  alertCount?: number;
}

export const AlertBellIcon: React.FC<AlertBellIconProps> = ({ alertCount = 0 }) => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const { isAuthenticated } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasAlerts = alertCount > 0 || alerts.length > 0;

  // Fetch latest alerts when dropdown opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchLatestAlerts();
    }
  }, [isOpen, isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchLatestAlerts = async () => {
    try {
      setLoading(true);
      const response = await apiService.get<LatestAlertsResponse>(
        `${API_ENDPOINTS.JTBD.LATEST_ALERTS}?limit=10`
      );

      if (response.success) {
        setAlerts(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching latest alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/cruise-control?tab=alerts');
  };

  const handleAlertClick = (alert: Alert) => {
    setIsOpen(false);
    // Navigate to customer view with alert context
    navigate(`/customers/${alert.customer_id}?tab=alerts&alert=${alert.id}`);
  };

  const getAlertIcon = (jtbdType: string) => {
    return JTBD_TYPE_ICONS[jtbdType as keyof typeof JTBD_TYPE_ICONS] || '📋';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return colors.semantic.error;
      case 'high': return '#F97316';
      case 'medium': return colors.semantic.warning;
      case 'low': return colors.brand.primary;
      default: return colors.utility.secondaryText;
    }
  };

  const getNotificationBadge = (alert: Alert) => {
    const notificationType = alert.notification_type || alert.config_data?.notification_type;

    if (notificationType === 'new_mf_added') {
      return { text: 'NEW', color: colors.semantic.success, icon: <CheckCircle size={10} /> };
    }
    if (notificationType === 'duplicate_mf_skipped') {
      return { text: 'SKIP', color: colors.semantic.warning, icon: <AlertCircle size={10} /> };
    }
    if (alert.jtbd_type === 'import_notification') {
      return { text: 'IMPORT', color: '#00BCD4', icon: <Download size={10} /> };
    }
    return null;
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const displayCount = alertCount > 0 ? alertCount : alerts.length;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Icon Button */}
      <div
        onClick={handleBellClick}
        style={{
          position: 'relative',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          backgroundColor: hasAlerts ? `${colors.semantic.error}10` : colors.utility.secondaryBackground,
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = hasAlerts
            ? `${colors.semantic.error}20`
            : `${colors.utility.primaryText}10`;
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = hasAlerts
            ? `${colors.semantic.error}10`
            : colors.utility.secondaryBackground;
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title={hasAlerts ? `${displayCount} alerts` : 'No alerts'}
      >
        <Bell
          size={20}
          color={hasAlerts ? colors.semantic.error : colors.utility.secondaryText}
          style={{
            animation: hasAlerts ? 'bell-ring 2s ease-in-out infinite' : 'none'
          }}
        />

        {displayCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: colors.semantic.error,
              color: 'white',
              borderRadius: '10px',
              minWidth: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: '700',
              padding: '0 6px',
              border: `2px solid ${colors.utility.primaryBackground}`
            }}
          >
            {displayCount > 99 ? '99+' : displayCount}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: '0',
            width: '380px',
            maxHeight: '480px',
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            boxShadow: `0 10px 40px ${colors.utility.primaryText}20`,
            border: `1px solid ${colors.utility.primaryText}10`,
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${colors.utility.primaryText}10`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color={colors.brand.primary} />
              <span style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                Notifications
              </span>
              {alerts.length > 0 && (
                <span style={{
                  backgroundColor: colors.semantic.error,
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '2px 8px',
                  borderRadius: '10px'
                }}>
                  {alerts.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={18} color={colors.utility.secondaryText} />
            </button>
          </div>

          {/* Alert List */}
          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: colors.utility.secondaryText
              }}>
                Loading...
              </div>
            ) : alerts.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: colors.utility.secondaryText
              }}>
                <Bell size={32} color={colors.utility.secondaryText} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ fontSize: '14px' }}>No notifications</div>
              </div>
            ) : (
              alerts.map((alert, index) => {
                const badge = getNotificationBadge(alert);

                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    style={{
                      padding: '14px 20px',
                      borderBottom: index < alerts.length - 1 ? `1px solid ${colors.utility.primaryText}08` : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                      backgroundColor: alert.is_new ? `${colors.brand.primary}05` : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}05`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = alert.is_new ? `${colors.brand.primary}05` : 'transparent'}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      {/* Icon */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: `${getPriorityColor(alert.priority)}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        flexShrink: 0
                      }}>
                        {getAlertIcon(alert.jtbd_type)}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: colors.utility.primaryText,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px'
                          }}>
                            {alert.title}
                          </span>
                          {badge && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontSize: '9px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: `${badge.color}20`,
                              color: badge.color
                            }}>
                              {badge.icon}
                              {badge.text}
                            </span>
                          )}
                          {alert.is_new && (
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: colors.brand.primary
                            }} />
                          )}
                        </div>

                        <div style={{
                          fontSize: '12px',
                          color: colors.utility.secondaryText,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: '4px'
                        }}>
                          {alert.description || alert.customer_name}
                        </div>

                        <div style={{
                          fontSize: '11px',
                          color: colors.utility.secondaryText,
                          opacity: 0.7
                        }}>
                          {formatTimeAgo(alert.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            onClick={handleViewAll}
            style={{
              padding: '14px 20px',
              borderTop: `1px solid ${colors.utility.primaryText}10`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              backgroundColor: colors.utility.secondaryBackground,
              transition: 'background-color 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground}
          >
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.brand.primary
            }}>
              View All Alerts
            </span>
            <ChevronRight size={16} color={colors.brand.primary} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};
