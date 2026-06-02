/**
 * Conversions bidirectionnelles entre types TypeScript (app) et rows Supabase (SQL).
 * Centralisé ici pour que les changements de schéma n'impactent qu'un seul fichier.
 */

import type { Task, Folder, Expense, Project } from '@/types'

// ── Status ──────────────────────────────────────────────────────────────────
const STATUS_TO_DB: Record<string, string> = {
  'À faire': 'todo', 'En cours': 'doing', 'Terminé': 'done',
}
const STATUS_FROM_DB: Record<string, string> = {
  todo: 'À faire', doing: 'En cours', done: 'Terminé',
}

// ── Priority ─────────────────────────────────────────────────────────────────
const PRIORITY_TO_DB: Record<string, string> = {
  Critique: 'urgent', Important: 'high', Optionnel: 'low',
}
const PRIORITY_FROM_DB: Record<string, string> = {
  urgent: 'Critique', high: 'Important', low: 'Optionnel', medium: 'Important',
}

// ── Task ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function taskToRow(task: Task, userId: string): Record<string, any> {
  return {
    id: task.id,
    user_id: userId,
    title: task.name,
    description: task.details || null,
    status: STATUS_TO_DB[task.status] ?? 'todo',
    priority: PRIORITY_TO_DB[task.priority ?? 'Important'] ?? 'high',
    due_date: task.deadline ? `${task.deadline}T00:00:00Z` : null,
    duration_min: task.duration || null,
    task_time: task.taskTime || null,
    recurring: task.recurring ?? false,
    recurrence: task.recurrence || null,
    recurrence_days: task.recurrenceDays ?? [],
    recurrence_time: task.recurrenceTime || null,
    last_completed_at: task.lastCompletedAt || null,
    flexible: task.flexible ?? false,
    subtasks: task.subtasks ?? [],
    folder_id: task.folderId || null,
    linked_devoir_id: task.linkedDevoirId || null,
    ai_generated: false,
    position: 0,
    tags: [],
    metadata: { project: task.project || null },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToTask(row: Record<string, any>): Task {
  const meta = (row.metadata ?? {}) as Record<string, unknown>
  return {
    id: row.id as string,
    name: row.title as string,
    details: (row.description as string) || undefined,
    status: STATUS_FROM_DB[row.status as string] ?? 'À faire',
    priority: PRIORITY_FROM_DB[row.priority as string] ?? 'Important',
    deadline: row.due_date ? (row.due_date as string).slice(0, 10) : undefined,
    duration: (row.duration_min as number) || undefined,
    taskTime: (row.task_time as string) || undefined,
    recurring: (row.recurring as boolean) ?? false,
    recurrence: (row.recurrence as string) || undefined,
    recurrenceDays: (row.recurrence_days as string[]) ?? [],
    recurrenceTime: (row.recurrence_time as string) || undefined,
    lastCompletedAt: (row.last_completed_at as string | null) ?? null,
    flexible: (row.flexible as boolean) ?? false,
    subtasks: row.subtasks ?? [],
    folderId: (row.folder_id as string) || undefined,
    linkedDevoirId: (row.linked_devoir_id as string) || undefined,
    project: (meta.project as string) || undefined,
    createdAt: (row.created_at as string) || undefined,
  }
}

// ── Folder ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function folderToRow(folder: Folder, userId: string): Record<string, any> {
  return {
    id: folder.id,
    user_id: userId,
    name: folder.name,
    color: folder.color,
    emoji: folder.emoji || null,
    position: folder.order,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToFolder(row: Record<string, any>): Folder {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    emoji: (row.emoji as string) || undefined,
    order: (row.position as number) ?? 0,
    createdAt: (row.created_at as string) || undefined,
  }
}

// ── Expense ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function expenseToRow(expense: Expense, userId: string): Record<string, any> {
  return {
    id: expense.id,
    user_id: userId,
    type: 'expense',
    amount: expense.amount,
    currency: 'XOF',
    category: expense.category || 'Autre',
    description: expense.label || null,
    occurred_at: expense.date ? `${expense.date}T00:00:00Z` : new Date().toISOString(),
    metadata: { type: expense.type || null, note: expense.note || null },
    tags: [],
    attachments: [],
    ai_generated: false,
    ai_categorized: false,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToExpense(row: Record<string, any>): Expense {
  const meta = (row.metadata ?? {}) as Record<string, unknown>
  return {
    id: row.id as string,
    label: (row.description as string) || undefined,
    amount: row.amount as number,
    date: row.occurred_at ? (row.occurred_at as string).slice(0, 10) : '',
    category: (row.category as string) || undefined,
    type: (meta.type as string) || undefined,
    note: (meta.note as string) || undefined,
  }
}

// ── Project ──────────────────────────────────────────────────────────────────

const PROJECT_STATUS_TO_DB: Record<string, string> = {
  'En cours': 'in_progress', 'Terminé': 'done',
  'En pause': 'archived', 'Abandonné': 'archived',
}
const PROJECT_STATUS_FROM_DB: Record<string, string> = {
  in_progress: 'En cours', done: 'Terminé',
  archived: 'En pause', backlog: 'En cours',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function projectToRow(project: Project, userId: string): Record<string, any> {
  return {
    id: project.id,
    user_id: userId,
    title: project.name,
    description: project.description || project.objective || null,
    status: PROJECT_STATUS_TO_DB[project.status ?? 'En cours'] ?? 'backlog',
    target_date: project.targetDate || project.deadline || null,
    position: 0,
    metadata: {
      type: project.type || null,
      notes: project.notes || null,
      steps: project.steps || [],
      tags: project.tags || [],
      aiAnalysis: project.aiAnalysis || null,
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToProject(row: Record<string, any>): Project {
  const meta = (row.metadata ?? {}) as Record<string, unknown>
  return {
    id: row.id as string,
    name: row.title as string,
    description: (row.description as string) || undefined,
    status: PROJECT_STATUS_FROM_DB[row.status as string] ?? 'En cours',
    targetDate: (row.target_date as string) || undefined,
    type: (meta.type as string) || undefined,
    notes: (meta.notes as string) || undefined,
    steps: (meta.steps as Project['steps']) || [],
    tags: (meta.tags as string[]) || [],
    aiAnalysis: (meta.aiAnalysis as string) || null,
    createdAt: (row.created_at as string) || undefined,
  }
}
