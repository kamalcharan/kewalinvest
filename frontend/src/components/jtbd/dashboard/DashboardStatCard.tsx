// frontend/src/components/jtbd/dashboard/DashboardStatCard.tsx

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface DashboardStatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  onClick?: () => void;
  isActive?: boolean;
}

const DashboardStatCard: React.FC<DashboardStatCardProps> = ({
  icon,
  value,
  label,
  color,
  onClick,
  isActive = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '20px',
        backgroundColor: isActive ? color + '15' : colors.utility.secondaryBackground,
        border: `2px solid ${isActive ? color : colors.utility.primaryText + '10'}`,
        borderRadius: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '10px',
          backgroundColor: color + '20',
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          fontSize: '24px'
        }}
      >
        {icon}
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: '32px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '4px',
          lineHeight: 1
        }}
      >
        {value.toLocaleString()}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: '500',
          color: colors.utility.secondaryText,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {label}
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div
          style={{
            marginTop: '12px',
            padding: '4px 8px',
            backgroundColor: color + '20',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '600',
            color: color,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          Active Filter
        </div>
      )}
    </div>
  );
};

export default DashboardStatCard;