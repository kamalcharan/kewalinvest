// backend/src/services/importTemplate.service.ts
import { Pool } from 'pg';
import { pool } from '../config/database';
import { FileImportType } from '../types/import.types';

interface TemplateFieldMapping {
  sourceField: string;
  targetField: string;
  isRequired: boolean;
  transformation?: string;
  validationPattern?: string;
  errorMessage?: string;
}

interface ImportTemplate {
  id: number;
  tenant_id: number;
  is_live: boolean;
  import_type: FileImportType;
  template_name: string;
  template_version: number;
  field_mappings: {
    mappings: TemplateFieldMapping[];
    validationRules?: any[];
  };
  is_default: boolean;
  is_active: boolean;
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

interface CreateTemplateParams {
  tenantId: number;
  isLive: boolean;
  importType: FileImportType;
  templateName: string;
  mappings: TemplateFieldMapping[];
  validationRules?: any[];
  isDefault: boolean;
  createdBy: number;
}

interface UpdateTemplateParams {
  templateName?: string;
  mappings?: TemplateFieldMapping[];
  validationRules?: any[];
  isDefault?: boolean;
  updatedBy: number;
}

interface GetTemplatesParams {
  tenantId: number;
  isLive: boolean;
  importType?: FileImportType;
  includeInactive?: boolean;
  createdBy?: number;
}

interface ValidateTemplateParams {
  templateName: string;
  importType: FileImportType;
  mappings: TemplateFieldMapping[];
  tenantId: number;
  isLive: boolean;
  excludeTemplateId?: number;
}

export class ImportTemplateService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Create a new import template
   */
  async createTemplate(params: CreateTemplateParams): Promise<ImportTemplate> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // If setting as default, first unset any existing defaults for this import type
      if (params.isDefault) {
        await client.query(
          `UPDATE t_import_field_mappings 
           SET is_default = false, updated_at = CURRENT_TIMESTAMP
           WHERE tenant_id = $1 AND is_live = $2 AND import_type = $3`,
          [params.tenantId, params.isLive, params.importType]
        );
      }

      // Check for duplicate template name
      const existingTemplate = await client.query(
        `SELECT id FROM t_import_field_mappings 
         WHERE tenant_id = $1 AND is_live = $2 AND import_type = $3 
         AND template_name = $4 AND is_active = true`,
        [params.tenantId, params.isLive, params.importType, params.templateName]
      );

      if (existingTemplate.rows.length > 0) {
        throw new Error(`Template with name "${params.templateName}" already exists for this import type`);
      }

      // Create the template
      const query = `
        INSERT INTO t_import_field_mappings (
          tenant_id, is_live, import_type, template_name, template_version,
          field_mappings, is_default, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const fieldMappings = {
        mappings: params.mappings,
        validationRules: params.validationRules || []
      };

      const result = await client.query(query, [
        params.tenantId,
        params.isLive,
        params.importType,
        params.templateName.trim(),
        1, // initial version
        JSON.stringify(fieldMappings),
        params.isDefault,
        true, // is_active
        params.createdBy
      ]);

      await client.query('COMMIT');
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating import template:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get import templates
   */
  async getTemplates(params: GetTemplatesParams): Promise<ImportTemplate[]> {
    try {
      let query = `
        SELECT * FROM t_import_field_mappings
        WHERE tenant_id = $1 AND is_live = $2
      `;
      const queryParams: any[] = [params.tenantId, params.isLive];
      let paramIndex = 3;

      // Filter by import type
      if (params.importType) {
        query += ` AND import_type = $${paramIndex}`;
        queryParams.push(params.importType);
        paramIndex++;
      }

      // Filter by active status
      if (!params.includeInactive) {
        query += ` AND is_active = true`;
      }

      // Filter by creator
      if (params.createdBy) {
        query += ` AND created_by = $${paramIndex}`;
        queryParams.push(params.createdBy);
        paramIndex++;
      }

      // Order by default first, then name
      query += ` ORDER BY is_default DESC, template_name ASC`;

      const result = await this.db.query(query, queryParams);
      return result.rows;

    } catch (error) {
      console.error('Error getting import templates:', error);
      throw error;
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplateById(
    tenantId: number, 
    isLive: boolean, 
    templateId: number
  ): Promise<ImportTemplate | null> {
    try {
      const query = `
        SELECT * FROM t_import_field_mappings
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      `;

      const result = await this.db.query(query, [templateId, tenantId, isLive]);
      return result.rows[0] || null;

    } catch (error) {
      console.error('Error getting template by ID:', error);
      throw error;
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    tenantId: number,
    isLive: boolean,
    templateId: number,
    updates: UpdateTemplateParams
  ): Promise<ImportTemplate> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get the existing template
      const existingTemplate = await client.query(
        `SELECT * FROM t_import_field_mappings 
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [templateId, tenantId, isLive]
      );

      if (existingTemplate.rows.length === 0) {
        throw new Error('Template not found');
      }

      const template = existingTemplate.rows[0];

      // If setting as default, unset other defaults for this import type
      if (updates.isDefault) {
        await client.query(
          `UPDATE t_import_field_mappings 
           SET is_default = false, updated_at = CURRENT_TIMESTAMP
           WHERE tenant_id = $1 AND is_live = $2 AND import_type = $3 AND id != $4`,
          [tenantId, isLive, template.import_type, templateId]
        );
      }

      // Check for duplicate template name (if name is being updated)
      if (updates.templateName && updates.templateName !== template.template_name) {
        const duplicateCheck = await client.query(
          `SELECT id FROM t_import_field_mappings 
           WHERE tenant_id = $1 AND is_live = $2 AND import_type = $3 
           AND template_name = $4 AND is_active = true AND id != $5`,
          [tenantId, isLive, template.import_type, updates.templateName, templateId]
        );

        if (duplicateCheck.rows.length > 0) {
          throw new Error(`Template with name "${updates.templateName}" already exists for this import type`);
        }
      }

      // Build update query
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (updates.templateName !== undefined) {
        updateFields.push(`template_name = $${paramIndex}`);
        queryParams.push(updates.templateName.trim());
        paramIndex++;
      }

      if (updates.mappings !== undefined) {
        const fieldMappings = {
          mappings: updates.mappings,
          validationRules: updates.validationRules || template.field_mappings?.validationRules || []
        };
        updateFields.push(`field_mappings = $${paramIndex}`);
        queryParams.push(JSON.stringify(fieldMappings));
        paramIndex++;

        // Increment version when mappings change
        updateFields.push(`template_version = template_version + 1`);
      }

      if (updates.isDefault !== undefined) {
        updateFields.push(`is_default = $${paramIndex}`);
        queryParams.push(updates.isDefault);
        paramIndex++;
      }

      updateFields.push(`updated_by = $${paramIndex}`);
      queryParams.push(updates.updatedBy);
      paramIndex++;

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      if (updateFields.length === 0) {
        return template;
      }

      const updateQuery = `
        UPDATE t_import_field_mappings 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND is_live = $${paramIndex + 2}
        RETURNING *
      `;

      queryParams.push(templateId, tenantId, isLive);
      const result = await client.query(updateQuery, queryParams);

      await client.query('COMMIT');
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating import template:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a template (soft delete)
   */
  async deleteTemplate(
    tenantId: number,
    isLive: boolean,
    templateId: number,
    deletedBy: number
  ): Promise<void> {
    try {
      const query = `
        UPDATE t_import_field_mappings 
        SET is_active = false, updated_by = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND tenant_id = $3 AND is_live = $4
      `;

      const result = await this.db.query(query, [deletedBy, templateId, tenantId, isLive]);

      if (result.rowCount === 0) {
        throw new Error('Template not found or already deleted');
      }

    } catch (error) {
      console.error('Error deleting import template:', error);
      throw error;
    }
  }

  /**
   * Get default template for import type
   */
  async getDefaultTemplate(
    tenantId: number,
    isLive: boolean,
    importType: FileImportType
  ): Promise<ImportTemplate | null> {
    try {
      const query = `
        SELECT * FROM t_import_field_mappings
        WHERE tenant_id = $1 AND is_live = $2 AND import_type = $3 
        AND is_default = true AND is_active = true
        LIMIT 1
      `;

      const result = await this.db.query(query, [tenantId, isLive, importType]);
      return result.rows[0] || null;

    } catch (error) {
      console.error('Error getting default template:', error);
      throw error;
    }
  }

  /**
   * Set template as default
   */
  async setAsDefault(
    tenantId: number,
    isLive: boolean,
    templateId: number,
    updatedBy: number
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get the template to find its import type
      const templateResult = await client.query(
        `SELECT import_type FROM t_import_field_mappings 
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [templateId, tenantId, isLive]
      );

      if (templateResult.rows.length === 0) {
        throw new Error('Template not found');
      }

      const importType = templateResult.rows[0].import_type;

      // Unset all defaults for this import type
      await client.query(
        `UPDATE t_import_field_mappings 
         SET is_default = false, updated_at = CURRENT_TIMESTAMP
         WHERE tenant_id = $1 AND is_live = $2 AND import_type = $3`,
        [tenantId, isLive, importType]
      );

      // Set this template as default
      await client.query(
        `UPDATE t_import_field_mappings 
         SET is_default = true, updated_by = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND tenant_id = $3 AND is_live = $4`,
        [updatedBy, templateId, tenantId, isLive]
      );

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error setting template as default:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate template data
   */
  async validateTemplate(params: ValidateTemplateParams): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check template name
      if (!params.templateName || params.templateName.trim().length === 0) {
        errors.push('Template name is required');
      } else if (params.templateName.trim().length < 3) {
        errors.push('Template name must be at least 3 characters long');
      } else if (params.templateName.trim().length > 100) {
        errors.push('Template name must be less than 100 characters');
      }

      // Check for duplicate name
      if (params.templateName && params.templateName.trim().length >= 3) {
        let query = `
          SELECT id FROM t_import_field_mappings 
          WHERE tenant_id = $1 AND is_live = $2 AND import_type = $3 
          AND template_name = $4 AND is_active = true
        `;
        const queryParams: any[] = [
          params.tenantId,
          params.isLive,
          params.importType,
          params.templateName.trim()
        ];

        if (params.excludeTemplateId) {
          query += ' AND id != $5';
          queryParams.push(params.excludeTemplateId);
        }

        const duplicateResult = await this.db.query(query, queryParams);
        if (duplicateResult.rows.length > 0) {
          errors.push(`Template with name "${params.templateName}" already exists for this import type`);
        }
      }

      // Check mappings
      if (!params.mappings || params.mappings.length === 0) {
        errors.push('At least one field mapping is required');
      } else {
        // Check for required fields based on import type
        if (params.importType === 'CustomerData') {
          const requiredFields = ['name', 'prefix'];
          const mappedTargetFields = params.mappings
            .filter(m => m.targetField)
            .map(m => m.targetField);

          requiredFields.forEach(field => {
            if (!mappedTargetFields.includes(field)) {
              errors.push(`Required field '${field}' must be mapped for Customer Data imports`);
            }
          });
        }

        // Check for duplicate target field mappings
        const targetFieldCounts = new Map<string, number>();
        params.mappings
          .filter(m => m.targetField)
          .forEach(mapping => {
            const count = targetFieldCounts.get(mapping.targetField) || 0;
            targetFieldCounts.set(mapping.targetField, count + 1);
          });

        targetFieldCounts.forEach((count, field) => {
          if (count > 1) {
            errors.push(`Target field '${field}' is mapped multiple times`);
          }
        });

        // Check for empty source fields
        const emptySourceFields = params.mappings.filter(m => !m.sourceField || m.sourceField.trim() === '');
        if (emptySourceFields.length > 0) {
          warnings.push(`${emptySourceFields.length} mappings have empty source fields`);
        }
      }

    } catch (error) {
      console.error('Error validating template:', error);
      errors.push('Template validation failed due to internal error');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Clone an existing template
   */
  async cloneTemplate(
    tenantId: number,
    isLive: boolean,
    sourceTemplateId: number,
    newTemplateName: string,
    createdBy: number
  ): Promise<ImportTemplate> {
    try {
      // Get the source template
      const sourceTemplate = await this.getTemplateById(tenantId, isLive, sourceTemplateId);
      if (!sourceTemplate) {
        throw new Error('Source template not found');
      }

      // Create new template with copied data
      const cloneParams: CreateTemplateParams = {
        tenantId,
        isLive,
        importType: sourceTemplate.import_type,
        templateName: newTemplateName,
        mappings: sourceTemplate.field_mappings?.mappings || [],
        validationRules: sourceTemplate.field_mappings?.validationRules || [],
        isDefault: false, // Cloned templates are never default by default
        createdBy
      };

      return await this.createTemplate(cloneParams);

    } catch (error) {
      console.error('Error cloning template:', error);
      throw error;
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(
    tenantId: number,
    isLive: boolean,
    templateId?: number
  ): Promise<any[]> {
    try {
      let query = `
        SELECT 
          fm.id,
          fm.template_name,
          fm.import_type,
          fm.is_default,
          COUNT(s.id) as usage_count,
          MAX(s.created_at) as last_used
        FROM t_import_field_mappings fm
        LEFT JOIN t_import_sessions s ON s.template_id = fm.id
        WHERE fm.tenant_id = $1 AND fm.is_live = $2 AND fm.is_active = true
      `;
      const queryParams: any[] = [tenantId, isLive];

      if (templateId) {
        query += ' AND fm.id = $3';
        queryParams.push(templateId);
      }

      query += `
        GROUP BY fm.id, fm.template_name, fm.import_type, fm.is_default
        ORDER BY usage_count DESC, fm.template_name ASC
      `;

      const result = await this.db.query(query, queryParams);
      return result.rows;

    } catch (error) {
      console.error('Error getting template usage stats:', error);
      throw error;
    }
  }
}