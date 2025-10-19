// frontend/src/components/nav/BookmarkEditModal.tsx
// Modal for editing bookmark settings including alias_name
// FIXED: Corrected imports, removed duplicate CSS properties, fixed service calls

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { navService, SchemeBookmark } from '../../services/nav.service';

interface BookmarkEditModalProps {
  bookmark: SchemeBookmark;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const BookmarkEditModal: React.FC<BookmarkEditModalProps> = ({
  bookmark,
  isOpen,
  onClose,
  onSave
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Form state
  const [aliasName, setAliasName] = useState(bookmark.alias_name || '');
  const [dailyDownloadEnabled, setDailyDownloadEnabled] = useState(bookmark.daily_download_enabled);
  const [downloadTime, setDownloadTime] = useState(bookmark.download_time || '22:00');
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when bookmark changes
  useEffect(() => {
    if (isOpen) {
      setAliasName(bookmark.alias_name || '');
      setDailyDownloadEnabled(bookmark.daily_download_enabled);
      setDownloadTime(bookmark.download_time || '22:00');
      setError(null);
      setValidationError(null);
    }
  }, [bookmark, isOpen]);

  // Validate alias name
  const validateAliasName = (value: string): boolean => {
    if (value.trim().length > 100) {
      setValidationError('Alias name cannot exceed 100 characters');
      return false;
    }
    setValidationError(null);
    return true;
  };

  // Handle alias name change
  const handleAliasNameChange = (value: string) => {
    setAliasName(value);
    validateAliasName(value);
  };

  // Clear alias name
  const handleClearAlias = () => {
    setAliasName('');
    setValidationError(null);
  };

  // Save changes
  const handleSave = async () => {
    // Validate before saving
    const trimmedAlias = aliasName.trim();
    if (!validateAliasName(trimmedAlias)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const updates: any = {
        daily_download_enabled: dailyDownloadEnabled,
        download_time: downloadTime
      };

      // Only include alias_name if it's been changed or cleared
      if (trimmedAlias !== (bookmark.alias_name || '')) {
        updates.alias_name = trimmedAlias || null; // null if empty string
      }

      const response = await navService.updateBookmark(bookmark.id, updates);

      if (response.success) {
        onSave();
        onClose();
      } else {
        setError(response.error || 'Failed to update bookmark');
      }
    } catch (err: any) {
      console.error('Error updating bookmark:', err);
      setError(err.message || 'Failed to update bookmark');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setError(null);
    setValidationError(null);
    onClose();
  };

  // Check if form has changes
  const hasChanges = 
    (aliasName.trim() || null) !== (bookmark.alias_name || null) ||
    dailyDownloadEnabled !== bookmark.daily_download_enabled ||
    downloadTime !== bookmark.download_time;

  // Icons
  const XIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const EditIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );

  const ClockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );

  const DownloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  const AlertCircleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleCancel}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '600px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        zIndex: 1001,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: colors.brand.primary }}>
              <EditIcon />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: 0,
                marginBottom: '4px'
              }}>
                Edit Bookmark
              </h2>
              <p style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                margin: 0
              }}>
                {bookmark.scheme_name} ({bookmark.scheme_code})
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.utility.primaryBackground}
          >
            <XIcon />
          </button>
        </div>

        {/* Form Content */}
        <div style={{ padding: '24px' }}>
          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: colors.semantic.error + '10',
              border: `1px solid ${colors.semantic.error}30`,
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: colors.semantic.error
            }}>
              <AlertCircleIcon />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{error}</span>
            </div>
          )}

          {/* Alias Name Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Custom Alias Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={aliasName}
                onChange={(e) => handleAliasNameChange(e.target.value)}
                placeholder="Enter a custom name for this scheme (optional)"
                maxLength={100}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: aliasName ? '45px' : '16px',
                  backgroundColor: colors.utility.primaryBackground,
                  border: `1px solid ${validationError ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                  borderRadius: '8px',
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {aliasName && (
                <button
                  onClick={handleClearAlias}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: colors.semantic.error + '20',
                    color: colors.semantic.error,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.semantic.error + '30'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.semantic.error + '20'}
                  title="Clear alias name"
                >
                  <TrashIcon />
                </button>
              )}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '6px',
              fontSize: '11px'
            }}>
              {validationError ? (
                <span style={{ color: colors.semantic.error, fontWeight: '500' }}>
                  {validationError}
                </span>
              ) : (
                <span style={{ color: colors.utility.secondaryText }}>
                  {aliasName ? 'Custom name will be shown instead of scheme name' : 'Leave empty to use default scheme name'}
                </span>
              )}
              <span style={{ 
                color: aliasName.length > 90 ? colors.semantic.error : colors.utility.secondaryText,
                fontWeight: aliasName.length > 90 ? '600' : 'normal'
              }}>
                {aliasName.length}/100
              </span>
            </div>
          </div>

          {/* Daily Download Toggle */}
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <DownloadIcon />
                  Enable Daily Download
                </div>
                <div style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText,
                  lineHeight: '1.5'
                }}>
                  Automatically download NAV data daily at the scheduled time
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '52px',
                height: '28px',
                marginLeft: '16px',
                flexShrink: 0
              }}>
                <input
                  type="checkbox"
                  checked={dailyDownloadEnabled}
                  onChange={(e) => setDailyDownloadEnabled(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: dailyDownloadEnabled ? colors.semantic.success : colors.utility.primaryText + '30',
                  transition: '0.3s',
                  borderRadius: '28px'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '""',
                    height: '20px',
                    width: '20px',
                    left: dailyDownloadEnabled ? '28px' : '4px',
                    bottom: '4px',
                    backgroundColor: 'white',
                    transition: '0.3s',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </span>
              </label>
            </div>
          </div>

          {/* Download Time */}
          <div style={{
            marginBottom: '24px',
            opacity: dailyDownloadEnabled ? 1 : 0.5,
            pointerEvents: dailyDownloadEnabled ? 'auto' : 'none'
          }}>
            <label style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ClockIcon />
              Download Time
            </label>
            <input
              type="time"
              value={downloadTime}
              onChange={(e) => setDownloadTime(e.target.value)}
              disabled={!dailyDownloadEnabled}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: colors.utility.primaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: dailyDownloadEnabled ? 'pointer' : 'not-allowed'
              }}
            />
            <div style={{
              marginTop: '6px',
              fontSize: '11px',
              color: colors.utility.secondaryText
            }}>
              NAV data will be downloaded daily at this time (24-hour format)
            </div>
          </div>

          {/* Preview */}
          {aliasName.trim() && (
            <div style={{
              padding: '16px',
              backgroundColor: colors.brand.primary + '10',
              border: `1px solid ${colors.brand.primary}30`,
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: colors.brand.primary,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Preview
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '4px'
              }}>
                {aliasName.trim()}
              </div>
              <div style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                {bookmark.scheme_name} ({bookmark.scheme_code})
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: `1px solid ${colors.utility.primaryText}10`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.utility.primaryBackground
        }}>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
            {hasChanges ? '• Unsaved changes' : 'No changes made'}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCancel}
              disabled={saving}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '8px',
                color: colors.utility.primaryText,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: saving ? 0.6 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges || !!validationError}
              style={{
                padding: '10px 24px',
                backgroundColor: colors.semantic.success,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: saving || !hasChanges || !!validationError ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: saving || !hasChanges || !!validationError ? 0.6 : 1,
                minWidth: '100px'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookmarkEditModal;