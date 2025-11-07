// frontend/src/components/goals/GoalMetricsBar.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { GoalSummary } from '../../types/goal.types';
import type { GoalConfiguration } from '../../types/goal.types';

interface GoalMetricsBarProps {
  goalSummary: GoalSummary;
  goals: GoalConfiguration[];
}

export const GoalMetricsBar: React.FC<GoalMetricsBarProps> = ({ goalSummary, goals }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) { // 1 crore
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) { // 1 lakh
      return `₹${(amount / 100000).toFixed(2)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(2)}K`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Calculate total monthly SIP contribution
  const totalMonthlySIP = goals.reduce((sum, goal) => {
    // Get monthly contribution from config_data
    const config = goal.config_data;
    if ('monthly_contribution' in config && config.monthly_contribution) {
      return sum + config.monthly_contribution;
    }
    return sum;
  }, 0);

  // Calculate progress percentage
  const progressPercentage = goalSummary.total_target_corpus > 0
    ? ((goalSummary.total_current_value / goalSummary.total_target_corpus) * 100).toFixed(1)
    : '0';

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderBottom: `1px solid ${colors.utility.primaryText}10`,
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px'
        }}>
          {/* Active Goals - Highlighted */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            color: 'white'
          }}>
            <div style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.9)',
              fontWeight: '600',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Active Goals
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '4px'
            }}>
              {goalSummary.total_goals}
            </div>
            <div style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.8)'
            }}>
              {goalSummary.goals_on_track} On Track • {goalSummary.goals_behind} Need Attention
            </div>
          </div>

          {/* Total Target */}
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              color: colors.utility.secondaryText,
              fontWeight: '600',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Total Target
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              {formatCurrency(goalSummary.total_target_corpus)}
            </div>
            <div style={{
              fontSize: '13px',
              color: colors.utility.secondaryText
            }}>
              Across all goals
            </div>
          </div>

          {/* Current Value */}
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              color: colors.utility.secondaryText,
              fontWeight: '600',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Current Value
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              {formatCurrency(goalSummary.total_current_value)}
            </div>
            <div style={{
              fontSize: '13px',
              color: colors.utility.secondaryText
            }}>
              {progressPercentage}% achieved
            </div>
          </div>

          {/* Goal SIPs */}
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              color: colors.utility.secondaryText,
              fontWeight: '600',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Goal SIPs
            </div>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              {formatCurrency(totalMonthlySIP)}
            </div>
            <div style={{
              fontSize: '13px',
              color: colors.utility.secondaryText
            }}>
              Monthly contribution
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
