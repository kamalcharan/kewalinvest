// frontend/src/components/assets/InvestmentPlanForm.tsx
// Form component for creating/editing investment plans (Release 1.1 - Phase 1)

import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAssetTypes } from '../../hooks/useAssetTypes';
import { useBookmarkedSchemes } from '../../hooks/useInvestmentPlans';
import {
  InvestmentPlan,
  CreateInvestmentPlanRequest,
  InvestmentType,
  InvestmentFrequency
} from '../../types/investmentPlan.types';

interface InvestmentPlanFormProps {
  customerId: number;
  plan?: InvestmentPlan; // For edit mode
  onSubmit: (data: CreateInvestmentPlanRequest) => Promise<void>;
  onCancel: () => void;
}

export const InvestmentPlanForm: React.FC<InvestmentPlanFormProps> = ({
  customerId,
  plan,
  onSubmit,
  onCancel
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const { assetTypes, loading: loadingTypes } = useAssetTypes();
  const { schemes, loading: loadingSchemes } = useBookmarkedSchemes();

  const [formData, setFormData] = useState<CreateInvestmentPlanRequest>({
    asset_type_id: plan?.asset_type_id || 0,
    principal_amount: plan?.principal_amount || 0,
    start_date: plan?.start_date?.split('T')[0] || '',
    has_started: plan?.has_started || false,
    duration_months: plan?.duration_months || undefined,
    duration_years: plan?.duration_years || undefined,
    investment_type: plan?.investment_type || 'one_time',
    recurring_amount: plan?.recurring_amount || undefined,
    investment_frequency: plan?.investment_frequency || undefined,
    custom_assumption_rate: plan?.custom_assumption_rate || undefined,
    scheme_code: plan?.scheme_code || undefined,
    notes: plan?.notes || undefined
  });

  const [durationUnit, setDurationUnit] = useState<'months' | 'years'>(
    plan?.duration_months ? 'months' : 'years'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected asset type details
  const selectedAssetType = assetTypes.find(at => at.id === formData.asset_type_id);
  const isMFAsset = selectedAssetType?.asset_type_code === 'MF';
  const needsRecurringFields = formData.investment_type === 'sip' || formData.investment_type === 'recurring';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.asset_type_id) {
      setError('Please select an asset type');
      return;
    }
    if (!formData.principal_amount || formData.principal_amount <= 0) {
      setError('Principal amount must be greater than 0');
      return;
    }
    if (!formData.start_date) {
      setError('Please select a start date');
      return;
    }
    if (isMFAsset && !formData.scheme_code) {
      setError('Please select a mutual fund scheme');
      return;
    }
    if (needsRecurringFields) {
      if (!formData.recurring_amount || formData.recurring_amount <= 0) {
        setError('Recurring amount is required for SIP/recurring investments');
        return;
      }
      if (!formData.investment_frequency) {
        setError('Please select investment frequency');
        return;
      }
    }

    // Prepare data based on duration unit
    const submitData: CreateInvestmentPlanRequest = {
      ...formData,
      duration_months: durationUnit === 'months' ? formData.duration_months : undefined,
      duration_years: durationUnit === 'years' ? formData.duration_years : undefined
    };

    try {
      setSubmitting(true);
      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.message || 'Failed to save investment plan');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof CreateInvestmentPlanRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loadingTypes || loadingSchemes) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Loader style={{ width: '24px', height: '24px', color: colors.semantic.info, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <p style={{ marginTop: '12px', color: colors.utility.secondaryText }}>Loading...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
          {plan ? 'Edit Investment Plan' : 'Create Investment Plan'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: colors.utility.secondaryText }}
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px',
          backgroundColor: colors.semantic.error + '10',
          border: `1px solid ${colors.semantic.error}30`,
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <AlertCircle style={{ width: '16px', height: '16px', color: colors.semantic.error }} />
          <span style={{ fontSize: '14px', color: colors.semantic.error }}>{error}</span>
        </div>
      )}

      {/* Asset Type Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
          Asset Type *
        </label>
        <select
          value={formData.asset_type_id}
          onChange={(e) => updateField('asset_type_id', parseInt(e.target.value))}
          disabled={!!plan}
          required
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        >
          <option value={0}>Select Asset Type</option>
          {assetTypes.map(at => (
            <option key={at.id} value={at.id}>
              {at.asset_type_name} ({at.asset_type_code})
            </option>
          ))}
        </select>
      </div>

      {/* MF Scheme Selection (only if MF asset type) */}
      {isMFAsset && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
            Mutual Fund Scheme *
          </label>
          <select
            value={formData.scheme_code || ''}
            onChange={(e) => updateField('scheme_code', e.target.value)}
            required={isMFAsset}
            style={{
              width: '100%',
              padding: '10px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px'
            }}
          >
            <option value="">Select Scheme</option>
            {schemes.map(s => (
              <option key={s.scheme_code} value={s.scheme_code}>
                {s.alias_name || s.scheme_name}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
            Only bookmarked schemes are available
          </p>
        </div>
      )}

      {/* Principal Amount */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
          Principal Amount (₹) *
        </label>
        <input
          type="number"
          value={formData.principal_amount}
          onChange={(e) => updateField('principal_amount', parseFloat(e.target.value))}
          min="0"
          step="0.01"
          required
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        />
      </div>

      {/* Investment Type */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
          Investment Type *
        </label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['one_time', 'sip', 'recurring'] as InvestmentType[]).map(type => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="investment_type"
                value={type}
                checked={formData.investment_type === type}
                onChange={(e) => updateField('investment_type', e.target.value as InvestmentType)}
                style={{ accentColor: colors.semantic.info }}
              />
              <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
                {type === 'one_time' ? 'One-time' : type.toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Recurring Fields (if SIP or Recurring) */}
      {needsRecurringFields && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
              Recurring Amount (₹) *
            </label>
            <input
              type="number"
              value={formData.recurring_amount || ''}
              onChange={(e) => updateField('recurring_amount', parseFloat(e.target.value))}
              min="0"
              step="0.01"
              required
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
              Frequency *
            </label>
            <select
              value={formData.investment_frequency || ''}
              onChange={(e) => updateField('investment_frequency', e.target.value as InvestmentFrequency)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px'
              }}
            >
              <option value="">Select Frequency</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </>
      )}

      {/* Start Date */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
          Start Date *
        </label>
        <input
          type="date"
          value={formData.start_date}
          onChange={(e) => updateField('start_date', e.target.value)}
          required
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        />
      </div>

      {/* Has Started Checkbox */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.has_started}
            onChange={(e) => updateField('has_started', e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: colors.semantic.info }}
          />
          <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
            Investment has started
          </span>
        </label>
      </div>

      {/* Duration */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
          Duration
        </label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="number"
            value={durationUnit === 'months' ? (formData.duration_months || '') : (formData.duration_years || '')}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (durationUnit === 'months') {
                updateField('duration_months', value);
                updateField('duration_years', undefined);
              } else {
                updateField('duration_years', value);
                updateField('duration_months', undefined);
              }
            }}
            min="0"
            placeholder="Duration"
            style={{
              flex: 1,
              padding: '10px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px'
            }}
          />
          <select
            value={durationUnit}
            onChange={(e) => setDurationUnit(e.target.value as 'months' | 'years')}
            style={{
              padding: '10px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px'
            }}
          >
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>
      </div>

      {/* Custom Growth Rate */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
          Expected Growth Rate (% per year)
        </label>
        <input
          type="number"
          value={formData.custom_assumption_rate || selectedAssetType?.default_assumption_rate || ''}
          onChange={(e) => updateField('custom_assumption_rate', parseFloat(e.target.value))}
          min="0"
          max="100"
          step="0.01"
          placeholder={`Default: ${selectedAssetType?.default_assumption_rate || 0}%`}
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            fontSize: '14px'
          }}
        />
        {selectedAssetType?.default_assumption_rate && (
          <p style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
            Default rate for {selectedAssetType.asset_type_name}: {selectedAssetType.default_assumption_rate}%
          </p>
        )}
      </div>

      {/* Notes */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
          Notes
        </label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          placeholder="Add any notes about this investment plan..."
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Form Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.utility.primaryText + '10',
            color: colors.utility.primaryText,
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.5 : 1
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: colors.semantic.info,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1
          }}
        >
          {submitting && <Loader style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />}
          <span>{plan ? 'Update' : 'Create'} Investment Plan</span>
        </button>
      </div>
    </form>
  );
};
