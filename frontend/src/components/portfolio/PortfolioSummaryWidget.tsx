// src/components/portfolio/PortfolioSummaryWidget.tsx
// Updated to use real backend API types

import React from 'react';
import { CustomerPortfolioResponse } from '../../types/portfolio.types';
import { useTheme } from '../../contexts/ThemeContext';

interface PortfolioSummaryWidgetProps {
  portfolio: CustomerPortfolioResponse;
  compact?: boolean;
  showSparkline?: boolean;
  onClick?: () => void;
}

const PortfolioSummaryWidget: React.FC<PortfolioSummaryWidgetProps> = ({
  portfolio,
  compact = false,
  showSparkline = true,
  onClick
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Get color based on value
  const getValueColor = (value: number): string => {
    if (value > 0) return '#10B981'; // Green
    if (value < 0) return '#EF4444'; // Red
    return colors.utility.secondaryText;
  };

  // Create sparkline SVG path
  const createSparklinePath = (data: number[]): string => {
    if (!data || data.length < 2) return '';
    
    const width = 80;
    const height = 30;
    const padding = 2;
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((value - min) / range * (height - padding * 2) + padding);
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const isPositive = portfolio.summary.total_returns >= 0;
  const sparklineColor = isPositive ? '#10B981' : '#EF4444';

  // Icons
  const TrendUpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  );

  const TrendDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
      <polyline points="17,18 23,18 23,12" />
    </svg>
  );

  const InfoIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );

  if (compact) {
    // Compact view for list
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 0',
          cursor: onClick ? 'pointer' : 'default'
        }}
        onClick={onClick}
      >
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '2px'
          }}>
            {formatCurrency(portfolio.summary.current_value)}
          </div>
          <div style={{
            fontSize: '12px',
            color: getValueColor(portfolio.summary.return_percentage),
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isPositive ? <TrendUpIcon /> : <TrendDownIcon />}
            {formatPercentage(portfolio.summary.return_percentage)}
          </div>
        </div>

        {showSparkline && portfolio.performance && portfolio.performance.length > 0 && (
          <svg width="80" height="30" style={{ display: 'block' }}>
            <path
              d={createSparklinePath(portfolio.performance.map(p => p.current_value))}
              fill="none"
              stroke={sparklineColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: colors.brand.primary + '20',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '500',
          color: colors.brand.primary
        }}>
          {portfolio.summary.total_schemes} Schemes
        </div>
      </div>
    );
  }

  // Full widget view
  return (
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        border: `1px solid ${colors.utility.primaryText}10`
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: '500'
        }}>
          Portfolio Value
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 6px',
          backgroundColor: colors.brand.primary + '20',
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: '500',
          color: colors.brand.primary
        }}>
          {portfolio.summary.total_schemes} Schemes
        </div>
      </div>

      {/* Value and Returns */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '4px'
        }}>
          {formatCurrency(portfolio.summary.current_value)}
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px'
        }}>
          {portfolio.summary.day_change !== undefined && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: getValueColor(portfolio.summary.day_change_percentage || 0)
              }}>
                {(portfolio.summary.day_change_percentage || 0) >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
                <span style={{ fontWeight: '500' }}>
                  {formatPercentage(portfolio.summary.day_change_percentage || 0)}
                </span>
                <span style={{ color: colors.utility.secondaryText }}>Today</span>
              </div>

              <div style={{
                width: '1px',
                height: '12px',
                backgroundColor: colors.utility.primaryText + '20'
              }} />
            </>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: getValueColor(portfolio.summary.return_percentage)
          }}>
            <span style={{ fontWeight: '600' }}>
              {formatPercentage(portfolio.summary.return_percentage)}
            </span>
            <span style={{ color: colors.utility.secondaryText }}>Overall</span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {showSparkline && portfolio.performance && portfolio.performance.length > 0 && (
        <div style={{
          width: '100%',
          height: '40px',
          marginBottom: '12px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="100%" height="32" preserveAspectRatio="none" viewBox="0 0 100 32">
            <path
              d={createSparklinePath(portfolio.performance.map(p => p.current_value))}
              fill="none"
              stroke={sparklineColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      )}

      {/* Investment Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        paddingTop: '12px',
        borderTop: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div>
          <div style={{
            fontSize: '10px',
            color: colors.utility.secondaryText,
            marginBottom: '2px',
            textTransform: 'uppercase'
          }}>
            Invested
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            {formatCurrency(portfolio.summary.total_invested)}
          </div>
        </div>
        
        <div>
          <div style={{
            fontSize: '10px',
            color: colors.utility.secondaryText,
            marginBottom: '2px',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            Returns
            <InfoIcon />
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: getValueColor(portfolio.summary.total_returns)
          }}>
            {formatCurrency(portfolio.summary.total_returns)}
          </div>
        </div>
      </div>

      {/* Top Holding Preview */}
      {portfolio.holdings && portfolio.holdings.length > 0 && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{
            fontSize: '10px',
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            textTransform: 'uppercase'
          }}>
            Top Holding
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              fontSize: '12px',
              color: colors.utility.primaryText,
              fontWeight: '500',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {portfolio.holdings[0].fund_name || portfolio.holdings[0].scheme_name}
            </div>
            <div style={{
              fontSize: '12px',
              color: getValueColor(portfolio.holdings[0].return_percentage),
              fontWeight: '600'
            }}>
              {formatPercentage(portfolio.holdings[0].return_percentage)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioSummaryWidget;