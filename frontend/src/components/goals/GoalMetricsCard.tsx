// frontend/src/components/goals/GoalMetricsCard.tsx
// Metrics card with SIP performance, assumptions, and multi-factor status analysis

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalConfiguration } from '../../types/goal.types';
import { formatCurrency, formatPercentage } from '../../utils/goalUtils';

interface GoalMetricsCardProps {
  goal: GoalConfiguration;
  totalSIPs?: number;
  missedSIPs?: number;
}

const GoalMetricsCard: React.FC<GoalMetricsCardProps> = ({ goal, totalSIPs = 0, missedSIPs = 0 }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const config = goal.config_data;

  // Calculate multi-factor status analysis
  const statusAnalysis = useMemo(() => {
    // Check if goal is on track (only available for time_and_price_goal)
    const isOnTrack = 'on_track' in config ? config.on_track !== false : true;
    const currentValue = config.current_value || 0;

    // projected_corpus only exists on time_based and time_and_price goals
    const projectedCorpus = 'projected_corpus' in config ? config.projected_corpus || 0 : 0;
    const targetAmount = 'target_amount' in config ? config.target_amount : projectedCorpus;
    const monthlyContribution = config.monthly_contribution || 0;
    const expectedReturn = config.expected_return_rate || 12;

    // Factor 1: Value Gap Analysis
    let valueGap = 0;
    let valueGapPercent = 0;
    if (targetAmount > 0) {
      valueGap = projectedCorpus - targetAmount;
      valueGapPercent = (valueGap / targetAmount) * 100;
    }

    // Factor 2: SIP Consistency
    const sipCompletionRate = totalSIPs > 0 ? ((totalSIPs - missedSIPs) / totalSIPs) * 100 : 100;

    // Factor 3: Progress vs Timeline
    let timelineProgress = 0;
    if ('target_date' in config && config.target_date) {
      const startDate = new Date(goal.created_at);
      const targetDate = new Date(config.target_date);
      const today = new Date();
      const totalDays = Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      timelineProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
    }

    const valueProgress = targetAmount > 0 ? (currentValue / targetAmount) * 100 : 0;
    const progressVsTimeline = valueProgress - timelineProgress;

    // Generate explanation
    let explanation = '';
    let icon: any = CheckCircle;
    let statusColor = colors.semantic.success;

    if (isOnTrack) {
      icon = CheckCircle;
      statusColor = colors.semantic.success;

      if (progressVsTimeline > 5) {
        explanation = `Current tracking ${Math.abs(progressVsTimeline).toFixed(1)}% ahead of target milestone`;
      } else if (missedSIPs === 0 && totalSIPs > 0) {
        explanation = `All ${totalSIPs} SIPs completed successfully`;
      } else {
        explanation = `Portfolio value is growing as expected`;
      }
    } else {
      icon = AlertTriangle;
      statusColor = colors.semantic.warning;

      const reasons: string[] = [];

      if (missedSIPs > 0) {
        reasons.push(`${missedSIPs} missed SIP${missedSIPs > 1 ? 's' : ''}`);
      }

      if (progressVsTimeline < -5) {
        reasons.push(`${Math.abs(progressVsTimeline).toFixed(1)}% behind schedule`);
      }

      if (valueGapPercent < -10) {
        const requiredIncrease = Math.abs(valueGap) / (config.linked_schemes?.length || 1);
        reasons.push(`need ₹${Math.round(requiredIncrease / monthlyContribution)} more months SIP`);
      }

      explanation = reasons.length > 0
        ? `Behind due to: ${reasons.join(', ')}`
        : 'Tracking slightly below expected pace';
    }

    return {
      isOnTrack,
      explanation,
      icon,
      statusColor,
      sipCompletionRate,
      progressVsTimeline
    };
  }, [goal, totalSIPs, missedSIPs, config, colors]);

  const StatusIcon = statusAnalysis.icon;

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
            <span style={{ fontSize: '14px', fontWeight: '600', color: statusAnalysis.sipCompletionRate >= 80 ? colors.semantic.success : colors.semantic.warning }}>
              {statusAnalysis.sipCompletionRate.toFixed(0)}%
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
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Expected ROI:</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.brand.primary }}>
              {formatPercentage(config.expected_return_rate || 12, 1)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Inflation:</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
              {formatPercentage(config.inflation_rate || 6, 1)}
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

      {/* Status Explanation */}
      <div style={{
        marginTop: 'auto',
        padding: '12px',
        backgroundColor: statusAnalysis.statusColor + '15',
        border: `1px solid ${statusAnalysis.statusColor}40`,
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px'
        }}>
          <StatusIcon size={16} color={statusAnalysis.statusColor} />
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: statusAnalysis.statusColor
          }}>
            {statusAnalysis.isOnTrack ? '✓ ON TRACK' : '⚠ BEHIND SCHEDULE'}
          </span>
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.utility.primaryText,
          lineHeight: '1.4'
        }}>
          {statusAnalysis.explanation}
        </div>
      </div>
    </div>
  );
};

export default GoalMetricsCard;
