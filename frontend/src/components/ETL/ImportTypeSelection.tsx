// frontend/src/components/ETL/ImportTypeSelection.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  FILE_IMPORT_TYPES, 
  IMPORT_TYPE_LABELS, 
  IMPORT_TYPE_DESCRIPTIONS,
  FileImportType 
} from '../../constants/fileImportTypes';

interface ImportTypeSelectionProps {
  onTypeSelect: (importType: FileImportType) => void;
  selectedType?: FileImportType;
  disabled?: boolean;
}

const ImportTypeSelection: React.FC<ImportTypeSelectionProps> = ({
  onTypeSelect,
  selectedType,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Icon components
  const CustomerDataIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const TransactionDataIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="m17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );

  const SchemeDataIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );

  const ArrowRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12,5 19,12 12,19" />
    </svg>
  );

  const importTypes = [
    {
      type: FILE_IMPORT_TYPES.CUSTOMER_DATA,
      icon: <CustomerDataIcon />,
      title: IMPORT_TYPE_LABELS[FILE_IMPORT_TYPES.CUSTOMER_DATA],
      description: IMPORT_TYPE_DESCRIPTIONS[FILE_IMPORT_TYPES.CUSTOMER_DATA],
      features: [
        'Contact information (Name, Email, Mobile)',
        'Personal details (DOB, Anniversary)',
        'PAN and IwellCode (encrypted)',
        'Address information',
        'Family relationships'
      ],
      examples: 'customer_master.xlsx, clients_data.csv'
    },
    {
      type: FILE_IMPORT_TYPES.SCHEME_DATA,
      icon: <SchemeDataIcon />,
      title: IMPORT_TYPE_LABELS[FILE_IMPORT_TYPES.SCHEME_DATA],
      description: IMPORT_TYPE_DESCRIPTIONS[FILE_IMPORT_TYPES.SCHEME_DATA],
      features: [
        'AMC names and scheme codes',
        'Scheme types and categories',
        'NAV details and minimum amounts',
        'ISIN codes for different options',
        'Launch and closure dates'
      ],
      examples: 'scheme_master.xlsx, fund_details.csv'
    },
    {
      type: FILE_IMPORT_TYPES.TRANSACTION_DATA,
      icon: <TransactionDataIcon />,
      title: IMPORT_TYPE_LABELS[FILE_IMPORT_TYPES.TRANSACTION_DATA],
      description: IMPORT_TYPE_DESCRIPTIONS[FILE_IMPORT_TYPES.TRANSACTION_DATA],
      features: [
        'Transaction records',
        'Portfolio holdings',
        'Investment movements',
        'Financial statements',
        'Account balances'
      ],
      examples: 'portfolio_data.xlsx, transactions.csv'
    }
  ];

  return (
    <div style={{
      padding: '40px',
      textAlign: 'center'
    }}>
      {/* Header Section */}
      <div style={{
        marginBottom: '48px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '12px',
          margin: 0
        }}>
          Select Import Type
        </h2>
        <p style={{
          fontSize: '16px',
          color: colors.utility.secondaryText,
          margin: 0,
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: '1.5'
        }}>
          Choose the type of data you want to import. Each type has specific field requirements and validation rules.
        </p>
      </div>

      {/* Import Type Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {importTypes.map((importType) => {
          const isSelected = selectedType === importType.type;
          const isPrimary = importType.type === FILE_IMPORT_TYPES.CUSTOMER_DATA;
          
          return (
            <div
              key={importType.type}
              onClick={() => !disabled && onTypeSelect(importType.type)}
              style={{
                backgroundColor: isSelected 
                  ? colors.brand.primary + '08' 
                  : colors.utility.primaryBackground,
                border: `2px solid ${isSelected 
                  ? colors.brand.primary 
                  : colors.utility.primaryText + '10'}`,
                borderRadius: '16px',
                padding: '32px 24px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative' as const,
                textAlign: 'left' as const,
                opacity: disabled ? 0.6 : 1,
                transform: isSelected ? 'translateY(-4px)' : 'translateY(0px)',
                boxShadow: isSelected 
                  ? `0 8px 32px ${colors.brand.primary}20` 
                  : `0 2px 8px ${colors.utility.primaryText}08`
              }}
              onMouseEnter={(e) => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.borderColor = colors.brand.primary + '40';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !isSelected) {
                  e.currentTarget.style.borderColor = colors.utility.primaryText + '10';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{
                    color: isSelected ? colors.brand.primary : colors.utility.secondaryText,
                    flexShrink: 0
                  }}>
                    {importType.icon}
                  </div>
                  
                  <div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      marginBottom: '4px',
                      margin: 0
                    }}>
                      {importType.title}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: colors.utility.secondaryText,
                      margin: 0,
                      lineHeight: '1.4'
                    }}>
                      {importType.description}
                    </p>
                  </div>
                </div>

                {/* Selection indicator */}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                  border: `2px solid ${isSelected ? colors.brand.primary : colors.utility.primaryText + '30'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isSelected && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'white'
                    }} />
                  )}
                </div>
              </div>

              {/* Features List */}
              <div style={{
                marginBottom: '24px'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '12px',
                  margin: 0
                }}>
                  What you can import:
                </h4>
                <ul style={{
                  margin: 0,
                  paddingLeft: '16px',
                  listStyle: 'none'
                }}>
                  {importType.features.map((feature, index) => (
                    <li key={index} style={{
                      fontSize: '13px',
                      color: colors.utility.secondaryText,
                      marginBottom: '6px',
                      position: 'relative',
                      paddingLeft: '16px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        color: colors.semantic.success
                      }}>
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Examples */}
              <div style={{
                padding: '12px',
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '4px'
                }}>
                  Example files:
                </div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  fontFamily: 'monospace'
                }}>
                  {importType.examples}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) onTypeSelect(importType.type);
                }}
                disabled={disabled}
                style={{
                  width: '100%',
                  backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                  color: isSelected ? 'white' : colors.brand.primary,
                  border: `2px solid ${colors.brand.primary}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                {isSelected ? 'Selected' : 'Choose This Type'}
                {!isSelected && <ArrowRightIcon />}
              </button>

              {/* Popular badge for customer data */}
              {isPrimary && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  backgroundColor: colors.semantic.success,
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '600',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase' as const
                }}>
                  Most Common
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        maxWidth: '700px',
        margin: '40px auto 0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <div style={{
            color: colors.semantic.info,
            flexShrink: 0,
            marginTop: '2px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px',
              margin: 0
            }}>
              Need Help Choosing?
            </h4>
            <p style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              margin: 0,
              lineHeight: '1.5'
            }}>
              <strong>Customer Data</strong> is for importing new clients and their personal information. 
              <strong> Scheme Data</strong> is for importing mutual fund schemes and NAV details.
              <strong> Transaction Data</strong> is for importing financial records and portfolio information for existing customers.
              You can always change your selection later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportTypeSelection;