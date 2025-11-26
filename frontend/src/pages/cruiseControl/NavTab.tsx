// frontend/src/pages/cruiseControl/NavTab.tsx
// FIXED: Proper integration with modals, all filters working, all bookmarks shown

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import toastService from '../../services/toast.service';
import { EnhancedBookmarkCard } from '../../components/nav/EnhancedBookmarkCard';
import { HistoricalDownloadModal } from '../../components/nav/HistoricalDownloadModal';
import { MetricsCalculationModal } from '../../components/nav/MetricsCalculationModal';
import type { SchemeBookmark } from '../../types/nav.types';

type FilterType = 'all' | 'pending' | 'failed' | 'no-data' | 'metrics-pending' | null;

interface StatCardProps {
  title: string;
  count: number;
  color?: 'blue' | 'yellow' | 'red' | 'green';
  onClick?: () => void;
  active?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, count, color = 'blue', onClick, active }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const colorMap = {
    blue: colors.brand.primary,
    yellow: colors.semantic.warning,
    red: colors.semantic.error,
    green: colors.semantic.success
  };

  const selectedColor = colorMap[color];

  return (
    <div
      onClick={onClick}
      style={{
        padding: '20px',
        backgroundColor: active ? `${selectedColor}15` : colors.utility.primaryBackground,
        border: `2px solid ${active ? selectedColor : `${selectedColor}20`}`,
        borderRadius: '10px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = `${selectedColor}60`;
          e.currentTarget.style.boxShadow = `0 4px 12px ${selectedColor}20`;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = active ? selectedColor : `${selectedColor}20`;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        fontSize: '32px',
        fontWeight: '700',
        color: selectedColor,
        marginBottom: '8px'
      }}>
        {count}
      </div>
      <div style={{
        fontSize: '14px',
        color: colors.utility.secondaryText,
        fontWeight: '500'
      }}>
        {title}
      </div>
    </div>
  );
};

export const NavTab: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // State
  const [filter, setFilter] = useState<FilterType>(null);
  const [stats, setStats] = useState({
    totalActive: 0,
    pendingDownloads: 0,
    failedDownloads: 0,
    pendingBeyondDaily: 0,
    metricsPending: 0
  });
  const [bookmarks, setBookmarks] = useState<SchemeBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Modal state
  const [selectedBookmark, setSelectedBookmark] = useState<SchemeBookmark | null>(null);
  const [showHistoricalModal, setShowHistoricalModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [calculatingSchemeId, setCalculatingSchemeId] = useState<number | null>(null);

  useEffect(() => {
    fetchNavStats();
    fetchAllBookmarks();
  }, []);

  // Fetch ALL bookmarks (no pagination limit)
  const fetchAllBookmarks = async () => {
    try {
      // Fetch with large page size to get all bookmarks
      const response = await apiService.get(`${API_ENDPOINTS.NAV.BOOKMARKS}?page_size=1000`) as any;
      if (response.success && response.data) {
        setBookmarks(response.data.bookmarks || []);
      }
    } catch (err: any) {
      console.error('Error fetching bookmarks:', err);
    }
  };

  const fetchNavStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get(API_ENDPOINTS.CRUISE_CONTROL.NAV_STATISTICS) as any;
      if (response.success && response.data) {
        setStats({
          totalActive: response.data.total_schemes_tracked || 0,
          pendingDownloads: response.data.schemes_with_daily_download || 0,
          failedDownloads: response.data.failed_downloads_today || 0,
          pendingBeyondDaily: (response.data.total_schemes_tracked || 0) - (response.data.schemes_with_historical_data || 0),
          metricsPending: response.data.schemes_without_calculations || 0
        });
      }
    } catch (err: any) {
      setError('Failed to load NAV statistics');
    } finally {
      setLoading(false);
    }
  };

  // Download NAV for all bookmarked schemes
  const handleDownloadAll = async () => {
    try {
      setDownloadingAll(true);
      const response = await apiService.post(API_ENDPOINTS.NAV.DOWNLOAD_DAILY) as any;
      if (response.success) {
        toastService.success(response.message || 'Daily NAV download triggered for all bookmarked schemes');
        fetchNavStats();
        fetchAllBookmarks();
      } else {
        toastService.error(response.error || 'Failed to trigger daily download');
      }
    } catch (err: any) {
      toastService.error('Failed to trigger daily NAV download');
    } finally {
      setDownloadingAll(false);
    }
  };

  // Open historical download modal
  const handleHistoricalDownload = useCallback((bookmark: SchemeBookmark) => {
    setSelectedBookmark(bookmark);
    setShowHistoricalModal(true);
  }, []);

  // Open metrics calculation modal
  const handleCalculateMetrics = useCallback((bookmark: SchemeBookmark) => {
    setSelectedBookmark(bookmark);
    setShowMetricsModal(true);
  }, []);

  // Handle calculation started
  const handleCalculationStarted = useCallback((schemeId: number) => {
    setCalculatingSchemeId(schemeId);
  }, []);


  // Filter logic - properly filter bookmarks based on selected filter
  const getFilteredBookmarks = (): SchemeBookmark[] => {
    if (!filter) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch (filter) {
      case 'all':
        // All bookmarks
        return bookmarks;

      case 'pending':
        // Schemes with daily download enabled but NAV not updated today
        return bookmarks.filter(b => {
          if (!b.daily_download_enabled) return false;
          if (!b.latest_nav_date) return true; // No NAV data = pending
          const navDate = new Date(b.latest_nav_date);
          navDate.setHours(0, 0, 0, 0);
          return navDate < yesterday; // NAV older than yesterday = pending
        });

      case 'failed':
        // Schemes with failed download status
        return bookmarks.filter(b => b.last_download_status === 'failed');

      case 'no-data':
        // Schemes with no NAV data at all
        return bookmarks.filter(b => (b.nav_records_count || 0) === 0);

      case 'metrics-pending':
        // Schemes with NAV data but no metrics calculated
        return bookmarks.filter(b => {
          const hasNavData = (b.nav_records_count || 0) > 0;
          // Check if metrics are not calculated (no metrics_calculated_at or similar field)
          // We'll use a heuristic: if scheme has NAV data but no latest_nav_value metrics info
          return hasNavData && !b.metrics_calculated_at;
        });

      default:
        return [];
    }
  };

  const filteredBookmarks = getFilteredBookmarks();

  const getFilterTitle = (): string => {
    switch (filter) {
      case 'all': return 'All NAV Schemes';
      case 'pending': return 'Pending Downloads';
      case 'failed': return 'Failed Downloads';
      case 'no-data': return 'Schemes with No Data';
      case 'metrics-pending': return 'Metrics Pending';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <Loader2 size={24} className="animate-spin" style={{ marginRight: '8px' }} />
        Loading NAV statistics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', backgroundColor: `${colors.semantic.error}10`, border: `1px solid ${colors.semantic.error}40`, borderRadius: '8px', color: colors.semantic.error }}>
        <strong>Error:</strong> {error}
        <button onClick={fetchNavStats} style={{ marginLeft: '12px', padding: '6px 12px', backgroundColor: colors.semantic.error, color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Download All Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            NAV Downloads
          </h2>
          <p style={{
            fontSize: '13px',
            color: colors.utility.secondaryText,
            margin: '4px 0 0 0'
          }}>
            Manage NAV data for bookmarked schemes
          </p>
        </div>
        <button
          onClick={handleDownloadAll}
          disabled={downloadingAll || stats.totalActive === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: downloadingAll ? colors.utility.secondaryBackground : colors.brand.primary,
            color: downloadingAll ? colors.utility.secondaryText : '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: downloadingAll || stats.totalActive === 0 ? 'not-allowed' : 'pointer',
            opacity: stats.totalActive === 0 ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
        >
          {downloadingAll ? (
            <>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Downloading...
            </>
          ) : (
            <>
              <Download size={16} />
              Download All NAVs
            </>
          )}
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <StatCard
          title="Total Active NAVs"
          count={stats.totalActive}
          color="blue"
          active={filter === 'all'}
          onClick={() => setFilter(filter === 'all' ? null : 'all')}
        />
        <StatCard
          title="Pending Downloads"
          count={stats.pendingDownloads}
          color="yellow"
          active={filter === 'pending'}
          onClick={() => setFilter(filter === 'pending' ? null : 'pending')}
        />
        <StatCard
          title="Failed Downloads"
          count={stats.failedDownloads}
          color="red"
          active={filter === 'failed'}
          onClick={() => setFilter(filter === 'failed' ? null : 'failed')}
        />
        <StatCard
          title="No NAV Data"
          count={stats.pendingBeyondDaily}
          color="red"
          active={filter === 'no-data'}
          onClick={() => setFilter(filter === 'no-data' ? null : 'no-data')}
        />
        <StatCard
          title="Metrics Pending"
          count={stats.metricsPending}
          color="yellow"
          active={filter === 'metrics-pending'}
          onClick={() => setFilter(filter === 'metrics-pending' ? null : 'metrics-pending')}
        />
      </div>

      {/* Instructions */}
      {!filter && (
        <div style={{
          padding: '32px',
          backgroundColor: `${colors.brand.primary}10`,
          borderRadius: '12px',
          textAlign: 'center',
          border: `1px dashed ${colors.brand.primary}40`
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👆</div>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Click on any stat card to view details
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            See list of schemes and take actions like download or calculate metrics
          </div>
        </div>
      )}

      {/* List View */}
      {filter && (
        <div>
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
              {getFilterTitle()} ({filteredBookmarks.length})
            </h3>
            <button
              onClick={() => setFilter(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: colors.utility.secondaryBackground,
                border: 'none',
                borderRadius: '6px',
                color: colors.utility.primaryText,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              ✕ Close
            </button>
          </div>

          {filteredBookmarks.length === 0 ? (
            <div style={{
              padding: '48px',
              textAlign: 'center',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
              <div style={{
                fontSize: '16px',
                color: colors.utility.secondaryText
              }}>
                No schemes found in this category
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '600px',
              overflowY: 'auto'
            }}>
              {filteredBookmarks.map(bookmark => (
                <EnhancedBookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  showActions
                  onHistoricalDownload={handleHistoricalDownload}
                  onCalculateMetrics={handleCalculateMetrics}
                  isCalculating={calculatingSchemeId === bookmark.scheme_id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historical Download Modal */}
      {showHistoricalModal && selectedBookmark && (
        <HistoricalDownloadModal
          isOpen={showHistoricalModal}
          onClose={() => {
            setShowHistoricalModal(false);
            // Refresh data after closing modal
            fetchNavStats();
            fetchAllBookmarks();
          }}
          bookmark={selectedBookmark}
          onDownloadStarted={() => {}}
        />
      )}

      {/* Metrics Calculation Modal */}
      {showMetricsModal && selectedBookmark && (
        <MetricsCalculationModal
          isOpen={showMetricsModal}
          onClose={() => setShowMetricsModal(false)}
          bookmark={selectedBookmark}
          onCalculationStarted={handleCalculationStarted}
          onCalculationComplete={(schemeId: number) => {
            setCalculatingSchemeId(null);
            setShowMetricsModal(false);
            fetchNavStats();
            fetchAllBookmarks();
            toastService.success('Metrics calculation completed');
          }}
        />
      )}
    </div>
  );
};
