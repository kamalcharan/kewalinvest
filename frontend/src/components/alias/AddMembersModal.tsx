// frontend/src/components/alias/AddMembersModal.tsx

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAddAliasMembers } from '../../hooks/useAlias';
import { useCustomers } from '../../hooks/useCustomers';
import { toastService } from '../../services/toast.service';

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  aliasId: number;
  existingMemberIds: number[];
  onSuccess?: () => void;
}

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
  isOpen,
  onClose,
  aliasId,
  existingMemberIds,
  onSuccess
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const addMembersMutation = useAddAliasMembers();

  // Fetch customers
  const { data: customerData, isLoading } = useCustomers({
    page: 1,
    page_size: 50,
    search: searchQuery || undefined
  });

  const customers = customerData?.customers || [];

  // Filter out existing members
  const availableCustomers = customers.filter(c => !existingMemberIds.includes(c.id));

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setSearchQuery('');
    }
  }, [isOpen]);

  const toggleCustomer = (customerId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) {
      toastService.error('Please select at least one customer');
      return;
    }

    try {
      await addMembersMutation.mutateAsync({
        aliasId,
        customerIds: Array.from(selectedIds)
      });

      toastService.success(`${selectedIds.size} member(s) added to alias`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toastService.error(error.message || 'Failed to add members');
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
    return `${value.toLocaleString('en-IN')}`;
  };

  if (!isOpen) return null;

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
          maxWidth: '560px',
          maxHeight: '80vh',
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
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: colors.status.success + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <UserPlus size={20} color={colors.status.success} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
                Add Members
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: colors.utility.secondaryText }}>
                Select customers to add to this alias
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

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.utility.primaryText}10`, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              color={colors.utility.secondaryText}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
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
        </div>

        {/* Customer List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>
              Loading customers...
            </div>
          ) : availableCustomers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.utility.secondaryText }}>
              {searchQuery ? 'No customers found' : 'All customers are already in this alias'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {availableCustomers.map((customer) => {
                const isSelected = selectedIds.has(customer.id);
                return (
                  <div
                    key={customer.id}
                    onClick={() => toggleCustomer(customer.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `2px solid ${isSelected ? colors.brand.primary : colors.utility.primaryText + '15'}`,
                      backgroundColor: isSelected ? colors.brand.primary + '08' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        border: `2px solid ${isSelected ? colors.brand.primary : colors.utility.primaryText + '30'}`,
                        backgroundColor: isSelected ? colors.brand.primary : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isSelected && <Check size={14} color="#FFF" />}
                    </div>

                    {/* Customer Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
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
                      </div>
                      <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '2px' }}>
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
                          color: colors.status.success,
                          flexShrink: 0
                        }}
                      >
                        {formatCurrency(customer.current_value)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${colors.utility.primaryText}15`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
            {selectedIds.size} selected
          </span>
          <div style={{ display: 'flex', gap: '12px' }}>
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
              disabled={addMembersMutation.isPending || selectedIds.size === 0}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: colors.status.success,
                color: '#FFF',
                cursor: addMembersMutation.isPending || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                opacity: addMembersMutation.isPending || selectedIds.size === 0 ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <UserPlus size={16} />
              {addMembersMutation.isPending ? 'Adding...' : 'Add Members'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMembersModal;
