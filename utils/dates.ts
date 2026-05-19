import type { Task } from '@/types'

export const genId = (): string => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const todayISO = (): string => new Date().toISOString().split('T')[0]

export const fmtDate = (iso?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR')
}

export const daysUntil = (iso?: string): number => {
  if (!iso) return Infinity
  const d = new Date(iso + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / 86400000)
}

export const todayLabel = (): string =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

export const greeting = (): string => {
  const h = new Date().getHours()
  if (h < 5)  return 'Bonne nuit'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
export const todayDay = (): string => JOURS_FR[new Date().getDay()]

const JOURS_INDEX: Record<string, number> = {
  'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4,
  'Vendredi': 5, 'Samedi': 6, 'Dimanche': 0,
}

export const isoAddDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export const fmtDateRange = (startISO: string, endISO: string): string => {
  const s = new Date(startISO + 'T00:00:00')
  const e = new Date(endISO + 'T00:00:00')
  const optS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const optE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${s.toLocaleDateString('fr-FR', optS)} — ${e.toLocaleDateString('fr-FR', optE)}`
}

export const fmtMonth = (year: number, month: number): string => {
  const d = new Date(year, month, 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export const nextOccurrenceDate = (task: Pick<Task, 'recurrence' | 'recurrenceDays'>, fromISO?: string | null): string => {
  const base = new Date((fromISO || todayISO()) + 'T00:00:00')
  base.setHours(0, 0, 0, 0)

  if (task.recurrence === 'daily') {
    const next = new Date(base)
    next.setDate(next.getDate() + 1)
    return next.toISOString().split('T')[0]
  }

  if (task.recurrence === 'weekly') {
    const days = (task.recurrenceDays || []).map(d => JOURS_INDEX[d]).filter(d => d !== undefined)
    if (days.length === 0) {
      const next = new Date(base); next.setDate(next.getDate() + 7)
      return next.toISOString().split('T')[0]
    }
    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(base)
      candidate.setDate(base.getDate() + i)
      if (days.includes(candidate.getDay())) return candidate.toISOString().split('T')[0]
    }
  }

  if (task.recurrence === 'monthly') {
    const next = new Date(base)
    next.setMonth(next.getMonth() + 1)
    return next.toISOString().split('T')[0]
  }

  return todayISO()
}
