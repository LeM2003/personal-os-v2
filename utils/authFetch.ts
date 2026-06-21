import { createClient } from '@/lib/supabase/client'

// fetch() qui ajoute automatiquement le token Bearer de la session en cours.
// Utilisé pour les routes API protégées (ex: /api/ai) — fiable en PWA/TWA,
// contrairement aux cookies de session.
export async function authFetch(url: string, init: RequestInit = {}) {
  const { data: { session } } = await createClient().auth.getSession()
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  })
}
