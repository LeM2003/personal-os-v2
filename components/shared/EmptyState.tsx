"use client"

import AbstractMark from './AbstractMark'
import type { ComponentProps } from 'react'

type Variant = ComponentProps<typeof AbstractMark>['variant']
type Tone = ComponentProps<typeof AbstractMark>['tone']

interface EmptyStateProps {
  // Nouvelle API (recommandée)
  mark?: Variant
  tone?: Tone
  title?: string
  subtitle?: string
  primary?: string
  onPrimary?: () => void
  secondary?: string
  onSecondary?: () => void
  tips?: string[]
  // Ancienne API (rétrocompat — sera migrée progressivement)
  icon?: React.ReactNode
  msg?: string
  sub?: string
}

export default function EmptyState({
  mark, tone = 'accent',
  title, subtitle,
  primary, onPrimary,
  secondary, onSecondary,
  tips,
  icon, msg, sub,
}: EmptyStateProps) {
  const _title    = title    ?? msg
  const _subtitle = subtitle ?? sub
  const showLegacyIcon = !mark && icon !== undefined && icon !== null

  return (
    <div style={{
      padding: '40px 20px 20px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', textAlign: 'center',
      color: 'var(--muted)',
    }}>
      {mark && (
        <div style={{ marginBottom: 18 }}>
          <AbstractMark variant={mark} tone={tone} size={96} />
        </div>
      )}
      {showLegacyIcon && (
        <div style={{
          marginBottom: 10, fontSize: 42, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)',
        }}>
          {icon}
        </div>
      )}
      {_title && (
        <h2 style={{
          fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700,
          letterSpacing: '-0.5px', margin: 0, color: 'var(--text)',
          maxWidth: 280, lineHeight: 1.2,
        }}>{_title}</h2>
      )}
      {_subtitle && (
        <div style={{
          fontSize: 14, color: 'var(--muted)', marginTop: 8,
          lineHeight: 1.5, maxWidth: 280,
        }}>{_subtitle}</div>
      )}
      {primary && (
        <button className="btn-gold" onClick={onPrimary}
          style={{ marginTop: 22, borderRadius: 12, padding: '13px 22px', fontSize: 15, fontWeight: 600 }}>
          {primary}
        </button>
      )}
      {secondary && (
        <button onClick={onSecondary}
          style={{
            marginTop: 14, background: 'transparent', border: 'none',
            padding: '4px 8px', cursor: 'pointer',
            fontSize: 13.5, color: 'var(--gold)', fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
          }}>
          {secondary}
        </button>
      )}
      {tips && tips.length > 0 && (
        <div style={{
          marginTop: 28, width: '100%', maxWidth: 300,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {tips.map((t, i) => (
            <div key={i} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--gold)', flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: 'var(--text)', flex: 1 }}>{t}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
