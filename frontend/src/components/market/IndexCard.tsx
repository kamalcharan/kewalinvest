// frontend/src/components/market/IndexCard.tsx
// Individual index card with actions for Market Data

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Calendar, TrendingUp, Database } from 'lucide-react';
import type { MarketIndex } from '../../types/market.types';

interface IndexCardProps {
  index: MarketIndex;
  onDownloadHistorical: (index: MarketIndex) => void;
  onDownloadEOD: (index: MarketIndex) => void;
  onViewDashboard?: (index: MarketIndex) => void;
  onDelete?: (index: MarketIndex) => void;
  showDeleteButton?: boolean;
  isDownloading?: boolean;
}

const IndexCard: React.FC<IndexCardProps> = ({
  index,
  onDownloadHistorical,
  onDownloadEOD,
  onViewDashboard,
  onDelete,
  showDeleteButton = false,
  isDownloading = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Get status indicator
  const getStatusIndicator = () => {
    if (isDownloading) {
      return {
        color: colors.brand.primary,
        message: 'Downloading...',
        icon: '🔄',
        bgColor: colors.brand.primary + '10'
      };
    }

    if (index.historical_data_available && index.total_records > 0) {
      return {
        color: colors.semantic.success,
        message: 'Downloaded',
        icon: '✅',
        bgColor: colors.semantic.success + '10'
      };
    }

    if (index.last_download_status === 'failed') {
      return {
        color: colors.semantic.error,
        message: 'Failed',
        icon: '❌',
        bgColor: colors.semantic.error + '10'
      };
    }

    return {
      color: colors.utility.secondaryText,
      message: 'Pending',
      icon: '⏳',
      bgColor: colors.utility.secondaryText + '10'
    };
  };

  const status = getStatusIndicator();

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Get date range display
  const getDateRangeDisplay = (): string => {
    if (!index.earliest_date && !index.latest_date) {
      return 'No data available';
    }

    const start = formatDate(index.earliest_date);
    const end = formatDate(index.latest_date);

    if (start === 'N/A' && end === 'N/A') {
      return 'No data available';
    }

    return `${start} → ${end}`;
  };

  // Get data ageing display
  const getDataAgeingDisplay = (): string => {
    if (!index.latest_date) {
      return 'No data';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestDate = new Date(index.latest_date);
    latestDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 'Last Data: Today';
    if (daysDiff === 1) return 'Last Data: Yesterday';
    if (daysDiff < 0) return 'Last Data: Future date';

    return `Last Data: ${daysDiff} days ago`;
  };

  // Get ageing in days (for warnings)
  const getAgingDays = (): number => {
    if (!index.latest_date) return 999;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestDate = new Date(index.latest_date);
    latestDate.setHours(0, 0, 0, 0);

    return Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get category badge color
  const getCategoryColor = () => {
    switch (index.category) {
      case 'broad':
        return colors.brand.primary;
      case 'sectoral':
        return colors.brand.secondary;
      case 'thematic':
        return colors.semantic.info;
      default:
        return colors.utility.secondaryText;
    }
  };

  const categoryColor = getCategoryColor();

  return (
    <div
      className="index-card"
      style={{
        padding: '16px',
        backgroundColor: colors.utility.primaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderRadius: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        transition: 'all 0.2s ease',
        opacity: isDownloading ? 0.7 : 1,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Loading overlay */}
      {isDownloading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            backgroundColor: colors.brand.primary,
            animation: 'progress 2s ease-in-out infinite'
          }}
        />
      )}

      {/* Left Section: Index Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Index Name & Status */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '8px',
          gap: '12px'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: '0 0 4px 0',
              lineHeight: '1.3',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {index.index_name}
            </h3>

            {/* Code & Category */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              <span style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                fontWeight: '500',
                fontFamily: 'monospace'
              }}>
                {index.yahoo_symbol}
              </span>
              <span style={{
                padding: '2px 8px',
                backgroundColor: categoryColor + '10',
                color: categoryColor,
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {index.category}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: status.bgColor,
              color: status.color,
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <span>{status.icon}</span>
            <span>{status.message}</span>
          </div>
        </div>

        {/* Data Statistics */}
        {index.historical_data_available && index.total_records > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginTop: '12px',
            padding: '12px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '6px',
            border: `1px solid ${colors.utility.primaryText}05`
          }}>
            {/* Record Count */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: colors.brand.primary + '10',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Database size={16} color={colors.brand.primary} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: colors.utility.primaryText,
                  lineHeight: '1'
                }}>
                  {index.total_records.toLocaleString()}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginTop: '2px'
                }}>
                  Records
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: colors.semantic.info + '10',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Calendar size={16} color={colors.semantic.info} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  lineHeight: '1.3',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {getDateRangeDisplay()}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginTop: '2px'
                }}>
                  Data Range
                </div>
              </div>
            </div>

            {/* Data Ageing */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: getAgingDays() > 7
                  ? colors.semantic.warning + '10'
                  : getAgingDays() > 3
                  ? colors.semantic.info + '10'
                  : colors.semantic.success + '10',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <TrendingUp size={16} color={
                  getAgingDays() > 7
                    ? colors.semantic.warning
                    : getAgingDays() > 3
                    ? colors.semantic.info
                    : colors.semantic.success
                } />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  lineHeight: '1.3'
                }}>
                  {getDataAgeingDisplay()}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginTop: '2px'
                }}>
                  Data Ageing
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '6px',
            border: `1px dashed ${colors.utility.primaryText}20`,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              fontWeight: '500'
            }}>
              📭 No historical data available
            </div>
            {index.last_download_status === 'failed' && index.last_download_error && (
              <div style={{
                fontSize: '11px',
                color: colors.semantic.error,
                marginTop: '4px'
              }}>
                Error: {index.last_download_error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Section: Action Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0
      }}>
        {/* Dashboard Button */}
        {onViewDashboard && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDashboard(index);
            }}
            disabled={!index.historical_data_available || isDownloading}
            title={
              !index.historical_data_available
                ? 'No data available. Download data first.'
                : 'View market analysis dashboard'
            }
            style={{
              backgroundColor: 'transparent',
              color: (!index.historical_data_available || isDownloading)
                ? colors.utility.secondaryText
                : colors.brand.primary,
              border: `1px solid ${(!index.historical_data_available || isDownloading)
                ? colors.utility.secondaryText + '40'
                : colors.brand.primary + '40'}`,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              cursor: (!index.historical_data_available || isDownloading) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: (!index.historical_data_available || isDownloading) ? 0.5 : 1,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            📊 Dashboard
          </button>
        )}

        {/* Download More Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownloadHistorical(index);
          }}
          disabled={isDownloading}
          title={
            index.historical_data_available
              ? `Download additional data. Current: ${index.total_records.toLocaleString()} records`
              : 'Download 20 years of historical data'
          }
          style={{
            backgroundColor: 'transparent',
            color: isDownloading
              ? colors.utility.secondaryText
              : index.historical_data_available
              ? colors.semantic.success
              : colors.brand.primary,
            border: `1px solid ${isDownloading
              ? colors.utility.secondaryText + '40'
              : index.historical_data_available
              ? colors.semantic.success + '40'
              : colors.brand.primary + '40'}`,
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: isDownloading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: isDownloading ? 0.5 : 1,
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          {index.historical_data_available ? '📥 Download More' : '📥 Download History'}
        </button>

        {/* Download EOD Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownloadEOD(index);
          }}
          disabled={isDownloading}
          title={
            getAgingDays() > 7
              ? `⚠️ Data is ${getAgingDays()} days old. Use 'Download More' to fill gap first.`
              : 'Download latest End of Day data'
          }
          style={{
            backgroundColor: 'transparent',
            color: isDownloading
              ? colors.utility.secondaryText
              : getAgingDays() > 7
              ? colors.semantic.warning
              : colors.brand.secondary,
            border: `1px solid ${isDownloading
              ? colors.utility.secondaryText + '40'
              : getAgingDays() > 7
              ? colors.semantic.warning + '40'
              : colors.brand.secondary + '40'}`,
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: isDownloading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: isDownloading ? 0.5 : 1,
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
        >
          🔄 Download EOD
        </button>

        {/* Delete All Button - Admin Only */}
        {showDeleteButton && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(index);
            }}
            disabled={isDownloading || !index.historical_data_available}
            title={
              !index.historical_data_available
                ? 'No data to delete'
                : `Delete all ${index.total_records.toLocaleString()} records`
            }
            style={{
              backgroundColor: 'transparent',
              color: (!index.historical_data_available || isDownloading)
                ? colors.utility.secondaryText
                : colors.semantic.error,
              border: `1px solid ${(!index.historical_data_available || isDownloading)
                ? colors.utility.secondaryText + '40'
                : colors.semantic.error + '40'}`,
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              cursor: (!index.historical_data_available || isDownloading)
                ? 'not-allowed'
                : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: (!index.historical_data_available || isDownloading) ? 0.5 : 1,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            🗑️ Delete All
          </button>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        .index-card:hover {
          border-color: ${status.color}30 !important;
          box-shadow: 0 2px 12px ${status.color}10;
          transform: translateY(-1px);
        }

        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
};

export default IndexCard;