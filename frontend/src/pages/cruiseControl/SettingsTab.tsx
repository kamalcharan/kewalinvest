// frontend/src/pages/cruiseControl/SettingsTab.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { DefaultIndexSettings } from '../../components/performance/DefaultIndexSettings';
import { SchedulerSettings } from '../../components/cruiseControl/SchedulerSettings';

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
          Configure your preferences and view scheduled jobs
        </p>
      </div>

      {/* Scheduler Settings - Shows all scheduled jobs */}
      <SchedulerSettings />

      {/* Default Index Settings */}
      <div style={{ marginTop: '24px' }}>
        <DefaultIndexSettings />
      </div>
    </div>
  );
};
