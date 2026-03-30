// frontend/src/components/nav/EnhancedBookmarkCard.tsx
// UPDATED: Unified view with metrics calculation support

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookmarks } from '../../hooks/useNavData';
import { useMetricsStatus } from '../../hooks/useSchemeMetrics';
import { MetricsStatusBadge } from './MetricsStatusBadge';
import { toastService } from '../../services/toast.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import type { SchemeBookmark } from '../../types/nav.types';

interface EnhancedBookmarkCardProps {
  bookmark: SchemeBookmark;
  onViewNavData?: (bookmark: SchemeBookmark) => void;
  onHistoricalDownload?: (bookmark: SchemeBookmark) => void;
  onDownloadLatest?: (bookmark: SchemeBookmark) => void;
  onCalculateMetrics?: (bookmark: SchemeBookmark) => void;
  onDashboardClick?: (bookmark: SchemeBookmark) => void;
  onManageAliases?: (bookmark: SchemeBookmark) => void;
  onDelete?: (bookmark: SchemeBookmark) => void;
  showActions?: boolean;
  showDeleteButton?: boolean;
  isCalculating?: boolean;
  isAdmin?: boolean;
}

export const EnhancedBookmarkCard: React.FC<EnhancedBookmarkCardProps> = ({
  bookmark,
  onViewNavData,
  onHistoricalDownload,
  onDownloadLatest,
  onCalculateMetrics,
  onDashboardClick,
  onManageAliases,
  onDelete,
  showActions = true,
  showDeleteButton = false,
  isCalculating = false,
  isAdmin = false,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Get metrics status
  const { status: metricsStatus } = useMetricsStatus(bookmark.scheme_id, isCalculating);

  // Safe number conversion for NAV value
  const formatNavValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';

    return numValue.toFixed(4);
  };

  // Calculate NAV Ageing display
  const getNavAgeingDisplay = () => {
    if (!bookmark.latest_nav_date) {
      return 'No NAV data';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestDate = new Date(bookmark.latest_nav_date);
    latestDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) return 'Last NAV: Today';
    if (daysDiff === 1) return 'Last NAV: Yesterday';
    if (daysDiff < 0) return 'Last NAV: Future date'; // Edge case

    return `Last NAV: ${daysDiff} days ago`;
  };

  // Calculate date range display
  const getDateRangeDisplay = () => {
    if (!bookmark.earliest_nav_date && !bookmark.latest_nav_date) {
      return 'No NAV data';
    }
    
    const startDate = bookmark.earliest_nav_date 
      ? new Date(bookmark.earliest_nav_date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      : 'Unknown';
    const endDate = bookmark.latest_nav_date 
      ? new Date(bookmark.latest_nav_date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      : 'Unknown';
    
    return `${startDate} → ${endDate}`;
  };

  // Get status indicator color and message
  const getStatusIndicator = () => {
    const hasNavData = (bookmark.nav_records_count || 0) > 0;
    
    if (!hasNavData) {
      return { 
        color: colors.utility.secondaryText, 
        message: 'No data', 
        icon: '⚪' 
      };
    }
    
    return { 
      color: colors.semantic.success, 
      message: 'Data available', 
      icon: '🟢' 
    };
  };

  const statusIndicator = getStatusIndicator();

  return (
    <div 
      className="enhanced-bookmark-card"
      style={{
        padding: '16px',
        backgroundColor: colors.utility.primaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '100px',
        transition: 'all 0.2s ease',
        gap: '16px',
      }}>
      
      {/* Left Section: Scheme Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Scheme Name with Metrics Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
          flexWrap: 'wrap',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            lineHeight: '1.3',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {bookmark.scheme_name}
          </div>
          
          {/* Metrics Status Badge */}
          <MetricsStatusBadge
            status={metricsStatus}
            compact
            showTooltip
          />
        </div>
        
        {/* Scheme Details */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: colors.utility.secondaryText,
          marginBottom: '6px',
          flexWrap: 'wrap',
        }}>
          <span><strong>Code:</strong> {bookmark.scheme_code}</span>
          <span><strong>AMC:</strong> {bookmark.amc_name}</span>
          {bookmark.scheme_nav_name && (
            <span><strong>NAV Name:</strong> {bookmark.scheme_nav_name}</span>
          )}
          <span style={{ 
            color: statusIndicator.color,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {statusIndicator.icon} {statusIndicator.message}
          </span>
        </div>

        {/* NAV DATA RANGE */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '11px',
          color: colors.utility.secondaryText,
          flexWrap: 'wrap',
        }}>
          <span><strong>Data Range:</strong> {getDateRangeDisplay()}</span>
          <span><strong>NAV Ageing:</strong> {getNavAgeingDisplay()}</span>
          {bookmark.latest_nav_value && (
            <span style={{
              color: colors.brand.primary,
              fontWeight: '600',
              fontFamily: 'monospace'
            }}>
              <strong>Latest NAV:</strong> ₹{formatNavValue(bookmark.latest_nav_value)}
            </span>
          )}
        </div>
      </div>

      {/* Right Section: Controls */}
      {showActions && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}>
          {/* VIEW NAV DATA BUTTON */}
          {onViewNavData && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if ((bookmark.nav_records_count || 0) > 0) {
                  onViewNavData(bookmark);
                }
              }}
              disabled={(bookmark.nav_records_count || 0) === 0}
              title={(bookmark.nav_records_count || 0) === 0
                ? 'No NAV data available. Download historical data first.'
                : `View ${(bookmark.nav_records_count || 0).toLocaleString()} NAV records`}
              style={{
                backgroundColor: 'transparent',
                color: (bookmark.nav_records_count || 0) === 0
                  ? colors.utility.secondaryText
                  : colors.brand.secondary,
                border: `1px solid ${(bookmark.nav_records_count || 0) === 0
                  ? colors.utility.secondaryText + '40'
                  : colors.brand.secondary + '40'}`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: (bookmark.nav_records_count || 0) === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: (bookmark.nav_records_count || 0) === 0 ? 0.5 : 1,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              📊 View Data
            </button>
          )}

          {/* DASHBOARD BUTTON */}
          {onDashboardClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDashboardClick(bookmark);
              }}
              title={`View dashboard for ${bookmark.scheme_name}`}
              style={{
                backgroundColor: 'transparent',
                color: colors.brand.primary,
                border: `1px solid ${colors.brand.primary}40`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              📈 Dashboard
            </button>
          )}

          {/* HISTORICAL DOWNLOAD BUTTON */}
          {onHistoricalDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onHistoricalDownload(bookmark);
              }}
              title={
                (bookmark.nav_records_count || 0) > 0
                  ? `Download additional historical NAV data. Current: ${(bookmark.nav_records_count || 0).toLocaleString()} records`
                  : 'Download complete historical NAV data from MFAPI.in'
              }
              style={{
                backgroundColor: 'transparent',
                color: (bookmark.nav_records_count || 0) > 0
                  ? colors.semantic.success
                  : colors.brand.primary,
                border: `1px solid ${(bookmark.nav_records_count || 0) > 0
                  ? colors.semantic.success + '40'
                  : colors.brand.primary + '40'}`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {(bookmark.nav_records_count || 0) > 0 ? '🔄 Update NAV' : '📥 Download NAV'}
            </button>
          )}

          {/* DOWNLOAD LATEST DATA BUTTON */}
          {onDownloadLatest && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownloadLatest(bookmark);
              }}
              title="Download only the latest NAV data"
              style={{
                backgroundColor: 'transparent',
                color: colors.semantic.info,
                border: `1px solid ${colors.semantic.info}40`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              📥 Latest Data
            </button>
          )}

          {/* CALCULATE METRICS BUTTON */}
          {onCalculateMetrics && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if ((bookmark.nav_records_count || 0) > 0) {
                  onCalculateMetrics(bookmark);
                }
              }}
              disabled={(bookmark.nav_records_count || 0) === 0 || isCalculating}
              title={
                (bookmark.nav_records_count || 0) === 0
                  ? 'No NAV data available. Download NAV data first.'
                  : isCalculating
                  ? 'Calculation in progress...'
                  : metricsStatus === 'available'
                  ? 'Recalculate metrics'
                  : 'Calculate financial metrics'
              }
              style={{
                backgroundColor: 'transparent',
                color: ((bookmark.nav_records_count || 0) === 0 || isCalculating)
                  ? colors.utility.secondaryText
                  : metricsStatus === 'available'
                  ? colors.semantic.warning
                  : colors.brand.primary,
                border: `1px solid ${((bookmark.nav_records_count || 0) === 0 || isCalculating)
                  ? colors.utility.secondaryText + '40'
                  : metricsStatus === 'available'
                  ? colors.semantic.warning + '40'
                  : colors.brand.primary + '40'}`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: ((bookmark.nav_records_count || 0) === 0 || isCalculating)
                  ? 'not-allowed'
                  : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: ((bookmark.nav_records_count || 0) === 0 || isCalculating) ? 0.5 : 1,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {isCalculating ? (
                <>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    border: '2px solid transparent',
                    borderTop: `2px solid ${colors.utility.secondaryText}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  Calculating
                </>
              ) : metricsStatus === 'available' ? (
                '🔄 Recalculate'
              ) : (
                '📊 Calculate'
              )}
            </button>
          )}

          {/* MANAGE ALIASES BUTTON */}
          {onManageAliases && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManageAliases(bookmark);
              }}
              title={`Manage aliases for ${bookmark.scheme_name}`}
              style={{
                backgroundColor: 'transparent',
                color: colors.brand.secondary,
                border: `1px solid ${colors.brand.secondary}40`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              🏷️ Manage Aliases
            </button>
          )}

          {/* DELETE ALL BUTTON */}
          {onDelete && showDeleteButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(bookmark);
              }}
              disabled={(bookmark.nav_records_count || 0) === 0}
              title={
                (bookmark.nav_records_count || 0) === 0
                  ? 'No NAV data to delete'
                  : `Delete all ${(bookmark.nav_records_count || 0).toLocaleString()} NAV records for this scheme`
              }
              style={{
                backgroundColor: 'transparent',
                color: (bookmark.nav_records_count || 0) === 0
                  ? colors.utility.secondaryText
                  : colors.semantic.error,
                border: `1px solid ${(bookmark.nav_records_count || 0) === 0
                  ? colors.utility.secondaryText + '40'
                  : colors.semantic.error + '40'}`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: (bookmark.nav_records_count || 0) === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: (bookmark.nav_records_count || 0) === 0 ? 0.5 : 1,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              🗑️ Delete All
            </button>
          )}
        </div>
      )}

      {/* CSS for hover effects */}
      <style>{`
        .enhanced-bookmark-card {
          position: relative;
        }
        
        .enhanced-bookmark-card:hover {
          border-color: ${colors.brand.primary}30 !important;
          box-shadow: 0 2px 8px ${colors.brand.primary}10;
          transform: translateY(-1px);
        }
        
        .enhanced-bookmark-card button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          filter: brightness(1.05);
        }
        
        .enhanced-bookmark-card button:active:not(:disabled) {
          transform: translateY(0);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};