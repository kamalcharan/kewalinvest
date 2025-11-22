// frontend/src/components/assets/InvestmentPlanCard.tsx
// Card component for displaying investment plans with calculations (Release 1.1 - Phase 1)

import React from 'react';
import { Edit2, Trash2, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { InvestmentPlan, calculateInvestmentValue } from '../../types/investmentPlan.types';

interface InvestmentPlanCardProps {
  plan: InvestmentPlan;
  onEdit: (plan: InvestmentPlan) => void;
  onDelete: (plan: InvestmentPlan) => void;
}

export const InvestmentPlanCard: React.FC<InvestmentPlanCardProps> = ({
  plan,
  onEdit,
  onDelete
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Calculate current value and metrics
  const calculations = calculateInvestmentValue(plan);
  const isGain = calculations.gain_loss >= 0;

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}10`,
        borderRadius: '12px',
        padding: '20px',
        transition: 'box-shadow 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                backgroundColor: colors.utility.primaryText + '10',
                padding: '4px 8px',
                borderRadius: '4px',
                color: colors.utility.primaryText,
                fontWeight: '600'
              }}
            >
              {plan.asset_type_code}
            </span>
            {!plan.has_started && (
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: colors.semantic.warning + '20',
                  color: colors.semantic.warning,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: '600'
                }}
              >
                NOT STARTED
              </span>
            )}
          </div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText, margin: '0 0 4px 0' }}>
            {plan.asset_type_name}
          </h4>
          {plan.scheme_name && (
            <p style={{ fontSize: '13px', color: colors.utility.secondaryText, margin: 0 }}>
              {plan.scheme_alias_name || plan.scheme_name}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onEdit(plan)}
            style={{
              padding: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.semantic.info,
              display: 'flex',
              alignItems: 'center',
              transition: 'opacity 0.2s'
            }}
            title="Edit investment plan"
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Edit2 style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            onClick={() => onDelete(plan)}
            style={{
              padding: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.semantic.error,
              display: 'flex',
              alignItems: 'center',
              transition: 'opacity 0.2s'
            }}
            title="Delete investment plan"
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Trash2 style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      {/* Investment Type Badge */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '12px',
            backgroundColor: colors.semantic.info + '20',
            color: colors.semantic.info,
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: '600'
          }}
        >
          {plan.investment_type === 'one_time' ? 'One-time' : plan.investment_type.toUpperCase()}
        </span>
        {plan.investment_frequency && (
          <span
            style={{
              fontSize: '12px',
              backgroundColor: colors.utility.primaryText + '10',
              color: colors.utility.primaryText,
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            {plan.investment_frequency.charAt(0).toUpperCase() + plan.investment_frequency.slice(1)}
          </span>
        )}
      </div>

      {/* Investment Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {/* Principal */}
        <div>
          <p style={{ fontSize: '11px', color: colors.utility.secondaryText, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Principal
          </p>
          <p style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
            {formatCurrency(plan.principal_amount)}
          </p>
        </div>

        {/* Current Value */}
        <div>
          <p style={{ fontSize: '11px', color: colors.utility.secondaryText, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Current Value
          </p>
          <p style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
            {formatCurrency(calculations.current_value)}
          </p>
        </div>

        {/* Total Invested (for SIP/Recurring) */}
        {(plan.investment_type === 'sip' || plan.investment_type === 'recurring') && (
          <div>
            <p style={{ fontSize: '11px', color: colors.utility.secondaryText, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Invested
            </p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
              {formatCurrency(calculations.total_invested)}
            </p>
          </div>
        )}

        {/* Recurring Amount (for SIP/Recurring) */}
        {plan.recurring_amount && (
          <div>
            <p style={{ fontSize: '11px', color: colors.utility.secondaryText, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recurring Amount
            </p>
            <p style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
              {formatCurrency(plan.recurring_amount)}
            </p>
          </div>
        )}
      </div>

      {/* Gain/Loss */}
      {plan.has_started && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            backgroundColor: isGain ? colors.semantic.success + '10' : colors.semantic.error + '10',
            borderRadius: '8px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isGain ? (
              <TrendingUp style={{ width: '18px', height: '18px', color: colors.semantic.success }} />
            ) : (
              <TrendingDown style={{ width: '18px', height: '18px', color: colors.semantic.error }} />
            )}
            <span style={{ fontSize: '14px', fontWeight: '600', color: isGain ? colors.semantic.success : colors.semantic.error }}>
              {isGain ? 'Gain' : 'Loss'}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '16px', fontWeight: '600', color: isGain ? colors.semantic.success : colors.semantic.error, margin: 0 }}>
              {formatCurrency(Math.abs(calculations.gain_loss))}
            </p>
            <p style={{ fontSize: '12px', color: isGain ? colors.semantic.success : colors.semantic.error, margin: 0 }}>
              {formatPercentage(calculations.gain_loss_percentage)}
            </p>
          </div>
        </div>
      )}

      {/* Additional Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: `1px solid ${colors.utility.primaryText}10` }}>
        {/* Start Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar style={{ width: '14px', height: '14px', color: colors.utility.secondaryText }} />
          <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
            Start: {new Date(plan.start_date).toLocaleDateString()}
          </span>
        </div>

        {/* Duration */}
        {(plan.duration_months || plan.duration_years) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign style={{ width: '14px', height: '14px', color: colors.utility.secondaryText }} />
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
              Duration: {plan.duration_months ? `${plan.duration_months} months` : `${plan.duration_years} years`}
            </span>
          </div>
        )}

        {/* Expected Growth Rate */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp style={{ width: '14px', height: '14px', color: colors.semantic.success }} />
          <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
            Growth: {calculations.effective_growth_rate}% / year
          </span>
        </div>

        {/* Elapsed Time (if started) */}
        {plan.has_started && calculations.years_elapsed > 0 && (
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
            Elapsed: {calculations.years_elapsed} years ({calculations.months_elapsed} months)
          </div>
        )}
      </div>

      {/* Notes */}
      {plan.notes && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            backgroundColor: colors.utility.primaryText + '05',
            borderRadius: '6px',
            fontSize: '13px',
            color: colors.utility.secondaryText,
            fontStyle: 'italic'
          }}
        >
          {plan.notes}
        </div>
      )}
    </div>
  );
};
