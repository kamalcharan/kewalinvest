// frontend/src/pages/OperationalDashboard.tsx
// Operational Dashboard - Shows overall operations, not customer-specific

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Loader2, AlertTriangle, Target, Calendar, TrendingDown, Users, CheckCircle } from 'lucide-react';
import apiService from '../services/api.service';
import { API_ENDPOINTS } from '../services/serviceURLs';
import toastService from '../services/toast.service';

interface DashboardStats {
  total_customers: number;
  total_goals: number;
  bookmarked_goals: number;
  goals_behind: number;
  upcoming_meetings_count: number;
  pending_alerts: number;
}

interface GoalDeviation {
  id: number;
  customer_id: number;
  customer_name: string;
  goal_type: string;
  goal_config: any;
  current_value: number | null;
  target_value: number | null;
  target_date: string | null;
  deviation_percentage: number;
  status: string;
  days_remaining: number | null;
}

interface UpcomingMeeting {
  id: number;
  customer_id: number;
  customer_name: string;
  meeting_type: string;
  meeting_mode: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  agenda: string | null;
  days_until: number;
}

interface DashboardAlert {
  id: number;
  type: string;
  severity: string;
  message: string;
  customer_id: number | null;
  customer_name: string | null;
}

const OperationalDashboard: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [goalDeviations, setGoalDeviations] = useState<GoalDeviation[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all dashboard data in parallel
      const [statsRes, deviationsRes, meetingsRes, alertsRes] = await Promise.all([
        apiService.get(API_ENDPOINTS.DASHBOARD.STATISTICS) as any,
        apiService.get(API_ENDPOINTS.DASHBOARD.GOAL_DEVIATIONS + '?limit=5') as any,
        apiService.get(API_ENDPOINTS.DASHBOARD.UPCOMING_MEETINGS + '?limit=5') as any,
        apiService.get(API_ENDPOINTS.DASHBOARD.ALERTS + '?limit=3') as any
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      }

      if (deviationsRes.success) {
        setGoalDeviations(deviationsRes.data || []);
      }

      if (meetingsRes.success) {
        setUpcomingMeetings(meetingsRes.data || []);
      }

      if (alertsRes.success) {
        setAlerts(alertsRes.data || []);
      }

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toastService.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'BEHIND':
        return colors.semantic.error;
      case 'AT_RISK':
        return colors.semantic.warning;
      case 'ON_TRACK':
        return colors.semantic.success;
      default:
        return colors.utility.secondaryText;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return colors.semantic.error;
      case 'medium':
        return colors.semantic.warning;
      case 'low':
        return colors.brand.secondary;
      default:
        return colors.utility.secondaryText;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        color: colors.utility.secondaryText
      }}>
        <Loader2 size={32} className="animate-spin" style={{ marginRight: '12px' }} />
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground
    }}>
      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div style={{
          backgroundColor: `${colors.semantic.warning}15`,
          borderBottom: `2px solid ${colors.semantic.warning}`,
          padding: '12px 32px'
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={20} color={colors.semantic.warning} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                  {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginTop: '2px' }}>
                  {alerts[0].message}
                  {alerts.length > 1 && ` +${alerts.length - 1} more`}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        padding: '24px 32px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            margin: '0 0 8px 0'
          }}>
            Operational Dashboard
          </h1>
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            Overview of all operations and key metrics
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 24px'
      }}>
        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <StatCard
            icon={<Users size={24} />}
            label="Total Customers"
            value={stats?.total_customers || 0}
            color={colors.brand.primary}
            onClick={() => navigate('/customers')}
          />
          <StatCard
            icon={<Target size={24} />}
            label="Bookmarked Goals"
            value={stats?.bookmarked_goals || 0}
            color={colors.semantic.success}
            onClick={() => navigate('/dashboard/bookmarked-goals')}
          />
          <StatCard
            icon={<TrendingDown size={24} />}
            label="Goals Behind/At Risk"
            value={stats?.goals_behind || 0}
            color={colors.semantic.error}
          />
          <StatCard
            icon={<Calendar size={24} />}
            label="Upcoming Meetings"
            value={stats?.upcoming_meetings_count || 0}
            subLabel="Next 30 days"
            color={colors.brand.secondary}
          />
        </div>

        {/* Goal Deviations and Meetings */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {/* Goal Deviations */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                margin: 0
              }}>
                Top Goal Deviations
              </h2>
              <button
                onClick={() => navigate('/dashboard/bookmarked-goals?status=behind')}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.brand.primary}`,
                  borderRadius: '6px',
                  color: colors.brand.primary,
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                View All
              </button>
            </div>

            {goalDeviations.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: colors.utility.secondaryText
              }}>
                <CheckCircle size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div>All goals are on track!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {goalDeviations.map((deviation) => (
                  <div
                    key={deviation.id}
                    onClick={() => navigate(`/customers/${deviation.customer_id}`)}
                    style={{
                      padding: '16px',
                      backgroundColor: colors.utility.primaryBackground,
                      borderRadius: '8px',
                      border: `1px solid ${getStatusColor(deviation.status)}40`,
                      borderLeft: `4px solid ${getStatusColor(deviation.status)}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
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
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: colors.utility.primaryText
                        }}>
                          {deviation.goal_config?.goal_name || 'Unnamed Goal'}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: colors.utility.secondaryText,
                          marginTop: '2px'
                        }}>
                          {deviation.customer_name} • {deviation.goal_type}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: `${getStatusColor(deviation.status)}20`,
                        color: getStatusColor(deviation.status)
                      }}>
                        {deviation.status}
                      </div>
                    </div>
                    {deviation.current_value && deviation.target_value && (
                      <div style={{
                        fontSize: '13px',
                        color: colors.utility.secondaryText,
                        display: 'flex',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}>
                        <span>Current: {formatCurrency(deviation.current_value)}</span>
                        <span>Target: {formatCurrency(deviation.target_value)}</span>
                        {deviation.days_remaining && (
                          <span>{Math.abs(deviation.days_remaining)} days {deviation.days_remaining < 0 ? 'overdue' : 'remaining'}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Meetings */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                margin: 0
              }}>
                Upcoming Meetings
              </h2>
            </div>

            {upcomingMeetings.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: colors.utility.secondaryText
              }}>
                <Calendar size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div>No meetings scheduled in the next 30 days</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    onClick={() => navigate(`/customers/${meeting.customer_id}`)}
                    style={{
                      padding: '16px',
                      backgroundColor: colors.utility.primaryBackground,
                      borderRadius: '8px',
                      border: `1px solid ${colors.utility.primaryText}10`,
                      borderLeft: `4px solid ${meeting.days_until <= 2 ? colors.semantic.warning : colors.brand.primary}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
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
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: colors.utility.primaryText
                        }}>
                          {meeting.customer_name}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: colors.utility.secondaryText,
                          marginTop: '2px'
                        }}>
                          {meeting.meeting_type} • {meeting.meeting_mode}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: meeting.days_until <= 2 ? `${colors.semantic.warning}20` : `${colors.brand.primary}20`,
                        color: meeting.days_until <= 2 ? colors.semantic.warning : colors.brand.primary
                      }}>
                        {meeting.days_until === 0 ? 'Today' : meeting.days_until === 1 ? 'Tomorrow' : `In ${meeting.days_until} days`}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: colors.utility.secondaryText,
                      display: 'flex',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}>
                      <span>📅 {formatDate(meeting.scheduled_date)}</span>
                      <span>🕐 {meeting.scheduled_time}</span>
                      <span>⏱ {meeting.duration_minutes} min</span>
                    </div>
                    {meeting.agenda && (
                      <div style={{
                        fontSize: '13px',
                        color: colors.utility.secondaryText,
                        marginTop: '8px',
                        fontStyle: 'italic'
                      }}>
                        {meeting.agenda}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px'
        }}>
          <QuickActionCard
            title="Explore All Goals"
            description="View and manage all bookmarked goals"
            icon={<Target size={20} />}
            onClick={() => navigate('/dashboard/bookmarked-goals')}
            colors={colors}
          />
          <QuickActionCard
            title="Customer Management"
            description="View and manage customer accounts"
            icon={<Users size={20} />}
            onClick={() => navigate('/customers')}
            colors={colors}
          />
          <QuickActionCard
            title="Cruise Control"
            description="Monitor NAV downloads and market data"
            icon={<CheckCircle size={20} />}
            onClick={() => navigate('/cruise-control')}
            colors={colors}
          />
        </div>
      </div>
    </div>
  );
};

// Helper Components
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subLabel?: string;
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subLabel, color, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '24px',
      backgroundColor: color,
      color: '#fff',
      borderRadius: '12px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
      boxShadow: `0 2px 8px ${color}30`
    }}
    onMouseEnter={(e) => {
      if (onClick) {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 8px 16px ${color}40`;
      }
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = `0 2px 8px ${color}30`;
    }}
  >
    <div style={{ marginBottom: '12px', opacity: 0.9 }}>{icon}</div>
    <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px' }}>
      {value.toLocaleString()}
    </div>
    <div style={{ fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>
      {label}
    </div>
    {subLabel && (
      <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
        {subLabel}
      </div>
    )}
  </div>
);

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  colors: any;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ title, description, icon, onClick, colors }) => (
  <div
    onClick={onClick}
    style={{
      padding: '20px',
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '10px',
      border: `1px solid ${colors.utility.primaryText}10`,
      cursor: 'pointer',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = colors.brand.primary;
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 4px 12px ${colors.utility.primaryText}10`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = `${colors.utility.primaryText}10`;
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '8px'
    }}>
      <div style={{ color: colors.brand.primary }}>{icon}</div>
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: colors.utility.primaryText
      }}>
        {title}
      </div>
    </div>
    <div style={{
      fontSize: '13px',
      color: colors.utility.secondaryText
    }}>
      {description}
    </div>
  </div>
);

export default OperationalDashboard;
