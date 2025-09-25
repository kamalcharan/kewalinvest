// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { User, LoginRequest, RegisterRequest } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tenantId: number | null;
  environment: 'live' | 'test';
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  switchEnvironment: (env: 'live' | 'test') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is logged in (has token)
      if (authService.isAuthenticated()) {
        // Try to get current user from API
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        setTenantId(currentUser.tenant_id);
        setEnvironment(currentUser.environment_preference);
      } else {
        // Load from localStorage if available
        const storedUser = authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          setTenantId(storedUser.tenant_id);
          setEnvironment(storedUser.environment_preference);
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      // Clear invalid auth data
      authService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setTenantId(response.user.tenant_id);
      setEnvironment(response.user.environment_preference);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await authService.register(userData);
      setUser(response.user);
      setTenantId(response.user.tenant_id);
      setEnvironment(response.user.environment_preference);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setTenantId(null);
    setEnvironment('live');
  };

  const switchEnvironment = async (env: 'live' | 'test') => {
    try {
      const updatedUser = await authService.updateEnvironment(env);
      setUser(updatedUser);
      setEnvironment(env);
    } catch (error) {
      console.error('Environment switch failed:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setTenantId(currentUser.tenant_id);
      setEnvironment(currentUser.environment_preference);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    tenantId,
    environment,
    login,
    register,
    logout,
    switchEnvironment,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;