import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getUserFromBearer } from '@/lib/supabase/token'

// POST — envoie une notification Web Push de TEST à l'utilisateur connecté.
// Sert à vérifier que tout le circuit (abonnement + envoi serveur) fonctionne.
export async function POST(req: NextRequest) {
  const pubKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privKey = process.env.VAPID_PRIVATE_KEY
  if (!pubKey || !privKey) return NextResponse.json({ error: 'VAPID keys missing' }, { status: 500 })
  webpush.setVapidDetails('mailto:metzod237@gmail.com', pubKey, privKey)

  try {
    const { user, admin } = await getUserFromBearer(req.headers.get('authorization'))
    if (!user || !admin) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: subs } = await admin
      .from('push_subscriptions').select('*').eq('user_id', user.id)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ error: 'no_subscription' }, { status: 404 })
    }

    const payload = JSON.stringify({
      title: 'Personal OS — Test 🔔',
      body: 'Tes notifications fonctionnent parfaitement ! 🎉',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      url: '/',
    })

    let sent = 0
    let lastError: { statusCode?: number; body?: string; message?: string } | null = null
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err) {
        const e = err as { statusCode?: number; body?: string; message?: string }
        lastError = { statusCode: e.statusCode, body: e.body, message: e.message }
        // Abonnement expiré (410) → on le nettoie
        if (e.statusCode === 410 || e.statusCode === 404) {
          await admin.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    if (sent === 0) return NextResponse.json({ error: 'send_failed', detail: lastError }, { status: 500 })
    return NextResponse.json({ ok: true, sent })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
