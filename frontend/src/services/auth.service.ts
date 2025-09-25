// frontend/src/services/auth.service.ts
import apiService from './api.service';
import { API_ENDPOINTS } from '../services/serviceURLs';

// Types matching backend responses
export interface User {
  id: number;
  tenant_id: number;
  email: string;
  is_active: boolean;
  theme_preference: string;
  environment_preference: 'live' | 'test';
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface EnvironmentUpdateRequest {
  environment_preference: 'live' | 'test';
}

class AuthService {
  // Login user
  async login(credentials: LoginRequest): Promise<TokenResponse> {
    try {
      const response = await apiService.post<TokenResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      // Store auth data in localStorage
      this.setAuthData(response);
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<TokenResponse> {
    try {
      // TODO: Change to '1' for production/customer deployment
      const defaultTenantId = '3'; // Using tenant 3 for testing
      
      // Create custom headers with tenant ID
      const headers = {
        'X-Tenant-ID': defaultTenantId
      };
      
      const response = await apiService.post<TokenResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        userData,
        { headers }
      );

      // Store auth data in localStorage
      this.setAuthData(response);
      
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Get current user info
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiService.get<User>(API_ENDPOINTS.AUTH.ME);
      
      // Update stored user data
      const storedUser = this.getStoredUser();
      if (storedUser) {
        localStorage.setItem('user', JSON.stringify(response));
      }
      
      return response;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(passwordData: ChangePasswordRequest): Promise<{ message: string; timestamp: string }> {
    try {
      const response = await apiService.patch<{ message: string; timestamp: string }>(
        API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
        passwordData
      );
      
      return response;
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  // Update environment preference
  async updateEnvironment(environment: 'live' | 'test'): Promise<User> {
    try {
      const response = await apiService.patch<User>(
        API_ENDPOINTS.AUTH.ENVIRONMENT,
        { environment_preference: environment }
      );
      
      // Update stored environment
      localStorage.setItem('environment', environment);
      
      // Update stored user data
      const storedUser = this.getStoredUser();
      if (storedUser) {
        storedUser.environment_preference = environment;
        localStorage.setItem('user', JSON.stringify(storedUser));
      }
      
      return response;
    } catch (error) {
      console.error('Environment update failed:', error);
      throw error;
    }
  }

  // Logout user
  logout(): void {
    // Clear all auth data from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('user');
    localStorage.removeItem('environment');
    
    // Redirect to login page
    window.location.href = '/login';
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  // Get stored user
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  // Get current tenant ID
  getTenantId(): number | null {
    const tenantIdStr = localStorage.getItem('tenant_id');
    return tenantIdStr ? parseInt(tenantIdStr, 10) : null;
  }

  // Get current environment
  getEnvironment(): 'live' | 'test' {
    const env = localStorage.getItem('environment') as 'live' | 'test';
    return env || 'live';
  }

  // Private helper to store auth data
  private setAuthData(response: TokenResponse): void {
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('tenant_id', response.user.tenant_id.toString());
    localStorage.setItem('user', JSON.stringify(response.user));
    localStorage.setItem('environment', response.user.environment_preference);
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;