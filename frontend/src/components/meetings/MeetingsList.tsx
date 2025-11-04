// frontend/src/components/meetings/MeetingsList.tsx

import React, { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  useCustomerMeetings,
  useCompleteMeeting,
  useCancelMeeting,
  useDeleteMeeting
} from '../../hooks/useMeetings';
import { MeetingCard } from './MeetingCard';
import { CreateMeetingModal } from './CreateMeetingModal';
import type { CustomerMeeting, CompleteMeetingRequest, CancelMeetingRequest } from '../../types/meeting.types';

interface MeetingsListProps {
  customerId: number;
}

type TabType = 'upcoming' | 'past';

export const MeetingsList: React.FC<MeetingsListProps> = ({ customerId }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<CustomerMeeting | null>(null);
  const [completingMeeting, setCompletingMeeting] = useState<CustomerMeeting | null>(null);
  const [cancellingMeeting, setCancellingMeeting] = useState<CustomerMeeting | null>(null);

  // Hooks
  const { data: meetingsData, isLoading, refetch } = useCustomerMeetings(customerId);
  const completeMutation = useCompleteMeeting();
  const cancelMutation = useCancelMeeting();
  const deleteMutation = useDeleteMeeting();

  const meetings = meetingsData?.meetings || [];

  // Filter meetings
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingMeetings = meetings.filter((m) => {
    if (m.status !== 'scheduled') return false;
    const meetingDate = new Date(m.scheduled_date);
    return meetingDate >= today;
  });

  const pastMeetings = meetings.filter((m) => {
    if (m.status === 'scheduled') {
      const meetingDate = new Date(m.scheduled_date);
      return meetingDate < today;
    }
    return m.status === 'completed' || m.status === 'cancelled';
  });

  // Handlers
  const handleEdit = (meeting: CustomerMeeting) => {
    setEditingMeeting(meeting);
    setIsCreateModalOpen(true);
  };

  const handleComplete = (meeting: CustomerMeeting) => {
    setCompletingMeeting(meeting);
  };

  const handleConfirmComplete = async () => {
    if (!completingMeeting) return;

    const notes = prompt('Add notes about this meeting (optional):');
    const outcome = prompt('Meeting outcome (optional):');

    const data: CompleteMeetingRequest = {
      notes: notes || undefined,
      outcome: outcome || undefined
    };

    try {
      await completeMutation.mutateAsync({ id: completingMeeting.id, data });
      setCompletingMeeting(null);
      refetch();
    } catch (error) {
      console.error('Error completing meeting:', error);
    }
  };

  const handleCancel = (meeting: CustomerMeeting) => {
    setCancellingMeeting(meeting);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingMeeting) return;

    const reason = prompt('Reason for cancellation:');
    if (!reason) {
      alert('Cancellation reason is required');
      return;
    }

    const data: CancelMeetingRequest = {
      cancellation_reason: reason
    };

    try {
      await cancelMutation.mutateAsync({ id: cancellingMeeting.id, data });
      setCancellingMeeting(null);
      refetch();
    } catch (error) {
      console.error('Error cancelling meeting:', error);
    }
  };

  const handleDelete = async (meeting: CustomerMeeting) => {
    try {
      await deleteMutation.mutateAsync({ id: meeting.id, customerId: meeting.customer_id });
      refetch();
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setEditingMeeting(null);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  // Empty state
  const EmptyState = ({ message }: { message: string }) => (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px'
      }}
    >
      <Calendar size={48} color={colors.utility.secondaryText} style={{ opacity: 0.5, marginBottom: '16px' }} />
      <p style={{ fontSize: '16px', color: colors.utility.secondaryText, margin: 0 }}>{message}</p>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: colors.utility.primaryText }}>
          Customer Meetings
        </h2>
        <button
          onClick={() => {
            setEditingMeeting(null);
            setIsCreateModalOpen(true);
          }}
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'upcoming' ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
            color: activeTab === 'upcoming' ? colors.brand.primary : colors.utility.secondaryText,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Upcoming ({upcomingMeetings.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'past' ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
            color: activeTab === 'past' ? colors.brand.primary : colors.utility.secondaryText,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Past ({pastMeetings.length})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>
          Loading meetings...
        </div>
      ) : (
        <>
          {activeTab === 'upcoming' && (
            <div>
              {upcomingMeetings.length === 0 ? (
                <EmptyState message="No upcoming meetings scheduled" />
              ) : (
                upcomingMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onEdit={handleEdit}
                    onComplete={handleComplete}
                    onCancel={handleCancel}
                    onDelete={handleDelete}
                    isUpcoming={true}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'past' && (
            <div>
              {pastMeetings.length === 0 ? (
                <EmptyState message="No past meetings" />
              ) : (
                pastMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onDelete={handleDelete}
                    isUpcoming={false}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <CreateMeetingModal
        customerId={customerId}
        meeting={editingMeeting || undefined}
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
      />

      {/* Complete Confirmation Dialog */}
      {completingMeeting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setCompletingMeeting(null)}
        >
          <div
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: colors.utility.primaryText }}>
              Complete Meeting?
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: colors.utility.secondaryText }}>
              Mark this meeting as completed?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCompletingMeeting(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmComplete}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.semantic.success,
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancellingMeeting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setCancellingMeeting(null)}
        >
          <div
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: colors.utility.primaryText }}>
              Cancel Meeting?
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: colors.utility.secondaryText }}>
              Are you sure you want to cancel this meeting?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCancellingMeeting(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                No
              </button>
              <button
                onClick={handleConfirmCancel}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: colors.semantic.error,
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingsList;
