"use client"

import { useRef, useState, type ReactNode } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { haptic, hapticSuccess } from '@/utils/haptics'

const TRIGGER_THRESHOLD = 90  // px : distance au-delà de laquelle l'action se déclenche
const MAX_DRAG          = 140 // px : distance max que la row peut suivre le doigt

interface SwipeRowProps {
  children: ReactNode
  onSwipeRight?: () => void
  onSwipeLeft?: () => void
  rightLabel?: string
  leftLabel?: string
  rightColor?: string
  leftColor?: string
  disabled?: boolean
}

export default function SwipeRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'Terminer',
  leftLabel  = 'Supprimer',
  rightColor = '#22c55e',
  leftColor  = '#ef4444',
  disabled = false,
}: SwipeRowProps) {
  const [drag, setDrag] = useState(0)
  const startX    = useRef(0)
  const moving    = useRef(false)
  const triggered = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled) return
    startX.current = e.touches[0].clientX
    moving.current = true
    triggered.current = false
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!moving.current) return
    const dx = e.touches[0].clientX - startX.current
    const bounded = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx))
    setDrag(bounded)
    if (!triggered.current && Math.abs(bounded) >= TRIGGER_THRESHOLD) {
      triggered.current = true
      haptic(8)
    }
    if (triggered.current && Math.abs(bounded) < TRIGGER_THRESHOLD) {
      triggered.current = false
    }
  }

  const onTouchEnd = () => {
    moving.current = false
    if (drag >= TRIGGER_THRESHOLD && onSwipeRight) {
      hapticSuccess()
      setDrag(MAX_DRAG)
      setTimeout(() => { onSwipeRight(); setDrag(0) }, 140)
    } else if (drag <= -TRIGGER_THRESHOLD && onSwipeLeft) {
      hapticSuccess()
      setDrag(-MAX_DRAG)
      setTimeout(() => { onSwipeLeft(); setDrag(0) }, 140)
    } else {
      setDrag(0)
    }
  }

  const showRight = drag > 0
  const showLeft  = drag < 0
  const ratio = Math.min(1, Math.abs(drag) / TRIGGER_THRESHOLD)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      {showRight && onSwipeRight && (
        <div style={{
          position: 'absolute', inset: 0,
          background: rightColor,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
          padding: '0 22px', color: '#fff', gap: 10,
          opacity: 0.4 + ratio * 0.6,
        }}>
          <Check size={22} strokeWidth={3} />
          <span style={{ fontWeight: 700, fontSize: 13, fontFamily: 'DM Sans' }}>{rightLabel}</span>
        </div>
      )}
      {showLeft && onSwipeLeft && (
        <div style={{
          position: 'absolute', inset: 0,
          background: leftColor,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 22px', color: '#fff', gap: 10,
          opacity: 0.4 + ratio * 0.6,
        }}>
          <span style={{ fontWeight: 700, fontSize: 13, fontFamily: 'DM Sans' }}>{leftLabel}</span>
          <Trash2 size={22} strokeWidth={2.5} />
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${drag}px)`,
          transition: moving.current ? 'none' : 'transform .22s cubic-bezier(.22,.61,.36,1)',
          willChange: 'transform',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
}
