// frontend/src/components/jtbd/forms/PortfolioAlertForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CreateJTBDRequest, PortfolioAlertConfig } from '../../../types/jtbd.types';
import { useCustomerSchemes, useTransactionTypes } from '../../../hooks/useJTBD';

interface PortfolioAlertFormProps {
  customerId: number;
  onSubmit: (data: CreateJTBDRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const PortfolioAlertForm: React.FC<PortfolioAlertFormProps> = ({
  customerId,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Fetch data
  const { data: schemes, isLoading: schemesLoading } = useCustomerSchemes(customerId);
  const { data: transactionTypes, isLoading: typesLoading } = useTransactionTypes();

  // Form state
  const [selectedSchemeCodes, setSelectedSchemeCodes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [txnTypeId, setTxnTypeId] = useState<number>(0);
  const [txnTypeName, setTxnTypeName] = useState<string>('');
  const [frequency, setFrequency] = useState<'daily' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | 'NA'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(5);
  const [deviationDays, setDeviationDays] = useState<number>(2);
  const [amount, setAmount] = useState<number>(0);
  const [trackTillMonths, setTrackTillMonths] = useState<number>(12);
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Frequency options
  const frequencyOptions = [
    { value: 'daily', label: 'Daily', icon: '📅' },
    { value: 'fortnightly', label: 'Fortnightly', icon: '📆' },
    { value: 'monthly', label: 'Monthly', icon: '🗓️' },
    { value: 'quarterly', label: 'Quarterly', icon: '📊' },
    { value: 'yearly', label: 'Yearly', icon: '🎯' },
    { value: 'NA', label: 'One-time', icon: '⚡' }
  ];

  // Priority options
  const priorityOptions = [
    { value: 'critical', label: 'Critical', color: '#DC2626' },
    { value: 'high', label: 'High', color: '#F97316' },
    { value: 'medium', label: 'Medium', color: '#F59E0B' },
    { value: 'low', label: 'Low', color: '#10B981' }
  ];

  // Group transaction types
  const additions = useMemo(() => 
    transactionTypes?.filter(t => t.txn_type === 'Addition') || [], 
    [transactionTypes]
  );
  
  const deductions = useMemo(() => 
    transactionTypes?.filter(t => t.txn_type === 'Deduction') || [], 
    [transactionTypes]
  );

  // Filter schemes
  const filteredSchemes = useMemo(() => {
    if (!schemes) return [];
    if (!searchQuery) return schemes;
    return schemes.filter(s => 
      s.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.scheme_code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [schemes, searchQuery]);

  // Show toast helper
  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  // Handle scheme toggle
  const handleSchemeToggle = (schemeCode: string) => {
    if (selectedSchemeCodes.includes(schemeCode)) {
      setSelectedSchemeCodes(prev => prev.filter(c => c !== schemeCode));
    } else {
      if (selectedSchemeCodes.length >= 10) return;
      setSelectedSchemeCodes(prev => [...prev, schemeCode]);
    }
  };

  // Validate
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const errorMessages: string[] = [];

    if (selectedSchemeCodes.length === 0) {
      newErrors.schemes = 'Select at least one scheme';
      errorMessages.push('Please select at least one scheme');
    }
    
    if (!txnTypeId) {
      newErrors.txn_type_id = 'Select transaction type';
      errorMessages.push('Please select a transaction type');
    }
    
    if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
      errorMessages.push('Expected amount must be greater than 0');
    }
    
    if (['monthly', 'quarterly', 'yearly'].includes(frequency) && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
      newErrors.day_of_month = 'Day must be between 1 and 31';
      errorMessages.push('Day of month must be between 1 and 31');
    }

    setErrors(newErrors);

    if (errorMessages.length > 0) {
      displayToast(errorMessages[0]); // Show first error in toast
    }

    return Object.keys(newErrors).length === 0;
  };

  // Submit
  const handleSubmit = () => {
    if (!validate()) return;

    const selectedSchemes = schemes?.filter(s => selectedSchemeCodes.includes(s.scheme_code)) || [];
    
    selectedSchemes.forEach((scheme) => {
      const config: PortfolioAlertConfig = {
        scheme_code: scheme.scheme_code,
        scheme_name: scheme.scheme_name,
        folio_no: scheme.folio_no || '',
        txn_type_id: txnTypeId,
        txn_type: txnTypeName,
        frequency,
        day_of_month: ['monthly', 'quarterly', 'yearly'].includes(frequency) ? dayOfMonth : undefined,
        deviation_days: deviationDays,
        amount,
        track_till_months: trackTillMonths
      };

      onSubmit({
        customer_id: customerId,
        jtbd_type: 'portfolio_alert',
        title: title || `${txnTypeName} alert for ${scheme.scheme_name}`,
        description,
        priority,
        config_data: config
      });
    });
  };

  const isLoading = schemesLoading || typesLoading;

  return (
    <div style={{ display: 'flex', height: '75vh', maxHeight: '700px' }}>
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

      {/* LEFT PANEL: Schemes */}
      <div style={{
        width: '280px',
        borderRight: `1px solid ${colors.utility.primaryText}15`,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.utility.secondaryBackground
      }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: colors.utility.secondaryText,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '12px'
          }}>
            Select Schemes (max 10)
          </div>
          
          {/* Search */}
          <input
            type="text"
            placeholder="Search schemes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: colors.utility.primaryBackground,
              border: `1px solid ${colors.utility.primaryText}15`,
              borderRadius: '6px',
              fontSize: '13px',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}
          />
          
          {/* Actions */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setSelectedSchemeCodes(filteredSchemes.slice(0, 10).map(s => s.scheme_code))}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                backgroundColor: 'transparent',
                color: colors.brand.primary,
                border: `1px solid ${colors.brand.primary}40`,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => setSelectedSchemeCodes([])}
              disabled={isLoading || selectedSchemeCodes.length === 0}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.secondaryText}40`,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
          
          {/* Count */}
          {selectedSchemeCodes.length > 0 && (
            <div style={{
              marginTop: '8px',
              padding: '6px',
              backgroundColor: colors.brand.primary + '15',
              borderRadius: '4px',
              fontSize: '11px',
              color: colors.brand.primary,
              textAlign: 'center',
              fontWeight: '600'
            }}>
              {selectedSchemeCodes.length} selected
            </div>
          )}
        </div>

        {/* Scheme List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: colors.utility.secondaryText, fontSize: '12px' }}>
              Loading...
            </div>
          ) : filteredSchemes.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: colors.utility.secondaryText, fontSize: '12px' }}>
              No schemes found
            </div>
          ) : (
            filteredSchemes.map((scheme) => {
              const isSelected = selectedSchemeCodes.includes(scheme.scheme_code);
              const isDisabled = !isSelected && selectedSchemeCodes.length >= 10;
              
              return (
                <label
                  key={scheme.scheme_code}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '10px',
                    marginBottom: '4px',
                    backgroundColor: isSelected ? colors.brand.primary + '10' : colors.utility.primaryBackground,
                    border: `1px solid ${isSelected ? colors.brand.primary + '40' : 'transparent'}`,
                    borderRadius: '6px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSchemeToggle(scheme.scheme_code)}
                    disabled={isDisabled}
                    style={{
                      marginTop: '2px',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      accentColor: colors.brand.primary
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: colors.utility.primaryText,
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {scheme.scheme_name}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: colors.utility.secondaryText
                    }}>
                      {scheme.scheme_code}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
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
                  placeholder="Add notes..."
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

          {/* Transaction Types - 2 Rows with Color-Coded Borders */}
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
              Transaction Type *
            </label>
            
            {/* ADDITIONS - Green Border */}
            {additions.length > 0 && (
              <>
                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '600', marginBottom: '6px' }}>
                  + ADDITIONS
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  {additions.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => {
                        setTxnTypeId(type.id);
                        setTxnTypeName(type.txn_name);
                      }}
                      style={{
                        padding: '12px 8px',
                        backgroundColor: txnTypeId === type.id ? '#10B981' + '15' : colors.utility.secondaryBackground,
                        border: `2px solid ${txnTypeId === type.id ? '#10B981' : '#10B981' + '40'}`,
                        borderRadius: '8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: '600', color: colors.utility.primaryText }}>
                        {type.txn_name}
                      </div>
                      <div style={{ fontSize: '9px', color: colors.utility.secondaryText, marginTop: '2px' }}>
                        {type.txn_code}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* DEDUCTIONS - Red Border */}
            {deductions.length > 0 && (
              <>
                <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: '600', marginBottom: '6px' }}>
                  − DEDUCTIONS
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px'
                }}>
                  {deductions.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => {
                        setTxnTypeId(type.id);
                        setTxnTypeName(type.txn_name);
                      }}
                      style={{
                        padding: '12px 8px',
                        backgroundColor: txnTypeId === type.id ? '#EF4444' + '15' : colors.utility.secondaryBackground,
                        border: `2px solid ${txnTypeId === type.id ? '#EF4444' : '#EF4444' + '40'}`,
                        borderRadius: '8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: '600', color: colors.utility.primaryText }}>
                        {type.txn_name}
                      </div>
                      <div style={{ fontSize: '9px', color: colors.utility.secondaryText, marginTop: '2px' }}>
                        {type.txn_code}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            {errors.txn_type_id && (
              <div style={{ fontSize: '11px', color: colors.semantic.error, marginTop: '4px' }}>
                {errors.txn_type_id}
              </div>
            )}
          </div>

          {/* Frequency - 6 Column Grid */}
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
              Frequency *
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '8px'
            }}>
              {frequencyOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => setFrequency(option.value as any)}
                  style={{
                    padding: '12px 8px',
                    backgroundColor: frequency === option.value ? colors.brand.primary + '20' : colors.utility.secondaryBackground,
                    border: `2px solid ${frequency === option.value ? colors.brand.primary : colors.utility.primaryText + '10'}`,
                    borderRadius: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{option.icon}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: colors.utility.primaryText }}>
                    {option.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Priority (Horizontal) + Other Fields - Orange Box Area */}
          <div style={{
            padding: '16px',
            backgroundColor: colors.semantic.warning + '08',
            border: `2px solid ${colors.semantic.warning}30`,
            borderRadius: '10px'
          }}>
            {/* Priority - Horizontal */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                marginBottom: '8px',
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Priority
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {priorityOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => setPriority(option.value as any)}
                    style={{
                      padding: '10px',
                      backgroundColor: priority === option.value ? option.color + '20' : colors.utility.secondaryBackground,
                      border: `2px solid ${priority === option.value ? option.color : colors.utility.primaryText + '10'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: `2px solid ${priority === option.value ? option.color : colors.utility.secondaryText}`,
                      backgroundColor: priority === option.value ? option.color : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {priority === option.value && (
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'white' }} />
                      )}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: priority === option.value ? option.color : colors.utility.primaryText
                    }}>
                      {option.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Fields - 2x2 Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Day of Month */}
              {['monthly', 'quarterly', 'yearly'].includes(frequency) && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                    Day of Month *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '13px',
                      backgroundColor: colors.utility.primaryBackground,
                      border: `1px solid ${errors.day_of_month ? colors.semantic.error : colors.utility.primaryText + '15'}`,
                      borderRadius: '6px',
                      color: colors.utility.primaryText
                    }}
                  />
                </div>
              )}

              {/* Deviation Days */}
              {['monthly', 'quarterly', 'yearly'].includes(frequency) && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                    Deviation (± days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={deviationDays}
                    onChange={(e) => setDeviationDays(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '13px',
                      backgroundColor: colors.utility.primaryBackground,
                      border: `1px solid ${colors.utility.primaryText}15`,
                      borderRadius: '6px',
                      color: colors.utility.primaryText
                    }}
                  />
                </div>
              )}

              {/* Expected Amount */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                  Expected Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    backgroundColor: colors.utility.primaryBackground,
                    border: `1px solid ${errors.amount ? colors.semantic.error : colors.utility.primaryText + '15'}`,
                    borderRadius: '6px',
                    color: colors.utility.primaryText
                  }}
                />
              </div>

              {/* Track Duration */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.secondaryText, marginBottom: '6px', display: 'block' }}>
                  Track Duration (months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={trackTillMonths}
                  onChange={(e) => setTrackTillMonths(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '13px',
                    backgroundColor: colors.utility.primaryBackground,
                    border: `1px solid ${colors.utility.primaryText}15`,
                    borderRadius: '6px',
                    color: colors.utility.primaryText
                  }}
                />
              </div>
            </div>

            {/* Smart Date Helper */}
            {dayOfMonth >= 29 && ['monthly', 'quarterly', 'yearly'].includes(frequency) && (
              <div style={{
                marginTop: '10px',
                padding: '8px 10px',
                backgroundColor: colors.semantic.info + '10',
                border: `1px solid ${colors.semantic.info}40`,
                borderRadius: '6px',
                fontSize: '11px',
                color: colors.semantic.info,
                lineHeight: '1.4'
              }}>
                💡 Smart date logic: Alert will adjust to month-end (Feb 28/29, Apr/Jun/Sep/Nov 30th)
              </div>
            )}
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
            {selectedSchemeCodes.length > 0 && (
              <>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: colors.brand.primary
                }}>
                  ✓ {selectedSchemeCodes.length} scheme{selectedSchemeCodes.length > 1 ? 's' : ''}
                </div>
                <div style={{ width: '1px', height: '16px', backgroundColor: colors.utility.primaryText + '20' }} />
              </>
            )}
            {txnTypeName && (
              <>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  💰 {txnTypeName}
                </div>
                <div style={{ width: '1px', height: '16px', backgroundColor: colors.utility.primaryText + '20' }} />
              </>
            )}
            {frequency && (
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                📅 {frequencyOptions.find(f => f.value === frequency)?.label}
                {['monthly', 'quarterly', 'yearly'].includes(frequency) && ` (${dayOfMonth}th)`}
              </div>
            )}
            {amount > 0 && (
              <>
                <div style={{ width: '1px', height: '16px', backgroundColor: colors.utility.primaryText + '20' }} />
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  ₹{amount.toLocaleString('en-IN')}
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
              disabled={isSubmitting || selectedSchemeCodes.length === 0}
              style={{
                padding: '8px 20px',
                backgroundColor: colors.brand.primary,
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '13px',
                fontWeight: '600',
                cursor: isSubmitting || selectedSchemeCodes.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || selectedSchemeCodes.length === 0 ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Creating...' : `Create ${selectedSchemeCodes.length > 1 ? `${selectedSchemeCodes.length} Alerts` : 'Alert'}`}
            </button>
          </div>
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

export default PortfolioAlertForm;