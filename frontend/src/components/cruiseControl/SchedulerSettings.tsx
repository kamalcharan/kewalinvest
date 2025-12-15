// frontend/src/components/cruiseControl/SchedulerSettings.tsx
// Scheduler configuration display with edit functionality

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Clock, RefreshCw, Calendar, AlertCircle, Settings } from 'lucide-react';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import toastService from '../../services/toast.service';

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
  // Tenant-specific config fields (null if not configured)
  tenant_is_enabled: boolean | null;
  tenant_cron_expression: string | null;
}

interface EditModalProps {
  job: JobType;
  onClose: () => void;
  onSave: (jobCode: string, hour: string, minute: string) => Promise<void>;
  colors: any;
}

// Parse cron expression to get all parts
const parseCron = (cron: string): { hour: string; minute: string; dayOfMonth: string; month: string; dayOfWeek: string } => {
  const parts = cron.split(' ');
  if (parts.length >= 5) {
    return {
      minute: parts[0].padStart(2, '0'),
      hour: parts[1].padStart(2, '0'),
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4]
    };
  }
  return { hour: '00', minute: '00', dayOfMonth: '*', month: '*', dayOfWeek: '*' };
};

// Check if a job type is editable (can change schedule)
const isJobEditable = (jobCode: string): boolean => {
  // NAV_DOWNLOAD and MARKET_OHLC_DOWNLOAD schedules cannot be changed
  const nonEditableJobs = ['NAV_DOWNLOAD', 'MARKET_OHLC_DOWNLOAD'];
  return !nonEditableJobs.includes(jobCode);
};

// Convert cron expression to human-readable format
const cronToHuman = (cron: string): string => {
  if (!cron) return 'Not scheduled';

  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Format time in 12-hour format
  const hourNum = parseInt(hour);
  const period = hourNum >= 12 ? 'PM' : 'AM';
  const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  const time = `${hour12}:${minute.padStart(2, '0')} ${period}`;

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

// Edit Modal Component
const EditScheduleModal: React.FC<EditModalProps> = ({ job, onClose, onSave, colors }) => {
  const cronParts = parseCron(job.default_cron_expression);
  const [hour, setHour] = useState(cronParts.hour);
  const [minute, setMinute] = useState(cronParts.minute);
  const [saving, setSaving] = useState(false);

  // Build preview cron preserving existing day fields
  const getPreviewCron = () => `${minute} ${hour} ${cronParts.dayOfMonth} ${cronParts.month} ${cronParts.dayOfWeek}`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(job.code, hour, minute);
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setSaving(false);
    }
  };

  // Generate hour options (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  // Generate minute options (0, 15, 30, 45)
  const minutes = ['00', '15', '30', '45'];

  const style = getJobTypeStyle(job.code);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <span style={{ fontSize: '24px' }}>{style.icon}</span>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                margin: 0
              }}>
                Edit Schedule
              </h3>
              <p style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                margin: '4px 0 0 0'
              }}>
                {job.name}
              </p>
            </div>
          </div>

          {/* Current Schedule */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginBottom: '4px'
            }}>
              Current Schedule
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              {cronToHuman(job.default_cron_expression)}
            </div>
          </div>

          {/* Time Picker */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              fontSize: '13px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '8px',
              display: 'block'
            }}>
              New Time
            </label>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              {/* Hour Select */}
              <select
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: '16px',
                  fontWeight: '500',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '8px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {hours.map(h => {
                  const hNum = parseInt(h);
                  const period = hNum >= 12 ? 'PM' : 'AM';
                  const h12 = hNum === 0 ? 12 : hNum > 12 ? hNum - 12 : hNum;
                  return (
                    <option key={h} value={h}>
                      {h12}:00 {period} ({h}:00)
                    </option>
                  );
                })}
              </select>

              <span style={{
                fontSize: '20px',
                fontWeight: '600',
                color: colors.utility.secondaryText
              }}>:</span>

              {/* Minute Select */}
              <select
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: '16px',
                  fontWeight: '500',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '8px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {minutes.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Preview */}
            <div style={{
              marginTop: '12px',
              padding: '10px 12px',
              backgroundColor: `${colors.brand.primary}10`,
              borderRadius: '6px',
              fontSize: '13px',
              color: colors.brand.primary,
              textAlign: 'center'
            }}>
              Will run: <strong>{cronToHuman(getPreviewCron())}</strong>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.secondaryText}`,
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: saving ? 0.6 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                opacity: saving ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {saving ? (
                <>
                  <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export const SchedulerSettings: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<JobType | null>(null);

  // Check if a job is configured for this tenant
  const isJobConfigured = (job: JobType): boolean => {
    // Global jobs don't need per-tenant config check in the same way
    if (job.is_global) return true;
    // Per-tenant jobs need tenant_cron_expression to be set
    return job.tenant_cron_expression !== null;
  };

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

  const handleSaveSchedule = async (jobCode: string, hour: string, minute: string) => {
    try {
      // Find the job to get existing cron expression
      const job = jobTypes.find(j => j.code === jobCode);
      if (!job) {
        throw new Error('Job not found');
      }

      // Parse existing cron to preserve day fields
      const existingCron = parseCron(job.default_cron_expression);

      // Build cron expression preserving day-of-month, month, day-of-week
      const cronExpression = `${minute} ${hour} ${existingCron.dayOfMonth} ${existingCron.month} ${existingCron.dayOfWeek}`;

      // Add is_live=true query parameter
      const response = await apiService.put(
        `${API_ENDPOINTS.JOBS.CONFIG(jobCode)}?is_live=true`,
        { cron_expression: cronExpression }
      ) as any;

      if (response.success) {
        toastService.success('Schedule updated successfully');
        // Refresh job types to show updated schedule
        await fetchJobTypes();
      } else {
        throw new Error(response.error || 'Failed to update schedule');
      }
    } catch (err: any) {
      toastService.error(err.message || 'Failed to update schedule');
      throw err;
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
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
    <>
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
                Click the settings icon to change job timing
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

                      {/* Right: Status + Actions */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {/* Edit Button - Only show for editable and configured jobs */}
                        {isJobConfigured(job) && isJobEditable(job.code) && (
                          <button
                            onClick={() => setEditingJob(job)}
                            title="Edit Schedule"
                            style={{
                              padding: '6px',
                              backgroundColor: 'transparent',
                              color: colors.utility.secondaryText,
                              border: `1px solid ${colors.utility.primaryText}20`,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                              e.currentTarget.style.color = colors.brand.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = colors.utility.secondaryText;
                            }}
                          >
                            <Settings size={16} />
                          </button>
                        )}

                        {/* Status Badge */}
                        {!isJobConfigured(job) ? (
                          // Not Configured Badge
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: `${colors.semantic.warning}15`,
                            color: colors.semantic.warning
                          }}>
                            <AlertCircle size={12} />
                            Not Configured
                          </div>
                        ) : (
                          // Active/Inactive Badge
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
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingJob && (
        <EditScheduleModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onSave={handleSaveSchedule}
          colors={colors}
        />
      )}
    </>
  );
};
