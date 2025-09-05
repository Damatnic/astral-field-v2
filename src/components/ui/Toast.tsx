'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useEffect } from 'react'

export interface ToastData {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps {
  toast: ToastData
  onClose: (id: string) => void
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-900/30 border-green-700',
    iconColor: 'text-green-400',
    titleColor: 'text-green-300'
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-900/30 border-red-700', 
    iconColor: 'text-red-400',
    titleColor: 'text-red-300'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-900/30 border-yellow-700',
    iconColor: 'text-yellow-400',
    titleColor: 'text-yellow-300'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-900/30 border-blue-700',
    iconColor: 'text-blue-400', 
    titleColor: 'text-blue-300'
  }
}

export function Toast({ toast, onClose }: ToastProps) {
  const config = toastConfig[toast.type]
  const Icon = config.icon

  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id)
      }, toast.duration || 5000)

      return () => clearTimeout(timer)
    }
  }, [toast.duration, toast.id, onClose])

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative w-full max-w-sm p-4 rounded-lg border backdrop-blur-sm ${config.bgColor} shadow-xl`}
    >
      <div className="flex items-start space-x-3">
        <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${config.titleColor}`}>
            {toast.title}
          </p>
          {toast.description && (
            <p className="text-sm text-gray-400 mt-1">
              {toast.description}
            </p>
          )}
          
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={`text-sm font-medium mt-2 ${config.iconColor} hover:underline`}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => onClose(toast.id)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Progress bar for timed toasts */}
      {toast.duration !== 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: (toast.duration || 5000) / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-0 h-1 ${config.iconColor.replace('text-', 'bg-')} rounded-bl-lg`}
        />
      )}
    </motion.div>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onClose: (id: string) => void
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Toast hook for easy usage
export function createToast(
  type: ToastData['type'],
  title: string,
  description?: string,
  options?: Partial<Pick<ToastData, 'duration' | 'action'>>
): ToastData {
  return {
    id: Math.random().toString(36).substring(2),
    type,
    title,
    description,
    duration: options?.duration,
    action: options?.action
  }
}