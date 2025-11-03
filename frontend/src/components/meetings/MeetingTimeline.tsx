// frontend/src/components/meetings/MeetingTimeline.tsx
// Component to display chronological meeting history with expandable details

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Video, Phone, User, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { MeetingService, CustomerMeeting, MeetingType, MeetingStatus } from '../../services/meeting.service';

interface MeetingTimelineProps {
  customerId: number;
  onMeetingClick?: (meeting: CustomerMeeting) => void;
}

export const MeetingTimeline: React.FC<MeetingTimelineProps> = ({ customerId, onMeetingClick }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [meetings, setMeetings] = useState<CustomerMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMeetingId, setExpandedMeetingId] = useState<number | null>(null);

  // Filters
  const [selectedType, setSelectedType] = useState<MeetingType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<MeetingStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // desc = newest first

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMeetings, setTotalMeetings] = useState(0);

  useEffect(() => {
    fetchMeetings();
  }, [customerId, selectedType, selectedStatus, sortOrder, currentPage]);

  const fetchMeetings = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: any = {
        customer_id: customerId,
        page: currentPage,
        page_size: 10
      };

      if (selectedType !== 'all') filters.meeting_type = selectedType;
      if (selectedStatus !== 'all') filters.status = selectedStatus;

      const response = await MeetingService.getMeetings(filters);

      if (response.success && response.data) {
        let meetingList = response.data.meetings;

        // Sort by date
        meetingList.sort((a, b) => {
          const dateA = new Date(`${a.scheduled_date}T${a.scheduled_time}`).getTime();
          const dateB = new Date(`${b.scheduled_date}T${b.scheduled_time}`).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        setMeetings(meetingList);
        setTotalPages(response.data.pagination.total_pages);
        setTotalMeetings(response.data.pagination.total);
      } else {
        setError(response.error || 'Failed to load meetings');
      }
    } catch (err: any) {
      console.error('Error fetching meetings:', err);
      setError(err.message || 'An error occurred while loading meetings');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (meetingId: number) => {
    setExpandedMeetingId(expandedMeetingId === meetingId ? null : meetingId);
  };

  const getMeetingTypeLabel = (type: MeetingType): string => {
    const labels: Record<MeetingType, string> = {
      review: 'Portfolio Review',
      planning: 'Financial Planning',
      onboarding: 'Client Onboarding',
      grievance: 'Grievance Resolution',
      other: 'Other Meeting'
    };
    return labels[type];
  };

  const getMeetingTypeColor = (type: MeetingType): string => {
    const typeColors: Record<MeetingType, string> = {
      review: '#3B82F6',     // Blue
      planning: '#8B5CF6',    // Purple
      onboarding: '#10B981',  // Green
      grievance: '#EF4444',   // Red
      other: '#6B7280'        // Gray
    };
    return typeColors[type];
  };

  const getStatusIcon = (status: MeetingStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} color="#10B981" />;
      case 'cancelled':
        return <XCircle size={16} color="#EF4444" />;
      case 'scheduled':
        return <Clock size={16} color="#3B82F6" />;
      case 'rescheduled':
        return <AlertCircle size={16} color="#F59E0B" />;
      default:
        return <Clock size={16} color="#6B7280" />;
    }
  };

  const getStatusLabel = (status: MeetingStatus): string => {
    const labels: Record<MeetingStatus, string> = {
      scheduled: 'Scheduled',
      completed: 'Completed',
      cancelled: 'Cancelled',
      rescheduled: 'Rescheduled'
    };
    return labels[status];
  };

  const getMeetingModeIcon = (mode: CustomerMeeting['meeting_mode']) => {
    switch (mode) {
      case 'in_person':
        return <MapPin size={14} />;
      case 'video_call':
        return <Video size={14} />;
      case 'phone_call':
        return <Phone size={14} />;
      default:
        return <User size={14} />;
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderFilters = () => (
    <div style={{
      display: 'flex',
      gap: '12px',
      marginBottom: '20px',
      flexWrap: 'wrap',
      alignItems: 'center'
    }}>
      {/* Type Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: colors.utility.secondaryText, fontWeight: 500 }}>
          Type
        </label>
        <select
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value as MeetingType | 'all');
            setCurrentPage(1);
          }}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}20`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Types</option>
          <option value="review">Portfolio Review</option>
          <option value="planning">Financial Planning</option>
          <option value="onboarding">Client Onboarding</option>
          <option value="grievance">Grievance</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Status Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: colors.utility.secondaryText, fontWeight: 500 }}>
          Status
        </label>
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value as MeetingStatus | 'all');
            setCurrentPage(1);
          }}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}20`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rescheduled">Rescheduled</option>
        </select>
      </div>

      {/* Sort Order */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '12px', color: colors.utility.secondaryText, fontWeight: 500 }}>
          Sort
        </label>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}20`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>

      {/* Results count */}
      <div style={{ marginLeft: 'auto', fontSize: '14px', color: colors.utility.secondaryText }}>
        {totalMeetings} meeting{totalMeetings !== 1 ? 's' : ''} found
      </div>
    </div>
  );

  const renderMeetingCard = (meeting: CustomerMeeting) => {
    const isExpanded = expandedMeetingId === meeting.id;
    const typeColor = getMeetingTypeColor(meeting.meeting_type);

    return (
      <div
        key={meeting.id}
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderLeft: `4px solid ${typeColor}`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}
        onClick={() => toggleExpanded(meeting.id)}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                fontSize: '16px',
                fontWeight: 600,
                color: colors.utility.primaryText
              }}>
                {getMeetingTypeLabel(meeting.meeting_type)}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {getStatusIcon(meeting.status)}
                <span style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  {getStatusLabel(meeting.status)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: colors.utility.secondaryText }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} />
                <span>{formatDate(meeting.scheduled_date)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                <span>{formatTime(meeting.scheduled_time)} ({meeting.duration_minutes} min)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {getMeetingModeIcon(meeting.meeting_mode)}
                <span style={{ textTransform: 'capitalize' }}>
                  {meeting.meeting_mode.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div style={{ paddingLeft: '8px' }}>
            {isExpanded ? <ChevronUp size={20} color={colors.utility.secondaryText} /> : <ChevronDown size={20} color={colors.utility.secondaryText} />}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${colors.utility.primaryText}10`
          }}>
            {/* Agenda */}
            {meeting.agenda && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.utility.secondaryText, marginBottom: '4px' }}>
                  Agenda
                </div>
                <div style={{ fontSize: '14px', color: colors.utility.primaryText, whiteSpace: 'pre-wrap' }}>
                  {meeting.agenda}
                </div>
              </div>
            )}

            {/* Location/Link */}
            {meeting.meeting_location && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.utility.secondaryText, marginBottom: '4px' }}>
                  Location
                </div>
                <div style={{ fontSize: '14px', color: colors.utility.primaryText }}>
                  {meeting.meeting_location}
                </div>
              </div>
            )}

            {meeting.meeting_link && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.utility.secondaryText, marginBottom: '4px' }}>
                  Meeting Link
                </div>
                <a
                  href={meeting.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '14px', color: colors.brand.primary, textDecoration: 'none' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {meeting.meeting_link}
                </a>
              </div>
            )}

            {/* Notes */}
            {meeting.notes && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.utility.secondaryText, marginBottom: '4px' }}>
                  Notes
                </div>
                <div style={{
                  fontSize: '14px',
                  color: colors.utility.primaryText,
                  whiteSpace: 'pre-wrap',
                  backgroundColor: colors.utility.primaryBackground,
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  {meeting.notes}
                </div>
              </div>
            )}

            {/* Outcome */}
            {meeting.outcome && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.utility.secondaryText, marginBottom: '4px' }}>
                  Outcome
                </div>
                <div style={{ fontSize: '14px', color: colors.utility.primaryText, whiteSpace: 'pre-wrap' }}>
                  {meeting.outcome}
                </div>
              </div>
            )}

            {/* Cancellation Reason */}
            {meeting.status === 'cancelled' && meeting.cancellation_reason && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: colors.utility.secondaryText, marginBottom: '4px' }}>
                  Cancellation Reason
                </div>
                <div style={{ fontSize: '14px', color: '#EF4444', whiteSpace: 'pre-wrap' }}>
                  {meeting.cancellation_reason}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginTop: '20px'
      }}>
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}20`,
            backgroundColor: currentPage === 1 ? colors.utility.secondaryBackground : colors.brand.primary,
            color: currentPage === 1 ? colors.utility.secondaryText : '#FFFFFF',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          Previous
        </button>

        <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}20`,
            backgroundColor: currentPage === totalPages ? colors.utility.secondaryBackground : colors.brand.primary,
            color: currentPage === totalPages ? colors.utility.secondaryText : '#FFFFFF',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '14px'
          }}
        >
          Next
        </button>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div style={{
      textAlign: 'center',
      padding: '60px 20px',
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px'
    }}>
      <Calendar size={48} color={colors.utility.secondaryText} style={{ margin: '0 auto 16px' }} />
      <div style={{ fontSize: '18px', fontWeight: 600, color: colors.utility.primaryText, marginBottom: '8px' }}>
        No meetings found
      </div>
      <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
        {selectedType !== 'all' || selectedStatus !== 'all'
          ? 'Try adjusting your filters to see more meetings'
          : 'Schedule your first meeting to get started'}
      </div>
    </div>
  );

  const renderLoadingState = () => (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
        Loading meetings...
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div style={{
      padding: '20px',
      backgroundColor: '#FEE2E2',
      borderRadius: '8px',
      border: '1px solid #EF4444'
    }}>
      <div style={{ fontSize: '14px', color: '#DC2626', fontWeight: 500 }}>
        {error}
      </div>
      <button
        onClick={fetchMeetings}
        style={{
          marginTop: '12px',
          padding: '6px 12px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: '#DC2626',
          color: '#FFFFFF',
          fontSize: '14px',
          cursor: 'pointer'
        }}
      >
        Try Again
      </button>
    </div>
  );

  if (loading) return renderLoadingState();
  if (error) return renderErrorState();

  return (
    <div>
      {renderFilters()}

      {meetings.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <div style={{ marginBottom: '12px' }}>
            {meetings.map(meeting => renderMeetingCard(meeting))}
          </div>
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default MeetingTimeline;
