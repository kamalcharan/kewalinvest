// frontend/src/pages/cruiseControl/SettingsTab.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { DefaultIndexSettings } from '../../components/performance/DefaultIndexSettings';

export const SettingsTab: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          Cruise Control Settings
        </h2>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          margin: 0
        }}>
          Configure your preferences and default settings
        </p>
      </div>

      {/* Default Index Settings */}
      <DefaultIndexSettings />

      {/* Future Settings Can Be Added Here */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px dashed ${colors.utility.primaryText}15`,
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '14px',
          color: colors.utility.secondaryText
        }}>
          More settings will be available here soon
        </div>
      </div>
    </div>
  );
};
