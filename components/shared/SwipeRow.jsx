"use client"

import { useRef, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { haptic, hapticSuccess } from '../../utils/haptics'

const TRIGGER_THRESHOLD = 90     // px : distance au-delà de laquelle l'action se déclenche
const MAX_DRAG          = 140    // px : distance max que la row peut suivre le doigt

/**
 * SwipeRow — enveloppe un contenu et ajoute le swipe iOS.
 *
 * @param {ReactNode}  children
 * @param {()=>void=}  onSwipeRight   — glisser vers la droite (→)  — ex. terminer
 * @param {()=>void=}  onSwipeLeft    — glisser vers la gauche (←) — ex. supprimer
 * @param {string=}    rightLabel     — libellé sous l'icône droite (par défaut "Terminer")
 * @param {string=}    leftLabel      — libellé sous l'icône gauche (par défaut "Supprimer")
 * @param {string=}    rightColor     — couleur de fond à droite
 * @param {string=}    leftColor      — couleur de fond à gauche
 * @param {boolean=}   disabled       — si true, désactive le swipe
 */
export default function SwipeRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'Terminer',
  leftLabel  = 'Supprimer',
  rightColor = '#22c55e',
  leftColor  = '#ef4444',
  disabled = false,
}) {
  const [drag, setDrag] = useState(0)
  const startX = useRef(0)
  const moving = useRef(false)
  const triggered = useRef(false)

  const onTouchStart = (e) => {
    if (disabled) return
    startX.current = e.touches[0].clientX
    moving.current = true
    triggered.current = false
  }

  const onTouchMove = (e) => {
    if (!moving.current) return
    const dx = e.touches[0].clientX - startX.current
    // Bornes + résistance passé le seuil
    const bounded = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx))
    setDrag(bounded)
    // Petit buzz quand on franchit le seuil (une seule fois)
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

  const showRight = drag > 0   // on tire vers la droite → action "right" révélée à gauche
  const showLeft  = drag < 0
  const ratio = Math.min(1, Math.abs(drag) / TRIGGER_THRESHOLD)

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      {/* Layer arrière — action "right" (ex. terminer) révélée à gauche */}
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
      {/* Layer arrière — action "left" (ex. supprimer) révélée à droite */}
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

      {/* Contenu — glisse avec le doigt */}
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
