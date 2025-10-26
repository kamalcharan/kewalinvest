// frontend/src/components/goals/AssetAllocationUtilization.tsx
import React, { useState, useEffect } from 'react';
import { PieChart, AlertCircle, TrendingUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalService, SchemeAllocationUtilization } from '../../services/goal.service';

interface AssetAllocationUtilizationProps {
  customerId: number;
}

export const AssetAllocationUtilization: React.FC<AssetAllocationUtilizationProps> = ({
  customerId
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [utilizationData, setUtilizationData] = useState<SchemeAllocationUtilization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);

  useEffect(() => {
    loadUtilizationData();
  }, [customerId]);

  const loadUtilizationData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await GoalService.getAssetAllocationUtilization(customerId);

      if (response.success && response.data) {
        setUtilizationData(response.data);
      } else {
        setError(response.error || 'Failed to load allocation data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load allocation data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return `₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getUtilizationColor = (percentage: number): string => {
    if (percentage >= 100) return colors.semantic.error;
    if (percentage >= 80) return colors.semantic.warning;
    return colors.semantic.success;
  };

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <p style={{ color: colors.utility.secondaryText }}>Loading allocation data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: colors.semantic.error + '15',
          border: `1px solid ${colors.semantic.error}40`,
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <AlertCircle size={20} style={{ color: colors.semantic.error }} />
        <p style={{ color: colors.semantic.error, margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (utilizationData.length === 0) {
    return (
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center'
        }}
      >
        <PieChart size={40} style={{ color: colors.utility.secondaryText, margin: '0 auto 12px' }} />
        <p style={{ color: colors.utility.secondaryText, margin: 0 }}>No allocation data available</p>
      </div>
    );
  }

  return (
    <div>
      <h3
        style={{
          fontSize: '16px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <PieChart size={18} />
        Asset Allocation Utilization
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {utilizationData.map((scheme) => (
          <div
            key={scheme.scheme_code}
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}10`,
              borderRadius: '12px',
              padding: '16px',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Scheme Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
                cursor: scheme.allocation_breakdown.length > 0 ? 'pointer' : 'default'
              }}
              onClick={() => {
                if (scheme.allocation_breakdown.length > 0) {
                  setExpandedScheme(expandedScheme === scheme.scheme_code ? null : scheme.scheme_code);
                }
              }}
            >
              <div style={{ flex: 1 }}>
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    margin: '0 0 4px 0'
                  }}
                >
                  {scheme.scheme_name}
                </h4>
                <span
                  style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText
                  }}
                >
                  {scheme.scheme_code}
                </span>
              </div>

              {/* Utilization Badge */}
              {scheme.is_fully_allocated && (
                <span
                  style={{
                    padding: '4px 10px',
                    backgroundColor: colors.semantic.error + '15',
                    border: `1px solid ${colors.semantic.error}40`,
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: colors.semantic.error
                  }}
                >
                  Fully Allocated
                </span>
              )}
            </div>

            {/* Portfolio Value */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                Total Portfolio Value
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
                {formatCurrency(scheme.total_portfolio_value)}
              </div>
            </div>

            {/* Allocation Progress */}
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}
              >
                <span style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                  Allocated to Goals
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: getUtilizationColor(scheme.allocated_percentage)
                  }}
                >
                  {formatPercentage(scheme.allocated_percentage)}
                </span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  height: '8px',
                  backgroundColor: colors.utility.primaryText + '10',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(scheme.allocated_percentage, 100)}%`,
                    backgroundColor: getUtilizationColor(scheme.allocated_percentage),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Available/Allocated Values */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                  Allocated
                </div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.semantic.warning }}>
                  {formatCurrency(scheme.allocated_value)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                  Available
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: scheme.available_percentage > 0 ? colors.semantic.success : colors.utility.secondaryText
                  }}
                >
                  {formatCurrency(scheme.available_value)}
                </div>
              </div>
            </div>

            {/* Allocation Breakdown (Expandable) */}
            {expandedScheme === scheme.scheme_code && scheme.allocation_breakdown.length > 0 && (
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: `1px solid ${colors.utility.primaryText}10`
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '12px'
                  }}
                >
                  Goal Allocation Breakdown
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {scheme.allocation_breakdown.map((alloc) => (
                    <div
                      key={alloc.goal_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        backgroundColor: colors.utility.primaryBackground,
                        borderRadius: '6px'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          color: colors.utility.primaryText
                        }}
                      >
                        {alloc.goal_name}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: colors.brand.primary
                          }}
                        >
                          {formatPercentage(alloc.allocation_percentage)}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: colors.utility.secondaryText
                          }}
                        >
                          {formatCurrency(alloc.allocation_value)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Click to expand hint */}
            {scheme.allocation_breakdown.length > 0 && expandedScheme !== scheme.scheme_code && (
              <div
                style={{
                  marginTop: '12px',
                  fontSize: '11px',
                  color: colors.brand.primary,
                  textAlign: 'center',
                  opacity: 0.7
                }}
              >
                Click to see goal breakdown
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetAllocationUtilization;
