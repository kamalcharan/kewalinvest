// frontend/src/pages/cruiseControl/MarketTab.tsx
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import IndexCard from '../../components/market/IndexCard';
import { DefaultIndexSettings } from '../../components/performance/DefaultIndexSettings';
import type { MarketIndex } from '../../types/market.types';

// Dummy market index data
const DUMMY_INDICES: MarketIndex[] = [
  {
    id: 1,
    index_code: 'NIFTY50',
    index_name: 'NIFTY 50',
    yahoo_symbol: '^NSEI',
    category: 'broad',
    description: 'India\'s leading benchmark index representing the weighted average of 50 largest and most liquid stocks',
    is_active: true,
    priority: 1,
    total_records: 5234,
    earliest_date: '2005-01-01',
    latest_date: '2025-01-23',
    last_download_status: 'success',
    last_download_at: '2025-01-23T10:00:00Z',
    last_download_error: null,
    historical_data_available: true,
    next_eod_retry_at: null,
    eod_retry_count: 0,
    last_successful_eod_download_at: '2025-01-23T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-01-23T10:00:00Z'
  },
  {
    id: 2,
    index_code: 'BANKNIFTY',
    index_name: 'NIFTY Bank',
    yahoo_symbol: '^NSEBANK',
    category: 'sectoral',
    description: 'Represents the 12 most liquid and large capitalized Indian banking stocks',
    is_active: true,
    priority: 2,
    total_records: 4521,
    earliest_date: '2006-06-01',
    latest_date: '2025-01-23',
    last_download_status: 'success',
    last_download_at: '2025-01-23T10:00:00Z',
    last_download_error: null,
    historical_data_available: true,
    next_eod_retry_at: null,
    eod_retry_count: 0,
    last_successful_eod_download_at: '2025-01-23T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-01-23T10:00:00Z'
  },
  {
    id: 3,
    index_code: 'SENSEX',
    index_name: 'BSE SENSEX',
    yahoo_symbol: '^BSESN',
    category: 'broad',
    description: 'Bombay Stock Exchange Sensitive Index - oldest market index in India',
    is_active: true,
    priority: 3,
    total_records: 3245,
    earliest_date: '2008-01-01',
    latest_date: '2025-01-21',
    last_download_status: 'success',
    last_download_at: '2025-01-21T18:30:00Z',
    last_download_error: null,
    historical_data_available: true,
    next_eod_retry_at: null,
    eod_retry_count: 0,
    last_successful_eod_download_at: '2025-01-21T18:30:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-01-21T18:30:00Z'
  },
  {
    id: 4,
    index_code: 'NIFTYIT',
    index_name: 'NIFTY IT',
    yahoo_symbol: '^CNXIT',
    category: 'sectoral',
    description: 'Represents the IT sector stocks',
    is_active: true,
    priority: 4,
    total_records: 2134,
    earliest_date: '2010-01-01',
    latest_date: '2025-01-20',
    last_download_status: 'success',
    last_download_at: '2025-01-20T18:30:00Z',
    last_download_error: null,
    historical_data_available: true,
    next_eod_retry_at: null,
    eod_retry_count: 0,
    last_successful_eod_download_at: '2025-01-20T18:30:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-01-20T18:30:00Z'
  },
  {
    id: 5,
    index_code: 'NIFTYEV',
    index_name: 'NIFTY EV & New Age Automotive',
    yahoo_symbol: '^CNXAUTO',
    category: 'thematic',
    description: 'Electric Vehicles and New Age Automotive theme',
    is_active: true,
    priority: 5,
    total_records: 0,
    earliest_date: null,
    latest_date: null,
    last_download_status: null,
    last_download_at: null,
    last_download_error: null,
    historical_data_available: false,
    next_eod_retry_at: null,
    eod_retry_count: 0,
    last_successful_eod_download_at: null,
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z'
  },
  {
    id: 6,
    index_code: 'NIFTYPHARMA',
    index_name: 'NIFTY Pharma',
    yahoo_symbol: '^CNXPHARMA',
    category: 'sectoral',
    description: 'Pharmaceutical sector index',
    is_active: true,
    priority: 6,
    total_records: 1845,
    earliest_date: '2011-01-01',
    latest_date: '2025-01-18',
    last_download_status: 'failed',
    last_download_at: '2025-01-18T18:30:00Z',
    last_download_error: 'API rate limit exceeded',
    historical_data_available: true,
    next_eod_retry_at: '2025-01-24T18:30:00Z',
    eod_retry_count: 3,
    last_successful_eod_download_at: '2025-01-17T18:30:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2025-01-18T18:30:00Z'
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

export const MarketTab: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [filter, setFilter] = useState<'all' | 'pending' | 'failed' | 'no-data' | null>(null);

  // Dummy stats
  const stats = {
    totalIndices: 12,
    downloadCompleted: 10,
    pendingBeyondOneDay: 0,
    failedDownloads: 2,
    metricsPending: 3
  };

  // Filter indices based on selected filter
  const getFilteredIndices = (): MarketIndex[] => {
    if (!filter) return [];

    switch (filter) {
      case 'all':
        return DUMMY_INDICES;
      case 'pending':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return DUMMY_INDICES.filter(idx =>
          idx.latest_date && new Date(idx.latest_date) < yesterday
        );
      case 'failed':
        return DUMMY_INDICES.filter(idx => idx.last_download_status === 'failed');
      case 'no-data':
        return DUMMY_INDICES.filter(idx => !idx.historical_data_available);
      default:
        return [];
    }
  };

  const filteredIndices = getFilteredIndices();

  return (
    <div>
      {/* Default Index Settings */}
      <DefaultIndexSettings />

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
                  onDownloadHistorical={(idx) => alert(`Download historical for: ${idx.index_name}`)}
                  onDownloadEOD={(idx) => alert(`Download EOD for: ${idx.index_name}`)}
                  onDelete={(idx) => {
                    // eslint-disable-next-line no-restricted-globals
                    if (window.confirm(`Delete all data for ${idx.index_name}?`)) {
                      alert(`Deleted ${idx.total_records} records`);
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
