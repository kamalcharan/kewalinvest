// frontend/src/components/performance/IndexSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { MarketService } from '../../services/market.service';
import type { MarketIndex } from '../../types/market.types';

interface IndexSelectorProps {
  selectedIndexId: number | null;
  onIndexSelect: (index: MarketIndex | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const IndexSelector: React.FC<IndexSelectorProps> = ({
  selectedIndexId,
  onIndexSelect,
  disabled = false,
  placeholder = 'Select index to compare'
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [filteredIndices, setFilteredIndices] = useState<MarketIndex[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<MarketIndex | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch indices on mount
  useEffect(() => {
    fetchIndices();
  }, []);

  // Update selected index when selectedIndexId changes
  useEffect(() => {
    if (selectedIndexId && indices.length > 0) {
      const index = indices.find(i => i.id === selectedIndexId);
      setSelectedIndex(index || null);
    } else {
      setSelectedIndex(null);
    }
  }, [selectedIndexId, indices]);

  // Filter indices based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredIndices(indices);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = indices.filter(index =>
        index.index_name.toLowerCase().includes(query) ||
        index.index_code.toLowerCase().includes(query) ||
        index.category.toLowerCase().includes(query)
      );
      setFilteredIndices(filtered);
    }
  }, [searchQuery, indices]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const fetchIndices = async () => {
    setIsLoading(true);
    try {
      const response = await MarketService.getAllIndices();
      if (response.success && response.data) {
        // Sort by priority and name
        const sorted = [...response.data.indices].sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return a.index_name.localeCompare(b.index_name);
        });
        setIndices(sorted);
        setFilteredIndices(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch indices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (index: MarketIndex | null) => {
    setSelectedIndex(index);
    onIndexSelect(index);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelect(null);
  };

  return (
    <div style={{ position: 'relative', minWidth: '200px' }}>
      {/* Dropdown Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        style={{
          width: '100%',
          padding: '12px 14px',
          backgroundColor: colors.utility.secondaryBackground,
          border: `2px solid ${isOpen ? colors.brand.primary : colors.utility.primaryText}20`,
          borderRadius: '8px',
          color: selectedIndex ? colors.utility.primaryText : colors.utility.secondaryText,
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLoading ? 'Loading...' : selectedIndex ? (
            <>
              {selectedIndex.index_name}
              {selectedIndex.provider_enabled === false && (
                <span style={{
                  fontSize: '9px',
                  fontWeight: '600',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#F59E0B20',
                  color: '#D97706',
                  textTransform: 'uppercase',
                  flexShrink: 0
                }}>
                  Not Configured
                </span>
              )}
            </>
          ) : placeholder}
        </span>
        {selectedIndex && !disabled && (
          <span
            onClick={handleClear}
            style={{
              padding: '2px 8px',
              fontSize: '12px',
              color: colors.utility.secondaryText,
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ✕
          </span>
        )}
        {isOpen ? (
          <ChevronUp size={18} style={{ flexShrink: 0, color: colors.brand.primary }} />
        ) : (
          <ChevronDown size={18} style={{ flexShrink: 0 }} />
        )}
      </button>

      {/* Dropdown Menu - Opens Upwards */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
          />

          {/* Dropdown List */}
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 4px)', // Opens upwards
              left: 0,
              right: 0,
              backgroundColor: colors.utility.secondaryBackground,
              border: `2px solid ${colors.brand.primary}`,
              borderRadius: '12px',
              boxShadow: '0 -6px 20px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Search Box */}
            <div
              style={{
                padding: '12px',
                borderBottom: `1px solid ${colors.utility.primaryText}15`,
                backgroundColor: colors.utility.primaryBackground
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}
              >
                <Search size={16} style={{ color: colors.utility.secondaryText, flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, code, or category..."
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: colors.utility.primaryText,
                    fontSize: '13px',
                    fontFamily: 'inherit'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      fontSize: '12px',
                      color: colors.utility.secondaryText,
                      fontWeight: '600'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Results Count */}
            {searchQuery && (
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  backgroundColor: colors.utility.primaryBackground,
                  borderBottom: `1px solid ${colors.utility.primaryText}10`
                }}
              >
                {filteredIndices.length} result{filteredIndices.length !== 1 ? 's' : ''} found
              </div>
            )}

            {/* Scrollable List */}
            <div
              style={{
                maxHeight: '350px',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}
            >
              {filteredIndices.length === 0 ? (
                <div
                  style={{
                    padding: '20px 12px',
                    textAlign: 'center',
                    color: colors.utility.secondaryText,
                    fontSize: '13px'
                  }}
                >
                  {searchQuery ? 'No matching indices found' : 'No indices available'}
                </div>
              ) : (
                filteredIndices.map((index, idx) => {
                  const isNotConfigured = index.provider_enabled === false;
                  return (
                    <button
                      key={index.id}
                      onClick={() => handleSelect(index)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        backgroundColor: selectedIndex?.id === index.id
                          ? colors.brand.primary + '20'
                          : 'transparent',
                        border: 'none',
                        borderBottom: idx < filteredIndices.length - 1
                          ? `1px solid ${colors.utility.primaryText}10`
                          : 'none',
                        color: colors.utility.primaryText,
                        cursor: 'pointer',
                        fontSize: '13px',
                        textAlign: 'left',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedIndex?.id !== index.id) {
                          e.currentTarget.style.backgroundColor = colors.brand.primary + '10';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedIndex?.id !== index.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '3px'
                      }}>
                        <span style={{
                          fontWeight: selectedIndex?.id === index.id ? '600' : '500'
                        }}>
                          {index.index_name}
                        </span>
                        {isNotConfigured && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: '600',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#F59E0B20',
                            color: '#D97706',
                            textTransform: 'uppercase'
                          }}>
                            Not Configured
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: colors.utility.secondaryText,
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}>
                        <span>{index.index_code}</span>
                        <span>•</span>
                        <span style={{ textTransform: 'capitalize' }}>{index.category}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
