// frontend/src/components/customers/CustomerCard.tsx

import React from 'react';
import { CustomerWithContact } from '../../types/customer.types';
import { useTheme } from '../../contexts/ThemeContext';

interface CustomerCardProps {
  customer: CustomerWithContact;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (customerId: number, selected: boolean) => void;
}

const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  onView,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onSelectionChange,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string | undefined): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get primary contact info
  const primaryEmail = customer.channels?.find(ch => 
    ch.channel_type === 'email' && ch.is_primary
  )?.channel_value;
  
  const primaryPhone = customer.channels?.find(ch => 
    ch.channel_type === 'mobile' && ch.is_primary
  )?.channel_value;
  
  const primaryWhatsApp = customer.channels?.find(ch => 
    ch.channel_type === 'whatsapp' && ch.is_primary
  )?.channel_value;

  const primaryContact = primaryPhone || primaryWhatsApp || primaryEmail || 
    customer.channels?.[0]?.channel_value || 'No contact info';

  // Generate initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Avatar color based on customer ID for consistency
  const getAvatarColor = (id: number) => {
    const avatarColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    return avatarColors[id % avatarColors.length];
  };

  const age = calculateAge(customer.date_of_birth);

  // Icons
  const PhoneIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );

  const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EditIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
    </svg>
  );

  const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const MapPinIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );

  const CreditCardIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );

  return (
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${selected ? colors.brand.primary : colors.utility.primaryText + '10'}`,
        borderRadius: '12px',
        padding: '20px',
        transition: 'all 0.2s ease',
        boxShadow: selected ? `0 0 0 2px ${colors.brand.primary}20` : 'none',
        width: '100%',
        cursor: 'pointer'
      }}
      onClick={onView}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left side - Checkbox, Avatar and Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Checkbox */}
          {selectable && (
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                border: `2px solid ${selected ? colors.brand.primary : colors.utility.secondaryText}`,
                backgroundColor: selected ? colors.brand.primary : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                cursor: 'pointer'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectionChange?.(customer.id, !selected);
              }}
            >
              {selected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              )}
            </div>
          )}

          {/* Avatar */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: getAvatarColor(customer.id),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '16px',
              flexShrink: 0
            }}
          >
            {getInitials(customer.name)}
          </div>

          {/* Customer Info */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px'
            }}>
              <span style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                {customer.prefix} {customer.name}
              </span>
              <UserIcon />
            </div>
            
            {/* Customer Details Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              {/* Age */}
              {age && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{age} years</span>
                </div>
              )}
              
              {/* PAN Status */}
              {customer.pan && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  color: colors.semantic.success
                }}>
                  <CreditCardIcon />
                  <span>PAN</span>
                </div>
              )}
              
              {/* Address Count */}
              {customer.address_count && customer.address_count > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPinIcon />
                  <span>{customer.address_count} address{customer.address_count > 1 ? 'es' : ''}</span>
                </div>
              )}
            </div>

            {/* Status Badges */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginTop: '8px' 
            }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: customer.is_active ? colors.semantic.success + '20' : colors.utility.secondaryText + '20',
                  color: customer.is_active ? colors.semantic.success : colors.utility.secondaryText
                }}
              >
                {customer.is_active ? 'Active' : 'Inactive'}
              </div>
              
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: customer.survival_status === 'alive' ? colors.semantic.success + '20' : colors.utility.secondaryText + '20',
                  color: customer.survival_status === 'alive' ? colors.semantic.success : colors.utility.secondaryText
                }}
              >
                {customer.survival_status === 'alive' ? 'Alive' : 'Deceased'}
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: getOnboardingStatusColor(customer.onboarding_status) + '20',
                  color: getOnboardingStatusColor(customer.onboarding_status)
                }}
              >
                {customer.onboarding_status.charAt(0).toUpperCase() + customer.onboarding_status.slice(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Contact and Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Primary Contact Display */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '4px',
            minWidth: '200px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: colors.utility.secondaryText,
              fontSize: '14px'
            }}>
              <PhoneIcon />
              <span>{primaryContact}</span>
            </div>
            {customer.iwell_code && (
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText,
                fontFamily: 'monospace'
              }}>
                IW: {customer.iwell_code}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              style={{
                backgroundColor: colors.brand.primary + '20',
                color: colors.brand.primary,
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              title="View Details"
            >
              <EyeIcon />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.secondaryText}40`,
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Edit Customer"
            >
              <EditIcon />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete customer ${customer.name}? This action cannot be undone.`)) {
                  onDelete();
                }
              }}
              style={{
                backgroundColor: 'transparent',
                color: colors.semantic.error,
                border: `1px solid ${colors.semantic.error}40`,
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              title="Delete Customer"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function getOnboardingStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return colors.semantic.success;
      case 'in_progress':
        return colors.brand.primary;
      case 'pending':
        return colors.semantic.warning;
      case 'cancelled':
        return colors.semantic.error;
      default:
        return colors.utility.secondaryText;
    }
  }
};

export default CustomerCard;