// frontend/src/components/goals/SmartAllocationCard.tsx
import React, { useState, useEffect } from 'react';
import { Percent, TrendingUp, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { GoalService, SchemeAllocationUtilization } from '../../services/goal.service';

interface SmartAllocationCardProps {
  customerId: number;
  selectedSchemeCode?: string;
  onAllocationInfo?: (available: number, allocated: number) => void;
}

export const SmartAllocationCard: React.FC<SmartAllocationCardProps> = ({
  customerId,
  selectedSchemeCode,
  onAllocationInfo
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [utilizationData, setUtilizationData] = useState<SchemeAllocationUtilization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUtilizationData();
  }, [customerId]);

  useEffect(() => {
    if (selectedSchemeCode && utilizationData.length > 0) {
      const scheme = utilizationData.find(s => s.scheme_code === selectedSchemeCode);
      if (scheme && onAllocationInfo) {
        onAllocationInfo(scheme.available_percentage, scheme.allocated_percentage);
      }
    }
  }, [selectedSchemeCode, utilizationData]);

  const loadUtilizationData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await GoalService.getAssetAllocationUtilization(customerId);

      if (response.success && response.data) {
        setUtilizationData(response.data);
      } else {
        setError(response.error || 'Failed to load allocation data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load allocation data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const formatCurrency = (value: number): string => {
    return `₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getAvailabilityStatus = (availablePercentage: number): {
    color: string;
    label: string;
    icon: React.ReactNode;
  } => {
    if (availablePercentage >= 50) {
      return {
        color: colors.semantic.success,
        label: 'High Availability',
        icon: <TrendingUp size={16} />
      };
    } else if (availablePercentage >= 20) {
      return {
        color: colors.semantic.warning,
        label: 'Medium Availability',
        icon: <Percent size={16} />
      };
    } else if (availablePercentage > 0) {
      return {
        color: colors.semantic.error,
        label: 'Low Availability',
        icon: <AlertCircle size={16} />
      };
    } else {
      return {
        color: colors.semantic.error,
        label: 'Fully Allocated',
        icon: <AlertCircle size={16} />
      };
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}
      >
        <p style={{ color: colors.utility.secondaryText, fontSize: '12px', margin: 0 }}>
          Loading allocation data...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: colors.semantic.error + '15',
          border: `1px solid ${colors.semantic.error}40`,
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <AlertCircle size={16} style={{ color: colors.semantic.error }} />
        <p style={{ color: colors.semantic.error, fontSize: '11px', margin: 0 }}>{error}</p>
      </div>
    );
  }

  // If no scheme selected, show summary
  if (!selectedSchemeCode) {
    const totalSchemes = utilizationData.length;
    const fullyAllocated = utilizationData.filter(s => s.is_fully_allocated).length;
    const averageAvailable =
      utilizationData.reduce((sum, s) => sum + s.available_percentage, 0) / totalSchemes || 0;

    return (
      <div
        style={{
          backgroundColor: colors.brand.primary + '10',
          border: `1px solid ${colors.brand.primary}30`,
          borderRadius: '12px',
          padding: '16px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px'
          }}
        >
          <Percent size={16} style={{ color: colors.brand.primary }} />
          <h4
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: 0
            }}
          >
            Smart Allocation Assistant
          </h4>
        </div>

        <p
          style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            marginBottom: '12px',
            lineHeight: '1.5'
          }}
        >
          Select a scheme to see available allocation percentage for this goal.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
              Avg. Available
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: colors.semantic.success }}>
              {formatPercentage(averageAvailable)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
              Fully Allocated
            </div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: colors.semantic.error }}>
              {fullyAllocated}/{totalSchemes}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show allocation for selected scheme
  const selectedScheme = utilizationData.find(s => s.scheme_code === selectedSchemeCode);

  if (!selectedScheme) {
    return (
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center'
        }}
      >
        <p style={{ color: colors.utility.secondaryText, fontSize: '12px', margin: 0 }}>
          No allocation data for this scheme
        </p>
      </div>
    );
  }

  const status = getAvailabilityStatus(selectedScheme.available_percentage);

  return (
    <div
      style={{
        backgroundColor: status.color + '10',
        border: `1px solid ${status.color}40`,
        borderRadius: '12px',
        padding: '16px'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {status.icon}
          <h4
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: 0
            }}
          >
            Allocation Status
          </h4>
        </div>

        <span
          style={{
            padding: '4px 8px',
            backgroundColor: status.color + '20',
            border: `1px solid ${status.color}60`,
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: '600',
            color: status.color
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Scheme Name */}
      <div
        style={{
          fontSize: '11px',
          color: colors.utility.secondaryText,
          marginBottom: '12px'
        }}
      >
        {selectedScheme.scheme_name}
      </div>

      {/* Available Percentage - Large */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '12px',
          padding: '12px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px'
        }}
      >
        <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
          Available for This Goal
        </div>
        <div
          style={{
            fontSize: '32px',
            fontWeight: '700',
            color: status.color,
            lineHeight: '1'
          }}
        >
          {formatPercentage(selectedScheme.available_percentage)}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: colors.utility.secondaryText,
            marginBottom: '4px'
          }}
        >
          <span>Allocated</span>
          <span>{formatPercentage(selectedScheme.allocated_percentage)}</span>
        </div>

        <div
          style={{
            height: '6px',
            backgroundColor: colors.utility.primaryText + '10',
            borderRadius: '3px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(selectedScheme.allocated_percentage, 100)}%`,
              backgroundColor: colors.semantic.warning,
              borderRadius: '3px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      {/* Values */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
            Available Value
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: status.color }}>
            {formatCurrency(selectedScheme.available_value)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: colors.utility.secondaryText, marginBottom: '2px' }}>
            Total Value
          </div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText }}>
            {formatCurrency(selectedScheme.total_portfolio_value)}
          </div>
        </div>
      </div>

      {/* Existing Goal Allocations */}
      {selectedScheme.allocation_breakdown.length > 0 && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${colors.utility.primaryText}10`
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              marginBottom: '8px'
            }}
          >
            Current Allocations:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {selectedScheme.allocation_breakdown.map((alloc) => (
              <div
                key={alloc.goal_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: colors.utility.secondaryText
                }}
              >
                <span>{alloc.goal_name}</span>
                <span style={{ fontWeight: '600' }}>
                  {formatPercentage(alloc.allocation_percentage)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning for low availability */}
      {selectedScheme.available_percentage < 20 && selectedScheme.available_percentage > 0 && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: colors.semantic.warning + '15',
            border: `1px solid ${colors.semantic.warning}40`,
            borderRadius: '6px',
            fontSize: '10px',
            color: colors.utility.secondaryText,
            lineHeight: '1.4'
          }}
        >
          <strong style={{ color: colors.semantic.warning }}>Note:</strong> Limited allocation available.
          Consider selecting a different scheme or adjusting existing goal allocations.
        </div>
      )}

      {/* Fully allocated warning */}
      {selectedScheme.is_fully_allocated && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px',
            backgroundColor: colors.semantic.error + '15',
            border: `1px solid ${colors.semantic.error}40`,
            borderRadius: '6px',
            fontSize: '10px',
            color: colors.utility.secondaryText,
            lineHeight: '1.4'
          }}
        >
          <strong style={{ color: colors.semantic.error }}>Warning:</strong> This scheme is fully allocated.
          Please select a different scheme or reduce allocation from existing goals.
        </div>
      )}
    </div>
  );
};

export default SmartAllocationCard;
