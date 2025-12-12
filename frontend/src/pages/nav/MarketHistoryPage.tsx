// frontend/src/pages/nav/MarketHistoryPage.tsx
// Market Data History - Download and manage NSE market indices
// WITH BULK OPERATIONS SUPPORT

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
import { BulkDownloadModal } from '../../components/market/BulkDownloadModal';
import { BulkMetricsModal } from '../../components/market/BulkMetricsModal';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import { toastService } from '../../services/toast.service';
import MarketService from '../../services/market.service';
import { marketAnalysisService } from '../../services/marketAnalysis.service';
import type { MarketIndex } from '../../types/market.types';
import { CheckSquare, Square, Download, Calculator } from 'lucide-react';

const MarketHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const { isSuperAdmin } = useAuth();

  // Reusable Card component (matches Dashboard pattern)
  const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
    <div style={{
      backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
      borderRadius: '12px',
      border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
      boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
      padding: '20px',
      ...style
    }}>
      {children}
    </div>
  );

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    category: 'all',
    status: 'all',
    search: ''
  });

  // BULK OPERATIONS STATE
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showBulkDownloadModal, setShowBulkDownloadModal] = useState(false);
  const [showBulkMetricsModal, setShowBulkMetricsModal] = useState(false);

  // Modal states
  const [selectedIndex, setSelectedIndex] = useState<MarketIndex | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Connection test state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'ok' | 'failed'>('unknown');

  // Calculate metrics state
  const [calculatingIndexId, setCalculatingIndexId] = useState<number | null>(null);
  const [calculationProgress, setCalculationProgress] = useState<string>('');
  const calculationPollingRef = React.useRef<NodeJS.Timeout | null>(null);

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

  // ==================== BULK OPERATIONS HANDLERS ====================
  
  const handleSelectAll = useCallback(() => {
    if (selectedIndices.size === indices.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(indices.map(idx => idx.id)));
    }
  }, [indices, selectedIndices]);

  const handleSelectIndex = useCallback((indexId: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(indexId)) {
      newSelected.delete(indexId);
    } else {
      newSelected.add(indexId);
    }
    setSelectedIndices(newSelected);
  }, [selectedIndices]);

  const getSelectedIndicesData = useCallback((): MarketIndex[] => {
    return indices.filter(idx => selectedIndices.has(idx.id));
  }, [indices, selectedIndices]);

  const handleBulkDownload = useCallback(() => {
    const selected = getSelectedIndicesData();
    if (selected.length === 0) return;
    
    // Validate that selected indices have providers enabled
    const enabledCount = selected.filter(idx => idx.provider_enabled).length;
    if (enabledCount === 0) {
      toastService.warning('None of the selected indices have data providers configured and enabled.');
      return;
    }
    
    setShowBulkDownloadModal(true);
  }, [getSelectedIndicesData]);

  const handleBulkCalculate = useCallback(() => {
    const selected = getSelectedIndicesData();
    if (selected.length === 0) return;
    
    // Validate that selected indices have data
    const withDataCount = selected.filter(idx => idx.historical_data_available).length;
    if (withDataCount === 0) {
      toastService.warning('None of the selected indices have historical data. Please download data first.');
      return;
    }
    
    setShowBulkMetricsModal(true);
  }, [getSelectedIndicesData]);

  const handleBulkOperationSuccess = useCallback(() => {
    refetchAll();
    setSelectedIndices(new Set());
  }, [refetchAll]);

  // ==================== EXISTING HANDLERS ====================

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    // Clear selection when filters change
    setSelectedIndices(new Set());
    
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
      if (calculationPollingRef.current) {
        clearInterval(calculationPollingRef.current);
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

  // Start polling for calculation completion
  const startCalculationPolling = useCallback((indexId: number, indexName: string, totalRecords: number) => {
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes max (60 * 5 seconds)

    setCalculatingIndexId(indexId);
    setCalculationProgress(`Calculating metrics for ${indexName}... (${totalRecords.toLocaleString()} records)`);

    // Clear any existing polling
    if (calculationPollingRef.current) {
      clearInterval(calculationPollingRef.current);
    }

    // Poll every 5 seconds
    calculationPollingRef.current = setInterval(() => {
      pollCount++;

      // Update progress message
      const elapsed = pollCount * 5;
      setCalculationProgress(`Calculating ${indexName}... (${elapsed}s elapsed)`);

      // Refetch data to check if calculation completed
      refetchAll();

      // Check if we should stop polling
      if (pollCount >= maxPolls) {
        clearInterval(calculationPollingRef.current!);
        calculationPollingRef.current = null;
        setCalculatingIndexId(null);
        setCalculationProgress('');
        toastService.info('Calculation is taking longer than expected. Please check back in a few minutes.');
      }
    }, 5000);

    // Also do an immediate refetch after 3 seconds
    setTimeout(() => {
      refetchAll();
    }, 3000);
  }, [refetchAll]);

  // Stop calculation polling when metrics are calculated
  React.useEffect(() => {
    if (calculatingIndexId && indices.length > 0) {
      const calculatingIndex = indices.find(idx => idx.id === calculatingIndexId);
      // Check if this index now has metrics (assume latest_date exists means metrics exist)
      if (calculatingIndex) {
        // For now, we'll poll for a bit and then stop
        // A better approach would be to check if metrics_calculated_at timestamp changed
        // but we don't have that in the indices response

        // Simple heuristic: if we've been polling for 10+ seconds, assume it's done
        // This is not perfect but works for now
      }
    }
  }, [calculatingIndexId, indices]);

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
        // Check if it's async processing (status: 'processing')
        const isAsync = (response as any).status === 'processing';

        if (isAsync) {
          // Start polling for async calculation
          const estimatedMinutes = (response as any).estimated_time_minutes || 5;
          toastService.info(`Calculation started for ${index.index_name}. Estimated time: ${estimatedMinutes} minute(s).`);
          startCalculationPolling(index.id, index.index_name, index.total_records || 0);
        } else {
          // Synchronous completion
          toastService.success(`Metrics calculated successfully for ${index.index_name}`);
          setTimeout(() => {
            refetchAll();
          }, 1000);
        }
      } else {
        throw new Error(response.error || 'Calculation failed');
      }

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to calculate metrics';

      // Don't show error for timeout - it's probably async processing
      if (!errorMsg.includes('timeout')) {
        toastService.error(`Calculation failed: ${errorMsg}`);
      } else {
        toastService.info(`Calculation is running in background for ${index.index_name}.`);
        startCalculationPolling(index.id, index.index_name, index.total_records || 0);
      }

      FrontendErrorLogger.error(
        'Metrics calculation failed',
        'MarketHistoryPage',
        {
          indexId: index.id,
          error: errorMsg
        },
        err.stack
      );
    }
  }, [refetchAll, startCalculationPolling]);

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

  // Calculate derived values
  const isAllSelected = indices.length > 0 && selectedIndices.size === indices.length;
  const selectedCount = selectedIndices.size;

  // Error display
  if (error) {
    return (
      <div style={{
        padding: '24px',
        maxWidth: '1600px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC'
      }}>
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>⚠️</div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Failed to load market data
            </h2>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '16px'
            }}>
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.brand.primary,
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1600px',
      margin: '0 auto',
      minHeight: 'calc(100vh - 64px)',
      backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            margin: '0 0 4px 0'
          }}>
            Market Data History
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
            padding: '10px 20px',
            backgroundColor: connectionStatus === 'ok'
              ? colors.semantic.success
              : connectionStatus === 'failed'
              ? colors.semantic.error
              : colors.brand.primary,
            color: '#FFF',
            border: 'none',
            borderRadius: '8px',
            cursor: isTestingConnection ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isTestingConnection ? 0.7 : 1
          }}
        >
          {isTestingConnection ? (
            <>Testing...</>
          ) : connectionStatus === 'ok' ? (
            <>Connected</>
          ) : connectionStatus === 'failed' ? (
            <>Failed - Retry</>
          ) : (
            <>Test Connection</>
          )}
        </button>
      </div>

      {/* Statistics Bar */}
      <div style={{ marginBottom: '20px' }}>
        <StatisticsBar
          statistics={statistics}
          isLoading={isLoading}
        />
      </div>

      {/* Filter Bar */}
      <div style={{ marginBottom: '20px' }}>
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          totalResults={indices.length}
          isLoading={isLoading}
        />
      </div>

      {/* Bulk Actions Bar */}
      {indices.length > 0 && (
        <Card style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={handleSelectAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}
              >
                {isAllSelected ? (
                  <CheckSquare size={20} style={{ color: colors.brand.primary }} />
                ) : (
                  <Square size={20} style={{ color: colors.utility.secondaryText }} />
                )}
                Select All
              </button>

              {selectedCount > 0 && (
                <span style={{
                  padding: '4px 12px',
                  backgroundColor: colors.brand.primary + '15',
                  color: colors.brand.primary,
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  {selectedCount} selected
                </span>
              )}
            </div>

            {selectedCount > 0 && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleBulkDownload}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: colors.brand.primary,
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  <Download size={16} />
                  Download
                </button>
                <button
                  onClick={handleBulkCalculate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    backgroundColor: '#10B981',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  <Calculator size={16} />
                  Calculate
                </button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Indices Section */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            Market Indices ({indices.length})
          </h3>

          {isLoading && (
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Refreshing...
            </span>
          )}
        </div>

        {indices.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: colors.utility.secondaryText
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>
              {filters.search ? '🔍' : '📊'}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              {filters.search
                ? 'No indices found'
                : 'No market indices available'}
            </div>
            <div style={{ fontSize: '12px', marginBottom: '16px' }}>
              {filters.search
                ? `No results for "${filters.search}"`
                : 'Try adjusting your filters'}
            </div>
            {(filters.search || filters.status !== 'all' || filters.category !== 'all') && (
              <button
                onClick={() => setFilters({ category: 'all', status: 'all', search: '' })}
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.brand.primary,
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                isSelected={selectedIndices.has(index.id)}
                onSelect={handleSelectIndex}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '20px',
        padding: '16px 20px',
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#F0F9FF',
        borderRadius: '12px',
        border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#BAE6FD'}`,
        fontSize: '12px',
        color: colors.utility.secondaryText,
        lineHeight: '1.8'
      }}>
        <strong style={{ color: colors.utility.primaryText }}>About Market Data</strong>
        <div style={{ marginTop: '8px' }}>
          Data sourced from Yahoo Finance • Historical downloads fetch up to 20 years • EOD downloads run daily at 8:00 PM IST
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

      {/* BULK OPERATION MODALS */}
      <BulkDownloadModal
        isOpen={showBulkDownloadModal}
        onClose={() => setShowBulkDownloadModal(false)}
        selectedIndices={getSelectedIndicesData()}
        onSuccess={handleBulkOperationSuccess}
      />

      <BulkMetricsModal
        isOpen={showBulkMetricsModal}
        onClose={() => setShowBulkMetricsModal(false)}
        selectedIndices={getSelectedIndicesData()}
        onSuccess={handleBulkOperationSuccess}
      />

      {/* Download Progress Overlay */}
      {downloadingIndexId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFF',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 20px',
              border: `3px solid ${colors.utility.primaryText}20`,
              borderTop: `3px solid ${colors.brand.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Downloading...
            </h3>
            <p style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              {downloadProgress}
            </p>
          </div>
        </div>
      )}

      {/* Calculation Progress Overlay */}
      {calculatingIndexId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFF',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 20px',
              border: `3px solid ${colors.utility.primaryText}20`,
              borderTop: `3px solid #10B981`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Calculating Metrics...
            </h3>
            <p style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              {calculationProgress}
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