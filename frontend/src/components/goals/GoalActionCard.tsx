// frontend/src/components/goals/GoalActionCard.tsx

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalActionItem } from '../../types/goal.types';
import { formatCurrency } from '../../utils/goalUtils';

interface GoalActionCardProps {
  goalId: number;
  goalTitle: string;
  action: GoalActionItem;
  onApply?: (goalId: number, action: GoalActionItem) => void;
  onDismiss?: (goalId: number) => void;
  isApplying?: boolean;
}

const GoalActionCard: React.FC<GoalActionCardProps> = ({
  goalId,
  goalTitle,
  action,
  onApply,
  onDismiss,
  isApplying = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [dismissed, setDismissed] = useState(false);

  // Icons
  const CheckCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );

  const XIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const ArrowRightIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );

  // Handle apply
  const handleApply = () => {
    if (onApply && !isApplying) {
      onApply(goalId, action);
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss(goalId);
    }
  };

  // If dismissed, don't render
  if (dismissed) {
    return null;
  }

  // Determine if action is actionable
  const isActionable = action.actionable && (onApply || onDismiss);

  // Color scheme based on priority
  let accentColor = action.color;
  let bgColor = action.color + '15';
  let borderColor = action.color + '40';

  return (
    <div
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      {/* Header: Icon + Title + Priority Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        {/* Icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: accentColor + '25',
            color: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '18px'
          }}
        >
          {action.icon}
        </div>

        {/* Title + Meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '2px'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              {action.title}
            </div>

            {/* Priority Badge */}
            <span style={{
              fontSize: '9px',
              padding: '2px 6px',
              backgroundColor: accentColor + '30',
              color: accentColor,
              borderRadius: '3px',
              fontWeight: '600',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap'
            }}>
              {action.priority}
            </span>
          </div>

          {/* Goal Title */}
          <div style={{
            fontSize: '11px',
            color: colors.utility.secondaryText,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {goalTitle}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{
        fontSize: '12px',
        color: colors.utility.primaryText,
        lineHeight: '1.4',
        padding: '8px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '6px'
      }}>
        {action.description}
      </div>

      {/* Recommended Value (if available) */}
      {action.recommended_value !== undefined && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '6px',
          borderLeft: `3px solid ${accentColor}`
        }}>
          <div style={{
            fontSize: '11px',
            color: colors.utility.secondaryText,
            fontWeight: '500'
          }}>
            Recommended Amount:
          </div>
          <div style={{
            fontSize: '13px',
            fontWeight: '700',
            color: accentColor
          }}>
            {formatCurrency(action.recommended_value, true)}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '10px'
      }}>
        {/* Dismiss Button */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            disabled={isApplying}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              color: colors.utility.secondaryText,
              fontSize: '12px',
              fontWeight: '600',
              cursor: isApplying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              opacity: isApplying ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isApplying) {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryText + '10';
                e.currentTarget.style.borderColor = colors.utility.secondaryText + '40';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
            }}
          >
            <XIcon />
            <span>Dismiss</span>
          </button>
        )}

        {/* Apply Button */}
        {onApply && action.actionable && (
          <button
            onClick={handleApply}
            disabled={isApplying}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: accentColor,
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              cursor: isApplying ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              opacity: isApplying ? 0.7 : 1,
              boxShadow: `0 2px 8px ${accentColor}30`
            }}
            onMouseEnter={(e) => {
              if (!isApplying) {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${accentColor}40`;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 2px 8px ${accentColor}30`;
            }}
          >
            {isApplying ? (
              <>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <CheckCircleIcon />
                <span>Apply</span>
                <ArrowRightIcon />
              </>
            )}
          </button>
        )}

        {/* Non-actionable Info Button */}
        {!action.actionable && (
          <div style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: accentColor + '20',
            border: `1px solid ${accentColor}40`,
            borderRadius: '6px',
            color: accentColor,
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}>
            {action.icon && <span>{action.icon}</span>}
            <span>{action.title}</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default GoalActionCard;