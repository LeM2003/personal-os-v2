"use client"

import { useState } from 'react'
import type { Task, Exam, Homework, Subscription } from '@/types'
import BottomSheet from '@/components/shared/BottomSheet'
import { downloadICS, countICSItems } from '@/utils/icsExport'

interface CalendarData {
  tasks: Task[]
  examens: Exam[]
  devoirs: Homework[]
  subscriptions: Subscription[]
}

interface CalendarExportModalProps {
  open: boolean
  data: CalendarData
  onClose: () => void
}

const ROWS = [
  { key: 'recurringTasks', label: 'Tâches récurrentes', hint: 'Limitées à 1 an (365 occurrences max)' },
  { key: 'oneshotTasks',   label: 'Tâches ponctuelles', hint: 'Avec deadline, non terminées' },
  { key: 'examens',        label: 'Examens',            hint: 'Rappel 24h avant' },
  { key: 'devoirs',        label: 'Devoirs',            hint: 'Non rendus, rappel 24h avant' },
  { key: 'subscriptions',  label: 'Abonnements',        hint: 'Renouvellement mensuel/annuel' },
] as const

type RowKey = typeof ROWS[number]['key']

export default function CalendarExportModal({ open, data, onClose }: CalendarExportModalProps) {
  const counts = countICSItems(data)
  const [inc, setInc] = useState<Record<RowKey, boolean>>({
    recurringTasks: counts.recurringTasks > 0,
    oneshotTasks:   counts.oneshotTasks > 0,
    examens:        counts.examens > 0,
    devoirs:        counts.devoirs > 0,
    subscriptions:  counts.subscriptions > 0,
  })

  const totalSelected = ROWS.reduce((n, r) => n + (inc[r.key] ? counts[r.key] : 0), 0)

  const handleDownload = () => {
    downloadICS(data, inc)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="📅 Export Calendrier">
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
        Choisis ce qui part dans ton agenda. Les tâches récurrentes sont plafonnées à 1 an pour éviter le spam.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {ROWS.map(r => {
          const n = counts[r.key]
          const disabled = n === 0
          return (
            <label key={r.key}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                borderRadius: 8, border: '1px solid var(--border)', cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1, background: inc[r.key] ? 'rgba(91,141,191,.06)' : 'transparent' }}>
              <input
                type="checkbox"
                checked={inc[r.key]}
                disabled={disabled}
                onChange={e => setInc({ ...inc, [r.key]: e.target.checked })}
                style={{ marginTop: 3, flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                  {r.label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({n})</span>
                </p>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>{r.hint}</p>
              </div>
            </label>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-gold" onClick={handleDownload} disabled={totalSelected === 0}>
          ⬇️ Télécharger ({totalSelected})
        </button>
        <button className="btn-ghost" onClick={onClose}>Annuler</button>
      </div>
    </BottomSheet>
  )
}
