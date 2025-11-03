// frontend/src/components/performance/IndexComparisonOverlay.tsx
import React from 'react';

// NEW: Date-aware data point interface
interface DataPoint {
  date: string;
  value: number;
}

interface IndexComparisonOverlayProps {
  portfolioData: number[] | DataPoint[];  // Support both old and new format
  indexData: number[] | DataPoint[];      // Support both old and new format
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
  showLabel?: boolean;
  indexName?: string;
  useDateMatching?: boolean;  // NEW: Enable date-based matching
}

export const IndexComparisonOverlay: React.FC<IndexComparisonOverlayProps> = ({
  portfolioData,
  indexData,
  width,
  height,
  color = '#FCD34D', // Yellow/gold color for comparison
  strokeWidth = 2,
  showLabel = true,
  indexName = 'Index',
  useDateMatching = true  // Default to TRUE for date matching
}) => {
  // Ensure both datasets have data
  if (indexData.length === 0 || portfolioData.length === 0) {
    return null;
  }

  // Determine if we're using date-aware data
  const isDateAware = useDateMatching && 
                      isDataPoint(portfolioData[0]) && 
                      isDataPoint(indexData[0]);

  // Get normalized index data
  const normalizedIndexData = isDateAware
    ? matchByDate(portfolioData as DataPoint[], indexData as DataPoint[])
    : normalizeData(
        extractValues(indexData), 
        extractValues(portfolioData).length
      );

  // Get portfolio values for scaling
  const portfolioValues = extractValues(portfolioData);

  // Calculate min and max for scaling (combine both datasets)
  const allValues = [...portfolioValues, ...normalizedIndexData];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  // Calculate points for the line
  const points = normalizedIndexData.map((value, index) => {
    const x = (index / Math.max(normalizedIndexData.length - 1, 1)) * width;
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

// ==================== HELPER FUNCTIONS ====================

/**
 * Type guard to check if data point has date property
 */
function isDataPoint(item: any): item is DataPoint {
  return item && typeof item === 'object' && 'date' in item && 'value' in item;
}

/**
 * Extract values from data (handles both number[] and DataPoint[])
 */
function extractValues(data: number[] | DataPoint[]): number[] {
  if (data.length === 0) return [];
  
  if (typeof data[0] === 'number') {
    return data as number[];
  }
  
  return (data as DataPoint[]).map(d => d.value);
}

/**
 * NEW: Match index data to portfolio dates
 * This is the KEY FIX for the straight line issue
 * 
 * For each portfolio date, find the index value on that same date
 * If exact match not found, use closest date before it
 */
function matchByDate(
  portfolioData: DataPoint[], 
  indexData: DataPoint[]
): number[] {
  const result: number[] = [];

  // Create a map of index data by date for quick lookup
  const indexMap = new Map<string, number>();
  const indexDates: Date[] = [];
  
  indexData.forEach(point => {
    const dateKey = normalizeDate(point.date);
    indexMap.set(dateKey, point.value);
    indexDates.push(new Date(point.date));
  });

  // Sort index dates for binary search
  indexDates.sort((a, b) => a.getTime() - b.getTime());

  // For each portfolio date, find matching index value
  portfolioData.forEach(portfolioPoint => {
    const portfolioDate = new Date(portfolioPoint.date);
    const portfolioDateKey = normalizeDate(portfolioPoint.date);

    // Try exact match first
    if (indexMap.has(portfolioDateKey)) {
      result.push(indexMap.get(portfolioDateKey)!);
      return;
    }

    // Find closest date on or before portfolio date
    let closestValue = indexData[0].value; // Default to first value
    let closestDate: Date | null = null;

    for (const indexDate of indexDates) {
      if (indexDate <= portfolioDate) {
        closestDate = indexDate;
      } else {
        break; // Dates are sorted, no need to continue
      }
    }

    if (closestDate) {
      const closestDateKey = normalizeDate(closestDate.toISOString());
      closestValue = indexMap.get(closestDateKey) || closestValue;
    }

    result.push(closestValue);
  });

  return result;
}

/**
 * Normalize date to YYYY-MM-DD format for comparison
 */
function normalizeDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * LEGACY: Normalize data to match target length
 * Uses linear interpolation for upsampling or downsampling
 * Kept for backward compatibility when useDateMatching=false
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