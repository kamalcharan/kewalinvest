// frontend/src/components/performance/DefaultIndexSettings.tsx
import React, { useState, useEffect } from 'react';
import { Save, Info } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { IndexSelector } from './IndexSelector';
import { UserPreferencesService } from '../../services/userPreferences.service';
import type { MarketIndex } from '../../types/market.types';

interface DefaultIndexSettingsProps {
  onSettingSaved?: () => void;
}

export const DefaultIndexSettings: React.FC<DefaultIndexSettingsProps> = ({
  onSettingSaved
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [selectedIndexId, setSelectedIndexId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load current default index on mount
  useEffect(() => {
    loadDefaultIndex();
  }, []);

  const loadDefaultIndex = async () => {
    setIsLoading(true);
    try {
      const response = await UserPreferencesService.getDefaultComparisonIndex();
      if (response.success && response.data?.default_comparison_index_id) {
        setSelectedIndexId(response.data.default_comparison_index_id);
      }
    } catch (error) {
      console.error('Failed to load default index:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (selectedIndexId === null) {
      setMessage({ type: 'error', text: 'Please select an index' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await UserPreferencesService.setDefaultComparisonIndex(selectedIndexId);
      if (response.success) {
        setMessage({ type: 'success', text: 'Default comparison index saved successfully' });
        if (onSettingSaved) {
          onSettingSaved();
        }
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save setting' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
      console.error('Failed to save default index:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleIndexSelect = (index: MarketIndex | null) => {
    setSelectedIndexId(index?.id || null);
    setMessage(null); // Clear any previous messages
  };

  return (
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${colors.utility.primaryText}15`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          Default Comparison Index
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '10px 12px',
            backgroundColor: colors.brand.primary + '10',
            border: `1px solid ${colors.brand.primary}30`,
            borderRadius: '8px'
          }}
        >
          <Info size={16} style={{ color: colors.brand.primary, flexShrink: 0, marginTop: '2px' }} />
          <p
            style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              lineHeight: '1.5',
              margin: 0
            }}
          >
            Select a default index to compare against customer portfolio performance.
            This index will be automatically displayed on all customer performance charts.
          </p>
        </div>
      </div>

      {/* Index Selector */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '500',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}
        >
          Select Default Index
        </label>
        <IndexSelector
          selectedIndexId={selectedIndexId}
          onIndexSelect={handleIndexSelect}
          disabled={isLoading || isSaving}
          placeholder="Select an index for comparison"
        />
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={isSaving || selectedIndexId === null}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: isSaving || selectedIndexId === null ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isSaving || selectedIndexId === null ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          <Save size={16} />
          {isSaving ? 'Saving...' : 'Save Setting'}
        </button>

        {/* Status Message */}
        {message && (
          <div
            style={{
              padding: '8px 14px',
              backgroundColor: message.type === 'success'
                ? colors.semantic.success + '15'
                : colors.semantic.error + '15',
              border: `1px solid ${message.type === 'success'
                ? colors.semantic.success + '40'
                : colors.semantic.error + '40'}`,
              borderRadius: '6px',
              fontSize: '12px',
              color: message.type === 'success'
                ? colors.semantic.success
                : colors.semantic.error,
              fontWeight: '500'
            }}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};
