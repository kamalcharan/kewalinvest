  // frontend/src/components/ETL/TemplateManager.tsx
  import React, { useState, useEffect } from 'react';
  import { useTheme } from '../../contexts/ThemeContext';
  import { useAuth } from '../../contexts/AuthContext';
  import { FileImportType } from '../../types/import.types';
  import { API_ENDPOINTS } from '../../services/serviceURLs';

  interface Template {
    id: number;
    template_name: string;
    import_type: FileImportType;
    field_mappings: any;
    is_default: boolean;
    created_at: string;
    template_version: number;
  }

  interface FieldMapping {
    sourceField: string;
    targetField: string;
    isRequired: boolean;
    transformation?: string;
    isActive: boolean;
  }

  interface TemplateManagerProps {
    importType: FileImportType;
    currentMappings: FieldMapping[];
    onTemplateLoad: (mappings: FieldMapping[]) => void;
    onTemplateSave: (templateName: string) => void;
    onError: (error: string) => void;
    disabled?: boolean;
  }

  const TemplateManager: React.FC<TemplateManagerProps> = ({
    importType,
    currentMappings,
    onTemplateLoad,
    onTemplateSave,
    onError,
    disabled = false
  }) => {
    const { theme, isDarkMode } = useTheme();
    const { tenantId, environment } = useAuth();
    const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
    
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [saveTemplateName, setSaveTemplateName] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [setAsDefault, setSetAsDefault] = useState(false);

    // Load templates on component mount
    useEffect(() => {
      loadTemplates();
    }, [importType]);

    // Load available templates
    const loadTemplates = async () => {
      try {
        setIsLoading(true);
        
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_ENDPOINTS.IMPORT.TEMPLATES}?importType=${importType}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Tenant-ID': String(tenantId),
            'X-Environment': environment || 'test'
          }
        });

        const result = await response.json();

        if (result.success) {
          setTemplates(result.data || []);
        } else {
          onError(result.error || 'Failed to load templates');
        }

      } catch (error: any) {
        onError('Network error while loading templates');
      } finally {
        setIsLoading(false);
      }
    };

    // Save current mappings as template
    const saveTemplate = async () => {
      if (!saveTemplateName.trim()) {
        onError('Template name is required');
        return;
      }

      try {
        setIsLoading(true);

        const token = localStorage.getItem('access_token');
        const response = await fetch(API_ENDPOINTS.IMPORT.TEMPLATES, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Tenant-ID': String(tenantId),
            'X-Environment': environment || 'test'
          },
          body: JSON.stringify({
            templateName: saveTemplateName.trim(),
            importType,
            mappings: currentMappings,
            isDefault: setAsDefault
          })
        });

        const result = await response.json();

        if (result.success) {
          onTemplateSave(saveTemplateName.trim());
          setShowSaveModal(false);
          setSaveTemplateName('');
          setSetAsDefault(false);
          await loadTemplates(); // Refresh templates list
        } else {
          onError(result.error || 'Failed to save template');
        }

      } catch (error: any) {
        onError('Network error while saving template');
      } finally {
        setIsLoading(false);
      }
    };

    // Load selected template
    const loadTemplate = (template: Template) => {
      try {
        const mappings = template.field_mappings?.mappings || [];
        onTemplateLoad(mappings);
        setShowLoadModal(false);
        setSelectedTemplate(null);
      } catch (error: any) {
        onError('Failed to load template mappings');
      }
    };

    // Delete template
    const deleteTemplate = async (templateId: number) => {
      if (!window.confirm('Are you sure you want to delete this template?')) {
        return;
      }

      try {
        setIsLoading(true);

        const token = localStorage.getItem('access_token');
        const response = await fetch(API_ENDPOINTS.IMPORT.TEMPLATE(templateId), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Tenant-ID': String(tenantId),
            'X-Environment': environment || 'test'
          }
        });

        const result = await response.json();

        if (result.success) {
          await loadTemplates(); // Refresh templates list
        } else {
          onError(result.error || 'Failed to delete template');
        }

      } catch (error: any) {
        onError('Network error while deleting template');
      } finally {
        setIsLoading(false);
      }
    };

    // Format date
    const formatDate = (dateString: string): string => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Icons
    const SaveIcon = () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17,21 17,13 7,13 7,21" />
        <polyline points="7,3 7,8 15,8" />
      </svg>
    );

    const LoadIcon = () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
      </svg>
    );

    const TrashIcon = () => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3,6 5,6 21,6" />
        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
      </svg>
    );

    const StarIcon = ({ filled }: { filled: boolean }) => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    );

    const CloseIcon = () => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );

    return (
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center'
      }}>
        {/* Save Template Button */}
        <button
          onClick={() => setShowSaveModal(true)}
          disabled={disabled || currentMappings.filter(m => m.isActive && m.targetField).length === 0}
          style={{
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: disabled || currentMappings.filter(m => m.isActive && m.targetField).length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: disabled || currentMappings.filter(m => m.isActive && m.targetField).length === 0 ? 0.6 : 1
          }}
        >
          <SaveIcon />
          Save Template
        </button>

        {/* Load Template Button */}
        <button
          onClick={() => setShowLoadModal(true)}
          disabled={disabled || templates.length === 0}
          style={{
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            border: `1px solid ${colors.utility.primaryText}30`,
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: disabled || templates.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            opacity: disabled || templates.length === 0 ? 0.6 : 1
          }}
        >
          <LoadIcon />
          Load Template ({templates.length})
        </button>

        {/* Save Template Modal */}
        {showSaveModal && (
          <div style={{
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              border: `1px solid ${colors.utility.primaryText}20`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: 0
                }}>
                  Save Mapping Template
                </h3>
                <button
                  onClick={() => setShowSaveModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: colors.utility.secondaryText,
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <CloseIcon />
                </button>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.utility.primaryText,
                  marginBottom: '6px'
                }}>
                  Template Name
                </label>
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder="Enter template name..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.utility.primaryText}30`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <input
                  type="checkbox"
                  id="setAsDefault"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px'
                  }}
                />
                <label
                  htmlFor="setAsDefault"
                  style={{
                    fontSize: '13px',
                    color: colors.utility.primaryText,
                    cursor: 'pointer'
                  }}
                >
                  Set as default template for {importType === 'CustomerData' ? 'Customer Data' : 'Transaction Data'}
                </label>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowSaveModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    color: colors.utility.secondaryText,
                    border: `1px solid ${colors.utility.primaryText}30`,
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={!saveTemplateName.trim() || isLoading}
                  style={{
                    backgroundColor: colors.brand.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    cursor: !saveTemplateName.trim() || isLoading ? 'not-allowed' : 'pointer',
                    opacity: !saveTemplateName.trim() || isLoading ? 0.6 : 1
                  }}
                >
                  {isLoading ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Template Modal */}
        {showLoadModal && (
          <div style={{
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'hidden',
              border: `1px solid ${colors.utility.primaryText}20`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: 0
                }}>
                  Load Mapping Template
                </h3>
                <button
                  onClick={() => setShowLoadModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: colors.utility.secondaryText,
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <CloseIcon />
                </button>
              </div>

              {isLoading ? (
                <div style={{
                  textAlign: 'center' as const,
                  padding: '40px',
                  color: colors.utility.secondaryText
                }}>
                  Loading templates...
                </div>
              ) : templates.length === 0 ? (
                <div style={{
                  textAlign: 'center' as const,
                  padding: '40px',
                  color: colors.utility.secondaryText
                }}>
                  <p>No templates found for {importType === 'CustomerData' ? 'Customer Data' : 'Transaction Data'}</p>
                  <p style={{ fontSize: '13px' }}>Save your current mappings to create your first template.</p>
                </div>
              ) : (
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      style={{
                        padding: '16px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '8px',
                        marginBottom: '12px',
                        backgroundColor: colors.utility.secondaryBackground
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <h4 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: colors.utility.primaryText,
                            margin: 0
                          }}>
                            {template.template_name}
                          </h4>
                          {template.is_default && (
                            <div style={{
                              color: colors.semantic.warning,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}>
                              <StarIcon filled={true} />
                              <span style={{ fontSize: '10px', fontWeight: '600' }}>DEFAULT</span>
                            </div>
                          )}
                        </div>

                        <div style={{
                          display: 'flex',
                          gap: '8px'
                        }}>
                          <button
                            onClick={() => loadTemplate(template)}
                            style={{
                              backgroundColor: colors.brand.primary,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Load
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            style={{
                              backgroundColor: colors.semantic.error,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '6px 8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>

                      <div style={{
                        fontSize: '12px',
                        color: colors.utility.secondaryText,
                        marginBottom: '8px'
                      }}>
                        Created: {formatDate(template.created_at)} • Version: {template.template_version}
                      </div>

                      <div style={{
                        fontSize: '12px',
                        color: colors.utility.secondaryText
                      }}>
                        {template.field_mappings?.mappings?.length || 0} field mappings defined
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '16px'
              }}>
                <button
                  onClick={() => setShowLoadModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    color: colors.utility.secondaryText,
                    border: `1px solid ${colors.utility.primaryText}30`,
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  export default TemplateManager;