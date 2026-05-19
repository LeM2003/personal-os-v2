"use client"

import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { CAT_COLORS, PRIORITY_COLOR } from '../utils/constants'
import { todayISO, todayDay, daysUntil, fmtDateRange } from '../utils/dates'
import StatCard from './shared/StatCard'
import WeeklyReport from './shared/WeeklyReport'
import PageHeader from './shared/PageHeader'
import AbstractMark from './shared/AbstractMark'
import { CheckSquare, Flame, Wallet, Target, GraduationCap, Rocket } from 'lucide-react'
import type { Task } from '@/types'

const TITLE_ICON = { display: 'inline', verticalAlign: -2, marginRight: 6 }

const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function isoMinusDays(n: number, offset = 0) {
  const d = new Date(); d.setDate(d.getDate() - n + offset * 7)
  return d.toISOString().split('T')[0]
}

function startOfWeekMinus(n: number, offset = 0) {
  const d = new Date()
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - day - (n + offset) * 7)
  return d.toISOString().split('T')[0]
}

function MiniBar({ value, max, color, label, sublabel }: { value: number; max: number; color: string; label: string; sublabel?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <div style={{ width: '100%', background: 'var(--bar-bg)', borderRadius: 6, height: 80,
        display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
        <div style={{ width: '100%', background: color, height: `${Math.max(pct, 2)}%`,
          borderRadius: '4px 4px 0 0', transition: 'height .5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
      {sublabel && <span style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>{sublabel}</span>}
    </div>
  )
}

function ScoreRing({ score, size = 90 }: { score: number; size?: number }) {
  const r = (size - 14) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 75 ? '#4ade80' : score >= 50 ? '#5B8DBF' : score >= 30 ? '#f97316' : '#f87171'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bar-bg)" strokeWidth={7} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .8s ease' }} />
    </svg>
  )
}


/* ══════════════════════════════════════════
   HABIT TRACKER — Grille 90 jours (GitHub-style)
   ══════════════════════════════════════════ */
const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const DAYS_FR   = ['D','L','M','M','J','V','S']

interface HabitDay { iso: string; date: Date; done: number }
interface MonthLabel { wi: number; label: string }

function HabitGrid({ tasks }: { tasks: Task[] }) {
  const [hovered, setHovered] = useState<{ iso: string; done: number } | null>(null)

  // Construire les 91 derniers jours (13 semaines)
  const today = new Date()
  today.setHours(0,0,0,0)

  // Aligner sur le début de semaine (lundi)
  const startDow = today.getDay() === 0 ? 6 : today.getDay() - 1
  const gridStart = new Date(today)
  gridStart.setDate(today.getDate() - (90 + startDow))

  const days: HabitDay[] = []
  for (let i = 0; i <= 90 + startDow; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    // Compter : tâches créées et terminées ce jour + récurrentes complétées
    const done = tasks.filter(t =>
      (t.createdAt === iso && t.status === 'Terminé') ||
      (t.recurring && t.lastCompletedAt === iso)
    ).length
    days.push({ iso, date: d, done })
  }

  // Grouper par semaine (colonnes)
  const weeks: HabitDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  // Stats
  const activeDays = days.filter(d => d.done > 0).length
  const streak = (() => {
    let s = 0
    const todayISO = today.toISOString().split('T')[0]
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].iso > todayISO) continue
      if (days[i].done > 0) s++
      else break
    }
    return s
  })()

  const cellColor = (count: number) => {
    if (count === 0) return 'rgba(56,189,248,.07)'
    if (count === 1) return 'rgba(56,189,248,.3)'
    if (count <= 3) return 'rgba(56,189,248,.6)'
    return '#38bdf8'
  }

  // Labels mois
  const monthLabels: MonthLabel[] = []
  weeks.forEach((week, wi) => {
    const first = week.find(d => d)
    if (!first) return
    const month = first.date.getMonth()
    if (wi === 0 || month !== weeks[wi-1]?.[0]?.date?.getMonth()) {
      monthLabels.push({ wi, label: MONTHS_FR[month] })
    }
  })

  return (
    <div className="card card-gold" style={{ padding: '18px 20px', marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Activité 90 jours</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>Chaque case = un jour avec des tâches terminées</p>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, background: 'linear-gradient(135deg,var(--accent-1),var(--accent-2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{activeDays}</p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .7 }}>jours actifs</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: streak >= 7 ? '#4ade80' : streak >= 3 ? '#fb923c' : 'var(--text)' }}>{streak}</p>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .7 }}>streak</p>
          </div>
        </div>
      </div>

      {/* Grille — scroll horizontal sur mobile */}
      <div style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }}>
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, minWidth: 'max-content' }}>
          {/* Labels mois */}
          <div style={{ display: 'flex', gap: 3, paddingLeft: 20, marginBottom: 2 }}>
            {weeks.map((_, wi) => {
              const ml = monthLabels.find(m => m.wi === wi)
              return (
                <div key={wi} style={{ width: 12, fontSize: 9, color: 'var(--muted)', letterSpacing: .3, overflow: 'visible', whiteSpace: 'nowrap' }}>
                  {ml ? ml.label : ''}
                </div>
              )
            })}
          </div>

          {/* Grille jours */}
          <div style={{ display: 'flex', gap: 3 }}>
            {/* Labels jours */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 4 }}>
              {[0,1,2,3,4,5,6].map(d => (
                <div key={d} style={{ width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: [1,3,5].includes(d) ? 'var(--muted)' : 'transparent', lineHeight: 1 }}>
                    {DAYS_FR[d]}
                  </span>
                </div>
              ))}
            </div>

            {/* Colonnes semaines */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {week.map((day, di) => {
                  const isToday = day.iso === today.toISOString().split('T')[0]
                  const isFuture = day.date > today
                  return (
                    <div
                      key={di}
                      onMouseEnter={() => setHovered({ iso: day.iso, done: day.done })}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        width: 12, height: 12, borderRadius: 3,
                        background: isFuture ? 'transparent' : cellColor(day.done),
                        border: isToday ? '1.5px solid var(--accent-1)' : isFuture ? 'none' : '1px solid rgba(255,255,255,.04)',
                        cursor: day.done > 0 ? 'pointer' : 'default',
                        transition: 'transform .1s',
                        transform: hovered?.iso === day.iso ? 'scale(1.3)' : 'scale(1)',
                        flexShrink: 0,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div style={{ marginTop: 8, padding: '5px 10px', background: 'var(--surface-elevated)', borderRadius: 8, display: 'inline-block' }}>
          <span style={{ fontSize: 12, color: 'var(--text)' }}>
            {hovered.iso} — {hovered.done > 0 ? `${hovered.done} tâche${hovered.done > 1 ? 's' : ''} terminée${hovered.done > 1 ? 's' : ''}` : 'Aucune activité'}
          </span>
        </div>
      )}

      {/* Légende */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>Moins</span>
        {[0,1,2,3,4].map(n => (
          <div key={n} style={{ width: 10, height: 10, borderRadius: 2, background: cellColor(n), border: '1px solid rgba(255,255,255,.04)' }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>Plus</span>
      </div>
    </div>
  )
}

export default function Stats() {
  const { tasks, expenses, subscriptions, projects, devoirs, examens, adjustments, profile, streakData } = useApp()
  const [showReport, setShowReport] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const today = todayISO()
  const dayName = todayDay()

  /* ── Tâches : 7 jours (avec navigation) ── */
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = isoMinusDays(6 - i, weekOffset)
    const d = new Date(date + 'T00:00:00')
    const label = JOURS_FR[d.getDay()].slice(0, 3)
    const created = tasks.filter(t => t.createdAt === date).length
    const done    = tasks.filter(t => t.createdAt === date && t.status === 'Terminé').length
    return { date, label, created, done }
  })
  const weekRangeLabel = fmtDateRange(last7[0].date, last7[6].date)
  const isCurrentWeek = weekOffset === 0
  const maxCreated     = Math.max(...last7.map(d => d.created), 1)
  const totalCreated7  = last7.reduce((s, d) => s + d.created, 0)
  const totalDone7     = last7.reduce((s, d) => s + d.done, 0)
  const completionRate = totalCreated7 > 0 ? Math.round((totalDone7 / totalCreated7) * 100) : 0

  // Semaine précédente (fixe, pour la narration — ignore weekOffset)
  const prev7Done = tasks.filter(t => {
    if (t.status !== 'Terminé') return false
    const d = t.createdAt
    if (!d) return false
    return d >= isoMinusDays(13, 0) && d <= isoMinusDays(7, 0)
  }).length
  const weekDelta = totalDone7 - prev7Done

  // Narration : phrase humaine adaptée à la performance
  const heroNarrative = (() => {
    if (totalDone7 === 0) return prev7Done > 0
      ? "Pas encore de tâche terminée cette semaine — le moment idéal pour en clôturer une."
      : "Aucune tâche finie pour l'instant. Un petit pas aujourd'hui suffit à lancer la série."
    if (totalDone7 >= 15) return weekDelta > 0
      ? `Belle série. ${weekDelta} de plus que la semaine passée — tu tiens un vrai rythme.`
      : "Gros volume terminé cette semaine. Garde cette énergie."
    if (totalDone7 >= 7) return weekDelta > 2
      ? `Bien joué — ${weekDelta} de plus que la semaine dernière.`
      : weekDelta < -2
        ? `Un peu moins que la semaine passée (${Math.abs(weekDelta)} en moins). Tu peux resserrer.`
        : "Un rythme régulier — c'est souvent ça qui gagne à long terme."
    return weekDelta > 0
      ? `Tu démarres la semaine, et c'est déjà mieux que la précédente (+${weekDelta}).`
      : "Un démarrage calme. Une tâche à la fois — pas besoin de tout d'un coup."
  })()

  const byPriority = ['Critique', 'Important', 'Optionnel'].map(p => ({
    priority: p,
    total: tasks.filter(t => t.priority === p).length,
    done:  tasks.filter(t => t.priority === p && t.status === 'Terminé').length,
  }))

  /* ── Habitudes ── */
  const allHabits   = tasks.filter(t => t.recurring)
  const todayHabits = tasks.filter(t => {
    if (!t.recurring) return false
    if (t.recurrence === 'daily')   return true
    if (t.recurrence === 'weekly')  return (t.recurrenceDays || []).includes(dayName)
    if (t.recurrence === 'monthly') return t.deadline === today
    return false
  })
  const habitsDoneToday = todayHabits.filter(t => t.status === 'Terminé' && t.lastCompletedAt === today).length
  const habitsPct       = todayHabits.length > 0 ? Math.round((habitsDoneToday / todayHabits.length) * 100) : 0

  /* ── Dépenses : 4 semaines (avec navigation) ── */
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const start = startOfWeekMinus(3 - i, -weekOffset)
    const we    = new Date(start + 'T00:00:00'); we.setDate(we.getDate() + 6)
    const weISO = we.toISOString().split('T')[0]
    const total = expenses.filter(e => e.date >= start && e.date <= weISO).reduce((s, e) => s + e.amount, 0)
    const label = isCurrentWeek
      ? (i === 3 ? 'Cette sem.' : `S-${3 - i}`)
      : `S${i + 1}`
    return { start, end: weISO, total, label }
  })
  const maxWeek      = Math.max(...weeks.map(w => w.total), 1)
  const weekTrend    = weeks[2].total > 0 ? Math.round(((weeks[3].total - weeks[2].total) / weeks[2].total) * 100) : null
  const monthStart   = (() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] })()
  const catTotals    = Object.entries(
    expenses.filter(e => e.date >= monthStart).reduce<Record<string, number>>((acc, e) => {
      const key = e.category ?? 'Autre'
      acc[key] = (acc[key] || 0) + e.amount; return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])
  const maxCat = catTotals[0]?.[1] || 1

  /* ── Vue globale tâches ── */
  const totalTasks       = tasks.length
  const totalDone        = tasks.filter(t => t.status === 'Terminé').length
  const monthlySubsCost  = subscriptions.reduce((s, sub) => {
    const cycles: Record<string, number> = { Mensuel: 1, Hebdomadaire: 4.33, Trimestriel: 1 / 3, Annuel: 1 / 12 }
    return s + (sub.amount || 0) * (cycles[sub.cycle] || 1)
  }, 0)

  /* ── École ── */
  const devoirsTotal   = devoirs.length
  const devoirsRendus  = devoirs.filter(d => d.statut === 'Rendu').length
  const devoirsRate    = devoirsTotal > 0 ? Math.round((devoirsRendus / devoirsTotal) * 100) : 0
  const devoirsUrgents = devoirs.filter(d => {
    const j = daysUntil(d.dateRendu)
    return d.statut !== 'Rendu' && j >= 0 && j <= 2
  }).length
  const examensAVenir  = examens.filter(e => { const j = daysUntil(e.date); return j >= 0 && j <= 14 })
  const revisionRate   = (() => {
    const total = examens.reduce((s, e) => s + (e.totalChapitres || 0), 0)
    const done  = examens.reduce((s, e) => s + (e.chapitresRevises || 0), 0)
    return total > 0 ? Math.round((done / total) * 100) : 0
  })()

  /* ── Projets ── */
  const activeProjects       = projects.filter(p => p.status !== 'Archivé')
  const projectsWithProgress = activeProjects.map(proj => {
    const linked   = tasks.filter(t => t.project === proj.name)
    const done     = linked.filter(t => t.status === 'Terminé').length
    const progress = linked.length > 0 ? Math.round((done / linked.length) * 100) : 0
    return { ...proj, progress, taskCount: linked.length, taskDone: done }
  })
  const avgProgress = projectsWithProgress.length > 0
    ? Math.round(projectsWithProgress.reduce((s, p) => s + p.progress, 0) / projectsWithProgress.length)
    : 0

  /* ── Discipline (ajustements) ── */
  const adjCount       = adjustments.length
  const totalTasksAll  = tasks.length + adjCount
  const disciplineRate = totalTasksAll > 0 ? Math.round(((totalTasksAll - adjCount) / totalTasksAll) * 100) : 100

  /* ── Score global ── */
  const scoreGlobal = (() => {
    const scores = []
    if (totalCreated7 > 0)       scores.push({ v: completionRate, w: 3 })
    if (todayHabits.length > 0)  scores.push({ v: habitsPct,      w: 2 })
    if (devoirsTotal > 0)        scores.push({ v: devoirsRate,    w: 2 })
    scores.push({ v: disciplineRate, w: 1 })
    if (!scores.length) return 0
    const totalW = scores.reduce((s, x) => s + x.w, 0)
    return Math.round(scores.reduce((s, x) => s + x.v * x.w, 0) / totalW)
  })()
  const scoreColor = scoreGlobal >= 75 ? '#4ade80' : scoreGlobal >= 50 ? '#5B8DBF' : scoreGlobal >= 30 ? '#f97316' : '#f87171'
  const scoreLabel = scoreGlobal >= 80 ? '🏆 Excellent' : scoreGlobal >= 60 ? '💪 Bien' : scoreGlobal >= 40 ? '⚡ À améliorer' : '🔄 Relance-toi'

  const dimensions = [
    { label: 'Tâches',    value: completionRate, show: totalCreated7 > 0 },
    { label: 'Habitudes', value: habitsPct,       show: todayHabits.length > 0 },
    { label: 'École',     value: devoirsRate,     show: devoirsTotal > 0 },
    { label: 'Discipline',value: disciplineRate,  show: true },
  ].filter(x => x.show)

  return (
    <div>
      <PageHeader title="Statistiques" sub="Ta progression, en chiffres"
        action={
          <button className="btn-gold" onClick={() => setShowReport(true)} style={{ fontSize: 13 }}>
            📤 Rapport hebdo
          </button>
        } />

      {/* ── Habit Tracker 90 jours ── */}
      <HabitGrid tasks={tasks} />

      {/* ── Hero cette semaine : grand chiffre + narration ── */}
      <div className="card" style={{
        padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: -18, top: -22,
          opacity: 0.45, pointerEvents: 'none',
        }}>
          <AbstractMark variant="rings" tone="accent" size={140} />
        </div>
        <p style={{
          fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase',
          fontFamily: 'Fraunces', fontWeight: 700,
          color: 'var(--gold)', margin: '0 0 8px', opacity: 0.85,
        }}>
          Cette semaine
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <span style={{
            fontFamily: 'Fraunces', fontWeight: 700,
            fontSize: 'clamp(56px, 12vw, 72px)',
            lineHeight: 1, letterSpacing: '-2.2px',
            color: 'var(--text)',
          }}>
            {totalDone7}
          </span>
          <span style={{
            fontSize: 14, color: 'var(--muted)',
            fontFamily: "'DM Sans', sans-serif",
          }}>
            tâche{totalDone7 > 1 ? 's' : ''} terminée{totalDone7 > 1 ? 's' : ''}
          </span>
        </div>
        <p style={{
          fontSize: 14, color: 'var(--text)',
          lineHeight: 1.5, margin: 0, maxWidth: 520, opacity: 0.78,
        }}>
          {heroNarrative}
        </p>
      </div>

      {/* ── Score global ── */}
      <div className="card" style={{ padding: 20, marginBottom: 20,
        background: 'linear-gradient(135deg, var(--surface-deep) 0%, var(--surface-elevated) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <ScoreRing score={scoreGlobal} size={90} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{scoreGlobal}</span>
              <span style={{ fontSize: 9, color: 'var(--muted)' }}>/ 100</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 15, color: scoreColor, margin: 0 }}>{scoreLabel}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 12px', lineHeight: 1.5 }}>
              Score global — tâches, habitudes, école, discipline
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {dimensions.map(x => (
                <div key={x.label} style={{ background: 'var(--surface-deep)', borderRadius: 8, padding: '5px 10px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0,
                    color: x.value >= 70 ? '#4ade80' : x.value >= 40 ? '#5B8DBF' : '#f87171' }}>{x.value}%</p>
                  <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>{x.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPIs globaux ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard icon="✅" value={`${completionRate}%`}
          label="Complétion (7j)" color="#4ade80" />
        <StatCard icon="🔥" value={`${habitsDoneToday}/${todayHabits.length}`}
          label="Habitudes aujourd'hui" color="#f97316" />
        <StatCard icon="🎯" value={activeProjects.length}
          label="Projets actifs" color="#5B8DBF" />
        <StatCard icon="💳" value={`${Math.round(monthlySubsCost).toLocaleString('fr-FR')} F`}
          label="Abonnements/mois" color="#60a5fa" />
      </div>

      {/* ── Ligne 1 : Tâches 7j + Habitudes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }} className="grid-2">

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, margin: 0 }}>
              <CheckSquare size={13} style={TITLE_ICON} /> Tâches — 7 jours
            </p>
            <span style={{ fontSize: 20, fontWeight: 800,
              color: completionRate >= 70 ? '#4ade80' : completionRate >= 40 ? '#5B8DBF' : '#f87171' }}>
              {completionRate}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button className="btn-icon" onClick={() => setWeekOffset(o => o - 1)}
              style={{ fontSize: 14, padding: '2px 8px' }} aria-label="Semaine précédente">←</button>
            <span style={{ fontSize: 12, color: isCurrentWeek ? '#5B8DBF' : 'var(--muted)', fontWeight: 600 }}>
              {isCurrentWeek ? 'Cette semaine' : weekRangeLabel}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-icon" onClick={() => setWeekOffset(o => o + 1)}
                disabled={isCurrentWeek}
                style={{ fontSize: 14, padding: '2px 8px', opacity: isCurrentWeek ? .3 : 1 }} aria-label="Semaine suivante">→</button>
              {!isCurrentWeek && (
                <button className="btn-ghost" onClick={() => setWeekOffset(0)}
                  style={{ fontSize: 10, padding: '2px 8px' }}>Aujourd'hui</button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {last7.map(d => (
              <MiniBar key={d.date} value={d.created} max={maxCreated}
                color={d.date === today ? '#5B8DBF' : '#3b82f6'}
                label={d.label} sublabel={d.created > 0 ? `${d.done}/${d.created}` : '—'} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)',
            borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <span>{totalDone7} terminées</span>
            <span>{totalCreated7} créées</span>
            <span>{tasks.filter(t => t.status === 'En cours').length} en cours</span>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 16 }}>
            <Flame size={13} style={TITLE_ICON} /> Habitudes récurrentes
          </p>
          {allHabits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>♻️</div>
              <p style={{ fontSize: 13 }}>Aucune habitude créée</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Va dans Tâches → active "Tâche récurrente"</p>
            </div>
          ) : (
            <>
              <div style={{ background: habitsPct === 100 ? 'rgba(74,222,128,.08)' : 'rgba(249,115,22,.06)',
                border: `1px solid ${habitsPct === 100 ? 'rgba(74,222,128,.25)' : 'rgba(249,115,22,.2)'}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 14,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Score aujourd'hui</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: '3px 0 0' }}>
                    {habitsPct === 100 ? '🏆 Toutes les habitudes faites !' : `${todayHabits.length - habitsDoneToday} restante(s)`}
                  </p>
                </div>
                <span style={{ fontSize: 28, fontWeight: 800, color: habitsPct === 100 ? '#4ade80' : '#f97316' }}>
                  {habitsPct}%
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allHabits.slice(0, 6).map(t => {
                  const doneToday  = t.status === 'Terminé' && t.lastCompletedAt === today
                  const freqLabel  = t.recurrence === 'daily' ? 'Quotidien' : t.recurrence === 'monthly' ? 'Mensuel' : `${(t.recurrenceDays || []).length}j/sem`
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: doneToday ? .7 : 1 }}>
                      <span style={{ fontSize: 14 }}>{doneToday ? '✅' : '⭕'}</span>
                      <span style={{ flex: 1, fontSize: 13, textDecoration: doneToday ? 'line-through' : 'none',
                        color: doneToday ? 'var(--muted)' : 'var(--text)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{freqLabel}</span>
                    </div>
                  )
                })}
                {allHabits.length > 6 && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 4 }}>
                    +{allHabits.length - 6} autre(s)…
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Ligne 2 : Dépenses + Tâches par priorité ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }} className="grid-2">

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8 }}>
              <Wallet size={13} style={TITLE_ICON} /> Dépenses — 4 semaines
            </p>
            {weekTrend !== null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: weekTrend > 0 ? '#f87171' : '#4ade80' }}>
                {weekTrend > 0 ? `↑ +${weekTrend}%` : `↓ ${weekTrend}%`} vs sem. passée
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            {weeks.map((w, i) => (
              <MiniBar key={w.start} value={w.total} max={maxWeek}
                color={i === 3 ? '#5B8DBF' : '#3b82f6'}
                label={w.label} sublabel={w.total > 0 ? `${Math.round(w.total / 1000)}k F` : '0'} />
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Top catégories ce mois</p>
            {catTotals.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Aucune dépense ce mois</p>
            ) : catTotals.slice(0, 4).map(([cat, total]) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[cat] || '#6b7280', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: 'var(--muted)' }}>{cat}</span>
                <div style={{ width: 80, background: 'var(--bar-bg)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${(total / maxCat) * 100}%`, height: '100%',
                    background: CAT_COLORS[cat] || '#6b7280', borderRadius: 999 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
                  {total.toLocaleString('fr-FR')} F
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 16 }}>
            <Target size={13} style={TITLE_ICON} /> Tâches par priorité
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            {byPriority.map(({ priority, total, done }) => {
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <div key={priority}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: PRIORITY_COLOR[priority], fontWeight: 600 }}>{priority}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {done}/{total} — <span style={{ fontWeight: 700, color: PRIORITY_COLOR[priority] }}>{pct}%</span>
                    </span>
                  </div>
                  <div style={{ background: 'var(--bar-bg)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: PRIORITY_COLOR[priority],
                      borderRadius: 999, transition: 'width .5s ease',
                      boxShadow: `0 0 6px ${PRIORITY_COLOR[priority]}60` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total tâches', value: totalTasks, color: 'var(--muted)' },
              { label: 'Terminées',    value: totalDone,  color: '#4ade80' },
              { label: 'En cours',     value: tasks.filter(t => t.status === 'En cours').length, color: '#60a5fa' },
              { label: 'À faire',      value: tasks.filter(t => t.status === 'À faire').length,  color: '#5B8DBF' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-deep)', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '3px 0 0' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Ligne 3 : École + Projets ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }} className="grid-2">

        {/* École */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 16 }}>
            <GraduationCap size={13} style={TITLE_ICON} /> École
          </p>
          {devoirsTotal === 0 && examens.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
              <p style={{ fontSize: 13 }}>Aucun devoir ni examen enregistré</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Va dans École pour commencer à suivre</p>
            </div>
          ) : (
            <>
              {devoirsTotal > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Devoirs rendus</span>
                    <span style={{ fontSize: 13, fontWeight: 700,
                      color: devoirsRate >= 70 ? '#4ade80' : devoirsRate >= 40 ? '#5B8DBF' : '#f87171' }}>
                      {devoirsRendus}/{devoirsTotal} — {devoirsRate}%
                    </span>
                  </div>
                  <div style={{ background: 'var(--bar-bg)', borderRadius: 999, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ width: `${devoirsRate}%`, height: '100%',
                      background: devoirsRate >= 70 ? '#4ade80' : '#5B8DBF',
                      borderRadius: 999, transition: 'width .5s ease' }} />
                  </div>
                  {devoirsUrgents > 0 && (
                    <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)',
                      borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>⚠️</span>
                      <span style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>
                        {devoirsUrgents} devoir(s) à rendre dans moins de 48h
                      </span>
                    </div>
                  )}
                </div>
              )}

              {examensAVenir.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Examens dans les 14 prochains jours</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {examensAVenir.slice(0, 3).map(e => {
                      const j      = daysUntil(e.date)
                      const total  = e.totalChapitres ?? 0
                      const revised = e.chapitresRevises ?? 0
                      const revPct = total > 0 ? Math.round((revised / total) * 100) : 0
                      return (
                        <div key={e.id} style={{ background: 'var(--surface-deep)', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{e.matiere}</span>
                            <span style={{ fontSize: 12, fontWeight: 700,
                              color: j <= 3 ? '#f87171' : j <= 7 ? '#5B8DBF' : '#4ade80' }}>
                              J-{j}
                            </span>
                          </div>
                          {total > 0 && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between',
                                fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                                <span>Révisions</span>
                                <span>{e.chapitresRevises}/{e.totalChapitres} chap. — {revPct}%</span>
                              </div>
                              <div style={{ background: 'var(--bar-bg)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
                                <div style={{ width: `${revPct}%`, height: '100%',
                                  background: revPct >= 70 ? '#4ade80' : revPct >= 40 ? '#5B8DBF' : '#f87171',
                                  borderRadius: 999, transition: 'width .5s ease' }} />
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {examens.length > 0 && revisionRate > 0 && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Révisions globales (tous examens)</span>
                  <span style={{ fontSize: 13, fontWeight: 700,
                    color: revisionRate >= 70 ? '#4ade80' : '#5B8DBF' }}>{revisionRate}%</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Projets */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8 }}>
              <Rocket size={13} style={TITLE_ICON} /> Projets actifs
            </p>
            {projectsWithProgress.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Moy. {avgProgress}%</span>
            )}
          </div>

          {projectsWithProgress.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
              <p style={{ fontSize: 13 }}>Aucun projet actif</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Va dans Projets & Idées pour en créer un</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {projectsWithProgress.map(proj => (
                <div key={proj.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{proj.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0,
                      color: proj.progress >= 70 ? '#4ade80' : proj.progress >= 40 ? '#5B8DBF' : '#f97316' }}>
                      {proj.progress}%
                    </span>
                  </div>
                  <div style={{ background: 'var(--bar-bg)', borderRadius: 999, height: 7, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: `${proj.progress}%`, height: '100%',
                      background: proj.progress >= 70 ? '#4ade80' : proj.progress >= 40 ? '#5B8DBF' : '#f97316',
                      borderRadius: 999, transition: 'width .6s ease',
                      boxShadow: `0 0 6px ${proj.progress >= 70 ? '#4ade8060' : '#5B8DBF60'}` }} />
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                    {proj.taskDone}/{proj.taskCount} tâche{proj.taskCount !== 1 ? 's' : ''}
                    {proj.taskCount === 0 && ' · Lie des tâches à ce projet'}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 16,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: 'var(--surface-deep)', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#5B8DBF', margin: 0 }}>{activeProjects.length}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '3px 0 0' }}>Projets actifs</p>
            </div>
            <div style={{ background: 'var(--surface-deep)', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 18, fontWeight: 800, margin: 0,
                color: disciplineRate >= 80 ? '#4ade80' : disciplineRate >= 60 ? '#5B8DBF' : '#f87171' }}>
                {disciplineRate}%
              </p>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '3px 0 0' }}>Taux de discipline</p>
            </div>
          </div>
        </div>

      </div>

      {showReport && (
        <WeeklyReport
          tasks={tasks} expenses={expenses} subscriptions={subscriptions}
          projects={projects} devoirs={devoirs} examens={examens}
          profile={profile} streakData={streakData}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
