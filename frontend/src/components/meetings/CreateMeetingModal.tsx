// frontend/src/components/meetings/CreateMeetingModal.tsx

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCreateExecution, useUpdateExecution } from '../../hooks/useJTBD';
import type {
  JTBDExecution,
  CreateExecutionRequest,
  MeetingExecutionData
} from '../../types/jtbd.types';
import { JTBD_TYPE, JTBD_PRIORITY } from '../../constants/jtbd.constants';

// Meeting type mappings (old → new)
const MEETING_TYPE_MAP = {
  'review': JTBD_TYPE.PORTFOLIO_REVIEW,
  'planning': JTBD_TYPE.GOAL_REVIEW,
  'onboarding': JTBD_TYPE.CLIENT_MEETING,
  'grievance': JTBD_TYPE.CLIENT_MEETING,
  'other': JTBD_TYPE.CLIENT_MEETING,
} as const;

type OldMeetingType = keyof typeof MEETING_TYPE_MAP;
type MeetingMode = 'in_person' | 'video_call' | 'phone_call';

const MEETING_TYPE_LABELS: Record<OldMeetingType, string> = {
  review: 'Portfolio Review',
  planning: 'Goal Planning',
  onboarding: 'Client Onboarding',
  grievance: 'Grievance Resolution',
  other: 'General Meeting',
};

const MEETING_MODE_LABELS: Record<MeetingMode, string> = {
  in_person: 'In Person',
  video_call: 'Video Call',
  phone_call: 'Phone Call',
};

interface CreateMeetingModalProps {
  customerId: number;
  meeting?: JTBDExecution; // If provided, modal is in edit mode
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Internal form state (UI-friendly)
interface MeetingFormData {
  meeting_type: OldMeetingType;
  meeting_mode: MeetingMode;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  location?: string;
  meeting_link?: string;
  agenda?: string;
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  customerId,
  meeting,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const isEditMode = !!meeting;
  const createMutation = useCreateExecution();
  const updateMutation = useUpdateExecution();

  // Form state
  const [formData, setFormData] = useState<MeetingFormData>({
    meeting_type: 'review',
    meeting_mode: 'in_person',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    agenda: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (meeting) {
      const meetingData = meeting.execution_data as MeetingExecutionData;

      // Map execution_type back to old meeting type
      let oldType: OldMeetingType = 'other';
      if (meeting.execution_type === JTBD_TYPE.PORTFOLIO_REVIEW) oldType = 'review';
      else if (meeting.execution_type === JTBD_TYPE.GOAL_REVIEW) oldType = 'planning';
      else if (meeting.execution_type === JTBD_TYPE.CLIENT_MEETING) {
        // Default to 'other' for generic client meetings
        oldType = 'other';
      }

      setFormData({
        meeting_type: oldType,
        meeting_mode: (meetingData.meeting_mode || 'in_person') as MeetingMode,
        scheduled_date: meeting.scheduled_date,
        scheduled_time: meeting.scheduled_time || '',
        duration_minutes: meetingData.duration_minutes || 60,
        location: meetingData.location,
        meeting_link: meetingData.meeting_link,
        agenda: meetingData.agenda
      });
    } else {
      // Reset for create mode
      setFormData({
        meeting_type: 'review',
        meeting_mode: 'in_person',
        scheduled_date: '',
        scheduled_time: '',
        duration_minutes: 60,
        agenda: ''
      });
    }
  }, [meeting, customerId]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.meeting_type) newErrors.meeting_type = 'Meeting type is required';
    if (!formData.meeting_mode) newErrors.meeting_mode = 'Meeting mode is required';
    if (!formData.scheduled_date) newErrors.scheduled_date = 'Date is required';
    if (!formData.scheduled_time) newErrors.scheduled_time = 'Time is required';
    if (formData.duration_minutes <= 0) newErrors.duration_minutes = 'Duration must be positive';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      // Convert form data to JTBD execution format
      const executionType = MEETING_TYPE_MAP[formData.meeting_type];

      const executionData: MeetingExecutionData = {
        meeting_mode: formData.meeting_mode,
        duration_minutes: formData.duration_minutes,
        location: formData.location,
        meeting_link: formData.meeting_link,
        agenda: formData.agenda,
      };

      // Generate title based on meeting type
      const title = MEETING_TYPE_LABELS[formData.meeting_type];

      if (isEditMode) {
        await updateMutation.mutateAsync({
          id: meeting.id,
          data: {
            title,
            scheduled_date: formData.scheduled_date,
            scheduled_time: formData.scheduled_time,
            execution_data: executionData,
          }
        });
      } else {
        const createRequest: CreateExecutionRequest = {
          customer_id: customerId,
          execution_type: executionType,
          title,
          priority: JTBD_PRIORITY.MEDIUM,
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time,
          execution_data: executionData,
        };
        await createMutation.mutateAsync(createRequest);
      }
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error saving meeting:', error);
    }
  };

  // Handle close
  const handleClose = () => {
    setFormData({
      meeting_type: 'review',
      meeting_mode: 'in_person',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: 60,
      agenda: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '24px',
              borderBottom: `1px solid ${colors.utility.primaryText}10`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}
            >
              {isEditMode ? 'Edit Meeting' : 'Schedule New Meeting'}
            </h2>
            <button
              onClick={handleClose}
              disabled={isLoading}
              style={{
                background: 'none',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                color: colors.utility.secondaryText,
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '24px' }}>
              {/* Meeting Type */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.utility.primaryText
                  }}
                >
                  Meeting Type *
                </label>
                <select
                  value={formData.meeting_type}
                  onChange={(e) =>
                    setFormData({ ...formData, meeting_type: e.target.value as OldMeetingType })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.meeting_type ? colors.semantic.error : colors.utility.primaryText}20`,
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px'
                  }}
                >
                  {Object.entries(MEETING_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.meeting_type && (
                  <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                    {errors.meeting_type}
                  </span>
                )}
              </div>

              {/* Meeting Mode */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.utility.primaryText
                  }}
                >
                  Meeting Mode *
                </label>
                <select
                  value={formData.meeting_mode}
                  onChange={(e) =>
                    setFormData({ ...formData, meeting_mode: e.target.value as MeetingMode })
                  }
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.meeting_mode ? colors.semantic.error : colors.utility.primaryText}20`,
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px'
                  }}
                >
                  {Object.entries(MEETING_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.meeting_mode && (
                  <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                    {errors.meeting_mode}
                  </span>
                )}
              </div>

              {/* Date and Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.utility.primaryText
                    }}
                  >
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.scheduled_date ? colors.semantic.error : colors.utility.primaryText}20`,
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: '14px'
                    }}
                  />
                  {errors.scheduled_date && (
                    <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                      {errors.scheduled_date}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.utility.primaryText
                    }}
                  >
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${errors.scheduled_time ? colors.semantic.error : colors.utility.primaryText}20`,
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: '14px'
                    }}
                  />
                  {errors.scheduled_time && (
                    <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                      {errors.scheduled_time}
                    </span>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.utility.primaryText
                  }}
                >
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })
                  }
                  min="15"
                  step="15"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors.duration_minutes ? colors.semantic.error : colors.utility.primaryText}20`,
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px'
                  }}
                />
                {errors.duration_minutes && (
                  <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                    {errors.duration_minutes}
                  </span>
                )}
              </div>

              {/* Location/Link based on mode */}
              {formData.meeting_mode === 'in_person' && (
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.utility.primaryText
                    }}
                  >
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Enter meeting location"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: '14px'
                    }}
                  />
                </div>
              )}

              {formData.meeting_mode === 'video_call' && (
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.utility.primaryText
                    }}
                  >
                    Meeting Link
                  </label>
                  <input
                    type="url"
                    value={formData.meeting_link || ''}
                    onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: '14px'
                    }}
                  />
                </div>
              )}

              {/* Agenda */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.utility.primaryText
                  }}
                >
                  Agenda
                </label>
                <textarea
                  value={formData.agenda || ''}
                  onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                  placeholder="Enter meeting agenda..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '24px',
                borderTop: `1px solid ${colors.utility.primaryText}10`,
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                {isLoading ? 'Saving...' : isEditMode ? 'Update Meeting' : 'Schedule Meeting'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateMeetingModal;
