/* ============================================================
   Service Worker — Personal OS v2
   Stratégie : Ne jamais cacher le HTML.
   Assets statiques : cache-first (hashes Next.js garantissent la fraîcheur).
   ============================================================ */

const CACHE_NAME = 'personal-os-v6'
const STATIC_ASSETS = ['/icons/icon-192.png', '/icons/icon-512.png', '/manifest.json']

self.addEventListener('install', event => {
  // Prendre le contrôle immédiatement sans attendre
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // Prendre le contrôle de tous les onglets ouverts
  )
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // 1. API calls → toujours réseau, jamais de cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // 2. Pages HTML → toujours réseau (pour avoir les dernières versions)
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    )
    return
  }

  // 3. Assets Next.js (/_next/static/) → cache-first (hashes = toujours frais)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // 4. Icônes PWA → cache-first
  if (STATIC_ASSETS.some(a => url.pathname === a)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    )
    return
  }

  // 5. Tout le reste → réseau
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
})

// Notification click → ouvrir l'app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return clients.openWindow('/')
    })
  )
})

// Periodic sync (Chrome/Edge) — rappels intelligents
self.addEventListener('periodicsync', event => {
  if (event.tag === 'pos-check-reminders') {
    event.waitUntil(checkStoredReminders())
  }
})

async function checkStoredReminders() {
  const cache = await caches.open(CACHE_NAME)
  const response = await cache.match('/sw-data')
  if (!response) return
  try {
    const data = await response.json()
    const today = new Date().toISOString().split('T')[0]
    const hour = new Date().getHours()
    for (const exam of (data.examens || [])) {
      const diff = Math.round((new Date(exam.date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000)
      if (diff === 1 && hour >= 20) {
        await self.registration.showNotification(`📚 Examen demain — ${exam.matiere}`, {
          body: exam.heure ? `à ${exam.heure}` : 'Bonne révision ce soir !',
          icon: '/icons/icon-192.png',
          tag: `sw-exam-${exam.matiere}-${today}`,
        })
      }
    }
  } catch {}
}

self.addEventListener('message', async event => {
  // Demande d'activation immédiate depuis UpdateBanner
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }
  if (event.data?.type === 'STORE_DATA') {
    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.put('/sw-data', new Response(JSON.stringify(event.data.payload), {
        headers: { 'Content-Type': 'application/json' }
      }))
    } catch {}
  }
})
