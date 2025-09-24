import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      await SecureStore.deleteItemAsync('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await authService.signIn(email, password);
      if (result.success && result.token && result.user) {
        await SecureStore.setItemAsync('auth_token', result.token);
        setUser(result.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await authService.signUp(email, password, name);
      if (result.success && result.token && result.user) {
        await SecureStore.setItemAsync('auth_token', result.token);
        setUser(result.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Sign up error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await authService.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      await signOut();
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};