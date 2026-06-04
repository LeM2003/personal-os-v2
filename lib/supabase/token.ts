import { createClient } from '@supabase/supabase-js'

/**
 * Authentifie une requête API via le token Bearer (robuste pour PWA/TWA où les
 * cookies de session ne sont pas fiables). Retourne le user ou null.
 *
 * Usage côté client : envoyer `Authorization: Bearer <access_token>`.
 */
export async function getUserFromBearer(authHeader: string | null) {
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) return { user: null, token: null, admin: null }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return { user: null, token, admin }
  return { user: data.user, token, admin }
}
