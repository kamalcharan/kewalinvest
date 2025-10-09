// frontend/src/components/jtbd/common/SchemeSelector.tsx

import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface Scheme {
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
}

interface SchemeSelectorProps {
  schemes: Scheme[];
  selectedSchemeCodes: string[];
  onChange: (schemeCodes: string[]) => void;
  maxSelections?: number;
  disabled?: boolean;
  isLoading?: boolean;
}

const SchemeSelector: React.FC<SchemeSelectorProps> = ({
  schemes,
  selectedSchemeCodes,
  onChange,
  maxSelections,
  disabled = false,
  isLoading = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [searchQuery, setSearchQuery] = useState('');

  // Filter schemes based on search
  const filteredSchemes = schemes.filter(scheme =>
    scheme.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scheme.scheme_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (scheme.folio_no && scheme.folio_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleToggle = (schemeCode: string) => {
    if (disabled) return;

    const isCurrentlySelected = selectedSchemeCodes.includes(schemeCode);
    
    if (isCurrentlySelected) {
      // Remove from selection
      onChange(selectedSchemeCodes.filter(code => code !== schemeCode));
    } else {
      // Add to selection (check max limit)
      if (maxSelections && selectedSchemeCodes.length >= maxSelections) {
        return; // Don't add if max reached
      }
      onChange([...selectedSchemeCodes, schemeCode]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const allCodes = filteredSchemes.map(s => s.scheme_code);
    if (maxSelections) {
      onChange(allCodes.slice(0, maxSelections));
    } else {
      onChange(allCodes);
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Icons
  const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );

  if (isLoading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: colors.utility.secondaryText,
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px'
      }}>
        Loading schemes...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <label
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText
          }}
        >
          Select Schemes {maxSelections && `(max ${maxSelections})`}
        </label>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled || filteredSchemes.length === 0}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              color: colors.brand.primary,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.brand.primary}40`,
              borderRadius: '6px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1
            }}
          >
            Select All
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={disabled || selectedSchemeCodes.length === 0}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              color: colors.utility.secondaryText,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.utility.secondaryText}40`,
              borderRadius: '6px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Selection Count */}
      {selectedSchemeCodes.length > 0 && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: colors.brand.primary + '10',
          border: `1px solid ${colors.brand.primary}40`,
          borderRadius: '8px',
          marginBottom: '12px',
          fontSize: '12px',
          color: colors.brand.primary,
          fontWeight: '500'
        }}>
          {selectedSchemeCodes.length} scheme{selectedSchemeCodes.length > 1 ? 's' : ''} selected
          {maxSelections && ` (${maxSelections - selectedSchemeCodes.length} remaining)`}
        </div>
      )}

      {/* Search Box */}
      <div style={{
        position: 'relative',
        marginBottom: '12px'
      }}>
        <div style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: colors.utility.secondaryText
        }}>
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Search schemes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '10px 12px 10px 40px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* Scheme List */}
      <div
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.primaryText}10`,
          borderRadius: '8px',
          padding: '8px'
        }}
      >
        {filteredSchemes.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: colors.utility.secondaryText,
            fontSize: '14px'
          }}>
            {searchQuery ? 'No schemes found' : 'No schemes available'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredSchemes.map((scheme) => {
              const isSelected = selectedSchemeCodes.includes(scheme.scheme_code);
               const isDisabledDueToMax = Boolean(!isSelected && maxSelections && selectedSchemeCodes.length >= maxSelections);
              return (
                <label
                  key={scheme.scheme_code}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: isSelected 
                      ? colors.brand.primary + '10' 
                      : colors.utility.primaryBackground,
                    border: `1px solid ${isSelected ? colors.brand.primary + '40' : 'transparent'}`,
                    borderRadius: '6px',
                    cursor: (disabled || isDisabledDueToMax) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isDisabledDueToMax ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && !isDisabledDueToMax) {
                      e.currentTarget.style.backgroundColor = isSelected 
                        ? colors.brand.primary + '15' 
                        : colors.utility.primaryText + '05';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!disabled && !isDisabledDueToMax) {
                      e.currentTarget.style.backgroundColor = isSelected 
                        ? colors.brand.primary + '10' 
                        : colors.utility.primaryBackground;
                    }
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(scheme.scheme_code)}
                    disabled={disabled || isDisabledDueToMax}
                    style={{
                      width: '18px',
                      height: '18px',
                      minWidth: '18px',
                      marginTop: '2px',
                      cursor: (disabled || isDisabledDueToMax) ? 'not-allowed' : 'pointer',
                      accentColor: colors.brand.primary
                    }}
                  />

                  {/* Scheme Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: colors.utility.primaryText,
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {scheme.scheme_name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: colors.utility.secondaryText,
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <span>Code: {scheme.scheme_code}</span>
                      {scheme.folio_no && (
                        <>
                          <span>•</span>
                          <span>Folio: {scheme.folio_no}</span>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemeSelector;