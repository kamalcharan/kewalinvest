// backend/src/services/fileParser.service.ts
import fs from 'fs';
import path from 'path';
import { ParsedFileData, FileParserOptions } from '../types/import.types';

export class FileParserService {
  
  /**
   * Parse uploaded file and extract headers and sample data
   */
  async parseFile(filePath: string, options: FileParserOptions = {}): Promise<ParsedFileData> {
    const {
      skipEmptyLines = true,
      trimHeaders = true,
      maxRows,  // No default - if not specified, read all rows
      encoding = 'utf8'
    } = options;

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      const fileExtension = path.extname(filePath).toLowerCase();
      
      // Route to appropriate parser based on file type
      switch (fileExtension) {
        case '.csv':
          return await this.parseCsvFile(filePath, { skipEmptyLines, trimHeaders, maxRows, encoding });
        
        case '.xlsx':
        case '.xls':
          return await this.parseExcelFile(filePath, { skipEmptyLines, trimHeaders, maxRows });
        
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

    } catch (error: any) {
      console.error('Error parsing file:', error);
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        errors: [error.message || 'Unknown parsing error']
      };
    }
  }

  /**
   * Parse CSV file using robust native implementation
   */
  private async parseCsvFile(filePath: string, options: FileParserOptions): Promise<ParsedFileData> {
    try {
      const fileContent = fs.readFileSync(filePath, { encoding: options.encoding as BufferEncoding });
      const errors: string[] = [];
      
      // Split into lines and handle different line endings
      let lines = fileContent.split(/\r?\n/);
      
      if (options.skipEmptyLines) {
        lines = lines.filter(line => line.trim().length > 0);
      }

      if (lines.length === 0) {
        return {
          headers: [],
          rows: [],
          totalRows: 0,
          errors: ['File is empty']
        };
      }

      // Parse CSV lines properly handling quotes and commas
      const parsedRows: string[][] = [];
      
      for (let i = 0; i < lines.length; i++) {
        try {
          const parsed = this.parseCSVLine(lines[i]);
          parsedRows.push(parsed);
        } catch (error: any) {
          errors.push(`Line ${i + 1}: ${error.message}`);
          continue;
        }
      }

      if (parsedRows.length === 0) {
        return {
          headers: [],
          rows: [],
          totalRows: 0,
          errors: ['No valid rows found', ...errors]
        };
      }

      // Extract headers
      let headers = parsedRows[0];
      if (options.trimHeaders) {
        headers = headers.map(h => String(h || '').trim());
      }
      headers = this.validateHeaders(headers);

      // Process data rows
      const dataRows = parsedRows.slice(1);
      
      // If maxRows is specified, limit the rows returned, otherwise return all
      const rowsToReturn = options.maxRows 
        ? Math.min(options.maxRows, dataRows.length)
        : dataRows.length;
      
      const rows: any[] = [];

      for (let i = 0; i < rowsToReturn; i++) {
        const row = dataRows[i];
        if (row) {
          const rowObject: any = {};
          headers.forEach((header, index) => {
            rowObject[header] = this.cleanCellValue(row[index] || '');
          });
          rows.push(rowObject);
        }
      }

      console.log(`[FileParser] Parsed CSV: ${headers.length} columns, ${dataRows.length} total rows, returning ${rows.length} rows`);

      return {
        headers,
        rows,
        totalRows: dataRows.length,  // Always return the actual total count
        errors
      };

    } catch (error: any) {
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        errors: [`CSV parsing error: ${error.message}`]
      };
    }
  }

  /**
   * Parse Excel file using dynamic import approach
   */
  private async parseExcelFile(filePath: string, options: FileParserOptions): Promise<ParsedFileData> {
    try {
      // Try to dynamically import xlsx
      let XLSX: any;
      try {
        XLSX = await import('xlsx');
      } catch (importError) {
        // If xlsx isn't available, try require
        try {
          XLSX = require('xlsx');
        } catch (requireError) {
          return {
            headers: [],
            rows: [],
            totalRows: 0,
            errors: ['Excel parsing requires xlsx package. Install with: npm install xlsx']
          };
        }
      }

      const workbook = XLSX.readFile(filePath, {
        cellStyles: false,
        cellFormulas: false,
        cellDates: true,
        cellNF: false,
        sheetStubs: false
      });

      // Use first worksheet
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('No worksheets found in Excel file');
      }

      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: 'yyyy-mm-dd',
        defval: ''
      });

      if (jsonData.length === 0) {
        return {
          headers: [],
          rows: [],
          totalRows: 0,
          errors: ['Excel file appears to be empty']
        };
      }

      // Extract headers from first row
      const headers = Object.keys(jsonData[0] as object);
      const cleanHeaders = options.trimHeaders ? 
        headers.map(h => String(h).trim()) : 
        headers.map(h => String(h));

      const validatedHeaders = this.validateHeaders(cleanHeaders);

      // Process rows - if maxRows specified, limit; otherwise return all
      const rowsToReturn = options.maxRows 
        ? jsonData.slice(0, options.maxRows)
        : jsonData;
        
      const sampleRows = rowsToReturn.map((row: any) => {
        const cleanRow: any = {};
        validatedHeaders.forEach((header, index) => {
          const originalHeader = headers[index];
          cleanRow[header] = this.cleanCellValue(row[originalHeader]);
        });
        return cleanRow;
      });

      // Get total row count from worksheet range
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const totalRows = Math.max(0, range.e.r);

      console.log(`[FileParser] Parsed Excel: ${validatedHeaders.length} columns, ${totalRows} total rows, returning ${sampleRows.length} rows`);

      return {
        headers: validatedHeaders,
        rows: sampleRows,
        totalRows: totalRows,
        errors: []
      };

    } catch (error: any) {
      console.error('Excel parsing error:', error);
      return {
        headers: [],
        rows: [],
        totalRows: 0,
        errors: [`Excel parsing error: ${error.message}`]
      };
    }
  }

  /**
   * Robust CSV line parser handling quotes, commas, and edge cases
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current);

    return result;
  }

  /**
   * Clean and normalize cell values
   */
  private cleanCellValue(value: any): any {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      // Handle common empty value representations
      if (trimmed === '' || 
          trimmed.toLowerCase() === 'null' || 
          trimmed.toLowerCase() === 'undefined' ||
          trimmed === 'N/A' ||
          trimmed === '#N/A') {
        return '';
      }

      // Remove surrounding quotes if present
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
      }

      return trimmed;
    }

    // Handle dates
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    // Handle numbers
    if (typeof value === 'number') {
      if (value > 25569 && value < 2958465) { // Excel date range
        const date = new Date((value - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      return value;
    }

    return String(value);
  }

  /**
   * Validate and clean headers
   */
  private validateHeaders(headers: string[]): string[] {
    const cleanHeaders: string[] = [];
    const seenHeaders = new Set<string>();

    headers.forEach((header, index) => {
      let cleanHeader = String(header || '').trim();
      
      // Handle empty headers
      if (!cleanHeader) {
        cleanHeader = `Column_${index + 1}`;
      }

      // Handle duplicate headers
      let finalHeader = cleanHeader;
      let counter = 1;
      while (seenHeaders.has(finalHeader)) {
        finalHeader = `${cleanHeader}_${counter}`;
        counter++;
      }

      seenHeaders.add(finalHeader);
      cleanHeaders.push(finalHeader);
    });

    return cleanHeaders;
  }

  /**
   * Get file statistics without parsing all data
   */
  async getFileStats(filePath: string): Promise<{ totalRows: number; totalColumns: number; fileSize: number }> {
    try {
      const stats = fs.statSync(filePath);
      const fileExtension = path.extname(filePath).toLowerCase();
      
      let totalRows = 0;
      let totalColumns = 0;

      if (fileExtension === '.csv') {
        const data = fs.readFileSync(filePath, 'utf8');
        const lines = data.split(/\r?\n/).filter(line => line.trim().length > 0);
        totalRows = lines.length - 1; // Subtract header row
        
        const firstLine = lines[0];
        if (firstLine) {
          totalColumns = this.parseCSVLine(firstLine).length;
        }
        
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        try {
          let XLSX: any;
          try {
            XLSX = await import('xlsx');
          } catch {
            XLSX = require('xlsx');
          }
          
          const workbook = XLSX.readFile(filePath, { cellStyles: false, cellFormulas: false });
          const sheetName = workbook.SheetNames[0];
          
          if (sheetName) {
            const worksheet = workbook.Sheets[sheetName];
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            totalRows = range.e.r;
            totalColumns = range.e.c + 1;
          }
        } catch (error) {
          console.error('Excel stats error:', error);
        }
      }

      return { totalRows, totalColumns, fileSize: stats.size };

    } catch (error: any) {
      console.error('Error getting file stats:', error);
      return { totalRows: 0, totalColumns: 0, fileSize: 0 };
    }
  }

  /**
   * Validate file format and structure
   */
  async validateFileFormat(filePath: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      if (!fs.existsSync(filePath)) {
        errors.push('File not found');
        return { isValid: false, errors };
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        errors.push('File is empty');
        return { isValid: false, errors };
      }

      if (stats.size > 50 * 1024 * 1024) {
        errors.push('File too large (max 50MB)');
      }

      const fileExtension = path.extname(filePath).toLowerCase();
      const allowedExtensions = ['.csv', '.xlsx', '.xls'];
      
      if (!allowedExtensions.includes(fileExtension)) {
        errors.push(`Unsupported file type: ${fileExtension}`);
        return { isValid: false, errors };
      }

      // Test parse with just 1 row to validate structure
      const sampleData = await this.parseFile(filePath, { maxRows: 1 });
      
      if (sampleData.errors.length > 0) {
        errors.push(...sampleData.errors);
      }

      if (sampleData.headers.length === 0) {
        errors.push('No headers detected in file');
      }

      return { isValid: errors.length === 0, errors };

    } catch (error: any) {
      errors.push(`File validation error: ${error.message}`);
      return { isValid: false, errors };
    }
  }
}