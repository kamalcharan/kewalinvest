// src/components/customers/CustomerCard.tsx
// Updated to use real backend API types

import React from 'react';
import { CustomerWithContact } from '../../types/customer.types';
import { CustomerPortfolioResponse } from '../../types/portfolio.types';
import { JTBDData } from '../../types/jtbd.types';
import { useTheme } from '../../contexts/ThemeContext';
import PerformanceSparkline from '../visualizations/PerformanceSparkline';

interface CustomerCardProps {
  customer: CustomerWithContact;
  portfolio?: CustomerPortfolioResponse;
  jtbd?: JTBDData;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (customerId: number, selected: boolean) => void;
  showFinancials?: boolean;
  variant?: 'list' | 'dashboard';
}

const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  portfolio,
  jtbd,
  onView,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onSelectionChange,
  showFinancials = true,
  variant = 'list'
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

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  // Get value color
  const getValueColor = (value: number): string => {
    if (value > 0) return '#10B981';
    if (value < 0) return '#EF4444';
    return colors.utility.secondaryText;
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#DC2626';
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.utility.secondaryText;
    }
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

  const TrendUpIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  );

  const TrendDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
      <polyline points="17,18 23,18 23,12" />
    </svg>
  );

  const BellIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {/* Left side - Customer Info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
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
                cursor: 'pointer',
                marginTop: '2px'
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

          {/* Customer Info */}
          <div style={{ flex: 1 }}>
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
              
              {/* Status badges */}
              <div style={{
                display: 'inline-flex',
                padding: '2px 6px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: '500',
                backgroundColor: customer.is_active ? colors.semantic.success + '20' : colors.utility.secondaryText + '20',
                color: customer.is_active ? colors.semantic.success : colors.utility.secondaryText
              }}>
                {customer.is_active ? 'Active' : 'Inactive'}
              </div>
              
              {/* JTBD Priority Indicator */}
              {jtbd && jtbd.actions.length > 0 && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: '500',
                  backgroundColor: getPriorityColor(jtbd.actions[0].priority) + '20',
                  color: getPriorityColor(jtbd.actions[0].priority)
                }}>
                  <BellIcon />
                  {jtbd.actions[0].priority === 'critical' ? 'Urgent' : jtbd.actions[0].priority}
                </div>
              )}
            </div>
            
            {/* Contact and Details */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PhoneIcon />
                <span>{primaryContact}</span>
              </div>
              {customer.iwell_code && (
                <>
                  <span>•</span>
                  <span style={{ fontFamily: 'monospace' }}>IW: {customer.iwell_code}</span>
                </>
              )}
              {age && (
                <>
                  <span>•</span>
                  <span>{age} years</span>
                </>
              )}
            </div>

            {/* Portfolio Summary (if available) - UPDATED FOR API */}
            {showFinancials && portfolio && (
              <div style={{
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px'
              }}>
                <div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: colors.utility.primaryText
                  }}>
                    {formatCurrency(portfolio.summary.current_value)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText
                  }}>
                    Portfolio Value
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: getValueColor(portfolio.summary.return_percentage),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {portfolio.summary.return_percentage >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
                    {portfolio.summary.return_percentage >= 0 ? '+' : ''}{portfolio.summary.return_percentage.toFixed(1)}%
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText
                  }}>
                    Overall Returns
                  </div>
                </div>

                {/* Performance history removed - not available in API response by default */}
                {portfolio.performance && portfolio.performance.length > 0 && (
                  <div style={{ marginLeft: 'auto', marginRight: '20px' }}>
                    <PerformanceSparkline
                      data={portfolio.performance.map(p => p.current_value)}
                      width={100}
                      height={32}
                      showArea={true}
                      showTooltip={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* JTBD Top Action (if available) */}
            {showFinancials && jtbd && jtbd.actions.length > 0 && (
              <div style={{
                marginTop: '12px',
                padding: '10px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px',
                borderLeft: `3px solid ${getPriorityColor(jtbd.actions[0].priority)}`
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: colors.utility.primaryText,
                  marginBottom: '4px'
                }}>
                  {jtbd.actions[0].title}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText
                }}>
                  {jtbd.actions[0].description}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
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
  );
};

export default CustomerCard;