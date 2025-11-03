// frontend/src/components/meetings/MeetingScheduler.tsx
// Modal component for scheduling new meetings

import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, Video, Phone, User, FileText, Link as LinkIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { MeetingService, CreateMeetingRequest, MeetingType, MeetingMode } from '../../services/meeting.service';

interface MeetingSchedulerProps {
  customerId: number;
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
  onMeetingCreated?: () => void;
}

export const MeetingScheduler: React.FC<MeetingSchedulerProps> = ({
  customerId,
  customerName,
  isOpen,
  onClose,
  onMeetingCreated
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [formData, setFormData] = useState<CreateMeetingRequest>({
    customer_id: customerId,
    meeting_type: 'review',
    meeting_mode: 'in_person',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    meeting_location: '',
    meeting_link: '',
    agenda: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate date
    if (!formData.scheduled_date) {
      newErrors.scheduled_date = 'Meeting date is required';
    } else {
      const selectedDate = new Date(formData.scheduled_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.scheduled_date = 'Meeting date cannot be in the past';
      }
    }

    // Validate time
    if (!formData.scheduled_time) {
      newErrors.scheduled_time = 'Meeting time is required';
    }

    // Validate duration
    if (formData.duration_minutes <= 0) {
      newErrors.duration_minutes = 'Duration must be greater than 0';
    }

    // Validate mode-specific fields
    if (formData.meeting_mode === 'in_person' && !formData.meeting_location?.trim()) {
      newErrors.meeting_location = 'Location is required for in-person meetings';
    }

    if (formData.meeting_mode === 'video_call' && !formData.meeting_link?.trim()) {
      newErrors.meeting_link = 'Meeting link is required for video calls';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      const response = await MeetingService.createMeeting(formData);

      if (response.success) {
        setSubmitSuccess(true);

        // Close modal after short delay
        setTimeout(() => {
          resetForm();
          onClose();
          onMeetingCreated?.();
        }, 1500);
      } else {
        setSubmitError(response.error || 'Failed to create meeting');
      }
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      setSubmitError(error.message || 'An error occurred while creating the meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: customerId,
      meeting_type: 'review',
      meeting_mode: 'in_person',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: 60,
      meeting_location: '',
      meeting_link: '',
      agenda: ''
    });
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const updateField = (field: keyof CreateMeetingRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const renderFormField = (
    label: string,
    field: keyof CreateMeetingRequest,
    type: 'text' | 'date' | 'time' | 'number' | 'textarea' | 'select',
    options?: { value: string; label: string }[],
    icon?: React.ReactNode,
    required: boolean = false
  ) => {
    const hasError = !!errors[field];

    return (
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 600,
          color: colors.utility.primaryText,
          marginBottom: '6px'
        }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>

        <div style={{ position: 'relative' }}>
          {icon && (
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.utility.secondaryText,
              pointerEvents: 'none'
            }}>
              {icon}
            </div>
          )}

          {type === 'select' ? (
            <select
              value={formData[field] as string}
              onChange={(e) => updateField(field, e.target.value)}
              style={{
                width: '100%',
                padding: icon ? '10px 12px 10px 40px' : '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${hasError ? '#EF4444' : colors.utility.primaryText}20`,
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            >
              {options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : type === 'textarea' ? (
            <textarea
              value={formData[field] as string}
              onChange={(e) => updateField(field, e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}...`}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${hasError ? '#EF4444' : colors.utility.primaryText}20`,
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          ) : (
            <input
              type={type}
              value={formData[field] as string | number}
              onChange={(e) => updateField(field, type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
              placeholder={type === 'text' ? `Enter ${label.toLowerCase()}...` : ''}
              min={type === 'number' ? 1 : undefined}
              style={{
                width: '100%',
                padding: icon ? '10px 12px 10px 40px' : '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${hasError ? '#EF4444' : colors.utility.primaryText}20`,
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          )}
        </div>

        {hasError && (
          <div style={{
            fontSize: '12px',
            color: '#EF4444',
            marginTop: '4px'
          }}>
            {errors[field]}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: colors.utility.primaryBackground,
          zIndex: 1
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: colors.utility.primaryText,
              margin: 0,
              marginBottom: '4px'
            }}>
              Schedule New Meeting
            </h2>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              with {customerName}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Meeting Type */}
          {renderFormField(
            'Meeting Type',
            'meeting_type',
            'select',
            [
              { value: 'review', label: 'Portfolio Review' },
              { value: 'planning', label: 'Financial Planning' },
              { value: 'onboarding', label: 'Client Onboarding' },
              { value: 'grievance', label: 'Grievance Resolution' },
              { value: 'other', label: 'Other Meeting' }
            ],
            <User size={16} />,
            true
          )}

          {/* Meeting Mode */}
          {renderFormField(
            'Meeting Mode',
            'meeting_mode',
            'select',
            [
              { value: 'in_person', label: 'In Person' },
              { value: 'video_call', label: 'Video Call' },
              { value: 'phone_call', label: 'Phone Call' }
            ],
            formData.meeting_mode === 'in_person' ? <MapPin size={16} /> :
            formData.meeting_mode === 'video_call' ? <Video size={16} /> :
            <Phone size={16} />,
            true
          )}

          {/* Date and Time - Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {renderFormField('Date', 'scheduled_date', 'date', undefined, <Calendar size={16} />, true)}
            {renderFormField('Time', 'scheduled_time', 'time', undefined, <Clock size={16} />, true)}
          </div>

          {/* Duration */}
          {renderFormField('Duration (minutes)', 'duration_minutes', 'number', undefined, <Clock size={16} />, true)}

          {/* Conditional fields based on meeting mode */}
          {formData.meeting_mode === 'in_person' && (
            renderFormField('Location', 'meeting_location', 'text', undefined, <MapPin size={16} />, true)
          )}

          {formData.meeting_mode === 'video_call' && (
            renderFormField('Meeting Link', 'meeting_link', 'text', undefined, <LinkIcon size={16} />, true)
          )}

          {/* Agenda */}
          {renderFormField('Agenda', 'agenda', 'textarea', undefined, <FileText size={16} />, false)}

          {/* Error Message */}
          {submitError && (
            <div style={{
              padding: '12px',
              backgroundColor: '#FEE2E2',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #EF4444'
            }}>
              <div style={{ fontSize: '14px', color: '#DC2626', fontWeight: 500 }}>
                {submitError}
              </div>
            </div>
          )}

          {/* Success Message */}
          {submitSuccess && (
            <div style={{
              padding: '12px',
              backgroundColor: '#D1FAE5',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #10B981'
            }}>
              <div style={{ fontSize: '14px', color: '#047857', fontWeight: 500 }}>
                Meeting scheduled successfully!
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: `1px solid ${colors.utility.primaryText}10`
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.utility.primaryText}20`,
                backgroundColor: 'transparent',
                color: colors.utility.primaryText,
                fontSize: '14px',
                fontWeight: 500,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || submitSuccess}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: submitting || submitSuccess ? colors.utility.secondaryText : colors.brand.primary,
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: submitting || submitSuccess ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {submitting ? 'Scheduling...' : submitSuccess ? 'Scheduled!' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeetingScheduler;
