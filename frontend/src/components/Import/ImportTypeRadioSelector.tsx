// frontend/src/components/Import/ImportTypeRadioSelector.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FileImportType } from '../../types/import.types';

interface ImportTypeRadioSelectorProps {
  selectedType: FileImportType | null;
  onTypeChange: (type: FileImportType) => void;
}

const ImportTypeRadioSelector: React.FC<ImportTypeRadioSelectorProps> = ({ 
  selectedType, 
  onTypeChange 
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const importTypes = [
    {
      value: 'CustomerData' as FileImportType,
      label: 'Customer Data',
      icon: '👥',
      description: 'Customer information including names, contact details, and PAN'
    },
    {
      value: 'SchemeData' as FileImportType,
      label: 'Scheme Data',
      icon: '📊',
      description: 'Import mutual fund scheme details and NAV information'
    },
    {
      value: 'TransactionData' as FileImportType,
      label: 'Transaction Data',
      icon: '💰',
      description: 'Import transaction history and financial movements'
    }
  ];

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '24px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {importTypes.map((type) => (
          <label
            key={type.value}
            style={{
              flex: 1,
              minWidth: '200px',
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: selectedType === type.value 
                ? colors.brand.primary + '15' 
                : colors.utility.primaryBackground,
              border: `2px solid ${
                selectedType === type.value 
                  ? colors.brand.primary 
                  : colors.utility.primaryText + '20'
              }`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (selectedType !== type.value) {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedType !== type.value) {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              }
            }}
          >
            <input
              type="radio"
              name="import-type"
              value={type.value}
              checked={selectedType === type.value}
              onChange={() => onTypeChange(type.value)}
              style={{
                position: 'absolute',
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer'
              }}
            />
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%'
            }}>
              {/* Radio Circle */}
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: `2px solid ${
                  selectedType === type.value 
                    ? colors.brand.primary 
                    : colors.utility.secondaryText
                }`,
                backgroundColor: colors.utility.primaryBackground,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {selectedType === type.value && (
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: colors.brand.primary
                  }} />
                )}
              </div>

              {/* Icon */}
              <span style={{
                fontSize: '24px',
                flexShrink: 0
              }}>
                {type.icon}
              </span>

              {/* Label and Description */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: selectedType === type.value 
                    ? colors.brand.primary 
                    : colors.utility.primaryText,
                  marginBottom: '2px'
                }}>
                  {type.label}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  lineHeight: '1.3'
                }}>
                  {type.description}
                </div>
              </div>

              {/* Checkmark for selected */}
              {selectedType === type.value && (
                <div style={{
                  marginLeft: 'auto',
                  color: colors.brand.primary,
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ImportTypeRadioSelector;