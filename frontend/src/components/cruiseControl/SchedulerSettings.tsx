// frontend/src/components/cruiseControl/SchedulerSettings.tsx
// Scheduler configuration display for Cruise Control Settings tab

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Clock, Globe, User, RefreshCw, Calendar, AlertCircle } from 'lucide-react';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';

interface JobType {
  code: string;
  name: string;
  description: string;
  default_cron_expression: string;
  default_max_retries: number;
  is_active: boolean;
  default_schedule_type: string;
  failover_enabled: boolean;
  failover_cron_expression: string | null;
  is_global: boolean;
}

// Convert cron expression to human-readable format
const cronToHuman = (cron: string): string => {
  if (!cron) return 'Not scheduled';

  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Format time
  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  // Daily
  if (dayOfMonth === '*' && dayOfWeek === '*') {
    return `Daily at ${time}`;
  }

  // Weekly
  if (dayOfMonth === '*' && dayOfWeek !== '*') {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[parseInt(dayOfWeek)] || dayOfWeek;
    return `Every ${dayName} at ${time}`;
  }

  // Monthly
  if (dayOfMonth !== '*' && dayOfWeek === '*') {
    return `Monthly on day ${dayOfMonth} at ${time}`;
  }

  return cron;
};

// Get icon and color for job type
const getJobTypeStyle = (code: string): { icon: string; color: string } => {
  switch (code) {
    case 'NAV_DOWNLOAD':
      return { icon: '📊', color: '#3B82F6' };
    case 'MARKET_OHLC_DOWNLOAD':
      return { icon: '📈', color: '#10B981' };
    case 'PORTFOLIO_SNAPSHOT':
      return { icon: '📸', color: '#8B5CF6' };
    case 'GOAL_CALCULATION':
      return { icon: '🎯', color: '#F59E0B' };
    case 'DAILY_ALERTS':
      return { icon: '🔔', color: '#EF4444' };
    default:
      return { icon: '⚙️', color: '#6B7280' };
  }
};

export const SchedulerSettings: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobTypes();
  }, []);

  const fetchJobTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get(API_ENDPOINTS.JOBS.TYPES) as any;
      if (response.success && response.data) {
        setJobTypes(response.data);
      }
    } catch (err: any) {
      setError('Failed to load scheduler configuration');
      console.error('Error fetching job types:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: colors.utility.secondaryText
      }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: '12px' }}>Loading scheduler settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: `${colors.semantic.error}10`,
        border: `1px solid ${colors.semantic.error}40`,
        borderRadius: '8px',
        color: colors.semantic.error,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <AlertCircle size={20} />
        {error}
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: colors.utility.primaryBackground,
      border: `1px solid ${colors.utility.primaryText}10`,
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={20} style={{ color: colors.brand.primary }} />
          <div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: 0
            }}>
              Scheduled Jobs
            </h3>
            <p style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              margin: '4px 0 0 0'
            }}>
              Automated tasks run by the system
            </p>
          </div>
        </div>
        <button
          onClick={fetchJobTypes}
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: colors.utility.secondaryText,
            fontSize: '12px'
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Job List */}
      <div style={{ padding: '12px' }}>
        {jobTypes.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            No scheduled jobs configured
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {jobTypes.map(job => {
              const style = getJobTypeStyle(job.code);
              return (
                <div
                  key={job.code}
                  style={{
                    padding: '16px',
                    backgroundColor: colors.utility.secondaryBackground,
                    borderRadius: '8px',
                    border: `1px solid ${colors.utility.primaryText}08`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}>
                    {/* Left: Job Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontSize: '20px' }}>{style.icon}</span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.utility.primaryText
                        }}>
                          {job.name}
                        </span>
                        {/* Global/Tenant Badge */}
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '500',
                          backgroundColor: job.is_global ? `${colors.brand.primary}15` : `${colors.semantic.warning}15`,
                          color: job.is_global ? colors.brand.primary : colors.semantic.warning
                        }}>
                          {job.is_global ? <Globe size={10} /> : <User size={10} />}
                          {job.is_global ? 'Global' : 'Per-Tenant'}
                        </span>
                      </div>

                      <p style={{
                        fontSize: '12px',
                        color: colors.utility.secondaryText,
                        margin: '0 0 12px 0',
                        lineHeight: '1.4'
                      }}>
                        {job.description}
                      </p>

                      {/* Schedule Info */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '16px',
                        fontSize: '12px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: colors.utility.secondaryText
                        }}>
                          <Clock size={14} style={{ color: style.color }} />
                          <span style={{ fontWeight: '500' }}>
                            {cronToHuman(job.default_cron_expression)}
                          </span>
                        </div>

                        {job.failover_enabled && job.failover_cron_expression && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: colors.semantic.warning
                          }}>
                            <RefreshCw size={14} />
                            <span>Failover: {cronToHuman(job.failover_cron_expression)}</span>
                          </div>
                        )}

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: colors.utility.secondaryText
                        }}>
                          <span>Retries: {job.default_max_retries}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '500',
                      backgroundColor: job.is_active ? `${colors.semantic.success}15` : `${colors.utility.secondaryText}15`,
                      color: job.is_active ? colors.semantic.success : colors.utility.secondaryText
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: job.is_active ? colors.semantic.success : colors.utility.secondaryText
                      }} />
                      {job.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div style={{
        padding: '12px 20px',
        borderTop: `1px solid ${colors.utility.primaryText}10`,
        fontSize: '11px',
        color: colors.utility.secondaryText,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Globe size={12} />
        <span>
          <strong>Global</strong> jobs run once and data is available for all tenants.
          <strong> Per-Tenant</strong> jobs run separately for each tenant.
        </span>
      </div>
    </div>
  );
};
