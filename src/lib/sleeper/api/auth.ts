import { createHash, randomBytes } from 'crypto';
import { sleeperClient } from './client';

interface SleeperTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  metadata?: Record<string, any>;
  created?: number;
}

interface OAuthState {
  state: string;
  userId: string;
  timestamp: number;
  redirectUrl?: string;
}

export class SleeperAuth {
  private clientId = process.env.SLEEPER_CLIENT_ID || '';
  private clientSecret = process.env.SLEEPER_CLIENT_SECRET || '';
  private redirectUri = process.env.SLEEPER_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/sleeper/callback`;
  private encryptionKey = process.env.SLEEPER_ENCRYPTION_KEY || 'default-key-change-in-production';

  constructor() {
    if (!this.clientId && process.env.NODE_ENV === 'production') {
      console.warn('SLEEPER_CLIENT_ID not set - Sleeper OAuth will not work');
    }
  }

  // Generate secure OAuth state
  generateSecureState(): string {
    return randomBytes(32).toString('hex');
  }

  // Initiate OAuth flow
  async initiateOAuth(userId: string, redirectUrl?: string): Promise<string> {
    const state = this.generateSecureState();
    
    // Store state in database/cache for verification
    const oauthState: OAuthState = {
      state,
      userId,
      timestamp: Date.now(),
      redirectUrl
    };

    await this.storeOAuthState(state, oauthState);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'read write',
      state
    });

    return `https://sleeper.app/oauth/authorize?${params}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForToken(code: string, state: string): Promise<{
    tokens: SleeperTokens;
    user: SleeperUser;
    oauthState: OAuthState;
  }> {
    // Verify state parameter
    const oauthState = await this.getOAuthState(state);
    if (!oauthState) {
      throw new Error('Invalid or expired OAuth state');
    }

    // Check state expiration (10 minutes)
    if (Date.now() - oauthState.timestamp > 600000) {
      await this.deleteOAuthState(state);
      throw new Error('OAuth state expired');
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://api.sleeper.app/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokens: SleeperTokens = await tokenResponse.json();

      // Get user info with access token
      const userResponse = await fetch('https://api.sleeper.app/v1/user/me', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Accept': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user info');
      }

      const user: SleeperUser = await userResponse.json();

      // Store encrypted tokens
      await this.storeTokens(oauthState.userId, tokens);

      // Clean up OAuth state
      await this.deleteOAuthState(state);

      return { tokens, user, oauthState };
    } catch (error) {
      await this.deleteOAuthState(state);
      throw error;
    }
  }

  // Refresh access token
  async refreshAccessToken(userId: string): Promise<SleeperTokens | null> {
    const storedTokens = await this.getStoredTokens(userId);
    if (!storedTokens?.refresh_token) {
      return null;
    }

    try {
      const response = await fetch('https://api.sleeper.app/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: storedTokens.refresh_token,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        // Refresh token is invalid, remove stored tokens
        await this.removeTokens(userId);
        return null;
      }

      const newTokens: SleeperTokens = await response.json();
      await this.storeTokens(userId, newTokens);
      
      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.removeTokens(userId);
      return null;
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(userId: string): Promise<string | null> {
    const tokens = await this.getStoredTokens(userId);
    if (!tokens) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const expirationTime = tokens.issued_at + (tokens.expires_in * 1000) - 300000;
    if (Date.now() > expirationTime) {
      const refreshedTokens = await this.refreshAccessToken(userId);
      return refreshedTokens?.access_token || null;
    }

    return tokens.access_token;
  }

  // Make authenticated request to Sleeper API
  async authenticatedRequest<T>(
    userId: string, 
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = await this.getValidAccessToken(userId);
    if (!accessToken) {
      throw new Error('No valid access token available');
    }

    const response = await fetch(`https://api.sleeper.app/v1${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 401) {
      // Token might be invalid, try refreshing
      const newToken = await this.refreshAccessToken(userId);
      if (newToken) {
        return this.authenticatedRequest(userId, endpoint, options);
      }
      throw new Error('Authentication failed');
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Revoke tokens
  async revokeTokens(userId: string): Promise<void> {
    const tokens = await this.getStoredTokens(userId);
    if (!tokens) {
      return;
    }

    try {
      // Revoke access token
      await fetch('https://api.sleeper.app/oauth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${tokens.access_token}`
        },
        body: new URLSearchParams({
          token: tokens.access_token,
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });

      // Revoke refresh token
      await fetch('https://api.sleeper.app/oauth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          token: tokens.refresh_token,
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });
    } catch (error) {
      console.error('Token revocation failed:', error);
    } finally {
      // Always remove stored tokens
      await this.removeTokens(userId);
    }
  }

  // Check if user has valid Sleeper connection
  async isConnected(userId: string): Promise<boolean> {
    const tokens = await this.getStoredTokens(userId);
    return !!tokens;
  }

  // Get Sleeper user info for connected user
  async getSleeperUser(userId: string): Promise<SleeperUser | null> {
    try {
      return await this.authenticatedRequest<SleeperUser>(userId, '/user/me');
    } catch {
      return null;
    }
  }

  // Private helper methods

  private encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = createHash('sha256').update(this.encryptionKey).digest();
    const iv = randomBytes(16);
    const cipher = require('crypto').createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-gcm';
    const key = createHash('sha256').update(this.encryptionKey).digest();
    const [ivHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = require('crypto').createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private async storeOAuthState(state: string, oauthState: OAuthState): Promise<void> {
    // In production, use Redis or database
    // For now, store in memory (will be lost on restart)
    if (typeof window === 'undefined') {
      global.oauthStates = global.oauthStates || new Map();
      global.oauthStates.set(state, oauthState);
    }
  }

  private async getOAuthState(state: string): Promise<OAuthState | null> {
    if (typeof window === 'undefined' && global.oauthStates) {
      return global.oauthStates.get(state) || null;
    }
    return null;
  }

  private async deleteOAuthState(state: string): Promise<void> {
    if (typeof window === 'undefined' && global.oauthStates) {
      global.oauthStates.delete(state);
    }
  }

  private async storeTokens(userId: string, tokens: SleeperTokens): Promise<void> {
    const tokensWithTimestamp = {
      ...tokens,
      issued_at: Date.now()
    };
    
    const encrypted = this.encrypt(JSON.stringify(tokensWithTimestamp));
    
    // Store in database
    const { prisma } = await import('@/lib/prisma');
    await prisma.user.update({
      where: { id: userId },
      data: {
        sleeperTokens: encrypted
      }
    });
  }

  private async getStoredTokens(userId: string): Promise<(SleeperTokens & { issued_at: number }) | null> {
    try {
      const { prisma } = await import('@/lib/prisma');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { sleeperTokens: true }
      });

      if (!user?.sleeperTokens) {
        return null;
      }

      const decrypted = this.decrypt(user.sleeperTokens);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  private async removeTokens(userId: string): Promise<void> {
    const { prisma } = await import('@/lib/prisma');
    await prisma.user.update({
      where: { id: userId },
      data: {
        sleeperTokens: null
      }
    });
  }
}

// Singleton instance
export const sleeperAuth = new SleeperAuth();

// Helper functions for Next.js API routes
export async function handleSleeperCallback(
  code: string,
  state: string
): Promise<{
  success: boolean;
  redirectUrl?: string;
  error?: string;
}> {
  try {
    const result = await sleeperAuth.exchangeCodeForToken(code, state);
    
    // Update user's Sleeper connection status
    const { prisma } = await import('@/lib/prisma');
    await prisma.user.update({
      where: { id: result.oauthState.userId },
      data: {
        sleeperUserId: result.user.user_id,
        sleeperUsername: result.user.username,
        sleeperConnectedAt: new Date()
      }
    });

    return {
      success: true,
      redirectUrl: result.oauthState.redirectUrl || '/dashboard'
    };
  } catch (error) {
    console.error('Sleeper OAuth callback error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OAuth callback failed'
    };
  }
}

export async function disconnectSleeper(userId: string): Promise<void> {
  await sleeperAuth.revokeTokens(userId);
  
  const { prisma } = await import('@/lib/prisma');
  await prisma.user.update({
    where: { id: userId },
    data: {
      sleeperUserId: null,
      sleeperUsername: null,
      sleeperTokens: null,
      sleeperConnectedAt: null
    }
  });
}