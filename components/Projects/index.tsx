"use client"

import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { genId, todayISO } from '../../utils/dates'
import { safeParse } from '../../utils/safeParse'
import { authFetch } from '../../utils/authFetch'
import { confirmDialog } from '../shared/ConfirmDialog'
import PageHeader from '../shared/PageHeader'
import EmptyState from '../shared/EmptyState'
import ProjectForm, { blankProject, type ProjectFormState } from './ProjectForm'
import ProjectCard from './ProjectCard'
import ProjectKanban from './ProjectKanban'
import type { Project, ProjectType, ProjectStatus, ProjectStep } from '@/types'
import { Lightbulb, Target, X } from 'lucide-react'

export default function Projets() {
  const { tasks, setTasks, projects, setProjects } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<ProjectFormState>(blankProject)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [aiError, setAiError] = useState('')
  const [viewTab, setViewTab] = useState<string>('projets')
  const [viewMode, setViewMode] = useState<string>('liste')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newStep, setNewStep] = useState('')

  /* ── CRUD ── */
  const openAdd = (type: ProjectType) => {
    setEditingId(null)
    setForm({ ...blankProject, type })
    setShowForm(true)
  }
  const openEdit = (proj: Project) => {
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
        steps: [], aiAnalysis: null, status: 'En cours' as ProjectStatus,
      }])
    }
    closeForm()
  }

  const del = async (id: string) => {
    const proj = projects.find(p => p.id === id)
    if (!(await confirmDialog(`Supprimer « ${proj?.name ?? 'ce projet'} » ?`, { danger: true }))) return
    setProjects(p => p.filter(x => x.id !== id))
    if (proj) setTasks(prev => prev.map(t => t.project === proj.name ? { ...t, project: '' } : t))
  }

  /* ── Changer statut (kanban) ── */
  const updateStatus = (projId: string, status: ProjectStatus) => {
    setProjects(p => p.map(x => x.id === projId ? { ...x, status } : x))
  }

  /* ── Promouvoir idee → projet ── */
  const promote = (proj: Project) => {
    setProjects(p => p.map(x => x.id === proj.id ? { ...x, type: 'projet' as ProjectType } : x))
  }

  /* ── Steps ── */
  const addStep = (projId: string) => {
    if (!newStep.trim()) return
    setProjects(p => p.map(x => {
      if (x.id !== projId) return x
      const steps = [...(x.steps || []), { id: genId(), text: newStep.trim(), done: false } as ProjectStep]
      return { ...x, steps }
    }))
    setNewStep('')
  }

  const toggleStep = (projId: string, stepId: string) => {
    setProjects(p => p.map(x => {
      if (x.id !== projId) return x
      const steps = (x.steps || []).map(s => s.id === stepId ? { ...s, done: !s.done } : s)
      return { ...x, steps }
    }))
  }

  const delStep = (projId: string, stepId: string) => {
    setProjects(p => p.map(x => {
      if (x.id !== projId) return x
      return { ...x, steps: (x.steps || []).filter(s => s.id !== stepId) }
    }))
  }

  const moveStep = (projId: string, stepId: string, dir: number) => {
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
  const updateNotes = (projId: string, notes: string) => {
    setProjects(p => p.map(x => x.id === projId ? { ...x, notes } : x))
  }

  /* ── Progress ── */
  const calcProgress = (proj: Project) => {
    const steps = proj.steps || []
    const linked = tasks.filter(t => t.project === proj.name)
    const totalItems = steps.length + linked.length
    if (totalItems === 0) return 0
    const doneItems = steps.filter(s => s.done).length + linked.filter(t => t.status === 'Terminé').length
    return Math.round((doneItems / totalItems) * 100)
  }

  /* ── AI Analysis ── */
  const analyzeProject = async (proj: Project) => {
    setAnalyzing(proj.id); setAiError('')
    const linked = tasks.filter(t => t.project === proj.name)
    const steps = proj.steps || []
    const prompt = [
      `Nom du projet : ${proj.name}`,
      `Type : ${proj.type}`,
      `Objectif final : ${proj.objective || 'Non defini'}`,
      `Date cible : ${proj.targetDate || 'Non definie'}`,
      `Notes/Plan : ${proj.notes || 'Aucune'}`,
      `Etapes (${steps.filter(s => s.done).length}/${steps.length} faites) :`,
      steps.length ? steps.map(s => ` ${s.done ? '✓' : '○'} ${s.text}`).join('\n') : ' Aucune',
      `Tâches liées (${linked.filter(t => t.status === 'Terminé').length}/${linked.length} terminées) :`,
      linked.length ? linked.map(t => ` - ${t.name} (${t.status})`).join('\n') : ' Aucune',
    ].join('\n')

    try {
      const res = await authFetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'analyze_project', messages: [{ role: 'user', content: prompt }] }),
      })
      if (!res.ok) throw new Error(`Erreur serveur ${res.status}`)
      const data = await res.json()
      const rawText = (data.content || '').replace(/```json?|```/g, '').trim()
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
      setProjects(p => p.map(x => x.id === proj.id ? { ...x, aiAnalysis: JSON.stringify(analysis) } : x))
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      setAiError(`Erreur IA : ${message}`)
    } finally {
      setAnalyzing(null)
    }
  }

  /* ── Filtrage ── */
  const projetsOnly = projects.filter(p => (p.type || 'projet') === 'projet')
  const ideesOnly = projects.filter(p => p.type === 'idee')
  const currentList = viewTab === 'projets' ? projetsOnly : ideesOnly

  const sorted = [...currentList].sort((a, b) => {
    const aAnalysis = safeParse<{ score_faisabilite?: number } | null>(a.aiAnalysis, null)
    const bAnalysis = safeParse<{ score_faisabilite?: number } | null>(b.aiAnalysis, null)
    const sa = aAnalysis?.score_faisabilite ?? -1
    const sb = bAnalysis?.score_faisabilite ?? -1
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

      {showForm && (
        <ProjectForm form={form} setForm={setForm} editingId={editingId} onSave={saveProject} onCancel={closeForm} />
      )}

      {/* ── Vue KANBAN (projets seulement) ── */}
      {viewTab === 'projets' && viewMode === 'kanban' && (
        <ProjectKanban
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
      : sorted.map(proj => (
        <ProjectCard
          key={proj.id}
          proj={proj}
          tasks={tasks}
          pct={calcProgress(proj)}
          isExpanded={expandedId === proj.id}
          isEditing={editingId === proj.id}
          isAnalyzing={analyzing === proj.id}
          newStep={newStep}
          onToggleExpand={() => setExpandedId(expandedId === proj.id ? null : proj.id)}
          onEdit={() => openEdit(proj)}
          onDelete={() => del(proj.id)}
          onPromote={() => promote(proj)}
          onAnalyze={() => analyzeProject(proj)}
          onNewStepChange={setNewStep}
          onAddStep={() => addStep(proj.id)}
          onToggleStep={stepId => toggleStep(proj.id, stepId)}
          onDelStep={stepId => delStep(proj.id, stepId)}
          onMoveStep={(stepId, dir) => moveStep(proj.id, stepId, dir)}
          onNotesChange={notes => updateNotes(proj.id, notes)}
        />
      )))}
    </div>
  )
}
