"use client"

import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { genId, todayISO, fmtDate, daysUntil } from '../../utils/dates'
import EmptyState from '../shared/EmptyState'

export default function DevoirsExamens() {
  const { devoirs, setDevoirs, examens, setExamens, tasks, setTasks } = useApp()
  const blankD = { matiere: '', description: '', dateRendu: '', statut: 'À faire', priorite: 'Important' }
  const blankE = { matiere: '', date: '', heure: '08:00', salle: '', chapitres: '', totalChapitres: 3, chapitresRevises: 0 }
  const [showDForm, setShowDForm] = useState(false)
  const [showEForm, setShowEForm] = useState(false)
  const [dForm, setDForm] = useState(blankD)
  const [eForm, setEForm] = useState(blankE)
  const [createTask, setCreateTask] = useState(true)

  const addDevoir = () => {
    if (!dForm.matiere.trim()) return
    const newDevoir = { ...dForm, id: genId() }
    setDevoirs(p => [...p, newDevoir])

    // Créer la tâche associée si demandé
    if (createTask && setTasks) {
      const taskName = dForm.description.trim()
        ? `[École] ${dForm.matiere} — ${dForm.description}`
        : `[École] Devoir : ${dForm.matiere}`
      setTasks(p => [...p, {
        id: genId(),
        name: taskName,
        project: 'École',
        priority: dForm.priorite,
        duration: 60,
        deadline: dForm.dateRendu || '',
        flexible: false,
        recurring: false,
        recurrence: 'daily',
        recurrenceDays: [],
        recurrenceTime: '',
        status: 'À faire',
        createdAt: todayISO(),
        lastCompletedAt: null,
        linkedDevoirId: newDevoir.id,
      }])
    }

    setDForm(blankD)
    setShowDForm(false)
    setCreateTask(true)
  }

  const addExamen = () => {
    if (!eForm.matiere.trim()) return
    setExamens(p => [...p, { ...eForm, id: genId(), totalChapitres: +eForm.totalChapitres, chapitresRevises: +eForm.chapitresRevises }])
    setEForm(blankE)
    setShowEForm(false)
  }

  const sortedDevoirs = [...devoirs].sort((a, b) => new Date(a.dateRendu).getTime() - new Date(b.dateRendu).getTime())
  const sortedExamens = [...examens].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="grid-2">

      {/* ── Devoirs ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 16 }}>📋 Devoirs</h3>
          <button className="btn-gold" style={{ fontSize: 12, padding: '7px 13px' }} onClick={() => setShowDForm(s => !s)}>+ Ajouter</button>
        </div>

        {showDForm && (
          <div className="card" style={{ padding: 16, marginBottom: 14, border: '1px solid rgba(91,141,191,.25)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={dForm.matiere} onChange={e => setDForm({ ...dForm, matiere: e.target.value })} placeholder="Matière *" autoFocus />
              <input value={dForm.description} onChange={e => setDForm({ ...dForm, description: e.target.value })} placeholder="Description du devoir" />
              <input type="date" value={dForm.dateRendu} onChange={e => setDForm({ ...dForm, dateRendu: e.target.value })} />
              <select value={dForm.priorite} onChange={e => setDForm({ ...dForm, priorite: e.target.value })}>
                <option>Critique</option><option>Important</option><option>Optionnel</option>
              </select>

              {/* Liaison tâche */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13,
                cursor: 'pointer', background: 'rgba(91,141,191,.05)', border: '1px solid rgba(91,141,191,.2)',
                borderRadius: 8, padding: '9px 12px' }}>
                <input type="checkbox" checked={createTask} onChange={e => setCreateTask(e.target.checked)}
                  style={{ width: 'auto', accentColor: '#5B8DBF' }} />
                ✅ Créer une tâche associée dans mes Tâches
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-gold" style={{ fontSize: 13 }} onClick={addDevoir}>Ajouter</button>
                <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => { setShowDForm(false); setDForm(blankD); setCreateTask(true) }}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        {sortedDevoirs.length === 0
          ? <EmptyState mark="rings" tone="success" title="Aucun devoir. Profite." subtitle="Ça ne durera pas." />
          : sortedDevoirs.map(d => {
            const due = daysUntil(d.dateRendu)
            const isLinked = tasks?.some(t => t.linkedDevoirId === d.id)
            const borderColor = due < 0 ? '#f87171' : due <= 2 ? '#f87171' : due <= 7 ? '#5B8DBF' : 'var(--border)'
            return (
              <div key={d.id} className="card" style={{ padding: '12px 14px', marginBottom: 8, borderLeft: `3px solid ${borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{d.matiere}</span>
                      {due < 0 && <span className="badge badge-red">En retard</span>}
                      {due === 0 && <span className="badge badge-red">AUJOURD'HUI</span>}
                      {due === 1 && <span className="badge badge-red">DEMAIN</span>}
                      {due > 1 && due <= 2 && <span className="badge badge-red">J-{due}</span>}
                      {due > 2 && due <= 7 && <span className="badge badge-yellow">J-{due}</span>}
                      {isLinked && <span style={{ fontSize: 11, color: '#4ade80' }}>✅ Tâche liée</span>}
                    </div>
                    {d.description && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 3px' }}>{d.description}</p>}
                    {d.dateRendu && <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>📅 À rendre : {fmtDate(d.dateRendu)}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
                    <select value={d.statut} style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}
                      onChange={e => setDevoirs(p => p.map(x => x.id === d.id ? { ...x, statut: e.target.value } : x))}>
                      <option>À faire</option><option>En cours</option><option>Rendu</option>
                    </select>
                    <button className="btn-icon" style={{ fontSize: 12 }} onClick={() => setDevoirs(p => p.filter(x => x.id !== d.id))} aria-label="Supprimer le devoir">✕</button>
                  </div>
                </div>
              </div>
            )
          })
        }
      </div>

      {/* ── Examens ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 16 }}>🎓 Examens</h3>
          <button className="btn-gold" style={{ fontSize: 12, padding: '7px 13px' }} onClick={() => setShowEForm(s => !s)}>+ Ajouter</button>
        </div>

        {showEForm && (
          <div className="card" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={eForm.matiere} onChange={e => setEForm({ ...eForm, matiere: e.target.value })} placeholder="Matière *" autoFocus />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="date" value={eForm.date} onChange={e => setEForm({ ...eForm, date: e.target.value })} />
                <input type="time" value={eForm.heure} onChange={e => setEForm({ ...eForm, heure: e.target.value })} />
              </div>
              <input value={eForm.salle} onChange={e => setEForm({ ...eForm, salle: e.target.value })} placeholder="Salle" />
              <input value={eForm.chapitres} onChange={e => setEForm({ ...eForm, chapitres: e.target.value })}
                placeholder="Chapitres à réviser (ex: Tri, Graphes)" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="number" min={1} value={eForm.totalChapitres}
                  onChange={e => setEForm({ ...eForm, totalChapitres: +e.target.value })} placeholder="Total chapitres" />
                <input type="number" min={0} value={eForm.chapitresRevises}
                  onChange={e => setEForm({ ...eForm, chapitresRevises: +e.target.value })} placeholder="Chapitres révisés" />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-gold" style={{ fontSize: 13 }} onClick={addExamen}>Ajouter</button>
                <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => { setShowEForm(false); setEForm(blankE) }}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        {sortedExamens.length === 0
          ? <EmptyState mark="grid" tone="muted" title="Pas d'examen en vue." subtitle="Bonne période pour prendre de l'avance." />
          : sortedExamens.map(e => {
            const due = daysUntil(e.date)
            const total = +(e.totalChapitres ?? 0) || 1
            const revus = Math.min(+(e.chapitresRevises ?? 0) || 0, total)
            const pct = Math.round((revus / total) * 100)
            const isPast = due < 0
            const isToday = due === 0
            const isTomorrow = due === 1
            const isUrgent = due >= 0 && due <= 3

            const countdownBg = isToday ? 'rgba(239,68,68,.12)' : isTomorrow ? 'rgba(249,115,22,.1)' : isUrgent ? 'rgba(91,141,191,.07)' : 'var(--surface-deep)'
            const countdownBorder = isToday ? 'rgba(239,68,68,.4)' : isTomorrow ? 'rgba(249,115,22,.3)' : isUrgent ? 'rgba(91,141,191,.2)' : 'var(--border)'
            const countdownColor = isToday ? '#f87171' : isTomorrow ? '#f97316' : isUrgent ? '#5B8DBF' : 'var(--muted)'

            return (
              <div key={e.id} className="card" style={{ padding: '13px 14px', marginBottom: 8,
                borderLeft: `3px solid ${isPast ? 'var(--input-border)' : countdownColor}`,
                opacity: isPast ? .6 : 1 }}>

                {/* Header : matière + countdown */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{e.matiere}</span>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0' }}>
                      📅 {fmtDate(e.date)} à {e.heure}{e.salle && ` · 📍 ${e.salle}`}
                    </p>
                    {e.chapitres && <p style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0' }}>📖 {e.chapitres}</p>}
                  </div>

                  {/* Countdown badge */}
                  {!isPast && (
                    <div style={{ background: countdownBg, border: `1px solid ${countdownBorder}`,
                      borderRadius: 10, padding: '6px 12px', textAlign: 'center', flexShrink: 0, marginLeft: 10 }}>
                      <p style={{ fontSize: isToday || isTomorrow ? 11 : 10, fontWeight: 700, color: countdownColor,
                        margin: 0, textTransform: 'uppercase', letterSpacing: .5 }}>
                        {isToday ? "AUJOURD'HUI" : isTomorrow ? 'DEMAIN' : `J-${due}`}
                      </p>
                      {!isToday && !isTomorrow && (
                        <p style={{ fontSize: 10, color: 'var(--muted)', margin: '2px 0 0' }}>{fmtDate(e.date)}</p>
                      )}
                      {(isToday || isTomorrow) && (
                        <p style={{ fontSize: 11, color: countdownColor, margin: '2px 0 0', fontWeight: 600 }}>⏰ {e.heure}</p>
                      )}
                    </div>
                  )}
                  {isPast && <span className="badge badge-gray">Passé</span>}

                  <button className="btn-icon" onClick={() => setExamens(p => p.filter(x => x.id !== e.id))} style={{ marginLeft: 8 }} aria-label="Supprimer l'examen">✕</button>
                </div>

                {/* Révision */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Révision — {pct === 100 ? '✅ Prêt !' : `${pct}% révisé`}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button className="btn-icon" style={{ width: 32, height: 32, background: 'var(--hover-bg)', fontSize: 14, borderRadius: 6 }}
                        onClick={() => setExamens(p => p.map(x => x.id === e.id ? { ...x, chapitresRevises: Math.max(0, revus - 1) } : x))}>−</button>
                      <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#4ade80' : '#5B8DBF', minWidth: 40, textAlign: 'center' }}>
                        {revus}/{total}
                      </span>
                      <button className="btn-icon" style={{ width: 32, height: 32, background: 'var(--hover-bg)', fontSize: 14, borderRadius: 6 }}
                        onClick={() => setExamens(p => p.map(x => x.id === e.id ? { ...x, chapitresRevises: Math.min(total, revus + 1) } : x))}>+</button>
                    </div>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill${pct === 100 ? ' green' : ''}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}
