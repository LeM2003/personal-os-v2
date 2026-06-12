"use client"

import { useState, useRef, useEffect } from 'react'
import { fmtDate } from '../../utils/dates'
import { Receipt } from 'lucide-react'
import type { Task, Homework, Exam, Project, Expense } from '@/types'

interface GlobalSearchProps {
  tasks: Task[]
  devoirs: Homework[]
  examens: Exam[]
  projects: Project[]
  expenses: Expense[]
  onNavigate: (tab: string) => void
  onClose: () => void
}

export default function GlobalSearch({ tasks, devoirs, examens, projects, expenses, onNavigate, onClose }: GlobalSearchProps) {
const [query, setQuery] = useState('')
const inputRef = useRef<HTMLInputElement>(null)

useEffect(() => { inputRef.current?.focus() }, [])

useEffect(() => {
  const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [onClose])

const q = query.toLowerCase().trim()

const matchedTasks = q ? tasks.filter((t: Task) =>
  t.name.toLowerCase().includes(q) ||
  (t.project || '').toLowerCase().includes(q)
).slice(0, 8) : []

const matchedDevoirs = q ? devoirs.filter((d: Homework) =>
  d.matiere.toLowerCase().includes(q) ||
  (d.description || '').toLowerCase().includes(q)
).slice(0, 5) : []

const matchedExamens = q ? examens.filter((e: Exam) =>
  e.matiere.toLowerCase().includes(q) ||
  (e.chapitres || '').toLowerCase().includes(q)
).slice(0, 5) : []

  const matchedProjects = q ? projects.filter((p: Project) =>
    p.name.toLowerCase().includes(q) ||
    (p.objective || '').toLowerCase().includes(q)
  ).slice(0, 5) : []

  const matchedExpenses = q ? expenses.filter((e: Expense) =>
    (e.note || '').toLowerCase().includes(q) ||
    (e.label || '').toLowerCase().includes(q) ||
    (e.category || '').toLowerCase().includes(q)
  ).slice(0, 5) : []

  const totalResults = matchedTasks.length + matchedDevoirs.length + matchedExamens.length + matchedProjects.length + matchedExpenses.length

const navigate = (tab: string) => {
  onNavigate(tab)
  onClose()
}

const statusIcon: Record<string, string> = { 'À faire': '⭕', 'En cours': '🔵', 'Terminé': '✅' }
const priorityColor: Record<string, string> = { Critique: '#f87171', Important: '#5B8DBF', Optionnel: '#9ca3af' }

return (
  <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
    <div onClick={e => e.stopPropagation()}
    style={{ width: '100%', maxWidth: 560, maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}>

    {/* Search input */}
    <div style={{ background: 'var(--modal-bg)', borderRadius: '14px 14px 0 0', border: '1px solid var(--border)',
      borderBottom: 'none', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>🔍</span>
      <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Rechercher tâches, devoirs, examens, projets, dépenses..."
        style={{ border: 'none', background: 'transparent', fontSize: 16, padding: 0,
        outline: 'none', boxShadow: 'none', color: 'var(--text)' }} />
      <kbd style={{ background: 'var(--bar-bg)', border: '1px solid var(--border)', borderRadius: 5,
        padding: '2px 8px', fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>Esc</kbd>
    </div>

    {/* Results */}
    <div style={{ background: 'var(--modal-bg)', borderRadius: '0 0 14px 14px', border: '1px solid var(--border)',
      overflow: 'auto', maxHeight: '60vh', padding: q ? '8px 12px 16px' : '16px 12px' }}>

      {!q && (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>
          Tape pour chercher dans toutes tes donnees...
        </p>
      )}

      {q && totalResults === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>
          Rien trouvé pour « {query} »
        </p>
      )}

      {/* Tasks */}
      {matchedTasks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase',
            letterSpacing: 1, padding: '6px 8px', fontFamily: 'Fraunces' }}>
            Taches ({matchedTasks.length})
          </p>
          {matchedTasks.map(t => (
            <div key={t.id} onClick={() => navigate('taches')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
              cursor: 'pointer', transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 14 }}>{statusIcon[t.status] || '⭕'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textDecoration: t.status === 'Terminé' ? 'line-through' : 'none',
                  color: t.status === 'Terminé' ? 'var(--muted)' : 'var(--text)' }}>
                  {t.recurring && '♻️ '}{t.name}
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  {t.project && <span style={{ fontSize: 10, color: 'var(--muted)' }}>📁 {t.project}</span>}
                  {t.deadline && <span style={{ fontSize: 10, color: 'var(--muted)' }}>📅 {fmtDate(t.deadline)}</span>}
                </div>
              </div>
              <span style={{ fontSize: 10, color: priorityColor[t.priority || ''], fontWeight: 600 }}>{t.priority}</span>
            </div>
          ))}
        </div>
      )}

      {/* Devoirs */}
      {matchedDevoirs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase',
            letterSpacing: 1, padding: '6px 8px', fontFamily: 'Fraunces' }}>
            Devoirs ({matchedDevoirs.length})
          </p>
          {matchedDevoirs.map(d => (
            <div key={d.id} onClick={() => navigate('ecole')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
              cursor: 'pointer', transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 14 }}>📋</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, margin: 0 }}><strong>{d.matiere}</strong></p>
                {d.description && <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</p>}
              </div>
              {d.dateRendu && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtDate(d.dateRendu)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Examens */}
      {matchedExamens.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase',
            letterSpacing: 1, padding: '6px 8px', fontFamily: 'Fraunces' }}>
            Examens ({matchedExamens.length})
          </p>
          {matchedExamens.map(ex => (
            <div key={ex.id} onClick={() => navigate('ecole')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
              cursor: 'pointer', transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 14 }}>🎓</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, margin: 0 }}><strong>{ex.matiere}</strong></p>
                {ex.chapitres && <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>{ex.chapitres}</p>}
              </div>
              {ex.date && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtDate(ex.date)}</span>}
            </div>
          ))}
        </div>
      )}

  {/* Projets */}
  {matchedProjects.length > 0 && (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', textTransform: 'uppercase',
        letterSpacing: 1, padding: '6px 8px', fontFamily: 'Fraunces' }}>
        Projets ({matchedProjects.length})
      </p>
      {matchedProjects.map(p => (
        <div key={p.id} onClick={() => navigate('projets')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
            cursor: 'pointer', transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ fontSize: 14 }}>🎯</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, margin: 0 }}><strong>{p.name}</strong></p>
            {p.objective && <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.objective}</p>}
          </div>
          <span className="badge badge-green" style={{ fontSize: 10 }}>{p.status}</span>
        </div>
      ))}
    </div>
  )}

  {/* Dépenses */}
  {matchedExpenses.length > 0 && (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#f472b6', textTransform: 'uppercase',
        letterSpacing: 1, padding: '6px 8px', fontFamily: 'Fraunces' }}>
        Dépenses ({matchedExpenses.length})
      </p>
      {matchedExpenses.map(ex => (
        <div key={ex.id} onClick={() => navigate('finances')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
            cursor: 'pointer', transition: 'background .15s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Receipt size={14} style={{ flexShrink: 0, color: 'var(--muted)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, margin: 0 }}>{ex.label || ex.note || ex.category || 'Dépense'}</p>
            {ex.category && <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>{ex.category}</p>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>{ex.amount.toLocaleString('fr-FR')} FCFA</p>
            {ex.date && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmtDate(ex.date)}</span>}
          </div>
        </div>
      ))}
    </div>
  )}
    </div>
  </div>
  </div>
)
}
