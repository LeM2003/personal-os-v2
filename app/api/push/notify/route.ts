import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

// GET — appelé par le cron Vercel chaque matin à 07h00 UTC (Dakar)
// Vercel envoie Authorization: Bearer {CRON_SECRET}
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Configure VAPID ici (runtime) — pas au niveau module pour éviter l'échec au build
  const pubKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privKey = process.env.VAPID_PRIVATE_KEY
  if (!pubKey || !privKey) return NextResponse.json({ error: 'VAPID keys missing' }, { status: 500 })
  webpush.setVapidDetails('mailto:metzod237@gmail.com', pubKey, privKey)

  try {
    const supabase = await createClient()

    // Récupère tous les abonnements actifs
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id')

    if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString().split('T')[0]

    let sent = 0
    const staleEndpoints: string[] = []

    for (const sub of subs) {
      // Construire un résumé personnalisé pour cet utilisateur
      const [examsRes, devoirsRes, tasksRes] = await Promise.all([
        supabase.from('exams').select('subject, exam_date').eq('user_id', sub.user_id).eq('status', 'upcoming'),
        supabase.from('devoirs').select('subject, due_date').eq('user_id', sub.user_id).in('status', ['todo', 'doing']),
        supabase.from('tasks').select('title, due_date').eq('user_id', sub.user_id).eq('status', 'todo').eq('recurring', true),
      ])

      const todayExams = (examsRes.data || []).filter(e => e.exam_date?.startsWith(today))
      const tomorrowExams = (examsRes.data || []).filter(e => e.exam_date?.startsWith(tomorrowISO))
      const urgentDevoirs = (devoirsRes.data || []).filter(d => d.due_date?.startsWith(today) || d.due_date?.startsWith(tomorrowISO))
      const recurringToday = (tasksRes.data || [])

      // Construire le message
      const lines: string[] = []
      if (todayExams.length) lines.push(`📝 Examen aujourd'hui : ${todayExams.map(e => e.subject).join(', ')}`)
      if (tomorrowExams.length) lines.push(`⚠️ Examen demain : ${tomorrowExams.map(e => e.subject).join(', ')}`)
      if (urgentDevoirs.length) lines.push(`📚 Devoir urgent : ${urgentDevoirs.map(d => d.subject).join(', ')}`)
      if (recurringToday.length) lines.push(`🔁 ${recurringToday.length} habitude${recurringToday.length > 1 ? 's' : ''} du jour`)

      if (lines.length === 0) continue // Rien d'urgent aujourd'hui → pas de push

      const payload = JSON.stringify({
        title: 'Personal OS — Rappel du matin',
        body: lines.join('\n'),
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        url: '/',
      })

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err: unknown) {
        // Endpoint expiré (user a désinstallé) → on le supprime
        if ((err as { statusCode?: number }).statusCode === 410) {
          staleEndpoints.push(sub.endpoint)
        }
      }
    }

    // Nettoyer les endpoints expirés
    if (staleEndpoints.length) {
      await supabase.from('push_subscriptions')
        .delete().in('endpoint', staleEndpoints)
    }

    return NextResponse.json({ sent, cleaned: staleEndpoints.length })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
