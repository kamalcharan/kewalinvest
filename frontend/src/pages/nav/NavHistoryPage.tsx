// frontend/src/pages/nav/NavHistoryPage.tsx
// UPDATED: Added bulk metrics calculation functionality

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBookmarks, useBulkDownload, useDownloadProgress } from '../../hooks/useNavData';
import { useBulkMetricsCalculation } from '../../hooks/useBulkMetricsCalculation';
import { EnhancedBookmarkCard } from '../../components/nav/EnhancedBookmarkCard';
import { BulkDownloadProgress } from '../../components/nav/BulkDownloadProgress';
import { HistoricalDownloadModal } from '../../components/nav/HistoricalDownloadModal';
import { NavProgressModal } from '../../components/nav/NavProgressModal';
import { MetricsCalculationModal } from '../../components/nav/MetricsCalculationModal';
import { BulkMetricsPreCheckModal } from '../../components/nav/BulkMetricsPreCheckModal';
import { BulkMetricsProgress } from '../../components/nav/BulkMetricsProgress';
import { AliasManagementModal } from '../../components/nav/AliasManagementModal';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import { toastService } from '../../services/toast.service';
import { navService } from '../../services/nav.service';
import { SchemeAliasService } from '../../services/schemeAlias.service';
import type { SchemeBookmark } from '../../types/nav.types';
import type { DownloadProgress } from '../../services/nav.service';

type FilterType = 'all' | 'success' | 'failed';

const NavHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const isAdmin = user?.tenant?.is_admin === true;

  // Refs
  const hasInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  const deletePollingRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks - NAV Downloads
  const {
    bookmarks,
    isLoading,
    error,
    fetchBookmarks,
    refetch,
    pagination
  } = useBookmarks({
    page: 1,
    page_size: 100,
    show_all: isAdmin ? 'true' : undefined // Admin sees all schemes, not tenant-filtered
  });

  const bulkDownload = useBulkDownload();
  const { startPolling, stopPolling } = useDownloadProgress();

  // Hooks - Metrics Calculation
  const bulkMetrics = useBulkMetricsCalculation({
    onComplete: (result) => {
      FrontendErrorLogger.info(
        'Bulk metrics calculation completed',
        'NavHistoryPage',
        {
          successful: result.successful,
          failed: result.failed,
          total: result.total_schemes,
        }
      );
      
      // Refresh bookmarks after calculation
      setTimeout(() => {
        if (isMountedRef.current) {
          refetch();
        }
      }, 1000);
    }
  });

  // Local state - Filters
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state - NAV Downloads
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<SchemeBookmark | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<DownloadProgress | null>(null);

  // Modal state - Metrics Calculation
  const [showMetricsCalculationModal, setShowMetricsCalculationModal] = useState(false);
  const [showMetricsPreCheckModal, setShowMetricsPreCheckModal] = useState(false);
  const [calculatingSchemeId, setCalculatingSchemeId] = useState<number | null>(null);

  // Modal state - Delete Confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bookmarkToDelete, setBookmarkToDelete] = useState<SchemeBookmark | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingSchemeId, setDeletingSchemeId] = useState<number | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<string>('');

  // Modal state - Alias Management
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [aliasBookmark, setAliasBookmark] = useState<SchemeBookmark | null>(null);

  // Alias backfill state
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Prevent multiple fetches on mount
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      FrontendErrorLogger.info('NavHistoryPage initialized', 'NavHistoryPage', {});
    }
    
    return () => {
      isMountedRef.current = false;
      stopPolling();
      if (deletePollingRef.current) {
        clearInterval(deletePollingRef.current);
      }
      FrontendErrorLogger.info('NavHistoryPage unmounted', 'NavHistoryPage', {});
    };
  }, [stopPolling]);

  // Filter bookmarks based on active filter and search
  const filteredBookmarks = useCallback(() => {
    let filtered = bookmarks;

    // Apply status filter
    if (activeFilter === 'success') {
      filtered = filtered.filter(b => (b.nav_records_count || 0) > 0);
    } else if (activeFilter === 'failed') {
      filtered = filtered.filter(b => 
        b.last_download_status === 'failed' || 
        ((b.nav_records_count || 0) === 0)
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(b => 
        b.scheme_code.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [bookmarks, activeFilter, searchQuery]);

  const displayedBookmarks = filteredBookmarks();

  // Calculate statistics
  const statistics = useCallback(() => {
    const total = pagination?.total || bookmarks.length;
    const historyAvailable = bookmarks.filter(b => (b.nav_records_count || 0) > 0).length;
    const failed = bookmarks.filter(b => 
      b.last_download_status === 'failed' || 
      ((b.nav_records_count || 0) === 0)
    ).length;

    return { total, historyAvailable, failed };
  }, [bookmarks, pagination]);

  const stats = statistics();

  // ==================== NAV DOWNLOAD HANDLERS ====================

  // Handle Download All (current page only)
  const handleDownloadAll = useCallback(async () => {
    const schemesToDownload = bookmarks.filter(b => (b.nav_records_count || 0) === 0);

    if (schemesToDownload.length === 0) {
      toastService.info('All schemes on this page already have historical data');
      return;
    }

    FrontendErrorLogger.info(
      'Starting Download All (current page)',
      'NavHistoryPage',
      { totalSchemes: schemesToDownload.length, page: pagination?.page }
    );

    try {
      const result = await bulkDownload.processSchemes(schemesToDownload);
      
      setTimeout(() => {
        if (isMountedRef.current) {
          refetch();
        }
      }, 2000);

    } catch (error: any) {
      FrontendErrorLogger.error(
        'Download All failed',
        'NavHistoryPage',
        { error: error.message },
        error.stack
      );
      toastService.error('Bulk download failed: ' + error.message);
    }
  }, [bookmarks, bulkDownload, refetch, pagination]);

  // Handle Retry Failed (current page only)
  const handleRetryFailed = useCallback(async () => {
    const failedSchemes = bookmarks.filter(b => 
      b.last_download_status === 'failed' || 
      ((b.nav_records_count || 0) === 0)
    );

    if (failedSchemes.length === 0) {
      toastService.info('No failed downloads on this page');
      return;
    }

    FrontendErrorLogger.info(
      'Starting Retry Failed (current page)',
      'NavHistoryPage',
      { totalSchemes: failedSchemes.length, page: pagination?.page }
    );

    try {
      const result = await bulkDownload.processSchemes(failedSchemes);
      
      setTimeout(() => {
        if (isMountedRef.current) {
          refetch();
        }
      }, 2000);

    } catch (error: any) {
      FrontendErrorLogger.error(
        'Retry Failed operation failed',
        'NavHistoryPage',
        { error: error.message },
        error.stack
      );
      toastService.error('Retry operation failed: ' + error.message);
    }
  }, [bookmarks, bulkDownload, refetch, pagination]);

  // Handle per-scheme historical download
  const handleHistoricalDownload = useCallback((bookmark: SchemeBookmark) => {
    setSelectedBookmark(bookmark);
    setShowHistoricalModal(true);
    
    FrontendErrorLogger.info(
      'Opening Historical Download Modal',
      'NavHistoryPage',
      {
        bookmarkId: bookmark.id,
        schemeName: bookmark.scheme_name
      }
    );
  }, []);

  // Handle download started from modal
  const handleHistoricalDownloadStarted = useCallback((jobId: number) => {
    FrontendErrorLogger.info(
      'Historical download started',
      'NavHistoryPage',
      { jobId }
    );
    
    if (!jobId || jobId <= 0) {
      toastService.error('Invalid download job ID received');
      return;
    }

    setShowProgressModal(true);
    setCurrentProgress(null);

    startPolling(jobId, (progressData: DownloadProgress) => {
      setCurrentProgress(progressData);
    }).catch((error) => {
      FrontendErrorLogger.error(
        'Progress polling failed',
        'NavHistoryPage',
        { jobId, error: error.message },
        error.stack
      );
      toastService.error('Failed to track download progress: ' + error.message);
      setShowProgressModal(false);
    });
  }, [startPolling]);

  // Handle download completion
  const handleDownloadComplete = useCallback(() => {
    FrontendErrorLogger.info(
      'Download completed - refreshing page',
      'NavHistoryPage',
      {}
    );
    
    setTimeout(() => {
      if (isMountedRef.current) {
        refetch();
        toastService.success('NAV data updated!');
      }
    }, 500);
  }, [refetch]);

  // ==================== METRICS CALCULATION HANDLERS ====================

  // Handle bulk metrics calculation (current page)
  const handleBulkCalculateMetrics = useCallback(() => {
    const schemesWithData = displayedBookmarks.filter(b => (b.nav_records_count || 0) > 0);

    if (schemesWithData.length === 0) {
      toastService.warning('No schemes with NAV data on this page. Download NAV data first.');
      return;
    }

    FrontendErrorLogger.info(
      'Opening Bulk Metrics Pre-Check Modal',
      'NavHistoryPage',
      { totalSchemes: schemesWithData.length }
    );

    // Open pre-check modal
    setShowMetricsPreCheckModal(true);
  }, [displayedBookmarks]);

  // Handle proceed from pre-check modal
  const handleProceedWithCalculation = useCallback(async (schemeIds: number[]) => {
    // Close pre-check modal
    setShowMetricsPreCheckModal(false);

    FrontendErrorLogger.info(
      'Starting bulk metrics calculation',
      'NavHistoryPage',
      { totalSchemes: schemeIds.length }
    );

    // Get bookmarks for selected scheme IDs
    const schemesToProcess = bookmarks.filter(b => schemeIds.includes(b.scheme_id));

    // Start bulk calculation
    try {
      await bulkMetrics.processBatch(schemesToProcess);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Bulk metrics calculation failed',
        'NavHistoryPage',
        { error: error.message },
        error.stack
      );
    }
  }, [bookmarks, bulkMetrics]);

  // Handle single scheme metrics calculation
  const handleCalculateMetrics = useCallback((bookmark: SchemeBookmark) => {
    setSelectedBookmark(bookmark);
    setShowMetricsCalculationModal(true);
    
    FrontendErrorLogger.info(
      'Opening Metrics Calculation Modal',
      'NavHistoryPage',
      {
        bookmarkId: bookmark.id,
        schemeName: bookmark.scheme_name
      }
    );
  }, []);

  // Handle calculation started
  const handleCalculationStarted = useCallback((schemeId: number) => {
    setCalculatingSchemeId(schemeId);
    
    FrontendErrorLogger.info(
      'Metrics calculation started',
      'NavHistoryPage',
      { schemeId }
    );
  }, []);

  // Handle calculation complete
  const handleCalculationComplete = useCallback((schemeId: number) => {
    setCalculatingSchemeId(null);

    FrontendErrorLogger.info(
      'Metrics calculation completed',
      'NavHistoryPage',
      { schemeId }
    );

    // Refresh bookmarks
    setTimeout(() => {
      if (isMountedRef.current) {
        refetch();
      }
    }, 500);
  }, [refetch]);

  // ==================== ALIAS HANDLERS ====================

  // Handle backfill all aliases (admin only)
  const handleBackfillAll = useCallback(async () => {
    if (!isAdmin) return;

    setIsBackfilling(true);

    FrontendErrorLogger.info(
      'Starting alias backfill',
      'NavHistoryPage',
      {}
    );

    try {
      toastService.info('Starting alias backfill...');
      const response = await SchemeAliasService.backfillAliases();

      if (response.success && response.data) {
        FrontendErrorLogger.info(
          'Alias backfill completed',
          'NavHistoryPage',
          {
            created: response.data.created
          }
        );
        toastService.success(
          `Successfully backfilled ${response.data.created} aliases`
        );
      } else {
        throw new Error(response.error || 'Failed to backfill aliases');
      }
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Alias backfill failed',
        'NavHistoryPage',
        { error: error.message },
        error.stack
      );
      toastService.error('Failed to backfill aliases: ' + error.message);
    } finally {
      setIsBackfilling(false);
    }
  }, [isAdmin]);

  // Handle manage aliases click
  const handleManageAliases = useCallback((bookmark: SchemeBookmark) => {
    setAliasBookmark(bookmark);
    setShowAliasModal(true);

    FrontendErrorLogger.info(
      'Opening Alias Management Modal',
      'NavHistoryPage',
      {
        bookmarkId: bookmark.id,
        schemeId: bookmark.scheme_id,
        schemeName: bookmark.scheme_name,
        schemeCode: bookmark.scheme_code
      }
    );
  }, []);

  // Handle close alias modal
  const handleCloseAliasModal = useCallback(() => {
    setShowAliasModal(false);
    setAliasBookmark(null);
  }, []);

  // ==================== DELETE HANDLERS ====================

  // Start polling for delete completion
  const startDeletePolling = useCallback((schemeId: number, schemeName: string, initialRecordCount: number) => {
    let pollCount = 0;
    const maxPolls = 24; // 2 minutes max (24 * 5 seconds)

    setDeletingSchemeId(schemeId);
    setDeleteProgress(`Deleting ${initialRecordCount.toLocaleString()} records for ${schemeName}...`);

    // Clear any existing polling
    if (deletePollingRef.current) {
      clearInterval(deletePollingRef.current);
    }

    // Poll every 5 seconds
    deletePollingRef.current = setInterval(() => {
      pollCount++;

      // Update progress message
      const elapsed = pollCount * 5;
      setDeleteProgress(`Deleting ${schemeName}... (${elapsed}s elapsed)`);

      // Refetch data to check if deletion completed
      refetch();

      // Check if we should stop polling
      if (pollCount >= maxPolls) {
        clearInterval(deletePollingRef.current!);
        deletePollingRef.current = null;
        setDeletingSchemeId(null);
        setDeleteProgress('');
        toastService.info('Deletion is taking longer than expected. Please refresh the page in a few moments.');
      }
    }, 5000);

    // Also do an immediate refetch after 2 seconds (for fast deletions)
    setTimeout(() => {
      refetch();
    }, 2000);
  }, [refetch]);

  // Stop polling when data updates (record count becomes 0)
  useEffect(() => {
    if (deletingSchemeId && bookmarks.length > 0) {
      const deletingBookmark = bookmarks.find(b => b.scheme_id === deletingSchemeId);
      if (deletingBookmark && deletingBookmark.nav_records_count === 0) {
        // Deletion completed!
        if (deletePollingRef.current) {
          clearInterval(deletePollingRef.current);
          deletePollingRef.current = null;
        }
        setDeletingSchemeId(null);
        setDeleteProgress('');
        toastService.success(`Successfully deleted all NAV data for ${deletingBookmark.scheme_name}`);
      }
    }
  }, [deletingSchemeId, bookmarks]);

  // Handle Delete click
  const handleDelete = useCallback((bookmark: SchemeBookmark) => {
    setBookmarkToDelete(bookmark);
    setShowDeleteDialog(true);

    FrontendErrorLogger.info(
      'Opening delete confirmation',
      'NavHistoryPage',
      {
        bookmarkId: bookmark.id,
        schemeId: bookmark.scheme_id,
        schemeName: bookmark.scheme_name,
        recordCount: bookmark.nav_records_count
      }
    );
  }, []);

  // Handle Delete Confirm
  const handleDeleteConfirm = useCallback(async () => {
    if (!bookmarkToDelete) return;

    setIsDeleting(true);

    FrontendErrorLogger.info(
      'Deleting NAV data',
      'NavHistoryPage',
      {
        bookmarkId: bookmarkToDelete.id,
        schemeId: bookmarkToDelete.scheme_id,
        schemeName: bookmarkToDelete.scheme_name,
        recordCount: bookmarkToDelete.nav_records_count
      }
    );

    try {
      // Call delete NAV data API
      const response = await navService.deleteNavData(bookmarkToDelete.scheme_id);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete NAV data');
      }

      FrontendErrorLogger.info(
        'NAV data deletion initiated',
        'NavHistoryPage',
        {
          schemeId: bookmarkToDelete.scheme_id,
          deletedCount: response.data?.deleted_count
        }
      );

      setShowDeleteDialog(false);
      setIsDeleting(false);

      // Start polling to check when record count becomes 0
      startDeletePolling(
        bookmarkToDelete.scheme_id,
        bookmarkToDelete.scheme_name,
        bookmarkToDelete.nav_records_count || 0
      );

      setBookmarkToDelete(null);

    } catch (err: any) {
      FrontendErrorLogger.error(
        'Delete NAV data failed',
        'NavHistoryPage',
        {
          bookmarkId: bookmarkToDelete.id,
          error: err.message
        },
        err.stack
      );
      toastService.error(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  }, [bookmarkToDelete, startDeletePolling]);

  // ==================== OTHER HANDLERS ====================

  // Handle Dashboard click
  const handleDashboardClick = useCallback((bookmark: SchemeBookmark) => {
    navigate(`/fund-dashboard/${bookmark.scheme_id}`);
    
    FrontendErrorLogger.info(
      'Navigating to Scheme Dashboard',
      'NavHistoryPage',
      {
        bookmarkId: bookmark.id,
        schemeId: bookmark.scheme_id,
        schemeName: bookmark.scheme_name
      }
    );
  }, [navigate]);

  // Handle filter change
  const handleFilterChange = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    setSearchQuery('');
    
    FrontendErrorLogger.info(
      'Filter changed',
      'NavHistoryPage',
      { filter }
    );
  }, []);

  // Handle search
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number) => {
    if (!pagination) return;
    
    fetchBookmarks({ 
      page: newPage, 
      page_size: pagination.pageSize 
    });
    
    FrontendErrorLogger.info(
      'Page changed',
      'NavHistoryPage',
      { newPage, pageSize: pagination.pageSize }
    );
  }, [fetchBookmarks, pagination]);

  // Modal close handlers
  const handleCloseHistoricalModal = useCallback(() => {
    setShowHistoricalModal(false);
    setSelectedBookmark(null);
  }, []);

  const handleCloseProgressModal = useCallback(() => {
    setShowProgressModal(false);
    setCurrentProgress(null);
    stopPolling();
  }, [stopPolling]);

  const handleCloseMetricsCalculationModal = useCallback(() => {
    setShowMetricsCalculationModal(false);
    setSelectedBookmark(null);
  }, []);

  const handleCloseMetricsPreCheckModal = useCallback(() => {
    setShowMetricsPreCheckModal(false);
  }, []);

  // Loading state
  if (isLoading && !hasInitializedRef.current) {
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
          Loading NAV History...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
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
          <p style={{ marginBottom: '16px' }}>⚠️ Failed to load NAV History</p>
          <p style={{ 
            marginBottom: '16px', 
            fontSize: '14px',
            color: colors.utility.secondaryText 
          }}>
            {error}
          </p>
          <button
            onClick={() => refetch()}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.semantic.error,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  const schemesWithoutData = bookmarks.filter(b => (b.nav_records_count || 0) === 0).length;
  const failedSchemes = bookmarks.filter(b => 
    b.last_download_status === 'failed' || 
    ((b.nav_records_count || 0) === 0)
  ).length;
  const schemesWithData = bookmarks.filter(b => (b.nav_records_count || 0) > 0).length;

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
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: '0 0 4px 0'
            }}>
              📜 NAV History
            </h1>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              Bulk download NAV data and calculate financial metrics
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {/* NAV Download Buttons */}
            <button
              onClick={handleDownloadAll}
              disabled={bulkDownload.isProcessing || schemesWithoutData === 0}
              style={{
                padding: '12px 20px',
                backgroundColor: (bulkDownload.isProcessing || schemesWithoutData === 0)
                  ? colors.utility.secondaryText 
                  : colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (bulkDownload.isProcessing || schemesWithoutData === 0) 
                  ? 'not-allowed' 
                  : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s ease',
                opacity: (bulkDownload.isProcessing || schemesWithoutData === 0) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!bulkDownload.isProcessing && schemesWithoutData > 0) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              📥 Download NAV ({schemesWithoutData})
            </button>
            
            <button
              onClick={handleRetryFailed}
              disabled={bulkDownload.isProcessing || failedSchemes === 0}
              style={{
                padding: '12px 20px',
                backgroundColor: (bulkDownload.isProcessing || failedSchemes === 0)
                  ? colors.utility.secondaryText 
                  : colors.semantic.warning,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (bulkDownload.isProcessing || failedSchemes === 0) 
                  ? 'not-allowed' 
                  : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s ease',
                opacity: (bulkDownload.isProcessing || failedSchemes === 0) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!bulkDownload.isProcessing && failedSchemes > 0) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              🔄 Retry Failed ({failedSchemes})
            </button>

            {/* NEW: Metrics Calculation Button */}
            <button
              onClick={handleBulkCalculateMetrics}
              disabled={bulkMetrics.isProcessing || schemesWithData === 0}
              style={{
                padding: '12px 20px',
                backgroundColor: (bulkMetrics.isProcessing || schemesWithData === 0)
                  ? colors.utility.secondaryText
                  : colors.semantic.success,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (bulkMetrics.isProcessing || schemesWithData === 0)
                  ? 'not-allowed'
                  : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s ease',
                opacity: (bulkMetrics.isProcessing || schemesWithData === 0) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!bulkMetrics.isProcessing && schemesWithData > 0) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              📊 Calculate Metrics ({schemesWithData})
            </button>

            {/* Admin Only: Backfill Aliases Button */}
            {isAdmin && (
              <button
                onClick={handleBackfillAll}
                disabled={isBackfilling}
                style={{
                  padding: '12px 20px',
                  backgroundColor: isBackfilling
                    ? colors.utility.secondaryText
                    : colors.semantic.info,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isBackfilling ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'transform 0.2s ease',
                  opacity: isBackfilling ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isBackfilling) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🔄 Backfill All Aliases
              </button>
            )}
          </div>
        </div>

        {/* Statistics Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* TOTAL SCHEMES */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.brand.primary,
              marginBottom: '4px'
            }}>
              {stats.total.toLocaleString()}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '4px'
            }}>
              Total Schemes
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              paddingTop: '4px',
              borderTop: `1px solid ${colors.utility.primaryText}10`
            }}>
              {bookmarks.length} on current page
            </div>
          </div>

          {/* HISTORY AVAILABLE */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.semantic.success,
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px', color: colors.utility.secondaryText }}>
                ?
              </span>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: colors.utility.secondaryText 
              }}>
                overall
              </span>
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '4px'
            }}>
              History Available
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.semantic.success,
              fontWeight: '600',
              paddingTop: '4px',
              borderTop: `1px solid ${colors.utility.primaryText}10`
            }}>
              ✓ {stats.historyAvailable} on current page
            </div>
          </div>

          {/* FAILED / NO DATA */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.semantic.error,
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px', color: colors.utility.secondaryText }}>
                ?
              </span>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: colors.utility.secondaryText 
              }}>
                overall
              </span>
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '4px'
            }}>
              Failed / No Data
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.semantic.error,
              fontWeight: '600',
              paddingTop: '4px',
              borderTop: `1px solid ${colors.utility.primaryText}10`
            }}>
              ⚠ {stats.failed} on current page
            </div>
          </div>

          {/* PAGE NAVIGATION INFO */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.brand.secondary,
              marginBottom: '4px'
            }}>
              {pagination?.page || 1} / {pagination?.totalPages || 1}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '4px'
            }}>
              Current Page
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              paddingTop: '4px',
              borderTop: `1px solid ${colors.utility.primaryText}10`
            }}>
              Showing {bookmarks.length} schemes
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            {/* Filter Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleFilterChange('all')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: activeFilter === 'all' 
                    ? colors.brand.primary 
                    : 'transparent',
                  color: activeFilter === 'all' 
                    ? 'white' 
                    : colors.utility.primaryText,
                  border: `1px solid ${activeFilter === 'all' 
                    ? colors.brand.primary 
                    : colors.utility.primaryText + '30'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                All ({bookmarks.length})
              </button>
              
              <button
                onClick={() => handleFilterChange('success')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: activeFilter === 'success' 
                    ? colors.semantic.success 
                    : 'transparent',
                  color: activeFilter === 'success' 
                    ? 'white' 
                    : colors.utility.primaryText,
                  border: `1px solid ${activeFilter === 'success' 
                    ? colors.semantic.success 
                    : colors.utility.primaryText + '30'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                Success ({stats.historyAvailable})
              </button>
              
              <button
                onClick={() => handleFilterChange('failed')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: activeFilter === 'failed' 
                    ? colors.semantic.error 
                    : 'transparent',
                  color: activeFilter === 'failed' 
                    ? 'white' 
                    : colors.utility.primaryText,
                  border: `1px solid ${activeFilter === 'failed' 
                    ? colors.semantic.error 
                    : colors.utility.primaryText + '30'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                Failed / No Data ({stats.failed})
              </button>
            </div>

            {/* Search Input */}
            <div style={{ flex: '1', minWidth: '250px', maxWidth: '400px' }}>
              <input
                type="text"
                placeholder="Search by scheme code..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </div>

        {/* Bookmarks Grid */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '16px'
          }}>
            Schemes ({displayedBookmarks.length})
          </h3>

          {displayedBookmarks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.utility.secondaryText
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {searchQuery ? '🔍' : '📚'}
              </div>
              <h4 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                {searchQuery 
                  ? 'No schemes found' 
                  : activeFilter === 'failed' 
                  ? 'No failed downloads' 
                  : activeFilter === 'success'
                  ? 'No schemes with historical data yet'
                  : 'No schemes bookmarked'}
              </h4>
              <p style={{ margin: 0 }}>
                {searchQuery 
                  ? `No results for "${searchQuery}"` 
                  : activeFilter === 'all'
                  ? 'Start by bookmarking schemes from the NAV dashboard'
                  : 'Try a different filter or search'}
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {displayedBookmarks.map((bookmark) => (
                <EnhancedBookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onDashboardClick={handleDashboardClick}
                  onHistoricalDownload={handleHistoricalDownload}
                  onCalculateMetrics={handleCalculateMetrics}
                  onDelete={handleDelete}
                  onManageAliases={handleManageAliases}
                  showActions={true}
                  showDeleteButton={true}
                  isCalculating={calculatingSchemeId === bookmark.scheme_id}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div style={{
            marginTop: '24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: (pagination.hasPrev && !isLoading) 
                  ? colors.brand.primary 
                  : colors.utility.secondaryText,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (pagination.hasPrev && !isLoading) ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                opacity: (pagination.hasPrev && !isLoading) ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              ← Previous
            </button>
            
            <span style={{ 
              color: colors.utility.primaryText,
              fontSize: '14px',
              fontWeight: '500',
              padding: '0 8px'
            }}>
              Page {pagination.page} of {pagination.totalPages}
              <span style={{ 
                color: colors.utility.secondaryText,
                fontSize: '12px',
                marginLeft: '8px'
              }}>
                ({displayedBookmarks.length} of {stats.total} schemes)
              </span>
            </span>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || isLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: (pagination.hasNext && !isLoading) 
                  ? colors.brand.primary 
                  : colors.utility.secondaryText,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (pagination.hasNext && !isLoading) ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500',
                opacity: (pagination.hasNext && !isLoading) ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Bulk Download Progress Modal */}
      <BulkDownloadProgress
        isOpen={bulkDownload.isProcessing}
        current={bulkDownload.progress.current}
        total={bulkDownload.progress.total}
        currentScheme={bulkDownload.progress.currentScheme}
        onCancel={bulkDownload.cancel}
      />

      {/* Historical Download Modal */}
      <HistoricalDownloadModal
        isOpen={showHistoricalModal}
        bookmark={selectedBookmark}
        onClose={handleCloseHistoricalModal}
        onDownloadStarted={handleHistoricalDownloadStarted}
        onShowProgress={handleHistoricalDownloadStarted}
      />

      {/* NAV Progress Modal */}
      <NavProgressModal
        isOpen={showProgressModal}
        progress={currentProgress}
        onClose={handleCloseProgressModal}
        onComplete={handleDownloadComplete}
        title="Downloading Historical NAV Data"
        showCancelButton={true}
      />

      {/* NEW: Metrics Calculation Modal (Single Scheme) */}
      <MetricsCalculationModal
        isOpen={showMetricsCalculationModal}
        bookmark={selectedBookmark}
        onClose={handleCloseMetricsCalculationModal}
        onCalculationStarted={handleCalculationStarted}
        onCalculationComplete={handleCalculationComplete}
      />

      {/* NEW: Bulk Metrics Pre-Check Modal */}
      <BulkMetricsPreCheckModal
        isOpen={showMetricsPreCheckModal}
        schemes={displayedBookmarks.filter(b => (b.nav_records_count || 0) > 0)}
        onClose={handleCloseMetricsPreCheckModal}
        onProceed={handleProceedWithCalculation}
        onDownloadNavFirst={(schemes) => {
          // Close pre-check and trigger NAV download for these schemes
          handleCloseMetricsPreCheckModal();
          toastService.info('Download NAV data first, then calculate metrics');
        }}
      />

      {/* Alias Management Modal */}
      <AliasManagementModal
        isOpen={showAliasModal}
        bookmark={aliasBookmark}
        onClose={handleCloseAliasModal}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete All NAV Data"
        description={`Are you sure you want to delete all ${(bookmarkToDelete?.nav_records_count || 0).toLocaleString()} NAV records for ${bookmarkToDelete?.scheme_name}? This action cannot be undone and will also remove all calculated metrics.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="error"
        isLoading={isDeleting}
      />

      {/* Delete Progress Overlay */}
      {deletingSchemeId && deleteProgress && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              backgroundColor: colors.utility.primaryBackground,
              padding: '32px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              {/* Spinner */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  border: `4px solid ${colors.utility.secondaryText}40`,
                  borderTop: `4px solid ${colors.semantic.error}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 24px'
                }}
              />

              {/* Progress Text */}
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '12px',
                color: colors.utility.primaryText
              }}>
                Deleting NAV Data
              </h3>

              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                marginBottom: '8px'
              }}>
                {deleteProgress}
              </p>

              <p style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                fontStyle: 'italic'
              }}>
                Please wait while we delete the records...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Bulk Metrics Progress Modal */}
      <BulkMetricsProgress
        isOpen={bulkMetrics.isProcessing}
        current={bulkMetrics.progress.current}
        total={bulkMetrics.progress.total}
        successCount={bulkMetrics.progress.successCount}
        failureCount={bulkMetrics.progress.failureCount}
        currentScheme={bulkMetrics.progress.currentScheme}
        errors={bulkMetrics.progress.errors}
        onCancel={bulkMetrics.cancel}
        onClose={() => bulkMetrics.reset()}
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

export default NavHistoryPage;