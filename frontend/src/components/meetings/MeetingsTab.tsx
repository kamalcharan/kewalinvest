// frontend/src/components/meetings/MeetingsTab.tsx
// Main container component for customer meetings management

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { MeetingService, CustomerMeeting, CustomerMeetingSummary } from '../../services/meeting.service';
import { MeetingTimeline } from './MeetingTimeline';
import { MeetingScheduler } from './MeetingScheduler';
import { MeetingNotesEditor } from './MeetingNotesEditor';

interface MeetingsTabProps {
  customerId: number;
  customerName: string;
}

export const MeetingsTab: React.FC<MeetingsTabProps> = ({ customerId, customerName }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [summary, setSummary] = useState<CustomerMeetingSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Modal states
  const [showScheduler, setShowScheduler] = useState(false);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<CustomerMeeting | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchSummary();
  }, [customerId, refreshKey]);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    setSummaryError(null);

    try {
      const response = await MeetingService.getCustomerMeetingSummary(customerId);

      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        setSummaryError(response.error || 'Failed to load meeting summary');
      }
    } catch (error: any) {
      console.error('Error fetching meeting summary:', error);
      setSummaryError(error.message || 'An error occurred');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleMeetingCreated = () => {
    // Refresh timeline and summary
    setRefreshKey(prev => prev + 1);
  };

  const handleNotesSaved = () => {
    // Refresh timeline and summary
    setRefreshKey(prev => prev + 1);
  };

  const handleMeetingClick = (meeting: CustomerMeeting) => {
    setSelectedMeeting(meeting);
    setShowNotesEditor(true);
  };

  const formatNextMeetingDate = (date: string, time: string): string => {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatLastMeetingDate = (completedAt: string): string => {
    const date = new Date(completedAt);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderSummaryCard = () => {
    if (loadingSummary) {
      return (
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
            Loading summary...
          </div>
        </div>
      );
    }

    if (summaryError) {
      return (
        <div style={{
          backgroundColor: '#FEE2E2',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid #EF4444'
        }}>
          <div style={{ fontSize: '14px', color: '#DC2626', fontWeight: 500 }}>
            {summaryError}
          </div>
        </div>
      );
    }

    if (!summary) return null;

    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: colors.utility.primaryText,
          margin: 0,
          marginBottom: '16px'
        }}>
          Meeting Summary
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* Total Meetings */}
          <div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginBottom: '4px',
              fontWeight: 500
            }}>
              Total Meetings
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: colors.utility.primaryText
            }}>
              {summary.total_meetings}
            </div>
          </div>

          {/* Completed */}
          <div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginBottom: '4px',
              fontWeight: 500
            }}>
              Completed
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={20} />
              {summary.completed_count}
            </div>
          </div>

          {/* Scheduled */}
          <div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginBottom: '4px',
              fontWeight: 500
            }}>
              Scheduled
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Clock size={20} />
              {summary.scheduled_count}
            </div>
          </div>

          {/* Cancelled */}
          {summary.cancelled_count > 0 && (
            <div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginBottom: '4px',
                fontWeight: 500
              }}>
                Cancelled
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={20} />
                {summary.cancelled_count}
              </div>
            </div>
          )}
        </div>

        {/* Next Meeting */}
        {summary.next_meeting && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginBottom: '4px',
              fontWeight: 500
            }}>
              Next Scheduled Meeting
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.primaryText,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Calendar size={16} color={colors.brand.primary} />
              <span>
                {formatNextMeetingDate(summary.next_meeting.scheduled_date, summary.next_meeting.scheduled_time)}
              </span>
              <span style={{ color: colors.utility.secondaryText }}>
                ({summary.next_meeting.days_until} {summary.next_meeting.days_until === 1 ? 'day' : 'days'} away)
              </span>
            </div>
          </div>
        )}

        {/* Last Meeting */}
        {summary.last_meeting && (
          <div style={{
            marginTop: '12px'
          }}>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginBottom: '4px',
              fontWeight: 500
            }}>
              Last Meeting
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.primaryText,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={16} color="#10B981" />
              <span>
                {formatLastMeetingDate(summary.last_meeting.completed_at)}
              </span>
              <span style={{ color: colors.utility.secondaryText }}>
                ({summary.last_meeting.days_ago} {summary.last_meeting.days_ago === 1 ? 'day' : 'days'} ago)
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header with Schedule Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: colors.utility.primaryText,
            margin: 0,
            marginBottom: '4px'
          }}>
            Meetings
          </h2>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            Track and manage customer meetings
          </p>
        </div>

        <button
          onClick={() => setShowScheduler(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: colors.brand.primary,
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <Plus size={18} />
          Schedule New Meeting
        </button>
      </div>

      {/* Summary Card */}
      {renderSummaryCard()}

      {/* Meeting Timeline */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: colors.utility.primaryText,
          margin: 0,
          marginBottom: '16px'
        }}>
          Meeting History
        </h3>

        <MeetingTimeline
          key={refreshKey}
          customerId={customerId}
          onMeetingClick={handleMeetingClick}
        />
      </div>

      {/* Modals */}
      <MeetingScheduler
        customerId={customerId}
        customerName={customerName}
        isOpen={showScheduler}
        onClose={() => setShowScheduler(false)}
        onMeetingCreated={handleMeetingCreated}
      />

      {selectedMeeting && (
        <MeetingNotesEditor
          meeting={selectedMeeting}
          isOpen={showNotesEditor}
          onClose={() => {
            setShowNotesEditor(false);
            setSelectedMeeting(null);
          }}
          onSaved={handleNotesSaved}
        />
      )}
    </div>
  );
};

export default MeetingsTab;
