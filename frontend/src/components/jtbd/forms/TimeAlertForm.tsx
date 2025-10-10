// frontend/src/components/jtbd/forms/TimeAlertForm.tsx

import React, { useState, useMemo } from 'react';
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
  const [alertDate, setAlertDate] = useState<number>(1);
  const [alertMonth, setAlertMonth] = useState<number>(1);
  const [isRecurring, setIsRecurring] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Month data
  const months = [
    { value: 1, label: 'Jan', fullName: 'January', icon: '❄️' },
    { value: 2, label: 'Feb', fullName: 'February', icon: '💝' },
    { value: 3, label: 'Mar', fullName: 'March', icon: '🌸' },
    { value: 4, label: 'Apr', fullName: 'April', icon: '🌷' },
    { value: 5, label: 'May', fullName: 'May', icon: '🌺' },
    { value: 6, label: 'Jun', fullName: 'June', icon: '☀️' },
    { value: 7, label: 'Jul', fullName: 'July', icon: '🌻' },
    { value: 8, label: 'Aug', fullName: 'August', icon: '🏖️' },
    { value: 9, label: 'Sep', fullName: 'September', icon: '🍂' },
    { value: 10, label: 'Oct', fullName: 'October', icon: '🎃' },
    { value: 11, label: 'Nov', fullName: 'November', icon: '🍁' },
    { value: 12, label: 'Dec', fullName: 'December', icon: '🎄' }
  ];

  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  const priorityOptions = [
    { value: 'critical', label: 'Critical', color: '#DC2626' },
    { value: 'high', label: 'High', color: '#F97316' },
    { value: 'medium', label: 'Medium', color: '#F59E0B' },
    { value: 'low', label: 'Low', color: '#10B981' }
  ];

  // Show toast helper
  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

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

  // Validate
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const errorMessages: string[] = [];

    if (!title.trim()) {
      newErrors.title = 'Title is required';
      errorMessages.push('Alert title is required');
    }
    if (!alertDate || alertDate < 1 || alertDate > 31) {
      newErrors.alert_date = 'Invalid day';
      errorMessages.push('Alert day must be between 1 and 31');
    }
    if (alertDate > daysInMonth[alertMonth - 1]) {
      newErrors.alert_date = `${months[alertMonth - 1].fullName} only has ${daysInMonth[alertMonth - 1]} days`;
      errorMessages.push(`${months[alertMonth - 1].fullName} only has ${daysInMonth[alertMonth - 1]} days`);
    }
    
    setErrors(newErrors);

    if (errorMessages.length > 0) {
      displayToast(errorMessages[0]);
    }

    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = () => {
    if (!validate()) return;

    const config: TimeBasedConfig = {
      alert_date: Math.min(alertDate, daysInMonth[alertMonth - 1]),
      alert_month: alertMonth,
      is_recurring: isRecurring
    };

    onSubmit({
      customer_id: customerId,
      jtbd_type: 'time_based',
      title,
      description,
      priority,
      config_data: config
    });
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '75vh', 
      maxHeight: '700px',
      width: '100%'
    }}>
      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: colors.semantic.error,
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideInRight 0.3s ease-out',
          maxWidth: '400px'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{toastMessage}</span>
        </div>
      )}

      {/* Main Content - Single Panel */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        
        {/* Title - Full Width */}
        <div>
          <label style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: colors.utility.secondaryText, 
            marginBottom: '8px', 
            display: 'block',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Alert Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Tax Filing Deadline, Policy Renewal"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `2px solid ${errors.title ? colors.semantic.error : colors.utility.primaryText + '15'}`,
              borderRadius: '8px',
              color: colors.utility.primaryText,
              outline: 'none'
            }}
          />
          {errors.title && (
            <div style={{ fontSize: '11px', color: colors.semantic.error, marginTop: '4px' }}>
              {errors.title}
            </div>
          )}
        </div>

        {/* Two Column Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          
          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Month Selection - 4x3 Grid */}
            <div>
              <label style={{
                fontSize: '13px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                marginBottom: '10px',
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Select Month *
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px'
              }}>
                {months.map((month) => (
                  <div
                    key={month.value}
                    onClick={() => setAlertMonth(month.value)}
                    style={{
                      padding: '10px 6px',
                      backgroundColor: alertMonth === month.value ? colors.brand.primary + '20' : colors.utility.secondaryBackground,
                      border: `2px solid ${alertMonth === month.value ? colors.brand.primary : colors.utility.primaryText + '10'}`,
                      borderRadius: '8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '16px', marginBottom: '4px' }}>{month.icon}</div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: colors.utility.primaryText }}>
                      {month.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alert Day */}
            <div>
              <label style={{ 
                fontSize: '13px', 
                fontWeight: '600', 
                color: colors.utility.secondaryText, 
                marginBottom: '8px', 
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Alert Day *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={alertDate}
                onChange={(e) => setAlertDate(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '16px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `2px solid ${errors.alert_date ? colors.semantic.error : colors.utility.primaryText + '15'}`,
                  borderRadius: '8px',
                  color: colors.utility.primaryText,
                  outline: 'none',
                  fontWeight: '600'
                }}
              />
              {errors.alert_date && (
                <div style={{ fontSize: '11px', color: colors.semantic.error, marginTop: '4px' }}>
                  {errors.alert_date}
                </div>
              )}
              {alertDate >= 29 && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: colors.semantic.info + '10',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: colors.semantic.info,
                  lineHeight: '1.4'
                }}>
                  💡 Alert will adjust to last day of month when needed
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Next Alert Preview Box */}
            <div style={{
              padding: '20px',
              backgroundColor: colors.brand.primary + '10',
              borderRadius: '12px',
              border: `2px solid ${colors.brand.primary}40`,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Next Alert Date
              </div>
              <div style={{
                fontSize: '32px',
                marginBottom: '4px'
              }}>
                📅
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.brand.primary,
                marginBottom: '4px'
              }}>
                {nextOccurrence.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short'
                })}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                {nextOccurrence.getFullYear()}
              </div>
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                borderTop: `1px solid ${colors.utility.primaryText}10`,
                paddingTop: '8px',
                marginTop: '8px'
              }}>
                {isRecurring ? '🔄 Repeats yearly' : '⚡ One-time only'}
              </div>
            </div>

            {/* Recurrence Type - Stacked */}
            <div>
              <label style={{
                fontSize: '13px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                marginBottom: '10px',
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Recurrence Type
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  onClick={() => setIsRecurring(true)}
                  style={{
                    padding: '12px',
                    backgroundColor: isRecurring ? colors.brand.primary + '20' : colors.utility.secondaryBackground,
                    border: `2px solid ${isRecurring ? colors.brand.primary : colors.utility.primaryText + '10'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: `2px solid ${isRecurring ? colors.brand.primary : colors.utility.secondaryText}`,
                    backgroundColor: isRecurring ? colors.brand.primary : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isRecurring && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText }}>
                      🔄 Recurring Yearly
                    </div>
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                      Repeats every year
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setIsRecurring(false)}
                  style={{
                    padding: '12px',
                    backgroundColor: !isRecurring ? colors.brand.primary + '20' : colors.utility.secondaryBackground,
                    border: `2px solid ${!isRecurring ? colors.brand.primary : colors.utility.primaryText + '10'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: `2px solid ${!isRecurring ? colors.brand.primary : colors.utility.secondaryText}`,
                    backgroundColor: !isRecurring ? colors.brand.primary : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {!isRecurring && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText }}>
                      ⚡ One-time Only
                    </div>
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                      Triggers once
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tip Box */}
            <div style={{
              padding: '12px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px',
              fontSize: '11px',
              color: colors.utility.secondaryText,
              lineHeight: '1.5'
            }}>
              💡 Tip: Use time-based alerts for tax deadlines, policy renewals, or annual reviews.
            </div>

          </div>
        </div>

        {/* Priority - Horizontal 4 Columns */}
        <div>
          <label style={{
            fontSize: '13px',
            fontWeight: '600',
            color: colors.utility.secondaryText,
            marginBottom: '10px',
            display: 'block',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Priority Level
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {priorityOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => setPriority(option.value as any)}
                style={{
                  padding: '12px',
                  backgroundColor: priority === option.value ? option.color + '20' : colors.utility.secondaryBackground,
                  border: `2px solid ${priority === option.value ? option.color : colors.utility.primaryText + '10'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: `2px solid ${priority === option.value ? option.color : colors.utility.secondaryText}`,
                  backgroundColor: priority === option.value ? option.color : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {priority === option.value && (
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'white' }} />
                  )}
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: priority === option.value ? option.color : colors.utility.primaryText
                }}>
                  {option.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Description - Full Width */}
        <div>
          <label style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: colors.utility.secondaryText, 
            marginBottom: '8px', 
            display: 'block',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Add any additional notes..."
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '13px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `2px solid ${colors.utility.primaryText}15`,
              borderRadius: '8px',
              color: colors.utility.primaryText,
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Footer with Actions */}
      <div style={{
        borderTop: `2px solid ${colors.brand.primary}30`,
        padding: '16px 24px',
        backgroundColor: colors.utility.secondaryBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Preview Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          {title && (
            <>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                📝 {title.substring(0, 30)}{title.length > 30 ? '...' : ''}
              </div>
              <div style={{ width: '1px', height: '16px', backgroundColor: colors.utility.primaryText + '20' }} />
            </>
          )}
          <div style={{ fontSize: '12px', fontWeight: '600', color: colors.brand.primary }}>
            📅 {months[alertMonth - 1].label} {alertDate}
          </div>
          <div style={{ width: '1px', height: '16px', backgroundColor: colors.utility.primaryText + '20' }} />
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
            {isRecurring ? '🔄 Yearly' : '⚡ Once'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
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
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            style={{
              padding: '10px 24px',
              backgroundColor: colors.brand.primary,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isSubmitting || !title.trim() ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !title.trim() ? 0.6 : 1
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Alert'}
          </button>
        </div>
      </div>

      {/* CSS Animation for Toast */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default TimeAlertForm;