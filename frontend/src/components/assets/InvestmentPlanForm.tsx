// frontend/src/components/assets/InvestmentPlanForm.tsx
// Form component for creating/editing investment plans (Release 1.1 - Phase 1)

import React, { useState, useMemo } from 'react';
import { X, Loader, AlertCircle, Search } from 'lucide-react';
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
  plan?: InvestmentPlan;
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

  const [investmentName, setInvestmentName] = useState(plan?.notes || '');
  const [durationUnit, setDurationUnit] = useState<'months' | 'years'>(
    plan?.duration_months ? 'months' : 'years'
  );
  const [schemeSearch, setSchemeSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAssetType = assetTypes.find(at => at.id === formData.asset_type_id);
  const isMFAsset = selectedAssetType?.asset_type_code === 'MF';
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
      return;
    }
    if (!investmentName.trim()) {
      setError('Please provide a name for this investment');
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

    const submitData: CreateInvestmentPlanRequest = {
      ...formData,
      duration_months: durationUnit === 'months' ? formData.duration_months : undefined,
      duration_years: durationUnit === 'years' ? formData.duration_years : undefined,
      notes: investmentName
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
      <div style={{ padding: '60px', textAlign: 'center', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>
          <Loader style={{ width: '32px', height: '32px', color: colors.brand.primary, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: '16px', color: colors.utility.secondaryText, fontSize: '14px' }}>Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minWidth: '800px',
      maxWidth: '1100px',
      backgroundColor: colors.utility.primaryBackground,
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`
      }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
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
        <div style={{ padding: '24px' }}>
          {/* Error Message */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: colors.semantic.error + '10',
              border: `1px solid ${colors.semantic.error}30`,
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <AlertCircle style={{ width: '18px', height: '18px', color: colors.semantic.error, flexShrink: 0 }} />
              <span style={{ fontSize: '14px', color: colors.semantic.error }}>{error}</span>
            </div>
          )}

          {/* Two Column Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Investment Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '10px' }}>
                  Investment Name *
                </label>
                <input
                  type="text"
                  value={investmentName}
                  onChange={(e) => setInvestmentName(e.target.value)}
                  placeholder="e.g., My SIP in Large Cap Fund"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '8px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Asset Type Selection - Radio Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '10px' }}>
                  Asset Type *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {assetTypes.slice(0, 9).map(at => {
                    const isSelected = formData.asset_type_id === at.id;

                    // Icon mapping for each asset type
                    const getAssetIcon = (code: string) => {
                      const icons: { [key: string]: string } = {
                        'MF': '📊',
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

                    return (
                      <label
                        key={at.id}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '12px',
                          border: `2px solid ${isSelected ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                          borderRadius: '8px',
                          backgroundColor: isSelected ? colors.brand.primary + '15' : colors.utility.secondaryBackground,
                          cursor: plan ? 'not-allowed' : 'pointer',
                          opacity: plan ? 0.6 : 1,
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="radio"
                          name="asset_type"
                          value={at.id}
                          checked={isSelected}
                          onChange={() => !plan && updateField('asset_type_id', at.id)}
                          disabled={!!plan}
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            width: '100%',
                            height: '100%',
                            cursor: plan ? 'not-allowed' : 'pointer',
                            top: 0,
                            left: 0
                          }}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                          {/* Radio Circle Indicator */}
                          <div style={{
                            width: '18px',
                            height: '18px',
                            minWidth: '18px',
                            borderRadius: '50%',
                            border: `2px solid ${isSelected ? colors.brand.primary : colors.utility.secondaryText}`,
                            backgroundColor: colors.utility.primaryBackground,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {isSelected && (
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: colors.brand.primary
                              }} />
                            )}
                          </div>

                          {/* Icon */}
                          <span style={{ fontSize: '20px', lineHeight: 1 }}>
                            {getAssetIcon(at.asset_type_code)}
                          </span>

                          {/* Label and Description */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: isSelected ? colors.brand.primary : colors.utility.primaryText,
                              lineHeight: 1.2,
                              marginBottom: '2px'
                            }}>
                              {at.asset_type_name}
                            </div>
                            <div style={{
                              fontSize: '10px',
                              color: colors.utility.secondaryText,
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {at.asset_type_code}
                            </div>
                          </div>

                          {/* Checkmark when selected */}
                          {isSelected && (
                            <div style={{
                              color: colors.brand.primary,
                              fontSize: '16px',
                              fontWeight: 'bold',
                              lineHeight: 1
                            }}>
                              ✓
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* MF Scheme Selection - Searchable */}
              {isMFAsset && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '10px' }}>
                    Select Mutual Fund Scheme *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '16px',
                      height: '16px',
                      color: colors.utility.secondaryText
                    }} />
                    <input
                      type="text"
                      value={schemeSearch}
                      onChange={(e) => setSchemeSearch(e.target.value)}
                      placeholder="Search schemes..."
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '8px',
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.primaryText,
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div style={{
                    marginTop: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '8px',
                    backgroundColor: colors.utility.secondaryBackground
                  }}>
                    {filteredSchemes.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: colors.utility.secondaryText, fontSize: '13px' }}>
                        No schemes found
                      </div>
                    ) : (
                      filteredSchemes.map(s => (
                        <button
                          key={s.scheme_code}
                          type="button"
                          onClick={() => {
                            updateField('scheme_code', s.scheme_code);
                            setSchemeSearch(s.alias_name || s.scheme_name);
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: 'none',
                            borderBottom: `1px solid ${colors.utility.primaryText}05`,
                            backgroundColor: formData.scheme_code === s.scheme_code ? colors.brand.primary + '10' : 'transparent',
                            color: colors.utility.primaryText,
                            fontSize: '13px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (formData.scheme_code !== s.scheme_code) {
                              e.currentTarget.style.backgroundColor = colors.utility.primaryText + '05';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (formData.scheme_code !== s.scheme_code) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                            {s.alias_name || s.scheme_name}
                          </div>
                          <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                            {s.scheme_code}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Principal Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '10px' }}>
                  Principal Amount (₹) *
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
                    padding: '10px 12px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '8px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Investment Type - Radio Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '10px' }}>
                  Investment Type *
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {(['one_time', 'sip', 'recurring'] as InvestmentType[]).map(type => (
                    <label
                      key={type}
                      style={{
                        flex: 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px',
                        border: `2px solid ${formData.investment_type === type ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                        borderRadius: '8px',
                        backgroundColor: formData.investment_type === type ? colors.brand.primary + '15' : colors.utility.secondaryBackground,
                        color: formData.investment_type === type ? colors.brand.primary : colors.utility.primaryText,
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name="investment_type"
                        value={type}
                        checked={formData.investment_type === type}
                        onChange={() => updateField('investment_type', type)}
                        style={{
                          position: 'absolute',
                          opacity: 0,
                          width: '100%',
                          height: '100%',
                          cursor: 'pointer',
                          top: 0,
                          left: 0
                        }}
                      />
                      {type === 'one_time' ? 'One-time' : type.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>

              {/* Recurring Fields */}
              {needsRecurringFields && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '10px' }}>
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
                        padding: '10px 12px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '8px',
                        backgroundColor: colors.utility.secondaryBackground,
                        color: colors.utility.primaryText,
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '10px' }}>
                      Frequency *
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {(['monthly', 'quarterly', 'yearly'] as InvestmentFrequency[]).map(freq => (
                        <label
                          key={freq}
                          style={{
                            flex: 1,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '10px',
                            border: `2px solid ${formData.investment_frequency === freq ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                            borderRadius: '8px',
                            backgroundColor: formData.investment_frequency === freq ? colors.brand.primary + '15' : colors.utility.secondaryBackground,
                            color: formData.investment_frequency === freq ? colors.brand.primary : colors.utility.primaryText,
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textTransform: 'capitalize'
                          }}
                        >
                          <input
                            type="radio"
                            name="investment_frequency"
                            value={freq}
                            checked={formData.investment_frequency === freq}
                            onChange={() => updateField('investment_frequency', freq)}
                            style={{
                              position: 'absolute',
                              opacity: 0,
                              width: '100%',
                              height: '100%',
                              cursor: 'pointer',
                              top: 0,
                              left: 0
                            }}
                          />
                          {freq}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '10px' }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => updateField('start_date', e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '8px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Duration with End Date Calculation */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '10px' }}>
                  Duration
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                      padding: '10px 12px',
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
                      padding: '10px 12px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      borderRadius: '8px',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
                {calculatedEndDate && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    backgroundColor: colors.semantic.success + '15',
                    border: `1px solid ${colors.semantic.success}30`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: colors.semantic.success,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    📅 Expected End Date: {calculatedEndDate}
                  </div>
                )}
              </div>

              {/* Has Started Checkbox */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px', backgroundColor: colors.utility.secondaryBackground, borderRadius: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.has_started}
                    onChange={(e) => updateField('has_started', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: colors.brand.primary, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: colors.utility.primaryText, fontWeight: '500' }}>
                    Investment has started
                  </span>
                </label>
              </div>

              {/* Expected Growth Rate */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '10px' }}>
                  Expected Growth Rate (% per year)
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
                    padding: '10px 12px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '8px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    fontSize: '14px'
                  }}
                />
                {selectedAssetType?.default_assumption_rate && (
                  <p style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '6px', marginBottom: 0 }}>
                    Default rate for {selectedAssetType.asset_type_name}: {selectedAssetType.default_assumption_rate}%
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
          padding: '16px 24px',
          borderTop: `1px solid ${colors.utility.primaryText}10`,
          backgroundColor: colors.utility.secondaryBackground
        }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              padding: '10px 24px',
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
              padding: '10px 24px',
              backgroundColor: colors.brand.primary,
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
            <span>{plan ? 'Update' : 'Create'} Investment</span>
          </button>
        </div>
      </form>
    </div>
  );
};
