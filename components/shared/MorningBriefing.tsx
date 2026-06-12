"use client"

import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import type { Task, Exam, Homework, Expense, Project, StreakData, UserProfile } from '@/types'

interface MorningBriefingProps {
  tasks: Task[]
  examens: Exam[]
  devoirs: Homework[]
  expenses: Expense[]
  projects: Project[]
  profile: UserProfile | null
  streakData: StreakData
}

function todayISO() { return new Date().toISOString().split('T')[0] }
function currentHour() { return new Date().getHours() }
function daysUntil(d: string | undefined): number {
  if (!d) return Infinity
  return Math.round((new Date(d + 'T00:00:00').getTime() - new Date(todayISO() + 'T00:00:00').getTime()) / 86400000)
}

export default function MorningBriefing({ tasks, examens, devoirs, expenses, projects, profile, streakData }: MorningBriefingProps) {
const [visible, setVisible] = useState(false)
const [briefing, setBriefing] = useState('')
const [loading, setLoading] = useState(false)
const [dismissed, setDismissed] = useState(false)

useEffect(() => {
  const hour = currentHour()
  const today = todayISO()
  const lastShown = localStorage.getItem('pos_briefing_date')

  if (hour >= 5 && hour < 12 && lastShown !== today) {
    setVisible(true)
    localStorage.setItem('pos_briefing_date', today)
    generateBriefing()
  }
}, [])

const generateBriefing = async () => {
  setLoading(true)
  const today = todayISO()
  const hour = currentHour()

  const urgentTasks = tasks.filter(t => t.deadline === today && t.status !== 'Terminé' && !t.recurring)
  const upcomingExams = [...examens]
    .filter(e => daysUntil(e.date) >= 0 && daysUntil(e.date) <= 7)
    .sort((a, b) => daysUntil(a.date) - daysUntil(b.date))
    .slice(0, 2)
  const urgentDevoirs = devoirs.filter(d => d.statut !== 'Rendu' && daysUntil(d.dateRendu) >= 0 && daysUntil(d.dateRendu) <= 2)
  const activeProjects = projects.filter(p => p.status === 'En cours').slice(0, 2)
  const streak = streakData?.count || 0
  const monthBudget = (() => {
    try { return (JSON.parse(localStorage.getItem('pos_budgets') || '{}') as Record<string, number>).monthly || 0 } catch { return 0 }
  })()
  const monthKey = today.slice(0, 7)
  const monthExpenses = expenses.filter(e => (e.date || '').startsWith(monthKey)).reduce((s: number, e: Expense) => s + e.amount, 0)

  const salutation = hour < 9 ? 'Bonjour' : 'Bon milieu de matinée'
  const prompt = [
    `${salutation} ${profile?.prenom || ''} ! Voici la situation du ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} :`,
    urgentTasks.length ? `⚡ Tâches urgentes aujourd'hui : ${urgentTasks.map(t => `"${t.name}" (${t.priority})`).join(', ')}` : '✅ Pas de tâche urgente aujourd\'hui',
    upcomingExams.length ? `🎓 Examens proches : ${upcomingExams.map(e => `${e.matiere} dans ${daysUntil(e.date)}j`).join(', ')}` : '',
    urgentDevoirs.length ? `📋 Devoirs urgents : ${urgentDevoirs.map(d => `${d.matiere} avant ${d.dateRendu}`).join(', ')}` : '',
    activeProjects.length ? `🚀 Projets actifs : ${activeProjects.map(p => p.name).join(', ')}` : '',
    streak > 0 ? `🔥 Streak actuel : ${streak} jour${streak > 1 ? 's' : ''}` : '',
    monthBudget > 0 ? `💰 Budget du mois : ${monthExpenses.toLocaleString('fr-FR')} / ${monthBudget.toLocaleString('fr-FR')} FCFA dépensés` : '',
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: `${prompt}\n\nDonne-moi un briefing matinal en 3-4 phrases MAX. Sois direct, motivant, conclus avec UNE priorité absolue. NE GÉNÈRE PAS de bloc [ACTION:...], seulement du texte.` }],
        context: { profile, tasks, examens, devoirs, projects, expenses, streak },
      }),
    })
    // Un 500 a aussi un body : sans ce check, le JSON d'erreur brut s'affichait
    if (!res.ok || !res.body) throw new Error()
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      setBriefing(text.replace(/\[ACTION:\w+:\{.*?\}\]/g, '').trim())
    }
  } catch {
    setBriefing(`${salutation} ${profile?.prenom || ''} ! Voilà ta journée — ${urgentTasks.length} tâche${urgentTasks.length > 1 ? 's' : ''} urgente${urgentTasks.length > 1 ? 's' : ''}, ${upcomingExams.length} examen${upcomingExams.length > 1 ? 's' : ''} proche${upcomingExams.length > 1 ? 's' : ''}. Prends le contrôle.`)
  } finally {
    setLoading(false)
  }
}

if (!visible || dismissed) return null

return (
  <div style={{
    marginBottom: 20,
    background: 'linear-gradient(135deg, rgba(56,189,248,.1), rgba(129,140,248,.08), rgba(245,158,11,.05))',
    border: '1px solid rgba(56,189,248,.25)',
    borderRadius: 18,
    padding: '18px 20px',
    position: 'relative',
    overflow: 'hidden',
    animation: 'pageIn .4s ease both',
  }}>
    {/* Gradient top line */}
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--accent-1), var(--accent-2), var(--accent-3))' }} />

    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Sparkles size={15} color="#fff" />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--accent-1)' }}>Ton briefing du matin</p>
        <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>
      <button className="btn-icon" onClick={() => setDismissed(true)} style={{ marginLeft: 'auto' }}>
        <X size={14} />
      </button>
    </div>

    {/* Contenu */}
    {loading && !briefing ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
        <span className="spinner" />
        Analyse de ta journée en cours...
      </div>
    ) : (
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {briefing}
        {loading && <span style={{ opacity: .5, marginLeft: 4 }}>▋</span>}
      </p>
    )}
  </div>
)
}
