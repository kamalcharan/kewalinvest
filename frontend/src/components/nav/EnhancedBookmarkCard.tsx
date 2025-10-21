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
  onToggleDaily?: (bookmarkId: number, enabled: boolean) => void;
  onViewNavData?: (bookmark: SchemeBookmark) => void;
  onHistoricalDownload?: (bookmark: SchemeBookmark) => void;
  onCalculateMetrics?: (bookmark: SchemeBookmark) => void;
  onDashboardClick?: (bookmark: SchemeBookmark) => void;
  showActions?: boolean;
  isCalculating?: boolean;
}

export const EnhancedBookmarkCard: React.FC<EnhancedBookmarkCardProps> = ({
  bookmark,
  onToggleDaily,
  onViewNavData,
  onHistoricalDownload,
  onCalculateMetrics,
  onDashboardClick,
  showActions = true,
  isCalculating = false,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const { updateBookmark } = useBookmarks();
  
  const [isToggling, setIsToggling] = useState(false);

  // Get metrics status
  const { status: metricsStatus } = useMetricsStatus(bookmark.scheme_id, isCalculating);

  // Safe number conversion for NAV value
  const formatNavValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    
    return numValue.toFixed(4);
  };

  // Handle daily download toggle
  const handleToggleDaily = async (enabled: boolean) => {
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      await updateBookmark(bookmark.id, {
        daily_download_enabled: enabled
      });
      
      onToggleDaily?.(bookmark.id, enabled);
      toastService.success(`Daily download ${enabled ? 'enabled' : 'disabled'} for ${bookmark.scheme_name}`);
      
      FrontendErrorLogger.info(
        'Daily download toggled',
        'EnhancedBookmarkCard',
        {
          bookmarkId: bookmark.id,
          schemeName: bookmark.scheme_name,
          enabled
        }
      );
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Failed to toggle daily download',
        'EnhancedBookmarkCard',
        {
          bookmarkId: bookmark.id,
          error: error.message
        },
        error.stack
      );
      toastService.error('Failed to update daily download setting');
    } finally {
      setIsToggling(false);
    }
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
          <span><strong>Records:</strong> {(bookmark.nav_records_count || 0).toLocaleString()}</span>
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
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '10px',
          minWidth: '180px',
          flexShrink: 0,
        }}>
          
          {/* DAILY DOWNLOAD TOGGLE */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            cursor: isToggling ? 'not-allowed' : 'pointer',
            color: colors.utility.primaryText,
            userSelect: 'none',
          }}>
            <span>Daily Download</span>
            <div 
              title={bookmark.daily_download_enabled 
                ? `Daily downloads enabled at ${bookmark.download_time}` 
                : 'Enable automatic daily NAV downloads'}
              style={{
                position: 'relative',
                width: '36px',
                height: '18px',
                backgroundColor: bookmark.daily_download_enabled 
                  ? colors.semantic.success 
                  : colors.utility.secondaryText,
                borderRadius: '9px',
                transition: 'background-color 0.2s ease',
                cursor: isToggling ? 'not-allowed' : 'pointer'
              }}>
              <input
                type="checkbox"
                checked={bookmark.daily_download_enabled}
                onChange={(e) => handleToggleDaily(e.target.checked)}
                disabled={isToggling}
                style={{
                  opacity: 0,
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  cursor: isToggling ? 'not-allowed' : 'pointer',
                  margin: 0,
                  padding: 0
                }}
              />
              <div style={{
                position: 'absolute',
                top: '2px',
                left: bookmark.daily_download_enabled ? '20px' : '2px',
                width: '14px',
                height: '14px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'left 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                pointerEvents: 'none'
              }} />
            </div>
          </label>

          {/* ACTION BUTTONS ROW 1 */}
          <div style={{
            display: 'flex',
            gap: '6px',
            width: '100%',
          }}>
            {/* VIEW NAV DATA BUTTON */}
            <button
              onClick={() => {
                if ((bookmark.nav_records_count || 0) > 0) {
                  onViewNavData?.(bookmark);
                }
              }}
              disabled={(bookmark.nav_records_count || 0) === 0}
              title={(bookmark.nav_records_count || 0) === 0 
                ? 'No NAV data available. Download historical data first.' 
                : `View ${(bookmark.nav_records_count || 0).toLocaleString()} NAV records`}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '11px',
                backgroundColor: (bookmark.nav_records_count || 0) === 0 
                  ? colors.utility.secondaryBackground 
                  : colors.brand.secondary,
                color: (bookmark.nav_records_count || 0) === 0 
                  ? colors.utility.secondaryText 
                  : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (bookmark.nav_records_count || 0) === 0 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                opacity: (bookmark.nav_records_count || 0) === 0 ? 0.6 : 1
              }}
            >
              📊 View Data
            </button>

            {/* DASHBOARD BUTTON */}
            {onDashboardClick && (
              <button
                onClick={() => onDashboardClick(bookmark)}
                title={`View dashboard for ${bookmark.scheme_name}`}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '11px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                📈 Dashboard
              </button>
            )}
          </div>

          {/* ACTION BUTTONS ROW 2 */}
          <div style={{
            display: 'flex',
            gap: '6px',
            width: '100%',
          }}>
            {/* HISTORICAL DOWNLOAD BUTTON */}
            <button
              onClick={() => onHistoricalDownload?.(bookmark)}
              title={
                (bookmark.nav_records_count || 0) > 0
                  ? `Download additional historical NAV data. Current: ${(bookmark.nav_records_count || 0).toLocaleString()} records`
                  : 'Download complete historical NAV data from MFAPI.in'
              }
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '11px',
                backgroundColor: (bookmark.nav_records_count || 0) > 0
                  ? colors.semantic.success 
                  : colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {(bookmark.nav_records_count || 0) > 0 ? '🔄 Update NAV' : '📥 Download NAV'}
            </button>

            {/* CALCULATE METRICS BUTTON */}
            <button
              onClick={() => {
                if ((bookmark.nav_records_count || 0) > 0 && onCalculateMetrics) {
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
                flex: 1,
                padding: '6px 10px',
                fontSize: '11px',
                backgroundColor: ((bookmark.nav_records_count || 0) === 0 || isCalculating)
                  ? colors.utility.secondaryBackground
                  : metricsStatus === 'available'
                  ? colors.semantic.warning
                  : colors.brand.primary,
                color: ((bookmark.nav_records_count || 0) === 0 || isCalculating)
                  ? colors.utility.secondaryText
                  : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: ((bookmark.nav_records_count || 0) === 0 || isCalculating) 
                  ? 'not-allowed' 
                  : 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                opacity: ((bookmark.nav_records_count || 0) === 0 || isCalculating) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
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
                '🔄 Recalc Metrics'
              ) : (
                '📊 Calc Metrics'
              )}
            </button>
          </div>

          {/* Download Time Display */}
          {bookmark.daily_download_enabled && (
            <div style={{
              fontSize: '10px',
              color: colors.utility.secondaryText,
              textAlign: 'right',
              width: '100%',
            }}>
              ⏰ Download at {bookmark.download_time}
            </div>
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