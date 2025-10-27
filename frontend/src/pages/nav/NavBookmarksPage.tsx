// frontend/src/pages/nav/NavBookmarksPage.tsx
// UPDATED: Added metrics calculation functionality to bulk actions

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookmarks, useDownloadProgress, useNavStatistics, useBulkDownload } from '../../hooks/useNavData';
import { useBulkMetricsCalculation } from '../../hooks/useBulkMetricsCalculation';
import { EnhancedBookmarkCard } from '../../components/nav/EnhancedBookmarkCard';
import { HistoricalDownloadModal } from '../../components/nav/HistoricalDownloadModal';
import { NavProgressModal } from '../../components/nav/NavProgressModal';
import { NavDataViewerModal } from '../../components/nav/NavDataViewerModal';
import { MetricsCalculationModal } from '../../components/nav/MetricsCalculationModal';
import { BulkMetricsPreCheckModal } from '../../components/nav/BulkMetricsPreCheckModal';
import { BulkMetricsProgress } from '../../components/nav/BulkMetricsProgress';
import { BulkDownloadProgress } from '../../components/nav/BulkDownloadProgress';
import { toastService } from '../../services/toast.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import type { SchemeBookmark, DownloadProgress } from '../../services/nav.service';
import '../../components/nav/BookmarkCard.css';

const NavBookmarksPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [amcFilter, setAmcFilter] = useState('');
  const [dailyDownloadFilter, setDailyDownloadFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Modal state - NAV operations
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<SchemeBookmark | null>(null);
  const [showNavDataModal, setShowNavDataModal] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<DownloadProgress | null>(null);

  // Modal state - Metrics operations
  const [showMetricsCalculationModal, setShowMetricsCalculationModal] = useState(false);
  const [showMetricsPreCheckModal, setShowMetricsPreCheckModal] = useState(false);
  const [calculatingSchemeId, setCalculatingSchemeId] = useState<number | null>(null);

  // Bulk selection state
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Hooks - NAV operations
  const {
    bookmarks,
    isLoading,
    error,
    fetchBookmarks,
    updateBookmark,
    deleteBookmark,
    pagination
  } = useBookmarks({
    page: currentPage,
    page_size: pageSize,
    search: searchQuery || undefined,
    amc_name: amcFilter || undefined,
    daily_download_only: dailyDownloadFilter === 'enabled' ? true : undefined
  });

  const { startPolling, stopPolling } = useDownloadProgress();
  const { statistics } = useNavStatistics();

  // Hooks - Bulk Download operations
  const bulkDownload = useBulkDownload();

  // Hooks - Metrics operations
  const bulkMetrics = useBulkMetricsCalculation({
    onComplete: (result) => {
      FrontendErrorLogger.info(
        'Bulk metrics calculation completed',
        'NavBookmarksPage',
        {
          successful: result.successful,
          failed: result.failed,
          total: result.total_schemes,
        }
      );
      
      // Refresh bookmarks after calculation
      setTimeout(() => {
        fetchBookmarks({
          page: currentPage,
          page_size: pageSize,
          search: searchQuery || undefined,
          amc_name: amcFilter || undefined,
        });
      }, 1000);
    }
  });

  // Filter bookmarks based on daily download filter
  const filteredBookmarks = bookmarks.filter(bookmark => {
    if (dailyDownloadFilter === 'enabled') return bookmark.daily_download_enabled;
    if (dailyDownloadFilter === 'disabled') return !bookmark.daily_download_enabled;
    return true;
  });

  // Get unique AMCs for filter dropdown
  const uniqueAmcs = [...new Set(bookmarks.map(b => b.amc_name))].sort();

  // Event handlers - Search and filters
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    fetchBookmarks({
      page: 1,
      page_size: pageSize,
      search: searchQuery || undefined,
      amc_name: amcFilter || undefined,
      daily_download_only: dailyDownloadFilter === 'enabled' ? true : undefined
    });
  }, [searchQuery, amcFilter, dailyDownloadFilter, fetchBookmarks]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setAmcFilter('');
    setDailyDownloadFilter('all');
    setCurrentPage(1);
    fetchBookmarks({ page: 1, page_size: pageSize });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchBookmarks({
      page: newPage,
      page_size: pageSize,
      search: searchQuery || undefined,
      amc_name: amcFilter || undefined,
      daily_download_only: dailyDownloadFilter === 'enabled' ? true : undefined
    });
  };

  // Enhanced bookmark card handlers
  const handleDashboardClick = (bookmark: SchemeBookmark) => {
    navigate(`/fund-dashboard/${bookmark.scheme_id}`);

    FrontendErrorLogger.info(
      'Navigating to fund dashboard from Bookmarks page',
      'NavBookmarksPage',
      {
        bookmarkId: bookmark.id,
        schemeId: bookmark.scheme_id,
        schemeName: bookmark.scheme_name
      }
    );
  };

  const handleHistoricalDownload = (bookmark: SchemeBookmark) => {
    setSelectedBookmark(bookmark);
    setShowHistoricalModal(true);
  };

  const handleDeleteBookmark = async (bookmark: SchemeBookmark) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${bookmark.scheme_name}" from your bookmarks?`
    );
    
    if (!confirmed) return;

    try {
      await deleteBookmark(bookmark.id);
      toastService.success('Bookmark removed successfully');
      setSelectedBookmarkIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookmark.id);
        return newSet;
      });
    } catch (error: any) {
      toastService.error('Failed to remove bookmark');
    }
  };

  // Historical download handler (NO auto-refresh to maintain user workflow)
  const handleHistoricalDownloadStarted = useCallback((jobId: number) => {
    console.log('Historical download started with job ID:', jobId);

    if (!jobId || jobId <= 0) {
      toastService.error('Invalid download job ID received');
      return;
    }

    setShowProgressModal(true);
    setCurrentProgress(null);

    startPolling(jobId, (progressData: DownloadProgress) => {
      setCurrentProgress(progressData);

      FrontendErrorLogger.info(
        'Progress update',
        'NavBookmarksPage',
        {
          jobId,
          status: progressData.status,
          progressPercentage: progressData.progressPercentage,
          processedSchemes: progressData.processedSchemes,
          totalSchemes: progressData.totalSchemes
        }
      );
    }).then(() => {
      // NO auto-refresh - user maintains control of selection for next steps
      FrontendErrorLogger.info(
        'Download completed - user can proceed with workflow',
        'NavBookmarksPage',
        { jobId }
      );
      toastService.success('Download complete! You can now calculate metrics or refresh the page.');
    }).catch((error) => {
      console.error('Progress polling failed:', error);
      toastService.error('Failed to track download progress: ' + error.message);
      setShowProgressModal(false);
    });
  }, [startPolling]);

  const handleCloseHistoricalModal = () => {
    setShowHistoricalModal(false);
    setSelectedBookmark(null);
  };

  const handleCloseNavDataModal = () => {
    setShowNavDataModal(false);
    setSelectedBookmark(null);
  };

  const handleCloseProgressModal = () => {
    setShowProgressModal(false);
    setCurrentProgress(null);
    stopPolling();
  };

  // ==================== METRICS CALCULATION HANDLERS ====================

  // Handle single scheme metrics calculation
  const handleCalculateMetrics = useCallback((bookmark: SchemeBookmark) => {
    setSelectedBookmark(bookmark);
    setShowMetricsCalculationModal(true);
    
    FrontendErrorLogger.info(
      'Opening Metrics Calculation Modal',
      'NavBookmarksPage',
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
      'NavBookmarksPage',
      { schemeId }
    );
  }, []);

  // Handle calculation complete
  const handleCalculationComplete = useCallback((schemeId: number) => {
    setCalculatingSchemeId(null);
    
    FrontendErrorLogger.info(
      'Metrics calculation completed',
      'NavBookmarksPage',
      { schemeId }
    );

    // Refresh bookmarks
    setTimeout(() => {
      fetchBookmarks({
        page: currentPage,
        page_size: pageSize,
        search: searchQuery || undefined,
        amc_name: amcFilter || undefined,
      });
    }, 500);
  }, [currentPage, searchQuery, amcFilter, fetchBookmarks]);

  const handleCloseMetricsCalculationModal = useCallback(() => {
    setShowMetricsCalculationModal(false);
    setSelectedBookmark(null);
  }, []);

  const handleCloseMetricsPreCheckModal = useCallback(() => {
    setShowMetricsPreCheckModal(false);
  }, []);

  // ==================== BULK SELECTION HANDLERS ====================

  const handleSelectBookmark = (bookmarkId: number, selected: boolean) => {
    setSelectedBookmarkIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(bookmarkId);
      } else {
        newSet.delete(bookmarkId);
      }
      setShowBulkActions(newSet.size > 0);
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIds = new Set(filteredBookmarks.map(b => b.id));
      setSelectedBookmarkIds(allIds);
      setShowBulkActions(true);
    } else {
      setSelectedBookmarkIds(new Set());
      setShowBulkActions(false);
    }
  };

  // ==================== BULK OPERATIONS ====================

  const handleBulkEnableDaily = async () => {
    const selectedBookmarks = filteredBookmarks.filter(b => selectedBookmarkIds.has(b.id));
    try {
      await Promise.all(
        selectedBookmarks.map(bookmark => 
          updateBookmark(bookmark.id, { daily_download_enabled: true })
        )
      );
      toastService.success(`Daily download enabled for ${selectedBookmarks.length} schemes`);
      setSelectedBookmarkIds(new Set());
      setShowBulkActions(false);
    } catch (error) {
      toastService.error('Failed to enable daily download for some schemes');
    }
  };

  const handleBulkDisableDaily = async () => {
    const selectedBookmarks = filteredBookmarks.filter(b => selectedBookmarkIds.has(b.id));
    try {
      await Promise.all(
        selectedBookmarks.map(bookmark => 
          updateBookmark(bookmark.id, { daily_download_enabled: false })
        )
      );
      toastService.success(`Daily download disabled for ${selectedBookmarks.length} schemes`);
      setSelectedBookmarkIds(new Set());
      setShowBulkActions(false);
    } catch (error) {
      toastService.error('Failed to disable daily download for some schemes');
    }
  };

  // NEW: Sequential bulk historical download (maintains selection for workflow)
  const handleBulkHistoricalDownload = useCallback(async () => {
    const selectedBookmarks = filteredBookmarks.filter(b => selectedBookmarkIds.has(b.id));

    if (selectedBookmarks.length === 0) {
      toastService.warning('Please select schemes to download');
      return;
    }

    FrontendErrorLogger.info(
      'Starting sequential bulk historical download',
      'NavBookmarksPage',
      { totalSchemes: selectedBookmarks.length }
    );

    // KEEP selection - user needs it for next step (calculate metrics)
    // Selection will be cleared only after they complete their workflow

    try {
      // Start sequential download (BulkDownloadProgress modal will show automatically)
      const result = await bulkDownload.processSchemes(selectedBookmarks);

      // NO auto-refresh - user maintains selection to proceed with metrics calculation
      FrontendErrorLogger.info(
        'Sequential bulk download completed',
        'NavBookmarksPage',
        {
          successful: result.successful,
          failed: result.failed,
          skipped: result.skipped,
        }
      );

      // Notify user they can proceed with their workflow
      toastService.success(
        `Download complete: ${result.successful} successful, ${result.failed} failed. ` +
        `You can now calculate metrics or refresh the page.`
      );

    } catch (error: any) {
      FrontendErrorLogger.error(
        'Sequential bulk download failed',
        'NavBookmarksPage',
        { error: error.message },
        error.stack
      );
    }
  }, [filteredBookmarks, selectedBookmarkIds, bulkDownload]);

  // NEW: Bulk metrics calculation
  const handleBulkCalculateMetrics = useCallback(() => {
    const selectedBookmarks = filteredBookmarks.filter(b => selectedBookmarkIds.has(b.id));
    const schemesWithData = selectedBookmarks.filter(b => (b.nav_records_count || 0) > 0);

    if (schemesWithData.length === 0) {
      toastService.warning('Selected schemes have no NAV data. Download NAV data first.');
      return;
    }

    FrontendErrorLogger.info(
      'Opening Bulk Metrics Pre-Check Modal',
      'NavBookmarksPage',
      { totalSchemes: schemesWithData.length }
    );

    setShowMetricsPreCheckModal(true);
  }, [filteredBookmarks, selectedBookmarkIds]);

  // Handle proceed from pre-check modal
  const handleProceedWithCalculation = useCallback(async (schemeIds: number[]) => {
    // Close pre-check modal
    setShowMetricsPreCheckModal(false);

    FrontendErrorLogger.info(
      'Starting bulk metrics calculation',
      'NavBookmarksPage',
      { totalSchemes: schemeIds.length }
    );

    // Get bookmarks for selected scheme IDs
    const schemesToProcess = bookmarks.filter(b => schemeIds.includes(b.scheme_id));

    // Clear selection
    setSelectedBookmarkIds(new Set());
    setShowBulkActions(false);

    // Start bulk calculation
    try {
      await bulkMetrics.processBatch(schemesToProcess);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Bulk metrics calculation failed',
        'NavBookmarksPage',
        { error: error.message },
        error.stack
      );
    }
  }, [bookmarks, bulkMetrics]);

  const handleBulkDelete = async () => {
    const selectedBookmarks = filteredBookmarks.filter(b => selectedBookmarkIds.has(b.id));
    const confirmed = window.confirm(
      `Are you sure you want to remove ${selectedBookmarks.length} bookmarks?`
    );
    
    if (!confirmed) return;

    try {
      await Promise.all(
        selectedBookmarks.map(bookmark => deleteBookmark(bookmark.id))
      );
      toastService.success(`${selectedBookmarks.length} bookmarks removed successfully`);
      setSelectedBookmarkIds(new Set());
      setShowBulkActions(false);
    } catch (error) {
      toastService.error('Failed to remove some bookmarks');
    }
  };

  // Navigation handlers
  const handleNavigateToSearch = () => {
    navigate('/nav/search');
  };

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: colors.semantic.error + '10',
          borderRadius: '12px',
          color: colors.semantic.error
        }}>
          <p style={{ marginBottom: '16px' }}>Failed to load bookmarks</p>
          <button
            onClick={() => fetchBookmarks()}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.semantic.error,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Retry
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
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: '0 0 4px 0'
            }}>
              NAV Tracking
            </h1>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              Track and manage scheme NAV data, downloads, and metrics calculation
            </p>
          </div>

          <button
            onClick={handleNavigateToSearch}
            style={{
              padding: '12px 20px',
              backgroundColor: colors.brand.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔍 Search Schemes
          </button>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.utility.secondaryText}20`
            }}>
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Schemes Tracked
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.brand.primary
              }}>
                {statistics.total_schemes_tracked}
              </div>
            </div>

            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.utility.secondaryText}20`
            }}>
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Daily Download Enabled
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.semantic.success
              }}>
                {statistics.schemes_with_daily_download}
              </div>
            </div>

            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.utility.secondaryText}20`
            }}>
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Historical Data Available
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.brand.secondary
              }}>
                {statistics.schemes_with_historical_data}
              </div>
            </div>

            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.utility.secondaryText}20`
            }}>
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                Downloads Today
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.utility.primaryText
              }}>
                {statistics.download_jobs_today}
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            {/* Search Input */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText,
                marginBottom: '6px'
              }}>
                Search Schemes
              </label>
              <input
                type="text"
                placeholder="Search by name, code, or AMC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
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

            {/* AMC Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText,
                marginBottom: '6px'
              }}>
                Filter by AMC
              </label>
              <select
                value={amcFilter}
                onChange={(e) => setAmcFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="">All AMCs</option>
                {uniqueAmcs.map(amc => (
                  <option key={amc} value={amc}>{amc}</option>
                ))}
              </select>
            </div>

            {/* Daily Download Filter */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText,
                marginBottom: '6px'
              }}>
                Daily Download
              </label>
              <select
                value={dailyDownloadFilter}
                onChange={(e) => setDailyDownloadFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                <option value="all">All Schemes</option>
                <option value="enabled">Daily Download Enabled</option>
                <option value="disabled">Daily Download Disabled</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
          }}>
            <button
              onClick={handleSearch}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              🔍 Search
            </button>
            
            <button
              onClick={handleClearFilters}
              style={{
                padding: '10px 16px',
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.secondaryText}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div style={{
            backgroundColor: colors.brand.primary + '10',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            border: `1px solid ${colors.brand.primary}30`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                {selectedBookmarkIds.size} schemes selected
              </span>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleBulkEnableDaily}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: colors.semantic.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Enable Daily Download
                </button>
                
                <button
                  onClick={handleBulkDisableDaily}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: colors.semantic.warning,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Disable Daily Download
                </button>
                
                <button
                  onClick={handleBulkHistoricalDownload}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: colors.brand.secondary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  📥 Sequential Download
                </button>
                
                {/* NEW: Bulk Calculate Metrics */}
                <button
                  onClick={handleBulkCalculateMetrics}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: colors.brand.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  📊 Calculate Metrics
                </button>
                
                <button
                  onClick={handleBulkDelete}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: colors.semantic.error,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bookmarks List */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px'
        }}>
          {/* List Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                margin: '0 0 4px 0'
              }}>
                Your Bookmarked Schemes
              </h3>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                margin: 0
              }}>
                {pagination?.total || 0} schemes found • Showing 25 per page
                {(searchQuery || amcFilter || dailyDownloadFilter !== 'all') && ' (filtered)'}
              </p>
            </div>

            {/* Select All */}
            {filteredBookmarks.length > 0 && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: colors.utility.primaryText,
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={selectedBookmarkIds.size === filteredBookmarks.length && filteredBookmarks.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Select All
              </label>
            )}
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '60px',
              color: colors.utility.secondaryText
            }}>
              <span style={{
                width: '32px',
                height: '32px',
                border: '3px solid transparent',
                borderTop: `3px solid ${colors.brand.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '12px'
              }} />
              Loading bookmarks...
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.utility.secondaryText
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📚</div>
              <h4 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '12px'
              }}>
                {searchQuery || amcFilter || dailyDownloadFilter !== 'all' 
                  ? 'No schemes match your filters' 
                  : 'No schemes bookmarked yet'
                }
              </h4>
              <p style={{ marginBottom: '24px', fontSize: '16px' }}>
                {searchQuery || amcFilter || dailyDownloadFilter !== 'all'
                  ? 'Try adjusting your search criteria or clear filters'
                  : 'Search and bookmark schemes to start tracking their NAV data'
                }
              </p>
              <button
                onClick={searchQuery || amcFilter || dailyDownloadFilter !== 'all' 
                  ? handleClearFilters 
                  : handleNavigateToSearch
                }
                style={{
                  padding: '12px 24px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {searchQuery || amcFilter || dailyDownloadFilter !== 'all'
                  ? 'Clear Filters'
                  : '🔍 Search & Bookmark Schemes'
                }
              </button>
            </div>
          ) : (
            <>
              {/* Bookmarks List with Enhanced Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredBookmarks.map((bookmark) => (
                  <div key={bookmark.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedBookmarkIds.has(bookmark.id)}
                      onChange={(e) => handleSelectBookmark(bookmark.id, e.target.checked)}
                      style={{
                        cursor: 'pointer',
                        transform: 'scale(1.2)'
                      }}
                    />
                    
                    {/* Enhanced Bookmark Card */}
                    <div style={{ flex: 1 }}>
                      <EnhancedBookmarkCard
                        bookmark={bookmark}
                        onDashboardClick={handleDashboardClick}
                        onHistoricalDownload={handleHistoricalDownload}
                        onCalculateMetrics={handleCalculateMetrics}
                        showActions={true}
                        isCalculating={calculatingSchemeId === bookmark.scheme_id}
                      />
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteBookmark(bookmark)}
                      style={{
                        padding: '8px',
                        backgroundColor: 'transparent',
                        color: colors.semantic.error,
                        border: `1px solid ${colors.semantic.error}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                        minWidth: '60px'
                      }}
                      title="Remove bookmark"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '32px',
                  paddingTop: '24px',
                  borderTop: `1px solid ${colors.utility.primaryText}10`
                }}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: !pagination.hasPrev 
                        ? colors.utility.secondaryBackground 
                        : colors.brand.primary,
                      color: !pagination.hasPrev 
                        ? colors.utility.secondaryText 
                        : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: !pagination.hasPrev ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    ← Previous
                  </button>

                  <span style={{
                    fontSize: '14px',
                    color: colors.utility.primaryText,
                    fontWeight: '500'
                  }}>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: !pagination.hasNext 
                        ? colors.utility.secondaryBackground 
                        : colors.brand.primary,
                      color: !pagination.hasNext 
                        ? colors.utility.secondaryText 
                        : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: !pagination.hasNext ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Historical Download Modal */}
      <HistoricalDownloadModal
        isOpen={showHistoricalModal}
        bookmark={selectedBookmark}
        onClose={handleCloseHistoricalModal}
        onDownloadStarted={handleHistoricalDownloadStarted}
        onShowProgress={handleHistoricalDownloadStarted}
      />

      {/* NAV Data Viewer Modal */}
      <NavDataViewerModal
        isOpen={showNavDataModal}
        bookmark={selectedBookmark}
        onClose={handleCloseNavDataModal}
      />

      {/* NAV Progress Modal */}
      <NavProgressModal
        isOpen={showProgressModal}
        progress={currentProgress}
        onClose={handleCloseProgressModal}
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
        schemes={filteredBookmarks.filter(b => 
          selectedBookmarkIds.has(b.id) && (b.nav_records_count || 0) > 0
        )}
        onClose={handleCloseMetricsPreCheckModal}
        onProceed={handleProceedWithCalculation}
        onDownloadNavFirst={(schemes) => {
          handleCloseMetricsPreCheckModal();
          toastService.info('Download NAV data first, then calculate metrics');
        }}
      />

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

      {/* NEW: Bulk Download Progress Modal */}
      <BulkDownloadProgress
        isOpen={bulkDownload.isProcessing}
        current={bulkDownload.progress.current}
        total={bulkDownload.progress.total}
        currentScheme={bulkDownload.progress.currentScheme}
        onCancel={bulkDownload.cancel}
      />

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NavBookmarksPage;