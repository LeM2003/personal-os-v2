// ── Tâches & Productivité ────────────────────────────────────────────────────

export interface Task {
  id: string
  name: string
  status: 'À faire' | 'En cours' | 'Terminé'
  deadline?: string          // format ISO yyyy-mm-dd
  duration?: number          // en minutes (pour le pomodoro)
  recurring?: boolean
  recurrence?: 'daily' | 'weekly' | 'monthly'
  recurrenceDays?: string[]  // ex: ['Lundi', 'Mercredi']
  recurrenceTime?: string    // format HH:mm
  lastCompletedAt?: string | null
  project?: string           // id du projet lié
  priority?: 'low' | 'medium' | 'high'
  createdAt?: string         // format ISO yyyy-mm-dd
  taskTime?: string          // heure prévue pour les tâches ponctuelles HH:mm
  [key: string]: unknown     // champs additionnels non encore typés
}

export interface Adjustment {
  id: string
  taskId: string
  taskName: string
  originalDeadline: string
  reason: string
  newDate: string
  originalTask: Task
}

// État du pomodoro (non persisté, uniquement en mémoire)
export interface PomodoroState {
  task: Task
  total: number        // durée totale en secondes
  timeLeft: number
  running: boolean
  finished: boolean
  endTime: number      // timestamp ms — permet de survivre en arrière-plan
  pausedTimeLeft?: number
}

// ── Projets ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  description?: string
  status?: string
  deadline?: string
  tags?: string[]
}

// ── Finances ─────────────────────────────────────────────────────────────────

export interface Expense {
  id: string
  label: string
  amount: number
  date: string         // format ISO yyyy-mm-dd
  category?: string
}

export interface Subscription {
  id: string
  name: string
  amount: number
  cycle: 'Mensuel' | 'Trimestriel' | 'Annuel' | 'Hebdomadaire'
  startDate: string    // format ISO yyyy-mm-dd
  nextRenewal: string  // format ISO yyyy-mm-dd
  category?: string
  lastPaid?: string
}

export interface Debt {
  id: string
  label: string
  amount: number
  to: string           // à qui on doit (nom ou description)
  dueDate?: string
}

export interface SavingsEntry {
  id: string
  label: string
  amount: number       // montant déjà épargné
  goal?: number        // objectif à atteindre
}

// Budgets par catégorie : { "Nourriture": 150, "Transport": 80, ... }
export type Budgets = Record<string, number>

// ── École ────────────────────────────────────────────────────────────────────

export interface Subject {
  id: string
  name: string
  color?: string
}

export interface Course {
  id: string
  nom: string          // nom de la matière
  jour: string         // ex: 'Lundi'
  jours?: string[]     // pour la saisie du formulaire
  heureDebut: string   // format HH:mm
  heureFin?: string    // format HH:mm
  salle?: string
  professeur?: string
  color?: string
  dateDebut?: string   // format ISO yyyy-mm-dd
  dateFin?: string     // format ISO yyyy-mm-dd
}

export interface Homework {
  id: string
  matiere: string
  description?: string
  dateRendu: string    // format ISO yyyy-mm-dd
  statut: 'À rendre' | 'Rendu'
}

export interface Exam {
  id: string
  matiere: string
  date: string         // format ISO yyyy-mm-dd
  heure: string        // format HH:mm
  salle?: string
  notes?: string
}

export interface Grade {
  id: string
  matiere: string
  note: number         // sur 20
  coeff?: number
  date?: string
  label?: string
}

// ── Profil utilisateur ───────────────────────────────────────────────────────

export type UserMode = 'etudiant' | 'entrepreneur' | 'les-deux' | 'custom'

export interface UserProfile {
  prenom: string
  nom?: string
  mode: UserMode
  customTabs?: string[]
}

// ── Streak ───────────────────────────────────────────────────────────────────

export interface StreakData {
  count: number
  lastDate: string     // format ISO yyyy-mm-dd
}
