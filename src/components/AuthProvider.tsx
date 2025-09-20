'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/lib/auth';
import { handleAuthError } from '@/lib/error-handling';

// Types
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: User['role']) => boolean;
  hasPermission: (roles: User['role'][]) => boolean;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived state
  const isAuthenticated = !!user;

  // Fetch current user from server
  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - user not logged in
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return data.user || null;
      }
      return null;
    } catch (error) {
      handleAuthError(error as Error, 'fetchCurrentUser');
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      } catch (error) {
        handleAuthError(error as Error, 'initialize');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [fetchCurrentUser]);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/auth/simple-login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Login failed'
        };
      }

      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      } else {
        return {
          success: false,
          error: data.error || 'Login failed'
        };
      }
    } catch (error) {
      handleAuthError(error as Error, 'login');
      return {
        success: false,
        error: 'Network error. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Clear user state regardless of API response
      setUser(null);
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      handleAuthError(error as Error, 'logout');
      // Still clear user state on error
      setUser(null);
      window.location.href = '/login';
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (error) {
      handleAuthError(error as Error, 'refreshUser');
    }
  }, [fetchCurrentUser]);

  // Check if user has specific role
  const hasRole = useCallback((role: User['role']): boolean => {
    return user?.role === role;
  }, [user]);

  // Check if user has any of the specified roles
  const hasPermission = useCallback((roles: User['role'][]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  // Context value
  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: User['role'][]
) {
  return function AuthenticatedComponent(props: P) {
    const { isLoading, isAuthenticated, hasPermission } = useAuth();

    // Show loading state
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="loading-spinner"></div>
        </div>
      );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }

    // Check role permissions
    if (requiredRoles && !hasPermission(requiredRoles)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Hook for protected pages
export function useRequireAuth(requiredRoles?: User['role'][]) {
  const { user, isLoading, isAuthenticated, hasPermission } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        window.location.href = '/login';
        return;
      }

      if (requiredRoles && !hasPermission(requiredRoles)) {
        // Could redirect to a 403 page or show error  
        handleAuthError(new Error('Insufficient permissions'), 'permissionCheck');
      }
    }
  }, [isLoading, isAuthenticated, hasPermission, requiredRoles]);

  return {
    user,
    isLoading,
    isAuthenticated,
    hasAccess: !requiredRoles || hasPermission(requiredRoles)
  };
}

// Component for conditional rendering based on auth state
interface ConditionalRenderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  roles?: User['role'][];
  requireAuth?: boolean;
}

export function ConditionalRender({ 
  children, 
  fallback = null, 
  roles, 
  requireAuth = false 
}: ConditionalRenderProps) {
  const { user, isLoading, isAuthenticated, hasPermission } = useAuth();

  if (isLoading) {
    return <div className="loading-spinner"></div>;
  }

  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  if (roles && (!user || !hasPermission(roles))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default AuthProvider;