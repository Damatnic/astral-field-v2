// Example React hooks for using the authentication system
// This file demonstrates how to integrate the auth system with React components

'use client';

import { useState, useEffect } from 'react';
import type { User } from './auth';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setState({
          user: data.user,
          loading: false,
          error: null
        });
      } else {
        setState({
          user: null,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      setState({
        user: null,
        loading: false,
        error: 'Failed to check authentication status'
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setState({
          user: data.user,
          loading: false,
          error: null
        });
        return { success: true };
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Login failed'
        }));
        return { success: false, error: data.error };
      }
    } catch (error) {
      const errorMessage = 'Network error during login';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setState({
        user: null,
        loading: false,
        error: null
      });
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      // Even if the request fails, clear the local state
      setState({
        user: null,
        loading: false,
        error: null
      });
      window.location.href = '/login';
    }
  };

  return {
    ...state,
    login,
    logout,
    refresh: checkAuthStatus
  };
}

// Role-based permission hook
export function usePermissions() {
  const { user } = useAuth();

  const hasRole = (role: User['role']) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: User['role'][]) => {
    return user ? roles.includes(user.role) : false;
  };

  const canAccess = (requiredRole: User['role']) => {
    if (!user) return false;
    
    const roleHierarchy = {
      admin: 3,
      commissioner: 2,
      player: 1
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  };

  return {
    user,
    isAdmin: hasRole('admin'),
    isCommissioner: hasRole('commissioner'),
    isPlayer: hasRole('player'),
    hasRole,
    hasAnyRole,
    canAccess,
    isAuthenticated: !!user
  };
}

// Example component usage:
/*
'use client';

import { useAuth, usePermissions } from '@/lib/auth-hooks';

export function LoginForm() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

export function AdminPanel() {
  const { isAdmin, canAccess } = usePermissions();

  if (!isAdmin) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {canAccess('admin') && (
        <button>Admin Only Action</button>
      )}
    </div>
  );
}

export function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <p>Role: {user.role}</p>
      <p>Email: {user.email}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
*/