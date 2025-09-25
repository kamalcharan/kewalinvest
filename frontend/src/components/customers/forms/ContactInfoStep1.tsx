// frontend/src/components/customers/forms/ContactInfoStep.tsx

import React, { useState, useCallback } from 'react';
import { CustomerPrefix } from '../../../types/customer.types';
import { ChannelType } from '../../../types/contact.types';
import { useTheme } from '../../../contexts/ThemeContext';
import { validatePhoneNumber, formatPhoneInput } from '../../../utils/phoneValidation';

interface ContactChannel {
  id?: number;
  _temp_id?: string;
  channel_type: ChannelType;
  channel_value: string;
  channel_subtype?: string;
  is_primary: boolean;
}

interface ContactInfoStepProps {
  prefix: CustomerPrefix;
  name: string;
  channels: ContactChannel[];
  errors?: {
    prefix?: string;
    name?: string;
    channels?: Record<number, { channel_value?: string; channel_type?: string }>;
  };
  onChange: (field: string, value: any) => void;
  disabled?: boolean;
}

const ContactInfoStep: React.FC<ContactInfoStepProps> = ({
  prefix,
  name,
  channels,
  errors = {},
  onChange,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Generate temporary ID for new channels
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle adding new channel
  const handleAddChannel = useCallback(() => {
    const newChannel: ContactChannel = {
      _temp_id: generateTempId(),
      channel_type: 'email',
      channel_value: '',
      channel_subtype: 'personal',
      is_primary: channels.length === 0 // First channel is primary by default
    };
    onChange('channels', [...channels, newChannel]);
  }, [channels, onChange]);

  // Handle removing channel
  const handleRemoveChannel = useCallback((index: number) => {
    const updatedChannels = channels.filter((_, i) => i !== index);
    
    // If we removed the primary channel, make the first remaining channel primary
    if (channels[index].is_primary && updatedChannels.length > 0) {
      updatedChannels[0].is_primary = true;
    }
    
    onChange('channels', updatedChannels);
  }, [channels, onChange]);

  // Handle channel field changes
  const handleChannelChange = useCallback((index: number, field: keyof ContactChannel, value: any) => {
    const updatedChannels = [...channels];
    updatedChannels[index] = { ...updatedChannels[index], [field]: value };
    
    // If setting this as primary, remove primary from others
    if (field === 'is_primary' && value === true) {
      updatedChannels.forEach((channel, i) => {
        if (i !== index) {
          channel.is_primary = false;
        }
      });
    }
    
    onChange('channels', updatedChannels);
  }, [channels, onChange]);

  // Validate channel value using centralized validation
  const validateChannelValue = (type: ChannelType, value: string): boolean => {
    if (!value.trim()) return false;
    
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'mobile':
      case 'whatsapp':
        return validatePhoneNumber(value).isValid;
      default:
        return value.trim().length > 0;
    }
  };

  // Icons
  const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case 'email':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        );
      case 'mobile':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        );
      case 'whatsapp':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
    }
  };

  const hasAtLeastOneValidChannel = channels.some(channel => 
    validateChannelValue(channel.channel_type, channel.channel_value)
  );

  return (
    <div style={{ width: '100%' }}>
      {/* Step Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: colors.brand.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '600'
        }}>
          1
        </div>
        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            Contact Information
          </h3>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            Basic details and communication channels
          </p>
        </div>
      </div>

      {/* Basic Information Section */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <UserIcon />
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            Personal Details
          </h4>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          gap: '16px',
          alignItems: 'start'
        }}>
          {/* Prefix */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              Prefix *
            </label>
            <select
              value={prefix}
              onChange={(e) => onChange('prefix', e.target.value as CustomerPrefix)}
              disabled={disabled}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.prefix ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
              <option value="Prof">Prof</option>
            </select>
            {errors.prefix && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.error,
                marginTop: '4px',
                display: 'block'
              }}>
                {errors.prefix}
              </span>
            )}
          </div>

          {/* Name */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onChange('name', e.target.value)}
              disabled={disabled}
              placeholder="Enter customer's full name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.name ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {errors.name && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.error,
                marginTop: '4px',
                display: 'block'
              }}>
                {errors.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact Channels Section */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            Contact Channels
          </h4>
          <button
            type="button"
            onClick={handleAddChannel}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <PlusIcon />
            Add Channel
          </button>
        </div>

        {channels.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            border: `2px dashed ${colors.utility.primaryText}20`,
            borderRadius: '8px'
          }}>
            <p style={{
              color: colors.utility.secondaryText,
              margin: '0 0 16px 0'
            }}>
              At least one contact channel is required
            </p>
            <button
              type="button"
              onClick={handleAddChannel}
              disabled={disabled}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <PlusIcon />
              Add First Channel
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {channels.map((channel, index) => (
              <div
                key={channel.id || channel._temp_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 120px 80px auto',
                  gap: '12px',
                  alignItems: 'start',
                  padding: '16px',
                  border: `1px solid ${colors.utility.primaryText}10`,
                  borderRadius: '8px',
                  backgroundColor: colors.utility.primaryBackground
                }}
              >
                {/* Channel Type */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: colors.utility.secondaryText
                  }}>
                    Type
                  </label>
                  <select
                    value={channel.channel_type}
                    onChange={(e) => {
                      const newType = e.target.value as ChannelType;
                      // Clear value when changing to mobile/whatsapp to start fresh
                      if (newType === 'mobile' || newType === 'whatsapp') {
                        handleChannelChange(index, 'channel_value', '');
                      }
                      handleChannelChange(index, 'channel_type', newType);
                    }}
                    disabled={disabled}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      borderRadius: '6px',
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: '12px'
                    }}
                  >
                    <option value="email">Email</option>
                    <option value="mobile">Mobile</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Channel Value */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: colors.utility.secondaryText
                  }}>
                    {channel.channel_type === 'email' ? 'Email Address' :
                     channel.channel_type === 'mobile' || channel.channel_type === 'whatsapp' ? 'Phone Number' :
                     'Value'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: colors.utility.secondaryText
                    }}>
                      {getChannelIcon(channel.channel_type)}
                    </div>
                    <input
                      type={channel.channel_type === 'email' ? 'email' : 'text'}
                      value={channel.channel_value}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (channel.channel_type === 'mobile' || channel.channel_type === 'whatsapp') {
                          value = formatPhoneInput(value);
                        }
                        handleChannelChange(index, 'channel_value', value);
                      }}
                      disabled={disabled}
                      placeholder={
                        channel.channel_type === 'email' ? 'example@email.com' :
                        channel.channel_type === 'mobile' || channel.channel_type === 'whatsapp' ? '+91 9876543210' :
                        'Enter value'
                      }
                      style={{
                        width: '100%',
                        padding: '8px 8px 8px 32px',
                        border: `1px solid ${
                          errors.channels?.[index]?.channel_value ? colors.semantic.error : 
                          !validateChannelValue(channel.channel_type, channel.channel_value) && channel.channel_value ? 
                          colors.semantic.warning : colors.utility.primaryText + '20'
                        }`,
                        borderRadius: '6px',
                        backgroundColor: colors.utility.primaryBackground,
                        color: colors.utility.primaryText,
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  {errors.channels?.[index]?.channel_value && (
                    <span style={{
                      fontSize: '11px',
                      color: colors.semantic.error,
                      marginTop: '2px',
                      display: 'block'
                    }}>
                      {errors.channels[index].channel_value}
                    </span>
                  )}
                </div>

                {/* Channel Subtype */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: colors.utility.secondaryText
                  }}>
                    Category
                  </label>
                  <select
                    value={channel.channel_subtype || 'personal'}
                    onChange={(e) => handleChannelChange(index, 'channel_subtype', e.target.value)}
                    disabled={disabled}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      borderRadius: '6px',
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: '12px'
                    }}
                  >
                    <option value="personal">Personal</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Primary Checkbox */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: colors.utility.secondaryText
                  }}>
                    Primary
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '32px'
                  }}>
                    <input
                      type="checkbox"
                      checked={channel.is_primary}
                      onChange={(e) => handleChannelChange(index, 'is_primary', e.target.checked)}
                      disabled={disabled}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: colors.brand.primary
                      }}
                    />
                  </div>
                </div>

                {/* Remove Button */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  height: '56px'
                }}>
                  <button
                    type="button"
                    onClick={() => handleRemoveChannel(index)}
                    disabled={disabled || channels.length === 1}
                    style={{
                      padding: '8px',
                      backgroundColor: 'transparent',
                      color: channels.length === 1 ? colors.utility.secondaryText : colors.semantic.error,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: channels.length === 1 ? 'not-allowed' : 'pointer',
                      opacity: channels.length === 1 ? 0.5 : 1
                    }}
                    title={channels.length === 1 ? 'At least one channel required' : 'Remove channel'}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasAtLeastOneValidChannel && channels.length > 0 && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: colors.semantic.warning + '10',
            border: `1px solid ${colors.semantic.warning}40`,
            borderRadius: '6px',
            fontSize: '14px',
            color: colors.semantic.warning
          }}>
            At least one valid contact channel is required to proceed
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactInfoStep;