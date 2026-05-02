/* ============================================================
   Service Worker — Personal OS v2
   Cache + notifications persistantes
   ============================================================ */

const CACHE_NAME = 'personal-os-v5'

const PRECACHE_URLS = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Ne jamais cacher les appels API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Assets statiques: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          }
          return res
        }).catch(() => caches.match('/'))
      })
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})

// Ouvrir l'app au clic sur une notification
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return clients.openWindow(target)
    })
  )
})

// Periodic sync (Chrome/Edge) — vérifie les données stockées
self.addEventListener('periodicsync', event => {
  if (event.tag === 'pos-check-reminders') {
    event.waitUntil(checkStoredReminders())
  }
})

async function checkStoredReminders() {
  // Lire les données sauvegardées par l'app principale
  const cache = await caches.open(CACHE_NAME)
  const response = await cache.match('/sw-data')
  if (!response) return

  try {
    const data = await response.json()
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const hour = now.getHours()

    // Examens du jour
    for (const exam of (data.examens || [])) {
      const diff = Math.round((new Date(exam.date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000)
      if (diff === 1 && hour >= 20) {
        await self.registration.showNotification(`📚 Examen demain — ${exam.matiere}`, {
          body: exam.heure ? `à ${exam.heure}` : 'Bonne révision ce soir !',
          icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
          tag: `sw-exam-${exam.id || exam.matiere}-${today}`,
        })
      }
    }
  } catch {}
}

// Message depuis l'app principale pour stocker les données
self.addEventListener('message', async event => {
  if (event.data?.type === 'STORE_DATA') {
    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.put('/sw-data', new Response(JSON.stringify(event.data.payload), {
        headers: { 'Content-Type': 'application/json' }
      }))
    } catch {}
  }
})
