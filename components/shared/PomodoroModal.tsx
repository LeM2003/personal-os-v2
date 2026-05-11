"use client"

import type { PomodoroState } from '@/types'

interface PomodoroModalProps {
  pomo: PomodoroState
  onPause: () => void
  onStop: () => void
  onDone: () => void
}

const fmt = (s: number): string =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function TimerRing({ timeLeft, total, size = 180 }: { timeLeft: number; total: number; size?: number }) {
  const r    = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const pct  = total > 0 ? timeLeft / total : 0
  const dash = pct * circ
  const color = pct > 0.5 ? '#4ade80' : pct > 0.2 ? '#5B8DBF' : '#f87171'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bar-bg)" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .9s linear, stroke .5s ease' }} />
    </svg>
  )
}

export default function PomodoroModal({ pomo, onPause, onStop, onDone }: PomodoroModalProps) {
  const { task, total, timeLeft, running, finished } = pomo
  const pct   = total > 0 ? timeLeft / total : 0
  const color = pct > 0.5 ? '#4ade80' : pct > 0.2 ? '#5B8DBF' : '#f87171'

  const durLabel = (() => {
    const m = task.duration || 0
    const h = Math.floor(m / 60), mn = m % 60
    if (h > 0 && mn > 0) return `${h}h ${mn}min`
    if (h > 0) return `${h}h`
    return `${mn}min`
  })()

  return (
    <div className="modal-overlay" style={{ zIndex: 9998 }}>
      <div className="modal-box" style={{ maxWidth: 360, textAlign: 'center', padding: '32px 28px' }}>
        <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 6 }}>
          Session de travail
        </p>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 24, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {task.name}
        </p>

        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
          <TimerRing timeLeft={timeLeft} total={total} size={180} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {finished
              ? <span style={{ fontSize: 40 }}>🏆</span>
              : <>
                  <span style={{ fontSize: 36, fontWeight: 800, color, fontFamily: 'monospace', lineHeight: 1 }}>
                    {fmt(timeLeft)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {running ? 'en cours…' : 'en pause'}
                  </span>
                </>
            }
          </div>
        </div>

        {finished && (
          <div style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#4ade80', margin: 0 }}>Temps écoulé ! Excellent travail.</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>{durLabel} sur « {task.name} »</p>
          </div>
        )}

        {!finished && (
          <div style={{ background: 'var(--bar-bg)', borderRadius: 999, height: 4, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ width: `${(1 - pct) * 100}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .9s linear' }} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {finished ? (
            <>
              <button className="btn-gold" onClick={onDone} style={{ flex: 1 }}>✅ Marquer Terminé</button>
              <button className="btn-ghost" onClick={onStop} style={{ flex: 1 }}>Fermer</button>
            </>
          ) : (
            <>
              <button className="btn-gold" onClick={onPause} style={{ minWidth: 110 }}>
                {running ? '⏸ Pause' : '▶ Reprendre'}
              </button>
              <button className="btn-ghost" onClick={onDone} style={{ minWidth: 110 }}>✅ Terminer</button>
              <button className="btn-ghost" onClick={onStop}
                style={{ minWidth: 80, color: '#f87171', borderColor: 'rgba(248,113,113,.3)' }}>
                ⏹ Arrêter
              </button>
            </>
          )}
        </div>

        {!finished && (
          <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14 }}>
            Durée : {durLabel}{task.project ? ` · 📁 ${task.project}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}
