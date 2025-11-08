// frontend/src/components/portfolio/PortfolioSnapshotsTable.tsx
// Portfolio Snapshots Table with tree structure showing all metrics
// Each scheme has 4 expandable rows: Units, NAV, Market Value, Performance

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ChevronDown, ChevronRight, TrendingUp, BarChart3 } from 'lucide-react';
import { usePortfolioSnapshots } from '../../hooks/usePortfolioData';

interface PortfolioSnapshotsTableProps {
  customerId: number;
  months?: number;
}

type ExpandedRowType = 'units' | 'nav' | 'market_value' | 'performance';

export const PortfolioSnapshotsTable: React.FC<PortfolioSnapshotsTableProps> = ({
  customerId,
  months = 12,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [expandedSchemes, setExpandedSchemes] = useState<Set<string>>(new Set());

  const { data, isLoading, error, isError } = usePortfolioSnapshots(
    customerId,
    months
  );

  const schemes = data?.data?.schemes || [];

  // Initialize with all schemes expanded by default
  useEffect(() => {
    if (schemes.length > 0) {
      const allSchemeCodes = schemes.map((scheme: any) => scheme.scheme_code);
      setExpandedSchemes(new Set(allSchemeCodes));
    }
  }, [schemes.length]);

  const toggleSchemeExpansion = (schemeCode: string) => {
    const newExpanded = new Set(expandedSchemes);
    if (newExpanded.has(schemeCode)) {
      newExpanded.delete(schemeCode);
    } else {
      newExpanded.add(schemeCode);
    }
    setExpandedSchemes(newExpanded);
  };

  const expandAll = () => {
    const allSchemeCodes = schemes.map((scheme: any) => scheme.scheme_code);
    setExpandedSchemes(new Set(allSchemeCodes));
  };

  const collapseAll = () => {
    setExpandedSchemes(new Set());
  };

  // Format month display (Nov'24)
  const formatMonthHeader = (monthData: any) => {
    if (monthData?.month_display) {
      const parts = monthData.month_display.split(' '); // "Nov 2024"
      return `${parts[0]}'${parts[1]?.slice(-2)}`; // "Nov'24"
    }
    return '';
  };

  // Format value based on type
  const formatValue = (value: number | undefined | null, type: 'units' | 'nav' | 'market_value' | 'percentage') => {
    if (value === undefined || value === null) return '-';

    switch (type) {
      case 'units':
        return value.toFixed(3);
      case 'nav':
        return `₹${value.toFixed(2)}`;
      case 'market_value':
        return `₹${(value / 100000).toFixed(2)}L`;
      case 'percentage':
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
      default:
        return value.toString();
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

  const allExpanded = expandedSchemes.size === schemes.length;
  const allCollapsed = expandedSchemes.size === 0;

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: `2px solid ${colors.utility.primaryText}20`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color={colors.brand.primary} />
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: '0'
            }}>
              Portfolio Snapshots - {months} Month View
            </h3>
          </div>
          <p style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            margin: '8px 0 0 0'
          }}>
            Click ▶ to expand and view Units, NAV, Market Value, and Performance metrics
          </p>
        </div>

        {/* Expand/Collapse All Button */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={expandAll}
            disabled={allExpanded}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '500',
              color: allExpanded ? colors.utility.secondaryText : colors.brand.primary,
              backgroundColor: allExpanded ? colors.utility.primaryBackground : `${colors.brand.primary}10`,
              border: `1px solid ${allExpanded ? colors.utility.primaryText + '20' : colors.brand.primary}`,
              borderRadius: '6px',
              cursor: allExpanded ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: allExpanded ? 0.5 : 1
            }}
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            disabled={allCollapsed}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '500',
              color: allCollapsed ? colors.utility.secondaryText : colors.brand.primary,
              backgroundColor: allCollapsed ? colors.utility.primaryBackground : `${colors.brand.primary}10`,
              border: `1px solid ${allCollapsed ? colors.utility.primaryText + '20' : colors.brand.primary}`,
              borderRadius: '6px',
              cursor: allCollapsed ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: allCollapsed ? 0.5 : 1
            }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Table Container with Fixed Header and Scrollable Body */}
      <div style={{
        maxHeight: '600px',
        overflow: 'auto',
        position: 'relative'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead style={{
            position: 'sticky',
            top: 0,
            zIndex: 3,
            backgroundColor: colors.utility.primaryBackground
          }}>
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
                zIndex: 4,
                minWidth: '320px',
                boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
              }}>
                Scheme Name
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
                    minWidth: '90px',
                    backgroundColor: idx === 0
                      ? `${colors.brand.primary}15`
                      : colors.utility.primaryBackground
                  }}
                >
                  {formatMonthHeader(month)}
                  {idx === 0 && (
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
                        : colors.utility.primaryBackground,
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleSchemeExpansion(scheme.scheme_code)}
                  >
                    <td style={{
                      padding: '12px 16px',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: schemeIdx % 2 === 0
                        ? colors.utility.secondaryBackground
                        : colors.utility.primaryBackground,
                      zIndex: 2,
                      boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: colors.utility.primaryText
                        }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <div style={{ flex: 1 }}>
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
                            {scheme.scheme_code} • {scheme.category}{scheme.sub_category ? ` • ${scheme.sub_category}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement chart view functionality
                            console.log('View chart for:', scheme.scheme_code);
                          }}
                          style={{
                            border: 'none',
                            background: `${colors.brand.primary}15`,
                            borderRadius: '6px',
                            padding: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.brand.primary,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `${colors.brand.primary}25`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = `${colors.brand.primary}15`;
                          }}
                          title="View Chart"
                        >
                          <BarChart3 size={16} />
                        </button>
                      </div>
                    </td>
                    <td colSpan={monthHeaders.length} style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '11px',
                      color: colors.utility.secondaryText
                    }}>
                      {isExpanded ? 'Click to collapse' : 'Click to expand metrics'}
                    </td>
                  </tr>

                  {/* Expandable Rows - Units */}
                  {isExpanded && (
                    <tr style={{
                      backgroundColor: `${colors.utility.primaryText}05`,
                      borderBottom: `1px solid ${colors.utility.primaryText}05`
                    }}>
                      <td style={{
                        padding: '8px 16px 8px 48px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        fontWeight: '500',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: `${colors.utility.primaryText}05`,
                        zIndex: 2,
                        boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📦</span>
                          <span>Units</span>
                        </div>
                      </td>
                      {scheme.monthly_data.map((month: any, idx: number) => (
                        <td
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontWeight: '500',
                            fontSize: '12px',
                            color: colors.utility.primaryText,
                            backgroundColor: idx === 0
                              ? `${colors.brand.primary}10`
                              : undefined
                          }}
                        >
                          {formatValue(month.closing_units, 'units')}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Expandable Rows - NAV */}
                  {isExpanded && (
                    <tr style={{
                      backgroundColor: `${colors.utility.primaryText}05`,
                      borderBottom: `1px solid ${colors.utility.primaryText}05`
                    }}>
                      <td style={{
                        padding: '8px 16px 8px 48px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        fontWeight: '500',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: `${colors.utility.primaryText}05`,
                        zIndex: 2,
                        boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>💰</span>
                          <span>NAV</span>
                        </div>
                      </td>
                      {scheme.monthly_data.map((month: any, idx: number) => (
                        <td
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontWeight: '500',
                            fontSize: '12px',
                            color: month.has_nav_data ? colors.utility.primaryText : colors.semantic.error,
                            backgroundColor: idx === 0
                              ? `${colors.brand.primary}10`
                              : undefined
                          }}
                        >
                          {month.has_nav_data
                            ? formatValue(month.closing_nav, 'nav')
                            : 'No data'}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Expandable Rows - Market Value */}
                  {isExpanded && (
                    <tr style={{
                      backgroundColor: `${colors.utility.primaryText}05`,
                      borderBottom: `1px solid ${colors.utility.primaryText}05`
                    }}>
                      <td style={{
                        padding: '8px 16px 8px 48px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        fontWeight: '500',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: `${colors.utility.primaryText}05`,
                        zIndex: 2,
                        boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📊</span>
                          <span>Market Value</span>
                        </div>
                      </td>
                      {scheme.monthly_data.map((month: any, idx: number) => (
                        <td
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'right',
                            fontWeight: '500',
                            fontSize: '12px',
                            color: colors.utility.primaryText,
                            backgroundColor: idx === 0
                              ? `${colors.brand.primary}10`
                              : undefined
                          }}
                        >
                          {formatValue(month.market_value, 'market_value')}
                        </td>
                      ))}
                    </tr>
                  )}

                  {/* Expandable Rows - Performance */}
                  {isExpanded && (
                    <tr style={{
                      backgroundColor: `${colors.utility.primaryText}05`,
                      borderBottom: `1px solid ${colors.utility.primaryText}10`
                    }}>
                      <td style={{
                        padding: '8px 16px 8px 48px',
                        fontSize: '12px',
                        color: colors.utility.primaryText,
                        fontWeight: '500',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: `${colors.utility.primaryText}05`,
                        zIndex: 2,
                        boxShadow: `2px 0 4px ${colors.utility.primaryText}10`
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📈</span>
                          <span>Performance (MoM)</span>
                        </div>
                      </td>
                      {scheme.monthly_data.map((month: any, idx: number) => {
                        const changePercentage = month.month_change_percentage || 0;
                        return (
                          <td
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              textAlign: 'right',
                              fontWeight: '500',
                              fontSize: '12px',
                              color: changePercentage >= 0
                                ? colors.semantic.success
                                : colors.semantic.error,
                              backgroundColor: idx === 0
                                ? `${colors.brand.primary}10`
                                : undefined
                            }}
                          >
                            {formatValue(changePercentage, 'percentage')}
                          </td>
                        );
                      })}
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
        * Current month data • Click ▶ to expand and view detailed metrics (Units, NAV, Market Value, Performance)
      </div>
    </div>
  );
};

export default PortfolioSnapshotsTable;
