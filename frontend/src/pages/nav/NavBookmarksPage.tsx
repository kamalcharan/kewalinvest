// frontend/src/pages/nav/NavBookmarksPage.tsx
// Complete bookmarks management page with enhanced cards and full functionality - CLEAN VERSION

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookmarks, useDownloads, useDownloadProgress } from '../../hooks/useNavData';
import { EnhancedBookmarkCard } from '../../components/nav/EnhancedBookmarkCard';
import { HistoricalDownloadModal } from '../../components/nav/HistoricalDownloadModal';
import { NavProgressModal } from '../../components/nav/NavProgressModal';
import { NavDataViewerModal } from '../../components/nav/NavDataViewerModal';
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
  const pageSize = 20;

  // Modal state
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedBookmark, setSelectedBookmark] = useState<SchemeBookmark | null>(null);
  const [showNavDataModal, setShowNavDataModal] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<DownloadProgress | null>(null);

  // Bulk selection state
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Hooks
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

  const { triggerHistoricalDownload } = useDownloads();
  const { progress, startPolling } = useDownloadProgress();

  // Filter bookmarks based on daily download filter
  const filteredBookmarks = bookmarks.filter(bookmark => {
    if (dailyDownloadFilter === 'enabled') return bookmark.daily_download_enabled;
    if (dailyDownloadFilter === 'disabled') return !bookmark.daily_download_enabled;
    return true;
  });

  // Get unique AMCs for filter dropdown
  const uniqueAmcs = [...new Set(bookmarks.map(b => b.amc_name))].sort();

  // Event handlers
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
  const handleToggleDaily = async (bookmarkId: number, enabled: boolean) => {
    try {
      await updateBookmark(bookmarkId, { daily_download_enabled: enabled });
      toastService.success(`Daily download ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toastService.error('Failed to update bookmark');
    }
  };

  const handleViewNavData = (bookmark: SchemeBookmark) => {
    // Check if bookmark has NAV data
    if (!bookmark.nav_records_count || bookmark.nav_records_count === 0) {
      toastService.warning(`No NAV data available for ${bookmark.scheme_name}. Try downloading historical data first.`);
      return;
    }

    setSelectedBookmark(bookmark);
    setShowNavDataModal(true);
    
    FrontendErrorLogger.info(
      'Opening NAV Data Viewer from Bookmarks page',
      'NavBookmarksPage',
      {
        bookmarkId: bookmark.id,
        schemeName: bookmark.scheme_name,
        navRecordsCount: bookmark.nav_records_count
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

  // Historical download handlers
  const handleHistoricalDownloadStarted = (jobId: number) => {
    setShowProgressModal(true);
    setCurrentProgress(null);
    startPolling(jobId, (progressData) => {
      setCurrentProgress(progressData);
    });
  };

  const handleCloseHistoricalModal = () => {
    setShowHistoricalModal(false);
    setSelectedBookmark(null);
  };

  const handleCloseNavDataModal = () => {
    setShowNavDataModal(false);
    setSelectedBookmark(null);
  };

  // Bulk selection handlers
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

  // Bulk operations
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

  const handleBulkHistoricalDownload = () => {
    const selectedBookmarks = filteredBookmarks.filter(b => selectedBookmarkIds.has(b.id));
    if (selectedBookmarks.length === 0) return;

    // For bulk historical download, we'll use the first bookmark as template
    // TODO: In Phase 3, create a dedicated bulk historical download modal
    setSelectedBookmark(selectedBookmarks[0]);
    setShowHistoricalModal(true);
    toastService.info('Bulk historical download - Phase 3 feature. Showing single scheme for now.');
  };

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
  const handleBackToDashboard = () => {
    navigate('/nav/dashboard');
  };

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
              Bookmarked Schemes
            </h1>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              Manage your tracked mutual fund schemes and their NAV downloads
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
              🔍 Add More Schemes
            </button>
            
            <button
              onClick={handleBackToDashboard}
              style={{
                padding: '12px 20px',
                backgroundColor: 'transparent',
                color: colors.brand.primary,
                border: `1px solid ${colors.brand.primary}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

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
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                {selectedBookmarkIds.size} schemes selected
              </span>
              
              <div style={{ display: 'flex', gap: '8px' }}>
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
                  Historical Download
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
                {pagination?.total || 0} schemes found
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
              {/* Bookmarks List */}
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
                        onToggleDaily={handleToggleDaily}
                        onViewNavData={handleViewNavData}
                        onHistoricalDownload={handleHistoricalDownload}
                        showActions={true}
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

              {/* Pagination - FIXED property names */}
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
      />

      {/* NAV Data Viewer Modal */}
      <NavDataViewerModal
        isOpen={showNavDataModal}
        bookmark={selectedBookmark}
        onClose={handleCloseNavDataModal}
      />

      {/* Progress Modal */}
      <NavProgressModal
        isOpen={showProgressModal}
        progress={currentProgress}
        onClose={() => setShowProgressModal(false)}
        title="Downloading Historical NAV Data"
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

export default NavBookmarksPage;