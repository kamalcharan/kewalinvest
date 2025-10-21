// frontend/src/components/nav/MetricsStatusBadge.tsx
// Small badge component to display metrics calculation status

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { MetricsStatus } from '../../types/nav.types';

/**
 * Props for MetricsStatusBadge component
 */
interface MetricsStatusBadgeProps {
  status: MetricsStatus;
  lastCalculated?: string;      // ISO datetime string
  showText?: boolean;           // Show status text (default: true)
  showIcon?: boolean;           // Show status icon (default: true)
  showTooltip?: boolean;        // Show tooltip on hover (default: true)
  compact?: boolean;            // Compact mode (icon only, default: false)
  onClick?: () => void;         // Optional click handler
}

/**
 * MetricsStatusBadge Component
 * Displays the current status of metrics calculation as a colored badge
 * 
 * @example
 * ```tsx
 * <MetricsStatusBadge 
 *   status="available" 
 *   lastCalculated="2025-01-21T22:30:00Z"
 * />
 * 
 * <MetricsStatusBadge 
 *   status="calculating" 
 *   compact 
 * />
 * ```
 */
export const MetricsStatusBadge: React.FC<MetricsStatusBadgeProps> = ({
  status,
  lastCalculated,
  showText = true,
  showIcon = true,
  showTooltip = true,
  compact = false,
  onClick,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  /**
   * Get status configuration (icon, text, color)
   */
  const getStatusConfig = () => {
    switch (status) {
      case 'available':
        return {
          icon: '✓',
          text: 'Metrics Available',
          color: colors.semantic.success,
          bgColor: colors.semantic.success + '15',
          borderColor: colors.semantic.success + '30',
        };
      
      case 'calculating':
        return {
          icon: '⟳',
          text: 'Calculating...',
          color: colors.brand.primary,
          bgColor: colors.brand.primary + '15',
          borderColor: colors.brand.primary + '30',
        };
      
      case 'outdated':
        return {
          icon: '⚠',
          text: 'Outdated',
          color: colors.semantic.warning,
          bgColor: colors.semantic.warning + '15',
          borderColor: colors.semantic.warning + '30',
        };
      
      case 'error':
        return {
          icon: '✗',
          text: 'Error',
          color: colors.semantic.error,
          bgColor: colors.semantic.error + '15',
          borderColor: colors.semantic.error + '30',
        };
      
      case 'none':
      default:
        return {
          icon: '○',
          text: 'No Metrics',
          color: colors.utility.secondaryText,
          bgColor: colors.utility.secondaryText + '10',
          borderColor: colors.utility.secondaryText + '20',
        };
    }
  };

  const config = getStatusConfig();

  /**
   * Format last calculated timestamp for tooltip
   */
  const getTooltipText = (): string => {
    if (status === 'calculating') {
      return 'Metrics calculation in progress...';
    }

    if (status === 'none') {
      return 'Metrics have not been calculated yet. Click "Calculate Metrics" to generate.';
    }

    if (status === 'error') {
      return 'Metrics calculation failed. Please try again.';
    }

    if (!lastCalculated) {
      return config.text;
    }

    // Format timestamp
    const date = new Date(lastCalculated);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    let timeAgo: string;
    if (diffMinutes < 60) {
      timeAgo = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }

    const formattedDate = date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (status === 'outdated') {
      return `Metrics last calculated ${timeAgo} (${formattedDate}). Consider recalculating for up-to-date data.`;
    }

    return `Metrics last calculated ${timeAgo} (${formattedDate})`;
  };

  const tooltipText = showTooltip ? getTooltipText() : undefined;

  /**
   * Render compact mode (icon only)
   */
  if (compact) {
    return (
      <div
        title={tooltipText}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: config.bgColor,
          border: `1px solid ${config.borderColor}`,
          fontSize: '12px',
          color: config.color,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (onClick) {
            e.currentTarget.style.transform = 'scale(1.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (onClick) {
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        {showIcon && config.icon}
      </div>
    );
  }

  /**
   * Render full badge
   */
  return (
    <div
      title={tooltipText}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        borderRadius: '12px',
        backgroundColor: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        fontSize: '11px',
        fontWeight: '600',
        color: config.color,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = config.bgColor.replace('15', '25');
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.backgroundColor = config.bgColor;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {showIcon && (
        <span style={{
          fontSize: '12px',
          lineHeight: '1',
          animation: status === 'calculating' ? 'spin 2s linear infinite' : 'none',
        }}>
          {config.icon}
        </span>
      )}
      
      {showText && (
        <span style={{ lineHeight: '1' }}>
          {config.text}
        </span>
      )}

      {/* CSS Animation for calculating spinner */}
      {status === 'calculating' && (
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      )}
    </div>
  );
};

/**
 * MetricsStatusBadgeGroup Component
 * Displays multiple status badges in a row
 * Useful for showing multiple schemes' statuses
 * 
 * @example
 * ```tsx
 * <MetricsStatusBadgeGroup
 *   statuses={[
 *     { status: 'available', lastCalculated: '2025-01-21T22:30:00Z' },
 *     { status: 'calculating' },
 *     { status: 'none' }
 *   ]}
 * />
 * ```
 */
interface MetricsStatusBadgeGroupProps {
  statuses: Array<{
    status: MetricsStatus;
    lastCalculated?: string;
    label?: string;
  }>;
  compact?: boolean;
  onClickBadge?: (index: number) => void;
}

export const MetricsStatusBadgeGroup: React.FC<MetricsStatusBadgeGroupProps> = ({
  statuses,
  compact = false,
  onClickBadge,
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      flexWrap: 'wrap',
    }}>
      {statuses.map((item, index) => (
        <div key={index} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {item.label && (
            <span style={{
              fontSize: '10px',
              color: '#666',
              fontWeight: '500',
            }}>
              {item.label}
            </span>
          )}
          <MetricsStatusBadge
            status={item.status}
            lastCalculated={item.lastCalculated}
            compact={compact}
            onClick={onClickBadge ? () => onClickBadge(index) : undefined}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * MetricsStatusIndicator Component
 * Minimal status indicator (just a colored dot)
 * For use in very compact layouts
 * 
 * @example
 * ```tsx
 * <MetricsStatusIndicator status="available" />
 * ```
 */
interface MetricsStatusIndicatorProps {
  status: MetricsStatus;
  size?: number;                // Dot size in pixels (default: 8)
  showTooltip?: boolean;
}

export const MetricsStatusIndicator: React.FC<MetricsStatusIndicatorProps> = ({
  status,
  size = 8,
  showTooltip = true,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const getColor = () => {
    switch (status) {
      case 'available':
        return colors.semantic.success;
      case 'calculating':
        return colors.brand.primary;
      case 'outdated':
        return colors.semantic.warning;
      case 'error':
        return colors.semantic.error;
      case 'none':
      default:
        return colors.utility.secondaryText;
    }
  };

  const getTooltip = () => {
    switch (status) {
      case 'available':
        return 'Metrics available';
      case 'calculating':
        return 'Calculating metrics...';
      case 'outdated':
        return 'Metrics outdated';
      case 'error':
        return 'Calculation error';
      case 'none':
      default:
        return 'No metrics';
    }
  };

  return (
    <div
      title={showTooltip ? getTooltip() : undefined}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: getColor(),
        boxShadow: status === 'calculating' 
          ? `0 0 ${size}px ${getColor()}50` 
          : 'none',
        animation: status === 'calculating' ? 'pulse 2s ease-in-out infinite' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {status === 'calculating' && (
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      )}
    </div>
  );
};

export default MetricsStatusBadge;