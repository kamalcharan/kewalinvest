// frontend/src/components/common/FormField.tsx

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

// Base field props that all field types share
interface BaseFieldProps {
  label?: string;
  name: string;
  value: string | number | boolean;
  onChange: (value: any, name: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  onBlur?: () => void; // Add onBlur to base props so all field types can use it
}

// Text input specific props
interface TextFieldProps extends BaseFieldProps {
  type: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number'| 'date';
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  showCharCount?: boolean;
  onEnterPress?: () => void;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onIconClick?: () => void;
}

// Textarea specific props
interface TextareaProps extends BaseFieldProps {
  type: 'textarea';
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
  autoResize?: boolean;
}

// Select specific props
interface SelectProps extends BaseFieldProps {
  type: 'select';
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
}

// Checkbox specific props
interface CheckboxProps extends BaseFieldProps {
  type: 'checkbox';
  label: string; // Required for checkbox
  checkboxLabel?: string; // Additional label next to checkbox
}

// Radio specific props
interface RadioProps extends BaseFieldProps {
  type: 'radio';
  options: Array<{ value: string | number; label: string; disabled?: boolean }>;
  inline?: boolean;
}

// File input specific props
interface FileProps extends BaseFieldProps {
  type: 'file';
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  onFileSelect?: (files: FileList | null) => void;
}

// Union type for all field props
type FormFieldProps = TextFieldProps | TextareaProps | SelectProps | CheckboxProps | RadioProps | FileProps;

// Ref interface for external access
export interface FormFieldRef {
  focus: () => void;
  blur: () => void;
  validate: () => boolean;
  getValue: () => any;
  setValue: (value: any) => void;
  clear: () => void;
}

const FormField = forwardRef<FormFieldRef, FormFieldProps>((props, ref) => {
  const { theme, isDarkMode } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const {
    label,
    name,
    value,
    onChange,
    error,
    helperText,
    required = false,
    disabled = false,
    className = '',
    style = {},
    fullWidth = true,
    size = 'medium',
    type,
    onBlur
  } = props;

  // Size configurations
  const sizeConfig: Record<'small' | 'medium' | 'large', { padding: string; fontSize: string; height: string }> = {
    small: { padding: '8px 12px', fontSize: '13px', height: '36px' },
    medium: { padding: '10px 12px', fontSize: '14px', height: '40px' },
    large: { padding: '12px 16px', fontSize: '16px', height: '48px' }
  };

  const currentSize = sizeConfig[size];

  // Base input styles
  const getInputStyles = () => ({
    width: fullWidth ? '100%' : 'auto',
    padding: currentSize.padding,
    fontSize: currentSize.fontSize,
    fontFamily: 'inherit',
    backgroundColor: disabled ? colors.utility.primaryText + '10' : colors.utility.primaryBackground,
    color: disabled ? colors.utility.secondaryText : colors.utility.primaryText,
    border: `1px solid ${error ? colors.semantic.error : 
                          isFocused ? colors.brand.primary : 
                          colors.utility.secondaryText + '40'}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box' as const,
    cursor: disabled ? 'not-allowed' : 'text',
    boxShadow: isFocused && !error ? `0 0 0 3px ${colors.brand.primary}20` : 'none',
    ...style
  });

  // Label styles
  const getLabelStyles = () => ({
    display: 'block',
    fontSize: '14px',
    fontWeight: '500' as const,
    marginBottom: '6px',
    color: error ? colors.semantic.error : colors.utility.primaryText,
    cursor: disabled ? 'not-allowed' : 'default'
  });

  // Helper text styles
  const getHelperTextStyles = () => ({
    fontSize: '12px',
    marginTop: '4px',
    color: error ? colors.semantic.error : colors.utility.secondaryText,
    lineHeight: '1.4'
  });

  // Common input handlers
  const handleFocus = () => {
    if (!disabled) {
      setIsFocused(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Call the onBlur prop if provided
    if (onBlur) {
      onBlur();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (type === 'text' && 'onEnterPress' in props && e.key === 'Enter') {
      props.onEnterPress?.();
    }
  };

  // Validation function
  const validate = (): boolean => {
    if (required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return false;
    }
    
    if (type === 'email' && value && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    }
    
    if (type === 'tel' && value && typeof value === 'string') {
      const phoneRegex = /^[+]?[\d\s\-()]{7,15}$/;
      return phoneRegex.test(value);
    }
    
    return true;
  };

  // Expose methods via ref for AI-friendly programmatic access
  useImperativeHandle(ref, () => ({
    focus: () => {
      const element = document.querySelector(`[name="${name}"]`) as HTMLElement;
      element?.focus();
    },
    blur: () => {
      const element = document.querySelector(`[name="${name}"]`) as HTMLElement;
      element?.blur();
    },
    validate,
    getValue: () => value,
    setValue: (newValue: any) => onChange(newValue, name),
    clear: () => {
      if (type === 'checkbox') {
        onChange(false, name);
      } else if (type === 'select' && 'multiple' in props && props.multiple) {
        onChange([], name);
      } else {
        onChange('', name);
      }
    }
  }));

  // Icons
  const EyeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const UploadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  // Render different input types
  const renderInput = (): React.ReactNode => {
    switch (type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
      case 'number':
      case 'password':
        const textProps = props as TextFieldProps;
        return (
          <div style={{ position: 'relative' }}>
            {textProps.icon && textProps.iconPosition === 'left' && (
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.utility.secondaryText,
                  cursor: textProps.onIconClick ? 'pointer' : 'default',
                  zIndex: 1
                }}
                onClick={textProps.onIconClick}
              >
                {textProps.icon}
              </div>
            )}
            
            <input
              type={type === 'password' ? (isPasswordVisible ? 'text' : 'password') : type}
              name={name}
              value={value as string}
              onChange={(e) => onChange(e.target.value, name)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyPress={handleKeyPress}
              placeholder={textProps.placeholder}
              maxLength={textProps.maxLength}
              minLength={textProps.minLength}
              pattern={textProps.pattern}
              autoComplete={textProps.autoComplete}
              disabled={disabled}
              required={required}
              style={{
                ...getInputStyles(),
                paddingLeft: textProps.icon && textProps.iconPosition === 'left' ? '40px' : currentSize.padding.split(' ')[1],
                paddingRight: (type === 'password' || (textProps.icon && textProps.iconPosition === 'right')) ? '40px' : currentSize.padding.split(' ')[1]
              }}
            />

            {/* Password visibility toggle */}
            {type === 'password' && (
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: colors.utility.secondaryText,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            )}

            {/* Right icon */}
            {textProps.icon && textProps.iconPosition === 'right' && type !== 'password' && (
              <div
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.utility.secondaryText,
                  cursor: textProps.onIconClick ? 'pointer' : 'default'
                }}
                onClick={textProps.onIconClick}
              >
                {textProps.icon}
              </div>
            )}

            {/* Character count */}
            {textProps.showCharCount && textProps.maxLength && (
              <div style={{
                position: 'absolute',
                right: '8px',
                bottom: '-20px',
                fontSize: '11px',
                color: colors.utility.secondaryText
              }}>
                {(value as string).length}/{textProps.maxLength}
              </div>
            )}
          </div>
        );

      case 'textarea':
        const textareaProps = props as TextareaProps;
        return (
          <div style={{ position: 'relative' }}>
            <textarea
              name={name}
              value={value as string}
              onChange={(e) => onChange(e.target.value, name)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={textareaProps.placeholder}
              rows={textareaProps.rows || 3}
              maxLength={textareaProps.maxLength}
              disabled={disabled}
              required={required}
              style={{
                ...getInputStyles(),
                height: 'auto',
                minHeight: `${(textareaProps.rows || 3) * 24 + 20}px`,
                resize: textareaProps.autoResize ? 'none' : 'vertical',
                paddingTop: '10px',
                paddingBottom: textareaProps.showCharCount ? '30px' : '10px'
              }}
            />
            
            {textareaProps.showCharCount && textareaProps.maxLength && (
              <div style={{
                position: 'absolute',
                right: '12px',
                bottom: '8px',
                fontSize: '11px',
                color: colors.utility.secondaryText
              }}>
                {(value as string).length}/{textareaProps.maxLength}
              </div>
            )}
          </div>
        );

      case 'select':
        const selectProps = props as SelectProps;
        return (
          <div style={{ position: 'relative' }}>
            <select
              name={name}
              value={value as string}
              onChange={(e) => onChange(e.target.value, name)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={disabled}
              required={required}
              multiple={selectProps.multiple}
              style={{
                ...getInputStyles(),
                cursor: disabled ? 'not-allowed' : 'pointer',
                paddingRight: '40px',
                appearance: 'none' as const
              }}
            >
              {selectProps.placeholder && (
                <option value="" disabled>
                  {selectProps.placeholder}
                </option>
              )}
              {selectProps.options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
            
            <div style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.utility.secondaryText,
              pointerEvents: 'none'
            }}>
              <ChevronDownIcon />
            </div>
          </div>
        );

      case 'checkbox':
        const checkboxProps = props as CheckboxProps;
        return (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: currentSize.fontSize
          }}>
            <input
              type="checkbox"
              name={name}
              checked={value as boolean}
              onChange={(e) => onChange(e.target.checked, name)}
              disabled={disabled}
              required={required}
              style={{
                width: '18px',
                height: '18px',
                accentColor: colors.brand.primary,
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
            />
            <span style={{
              color: disabled ? colors.utility.secondaryText : colors.utility.primaryText
            }}>
              {checkboxProps.checkboxLabel || checkboxProps.label}
            </span>
          </label>
        );

      case 'radio':
        const radioProps = props as RadioProps;
        return (
          <div style={{
            display: radioProps.inline ? 'flex' : 'block',
            gap: radioProps.inline ? '16px' : '8px',
            flexWrap: 'wrap'
          }}>
            {radioProps.options.map((option) => (
              <label
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: disabled || option.disabled ? 'not-allowed' : 'pointer',
                  fontSize: currentSize.fontSize
                }}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value, name)}
                  disabled={disabled || option.disabled}
                  required={required}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: colors.brand.primary,
                    cursor: disabled || option.disabled ? 'not-allowed' : 'pointer'
                  }}
                />
                <span style={{
                  color: disabled || option.disabled ? colors.utility.secondaryText : colors.utility.primaryText
                }}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        );

      case 'file':
        const fileProps = props as FileProps;
        return (
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              name={name}
              onChange={(e) => {
                onChange(e.target.files, name);
                fileProps.onFileSelect?.(e.target.files);
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              accept={fileProps.accept}
              multiple={fileProps.multiple}
              disabled={disabled}
              required={required}
              style={{
                position: 'absolute',
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: disabled ? 'not-allowed' : 'pointer'
              }}
            />
            <div style={{
              ...getInputStyles(),
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              backgroundColor: disabled ? colors.utility.primaryText + '10' : colors.utility.secondaryBackground
            }}>
              <UploadIcon />
              <span>
                {value && (value as any) instanceof FileList && (value as any).length > 0
                  ? `${(value as any).length} file(s) selected`
                  : 'Choose file(s)'}
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={className}
      style={{
        marginBottom: '16px',
        width: fullWidth ? '100%' : 'auto',
        ...style
      }}
    >
      {/* Label (except for checkbox which handles its own label) */}
      {label && type !== 'checkbox' && (
        <label htmlFor={name} style={getLabelStyles()}>
          {label}
          {required && (
            <span style={{ color: colors.semantic.error, marginLeft: '4px' }}>*</span>
          )}
        </label>
      )}

      {/* Input */}
      {renderInput()}

      {/* Helper text or error */}
      {(helperText || error) && (
        <div style={getHelperTextStyles()}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export default FormField;