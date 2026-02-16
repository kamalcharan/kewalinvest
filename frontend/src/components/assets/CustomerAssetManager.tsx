// frontend/src/components/assets/CustomerAssetManager.tsx
// Component to manage customer investment plans (Release 1.1 - Phase 1)

import React, { useState, useEffect } from 'react';
import { Package, Plus, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useInvestmentPlans } from '../../hooks/useInvestmentPlans';
import { InvestmentPlan, CreateInvestmentPlanRequest } from '../../types/investmentPlan.types';
import { InvestmentPlanForm } from './InvestmentPlanForm';
import { InvestmentPlanCard } from './InvestmentPlanCard';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import { GoalInvestmentAllocationService } from '../../services/goalInvestmentAllocation.service';
import { PortfolioSnapshotService } from '../../services/portfolioSnapshot.service';
import { toastService } from '../../services/toast.service';

// Type for goal allocation info
interface GoalAllocationInfo {
  goal_id: number;
  goal_name: string;
  allocated_percentage: number;
}

interface CustomerAssetManagerProps {
  customerId: number;
}

export const CustomerAssetManager: React.FC<CustomerAssetManagerProps> = ({ customerId }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const { plans, loading, error, createPlan, updatePlan, deletePlan, toggleAlerts } = useInvestmentPlans(customerId);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<InvestmentPlan | null>(null);

  // Snapshot regeneration states
  const [showSnapshotPrompt, setShowSnapshotPrompt] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Goal allocations map: investment_plan_id -> array of goal allocations
  const [goalAllocations, setGoalAllocations] = useState<Record<number, GoalAllocationInfo[]>>({});

  // Fetch goal allocations for all plans
  useEffect(() => {
    const fetchAllocations = async () => {
      if (plans.length === 0) return;

      const allocationsMap: Record<number, GoalAllocationInfo[]> = {};

      await Promise.all(
        plans.map(async (plan) => {
          try {
            const response = await GoalInvestmentAllocationService.getInvestmentGoals(plan.id);
            if (response.success && response.data) {
              allocationsMap[plan.id] = response.data;
            }
          } catch (err) {
            console.error(`Error fetching allocations for plan ${plan.id}:`, err);
          }
        })
      );

      setGoalAllocations(allocationsMap);
    };

    fetchAllocations();
  }, [plans]);

  const handleCreatePlan = async (data: CreateInvestmentPlanRequest) => {
    await createPlan(data);
    setShowForm(false);
    // Show prompt to regenerate snapshots after adding new investment plan
    setShowSnapshotPrompt(true);
  };

  // Handle snapshot regeneration
  // Uses smartBackfill instead of regenerateAll to preserve existing MF NAV-based snapshots
  // regenerateAll drops ALL snapshots first, causing MF values to be recalculated from
  // potentially stale NAV data, leading to incorrect networth values
  const handleConfirmRegenerate = async () => {
    setShowSnapshotPrompt(false);
    setIsRegenerating(true);
    try {
      const response = await PortfolioSnapshotService.smartBackfill([customerId]);
      if (response.success) {
        toastService.success('Snapshots updated successfully! Refreshing page...');
        // Refresh the entire page to show updated charts with latest data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toastService.error(response.error || 'Failed to update snapshots');
        setIsRegenerating(false);
      }
    } catch (error: any) {
      toastService.error('Failed to update snapshots: ' + error.message);
      setIsRegenerating(false);
    }
  };

  const handleSkipRegenerate = () => {
    setShowSnapshotPrompt(false);
    toastService.info('You can regenerate snapshots later from the customer header.');
  };

  const handleUpdatePlan = async (data: CreateInvestmentPlanRequest) => {
    if (!editingPlan) return;
    // Convert CreateInvestmentPlanRequest to UpdateInvestmentPlanRequest (exclude customer_id and asset_type_id)
    const { asset_type_id, ...updateData } = data;
    await updatePlan(editingPlan.id, updateData);
    setEditingPlan(null);
  };

  const handleDeletePlan = async () => {
    if (!deletingPlan) return;
    await deletePlan(deletingPlan.id);
    setDeletingPlan(null);
  };

  const handleToggleAlerts = async (plan: InvestmentPlan) => {
    try {
      await toggleAlerts(plan.id);
    } catch (err) {
      console.error('Error toggling alerts:', err);
    }
  };

  const openEditForm = (plan: InvestmentPlan) => {
    setEditingPlan(plan);
    setShowForm(false);
  };

  const _closeAllForms = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  if (loading && plans.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px'
      }}>
        <Loader style={{ width: '24px', height: '24px', color: colors.semantic.info, animation: 'spin 1s linear infinite' }} />
        <span style={{ marginLeft: '12px', color: colors.utility.secondaryText }}>Loading investment plans...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: colors.semantic.error + '10',
        borderRadius: '12px',
        border: `1px solid ${colors.semantic.error}30`
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: colors.semantic.error,
          marginBottom: '12px'
        }}>
          Error Loading Investment Plans
        </h3>
        <p style={{ fontSize: '14px', color: colors.utility.primaryText, marginBottom: '8px' }}>
          {error}
        </p>
        <p style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '12px' }}>
          Check the browser console for more details.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Package style={{ width: '20px', height: '20px', color: colors.utility.secondaryText }} />
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            margin: 0
          }}>
            Investment Plans
          </h3>
          <span style={{
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            ({plans.length} {plans.length === 1 ? 'plan' : 'plans'})
          </span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          <span>Add Investment Plan</span>
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            minWidth: '800px',
            maxWidth: '1100px',
            width: 'auto'
          }}>
            <InvestmentPlanForm
              customerId={customerId}
              onSubmit={handleCreatePlan}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editingPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            minWidth: '800px',
            maxWidth: '1100px',
            width: 'auto'
          }}>
            <InvestmentPlanForm
              customerId={customerId}
              plan={editingPlan}
              onSubmit={handleUpdatePlan}
              onCancel={() => setEditingPlan(null)}
            />
          </div>
        </div>
      )}

      {/* Investment Plans Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {plans.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '60px 20px',
            color: colors.utility.secondaryText
          }}>
            <Package style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              color: colors.utility.primaryText + '30'
            }} />
            <p style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '8px',
              color: colors.utility.primaryText
            }}>
              No investment plans yet
            </p>
            <p style={{ fontSize: '14px', margin: 0 }}>
              Click "Add Investment Plan" to create your first investment plan
            </p>
          </div>
        ) : (
          plans.map(plan => (
            <InvestmentPlanCard
              key={plan.id}
              plan={plan}
              onEdit={openEditForm}
              onDelete={setDeletingPlan}
              onToggleAlerts={handleToggleAlerts}
              goalAllocations={goalAllocations[plan.id] || []}
            />
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deletingPlan !== null}
        onClose={() => setDeletingPlan(null)}
        onConfirm={handleDeletePlan}
        title="Delete Investment Plan"
        description={`Are you sure you want to delete the investment plan for ${deletingPlan?.asset_type_name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
      />

      {/* Snapshot Update Prompt Modal */}
      <ConfirmationDialog
        isOpen={showSnapshotPrompt}
        onClose={handleSkipRegenerate}
        onConfirm={handleConfirmRegenerate}
        title="Update Portfolio Snapshots"
        description="A new investment plan has been added. To calculate and reflect the data correctly in charts and reports, portfolio snapshots need to be updated. Would you like to update them now?"
        confirmText="Update Now"
        cancelText="Skip for Now"
        type="info"
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
              Updating portfolio snapshots with new investment plan data
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

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
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
