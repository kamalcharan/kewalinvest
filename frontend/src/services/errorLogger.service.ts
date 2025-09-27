// frontend/src/services/errorLogger.service.ts
// FIXED: Added missing info and debug methods

import apiService from './api.service';

export class FrontendErrorLogger {
  static async logMessage(
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    context?: string,
    metadata?: any,
    stack?: string
  ): Promise<void> {
    try {
      // Don't wait for the API call to complete - fire and forget
      apiService.post('/logs/frontend-error', {
        level,
        source: 'frontend',
        message,
        context,
        metadata: {
          ...metadata,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          }
        },
        stack_trace: stack
      }).catch(err => {
        // Fallback to console if API fails
        console.error('Failed to log to backend:', err);
        console[level]('Original log:', message, metadata);
      });
    } catch (err) {
      // Always fallback to console
      console.error('Logging failed:', err);
      console[level]('Original log:', message, metadata);
    }
  }

  static async logError(
    message: string,
    context?: string,
    metadata?: any,
    stack?: string
  ): Promise<void> {
    return this.logMessage('error', message, context, metadata, stack);
  }

  static error(message: string, context?: string, metadata?: any, stack?: string) {
    this.logError(message, context, metadata, stack);
  }

  static warn(message: string, context?: string, metadata?: any) {
    this.logMessage('warn', message, context, metadata);
  }

  // FIXED: Added missing info method
  static info(message: string, context?: string, metadata?: any) {
    this.logMessage('info', message, context, metadata);
  }

  // FIXED: Added debug method for completeness
  static debug(message: string, context?: string, metadata?: any) {
    this.logMessage('debug', message, context, metadata);
  }

  // Helper to capture and log React component errors
  static componentError(error: Error, componentStack: string, component: string) {
    this.logError(
      `React component error: ${error.message}`,
      component,
      {
        componentStack,
        errorName: error.name
      },
      error.stack
    );
  }

  // Helper to log async operation failures
  static asyncError(operation: string, error: any, context?: any) {
    this.logError(
      `Async operation failed: ${operation}`,
      'AsyncOperation',
      {
        operation,
        context,
        errorMessage: error?.message || String(error)
      },
      error?.stack
    );
  }

  // Helper to log API request failures
  static apiError(endpoint: string, method: string, error: any, requestData?: any) {
    this.logError(
      `API request failed: ${method} ${endpoint}`,
      'APIRequest',
      {
        endpoint,
        method,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        requestData: method !== 'GET' ? requestData : undefined,
        responseData: error?.response?.data
      },
      error?.stack
    );
  }

  // FIXED: Added helper for successful operations logging
  static operationSuccess(operation: string, context?: string, metadata?: any) {
    this.info(
      `Operation completed successfully: ${operation}`,
      context || 'OperationSuccess',
      metadata
    );
  }

  // FIXED: Added helper for user action tracking
  static userAction(action: string, context?: string, metadata?: any) {
    this.info(
      `User action: ${action}`,
      context || 'UserAction',
      metadata
    );
  }
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  FrontendErrorLogger.error(
    'Unhandled promise rejection',
    'GlobalHandler',
    {
      reason: event.reason,
      type: 'unhandledrejection'
    }
  );
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  FrontendErrorLogger.error(
    event.message || 'Uncaught error',
    'GlobalHandler',
    {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'uncaught'
    },
    event.error?.stack
  );
});