"use client"

import { safeParse } from '../../utils/safeParse'
import type { Project, ProjectStatus, Task } from '@/types'
import { Pencil, X } from 'lucide-react'

export const KANBAN_COLS = [
  { id: 'Backlog', label: 'Backlog', color: '#64748b', bg: 'rgba(100,116,139,.08)' },
  { id: 'En cours', label: 'En cours', color: '#38bdf8', bg: 'rgba(56,189,248,.08)' },
  { id: 'En pause', label: 'En pause', color: '#fbbf24', bg: 'rgba(251,191,36,.08)' },
  { id: 'Terminé', label: 'Terminé', color: '#4ade80', bg: 'rgba(74,222,128,.08)' },
  { id: 'Abandonné', label: 'Abandonné', color: '#f87171', bg: 'rgba(248,113,113,.06)' },
]

interface KanbanCardProps {
  proj: Project
  tasks: Task[]
  calcProgress: (proj: Project) => number
  updateStatus: (projId: string, status: ProjectStatus) => void
  onEdit: (proj: Project) => void
  del: (id: string) => void
}

function KanbanCard({ proj, tasks, calcProgress, updateStatus, onEdit, del }: KanbanCardProps) {
  const tone = proj.name ? (() => {
    const n = proj.name; let h = 0
    for (let i = 0; i < n.length; i++) h = (h + n.charCodeAt(i)) % 5
    return [
      { accent: '#38bdf8' }, { accent: '#a78bfa' }, { accent: '#fb923c' },
      { accent: '#4ade80' }, { accent: '#f87171' },
    ][h]
  })() : { accent: '#38bdf8' }

  const linked = tasks.filter(t => t.project === proj.name)
  const pct = calcProgress(proj)
  const status: ProjectStatus = proj.status || 'En cours'
  const cols = KANBAN_COLS.map(c => c.id)
  const curIdx = cols.indexOf(status)
  const canPrev = curIdx > 0
  const canNext = curIdx < cols.length - 1
  const analysis = safeParse<{ score_faisabilite?: number } | null>(proj.aiAnalysis, null)

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 10, backdropFilter: 'blur(8px)', position: 'relative', overflow: 'hidden', transition: 'transform .2s, box-shadow .2s' }}
    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.2)' }}
    onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${tone.accent}, transparent)` }} />

    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
      <p style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 14, fontWeight: 700, margin: 0, flex: 1, lineHeight: 1.3, color: 'var(--text)', wordBreak: 'break-word' }}>{proj.name}</p>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button className="btn-icon" title="Modifier" onClick={() => onEdit(proj)} style={{ width: 24, height: 24 }}><Pencil size={12} /></button>
        <button className="btn-icon" title="Supprimer" onClick={() => del(proj.id)} style={{ width: 24, height: 24, color: '#f87171' }}><X size={12} /></button>
      </div>
    </div>

    {proj.objective && (
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
        {proj.objective}
      </p>
    )}

    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6 }}>Progression</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: tone.accent }}>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${tone.accent}, ${tone.accent}99)` }} />
      </div>
    </div>

    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
      {linked.length > 0 && (
        <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--surface-elevated)', padding: '2px 8px', borderRadius: 999 }}>
          {linked.filter(t => t.status === 'Terminé').length}/{linked.length} tâches
        </span>
      )}
      {proj.targetDate && (
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>📅 {proj.targetDate}</span>
      )}
      {analysis && (
        <span style={{ fontSize: 10, color: '#4ade80', background: 'rgba(74,222,128,.1)', padding: '2px 8px', borderRadius: 999 }}>
          IA {analysis.score_faisabilite}/10
        </span>
      )}
    </div>

    <div style={{ display: 'flex', gap: 6 }}>
      {canPrev && (
        <button onClick={() => updateStatus(proj.id, cols[curIdx - 1] as ProjectStatus)}
        style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-dm-sans, DM Sans)', transition: 'all .15s' }}
        onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-1)'; e.currentTarget.style.color = 'var(--accent-1)' }}
        onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
        ← {cols[curIdx - 1]}
        </button>
      )}
      {canNext && (
        <button onClick={() => updateStatus(proj.id, cols[curIdx + 1] as ProjectStatus)}
        style={{ flex: 1, padding: '6px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', cursor: 'pointer', fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-dm-sans, DM Sans)', transition: 'all .15s' }}
        onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-1)'; e.currentTarget.style.color = 'var(--accent-1)' }}
        onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}>
        {cols[curIdx + 1]} →
        </button>
      )}
    </div>
  </div>
  )
}

interface ProjectKanbanProps {
  projects: Project[]
  tasks: Task[]
  calcProgress: (proj: Project) => number
  updateStatus: (projId: string, status: ProjectStatus) => void
  onEdit: (proj: Project) => void
  del: (id: string) => void
}

export default function ProjectKanban({ projects, tasks, calcProgress, updateStatus, onEdit, del }: ProjectKanbanProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24, overflowX: 'auto' }}
    className="kanban-grid">
    {KANBAN_COLS.map(col => {
      const colProjects = projects.filter(p => (p.status || 'En cours') === col.id)
      return (
        <div key={col.id} style={{ minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: col.bg, border: `1px solid ${col.color}20` }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, boxShadow: `0 0 6px ${col.color}` }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: .8 }}>{col.label}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: col.color, background: `${col.color}20`, borderRadius: 999, padding: '1px 8px', fontWeight: 700 }}>{colProjects.length}</span>
          </div>
          <div style={{ minHeight: 80 }}>
            {colProjects.length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 12, opacity: .6 }}>
                Aucun projet
              </div>
            ) : colProjects.map(proj => (
              <KanbanCard key={proj.id} proj={proj} tasks={tasks} calcProgress={calcProgress} updateStatus={updateStatus} onEdit={onEdit} del={del} />
            ))}
          </div>
        </div>
      )
    })}
  </div>
  )
}
