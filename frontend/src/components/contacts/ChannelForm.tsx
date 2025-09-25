// frontend/src/components/contacts/ChannelForm.tsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import FormField from '../common/FormField';
import { ContactChannelFormData } from '../../types/contact.types';
import { CHANNEL_TYPES, CHANNEL_SUBTYPES } from '../../constants/contact.constants';

interface ChannelFormProps {
  channels: ContactChannelFormData[];
  onChannelsChange: (channels: ContactChannelFormData[]) => void;
  errors?: Record<number, { channel_type?: string; channel_value?: string; channel_subtype?: string }>;
  disabled?: boolean;
  maxChannels?: number;
}

const ChannelForm: React.FC<ChannelFormProps> = ({
  channels,
  onChannelsChange,
  errors = {},
  disabled = false,
  maxChannels = 10
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  // Fixed: Only add channel if we're in create mode (no existing channels with IDs)
  useEffect(() => {
    const hasExistingChannels = channels.some(ch => ch.id !== undefined);
    if (channels.length === 0 && !hasExistingChannels) {
      addChannel();
    }
  }, []);

  // Fixed: Expand existing channels when they load in edit mode
  useEffect(() => {
    if (channels.length > 0) {
      const channelIds = channels
        .filter(ch => ch.id || ch._temp_id)
        .map(ch => ch._temp_id || ch.id?.toString() || '');
      
      if (channelIds.length > 0) {
        setExpandedChannels(new Set(channelIds));
      }
    }
  }, [channels.length]);

  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addChannel = () => {
    if (channels.length >= maxChannels) return;
    
    const newChannel: ContactChannelFormData = {
      _temp_id: generateTempId(),
      channel_type: 'mobile',  // Default to mobile for better UX
      channel_value: '+91 ',   // Start with +91 prefix like contacts
      channel_subtype: 'personal',
      is_primary: channels.length === 0
    };

    const updatedChannels = [...channels, newChannel];
    onChannelsChange(updatedChannels);
    setExpandedChannels(prev => new Set([...prev, newChannel._temp_id!]));
  };

  const removeChannel = (index: number) => {
    if (channels.length <= 1) return;
    
    const channelToRemove = channels[index];
    const updatedChannels = channels.filter((_, i) => i !== index);
    
    if (channelToRemove.is_primary && updatedChannels.length > 0) {
      updatedChannels[0].is_primary = true;
    }
    
    onChannelsChange(updatedChannels);
    
    if (channelToRemove._temp_id) {
      setExpandedChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelToRemove._temp_id!);
        return newSet;
      });
    }
  };

  const updateChannel = (index: number, field: keyof ContactChannelFormData, value: any) => {
    const updatedChannels = [...channels];
    updatedChannels[index] = { ...updatedChannels[index], [field]: value };
    
    if (field === 'is_primary' && value === true) {
      const currentType = updatedChannels[index].channel_type;
      updatedChannels.forEach((channel, i) => {
        if (i !== index && channel.channel_type === currentType) {
          channel.is_primary = false;
        }
      });
    }
    
    onChannelsChange(updatedChannels);
  };

  const setPrimary = (index: number) => {
    const updatedChannels = [...channels];
    const currentType = updatedChannels[index].channel_type;
    
    updatedChannels.forEach((channel, i) => {
      if (channel.channel_type === currentType) {
        channel.is_primary = i === index;
      }
    });
    
    onChannelsChange(updatedChannels);
  };

  const toggleExpanded = (channelId: string) => {
    setExpandedChannels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channelId)) {
        newSet.delete(channelId);
      } else {
        newSet.add(channelId);
      }
      return newSet;
    });
  };

  // Use the SAME validation logic as ContactFormPage.tsx that works
  const validateChannelValue = (type: string, value: string): string | undefined => {
    if (!value.trim()) return 'This field is required';
    
    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        break;
        
      case 'mobile':
      case 'whatsapp':
        // EXACT same logic as working ContactFormPage
        const cleanedPhone = value.replace(/[\s\-()]/g, '');
        
        if (!cleanedPhone.startsWith('+')) {
          return 'Must start with + and country code (e.g., +91 for India)';
        } else {
          const withoutPlus = cleanedPhone.substring(1);
          if (!/^\d+$/.test(withoutPlus)) {
            return 'Only numbers allowed after country code';
          } else if (cleanedPhone.length < 8 || cleanedPhone.length > 16) {
            return 'Must be 8-16 digits including country code';
          }
        }
        break;
        
      case 'instagram':
        const instagramRegex = /^@?[a-zA-Z0-9._]{1,30}$/;
        if (!instagramRegex.test(value)) {
          return 'Please enter a valid Instagram handle';
        }
        break;
        
      case 'twitter':
        const twitterRegex = /^@?[a-zA-Z0-9_]{1,15}$/;
        if (!twitterRegex.test(value)) {
          return 'Please enter a valid Twitter handle';
        }
        break;
        
      case 'linkedin':
        const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$|^[a-zA-Z0-9-]+$/;
        if (!linkedinRegex.test(value)) {
          return 'Please enter a valid LinkedIn profile';
        }
        break;
    }
    
    return undefined;
  };

  // Format mobile numbers to +91 format
  const formatMobileNumber = (value: string): string => {
    // If it doesn't start with +, try to format it
    if (!value.startsWith('+')) {
      // Remove all non-digits
      let digits = value.replace(/\D/g, '');
      
      // If starts with 91, use as is
      if (digits.startsWith('91')) {
        return `+${digits.slice(0, 12)}`; // +91 + 10 digits max
      }
      // If it's 10 digits, assume Indian number
      else if (digits.length === 10) {
        return `+91${digits}`;
      }
      // Otherwise add +91 prefix
      else {
        return `+91${digits.slice(0, 10)}`;
      }
    }
    
    // Already has +, just clean it up
    let digits = value.slice(1).replace(/\D/g, '');
    if (digits.startsWith('91')) {
      return `+${digits.slice(0, 12)}`;
    }
    return value;
  };

  const getChannelIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      email: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 5L2 7" />
        </svg>
      ),
      mobile: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
      whatsapp: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
      other: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      )
    };
    
    return iconMap[type] || iconMap.other;
  };

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

  const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const StarIcon = ({ filled }: { filled: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );

  const getPlaceholder = (type: string) => {
    const placeholders: Record<string, string> = {
      email: 'john@example.com',
      mobile: '+91 98765 43210',
      whatsapp: '+91 98765 43210',
      instagram: '@username',
      twitter: '@username',
      linkedin: 'linkedin.com/in/username',
      other: 'Enter contact information'
    };
    
    return placeholders[type] || placeholders.other;
  };

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: colors.utility.primaryText
        }}>
          Communication Channels
        </h4>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            {channels.length}/{maxChannels} channels
          </span>
          
          {channels.length < maxChannels && (
            <button
              type="button"
              onClick={addChannel}
              disabled={disabled}
              style={{
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: disabled ? 0.6 : 1
              }}
            >
              <PlusIcon />
              Add Channel
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {channels.map((channel, index) => {
          const channelId = channel._temp_id || channel.id?.toString() || index.toString();
          const isExpanded = expandedChannels.has(channelId);
          const channelError = errors[index];
          const hasError = channelError && Object.keys(channelError).length > 0;
          const validationError = validateChannelValue(channel.channel_type, channel.channel_value);
          
          return (
            <div
              key={channelId}
              style={{
                backgroundColor: colors.utility.primaryBackground,
                border: `1px solid ${hasError || validationError ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: channel.is_primary ? colors.brand.primary + '10' : 'transparent',
                  borderBottom: isExpanded ? `1px solid ${colors.utility.primaryText}10` : 'none'
                }}
                onClick={() => toggleExpanded(channelId)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    color: channel.is_primary ? colors.brand.primary : colors.utility.secondaryText
                  }}>
                    {getChannelIcon(channel.channel_type)}
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
                      {CHANNEL_TYPES.find(t => t.value === channel.channel_type)?.label}
                      {channel.is_primary && <StarIcon filled={true} />}
                    </div>
                    
                    {channel.channel_value && (
                      <div style={{
                        fontSize: '12px',
                        color: validationError ? colors.semantic.error : colors.utility.secondaryText,
                        fontFamily: 'monospace'
                      }}>
                        {channel.channel_value || getPlaceholder(channel.channel_type)}
                        {validationError && (
                          <span style={{ color: colors.semantic.error, marginLeft: '8px' }}>
                            ({validationError})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!channel.is_primary && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrimary(index);
                      }}
                      disabled={disabled}
                      style={{
                        backgroundColor: 'transparent',
                        color: colors.utility.secondaryText,
                        border: `1px solid ${colors.utility.secondaryText}40`,
                        borderRadius: '4px',
                        padding: '4px 6px',
                        fontSize: '10px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <StarIcon filled={false} />
                      Set Primary
                    </button>
                  )}

                  {channels.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeChannel(index);
                      }}
                      disabled={disabled}
                      style={{
                        backgroundColor: 'transparent',
                        color: colors.semantic.error,
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        opacity: disabled ? 0.6 : 1
                      }}
                    >
                      <TrashIcon />
                    </button>
                  )}

                  <div
                    style={{
                      color: colors.utility.secondaryText,
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <ChevronDownIcon />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '16px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px'
                  }}>
                    <FormField
                      type="select"
                      name={`channel_${index}_type`}
                      label="Channel Type"
                      value={channel.channel_type}
                      onChange={(value: string) => {
                        updateChannel(index, 'channel_type', value);
                        // Auto-set +91 for mobile/whatsapp when changing type
                        if (value === 'mobile' || value === 'whatsapp') {
                          const currentValue = channel.channel_value || '';
                          if (!currentValue.startsWith('+91')) {
                            updateChannel(index, 'channel_value', '+91 ');
                          }
                        }
                      }}
                      options={CHANNEL_TYPES.map(type => ({
                        value: type.value,
                        label: type.label
                      }))}
                      error={channelError?.channel_type}
                      disabled={disabled}
                      required
                      size="small"
                    />

                    <FormField
                      type="select"
                      name={`channel_${index}_subtype`}
                      label="Category"
                      value={channel.channel_subtype}
                      onChange={(value: string) => updateChannel(index, 'channel_subtype', value)}
                      options={CHANNEL_SUBTYPES.map(subtype => ({
                        value: subtype.value,
                        label: subtype.label
                      }))}
                      error={channelError?.channel_subtype}
                      disabled={disabled}
                      size="small"
                    />
                  </div>

                  <FormField
                    type={channel.channel_type === 'email' ? 'email' : 'text'}
                    name={`channel_${index}_value`}
                    label={`${CHANNEL_TYPES.find(t => t.value === channel.channel_type)?.label} Address`}
                    value={channel.channel_value}
                    onChange={(value: string) => {
                      let formattedValue = value;
                      
                      if (channel.channel_type === 'mobile' || channel.channel_type === 'whatsapp') {
                        formattedValue = formatMobileNumber(value);
                      }
                      
                      updateChannel(index, 'channel_value', formattedValue);
                    }}
                    placeholder={getPlaceholder(channel.channel_type)}
                    error={channelError?.channel_value || validationError}
                    disabled={disabled}
                    required
                    size="small"
                  />

                  <FormField
                    type="checkbox"
                    name={`channel_${index}_primary`}
                    label=""
                    checkboxLabel={`Set as primary ${channel.channel_type} channel`}
                    value={channel.is_primary}
                    onChange={(value: boolean) => {
                      if (value) {
                        setPrimary(index);
                      }
                    }}
                    disabled={disabled}
                    size="small"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: colors.utility.secondaryText,
        lineHeight: '1.4'
      }}>
        <strong>Tip:</strong> Mobile numbers automatically format to +91 XXXXX XXXXX for Indian numbers
      </div>
    </div>
  );
};

export default ChannelForm;