'use client'

import { ReactNode } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface AccessibleFormFieldProps {
  label: string
  id: string
  error?: string
  success?: boolean
  required?: boolean
  children: ReactNode
  helpText?: string
  className?: string
}

export function AccessibleFormField({
  label,
  id,
  error,
  success,
  required = false,
  children,
  helpText,
  className = ''
}: AccessibleFormFieldProps) {
  const hasError = Boolean(error)
  const hasSuccess = success && !hasError
  
  return (
    <div className={`space-y-2 ${className}`}>
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-gray-300"
      >
        {label}
        {required && (
          <span className="text-red-400 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      <div className="relative">
        {children}
        
        {/* Visual feedback icons */}
        {(hasError || hasSuccess) && (
          <div 
            className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
            aria-hidden="true"
          >
            {hasError && <AlertCircle className="h-5 w-5 text-red-400" />}
            {hasSuccess && <CheckCircle2 className="h-5 w-5 text-green-400" />}
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="text-red-400 text-xs mt-1 flex items-center"
        >
          <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Help text */}
      {helpText && !error && (
        <p 
          id={`${id}-help`}
          className="text-xs text-gray-500"
        >
          {helpText}
        </p>
      )}
    </div>
  )
}

// Accessible input component with proper ARIA attributes
interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  error?: string
  success?: boolean
  helpText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  onRightIconClick?: () => void
}

export function AccessibleInput({
  id,
  error,
  success,
  helpText,
  leftIcon,
  rightIcon,
  onRightIconClick,
  className = '',
  ...props
}: AccessibleInputProps) {
  const hasError = Boolean(error)
  const hasSuccess = success && !hasError
  
  const baseClasses = "appearance-none relative block w-full py-3 border rounded-lg text-white bg-slate-700 focus:outline-none focus:z-10 text-sm transition-all duration-200"
  
  const paddingClasses = `${leftIcon ? 'pl-10' : 'pl-4'} ${rightIcon ? 'pr-12' : 'pr-4'}`
  
  const borderClasses = hasError 
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
    : hasSuccess
      ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
      : 'border-slate-600 focus:ring-blue-500 focus:border-blue-500'
  
  const combinedClasses = `${baseClasses} ${paddingClasses} ${borderClasses} ${className}`
  
  return (
    <div className="relative">
      {leftIcon && (
        <div 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          aria-hidden="true"
        >
          {leftIcon}
        </div>
      )}
      
      <input
        id={id}
        className={combinedClasses}
        aria-invalid={hasError}
        aria-describedby={`${helpText ? `${id}-help` : ''} ${error ? `${id}-error` : ''}`.trim() || undefined}
        {...props}
      />
      
      {rightIcon && (
        <button
          type="button"
          onClick={onRightIconClick}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 focus:outline-none focus:text-gray-300"
          aria-label={props.type === 'password' ? 'Toggle password visibility' : undefined}
          tabIndex={onRightIconClick ? 0 : -1}
        >
          {rightIcon}
        </button>
      )}
    </div>
  )
}

// Accessible button with proper loading states
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function AccessibleButton({
  loading = false,
  loadingText = 'Loading...',
  leftIcon,
  rightIcon,
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  className = '',
  ...props
}: AccessibleButtonProps) {
  const isDisabled = disabled || loading
  
  const baseClasses = "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:cursor-not-allowed"
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white focus:ring-blue-500",
    outline: "border border-slate-600 text-gray-300 hover:bg-slate-700 hover:border-slate-500 focus:ring-slate-500 disabled:opacity-50",
    ghost: "text-blue-400 hover:text-blue-300 hover:bg-slate-700/50 focus:ring-blue-500 disabled:opacity-50"
  }
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm rounded-md",
    md: "px-4 py-2 text-sm rounded-lg",
    lg: "px-6 py-3 text-base rounded-lg"
  }
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`
  
  return (
    <button
      className={combinedClasses}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="mr-2" aria-hidden="true">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="ml-2" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

// Screen reader announcements
export function ScreenReaderAnnouncement({ 
  message, 
  priority = 'polite' 
}: { 
  message: string
  priority?: 'polite' | 'assertive'
}) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

// Skip to content link for keyboard navigation
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  )
}