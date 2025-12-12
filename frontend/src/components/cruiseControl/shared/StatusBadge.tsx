// frontend/src/components/cruiseControl/shared/StatusBadge.tsx
// Shared status badge component for Cruise Control tabs

import React from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

export interface StatusBadgeProps {
  status: string;
  type: 'download' | 'metrics' | 'gaps';
  gapCount?: number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type, gapCount }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  let bgColor = '';
  let textColor = '';
  let label = '';
  let icon: React.ReactNode = null;

  if (type === 'download') {
    switch (status) {
      case 'success':
        bgColor = `${colors.semantic.success}15`;
        textColor = colors.semantic.success;
        label = 'Success';
        icon = <CheckCircle size={12} />;
        break;
      case 'failed':
        bgColor = `${colors.semantic.error}15`;
        textColor = colors.semantic.error;
        label = 'Failed';
        icon = <XCircle size={12} />;
        break;
      case 'pending':
        bgColor = `${colors.semantic.warning}15`;
        textColor = colors.semantic.warning;
        label = 'Pending';
        icon = <Clock size={12} />;
        break;
      case 'not_configured':
        bgColor = `${colors.utility.secondaryText}15`;
        textColor = colors.utility.secondaryText;
        label = 'Not Configured';
        icon = <AlertTriangle size={12} />;
        break;
    }
  } else if (type === 'metrics') {
    switch (status) {
      case 'calculated':
        bgColor = `${colors.semantic.success}15`;
        textColor = colors.semantic.success;
        label = 'Calculated';
        icon = <CheckCircle size={12} />;
        break;
      case 'partial':
        bgColor = `${colors.semantic.warning}15`;
        textColor = colors.semantic.warning;
        label = 'Partial';
        icon = <Clock size={12} />;
        break;
      case 'pending':
        bgColor = `${colors.utility.secondaryText}15`;
        textColor = colors.utility.secondaryText;
        label = 'Pending';
        icon = <Clock size={12} />;
        break;
      case 'not_configured':
        bgColor = `${colors.utility.secondaryText}15`;
        textColor = colors.utility.secondaryText;
        label = 'Not Configured';
        icon = <AlertTriangle size={12} />;
        break;
    }
  } else if (type === 'gaps') {
    if (gapCount && gapCount > 0) {
      bgColor = `${colors.semantic.error}15`;
      textColor = colors.semantic.error;
      label = `${gapCount} Gap${gapCount > 1 ? 's' : ''}`;
      icon = <AlertTriangle size={12} />;
    } else {
      bgColor = `${colors.semantic.success}15`;
      textColor = colors.semantic.success;
      label = 'No Gaps';
      icon = <CheckCircle size={12} />;
    }
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: bgColor,
        color: textColor,
        fontSize: '11px',
        fontWeight: '600'
      }}
    >
      {icon}
      {label}
    </div>
  );
};
