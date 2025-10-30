// frontend/src/pages/cruiseControl/DashboardOverview.tsx

import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import JobsService from '../../services/jobs.service';
import { JobType } from '../../types/jobs.types';

interface StatCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface DashboardStats {
  totalJobs: number;
  successful: number;
  failed: number;
  pending: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, count, icon, color, bgColor }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  return (
    <div style={{
      padding: '20px',
      backgroundColor: colors.utility.primaryBackground,
      border: `1px solid ${colors.utility.primaryText}10`,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flex: 1,
      minWidth: '200px',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = `${color}40`;
      e.currentTarget.style.boxShadow = `0 4px 12px ${color}10`;
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = `${colors.utility.primaryText}10`;
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
    >
      <div style={{
        width: '56px',
        height: '56px',
        backgroundColor: bgColor,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: '28px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          lineHeight: '1',
          marginBottom: '4px'
        }}>
          {count.toLocaleString()}
        </div>
        <div style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          fontWeight: '500'
        }}>
          {title}
        </div>
      </div>
    </div>
  );
};

export const DashboardOverview: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const { environment } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    successful: 0,
    failed: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, [environment]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await JobsService.getStatistics(
        JobType.PORTFOLIO_SNAPSHOT, 
        environment
      );
      
      if (response.success && response.data) {
        // Use the new aggregated counts from backend
        setStats({
          totalJobs: response.data.total_executions || 0,
          successful: response.data.successful_count || 0,
          failed: response.data.failed_count || 0,
          pending: response.data.running_count || 0
        });
      } else {
        setError(response.error || 'Failed to load dashboard statistics');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: colors.utility.secondaryText
      }}>
        <Loader2 size={24} className="animate-spin" style={{ marginRight: '8px' }} />
        Loading dashboard statistics...
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
        color: colors.semantic.error
      }}>
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: colors.utility.primaryText,
        margin: '0 0 16px 0'
      }}>
        Overview
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px'
      }}>
        <StatCard
          title="Total Jobs"
          count={stats.totalJobs}
          icon={<span style={{ fontSize: '28px' }}>📊</span>}
          color={colors.brand.primary}
          bgColor={`${colors.brand.primary}10`}
        />

        <StatCard
          title="Successful"
          count={stats.successful}
          icon={<CheckCircle size={28} color={colors.semantic.success} />}
          color={colors.semantic.success}
          bgColor={`${colors.semantic.success}10`}
        />

        <StatCard
          title="Failed"
          count={stats.failed}
          icon={<XCircle size={28} color={colors.semantic.error} />}
          color={colors.semantic.error}
          bgColor={`${colors.semantic.error}10`}
        />

        <StatCard
          title="Pending"
          count={stats.pending}
          icon={<Clock size={28} color={colors.semantic.warning} />}
          color={colors.semantic.warning}
          bgColor={`${colors.semantic.warning}10`}
        />
      </div>
    </div>
  );
};