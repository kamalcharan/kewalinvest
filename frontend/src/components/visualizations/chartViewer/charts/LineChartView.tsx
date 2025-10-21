// frontend/src/components/visualizations/chartViewer/charts/LineChartView.tsx
// Line chart implementation

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import BaseChart from './BaseChart';
import ChartTooltip from './ChartTooltip';
import type { BaseChartViewProps } from '../../../../types/chartViewer.types';
import { getLineStrokeWidth, getDotConfig } from '../../../../utils/chartConfig';
import { formatXAxisDate } from '../../../../utils/formatters';

const LineChartView: React.FC<BaseChartViewProps> = ({
  data,
  config,
  lineColor,
  indexName,
  viewMode
}) => {
  // Determine dot and stroke width based on data density
  const dotConfig = useMemo(() => getDotConfig(data.length), [data.length]);
  const strokeWidth = useMemo(() => getLineStrokeWidth(data.length), [data.length]);

  // Get the data key based on view mode
  const dataKey = viewMode === 'returns' ? 'returnValue' : 'displayValue';
  const legendName = viewMode === 'returns' 
    ? `${indexName} Returns`
    : `${indexName} Value`;

  return (
    <BaseChart config={config}>
      <LineChart
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
        
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={lineColor}
          strokeWidth={strokeWidth}
          dot={dotConfig.show ? { fill: lineColor, r: dotConfig.radius } : false}
          activeDot={{ r: 6, fill: lineColor }}
          name={legendName}
          animationDuration={500}
          animationEasing="ease-in-out"
        />
      </LineChart>
    </BaseChart>
  );
};

export default LineChartView;