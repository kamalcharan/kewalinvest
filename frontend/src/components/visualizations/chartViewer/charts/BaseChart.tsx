// frontend/src/components/visualizations/chartViewer/charts/BaseChart.tsx
// Common wrapper for all chart types

import React from 'react';
import { ResponsiveContainer } from 'recharts';
import type { ChartConfig } from '../../../../types/chartViewer.types';

interface BaseChartProps {
  children: React.ReactElement;
  config: ChartConfig;
  height?: number;
  minHeight?: number;
}

const BaseChart: React.FC<BaseChartProps> = ({
  children,
  config,
  height = 500,
  minHeight = 400
}) => {
  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        minHeight: `${minHeight}px`,
        padding: '20px',
        backgroundColor: config.colors.utility.primaryBackground,
        borderRadius: '8px'
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
};

export default BaseChart;