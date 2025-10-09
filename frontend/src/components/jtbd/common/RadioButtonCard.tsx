// frontend/src/components/jtbd/common/RadioButtonCard.tsx

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface RadioButtonCardProps {
  id: string;
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  isSelected: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  accentColor?: string;
  badge?: string;
}

const RadioButtonCard: React.FC<RadioButtonCardProps> = ({
  id,
  value,
  label,
  description,
  icon,
  isSelected,
  onChange,
  disabled = false,
  accentColor,
  badge
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const effectiveAccentColor = accentColor || colors.brand.primary;

  return (
    <div
      onClick={() => !disabled && onChange(value)}
      style={{
        position: 'relative',
        padding: '16px',
        backgroundColor: isSelected 
          ? effectiveAccentColor + '10' 
          : colors.utility.secondaryBackground,
        border: `2px solid ${isSelected ? effectiveAccentColor : colors.utility.primaryText + '10'}`,
        borderRadius: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isSelected) {
          e.currentTarget.style.borderColor = effectiveAccentColor + '40';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${effectiveAccentColor}20`;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isSelected) {
          e.currentTarget.style.borderColor = colors.utility.primaryText + '10';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Badge */}
      {badge && (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '2px 8px',
            backgroundColor: effectiveAccentColor,
            color: 'white',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}
        >
          {badge}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Radio Button */}
        <div
          style={{
            width: '20px',
            height: '20px',
            minWidth: '20px',
            borderRadius: '50%',
            border: `2px solid ${isSelected ? effectiveAccentColor : colors.utility.secondaryText}`,
            backgroundColor: isSelected ? effectiveAccentColor : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            marginTop: '2px'
          }}
        >
          {isSelected && (
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'white'
              }}
            />
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              borderRadius: '8px',
              backgroundColor: isSelected ? effectiveAccentColor + '20' : colors.utility.primaryText + '10',
              color: isSelected ? effectiveAccentColor : colors.utility.secondaryText,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
          >
            {icon}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: isSelected ? colors.utility.primaryText : colors.utility.primaryText,
              marginBottom: description ? '4px' : 0
            }}
          >
            {label}
          </div>
          {description && (
            <div
              style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                lineHeight: '1.4'
              }}
            >
              {description}
            </div>
          )}
        </div>
      </div>

      {/* Hidden native radio for accessibility */}
      <input
        type="radio"
        id={id}
        name={id.split('-')[0]}
        value={value}
        checked={isSelected}
        onChange={() => onChange(value)}
        disabled={disabled}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none'
        }}
        aria-label={label}
      />
    </div>
  );
};

export default RadioButtonCard;