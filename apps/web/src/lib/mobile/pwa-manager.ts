'use client'

import { useEffect, useState, useCallback } from 'react'

// Sigma: PWA Manager for service worker registration and app installation
export class PWAManager {
  private static instance: PWAManager
  private registration: ServiceWorkerRegistration | null = null
  private updateAvailable = false
  private installPrompt: BeforeInstallPromptEvent | null = null

  static getInstance(): PWAManager {
    if (!this.instance) {
      this.instance = new PWAManager()
    }
    return this.instance
  }

  // Sigma: Register service worker
  async registerServiceWorker(): Promise<boolean> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Workers not supported')
      return false
    }

    try {
      console.log('[PWA] Registering service worker...')
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      this.registration = registration

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New service worker available')
              this.updateAvailable = true
              this.notifyUpdateAvailable()
            }
          })
        }
      })

      // Listen for controlling service worker change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Service worker controller changed, reloading...')
        window.location.reload()
      })

      console.log('[PWA] Service worker registered successfully')
      return true
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error)
      return false
    }
  }

  // Sigma: Update service worker
  async updateServiceWorker(): Promise<void> {
    if (!this.registration) {
      console.warn('[PWA] No service worker registration found')
      return
    }

    try {
      await this.registration.update()
      
      if (this.registration.waiting) {
        // Tell the waiting service worker to skip waiting
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    } catch (error) {
      console.error('[PWA] Failed to update service worker:', error)
    }
  }

  // Sigma: Handle app installation
  async installApp(): Promise<boolean> {
    if (!this.installPrompt) {
      console.warn('[PWA] Install prompt not available')
      return false
    }

    try {
      this.installPrompt.prompt()
      const result = await this.installPrompt.userChoice
      
      console.log('[PWA] Install prompt result:', result.outcome)
      
      if (result.outcome === 'accepted') {
        this.installPrompt = null
        return true
      }
      
      return false
    } catch (error) {
      console.error('[PWA] Failed to install app:', error)
      return false
    }
  }

  // Sigma: Check if app can be installed
  canInstall(): boolean {
    return this.installPrompt !== null
  }

  // Sigma: Check if app is installed
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true
  }

  // Sigma: Handle install prompt
  handleInstallPrompt(event: BeforeInstallPromptEvent): void {
    event.preventDefault()
    this.installPrompt = event
    console.log('[PWA] Install prompt available')
  }

  // Sigma: Setup PWA event listeners
  setupEventListeners(): void {
    // Before install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      this.handleInstallPrompt(e as BeforeInstallPromptEvent)
    })

    // App installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully')
      this.installPrompt = null
    })

    // Online/offline status
    window.addEventListener('online', () => {
      console.log('[PWA] App came online')
      this.syncOfflineActions()
    })

    window.addEventListener('offline', () => {
      console.log('[PWA] App went offline')
    })
  }

  // Sigma: Send message to service worker
  async sendMessageToSW(message: any): Promise<void> {
    if (!this.registration?.active) {
      console.warn('[PWA] No active service worker')
      return
    }

    this.registration.active.postMessage(message)
  }

  // Sigma: Clear cache
  async clearCache(cacheName?: string): Promise<void> {
    await this.sendMessageToSW({
      type: 'CLEAR_CACHE',
      cacheName
    })
  }

  // Sigma: Cache API response
  async cacheApiResponse(request: Request, response: Response): Promise<void> {
    await this.sendMessageToSW({
      type: 'CACHE_API_RESPONSE',
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries())
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text()
      }
    })
  }

  // Sigma: Sync offline actions
  private async syncOfflineActions(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register('sync-offline-actions')
        console.log('[PWA] Background sync registered')
      } catch (error) {
        console.error('[PWA] Background sync registration failed:', error)
      }
    }
  }

  // Sigma: Notify about update availability
  private notifyUpdateAvailable(): void {
    // Dispatch custom event for update notification
    window.dispatchEvent(new CustomEvent('pwa-update-available'))
  }

  // Sigma: Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  // Sigma: Show local notification
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!await this.requestNotificationPermission()) {
      console.warn('[PWA] Notification permission denied')
      return
    }

    if (this.registration) {
      await this.registration.showNotification(title, {
        badge: '/icons/badge-72x72.png',
        icon: '/icon-192x192.png',
        ...options
      })
    } else {
      new Notification(title, options)
    }
  }
}

// BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Sigma: React hook for PWA functionality
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [swRegistered, setSWRegistered] = useState(false)

  const pwaManager = PWAManager.getInstance()

  useEffect(() => {
    // Initialize PWA
    const initPWA = async () => {
      // Setup event listeners
      pwaManager.setupEventListeners()
      
      // Register service worker
      const registered = await pwaManager.registerServiceWorker()
      setSWRegistered(registered)
      
      // Check install status
      setIsInstalled(pwaManager.isInstalled())
      setCanInstall(pwaManager.canInstall())
      
      // Check online status
      setIsOnline(navigator.onLine)
    }

    initPWA()

    // Listen for PWA events
    const handleInstallPrompt = () => {
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
    }

    const handleUpdateAvailable = () => {
      setUpdateAvailable(true)
    }

    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('pwa-update-available', handleUpdateAvailable)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('pwa-update-available', handleUpdateAvailable)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [pwaManager])

  const installApp = useCallback(async () => {
    const success = await pwaManager.installApp()
    if (success) {
      setCanInstall(false)
      setIsInstalled(true)
    }
    return success
  }, [pwaManager])

  const updateApp = useCallback(async () => {
    await pwaManager.updateServiceWorker()
    setUpdateAvailable(false)
  }, [pwaManager])

  const clearCache = useCallback(async (cacheName?: string) => {
    await pwaManager.clearCache(cacheName)
  }, [pwaManager])

  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    await pwaManager.showNotification(title, options)
  }, [pwaManager])

  return {
    isInstalled,
    canInstall,
    updateAvailable,
    isOnline,
    swRegistered,
    installApp,
    updateApp,
    clearCache,
    showNotification
  }
}

// Sigma: React hook for offline storage
export function useOfflineStorage() {
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported('indexedDB' in window)
  }, [])

  const store = useCallback(async (key: string, data: any): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const request = indexedDB.open('AstralFieldOffline', 1)
      
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error)
        
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(['offline'], 'readwrite')
          const store = transaction.objectStore('offline')
          
          store.put({ key, data, timestamp: Date.now() })
          
          transaction.oncomplete = () => resolve(true)
          transaction.onerror = () => reject(transaction.error)
        }
        
        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('offline')) {
            db.createObjectStore('offline', { keyPath: 'key' })
          }
        }
      })
    } catch (error) {
      console.error('[PWA] Failed to store offline data:', error)
      return false
    }
  }, [isSupported])

  const retrieve = useCallback(async (key: string): Promise<any | null> => {
    if (!isSupported) return null

    try {
      const request = indexedDB.open('AstralFieldOffline', 1)
      
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error)
        
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(['offline'], 'readonly')
          const store = transaction.objectStore('offline')
          const getRequest = store.get(key)
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result?.data || null)
          }
          
          getRequest.onerror = () => reject(getRequest.error)
        }
      })
    } catch (error) {
      console.error('[PWA] Failed to retrieve offline data:', error)
      return null
    }
  }, [isSupported])

  const remove = useCallback(async (key: string): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const request = indexedDB.open('AstralFieldOffline', 1)
      
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error)
        
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(['offline'], 'readwrite')
          const store = transaction.objectStore('offline')
          
          store.delete(key)
          
          transaction.oncomplete = () => resolve(true)
          transaction.onerror = () => reject(transaction.error)
        }
      })
    } catch (error) {
      console.error('[PWA] Failed to remove offline data:', error)
      return false
    }
  }, [isSupported])

  const clear = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const request = indexedDB.open('AstralFieldOffline', 1)
      
      return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error)
        
        request.onsuccess = () => {
          const db = request.result
          const transaction = db.transaction(['offline'], 'readwrite')
          const store = transaction.objectStore('offline')
          
          store.clear()
          
          transaction.oncomplete = () => resolve(true)
          transaction.onerror = () => reject(transaction.error)
        }
      })
    } catch (error) {
      console.error('[PWA] Failed to clear offline data:', error)
      return false
    }
  }, [isSupported])

  return {
    isSupported,
    store,
    retrieve,
    remove,
    clear
  }
}