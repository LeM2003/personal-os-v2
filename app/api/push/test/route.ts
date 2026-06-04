import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

// POST — envoie une notification Web Push de TEST à l'utilisateur connecté.
// Sert à vérifier que tout le circuit (abonnement + envoi serveur) fonctionne.
export async function POST() {
  const pubKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privKey = process.env.VAPID_PRIVATE_KEY
  if (!pubKey || !privKey) return NextResponse.json({ error: 'VAPID keys missing' }, { status: 500 })
  webpush.setVapidDetails('mailto:metzod237@gmail.com', pubKey, privKey)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: subs } = await supabase
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
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err) {
        // Abonnement expiré (410) → on le nettoie
        const code = (err as { statusCode?: number }).statusCode
        if (code === 410 || code === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    if (sent === 0) return NextResponse.json({ error: 'send_failed' }, { status: 500 })
    return NextResponse.json({ ok: true, sent })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
