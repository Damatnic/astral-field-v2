// Astral Field Service Worker
// Professional fantasy football PWA service worker

const CACHE_NAME = 'astral-field-v2.1.0';
const RUNTIME_CACHE = 'astral-field-runtime';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  // Note: Google Fonts are handled by browser, not cached by SW
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/players',
  '/api/leagues',
  '/api/teams',
  '/api/standings'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response to cache it
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // If network fails, try cache first, then offline page
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/offline.html');
            });
        })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    const shouldCache = API_CACHE_PATTERNS.some(pattern => 
      url.pathname.startsWith(pattern)
    );

    if (shouldCache) {
      event.respondWith(
        caches.open(RUNTIME_CACHE)
          .then((cache) => {
            return cache.match(request)
              .then((cachedResponse) => {
                const fetchPromise = fetch(request)
                  .then((networkResponse) => {
                    // Only cache successful responses
                    if (networkResponse.ok) {
                      cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                  })
                  .catch(() => {
                    // Return cached response if network fails
                    return cachedResponse;
                  });

                // Return cached response immediately, update in background
                return cachedResponse || fetchPromise;
              });
          })
      );
      return;
    }
  }

  // Skip Google Fonts - let browser handle them directly
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    return;
  }

  // Handle static assets (CSS, JS, images, fonts) - but not external fonts
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    (request.destination === 'font' && url.hostname === self.location.hostname) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              // Only cache successful responses
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
    return;
  }

  // Default: network first, cache fallback
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'lineup-changes') {
    event.waitUntil(syncLineupChanges());
  } else if (event.tag === 'waiver-claims') {
    event.waitUntil(syncWaiverClaims());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) {
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      tag: data.tag || 'astral-field-notification',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      silent: false,
      timestamp: data.timestamp || Date.now()
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    
    // Show default notification if parsing fails
    event.waitUntil(
      self.registration.showNotification('AstralField', {
        body: 'You have a new notification',
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  const data = event.notification.data;
  const action = event.action;
  
  let url = '/';

  // Handle notification actions
  if (action === 'view' || action === 'accept' || action === 'reject') {
    if (data.type === 'trade' && data.tradeId) {
      url = `/leagues/${data.leagueId}/trades/${data.tradeId}`;
    } else if (data.type === 'draft' && data.leagueId) {
      url = `/leagues/${data.leagueId}/draft`;
    } else if (data.type === 'waivers' && data.leagueId) {
      url = `/leagues/${data.leagueId}/waivers`;
    } else if (data.type === 'lineup' && data.leagueId) {
      url = `/leagues/${data.leagueId}/team`;
    } else if (data.leagueId) {
      url = `/leagues/${data.leagueId}`;
    }
  } else if (data.action) {
    // Handle data-driven actions
    switch (data.action) {
      case 'view_trade':
        url = `/leagues/${data.leagueId}/trades`;
        break;
      case 'make_pick':
        url = `/leagues/${data.leagueId}/draft`;
        break;
      case 'view_waivers':
        url = `/leagues/${data.leagueId}/waivers`;
        break;
      case 'set_lineup':
        url = `/leagues/${data.leagueId}/team`;
        break;
      case 'view_matchup':
        url = `/leagues/${data.leagueId}/matchup`;
        break;
      case 'view_league':
        url = `/leagues/${data.leagueId}`;
        break;
      default:
        if (data.leagueId) {
          url = `/leagues/${data.leagueId}`;
        }
        break;
    }
  } else if (data.url) {
    url = data.url;
  }

  // Handle specific actions like accept/reject
  if (action === 'accept' && data.type === 'trade' && data.tradeId) {
    event.waitUntil(
      fetch(`/api/trades/${data.tradeId}/accept`, {
        method: 'POST',
        credentials: 'same-origin'
      }).then(() => {
        clients.openWindow(url);
      }).catch(() => {
        clients.openWindow(url);
      })
    );
    return;
  }

  if (action === 'reject' && data.type === 'trade' && data.tradeId) {
    event.waitUntil(
      fetch(`/api/trades/${data.tradeId}/reject`, {
        method: 'POST',
        credentials: 'same-origin'
      }).then(() => {
        clients.openWindow(url);
      }).catch(() => {
        clients.openWindow(url);
      })
    );
    return;
  }

  // Default action - open the appropriate page
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if the page is already open
        for (let client of clientList) {
          if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );

  // Mark notification as read
  if (data.notificationId) {
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ notificationId: data.notificationId }),
      credentials: 'same-origin'
    }).catch((error) => {
      console.error('[SW] Failed to mark notification as read:', error);
    });
  }
});

// Helper functions for background sync
async function syncLineupChanges() {
  try {
    // Implement lineup changes sync logic
    const pendingChanges = await getStoredLineupChanges();
    
    for (const change of pendingChanges) {
      await fetch('/api/lineup-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change)
      });
    }
    
    await clearStoredLineupChanges();
    console.log('[SW] Lineup changes synced successfully');
  } catch (error) {
    console.error('[SW] Failed to sync lineup changes:', error);
  }
}

async function syncWaiverClaims() {
  try {
    // Implement waiver claims sync logic
    const pendingClaims = await getStoredWaiverClaims();
    
    for (const claim of pendingClaims) {
      await fetch('/api/waiver-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claim)
      });
    }
    
    await clearStoredWaiverClaims();
    console.log('[SW] Waiver claims synced successfully');
  } catch (error) {
    console.error('[SW] Failed to sync waiver claims:', error);
  }
}

async function getStoredLineupChanges() {
  // Implementation would use IndexedDB to store offline changes
  return [];
}

async function clearStoredLineupChanges() {
  // Implementation would clear IndexedDB stored changes
}

async function getStoredWaiverClaims() {
  // Implementation would use IndexedDB to store offline claims
  return [];
}

async function clearStoredWaiverClaims() {
  // Implementation would clear IndexedDB stored claims
}

// Service worker update notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service worker loaded successfully');