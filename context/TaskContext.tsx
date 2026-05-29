"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { Task, Project, Adjustment, PomodoroState, Folder } from '@/types'
import { useLS } from '@/hooks/useLocalStorage'
import { todayISO, nextOccurrenceDate, genId } from '@/utils/dates'

const NOTIF_ICON = '/icons/icon-192.png'

// Seed intelligent : dossiers pré-créés à la 1re ouverture (rénommables/supprimables).
// IDs stables pour rester cohérents entre rechargements tant que non modifiés.
const DEFAULT_FOLDERS: Folder[] = [
  { id: 'seed-ecole',    name: 'École',    color: '#38bdf8', emoji: '🎓', order: 0 },
  { id: 'seed-business', name: 'Business', color: '#a78bfa', emoji: '💼', order: 1 },
  { id: 'seed-perso',    name: 'Perso',    color: '#34d399', emoji: '🏠', order: 2 },
]

interface TaskContextValue {
  tasks: Task[]
  setTasks: (v: Task[] | ((prev: Task[]) => Task[])) => void
  projects: Project[]
  setProjects: (v: Project[] | ((prev: Project[]) => Project[])) => void
  folders: Folder[]
  setFolders: (v: Folder[] | ((prev: Folder[]) => Folder[])) => void
  addFolder: (name: string, color: string, emoji?: string) => void
  updateFolder: (id: string, patch: Partial<Folder>) => void
  deleteFolder: (id: string) => void
  moveFolder: (id: string, dir: -1 | 1) => void
  adjustments: Adjustment[]
  setAdjustments: (v: Adjustment[] | ((prev: Adjustment[]) => Adjustment[])) => void
  pomo: PomodoroState | null
  startPomo: (task: Task) => void
  pausePomo: () => void
  stopPomo: () => void
  donePomo: () => void
}

const TaskContext = createContext<TaskContextValue | null>(null)

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks,       setTasks]       = useLS<Task[]>('pos_tasks',       [])
  const [projects,    setProjects]    = useLS<Project[]>('pos_projects',  [])
  const [folders,     setFolders]     = useLS<Folder[]>('pos_folders',   DEFAULT_FOLDERS)
  const [adjustments, setAdjustments] = useLS<Adjustment[]>('pos_adjustments', [])

  /* ── Dossiers (catégories colorées) — CRUD ── */
  const addFolder = useCallback((name: string, color: string, emoji?: string) => {
    setFolders(prev => [...prev, { id: genId(), name: name.trim(), color, emoji, order: prev.length, createdAt: todayISO() }])
  }, [setFolders])

  const updateFolder = useCallback((id: string, patch: Partial<Folder>) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }, [setFolders])

  // Supprimer un dossier n'efface jamais les tâches : elles repassent « Sans dossier ».
  const deleteFolder = useCallback((id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id))
    setTasks(prev => prev.map(t => t.folderId === id ? { ...t, folderId: undefined } : t))
  }, [setFolders, setTasks])

  const moveFolder = useCallback((id: string, dir: -1 | 1) => {
    setFolders(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const i = sorted.findIndex(f => f.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= sorted.length) return prev
      ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
      return sorted.map((f, idx) => ({ ...f, order: idx }))
    })
  }, [setFolders])

  /* ── Initialisation : réinitialisation des récurrentes + déplacement des retards
        en un seul effet pour éviter la race condition entre les deux passes. ── */
  const didInitRef = useRef(false)
  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true
    const today = todayISO()

    setTasks(prev => {
      // 1) Réinitialise les tâches récurrentes terminées hier ou avant
      const resetRecurring = prev.map(t => {
        if (!t.recurring || t.status !== 'Terminé') return t
        if (t.lastCompletedAt && t.lastCompletedAt < today) {
          const nextDate = nextOccurrenceDate(t, t.lastCompletedAt)
          return { ...t, status: 'À faire' as const, deadline: nextDate, lastCompletedAt: null }
        }
        return t
      })

      // 2) À partir du résultat de l'étape 1, identifie les tâches en retard à déplacer
      const overdue = resetRecurring.filter(t => t.deadline && t.deadline < today && t.status !== 'Terminé' && !t.recurring)
      if (!overdue.length) {
        return resetRecurring.some((t, i) => t !== prev[i]) ? resetRecurring : prev
      }

      const existIds = new Set(adjustments.map(a => a.taskId))
      const news = overdue.filter(t => !existIds.has(t.id))
      if (!news.length) {
        return resetRecurring.some((t, i) => t !== prev[i]) ? resetRecurring : prev
      }

      const idsToRemove = new Set(news.map(t => t.id))
      setAdjustments(adjPrev => [...adjPrev, ...news.map(t => ({
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        taskId: t.id,
        taskName: t.name,
        originalDeadline: t.deadline!,
        reason: 'manque de temps',
        newDate: '',
        originalTask: { ...t },
      }))])

      return resetRecurring.filter(t => !idsToRemove.has(t.id))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Pomodoro ── */
  const [pomo, setPomo] = useState<PomodoroState | null>(null)
  const bellRef = useRef(false)

  useEffect(() => {
    if (!pomo || !pomo.running || pomo.finished) return
    const tick = () => {
      setPomo(prev => {
        if (!prev || !prev.running) return prev
        const left = Math.max(0, Math.round((prev.endTime - Date.now()) / 1000))
        if (left <= 0) return { ...prev, timeLeft: 0, running: false, finished: true }
        return { ...prev, timeLeft: left }
      })
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [pomo?.running, pomo?.finished]) // eslint-disable-line

  // Notification de fin de pomodoro
  useEffect(() => {
    if (!pomo?.finished || bellRef.current) return
    bellRef.current = true
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('⏱ Temps écoulé !', { body: `${pomo.task.name} — bien joué !`, icon: NOTIF_ICON })
    }
  }, [pomo?.finished]) // eslint-disable-line

  const startPomo = useCallback((task: Task) => {
    bellRef.current = false
    const secs = Math.max(task.duration || 25, 1) * 60
    setPomo({ task, total: secs, timeLeft: secs, running: true, finished: false, endTime: Date.now() + secs * 1000 })
    setTasks(prev => prev.map(t =>
      t.id === task.id && t.status === 'À faire' ? { ...t, status: 'En cours' } : t
    ))
  }, [setTasks])

  const pausePomo = () => setPomo(p => {
    if (!p) return null
    if (p.running) {
      const actualLeft = Math.max(0, Math.round((p.endTime - Date.now()) / 1000))
      return { ...p, running: false, timeLeft: actualLeft, pausedTimeLeft: actualLeft }
    }
    const left = p.pausedTimeLeft ?? p.timeLeft
    return { ...p, running: true, timeLeft: left, endTime: Date.now() + left * 1000 }
  })

  const stopPomo = () => setPomo(null)

  const donePomo = () => {
    if (pomo) {
      setTasks(prev => prev.map(t => {
        if (t.id !== pomo.task.id) return t
        if (t.recurring) return { ...t, status: 'Terminé', lastCompletedAt: todayISO() }
        return { ...t, status: 'Terminé' }
      }))
    }
    setPomo(null)
  }

  return (
    <TaskContext.Provider value={{ tasks, setTasks, projects, setProjects, folders, setFolders, addFolder, updateFolder, deleteFolder, moveFolder, adjustments, setAdjustments, pomo, startPomo, pausePomo, stopPomo, donePomo }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTaskContext(): TaskContextValue {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTaskContext doit être utilisé dans <TaskProvider>')
  return ctx
}
