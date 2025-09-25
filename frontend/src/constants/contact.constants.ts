// frontend/src/constants/contact.constants.ts

export const CONTACT_PREFIXES = [
  { value: 'Mr', label: 'Mr.' },
  { value: 'Mrs', label: 'Mrs.' },
  { value: 'Ms', label: 'Ms.' },
  { value: 'Dr', label: 'Dr.' },
  { value: 'Prof', label: 'Prof.' }
] as const;

export const CHANNEL_TYPES = [
  { value: 'email', label: 'Email', icon: 'mail' },
  { value: 'mobile', label: 'Mobile', icon: 'phone' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'message-circle' },
  { value: 'instagram', label: 'Instagram', icon: 'instagram' },
  { value: 'twitter', label: 'Twitter', icon: 'twitter' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { value: 'other', label: 'Other', icon: 'more-horizontal' }
] as const;

export const CHANNEL_SUBTYPES = [
  { value: 'personal', label: 'Personal' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' }
] as const;

export const CONTACT_VALIDATION = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 255,
    pattern: /^[a-zA-Z\s.'-]+$/,
    message: 'Name must be 2-255 characters and contain only letters, spaces, periods, hyphens, and apostrophes'
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  mobile: {
    pattern: /^[+]?[\d\s\-()]{7,15}$/,
    message: 'Please enter a valid mobile number (7-15 digits)'
  },
  whatsapp: {
    pattern: /^[+]?[\d\s\-()]{7,15}$/,
    message: 'Please enter a valid WhatsApp number (7-15 digits)'
  },
  instagram: {
    pattern: /^@?[a-zA-Z0-9._]{1,30}$/,
    message: 'Please enter a valid Instagram handle (1-30 characters, letters, numbers, dots, underscores)'
  },
  twitter: {
    pattern: /^@?[a-zA-Z0-9_]{1,15}$/,
    message: 'Please enter a valid Twitter handle (1-15 characters, letters, numbers, underscores)'
  },
  linkedin: {
    pattern: /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$|^[a-zA-Z0-9-]+$/,
    message: 'Please enter a valid LinkedIn profile URL or username'
  }
} as const;

export const CONTACT_SEARCH_FILTERS = {
  prefix: {
    label: 'Prefix',
    options: CONTACT_PREFIXES
  },
  channelType: {
    label: 'Channel Type',
    options: CHANNEL_TYPES
  },
  hasCustomer: {
    label: 'Customer Status',
    options: [
      { value: 'true', label: 'Is Customer' },
      { value: 'false', label: 'Not Customer' },
      { value: 'all', label: 'All Contacts' }
    ]
  },
  isActive: {
    label: 'Status',
    options: [
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Inactive' },
      { value: 'all', label: 'All' }
    ]
  }
} as const;

export const CONTACT_SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'created_at_desc', label: 'Recently Added' },
  { value: 'created_at_asc', label: 'Oldest First' },
  { value: 'updated_at_desc', label: 'Recently Updated' },
  { value: 'updated_at_asc', label: 'Least Recently Updated' }
] as const;

export const PAGINATION_DEFAULTS = {
  pageSize: 50,
  pageSizeOptions: [10, 20, 50, 100]
} as const;

export const CONTACT_BULK_ACTIONS = [
  { value: 'activate', label: 'Activate Contacts', icon: 'check-circle' },
  { value: 'deactivate', label: 'Deactivate Contacts', icon: 'x-circle' },
  { value: 'export', label: 'Export Contacts', icon: 'download' },
  { value: 'delete', label: 'Delete Contacts', icon: 'trash-2', destructive: true }
] as const;

export const CONTACT_MESSAGES = {
  success: {
    created: 'Contact created successfully',
    updated: 'Contact updated successfully',
    deleted: 'Contact deleted successfully',
    activated: 'Contact activated successfully',
    deactivated: 'Contact deactivated successfully',
    channelAdded: 'Communication channel added successfully',
    channelUpdated: 'Communication channel updated successfully',
    channelRemoved: 'Communication channel removed successfully',
    bulkActivated: 'Selected contacts activated successfully',
    bulkDeactivated: 'Selected contacts deactivated successfully',
    bulkDeleted: 'Selected contacts deleted successfully'
  },
  errors: {
    notFound: 'Contact not found',
    duplicateEmail: 'A contact with this email already exists',
    duplicateMobile: 'A contact with this mobile number already exists',
    channelRequired: 'At least one communication channel is required',
    primaryChannelRequired: 'Please select a primary communication channel',
    invalidData: 'Please check your input and try again',
    networkError: 'Network error. Please try again.',
    unauthorized: 'You are not authorized to perform this action',
    validationFailed: 'Please fix the validation errors and try again'
  },
  confirmations: {
    delete: 'Are you sure you want to delete this contact? This action cannot be undone.',
    bulkDelete: 'Are you sure you want to delete the selected contacts? This action cannot be undone.',
    deactivate: 'Are you sure you want to deactivate this contact?',
    bulkDeactivate: 'Are you sure you want to deactivate the selected contacts?',
    removeChannel: 'Are you sure you want to remove this communication channel?'
  }
} as const;

export const API_ENDPOINTS = {
  contacts: '/api/contacts',
  contactChannels: '/api/contact-channels',
  contactSearch: '/api/contacts/search',
  contactExport: '/api/contacts/export',
  contactBulkActions: '/api/contacts/bulk'
} as const;