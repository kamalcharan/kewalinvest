// frontend/src/components/jtbd/JTBDList.tsx

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomerJTBDs } from '../../hooks/useJTBD';
import { JTBDConfiguration } from '../../types/jtbd.types';
import JTBDCard from './JTBDCard';

interface JTBDListProps {
  customerId: number;
  onSetupNew?: () => void;
  onEdit?: (jtbdId: number) => void;
  showFilters?: boolean;
  compact?: boolean;
}

const JTBDList: React.FC<JTBDListProps> = ({
  customerId,
  onSetupNew,
  onEdit,
  showFilters = true,
  compact = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [filterType, setFilterType] = useState<'all' | 'portfolio_alert' | 'time_based' | 'profile_trigger'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Fetch JTBDs
  const { data: jtbds, isLoading, error } = useCustomerJTBDs(customerId);

  // Filter and sort JTBDs
  const filteredJTBDs = useMemo(() => {
    if (!jtbds) return [];

    let filtered = [...jtbds];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(j => j.jtbd_type === filterType);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(j => j.priority === filterPriority);
    }

    // Filter by status
    if (filterStatus === 'active') {
      filtered = filtered.filter(j => j.is_active);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(j => !j.is_active);
    }

    // Sort: critical first, then by next_alert_date
    filtered.sort((a, b) => {
      // Priority order
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Then by date (earliest first)
      if (a.next_alert_date && b.next_alert_date) {
        return new Date(a.next_alert_date).getTime() - new Date(b.next_alert_date).getTime();
      }

      return 0;
    });

    return filtered;
  }, [jtbds, filterType, filterPriority, filterStatus]);

  // Get filter counts
  const filterCounts = useMemo(() => {
    if (!jtbds) return { all: 0, portfolio: 0, time: 0, profile: 0 };

    return {
      all: jtbds.length,
      portfolio: jtbds.filter(j => j.jtbd_type === 'portfolio_alert').length,
      time: jtbds.filter(j => j.jtbd_type === 'time_based').length,
      profile: jtbds.filter(j => j.jtbd_type === 'profile_trigger').length
    };
  }, [jtbds]);

  // Icons
  const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  const TargetIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );

  const FilterIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
    </svg>
  );

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              style={{
                height: '100px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px',
                animation: 'pulse 1.5s ease-in-out infinite',
                opacity: 0.6
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        backgroundColor: colors.semantic.error + '10',
        border: `1px solid ${colors.semantic.error}40`,
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '14px',
          color: colors.semantic.error,
          marginBottom: '12px'
        }}>
          Failed to load alerts: {error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            backgroundColor: colors.semantic.error,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (!jtbds || jtbds.length === 0) {
    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '48px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          color: colors.brand.primary,
          marginBottom: '16px',
          opacity: 0.8,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <TargetIcon />
        </div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          No Alerts Configured Yet
        </h3>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          marginBottom: '24px',
          lineHeight: '1.6'
        }}>
          Set up your first alert to track important events like investment dues, 
          birthdays, anniversaries, or custom reminders.
        </p>
        {onSetupNew && (
          <button
            onClick={onSetupNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <PlusIcon />
            Setup First Alert
          </button>
        )}
      </div>
    );
  }

  // Main render
  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: showFilters ? '16px' : '20px'
      }}>
        <div>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: '0 0 4px 0'
          }}>
            Active Alerts & Reminders
          </h3>
          <p style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            {filteredJTBDs.length} of {jtbds.length} alerts
          </p>
        </div>

        {onSetupNew && (
          <button
            onClick={onSetupNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            <PlusIcon />
            New Alert
          </button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px'
        }}>
          {/* Type Filter */}
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <FilterIcon />
              Filter by Type
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { value: 'all', label: `All (${filterCounts.all})` },
                { value: 'portfolio_alert', label: `Portfolio (${filterCounts.portfolio})` },
                { value: 'time_based', label: `Time-based (${filterCounts.time})` },
                { value: 'profile_trigger', label: `Profile (${filterCounts.profile})` }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setFilterType(option.value as any)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: filterType === option.value ? colors.brand.primary : 'transparent',
                    color: filterType === option.value ? 'white' : colors.utility.secondaryText,
                    border: `1px solid ${filterType === option.value ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority & Status Filters */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {/* Priority */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Priority
              </div>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Status */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Status
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Paused Only</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* JTBD Cards */}
      {filteredJTBDs.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          border: `2px dashed ${colors.utility.primaryText}20`,
          borderRadius: '8px'
        }}>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            No alerts match the selected filters
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredJTBDs.map((jtbd) => (
            <JTBDCard
              key={jtbd.id}
              jtbd={jtbd}
              onEdit={onEdit}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default JTBDList;