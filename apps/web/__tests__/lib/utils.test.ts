/**
 * Utils Library Tests
 * 
 * Tests for utility functions
 */

import { cn } from '@/lib/utils'

describe('Utils Library', () => {
  describe('cn (className merger)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden')
      expect(result).toBe('base conditional')
    })

    it('should merge Tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4')
      expect(result).toBe('py-1 px-4')
    })

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2'])
      expect(result).toBe('class1 class2')
    })

    it('should handle objects', () => {
      const result = cn({ class1: true, class2: false, class3: true })
      expect(result).toBe('class1 class3')
    })

    it('should handle undefined and null', () => {
      const result = cn('class1', undefined, null, 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle empty input', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle complex combinations', () => {
      const result = cn(
        'base',
        { active: true, disabled: false },
        ['array1', 'array2'],
        undefined,
        'final'
      )
      expect(result).toContain('base')
      expect(result).toContain('active')
      expect(result).toContain('array1')
      expect(result).toContain('final')
    })
  })
})
