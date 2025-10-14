'use client'

import { Toaster } from 'sonner'

export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'rgb(30, 41, 59)',
          color: 'rgb(255, 255, 255)',
          border: '1px solid rgb(71, 85, 105)',
        },
        className: 'font-sans',
        duration: 4000,
      }}
      theme="dark"
      richColors
    />
  )
}

