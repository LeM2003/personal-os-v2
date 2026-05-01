// Génère un fichier .ics (iCalendar) à partir des données Personal OS.
// Format supporté par Google Calendar, Samsung Calendar, Apple Calendar, Outlook.

const DAY_TO_ICS = {
  Lundi: 'MO', Mardi: 'TU', Mercredi: 'WE', Jeudi: 'TH',
  Vendredi: 'FR', Samedi: 'SA', Dimanche: 'SU',
}

// iCalendar veut les sauts de ligne en \r\n et échappe certains caractères
const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

// "2026-04-18" + "05:30" → "20260418T053000"
const toDT = (iso, hhmm = '00:00') => {
  const date = iso.replace(/-/g, '')
  const time = hhmm.replace(':', '') + '00'
  return `${date}T${time}`
}

// UTC timestamp pour DTSTAMP
const nowUTC = () => {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

// Calcule l'heure de fin à partir de début + durée (min). Défaut : +30 min.
const addMinutes = (hhmm, mins = 30) => {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

const buildEvent = ({ uid, summary, description = '', location = '', dtStart, dtEnd, rrule, alarmMinutes = 15 }) => {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}@personal-os`,
    `DTSTAMP:${nowUTC()}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${esc(summary)}`,
  ]
  if (description) lines.push(`DESCRIPTION:${esc(description)}`)
  if (location)    lines.push(`LOCATION:${esc(location)}`)
  if (rrule)       lines.push(`RRULE:${rrule}`)
  // Rappel (alarme) X minutes avant
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(summary)}`,
    `TRIGGER:-PT${alarmMinutes}M`,
    'END:VALARM',
    'END:VEVENT',
  )
  return lines.join('\r\n')
}

// Plafonne la répétition à ~1 an pour éviter d'inonder l'agenda
const COUNT_CAP = { daily: 365, weekly: 52, monthly: 12, yearly: 5 }

const DEFAULT_INCLUDE = { recurringTasks: true, oneshotTasks: true, examens: true, devoirs: true, subscriptions: true }

export function buildICS({ tasks = [], examens = [], devoirs = [], subscriptions = [] }, include = DEFAULT_INCLUDE) {
  const events = []

  // ── Tâches récurrentes avec heure ──
  if (include.recurringTasks) {
    tasks.filter(t => t.recurring && t.recurrenceTime).forEach(t => {
      const start = t.deadline || new Date().toISOString().split('T')[0]
      const dur = Math.max(t.duration || 30, 5)
      const dtStart = toDT(start, t.recurrenceTime)
      const dtEnd   = toDT(start, addMinutes(t.recurrenceTime, dur))
      let rrule = null
      if (t.recurrence === 'daily') {
        rrule = `FREQ=DAILY;COUNT=${COUNT_CAP.daily}`
      } else if (t.recurrence === 'weekly') {
        const days = (t.recurrenceDays || []).map(d => DAY_TO_ICS[d]).filter(Boolean)
        rrule = days.length
          ? `FREQ=WEEKLY;BYDAY=${days.join(',')};COUNT=${COUNT_CAP.weekly}`
          : `FREQ=WEEKLY;COUNT=${COUNT_CAP.weekly}`
      } else if (t.recurrence === 'monthly') {
        rrule = `FREQ=MONTHLY;COUNT=${COUNT_CAP.monthly}`
      }
      events.push(buildEvent({
        uid: `task-${t.id}`, summary: t.name,
        description: t.details || '',
        dtStart, dtEnd, rrule, alarmMinutes: 5,
      }))
    })
  }

  // ── Tâches ponctuelles avec deadline ──
  if (include.oneshotTasks) {
    tasks.filter(t => !t.recurring && t.deadline && t.status !== 'Terminé').forEach(t => {
      const dtStart = toDT(t.deadline, '09:00')
      const dtEnd   = toDT(t.deadline, '09:30')
      events.push(buildEvent({
        uid: `task-${t.id}`, summary: `📋 ${t.name}`,
        description: t.details || '',
        dtStart, dtEnd, alarmMinutes: 60,
      }))
    })
  }

  // ── Examens ──
  if (include.examens) {
    examens.forEach(e => {
      if (!e.date) return
      const dtStart = toDT(e.date, e.heure || '08:00')
      const dtEnd   = toDT(e.date, addMinutes(e.heure || '08:00', 120))
      events.push(buildEvent({
        uid: `exam-${e.id}`, summary: `🎓 Examen ${e.matiere}`,
        location: e.salle || '', description: e.notes || '',
        dtStart, dtEnd, alarmMinutes: 1440,
      }))
    })
  }

  // ── Devoirs ──
  if (include.devoirs) {
    devoirs.filter(d => d.statut !== 'Rendu' && d.dateRendu).forEach(d => {
      const dtStart = toDT(d.dateRendu, '18:00')
      const dtEnd   = toDT(d.dateRendu, '19:00')
      events.push(buildEvent({
        uid: `devoir-${d.id}`, summary: `📋 Devoir ${d.matiere}`,
        description: d.description || '',
        dtStart, dtEnd, alarmMinutes: 1440,
      }))
    })
  }

  // ── Abonnements (renouvellement) ──
  if (include.subscriptions) {
    subscriptions.filter(s => s.nextRenewal).forEach(s => {
      const dtStart = toDT(s.nextRenewal, '09:00')
      const dtEnd   = toDT(s.nextRenewal, '09:15')
      const rrule = s.cycle === 'Annuel'
        ? `FREQ=YEARLY;COUNT=${COUNT_CAP.yearly}`
        : `FREQ=MONTHLY;COUNT=${COUNT_CAP.monthly}`
      events.push(buildEvent({
        uid: `sub-${s.id}`, summary: `💳 ${s.name}`,
        description: s.amount ? `${s.amount.toLocaleString('fr-FR')} FCFA` : '',
        dtStart, dtEnd, rrule, alarmMinutes: 1440,
      }))
    })
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Personal OS//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Personal OS`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function countICSItems({ tasks = [], examens = [], devoirs = [], subscriptions = [] }) {
  return {
    recurringTasks: tasks.filter(t => t.recurring && t.recurrenceTime).length,
    oneshotTasks:   tasks.filter(t => !t.recurring && t.deadline && t.status !== 'Terminé').length,
    examens:        examens.filter(e => e.date).length,
    devoirs:        devoirs.filter(d => d.statut !== 'Rendu' && d.dateRendu).length,
    subscriptions:  subscriptions.filter(s => s.nextRenewal).length,
  }
}

export function downloadICS(data, include) {
  const ics = buildICS(data, include)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `personal-os-${new Date().toISOString().split('T')[0]}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
