// frontend/src/pages/cruiseControl/MarketTab.tsx
// Market Downloads Tab with table view - uses shared components

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle, Download, Calculator, RefreshCw } from 'lucide-react';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import toastService from '../../services/toast.service';
import { StatCard } from '../../components/cruiseControl/shared/StatCard';
import { StatusBadge } from '../../components/cruiseControl/shared/StatusBadge';

interface IndexStatus {
  id: number;
  index_name: string;
  index_code: string;
  category: string;
  provider_enabled: boolean;
  provider_symbol: string | null;
  download_status: 'success' | 'failed' | 'pending' | 'not_configured';
  last_download_at: string | null;
  last_download_error: string | null;
  earliest_date: string | null;
  latest_date: string | null;
  total_records: number;
  metrics_status: 'calculated' | 'pending' | 'partial';
  metrics_calculated_count: number;
  metrics_pending_count: number;
  last_metrics_calculated_at: string | null;
  has_gaps: boolean;
  gap_count: number;
  gaps: Array<{ start_date: string; end_date: string; missing_days: number }>;
}

interface Statistics {
  total_indices: number;
  download_success_today: number;
  download_failed_today: number;
  download_pending: number;
  metrics_calculated: number;
  metrics_pending: number;
  indices_with_gaps: number;
}

interface DetailedStatusResponse {
  statistics: Statistics;
  indices: IndexStatus[];
}

export const MarketTab: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const dividerColor = `${colors.utility.secondaryText}20`; // Use secondaryText with low opacity as divider

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetailedStatusResponse | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const [expandedGaps, setExpandedGaps] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    fetchDetailedStatus();
  }, []);

  const fetchDetailedStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get(API_ENDPOINTS.CRUISE_CONTROL.MARKET_DETAILED_STATUS) as any;

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load market status');
      }
    } catch (err: any) {
      console.error('Error fetching market status:', err);
      setError('Failed to load market status');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadEOD = async (indexId: number, indexName: string) => {
    const key = `download_${indexId}`;
    try {
      setActionLoading(prev => ({ ...prev, [key]: true }));

      const response = await apiService.post(
        API_ENDPOINTS.CRUISE_CONTROL.MARKET_DOWNLOAD_EOD,
        { index_id: indexId }
      ) as any;

      if (response.success) {
        toastService.success(`EOD download triggered for ${indexName}`);
        // Refresh data after action
        await fetchDetailedStatus();
      } else {
        toastService.error(response.error || 'Failed to trigger download');
      }
    } catch (err: any) {
      console.error('Error triggering download:', err);
      toastService.error('Failed to trigger download');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleCalculateMetrics = async (indexId: number, indexName: string) => {
    const key = `metrics_${indexId}`;
    try {
      setActionLoading(prev => ({ ...prev, [key]: true }));

      const response = await apiService.post(
        API_ENDPOINTS.MARKET_ANALYSIS.CALCULATE_METRICS(indexId),
        { recalculate: false }
      ) as any;

      if (response.success) {
        toastService.success(`Metrics calculation triggered for ${indexName}`);
        // Refresh data after action
        await fetchDetailedStatus();
      } else {
        toastService.error(response.error || 'Failed to calculate metrics');
      }
    } catch (err: any) {
      console.error('Error calculating metrics:', err);
      toastService.error('Failed to calculate metrics');
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleGaps = (indexId: number) => {
    setExpandedGaps(prev => ({
      ...prev,
      [indexId]: !prev[indexId]
    }));
  };

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
        Loading market status...
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
          onClick={fetchDetailedStatus}
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

  if (!data) {
    return null;
  }

  const { statistics, indices } = data;

  return (
    <div>
      {/* Header with Refresh Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          margin: 0
        }}>
          Market Index Status
        </h3>
        <button
          onClick={fetchDetailedStatus}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: colors.brand.primary,
            color: '#FFF',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <StatCard
          title="Total Indices"
          count={statistics.total_indices}
          color="blue"
          icon={<Download size={18} />}
        />
        <StatCard
          title="Download Success"
          count={statistics.download_success_today}
          color="green"
          icon={<CheckCircle size={18} />}
        />
        <StatCard
          title="Download Failed"
          count={statistics.download_failed_today}
          color="red"
          icon={<XCircle size={18} />}
        />
        <StatCard
          title="Metrics Calculated"
          count={statistics.metrics_calculated}
          color="purple"
          icon={<Calculator size={18} />}
        />
        <StatCard
          title="Metrics Pending"
          count={statistics.metrics_pending}
          color="yellow"
          icon={<Clock size={18} />}
        />
        <StatCard
          title="Indices with Gaps"
          count={statistics.indices_with_gaps}
          color="red"
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* Table View */}
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '10px',
        border: `1px solid ${dividerColor}`,
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: colors.utility.secondaryBackground }}>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                borderBottom: `1px solid ${dividerColor}`
              }}>
                Index
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                borderBottom: `1px solid ${dividerColor}`
              }}>
                Download Status
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                borderBottom: `1px solid ${dividerColor}`
              }}>
                Metrics Status
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                borderBottom: `1px solid ${dividerColor}`
              }}>
                Data Gaps
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                borderBottom: `1px solid ${dividerColor}`
              }}>
                Data Range
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                borderBottom: `1px solid ${dividerColor}`
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {indices.map((index, i) => (
              <React.Fragment key={index.id}>
                <tr style={{
                  backgroundColor: i % 2 === 0 ? 'transparent' : colors.utility.secondaryBackground + '50'
                }}>
                  <td style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    <div style={{ fontWeight: '500', color: colors.utility.primaryText }}>
                      {index.index_name}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                      {index.index_code} • {index.category}
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    <StatusBadge status={index.download_status} type="download" />
                    {index.last_download_at && (
                      <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                        {new Date(index.last_download_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    <StatusBadge
                      status={!index.provider_enabled ? 'not_configured' : index.metrics_status}
                      type="metrics"
                    />
                    {index.provider_enabled && (
                      <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                        {index.metrics_calculated_count}/{index.total_records}
                      </div>
                    )}
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    <div
                      onClick={() => index.has_gaps && toggleGaps(index.id)}
                      style={{ cursor: index.has_gaps ? 'pointer' : 'default' }}
                    >
                      <StatusBadge status="" type="gaps" gapCount={index.gap_count} />
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    {index.earliest_date && index.latest_date ? (
                      <div style={{ fontSize: '12px', color: colors.utility.primaryText }}>
                        {new Date(index.earliest_date).toLocaleDateString()} - {new Date(index.latest_date).toLocaleDateString()}
                        <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
                          {index.total_records} records
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: colors.utility.secondaryText }}>No data</span>
                    )}
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleDownloadEOD(index.id, index.index_name)}
                        disabled={actionLoading[`download_${index.id}`] || !index.provider_enabled}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: index.provider_enabled ? colors.brand.primary : colors.utility.secondaryBackground,
                          color: index.provider_enabled ? '#FFF' : colors.utility.secondaryText,
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          cursor: index.provider_enabled ? 'pointer' : 'not-allowed',
                          opacity: actionLoading[`download_${index.id}`] ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={index.provider_enabled ? 'Download EOD' : 'Provider not configured'}
                      >
                        {actionLoading[`download_${index.id}`] ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        EOD
                      </button>
                      <button
                        onClick={() => handleCalculateMetrics(index.id, index.index_name)}
                        disabled={actionLoading[`metrics_${index.id}`] || index.total_records === 0}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: index.total_records > 0 ? '#9333EA' : colors.utility.secondaryBackground,
                          color: index.total_records > 0 ? '#FFF' : colors.utility.secondaryText,
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          cursor: index.total_records > 0 ? 'pointer' : 'not-allowed',
                          opacity: actionLoading[`metrics_${index.id}`] ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={index.total_records > 0 ? 'Calculate Metrics' : 'No data available'}
                      >
                        {actionLoading[`metrics_${index.id}`] ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Calculator size={12} />
                        )}
                        Calc
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Gap Details Row */}
                {expandedGaps[index.id] && index.gaps.length > 0 && (
                  <tr>
                    <td colSpan={6} style={{
                      padding: '12px 16px',
                      backgroundColor: `${colors.semantic.error}08`,
                      borderBottom: `1px solid ${dividerColor}`
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: colors.semantic.error, marginBottom: '8px' }}>
                        Data Gaps Detected:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {index.gaps.map((gap, gapIdx) => (
                          <div
                            key={gapIdx}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: colors.utility.primaryBackground,
                              borderRadius: '4px',
                              border: `1px solid ${colors.semantic.error}30`,
                              fontSize: '11px',
                              color: colors.utility.primaryText
                            }}
                          >
                            <span style={{ fontWeight: '500' }}>
                              {new Date(gap.start_date).toLocaleDateString()} - {new Date(gap.end_date).toLocaleDateString()}
                            </span>
                            <span style={{ color: colors.utility.secondaryText, marginLeft: '6px' }}>
                              ({gap.missing_days} day{gap.missing_days > 1 ? 's' : ''})
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {indices.length === 0 && (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            No market indices found
          </div>
        )}
      </div>
    </div>
  );
};
