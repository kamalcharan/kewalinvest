// frontend/src/components/ETL/FieldMapping.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { FileImportType } from '../../types/import.types';
import { CUSTOMER_DATA_FIELDS, SCHEME_DATA_FIELDS, TRANSFORMATION_RULES } from '../../constants/fileImportTypes';
import MappingRow from './MappingRow';
import TemplateManager from './TemplateManager';

interface FieldMappingProps {
  importType: FileImportType;
  sourceHeaders: string[];
  fileName: string;
  onMappingConfirmed: (mappings: FieldMappingData[]) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

interface FieldMappingData {
  sourceField: string;
  targetField: string;
  isRequired: boolean;
  transformation?: string;
  isActive: boolean;
}

interface TargetField {
  field: string;
  label: string;
  type: string;
  required: boolean;
  description: string;
  group: string;
}

const FieldMapping: React.FC<FieldMappingProps> = ({
  importType,
  sourceHeaders,
  fileName,
  onMappingConfirmed,
  onError,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const { tenantId, environment } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [mappings, setMappings] = useState<FieldMappingData[]>([]);
  const [availableTargetFields, setAvailableTargetFields] = useState<TargetField[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Define target fields based on import type
  useEffect(() => {
    const targetFields = getTargetFieldsForImportType(importType);
    setAvailableTargetFields(targetFields);
    
    // Initialize mappings with auto-suggestions only if no existing mappings
    if (mappings.length === 0) {
      const usedTargetFields = new Set<string>();
      const initialMappings = sourceHeaders.map(header => {
        const suggestedTarget = suggestTargetField(header, targetFields, usedTargetFields);
        if (suggestedTarget) {
          usedTargetFields.add(suggestedTarget.field);
        }
        return {
          sourceField: header,
          targetField: suggestedTarget?.field || '',
          isRequired: suggestedTarget?.required || false,
          transformation: suggestTransformation(header, suggestedTarget || undefined),
          isActive: true
        };
      });
      
      setMappings(initialMappings);
    }
  }, [importType, sourceHeaders]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Get target fields based on import type
  const getTargetFieldsForImportType = (type: FileImportType): TargetField[] => {
    if (type === 'CustomerData') {
      return [
        // Contact Basic Info
        { field: 'prefix', label: 'Title/Prefix', type: 'select', required: true, description: 'Mr, Mrs, Ms, Dr, etc.', group: 'Basic Info' },
        { field: 'name', label: 'Full Name', type: 'text', required: true, description: 'Customer full name', group: 'Basic Info' },
        
        // Customer Specific
        { field: 'pan', label: 'PAN Number', type: 'text', required: false, description: 'Permanent Account Number', group: 'Identity' },
        { field: 'iwell_code', label: 'IWell Code', type: 'text', required: false, description: 'Internal customer code', group: 'Identity' },
        { field: 'date_of_birth', label: 'Date of Birth', type: 'date', required: false, description: 'Customer birth date', group: 'Personal' },
        { field: 'anniversary_date', label: 'Anniversary Date', type: 'date', required: false, description: 'Wedding anniversary', group: 'Personal' },
        { field: 'survival_status', label: 'Status', type: 'select', required: false, description: 'Alive or Deceased', group: 'Personal' },
        { field: 'date_of_death', label: 'Date of Death', type: 'date', required: false, description: 'If deceased', group: 'Personal' },
        
        // Family Info
        { field: 'family_head_name', label: 'Family Head Name', type: 'text', required: false, description: 'Head of family', group: 'Family' },
        { field: 'family_head_iwell_code', label: 'Family Head Code', type: 'text', required: false, description: 'Family head IWell code', group: 'Family' },
        { field: 'referred_by_name', label: 'Referred By', type: 'text', required: false, description: 'Referrer name', group: 'Referral' },
        
        // Contact Channels
        { field: 'email', label: 'Email Address', type: 'email', required: false, description: 'Primary email', group: 'Contact' },
        { field: 'mobile', label: 'Mobile Number', type: 'phone', required: false, description: 'Primary mobile', group: 'Contact' },
        { field: 'whatsapp', label: 'WhatsApp Number', type: 'phone', required: false, description: 'WhatsApp contact', group: 'Contact' },
        
        // Address
        { field: 'address_line1', label: 'Address Line 1', type: 'text', required: false, description: 'Street address', group: 'Address' },
        { field: 'address_line2', label: 'Address Line 2', type: 'text', required: false, description: 'Additional address', group: 'Address' },
        { field: 'city', label: 'City', type: 'text', required: false, description: 'City name', group: 'Address' },
        { field: 'state', label: 'State', type: 'text', required: false, description: 'State/Province', group: 'Address' },
        { field: 'country', label: 'Country', type: 'text', required: false, description: 'Country name', group: 'Address' },
        { field: 'pincode', label: 'PIN Code', type: 'text', required: false, description: 'Postal code', group: 'Address' },
        { field: 'address_type', label: 'Address Type', type: 'select', required: false, description: 'Residential, Office, etc.', group: 'Address' }
      ];
    }
    
    if (type === 'SchemeData') {
      return [
        // Basic Info
        { field: 'amc_name', label: 'AMC Name', type: 'text', required: false, description: 'Asset Management Company', group: 'Basic Info' },
        { field: 'scheme_code', label: 'Scheme Code', type: 'text', required: true, description: 'Unique scheme identifier', group: 'Basic Info' },
        { field: 'scheme_name', label: 'Scheme Name', type: 'text', required: true, description: 'Full scheme name', group: 'Basic Info' },
        
        // Classification
        { field: 'scheme_type', label: 'Scheme Type', type: 'select', required: false, description: 'OpenEnded or ClosedEnded', group: 'Classification' },
        { field: 'scheme_category', label: 'Scheme Category', type: 'select', required: false, description: 'Fund category', group: 'Classification' },
        
        // Investment Details
        { field: 'scheme_nav_name', label: 'NAV Name', type: 'text', required: false, description: 'NAV display name', group: 'Investment' },
        { field: 'scheme_minimum_amount', label: 'Minimum Amount', type: 'number', required: false, description: 'Minimum investment amount', group: 'Investment' },
        
        // Dates
        { field: 'launch_date', label: 'Launch Date', type: 'date', required: false, description: 'Scheme launch date', group: 'Dates' },
        { field: 'closure_date', label: 'Closure Date', type: 'date', required: false, description: 'Scheme closure date', group: 'Dates' },
        
        // ISIN Codes
        { field: 'isin_div_payout', label: 'ISIN Dividend Payout', type: 'text', required: false, description: 'ISIN for dividend payout option', group: 'ISIN' },
        { field: 'isin_growth', label: 'ISIN Growth', type: 'text', required: false, description: 'ISIN for growth option', group: 'ISIN' },
        { field: 'isin_div_reinvestment', label: 'ISIN Dividend Reinvestment', type: 'text', required: false, description: 'ISIN for dividend reinvestment', group: 'ISIN' }
      ];
    }
    
    // TransactionData fields (25+ fields)
    if (type === 'TransactionData') {
      return [
        // Core Transaction Fields
        { field: 'iwell_code', label: 'IWell Code', type: 'text', required: true, description: 'Customer IWell code for lookup', group: 'Customer Identification' },
        { field: 'txn_date', label: 'Transaction Date', type: 'date', required: true, description: 'Date of transaction', group: 'Transaction Core' },
        { field: 'txn_code', label: 'Transaction Type Code', type: 'text', required: true, description: 'SIP, PURCHASE, REDEMPTION, etc.', group: 'Transaction Core' },
        { field: 'total_amount', label: 'Total Amount', type: 'number', required: true, description: 'Total transaction amount', group: 'Transaction Core' },
        { field: 'units', label: 'Units', type: 'number', required: true, description: 'Number of units', group: 'Transaction Core' },
        { field: 'nav', label: 'NAV', type: 'number', required: true, description: 'Net Asset Value', group: 'Transaction Core' },
        
        // Scheme Identification
        { field: 'scheme_code', label: 'Scheme Code', type: 'text', required: true, description: 'Unique scheme identifier', group: 'Scheme Info' },
        { field: 'scheme_name', label: 'Scheme Name', type: 'text', required: true, description: 'Full scheme name', group: 'Scheme Info' },
        { field: 'folio_no', label: 'Folio Number', type: 'text', required: false, description: 'Fund folio number', group: 'Scheme Info' },
        { field: 'fund_name', label: 'Fund Name', type: 'text', required: false, description: 'AMC/Fund house name', group: 'Scheme Info' },
        
        // Scheme Classification
        { field: 'category', label: 'Category', type: 'text', required: false, description: 'Equity, Debt, Hybrid, etc.', group: 'Classification' },
        { field: 'sub_category', label: 'Sub Category', type: 'text', required: false, description: 'Large Cap, Small Cap, etc.', group: 'Classification' },
        
        // Transaction Charges
        { field: 'stamp_duty', label: 'Stamp Duty', type: 'number', required: false, description: 'Stamp duty charges', group: 'Charges' },
        { field: 'stt', label: 'STT', type: 'number', required: false, description: 'Securities Transaction Tax', group: 'Charges' },
        { field: 'tds', label: 'TDS', type: 'number', required: false, description: 'Tax Deducted at Source', group: 'Charges' },
        
        // Distributor Information
        { field: 'euin', label: 'EUIN', type: 'text', required: false, description: 'Employee Unique Identification Number', group: 'Distributor' },
        { field: 'arn_no', label: 'ARN Number', type: 'text', required: false, description: 'AMFI Registration Number', group: 'Distributor' },
        
        // Transaction Details
        { field: 'txn_description', label: 'Transaction Description', type: 'text', required: false, description: 'Description of transaction', group: 'Details' },
        { field: 'txn_source', label: 'Transaction Source', type: 'text', required: false, description: 'BSE, NSE, Direct, etc.', group: 'Details' },
        { field: 'sip_regd_date', label: 'SIP Registration Date', type: 'date', required: false, description: 'For SIP transactions', group: 'Details' },
        { field: 'remarks', label: 'Remarks', type: 'text', required: false, description: 'Additional remarks', group: 'Details' },
        
        // Switch Transaction Fields
        { field: 'source_scheme_name', label: 'Source Scheme Name', type: 'text', required: false, description: 'For switch transactions', group: 'Switch Info' },
        { field: 'target_scheme_name', label: 'Target Scheme Name', type: 'text', required: false, description: 'For switch transactions', group: 'Switch Info' },
        
        // Additional Codes
        { field: 'equity_code', label: 'Equity Code', type: 'text', required: false, description: 'Equity identification code', group: 'Additional Codes' },
        { field: 'app_code', label: 'Application Code', type: 'text', required: false, description: 'Application reference code', group: 'Additional Codes' },
        { field: 'sb_code', label: 'Sub Broker Code', type: 'text', required: false, description: 'Sub broker code', group: 'Additional Codes' },
        
        // Reference Fields (not stored in transaction table, used for lookup only)
        { field: 'applicant', label: 'Applicant Name', type: 'text', required: false, description: 'Customer name (for reference)', group: 'Reference' },
        { field: 'family_head', label: 'Family Head', type: 'text', required: false, description: 'Family head name (for reference)', group: 'Reference' },
        { field: 'pan', label: 'PAN', type: 'text', required: false, description: 'Customer PAN (for reference)', group: 'Reference' }
      ];
    }
    
    // Default fallback (should not reach here)
    return [];
  };

  // Suggest target field based on source header (with duplicate prevention)
  const suggestTargetField = (sourceHeader: string, targetFields: TargetField[], usedFields: Set<string>): TargetField | null => {
    const headerLower = sourceHeader.toLowerCase().trim();
    
    // Direct matches
    const directMatch = targetFields.find(field => 
      !usedFields.has(field.field) && (
        field.field.toLowerCase() === headerLower ||
        field.label.toLowerCase() === headerLower
      )
    );
    if (directMatch) return directMatch;
    
    // Fuzzy matching patterns for all import types
    const fuzzyMatches = [
      // Customer patterns
      { patterns: ['name', 'customer_name', 'full_name', 'client_name'], field: 'name' },
      { patterns: ['email', 'email_address', 'mail', 'e_mail', 'emailid'], field: 'email' },
      { patterns: ['mobile', 'phone', 'contact', 'mobile_number', 'phone_number'], field: 'mobile' },
      { patterns: ['pan', 'pan_number', 'pan_card'], field: 'pan' },
      { patterns: ['dob', 'birth_date', 'date_of_birth', 'birthdate'], field: 'date_of_birth' },
      { patterns: ['anniversary', 'wedding_date', 'anniversary_date'], field: 'anniversary_date' },
      { patterns: ['address', 'address1', 'street', 'address_line_1'], field: 'address_line1' },
      { patterns: ['address2', 'address_line_2'], field: 'address_line2' },
      { patterns: ['city', 'town'], field: 'city' },
      { patterns: ['state', 'province', 'region'], field: 'state' },
      { patterns: ['country', 'nation'], field: 'country' },
      { patterns: ['pin', 'pincode', 'postal_code', 'zip', 'zipcode'], field: 'pincode' },
      { patterns: ['prefix', 'title', 'salutation'], field: 'prefix' },
      
      // Scheme patterns
      { patterns: ['amc', 'amc_name', 'fund_house'], field: 'amc_name' },
      { patterns: ['code', 'scheme_code', 'fund_code', 'schemecode'], field: 'scheme_code' },
      { patterns: ['scheme_name', 'fund_name', 'scheme name'], field: 'scheme_name' },
      { patterns: ['scheme_type', 'fund_type', 'type'], field: 'scheme_type' },
      { patterns: ['category', 'scheme_category', 'fund_category'], field: 'category' },
      { patterns: ['nav', 'nav_name', 'scheme_nav'], field: 'scheme_nav_name' },
      { patterns: ['minimum', 'min_amount', 'minimum_amount'], field: 'scheme_minimum_amount' },
      { patterns: ['launch', 'launch_date', 'inception'], field: 'launch_date' },
      { patterns: ['closure', 'closure_date', 'close_date'], field: 'closure_date' },
      { patterns: ['isin_payout', 'isin_div_payout', 'dividend_payout'], field: 'isin_div_payout' },
      { patterns: ['isin_growth', 'growth_isin'], field: 'isin_growth' },
      { patterns: ['isin_reinvest', 'isin_div_reinvestment', 'dividend_reinvest'], field: 'isin_div_reinvestment' },
      
      // Transaction patterns
      { patterns: ['iwell', 'iwell_code', 'iwellcode'], field: 'iwell_code' },
      { patterns: ['transaction date', 'txn_date', 'txndate', 'trans_date', 'date'], field: 'txn_date' },
      { patterns: ['txntype', 'txn_type', 'transaction_type', 'trans_type', 'type'], field: 'txn_code' },
      { patterns: ['total amount', 'total_amount', 'amount', 'totalamount'], field: 'total_amount' },
      { patterns: ['units', 'unit', 'no_of_units'], field: 'units' },
      { patterns: ['nav', 'net_asset_value'], field: 'nav' },
      { patterns: ['folio', 'folio_no', 'folio no', 'foliono'], field: 'folio_no' },
      { patterns: ['fund name', 'fund_name', 'fundname', 'amc'], field: 'fund_name' },
      { patterns: ['sub-category', 'sub_category', 'subcategory'], field: 'sub_category' },
      { patterns: ['stamp duty', 'stamp_duty', 'stampduty'], field: 'stamp_duty' },
      { patterns: ['stt'], field: 'stt' },
      { patterns: ['tds'], field: 'tds' },
      { patterns: ['euin'], field: 'euin' },
      { patterns: ['arn', 'arn_no', 'arn no', 'arnno'], field: 'arn_no' },
      { patterns: ['txn description', 'txn_description', 'description'], field: 'txn_description' },
      { patterns: ['txn source', 'txn_source', 'source'], field: 'txn_source' },
      { patterns: ['sip regd', 'sip_regd_date', 'sip_date'], field: 'sip_regd_date' },
      { patterns: ['remarks', 'remark', 'comments'], field: 'remarks' },
      { patterns: ['source scheme', 'source_scheme_name'], field: 'source_scheme_name' },
      { patterns: ['target scheme', 'target_scheme_name'], field: 'target_scheme_name' },
      { patterns: ['equity code', 'equity_code'], field: 'equity_code' },
      { patterns: ['app code', 'app_code', 'application_code'], field: 'app_code' },
      { patterns: ['sb code', 'sb_code', 'subbroker'], field: 'sb_code' },
      { patterns: ['applicant'], field: 'applicant' },
      { patterns: ['family head', 'family_head'], field: 'family_head' }
    ];
    
    for (const match of fuzzyMatches) {
      if (match.patterns.some(pattern => headerLower.includes(pattern))) {
        const targetField = targetFields.find(field => field.field === match.field && !usedFields.has(field.field));
        if (targetField) return targetField;
      }
    }
    
    return null;
  };

  // Suggest transformation based on field types
  const suggestTransformation = (sourceHeader: string, targetField?: TargetField): string => {
    if (!targetField) return '';
    
    const headerLower = sourceHeader.toLowerCase();
    
    // Text fields that should be uppercase
    if (['pan', 'iwell_code', 'scheme_code', 'isin_div_payout', 'isin_growth', 'isin_div_reinvestment', 'txn_code', 'euin', 'arn_no'].includes(targetField.field)) {
      return TRANSFORMATION_RULES.UPPERCASE;
    }
    
    // Email should be lowercase
    if (targetField.field === 'email') {
      return TRANSFORMATION_RULES.LOWERCASE;
    }
    
    // Date fields
    if (targetField.type === 'date') {
      return TRANSFORMATION_RULES.FORMAT_DATE;
    }
    
    // Phone fields
    if (targetField.type === 'phone') {
      return TRANSFORMATION_RULES.NORMALIZE_PHONE;
    }
    
    // Number fields
    if (targetField.type === 'number') {
      return TRANSFORMATION_RULES.TO_NUMBER;
    }
    
    // Default to trim
    return TRANSFORMATION_RULES.TRIM;
  };

  // Template handlers
  const handleTemplateLoad = (loadedMappings: FieldMappingData[]) => {
    // Map loaded template mappings to current source headers
    const updatedMappings = sourceHeaders.map(header => {
      const existingMapping = loadedMappings.find(m => m.sourceField === header);
      if (existingMapping) {
        return existingMapping;
      }
      
      // If not found in template, keep existing or create new
      const currentMapping = mappings.find(m => m.sourceField === header);
      return currentMapping || {
        sourceField: header,
        targetField: '',
        isRequired: false,
        transformation: TRANSFORMATION_RULES.TRIM,
        isActive: true
      };
    });
    
    setMappings(updatedMappings);
    setValidationErrors([]);
    setSuccessMessage('Template loaded successfully!');
  };

  const handleTemplateSave = (templateName: string) => {
    setSuccessMessage(`Template "${templateName}" saved successfully!`);
  };

  const handleTemplateError = (error: string) => {
    onError(error);
  };

  // Update mapping
  const updateMapping = (index: number, updates: Partial<FieldMappingData>) => {
    setMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, ...updates } : mapping
    ));
    
    // Clear validation errors when mappings change
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  // Toggle mapping active state
  const toggleMapping = (index: number) => {
    updateMapping(index, { isActive: !mappings[index].isActive });
  };

  // Validate mappings
  const validateMappings = (): string[] => {
    console.log('Current mappings:', mappings);
    console.log('Active mappings:', mappings.filter(m => m.isActive && m.targetField));
    const errors: string[] = [];
    const targetFieldCount = new Map<string, number>();
    
    // Check for required fields
    const requiredFields = availableTargetFields.filter(field => field.required);
    const activeMappings = mappings.filter(m => m.isActive && m.targetField);
    
    for (const requiredField of requiredFields) {
      const isMapped = activeMappings.some(m => m.targetField === requiredField.field);
      if (!isMapped) {
        errors.push(`Required field "${requiredField.label}" is not mapped`);
      }
    }
    
    // Count occurrences of each target field
    for (const mapping of activeMappings) {
      if (mapping.targetField) {
        const count = targetFieldCount.get(mapping.targetField) || 0;
        targetFieldCount.set(mapping.targetField, count + 1);
      }
    }
    
    // Check for duplicates
    targetFieldCount.forEach((count, fieldName) => {
      if (count > 1) {
        const targetField = availableTargetFields.find(f => f.field === fieldName);
        errors.push(`Field "${targetField?.label}" is mapped ${count} times`);
      }
    });
    
    // Check if at least one field is mapped
    if (activeMappings.length === 0) {
      errors.push('At least one field must be mapped');
    }
    
    return errors;
  };

  // Handle confirm mappings
  const handleConfirmMappings = () => {
    const errors = validateMappings();
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      onError(`Mapping validation failed: ${errors.join(', ')}`);
      return;
    }
    
    const activeMappings = mappings.filter(m => m.isActive && m.targetField);
    onMappingConfirmed(activeMappings);
  };

  // Group target fields
  const groupedTargetFields = availableTargetFields.reduce((groups, field) => {
    if (!groups[field.group]) {
      groups[field.group] = [];
    }
    groups[field.group].push(field);
    return groups;
  }, {} as Record<string, TargetField[]>);

  // Icons
  const CheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );

  const AlertIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const SuccessIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  );

  const getImportTypeLabel = (type: FileImportType): string => {
    switch (type) {
      case 'CustomerData': return 'Customer Data';
      case 'SchemeData': return 'Scheme Data';
      case 'TransactionData': return 'Transaction Data';
      default: return 'Data';
    }
  };

  return (
    <div style={{ padding: '40px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', textAlign: 'center' as const }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          Map File Columns to Database Fields
        </h2>
        <p style={{
          fontSize: '16px',
          color: colors.utility.secondaryText
        }}>
          Connect your file columns to the appropriate database fields
        </p>
      </div>

      {/* File Info */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        textAlign: 'center' as const
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '4px'
        }}>
          {fileName}
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText
        }}>
          {sourceHeaders.length} columns detected • {getImportTypeLabel(importType)} import
        </div>
      </div>

      {/* Template Management */}
      <div style={{
        marginBottom: '32px',
        padding: '20px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              Mapping Templates
            </h3>
            <p style={{
              fontSize: '13px',
              color: colors.utility.secondaryText
            }}>
              Save your current mappings or load a previously saved template
            </p>
          </div>
        </div>

        <TemplateManager
          importType={importType}
          currentMappings={mappings}
          onTemplateLoad={handleTemplateLoad}
          onTemplateSave={handleTemplateSave}
          onError={handleTemplateError}
          disabled={disabled}
        />
      </div>

      {/* Success Message */}
      {successMessage && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: colors.semantic.success + '10',
          border: `1px solid ${colors.semantic.success}30`,
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ color: colors.semantic.success }}>
              <SuccessIcon />
            </div>
            <span style={{
              fontSize: '14px',
              fontWeight: '500',
              color: colors.semantic.success
            }}>
              {successMessage}
            </span>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div style={{
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: colors.semantic.error + '10',
          border: `1px solid ${colors.semantic.error}30`,
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <div style={{ color: colors.semantic.error }}>
              <AlertIcon />
            </div>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.semantic.error
            }}>
              Mapping Issues Found
            </span>
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: '13px',
            color: colors.semantic.error
          }}>
            {[...new Set(validationErrors)].map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mapping Interface */}
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        overflow: 'hidden',
        marginBottom: '32px'
      }}>
        {/* Header Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 1fr 150px 40px',
          gap: '16px',
          padding: '16px 20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderBottom: `1px solid ${colors.utility.primaryText}10`,
          fontSize: '12px',
          fontWeight: '600',
          color: colors.utility.secondaryText
        }}>
          <div style={{ textAlign: 'center' as const }}>SKIP</div>
          <div>SOURCE COLUMN</div>
          <div>TARGET FIELD</div>
          <div>TRANSFORMATION</div>
          <div style={{ textAlign: 'center' as const }}>REQ</div>
        </div>

        {/* Mapping Rows */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {mappings.map((mapping, index) => (
            <MappingRow
              key={`${mapping.sourceField}-${index}`}
              mapping={mapping}
              availableTargetFields={groupedTargetFields}
              onUpdate={(updates) => updateMapping(index, updates)}
              onToggle={() => toggleMapping(index)}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          textAlign: 'center' as const
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.brand.primary,
            marginBottom: '4px'
          }}>
            {mappings.filter(m => m.isActive && m.targetField).length}
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            Mapped Fields
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          textAlign: 'center' as const
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.semantic.success,
            marginBottom: '4px'
          }}>
            {availableTargetFields.filter(f => f.required).length}
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            Required Fields
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          textAlign: 'center' as const
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.utility.secondaryText,
            marginBottom: '4px'
          }}>
            {mappings.filter(m => !m.isActive).length}
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            Skipped Columns
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div style={{ textAlign: 'center' as const }}>
        <button
          onClick={handleConfirmMappings}
          disabled={disabled || validationErrors.length > 0}
          style={{
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: disabled || validationErrors.length > 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto',
            opacity: disabled || validationErrors.length > 0 ? 0.6 : 1,
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            if (!disabled && validationErrors.length === 0) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${colors.brand.primary}30`;
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <CheckIcon />
          Confirm Field Mapping
        </button>

        <p style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          marginTop: '12px'
        }}>
          Review your mappings and proceed to processing
        </p>
      </div>
    </div>
  );
};

export default FieldMapping;