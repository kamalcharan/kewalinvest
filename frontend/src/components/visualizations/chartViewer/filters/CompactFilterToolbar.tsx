// frontend/src/components/visualizations/chartViewer/filters/CompactFilterToolbar.tsx
// Main toolbar assembling all filter components

import React from 'react';
import ViewModeToggle from './ViewModeToggle';
import GranularitySelector from './GranularitySelector';
import ChartTypeSelector from './ChartTypeSelector';
import ViewModeSelector from './ViewModeSelector';
import TimePeriodSelector from './TimePeriodSelector';
import CustomDatePopover from './CustomDatePopover';
import ColorPickerPopover from './ColorPickerPopover';
import type { CompactFilterToolbarProps } from '../../../../types/chartViewer.types';

const CompactFilterToolbar: React.FC<CompactFilterToolbarProps> = ({
  filters,
  onFilterChange,
  colors,
  showColorPicker = true,
  allowExport = false,
  onExport
}) => {
  // Separator component
  const Separator = () => (
    <div
      style={{
        width: '1px',
        height: '28px',
        backgroundColor: colors.utility.primaryText + '20',
        margin: '0 8px'
      }}
      role="separator"
      aria-orientation="vertical"
    />
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '8px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}
    >
      {/* Main Filter Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          rowGap: '12px'
        }}
      >
        {/* Section 1: Display Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              minWidth: '40px'
            }}
          >
            View:
          </span>
          <ViewModeToggle
            value={filters.displayMode}
            onChange={onFilterChange.displayMode}
            colors={colors}
          />
        </div>

        <Separator />

        {/* Section 2: Data View Mode & Chart Type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              minWidth: '40px'
            }}
          >
            Data:
          </span>
          <ViewModeSelector
            value={filters.viewMode}
            onChange={onFilterChange.viewMode}
            colors={colors}
          />
          <ChartTypeSelector
            value={filters.chartType}
            onChange={onFilterChange.chartType}
            colors={colors}
            viewMode={filters.viewMode}
          />
        </div>

        <Separator />

        {/* Section 3: Granularity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              minWidth: '70px'
            }}
          >
            Interval:
          </span>
          <GranularitySelector
            value={filters.granularity}
            onChange={onFilterChange.granularity}
            colors={colors}
          />
        </div>

        <Separator />

        {/* Section 4: Color Picker */}
        {showColorPicker && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  minWidth: '45px'
                }}
              >
                Color:
              </span>
              <ColorPickerPopover
                color={filters.lineColor}
                onChange={onFilterChange.color}
                colors={colors}
              />
            </div>
            <Separator />
          </>
        )}

        {/* Section 5: Export (if enabled) */}
        {allowExport && onExport && (
          <>
            <button
              onClick={onExport}
              title="Export chart as PNG"
              aria-label="Export chart as PNG"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                minHeight: '32px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                e.currentTarget.style.borderColor = colors.brand.primary + '50';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
              }}
            >
              📸 Export
            </button>
          </>
        )}
      </div>

      {/* Time Period Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: '600',
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            minWidth: '50px'
          }}
        >
          Period:
        </span>
        
        <TimePeriodSelector
          value={filters.timePeriod}
          onChange={onFilterChange.timePeriod}
          colors={colors}
        />

        {/* Custom Date Popover - shows when needed */}
        <CustomDatePopover
          startDate={filters.customStartDate}
          endDate={filters.customEndDate}
          onApply={onFilterChange.customDates}
          colors={colors}
          isActive={filters.timePeriod === 'custom'}
        />
      </div>

      {/* Active Filter Summary (Optional) */}
      {filters.timePeriod === 'custom' && filters.customStartDate && filters.customEndDate && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: colors.semantic.info + '10',
            border: `1px solid ${colors.semantic.info}30`,
            borderRadius: '6px',
            fontSize: '12px',
            color: colors.semantic.info,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ fontWeight: '600' }}>Custom Range:</span>
          <span>
            {new Date(filters.customStartDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
          <span>→</span>
          <span>
            {new Date(filters.customEndDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>
      )}
    </div>
  );
};

export default CompactFilterToolbar;