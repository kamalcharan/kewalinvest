// frontend/src/components/jtbd/JTBDExecutionTimeline.tsx
// Unified timeline showing ALL execution types (meetings, SIP plans, alerts)

import React, { useState, useMemo } from 'react';
import { Plus, Calendar, Filter } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useJTBDExecutions } from '../../hooks/useJTBD';
import { JTBDExecutionCard } from './JTBDExecutionCard';
import { CreateMeetingModal } from '../meetings/CreateMeetingModal';
import type { JTBDExecution, ExecutionFilters } from '../../types/jtbd.types';
import { JTBD_TYPE, EXECUTION_STATUS } from '../../constants/jtbd.constants';

interface JTBDExecutionTimelineProps {
  customerId: number;
}

type FilterTab = 'upcoming' | 'due' | 'completed' | 'overdue';
type ExecutionTypeFilter = 'all' | 'meetings' | 'sip_plans' | 'alerts';

export const JTBDExecutionTimeline: React.FC<JTBDExecutionTimelineProps> = ({ customerId }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');
  const [typeFilter, setTypeFilter] = useState<ExecutionTypeFilter>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch all executions for this customer
  const { data: executionsData, isLoading, refetch } = useJTBDExecutions({
    customer_id: customerId,
  });

  const executions = executionsData?.executions || [];

  // Filter and group executions
  const { filteredExecutions, groupedByDate } = useMemo(() => {
    let filtered = [...executions];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter by status tab
    switch (activeTab) {
      case 'upcoming':
        filtered = filtered.filter(ex => {
          const isPlannedOrDue = ex.execution_status === EXECUTION_STATUS.PLANNED ||
                                  ex.execution_status === EXECUTION_STATUS.DUE;
          const scheduledDate = new Date(ex.scheduled_date);
          scheduledDate.setHours(0, 0, 0, 0);
          return isPlannedOrDue && scheduledDate >= today;
        });
        break;
      case 'due':
        filtered = filtered.filter(ex => {
          const scheduledDate = new Date(ex.scheduled_date);
          scheduledDate.setHours(0, 0, 0, 0);
          return ex.execution_status === EXECUTION_STATUS.DUE ||
                 (scheduledDate.getTime() === today.getTime() &&
                  ex.execution_status === EXECUTION_STATUS.PLANNED);
        });
        break;
      case 'overdue':
        filtered = filtered.filter(ex => {
          const scheduledDate = new Date(ex.scheduled_date);
          scheduledDate.setHours(0, 0, 0, 0);
          return (ex.execution_status === EXECUTION_STATUS.PLANNED ||
                  ex.execution_status === EXECUTION_STATUS.DUE) &&
                 scheduledDate < today;
        });
        break;
      case 'completed':
        filtered = filtered.filter(ex =>
          ex.execution_status === EXECUTION_STATUS.COMPLETED ||
          ex.execution_status === EXECUTION_STATUS.CANCELLED ||
          ex.execution_status === EXECUTION_STATUS.NOT_EXECUTED
        );
        break;
    }

    // Filter by type
    if (typeFilter !== 'all') {
      switch (typeFilter) {
        case 'meetings':
          filtered = filtered.filter(ex =>
            ex.execution_type === JTBD_TYPE.CLIENT_MEETING ||
            ex.execution_type === JTBD_TYPE.PORTFOLIO_REVIEW ||
            ex.execution_type === JTBD_TYPE.GOAL_REVIEW
          );
          break;
        case 'sip_plans':
          filtered = filtered.filter(ex =>
            ex.execution_type === JTBD_TYPE.GOAL_SIP_PLAN
          );
          break;
        case 'alerts':
          filtered = filtered.filter(ex =>
            ex.execution_type === JTBD_TYPE.TIME_BASED ||
            ex.execution_type === JTBD_TYPE.PROFILE_TRIGGER ||
            ex.execution_type === JTBD_TYPE.PORTFOLIO_ALERT
          );
          break;
      }
    }

    // Sort by scheduled date
    filtered.sort((a, b) => {
      const dateA = new Date(a.scheduled_date).getTime();
      const dateB = new Date(b.scheduled_date).getTime();
      return dateA - dateB;
    });

    // Group by date
    const grouped: Record<string, JTBDExecution[]> = {};
    filtered.forEach(ex => {
      const dateKey = ex.scheduled_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(ex);
    });

    return { filteredExecutions: filtered, groupedByDate: grouped };
  }, [executions, activeTab, typeFilter]);

  // Calculate counts
  const counts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      upcoming: executions.filter(ex => {
        const isPlannedOrDue = ex.execution_status === EXECUTION_STATUS.PLANNED ||
                                ex.execution_status === EXECUTION_STATUS.DUE;
        const scheduledDate = new Date(ex.scheduled_date);
        scheduledDate.setHours(0, 0, 0, 0);
        return isPlannedOrDue && scheduledDate >= today;
      }).length,
      due: executions.filter(ex => {
        const scheduledDate = new Date(ex.scheduled_date);
        scheduledDate.setHours(0, 0, 0, 0);
        return ex.execution_status === EXECUTION_STATUS.DUE ||
               (scheduledDate.getTime() === today.getTime() &&
                ex.execution_status === EXECUTION_STATUS.PLANNED);
      }).length,
      overdue: executions.filter(ex => {
        const scheduledDate = new Date(ex.scheduled_date);
        scheduledDate.setHours(0, 0, 0, 0);
        return (ex.execution_status === EXECUTION_STATUS.PLANNED ||
                ex.execution_status === EXECUTION_STATUS.DUE) &&
               scheduledDate < today;
      }).length,
      completed: executions.filter(ex =>
        ex.execution_status === EXECUTION_STATUS.COMPLETED ||
        ex.execution_status === EXECUTION_STATUS.CANCELLED ||
        ex.execution_status === EXECUTION_STATUS.NOT_EXECUTED
      ).length,
    };
  }, [executions]);

  // Format date header
  const formatDateHeader = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      return 'TODAY';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'TOMORROW';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }).toUpperCase();
    }
  };

  // Empty state
  const EmptyState = () => (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px'
    }}>
      <Calendar size={48} color={colors.utility.secondaryText} style={{ opacity: 0.5, marginBottom: '16px' }} />
      <p style={{ fontSize: '16px', color: colors.utility.secondaryText, margin: 0 }}>
        {activeTab === 'upcoming' && 'No upcoming jobs scheduled'}
        {activeTab === 'due' && 'No jobs due today'}
        {activeTab === 'overdue' && 'No overdue jobs'}
        {activeTab === 'completed' && 'No completed jobs'}
      </p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: colors.utility.primaryText }}>
          Jobs to Do
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.brand.primary,
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Plus size={18} />
          Schedule Meeting
        </button>
      </div>

      {/* Type Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {([
          { key: 'all', label: 'All', icon: Filter },
          { key: 'meetings', label: 'Meetings', icon: Calendar },
          { key: 'sip_plans', label: 'SIP Plans', icon: null },
          { key: 'alerts', label: 'Alerts', icon: null },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            style={{
              padding: '8px 16px',
              backgroundColor: typeFilter === key ? colors.brand.primary : colors.utility.secondaryBackground,
              border: `1px solid ${typeFilter === key ? colors.brand.primary : colors.utility.primaryText + '20'}`,
              borderRadius: '8px',
              color: typeFilter === key ? 'white' : colors.utility.primaryText,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            {Icon && <Icon size={16} />}
            {label}
          </button>
        ))}
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
        {([
          { key: 'upcoming', label: 'Upcoming', count: counts.upcoming },
          { key: 'due', label: 'Due Today', count: counts.due },
          { key: 'overdue', label: 'Overdue', count: counts.overdue },
          { key: 'completed', label: 'Completed', count: counts.completed },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === key ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
              color: activeTab === key ? colors.brand.primary : colors.utility.secondaryText,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Timeline Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>
          Loading jobs...
        </div>
      ) : filteredExecutions.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {Object.keys(groupedByDate).map(dateKey => (
            <div key={dateKey} style={{ marginBottom: '32px' }}>
              {/* Date Header */}
              <div style={{
                fontSize: '12px',
                fontWeight: '700',
                color: colors.utility.secondaryText,
                marginBottom: '12px',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '24px',
                  height: '2px',
                  backgroundColor: colors.utility.secondaryText + '40'
                }} />
                {formatDateHeader(dateKey)}
                <div style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: colors.utility.secondaryText + '40'
                }} />
              </div>

              {/* Execution Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {groupedByDate[dateKey].map(execution => (
                  <JTBDExecutionCard
                    key={execution.id}
                    execution={execution}
                    onUpdate={() => refetch()}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <CreateMeetingModal
          customerId={customerId}
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};

export default JTBDExecutionTimeline;
