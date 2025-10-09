// frontend/src/components/jtbd/forms/ProfileTriggerForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CreateJTBDRequest, ProfileTriggerConfig } from '../../../types/jtbd.types';
import { useCustomer } from '../../../hooks/useCustomers';
import RadioButtonCard from '../common/RadioButtonCard';
import PrioritySelector from '../common/PrioritySelector';
import PreviewPanel from '../common/PreviewPanel';

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
  const [triggerType, setTriggerType] = useState<'birthday' | 'anniversary'>('birthday');
  const [daysBefore, setDaysBefore] = useState<number>(7);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate title
  useEffect(() => {
    const triggerLabel = triggerType === 'birthday' ? 'Birthday' : 'Anniversary';
    setTitle(`${triggerLabel} Reminder (${daysBefore} days before)`);
  }, [triggerType, daysBefore]);

  // Check if customer has required date
  const hasRequiredDate = () => {
    if (!customer) return false;
    if (triggerType === 'birthday' && !customer.date_of_birth) return false;
    if (triggerType === 'anniversary' && !customer.anniversary_date) return false;
    return true;
  };

  // Get the actual date from customer
  const getCustomerDate = () => {
    if (!customer) return null;
    if (triggerType === 'birthday' && customer.date_of_birth) {
      return new Date(customer.date_of_birth);
    }
    if (triggerType === 'anniversary' && customer.anniversary_date) {
      return new Date(customer.anniversary_date);
    }
    return null;
  };

  // Calculate next occurrence
  const nextOccurrence = useMemo(() => {
    const customerDate = getCustomerDate();
    if (!customerDate) return null;
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Create this year's occurrence
    let nextDate = new Date(currentYear, customerDate.getMonth(), customerDate.getDate());
    
    // If already passed, use next year
    if (nextDate < today) {
      nextDate = new Date(currentYear + 1, customerDate.getMonth(), customerDate.getDate());
    }
    
    // Subtract days_before to get alert date
    const alertDate = new Date(nextDate);
    alertDate.setDate(alertDate.getDate() - daysBefore);
    
    return {
      eventDate: nextDate,
      alertDate: alertDate
    };
  }, [customer, triggerType, daysBefore]);

  // Days before options
  const daysBeforeOptions = [
    { value: 1, label: '1 Day Before', icon: '⚡', description: 'Last minute reminder' },
    { value: 3, label: '3 Days Before', icon: '📅', description: 'Short notice' },
    { value: 7, label: '1 Week Before', icon: '📆', description: 'Standard timing', badge: 'Popular' },
    { value: 14, label: '2 Weeks Before', icon: '🗓️', description: 'Good planning time' },
    { value: 30, label: '1 Month Before', icon: '📊', description: 'Advance notice' }
  ];

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!hasRequiredDate()) {
      if (triggerType === 'birthday') {
        newErrors.trigger_type = 'Customer does not have a birth date in their profile';
      } else {
        newErrors.trigger_type = 'Customer does not have an anniversary date in their profile';
      }
    }

    if (daysBefore < 0) {
      newErrors.days_before = 'Days before cannot be negative';
    }

    if (daysBefore > 60) {
      newErrors.days_before = 'Days before cannot exceed 60 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate preview items
  const previewItems = useMemo(() => {
    const items = [];
    
    items.push({
      icon: triggerType === 'birthday' ? '🎂' : '💑',
      label: 'Event Type',
      value: triggerType === 'birthday' ? 'Birthday' : 'Anniversary'
    });
    
    if (getCustomerDate()) {
      const date = getCustomerDate()!;
      items.push({
        icon: '📅',
        label: 'Event Date',
        value: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
      });
    }
    
    items.push({
      icon: '⏰',
      label: 'Alert Timing',
      value: `${daysBefore} day${daysBefore > 1 ? 's' : ''} before`
    });
    
    if (nextOccurrence) {
      items.push({
        icon: '🎯',
        label: 'Next Alert',
        value: nextOccurrence.alertDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      });
    }

    return items;
  }, [triggerType, daysBefore, nextOccurrence]);

  // Handle submit
  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const config: ProfileTriggerConfig = {
      trigger_type: triggerType,
      days_before: daysBefore
    };

    const requestData: CreateJTBDRequest = {
      customer_id: customerId,
      jtbd_type: 'profile_trigger',
      title,
      description,
      priority,
      config_data: config
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable Form Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '20px' }}>
          
          {/* Trigger Type Selection */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '12px'
            }}>
              Event Type <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              {/* Birthday Option */}
              <RadioButtonCard
                id="trigger-birthday"
                value="birthday"
                label="Birthday"
                description={
                  customer?.date_of_birth 
                    ? new Date(customer.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
                    : 'No birth date on file'
                }
                icon={<span style={{ fontSize: '24px' }}>🎂</span>}
                isSelected={triggerType === 'birthday'}
                onChange={() => setTriggerType('birthday')}
                disabled={isSubmitting}
                accentColor="#F59E0B"
              />

              {/* Anniversary Option */}
              <RadioButtonCard
                id="trigger-anniversary"
                value="anniversary"
                label="Anniversary"
                description={
                  customer?.anniversary_date 
                    ? new Date(customer.anniversary_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
                    : 'No anniversary date on file'
                }
                icon={<span style={{ fontSize: '24px' }}>💑</span>}
                isSelected={triggerType === 'anniversary'}
                onChange={() => setTriggerType('anniversary')}
                disabled={isSubmitting}
                accentColor="#EC4899"
              />
            </div>
            
            {errors.trigger_type && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: colors.semantic.error + '10',
                border: `1px solid ${colors.semantic.error}40`,
                borderRadius: '8px',
                fontSize: '12px',
                color: colors.semantic.error,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>⚠️</span>
                <span>{errors.trigger_type}</span>
              </div>
            )}
          </div>

          {/* Days Before Selection */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '12px'
            }}>
              Alert Timing <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '10px',
              marginBottom: '12px'
            }}>
              {daysBeforeOptions.map((option) => (
                <RadioButtonCard
                  key={option.value}
                  id={`days-${option.value}`}
                  value={option.value.toString()}
                  label={option.label}
                  description={option.description}
                  icon={<span style={{ fontSize: '20px' }}>{option.icon}</span>}
                  isSelected={daysBefore === option.value}
                  onChange={() => setDaysBefore(option.value)}
                  disabled={isSubmitting}
                  badge={option.badge}
                />
              ))}
            </div>

            {/* Custom days input */}
            <div style={{
              padding: '12px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Or Enter Custom Days
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={daysBefore}
                onChange={(e) => setDaysBefore(Number(e.target.value))}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `1px solid ${errors.days_before ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText,
                  fontSize: '14px'
                }}
              />
              {errors.days_before && (
                <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                  {errors.days_before}
                </span>
              )}
            </div>
          </div>

          {/* Next Occurrence Info */}
          {hasRequiredDate() && nextOccurrence && (
            <div style={{
              padding: '16px',
              backgroundColor: colors.brand.primary + '10',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.brand.primary}`
            }}>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: '600'
              }}>
                Next Alert Schedule
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                    Alert Date:
                  </span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.brand.primary
                  }}>
                    {nextOccurrence.alertDate.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                    {triggerType === 'birthday' ? 'Birthday:' : 'Anniversary:'}
                  </span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText
                  }}>
                    {nextOccurrence.eventDate.toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              <div style={{
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: `1px solid ${colors.utility.primaryText}10`,
                fontSize: '11px',
                color: colors.utility.secondaryText
              }}>
                You'll be notified {daysBefore} day{daysBefore > 1 ? 's' : ''} before the {triggerType}
              </div>
            </div>
          )}

          {/* Priority */}
          <PrioritySelector
            value={priority}
            onChange={setPriority}
            disabled={isSubmitting}
          />

          {/* Custom Title */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Custom Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Auto-generated if left blank"
              disabled={isSubmitting}
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
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add a personalized message or gift ideas..."
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>
      </div>

      {/* Preview Panel - Sticky at bottom */}
      <PreviewPanel
        items={previewItems}
        onConfirm={handleSubmit}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        confirmButtonText="Create Alert"
      />
    </div>
  );
};

export default ProfileTriggerForm;