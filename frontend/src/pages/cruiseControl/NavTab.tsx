// frontend/src/pages/cruiseControl/NavTab.tsx
// NAV Downloads Tab with table view - consistent with Market Downloads

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle, Download, Calculator, RefreshCw } from 'lucide-react';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import toastService from '../../services/toast.service';
import { StatCard } from '../../components/cruiseControl/shared/StatCard';
import { StatusBadge } from '../../components/cruiseControl/shared/StatusBadge';

interface SchemeStatus {
  id: number;
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string | null;
  category: string | null;
  daily_download_enabled: boolean;
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
  total_schemes: number;
  download_success_today: number;
  download_failed_today: number;
  download_pending: number;
  metrics_calculated: number;
  metrics_pending: number;
  schemes_with_gaps: number;
}

interface DetailedStatusResponse {
  statistics: Statistics;
  schemes: SchemeStatus[];
}

export const NavTab: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const dividerColor = `${colors.utility.secondaryText}20`;

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

      const response = await apiService.get(API_ENDPOINTS.CRUISE_CONTROL.NAV_DETAILED_STATUS) as any;

      if (response.success && response.data) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to load NAV status');
      }
    } catch (err: any) {
      console.error('Error fetching NAV status:', err);
      setError('Failed to load NAV status');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadNAV = async (schemeCode: string, schemeName: string) => {
    const key = `download_${schemeCode}`;
    try {
      setActionLoading(prev => ({ ...prev, [key]: true }));

      const response = await apiService.post(
        API_ENDPOINTS.NAV.DOWNLOAD_SCHEME(schemeCode)
      ) as any;

      if (response.success) {
        toastService.success(`NAV download triggered for ${schemeName}`);
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

  const handleCalculateMetrics = async (schemeId: number, schemeName: string) => {
    const key = `metrics_${schemeId}`;
    try {
      setActionLoading(prev => ({ ...prev, [key]: true }));

      const response = await apiService.post(
        API_ENDPOINTS.SCHEME_ANALYSIS.CALCULATE_METRICS(schemeId),
        { recalculate: false }
      ) as any;

      if (response.success) {
        toastService.success(`Metrics calculation triggered for ${schemeName}`);
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

  const toggleGaps = (schemeId: number) => {
    setExpandedGaps(prev => ({
      ...prev,
      [schemeId]: !prev[schemeId]
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
        Loading NAV status...
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

  const { statistics, schemes } = data;

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
          NAV Scheme Status
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
          title="Total Schemes"
          count={statistics.total_schemes}
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
          title="Schemes with Gaps"
          count={statistics.schemes_with_gaps}
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
                Scheme
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
            {schemes.map((scheme, i) => (
              <React.Fragment key={scheme.id}>
                <tr style={{
                  backgroundColor: i % 2 === 0 ? 'transparent' : colors.utility.secondaryBackground + '50'
                }}>
                  <td style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    <div style={{ fontWeight: '500', color: colors.utility.primaryText }}>
                      {scheme.scheme_name}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                      {scheme.scheme_code} {scheme.category && `• ${scheme.category}`}
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    <StatusBadge status={scheme.download_status} type="download" />
                    {scheme.last_download_at && (
                      <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                        {new Date(scheme.last_download_at).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    <StatusBadge
                      status={!scheme.daily_download_enabled ? 'not_configured' : scheme.metrics_status}
                      type="metrics"
                    />
                    {scheme.daily_download_enabled && (
                      <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                        {scheme.metrics_calculated_count}/{scheme.total_records}
                      </div>
                    )}
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    <div
                      onClick={() => scheme.has_gaps && toggleGaps(scheme.scheme_id)}
                      style={{ cursor: scheme.has_gaps ? 'pointer' : 'default' }}
                    >
                      <StatusBadge status="" type="gaps" gapCount={scheme.gap_count} />
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${dividerColor}`
                  }}>
                    {scheme.earliest_date && scheme.latest_date ? (
                      <div style={{ fontSize: '12px', color: colors.utility.primaryText }}>
                        {new Date(scheme.earliest_date).toLocaleDateString()} - {new Date(scheme.latest_date).toLocaleDateString()}
                        <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
                          {scheme.total_records} records
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
                        onClick={() => handleDownloadNAV(scheme.scheme_code, scheme.scheme_name)}
                        disabled={actionLoading[`download_${scheme.scheme_code}`] || !scheme.daily_download_enabled}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: scheme.daily_download_enabled ? colors.brand.primary : colors.utility.secondaryBackground,
                          color: scheme.daily_download_enabled ? '#FFF' : colors.utility.secondaryText,
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          cursor: scheme.daily_download_enabled ? 'pointer' : 'not-allowed',
                          opacity: actionLoading[`download_${scheme.scheme_code}`] ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={scheme.daily_download_enabled ? 'Download NAV' : 'Daily download not enabled'}
                      >
                        {actionLoading[`download_${scheme.scheme_code}`] ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Download size={12} />
                        )}
                        NAV
                      </button>
                      <button
                        onClick={() => handleCalculateMetrics(scheme.scheme_id, scheme.scheme_name)}
                        disabled={actionLoading[`metrics_${scheme.scheme_id}`] || scheme.total_records === 0}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: scheme.total_records > 0 ? '#9333EA' : colors.utility.secondaryBackground,
                          color: scheme.total_records > 0 ? '#FFF' : colors.utility.secondaryText,
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          cursor: scheme.total_records > 0 ? 'pointer' : 'not-allowed',
                          opacity: actionLoading[`metrics_${scheme.scheme_id}`] ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={scheme.total_records > 0 ? 'Calculate Metrics' : 'No data available'}
                      >
                        {actionLoading[`metrics_${scheme.scheme_id}`] ? (
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
                {expandedGaps[scheme.scheme_id] && scheme.gaps.length > 0 && (
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
                        {scheme.gaps.map((gap, gapIdx) => (
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

        {schemes.length === 0 && (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            No bookmarked schemes found
          </div>
        )}
      </div>
    </div>
  );
};
