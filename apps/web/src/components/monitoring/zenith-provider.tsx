'use client'

import React, { useEffect } from 'react'
import { zenithMonitor } from '@/lib/monitoring/zenith-qa-monitor'
import { zenithHealth } from '@/lib/qa/health-monitor'

interface ZenithMonitoringProviderProps {
  children: React.ReactNode
}

export function ZenithMonitoringProvider({ children }: ZenithMonitoringProviderProps) {
  useEffect(() => {
    // Initialize monitoring systems only in the browser
    if (typeof window !== 'undefined') {
      console.log('[Zenith] Initializing monitoring systems...')
      
      // Initialize error and performance monitoring
      zenithMonitor.initialize()
      
      // Start health monitoring after a brief delay
      setTimeout(() => {
        zenithHealth.startMonitoring(5) // Check every 5 minutes
      }, 5000)
      
      // Cleanup on unmount
      return () => {
        zenithHealth.stopMonitoring()
      }
    }
  }, [])

  return <>{children}</>
}