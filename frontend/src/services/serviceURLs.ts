// frontend/src/services/serviceURLs.ts

// API Base URL from environment variable
const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8080') + '/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: `${API_BASE}/auth/login`,
    REGISTER: `${API_BASE}/auth/register`,
    ME: `${API_BASE}/auth/me`,
    CHANGE_PASSWORD: `${API_BASE}/auth/change-password`,
    ENVIRONMENT: `${API_BASE}/auth/environment`,
  },
  
  // Contact management endpoints (includes channel operations)
  CONTACTS: {
    LIST: `${API_BASE}/contacts`,
    CREATE: `${API_BASE}/contacts`,
    GET: (id: number) => `${API_BASE}/contacts/${id}`,
    UPDATE: (id: number) => `${API_BASE}/contacts/${id}`,
    DELETE: (id: number) => `${API_BASE}/contacts/${id}`,
    SEARCH: (query: string) => `${API_BASE}/contacts/search/${encodeURIComponent(query)}`,
    STATS: `${API_BASE}/contacts/stats`,
    CHECK_EXISTS: `${API_BASE}/contacts/check-exists`,
    EXPORT: `${API_BASE}/contacts/export`,
    BULK_ACTIONS: `${API_BASE}/contacts/bulk`,
    
    // Convert contact to customer
    CONVERT_TO_CUSTOMER: (contactId: number) => `${API_BASE}/contacts/${contactId}/convert-to-customer`,
    
    // Channel operations (integrated within contact service)
    ADD_CHANNEL: (contactId: number) => `${API_BASE}/contacts/${contactId}/channels`,
    UPDATE_CHANNEL: (contactId: number, channelId: number) => 
      `${API_BASE}/contacts/${contactId}/channels/${channelId}`,
    DELETE_CHANNEL: (contactId: number, channelId: number) => 
      `${API_BASE}/contacts/${contactId}/channels/${channelId}`,
    SET_PRIMARY_CHANNEL: (contactId: number, channelId: number) => 
      `${API_BASE}/contacts/${contactId}/channels/${channelId}/primary`,
  },
  
  // Customer management endpoints
  CUSTOMERS: {
    LIST: `${API_BASE}/customers`,
    CREATE: `${API_BASE}/customers`,
    GET: (id: number) => `${API_BASE}/customers/${id}`,
    UPDATE: (id: number) => `${API_BASE}/customers/${id}`,
    DELETE: (id: number) => `${API_BASE}/customers/${id}`,
    STATS: `${API_BASE}/customers/stats`,
    
    // Address operations
    ADD_ADDRESS: (customerId: number) => `${API_BASE}/customers/${customerId}/addresses`,
    UPDATE_ADDRESS: (customerId: number, addressId: number) => 
      `${API_BASE}/customers/${customerId}/addresses/${addressId}`,
    DELETE_ADDRESS: (customerId: number, addressId: number) => 
      `${API_BASE}/customers/${customerId}/addresses/${addressId}`,
  },
  
  // Data Import endpoints
  IMPORT: {
    UPLOAD: `${API_BASE}/import/upload`,
    HEADERS: (fileId: number) => `${API_BASE}/import/headers/${fileId}`,
    VALIDATE_MAPPING: `${API_BASE}/import/validate-mapping`,
    PROCESS: `${API_BASE}/import/process`,
    STATUS: (sessionId: number) => `${API_BASE}/import/status/${sessionId}`,
    RESULTS: (sessionId: number) => `${API_BASE}/import/results/${sessionId}`,
    CANCEL: (sessionId: number) => `${API_BASE}/import/cancel/${sessionId}`,
    TEMPLATES: `${API_BASE}/import/templates`,
    TEMPLATE: (templateId: number) => `${API_BASE}/import/templates/${templateId}`,
    SESSIONS: `${API_BASE}/import/sessions`,
    EXPORT_ERRORS: (sessionId: number) => `${API_BASE}/import/export-errors/${sessionId}`,
    N8N_CALLBACK: `${API_BASE}/import/n8n-callback`,
    FILE_INFO: (fileId: number) => `${API_BASE}/import/file-info/${fileId}`,
    DELETE_FILE: (fileId: number) => `${API_BASE}/import/file/${fileId}`,
  },
  
  // NAV Tracking endpoints
  NAV: {
    SEARCH_SCHEMES: `${API_BASE}/nav/schemes/search`,
    BOOKMARKS: `${API_BASE}/nav/bookmarks`,
    UPDATE_BOOKMARK: (id: number) => `${API_BASE}/nav/bookmarks/${id}`,
    DELETE_BOOKMARK: (id: number) => `${API_BASE}/nav/bookmarks/${id}`,
    NAV_DATA: `${API_BASE}/nav/data`,
    LATEST_NAV: (schemeId: number) => `${API_BASE}/nav/schemes/${schemeId}/latest`,
    DOWNLOAD_DAILY: `${API_BASE}/nav/download/daily`,
    DOWNLOAD_HISTORICAL: `${API_BASE}/nav/download/historical`,
    DOWNLOAD_PROGRESS: (jobId: number) => `${API_BASE}/nav/download/progress/${jobId}`,
    DOWNLOAD_JOBS: `${API_BASE}/nav/download/jobs`,
    CANCEL_DOWNLOAD: (jobId: number) => `${API_BASE}/nav/download/jobs/${jobId}`,
    ACTIVE_DOWNLOADS: `${API_BASE}/nav/download/active`,
    STATISTICS: `${API_BASE}/nav/statistics`,
    CHECK_TODAY: `${API_BASE}/nav/check-today`,
    HEALTH: `${API_BASE}/nav/health`,
    DOCS: `${API_BASE}/nav/docs`,
    
    // Scheduler endpoints
    SCHEDULER_CONFIG: `${API_BASE}/nav/scheduler/config`,
    SCHEDULER_CONFIG_UPDATE: (id: number) => `${API_BASE}/nav/scheduler/config/${id}`,
    SCHEDULER_STATUS: `${API_BASE}/nav/scheduler/status`,
    SCHEDULER_TRIGGER: `${API_BASE}/nav/scheduler/trigger`,
    SCHEDULER_ALL_ACTIVE: `${API_BASE}/nav/scheduler/all-active`,
  },
  
  // File management endpoints (for future sprints)
  FILES: {
    UPLOAD: `${API_BASE}/files/upload`,
    LIST: `${API_BASE}/files`,
    GET: (id: number) => `${API_BASE}/files/${id}`,
    DELETE: (id: number) => `${API_BASE}/files/${id}`,
    DOWNLOAD: (id: number) => `${API_BASE}/files/${id}/download`,
    
    // Import endpoints (legacy - use IMPORT instead)
    IMPORT: {
      CONTACTS: `${API_BASE}/files/import/contacts`,
      CUSTOMERS: `${API_BASE}/files/import/customers`,
      TRANSACTIONS: `${API_BASE}/files/import/transactions`,
      STATUS: (importId: number) => `${API_BASE}/files/import/${importId}/status`,
    }
  },
  
  // Dashboard endpoints (for future sprints)
  DASHBOARD: {
    STATS: `${API_BASE}/dashboard/stats`,
    RECENT_ACTIVITY: `${API_BASE}/dashboard/recent-activity`,
    PORTFOLIO_SUMMARY: `${API_BASE}/dashboard/portfolio-summary`,
  },
  
  // Communication/Alert endpoints (for future sprints)
  COMMUNICATIONS: {
    CAMPAIGNS: `${API_BASE}/communications/campaigns`,
    ALERTS: `${API_BASE}/communications/alerts`,
    RULES: `${API_BASE}/communications/rules`,
    HISTORY: `${API_BASE}/communications/history`,
    SEND: `${API_BASE}/communications/send`,
  },
  
  // System endpoints
  SYSTEM: {
    HEALTH: `${API_BASE.replace('/api', '')}/health`,
    ROOT: `${API_BASE.replace('/api', '')}/`,
  },
} as const;

// Type exports
export type AuthEndpoints = typeof API_ENDPOINTS.AUTH;
export type ContactEndpoints = typeof API_ENDPOINTS.CONTACTS;
export type CustomerEndpoints = typeof API_ENDPOINTS.CUSTOMERS;
export type ImportEndpoints = typeof API_ENDPOINTS.IMPORT;
export type NavEndpoints = typeof API_ENDPOINTS.NAV;
export type FileEndpoints = typeof API_ENDPOINTS.FILES;
export type DashboardEndpoints = typeof API_ENDPOINTS.DASHBOARD;
export type CommunicationEndpoints = typeof API_ENDPOINTS.COMMUNICATIONS;
export type SystemEndpoints = typeof API_ENDPOINTS.SYSTEM;

// Helper function to build headers with environment and tenant context
export const buildHeaders = (
  token?: string,
  tenantId?: string | number,
  environment?: 'live' | 'test',
  additionalHeaders?: Record<string, string>
): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) {
    headers['X-Tenant-ID'] = String(tenantId);
  }

  if (environment) {
    headers['X-Environment'] = environment;
  }

  return headers;
};

// Helper to build query parameters with environment context
export const buildQueryParams = (
  params: Record<string, any>,
  environment?: 'live' | 'test'
): string => {
  const queryParams = new URLSearchParams();

  // Add environment parameter automatically if provided
  if (environment) {
    queryParams.append('is_live', environment === 'live' ? 'true' : 'false');
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(item => queryParams.append(key, String(item)));
      } else {
        queryParams.append(key, String(value));
      }
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

// Error handling helpers
export const isAPIError = (error: any): boolean => {
  return error?.response?.status >= 400;
};

export const getAPIErrorMessage = (error: any): string => {
  // Match backend error format
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Request configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const;

// Contact-specific URL helpers
export const CONTACT_URLS = {
  // Get contact list with query parameters
  getContactList: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.CONTACTS.LIST}${buildQueryParams(params || {}, environment)}`,
  
  // Search contacts - Note: backend expects query in path, not as query param
  searchContacts: (query: string, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CONTACTS.SEARCH(query)}${buildQueryParams(params || {}, environment)}`,
  
  // Export contacts
  exportContacts: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CONTACTS.EXPORT}${buildQueryParams(params || {}, environment)}`,
  
  // Check contact existence
  checkContactExists: (email?: string, mobile?: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CONTACTS.CHECK_EXISTS}${buildQueryParams({ email, mobile }, environment)}`,
  
  // Get contact stats
  getContactStats: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CONTACTS.STATS}${buildQueryParams({}, environment)}`,
  
  // Convert contact to customer
  convertContactToCustomer: (contactId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CONTACTS.CONVERT_TO_CUSTOMER(contactId)}${buildQueryParams({}, environment)}`,
} as const;

// Customer-specific URL helpers
export const CUSTOMER_URLS = {
  // Get customer list with query parameters
  getCustomerList: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.CUSTOMERS.LIST}${buildQueryParams(params || {}, environment)}`,
  
  // Get customer stats
  getCustomerStats: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.STATS}${buildQueryParams({}, environment)}`,
  
  // Customer with addresses
  getCustomerWithAddresses: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.GET(customerId)}${buildQueryParams({}, environment)}`,
} as const;

// Import-specific URL helpers
export const IMPORT_URLS = {
  // File upload
  uploadFile: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.UPLOAD}${buildQueryParams({}, environment)}`,
  
  // Get file headers
  getHeaders: (fileId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.HEADERS(fileId)}${buildQueryParams({}, environment)}`,
  
  // Validate mapping
  validateMapping: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.VALIDATE_MAPPING}${buildQueryParams({}, environment)}`,
  
  // Start processing
  startProcessing: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.PROCESS}${buildQueryParams({}, environment)}`,
  
  // Get processing status
  getStatus: (sessionId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.STATUS(sessionId)}${buildQueryParams({}, environment)}`,
  
  // Get import results
  getResults: (sessionId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.RESULTS(sessionId)}${buildQueryParams(params || {}, environment)}`,
  
  // Cancel processing
  cancelProcessing: (sessionId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.CANCEL(sessionId)}${buildQueryParams({}, environment)}`,
  
  // Templates
  getTemplates: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.TEMPLATES}${buildQueryParams(params || {}, environment)}`,
  
  saveTemplate: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.TEMPLATES}${buildQueryParams({}, environment)}`,
  
  updateTemplate: (templateId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.TEMPLATE(templateId)}${buildQueryParams({}, environment)}`,
  
  deleteTemplate: (templateId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.TEMPLATE(templateId)}${buildQueryParams({}, environment)}`,
  
  // Export errors
  exportErrors: (sessionId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.EXPORT_ERRORS(sessionId)}${buildQueryParams({}, environment)}`,
  
  // File operations
  getFileInfo: (fileId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.FILE_INFO(fileId)}${buildQueryParams({}, environment)}`,
  
  deleteFile: (fileId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.DELETE_FILE(fileId)}${buildQueryParams({}, environment)}`,
} as const;

// NAV-specific URL helpers
export const NAV_URLS = {
  // Search schemes with query parameters
  searchSchemes: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.NAV.SEARCH_SCHEMES}${buildQueryParams(params || {}, environment)}`,
  
  // Get bookmarks with query parameters
  getBookmarks: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.NAV.BOOKMARKS}${buildQueryParams(params || {}, environment)}`,
  
  // Create bookmark
  createBookmark: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.BOOKMARKS}${buildQueryParams({}, environment)}`,
  
  // Update bookmark
  updateBookmark: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.UPDATE_BOOKMARK(id)}${buildQueryParams({}, environment)}`,
  
  // Delete bookmark
  deleteBookmark: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.DELETE_BOOKMARK(id)}${buildQueryParams({}, environment)}`,
  
  // Get NAV data with query parameters
  getNavData: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.NAV.NAV_DATA}${buildQueryParams(params || {}, environment)}`,
  
  // Get latest NAV for scheme
  getLatestNav: (schemeId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.LATEST_NAV(schemeId)}${buildQueryParams({}, environment)}`,
  
  // Download operations
  triggerDailyDownload: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.DOWNLOAD_DAILY}${buildQueryParams({}, environment)}`,
  
  triggerHistoricalDownload: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.DOWNLOAD_HISTORICAL}${buildQueryParams({}, environment)}`,
  
  getDownloadProgress: (jobId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.DOWNLOAD_PROGRESS(jobId)}${buildQueryParams({}, environment)}`,
  
  getDownloadJobs: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.NAV.DOWNLOAD_JOBS}${buildQueryParams(params || {}, environment)}`,
  
  cancelDownload: (jobId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.CANCEL_DOWNLOAD(jobId)}${buildQueryParams({}, environment)}`,
  
  getActiveDownloads: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.ACTIVE_DOWNLOADS}${buildQueryParams({}, environment)}`,
  
  // Statistics and monitoring
  getStatistics: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.STATISTICS}${buildQueryParams({}, environment)}`,
  
  checkTodayData: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.CHECK_TODAY}${buildQueryParams({}, environment)}`,
  
  // System endpoints
  getHealth: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.HEALTH}${buildQueryParams({}, environment)}`,
  
  getDocs: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.DOCS}${buildQueryParams({}, environment)}`,
  
  // Scheduler endpoints
  getSchedulerConfig: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.SCHEDULER_CONFIG}${buildQueryParams({}, environment)}`,
  
  saveSchedulerConfig: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.SCHEDULER_CONFIG}${buildQueryParams({}, environment)}`,
  
  updateSchedulerConfig: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.SCHEDULER_CONFIG_UPDATE(id)}${buildQueryParams({}, environment)}`,
  
  deleteSchedulerConfig: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.SCHEDULER_CONFIG}${buildQueryParams({}, environment)}`,
  
  getSchedulerStatus: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.SCHEDULER_STATUS}${buildQueryParams({}, environment)}`,
  
  triggerScheduledDownload: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.SCHEDULER_TRIGGER}${buildQueryParams({}, environment)}`,
  
  getAllActiveSchedulers: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.SCHEDULER_ALL_ACTIVE}${buildQueryParams({}, environment)}`,
} as const;

// Development logging
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 API Base URL:', API_BASE);
  console.log('📡 Available Endpoints:', {
    Auth: Object.keys(API_ENDPOINTS.AUTH).length,
    Contacts: Object.keys(API_ENDPOINTS.CONTACTS).length,
    Customers: Object.keys(API_ENDPOINTS.CUSTOMERS).length,
    Import: Object.keys(API_ENDPOINTS.IMPORT).length,
    Nav: Object.keys(API_ENDPOINTS.NAV).length,
    Files: Object.keys(API_ENDPOINTS.FILES).length,
    Dashboard: Object.keys(API_ENDPOINTS.DASHBOARD).length,
    Communications: Object.keys(API_ENDPOINTS.COMMUNICATIONS).length,
  });
  
  // Log scheduler endpoints
  console.log('📅 NAV Scheduler Endpoints:', {
    SCHEDULER_CONFIG: API_ENDPOINTS.NAV.SCHEDULER_CONFIG,
    SCHEDULER_STATUS: API_ENDPOINTS.NAV.SCHEDULER_STATUS,
    SCHEDULER_TRIGGER: API_ENDPOINTS.NAV.SCHEDULER_TRIGGER,
    SCHEDULER_ALL_ACTIVE: API_ENDPOINTS.NAV.SCHEDULER_ALL_ACTIVE,
  });
}

export default API_ENDPOINTS;