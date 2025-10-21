// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import authService, { User, LoginRequest, RegisterRequest } from '../services/auth.service';

// ============================================================================
// CONTEXT TYPE DEFINITION
// ============================================================================

interface AuthContextType {
  // Core auth state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tenantId: number | null;
  environment: 'live' | 'test';
  
  // Admin & subscription flags (NEW)
  isSuperAdmin: boolean;
  isSubscriptionActive: boolean;
  isSubscriptionExpired: boolean;
  daysUntilExpiry: number | null;
  subscriptionEndDate: string | null;
  
  // Auth methods
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  switchEnvironment: (env: 'live' | 'test') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// CONSTANTS
// ============================================================================

// Session timeout: 30 minutes in milliseconds
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Check session every minute
const SESSION_CHECK_INTERVAL = 60 * 1000; // 1 minute

// ============================================================================
// AUTH PROVIDER COMPONENT
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');

  // ==========================================================================
  // DERIVED STATE - ADMIN & SUBSCRIPTION
  // ==========================================================================
  
  /**
   * Check if user's tenant is super admin
   */
  const isSuperAdmin = user?.tenant?.is_admin === true;

  /**
   * Get subscription end date
   */
  const subscriptionEndDate = user?.tenant?.settings?.subscription_end_date || null;
  
  /**
   * Check if subscription is currently active
   */
  const isSubscriptionActive = useCallback((): boolean => {
    if (!subscriptionEndDate) return true; // No end date = active
    
    const endDate = new Date(subscriptionEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only
    
    return endDate >= today;
  }, [subscriptionEndDate]);

  /**
   * Check if subscription is expired
   */
  const isSubscriptionExpired = !isSubscriptionActive();

  /**
   * Calculate days until subscription expires
   */
  const daysUntilExpiry = useCallback((): number | null => {
    if (!subscriptionEndDate) return null;
    
    const endDate = new Date(subscriptionEndDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }, [subscriptionEndDate])();

  // ==========================================================================
  // SESSION TIMEOUT LOGIC
  // ==========================================================================
  
  /**
   * Check if session has timed out
   */
  const checkSessionTimeout = useCallback(() => {
    if (!user) return; // Only check if user is logged in
    
    const lastActivity = localStorage.getItem('last_activity');
    if (!lastActivity) {
      console.log('⏰ AUTH CONTEXT: No last activity found, updating now');
      updateLastActivity();
      return;
    }

    const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
    
    if (timeSinceLastActivity > SESSION_TIMEOUT) {
      console.log('⏰ AUTH CONTEXT: Session expired due to inactivity');
      console.log(`   Time since last activity: ${Math.round(timeSinceLastActivity / 1000 / 60)} minutes`);
      logout();
    }
  }, [user]);

  /**
   * Update last activity timestamp
   */
  const updateLastActivity = useCallback(() => {
    localStorage.setItem('last_activity', Date.now().toString());
  }, []);

  /**
   * Setup activity listeners for session timeout
   */
  useEffect(() => {
    if (!user) return;

    console.log('⏰ AUTH CONTEXT: Setting up session timeout tracking');

    // Events that indicate user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      updateLastActivity();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Check session timeout every minute
    const timeoutCheckInterval = setInterval(checkSessionTimeout, SESSION_CHECK_INTERVAL);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(timeoutCheckInterval);
      console.log('⏰ AUTH CONTEXT: Session timeout tracking cleaned up');
    };
  }, [user, checkSessionTimeout, updateLastActivity]);

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  
  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 AUTH CONTEXT: Initializing auth state...');
      
      // Check session timeout first
      checkSessionTimeout();
      
      // Check if user is logged in (has token)
      if (authService.isAuthenticated()) {
        console.log('✅ AUTH CONTEXT: User is authenticated, fetching current user...');
        
        try {
          // Try to get current user from API
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          setTenantId(currentUser.tenant_id);
          setEnvironment(currentUser.environment_preference);
          updateLastActivity(); // Initialize activity tracking
          
          console.log('✅ AUTH CONTEXT: User loaded successfully');
          console.log('🏢 AUTH CONTEXT: Tenant:', currentUser.tenant.tenant_name);
          console.log('👑 AUTH CONTEXT: Is Admin:', currentUser.tenant.is_admin);
          console.log('📅 AUTH CONTEXT: Subscription End:', currentUser.tenant.settings.subscription_end_date);
        } catch (error) {
          console.error('❌ AUTH CONTEXT: Failed to fetch user from API, using localStorage');
          
          // Fallback to localStorage if API fails
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
            setTenantId(storedUser.tenant_id);
            setEnvironment(storedUser.environment_preference);
            updateLastActivity();
          }
        }
      } else {
        console.log('ℹ️ AUTH CONTEXT: User not authenticated');
      }
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to initialize auth:', error);
      // Clear invalid auth data
      authService.logout();
    } finally {
      setIsLoading(false);
      console.log('✅ AUTH CONTEXT: Initialization complete');
    }
  };

  // ==========================================================================
  // AUTH METHODS
  // ==========================================================================
  
  /**
   * Login user
   */
  const login = async (credentials: LoginRequest) => {
    try {
      console.log('🔐 AUTH CONTEXT: Logging in...');
      
      const response = await authService.login(credentials);
      setUser(response.user);
      setTenantId(response.user.tenant_id);
      setEnvironment(response.user.environment_preference);
      updateLastActivity();
      
      console.log('✅ AUTH CONTEXT: Login successful');
      console.log('🏢 AUTH CONTEXT: Tenant:', response.user.tenant.tenant_name);
      console.log('📅 AUTH CONTEXT: Subscription End:', response.user.tenant.settings.subscription_end_date);
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Login failed:', error);
      throw error;
    }
  };

  /**
   * Register new user
   */
  const register = async (userData: RegisterRequest) => {
    try {
      console.log('📝 AUTH CONTEXT: Registering new user...');
      console.log('🏢 AUTH CONTEXT: Business Name:', userData.business_name);
      
      const response = await authService.register(userData);
      setUser(response.user);
      setTenantId(response.user.tenant_id);
      setEnvironment(response.user.environment_preference);
      updateLastActivity();
      
      console.log('✅ AUTH CONTEXT: Registration successful');
      console.log('🏢 AUTH CONTEXT: Tenant created:', response.user.tenant.tenant_name);
      console.log('🔑 AUTH CONTEXT: Tenant Code:', response.user.tenant.tenant_code);
      console.log('📅 AUTH CONTEXT: Subscription End:', response.user.tenant.settings.subscription_end_date);
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Registration failed:', error);
      throw error;
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    console.log('🚪 AUTH CONTEXT: Logging out...');
    
    authService.logout();
    setUser(null);
    setTenantId(null);
    setEnvironment('live');
    
    console.log('✅ AUTH CONTEXT: Logout complete');
  };

  /**
   * Switch environment (live/test)
   */
  const switchEnvironment = async (env: 'live' | 'test') => {
    try {
      console.log('🔄 AUTH CONTEXT: Switching environment to:', env);
      
      const updatedUser = await authService.updateEnvironment(env);
      setUser(updatedUser);
      setEnvironment(env);
      updateLastActivity();
      
      console.log('✅ AUTH CONTEXT: Environment switched successfully');
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Environment switch failed:', error);
      throw error;
    }
  };

  /**
   * Refresh user data from API
   */
  const refreshUser = async () => {
    try {
      console.log('🔄 AUTH CONTEXT: Refreshing user data...');
      
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setTenantId(currentUser.tenant_id);
      setEnvironment(currentUser.environment_preference);
      updateLastActivity();
      
      console.log('✅ AUTH CONTEXT: User data refreshed');
    } catch (error) {
      console.error('❌ AUTH CONTEXT: Failed to refresh user:', error);
      throw error;
    }
  };

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================
  
  const value: AuthContextType = {
    // Core auth state
    user,
    isAuthenticated: !!user,
    isLoading,
    tenantId,
    environment,
    
    // Admin & subscription flags (NEW)
    isSuperAdmin,
    isSubscriptionActive: isSubscriptionActive(),
    isSubscriptionExpired,
    daysUntilExpiry,
    subscriptionEndDate,
    
    // Auth methods
    login,
    register,
    logout,
    switchEnvironment,
    refreshUser,
  };

  // ==========================================================================
  // DEBUG LOGGING (Development only)
  // ==========================================================================
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && user) {
      console.log('📊 AUTH CONTEXT STATE:', {
        user_id: user.id,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant.tenant_name,
        is_super_admin: isSuperAdmin,
        subscription_active: isSubscriptionActive(),
        subscription_expired: isSubscriptionExpired,
        days_until_expiry: daysUntilExpiry,
      });
    }
  }, [user, isSuperAdmin, isSubscriptionExpired, daysUntilExpiry]);

  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

/**
 * Custom hook to use auth context
 * Must be used within an AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;