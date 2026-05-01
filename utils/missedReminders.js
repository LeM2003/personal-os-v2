import { todayISO } from './dates'

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const hhmmNow = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const daysBetween = (iso) => {
  if (!iso) return Infinity
  const [y, m, d] = iso.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const today  = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

const shouldRecurToday = (t, todayStr, dayName) => {
  if (t.recurrence === 'daily')   return true
  if (t.recurrence === 'weekly')  return (t.recurrenceDays || []).includes(dayName)
  if (t.recurrence === 'monthly') return t.deadline === todayStr
  return false
}

/**
 * Calcule la liste de rappels "ratés" à afficher à l'ouverture de l'app.
 * Fonction pure : même entrée → même sortie, aucun effet de bord.
 *
 * @returns [{ id, kind, icon, title, detail }]
 */
export function computeMissedReminders({ tasks = [], examens = [], devoirs = [], subscriptions = [] }) {
  const today   = todayISO()
  const nowHM   = hhmmNow()
  const dayName = JOURS[new Date().getDay()]
  const missed  = []

  // 1. Tâches récurrentes dont l'heure est passée et qui ne sont pas terminées
  tasks.forEach(t => {
    if (!t.recurring || !t.recurrenceTime || t.status === 'Terminé') return
    if (!shouldRecurToday(t, today, dayName)) return
    if (t.recurrenceTime >= nowHM) return // pas encore l'heure
    missed.push({
      id: `task-${t.id}`,
      kind: 'task',
      icon: '🔔',
      title: t.name,
      detail: `Prévu à ${t.recurrenceTime} — pas encore coché`,
    })
  })

  // 2. Examens aujourd'hui ou demain
  examens.forEach(e => {
    const d = daysBetween(e.date)
    if (d === 0) missed.push({
      id: `exam-${e.id}`, kind: 'exam', icon: '🎓',
      title: `Examen AUJOURD'HUI — ${e.matiere}`,
      detail: `${e.heure || ''}${e.salle ? ` · ${e.salle}` : ''}`.trim(),
    })
    else if (d === 1) missed.push({
      id: `exam-${e.id}`, kind: 'exam', icon: '🎓',
      title: `Examen DEMAIN — ${e.matiere}`,
      detail: `${e.heure || ''} — pense à réviser ce soir`.trim(),
    })
  })

  // 3. Devoirs non rendus à échéance aujourd'hui ou passée
  devoirs.forEach(d => {
    if (d.statut === 'Rendu') return
    const delta = daysBetween(d.dateRendu)
    if (delta === 0) missed.push({
      id: `dev-${d.id}`, kind: 'devoir', icon: '📋',
      title: `Devoir à rendre AUJOURD'HUI — ${d.matiere}`,
      detail: d.description || '',
    })
    else if (delta < 0) missed.push({
      id: `dev-${d.id}`, kind: 'devoir-late', icon: '⚠️',
      title: `Devoir EN RETARD — ${d.matiere}`,
      detail: `Échéance il y a ${Math.abs(delta)} jour${Math.abs(delta) > 1 ? 's' : ''}`,
    })
  })

  // 4. Abonnements dont le renouvellement arrive dans <= 3 jours
  subscriptions.forEach(s => {
    if (!s.nextRenewal) return
    const delta = daysBetween(s.nextRenewal)
    if (delta < 0 || delta > 3) return
    const when = delta === 0 ? "AUJOURD'HUI" : delta === 1 ? 'DEMAIN' : `dans ${delta} jours`
    missed.push({
      id: `sub-${s.id}`, kind: 'sub', icon: '💳',
      title: `${s.name} se renouvelle ${when}`,
      detail: s.amount ? `${s.amount.toLocaleString('fr-FR')} FCFA` : '',
    })
  })

  return missed
}
