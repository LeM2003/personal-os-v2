"use client"

import { useApp } from '../context/AppContext'
import { genId, todayISO, fmtDate } from '../utils/dates'
import PageHeader from './shared/PageHeader'

const REASON_LABELS = { 'manque de temps': 'Manque de temps', 'fatigue': 'Fatigue', 'autre': 'Autre raison' }
const REASON_COLORS = { 'manque de temps': '#f87171', 'fatigue': '#fb923c', 'autre': '#60a5fa' }

export default function Ajustements() {
  const { adjustments, setAdjustments, tasks, setTasks } = useApp()
  const upd = (id, field, val) => setAdjustments(p => p.map(a => a.id === id ? { ...a, [field]: val } : a))

  const reschedule = adj => {
    if (!adj.newDate) return
    const t = {
      ...(adj.originalTask || {}),
      id: adj.taskId || genId(),
      name: adj.taskName,
      deadline: adj.newDate,
      status: 'À faire',
      createdAt: todayISO(),
    }
    setTasks(p => [...p, t])
    setAdjustments(p => p.filter(a => a.id !== adj.id))
  }

  return (
    <div>
      <PageHeader
        title="Ajustements"
        sub={`${adjustments.length} tâche${adjustments.length !== 1 ? 's' : ''} à reprogrammer`}
      />

      {adjustments.length === 0
        ? <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🏆</div>
            <h2 style={{ fontFamily: 'Fraunces', color: '#4ade80', fontSize: 22, marginBottom: 8 }}>Rien à réajuster.</h2>
            <p style={{ color: 'var(--muted)', fontSize: 15 }}>Tu es à jour. Garde cette cadence.</p>
          </div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {adjustments.map(adj => (
              <div key={adj.id} className="card" style={{ padding: 20, borderLeft: '3px solid #f87171' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 17, margin: '0 0 5px' }}>{adj.taskName}</h3>
                    {adj.originalDeadline && (
                      <p style={{ margin: 0, color: '#f87171', fontSize: 13 }}>
                        ⏰ Échéance originale : {fmtDate(adj.originalDeadline)}
                      </p>
                    )}
                  </div>
                  <button className="btn-danger" style={{ flexShrink: 0 }}
                    onClick={() => setAdjustments(p => p.filter(a => a.id !== adj.id))}>
                    Supprimer
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'flex-end' }} className="grid-3">
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>Raison</p>
                    <select value={adj.reason} style={{ fontSize: 13 }} onChange={e => upd(adj.id, 'reason', e.target.value)}>
                      <option value="manque de temps">Manque de temps</option>
                      <option value="fatigue">Fatigue</option>
                      <option value="autre">Autre raison</option>
                    </select>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>Nouvelle date</p>
                    <input type="date" value={adj.newDate} style={{ fontSize: 13 }}
                      min={todayISO()} onChange={e => upd(adj.id, 'newDate', e.target.value)} />
                  </div>
                  <button className="btn-gold" style={{ opacity: adj.newDate ? 1 : .4, fontSize: 13 }}
                    onClick={() => reschedule(adj)} disabled={!adj.newDate}>
                    ↩ Reprogrammer
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <span className="badge" style={{
                    background: `${REASON_COLORS[adj.reason] || '#9ca3af'}22`,
                    color: REASON_COLORS[adj.reason] || '#9ca3af', fontSize: 12,
                  }}>
                    {REASON_LABELS[adj.reason] || adj.reason}
                  </span>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  )
}
