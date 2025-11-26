// src/components/visualizations/PortfolioDonutChart.tsx
// Shows asset allocation by asset type (MF, Gold, Silver, FD, etc.)

import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNetworthSummary } from '../../hooks/usePortfolioData';
import { getAssetTypeColor } from '../../constants/assetTypes';

interface PortfolioDonutChartProps {
  customerId: number;
  size?: number;
  strokeWidth?: number;
  showLabels?: boolean;
  showLegend?: boolean;
  interactive?: boolean;
}

const PortfolioDonutChart: React.FC<PortfolioDonutChartProps> = ({
  customerId,
  size = 180,
  strokeWidth = 30,
  showLabels = true,
  showLegend = true,
  interactive = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [hoveredSegment, setHoveredSegment] = React.useState<string | null>(null);

  // Fetch asset type data using networth summary
  const { data: networthData, isLoading, error } = useNetworthSummary(
    { customerId },
    { enabled: customerId > 0 }
  );

  // Get asset type data from networth summary
  const assetTypeData = useMemo(() => {
    if (!networthData?.data?.by_asset_type) return [];
    return networthData.data.by_asset_type.filter(a => a.current_value > 0);
  }, [networthData]);

  const totalValue = networthData?.data?.total_networth || 0;

  // Calculate segments from asset type data
  const segments = useMemo(() => {
    if (assetTypeData.length === 0) return [];

    const data = assetTypeData.map(item => ({
      name: item.asset_type_name,
      code: item.asset_type_code,
      value: item.allocation_percentage,
      amount: item.current_value,
      color: getAssetTypeColor(item.asset_type_code)
    }));

    // Sort by value descending for better visual hierarchy
    const sortedData = data.sort((a, b) => b.value - a.value);

    let cumulativePercentage = 0;
    return sortedData.map(item => {
      const startAngle = (cumulativePercentage * 360) / 100;
      cumulativePercentage += item.value;
      const endAngle = (cumulativePercentage * 360) / 100;
      return { ...item, startAngle, endAngle };
    });
  }, [assetTypeData]);

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.utility.secondaryText,
        fontSize: '12px'
      }}>
        Loading...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.semantic.error,
        fontSize: '12px'
      }}>
        Failed to load
      </div>
    );
  }

  // No data state
  if (segments.length === 0) {
    return (
      <div style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: colors.utility.secondaryText,
        fontSize: '12px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{ marginBottom: '8px', opacity: 0.5 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            <path d="M22 12A10 10 0 0 0 12 2v10z" />
          </svg>
        </div>
        No asset data
      </div>
    );
  }

  const hoveredSegmentData = segments.find(s => s.name === hoveredSegment);

  return (
    <div style={{ position: 'relative' }}>
      {/* Donut Chart */}
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - strokeWidth) / 2}
            fill="none"
            stroke={colors.utility.primaryText + '10'}
            strokeWidth={strokeWidth}
          />

          {/* Segments */}
          {segments.map((segment) => {
            const isHovered = hoveredSegment === segment.name;
            const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);
            const strokeDasharray = `${(segment.value / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((segment.startAngle / 360) * circumference);

            return (
              <g key={segment.code}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={(size - strokeWidth) / 2}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  style={{
                    transition: 'all 0.3s ease',
                    cursor: interactive ? 'pointer' : 'default',
                    opacity: hoveredSegment && !isHovered ? 0.6 : 1,
                    filter: isHovered ? 'brightness(1.1)' : 'none'
                  }}
                  onMouseEnter={() => interactive && setHoveredSegment(segment.name)}
                  onMouseLeave={() => interactive && setHoveredSegment(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Center text */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          {hoveredSegmentData ? (
            <>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginBottom: '4px'
              }}>
                {hoveredSegmentData.name}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: colors.utility.primaryText
              }}>
                {hoveredSegmentData.value.toFixed(1)}%
              </div>
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                marginTop: '2px'
              }}>
                {formatCurrency(hoveredSegmentData.amount)}
              </div>
            </>
          ) : (
            <>
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                marginBottom: '4px'
              }}>
                Total Value
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: colors.utility.primaryText
              }}>
                {formatCurrency(totalValue)}
              </div>
              <div style={{
                fontSize: '10px',
                color: colors.utility.secondaryText,
                marginTop: '2px'
              }}>
                {segments.length} Asset Type{segments.length > 1 ? 's' : ''}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div style={{
          marginTop: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px'
        }}>
          {segments.map(segment => (
            <div
              key={segment.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px',
                borderRadius: '4px',
                cursor: interactive ? 'pointer' : 'default',
                backgroundColor: hoveredSegment === segment.name ? colors.utility.primaryText + '10' : 'transparent',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={() => interactive && setHoveredSegment(segment.name)}
              onMouseLeave={() => interactive && setHoveredSegment(null)}
            >
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                backgroundColor: segment.color,
                flexShrink: 0
              }} />
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {segment.name}
              </div>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {segment.value.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortfolioDonutChart;
