// frontend/src/components/goals/GoalProgressChart.tsx

import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useGoal, useGoalHistory } from '../../hooks/useGoals';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency, formatDate } from '../../utils/goalUtils';
import { isTimeAndPriceGoal } from '../../types/goal.types';

interface GoalProgressChartProps {
  goalId: number;
  height?: number;
  showProjection?: boolean;
  showLegend?: boolean;
}

const GoalProgressChart: React.FC<GoalProgressChartProps> = ({
  goalId,
  height = 300,
  showProjection = true,
  showLegend = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const { data: goal, isLoading: goalLoading, error: goalError } = useGoal(goalId);
  const { data: history, isLoading: historyLoading, error: historyError } = useGoalHistory(goalId);

  // Transform history data for chart
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    return history.map(snapshot => {
      const date = new Date(snapshot.snapshot_date);
      
      return {
        date: snapshot.snapshot_date,
        dateFormatted: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        current_value: snapshot.current_value,
        projected_corpus: snapshot.projected_corpus || snapshot.current_value,
        // Add target value if available
        timestamp: date.getTime()
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }, [history]);

  // Add target reference line if time & price goal
  const targetAmount = goal && isTimeAndPriceGoal(goal.config_data) 
    ? goal.config_data.target_amount 
    : null;

  // Loading state
  if (goalLoading || historyLoading) {
    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderRadius: '8px',
        padding: '20px',
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.utility.secondaryText
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Loading chart data...</div>
          <div style={{
            width: '32px',
            height: '32px',
            margin: '0 auto',
            border: `2px solid ${colors.utility.primaryText}20`,
            borderTopColor: colors.brand.primary,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
        </div>
      </div>
    );
  }

  // Error state
  if (goalError || historyError) {
    return (
      <div style={{
        backgroundColor: colors.semantic.error + '10',
        border: `1px solid ${colors.semantic.error}40`,
        borderRadius: '8px',
        padding: '20px',
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.semantic.error
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '600' }}>Failed to load chart</div>
          <div style={{ fontSize: '12px', marginTop: '4px', color: colors.utility.secondaryText }}>
            Please try again later
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!chartData || chartData.length === 0) {
    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `2px dashed ${colors.utility.primaryText}20`,
        borderRadius: '8px',
        padding: '20px',
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '4px' }}>
            No History Available
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
            Progress data will appear as goal is updated
          </div>
        </div>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div style={{
          backgroundColor: colors.utility.primaryBackground,
          border: `1px solid ${colors.utility.primaryText}20`,
          borderRadius: '6px',
          padding: '10px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{
            fontSize: '11px',
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            fontWeight: '500'
          }}>
            {data.dateFormatted}
          </div>
          {payload.map((entry: any, idx: number) => (
            <div key={idx} style={{
              fontSize: '12px',
              color: entry.color,
              fontWeight: '600',
              marginBottom: idx < payload.length - 1 ? '4px' : '0'
            }}>
              {entry.name}: {formatCurrency(entry.value, true)}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      border: `1px solid ${colors.utility.primaryText}10`,
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            Progress Over Time
          </div>
          <div style={{
            fontSize: '11px',
            color: colors.utility.secondaryText,
            marginTop: '2px'
          }}>
            {chartData.length} monthly snapshots
          </div>
        </div>

        {/* Statistics */}
        <div style={{
          display: 'flex',
          gap: '16px'
        }}>
          {/* Latest Value */}
          {chartData.length > 0 && (
            <div>
              <div style={{
                fontSize: '10px',
                color: colors.utility.secondaryText,
                marginBottom: '2px'
              }}>
                Latest Value
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '700',
                color: colors.brand.primary
              }}>
                {formatCurrency(chartData[chartData.length - 1].current_value, true)}
              </div>
            </div>
          )}

          {/* Growth */}
          {chartData.length > 1 && (
            <div>
              <div style={{
                fontSize: '10px',
                color: colors.utility.secondaryText,
                marginBottom: '2px'
              }}>
                Growth
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '700',
                color: chartData[chartData.length - 1].current_value > chartData[0].current_value 
                  ? '#10B981' 
                  : '#F59E0B'
              }}>
                +{formatCurrency(
                  chartData[chartData.length - 1].current_value - chartData[0].current_value,
                  true
                )}
              </div>
            </div>
          )}

          {/* Target (if applicable) */}
          {targetAmount && (
            <div>
              <div style={{
                fontSize: '10px',
                color: colors.utility.secondaryText,
                marginBottom: '2px'
              }}>
                Target
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '700',
                color: colors.utility.primaryText
              }}>
                {formatCurrency(targetAmount, true)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Container */}
      <div style={{
        width: '100%',
        height: `${height}px`,
        overflow: 'hidden'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.utility.primaryText + '15'}
              vertical={false}
            />

            <XAxis
              dataKey="dateFormatted"
              stroke={colors.utility.secondaryText}
              style={{ fontSize: '11px' }}
              interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
            />

            <YAxis
              stroke={colors.utility.secondaryText}
              style={{ fontSize: '11px' }}
              tickFormatter={(value) => {
                if (value >= 10000000) return `₹${(value / 10000000).toFixed(0)}Cr`;
                if (value >= 100000) return `₹${(value / 100000).toFixed(0)}L`;
                return `₹${(value / 1000).toFixed(0)}K`;
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Legend */}
            {showLegend && (
              <Legend
                wrapperStyle={{
                  paddingTop: '12px',
                  fontSize: '12px',
                  color: colors.utility.secondaryText
                }}
                iconType="line"
              />
            )}

            {/* Target Reference Line (for Time & Price goals) */}
            {targetAmount && (
              <ReferenceLine
                y={targetAmount}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                label={{
                  value: `Target: ${formatCurrency(targetAmount, true)}`,
                  position: 'right',
                  fill: '#F59E0B',
                  fontSize: 11,
                  offset: 10
                }}
              />
            )}

            {/* Current Value Line */}
            <Line
              type="monotone"
              dataKey="current_value"
              stroke={colors.brand.primary}
              strokeWidth={2.5}
              dot={{ fill: colors.brand.primary, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="Current Value"
              isAnimationActive={true}
            />

            {/* Projected Corpus Line (if different from current) */}
            {showProjection && (
              <Line
                type="monotone"
                dataKey="projected_corpus"
                stroke="#10B981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#10B981', r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                name="Projected Corpus"
                isAnimationActive={true}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '12px',
        padding: '10px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '6px',
        fontSize: '11px',
        color: colors.utility.secondaryText
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '8px',
              height: '2px',
              backgroundColor: colors.brand.primary
            }} />
            <span>Current Value</span>
          </div>
          {showProjection && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '8px',
                height: '2px',
                backgroundColor: '#10B981',
                borderTop: '1px dashed #10B981'
              }} />
              <span>Projected</span>
            </div>
          )}
          {targetAmount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '8px',
                height: '2px',
                backgroundColor: '#F59E0B',
                borderTop: '1px dashed #F59E0B'
              }} />
              <span>Target</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default GoalProgressChart;