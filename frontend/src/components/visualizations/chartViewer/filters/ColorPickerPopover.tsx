// frontend/src/components/visualizations/chartViewer/filters/ColorPickerPopover.tsx
// Popover for line color customization

import React, { useState, useRef, useEffect } from 'react';
import { Palette, X } from 'lucide-react';
import type { ChartColors } from '../../../../types/chartViewer.types';
import { sanitizeHexColor } from '../../../../utils/formatters';

interface ColorPickerPopoverProps {
  color: string;
  onChange: (color: string) => void;
  colors: ChartColors;
}

const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  color,
  onChange,
  colors
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(color);
  const [hexInput, setHexInput] = useState(color);
  const [error, setError] = useState<string>('');
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update temp values when prop changes
  useEffect(() => {
    setTempColor(color);
    setHexInput(color);
  }, [color]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setError('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setError('');
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleColorChange = (newColor: string) => {
    setTempColor(newColor);
    setHexInput(newColor);
    setError('');
  };

  const handleHexInputChange = (value: string) => {
    setHexInput(value);
    setError('');

    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      setTempColor(value);
    } else if (value.length >= 7) {
      setError('Invalid hex color format');
    }
  };

  const handleApply = () => {
    const sanitized = sanitizeHexColor(tempColor, color);
    onChange(sanitized);
    setIsOpen(false);
    setError('');
  };

  const handleCancel = () => {
    setTempColor(color);
    setHexInput(color);
    setIsOpen(false);
    setError('');
  };

  // Preset colors
  const presetColors = [
    colors.brand.primary,
    colors.brand.secondary,
    colors.semantic.success,
    colors.semantic.error,
    colors.semantic.warning,
    colors.semantic.info,
    '#9333ea', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f59e0b'  // Amber
  ];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        title="Customize line color"
        aria-label="Customize line color"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          backgroundColor: colors.utility.secondaryBackground,
          color: colors.utility.primaryText,
          border: `1px solid ${colors.utility.primaryText}20`,
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          minHeight: '32px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
          e.currentTarget.style.borderColor = colors.brand.primary + '50';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
          e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            backgroundColor: color,
            border: `2px solid ${colors.utility.primaryText}20`,
            borderRadius: '4px'
          }}
        />
        <Palette size={14} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Color picker"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '280px',
            backgroundColor: colors.utility.secondaryBackground,
            border: `1px solid ${colors.utility.primaryText}10`,
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: '14px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}
            >
              Line Color
            </h4>
            <button
              onClick={handleCancel}
              aria-label="Close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                padding: 0,
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                color: colors.utility.secondaryText,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Color Picker */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="color-picker"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: colors.utility.secondaryText,
                marginBottom: '8px'
              }}
            >
              Color Picker
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                id="color-picker"
                type="color"
                value={tempColor}
                onChange={(e) => handleColorChange(e.target.value)}
                style={{
                  width: '60px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: 0
                }}
              />
              <div
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: tempColor,
                  border: `2px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
              >
                Preview
              </div>
            </div>
          </div>

          {/* Hex Input */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="hex-input"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: colors.utility.secondaryText,
                marginBottom: '6px'
              }}
            >
              Hex Code
            </label>
            <input
              id="hex-input"
              type="text"
              value={hexInput}
              onChange={(e) => handleHexInputChange(e.target.value.toUpperCase())}
              placeholder="#F83B46"
              maxLength={7}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: `1px solid ${error ? colors.semantic.error : colors.utility.primaryText + '20'}`,
                borderRadius: '4px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
            {error && (
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '11px',
                  color: colors.semantic.error
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Preset Colors */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '500',
                color: colors.utility.secondaryText,
                marginBottom: '8px'
              }}
            >
              Presets
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '8px'
              }}
            >
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => handleColorChange(presetColor)}
                  title={presetColor}
                  aria-label={`Select color ${presetColor}`}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    backgroundColor: presetColor,
                    border: tempColor === presetColor 
                      ? `3px solid ${colors.utility.primaryText}`
                      : `2px solid ${colors.utility.primaryText}20`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    padding: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px'
            }}
          >
            <button
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryText + '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.brand.secondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.brand.primary;
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPickerPopover;