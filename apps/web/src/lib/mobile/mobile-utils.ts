'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

// Sigma: Mobile device detection and capabilities
export interface MobileCapabilities {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isIOS: boolean
  isAndroid: boolean
  isSafari: boolean
  isChrome: boolean
  isFirefox: boolean
  supportsTouchEvents: boolean
  supportsPointerEvents: boolean
  supportsVibration: boolean
  supportsServiceWorker: boolean
  supportsWebGL: boolean
  devicePixelRatio: number
  screenWidth: number
  screenHeight: number
  orientation: 'portrait' | 'landscape'
  isStandalone: boolean
  maxTouchPoints: number
  hasCamera: boolean
  hasGeolocation: boolean
  connectionType: string
}

// Sigma: Advanced mobile device detection
export function useMobileCapabilities(): MobileCapabilities {
  const [capabilities, setCapabilities] = useState<MobileCapabilities>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isIOS: false,
    isAndroid: false,
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    supportsTouchEvents: false,
    supportsPointerEvents: false,
    supportsVibration: false,
    supportsServiceWorker: false,
    supportsWebGL: false,
    devicePixelRatio: 1,
    screenWidth: 1024,
    screenHeight: 768,
    orientation: 'landscape',
    isStandalone: false,
    maxTouchPoints: 0,
    hasCamera: false,
    hasGeolocation: false,
    connectionType: 'unknown'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const userAgent = navigator.userAgent
    const platform = navigator.platform
    
    // Device type detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?=.*Mobile)|Tablet/i.test(userAgent) && !/Mobile/i.test(userAgent)
    const isDesktop = !isMobile && !isTablet

    // OS detection
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    const isAndroid = /Android/.test(userAgent)

    // Browser detection
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
    const isChrome = /Chrome/.test(userAgent)
    const isFirefox = /Firefox/.test(userAgent)

    // Feature detection
    const supportsTouchEvents = 'ontouchstart' in window
    const supportsPointerEvents = 'onpointerdown' in window
    const supportsVibration = 'vibrate' in navigator
    const supportsServiceWorker = 'serviceWorker' in navigator
    const supportsWebGL = (() => {
      try {
        const canvas = document.createElement('canvas')
        return !!(window.WebGLRenderingContext && canvas.getContext('webgl'))
      } catch {
        return false
      }
    })()

    // Screen properties
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const devicePixelRatio = window.devicePixelRatio || 1
    const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait'

    // PWA detection
    const isStandalone = (window.navigator as any).standalone || 
                        window.matchMedia('(display-mode: standalone)').matches

    // Touch capabilities
    const maxTouchPoints = navigator.maxTouchPoints || 0

    // Camera and geolocation
    const hasCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    const hasGeolocation = 'geolocation' in navigator

    // Connection type
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    const connectionType = connection?.effectiveType || 'unknown'

    setCapabilities({
      isMobile,
      isTablet,
      isDesktop,
      isIOS,
      isAndroid,
      isSafari,
      isChrome,
      isFirefox,
      supportsTouchEvents,
      supportsPointerEvents,
      supportsVibration,
      supportsServiceWorker,
      supportsWebGL,
      devicePixelRatio,
      screenWidth,
      screenHeight,
      orientation,
      isStandalone,
      maxTouchPoints,
      hasCamera,
      hasGeolocation,
      connectionType
    })
  }, [])

  return capabilities
}

// Sigma: Touch gesture detection
export interface TouchGesture {
  type: 'tap' | 'longpress' | 'swipe' | 'pinch' | 'pan'
  direction?: 'up' | 'down' | 'left' | 'right'
  distance?: number
  duration?: number
  scale?: number
  velocity?: { x: number; y: number }
}

export function useTouchGestures(element: React.RefObject<HTMLElement>) {
  const [gesture, setGesture] = useState<TouchGesture | null>(null)
  const touchStart = useRef<Touch | null>(null)
  const touchStartTime = useRef<number>(0)
  const initialPinchDistance = useRef<number>(0)

  const calculateDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const calculateVelocity = useCallback((start: Touch, end: Touch, duration: number) => {
    const dx = end.clientX - start.clientX
    const dy = end.clientY - start.clientY
    return {
      x: dx / duration,
      y: dy / duration
    }
  }, [])

  useEffect(() => {
    const el = element.current
    if (!el) return

    let longPressTimer: NodeJS.Timeout

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStart.current = e.touches[0]
        touchStartTime.current = Date.now()
        
        // Long press detection
        longPressTimer = setTimeout(() => {
          setGesture({
            type: 'longpress',
            duration: Date.now() - touchStartTime.current
          })
        }, 500)
      } else if (e.touches.length === 2) {
        // Pinch gesture start
        initialPinchDistance.current = calculateDistance(e.touches[0], e.touches[1])
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }

      if (e.touches.length === 2 && initialPinchDistance.current > 0) {
        // Pinch gesture
        const currentDistance = calculateDistance(e.touches[0], e.touches[1])
        const scale = currentDistance / initialPinchDistance.current
        
        setGesture({
          type: 'pinch',
          scale
        })
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }

      if (!touchStart.current) return

      const touchEnd = e.changedTouches[0]
      const duration = Date.now() - touchStartTime.current
      const dx = touchEnd.clientX - touchStart.current.clientX
      const dy = touchEnd.clientY - touchStart.current.clientY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 10 && duration < 500) {
        // Tap gesture
        setGesture({
          type: 'tap',
          duration
        })
      } else if (distance > 30) {
        // Swipe gesture
        const velocity = calculateVelocity(touchStart.current, touchEnd, duration)
        let direction: 'up' | 'down' | 'left' | 'right'
        
        if (Math.abs(dx) > Math.abs(dy)) {
          direction = dx > 0 ? 'right' : 'left'
        } else {
          direction = dy > 0 ? 'down' : 'up'
        }

        setGesture({
          type: 'swipe',
          direction,
          distance,
          velocity,
          duration
        })
      }

      touchStart.current = null
      initialPinchDistance.current = 0
    }

    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      if (longPressTimer) clearTimeout(longPressTimer)
    }
  }, [element, calculateDistance, calculateVelocity])

  return gesture
}

// Sigma: Viewport and orientation utilities
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: 0,
    height: 0,
    orientation: 'portrait' as 'portrait' | 'landscape',
    isPortrait: true,
    isLandscape: false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateViewport = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const orientation = width > height ? 'landscape' : 'portrait'
      
      setViewport({
        width,
        height,
        orientation,
        isPortrait: orientation === 'portrait',
        isLandscape: orientation === 'landscape'
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [])

  return viewport
}

// Sigma: Safe area utilities for notched devices
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateSafeArea = () => {
      const style = getComputedStyle(document.documentElement)
      
      setSafeArea({
        top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
        right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
        bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0')
      })
    }

    updateSafeArea()
    window.addEventListener('resize', updateSafeArea)
    window.addEventListener('orientationchange', updateSafeArea)

    return () => {
      window.removeEventListener('resize', updateSafeArea)
      window.removeEventListener('orientationchange', updateSafeArea)
    }
  }, [])

  return safeArea
}

// Sigma: Performance monitoring for mobile
export function useMobilePerformance() {
  const [performance, setPerformance] = useState({
    fps: 60,
    memoryUsage: 0,
    connectionSpeed: 'unknown',
    batteryLevel: null as number | null,
    isLowBattery: false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    let frameCount = 0
    let lastTime = Date.now()
    let animationId: number

    // FPS monitoring
    const measureFPS = () => {
      frameCount++
      const currentTime = Date.now()
      
      if (currentTime - lastTime >= 1000) {
        setPerformance(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime))
        }))
        frameCount = 0
        lastTime = currentTime
      }
      
      animationId = requestAnimationFrame(measureFPS)
    }

    measureFPS()

    // Memory monitoring
    const updateMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setPerformance(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
        }))
      }
    }

    // Connection monitoring
    const updateConnection = () => {
      const connection = (navigator as any).connection
      if (connection) {
        setPerformance(prev => ({
          ...prev,
          connectionSpeed: connection.effectiveType
        }))
      }
    }

    // Battery monitoring
    const updateBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery()
          setPerformance(prev => ({
            ...prev,
            batteryLevel: battery.level,
            isLowBattery: battery.level < 0.2
          }))
        } catch (error) {
          console.warn('Battery API not available')
        }
      }
    }

    const memoryInterval = setInterval(updateMemory, 5000)
    const connectionInterval = setInterval(updateConnection, 10000)
    
    updateConnection()
    updateBattery()

    return () => {
      cancelAnimationFrame(animationId)
      clearInterval(memoryInterval)
      clearInterval(connectionInterval)
    }
  }, [])

  return performance
}

// Sigma: Haptic feedback utilities
export function useHapticFeedback() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }, [])

  const tapFeedback = useCallback(() => {
    vibrate(10) // Short vibration for tap
  }, [vibrate])

  const successFeedback = useCallback(() => {
    vibrate([100, 50, 100]) // Success pattern
  }, [vibrate])

  const errorFeedback = useCallback(() => {
    vibrate([200, 100, 200, 100, 200]) // Error pattern
  }, [vibrate])

  const longPressFeedback = useCallback(() => {
    vibrate(200) // Long vibration for long press
  }, [vibrate])

  return {
    vibrate,
    tapFeedback,
    successFeedback,
    errorFeedback,
    longPressFeedback
  }
}

// Sigma: Network status monitoring
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: true,
    connectionType: 'unknown',
    downlink: 0,
    effectiveType: 'unknown',
    rtt: 0,
    saveData: false
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      
      setNetworkStatus({
        isOnline: navigator.onLine,
        connectionType: connection?.type || 'unknown',
        downlink: connection?.downlink || 0,
        effectiveType: connection?.effectiveType || 'unknown',
        rtt: connection?.rtt || 0,
        saveData: connection?.saveData || false
      })
    }

    updateNetworkStatus()

    window.addEventListener('online', updateNetworkStatus)
    window.addEventListener('offline', updateNetworkStatus)
    
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkStatus)
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus)
      window.removeEventListener('offline', updateNetworkStatus)
      
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkStatus)
      }
    }
  }, [])

  return networkStatus
}

// Sigma: Pull-to-refresh implementation
export function usePullToRefresh(onRefresh: () => Promise<void>, threshold = 100) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isPulling = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
      isPulling.current = true
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling.current || isRefreshing) return

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    if (diff > 0 && window.scrollY === 0) {
      e.preventDefault()
      setPullDistance(Math.min(diff, threshold * 1.5))
    }
  }, [threshold, isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return

    isPulling.current = false

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    isRefreshing,
    pullDistance,
    isThresholdReached: pullDistance >= threshold
  }
}

// Sigma: Utility functions for mobile optimization
export const mobileUtils = {
  // Prevent iOS zoom on input focus
  preventZoom: () => {
    const viewport = document.querySelector('meta[name=viewport]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    }
  },

  // Enable iOS zoom
  enableZoom: () => {
    const viewport = document.querySelector('meta[name=viewport]')
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0')
    }
  },

  // Check if running in PWA mode
  isPWA: (): boolean => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true
  },

  // Get device orientation
  getOrientation: (): 'portrait' | 'landscape' => {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
  },

  // Check if device supports touch
  supportsTouch: (): boolean => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  },

  // Get connection quality
  getConnectionQuality: (): 'slow' | 'medium' | 'fast' => {
    const connection = (navigator as any).connection
    if (!connection) return 'medium'

    const effectiveType = connection.effectiveType
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow'
    if (effectiveType === '3g') return 'medium'
    return 'fast'
  },

  // Optimize images for mobile
  getOptimizedImageUrl: (url: string, width: number, quality = 80): string => {
    // This would integrate with your image optimization service
    return `${url}?w=${width}&q=${quality}&auto=format`
  },

  // Format file size for mobile display
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }
}