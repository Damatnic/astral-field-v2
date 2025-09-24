/**
 * Validation Utilities Tests
 * Tests for input validation and sanitization functions
 */

// Mock validation functions since we don't have them yet
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const validateTeamName = (name: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Team name is required');
  }
  if (name.length > 50) {
    errors.push('Team name must be 50 characters or less');
  }
  if (name.length < 3) {
    errors.push('Team name must be at least 3 characters long');
  }
  if (!/^[a-zA-Z0-9\s\-_']+$/.test(name)) {
    errors.push('Team name contains invalid characters');
  }

  return { valid: errors.length === 0, errors };
};

export const validateFAABBid = (bid: number, budget: number, spent: number): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const available = budget - spent;
  
  if (bid < 0) {
    errors.push('Bid cannot be negative');
  }
  if (bid > available) {
    errors.push(`Insufficient FAAB budget. Available: $${available}`);
  }
  if (!Number.isInteger(bid)) {
    errors.push('Bid must be a whole number');
  }

  return { valid: errors.length === 0, errors };
};

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'user+tag@example.org',
        'user123@example-domain.com'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'MyPass123!',
        'SecureP@ssw0rd',
        'C0mpl3x!Pass',
        'V3ryStr0ng#Password'
      ];

      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        { password: 'weak', expectedErrors: ['Password must be at least 8 characters long'] },
        { password: 'alllowercase123!', expectedErrors: ['Password must contain at least one uppercase letter'] },
        { password: 'ALLUPPERCASE123!', expectedErrors: ['Password must contain at least one lowercase letter'] },
        { password: 'NoNumbers!', expectedErrors: ['Password must contain at least one number'] },
        { password: 'NoSpecialChars123', expectedErrors: ['Password must contain at least one special character'] }
      ];

      weakPasswords.forEach(({ password, expectedErrors }) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expectedErrors.forEach(error => {
          expect(result.errors).toContain(error);
        });
      });
    });

    it('should handle multiple validation failures', () => {
      const result = validatePassword('weak');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3); // Multiple validation rules should fail
    });
  });

  describe('sanitizeInput', () => {
    it('should remove leading and trailing whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
      expect(sanitizeInput('\t\ntest\t\n')).toBe('test');
    });

    it('should remove dangerous HTML characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('Hello <b>world</b>')).toBe('Hello bworld/b');
    });

    it('should preserve safe content', () => {
      expect(sanitizeInput('Normal text with numbers 123')).toBe('Normal text with numbers 123');
      expect(sanitizeInput('Special chars: !@#$%^&*()')).toBe('Special chars: !@#$%^&*()');
    });
  });

  describe('validateTeamName', () => {
    it('should validate good team names', () => {
      const validNames = [
        'Team Alpha',
        'Warriors_123',
        "O'Malley's Team",
        'Super-Squad',
        'The Champions'
      ];

      validNames.forEach(name => {
        const result = validateTeamName(name);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid team names', () => {
      const testCases = [
        { name: '', expectedError: 'Team name is required' },
        { name: '  ', expectedError: 'Team name is required' },
        { name: 'AB', expectedError: 'Team name must be at least 3 characters long' },
        { name: 'A'.repeat(51), expectedError: 'Team name must be 50 characters or less' },
        { name: 'Team<script>', expectedError: 'Team name contains invalid characters' },
        { name: 'Team@Email.com', expectedError: 'Team name contains invalid characters' }
      ];

      testCases.forEach(({ name, expectedError }) => {
        const result = validateTeamName(name);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(expectedError);
      });
    });
  });

  describe('validateFAABBid', () => {
    it('should validate valid FAAB bids', () => {
      const validBids = [
        { bid: 50, budget: 1000, spent: 400 }, // Well within budget
        { bid: 100, budget: 1000, spent: 900 }, // Exactly at budget
        { bid: 0, budget: 1000, spent: 500 }, // Zero bid (valid)
        { bid: 1, budget: 1000, spent: 0 } // Minimum bid
      ];

      validBids.forEach(({ bid, budget, spent }) => {
        const result = validateFAABBid(bid, budget, spent);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid FAAB bids', () => {
      const testCases = [
        { 
          bid: -10, 
          budget: 1000, 
          spent: 0, 
          expectedError: 'Bid cannot be negative' 
        },
        { 
          bid: 200, 
          budget: 1000, 
          spent: 900, 
          expectedError: 'Insufficient FAAB budget. Available: $100' 
        },
        { 
          bid: 50.5, 
          budget: 1000, 
          spent: 0, 
          expectedError: 'Bid must be a whole number' 
        }
      ];

      testCases.forEach(({ bid, budget, spent, expectedError }) => {
        const result = validateFAABBid(bid, budget, spent);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(expectedError);
      });
    });

    it('should handle edge cases', () => {
      // All budget spent
      const noMoneyResult = validateFAABBid(1, 1000, 1000);
      expect(noMoneyResult.valid).toBe(false);
      expect(noMoneyResult.errors).toContain('Insufficient FAAB budget. Available: $0');

      // Large numbers
      const largeResult = validateFAABBid(50, 10000, 5000);
      expect(largeResult.valid).toBe(true);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle empty strings gracefully', () => {
      expect(validateEmail('')).toBe(false);
      expect(sanitizeInput('')).toBe('');
      
      const passwordResult = validatePassword('');
      expect(passwordResult.valid).toBe(false);
      expect(passwordResult.errors.length).toBeGreaterThan(0);
    });

    it('should handle very long inputs', () => {
      const longString = 'a'.repeat(10000);
      
      expect(sanitizeInput(longString)).toBe(longString);
      expect(validateEmail(longString)).toBe(false);
      
      const teamResult = validateTeamName(longString);
      expect(teamResult.valid).toBe(false);
      expect(teamResult.errors).toContain('Team name must be 50 characters or less');
    });

    it('should handle special Unicode characters', () => {
      const unicodeInput = 'Team 🏈 Champions';
      const result = validateTeamName(unicodeInput);
      expect(result.valid).toBe(false); // Our regex doesn't allow emojis
      expect(result.errors).toContain('Team name contains invalid characters');
    });

    it('should be performant with many validations', () => {
      const startTime = performance.now();
      
      // Run many validations
      for (let i = 0; i < 1000; i++) {
        validateEmail(`test${i}@example.com`);
        validatePassword(`TestPass${i}!`);
        sanitizeInput(`Input ${i} with <tags>`);
        validateTeamName(`Team ${i}`);
        validateFAABBid(i, 1000, 0);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 5000 validations in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});