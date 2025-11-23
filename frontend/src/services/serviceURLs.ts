// frontend/src/services/serviceURLs.ts
// UPDATED: Added NAV time-series analytics endpoint
// UPDATED: Added Portfolio Snapshot endpoints
// UPDATED: Added Market Analysis bulk metrics calculation endpoint

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
    
    // Bookmark endpoints
    BOOKMARK_REASONS: `${API_BASE}/customers/bookmark-reasons`,
    BOOKMARK: (id: number) => `${API_BASE}/customers/${id}/bookmark`,

    // Family endpoints
    FAMILY_MEMBERS: (familyCode: string) => `${API_BASE}/customers/family/${familyCode}`,
  },

  // Bookmark management endpoints
  BOOKMARKS: {
    IMPORT: `${API_BASE}/bookmarks/import`,
    STATS: (tenantId: number, isLive: boolean) => 
      `${API_BASE}/bookmarks/stats?tenant_id=${tenantId}&is_live=${isLive}`,
    LIST: `${API_BASE}/bookmarks/list`,
    CHECK: (tenantId: number, isLive: boolean) => 
      `${API_BASE}/bookmarks/check?tenant_id=${tenantId}&is_live=${isLive}`,
    DELETE: (bookmarkId: number, tenantId: number, isLive: boolean) => 
      `${API_BASE}/bookmarks/${bookmarkId}?tenant_id=${tenantId}&is_live=${isLive}`,
    TEMPLATE: `${API_BASE}/bookmarks/template`,
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

    // Monthly Tracking
    GET_MONTHLY_UNITS: (customerId: number) => `${API_BASE}/portfolio/${customerId}/monthly-units`,
    GET_MONTHLY_NAV: (customerId: number) => `${API_BASE}/portfolio/${customerId}/monthly-nav`,
    GET_MONTHLY_MARKET_VALUE: (customerId: number) => `${API_BASE}/portfolio/${customerId}/monthly-market-value`,
    GET_MONTHLY_SNAPSHOTS: (customerId: number) => `${API_BASE}/portfolio/${customerId}/monthly-snapshots`,
  },
  
  // JTBD (Jobs To Be Done) endpoints - OLD (will be deprecated)
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

  // JTBD V2 - Unified (Configurations + Executions + Meetings) - NEW
  JTBD_V2: {
    // Configuration endpoints
    CONFIG: {
      LIST: `${API_BASE}/jtbd-v2/config`, // GET with filters: ?customer_id=123&category=alert&type=portfolio_alert
      CREATE: `${API_BASE}/jtbd-v2/config`,
      GET: (id: number) => `${API_BASE}/jtbd-v2/config/${id}`,
      UPDATE: (id: number) => `${API_BASE}/jtbd-v2/config/${id}`,
      DELETE: (id: number) => `${API_BASE}/jtbd-v2/config/${id}`,
    },

    // Execution endpoints (meetings, SIP plans, etc.)
    EXECUTION: {
      LIST: `${API_BASE}/jtbd-v2/execution`, // GET with filters: ?customer_id=123&type=client_meeting&status=planned
      CREATE: `${API_BASE}/jtbd-v2/execution`,
      GET: (id: number) => `${API_BASE}/jtbd-v2/execution/${id}`,
      UPDATE: (id: number) => `${API_BASE}/jtbd-v2/execution/${id}`,
      DELETE: (id: number) => `${API_BASE}/jtbd-v2/execution/${id}`,
      COMPLETE: (id: number) => `${API_BASE}/jtbd-v2/execution/${id}/complete`,
      CANCEL: (id: number) => `${API_BASE}/jtbd-v2/execution/${id}/cancel`,
    },

    // Summary/Dashboard endpoints
    UPCOMING: `${API_BASE}/jtbd-v2/upcoming`, // GET with filters: ?days=30&type=client_meeting
    CUSTOMER_SUMMARY: (customerId: number) => `${API_BASE}/jtbd-v2/customer/${customerId}/summary`,
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

    // Tracking Status
    GET_TRACKING_STATUS: (id: number) => `${API_BASE}/goals/${id}/tracking-status`,
    GET_CUSTOMER_TRACKING_STATUS: (customerId: number) => `${API_BASE}/goals/customer/${customerId}/tracking-status`,

    // Asset Allocation
    GET_ALLOCATION_UTILIZATION: (customerId: number) => `${API_BASE}/goals/customer/${customerId}/allocation-utilization`,

    // Watchlist
    ADD_TO_WATCHLIST: (id: number) => `${API_BASE}/goals/${id}/watchlist`,
    REMOVE_FROM_WATCHLIST: (id: number) => `${API_BASE}/goals/${id}/watchlist`,
    GET_WATCHLIST: (customerId: number) => `${API_BASE}/goals/customer/${customerId}/watchlist`,
  },

  // Phase 2: Goal-Investment Allocation endpoints
  GOAL_ALLOCATIONS: {
    CREATE: (goalId: number) => `${API_BASE}/goals/${goalId}/allocations`,
    LIST: (goalId: number) => `${API_BASE}/goals/${goalId}/allocations`,
    UPDATE: (goalId: number, allocationId: number) => `${API_BASE}/goals/${goalId}/allocations/${allocationId}`,
    DELETE: (goalId: number, allocationId: number) => `${API_BASE}/goals/${goalId}/allocations/${allocationId}`,
  },

  // Phase 2: Goal Calculations endpoints
  GOAL_CALCULATIONS: {
    GET: (goalId: number) => `${API_BASE}/goals/${goalId}/calculations`,
    ASSET_BREAKDOWN: (goalId: number) => `${API_BASE}/goals/${goalId}/asset-breakdown`,
  },

  // Phase 2: Investment to Goals lookup
  INVESTMENT_GOALS: {
    GET: (investmentPlanId: number) => `${API_BASE}/investments/${investmentPlanId}/goals`,
  },

  // User Preferences endpoints
  USER_PREFERENCES: {
    // Chart preferences
    GET_ALL_CHART_PREFERENCES: `${API_BASE}/user-preferences/chart`,
    GET_CHART_PREFERENCE: (indexId: number) => `${API_BASE}/user-preferences/chart/${indexId}`,
    SAVE_CHART_PREFERENCE: (indexId: number) => `${API_BASE}/user-preferences/chart/${indexId}`,
    DELETE_CHART_PREFERENCE: (indexId: number) => `${API_BASE}/user-preferences/chart/${indexId}`,

    // Default comparison index
    GET_DEFAULT_COMPARISON_INDEX: `${API_BASE}/user-preferences/default-comparison-index`,
    SET_DEFAULT_COMPARISON_INDEX: `${API_BASE}/user-preferences/default-comparison-index`,
  },

  // Customer Meetings endpoints
  MEETINGS: {
    CREATE: `${API_BASE}/meetings`,
    GET_ALL: `${API_BASE}/meetings`,
    GET: (id: number) => `${API_BASE}/meetings/${id}`,
    UPDATE: (id: number) => `${API_BASE}/meetings/${id}`,
    DELETE: (id: number) => `${API_BASE}/meetings/${id}`,
    COMPLETE: (id: number) => `${API_BASE}/meetings/${id}/complete`,
    CANCEL: (id: number) => `${API_BASE}/meetings/${id}/cancel`,
    GET_UPCOMING: `${API_BASE}/meetings/upcoming`,
    GET_CUSTOMER_SUMMARY: (customerId: number) => `${API_BASE}/meetings/customer/${customerId}/summary`,
  },

  // Family endpoints
  FAMILY: {
    MEMBERS: (familyHeadIwellCode: string) => `${API_BASE}/family/${familyHeadIwellCode}/members`,
    PORTFOLIO: (familyHeadIwellCode: string) => `${API_BASE}/family/${familyHeadIwellCode}/portfolio`,
    ASSET_ALLOCATION: (familyHeadIwellCode: string) => `${API_BASE}/family/${familyHeadIwellCode}/asset-allocation`,
    GOALS: (familyHeadIwellCode: string) => `${API_BASE}/family/${familyHeadIwellCode}/goals`,
    MEETINGS: (familyHeadIwellCode: string) => `${API_BASE}/family/${familyHeadIwellCode}/meetings`,
  },

  // Generic Jobs Scheduler endpoints
  JOBS: {
    TYPES: `${API_BASE}/jobs/types`,
    CONFIG: (jobType: string) => `${API_BASE}/jobs/${jobType}/config`,
    EXECUTE: (jobType: string) => `${API_BASE}/jobs/${jobType}/execute`,
    EXECUTIONS: (jobType: string) => `${API_BASE}/jobs/${jobType}/executions`,
    STATISTICS: (jobType: string) => `${API_BASE}/jobs/${jobType}/statistics`,
    HEALTH: (jobType: string) => `${API_BASE}/jobs/${jobType}/health`,
  },

  // Cruise Control - Portfolio Snapshots endpoints
  CRUISE_CONTROL: {
    // Dashboard & Statistics (using existing endpoints)
    NAV_STATISTICS: `${API_BASE}/nav/statistics`,
    MARKET_STATISTICS: `${API_BASE}/market/statistics`,

    // Alerts (using JTBD endpoints)
    ALERTS_UPCOMING: `${API_BASE}/jtbd/dashboard/upcoming-alerts`,
    ALERTS_BY_DATE: `${API_BASE}/jtbd/dashboard/alerts-by-date`,

    // Manual Triggers (using existing endpoints)
    NAV_DOWNLOAD: (schemeCode: string) => `${API_BASE}/nav/download/historical?scheme_code=${schemeCode}`,
    MARKET_DOWNLOAD: (indexId: number) => `${API_BASE}/market/download/eod?index_id=${indexId}`,

    // Market Downloads (using existing market endpoints)
    MARKET_DOWNLOAD_HISTORICAL: `${API_BASE}/market/download/historical`,
    MARKET_DOWNLOAD_EOD: `${API_BASE}/market/download/eod`,

    // Portfolio Snapshots
    SNAPSHOTS: {
      CONFIG: `${API_BASE}/cruise-control/snapshots/config`,
      EXECUTE: `${API_BASE}/cruise-control/snapshots/execute`,
      EXECUTIONS: `${API_BASE}/cruise-control/snapshots/executions`,
      STATISTICS: `${API_BASE}/cruise-control/snapshots/statistics`,
      HEALTH: `${API_BASE}/cruise-control/snapshots/health`,
      BACKFILL_SMART: `${API_BASE}/cruise-control/snapshots/backfill-smart`,
      BACKFILL: `${API_BASE}/cruise-control/snapshots/backfill`,
      
      // NEW: Snapshot Operations
      OPERATIONS: {
        DROP_ALL: `${API_BASE}/cruise-control/snapshots/operations/drop-all`,
        GENERATE_MISSING: `${API_BASE}/cruise-control/snapshots/operations/generate-missing`,
        UPDATE_ALL: `${API_BASE}/cruise-control/snapshots/operations/update-all`,
        REGENERATE_ALL: `${API_BASE}/cruise-control/snapshots/operations/regenerate-all`,
      },
    },
  },

  // Portfolio Snapshots (alternative structure for backward compatibility)
  PORTFOLIO_SNAPSHOTS: {
    CONFIG_BASE: `${API_BASE}/cruise-control/snapshots/config`,
    CONFIG: (tenantId: number, isLive: boolean) =>
      `${API_BASE}/cruise-control/snapshots/config?tenant_id=${tenantId}&is_live=${isLive}`,
    EXECUTE: `${API_BASE}/cruise-control/snapshots/execute`,
    EXECUTIONS: `${API_BASE}/cruise-control/snapshots/executions`,
    STATISTICS: (tenantId: number, isLive: boolean) =>
      `${API_BASE}/cruise-control/snapshots/statistics?tenant_id=${tenantId}&is_live=${isLive}`,
    BACKFILL_SMART: `${API_BASE}/cruise-control/snapshots/backfill-smart`,
    BACKFILL: `${API_BASE}/cruise-control/snapshots/backfill`,
    HEALTH: (tenantId: number, isLive: boolean) =>
      `${API_BASE}/cruise-control/snapshots/health?tenant_id=${tenantId}&is_live=${isLive}`,
    OPERATIONS: {
      DROP_ALL: `${API_BASE}/cruise-control/snapshots/operations/drop-all`,
      GENERATE_MISSING: `${API_BASE}/cruise-control/snapshots/operations/generate-missing`,
      UPDATE_ALL: `${API_BASE}/cruise-control/snapshots/operations/update-all`,
      REGENERATE_ALL: `${API_BASE}/cruise-control/snapshots/operations/regenerate-all`,
    },
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
    CHECK_SESSION_DUPLICATES: (sessionId: number) => `${API_BASE}/import/check-session-duplicates/${sessionId}`,
    SAVE_DUPLICATE_DECISION: (sessionId: number) => `${API_BASE}/import/save-duplicate-decision/${sessionId}`,
    // NEW: Restart and reprocess endpoints
    RESTART_SESSION: (sessionId: number) => `${API_BASE}/import/restart/${sessionId}`,
    EDIT_STAGING_RECORD: (stagingId: number) => `${API_BASE}/import/staging/${stagingId}/edit`,
    REPROCESS_SINGLE_RECORD: (stagingId: number) => `${API_BASE}/import/staging/${stagingId}/reprocess`,
    BULK_REPROCESS_RECORDS: (sessionId: number) => `${API_BASE}/import/session/${sessionId}/bulk-reprocess`,
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
    
    // Bookmark Gap Detection endpoints
    BOOKMARK_GAPS: `${API_BASE}/nav/bookmark-gaps`,
    BOOKMARK_GAPS_CUSTOMER: (customerId: number) => `${API_BASE}/nav/bookmark-gaps/customer/${customerId}`,
    BOOKMARK_GAPS_SUMMARY: `${API_BASE}/nav/bookmark-gaps/summary`,
    BULK_BOOKMARK_SCHEMES: `${API_BASE}/nav/bookmarks/bulk`, 
    
    NAV_DATA: `${API_BASE}/nav/data`,
    DELETE_NAV_DATA: (schemeId: number) => `${API_BASE}/nav/data/${schemeId}`,
    LATEST_NAV: (schemeId: number) => `${API_BASE}/nav/schemes/${schemeId}/latest`,
    TIME_SERIES: (schemeId: number) => `${API_BASE}/nav/timeseries/${schemeId}`, // NEW: Time series analytics
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
  
  // Market Analysis endpoints
  MARKET_ANALYSIS: {
    HEALTH: `${API_BASE}/market-analysis/health`,
    CALCULATE_METRICS: (indexId: number) => `${API_BASE}/market-analysis/calculate-metrics/${indexId}`,
    BULK_CALCULATE_METRICS: `${API_BASE}/market-analysis/bulk-calculate-metrics`, // NEW: Bulk metrics calculation
    GET_METRICS: (indexId: number) => `${API_BASE}/market-analysis/metrics/${indexId}`,
    DASHBOARD_STATISTICS: `${API_BASE}/market-analysis/dashboard-statistics`,
    INDEX_RETURNS: `${API_BASE}/market-analysis/index-returns`,
    INDEX_VOLATILITY: (indexId: number) => `${API_BASE}/market-analysis/index-volatility/${indexId}`,
  },
  
  // Scheme Analysis endpoints
  SCHEME_ANALYSIS: {
    HEALTH: `${API_BASE}/scheme-analysis/health`,
    CALCULATE_METRICS: (schemeId: number) => `${API_BASE}/scheme-analysis/calculate-metrics/${schemeId}`,
    GET_METRICS: (schemeId: number) => `${API_BASE}/scheme-analysis/metrics/${schemeId}`,
    BATCH_CALCULATE: `${API_BASE}/scheme-analysis/batch-calculate`,
  },

  // Scheme Alias endpoints (for flexible transaction imports)
  SCHEME_ALIASES: {
    LIST: `${API_BASE}/scheme-aliases`,
    CREATE: `${API_BASE}/scheme-aliases`,
    GET: (id: number) => `${API_BASE}/scheme-aliases/${id}`,
    UPDATE: (id: number) => `${API_BASE}/scheme-aliases/${id}`,
    DELETE: (id: number) => `${API_BASE}/scheme-aliases/${id}`,
    BULK_CREATE: `${API_BASE}/scheme-aliases/bulk`,
    LOOKUP: `${API_BASE}/scheme-aliases/lookup`,
    STATISTICS: `${API_BASE}/scheme-aliases/statistics`,
    BACKFILL: `${API_BASE}/scheme-aliases/backfill`,
    BACKFILL_PROGRESS: `${API_BASE}/scheme-aliases/backfill/progress`,
    BACKFILL_CANCEL: `${API_BASE}/scheme-aliases/backfill/cancel`,
  },

  // Asset Types endpoints (Release 1.1 - Phase 1: Master Data)
  ASSET_TYPES: {
    LIST: `${API_BASE}/asset-types`,
    CREATE: `${API_BASE}/asset-types`,
    GET: (id: number) => `${API_BASE}/asset-types/${id}`,
    GET_BY_CODE: (code: string) => `${API_BASE}/asset-types/code/${code}`,
    UPDATE: (id: number) => `${API_BASE}/asset-types/${id}`,
    DELETE: (id: number) => `${API_BASE}/asset-types/${id}`,
  },

  // Investment Plans endpoints (Release 1.1 - Phase 1: Full CRUD)
  INVESTMENT_PLANS: {
    // Customer Investment Plans
    LIST: (customerId: number) => `${API_BASE}/customers/${customerId}/investments`,
    CREATE: (customerId: number) => `${API_BASE}/customers/${customerId}/investments`,
    GET: (customerId: number, id: number) => `${API_BASE}/customers/${customerId}/investments/${id}`,
    UPDATE: (customerId: number, id: number) => `${API_BASE}/customers/${customerId}/investments/${id}`,
    DELETE: (customerId: number, id: number) => `${API_BASE}/customers/${customerId}/investments/${id}`,

    // Family Investment Plans
    FAMILY_SUMMARY: (familyHeadId: string) => `${API_BASE}/family/${familyHeadId}/investments`,
    FAMILY_BULK_ASSIGN: (familyHeadId: string) => `${API_BASE}/family/${familyHeadId}/investments/bulk`,
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
export type BookmarkEndpoints = typeof API_ENDPOINTS.BOOKMARKS;
export type SchemeEndpoints = typeof API_ENDPOINTS.SCHEMES;
export type TransactionEndpoints = typeof API_ENDPOINTS.TRANSACTIONS;
export type PortfolioEndpoints = typeof API_ENDPOINTS.PORTFOLIO;
export type JTBDEndpoints = typeof API_ENDPOINTS.JTBD;
export type GoalEndpoints = typeof API_ENDPOINTS.GOALS;
export type UserPreferencesEndpoints = typeof API_ENDPOINTS.USER_PREFERENCES;
export type JobsEndpoints = typeof API_ENDPOINTS.JOBS;
export type CruiseControlEndpoints = typeof API_ENDPOINTS.CRUISE_CONTROL;
export type PortfolioSnapshotsEndpoints = typeof API_ENDPOINTS.PORTFOLIO_SNAPSHOTS;
export type ImportEndpoints = typeof API_ENDPOINTS.IMPORT;
export type NavEndpoints = typeof API_ENDPOINTS.NAV;
export type MarketEndpoints = typeof API_ENDPOINTS.MARKET;
export type MarketAnalysisEndpoints = typeof API_ENDPOINTS.MARKET_ANALYSIS;
export type SchemeAnalysisEndpoints = typeof API_ENDPOINTS.SCHEME_ANALYSIS;
export type SchemeAliasEndpoints = typeof API_ENDPOINTS.SCHEME_ALIASES;
export type AssetTypesEndpoints = typeof API_ENDPOINTS.ASSET_TYPES;
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
  timeout: 300000, // 5 minutes (for long-running operations like metric calculations)
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

// JTBD V2 - Unified URL helpers (NEW - Bot-friendly)
export const JTBD_V2_URLS = {
  // Configuration operations
  getConfigs: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.CONFIG.LIST}${buildQueryParams(params || {}, environment)}`,
  createConfig: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.CONFIG.CREATE}${buildQueryParams({}, environment)}`,
  getConfig: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.CONFIG.GET(id)}${buildQueryParams({}, environment)}`,
  updateConfig: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.CONFIG.UPDATE(id)}${buildQueryParams({}, environment)}`,
  deleteConfig: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.CONFIG.DELETE(id)}${buildQueryParams({}, environment)}`,

  // Execution operations
  getExecutions: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.EXECUTION.LIST}${buildQueryParams(params || {}, environment)}`,
  createExecution: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.EXECUTION.CREATE}${buildQueryParams({}, environment)}`,
  getExecution: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.EXECUTION.GET(id)}${buildQueryParams({}, environment)}`,
  updateExecution: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.EXECUTION.UPDATE(id)}${buildQueryParams({}, environment)}`,
  deleteExecution: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.EXECUTION.DELETE(id)}${buildQueryParams({}, environment)}`,
  completeExecution: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.EXECUTION.COMPLETE(id)}${buildQueryParams({}, environment)}`,
  cancelExecution: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.EXECUTION.CANCEL(id)}${buildQueryParams({}, environment)}`,

  // Dashboard/Summary operations
  getUpcoming: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.UPCOMING}${buildQueryParams(params || {}, environment)}`,
  getCustomerSummary: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JTBD_V2.CUSTOMER_SUMMARY(customerId)}${buildQueryParams({}, environment)}`,
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

// User Preferences-specific URL helpers
export const USER_PREFERENCES_URLS = {
  getAllChartPreferences: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.USER_PREFERENCES.GET_ALL_CHART_PREFERENCES}${buildQueryParams({}, environment)}`,
  
  getChartPreference: (indexId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.USER_PREFERENCES.GET_CHART_PREFERENCE(indexId)}${buildQueryParams({}, environment)}`,
  
  saveChartPreference: (indexId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.USER_PREFERENCES.SAVE_CHART_PREFERENCE(indexId)}${buildQueryParams({}, environment)}`,
  
  deleteChartPreference: (indexId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.USER_PREFERENCES.DELETE_CHART_PREFERENCE(indexId)}${buildQueryParams({}, environment)}`,
} as const;

// Cruise Control - Portfolio Snapshots URL helpers
export const CRUISE_CONTROL_URLS = {
  getSnapshotConfig: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.CONFIG}${buildQueryParams({}, environment)}`,

  updateSnapshotConfig: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.CONFIG}${buildQueryParams({}, environment)}`,

  executeSnapshot: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.EXECUTE}${buildQueryParams({}, environment)}`,

  getSnapshotExecutions: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.EXECUTIONS}${buildQueryParams(params || {}, environment)}`,

  getSnapshotStatistics: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.STATISTICS}${buildQueryParams({}, environment)}`,

  getSnapshotHealth: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.HEALTH}${buildQueryParams({}, environment)}`,

  smartBackfill: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.BACKFILL_SMART}${buildQueryParams({}, environment)}`,

  backfill: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.BACKFILL}${buildQueryParams(params || {}, environment)}`,

  // NEW: Snapshot Operations URL helpers
  dropAllSnapshots: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.OPERATIONS.DROP_ALL}${buildQueryParams({}, environment)}`,

  generateMissingSnapshots: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.OPERATIONS.GENERATE_MISSING}${buildQueryParams({}, environment)}`,

  updateAllSnapshots: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.OPERATIONS.UPDATE_ALL}${buildQueryParams({}, environment)}`,

  regenerateAllSnapshots: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.OPERATIONS.REGENERATE_ALL}${buildQueryParams({}, environment)}`,
} as const;

// Jobs Scheduler-specific URL helpers
export const JOBS_URLS = {
  getJobTypes: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JOBS.TYPES}${buildQueryParams({}, environment)}`,
  
  getConfig: (jobType: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JOBS.CONFIG(jobType)}${buildQueryParams({}, environment)}`,
  
  createConfig: (jobType: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JOBS.CONFIG(jobType)}${buildQueryParams({}, environment)}`,
  
  updateConfig: (jobType: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JOBS.CONFIG(jobType)}${buildQueryParams({}, environment)}`,
  
  triggerExecution: (jobType: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JOBS.EXECUTE(jobType)}${buildQueryParams({}, environment)}`,
  
  getExecutions: (jobType: string, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JOBS.EXECUTIONS(jobType)}${buildQueryParams(params || {}, environment)}`,
  
  getStatistics: (jobType: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JOBS.STATISTICS(jobType)}${buildQueryParams({}, environment)}`,
  
  getHealth: (jobType: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.JOBS.HEALTH(jobType)}${buildQueryParams({}, environment)}`,
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
  
  // Bookmark URL helpers
  getBookmarkReasons: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.BOOKMARK_REASONS}${buildQueryParams({}, environment)}`,
  addBookmark: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.BOOKMARK(customerId)}${buildQueryParams({}, environment)}`,
  updateBookmark: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.BOOKMARK(customerId)}${buildQueryParams({}, environment)}`,
  removeBookmark: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.BOOKMARK(customerId)}${buildQueryParams({}, environment)}`,

  // Family URL helpers
  getFamilyMembers: (familyCode: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.CUSTOMERS.FAMILY_MEMBERS(familyCode)}${buildQueryParams({}, environment)}`,
} as const;

// Bookmark-specific URL helpers
export const BOOKMARK_URLS = {
  import: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.BOOKMARKS.IMPORT}${buildQueryParams({}, environment)}`,
  
  getStats: (tenantId: number, isLive: boolean) =>
    API_ENDPOINTS.BOOKMARKS.STATS(tenantId, isLive),
  
  getList: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.BOOKMARKS.LIST}${buildQueryParams(params || {}, environment)}`,
  
  check: (tenantId: number, isLive: boolean) =>
    API_ENDPOINTS.BOOKMARKS.CHECK(tenantId, isLive),
  
  delete: (bookmarkId: number, tenantId: number, isLive: boolean) =>
    API_ENDPOINTS.BOOKMARKS.DELETE(bookmarkId, tenantId, isLive),
  
  getTemplate: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.BOOKMARKS.TEMPLATE}${buildQueryParams({}, environment)}`,
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
  
  // Restart and reprocess URL helpers
  restartSession: (sessionId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.RESTART_SESSION(sessionId)}${buildQueryParams({}, environment)}`,
  editStagingRecord: (stagingId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.EDIT_STAGING_RECORD(stagingId)}${buildQueryParams({}, environment)}`,
  reprocessSingleRecord: (stagingId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.REPROCESS_SINGLE_RECORD(stagingId)}${buildQueryParams({}, environment)}`,
  bulkReprocessRecords: (sessionId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.IMPORT.BULK_REPROCESS_RECORDS(sessionId)}${buildQueryParams({}, environment)}`,
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
  
  // Bookmark Gap Detection URL helpers
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
  deleteNavData: (schemeId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.DELETE_NAV_DATA(schemeId)}${buildQueryParams({}, environment)}`,
  getLatestNav: (schemeId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.LATEST_NAV(schemeId)}${buildQueryParams({}, environment)}`,
  
  // NEW: Time series analytics helper
  getTimeSeries: (schemeId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.NAV.TIME_SERIES(schemeId)}${buildQueryParams(params || {}, environment)}`,
  
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

// Market Analysis-specific URL helpers
export const MARKET_ANALYSIS_URLS = {
  getHealth: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.HEALTH}${buildQueryParams({}, environment)}`,
  
  calculateMetrics: (indexId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.CALCULATE_METRICS(indexId)}${buildQueryParams(params || {}, environment)}`,
  
  // NEW: Bulk metrics calculation helper
  bulkCalculateMetrics: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.BULK_CALCULATE_METRICS}${buildQueryParams(params || {}, environment)}`,
  
  getLatestMetrics: (indexId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.GET_METRICS(indexId)}${buildQueryParams({}, environment)}`,
  
  getDashboardStatistics: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.DASHBOARD_STATISTICS}${buildQueryParams(params || {}, environment)}`,
  
  getIndexReturns: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.INDEX_RETURNS}${buildQueryParams(params || {}, environment)}`,
  
  getIndexVolatility: (indexId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.MARKET_ANALYSIS.INDEX_VOLATILITY(indexId)}${buildQueryParams(params || {}, environment)}`,
} as const;

// Scheme Analysis-specific URL helpers
export const SCHEME_ANALYSIS_URLS = {
  getHealth: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.SCHEME_ANALYSIS.HEALTH}${buildQueryParams({}, environment)}`,

  calculateMetrics: (schemeId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.SCHEME_ANALYSIS.CALCULATE_METRICS(schemeId)}${buildQueryParams(params || {}, environment)}`,

  getLatestMetrics: (schemeId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.SCHEME_ANALYSIS.GET_METRICS(schemeId)}${buildQueryParams(params || {}, environment)}`,

  batchCalculate: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.SCHEME_ANALYSIS.BATCH_CALCULATE}${buildQueryParams(params || {}, environment)}`,
} as const;

// Asset Types-specific URL helpers (Release 1.1 - Phase 1: Master Data)
export const ASSET_TYPES_URLS = {
  getAssetTypes: (params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.ASSET_TYPES.LIST}${buildQueryParams(params || {}, environment)}`,

  getAssetType: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.ASSET_TYPES.GET(id)}${buildQueryParams({}, environment)}`,

  getAssetTypeByCode: (code: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.ASSET_TYPES.GET_BY_CODE(code)}${buildQueryParams({}, environment)}`,

  createAssetType: (environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.ASSET_TYPES.CREATE}${buildQueryParams({}, environment)}`,

  updateAssetType: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.ASSET_TYPES.UPDATE(id)}${buildQueryParams({}, environment)}`,

  deleteAssetType: (id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.ASSET_TYPES.DELETE(id)}${buildQueryParams({}, environment)}`,
} as const;

// Investment Plans-specific URL helpers (Release 1.1 - Phase 1: Full CRUD)
export const INVESTMENT_PLANS_URLS = {
  // Customer Investment Plans
  getInvestmentPlans: (customerId: number, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.INVESTMENT_PLANS.LIST(customerId)}${buildQueryParams(params || {}, environment)}`,

  createInvestmentPlan: (customerId: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.INVESTMENT_PLANS.CREATE(customerId)}${buildQueryParams({}, environment)}`,

  getInvestmentPlan: (customerId: number, id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.INVESTMENT_PLANS.GET(customerId, id)}${buildQueryParams({}, environment)}`,

  updateInvestmentPlan: (customerId: number, id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.INVESTMENT_PLANS.UPDATE(customerId, id)}${buildQueryParams({}, environment)}`,

  deleteInvestmentPlan: (customerId: number, id: number, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.INVESTMENT_PLANS.DELETE(customerId, id)}${buildQueryParams({}, environment)}`,

  // Family Investment Plans
  getFamilyInvestmentSummary: (familyHeadId: string, params?: Record<string, any>, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.INVESTMENT_PLANS.FAMILY_SUMMARY(familyHeadId)}${buildQueryParams(params || {}, environment)}`,

  bulkAssignToFamily: (familyHeadId: string, environment?: 'live' | 'test') =>
    `${API_ENDPOINTS.INVESTMENT_PLANS.FAMILY_BULK_ASSIGN(familyHeadId)}${buildQueryParams({}, environment)}`,
} as const;

// Development logging
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 API Base URL:', API_BASE);
  console.log('📡 Available Endpoints:', {
    Auth: Object.keys(API_ENDPOINTS.AUTH).length,
    Contacts: Object.keys(API_ENDPOINTS.CONTACTS).length,
    Customers: Object.keys(API_ENDPOINTS.CUSTOMERS).length,
    Bookmarks: Object.keys(API_ENDPOINTS.BOOKMARKS).length,
    Schemes: Object.keys(API_ENDPOINTS.SCHEMES).length,
    Transactions: Object.keys(API_ENDPOINTS.TRANSACTIONS).length,
    Portfolio: Object.keys(API_ENDPOINTS.PORTFOLIO).length,
    JTBD: Object.keys(API_ENDPOINTS.JTBD).length,
    Goals: Object.keys(API_ENDPOINTS.GOALS).length,
    UserPreferences: Object.keys(API_ENDPOINTS.USER_PREFERENCES).length,
    Import: Object.keys(API_ENDPOINTS.IMPORT).length,
    Nav: Object.keys(API_ENDPOINTS.NAV).length,
    Market: Object.keys(API_ENDPOINTS.MARKET).length,
    MarketAnalysis: Object.keys(API_ENDPOINTS.MARKET_ANALYSIS).length,
    SchemeAnalysis: Object.keys(API_ENDPOINTS.SCHEME_ANALYSIS).length,
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
  
  console.log('⚙️  User Preferences Endpoints:', {
    GET_ALL_CHART_PREFERENCES: API_ENDPOINTS.USER_PREFERENCES.GET_ALL_CHART_PREFERENCES,
    GET_CHART_PREFERENCE: 'GET /api/user-preferences/chart/:indexId',
    SAVE_CHART_PREFERENCE: 'POST /api/user-preferences/chart/:indexId',
    DELETE_CHART_PREFERENCE: 'DELETE /api/user-preferences/chart/:indexId',
  });
  
  console.log('🔖 Bookmark Endpoints:', {
    IMPORT: API_ENDPOINTS.BOOKMARKS.IMPORT,
    STATS: API_ENDPOINTS.BOOKMARKS.STATS,
    LIST: API_ENDPOINTS.BOOKMARKS.LIST,
    CHECK: API_ENDPOINTS.BOOKMARKS.CHECK,
    DELETE: 'DELETE /api/bookmarks/:id',
    TEMPLATE: API_ENDPOINTS.BOOKMARKS.TEMPLATE,
  });
  
  console.log('🔍 NAV Bookmark Gap Detection:', {
    BOOKMARK_GAPS: API_ENDPOINTS.NAV.BOOKMARK_GAPS,
    BOOKMARK_GAPS_SUMMARY: API_ENDPOINTS.NAV.BOOKMARK_GAPS_SUMMARY,
  });
  
  console.log('📊 NAV Analytics:', {
    LATEST_NAV: 'GET /api/nav/schemes/:schemeId/latest',
    TIME_SERIES: 'GET /api/nav/timeseries/:schemeId',
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
    BULK_CALCULATE_METRICS: API_ENDPOINTS.MARKET_ANALYSIS.BULK_CALCULATE_METRICS, // NEW
    GET_METRICS: 'GET /api/market-analysis/metrics/:indexId',
    DASHBOARD_STATISTICS: API_ENDPOINTS.MARKET_ANALYSIS.DASHBOARD_STATISTICS,
    INDEX_RETURNS: API_ENDPOINTS.MARKET_ANALYSIS.INDEX_RETURNS,
    INDEX_VOLATILITY: 'GET /api/market-analysis/index-volatility/:indexId',
  });
  
  console.log('📊 Scheme Analysis Endpoints:', {
    HEALTH: API_ENDPOINTS.SCHEME_ANALYSIS.HEALTH,
    CALCULATE_METRICS: 'POST /api/scheme-analysis/calculate-metrics/:schemeId',
    GET_METRICS: 'GET /api/scheme-analysis/metrics/:schemeId',
    BATCH_CALCULATE: API_ENDPOINTS.SCHEME_ANALYSIS.BATCH_CALCULATE,
  });

  console.log('🚢 Cruise Control - Snapshot Operations:', {
    DROP_ALL: API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.OPERATIONS.DROP_ALL,
    GENERATE_MISSING: API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.OPERATIONS.GENERATE_MISSING,
    UPDATE_ALL: API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.OPERATIONS.UPDATE_ALL,
    REGENERATE_ALL: API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.OPERATIONS.REGENERATE_ALL,
  });

  console.log('🚢 Portfolio Snapshots (Backward Compatibility):', {
    CONFIG: API_ENDPOINTS.PORTFOLIO_SNAPSHOTS.CONFIG_BASE,
    OPERATIONS: Object.keys(API_ENDPOINTS.PORTFOLIO_SNAPSHOTS.OPERATIONS).length,
  });
}

export default API_ENDPOINTS;