// frontend/src/components/meetings/MeetingCard.tsx

import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Video, Phone, CheckCircle, XCircle, Edit2, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type {
  JTBDExecution,
  MeetingExecutionData,
  ExecutionStatus
} from '../../types/jtbd.types';
import { EXECUTION_STATUS } from '../../constants/jtbd.constants';

type MeetingMode = 'in_person' | 'video_call' | 'phone_call';

// Label mappings
const EXECUTION_STATUS_LABELS: Record<string, string> = {
  [EXECUTION_STATUS.PLANNED]: 'Scheduled',
  [EXECUTION_STATUS.DUE]: 'Due',
  [EXECUTION_STATUS.COMPLETED]: 'Completed',
  [EXECUTION_STATUS.CANCELLED]: 'Cancelled',
  [EXECUTION_STATUS.NOT_EXECUTED]: 'Missed',
  [EXECUTION_STATUS.DELAYED]: 'Delayed',
  [EXECUTION_STATUS.FAILED]: 'Failed',
};

interface MeetingCardProps {
  meeting: JTBDExecution;
  onEdit?: (meeting: JTBDExecution) => void;
  onComplete?: (meeting: JTBDExecution) => void;
  onCancel?: (meeting: JTBDExecution) => void;
  onDelete?: (meeting: JTBDExecution) => void;
  isUpcoming?: boolean;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  onEdit,
  onComplete,
  onCancel,
  onDelete,
  isUpcoming = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const [showNotes, setShowNotes] = useState(false);

  // Format date and time
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Extract meeting data from execution_data
  const meetingData = (meeting.execution_data || {}) as MeetingExecutionData;

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case EXECUTION_STATUS.PLANNED:
      case EXECUTION_STATUS.DUE:
        return colors.semantic.info;
      case EXECUTION_STATUS.COMPLETED:
        return colors.semantic.success;
      case EXECUTION_STATUS.CANCELLED:
      case EXECUTION_STATUS.NOT_EXECUTED:
        return colors.semantic.error;
      case EXECUTION_STATUS.DELAYED:
        return colors.semantic.warning;
      default:
        return colors.utility.secondaryText;
    }
  };

  // Get meeting mode icon
  const getMeetingModeIcon = (mode: MeetingMode) => {
    switch (mode) {
      case 'in_person':
        return <MapPin size={16} />;
      case 'video_call':
        return <Video size={16} />;
      case 'phone_call':
        return <Phone size={16} />;
    }
  };

  const statusColor = getStatusColor(meeting.execution_status);
  const canEdit = meeting.execution_status === EXECUTION_STATUS.PLANNED || meeting.execution_status === EXECUTION_STATUS.DUE;
  const canComplete = meeting.execution_status === EXECUTION_STATUS.PLANNED || meeting.execution_status === EXECUTION_STATUS.DUE;
  const canCancel = meeting.execution_status === EXECUTION_STATUS.PLANNED || meeting.execution_status === EXECUTION_STATUS.DUE;

  return (
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 12px ${colors.utility.primaryText}15`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}
            >
              {meeting.title}
            </h3>
            <div
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                backgroundColor: statusColor + '20',
                border: `1px solid ${statusColor}40`,
                fontSize: '12px',
                fontWeight: '500',
                color: statusColor
              }}
            >
              {EXECUTION_STATUS_LABELS[meeting.execution_status] || meeting.execution_status}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isUpcoming && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {canEdit && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(meeting);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: colors.brand.primary + '20',
                  border: `1px solid ${colors.brand.primary}40`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: colors.brand.primary,
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Edit2 size={14} />
                Edit
              </button>
            )}
            {canComplete && onComplete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete(meeting);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: colors.semantic.success + '20',
                  border: `1px solid ${colors.semantic.success}40`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: colors.semantic.success,
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle size={14} />
                Complete
              </button>
            )}
            {canCancel && onCancel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(meeting);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: colors.semantic.error + '20',
                  border: `1px solid ${colors.semantic.error}40`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: colors.semantic.error,
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <XCircle size={14} />
                Cancel
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to delete this meeting?')) {
                    onDelete(meeting);
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${colors.semantic.error}40`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: colors.semantic.error,
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meeting Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color={colors.utility.secondaryText} />
          <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
            {formatDate(meeting.scheduled_date)}
          </span>
        </div>

        {/* Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color={colors.utility.secondaryText} />
          <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
            {formatTime(meeting.scheduled_time || '00:00')} ({meetingData.duration_minutes || 60} min)
          </span>
        </div>

        {/* Mode */}
        {meetingData.meeting_mode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getMeetingModeIcon(meetingData.meeting_mode as MeetingMode)}
            <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
              {meetingData.meeting_mode === 'in_person' ? 'In Person' :
               meetingData.meeting_mode === 'video_call' ? 'Video Call' : 'Phone Call'}
            </span>
          </div>
        )}

        {/* Location/Link */}
        {meetingData.location && (
          <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
            {meetingData.location}
          </div>
        )}
        {meetingData.meeting_link && (
          <div style={{ fontSize: '14px' }}>
            <a
              href={meetingData.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: colors.brand.primary, textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              Join Meeting →
            </a>
          </div>
        )}
      </div>

      {/* Agenda */}
      {meetingData.agenda && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.brand.primary}`
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              marginBottom: '4px',
              textTransform: 'uppercase'
            }}
          >
            Agenda
          </div>
          <div style={{ fontSize: '14px', color: colors.utility.primaryText, lineHeight: '1.5' }}>
            {meetingData.agenda}
          </div>
        </div>
      )}

      {/* Notes (for completed/cancelled meetings) */}
      {meetingData.meeting_notes && (
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowNotes(!showNotes);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: colors.brand.primary,
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {showNotes ? 'Hide Notes' : 'Show Notes'}
          </button>
          {showNotes && (
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px',
                fontSize: '14px',
                color: colors.utility.primaryText,
                lineHeight: '1.6'
              }}
            >
              {meetingData.meeting_notes}
            </div>
          )}
        </div>
      )}

      {/* Outcome (for completed meetings) */}
      {meetingData.outcome && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: colors.semantic.success + '10',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.semantic.success}`
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.semantic.success,
              marginBottom: '4px',
              textTransform: 'uppercase'
            }}
          >
            Outcome
          </div>
          <div style={{ fontSize: '14px', color: colors.utility.primaryText, lineHeight: '1.5' }}>
            {meetingData.outcome}
          </div>
        </div>
      )}

      {/* Cancellation Reason */}
      {meeting.cancellation_reason && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: colors.semantic.error + '10',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.semantic.error}`
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.semantic.error,
              marginBottom: '4px',
              textTransform: 'uppercase'
            }}
          >
            Cancellation Reason
          </div>
          <div style={{ fontSize: '14px', color: colors.utility.primaryText, lineHeight: '1.5' }}>
            {meeting.cancellation_reason}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingCard;
