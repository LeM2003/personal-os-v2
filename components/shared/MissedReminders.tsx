"use client"

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { computeMissedReminders, type MissedReminder } from '@/utils/missedReminders'

const DISMISS_KEY = 'pos_missed_dismissed'

const loadDismissed = (): string[] => {
  try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]') as string[] }
  catch { return [] }
}

export default function MissedReminders() {
  const { tasks, examens, devoirs, subscriptions, setTab } = useApp()
  const [dismissed, setDismissed] = useState<string[]>(loadDismissed)
  const [collapsed, setCollapsed] = useState(false)

  const items = useMemo(
    () => computeMissedReminders({ tasks, examens, devoirs, subscriptions }),
    [tasks, examens, devoirs, subscriptions]
  )

  const visible = items.filter(i => !dismissed.includes(i.id))
  if (visible.length === 0 || collapsed) return null

  const dismiss = (id: string) => {
    const next = [...dismissed, id]
    setDismissed(next)
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next))
  }

  const goTo = (kind: MissedReminder['kind']) => {
    if (kind === 'task') setTab('taches')
    else if (kind === 'exam' || kind === 'devoir' || kind === 'devoir-late') setTab('ecole')
    else if (kind === 'sub') setTab('finances')
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(91,141,191,.10), rgba(91,141,191,.04))',
      border: '1px solid rgba(91,141,191,.25)',
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 18,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 14, color: '#5B8DBF', margin: 0 }}>
          ⏰ À rattraper ({visible.length})
        </p>
        <button onClick={() => setCollapsed(true)} aria-label="Masquer"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {visible.slice(0, 5).map(it => (
          <div key={it.id} onClick={() => goTo(it.kind)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
              background: 'var(--card)', transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(91,141,191,.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--card)')}
          >
            <span style={{ fontSize: 16 }}>{it.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {it.title}
              </p>
              {it.detail && (
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>{it.detail}</p>
              )}
            </div>
            <button onClick={e => { e.stopPropagation(); dismiss(it.id) }} aria-label="Ignorer"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        ))}
        {visible.length > 5 && (
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 0', textAlign: 'center' }}>
            + {visible.length - 5} autre{visible.length - 5 > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
