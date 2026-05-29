"use client"

import { useMemo } from 'react'
import type { Task } from '@/types'
import type { Folder } from '@/types'
import { daysUntil, fmtDate } from '@/utils/dates'
import { Clock, AlertTriangle, Repeat, Circle, CircleDot, CheckCircle2 } from 'lucide-react'

interface Props {
  tasks: Task[]
  folderById: (id?: string) => Folder | undefined
  onEdit: (task: Task) => void
  cycleStatus: (id: string) => void
}

const HOUR_START = 6   // timeline commence à 06:00
const HOUR_END   = 23  // timeline finit à 23:00
const HOUR_H     = 64  // hauteur px par heure (mobile-friendly, doigt = ~44px)

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function minutesToPx(minutes: number): number {
  return ((minutes - HOUR_START * 60) / 60) * HOUR_H
}

export default function DayView({ tasks, folderById, onEdit, cycleStatus }: Props) {
  const today = new Date().toISOString().split('T')[0]

  // Sépare planifiées (ont un taskTime) vs non-planifiées
  const { planned, unplanned } = useMemo(() => {
    const planned: Task[] = []
    const unplanned: Task[] = []
    tasks.forEach(t => {
      if (t.taskTime) planned.push(t)
      else unplanned.push(t)
    })
    // Tri par heure
    planned.sort((a, b) => (a.taskTime || '').localeCompare(b.taskTime || ''))
    return { planned, unplanned }
  }, [tasks])

  const totalHeight = (HOUR_END - HOUR_START) * HOUR_H

  // Heure courante pour l'indicateur rouge
  const nowMinutes = (() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })()
  const nowPx = nowMinutes >= HOUR_START * 60 && nowMinutes <= HOUR_END * 60
    ? minutesToPx(nowMinutes)
    : null

  return (
    <div>
      {/* ── Timeline ── */}
      <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
        {/* Colonne heures */}
        <div style={{ width: 44, flexShrink: 0, paddingTop: 0 }}>
          {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => {
            const h = HOUR_START + i
            return (
              <div key={h} style={{ height: HOUR_H, display: 'flex', alignItems: 'flex-start',
                paddingTop: 4, justifyContent: 'flex-end', paddingRight: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {String(h).padStart(2, '0')}h
                </span>
              </div>
            )
          })}
        </div>

        {/* Colonne principale */}
        <div style={{ flex: 1, position: 'relative', minHeight: totalHeight }}>
          {/* Lignes d'heures */}
          {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute', top: i * HOUR_H, left: 0, right: 0, height: 1,
              background: i === 0 ? 'var(--border)' : 'var(--border)',
              opacity: i % 2 === 0 ? 0.8 : 0.3,
            }} />
          ))}

          {/* Indicateur "maintenant" */}
          {nowPx !== null && (
            <div style={{ position: 'absolute', top: nowPx, left: 0, right: 0, zIndex: 10,
              display: 'flex', alignItems: 'center', gap: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', flexShrink: 0 }} />
              <div style={{ flex: 1, height: 1.5, background: '#f87171', opacity: .7 }} />
            </div>
          )}

          {/* Tâches planifiées */}
          {planned.map(t => {
            const startMin = timeToMinutes(t.taskTime!)
            const dur = t.duration && t.duration > 0 ? t.duration : 30
            const topPx = minutesToPx(startMin)
            const heightPx = Math.max((dur / 60) * HOUR_H, 32)
            const folder = folderById(t.folderId)
            const color = folder?.color || 'var(--accent-1)'
            const isDone = t.status === 'Terminé'
            const isOverdue = daysUntil(t.deadline) < 0 && !t.recurring

            return (
              <div key={t.id}
                onClick={() => onEdit(t)}
                style={{
                  position: 'absolute',
                  top: topPx + 2,
                  left: 4,
                  right: 4,
                  height: heightPx - 4,
                  borderRadius: 8,
                  background: isDone ? 'var(--surface-elevated)' : `${color}18`,
                  border: `1px solid ${isDone ? 'var(--border)' : `${color}55`}`,
                  borderLeft: `3px solid ${isDone ? 'var(--muted)' : color}`,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 2,
                  transition: 'transform var(--dur-fast) var(--ease-spring)',
                  opacity: isDone ? 0.5 : 1,
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.01)' }}
                onMouseOut={e => { e.currentTarget.style.transform = '' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <button
                    onClick={e => { e.stopPropagation(); cycleStatus(t.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      flexShrink: 0, display: 'flex', alignItems: 'center', color }}
                    title="Changer statut"
                  >
                    {isDone
                      ? <CheckCircle2 size={13} style={{ color: '#4ade80' }} />
                      : t.status === 'En cours'
                        ? <CircleDot size={13} style={{ color: '#60a5fa' }} />
                        : <Circle size={13} />}
                  </button>
                  <span style={{
                    fontSize: 12, fontWeight: 600, color: isDone ? 'var(--muted)' : 'var(--text)',
                    textDecoration: isDone ? 'line-through' : 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                  }}>
                    {t.recurring && <Repeat size={10} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />}
                    {t.name}
                  </span>
                  {isOverdue && <AlertTriangle size={11} style={{ color: '#f87171', flexShrink: 0 }} />}
                </div>
                {heightPx > 44 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 18 }}>
                    <Clock size={10} style={{ color: 'var(--muted)' }} />
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {t.taskTime}{t.duration && t.duration > 0 ? ` · ${t.duration < 60 ? t.duration + 'min' : Math.floor(t.duration / 60) + 'h' + (t.duration % 60 ? (t.duration % 60) + 'm' : '')}` : ''}
                    </span>
                    {folder && (
                      <span style={{ fontSize: 10, color, marginLeft: 4 }}>
                        {folder.emoji} {folder.name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Non planifiées ── */}
      {unplanned.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: .8, whiteSpace: 'nowrap' }}>
              Non planifiées ({unplanned.length})
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {unplanned.map(t => {
              const folder = folderById(t.folderId)
              const color = folder?.color || 'var(--border-hover)'
              const isDone = t.status === 'Terminé'
              const overdue = daysUntil(t.deadline) < 0 && !t.recurring
              return (
                <div key={t.id} className="task-card"
                  style={{
                    borderLeft: `3px solid ${isDone ? 'transparent' : color}`,
                    opacity: isDone ? 0.5 : 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => onEdit(t)}
                >
                  <button
                    onClick={e => { e.stopPropagation(); cycleStatus(t.id) }}
                    className="status-btn"
                    style={{ background: isDone ? 'rgba(74,222,128,.15)' : 'var(--status-idle-bg)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {isDone ? <CheckCircle2 size={15} style={{ color: '#4ade80' }} />
                      : t.status === 'En cours' ? <CircleDot size={15} style={{ color: '#60a5fa' }} />
                        : <Circle size={15} style={{ color: 'var(--muted)' }} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, margin: 0,
                      textDecoration: isDone ? 'line-through' : 'none',
                      color: isDone ? 'var(--muted)' : 'var(--text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.name}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                      {folder && <span style={{ fontSize: 11, color }}>{folder.emoji} {folder.name}</span>}
                      {t.deadline && !t.recurring && (
                        <span style={{ fontSize: 11, color: overdue ? '#f87171' : 'var(--muted)',
                          display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          {overdue && <AlertTriangle size={10} />} {fmtDate(t.deadline)}
                        </span>
                      )}
                      {t.duration && t.duration > 0 ? (
                        <span style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} /> {t.duration < 60 ? t.duration + 'min' : Math.floor(t.duration / 60) + 'h'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {planned.length === 0 && unplanned.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🗓</div>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Journée libre</p>
          <p style={{ fontSize: 12, marginTop: 4, opacity: .7 }}>
            Ajoute une heure à une tâche pour la voir ici.
          </p>
        </div>
      )}
    </div>
  )
}
