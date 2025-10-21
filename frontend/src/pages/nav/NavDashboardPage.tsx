// frontend/src/pages/nav/NavDashboardPage.tsx
// UPDATED: Added metrics calculation functionality (single scheme only)
// COMPLETE VERSION - All original functionality preserved

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookmarks, useDownloadProgress } from '../../hooks/useNavData';
import { EnhancedBookmarkCard } from '../../components/nav/EnhancedBookmarkCard';
import { HistoricalDownloadModal } from '../../components/nav/HistoricalDownloadModal';
import { NavProgressModal } from '../../components/nav/NavProgressModal';
import { NavDataViewerModal } from '../../components/nav/NavDataViewerModal';
import { MetricsCalculationModal } from '../../components/nav/MetricsCalculationModal';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import { toastService } from '../../services/toast.service';
import type { SchemeBookmark } from '../../types/nav.types';
import type { DownloadProgress } from '../../services/nav.service';

/**
 * NavDashboardPage Component
 * Main dashboard for NAV data management
 * Shows bookmarked schemes with NAV data and metrics
 */
const NavDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Refs
  const hasInitializedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Hooks
  const {
    bookmarks,
    isLoading,
    error,
    refetch,
    updateBookmark,
    pagination
  } = useBookmarks({ page: 1, page_size: 50 });

  const { startPolling, stopPolling } = useDownloadProgress();

  // Local state - Modals
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showNavDataModal, setShowNavDataModal] = useState(false);
  const [showMetricsCalculationModal, setShowMetricsCalculationModal] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<SchemeBookmark | null>(null);
  const [currentProgress, setCurrentProgress] = useState<DownloadProgress | null>(null);

  // Local state - Loading states
  const [togglingBookmarkId, setTogglingBookmarkId] = useState<number | null>(null);
  const [calculatingSchemeId, setCalculatingSchemeId] = useState<number | null>(null);

  // Prevent multiple fetches on mount
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      FrontendErrorLogger.info('NavDashboardPage initialized', 'NavDashboardPage', {});
    }
    
    return () => {
      isMountedRef.current = false;
      stopPolling();
      FrontendErrorLogger.info('NavDashboardPage unmounted', 'NavDashboardPage', {});
    };
  }, [stopPolling]);

  // Calculate statistics
  const statistics = useCallback(() => {
    const total = bookmarks.length;
    const withNavData = bookmarks.filter(b => (b.nav_records_count || 0) > 0).length;
    const dailyEnabled = bookmarks.filter(b => b.daily_download_enabled).length;
    const withoutData = bookmarks.filter(b => (b.nav_records_count || 0) === 0).length;

    return { total, withNavData, dailyEnabled, withoutData };
  }, [bookmarks]);

  const stats = statistics();

  // ==================== NAVIGATION HANDLERS ====================

  const handleNavigateToSearch = useCallback(() => {
    navigate('/nav/search');
  }, [navigate]);

  const handleNavigateToBookmarks = useCallback(() => {
    navigate('/nav/bookmarks');
  }, [navigate]);

  const handleNavigateToHistory = useCallback(() => {
    navigate('/nav/history');
  }, [navigate]);

  const handleDashboardClick = useCallback((bookmark: SchemeBookmark) => {
    navigate(`/fund-dashboard/${bookmark.scheme_id}`);
    
    FrontendErrorLogger.info(
      'Navigating to Scheme Dashboard',
      'NavDashboardPage',
      {
        bookmarkId: bookmark.id,
        schemeId: bookmark.scheme_id,
        schemeName: bookmark.scheme_name
      }
    );
  }, [navigate]);

  // ==================== BOOKMARK HANDLERS ====================

  const handleToggleDaily = useCallback(async (bookmarkId: number, enabled: boolean) => {
    if (togglingBookmarkId === bookmarkId) return;
    
    setTogglingBookmarkId(bookmarkId);
    
    try {
      await updateBookmark(bookmarkId, {
        daily_download_enabled: enabled
      });
      
      const bookmark = bookmarks.find(b => b.id === bookmarkId);
      toastService.success(
        `Daily download ${enabled ? 'enabled' : 'disabled'} for ${bookmark?.scheme_name || 'scheme'}`
      );
      
      FrontendErrorLogger.info(
        'Daily download toggled from Dashboard',
        'NavDashboardPage',
        {
          bookmarkId,
          enabled
        }
      );
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Failed to toggle daily download from Dashboard',
        'NavDashboardPage',
        {
          bookmarkId,
          error: error.message
        },
        error.stack
      );
      toastService.error('Failed to update daily download setting');
    } finally {
      setTogglingBookmarkId(null);
    }
  }, [bookmarks, updateBookmark, togglingBookmarkId]);

  // ==================== NAV DATA HANDLERS ====================

  const handleViewNavData = useCallback((bookmark: SchemeBookmark) => {
    if (!bookmark.nav_records_count || bookmark.nav_records_count === 0) {
      toastService.warning(
        `No NAV data available for ${bookmark.scheme_name}. Try downloading historical data first.`
      );
      return;
    }

    setSelectedBookmark(bookmark);
    setShowNavDataModal(true);
    
    FrontendErrorLogger.info(
      'Opening NAV Data Viewer from Dashboard',
      'NavDashboardPage',
      {
        bookmarkId: bookmark.id,
        schemeName: bookmark.scheme_name,
        navRecordsCount: bookmark.nav_records_count
      }
    );
  }, []);

  const handleHistoricalDownload = useCallback((bookmark: SchemeBookmark) => {
    setSelectedBookmark(bookmark);
    setShowHistoricalModal(true);
    
    FrontendErrorLogger.info(
      'Opening Historical Download Modal from Dashboard',
      'NavDashboardPage',
      {
        bookmarkId: bookmark.id,
        schemeName: bookmark.scheme_name
      }
    );
  }, []);

  const handleHistoricalDownloadStarted = useCallback((jobId: number) => {
    FrontendErrorLogger.info(
      'Historical download started from Dashboard',
      'NavDashboardPage',
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
        'NavDashboardPage',
        { jobId, error: error.message },
        error.stack
      );
      toastService.error('Failed to track download progress: ' + error.message);
      setShowProgressModal(false);
    });
  }, [startPolling]);

  const handleDownloadComplete = useCallback(() => {
    FrontendErrorLogger.info(
      'Download completed - refreshing dashboard',
      'NavDashboardPage',
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

  const handleCalculateMetrics = useCallback((bookmark: SchemeBookmark) => {
    setSelectedBookmark(bookmark);
    setShowMetricsCalculationModal(true);
    
    FrontendErrorLogger.info(
      'Opening Metrics Calculation Modal from Dashboard',
      'NavDashboardPage',
      {
        bookmarkId: bookmark.id,
        schemeName: bookmark.scheme_name
      }
    );
  }, []);

  const handleCalculationStarted = useCallback((schemeId: number) => {
    setCalculatingSchemeId(schemeId);
    
    FrontendErrorLogger.info(
      'Metrics calculation started from Dashboard',
      'NavDashboardPage',
      { schemeId }
    );
  }, []);

  const handleCalculationComplete = useCallback((schemeId: number) => {
    setCalculatingSchemeId(null);
    
    FrontendErrorLogger.info(
      'Metrics calculation completed from Dashboard',
      'NavDashboardPage',
      { schemeId }
    );

    // Refresh bookmarks
    setTimeout(() => {
      if (isMountedRef.current) {
        refetch();
      }
    }, 500);
  }, [refetch]);

  // ==================== MODAL CLOSE HANDLERS ====================

  const handleCloseHistoricalModal = useCallback(() => {
    setShowHistoricalModal(false);
    setSelectedBookmark(null);
  }, []);

  const handleCloseProgressModal = useCallback(() => {
    setShowProgressModal(false);
    setCurrentProgress(null);
    stopPolling();
  }, [stopPolling]);

  const handleCloseNavDataModal = useCallback(() => {
    setShowNavDataModal(false);
    setSelectedBookmark(null);
  }, []);

  const handleCloseMetricsCalculationModal = useCallback(() => {
    setShowMetricsCalculationModal(false);
    setSelectedBookmark(null);
  }, []);

  // ==================== RENDER STATES ====================

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
          Loading NAV Dashboard...
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
          <p style={{ marginBottom: '16px' }}>⚠️ Failed to load NAV Dashboard</p>
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

  // ==================== MAIN RENDER ====================

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
              📊 NAV Dashboard
            </h1>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              Track your mutual fund schemes, NAV data, and financial metrics
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleNavigateToSearch}
              style={{
                padding: '12px 20px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              🔍 Search Schemes
            </button>
            
            <button
              onClick={handleNavigateToBookmarks}
              style={{
                padding: '12px 20px',
                backgroundColor: colors.brand.secondary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              📚 Manage Bookmarks
            </button>
            
            <button
              onClick={handleNavigateToHistory}
              style={{
                padding: '12px 20px',
                backgroundColor: colors.semantic.success,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              📜 NAV History
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Total Bookmarks */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
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
              fontSize: '40px',
              fontWeight: '700',
              color: colors.brand.primary,
              marginBottom: '8px'
            }}>
              {stats.total}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              Total Schemes
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Bookmarked for tracking
            </div>
          </div>

          {/* With NAV Data */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
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
              fontSize: '40px',
              fontWeight: '700',
              color: colors.semantic.success,
              marginBottom: '8px'
            }}>
              {stats.withNavData}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              With NAV Data
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Historical data available
            </div>
          </div>

          {/* Daily Enabled */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
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
              fontSize: '40px',
              fontWeight: '700',
              color: colors.brand.secondary,
              marginBottom: '8px'
            }}>
              {stats.dailyEnabled}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              Daily Download
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Auto-download enabled
            </div>
          </div>

          {/* Without Data */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
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
              fontSize: '40px',
              fontWeight: '700',
              color: colors.semantic.warning,
              marginBottom: '8px'
            }}>
              {stats.withoutData}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              Needs Download
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              No historical data yet
            </div>
          </div>
        </div>

        {/* Bookmarks Section */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '20px'
          }}>
            Your Schemes ({stats.total})
          </h2>

          {/* Empty State */}
          {bookmarks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.utility.secondaryText
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '12px'
              }}>
                No schemes bookmarked yet
              </h3>
              <p style={{ marginBottom: '24px', fontSize: '16px' }}>
                Start by searching and bookmarking mutual fund schemes
              </p>
              <button
                onClick={handleNavigateToSearch}
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
                🔍 Search & Bookmark Schemes
              </button>
            </div>
          ) : (
            /* Bookmarks List */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {bookmarks.map((bookmark) => (
                <EnhancedBookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onToggleDaily={handleToggleDaily}
                  onViewNavData={handleViewNavData}
                  onHistoricalDownload={handleHistoricalDownload}
                  onCalculateMetrics={handleCalculateMetrics}
                  onDashboardClick={handleDashboardClick}
                  showActions={true}
                  isCalculating={calculatingSchemeId === bookmark.scheme_id}
                />
              ))}
            </div>
          )}

          {/* View More Link */}
          {pagination && pagination.total > bookmarks.length && (
            <div style={{
              marginTop: '24px',
              textAlign: 'center',
              padding: '20px',
              borderTop: `1px solid ${colors.utility.primaryText}10`
            }}>
              <p style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                marginBottom: '12px'
              }}>
                Showing {bookmarks.length} of {pagination.total} bookmarked schemes
              </p>
              <button
                onClick={handleNavigateToBookmarks}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.brand.secondary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                📚 View All Bookmarks
              </button>
            </div>
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

      {/* NAV Progress Modal */}
      <NavProgressModal
        isOpen={showProgressModal}
        progress={currentProgress}
        onClose={handleCloseProgressModal}
        onComplete={handleDownloadComplete}
        title="Downloading Historical NAV Data"
        showCancelButton={true}
      />

      {/* NAV Data Viewer Modal */}
      <NavDataViewerModal
        isOpen={showNavDataModal}
        bookmark={selectedBookmark}
        onClose={handleCloseNavDataModal}
      />

      {/* NEW: Metrics Calculation Modal */}
      <MetricsCalculationModal
        isOpen={showMetricsCalculationModal}
        bookmark={selectedBookmark}
        onClose={handleCloseMetricsCalculationModal}
        onCalculationStarted={handleCalculationStarted}
        onCalculationComplete={handleCalculationComplete}
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

export default NavDashboardPage;