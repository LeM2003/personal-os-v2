"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Supabase place une session de récupération depuis le lien email.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      // Session présente (via le lien) OU on attend l'event PASSWORD_RECOVERY
      if (data.session) setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const submit = async () => {
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.push('/'), 2500)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="modal-box" style={{ maxWidth: 400, width: '100%' }}>
        <h1 style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 22, marginBottom: 6,
          color: 'var(--accent-1)' }}>
          Nouveau mot de passe
        </h1>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>
              Mot de passe mis à jour ! Redirection vers l&apos;app…
            </p>
          </div>
        ) : !ready ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginTop: 8 }}>
            Vérification du lien… Si rien ne se passe, redemande un lien depuis la page de connexion
            (le lien expire après 1 heure).
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: '8px 0 18px' }}>
              Choisis un nouveau mot de passe pour ton compte.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="password" value={password} autoFocus
                onChange={e => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe (6 min)"
                onKeyDown={e => e.key === 'Enter' && submit()} />
              <input type="password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirmer le mot de passe"
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8,
                background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)',
                fontSize: 13, color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button className="btn-gold" onClick={submit} disabled={loading}
              style={{ width: '100%', marginTop: 16 }}>
              {loading ? '…' : 'Mettre à jour'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
