// frontend/src/components/ETL/MappingRow.tsx
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { TRANSFORMATION_RULES } from '../../constants/fileImportTypes';

interface FieldMapping {
  sourceField: string;
  targetField: string;
  isRequired: boolean;
  transformation?: string;
  isActive: boolean;
}

interface TargetField {
  field: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
  group: string;
}

interface MappingRowProps {
  mapping: FieldMapping;
  availableTargetFields: Record<string, TargetField[]>;
  onUpdate: (updates: Partial<FieldMapping>) => void;
  onToggle: () => void;
  disabled?: boolean;
}

const MappingRow: React.FC<MappingRowProps> = ({
  mapping,
  availableTargetFields,
  onUpdate,
  onToggle,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get currently selected target field details
  const selectedTargetField = Object.values(availableTargetFields)
    .flat()
    .find(field => field.field === mapping.targetField);

  // Filter target fields based on search
  const filteredGroups = Object.entries(availableTargetFields).reduce((acc, [group, fields]) => {
    const filteredFields = fields.filter(field =>
      field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredFields.length > 0) {
      acc[group] = filteredFields;
    }
    return acc;
  }, {} as Record<string, TargetField[]>);

  // Handle target field selection
  const handleTargetFieldSelect = (targetField: TargetField) => {
    onUpdate({
      targetField: targetField.field,
      isRequired: targetField.required,
      transformation: suggestTransformation(mapping.sourceField, targetField)
    });
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // Suggest transformation based on field types
  const suggestTransformation = (sourceField: string, targetField: TargetField): string => {
    if (targetField.field === 'pan' || targetField.field === 'iwell_code') {
      return TRANSFORMATION_RULES.UPPERCASE;
    }
    
    if (targetField.field === 'email') {
      return TRANSFORMATION_RULES.LOWERCASE;
    }
    
    if (targetField.type === 'date') {
      return TRANSFORMATION_RULES.FORMAT_DATE;
    }
    
    if (targetField.type === 'phone') {
      return TRANSFORMATION_RULES.NORMALIZE_PHONE;
    }
    
    return TRANSFORMATION_RULES.TRIM;
  };

  // Get field type icon
  const getFieldTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      text: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14,2 14,8 20,8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10,9 9,9 8,9" />
        </svg>
      ),
      email: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 5L2 7" />
        </svg>
      ),
      phone: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
      date: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      number: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1L12 23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      select: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6,9 12,15 18,9" />
        </svg>
      )
    };
    
    return iconMap[type] || iconMap.text;
  };

  // Icons
  const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );

  const RequiredBadge = () => (
    <div style={{
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      backgroundColor: selectedTargetField?.required ? colors.semantic.error : colors.utility.primaryText + '30',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: '600',
      color: 'white'
    }}>
      {selectedTargetField?.required ? '!' : '?'}
    </div>
  );

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '40px 1fr 1fr 150px 40px',
      gap: '16px',
      padding: '16px 20px',
      borderBottom: `1px solid ${colors.utility.primaryText}10`,
      backgroundColor: mapping.isActive ? 'transparent' : colors.utility.primaryText + '05',
      opacity: mapping.isActive ? 1 : 0.6
    }}>
      {/* Skip Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <input
          type="checkbox"
          checked={mapping.isActive}
          onChange={onToggle}
          disabled={disabled}
          style={{
            width: '16px',
            height: '16px',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        />
      </div>

      {/* Source Field */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          padding: '6px 12px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '6px',
          border: `1px solid ${colors.utility.primaryText}20`,
          fontSize: '13px',
          fontWeight: '500',
          color: colors.utility.primaryText,
          fontFamily: 'monospace'
        }}>
          {mapping.sourceField}
        </div>
      </div>

      {/* Target Field Dropdown */}
      <div style={{ position: 'relative' as const }}>
        <button
          onClick={() => mapping.isActive && !disabled && setIsDropdownOpen(!isDropdownOpen)}
          disabled={!mapping.isActive || disabled}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: mapping.targetField ? colors.brand.primary + '10' : colors.utility.secondaryBackground,
            border: `1px solid ${mapping.targetField ? colors.brand.primary + '40' : colors.utility.primaryText + '20'}`,
            borderRadius: '6px',
            fontSize: '13px',
            color: colors.utility.primaryText,
            cursor: !mapping.isActive || disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'left' as const
          }}
        >
          {mapping.targetField ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flex: 1,
              overflow: 'hidden'
            }}>
              <div style={{ color: colors.utility.secondaryText, flexShrink: 0 }}>
                {getFieldTypeIcon(selectedTargetField?.type || 'text')}
              </div>
              <span style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' as const,
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {selectedTargetField?.label || mapping.targetField}
              </span>
            </div>
          ) : (
            <span style={{ 
              color: colors.utility.secondaryText,
              fontSize: '12px'
            }}>
              Select target field...
            </span>
          )}
          
          <div style={{ 
            color: colors.utility.secondaryText,
            transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}>
            <ChevronDownIcon />
          </div>
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div style={{
            position: 'absolute' as const,
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: colors.utility.primaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            boxShadow: `0 4px 12px ${colors.utility.primaryText}20`,
            maxHeight: '300px',
            overflow: 'hidden',
            marginTop: '4px'
          }}>
            {/* Search */}
            <div style={{
              padding: '12px',
              borderBottom: `1px solid ${colors.utility.primaryText}10`
            }}>
              <div style={{
                position: 'relative' as const,
                display: 'flex',
                alignItems: 'center'
              }}>
                <div style={{
                  position: 'absolute' as const,
                  left: '8px',
                  color: colors.utility.secondaryText
                }}>
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  placeholder="Search fields..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px 6px 32px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Options */}
            <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
              {/* Clear Selection Option */}
              <button
                onClick={() => {
                  onUpdate({ targetField: '', isRequired: false, transformation: '' });
                  setIsDropdownOpen(false);
                  setSearchTerm('');
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  fontSize: '12px',
                  textAlign: 'left' as const,
                  cursor: 'pointer',
                  borderBottom: `1px solid ${colors.utility.primaryText}10`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <em>Clear selection</em>
              </button>

              {Object.entries(filteredGroups).map(([group, fields]) => (
                <div key={group}>
                  <div style={{
                    padding: '8px 12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: colors.utility.secondaryText,
                    backgroundColor: colors.utility.secondaryBackground,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.5px'
                  }}>
                    {group}
                  </div>
                  
                  {fields.map((field) => (
                    <button
                      key={field.field}
                      onClick={() => handleTargetFieldSelect(field)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: 'none',
                        backgroundColor: mapping.targetField === field.field ? colors.brand.primary + '20' : 'transparent',
                        color: colors.utility.primaryText,
                        fontSize: '12px',
                        textAlign: 'left' as const,
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (mapping.targetField !== field.field) {
                          e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (mapping.targetField !== field.field) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '2px'
                      }}>
                        <div style={{ color: colors.utility.secondaryText }}>
                          {getFieldTypeIcon(field.type)}
                        </div>
                        <span style={{ fontWeight: '500' }}>{field.label}</span>
                        {field.required && (
                          <span style={{
                            fontSize: '10px',
                            backgroundColor: colors.semantic.error,
                            color: 'white',
                            padding: '2px 4px',
                            borderRadius: '2px',
                            fontWeight: '600'
                          }}>
                            REQ
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: colors.utility.secondaryText,
                        fontFamily: 'monospace'
                      }}>
                        {field.description}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
              
              {Object.keys(filteredGroups).length === 0 && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center' as const,
                  color: colors.utility.secondaryText,
                  fontSize: '12px'
                }}>
                  No fields found matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transformation */}
      <div>
        <select
          value={mapping.transformation || ''}
          onChange={(e) => onUpdate({ transformation: e.target.value })}
          disabled={!mapping.isActive || disabled || !mapping.targetField}
          style={{
            width: '100%',
            padding: '6px 8px',
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '4px',
            fontSize: '11px',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            cursor: !mapping.isActive || disabled || !mapping.targetField ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="">None</option>
          <option value={TRANSFORMATION_RULES.UPPERCASE}>Uppercase</option>
          <option value={TRANSFORMATION_RULES.LOWERCASE}>Lowercase</option>
          <option value={TRANSFORMATION_RULES.TRIM}>Trim spaces</option>
          <option value={TRANSFORMATION_RULES.NORMALIZE_PHONE}>Format phone</option>
          <option value={TRANSFORMATION_RULES.FORMAT_DATE}>Format date</option>
        </select>
      </div>

      {/* Required Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <RequiredBadge />
      </div>
    </div>
  );
};

export default MappingRow;