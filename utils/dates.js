export const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export const todayISO = () => new Date().toISOString().split('T')[0]

export const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return iso
  return d.toLocaleDateString('fr-FR')
}

export const daysUntil = (iso) => {
  if (!iso) return Infinity
  const d = new Date(iso + 'T00:00:00')
  const now = new Date(); now.setHours(0, 0, 0, 0)
  return Math.ceil((d - now) / 86400000)
}

export const todayLabel = () =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

export const greeting = () => {
  const h = new Date().getHours()
  if (h < 5)  return 'Bonne nuit'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
export const todayDay = () => JOURS_FR[new Date().getDay()]

const JOURS_INDEX = { 'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4, 'Vendredi': 5, 'Samedi': 6, 'Dimanche': 0 }

export const isoAddDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export const fmtDateRange = (startISO, endISO) => {
  const s = new Date(startISO + 'T00:00:00')
  const e = new Date(endISO + 'T00:00:00')
  const optS = { day: 'numeric', month: 'short' }
  const optE = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${s.toLocaleDateString('fr-FR', optS)} — ${e.toLocaleDateString('fr-FR', optE)}`
}

export const fmtMonth = (year, month) => {
  const d = new Date(year, month, 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export const nextOccurrenceDate = (task, fromISO = null) => {
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
