// frontend/src/components/customers/forms/ContactInfoStep.tsx

import React from 'react';
import { CustomerPrefix } from '../../../types/customer.types';
import { ContactChannelFormData } from '../../../types/contact.types';
import { useTheme } from '../../../contexts/ThemeContext';
// Import ChannelForm from Contacts module - keeping it in its original location
import ChannelForm from '../../contacts/ChannelForm';

interface ContactInfoStepProps {
  prefix: CustomerPrefix;
  name: string;
  channels: ContactChannelFormData[];  // Using the exact type from Contacts
  errors?: {
    prefix?: string;
    name?: string;
    channels?: Record<number, { channel_value?: string; channel_type?: string }>;
    general?: string;
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

  // Icons
  const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
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

      {/* Contact Channels Section - Using ChannelForm from Contacts */}
      <div style={{ marginBottom: '24px' }}>
        <ChannelForm
          channels={channels}
          onChannelsChange={(updatedChannels) => onChange('channels', updatedChannels)}
          errors={errors.channels}
          disabled={disabled}
          maxChannels={10}
        />
      </div>

      {/* Display general errors if any */}
      {errors.general && (
        <div style={{
          padding: '12px',
          backgroundColor: colors.semantic.error + '10',
          border: `1px solid ${colors.semantic.error}40`,
          borderRadius: '6px',
          fontSize: '14px',
          color: colors.semantic.error
        }}>
          {errors.general}
        </div>
      )}
    </div>
  );
};

export default ContactInfoStep;