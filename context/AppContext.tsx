"use client"

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import type { UserProfile, StreakData, Task, Project, Expense, Exam, Homework } from '@/types'
import { useLS } from '@/hooks/useLocalStorage'
import { startNotificationLoop, stopNotificationLoop } from '@/utils/notifications'

import { TaskProvider, useTaskContext } from './TaskContext'
import { FinanceProvider, useFinanceContext } from './FinanceContext'
import { EducationProvider, useEducationContext } from './EducationContext'
import { createClient } from '@/lib/supabase/client'

const NOTIF_ICON = '/icons/icon-192.png'

// Convertit une clé VAPID base64url (string) en Uint8Array (requis par pushManager.subscribe)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

interface AppCoreContextValue {
  // Navigation
  tab: string
  setTab: (v: string | ((prev: string) => string)) => void
  // Profil
  profile: UserProfile | null
  setProfile: (v: UserProfile | null | ((prev: UserProfile | null) => UserProfile | null)) => void
  // Apparence
  theme: string
  setTheme: (v: string | ((prev: string) => string)) => void
  toggleTheme: () => void
  accent: string
  setAccent: (v: string | ((prev: string) => string)) => void
  fontScale: string
  setFontScale: (v: string | ((prev: string) => string)) => void
  reduceMotionPref: boolean
  setReduceMotionPref: (v: boolean | ((prev: boolean) => boolean)) => void
  defaultTab: string
  setDefaultTab: (v: string | ((prev: string) => string)) => void
  // Notifications
  notifEnabled: boolean
  setNotifEnabled: (v: boolean | ((prev: boolean) => boolean)) => void
  notifSupported: boolean
  enableNotifications: () => Promise<void>
  // Streak
  streakData: StreakData
  setStreakData: (v: StreakData | ((prev: StreakData) => StreakData)) => void
  // UI modals
  searchOpen: boolean
  setSearchOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  financeFormOpen: boolean
  setFinanceFormOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  profileModal: boolean
  setProfileModal: (v: boolean | ((prev: boolean) => boolean)) => void
  backupModal: boolean
  setBackupModal: (v: boolean | ((prev: boolean) => boolean)) => void
  importRef: React.RefObject<HTMLInputElement | null>
  // Actions
  exportData: () => void
  importData: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const AppCoreContext = createContext<AppCoreContextValue | null>(null)

function AppCoreProvider({ children }: { children: React.ReactNode }) {
  // Accès aux sous-contextes (pour export/import et notifications)
  const { tasks, setTasks, projects, setProjects, folders, setFolders, adjustments, setAdjustments } = useTaskContext()
  const { expenses, setExpenses, subscriptions, setSubscriptions, debts, setDebts,
          savings, setSavings, budgets, setBudgets, objectif, setObjectif } = useFinanceContext()
  const { courses, setCourses, devoirs, setDevoirs, examens, setExamens,
          notes, setNotes, subjects, setSubjects } = useEducationContext()

  /* ── Données persistées ── */
  const [tab,         setTab]         = useLS<string>('pos_tab',    'dashboard')
  const [profile,     setProfile]     = useLS<UserProfile | null>('pos_profile', null)
  const [notifEnabled,setNotifEnabled]= useLS<boolean>('pos_notif', false)
  const [theme,       setTheme]       = useLS<string>('pos_theme',  'dark')
  const [accent,           setAccent]           = useLS<string>('pos_accent',       'cyan')
  const [fontScale,        setFontScale]        = useLS<string>('pos_fontscale',    'md')
  const [reduceMotionPref, setReduceMotionPref] = useLS<boolean>('pos_reducemotion', false)
  const [defaultTab,       setDefaultTab]       = useLS<string>('pos_defaulttab',   'dashboard')
  const [streakData,  setStreakData]  = useLS<StreakData>('pos_streak', { count: 0, lastDate: '' })

  /* ── UI state (non persisté) ── */
  const [searchOpen,      setSearchOpen]      = useState(false)
  const [financeFormOpen, setFinanceFormOpen] = useState(false)
  const [profileModal,    setProfileModal]    = useState(false)
  const [backupModal,     setBackupModal]     = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  /* ── Supabase : sync profil → table profiles ── */
  useEffect(() => {
    if (!profile) return
    async function syncProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email ?? '',
          full_name: `${profile!.prenom}${profile!.nom ? ' ' + profile!.nom : ''}`.trim(),
          profile_mode: profile!.mode === 'etudiant' ? 'student'
            : profile!.mode === 'entrepreneur' ? 'professional'
            : profile!.mode === 'les-deux' ? 'both' : 'custom',
          custom_modules: profile!.customTabs ?? [],
          onboarding_done: true,
        }, { onConflict: 'id' })
      } catch { /* offline — localStorage persiste */ }
    }
    syncProfile()
  }, [profile])

  /* ── Apparence : thème (dark/light/system) ── */
  useEffect(() => {
    const root = document.documentElement
    const applyTheme = () => {
      const resolved = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : theme
      root.setAttribute('data-theme', resolved)
    }
    applyTheme()
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: light)')
      mq.addEventListener('change', applyTheme)
      return () => mq.removeEventListener('change', applyTheme)
    }
  }, [theme])
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'))

  /* ── Apparence : accent / taille d'affichage / animations ── */
  useEffect(() => { document.documentElement.setAttribute('data-accent', accent) }, [accent])
  useEffect(() => { document.documentElement.setAttribute('data-font-scale', fontScale) }, [fontScale])
  useEffect(() => {
    document.documentElement.setAttribute('data-reduce-motion', reduceMotionPref ? '1' : '0')
  }, [reduceMotionPref])

  /* ── Onglet de démarrage : applique defaultTab une fois par session ── */
  useEffect(() => {
    try {
      if (!sessionStorage.getItem('pos_session_started')) {
        sessionStorage.setItem('pos_session_started', '1')
        if (defaultTab) setTab(defaultTab)
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Ctrl+K → Recherche globale ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(s => !s)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  /* ── Notifications ── */
  const notifSupported = typeof Notification !== 'undefined'

  const notify = useCallback((title: string, body: string) => {
    if (!notifEnabled || !notifSupported || Notification.permission !== 'granted') return
    new Notification(title, { body, icon: NOTIF_ICON, badge: NOTIF_ICON })
  }, [notifEnabled, notifSupported])

  const enableNotifications = async () => {
    if (!notifSupported) { alert('Ton navigateur ne supporte pas les notifications.'); return }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setNotifEnabled(true)
      new Notification('Personal OS 🔔', { body: 'Notifications activées !', icon: NOTIF_ICON })
      // Abonne l'appareil au Web Push VAPID
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            // ⚠️ applicationServerKey DOIT être un Uint8Array, pas une string base64
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) as BufferSource,
          })
          // Auth par token Bearer (fiable en TWA/PWA, contrairement aux cookies)
          const { createClient } = await import('@/lib/supabase/client')
          const { data: { session } } = await createClient().auth.getSession()
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify(sub.toJSON()),
          })
        }
      } catch (err) {
        // Web Push non supporté/bloqué — les notifs locales restent actives
        console.warn('[Push] abonnement échoué:', err)
      }
    } else {
      setNotifEnabled(false)
      alert('Permission refusée. Active les notifications dans les paramètres de ton navigateur.')
    }
  }

  // Notifs au demarrage : examens & devoirs du jour/lendemain
  const notifStartupRef = useRef(false)
  useEffect(() => {
    if (!notifEnabled || !notifSupported || Notification.permission !== 'granted') return
    if (notifStartupRef.current) return
    notifStartupRef.current = true
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString().split('T')[0]
    examens.filter(e => e.date === today).forEach(e =>
      notify(`Examen AUJOURD'HUI`, `${e.matiere} a ${e.heure}${e.salle ? ` — ${e.salle}` : ''}`)
    )
    examens.filter(e => e.date === tomorrowISO).forEach(e =>
      notify(`Examen DEMAIN`, `${e.matiere} a ${e.heure} — Penses a reviser ce soir !`)
    )
    devoirs.filter(d => d.dateRendu === today && d.statut !== 'Rendu').forEach(d =>
      notify(`Devoir a rendre AUJOURD'HUI`, `${d.matiere}${d.description ? ` — ${d.description}` : ''}`)
    )
    devoirs.filter(d => d.dateRendu === tomorrowISO && d.statut !== 'Rendu').forEach(d =>
      notify(`Devoir a rendre DEMAIN`, `${d.matiere}`)
    )
  }, [notifEnabled, examens, devoirs, notify, notifSupported])

  // Notification toutes les 60s pour les tâches récurrentes
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

  // Boucle de notifications en arrière-plan (via Service Worker)
  useEffect(() => {
    if (!notifEnabled || Notification.permission !== 'granted') {
      stopNotificationLoop()
      return
    }
    const getData = () => ({ tasks, examens, devoirs, courses, profile })
    startNotificationLoop(getData)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.active?.postMessage({ type: 'STORE_DATA', payload: { examens, devoirs, tasks } })
      }).catch(() => {})
    }

    return () => stopNotificationLoop()
  }, [notifEnabled, tasks, examens, devoirs, courses, profile]) // eslint-disable-line

  /* ── Export / Import ── */
  const exportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile, tasks, projects, folders, expenses, subscriptions, budgets,
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

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (!data.version || typeof data !== 'object') { alert('Fichier invalide — pas un backup Personal OS.'); return }
        const arrays = ['tasks', 'projects', 'folders', 'expenses', 'subscriptions', 'adjustments', 'courses', 'devoirs', 'examens', 'notes', 'subjects']
        for (const k of arrays) {
          if (data[k] && !Array.isArray(data[k])) { alert(`Fichier corrompu — "${k}" n'est pas un tableau.`); return }
        }
        const validateItems = <T extends { id?: unknown }>(items: unknown[], requiredFields: (keyof T)[]): items is T[] => {
          return items.every(item => {
            if (typeof item !== 'object' || item === null) return false
            return requiredFields.every(f => f in item)
          })
        }
        if (data.tasks && !validateItems<Task>(data.tasks, ['id', 'name', 'status'])) { alert('Fichier corrompu — certaines tâches sont invalides.'); return }
        if (data.projects && !validateItems<Project>(data.projects, ['id', 'name'])) { alert('Fichier corrompu — certains projets sont invalides.'); return }
        if (data.expenses && !validateItems<Expense>(data.expenses, ['id', 'amount', 'date'])) { alert('Fichier corrompu — certaines dépenses sont invalides.'); return }
        if (data.examens && !validateItems<Exam>(data.examens, ['id', 'matiere', 'date', 'heure'])) { alert('Fichier corrompu — certains examens sont invalides.'); return }
        if (data.devoirs && !validateItems<Homework>(data.devoirs, ['id', 'matiere', 'dateRendu', 'statut'])) { alert('Fichier corrompu — certains devoirs sont invalides.'); return }
        if (data.profile) setProfile(data.profile)
        if (data.tasks) setTasks(data.tasks)
        if (data.projects) setProjects(data.projects)
        if (data.folders) setFolders(data.folders)
        if (data.expenses) setExpenses(data.expenses)
        if (data.subscriptions) setSubscriptions(data.subscriptions)
        if (data.debts) setDebts(data.debts)
        if (data.savings) setSavings(data.savings)
        if (data.objectif) setObjectif(data.objectif)
        if (data.adjustments) setAdjustments(data.adjustments)
        if (data.courses) setCourses(data.courses)
        if (data.devoirs) setDevoirs(data.devoirs)
        if (data.examens) setExamens(data.examens)
        if (data.notes) setNotes(data.notes)
        if (data.subjects) setSubjects(data.subjects)
        if (data.budgets && typeof data.budgets === 'object') setBudgets(data.budgets)
        setBackupModal(false)
        alert('✅ Données restaurées avec succès !')
      } catch { alert('Erreur : fichier JSON corrompu ou illisible.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const value: AppCoreContextValue = {
    tab, setTab,
    profile, setProfile,
    theme, setTheme, toggleTheme,
    accent, setAccent,
    fontScale, setFontScale,
    reduceMotionPref, setReduceMotionPref,
    defaultTab, setDefaultTab,
    notifEnabled, setNotifEnabled,
    notifSupported,
    enableNotifications,
    streakData, setStreakData,
    searchOpen, setSearchOpen,
    financeFormOpen, setFinanceFormOpen,
    profileModal, setProfileModal,
    backupModal, setBackupModal,
    importRef,
    exportData,
    importData,
  }

  return <AppCoreContext.Provider value={value}>{children}</AppCoreContext.Provider>
}

// ── Provider combiné (utilisé dans app/page.tsx) ─────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <TaskProvider>
      <FinanceProvider>
        <EducationProvider>
          <AppCoreProvider>
            {children}
          </AppCoreProvider>
        </EducationProvider>
      </FinanceProvider>
    </TaskProvider>
  )
}

// ── Hook useApp — rétro-compatible avec l'ancien AppContext ───────────────────
// Agrège tous les sous-contextes. Les composants existants n'ont rien à changer.

export function useApp() {
  const core = useContext(AppCoreContext)
  if (!core) throw new Error('useApp doit être utilisé dans <AppProvider>')

  const task = useTaskContext()
  const finance = useFinanceContext()
  const education = useEducationContext()

  return { ...task, ...finance, ...education, ...core }
}
