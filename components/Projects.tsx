// @ts-nocheck — migration TypeScript en attente
"use client"

import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { genId, todayISO, fmtDate } from '../utils/dates'
import PageHeader from './shared/PageHeader'
import EmptyState from './shared/EmptyState'
import AbstractMark from './shared/AbstractMark'
import {
  Lightbulb, Target, Rocket, Bot, Pencil, X,
  ChevronUp, ChevronDown, ClipboardList, FileText,
  CheckCircle2, Circle
} from 'lucide-react'

const blankProject = {
  name: '', objective: '', targetDate: '', type: 'projet', notes: '',
}

// Moodboard — 5 tonalités stables assignées par hash du nom.
// Chaque projet garde la même identité visuelle entre les sessions.
const COVER_TONES = [
  { bg: 'rgba(91,141,191,0.14)',  accent: '#5B8DBF', mark: 'rings'  },
  { bg: 'rgba(167,139,250,0.14)', accent: '#a78bfa', mark: 'offset' },
  { bg: 'rgba(251,146,60,0.14)',  accent: '#fb923c', mark: 'bars'   },
  { bg: 'rgba(74,222,128,0.12)',  accent: '#4ade80', mark: 'arc'    },
  { bg: 'rgba(248,113,113,0.12)', accent: '#f87171', mark: 'grid'   },
]
const toneFor = (name) => {
  const n = name || ''
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h + n.charCodeAt(i)) % COVER_TONES.length
  return COVER_TONES[h]
}


const KANBAN_COLS = [
  { id: 'Backlog',    label: 'Backlog',    color: '#64748b', bg: 'rgba(100,116,139,.08)' },
  { id: 'En cours',   label: 'En cours',   color: '#38bdf8', bg: 'rgba(56,189,248,.08)'  },
  { id: 'Terminé',   label: 'Terminé',    color: '#4ade80', bg: 'rgba(74,222,128,.08)'  },
]

function KanbanCard({ proj, tasks, calcProgress, updateStatus, onEdit, del }) {
  const tone = proj.name ? (() => {
    const n = proj.name; let h = 0
    for (let i = 0; i < n.length; i++) h = (h + n.charCodeAt(i)) % 5
    return [
      { accent: '#38bdf8' }, { accent: '#a78bfa' }, { accent: '#fb923c' },
      { accent: '#4ade80' }, { accent: '#f87171' },
    ][h]
  })() : { accent: '#38bdf8' }

  const linked = tasks.filter(t => t.project === proj.name)
  const pct = calcProgress(proj)
  const status = proj.status || 'En cours'
  const cols = KANBAN_COLS.map(c => c.id)
  const curIdx = cols.indexOf(status)
  const canPrev = curIdx > 0
  const canNext = curIdx < cols.length - 1

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, backdropFilter: 'blur(8px)', position: 'relative', overflow: 'hidden', transition: 'transform .2s, box-shadow .2s' }}
      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.2)' }}
      onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${tone.accent}, transparent)` }} />

      {/* Nom + actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <p style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 14, fontWeight: 700, margin: 0, flex: 1, lineHeight: 1.3, color: 'var(--text)', wordBreak: 'break-word' }}>{proj.name}</p>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn-icon" title="Modifier" onClick={() => onEdit(proj)} style={{ width: 24, height: 24 }}><Pencil size={12} /></button>
          <button className="btn-icon" title="Supprimer" onClick={() => del(proj.id)} style={{ width: 24, height: 24, color: '#f87171' }}><X size={12} /></button>
        </div>
      </div>

      {/* Objectif */}
      {proj.objective && (
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {proj.objective}
        </p>
      )}

      {/* Progression */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6 }}>Progression</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: tone.accent }}>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${tone.accent}, ${tone.accent}99)` }} />
        </div>
      </div>

      {/* Méta */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        {linked.length > 0 && (
          <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--surface-elevated)', padding: '2px 8px', borderRadius: 999 }}>
            {linked.filter(t => t.status === 'Terminé').length}/{linked.length} tâches
          </span>
        )}
        {proj.targetDate && (
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>📅 {proj.targetDate}</span>
        )}
        {proj.aiAnalysis && (
          <span style={{ fontSize: 10, color: '#4ade80', background: 'rgba(74,222,128,.1)', padding: '2px 8px', borderRadius: 999 }}>
            IA {proj.aiAnalysis.score_faisabilite}/10
          </span>
        )}
      </div>

      {/* Navigation colonnes */}
      <div style={{ display: 'flex', gap: 6 }}>
        {canPrev && (
          <button onClick={() => updateStatus(proj.id, cols[curIdx - 1])}
            style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-dm-sans, DM Sans)', transition: 'all .15s' }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-1)'; e.currentTarget.style.color = 'var(--accent-1)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
            ← {cols[curIdx - 1]}
          </button>
        )}
        {canNext && (
          <button onClick={() => updateStatus(proj.id, cols[curIdx + 1])}
            style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-dm-sans, DM Sans)', transition: 'all .15s' }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-1)'; e.currentTarget.style.color = 'var(--accent-1)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
            {cols[curIdx + 1]} →
          </button>
        )}
      </div>
    </div>
  )
}

function KanbanView({ projects, tasks, calcProgress, updateStatus, onEdit, del }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24, overflowX: 'auto' }}
      className="kanban-grid">
      {KANBAN_COLS.map(col => {
        const colProjects = projects.filter(p => (p.status || 'En cours') === col.id)
        return (
          <div key={col.id} style={{ minWidth: 220 }}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: col.bg, border: `1px solid ${col.color}20` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, boxShadow: `0 0 6px ${col.color}` }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: .8 }}>{col.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: col.color, background: `${col.color}20`, borderRadius: 999, padding: '1px 8px', fontWeight: 700 }}>{colProjects.length}</span>
            </div>
            {/* Cards */}
            <div style={{ minHeight: 80 }}>
              {colProjects.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 12, opacity: .6 }}>
                  Aucun projet
                </div>
              ) : colProjects.map(proj => (
                <KanbanCard key={proj.id} proj={proj} tasks={tasks} calcProgress={calcProgress} updateStatus={updateStatus} onEdit={onEdit} del={del} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Projets() {
  const { tasks, setTasks, projects, setProjects } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(blankProject)
  const [editingId, setEditingId] = useState(null)
  const [analyzing, setAnalyzing] = useState(null)
  const [aiError, setAiError] = useState('')
  const [viewTab, setViewTab] = useState('projets') // 'projets' | 'idees'
  const [viewMode, setViewMode] = useState('liste') // 'liste' | 'kanban'
  const [expandedId, setExpandedId] = useState(null)
  const [newStep, setNewStep] = useState('')

  /* ── CRUD ── */
  const openAdd = (type) => {
    setEditingId(null)
    setForm({ ...blankProject, type })
    setShowForm(true)
  }
  const openEdit = (proj) => {
    setEditingId(proj.id)
    setForm({
      name: proj.name, objective: proj.objective || '', targetDate: proj.targetDate || '',
      type: proj.type || 'projet', notes: proj.notes || '',
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(blankProject) }

  const saveProject = () => {
    if (!form.name.trim()) return
    if (editingId) {
      setProjects(p => p.map(x => x.id === editingId ? { ...x, ...form } : x))
    } else {
      setProjects(p => [...p, {
        ...form, id: genId(), createdAt: todayISO(),
        steps: [], aiAnalysis: null, status: 'En cours',
      }])
    }
    closeForm()
  }

  const del = id => {
    const proj = projects.find(p => p.id === id)
    setProjects(p => p.filter(x => x.id !== id))
    // Detach linked tasks
    if (proj) setTasks(prev => prev.map(t => t.project === proj.name ? { ...t, project: '' } : t))
  }

  /* ── Changer statut (kanban) ── */
  const updateStatus = (projId, status) => {
    setProjects(p => p.map(x => x.id === projId ? { ...x, status } : x))
  }

  /* ── Promouvoir idee → projet ── */
  const promote = (proj) => {
    setProjects(p => p.map(x => x.id === proj.id ? { ...x, type: 'projet' } : x))
  }

  /* ── Steps ── */
  const addStep = (projId) => {
    if (!newStep.trim()) return
    setProjects(p => p.map(x => {
      if (x.id !== projId) return x
      const steps = [...(x.steps || []), { id: genId(), title: newStep.trim(), done: false, order: (x.steps || []).length }]
      return { ...x, steps }
    }))
    setNewStep('')
  }

  const toggleStep = (projId, stepId) => {
    setProjects(p => p.map(x => {
      if (x.id !== projId) return x
      const steps = (x.steps || []).map(s => s.id === stepId ? { ...s, done: !s.done } : s)
      return { ...x, steps }
    }))
  }

  const delStep = (projId, stepId) => {
    setProjects(p => p.map(x => {
      if (x.id !== projId) return x
      return { ...x, steps: (x.steps || []).filter(s => s.id !== stepId) }
    }))
  }

  const moveStep = (projId, stepId, dir) => {
    setProjects(p => p.map(x => {
      if (x.id !== projId) return x
      const steps = [...(x.steps || [])]
      const idx = steps.findIndex(s => s.id === stepId)
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= steps.length) return x
      ;[steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]]
      return { ...x, steps: steps.map((s, i) => ({ ...s, order: i })) }
    }))
  }

  /* ── Notes ── */
  const updateNotes = (projId, notes) => {
    setProjects(p => p.map(x => x.id === projId ? { ...x, notes } : x))
  }

  /* ── Progress ── */
  const calcProgress = (proj) => {
    const steps = proj.steps || []
    const linked = tasks.filter(t => t.project === proj.name)
    const totalItems = steps.length + linked.length
    if (totalItems === 0) return 0
    const doneItems = steps.filter(s => s.done).length + linked.filter(t => t.status === 'Terminé').length
    return Math.round((doneItems / totalItems) * 100)
  }

  /* ── AI Analysis ── */
  const analyzeProject = async proj => {
    setAnalyzing(proj.id); setAiError('')
    const linked = tasks.filter(t => t.project === proj.name)
    const steps = proj.steps || []
    const prompt = [
      `Nom du projet : ${proj.name}`,
      `Type : ${proj.type}`,
      `Objectif final : ${proj.objective || 'Non defini'}`,
      `Date cible : ${proj.targetDate ? fmtDate(proj.targetDate) : 'Non definie'}`,
      `Notes/Plan : ${proj.notes || 'Aucune'}`,
      `Etapes (${steps.filter(s => s.done).length}/${steps.length} faites) :`,
      steps.length ? steps.map(s => `  ${s.done ? '✓' : '○'} ${s.title}`).join('\n') : '  Aucune',
      `Taches liees (${linked.filter(t => t.status === 'Terminé').length}/${linked.length} terminees) :`,
      linked.length ? linked.map(t => `  - ${t.name} (${t.status})`).join('\n') : '  Aucune',
    ].join('\n')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'analyze_project', messages: [{ role: 'user', content: prompt }] }),
      })
      if (!res.ok) throw new Error(`Erreur serveur ${res.status}`)
      const data = await res.json()
      let rawText = (data.content || '').replace(/```json?|```/g, '').trim()
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
      setProjects(p => p.map(x => x.id === proj.id ? { ...x, aiAnalysis: analysis } : x))
    } catch (e) {
      setAiError(`Erreur IA : ${e.message}`)
    } finally {
      setAnalyzing(null)
    }
  }

  /* ── Filtrage ── */
  const projetsOnly = projects.filter(p => (p.type || 'projet') === 'projet')
  const ideesOnly = projects.filter(p => p.type === 'idee')
  const currentList = viewTab === 'projets' ? projetsOnly : ideesOnly

  const sorted = [...currentList].sort((a, b) => {
    const sa = a.aiAnalysis?.score_faisabilite ?? -1
    const sb = b.aiAnalysis?.score_faisabilite ?? -1
    return sb - sa
  })

  return (
    <div>
      <PageHeader title="Projets & Idées" sub="Ce que tu construis, seul ou à plusieurs" action={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => openAdd('idee')}
            style={{ fontSize: 13, padding: '8px 14px', border: '1px solid rgba(139,92,246,.3)', color: '#a78bfa',
              display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Lightbulb size={14} /> Nouvelle idée
          </button>
          <button className="btn-gold" onClick={() => openAdd('projet')}>+ Nouveau projet</button>
        </div>
      } />

      {/* Tabs Projets / Idees + Toggle vue */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div className="subtab-bar">
          <button className={`subtab${viewTab === 'projets' ? ' active' : ''}`} onClick={() => setViewTab('projets')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Target size={13} /> Projets ({projetsOnly.length})
          </button>
          <button className={`subtab${viewTab === 'idees' ? ' active' : ''}`} onClick={() => setViewTab('idees')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Lightbulb size={13} /> Idées ({ideesOnly.length})
          </button>
        </div>
        {viewTab === 'projets' && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
            <button onClick={() => setViewMode('liste')}
              style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: viewMode === 'liste' ? 'var(--accent-1)' : 'transparent',
                color: viewMode === 'liste' ? '#fff' : 'var(--muted)',
                fontFamily: 'var(--font-dm-sans, DM Sans)', transition: 'all .15s' }}>
              ≡ Liste
            </button>
            <button onClick={() => setViewMode('kanban')}
              style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: viewMode === 'kanban' ? 'var(--accent-1)' : 'transparent',
                color: viewMode === 'kanban' ? '#fff' : 'var(--muted)',
                fontFamily: 'var(--font-dm-sans, DM Sans)', transition: 'all .15s' }}>
              ⊞ Kanban
            </button>
          </div>
        )}
      </div>

      {aiError && (
        <div className="alert alert-red" style={{ marginBottom: 16 }}>
          {aiError}
          <button className="btn-icon" style={{ marginLeft: 'auto' }} onClick={() => setAiError('')}><X size={14} /></button>
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(91,141,191,.3)' }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
            {editingId ? <><Pencil size={15} /> Modifier</>
              : form.type === 'idee' ? <><Lightbulb size={15} /> Nouvelle idée</>
              : <><Target size={15} /> Nouveau projet</>}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder={form.type === 'idee' ? "Nom de l'idée *" : "Nom du projet *"} autoFocus />
            <textarea rows={2} value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })}
              placeholder="Objectif final (ex : atteindre 10K abonnés)" />
            <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes / Plan détaillé (optionnel)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid-2">
              <input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="projet">Projet</option>
                <option value="idee">Idée</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn-gold" onClick={saveProject}>{editingId ? 'Enregistrer' : 'Créer'}</button>
            <button className="btn-ghost" onClick={closeForm}>Annuler</button>
          </div>
        </div>
      )}

      {/* ── Vue KANBAN (projets seulement) ── */}
      {viewTab === 'projets' && viewMode === 'kanban' && (
        <KanbanView
          projects={projetsOnly}
          tasks={tasks}
          calcProgress={calcProgress}
          updateStatus={updateStatus}
          onEdit={openEdit}
          del={del}
        />
      )}

      {/* ── Vue LISTE ── */}
      {(viewTab !== 'projets' || viewMode === 'liste') && (sorted.length === 0
        ? <EmptyState
            mark={viewTab === 'idees' ? 'stack' : 'arc'} tone="accent"
            title={viewTab === 'idees' ? "Pas encore d'idée notée." : "Aucun projet ouvert."}
            subtitle={viewTab === 'idees' ? "Dépose tes pensées ici — tu les transformeras en projet quand elles seront mûres." : "C'est peut-être le moment d'en lancer un."} />
        : sorted.map(proj => {
          const pct = calcProgress(proj)
          const linked = tasks.filter(t => t.project === proj.name)
          const steps = proj.steps || []
          const ai = proj.aiAnalysis
          const isAnalyzing = analyzing === proj.id
          const scoreColor = !ai ? null : ai.score_faisabilite >= 7 ? '#4ade80' : ai.score_faisabilite >= 4 ? '#5B8DBF' : '#f87171'
          const isExpanded = expandedId === proj.id
          const isIdee = (proj.type || 'projet') === 'idee'
          const stepsDone = steps.filter(s => s.done).length
          const isEditing = editingId === proj.id

          const tone = toneFor(proj.name)

          return (
            <div key={proj.id} className="card" style={{
              padding: 20, marginBottom: 16,
              background: isEditing ? 'rgba(91,141,191,.03)' : undefined,
              overflow: 'hidden',
            }}>
              {/* Bandeau moodboard — identité visuelle du projet */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : proj.id)}
                style={{
                  margin: '-20px -20px 16px',
                  height: 76,
                  background: tone.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 18px',
                  position: 'relative', overflow: 'hidden',
                  cursor: 'pointer',
                }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, zIndex: 1 }}>
                  <span style={{
                    fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
                    fontFamily: 'Fraunces', fontWeight: 700,
                    color: tone.accent, opacity: 0.85,
                  }}>
                    {isIdee ? 'Idée' : 'Projet'}
                  </span>
                  <span style={{
                    fontSize: 22, fontFamily: 'Fraunces', fontWeight: 700,
                    letterSpacing: '-0.4px', color: 'var(--text)',
                    lineHeight: 1.1, maxWidth: 260,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{proj.name}</span>
                </div>
                <div style={{
                  position: 'absolute', right: -10, top: -12,
                  opacity: 0.55, pointerEvents: 'none',
                  // Override local de --gold pour adopter la couleur tonale
                  '--gold': tone.accent,
                }}>
                  <AbstractMark variant={tone.mark} tone="accent" size={104} />
                </div>
                <div style={{
                  zIndex: 1, fontSize: 13, fontWeight: 700,
                  color: pct === 100 ? '#4ade80' : tone.accent,
                  background: 'var(--card)',
                  borderRadius: 999, padding: '5px 11px',
                  border: `1px solid ${pct === 100 ? 'rgba(74,222,128,.35)' : tone.accent + '55'}`,
                }}>
                  {pct}%
                </div>
              </div>

              {/* Header badges & objectif */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : proj.id)}>
                  {(ai || ai?.priorite_recommandee) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      {ai && (
                        <span className="badge" style={{ background: `${scoreColor}22`, color: scoreColor, fontSize: 12 }}>
                          ★ {ai.score_faisabilite}/10
                        </span>
                      )}
                      {ai?.priorite_recommandee && <span className="badge badge-yellow">{ai.priorite_recommandee}</span>}
                    </div>
                  )}
                  {proj.objective && <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 4px', lineHeight: 1.5 }}>{proj.objective}</p>}
                  {proj.targetDate && <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Cible : {fmtDate(proj.targetDate)}</p>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isIdee && (
                    <button className="btn-gold" style={{ fontSize: 11, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onClick={() => promote(proj)}>
                      <Rocket size={13} /> Promouvoir
                    </button>
                  )}
                  <button className="btn-gold" style={{ fontSize: 11, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    onClick={() => analyzeProject(proj)} disabled={isAnalyzing}>
                    {isAnalyzing ? <><span className="spinner" />Analyse…</> : <><Bot size={13} /> IA</>}
                  </button>
                  <button className="btn-icon" onClick={() => openEdit(proj)} title="Modifier"><Pencil size={15} /></button>
                  <button className="btn-icon" onClick={() => del(proj.id)} title="Supprimer"><X size={15} /></button>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {steps.length > 0 && `${stepsDone}/${steps.length} étapes`}
                    {steps.length > 0 && linked.length > 0 && ' · '}
                    {linked.length > 0 && `${linked.filter(t => t.status === 'Terminé').length}/${linked.length} tâches`}
                    {steps.length === 0 && linked.length === 0 && 'Aucune étape ni tâche'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#4ade80' : '#5B8DBF' }}>{pct}%</span>
                </div>
                <div className="progress-track">
                  <div className={`progress-fill${pct === 100 ? ' green' : ''}`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Expand toggle */}
              <button className="btn-ghost" onClick={() => setExpandedId(isExpanded ? null : proj.id)}
                style={{ width: '100%', fontSize: 12, padding: '6px 12px', marginBottom: isExpanded ? 14 : 0 }}>
                {isExpanded
                ? <><ChevronUp size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Replier</>
                : <><ChevronDown size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Détails — étapes, notes, tâches</>}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ marginTop: 8 }}>

                  {/* Steps / Workflow */}
                  <div style={{ marginBottom: 18 }}>
                    <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10, fontFamily: 'Fraunces', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ClipboardList size={12} /> Étapes du workflow
                    </p>

                    {steps.length === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Aucune étape — ajoutes-en pour suivre ta progression.</p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                      {steps.map((step, idx) => (
                        <div key={step.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                          background: step.done ? 'rgba(74,222,128,.06)' : 'rgba(91,141,191,.03)',
                          border: `1px solid ${step.done ? 'rgba(74,222,128,.2)' : 'var(--border)'}`,
                        }}>
                          <button onClick={() => toggleStep(proj.id, step.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'inline-flex' }}>
                            {step.done
                              ? <CheckCircle2 size={17} style={{ color: '#4ade80' }} />
                              : <Circle size={17} style={{ color: 'var(--muted)' }} />}
                          </button>
                          <span style={{
                            flex: 1, fontSize: 13,
                            textDecoration: step.done ? 'line-through' : 'none',
                            color: step.done ? 'var(--muted)' : 'var(--text)',
                          }}>
                            {step.title}
                          </span>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button className="btn-icon" style={{ fontSize: 12, width: 32, height: 32 }}
                              onClick={() => moveStep(proj.id, step.id, -1)} disabled={idx === 0}>↑</button>
                            <button className="btn-icon" style={{ fontSize: 12, width: 32, height: 32 }}
                              onClick={() => moveStep(proj.id, step.id, 1)} disabled={idx === steps.length - 1}>↓</button>
                            <button className="btn-icon" style={{ fontSize: 11 }}
                              onClick={() => delStep(proj.id, step.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add step */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={newStep} onChange={e => setNewStep(e.target.value)}
                        placeholder="Ajouter une étape..."
                        onKeyDown={e => { if (e.key === 'Enter') addStep(proj.id) }}
                        style={{ flex: 1, fontSize: 13 }} />
                      <button className="btn-gold" style={{ fontSize: 12, padding: '7px 14px', flexShrink: 0 }}
                        onClick={() => addStep(proj.id)} disabled={!newStep.trim()}>
                        + Ajouter
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 18 }}>
                    <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8, fontFamily: 'Fraunces', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <FileText size={12} /> Notes / Plan
                    </p>
                    <textarea
                      rows={4}
                      value={proj.notes || ''}
                      onChange={e => updateNotes(proj.id, e.target.value)}
                      placeholder="Ecris ton plan, tes idées, ta stratégie..."
                      style={{ fontSize: 13, lineHeight: 1.6 }}
                    />
                  </div>

                  {/* Linked tasks */}
                  {linked.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8, fontFamily: 'Fraunces', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <CheckCircle2 size={12} /> Tâches liées ({linked.filter(t => t.status === 'Terminé').length}/{linked.length})
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {linked.map(t => (
                          <span key={t.id} style={{
                            background: t.status === 'Terminé' ? 'rgba(34,197,94,.1)' : 'var(--pill-bg)',
                            border: `1px solid ${t.status === 'Terminé' ? 'rgba(34,197,94,.3)' : 'var(--border)'}`,
                            color: t.status === 'Terminé' ? '#4ade80' : 'var(--muted)',
                            borderRadius: 6, padding: '3px 10px', fontSize: 12,
                          }}>
                            {t.status === 'Terminé' ? '✓ ' : t.status === 'En cours' ? '◉ ' : ''}{t.name}
                          </span>
                        ))}
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                        Astuce : dans Tâches, mets le nom du projet dans « Projet lié » pour les rattacher ici.
                      </p>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {ai && (
                    <div className="ai-block">
                      <p style={{ color: '#5B8DBF', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Bot size={13} /> Analyse IA
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="grid-2">
                        <div>
                          <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 5 }}>Score de faisabilité</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'Fraunces', fontWeight: 800, fontSize: 28, color: scoreColor }}>{ai.score_faisabilite}</span>
                            <span style={{ color: 'var(--muted)', fontSize: 16 }}>/10</span>
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 5 }}>Raison</p>
                          <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>{ai.raison}</p>
                        </div>
                      </div>
                      {ai.prochaines_etapes?.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>Prochaines étapes suggérées</p>
                          {ai.prochaines_etapes.map((step, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                              <span style={{ color: '#5B8DBF', fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                              <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{step}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
