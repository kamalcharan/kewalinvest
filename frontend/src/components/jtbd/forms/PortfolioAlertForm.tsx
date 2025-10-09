// frontend/src/components/jtbd/forms/PortfolioAlertForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { CreateJTBDRequest, PortfolioAlertConfig } from '../../../types/jtbd.types';
import { useCustomerSchemes, useTransactionTypes } from '../../../hooks/useJTBD';
import SchemeSelector from '../common/SchemeSelector';
import RadioButtonCard from '../common/RadioButtonCard';
import PrioritySelector from '../common/PrioritySelector';
import PreviewPanel from '../common/PreviewPanel';

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

  // Fetch dropdown data
  const { data: schemes, isLoading: schemesLoading } = useCustomerSchemes(customerId);
  const { data: transactionTypes, isLoading: typesLoading } = useTransactionTypes();

  // Form state
  const [selectedSchemeCodes, setSelectedSchemeCodes] = useState<string[]>([]);
  const [txnTypeId, setTxnTypeId] = useState<number>(0);
  const [txnTypeName, setTxnTypeName] = useState<string>('');
  const [frequency, setFrequency] = useState<'daily' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | 'NA'>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(5);
  const [deviationDays, setDeviationDays] = useState<number>(2);
  const [amount, setAmount] = useState<number>(0);
  const [trackTillMonths, setTrackTillMonths] = useState<number>(12);
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate track till date for display
  const trackTillDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + trackTillMonths);
    return date;
  }, [trackTillMonths]);

  // Frequency options
  const frequencyOptions = [
    { value: 'daily', label: 'Daily', icon: '📅', description: 'Every day' },
    { value: 'fortnightly', label: 'Fortnightly', icon: '📆', description: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly', icon: '🗓️', description: 'Every month', badge: 'Popular' },
    { value: 'quarterly', label: 'Quarterly', icon: '📊', description: 'Every 3 months' },
    { value: 'yearly', label: 'Yearly', icon: '🎯', description: 'Every year' },
    { value: 'NA', label: 'One-time', icon: '⚡', description: 'No recurrence' }
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

  // Get transaction icon
  const getTransactionIcon = (txnCode: string) => {
    const code = txnCode.toLowerCase();
    if (code.includes('sip')) return '💰';
    if (code.includes('purchase')) return '🛒';
    if (code.includes('redemption')) return '📤';
    if (code.includes('switch')) return '🔄';
    if (code.includes('dividend')) return '💵';
    return '📋';
  };

  // Smart day-of-month helper text
  const getDayOfMonthHelperText = () => {
    if (dayOfMonth >= 29 && ['monthly', 'quarterly', 'yearly'].includes(frequency)) {
      return (
        <div style={{
          marginTop: '8px',
          padding: '10px 12px',
          backgroundColor: colors.semantic.info + '10',
          border: `1px solid ${colors.semantic.info}40`,
          borderRadius: '6px',
          fontSize: '12px',
          color: colors.semantic.info,
          lineHeight: '1.5'
        }}>
          <strong>💡 Smart Date Logic:</strong> Alert will trigger on the last available day of each month:
          <br />• Feb: 28th (or 29th in leap years)
          {dayOfMonth >= 31 && <><br />• Apr/Jun/Sep/Nov: 30th</>}
          <br />• All other months: {dayOfMonth}th
        </div>
      );
    }
    return null;
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedSchemeCodes.length === 0) {
      newErrors.schemes = 'Please select at least one scheme';
    }
    if (!txnTypeId) {
      newErrors.txn_type_id = 'Please select transaction type';
    }
    if (!frequency) {
      newErrors.frequency = 'Please select frequency';
    }
    if (amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (trackTillMonths <= 0) {
      newErrors.track_till_months = 'Duration must be at least 1 month';
    }
    
    if (['monthly', 'quarterly', 'yearly'].includes(frequency)) {
      if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
        newErrors.day_of_month = 'Day must be between 1 and 31';
      }
    }

    if (deviationDays < 0) {
      newErrors.deviation_days = 'Deviation cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate preview items
  const previewItems = useMemo(() => {
    const items = [];
    
    if (selectedSchemeCodes.length > 0) {
      items.push({
        icon: '💼',
        label: 'Schemes',
        value: `${selectedSchemeCodes.length} selected`
      });
    }
    
    if (txnTypeName) {
      items.push({
        icon: getTransactionIcon(txnTypeName),
        label: 'Transaction',
        value: txnTypeName
      });
    }
    
    if (frequency) {
      const freqOption = frequencyOptions.find(f => f.value === frequency);
      items.push({
        icon: freqOption?.icon || '📅',
        label: 'Frequency',
        value: freqOption?.label || frequency
      });
    }
    
    if (['monthly', 'quarterly', 'yearly'].includes(frequency) && dayOfMonth) {
      items.push({
        icon: '📍',
        label: 'Day of Period',
        value: `${dayOfMonth}${deviationDays > 0 ? ` (±${deviationDays} days)` : ''}`
      });
    }
    
    if (amount > 0) {
      items.push({
        icon: '💵',
        label: 'Amount',
        value: `₹${amount.toLocaleString('en-IN')}`
      });
    }
    
    if (trackTillMonths > 0) {
      items.push({
        icon: '⏰',
        label: 'Track Until',
        value: trackTillDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
      });
    }

    return items;
  }, [selectedSchemeCodes, txnTypeName, frequency, dayOfMonth, deviationDays, amount, trackTillMonths, trackTillDate, frequencyOptions]);

  // Handle submit
  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    // Get selected schemes details
    const selectedSchemes = schemes?.filter(s => selectedSchemeCodes.includes(s.scheme_code)) || [];

    // Create one alert per scheme
    selectedSchemes.forEach((scheme, index) => {
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

      const requestData: CreateJTBDRequest = {
        customer_id: customerId,
        jtbd_type: 'portfolio_alert',
        title: `${txnTypeName} alert for ${scheme.scheme_name}`,
        description,
        priority,
        config_data: config
      };

      // Submit each one
      onSubmit(requestData);
    });
  };

  const isLoading = schemesLoading || typesLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable Form Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '20px' }}>
          
          {/* Scheme Selection */}
          <SchemeSelector
            schemes={schemes || []}
            selectedSchemeCodes={selectedSchemeCodes}
            onChange={setSelectedSchemeCodes}
            maxSelections={10}
            disabled={isLoading || isSubmitting}
            isLoading={schemesLoading}
          />
          {errors.schemes && (
            <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '-16px', display: 'block' }}>
              {errors.schemes}
            </span>
          )}

          {/* Transaction Type */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '12px'
            }}>
              Transaction Type <span style={{ color: colors.semantic.error }}>*</span>
            </label>

            {/* Additions */}
            {additions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#10B981',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  + Additions (Investments)
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '10px'
                }}>
                  {additions.map((type) => (
                    <RadioButtonCard
                      key={type.id}
                      id={`txn-${type.id}`}
                      value={type.id.toString()}
                      label={type.txn_name}
                      description={type.txn_code}
                      icon={<span style={{ fontSize: '20px' }}>{getTransactionIcon(type.txn_code)}</span>}
                      isSelected={txnTypeId === type.id}
                      onChange={() => {
                        setTxnTypeId(type.id);
                        setTxnTypeName(type.txn_name);
                      }}
                      disabled={isLoading || isSubmitting}
                      accentColor="#10B981"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Deductions */}
            {deductions.length > 0 && (
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#F97316',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  − Deductions (Withdrawals)
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '10px'
                }}>
                  {deductions.map((type) => (
                    <RadioButtonCard
                      key={type.id}
                      id={`txn-${type.id}`}
                      value={type.id.toString()}
                      label={type.txn_name}
                      description={type.txn_code}
                      icon={<span style={{ fontSize: '20px' }}>{getTransactionIcon(type.txn_code)}</span>}
                      isSelected={txnTypeId === type.id}
                      onChange={() => {
                        setTxnTypeId(type.id);
                        setTxnTypeName(type.txn_name);
                      }}
                      disabled={isLoading || isSubmitting}
                      accentColor="#F97316"
                    />
                  ))}
                </div>
              </div>
            )}
            {errors.txn_type_id && (
              <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                {errors.txn_type_id}
              </span>
            )}
          </div>

          {/* Frequency */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '12px'
            }}>
              Frequency <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '10px'
            }}>
              {frequencyOptions.map((option) => (
                <RadioButtonCard
                  key={option.value}
                  id={`freq-${option.value}`}
                  value={option.value}
                  label={option.label}
                  description={option.description}
                  icon={<span style={{ fontSize: '20px' }}>{option.icon}</span>}
                  isSelected={frequency === option.value}
                  onChange={(val) => setFrequency(val as any)}
                  disabled={isLoading || isSubmitting}
                  badge={option.badge}
                />
              ))}
            </div>
          </div>

          {/* Day of Month (conditional) */}
          {['monthly', 'quarterly', 'yearly'].includes(frequency) && (
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}>
                Day of Month <span style={{ color: colors.semantic.error }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: colors.utility.secondaryBackground,
                  border: `1px solid ${errors.day_of_month ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                  borderRadius: '8px',
                  color: colors.utility.primaryText,
                  fontSize: '14px'
                }}
              />
              {errors.day_of_month && (
                <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                  {errors.day_of_month}
                </span>
              )}
              {getDayOfMonthHelperText()}
            </div>
          )}

          {/* Deviation Days */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Deviation Days (±)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={deviationDays}
              onChange={(e) => setDeviationDays(Number(e.target.value))}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${errors.deviation_days ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                fontSize: '14px'
              }}
            />
            {errors.deviation_days && (
              <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                {errors.deviation_days}
              </span>
            )}
            {dayOfMonth && deviationDays > 0 && ['monthly', 'quarterly', 'yearly'].includes(frequency) && (
              <span style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px', display: 'block' }}>
                Alert window: {dayOfMonth - deviationDays} to {dayOfMonth + deviationDays} of each period
              </span>
            )}
          </div>

          {/* Amount */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Expected Amount (₹) <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${errors.amount ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                fontSize: '14px'
              }}
            />
            {errors.amount && (
              <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                {errors.amount}
              </span>
            )}
          </div>

          {/* Track Duration */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Track Duration (months) <span style={{ color: colors.semantic.error }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={trackTillMonths}
              onChange={(e) => setTrackTillMonths(Number(e.target.value))}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${errors.track_till_months ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                fontSize: '14px'
              }}
            />
            {errors.track_till_months && (
              <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
                {errors.track_till_months}
              </span>
            )}
            <span style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px', display: 'block' }}>
              Track until: {trackTillDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* Priority */}
          <PrioritySelector
            value={priority}
            onChange={setPriority}
            disabled={isSubmitting}
          />

          {/* Description */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add any additional notes..."
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>
      </div>

      {/* Preview Panel - Sticky at bottom */}
      <PreviewPanel
        items={previewItems}
        schemeCount={selectedSchemeCodes.length}
        onConfirm={handleSubmit}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        confirmButtonText="Create Alert"
      />
    </div>
  );
};

export default PortfolioAlertForm;