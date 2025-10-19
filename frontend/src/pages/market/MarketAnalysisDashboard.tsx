// frontend/src/pages/market/MarketAnalysisDashboard.tsx

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Mock types - will be imported from src/types/marketAnalysis.types.ts
interface KPIData {
  label: string;
  value: string | number;
  unit?: string;
  status: 'positive' | 'negative' | 'neutral';
  icon: string;
}

interface IndexPerformance {
  id: number;
  index_name: string;
  index_code: string;
  return_value: number;
  status: 'positive' | 'negative' | 'neutral';
  has_metrics: boolean;
}

type TimePeriod = '1m' | '3m' | '6m' | '1y';

const MarketAnalysisDashboard: React.FC = () => {
  // Mock theme (will use useTheme hook in real implementation)
  const theme = {
    colors: {
      brand: {
        primary: '#f83b46',
        secondary: '#ff6a73',
      },
      utility: {
        primaryText: '#141518',
        secondaryText: '#677681',
        primaryBackground: '#f1f4f8',
        secondaryBackground: '#ffffff',
      },
      semantic: {
        success: '#6bbd78',
        error: '#ff5963',
        warning: '#ec9c4b',
        info: '#0299ff',
      }
    }
  };

  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('3m');
  const navigate = useNavigate();
  
  // Mock data structure - will come from API
  const kpiCards: KPIData[] = [
    {
      label: 'Best Performer',
      value: 'No Data',
      status: 'neutral',
      icon: '📈'
    },
    {
      label: 'Most Volatile',
      value: 'No Data',
      status: 'neutral',
      icon: '📊'
    },
    {
      label: 'Market Breadth',
      value: 'No Data',
      unit: '%',
      status: 'neutral',
      icon: '📋'
    },
    {
      label: 'Avg Correlation',
      value: 'No Data',
      status: 'neutral',
      icon: '🔗'
    }
  ];

  // Mock indices - will come from API with metric data
  const indexPerformances: IndexPerformance[] = [
    { id: 1, index_name: 'NIFTY 50', index_code: 'NIFTY50', return_value: 0, status: 'neutral', has_metrics: false },
    { id: 2, index_name: 'NIFTY IT', index_code: 'NIFTYIT', return_value: 0, status: 'neutral', has_metrics: false },
    { id: 3, index_name: 'NIFTY BANK', index_code: 'NIFTYBANK', return_value: 0, status: 'neutral', has_metrics: false },
    { id: 4, index_name: 'NIFTY PHARMA', index_code: 'NIFTYPHARM', return_value: 0, status: 'neutral', has_metrics: false },
    { id: 5, index_name: 'NIFTY INFRA', index_code: 'NIFTYINFRA', return_value: 0, status: 'neutral', has_metrics: false },
    { id: 6, index_name: 'NIFTY PSU', index_code: 'NIFTYPSU', return_value: 0, status: 'neutral', has_metrics: false },
  ];

  const handleIndexClick = (indexId: number) => {
    navigate(`/market/indices/${indexId}`);
  };

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    // TODO: Fetch metrics for new period from API
    console.log('Fetch metrics for period:', period);
  };

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
      backgroundColor: theme.colors.utility.primaryBackground,
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
            color: theme.colors.utility.primaryText,
            margin: '0 0 8px 0'
          }}>
            📊 Market Analysis Dashboard
          </h1>
          <p style={{
            fontSize: '14px',
            color: theme.colors.utility.secondaryText,
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
                  ? theme.colors.brand.primary 
                  : theme.colors.utility.secondaryBackground,
                color: selectedPeriod === period 
                  ? 'white' 
                  : theme.colors.utility.primaryText,
                border: selectedPeriod === period
                  ? 'none'
                  : `1px solid ${theme.colors.utility.secondaryText}30`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (selectedPeriod !== period) {
                  e.currentTarget.style.backgroundColor = theme.colors.utility.secondaryBackground;
                  e.currentTarget.style.borderColor = theme.colors.brand.primary + '50';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPeriod !== period) {
                  e.currentTarget.style.borderColor = theme.colors.utility.secondaryText + '30';
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
                backgroundColor: theme.colors.utility.secondaryBackground,
                padding: '24px',
                borderRadius: '10px',
                border: `1px solid ${theme.colors.utility.primaryText}10`,
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
                color: theme.colors.utility.secondaryText,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '12px',
                fontWeight: '600'
              }}>
                {card.label}
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  fontSize: '32px',
                  color: getStatusColor(card.status),
                  fontWeight: '700',
                  lineHeight: '1'
                }}>
                  {card.value}
                </div>
                {card.unit && (
                  <div style={{
                    fontSize: '16px',
                    color: getStatusColor(card.status),
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    {card.unit}
                  </div>
                )}
              </div>

              <div style={{
                padding: '10px',
                backgroundColor: getStatusBgColor(card.status),
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '13px',
                color: theme.colors.utility.secondaryText
              }}>
                No data available
              </div>
            </div>
          ))}
        </div>

        {/* Heatmap Section */}
        <div style={{
          backgroundColor: theme.colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px',
          border: `1px solid ${theme.colors.utility.primaryText}10`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: theme.colors.utility.primaryText,
            margin: '0 0 20px 0'
          }}>
            Index Performance Heatmap ({selectedPeriod.toUpperCase()} Returns)
          </h2>

          {indexPerformances.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: theme.colors.utility.secondaryText
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>
                📭
              </div>
              <p style={{
                fontSize: '16px',
                fontWeight: '500',
                margin: '0 0 8px 0',
                color: theme.colors.utility.primaryText
              }}>
                No indices available
              </p>
              <p style={{
                fontSize: '13px',
                margin: 0
              }}>
                Indices will appear here once they are configured
              </p>
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
                      : theme.colors.utility.primaryBackground,
                    border: `1px solid ${theme.colors.utility.primaryText}10`,
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
                    color: theme.colors.utility.secondaryText,
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
                      : theme.colors.utility.secondaryText,
                    marginBottom: '8px'
                  }}>
                    {index.has_metrics ? `${index.return_value > 0 ? '+' : ''}${index.return_value.toFixed(2)}%` : '--'}
                  </div>

                  {!index.has_metrics && (
                    <div style={{
                      fontSize: '11px',
                      color: theme.colors.utility.secondaryText,
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
          backgroundColor: theme.colors.semantic.info + '10',
          border: `1px solid ${theme.colors.semantic.info}30`,
          borderRadius: '8px',
          fontSize: '13px',
          color: theme.colors.utility.secondaryText,
          lineHeight: '1.6'
        }}>
          <strong style={{ color: theme.colors.semantic.info }}>ℹ️ Getting Started:</strong>
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