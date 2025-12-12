// frontend/src/components/alias/EditAliasModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Edit2, Save } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useUpdateAlias } from '../../hooks/useAlias';
import { toastService } from '../../services/toast.service';
import type { AliasWithMembers } from '../../types/alias.types';

interface EditAliasModalProps {
  isOpen: boolean;
  onClose: () => void;
  alias: AliasWithMembers | null;
  onSuccess?: () => void;
}

export const EditAliasModal: React.FC<EditAliasModalProps> = ({
  isOpen,
  onClose,
  alias,
  onSuccess
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [aliasName, setAliasName] = useState('');
  const [description, setDescription] = useState('');

  const updateAliasMutation = useUpdateAlias();

  // Populate form when modal opens
  useEffect(() => {
    if (isOpen && alias) {
      setAliasName(alias.alias_name);
      setDescription(alias.description || '');
    }
  }, [isOpen, alias]);

  const handleSubmit = async () => {
    if (!alias) return;

    if (!aliasName.trim()) {
      toastService.error('Please enter an alias name');
      return;
    }

    try {
      await updateAliasMutation.mutateAsync({
        aliasId: alias.id,
        request: {
          alias_name: aliasName.trim(),
          description: description.trim() || undefined
        }
      });

      toastService.success('Alias updated successfully');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toastService.error(error.message || 'Failed to update alias');
    }
  };

  if (!isOpen || !alias) return null;

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
          maxWidth: '480px',
          overflow: 'hidden',
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
              <Edit2 size={20} color={colors.brand.primary} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
                Edit Alias
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: colors.utility.secondaryText }}>
                Update alias details
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
        <div style={{ padding: '24px' }}>
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
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why are these profiles combined?"
              rows={3}
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
            disabled={updateAliasMutation.isPending || !aliasName.trim()}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '10px',
              backgroundColor: colors.brand.primary,
              color: '#FFF',
              cursor: updateAliasMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: updateAliasMutation.isPending || !aliasName.trim() ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            {updateAliasMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAliasModal;
