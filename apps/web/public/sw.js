// Catalyst: High-Performance Service Worker
// Advanced caching strategy for lightning-fast performance

const CACHE_NAME = 'catalyst-cache-v3'
const RUNTIME_CACHE = 'catalyst-runtime-v3'
const IMAGE_CACHE = 'catalyst-images-v3'

// Catalyst: Critical resources to cache immediately
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192x192.png',
  '/icon-512x512.png'
]

// Catalyst: Cache strategies by resource type
const CACHE_STRATEGIES = {
  // JavaScript and CSS: Cache first with network fallback
  static: {
    cacheName: CACHE_NAME,
    strategy: 'cacheFirst',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    maxEntries: 100
  },
  
  // API calls: Network first with cache fallback
  api: {
    cacheName: RUNTIME_CACHE,
    strategy: 'networkFirst',
    maxAge: 5 * 60, // 5 minutes
    maxEntries: 50
  },
  
  // Images: Cache first with stale-while-revalidate
  images: {
    cacheName: IMAGE_CACHE,
    strategy: 'cacheFirst',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    maxEntries: 200
  }
}

self.addEventListener('install', (event) => {
  console.log('[Catalyst SW] Installing service worker...')
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      
      // Preload critical resources
      await cache.addAll(PRECACHE_URLS)
      
      // Skip waiting to activate immediately
      await self.skipWaiting()
      
      console.log('[Catalyst SW] Critical resources cached')
    })()
  )
})

self.addEventListener('activate', (event) => {
  console.log('[Catalyst SW] Activating service worker...')
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys()
      const oldCaches = cacheNames.filter(name => 
        name.startsWith('catalyst-') && 
        ![CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE].includes(name)
      )
      
      await Promise.all(
        oldCaches.map(name => caches.delete(name))
      )
      
      // Claim all clients immediately
      await self.clients.claim()
      
      console.log('[Catalyst SW] Service worker activated')
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') return
  
  // Skip chrome-extension and other protocols
  if (!url.protocol.startsWith('http')) return
  
  event.respondWith(handleRequest(request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  try {
    // Catalyst: Route-based caching strategies
    if (url.pathname.startsWith('/_next/static/') || 
        url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.css')) {
      return await cacheFirstStrategy(request, CACHE_STRATEGIES.static)
    }
    
    if (url.pathname.startsWith('/api/')) {
      return await networkFirstStrategy(request, CACHE_STRATEGIES.api)
    }
    
    if (url.pathname.match(/\\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/)) {
      return await cacheFirstStrategy(request, CACHE_STRATEGIES.images)
    }
    
    // Default: Network first for pages
    return await networkFirstStrategy(request, CACHE_STRATEGIES.api)
    
  } catch (error) {
    console.error('[Catalyst SW] Request failed:', error)
    
    // Return offline fallback if available
    if (request.destination === 'document') {
      const cache = await caches.open(CACHE_NAME)
      const fallback = await cache.match('/')
      if (fallback) return fallback
    }
    
    throw error
  }
}

// Catalyst: Cache-first strategy for static assets
async function cacheFirstStrategy(request, config) {
  const cache = await caches.open(config.cacheName)
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  const networkResponse = await fetch(request)
  
  if (networkResponse.ok) {
    await cache.put(request, networkResponse.clone())
  }
  
  return networkResponse
}

// Catalyst: Network-first strategy for dynamic content
async function networkFirstStrategy(request, config) {
  const cache = await caches.open(config.cacheName)
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    throw error
  }
}

// Catalyst: Handle cache cleanup based on size and age
async function cleanupCache(cacheName, maxEntries, maxAge) {
  const cache = await caches.open(cacheName)
  const requests = await cache.keys()
  
  // Remove expired entries
  const now = Date.now()
  for (const request of requests) {
    const response = await cache.match(request)
    const dateHeader = response.headers.get('date')
    
    if (dateHeader) {
      const age = now - new Date(dateHeader).getTime()
      if (age > maxAge * 1000) {
        await cache.delete(request)
      }
    }
  }
  
  // Remove excess entries (oldest first)
  const remainingRequests = await cache.keys()
  if (remainingRequests.length > maxEntries) {
    const sortedRequests = remainingRequests.sort((a, b) => {
      // Sort by last modified or creation time
      return a.url.localeCompare(b.url)
    })
    
    const toDelete = sortedRequests.slice(maxEntries)
    await Promise.all(toDelete.map(request => cache.delete(request)))
  }
}

// Catalyst: Periodic cache cleanup
setInterval(() => {
  cleanupCache(CACHE_NAME, CACHE_STRATEGIES.static.maxEntries, CACHE_STRATEGIES.static.maxAge)
  cleanupCache(RUNTIME_CACHE, CACHE_STRATEGIES.api.maxEntries, CACHE_STRATEGIES.api.maxAge)
  cleanupCache(IMAGE_CACHE, CACHE_STRATEGIES.images.maxEntries, CACHE_STRATEGIES.images.maxAge)
}, 60 * 60 * 1000) // Every hour

// Catalyst: Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, resources } = event.data
  
  if (type === 'PRELOAD_CRITICAL' && resources) {
    preloadResources(resources)
  }
})

async function preloadResources(urls) {
  const cache = await caches.open(CACHE_NAME)
  
  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        await cache.put(url, response)
        console.log('[Catalyst SW] Preloaded:', url)
      }
    } catch (error) {
      console.warn('[Catalyst SW] Failed to preload:', url, error)
    }
  }
}