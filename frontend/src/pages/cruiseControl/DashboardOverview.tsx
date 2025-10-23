// frontend/src/pages/cruiseControl/DashboardOverview.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface StatCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
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
      {/* Icon */}
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

      {/* Stats */}
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
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Dummy data
  const stats = {
    totalJobs: 1289,
    successful: 1247,
    failed: 4,
    pending: 38
  };

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
