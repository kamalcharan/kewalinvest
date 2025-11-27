// frontend/src/components/goals/GoalQuickActions.tsx
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import ConfirmationDialog from '../ui/ConfirmationDialog';

interface GoalQuickActionsProps {
  onCreateGoal: () => void;
}

export const GoalQuickActions: React.FC<GoalQuickActionsProps> = ({ onCreateGoal }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const [showComingSoon, setShowComingSoon] = useState<'rebalance' | 'report' | null>(null);

  const quickActions = [
    {
      icon: '🎯',
      title: 'Create New Goal',
      description: 'Price/Time/Price+Time based',
      onClick: onCreateGoal
    },
    {
      icon: '📥',
      title: 'Onboard Existing Goal',
      description: 'Import in-progress goal',
      onClick: onCreateGoal // For now, opens same modal
    },
    {
      icon: '⚖️',
      title: 'Rebalance Goals',
      description: 'Adjust allocations',
      onClick: () => setShowComingSoon('rebalance')
    },
    {
      icon: '📊',
      title: 'Generate Report',
      description: 'Export goal summary',
      onClick: () => setShowComingSoon('report')
    }
  ];

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${colors.utility.primaryText}10`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Title */}
      <div style={{
        fontSize: '16px',
        fontWeight: '700',
        color: colors.utility.primaryText,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        ⚡ Quick Actions
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              backgroundColor: colors.utility.primaryBackground,
              border: `1px solid ${colors.utility.primaryText}10`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.brand.primary + '10';
              e.currentTarget.style.borderColor = colors.brand.primary + '40';
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              e.currentTarget.style.borderColor = colors.utility.primaryText + '10';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            {/* Icon */}
            <div style={{
              fontSize: '24px',
              flexShrink: 0,
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.brand.primary + '15',
              borderRadius: '8px'
            }}>
              {action.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '2px'
              }}>
                {action.title}
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                {action.description}
              </div>
            </div>

            {/* Arrow */}
            <div style={{
              fontSize: '16px',
              color: colors.utility.secondaryText,
              flexShrink: 0
            }}>
              →
            </div>
          </button>
        ))}
      </div>

      {/* Coming Soon Modal */}
      <ConfirmationDialog
        isOpen={showComingSoon !== null}
        onClose={() => setShowComingSoon(null)}
        onConfirm={() => setShowComingSoon(null)}
        title="Coming Soon"
        description={
          showComingSoon === 'rebalance'
            ? 'The Rebalance Goals feature is currently under development and will be available in a future release.'
            : 'The Generate Report feature is currently under development and will be available in a future release.'
        }
        confirmText="Got it"
        cancelText=""
        type="info"
      />
    </div>
  );
};
