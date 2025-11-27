// frontend/src/components/customers/CustomerViewHeader.tsx
// UPDATED: Added snapshot status tag and regenerate button
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft as ArrowLeftIcon, Star as StarIcon, Calendar as CalendarIcon, Target as TargetIcon, Bell as BellIcon, RefreshCw as RefreshIcon, Database as DatabaseIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import FamilyMembersPopover from './FamilyMembersPopover';
import { IndividualFamilySwitch } from './IndividualFamilySwitch';
import { PortfolioSnapshotService } from '../../services/portfolioSnapshot.service';
import { toastService } from '../../services/toast.service';
import type { CustomerWithContact } from '../../types/customer.types';
import type { CustomerPortfolioResponse } from '../../types/portfolio.types';

interface CustomerViewHeaderProps {
  customer: CustomerWithContact;
  portfolio: CustomerPortfolioResponse | null;
  customerId: number;
  onNewGoal?: () => void;
  onMeeting?: () => void;
  onNewAlert?: () => void;
  // Family view props
  viewMode?: 'individual' | 'family';
  onViewModeChange?: (mode: 'individual' | 'family') => void;
}

export const CustomerViewHeader: React.FC<CustomerViewHeaderProps> = ({
  customer,
  portfolio,
  customerId,
  onNewGoal,
  onMeeting,
  onNewAlert,
  viewMode = 'individual',
  onViewModeChange
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const returnPercentage = portfolio?.summary.return_percentage ?? 0;
  const isFamilyAccount = !!customer.family_code;

  // Snapshot status state
  const [snapshotStatus, setSnapshotStatus] = useState<{
    latest_snapshot_date: string | null;
    total_snapshots: number;
    has_snapshots: boolean;
  } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Fetch snapshot status on mount
  useEffect(() => {
    const fetchSnapshotStatus = async () => {
      try {
        const response = await PortfolioSnapshotService.getCustomerSnapshotStatus(customerId);
        if (response.success && response.data) {
          setSnapshotStatus(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch snapshot status:', error);
      }
    };

    if (customerId) {
      fetchSnapshotStatus();
    }
  }, [customerId]);

  // Handle regenerate snapshots for this customer
  const handleRegenerateSnapshots = async () => {
    if (isRegenerating) return;

    const confirmed = window.confirm(
      `This will regenerate all portfolio snapshots for ${customer.name}. Continue?`
    );
    if (!confirmed) return;

    setIsRegenerating(true);
    try {
      const response = await PortfolioSnapshotService.regenerateAllSnapshots([customerId]);
      if (response.success) {
        toastService.success('Snapshot regeneration started. This may take a few minutes.');
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['networth'] });
        queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      } else {
        toastService.error(response.error || 'Failed to start snapshot regeneration');
      }
    } catch (error: any) {
      toastService.error('Failed to regenerate snapshots: ' + error.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Format date for display
  const formatSnapshotDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

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

              {/* Snapshot Status Tag */}
              {snapshotStatus && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  backgroundColor: snapshotStatus.has_snapshots
                    ? colors.semantic.success + '15'
                    : colors.semantic.warning + '15',
                  color: snapshotStatus.has_snapshots
                    ? colors.semantic.success
                    : colors.semantic.warning,
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '500'
                }}>
                  <DatabaseIcon size={12} />
                  <span>
                    Snapshots: {formatSnapshotDate(snapshotStatus.latest_snapshot_date)}
                  </span>
                  <button
                    onClick={handleRegenerateSnapshots}
                    disabled={isRegenerating}
                    title="Regenerate snapshots for this customer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isRegenerating ? 'not-allowed' : 'pointer',
                      color: 'inherit',
                      opacity: isRegenerating ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isRegenerating) {
                        e.currentTarget.style.backgroundColor = snapshotStatus.has_snapshots
                          ? colors.semantic.success + '30'
                          : colors.semantic.warning + '30';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <RefreshIcon
                      size={12}
                      style={{
                        animation: isRegenerating ? 'spin 1s linear infinite' : 'none'
                      }}
                    />
                  </button>
                </div>
              )}
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
              onClick={onMeeting || (() => navigate('/meetings'))}
              style={{
                padding: '8px 14px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
              }}
            >
              <CalendarIcon size={16} /> Meeting
            </button>

            {/* New Alert Button */}
            <button
              onClick={onNewAlert}
              style={{
                padding: '8px 14px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.semantic.warning}40`,
                borderRadius: '8px',
                color: colors.semantic.warning,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.semantic.warning + '15';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
              }}
            >
              <BellIcon size={16} /> New Alert
            </button>

            <button
              onClick={onNewGoal}
              style={{
                padding: '8px 16px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <TargetIcon size={16} /> New Goal
            </button>
          </div>
        </div>
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
