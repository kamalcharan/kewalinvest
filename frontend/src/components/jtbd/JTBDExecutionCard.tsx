// frontend/src/components/jtbd/JTBDExecutionCard.tsx
// Generic card that renders any execution type (meetings, SIP plans, alerts)

import React from 'react';
import { Calendar, Clock, MapPin, Video, Phone, DollarSign, Bell, Edit2, Check, X, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCompleteExecution, useCancelExecution, useDeleteExecution } from '../../hooks/useJTBD';
import type { JTBDExecution, MeetingExecutionData, SIPPlanExecutionData } from '../../types/jtbd.types';
import { JTBD_TYPE, EXECUTION_STATUS } from '../../constants/jtbd.constants';

interface JTBDExecutionCardProps {
  execution: JTBDExecution;
  onUpdate?: () => void;
}

export const JTBDExecutionCard: React.FC<JTBDExecutionCardProps> = ({ execution, onUpdate }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const completeMutation = useCompleteExecution();
  const cancelMutation = useCancelExecution();
  const deleteMutation = useDeleteExecution();

  // Get type-specific styling
  const getTypeConfig = () => {
    const isMeeting = [JTBD_TYPE.CLIENT_MEETING, JTBD_TYPE.PORTFOLIO_REVIEW, JTBD_TYPE.GOAL_REVIEW].includes(execution.execution_type as any);
    const isSIP = execution.execution_type === JTBD_TYPE.GOAL_SIP_PLAN;
    const isAlert = [JTBD_TYPE.TIME_BASED, JTBD_TYPE.PROFILE_TRIGGER, JTBD_TYPE.PORTFOLIO_ALERT].includes(execution.execution_type as any);

    if (isMeeting) {
      return {
        icon: Calendar,
        color: colors.semantic.info || '#3B82F6',
        bgColor: (colors.semantic.info || '#3B82F6') + '15',
        label: 'Meeting'
      };
    } else if (isSIP) {
      return {
        icon: DollarSign,
        color: colors.semantic.success || '#10B981',
        bgColor: (colors.semantic.success || '#10B981') + '15',
        label: 'SIP Payment'
      };
    } else if (isAlert) {
      return {
        icon: Bell,
        color: colors.semantic.warning || '#F59E0B',
        bgColor: (colors.semantic.warning || '#F59E0B') + '15',
        label: 'Alert'
      };
    }

    return {
      icon: Calendar,
      color: colors.utility.secondaryText,
      bgColor: colors.utility.secondaryBackground,
      label: 'Task'
    };
  };

  const typeConfig = getTypeConfig();
  const TypeIcon = typeConfig.icon;

  // Get status color
  const getStatusColor = () => {
    switch (execution.execution_status) {
      case EXECUTION_STATUS.PLANNED:
      case EXECUTION_STATUS.DUE:
        return colors.semantic.info || '#3B82F6';
      case EXECUTION_STATUS.COMPLETED:
        return colors.semantic.success || '#10B981';
      case EXECUTION_STATUS.CANCELLED:
      case EXECUTION_STATUS.NOT_EXECUTED:
        return colors.semantic.error || '#EF4444';
      case EXECUTION_STATUS.DELAYED:
        return colors.semantic.warning || '#F59E0B';
      default:
        return colors.utility.secondaryText;
    }
  };

  const statusColor = getStatusColor();
  const canComplete = execution.execution_status === EXECUTION_STATUS.PLANNED || execution.execution_status === EXECUTION_STATUS.DUE;

  // Format time
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Handle actions
  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync({ id: execution.id, data: {} });
      onUpdate?.();
    } catch (error) {
      console.error('Error completing execution:', error);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;

    try {
      await cancelMutation.mutateAsync({ id: execution.id, data: { cancellation_reason: reason } });
      onUpdate?.();
    } catch (error) {
      console.error('Error cancelling execution:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this job? This cannot be undone.')) return;

    try {
      await deleteMutation.mutateAsync({ id: execution.id, customerId: execution.customer_id });
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting execution:', error);
    }
  };

  // Render meeting-specific content
  const renderMeetingContent = () => {
    const data = execution.execution_data as MeetingExecutionData;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', fontSize: '14px' }}>
        {execution.scheduled_time && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.utility.secondaryText }}>
            <Clock size={14} />
            {formatTime(execution.scheduled_time)} ({data.duration_minutes || 60} min)
          </div>
        )}
        {data.meeting_mode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.utility.secondaryText }}>
            {data.meeting_mode === 'in_person' && <MapPin size={14} />}
            {data.meeting_mode === 'video_call' && <Video size={14} />}
            {data.meeting_mode === 'phone_call' && <Phone size={14} />}
            {data.meeting_mode === 'in_person' ? 'In Person' :
             data.meeting_mode === 'video_call' ? 'Video Call' : 'Phone Call'}
            {data.location && ` - ${data.location}`}
          </div>
        )}
        {data.agenda && (
          <div style={{ fontSize: '13px', color: colors.utility.secondaryText, fontStyle: 'italic' }}>
            {data.agenda}
          </div>
        )}
      </div>
    );
  };

  // Render SIP plan content
  const renderSIPPlanContent = () => {
    const data = execution.execution_data as SIPPlanExecutionData;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', fontSize: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.utility.primaryText, fontWeight: '600' }}>
          <DollarSign size={14} />
          ₹{data.amount?.toLocaleString('en-IN') || '0'}
        </div>
        {data.scheme_name && (
          <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
            {data.scheme_name}
          </div>
        )}
        {data.month_number && data.total_months && (
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
            Month {data.month_number} of {data.total_months}
          </div>
        )}
      </div>
    );
  };

  // Render alert content
  const renderAlertContent = () => {
    return (
      <div style={{ marginTop: '8px', fontSize: '13px', color: colors.utility.secondaryText }}>
        {execution.description}
      </div>
    );
  };

  return (
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderLeft: `4px solid ${typeConfig.color}`,
        borderRadius: '8px',
        padding: '16px',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 12px ${colors.utility.primaryText}10`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            {/* Type Icon */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: typeConfig.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: typeConfig.color
            }}>
              <TypeIcon size={18} />
            </div>

            {/* Title */}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                {execution.title}
              </h3>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '2px' }}>
                {typeConfig.label}
              </div>
            </div>

            {/* Status Badge */}
            <div style={{
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: statusColor + '20',
              border: `1px solid ${statusColor}40`,
              fontSize: '11px',
              fontWeight: '600',
              color: statusColor,
              textTransform: 'uppercase'
            }}>
              {execution.execution_status}
            </div>
          </div>
        </div>
      </div>

      {/* Type-specific Content */}
      {execution.execution_type === JTBD_TYPE.CLIENT_MEETING ||
       execution.execution_type === JTBD_TYPE.PORTFOLIO_REVIEW ||
       execution.execution_type === JTBD_TYPE.GOAL_REVIEW
        ? renderMeetingContent()
        : execution.execution_type === JTBD_TYPE.GOAL_SIP_PLAN
        ? renderSIPPlanContent()
        : renderAlertContent()}

      {/* Actions */}
      {canComplete && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.utility.primaryText}10` }}>
          <button
            onClick={handleComplete}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: colors.semantic.success + '20',
              border: `1px solid ${colors.semantic.success}40`,
              borderRadius: '6px',
              color: colors.semantic.success,
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Check size={14} />
            Complete
          </button>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: colors.semantic.error + '20',
              border: `1px solid ${colors.semantic.error}40`,
              borderRadius: '6px',
              color: colors.semantic.error,
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <X size={14} />
            Cancel
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: '8px 12px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              color: colors.utility.secondaryText,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default JTBDExecutionCard;
