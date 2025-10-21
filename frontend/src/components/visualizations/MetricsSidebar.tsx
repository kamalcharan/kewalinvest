// frontend/src/components/visualizations/MetricsSidebar.tsx
// Sidebar component displaying Returns, Volatility, and Key Metrics

import React from 'react';
import MetricRow from './MetricRow';
import type { ChartColors } from '../../types/chartViewer.types';

interface MetricData {
  return_1m?: number | null;
  return_3m?: number | null;
  return_6m?: number | null;
  return_1y?: number | null;
  return_ytd?: number | null;
  return_all?: number | null;
  volatility_7d?: number | null;
  volatility_14d?: number | null;
  volatility_30d?: number | null;
  volatility_60d?: number | null;
  volatility_90d?: number | null;
  cagr?: number | null;
  sharpe_ratio?: number | null;
  max_drawdown?: number | null;
  total_risk?: number | null;
}

interface MetricsSidebarProps {
  metrics: MetricData;
  colors: ChartColors;
  isLoading?: boolean;
}

const MetricsSidebar: React.FC<MetricsSidebarProps> = ({
  metrics,
  colors,
  isLoading = false
}) => {
  // Section header component
  const SectionHeader: React.FC<{ title: string; icon?: string }> = ({ title, icon }) => (
    <div
      style={{
        fontSize: '11px',
        fontWeight: '700',
        color: colors.utility.secondaryText,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: `2px solid ${colors.utility.primaryText}10`,
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      {icon && <span style={{ fontSize: '14px' }}>{icon}</span>}
      {title}
    </div>
  );

  // Section divider
  const SectionDivider: React.FC = () => (
    <div
      style={{
        height: '1px',
        backgroundColor: colors.utility.primaryText + '10',
        margin: '20px 0'
      }}
    />
  );

  // Loading skeleton for a single row
  const LoadingSkeleton: React.FC = () => (
    <div
      style={{
        padding: '8px 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          width: '40px',
          height: '14px',
          backgroundColor: colors.utility.primaryText + '10',
          borderRadius: '4px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}
      />
      <div
        style={{
          width: '70px',
          height: '18px',
          backgroundColor: colors.utility.primaryText + '10',
          borderRadius: '4px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}
      />
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.utility.primaryText}10`,
          height: 'fit-content'
        }}
      >
        <SectionHeader title="RETURNS" icon="💹" />
        {[1, 2, 3, 4, 5, 6].map(i => <LoadingSkeleton key={`return-${i}`} />)}
        
        <SectionDivider />
        
        <SectionHeader title="VOLATILITY" icon="📉" />
        {[1, 2, 3, 4, 5].map(i => <LoadingSkeleton key={`vol-${i}`} />)}
        
        <SectionDivider />
        
        <SectionHeader title="KEY METRICS" icon="📊" />
        {[1, 2, 3, 4].map(i => <LoadingSkeleton key={`metric-${i}`} />)}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // Check if we have any data
  const hasReturnsData = Object.keys(metrics).some(key => 
    key.startsWith('return_') && metrics[key as keyof MetricData] !== null
  );
  const hasVolatilityData = Object.keys(metrics).some(key => 
    key.startsWith('volatility_') && metrics[key as keyof MetricData] !== null
  );
  const hasKeyMetrics = metrics.cagr !== null || metrics.sharpe_ratio !== null;

  // Empty state
  if (!hasReturnsData && !hasVolatilityData && !hasKeyMetrics) {
    return (
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '40px 20px',
          border: `1px dashed ${colors.utility.primaryText}20`,
          textAlign: 'center',
          height: 'fit-content'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>📊</div>
        <p
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            margin: '0 0 4px 0'
          }}
        >
          No Metrics Available
        </p>
        <p
          style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            margin: 0
          }}
        >
          Calculate metrics to see data
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px',
        border: `1px solid ${colors.utility.primaryText}10`,
        height: 'fit-content',
        position: 'sticky',
        top: '20px'
      }}
    >
      {/* RETURNS SECTION */}
      <SectionHeader title="RETURNS" icon="💹" />
      <div>
        <MetricRow
          label="1M"
          value={metrics.return_1m}
          format="percentage"
          trend={metrics.return_1m && metrics.return_1m > 0 ? 'up' : metrics.return_1m && metrics.return_1m < 0 ? 'down' : 'neutral'}
          colors={colors}
        />
        <MetricRow
          label="3M"
          value={metrics.return_3m}
          format="percentage"
          trend={metrics.return_3m && metrics.return_3m > 0 ? 'up' : metrics.return_3m && metrics.return_3m < 0 ? 'down' : 'neutral'}
          colors={colors}
        />
        <MetricRow
          label="6M"
          value={metrics.return_6m}
          format="percentage"
          trend={metrics.return_6m && metrics.return_6m > 0 ? 'up' : metrics.return_6m && metrics.return_6m < 0 ? 'down' : 'neutral'}
          colors={colors}
        />
        <MetricRow
          label="1Y"
          value={metrics.return_1y}
          format="percentage"
          trend={metrics.return_1y && metrics.return_1y > 0 ? 'up' : metrics.return_1y && metrics.return_1y < 0 ? 'down' : 'neutral'}
          colors={colors}
        />
        <MetricRow
          label="YTD"
          value={metrics.return_ytd}
          format="percentage"
          trend={metrics.return_ytd && metrics.return_ytd > 0 ? 'up' : metrics.return_ytd && metrics.return_ytd < 0 ? 'down' : 'neutral'}
          colors={colors}
        />
        <MetricRow
          label="All"
          value={metrics.return_all}
          format="percentage"
          trend={metrics.return_all && metrics.return_all > 0 ? 'up' : metrics.return_all && metrics.return_all < 0 ? 'down' : 'neutral'}
          colors={colors}
        />
      </div>

      <SectionDivider />

      {/* VOLATILITY SECTION */}
      <SectionHeader title="VOLATILITY" icon="📉" />
      <div>
        <MetricRow
          label="7D"
          value={metrics.volatility_7d}
          format="percentage"
          trend="neutral"
          colors={colors}
        />
        <MetricRow
          label="14D"
          value={metrics.volatility_14d}
          format="percentage"
          trend="neutral"
          colors={colors}
        />
        <MetricRow
          label="30D"
          value={metrics.volatility_30d}
          format="percentage"
          trend="neutral"
          colors={colors}
        />
        <MetricRow
          label="60D"
          value={metrics.volatility_60d}
          format="percentage"
          trend="neutral"
          colors={colors}
        />
        <MetricRow
          label="90D"
          value={metrics.volatility_90d}
          format="percentage"
          trend="neutral"
          colors={colors}
        />
      </div>

      <SectionDivider />

      {/* KEY METRICS SECTION */}
      <SectionHeader title="KEY METRICS" icon="📊" />
      <div>
        <MetricRow
          label="CAGR"
          value={metrics.cagr}
          format="percentage"
          trend="neutral"
          colors={colors}
          highlight={metrics.cagr !== null && metrics.cagr !== undefined && metrics.cagr >= 10}
        />
        <MetricRow
          label="Sharpe"
          value={metrics.sharpe_ratio}
          format="ratio"
          trend="neutral"
          colors={colors}
          highlight={metrics.sharpe_ratio !== null && metrics.sharpe_ratio !== undefined && metrics.sharpe_ratio >= 1}
        />
        <MetricRow
          label="Max DD"
          value={metrics.max_drawdown}
          format="percentage"
          trend="neutral"
          colors={colors}
        />
        <MetricRow
          label="Risk"
          value={metrics.total_risk}
          format="percentage"
          trend="neutral"
          colors={colors}
        />
      </div>
    </div>
  );
};

export default MetricsSidebar;