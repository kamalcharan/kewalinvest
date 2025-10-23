// frontend/src/pages/market/MarketAnalysisDashboard.tsx

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useMarketDashboard } from '../../hooks/useMarketData';
import { useDashboardStatistics } from '../../hooks/useMarketMetrics';
import type { MarketIndex } from '../../types/market.types';

type TimePeriod = '1m' | '3m' | '6m' | '1y';

const MarketAnalysisDashboard: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3m');

  // Fetch real data from API
  const { indices, isLoading: indicesLoading } = useMarketDashboard();
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStatistics(selectedPeriod);

  const isLoading = indicesLoading || statsLoading;

  const handleIndexClick = (indexId: number) => {
    navigate(`/market/indices/${indexId}`);
  };

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
  };

  // Find worst performer from heatmap
  const worstPerformer = dashboardStats?.heatmap
    ?.filter(item => item.return_value !== null)
    .sort((a, b) => (a.return_value || 0) - (b.return_value || 0))[0];

  // Transform dashboard stats into KPI cards
  const kpiCards = dashboardStats ? [
    {
      label: 'Best Performer',
      value: dashboardStats.best_performer?.index_name || 'N/A',
      detail: dashboardStats.best_performer?.return_value !== undefined && dashboardStats.best_performer?.return_value !== null
        ? `${dashboardStats.best_performer.return_value > 0 ? '+' : ''}${dashboardStats.best_performer.return_value.toFixed(2)}%`
        : '',
      status: 'positive' as const,
      icon: '📈'
    },
    {
      label: 'Worst Performer',
      value: worstPerformer?.index_name || 'N/A',
      detail: worstPerformer?.return_value !== undefined && worstPerformer?.return_value !== null
        ? `${worstPerformer.return_value > 0 ? '+' : ''}${worstPerformer.return_value.toFixed(2)}%`
        : '',
      status: 'negative' as const,
      icon: '📉'
    },
    {
      label: 'Most Volatile',
      value: dashboardStats.most_volatile?.index_name || 'N/A',
      detail: dashboardStats.most_volatile?.volatility_value !== undefined && dashboardStats.most_volatile?.volatility_value !== null
        ? `${dashboardStats.most_volatile.volatility_value.toFixed(2)}%`
        : '',
      status: 'neutral' as const,
      icon: '📊'
    },
    {
      label: 'Market Breadth',
      value: dashboardStats.indices_up ?? 'N/A',
      detail: `${dashboardStats.indices_up || 0} advancing, ${dashboardStats.indices_down || 0} declining`,
      unit: dashboardStats.total_indices_analyzed ? `/ ${dashboardStats.total_indices_analyzed}` : '',
      status: 'neutral' as const,
      icon: '📋'
    }
  ] : [
    { label: 'Best Performer', value: 'Loading...', status: 'neutral' as const, icon: '📈', detail: '', unit: '' },
    { label: 'Worst Performer', value: 'Loading...', status: 'neutral' as const, icon: '📉', detail: '', unit: '' },
    { label: 'Most Volatile', value: 'Loading...', status: 'neutral' as const, icon: '📊', detail: '', unit: '' },
    { label: 'Market Breadth', value: 'Loading...', status: 'neutral' as const, icon: '📋', detail: '', unit: '' }
  ];

  // Transform indices into performance data
  const indexPerformances = indices.map((index: MarketIndex) => {
    // Get return value from dashboard stats heatmap if available
    const heatmapData = dashboardStats?.heatmap?.find(item => item.index_id === index.id);

    return {
      id: index.id,
      index_name: index.index_name,
      index_code: index.index_code,
      return_value: heatmapData?.return_value || 0,
      status: (heatmapData?.return_value || 0) > 0 ? 'positive' as const
        : (heatmapData?.return_value || 0) < 0 ? 'negative' as const
        : 'neutral' as const,
      has_metrics: heatmapData?.return_value !== null && heatmapData?.return_value !== undefined && index.historical_data_available
    };
  });

  const getStatusColor = (status: 'positive' | 'negative' | 'neutral') => {
    switch (status) {
      case 'positive':
        return theme.colors.semantic.success;
      case 'negative':
        return theme.colors.semantic.error;
      default:
        return theme.colors.utility.secondaryText;
    }
  };

  const getStatusBgColor = (status: 'positive' | 'negative' | 'neutral') => {
    switch (status) {
      case 'positive':
        return theme.colors.semantic.success + '15';
      case 'negative':
        return theme.colors.semantic.error + '15';
      default:
        return theme.colors.utility.primaryBackground;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '30px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          marginBottom: '30px'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            margin: '0 0 8px 0'
          }}>
            📊 Market Analysis Dashboard
          </h1>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            Monitor NSE indices performance and analytics
          </p>
        </div>

        {/* Time Period Filter */}
        <div style={{
          marginBottom: '30px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          {(['1m', '3m', '6m', '1y'] as TimePeriod[]).map(period => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              style={{
                padding: '10px 18px',
                backgroundColor: selectedPeriod === period
                  ? colors.brand.primary
                  : colors.utility.secondaryBackground,
                color: selectedPeriod === period
                  ? 'white'
                  : colors.utility.primaryText,
                border: selectedPeriod === period
                  ? 'none'
                  : `1px solid ${colors.utility.secondaryText}30`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedPeriod !== period) {
                  e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                  e.currentTarget.style.borderColor = colors.brand.primary + '50';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPeriod !== period) {
                  e.currentTarget.style.borderColor = colors.utility.secondaryText + '30';
                }
              }}
            >
              {period === '1m' && '1 Month'}
              {period === '3m' && '3 Months'}
              {period === '6m' && '6 Months'}
              {period === '1y' && '1 Year'}
            </button>
          ))}
        </div>

        {/* KPI Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {kpiCards.map((card, index) => (
            <div
              key={index}
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                padding: '24px',
                borderRadius: '10px',
                border: `1px solid ${colors.utility.primaryText}10`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px',
                fontWeight: '600'
              }}>
                {card.label}
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                minHeight: '40px'
              }}>
                <div style={{
                  fontSize: card.value === 'Loading...' || card.value === 'N/A' ? '16px' : '20px',
                  color: card.value === 'Loading...' || card.value === 'N/A'
                    ? colors.utility.secondaryText
                    : getStatusColor(card.status),
                  fontWeight: card.value === 'Loading...' || card.value === 'N/A' ? '500' : '700',
                  lineHeight: '1.2',
                  flex: 1
                }}>
                  {card.value}
                  {(card as any).unit && ` ${(card as any).unit}`}
                </div>
              </div>

              {(card as any).detail && (
                <div style={{
                  padding: '10px',
                  backgroundColor: getStatusBgColor(card.status),
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: colors.utility.primaryText,
                  fontWeight: '500'
                }}>
                  {(card as any).detail}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Heatmap Section */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px',
          border: `1px solid ${colors.utility.primaryText}10`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: '0 0 20px 0'
          }}>
            Index Performance Heatmap ({selectedPeriod.toUpperCase()} Returns)
          </h2>

          {isLoading ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.utility.secondaryText
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                ⏳
              </div>
              <p style={{
                fontSize: '16px',
                fontWeight: '500',
                margin: '0 0 8px 0',
                color: colors.utility.primaryText
              }}>
                Loading market data...
              </p>
            </div>
          ) : indexPerformances.length === 0 || indexPerformances.every(idx => !idx.has_metrics) ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.utility.secondaryText
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>
                📊
              </div>
              <p style={{
                fontSize: '16px',
                fontWeight: '500',
                margin: '0 0 8px 0',
                color: colors.utility.primaryText
              }}>
                {indices.length === 0 ? 'No indices available' : 'No metrics calculated yet'}
              </p>
              <p style={{
                fontSize: '13px',
                margin: '0 0 16px 0',
                lineHeight: '1.6'
              }}>
                {indices.length === 0
                  ? 'Indices will appear here once they are configured'
                  : 'Click on an index below to view details and calculate metrics. Metrics are required to display performance data.'}
              </p>
              {indices.length > 0 && (
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  backgroundColor: colors.semantic.info + '10',
                  border: `1px solid ${colors.semantic.info}30`,
                  borderRadius: '8px',
                  textAlign: 'left',
                  fontSize: '13px',
                  lineHeight: '1.6'
                }}>
                  <strong style={{ color: colors.semantic.info }}>📌 Quick Start:</strong>
                  <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                    <li>Click on any index tile below</li>
                    <li>On the detail page, click "Calculate Metrics"</li>
                    <li>Return to this dashboard to see performance data</li>
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px'
            }}>
              {indexPerformances.map((index) => (
                <div
                  key={index.id}
                  onClick={() => handleIndexClick(index.id)}
                  style={{
                    padding: '18px',
                    backgroundColor: index.has_metrics
                      ? getStatusBgColor(index.status)
                      : colors.utility.primaryBackground,
                    border: `1px solid ${colors.utility.primaryText}10`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    {index.index_name}
                  </div>

                  <div style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: index.has_metrics
                      ? getStatusColor(index.status)
                      : colors.utility.secondaryText,
                    marginBottom: '8px'
                  }}>
                    {index.has_metrics ? `${index.return_value > 0 ? '+' : ''}${index.return_value.toFixed(2)}%` : '--'}
                  </div>

                  {!index.has_metrics && (
                    <div style={{
                      fontSize: '11px',
                      color: colors.utility.secondaryText,
                      fontStyle: 'italic'
                    }}>
                      No data
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div style={{
          marginTop: '30px',
          padding: '16px',
          backgroundColor: colors.semantic.info + '10',
          border: `1px solid ${colors.semantic.info}30`,
          borderRadius: '8px',
          fontSize: '13px',
          color: colors.utility.secondaryText,
          lineHeight: '1.6'
        }}>
          <strong style={{ color: colors.semantic.info }}>ℹ️ Getting Started:</strong>
          <br />
          Click on any index tile to view detailed analysis. Use the "Calculate" button on the index detail page to compute metrics for the first time. Daily calculations will run automatically at 11:00 PM.
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MarketAnalysisDashboard;