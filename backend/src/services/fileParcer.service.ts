// backend/src/services/fileParser.service.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import * as csv from 'csv-parse';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export interface ParsedFileResult {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  fileType: 'csv' | 'excel';
  metadata: {
    fileName: string;
    fileSize: number;
    parsedAt: Date;
    encoding?: string;
    sheetName?: string;
  };
}

export interface ParseOptions {
  maxRows?: number;
  skipRows?: number;
  encoding?: BufferEncoding;
  delimiter?: string;
  sheetName?: string;
  trimHeaders?: boolean;
  trimValues?: boolean;
}

export class FileParserService {
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly DEFAULT_ENCODING: BufferEncoding = 'utf-8';
  private readonly CHUNK_SIZE = 1000; // Process in chunks for large files

  /**
   * Parse file based on extension
   */
  async parseFile(
    filePath: string, 
    options: ParseOptions = {}
  ): Promise<ParsedFileResult> {
    try {
      // Validate file exists
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      // Check file size
      if (stats.size > this.MAX_FILE_SIZE) {
        throw new Error(`File size ${stats.size} exceeds maximum allowed size of ${this.MAX_FILE_SIZE}`);
      }

      const fileName = path.basename(filePath);
      const extension = path.extname(filePath).toLowerCase();

      let result: ParsedFileResult;

      switch (extension) {
        case '.csv':
        case '.txt':
          result = await this.parseCSV(filePath, fileName, stats.size, options);
          break;
        case '.xlsx':
        case '.xls':
          result = await this.parseExcel(filePath, fileName, stats.size, options);
          break;
        default:
          throw new Error(`Unsupported file extension: ${extension}`);
      }

      return result;

    } catch (error: any) {
      console.error('Error parsing file:', error);
      throw new Error(`File parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse CSV file with streaming for large files
   */
  private async parseCSV(
    filePath: string,
    fileName: string,
    fileSize: number,
    options: ParseOptions
  ): Promise<ParsedFileResult> {
    const {
      maxRows = Number.MAX_SAFE_INTEGER,
      skipRows = 0,
      encoding = this.DEFAULT_ENCODING,
      delimiter = ',',
      trimHeaders = true,
      trimValues = true
    } = options;

    const headers: string[] = [];
    const rows: Record<string, any>[] = [];
    let rowCount = 0;
    let headersParsed = false;

    return new Promise((resolve, reject) => {
      const parser = csv.parse({
        delimiter,
        skip_empty_lines: true,
        skip_records_with_empty_values: false,
        skip_records_with_error: false,
        trim: trimValues,
        relax_quotes: true,
        relax_column_count: true,
        encoding
      });

      parser.on('readable', function() {
        let record;
        while ((record = parser.read()) !== null) {
          // Skip initial rows if specified
          if (rowCount < skipRows) {
            rowCount++;
            continue;
          }

          // Parse headers
          if (!headersParsed) {
            headers.push(...record.map((h: string) => 
              trimHeaders ? h.trim() : h
            ));
            headersParsed = true;
            continue;
          }

          // Stop if max rows reached
          if (rows.length >= maxRows) {
            parser.destroy();
            break;
          }

          // Convert array to object using headers
          const rowObject: Record<string, any> = {};
          headers.forEach((header, index) => {
            const value = record[index];
            rowObject[header] = value !== undefined && value !== null ? 
              (trimValues && typeof value === 'string' ? value.trim() : value) : 
              '';
          });

          rows.push(rowObject);
          rowCount++;
        }
      });

      parser.on('error', (error) => {
        console.error('CSV parsing error:', error);
        reject(new Error(`CSV parsing failed at row ${rowCount}: ${error.message}`));
      });

      parser.on('end', () => {
        resolve({
          headers,
          rows,
          totalRows: rows.length,
          fileType: 'csv',
          metadata: {
            fileName,
            fileSize,
            parsedAt: new Date(),
            encoding
          }
        });
      });

      // Start parsing
      const stream = fs.createReadStream(filePath, { encoding });
      stream.pipe(parser);
    });
  }

  /**
   * Parse Excel file
   */
  private async parseExcel(
    filePath: string,
    fileName: string,
    fileSize: number,
    options: ParseOptions
  ): Promise<ParsedFileResult> {
    const {
      maxRows = Number.MAX_SAFE_INTEGER,
      skipRows = 0,
      sheetName,
      trimHeaders = true,
      trimValues = true
    } = options;

    try {
      // Read file buffer
      const buffer = await fs.readFile(filePath);
      
      // Parse workbook
      const workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false,
        raw: false
      });

      // Get sheet
      const targetSheetName = sheetName || workbook.SheetNames[0];
      if (!workbook.SheetNames.includes(targetSheetName)) {
        throw new Error(`Sheet "${targetSheetName}" not found in Excel file`);
      }

      const worksheet = workbook.Sheets[targetSheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
        raw: false,
        dateNF: 'yyyy-mm-dd'
      }) as any[][];

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      // Skip rows and extract headers
      const dataStartIndex = skipRows;
      if (dataStartIndex >= jsonData.length) {
        throw new Error(`Skip rows (${skipRows}) exceeds total rows (${jsonData.length})`);
      }

      const headerRow = jsonData[dataStartIndex];
      const headers = headerRow.map((h: any) => {
        const header = String(h || '');
        return trimHeaders ? header.trim() : header;
      });

      // Parse data rows
      const rows: Record<string, any>[] = [];
      const endIndex = Math.min(
        jsonData.length, 
        dataStartIndex + 1 + maxRows
      );

      for (let i = dataStartIndex + 1; i < endIndex; i++) {
        const row = jsonData[i];
        const rowObject: Record<string, any> = {};
        
        headers.forEach((header, index) => {
          let value = row[index];
          
          // Handle different data types
          if (value instanceof Date) {
            value = value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          } else if (value !== undefined && value !== null) {
            value = String(value);
            if (trimValues && typeof value === 'string') {
              value = value.trim();
            }
          } else {
            value = '';
          }
          
          rowObject[header] = value;
        });

        rows.push(rowObject);
      }

      return {
        headers,
        rows,
        totalRows: rows.length,
        fileType: 'excel',
        metadata: {
          fileName,
          fileSize,
          parsedAt: new Date(),
          sheetName: targetSheetName
        }
      };

    } catch (error: any) {
      console.error('Excel parsing error:', error);
      throw new Error(`Excel parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse file in chunks for very large files
   */
  async parseFileInChunks(
    filePath: string,
    onChunk: (chunk: Record<string, any>[], chunkIndex: number) => Promise<void>,
    options: ParseOptions = {}
  ): Promise<{ totalRows: number; headers: string[] }> {
    const extension = path.extname(filePath).toLowerCase();
    
    if (extension !== '.csv' && extension !== '.txt') {
      throw new Error('Chunk parsing only supported for CSV files');
    }

    const {
      encoding = this.DEFAULT_ENCODING,
      delimiter = ',',
      trimHeaders = true,
      trimValues = true,
      skipRows = 0
    } = options;

    return new Promise((resolve, reject) => {
      const headers: string[] = [];
      let chunk: Record<string, any>[] = [];
      let chunkIndex = 0;
      let totalRows = 0;
      let rowCount = 0;
      let headersParsed = false;

      const parser = csv.parse({
        delimiter,
        skip_empty_lines: true,
        trim: trimValues,
        relax_quotes: true,
        encoding
      });

      parser.on('readable', async function() {
        let record;
        while ((record = parser.read()) !== null) {
          // Skip initial rows
          if (rowCount < skipRows) {
            rowCount++;
            continue;
          }

          // Parse headers
          if (!headersParsed) {
            headers.push(...record.map((h: string) => 
              trimHeaders ? h.trim() : h
            ));
            headersParsed = true;
            continue;
          }

          // Convert to object
          const rowObject: Record<string, any> = {};
          headers.forEach((header, index) => {
            const value = record[index];
            rowObject[header] = value !== undefined && value !== null ? 
              (trimValues && typeof value === 'string' ? value.trim() : value) : 
              '';
          });

          chunk.push(rowObject);
          totalRows++;

          // Process chunk when size reached
          if (chunk.length >= this.CHUNK_SIZE) {
            parser.pause();
            try {
              await onChunk(chunk, chunkIndex);
              chunkIndex++;
              chunk = [];
              parser.resume();
            } catch (error) {
              parser.destroy();
              reject(error);
            }
          }
        }
      });

      parser.on('end', async () => {
        // Process remaining chunk
        if (chunk.length > 0) {
          try {
            await onChunk(chunk, chunkIndex);
          } catch (error) {
            reject(error);
            return;
          }
        }
        resolve({ totalRows, headers });
      });

      parser.on('error', (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      });

      // Start parsing
      const stream = fs.createReadStream(filePath, { encoding });
      stream.pipe(parser);
    });
  }

  /**
   * Validate file structure
   */
  async validateFileStructure(
    filePath: string,
    requiredHeaders: string[],
    options: ParseOptions = {}
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Parse just headers (1 row)
      const result = await this.parseFile(filePath, { 
        ...options, 
        maxRows: 1 
      });

      // Check for required headers
      const missingHeaders = requiredHeaders.filter(
        required => !result.headers.includes(required)
      );

      if (missingHeaders.length > 0) {
        errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      // Check for empty headers
      const emptyHeaders = result.headers.filter(h => !h || h.trim() === '');
      if (emptyHeaders.length > 0) {
        warnings.push(`Found ${emptyHeaders.length} empty header(s)`);
      }

      // Check for duplicate headers
      const duplicates = result.headers.filter(
        (header, index) => result.headers.indexOf(header) !== index
      );
      if (duplicates.length > 0) {
        warnings.push(`Duplicate headers found: ${[...new Set(duplicates)].join(', ')}`);
      }

      // Check if file has data
      if (result.totalRows === 0) {
        warnings.push('File contains no data rows');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error: any) {
      errors.push(`File validation failed: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Get file preview (first N rows)
   */
  async getFilePreview(
    filePath: string,
    previewRows: number = 5,
    options: ParseOptions = {}
  ): Promise<ParsedFileResult> {
    return this.parseFile(filePath, {
      ...options,
      maxRows: previewRows
    });
  }
}