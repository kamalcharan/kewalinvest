// frontend/src/components/nav/BookmarkGapAlert.tsx
// Dashboard widget showing bookmark gap alerts

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { navService } from '../../services/nav.service';
import { BookmarkGapSummary, UnbookmarkedScheme } from '../../types/nav.types';

interface BookmarkGapAlertProps {
  onViewAll: () => void;
  onRefresh?: () => void;
}

const BookmarkGapAlert: React.FC<BookmarkGapAlertProps> = ({ onViewAll, onRefresh }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [summary, setSummary] = useState<BookmarkGapSummary | null>(null);
  const [topSchemes, setTopSchemes] = useState<UnbookmarkedScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarking, setBookmarking] = useState(false);

  // Fetch gap summary
  const fetchGapData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch summary
      const summaryResponse = await navService.getBookmarkGapsSummary();
      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data);
      }

      // Fetch top 5 schemes for preview
      const schemesResponse = await navService.getBookmarkGaps({
        page: 1,
        page_size: 5,
        sort_by: 'customer_count',
        sort_order: 'desc'
      });

      if (schemesResponse.success && Array.isArray(schemesResponse.data)) {
  setTopSchemes(schemesResponse.data);
} else if (schemesResponse.success) {
  setTopSchemes([]);
}
    } catch (err: any) {
      console.error('Error fetching bookmark gaps:', err);
      setError(err.message || 'Failed to load gap data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchGapData();
  }, [fetchGapData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGapData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchGapData]);

  // Bookmark all schemes
  const handleBookmarkAll = async () => {
    if (!topSchemes.length) return;

    try {
      setBookmarking(true);
      
      // Only bookmark schemes that exist in master
      const bookmarkableSchemeCodes = topSchemes
        .filter(s => s.exists_in_master)
        .map(s => s.scheme_code);

      if (bookmarkableSchemeCodes.length === 0) {
        alert('No schemes available to bookmark. All schemes need to be added to master first.');
        return;
      }

      const response = await navService.bulkBookmarkSchemes(bookmarkableSchemeCodes);
      
      if (response.success) {
        alert(`Successfully bookmarked ${response.data?.success_count || 0} schemes!`);
        fetchGapData();
        if (onRefresh) onRefresh();
      } else {
        alert(`Bookmark operation completed with errors: ${response.error}`);
      }
    } catch (err: any) {
      console.error('Error bookmarking schemes:', err);
      alert(`Failed to bookmark schemes: ${err.message}`);
    } finally {
      setBookmarking(false);
    }
  };

  // Icons
  const AlertTriangleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const AlertCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );

  const BookmarkPlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      <line x1="12" y1="7" x2="12" y2="13" />
      <line x1="9" y1="10" x2="15" y2="10" />
    </svg>
  );

  const ArrowRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );

  // Loading state
  if (loading && !summary) {
    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: `3px solid ${colors.brand.primary}20`,
            borderTop: `3px solid ${colors.brand.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
            Checking for unbookmarked schemes...
          </div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        backgroundColor: colors.semantic.error + '10',
        borderRadius: '12px',
        padding: '20px',
        border: `1px solid ${colors.semantic.error}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: colors.semantic.error }}>
            <AlertCircleIcon />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: colors.semantic.error, marginBottom: '4px' }}>
              Failed to Load Gap Data
            </div>
            <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
              {error}
            </div>
          </div>
        </div>
        <button
          onClick={fetchGapData}
          style={{
            padding: '8px 16px',
            backgroundColor: colors.semantic.error,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshIcon /> Retry
        </button>
      </div>
    );
  }

  // No gaps - success state
  if (summary && summary.total_unbookmarked === 0) {
    return (
      <div style={{
        backgroundColor: colors.semantic.success + '10',
        borderRadius: '12px',
        padding: '20px',
        border: `1px solid ${colors.semantic.success}30`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ color: colors.semantic.success }}>
          <CheckCircleIcon />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: colors.semantic.success, marginBottom: '4px' }}>
            All Schemes Tracked
          </div>
          <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
            All customer portfolio schemes are bookmarked for NAV tracking
          </div>
        </div>
      </div>
    );
  }

  // Gaps exist - alert state
  if (!summary) return null;

  const hasCritical = summary.schemes_not_in_master > 0;
  const alertColor = hasCritical ? colors.semantic.error : colors.semantic.warning;
  const alertIcon = hasCritical ? <AlertTriangleIcon /> : <AlertCircleIcon />;

  return (
    <div style={{
      backgroundColor: alertColor + '10',
      borderRadius: '12px',
      padding: '24px',
      border: `1px solid ${alertColor}30`
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
          <div style={{ color: alertColor, marginTop: '2px' }}>
            {alertIcon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: '600', color: alertColor, marginBottom: '6px' }}>
              {hasCritical ? 'Critical: ' : 'Warning: '}
              {summary.total_unbookmarked} Scheme{summary.total_unbookmarked !== 1 ? 's' : ''} Not Tracked
            </div>
            <div style={{ fontSize: '13px', color: colors.utility.secondaryText, lineHeight: '1.5' }}>
              {hasCritical ? (
                <>
                  <strong>{summary.schemes_not_in_master}</strong> scheme{summary.schemes_not_in_master !== 1 ? 's' : ''} in customer portfolios don't exist in master data. 
                  <strong> {summary.schemes_not_bookmarked}</strong> additional scheme{summary.schemes_not_bookmarked !== 1 ? 's' : ''} need bookmarking.
                </>
              ) : (
                <>
                  <strong>{summary.schemes_not_bookmarked}</strong> scheme{summary.schemes_not_bookmarked !== 1 ? 's' : ''} in customer portfolios {summary.schemes_not_bookmarked === 1 ? 'is' : 'are'} not bookmarked for NAV tracking.
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchGapData}
            disabled={loading}
            style={{
              padding: '8px 12px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              color: colors.utility.primaryText,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshIcon /> Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: colors.utility.secondaryBackground + '80',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: alertColor, marginBottom: '4px' }}>
            {summary.total_customers_affected}
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Customers Affected
          </div>
        </div>

        <div style={{
          backgroundColor: colors.utility.secondaryBackground + '80',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: alertColor, marginBottom: '4px' }}>
            ₹{(summary.total_investment_at_risk / 100000).toFixed(2)}L
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Investment At Risk
          </div>
        </div>

        <div style={{
          backgroundColor: colors.utility.secondaryBackground + '80',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: colors.semantic.error, marginBottom: '4px' }}>
            {summary.schemes_not_in_master}
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Not in Master
          </div>
        </div>
      </div>

      {/* Top Schemes Preview */}
      {topSchemes.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Top Schemes by Customer Count
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topSchemes.slice(0, 5).map((scheme, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  padding: '12px 16px',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: `1px solid ${!scheme.exists_in_master ? colors.semantic.error : colors.semantic.warning}30`
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: colors.utility.primaryText,
                    marginBottom: '4px'
                  }}>
                    {scheme.scheme_name}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                    {scheme.scheme_code} • {scheme.customer_count} customer{scheme.customer_count !== 1 ? 's' : ''} • ₹{(scheme.total_invested / 100000).toFixed(2)}L invested
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  backgroundColor: !scheme.exists_in_master ? colors.semantic.error + '20' : colors.semantic.warning + '20',
                  color: !scheme.exists_in_master ? colors.semantic.error : colors.semantic.warning,
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {!scheme.exists_in_master ? 'Not in Master' : 'Not Bookmarked'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={handleBookmarkAll}
          disabled={bookmarking || topSchemes.filter(s => s.exists_in_master).length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.semantic.success,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: bookmarking || topSchemes.filter(s => s.exists_in_master).length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: bookmarking || topSchemes.filter(s => s.exists_in_master).length === 0 ? 0.6 : 1
          }}
        >
          <BookmarkPlusIcon />
          {bookmarking ? 'Bookmarking...' : `Bookmark Top ${topSchemes.filter(s => s.exists_in_master).length}`}
        </button>

        <button
          onClick={onViewAll}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          View All {summary.total_unbookmarked} Schemes
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
};

export default BookmarkGapAlert;