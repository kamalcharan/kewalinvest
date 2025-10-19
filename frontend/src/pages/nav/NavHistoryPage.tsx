// frontend/src/pages/nav/NavHistoryPage.tsx
// NAV History page showing bulk download status and actions

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookmarks, useBulkDownload } from '../../hooks/useNavData';
import { EnhancedBookmarkCard } from '../../components/nav/EnhancedBookmarkCard';
import { BulkDownloadProgress } from '../../components/nav/BulkDownloadProgress';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import { toastService } from '../../services/toast.service';
import type { SchemeBookmark } from '../../services/nav.service';

type FilterType = 'all' | 'success' | 'failed';

const NavHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Hooks
  const { 
    bookmarks, 
    isLoading, 
    error, 
    fetchBookmarks,
    refetch 
  } = useBookmarks({ page: 1, page_size: 1000 });

  const bulkDownload = useBulkDownload();

  // Local state
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
  const total = bookmarks.length;
  const historyAvailable = bookmarks.filter(b => (b.nav_records_count || 0) > 0).length;
  const failed = bookmarks.filter(b => b.last_download_status === 'failed').length;

  return { total, historyAvailable, failed };
}, [bookmarks]);

  const stats = statistics();

  // Handle Download All
const handleDownloadAll = useCallback(async () => {
  // Filter schemes that don't have historical data
  const schemesToDownload = bookmarks.filter(b => (b.nav_records_count || 0) === 0);

  if (schemesToDownload.length === 0) {
    toastService.info('All schemes already have historical data available');
    return;
  }

    FrontendErrorLogger.info(
      'Starting Download All',
      'NavHistoryPage',
      { totalSchemes: schemesToDownload.length }
    );

    try {
      const result = await bulkDownload.processSchemes(schemesToDownload);
      
      FrontendErrorLogger.info(
        'Download All completed',
        'NavHistoryPage',
        {
          totalAttempted: result.totalAttempted,
          successful: result.successful,
          failed: result.failed,
          skipped: result.skipped
        }
      );

      // Refresh bookmarks after completion
      setTimeout(() => {
        refetch();
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
  }, [bookmarks, bulkDownload, refetch]);

  // Handle Retry Failed
const handleRetryFailed = useCallback(async () => {
  // Filter schemes with failed status
  const failedSchemes = bookmarks.filter(b => b.last_download_status === 'failed');

  if (failedSchemes.length === 0) {
    toastService.info('No failed downloads to retry');
    return;
  }

    FrontendErrorLogger.info(
      'Starting Retry Failed',
      'NavHistoryPage',
      { totalSchemes: failedSchemes.length }
    );

    try {
      const result = await bulkDownload.processSchemes(failedSchemes);
      
      FrontendErrorLogger.info(
        'Retry Failed completed',
        'NavHistoryPage',
        {
          totalAttempted: result.totalAttempted,
          successful: result.successful,
          failed: result.failed,
          skipped: result.skipped
        }
      );

      // Refresh bookmarks after completion
      setTimeout(() => {
        refetch();
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
  }, [bookmarks, bulkDownload, refetch]);

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
    setSearchQuery(''); // Reset search when changing filter
    
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

  // Initial load
  useEffect(() => {
    FrontendErrorLogger.info(
      'NavHistoryPage mounted',
      'NavHistoryPage',
      {}
    );
  }, []);

  // Loading state
  if (isLoading) {
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
const failedSchemes = bookmarks.filter(b => b.last_download_status === 'failed').length;

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
              Bulk download and manage historical NAV data for all schemes
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
              📥 Download All ({schemesWithoutData})
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
          </div>
        </div>

        {/* Statistics Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              {stats.total}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              Total Schemes
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
              color: colors.semantic.success,
              marginBottom: '4px'
            }}>
              {stats.historyAvailable}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              History Available
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
              color: colors.semantic.error,
              marginBottom: '4px'
            }}>
              {stats.failed}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              Failed Downloads
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
                All ({stats.total})
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
                Failed ({stats.failed})
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
                  mode="history"
                  onDashboardClick={handleDashboardClick}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Download Progress Modal */}
      <BulkDownloadProgress
        isOpen={bulkDownload.isProcessing}
        current={bulkDownload.progress.current}
        total={bulkDownload.progress.total}
        currentScheme={bulkDownload.progress.currentScheme}
        onCancel={bulkDownload.cancel}
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