/**
 * Catalyst Performance Monitor Tests
 * 
 * Tests for lib/performance/catalyst-monitor.ts
 */

import { CatalystPerformanceMonitor, catalystMonitor } from '@/lib/performance/catalyst-monitor'

// Mock browser APIs
global.PerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
})) as any

global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
} as any

global.navigator = {
  ...global.navigator,
  sendBeacon: jest.fn(() => true),
  userAgent: 'test-agent',
  connection: { effectiveType: '4g' }
} as any

describe('Catalyst Performance Monitor', () => {
  describe('CatalystPerformanceMonitor', () => {
    it('should create instance', () => {
      const monitor = new CatalystPerformanceMonitor()
      expect(monitor).toBeDefined()
    })

    it('should accept custom budget', () => {
      const monitor = new CatalystPerformanceMonitor({ LCP: 3000 })
      expect(monitor).toBeDefined()
    })

    it('should get metrics', () => {
      const monitor = new CatalystPerformanceMonitor()
      const metrics = monitor.getMetrics()
      expect(metrics).toBeInstanceOf(Map)
    })

    it('should generate report', () => {
      const monitor = new CatalystPerformanceMonitor()
      const report = monitor.getReport()
      expect(report).toBeDefined()
      expect(report.timestamp).toBeDefined()
      expect(report.coreWebVitals).toBeDefined()
    })

    it('should set budget', () => {
      const monitor = new CatalystPerformanceMonitor()
      monitor.setBudget({ FCP: 2000 })
      expect(monitor).toBeDefined()
    })

    it('should start profiling', () => {
      const monitor = new CatalystPerformanceMonitor()
      const endProfiling = monitor.startProfiling('test')
      expect(typeof endProfiling).toBe('function')
      endProfiling()
    })

    it('should mark feature usage', () => {
      const monitor = new CatalystPerformanceMonitor()
      monitor.markFeatureUsage('test-feature')
      const metrics = monitor.getMetrics()
      expect(metrics.has('feature.test-feature')).toBe(true)
    })

    it('should track errors', () => {
      const monitor = new CatalystPerformanceMonitor()
      const error = new Error('Test error')
      monitor.trackError(error, { context: 'test' })
      expect(navigator.sendBeacon).toHaveBeenCalled()
    })

    it('should dispose properly', () => {
      const monitor = new CatalystPerformanceMonitor()
      monitor.dispose()
      const metrics = monitor.getMetrics()
      expect(metrics.size).toBe(0)
    })
  })

  describe('catalystMonitor singleton', () => {
    it('should be defined', () => {
      expect(catalystMonitor).toBeDefined()
    })

    it('should have getMetrics method', () => {
      expect(typeof catalystMonitor.getMetrics).toBe('function')
    })

    it('should have getReport method', () => {
      expect(typeof catalystMonitor.getReport).toBe('function')
    })
  })
})
