// frontend/src/components/goals/GoalMetricsCard.tsx
// Metrics card with SIP performance and Monte Carlo status display
// Uses Monte Carlo results from config_data (calculated by backend)

import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalConfiguration, isTimeAndPriceGoal } from '../../types/goal.types';
import { formatCurrency, formatPercentage } from '../../utils/goalUtils';

interface GoalMetricsCardProps {
  goal: GoalConfiguration;
  totalSIPs?: number;
  completedSIPs?: number;
  missedSIPs?: number;
}

const GoalMetricsCard: React.FC<GoalMetricsCardProps> = ({ goal, totalSIPs = 0, completedSIPs = 0, missedSIPs = 0 }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const config = goal.config_data;

  // Read Monte Carlo results directly from config_data
  const isOnTrack = isTimeAndPriceGoal(config) ? config.on_track === true : true;
  const probability = isTimeAndPriceGoal(config) ? (config.probability_of_success || 0) : 100;
  const sipCompletionRate = totalSIPs > 0 ? (completedSIPs / totalSIPs) * 100 : 100;

  // Determine status display based on Monte Carlo results
  const getStatusDisplay = () => {
    if (isOnTrack) {
      return {
        icon: CheckCircle,
        statusColor: colors.semantic.success,
        label: '✓ ON TRACK',
        explanation: probability > 0
          ? `${probability.toFixed(0)}% probability of success`
          : 'Goal is progressing as expected'
      };
    } else {
      if (probability < 40) {
        return {
          icon: AlertCircle,
          statusColor: colors.semantic.error,
          label: '🚨 CRITICAL',
          explanation: `Only ${probability.toFixed(0)}% chance of success. Immediate action required.`
        };
      } else {
        return {
          icon: AlertTriangle,
          statusColor: colors.semantic.warning,
          label: '⚠ NEEDS ATTENTION',
          explanation: `${probability.toFixed(0)}% chance of success. Review recommended actions.`
        };
      }
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Header */}
      <div style={{
        fontSize: '16px',
        fontWeight: '600',
        color: colors.utility.primaryText,
        paddingBottom: '12px',
        borderBottom: `1px solid ${colors.utility.primaryText}15`
      }}>
        Goal Metrics
      </div>

      {/* SIP Performance */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: '600',
          color: colors.utility.secondaryText,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          📊 SIP Performance
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Total SIPs:</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>{totalSIPs}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Completed:</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.semantic.success }}>
              {completedSIPs} ✓
            </span>
          </div>
          {missedSIPs > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: colors.semantic.warning }}>Missed:</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: colors.semantic.warning }}>
                {missedSIPs} ⚠️
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Completion:</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: sipCompletionRate >= 80 ? colors.semantic.success : colors.semantic.warning }}>
              {sipCompletionRate.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Assumptions */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: '600',
          color: colors.utility.secondaryText,
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          📈 Assumptions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Note:</span>
            <span style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
              ROI based on asset allocation
            </span>
          </div>
          {/* Assumptions removed - now come from asset types */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Default Inflation:</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
              {formatPercentage(6, 1)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Monthly SIP:</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
              {formatCurrency(config.monthly_contribution || 0, true)}
            </span>
          </div>
        </div>
      </div>

      {/* Monte Carlo Status */}
      <div style={{
        marginTop: 'auto',
        padding: '12px',
        backgroundColor: statusDisplay.statusColor + '15',
        border: `1px solid ${statusDisplay.statusColor}40`,
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px'
        }}>
          <StatusIcon size={16} color={statusDisplay.statusColor} />
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: statusDisplay.statusColor
          }}>
            {statusDisplay.label}
          </span>
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.utility.primaryText,
          lineHeight: '1.4'
        }}>
          {statusDisplay.explanation}
        </div>
      </div>
    </div>
  );
};

export default GoalMetricsCard;
