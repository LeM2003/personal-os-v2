"use client"

/* ============================================================
   Système de notifications — Personal OS v2
   Niveau 2 : fonctionne quand le navigateur est ouvert
   même si l'onglet est en arrière-plan
   ============================================================ */

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function daysUntil(dateStr) {
  if (!dateStr) return Infinity
  const today = new Date(todayISO() + 'T00:00:00')
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

function currentHour() {
  return new Date().getHours()
}

// Eviter de notifier plusieurs fois le même événement dans la même journée
function wasNotifiedToday(key) {
  try {
    const store = JSON.parse(localStorage.getItem('pos_notif_sent') || '{}')
    return store[key] === todayISO()
  } catch { return false }
}

function markNotified(key) {
  try {
    const store = JSON.parse(localStorage.getItem('pos_notif_sent') || '{}')
    // Nettoyer les anciennes entrées
    Object.keys(store).forEach(k => { if (store[k] !== todayISO()) delete store[k] })
    store[key] = todayISO()
    localStorage.setItem('pos_notif_sent', JSON.stringify(store))
  } catch {}
}

async function showNotif(title, body, tag) {
  if (Notification.permission !== 'granted') return
  const opts = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag,
    vibrate: [100, 50, 100],
  }
  try {
    // Utiliser le Service Worker si dispo — notif persiste même onglet fermé
    const reg = await navigator.serviceWorker?.ready
    if (reg) {
      await reg.showNotification(title, opts)
    } else {
      new Notification(title, opts)
    }
  } catch {
    try { new Notification(title, opts) } catch {}
  }
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export async function checkAndNotify({ tasks = [], examens = [], devoirs = [], courses = [], profile }) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const today = todayISO()
  const hour = currentHour()
  const prenom = profile?.prenom || ''

  // ── Récap du matin (7h-9h) ──────────────────────────────
  if (hour >= 7 && hour < 9) {
    const key = `morning-recap-${today}`
    if (!wasNotifiedToday(key)) {
      const todayDay = new Date().toLocaleDateString('fr-FR', { weekday: 'long' })
      const todayCourses = courses.filter(c => c.jour === todayDay.charAt(0).toUpperCase() + todayDay.slice(1))
      const todayTasks = tasks.filter(t => t.deadline === today && t.status !== 'Terminé')
      const todayExam = examens.find(e => e.date === today)
      const urgentDevoirs = devoirs.filter(d => d.dateRendu === today && d.statut !== 'Rendu')

      const items = []
      if (todayExam) items.push(`⚠️ Examen : ${todayExam.matiere}`)
      if (urgentDevoirs.length) items.push(`📋 ${urgentDevoirs.length} devoir(s) à rendre`)
      if (todayCourses.length) items.push(`📚 ${todayCourses.length} cours`)
      if (todayTasks.length) items.push(`✅ ${todayTasks.length} tâche(s) urgente(s)`)

      if (items.length > 0) {
        await showNotif(
          `Bonjour ${prenom} ☀️`,
          items.join(' · '),
          key
        )
        markNotified(key)
      }
    }
  }

  // ── Examens ─────────────────────────────────────────────
  for (const exam of examens) {
    const j = daysUntil(exam.date)

    if (j === 0 && hour >= 6 && hour < 8) {
      const key = `exam-today-${exam.id || exam.matiere}-${today}`
      if (!wasNotifiedToday(key)) {
        await showNotif(
          `⚠️ Examen AUJOURD'HUI — ${exam.matiere}`,
          `${exam.heure ? 'à ' + exam.heure : ''} ${exam.salle ? '· ' + exam.salle : ''}`.trim() || 'Bonne chance !',
          key
        )
        markNotified(key)
      }
    }

    if (j === 1 && hour >= 20 && hour < 22) {
      const key = `exam-tomorrow-${exam.id || exam.matiere}-${today}`
      if (!wasNotifiedToday(key)) {
        await showNotif(
          `📚 Examen DEMAIN — ${exam.matiere}`,
          `${exam.heure ? 'à ' + exam.heure : 'demain matin'} · Révise ce soir !`,
          key
        )
        markNotified(key)
      }
    }

    if (j === 3 && hour >= 18 && hour < 20) {
      const key = `exam-3days-${exam.id || exam.matiere}-${today}`
      if (!wasNotifiedToday(key)) {
        await showNotif(
          `📖 Examen dans 3 jours — ${exam.matiere}`,
          `Le ${exam.date} · Commence à réviser maintenant`,
          key
        )
        markNotified(key)
      }
    }
  }

  // ── Devoirs ─────────────────────────────────────────────
  for (const devoir of devoirs) {
    if (devoir.statut === 'Rendu') continue
    const j = daysUntil(devoir.dateRendu)

    if (j === 0 && hour >= 7 && hour < 9) {
      const key = `devoir-today-${devoir.id || devoir.matiere}-${today}`
      if (!wasNotifiedToday(key)) {
        await showNotif(
          `⚡ Devoir à rendre AUJOURD'HUI`,
          `${devoir.matiere}${devoir.description ? ' · ' + devoir.description : ''}`,
          key
        )
        markNotified(key)
      }
    }

    if (j === 1 && hour >= 20 && hour < 22) {
      const key = `devoir-tomorrow-${devoir.id || devoir.matiere}-${today}`
      if (!wasNotifiedToday(key)) {
        await showNotif(
          `📋 Devoir à rendre DEMAIN`,
          `${devoir.matiere} · Finis-le ce soir`,
          key
        )
        markNotified(key)
      }
    }
  }

  // ── Tâches urgentes ──────────────────────────────────────
  const urgentTasks = tasks.filter(t =>
    t.deadline === today && t.status !== 'Terminé' && !t.recurring
  )
  if (urgentTasks.length > 0 && hour >= 9 && hour < 10) {
    const key = `tasks-urgent-${today}`
    if (!wasNotifiedToday(key)) {
      await showNotif(
        `✅ ${urgentTasks.length} tâche(s) à terminer aujourd'hui`,
        urgentTasks.slice(0, 2).map(t => t.name).join(' · '),
        key
      )
      markNotified(key)
    }
  }

  // ── Rappels de tâches ponctuelles avec heure (taskTime) ─
  for (const task of tasks) {
    if (!task.taskTime || task.recurring || task.status === 'Terminé') continue
    if (task.deadline !== today) continue

    const [th, tm] = task.taskTime.split(':').map(Number)
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const taskMin = th * 60 + tm
    const diff = taskMin - nowMin

    if (diff >= -2 && diff <= 5) {
      const key = `tasktime-${task.id}-${today}`
      if (!wasNotifiedToday(key)) {
        await showNotif(
          `⏰ ${task.name}`,
          `Prévu à ${task.taskTime}`,
          key
        )
        markNotified(key)
      }
    }
  }

  // ── Rappels de tâches récurrentes (à l'heure configurée) ─
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  const todayDay = now.toLocaleDateString('fr-FR', { weekday: 'long' })
  const dayLabel = todayDay.charAt(0).toUpperCase() + todayDay.slice(1)

  for (const task of tasks) {
    if (!task.recurring || !task.recurrenceTime) continue
    if (task.lastCompletedAt === today) continue

    const isToday =
      task.recurrence === 'daily' ||
      (task.recurrence === 'weekly' && (task.recurrenceDays || []).includes(dayLabel))

    if (!isToday) continue

    // Notifier 5 minutes avant ou à l'heure exacte
    const [h, m] = task.recurrenceTime.split(':').map(Number)
    const taskMinutes = h * 60 + m
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const diff = taskMinutes - nowMinutes

    if (diff >= -2 && diff <= 3) {
      const key = `recurring-${task.id}-${today}`
      if (!wasNotifiedToday(key)) {
        await showNotif(
          `🔔 Rappel : ${task.name}`,
          `Prévu à ${task.recurrenceTime}`,
          key
        )
        markNotified(key)
      }
    }
  }
}

// Boucle principale — appelée depuis AppContext
let notifInterval = null

export function startNotificationLoop(getData) {
  if (notifInterval) clearInterval(notifInterval)
  // Vérifier immédiatement puis toutes les minutes
  checkAndNotify(getData())
  notifInterval = setInterval(() => checkAndNotify(getData()), 60 * 1000)
}

export function stopNotificationLoop() {
  if (notifInterval) { clearInterval(notifInterval); notifInterval = null }
}
