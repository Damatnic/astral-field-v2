/**
 * Catalyst Asset Optimization Service
 * Advanced image optimization, lazy loading, and CDN integration
 * Optimized for Core Web Vitals and loading performance
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'auto'
  priority?: boolean
  lazy?: boolean
  blur?: boolean
  sizes?: string
  placeholder?: 'blur' | 'empty'
  onLoad?: () => void
  onError?: () => void
}

interface ResponsiveImageSizes {
  mobile: number
  tablet: number
  desktop: number
  xl: number
}

// Catalyst: Advanced image optimization utilities
export class ImageOptimizer {
  private static instance: ImageOptimizer
  private imageCache = new Map<string, HTMLImageElement>()
  private intersectionObserver: IntersectionObserver | null = null
  private loadingQueue = new Set<string>()

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupIntersectionObserver()
    }
  }

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer()
    }
    return ImageOptimizer.instance
  }

  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const dataSrc = img.getAttribute('data-src')
            if (dataSrc && !this.loadingQueue.has(dataSrc)) {
              this.loadImage(img, dataSrc)
              this.intersectionObserver?.unobserve(img)
            }
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    )
  }

  /**
   * Generate optimized image URLs for different formats and sizes
   */
  generateOptimizedUrl(
    src: string,
    options: ImageOptimizationOptions = {}
  ): string {
    const {
      width,
      height,
      quality = 85,
      format = 'auto'
    } = options

    // If it's an external URL, return as-is (would integrate with CDN service)
    if (src.startsWith('http') && !src.includes(window.location.hostname)) {
      return src
    }

    // Build optimization parameters
    const params = new URLSearchParams()
    
    if (width) params.set('w', width.toString())
    if (height) params.set('h', height.toString())
    if (quality !== 85) params.set('q', quality.toString())
    if (format !== 'auto') params.set('fm', format)

    const paramString = params.toString()
    const separator = src.includes('?') ? '&' : '?'
    
    return paramString ? `${src}${separator}${paramString}` : src
  }

  /**
   * Generate responsive image srcSet
   */
  generateSrcSet(
    src: string,
    sizes: ResponsiveImageSizes,
    options: ImageOptimizationOptions = {}
  ): string {
    const { quality = 85, format = 'auto' } = options
    
    return Object.entries(sizes)
      .map(([breakpoint, width]) => {
        const optimizedUrl = this.generateOptimizedUrl(src, {
          width,
          quality,
          format
        })
        return `${optimizedUrl} ${width}w`
      })
      .join(', ')
  }

  /**
   * Preload critical images
   */
  preloadImage(src: string, options: ImageOptimizationOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.imageCache.has(src)) {
        resolve()
        return
      }

      const img = new Image()
      const optimizedSrc = this.generateOptimizedUrl(src, options)
      
      img.onload = () => {
        this.imageCache.set(src, img)
        resolve()
      }
      
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${src}`))
      }
      
      img.src = optimizedSrc
    })
  }

  /**
   * Load image with lazy loading
   */
  private loadImage(img: HTMLImageElement, src: string): void {
    if (this.loadingQueue.has(src)) return
    
    this.loadingQueue.add(src)
    
    const tempImg = new Image()
    tempImg.onload = () => {
      img.src = src
      img.classList.remove('lazy-loading')
      img.classList.add('lazy-loaded')
      this.loadingQueue.delete(src)
    }
    
    tempImg.onerror = () => {
      img.classList.add('lazy-error')
      this.loadingQueue.delete(src)
    }
    
    tempImg.src = src
  }

  /**
   * Set up lazy loading for an image element
   */
  setupLazyLoading(img: HTMLImageElement, src: string): void {
    if (!this.intersectionObserver) return
    
    img.setAttribute('data-src', src)
    img.classList.add('lazy-loading')
    this.intersectionObserver.observe(img)
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.intersectionObserver?.disconnect()
    this.imageCache.clear()
    this.loadingQueue.clear()
  }
}

// Catalyst: React hook for optimized images
export function useOptimizedImage(
  src: string,
  options: ImageOptimizationOptions = {}
) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [optimizedSrc, setOptimizedSrc] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)
  const optimizer = ImageOptimizer.getInstance()

  const {
    width,
    height,
    quality = 85,
    format = 'auto',
    priority = false,
    lazy = true,
    onLoad,
    onError
  } = options

  useEffect(() => {
    const generated = optimizer.generateOptimizedUrl(src, {
      width,
      height,
      quality,
      format
    })
    setOptimizedSrc(generated)

    // Preload high priority images
    if (priority) {
      optimizer.preloadImage(src, options)
        .then(() => setIsLoaded(true))
        .catch(() => setIsError(true))
    }
  }, [src, width, height, quality, format, priority])

  useEffect(() => {
    const img = imgRef.current
    if (!img || !optimizedSrc) return

    if (lazy && !priority) {
      optimizer.setupLazyLoading(img, optimizedSrc)
    }

    const handleLoad = () => {
      setIsLoaded(true)
      onLoad?.()
    }

    const handleError = () => {
      setIsError(true)
      onError?.()
    }

    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)

    return () => {
      img.removeEventListener('load', handleLoad)
      img.removeEventListener('error', handleError)
    }
  }, [optimizedSrc, lazy, priority, onLoad, onError])

  return {
    imgRef,
    optimizedSrc,
    isLoaded,
    isError
  }
}

// Catalyst: Advanced CSS and font optimization
export class CSSOptimizer {
  private static instance: CSSOptimizer
  private criticalCSS = new Set<string>()
  private deferredCSS = new Map<string, HTMLLinkElement>()

  private constructor() {}

  static getInstance(): CSSOptimizer {
    if (!CSSOptimizer.instance) {
      CSSOptimizer.instance = new CSSOptimizer()
    }
    return CSSOptimizer.instance
  }

  /**
   * Load CSS asynchronously
   */
  loadCSSAsync(href: string, media: string = 'all'): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.deferredCSS.has(href)) {
        resolve()
        return
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.media = 'print' // Load as print to avoid blocking
      link.onload = () => {
        link.media = media // Switch to target media
        this.deferredCSS.set(href, link)
        resolve()
      }
      link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`))

      document.head.appendChild(link)
    })
  }

  /**
   * Preload fonts with optimal loading strategy
   */
  preloadFonts(fonts: Array<{
    href: string
    crossOrigin?: string
    type?: string
  }>): void {
    fonts.forEach(({ href, crossOrigin = 'anonymous', type = 'font/woff2' }) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'font'
      link.type = type
      link.crossOrigin = crossOrigin
      link.href = href
      document.head.appendChild(link)
    })
  }

  /**
   * Extract and inline critical CSS
   */
  inlineCriticalCSS(css: string): void {
    if (this.criticalCSS.has(css)) return

    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    this.criticalCSS.add(css)
  }
}

// Catalyst: Service Worker for asset caching
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager
  private registration: ServiceWorkerRegistration | null = null

  private constructor() {}

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager()
    }
    return ServiceWorkerManager.instance
  }

  /**
   * Register service worker for asset caching
   */
  async registerServiceWorker(swPath: string = '/sw.js'): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    try {
      this.registration = await navigator.serviceWorker.register(swPath)
      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {

        console.error('Service Worker registration failed:', error);

      }
    }
  }

  /**
   * Cache assets programmatically
   */
  async cacheAssets(assets: string[]): Promise<void> {
    if (!this.registration || !this.registration.active) return

    // Send message to service worker to cache assets
    this.registration.active.postMessage({
      type: 'CACHE_ASSETS',
      assets
    })
  }

  /**
   * Clear old caches
   */
  async clearOldCaches(): Promise<void> {
    if (!this.registration || !this.registration.active) return

    this.registration.active.postMessage({
      type: 'CLEAR_OLD_CACHES'
    })
  }
}

// Catalyst: Performance budget monitoring
export class PerformanceBudget {
  private static thresholds = {
    maxBundleSize: 1024 * 1024, // 1MB
    maxImageSize: 500 * 1024,   // 500KB
    maxCSSSize: 100 * 1024,     // 100KB
    maxJSSize: 800 * 1024       // 800KB
  }

  static checkImageSize(size: number): boolean {
    return size <= this.thresholds.maxImageSize
  }

  static checkBundleSize(size: number): boolean {
    return size <= this.thresholds.maxBundleSize
  }

  static logViolation(type: string, size: number, threshold: number): void {
    console.warn(`Performance Budget Violation: ${type} size (${size} bytes) exceeds threshold (${threshold} bytes)`)
  }

  static monitorAssetSizes(): void {
    if (typeof window === 'undefined') return

    // Monitor image sizes
    const images = document.querySelectorAll('img')
    images.forEach((img) => {
      img.addEventListener('load', () => {
        // Estimate image size (simplified)
        const estimatedSize = (img.naturalWidth * img.naturalHeight * 3) / 2
        if (!this.checkImageSize(estimatedSize)) {
          this.logViolation('Image', estimatedSize, this.thresholds.maxImageSize)
        }
      })
    })
  }
}

// Export singletons
export const imageOptimizer = ImageOptimizer.getInstance()
export const cssOptimizer = CSSOptimizer.getInstance()
export const serviceWorkerManager = ServiceWorkerManager.getInstance()

// Export default class
export default ImageOptimizer