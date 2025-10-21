// frontend/src/components/visualizations/ChartViewer.tsx
// Main chart viewer component - orchestrates all visualization components

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Maximize2, Minimize2 } from 'lucide-react';
import CompactFilterToolbar from './chartViewer/filters/CompactFilterToolbar';
import ChartRenderer from './chartViewer/charts/ChartRenderer';
import DataTable from './chartViewer/table/DataTable';
import ChartExport from './chartViewer/export/ChartExport';
import type { 
  ChartViewerProps, 
  ChartFilters,
  DisplayMode,
  ChartType,
  ViewMode,
  Granularity
} from '../../types/chartViewer.types';
import type { TimePeriod } from '../../utils/timeRangeHelper';
import { prepareChartData } from '../../utils/dataTransformers';
import { getChartConfig } from '../../utils/chartConfig';
import { 
  toggleFullscreen, 
  isFullscreen, 
  onFullscreenChange,
  isFullscreenSupported 
} from '../../utils/fullscreenUtils';

const ChartViewer: React.FC<ChartViewerProps> = ({
  indexName,
  indexId,
  data = [],
  isLoading = false,
  error = null,
  showColorPicker = true,
  allowExport = true,
  
  // Parent-controlled filter values
  chartType: parentChartType,
  viewMode: parentViewMode,
  displayMode: parentDisplayMode,
  granularity: parentGranularity,
  timePeriod: parentTimePeriod,
  customStartDate: parentCustomStartDate,
  customEndDate: parentCustomEndDate,
  lineColor: parentLineColor,
  showVolume: parentShowVolume,
  baselineValue: parentBaselineValue,
  
  // Callbacks
  onChartTypeChange,
  onViewModeChange,
  onDisplayModeChange,
  onGranularityChange,
  onTimePeriodChange,
  onCustomDateApply,
  onColorChange,
  onVolumeToggle,
  onBaselineChange
}) => {
  // Theme integration
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Fullscreen state
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // Local state for filters (if not parent-controlled)
  const [localChartType, setLocalChartType] = useState<ChartType>('line');
  const [localViewMode, setLocalViewMode] = useState<ViewMode>('price');
  const [localDisplayMode, setLocalDisplayMode] = useState<DisplayMode>('graph');
  const [localGranularity, setLocalGranularity] = useState<Granularity>('daily');
  const [localTimePeriod, setLocalTimePeriod] = useState<TimePeriod>('1y');
  const [localCustomStartDate, setLocalCustomStartDate] = useState('');
  const [localCustomEndDate, setLocalCustomEndDate] = useState('');
  const [localLineColor, setLocalLineColor] = useState(colors.brand.primary);
  const [localShowVolume, setLocalShowVolume] = useState(false);
  const [localBaselineValue, setLocalBaselineValue] = useState<number | null>(null);

  // Use parent-controlled values if provided, otherwise use local state
  const chartType = parentChartType ?? localChartType;
  const viewMode = parentViewMode ?? localViewMode;
  const displayMode = parentDisplayMode ?? localDisplayMode;
  const granularity = parentGranularity ?? localGranularity;
  const timePeriod = parentTimePeriod ?? localTimePeriod;
  const customStartDate = parentCustomStartDate ?? localCustomStartDate;
  const customEndDate = parentCustomEndDate ?? localCustomEndDate;
  const lineColor = parentLineColor ?? localLineColor;
  const showVolume = parentShowVolume ?? localShowVolume;
  const baselineValue = parentBaselineValue ?? localBaselineValue;

  // Chart element ID for export and fullscreen
  const chartElementId = `chart-viewer-${indexId}`;

  // Update local line color when theme changes
  useEffect(() => {
    if (!parentLineColor) {
      setLocalLineColor(colors.brand.primary);
    }
  }, [colors.brand.primary, parentLineColor]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenMode(isFullscreen());
    };

    const cleanup = onFullscreenChange(handleFullscreenChange);
    
    return cleanup;
  }, []);

  // Aggregate filters for CompactFilterToolbar
  const filters: ChartFilters = useMemo(() => ({
    chartType,
    viewMode,
    displayMode,
    granularity,
    timePeriod,
    customStartDate,
    customEndDate,
    lineColor,
    showVolume,
    baselineValue
  }), [chartType, viewMode, displayMode, granularity, timePeriod, customStartDate, customEndDate, lineColor, showVolume, baselineValue]);

  // Chart configuration
  const chartConfig = useMemo(() => 
    getChartConfig(colors, data.length),
    [colors, data.length]
  );

  // Process chart data
  const processedData = useMemo(() => 
    prepareChartData(data, viewMode, chartType, baselineValue),
    [data, viewMode, chartType, baselineValue]
  );

  // Filter change handlers
  const handleChartTypeChange = useCallback((type: ChartType) => {
    if (onChartTypeChange) {
      onChartTypeChange(type);
    } else {
      setLocalChartType(type);
    }
  }, [onChartTypeChange]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    } else {
      setLocalViewMode(mode);
    }
  }, [onViewModeChange]);

  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    if (onDisplayModeChange) {
      onDisplayModeChange(mode);
    } else {
      setLocalDisplayMode(mode);
    }
  }, [onDisplayModeChange]);

  const handleGranularityChange = useCallback((gran: Granularity) => {
    if (onGranularityChange) {
      onGranularityChange(gran);
    } else {
      setLocalGranularity(gran);
    }
  }, [onGranularityChange]);

  const handleTimePeriodChange = useCallback((period: TimePeriod) => {
    if (onTimePeriodChange) {
      onTimePeriodChange(period);
    } else {
      setLocalTimePeriod(period);
      if (period !== 'custom') {
        setLocalCustomStartDate('');
        setLocalCustomEndDate('');
      }
    }
  }, [onTimePeriodChange]);

  const handleCustomDateApply = useCallback((startDate: string, endDate: string) => {
    if (onCustomDateApply) {
      onCustomDateApply(startDate, endDate);
    } else {
      setLocalCustomStartDate(startDate);
      setLocalCustomEndDate(endDate);
      setLocalTimePeriod('custom');
    }
  }, [onCustomDateApply]);

  const handleColorChange = useCallback((color: string) => {
    if (onColorChange) {
      onColorChange(color);
    } else {
      setLocalLineColor(color);
    }
  }, [onColorChange]);

  const handleVolumeToggle = useCallback((show: boolean) => {
    if (onVolumeToggle) {
      onVolumeToggle(show);
    } else {
      setLocalShowVolume(show);
    }
  }, [onVolumeToggle]);

  const handleBaselineChange = useCallback((value: number | null) => {
    if (onBaselineChange) {
      onBaselineChange(value);
    } else {
      setLocalBaselineValue(value);
    }
  }, [onBaselineChange]);

  // Fullscreen handler
  const handleFullscreenToggle = useCallback(async () => {
    try {
      await toggleFullscreen(chartElementId);
    } catch (error: any) {
      console.error('Fullscreen toggle failed:', error);
    }
  }, [chartElementId]);

  // Check if fullscreen is supported
  const fullscreenSupported = isFullscreenSupported();

  return (
    <div
      id={chartElementId}
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '12px'
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}
        >
          📊 {indexName} Chart
        </h3>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Fullscreen Button */}
          {fullscreenSupported && displayMode === 'graph' && (
            <button
              onClick={handleFullscreenToggle}
              title={isFullscreenMode ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
              style={{
                padding: '8px 12px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.brand.primary;
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = colors.brand.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                e.currentTarget.style.color = colors.utility.primaryText;
                e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
              }}
            >
              {isFullscreenMode ? (
                <>
                  <Minimize2 size={16} />
                  Exit
                </>
              ) : (
                <>
                  <Maximize2 size={16} />
                  Fullscreen
                </>
              )}
            </button>
          )}

          {/* Export Button */}
          {allowExport && displayMode === 'graph' && (
            <ChartExport
              elementId={chartElementId}
              indexName={indexName}
              colors={colors}
            />
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <CompactFilterToolbar
        filters={filters}
        onFilterChange={{
          chartType: handleChartTypeChange,
          viewMode: handleViewModeChange,
          displayMode: handleDisplayModeChange,
          granularity: handleGranularityChange,
          timePeriod: handleTimePeriodChange,
          customDates: handleCustomDateApply,
          color: handleColorChange,
          volume: handleVolumeToggle,
          baseline: handleBaselineChange
        }}
        colors={colors}
        showColorPicker={showColorPicker}
        allowExport={false} // Export button in header instead
      />

      {/* Error Display */}
      {error && (
        <div
          style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: colors.semantic.error + '10',
            color: colors.semantic.error,
            borderRadius: '6px',
            border: `1px solid ${colors.semantic.error}30`,
            fontSize: '13px'
          }}
        >
          {error}
        </div>
      )}

      {/* Content Area */}
      <div
        style={{
          marginTop: '20px',
          minHeight: '400px',
          border: `1px solid ${colors.utility.primaryText}10`,
          borderRadius: '8px',
          backgroundColor: colors.utility.primaryBackground,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {isLoading ? (
          // Loading State
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '80px',
              color: colors.utility.secondaryText,
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '4px solid transparent',
                borderTop: `4px solid ${colors.brand.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
            <span>Loading chart data...</span>
          </div>
        ) : processedData.length === 0 ? (
          // Empty State
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: colors.utility.secondaryText,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>
              📊
            </div>
            <p
              style={{
                fontSize: '16px',
                fontWeight: '500',
                margin: '0 0 8px 0',
                color: colors.utility.primaryText
              }}
            >
              No Data Available
            </p>
            <p style={{ fontSize: '13px', margin: 0 }}>
              Try selecting a different time period or date range
            </p>
          </div>
        ) : displayMode === 'graph' ? (
          // Chart View
          <ChartRenderer
            chartType={chartType}
            data={processedData}
            config={chartConfig}
            lineColor={lineColor}
            indexName={indexName}
            viewMode={viewMode}
            baselineValue={baselineValue}
          />
        ) : (
          // Table View
          <DataTable
            data={processedData}
            colors={colors}
            viewMode={viewMode}
            pageSize={50}
          />
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ChartViewer;