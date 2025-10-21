// frontend/src/components/visualizations/chartViewer/charts/ChartRenderer.tsx
// Router component that renders the appropriate chart type

import React from 'react';
import LineChartView from './LineChartView';
import AreaChartView from './AreaChartView';
import AreaBaselineChartView from './AreaBaselineChartView';
import BarChartView from './BarChartView';
import type { 
  ChartType, 
  ViewMode,
  ProcessedChartData,
  ChartConfig 
} from '../../../../types/chartViewer.types';

interface ChartRendererProps {
  chartType: ChartType;
  data: ProcessedChartData[];
  config: ChartConfig;
  lineColor: string;
  indexName: string;
  viewMode: ViewMode;
  baselineValue?: number | null;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({
  chartType,
  data,
  config,
  lineColor,
  indexName,
  viewMode,
  baselineValue
}) => {
  // Base props common to all chart types (except AreaBaseline)
  const baseProps = {
    data,
    config,
    lineColor,
    indexName,
    viewMode
  };

  // Route to appropriate chart component
  switch (chartType) {
    case 'line':
      return <LineChartView {...baseProps} />;

    case 'area':
      return <AreaChartView {...baseProps} />;

    case 'areaBaseline':
      return (
        <AreaBaselineChartView
          {...baseProps}
          baseline={baselineValue ?? data[0]?.value ?? 0}
          baselineLabel="Starting Value"
        />
      );

    case 'bar':
      return <BarChartView {...baseProps} />;

    default:
      // Fallback to line chart
      console.warn(`Unknown chart type: ${chartType}, falling back to line chart`);
      return <LineChartView {...baseProps} />;
  }
};

export default ChartRenderer;