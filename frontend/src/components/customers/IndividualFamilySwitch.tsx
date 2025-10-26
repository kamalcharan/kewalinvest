// frontend/src/components/customers/IndividualFamilySwitch.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface IndividualFamilySwitchProps {
  mode: 'individual' | 'family';
  onChange: (mode: 'individual' | 'family') => void;
  disabled?: boolean;
}

export const IndividualFamilySwitch: React.FC<IndividualFamilySwitchProps> = ({
  mode,
  onChange,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const handleToggle = () => {
    if (!disabled) {
      onChange(mode === 'individual' ? 'family' : 'individual');
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '8px',
        border: `1px solid ${colors.utility.primaryText}15`,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      <button
        onClick={handleToggle}
        disabled={disabled}
        style={{
          padding: '6px 14px',
          backgroundColor: mode === 'individual' ? colors.brand.primary : 'transparent',
          color: mode === 'individual' ? 'white' : colors.utility.secondaryText,
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap'
        }}
      >
        Individual
      </button>

      <button
        onClick={handleToggle}
        disabled={disabled}
        style={{
          padding: '6px 14px',
          backgroundColor: mode === 'family' ? colors.brand.primary : 'transparent',
          color: mode === 'family' ? 'white' : colors.utility.secondaryText,
          border: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '600',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap'
        }}
      >
        Family
      </button>
    </div>
  );
};
