// frontend/src/components/monthly-tracking/MonthlyTrackingTabs.tsx
// Container component with tabs for monthly tracking views

import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Package, TrendingUp, DollarSign } from 'lucide-react';
import { UnitsPerMonthView } from './UnitsPerMonthView';
import { NAVPerformanceView } from './NAVPerformanceView';
import { MarketValueView } from './MarketValueView';

interface MonthlyTrackingTabsProps {
  customerId: number;
  schemeCode: string;
  months?: number;
}

type TabType = 'units' | 'nav' | 'value';

export const MonthlyTrackingTabs: React.FC<MonthlyTrackingTabsProps> = ({
  customerId,
  schemeCode,
  months = 12,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('units');

  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'units',
      label: 'Units Per Month',
      icon: <Package size={18} />,
    },
    {
      id: 'nav',
      label: 'NAV Performance',
      icon: <TrendingUp size={18} />,
    },
    {
      id: 'value',
      label: 'Market Value',
      icon: <DollarSign size={18} />,
    },
  ];

  return (
    <div
      style={{
        backgroundColor: isDarkMode
          ? colors.backgrounds.base
          : colors.backgrounds.subtle,
        borderRadius: '8px',
        padding: '20px',
        marginTop: '24px',
      }}
    >
      {/* Tab Headers */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: `2px solid ${colors.utility.secondaryText}20`,
          paddingBottom: '0',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderBottom: isActive
                  ? `3px solid ${colors.primary.main}`
                  : '3px solid transparent',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '15px',
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? colors.primary.main
                  : colors.utility.secondaryText,
                transition: 'all 0.2s',
                position: 'relative',
                marginBottom: '-2px',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = colors.text.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = colors.utility.secondaryText;
                }
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'units' && (
          <UnitsPerMonthView
            customerId={customerId}
            schemeCode={schemeCode}
            months={months}
          />
        )}

        {activeTab === 'nav' && (
          <NAVPerformanceView
            customerId={customerId}
            schemeCode={schemeCode}
            months={months}
          />
        )}

        {activeTab === 'value' && (
          <MarketValueView
            customerId={customerId}
            schemeCode={schemeCode}
            months={months}
          />
        )}
      </div>
    </div>
  );
};
