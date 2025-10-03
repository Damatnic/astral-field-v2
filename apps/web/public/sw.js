// Sigma: Advanced Service Worker for AstralField PWA
const CACHE_NAME = 'astralfield-v4-cache'
const STATIC_CACHE = 'astralfield-static-v4'
const DYNAMIC_CACHE = 'astralfield-dynamic-v4'
const API_CACHE = 'astralfield-api-v4'

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  CACHE_ONLY: 'cache-only',
  NETWORK_ONLY: 'network-only',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
}

// Cache durations (in milliseconds)
const CACHE_DURATIONS = {
  STATIC: 30 * 24 * 60 * 60 * 1000, // 30 days
  DYNAMIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  API: 5 * 60 * 1000, // 5 minutes
  IMAGES: 30 * 24 * 60 * 60 * 1000 // 30 days
}

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json'
]

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/teams/,
  /\/api\/players/,
  /\/api\/leagues/,
  /\/api\/analytics/
]

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/dashboard',
  '/team',
  '/players',
  '/ai-coach',
  '/analytics'
]

// Sigma: Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    Promise.all([
      // Cache static assets (excluding CSS to prevent MIME type issues)
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets')
        // Only cache page routes, not CSS/JS files during install
        const safeAssets = STATIC_ASSETS.filter(asset => 
          !asset.endsWith('.css') && !asset.endsWith('.js')
        )
        return cache.addAll(safeAssets)
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Sigma: Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    Promise.all([
      // Aggressive cleanup - delete ALL old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => 
              cacheName.startsWith('astralfield-') && 
              !cacheName.includes('v4')
            )
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      }),
      
      // Clear any existing cache entries that might cause MIME issues
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map(async (cacheName) => {
            if (cacheName.startsWith('astralfield-')) {
              const cache = await caches.open(cacheName)
              const requests = await cache.keys()
              return Promise.all(
                requests
                  .filter(req => req.url.includes('.css'))
                  .map(req => {
                    console.log('[SW] Removing cached CSS:', req.url)
                    return cache.delete(req)
                  })
              )
            }
          })
        )
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  )
})

// Sigma: Fetch event - handle all network requests
self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return
  }
  
  // Route requests to appropriate handlers
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    event.respondWith(handleStaticAsset(request))
  } else {
    event.respondWith(handlePageRequest(request))
  }
})

// Sigma: Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))
  
  if (!shouldCache) {
    return fetch(request)
  }
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE)
      const responseClone = networkResponse.clone()
      
      // Add timestamp for cache expiration
      const headers = new Headers(responseClone.headers)
      headers.set('sw-cached-at', Date.now().toString())
      
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      })
      
      cache.put(request, modifiedResponse)
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for API request, checking cache:', request.url)
    
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      // Check if cache is still fresh
      const cachedAt = cachedResponse.headers.get('sw-cached-at')
      if (cachedAt && Date.now() - parseInt(cachedAt) < CACHE_DURATIONS.API) {
        return cachedResponse
      }
    }
    
    // Return offline response for API
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This data is not available offline' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Sigma: Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    // Check if cached asset is still fresh
    const cachedAt = cachedResponse.headers.get('sw-cached-at')
    if (!cachedAt || Date.now() - parseInt(cachedAt) < CACHE_DURATIONS.STATIC) {
      return cachedResponse
    }
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache the asset with proper MIME type preservation
      const responseClone = networkResponse.clone()
      const headers = new Headers(responseClone.headers)
      headers.set('sw-cached-at', Date.now().toString())
      
      // Ensure proper MIME type for CSS files
      const url = new URL(request.url)
      if (url.pathname.endsWith('.css')) {
        headers.set('Content-Type', 'text/css')
      } else if (url.pathname.endsWith('.js')) {
        headers.set('Content-Type', 'application/javascript')
      }
      
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      })
      
      cache.put(request, modifiedResponse)
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for static asset, using cache:', request.url)
    return cachedResponse || createOfflineResponse()
  }
}

// Sigma: Handle page requests with stale-while-revalidate strategy
async function handlePageRequest(request) {
  const url = new URL(request.url)
  const cache = await caches.open(DYNAMIC_CACHE)
  
  // Check if this is an offline-capable route
  const isOfflineRoute = OFFLINE_ROUTES.some(route => 
    url.pathname === route || url.pathname.startsWith(route + '/')
  )
  
  if (!isOfflineRoute) {
    // For non-offline routes, just try network
    try {
      return await fetch(request)
    } catch (error) {
      return createOfflineResponse()
    }
  }
  
  // Stale-while-revalidate strategy
  const cachedResponse = await cache.match(request)
  
  // Start revalidation in background
  const networkPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        const responseClone = networkResponse.clone()
        const headers = new Headers(responseClone.headers)
        headers.set('sw-cached-at', Date.now().toString())
        
        const modifiedResponse = new Response(responseClone.body, {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers: headers
        })
        
        cache.put(request, modifiedResponse)
      }
      return networkResponse
    })
    .catch(() => null)
  
  // Return cached version immediately if available
  if (cachedResponse) {
    // Don't await the network promise, let it update cache in background
    networkPromise.catch(() => {}) // Prevent unhandled rejection
    return cachedResponse
  }
  
  // Wait for network if no cache available
  try {
    const networkResponse = await networkPromise
    return networkResponse || createOfflineResponse()
  } catch (error) {
    return createOfflineResponse()
  }
}

// Sigma: Create offline response
function createOfflineResponse() {
  const offlineHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AstralField - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          margin: 0;
          padding: 20px;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .container {
          max-width: 400px;
          padding: 2rem;
          background: rgba(30, 41, 59, 0.5);
          border-radius: 16px;
          border: 1px solid rgba(71, 85, 105, 0.3);
        }
        .icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        p {
          color: #94a3b8;
          margin-bottom: 2rem;
        }
        .button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }
        .button:hover {
          background: #2563eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📱</div>
        <h1>You're Offline</h1>
        <p>This page isn't available offline. Please check your internet connection and try again.</p>
        <button class="button" onclick="window.location.reload()">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `
  
  return new Response(offlineHtml, {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'text/html' }
  })
}

// Sigma: Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions())
  }
})

async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB
    const offlineActions = await getOfflineActions()
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })
        
        // Remove successful action
        await removeOfflineAction(action.id)
        console.log('[SW] Synced offline action:', action.id)
      } catch (error) {
        console.log('[SW] Failed to sync action:', action.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// Sigma: Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  if (!event.data) return
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: data.vibrate || [200, 100, 200]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Sigma: Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.data)
  
  event.notification.close()
  
  const data = event.notification.data
  const url = data?.url || '/dashboard'
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window if app is not open
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Sigma: Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data.type === 'CACHE_API_RESPONSE') {
    cacheApiResponse(event.data.request, event.data.response)
  } else if (event.data.type === 'CLEAR_CACHE') {
    clearCache(event.data.cacheName)
  }
})

async function cacheApiResponse(request, response) {
  const cache = await caches.open(API_CACHE)
  await cache.put(request, response)
}

async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName)
  } else {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(name => caches.delete(name)))
  }
}

// Placeholder functions for IndexedDB operations (would need a full implementation)
async function getOfflineActions() {
  // Implementation would use IndexedDB to store offline actions
  return []
}

async function removeOfflineAction(id) {
  // Implementation would remove action from IndexedDB
  console.log('Removing offline action:', id)
}

console.log('[SW] Service Worker loaded successfully')