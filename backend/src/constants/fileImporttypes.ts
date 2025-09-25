// backend/src/constants/fileImportTypes.ts

export const FILE_IMPORT_TYPES = {
  CUSTOMER_DATA: 'CustomerData',
  TRANSACTION_DATA: 'TransactionData'
} as const;

export type FileImportType = typeof FILE_IMPORT_TYPES[keyof typeof FILE_IMPORT_TYPES];

export const IMPORT_FOLDER_STRUCTURE = {
  [FILE_IMPORT_TYPES.CUSTOMER_DATA]: {
    pending: 'UserFiles/customers/pending',
    processed: 'UserFiles/customers/processed'
  },
  [FILE_IMPORT_TYPES.TRANSACTION_DATA]: {
    pending: 'UserFiles/transactions/pending', 
    processed: 'UserFiles/transactions/processed'
  }
} as const;

export const IMPORT_TYPE_LABELS = {
  [FILE_IMPORT_TYPES.CUSTOMER_DATA]: 'Customer Data',
  [FILE_IMPORT_TYPES.TRANSACTION_DATA]: 'Transaction Data'
} as const;

export const ALLOWED_FILE_TYPES = [
  '.csv',
  '.xlsx',
  '.xls'
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const IMPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export const RECORD_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  DUPLICATE: 'duplicate',
  SKIPPED: 'skipped'
} as const;

export const VALIDATION_PATTERNS = {
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MOBILE: /^[6-9][0-9]{9}$/,
  PINCODE: /^[0-9]{6}$/
} as const;

export const TRANSFORMATION_RULES = {
  UPPERCASE: 'uppercase',
  LOWERCASE: 'lowercase',
  TRIM: 'trim',
  NORMALIZE_PHONE: 'normalize_phone',
  FORMAT_DATE: 'format_date'
} as const;