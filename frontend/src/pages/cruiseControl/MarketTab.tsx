// frontend/src/pages/cruiseControl/MarketTab.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Loader2 } from 'lucide-react';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import toastService from '../../services/toast.service';
import IndexCard from '../../components/market/IndexCard';
import type { MarketIndex } from '../../types/market.types';


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

export const MarketTab: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [filter, setFilter] = useState<'all' | 'pending' | 'failed' | 'no-data' | null>(null);
  const [stats, setStats] = useState({
    totalIndices: 0,
    downloadCompleted: 0,
    pendingBeyondOneDay: 0,
    failedDownloads: 0,
    metricsPending: 0
  });
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketStats();
    fetchIndices();
  }, []);

  const fetchMarketStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get(API_ENDPOINTS.CRUISE_CONTROL.MARKET_STATISTICS) as any;

      if (response.success && response.data) {
        setStats({
          totalIndices: response.data.total_active_indices || 0,
          downloadCompleted: response.data.download_completed_today || 0,
          pendingBeyondOneDay: response.data.pending_over_one_day || 0,
          failedDownloads: response.data.failed_downloads || 0,
          metricsPending: response.data.pending_over_one_day || 0
        });
      } else {
        setError(response.error || 'Failed to load market statistics');
      }
    } catch (err: any) {
      console.error('Error fetching market stats:', err);
      setError('Failed to load market statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchIndices = async () => {
    try {
      const response = await apiService.get(API_ENDPOINTS.MARKET.INDICES) as any;

      if (response.success && response.data) {
        setIndices(response.data.indices || []);
      }
    } catch (err: any) {
      console.error('Error fetching market indices:', err);
    }
  };

  const handleDownloadNow = async (indexId: number) => {
    try {
      const response = await apiService.post(API_ENDPOINTS.CRUISE_CONTROL.MARKET_DOWNLOAD(indexId)) as any;

      if (response.success) {
        toastService.success(response.message || 'Market download triggered successfully');
        // Refresh stats after download
        fetchMarketStats();
      } else {
        toastService.error(response.error || 'Failed to trigger market download');
      }
    } catch (err: any) {
      console.error('Error triggering market download:', err);
      toastService.error('Failed to trigger market download');
    }
  };

  // Filter indices based on selected filter
  const getFilteredIndices = (): MarketIndex[] => {
    if (!filter) return [];

    switch (filter) {
      case 'all':
        return indices;
      case 'pending':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return indices.filter(idx =>
          idx.latest_date && new Date(idx.latest_date) < yesterday
        );
      case 'failed':
        return indices.filter(idx => idx.last_download_status === 'failed');
      case 'no-data':
        return indices.filter(idx => !idx.historical_data_available);
      default:
        return [];
    }
  };

  const filteredIndices = getFilteredIndices();

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
        Loading market statistics...
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
          onClick={fetchMarketStats}
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
          title="Total Indices"
          count={stats.totalIndices}
          color="blue"
          onClick={() => setFilter(filter === 'all' ? null : 'all')}
        />
        <StatCard
          title="Download Completed"
          count={stats.downloadCompleted}
          color="green"
        />
        <StatCard
          title="Pending >1 Day"
          count={stats.pendingBeyondOneDay}
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
            See list of market indices and take actions like download or delete data
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
              {filter === 'all' && 'All Market Indices'}
              {filter === 'pending' && 'Pending >1 Day'}
              {filter === 'failed' && 'Failed Downloads'}
              {filter === 'no-data' && 'Indices with No Data'}
              {' '}({filteredIndices.length})
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

          {filteredIndices.length === 0 ? (
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
                No indices found in this category
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {filteredIndices.map(index => (
                <IndexCard
                  key={index.id}
                  index={index}
                  onDownloadHistorical={(idx) => handleDownloadNow(idx.id)}
                  onDownloadEOD={(idx) => handleDownloadNow(idx.id)}
                  onDelete={(idx) => {
                    // eslint-disable-next-line no-restricted-globals
                    if (window.confirm(`Delete all data for ${idx.index_name}?`)) {
                      toastService.info('Delete functionality coming soon');
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
