// frontend/src/components/meetings/CreateMeetingModal.tsx

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Target, UserPlus, AlertCircle, Users, MapPin, Video, Phone } from 'lucide-react';
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

const MEETING_TYPE_CONFIG: Record<OldMeetingType, { label: string; icon: any }> = {
  review: { label: 'Portfolio Review', icon: TrendingUp },
  planning: { label: 'Goal Planning', icon: Target },
  onboarding: { label: 'Client Onboarding', icon: UserPlus },
  grievance: { label: 'Grievance Resolution', icon: AlertCircle },
  other: { label: 'General Meeting', icon: Users },
};

const MEETING_MODE_CONFIG: Record<MeetingMode, { label: string; icon: any }> = {
  in_person: { label: 'In Person', icon: MapPin },
  video_call: { label: 'Video Call', icon: Video },
  phone_call: { label: 'Phone Call', icon: Phone },
};

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

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

    console.log('[CreateMeetingModal] ===== FORM SUBMITTED =====');
    console.log('[CreateMeetingModal] Form data:', formData);

    const validationResult = validate();
    console.log('[CreateMeetingModal] Validation result:', validationResult);

    if (!validationResult) {
      console.log('[CreateMeetingModal] Validation FAILED, stopping');
      return;
    }

    console.log('[CreateMeetingModal] Validation PASSED, proceeding');

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
      const title = MEETING_TYPE_CONFIG[formData.meeting_type].label;

      if (isEditMode) {
        console.log('[CreateMeetingModal] Edit mode - updating');
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
        console.log('[CreateMeetingModal] ===== CALLING MUTATION =====');
        console.log('[CreateMeetingModal] Request:', JSON.stringify(createRequest, null, 2));

        const result = await createMutation.mutateAsync(createRequest);

        console.log('[CreateMeetingModal] ===== MUTATION SUCCESS =====');
        console.log('[CreateMeetingModal] Result:', result);
      }

      console.log('[CreateMeetingModal] Calling onSuccess callback');
      onSuccess?.();

      console.log('[CreateMeetingModal] Closing modal');
      handleClose();
    } catch (error) {
      console.error('[CreateMeetingModal] ===== ERROR =====');
      console.error('[CreateMeetingModal] Error:', error);
      alert('Failed to save meeting: ' + (error instanceof Error ? error.message : String(error)));
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
        {/* Modal - Landscape Design */}
        <div
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '16px',
            maxWidth: '1000px',
            width: '100%',
            maxHeight: '85vh',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${colors.utility.primaryText}10`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, overflow: 'auto' }}>
              {/* Left Column */}
              <div>
                {/* Meeting Type - Radio Buttons */}
                <div style={{ marginBottom: '24px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.utility.primaryText
                    }}
                  >
                    Meeting Type *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {(Object.entries(MEETING_TYPE_CONFIG) as [OldMeetingType, { label: string; icon: any }][]).map(([key, config]) => {
                      const Icon = config.icon;
                      const isSelected = formData.meeting_type === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormData({ ...formData, meeting_type: key })}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: `2px solid ${isSelected ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                            backgroundColor: isSelected ? colors.brand.primary + '15' : colors.utility.primaryBackground,
                            color: isSelected ? colors.brand.primary : colors.utility.primaryText,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                        >
                          <Icon size={20} />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.meeting_type && (
                    <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '6px', display: 'block' }}>
                      {errors.meeting_type}
                    </span>
                  )}
                </div>

                {/* Meeting Mode - Radio Buttons */}
                <div style={{ marginBottom: '24px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.utility.primaryText
                    }}
                  >
                    Meeting Mode *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {(Object.entries(MEETING_MODE_CONFIG) as [MeetingMode, { label: string; icon: any }][]).map(([key, config]) => {
                      const Icon = config.icon;
                      const isSelected = formData.meeting_mode === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormData({ ...formData, meeting_mode: key })}
                          style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: `2px solid ${isSelected ? colors.utility.secondaryText : colors.utility.primaryText + '20'}`,
                            backgroundColor: isSelected ? colors.utility.secondaryText + '15' : colors.utility.primaryBackground,
                            color: isSelected ? colors.utility.secondaryText : colors.utility.primaryText,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          <Icon size={18} />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.meeting_mode && (
                    <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '6px', display: 'block' }}>
                      {errors.meeting_mode}
                    </span>
                  )}
                </div>

                {/* Duration - Quick Select */}
                <div style={{ marginBottom: '24px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.utility.primaryText
                    }}
                  >
                    Duration *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                    {DURATION_PRESETS.map((minutes) => {
                      const isSelected = formData.duration_minutes === minutes;
                      return (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => setFormData({ ...formData, duration_minutes: minutes })}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '6px',
                            border: `2px solid ${isSelected ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                            backgroundColor: isSelected ? colors.brand.primary + '15' : colors.utility.primaryBackground,
                            color: isSelected ? colors.brand.primary : colors.utility.primaryText,
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                        >
                          {minutes}m
                        </button>
                      );
                    })}
                  </div>
                  {errors.duration_minutes && (
                    <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '6px', display: 'block' }}>
                      {errors.duration_minutes}
                    </span>
                  )}
                </div>

                {/* Location/Link based on mode */}
                {formData.meeting_mode === 'in_person' && (
                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
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
                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
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
              </div>

              {/* Right Column */}
              <div>
                {/* Date */}
                <div style={{ marginBottom: '24px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
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
                    <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '6px', display: 'block' }}>
                      {errors.scheduled_date}
                    </span>
                  )}
                </div>

                {/* Time */}
                <div style={{ marginBottom: '24px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
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
                    <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '6px', display: 'block' }}>
                      {errors.scheduled_time}
                    </span>
                  )}
                </div>

                {/* Agenda */}
                <div style={{ marginBottom: '24px' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.utility.primaryText
                    }}
                  >
                    Agenda
                  </label>
                  <textarea
                    value={formData.agenda || ''}
                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                    placeholder="Enter meeting agenda..."
                    rows={8}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: '14px',
                      resize: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '20px 24px',
                borderTop: `1px solid ${colors.utility.primaryText}10`,
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                flexShrink: 0
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
