// frontend/src/components/contacts/ContactCard.tsx

import React from 'react';
import { Contact } from '../../types/contact.types';
import { useTheme } from '../../contexts/ThemeContext';

interface ContactCardProps {
  contact: Contact;
  onView: () => void;
  onEdit: () => void;
  onConvertToCustomer: () => void;
  onDelete: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (contactId: number, selected: boolean) => void;
}

const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onView,
  onEdit,
  onConvertToCustomer,
  onDelete,
  selectable = false,
  selected = false,
  onSelectionChange,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Get primary contact info - check all primary channels
  const primaryEmail = contact.channels?.find(ch => 
    ch.channel_type === 'email' && ch.is_primary
  )?.channel_value;
  
  const primaryPhone = contact.channels?.find(ch => 
    ch.channel_type === 'mobile' && ch.is_primary
  )?.channel_value;
  
  const primaryWhatsApp = contact.channels?.find(ch => 
    ch.channel_type === 'whatsapp' && ch.is_primary
  )?.channel_value;

  // Show any primary channel available
  const primaryContact = primaryPhone || primaryWhatsApp || primaryEmail || 
    contact.channels?.[0]?.channel_value || 'No contact info';

  // Generate initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Avatar color
  const getAvatarColor = (name: string) => {
    const avatarColors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return avatarColors[hash % avatarColors.length];
  };

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

  const UserPlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
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
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${selected ? colors.brand.primary : colors.utility.primaryText + '10'}`,
        borderRadius: '12px',
        padding: '16px',
        transition: 'all 0.2s ease',
        boxShadow: selected ? `0 0 0 2px ${colors.brand.primary}20` : 'none',
        width: '100%'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left side - Checkbox, Avatar and Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                onSelectionChange?.(contact.id, !selected);
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
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: getAvatarColor(contact.name),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              flexShrink: 0
            }}
          >
            {getInitials(contact.name)}
          </div>

          {/* Name and Status */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '16px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                {contact.prefix} {contact.name}
              </span>
              <BuildingIcon />
            </div>
            
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                backgroundColor: contact.is_active ? colors.semantic.success + '20' : colors.utility.secondaryText + '20',
                color: contact.is_active ? colors.semantic.success : colors.utility.secondaryText
              }}
            >
              {contact.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        {/* Right side - Primary Contact and Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Primary Contact Display */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: colors.utility.secondaryText,
            fontSize: '14px',
            minWidth: '200px'
          }}>
            <PhoneIcon />
            <span>{primaryContact}</span>
          </div>

          {/* Customer Status / Convert Button */}
          {contact.is_customer ? (
            <div
              style={{
                backgroundColor: colors.semantic.success + '20',
                color: colors.semantic.success,
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Customer
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvertToCustomer();
              }}
              style={{
                backgroundColor: colors.brand.tertiary + '20',
                color: colors.brand.tertiary,
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Convert to Customer
            </button>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={(e) => {
                
                onView();
              }}
              style={{
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'auto'
              }}
              title="View"
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
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Edit"
            >
              <EditIcon />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete contact ${contact.name}?`)) {
                  onDelete();
                }
              }}
              style={{
                backgroundColor: 'transparent',
                color: colors.semantic.error,
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Delete"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactCard;