// frontend/src/components/customers/forms/CustomerDetailsStep.tsx

import React, { useState, useCallback } from 'react';
import { SurvivalStatus } from '../../../types/customer.types';
import { useTheme } from '../../../contexts/ThemeContext';

interface CustomerDetailsStepProps {
  pan: string;
  iwell_code: string;
  date_of_birth: string;
  anniversary_date: string;
  survival_status: SurvivalStatus;
  date_of_death?: string;
  family_head_name: string;
  family_head_iwell_code: string;
  referred_by_name: string;
  errors?: {
    pan?: string;
    iwell_code?: string;
    date_of_birth?: string;
    anniversary_date?: string;
    date_of_death?: string;
    family_head_name?: string;
    family_head_iwell_code?: string;
    referred_by_name?: string;
    survival_status?: string;
  };
  onChange: (field: string, value: any) => void;
  disabled?: boolean;
}

const CustomerDetailsStep: React.FC<CustomerDetailsStepProps> = ({
  pan,
  iwell_code,
  date_of_birth,
  anniversary_date,
  survival_status,
  date_of_death,
  family_head_name,
  family_head_iwell_code,
  referred_by_name,
  errors = {},
  onChange,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Calculate age from date of birth
  const calculateAge = useCallback((dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, []);

  // Format PAN input
  const formatPAN = (value: string): string => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    // Limit to 10 characters (PAN format: AAAAA9999A)
    return cleaned.slice(0, 10);
  };

  // Format IWell code
  const formatIWellCode = (value: string): string => {
    // Allow alphanumeric characters, convert to uppercase
    return value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  };

  // Validate PAN format
  const validatePAN = (pan: string): boolean => {
    if (!pan) return true; // Optional field
    // PAN format: 5 letters + 4 digits + 1 letter
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
  };

  // Get today's date for max date restrictions
  const today = new Date().toISOString().split('T')[0];
  const age = calculateAge(date_of_birth);

  // Icons
  const CreditCardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  const HeartIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );

  const UsersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
          2
        </div>
        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            Customer Details
          </h3>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            Financial information and personal details
          </p>
        </div>
      </div>

      {/* Financial Information Section */}
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
          <CreditCardIcon />
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            Financial Information
          </h4>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px'
        }}>
          {/* PAN */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              PAN Number
            </label>
            <input
              type="text"
              value={pan}
              onChange={(e) => onChange('pan', formatPAN(e.target.value))}
              disabled={disabled}
              placeholder="ABCDE1234F"
              maxLength={10}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${
                  errors.pan ? colors.semantic.error : 
                  pan && !validatePAN(pan) ? colors.semantic.warning :
                  colors.utility.primaryText + '20'
                }`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none',
                textTransform: 'uppercase'
              }}
            />
            {pan && !validatePAN(pan) && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.warning,
                marginTop: '4px',
                display: 'block'
              }}>
                Invalid PAN format (should be AAAAA9999A)
              </span>
            )}
            {errors.pan && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.error,
                marginTop: '4px',
                display: 'block'
              }}>
                {errors.pan}
              </span>
            )}
          </div>

          {/* IWell Code */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              IWell Code
            </label>
            <input
              type="text"
              value={iwell_code}
              onChange={(e) => onChange('iwell_code', formatIWellCode(e.target.value))}
              disabled={disabled}
              placeholder="IW123456"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.iwell_code ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none',
                textTransform: 'uppercase'
              }}
            />
            {errors.iwell_code && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.error,
                marginTop: '4px',
                display: 'block'
              }}>
                {errors.iwell_code}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
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
          <CalendarIcon />
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            Important Dates
          </h4>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: '16px',
          alignItems: 'start'
        }}>
          {/* Date of Birth */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              Date of Birth
            </label>
            <input
              type="date"
              value={date_of_birth}
              onChange={(e) => onChange('date_of_birth', e.target.value)}
              disabled={disabled}
              max={today}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.date_of_birth ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {errors.date_of_birth && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.error,
                marginTop: '4px',
                display: 'block'
              }}>
                {errors.date_of_birth}
              </span>
            )}
          </div>

          {/* Anniversary Date */}
          <div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              <HeartIcon />
              Anniversary Date
            </label>
            <input
              type="date"
              value={anniversary_date}
              onChange={(e) => onChange('anniversary_date', e.target.value)}
              disabled={disabled}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.anniversary_date ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {errors.anniversary_date && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.error,
                marginTop: '4px',
                display: 'block'
              }}>
                {errors.anniversary_date}
              </span>
            )}
          </div>

          {/* Age Display */}
          {age !== null && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: colors.brand.primary + '10',
              borderRadius: '8px',
              textAlign: 'center',
              minWidth: '80px'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: colors.brand.primary,
                lineHeight: 1
              }}>
                {age}
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                marginTop: '2px'
              }}>
                years old
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Survival Status Section */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <div style={{
          marginBottom: '16px'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0,
            marginBottom: '4px'
          }}>
            Current Status
          </h4>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            Please select the current survival status
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {/* Alive Option */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            border: `2px solid ${survival_status === 'alive' ? colors.brand.primary : colors.utility.primaryText + '20'}`,
            borderRadius: '8px',
            backgroundColor: survival_status === 'alive' ? colors.brand.primary + '10' : colors.utility.primaryBackground,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.6 : 1
          }}>
            <input
              type="radio"
              name="survival_status"
              value="alive"
              checked={survival_status === 'alive'}
              onChange={(e) => {
                onChange('survival_status', 'alive');
                onChange('date_of_death', '');
              }}
              disabled={disabled}
              style={{
                width: '18px',
                height: '18px',
                marginRight: '12px',
                accentColor: colors.brand.primary
              }}
            />
            <div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '2px'
              }}>
                Alive
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                Person is currently living
              </div>
            </div>
          </label>

          {/* Deceased Option */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            border: `2px solid ${survival_status === 'deceased' ? colors.brand.primary : colors.utility.primaryText + '20'}`,
            borderRadius: '8px',
            backgroundColor: survival_status === 'deceased' ? colors.brand.primary + '10' : colors.utility.primaryBackground,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.6 : 1
          }}>
            <input
              type="radio"
              name="survival_status"
              value="deceased"
              checked={survival_status === 'deceased'}
              onChange={(e) => {
                onChange('survival_status', 'deceased');
              }}
              disabled={disabled}
              style={{
                width: '18px',
                height: '18px',
                marginRight: '12px',
                accentColor: colors.brand.primary
              }}
            />
            <div>
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '2px'
              }}>
                Deceased
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                Person has passed away
              </div>
            </div>
          </label>
        </div>

        {/* Date of Death (conditional) */}
        {survival_status === 'deceased' && (
          <div style={{
            maxWidth: '300px'
          }}>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              Date of Death
            </label>
            <input
              type="date"
              value={date_of_death || ''}
              onChange={(e) => onChange('date_of_death', e.target.value)}
              disabled={disabled}
              max={today}
              min={date_of_birth}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.date_of_death ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {errors.date_of_death && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.error,
                marginTop: '4px',
                display: 'block'
              }}>
                {errors.date_of_death}
              </span>
            )}
          </div>
        )}

        {errors.survival_status && (
          <span style={{
            fontSize: '12px',
            color: colors.semantic.error,
            marginTop: '8px',
            display: 'block'
          }}>
            {errors.survival_status}
          </span>
        )}
      </div>

      {/* Family Information Section */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <UsersIcon />
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            Family Information
          </h4>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '16px'
        }}>
          {/* Family Head Name */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              Family Head Name
            </label>
            <input
              type="text"
              value={family_head_name}
              onChange={(e) => onChange('family_head_name', e.target.value)}
              disabled={disabled}
              placeholder="Enter family head name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.family_head_name ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {errors.family_head_name && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.error,
                marginTop: '4px',
                display: 'block'
              }}>
                {errors.family_head_name}
              </span>
            )}
          </div>

          {/* Family Head IWell Code */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              Family Head IWell Code
            </label>
            <input
              type="text"
              value={family_head_iwell_code}
              onChange={(e) => onChange('family_head_iwell_code', formatIWellCode(e.target.value))}
              disabled={disabled}
              placeholder="IW123456"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.family_head_iwell_code ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none',
                textTransform: 'uppercase'
              }}
            />
            {errors.family_head_iwell_code && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.error,
                marginTop: '4px',
                display: 'block'
              }}>
                {errors.family_head_iwell_code}
              </span>
            )}
          </div>

          {/* Referred By */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              Referred By
            </label>
            <input
              type="text"
              value={referred_by_name}
              onChange={(e) => onChange('referred_by_name', e.target.value)}
              disabled={disabled}
              placeholder="Enter referrer name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${errors.referred_by_name ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            />
            {errors.referred_by_name && (
              <span style={{
                fontSize: '12px',
                color: colors.semantic.error,
                marginTop: '4px',
                display: 'block'
              }}>
                {errors.referred_by_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsStep;