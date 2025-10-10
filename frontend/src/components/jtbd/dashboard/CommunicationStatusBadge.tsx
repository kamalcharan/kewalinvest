// frontend/src/components/jtbd/dashboard/CommunicationStatusBadge.tsx

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CommunicationStatus } from '../../../types/jtbd.types';

interface CommunicationStatusBadgeProps {
  status: CommunicationStatus;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const CommunicationStatusBadge: React.FC<CommunicationStatusBadgeProps> = ({
  status,
  size = 'medium',
  showText = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Size configurations
  const sizeConfig = {
    small: {
      padding: '2px 6px',
      fontSize: '10px',
      iconSize: '8px',
      gap: '3px'
    },
    medium: {
      padding: '4px 10px',
      fontSize: '11px',
      iconSize: '10px',
      gap: '4px'
    },
    large: {
      padding: '6px 12px',
      fontSize: '12px',
      iconSize: '12px',
      gap: '6px'
    }
  };

  const config = sizeConfig[size];

  // Status configurations
  const statusConfig = {
    pending: {
      color: '#F59E0B',
      bg: '#F59E0B20',
      label: 'Pending',
      icon: '⏳'
    },
    scheduled: {
      color: '#3B82F6',
      bg: '#3B82F620',
      label: 'Scheduled',
      icon: '📅'
    },
    sent: {
      color: '#10B981',
      bg: '#10B98120',
      label: 'Sent',
      icon: '✓'
    },
    failed: {
      color: '#EF4444',
      bg: '#EF444420',
      label: 'Failed',
      icon: '✕'
    },
    cancelled: {
      color: '#6B7280',
      bg: '#6B728020',
      label: 'Cancelled',
      icon: '○'
    }
  };

  const currentStatus = statusConfig[status];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: config.gap,
        padding: config.padding,
        backgroundColor: currentStatus.bg,
        borderRadius: '6px',
        fontSize: config.fontSize,
        fontWeight: '600',
        color: currentStatus.color,
        border: `1px solid ${currentStatus.color}40`,
        whiteSpace: 'nowrap'
      }}
    >
      {/* Icon */}
      <span
        style={{
          fontSize: config.iconSize,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {currentStatus.icon}
      </span>

      {/* Text */}
      {showText && (
        <span style={{ textTransform: 'capitalize' }}>
          {currentStatus.label}
        </span>
      )}
    </div>
  );
};

export default CommunicationStatusBadge;