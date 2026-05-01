"use client"

import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { genId, todayISO, fmtDate, daysUntil } from '../../utils/dates'
import { advanceCycle, computeNextRenewal, monthlyEquiv } from '../../utils/subscriptions'
import EmptyState from '../shared/EmptyState'

const CYCLE_COLORS = { Mensuel: '#60a5fa', Trimestriel: '#a78bfa', Annuel: '#34d399', Hebdomadaire: '#fb923c' }

export default function Abonnements() {
  const { subscriptions, setSubscriptions } = useApp()
  const blank = { name: '', amount: '', startDate: todayISO(), cycle: 'Mensuel', category: 'Business' }
  const [form, setForm] = useState(blank)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const openAdd = () => { setEditingId(null); setForm(blank); setShowForm(true) }
  const openEdit = sub => {
    setEditingId(sub.id)
    setForm({ name: sub.name, amount: String(sub.amount), startDate: sub.startDate || todayISO(), cycle: sub.cycle || 'Mensuel', category: sub.category })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(blank) }

  const save = () => {
    if (!form.name || !form.amount) return
    const nextRenewal = computeNextRenewal(form.startDate, form.cycle)
    if (editingId) {
      setSubscriptions(p => p.map(s => s.id === editingId ? { ...s, ...form, amount: +form.amount, nextRenewal } : s))
    } else {
      setSubscriptions(p => [...p, { ...form, amount: +form.amount, nextRenewal, id: genId() }])
    }
    closeForm()
  }

  const markPaid = sub => {
    const next = advanceCycle(sub.nextRenewal || computeNextRenewal(sub.startDate, sub.cycle), sub.cycle)
    setSubscriptions(p => p.map(s => s.id === sub.id ? { ...s, nextRenewal: next, lastPaid: todayISO() } : s))
  }

  const monthlyTotal = subscriptions.reduce((s, x) => s + monthlyEquiv(x.amount, x.cycle || 'Mensuel'), 0)

  const sorted = [...subscriptions].sort((a, b) => {
    const da = a.nextRenewal || computeNextRenewal(a.startDate, a.cycle || 'Mensuel')
    const db = b.nextRenewal || computeNextRenewal(b.startDate, b.cycle || 'Mensuel')
    return new Date(da) - new Date(db)
  })

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-icon">💳</span>
          <div>
            <div className="stat-value" style={{ color: '#5B8DBF' }}>{Math.round(monthlyTotal).toLocaleString('fr-FR')} FCFA</div>
            <div className="stat-label">Équivalent mensuel total</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📆</span>
          <div>
            <div className="stat-value" style={{ color: '#4ade80' }}>{Math.round(monthlyTotal * 12).toLocaleString('fr-FR')} FCFA</div>
            <div className="stat-label">Projection annuelle</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🔔</span>
          <div>
            <div className="stat-value" style={{ color: '#f87171' }}>
              {sorted.filter(s => { const d = daysUntil(s.nextRenewal || computeNextRenewal(s.startDate, s.cycle || 'Mensuel')); return d >= 0 && d <= 7 }).length}
            </div>
            <div className="stat-label">Paiements dans 7 jours</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-gold" onClick={openAdd}>+ Ajouter un abonnement</button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(91,141,191,.3)' }}>
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>
            {editingId ? "✏️ Modifier l'abonnement" : 'Nouvel abonnement'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }} className="grid-2">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Nom de l'abonnement *" autoFocus />
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
              placeholder="Montant (FCFA) *" />
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>Date du 1er paiement</p>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 5 }}>Cycle de facturation</p>
              <select value={form.cycle} onChange={e => setForm({ ...form, cycle: e.target.value })}>
                <option value="Hebdomadaire">Hebdomadaire</option>
                <option value="Mensuel">Mensuel</option>
                <option value="Trimestriel">Trimestriel</option>
                <option value="Annuel">Annuel</option>
              </select>
            </div>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option>Business</option><option>Loisirs</option><option>École</option><option>Autre</option>
            </select>
            {form.startDate && (
              <div style={{ background: 'rgba(91,141,191,.07)', border: '1px solid rgba(91,141,191,.2)',
                borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#fde68a', display: 'flex', alignItems: 'center', gap: 6 }}>
                📅 Prochain paiement : <strong>{fmtDate(computeNextRenewal(form.startDate, form.cycle))}</strong>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn-gold" onClick={save}>{editingId ? 'Enregistrer' : 'Ajouter'}</button>
            <button className="btn-ghost" onClick={closeForm}>Annuler</button>
          </div>
        </div>
      )}

      {sorted.length === 0
        ? <EmptyState mark="bars" tone="muted" title="Aucun abonnement suivi." subtitle="Ajoute-les ici pour ne plus jamais être surpris en fin de mois." />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map(sub => {
              const nextR = sub.nextRenewal || computeNextRenewal(sub.startDate || todayISO(), sub.cycle || 'Mensuel')
              const due = daysUntil(nextR)
              const isUrgent   = due >= 0 && due <= 7
              const isToday    = due === 0
              const isTomorrow = due === 1
              const cycleColor = CYCLE_COLORS[sub.cycle || 'Mensuel'] || '#9ca3af'
              const monthEq = monthlyEquiv(sub.amount, sub.cycle || 'Mensuel')
              const isEditing = editingId === sub.id

              return (
                <div key={sub.id} className="card" style={{ padding: '16px 18px',
                  borderLeft: `3px solid ${isUrgent ? '#f87171' : isEditing ? '#5B8DBF' : 'var(--border)'}`,
                  background: isEditing ? 'rgba(91,141,191,.03)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{sub.name}</span>
                        <span className="badge" style={{ background: `${cycleColor}20`, color: cycleColor }}>{sub.cycle || 'Mensuel'}</span>
                        <span className="badge badge-gray">{sub.category}</span>
                        {isUrgent && (
                          <span className="badge badge-red">
                            {isToday ? "⚠️ Aujourd'hui !" : isTomorrow ? '⚠️ Demain !' : `🔔 Dans ${due}j`}
                          </span>
                        )}
                        {sub.lastPaid && <span className="badge badge-green">✓ Payé le {fmtDate(sub.lastPaid)}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontSize: 12, color: isUrgent ? '#fca5a5' : 'var(--muted)' }}>
                          📅 Prochain paiement : <strong style={{ color: isUrgent ? '#f87171' : 'var(--text)' }}>{fmtDate(nextR)}</strong>
                          {due >= 0 && <span style={{ marginLeft: 6, color: isUrgent ? '#f87171' : 'var(--muted)' }}>(J-{due})</span>}
                        </p>
                        {sub.startDate && (
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>🗓 Depuis le {fmtDate(sub.startDate)}</p>
                        )}
                      </div>
                      {sub.cycle !== 'Mensuel' && (
                        <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                          ≈ {Math.round(monthEq).toLocaleString('fr-FR')} FCFA/mois
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontWeight: 700, fontSize: 17, color: '#5B8DBF', whiteSpace: 'nowrap' }}>
                        {sub.amount.toLocaleString('fr-FR')} FCFA
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-gold" style={{ fontSize: 11, padding: '5px 11px' }} onClick={() => markPaid(sub)}>✅ Payé</button>
                        <button className="btn-icon" title="Modifier" onClick={() => openEdit(sub)} style={{ color: isEditing ? '#5B8DBF' : undefined }}>✏️</button>
                        <button className="btn-icon" title="Supprimer" aria-label="Supprimer l'abonnement" onClick={() => setSubscriptions(p => p.filter(x => x.id !== sub.id))}>✕</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
      }
    </div>
  )
}
