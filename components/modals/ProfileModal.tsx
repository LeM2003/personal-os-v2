"use client"

import { useState } from 'react'
import type { UserProfile, UserMode } from '@/types'

interface ProfileModalProps {
  profile: UserProfile | null
  onSave: (profile: UserProfile) => void
  onClose: () => void
}

const MODES_OPTS: { id: UserMode; label: string }[] = [
  { id: 'etudiant',     label: '📚 Étudiant' },
  { id: 'entrepreneur', label: '🚀 Pro' },
  { id: 'les-deux',     label: '⚡ Les deux' },
  { id: 'custom',       label: '🎛️ Custom' },
]

const MODAL_MODULES = [
  { id: 'taches',      label: '✅ Tâches' },
  { id: 'projets',     label: '🎯 Projets' },
  { id: 'ecole',       label: '📚 École' },
  { id: 'finances',    label: '💰 Finances' },
  { id: 'stats',       label: '📊 Stats' },
  { id: 'ajustements', label: '🔄 Ajustements' },
]

export default function ProfileModal({ profile, onSave, onClose }: ProfileModalProps) {
  const [form, setForm] = useState({
    prenom: profile?.prenom || '',
    nom: profile?.nom || '',
    mode: (profile?.mode || 'les-deux') as UserMode,
    customTabs: profile?.customTabs || ['taches', 'finances', 'stats', 'ajustements'],
  })

  const toggleTab = (id: string) => {
    setForm(f => ({
      ...f,
      customTabs: f.customTabs.includes(id)
        ? f.customTabs.filter(t => t !== id)
        : [...f.customTabs, id],
    }))
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3 style={{ fontSize: 18, marginBottom: 16, color: 'var(--accent-1)' }}>👤 Ton profil</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            value={form.prenom}
            onChange={e => setForm({ ...form, prenom: e.target.value })}
            placeholder="Prénom *"
            autoFocus
          />
          <input
            value={form.nom || ''}
            onChange={e => setForm({ ...form, nom: e.target.value })}
            placeholder="Nom (optionnel)"
          />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Mode</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MODES_OPTS.map(m => (
                <button key={m.id} type="button" onClick={() => setForm({ ...form, mode: m.id })}
                  style={{ flex: '1 1 calc(50% - 3px)', padding: '9px 8px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-dm-sans, DM Sans)',
                    background: form.mode === m.id ? 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' : 'var(--input-bg)',
                    color: form.mode === m.id ? '#fff' : 'var(--muted)',
                    border: `1px solid ${form.mode === m.id ? 'transparent' : 'var(--border)'}` }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {form.mode === 'custom' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Modules actifs</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {MODAL_MODULES.map(mod => {
                  const active = form.customTabs.includes(mod.id)
                  return (
                    <button key={mod.id} type="button" onClick={() => toggleTab(mod.id)}
                      style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-dm-sans, DM Sans)', textAlign: 'left',
                        background: active ? 'rgba(74,222,128,.1)' : 'var(--input-bg)',
                        color: active ? '#4ade80' : 'var(--muted)',
                        border: `1px solid ${active ? 'rgba(74,222,128,.3)' : 'var(--border)'}` }}>
                      {mod.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            className="btn-gold"
            onClick={() => onSave({ ...form, customTabs: ['dashboard', ...form.customTabs.filter(t => t !== 'dashboard')] })}
            disabled={!form.prenom.trim() || (form.mode === 'custom' && form.customTabs.length === 0)}>
            Enregistrer
          </button>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
