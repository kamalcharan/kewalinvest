// frontend/src/components/nav/EnhancedBookmarkCard.tsx
// FIXED: Removed invalid ':hover' from inline styles

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookmarks } from '../../hooks/useNavData';
import { toastService } from '../../services/toast.service';
import type { SchemeBookmark } from '../../services/nav.service';

interface EnhancedBookmarkCardProps {
  bookmark: SchemeBookmark;
  onToggleDaily?: (bookmarkId: number, enabled: boolean) => void;
  onViewNavData?: (bookmark: SchemeBookmark) => void;
  onHistoricalDownload?: (bookmark: SchemeBookmark) => void;
  showActions?: boolean;
}

export const EnhancedBookmarkCard: React.FC<EnhancedBookmarkCardProps> = ({
  bookmark,
  onToggleDaily,
  onViewNavData,
  onHistoricalDownload,
  showActions = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const { updateBookmark } = useBookmarks();
  
  const [isToggling, setIsToggling] = useState(false);

  // Handle daily download toggle
  const handleToggleDaily = async (enabled: boolean) => {
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      await updateBookmark(bookmark.id, {
        daily_download_enabled: enabled
      });
      
      onToggleDaily?.(bookmark.id, enabled);
      toastService.success(`Daily download ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toastService.error('Failed to update bookmark');
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
      ? new Date(bookmark.earliest_nav_date).toLocaleDateString() 
      : 'Unknown';
    const endDate = bookmark.latest_nav_date 
      ? new Date(bookmark.latest_nav_date).toLocaleDateString() 
      : 'Unknown';
    
    return `${startDate} → ${endDate}`;
  };

  // Get status indicator color and message
  const getStatusIndicator = () => {
    const hasNavData = (bookmark.nav_records_count || 0) > 0;
    const status = bookmark.last_download_status;
    
    if (!hasNavData) {
      return { color: colors.utility.secondaryText, message: 'No data', icon: '⚪' };
    }
    
    switch (status) {
      case 'success':
        return { color: colors.semantic.success, message: 'Downloaded', icon: '🟢' };
      case 'failed':
        return { color: colors.semantic.error, message: 'Failed', icon: '🔴' };
      case 'pending':
        return { color: colors.semantic.warning, message: 'Pending', icon: '🟡' };
      default:
        return { color: colors.semantic.success, message: 'Available', icon: '🟢' };
    }
  };

  const statusIndicator = getStatusIndicator();

  return (
    <div 
      className="enhanced-bookmark-card"
      style={{
        // FIXED: Removed invalid ':hover' pseudo-selector
        padding: '12px 16px',
        backgroundColor: colors.utility.primaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '80px',
        transition: 'all 0.2s ease'
      }}>
      
      {/* Left Section: Scheme Info */}
      <div style={{ flex: 1, marginRight: '16px' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '4px',
          lineHeight: '1.3'
        }}>
          {bookmark.scheme_name}
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: colors.utility.secondaryText,
          marginBottom: '6px'
        }}>
          <span><strong>Code:</strong> {bookmark.scheme_code}</span>
          <span><strong>AMC:</strong> {bookmark.amc_name}</span>
          <span style={{ color: statusIndicator.color }}>
            {statusIndicator.icon} {statusIndicator.message}
          </span>
        </div>

        {/* NAV DATA RANGE */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '11px',
          color: colors.utility.secondaryText
        }}>
          <span><strong>Data Range:</strong> {getDateRangeDisplay()}</span>
          <span><strong>Records:</strong> {bookmark.nav_records_count || 0}</span>
          {bookmark.latest_nav_value && (
            <span style={{ color: colors.brand.primary, fontWeight: '500' }}>
              <strong>Latest:</strong> ₹{bookmark.latest_nav_value.toFixed(4)}
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
          gap: '8px',
          minWidth: '140px'
        }}>
          
          {/* DAILY DOWNLOAD TOGGLE */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            cursor: isToggling ? 'not-allowed' : 'pointer',
            color: colors.utility.primaryText
          }}>
            <span>Daily Download</span>
            <div style={{
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
                  cursor: isToggling ? 'not-allowed' : 'pointer'
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
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
          </label>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '6px'
          }}>
            {/* VIEW NAV DATA BUTTON */}
            <button
              onClick={() => onViewNavData?.(bookmark)}
              disabled={(bookmark.nav_records_count || 0) === 0}
              style={{
                padding: '4px 8px',
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
                fontWeight: '500'
              }}
            >
              📊 View Data
            </button>

            {/* HISTORICAL DOWNLOAD BUTTON */}
            <button
              onClick={() => onHistoricalDownload?.(bookmark)}
              disabled={bookmark.historical_download_completed}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: bookmark.historical_download_completed 
                  ? colors.semantic.success 
                  : colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: bookmark.historical_download_completed ? 'default' : 'pointer',
                fontWeight: '500'
              }}
            >
              {bookmark.historical_download_completed ? '✓ Historical' : '📥 Historical'}
            </button>
          </div>

          {/* Download Time Display */}
          {bookmark.daily_download_enabled && (
            <div style={{
              fontSize: '10px',
              color: colors.utility.secondaryText,
              textAlign: 'right'
            }}>
              Download at {bookmark.download_time}
            </div>
          )}
        </div>
      )}

      {/* CSS for hover effect */}
      <style>{`
        .enhanced-bookmark-card:hover {
          border-color: ${colors.brand.primary}30 !important;
        }
      `}</style>
    </div>
  );
};