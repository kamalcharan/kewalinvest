// frontend/src/components/jtbd/JTBDStatusBadge.tsx

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface JTBDStatusBadgeProps {
  jtbdCount: number;
  nextAlertDate?: string;
  criticalCount?: number;
  onClick?: () => void;  // Fixed: No parameters
  size?: 'small' | 'medium' | 'large';
}

const JTBDStatusBadge: React.FC<JTBDStatusBadgeProps> = ({
  jtbdCount,
  nextAlertDate,
  criticalCount = 0,
  onClick,
  size = 'medium'
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Determine status
  const hasSetup = jtbdCount > 0;
  const hasCritical = criticalCount > 0;

  // Size configurations
  const sizeConfig = {
    small: {
      fontSize: '10px',
      padding: '2px 6px',
      iconSize: 10,
      gap: '3px'
    },
    medium: {
      fontSize: '11px',
      padding: '4px 8px',
      iconSize: 12,
      gap: '4px'
    },
    large: {
      fontSize: '12px',
      padding: '6px 12px',
      iconSize: 14,
      gap: '6px'
    }
  };

  const config = sizeConfig[size];

  // Color scheme based on status
  const getColors = () => {
    if (!hasSetup) {
      return {
        bg: colors.utility.secondaryText + '20',
        text: colors.utility.secondaryText,
        border: colors.utility.secondaryText + '40'
      };
    }
    
    if (hasCritical) {
      return {
        bg: colors.semantic.error + '20',
        text: colors.semantic.error,
        border: colors.semantic.error + '40'
      };
    }

    return {
      bg: colors.semantic.success + '20',
      text: colors.semantic.success,
      border: colors.semantic.success + '40'
    };
  };

  const colorScheme = getColors();

  // Format next alert date
  const formatNextDate = (dateString?: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }

    // Check if within next 7 days
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil > 0 && daysUntil <= 7) {
      return `in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
    }

    // Format as date
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  // Icons
  const BellIcon = () => (
    <svg 
      width={config.iconSize} 
      height={config.iconSize} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );

  const AlertIcon = () => (
    <svg 
      width={config.iconSize} 
      height={config.iconSize} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  const PlusIcon = () => (
    <svg 
      width={config.iconSize} 
      height={config.iconSize} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  // Tooltip content
  const getTooltipContent = () => {
    if (!hasSetup) {
      return 'No alerts configured. Click to setup.';
    }

    const parts = [`${jtbdCount} active alert${jtbdCount > 1 ? 's' : ''}`];
    
    if (criticalCount > 0) {
      parts.push(`${criticalCount} critical`);
    }

    if (nextAlertDate) {
      parts.push(`Next: ${formatNextDate(nextAlertDate)}`);
    }

    return parts.join(' • ');
  };

  // Handle click with event management
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      e.stopPropagation();  // Prevent event bubbling
      onClick();             // Call prop function with no parameters
    }
  };

  return (
    <div
      onClick={handleClick}
      title={getTooltipContent()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: config.gap,
        padding: config.padding,
        borderRadius: '8px',
        fontSize: config.fontSize,
        fontWeight: '600',
        backgroundColor: colorScheme.bg,
        color: colorScheme.text,
        border: `1px solid ${colorScheme.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = `0 2px 8px ${colorScheme.border}`;
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
      {!hasSetup ? <PlusIcon /> : hasCritical ? <AlertIcon /> : <BellIcon />}

      {/* Text */}
      <span>
        {!hasSetup ? 'Setup Alerts' : `Active (${jtbdCount})`}
      </span>

      {/* Next date indicator (only for active with upcoming date) */}
      {hasSetup && nextAlertDate && size !== 'small' && (
        <>
          <span style={{ opacity: 0.5 }}>•</span>
          <span style={{ opacity: 0.8 }}>
            {formatNextDate(nextAlertDate)}
          </span>
        </>
      )}
    </div>
  );
};

export default JTBDStatusBadge;