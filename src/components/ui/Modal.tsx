'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: ReactNode
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg', 
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl mx-4'
}

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true
}: ModalProps) {
  
  useEffect(() => {
    if (!closeOnEscape) return
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose, closeOnEscape])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative w-full ${sizeClasses[size]} bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto`}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                {title && (
                  <h2 className="text-xl font-bold text-white">{title}</h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
            
            {/* Content */}
            <div className={title || showCloseButton ? 'p-6' : 'p-6'}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    info: 'bg-blue-600 hover:bg-blue-700'
  }

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title={title}>
      <div className="space-y-4">
        <p className="text-gray-300">{message}</p>
        
        <div className="flex space-x-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${variantClasses[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}