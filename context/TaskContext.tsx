"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { Task, Project, Adjustment, PomodoroState } from '@/types'
import { useLS } from '@/hooks/useLocalStorage'
import { todayISO, nextOccurrenceDate } from '@/utils/dates'

const NOTIF_ICON = '/icons/icon-192.png'

interface TaskContextValue {
  tasks: Task[]
  setTasks: (v: Task[] | ((prev: Task[]) => Task[])) => void
  projects: Project[]
  setProjects: (v: Project[] | ((prev: Project[]) => Project[])) => void
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
  const [adjustments, setAdjustments] = useLS<Adjustment[]>('pos_adjustments', [])

  /* ── Réinitialisation des tâches récurrentes ── */
  const didResetRef = useRef(false)
  useEffect(() => {
    if (didResetRef.current) return
    didResetRef.current = true
    const today = todayISO()
    setTasks(prev => {
      const updated = prev.map(t => {
        if (!t.recurring || t.status !== 'Terminé') return t
        if (t.lastCompletedAt && t.lastCompletedAt < today) {
          const nextDate = nextOccurrenceDate(t, t.lastCompletedAt)
          return { ...t, status: 'À faire' as const, deadline: nextDate, lastCompletedAt: null }
        }
        return t
      })
      return updated.some((t, i) => t !== prev[i]) ? updated : prev
    })
  })

  /* ── Auto-déplacement des tâches en retard → Ajustements ── */
  const didAdjustRef = useRef(false)
  useEffect(() => {
    if (didAdjustRef.current) return
    didAdjustRef.current = true
    const now = todayISO()
    const overdue = tasks.filter(t => t.deadline && t.deadline < now && t.status !== 'Terminé' && !t.recurring)
    if (!overdue.length) return
    const ids = new Set(overdue.map(t => t.id))
    const existIds = new Set(adjustments.map(a => a.taskId))
    const news = overdue.filter(t => !existIds.has(t.id))
    if (!news.length) return
    setTasks(prev => prev.filter(t => !ids.has(t.id)))
    setAdjustments(prev => [...prev, ...news.map(t => ({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      taskId: t.id,
      taskName: t.name,
      originalDeadline: t.deadline!,
      reason: 'manque de temps',
      newDate: '',
      originalTask: { ...t },
    }))])
  })

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
    if (p.running) return { ...p, running: false, pausedTimeLeft: p.timeLeft }
    const left = p.pausedTimeLeft || p.timeLeft
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
    <TaskContext.Provider value={{ tasks, setTasks, projects, setProjects, adjustments, setAdjustments, pomo, startPomo, pausePomo, stopPomo, donePomo }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTaskContext(): TaskContextValue {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTaskContext doit être utilisé dans <TaskProvider>')
  return ctx
}
