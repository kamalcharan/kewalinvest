// frontend/src/components/cruiseControl/shared/StatCard.tsx
// Shared statistics card component for Cruise Control tabs

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

export interface StatCardProps {
  title: string;
  count: number;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, count, color, icon }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const colorMap = {
    blue: colors.brand.primary,
    green: colors.semantic.success,
    red: colors.semantic.error,
    yellow: colors.semantic.warning,
    purple: '#9333EA'
  };

  const selectedColor = colorMap[color];

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#FFFFFF',
        border: `1px solid ${selectedColor}30`,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: `${selectedColor}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: selectedColor
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: selectedColor
        }}>
          {count}
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          fontWeight: '500'
        }}>
          {title}
        </div>
      </div>
    </div>
  );
};
