// frontend/src/components/contacts/ContactDetail.tsx

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useContact, useAddChannel, useUpdateChannel, useDeleteContact } from '../../hooks/useContacts';
import ContactForm from './ContactForm';
import ChannelForm from './ChannelForm';
import { Contact, ContactChannel } from '../../types/contact.types';
import toastService from '../../services/toast.service';

interface ContactDetailProps {
  contactId: number;
  onClose: () => void;
  onEdit?: () => void;
  onConvertToCustomer?: (contact: Contact) => void;
  onContactUpdated?: (contact: Contact) => void;
  onContactDeleted?: () => void;
}

const ContactDetail: React.FC<ContactDetailProps> = ({
  contactId,
  onClose,
  onEdit,
  onConvertToCustomer,
  onContactUpdated,
  onContactDeleted
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Data fetching
  const { data: contact, isLoading, error } = useContact(contactId);
  const addChannelMutation = useAddChannel();
  const updateChannelMutation = useUpdateChannel();
  const deleteContactMutation = useDeleteContact();

  // UI State
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'edit'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));

  // Handle contact deletion
  const handleDelete = async () => {
    try {
      await deleteContactMutation.mutateAsync(contactId);
      setShowDeleteConfirm(false);
      onContactDeleted?.();
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handle form success
  const handleFormSuccess = (updatedContact: Contact) => {
    setActiveTab('overview');
    onContactUpdated?.(updatedContact);
    toastService.success('Contact updated successfully');
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Generate avatar initials and color
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return colors[hash % colors.length];
  };

  // Get status info
  const getStatusInfo = (contact: Contact) => {
    if (!contact.is_active) {
      return { color: colors.utility.secondaryText, label: 'Inactive', bgColor: `${colors.utility.secondaryText}20` };
    }
    if (contact.is_customer) {
      return { color: colors.semantic.success, label: 'Customer', bgColor: `${colors.semantic.success}20` };
    }
    return { color: colors.brand.primary, label: 'Prospect', bgColor: `${colors.brand.primary}20` };
  };

  // Icons
  const XIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const UserPlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const MailIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  );

  const PhoneIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );

  const MessageCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  const StarIcon = ({ filled }: { filled: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );

  // Loading state
  if (isLoading) {
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
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '12px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: `3px solid ${colors.brand.primary}20`,
            borderTop: `3px solid ${colors.brand.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: colors.utility.primaryText, margin: 0 }}>Loading contact details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !contact) {
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
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <h3 style={{ color: colors.semantic.error, margin: '0 0 12px 0' }}>Contact Not Found</h3>
          <p style={{ color: colors.utility.secondaryText, margin: '0 0 20px 0' }}>
            The contact you're looking for could not be found or may have been deleted.
          </p>
          <button
            onClick={onClose}
            style={{
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(contact);

  return (
    <>
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
          borderRadius: '12px',
          width: '100%',
          maxWidth: activeTab === 'edit' ? '800px' : '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: `1px solid ${colors.utility.primaryText}10`,
            backgroundColor: colors.utility.secondaryBackground
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              {/* Contact Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: getAvatarColor(contact.name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '20px',
                    border: `3px solid ${colors.utility.primaryBackground}`
                  }}
                >
                  {getInitials(contact.name)}
                </div>
                
                <div>
                  <h2 style={{
                    margin: '0 0 4px 0',
                    fontSize: '24px',
                    fontWeight: '600',
                    color: colors.utility.primaryText
                  }}>
                    {contact.prefix} {contact.name}
                  </h2>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: statusInfo.bgColor,
                        color: statusInfo.color
                      }}
                    >
                      {statusInfo.label}
                    </div>
                    
                    <div style={{
                      fontSize: '12px',
                      color: colors.utility.secondaryText
                    }}>
                      {contact.channel_count} communication channels
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <XIcon />
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setActiveTab('edit')}
                style={{
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <EditIcon />
                Edit
              </button>

              {!contact.is_customer && onConvertToCustomer && (
                <button
                  onClick={() => onConvertToCustomer(contact)}
                  style={{
                    backgroundColor: 'transparent',
                    color: colors.semantic.success,
                    border: `1px solid ${colors.semantic.success}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <UserPlusIcon />
                  Convert to Customer
                </button>
              )}

              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.semantic.error,
                  border: `1px solid ${colors.semantic.error}40`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'edit' ? (
              <ContactForm
                mode="edit"
                contactId={contact.id}
                initialData={{
                  prefix: contact.prefix,
                  name: contact.name,
                  channels: contact.channels?.map(ch => ({
                    id: ch.id,
                    channel_type: ch.channel_type,
                    channel_value: ch.channel_value,
                    channel_subtype: ch.channel_subtype,
                    is_primary: ch.is_primary
                  })) || []
                }}
                onCancel={() => setActiveTab('overview')}
                onSuccess={handleFormSuccess}
              />
            ) : (
              <div style={{ padding: '24px' }}>
                {/* Communication Channels */}
                <div style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '8px',
                  marginBottom: '20px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: expandedSections.has('channels') ? `1px solid ${colors.utility.primaryText}10` : 'none'
                    }}
                    onClick={() => toggleSection('channels')}
                  >
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '600',
                      color: colors.utility.primaryText
                    }}>
                      Communication Channels ({contact.channels?.length || 0})
                    </h3>
                    <div style={{
                      transform: expandedSections.has('channels') ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: colors.utility.secondaryText
                    }}>
                      <ChevronDownIcon />
                    </div>
                  </div>

                  {expandedSections.has('channels') && (
                    <div style={{ padding: '16px' }}>
                      {contact.channels && contact.channels.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {contact.channels.map((channel) => (
                            <div
                              key={channel.id}
                              style={{
                                padding: '12px',
                                backgroundColor: colors.utility.primaryBackground,
                                borderRadius: '6px',
                                border: `1px solid ${colors.utility.primaryText}10`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  color: channel.is_primary ? colors.brand.primary : colors.utility.secondaryText
                                }}>
                                  {channel.channel_type === 'email' && <MailIcon />}
                                  {(channel.channel_type === 'mobile' || channel.channel_type === 'whatsapp') && <PhoneIcon />}
                                  {!['email', 'mobile', 'whatsapp'].includes(channel.channel_type) && <MessageCircleIcon />}
                                </div>
                                
                                <div>
                                  <div style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: colors.utility.primaryText,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}>
                                    {channel.channel_type.charAt(0).toUpperCase() + channel.channel_type.slice(1)}
                                    {channel.is_primary && (
                                      <div style={{ color: colors.brand.primary }}>
                                        <StarIcon filled={true} />
                                      </div>
                                    )}
                                  </div>
                                  <div style={{
                                    fontSize: '13px',
                                    color: colors.utility.secondaryText,
                                    fontFamily: 'monospace'
                                  }}>
                                    {channel.channel_value}
                                  </div>
                                  <div style={{
                                    fontSize: '11px',
                                    color: colors.utility.secondaryText,
                                    textTransform: 'capitalize'
                                  }}>
                                    {channel.channel_subtype}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{
                          color: colors.utility.secondaryText,
                          fontStyle: 'italic',
                          margin: 0
                        }}>
                          No communication channels found
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <div
                    style={{
                      padding: '16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: expandedSections.has('info') ? `1px solid ${colors.utility.primaryText}10` : 'none'
                    }}
                    onClick={() => toggleSection('info')}
                  >
                    <h3 style={{
                      margin: 0,
                      fontSize: '16px',
                      fontWeight: '600',
                      color: colors.utility.primaryText
                    }}>
                      Contact Information
                    </h3>
                    <div style={{
                      transform: expandedSections.has('info') ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: colors.utility.secondaryText
                    }}>
                      <ChevronDownIcon />
                    </div>
                  </div>

                  {expandedSections.has('info') && (
                    <div style={{ padding: '16px' }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px'
                      }}>
                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: colors.utility.secondaryText,
                            marginBottom: '4px'
                          }}>
                            Contact ID
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: colors.utility.primaryText,
                            fontFamily: 'monospace'
                          }}>
                            #{contact.id}
                          </div>
                        </div>

                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: colors.utility.secondaryText,
                            marginBottom: '4px'
                          }}>
                            Status
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: colors.utility.primaryText
                          }}>
                            {contact.is_active ? 'Active' : 'Inactive'}
                          </div>
                        </div>

                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: colors.utility.secondaryText,
                            marginBottom: '4px'
                          }}>
                            Created
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: colors.utility.primaryText,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CalendarIcon />
                            {new Date(contact.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <div>
                          <div style={{
                            fontSize: '12px',
                            color: colors.utility.secondaryText,
                            marginBottom: '4px'
                          }}>
                            Last Updated
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: colors.utility.primaryText,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CalendarIcon />
                            {new Date(contact.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }}>
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: colors.utility.primaryText,
              fontSize: '18px'
            }}>
              Delete Contact
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              color: colors.utility.secondaryText,
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete "{contact.prefix} {contact.name}"? This action cannot be undone and will also remove all associated communication channels.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.secondaryText}40`,
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteContactMutation.isPending}
                style={{
                  backgroundColor: colors.semantic.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: deleteContactMutation.isPending ? 'not-allowed' : 'pointer',
                  opacity: deleteContactMutation.isPending ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {deleteContactMutation.isPending ? (
                  <>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <TrashIcon />
                    Delete Contact
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default ContactDetail;