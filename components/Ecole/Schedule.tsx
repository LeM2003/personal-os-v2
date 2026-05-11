// @ts-nocheck — migration TypeScript en attente
"use client"

import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { genId, todayISO, todayDay, fmtDate } from '../../utils/dates'
import { COURSE_PALETTE } from '../../utils/constants'
import {
  Pencil, Trash2, Calendar, MapPin, User, Check, Plus
} from 'lucide-react'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const blankForm = { nom: '', jours: ['Lundi'], heureDebut: '08:00', heureFin: '10:00', salle: '', professeur: '', color: '#6366f1', dateDebut: '', dateFin: '' }

// Pas horaire fixe (px/heure). La plage visible est calculée dynamiquement.
const HOUR_PX = 36
const MIN_START = 7
const MAX_END = 23
const DEFAULT_RANGE = { start: 8, end: 18 }

// "HH:MM" → décimal (ex: "08:30" → 8.5)
const parseTime = (s) => {
  if (!s || typeof s !== 'string') return null
  const [h, m] = s.split(':').map(n => parseInt(n, 10) || 0)
  return h + m / 60
}

// Retourne le lundi de la semaine en cours au format ISO
const weekStartISO = () => {
  const d = new Date()
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - (dow - 1))
  return d.toISOString().split('T')[0]
}

const addDaysISO = (iso, n) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default function EmploiDuTemps() {
  const { courses, setCourses } = useApp()
  const [showForm,  setShowForm]  = useState(false)
  const [form,      setForm]      = useState(blankForm)
  const [editingId, setEditingId] = useState(null)
  const dayNow = todayDay()
  const today  = todayISO()

  // Semaine courante pour affichage contextuel
  const weekStart = weekStartISO()
  const weekEnd = addDaysISO(weekStart, 5) // samedi

  const openAdd = () => { setEditingId(null); setForm(blankForm); setShowForm(true) }
  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({ nom: c.nom, jours: [c.jour], heureDebut: c.heureDebut, heureFin: c.heureFin,
      salle: c.salle || '', professeur: c.professeur || '', color: c.color,
      dateDebut: c.dateDebut || '', dateFin: c.dateFin || '' })
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(blankForm) }

  const toggleJour = (jour) => {
    setForm(f => {
      const has = f.jours.includes(jour)
      const next = has ? f.jours.filter(j => j !== jour) : [...f.jours, jour]
      return { ...f, jours: next.length === 0 ? [jour] : next }
    })
  }

  const save = () => {
    if (!form.nom.trim()) return
    if (editingId) {
      setCourses(p => p.map(c => c.id === editingId
        ? { ...c, nom: form.nom, jour: form.jours[0], heureDebut: form.heureDebut, heureFin: form.heureFin,
            salle: form.salle, professeur: form.professeur, color: form.color,
            dateDebut: form.dateDebut || null, dateFin: form.dateFin || null }
        : c))
    } else {
      const newCourses = form.jours.map(jour => ({
        nom: form.nom, jour, heureDebut: form.heureDebut, heureFin: form.heureFin,
        salle: form.salle, professeur: form.professeur, color: form.color,
        dateDebut: form.dateDebut || null, dateFin: form.dateFin || null,
        id: genId(), attended: []
      }))
      setCourses(p => [...p, ...newCourses])
    }
    closeForm()
  }

  const del = (id) => {
    setCourses(p => p.filter(c => c.id !== id))
    closeForm()
  }

  const clearAll = () => {
    if (courses.length === 0) return
    const ok = window.confirm(
      `Supprimer les ${courses.length} cours de ton emploi du temps ?\n\nCette action est définitive.`
    )
    if (!ok) return
    setCourses([])
  }

  const togglePresence = (id) => {
    setCourses(p => p.map(c => {
      if (c.id !== id) return c
      const attended = c.attended || []
      const already  = attended.includes(today)
      return { ...c, attended: already ? attended.filter(d => d !== today) : [...attended, today] }
    }))
  }

  const isPresent = (c) => (c.attended || []).includes(today)

  const isActiveToday = (c) => {
    if (c.dateDebut && today < c.dateDebut) return false
    if (c.dateFin && today > c.dateFin) return false
    return true
  }

  // Timeline dynamique : basée sur les cours actifs réellement affichés
  const { TL_START, TL_END, TL_HEIGHT, TL_MARKS } = useMemo(() => {
    const visibleCourses = courses.filter(isActiveToday)
    if (visibleCourses.length === 0) {
      const start = DEFAULT_RANGE.start
      const end = DEFAULT_RANGE.end
      return buildTimeline(start, end)
    }
    const starts = visibleCourses.map(c => parseTime(c.heureDebut)).filter(v => v != null)
    const ends = visibleCourses.map(c => parseTime(c.heureFin)).filter(v => v != null)
    if (starts.length === 0) return buildTimeline(DEFAULT_RANGE.start, DEFAULT_RANGE.end)
    // 1 h de marge en haut et en bas, borné [7-23]
    const rawStart = Math.floor(Math.min(...starts)) - 1
    const rawEnd = Math.ceil(Math.max(...ends)) + 1
    const start = Math.max(MIN_START, Math.min(rawStart, DEFAULT_RANGE.start))
    const end = Math.min(MAX_END, Math.max(rawEnd, DEFAULT_RANGE.end))
    return buildTimeline(start, end)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, today])

  const clampTL = (h) => Math.max(TL_START, Math.min(TL_END, h))

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const sortedJours = isMobile
    ? [dayNow, ...JOURS.filter(j => j !== dayNow)]
    : JOURS

  const activeCourseCount = courses.filter(isActiveToday).length

  return (
    <div>
      {/* ── En-tête : semaine + actions ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, marginBottom: 18,
      }}>
        <div>
          <p style={{
            fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13,
            textTransform: 'uppercase', letterSpacing: .8, color: 'var(--muted)', margin: 0,
          }}>
            Semaine en cours
          </p>
          <p style={{ fontSize: 13, color: 'var(--text)', margin: '3px 0 0' }}>
            {fmtDate(weekStart)} — {fmtDate(weekEnd)}
            <span style={{ color: 'var(--muted)', marginLeft: 8 }}>
              · {activeCourseCount} cours actif{activeCourseCount !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {courses.length > 0 && (
            <button className="btn-ghost" onClick={clearAll}
              style={{ fontSize: 12, padding: '7px 13px', display: 'inline-flex', alignItems: 'center', gap: 6,
                color: '#f87171', border: '1px solid rgba(248,113,113,.3)' }}
              title="Vider tout l'emploi du temps">
              <Trash2 size={13} /> Tout vider
            </button>
          )}
          <button className="btn-gold" onClick={openAdd}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Ajouter un cours
          </button>
        </div>
      </div>

      {/* ── Formulaire ajout / édition ── */}
      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(91,141,191,.25)' }}>
          <h3 style={{ fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingId && <Pencil size={15} />}
            {editingId ? 'Modifier le cours' : 'Nouveau cours'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
              placeholder="Nom du cours *" autoFocus />

            <div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                {editingId ? 'Jour' : 'Jours (sélectionne un ou plusieurs)'}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {JOURS.map(j => (
                  <button key={j} type="button"
                    onClick={() => editingId ? setForm({ ...form, jours: [j] }) : toggleJour(j)}
                    style={{
                      padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: form.jours.includes(j) ? '2px solid var(--gold)' : '1px solid var(--border)',
                      background: form.jours.includes(j) ? 'var(--gold-dim)' : 'transparent',
                      color: form.jours.includes(j) ? 'var(--gold)' : 'var(--muted)',
                      fontFamily: 'DM Sans',
                    }}>
                    {j.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Début</p>
                <input type="time" value={form.heureDebut} onChange={e => setForm({ ...form, heureDebut: e.target.value })} />
              </div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Fin</p>
                <input type="time" value={form.heureFin} onChange={e => setForm({ ...form, heureFin: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={form.salle} onChange={e => setForm({ ...form, salle: e.target.value })} placeholder="Salle / Lieu" />
              <input value={form.professeur} onChange={e => setForm({ ...form, professeur: e.target.value })} placeholder="Professeur" />
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} /> Période (optionnel — laisser vide = toute l&apos;année)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Date début</p>
                  <input type="date" value={form.dateDebut}
                    onChange={e => setForm({ ...form, dateDebut: e.target.value })} />
                </div>
                <div>
                  <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Date fin</p>
                  <input type="date" value={form.dateFin}
                    onChange={e => setForm({ ...form, dateFin: e.target.value })} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Couleur :</span>
              {COURSE_PALETTE.map(c => (
                <div key={c} onClick={() => setForm({ ...form, color: c })}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: `3px solid ${form.color === c ? '#fff' : 'transparent'}`, transition: 'border-color .15s' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button className="btn-gold" onClick={save}>
              {editingId ? 'Enregistrer' : `Ajouter${form.jours.length > 1 ? ` (${form.jours.length} jours)` : ''}`}
            </button>
            <button className="btn-ghost" onClick={closeForm}>Annuler</button>
            {editingId && (
              <button className="btn-danger" onClick={() => del(editingId)}
                style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={14} /> Supprimer
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Grille hebdomadaire ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }} className="grid-6">
        {sortedJours.filter(j => JOURS.includes(j)).map(jour => {
          const dayCourses = courses.filter(c => c.jour === jour && isActiveToday(c)).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
          const isToday = jour === dayNow
          return (
            <div key={jour}>
              <div className={`cal-day-header${isToday ? ' today' : ''}`}>
                <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 12,
                  color: isToday ? '#5B8DBF' : 'var(--muted)', margin: 0, textTransform: 'uppercase', letterSpacing: .6 }}>
                  {jour}
                </p>
                {isToday && <p style={{ fontSize: 10, color: '#5B8DBF', margin: '2px 0 0' }}>Aujourd&apos;hui</p>}
              </div>

              <div style={{
                position: 'relative', height: TL_HEIGHT,
                borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--card)', overflow: 'hidden',
              }}>
                {/* Graduations horaires */}
                {TL_MARKS.map((h, i) => {
                  const top = (h - TL_START) * HOUR_PX
                  return (
                    <div key={h} style={{
                      position: 'absolute', left: 0, right: 0, top,
                      height: 1, background: i === 0 ? 'transparent' : 'var(--border)',
                      opacity: 0.5, pointerEvents: 'none',
                    }}>
                      <span style={{
                        position: 'absolute', left: 4, top: -7,
                        fontSize: 9, color: 'var(--muted)', fontWeight: 500,
                        background: 'var(--card)', padding: '0 3px',
                        fontFamily: 'DM Sans',
                      }}>{h}h</span>
                    </div>
                  )
                })}

                {dayCourses.map(c => {
                  const present = isPresent(c)
                  const attendCount = (c.attended || []).length
                  const start = clampTL(parseTime(c.heureDebut))
                  const end = clampTL(parseTime(c.heureFin))
                  const top = (start - TL_START) * HOUR_PX
                  const height = Math.max(26, (end - start) * HOUR_PX - 2)
                  const compact = height < 70
                  const hasPeriod = c.dateDebut || c.dateFin
                  return (
                    <div key={c.id} style={{
                      position: 'absolute', left: 22, right: 4, top, height,
                      background: present ? 'rgba(74,222,128,.12)' : `${c.color}20`,
                      border: `1px solid ${present ? 'rgba(74,222,128,.35)' : `${c.color}45`}`,
                      borderLeft: `3px solid ${present ? '#4ade80' : c.color}`,
                      borderRadius: 7, padding: compact ? '3px 7px' : '5px 8px',
                      overflow: 'hidden', transition: 'all .2s',
                      display: 'flex', flexDirection: 'column', gap: 1,
                    }}>
                      <p style={{ fontWeight: 600, fontSize: compact ? 11 : 12.5,
                        color: present ? '#4ade80' : c.color,
                        margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        display: 'flex', alignItems: 'center', gap: 4 }}>
                        {present && <Check size={11} />}
                        {c.nom}
                      </p>
                      {!compact && (
                        <p style={{ fontSize: 10.5, color: 'var(--muted)', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                          {c.heureDebut}–{c.heureFin}
                        </p>
                      )}
                      {!compact && c.salle && (
                        <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={10} /> {c.salle}
                        </p>
                      )}
                      {height >= 100 && c.professeur && (
                        <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <User size={10} /> {c.professeur}
                        </p>
                      )}
                      {height >= 120 && hasPeriod && (
                        <p style={{ fontSize: 9.5, color: 'var(--muted)', margin: 0,
                          display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Calendar size={10} />
                          {c.dateDebut && c.dateFin
                            ? `${fmtDate(c.dateDebut)} → ${fmtDate(c.dateFin)}`
                            : c.dateFin
                              ? `Jusqu'au ${fmtDate(c.dateFin)}`
                              : `Dès le ${fmtDate(c.dateDebut)}`}
                        </p>
                      )}
                      {height >= 140 && attendCount > 0 && !isToday && (
                        <p style={{ fontSize: 9.5, color: 'rgba(74,222,128,.7)', margin: 0,
                          display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Check size={10} /> {attendCount} séance{attendCount > 1 ? 's' : ''}
                        </p>
                      )}
                      <div style={{
                        display: 'flex', gap: 4, marginTop: 'auto',
                        flexWrap: 'wrap', alignItems: 'flex-end',
                      }}>
                        {isToday && height >= 56 && (
                          <button onClick={() => togglePresence(c.id)} aria-label="Marquer présence"
                            style={{ fontSize: 10, padding: '3px 7px', borderRadius: 5, cursor: 'pointer', border: 'none',
                              background: present ? 'rgba(74,222,128,.22)' : 'rgba(91,141,191,.18)',
                              color: present ? '#4ade80' : '#5B8DBF', fontWeight: 600, lineHeight: 1,
                              display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {present ? <><Check size={10} /> Présent</> : <><Plus size={10} /> Présence</>}
                          </button>
                        )}
                        <button onClick={() => openEdit(c)} aria-label="Modifier le cours"
                          style={{ fontSize: 10, padding: '3px 7px', borderRadius: 5, cursor: 'pointer',
                            background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', lineHeight: 1,
                            display: 'inline-flex', alignItems: 'center' }}>
                          <Pencil size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function buildTimeline(start, end) {
  const step = (end - start) > 12 ? 2 : (end - start) > 8 ? 2 : 1
  const marks = []
  for (let h = start; h <= end; h += step) marks.push(h)
  return {
    TL_START: start,
    TL_END: end,
    TL_HEIGHT: (end - start) * HOUR_PX,
    TL_MARKS: marks,
  }
}
