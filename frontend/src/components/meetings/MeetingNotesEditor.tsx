// frontend/src/components/meetings/MeetingNotesEditor.tsx
// Component for editing meeting notes and outcome

import React, { useState, useEffect } from 'react';
import { FileText, Save, X, CheckCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { MeetingService, CustomerMeeting, UpdateMeetingRequest, CompleteMeetingRequest } from '../../services/meeting.service';

interface MeetingNotesEditorProps {
  meeting: CustomerMeeting;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const MeetingNotesEditor: React.FC<MeetingNotesEditorProps> = ({
  meeting,
  isOpen,
  onClose,
  onSaved
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [notes, setNotes] = useState(meeting.notes || '');
  const [outcome, setOutcome] = useState(meeting.outcome || '');
  const [markAsComplete, setMarkAsComplete] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNotes(meeting.notes || '');
      setOutcome(meeting.outcome || '');
      setMarkAsComplete(false);
      setSaveError(null);
      setSaveSuccess(false);
      setHasChanges(false);
    }
  }, [isOpen, meeting]);

  useEffect(() => {
    const changed = notes !== (meeting.notes || '') ||
                    outcome !== (meeting.outcome || '');
    setHasChanges(changed);
  }, [notes, outcome, meeting.notes, meeting.outcome]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      if (markAsComplete && meeting.status === 'scheduled') {
        // Mark meeting as complete
        const completeData: CompleteMeetingRequest = {
          notes,
          outcome
        };

        const response = await MeetingService.completeMeeting(meeting.id, completeData);

        if (!response.success) {
          throw new Error(response.error || 'Failed to complete meeting');
        }
      } else {
        // Just update notes/outcome
        const updateData: UpdateMeetingRequest = {
          notes,
          outcome
        };

        const response = await MeetingService.updateMeeting(meeting.id, updateData);

        if (!response.success) {
          throw new Error(response.error || 'Failed to update meeting');
        }
      }

      setSaveSuccess(true);

      // Close modal after short delay
      setTimeout(() => {
        onClose();
        onSaved?.();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving meeting notes:', error);
      setSaveError(error.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmClose) return;
    }
    onClose();
  };

  const insertTimestamp = () => {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const timestampText = `[${timestamp}] `;
    setNotes(prev => prev + (prev ? '\n' : '') + timestampText);
  };

  const getMeetingTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      review: 'Portfolio Review',
      planning: 'Financial Planning',
      onboarding: 'Client Onboarding',
      grievance: 'Grievance Resolution',
      other: 'Other Meeting'
    };
    return labels[type] || type;
  };

  const formatDateTime = (date: string, time: string): string => {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const characterCount = notes.length + outcome.length;

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
        maxWidth: '800px',
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
          alignItems: 'flex-start',
          position: 'sticky',
          top: 0,
          backgroundColor: colors.utility.primaryBackground,
          zIndex: 1
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: colors.utility.primaryText,
              margin: 0,
              marginBottom: '4px'
            }}>
              Meeting Notes
            </h2>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              <div>{getMeetingTypeLabel(meeting.meeting_type)}</div>
              <div>{formatDateTime(meeting.scheduled_date, meeting.scheduled_time)}</div>
            </div>
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

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Notes Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <label style={{
                fontSize: '13px',
                fontWeight: 600,
                color: colors.utility.primaryText
              }}>
                Meeting Notes
              </label>
              <button
                type="button"
                onClick={insertTimestamp}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Insert Timestamp
              </button>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter detailed notes from the meeting...&#10;&#10;Tips:&#10;• Document key discussion points&#10;• Record decisions made&#10;• Note client concerns or questions&#10;• Track portfolio changes discussed"
              rows={12}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${colors.utility.primaryText}20`,
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical',
                lineHeight: '1.6'
              }}
            />
          </div>

          {/* Outcome Section */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Meeting Outcome / Action Items
            </label>

            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Summarize the outcome and any action items...&#10;&#10;Example:&#10;• Client agreed to increase SIP by ₹5,000/month&#10;• Follow up with tax planning document by end of week&#10;• Schedule next review in 3 months"
              rows={6}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${colors.utility.primaryText}20`,
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical',
                lineHeight: '1.6'
              }}
            />
          </div>

          {/* Mark as Complete (only for scheduled meetings) */}
          {meeting.status === 'scheduled' && (
            <div style={{
              padding: '12px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: colors.utility.primaryText
              }}>
                <input
                  type="checkbox"
                  checked={markAsComplete}
                  onChange={(e) => setMarkAsComplete(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                <CheckCircle size={16} color="#10B981" />
                <span>Mark this meeting as completed</span>
              </label>
            </div>
          )}

          {/* Character Count */}
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText,
            textAlign: 'right',
            marginBottom: '16px'
          }}>
            {characterCount} characters
          </div>

          {/* Error Message */}
          {saveError && (
            <div style={{
              padding: '12px',
              backgroundColor: '#FEE2E2',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #EF4444'
            }}>
              <div style={{ fontSize: '14px', color: '#DC2626', fontWeight: 500 }}>
                {saveError}
              </div>
            </div>
          )}

          {/* Success Message */}
          {saveSuccess && (
            <div style={{
              padding: '12px',
              backgroundColor: '#D1FAE5',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #10B981'
            }}>
              <div style={{ fontSize: '14px', color: '#047857', fontWeight: 500 }}>
                Notes saved successfully!
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            paddingTop: '16px',
            borderTop: `1px solid ${colors.utility.primaryText}10`
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: `1px solid ${colors.utility.primaryText}20`,
                backgroundColor: 'transparent',
                color: colors.utility.primaryText,
                fontSize: '14px',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saveSuccess || !hasChanges}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: saving || saveSuccess || !hasChanges ? colors.utility.secondaryText : colors.brand.primary,
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: saving || saveSuccess || !hasChanges ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Save size={16} />
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Notes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingNotesEditor;
