// frontend/src/components/nav/AliasManagementModal.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { SchemeAliasService, type SchemeAlias } from '../../services/schemeAlias.service';
import { toastService } from '../../services/toast.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import type { SchemeBookmark } from '../../types/nav.types';

interface AliasManagementModalProps {
  isOpen: boolean;
  bookmark: SchemeBookmark | null;
  onClose: () => void;
}

export const AliasManagementModal: React.FC<AliasManagementModalProps> = ({
  isOpen,
  bookmark,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [aliases, setAliases] = useState<SchemeAlias[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  // Load aliases when modal opens
  useEffect(() => {
    if (isOpen && bookmark) {
      loadAliases();
    }
  }, [isOpen, bookmark]);

  const loadAliases = useCallback(async () => {
    if (!bookmark) return;

    setIsLoading(true);
    try {
      const response = await SchemeAliasService.getAliases({
        scheme_code: bookmark.scheme_code,
      });

      if (response.success && response.data) {
        setAliases(response.data);
        FrontendErrorLogger.info(
          'Loaded aliases',
          'AliasManagementModal',
          { count: response.data.length, schemeCode: bookmark.scheme_code }
        );
      } else {
        throw new Error(response.error || 'Failed to load aliases');
      }
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Failed to load aliases',
        'AliasManagementModal',
        { error: error.message, schemeCode: bookmark.scheme_code },
        error.stack
      );
      toastService.error('Failed to load aliases: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [bookmark]);

  const handleAddAlias = useCallback(async () => {
    if (!bookmark || !user || !newAlias.trim()) return;

    // Check for duplicates (case-insensitive)
    const normalizedNew = newAlias.trim().toUpperCase();
    const isDuplicate = aliases.some(
      (alias) => alias.alias_name_normalized === normalizedNew
    );

    if (isDuplicate) {
      toastService.warning('This alias already exists for this scheme');
      return;
    }

    setIsAdding(true);
    try {
      const response = await SchemeAliasService.createAlias({
        scheme_code: bookmark.scheme_code,
        alias_name: newAlias.trim(),
        source: 'manual',
      });

      if (response.success) {
        toastService.success('Alias added successfully');
        setNewAlias('');
        await loadAliases(); // Reload aliases
        // Invalidate bookmark/alias queries to refresh lists
        queryClient.invalidateQueries({ queryKey: ['nav', 'bookmarks'] });
        queryClient.invalidateQueries({ queryKey: ['aliases'] });
        FrontendErrorLogger.info(
          'Alias added',
          'AliasManagementModal',
          { aliasName: newAlias, schemeCode: bookmark.scheme_code }
        );
      } else {
        throw new Error(response.error || 'Failed to add alias');
      }
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Failed to add alias',
        'AliasManagementModal',
        { error: error.message, aliasName: newAlias },
        error.stack
      );
      toastService.error('Failed to add alias: ' + error.message);
    } finally {
      setIsAdding(false);
    }
  }, [bookmark, user, newAlias, aliases, loadAliases, queryClient]);

  const handleDeleteAlias = useCallback(
    async (aliasId: number, aliasName: string) => {
      if (!bookmark) return;

      setDeletingIds((prev) => new Set(prev).add(aliasId));
      try {
        const response = await SchemeAliasService.deleteAlias(aliasId);

        if (response.success) {
          toastService.success('Alias deleted successfully');
          await loadAliases(); // Reload aliases
          // Invalidate bookmark/alias queries to refresh lists
          queryClient.invalidateQueries({ queryKey: ['nav', 'bookmarks'] });
          queryClient.invalidateQueries({ queryKey: ['aliases'] });
          FrontendErrorLogger.info(
            'Alias deleted',
            'AliasManagementModal',
            { aliasId, aliasName, schemeCode: bookmark.scheme_code }
          );
        } else {
          throw new Error(response.error || 'Failed to delete alias');
        }
      } catch (error: any) {
        FrontendErrorLogger.error(
          'Failed to delete alias',
          'AliasManagementModal',
          { error: error.message, aliasId, aliasName },
          error.stack
        );
        toastService.error('Failed to delete alias: ' + error.message);
      } finally {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(aliasId);
          return next;
        });
      }
    },
    [bookmark, loadAliases, queryClient]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !isAdding && newAlias.trim()) {
        handleAddAlias();
      }
    },
    [handleAddAlias, isAdding, newAlias]
  );

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
        zIndex: 10000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '12px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: `1px solid ${colors.utility.primaryText}10`,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                margin: 0,
              }}
            >
              🏷️ Manage Scheme Aliases
            </h2>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                fontSize: '24px',
                padding: '0',
                lineHeight: '1',
              }}
            >
              ×
            </button>
          </div>
          <div
            style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              marginBottom: '8px',
            }}
          >
            <strong>Scheme:</strong> {bookmark?.scheme_name}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
            }}
          >
            <strong>Code:</strong> {bookmark?.scheme_code}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Add New Alias Section */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '8px',
              }}
            >
              Add New Alias
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter alias name..."
                disabled={isAdding}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAddAlias}
                disabled={!newAlias.trim() || isAdding}
                style={{
                  padding: '10px 20px',
                  backgroundColor:
                    !newAlias.trim() || isAdding
                      ? colors.utility.secondaryText
                      : colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor:
                    !newAlias.trim() || isAdding ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  opacity: !newAlias.trim() || isAdding ? 0.6 : 1,
                }}
              >
                {isAdding ? '...' : '+ Add'}
              </button>
            </div>
            <div
              style={{
                marginTop: '6px',
                fontSize: '12px',
                color: colors.utility.secondaryText,
              }}
            >
              Enter alternative names for this scheme (e.g., different formats
              used in transaction imports)
            </div>
          </div>

          {/* Existing Aliases List */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '12px',
              }}
            >
              Existing Aliases ({aliases.length})
            </label>

            {isLoading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: colors.utility.secondaryText,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    border: `3px solid ${colors.utility.secondaryBackground}`,
                    borderTop: `3px solid ${colors.brand.primary}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 12px',
                  }}
                />
                Loading aliases...
              </div>
            ) : aliases.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: colors.utility.secondaryText,
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  📝
                </div>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  No aliases yet. Add one above to get started.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {aliases.map((alias) => (
                  <div
                    key={alias.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '6px',
                      border: `1px solid ${colors.utility.primaryText}10`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: colors.utility.primaryText,
                          marginBottom: '4px',
                        }}
                      >
                        {alias.alias_name}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: colors.utility.secondaryText,
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>
                          Source:{' '}
                          <span
                            style={{
                              color:
                                alias.source === 'auto'
                                  ? colors.semantic.info
                                  : alias.source === 'manual'
                                  ? colors.brand.primary
                                  : colors.semantic.warning,
                              fontWeight: '600',
                            }}
                          >
                            {alias.source}
                          </span>
                        </span>
                        {alias.created_at && (
                          <span>
                            Created:{' '}
                            {new Date(alias.created_at).toLocaleDateString(
                              'en-IN'
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleDeleteAlias(alias.id, alias.alias_name)
                      }
                      disabled={deletingIds.has(alias.id)}
                      title="Delete this alias"
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: deletingIds.has(alias.id)
                          ? colors.utility.secondaryText
                          : colors.semantic.error,
                        cursor: deletingIds.has(alias.id)
                          ? 'not-allowed'
                          : 'pointer',
                        fontSize: '18px',
                        padding: '4px 8px',
                        opacity: deletingIds.has(alias.id) ? 0.5 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {deletingIds.has(alias.id) ? '⏳' : '🗑️'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${colors.utility.primaryText}10`,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.utility.secondaryText,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Close
          </button>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};
