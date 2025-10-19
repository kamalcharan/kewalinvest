// frontend/src/pages/market/IndexDetailPage.tsx

import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import {
  useCalculateMetrics,
  useIndexMetrics,
  useIndexReturnsTimeSeries,
  useIndexVolatilityTimeSeries,
  MARKET_ANALYSIS_QUERY_KEYS
} from '../../hooks/useMarketMetrics';
import type { IndexMetrics } from '../../types/marketAnalysis.types';

type ActiveTab = 'chart' | 'returns' | 'volatility' | 'statistics';
type TimePeriod = '1m' | '3m' | '6m' | '1y';
type Granularity = 'daily' | 'monthly';

interface TimeSeriesPoint {
  date: string;
  [key: string]: any;
}

const IndexDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const indexId = parseInt(idParam || '0', 10);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1y');
  const [granularity, setGranularity] = useState<Granularity>('daily');

  // Hooks for data fetching and mutations
  const metricsQuery = useIndexMetrics(indexId);
  const returnsTimeSeriesQuery = useIndexReturnsTimeSeries(
    indexId,
    ['1m', '3m', '6m', '1y', 'ytd', 'all'],
    granularity
  );
  const volatilityTimeSeriesQuery = useIndexVolatilityTimeSeries(
    indexId,
    granularity
  );
  const calculateMetricsMutation = useCalculateMetrics();

  // Extract data
  const metrics = metricsQuery.data as IndexMetrics | null;
  const returnsTimeSeries = returnsTimeSeriesQuery.data || [];
  const volatilityTimeSeries = volatilityTimeSeriesQuery.data || [];

  // Loading and error states
  const isLoading = metricsQuery.isLoading || returnsTimeSeriesQuery.isLoading || volatilityTimeSeriesQuery.isLoading;
  const isCalculating = calculateMetricsMutation.isPending;
  const hasMetrics = !!metrics && metrics.id !== undefined;
  const calculationError = calculateMetricsMutation.error?.message;

  // Event handlers
  const handleBack = () => {
    try {
      navigate(-1);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation back failed',
        'IndexDetailPage',
        { action: 'back', error: error.message },
        error.stack
      );
    }
  };

  const handleCalculateMetrics = () => {
    try {
      if (!indexId || indexId <= 0) {
        throw new Error('Invalid index ID');
      }
      calculateMetricsMutation.mutate(indexId);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Calculate metrics action failed',
        'IndexDetailPage',
        { indexId, error: error.message },
        error.stack
      );
    }
  };

  const handleTimePeriodChange = (period: TimePeriod) => {
    try {
      setTimePeriod(period);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Time period change failed',
        'IndexDetailPage',
        { period, error: error.message },
        error.stack
      );
    }
  };

  const handleGranularityChange = (gran: Granularity) => {
    try {
      setGranularity(gran);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Granularity change failed',
        'IndexDetailPage',
        { granularity: gran, error: error.message },
        error.stack
      );
    }
  };

  // Utility functions
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'broad':
        return colors.brand.primary;
      case 'sectoral':
        return colors.brand.secondary;
      case 'thematic':
        return colors.semantic.info;
      default:
        return colors.utility.secondaryText;
    }
  };

  const formatMetricValue = (value: number | null, decimals: number = 2): string => {
    if (value === null || value === undefined) return '--';
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  };

  // Memoized latest values from time-series data
  const latestReturns = useMemo(() => {
    if (returnsTimeSeries.length === 0) return {};
    const latest = returnsTimeSeries[returnsTimeSeries.length - 1];
    return {
      return_1m: latest.return_1m,
      return_3m: latest.return_3m,
      return_6m: latest.return_6m,
      return_1y: latest.return_1y,
      return_ytd: latest.return_ytd,
      return_all: latest.return_all
    };
  }, [returnsTimeSeries]);

  const latestVolatility = useMemo(() => {
    if (volatilityTimeSeries.length === 0) return {};
    const latest = volatilityTimeSeries[volatilityTimeSeries.length - 1];
    return {
      volatility_7d: latest.sd_7d,
      volatility_14d: latest.sd_14d,
      volatility_30d: latest.sd_21d,
      volatility_60d: latest.sd_42d,
      volatility_90d: latest.sd_3m
    };
  }, [volatilityTimeSeries]);

  // Tab definitions
  const tabs = [
    { id: 'chart' as ActiveTab, label: 'Chart', icon: '📈' },
    { id: 'returns' as ActiveTab, label: 'Returns', icon: '💹' },
    { id: 'volatility' as ActiveTab, label: 'Volatility', icon: '📉' },
    { id: 'statistics' as ActiveTab, label: 'Statistics', icon: '📊' }
  ];

  // Loading state
  if (isLoading && !hasMetrics) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        padding: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          color: colors.utility.secondaryText
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>⏳</div>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Loading index details...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '30px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Back Button */}
        <button
          onClick={handleBack}
          style={{
            marginBottom: '20px',
            padding: '10px 16px',
            backgroundColor: 'transparent',
            color: colors.utility.secondaryText,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
            e.currentTarget.style.borderColor = colors.brand.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
          }}
        >
          ← Back
        </button>

        {/* Header Section */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          padding: '24px',
          borderRadius: '12px',
          border: `1px solid ${colors.utility.primaryText}10`,
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: 0
              }}>
                Index #{indexId}
              </h1>
              <span style={{
                padding: '6px 12px',
                backgroundColor: colors.brand.primary + '15',
                color: colors.brand.primary,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {hasMetrics ? 'Calculated' : 'Not Calculated'}
              </span>
            </div>

            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '8px'
            }}>
              Last Updated: {hasMetrics && metrics?.metrics_calculated_at ? new Date(metrics.metrics_calculated_at).toLocaleString('en-IN') : 'Not available'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            {hasMetrics && metrics?.last_price !== null ? (
              <>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: colors.brand.primary,
                  lineHeight: '1'
                }}>
                  {metrics?.last_price?.toFixed(2)}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: colors.utility.secondaryText,
                  marginTop: '6px'
                }}>
                  Current Price
                </div>
              </>
            ) : (
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                fontStyle: 'italic'
              }}>
                --
              </div>
            )}
          </div>
        </div>

        {/* Calculate Button or Status */}
        {!hasMetrics ? (
          <div style={{
            marginBottom: '30px',
            padding: '16px',
            backgroundColor: colors.semantic.warning + '10',
            border: `1px solid ${colors.semantic.warning}30`,
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.semantic.warning,
                marginBottom: '4px'
              }}>
                Metrics Not Calculated
              </div>
              <div style={{
                fontSize: '13px',
                color: colors.utility.secondaryText
              }}>
                Click the button below to calculate metrics from available historical data
              </div>
            </div>
            
            <button
              onClick={handleCalculateMetrics}
              disabled={isCalculating}
              style={{
                padding: '10px 24px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isCalculating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                opacity: isCalculating ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                marginLeft: '16px'
              }}
              onMouseEnter={(e) => {
                if (!isCalculating) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isCalculating ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Calculating...
                </>
              ) : (
                <>Calculate Metrics</>
              )}
            </button>
          </div>
        ) : (
          <div style={{
            marginBottom: '30px',
            padding: '16px',
            backgroundColor: colors.semantic.success + '10',
            border: `1px solid ${colors.semantic.success}30`,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.semantic.success
            }}>
              Metrics Calculated
            </div>
            <div style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              marginTop: '4px'
            }}>
              Last calculated: {metrics?.metrics_calculated_at ? new Date(metrics.metrics_calculated_at).toLocaleString('en-IN') : 'Recently'}
            </div>
          </div>
        )}

        {/* Error Display */}
        {calculationError && (
          <div style={{
            marginBottom: '30px',
            padding: '16px',
            backgroundColor: colors.semantic.error + '10',
            border: `1px solid ${colors.semantic.error}30`,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.semantic.error,
              marginBottom: '4px'
            }}>
              Calculation Failed
            </div>
            <div style={{
              fontSize: '13px',
              color: colors.semantic.error
            }}>
              {calculationError}
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div style={{
          display: 'flex',
          gap: '0',
          borderBottom: `2px solid ${colors.utility.primaryText}10`,
          marginBottom: '30px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px 8px 0 0',
          overflow: 'hidden'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '16px 20px',
                backgroundColor: 'transparent',
                color: activeTab === tab.id 
                  ? colors.brand.primary 
                  : colors.utility.secondaryText,
                border: 'none',
                borderBottom: activeTab === tab.id 
                  ? `3px solid ${colors.brand.primary}` 
                  : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = colors.utility.primaryText;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = colors.utility.secondaryText;
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '0 0 12px 12px',
          padding: '30px',
          border: `1px solid ${colors.utility.primaryText}10`,
          borderTop: 'none',
          minHeight: '500px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {!hasMetrics ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: colors.utility.secondaryText,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: '64px',
                marginBottom: '16px',
                opacity: 0.5
              }}>
                📭
              </div>
              <p style={{
                fontSize: '16px',
                fontWeight: '500',
                margin: '0 0 8px 0',
                color: colors.utility.primaryText
              }}>
                No Data Available
              </p>
              <p style={{
                fontSize: '13px',
                margin: '0 0 20px 0',
                maxWidth: '400px'
              }}>
                Calculate metrics using the button above to see analysis for this index
              </p>
              <button
                onClick={handleCalculateMetrics}
                disabled={isCalculating}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isCalculating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                {isCalculating ? 'Calculating...' : 'Calculate Now'}
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'chart' && (
                <div style={{
                  minHeight: '450px',
                  backgroundColor: colors.utility.primaryBackground,
                  borderRadius: '8px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: `1px dashed ${colors.utility.primaryText}20`
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
                  <p style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: colors.utility.primaryText,
                    margin: '0 0 8px 0'
                  }}>
                    Chart Component Here
                  </p>
                  <p style={{
                    fontSize: '13px',
                    color: colors.utility.secondaryText,
                    margin: 0
                  }}>
                    ChartViewer component will be integrated here
                  </p>
                </div>
              )}

              {activeTab === 'returns' && (
                <div>
                  <div style={{
                    marginBottom: '20px',
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText }}>Granularity:</span>
                      {(['daily', 'monthly'] as Granularity[]).map(gran => (
                        <button
                          key={gran}
                          onClick={() => handleGranularityChange(gran)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: granularity === gran ? colors.brand.primary : colors.utility.primaryBackground,
                            color: granularity === gran ? 'white' : colors.utility.primaryText,
                            border: `1px solid ${colors.utility.primaryText}20`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {gran.charAt(0).toUpperCase() + gran.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {returnsTimeSeriesQuery.isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>
                      <p>Loading returns data...</p>
                    </div>
                  ) : returnsTimeSeries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>
                      <p>No returns data available</p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px'
                    }}>
                      {[
                        { key: 'return_1m', label: '1M' },
                        { key: 'return_3m', label: '3M' },
                        { key: 'return_6m', label: '6M' },
                        { key: 'return_1y', label: '1Y' },
                        { key: 'return_ytd', label: 'YTD' },
                        { key: 'return_all', label: 'All-Time' }
                      ].map(period => (
                        <div
                          key={period.key}
                          style={{
                            padding: '20px',
                            backgroundColor: colors.utility.primaryBackground,
                            borderRadius: '8px',
                            border: `1px solid ${colors.utility.primaryText}10`,
                            textAlign: 'center'
                          }}
                        >
                          <div style={{
                            fontSize: '12px',
                            color: colors.utility.secondaryText,
                            marginBottom: '8px',
                            fontWeight: '500',
                            textTransform: 'uppercase'
                          }}>
                            {period.label}
                          </div>
                          <div style={{
                            fontSize: '28px',
                            fontWeight: '700',
                            color: colors.utility.secondaryText
                          }}>
                            {formatMetricValue((latestReturns as any)[period.key] || null)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'volatility' && (
                <div>
                  <div style={{
                    marginBottom: '20px',
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText }}>Granularity:</span>
                      {(['daily', 'monthly'] as Granularity[]).map(gran => (
                        <button
                          key={gran}
                          onClick={() => handleGranularityChange(gran)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: granularity === gran ? colors.brand.primary : colors.utility.primaryBackground,
                            color: granularity === gran ? 'white' : colors.utility.primaryText,
                            border: `1px solid ${colors.utility.primaryText}20`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {gran.charAt(0).toUpperCase() + gran.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {volatilityTimeSeriesQuery.isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>
                      <p>Loading volatility data...</p>
                    </div>
                  ) : volatilityTimeSeries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>
                      <p>No volatility data available</p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px'
                    }}>
                      {[
                        { key: 'volatility_7d', label: '7D Volatility' },
                        { key: 'volatility_14d', label: '14D Volatility' },
                        { key: 'volatility_30d', label: '30D Volatility' },
                        { key: 'volatility_60d', label: '60D Volatility' },
                        { key: 'volatility_90d', label: '90D Volatility' }
                      ].map(vol => (
                        <div
                          key={vol.key}
                          style={{
                            padding: '20px',
                            backgroundColor: colors.utility.primaryBackground,
                            borderRadius: '8px',
                            border: `1px solid ${colors.utility.primaryText}10`,
                            textAlign: 'center'
                          }}
                        >
                          <div style={{
                            fontSize: '12px',
                            color: colors.utility.secondaryText,
                            marginBottom: '8px',
                            fontWeight: '500'
                          }}>
                            {vol.label}
                          </div>
                          <div style={{
                            fontSize: '28px',
                            fontWeight: '700',
                            color: colors.utility.secondaryText
                          }}>
                            {formatMetricValue((latestVolatility as any)[vol.key] || null)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'statistics' && (
                <div>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{
                        backgroundColor: colors.utility.primaryBackground,
                        borderBottom: `2px solid ${colors.utility.primaryText}10`
                      }}>
                        <th style={{
                          padding: '14px 16px',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: colors.utility.primaryText
                        }}>
                          Metric
                        </th>
                        <th style={{
                          padding: '14px 16px',
                          textAlign: 'right',
                          fontWeight: '600',
                          color: colors.utility.primaryText
                        }}>
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Daily Return', value: metrics?.daily_return },
                        { label: 'CAGR', value: metrics?.cagr },
                        { label: 'Sharpe Ratio', value: metrics?.sharpe_ratio },
                        { label: 'Max Drawdown', value: metrics?.max_drawdown },
                        { label: 'Total Risk', value: metrics?.total_risk },
                        { label: '1W Return', value: metrics?.return_1w },
                        { label: '1M Return', value: metrics?.return_1m },
                        { label: '3M Return', value: metrics?.return_3m },
                        { label: '6M Return', value: metrics?.return_6m },
                        { label: '1Y Return', value: metrics?.return_1y },
                        { label: 'YTD Return', value: metrics?.return_ytd },
                        { label: 'All-Time Return', value: metrics?.return_all }
                      ].map((metric, idx) => (
                        <tr
                          key={metric.label}
                          style={{
                            borderBottom: `1px solid ${colors.utility.primaryText}05`,
                            backgroundColor: idx % 2 === 0 ? 'transparent' : colors.utility.primaryBackground
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : colors.utility.primaryBackground;
                          }}
                        >
                          <td style={{
                            padding: '14px 16px',
                            color: colors.utility.primaryText,
                            fontWeight: '500'
                          }}>
                            {metric.label}
                          </td>
                          <td style={{
                            padding: '14px 16px',
                            textAlign: 'right',
                            color: colors.utility.secondaryText,
                            fontFamily: 'monospace'
                          }}>
                            {formatMetricValue(metric.value as number || null)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default IndexDetailPage;