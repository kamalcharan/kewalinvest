// frontend/src/pages/nav/NavSearchPage.tsx
// Complete search and bookmark interface for NAV schemes

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { navService, SchemeSearchResult, CreateBookmarkRequest } from '../../services/nav.service';
import { toastService } from '../../services/toast.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';

interface SearchFilters {
  search: string;
  amc_name: string;
  scheme_type: number | '';
  scheme_category: number | '';
}

const NavSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // State management
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    amc_name: '',
    scheme_type: '',
    scheme_category: ''
  });
  
  const [schemes, setSchemes] = useState<SchemeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearched, setIsSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkingIds, setBookmarkingIds] = useState<Set<number>>(new Set());
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Search function
  const searchSchemes = useCallback(async (page: number = 1) => {
    if (!filters.search.trim() || filters.search.trim().length < 2) {
      setError('Please enter at least 2 characters to search');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchParams = {
        search: filters.search.trim(),
        page,
        page_size: 20,
        ...(filters.amc_name && { amc_name: filters.amc_name }),
        ...(filters.scheme_type && { scheme_type: Number(filters.scheme_type) }),
        ...(filters.scheme_category && { scheme_category: Number(filters.scheme_category) })
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
        { searchParams: filters, error: err.message },
        err.stack
      );
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchSchemes(1);
  };

  // Handle input changes
  const handleFilterChange = (field: keyof SearchFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Clear search and results
  const clearSearch = () => {
    setFilters({
      search: '',
      amc_name: '',
      scheme_type: '',
      scheme_category: ''
    });
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

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      searchSchemes(newPage);
    }
  };

  // Handle bookmark creation
  const handleBookmark = async (scheme: SchemeSearchResult) => {
    if (bookmarkingIds.has(scheme.id)) return;

    setBookmarkingIds(prev => new Set(prev).add(scheme.id));

    try {
      const bookmarkRequest: CreateBookmarkRequest = {
        scheme_id: scheme.id,
        daily_download_enabled: true, 
        download_time: '23:00' // Default download time
      };

      const response = await navService.createBookmark(bookmarkRequest);

      if (response.success) {
        // Update the scheme's bookmark status in local state
        setSchemes(prev => 
          prev.map(s => 
            s.id === scheme.id 
              ? { ...s, is_bookmarked: true }
              : s
          )
        );

        toastService.success(`${scheme.scheme_name} bookmarked successfully`);
      } else {
        toastService.error(response.error || 'Failed to bookmark scheme');
      }
    } catch (err: any) {
      FrontendErrorLogger.error(
        'Bookmark creation failed',
        'NavSearchPage',
        { schemeId: scheme.id, schemeName: scheme.scheme_name, error: err.message },
        err.stack
      );
      toastService.error('Failed to bookmark scheme. Please try again.');
    } finally {
      setBookmarkingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(scheme.id);
        return newSet;
      });
    }
  };

  // Navigate to bookmarks page
  const handleViewBookmarks = () => {
    try {
      navigate('/nav/bookmarks');
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to bookmarks failed',
        'NavSearchPage',
        { action: 'navigate_bookmarks', error: error.message },
        error.stack
      );
    }
  };

  // Navigate to dashboard
  const handleBackToDashboard = () => {
    try {
      navigate('/nav/dashboard');
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation to dashboard failed',
        'NavSearchPage',
        { action: 'navigate_dashboard', error: error.message },
        error.stack
      );
    }
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
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📚 View Bookmarks
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
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Search Form */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <form onSubmit={handleSearch}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              {/* Search Input */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.utility.primaryText,
                  marginBottom: '8px'
                }}>
                  Search Schemes *
                </label>
                <input
                  type="text"
                  placeholder="Enter scheme name, code, or AMC..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '8px',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                  minLength={2}
                />
              </div>

              {/* AMC Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.utility.primaryText,
                  marginBottom: '8px'
                }}>
                  AMC Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., SBI, HDFC, ICICI..."
                  value={filters.amc_name}
                  onChange={(e) => handleFilterChange('amc_name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '8px',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Scheme Type Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.utility.primaryText,
                  marginBottom: '8px'
                }}>
                  Scheme Type (Optional)
                </label>
                <select
                  value={filters.scheme_type}
                  onChange={(e) => handleFilterChange('scheme_type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '8px',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">All Types</option>
                  <option value="1">Equity</option>
                  <option value="2">Debt</option>
                  <option value="3">Hybrid</option>
                  <option value="4">Solution Oriented</option>
                  <option value="5">Other</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              <button
                type="submit"
                disabled={isLoading || !filters.search.trim()}
                style={{
                  padding: '12px 24px',
                  backgroundColor: (!filters.search.trim() || isLoading) 
                    ? colors.utility.secondaryText 
                    : colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (!filters.search.trim() || isLoading) ? 'not-allowed' : 'pointer',
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
                  <>🔍 Search Schemes</>
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
            {/* Results Header */}
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
                    ? `Found ${pagination.total} schemes` 
                    : 'No schemes found'}
                </p>
              </div>

              {/* Pagination Info */}
              {pagination.total > 0 && (
                <div style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText
                }}>
                  Page {pagination.page} of {pagination.totalPages}
                </div>
              )}
            </div>

            {/* Results List */}
            {schemes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {schemes.map((scheme) => (
                  <div
                    key={scheme.id}
                    style={{
                      padding: '20px',
                      backgroundColor: colors.utility.primaryBackground,
                      border: `1px solid ${colors.utility.primaryText}10`,
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}
                  >
                    {/* Scheme Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: colors.utility.primaryText,
                        marginBottom: '8px',
                        lineHeight: '1.4'
                      }}>
                        {scheme.scheme_name}
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                        fontSize: '14px',
                        color: colors.utility.secondaryText,
                        marginBottom: '12px'
                      }}>
                        <div><strong>Code:</strong> {scheme.scheme_code}</div>
                        <div><strong>AMC:</strong> {scheme.amc_name}</div>
                        {scheme.scheme_type_name && (
                          <div><strong>Type:</strong> {scheme.scheme_type_name}</div>
                        )}
                        {scheme.scheme_category_name && (
                          <div><strong>Category:</strong> {scheme.scheme_category_name}</div>
                        )}
                      </div>

                      {/* Latest NAV Info */}
                      {scheme.latest_nav_value && (
                        <div style={{
                          fontSize: '14px',
                          color: colors.brand.primary,
                          fontWeight: '500'
                        }}>
                          Latest NAV: ₹{scheme.latest_nav_value.toFixed(4)}
                          {scheme.latest_nav_date && (
                            <span style={{ color: colors.utility.secondaryText, fontWeight: 'normal' }}>
                              {' '}({new Date(scheme.latest_nav_date).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div style={{ marginLeft: '16px' }}>
                      <button
                        onClick={() => handleBookmark(scheme)}
                        disabled={scheme.is_bookmarked || bookmarkingIds.has(scheme.id)}
                        style={{
                          padding: '10px 20px',
                          backgroundColor: scheme.is_bookmarked 
                            ? colors.semantic.success
                            : bookmarkingIds.has(scheme.id)
                            ? colors.utility.secondaryText
                            : colors.brand.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: (scheme.is_bookmarked || bookmarkingIds.has(scheme.id)) 
                            ? 'not-allowed' 
                            : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          minWidth: '120px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        {bookmarkingIds.has(scheme.id) ? (
                          <>
                            <span style={{
                              width: '14px',
                              height: '14px',
                              border: '2px solid transparent',
                              borderTop: '2px solid white',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                            Adding...
                          </>
                        ) : scheme.is_bookmarked ? (
                          <>✓ Bookmarked</>
                        ) : (
                          <>📚 Bookmark</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
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

            {/* Pagination */}
            {pagination.total > 20 && (
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
                  ← Previous
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
                    cursor: (!pagination.hasNext || isLoading) ? 'not-allowed' : 'cursor',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Initial State - No Search Yet */}
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
              Enter a scheme name, code, or AMC name to start searching through thousands of mutual fund schemes
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

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default NavSearchPage;