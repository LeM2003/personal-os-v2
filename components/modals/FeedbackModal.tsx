"use client"

import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { haptic } from '@/utils/haptics'

const TYPES = [
  { id: 'bug',             label: '🐛 Bug' },
  { id: 'feature_request', label: '✨ Suggestion' },
  { id: 'praise',          label: '💬 Retour positif' },
  { id: 'other',           label: '📝 Autre' },
]

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const [type, setType]       = useState('other')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const submit = async () => {
    if (!message.trim()) return
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('feedback').insert({
        user_id: user?.id ?? null,
        email: user?.email ?? null,
        type,
        message: message.trim(),
        page: 'settings',
        device_info: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
          language: typeof navigator !== 'undefined' ? navigator.language : '',
        },
        status: 'new',
      })
      haptic(8)
      setSent(true)
    } catch {
      setError('Erreur lors de l\'envoi. Réessaie dans un moment.')
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, color: 'var(--accent-1)', margin: 0 }}>Ton retour</h3>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🙏</div>
            <p style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              Merci beaucoup !
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              Ton retour m'aide directement à améliorer Personal OS. Je lis tout.
            </p>
            <button className="btn-gold" onClick={onClose} style={{ marginTop: 20 }}>Fermer</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Bug, idée, ou juste dire que l'app t'aide — tout compte.
            </p>

            {/* Type */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {TYPES.map(t => (
                <button key={t.id} type="button"
                  className={`filter-pill${type === t.id ? ' active' : ''}`}
                  onClick={() => setType(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Message */}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Dis-moi ce que tu as en tête…"
              rows={4}
              autoFocus
              style={{ marginBottom: 8 }}
            />
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 14px' }}>
              {message.length}/500
            </p>

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)',
                fontSize: 13, color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-gold" onClick={submit}
                disabled={!message.trim() || loading || message.length > 500}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {loading ? '…' : <><Send size={14} /> Envoyer</>}
              </button>
              <button className="btn-ghost" onClick={onClose}>Annuler</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
