// frontend/src/components/customers/CustomerViewHeader.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft as ArrowLeftIcon, Star as StarIcon, Download as DownloadIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import FamilyMembersPopover from './FamilyMembersPopover';
import { IndividualFamilySwitch } from './IndividualFamilySwitch';
import type { CustomerWithContact } from '../../types/customer.types';
import type { CustomerPortfolioResponse } from '../../types/portfolio.types';

interface CustomerViewHeaderProps {
  customer: CustomerWithContact;
  portfolio: CustomerPortfolioResponse | null;
  customerId: number;
  onExportReport?: () => void;
  // Family view props
  viewMode?: 'individual' | 'family';
  onViewModeChange?: (mode: 'individual' | 'family') => void;
}

export const CustomerViewHeader: React.FC<CustomerViewHeaderProps> = ({
  customer,
  portfolio,
  customerId,
  onExportReport,
  viewMode = 'individual',
  onViewModeChange
}) => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const returnPercentage = portfolio?.summary.return_percentage ?? 0;
  const isFamilyAccount = !!customer.family_code;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${colors.brand.primary}15 0%, ${colors.brand.secondary}10 100%)`,
      borderBottom: `1px solid ${colors.utility.primaryText}10`,
      padding: '16px 24px' // Reduced from 24px (33% reduction)
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Back Button */}
        <button
          onClick={() => navigate('/customers')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px', // Reduced from 8px 12px
            marginBottom: '12px', // Reduced from 20px
            backgroundColor: colors.utility.secondaryBackground,
            border: 'none',
            borderRadius: '8px',
            color: colors.utility.primaryText,
            cursor: 'pointer',
            fontSize: '13px' // Reduced from 14px
          }}
        >
          <ArrowLeftIcon size={16} /> Back to Customers
        </button>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center', // Changed from flex-start for tighter layout
          gap: '16px'
        }}>
          {/* Left: Customer Info */}
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontSize: '26px', // Reduced from 32px
              fontWeight: '700',
              color: colors.utility.primaryText,
              display: 'flex',
              alignItems: 'center',
              gap: '10px', // Reduced from 12px
              margin: 0,
              marginBottom: '6px' // Reduced from 8px
            }}>
              {customer.prefix} {customer.name}
              {returnPercentage > 10 && (
                <span style={{ color: '#FCD34D' }}><StarIcon size={20} /></span>
              )}
            </h1>

            <div style={{
              display: 'flex',
              gap: '20px', // Reduced from 24px
              fontSize: '13px', // Reduced from 14px
              color: colors.utility.secondaryText,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <span>ID: {customer.id}</span>
              {customer.iwell_code && <span>IWell: {customer.iwell_code}</span>}

              {/* Family Badge */}
              {customer.family_code && (
                <FamilyMembersPopover
                  familyCode={customer.family_code}
                  isFamilyHead={customer.is_family_head || false}
                >
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 8px', // Reduced from 4px 10px
                    backgroundColor: colors.brand.secondary + '15',
                    color: colors.brand.secondary,
                    borderRadius: '6px',
                    fontSize: '11px', // Reduced from 12px
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.brand.secondary + '25';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.brand.secondary + '15';
                  }}
                  >
                    {customer.is_family_head
                      ? `Family Head: ${customer.family_code}`
                      : `Family: ${customer.family_code}`
                    }
                  </span>
                </FamilyMembersPopover>
              )}

              {portfolio && <span>Schemes: {portfolio.summary.total_schemes ?? 0}</span>}
              <span>Member Since: 2016</span>
            </div>
          </div>

          {/* Right: Actions & Switch */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexShrink: 0
          }}>
            {/* Individual/Family Switch - Only for family accounts */}
            {isFamilyAccount && onViewModeChange && (
              <IndividualFamilySwitch
                mode={viewMode}
                onChange={onViewModeChange}
              />
            )}

            <button
              onClick={onExportReport}
              style={{
                padding: '8px 14px', // Reduced from 10px 16px
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px' // Reduced from 14px
              }}
            >
              <DownloadIcon size={16} /> Export
            </button>

            <button
              onClick={() => navigate(`/customers/${customerId}/edit`)}
              style={{
                padding: '8px 16px', // Reduced from 10px 20px
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '13px' // Reduced from 14px
              }}
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
