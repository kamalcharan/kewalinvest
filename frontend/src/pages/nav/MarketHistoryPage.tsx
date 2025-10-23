// frontend/src/pages/nav/MarketHistoryPage.tsx
// Market Data History - Download and manage NSE market indices

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useMarketDashboard } from '../../hooks/useMarketData';
import StatisticsBar from '../../components/market/StatisticsBar';
import FilterBar, { type FilterState } from '../../components/market/FilterBar';
import IndexCard from '../../components/market/IndexCard';
import DateRangePicker from '../../components/market/DateRangePicker';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import { toastService } from '../../services/toast.service';
import MarketService from '../../services/market.service';
import { marketAnalysisService } from '../../services/marketAnalysis.service';
import type { MarketIndex } from '../../types/market.types';

const MarketHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const { isSuperAdmin } = useAuth();

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

  // Calculate metrics state
  const [calculatingIndexId, setCalculatingIndexId] = useState<number | null>(null);

  // Download tracking state
  const [downloadingIndexId, setDownloadingIndexId] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

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

  // Handle Dashboard/Metrics click
  const handleViewDashboard = useCallback((index: MarketIndex) => {
    navigate(`/market/indices/${index.id}`);

    FrontendErrorLogger.info(
      'Navigating to index detail dashboard',
      'MarketHistoryPage',
      {
        indexId: index.id,
        indexName: index.index_name
      }
    );
  }, [navigate]);

  // Handle Download Historical click with smart date auto-fill
  const handleDownloadHistorical = useCallback((index: MarketIndex) => {
    setSelectedIndex(index);
    setShowDatePicker(true);

    FrontendErrorLogger.info(
      'Opening date picker for historical download',
      'MarketHistoryPage',
      {
        indexId: index.id,
        indexName: index.index_name,
        yahoo_symbol: index.yahoo_symbol,
        latestDate: index.latest_date,
        hasData: index.historical_data_available
      }
    );
  }, []);

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Start polling for download completion
  const startPolling = useCallback((indexId: number, indexName: string, initialRecordCount: number) => {
    let pollCount = 0;
    const maxPolls = 24; // 2 minutes max (24 * 5 seconds)

    setDownloadingIndexId(indexId);
    setDownloadProgress(`Downloading data for ${indexName}...`);

    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollCount++;

      // Update progress message
      const elapsed = pollCount * 5;
      setDownloadProgress(`Downloading ${indexName}... (${elapsed}s elapsed)`);

      // Refetch data to check if download completed
      refetchAll();

      // Check if we should stop polling
      if (pollCount >= maxPolls) {
        clearInterval(pollingIntervalRef.current!);
        pollingIntervalRef.current = null;
        setDownloadingIndexId(null);
        setDownloadProgress('');
        toastService.info('Download is taking longer than expected. Please refresh the page in a few moments.');
      }
    }, 5000);

    // Also do an immediate refetch after 3 seconds (for fast downloads)
    setTimeout(() => {
      refetchAll();
    }, 3000);
  }, [refetchAll]);

  // Stop polling when data updates
  React.useEffect(() => {
    if (downloadingIndexId && indices.length > 0) {
      const downloadingIndex = indices.find(idx => idx.id === downloadingIndexId);
      if (downloadingIndex && downloadingIndex.historical_data_available) {
        // Download completed!
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setDownloadingIndexId(null);
        setDownloadProgress('');
        toastService.success(`Download completed for ${downloadingIndex.index_name}`);
      }
    }
  }, [downloadingIndexId, indices]);

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

      // Start polling for completion
      startPolling(selectedIndex.id, selectedIndex.index_name, selectedIndex.total_records || 0);

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
  }, [selectedIndex, downloadHistorical, startPolling]);

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

      // Start polling for completion
      startPolling(index.id, index.index_name, index.total_records || 0);

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
  }, [downloadEOD, startPolling]);

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

  // Handle Calculate Metrics
  const handleCalculateMetrics = useCallback(async (index: MarketIndex) => {
    setCalculatingIndexId(index.id);

    FrontendErrorLogger.info(
      'Starting metrics calculation',
      'MarketHistoryPage',
      {
        indexId: index.id,
        indexName: index.index_name,
        recordCount: index.total_records
      }
    );

    try {
      const response = await marketAnalysisService.calculateMetrics({
        index_id: index.id,
        recalculate: true
      });

      if (response.success) {
        toastService.success(`Metrics calculated successfully for ${index.index_name}`);
        setTimeout(() => {
          refetchAll();
        }, 1000);
      } else {
        throw new Error(response.error || 'Calculation failed');
      }

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to calculate metrics';
      toastService.error(`Calculation failed: ${errorMsg}`);

      FrontendErrorLogger.error(
        'Metrics calculation failed',
        'MarketHistoryPage',
        {
          indexId: index.id,
          error: errorMsg
        },
        err.stack
      );
    } finally {
      setCalculatingIndexId(null);
    }
  }, [refetchAll]);

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
        'Connection test error',
        'MarketHistoryPage',
        { error: err.message },
        err.stack
      );
    } finally {
      setIsTestingConnection(false);
    }
  }, []);

  // Error display
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        padding: '24px',
        backgroundColor: colors.utility.secondaryBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          padding: '32px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '12px',
          border: `1px solid ${colors.semantic.error}40`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: colors.semantic.error,
            marginBottom: '12px'
          }}>
            Failed to Load Market Data
          </h2>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.brand.primary,
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
      padding: '24px',
      backgroundColor: colors.utility.secondaryBackground
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
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
                  onViewDashboard={handleViewDashboard}
                  onCalculateMetrics={handleCalculateMetrics}
                  onDownloadHistorical={handleDownloadHistorical}
                  onDownloadEOD={handleDownloadEOD}
                  onDelete={handleDelete}
                  showDeleteButton={isSuperAdmin}
                  isDownloading={downloadingIndexId === index.id}
                  isCalculating={calculatingIndexId === index.id}
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

      {/* Date Range Picker Modal with Smart Date Auto-fill */}
      <DateRangePicker
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleDateConfirm}
        indexName={selectedIndex?.index_name || ''}
        defaultStartDate={
          selectedIndex?.latest_date
            ? new Date(new Date(selectedIndex.latest_date).getTime() + 24 * 60 * 60 * 1000)
                .toISOString().split('T')[0]
            : undefined
        }
        defaultEndDate={new Date().toISOString().split('T')[0]}
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

      {/* Download Progress Overlay */}
      {downloadingIndexId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              textAlign: 'center'
            }}
          >
            {/* Spinner */}
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 24px',
                border: `4px solid ${colors.utility.primaryText}20`,
                borderTop: `4px solid ${colors.brand.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />

            {/* Progress Text */}
            <h3
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '12px'
              }}
            >
              Download in Progress
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                lineHeight: '1.6'
              }}
            >
              {downloadProgress}
            </p>
            <p
              style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                fontStyle: 'italic'
              }}
            >
              Please wait... This may take a few moments for large datasets.
            </p>
          </div>
        </div>
      )}

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