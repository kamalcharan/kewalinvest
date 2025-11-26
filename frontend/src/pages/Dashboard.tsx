// frontend/src/pages/Dashboard.tsx
// Coming Soon placeholder for Portfolio Management Dashboard

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { BarChart3, Clock } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        padding: '20px 32px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          margin: '0 0 4px 0'
        }}>
          Portfolio Management System
        </h1>
        <div style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          margin: 0
        }}>
          Fund Manager Dashboard
        </div>
      </div>

      {/* Coming Soon Content */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '80px 24px',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '16px',
          padding: '48px 32px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          {/* Icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: `${colors.brand.primary}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <BarChart3 size={40} style={{ color: colors.brand.primary }} />
          </div>

          {/* Title */}
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            margin: '0 0 12px 0'
          }}>
            Coming Soon
          </h2>

          {/* Description */}
          <p style={{
            fontSize: '15px',
            color: colors.utility.secondaryText,
            margin: '0 0 24px 0',
            lineHeight: '1.6'
          }}>
            The Portfolio Management Dashboard is under development.
            This will provide comprehensive portfolio analytics, performance tracking,
            and rebalancing recommendations.
          </p>

          {/* Status Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: `${colors.semantic.warning}15`,
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '500',
            color: colors.semantic.warning
          }}>
            <Clock size={14} />
            In Development
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
