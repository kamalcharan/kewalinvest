// frontend/src/components/market/IndexCard.tsx
// Elegant index card for Market Data

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Database, Calendar, Clock, CheckSquare, Square, BarChart2, Download, RefreshCw, Trash2 } from 'lucide-react';
import type { MarketIndex } from '../../types/market.types';

interface IndexCardProps {
  index: MarketIndex;
  onDownloadHistorical: (index: MarketIndex) => void;
  onDownloadEOD: (index: MarketIndex) => void;
  onViewDashboard?: (index: MarketIndex) => void;
  onCalculateMetrics?: (index: MarketIndex) => void;
  onDelete?: (index: MarketIndex) => void;
  showDeleteButton?: boolean;
  isDownloading?: boolean;
  isCalculating?: boolean;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
}

const IndexCard: React.FC<IndexCardProps> = ({
  index,
  onDownloadHistorical,
  onDownloadEOD,
  onViewDashboard,
  onCalculateMetrics,
  onDelete,
  showDeleteButton = false,
  isDownloading = false,
  isCalculating = false,
  isSelected = false,
  onSelect
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  // Get aging days
  const getAgingDays = (): number => {
    if (!index.latest_date) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const latestDate = new Date(index.latest_date);
    latestDate.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const agingDays = getAgingDays();
  const hasData = index.historical_data_available && index.total_records > 0;

  // Status config
  const getStatus = () => {
    if (isDownloading) return { label: 'Downloading', color: colors.brand.primary, bg: colors.brand.primary + '15' };
    if (hasData) return { label: 'Ready', color: '#10B981', bg: '#10B98115' };
    if (index.last_download_status === 'failed') return { label: 'Failed', color: '#EF4444', bg: '#EF444415' };
    return { label: 'No Data', color: colors.utility.secondaryText, bg: colors.utility.secondaryText + '15' };
  };

  const status = getStatus();

  // Check if provider is enabled
  const isProviderEnabled = index.provider_enabled !== false;

  // Category color
  const getCategoryColor = () => {
    switch (index.category) {
      case 'broad': return colors.brand.primary;
      case 'sectoral': return '#8B5CF6';
      case 'thematic': return '#06B6D4';
      default: return colors.utility.secondaryText;
    }
  };

  const categoryColor = getCategoryColor();

  // Button style helper
  const btnStyle = (color: string, disabled: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500' as const,
    color: disabled ? colors.utility.secondaryText : color,
    backgroundColor: 'transparent',
    border: `1px solid ${disabled ? colors.utility.secondaryText + '30' : color + '40'}`,
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease'
  });

  return (
    <div style={{
      backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
      borderRadius: '12px',
      border: `1px solid ${isSelected ? colors.brand.primary : (isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0')}`,
      boxShadow: isSelected ? `0 0 0 2px ${colors.brand.primary}30` : (isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'),
      padding: '16px 20px',
      transition: 'all 0.15s ease',
      opacity: isDownloading ? 0.85 : 1
    }}>
      {/* Top Row: Checkbox + Name + Status */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '12px'
      }}>
        {/* Checkbox - only show for enabled providers */}
        {onSelect && isProviderEnabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(index.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              marginTop: '2px',
              display: 'flex',
              flexShrink: 0
            }}
          >
            {isSelected ? (
              <CheckSquare size={20} style={{ color: colors.brand.primary }} />
            ) : (
              <Square size={20} style={{ color: colors.utility.secondaryText }} />
            )}
          </button>
        )}

        {/* Name & Code */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '15px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {index.index_name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              fontFamily: 'monospace'
            }}>
              {index.yahoo_symbol}
            </span>
            <span style={{
              padding: '2px 8px',
              backgroundColor: categoryColor + '15',
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

        {/* Not Enabled Tag */}
        {!isProviderEnabled && (
          <div style={{
            padding: '4px 10px',
            backgroundColor: '#F59E0B15',
            color: '#F59E0B',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            flexShrink: 0
          }}>
            Not Enabled
          </div>
        )}

        {/* Status Badge */}
        <div style={{
          padding: '4px 10px',
          backgroundColor: status.bg,
          color: status.color,
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600',
          flexShrink: 0
        }}>
          {status.label}
        </div>
      </div>

      {/* Data Metrics Row */}
      {hasData ? (
        <div style={{
          display: 'flex',
          gap: '24px',
          padding: '12px 16px',
          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
          borderRadius: '8px',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={14} style={{ color: colors.brand.primary }} />
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
              <strong style={{ color: colors.utility.primaryText }}>{index.total_records.toLocaleString()}</strong> records
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} style={{ color: '#8B5CF6' }} />
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
              {formatDate(index.earliest_date)} - {formatDate(index.latest_date)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={14} style={{ color: agingDays > 7 ? '#F59E0B' : '#10B981' }} />
            <span style={{
              fontSize: '13px',
              color: agingDays > 7 ? '#F59E0B' : colors.utility.secondaryText
            }}>
              {agingDays === 0 ? 'Today' : agingDays === 1 ? 'Yesterday' : `${agingDays} days old`}
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '12px 16px',
          backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
          borderRadius: '8px',
          marginBottom: '12px',
          textAlign: 'center',
          fontSize: '13px',
          color: colors.utility.secondaryText
        }}>
          No historical data available - download to get started
        </div>
      )}

      {/* Actions Row */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        {onViewDashboard && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewDashboard(index); }}
            disabled={!isProviderEnabled || !hasData || isDownloading}
            style={btnStyle(colors.brand.primary, !isProviderEnabled || !hasData || isDownloading)}
          >
            <BarChart2 size={14} />
            Dashboard
          </button>
        )}

        {onCalculateMetrics && (
          <button
            onClick={(e) => { e.stopPropagation(); onCalculateMetrics(index); }}
            disabled={!isProviderEnabled || !hasData || isDownloading || isCalculating}
            style={btnStyle('#10B981', !isProviderEnabled || !hasData || isDownloading || isCalculating)}
          >
            {isCalculating ? <RefreshCw size={14} className="animate-spin" /> : <BarChart2 size={14} />}
            {isCalculating ? 'Calculating...' : 'Metrics'}
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onDownloadHistorical(index); }}
          disabled={!isProviderEnabled || isDownloading}
          style={btnStyle(hasData ? '#8B5CF6' : colors.brand.primary, !isProviderEnabled || isDownloading)}
        >
          <Download size={14} />
          {hasData ? 'More Data' : 'Download'}
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onDownloadEOD(index); }}
          disabled={!isProviderEnabled || isDownloading}
          style={btnStyle('#06B6D4', !isProviderEnabled || isDownloading)}
        >
          <RefreshCw size={14} />
          EOD
        </button>

        {showDeleteButton && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(index); }}
            disabled={!isProviderEnabled || isDownloading || !hasData}
            style={btnStyle('#EF4444', !isProviderEnabled || isDownloading || !hasData)}
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default IndexCard;
