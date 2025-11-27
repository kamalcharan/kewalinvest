// frontend/src/components/customers/CustomerViewHeader.tsx
// UPDATED: Added snapshot status tag and regenerate button with ConfirmationDialog
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft as ArrowLeftIcon, Star as StarIcon, Calendar as CalendarIcon, Target as TargetIcon, Bell as BellIcon, RefreshCw as RefreshIcon, Database as DatabaseIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import FamilyMembersPopover from './FamilyMembersPopover';
import { IndividualFamilySwitch } from './IndividualFamilySwitch';
import { PortfolioSnapshotService } from '../../services/portfolioSnapshot.service';
import { toastService } from '../../services/toast.service';
import ConfirmationDialog from '../ui/ConfirmationDialog';
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
    last_generated_at: string | null;
    total_snapshots: number;
    has_snapshots: boolean;
  } | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

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
  const handleRegenerateClick = () => {
    if (isRegenerating) return;
    setShowRegenerateDialog(true);
  };

  const handleConfirmRegenerate = async () => {
    setShowRegenerateDialog(false);
    setIsRegenerating(true);
    try {
      const response = await PortfolioSnapshotService.regenerateAllSnapshots([customerId]);
      if (response.success) {
        toastService.success('Snapshots regenerated successfully! Refreshing page...');
        // Refresh the entire page to show updated charts with latest data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toastService.error(response.error || 'Failed to regenerate snapshots');
        setIsRegenerating(false);
      }
    } catch (error: any) {
      toastService.error('Failed to regenerate snapshots: ' + error.message);
      setIsRegenerating(false);
    }
    // Note: Don't setIsRegenerating(false) on success since we're reloading the page
  };

  // Format generation timestamp for display (shows date and time)
  const formatGeneratedAt = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
                    Last generated: {formatGeneratedAt(snapshotStatus.last_generated_at)}
                  </span>
                  <button
                    onClick={handleRegenerateClick}
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

      {/* Regenerate Snapshots Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRegenerateDialog}
        onClose={() => setShowRegenerateDialog(false)}
        onConfirm={handleConfirmRegenerate}
        title="Regenerate Snapshots"
        description={`This will regenerate all portfolio snapshots for ${customer.name}. This operation may take a few minutes. Do you want to continue?`}
        confirmText="Regenerate"
        cancelText="Cancel"
        type="warning"
      />

      {/* Processing Modal - Shows during snapshot regeneration */}
      {isRegenerating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '16px',
            padding: '40px 48px',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '400px'
          }}>
            {/* Animated Spinner */}
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 24px',
              border: `4px solid ${colors.brand.primary}20`,
              borderTop: `4px solid ${colors.brand.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />

            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: '0 0 12px 0'
            }}>
              Calculating Snapshots
            </h3>

            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: '0 0 8px 0',
              lineHeight: '1.5'
            }}>
              Regenerating portfolio snapshots for <strong>{customer.name}</strong>
            </p>

            <p style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              margin: 0,
              opacity: 0.8
            }}>
              Please wait, this may take a few moments...
            </p>

            {/* Animated dots */}
            <div style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'center',
              gap: '6px'
            }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: colors.brand.primary,
                    borderRadius: '50%',
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Additional CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
