// frontend/src/pages/cruiseControl/NavTab.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Loader2 } from 'lucide-react';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import toastService from '../../services/toast.service';
import { EnhancedBookmarkCard } from '../../components/nav/EnhancedBookmarkCard';
import type { SchemeBookmark } from '../../types/nav.types';

// Dummy bookmark data
const DUMMY_BOOKMARKS: SchemeBookmark[] = [
  {
    id: 1,
    scheme_id: 101,
    scheme_code: 'INF200K01234',
    scheme_name: 'HDFC Equity Fund - Direct Plan - Growth',
    amc_name: 'HDFC Mutual Fund',
    nav_records_count: 2547,
    earliest_nav_date: '2015-01-01',
    latest_nav_date: '2025-01-22',
    latest_nav_value: 458.7234,
    daily_download_enabled: true,
    download_time: '18:30',
    historical_download_completed: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2025-01-22T18:35:00Z'
  },
  {
    id: 2,
    scheme_id: 102,
    scheme_code: 'INF090I01234',
    scheme_name: 'ICICI Prudential Bluechip Fund - Direct - Growth',
    amc_name: 'ICICI Prudential Mutual Fund',
    nav_records_count: 1823,
    earliest_nav_date: '2016-06-15',
    latest_nav_date: '2025-01-21',
    latest_nav_value: 89.4521,
    daily_download_enabled: true,
    download_time: '18:30',
    historical_download_completed: true,
    created_at: '2024-02-10T10:00:00Z',
    updated_at: '2025-01-21T18:35:00Z'
  },
  {
    id: 3,
    scheme_id: 103,
    scheme_code: 'INF204K01235',
    scheme_name: 'SBI Small Cap Fund - Direct Plan - Growth',
    amc_name: 'SBI Mutual Fund',
    nav_records_count: 1245,
    earliest_nav_date: '2017-03-20',
    latest_nav_date: '2025-01-20',
    latest_nav_value: 156.8923,
    daily_download_enabled: false,
    download_time: '18:30',
    historical_download_completed: true,
    created_at: '2024-03-05T10:00:00Z',
    updated_at: '2025-01-20T12:00:00Z'
  },
  {
    id: 4,
    scheme_id: 104,
    scheme_code: 'INF179K01236',
    scheme_name: 'Axis Long Term Equity Fund - Direct - Growth',
    amc_name: 'Axis Mutual Fund',
    nav_records_count: 0,
    daily_download_enabled: false,
    download_time: '18:30',
    historical_download_completed: false,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z'
  },
  {
    id: 5,
    scheme_id: 105,
    scheme_code: 'INF274K01237',
    scheme_name: 'Kotak Emerging Equity Fund - Direct - Growth',
    amc_name: 'Kotak Mahindra Mutual Fund',
    nav_records_count: 2105,
    earliest_nav_date: '2014-08-10',
    latest_nav_date: '2025-01-18',
    latest_nav_value: 78.3421,
    daily_download_enabled: true,
    download_time: '18:30',
    historical_download_completed: true,
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2025-01-18T18:35:00Z'
  }
];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNavStats();
  }, []);

  const fetchNavStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get(API_ENDPOINTS.CRUISE_CONTROL.NAV_STATISTICS) as any;

      if (response.success && response.data) {
        setStats({
          totalActive: response.data.total_active_navs || 0,
          pendingDownloads: response.data.pending_downloads || 0,
          failedDownloads: response.data.failed_downloads || 0,
          pendingBeyondDaily: response.data.pending_beyond_daily || 0,
          metricsPending: response.data.metrics_pending || 0
        });
      } else {
        setError(response.error || 'Failed to load NAV statistics');
      }
    } catch (err: any) {
      console.error('Error fetching NAV stats:', err);
      setError('Failed to load NAV statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadNow = async (schemeCode: string) => {
    try {
      const response = await apiService.post(API_ENDPOINTS.CRUISE_CONTROL.NAV_DOWNLOAD(schemeCode)) as any;

      if (response.success) {
        toastService.success(response.message || 'NAV download triggered successfully');
        // Refresh stats after download
        fetchNavStats();
      } else {
        toastService.error(response.error || 'Failed to trigger NAV download');
      }
    } catch (err: any) {
      console.error('Error triggering NAV download:', err);
      toastService.error('Failed to trigger NAV download');
    }
  };

  // Filter bookmarks based on selected filter
  const getFilteredBookmarks = (): SchemeBookmark[] => {
    if (!filter) return [];

    switch (filter) {
      case 'all':
        return DUMMY_BOOKMARKS;
      case 'pending':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return DUMMY_BOOKMARKS.filter(b =>
          b.latest_nav_date && new Date(b.latest_nav_date) < yesterday
        );
      case 'failed':
        return [];
      case 'no-data':
        return DUMMY_BOOKMARKS.filter(b => (b.nav_records_count || 0) === 0);
      default:
        return [];
    }
  };

  const filteredBookmarks = getFilteredBookmarks();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        color: colors.utility.secondaryText
      }}>
        <Loader2 size={24} className="animate-spin" style={{ marginRight: '8px' }} />
        Loading NAV statistics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: `${colors.semantic.error}10`,
        border: `1px solid ${colors.semantic.error}40`,
        borderRadius: '8px',
        color: colors.semantic.error
      }}>
        <strong>Error:</strong> {error}
        <button
          onClick={fetchNavStats}
          style={{
            marginLeft: '12px',
            padding: '6px 12px',
            backgroundColor: colors.semantic.error,
            color: '#FFF',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
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
                  onHistoricalDownload={(b) => handleDownloadNow(b.scheme_code)}
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
