// frontend/src/components/customers/CustomerForm.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { CustomerFormData, CustomerFormErrors, CustomerPrefix, SurvivalStatus, OnboardingStatus } from '../../types/customer.types';
import { ChannelType } from '../../types/contact.types';
import { useTheme } from '../../contexts/ThemeContext';
import { validatePhoneNumber } from '../../utils/phoneValidation';
import ContactInfoStep from './forms/ContactInfoStep';
import CustomerDetailsStep from './forms/CustomerDetailsStep';
import AddressStep from './forms/AddressStep';

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  onSubmit?: (data: CustomerFormData) => void;
  onCancel?: () => void;
  loading?: boolean;
  mode?: 'create' | 'edit';
  title?: string;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  mode = 'create',
  title
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Current step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Form data state
  const [formData, setFormData] = useState<CustomerFormData>({
    // Contact fields
    prefix: 'Mr' as CustomerPrefix,
    name: '',
    channels: [],
    
    // Customer fields
    pan: '',
    iwell_code: '',
    date_of_birth: '',
    anniversary_date: '',
    family_head_name: '',
    family_head_iwell_code: '',
    referred_by_name: '',
    survival_status: 'alive' as SurvivalStatus,
    date_of_death: '',
    onboarding_status: 'pending' as OnboardingStatus,
    addresses: [],
    
    ...initialData
  });

  // Form errors state
  const [errors, setErrors] = useState<CustomerFormErrors>({});

  // Update form field
  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear related errors when field is updated
    if (errors[field as keyof CustomerFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Validate step
  const validateStep = useCallback((step: number): boolean => {
    const newErrors: CustomerFormErrors = {};
    let isValid = true;

    switch (step) {
      case 1: // Contact Info
        if (!formData.name.trim()) {
          newErrors.name = 'Name is required';
          isValid = false;
        }

        if (formData.channels.length === 0) {
          newErrors.general = 'At least one contact channel is required';
          isValid = false;
        } else {
          const channelErrors: Record<number, any> = {};
          formData.channels.forEach((channel, index) => {
            if (!channel.channel_value.trim()) {
              channelErrors[index] = { channel_value: 'Value is required' };
              isValid = false;
            } else {
              // Validate email format
              if (channel.channel_type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(channel.channel_value)) {
                channelErrors[index] = { channel_value: 'Invalid email format' };
                isValid = false;
              }
              // Use centralized phone validation
              if ((channel.channel_type === 'mobile' || channel.channel_type === 'whatsapp')) {
                const phoneValidation = validatePhoneNumber(channel.channel_value);
                if (!phoneValidation.isValid) {
                  channelErrors[index] = { channel_value: phoneValidation.errorMessage };
                  isValid = false;
                }
              }
            }
          });
          if (Object.keys(channelErrors).length > 0) {
            newErrors.channels = channelErrors;
          }

          // Check for at least one primary channel
          if (!formData.channels.some(ch => ch.is_primary)) {
            newErrors.general = 'At least one channel must be marked as primary';
            isValid = false;
          }
        }
        break;

      case 2: // Customer Details
        // PAN validation (optional but must be valid if provided)
        if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan)) {
          newErrors.pan = 'Invalid PAN format (AAAAA9999A)';
          isValid = false;
        }

        // Date validations
        if (formData.date_of_birth) {
          const birthDate = new Date(formData.date_of_birth);
          const today = new Date();
          if (birthDate > today) {
            newErrors.date_of_birth = 'Birth date cannot be in the future';
            isValid = false;
          }
        }

        if (formData.anniversary_date) {
          const anniversaryDate = new Date(formData.anniversary_date);
          const today = new Date();
          if (anniversaryDate > today) {
            newErrors.anniversary_date = 'Anniversary date cannot be in the future';
            isValid = false;
          }
        }

        // Death date validation
        if (formData.survival_status === 'deceased') {
          if (!formData.date_of_death) {
            newErrors.date_of_death = 'Date of death is required for deceased status';
            isValid = false;
          } else {
            const deathDate = new Date(formData.date_of_death);
            const birthDate = new Date(formData.date_of_birth);
            const today = new Date();
            
            if (deathDate > today) {
              newErrors.date_of_death = 'Date of death cannot be in the future';
              isValid = false;
            }
            if (formData.date_of_birth && deathDate < birthDate) {
              newErrors.date_of_death = 'Date of death cannot be before birth date';
              isValid = false;
            }
          }
        }
        break;

      case 3: // Address Info
        // Address validation (optional but must be complete if provided)
        if (formData.addresses.length > 0) {
          const addressErrors: Record<number, any> = {};
          formData.addresses.forEach((address, index) => {
            const addrErrors: any = {};
            
            if (!address.address_line1.trim()) {
              addrErrors.address_line1 = 'Address line 1 is required';
              isValid = false;
            }
            if (!address.city.trim()) {
              addrErrors.city = 'City is required';
              isValid = false;
            }
            if (!address.state.trim()) {
              addrErrors.state = 'State is required';
              isValid = false;
            }
            if (!address.pincode.trim()) {
              addrErrors.pincode = 'Pincode is required';
              isValid = false;
            } else if (!/^\d{6}$/.test(address.pincode)) {
              addrErrors.pincode = 'Pincode must be 6 digits';
              isValid = false;
            }

            if (Object.keys(addrErrors).length > 0) {
              addressErrors[index] = addrErrors;
            }
          });
          
          if (Object.keys(addressErrors).length > 0) {
            newErrors.addresses = addressErrors;
          }

          // Check for at least one primary address if addresses exist
          if (formData.addresses.length > 0 && !formData.addresses.some(addr => addr.is_primary)) {
            newErrors.general = 'At least one address must be marked as primary';
            isValid = false;
          }
        }
        break;
    }

    setErrors(newErrors);
    return isValid;
  }, [formData]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  }, [currentStep, validateStep]);

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleStepClick = useCallback((step: number) => {
    // Allow going to previous steps without validation
    if (step < currentStep) {
      setCurrentStep(step);
    } else if (step === currentStep + 1) {
      // Only allow next step if current step is valid
      if (validateStep(currentStep)) {
        setCurrentStep(step);
      }
    }
  }, [currentStep, validateStep]);

  // Submit handler
  const handleSubmit = useCallback(() => {
    // Validate all steps
    let allValid = true;
    for (let i = 1; i <= totalSteps; i++) {
      if (!validateStep(i)) {
        allValid = false;
        break;
      }
    }

    if (allValid && onSubmit) {
      onSubmit(formData);
    } else {
      // Go to first invalid step
      for (let i = 1; i <= totalSteps; i++) {
        if (!validateStep(i)) {
          setCurrentStep(i);
          break;
        }
      }
    }
  }, [formData, onSubmit, validateStep]);

  // Step completion status
  const getStepStatus = useCallback((step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'pending';
  }, [currentStep]);

  // Form completion percentage
  const completionPercentage = useMemo(() => {
    let completed = 0;
    if (formData.name && formData.channels.length > 0) completed += 33;
    if (formData.pan || formData.iwell_code || formData.date_of_birth) completed += 33;
    if (formData.addresses.length > 0) completed += 34;
    return Math.min(completed, 100);
  }, [formData]);

  // Icons
  const ChevronLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15,18 9,12 15,6" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );

  const SaveIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17,21 17,13 7,13 7,21" />
      <polyline points="7,3 7,8 15,8" />
    </svg>
  );

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      backgroundColor: colors.utility.primaryBackground,
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        backgroundColor: colors.utility.secondaryBackground,
        borderBottom: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            {title || (mode === 'edit' ? 'Edit Customer' : 'Create New Customer')}
          </h2>
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            Step {currentStep} of {totalSteps}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: colors.utility.primaryText + '20',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <div style={{
            width: `${(currentStep / totalSteps) * 100}%`,
            height: '100%',
            backgroundColor: colors.brand.primary,
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Step Indicators */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {[1, 2, 3].map((step) => {
            const status = getStepStatus(step);
            const stepTitles = ['Contact Info', 'Customer Details', 'Address Info'];
            
            return (
              <div
                key={step}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: step <= currentStep ? 'pointer' : 'default',
                  opacity: status === 'pending' ? 0.6 : 1
                }}
                onClick={() => handleStepClick(step)}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 
                    status === 'completed' ? colors.semantic.success :
                    status === 'current' ? colors.brand.primary :
                    colors.utility.primaryText + '20',
                  color: status === 'pending' ? colors.utility.secondaryText : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginRight: '8px'
                }}>
                  {status === 'completed' ? <CheckIcon /> : step}
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: status === 'current' ? colors.utility.primaryText : colors.utility.secondaryText
                }}>
                  {stepTitles[step - 1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div style={{ padding: '32px' }}>
        {/* Global Error */}
        {errors.general && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: colors.semantic.error + '10',
            border: `1px solid ${colors.semantic.error}40`,
            borderRadius: '6px',
            marginBottom: '24px',
            fontSize: '14px',
            color: colors.semantic.error
          }}>
            {errors.general}
          </div>
        )}

        {/* Step Content */}
        {currentStep === 1 && (
          <ContactInfoStep
            prefix={formData.prefix}
            name={formData.name}
            channels={formData.channels.map(ch => ({
              ...ch,
              is_primary: ch.is_primary ?? false
            }))}
            errors={errors}
            onChange={updateField}
            disabled={loading}
          />
        )}

        {currentStep === 2 && (
          <CustomerDetailsStep
            pan={formData.pan}
            iwell_code={formData.iwell_code}
            date_of_birth={formData.date_of_birth}
            anniversary_date={formData.anniversary_date}
            survival_status={formData.survival_status}
            date_of_death={formData.date_of_death}
            family_head_name={formData.family_head_name}
            family_head_iwell_code={formData.family_head_iwell_code}
            referred_by_name={formData.referred_by_name}
            errors={errors}
            onChange={updateField}
            disabled={loading}
          />
        )}

        {currentStep === 3 && (
          <AddressStep
            addresses={formData.addresses}
            errors={errors}
            onChange={updateField}
            disabled={loading}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '24px',
        backgroundColor: colors.utility.secondaryBackground,
        borderTop: `1px solid ${colors.utility.primaryText}10`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>

          {/* Previous Button */}
          {currentStep > 1 && (
            <button
              onClick={handlePrevious}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                backgroundColor: 'transparent',
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}40`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <ChevronLeftIcon />
              Previous
            </button>
          )}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Form Completion */}
          {completionPercentage > 0 && (
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              {completionPercentage}% complete
            </div>
          )}

          {/* Next/Submit Button */}
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Next
              <ChevronRightIcon />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: colors.semantic.success,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: loading ? 0.7 : 1
              }}
            >
              <SaveIcon />
              {loading ? 'Saving...' : (mode === 'edit' ? 'Update Customer' : 'Create Customer')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerForm;