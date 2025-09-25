// frontend/src/components/customers/forms/AddressForm.tsx

import React from 'react';
import { CustomerAddress, AddressType } from '../../../types/customer.types';
import { useTheme } from '../../../contexts/ThemeContext';


interface AddressFormProps {
  address: CustomerAddress;
  index: number;
  errors?: {
    address_line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
    address_type?: string;
  };
  onChange: (index: number, field: keyof CustomerAddress, value: any) => void;
  onRemove?: () => void;
  disabled?: boolean;
  canRemove?: boolean;
  showRemoveButton?: boolean;
}

const AddressForm: React.FC<AddressFormProps> = ({
  address,
  index,
  errors = {},
  onChange,
  onRemove,
  disabled = false,
  canRemove = true,
  showRemoveButton = true
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Format pincode (allow only digits, max 6 characters)
  const formatPincode = (value: string): string => {
    return value.replace(/\D/g, '').slice(0, 6);
  };

  // Validate pincode
  const validatePincode = (pincode: string): boolean => {
    return /^\d{6}$/.test(pincode);
  };

  // Indian states for dropdown
  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
    'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
    'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
    'Chandigarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi',
    'Lakshadweep', 'Puducherry'
  ];

  // Icons
  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const MapPinIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );

  const HomeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );

  const BuildingIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-3" />
      <rect x="9" y="9" width="4" height="4" />
      <rect x="9" y="14" width="4" height="4" />
    </svg>
  );

  return (
    <div style={{ width: '100%' }}>
      {/* Address Type and Actions Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        gap: '12px',
        alignItems: 'end',
        marginBottom: '16px'
      }}>
        {/* Address Type */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText
          }}>
            Address Type *
          </label>
          <select
            value={address.address_type}
            onChange={(e) => onChange(index, 'address_type', e.target.value as AddressType)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${errors.address_type ? colors.semantic.error : colors.utility.primaryText + '20'}`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
            }}
          >
           
            <option value="residential">Residential</option>
            <option value="office">Office</option>
            <option value="mailing">Mailing</option>
            <option value="permanent">Permanent</option>
            <option value="temporary">Temporary</option>
            <option value="other">Other</option>
          </select>
          {errors.address_type && (
            <span style={{
              fontSize: '12px',
              color: colors.semantic.error,
              marginTop: '4px',
              display: 'block'
            }}>
              {errors.address_type}
            </span>
          )}
        </div>

        {/* Active Status */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText
          }}>
            Active
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '40px'
          }}>
            <input
              type="checkbox"
              checked={address.is_active}
              onChange={(e) => onChange(index, 'is_active', e.target.checked)}
              disabled={disabled}
              style={{
                width: '18px',
                height: '18px',
                accentColor: colors.brand.primary
              }}
            />
          </div>
        </div>

        {/* Primary Checkbox */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText
          }}>
            Primary
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '40px'
          }}>
            <input
              type="checkbox"
              checked={address.is_primary}
              onChange={(e) => onChange(index, 'is_primary', e.target.checked)}
              disabled={disabled}
              style={{
                width: '18px',
                height: '18px',
                accentColor: colors.brand.primary
              }}
            />
          </div>
        </div>

        {/* Remove Button */}
        {showRemoveButton && (
          <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled || !canRemove}
              style={{
                padding: '10px',
                backgroundColor: 'transparent',
                color: !canRemove ? colors.utility.secondaryText : colors.semantic.error,
                border: `1px solid ${!canRemove ? colors.utility.secondaryText + '40' : colors.semantic.error + '40'}`,
                borderRadius: '6px',
                cursor: !canRemove ? 'not-allowed' : 'pointer',
                opacity: !canRemove ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={!canRemove ? 'Cannot remove last address' : 'Remove address'}
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>

      {/* Address Lines */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Address Line 1 */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText
          }}>
            Address Line 1 *
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.utility.secondaryText
            }}>
              <HomeIcon />
            </div>
            <input
              type="text"
              value={address.address_line1}
              onChange={(e) => onChange(index, 'address_line1', e.target.value)}
              disabled={disabled}
              placeholder="House/Flat number, Building name, Street"
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: `1px solid ${errors.address_line1 ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '6px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
          {errors.address_line1 && (
            <span style={{
              fontSize: '12px',
              color: colors.semantic.error,
              marginTop: '4px',
              display: 'block'
            }}>
              {errors.address_line1}
            </span>
          )}
        </div>

        {/* Address Line 2 */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText
          }}>
            Address Line 2
          </label>
          <input
            type="text"
            value={address.address_line2 || ''}
            onChange={(e) => onChange(index, 'address_line2', e.target.value)}
            disabled={disabled}
            placeholder="Landmark, Area (optional)"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* City, State, Country Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* City */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText
          }}>
            City *
          </label>
          <input
            type="text"
            value={address.city}
            onChange={(e) => onChange(index, 'city', e.target.value)}
            disabled={disabled}
            placeholder="Enter city"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${errors.city ? colors.semantic.error : colors.utility.primaryText + '20'}`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
            }}
          />
          {errors.city && (
            <span style={{
              fontSize: '12px',
              color: colors.semantic.error,
              marginTop: '4px',
              display: 'block'
            }}>
              {errors.city}
            </span>
          )}
        </div>

        {/* State */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText
          }}>
            State *
          </label>
          <select
            value={address.state}
            onChange={(e) => onChange(index, 'state', e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${errors.state ? colors.semantic.error : colors.utility.primaryText + '20'}`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
            }}
          >
            <option value="">Select State</option>
            {indianStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          {errors.state && (
            <span style={{
              fontSize: '12px',
              color: colors.semantic.error,
              marginTop: '4px',
              display: 'block'
            }}>
              {errors.state}
            </span>
          )}
        </div>

        {/* Country */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText
          }}>
            Country *
          </label>
          <input
            type="text"
            value={address.country}
            onChange={(e) => onChange(index, 'country', e.target.value)}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Pincode */}
      <div style={{ maxWidth: '200px' }}>
        <label style={{
          display: 'block',
          marginBottom: '6px',
          fontSize: '14px',
          fontWeight: '500',
          color: colors.utility.primaryText
        }}>
          Pincode *
        </label>
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.utility.secondaryText
          }}>
            <MapPinIcon />
          </div>
          <input
            type="text"
            value={address.pincode}
            onChange={(e) => onChange(index, 'pincode', formatPincode(e.target.value))}
            disabled={disabled}
            placeholder="000000"
            maxLength={6}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              border: `1px solid ${
                errors.pincode ? colors.semantic.error : 
                address.pincode && !validatePincode(address.pincode) ? colors.semantic.warning :
                colors.utility.primaryText + '20'
              }`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px',
              fontFamily: 'monospace',
              outline: 'none'
            }}
          />
        </div>
        {address.pincode && !validatePincode(address.pincode) && (
          <span style={{
            fontSize: '12px',
            color: colors.semantic.warning,
            marginTop: '4px',
            display: 'block'
          }}>
            Pincode should be 6 digits
          </span>
        )}
        {errors.pincode && (
          <span style={{
            fontSize: '12px',
            color: colors.semantic.error,
            marginTop: '4px',
            display: 'block'
          }}>
            {errors.pincode}
          </span>
        )}
      </div>

      {/* Address Preview */}
      {address.address_line1 && address.city && address.state && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: colors.brand.primary + '05',
          border: `1px solid ${colors.brand.primary}20`,
          borderRadius: '6px'
        }}>
          <label style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: colors.utility.secondaryText
          }}>
            Address Preview:
          </label>
          <div style={{
            fontSize: '14px',
            color: colors.utility.primaryText,
            lineHeight: 1.4
          }}>
            {address.address_line1}
            {address.address_line2 && <>, {address.address_line2}</>}
            <br />
            {address.city}, {address.state} {address.pincode}
            <br />
            {address.country}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressForm;