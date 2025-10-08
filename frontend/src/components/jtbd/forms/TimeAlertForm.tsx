// frontend/src/components/jtbd/forms/TimeAlertForm.tsx

import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CreateJTBDRequest, TimeBasedConfig } from '../../../types/jtbd.types';

interface TimeAlertFormProps {
  customerId: number;
  onSubmit: (data: CreateJTBDRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const TimeAlertForm: React.FC<TimeAlertFormProps> = ({
  customerId,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Form state
  const [formData, setFormData] = useState<TimeBasedConfig>({
    alert_date: 1,
    alert_month: 1,
    is_recurring: true
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Days in month (simplified - not accounting for leap years)
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Calculate next occurrence
  const getNextOccurrence = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const targetDate = new Date(currentYear, formData.alert_month - 1, formData.alert_date);
    
    if (targetDate < today) {
      targetDate.setFullYear(currentYear + 1);
    }
    
    return targetDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.alert_date || formData.alert_date < 1 || formData.alert_date > 31) {
      newErrors.alert_date = 'Day must be between 1 and 31';
    }

    // Check if day is valid for selected month
    if (formData.alert_date > daysInMonth[formData.alert_month - 1]) {
      newErrors.alert_date = `${monthNames[formData.alert_month - 1]} only has ${daysInMonth[formData.alert_month - 1]} days`;
    }

    if (!formData.alert_month || formData.alert_month < 1 || formData.alert_month > 12) {
      newErrors.alert_month = 'Please select a valid month';
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required for time-based alerts';
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
      jtbd_type: 'time_based',
      title,
      description,
      priority,
      config_data: formData
    };

    onSubmit(requestData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alert Date */}
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
          Alert Day <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <input
          type="number"
          min="1"
          max="31"
          value={formData.alert_date}
          onChange={(e) => setFormData((prev: TimeBasedConfig) => ({ 
  ...prev, 
  alert_date: Number(e.target.value) 
}))}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${errors.alert_date ? colors.semantic.error : colors.utility.primaryText + '20'}`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        />
        {errors.alert_date && (
          <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
            {errors.alert_date}
          </span>
        )}
      </div>

      {/* Alert Month */}
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
          Alert Month <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <select
          value={formData.alert_month}
          onChange={(e) => setFormData((prev: TimeBasedConfig) => ({ 
  ...prev, 
  alert_month: Number(e.target.value) 
}))}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${errors.alert_month ? colors.semantic.error : colors.utility.primaryText + '20'}`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        >
          {monthNames.map((month, index) => (
            <option key={index} value={index + 1}>
              {month}
            </option>
          ))}
        </select>
        {errors.alert_month && (
          <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
            {errors.alert_month}
          </span>
        )}
      </div>

      {/* Recurring */}
      <div
        style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            checked={formData.is_recurring}
            onChange={(e) => setFormData((prev: TimeBasedConfig) => ({ 
  ...prev, 
  is_recurring: e.target.checked 
}))}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer'
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText,
                marginBottom: '2px'
              }}
            >
              Recurring Alert
            </div>
            <div
              style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}
            >
              {formData.is_recurring
                ? 'This alert will repeat every year on the same date'
                : 'This alert will trigger only once'
              }
            </div>
          </div>
        </label>
      </div>

      {/* Next Occurrence Info */}
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
          Next Occurrence
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

      {/* Title */}
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
          Alert Title <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Tax Filing Deadline, Policy Renewal"
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${errors.title ? colors.semantic.error : colors.utility.primaryText + '20'}`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        />
        {errors.title && (
          <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
            {errors.title}
          </span>
        )}
      </div>

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
          placeholder="Add any additional notes about this alert..."
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

export default TimeAlertForm;