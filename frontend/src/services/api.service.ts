import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { getAPIErrorMessage } from './serviceURLs';

// Import API_BASE from serviceURLs.ts as single source of truth
const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8080') + '/api';

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add this debug line
    console.log('🔧 Axios Base URL:', this.axiosInstance.defaults.baseURL);
    console.log('🔧 API_BASE constant:', API_BASE);

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log('🚀 REQUEST: Interceptor triggered for:', config.url);
        console.log('🚀 REQUEST: Method:', config.method);
        
        // Get token from localStorage
        const token = localStorage.getItem('access_token'); // Changed from auth_token
        console.log('🚀 REQUEST: Token found in localStorage:', token ? `${token.substring(0, 30)}...` : 'NO TOKEN FOUND');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🚀 REQUEST: Authorization header set');
        } else {
          console.log('🚀 REQUEST: No token, skipping Authorization header');
        }

        // Get tenant_id from localStorage (set during login)
        const tenantId = localStorage.getItem('tenant_id');
        console.log('🚀 REQUEST: Tenant ID from localStorage:', tenantId);
        
        if (tenantId) {
          config.headers['X-Tenant-ID'] = tenantId;
          console.log('🚀 REQUEST: X-Tenant-ID header set');
        }

        // Get environment preference from localStorage
        const environment = localStorage.getItem('environment') || 'live';
        config.headers['X-Environment'] = environment;
        console.log('🚀 REQUEST: Environment:', environment);
        
        console.log('🚀 REQUEST: Final headers:', config.headers);
        console.log('🚀 REQUEST: Full URL:', (config.baseURL || '') + (config.url || ''));

        return config;
      },
      (error) => {
        console.error('🚀 REQUEST: Interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log('✅ RESPONSE: Success for:', response.config.url);
        console.log('✅ RESPONSE: Status:', response.status);
        console.log('✅ RESPONSE: Data:', response.data);
        return response;
      },
      async (error: AxiosError) => {
        console.log('❌ RESPONSE: Error for:', error.config?.url);
        console.log('❌ RESPONSE: Status:', error.response?.status);
        console.log('❌ RESPONSE: Error data:', error.response?.data);
        console.log('❌ RESPONSE: Error message:', error.message);
        
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          console.log('❌ RESPONSE: 401 Unauthorized detected');
          console.log('❌ RESPONSE: Is retry?', originalRequest._retry);
          console.log('❌ RESPONSE: Triggering logout...');
          
          originalRequest._retry = true;
          
          // Clear auth data
          localStorage.removeItem('access_token');
          localStorage.removeItem('tenant_id');
          localStorage.removeItem('user');
          
          // Redirect to login
          window.location.href = '/login';
        }

        // Format error message
        const errorMessage = getAPIErrorMessage(error);
        console.error('API Error:', errorMessage);

        return Promise.reject({
          ...error,
          message: errorMessage,
        });
      }
    );
  }

  // Generic GET request
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    console.log('🔥 ApiService GET called with endpoint:', endpoint);
    console.log('🔥 Base URL:', this.axiosInstance.defaults.baseURL);
    console.log('🔥 Full URL:', `${this.axiosInstance.defaults.baseURL}${endpoint}`);
    
    try {
      const response = await this.axiosInstance.get<T>(endpoint, config);
      console.log('🔥 GET Response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔥 GET Error:', error);
      throw error;
    }
  }

  // Generic POST request
  async post<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    console.log('🔥 ApiService POST called with endpoint:', endpoint);
    console.log('🔥 POST Data:', data);
    
    const response = await this.axiosInstance.post<T>(endpoint, data, config);
    return response.data;
  }

  // Generic PATCH request
  async patch<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(endpoint, data, config);
    return response.data;
  }

  // Generic DELETE request
  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(endpoint, config);
    return response.data;
  }

  // Generic PUT request
  async put<T>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(endpoint, data, config);
    return response.data;
  }

  // Helper method to get base URL (useful for debugging)
  getBaseURL(): string {
    return API_BASE;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;