// frontend/src/components/jtbd/forms/TimeAlertForm.tsx

import React, { useState, useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CreateJTBDRequest, TimeBasedConfig } from '../../../types/jtbd.types';
import RadioButtonCard from '../common/RadioButtonCard';
import PrioritySelector from '../common/PrioritySelector';
import PreviewPanel from '../common/PreviewPanel';

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
  const [alertDate, setAlertDate] = useState<number>(1);
  const [alertMonth, setAlertMonth] = useState<number>(1);
  const [isRecurring, setIsRecurring] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Month data with icons
  const months = [
    { value: 1, label: 'January', icon: '❄️', season: 'Winter' },
    { value: 2, label: 'February', icon: '💝', season: 'Winter' },
    { value: 3, label: 'March', icon: '🌸', season: 'Spring' },
    { value: 4, label: 'April', icon: '🌷', season: 'Spring' },
    { value: 5, label: 'May', icon: '🌺', season: 'Spring' },
    { value: 6, label: 'June', icon: '☀️', season: 'Summer' },
    { value: 7, label: 'July', icon: '🌻', season: 'Summer' },
    { value: 8, label: 'August', icon: '🏖️', season: 'Summer' },
    { value: 9, label: 'September', icon: '🍂', season: 'Autumn' },
    { value: 10, label: 'October', icon: '🎃', season: 'Autumn' },
    { value: 11, label: 'November', icon: '🍁', season: 'Autumn' },
    { value: 12, label: 'December', icon: '🎄', season: 'Winter' }
  ];

  // Days in each month (accounting for leap years)
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Calculate next occurrence
  const nextOccurrence = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    let targetDate = new Date(currentYear, alertMonth - 1, Math.min(alertDate, daysInMonth[alertMonth - 1]));
    
    if (targetDate < today) {
      targetDate = new Date(currentYear + 1, alertMonth - 1, Math.min(alertDate, daysInMonth[alertMonth - 1]));
    }
    
    return targetDate;
  }, [alertDate, alertMonth, daysInMonth]);

  // Smart date helper text
  const getDateHelperText = () => {
    if (alertDate > daysInMonth[alertMonth - 1]) {
      return (
        <div style={{
          marginTop: '8px',
          padding: '10px 12px',
          backgroundColor: colors.semantic.warning + '10',
          border: `1px solid ${colors.semantic.warning}40`,
          borderRadius: '6px',
          fontSize: '12px',
          color: colors.semantic.warning,
          lineHeight: '1.5'
        }}>
          <strong>⚠️ Invalid Date:</strong> {months[alertMonth - 1].label} only has {daysInMonth[alertMonth - 1]} days.
          <br />Please select a day between 1 and {daysInMonth[alertMonth - 1]}.
        </div>
      );
    }

    if (alertDate >= 29) {
      return (
        <div style={{
          marginTop: '8px',
          padding: '10px 12px',
          backgroundColor: colors.semantic.info + '10',
          border: `1px solid ${colors.semantic.info}40`,
          borderRadius: '6px',
          fontSize: '12px',
          color: colors.semantic.info,
          lineHeight: '1.5'
        }}>
          <strong>💡 Smart Date Logic:</strong> 
          {alertDate === 29 && alertMonth === 2 && (
            <> Alert will trigger on Feb 28th in non-leap years, and Feb 29th in leap years.</>
          )}
          {alertDate >= 30 && alertMonth === 2 && (
            <> Alert will trigger on the last day of February (28th or 29th depending on leap year).</>
          )}
        </div>
      );
    }

    return null;
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!alertDate || alertDate < 1 || alertDate > 31) {
      newErrors.alert_date = 'Day must be between 1 and 31';
    }

    if (alertDate > daysInMonth[alertMonth - 1]) {
      newErrors.alert_date = `${months[alertMonth - 1].label} only has ${daysInMonth[alertMonth - 1]} days`;
    }

    if (!alertMonth || alertMonth < 1 || alertMonth > 12) {
      newErrors.alert_month = 'Please select a valid month';
    }

    if (!title.trim()) {
      newErrors.title = 'Title is required for time-based alerts';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate preview items
  const previewItems = useMemo(() => {
    const items = [];
    
    if (title) {
      items.push({
        icon: '📝',
        label: 'Alert Title',
        value: title
      });
    }
    
    if (alertMonth) {
      const month = months.find(m => m.value === alertMonth);
      items.push({
        icon: month?.icon || '📅',
        label: 'Month',
        value: month?.label || ''
      });
    }
    
    if (alertDate) {
      items.push({
        icon: '📆',
        label: 'Day',
        value: `${alertDate}${alertDate === 1 ? 'st' : alertDate === 2 ? 'nd' : alertDate === 3 ? 'rd' : 'th'}`
      });
    }
    
    items.push({
      icon: isRecurring ? '🔄' : '⚡',
      label: 'Type',
      value: isRecurring ? 'Recurring Yearly' : 'One-time'
    });
    
    items.push({
      icon: '🎯',
      label: 'Next Alert',
      value: nextOccurrence.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    });

    return items;
  }, [title, alertMonth, alertDate, isRecurring, nextOccurrence, months]);

  // Handle submit
  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const config: TimeBasedConfig = {
      alert_date: Math.min(alertDate, daysInMonth[alertMonth - 1]),
      alert_month: alertMonth,
      is_recurring: isRecurring
    };

    const requestData: CreateJTBDRequest = {
      customer_id: customerId,
      jtbd_type: 'time_based',
      title,
      description,
      priority,
      config_data: config
    };

    onSubmit(requestData);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable Form Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '20px' }}>
          
          {/* Title */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Alert Title <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Tax Filing Deadline, Policy Renewal, Quarterly Review"
              disabled={isSubmitting}
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

          {/* Month Selection */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '12px'
            }}>
              Select Month <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '10px'
            }}>
              {months.map((month) => (
                <RadioButtonCard
                  key={month.value}
                  id={`month-${month.value}`}
                  value={month.value.toString()}
                  label={month.label}
                  description={month.season}
                  icon={<span style={{ fontSize: '20px' }}>{month.icon}</span>}
                  isSelected={alertMonth === month.value}
                  onChange={() => setAlertMonth(month.value)}
                  disabled={isSubmitting}
                />
              ))}
            </div>
            {errors.alert_month && (
              <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '8px', display: 'block' }}>
                {errors.alert_month}
              </span>
            )}
          </div>

          {/* Day Selection */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Alert Day <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={alertDate}
              onChange={(e) => setAlertDate(Number(e.target.value))}
              disabled={isSubmitting}
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
            {getDateHelperText()}
          </div>

          {/* Recurring Toggle */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '12px'
            }}>
              Recurrence
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px'
            }}>
              <RadioButtonCard
                id="recurring-yes"
                value="true"
                label="Recurring Yearly"
                description="Repeats every year"
                icon={<span style={{ fontSize: '20px' }}>🔄</span>}
                isSelected={isRecurring}
                onChange={() => setIsRecurring(true)}
                disabled={isSubmitting}
                badge="Recommended"
              />
              <RadioButtonCard
                id="recurring-no"
                value="false"
                label="One-time Only"
                description="Triggers once"
                icon={<span style={{ fontSize: '20px' }}>⚡</span>}
                isSelected={!isRecurring}
                onChange={() => setIsRecurring(false)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Next Occurrence Info */}
          <div style={{
            padding: '16px',
            backgroundColor: colors.brand.primary + '10',
            borderRadius: '8px',
            borderLeft: `3px solid ${colors.brand.primary}`
          }}>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              Next Alert Date
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.brand.primary,
              marginBottom: '4px'
            }}>
              {nextOccurrence.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </div>
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText
            }}>
              {isRecurring ? 'Will repeat annually on this date' : 'One-time alert only'}
            </div>
          </div>

          {/* Priority */}
          <PrioritySelector
            value={priority}
            onChange={setPriority}
            disabled={isSubmitting}
          />

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
              placeholder="Add any additional notes about this alert..."
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

export default TimeAlertForm;