// frontend/src/pages/Dashboard.tsx
import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  
  // Get current theme colors
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Mock data for dashboard cards
  const stats = [
    {
      title: 'Total Portfolio Value',
      value: '$125,430',
      change: '+12.5%',
      isPositive: true,
      icon: DollarSign,
      color: colors.semantic.success
    },
    {
      title: 'Active Customers',
      value: '48',
      change: '+4',
      isPositive: true,
      icon: Users,
      color: colors.brand.primary
    },
    {
      title: 'Monthly Returns',
      value: '8.2%',
      change: '+2.1%',
      isPositive: true,
      icon: TrendingUp,
      color: colors.semantic.info
    },
    {
      title: 'Risk Score',
      value: 'Medium',
      change: 'Stable',
      isPositive: null,
      icon: Activity,
      color: colors.semantic.warning
    }
  ];

  return (
    <div className="space-y-6" style={{ minHeight: '100vh', padding: '20px' }}>
      {/* Page Header */}
      <div style={{ backgroundColor: colors.utility.secondaryBackground, padding: '20px', borderRadius: '8px' }}>
        <h1 
          className="text-2xl font-bold"
          style={{ color: colors.utility.primaryText }}
        >
          Dashboard
        </h1>
        <p 
          className="text-sm mt-1"
          style={{ color: colors.utility.secondaryText }}
        >
          Welcome back, {user?.email?.split('@')[0] || 'User'}! Here's your portfolio overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="rounded-lg p-6 shadow-sm border"
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderColor: colors.utility.secondaryText + '20'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: stat.color + '15' }}
                >
                  <Icon 
                    className="w-6 h-6"
                    style={{ color: stat.color }}
                  />
                </div>
                {stat.isPositive !== null && (
                  <div className="flex items-center space-x-1">
                    {stat.isPositive ? (
                      <ArrowUp className="w-4 h-4" style={{ color: colors.semantic.success }} />
                    ) : (
                      <ArrowDown className="w-4 h-4" style={{ color: colors.semantic.error }} />
                    )}
                    <span 
                      className="text-sm font-medium"
                      style={{ 
                        color: stat.isPositive ? colors.semantic.success : colors.semantic.error 
                      }}
                    >
                      {stat.change}
                    </span>
                  </div>
                )}
              </div>
              <h3 
                className="text-2xl font-bold mb-1"
                style={{ color: colors.utility.primaryText }}
              >
                {stat.value}
              </h3>
              <p 
                className="text-sm"
                style={{ color: colors.utility.secondaryText }}
              >
                {stat.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div 
          className="rounded-lg p-6 shadow-sm border"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20'
          }}
        >
          <h2 
            className="text-lg font-semibold mb-4"
            style={{ color: colors.utility.primaryText }}
          >
            Recent Transactions
          </h2>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: colors.utility.secondaryText + '10' }}
              >
                <div>
                  <p 
                    className="font-medium"
                    style={{ color: colors.utility.primaryText }}
                  >
                    Transaction #{i}
                  </p>
                  <p 
                    className="text-sm"
                    style={{ color: colors.utility.secondaryText }}
                  >
                    2 hours ago
                  </p>
                </div>
                <span 
                  className="font-semibold"
                  style={{ color: colors.semantic.success }}
                >
                  +$1,234
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div 
          className="rounded-lg p-6 shadow-sm border"
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderColor: colors.utility.secondaryText + '20'
          }}
        >
          <h2 
            className="text-lg font-semibold mb-4"
            style={{ color: colors.utility.primaryText }}
          >
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Customer', icon: Users },
              { label: 'New Transaction', icon: DollarSign },
              { label: 'View Reports', icon: TrendingUp },
              { label: 'Import Data', icon: Activity }
            ].map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={index}
                  className="p-4 rounded-lg border hover:shadow-md transition-all"
                  style={{
                    borderColor: colors.utility.secondaryText + '20',
                    backgroundColor: colors.utility.primaryBackground
                  }}
                >
                  <ActionIcon 
                    className="w-6 h-6 mb-2 mx-auto"
                    style={{ color: colors.brand.primary }}
                  />
                  <p 
                    className="text-sm"
                    style={{ color: colors.utility.primaryText }}
                  >
                    {action.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;