// frontend/src/components/nav/BulkMetricsPreCheckModal.tsx
// Pre-check modal component to show scheme readiness before bulk calculation

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCategorizeSchemeReadiness } from '../../hooks/useBulkMetricsCalculation';
import type { SchemeBookmark, SchemeReadinessCategory } from '../../types/nav.types';

/**
 * Props for BulkMetricsPreCheckModal
 */
interface BulkMetricsPreCheckModalProps {
  isOpen: boolean;
  schemes: SchemeBookmark[];
  onClose: () => void;
  onProceed: (schemeIds: number[]) => void;
  onDownloadNavFirst?: (schemes: SchemeBookmark[]) => void;
}

/**
 * BulkMetricsPreCheckModal Component
 * Shows scheme readiness categorization before bulk metrics calculation
 * 
 * @example
 * ```tsx
 * <BulkMetricsPreCheckModal
 *   isOpen={showPreCheck}
 *   schemes={selectedSchemes}
 *   onClose={() => setShowPreCheck(false)}
 *   onProceed={(schemeIds) => {
 *     startBulkCalculation(schemeIds);
 *   }}
 *   onDownloadNavFirst={(schemes) => {
 *     triggerNavDownload(schemes);
 *   }}
 * />
 * ```
 */
export const BulkMetricsPreCheckModal: React.FC<BulkMetricsPreCheckModalProps> = ({
  isOpen,
  schemes,
  onClose,
  onProceed,
  onDownloadNavFirst,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const { categorize, getSummary } = useCategorizeSchemeReadiness();

  // Local state
  const [categories, setCategories] = useState<SchemeReadinessCategory>({
    ready: [],
    partial: [],
    noData: [],
  });
  const [expandedSection, setExpandedSection] = useState<'ready' | 'partial' | 'noData' | null>(null);
  const [includePartial, setIncludePartial] = useState(true);

  // Categorize schemes when modal opens
  useEffect(() => {
    if (isOpen && schemes.length > 0) {
      const categorized = categorize(schemes);
      setCategories(categorized);
      
      // Auto-expand section with issues
      if (categorized.noData.length > 0) {
        setExpandedSection('noData');
      } else if (categorized.partial.length > 0) {
        setExpandedSection('partial');
      }
    }
  }, [isOpen, schemes, categorize]);

  // Don't render if not open
  if (!isOpen) return null;

  const summary = getSummary(categories);

  /**
   * Handle proceed with calculation
   */
  const handleProceed = () => {
    // Collect scheme IDs to process
    let schemesToProcess = [...categories.ready];
    
    if (includePartial) {
      schemesToProcess = [...schemesToProcess, ...categories.partial];
    }

    if (schemesToProcess.length === 0) {
      return; // Should not happen, but safety check
    }

    const schemeIds = schemesToProcess.map(s => s.scheme_id);
    onProceed(schemeIds);
  };

  /**
   * Handle download NAV first
   */
  const handleDownloadNavFirst = () => {
    if (onDownloadNavFirst && categories.noData.length > 0) {
      // Convert readiness objects back to bookmarks
      const bookmarks = schemes.filter(s => 
        categories.noData.some(nd => nd.scheme_id === s.scheme_id)
      );
      onDownloadNavFirst(bookmarks);
    }
  };

  /**
   * Toggle expanded section
   */
  const toggleSection = (section: 'ready' | 'partial' | 'noData') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
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
          zIndex: 1000,
          padding: '20px',
        }}
      >
        {/* Modal Container */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: 0,
            }}>
              📊 Ready to Calculate Metrics?
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ×
            </button>
          </div>

          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {/* Ready */}
            <div style={{
              backgroundColor: colors.semantic.success + '15',
              border: `2px solid ${colors.semantic.success}30`,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              cursor: categories.ready.length > 0 ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
            onClick={() => categories.ready.length > 0 && toggleSection('ready')}
            onMouseEnter={(e) => {
              if (categories.ready.length > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (categories.ready.length > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.semantic.success,
                marginBottom: '4px',
              }}>
                {categories.ready.length}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: colors.semantic.success,
                marginBottom: '4px',
              }}>
                ✓ Ready
              </div>
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
              }}>
                Sufficient data
              </div>
            </div>

            {/* Partial */}
            <div style={{
              backgroundColor: colors.semantic.warning + '15',
              border: `2px solid ${colors.semantic.warning}30`,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              cursor: categories.partial.length > 0 ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
            onClick={() => categories.partial.length > 0 && toggleSection('partial')}
            onMouseEnter={(e) => {
              if (categories.partial.length > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (categories.partial.length > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.semantic.warning,
                marginBottom: '4px',
              }}>
                {categories.partial.length}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: colors.semantic.warning,
                marginBottom: '4px',
              }}>
                ⚠ Limited Data
              </div>
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
              }}>
                {'<100 records'}
              </div>
            </div>

            {/* No Data */}
            <div style={{
              backgroundColor: colors.semantic.error + '15',
              border: `2px solid ${colors.semantic.error}30`,
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              cursor: categories.noData.length > 0 ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
            onClick={() => categories.noData.length > 0 && toggleSection('noData')}
            onMouseEnter={(e) => {
              if (categories.noData.length > 0) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (categories.noData.length > 0) {
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.semantic.error,
                marginBottom: '4px',
              }}>
                {categories.noData.length}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: colors.semantic.error,
                marginBottom: '4px',
              }}>
                ✗ No Data
              </div>
              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
              }}>
                No NAV records
              </div>
            </div>
          </div>

          {/* Expanded Sections */}
          {expandedSection && (
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>
                  {expandedSection === 'ready' && `✓ Ready Schemes (${categories.ready.length})`}
                  {expandedSection === 'partial' && `⚠ Limited Data Schemes (${categories.partial.length})`}
                  {expandedSection === 'noData' && `✗ No Data Schemes (${categories.noData.length})`}
                </span>
                <button
                  onClick={() => setExpandedSection(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.utility.secondaryText,
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px',
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {categories[expandedSection].map((scheme, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderRadius: '6px',
                      padding: '12px',
                      border: `1px solid ${colors.utility.primaryText}10`,
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      marginBottom: '4px',
                    }}>
                      {scheme.scheme_name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: colors.utility.secondaryText,
                    }}>
                      Code: {scheme.scheme_code} • Records: {scheme.nav_records_count.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {categories.noData.length > 0 && (
            <div style={{
              backgroundColor: colors.semantic.error + '10',
              border: `1px solid ${colors.semantic.error}30`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: colors.semantic.error,
                marginBottom: '8px',
              }}>
                ⚠️ {categories.noData.length} scheme(s) have no NAV data
              </div>
              <div style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                marginBottom: '12px',
              }}>
                These schemes will be skipped. Download NAV data first to include them.
              </div>
              {onDownloadNavFirst && (
                <button
                  onClick={handleDownloadNavFirst}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: colors.semantic.error,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  📥 Download NAV Data First
                </button>
              )}
            </div>
          )}

          {categories.partial.length > 0 && (
            <div style={{
              backgroundColor: colors.semantic.warning + '10',
              border: `1px solid ${colors.semantic.warning}30`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'start',
                gap: '12px',
              }}>
                <input
                  type="checkbox"
                  id="includePartial"
                  checked={includePartial}
                  onChange={(e) => setIncludePartial(e.target.checked)}
                  style={{
                    marginTop: '2px',
                    cursor: 'pointer',
                  }}
                />
                <label
                  htmlFor="includePartial"
                  style={{
                    flex: 1,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.semantic.warning,
                    marginBottom: '4px',
                  }}>
                    Include {categories.partial.length} scheme(s) with limited data
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                  }}>
                    These schemes have less than 100 NAV records. Some metrics may be unavailable or less accurate.
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Summary */}
          <div style={{
            backgroundColor: colors.brand.primary + '10',
            border: `1px solid ${colors.brand.primary}30`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
          }}>
            <div style={{
              fontSize: '14px',
              color: colors.utility.primaryText,
              marginBottom: '8px',
            }}>
              <strong>Will calculate metrics for:</strong>
            </div>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.brand.primary,
              marginBottom: '8px',
            }}>
              {categories.ready.length + (includePartial ? categories.partial.length : 0)} schemes
            </div>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
            }}>
              {categories.ready.length} ready
              {includePartial && categories.partial.length > 0 && ` + ${categories.partial.length} with limited data`}
              {categories.noData.length > 0 && ` • Skipping ${categories.noData.length} without data`}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.secondaryText}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleProceed}
              disabled={!summary.canProceed}
              style={{
                padding: '12px 24px',
                backgroundColor: !summary.canProceed
                  ? colors.utility.secondaryText
                  : colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: !summary.canProceed ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                opacity: !summary.canProceed ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (summary.canProceed) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (summary.canProceed) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              📊 Proceed with Calculation
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BulkMetricsPreCheckModal;