'use client'

import React, { useState, useCallback, useEffect, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMobileCapabilities, useHapticFeedback, useTouchGestures, usePullToRefresh } from '@/lib/mobile/mobile-utils'

// Sigma: Mobile-optimized button component
interface MobileButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  className?: string
}

export const MobileButton = memo(({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false,
  fullWidth = false,
  className = '' 
}: MobileButtonProps) => {
  const { tapFeedback } = useHapticFeedback()

  const handleClick = useCallback(() => {
    if (disabled || loading) return
    tapFeedback()
    onClick?.()
  }, [disabled, loading, onClick, tapFeedback])

  const baseClasses = `btn-touch relative overflow-hidden transition-all duration-200 font-medium ${
    fullWidth ? 'w-full' : ''
  }`

  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl active:scale-95',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white shadow-md hover:shadow-lg active:scale-95',
    ghost: 'bg-transparent hover:bg-slate-800/50 text-gray-300 hover:text-white active:scale-95',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl active:scale-95'
  }

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-button',
    md: 'px-6 py-3 text-base min-h-button',
    lg: 'px-8 py-4 text-lg min-h-button'
  }

  const disabledClasses = disabled || loading 
    ? 'opacity-50 cursor-not-allowed' 
    : 'cursor-pointer'

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabledClasses}
        ${className}
      `}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  )
})

MobileButton.displayName = 'MobileButton'

// Sigma: Mobile-optimized card component with touch interactions
interface MobileCardProps {
  children: React.ReactNode
  onTap?: () => void
  onLongPress?: () => void
  className?: string
  interactive?: boolean
}

export const MobileCard = memo(({ children, onTap, onLongPress, className = '', interactive = false }: MobileCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const gesture = useTouchGestures(cardRef)
  const { tapFeedback, longPressFeedback } = useHapticFeedback()

  useEffect(() => {
    if (!gesture) return

    if (gesture.type === 'tap' && onTap) {
      tapFeedback()
      onTap()
    } else if (gesture.type === 'longpress' && onLongPress) {
      longPressFeedback()
      onLongPress()
    }
  }, [gesture, onTap, onLongPress, tapFeedback, longPressFeedback])

  const baseClasses = `
    bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4
    ${interactive ? 'touch-manipulation active:scale-[0.98] transition-transform' : ''}
    ${className}
  `

  return (
    <motion.div
      ref={cardRef}
      className={baseClasses}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      {children}
    </motion.div>
  )
})

MobileCard.displayName = 'MobileCard'

// Sigma: Mobile-optimized input component with focus handling
interface MobileInputProps {
  type?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  disabled?: boolean
  error?: string
  label?: string
  className?: string
}

export const MobileInput = memo(({ 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  onFocus, 
  onBlur,
  disabled = false,
  error,
  label,
  className = '' 
}: MobileInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const capabilities = useMobileCapabilities()

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    onFocus?.()
    
    // Prevent zoom on iOS
    if (capabilities.isIOS) {
      const viewport = document.querySelector('meta[name=viewport]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      }
    }
  }, [onFocus, capabilities.isIOS])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    onBlur?.()
    
    // Re-enable zoom on iOS
    if (capabilities.isIOS) {
      const viewport = document.querySelector('meta[name=viewport]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0')
      }
    }
  }, [onBlur, capabilities.isIOS])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }, [onChange])

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={`
            w-full min-h-input px-4 py-3 bg-slate-700/50 border rounded-xl
            text-white placeholder-gray-400 no-zoom
            transition-all duration-200 touch-manipulation
            ${isFocused 
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-slate-700/70' 
              : error 
                ? 'border-red-500 ring-2 ring-red-500/20' 
                : 'border-slate-600 hover:border-slate-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
      </div>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
})

MobileInput.displayName = 'MobileInput'

// Sigma: Mobile-optimized modal with gesture support
interface MobileModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
}

export const MobileModal = memo(({ isOpen, onClose, title, children, size = 'md' }: MobileModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const gesture = useTouchGestures(modalRef)
  const { tapFeedback } = useHapticFeedback()

  useEffect(() => {
    if (gesture?.type === 'swipe' && gesture.direction === 'down' && gesture.distance > 100) {
      tapFeedback()
      onClose()
    }
  }, [gesture, onClose, tapFeedback])

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    full: 'w-full h-full rounded-none'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="absolute inset-0 flex items-end mobile:items-center justify-center p-4">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`
                relative bg-slate-900/95 backdrop-blur-xl rounded-t-3xl mobile:rounded-xl
                border border-slate-700/50 w-full max-h-[90vh] overflow-hidden
                ${sizeClasses[size]}
              `}
            >
              {/* Drag indicator for mobile */}
              <div className="mobile:block hidden p-2">
                <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto" />
              </div>

              {/* Header */}
              {title && (
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                  <h2 className="text-xl font-semibold text-white">{title}</h2>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-slate-800 text-gray-400 hover:text-white transition-colors btn-touch"
                  >
                    <span className="text-lg">✖️</span>
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-6 overflow-y-auto scroll-smooth-mobile max-h-[calc(90vh-8rem)]">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
})

MobileModal.displayName = 'MobileModal'

// Sigma: Mobile-optimized sheet component
interface MobileSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  snapPoints?: number[]
}

export const MobileSheet = memo(({ isOpen, onClose, title, children, snapPoints = [0.25, 0.5, 0.9] }: MobileSheetProps) => {
  const [currentSnap, setCurrentSnap] = useState(snapPoints[1])
  const sheetRef = useRef<HTMLDivElement>(null)
  const gesture = useTouchGestures(sheetRef)
  const { tapFeedback } = useHapticFeedback()

  useEffect(() => {
    if (gesture?.type === 'swipe' && gesture.direction === 'down') {
      if (gesture.distance > 100) {
        tapFeedback()
        onClose()
      }
    }
  }, [gesture, onClose, tapFeedback])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: `${(1 - currentSnap) * 100}%` }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl rounded-t-3xl border-t border-slate-700/50 touch-pan-y"
          >
            {/* Drag handle */}
            <div className="p-4 flex justify-center">
              <div className="w-12 h-1 bg-slate-600 rounded-full" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-6 pb-4">
                <h2 className="text-xl font-semibold text-white text-center">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div className="px-6 pb-safe-bottom overflow-y-auto scroll-smooth-mobile" style={{ maxHeight: `${currentSnap * 100}vh` }}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
})

MobileSheet.displayName = 'MobileSheet'

// Sigma: Pull-to-refresh component
interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  className?: string
}

export const PullToRefresh = memo(({ onRefresh, children, className = '' }: PullToRefreshProps) => {
  const { isRefreshing, pullDistance, isThresholdReached } = usePullToRefresh(onRefresh)

  return (
    <div className={`relative ${className}`}>
      {/* Pull indicator */}
      <motion.div
        animate={{ 
          opacity: pullDistance > 0 ? 1 : 0,
          scale: isThresholdReached ? 1.1 : 1
        }}
        className="absolute top-0 left-0 right-0 z-10 flex justify-center py-4"
        style={{ transform: `translateY(${Math.min(pullDistance * 0.5, 60)}px)` }}
      >
        <div className={`
          flex items-center justify-center w-12 h-12 rounded-full
          ${isThresholdReached ? 'bg-blue-500' : 'bg-slate-700'}
          transition-colors duration-200
        `}>
          {isRefreshing ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <motion.span 
              animate={{ rotate: isThresholdReached ? 180 : 0 }}
              className="text-white text-lg"
            >
              ↓
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <div style={{ transform: `translateY(${pullDistance > 0 ? Math.min(pullDistance * 0.3, 40) : 0}px)` }}>
        {children}
      </div>
    </div>
  )
})

PullToRefresh.displayName = 'PullToRefresh'

// Sigma: Mobile-optimized loading skeleton
interface MobileSkeletonProps {
  className?: string
  lines?: number
  avatar?: boolean
  card?: boolean
}

export const MobileSkeleton = memo(({ className = '', lines = 3, avatar = false, card = false }: MobileSkeletonProps) => {
  if (card) {
    return (
      <div className={`bg-slate-800/50 rounded-xl p-4 animate-pulse ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-slate-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-700 rounded w-3/4" />
            <div className="h-3 bg-slate-700 rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div 
              key={i} 
              className="h-3 bg-slate-700 rounded" 
              style={{ width: `${Math.random() * 40 + 60}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`animate-pulse ${className}`}>
      {avatar && <div className="w-10 h-10 bg-slate-700 rounded-full mb-3" />}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 bg-slate-700 rounded" 
            style={{ width: `${Math.random() * 40 + 60}%` }}
          />
        ))}
      </div>
    </div>
  )
})

MobileSkeleton.displayName = 'MobileSkeleton'