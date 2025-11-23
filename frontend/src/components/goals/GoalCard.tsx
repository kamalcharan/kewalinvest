// frontend/src/components/goals/GoalCard.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalConfiguration, isTimeBasedGoal, isPriceBasedGoal, isTimeAndPriceGoal } from '../../types/goal.types';
import { useDeleteGoal } from '../../hooks/useGoals';
import { GoalService, SchemeAllocationUtilization } from '../../services/goal.service';
import { useGoalCalculations } from '../../hooks/useGoalCalculations';
import {
  formatCurrency,
  formatDate,
  formatMonths,
  formatPercentage,
  getGoalStatus,
  getGoalActions,
  getGoalTypeIcon,
  getGoalTypeColor,
  getPriorityDisplay
} from '../../utils/goalUtils';

interface GoalCardProps {
  goal: GoalConfiguration;
  onEdit?: (goalId: number) => void;
  onRecalculate?: (goalId: number) => void;
  onToggleWatchlist?: (goalId: number, isInWatchlist: boolean) => void;
  compact?: boolean;
  showAllocations?: boolean;
  hideActions?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onRecalculate,
  onToggleWatchlist,
  compact = false,
  showAllocations = true,
  hideActions = false
}) => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [allocationData, setAllocationData] = useState<SchemeAllocationUtilization[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [assetBreakdown, setAssetBreakdown] = useState<Record<string, number>>({});
  const deleteMutation = useDeleteGoal();

  // Phase 2: Use goal calculations hook
  const { calculations, loading: calcLoading, error: calcError } = useGoalCalculations(goal.id);

  // Color palette for pie chart segments
  const pieColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#EF4444', // Red
    '#84CC16'  // Lime
  ];

  // Phase 2: Fetch asset breakdown when showing allocations
  useEffect(() => {
    if (showAllocations && goal.id) {
      // Use Phase 2 asset breakdown if available
      if (calculations?.asset_breakdown) {
        setAssetBreakdown(calculations.asset_breakdown);
      }
    }
  }, [showAllocations, goal.id, calculations]);

  // Fallback: Fetch allocation utilization data (Phase 1 compatibility)
  useEffect(() => {
    if (showAllocations && goal.customer_id && !calculations) {
      GoalService.getAssetAllocationUtilization(goal.customer_id)
        .then(response => {
          if (response.success && response.data) {
            setAllocationData(response.data);
          }
        })
        .catch(error => {
          console.error('Failed to load allocation data:', error);
        });
    }
  }, [showAllocations, goal.customer_id, calculations]);

  const config = goal.config_data;
  const status = getGoalStatus(goal);
  const actions = getGoalActions(goal);
  const priorityDisplay = getPriorityDisplay(goal.priority);
  const goalTypeIcon = getGoalTypeIcon(config.goal_type);
  const goalTypeColor = getGoalTypeColor(config.goal_type);

  // Helper to get allocation info for a scheme
  const getSchemeAllocationInfo = (schemeCode: string) => {
    return allocationData.find(s => s.scheme_code === schemeCode);
  };

  // Helper to get availability color
  const getAvailabilityColor = (availablePercentage: number): string => {
    if (availablePercentage < 20) return colors.semantic.error;
    if (availablePercentage < 50) return colors.semantic.warning;
    return colors.semantic.success;
  };

  // Helper to create pie chart path
  const createPieSlice = (startAngle: number, endAngle: number, radius: number, cx: number, cy: number): string => {
    const startRadians = (startAngle - 90) * (Math.PI / 180);
    const endRadians = (endAngle - 90) * (Math.PI / 180);

    const x1 = cx + radius * Math.cos(startRadians);
    const y1 = cy + radius * Math.sin(startRadians);
    const x2 = cx + radius * Math.cos(endRadians);
    const y2 = cy + radius * Math.sin(endRadians);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  // Get key metrics based on goal type (Phase 2: Use calculations if available)
  const getKeyMetrics = () => {
    // Phase 2: Use calculations from backend if available
    if (calculations) {
      return {
        primary: formatCurrency(config.target_amount || 0, true),
        primaryLabel: 'Target Amount',
        secondary: formatDate(config.target_date),
        secondaryLabel: 'Target Date',
        progress: calculations.progress_percentage,
        currentAmount: calculations.current_amount,
        projectedAmount: calculations.projected_amount,
        monthlyRequired: calculations.monthly_sip_required,
        isOnTrack: calculations.is_on_track,
        riskLevel: calculations.risk_level,
        shortfallSurplus: calculations.shortfall_surplus
      };
    }

    // Phase 1 Fallback
    if (isTimeBasedGoal(config)) {
      return {
        primary: formatCurrency(config.projected_corpus || 0, true),
        primaryLabel: 'Projected Corpus',
        secondary: formatDate(config.target_date),
        secondaryLabel: 'Target Date',
        progress: null
      };
    }

    if (isPriceBasedGoal(config)) {
      const progress = config.current_value > 0 && config.target_amount > 0
        ? (config.current_value / config.target_amount) * 100
        : 0;

      return {
        primary: formatCurrency(config.target_amount, true),
        primaryLabel: 'Target Amount',
        secondary: config.projected_achievement_date
          ? formatDate(config.projected_achievement_date)
          : 'Calculating...',
        secondaryLabel: 'Expected By',
        progress
      };
    }

    if (isTimeAndPriceGoal(config)) {
      const progress = config.progress_percentage || 0;

      return {
        primary: formatCurrency(config.target_amount, true),
        primaryLabel: 'Target',
        secondary: formatDate(config.target_date),
        secondaryLabel: 'By',
        progress,
        gap: config.corpus_gap,
        probability: config.probability_of_success
      };
    }

    return null;
  };

  const metrics = getKeyMetrics();

  // Handle delete
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ 
        id: goal.id, 
        customerId: goal.customer_id 
      });
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete goal:', error);
    }
  };

  // Icons
  const EditIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );

  const PauseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );

  const PlayIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );

  const StarIcon = ({ filled = false }: { filled?: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  return (
    <>
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${goal.is_active ? colors.utility.primaryText + '10' : colors.utility.secondaryText + '40'}`,
          borderLeft: `4px solid ${goalTypeColor}`,
          borderRadius: '8px',
          padding: '14px 16px',
          transition: 'all 0.2s ease',
          opacity: goal.is_active ? 1 : 0.6,
          minHeight: compact ? '100px' : '140px'
        }}
      >
        {/* HEADER ROW */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
          {/* Left: Icon + Title + Status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {/* Goal Type Icon */}
              <span style={{ fontSize: '18px' }}>{goalTypeIcon}</span>
              
              {/* Title */}
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}>
                {goal.title}
              </div>
              
              {/* Status Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                backgroundColor: status.color + '20',
                border: `1px solid ${status.color}40`,
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600',
                color: status.color,
                whiteSpace: 'nowrap'
              }}>
                <span>{status.icon}</span>
                <span>{status.label}</span>
              </div>
            </div>

            {/* Goal Name (from config) */}
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText,
              marginBottom: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {config.goal_name}
            </div>

            {/* Priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '9px',
                padding: '2px 5px',
                backgroundColor: priorityDisplay.color + '20',
                color: priorityDisplay.color,
                borderRadius: '3px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {priorityDisplay.label}
              </span>
              
              {!goal.is_active && (
                <span style={{
                  fontSize: '9px',
                  padding: '2px 5px',
                  backgroundColor: colors.utility.secondaryText + '20',
                  color: colors.utility.secondaryText,
                  borderRadius: '3px',
                  fontWeight: '500'
                }}>
                  PAUSED
                </span>
              )}
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flexShrink: 0,
            marginLeft: '12px'
          }}>
            {/* Watchlist Toggle */}
            {onToggleWatchlist && (
              <button
                onClick={() => onToggleWatchlist(goal.id, goal.is_in_watchlist || false)}
                title={goal.is_in_watchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                style={{
                  padding: '6px',
                  backgroundColor: goal.is_in_watchlist ? '#F59E0B20' : 'transparent',
                  color: goal.is_in_watchlist ? '#F59E0B' : colors.utility.secondaryText,
                  border: `1px solid ${goal.is_in_watchlist ? '#F59E0B' : colors.utility.secondaryText}40`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '28px',
                  minHeight: '28px'
                }}
              >
                <StarIcon filled={goal.is_in_watchlist} />
              </button>
            )}

            {/* Recalculate */}
            {onRecalculate && (
              <button
                onClick={() => onRecalculate(goal.id)}
                title="Recalculate Goal"
                style={{
                  padding: '6px',
                  backgroundColor: 'transparent',
                  color: colors.brand.primary,
                  border: `1px solid ${colors.brand.primary}40`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '28px',
                  minHeight: '28px'
                }}
              >
                <RefreshIcon />
              </button>
            )}

            {/* View Details */}
            {!hideActions && (
              <button
                onClick={() => navigate(`/customers/${goal.customer_id}/goals/${goal.id}`)}
                title="View Goal Details"
                style={{
                  padding: '6px',
                  backgroundColor: 'transparent',
                  color: colors.semantic.info,
                  border: `1px solid ${colors.semantic.info}40`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '28px',
                  minHeight: '28px'
                }}
              >
                <EditIcon />
              </button>
            )}

            {/* Delete */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Goal"
              style={{
                padding: '6px',
                backgroundColor: 'transparent',
                color: colors.semantic.error,
                border: `1px solid ${colors.semantic.error}40`,
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '28px',
                minHeight: '28px'
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* SINGLE ROW LAYOUT: Left (Primary Metric) | Center (Pie Chart) | Right (Target Date) */}
        {metrics && (
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              justifyContent: 'space-between',
              marginBottom: '10px'
            }}>
              {/* Left: Primary Metric */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
                  {metrics.primaryLabel}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: colors.utility.primaryText }}>
                  {metrics.primary}
                </div>
                {/* Phase 2: Current amount and projected amount */}
                {metrics.currentAmount !== undefined && (
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                    Current: {formatCurrency(metrics.currentAmount, true)} ({formatPercentage(metrics.progress, 1)})
                  </div>
                )}
                {/* Phase 1 Fallback: Current value */}
                {metrics.currentAmount === undefined && metrics.progress !== null && config.current_value !== undefined && (
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                    Current: {formatCurrency(config.current_value, true)} ({formatPercentage(metrics.progress, 1)})
                  </div>
                )}
                {/* Phase 2: Risk Level & Monthly SIP Required */}
                {metrics.riskLevel && metrics.monthlyRequired !== undefined && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '6px',
                    fontSize: '10px'
                  }}>
                    <span style={{
                      padding: '2px 6px',
                      backgroundColor:
                        metrics.riskLevel === 'high' ? '#EF444420' :
                        metrics.riskLevel === 'medium' ? '#F59E0B20' : '#10B98120',
                      color:
                        metrics.riskLevel === 'high' ? '#EF4444' :
                        metrics.riskLevel === 'medium' ? '#F59E0B' : '#10B981',
                      borderRadius: '3px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {metrics.riskLevel} Risk
                    </span>
                    {metrics.monthlyRequired > 0 && (
                      <span style={{ color: colors.utility.secondaryText }}>
                        • ₹{formatCurrency(metrics.monthlyRequired, true)}/mo required
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Center: Pie Chart with Asset Allocation (Phase 2) or Fund Allocation (Phase 1) */}
              {!compact && showAllocations && (
                <>
                  {/* Phase 2: Asset Breakdown */}
                  {Object.keys(assetBreakdown).length > 0 && (() => {
                    const total = Object.values(assetBreakdown).reduce((sum, val) => sum + val, 0);
                    const assetEntries = Object.entries(assetBreakdown).map(([name, value]) => ({
                      name,
                      value,
                      percentage: (value / total) * 100
                    }));

                    return (
                      <div
                        style={{ position: 'relative', flexShrink: 0 }}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                      >
                        <div style={{
                          position: 'relative',
                          width: '80px',
                          height: '80px',
                          cursor: 'pointer'
                        }}>
                          {/* Pie Chart SVG */}
                          <svg width="80" height="80">
                            {assetEntries.map((asset, index) => {
                              let startAngle = 0;
                              for (let i = 0; i < index; i++) {
                                startAngle += (assetEntries[i].percentage / 100) * 360;
                              }
                              const endAngle = startAngle + (asset.percentage / 100) * 360;
                              const sliceColor = pieColors[index % pieColors.length];

                              return (
                                <path
                                  key={asset.name}
                                  d={createPieSlice(startAngle, endAngle, 32, 40, 40)}
                                  fill={sliceColor}
                                  opacity={0.9}
                                />
                              );
                            })}
                            {/* Center white circle to create donut effect */}
                            <circle cx="40" cy="40" r="20" fill={colors.utility.secondaryBackground} />
                          </svg>

                          {/* Center percentage (goal progress) */}
                          {metrics?.progress != null && (
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: '700',
                                color: colors.utility.primaryText,
                                lineHeight: '1'
                              }}>
                                {Math.round(metrics.progress)}%
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tooltip with Asset Breakdown */}
                        {showTooltip && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginTop: '8px',
                            backgroundColor: colors.utility.primaryBackground,
                            border: `1px solid ${colors.utility.primaryText}20`,
                            borderRadius: '8px',
                            padding: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 1000,
                            minWidth: '200px',
                            whiteSpace: 'nowrap'
                          }}>
                            <div style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              color: colors.utility.primaryText,
                              marginBottom: '8px',
                              paddingBottom: '6px',
                              borderBottom: `1px solid ${colors.utility.primaryText}15`
                            }}>
                              Asset Allocation
                            </div>
                            {assetEntries.map((asset, index) => (
                              <div
                                key={asset.name}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  marginBottom: '6px'
                                }}
                              >
                                {/* Color Legend Box */}
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '2px',
                                  backgroundColor: pieColors[index % pieColors.length],
                                  flexShrink: 0
                                }} />
                                {/* Asset Name */}
                                <div style={{
                                  flex: 1,
                                  fontSize: '11px',
                                  color: colors.utility.primaryText,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {asset.name}
                                </div>
                                {/* Value */}
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: colors.utility.primaryText
                                }}>
                                  {formatCurrency(asset.value, true)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Phase 1 Fallback: Scheme Allocation */}
                  {Object.keys(assetBreakdown).length === 0 && config.linked_schemes && config.linked_schemes.length > 0 && (
                    <div
                      style={{ position: 'relative', flexShrink: 0 }}
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    >
                      <div style={{
                        position: 'relative',
                        width: '80px',
                        height: '80px',
                        cursor: 'pointer'
                      }}>
                        {/* Pie Chart SVG */}
                        <svg width="80" height="80">
                          {config.linked_schemes.map((scheme, index) => {
                            let startAngle = 0;
                            for (let i = 0; i < index; i++) {
                              startAngle += (config.linked_schemes[i].allocation_percentage / 100) * 360;
                            }
                            const endAngle = startAngle + (scheme.allocation_percentage / 100) * 360;
                            const sliceColor = pieColors[index % pieColors.length];

                            return (
                              <path
                                key={scheme.scheme_code}
                                d={createPieSlice(startAngle, endAngle, 32, 40, 40)}
                                fill={sliceColor}
                                opacity={0.9}
                              />
                            );
                          })}
                          {/* Center white circle to create donut effect */}
                          <circle cx="40" cy="40" r="20" fill={colors.utility.secondaryBackground} />
                        </svg>

                        {/* Center percentage (goal progress) */}
                        {metrics?.progress != null && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center'
                          }}>
                            <div style={{
                              fontSize: '14px',
                              fontWeight: '700',
                              color: colors.utility.primaryText,
                              lineHeight: '1'
                            }}>
                              {Math.round(metrics.progress)}%
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tooltip with Scheme Breakdown */}
                      {showTooltip && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          marginTop: '8px',
                          backgroundColor: colors.utility.primaryBackground,
                          border: `1px solid ${colors.utility.primaryText}20`,
                          borderRadius: '8px',
                          padding: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                          minWidth: '200px',
                          whiteSpace: 'nowrap'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: colors.utility.primaryText,
                            marginBottom: '8px',
                            paddingBottom: '6px',
                            borderBottom: `1px solid ${colors.utility.primaryText}15`
                          }}>
                            Fund Allocation
                          </div>
                          {config.linked_schemes.map((scheme, index) => (
                            <div
                              key={scheme.scheme_code}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '6px'
                              }}
                            >
                              {/* Color Legend Box */}
                              <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '2px',
                                backgroundColor: pieColors[index % pieColors.length],
                                flexShrink: 0
                              }} />
                              {/* Scheme Name */}
                              <div style={{
                                flex: 1,
                                fontSize: '11px',
                                color: colors.utility.primaryText,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {scheme.scheme_name}
                              </div>
                              {/* Percentage */}
                              <div style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: colors.utility.primaryText
                              }}>
                                {scheme.allocation_percentage}%
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Right: Timeline Slider (replaces target date) */}
              {(isTimeBasedGoal(config) || isTimeAndPriceGoal(config)) && config.target_date && (
                <div style={{
                  flex: 1,
                  minWidth: '200px',
                  maxWidth: '280px'
                }}>
                  {(() => {
                    const startDate = new Date(goal.created_at);
                    const targetDate = new Date(config.target_date);
                    const today = new Date();

                    const totalDays = Math.max(1, Math.floor((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                    const elapsedDays = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                    const progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

                    return (
                      <div>
                        {/* Timeline Bar */}
                        <div style={{
                          position: 'relative',
                          width: '100%',
                          height: '8px',
                          backgroundColor: colors.utility.primaryText + '15',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginBottom: '6px'
                        }}>
                          {/* Progress Fill */}
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${progressPercent}%`,
                            background: `linear-gradient(90deg, ${colors.brand.primary} 0%, ${colors.brand.primary}CC 100%)`,
                            transition: 'width 0.3s ease'
                          }} />

                          {/* Current Position Marker */}
                          <div style={{
                            position: 'absolute',
                            left: `${progressPercent}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '14px',
                            height: '14px',
                            backgroundColor: colors.brand.primary,
                            border: `2px solid ${colors.utility.secondaryBackground}`,
                            borderRadius: '50%',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            zIndex: 1
                          }} />
                        </div>

                        {/* Date Labels */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '10px',
                          color: colors.utility.secondaryText
                        }}>
                          <div style={{ fontWeight: '500' }}>
                            {formatDate(goal.created_at, 'short')}
                          </div>
                          <div style={{ fontWeight: '600', color: colors.utility.primaryText }}>
                            {formatDate(config.target_date, 'short')}
                          </div>
                        </div>

                        {/* Days Remaining */}
                        <div style={{
                          fontSize: '10px',
                          color: colors.utility.secondaryText,
                          textAlign: 'center',
                          marginTop: '4px'
                        }}>
                          {Math.max(0, totalDays - elapsedDays)} days remaining
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* For Price-based goals without target date, show expected date */}
              {isPriceBasedGoal(config) && !isTimeAndPriceGoal(config) && (
                <div style={{
                  textAlign: 'right',
                  alignSelf: 'flex-end',
                  minWidth: '120px'
                }}>
                  <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
                    {metrics.secondaryLabel}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                    {metrics.secondary}
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar (for goals with target amount) */}
            {metrics.progress !== null && (
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: colors.utility.primaryText + '10',
                borderRadius: '3px',
                overflow: 'hidden',
                marginTop: '8px'
              }}>
                <div style={{
                  width: `${Math.min(100, metrics.progress)}%`,
                  height: '100%',
                  backgroundColor: status.color,
                  transition: 'width 0.3s ease',
                  borderRadius: '3px'
                }} />
              </div>
            )}
          </div>
        )}

        {/* ACTIONS / RECOMMENDATIONS */}
        {!compact && actions.length > 0 && actions[0].actionable && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: actions[0].color + '10',
            border: `1px solid ${actions[0].color}40`,
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>{actions[0].icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: colors.utility.primaryText }}>
                  {actions[0].title}
                </div>
                <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginTop: '2px' }}>
                  {actions[0].description}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATUS MESSAGE (compact mode) */}
        {compact && (
          <div style={{
            marginTop: '6px',
            fontSize: '10px',
            color: colors.utility.secondaryText,
            fontStyle: 'italic'
          }}>
            {status.message}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '12px'
            }}>
              Delete Goal?
            </h3>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '20px'
            }}>
              Are you sure you want to delete "{goal.title}"? This will permanently remove the goal and all its history. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.secondaryText}40`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                style={{
                  padding: '8px 16px',
                  backgroundColor: colors.semantic.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  opacity: deleteMutation.isPending ? 0.6 : 1
                }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoalCard;