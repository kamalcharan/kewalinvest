// frontend/src/components/visualizations/chartViewer/charts/BarChartView.tsx
// Bar chart with positive/negative coloring (primarily for returns data)

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import BaseChart from './BaseChart';
import ChartTooltip from './ChartTooltip';
import type { BaseChartViewProps } from '../../../../types/chartViewer.types';
import { formatXAxisDate } from '../../../../utils/formatters';

const BarChartView: React.FC<BaseChartViewProps> = ({
  data,
  config,
  lineColor,
  indexName,
  viewMode
}) => {
  // Get the data key based on view mode
  const dataKey = viewMode === 'returns' ? 'returnValue' : 'displayValue';
  const legendName = viewMode === 'returns' 
    ? `${indexName} Returns`
    : `${indexName} Value`;

  // Determine bar colors based on values
  const barColors = useMemo(() => {
    return data.map(point => {
      const value = viewMode === 'returns' 
        ? (point.returnValue ?? 0)
        : point.value;
      
      return value >= 0 
        ? config.colors.semantic.success 
        : config.colors.semantic.error;
    });
  }, [data, viewMode, config.colors]);

  // Calculate bar size based on data density
  const barSize = useMemo(() => {
    if (data.length > 100) return 8;
    if (data.length > 50) return 12;
    return 20;
  }, [data.length]);

  return (
    <BaseChart config={config}>
      <BarChart
        data={data}
        margin={config.margin}
      >
        <CartesianGrid
          strokeDasharray={config.grid.strokeDasharray}
          stroke={config.grid.stroke}
          strokeOpacity={config.grid.strokeOpacity}
        />
        
        <XAxis
          dataKey="date"
          stroke={config.xAxis.stroke}
          style={config.xAxis.style}
          angle={config.xAxis.angle}
          textAnchor={config.xAxis.textAnchor}
          height={config.xAxis.height}
          interval={config.xAxis.interval}
          tickFormatter={(value) => formatXAxisDate(value, 'daily')}
        />
        
        <YAxis
          stroke={config.yAxis.stroke}
          style={config.yAxis.style}
          domain={config.yAxis.domain}
        />
        
        <Tooltip
          content={
            <ChartTooltip
              colors={config.colors}
              lineColor={lineColor}
              viewMode={viewMode}
            />
          }
        />
        
        <Legend
          wrapperStyle={config.legend.wrapperStyle}
        />

        {/* Zero reference line */}
        <ReferenceLine
          y={0}
          stroke={config.colors.utility.primaryText}
          strokeWidth={2}
          strokeOpacity={0.5}
        />
        
        <Bar
          dataKey={dataKey}
          name={legendName}
          barSize={barSize}
          radius={[4, 4, 0, 0]}
          animationDuration={500}
          animationEasing="ease-in-out"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={barColors[index]} />
          ))}
        </Bar>
      </BarChart>
    </BaseChart>
  );
};

export default BarChartView;