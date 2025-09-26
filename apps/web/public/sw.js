// AstralField v3.0 Service Worker
// Provides offline functionality, background sync, and push notifications

const CACHE_NAME = 'astralfield-v3-cache'
const STATIC_CACHE_NAME = 'astralfield-v3-static'
const API_CACHE_NAME = 'astralfield-v3-api'

// Cache versions for cache busting
const CACHE_VERSION = '3.0.0'

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/fonts/inter-var.woff2'
]

// API endpoints to cache with strategies
const API_CACHE_PATTERNS = [
  { pattern: /\/api\/players/, strategy: 'cache-first', maxAge: 3600 },
  { pattern: /\/api\/leagues\/\w+$/, strategy: 'network-first', maxAge: 300 },
  { pattern: /\/api\/teams/, strategy: 'network-first', maxAge: 600 },
  { pattern: /\/api\/lineups/, strategy: 'network-first', maxAge: 180 },
  { pattern: /\/api\/stats/, strategy: 'cache-first', maxAge: 1800 }
]

// Routes that should work offline
const OFFLINE_ROUTES = [
  '/',
  '/dashboard',
  '/lineups',
  '/players',
  '/teams',
  '/settings'
]

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('SW: Installing service worker v' + CACHE_VERSION)
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('SW: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activating service worker v' + CACHE_VERSION)
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('astralfield-') && 
                !cacheName.includes(CACHE_VERSION)) {
              console.log('SW: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      
      // Take control of all pages
      self.clients.claim()
    ])
  )
})

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request))
  } else if (request.destination === 'document') {
    event.respondWith(handlePageRequest(request))
  } else if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(handleStaticRequest(request))
  } else {
    event.respondWith(handleGenericRequest(request))
  }
})

// Handle API requests with caching strategies
async function handleAPIRequest(request) {
  const url = new URL(request.url)
  const cachePattern = API_CACHE_PATTERNS.find(pattern => 
    pattern.pattern.test(url.pathname)
  )
  
  if (!cachePattern) {
    // No cache strategy defined, try network first
    try {
      const response = await fetch(request)
      return response
    } catch (error) {
      console.log('SW: API request failed, no cache available')
      return new Response(JSON.stringify({ 
        error: 'Offline', 
        message: 'This feature requires an internet connection' 
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
  
  const cache = await caches.open(API_CACHE_NAME)
  
  if (cachePattern.strategy === 'cache-first') {
    // Try cache first, then network
    const cachedResponse = await cache.match(request)
    if (cachedResponse && !isExpired(cachedResponse, cachePattern.maxAge)) {
      return cachedResponse
    }
    
    try {
      const response = await fetch(request)
      if (response.ok) {
        const responseClone = response.clone()
        await cache.put(request, responseClone)
      }
      return response
    } catch (error) {
      return cachedResponse || createOfflineResponse()
    }
  } else if (cachePattern.strategy === 'network-first') {
    // Try network first, then cache
    try {
      const response = await fetch(request)
      if (response.ok) {
        const responseClone = response.clone()
        await cache.put(request, responseClone)
      }
      return response
    } catch (error) {
      const cachedResponse = await cache.match(request)
      return cachedResponse || createOfflineResponse()
    }
  }
  
  return createOfflineResponse()
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    const response = await fetch(request)
    
    // Cache successful page responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      const responseClone = response.clone()
      await cache.put(request, responseClone)
    }
    
    return response
  } catch (error) {
    // Try to serve from cache
    const cache = await caches.open(CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Serve offline page for supported routes
    const url = new URL(request.url)
    if (OFFLINE_ROUTES.includes(url.pathname)) {
      return await caches.match('/offline.html')
    }
    
    return new Response('Page not available offline', { status: 503 })
  }
}

// Handle static asset requests
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const response = await fetch(request)
    if (response.ok) {
      const responseClone = response.clone()
      await cache.put(request, responseClone)
    }
    return response
  } catch (error) {
    console.log('SW: Static asset not available:', request.url)
    return new Response('Asset not available', { status: 404 })
  }
}

// Handle generic requests
async function handleGenericRequest(request) {
  try {
    return await fetch(request)
  } catch (error) {
    return new Response('Resource not available offline', { status: 503 })
  }
}

// Check if cached response is expired
function isExpired(response, maxAge) {
  const dateHeader = response.headers.get('date')
  if (!dateHeader) return true
  
  const responseTime = new Date(dateHeader).getTime()
  const now = Date.now()
  return (now - responseTime) > (maxAge * 1000)
}

// Create offline response
function createOfflineResponse() {
  return new Response(JSON.stringify({
    error: 'Offline',
    message: 'This feature is not available offline',
    timestamp: new Date().toISOString()
  }), {
    status: 503,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  })
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('SW: Background sync event:', event.tag)
  
  if (event.tag === 'lineup-sync') {
    event.waitUntil(syncLineupChanges())
  } else if (event.tag === 'waiver-sync') {
    event.waitUntil(syncWaiverClaims())
  } else if (event.tag === 'trade-sync') {
    event.waitUntil(syncTradeProposals())
  }
})

// Sync lineup changes when back online
async function syncLineupChanges() {
  try {
    const db = await openDB()
    const tx = db.transaction(['pending-lineups'], 'readonly')
    const store = tx.objectStore('pending-lineups')
    const pendingLineups = await store.getAll()
    
    console.log(`SW: Syncing ${pendingLineups.length} pending lineup changes`)
    
    for (const lineup of pendingLineups) {
      try {
        const response = await fetch('/api/lineups', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lineup.token}`
          },
          body: JSON.stringify(lineup.data)
        })
        
        if (response.ok) {
          // Remove from pending store
          const deleteTx = db.transaction(['pending-lineups'], 'readwrite')
          await deleteTx.objectStore('pending-lineups').delete(lineup.id)
          console.log('SW: Lineup sync successful:', lineup.id)
        }
      } catch (error) {
        console.log('SW: Lineup sync failed:', error)
      }
    }
  } catch (error) {
    console.log('SW: Background sync error:', error)
  }
}

// Sync waiver claims
async function syncWaiverClaims() {
  try {
    const db = await openDB()
    const tx = db.transaction(['pending-waivers'], 'readonly')
    const store = tx.objectStore('pending-waivers')
    const pendingWaivers = await store.getAll()
    
    console.log(`SW: Syncing ${pendingWaivers.length} pending waiver claims`)
    
    for (const waiver of pendingWaivers) {
      try {
        const response = await fetch('/api/waivers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${waiver.token}`
          },
          body: JSON.stringify(waiver.data)
        })
        
        if (response.ok) {
          const deleteTx = db.transaction(['pending-waivers'], 'readwrite')
          await deleteTx.objectStore('pending-waivers').delete(waiver.id)
          console.log('SW: Waiver sync successful:', waiver.id)
        }
      } catch (error) {
        console.log('SW: Waiver sync failed:', error)
      }
    }
  } catch (error) {
    console.log('SW: Waiver sync error:', error)
  }
}

// Sync trade proposals
async function syncTradeProposals() {
  try {
    const db = await openDB()
    const tx = db.transaction(['pending-trades'], 'readonly')
    const store = tx.objectStore('pending-trades')
    const pendingTrades = await store.getAll()
    
    console.log(`SW: Syncing ${pendingTrades.length} pending trade proposals`)
    
    for (const trade of pendingTrades) {
      try {
        const response = await fetch('/api/trades', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${trade.token}`
          },
          body: JSON.stringify(trade.data)
        })
        
        if (response.ok) {
          const deleteTx = db.transaction(['pending-trades'], 'readwrite')
          await deleteTx.objectStore('pending-trades').delete(trade.id)
          console.log('SW: Trade sync successful:', trade.id)
        }
      } catch (error) {
        console.log('SW: Trade sync failed:', error)
      }
    }
  } catch (error) {
    console.log('SW: Trade sync error:', error)
  }
}

// Push notification handling
self.addEventListener('push', event => {
  if (!event.data) return
  
  try {
    const data = event.data.json()
    console.log('SW: Push notification received:', data)
    
    const options = {
      body: data.message || data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag || 'general',
      data: data.data || {},
      actions: data.actions || [],
      timestamp: Date.now(),
      requireInteraction: data.urgent || false
    }
    
    // Customize based on notification type
    if (data.type === 'trade') {
      options.actions = [
        { action: 'view', title: 'View Trade' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    } else if (data.type === 'waiver') {
      options.actions = [
        { action: 'view', title: 'View Waivers' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    } else if (data.type === 'draft') {
      options.actions = [
        { action: 'join', title: 'Join Draft' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
      options.requireInteraction = true
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    )
  } catch (error) {
    console.log('SW: Push notification error:', error)
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('SW: Notification clicked:', event.notification.tag)
  
  event.notification.close()
  
  const { action, data } = event
  let url = '/'
  
  // Determine URL based on action and data
  if (action === 'view' || !action) {
    if (data.type === 'trade' && data.tradeId) {
      url = `/trades/${data.tradeId}`
    } else if (data.type === 'waiver') {
      url = '/waivers'
    } else if (data.type === 'draft' && data.draftId) {
      url = `/draft/${data.draftId}`
    } else if (data.type === 'lineup') {
      url = '/lineups'
    } else if (data.url) {
      url = data.url
    }
  } else if (action === 'join' && data.draftId) {
    url = `/draft/${data.draftId}`
  } else if (action === 'dismiss') {
    return // Just close, don't navigate
  }
  
  event.waitUntil(
    clients.matchAll().then(clientList => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// IndexedDB helper for offline storage
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AstralFieldOffline', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = event => {
      const db = event.target.result
      
      // Create object stores for offline data
      if (!db.objectStoreNames.contains('pending-lineups')) {
        db.createObjectStore('pending-lineups', { keyPath: 'id' })
      }
      
      if (!db.objectStoreNames.contains('pending-waivers')) {
        db.createObjectStore('pending-waivers', { keyPath: 'id' })
      }
      
      if (!db.objectStoreNames.contains('pending-trades')) {
        db.createObjectStore('pending-trades', { keyPath: 'id' })
      }
      
      if (!db.objectStoreNames.contains('cached-data')) {
        const store = db.createObjectStore('cached-data', { keyPath: 'id' })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

// Performance monitoring
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SW_PERF_REPORT') {
    console.log('SW: Performance metrics:', event.data.metrics)
    
    // In production, send to analytics service
    // sendPerfMetrics(event.data.metrics)
  }
})

console.log('SW: AstralField v3.0 Service Worker loaded successfully')