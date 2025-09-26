// frontend/src/pages/nav/NavDashboardPage.tsx
// Enhanced NAV Dashboard with scheduler integration - PRODUCTION READY

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavDashboard, useDownloads } from '../../hooks/useNavData';
import { NavProgressModal } from '../../components/nav/NavProgressModal';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import { toastService } from '../../services/toast.service';

const NavDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

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

  // Modal state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(null);
  const [isTriggeringDownload, setIsTriggeringDownload] = useState(false);

  // Handle manual daily download
  const handleTriggerDailyDownload = async () => {
    if (isTriggeringDownload) return;

    setIsTriggeringDownload(true);

    try {
      const result = await triggerDailyDownload();
      
      if (result.alreadyExists) {
        toastService.info(result.message);
      } else {
        toastService.success('Daily download started successfully!');
        refetchAll(); // Refresh all data
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
  };

  // Navigation handlers
  const handleNavigateToBookmarks = () => {
    try {
      navigate('/nav/bookmarks');
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to NAV bookmarks failed',
        'NavDashboardPage',
        { action: 'navigate_bookmarks', error: error.message },
        error.stack
      );
    }
  };

  const handleNavigateToSearch = () => {
    try {
      navigate('/nav/search');
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to NAV search failed',
        'NavDashboardPage',
        { action: 'navigate_search', error: error.message },
        error.stack
      );
    }
  };

  const handleNavigateToScheduler = () => {
    try {
      navigate('/nav/scheduler');
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to NAV scheduler failed',
        'NavDashboardPage',
        { action: 'navigate_scheduler', error: error.message },
        error.stack
      );
    }
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
          <p style={{ marginBottom: '16px' }}>Failed to load NAV dashboard</p>
          <button
            onClick={refetchAll}
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
                gap: '8px'
              }}
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
                gap: '8px'
              }}
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
                gap: '8px'
              }}
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
              alignItems: 'center'
            }}>
              <div>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: '0 0 4px 0'
                }}>
                  Automated Downloads {schedulerConfig.is_enabled ? 'Enabled' : 'Disabled'}
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  margin: 0
                }}>
                  {schedulerConfig.is_enabled 
                    ? `Daily downloads scheduled at ${schedulerConfig.download_time} • Next run: ${schedulerStatus?.next_run ? new Date(schedulerStatus.next_run).toLocaleString() : 'Calculating...'}`
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
                  fontWeight: '500'
                }}
              >
                {schedulerConfig.is_enabled ? 'Manage' : 'Setup'}
              </button>
            </div>
          </div>
        )}

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
            padding: '20px'
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
            padding: '20px'
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
            {!schedulerConfig && (
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
            padding: '20px'
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
            padding: '20px'
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
                  cursor: isTriggeringDownload ? 'not-allowed' : 'pointer'
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
              marginBottom: '16px'
            }}>
              Active Downloads ({activeDownloads.length})
            </h3>
            
            {activeDownloads.map((download) => (
              <div key={download.jobId} style={{
                padding: '16px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px',
                marginBottom: '12px'
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
                fontSize: '14px'
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
                  fontWeight: '500'
                }}
              >
                🔍 Search & Bookmark Schemes
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookmarks.slice(0, 5).map((bookmark) => (
                <div key={bookmark.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: colors.utility.primaryBackground,
                  borderRadius: '8px'
                }}>
                  <div>
                    <div style={{
                      fontWeight: '500',
                      color: colors.utility.primaryText,
                      marginBottom: '4px'
                    }}>
                      {bookmark.scheme_name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: colors.utility.secondaryText
                    }}>
                      {bookmark.scheme_code} • {bookmark.amc_name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: colors.utility.secondaryText,
                      marginTop: '4px'
                    }}>
                      {bookmark.nav_records_count || 0} NAV records
                      {bookmark.latest_nav_date && ` • Latest: ${new Date(bookmark.latest_nav_date).toLocaleDateString()}`}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {bookmark.daily_download_enabled && (
                      <div style={{
                        padding: '4px 8px',
                        backgroundColor: colors.semantic.success + '20',
                        color: colors.semantic.success,
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Auto-Download
                      </div>
                    )}
                    {bookmark.latest_nav_value && (
                      <div style={{
                        fontWeight: '600',
                        color: colors.utility.primaryText
                      }}>
                        ₹{bookmark.latest_nav_value.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Modal */}
      <NavProgressModal
        isOpen={showProgressModal}
        progress={currentProgress}
        onClose={() => setShowProgressModal(false)}
        title="Downloading NAV Data"
        showCancelButton={true}
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