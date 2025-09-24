import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-api-url.com';

class AuthService {
  private apiClient;

  constructor() {
    this.apiClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // Add auth token to requests
    this.apiClient.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle token refresh
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await SecureStore.deleteItemAsync('auth_token');
          // Redirect to login or refresh token
        }
        return Promise.reject(error);
      }
    );
  }

  async signIn(email: string, password: string) {
    try {
      const response = await this.apiClient.post('/api/auth/signin', {
        email,
        password,
      });

      return {
        success: true,
        token: response.data.token,
        user: response.data.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Sign in failed',
      };
    }
  }

  async signUp(email: string, password: string, name: string) {
    try {
      const response = await this.apiClient.post('/api/auth/signup', {
        email,
        password,
        name,
      });

      return {
        success: true,
        token: response.data.token,
        user: response.data.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Sign up failed',
      };
    }
  }

  async signOut() {
    try {
      await this.apiClient.post('/api/auth/signout');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.apiClient.get('/api/auth/me');
      return response.data.user;
    } catch (error) {
      throw new Error('Failed to get current user');
    }
  }

  async resetPassword(email: string) {
    try {
      const response = await this.apiClient.post('/api/auth/reset-password', {
        email,
      });

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Password reset failed',
      };
    }
  }

  async updateProfile(data: { name?: string; email?: string; image?: string }) {
    try {
      const response = await this.apiClient.put('/api/auth/profile', data);
      return {
        success: true,
        user: response.data.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Profile update failed',
      };
    }
  }

  async changePassword(currentPassword: string, newPassword: string) {
    try {
      const response = await this.apiClient.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Password change failed',
      };
    }
  }

  async verifyEmail(token: string) {
    try {
      const response = await this.apiClient.post('/api/auth/verify-email', {
        token,
      });

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Email verification failed',
      };
    }
  }

  async refreshToken() {
    try {
      const response = await this.apiClient.post('/api/auth/refresh');
      const newToken = response.data.token;
      
      await SecureStore.setItemAsync('auth_token', newToken);
      
      return {
        success: true,
        token: newToken,
      };
    } catch (error: any) {
      await SecureStore.deleteItemAsync('auth_token');
      return {
        success: false,
        error: 'Token refresh failed',
      };
    }
  }

  async deleteAccount() {
    try {
      const response = await this.apiClient.delete('/api/auth/account');
      await SecureStore.deleteItemAsync('auth_token');
      
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Account deletion failed',
      };
    }
  }

  // OAuth methods
  async signInWithGoogle(idToken: string) {
    try {
      const response = await this.apiClient.post('/api/auth/google', {
        idToken,
      });

      return {
        success: true,
        token: response.data.token,
        user: response.data.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Google sign in failed',
      };
    }
  }

  async signInWithApple(identityToken: string, user?: any) {
    try {
      const response = await this.apiClient.post('/api/auth/apple', {
        identityToken,
        user,
      });

      return {
        success: true,
        token: response.data.token,
        user: response.data.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Apple sign in failed',
      };
    }
  }

  // Utility methods
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) return false;

      // Verify token with server
      await this.getCurrentUser();
      return true;
    } catch (error) {
      await SecureStore.deleteItemAsync('auth_token');
      return false;
    }
  }

  async getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('auth_token');
  }

  async clearAuthData(): Promise<void> {
    await SecureStore.deleteItemAsync('auth_token');
  }
}

export const authService = new AuthService();