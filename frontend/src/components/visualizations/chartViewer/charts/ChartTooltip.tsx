// frontend/src/components/visualizations/chartViewer/charts/ChartTooltip.tsx
// Shared tooltip component for all chart types

import React from 'react';
import type { ChartTooltipProps } from '../../../../types/chartViewer.types';
import { formatPrice, formatPercentage, formatTooltipLabel } from '../../../../utils/formatters';

const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  colors,
  lineColor,
  viewMode
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const value = viewMode === 'returns' 
    ? (data.returnValue ?? data.value)
    : data.value;

  return (
    <div
      style={{
        backgroundColor: colors.utility.primaryBackground,
        border: `1px solid ${colors.utility.primaryText}20`,
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '140px'
      }}
    >
      {/* Date Label */}
      <p
        style={{
          margin: '0 0 8px 0',
          fontSize: '12px',
          color: colors.utility.secondaryText,
          fontWeight: '500'
        }}
      >
        {formatTooltipLabel(label || data.date)}
      </p>

      {/* Value Display */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: lineColor,
            fontFamily: 'monospace'
          }}
        >
          {viewMode === 'returns' 
            ? formatPercentage(value, 2)
            : formatPrice(value, 2)
          }
        </div>

        {/* OHLC Data (if available and in price mode) */}
        {viewMode === 'price' && data.open != null && data.high != null && data.low != null && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px 8px',
              marginTop: '4px',
              paddingTop: '8px',
              borderTop: `1px solid ${colors.utility.primaryText}10`,
              fontSize: '11px'
            }}
          >
            <div>
              <span style={{ color: colors.utility.secondaryText }}>O:</span>{' '}
              <span style={{ color: colors.utility.primaryText, fontWeight: '500', fontFamily: 'monospace' }}>
                {formatPrice(data.open, 2)}
              </span>
            </div>
            <div>
              <span style={{ color: colors.utility.secondaryText }}>H:</span>{' '}
              <span style={{ color: colors.semantic.success, fontWeight: '500', fontFamily: 'monospace' }}>
                {formatPrice(data.high, 2)}
              </span>
            </div>
            <div>
              <span style={{ color: colors.utility.secondaryText }}>L:</span>{' '}
              <span style={{ color: colors.semantic.error, fontWeight: '500', fontFamily: 'monospace' }}>
                {formatPrice(data.low, 2)}
              </span>
            </div>
            {data.volume != null && (
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: colors.utility.secondaryText }}>Vol:</span>{' '}
                <span style={{ color: colors.utility.primaryText, fontWeight: '500', fontFamily: 'monospace' }}>
                  {(data.volume / 1000000).toFixed(2)}M
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartTooltip;