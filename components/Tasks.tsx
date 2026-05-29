"use client"

import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { genId, todayISO, todayDay, fmtDate, daysUntil, nextOccurrenceDate } from '../utils/dates'
import { PRIORITY_ORDER, PRIORITY_COLOR } from '../utils/constants'
import PageHeader from './shared/PageHeader'
import EmptyState from './shared/EmptyState'
import TextImport from './shared/TextImport'
import SwipeRow from './shared/SwipeRow'
import BottomSheet from './shared/BottomSheet'
import FolderManager from './modals/FolderManager'
import { haptic, hapticSuccess } from '../utils/haptics'
import type { Task, TaskStatus, Subtask, Homework, Exam, Folder as TFolder } from '@/types'
import {
  Pencil, X, CheckSquare, Repeat, Clock, Moon, RefreshCw,
  Folder, Calendar, AlertTriangle, Shuffle, Play,
  ChevronUp, ChevronDown, CheckCircle2, Circle, CircleDot, FolderPlus
} from 'lucide-react'

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const JOURS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface TaskForm {
  name: string
  details: string
  project: string
  folderId: string
  priority: string
  durationH: number
  durationM: number
  deadline: string
  taskTime: string
  flexible: boolean
  recurring: boolean
  recurrence: string
  recurrenceDays: string[]
  recurrenceTime: string
  subtasks: { id: string; text: string; done: boolean }[]
}

const blank: TaskForm = {
  name: '', details: '', project: '', folderId: '', priority: 'Important',
  durationH: 0, durationM: 0,
  deadline: '', taskTime: '', flexible: false,
  recurring: false, recurrence: 'daily', recurrenceDays: [] as string[], recurrenceTime: '',
  subtasks: [],
}

const formatDur = (mins: number) => {
  if (!mins || mins <= 0) return null
  const h = Math.floor(mins / 60), m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

export default function Taches() {
  const { tasks, setTasks, adjustments, setAdjustments, pomo, startPomo, devoirs, setDevoirs, examens, setExamens, projects,
    folders, addFolder, updateFolder, deleteFolder, moveFolder } = useApp()
  const sortedFolders = [...(folders || [])].sort((a, b) => a.order - b.order)
  const folderById = (id?: string) => (id ? (folders || []).find(f => f.id === id) : undefined)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [showForm,  setShowForm]  = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [form, setForm] = useState<TaskForm>(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fStatus,   setFStatus]   = useState('Tous')
  const [fPriority, setFPriority] = useState('Tous')
  const [fDate,     setFDate]     = useState("Aujourd'hui")
  const [fProject,  setFProject]  = useState('Tous')
  const [fFolder,   setFFolder]   = useState('Tous')  // 'Tous' | folderId | 'none'
  const [folderMgrOpen, setFolderMgrOpen] = useState(false)
  const [showDone,  setShowDone]  = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [snoozeForId, setSnoozeForId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const projectNames = projects ? [...new Set(projects.map(p => p.name).filter(Boolean))] : []

  const today = todayISO()
  const dayName = todayDay()
  const weekEnd = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0] })()
  const monthEnd = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().split('T')[0] })()

  // Est-ce qu'une tâche récurrente est prévue pour aujourd'hui ?
  const recurringDueToday = (t: Task) => {
    if (!t.recurring) return false
    if (t.recurrence === 'daily') return true
    if (t.recurrence === 'weekly') return (t.recurrenceDays || []).includes(dayName)
    if (t.recurrence === 'monthly') return t.deadline === today
    return false
  }

  const openAdd  = () => { setEditingId(null); setForm({ ...blank, deadline: todayISO(), folderId: fFolder !== 'Tous' && fFolder !== 'none' ? fFolder : '' }); setShowDetails(false); setShowForm(true) }
  const openEdit = (task: Task) => {
    setEditingId(task.id)
    setForm({
      name: task.name, details: task.details || '', project: task.project || '', folderId: task.folderId || '', priority: task.priority || 'Important',
      durationH: Math.floor((task.duration || 0) / 60),
      durationM: (task.duration || 0) % 60,
      deadline: task.deadline || '', flexible: !!task.flexible,
      recurring: !!task.recurring, recurrence: task.recurrence || 'daily',
      taskTime: task.taskTime || '',
      recurrenceDays: task.recurrenceDays || [], recurrenceTime: task.recurrenceTime || '',
      subtasks: (task.subtasks || []).map(s => ({ id: s.id, text: s.text || s.title || '', done: s.done })),
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const closeForm = () => { setShowForm(false); setEditingId(null); setForm(blank) }

  const toggleDay = (day: string) => {
    const days = form.recurrenceDays.includes(day)
      ? form.recurrenceDays.filter((d: string) => d !== day)
      : [...form.recurrenceDays, day]
    setForm({ ...form, recurrenceDays: days })
  }

  const saveTask = () => {
    if (!form.name.trim()) return
    const duration = form.durationH * 60 + form.durationM
    const deadline = form.recurring && !form.deadline ? todayISO() : form.deadline
    const folderId = form.folderId || undefined
    if (editingId) {
      setTasks(p => p.map(t => t.id === editingId ? { ...t, ...form, duration, deadline, folderId } : t))
    } else {
      setTasks(p => [...p, { ...form, duration, deadline, folderId, id: genId(), status: 'À faire' as TaskStatus, createdAt: todayISO(), lastCompletedAt: null }])
    }
    closeForm()
  }

  // Sous-taches dans le formulaire
  const addSubtaskToForm = (title: string) => {
    if (!title.trim()) return
    setForm(f => ({ ...f, subtasks: [...(f.subtasks || []), { id: genId(), text: title.trim(), done: false }] }))
  }
  const removeSubtaskFromForm = (sid: string) => {
    setForm(f => ({ ...f, subtasks: (f.subtasks || []).filter(s => s.id !== sid) }))
  }

  // Sous-taches sur une tache existante (toggle done)
  const toggleSubtask = (taskId: string, sid: string) => setTasks(p => p.map(t => {
    if (t.id !== taskId) return t
    return { ...t, subtasks: (t.subtasks || []).map(s => s.id === sid ? { ...s, done: !s.done } : s) }
  }))

  // Snooze : repousser la deadline de N jours a partir d'aujourd'hui
  const snoozeTask = (taskId: string, days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days)
    const newDeadline = d.toISOString().split('T')[0]
    setTasks(p => p.map(t => t.id === taskId ? { ...t, deadline: newDeadline } : t))
  }

  const cycleStatus = (id: string) => {
    haptic(8)
    setTasks(p => p.map(t => {
      if (t.id !== id) return t
      const transitions: Record<string, TaskStatus> = { 'À faire': 'En cours', 'En cours': 'Terminé', 'Terminé': 'À faire' }
      const next = transitions[t.status] ?? 'À faire'
      if (next === 'Terminé') {
        hapticSuccess()
        if (t.recurring) return { ...t, status: 'Terminé' as TaskStatus, lastCompletedAt: todayISO() }
      }
      return { ...t, status: next }
    }))
  }

  // Valide directement une tâche (swipe droite) — ne cycle pas
  const completeTask = (id: string) => setTasks(p => p.map(t => {
    if (t.id !== id || t.status === 'Terminé') return t
    if (t.recurring) return { ...t, status: 'Terminé' as TaskStatus, lastCompletedAt: todayISO() }
    return { ...t, status: 'Terminé' as TaskStatus }
  }))

  const del      = (id: string) => setTasks(p => p.filter(t => t.id !== id))
  const toAdjust = (task: Task) => {
    setTasks(p => p.filter(t => t.id !== task.id))
    setAdjustments(p => [...p, {
      id: genId(), taskId: task.id, taskName: task.name,
      originalDeadline: task.deadline ?? '', reason: 'autre', newDate: '', originalTask: { ...task }
    }])
  }

  // Date filter helper
  const matchDate = (t: Task) => {
    if (fDate === 'Tout') return true
    if (!t.deadline && !t.recurring) return fDate === 'Tout'
    const dl = t.deadline || ''
    if (fDate === "Aujourd'hui") {
      if (t.recurring) return recurringDueToday(t) && t.status !== 'Terminé'
      return dl === today
    }
    if (fDate === 'Semaine') return dl <= weekEnd || (t.recurring && t.status !== 'Terminé')
    if (fDate === 'Mois') return dl <= monthEnd || (t.recurring && t.status !== 'Terminé')
    return true
  }

  const filtered = tasks
    .filter(t => fStatus === 'Tous' || t.status === fStatus)
    .filter(t => fPriority === 'Tous' || t.priority === fPriority)
    .filter(t => fProject === 'Tous' || t.project === fProject)
    .filter(t => fFolder === 'Tous' || (fFolder === 'none' ? !t.folderId : t.folderId === fFolder))
    .filter(matchDate)

  // Compteurs par dossier (sur les tâches actives, hors filtre dossier courant)
  const folderActiveCount = (fid: string) => tasks.filter(t =>
    t.status !== 'Terminé' && (fid === 'none' ? !t.folderId : t.folderId === fid)
  ).length

  // Separate done vs active
  const activeTasks = filtered.filter(t => t.status !== 'Terminé')
  const doneTasks = filtered.filter(t => t.status === 'Terminé')

  // Sort active by urgency: overdue first, then soonest deadline, then no deadline
  const sortByUrgency = (a: Task, b: Task) => {
    const da = a.deadline || '9999-99-99'
    const db = b.deadline || '9999-99-99'
    return da.localeCompare(db)
  }
  activeTasks.sort(sortByUrgency)

  const grouped: Record<string, Task[]> = { Critique: [], Important: [], Optionnel: [] }
  activeTasks.forEach(t => (grouped[t.priority ?? 'Important'] ||= []).push(t))

  const doneGrouped: Record<string, Task[]> = { Critique: [], Important: [], Optionnel: [] }
  doneTasks.forEach(t => (doneGrouped[t.priority ?? 'Important'] ||= []).push(t))

  // Counters
  const countCritique = activeTasks.filter(t => t.priority === 'Critique').length
  const countImportant = activeTasks.filter(t => t.priority === 'Important').length
  const countOptionnel = activeTasks.filter(t => t.priority === 'Optionnel').length

  const handleImport = ({ taches, devoirs: newDevoirs, examens: newExamens }: { taches: Task[]; devoirs: Homework[]; examens: Exam[] }) => {
    if (taches.length > 0) setTasks(p => [...p, ...taches])
    if (newDevoirs.length > 0 && setDevoirs) setDevoirs(p => [...p, ...newDevoirs])
    if (newExamens.length > 0 && setExamens) setExamens(p => [...p, ...newExamens])
  }

  // ── Ajout rapide ──
  const [quickName, setQuickName] = useState('')
  const quickRef = useRef<HTMLInputElement>(null)

  const quickAdd = () => {
    const name = quickName.trim()
    if (!name) return
    setTasks(prev => [...prev, {
      id: genId(), name, details: '', project: '',
      folderId: fFolder !== 'Tous' && fFolder !== 'none' ? fFolder : undefined,
      priority: 'Important', duration: 0,
      deadline: todayISO(), flexible: false, status: 'À faire' as TaskStatus,
      recurring: false, recurrence: 'daily', recurrenceDays: [], recurrenceTime: '',
      createdAt: todayISO(), lastCompletedAt: null, subtasks: [],
    }])
    setQuickName('')
    quickRef.current?.focus()
  }

  return (
    <div>
      <PageHeader title="Tâches" action={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setShowImport(true)}
            style={{ fontSize: 12, padding: '7px 12px', border: '1px solid rgba(56,189,248,.25)' }}>
            Import IA
          </button>
          <button className="btn-gold" onClick={openAdd} style={{ fontSize: 12, padding: '7px 14px' }}>
            + Détails
          </button>
        </div>
      } />

      {/* ── Barre d'ajout rapide ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={quickRef}
            value={quickName}
            onChange={e => setQuickName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') quickAdd() }}
            placeholder="Ajouter une tâche... (Entrée pour valider)"
            style={{ paddingRight: 44, borderColor: quickName ? 'var(--accent-1)' : undefined }}
          />
          {quickName && (
            <button onClick={quickAdd}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                fontSize: 18, fontWeight: 700 }}>
              ↵
            </button>
          )}
        </div>
      </div>

      {/* ── Barre de dossiers (catégories colorées) ── */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto',
        WebkitOverflowScrolling: 'touch', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none' }}>
        <button className={`filter-pill${fFolder === 'Tous' ? ' active' : ''}`}
          onClick={() => setFFolder('Tous')} style={{ flexShrink: 0 }}>
          Tout <span style={{ opacity: .6 }}>({tasks.filter(t => t.status !== 'Terminé').length})</span>
        </button>
        {sortedFolders.map(f => {
          const active = fFolder === f.id
          return (
            <button key={f.id} onClick={() => setFFolder(f.id)} className="filter-pill"
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: active ? `${f.color}1f` : undefined,
                borderColor: active ? f.color : undefined,
                color: active ? f.color : undefined, fontWeight: active ? 700 : undefined }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0,
                boxShadow: active ? `0 0 6px ${f.color}` : 'none' }} />
              {f.emoji && <span>{f.emoji}</span>}{f.name} <span style={{ opacity: .6 }}>({folderActiveCount(f.id)})</span>
            </button>
          )
        })}
        {folderActiveCount('none') > 0 && (
          <button onClick={() => setFFolder('none')}
            className={`filter-pill${fFolder === 'none' ? ' active' : ''}`} style={{ flexShrink: 0 }}>
            Sans dossier <span style={{ opacity: .6 }}>({folderActiveCount('none')})</span>
          </button>
        )}
        <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0, margin: '0 4px' }} />
        <button onClick={() => setFolderMgrOpen(true)} className="filter-pill"
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5 }} title="Gérer les dossiers">
          <FolderPlus size={13} /> Gérer
        </button>
      </div>

      {/* ── Formulaire ── */}
      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(91,141,191,.3)' }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            {editingId && <Pencil size={16} />}
            {editingId ? 'Modifier la tâche' : 'Nouvelle tâche'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="grid-2">
            <div style={{ gridColumn: '1/-1' }}>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Nom de la tâche *" autoFocus />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              {(showDetails || form.details) ? (
                <textarea value={form.details} onChange={e => setForm({ ...form, details: e.target.value })}
                  placeholder="Note (contexte, rappel, où, pourquoi...)"
                  rows={2} style={{ resize: 'vertical', minHeight: 44 }} autoFocus />
              ) : (
                <button type="button" className="btn-ghost"
                  onClick={() => setShowDetails(true)}
                  style={{ width: '100%', fontSize: 12, padding: '8px 12px', textAlign: 'left',
                    color: 'var(--muted)' }}>
                  + Ajouter une note
                </button>
              )}
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckSquare size={13} /> Sous-tâches (optionnel)
              </p>
              {(form.subtasks || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {form.subtasks.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                      background: 'var(--surface-deep)', padding: '6px 10px', borderRadius: 6 }}>
                      <span style={{ flex: 1, fontSize: 13 }}>{s.text}</span>
                      <button type="button" className="btn-icon" onClick={() => removeSubtaskFromForm(s.id)} title="Retirer"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtaskToForm(newSubtask); setNewSubtask('') } }}
                  placeholder="Ajouter une sous-tâche puis Entrée" style={{ flex: 1 }} />
                <button type="button" className="btn-ghost"
                  onClick={() => { addSubtaskToForm(newSubtask); setNewSubtask('') }}
                  disabled={!newSubtask.trim()}>+ Ajouter</button>
              </div>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Folder size={13} /> Dossier
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setForm({ ...form, folderId: '' })}
                  className={`filter-pill${!form.folderId ? ' active' : ''}`}>Aucun</button>
                {sortedFolders.map(f => {
                  const active = form.folderId === f.id
                  return (
                    <button key={f.id} type="button" onClick={() => setForm({ ...form, folderId: f.id })}
                      className="filter-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: active ? `${f.color}1f` : undefined, borderColor: active ? f.color : undefined,
                        color: active ? f.color : undefined, fontWeight: active ? 700 : undefined }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color }} />
                      {f.emoji && <span>{f.emoji}</span>}{f.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <select value={form.project} onChange={e => setForm({ ...form, project: e.target.value })}>
              <option value="">— Aucun projet —</option>
              {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
              <option value="Critique">● Critique</option>
              <option value="Important">● Important</option>
              <option value="Optionnel">○ Optionnel</option>
            </select>

            {/* Durée heures + minutes */}
            <div style={{ gridColumn: '1/-1' }}>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} /> Durée estimée
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="number" value={form.durationH} min={0} max={23} inputMode="numeric"
                  onChange={e => setForm({ ...form, durationH: Math.max(0, +e.target.value) })}
                  style={{ width: 72 }} />
                <span style={{ color: 'var(--muted)', fontSize: 14, whiteSpace: 'nowrap' }}>h</span>
                <input type="number" value={form.durationM} min={0} max={59} step={5} inputMode="numeric"
                  onChange={e => setForm({ ...form, durationM: Math.max(0, +e.target.value) })}
                  style={{ width: 72 }} />
                <span style={{ color: 'var(--muted)', fontSize: 14, whiteSpace: 'nowrap' }}>min</span>
                <span style={{ fontSize: 13, color: '#5B8DBF', marginLeft: 4 }}>
                  {formatDur(form.durationH * 60 + form.durationM) || '—'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input type="date" value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })} />
              <input type="time" value={form.taskTime}
                onChange={e => setForm({ ...form, taskTime: e.target.value })}
                placeholder="Heure (optionnel)"
                title="Heure de la tâche — une notif sonnera à cette heure si les notifications sont activées" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 14, cursor: 'pointer',
              background: 'var(--surface-deep)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '9px 12px' }}>
              <input type="checkbox" checked={form.flexible}
                onChange={e => setForm({ ...form, flexible: e.target.checked })}
                style={{ width: 'auto', accentColor: '#5B8DBF' }} />
              Tâche flexible
            </label>

            {/* Récurrence */}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 14, cursor: 'pointer',
                background: 'var(--surface-deep)', border: '1px solid var(--input-border)', borderRadius: 8, padding: '9px 12px',
                marginBottom: form.recurring ? 10 : 0 }}>
                <input type="checkbox" checked={form.recurring}
                  onChange={e => setForm({ ...form, recurring: e.target.checked })}
                  style={{ width: 'auto', accentColor: '#5B8DBF' }} />
                <Repeat size={14} /> Tâche récurrente (se répète automatiquement)
              </label>

              {form.recurring && (
                <div style={{ background: 'rgba(91,141,191,.05)', border: '1px solid rgba(91,141,191,.2)', borderRadius: 8, padding: 14 }}>
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Fréquence</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[{ val: 'daily', label: 'Quotidien' }, { val: 'weekly', label: 'Hebdomadaire' }, { val: 'monthly', label: 'Mensuel' }]
                        .map(opt => (
                          <button key={opt.val} type="button" onClick={() => setForm({ ...form, recurrence: opt.val })}
                            style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', border: 'none',
                              background: form.recurrence === opt.val ? '#5B8DBF' : 'var(--hover-bg)',
                              color: form.recurrence === opt.val ? 'var(--bg)' : 'var(--muted)',
                              fontWeight: form.recurrence === opt.val ? 700 : 400 }}>
                            {opt.label}
                          </button>
                        ))}
                    </div>
                  </div>

                  {form.recurrence === 'weekly' && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Jours</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {JOURS.map((jour, i) => (
                          <button key={jour} type="button" onClick={() => toggleDay(jour)}
                            style={{ width: 38, height: 38, borderRadius: '50%', fontSize: 11, cursor: 'pointer', border: 'none',
                              background: form.recurrenceDays.includes(jour) ? '#5B8DBF' : 'var(--hover-bg)',
                              color: form.recurrenceDays.includes(jour) ? 'var(--bg)' : 'var(--muted)',
                              fontWeight: form.recurrenceDays.includes(jour) ? 700 : 400 }}>
                            {JOURS_SHORT[i]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Heure prévue (optionnel)</p>
                    <input type="time" value={form.recurrenceTime}
                      onChange={e => setForm({ ...form, recurrenceTime: e.target.value })}
                      style={{ width: 'auto' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="btn-gold" onClick={saveTask}>{editingId ? 'Enregistrer' : 'Ajouter'}</button>
            <button className="btn-ghost" onClick={closeForm}>Annuler</button>
          </div>
        </div>
      )}

      {/* ── Filtres : 1 ligne scrollable + bouton "Filtres avancés" ── */}
      {(() => {
        const advCount = (fStatus !== 'Tous' ? 1 : 0) + (fPriority !== 'Tous' ? 1 : 0) + (fProject !== 'Tous' ? 1 : 0)
        return (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', gap: 6, alignItems: 'center',
              overflowX: 'auto', WebkitOverflowScrolling: 'touch',
              paddingBottom: 4,
              scrollbarWidth: 'none',
            }}>
              {["Aujourd'hui", 'Semaine', 'Mois', 'Tout'].map(d => (
                <button key={d} className={`filter-pill${fDate === d ? ' active' : ''}`}
                  onClick={() => setFDate(d)}
                  style={{ flexShrink: 0 }}>
                  {d}
                </button>
              ))}
              <div style={{ width: 1, height: 18, background: 'var(--border)', flexShrink: 0, margin: '0 4px' }} />
              <button onClick={() => setFiltersOpen(true)}
                className={`filter-pill${advCount > 0 ? ' active' : ''}`}
                style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Filtres
                {advCount > 0 && (
                  <span style={{
                    background: 'rgba(11,18,32,0.25)', color: '#fff',
                    borderRadius: 999, fontSize: 10, padding: '1px 6px', fontWeight: 700,
                  }}>{advCount}</span>
                )}
              </button>
            </div>
            {/* Compteurs */}
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', marginTop: 10, flexWrap: 'wrap' }}>
              <span>{activeTasks.length} active{activeTasks.length !== 1 ? 's' : ''}</span>
              {countCritique > 0 && <span style={{ color: '#f87171' }}>{countCritique} critique{countCritique > 1 ? 's' : ''}</span>}
              {countImportant > 0 && <span style={{ color: '#5B8DBF' }}>{countImportant} important{countImportant > 1 ? 'es' : 'e'}</span>}
              {countOptionnel > 0 && <span style={{ color: 'var(--muted)' }}>{countOptionnel} optionnel{countOptionnel > 1 ? 'les' : 'le'}</span>}
              {doneTasks.length > 0 && <span style={{ color: '#4ade80' }}>{doneTasks.length} terminee{doneTasks.length > 1 ? 's' : ''}</span>}
            </div>
          </div>
        )
      })()}

      {/* ── BottomSheet filtres avancés ── */}
      <BottomSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtres avancés">
        <div style={{ padding: '4px 4px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>Statut</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Tous', 'À faire', 'En cours'].map(s => (
                <button key={s} className={`filter-pill${fStatus === s ? ' active' : ''}`}
                  onClick={() => setFStatus(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>Priorité</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Tous', 'Critique', 'Important', 'Optionnel'].map(p => (
                <button key={p} className={`filter-pill${fPriority === p ? ' active' : ''}`}
                  onClick={() => setFPriority(p)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {PRIORITY_COLOR[p] && (
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLOR[p], flexShrink: 0 }} />
                  )}
                  {p}
                </button>
              ))}
            </div>
          </div>
          {projectNames.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>Projet</p>
              <select value={fProject} onChange={e => setFProject(e.target.value)} style={{ width: '100%' }}>
                <option value="Tous">Tous les projets</option>
                {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn-ghost"
              onClick={() => { setFStatus('Tous'); setFPriority('Tous'); setFProject('Tous') }}
              style={{ flex: 1 }}>
              Réinitialiser
            </button>
            <button className="btn-gold" onClick={() => setFiltersOpen(false)} style={{ flex: 1 }}>
              Appliquer
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* ── Liste active ── */}
      {activeTasks.length === 0 && doneTasks.length === 0
        ? <EmptyState mark="rings" tone="accent"
            title="Rien à faire. Profite — ou ajoute quelque chose."
            subtitle="« + Nouvelle tâche » pour commencer." />
        : <>
          {activeTasks.length === 0 && !showDone
            ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 14 }}>
                Toutes les taches sont terminees pour cette periode !
              </div>
            : Object.entries(grouped).map(([priority, list]) => list.length === 0 ? null : (
              <div key={priority} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLOR[priority], flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 12, color: PRIORITY_COLOR[priority],
                    textTransform: 'uppercase', letterSpacing: 1 }}>{priority}</span>
                  <span style={{ background: 'var(--hover-bg)', color: 'var(--muted)', borderRadius: '50%', width: 20, height: 20,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{list.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {list.map(t => (
                    <TaskRow key={t.id} task={t} folder={folderById(t.folderId)}
                      cycleStatus={cycleStatus} del={del} toAdjust={toAdjust}
                      onComplete={completeTask}
                      onEdit={openEdit} isEditing={editingId === t.id}
                      onPomo={startPomo}
                      isRunning={pomo?.task?.id === t.id}
                      expanded={expandedTaskId === t.id}
                      onToggleExpand={() => setExpandedTaskId(id => id === t.id ? null : t.id)}
                      onToggleSubtask={(sid) => toggleSubtask(t.id, sid)}
                      snoozeOpen={snoozeForId === t.id}
                      onOpenSnooze={() => setSnoozeForId(id => id === t.id ? null : t.id)}
                      onSnooze={(days) => { snoozeTask(t.id, days); setSnoozeForId(null) }}
                      isMobile={isMobile} />
                  ))}
                </div>
              </div>
            ))
          }

          {/* ── Taches terminees (cachees par defaut) ── */}
          {doneTasks.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <button className="btn-ghost" onClick={() => setShowDone(s => !s)}
                style={{ width: '100%', fontSize: 13, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {showDone ? <><ChevronUp size={14} /> Masquer</> : <><ChevronDown size={14} /> Voir</>} les taches terminees ({doneTasks.length})
              </button>
              {showDone && (
                <div style={{ marginTop: 14, opacity: .75 }}>
                  {Object.entries(doneGrouped).map(([priority, list]) => list.length === 0 ? null : (
                    <div key={`done-${priority}`} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} /> {priority} ({list.length})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {list.map(t => (
                          <TaskRow key={t.id} task={t} folder={folderById(t.folderId)}
                            cycleStatus={cycleStatus} del={del} toAdjust={toAdjust}
                            onEdit={openEdit} isEditing={editingId === t.id}
                            onPomo={startPomo}
                            isRunning={pomo?.task?.id === t.id} 
                      isMobile={isMobile}/>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      }

      {showImport && (
        <TextImport onImport={handleImport} onClose={() => setShowImport(false)} />
      )}

      {folderMgrOpen && (
        <FolderManager
          folders={folders || []}
          onAdd={addFolder}
          onUpdate={updateFolder}
          onDelete={deleteFolder}
          onMove={moveFolder}
          onClose={() => setFolderMgrOpen(false)}
        />
      )}
    </div>
  )
}

function recurringLabel(task: Task) {
  if (!task.recurring) return null
  if (task.recurrence === 'daily')   return 'Quotidien'
  if (task.recurrence === 'monthly') return 'Mensuel'
  if (task.recurrence === 'weekly') {
    const short: Record<string, string> = { Lundi:'Lun', Mardi:'Mar', Mercredi:'Mer', Jeudi:'Jeu', Vendredi:'Ven', Samedi:'Sam', Dimanche:'Dim' }
    const days  = (task.recurrenceDays || []).map(d => short[d]).join(', ')
    return days ? `Chaque ${days}` : 'Hebdo'
  }
  return ''
}

interface TaskRowProps {
  task: Task
  folder?: TFolder
  cycleStatus: (id: string) => void
  del: (id: string) => void
  toAdjust: (task: Task) => void
  onComplete?: (id: string) => void
  onEdit: (task: Task) => void
  isEditing: boolean
  onPomo: (task: Task) => void
  isRunning: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  onToggleSubtask?: (sid: string) => void
  snoozeOpen?: boolean
  onOpenSnooze?: () => void
  onSnooze?: (days: number) => void
  isMobile?: boolean
}

function TaskRow({ task, folder, cycleStatus, del, toAdjust, onComplete, onEdit, isEditing, onPomo, isRunning,
  expanded, onToggleExpand, onToggleSubtask,
  snoozeOpen, onOpenSnooze, onSnooze, isMobile = false }: TaskRowProps) {
  const due         = daysUntil(task.deadline)
  const overdue     = due < 0
  const urgent      = due >= 0 && due <= 2
  const canPomo     = task.status !== 'Terminé'
  const statusIconMap: Record<string, React.ReactElement> = {
    'À faire':  <Circle size={17} style={{ color: 'var(--muted)' }} />,
    'En cours': <CircleDot size={17} style={{ color: '#60a5fa' }} />,
    'Terminé':  <CheckCircle2 size={17} style={{ color: '#4ade80' }} />,
  }
  const statusIcon  = statusIconMap[task.status]
  const statusBgMap: Record<string, string> = { 'À faire': 'var(--status-idle-bg)', 'En cours': 'rgba(59,130,246,.15)', 'Terminé': 'rgba(34,197,94,.15)' }
  const statusBg    = statusBgMap[task.status]
  const statusColorMap: Record<string, string> = { 'À faire': 'var(--muted)', 'En cours': '#60a5fa', 'Terminé': '#4ade80' }
  const statusColor = statusColorMap[task.status]
  const nextDate    = task.recurring && task.status === 'Terminé' ? nextOccurrenceDate(task, task.lastCompletedAt) : null
  const durLabel    = formatDur(task.duration ?? 0)
  const subs        = task.subtasks || []
  const subsDone    = subs.filter(s => s.done).length
  const canSnooze   = !task.recurring && task.status !== 'Terminé'

  const isDone = task.status === 'Terminé'

  return (
    <SwipeRow
      disabled={isDone}
      onSwipeRight={onComplete ? () => onComplete(task.id) : undefined}
      onSwipeLeft={() => del(task.id)}
      rightLabel="Terminer"
      leftLabel="Supprimer"
    >
    <div className={`task-card${isDone ? ' done' : ''}`}
      style={{
        borderLeft: `3px solid ${isEditing ? '#5B8DBF' : isRunning ? '#f97316' : isDone ? '#4ade80' : folder ? folder.color : task.recurring ? 'rgba(91,141,191,.4)' : 'transparent'}`,
        background: isEditing ? 'rgba(91,141,191,.04)' : isRunning ? 'rgba(249,115,22,.04)' : undefined,
        flexWrap: 'wrap'
      }}>

      {/* Sur desktop : bouton statut visible. Sur mobile : remplacé par swipe droit */}
      {!isMobile && (
        <button className="status-btn" onClick={() => cycleStatus(task.id)}
          style={{ background: statusBg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          title="Changer statut">
          {statusIcon}
        </button>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, margin: 0, textDecoration: task.status === 'Terminé' ? 'line-through' : 'none',
          color: task.status === 'Terminé' ? 'var(--muted)' : 'var(--text)',
          wordBreak: 'break-word', overflowWrap: 'break-word' }}>
          {task.recurring && <Repeat size={12} style={{ marginRight: 5, display: 'inline', verticalAlign: 'middle' }} />}
          {task.name}
        </p>
        {task.details && (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 0', lineHeight: 1.5,
            whiteSpace: 'pre-line' }}>
            {task.details}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          {folder && (
            <span style={{ fontSize: 11, color: folder.color, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: folder.color, flexShrink: 0 }} />
              {folder.emoji && <span>{folder.emoji}</span>}{folder.name}
            </span>
          )}
          {task.project        && <span style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Folder size={11} /> {task.project}</span>}
          {durLabel            && <span style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {durLabel}</span>}
          {task.taskTime && !task.recurring && <span style={{ fontSize: 11, color: 'var(--accent-1)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {task.taskTime}</span>}
          {task.recurrenceTime && <span style={{ fontSize: 11, color: '#5B8DBF', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> {task.recurrenceTime}</span>}
          {task.recurring      && <span style={{ fontSize: 11, color: 'rgba(91,141,191,.8)' }}>{recurringLabel(task)}</span>}
          {task.deadline && !task.recurring && (
            <span style={{ fontSize: 11, color: overdue ? '#f87171' : urgent ? '#5B8DBF' : 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {overdue ? <><AlertTriangle size={11} /> Retard :</> : <Calendar size={11} />} {fmtDate(task.deadline)}
            </span>
          )}
          {nextDate  && <span style={{ fontSize: 11, color: '#4ade80', display: 'inline-flex', alignItems: 'center', gap: 4 }}><RefreshCw size={11} /> Reprend le {fmtDate(nextDate)}</span>}
          {task.flexible && <span style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Shuffle size={11} /> Flexible</span>}
          {subs.length > 0 && (
            <button onClick={onToggleExpand} type="button"
              style={{ fontSize: 11, color: subsDone === subs.length ? '#4ade80' : '#5B8DBF',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4 }}
              title={expanded ? 'Masquer' : 'Voir'}>
              <CheckSquare size={11} /> {subsDone}/{subs.length} {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
          {isRunning && <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>🍅 Timer en cours…</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {canPomo && (
          <button onClick={() => onPomo(task)} title="Démarrer un timer"
            style={{ background: isRunning ? 'rgba(249,115,22,.2)' : 'rgba(91,141,191,.1)',
              border: `1px solid ${isRunning ? 'rgba(249,115,22,.4)' : 'rgba(91,141,191,.3)'}`,
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 13,
              color: isRunning ? '#f97316' : '#5B8DBF', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center' }}>
            {isRunning ? <Clock size={14} /> : <Play size={14} />}
          </button>
        )}
        <span className="task-status-badge" style={{ background: statusBg, color: statusColor, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {task.status}
        </span>
        {canSnooze && (
          <div className="task-action-secondary" style={{ position: 'relative' }}>
            <button className="btn-icon" title="Repousser" onClick={onOpenSnooze}
              style={{ color: snoozeOpen ? '#5B8DBF' : undefined }}><Moon size={15} /></button>
            {snoozeOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50,
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                padding: 6, boxShadow: '0 4px 16px rgba(0,0,0,.25)', minWidth: 140,
                display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { label: 'Demain', days: 1 },
                  { label: 'Dans 3 jours', days: 3 },
                  { label: 'Semaine prochaine', days: 7 },
                ].map(opt => (
                  <button key={opt.days} onClick={() => onSnooze?.(opt.days)} type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px',
                      borderRadius: 6, fontSize: 12, textAlign: 'left', color: 'var(--text)',
                      fontFamily: 'DM Sans' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button className="btn-icon" title="Modifier" onClick={() => onEdit(task)}
          style={{ color: isEditing ? '#5B8DBF' : undefined }}><Pencil size={15} /></button>
        {!task.recurring && (
          <button className="btn-icon task-action-secondary" title="Déplacer en ajustements" onClick={() => toAdjust(task)}><RefreshCw size={15} /></button>
        )}
        {/* Sur desktop : bouton supprimer visible. Sur mobile : remplacé par swipe gauche */}
        {!isMobile && (
          <button className="btn-icon" title="Supprimer" onClick={() => del(task.id)}><X size={15} /></button>
        )}
      </div>

      {expanded && subs.length > 0 && (
        <div style={{ flexBasis: '100%', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 6 }}>
          {subs.map(s => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              fontSize: 13, color: s.done ? 'var(--muted)' : 'var(--text)',
              textDecoration: s.done ? 'line-through' : 'none' }}>
              <input type="checkbox" checked={s.done} onChange={() => onToggleSubtask?.(s.id)}
                style={{ width: 'auto', accentColor: '#5B8DBF' }} />
              {s.text}
            </label>
          ))}
        </div>
      )}
    </div>
    </SwipeRow>
  )
}
