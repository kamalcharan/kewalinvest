// frontend/src/components/contacts/ContactCard.tsx

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Contact } from '../../types/contact.types';

interface ContactCardProps {
  contact: Contact;
  onView: () => void;
  onEdit: () => void;
  onConvertToCustomer?: () => void;
  onDelete: () => void;
  onActivate?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (contactId: number, selected: boolean) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onView,
  onEdit,
  onConvertToCustomer,
  onDelete,
  onActivate,
  selectable = false,
  selected = false,
  onSelectionChange
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'activate' | 'deactivate' | null>(null);

  const handleActionClick = (action: 'activate' | 'deactivate') => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'activate' && onActivate) {
      onActivate();
    } else if (confirmAction === 'deactivate') {
      onDelete();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancelAction = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  // Get primary channels
  const primaryEmail = contact.channels?.find(ch => ch.channel_type === 'email' && ch.is_primary)?.channel_value;
  const primaryMobile = contact.channels?.find(ch => ch.channel_type === 'mobile' && ch.is_primary)?.channel_value;

  // Icons
  const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const EmailIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );

  const PhoneIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );

  const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const EyeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  );

  const UserPlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );

  const AlertCircleIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  return (
    <>
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '16px',
        border: `1px solid ${colors.utility.primaryText}${contact.is_active ? '10' : '20'}`,
        opacity: contact.is_active ? 1 : 0.7,
        transition: 'all 0.2s',
        position: 'relative'
      }}>
        {/* Selection Checkbox */}
        {selectable && (
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px'
          }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelectionChange?.(contact.id, e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer'
              }}
            />
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          marginLeft: selectable ? '32px' : '0'
        }}>
          {/* Avatar */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: contact.is_active ? colors.brand.primary : colors.utility.secondaryText,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0
          }}>
            <UserIcon />
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}>
                  {contact.prefix} {contact.name}
                </h3>

                {/* Status Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {!contact.is_active && (
                    <span style={{
                      backgroundColor: colors.semantic.error + '20',
                      color: colors.semantic.error,
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      Inactive
                    </span>
                  )}
                  
                  {contact.is_customer && (
                    <span style={{
                      backgroundColor: colors.brand.tertiary + '20',
                      color: colors.brand.tertiary,
                      borderRadius: '12px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      Customer
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={onView}
                  style={{
                    backgroundColor: 'transparent',
                    color: colors.brand.primary,
                    border: `1px solid ${colors.brand.primary}40`,
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="View Contact"
                >
                  <EyeIcon />
                  View
                </button>

                <button
                  onClick={onEdit}
                  style={{
                    backgroundColor: 'transparent',
                    color: colors.semantic.info,
                    border: `1px solid ${colors.semantic.info}40`,
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Edit Contact"
                >
                  <EditIcon />
                  Edit
                </button>

                {/* Convert to Customer Button - Only for non-customers */}
                {!contact.is_customer && contact.is_active && onConvertToCustomer && (
                  <button
                    onClick={onConvertToCustomer}
                    style={{
                      backgroundColor: 'transparent',
                      color: colors.brand.tertiary,
                      border: `1px solid ${colors.brand.tertiary}40`,
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Convert to Customer"
                  >
                    <UserPlusIcon />
                    Convert
                  </button>
                )}

                {/* Conditional Activate/Delete Button */}
                {contact.is_active ? (
                  <button
                    onClick={() => handleActionClick('deactivate')}
                    style={{
                      backgroundColor: 'transparent',
                      color: colors.semantic.error,
                      border: `1px solid ${colors.semantic.error}40`,
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Deactivate Contact"
                  >
                    <TrashIcon />
                    Delete
                  </button>
                ) : (
                  <button
                    onClick={() => handleActionClick('activate')}
                    style={{
                      backgroundColor: 'transparent',
                      color: colors.semantic.success,
                      border: `1px solid ${colors.semantic.success}40`,
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Activate Contact"
                  >
                    <CheckCircleIcon />
                    Activate
                  </button>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {primaryEmail && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: colors.utility.secondaryText,
                  fontSize: '13px'
                }}>
                  <EmailIcon />
                  <span>{primaryEmail}</span>
                </div>
              )}

              {primaryMobile && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: colors.utility.secondaryText,
                  fontSize: '13px'
                }}>
                  <PhoneIcon />
                  <span>{primaryMobile}</span>
                </div>
              )}

              {/* Channel Count */}
              {contact.channel_count && contact.channel_count > 0 && (
                <div style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText,
                  marginTop: '4px'
                }}>
                  {contact.channel_count} communication channel{contact.channel_count !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${colors.utility.primaryText}10`,
            animation: 'modalSlideIn 0.2s ease-out'
          }}>
            {/* Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: confirmAction === 'activate' 
                  ? colors.semantic.success + '15' 
                  : colors.semantic.error + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: confirmAction === 'activate' 
                  ? colors.semantic.success 
                  : colors.semantic.error
              }}>
                <AlertCircleIcon />
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              textAlign: 'center'
            }}>
              {confirmAction === 'activate' ? 'Activate Contact' : 'Deactivate Contact'}
            </h2>

            {/* Message */}
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '15px',
              color: colors.utility.secondaryText,
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              {confirmAction === 'activate' ? (
                <>
                  You are about to <strong style={{ color: colors.semantic.success }}>activate</strong> the contact <strong>{contact.name}</strong>.
                  {contact.is_customer && ' This will also activate the linked customer record.'}
                  <br /><br />
                  This contact will become active and visible in your active contacts list.
                </>
              ) : (
                <>
                  You are about to <strong style={{ color: colors.semantic.error }}>deactivate</strong> the contact <strong>{contact.name}</strong>.
                  {contact.is_customer && ' This will also deactivate the linked customer record.'}
                  <br /><br />
                  This contact will be marked as inactive but not permanently deleted.
                </>
              )}
            </p>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelAction}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.secondaryText}40`,
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmAction}
                style={{
                  backgroundColor: confirmAction === 'activate' 
                    ? colors.semantic.success 
                    : colors.semantic.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                {confirmAction === 'activate' ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Animation */}
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default ContactCard;