import apiService from './api.service';

export class FrontendErrorLogger {
  static async logError(
    message: string,
    context?: string,
    metadata?: any,
    stack?: string
  ): Promise<void> {
    try {
      // Don't wait for the API call to complete - fire and forget
      apiService.post('/logs/frontend-error', {
        level: 'error',
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
        console.error('Failed to log error to backend:', err);
        console.error('Original error:', message, metadata);
      });
    } catch (err) {
      // Always fallback to console
      console.error('Error logging failed:', err);
      console.error('Original error:', message, metadata);
    }
  }

  static error(message: string, context?: string, metadata?: any, stack?: string) {
    this.logError(message, context, metadata, stack);
  }

  static warn(message: string, context?: string, metadata?: any) {
    this.logError(message, context, metadata);
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