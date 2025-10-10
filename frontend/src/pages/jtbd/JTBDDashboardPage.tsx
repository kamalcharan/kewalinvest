// frontend/src/pages/jtbd/JTBDDashboardPage.tsx

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useUpcomingAlerts, useAlertsByDate } from '../../hooks/useJTBD';
import DashboardStatCard from '../../components/jtbd/dashboard/DashboardStatCard';
import DashboardFilters from '../../components/jtbd/dashboard/DashboardFilters';
import CommunicationList from '../../components/jtbd/dashboard/CommunicationList';
import CalendarView from '../../components/jtbd/dashboard/CalendarView';
import AlertDetailsPanel from '../../components/jtbd/dashboard/AlertDetailsPanel';
import { JTBDWithCommunication } from '../../types/jtbd.types';
import { calculateDashboardStats } from '../../utils/jtbd.helpers';
import JTBDService from '../../services/jtbd.service';

const JTBDDashboardPage: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Filter states
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'overdue' | 'custom'>('30days');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [jtbdTypeFilter, setJtbdTypeFilter] = useState<string>('');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<JTBDWithCommunication | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Calculate parameters based on time range
  const apiParams = useMemo(() => {
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      // Use custom date range
      return {
        startDate: customStartDate,
        endDate: customEndDate,
        daysAhead: undefined,
        status: undefined
      };
    } else if (timeRange === 'overdue') {
      // Use overdue status
      return {
        startDate: undefined,
        endDate: undefined,
        daysAhead: undefined,
        status: 'overdue' as const
      };
    } else {
      // Use preset days ahead
      const daysMap = {
        today: 1,
        '7days': 7,
        '30days': 30
      };
      return {
        startDate: undefined,
        endDate: undefined,
        daysAhead: daysMap[timeRange as keyof typeof daysMap] || 30,
        status: undefined
      };
    }
  }, [timeRange, customStartDate, customEndDate]);

  console.log('📊 Dashboard params:', { timeRange, apiParams });

  // Fetch alerts data
  const { data: alerts, isLoading, error } = useUpcomingAlerts(
    apiParams.daysAhead,
    priorityFilter as any,
    jtbdTypeFilter as any,
    apiParams.status,
    apiParams.startDate,
    apiParams.endDate
  );

  // Calculate date range for calendar view
  const [currentMonth] = useState(new Date());
  const calendarStart = useMemo(() => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    return JTBDService.formatDateToYYYYMMDD(date);
  }, [currentMonth]);
  
  const calendarEnd = useMemo(() => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    return JTBDService.formatDateToYYYYMMDD(date);
  }, [currentMonth]);

  // Fetch calendar data (only when calendar view is active)
  const { data: alertsByDate } = useAlertsByDate(
    calendarStart,
    calendarEnd,
    view === 'calendar'
  );

  // Calculate statistics including JTBD type breakdown
  const stats = useMemo(() => {
    if (!alerts) return {
      total: 0,
      critical: 0,
      today: 0,
      overdue: 0,
      scheduled: 0,
      sent: 0,
      byType: {
        portfolio_alert: 0,
        time_based: 0,
        profile_trigger: 0
      }
    };
    
    const baseStats = calculateDashboardStats(alerts);
    
    // Add JTBD type breakdown
    return {
      ...baseStats,
      byType: {
        portfolio_alert: alerts.filter(a => a.jtbd_type === 'portfolio_alert').length,
        time_based: alerts.filter(a => a.jtbd_type === 'time_based').length,
        profile_trigger: alerts.filter(a => a.jtbd_type === 'profile_trigger').length
      }
    };
  }, [alerts]);

  // Filter alerts based on active filters
  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];

    let filtered = [...alerts];

    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter(a => a.priority === priorityFilter);
    }

    // Apply JTBD type filter
    if (jtbdTypeFilter) {
      filtered = filtered.filter(a => a.jtbd_type === jtbdTypeFilter);
    }

    // Apply communication status filter
    if (statusFilter) {
      filtered = filtered.filter(a => a.communication_status === statusFilter);
    }

    // Apply stat card filter
    if (activeStatFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (activeStatFilter) {
        case 'critical':
          filtered = filtered.filter(a => a.priority === 'critical');
          break;
        case 'today':
          filtered = filtered.filter(a => {
            if (!a.next_alert_date) return false;
            const alertDate = new Date(a.next_alert_date);
            alertDate.setHours(0, 0, 0, 0);
            return alertDate.getTime() === today.getTime();
          });
          break;
        case 'overdue':
          filtered = filtered.filter(a => {
            if (!a.next_alert_date) return false;
            return new Date(a.next_alert_date) < today;
          });
          break;
        case 'scheduled':
          filtered = filtered.filter(a => a.communication_status === 'scheduled');
          break;
        case 'sent':
          filtered = filtered.filter(a => a.communication_status === 'sent');
          break;
        case 'portfolio_alert':
          filtered = filtered.filter(a => a.jtbd_type === 'portfolio_alert');
          break;
        case 'time_based':
          filtered = filtered.filter(a => a.jtbd_type === 'time_based');
          break;
        case 'profile_trigger':
          filtered = filtered.filter(a => a.jtbd_type === 'profile_trigger');
          break;
      }
    }

    return filtered;
  }, [alerts, priorityFilter, jtbdTypeFilter, statusFilter, activeStatFilter]);

  // Handle stat card click
  const handleStatCardClick = (filterType: string) => {
    if (activeStatFilter === filterType) {
      setActiveStatFilter(null);
    } else {
      setActiveStatFilter(filterType);
    }
  };

  // Handle alert click
  const handleAlertClick = (alertId: number) => {
    const alert = alerts?.find(a => a.id === alertId);
    if (alert) {
      setSelectedAlert(alert);
      setIsPanelOpen(true);
    }
  };

  // Handle customer click
  const handleCustomerClick = (customerId: number) => {
    window.location.href = `/customers/${customerId}`;
  };

  // Handle calendar date click
  const handleDateClick = (date: string) => {
    console.log('Date clicked:', date);
    // Could navigate to that specific date or filter alerts
  };

  // Handle date range change
  const handleDateRangeChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    
    // Auto-set time range to custom if valid dates provided
    if (start && end && timeRange !== 'custom') {
      setTimeRange('custom');
    }
  };

  // Icons
  const BellIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );

  return (
    <div style={{ 
      padding: '24px',
      backgroundColor: colors.utility.primaryBackground,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ 
            color: colors.brand.primary,
            display: 'flex',
            alignItems: 'center'
          }}>
            <BellIcon />
          </div>
          JTBD Dashboard
        </h1>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          margin: 0
        }}>
          Monitor alerts and communication status across all customers
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: colors.semantic.error + '10',
          border: `2px solid ${colors.semantic.error}40`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.semantic.error,
              marginBottom: '4px'
            }}>
              Failed to Load Alerts
            </div>
            <div style={{
              fontSize: '13px',
              color: colors.utility.secondaryText
            }}>
              {error.message || 'An error occurred while fetching alerts'}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards Row 1: Communication Status */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <DashboardStatCard
          icon="📊"
          value={stats.total}
          label="Total Alerts"
          color={colors.brand.primary}
          onClick={() => handleStatCardClick('total')}
          isActive={activeStatFilter === 'total'}
        />
        <DashboardStatCard
          icon="🔴"
          value={stats.critical}
          label="Critical"
          color="#DC2626"
          onClick={() => handleStatCardClick('critical')}
          isActive={activeStatFilter === 'critical'}
        />
        <DashboardStatCard
          icon="📍"
          value={stats.today}
          label="Today"
          color="#3B82F6"
          onClick={() => handleStatCardClick('today')}
          isActive={activeStatFilter === 'today'}
        />
        <DashboardStatCard
          icon="⚠️"
          value={stats.overdue}
          label="Overdue"
          color="#F59E0B"
          onClick={() => handleStatCardClick('overdue')}
          isActive={activeStatFilter === 'overdue'}
        />
        <DashboardStatCard
          icon="📅"
          value={stats.scheduled}
          label="Scheduled"
          color="#8B5CF6"
          onClick={() => handleStatCardClick('scheduled')}
          isActive={activeStatFilter === 'scheduled'}
        />
        <DashboardStatCard
          icon="✓"
          value={stats.sent}
          label="Sent"
          color="#10B981"
          onClick={() => handleStatCardClick('sent')}
          isActive={activeStatFilter === 'sent'}
        />
      </div>

      {/* Statistics Cards Row 2: JTBD Type Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <DashboardStatCard
          icon="💼"
          value={stats.byType.portfolio_alert}
          label="Portfolio Alerts"
          color="#2563EB"
          onClick={() => handleStatCardClick('portfolio_alert')}
          isActive={activeStatFilter === 'portfolio_alert'}
        />
        <DashboardStatCard
          icon="📆"
          value={stats.byType.time_based}
          label="Time-Based Alerts"
          color="#7C3AED"
          onClick={() => handleStatCardClick('time_based')}
          isActive={activeStatFilter === 'time_based'}
        />
        <DashboardStatCard
          icon="👤"
          value={stats.byType.profile_trigger}
          label="Profile Triggers"
          color="#EC4899"
          onClick={() => handleStatCardClick('profile_trigger')}
          isActive={activeStatFilter === 'profile_trigger'}
        />
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '24px' }}>
        <DashboardFilters
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          startDate={customStartDate}
          endDate={customEndDate}
          onDateRangeChange={handleDateRangeChange}
          priority={priorityFilter}
          onPriorityChange={setPriorityFilter}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          view={view}
          onViewChange={setView}
        />
        
        {/* JTBD Type Filter */}
        <div style={{
          marginTop: '12px',
          padding: '12px 16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: colors.utility.secondaryText,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Alert Type Filter
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { value: '', label: 'All Types', icon: '🎯' },
              { value: 'portfolio_alert', label: 'Portfolio', icon: '💼' },
              { value: 'time_based', label: 'Time-Based', icon: '📆' },
              { value: 'profile_trigger', label: 'Profile', icon: '👤' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setJtbdTypeFilter(option.value)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: jtbdTypeFilter === option.value ? colors.brand.primary : 'transparent',
                  color: jtbdTypeFilter === option.value ? 'white' : colors.utility.primaryText,
                  border: `1px solid ${jtbdTypeFilter === option.value ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (jtbdTypeFilter !== option.value) {
                    e.currentTarget.style.backgroundColor = colors.utility.primaryText + '05';
                  }
                }}
                onMouseLeave={(e) => {
                  if (jtbdTypeFilter !== option.value) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filter Indicator */}
      {(activeStatFilter || priorityFilter || jtbdTypeFilter || statusFilter) && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: colors.brand.primary + '10',
          border: `1px solid ${colors.brand.primary}40`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: colors.brand.primary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <span>🔍 Active Filters:</span>
            {activeStatFilter && (
              <span style={{
                padding: '4px 8px',
                backgroundColor: colors.brand.primary + '20',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {activeStatFilter.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {priorityFilter && (
              <span style={{
                padding: '4px 8px',
                backgroundColor: colors.brand.primary + '20',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                Priority: {priorityFilter}
              </span>
            )}
            {jtbdTypeFilter && (
              <span style={{
                padding: '4px 8px',
                backgroundColor: colors.brand.primary + '20',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                Type: {jtbdTypeFilter.replace('_', ' ')}
              </span>
            )}
            {statusFilter && (
              <span style={{
                padding: '4px 8px',
                backgroundColor: colors.brand.primary + '20',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                Status: {statusFilter}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setActiveStatFilter(null);
              setPriorityFilter('');
              setJtbdTypeFilter('');
              setStatusFilter('');
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.brand.primary}`,
              borderRadius: '6px',
              color: colors.brand.primary,
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.brand.primary;
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = colors.brand.primary;
            }}
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Date Range Display */}
      {timeRange === 'custom' && customStartDate && customEndDate && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: colors.semantic.info + '10',
          border: `1px solid ${colors.semantic.info}40`,
          borderRadius: '8px',
          fontSize: '13px',
          color: colors.semantic.info,
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>📅</span>
          <span>
            Custom Date Range: {new Date(customStartDate).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })} 
            {' → '}
            {new Date(customEndDate).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })}
          </span>
        </div>
      )}

      {/* Main Content */}
      {view === 'list' ? (
        <CommunicationList
          alerts={filteredAlerts}
          isLoading={isLoading}
          onAlertClick={handleAlertClick}
          onCustomerClick={handleCustomerClick}
        />
      ) : (
        <CalendarView
          alertsByDate={alertsByDate || []}
          onDateClick={handleDateClick}
          currentMonth={currentMonth}
        />
      )}

      {/* Alert Details Panel */}
      <AlertDetailsPanel
        alert={selectedAlert}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedAlert(null);
        }}
      />
    </div>
  );
};

export default JTBDDashboardPage;