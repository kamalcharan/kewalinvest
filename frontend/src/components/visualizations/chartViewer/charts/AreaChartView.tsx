// frontend/src/components/visualizations/chartViewer/charts/AreaChartView.tsx
// Area chart with gradient fill

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import BaseChart from './BaseChart';
import ChartTooltip from './ChartTooltip';
import type { BaseChartViewProps } from '../../../../types/chartViewer.types';
import { getLineStrokeWidth, getAreaGradientId } from '../../../../utils/chartConfig';
import { formatXAxisDate } from '../../../../utils/formatters';

const AreaChartView: React.FC<BaseChartViewProps> = ({
  data,
  config,
  lineColor,
  indexName,
  viewMode
}) => {
  // Stroke width based on data density
  const strokeWidth = useMemo(() => getLineStrokeWidth(data.length), [data.length]);

  // Get the data key based on view mode
  const dataKey = viewMode === 'returns' ? 'returnValue' : 'displayValue';
  const legendName = viewMode === 'returns' 
    ? `${indexName} Returns`
    : `${indexName} Value`;

  // Gradient ID for fill
  const gradientId = useMemo(() => getAreaGradientId(Date.now()), []);

  return (
    <BaseChart config={config}>
      <AreaChart
        data={data}
        margin={config.margin}
      >
        {/* Define gradient */}
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.8} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.1} />
          </linearGradient>
        </defs>

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
        
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={lineColor}
          strokeWidth={strokeWidth}
          fill={`url(#${gradientId})`}
          name={legendName}
          animationDuration={500}
          animationEasing="ease-in-out"
        />
      </AreaChart>
    </BaseChart>
  );
};

export default AreaChartView;