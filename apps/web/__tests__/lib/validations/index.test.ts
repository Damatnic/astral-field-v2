/**
 * Validation Utilities Tests
 * 
 * Tests for validation functions
 */

import {
  validateEmail,
  validatePassword,
  sanitizeInput,
  validateTeamName,
  validatePlayerSearch,
  userRegistrationSchema,
  loginSchema
} from '@/lib/validations'

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
      expect(validateEmail('user+tag@example.com')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false)
      expect(validateEmail('invalid@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('test @example.com')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('should accept passwords with 8+ characters', () => {
      expect(validatePassword('12345678')).toBe(true)
      expect(validatePassword('password123')).toBe(true)
      expect(validatePassword('VeryLongPassword123!')).toBe(true)
    })

    it('should reject passwords with less than 8 characters', () => {
      expect(validatePassword('1234567')).toBe(false)
      expect(validatePassword('short')).toBe(false)
      expect(validatePassword('')).toBe(false)
    })

    it('should handle exactly 8 characters', () => {
      expect(validatePassword('12345678')).toBe(true)
    })
  })

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello'
      const result = sanitizeInput(input)
      expect(result).toBe('Hello')
      expect(result).not.toContain('<script>')
    })

    it('should remove multiple script tags', () => {
      const input = '<script>bad</script>Good<script>bad</script>'
      const result = sanitizeInput(input)
      expect(result).toBe('Good')
    })

    it('should handle script tags with attributes', () => {
      const input = '<script type="text/javascript">alert("xss")</script>Safe'
      const result = sanitizeInput(input)
      expect(result).toBe('Safe')
    })

    it('should preserve safe content', () => {
      const input = 'This is safe content'
      const result = sanitizeInput(input)
      expect(result).toBe('This is safe content')
    })

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('')
    })
  })

  describe('validateTeamName', () => {
    it('should accept valid team names', () => {
      expect(validateTeamName('My Team')).toBe(true)
      expect(validateTeamName('A')).toBe(true)
      expect(validateTeamName('Team Name 123')).toBe(true)
    })

    it('should reject empty team names', () => {
      expect(validateTeamName('')).toBe(false)
    })

    it('should reject team names over 100 characters', () => {
      const longName = 'a'.repeat(101)
      expect(validateTeamName(longName)).toBe(false)
    })

    it('should accept team names exactly 100 characters', () => {
      const maxName = 'a'.repeat(100)
      expect(validateTeamName(maxName)).toBe(true)
    })
  })

  describe('validatePlayerSearch', () => {
    it('should accept queries with 2+ characters', () => {
      expect(validatePlayerSearch('ab')).toBe(true)
      expect(validatePlayerSearch('Tom Brady')).toBe(true)
      expect(validatePlayerSearch('QB')).toBe(true)
    })

    it('should reject queries with less than 2 characters', () => {
      expect(validatePlayerSearch('a')).toBe(false)
      expect(validatePlayerSearch('')).toBe(false)
    })

    it('should trim whitespace', () => {
      expect(validatePlayerSearch('  ab  ')).toBe(true)
      expect(validatePlayerSearch('  a  ')).toBe(false)
    })

    it('should accept exactly 2 characters', () => {
      expect(validatePlayerSearch('ab')).toBe(true)
    })
  })

  describe('userRegistrationSchema', () => {
    it('should validate correct registration data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        teamName: 'My Team'
      }
      
      const result = userRegistrationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require name', () => {
      const data = {
        email: 'john@example.com',
        password: 'password123'
      }
      
      const result = userRegistrationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate email format', () => {
      const data = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123'
      }
      
      const result = userRegistrationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate password length', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'short'
      }
      
      const result = userRegistrationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should make teamName optional', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      }
      
      const result = userRegistrationSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate name length', () => {
      const data = {
        name: 'a'.repeat(101),
        email: 'john@example.com',
        password: 'password123'
      }
      
      const result = userRegistrationSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'john@example.com',
        password: 'password123'
      }
      
      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require email', () => {
      const data = {
        password: 'password123'
      }
      
      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should require password', () => {
      const data = {
        email: 'john@example.com'
      }
      
      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate email format', () => {
      const data = {
        email: 'invalid',
        password: 'password123'
      }
      
      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should not enforce minimum password length for login', () => {
      const data = {
        email: 'john@example.com',
        password: 'a'
      }
      
      const result = loginSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})
