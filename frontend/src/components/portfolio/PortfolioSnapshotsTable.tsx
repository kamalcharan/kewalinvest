// frontend/src/components/portfolio/PortfolioSnapshotsTable.tsx
// Portfolio Snapshots Table showing all schemes with 12-month view
// Inspired by HTML documentation design

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { usePortfolioSnapshots } from '../../hooks/usePortfolioData';

interface PortfolioSnapshotsTableProps {
  customerId: number;
  months?: number;
}

type ViewType = 'units' | 'nav' | 'market_value';

export const PortfolioSnapshotsTable: React.FC<PortfolioSnapshotsTableProps> = ({
  customerId,
  months = 12,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [viewType, setViewType] = useState<ViewType>('units');
  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(new Set());

  const { data, isLoading, error, isError } = usePortfolioSnapshots(
    customerId,
    months,
    viewType
  );

  const toggleSchemeExpansion = (schemeCode: string) => {
    const newExpanded = new Set(expandedSchemes);
    if (newExpanded.has(schemeCode)) {
      newExpanded.delete(schemeCode);
    } else {
      newExpanded.add(schemeCode);
    }
    setExpandedSchemes(newExpanded);
  };

  // Format month display (Nov'24)
  const formatMonthHeader = (monthData: any) => {
    if (monthData?.month_display) {
      const parts = monthData.month_display.split(' '); // "Nov 2024"
      return `${parts[0]}'${parts[1]?.slice(-2)}`; // "Nov'24"
    }
    return '';
  };

  // Format value based on view type
  const formatValue = (value: number | undefined, viewType: ViewType) => {
    if (value === undefined || value === null) return '-';

    switch (viewType) {
      case 'units':
        return value.toFixed(3);
      case 'nav':
        return `₹${value.toFixed(2)}`;
      case 'market_value':
        return `₹${(value / 100000).toFixed(2)}L`;
      default:
        return value.toString();
    }
  };

  // Get value from month data based on view type
  const getValue = (monthData: any, viewType: ViewType) => {
    switch (viewType) {
      case 'units':
        return monthData?.closing_units;
      case 'nav':
        return monthData?.closing_nav;
      case 'market_value':
        return monthData?.market_value;
      default:
        return 0;
    }
  };

  if (isLoading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: colors.utility.secondaryText,
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px'
      }}>
        Loading portfolio snapshots...
      </div>
    );
  }

  if (isError || error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: `${colors.semantic.error}10`,
        border: `1px solid ${colors.semantic.error}`,
        borderRadius: '8px',
        color: colors.semantic.error
      }}>
        Failed to load portfolio snapshots
      </div>
    );
  }

  const schemes = data?.data?.schemes || [];

  if (schemes.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: colors.utility.secondaryText,
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px'
      }}>
        No portfolio data available for the selected period
      </div>
    );
  }

  // Get month headers from first scheme's data
  const monthHeaders = schemes[0]?.monthly_data || [];

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header with Tabs */}
      <div style={{
        padding: '20px',
        borderBottom: `2px solid ${colors.utility.primaryText}20`
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          margin: '0 0 16px 0'
        }}>
          📈 Portfolio Snapshots - {months} Month View
        </h3>

        {/* View Type Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px',
          padding: '4px'
        }}>
          {[
            { id: 'units' as ViewType, label: '📦 Units Snapshot', icon: '📦' },
            { id: 'nav' as ViewType, label: '💰 NAV Values', icon: '💰' },
            { id: 'market_value' as ViewType, label: '📊 Market Value', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewType(tab.id)}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                background: viewType === tab.id
                  ? colors.brand.primary
                  : 'transparent',
                color: viewType === tab.id
                  ? 'white'
                  : colors.utility.primaryText,
                fontSize: '13px',
                fontWeight: viewType === tab.id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container with Horizontal Scroll */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead>
            <tr style={{
              backgroundColor: colors.utility.primaryBackground,
              borderBottom: `2px solid ${colors.utility.primaryText}20`
            }}>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                textTransform: 'uppercase',
                position: 'sticky',
                left: 0,
                backgroundColor: colors.utility.primaryBackground,
                zIndex: 2,
                minWidth: '280px'
              }}>
                Scheme Name
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                width: '50px'
              }}>
                📊
              </th>
              {monthHeaders.map((month: any, idx: number) => (
                <th
                  key={idx}
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: colors.utility.secondaryText,
                    textTransform: 'uppercase',
                    minWidth: '80px',
                    backgroundColor: idx === monthHeaders.length - 1
                      ? `${colors.brand.primary}10`
                      : undefined
                  }}
                >
                  {formatMonthHeader(month)}
                  {idx === monthHeaders.length - 1 && (
                    <span style={{ marginLeft: '4px', color: colors.brand.primary }}>*</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schemes.map((scheme: any, schemeIdx: number) => {
              const isExpanded = expandedSchemes.has(scheme.scheme_code);

              return (
                <React.Fragment key={scheme.scheme_code}>
                  {/* Main Scheme Row */}
                  <tr
                    style={{
                      borderBottom: `1px solid ${colors.utility.primaryText}10`,
                      backgroundColor: schemeIdx % 2 === 0
                        ? colors.utility.secondaryBackground
                        : colors.utility.primaryBackground
                    }}
                  >
                    <td style={{
                      padding: '12px 16px',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: schemeIdx % 2 === 0
                        ? colors.utility.secondaryBackground
                        : colors.utility.primaryBackground,
                      zIndex: 1
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <button
                          onClick={() => toggleSchemeExpansion(scheme.scheme_code)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            color: colors.utility.primaryText
                          }}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        <div>
                          <div style={{
                            fontWeight: '700',
                            color: colors.utility.primaryText,
                            fontSize: '13px'
                          }}>
                            {scheme.scheme_name}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: colors.utility.secondaryText
                          }}>
                            {scheme.category}{scheme.sub_category ? ` • ${scheme.sub_category}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <button
                        style={{
                          border: 'none',
                          background: `${colors.brand.primary}15`,
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: colors.brand.primary
                        }}
                        title="View Chart"
                      >
                        <BarChart3 size={16} />
                      </button>
                    </td>
                    {scheme.monthly_data.map((month: any, idx: number) => (
                      <td
                        key={idx}
                        style={{
                          padding: '12px',
                          textAlign: 'right',
                          fontWeight: '500',
                          color: colors.utility.primaryText,
                          backgroundColor: idx === scheme.monthly_data.length - 1
                            ? `${colors.brand.primary}10`
                            : undefined
                        }}
                      >
                        {formatValue(getValue(month, viewType), viewType)}
                      </td>
                    ))}
                  </tr>

                  {/* Performance Summary Row (Expandable) */}
                  {isExpanded && scheme.summary && (
                    <tr style={{
                      backgroundColor: `${colors.utility.primaryText}05`,
                      borderBottom: `1px solid ${colors.utility.primaryText}10`
                    }}>
                      <td
                        colSpan={monthHeaders.length + 2}
                        style={{
                          padding: '12px 16px 12px 48px',
                          fontSize: '12px',
                          color: colors.utility.secondaryText
                        }}
                      >
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                          {viewType === 'units' && (
                            <>
                              <div>
                                <strong style={{ color: colors.utility.primaryText }}>
                                  Closing Units:
                                </strong>{' '}
                                {formatValue(scheme.summary.closing_units, viewType)}
                              </div>
                              <div>
                                <strong style={{ color: colors.utility.primaryText }}>
                                  Units Added:
                                </strong>{' '}
                                {formatValue(scheme.summary.total_units_added, viewType)}
                              </div>
                            </>
                          )}
                          {viewType === 'nav' && (
                            <>
                              <div>
                                <strong style={{ color: colors.utility.primaryText }}>
                                  Latest NAV:
                                </strong>{' '}
                                {formatValue(scheme.summary.closing_nav, viewType)}
                              </div>
                              <div>
                                <strong style={{ color: colors.utility.primaryText }}>
                                  NAV Change:
                                </strong>{' '}
                                <span style={{
                                  color: (scheme.summary.nav_change_percentage || 0) >= 0
                                    ? colors.semantic.success
                                    : colors.semantic.error
                                }}>
                                  {(scheme.summary.nav_change_percentage || 0) >= 0 ? '+' : ''}
                                  {(scheme.summary.nav_change_percentage || 0).toFixed(2)}%
                                </span>
                              </div>
                            </>
                          )}
                          {viewType === 'market_value' && (
                            <>
                              <div>
                                <strong style={{ color: colors.utility.primaryText }}>
                                  Current Value:
                                </strong>{' '}
                                {formatValue(scheme.summary.current_market_value, viewType)}
                              </div>
                              <div>
                                <strong style={{ color: colors.utility.primaryText }}>
                                  Total Invested:
                                </strong>{' '}
                                {formatValue(scheme.summary.total_invested, viewType)}
                              </div>
                              <div>
                                <strong style={{ color: colors.utility.primaryText }}>
                                  P&L:
                                </strong>{' '}
                                <span style={{
                                  color: (scheme.summary.overall_profit_loss || 0) >= 0
                                    ? colors.semantic.success
                                    : colors.semantic.error
                                }}>
                                  {formatValue(scheme.summary.overall_profit_loss, viewType)}
                                  {' '}({(scheme.summary.overall_profit_loss_percentage || 0) >= 0 ? '+' : ''}
                                  {(scheme.summary.overall_profit_loss_percentage || 0).toFixed(2)}%)
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: colors.utility.primaryBackground,
        borderTop: `1px solid ${colors.utility.primaryText}10`,
        fontSize: '12px',
        color: colors.utility.secondaryText
      }}>
        * Current month data • Click 📊 to view detailed chart • Click ▶ to expand performance summary
      </div>
    </div>
  );
};

export default PortfolioSnapshotsTable;
