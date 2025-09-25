// frontend/src/constants/fileImportTypes.ts

export const FILE_IMPORT_TYPES = {
  CUSTOMER_DATA: 'CustomerData',
  TRANSACTION_DATA: 'TransactionData',
  SCHEME_DATA: 'SchemeData'
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
  },
  [FILE_IMPORT_TYPES.SCHEME_DATA]: {
    pending: 'UserFiles/schemes/pending',
    processed: 'UserFiles/schemes/processed'
  }
} as const;

export const IMPORT_TYPE_LABELS = {
  [FILE_IMPORT_TYPES.CUSTOMER_DATA]: 'Customer Data',
  [FILE_IMPORT_TYPES.TRANSACTION_DATA]: 'Transaction Data',
  [FILE_IMPORT_TYPES.SCHEME_DATA]: 'Scheme Data'
} as const;

export const IMPORT_TYPE_DESCRIPTIONS = {
  [FILE_IMPORT_TYPES.CUSTOMER_DATA]: 'Import customer information including names, contact details, and PAN',
  [FILE_IMPORT_TYPES.TRANSACTION_DATA]: 'Import transaction history and financial movements',
  [FILE_IMPORT_TYPES.SCHEME_DATA]: 'Import mutual fund scheme details and NAV information'
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

// Customer Data specific field mappings
export const CUSTOMER_DATA_FIELDS = {
  PREFIX: 'prefix',
  NAME: 'name',
  PAN: 'pan',
  IWELL_CODE: 'iwell_code',
  DATE_OF_BIRTH: 'date_of_birth',
  ANNIVERSARY_DATE: 'anniversary_date',
  FAMILY_HEAD_NAME: 'family_head_name',
  FAMILY_HEAD_IWELL_CODE: 'family_head_iwell_code',
  SURVIVAL_STATUS: 'survival_status',
  DATE_OF_DEATH: 'date_of_death',
  REFERRED_BY_NAME: 'referred_by_name',
  EMAIL: 'email',
  MOBILE: 'mobile',
  WHATSAPP: 'whatsapp',
  ADDRESS_LINE1: 'address_line1',
  ADDRESS_LINE2: 'address_line2',
  CITY: 'city',
  STATE: 'state',
  COUNTRY: 'country',
  PINCODE: 'pincode',
  ADDRESS_TYPE: 'address_type'
} as const;

// Scheme Data specific field mappings
export const SCHEME_DATA_FIELDS = {
  AMC_NAME: 'amc_name',
  SCHEME_CODE: 'scheme_code',
  SCHEME_NAME: 'scheme_name',
  SCHEME_TYPE: 'scheme_type',
  SCHEME_CATEGORY: 'scheme_category',
  SCHEME_NAV_NAME: 'scheme_nav_name',
  SCHEME_MINIMUM_AMOUNT: 'scheme_minimum_amount',
  LAUNCH_DATE: 'launch_date',
  CLOSURE_DATE: 'closure_date',
  ISIN_DIV_PAYOUT: 'isin_div_payout',
  ISIN_GROWTH: 'isin_growth',
  ISIN_DIV_REINVESTMENT: 'isin_div_reinvestment'
} as const;

export const VALIDATION_PATTERNS = {
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MOBILE: /^[6-9][0-9]{9}$/,
  PINCODE: /^[0-9]{6}$/,
  ISIN: /^[A-Z]{2}[A-Z0-9]{10}$/,  // Generic ISIN format
  AMOUNT: /^\d+(\.\d{1,2})?$/
} as const;

export const TRANSFORMATION_RULES = {
  UPPERCASE: 'uppercase',
  LOWERCASE: 'lowercase',
  TRIM: 'trim',
  NORMALIZE_PHONE: 'normalize_phone',
  FORMAT_DATE: 'format_date',
  TO_NUMBER: 'to_number'
} as const;