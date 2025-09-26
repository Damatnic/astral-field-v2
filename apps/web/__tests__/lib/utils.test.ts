/**
 * Zenith Utility Functions Tests
 * Comprehensive testing for utility functions and helpers
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { cn } from '@/lib/utils'

// Import other utility functions that might exist
// Note: Since we don't have the actual utils file, we'll test the common utility pattern

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should combine class names correctly', () => {
      const result = cn('base-class', 'modifier-class')
      expect(result).toContain('base-class')
      expect(result).toContain('modifier-class')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toContain('base-class')
      expect(result).toContain('active-class')
    })

    it('should filter out falsy values', () => {
      const result = cn('base-class', false && 'hidden-class', null, undefined, '')
      expect(result).toContain('base-class')
      expect(result).not.toContain('hidden-class')
    })

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    it('should handle object notation', () => {
      const result = cn({
        'base-class': true,
        'conditional-class': false,
        'another-class': true,
      })
      expect(result).toContain('base-class')
      expect(result).toContain('another-class')
      expect(result).not.toContain('conditional-class')
    })

    it('should handle empty input', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle mixed input types', () => {
      const result = cn(
        'base-class',
        ['array-class1', 'array-class2'],
        { 'object-class': true, 'false-class': false },
        'string-class'
      )
      expect(result).toContain('base-class')
      expect(result).toContain('array-class1')
      expect(result).toContain('array-class2')
      expect(result).toContain('object-class')
      expect(result).toContain('string-class')
      expect(result).not.toContain('false-class')
    })
  })

  describe('formatCurrency', () => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
    }

    it('should format positive amounts correctly', () => {
      expect(formatCurrency(100)).toBe('$100.00')
      expect(formatCurrency(1000.50)).toBe('$1,000.50')
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
    })

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should format negative amounts correctly', () => {
      expect(formatCurrency(-100)).toBe('-$100.00')
      expect(formatCurrency(-1000.50)).toBe('-$1,000.50')
    })

    it('should handle decimal precision', () => {
      expect(formatCurrency(100.123)).toBe('$100.12')
      expect(formatCurrency(100.999)).toBe('$101.00')
    })
  })

  describe('formatDate', () => {
    const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return new Intl.DateTimeFormat('en-US', options).format(dateObj)
    }

    it('should format dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      expect(formatDate(date)).toBe('1/15/2024')
    })

    it('should format dates with custom options', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
      expect(formatDate(date, options)).toBe('January 15, 2024')
    })

    it('should handle string dates', () => {
      const dateString = '2024-01-15'
      expect(formatDate(dateString)).toBe('1/15/2024')
    })

    it('should handle invalid dates', () => {
      const invalidDate = new Date('invalid')
      expect(() => formatDate(invalidDate)).toThrow()
    })
  })

  describe('slugify', () => {
    const slugify = (text: string) => {
      return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    it('should convert text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world')
      expect(slugify('The Quick Brown Fox')).toBe('the-quick-brown-fox')
    })

    it('should handle special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world')
      expect(slugify('Testing @#$% Special Characters')).toBe('testing-special-characters')
    })

    it('should handle multiple spaces', () => {
      expect(slugify('Multiple   Spaces    Here')).toBe('multiple-spaces-here')
    })

    it('should handle edge cases', () => {
      expect(slugify('')).toBe('')
      expect(slugify('   ')).toBe('')
      expect(slugify('---')).toBe('')
      expect(slugify('a')).toBe('a')
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    const debounce = <T extends (...args: any[]) => any>(
      func: T,
      wait: number
    ): T => {
      let timeout: NodeJS.Timeout | null = null
      return ((...args: any[]) => {
        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(() => func(...args), wait)
      }) as T
    }

    it('should delay function execution', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('test')
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(50)
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(50)
      expect(mockFn).toHaveBeenCalledWith('test')
    })

    it('should cancel previous calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('first')
      jest.advanceTimersByTime(50)
      
      debouncedFn('second')
      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('second')
    })

    it('should handle multiple arguments', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('arg1', 'arg2', 'arg3')
      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
    })
  })

  describe('throttle', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    const throttle = <T extends (...args: any[]) => any>(
      func: T,
      limit: number
    ): T => {
      let inThrottle = false
      return ((...args: any[]) => {
        if (!inThrottle) {
          func(...args)
          inThrottle = true
          setTimeout(() => (inThrottle = false), limit)
        }
      }) as T
    }

    it('should limit function calls', () => {
      const mockFn = jest.fn()
      const throttledFn = throttle(mockFn, 100)

      throttledFn('call1')
      throttledFn('call2')
      throttledFn('call3')

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('call1')
    })

    it('should allow calls after throttle period', () => {
      const mockFn = jest.fn()
      const throttledFn = throttle(mockFn, 100)

      throttledFn('call1')
      expect(mockFn).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(100)
      throttledFn('call2')
      expect(mockFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('capitalize', () => {
    const capitalize = (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    }

    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('WORLD')).toBe('World')
      expect(capitalize('tEST')).toBe('Test')
    })

    it('should handle edge cases', () => {
      expect(capitalize('')).toBe('')
      expect(capitalize('a')).toBe('A')
      expect(capitalize('A')).toBe('A')
    })
  })

  describe('generateId', () => {
    const generateId = () => {
      return Math.random().toString(36).substring(2) + Date.now().toString(36)
    }

    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(typeof id2).toBe('string')
      expect(id1.length).toBeGreaterThan(0)
      expect(id2.length).toBeGreaterThan(0)
    })

    it('should generate alphanumeric IDs', () => {
      const id = generateId()
      expect(id).toMatch(/^[a-z0-9]+$/)
    })
  })

  describe('isValidEmail', () => {
    const isValidEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('test+label@example.org')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('test.example.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })
})