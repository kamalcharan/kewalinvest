// frontend/src/services/auth.service.ts
import apiService from './api.service';
import { API_ENDPOINTS } from '../services/serviceURLs';

// ============================================================================
// TYPE DEFINITIONS - UPDATED WITH TENANT INFO
// ============================================================================

/**
 * User type - now includes tenant information
 */
export interface User {
  id: number;
  tenant_id: number;
  email: string;
  is_active: boolean;
  theme_preference: string;
  environment_preference: 'live' | 'test';
  created_at: string;
  tenant: {
    id: number;
    tenant_code: string;
    tenant_name: string;
    is_admin: boolean;
    subscription_plan: string;
    settings: {
      subscription_start_date: string;
      subscription_end_date: string;
      [key: string]: any;
    };
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Register request - now includes business_name
 */
export interface RegisterRequest {
  email: string;
  password: string;
  business_name: string; // NEW
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

// ============================================================================
// AUTH SERVICE CLASS
// ============================================================================

class AuthService {
  
  // ==========================================================================
  // LOGIN
  // ==========================================================================
  
  async login(credentials: LoginRequest): Promise<TokenResponse> {
    try {
      console.log('🔐 AUTH SERVICE: Login attempt for:', credentials.email);
      
      const response = await apiService.post<TokenResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      console.log('✅ AUTH SERVICE: Login successful');
      console.log('📋 AUTH SERVICE: Tenant:', response.user.tenant.tenant_name);
      console.log('👤 AUTH SERVICE: User ID:', response.user.id);

      // Store auth data in localStorage
      this.setAuthData(response);
      
      return response;
    } catch (error) {
      console.error('❌ AUTH SERVICE: Login failed:', error);
      throw error;
    }
  }

  // ==========================================================================
  // REGISTER - UPDATED TO INCLUDE BUSINESS_NAME
  // ==========================================================================
  
  async register(userData: RegisterRequest): Promise<TokenResponse> {
    try {
      console.log('📝 AUTH SERVICE: Registration attempt');
      console.log('📋 AUTH SERVICE: Business name:', userData.business_name);
      
      const response = await apiService.post<TokenResponse>(
        API_ENDPOINTS.AUTH.REGISTER,
        userData
      );

      console.log('✅ AUTH SERVICE: Registration successful');
      console.log('🏢 AUTH SERVICE: Tenant created:', response.user.tenant.tenant_code);
      console.log('👤 AUTH SERVICE: User created:', response.user.id);

      // Store auth data in localStorage
      this.setAuthData(response);
      
      return response;
    } catch (error) {
      console.error('❌ AUTH SERVICE: Registration failed:', error);
      throw error;
    }
  }

  // ==========================================================================
  // GET CURRENT USER
  // ==========================================================================
  
  async getCurrentUser(): Promise<User> {
    try {
      console.log('👤 AUTH SERVICE: Fetching current user info');
      
      const response = await apiService.get<User>(API_ENDPOINTS.AUTH.ME);
      
      console.log('✅ AUTH SERVICE: User info retrieved');
      
      // Update stored user data
      const storedUser = this.getStoredUser();
      if (storedUser) {
        localStorage.setItem('user', JSON.stringify(response));
        console.log('💾 AUTH SERVICE: User info updated in localStorage');
      }
      
      return response;
    } catch (error) {
      console.error('❌ AUTH SERVICE: Failed to get current user:', error);
      throw error;
    }
  }

  // ==========================================================================
  // CHANGE PASSWORD
  // ==========================================================================
  
  async changePassword(passwordData: ChangePasswordRequest): Promise<{ message: string; timestamp: string }> {
    try {
      console.log('🔒 AUTH SERVICE: Changing password');
      
      const response = await apiService.patch<{ message: string; timestamp: string }>(
        API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
        passwordData
      );
      
      console.log('✅ AUTH SERVICE: Password changed successfully');
      
      return response;
    } catch (error) {
      console.error('❌ AUTH SERVICE: Password change failed:', error);
      throw error;
    }
  }

  // ==========================================================================
  // UPDATE ENVIRONMENT
  // ==========================================================================
  
  async updateEnvironment(environment: 'live' | 'test'): Promise<User> {
    try {
      console.log('🔄 AUTH SERVICE: Switching environment to:', environment);
      
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
      
      console.log('✅ AUTH SERVICE: Environment switched successfully');
      
      return response;
    } catch (error) {
      console.error('❌ AUTH SERVICE: Environment update failed:', error);
      throw error;
    }
  }

  // ==========================================================================
  // LOGOUT
  // ==========================================================================
  
  logout(): void {
    console.log('🚪 AUTH SERVICE: Logging out');
    
    // Clear all auth data from localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('user');
    localStorage.removeItem('environment');
    localStorage.removeItem('last_activity'); // NEW: Clear session tracking
    
    console.log('✅ AUTH SERVICE: All auth data cleared');
    
    // Redirect to login page
    window.location.href = '/login';
  }

  // ==========================================================================
  // AUTHENTICATION CHECK
  // ==========================================================================
  
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getStoredUser();
    const isAuth = !!(token && user);
    
    console.log('🔍 AUTH SERVICE: Authentication check:', isAuth ? 'AUTHENTICATED' : 'NOT AUTHENTICATED');
    
    return isAuth;
  }

  // ==========================================================================
  // GETTER METHODS
  // ==========================================================================
  
  /**
   * Get stored JWT token
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Get stored user with tenant info
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr) as User;
    } catch {
      console.error('❌ AUTH SERVICE: Failed to parse stored user');
      return null;
    }
  }

  /**
   * Get current tenant ID
   */
  getTenantId(): number | null {
    const tenantIdStr = localStorage.getItem('tenant_id');
    return tenantIdStr ? parseInt(tenantIdStr, 10) : null;
  }

  /**
   * Get current environment
   */
  getEnvironment(): 'live' | 'test' {
    const env = localStorage.getItem('environment') as 'live' | 'test';
    return env || 'live';
  }

  /**
   * Get last activity timestamp (for session timeout)
   */
  getLastActivity(): number | null {
    const lastActivity = localStorage.getItem('last_activity');
    return lastActivity ? parseInt(lastActivity, 10) : null;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  
  /**
   * Check if user is super admin (tenant has is_admin = true)
   */
  isSuperAdmin(): boolean {
    const user = this.getStoredUser();
    return user?.tenant?.is_admin === true;
  }

  /**
   * Check if subscription is active
   */
  isSubscriptionActive(): boolean {
    const user = this.getStoredUser();
    if (!user?.tenant?.settings?.subscription_end_date) return true;
    
    const endDate = new Date(user.tenant.settings.subscription_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return endDate >= today;
  }

  /**
   * Get days until subscription expiry
   */
  getDaysUntilExpiry(): number | null {
    const user = this.getStoredUser();
    if (!user?.tenant?.settings?.subscription_end_date) return null;
    
    const endDate = new Date(user.tenant.settings.subscription_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  /**
   * Get tenant info
   */
  getTenantInfo(): User['tenant'] | null {
    const user = this.getStoredUser();
    return user?.tenant || null;
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================
  
  /**
   * Store auth data in localStorage
   * Called after successful login or registration
   */
  private setAuthData(response: TokenResponse): void {
    console.log('💾 AUTH SERVICE: Storing auth data');
    
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('tenant_id', response.user.tenant_id.toString());
    localStorage.setItem('user', JSON.stringify(response.user));
    localStorage.setItem('environment', response.user.environment_preference);
    localStorage.setItem('last_activity', Date.now().toString()); // NEW: Track session
     localStorage.setItem('is_tenant_admin', response.user.tenant.is_admin.toString());
    
    console.log('✅ AUTH SERVICE: Auth data stored successfully');
    console.log('🏢 AUTH SERVICE: Tenant:', response.user.tenant.tenant_name);
    console.log('🔑 AUTH SERVICE: Tenant Code:', response.user.tenant.tenant_code);
    console.log('👑 AUTH SERVICE: Is Admin:', response.user.tenant.is_admin);
    console.log('📅 AUTH SERVICE: Subscription End:', response.user.tenant.settings.subscription_end_date);
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const authService = new AuthService();
export default authService;