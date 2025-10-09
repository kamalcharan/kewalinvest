// frontend/src/components/jtbd/forms/ProfileTriggerForm.tsx

import React, { useState, useMemo } from 'react';
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

  // Fetch customer data
  const { data: customer, isLoading: customerLoading } = useCustomer(customerId);

  // Form state
  const [triggerType, setTriggerType] = useState<'birthday' | 'anniversary'>('birthday');
  const [daysBefore, setDaysBefore] = useState<number>(7);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Days before options
  const daysBeforeOptions = [
    { value: 1, label: '1 Day' },
    { value: 3, label: '3 Days' },
    { value: 7, label: '1 Week' },
    { value: 14, label: '2 Weeks' },
    { value: 30, label: '1 Month' }
  ];

  const priorityOptions = [
    { value: 'critical', label: 'Critical', color: '#DC2626' },
    { value: 'high', label: 'High', color: '#F97316' },
    { value: 'medium', label: 'Medium', color: '#F59E0B' },
    { value: 'low', label: 'Low', color: '#10B981' }
  ];

  // Check if customer has required date
  const hasRequiredDate = () => {
    if (!customer) return false;
    if (triggerType === 'birthday' && !customer.date_of_birth) return false;
    if (triggerType === 'anniversary' && !customer.anniversary_date) return false;
    return true;
  };

  // Get customer date
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
    
    let nextDate = new Date(currentYear, customerDate.getMonth(), customerDate.getDate());
    
    if (nextDate < today) {
      nextDate = new Date(currentYear + 1, customerDate.getMonth(), customerDate.getDate());
    }
    
    const alertDate = new Date(nextDate);
    alertDate.setDate(alertDate.getDate() - daysBefore);
    
    return {
      eventDate: nextDate,
      alertDate: alertDate
    };
  }, [customer, triggerType, daysBefore]);

  // Validate
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!hasRequiredDate()) {
      if (triggerType === 'birthday') {
        newErrors.trigger_type = 'Customer does not have a birth date';
      } else {
        newErrors.trigger_type = 'Customer does not have an anniversary date';
      }
    }
    if (daysBefore < 0 || daysBefore > 60) {
      newErrors.days_before = 'Days before must be between 0 and 60';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = () => {
    if (!validate()) return;

    const config: ProfileTriggerConfig = {
      trigger_type: triggerType,
      days_before: daysBefore
    };

    onSubmit({
      customer_id: customerId,
      jtbd_type: 'profile_trigger',
      title: title || `${triggerType === 'birthday' ? 'Birthday' : 'Anniversary'} Reminder (${daysBefore} days before)`,
      description,
      priority,
      config_data: config
    });
  };

  if (customerLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
        Loading customer information...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '75vh', maxHeight: '700px' }}>
      {/* LEFT PANEL: Customer Info */}
      <div style={{
        width: '280px',
        borderRight: `1px solid ${colors.utility.primaryText}15`,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.utility.secondaryBackground,
        padding: '20px'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: colors.utility.secondaryText,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '16px'
        }}>
          Customer Profile
        </div>

        {/* Customer Birthday */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '10px',
          marginBottom: '12px',
          border: `2px solid ${triggerType === 'birthday' && customer?.date_of_birth ? '#F59E0B40' : colors.utility.primaryText + '10'}`
        }}>
          <div style={{
            fontSize: '11px',
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            🎂 Birthday
          </div>
          {customer?.date_of_birth ? (
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              {new Date(customer.date_of_birth).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long'
              })}
            </div>
          ) : (
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              fontStyle: 'italic'
            }}>
              No date on file
            </div>
          )}
        </div>

        {/* Customer Anniversary */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '10px',
          marginBottom: '20px',
          border: `2px solid ${triggerType === 'anniversary' && customer?.anniversary_date ? '#EC489940' : colors.utility.primaryText + '10'}`
        }}>
          <div style={{
            fontSize: '11px',
            color: colors.utility.secondaryText,
            marginBottom: '6px',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            💑 Anniversary
          </div>
          {customer?.anniversary_date ? (
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}>
              {new Date(customer.anniversary_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long'
              })}
            </div>
          ) : (
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              fontStyle: 'italic'
            }}>
              No date on file
            </div>
          )}
        </div>

        {/* Next Alert */}
        {hasRequiredDate() && nextOccurrence && (
          <div style={{
            padding: '16px',
            backgroundColor: colors.brand.primary + '10',
            borderRadius: '10px',
            border: `2px solid ${colors.brand.primary}40`
          }}>
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText,
              marginBottom: '8px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              Next Alert
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.brand.primary,
              marginBottom: '4px'
            }}>
              {nextOccurrence.alertDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </div>
            <div style={{
              fontSize: '10px',
              color: colors.utility.secondaryText,
              borderTop: `1px solid ${colors.utility.primaryText}10`,
              paddingTop: '8px',
              marginTop: '8px'
            }}>
              {daysBefore} day{daysBefore !== 1 ? 's' : ''} before {triggerType}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Scrollable Form Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          
          {/* Title & Description */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                  Alert Title (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Auto-generated if blank"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    backgroundColor: colors.utility.secondaryBackground,
                    border: `1px solid ${colors.utility.primaryText}15`,
                    borderRadius: '6px',
                    color: colors.utility.primaryText
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Gift ideas, message..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    backgroundColor: colors.utility.secondaryBackground,
                    border: `1px solid ${colors.utility.primaryText}15`,
                    borderRadius: '6px',
                    color: colors.utility.primaryText
                  }}
                />
              </div>
            </div>
          </div>

          {/* Event Type Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              marginBottom: '10px',
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Event Type *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Birthday */}
              <div
                onClick={() => setTriggerType('birthday')}
                style={{
                  padding: '16px',
                  backgroundColor: triggerType === 'birthday' ? '#F59E0B20' : colors.utility.secondaryBackground,
                  border: `2px solid ${triggerType === 'birthday' ? '#F59E0B' : colors.utility.primaryText + '10'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${triggerType === 'birthday' ? '#F59E0B' : colors.utility.secondaryText}`,
                  backgroundColor: triggerType === 'birthday' ? '#F59E0B' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {triggerType === 'birthday' && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>🎂</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText }}>
                    Birthday
                  </div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                    {customer?.date_of_birth ? (
                      new Date(customer.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    ) : (
                      'No date on file'
                    )}
                  </div>
                </div>
              </div>

              {/* Anniversary */}
              <div
                onClick={() => setTriggerType('anniversary')}
                style={{
                  padding: '16px',
                  backgroundColor: triggerType === 'anniversary' ? '#EC489920' : colors.utility.secondaryBackground,
                  border: `2px solid ${triggerType === 'anniversary' ? '#EC4899' : colors.utility.primaryText + '10'}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${triggerType === 'anniversary' ? '#EC4899' : colors.utility.secondaryText}`,
                  backgroundColor: triggerType === 'anniversary' ? '#EC4899' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {triggerType === 'anniversary' && (
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>💑</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText }}>
                    Anniversary
                  </div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                    {customer?.anniversary_date ? (
                      new Date(customer.anniversary_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    ) : (
                      'No date on file'
                    )}
                  </div>
                </div>
              </div>
            </div>
            {errors.trigger_type && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: colors.semantic.error + '10',
                border: `1px solid ${colors.semantic.error}40`,
                borderRadius: '6px',
                fontSize: '11px',
                color: colors.semantic.error
              }}>
                ⚠️ {errors.trigger_type}
              </div>
            )}
          </div>

          {/* Days Before - Horizontal Pills */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.utility.secondaryText,
              marginBottom: '10px',
              display: 'block',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Alert Timing *
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {daysBeforeOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setDaysBefore(option.value)}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: daysBefore === option.value ? colors.brand.primary + '20' : colors.utility.secondaryBackground,
                    border: `2px solid ${daysBefore === option.value ? colors.brand.primary : colors.utility.primaryText + '10'}`,
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: daysBefore === option.value ? colors.brand.primary : colors.utility.primaryText,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {option.label} Before
                </div>
              ))}
            </div>
            
            {/* Custom Days Input */}
            <div style={{ marginTop: '12px' }}>
              <label style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                Or enter custom days (0-60):
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={daysBefore}
                onChange={(e) => setDaysBefore(Number(e.target.value))}
                style={{
                  width: '150px',
                  padding: '8px 10px',
                  fontSize: '13px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${errors.days_before ? colors.semantic.error : colors.utility.primaryText + '15'}`,
                  borderRadius: '6px',
                  color: colors.utility.primaryText
                }}
              />
              {errors.days_before && (
                <div style={{ fontSize: '11px', color: colors.semantic.error, marginTop: '4px' }}>
                  {errors.days_before}
                </div>
              )}
            </div>
          </div>

          {/* Priority - Horizontal */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              fontSize: '12px',
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
        </div>

        {/* COMPACT PREVIEW FOOTER */}
        <div style={{
          borderTop: `2px solid ${colors.brand.primary}30`,
          padding: '12px 24px',
          backgroundColor: colors.utility.secondaryBackground,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          {/* Preview Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
              {triggerType === 'birthday' ? '🎂 Birthday' : '💑 Anniversary'}
            </div>
            <div style={{ width: '1px', height: '16px', backgroundColor: colors.utility.primaryText + '20' }} />
            <div style={{ fontSize: '12px', fontWeight: '600', color: colors.brand.primary }}>
              ⏰ {daysBefore} day{daysBefore !== 1 ? 's' : ''} before
            </div>
            {nextOccurrence && (
              <>
                <div style={{ width: '1px', height: '16px', backgroundColor: colors.utility.primaryText + '20' }} />
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  Next: {nextOccurrence.alertDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                color: colors.utility.primaryText,
                fontSize: '13px',
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
              disabled={isSubmitting || !hasRequiredDate()}
              style={{
                padding: '8px 20px',
                backgroundColor: colors.brand.primary,
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: isSubmitting || !hasRequiredDate() ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !hasRequiredDate() ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Creating...' : 'Create Alert'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTriggerForm;