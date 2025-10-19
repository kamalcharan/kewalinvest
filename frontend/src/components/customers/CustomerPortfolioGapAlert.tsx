// frontend/src/components/customer/CustomerPortfolioGapAlert.tsx
// Customer-specific gap alert showing unbookmarked schemes in their portfolio
// FIXED: Proper array validation, error handling, and data safety

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { navService } from '../../services/nav.service';
import { CustomerUnbookmarkedScheme } from '../../types/nav.types';

interface CustomerPortfolioGapAlertProps {
  customerId: number;
  onRefresh?: () => void;
}

const CustomerPortfolioGapAlert: React.FC<CustomerPortfolioGapAlertProps> = ({
  customerId,
  onRefresh
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // State management
  const [schemes, setSchemes] = useState<CustomerUnbookmarkedScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarking, setBookmarking] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  // ==================== DATA FETCHING ====================

  /**
   * Fetch customer's unbookmarked schemes
   * FIXED: Proper array validation and error handling
   */
  const fetchGaps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await navService.getCustomerBookmarkGaps(customerId);

      // Validate response structure
      if (!response) {
        setError('No response from server');
        setSchemes([]);
        return;
      }

      // Success case - validate data is an array
      if (response.success) {
        if (Array.isArray(response.data)) {
          setSchemes(response.data);
        } else {
          // No gaps found or empty result
          setSchemes([]);
        }
      } else {
        // Error case
        setError(response.error || 'Failed to load gap data');
        setSchemes([]);
      }
    } catch (err: any) {
      console.error('Error fetching customer gap data:', err);
      setError(err.message || 'An unexpected error occurred');
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  /**
   * Initial fetch on component mount
   */
  useEffect(() => {
    fetchGaps();
  }, [fetchGaps]);

  // ==================== BOOKMARK ACTIONS ====================

  /**
   * Bookmark a single scheme
   */
  const handleBookmarkScheme = async (schemeCode: string) => {
    try {
      setBookmarking(prev => new Set(prev).add(schemeCode));

      const response = await navService.bulkBookmarkSchemes([schemeCode]);

      if (response.success) {
        // Remove from list
        setSchemes(prev => prev.filter(s => s.scheme_code !== schemeCode));
        if (onRefresh) onRefresh();
      } else {
        alert(`Failed to bookmark scheme: ${response.error}`);
      }
    } catch (err: any) {
      console.error('Error bookmarking scheme:', err);
      alert(`Failed to bookmark scheme: ${err.message}`);
    } finally {
      setBookmarking(prev => {
        const newSet = new Set(prev);
        newSet.delete(schemeCode);
        return newSet;
      });
    }
  };

  /**
   * Bookmark all eligible schemes at once
   */
  const handleBookmarkAll = async () => {
    const bookmarkableSchemes = schemes
      .filter(s => s.exists_in_master)
      .map(s => s.scheme_code);

    if (bookmarkableSchemes.length === 0) {
      alert('No schemes available to bookmark. All schemes need to be added to master first.');
      return;
    }

    try {
      setBookmarking(new Set(bookmarkableSchemes));

      const response = await navService.bulkBookmarkSchemes(bookmarkableSchemes);

      if (response.success) {
        alert(`Successfully bookmarked ${response.data?.success_count || 0} scheme(s)!`);
        fetchGaps();
        if (onRefresh) onRefresh();
      } else {
        alert(`Bookmark operation completed with errors: ${response.error}`);
      }
    } catch (err: any) {
      console.error('Error bookmarking schemes:', err);
      alert(`Failed to bookmark schemes: ${err.message}`);
    } finally {
      setBookmarking(new Set());
    }
  };

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Format currency for display
   */
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // ==================== ICONS ====================

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

  const ChevronDownIcon = () => (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      style={{
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s'
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  const BookmarkPlusIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      <line x1="12" y1="7" x2="12" y2="13" />
      <line x1="9" y1="10" x2="15" y2="10" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );

  // ==================== RENDER: LOADING STATE ====================

  if (loading && schemes.length === 0) {
    return null; // Don't show loading spinner, just return null
  }

  // ==================== RENDER: NO GAPS ====================

  if (schemes.length === 0 && !loading) {
    return null; // Don't render if no gaps found
  }

  // ==================== RENDER: ERROR STATE ====================

  if (error && !loading) {
    return (
      <div style={{
        backgroundColor: colors.semantic.error + '10',
        borderRadius: '12px',
        padding: '16px',
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
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.semantic.error,
              marginBottom: '4px'
            }}>
              Failed to Check Portfolio Gaps
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              {error}
            </div>
          </div>
        </div>
        <button
          onClick={fetchGaps}
          style={{
            padding: '6px 12px',
            backgroundColor: colors.semantic.error,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
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

  // ==================== RENDER: MAIN ALERT ====================

  const criticalSchemes = schemes.filter(s => !s.exists_in_master);
  const warningSchemes = schemes.filter(s => s.exists_in_master);
  const hasCritical = criticalSchemes.length > 0;
  const alertColor = hasCritical ? colors.semantic.error : colors.semantic.warning;
  const alertIcon = hasCritical ? <AlertTriangleIcon /> : <AlertCircleIcon />;

  return (
    <div style={{
      backgroundColor: alertColor + '10',
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${alertColor}30`
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: expanded ? '16px' : '0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flex: 1
        }}>
          <div style={{ color: alertColor }}>
            {alertIcon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              color: alertColor,
              marginBottom: '4px'
            }}>
              {hasCritical ? '🔴 Critical: ' : '⚠️ Warning: '}
              {schemes.length} Scheme{schemes.length !== 1 ? 's' : ''} in Portfolio Not Tracked
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              {hasCritical ? (
                <>
                  <strong>{criticalSchemes.length}</strong> not in master data • 
                  <strong> {warningSchemes.length}</strong> not bookmarked
                </>
              ) : (
                <>
                  These schemes need to be bookmarked for NAV tracking
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          {warningSchemes.length > 0 && (
            <button
              onClick={handleBookmarkAll}
              disabled={bookmarking.size > 0}
              style={{
                padding: '8px 16px',
                backgroundColor: colors.semantic.success,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: bookmarking.size > 0 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: bookmarking.size > 0 ? 0.6 : 1,
                whiteSpace: 'nowrap'
              }}
            >
              <BookmarkPlusIcon />
              Bookmark All ({warningSchemes.length})
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '8px 12px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              color: colors.utility.primaryText,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {expanded ? 'Hide' : 'Show'} Details
            <ChevronDownIcon />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: `1px solid ${alertColor}30`
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                borderBottom: `1px solid ${colors.utility.primaryText}20`
              }}>
                <th style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Scheme Name
                </th>
                <th style={{
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '120px'
                }}>
                  Folio No
                </th>
                <th style={{
                  padding: '10px 12px',
                  textAlign: 'right',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '120px'
                }}>
                  Invested
                </th>
                <th style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '140px'
                }}>
                  Status
                </th>
                <th style={{
                  padding: '10px 12px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '140px'
                }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {schemes.map((scheme, idx) => {
                const isBookmarking = bookmarking.has(scheme.scheme_code);
                const canBookmark = scheme.exists_in_master;

                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: `1px solid ${colors.utility.primaryText}10`,
                      backgroundColor: colors.utility.secondaryBackground + '40'
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{
                        fontWeight: '500',
                        color: colors.utility.primaryText,
                        fontSize: '13px',
                        marginBottom: '4px'
                      }}>
                        {scheme.scheme_name}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: colors.utility.secondaryText
                      }}>
                        {scheme.scheme_code}
                      </div>
                    </td>
                    <td style={{
                      padding: '12px',
                      fontSize: '12px',
                      color: colors.utility.secondaryText,
                      fontFamily: 'monospace'
                    }}>
                      {scheme.folio_no}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      fontSize: '13px'
                    }}>
                      {formatCurrency(scheme.total_invested)}
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <span style={{
                        padding: '4px 10px',
                        backgroundColor: !scheme.exists_in_master
                          ? colors.semantic.error + '20'
                          : colors.semantic.warning + '20',
                        color: !scheme.exists_in_master
                          ? colors.semantic.error
                          : colors.semantic.warning,
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap'
                      }}>
                        {!scheme.exists_in_master ? 'Not in Master' : 'Not Bookmarked'}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      {canBookmark ? (
                        <button
                          onClick={() => handleBookmarkScheme(scheme.scheme_code)}
                          disabled={isBookmarking}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: colors.semantic.success,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isBookmarking ? 'not-allowed' : 'pointer',
                            fontSize: '11px',
                            fontWeight: '500',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: isBookmarking ? 0.6 : 1,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <BookmarkPlusIcon />
                          {isBookmarking ? 'Tracking...' : 'Enable Tracking'}
                        </button>
                      ) : (
                        <span style={{
                          padding: '6px 14px',
                          backgroundColor: colors.utility.primaryText + '10',
                          color: colors.utility.secondaryText,
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '500',
                          display: 'inline-block',
                          whiteSpace: 'nowrap'
                        }}>
                          Add to Master First
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerPortfolioGapAlert;