// frontend/src/pages/nav/NavDashboardPage.tsx
// File 13/14: NAV Dashboard page component

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavDashboard } from '../../hooks/useNavData';
import { FrontendErrorLogger } from '../../services/errorLogger.service';

const NavDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const {
    bookmarks,
    statistics,
    activeDownloads,
    todayDataStatus,
    isLoading,
    error,
    refetchAll
  } = useNavDashboard();

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
              Monitor your scheme NAV data and downloads
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
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
              Search Schemes
            </button>
            <button
              onClick={handleNavigateToBookmarks}
              style={{
                padding: '12px 20px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Manage Bookmarks
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
              color: colors.utility.secondaryText
            }}>
              Schemes Tracked
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
              color: colors.semantic.success,
              marginBottom: '4px'
            }}>
              {statistics?.schemes_with_daily_download || 0}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              Daily Auto-Download
            </div>
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
              color: colors.utility.secondaryText
            }}>
              Today's Data Available
            </div>
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
              padding: '40px',
              color: colors.utility.secondaryText
            }}>
              Loading bookmarks...
            </div>
          ) : bookmarks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: colors.utility.secondaryText
            }}>
              <p style={{ marginBottom: '16px' }}>No schemes bookmarked yet</p>
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
                Search & Bookmark Schemes
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
    </div>
  );
};

export default NavDashboardPage;