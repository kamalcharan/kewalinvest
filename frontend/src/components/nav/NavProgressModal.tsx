// frontend/src/components/nav/NavProgressModal.tsx
// File 13/14: Animated progress modal and NAV components

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { NavService } from '../../services/nav.service';
import type { DownloadProgress } from '../../services/nav.service';

// ==================== PROGRESS MODAL COMPONENT ====================

interface NavProgressModalProps {
  isOpen: boolean;
  progress: DownloadProgress | null;
  onClose: () => void;
  onCancel?: (jobId: number) => void;
  title?: string;
  showCancelButton?: boolean;
}

export const NavProgressModal: React.FC<NavProgressModalProps> = ({
  isOpen,
  progress,
  onClose,
  onCancel,
  title = 'Downloading NAV Data',
  showCancelButton = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  if (!isOpen || !progress) return null;

  const isCompleted = progress.status === 'completed';
  const isFailed = progress.status === 'failed';
  const isCancelled = progress.status === 'cancelled';
  const isActive = progress.status === 'running' || progress.status === 'pending';

  const getStatusColor = () => {
    if (isCompleted) return colors.semantic.success;
    if (isFailed || isCancelled) return colors.semantic.error;
    return colors.brand.primary;
  };

  const getStatusIcon = () => {
    if (isCompleted) return '✅';
    if (isFailed) return '❌';
    if (isCancelled) return '⏹️';
    return '';
  };

  const formatTime = (ms?: number) => {
    if (!ms) return 'Calculating...';
    return NavService.formatEstimatedTime(ms);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        padding: '32px',
        minWidth: '400px',
        maxWidth: '500px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {getStatusIcon()} {title}
          </h3>
          
          {!isActive && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '4px',
          marginBottom: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress.progressPercentage}%`,
            height: '100%',
            backgroundColor: getStatusColor(),
            borderRadius: '4px',
            transition: 'width 0.3s ease-in-out'
          }} />
        </div>

        {/* Progress Info */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: getStatusColor(),
            marginBottom: '4px'
          }}>
            {Math.round(progress.progressPercentage)}%
          </div>
          
          <div style={{
            fontSize: '14px',
            color: colors.utility.primaryText,
            marginBottom: '8px',
            minHeight: '20px'
          }}>
            {progress.currentStep}
          </div>

          {isActive && (
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              {progress.estimatedTimeRemaining ? 
                `Estimated time remaining: ${formatTime(progress.estimatedTimeRemaining)}` :
                'Calculating time remaining...'
              }
            </div>
          )}
        </div>

        {/* Animated Spinner for Active Downloads */}
        {isActive && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: `3px solid ${colors.utility.secondaryBackground}`,
              borderTop: `3px solid ${colors.brand.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '12px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              {progress.processedSchemes}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              of {progress.totalSchemes} schemes
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '12px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              {progress.processedRecords.toLocaleString()}
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              NAV records
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          {isActive && showCancelButton && onCancel && (
            <button
              onClick={() => onCancel(progress.jobId)}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: colors.semantic.error,
                border: `1px solid ${colors.semantic.error}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel Download
            </button>
          )}
          
          {!isActive && (
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {isCompleted ? 'Close' : 'Dismiss'}
            </button>
          )}
        </div>

        {/* Errors Display */}
        {progress.errors && progress.errors.length > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: colors.semantic.error + '10',
            borderRadius: '8px',
            border: `1px solid ${colors.semantic.error}20`
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.semantic.error,
              marginBottom: '8px'
            }}>
              Errors ({progress.errors.length}):
            </div>
            <div style={{
              maxHeight: '120px',
              overflowY: 'auto',
              fontSize: '12px',
              color: colors.utility.primaryText
            }}>
              {progress.errors.slice(0, 5).map((error, index) => (
                <div key={index} style={{ marginBottom: '4px' }}>
                  <strong>{error.scheme_code}:</strong> {error.error}
                </div>
              ))}
              {progress.errors.length > 5 && (
                <div style={{ fontStyle: 'italic', color: colors.utility.secondaryText }}>
                  ...and {progress.errors.length - 5} more errors
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ==================== SCHEME SEARCH COMPONENT ====================

interface SchemeSearchProps {
  onSelectScheme?: (scheme: any) => void;
  showBookmarkButton?: boolean;
  multiSelect?: boolean;
  selectedSchemes?: number[];
  onSelectionChange?: (schemeIds: number[]) => void;
}

export const SchemeSearch: React.FC<SchemeSearchProps> = ({
  onSelectScheme,
  showBookmarkButton = true,
  multiSelect = false,
  selectedSchemes = [],
  onSelectionChange
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [searchQuery, setSearchQuery] = useState('');
  const [schemes, setSchemes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchSchemes = async (query: string) => {
    if (query.length < 2) {
      setSchemes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // This would use your navService.searchSchemes()
      // For now, showing the structure
      const response = await fetch(`/api/nav/schemes/search?search=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setSchemes(data.data.schemes || []);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchemeSelect = (scheme: any) => {
    if (multiSelect && onSelectionChange) {
      const isSelected = selectedSchemes.includes(scheme.id);
      const newSelection = isSelected 
        ? selectedSchemes.filter(id => id !== scheme.id)
        : [...selectedSchemes, scheme.id];
      onSelectionChange(newSelection);
    } else if (onSelectScheme) {
      onSelectScheme(scheme);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchSchemes(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: colors.utility.primaryText,
        marginBottom: '16px'
      }}>
        Search Mutual Fund Schemes
      </h3>

      <input
        type="text"
        placeholder="Search by scheme name, code, or AMC..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: `1px solid ${colors.utility.primaryText}20`,
          borderRadius: '8px',
          backgroundColor: colors.utility.primaryBackground,
          color: colors.utility.primaryText,
          fontSize: '14px',
          outline: 'none',
          marginBottom: '16px'
        }}
      />

      {isLoading && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: colors.utility.secondaryText
        }}>
          Searching schemes...
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: colors.semantic.error + '10',
          color: colors.semantic.error,
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {schemes.length > 0 && (
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              onClick={() => handleSchemeSelect(scheme)}
              style={{
                padding: '12px',
                backgroundColor: selectedSchemes.includes(scheme.id) 
                  ? colors.brand.primary + '10' 
                  : colors.utility.primaryBackground,
                border: `1px solid ${selectedSchemes.includes(scheme.id) 
                  ? colors.brand.primary 
                  : colors.utility.primaryText}20`,
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '4px'
                  }}>
                    {scheme.scheme_name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    display: 'flex',
                    gap: '16px'
                  }}>
                    <span>Code: {scheme.scheme_code}</span>
                    <span>AMC: {scheme.amc_name}</span>
                  </div>
                  {scheme.latest_nav_value && (
                    <div style={{
                      fontSize: '12px',
                      color: colors.brand.primary,
                      marginTop: '4px'
                    }}>
                      Latest NAV: ₹{scheme.latest_nav_value} ({scheme.latest_nav_date})
                    </div>
                  )}
                </div>
                
                {showBookmarkButton && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle bookmark action
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: scheme.is_bookmarked 
                        ? colors.semantic.success 
                        : colors.brand.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {scheme.is_bookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                )}

                {multiSelect && (
                  <input
                    type="checkbox"
                    checked={selectedSchemes.includes(scheme.id)}
                    onChange={() => {}} // Handled by parent click
                    style={{
                      marginLeft: '8px',
                      cursor: 'pointer'
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {searchQuery.length >= 2 && schemes.length === 0 && !isLoading && !error && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: colors.utility.secondaryText
        }}>
          No schemes found for "{searchQuery}"
        </div>
      )}
    </div>
  );
};

// ==================== BOOKMARK LIST COMPONENT ====================

interface BookmarkListProps {
  onTriggerDownload?: (bookmarks: any[]) => void;
  showDownloadControls?: boolean;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  onTriggerDownload,
  showDownloadControls = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [selectedBookmarks, setSelectedBookmarks] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // This would use your useBookmarks hook
  // For now, showing the structure

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedBookmarks(bookmarks.map(b => b.id));
    } else {
      setSelectedBookmarks([]);
    }
  };

  const handleBookmarkSelect = (bookmarkId: number, selected: boolean) => {
    if (selected) {
      setSelectedBookmarks(prev => [...prev, bookmarkId]);
    } else {
      setSelectedBookmarks(prev => prev.filter(id => id !== bookmarkId));
    }
  };

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px'
    }}>
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
          Bookmarked Schemes ({bookmarks.length})
        </h3>

        {showDownloadControls && bookmarks.length > 0 && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              color: colors.utility.primaryText,
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={selectedBookmarks.length === bookmarks.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Select All
            </label>
            
            <button
              onClick={() => onTriggerDownload?.(selectedBookmarks.map(id => bookmarks.find(b => b.id === id)).filter(Boolean))}
              disabled={selectedBookmarks.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedBookmarks.length > 0 ? colors.brand.primary : colors.utility.secondaryBackground,
                color: selectedBookmarks.length > 0 ? 'white' : colors.utility.secondaryText,
                border: 'none',
                borderRadius: '6px',
                cursor: selectedBookmarks.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Download Selected ({selectedBookmarks.length})
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: colors.utility.secondaryText
        }}>
          Loading bookmarks...
        </div>
      ) : bookmarks.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          border: `2px dashed ${colors.utility.primaryText}20`,
          borderRadius: '8px',
          color: colors.utility.secondaryText
        }}>
          <div style={{ marginBottom: '16px', fontSize: '48px' }}>📚</div>
          <h4 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            No Bookmarked Schemes
          </h4>
          <p style={{ margin: 0 }}>
            Search and bookmark schemes to start tracking their NAV data
          </p>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              style={{
                padding: '16px',
                backgroundColor: colors.utility.primaryBackground,
                border: `1px solid ${colors.utility.primaryText}10`,
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={selectedBookmarks.includes(bookmark.id)}
                  onChange={(e) => handleBookmarkSelect(bookmark.id, e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '4px'
                  }}>
                    {bookmark.scheme_name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    display: 'flex',
                    gap: '16px'
                  }}>
                    <span>Code: {bookmark.scheme_code}</span>
                    <span>AMC: {bookmark.amc_name}</span>
                    {bookmark.daily_download_enabled && (
                      <span style={{ color: colors.semantic.success }}>
                        Daily: {bookmark.download_time}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                {bookmark.latest_nav_value && (
                  <div>
                    ₹{bookmark.latest_nav_value}
                    <br />
                    {bookmark.latest_nav_date}
                  </div>
                )}
                
                <div>
                  {bookmark.nav_records_count || 0} records
                  {bookmark.historical_download_completed && (
                    <div style={{ color: colors.semantic.success }}>
                      ✓ Historical Complete
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default {
  NavProgressModal,
  SchemeSearch,
  BookmarkList
};