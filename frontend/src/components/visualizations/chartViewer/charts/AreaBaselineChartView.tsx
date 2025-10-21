// frontend/src/components/visualizations/chartViewer/charts/AreaBaselineChartView.tsx
// Area chart with baseline and conditional fill (above/below)

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import BaseChart from './BaseChart';
import ChartTooltip from './ChartTooltip';
import type { AreaBaselineChartViewProps } from '../../../../types/chartViewer.types';
import { getLineStrokeWidth } from '../../../../utils/chartConfig';
import { formatXAxisDate } from '../../../../utils/formatters';
import { calculateBaseline } from '../../../../utils/dataTransformers';

const AreaBaselineChartView: React.FC<AreaBaselineChartViewProps> = ({
  data,
  config,
  lineColor,
  indexName,
  viewMode,
  baseline,
  baselineLabel = 'Baseline'
}) => {
  // Stroke width based on data density
  const strokeWidth = useMemo(() => getLineStrokeWidth(data.length), [data.length]);

  // Calculate baseline if not provided
  const effectiveBaseline = useMemo(() => {
    if (baseline !== null && baseline !== undefined) {
      return baseline;
    }
    // Default to first data point value
    return calculateBaseline(data, 'first') || 0;
  }, [baseline, data]);

  // Split data into above and below baseline regions
  const { aboveData, belowData } = useMemo(() => {
    const above = data.map(point => ({
      ...point,
      displayValue: point.value >= effectiveBaseline ? point.value : effectiveBaseline,
      actualValue: point.value
    }));

    const below = data.map(point => ({
      ...point,
      displayValue: point.value < effectiveBaseline ? point.value : effectiveBaseline,
      actualValue: point.value
    }));

    return { aboveData: above, belowData: below };
  }, [data, effectiveBaseline]);

  const dataKey = 'displayValue';
  const legendName = `${indexName} vs ${baselineLabel}`;

  return (
    <BaseChart config={config}>
      <AreaChart
        data={data}
        margin={config.margin}
      >
        {/* Define gradients for above and below baseline */}
        <defs>
          <linearGradient id="colorAbove" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.colors.semantic.success} stopOpacity={0.8} />
            <stop offset="100%" stopColor={config.colors.semantic.success} stopOpacity={0.1} />
          </linearGradient>
          <linearGradient id="colorBelow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.colors.semantic.error} stopOpacity={0.1} />
            <stop offset="100%" stopColor={config.colors.semantic.error} stopOpacity={0.8} />
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

        {/* Baseline reference line */}
        <ReferenceLine
          y={effectiveBaseline}
          stroke={config.colors.utility.secondaryText}
          strokeDasharray="5 5"
          strokeWidth={2}
          label={{
            value: baselineLabel,
            position: 'insideTopRight',
            fill: config.colors.utility.secondaryText,
            fontSize: 12,
            fontWeight: 600
          }}
        />
        
        {/* Area above baseline - green */}
        <Area
          type="monotone"
          data={aboveData}
          dataKey={dataKey}
          stroke={config.colors.semantic.success}
          strokeWidth={strokeWidth}
          fill="url(#colorAbove)"
          name={legendName}
          animationDuration={500}
          animationEasing="ease-in-out"
        />

        {/* Area below baseline - red */}
        <Area
          type="monotone"
          data={belowData}
          dataKey={dataKey}
          stroke={config.colors.semantic.error}
          strokeWidth={strokeWidth}
          fill="url(#colorBelow)"
          name=""
          animationDuration={500}
          animationEasing="ease-in-out"
          legendType="none"
        />
      </AreaChart>
    </BaseChart>
  );
};

export default AreaBaselineChartView;