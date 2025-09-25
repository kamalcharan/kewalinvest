// frontend/src/components/contacts/ContactForm.tsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import FormField from '../common/FormField';
import ChannelForm from './ChannelForm';
import { useCreateContact, useUpdateContact, useContactExists } from '../../hooks/useContacts';
import { ContactFormData, ContactFormErrors, ContactPrefix } from '../../types/contact.types';
import { CONTACT_PREFIXES } from '../../constants/contact.constants';
import toastService from '../../services/toast.service';

interface ContactFormProps {
  initialData?: Partial<ContactFormData>;
  onSubmit?: (data: ContactFormData) => Promise<void>;
  onCancel: () => void;
  onSuccess?: (contact?: any) => void;
  mode: 'create' | 'edit';
  contactId?: number;
}

const ContactForm: React.FC<ContactFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  onSuccess,
  mode,
  contactId
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  // Mutations
  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();

  // Form state
  const [formData, setFormData] = useState<ContactFormData>({
    prefix: initialData?.prefix || 'Mr',
    name: initialData?.name || '',
    channels: initialData?.channels || []
  });

  // Validation state
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Real-time duplicate check
  const primaryEmail = formData.channels.find(ch => ch.channel_type === 'email' && ch.is_primary)?.channel_value;
  const primaryMobile = formData.channels.find(ch => ch.channel_type === 'mobile' && ch.is_primary)?.channel_value;
  
  const { data: existingContact } = useContactExists(
    primaryEmail && primaryEmail.includes('@') ? primaryEmail : undefined,
    primaryMobile && primaryMobile.length > 6 ? primaryMobile : undefined
  );

  // Loading state
  const isLoading = createContactMutation.isPending || updateContactMutation.isPending;

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData({
        prefix: initialData.prefix || 'Mr',
        name: initialData.name || '',
        channels: initialData.channels || []
      });
    }
  }, [initialData]);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: ContactFormErrors = {};

    // Validate name
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name cannot exceed 255 characters';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(formData.name)) {
      newErrors.name = 'Name can only contain letters, spaces, periods, hyphens, and apostrophes';
    }

    // Validate prefix
    if (!CONTACT_PREFIXES.find(p => p.value === formData.prefix)) {
      newErrors.prefix = 'Please select a valid prefix';
    }

    // Validate channels
    if (!formData.channels || formData.channels.length === 0) {
      newErrors.general = 'At least one communication channel is required';
    } else {
      const channelErrors: ContactFormErrors['channels'] = {};
      let hasPrimary = false;

      formData.channels.forEach((channel, index) => {
        const channelError: any = {};

        // Validate channel value
        if (!channel.channel_value || channel.channel_value.trim().length === 0) {
          channelError.channel_value = 'Channel value is required';
        } else {
          // Type-specific validation
          switch (channel.channel_type) {
            case 'email':
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(channel.channel_value)) {
                channelError.channel_value = 'Please enter a valid email address';
              }
              break;
            case 'mobile':
            case 'whatsapp':
              const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/;
              if (!phoneRegex.test(channel.channel_value)) {
                channelError.channel_value = 'Please enter a valid phone number';
              }
              break;
            case 'instagram':
              const instagramRegex = /^@?[a-zA-Z0-9._]{1,30}$/;
              if (!instagramRegex.test(channel.channel_value)) {
                channelError.channel_value = 'Please enter a valid Instagram handle';
              }
              break;
            case 'twitter':
              const twitterRegex = /^@?[a-zA-Z0-9_]{1,15}$/;
              if (!twitterRegex.test(channel.channel_value)) {
                channelError.channel_value = 'Please enter a valid Twitter handle';
              }
              break;
            case 'linkedin':
              const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$|^[a-zA-Z0-9-]+$/;
              if (!linkedinRegex.test(channel.channel_value)) {
                channelError.channel_value = 'Please enter a valid LinkedIn profile';
              }
              break;
          }
        }

        // Check for primary channel
        if (channel.is_primary) {
          hasPrimary = true;
        }

        if (Object.keys(channelError).length > 0) {
          channelErrors[index] = channelError;
        }
      });

      if (!hasPrimary) {
        newErrors.general = 'Please select at least one primary communication channel';
      }

      if (Object.keys(channelErrors).length > 0) {
        newErrors.channels = channelErrors;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouchedFields(new Set(['prefix', 'name', 'channels']));
    
    // Validate form
    if (!validateForm()) {
      toastService.error('Please fix the validation errors and try again');
      return;
    }

    // Check for duplicate in create mode
    if (mode === 'create' && existingContact?.exists) {
      toastService.error('A contact with this email or mobile number already exists');
      return;
    }

    try {
      if (onSubmit) {
        // Custom submission handler
        await onSubmit(formData);
      } else {
        // Default submission using mutations
        if (mode === 'create') {
          const newContact = await createContactMutation.mutateAsync({
            prefix: formData.prefix,
            name: formData.name.trim(),
            channels: formData.channels.map(ch => ({
              channel_type: ch.channel_type,
              channel_value: ch.channel_value.trim(),
              channel_subtype: ch.channel_subtype,
              is_primary: ch.is_primary
            }))
          });
          onSuccess?.(newContact);
        } else if (mode === 'edit' && contactId) {
          const updatedContact = await updateContactMutation.mutateAsync({
            id: contactId,
            data: {
              prefix: formData.prefix,
              name: formData.name.trim()
            }
          });
          onSuccess?.(updatedContact);
        }
      }
    } catch (error) {
      // Error handling is done by the mutations
    }
  };

  // Handle field changes
  const handleFieldChange = (field: keyof ContactFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouchedFields(prev => new Set([...prev, field]));
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Mark field as touched
  const markFieldTouched = (field: string) => {
    setTouchedFields(prev => new Set([...prev, field]));
  };

  // Get field error if touched - FIXED: Type safety
  const getFieldError = (field: keyof ContactFormErrors): string | undefined => {
    if (!touchedFields.has(field)) return undefined;
    const error = errors[field];
    return typeof error === 'string' ? error : undefined;
  };

  // Icons
  const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const SaveIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17,21 17,13 7,13 7,21" />
      <polyline points="7,3 7,8 15,8" />
    </svg>
  );

  const XIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const AlertTriangleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  return (
    <div style={{
      backgroundColor: colors.utility.primaryBackground,
      borderRadius: '12px',
      maxWidth: '800px',
      margin: '0 auto',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        backgroundColor: colors.utility.secondaryBackground
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: colors.brand.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <UserIcon />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {mode === 'create' ? 'Add New Contact' : 'Edit Contact'}
              </h2>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: colors.utility.secondaryText
              }}>
                {mode === 'create' 
                  ? 'Create a new contact with communication channels'
                  : 'Update contact information and details'
                }
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              border: 'none',
              borderRadius: '6px',
              padding: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
        {/* Duplicate Warning */}
        {mode === 'create' && existingContact?.exists && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: colors.semantic.warning + '10',
            border: `1px solid ${colors.semantic.warning}40`,
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ color: colors.semantic.warning }}>
              <AlertTriangleIcon />
            </div>
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: colors.semantic.warning,
                marginBottom: '2px'
              }}>
                Duplicate Contact Detected
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                A contact with this email or mobile number already exists. Please check your information.
              </div>
            </div>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: colors.semantic.error + '10',
            border: `1px solid ${colors.semantic.error}40`,
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ color: colors.semantic.error }}>
              <AlertTriangleIcon />
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.semantic.error
            }}>
              {errors.general}
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            Basic Information
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '16px',
            alignItems: 'start'
          }}>
            {/* Prefix */}
            <FormField
              type="select"
              name="prefix"
              label="Prefix"
              value={formData.prefix}
              onChange={(value: string) => handleFieldChange('prefix', value)}
              options={CONTACT_PREFIXES.map(prefix => ({
                value: prefix.value,
                label: prefix.label
              }))}
              error={getFieldError('prefix')}
              disabled={isLoading}
              required
              fullWidth={false}
              style={{ minWidth: '120px' }}
            />

            {/* Name */}
            <FormField
              type="text"
              name="name"
              label="Full Name"
              value={formData.name}
              onChange={(value: string) => handleFieldChange('name', value)}
              placeholder="Enter full name"
              error={getFieldError('name')}
              disabled={isLoading}
              required
              maxLength={255}
              showCharCount={formData.name.length > 200}
              onBlur={() => markFieldTouched('name')}
            />
          </div>
        </div>

        {/* Communication Channels */}
        <div style={{ marginBottom: '24px' }}>
          <ChannelForm
            channels={formData.channels}
            onChannelsChange={(channels) => handleFieldChange('channels', channels)}
            errors={errors.channels}
            disabled={isLoading}
          />
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          paddingTop: '20px',
          borderTop: `1px solid ${colors.utility.primaryText}10`
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              border: `1px solid ${colors.utility.secondaryText}40`,
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isLoading || (mode === 'create' && existingContact?.exists)}
            style={{
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (isLoading || (mode === 'create' && existingContact?.exists)) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: (isLoading || (mode === 'create' && existingContact?.exists)) ? 0.6 : 1,
              minWidth: '120px',
              justifyContent: 'center'
            }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <SaveIcon />
                {mode === 'create' ? 'Create Contact' : 'Update Contact'}
              </>
            )}
          </button>
        </div>
      </form>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ContactForm;