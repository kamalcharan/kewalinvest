// frontend/src/pages/cruiseControl/NavTab.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Loader2 } from 'lucide-react';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import toastService from '../../services/toast.service';
import { EnhancedBookmarkCard } from '../../components/nav/EnhancedBookmarkCard';
import type { SchemeBookmark } from '../../types/nav.types';

interface StatCardProps {
  title: string;
  count: number;
  color?: 'blue' | 'yellow' | 'red' | 'green';
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, count, color = 'blue', onClick }) => {
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
        backgroundColor: colors.utility.primaryBackground,
        border: `2px solid ${selectedColor}20`,
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
        e.currentTarget.style.borderColor = `${selectedColor}20`;
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

  const [filter, setFilter] = useState<'all' | 'pending' | 'failed' | 'no-data' | null>(null);
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

  useEffect(() => {
    fetchNavStats();
    fetchBookmarks();
  }, []);

  const fetchNavStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get(API_ENDPOINTS.CRUISE_CONTROL.NAV_STATISTICS) as any;
      if (response.success && response.data) {
        // Map backend field names to frontend state
        // Backend returns: total_schemes_tracked, schemes_with_daily_download,
        // schemes_with_historical_data, schemes_without_calculations, failed_downloads_today
        setStats({
          totalActive: response.data.total_schemes_tracked || 0,
          pendingDownloads: response.data.schemes_with_daily_download || 0,  // Schemes with daily download enabled
          failedDownloads: response.data.failed_downloads_today || 0,
          pendingBeyondDaily: (response.data.total_schemes_tracked || 0) - (response.data.schemes_with_historical_data || 0),  // Schemes without any NAV data
          metricsPending: response.data.schemes_without_calculations || 0
        });
      }
    } catch (err: any) {
      setError('Failed to load NAV statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const response = await apiService.get(API_ENDPOINTS.NAV.BOOKMARKS) as any;
      if (response.success && response.data) {
        setBookmarks(response.data.bookmarks || []);
      }
    } catch (err: any) {
      console.error('Error fetching bookmarks:', err);
    }
  };

  const handleDownloadNow = async (schemeCode: string, schemeName?: string) => {
    try {
      const response = await apiService.post(API_ENDPOINTS.CRUISE_CONTROL.NAV_DOWNLOAD(schemeCode)) as any;
      if (response.success) {
        toastService.success(response.message || `NAV updated for ${schemeName || schemeCode}`);
        fetchNavStats();
        fetchBookmarks();
      } else {
        toastService.error(response.error || 'Failed to trigger NAV download');
      }
    } catch (err: any) {
      toastService.error('Failed to trigger NAV download');
    }
  };

  const getFilteredBookmarks = (): SchemeBookmark[] => {
    if (!filter) return [];
    switch (filter) {
      case 'all':
        return bookmarks;
      case 'pending':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return bookmarks.filter(b => b.latest_nav_date && new Date(b.latest_nav_date) < yesterday);
      case 'failed':
        return [];
      case 'no-data':
        return bookmarks.filter(b => (b.nav_records_count || 0) === 0);
      default:
        return [];
    }
  };

  const filteredBookmarks = getFilteredBookmarks();

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
      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <StatCard
          title="Total Active NAVs"
          count={stats.totalActive}
          color="blue"
          onClick={() => setFilter(filter === 'all' ? null : 'all')}
        />
        <StatCard
          title="Pending Downloads"
          count={stats.pendingDownloads}
          color="yellow"
          onClick={() => setFilter(filter === 'pending' ? null : 'pending')}
        />
        <StatCard
          title="Failed Downloads"
          count={stats.failedDownloads}
          color="red"
          onClick={() => setFilter(filter === 'failed' ? null : 'failed')}
        />
        <StatCard
          title="Pending Beyond Daily"
          count={stats.pendingBeyondDaily}
          color="red"
          onClick={() => setFilter(filter === 'no-data' ? null : 'no-data')}
        />
        <StatCard
          title="Metrics Pending"
          count={stats.metricsPending}
          color="yellow"
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
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            👆
          </div>
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
              {filter === 'all' && 'All NAV Schemes'}
              {filter === 'pending' && 'Pending Downloads'}
              {filter === 'failed' && 'Failed Downloads'}
              {filter === 'no-data' && 'Schemes with No Data'}
              {' '}({filteredBookmarks.length})
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
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>
                🎉
              </div>
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
              gap: '16px'
            }}>
              {filteredBookmarks.map(bookmark => (
                <EnhancedBookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  showActions
                  onHistoricalDownload={(b) => handleDownloadNow(b.scheme_code, b.scheme_name)}
                  onCalculateMetrics={(b) => toastService.info('Metrics calculation feature coming soon')}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
