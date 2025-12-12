// frontend/src/components/portfolio/PortfolioAllocationSummary.tsx
// Shows summary of portfolio allocation to goals

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Target, TrendingUp } from 'lucide-react';

interface PortfolioAllocationSummaryProps {
  totalPortfolioValue: number;
  allocatedValue: number;
  allocatedPercentage: number;
  goalsCount: number;
  schemesCount: number;
}

export const PortfolioAllocationSummary: React.FC<PortfolioAllocationSummaryProps> = ({
  totalPortfolioValue,
  allocatedValue,
  allocatedPercentage,
  goalsCount,
  schemesCount
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const availableValue = totalPortfolioValue - allocatedValue;
  const availablePercentage = 100 - allocatedPercentage;

  const formatCurrency = (value: number) => {
    return `₹${(value / 100000).toFixed(2)}L`;
  };

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '24px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px'
      }}>
        <Target size={20} color={colors.brand.primary} />
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText
        }}>
          Portfolio Goal Allocation
        </h3>
        <span style={{
          backgroundColor: colors.semantic.warning + '20',
          color: colors.semantic.warning,
          fontSize: '10px',
          fontWeight: '600',
          padding: '3px 8px',
          borderRadius: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Coming Soon
        </span>
      </div>

      {/* Allocation Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Allocated */}
        <div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            marginBottom: '6px'
          }}>
            Allocated to Goals
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: colors.brand.primary
          }}>
            {formatCurrency(allocatedValue)}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.brand.primary,
            marginTop: '2px'
          }}>
            {allocatedPercentage.toFixed(1)}%
          </div>
        </div>

        {/* Available */}
        <div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            marginBottom: '6px'
          }}>
            Available
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: colors.semantic.success
          }}>
            {formatCurrency(availableValue)}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.semantic.success,
            marginTop: '2px'
          }}>
            {availablePercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        marginBottom: '16px'
      }}>
        <div style={{
          width: '100%',
          height: '12px',
          backgroundColor: colors.utility.primaryText + '10',
          borderRadius: '6px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            width: `${Math.min(allocatedPercentage, 100)}%`,
            height: '100%',
            backgroundColor: colors.brand.primary,
            transition: 'width 0.3s',
            position: 'relative'
          }}>
            {/* Gradient overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(90deg, transparent, ${colors.brand.primary}40)`,
            }} />
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '16px',
        borderTop: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText
        }}>
          <span style={{ fontWeight: '600', color: colors.utility.primaryText }}>
            {goalsCount}
          </span> {goalsCount === 1 ? 'Goal' : 'Goals'} •{' '}
          <span style={{ fontWeight: '600', color: colors.utility.primaryText }}>
            {schemesCount}
          </span> {schemesCount === 1 ? 'Scheme' : 'Schemes'}
        </div>

        {allocatedPercentage > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: colors.semantic.success,
            fontWeight: '600'
          }}>
            <TrendingUp size={14} />
            <span>On Track</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioAllocationSummary;
