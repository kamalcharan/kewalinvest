// frontend/src/constants/customer.constants.ts

import { SurvivalStatus, OnboardingStatus, AddressType } from '../types/customer.types';

// Survival status options
export const SURVIVAL_STATUS_OPTIONS: Array<{
  value: SurvivalStatus;
  label: string;
  color: string;
}> = [
  { value: 'alive', label: 'Alive', color: '#10B981' },
  { value: 'deceased', label: 'Deceased', color: '#EF4444' }
];

// Onboarding status options
export const ONBOARDING_STATUS_OPTIONS: Array<{
  value: OnboardingStatus;
  label: string;
  color: string;
  bgColor: string;
}> = [
  { value: 'pending', label: 'Pending', color: '#F59E0B', bgColor: '#FEF3C7' },
  { value: 'in_progress', label: 'In Progress', color: '#3B82F6', bgColor: '#DBEAFE' },
  { value: 'completed', label: 'Completed', color: '#10B981', bgColor: '#D1FAE5' }
];

// Address type options
export const ADDRESS_TYPE_OPTIONS: Array<{
  value: AddressType;
  label: string;
  icon?: string;
}> = [
  { value: 'residential', label: 'Home', icon: '🏠' },      // Fixed: '' → 'residential'
  { value: 'office', label: 'Office', icon: '🏢' },
  { value: 'mailing', label: 'Mailing', icon: '📮' },     // Added
  { value: 'permanent', label: 'Permanent', icon: '🏡' },  // Added
  { value: 'temporary', label: 'Temporary', icon: '⏰' },  // Added
  { value: 'other', label: 'Other', icon: '📍' }
];
// Indian states for address dropdown
export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

// Pagination defaults
export const CUSTOMER_PAGINATION_DEFAULTS = {
  pageSize: 20,
  pageSizeOptions: [10, 20, 50, 100]
};

// Form validation rules
export const CUSTOMER_VALIDATION_RULES = {
  pan: {
    pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    message: 'PAN must be in format: AAAAA9999A (e.g., ABCDE1234F)',
    maxLength: 10
  },
  iwell_code: {
    pattern: /^[A-Z0-9]{6,12}$/,
    message: 'iWell Code must be 6-12 alphanumeric characters',
    minLength: 6,
    maxLength: 12
  },
  pincode: {
    pattern: /^[1-9][0-9]{5}$/,
    message: 'Pincode must be 6 digits (Indian format)',
    length: 6
  },
  mobile: {
    pattern: /^(\+91)?[6-9]\d{9}$/,
    message: 'Mobile number must be a valid Indian number',
    minLength: 10,
    maxLength: 13
  },
  age: {
    min: 1,
    max: 120,
    message: 'Age must be between 1 and 120 years'
  }
};

// Date format
export const DATE_FORMAT = {
  display: 'DD/MM/YYYY',
  input: 'YYYY-MM-DD',
  api: 'YYYY-MM-DD'
};

// Age calculation
export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Format PAN for display (masked)
export const formatPAN = (pan: string): string => {
  if (!pan || pan.length < 10) return pan;
  return `${pan.substring(0, 3)}XXX${pan.substring(6, 8)}XX`;
};

// Format date for display
export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Get birthday/anniversary month name
export const getMonthName = (month: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
};

// Check if birthday/anniversary is upcoming (within 30 days)
export const isUpcoming = (date: string): boolean => {
  if (!date) return false;
  
  const today = new Date();
  const eventDate = new Date(date);
  
  // Set year to current year for comparison
  eventDate.setFullYear(today.getFullYear());
  
  // If event already passed this year, check for next year
  if (eventDate < today) {
    eventDate.setFullYear(today.getFullYear() + 1);
  }
  
  // Calculate days difference
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 && diffDays <= 30;
};

// Customer status badge config
export const getCustomerStatusBadge = (customer: any) => {
  if (!customer.is_active) {
    return { label: 'Inactive', color: '#6B7280', bgColor: '#F3F4F6' };
  }
  
  if (customer.survival_status === 'deceased') {
    return { label: 'Deceased', color: '#EF4444', bgColor: '#FEE2E2' };
  }
  
  switch (customer.onboarding_status) {
    case 'completed':
      return { label: 'Active', color: '#10B981', bgColor: '#D1FAE5' };
    case 'in_progress':
      return { label: 'Onboarding', color: '#3B82F6', bgColor: '#DBEAFE' };
    case 'pending':
      return { label: 'Pending', color: '#F59E0B', bgColor: '#FEF3C7' };
    default:
      return { label: 'Unknown', color: '#6B7280', bgColor: '#F3F4F6' };
  }
};

// Export column headers for CSV
export const CUSTOMER_EXPORT_HEADERS = [
  { key: 'id', label: 'Customer ID' },
  { key: 'prefix', label: 'Prefix' },
  { key: 'name', label: 'Name' },
  { key: 'primary_email', label: 'Email' },
  { key: 'primary_mobile', label: 'Mobile' },
  { key: 'pan', label: 'PAN' },
  { key: 'iwell_code', label: 'iWell Code' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'age', label: 'Age' },
  { key: 'anniversary_date', label: 'Anniversary Date' },
  { key: 'family_head_name', label: 'Family Head' },
  { key: 'family_head_iwell_code', label: 'Family Head Code' },
  { key: 'referred_by_name', label: 'Referred By' },
  { key: 'survival_status', label: 'Survival Status' },
  { key: 'onboarding_status', label: 'Onboarding Status' },
  { key: 'address_line1', label: 'Address Line 1' },
  { key: 'address_line2', label: 'Address Line 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'Pincode' },
  { key: 'created_at', label: 'Created Date' },
  { key: 'updated_at', label: 'Last Updated' }
];

// Import template headers
export const CUSTOMER_IMPORT_TEMPLATE = [
  'prefix',
  'name',
  'email',
  'mobile',
  'pan',
  'iwell_code',
  'date_of_birth',
  'anniversary_date',
  'family_head_name',
  'family_head_iwell_code',
  'referred_by_name',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'pincode'
];

// File import configuration
export const FILE_IMPORT_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['.csv', '.xlsx', '.xls'],
  batchSize: 100, // Process 100 records at a time
  folders: {
    pending: '/UserFiles/pending',
    processed: '/UserFiles/processed',
    transactions_pending: '/UserTransactions/pending',
    transactions_processed: '/UserTransactions/processed'
  }
};

// Alert/Communication types
export const COMMUNICATION_TYPES = [
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'sms', label: 'SMS', icon: '💬' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '📱' }
];

// Alert triggers
export const ALERT_TRIGGERS = [
  { value: 'birthday', label: 'Birthday Reminder' },
  { value: 'anniversary', label: 'Anniversary Reminder' },
  { value: 'portfolio_update', label: 'Portfolio Update' },
  { value: 'transaction', label: 'Transaction Alert' },
  { value: 'document_ready', label: 'Document Ready' },
  { value: 'custom', label: 'Custom Message' }
];

// Default messages
export const DEFAULT_MESSAGES = {
  birthday: 'Dear {prefix} {name}, Wishing you a very Happy Birthday! 🎂',
  anniversary: 'Dear {prefix} {name}, Wishing you a Happy Anniversary! 💐',
  portfolio_update: 'Dear {prefix} {name}, Your portfolio statement is ready for review.',
  transaction: 'Dear {prefix} {name}, Transaction of {amount} has been processed.',
  document_ready: 'Dear {prefix} {name}, Your {document_type} is ready for download.'
};