// src/components/dashboard/DashboardHeader.tsx

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface DashboardMetrics {
  totalAUM: number;
  totalCustomers: number;
  positiveReturnsCount: number;
  negativeReturnsCount: number;
  criticalActionsCount: number;
  avgReturns: number;
  todayChange?: {
    amount: number;
    percentage: number;
  };
}

interface DashboardHeaderProps {
  metrics: DashboardMetrics;
  onRefresh?: () => void;
  isLoading?: boolean;
  lastUpdated?: Date;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  metrics,
  onRefresh,
  isLoading = false,
  lastUpdated
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

  // Get color for value
  const getValueColor = (value: number): string => {
    if (value > 0) return '#10B981';
    if (value < 0) return '#EF4444';
    return colors.utility.secondaryText;
  };

  // Format time
  const formatLastUpdated = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    return date.toLocaleDateString('en-IN');
  };

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

  const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,4 23,10 17,10" />
      <polyline points="1,20 1,14 7,14" />
      <path d="m20.49,9a9,9 0 1 1-2.13-5.36l4.64,4.36" />
    </svg>
  );

  const UsersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  const AlertIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const WalletIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 4H3a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <path d="M1 10h22" />
    </svg>
  );

  const ChartIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );

  const metrics_cards = [
    {
      icon: <WalletIcon />,
      label: 'Total AUM',
      value: formatCurrency(metrics.totalAUM),
      subValue: metrics.todayChange 
        ? formatPercentage(metrics.todayChange.percentage) 
        : null,
      color: colors.brand.primary,
      bgColor: colors.brand.primary + '10'
    },
    {
      icon: <UsersIcon />,
      label: 'Active Customers',
      value: metrics.totalCustomers.toString(),
      subValue: `${metrics.positiveReturnsCount} profitable`,
      color: colors.utility.primaryText,
      bgColor: colors.utility.primaryText + '10'
    },
    {
      icon: <ChartIcon />,
      label: 'Avg Returns',
      value: formatPercentage(metrics.avgReturns),
      subValue: metrics.avgReturns >= 0 ? 'Outperforming' : 'Underperforming',
      color: getValueColor(metrics.avgReturns),
      bgColor: getValueColor(metrics.avgReturns) + '10',
      showTrend: true,
      trend: metrics.avgReturns >= 0 ? 'up' : 'down'
    },
    {
      icon: <AlertIcon />,
      label: 'Actions Required',
      value: metrics.criticalActionsCount.toString(),
      subValue: 'High priority',
      color: metrics.criticalActionsCount > 0 ? '#F97316' : '#10B981',
      bgColor: metrics.criticalActionsCount > 0 ? '#F9731610' : '#10B98110'
    }
  ];

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Top Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            margin: '0 0 4px 0'
          }}>
            Portfolio Dashboard
          </h2>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            Real-time overview of all customer portfolios
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {lastUpdated && (
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Updated {formatLastUpdated(lastUpdated)}
            </span>
          )}
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                animation: isLoading ? 'spin 1s linear infinite' : 'none'
              }}>
                <RefreshIcon />
              </div>
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        {metrics_cards.map((card, index) => (
          <div
            key={index}
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.utility.primaryText}10`,
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
          >
            {/* Background Decoration */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: card.bgColor,
              opacity: 0.5
            }} />

            {/* Content */}
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: card.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color
                }}>
                  {card.icon}
                </div>
                
                <div style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontWeight: '500'
                }}>
                  {card.label}
                </div>
              </div>

              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: card.color,
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {card.value}
                {card.showTrend && (
                  card.trend === 'up' ? <TrendUpIcon /> : <TrendDownIcon />
                )}
              </div>

              {card.subValue && (
                <div style={{
                  fontSize: '13px',
                  color: colors.utility.secondaryText
                }}>
                  {card.subValue}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Summary Bar */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div>
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginRight: '8px'
            }}>
              Positive Returns:
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#10B981'
            }}>
              {metrics.positiveReturnsCount} customers
            </span>
          </div>
          
          <div>
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginRight: '8px'
            }}>
              Negative Returns:
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#EF4444'
            }}>
              {metrics.negativeReturnsCount} customers
            </span>
          </div>
        </div>

        <div style={{
          width: '200px',
          height: '8px',
          backgroundColor: colors.utility.secondaryText + '20',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex'
        }}>
          <div style={{
            width: `${(metrics.positiveReturnsCount / metrics.totalCustomers) * 100}%`,
            height: '100%',
            backgroundColor: '#10B981'
          }} />
          <div style={{
            flex: 1,
            height: '100%',
            backgroundColor: '#EF4444'
          }} />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DashboardHeader;