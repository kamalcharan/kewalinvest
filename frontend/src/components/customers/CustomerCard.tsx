// frontend/src/components/customers/CustomerCard.tsx

import React, { useState } from 'react';
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
  onActivate?: () => void;
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
  onActivate,
  selectable = false,
  selected = false,
  onSelectionChange,
  showFinancials = true,
  variant = 'list'
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'activate' | 'deactivate' | null>(null);

  const handleActionClick = (action: 'activate' | 'deactivate') => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    if (confirmAction === 'activate' && onActivate) {
      onActivate();
    } else if (confirmAction === 'deactivate') {
      onDelete();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancelAction = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

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

  const CheckCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
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

  const AlertCircleIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  return (
    <>
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${selected ? colors.brand.primary : colors.utility.primaryText + '10'}`,
          borderRadius: '12px',
          padding: '20px',
          transition: 'all 0.2s ease',
          boxShadow: selected ? `0 0 0 2px ${colors.brand.primary}20` : 'none',
          width: '100%',
          cursor: 'pointer',
          opacity: customer.is_active ? 1 : 0.7
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
                  backgroundColor: customer.is_active ? colors.semantic.success + '20' : colors.semantic.error + '20',
                  color: customer.is_active ? colors.semantic.success : colors.semantic.error
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

              {/* Portfolio Summary (if available) */}
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
                backgroundColor: 'transparent',
                color: colors.brand.primary,
                border: `1px solid ${colors.brand.primary}40`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="View Contact"
            >
              <EyeIcon />
              View
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                backgroundColor: 'transparent',
                color: colors.semantic.info,
                border: `1px solid ${colors.semantic.info}40`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Edit Contact"
            >
              <EditIcon />
              Edit
            </button>

            {/* Conditional Activate/Delete Button */}
            {customer.is_active ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick('deactivate');
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.semantic.error,
                  border: `1px solid ${colors.semantic.error}40`,
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Deactivate Customer"
              >
                <TrashIcon />
                Delete
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick('activate');
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.semantic.success,
                  border: `1px solid ${colors.semantic.success}40`,
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Activate Customer"
              >
                <CheckCircleIcon />
                Activate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${colors.utility.primaryText}10`,
            animation: 'modalSlideIn 0.2s ease-out'
          }}>
            {/* Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: confirmAction === 'activate' 
                  ? colors.semantic.success + '15' 
                  : colors.semantic.error + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: confirmAction === 'activate' 
                  ? colors.semantic.success 
                  : colors.semantic.error
              }}>
                <AlertCircleIcon />
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              textAlign: 'center'
            }}>
              {confirmAction === 'activate' ? 'Activate Customer' : 'Deactivate Customer'}
            </h2>

            {/* Message */}
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '15px',
              color: colors.utility.secondaryText,
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              {confirmAction === 'activate' ? (
                <>
                  You are about to <strong style={{ color: colors.semantic.success }}>activate</strong> the customer <strong>{customer.name}</strong>.
                  <br /><br />
                  This will also activate the linked contact record. The customer will become active and visible in your active customers list.
                </>
              ) : (
                <>
                  You are about to <strong style={{ color: colors.semantic.error }}>deactivate</strong> the customer <strong>{customer.name}</strong>.
                  <br /><br />
                  This will also deactivate the linked contact record. The customer will be marked as inactive but not permanently deleted.
                </>
              )}
            </p>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelAction}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.secondaryText}40`,
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmAction}
                style={{
                  backgroundColor: confirmAction === 'activate' 
                    ? colors.semantic.success 
                    : colors.semantic.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                {confirmAction === 'activate' ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Animation */}
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default CustomerCard;