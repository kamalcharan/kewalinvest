// frontend/src/pages/nav/NavDashboardPage.tsx
// FIXED: Added automatic refresh on download completion

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavDashboard, useDownloads, useDownloadProgress } from '../../hooks/useNavData';
import { EnhancedBookmarkCard } from '../../components/nav/EnhancedBookmarkCard';
import { HistoricalDownloadModal } from '../../components/nav/HistoricalDownloadModal';
import { NavProgressModal } from '../../components/nav/NavProgressModal';
import BookmarkGapAlert from '../../components/nav/BookmarkGapAlert';
import UnbookmarkedSchemesModal from '../../components/nav/UnbookmarkedSchemesModal';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import { toastService } from '../../services/toast.service';
import type { SchemeBookmark, DownloadProgress } from '../../services/nav.service';
import '../../components/nav/BookmarkCard.css';

const NavDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Refs to prevent unnecessary re-renders
  const isMountedRef = useRef(true);
  const lastRefreshRef = useRef<number>(0);
  const refreshCooldown = 5000; // 5 seconds between refreshes

  // Main dashboard data
  const {
    bookmarks,
    statistics,
    activeDownloads,
    todayDataStatus,
    schedulerConfig,
    schedulerStatus,
    isLoading,
    error,
    refetchAll
  } = useNavDashboard();

  const { triggerDailyDownload } = useDownloads();
  const { startPolling, stopPolling } = useDownloadProgress();

  // Modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<DownloadProgress | null>(null);
  const [isTriggeringDownload, setIsTriggeringDownload] = useState(false);

  // Enhanced bookmark card modals
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<SchemeBookmark | null>(null);

  // Unbookmarked schemes modal
  const [showUnbookmarkedModal, setShowUnbookmarkedModal] = useState(false);

  // Debounced refresh to prevent excessive API calls
  const debouncedRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current > refreshCooldown && isMountedRef.current) {
      lastRefreshRef.current = now;
      refetchAll();
      
      FrontendErrorLogger.info(
        'Dashboard refreshed (debounced)',
        'NavDashboardPage',
        { cooldownMs: refreshCooldown }
      );
    } else {
      FrontendErrorLogger.info(
        'Refresh skipped (cooldown active)',
        'NavDashboardPage',
        { 
          timeSinceLastRefresh: now - lastRefreshRef.current,
          cooldownMs: refreshCooldown 
        }
      );
    }
  }, [refetchAll]);

  // FIXED: Force refresh (bypasses cooldown for important updates like download completion)
  const forceRefresh = useCallback(() => {
    if (isMountedRef.current) {
      lastRefreshRef.current = Date.now();
      refetchAll();
      
      FrontendErrorLogger.info(
        'Dashboard force refreshed',
        'NavDashboardPage',
        { reason: 'Download completion' }
      );
    }
  }, [refetchAll]);

  // Handle daily download trigger
  const handleTriggerDailyDownload = useCallback(async () => {
    if (isTriggeringDownload) return;

    setIsTriggeringDownload(true);

    try {
      const result = await triggerDailyDownload();
      
      if (result.alreadyExists) {
        toastService.info(result.message);
      } else {
        toastService.success('Daily download started successfully!');
        setTimeout(() => {
          if (isMountedRef.current) {
            debouncedRefresh();
          }
        }, 1000);
      }
    } catch (err: any) {
      FrontendErrorLogger.error(
        'Failed to trigger daily download',
        'NavDashboardPage',
        { error: err.message },
        err.stack
      );
      toastService.error(err.message || 'Failed to start download');
    } finally {
      setIsTriggeringDownload(false);
    }
  }, [isTriggeringDownload, triggerDailyDownload, debouncedRefresh]);

  // Handle historical download
  const handleHistoricalDownload = useCallback((bookmark: SchemeBookmark) => {
    setSelectedBookmark(bookmark);
    setShowHistoricalModal(true);
    
    FrontendErrorLogger.info(
      'Opening Historical Download Modal',
      'NavDashboardPage',
      {
        bookmarkId: bookmark.id,
        schemeName: bookmark.scheme_name
      }
    );
  }, []);

  // Historical download handler
  const handleHistoricalDownloadStarted = useCallback((jobId: number) => {
    FrontendErrorLogger.info(
      'Historical download started',
      'NavDashboardPage',
      { jobId }
    );
    
    // Validate job ID
    if (!jobId || jobId <= 0) {
      toastService.error('Invalid download job ID received');
      FrontendErrorLogger.error(
        'Invalid job ID received',
        'NavDashboardPage',
        { jobId }
      );
      return;
    }

    setShowProgressModal(true);
    setCurrentProgress(null);

    // Single polling
    startPolling(jobId, (progressData: DownloadProgress) => {
      setCurrentProgress(progressData);
      
      FrontendErrorLogger.info(
        'Progress update received',
        'NavDashboardPage',
        {
          jobId,
          status: progressData.status,
          progressPercentage: progressData.progressPercentage,
          processedSchemes: progressData.processedSchemes,
          totalSchemes: progressData.totalSchemes
        }
      );
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

  // Modal close handlers
  const handleCloseHistoricalModal = useCallback(() => {
    setShowHistoricalModal(false);
    setSelectedBookmark(null);
    
    FrontendErrorLogger.info(
      'Historical Download Modal closed',
      'NavDashboardPage',
      {}
    );
  }, []);

  const handleCloseProgressModal = useCallback(() => {
    setShowProgressModal(false);
    setCurrentProgress(null);
    stopPolling();
    
    FrontendErrorLogger.info(
      'Progress Modal closed',
      'NavDashboardPage',
      {}
    );
  }, [stopPolling]);

  // FIXED: Handle download completion (called automatically by NavProgressModal)
  const handleDownloadComplete = useCallback(() => {
    FrontendErrorLogger.info(
      'Download completed - triggering dashboard refresh',
      'NavDashboardPage',
      {}
    );
    
    // Force refresh to update bookmark cards immediately
    setTimeout(() => {
      if (isMountedRef.current) {
        forceRefresh();
        toastService.success('NAV data updated! Bookmarks refreshed.');
      }
    }, 500);
  }, [forceRefresh]);

  // Navigation handlers
  const handleNavigateToBookmarks = useCallback(() => {
    try {
      navigate('/nav/bookmarks');
      FrontendErrorLogger.info('Navigating to bookmarks page', 'NavDashboardPage', {});
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to NAV bookmarks failed',
        'NavDashboardPage',
        { action: 'navigate_bookmarks', error: error.message },
        error.stack
      );
    }
  }, [navigate]);

  const handleNavigateToSearch = useCallback(() => {
    try {
      navigate('/nav/search');
      FrontendErrorLogger.info('Navigating to search page', 'NavDashboardPage', {});
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to NAV search failed',
        'NavDashboardPage',
        { action: 'navigate_search', error: error.message },
        error.stack
      );
    }
  }, [navigate]);

  const handleNavigateToScheduler = useCallback(() => {
    try {
      navigate('/nav/scheduler');
      FrontendErrorLogger.info('Navigating to scheduler page', 'NavDashboardPage', {});
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to NAV scheduler failed',
        'NavDashboardPage',
        { action: 'navigate_scheduler', error: error.message },
        error.stack
      );
    }
  }, [navigate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopPolling();
      FrontendErrorLogger.info('NavDashboardPage unmounted', 'NavDashboardPage', {});
    };
  }, [stopPolling]);

  // Error display
  if (error && !error.includes('Rate limit')) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: colors.semantic.error + '10',
          borderRadius: '12px',
          color: colors.semantic.error
        }}>
          <p style={{ marginBottom: '16px' }}>⚠️ Failed to load NAV dashboard</p>
          <p style={{ 
            marginBottom: '16px', 
            fontSize: '14px',
            color: colors.utility.secondaryText 
          }}>
            {error}
          </p>
          <button
            onClick={() => {
              if (Date.now() - lastRefreshRef.current > refreshCooldown) {
                refetchAll();
                lastRefreshRef.current = Date.now();
              } else {
                toastService.info('Please wait before retrying');
              }
            }}
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
              NAV Tracking Dashboard
            </h1>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              Monitor your scheme NAV data and automated downloads
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              🔍 Search Schemes
            </button>
            
            <button
              onClick={handleNavigateToScheduler}
              style={{
                padding: '12px 20px',
                backgroundColor: schedulerConfig?.is_enabled ? colors.semantic.success : colors.semantic.warning,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              ⏰ {schedulerConfig?.is_enabled ? 'Scheduler ON' : 'Setup Scheduler'}
            </button>
            
            <button
              onClick={handleTriggerDailyDownload}
              disabled={isTriggeringDownload || bookmarks.length === 0}
              style={{
                padding: '12px 20px',
                backgroundColor: (isTriggeringDownload || bookmarks.length === 0) 
                  ? colors.utility.secondaryText 
                  : colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (isTriggeringDownload || bookmarks.length === 0) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s ease',
                opacity: (isTriggeringDownload || bookmarks.length === 0) ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isTriggeringDownload && bookmarks.length > 0) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {isTriggeringDownload ? (
                <>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Downloading...
                </>
              ) : (
                <>📥 Download Today's NAV</>
              )}
            </button>
          </div>
        </div>

        {/* Scheduler Status Card */}
        {schedulerConfig && (
          <div style={{
            backgroundColor: schedulerConfig.is_enabled 
              ? colors.semantic.success + '10' 
              : colors.semantic.warning + '10',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            border: `1px solid ${schedulerConfig.is_enabled 
              ? colors.semantic.success + '30' 
              : colors.semantic.warning + '30'}`
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: '0 0 4px 0'
                }}>
                  {schedulerConfig.is_enabled ? '✅' : '⚠️'} Automated Downloads {schedulerConfig.is_enabled ? 'Enabled' : 'Disabled'}
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  margin: 0
                }}>
                  {schedulerConfig.is_enabled 
                    ? `Daily downloads scheduled at ${schedulerConfig.download_time} • Next run: ${schedulerStatus?.next_run ? new Date(schedulerStatus.next_run).toLocaleString('en-IN') : 'Calculating...'}`
                    : 'Enable automated downloads to get daily NAV data automatically'
                  }
                </p>
              </div>
              
              <button
                onClick={handleNavigateToScheduler}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: schedulerConfig.is_enabled ? colors.semantic.success : colors.semantic.warning,
                  border: `1px solid ${schedulerConfig.is_enabled ? colors.semantic.success : colors.semantic.warning}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = schedulerConfig.is_enabled 
                    ? colors.semantic.success + '10' 
                    : colors.semantic.warning + '10';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {schedulerConfig.is_enabled ? 'Manage' : 'Setup'}
              </button>
            </div>
          </div>
        )}

        {/* Bookmark Gap Alert */}
        <BookmarkGapAlert
          onViewAll={() => setShowUnbookmarkedModal(true)}
        />

        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
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
              {statistics?.total_schemes_tracked || 0}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '8px'
            }}>
              Schemes Tracked
            </div>
            {(statistics?.total_schemes_tracked || 0) === 0 && (
              <button
                onClick={handleNavigateToSearch}
                style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Start Tracking
              </button>
            )}
          </div>

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
              color: colors.semantic.success,
              marginBottom: '4px'
            }}>
              {statistics?.schemes_with_daily_download || 0}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '8px'
            }}>
              Auto-Download Enabled
            </div>
            {!schedulerConfig && (statistics?.total_schemes_tracked || 0) > 0 && (
              <button
                onClick={handleNavigateToScheduler}
                style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  backgroundColor: colors.semantic.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Setup Auto-Download
              </button>
            )}
          </div>

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
              color: colors.brand.secondary,
              marginBottom: '4px'
            }}>
              {statistics?.total_nav_records.toLocaleString() || '0'}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              Total NAV Records
            </div>
          </div>

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
              color: todayDataStatus?.data_available ? colors.semantic.success : colors.semantic.warning,
              marginBottom: '4px'
            }}>
              {todayDataStatus?.schemes_with_today_data || 0}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '8px'
            }}>
              Today's Data Available
            </div>
            {todayDataStatus && !todayDataStatus.data_available && todayDataStatus.total_bookmarked_schemes > 0 && (
              <button
                onClick={handleTriggerDailyDownload}
                disabled={isTriggeringDownload}
                style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  backgroundColor: colors.semantic.warning,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isTriggeringDownload ? 'not-allowed' : 'pointer',
                  opacity: isTriggeringDownload ? 0.6 : 1
                }}
              >
                Download Now
              </button>
            )}
          </div>
        </div>

        {/* Active Downloads */}
        {activeDownloads.length > 0 && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                width: '12px',
                height: '12px',
                backgroundColor: colors.brand.primary,
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite'
              }} />
              Active Downloads ({activeDownloads.length})
            </h3>
            
            {activeDownloads.map((download) => (
              <div key={download.jobId} style={{
                padding: '16px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px',
                marginBottom: '12px',
                border: `1px solid ${colors.brand.primary}20`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    fontWeight: '500',
                    color: colors.utility.primaryText
                  }}>
                    Job #{download.jobId}
                  </span>
                  <span style={{
                    fontSize: '14px',
                    color: colors.brand.primary,
                    fontWeight: '600'
                  }}>
                    {download.progressPercentage}%
                  </span>
                </div>
                
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: colors.utility.primaryText + '20',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    width: `${download.progressPercentage}%`,
                    height: '100%',
                    backgroundColor: colors.brand.primary,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                
                <div style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText
                }}>
                  {download.currentStep}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Bookmarks */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px'
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
              Recent Bookmarks
            </h3>
            <button
              onClick={handleNavigateToBookmarks}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: colors.brand.primary,
                border: `1px solid ${colors.brand.primary}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.brand.primary + '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              View All
            </button>
          </div>

          {isLoading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px',
              color: colors.utility.secondaryText
            }}>
              <span style={{
                width: '24px',
                height: '24px',
                border: '3px solid transparent',
                borderTop: `3px solid ${colors.brand.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '12px'
              }} />
              Loading bookmarks...
            </div>
          ) : bookmarks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: colors.utility.secondaryText
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
              <h4 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                No Schemes Bookmarked
              </h4>
              <p style={{ marginBottom: '16px' }}>
                Search and bookmark schemes to start tracking their NAV data
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
                  fontWeight: '500',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                🔍 Search & Bookmark Schemes
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bookmarks.slice(0, 5).map((bookmark) => (
                <EnhancedBookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onHistoricalDownload={handleHistoricalDownload}
                  showActions={true}
                />
              ))}
              
              {bookmarks.length > 5 && (
                <div style={{
                  textAlign: 'center',
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: `1px solid ${colors.utility.primaryText}10`
                }}>
                  <button
                    onClick={handleNavigateToBookmarks}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: colors.brand.secondary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    View All {bookmarks.length} Bookmarks →
                  </button>
                </div>
              )}
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

      {/* Progress Modal with automatic refresh on completion - FIXED */}
      <NavProgressModal
        isOpen={showProgressModal}
        progress={currentProgress}
        onClose={handleCloseProgressModal}
        onComplete={handleDownloadComplete}
        title="Downloading Historical NAV Data"
        showCancelButton={true}
      />

      {/* Unbookmarked Schemes Modal */}
      <UnbookmarkedSchemesModal
        isOpen={showUnbookmarkedModal}
        onClose={() => setShowUnbookmarkedModal(false)}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default NavDashboardPage;