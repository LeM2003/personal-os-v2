import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TYPES = new Set(['bug', 'feature_request', 'praise', 'other'])
const TYPE_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  feature_request: '✨ Suggestion',
  praise: '💬 Retour positif',
  other: '📝 Autre',
}

// Échappe TOUS les caractères dangereux avant interpolation dans le HTML de l'email.
// Toute donnée venant du client (message, email, page) passe par ici — sinon XSS stocké.
const escapeHtml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Coerce une valeur client en string bornée (ou null). Empêche l'injection de types
// inattendus (objet, tableau) et l'abus de taille sur user_id.
const cleanStr = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s ? s.slice(0, max) : null
}

// Valide un email basique (ou null). Pas de regex parfaite — juste assez pour rejeter
// le garbage et éviter qu'un champ libre serve de vecteur.
const cleanEmail = (v: unknown): string | null => {
  const s = cleanStr(v, 254)
  return s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : null
}

// device_info : on accepte un objet plat, mais on PLAFONNE sa taille sérialisée
// (5 Ko) pour bloquer l'abus de stockage via du JSON arbitraire.
const cleanDeviceInfo = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  try {
    if (JSON.stringify(v).length > 5000) return {}
  } catch {
    return {} // référence circulaire ou non sérialisable
  }
  return v as Record<string, unknown>
}

// Rate limiting en mémoire, par IP : première barrière contre le flood (chaque POST
// = 1 écriture DB + 1 email Resend). 5 requêtes / minute / IP.
// Limite assumée : ne couvre pas une attaque distribuée ni le multi-instance serverless.
// Pour du robuste un jour : @upstash/ratelimit (Redis). Suffisant ici, zéro dépendance.
const RATE_LIMIT = 5
const RATE_WINDOW = 60_000
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW)
  if (recent.length === 0) hits.delete(ip) // évite la croissance infinie de la Map
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  return false
}

// POST — réception d'un feedback. On insère via le service_role (et non le client
// anon) pour que les testeurs EN MODE INVITÉ puissent aussi envoyer (la policy RLS
// est `to authenticated`). Puis on prévient l'admin par email (Resend).
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (rateLimited(ip)) {
      return NextResponse.json({ error: 'trop_de_requetes' }, { status: 429 })
    }

    const body = await req.json()
    const message = (body.message ?? '').toString().trim()
    const type = TYPES.has(body.type) ? body.type : 'other'

    if (!message) return NextResponse.json({ error: 'message_vide' }, { status: 400 })
    if (message.length > 500) return NextResponse.json({ error: 'message_trop_long' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return NextResponse.json({ error: 'config' }, { status: 500 })

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

    const email = cleanEmail(body.email)
    const row = {
      user_id: cleanStr(body.userId, 64),
      email,
      type,
      message,
      page: cleanStr(body.page, 60) ?? 'unknown',
      device_info: cleanDeviceInfo(body.deviceInfo),
      status: 'new',
    }

    const { error } = await admin.from('feedback').insert(row)
    if (error) {
      console.error('[feedback] insert échoué:', error.message)
      return NextResponse.json({ error: 'db' }, { status: 500 })
    }

    // Notification email à l'admin — best-effort, ne bloque jamais l'enregistrement.
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const who = email ?? 'testeur anonyme (mode invité)'
      // onboarding@resend.dev ne livre qu'au propriétaire du compte Resend
      // (dioufmouha71@gmail.com). Pour livrer ailleurs : vérifier le domaine
      // personal-os.click dans Resend puis poser FEEDBACK_FROM + FEEDBACK_TO.
      const from = process.env.FEEDBACK_FROM || 'Personal OS <onboarding@resend.dev>'
      const to = process.env.FEEDBACK_TO || 'dioufmouha71@gmail.com'
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: [to],
            subject: `[Personal OS] ${TYPE_LABELS[type]} — nouveau retour`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:560px">
                <h2 style="margin:0 0 4px">Nouveau retour Personal OS</h2>
                <p style="color:#666;margin:0 0 16px">Type : <strong>${TYPE_LABELS[type]}</strong> · De : ${escapeHtml(who)}</p>
                <blockquote style="margin:0;padding:12px 16px;background:#f4f6f8;border-left:3px solid #38bdf8;border-radius:6px;white-space:pre-wrap">${escapeHtml(message)}</blockquote>
                <p style="color:#999;font-size:12px;margin:16px 0 0">Page : ${escapeHtml(row.page)} · ${new Date().toLocaleString('fr-FR')}</p>
              </div>`,
          }),
        })
        if (!r.ok) console.error('[feedback] Resend a refusé:', r.status, await r.text())
      } catch (e) {
        console.error('[feedback] email Resend échoué:', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
