// frontend/src/components/customers/CustomerMetricsBar.tsx
import React from 'react';
import { TrendingUp as TrendUpIcon, TrendingDown as TrendDownIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { CustomerPortfolioResponse } from '../../types/portfolio.types';
import type { JTBDConfiguration } from '../../types/jtbd.types';

interface CustomerMetricsBarProps {
  portfolio: CustomerPortfolioResponse;
  jtbds?: JTBDConfiguration[];
}

export const CustomerMetricsBar: React.FC<CustomerMetricsBarProps> = ({
  portfolio,
  jtbds
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Calculate metrics
  const profitLoss = (portfolio.summary.current_value ?? 0) - (portfolio.summary.total_invested ?? 0);
  const dayChangePercentage = portfolio.summary.day_change_percentage ?? 0;
  const returnPercentage = portfolio.summary.return_percentage ?? 0;

  // Utility functions
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '₹0';
    }
    const absValue = Math.abs(value);
    return `₹${absValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getValueColor = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return colors.utility.secondaryText;
    }
    return value >= 0 ? colors.semantic.success : colors.semantic.error;
  };

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderBottom: `1px solid ${colors.utility.primaryText}10`,
      padding: '14px 24px' // Reduced from 20px 24px (30% reduction)
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '20px' // Reduced from 24px
      }}>
        {/* Current Value */}
        <div>
          <div style={{
            fontSize: '20px', // Reduced from 24px
            fontWeight: '700',
            color: colors.utility.primaryText
          }}>
            {formatCurrency(portfolio.summary.current_value)}
          </div>
          <div style={{
            fontSize: '10px', // Reduced from 11px
            color: colors.utility.secondaryText,
            marginTop: '3px' // Reduced from 4px
          }}>
            CURRENT VALUE
          </div>
        </div>

        {/* Profit/Loss */}
        <div>
          <div style={{
            fontSize: '20px', // Reduced from 24px
            fontWeight: '700',
            color: getValueColor(profitLoss)
          }}>
            {formatCurrency(Math.abs(profitLoss))}
          </div>
          <div style={{
            fontSize: '10px', // Reduced from 11px
            color: colors.utility.secondaryText,
            marginTop: '3px' // Reduced from 4px
          }}>
            {profitLoss >= 0 ? 'TOTAL PROFIT' : 'TOTAL LOSS'}
          </div>
        </div>

        {/* Today's Change */}
        <div>
          <div style={{
            fontSize: '20px', // Reduced from 24px
            fontWeight: '700',
            color: getValueColor(dayChangePercentage),
            display: 'flex',
            alignItems: 'center',
            gap: '5px' // Reduced from 6px
          }}>
            {formatPercentage(dayChangePercentage)}
            {dayChangePercentage >= 0 ? <TrendUpIcon size={16} /> : <TrendDownIcon size={16} />}
          </div>
          <div style={{
            fontSize: '10px', // Reduced from 11px
            color: colors.utility.secondaryText,
            marginTop: '3px' // Reduced from 4px
          }}>
            TODAY'S CHANGE
          </div>
        </div>

        {/* Overall Return */}
        <div>
          <div style={{
            fontSize: '20px', // Reduced from 24px
            fontWeight: '700',
            color: getValueColor(returnPercentage)
          }}>
            {formatPercentage(returnPercentage)}
          </div>
          <div style={{
            fontSize: '10px', // Reduced from 11px
            color: colors.utility.secondaryText,
            marginTop: '3px' // Reduced from 4px
          }}>
            OVERALL RETURN
          </div>
        </div>

        {/* Total Funds */}
        <div>
          <div style={{
            fontSize: '20px', // Reduced from 24px
            fontWeight: '700',
            color: colors.utility.primaryText
          }}>
            {portfolio.holdings?.length || portfolio.summary.total_schemes || 0}
          </div>
          <div style={{
            fontSize: '10px', // Reduced from 11px
            color: colors.utility.secondaryText,
            marginTop: '3px' // Reduced from 4px
          }}>
            TOTAL FUNDS
          </div>
        </div>

        {/* Active Alerts */}
        <div>
          <div style={{
            fontSize: '20px', // Reduced from 24px
            fontWeight: '700',
            color: jtbds && jtbds.length > 0 ? colors.semantic.success : colors.utility.secondaryText
          }}>
            {jtbds?.length || 0}
          </div>
          <div style={{
            fontSize: '10px', // Reduced from 11px
            color: colors.utility.secondaryText,
            marginTop: '3px' // Reduced from 4px
          }}>
            ACTIVE ALERTS
          </div>
        </div>
      </div>
    </div>
  );
};
