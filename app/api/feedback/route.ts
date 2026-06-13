import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TYPES = new Set(['bug', 'feature_request', 'praise', 'other'])
const TYPE_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  feature_request: '✨ Suggestion',
  praise: '💬 Retour positif',
  other: '📝 Autre',
}

// POST — réception d'un feedback. On insère via le service_role (et non le client
// anon) pour que les testeurs EN MODE INVITÉ puissent aussi envoyer (la policy RLS
// est `to authenticated`). Puis on prévient l'admin par email (Resend).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = (body.message ?? '').toString().trim()
    const type = TYPES.has(body.type) ? body.type : 'other'

    if (!message) return NextResponse.json({ error: 'message_vide' }, { status: 400 })
    if (message.length > 500) return NextResponse.json({ error: 'message_trop_long' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return NextResponse.json({ error: 'config' }, { status: 500 })

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

    const row = {
      user_id: body.userId ?? null,
      email: body.email ?? null,
      type,
      message,
      page: (body.page ?? 'unknown').toString().slice(0, 60),
      device_info: body.deviceInfo ?? {},
      status: 'new',
    }

    const { error } = await admin.from('feedback').insert(row)
    if (error) {
      console.error('[feedback] insert échoué:', error.message)
      return NextResponse.json({ error: 'db' }, { status: 500 })
    }

    // Notification email à l'admin — best-effort, ne bloque jamais l'enregistrement.
    const resendKey = process.env.RESEND_API_KEY
    let emailDebug: unknown = 'skipped (no RESEND_API_KEY)'
    if (resendKey) {
      const who = body.email ? `${body.email}` : 'testeur anonyme (mode invité)'
      const from = process.env.FEEDBACK_FROM || 'Personal OS <onboarding@resend.dev>'
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: ['metzod237@gmail.com'],
            subject: `[Personal OS] ${TYPE_LABELS[type]} — nouveau retour`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:560px">
                <h2 style="margin:0 0 4px">Nouveau retour Personal OS</h2>
                <p style="color:#666;margin:0 0 16px">Type : <strong>${TYPE_LABELS[type]}</strong> · De : ${who}</p>
                <blockquote style="margin:0;padding:12px 16px;background:#f4f6f8;border-left:3px solid #38bdf8;border-radius:6px;white-space:pre-wrap">${message.replace(/</g, '&lt;')}</blockquote>
                <p style="color:#999;font-size:12px;margin:16px 0 0">Page : ${row.page} · ${new Date().toLocaleString('fr-FR')}</p>
              </div>`,
          }),
        })
        const txt = await r.text()
        emailDebug = { status: r.status, ok: r.ok, from, body: txt.slice(0, 500) }
        if (!r.ok) console.error('[feedback] Resend a refusé:', r.status, txt)
      } catch (e) {
        emailDebug = { thrown: String(e), from }
        console.error('[feedback] email Resend échoué:', e)
      }
    }

    // emailDebug renvoyé temporairement pour diagnostiquer la livraison.
    return NextResponse.json({ ok: true, emailDebug })
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
