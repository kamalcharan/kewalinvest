// frontend/src/components/performance/IndexSelector.tsx
import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<MarketIndex | null>(null);

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
          padding: '8px 12px',
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.primaryText}20`,
          borderRadius: '8px',
          color: selectedIndex ? colors.utility.primaryText : colors.utility.secondaryText,
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isLoading ? 'Loading...' : selectedIndex ? selectedIndex.index_name : placeholder}
        </span>
        {selectedIndex && !disabled && (
          <span
            onClick={handleClear}
            style={{
              padding: '2px 6px',
              fontSize: '11px',
              color: colors.utility.secondaryText,
              cursor: 'pointer'
            }}
          >
            ✕
          </span>
        )}
        <ChevronDown size={16} style={{ flexShrink: 0 }} />
      </button>

      {/* Dropdown Menu */}
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
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              maxHeight: '300px',
              overflowY: 'auto',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000
            }}
          >
            {indices.length === 0 ? (
              <div
                style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: colors.utility.secondaryText,
                  fontSize: '13px'
                }}
              >
                No indices available
              </div>
            ) : (
              indices.map(index => (
                <button
                  key={index.id}
                  onClick={() => handleSelect(index)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: selectedIndex?.id === index.id
                      ? colors.brand.primary + '15'
                      : 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${colors.utility.primaryText}10`,
                    color: colors.utility.primaryText,
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedIndex?.id !== index.id) {
                      e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedIndex?.id !== index.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{index.index_name}</div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '2px' }}>
                    {index.index_code} • {index.category}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
