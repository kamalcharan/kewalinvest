// frontend/src/components/assets/CustomerAssetManager.tsx
// Component to manage customer investment plans (Release 1.1 - Phase 1)

import React, { useState } from 'react';
import { Package, Plus, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useInvestmentPlans } from '../../hooks/useInvestmentPlans';
import { InvestmentPlan, CreateInvestmentPlanRequest } from '../../types/investmentPlan.types';
import { InvestmentPlanForm } from './InvestmentPlanForm';
import { InvestmentPlanCard } from './InvestmentPlanCard';
import ConfirmationDialog from '../ui/ConfirmationDialog';

interface CustomerAssetManagerProps {
  customerId: number;
}

export const CustomerAssetManager: React.FC<CustomerAssetManagerProps> = ({ customerId }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const { plans, loading, error, createPlan, updatePlan, deletePlan } = useInvestmentPlans(customerId);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<InvestmentPlan | null>(null);

  const handleCreatePlan = async (data: CreateInvestmentPlanRequest) => {
    await createPlan(data);
    setShowForm(false);
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

  const openEditForm = (plan: InvestmentPlan) => {
    setEditingPlan(plan);
    setShowForm(false);
  };

  const closeAllForms = () => {
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
            backgroundColor: colors.semantic.info,
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
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
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
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
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
    </div>
  );
};
