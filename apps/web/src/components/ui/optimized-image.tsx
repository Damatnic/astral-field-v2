/**
 * Catalyst Optimized Image Component
 * Provides automatic format detection, lazy loading, and responsive sizing
 */

'use client'

import { useState, useRef, useEffect, memo } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  fill?: boolean
  sizes?: string
  quality?: number
  onLoad?: () => void
  onError?: () => void
  fallbackSrc?: string
  lazy?: boolean
  aspectRatio?: number
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
}

const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  fill = false,
  sizes,
  quality = 85,
  onLoad,
  onError,
  fallbackSrc,
  lazy = true,
  aspectRatio,
  objectFit = 'cover',
  ...props
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const imgRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, priority])

  // Handle image load
  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  // Handle image error with fallback
  const handleError = () => {
    setHasError(true)
    setIsLoading(false)
    
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setHasError(false)
      setIsLoading(true)
    }
    
    onError?.()
  }

  // Generate responsive sizes if not provided
  const responsiveSizes = sizes || (
    fill ? '100vw' : 
    width ? `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, ${width}px` :
    '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
  )

  // Generate blur placeholder
  const generateBlurDataURL = (w: number, h: number) => {
    if (blurDataURL) return blurDataURL
    
    // Generate a simple base64 blur placeholder
    const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
    if (!canvas) return undefined
    
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    
    // Create gradient blur effect
    const gradient = ctx.createLinearGradient(0, 0, w, h)
    gradient.addColorStop(0, '#f3f4f6')
    gradient.addColorStop(1, '#e5e7eb')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
    
    return canvas.toDataURL()
  }

  // Calculate dimensions with aspect ratio
  const dimensions = (() => {
    if (fill) return { fill: true }
    
    if (width && height) {
      return { width, height }
    }
    
    if (width && aspectRatio) {
      return { width, height: Math.round(width / aspectRatio) }
    }
    
    if (height && aspectRatio) {
      return { width: Math.round(height * aspectRatio), height }
    }
    
    return { width: width || 400, height: height || 300 }
  })()

  const containerStyle = aspectRatio && !fill ? {
    aspectRatio: aspectRatio.toString()
  } : {}

  const imageClasses = cn(
    'transition-opacity duration-300',
    isLoading && 'opacity-0',
    !isLoading && 'opacity-100',
    className
  )

  // Don't render until in view (for lazy loading)
  if (!isInView && lazy && !priority) {
    return (
      <div
        ref={imgRef}
        className={cn('bg-gray-200 animate-pulse', className)}
        style={{
          ...containerStyle,
          ...(!fill && dimensions && 'width' in dimensions ? {
            width: dimensions.width,
            height: dimensions.height
          } : {})
        }}
      />
    )
  }

  return (
    <div ref={imgRef} className="relative overflow-hidden" style={containerStyle}>
      {/* Loading skeleton */}
      {isLoading && (
        <div 
          className={cn(
            'absolute inset-0 bg-gray-200 animate-pulse',
            fill ? 'w-full h-full' : ''
          )}
          style={!fill && dimensions && 'width' in dimensions ? {
            width: dimensions.width,
            height: dimensions.height
          } : {}}
        />
      )}

      {/* Error state */}
      {hasError && !fallbackSrc && (
        <div 
          className={cn(
            'absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400',
            fill ? 'w-full h-full' : ''
          )}
          style={!fill && dimensions && 'width' in dimensions ? {
            width: dimensions.width,
            height: dimensions.height
          } : {}}
        >
          <div className="text-center">
            <svg 
              className="w-8 h-8 mx-auto mb-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <p className="text-xs">Image failed to load</p>
          </div>
        </div>
      )}

      {/* Optimized Image */}
      <Image
        src={currentSrc}
        alt={alt}
        {...(fill ? { fill: true } : dimensions)}
        className={imageClasses}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={
          placeholder === 'blur' 
            ? generateBlurDataURL(
                'width' in dimensions ? dimensions.width : 400,
                'height' in dimensions ? dimensions.height : 300
              )
            : undefined
        }
        sizes={responsiveSizes}
        quality={quality}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          objectFit,
          ...(!fill ? {} : { position: 'absolute', inset: 0 })
        }}
        {...props}
      />
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

export { OptimizedImage }

// Prebuilt responsive image component for common use cases
export const ResponsiveImage = memo(({
  src,
  alt,
  aspectRatio = 16/9,
  className,
  ...props
}: Omit<OptimizedImageProps, 'fill'> & { aspectRatio?: number }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    fill
    aspectRatio={aspectRatio}
    className={className}
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    {...props}
  />
))

ResponsiveImage.displayName = 'ResponsiveImage'

// Avatar component with optimizations
export const OptimizedAvatar = memo(({
  src,
  alt,
  size = 40,
  className,
  fallback,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height'> & {
  size?: number
  fallback?: string
}) => (
  <div className={cn('relative rounded-full overflow-hidden', className)} style={{ width: size, height: size }}>
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded-full"
      objectFit="cover"
      fallbackSrc={fallback || `data:image/svg+xml;base64,${btoa(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="${size}" height="${size}" fill="#f3f4f6"/>
          <circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#9ca3af"/>
        </svg>
      `)}`}
      {...props}
    />
  </div>
))

OptimizedAvatar.displayName = 'OptimizedAvatar'