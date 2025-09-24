/**
 * Number Utilities Unit Tests
 * Tests safe number formatting utilities used throughout the application
 */

import {
  safeToFixed,
  safePercentage
} from '../../../src/utils/numberUtils'

describe('numberUtils', () => {
  describe('safeToFixed', () => {
    it('should format valid numbers correctly', () => {
      expect(safeToFixed(12.3456)).toBe('12.35')
      expect(safeToFixed(12.3456, 1)).toBe('12.3')
      expect(safeToFixed(12.3456, 3)).toBe('12.346')
      expect(safeToFixed(0)).toBe('0.00')
      expect(safeToFixed(100)).toBe('100.00')
    })

    it('should handle null and undefined', () => {
      expect(safeToFixed(null)).toBe('0.00')
      expect(safeToFixed(undefined)).toBe('0.00')
      expect(safeToFixed(null, 1)).toBe('0.0')
      expect(safeToFixed(undefined, 3)).toBe('0.000')
    })

    it('should handle invalid numbers', () => {
      expect(safeToFixed('not a number')).toBe('0.00')
      expect(safeToFixed(NaN)).toBe('0.00')
      expect(safeToFixed(Infinity)).toBe('0.00')
      expect(safeToFixed(-Infinity)).toBe('0.00')
    })

    it('should use custom default values', () => {
      expect(safeToFixed(null, 2, 'N/A')).toBe('N/A')
      expect(safeToFixed('invalid', 1, '-.0')).toBe('-.0')
      expect(safeToFixed(NaN, 2, '99.99')).toBe('99.99')
    })

    it('should handle string numbers', () => {
      expect(safeToFixed('12.34')).toBe('12.34')
      expect(safeToFixed('0')).toBe('0.00')
      expect(safeToFixed('-5.7')).toBe('-5.70')
    })

    it('should handle edge cases', () => {
      expect(safeToFixed(0.1 + 0.2, 1)).toBe('0.3') // JavaScript floating point precision
      expect(safeToFixed(-0)).toBe('0.00')
      expect(safeToFixed(1e-10)).toBe('0.00')
    })

    it('should handle default value formatting', () => {
      // Test when default value already has decimal places
      expect(safeToFixed(null, 2, '99.99')).toBe('99.99')
      expect(safeToFixed(null, 1, '5.0')).toBe('5.0')
      
      // Test when default value needs decimal places added
      expect(safeToFixed(null, 2, '5')).toBe('5.00')
      expect(safeToFixed(null, 1, '10')).toBe('10.0')
    })
  })

  describe('safePercentage', () => {
    it('should format valid percentages', () => {
      expect(safePercentage(0.5)).toBe('50.0%')
      expect(safePercentage(0.123, 2)).toBe('12.30%')
      expect(safePercentage(1.5)).toBe('150.0%')
      expect(safePercentage(0)).toBe('0.0%')
    })

    it('should handle invalid values', () => {
      expect(safePercentage(null)).toBe('0.0%')
      expect(safePercentage(undefined)).toBe('0.0%')
      expect(safePercentage(NaN)).toBe('0.0%')
      expect(safePercentage('invalid')).toBe('0.0%')
    })

    it('should handle different decimal places', () => {
      expect(safePercentage(0.12345, 0)).toBe('12%')
      expect(safePercentage(0.12345, 1)).toBe('12.3%')
      expect(safePercentage(0.12345, 3)).toBe('12.345%')
    })

    it('should handle negative percentages', () => {
      expect(safePercentage(-0.5)).toBe('-50.0%')
      expect(safePercentage(-0.0123, 2)).toBe('-1.23%')
    })

    it('should handle large percentages', () => {
      expect(safePercentage(1.005)).toBe('100.5%')
      expect(safePercentage(12.34567, 2)).toBe('1234.57%')
    })
  })

  describe('Integration Tests', () => {
    it('should work with fantasy football point calculations', () => {
      // Simulate fantasy football scenarios
      const playerPoints = [12.4, null, undefined, 'invalid', 0, 22.8, NaN]
      
      // Use safeToFixed to handle all these values
      const formattedPoints = playerPoints.map(points => safeToFixed(points, 1))
      
      expect(formattedPoints).toEqual([
        '12.4', '0.0', '0.0', '0.0', '0.0', '22.8', '0.0'
      ])
    })

    it('should handle percentage calculations for completion rates', () => {
      // QB completion percentage scenarios
      const completionRates = [0.652, null, 0.789, 'invalid', undefined]
      
      const formattedRates = completionRates.map(rate => safePercentage(rate, 1))
      
      expect(formattedRates).toEqual([
        '65.2%', '0.0%', '78.9%', '0.0%', '0.0%'
      ])
    })

    it('should handle edge cases in fantasy calculations', () => {
      // Test various edge cases that might occur in fantasy football
      const testValues = [
        0.1 + 0.2, // JavaScript floating point issue
        -0, // Negative zero
        1e-10, // Very small number
        1e10, // Very large number
        '12.34', // String number
      ]

      testValues.forEach(value => {
        const result = safeToFixed(value)
        expect(typeof result).toBe('string')
        expect(result).toMatch(/^-?\d+\.\d+$/)
      })
    })

    it('should be performant with large datasets', () => {
      // Test performance with many values (like player stats)
      const largeDataset = Array.from({ length: 1000 }, (_, i) => i * 0.123)
      
      const startTime = performance.now()
      const results = largeDataset.map(value => safeToFixed(value, 2))
      const endTime = performance.now()
      
      expect(results).toHaveLength(1000)
      expect(results[0]).toBe('0.00')
      expect(results[999]).toBe('122.88')
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
    })

    it('should maintain precision in calculations', () => {
      // Test that rounding works correctly for fantasy points
      const testCases = [
        { input: 12.999, decimals: 2, expected: '13.00' },
        { input: 12.994, decimals: 2, expected: '12.99' },
        { input: 12.996, decimals: 2, expected: '13.00' }, // Changed from 12.995 due to IEEE 754 precision
        { input: 0.001, decimals: 2, expected: '0.00' },
        { input: 0.999, decimals: 0, expected: '1' }
      ]

      testCases.forEach(({ input, decimals, expected }) => {
        expect(safeToFixed(input, decimals)).toBe(expected)
      })
    })

    it('should handle fantasy football scoring scenarios', () => {
      // Realistic fantasy football point scenarios
      const scenarios = [
        { player: 'QB', points: 24.38, formatted: '24.38' },
        { player: 'RB', points: null, formatted: '0.00' }, // Injured player
        { player: 'WR', points: 0, formatted: '0.00' }, // Goose egg
        { player: 'TE', points: 15.7, formatted: '15.70' },
        { player: 'K', points: -1, formatted: '-1.00' }, // Missed kicks
        { player: 'DST', points: 18.0, formatted: '18.00' }
      ]

      scenarios.forEach(({ player, points, formatted }) => {
        expect(safeToFixed(points, 2)).toBe(formatted)
      })
    })
  })
})