"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useLS } from '../hooks/useLocalStorage'
import { genId, todayISO, nextOccurrenceDate } from '../utils/dates'
import { startNotificationLoop, stopNotificationLoop } from '../utils/notifications'
// Sample data no longer loaded by default — new users start with empty dashboard

const AppContext = createContext(null)

const NOTIF_ICON = '/icons/icon-192.png'

export function AppProvider({ children }) {
  /* ── Donnees persistees ── */
  const [tab,           setTab]           = useLS('pos_tab',           'dashboard')
  const [tasks,         setTasks]         = useLS('pos_tasks',         [])
  const [projects,      setProjects]      = useLS('pos_projects',      [])
  const [expenses,      setExpenses]      = useLS('pos_expenses',      [])
  const [subscriptions, setSubscriptions] = useLS('pos_subscriptions', [])
  const [debts,         setDebts]         = useLS('pos_debts',         [])
  const [savings,       setSavings]       = useLS('pos_savings',       [])
  const [budgets,       setBudgets]       = useLS('pos_budgets',       {})
  const [objectif,      setObjectif]      = useLS('pos_objectif',      '')
  const [adjustments,   setAdjustments]   = useLS('pos_adjustments',   [])
  const [courses,       setCourses]       = useLS('pos_courses',       [])
  const [devoirs,       setDevoirs]       = useLS('pos_devoirs',       [])
  const [examens,       setExamens]       = useLS('pos_examens',       [])
  const [notes,         setNotes]         = useLS('pos_notes',         [])
  const [subjects,      setSubjects]      = useLS('pos_subjects',      [])
  const [profile,       setProfile]       = useLS('pos_profile',       null)
  const [apiKey,        setApiKey]        = useLS('pos_apikey',        '')
  const [notifEnabled,  setNotifEnabled]  = useLS('pos_notif',         false)
  const [theme,         setTheme]         = useLS('pos_theme',         'dark')
  const [streakData,    setStreakData]     = useLS('pos_streak',        { count: 0, lastDate: '' })

  /* ── UI state (non persiste) ── */
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [apiModal,      setApiModal]      = useState(false)
  const [profileModal,  setProfileModal]  = useState(false)
  const [backupModal,   setBackupModal]   = useState(false)
  const importRef = useRef(null)

  /* ── Theme ── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  /* ── Ctrl+K → Global Search ── */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(s => !s)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* ── Pomodoro (timestamp-based = survit en arrière-plan) ── */
  const [pomo, setPomo] = useState(null)
  const bellRef = useRef(false)

  // Tick every second — uses endTime to survive background/sleep
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
    tick() // immediate check (in case we come back from background)
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [pomo?.running, pomo?.finished]) // eslint-disable-line

  // Notification when finished
  useEffect(() => {
    if (!pomo?.finished || bellRef.current) return
    bellRef.current = true
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('⏱ Temps écoulé !', { body: `${pomo.task.name} — bien joué !`, icon: NOTIF_ICON })
    }
  }, [pomo?.finished]) // eslint-disable-line

  const startPomo = useCallback((task) => {
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
      // Pause: save remaining time
      return { ...p, running: false, pausedTimeLeft: p.timeLeft }
    } else {
      // Resume: recalculate endTime from remaining time
      const left = p.pausedTimeLeft || p.timeLeft
      return { ...p, running: true, timeLeft: left, endTime: Date.now() + left * 1000 }
    }
  })
  const stopPomo  = () => setPomo(null)
  const donePomo  = () => {
    if (pomo) {
      setTasks(prev => prev.map(t => {
        if (t.id !== pomo.task.id) return t
        if (t.recurring) return { ...t, status: 'Terminé', lastCompletedAt: todayISO() }
        return { ...t, status: 'Terminé' }
      }))
    }
    setPomo(null)
  }

  /* ── Reset taches recurrentes (vérifie à chaque changement de tasks) ── */
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
          return { ...t, status: 'À faire', deadline: nextDate, lastCompletedAt: null }
        }
        return t
      })
      // Only update if something changed
      return updated.some((t, i) => t !== prev[i]) ? updated : prev
    })
  }) // runs once per mount via ref guard

  /* ── Auto-move taches en retard → Ajustements ── */
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
      id: genId(), taskId: t.id, taskName: t.name,
      originalDeadline: t.deadline, reason: 'manque de temps',
      newDate: '', originalTask: { ...t },
    }))])
  }) // runs once per mount via ref guard

  /* ── Notifications ── */
  const notifSupported = typeof Notification !== 'undefined'

  const notify = useCallback((title, body) => {
    if (!notifEnabled || !notifSupported || Notification.permission !== 'granted') return
    new Notification(title, { body, icon: NOTIF_ICON, badge: NOTIF_ICON })
  }, [notifEnabled, notifSupported])

  const enableNotifications = async () => {
    if (!notifSupported) { alert('Ton navigateur ne supporte pas les notifications.'); return }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setNotifEnabled(true)
      new Notification('Personal OS 🔔', { body: 'Notifications activées ! Tu seras rappelé avant tes examens et deadlines.', icon: NOTIF_ICON })
    } else {
      setNotifEnabled(false)
      alert('Permission refusée. Active les notifications dans les paramètres de ton navigateur.')
    }
  }

  // Notifs au demarrage : examens & devoirs du jour / lendemain
  useEffect(() => {
    if (!notifEnabled || !notifSupported || Notification.permission !== 'granted') return
    const today = todayISO()
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString().split('T')[0]
    examens.filter(e => e.date === today).forEach(e =>
      notify(`🎓 Examen AUJOURD'HUI`, `${e.matiere} à ${e.heure}${e.salle ? ` — ${e.salle}` : ''}`)
    )
    examens.filter(e => e.date === tomorrowISO).forEach(e =>
      notify(`🎓 Examen DEMAIN`, `${e.matiere} à ${e.heure} — Penses à réviser ce soir !`)
    )
    devoirs.filter(d => d.dateRendu === today && d.statut !== 'Rendu').forEach(d =>
      notify(`📋 Devoir à rendre AUJOURD'HUI`, `${d.matiere}${d.description ? ` — ${d.description}` : ''}`)
    )
    devoirs.filter(d => d.dateRendu === tomorrowISO && d.statut !== 'Rendu').forEach(d =>
      notify(`📋 Devoir à rendre DEMAIN`, `${d.matiere}`)
    )
  }, []) // eslint-disable-line

  // Verification toutes les 60s pour les habitudes recurrentes
  const tasksRef = useRef(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  useEffect(() => {
    if (!notifEnabled) return
    const interval = setInterval(() => {
      if (!notifSupported || Notification.permission !== 'granted') return
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
      const dayName = JOURS[now.getDay()]
      const todayStr = now.toISOString().split('T')[0]
      tasksRef.current.filter(t => {
        if (!t.recurring || !t.recurrenceTime || t.status === 'Terminé') return false
        if (t.recurrenceTime !== hhmm) return false
        if (t.recurrence === 'daily') return true
        if (t.recurrence === 'weekly') return (t.recurrenceDays || []).includes(dayName)
        if (t.recurrence === 'monthly') return t.deadline === todayStr
        return false
      }).forEach(t => {
        notify(`🔥 C'est l'heure — ${t.name}`, t.duration ? `Durée prévue : ${t.duration} min` : 'Ta routine t\'attend !')
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [notifEnabled, notify, notifSupported])

  // ── Boucle de notifications en arrière-plan ──────────────
  useEffect(() => {
    if (!notifEnabled || Notification.permission !== 'granted') {
      stopNotificationLoop()
      return
    }
    const getData = () => ({ tasks, examens, devoirs, courses, profile })
    startNotificationLoop(getData)

    // Envoyer les données au Service Worker pour les notifs offline
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.active?.postMessage({ type: 'STORE_DATA', payload: { examens, devoirs, tasks } })
      }).catch(() => {})
    }

    return () => stopNotificationLoop()
  }, [notifEnabled, tasks, examens, devoirs, courses, profile])

  /* ── Export / Import ── */
  const exportData = () => {
    const data = {
      version: 1, exportedAt: new Date().toISOString(),
      profile, tasks, projects, expenses, subscriptions, budgets,
      objectif, adjustments, courses, devoirs, examens, notes, subjects,
      debts, savings,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `personal-os-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!data.version || typeof data !== 'object') { alert('Fichier invalide — pas un backup Personal OS.'); return }
        // Validate arrays are actually arrays
        const arrays = ['tasks', 'projects', 'expenses', 'subscriptions', 'adjustments', 'courses', 'devoirs', 'examens', 'notes', 'subjects']
        for (const k of arrays) {
          if (data[k] && !Array.isArray(data[k])) { alert(`Fichier corrompu — "${k}" n'est pas un tableau.`); return }
        }
        if (data.profile)       setProfile(data.profile)
        if (data.tasks)         setTasks(data.tasks)
        if (data.projects)      setProjects(data.projects)
        if (data.expenses)      setExpenses(data.expenses)
        if (data.subscriptions) setSubscriptions(data.subscriptions)
        if (data.debts)         setDebts(data.debts)
        if (data.savings)       setSavings(data.savings)
        if (data.objectif)      setObjectif(data.objectif)
        if (data.adjustments)   setAdjustments(data.adjustments)
        if (data.courses)       setCourses(data.courses)
        if (data.devoirs)       setDevoirs(data.devoirs)
        if (data.examens)       setExamens(data.examens)
        if (data.notes)         setNotes(data.notes)
        if (data.subjects)      setSubjects(data.subjects)
        if (data.budgets && typeof data.budgets === 'object') setBudgets(data.budgets)
        setBackupModal(false)
        alert('✅ Données restaurées avec succès !')
      } catch { alert('Erreur : fichier JSON corrompu ou illisible.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const value = {
    // Navigation
    tab, setTab,
    // Data
    tasks, setTasks,
    projects, setProjects,
    expenses, setExpenses,
    subscriptions, setSubscriptions,
    debts, setDebts,
    savings, setSavings,
    budgets, setBudgets,
    objectif, setObjectif,
    adjustments, setAdjustments,
    courses, setCourses,
    devoirs, setDevoirs,
    examens, setExamens,
    notes, setNotes,
    subjects, setSubjects,
    profile, setProfile,
    apiKey, setApiKey,
    notifEnabled, setNotifEnabled,
    streakData, setStreakData,
    // Theme
    theme, toggleTheme,
    // UI modals
    searchOpen, setSearchOpen,
    apiModal, setApiModal,
    profileModal, setProfileModal,
    backupModal, setBackupModal,
    importRef,
    // Pomodoro
    pomo, startPomo, pausePomo, stopPomo, donePomo,
    // Notifications
    notifSupported, enableNotifications,
    // Actions
    exportData, importData,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>')
  return ctx
}
