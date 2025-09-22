'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: 'ADMIN' | 'COMMISSIONER' | 'PLAYER';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
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

// Internal component that uses custom JWT authentication
function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              image: data.user.avatar,
              role: data.user.role || 'PLAYER'
            });
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const isAuthenticated = !!user;

  const login = async () => {
    router.push('/login');
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear user state anyway
      setUser(null);
      router.push('/');
    }
  };

  const hasRole = (role: User['role']): boolean => {
    return user?.role === role;
  };

  const hasPermission = (roles: User['role'][]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Main Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AuthContextProvider>
      {children}
    </AuthContextProvider>
  );
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: User['role'][]
) {
  return function AuthenticatedComponent(props: P) {
    const { isLoading, isAuthenticated, hasPermission } = useAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }

    if (requiredRoles && !hasPermission(requiredRoles)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You don't have permission to access this page.</p>
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

  React.useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        window.location.href = '/login';
        return;
      }

      if (requiredRoles && !hasPermission(requiredRoles)) {
        console.error('Insufficient permissions');
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
    return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>;
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