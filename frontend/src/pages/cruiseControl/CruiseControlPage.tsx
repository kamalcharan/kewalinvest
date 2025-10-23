// frontend/src/pages/cruiseControl/CruiseControlPage.tsx
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { DashboardOverview } from './DashboardOverview';
import { NavTab } from './NavTab';
import { MarketTab } from './MarketTab';
import { AlertsTab } from './AlertsTab';

export const CruiseControlPage: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [activeTab, setActiveTab] = useState<'nav' | 'market' | 'alerts'>('nav');

  const tabs = [
    { id: 'nav' as const, label: 'NAV Downloads', icon: '📊' },
    { id: 'market' as const, label: 'Market Downloads', icon: '📈' },
    { id: 'alerts' as const, label: 'Alerts', icon: '🔔' }
  ];

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1600px',
      margin: '0 auto',
      minHeight: 'calc(100vh - 64px)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          🎛️ Cruise Control
        </h1>
        <p style={{
          fontSize: '16px',
          color: colors.utility.secondaryText,
          margin: 0
        }}>
          Monitor and manage all daily downloads and alerts in one place
        </p>
      </div>

      {/* Dashboard Overview */}
      <DashboardOverview />

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: `2px solid ${colors.utility.primaryText}10`,
        marginBottom: '24px',
        marginTop: '32px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id
                ? `3px solid ${colors.brand.primary}`
                : '3px solid transparent',
              color: activeTab === tab.id
                ? colors.brand.primary
                : colors.utility.secondaryText,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-2px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.brand.primary;
                e.currentTarget.style.backgroundColor = `${colors.brand.primary}05`;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.utility.secondaryText;
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'nav' && <NavTab />}
        {activeTab === 'market' && <MarketTab />}
        {activeTab === 'alerts' && <AlertsTab />}
      </div>
    </div>
  );
};

export default CruiseControlPage;
