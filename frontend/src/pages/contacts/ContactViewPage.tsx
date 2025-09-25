// frontend/src/pages/contacts/ContactViewPage.tsx

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useContact, useDeleteContact } from '../../hooks/useContacts';
import toastService from '../../services/toast.service';

const ContactViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();
  const { environment } = useAuth();
  
  const contactId = id ? parseInt(id) : 0;
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  // Data fetching
  const { data: contact, isLoading, error } = useContact(contactId);
  const deleteContactMutation = useDeleteContact();
  
  // UI State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'channels'>('overview');
  
  // Handle deletion
  const handleDelete = async () => {
    try {
      await deleteContactMutation.mutateAsync(contactId);
      toastService.success('Contact deleted successfully');
      navigate('/contacts');
    } catch (error) {
      // Error handled by mutation
    }
    setShowDeleteConfirm(false);
  };
  
  // Generate initials and color for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  const getAvatarColor = (name: string) => {
    const avatarColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return avatarColors[hash % avatarColors.length];
  };
  
  // Get status info
  const getStatusInfo = () => {
    if (!contact) return { color: colors.utility.secondaryText, label: 'Unknown' };
    
    if (!contact.is_active) {
      return { color: colors.utility.secondaryText, label: 'Inactive', bgColor: `${colors.utility.secondaryText}20` };
    }
    if (contact.is_customer) {
      return { color: colors.semantic.success, label: 'Customer', bgColor: `${colors.semantic.success}20` };
    }
    return { color: colors.brand.primary, label: 'Prospect', bgColor: `${colors.brand.primary}20` };
  };
  
  // Icons
  const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
  
  const EditIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
  
  const TrashIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );
  
  const UserPlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
  
  const MailIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 5L2 7" />
    </svg>
  );
  
  const PhoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
  
  const MessageCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
  
  const CalendarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
  
  const StarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
  
  // Loading state
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
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
          <p style={{ color: colors.utility.secondaryText }}>Loading contact details...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !contact) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: colors.semantic.error, margin: '0 0 16px 0' }}>Contact Not Found</h2>
          <p style={{ color: colors.utility.secondaryText, margin: '0 0 24px 0' }}>
            The contact you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/contacts')}
            style={{
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: 'pointer'
            }}
          >
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }
  
  const statusInfo = getStatusInfo();
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => navigate('/contacts')}
                style={{
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: colors.utility.secondaryText
                }}
              >
                <ArrowLeftIcon />
              </button>
              
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: getAvatarColor(contact.name),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '24px',
                  border: `4px solid ${colors.utility.primaryBackground}`
                }}
              >
                {getInitials(contact.name)}
              </div>
              
              <div>
                <h1 style={{
                  margin: '0 0 8px 0',
                  fontSize: '32px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}>
                  {contact.prefix} {contact.name}
                </h1>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: statusInfo.bgColor,
                      color: statusInfo.color
                    }}
                  >
                    {statusInfo.label}
                  </div>
                  
                  <span style={{
                    fontSize: '14px',
                    color: colors.utility.secondaryText
                  }}>
                    {contact.channel_count || 0} communication channels • Environment: {environment}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => navigate(`/contacts/${contactId}/edit`)}
                style={{
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <EditIcon />
                Edit
              </button>
              
              {!contact.is_customer && (
                <button
                  onClick={() => toastService.info('Convert to customer feature coming soon')}
                  style={{
                    backgroundColor: 'transparent',
                    color: colors.semantic.success,
                    border: `2px solid ${colors.semantic.success}`,
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
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
                  border: `2px solid ${colors.semantic.error}`,
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              backgroundColor: activeTab === 'overview' ? colors.brand.primary : 'transparent',
              color: activeTab === 'overview' ? 'white' : colors.utility.secondaryText,
              border: `2px solid ${activeTab === 'overview' ? colors.brand.primary : colors.utility.primaryText + '20'}`,
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('channels')}
            style={{
              backgroundColor: activeTab === 'channels' ? colors.brand.primary : 'transparent',
              color: activeTab === 'channels' ? 'white' : colors.utility.secondaryText,
              border: `2px solid ${activeTab === 'channels' ? colors.brand.primary : colors.utility.primaryText + '20'}`,
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Communication Channels ({contact.channels?.length || 0})
          </button>
        </div>
        
        {/* Content */}
        {activeTab === 'overview' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {/* Contact Information */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '24px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                Contact Information
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    Full Name
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: colors.utility.primaryText
                  }}>
                    {contact.prefix} {contact.name}
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
                    color: contact.is_active ? colors.semantic.success : colors.semantic.error
                  }}>
                    {contact.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                <div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CalendarIcon />
                    Created
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: colors.utility.primaryText
                  }}>
                    {new Date(contact.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                
                <div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CalendarIcon />
                    Last Updated
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: colors.utility.primaryText
                  }}>
                    {new Date(contact.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            {/* All Contact Methods - Fixed to show all channels */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '24px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                Contact Methods ({contact.channels?.length || 0} total)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {contact.channels?.map((channel) => (
                  <div
                    key={channel.id}
                    style={{
                      padding: '12px',
                      backgroundColor: colors.utility.primaryBackground,
                      borderRadius: '8px',
                      border: `1px solid ${channel.is_primary ? colors.brand.primary + '40' : colors.utility.primaryText + '10'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{ color: channel.is_primary ? colors.brand.primary : colors.utility.secondaryText }}>
                      {channel.channel_type === 'email' && <MailIcon />}
                      {channel.channel_type === 'mobile' && <PhoneIcon />}
                      {channel.channel_type === 'whatsapp' && <MessageCircleIcon />}
                      {!['email', 'mobile', 'whatsapp'].includes(channel.channel_type) && <MessageCircleIcon />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '12px',
                        color: colors.utility.secondaryText,
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {channel.channel_type.charAt(0).toUpperCase() + channel.channel_type.slice(1)}
                        {channel.is_primary && (
                          <>
                            <StarIcon />
                            <span style={{ fontSize: '10px', marginLeft: '2px' }}>(Primary)</span>
                          </>
                        )}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: colors.utility.primaryText,
                        fontFamily: 'monospace'
                      }}>
                        {channel.channel_value}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: colors.utility.secondaryText,
                        marginTop: '2px'
                      }}>
                        {channel.channel_subtype}
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!contact.channels || contact.channels.length === 0) && (
                  <p style={{
                    color: colors.utility.secondaryText,
                    fontStyle: 'italic',
                    margin: 0
                  }}>
                    No contact methods available
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'channels' && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              All Communication Channels
            </h3>
            
            {contact.channels && contact.channels.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '16px'
              }}>
                {contact.channels.map((channel) => (
                  <div
                    key={channel.id}
                    style={{
                      padding: '16px',
                      backgroundColor: colors.utility.primaryBackground,
                      borderRadius: '8px',
                      border: `1px solid ${channel.is_primary ? colors.brand.primary + '40' : colors.utility.primaryText + '10'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      color: channel.is_primary ? colors.brand.primary : colors.utility.secondaryText
                    }}>
                      {channel.channel_type === 'email' && <MailIcon />}
                      {channel.channel_type === 'mobile' && <PhoneIcon />}
                      {channel.channel_type === 'whatsapp' && <MessageCircleIcon />}
                      {!['email', 'mobile', 'whatsapp'].includes(channel.channel_type) && <MessageCircleIcon />}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '12px',
                        color: colors.utility.secondaryText,
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {channel.channel_type.charAt(0).toUpperCase() + channel.channel_type.slice(1)}
                        {channel.is_primary && <StarIcon />}
                        <span style={{ marginLeft: '8px' }}>
                          ({channel.channel_subtype})
                        </span>
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: colors.utility.primaryText,
                        fontFamily: 'monospace'
                      }}>
                        {channel.channel_value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{
                color: colors.utility.secondaryText,
                fontStyle: 'italic'
              }}>
                No communication channels found
              </p>
            )}
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
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
              padding: '32px',
              maxWidth: '450px',
              width: '90%'
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                color: colors.utility.primaryText,
                fontSize: '20px'
              }}>
                Confirm Delete
              </h3>
              <p style={{
                margin: '0 0 24px 0',
                color: colors.utility.secondaryText,
                lineHeight: '1.5'
              }}>
                Are you sure you want to delete "{contact.prefix} {contact.name}"? 
                This action cannot be undone and will remove all associated communication channels.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    backgroundColor: 'transparent',
                    color: colors.utility.secondaryText,
                    border: `1px solid ${colors.utility.secondaryText}40`,
                    borderRadius: '8px',
                    padding: '10px 20px',
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
                    borderRadius: '8px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    cursor: deleteContactMutation.isPending ? 'not-allowed' : 'pointer',
                    opacity: deleteContactMutation.isPending ? 0.7 : 1
                  }}
                >
                  {deleteContactMutation.isPending ? 'Deleting...' : 'Delete Contact'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ContactViewPage;