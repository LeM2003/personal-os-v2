"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { Task, Project, Adjustment, PomodoroState, Folder } from '@/types'
import { useLS } from '@/hooks/useLocalStorage'
import { useSyncedCollection } from '@/hooks/useSyncedCollection'
import { todayISO, nextOccurrenceDate, genId } from '@/utils/dates'
import { taskToRow, rowToTask, folderToRow, rowToFolder, projectToRow, rowToProject } from '@/lib/supabase/mappers'
import { showNotif } from '@/utils/notifications'

// Seed intelligent : dossiers pré-créés à la 1re ouverture (rénommables/supprimables).
// IDs stables (UUID, requis par la colonne `folders.id`) pour rester cohérents
// entre rechargements tant que non modifiés.
const DEFAULT_FOLDERS: Folder[] = [
  { id: '650a63cb-cc79-4ea9-b844-1e904c567d21', name: 'École',    color: '#38bdf8', emoji: '🎓', order: 0 },
  { id: '828acba7-88e2-463a-b488-5d17c1f1996e', name: 'Business', color: '#a78bfa', emoji: '💼', order: 1 },
  { id: 'fa70e880-d869-4640-baba-1cc12abb9cd3', name: 'Perso',    color: '#34d399', emoji: '🏠', order: 2 },
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
  // Collections synchronisées via le moteur unifié (pull/push différentiel/delete/anti-race)
  const [tasks, setTasks] = useSyncedCollection<Task>({
    storageKey: 'pos_tasks', table: 'tasks', toRow: taskToRow, fromRow: rowToTask,
    getId: t => t.id, defaultValue: [], orderBy: { column: 'created_at' },
  })
  const [folders, setFolders] = useSyncedCollection<Folder>({
    storageKey: 'pos_folders', table: 'folders', toRow: folderToRow, fromRow: rowToFolder,
    getId: f => f.id, defaultValue: DEFAULT_FOLDERS, orderBy: { column: 'position' },
  })
  const [projects, setProjects] = useSyncedCollection<Project>({
    storageKey: 'pos_projects', table: 'projects', toRow: projectToRow, fromRow: rowToProject,
    getId: p => p.id, defaultValue: [], orderBy: { column: 'created_at' },
  })
  const [adjustments, setAdjustments] = useLS<Adjustment[]>('pos_adjustments', [])

  /* ── Dossiers (catégories colorées) — CRUD ── */
  const addFolder = useCallback((name: string, color: string, emoji?: string) => {
    setFolders(prev => [...prev, { id: genId(), name: name.trim(), color, emoji, order: prev.length, createdAt: todayISO() }])
  }, [setFolders])

  const updateFolder = useCallback((id: string, patch: Partial<Folder>) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }, [setFolders])

  // Supprimer un dossier n'efface jamais les tâches : elles repassent « Sans dossier ».
  // Le moteur de sync propage automatiquement la suppression (delete différentiel).
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

  /* ── Réinitialisation des récurrentes + déplacement des retards.
        Rejoué à chaque changement de `tasks` (idempotent — se stabilise dès
        qu'il n'y a plus rien à réinitialiser) : le pull Supabase remplace
        l'état APRÈS le montage et réintroduit l'état d'hier (statut Terminé,
        sous-tâches cochées) — un reset une-seule-fois au montage est écrasé. ── */
  useEffect(() => {
    const today = todayISO()

    setTasks(prev => {
      // 1) Réinitialise les tâches récurrentes terminées hier ou avant
      const resetRecurring = prev.map(t => {
        if (!t.recurring || t.status !== 'Terminé') return t
        if (t.lastCompletedAt && t.lastCompletedAt < today) {
          const nextDate = nextOccurrenceDate(t, t.lastCompletedAt)
          // Nouvelle occurrence → on décoche les sous-tâches (sinon elles restent
          // cochées de la veille, ce qui casse une routine quotidienne).
          return {
            ...t,
            status: 'À faire' as const,
            deadline: nextDate,
            lastCompletedAt: null,
            subtasks: (t.subtasks || []).map(s => ({ ...s, done: false })),
          }
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
  }, [tasks, adjustments])

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
      void showNotif('⏱ Temps écoulé !', `${pomo.task.name} — bien joué !`, 'pomo-done')
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
