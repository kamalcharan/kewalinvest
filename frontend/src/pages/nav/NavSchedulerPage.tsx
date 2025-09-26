// frontend/src/pages/nav/NavSchedulerPage.tsx
// Complete scheduler management interface - PRODUCTION READY - FULL FILE

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useScheduler } from '../../hooks/useNavData';
import { toastService } from '../../services/toast.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';

interface ScheduleFormData {
  schedule_type: 'daily' | 'weekly' | 'custom';
  download_time: string;
  cron_expression: string;
  is_enabled: boolean;
}

const NavSchedulerPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const {
    config,
    status,
    isLoading,
    error,
    saveConfig,
    updateConfig,
    deleteConfig,
    manualTrigger,
    refetch
  } = useScheduler();

  // Form state
  const [formData, setFormData] = useState<ScheduleFormData>({
    schedule_type: config?.schedule_type || 'daily',
    download_time: config?.download_time || '23:00',
    cron_expression: config?.cron_expression || '',
    is_enabled: config?.is_enabled || true
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // Update form when config loads
  React.useEffect(() => {
    if (config) {
      setFormData({
        schedule_type: config.schedule_type,
        download_time: config.download_time,
        cron_expression: config.cron_expression || '',
        is_enabled: config.is_enabled
      });
    }
  }, [config]);

  // Generate cron expression based on schedule type and time
  const generateCronExpression = useCallback((scheduleType: string, downloadTime: string): string => {
    const [hours, minutes] = downloadTime.split(':').map(Number);

    switch (scheduleType) {
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        return `${minutes} ${hours} * * 5`; // Friday
      default:
        return `${minutes} ${hours} * * *`;
    }
  }, []);

  // Handle form field changes
  const handleFieldChange = (field: keyof ScheduleFormData, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate cron expression when schedule type or time changes
      if (field === 'schedule_type' || field === 'download_time') {
        updated.cron_expression = generateCronExpression(
          field === 'schedule_type' ? value as string : updated.schedule_type,
          field === 'download_time' ? value as string : updated.download_time
        );
      }
      
      return updated;
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Validate time format
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.download_time)) {
        throw new Error('Invalid time format. Please use HH:MM format (24-hour)');
      }

      if (config?.id) {
        // Update existing configuration
        await updateConfig({
          schedule_type: formData.schedule_type,
          download_time: formData.download_time,
          cron_expression: formData.cron_expression,
          is_enabled: formData.is_enabled
        });
        toastService.success('Scheduler configuration updated successfully');
      } else {
        // Create new configuration
        await saveConfig({
          schedule_type: formData.schedule_type,
          download_time: formData.download_time,
          cron_expression: formData.cron_expression,
          is_enabled: formData.is_enabled
        });
        toastService.success('Scheduler configuration created successfully');
      }

    } catch (err: any) {
      FrontendErrorLogger.error(
        'Failed to save scheduler configuration',
        'NavSchedulerPage',
        { formData, error: err.message },
        err.stack
      );
      toastService.error(err.message || 'Failed to save configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete configuration
  const handleDelete = async () => {
    if (!config) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete the scheduler configuration? This will stop all automated downloads.'
    );
    
    if (!confirmed) return;

    try {
      await deleteConfig();
      toastService.success('Scheduler configuration deleted');
    } catch (err: any) {
      FrontendErrorLogger.error(
        'Failed to delete scheduler configuration',
        'NavSchedulerPage',
        { configId: config.id, error: err.message },
        err.stack
      );
      toastService.error(err.message || 'Failed to delete configuration');
    }
  };

  // Handle manual trigger
  const handleManualTrigger = async () => {
    if (isTriggering) return;
    
    setIsTriggering(true);
    
    try {
      const result = await manualTrigger();
      toastService.success(`Download triggered successfully. Execution ID: ${result.executionId}`);
    } catch (err: any) {
      FrontendErrorLogger.error(
        'Failed to trigger manual download',
        'NavSchedulerPage',
        { error: err.message },
        err.stack
      );
      toastService.error(err.message || 'Failed to trigger download');
    } finally {
      setIsTriggering(false);
    }
  };

  // Navigation handlers
  const handleBackToDashboard = () => {
    try {
      navigate('/nav/dashboard');
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to dashboard failed',
        'NavSchedulerPage',
        { action: 'navigate_dashboard', error: error.message },
        error.stack
      );
    }
  };

  const handleViewBookmarks = () => {
    try {
      navigate('/nav/bookmarks');
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to bookmarks failed',
        'NavSchedulerPage',
        { action: 'navigate_bookmarks', error: error.message },
        error.stack
      );
    }
  };

  // Format next run time
  const formatNextRun = (dateString?: string | null) => {
    if (!dateString) return 'Not scheduled';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: colors.semantic.error + '10',
          borderRadius: '12px',
          color: colors.semantic.error
        }}>
          <p style={{ marginBottom: '16px' }}>Failed to load scheduler configuration</p>
          <button
            onClick={refetch}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.semantic.error,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: '0 0 4px 0'
            }}>
              NAV Download Scheduler
            </h1>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              Configure automated daily downloads for your bookmarked schemes
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleViewBookmarks}
              style={{
                padding: '10px 16px',
                backgroundColor: colors.brand.secondary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              📚 Bookmarks
            </button>
            
            <button
              onClick={handleBackToDashboard}
              style={{
                padding: '10px 16px',
                backgroundColor: 'transparent',
                color: colors.brand.primary,
                border: `1px solid ${colors.brand.primary}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Status Card */}
        {status && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '16px'
            }}>
              Scheduler Status
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div style={{
                padding: '12px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  marginBottom: '4px'
                }}>
                  Status
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: status.is_running ? colors.semantic.success : colors.semantic.warning
                }}>
                  {status.is_running ? '✅ Running' : '⏸️ Stopped'}
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  marginBottom: '4px'
                }}>
                  Next Run
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}>
                  {formatNextRun(status.next_run)}
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  marginBottom: '4px'
                }}>
                  Executions
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}>
                  {status.config.execution_count || 0}
                </div>
              </div>

              <div style={{
                padding: '12px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  marginBottom: '4px'
                }}>
                  Failures
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: (status.config.failure_count || 0) > 0 ? colors.semantic.error : colors.utility.primaryText
                }}>
                  {status.config.failure_count || 0}
                </div>
              </div>
            </div>

            {/* Manual Trigger Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '16px',
              borderTop: `1px solid ${colors.utility.primaryText}10`
            }}>
              <button
                onClick={handleManualTrigger}
                disabled={isTriggering || !config?.is_enabled}
                style={{
                  padding: '12px 24px',
                  backgroundColor: (isTriggering || !config?.is_enabled) 
                    ? colors.utility.secondaryText 
                    : colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (isTriggering || !config?.is_enabled) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isTriggering ? (
                  <>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Triggering...
                  </>
                ) : (
                  <>▶️ Trigger Download Now</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Configuration Form */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: 0
            }}>
              {config ? 'Update Configuration' : 'Create Schedule'}
            </h3>

            {config && (
              <button
                onClick={handleDelete}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: colors.semantic.error,
                  border: `1px solid ${colors.semantic.error}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                🗑️ Delete
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gap: '20px'
            }}>
              {/* Enable/Disable Toggle */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.is_enabled}
                    onChange={(e) => handleFieldChange('is_enabled', e.target.checked)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: colors.utility.primaryText
                  }}>
                    Enable Automated Downloads
                  </span>
                </label>
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  marginTop: '8px',
                  marginLeft: '32px'
                }}>
                  When enabled, NAV data will be downloaded automatically at the scheduled time
                </p>
              </div>

              {/* Schedule Type */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.utility.primaryText,
                  marginBottom: '8px'
                }}>
                  Schedule Type *
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px'
                }}>
                  {[
                    { value: 'daily', label: 'Daily', description: 'Every day' },
                    { value: 'weekly', label: 'Weekly', description: 'Every Friday' },
                    { value: 'custom', label: 'Custom', description: 'Custom cron' }
                  ].map((option) => (
                    <label
                      key={option.value}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '16px',
                        backgroundColor: formData.schedule_type === option.value 
                          ? colors.brand.primary + '20' 
                          : colors.utility.primaryBackground,
                        border: `2px solid ${formData.schedule_type === option.value 
                          ? colors.brand.primary 
                          : 'transparent'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <input
                        type="radio"
                        name="schedule_type"
                        value={option.value}
                        checked={formData.schedule_type === option.value}
                        onChange={(e) => handleFieldChange('schedule_type', e.target.value)}
                        style={{ display: 'none' }}
                      />
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: colors.utility.primaryText,
                        marginBottom: '4px'
                      }}>
                        {option.label}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: colors.utility.secondaryText
                      }}>
                        {option.description}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Download Time */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.utility.primaryText,
                  marginBottom: '8px'
                }}>
                  Download Time *
                </label>
                <input
                  type="time"
                  value={formData.download_time}
                  onChange={(e) => handleFieldChange('download_time', e.target.value)}
                  required
                  style={{
                    width: '200px',
                    padding: '12px 16px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '8px',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  marginTop: '8px'
                }}>
                  Time when downloads will be triggered (24-hour format)
                </p>
              </div>

              {/* Advanced Options */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    color: colors.brand.primary,
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {showAdvanced ? '▼' : '▶'} Advanced Options
                </button>

                {showAdvanced && (
                  <div style={{
                    marginTop: '16px',
                    padding: '16px',
                    backgroundColor: colors.utility.primaryBackground,
                    borderRadius: '8px',
                    border: `1px solid ${colors.utility.primaryText}10`
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: colors.utility.primaryText,
                        marginBottom: '8px'
                      }}>
                        Cron Expression
                      </label>
                      <input
                        type="text"
                        value={formData.cron_expression}
                        onChange={(e) => handleFieldChange('cron_expression', e.target.value)}
                        placeholder="0 23 * * *"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          border: `1px solid ${colors.utility.primaryText}20`,
                          borderRadius: '8px',
                          backgroundColor: colors.utility.secondaryBackground,
                          color: colors.utility.primaryText,
                          fontSize: '14px',
                          outline: 'none',
                          fontFamily: 'monospace'
                        }}
                      />
                      <p style={{
                        fontSize: '12px',
                        color: colors.utility.secondaryText,
                        marginTop: '8px'
                      }}>
                        Custom cron expression (auto-generated based on schedule type and time)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: `1px solid ${colors.utility.primaryText}10`
              }}>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: (isSubmitting || isLoading) 
                      ? colors.utility.secondaryText 
                      : colors.brand.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (isSubmitting || isLoading) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      {config ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>💾 {config ? 'Update Schedule' : 'Create Schedule'}</>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Recent Executions */}
        {status?.recent_executions && status.recent_executions.length > 0 && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
            marginTop: '24px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '16px'
            }}>
              Recent Executions
            </h3>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {status.recent_executions.slice(0, 5).map((execution) => (
                <div
                  key={execution.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: colors.utility.primaryBackground,
                    borderRadius: '8px',
                    border: `1px solid ${execution.status === 'success' 
                      ? colors.semantic.success + '30' 
                      : execution.status === 'failed' 
                      ? colors.semantic.error + '30' 
                      : colors.utility.primaryText + '10'}`
                  }}
                >
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.utility.primaryText,
                      marginBottom: '4px'
                    }}>
                      {new Date(execution.execution_time).toLocaleString()}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: colors.utility.secondaryText
                    }}>
                      {execution.n8n_execution_id && `Execution ID: ${execution.n8n_execution_id}`}
                      {execution.execution_duration_ms && ` • Duration: ${(execution.execution_duration_ms / 1000).toFixed(1)}s`}
                      {execution.error_message && (
                        <div style={{
                          marginTop: '4px',
                          fontSize: '12px',
                          color: colors.semantic.error
                        }}>
                          Error: {execution.error_message}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: execution.status === 'success' 
                        ? colors.semantic.success + '20'
                        : execution.status === 'failed' 
                        ? colors.semantic.error + '20' 
                        : colors.utility.secondaryText + '20',
                      color: execution.status === 'success' 
                        ? colors.semantic.success
                        : execution.status === 'failed' 
                        ? colors.semantic.error 
                        : colors.utility.secondaryText
                    }}>
                      {execution.status === 'success' ? '✅ Success' 
                        : execution.status === 'failed' ? '❌ Failed' 
                        : '⏸️ Skipped'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {status.recent_executions.length > 5 && (
              <div style={{
                textAlign: 'center',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: `1px solid ${colors.utility.primaryText}10`
              }}>
                <span style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText
                }}>
                  Showing 5 of {status.recent_executions.length} recent executions
                </span>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px',
          marginTop: '24px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '16px'
          }}>
            How It Works
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                🕒 Schedule Types
              </div>
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText
              }}>
                <strong>Daily:</strong> Downloads NAV data every day at your chosen time<br />
                <strong>Weekly:</strong> Downloads only on Fridays (NAV update day)<br />
                <strong>Custom:</strong> Use your own cron expression for precise control
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                📥 What Gets Downloaded
              </div>
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText
              }}>
                Only NAV data for your bookmarked schemes will be downloaded. 
                The system checks for new data and avoids duplicates automatically.
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                ⚡ Manual Triggers
              </div>
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText
              }}>
                You can trigger downloads manually at any time using the "Trigger Now" button, 
                even if the scheduler is disabled.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NavSchedulerPage;