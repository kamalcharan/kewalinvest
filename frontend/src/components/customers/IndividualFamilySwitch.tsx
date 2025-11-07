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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '6px 12px',
      borderRadius: '20px',
      background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}10 100%)`,
      border: `1px solid ${colors.utility.primaryText}10`,
      opacity: disabled ? 0.6 : 1
    }}>
      <span style={{
        fontSize: '0.875rem',
        color: mode === 'individual' ? colors.brand.primary : colors.utility.secondaryText,
        fontWeight: mode === 'individual' ? '600' : '400',
        transition: 'all 0.3s'
      }}>
        Individual
      </span>
      <button
        onClick={handleToggle}
        disabled={disabled}
        style={{
          width: '44px',
          height: '24px',
          borderRadius: '12px',
          backgroundColor: mode === 'individual' ? colors.brand.primary : colors.brand.secondary,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'background-color 0.3s'
        }}
      >
        <span style={{
          position: 'absolute',
          top: '2px',
          left: mode === 'individual' ? '2px' : '22px',
          width: '20px',
          height: '20px',
          backgroundColor: 'white',
          borderRadius: '50%',
          transition: 'left 0.3s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      </button>
      <span style={{
        fontSize: '0.875rem',
        color: mode === 'family' ? colors.brand.secondary : colors.utility.secondaryText,
        fontWeight: mode === 'family' ? '600' : '400',
        transition: 'all 0.3s'
      }}>
        Family
      </span>
    </div>
  );
};
