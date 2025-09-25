// frontend/src/config/api.config.ts

// API Base URL - uses Express backend on port 8080
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// API Endpoints matching Express backend
export const API_ENDPOINTS = {
  // Authentication endpoints
  AUTH: {
    LOGIN: `/api/auth/login`,
    REGISTER: `/api/auth/register`,
    ME: `/api/auth/me`,
    CHANGE_PASSWORD: `/api/auth/change-password`,
    ENVIRONMENT: `/api/auth/environment`,
  },
  
  // System endpoints
  SYSTEM: {
    HEALTH: `/health`,
    ROOT: `/`,
  },
} as const;

// Request timeout configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
} as const;

// Helper to build headers with auth token
export const buildHeaders = (
  token?: string,
  tenantId?: string | number,
  environment?: string,
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

// Helper to get full URL for an endpoint
export const getFullURL = (endpoint: string): string => {
  return `${API_BASE}${endpoint}`;
};

// Error handling helpers
export const isAPIError = (error: any): boolean => {
  return error?.response?.status >= 400;
};

export const getAPIErrorMessage = (error: any): string => {
  // Match Python API error format
  if (error?.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Development logging
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 API Base URL:', API_BASE);
  console.log('📡 Auth Endpoints:', Object.values(API_ENDPOINTS.AUTH).map(ep => `${API_BASE}${ep}`));
}