// frontend/src/pages/nav/MarketHistoryPage.tsx
// Market Data History - Download and manage NSE market indices

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useMarketDashboard } from '../../hooks/useMarketData';
import StatisticsBar from '../../components/market/StatisticsBar';
import FilterBar, { type FilterState } from '../../components/market/FilterBar';
import IndexCard from '../../components/market/IndexCard';
import DateRangePicker from '../../components/market/DateRangePicker';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import { toastService } from '../../services/toast.service';
import MarketService from '../../services/market.service';
import type { MarketIndex } from '../../types/market.types';

const MarketHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    status: 'all',
    search: ''
  });

  // Modal states
  const [selectedIndex, setSelectedIndex] = useState<MarketIndex | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Connection test state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'ok' | 'failed'>('unknown');

  // Use combined dashboard hook
  const {
    indices,
    statistics,
    isLoading,
    error,
    refetchAll,
    downloadHistorical,
    downloadEOD,
    deleteData,
    isProcessing
  } = useMarketDashboard(filters);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    
    FrontendErrorLogger.info(
      'Filters changed',
      'MarketHistoryPage',
      { filters: newFilters }
    );
  }, []);

  // Handle Download Historical click
  const handleDownloadHistorical = useCallback((index: MarketIndex) => {
    setSelectedIndex(index);
    setShowDatePicker(true);
    
    FrontendErrorLogger.info(
      'Opening date picker for historical download',
      'MarketHistoryPage',
      {
        indexId: index.id,
        indexName: index.index_name,
        yahoo_symbol: index.yahoo_symbol
      }
    );
  }, []);

  // Handle Date Picker Confirm
  const handleDateConfirm = useCallback(async (startDate: string, endDate: string) => {
    if (!selectedIndex) return;

    setShowDatePicker(false);

    FrontendErrorLogger.info(
      'Starting historical download',
      'MarketHistoryPage',
      {
        indexId: selectedIndex.id,
        indexName: selectedIndex.index_name,
        startDate,
        endDate
      }
    );

    try {
      await downloadHistorical(selectedIndex.id, startDate, endDate);
      
      // Wait a bit then refetch to show updated data
      setTimeout(() => {
        refetchAll();
      }, 2000);

    } catch (err: any) {
      FrontendErrorLogger.error(
        'Historical download failed',
        'MarketHistoryPage',
        {
          indexId: selectedIndex.id,
          error: err.message
        },
        err.stack
      );
    }
  }, [selectedIndex, downloadHistorical, refetchAll]);

  // Handle EOD Download
  const handleDownloadEOD = useCallback(async (index: MarketIndex) => {
    FrontendErrorLogger.info(
      'Starting EOD download',
      'MarketHistoryPage',
      {
        indexId: index.id,
        indexName: index.index_name
      }
    );

    try {
      await downloadEOD(index.id);
      
      // Wait a bit then refetch to show updated data
      setTimeout(() => {
        refetchAll();
      }, 2000);

    } catch (err: any) {
      FrontendErrorLogger.error(
        'EOD download failed',
        'MarketHistoryPage',
        {
          indexId: index.id,
          error: err.message
        },
        err.stack
      );
    }
  }, [downloadEOD, refetchAll]);

  // Handle Delete click
  const handleDelete = useCallback((index: MarketIndex) => {
    setSelectedIndex(index);
    setShowDeleteDialog(true);
    
    FrontendErrorLogger.info(
      'Opening delete confirmation',
      'MarketHistoryPage',
      {
        indexId: index.id,
        indexName: index.index_name,
        recordCount: index.total_records
      }
    );
  }, []);

  // Handle Delete Confirm
  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedIndex) return;

    FrontendErrorLogger.info(
      'Deleting market data',
      'MarketHistoryPage',
      {
        indexId: selectedIndex.id,
        indexName: selectedIndex.index_name,
        recordCount: selectedIndex.total_records
      }
    );

    try {
      await deleteData(selectedIndex.id);
      setShowDeleteDialog(false);
      
      // Wait a bit then refetch to show updated data
      setTimeout(() => {
        refetchAll();
      }, 1000);

    } catch (err: any) {
      FrontendErrorLogger.error(
        'Delete failed',
        'MarketHistoryPage',
        {
          indexId: selectedIndex.id,
          error: err.message
        },
        err.stack
      );
    }
  }, [selectedIndex, deleteData, refetchAll]);

  // Handle connection test
  const handleTestConnection = useCallback(async () => {
    setIsTestingConnection(true);
    setConnectionStatus('unknown');

    FrontendErrorLogger.info(
      'Testing Yahoo Finance connection',
      'MarketHistoryPage',
      {}
    );

    try {
      const isConnected = await MarketService.testConnection();
      
      setConnectionStatus(isConnected ? 'ok' : 'failed');
      
      if (isConnected) {
        toastService.success('✅ Yahoo Finance connection successful');
        FrontendErrorLogger.info(
          'Connection test successful',
          'MarketHistoryPage',
          {}
        );
      } else {
        toastService.error('❌ Cannot connect to Yahoo Finance');
        FrontendErrorLogger.error(
          'Connection test failed',
          'MarketHistoryPage',
          {},
          undefined
        );
      }
    } catch (err: any) {
      setConnectionStatus('failed');
      toastService.error('❌ Connection test failed');
      
      FrontendErrorLogger.error(
        'Connection test exception',
        'MarketHistoryPage',
        { error: err.message },
        err.stack
      );
    } finally {
      setIsTestingConnection(false);
    }
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Initial load logging
  useEffect(() => {
    FrontendErrorLogger.info(
      'MarketHistoryPage mounted',
      'MarketHistoryPage',
      {}
    );
  }, []);

  // Loading state
  if (isLoading && indices.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          color: colors.utility.secondaryText
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `4px solid ${colors.utility.secondaryBackground}`,
            borderTop: `4px solid ${colors.brand.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Loading Market Data...
        </div>
      </div>
    );
  }

  // Error state
  if (error && indices.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: colors.semantic.error + '10',
          borderRadius: '12px',
          color: colors.semantic.error
        }}>
          <p style={{ marginBottom: '16px', fontSize: '16px' }}>⚠️ Failed to load Market Data</p>
          <p style={{ 
            marginBottom: '16px', 
            fontSize: '14px',
            color: colors.utility.secondaryText 
          }}>
            {error}
          </p>
          <button
            onClick={() => refetchAll()}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.semantic.error,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleBack}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ← Back
            </button>

            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: '0 0 4px 0'
              }}>
                📈 Market Data History
              </h1>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                margin: 0
              }}>
                Download and manage NSE market indices historical data
              </p>
            </div>
          </div>

          {/* Connection Test Button */}
          <button
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            style={{
              padding: '10px 16px',
              backgroundColor: connectionStatus === 'ok'
                ? colors.semantic.success
                : connectionStatus === 'failed'
                ? colors.semantic.error
                : colors.brand.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isTestingConnection ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.2s ease',
              opacity: isTestingConnection ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isTestingConnection) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isTestingConnection ? (
              <>⏳ Testing...</>
            ) : connectionStatus === 'ok' ? (
              <>✅ Connected</>
            ) : connectionStatus === 'failed' ? (
              <>❌ Failed</>
            ) : (
              <>🔍 Test Connection</>
            )}
          </button>
        </div>

        {/* Statistics Bar */}
        <StatisticsBar 
          statistics={statistics} 
          isLoading={isLoading} 
        />

        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          totalResults={indices.length}
          isLoading={isLoading}
        />

        {/* Indices Grid */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: 0
            }}>
              Market Indices ({indices.length})
            </h3>

            {isLoading && (
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: `2px solid ${colors.utility.secondaryText}40`,
                  borderTop: `2px solid ${colors.brand.primary}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Refreshing...
              </div>
            )}
          </div>

          {indices.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.utility.secondaryText
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                {filters.search ? '🔍' : filters.status !== 'all' || filters.category !== 'all' ? '🔎' : '📊'}
              </div>
              <h4 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                {filters.search 
                  ? 'No indices found' 
                  : filters.status !== 'all' || filters.category !== 'all'
                  ? 'No indices match your filters'
                  : 'No market indices available'}
              </h4>
              <p style={{ margin: '0 0 16px 0' }}>
                {filters.search 
                  ? `No results for "${filters.search}"` 
                  : 'Try adjusting your filters or search criteria'}
              </p>
              {(filters.search || filters.status !== 'all' || filters.category !== 'all') && (
                <button
                  onClick={() => setFilters({ category: 'all', status: 'all', search: '' })}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: colors.brand.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {indices.map((index) => (
                <IndexCard
                  key={index.id}
                  index={index}
                  onDownloadHistorical={handleDownloadHistorical}
                  onDownloadEOD={handleDownloadEOD}
                  onDelete={handleDelete}
                  isDownloading={isProcessing}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: colors.semantic.info + '10',
          border: `1px solid ${colors.semantic.info}30`,
          borderRadius: '8px',
          fontSize: '13px',
          color: colors.utility.secondaryText,
          lineHeight: '1.6'
        }}>
          <strong style={{ color: colors.semantic.info }}>ℹ️ About Market Data:</strong>
          <br />
          • Data is sourced from Yahoo Finance (free, no API key required)
          <br />
          • Historical downloads fetch up to 20 years of OHLCV data
          <br />
          • EOD (End of Day) downloads fetch the latest trading day data
          <br />
          • Auto-scheduled EOD downloads run daily at 8:00 PM IST
          <br />
          • All downloads are asynchronous and may take a few moments to complete
        </div>
      </div>

      {/* Date Range Picker Modal */}
      <DateRangePicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleDateConfirm}
        indexName={selectedIndex?.index_name || ''}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete All Data"
        description={`Are you sure you want to delete all ${selectedIndex?.total_records.toLocaleString()} records for ${selectedIndex?.index_name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="error"
        isLoading={isProcessing}
      />

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

export default MarketHistoryPage;