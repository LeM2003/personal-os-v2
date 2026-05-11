"use client"

import { useEffect, useRef, useState } from 'react'

interface SegmentOption {
  value: string
  label: string
  count?: number
}

interface SegmentedControlProps {
  options: SegmentOption[]
  value: string
  onChange: (v: string) => void
  size?: 'sm' | 'md'
}

export default function SegmentedControl({ options, value, onChange, size = 'md' }: SegmentedControlProps) {
  const pad      = size === 'sm' ? '6px 12px' : '8px 16px'
  const fontSize = size === 'sm' ? 12 : 13

  const [indicator, setIndicator] = useState({ width: 0, left: 0, opacity: 0 })
  // Record des refs vers les boutons — ne provoque pas de re-render
  const buttonsRef = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    const activeBtn = buttonsRef.current[value]
    if (activeBtn) {
      setIndicator({ width: activeBtn.offsetWidth, left: activeBtn.offsetLeft, opacity: 1 })
    }
  }, [value, options])

  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--input-bg)',
      border: '1px solid var(--border)',
      borderRadius: 999,
      padding: 3,
      gap: 2,
      position: 'relative',
    }}>
      {/* Indicateur glissant */}
      <div style={{
        position: 'absolute',
        top: 3, bottom: 3,
        left: indicator.left,
        width: indicator.width,
        opacity: indicator.opacity,
        background: 'var(--card)',
        borderRadius: 999,
        boxShadow: '0 1px 3px rgba(0,0,0,.08)',
        transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        pointerEvents: 'none',
      }} />

      {options.map(opt => {
        const active = opt.value === value
        return (
          <button key={opt.value}
            ref={el => { buttonsRef.current[opt.value] = el }}
            onClick={() => onChange(opt.value)}
            style={{
              padding: pad, fontSize,
              fontFamily: 'DM Sans',
              fontWeight: active ? 600 : 500,
              color: active ? '#5B8DBF' : 'var(--muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color .18s',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              position: 'relative', zIndex: 1,
            }}>
            {opt.label}
            {typeof opt.count === 'number' && opt.count > 0 && (
              <span style={{
                background: active ? 'rgba(91,141,191,.15)' : 'var(--border)',
                color: active ? '#5B8DBF' : 'var(--muted)',
                borderRadius: 999, padding: '1px 6px',
                fontSize: fontSize - 2, fontWeight: 700,
                transition: 'background .18s, color .18s',
              }}>{opt.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
