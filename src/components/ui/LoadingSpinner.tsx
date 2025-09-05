'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, Trophy } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'secondary' | 'themed'
  text?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6', 
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg', 
  xl: 'text-xl'
}

export const LoadingSpinner = React.memo(function LoadingSpinner({ 
  size = 'md', 
  variant = 'primary', 
  text,
  fullScreen = false
}: LoadingSpinnerProps) {
  const spinnerClasses = {
    primary: 'text-blue-500',
    secondary: 'text-gray-400',
    themed: 'text-purple-500'
  }

  const content = (
    <div className="flex flex-col items-center justify-center space-y-3">
      {variant === 'themed' ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className={`${sizeClasses[size]} ${spinnerClasses[variant]}`}
        >
          <Trophy />
        </motion.div>
      ) : (
        <Loader2 className={`${sizeClasses[size]} ${spinnerClasses[variant]} animate-spin`} />
      )}
      
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`${textSizes[size]} ${
            variant === 'primary' ? 'text-blue-400' :
            variant === 'secondary' ? 'text-gray-400' :
            'text-purple-400'
          } font-medium`}
        >
          {text}
        </motion.p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50"
      >
        {content}
      </motion.div>
    )
  }

  return content
})

export function PageLoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <LoadingSpinner size="xl" variant="themed" text={text} />
    </div>
  )
}

export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <LoadingSpinner size="sm" variant="secondary" />
      {text && <span className="text-sm text-gray-400">{text}</span>}
    </div>
  )
}