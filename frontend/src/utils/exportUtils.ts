// frontend/src/utils/exportUtils.ts
// Utilities for exporting charts as images

import type { ExportOptions, ExportResult } from '../types/chartViewer.types';
import { EXPORT_CONFIG } from './chartConfig';

/**
 * Export chart element to PNG
 * Uses html2canvas library to convert DOM to image
 * 
 * @param elementId - ID of DOM element to export
 * @param options - Export configuration options
 * @returns Promise with export result
 */
export async function exportChartToPNG(
  elementId: string,
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  try {
    // Dynamically import html2canvas to reduce bundle size
    const html2canvas = await import('html2canvas');
    
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`);
    }

    // Merge with default options
    const config: ExportOptions = {
      filename: options.filename || generateFilename(),
      width: options.width || EXPORT_CONFIG.png.defaultWidth,
      height: options.height || EXPORT_CONFIG.png.defaultHeight,
      backgroundColor: options.backgroundColor || EXPORT_CONFIG.png.backgroundColor,
      format: 'png',
      quality: options.quality || EXPORT_CONFIG.png.quality
    };

    // Convert element to canvas
    // Using 'as any' to bypass TypeScript strict checking for html2canvas options
    const canvas = await html2canvas.default(element, {
      backgroundColor: config.backgroundColor,
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true,
      allowTaint: false
    } as any);

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob: Blob | null) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png',
        config.quality
      );
    });

    // Trigger download
    downloadBlob(blob, config.filename);

    return {
      success: true,
      blob
    };
  } catch (error: any) {
    console.error('Export to PNG failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to export chart'
    };
  }
}

/**
 * Generate filename for export
 * Format: chart-export-IndexName-YYYY-MM-DD.png
 * 
 * @param indexName - Optional index name to include
 * @param customPrefix - Optional custom prefix
 * @returns Generated filename
 */
export function generateFilename(
  indexName?: string,
  customPrefix?: string
): string {
  const prefix = customPrefix || EXPORT_CONFIG.filename.prefix;
  const date = formatDateForFilename(new Date());
  const extension = EXPORT_CONFIG.filename.extension;
  
  if (indexName) {
    // Sanitize index name for filename
    const sanitized = sanitizeFilename(indexName);
    return `${prefix}-${sanitized}-${date}.${extension}`;
  }
  
  return `${prefix}-${date}.${extension}`;
}

/**
 * Format date for filename
 * Format: YYYY-MM-DD
 * 
 * @param date - Date to format
 * @returns Formatted date string
 */
function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Sanitize string for use in filename
 * Removes special characters and spaces
 * 
 * @param name - String to sanitize
 * @returns Sanitized string
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '-') // Replace special chars with dash
    .replace(/--+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-|-$/g, '') // Remove leading/trailing dashes
    .toLowerCase()
    .substring(0, 50); // Limit length
}

/**
 * Download blob as file
 * Creates temporary anchor element and triggers download
 * 
 * @param blob - Blob to download
 * @param filename - Name for downloaded file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up object URL after download
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Export chart data to CSV
 * Alternative export format for data analysis
 * 
 * @param data - Chart data to export
 * @param filename - CSV filename
 * @param headers - CSV headers
 */
export function exportToCSV(
  data: any[],
  filename: string = 'chart-data.csv',
  headers?: string[]
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Generate headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Build CSV content
  const csvRows: string[] = [];
  
  // Add header row
  csvRows.push(csvHeaders.join(','));
  
  // Add data rows
  data.forEach((row) => {
    const values = csvHeaders.map((header) => {
      const value = row[header];
      
      // Handle values with commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return value !== null && value !== undefined ? value : '';
    });
    
    csvRows.push(values.join(','));
  });
  
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  downloadBlob(blob, filename);
}

/**
 * Check if html2canvas is available
 * Can be used to conditionally show export button
 * 
 * @returns Promise<boolean> indicating availability
 */
export async function isExportAvailable(): Promise<boolean> {
  try {
    await import('html2canvas');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get optimal export dimensions based on chart container
 * 
 * @param elementId - ID of chart element
 * @returns Optimal width and height
 */
export function getOptimalExportDimensions(elementId: string): {
  width: number;
  height: number;
} {
  const element = document.getElementById(elementId);
  
  if (element) {
    const rect = element.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }
  
  return {
    width: EXPORT_CONFIG.png.defaultWidth,
    height: EXPORT_CONFIG.png.defaultHeight
  };
}

/**
 * Prepare chart for export
 * Adjusts styling for better image quality
 * 
 * @param elementId - ID of chart element
 * @returns Cleanup function to restore original state
 */
export function prepareChartForExport(elementId: string): () => void {
  const element = document.getElementById(elementId);
  
  if (!element) {
    return () => {}; // No-op cleanup
  }

  // Store original styles
  const originalStyles = {
    backgroundColor: element.style.backgroundColor,
    padding: element.style.padding
  };

  // Apply export-optimized styles
  element.style.backgroundColor = '#ffffff';
  element.style.padding = '20px';

  // Return cleanup function
  return () => {
    element.style.backgroundColor = originalStyles.backgroundColor;
    element.style.padding = originalStyles.padding;
  };
}

/**
 * Add watermark to exported image (optional feature)
 * 
 * @param canvas - Canvas element
 * @param text - Watermark text
 * @param options - Watermark styling options
 */
export function addWatermark(
  canvas: HTMLCanvasElement,
  text: string,
  options: {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    fontSize?: number;
    color?: string;
    opacity?: number;
  } = {}
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const config = {
    position: options.position || 'bottom-right',
    fontSize: options.fontSize || 12,
    color: options.color || '#999999',
    opacity: options.opacity || 0.5
  };

  ctx.save();
  ctx.globalAlpha = config.opacity;
  ctx.font = `${config.fontSize}px Arial`;
  ctx.fillStyle = config.color;

  const textMetrics = ctx.measureText(text);
  const padding = 10;

  let x: number, y: number;

  switch (config.position) {
    case 'top-left':
      x = padding;
      y = config.fontSize + padding;
      break;
    case 'top-right':
      x = canvas.width - textMetrics.width - padding;
      y = config.fontSize + padding;
      break;
    case 'bottom-left':
      x = padding;
      y = canvas.height - padding;
      break;
    case 'bottom-right':
    default:
      x = canvas.width - textMetrics.width - padding;
      y = canvas.height - padding;
      break;
  }

  ctx.fillText(text, x, y);
  ctx.restore();
}