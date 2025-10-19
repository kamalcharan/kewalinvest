// frontend/src/components/market/StatisticsBar.tsx
// Statistics dashboard for Market Data

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import type { MarketStatistics } from '../../types/market.types';

interface StatisticsBarProps {
  statistics: MarketStatistics | null;
  isLoading?: boolean;
}

const StatisticsBar: React.FC<StatisticsBarProps> = ({
  statistics,
  isLoading = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Loading skeleton
  if (isLoading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              padding: '20px',
              height: '100px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            {/* Skeleton shimmer */}
            <div
              style={{
                height: '32px',
                width: '60%',
                backgroundColor: colors.utility.primaryText + '10',
                borderRadius: '4px',
                marginBottom: '8px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            />
            <div
              style={{
                height: '14px',
                width: '80%',
                backgroundColor: colors.utility.primaryText + '10',
                borderRadius: '4px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  // Default values if statistics is null
  const stats = statistics || {
    total_indices: 0,
    downloaded_indices: 0,
    pending_indices: 0,
    failed_indices: 0,
    total_data_points: 0,
    earliest_date: null,
    latest_date: null,
    storage_size_mb: 0
  };

  // Stat card data
  const statCards = [
    {
      value: stats.total_indices,
      label: 'Total Indices',
      icon: '📊',
      color: colors.brand.primary,
      bgColor: colors.brand.primary + '10'
    },
    {
      value: stats.downloaded_indices,
      label: 'Downloaded',
      icon: '✅',
      color: colors.semantic.success,
      bgColor: colors.semantic.success + '10',
      subtitle: stats.total_data_points > 0 
        ? `${stats.total_data_points.toLocaleString()} records` 
        : undefined
    },
    {
      value: stats.pending_indices,
      label: 'Pending',
      icon: '⏳',
      color: colors.semantic.warning,
      bgColor: colors.semantic.warning + '10'
    },
    {
      value: stats.failed_indices,
      label: 'Failed',
      icon: '❌',
      color: colors.semantic.error,
      bgColor: colors.semantic.error + '10'
    }
  ];

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {statCards.map((card, index) => (
          <div
            key={index}
            className="stat-card"
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              padding: '20px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'default',
              border: `1px solid ${colors.utility.primaryText}10`,
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${card.color}20`;
              e.currentTarget.style.borderColor = card.color + '30';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = colors.utility.primaryText + '10';
            }}
          >
            {/* Background decoration */}
            <div
              style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '100px',
                height: '100px',
                backgroundColor: card.bgColor,
                borderRadius: '50%',
                opacity: 0.3,
                pointerEvents: 'none'
              }}
            />

            {/* Icon */}
            <div
              style={{
                fontSize: '28px',
                marginBottom: '8px',
                position: 'relative',
                zIndex: 1
              }}
            >
              {card.icon}
            </div>

            {/* Value */}
            <div
              style={{
                fontSize: '32px',
                fontWeight: '700',
                color: card.color,
                marginBottom: '4px',
                lineHeight: '1',
                position: 'relative',
                zIndex: 1
              }}
            >
              {card.value.toLocaleString()}
            </div>

            {/* Label */}
            <div
              style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                fontWeight: '500',
                position: 'relative',
                zIndex: 1
              }}
            >
              {card.label}
            </div>

            {/* Optional subtitle */}
            {card.subtitle && (
              <div
                style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginTop: '4px',
                  opacity: 0.7,
                  position: 'relative',
                  zIndex: 1
                }}
              >
                {card.subtitle}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
};

export default StatisticsBar;