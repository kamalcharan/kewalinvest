// frontend/src/services/template.service.ts
import { FileImportType } from '../types/import.types';

interface FieldMapping {
  sourceField: string;
  targetField: string;
  isRequired: boolean;
  transformation?: string;
  isActive: boolean;
}

interface Template {
  id: number;
  template_name: string;
  import_type: FileImportType;
  field_mappings: any;
  is_default: boolean;
  created_at: string;
  template_version: number;
}

interface SaveTemplateRequest {
  templateName: string;
  importType: FileImportType;
  mappings: FieldMapping[];
  isDefault?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class TemplateService {
  private baseUrl = '/api/import';

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      const result = await response.json();
      return result;

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }

  /**
   * Get all templates for a specific import type
   */
  async getTemplates(importType?: FileImportType): Promise<ApiResponse<Template[]>> {
    const queryParam = importType ? `?importType=${importType}` : '';
    return await this.makeRequest<Template[]>(`/templates${queryParam}`);
  }

  /**
   * Save a new template
   */
  async saveTemplate(request: SaveTemplateRequest): Promise<ApiResponse<Template>> {
    return await this.makeRequest<Template>('/templates', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: number, 
    updates: Partial<SaveTemplateRequest>
  ): Promise<ApiResponse<Template>> {
    return await this.makeRequest<Template>(`/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: number): Promise<ApiResponse<void>> {
    return await this.makeRequest<void>(`/templates/${templateId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: number): Promise<ApiResponse<Template>> {
    return await this.makeRequest<Template>(`/templates/${templateId}`);
  }

  /**
   * Get default template for import type
   */
  async getDefaultTemplate(importType: FileImportType): Promise<ApiResponse<Template | null>> {
    const response = await this.getTemplates(importType);
    
    if (response.success && response.data) {
      const defaultTemplate = response.data.find(template => template.is_default);
      return {
        success: true,
        data: defaultTemplate || null
      };
    }
    
    return {
      success: response.success,
      error: response.error,
      data: null
    };
  }

  /**
   * Apply template mappings to source headers
   */
  applyTemplateToHeaders(
    template: Template, 
    sourceHeaders: string[]
  ): FieldMapping[] {
    const templateMappings = template.field_mappings?.mappings || [];
    
    // Create mappings for each source header
    return sourceHeaders.map(header => {
      // Try to find matching template mapping
      const templateMapping = templateMappings.find((tm: FieldMapping) => 
        tm.sourceField.toLowerCase() === header.toLowerCase()
      );
      
      if (templateMapping) {
        return {
          sourceField: header,
          targetField: templateMapping.targetField,
          isRequired: templateMapping.isRequired,
          transformation: templateMapping.transformation,
          isActive: templateMapping.isActive
        };
      }
      
      // No template mapping found, create empty mapping
      return {
        sourceField: header,
        targetField: '',
        isRequired: false,
        transformation: '',
        isActive: true
      };
    });
  }

  /**
   * Validate template compatibility with source headers
   */
  validateTemplateCompatibility(
    template: Template, 
    sourceHeaders: string[]
  ): { isCompatible: boolean; warnings: string[]; missingFields: string[] } {
    const templateMappings = template.field_mappings?.mappings || [];
    const warnings: string[] = [];
    const missingFields: string[] = [];
    
    // Check for required mappings that won't be available
    const requiredMappings = templateMappings.filter((tm: FieldMapping) => 
      tm.isRequired && tm.isActive
    );
    
    for (const requiredMapping of requiredMappings) {
      const hasMatchingHeader = sourceHeaders.some(header => 
        header.toLowerCase() === requiredMapping.sourceField.toLowerCase()
      );
      
      if (!hasMatchingHeader) {
        missingFields.push(requiredMapping.sourceField);
        warnings.push(
          `Required field "${requiredMapping.targetField}" expects column "${requiredMapping.sourceField}" which is not found in your file`
        );
      }
    }
    
    // Check for extra headers not in template
    const templateHeaders = templateMappings.map((tm: FieldMapping) => 
      tm.sourceField.toLowerCase()
    );
    
    const extraHeaders = sourceHeaders.filter(header => 
      !templateHeaders.includes(header.toLowerCase())
    );
    
    if (extraHeaders.length > 0) {
      warnings.push(
        `Your file contains ${extraHeaders.length} additional columns not defined in this template: ${extraHeaders.join(', ')}`
      );
    }
    
    return {
      isCompatible: missingFields.length === 0,
      warnings,
      missingFields
    };
  }

  /**
   * Generate template preview for display
   */
  generateTemplatePreview(template: Template): {
    mappingCount: number;
    requiredCount: number;
    transformationCount: number;
    targetFields: string[];
  } {
    const mappings = template.field_mappings?.mappings || [];
    
    const activeMappings = mappings.filter((m: FieldMapping) => m.isActive && m.targetField);
    const requiredMappings = activeMappings.filter((m: FieldMapping) => m.isRequired);
    const transformationMappings = activeMappings.filter((m: FieldMapping) => m.transformation);
    const targetFields = activeMappings.map((m: FieldMapping) => m.targetField);
    
    return {
      mappingCount: activeMappings.length,
      requiredCount: requiredMappings.length,
      transformationCount: transformationMappings.length,
      targetFields
    };
  }

  /**
   * Export template as JSON for backup/sharing
   */
  exportTemplate(template: Template): string {
    const exportData = {
      name: template.template_name,
      import_type: template.import_type,
      mappings: template.field_mappings,
      version: template.template_version,
      exported_at: new Date().toISOString()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import template from JSON
   */
  async importTemplate(
    jsonData: string, 
    newName?: string
  ): Promise<{ success: boolean; template?: any; error?: string }> {
    try {
      const templateData = JSON.parse(jsonData);
      
      // Validate required fields
      if (!templateData.name || !templateData.import_type || !templateData.mappings) {
        return {
          success: false,
          error: 'Invalid template format. Missing required fields.'
        };
      }
      
      // Create save request
      const saveRequest: SaveTemplateRequest = {
        templateName: newName || `${templateData.name} (Imported)`,
        importType: templateData.import_type,
        mappings: templateData.mappings.mappings || [],
        isDefault: false
      };
      
      return {
        success: true,
        template: saveRequest
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: 'Invalid JSON format. Please check the template file.'
      };
    }
  }
}

export const templateService = new TemplateService();
export default templateService;