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
  
  // Contact management endpoints
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
    CONVERT_TO_CUSTOMER: (contactId: number) => `${API_BASE}/contacts/${contactId}/convert-to-customer`,
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
    ACTIVATE: (id: number) => `${API_BASE}/customers/${id}/activate`,
    STATS: `${API_BASE}/customers/stats`,
    ADD_ADDRESS: (customerId: number) => `${API_BASE}/customers/${customerId}/addresses`,
    UPDATE_ADDRESS: (customerId: number, addressId: number) => 
      `${API_BASE}/customers/${customerId}/addresses/${addressId}`,
    DELETE_ADDRESS: (customerId: number, addressId: number) => 
      `${API_BASE}/customers/${customerId}/addresses/${addressId}`,
    
    // Bookmark endpoints (NEW)
    BOOKMARK_REASONS: `${API_BASE}/customers/bookmark-reasons`,
    BOOKMARK: (id: number) => `${API_BASE}/customers/${id}/bookmark`,
  },
  
  // Scheme management endpoints
  SCHEMES: {
    LIST: `${API_BASE}/schemes`,
    CREATE: `${API_BASE}/schemes`,
    GET: (schemeCode: string) => `${API_BASE}/schemes/${schemeCode}`,
    UPDATE: (schemeCode: string) => `${API_BASE}/schemes/${schemeCode}`,
    TYPES: `${API_BASE}/schemes/types`,
    CATEGORIES: `${API_BASE}/schemes/categories`,
    MASTERS: `${API_BASE}/schemes/masters`,
    VALIDATE_ISIN: `${API_BASE}/schemes/validate-isin`,
  },
  
  // Transaction management endpoints
  TRANSACTIONS: {
    LIST: `${API_BASE}/transactions`,
    CREATE: `${API_BASE}/transactions`,
    GET: (id: number) => `${API_BASE}/transactions/${id}`,
    UPDATE: (id: number) => `${API_BASE}/transactions/${id}`,
    DELETE: (id: number) => `${API_BASE}/transactions/${id}`,
    SUMMARY: `${API_BASE}/transactions/summary`,
    UPDATE_PORTFOLIO_FLAG: (id: number) => `${API_BASE}/transactions/${id}/portfolio-flag`,
  },
  
  // Portfolio management endpoints
  PORTFOLIO: {
    HOLDINGS: `${API_BASE}/portfolio/holdings`,
    STATISTICS: `${API_BASE}/portfolio/statistics`,
    REFRESH: `${API_BASE}/portfolio/refresh`,
    CUSTOMER_PORTFOLIO: (customerId: number) => `${API_BASE}/portfolio/${customerId}`,
    CUSTOMER_TOTALS: (customerId: number) => `${API_BASE}/portfolio/${customerId}/totals`,
    SCHEME_DETAILS: (customerId: number, schemeCode: string) => 
      `${API_BASE}/portfolio/${customerId}/scheme/${schemeCode}`,
  },
  
  // JTBD (Jobs To Be Done) endpoints
  JTBD: {
    CREATE: `${API_BASE}/jtbd`,
    GET_CUSTOMER_JTBDS: (customerId: number) => `${API_BASE}/jtbd/customer/${customerId}`,
    GET: (id: number) => `${API_BASE}/jtbd/${id}`,
    UPDATE: (id: number) => `${API_BASE}/jtbd/${id}`,
    DELETE: (id: number) => `${API_BASE}/jtbd/${id}`,
    TOGGLE: (id: number) => `${API_BASE}/jtbd/${id}/toggle`,
    DASHBOARD_OVERVIEW: `${API_BASE}/jtbd/dashboard/overview`,
    CUSTOMERS_WITHOUT_JTBD: `${API_BASE}/jtbd/dashboard/customers-without-jtbd`,
    UPCOMING_ALERTS: `${API_BASE}/jtbd/dashboard/upcoming-alerts`,
    ALERTS_BY_DATE: `${API_BASE}/jtbd/dashboard/alerts-by-date`,
    COMMUNICATION_QUEUE: `${API_BASE}/jtbd/dashboard/communication-queue`,
    CUSTOMER_SUMMARY: (customerId: number) => `${API_BASE}/jtbd/customer/${customerId}/summary`,
    CUSTOMER_SCHEMES: (customerId: number) => `${API_BASE}/jtbd/schemes/${customerId}`,
    TRANSACTION_TYPES: `${API_BASE}/jtbd/transaction-types`,
    OCCURRENCES: (id: number) => `${API_BASE}/jtbd/${id}/occurrences`,
  },
  
  // Goal Management endpoints
  GOALS: {
    CREATE: `${API_BASE}/goals`,
    GET_CUSTOMER_GOALS: (customerId: number) => `${API_BASE}/goals/customer/${customerId}`,
    GET: (id: number) => `${API_BASE}/goals/${id}`,
    UPDATE: (id: number) => `${API_BASE}/goals/${id}`,
    DELETE: (id: number) => `${API_BASE}/goals/${id}`,
    RECALCULATE: (id: number) => `${API_BASE}/goals/${id}/recalculate`,
    RECALCULATE_CUSTOMER: (customerId: number) => `${API_BASE}/goals/customer/${customerId}/recalculate`,
    CUSTOMER_SUMMARY: (customerId: number) => `${API_BASE}/goals/customer/${customerId}/summary`,
    HISTORY: (id: number) => `${API_BASE}/goals/${id}/history`,
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
    BOOKMARK_NAV_DATA: (id: number) => `${API_BASE}/nav/bookmarks/${id}/nav-data`,
    BOOKMARK_STATS: (id: number) => `${API_BASE}/nav/bookmarks/${id}/stats`,
    BOOKMARK_DOWNLOAD_STATUS: (id: number) => `${API_BASE}/nav/bookmarks/${id}/download-status`,
    
    // Bookmark Gap Detection endpoints (NEW)
    BOOKMARK_GAPS: `${API_BASE}/nav/bookmark-gaps`,
    BOOKMARK_GAPS_CUSTOMER: (customerId: number) => `${API_BASE}/nav/bookmark-gaps/customer/${customerId}`,
    BOOKMARK_GAPS_SUMMARY: `${API_BASE}/nav/bookmark-gaps/summary`,
    BULK_BOOKMARK_SCHEMES: `${API_BASE}/nav/bookmarks/bulk`, 
    
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
    SCHEDULER_CONFIG: `${API_BASE}/nav/scheduler/config`,
    SCHEDULER_CONFIG_UPDATE: (id: number) => `${API_BASE}/nav/scheduler/config/${id}`,
    SCHEDULER_STATUS: `${API_BASE}/nav/scheduler/status`,
    SCHEDULER_TRIGGER: `${API_BASE}/nav/scheduler/trigger`,
    SCHEDULER_ALL_ACTIVE: `${API_BASE}/nav/scheduler/all-active`,
  },
  
  // Market Data endpoints
  MARKET: {
    // Index endpoints
    INDICES: `${API_BASE}/market/indices`,
    GET_INDEX: (id: number) => `${API_BASE}/market/indices/${id}`,
    
    // Data endpoints
    DATA: (indexId: number) => `${API_BASE}/market/data/${indexId}`,
    LATEST_DATA: (indexId: number) => `${API_BASE}/market/data/${indexId}/latest`,
    DELETE_DATA: (indexId: number) => `${API_BASE}/market/data/${indexId}`,
    
    // Download endpoints
    DOWNLOAD_HISTORICAL: `${API_BASE}/market/download/historical`,
    DOWNLOAD_EOD: `${API_BASE}/market/download/eod`,
    DOWNLOAD_EOD_ALL: `${API_BASE}/market/download/eod-all`,
    
    // Statistics & Health
    STATISTICS: `${API_BASE}/market/statistics`,
    HEALTH: `${API_BASE}/market/health`,
  },
  
  // Market Analysis endpoints (UPDATED)
  MARKET_ANALYSIS: {
    HEALTH: `${API_BASE}/market-analysis/health`,
    CALCULATE_METRICS: (indexId: number) => `${API_BASE}/market-analysis/calculate-metrics/${indexId}`,
    GET_METRICS: (indexId: number) => `${API_BASE}/market-analysis/metrics/${indexId}`,
    DASHBOARD_STATISTICS: `${API_BASE}/market-analysis/dashboard-statistics`,
    INDEX_RETURNS: `${API_BASE}/market-analysis/index-returns`,
    INDEX_VOLATILITY: (indexId: number) => `${API_BASE}/market-analysis/index-volatility/${indexId}`,
  },
  
  // File management endpoints (for future sprints)
  FILES: {
    UPLOAD: `${API_BASE}/files/upload`,
    LIST: `${API_BASE}/files`,
    GET: (id: number) => `${API_BASE}/files/${id}`,
    DELETE: (id: number) => `${API_BASE}/files/${id}`,
    DOWNLOAD: (id: number) => `${API_BASE}/files/${id}/download`,
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
export type SchemeEndpoints = typeof API_ENDPOINTS.SCHEMES;
export type TransactionEndpoints = typeof API_ENDPOINTS.TRANSACTIONS;
export type PortfolioEndpoints = typeof API_ENDPOINTS.PORTFOLIO;
export type JTBDEndpoints = typeof API_ENDPOINTS.JTBD;
export type GoalEndpoints = typeof API_ENDPOINTS.GOALS;
export type ImportEndpoints = typeof API_ENDPOINTS.IMPORT;
export type NavEndpoints = typeof API_ENDPOINTS.NAV;
export type MarketEndpoints = typeof API_ENDPOINTS.MARKET;
export type MarketAnalysisEndpoints = typeof API_ENDPOINTS.MARKET_ANALYSIS;
export type FileEndpoints = typeof API_ENDPOINTS.FILES;
export type DashboardEndpoints = typeof API_ENDPOINTS.DASHBOARD;
export type CommunicationEndpoints = typeof API_ENDPOINTS.COMMUNICATIONS;
export type SystemEndpoints = typeof API_ENDPOINTS.SYSTEM;

// Helper function to build headers
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

// Helper to build query parameters
export const buildQueryParams = (
  params: Record<string, any>,
  environment?: 'live' | 'test'
): string => {
  const queryParams = new URLSearchParams();

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
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// Transaction-specific URL helpers
export const TRANSACTION_URLS = {
  getTransactionList: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.TRANSACTIONS.LIST}${buildQueryParams(params || {}, environment)}`,
  
  getTransactionSummary: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.TRANSACTIONS.SUMMARY}${buildQueryParams({}, environment)}`,
  
  getTransaction: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.TRANSACTIONS.GET(id)}${buildQueryParams({}, environment)}`,
  
  createTransaction: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.TRANSACTIONS.CREATE}${buildQueryParams({}, environment)}`,
  
  updateTransaction: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.TRANSACTIONS.UPDATE(id)}${buildQueryParams({}, environment)}`,
  
  updatePortfolioFlag: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.TRANSACTIONS.UPDATE_PORTFOLIO_FLAG(id)}${buildQueryParams({}, environment)}`,
  
  deleteTransaction: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.TRANSACTIONS.DELETE(id)}${buildQueryParams({}, environment)}`,
} as const;

// Portfolio-specific URL helpers
export const PORTFOLIO_URLS = {
  getHoldings: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.PORTFOLIO.HOLDINGS}${buildQueryParams(params || {}, environment)}`,
  
  getStatistics: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.PORTFOLIO.STATISTICS}${buildQueryParams({}, environment)}`,
  
  refreshPortfolio: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.PORTFOLIO.REFRESH}${buildQueryParams({}, environment)}`,
  
  getCustomerPortfolio: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.PORTFOLIO.CUSTOMER_PORTFOLIO(customerId)}${buildQueryParams({}, environment)}`,
  
  getCustomerTotals: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.PORTFOLIO.CUSTOMER_TOTALS(customerId)}${buildQueryParams({}, environment)}`,
  
  getSchemeDetails: (customerId: number, schemeCode: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.PORTFOLIO.SCHEME_DETAILS(customerId, schemeCode)}${buildQueryParams({}, environment)}`,
} as const;

// JTBD-specific URL helpers
export const JTBD_URLS = {
  createJTBD: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.CREATE}${buildQueryParams({}, environment)}`,
  
  getCustomerJTBDs: (customerId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.GET_CUSTOMER_JTBDS(customerId)}${buildQueryParams(params || {}, environment)}`,
  
  getJTBD: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.GET(id)}${buildQueryParams({}, environment)}`,
  
  updateJTBD: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.UPDATE(id)}${buildQueryParams({}, environment)}`,
  
  deleteJTBD: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.DELETE(id)}${buildQueryParams({}, environment)}`,
  
  toggleJTBD: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.TOGGLE(id)}${buildQueryParams({}, environment)}`,
  
  getDashboardOverview: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.DASHBOARD_OVERVIEW}${buildQueryParams(params || {}, environment)}`,
  
  getCustomersWithoutJTBD: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.CUSTOMERS_WITHOUT_JTBD}${buildQueryParams(params || {}, environment)}`,
  
  getUpcomingAlerts: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.UPCOMING_ALERTS}${buildQueryParams(params || {}, environment)}`,
  
  getAlertsByDate: (startDate: string, endDate: string, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.ALERTS_BY_DATE}${buildQueryParams({ start_date: startDate, end_date: endDate, ...params }, environment)}`,
  
  getCommunicationQueue: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.COMMUNICATION_QUEUE}${buildQueryParams(params || {}, environment)}`,
  
  getCustomerSummary: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.CUSTOMER_SUMMARY(customerId)}${buildQueryParams({}, environment)}`,
  
  getCustomerSchemes: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.CUSTOMER_SCHEMES(customerId)}${buildQueryParams({}, environment)}`,
  
  getTransactionTypes: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.TRANSACTION_TYPES}${buildQueryParams({}, environment)}`,
  
  getOccurrences: (id: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD.OCCURRENCES(id)}${buildQueryParams(params || {}, environment)}`,
} as const;

// Goal-specific URL helpers
export const GOAL_URLS = {
  createGoal: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.GOALS.CREATE}${buildQueryParams({}, environment)}`,
  
  getCustomerGoals: (customerId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.GOALS.GET_CUSTOMER_GOALS(customerId)}${buildQueryParams(params || {}, environment)}`,
  
  getGoal: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.GOALS.GET(id)}${buildQueryParams({}, environment)}`,
  
  updateGoal: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.GOALS.UPDATE(id)}${buildQueryParams({}, environment)}`,
  
  deleteGoal: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.GOALS.DELETE(id)}${buildQueryParams({}, environment)}`,
  
  recalculateGoal: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.GOALS.RECALCULATE(id)}${buildQueryParams({}, environment)}`,
  
  recalculateCustomerGoals: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.GOALS.RECALCULATE_CUSTOMER(customerId)}${buildQueryParams({}, environment)}`,
  
  getCustomerSummary: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.GOALS.CUSTOMER_SUMMARY(customerId)}${buildQueryParams({}, environment)}`,
  
  getGoalHistory: (id: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.GOALS.HISTORY(id)}${buildQueryParams(params || {}, environment)}`,
} as const;

// Contact-specific URL helpers
export const CONTACT_URLS = {
  getContactList: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.CONTACTS.LIST}${buildQueryParams(params || {}, environment)}`,
  searchContacts: (query: string, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CONTACTS.SEARCH(query)}${buildQueryParams(params || {}, environment)}`,
  exportContacts: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CONTACTS.EXPORT}${buildQueryParams(params || {}, environment)}`,
  checkContactExists: (email?: string, mobile?: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CONTACTS.CHECK_EXISTS}${buildQueryParams({ email, mobile }, environment)}`,
  getContactStats: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CONTACTS.STATS}${buildQueryParams({}, environment)}`,
  convertContactToCustomer: (contactId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CONTACTS.CONVERT_TO_CUSTOMER(contactId)}${buildQueryParams({}, environment)}`,
} as const;

// Customer-specific URL helpers
export const CUSTOMER_URLS = {
  getCustomerList: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.CUSTOMERS.LIST}${buildQueryParams(params || {}, environment)}`,
  getCustomerStats: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.STATS}${buildQueryParams({}, environment)}`,
  getCustomerWithAddresses: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.GET(customerId)}${buildQueryParams({}, environment)}`,
  
  // Bookmark URL helpers (NEW)
  getBookmarkReasons: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.BOOKMARK_REASONS}${buildQueryParams({}, environment)}`,
  addBookmark: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.BOOKMARK(customerId)}${buildQueryParams({}, environment)}`,
  updateBookmark: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.BOOKMARK(customerId)}${buildQueryParams({}, environment)}`,
  removeBookmark: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.BOOKMARK(customerId)}${buildQueryParams({}, environment)}`,
} as const;

// Import-specific URL helpers
export const IMPORT_URLS = {
  uploadFile: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.UPLOAD}${buildQueryParams({}, environment)}`,
  getHeaders: (fileId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.HEADERS(fileId)}${buildQueryParams({}, environment)}`,
  validateMapping: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.VALIDATE_MAPPING}${buildQueryParams({}, environment)}`,
  startProcessing: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.PROCESS}${buildQueryParams({}, environment)}`,
  getStatus: (sessionId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.STATUS(sessionId)}${buildQueryParams({}, environment)}`,
  getResults: (sessionId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.RESULTS(sessionId)}${buildQueryParams(params || {}, environment)}`,
  cancelProcessing: (sessionId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.CANCEL(sessionId)}${buildQueryParams({}, environment)}`,
  getTemplates: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.TEMPLATES}${buildQueryParams(params || {}, environment)}`,
  saveTemplate: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.TEMPLATES}${buildQueryParams({}, environment)}`,
  updateTemplate: (templateId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.TEMPLATE(templateId)}${buildQueryParams({}, environment)}`,
  deleteTemplate: (templateId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.TEMPLATE(templateId)}${buildQueryParams({}, environment)}`,
  exportErrors: (sessionId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.EXPORT_ERRORS(sessionId)}${buildQueryParams({}, environment)}`,
  getFileInfo: (fileId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.FILE_INFO(fileId)}${buildQueryParams({}, environment)}`,
  deleteFile: (fileId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.DELETE_FILE(fileId)}${buildQueryParams({}, environment)}`,
} as const;

// NAV-specific URL helpers
export const NAV_URLS = {
  searchSchemes: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.NAV.SEARCH_SCHEMES}${buildQueryParams(params || {}, environment)}`,
  getSequentialProgress: (parentJobId: number, environment?: 'live' | 'test') =>
    `${API_BASE}/nav/downloads/${parentJobId}/sequential-progress${buildQueryParams({}, environment)}`,
  getBookmarks: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.NAV.BOOKMARKS}${buildQueryParams(params || {}, environment)}`,
  createBookmark: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.BOOKMARKS}${buildQueryParams({}, environment)}`,
  updateBookmark: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.UPDATE_BOOKMARK(id)}${buildQueryParams({}, environment)}`,
  deleteBookmark: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.DELETE_BOOKMARK(id)}${buildQueryParams({}, environment)}`,
  getBookmarkNavData: (id: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.BOOKMARK_NAV_DATA(id)}${buildQueryParams(params || {}, environment)}`,
  getBookmarkStats: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.BOOKMARK_STATS(id)}${buildQueryParams({}, environment)}`,
  updateBookmarkDownloadStatus: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.BOOKMARK_DOWNLOAD_STATUS(id)}${buildQueryParams({}, environment)}`,
  
  // Bookmark Gap Detection URL helpers (NEW)
  getBookmarkGaps: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.BOOKMARK_GAPS}${buildQueryParams(params || {}, environment)}`,
  getCustomerBookmarkGaps: (customerId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.BOOKMARK_GAPS_CUSTOMER(customerId)}${buildQueryParams(params || {}, environment)}`,
  getBookmarkGapsSummary: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.BOOKMARK_GAPS_SUMMARY}${buildQueryParams({}, environment)}`,
  bulkBookmarkSchemes: (environment?: 'live' | 'test') =>  
    `${API_ENDPOINTS.NAV.BULK_BOOKMARK_SCHEMES}${buildQueryParams({}, environment)}`, 
  
  getNavData: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.NAV.NAV_DATA}${buildQueryParams(params || {}, environment)}`,
  getLatestNav: (schemeId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.LATEST_NAV(schemeId)}${buildQueryParams({}, environment)}`,
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
  getStatistics: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.STATISTICS}${buildQueryParams({}, environment)}`,
  checkTodayData: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.CHECK_TODAY}${buildQueryParams({}, environment)}`,
  getHealth: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.HEALTH}${buildQueryParams({}, environment)}`,
  getDocs: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.DOCS}${buildQueryParams({}, environment)}`,
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

// Market Data-specific URL helpers
export const MARKET_URLS = {
  getAllIndices: (params?: Record<string, any>, environment?: 'live' | 'test') => 
    `${API_ENDPOINTS.MARKET.INDICES}${buildQueryParams(params || {}, environment)}`,
  
  getIndex: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET.GET_INDEX(id)}${buildQueryParams({}, environment)}`,
  
  getMarketData: (indexId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET.DATA(indexId)}${buildQueryParams(params || {}, environment)}`,
  
  getLatestData: (indexId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET.LATEST_DATA(indexId)}${buildQueryParams({}, environment)}`,
  
  deleteAllData: (indexId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET.DELETE_DATA(indexId)}${buildQueryParams({}, environment)}`,
  
  downloadHistorical: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET.DOWNLOAD_HISTORICAL}${buildQueryParams({}, environment)}`,
  
  downloadEOD: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET.DOWNLOAD_EOD}${buildQueryParams({}, environment)}`,
  
  downloadEODAll: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET.DOWNLOAD_EOD_ALL}${buildQueryParams({}, environment)}`,
  
  getStatistics: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET.STATISTICS}${buildQueryParams({}, environment)}`,
  
  getHealth: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET.HEALTH}${buildQueryParams({}, environment)}`,
} as const;

// Market Analysis-specific URL helpers (UPDATED)
export const MARKET_ANALYSIS_URLS = {
  getHealth: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.HEALTH}${buildQueryParams({}, environment)}`,
  
  calculateMetrics: (indexId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.CALCULATE_METRICS(indexId)}${buildQueryParams(params || {}, environment)}`,
  
  getLatestMetrics: (indexId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.GET_METRICS(indexId)}${buildQueryParams({}, environment)}`,
  
  getDashboardStatistics: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.DASHBOARD_STATISTICS}${buildQueryParams(params || {}, environment)}`,
  
  getIndexReturns: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.INDEX_RETURNS}${buildQueryParams(params || {}, environment)}`,
  
  getIndexVolatility: (indexId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.INDEX_VOLATILITY(indexId)}${buildQueryParams(params || {}, environment)}`,
} as const;

// Development logging
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 API Base URL:', API_BASE);
  console.log('📡 Available Endpoints:', {
    Auth: Object.keys(API_ENDPOINTS.AUTH).length,
    Contacts: Object.keys(API_ENDPOINTS.CONTACTS).length,
    Customers: Object.keys(API_ENDPOINTS.CUSTOMERS).length,
    Schemes: Object.keys(API_ENDPOINTS.SCHEMES).length,
    Transactions: Object.keys(API_ENDPOINTS.TRANSACTIONS).length,
    Portfolio: Object.keys(API_ENDPOINTS.PORTFOLIO).length,
    JTBD: Object.keys(API_ENDPOINTS.JTBD).length,
    Goals: Object.keys(API_ENDPOINTS.GOALS).length,
    Import: Object.keys(API_ENDPOINTS.IMPORT).length,
    Nav: Object.keys(API_ENDPOINTS.NAV).length,
    Market: Object.keys(API_ENDPOINTS.MARKET).length,
    MarketAnalysis: Object.keys(API_ENDPOINTS.MARKET_ANALYSIS).length,
    Files: Object.keys(API_ENDPOINTS.FILES).length,
    Dashboard: Object.keys(API_ENDPOINTS.DASHBOARD).length,
    Communications: Object.keys(API_ENDPOINTS.COMMUNICATIONS).length,
  });
  
  console.log('💰 Transaction Endpoints:', {
    LIST: API_ENDPOINTS.TRANSACTIONS.LIST,
    SUMMARY: API_ENDPOINTS.TRANSACTIONS.SUMMARY,
  });
  
  console.log('📊 Portfolio Endpoints:', {
    HOLDINGS: API_ENDPOINTS.PORTFOLIO.HOLDINGS,
    STATISTICS: API_ENDPOINTS.PORTFOLIO.STATISTICS,
  });
  
  console.log('🎯 JTBD Endpoints:', {
    CREATE: API_ENDPOINTS.JTBD.CREATE,
    DASHBOARD_OVERVIEW: API_ENDPOINTS.JTBD.DASHBOARD_OVERVIEW,
    UPCOMING_ALERTS: API_ENDPOINTS.JTBD.UPCOMING_ALERTS,
    ALERTS_BY_DATE: API_ENDPOINTS.JTBD.ALERTS_BY_DATE,
    COMMUNICATION_QUEUE: API_ENDPOINTS.JTBD.COMMUNICATION_QUEUE,
    TRANSACTION_TYPES: API_ENDPOINTS.JTBD.TRANSACTION_TYPES,
  });
  
  console.log('🎯 Goal Management Endpoints:', {
    CREATE: API_ENDPOINTS.GOALS.CREATE,
    RECALCULATE_CUSTOMER: API_ENDPOINTS.GOALS.RECALCULATE_CUSTOMER,
  });
  
  console.log('🔍 NAV Bookmark Gap Detection:', {
    BOOKMARK_GAPS: API_ENDPOINTS.NAV.BOOKMARK_GAPS,
    BOOKMARK_GAPS_SUMMARY: API_ENDPOINTS.NAV.BOOKMARK_GAPS_SUMMARY,
  });
  
  console.log('📈 Market Data Endpoints:', {
    INDICES: API_ENDPOINTS.MARKET.INDICES,
    DOWNLOAD_HISTORICAL: API_ENDPOINTS.MARKET.DOWNLOAD_HISTORICAL,
    DOWNLOAD_EOD: API_ENDPOINTS.MARKET.DOWNLOAD_EOD,
    STATISTICS: API_ENDPOINTS.MARKET.STATISTICS,
    HEALTH: API_ENDPOINTS.MARKET.HEALTH,
  });
  
  console.log('📊 Market Analysis Endpoints:', {
    HEALTH: API_ENDPOINTS.MARKET_ANALYSIS.HEALTH,
    CALCULATE_METRICS: 'POST /api/market-analysis/calculate-metrics/:indexId',
    GET_METRICS: 'GET /api/market-analysis/metrics/:indexId',
    DASHBOARD_STATISTICS: API_ENDPOINTS.MARKET_ANALYSIS.DASHBOARD_STATISTICS,
    INDEX_RETURNS: API_ENDPOINTS.MARKET_ANALYSIS.INDEX_RETURNS,
    INDEX_VOLATILITY: 'GET /api/market-analysis/index-volatility/:indexId',
  });
}

export default API_ENDPOINTS;