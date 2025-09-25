// frontend/src/components/customers/forms/AddressStep.tsx

import React, { useState, useCallback } from 'react';
import { CustomerAddress, AddressType } from '../../../types/customer.types';
import { useTheme } from '../../../contexts/ThemeContext';
import AddressForm from './AddressForm';

interface AddressStepProps {
  addresses: CustomerAddress[];
  errors?: {
    addresses?: Record<number, {
      address_line1?: string;
      city?: string;
      state?: string;
      pincode?: string;
      address_type?: string;
    }>;
  };
  onChange: (field: string, value: any) => void;
  disabled?: boolean;
}

const AddressStep: React.FC<AddressStepProps> = ({
  addresses,
  errors = {},
  onChange,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Generate temporary ID for new addresses
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle adding new address
  const handleAddAddress = useCallback(() => {
    const newAddress: CustomerAddress = {
      id: parseInt(generateTempId().replace('temp_', '')),
      customer_id: 0, // Will be set when customer is created
      is_active: true,
      address_type: 'residential',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      is_primary: addresses.length === 0, // First address is primary
      created_at: new Date().toISOString()
    };
    onChange('addresses', [...addresses, newAddress]);
  }, [addresses, onChange]);

  // Handle removing address
  const handleRemoveAddress = useCallback((index: number) => {
    const updatedAddresses = addresses.filter((_, i) => i !== index);
    
    // If we removed the primary address, make the first remaining address primary
    if (addresses[index].is_primary && updatedAddresses.length > 0) {
      updatedAddresses[0].is_primary = true;
    }
    
    onChange('addresses', updatedAddresses);
  }, [addresses, onChange]);

  // Handle address field changes
  const handleAddressChange = useCallback((index: number, field: keyof CustomerAddress, value: any) => {
    const updatedAddresses = [...addresses];
    updatedAddresses[index] = { ...updatedAddresses[index], [field]: value };
    
    // If setting this as primary, remove primary from others
    if (field === 'is_primary' && value === true) {
      updatedAddresses.forEach((address, i) => {
        if (i !== index) {
          address.is_primary = false;
        }
      });
    }
    
    onChange('addresses', updatedAddresses);
  }, [addresses, onChange]);

  // Validate required fields
  const hasValidAddresses = addresses.length === 0 || addresses.some(address => 
    address.address_line1.trim() && 
    address.city.trim() && 
    address.state.trim() && 
    address.pincode.trim()
  );

  // Get address type color
  const getAddressTypeColor = (type: AddressType) => {
    switch (type) {
      case 'home':
      case 'residential':
        return colors.semantic.success;
      case 'office':
        return colors.brand.primary;
      case 'mailing':
        return colors.brand.secondary;
      case 'permanent':
        return colors.semantic.info;
      case 'temporary':
        return colors.semantic.warning;
      default:
        return colors.utility.secondaryText;
    }
  };

  // Icons
  const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  const MapPinIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

  const MailIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );

  const getAddressTypeIcon = (type: AddressType) => {
    switch (type) {
      case 'home':
      case 'residential':
        return <HomeIcon />;
      case 'office':
        return <BuildingIcon />;
      case 'mailing':
        return <MailIcon />;
      default:
        return <MapPinIcon />;
    }
  };

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
          3
        </div>
        <div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            Address Information
          </h3>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            Residential and contact addresses (optional)
          </p>
        </div>
      </div>

      {/* Address Summary */}
      {addresses.length > 0 && (
        <div style={{
          backgroundColor: colors.brand.primary + '10',
          border: `1px solid ${colors.brand.primary}20`,
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <MapPinIcon />
          <div>
            <span style={{
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText
            }}>
              {addresses.length} address{addresses.length > 1 ? 'es' : ''} added
            </span>
            {addresses.some(addr => addr.is_primary) && (
              <span style={{
                marginLeft: '8px',
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                • Primary: {addresses.find(addr => addr.is_primary)?.address_type}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Address List */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <MapPinIcon />
            Customer Addresses
          </h4>
          <button
            type="button"
            onClick={handleAddAddress}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <PlusIcon />
            Add Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            border: `2px dashed ${colors.utility.primaryText}20`,
            borderRadius: '8px'
          }}>
            <div style={{ marginBottom: '16px', opacity: 0.5 }}>
              <MapPinIcon />
            </div>
            <h5 style={{
              fontSize: '16px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              margin: '0 0 8px 0'
            }}>
              No addresses added
            </h5>
            <p style={{
              color: colors.utility.secondaryText,
              margin: '0 0 20px 0',
              fontSize: '14px'
            }}>
              Addresses are optional but help with better customer service
            </p>
            <button
              type="button"
              onClick={handleAddAddress}
              disabled={disabled}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <PlusIcon />
              Add First Address
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {addresses.map((address, index) => (
              <div
                key={address.id}
                style={{
                  border: `1px solid ${address.is_primary ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                  borderRadius: '8px',
                  backgroundColor: colors.utility.primaryBackground,
                  overflow: 'hidden'
                }}
              >
                {/* Address Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: address.is_primary ? colors.brand.primary + '10' : colors.utility.secondaryBackground,
                  borderBottom: `1px solid ${colors.utility.primaryText}10`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <div style={{ color: getAddressTypeColor(address.address_type) }}>
                      {getAddressTypeIcon(address.address_type)}
                    </div>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.utility.primaryText,
                      textTransform: 'capitalize'
                    }}>
                      {address.address_type} Address
                    </span>
                    {address.is_primary && (
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: colors.brand.primary,
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '500',
                        borderRadius: '10px'
                      }}>
                        PRIMARY
                      </span>
                    )}
                  </div>
                  
                  <span style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText
                  }}>
                    Address {index + 1}
                  </span>
                </div>

                {/* Address Form */}
                <div style={{ padding: '16px' }}>
                  <AddressForm
                    address={address}
                    index={index}
                    errors={errors.addresses?.[index]}
                    onChange={handleAddressChange}
                    onRemove={() => handleRemoveAddress(index)}
                    disabled={disabled}
                    canRemove={addresses.length > 1}
                    showRemoveButton={true}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Address Guidelines */}
        <div style={{
          marginTop: '20px',
          padding: '12px 16px',
          backgroundColor: colors.brand.secondary + '10',
          borderRadius: '6px',
          fontSize: '13px',
          color: colors.utility.secondaryText
        }}>
          <strong style={{ color: colors.utility.primaryText }}>Address Guidelines:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '16px' }}>
            <li>Addresses are optional but recommended for better customer service</li>
            <li>You can add multiple addresses (home, office, mailing, etc.)</li>
            <li>One address should be marked as primary for default communications</li>
            <li>All fields except Address Line 2 are required when adding an address</li>
          </ul>
        </div>

        {/* Validation Warning */}
        {addresses.length > 0 && !hasValidAddresses && (
          <div style={{
            marginTop: '12px',
            padding: '12px 16px',
            backgroundColor: colors.semantic.warning + '10',
            border: `1px solid ${colors.semantic.warning}40`,
            borderRadius: '6px',
            fontSize: '14px',
            color: colors.semantic.warning,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Please complete all required fields for the addresses you've added
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressStep;