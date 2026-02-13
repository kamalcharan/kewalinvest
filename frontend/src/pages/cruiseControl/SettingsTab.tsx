// frontend/src/pages/cruiseControl/SettingsTab.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { DefaultIndexSettings } from '../../components/performance/DefaultIndexSettings';
import { SchedulerSettings } from '../../components/cruiseControl/SchedulerSettings';
import { DataCleanupSection } from '../../components/cruiseControl/DataCleanupSection';
import { RefreshCw, AlertCircle } from 'lucide-react';
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
  is_global: boolean;
  tenant_is_enabled: boolean | null;
  tenant_cron_expression: string | null;
}

export const SettingsTab: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [unconfiguredJobs, setUnconfiguredJobs] = useState<JobType[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check if a job is configured for this tenant
  const isJobConfigured = (job: JobType): boolean => {
    if (job.is_global) return true;
    return job.tenant_cron_expression !== null;
  };

  // Fetch job types to check for unconfigured jobs
  useEffect(() => {
    fetchJobTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchJobTypes = async () => {
    try {
      const response = await apiService.get(API_ENDPOINTS.JOBS.TYPES) as any;
      if (response.success && response.data) {
        const unconfigured = response.data.filter((job: JobType) => !isJobConfigured(job));
        setUnconfiguredJobs(unconfigured);
      }
    } catch (err) {
      console.error('Error fetching job types:', err);
    }
  };

  // Activate ALL unconfigured jobs at once
  const handleActivateAllConfigs = async () => {
    if (unconfiguredJobs.length === 0) return;

    setIsActivating(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const job of unconfiguredJobs) {
        try {
          const response = await apiService.post(
            `${API_ENDPOINTS.JOBS.CONFIG(job.code)}?is_live=true`,
            {
              schedule_type: job.default_schedule_type || 'daily',
              cron_expression: job.default_cron_expression,
              is_enabled: true,
              max_retries: job.default_max_retries || 3
            }
          ) as any;

          if (response.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          failCount++;
          console.error(`Failed to activate ${job.code}:`, err);
        }
      }

      if (successCount > 0) {
        toastService.success(`Activated ${successCount} job configuration${successCount > 1 ? 's' : ''} successfully`);
      }
      if (failCount > 0) {
        toastService.error(`Failed to activate ${failCount} job${failCount > 1 ? 's' : ''}`);
      }

      // Refresh job types and scheduler
      await fetchJobTypes();
      setRefreshKey(prev => prev + 1); // Force SchedulerSettings to refresh
    } catch (err) {
      toastService.error('Failed to activate configurations');
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Cruise Control Settings
          </h2>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            Configure your preferences and view scheduled jobs
          </p>
        </div>

        {/* Activate All Configurations Button - Only show if there are unconfigured jobs */}
        {unconfiguredJobs.length > 0 && (
          <button
            onClick={handleActivateAllConfigs}
            disabled={isActivating}
            style={{
              padding: '10px 16px',
              backgroundColor: colors.semantic.warning,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isActivating ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isActivating ? 0.7 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            {isActivating ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Activating...
              </>
            ) : (
              <>
                <AlertCircle size={16} />
                Activate Configuration ({unconfiguredJobs.length})
              </>
            )}
          </button>
        )}
      </div>

      {/* Scheduler Settings - Shows all scheduled jobs */}
      <SchedulerSettings key={refreshKey} />

      {/* Default Index Settings */}
      <div style={{ marginTop: '24px' }}>
        <DefaultIndexSettings />
      </div>

      {/* Data Cleanup Section */}
      <DataCleanupSection />

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
