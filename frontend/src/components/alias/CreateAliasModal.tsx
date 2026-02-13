// frontend/src/components/alias/CreateAliasModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Link2, Star, Info } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCreateAlias } from '../../hooks/useAlias';
import { toastService } from '../../services/toast.service';

interface CustomerForAlias {
  id: number;
  name: string;
  iwell_code?: string;
  email?: string;
  current_value?: number;
}

interface CreateAliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomers: CustomerForAlias[];
  onSuccess?: () => void;
}

export const CreateAliasModal: React.FC<CreateAliasModalProps> = ({
  isOpen,
  onClose,
  selectedCustomers,
  onSuccess
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [aliasName, setAliasName] = useState('');
  const [description, setDescription] = useState('');
  const [primaryCustomerId, setPrimaryCustomerId] = useState<number | null>(null);

  const createAliasMutation = useCreateAlias();

  // Set default primary customer when modal opens
  useEffect(() => {
    if (isOpen && selectedCustomers.length > 0) {
      // Default to first customer or one with highest value
      const defaultPrimary = selectedCustomers.reduce((prev, curr) =>
        (curr.current_value || 0) > (prev.current_value || 0) ? curr : prev
      );
      setPrimaryCustomerId(defaultPrimary.id);

      // Suggest alias name based on primary customer
      setAliasName(`${defaultPrimary.name} Combined`);
    }
  }, [isOpen, selectedCustomers]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAliasName('');
      setDescription('');
      setPrimaryCustomerId(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!aliasName.trim()) {
      toastService.error('Please enter an alias name');
      return;
    }

    if (!primaryCustomerId) {
      toastService.error('Please select a primary customer');
      return;
    }

    if (selectedCustomers.length < 2) {
      toastService.error('At least 2 customers are required for an alias');
      return;
    }

    try {
      await createAliasMutation.mutateAsync({
        alias_name: aliasName.trim(),
        description: description.trim() || undefined,
        customer_ids: selectedCustomers.map(c => c.id),
        primary_customer_id: primaryCustomerId
      });

      toastService.success('Alias created successfully');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toastService.error(error.message || 'Failed to create alias');
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
    return `${value.toLocaleString('en-IN')}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${colors.utility.primaryText}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: colors.brand.primary + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Link2 size={20} color={colors.brand.primary} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
                Create Alias
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: colors.utility.secondaryText }}>
                Combine {selectedCustomers.length} customer profiles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              color: colors.utility.secondaryText
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Info Banner */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: colors.brand.primary + '10',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}
          >
            <Info size={18} color={colors.brand.primary} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: colors.utility.secondaryText, lineHeight: '1.5' }}>
              An alias virtually combines multiple customer records for viewing aggregated data.
              Individual customer records remain unchanged.
            </div>
          </div>

          {/* Alias Name Input */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}
            >
              Alias Name *
            </label>
            <input
              type="text"
              value={aliasName}
              onChange={(e) => setAliasName(e.target.value)}
              placeholder="e.g., John Smith Combined"
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '10px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Description Input */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}
            >
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why are these profiles being combined?"
              rows={2}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: '14px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '10px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Primary Customer Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px'
              }}
            >
              Select Primary Customer *
            </label>
            <p style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '12px' }}>
              The primary customer's name will be used for display purposes
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => setPrimaryCustomerId(customer.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: `2px solid ${
                      primaryCustomerId === customer.id
                        ? colors.brand.primary
                        : colors.utility.primaryText + '15'
                    }`,
                    backgroundColor:
                      primaryCustomerId === customer.id
                        ? colors.brand.primary + '08'
                        : colors.utility.secondaryBackground,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Radio indicator */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${
                        primaryCustomerId === customer.id
                          ? colors.brand.primary
                          : colors.utility.primaryText + '30'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {primaryCustomerId === customer.id && (
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: colors.brand.primary
                        }}
                      />
                    )}
                  </div>

                  {/* Customer Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.utility.primaryText,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {customer.name}
                      </span>
                      {primaryCustomerId === customer.id && (
                        <Star size={14} color={colors.brand.primary} fill={colors.brand.primary} />
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                      {customer.iwell_code && <span>{customer.iwell_code}</span>}
                      {customer.email && customer.iwell_code && <span> | </span>}
                      {customer.email && <span>{customer.email}</span>}
                    </div>
                  </div>

                  {/* Value */}
                  {customer.current_value !== undefined && customer.current_value > 0 && (
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: colors.semantic.success,
                        flexShrink: 0
                      }}
                    >
                      {formatCurrency(customer.current_value)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${colors.utility.primaryText}15`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '10px',
              backgroundColor: 'transparent',
              color: colors.utility.primaryText,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createAliasMutation.isPending || !aliasName.trim() || !primaryCustomerId}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: colors.brand.primary,
              color: '#FFF',
              cursor: createAliasMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: createAliasMutation.isPending || !aliasName.trim() || !primaryCustomerId ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Link2 size={16} />
            {createAliasMutation.isPending ? 'Creating...' : 'Create Alias'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAliasModal;
