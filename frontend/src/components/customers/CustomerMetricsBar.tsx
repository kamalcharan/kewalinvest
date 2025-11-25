// frontend/src/components/customers/CustomerMetricsBar.tsx
import React from 'react';
import { TrendingUp as TrendUpIcon, TrendingDown as TrendDownIcon, Wallet, PieChart, Users } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNetworthSummary } from '../../hooks/usePortfolioData';
import type { CustomerPortfolioResponse } from '../../types/portfolio.types';
import type { JTBDConfiguration } from '../../types/jtbd.types';

interface CustomerMetricsBarProps {
  portfolio: CustomerPortfolioResponse;
  jtbds?: JTBDConfiguration[];
  customerId?: number;  // For individual view
  familyHeadIwellcode?: string;  // For family view
  viewMode?: 'individual' | 'family';
  showNetworth?: boolean;  // Enable networth display (default: true if customerId provided)
}

export const CustomerMetricsBar: React.FC<CustomerMetricsBarProps> = ({
  portfolio,
  jtbds,
  customerId,
  familyHeadIwellcode,
  viewMode = 'individual',
  showNetworth = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Fetch networth data based on view mode
  const isFamilyMode = viewMode === 'family' && !!familyHeadIwellcode;
  const { data: networthData } = useNetworthSummary(
    isFamilyMode
      ? { familyHeadIwellcode }
      : { customerId },
    { enabled: showNetworth && (isFamilyMode || !!customerId) }
  );

  // Use networth data if available, otherwise fall back to portfolio
  const hasNetworth = networthData?.data && networthData.data.total_networth > 0;
  const totalNetworth = hasNetworth ? networthData.data!.total_networth : portfolio.summary.current_value ?? 0;
  const totalInvested = hasNetworth ? networthData.data!.total_invested : portfolio.summary.total_invested ?? 0;
  const assetTypeCount = hasNetworth ? networthData.data!.asset_type_count : 1;

  // Calculate metrics
  const profitLoss = totalNetworth - totalInvested;
  const dayChangePercentage = portfolio.summary.day_change_percentage ?? 0;
  const returnPercentage = hasNetworth
    ? networthData.data!.overall_return_percentage
    : portfolio.summary.return_percentage ?? 0;

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
      backgroundColor: colors.utility.primaryBackground,
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px'
      }}>
        {/* Total Networth / Portfolio - Highlight Card */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          color: 'white'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.9)',
            fontWeight: '600',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}>
            {isFamilyMode ? <Users size={14} /> : (hasNetworth ? <Wallet size={14} /> : <PieChart size={14} />)}
            {isFamilyMode ? 'Family Networth' : (hasNetworth ? 'Total Networth' : 'Total Portfolio')}
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '4px'
          }}>
            {formatCurrency(totalNetworth)}
          </div>
          <div style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.8)'
          }}>
            {hasNetworth ? (
              <>
                Across {assetTypeCount} asset type{assetTypeCount !== 1 ? 's' : ''}
                {!isFamilyMode && (
                  <>
                    {' • '}
                    <span style={{ opacity: 0.9 }}>
                      MF: {formatCurrency(portfolio.summary.current_value)}
                    </span>
                  </>
                )}
              </>
            ) : (
              `Across ${portfolio.holdings?.length || portfolio.summary.total_schemes || 0} schemes`
            )}
          </div>
        </div>

        {/* This Month Change */}
        <div style={{
          background: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            color: colors.utility.secondaryText,
            fontWeight: '600',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}>
            Total Profit/Loss
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '4px',
            color: getValueColor(profitLoss)
          }}>
            {profitLoss >= 0 ? '+' : '-'}{formatCurrency(Math.abs(profitLoss))}
          </div>
          <div style={{
            fontSize: '13px',
            color: colors.utility.secondaryText
          }}>
            {profitLoss >= 0 ? 'Absolute gain' : 'Absolute loss'}
          </div>
        </div>

        {/* Today's Change */}
        <div style={{
          background: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            color: colors.utility.secondaryText,
            fontWeight: '600',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}>
            Today's Change
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '4px',
            color: getValueColor(dayChangePercentage),
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {formatPercentage(dayChangePercentage)}
            {dayChangePercentage >= 0 ? <TrendUpIcon size={20} /> : <TrendDownIcon size={20} />}
          </div>
          <div style={{
            fontSize: '13px',
            color: colors.utility.secondaryText
          }}>
            From yesterday's close
          </div>
        </div>

        {/* Overall Return */}
        <div style={{
          background: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            fontSize: '12px',
            textTransform: 'uppercase',
            color: colors.utility.secondaryText,
            fontWeight: '600',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}>
            Overall Return
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '4px',
            color: getValueColor(returnPercentage)
          }}>
            {formatPercentage(returnPercentage)}
          </div>
          <div style={{
            fontSize: '13px',
            color: colors.utility.secondaryText
          }}>
            Since inception
          </div>
        </div>
      </div>
    </div>
  );
};
