// ── Taches & Productivite ────────────────────────────────────────────────────

export type TaskPriority = 'Critique' | 'Important' | 'Optionnel' | string
export type TaskStatus = 'À faire' | 'En cours' | 'Terminé' | string

export interface Subtask {
  id: string
  text: string
  done: boolean
  title?: string
}

export interface Folder {
  id: string
  name: string
  color: string
  emoji?: string
  order: number
  createdAt?: string
}

export interface Task {
  id: string
  name: string
  status: TaskStatus
  deadline?: string
  duration?: number
  durationH?: number
  durationM?: number
  recurring?: boolean
  recurrence?: 'daily' | 'weekly' | 'monthly' | string
  recurrenceDays?: string[]
  recurrenceTime?: string
  lastCompletedAt?: string | null
  project?: string
  priority?: TaskPriority
  createdAt?: string
  taskTime?: string
  details?: string
  subtasks?: Subtask[]
  flexible?: boolean
  linkedDevoirId?: string
  folderId?: string
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

export interface PomodoroState {
  task: Task
  total: number
  timeLeft: number
  running: boolean
  finished: boolean
  endTime: number
  pausedTimeLeft?: number
}

// ── Projets ──────────────────────────────────────────────────────────────────

export type ProjectType = 'projet' | 'idee' | string
export type ProjectStatus = 'En cours' | 'Terminé' | 'En pause' | 'Abandonné' | string

export interface ProjectStep {
  id: string
  text: string
  done: boolean
}

export interface Project {
  id: string
  name: string
  objective?: string
  targetDate?: string
  type?: ProjectType
  notes?: string
  createdAt?: string
  steps?: ProjectStep[]
  aiAnalysis?: string | null
  status?: ProjectStatus
  deadline?: string
  tags?: string[]
  description?: string
}

// ── Finances ─────────────────────────────────────────────────────────────────

export type ExpenseType = 'Variable' | 'Fixe' | string
export type ExpenseCategory = 'Alimentation' | 'Transport' | 'Télécom' | 'Santé' | 'Business' | 'École' | 'Loisirs' | 'Autre' | string

export interface Expense {
  id: string
  label?: string
  amount: number
  date: string
  category?: ExpenseCategory
  type?: ExpenseType
  note?: string
}

export type SubCycle = 'Hebdomadaire' | 'Mensuel' | 'Trimestriel' | 'Annuel' | string
export type SubCategory = 'Business' | 'Loisirs' | 'École' | 'Autre' | string

export interface Subscription {
  id: string
  name: string
  amount: number
  cycle: SubCycle
  startDate: string
  nextRenewal: string
  category?: SubCategory
  lastPaid?: string
}

export type DebtDirection = 'je_dois' | 'on_me_doit' | string

export interface Debt {
  id: string
  person: string
  amount: number
  direction: DebtDirection
  date?: string
  note?: string
  paid: boolean
  paidAt?: string | null
}

export type SavingsHistoryType = 'depot' | 'retrait' | string

export interface SavingsHistory {
  id: string
  amount: number
  type: SavingsHistoryType
  date: string
}

export interface SavingsEntry {
  id: string
  name: string
  goal?: number | null
  current: number
  color?: string
  note?: string
  createdAt?: string
  history?: SavingsHistory[]
}

export type Budgets = Record<string, number>

// ── Ecole ────────────────────────────────────────────────────────────────────

export interface Subject {
  id: string
  name: string
  short?: string
  coef?: number
  color?: string
}

export type CourseDay = 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi'

export interface Course {
  id: string
  nom: string
  jour: CourseDay | string
  jours?: CourseDay[]
  heureDebut: string
  heureFin?: string
  salle?: string
  professeur?: string
  color?: string
  dateDebut?: string | null
  dateFin?: string | null
  attended?: string[]
}

export type HomeworkStatus = 'À faire' | 'En cours' | 'Rendu' | string
export type HomeworkPriority = 'Critique' | 'Important' | 'Optionnel' | string

export interface Homework {
  id: string
  matiere: string
  description?: string
  dateRendu: string
  statut: HomeworkStatus
  priorite?: HomeworkPriority
}

export interface Exam {
  id: string
  matiere: string
  date: string
  heure: string
  salle?: string
  notes?: string
  chapitres?: string
  totalChapitres?: number
  chapitresRevises?: number
}

export type GradeType = 'Contrôle' | 'DS' | 'Oral' | string

export interface Grade {
  id: string
  subjectId: string
  grade: number
  coef?: number
  type?: GradeType
  title?: string
  date?: string
  matiere?: string
  note?: number
  label?: string
}

// ── Profil utilisateur ───────────────────────────────────────────────────────

export type UserMode = 'etudiant' | 'entrepreneur' | 'les-deux' | 'custom'

export interface UserProfile {
  prenom: string
  nom?: string
  mode: UserMode
  customTabs?: string[]
  objectif?: string
  onboarding_done?: boolean
}

// ── Streak ───────────────────────────────────────────────────────────────────

export interface StreakData {
  count: number
  lastDate: string
}

// ── Alert type ───────────────────────────────────────────────────────────────

export interface AlertItem {
  type: 'red' | 'yellow' | 'blue'
  msg: string
}
