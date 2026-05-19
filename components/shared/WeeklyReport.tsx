"use client"

import { useRef, useState } from 'react'
import { todayISO, fmtDate, daysUntil, todayDay } from '../../utils/dates'
import type { Task, Expense, Subscription, Project, Homework, Exam, UserProfile, StreakData } from '@/types'

function isoMinusDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function SmallRing({ pct, size = 56, strokeWidth = 5, color }: { pct: number; size?: number; strokeWidth?: number; color: string }) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bar-bg)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color }}>{pct}%</span>
    </div>
  )
}

function StatBox({ label, value, sub, color = '#5B8DBF' }: { label: string; value: React.ReactNode; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface-deep)', borderRadius: 10, padding: '12px 14px', flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 11, color: '#6b7280', margin: 0, marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 800, color, margin: 0, fontFamily: 'Fraunces' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0' }}>{sub}</p>}
    </div>
  )
}

interface WeeklyReportProps {
  tasks: Task[]
  expenses: Expense[]
  subscriptions: Subscription[]
  projects: Project[]
  devoirs: Homework[]
  examens: Exam[]
  profile: UserProfile | null
  streakData: StreakData
  onClose: () => void
}

export default function WeeklyReport({ tasks, expenses, subscriptions, projects, devoirs, examens, profile, streakData, onClose }: WeeklyReportProps) {
  const reportRef = useRef(null)
  const [exporting, setExporting] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAiError] = useState('')

  const today = todayISO()
  const dayName = todayDay()

  // Week range
  const weekStart = isoMinusDays(6)
  const weekLabel = `${fmtDate(weekStart)} — ${fmtDate(today)}`

  // Tasks stats (7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const date = isoMinusDays(6 - i)
    const d = new Date(date + 'T00:00:00')
    const label = JOURS_FR[d.getDay()].slice(0, 3)
    const created = tasks.filter(t => t.createdAt === date).length
    const done = tasks.filter(t => t.createdAt === date && t.status === 'Terminé').length
    return { date, label, created, done }
  })
  const totalCreated = last7.reduce((s, d) => s + d.created, 0)
  const totalDone = last7.reduce((s, d) => s + d.done, 0)
  const completionRate = totalCreated > 0 ? Math.round((totalDone / totalCreated) * 100) : 0

  // Habits
  const todayHabits = tasks.filter(t => {
    if (!t.recurring) return false
    if (t.recurrence === 'daily') return true
    if (t.recurrence === 'weekly') return (t.recurrenceDays || []).includes(dayName)
    if (t.recurrence === 'monthly') return t.deadline === today
    return false
  })
  const habitsDoneToday = todayHabits.filter(t => t.status === 'Terminé' && t.lastCompletedAt === today).length
  const habitsPct = todayHabits.length > 0 ? Math.round((habitsDoneToday / todayHabits.length) * 100) : 0

  // Expenses this week
  const weekExpenses = expenses.filter(e => e.date >= weekStart && e.date <= today)
  const weekTotal = weekExpenses.reduce((s, e) => s + e.amount, 0)
  const topCats = Object.entries(
    weekExpenses.reduce<Record<string, number>>((acc, e) => { const key = e.category ?? 'Autre'; acc[key] = (acc[key] || 0) + e.amount; return acc }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 3)

  // School
  const devoirsRendus = devoirs.filter(d => d.statut === 'Rendu').length
  const devoirsRate = devoirs.length > 0 ? Math.round((devoirsRendus / devoirs.length) * 100) : 0
  const nextExam = [...examens].filter(e => daysUntil(e.date) >= 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
  const revisionRate = (() => {
    const total = examens.reduce((s, e) => s + (e.totalChapitres || 0), 0)
    const done = examens.reduce((s, e) => s + (e.chapitresRevises || 0), 0)
    return total > 0 ? Math.round((done / total) * 100) : 0
  })()

  // Projects
  const activeProjects = projects.filter(p => p.status !== 'Archivé')

  // Priority breakdown
  const critDone = tasks.filter(t => t.priority === 'Critique' && t.status === 'Terminé').length
  const critTotal = tasks.filter(t => t.priority === 'Critique').length

  // Score global
  const globalScore = Math.round(
    (completionRate * 0.35) + (habitsPct * 0.25) + (devoirsRate * 0.2) + (revisionRate * 0.2)
  )
  const scoreColor = globalScore >= 75 ? '#4ade80' : globalScore >= 50 ? '#5B8DBF' : globalScore >= 30 ? '#f97316' : '#f87171'

  const maxBar = Math.max(...last7.map(d => d.created), 1)

  const exportPNG = async () => {
    if (!reportRef.current) return
    setExporting(true)
    try {
      // Native share API (mobile) — pas besoin de html2canvas
      if (navigator.share) {
        try {
          const text = `Mon rapport hebdo — Personal OS\nScore: ${globalScore}/100\nTâches: ${totalDone}/${totalCreated}\nHabitudes: ${habitsPct}%\nScore global: ${globalScore}/100`
          await navigator.share({ title: 'Mon rapport hebdo — Personal OS', text })
          setExporting(false)
          return
        } catch { /* user cancelled or not supported with files */ }
      }

      // Fallback: copier le rapport dans le presse-papier
      const text = `📊 Rapport hebdo — Personal OS\n\n🏆 Score: ${globalScore}/100\n✅ Tâches: ${totalDone}/${totalCreated}\n🔥 Habitudes: ${habitsPct}%\n📚 Devoirs: ${devoirsRate}%\n📝 Révisions: ${revisionRate}%`
      try {
        await navigator.clipboard.writeText(text)
        alert('Rapport copié dans le presse-papier !')
      } catch {
        alert('Partage non disponible sur ce navigateur.')
      }
    } catch (e) {
      console.error('Export error:', e)
    } finally {
      setExporting(false)
    }
  }

  const generateAI = async () => {
    setLoadingAI(true)
    setAiError('')
    const prompt = [
      `Semaine du ${weekLabel} — Rapport de ${profile?.prenom || 'l\'utilisateur'}`,
      `Tâches : ${totalDone} terminées sur ${totalCreated} créées (${completionRate}%)`,
      `Streak : ${streakData?.count || 0} jour(s) consécutifs`,
      `Dépenses : ${expenses.filter(e => e.date >= weekStart).reduce((s,e)=>s+e.amount,0).toLocaleString('fr-FR')} FCFA cette semaine`,
      `Devoirs rendus : ${devoirsRendus}/${devoirs.length}`,
      nextExam ? `Prochain examen : ${nextExam.matiere} dans ${daysUntil(nextExam.date)} jour(s)` : 'Aucun examen proche',
      activeProjects.length ? `Projets actifs : ${activeProjects.slice(0,3).map(p=>p.name).join(', ')}` : '',
    ].filter(Boolean).join('\n')

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'weekly_report', messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiSummary(data.content || '')
    } catch (e) {
      setAiError('Erreur IA — ' + (e instanceof Error ? e.message : 'inconnu'))
    } finally {
      setLoadingAI(false)
    }
  }

  const fmtFCFA = (n: number) => n.toLocaleString('fr-FR') + ' F'

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ maxWidth: 480, maxHeight: '90vh', overflow: 'auto', margin: '20px auto' }}>

        {/* Exportable report card */}
        <div ref={reportRef} style={{
          background: '#0B1220', borderRadius: 16, overflow: 'hidden',
          fontFamily: "'DM Sans', sans-serif", color: '#f0f4f8',
        }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #5B8DBF 0%, #4A7AAC 100%)',
            padding: '20px 24px', color: '#0B1220' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, fontFamily: 'Fraunces' }}>
                  Rapport Hebdo
                </h2>
                <p style={{ fontSize: 13, margin: '4px 0 0', opacity: 0.8 }}>
                  {profile?.prenom || 'Personal OS'} — {weekLabel}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <SmallRing pct={globalScore} size={52} strokeWidth={4} color={globalScore >= 60 ? '#0B1220' : '#f87171'} />
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 20px 20px' }}>

            {/* KPIs row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <StatBox label="Taches terminees" value={`${totalDone}/${totalCreated}`}
                sub={`${completionRate}% de completion`}
                color={completionRate >= 70 ? '#4ade80' : completionRate >= 40 ? '#5B8DBF' : '#f87171'} />
              <StatBox label="Streak" value={`${streakData?.count || 0}j`}
                sub="jours consecutifs" color="#f59e0b" />
              <StatBox label="Depenses" value={fmtFCFA(weekTotal)}
                sub="cette semaine" color="#60a5fa" />
            </div>

            {/* Mini bar chart */}
            <div style={{ background: '#111827', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, fontWeight: 600 }}>ACTIVITE 7 JOURS</p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 50 }}>
                {last7.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 40 }}>
                      <div style={{
                        width: '100%', borderRadius: '3px 3px 0 0',
                        background: d.done > 0 ? '#4ade80' : d.created > 0 ? '#5B8DBF' : 'var(--bar-bg)',
                        height: `${Math.max((d.created / maxBar) * 100, 4)}%`,
                        minHeight: 3,
                      }} />
                    </div>
                    <span style={{ fontSize: 9, color: d.date === today ? '#5B8DBF' : '#6b7280', fontWeight: d.date === today ? 700 : 400 }}>
                      {d.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2-col grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {/* Habits */}
              <div style={{ background: '#111827', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>DISCIPLINE</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SmallRing pct={habitsPct} size={44} strokeWidth={4}
                    color={habitsPct >= 75 ? '#4ade80' : habitsPct >= 50 ? '#5B8DBF' : '#f87171'} />
                  <div>
                    <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>
                      {habitsDoneToday}/{todayHabits.length}
                    </p>
                    <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>habitudes du jour</p>
                  </div>
                </div>
              </div>

              {/* School */}
              <div style={{ background: '#111827', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>ECOLE</p>
                <p style={{ fontSize: 13, margin: '0 0 3px', fontWeight: 600, color: '#8b5cf6' }}>
                  {devoirsRendus}/{devoirs.length} devoirs
                </p>
                {nextExam && (
                  <p style={{ fontSize: 11, color: '#f59e0b', margin: 0 }}>
                    Prochain exam : {nextExam.matiere} (J-{daysUntil(nextExam.date)})
                  </p>
                )}
                {!nextExam && (
                  <p style={{ fontSize: 11, color: '#4ade80', margin: 0 }}>Pas d'examen proche</p>
                )}
              </div>
            </div>

            {/* Top depenses */}
            {topCats.length > 0 && (
              <div style={{ background: '#111827', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>TOP DEPENSES</p>
                {topCats.map(([cat, amount]) => {
                  const pct = weekTotal > 0 ? Math.round((amount / weekTotal) * 100) : 0
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, width: 80, color: 'var(--muted)' }}>{cat}</span>
                      <div style={{ flex: 1, background: 'var(--bar-bg)', borderRadius: 4, height: 8 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#60a5fa', width: 70, textAlign: 'right' }}>{fmtFCFA(amount)}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Active projects */}
            {activeProjects.length > 0 && (
              <div style={{ background: '#111827', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>PROJETS ACTIFS</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {activeProjects.slice(0, 4).map(p => {
                    const linked = tasks.filter(t => t.project === p.name)
                    const done = linked.filter(t => t.status === 'Terminé').length
                    const pct = linked.length > 0 ? Math.round((done / linked.length) * 100) : 0
                    return (
                      <div key={p.id} style={{ background: 'var(--surface-deep)', borderRadius: 8, padding: '8px 12px', flex: '1 1 45%', minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <div style={{ flex: 1, background: 'var(--bar-bg)', borderRadius: 3, height: 5 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#5B8DBF', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 10, color: '#5B8DBF' }}>{pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Résumé IA ── */}
            {aiSummary && (
              <div style={{ background: 'linear-gradient(135deg, rgba(56,189,248,.08), rgba(129,140,248,.06))', border: '1px solid rgba(56,189,248,.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #38bdf8, #818cf8)' }} />
                <p style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8', letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  🤖 Résumé IA
                </p>
                <p style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {aiSummary}
                </p>
              </div>
            )}

            {/* Footer watermark */}
            <div style={{ textAlign: 'center', paddingTop: 8 }}>
              <p style={{ fontSize: 10, color: '#374151', margin: 0 }}>
                Personal OS Dashboard — {fmtDate(today)}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons (outside exportable area) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {/* Bouton IA */}
          {!aiSummary && (
            <button
              onClick={generateAI}
              disabled={loadingAI}
              style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(56,189,248,.3)', background: 'linear-gradient(135deg, rgba(56,189,248,.1), rgba(129,140,248,.08))', color: loadingAI ? 'var(--muted)' : 'var(--accent-1)', cursor: loadingAI ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-dm-sans, DM Sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s' }}>
              {loadingAI
                ? <><span className="spinner" />Analyse en cours…</>
                : <>🤖 Générer le résumé IA</>}
            </button>
          )}
          {aiError && <p style={{ fontSize: 12, color: '#f87171', textAlign: 'center', margin: 0 }}>{aiError}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn-gold" onClick={exportPNG} disabled={exporting}
              style={{ fontSize: 14, padding: '10px 24px', opacity: exporting ? 0.6 : 1 }}>
              {exporting ? '⏳ Export...' : '📤 Exporter / Partager'}
            </button>
            <button className="btn-ghost" onClick={onClose} style={{ fontSize: 14, padding: '10px 20px' }}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
