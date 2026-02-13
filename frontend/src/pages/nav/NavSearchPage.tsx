// frontend/src/pages/nav/NavSearchPage.tsx
// SIMPLIFIED: Single search field only - removed AMC name and scheme type filters

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { navService, SchemeSearchResult, CreateBookmarkRequest } from '../../services/nav.service';
import { toastService } from '../../services/toast.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';

const NavSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // State management - SIMPLIFIED: Only search string needed
  const [searchQuery, setSearchQuery] = useState('');
  const [schemes, setSchemes] = useState<SchemeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearched, setIsSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkingIds, setBookmarkingIds] = useState<Set<number>>(new Set());

  // Modal state for custom alias input
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [selectedSchemeForBookmark, setSelectedSchemeForBookmark] = useState<SchemeSearchResult | null>(null);
  const [customAliasInput, setCustomAliasInput] = useState('');

  const [lastSearchTime, setLastSearchTime] = useState<number>(0);
  const SEARCH_COOLDOWN = 500;
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // SIMPLIFIED: Search with only the search query
  const searchSchemes = useCallback(async (page: number = 1, skipCooldown: boolean = false) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setError('Please enter at least 2 characters to search');
      return;
    }

    const now = Date.now();
    if (!skipCooldown && now - lastSearchTime < SEARCH_COOLDOWN) {
      setTimeout(() => {
        if (searchQuery.trim().length >= 2) {
          searchSchemes(page, true);
        }
      }, SEARCH_COOLDOWN - (now - lastSearchTime));
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastSearchTime(now);

    try {
      const searchParams = {
        search: searchQuery.trim(),
        page,
        page_size: 10
      };

      const response = await navService.searchSchemes(searchParams);

      if (response.success && response.data) {
        setSchemes(response.data.schemes || []);
        setPagination({
          page: response.data.page,
          total: response.data.total,
          totalPages: response.data.total_pages,
          hasNext: response.data.has_next,
          hasPrev: response.data.has_prev
        });
        setIsSearched(true);
      } else {
        setError(response.error || 'Search failed');
        setSchemes([]);
      }
    } catch (err: any) {
      FrontendErrorLogger.error(
        'Scheme search failed',
        'NavSearchPage',
        { searchQuery, error: err.message },
        err.stack
      );
      
      if (err.message.includes('429') || err.message.includes('rate limit')) {
        setError('Please wait a moment before searching again.');
      } else {
        setError('Search failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, lastSearchTime]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchSchemes(1, false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSchemes([]);
    setIsSearched(false);
    setError(null);
    setPagination({
      page: 1,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      searchSchemes(newPage, true);
    }
  };

  // Show modal when user clicks bookmark
  const handleBookmarkClick = (scheme: SchemeSearchResult) => {
    if (bookmarkingIds.has(scheme.id)) return;
    setSelectedSchemeForBookmark(scheme);
    setCustomAliasInput('');
    setShowAliasModal(true);
  };

  // Close the alias modal
  const closeAliasModal = () => {
    setShowAliasModal(false);
    setSelectedSchemeForBookmark(null);
    setCustomAliasInput('');
  };

  // Confirm bookmark with optional custom alias
  const confirmBookmark = async () => {
    if (!selectedSchemeForBookmark) return;

    const scheme = selectedSchemeForBookmark;
    closeAliasModal();

    setBookmarkingIds(prev => new Set(prev).add(scheme.id));

    try {
      const bookmarkRequest: CreateBookmarkRequest = {
        scheme_id: scheme.id,
        custom_alias: customAliasInput.trim() || undefined, // Include custom alias if provided
        daily_download_enabled: true,
        download_time: '23:00'
      };

      const response = await navService.createBookmark(bookmarkRequest);

      if (response.success) {
        setSchemes(prev =>
          prev.map(s =>
            s.id === scheme.id
              ? { ...s, is_bookmarked: true }
              : s
          )
        );

        // Invalidate bookmark queries to refresh bookmark lists
        queryClient.invalidateQueries({ queryKey: ['nav', 'bookmarks'] });
        queryClient.invalidateQueries({ queryKey: ['bookmarks'] });

        const aliasMsg = customAliasInput.trim()
          ? ` with custom alias "${customAliasInput.trim()}"`
          : '';
        toastService.success(`${scheme.scheme_name} bookmarked successfully${aliasMsg}`);

        setTimeout(() => {
          navigate('/nav/dashboard');
        }, 1500);

      } else {
        throw new Error(response.error || 'Failed to bookmark scheme');
      }
    } catch (err: any) {
      FrontendErrorLogger.error(
        'Bookmark creation failed',
        'NavSearchPage',
        { schemeId: scheme.id, schemeName: scheme.scheme_name, error: err.message },
        err.stack
      );
      toastService.error(`Failed to bookmark ${scheme.scheme_name}`);
    } finally {
      setBookmarkingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(scheme.id);
        return newSet;
      });
    }
  };

  const handleViewBookmarks = () => {
    navigate('/nav/bookmarks');
  };

  const handleBackToDashboard = () => {
    navigate('/nav/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: '0 0 4px 0'
            }}>
              Search Mutual Fund Schemes
            </h1>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              Search and bookmark schemes to track their NAV data
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleViewBookmarks}
              style={{
                padding: '12px 20px',
                backgroundColor: colors.brand.secondary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              View Bookmarks
            </button>
            
            <button
              onClick={handleBackToDashboard}
              style={{
                padding: '12px 20px',
                backgroundColor: 'transparent',
                color: colors.brand.primary,
                border: `1px solid ${colors.brand.primary}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* SIMPLIFIED: Single search field */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <form onSubmit={handleSearch}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                Search Schemes
              </label>
              <input
                type="text"
                placeholder="Enter scheme name, code, or AMC name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '8px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
                minLength={2}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: (!searchQuery.trim() || isLoading) 
                    ? colors.utility.secondaryText 
                    : colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!searchQuery.trim() || isLoading) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Searching...
                  </>
                ) : (
                  'Search Schemes'
                )}
              </button>

              <button
                type="button"
                onClick={clearSearch}
                disabled={isLoading}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.secondaryText}`,
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: colors.semantic.error + '10',
            color: colors.semantic.error,
            borderRadius: '8px',
            marginBottom: '24px',
            border: `1px solid ${colors.semantic.error}20`
          }}>
            {error}
          </div>
        )}

        {/* Search Results */}
        {isSearched && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: '0 0 4px 0'
                }}>
                  Search Results
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  margin: 0
                }}>
                  {pagination.total > 0 
                    ? `Found ${pagination.total} schemes (showing 10 per page)` 
                    : 'No schemes found'}
                </p>
              </div>

              {pagination.total > 0 && (
                <div style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText
                }}>
                  Page {pagination.page} of {pagination.totalPages}
                </div>
              )}
            </div>

            {schemes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {schemes.map((scheme) => {
                  // Calculate NAV ageing
                  const getNavAgeing = () => {
                    if (!scheme.latest_nav_date) return null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const navDate = new Date(scheme.latest_nav_date);
                    navDate.setHours(0, 0, 0, 0);
                    const daysDiff = Math.floor((today.getTime() - navDate.getTime()) / (1000 * 60 * 60 * 24));
                    if (daysDiff === 0) return 'Today';
                    if (daysDiff === 1) return 'Yesterday';
                    return `${daysDiff} days ago`;
                  };

                  const formatNavValue = (value: any): string => {
                    if (value === null || value === undefined) return 'N/A';
                    const numValue = typeof value === 'string' ? parseFloat(value) : value;
                    if (isNaN(numValue)) return 'N/A';
                    return numValue.toFixed(4);
                  };

                  return (
                  <div
                    key={scheme.id}
                    className="search-result-card"
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
                    }}
                  >
                    {/* Left Section: Scheme Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Scheme Name */}
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
                          {scheme.scheme_name}
                        </div>
                        {scheme.is_bookmarked && (
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            backgroundColor: colors.semantic.success + '20',
                            color: colors.semantic.success,
                            borderRadius: '12px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                          }}>
                            Bookmarked
                          </span>
                        )}
                      </div>

                      {/* Scheme Details Row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '12px',
                        color: colors.utility.secondaryText,
                        marginBottom: '6px',
                        flexWrap: 'wrap',
                      }}>
                        <span><strong>Code:</strong> {scheme.scheme_code}</span>
                        <span><strong>AMC:</strong> {scheme.amc_name}</span>
                        {scheme.scheme_type_name && (
                          <span><strong>Type:</strong> {scheme.scheme_type_name}</span>
                        )}
                        {scheme.scheme_category_name && (
                          <span><strong>Category:</strong> {scheme.scheme_category_name}</span>
                        )}
                      </div>

                      {/* NAV Info Row */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        fontSize: '11px',
                        color: colors.utility.secondaryText,
                        flexWrap: 'wrap',
                      }}>
                        {scheme.launch_date && (
                          <span>
                            <strong>Launch:</strong>{' '}
                            {new Date(scheme.launch_date).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                          </span>
                        )}
                        {scheme.latest_nav_value && (
                          <span style={{
                            color: colors.brand.primary,
                            fontWeight: '600',
                            fontFamily: 'monospace'
                          }}>
                            <strong>Latest NAV:</strong> ₹{formatNavValue(scheme.latest_nav_value)}
                          </span>
                        )}
                        {scheme.latest_nav_date && (
                          <span>
                            <strong>NAV Date:</strong>{' '}
                            {new Date(scheme.latest_nav_date).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            })}
                            {getNavAgeing() && (
                              <span style={{ marginLeft: '4px', opacity: 0.8 }}>
                                ({getNavAgeing()})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Section: Bookmark Button */}
                    <div style={{ flexShrink: 0 }}>
                      <button
                        onClick={() => handleBookmarkClick(scheme)}
                        disabled={scheme.is_bookmarked || bookmarkingIds.has(scheme.id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: scheme.is_bookmarked
                            ? 'transparent'
                            : bookmarkingIds.has(scheme.id)
                            ? colors.utility.secondaryText
                            : colors.brand.primary,
                          color: scheme.is_bookmarked
                            ? colors.semantic.success
                            : 'white',
                          border: scheme.is_bookmarked
                            ? `1px solid ${colors.semantic.success}40`
                            : 'none',
                          borderRadius: '6px',
                          cursor: (scheme.is_bookmarked || bookmarkingIds.has(scheme.id))
                            ? 'not-allowed'
                            : 'pointer',
                          fontSize: '12px',
                          fontWeight: '500',
                          minWidth: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {bookmarkingIds.has(scheme.id) ? (
                          <>
                            <span style={{
                              width: '12px',
                              height: '12px',
                              border: '2px solid transparent',
                              borderTop: '2px solid white',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                            Adding...
                          </>
                        ) : scheme.is_bookmarked ? (
                          'Bookmarked'
                        ) : (
                          'Bookmark'
                        )}
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : isSearched && !isLoading ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: colors.utility.secondaryText
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '8px'
                }}>
                  No schemes found
                </h4>
                <p style={{ margin: 0 }}>
                  Try adjusting your search criteria or check the spelling
                </p>
              </div>
            ) : null}

            {pagination.total > 10 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '24px',
                borderTop: `1px solid ${colors.utility.primaryText}10`
              }}>
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev || isLoading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: (!pagination.hasPrev || isLoading) 
                      ? colors.utility.secondaryBackground 
                      : colors.brand.primary,
                    color: (!pagination.hasPrev || isLoading) 
                      ? colors.utility.secondaryText 
                      : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (!pagination.hasPrev || isLoading) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Previous
                </button>

                <span style={{
                  fontSize: '14px',
                  color: colors.utility.primaryText,
                  fontWeight: '500'
                }}>
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext || isLoading}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: (!pagination.hasNext || isLoading) 
                      ? colors.utility.secondaryBackground 
                      : colors.brand.primary,
                    color: (!pagination.hasNext || isLoading) 
                      ? colors.utility.secondaryText 
                      : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: (!pagination.hasNext || isLoading) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!isSearched && !isLoading && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '60px 20px',
            textAlign: 'center',
            border: `2px dashed ${colors.utility.primaryText}20`
          }}>
            <div style={{ fontSize: '72px', marginBottom: '24px' }}>🔍</div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '12px'
            }}>
              Ready to Search
            </h3>
            <p style={{
              fontSize: '16px',
              color: colors.utility.secondaryText,
              marginBottom: '24px',
              maxWidth: '500px',
              margin: '0 auto 24px'
            }}>
              Enter a scheme name, code, or AMC name to start searching
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div style={{
                padding: '8px 16px',
                backgroundColor: colors.brand.primary + '20',
                color: colors.brand.primary,
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Try: "SBI"
              </div>
              <div style={{
                padding: '8px 16px',
                backgroundColor: colors.brand.primary + '20',
                color: colors.brand.primary,
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Try: "Large Cap"
              </div>
              <div style={{
                padding: '8px 16px',
                backgroundColor: colors.brand.primary + '20',
                color: colors.brand.primary,
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Try: "HDFC"
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Alias Modal */}
      {showAliasModal && selectedSchemeForBookmark && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginTop: 0,
              marginBottom: '8px'
            }}>
              Bookmark Scheme
            </h3>

            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '16px',
              lineHeight: '1.5'
            }}>
              <strong>{selectedSchemeForBookmark.scheme_name}</strong>
            </p>

            <div style={{
              backgroundColor: colors.brand.primary + '10',
              border: `1px solid ${colors.brand.primary}30`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <p style={{
                fontSize: '14px',
                color: colors.utility.primaryText,
                margin: 0,
                lineHeight: '1.5'
              }}>
                Would you like to add a <strong>custom alias</strong> for this scheme?
                This helps match the scheme name in your <strong>Transaction Sheet import</strong>.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                Custom Alias Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter the scheme name as it appears in your transaction sheets..."
                value={customAliasInput}
                onChange={(e) => setCustomAliasInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '8px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
              <p style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                margin: '8px 0 0 0'
              }}>
                Leave empty to skip adding a custom alias
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={closeAliasModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.secondaryText}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBookmark}
                style={{
                  padding: '10px 24px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {customAliasInput.trim() ? 'Bookmark with Alias' : 'Bookmark'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .search-result-card:hover {
          border-color: ${colors.brand.primary}30 !important;
          box-shadow: 0 2px 8px ${colors.brand.primary}10;
          transform: translateY(-1px);
        }
        .search-result-card button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          filter: brightness(1.05);
        }
      `}</style>
    </div>
  );
};

export default NavSearchPage;