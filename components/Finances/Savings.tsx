"use client"

import { useState } from 'react'
import { Trash2, Plus, Minus, PiggyBank, Target } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { genId, todayISO, fmtDate } from '../../utils/dates'
import { haptic, hapticSuccess } from '../../utils/haptics'
import StatCard from '../shared/StatCard'
import EmptyState from '../shared/EmptyState'

const COLORS = ['#5B8DBF', '#4ade80', '#a78bfa', '#fb923c', '#f472b6', '#22d3ee']
const blank = { name: '', goal: '', current: '', color: COLORS[0], note: '' }

export default function Epargne() {
  const { savings, setSavings } = useApp()
  const [form, setForm] = useState(blank)
  const [txForId, setTxForId] = useState<string | null>(null)
  const [txAmount, setTxAmount] = useState('')

  const add = () => {
    if (!form.name.trim()) return
    setSavings(p => [...p, {
      id: genId(),
      name: form.name.trim(),
      goal: form.goal ? +form.goal : null,
      current: form.current ? +form.current : 0,
      color: form.color,
      note: form.note,
      createdAt: todayISO(),
      history: form.current ? [{ id: genId(), amount: +form.current, type: 'depot', date: todayISO() }] : [],
    }])
    setForm(blank)
    hapticSuccess()
  }

  const del = (id: string) => {
    if (!confirm('Supprimer ce pot ? Tout l\'historique sera perdu.')) return
    haptic(8)
    setSavings(p => p.filter(s => s.id !== id))
  }

  const applyTx = (id: string, sign: number) => {
    const amt = +txAmount
    if (!amt || amt <= 0) return
    hapticSuccess()
    setSavings(p => p.map(s => {
      if (s.id !== id) return s
      const delta = sign * amt
      const newCurrent = Math.max(0, s.current + delta)
      return {
        ...s,
        current: newCurrent,
        history: [...(s.history || []), { id: genId(), amount: amt, type: sign > 0 ? 'depot' : 'retrait', date: todayISO() }],
      }
    }))
    setTxForId(null)
    setTxAmount('')
  }

  const totalEpargne = savings.reduce((s, p) => s + p.current, 0)
  const totalObjectifs = savings.reduce((s, p) => s + (p.goal || 0), 0)
  const globalPct = totalObjectifs > 0 ? Math.min(100, Math.round((totalEpargne / totalObjectifs) * 100)) : 0

  return (
    <div className="page-enter">
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <StatCard icon={<PiggyBank size={22} />} value={`${totalEpargne.toLocaleString()} F`}   label="Total épargné" color="#4ade80" />
        <StatCard icon={<Target size={22} />}    value={`${totalObjectifs.toLocaleString()} F`} label="Objectif cumulé" color="#5B8DBF" />
        <StatCard icon={<Target size={22} />}    value={`${globalPct}%`}                       label="Progression globale" color="#5B8DBF" />
      </div>

      {/* Formulaire ajout */}
      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Créer un pot</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <input placeholder="Nom (ex : PC portable, urgences...)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input type="number" placeholder="Objectif (F, optionnel)" value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <input type="number" placeholder="Déjà mis de côté (F)" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                style={{
                  width: 26, height: 26, borderRadius: '50%', border: form.color === c ? '2px solid var(--text)' : '2px solid transparent',
                  background: c, cursor: 'pointer', padding: 0,
                }}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
        </div>
        <input placeholder="Note (pourquoi ce pot ?)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ marginBottom: 12 }} />
        <button className="btn-gold" onClick={add} disabled={!form.name.trim()}>Créer le pot</button>
      </div>

      {/* Liste des pots */}
      {savings.length === 0 ? (
        <EmptyState
          icon={<PiggyBank size={42} />}
          msg="Aucun pot pour l'instant."
          sub="Un pot, un objectif. Tu avances par petites sommes."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }} className="stagger">
          {savings.map(pot => {
            const pct = pot.goal ? Math.min(100, Math.round((pot.current / pot.goal) * 100)) : null
            const reste = pot.goal ? Math.max(0, pot.goal - pot.current) : null
            const isActive = txForId === pot.id
            return (
              <div key={pot.id} className="card" style={{ padding: 16, borderTop: `3px solid ${pot.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ fontSize: 16, margin: 0 }}>{pot.name}</h4>
                    {pot.note && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{pot.note}</div>}
                  </div>
                  <button className="btn-icon" onClick={() => del(pot.id)} title="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 22, color: pot.color }}>
                    {pot.current.toLocaleString()} F
                  </span>
                  {pot.goal && (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      / {pot.goal.toLocaleString()} F
                    </span>
                  )}
                </div>

                {pot.goal && (
                  <>
                    <div className="progress-track" style={{ marginBottom: 6 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: pot.color }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                      {pct}% · reste {(reste ?? 0).toLocaleString()} F
                    </div>
                  </>
                )}

                {isActive ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      autoFocus
                      placeholder="Montant"
                      value={txAmount}
                      onChange={e => setTxAmount(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button className="btn-icon" onClick={() => applyTx(pot.id, 1)} title="Déposer" style={{ color: '#4ade80' }}>
                      <Plus size={16} />
                    </button>
                    <button className="btn-icon" onClick={() => applyTx(pot.id, -1)} title="Retirer" style={{ color: '#f87171' }}>
                      <Minus size={16} />
                    </button>
                    <button className="btn-icon" onClick={() => { setTxForId(null); setTxAmount('') }} title="Annuler">
                      ✕
                    </button>
                  </div>
                ) : (
                  <button className="btn-ghost" style={{ width: '100%' }} onClick={() => { setTxForId(pot.id); setTxAmount('') }}>
                    Déposer / Retirer
                  </button>
                )}

                {pot.history && pot.history.length > 0 && (
                  <details style={{ marginTop: 10 }}>
                    <summary style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                      Historique ({pot.history.length})
                    </summary>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto' }}>
                      {[...pot.history].reverse().map(h => (
                        <div key={h.id} style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ color: 'var(--muted)' }}>{fmtDate(h.date)}</span>
                          <span style={{ color: h.type === 'depot' ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                            {h.type === 'depot' ? '+' : '−'}{h.amount.toLocaleString()} F
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
