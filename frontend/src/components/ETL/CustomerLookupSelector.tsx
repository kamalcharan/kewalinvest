// frontend/src/components/ETL/CustomerLookupSelector.tsx

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export type CustomerLookupMethod = 'iwell_code' | 'customer_name' | 'both';

interface CustomerLookupSelectorProps {
  value: CustomerLookupMethod;
  onChange: (method: CustomerLookupMethod) => void;
  disabled?: boolean;
}

const CustomerLookupSelector: React.FC<CustomerLookupSelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const options: Array<{
    value: CustomerLookupMethod;
    label: string;
    description: string;
    icon: string;
  }> = [
    {
      value: 'iwell_code',
      label: 'IWELL Code Only',
      description: 'Use IWELL code for customer lookup (traditional method)',
      icon: '🔑'
    },
    {
      value: 'customer_name',
      label: 'Customer Name',
      description: 'Use customer name with PAN as tiebreaker for ambiguous matches',
      icon: '👤'
    },
    {
      value: 'both',
      label: 'IWELL Code + Name Fallback',
      description: 'Try IWELL code first, fallback to customer name if not found',
      icon: '🔄'
    }
  ];

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: colors.utility.primaryBackground,
        border: `1px solid ${colors.utility.secondaryText}20`,
        borderRadius: '8px',
        marginBottom: '20px'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '15px',
          gap: '10px'
        }}
      >
        <span style={{ fontSize: '24px' }}>🔍</span>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: colors.utility.primaryText
            }}
          >
            Customer Lookup Method
          </h3>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: colors.utility.secondaryText
            }}
          >
            Choose how to match transaction records to customers
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px'
        }}
      >
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              style={{
                padding: '16px',
                backgroundColor: isSelected
                  ? `${colors.brand.primary}15`
                  : colors.utility.secondaryBackground,
                border: `2px solid ${
                  isSelected ? colors.brand.primary : `${colors.utility.secondaryText}20`
                }`,
                borderRadius: '8px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                opacity: disabled ? 0.6 : 1,
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.borderColor = colors.brand.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.brand.primary}20`;
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.borderColor = `${colors.utility.secondaryText}20`;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: colors.brand.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: '#fff'
                  }}
                >
                  ✓
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '28px', flexShrink: 0 }}>
                  {option.icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: isSelected ? colors.brand.primary : colors.utility.primaryText,
                      marginBottom: '6px'
                    }}
                  >
                    {option.label}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: colors.utility.secondaryText,
                      lineHeight: '1.4'
                    }}
                  >
                    {option.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help Text */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: `${colors.semantic.info}15`,
          border: `1px solid ${colors.semantic.info}40`,
          borderRadius: '6px',
          fontSize: '12px',
          color: colors.utility.secondaryText,
          lineHeight: '1.5'
        }}
      >
        <strong style={{ color: colors.semantic.info }}>Note:</strong> When using name-based
        lookup, exact match is required after removing salutations (Mr, Mrs, Dr, etc).
        If multiple customers have the same name, PAN is used as a tiebreaker. Records
        without PAN will fail if multiple matches are found.
      </div>
    </div>
  );
};

export default CustomerLookupSelector;
