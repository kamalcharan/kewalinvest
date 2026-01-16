// frontend/src/components/assets/InvestmentPlanForm.tsx
// Form component for creating/editing investment plans (Release 1.1 - Phase 1)
// Updated: 3-column layout, consistent radio button style, fixed modal height

import React, { useState, useMemo } from 'react';
import { X, Loader, AlertCircle, Search, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAssetTypes } from '../../hooks/useAssetTypes';
import { useBookmarkedSchemes } from '../../hooks/useInvestmentPlans';
import toastService from '../../services/toast.service';
import {
  InvestmentPlan,
  CreateInvestmentPlanRequest,
  InvestmentType,
  InvestmentFrequency
} from '../../types/investmentPlan.types';

interface InvestmentPlanFormProps {
  customerId: number;
  plan?: InvestmentPlan;
  onSubmit: (data: CreateInvestmentPlanRequest) => Promise<void>;
  onCancel: () => void;
}

// Asset type icon mapping
// Note: MF replaced with scheme-based types (Open Ended, Close Ended, Interval Fund)
const getAssetIcon = (code: string): string => {
  const icons: { [key: string]: string } = {
    'Open Ended': '📊',
    'Close Ended': '📅',
    'Interval Fund': '⏰',
    'GOLD': '🪙',
    'EQUITY': '📈',
    'FD': '🏦',
    'PPF': '🏛️',
    'EPF': '💼',
    'NPS': '🎯',
    'REAL_ESTATE': '🏠',
    'INSURANCE': '🛡️'
  };
  return icons[code] || '💰';
};

// Investment type icons
const getInvestmentTypeIcon = (type: InvestmentType): string => {
  const icons: { [key in InvestmentType]: string } = {
    'one_time': '💵',
    'sip': '🔄',
    'recurring': '📆'
  };
  return icons[type];
};

// Frequency icons
const getFrequencyIcon = (freq: InvestmentFrequency): string => {
  const icons: { [key in InvestmentFrequency]: string } = {
    'monthly': '📅',
    'quarterly': '📊',
    'yearly': '🗓️'
  };
  return icons[freq];
};

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

  const [investmentName, setInvestmentName] = useState(plan?.notes || '');
  const [durationUnit, setDurationUnit] = useState<'months' | 'years'>(
    plan?.duration_months ? 'months' : 'years'
  );
  const [schemeSearch, setSchemeSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAssetType = assetTypes.find(at => at.id === formData.asset_type_id);
  // Scheme-based asset types (replaces single 'MF' check)
  const schemeAssetTypes = ['Open Ended', 'Close Ended', 'Interval Fund'];
  const isSchemeAsset = selectedAssetType ? schemeAssetTypes.includes(selectedAssetType.asset_type_code) : false;
  const needsRecurringFields = formData.investment_type === 'sip' || formData.investment_type === 'recurring';

  // Filter schemes based on search
  const filteredSchemes = useMemo(() => {
    if (!schemeSearch) return schemes;
    const search = schemeSearch.toLowerCase();
    return schemes.filter(s =>
      (s.alias_name || s.scheme_name).toLowerCase().includes(search) ||
      s.scheme_code.toLowerCase().includes(search)
    );
  }, [schemes, schemeSearch]);

  // Calculate end date
  const calculatedEndDate = useMemo(() => {
    if (!formData.start_date) return null;
    const startDate = new Date(formData.start_date);
    if (isNaN(startDate.getTime())) return null;

    const duration = durationUnit === 'months' ? formData.duration_months : formData.duration_years;
    if (!duration || duration <= 0) return null;

    const endDate = new Date(startDate);
    if (durationUnit === 'months') {
      endDate.setMonth(endDate.getMonth() + duration);
    } else {
      endDate.setFullYear(endDate.getFullYear() + duration);
    }

    return endDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  }, [formData.start_date, formData.duration_months, formData.duration_years, durationUnit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.asset_type_id) {
      setError('Please select an asset type');
      toastService.error('Please select an asset type');
      return;
    }
    if (!investmentName.trim()) {
      setError('Please provide a name for this investment');
      toastService.error('Please provide a name for this investment');
      return;
    }
    if (!formData.principal_amount || formData.principal_amount <= 0) {
      setError('Principal amount must be greater than 0');
      toastService.error('Principal amount must be greater than 0');
      return;
    }
    if (!formData.start_date) {
      setError('Please select a start date');
      toastService.error('Please select a start date');
      return;
    }
    if (isSchemeAsset && !formData.scheme_code) {
      setError('Please select a mutual fund scheme');
      toastService.error('Please select a mutual fund scheme');
      return;
    }
    if (needsRecurringFields) {
      if (!formData.recurring_amount || formData.recurring_amount <= 0) {
        setError('Recurring amount is required for SIP/recurring investments');
        toastService.error('Recurring amount is required for SIP/recurring investments');
        return;
      }
      if (!formData.investment_frequency) {
        setError('Please select investment frequency');
        toastService.error('Please select investment frequency');
        return;
      }
    }

    const submitData: CreateInvestmentPlanRequest = {
      ...formData,
      duration_months: durationUnit === 'months' ? formData.duration_months : undefined,
      duration_years: durationUnit === 'years' ? formData.duration_years : undefined,
      notes: investmentName
    };

    try {
      setSubmitting(true);
      await onSubmit(submitData);
      toastService.success(plan ? 'Investment plan updated!' : 'Investment plan created!');
    } catch (err: any) {
      const errMsg = err.message || 'Failed to save investment plan';
      setError(errMsg);
      toastService.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof CreateInvestmentPlanRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loadingTypes || loadingSchemes) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>
          <Loader style={{ width: '32px', height: '32px', color: colors.brand.primary, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: '16px', color: colors.utility.secondaryText, fontSize: '14px' }}>Loading form data...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Styled Radio Button Component
  const StyledRadioButton = ({
    selected,
    label,
    sublabel,
    icon,
    onClick,
    disabled = false
  }: {
    selected: boolean;
    label: string;
    sublabel?: string;
    icon: string;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <div
      onClick={() => !disabled && onClick()}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 12px',
        border: `2px solid ${selected ? colors.brand.primary : colors.utility.primaryText + '20'}`,
        borderRadius: '8px',
        backgroundColor: selected ? colors.brand.primary + '15' : colors.utility.secondaryBackground,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s',
        gap: '10px'
      }}
    >
      {/* Radio Circle */}
      <div style={{
        width: '18px',
        height: '18px',
        minWidth: '18px',
        borderRadius: '50%',
        border: `2px solid ${selected ? colors.brand.primary : colors.utility.secondaryText}`,
        backgroundColor: colors.utility.primaryBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {selected && (
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: colors.brand.primary
          }} />
        )}
      </div>

      {/* Icon */}
      <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>

      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: '600',
          color: selected ? colors.brand.primary : colors.utility.primaryText,
          lineHeight: 1.2
        }}>
          {label}
        </div>
        {sublabel && (
          <div style={{ fontSize: '10px', color: colors.utility.secondaryText, lineHeight: 1.2 }}>
            {sublabel}
          </div>
        )}
      </div>

      {/* Checkmark */}
      {selected && (
        <Check size={16} color={colors.brand.primary} strokeWidth={3} />
      )}
    </div>
  );

  return (
    <div style={{
      width: '1100px',
      maxWidth: '95vw',
      backgroundColor: colors.utility.primaryBackground,
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
          {plan ? 'Edit Investment Plan' : 'Create New Investment Plan'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.utility.secondaryText,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X style={{ width: '20px', height: '20px' }} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 24px' }}>
          {/* Error Message */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: colors.semantic.error + '10',
              border: `1px solid ${colors.semantic.error}30`,
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <AlertCircle style={{ width: '16px', height: '16px', color: colors.semantic.error, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: colors.semantic.error }}>{error}</span>
            </div>
          )}

          {/* 3-Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 1fr', gap: '20px' }}>

            {/* COLUMN 1: Asset Type Selection (Light Primary Card) */}
            <div style={{
              padding: '16px',
              backgroundColor: colors.brand.primary + '08',
              borderRadius: '12px',
              border: `1px solid ${colors.brand.primary}20`
            }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '700',
                color: colors.brand.primary,
                marginBottom: '12px'
              }}>
                Select Asset Type *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {assetTypes.slice(0, 9).map(at => {
                  const isSelected = formData.asset_type_id === at.id;
                  return (
                    <StyledRadioButton
                      key={at.id}
                      selected={isSelected}
                      label={at.asset_type_name}
                      sublabel={at.asset_type_code}
                      icon={getAssetIcon(at.asset_type_code)}
                      onClick={() => updateField('asset_type_id', at.id)}
                      disabled={!!plan}
                    />
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2: Investment Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Investment Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                  Investment Name *
                </label>
                <input
                  type="text"
                  value={investmentName}
                  onChange={(e) => setInvestmentName(e.target.value)}
                  placeholder="e.g., My Gold Investment"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '6px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* MF Scheme Selection */}
              {isSchemeAsset && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                    Mutual Fund Scheme *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '14px',
                      height: '14px',
                      color: colors.utility.secondaryText
                    }} />
                    <input
                      type="text"
                      value={schemeSearch}
                      onChange={(e) => setSchemeSearch(e.target.value)}
                      placeholder="Search schemes..."
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 32px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '6px',
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.primaryText,
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div style={{
                    marginTop: '6px',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '6px',
                    backgroundColor: colors.utility.secondaryBackground
                  }}>
                    {filteredSchemes.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: colors.utility.secondaryText, fontSize: '12px' }}>
                        No schemes found
                      </div>
                    ) : (
                      filteredSchemes.slice(0, 10).map(s => (
                        <button
                          key={s.scheme_code}
                          type="button"
                          onClick={() => {
                            updateField('scheme_code', s.scheme_code);
                            setSchemeSearch(s.alias_name || s.scheme_name);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            border: 'none',
                            borderBottom: `1px solid ${colors.utility.primaryText}05`,
                            backgroundColor: formData.scheme_code === s.scheme_code ? colors.brand.primary + '10' : 'transparent',
                            color: colors.utility.primaryText,
                            fontSize: '12px',
                            textAlign: 'left',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '2px' }}>{s.alias_name || s.scheme_name}</div>
                          <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>{s.scheme_code}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Principal Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                  Principal Amount (INR) *
                </label>
                <input
                  type="number"
                  value={formData.principal_amount || ''}
                  onChange={(e) => updateField('principal_amount', parseFloat(e.target.value))}
                  min="0"
                  step="0.01"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '6px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Investment Type */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                  Investment Type *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {(['one_time', 'sip', 'recurring'] as InvestmentType[]).map(type => (
                    <StyledRadioButton
                      key={type}
                      selected={formData.investment_type === type}
                      label={type === 'one_time' ? 'One-time' : type.toUpperCase()}
                      icon={getInvestmentTypeIcon(type)}
                      onClick={() => updateField('investment_type', type)}
                    />
                  ))}
                </div>
              </div>

              {/* Recurring Fields */}
              {needsRecurringFields && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                      Recurring Amount (INR) *
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
                        padding: '8px 12px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '6px',
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.primaryText,
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                      Frequency *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {(['monthly', 'quarterly', 'yearly'] as InvestmentFrequency[]).map(freq => (
                        <StyledRadioButton
                          key={freq}
                          selected={formData.investment_frequency === freq}
                          label={freq.charAt(0).toUpperCase() + freq.slice(1)}
                          icon={getFrequencyIcon(freq)}
                          onClick={() => updateField('investment_frequency', freq)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* COLUMN 3: Duration & Settings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => updateField('start_date', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '6px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Duration */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                  Duration
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    value={durationUnit === 'months' ? (formData.duration_months || '') : (formData.duration_years || '')}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
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
                      padding: '8px 12px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      borderRadius: '6px',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: '13px'
                    }}
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value as 'months' | 'years')}
                    style={{
                      padding: '8px 12px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      borderRadius: '6px',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                {calculatedEndDate && (
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 10px',
                    backgroundColor: colors.semantic.success + '15',
                    border: `1px solid ${colors.semantic.success}30`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: colors.semantic.success,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    End Date: {calculatedEndDate}
                  </div>
                )}
              </div>

              {/* Has Started */}
              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '10px 12px',
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '6px',
                  border: `1px solid ${colors.utility.primaryText}10`
                }}>
                  <input
                    type="checkbox"
                    checked={formData.has_started}
                    onChange={(e) => updateField('has_started', e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: colors.brand.primary, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: colors.utility.primaryText, fontWeight: '500' }}>
                    Investment has started
                  </span>
                </label>
              </div>

              {/* Expected Growth Rate */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '6px' }}>
                  Expected Growth Rate (%)
                </label>
                <input
                  type="number"
                  value={formData.custom_assumption_rate || selectedAssetType?.default_assumption_rate || ''}
                  onChange={(e) => updateField('custom_assumption_rate', parseFloat(e.target.value))}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder={selectedAssetType?.default_assumption_rate ? `Default: ${selectedAssetType.default_assumption_rate}%` : 'Enter rate'}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '6px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '13px'
                  }}
                />
                {selectedAssetType?.default_assumption_rate && (
                  <p style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '4px', marginBottom: 0 }}>
                    Default: {selectedAssetType.default_assumption_rate}% for {selectedAssetType.asset_type_name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '14px 24px',
          borderTop: `1px solid ${colors.utility.primaryText}10`,
          backgroundColor: colors.utility.secondaryBackground
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.utility.primaryText + '10',
              color: colors.utility.primaryText,
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
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
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting && <Loader style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />}
            <span>{plan ? 'Update' : 'Create'} Investment</span>
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
