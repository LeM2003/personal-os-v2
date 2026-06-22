"use client"

import { useState, useEffect } from 'react'
import { X, Mail, Lock, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { haptic } from '@/utils/haptics'
import { confirmDialog } from '../shared/ConfirmDialog'

export default function AccountModal({ onClose, onLoggedOut }: { onClose: () => void; onLoggedOut: () => void }) {
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])

  const changeEmail = async () => {
    if (!newEmail.trim() || newEmail === email) return
    setBusy(true); setErr(''); setMsg('')
    const { error } = await createClient().auth.updateUser({ email: newEmail.trim() })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setMsg('📧 Email de confirmation envoyé à ta nouvelle adresse.'); setNewEmail('')
  }

  const changePassword = async () => {
    if (newPassword.length < 6) { setErr('Le mot de passe doit faire au moins 6 caractères.'); return }
    setBusy(true); setErr(''); setMsg('')
    const { error } = await createClient().auth.updateUser({ password: newPassword })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setMsg('✅ Mot de passe mis à jour.'); setNewPassword('')
  }

  const deleteAccount = async () => {
    if (typeof window !== 'undefined' &&
      !(await confirmDialog('⚠️ Supprimer DÉFINITIVEMENT ton compte et toutes tes données ? Cette action est irréversible.', { danger: true }))) return
    if (!(await confirmDialog('Dernière confirmation : tout sera effacé pour toujours. Continuer ?', { danger: true }))) return
    haptic(8); setBusy(true); setErr('')
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error || 'Erreur lors de la suppression.'); setBusy(false); return }
      // Efface aussi le localStorage local
      try { Object.keys(localStorage).filter(k => k.startsWith('pos_') || k === 'onboardingDone').forEach(k => localStorage.removeItem(k)) } catch {}
      onLoggedOut()
    } catch {
      setErr('Erreur réseau.'); setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontSize: 18, color: 'var(--accent-1)', margin: 0 }}>Mon compte</h3>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 18px' }}>{email}</p>

        {(msg || err) && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: err ? 'rgba(248,113,113,.08)' : 'rgba(74,222,128,.08)',
            border: `1px solid ${err ? 'rgba(248,113,113,.25)' : 'rgba(74,222,128,.25)'}`,
            color: err ? '#fca5a5' : '#4ade80' }}>
            {err || msg}
          </div>
        )}

        {/* Changer email */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Mail size={13} /> Changer d&apos;email
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder="Nouvelle adresse email" style={{ flex: 1 }} />
            <button className="btn-ghost" onClick={changeEmail} disabled={busy || !newEmail.trim()}>OK</button>
          </div>
        </div>

        {/* Changer mot de passe */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={13} /> Changer le mot de passe
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe (6 min)" style={{ flex: 1 }} />
            <button className="btn-ghost" onClick={changePassword} disabled={busy || newPassword.length < 6}>OK</button>
          </div>
        </div>

        {/* Zone danger */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trash2 size={13} /> Zone de danger
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
            Supprime définitivement ton compte et toutes tes données. Irréversible.
          </p>
          <button className="btn-danger" onClick={deleteAccount} disabled={busy} style={{ width: '100%' }}>
            Supprimer mon compte
          </button>
        </div>
      </div>
    </div>
  )
}
