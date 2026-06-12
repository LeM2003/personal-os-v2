"use client"

import { useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useLS } from '../hooks/useLocalStorage'
import { todayISO, todayLabel, todayDay, greeting, fmtDate, daysUntil } from '../utils/dates'
import { PRIORITY_ORDER, PRIORITY_COLOR, CAT_COLORS } from '../utils/constants'
import { computeNextRenewal } from '../utils/subscriptions'
import type { Task, Exam, Homework, Subscription, AlertItem } from '@/types'
import StatCard from './shared/StatCard'
import MorningBriefing from './shared/MorningBriefing'
import InstallPrompt from './shared/InstallPrompt'
import SyncBadge from './shared/SyncBadge'
import EmptyState from './shared/EmptyState'
import SegmentedControl from './shared/SegmentedControl'
import AnimatedCounter from './shared/AnimatedCounter'
import StaggerList from './shared/StaggerList'
import TiltCard from './shared/TiltCard'
import GlowButton from './shared/GlowButton'
import {
  CloudSun, Cloud, CloudLightning, Moon as MoonIcon,
  Flame, TrendingUp, Target, ClipboardList, CheckCircle2,
  Receipt, GraduationCap, BookOpen, Repeat, Zap, Calendar,
  CreditCard, MapPin, Clock, Circle
} from 'lucide-react'

function isoMinusDays(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export default function Dashboard() {
  const { tasks, objectif, setObjectif, expenses, subscriptions,
  devoirs, examens, adjustments, courses, setTab, profile, streakData, setStreakData,
  budgets, projects, startPomo } = useApp()
  const [view, setView] = useLS<string>('pos_dashboard_view', 'today')

  const now     = todayISO()
  const dayName = todayDay()
  const JOURS_FR_LIST = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow     = tomorrowDate.toISOString().split('T')[0]
  const tomorrowDay  = JOURS_FR_LIST[tomorrowDate.getDay()]

  const createdToday   = tasks.filter(t => t.createdAt === now)
  const completedToday = createdToday.filter(t => t.status === 'Terminé').length
  const todayExpTotal  = expenses.filter(e => e.date === now).reduce((s, e) => s + e.amount, 0)
  const monthKey = now.slice(0, 7) // YYYY-MM
  const monthExpTotal = expenses.filter(e => (e.date || '').startsWith(monthKey)).reduce((s, e) => s + e.amount, 0)
  const monthBudget = Object.values(budgets || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)
  const budgetPct      = monthBudget > 0 ? Math.min(100, Math.round((monthExpTotal / monthBudget) * 100)) : 0
  const budgetRemaining= monthBudget - monthExpTotal
  const nextExam       = [...examens].filter(e => daysUntil(e.date) >= 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

  // Habitudes du jour
  const todayHabits = tasks.filter(t => {
    if (!t.recurring) return false
    if (t.recurrence === 'daily')   return true
    if (t.recurrence === 'weekly')  return (t.recurrenceDays || []).includes(dayName)
    if (t.recurrence === 'monthly') return t.deadline === now
    return false
  }).sort((a, b) => (a.recurrenceTime || '').localeCompare(b.recurrenceTime || ''))
  const habitsCompleted = todayHabits.filter(t => t.status === 'Terminé' && t.lastCompletedAt === now).length
  const habitsPct       = todayHabits.length > 0 ? Math.round((habitsCompleted / todayHabits.length) * 100) : 0

  const top3 = [...tasks].filter(t => t.status !== 'Terminé').sort((a, b) => (PRIORITY_ORDER[a.priority ?? ''] ?? 99) - (PRIORITY_ORDER[b.priority ?? ''] ?? 99)).slice(0, 3)
  // Focus du jour : la tâche unique à mettre en avant (non-habitude, non-terminée,
  // priorise deadline aujourd'hui puis haute priorité)
  const focus = [...tasks]
    .filter(t => t.status !== 'Terminé' && !t.recurring)
    .sort((a, b) => {
      const aDue = a.deadline === now ? 0 : 1
      const bDue = b.deadline === now ? 0 : 1
      if (aDue !== bDue) return aDue - bDue
      return (PRIORITY_ORDER[a.priority ?? ''] ?? 99) - (PRIORITY_ORDER[b.priority ?? ''] ?? 99)
    })[0]
  const todayCourses = courses
    .filter(c => c.jour === dayName)
    .filter(c => (!c.dateDebut || now >= c.dateDebut) && (!c.dateFin || now <= c.dateFin))
    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
  const todayExpenses= expenses.filter(e => e.date === now).sort((a, b) => b.amount - a.amount)
  // ── Données "Demain" ──
  const tomorrowCourses = courses
    .filter(c => c.jour === tomorrowDay)
    .filter(c => (!c.dateDebut || tomorrow >= c.dateDebut) && (!c.dateFin || tomorrow <= c.dateFin))
    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
  const tomorrowTasks = tasks.filter(t => !t.recurring && t.deadline === tomorrow && t.status !== 'Terminé')
  const tomorrowHabits = tasks.filter(t => {
    if (!t.recurring) return false
    if (t.recurrence === 'daily')   return true
    if (t.recurrence === 'weekly')  return (t.recurrenceDays || []).includes(tomorrowDay)
    if (t.recurrence === 'monthly') return t.deadline === tomorrow
    return false
  }).sort((a, b) => (a.recurrenceTime || '').localeCompare(b.recurrenceTime || ''))
  const tomorrowExamens = examens.filter(e => e.date === tomorrow)
  const tomorrowDevoirs = devoirs.filter(d => d.dateRendu === tomorrow && d.statut !== 'Rendu')
  const tomorrowTotal = tomorrowCourses.length + tomorrowTasks.length + tomorrowHabits.length + tomorrowExamens.length + tomorrowDevoirs.length

  const upcomingSubs = subscriptions
    .map(s => ({ ...s, _next: s.nextRenewal || computeNextRenewal(s.startDate || now, s.cycle || 'Mensuel') }))
    .filter(s => { const d = daysUntil(s._next); return d >= 0 && d <= 30 })
    .sort((a, b) => new Date(a._next).getTime() - new Date(b._next).getTime())

  /* ── Météo de la journée ── */
  const tasksDueToday   = tasks.filter(t => t.deadline === now && t.status !== 'Terminé' && !t.recurring).length
  const devoirsUrgCount = devoirs.filter(d => { const j = daysUntil(d.dateRendu); return d.statut !== 'Rendu' && j >= 0 && j <= 1 }).length
  const chargeScore     = todayCourses.length + tasksDueToday + devoirsUrgCount * 2
  const meteo = chargeScore === 0
    ? { label: 'Calme',   icon: <MoonIcon size={28} />, color: '#9ca3af', sub: 'Tu peux prendre de l\'avance' }
    : chargeScore <= 2
    ? { label: 'Légère',  icon: <CloudSun size={28} />, color: '#4ade80', sub: `${todayCourses.length + tasksDueToday} élément(s)` }
    : chargeScore <= 5
    ? { label: 'Normale', icon: <Cloud size={28} />, color: '#5B8DBF', sub: `${todayCourses.length + tasksDueToday} élément(s)` }
    : { label: 'Chargée', icon: <CloudLightning size={28} />, color: '#f87171', sub: 'Priorise maintenant' }

  /* ── Score de la semaine (7 derniers jours) ── */
  const weekScore = (() => {
    let created = 0, done = 0
    for (let i = 0; i < 7; i++) {
      const date = isoMinusDays(i)
      tasks.forEach(t => {
        if (t.createdAt === date) { created++; if (t.status === 'Terminé') done++ }
      })
    }
    return created > 0 ? Math.round((done / created) * 100) : 0
  })()

  /* ── Streak : mise à jour au montage si jour productif ── */
  useEffect(() => {
    const today = todayISO()
    if (streakData?.lastDate === today) return
    const isActive = completedToday > 0 || habitsCompleted > 0
    if (!isActive) return
    const d = new Date(); d.setDate(d.getDate() - 1)
    const yesterday = d.toISOString().split('T')[0]
    const consecutive = streakData?.lastDate === yesterday
    setStreakData({ count: consecutive ? (streakData.count || 0) + 1 : 1, lastDate: today })
  }, [completedToday, habitsCompleted]) // eslint-disable-line

  const streak = streakData?.count || 0

  /* ── Alertes ── */
  const alerts: AlertItem[] = []
  examens.filter(e => { const d = daysUntil(e.date); return d >= 0 && d <= 7 })
    .forEach(e => {
      const d = daysUntil(e.date)
      const label = d === 0 ? "AUJOURD'HUI" : d === 1 ? 'DEMAIN' : `J-${d}`
      alerts.push({ type: 'red', msg: `Examen ${label} : ${e.matiere} — ${fmtDate(e.date)}` })
    })
  devoirs.filter(d => d.statut !== 'Rendu' && daysUntil(d.dateRendu) >= 0 && daysUntil(d.dateRendu) <= 2)
    .forEach(d => alerts.push({ type: 'red', msg: `Devoir urgent J-${daysUntil(d.dateRendu)} : ${d.matiere}` }))
  upcomingSubs.filter(s => daysUntil(s._next) <= 7)
    .forEach(s => alerts.push({ type: 'yellow', msg: `${s.name} — paiement dans ${daysUntil(s._next)}j (${s.amount.toLocaleString('fr-FR')} FCFA)` }))
  devoirs.filter(d => d.statut !== 'Rendu' && daysUntil(d.dateRendu) < 0)
    .forEach(d => alerts.push({ type: 'red', msg: `Devoir en retard : ${d.matiere}` }))
  // Les ajustements deviennent un chip discret ci-dessous — plus d'alerte bleue

  return (
    <div>
      {/* ── En-tête large-title ── */}
      <header className="page-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="pulse-dot" style={{ width: 6, height: 6 }} />
            {todayLabel()}
            <SyncBadge />
          </p>
          <h1 className="page-title">
            {greeting()}, <span className="gradient-text-gold">{profile?.prenom || 'toi'}</span>
          </h1>
        </div>
      </header>

      {/* ── Carte installation PWA (contextuelle, 7j re-propose) ── */}
      <InstallPrompt variant="card" />

      {/* ── Briefing matin IA ── */}
      <MorningBriefing
        tasks={tasks}
        examens={examens}
        devoirs={devoirs}
        expenses={expenses}
        projects={projects || []}
        profile={profile}
        streakData={streakData}
      />

      {/* ── Switch de vue ── */}
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
        <SegmentedControl value={view} onChange={setView}
          options={[
            { value: 'today',    label: "Aujourd'hui" },
            { value: 'tomorrow', label: 'Demain', count: tomorrowTotal },
            { value: 'week',     label: 'Semaine' },
          ]} />
      </div>

      {view === 'today' && (<>
      {/* ── "À rattraper" — chip discret (remplace l'ancienne alerte bleue) ── */}
      {adjustments.length > 0 && (
        <div
          onClick={() => setTab('ajustements')}
          style={{
            marginBottom: 14,
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.22)',
            borderRadius: 10,
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: 999, background: '#f87171' }} />
          <div style={{ fontSize: 12.5, color: '#f87171', fontWeight: 500, flex: 1 }}>
            {adjustments.length} tâche{adjustments.length > 1 ? 's' : ''} à rattraper
          </div>
          <div style={{ fontSize: 12, color: '#f87171', fontWeight: 600 }}>Voir →</div>
        </div>
      )}

      {/* ── Focus du jour — hero unique ── */}
      {focus && (
        <TiltCard maxTilt={5} scale={1.015} glareEnabled={false} style={{
          marginBottom: 20, borderRadius: 20,
        }}>
        <div
          onClick={() => setTab('taches')}
          style={{
            cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(56,189,248,.08) 0%, rgba(129,140,248,.06) 50%, rgba(245,158,11,.04) 100%)',
            border: '1px solid rgba(56,189,248,.2)',
            borderRadius: 20,
            padding: '22px 24px',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,.25), 0 0 40px rgba(56,189,248,.04)',
          }}
        >
          {/* Top gradient line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--accent-1), var(--accent-2), var(--accent-3))' }} />
          {/* Background orb */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-1)', letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={11} /> Focus du jour
          </p>
          <h2 style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.6px', lineHeight: 1.2, color: 'var(--text)', maxWidth: 320, margin: '0 0 6px', position: 'relative' }}>
            {focus.name}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
            {focus.deadline === now ? '⚡ À rendre aujourd\'hui'
              : focus.deadline ? `📅 Échéance ${fmtDate(focus.deadline)}`
              : `🎯 Priorité ${focus.priority}`}
          </p>
          <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-block' }}>
            <GlowButton variant="primary" size="sm" onClick={() => startPomo(focus)}>Commencer →</GlowButton>
          </div>
        </div>
        </TiltCard>
      )}

      {/* ── Bannière Météo / Streak / Score ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {/* Météo */}
        <div className="card" style={{ padding: 'clamp(10px,2vw,16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${meteo.color}18`, border: `1px solid ${meteo.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: meteo.color, lineHeight: 1, fontSize: 18 }}>{meteo.icon}</span>
          </div>
          <div>
            <p style={{ fontSize: 'clamp(11px,2.5vw,14px)', fontWeight: 700, color: meteo.color, margin: 0, lineHeight: 1.2 }}>{meteo.label}</p>
            <p style={{ fontSize: 9, color: 'var(--muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: .5 }}>Journée</p>
          </div>
        </div>
        {/* Streak */}
        <div className="card" style={{ padding: 'clamp(10px,2vw,16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: streak >= 3 ? 'rgba(249,115,22,.15)' : 'rgba(100,116,139,.1)', border: `1px solid ${streak >= 3 ? 'rgba(249,115,22,.3)' : 'rgba(100,116,139,.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flame size={18} style={{ color: streak >= 7 ? '#f97316' : streak >= 3 ? '#fb923c' : 'var(--muted)' }} />
          </div>
          <div>
            <p style={{ fontSize: 'clamp(11px,2.5vw,14px)', fontWeight: 700, margin: 0, lineHeight: 1.2, color: streak >= 7 ? '#4ade80' : streak >= 3 ? '#fb923c' : 'var(--text)' }}>
              <AnimatedCounter value={streak} suffix="j" />
            </p>
            <p style={{ fontSize: 9, color: 'var(--muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: .5 }}>Streak</p>
          </div>
        </div>
        {/* Score SVG */}
        <div className="card" style={{ padding: 'clamp(10px,2vw,16px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 36, height: 36 }}>
            <svg width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(56,189,248,.12)" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="url(#sg2)" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(weekScore / 100) * 88} 88`}
                transform="rotate(-90 18 18)"
                style={{ transition: 'stroke-dasharray .8s' }}
              />
              <defs>
                <linearGradient id="sg2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent-1)" />
                  <stop offset="100%" stopColor="var(--accent-2)" />
                </linearGradient>
              </defs>
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--accent-1)' }}><AnimatedCounter value={weekScore} suffix="%" /></span>
          </div>
          <div>
            <p style={{ fontSize: 'clamp(11px,2.5vw,14px)', fontWeight: 700, margin: 0, lineHeight: 1.2, background: 'linear-gradient(135deg,var(--accent-1),var(--accent-2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {weekScore >= 70 ? 'Top' : weekScore >= 40 ? 'Bien' : 'Allez'}
            </p>
            <p style={{ fontSize: 9, color: 'var(--muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: .5 }}>Score 7j</p>
          </div>
        </div>
      </div>

      {/* ── Objectif ── */}
      <div style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(245,158,11,.07), rgba(56,189,248,.05))', border: '1px solid rgba(245,158,11,.2)', borderRadius: 16, padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, rgba(245,158,11,.5), rgba(56,189,248,.3), transparent)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-3)', letterSpacing: 1.5, textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Target size={11} /> Ce qui compte en ce moment
          </p>
          {objectif && <span style={{ fontSize: 10, color: '#4ade80', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>✓ Enregistré</span>}
        </div>
        <input value={objectif} onChange={e => setObjectif(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 17, fontWeight: 600, fontFamily: 'var(--font-fraunces, Fraunces)', padding: 0, boxShadow: 'none', letterSpacing: '-.3px' }}
          placeholder="Une phrase. Celle que tu n'oublies pas." />
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }} className="grid-kpi">
        <StatCard icon={<ClipboardList size={24} color="#5B8DBF" />} value={<AnimatedCounter value={createdToday.length} />} label="Tâches du jour" color="#5B8DBF" />
        <StatCard icon={<CheckCircle2 size={24} color="#4ade80" />} value={<AnimatedCounter value={completedToday} />} label="Terminées" color="#4ade80" />
        <StatCard icon={<Receipt size={24} color="#60a5fa" />} value={<AnimatedCounter value={todayExpTotal} suffix=" F" />} label="Dépensé aujourd'hui" color="#60a5fa" />
        <StatCard icon={nextExam ? <GraduationCap size={24} color="#f87171" /> : <BookOpen size={24} color="#9ca3af" />}
          value={nextExam ? `J-${daysUntil(nextExam.date)}` : '—'}
          label={nextExam ? nextExam.matiere : 'Pas d\'examen'} color={nextExam ? '#f87171' : '#9ca3af'} />
      </div>

  {/* ── Budget du mois ── */}
  <div className="card" style={{ padding: '16px 20px', marginBottom: 24, cursor: 'pointer' }} onClick={() => setTab('finances')}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
  <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, margin: 0 }}>
  <CreditCard size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Budget du mois
  </p>
  <span style={{ fontSize: 11, color: 'var(--accent-1)', fontWeight: 600 }}>Configurer →</span>
  </div>
  {monthBudget > 0 ? (
  <>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
  <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Fraunces',
  color: budgetPct >= 100 ? '#f87171' : budgetPct >= 80 ? '#fb923c' : '#4ade80' }}>
  <AnimatedCounter value={monthExpTotal} suffix=" F" />
  </span>
  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
  sur {monthBudget.toLocaleString('fr-FR')} F (<AnimatedCounter value={budgetPct} suffix="%" />)
  </span>
  </div>
  <div className="progress-track" style={{ marginBottom: 6 }}>
  <div className="progress-fill" style={{
  width: `${budgetPct}%`,
  background: budgetPct >= 100 ? '#f87171' : budgetPct >= 80 ? '#fb923c' : '#4ade80'
  }} />
  </div>
  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
  {budgetRemaining >= 0
  ? <>Il te reste <strong style={{ color: 'var(--text)' }}>{budgetRemaining.toLocaleString('fr-FR')} F</strong> ce mois</>
  : <>Tu as depasse de <strong style={{ color: '#f87171' }}>{Math.abs(budgetRemaining).toLocaleString('fr-FR')} F</strong></>}
  </p>
  </>
  ) : (
  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
  Fixe tes budgets par catégorie dans l'onglet Finances. Total ce mois : <strong style={{ color: 'var(--text)' }}>{monthExpTotal.toLocaleString('fr-FR')} F</strong>
  </p>
  )}
  </div>

      {/* ── Alertes ── */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map((a, i) => (
            <div key={i} className={`alert alert-${a.type}`}>{a.msg}</div>
          ))}
        </div>
      )}

      {/* ── Layout 2 col ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }} className="grid-2">
        {/* Habitudes */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, margin: 0 }}>
              <Repeat size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Habitudes du jour
            </p>
            <span style={{ fontSize: 14, fontWeight: 700,
              color: habitsPct >= 80 ? '#4ade80' : habitsPct >= 50 ? '#5B8DBF' : '#f87171' }}>
              {habitsPct}%
            </span>
          </div>
          {todayHabits.length === 0
            ? <EmptyState mark="bars" tone="muted" title="Pas d'habitudes prévues. Repos." />
            : <StaggerList>
              {todayHabits.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
                  borderBottom: '1px solid var(--border)' }}>
                  <span style={{ display: 'inline-flex' }}>
                    {t.status === 'Terminé' && t.lastCompletedAt === now
                      ? <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
                      : <Circle size={16} style={{ color: 'var(--muted)' }} />}
                  </span>
                  <span style={{ flex: 1, fontSize: 13,
                    color: t.status === 'Terminé' && t.lastCompletedAt === now ? 'var(--muted)' : 'var(--text)',
                    textDecoration: t.status === 'Terminé' && t.lastCompletedAt === now ? 'line-through' : 'none' }}>
                    {t.name}
                  </span>
                  {t.recurrenceTime && <span style={{ fontSize: 11, color: '#5B8DBF', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {t.recurrenceTime}</span>}
                </div>
              ))}
            </StaggerList>
          }
        </div>

        {/* Top 3 */}
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 14 }}>
            <Zap size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Top priorités
          </p>
          {top3.length === 0
            ? <EmptyState mark="rings" tone="success" title="Tout est terminé. Profite." />
            : <StaggerList>
              {top3.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => setTab('taches')}>
                  <span style={{ color: '#5B8DBF', fontFamily: 'Fraunces', fontWeight: 700, fontSize: 14 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: PRIORITY_COLOR[t.priority ?? ''] }}>{t.priority}</span>
                      {t.deadline && <span style={{ fontSize: 10, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 2 }}><Calendar size={10} /> {fmtDate(t.deadline)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </StaggerList>
          }
        </div>
      </div>

      {/* ── Cours du jour + Dépenses ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }} className="grid-2">
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 14 }}>
            <BookOpen size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Cours aujourd'hui
          </p>
          {todayCourses.length === 0
            ? <EmptyState mark="grid" tone="muted" title="Pas de cours. Journée à toi." />
            : <StaggerList>
              {todayCourses.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 4, height: 32, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: c.color }}>{c.nom}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>
                      {c.heureDebut}–{c.heureFin}{c.salle && <> · <MapPin size={10} style={{ display: 'inline', verticalAlign: -1 }} /> {c.salle}</>}
                    </p>
                  </div>
                </div>
              ))}
            </StaggerList>
          }
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, margin: 0 }}>
              <Receipt size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Dépenses du jour
            </p>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#5B8DBF' }}>
              {todayExpTotal.toLocaleString('fr-FR')} F
            </span>
          </div>
          {todayExpenses.length === 0
            ? <EmptyState mark="stack" tone="muted" title="Rien dépensé aujourd'hui. Rare, profite." />
            : <StaggerList>
              {todayExpenses.slice(0, 5).map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0',
                  borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[e.category ?? ''] || '#6b7280' }} />
                  <span style={{ flex: 1, fontSize: 13 }}>{e.note || e.category}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#5B8DBF' }}>
                    {e.amount.toLocaleString('fr-FR')} F
                  </span>
                </div>
              ))}
            </StaggerList>
          }
        </div>
      </div>
      </>)}

      {view === 'tomorrow' && (
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, margin: 0 }}>
            <Calendar size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Demain — {tomorrowDay.toLowerCase()} {fmtDate(tomorrow)}
          </p>
          {tomorrowTotal > 0 && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {tomorrowTotal} élément{tomorrowTotal > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {tomorrowTotal === 0 ? (
          <EmptyState mark="arc" tone="muted" title="Demain, rien de prévu." subtitle="Profites-en pour prendre de l'avance." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }} className="grid-2">
            {/* Cours */}
            {tomorrowCourses.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 6 }}>
                  <BookOpen size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} /> Cours ({tomorrowCourses.length})
                </p>
                {tomorrowCourses.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 12 }}>
                    <div style={{ width: 3, height: 18, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                    <span style={{ color: c.color, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>{c.heureDebut}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tâches à deadline */}
            {tomorrowTasks.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 6 }}>
                  <ClipboardList size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} /> Tâches à rendre ({tomorrowTasks.length})
                </p>
                {tomorrowTasks.map(t => (
                  <div key={t.id} onClick={() => setTab('taches')} style={{ cursor: 'pointer', padding: '5px 0', fontSize: 12 }}>
                    <span style={{ color: PRIORITY_COLOR[t.priority ?? ''], fontSize: 10, marginRight: 5 }}>●</span>
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Habitudes */}
            {tomorrowHabits.length > 0 && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 6 }}>
                  <Repeat size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} /> Habitudes ({tomorrowHabits.length})
                </p>
                {tomorrowHabits.slice(0, 5).map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', fontSize: 12 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                    {t.recurrenceTime && <span style={{ color: '#5B8DBF', fontSize: 11 }}>{t.recurrenceTime}</span>}
                  </div>
                ))}
                {tomorrowHabits.length > 5 && (
                  <p style={{ fontSize: 10, color: 'var(--muted)', margin: '4px 0 0' }}>+ {tomorrowHabits.length - 5} autres</p>
                )}
              </div>
            )}

            {/* Examens + Devoirs */}
            {(tomorrowExamens.length > 0 || tomorrowDevoirs.length > 0) && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 6 }}>
                  <GraduationCap size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} /> École ({tomorrowExamens.length + tomorrowDevoirs.length})
                </p>
                {tomorrowExamens.map(e => (
                  <div key={e.id} onClick={() => setTab('ecole')}
                    style={{ cursor: 'pointer', padding: '5px 0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <GraduationCap size={12} style={{ color: '#f87171', flexShrink: 0 }} />
                    <span style={{ color: '#f87171', fontWeight: 600 }}>{e.matiere}</span>
                    {e.heure && <span style={{ color: 'var(--muted)', marginLeft: 4 }}>{e.heure}</span>}
                  </div>
                ))}
                {tomorrowDevoirs.map(d => (
                  <div key={d.id} onClick={() => setTab('ecole')}
                    style={{ cursor: 'pointer', padding: '5px 0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ClipboardList size={12} style={{ color: '#fb923c', flexShrink: 0 }} />
                    <span style={{ color: '#fb923c' }}>{d.matiere}</span>
                    {d.description && <span style={{ color: 'var(--muted)', marginLeft: 4, fontSize: 11 }}>— {d.description}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      )}

      {view === 'week' && <WeekView
        tasks={tasks} examens={examens} devoirs={devoirs}
        upcomingSubs={upcomingSubs} weekScore={weekScore} setTab={setTab}
      />}
    </div>
  )
}

interface WeekViewProps {
  tasks: Task[]
  examens: Exam[]
  devoirs: Homework[]
  upcomingSubs: (Subscription & { _next: string })[]
  weekScore: number
  setTab: (v: string | ((prev: string) => string)) => void
}

function WeekView({ tasks, examens, devoirs, upcomingSubs, weekScore, setTab }: WeekViewProps) {
  const today = todayISO()
  const in7 = new Date(); in7.setDate(in7.getDate() + 7)
  const in7ISO = in7.toISOString().split('T')[0]

  const weekExamens = examens
    .filter((e: Exam) => e.date >= today && e.date <= in7ISO)
    .sort((a: Exam, b: Exam) => a.date.localeCompare(b.date))
  const weekDevoirs = devoirs
    .filter((d: Homework) => d.statut !== 'Rendu' && d.dateRendu >= today && d.dateRendu <= in7ISO)
    .sort((a: Homework, b: Homework) => a.dateRendu.localeCompare(b.dateRendu))
  const weekTasks = tasks
    .filter((t: Task) => !t.recurring && t.deadline && t.deadline >= today && t.deadline <= in7ISO && t.status !== 'Terminé')
    .sort((a: Task, b: Task) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))

  return (
    <>
      {/* Score 7j en grand */}
      <div className="card" style={{ padding: 20, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 16 }}>
        <TrendingUp size={36} style={{ color: weekScore >= 70 ? '#4ade80' : weekScore >= 40 ? '#5B8DBF' : '#f87171' }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .7, margin: 0 }}>Score 7 jours</p>
          <p style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Fraunces', margin: '2px 0',
            color: weekScore >= 70 ? '#4ade80' : weekScore >= 40 ? '#5B8DBF' : '#f87171' }}>
            {weekScore}%
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            {weekScore >= 70 ? 'Belle semaine — tu tiens la cadence' : weekScore >= 40 ? 'Correct, on peut mieux' : 'Cette semaine, on se remet dedans'}
          </p>
        </div>
      </div>

      {/* Examens à venir */}
      <div className="card" style={{ padding: 20, marginBottom: 18 }}>
        <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 14 }}>
          <GraduationCap size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Examens (7j) {weekExamens.length > 0 && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>— {weekExamens.length}</span>}
        </p>
        {weekExamens.length === 0
          ? <EmptyState mark="grid" tone="muted" title="Aucun examen cette semaine." />
          : weekExamens.map(e => (
            <div key={e.id} onClick={() => setTab('ecole')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ fontSize: 11, color: '#f87171', fontWeight: 700, minWidth: 42 }}>J-{daysUntil(e.date)}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{e.matiere}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>
                  {fmtDate(e.date)}{e.heure && ` · ${e.heure}`}{e.salle && ` · ${e.salle}`}
                </p>
              </div>
            </div>
          ))
        }
      </div>

      {/* Devoirs à rendre */}
      <div className="card" style={{ padding: 20, marginBottom: 18 }}>
        <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 14 }}>
          <ClipboardList size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Devoirs à rendre (7j) {weekDevoirs.length > 0 && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>— {weekDevoirs.length}</span>}
        </p>
        {weekDevoirs.length === 0
          ? <EmptyState mark="rings" tone="success" title="Rien à rendre cette semaine." />
          : weekDevoirs.map(d => (
            <div key={d.id} onClick={() => setTab('ecole')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ fontSize: 11, color: '#fb923c', fontWeight: 700, minWidth: 42 }}>J-{daysUntil(d.dateRendu)}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{d.matiere}</p>
                {d.description && <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>{d.description}</p>}
              </div>
            </div>
          ))
        }
      </div>

      {/* Tâches à échéance */}
      {weekTasks.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 18 }}>
          <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 14 }}>
            <Zap size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Tâches avec deadline (7j) — {weekTasks.length}
          </p>
          {weekTasks.map(t => (
            <div key={t.id} onClick={() => setTab('taches')}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <span style={{ fontSize: 11, color: '#5B8DBF', fontWeight: 700, minWidth: 42 }}>J-{daysUntil(t.deadline)}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{t.name}</p>
                <p style={{ fontSize: 11, color: PRIORITY_COLOR[t.priority ?? ''], margin: '2px 0 0' }}>{t.priority}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Abonnements à venir */}
      {upcomingSubs.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 14 }}>
            <CreditCard size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Prochains paiements (30j)
          </p>
          {upcomingSubs.slice(0, 5).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0',
              borderBottom: '1px solid var(--border)' }}>
              <Calendar size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{s.name}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>
                  {fmtDate(s._next)} — J-{daysUntil(s._next)}
                </p>
              </div>
              <span style={{ fontWeight: 700, color: '#5B8DBF', fontSize: 13 }}>
                {s.amount.toLocaleString('fr-FR')} F
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
