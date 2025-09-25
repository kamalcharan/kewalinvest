// frontend/src/pages/contacts/ContactFormPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useContact, useCreateContact, useUpdateContact } from '../../hooks/useContacts';
import FormField from '../../components/common/FormField';
import ChannelForm from '../../components/contacts/ChannelForm';
import { ContactFormData, ContactFormErrors } from '../../types/contact.types';
import { CONTACT_PREFIXES } from '../../constants/contact.constants';
import toastService from '../../services/toast.service';
import { ButtonLoader } from '../../components/common/Loader';

const ContactFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();
  const { environment } = useAuth();
  
  const mode = id ? 'edit' : 'create';
  const contactId = id ? parseInt(id) : undefined;
  
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  // Data fetching for edit mode
  const { data: existingContact, isLoading: isLoadingContact } = useContact(contactId || 0);
  
  // Mutations
  const createContactMutation = useCreateContact();
  const updateContactMutation = useUpdateContact();
  
  // Form state
  const [formData, setFormData] = useState<ContactFormData>({
    prefix: 'Mr',
    name: '',
    channels: []
  });
  
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form data when editing
  useEffect(() => {
    if (mode === 'edit' && existingContact) {
      setFormData({
        prefix: existingContact.prefix || 'Mr',
        name: existingContact.name || '',
        channels: existingContact.channels?.map(ch => ({
          id: ch.id,
          channel_type: ch.channel_type,
          channel_value: ch.channel_value,
          channel_subtype: ch.channel_subtype,
          is_primary: ch.is_primary,
          _temp_id: undefined
        })) || []
      });
    }
  }, [mode, existingContact]);
  
  // Form validation
  const validateForm = (): boolean => {
    const newErrors: ContactFormErrors = {};
    
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }
    
    if (!formData.channels || formData.channels.length === 0) {
      newErrors.general = 'At least one communication channel is required';
    } else {
      const channelErrors: ContactFormErrors['channels'] = {};
      let hasPrimary = false;
      
      formData.channels.forEach((channel, index) => {
        const channelError: any = {};
        
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
              const cleanedPhone = channel.channel_value.replace(/[\s\-()]/g, '');
              
              if (!cleanedPhone.startsWith('+')) {
                channelError.channel_value = 'Must start with + and country code (e.g., +1 for US)';
              } else {
                const withoutPlus = cleanedPhone.substring(1);
                if (!/^\d+$/.test(withoutPlus)) {
                  channelError.channel_value = 'Only numbers allowed after country code';
                } else if (cleanedPhone.length < 8 || cleanedPhone.length > 16) {
                  channelError.channel_value = 'Must be 8-16 digits including country code';
                }
              }
              break;
          }
        }
        
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
    
    if (!validateForm()) {
      toastService.error('Please fix the validation errors');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (mode === 'create') {
        await createContactMutation.mutateAsync({
          prefix: formData.prefix,
          name: formData.name.trim(),
          channels: formData.channels.map(ch => ({
            channel_type: ch.channel_type,
            channel_value: ch.channel_value.trim(),
            channel_subtype: ch.channel_subtype,
            is_primary: ch.is_primary
          }))
        });
     //   toastService.success('Contact created successfully');
        navigate('/contacts');
      } else if (mode === 'edit' && contactId) {
        await updateContactMutation.mutateAsync({
          id: contactId,
          data: {
            prefix: formData.prefix,
            name: formData.name.trim(),
            channels: formData.channels.map(ch => ({
              id: ch.id,
              channel_type: ch.channel_type,
              channel_value: ch.channel_value.trim(),
              channel_subtype: ch.channel_subtype,
              is_primary: ch.is_primary
            }))
          }
        });
      //  toastService.success('Contact updated successfully');
        navigate(`/contacts/${contactId}`);
      }
    } catch (error) {
      // Error handled by mutations
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle field changes
  const handleFieldChange = (field: keyof ContactFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  // Loading state for edit mode
  if (mode === 'edit' && isLoadingContact) {
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
          <p style={{ color: colors.utility.secondaryText }}>Loading contact...</p>
        </div>
      </div>
    );
  }
  
  // Icons
  const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
  
  const SaveIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
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
  
  const EditIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
  
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
            alignItems: 'center',
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
              
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: colors.brand.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                {mode === 'create' ? <UserPlusIcon /> : <EditIcon />}
              </div>
              
              <div>
                <h1 style={{
                  margin: 0,
                  fontSize: '28px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}>
                  {mode === 'create' ? 'Add New Contact' : 'Edit Contact'}
                </h1>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: colors.utility.secondaryText
                }}>
                  {mode === 'create' 
                    ? 'Create a new contact with communication channels' 
                    : `Editing: ${existingContact?.name || 'Loading...'}`
                  } • Environment: {environment}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* General Error */}
          {errors.general && (
            <div style={{
              padding: '16px',
              backgroundColor: colors.semantic.error + '10',
              border: `1px solid ${colors.semantic.error}40`,
              borderRadius: '8px',
              marginBottom: '20px',
              color: colors.semantic.error
            }}>
              {errors.general}
            </div>
          )}
          
          {/* Basic Information */}
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              Basic Information
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '150px 1fr',
              gap: '20px'
            }}>
              <FormField
                type="select"
                name="prefix"
                label="Prefix"
                value={formData.prefix}
                onChange={(value: string) => handleFieldChange('prefix', value)}
                options={CONTACT_PREFIXES.map(p => ({ value: p.value, label: p.label }))}
                disabled={isSubmitting}
                required
              />
              
              <FormField
                type="text"
                name="name"
                label="Full Name"
                value={formData.name}
                onChange={(value: string) => handleFieldChange('name', value)}
                placeholder="Enter contact's full name"
                error={errors.name}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
          
          {/* Communication Channels */}
          <div style={{ marginBottom: '24px' }}>
            <ChannelForm
              channels={formData.channels}
              onChannelsChange={(channels) => handleFieldChange('channels', channels)}
              errors={errors.channels}
              disabled={isSubmitting}
            />
          </div>
          
          {/* Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <button
              type="button"
              onClick={() => navigate('/contacts')}
              disabled={isSubmitting}
              style={{
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.secondaryText}40`,
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: isSubmitting ? 0.8 : 1
              }}
            >
              {isSubmitting ? (
                <>
                  <ButtonLoader />
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

export default ContactFormPage;