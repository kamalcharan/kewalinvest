// frontend/src/components/jtbd/forms/ProfileTriggerForm.tsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CreateJTBDRequest, ProfileTriggerConfig } from '../../../types/jtbd.types';
import { useCustomer } from '../../../hooks/useCustomers';

interface ProfileTriggerFormProps {
  customerId: number;
  onSubmit: (data: CreateJTBDRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const ProfileTriggerForm: React.FC<ProfileTriggerFormProps> = ({
  customerId,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Fetch customer data to check if they have birthday/anniversary
  const { data: customer, isLoading: customerLoading } = useCustomer(customerId);

  // Form state
  const [formData, setFormData] = useState<ProfileTriggerConfig>({
    trigger_type: 'birthday',
    days_before: 7
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate title
  useEffect(() => {
    const triggerLabel = formData.trigger_type === 'birthday' ? 'Birthday' : 'Anniversary';
    setTitle(`${triggerLabel} Reminder (${formData.days_before} days before)`);
  }, [formData.trigger_type, formData.days_before]);

  // Check if customer has required date
  const hasRequiredDate = () => {
    if (!customer) return false;
    if (formData.trigger_type === 'birthday' && !customer.date_of_birth) return false;
    if (formData.trigger_type === 'anniversary' && !customer.anniversary_date) return false;
    return true;
  };

  // Calculate next occurrence
  const getNextOccurrence = () => {
    if (!customer) return 'Loading...';
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    let baseDate: Date | null = null;
    
    if (formData.trigger_type === 'birthday' && customer.date_of_birth) {
      baseDate = new Date(customer.date_of_birth);
    } else if (formData.trigger_type === 'anniversary' && customer.anniversary_date) {
      baseDate = new Date(customer.anniversary_date);
    }
    
    if (!baseDate) return 'Date not available';
    
    // Create this year's occurrence
    let nextDate = new Date(currentYear, baseDate.getMonth(), baseDate.getDate());
    
    // If already passed, use next year
    if (nextDate < today) {
      nextDate = new Date(currentYear + 1, baseDate.getMonth(), baseDate.getDate());
    }
    
    // Subtract days_before
    nextDate.setDate(nextDate.getDate() - formData.days_before);
    
    return nextDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!hasRequiredDate()) {
      if (formData.trigger_type === 'birthday') {
        newErrors.trigger_type = 'Customer does not have a birth date in their profile';
      } else {
        newErrors.trigger_type = 'Customer does not have an anniversary date in their profile';
      }
    }

    if (formData.days_before < 0) {
      newErrors.days_before = 'Days before cannot be negative';
    }

    if (formData.days_before > 60) {
      newErrors.days_before = 'Days before cannot exceed 60 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const requestData: CreateJTBDRequest = {
      customer_id: customerId,
      jtbd_type: 'profile_trigger',
      title,
      description,
      priority,
      config_data: formData
    };

    onSubmit(requestData);
  };

  if (customerLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
        Loading customer information...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Trigger Type */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '12px'
          }}
        >
          Trigger Type <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Birthday Option */}
          <div
            onClick={() => setFormData(prev => ({ ...prev, trigger_type: 'birthday' }))}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: formData.trigger_type === 'birthday' 
                ? colors.brand.primary + '10' 
                : colors.utility.secondaryBackground,
              border: `2px solid ${formData.trigger_type === 'birthday' 
                ? colors.brand.primary 
                : colors.utility.primaryText + '10'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${formData.trigger_type === 'birthday' ? colors.brand.primary : colors.utility.secondaryText}`,
                  backgroundColor: formData.trigger_type === 'birthday' ? colors.brand.primary : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {formData.trigger_type === 'birthday' && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'white'
                  }} />
                )}
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                Birthday
              </div>
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginLeft: '28px'
            }}>
              {customer?.date_of_birth 
                ? `Date: ${new Date(customer.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`
                : 'No birth date on file'
              }
            </div>
          </div>

          {/* Anniversary Option */}
          <div
            onClick={() => setFormData(prev => ({ ...prev, trigger_type: 'anniversary' }))}
            style={{
              flex: 1,
              padding: '16px',
              backgroundColor: formData.trigger_type === 'anniversary' 
                ? colors.brand.primary + '10' 
                : colors.utility.secondaryBackground,
              border: `2px solid ${formData.trigger_type === 'anniversary' 
                ? colors.brand.primary 
                : colors.utility.primaryText + '10'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${formData.trigger_type === 'anniversary' ? colors.brand.primary : colors.utility.secondaryText}`,
                  backgroundColor: formData.trigger_type === 'anniversary' ? colors.brand.primary : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {formData.trigger_type === 'anniversary' && (
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'white'
                  }} />
                )}
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                Anniversary
              </div>
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginLeft: '28px'
            }}>
              {customer?.anniversary_date 
                ? `Date: ${new Date(customer.anniversary_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}`
                : 'No anniversary date on file'
              }
            </div>
          </div>
        </div>
        {errors.trigger_type && (
          <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '8px', display: 'block' }}>
            {errors.trigger_type}
          </span>
        )}
      </div>

      {/* Days Before */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Alert Days Before Event <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <input
          type="number"
          min="0"
          max="60"
          value={formData.days_before}
          onChange={(e) => setFormData(prev => ({ ...prev, days_before: Number(e.target.value) }))}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${errors.days_before ? colors.semantic.error : colors.utility.primaryText + '20'}`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        />
        {errors.days_before && (
          <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
            {errors.days_before}
          </span>
        )}
        <span style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px', display: 'block' }}>
          You will be notified {formData.days_before} days before the {formData.trigger_type}
        </span>
      </div>

      {/* Next Occurrence Info */}
      {hasRequiredDate() && (
        <div
          style={{
            padding: '12px',
            backgroundColor: colors.brand.primary + '10',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.brand.primary}`
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginBottom: '4px'
            }}
          >
            Next Alert Date
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.brand.primary
            }}
          >
            {getNextOccurrence()}
          </div>
        </div>
      )}

      {/* Priority */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Priority Level
        </label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Custom Title */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Custom Title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Auto-generated if left blank"
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        />
      </div>

      {/* Description */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add a personalized message or gift ideas..."
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.brand.primary,
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1
          }}
        >
          {isSubmitting ? 'Creating...' : 'Create Alert'}
        </button>
      </div>
    </form>
  );
};

export default ProfileTriggerForm;  