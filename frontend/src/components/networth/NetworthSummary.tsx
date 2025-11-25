// frontend/src/components/networth/NetworthSummary.tsx
// Summary widget showing total networth with asset allocation breakdown
// Cycle 3 - Frontend Basic Display

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { NetworthSummaryResponse, getAssetTypeColor } from '../../types/networth.types';
import { NetworthService } from '../../services/networth.service';

interface NetworthSummaryProps {
  data: NetworthSummaryResponse;
  compact?: boolean;
  showBreakdown?: boolean;
  onClick?: () => void;
}

const NetworthSummary: React.FC<NetworthSummaryProps> = ({
  data,
  compact = false,
  showBreakdown = true,
  onClick
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Safe value extraction
  const totalNetworth = data?.total_networth ?? 0;
  const totalInvested = data?.total_invested ?? 0;
  const totalReturns = data?.total_returns ?? 0;
  const returnPercentage = data?.overall_return_percentage ?? 0;
  const assetTypeCount = data?.asset_type_count ?? 0;
  const totalPlans = data?.total_investment_plans ?? 0;
  const byAssetType = data?.by_asset_type ?? [];

  const isPositive = totalReturns >= 0;

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

  const WalletIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );

  // Create donut chart path
  const createDonutPath = (percentage: number, startAngle: number, color: string, index: number) => {
    const radius = 40;
    const centerX = 50;
    const centerY = 50;
    const strokeWidth = 12;

    if (percentage === 0) return null;

    const endAngle = startAngle + (percentage / 100) * 360;
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const largeArcFlag = percentage > 50 ? 1 : 0;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    return (
      <path
        key={index}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  };

  // Build donut segments
  const donutSegments = () => {
    let currentAngle = 0;
    return byAssetType.map((asset, index) => {
      const segment = createDonutPath(
        asset.allocation_percentage,
        currentAngle,
        getAssetTypeColor(asset.asset_type_code),
        index
      );
      currentAngle += (asset.allocation_percentage / 100) * 360;
      return segment;
    });
  };

  if (compact) {
    // Compact view
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '10px',
          cursor: onClick ? 'pointer' : 'default',
          border: `1px solid ${colors.utility.primaryText}10`
        }}
        onClick={onClick}
      >
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          backgroundColor: colors.brand.primary + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.brand.primary
        }}>
          <WalletIcon />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            marginBottom: '2px'
          }}>
            Total Networth
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: '700',
            color: colors.utility.primaryText
          }}>
            {NetworthService.formatCurrency(totalNetworth)}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: NetworthService.getReturnColor(returnPercentage)
        }}>
          {isPositive ? <TrendUpIcon /> : <TrendDownIcon />}
          <span style={{ fontWeight: '600', fontSize: '14px' }}>
            {NetworthService.formatPercentage(returnPercentage)}
          </span>
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
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${colors.utility.primaryText}10`
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: colors.brand.primary + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.brand.primary
          }}>
            <WalletIcon />
          </div>
          <div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total Networth
            </div>
            <div style={{
              fontSize: '10px',
              color: colors.utility.secondaryText
            }}>
              as of {NetworthService.formatDate(data?.as_of_date)}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <div style={{
            padding: '4px 8px',
            backgroundColor: colors.brand.primary + '15',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '500',
            color: colors.brand.primary
          }}>
            {assetTypeCount} Asset Types
          </div>
          <div style={{
            padding: '4px 8px',
            backgroundColor: colors.utility.primaryText + '10',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '500',
            color: colors.utility.secondaryText
          }}>
            {totalPlans} Plans
          </div>
        </div>
      </div>

      {/* Main Value */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          fontSize: '32px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          {NetworthService.formatCurrency(totalNetworth)}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: NetworthService.getReturnColor(returnPercentage)
          }}>
            {isPositive ? <TrendUpIcon /> : <TrendDownIcon />}
            <span style={{ fontWeight: '600', fontSize: '15px' }}>
              {NetworthService.formatPercentage(returnPercentage)}
            </span>
            <span style={{
              fontSize: '13px',
              color: colors.utility.secondaryText
            }}>
              Overall Returns
            </span>
          </div>

          <div style={{
            width: '1px',
            height: '16px',
            backgroundColor: colors.utility.primaryText + '20'
          }} />

          <div style={{
            fontSize: '13px',
            color: NetworthService.getReturnColor(totalReturns)
          }}>
            <span style={{ fontWeight: '600' }}>
              {NetworthService.formatCurrency(totalReturns)}
            </span>
            <span style={{ color: colors.utility.secondaryText, marginLeft: '4px' }}>
              Profit/Loss
            </span>
          </div>
        </div>
      </div>

      {/* Asset Allocation */}
      {showBreakdown && byAssetType.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '20px',
          paddingTop: '16px',
          borderTop: `1px solid ${colors.utility.primaryText}10`
        }}>
          {/* Donut Chart */}
          <div style={{
            width: '100px',
            height: '100px',
            flexShrink: 0
          }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={colors.utility.primaryText + '10'}
                strokeWidth="12"
              />
              {/* Segments */}
              {donutSegments()}
              {/* Center text */}
              <text
                x="50"
                y="50"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  fill: colors.utility.primaryText
                }}
              >
                {assetTypeCount} Types
              </text>
            </svg>
          </div>

          {/* Asset List */}
          <div style={{ flex: 1 }}>
            {byAssetType.slice(0, 4).map((asset, index) => (
              <div
                key={asset.asset_type_code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: index < Math.min(byAssetType.length, 4) - 1
                    ? `1px solid ${colors.utility.primaryText}08`
                    : 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '2px',
                    backgroundColor: getAssetTypeColor(asset.asset_type_code)
                  }} />
                  <span style={{
                    fontSize: '12px',
                    color: colors.utility.primaryText,
                    fontWeight: '500'
                  }}>
                    {asset.asset_type_name}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText
                  }}>
                    {asset.allocation_percentage.toFixed(1)}%
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    minWidth: '70px',
                    textAlign: 'right'
                  }}>
                    {NetworthService.formatLargeCurrency(asset.current_value)}
                  </span>
                </div>
              </div>
            ))}

            {byAssetType.length > 4 && (
              <div style={{
                fontSize: '11px',
                color: colors.brand.primary,
                marginTop: '8px',
                cursor: 'pointer'
              }}>
                +{byAssetType.length - 4} more asset types
              </div>
            )}
          </div>
        </div>
      )}

      {/* Investment Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div>
          <div style={{
            fontSize: '10px',
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}>
            Total Invested
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            {NetworthService.formatCurrency(totalInvested)}
          </div>
        </div>

        <div>
          <div style={{
            fontSize: '10px',
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}>
            Current Value
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            {NetworthService.formatCurrency(totalNetworth)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworthSummary;
