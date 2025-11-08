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
  onEdit?: (execution: JTBDExecution) => void;
}

export const JTBDExecutionCard: React.FC<JTBDExecutionCardProps> = ({ execution, onUpdate, onEdit }) => {
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
    if (!window.confirm('Delete this job? This cannot be undone.')) return;

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
        {execution.scheduled_time && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.utility.secondaryText }}>
            <Clock size={12} />
            {formatTime(execution.scheduled_time)} ({data.duration_minutes || 60} min)
          </div>
        )}
        {data.meeting_mode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.utility.secondaryText }}>
            {data.meeting_mode === 'in_person' && <MapPin size={12} />}
            {data.meeting_mode === 'video_call' && <Video size={12} />}
            {data.meeting_mode === 'phone_call' && <Phone size={12} />}
            {data.meeting_mode === 'in_person' ? 'In Person' :
             data.meeting_mode === 'video_call' ? 'Video Call' : 'Phone Call'}
            {data.location && ` - ${data.location}`}
          </div>
        )}
        {data.agenda && (
          <div style={{ fontSize: '11px', color: colors.utility.secondaryText, fontStyle: 'italic' }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.utility.primaryText, fontWeight: '600' }}>
          <DollarSign size={12} />
          ₹{data.amount?.toLocaleString('en-IN') || '0'}
        </div>
        {data.scheme_name && (
          <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
            {data.scheme_name}
          </div>
        )}
        {data.month_number && data.total_months && (
          <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
            Month {data.month_number} of {data.total_months}
          </div>
        )}
      </div>
    );
  };

  // Render alert content
  const renderAlertContent = () => {
    return (
      <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
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
        padding: '12px',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 2px 8px ${colors.utility.primaryText}15`;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header - Single Line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        {/* Type Icon */}
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          backgroundColor: typeConfig.bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: typeConfig.color,
          flexShrink: 0
        }}>
          <TypeIcon size={16} />
        </div>

        {/* Title and Type */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {execution.title}
          </h3>
          <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '1px' }}>
            {typeConfig.label}
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          padding: '3px 8px',
          borderRadius: '4px',
          backgroundColor: statusColor + '20',
          border: `1px solid ${statusColor}40`,
          fontSize: '10px',
          fontWeight: '600',
          color: statusColor,
          textTransform: 'uppercase',
          flexShrink: 0
        }}>
          {execution.execution_status}
        </div>

        {/* Action Icons */}
        {canComplete && (
          <div style={{ display: 'flex', gap: '6px', marginLeft: '4px', flexShrink: 0 }}>
            {/* Edit Button - Only for meetings */}
            {onEdit && [JTBD_TYPE.CLIENT_MEETING, JTBD_TYPE.PORTFOLIO_REVIEW, JTBD_TYPE.GOAL_REVIEW].includes(execution.execution_type as any) && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(execution); }}
                title="Edit"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  backgroundColor: colors.semantic.info + '20',
                  border: `1px solid ${colors.semantic.info}40`,
                  borderRadius: '6px',
                  color: colors.semantic.info,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.semantic.info + '30';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.semantic.info + '20';
                }}
              >
                <Edit2 size={14} />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleComplete(); }}
              title="Complete"
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                backgroundColor: colors.semantic.success + '20',
                border: `1px solid ${colors.semantic.success}40`,
                borderRadius: '6px',
                color: colors.semantic.success,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.semantic.success + '30';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.semantic.success + '20';
              }}
            >
              <Check size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              title="Cancel"
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                backgroundColor: colors.semantic.error + '20',
                border: `1px solid ${colors.semantic.error}40`,
                borderRadius: '6px',
                color: colors.semantic.error,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.semantic.error + '30';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.semantic.error + '20';
              }}
            >
              <X size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              title="Delete"
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Type-specific Content */}
      {execution.execution_type === JTBD_TYPE.CLIENT_MEETING ||
       execution.execution_type === JTBD_TYPE.PORTFOLIO_REVIEW ||
       execution.execution_type === JTBD_TYPE.GOAL_REVIEW
        ? renderMeetingContent()
        : execution.execution_type === JTBD_TYPE.GOAL_SIP_PLAN
        ? renderSIPPlanContent()
        : renderAlertContent()}
    </div>
  );
};

export default JTBDExecutionCard;
