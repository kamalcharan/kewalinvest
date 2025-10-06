// frontend/src/components/jtbd/forms/PortfolioAlertForm.tsx

import React, { useState, useEffect } from 'react';
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

  // Fetch dropdown data
  const { data: schemes, isLoading: schemesLoading } = useCustomerSchemes(customerId);
  const { data: transactionTypes, isLoading: typesLoading } = useTransactionTypes();

  // Form state
  const [formData, setFormData] = useState<PortfolioAlertConfig>({
    scheme_code: '',
    scheme_name: '',
    folio_no: '',
    txn_type_id: 0,
    txn_type: '',
    frequency: 'monthly',
    day_of_month: 5,
    deviation_days: 2,
    amount: 0,
    track_till_months: 12
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate track till date for display
  const trackTillDate = new Date();
  trackTillDate.setMonth(trackTillDate.getMonth() + formData.track_till_months);

  // Handle scheme selection
  const handleSchemeChange = (schemeCode: string) => {
    const selectedScheme = schemes?.find(s => s.scheme_code === schemeCode);
    if (selectedScheme) {
      setFormData(prev => ({
        ...prev,
        scheme_code: selectedScheme.scheme_code,
        scheme_name: selectedScheme.scheme_name,
        folio_no: selectedScheme.folio_no || ''
      }));
    }
  };

  // Handle transaction type selection
  const handleTxnTypeChange = (txnTypeId: number) => {
    const selectedType = transactionTypes?.find(t => t.id === txnTypeId);
    if (selectedType) {
      setFormData(prev => ({
        ...prev,
        txn_type_id: selectedType.id,
        txn_type: selectedType.txn_name
      }));
    }
  };

  // Auto-generate title when key fields change
  useEffect(() => {
    if (formData.scheme_name && formData.txn_type) {
      setTitle(`${formData.txn_type} alert for ${formData.scheme_name}`);
    }
  }, [formData.scheme_name, formData.txn_type]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.scheme_code) newErrors.scheme_code = 'Please select a scheme';
    if (!formData.txn_type_id) newErrors.txn_type_id = 'Please select transaction type';
    if (!formData.frequency) newErrors.frequency = 'Please select frequency';
    if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
    if (formData.track_till_months <= 0) newErrors.track_till_months = 'Duration must be at least 1 month';
    
    if (['monthly', 'quarterly', 'yearly'].includes(formData.frequency)) {
      if (!formData.day_of_month || formData.day_of_month < 1 || formData.day_of_month > 31) {
        newErrors.day_of_month = 'Day must be between 1 and 31';
      }
    }

    if (formData.deviation_days < 0) {
      newErrors.deviation_days = 'Deviation cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const requestData: CreateJTBDRequest = {
      customer_id: customerId,
      jtbd_type: 'portfolio_alert',
      title: title || `${formData.txn_type} alert for ${formData.scheme_name}`,
      description,
      priority,
      config_data: formData
    };

    onSubmit(requestData);
  };

  const isLoading = schemesLoading || typesLoading;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Scheme Selection */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Select Scheme <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <select
          value={formData.scheme_code}
          onChange={(e) => handleSchemeChange(e.target.value)}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${errors.scheme_code ? colors.semantic.error : colors.utility.primaryText + '20'}`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        >
          <option value="">
            {isLoading ? 'Loading schemes...' : 'Select a scheme from portfolio'}
          </option>
          {schemes?.map(scheme => (
            <option key={scheme.scheme_code} value={scheme.scheme_code}>
              {scheme.scheme_name} {scheme.folio_no ? `(${scheme.folio_no})` : ''}
            </option>
          ))}
        </select>
        {errors.scheme_code && (
          <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
            {errors.scheme_code}
          </span>
        )}
      </div>

      {/* Transaction Type */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Transaction Type <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <select
          value={formData.txn_type_id}
          onChange={(e) => handleTxnTypeChange(Number(e.target.value))}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${errors.txn_type_id ? colors.semantic.error : colors.utility.primaryText + '20'}`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        >
          <option value="">
            {isLoading ? 'Loading types...' : 'Select transaction type'}
          </option>
          {transactionTypes?.map(type => (
            <option key={type.id} value={type.id}>
              {type.txn_name} ({type.txn_type})
            </option>
          ))}
        </select>
        {errors.txn_type_id && (
          <span style={{ fontSize: '12px', color: colors.semantic.error, marginTop: '4px', display: 'block' }}>
            {errors.txn_type_id}
          </span>
        )}
      </div>

      {/* Frequency */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Frequency <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <select
          value={formData.frequency}
          onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        >
          <option value="daily">Daily</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
          <option value="NA">One-time (No Recurrence)</option>
        </select>
      </div>

      {/* Day of Month (only for monthly/quarterly/yearly) */}
      {['monthly', 'quarterly', 'yearly'].includes(formData.frequency) && (
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '8px'
            }}
          >
            Day of Month <span style={{ color: colors.semantic.error }}>*</span>
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={formData.day_of_month}
            onChange={(e) => setFormData(prev => ({ ...prev, day_of_month: Number(e.target.value) }))}
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
          <span style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px', display: 'block' }}>
            Alert will trigger on this day each period
          </span>
        </div>
      )}

      {/* Deviation Days */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Deviation Days (±)
        </label>
        <input
          type="number"
          min="0"
          max="10"
          value={formData.deviation_days}
          onChange={(e) => setFormData(prev => ({ ...prev, deviation_days: Number(e.target.value) }))}
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
        {formData.day_of_month && formData.deviation_days > 0 && (
          <span style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px', display: 'block' }}>
            Alert window: {formData.day_of_month - formData.deviation_days} to {formData.day_of_month + formData.deviation_days} of each period
          </span>
        )}
      </div>

      {/* Amount */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Expected Amount (₹) <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
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

      {/* Track Till Months */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Track Duration (months) <span style={{ color: colors.semantic.error }}>*</span>
        </label>
        <input
          type="number"
          min="1"
          max="60"
          value={formData.track_till_months}
          onChange={(e) => setFormData(prev => ({ ...prev, track_till_months: Number(e.target.value) }))}
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
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Priority Level
        </label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Custom Title (optional) */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Custom Title (optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Auto-generated if left blank"
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        />
      </div>

      {/* Description (optional) */}
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add any additional notes..."
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            color: colors.utility.primaryText,
            fontSize: '14px',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.brand.primary,
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500',
            cursor: (isSubmitting || isLoading) ? 'not-allowed' : 'pointer',
            opacity: (isSubmitting || isLoading) ? 0.5 : 1
          }}
        >
          {isSubmitting ? 'Creating...' : 'Create Alert'}
        </button>
      </div>
    </form>
  );
};

export default PortfolioAlertForm;