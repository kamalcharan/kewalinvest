// frontend/src/components/networth/NetworthBreakdown.tsx
// Detailed breakdown view by asset type with investment plans
// Cycle 3 - Frontend Basic Display

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  NetworthBreakdownResponse,
  AssetTypeBreakdown,
  InvestmentPlanDetail,
  getAssetTypeColor
} from '../../types/networth.types';
import { NetworthService } from '../../services/networth.service';

interface NetworthBreakdownProps {
  data: NetworthBreakdownResponse;
  showInvestmentPlans?: boolean;
  onAssetTypeClick?: (assetType: AssetTypeBreakdown) => void;
  onPlanClick?: (plan: InvestmentPlanDetail) => void;
}

const NetworthBreakdown: React.FC<NetworthBreakdownProps> = ({
  data,
  showInvestmentPlans = true,
  onAssetTypeClick,
  onPlanClick
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const [expandedAssetType, setExpandedAssetType] = useState<string | null>(null);

  const breakdown = data?.breakdown ?? [];
  const totalNetworth = data?.total_networth ?? 0;
  const totalInvested = data?.total_invested ?? 0;

  // Icons
  const ChevronDownIcon = ({ expanded }: { expanded: boolean }) => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease'
      }}
    >
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const TrendUpIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  );

  const TrendDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
      <polyline points="17,18 23,18 23,12" />
    </svg>
  );

  const handleAssetTypeToggle = (assetTypeCode: string) => {
    setExpandedAssetType(prev => prev === assetTypeCode ? null : assetTypeCode);
  };

  // Investment Plan Row Component
  const InvestmentPlanRow = ({ plan }: { plan: InvestmentPlanDetail }) => {
    const isPositive = (plan.return_percentage ?? 0) >= 0;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px',
          marginBottom: '6px',
          cursor: onPlanClick ? 'pointer' : 'default'
        }}
        onClick={() => onPlanClick?.(plan)}
      >
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '4px'
          }}>
            {plan.plan_name}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '11px',
            color: colors.utility.secondaryText
          }}>
            <span>{plan.investment_type === 'sip' ? 'SIP' : plan.investment_type === 'recurring' ? 'Recurring' : 'One-time'}</span>
            <span>{plan.calculation_method}</span>
            {plan.growth_rate_applied && (
              <span>@ {plan.growth_rate_applied}%</span>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText,
              marginBottom: '2px'
            }}>
              Invested
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              {NetworthService.formatLargeCurrency(plan.principal_amount)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText,
              marginBottom: '2px'
            }}>
              Current
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              {NetworthService.formatLargeCurrency(plan.current_value)}
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            minWidth: '70px',
            justifyContent: 'flex-end',
            color: NetworthService.getReturnColor(plan.return_percentage)
          }}>
            {isPositive ? <TrendUpIcon /> : <TrendDownIcon />}
            <span style={{ fontSize: '12px', fontWeight: '600' }}>
              {NetworthService.formatPercentage(plan.return_percentage)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Asset Type Card Component
  const AssetTypeCard = ({ assetType }: { assetType: AssetTypeBreakdown }) => {
    const isExpanded = expandedAssetType === assetType.asset_type_code;
    const isPositive = (assetType.return_percentage ?? 0) >= 0;
    const assetColor = getAssetTypeColor(assetType.asset_type_code);

    return (
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          border: `1px solid ${colors.utility.primaryText}10`,
          overflow: 'hidden',
          marginBottom: '12px'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onClick={() => {
            handleAssetTypeToggle(assetType.asset_type_code);
            onAssetTypeClick?.(assetType);
          }}
        >
          {/* Asset Type Icon */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: assetColor + '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              backgroundColor: assetColor
            }} />
          </div>

          {/* Asset Type Info */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '15px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {assetType.asset_type_name}
              </span>
              <span style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                backgroundColor: colors.utility.primaryText + '10',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                {assetType.investment_plans?.length || 0} plans
              </span>
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              {assetType.allocation_percentage.toFixed(1)}% of portfolio
              {assetType.default_assumption_rate > 0 && (
                <span> • Default rate: {assetType.default_assumption_rate}%</span>
              )}
            </div>
          </div>

          {/* Values */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px'
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                marginBottom: '2px'
              }}>
                Invested
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                {NetworthService.formatCurrency(assetType.total_invested)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                marginBottom: '2px'
              }}>
                Current Value
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {NetworthService.formatCurrency(assetType.current_value)}
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '80px',
              justifyContent: 'flex-end',
              color: NetworthService.getReturnColor(assetType.return_percentage)
            }}>
              {isPositive ? <TrendUpIcon /> : <TrendDownIcon />}
              <span style={{ fontSize: '14px', fontWeight: '600' }}>
                {NetworthService.formatPercentage(assetType.return_percentage)}
              </span>
            </div>

            {showInvestmentPlans && assetType.investment_plans?.length > 0 && (
              <div style={{ color: colors.utility.secondaryText }}>
                <ChevronDownIcon expanded={isExpanded} />
              </div>
            )}
          </div>
        </div>

        {/* Allocation Bar */}
        <div style={{
          height: '4px',
          backgroundColor: colors.utility.primaryText + '10',
          marginTop: '-8px'
        }}>
          <div style={{
            height: '100%',
            width: `${assetType.allocation_percentage}%`,
            backgroundColor: assetColor,
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Investment Plans (Expanded) */}
        {showInvestmentPlans && isExpanded && assetType.investment_plans?.length > 0 && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: colors.utility.primaryBackground + '50',
            borderTop: `1px solid ${colors.utility.primaryText}08`
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '10px'
            }}>
              Investment Plans
            </div>
            {assetType.investment_plans.map(plan => (
              <InvestmentPlanRow key={plan.investment_plan_id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (breakdown.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        color: colors.utility.secondaryText
      }}>
        No breakdown data available
      </div>
    );
  }

  return (
    <div>
      {/* Summary Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            marginBottom: '4px'
          }}>
            Portfolio Breakdown
          </div>
          <div style={{
            fontSize: '11px',
            color: colors.utility.secondaryText
          }}>
            {data.total_asset_types} asset types • {data.total_investment_plans} investment plans
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '24px'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText,
              marginBottom: '2px'
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

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText,
              marginBottom: '2px'
            }}>
              Total Networth
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: '700',
              color: colors.utility.primaryText
            }}>
              {NetworthService.formatCurrency(totalNetworth)}
            </div>
          </div>
        </div>
      </div>

      {/* Asset Type Cards */}
      {breakdown.map(assetType => (
        <AssetTypeCard key={assetType.asset_type_code} assetType={assetType} />
      ))}
    </div>
  );
};

export default NetworthBreakdown;
