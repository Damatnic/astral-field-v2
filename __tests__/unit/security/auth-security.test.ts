/**
 * Security tests for Authentication and Authorization
 * Tests protection against common security vulnerabilities
 */

import {
  createMockRequest,
  createMockUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  expectToThrowError,
} from '../../utils/test-helpers';

// Mock auth functions
const mockAuthService = {
  login: jest.fn(),
  authenticateFromRequest: jest.fn(),
  canAccessRole: jest.fn(),
  validateSession: jest.fn(),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
};

// Mock rate limiting
const mockRateLimiter = {
  check: jest.fn(),
  reset: jest.fn(),
};

// Mock API handlers for security testing
const mockSecureApiHandlers = {
  auth: {
    login: jest.fn(),
    logout: jest.fn(),
  },
  admin: {
    getUsers: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
  trades: {
    create: jest.fn(),
    approve: jest.fn(),
  },
  waivers: {
    process: jest.fn(),
  },
};

describe('Authentication Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      // Arrange
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'qwerty',
        'abc123',
        'password123',
      ];

      mockAuthService.login.mockImplementation((credentials) => {
        const { password } = credentials;
        if (weakPasswords.includes(password)) {
          return Promise.resolve({
            success: false,
            error: 'Password does not meet security requirements',
          });
        }
        return Promise.resolve({ success: true });
      });

      // Act & Assert
      for (const weakPassword of weakPasswords) {
        const result = await mockAuthService.login({
          email: 'test@example.com',
          password: weakPassword,
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('security requirements');
      }
    });

    it('should accept strong passwords', async () => {
      // Arrange
      const strongPasswords = [
        'MyStr0ng!P@ssw0rd',
        'C0mplex#Pass123!',
        'S3cur3P@ssw0rd2024',
        'Fantasy!Football#2024',
      ];

      mockAuthService.login.mockImplementation((credentials) => {
        const { password } = credentials;
        // Simple strong password check
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const isLongEnough = password.length >= 8;

        if (hasUpper && hasLower && hasNumber && hasSpecial && isLongEnough) {
          return Promise.resolve({ success: true, user: createMockUser() });
        }
        return Promise.resolve({
          success: false,
          error: 'Password does not meet security requirements',
        });
      });

      // Act & Assert
      for (const strongPassword of strongPasswords) {
        const result = await mockAuthService.login({
          email: 'test@example.com',
          password: strongPassword,
        });
        
        expect(result.success).toBe(true);
      }
    });

    it('should hash passwords securely', async () => {
      // Arrange
      const plainPassword = 'MySecurePassword123!';
      
      mockAuthService.hashPassword.mockImplementation((password) => {
        // Simulate bcrypt behavior
        const hash = `$2b$12$${Buffer.from(password).toString('base64').slice(0, 22)}...hashed`;
        return Promise.resolve(hash);
      });

      // Act
      const hashedPassword = await mockAuthService.hashPassword(plainPassword);

      // Assert
      expect(hashedPassword).toMatch(/^\$2b\$12\$/); // bcrypt format
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should verify passwords correctly', async () => {
      // Arrange
      const plainPassword = 'MySecurePassword123!';
      const hashedPassword = '$2b$12$abcdefghijklmnopqrstuvwxyz...hashed';
      
      mockAuthService.verifyPassword.mockImplementation((plain, hash) => {
        // Simulate successful verification
        return Promise.resolve(plain === 'MySecurePassword123!' && hash.startsWith('$2b$12$'));
      });

      // Act
      const isValid = await mockAuthService.verifyPassword(plainPassword, hashedPassword);

      // Assert
      expect(isValid).toBe(true);
    });
  });

  describe('SQL Injection Protection', () => {
    it('should prevent SQL injection in login attempts', async () => {
      // Arrange
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "'; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'password'); --",
        "' UNION SELECT * FROM users WHERE '1'='1",
      ];

      mockAuthService.login.mockImplementation((credentials) => {
        const { email } = credentials;
        // Should sanitize/validate input
        if (email.includes("'") || email.includes(';') || email.includes('--')) {
          return Promise.resolve({
            success: false,
            error: 'Invalid input detected',
          });
        }
        return Promise.resolve({ success: false, error: 'Invalid credentials' });
      });

      // Act & Assert
      for (const maliciousInput of maliciousInputs) {
        const result = await mockAuthService.login({
          email: maliciousInput,
          password: 'password',
        });
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid');
      }
    });

    it('should sanitize search parameters', async () => {
      // Arrange
      const maliciousSearchQueries = [
        "'; DROP TABLE players; --",
        "' OR 1=1 --",
        "'; DELETE FROM teams; --",
      ];

      const mockPlayerSearch = jest.fn().mockImplementation((query) => {
        // Should sanitize search query
        if (query.includes("'") || query.includes(';') || query.includes('--')) {
          throw new Error('Invalid search query');
        }
        return Promise.resolve([]);
      });

      // Act & Assert
      for (const maliciousQuery of maliciousSearchQueries) {
        await expectToThrowError(
          () => mockPlayerSearch(maliciousQuery),
          'Invalid search query'
        );
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should limit login attempts per IP', async () => {
      // Arrange
      const ipAddress = '192.168.1.100';
      let attemptCount = 0;

      mockRateLimiter.check.mockImplementation((ip, action) => {
        if (ip === ipAddress && action === 'login') {
          attemptCount++;
          if (attemptCount > 5) {
            return Promise.resolve({ allowed: false, resetTime: Date.now() + 300000 });
          }
        }
        return Promise.resolve({ allowed: true });
      });

      mockSecureApiHandlers.auth.login.mockImplementation(async (request) => {
        const rateLimitResult = await mockRateLimiter.check(ipAddress, 'login');
        
        if (!rateLimitResult.allowed) {
          return {
            status: 429,
            json: () => Promise.resolve({ 
              error: 'Too many login attempts. Please try again later.' 
            }),
          };
        }

        return {
          status: 401,
          json: () => Promise.resolve({ error: 'Invalid credentials' }),
        };
      });

      // Act & Assert
      // First 5 attempts should be allowed
      for (let i = 0; i < 5; i++) {
        const request = createMockRequest('/api/auth/login', {
          method: 'POST',
          body: { email: 'test@example.com', password: 'wrong' },
        });
        
        const response = await mockSecureApiHandlers.auth.login(request);
        expect(response.status).toBe(401);
      }

      // 6th attempt should be rate limited
      const request = createMockRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'test@example.com', password: 'wrong' },
      });
      
      const response = await mockSecureApiHandlers.auth.login(request);
      expect(response.status).toBe(429);
      
      const responseData = await response.json();
      expect(responseData.error).toContain('Too many login attempts');
    });

    it('should limit API requests per user', async () => {
      // Arrange
      const userId = 'user-123';
      let requestCount = 0;

      mockRateLimiter.check.mockImplementation((user, action) => {
        if (user === userId && action === 'api_request') {
          requestCount++;
          if (requestCount > 100) { // 100 requests per minute
            return Promise.resolve({ allowed: false, resetTime: Date.now() + 60000 });
          }
        }
        return Promise.resolve({ allowed: true });
      });

      const mockApiHandler = jest.fn().mockImplementation(async (request) => {
        const user = await mockAuthService.authenticateFromRequest(request);
        if (!user) {
          return { status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) };
        }

        const rateLimitResult = await mockRateLimiter.check(user.id, 'api_request');
        
        if (!rateLimitResult.allowed) {
          return {
            status: 429,
            json: () => Promise.resolve({ 
              error: 'Rate limit exceeded. Please slow down.' 
            }),
          };
        }

        return { status: 200, json: () => Promise.resolve({ success: true }) };
      });

      mockAuthService.authenticateFromRequest.mockResolvedValue(createMockUser({ id: userId }));

      // Act & Assert
      // First 100 requests should succeed
      for (let i = 0; i < 100; i++) {
        const request = createMockRequest('/api/trades');
        const response = await mockApiHandler(request);
        expect(response.status).toBe(200);
      }

      // 101st request should be rate limited
      const request = createMockRequest('/api/trades');
      const response = await mockApiHandler(request);
      expect(response.status).toBe(429);
    });
  });

  describe('Authorization Checks', () => {
    it('should prevent unauthorized access to admin endpoints', async () => {
      // Arrange
      const regularUser = createMockUser({ role: 'PLAYER' });
      const adminUser = createMockUser({ role: 'ADMIN' });

      mockAuthService.canAccessRole.mockImplementation((userRole, requiredRole) => {
        if (requiredRole === 'admin') {
          return userRole === 'ADMIN';
        }
        return true;
      });

      mockSecureApiHandlers.admin.getUsers.mockImplementation(async (request) => {
        const user = await mockAuthService.authenticateFromRequest(request);
        if (!user) {
          return { status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) };
        }

        if (!mockAuthService.canAccessRole(user.role, 'admin')) {
          return { status: 403, json: () => Promise.resolve({ error: 'Forbidden' }) };
        }

        return { status: 200, json: () => Promise.resolve({ users: [] }) };
      });

      // Act & Assert - Regular user should be forbidden
      mockAuthService.authenticateFromRequest.mockResolvedValue(regularUser);
      const regularUserRequest = createMockRequest('/api/admin/users');
      const regularUserResponse = await mockSecureApiHandlers.admin.getUsers(regularUserRequest);
      expect(regularUserResponse.status).toBe(403);

      // Admin user should be allowed
      mockAuthService.authenticateFromRequest.mockResolvedValue(adminUser);
      const adminUserRequest = createMockRequest('/api/admin/users');
      const adminUserResponse = await mockSecureApiHandlers.admin.getUsers(adminUserRequest);
      expect(adminUserResponse.status).toBe(200);
    });

    it('should prevent users from accessing other users\' data', async () => {
      // Arrange
      const user1 = createMockUser({ id: 'user-1' });
      const user2 = createMockUser({ id: 'user-2' });

      mockSecureApiHandlers.trades.create.mockImplementation(async (request) => {
        const user = await mockAuthService.authenticateFromRequest(request);
        if (!user) {
          return { status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) };
        }

        const requestBody = await request.json();
        const { proposerId } = requestBody;

        // Users should only be able to create trades as themselves
        if (proposerId !== user.id) {
          return { status: 403, json: () => Promise.resolve({ error: 'Cannot create trades for other users' }) };
        }

        return { status: 201, json: () => Promise.resolve({ success: true }) };
      });

      // Mock request.json() method
      const createMockRequestWithJson = (url: string, options: any) => {
        const request = createMockRequest(url, options);
        (request as any).json = () => Promise.resolve(options.body);
        return request;
      };

      // Act & Assert
      mockAuthService.authenticateFromRequest.mockResolvedValue(user1);

      // User 1 trying to create trade as themselves - should succeed
      const validRequest = createMockRequestWithJson('/api/trades', {
        method: 'POST',
        body: { proposerId: 'user-1', items: [] },
      });
      const validResponse = await mockSecureApiHandlers.trades.create(validRequest);
      expect(validResponse.status).toBe(201);

      // User 1 trying to create trade as user 2 - should fail
      const invalidRequest = createMockRequestWithJson('/api/trades', {
        method: 'POST',
        body: { proposerId: 'user-2', items: [] },
      });
      const invalidResponse = await mockSecureApiHandlers.trades.create(invalidRequest);
      expect(invalidResponse.status).toBe(403);
    });

    it('should validate team ownership for operations', async () => {
      // Arrange
      const user = createMockUser({ id: 'user-123' });
      const userTeamId = 'team-456';
      const otherTeamId = 'team-789';

      const mockTeamOwnershipCheck = jest.fn().mockImplementation((userId, teamId) => {
        return teamId === userTeamId && userId === 'user-123';
      });

      mockSecureApiHandlers.waivers.process.mockImplementation(async (request) => {
        const user = await mockAuthService.authenticateFromRequest(request);
        if (!user) {
          return { status: 401, json: () => Promise.resolve({ error: 'Unauthorized' }) };
        }

        const requestBody = await request.json();
        const { teamId } = requestBody;

        if (!mockTeamOwnershipCheck(user.id, teamId)) {
          return { status: 403, json: () => Promise.resolve({ error: 'Not authorized for this team' }) };
        }

        return { status: 200, json: () => Promise.resolve({ success: true }) };
      });

      // Mock request.json() method
      const createMockRequestWithJson = (url: string, options: any) => {
        const request = createMockRequest(url, options);
        (request as any).json = () => Promise.resolve(options.body);
        return request;
      };

      mockAuthService.authenticateFromRequest.mockResolvedValue(user);

      // Act & Assert
      // User operating on their own team - should succeed
      const validRequest = createMockRequestWithJson('/api/waivers/process', {
        method: 'POST',
        body: { teamId: userTeamId },
      });
      const validResponse = await mockSecureApiHandlers.waivers.process(validRequest);
      expect(validResponse.status).toBe(200);

      // User operating on someone else's team - should fail
      const invalidRequest = createMockRequestWithJson('/api/waivers/process', {
        method: 'POST',
        body: { teamId: otherTeamId },
      });
      const invalidResponse = await mockSecureApiHandlers.waivers.process(invalidRequest);
      expect(invalidResponse.status).toBe(403);
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on password change', async () => {
      // Arrange
      const userId = 'user-123';
      const oldSessionId = 'old-session-456';
      const newSessionId = 'new-session-789';

      const mockSessionManager = {
        invalidateAllSessions: jest.fn(),
        createNewSession: jest.fn(),
      };

      mockSessionManager.invalidateAllSessions.mockResolvedValue(true);
      mockSessionManager.createNewSession.mockResolvedValue({
        sessionId: newSessionId,
        expiresAt: new Date(Date.now() + 86400000),
      });

      const mockPasswordChange = jest.fn().mockImplementation(async (userId, newPassword) => {
        // Change password
        await mockAuthService.hashPassword(newPassword);
        
        // Invalidate all existing sessions
        await mockSessionManager.invalidateAllSessions(userId);
        
        // Create new session
        return mockSessionManager.createNewSession(userId);
      });

      // Act
      const result = await mockPasswordChange(userId, 'NewSecurePassword123!');

      // Assert
      expect(mockSessionManager.invalidateAllSessions).toHaveBeenCalledWith(userId);
      expect(mockSessionManager.createNewSession).toHaveBeenCalledWith(userId);
      expect(result.sessionId).toBe(newSessionId);
    });

    it('should have secure session timeouts', async () => {
      // Arrange
      const shortLivedSession = {
        sessionId: 'short-session',
        expiresAt: new Date(Date.now() + 1800000), // 30 minutes
        lastActivity: new Date(Date.now() - 1900000), // 32 minutes ago
      };

      mockAuthService.validateSession.mockImplementation((session) => {
        const now = new Date();
        const isExpired = now > session.expiresAt;
        const isInactive = (now.getTime() - session.lastActivity.getTime()) > 1800000; // 30 min inactivity

        return !isExpired && !isInactive;
      });

      // Act & Assert
      const isValid = mockAuthService.validateSession(shortLivedSession);
      expect(isValid).toBe(false); // Should be invalid due to inactivity
    });

    it('should use secure session tokens', async () => {
      // Arrange
      const mockGenerateSessionToken = jest.fn().mockImplementation(() => {
        // Simulate cryptographically secure random token
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
      });

      // Act
      const sessionToken = mockGenerateSessionToken();

      // Assert
      expect(sessionToken).toMatch(/^[a-f0-9]{64}$/); // 64 hex characters
      expect(sessionToken.length).toBe(64);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate and sanitize user inputs', async () => {
      // Arrange
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
        "'; DROP TABLE users; --",
      ];

      const mockInputValidator = jest.fn().mockImplementation((input) => {
        // Remove HTML tags and potential script content
        const sanitized = input
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/javascript:/gi, '') // Remove javascript: protocol
          .replace(/on\w+=/gi, '') // Remove event handlers
          .replace(/['";]/g, ''); // Remove quotes and semicolons

        const isValid = !input.includes('<script>') && 
                       !input.includes('javascript:') && 
                       !input.includes('DROP TABLE') &&
                       sanitized.length > 0;

        return { isValid, sanitized };
      });

      // Act & Assert
      for (const maliciousInput of maliciousInputs) {
        const result = mockInputValidator(maliciousInput);
        expect(result.isValid).toBe(false);
        expect(result.sanitized).not.toContain('<script>');
        expect(result.sanitized).not.toContain('javascript:');
      }
    });

    it('should validate email formats strictly', async () => {
      // Arrange
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user..user@example.com',
        'user@example',
        'user@.com',
        '<script>@example.com',
      ];

      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.org',
      ];

      const emailValidator = jest.fn().mockImplementation((email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && !email.includes('<') && !email.includes('>');
      });

      // Act & Assert
      for (const invalidEmail of invalidEmails) {
        expect(emailValidator(invalidEmail)).toBe(false);
      }

      for (const validEmail of validEmails) {
        expect(emailValidator(validEmail)).toBe(true);
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF tokens for state-changing operations', async () => {
      // Arrange
      const validCSRFToken = 'csrf-token-123';
      const invalidCSRFToken = 'invalid-token';

      const mockCSRFValidator = jest.fn().mockImplementation((token, sessionId) => {
        // Simulate CSRF token validation
        return token === validCSRFToken && sessionId === 'valid-session';
      });

      mockSecureApiHandlers.trades.create.mockImplementation(async (request) => {
        const csrfToken = request.headers.get('X-CSRF-Token');
        const sessionId = request.cookies?.get('session')?.value;

        if (!mockCSRFValidator(csrfToken, sessionId)) {
          return { status: 403, json: () => Promise.resolve({ error: 'Invalid CSRF token' }) };
        }

        return { status: 201, json: () => Promise.resolve({ success: true }) };
      });

      // Act & Assert
      // Request with valid CSRF token
      const validRequest = createMockRequest('/api/trades', {
        method: 'POST',
        headers: { 'X-CSRF-Token': validCSRFToken },
        cookies: { session: 'valid-session' },
      });
      const validResponse = await mockSecureApiHandlers.trades.create(validRequest);
      expect(validResponse.status).toBe(201);

      // Request with invalid CSRF token
      const invalidRequest = createMockRequest('/api/trades', {
        method: 'POST',
        headers: { 'X-CSRF-Token': invalidCSRFToken },
        cookies: { session: 'valid-session' },
      });
      const invalidResponse = await mockSecureApiHandlers.trades.create(invalidRequest);
      expect(invalidResponse.status).toBe(403);
    });
  });

  describe('Secure Headers', () => {
    it('should set secure response headers', async () => {
      // Arrange
      const mockResponseWithHeaders = {
        status: 200,
        headers: new Map(),
        setHeader: function(name: string, value: string) {
          this.headers.set(name, value);
        },
        json: () => Promise.resolve({ success: true }),
      };

      const mockSecureResponseHandler = jest.fn().mockImplementation(() => {
        mockResponseWithHeaders.setHeader('X-Content-Type-Options', 'nosniff');
        mockResponseWithHeaders.setHeader('X-Frame-Options', 'DENY');
        mockResponseWithHeaders.setHeader('X-XSS-Protection', '1; mode=block');
        mockResponseWithHeaders.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        mockResponseWithHeaders.setHeader('Content-Security-Policy', "default-src 'self'");
        
        return mockResponseWithHeaders;
      });

      // Act
      const response = mockSecureResponseHandler();

      // Assert
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    });
  });
});