// frontend/src/components/cruiseControl/AlertBellIcon.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface AlertBellIconProps {
  alertCount?: number;
}

export const AlertBellIcon: React.FC<AlertBellIconProps> = ({ alertCount = 7 }) => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const hasAlerts = alertCount > 0;

  return (
    <div
      onClick={() => navigate('/cruise-control?tab=alerts')}
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
      title={hasAlerts ? `${alertCount} active alerts` : 'No alerts'}
    >
      <Bell
        size={20}
        color={hasAlerts ? colors.semantic.error : colors.utility.secondaryText}
        style={{
          animation: hasAlerts ? 'bell-ring 2s ease-in-out infinite' : 'none'
        }}
      />

      {hasAlerts && (
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
          {alertCount > 99 ? '99+' : alertCount}
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
