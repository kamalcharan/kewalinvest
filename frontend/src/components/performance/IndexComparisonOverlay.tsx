// frontend/src/components/performance/IndexComparisonOverlay.tsx
import React from 'react';

interface IndexComparisonOverlayProps {
  portfolioData: number[];
  indexData: number[];
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
  showLabel?: boolean;
  indexName?: string;
}

export const IndexComparisonOverlay: React.FC<IndexComparisonOverlayProps> = ({
  portfolioData,
  indexData,
  width,
  height,
  color = '#FCD34D', // Yellow/gold color for comparison
  strokeWidth = 2,
  showLabel = true,
  indexName = 'Index'
}) => {
  // Ensure both datasets have the same length
  if (indexData.length === 0 || portfolioData.length === 0) {
    return null;
  }

  // Normalize index data to match portfolio data length
  const normalizedIndexData = normalizeData(indexData, portfolioData.length);

  // Calculate min and max for scaling (combine both datasets)
  const allValues = [...portfolioData, ...normalizedIndexData];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  // Calculate points for the line
  const points = normalizedIndexData.map((value, index) => {
    const x = (index / (normalizedIndexData.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y, value };
  });

  // Generate path
  const path = points.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    return `${acc} L ${point.x} ${point.y}`;
  }, '');

  // Calculate performance
  const firstValue = normalizedIndexData[0];
  const lastValue = normalizedIndexData[normalizedIndexData.length - 1];
  const performance = firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none'
      }}
    >
      {/* Comparison Line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="4 2"
        opacity={0.8}
      />

      {/* Dots at data points */}
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r={2}
          fill={color}
          opacity={0.6}
        />
      ))}

      {/* Label */}
      {showLabel && (
        <g>
          <text
            x={width - 10}
            y={20}
            textAnchor="end"
            fontSize="11px"
            fill={color}
            fontWeight="600"
          >
            {indexName}
          </text>
          <text
            x={width - 10}
            y={35}
            textAnchor="end"
            fontSize="10px"
            fill={color}
            opacity={0.8}
          >
            {performance >= 0 ? '+' : ''}{performance.toFixed(2)}%
          </text>
        </g>
      )}
    </svg>
  );
};

/**
 * Normalize data to match target length
 * Uses linear interpolation for upsampling or downsampling
 */
function normalizeData(data: number[], targetLength: number): number[] {
  if (data.length === targetLength) {
    return data;
  }

  const result: number[] = [];
  const ratio = (data.length - 1) / (targetLength - 1);

  for (let i = 0; i < targetLength; i++) {
    const index = i * ratio;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    const fraction = index - lowerIndex;

    if (lowerIndex === upperIndex) {
      result.push(data[lowerIndex]);
    } else {
      // Linear interpolation
      const lowerValue = data[lowerIndex];
      const upperValue = data[upperIndex];
      const interpolated = lowerValue + (upperValue - lowerValue) * fraction;
      result.push(interpolated);
    }
  }

  return result;
}
