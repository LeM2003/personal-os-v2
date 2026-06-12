"use client"

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { haptic } from '@/utils/haptics'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  maxHeight?: number
}

export default function BottomSheet({ open, onClose, children, title, maxHeight = 85 }: BottomSheetProps) {
  const [drag, setDrag] = useState(0)
  const startY  = useRef(0)
  const moving  = useRef(false)
  const [mounted, setMounted] = useState(open)

  // Monte/démonte avec délai pour laisser jouer la transition de sortie
  useEffect(() => {
    if (open) {
      setMounted(true)
      setDrag(0)
    } else if (mounted) {
      const t = setTimeout(() => setMounted(false), 260)
      return () => clearTimeout(t)
    }
  }, [open, mounted])

  // Bloque le scroll du body quand la sheet est ouverte
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Fermeture à la touche Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
    moving.current = true
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!moving.current) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setDrag(dy)
  }
  const onTouchEnd = () => {
    moving.current = false
    if (drag > 120) { haptic(8); onClose() }
    setDrag(0)
  }

  if (!mounted || typeof document === 'undefined') return null

  const visible    = open && mounted
  const translateY = visible ? drag : 800

  // Portal sur <body> : la sheet est sinon rendue dans .main-content qui crée
  // son propre stacking context (z-index 1) — n'importe quel z-index interne
  // resterait DERRIÈRE .bottom-nav (z-index 200), qui interceptait les taps
  // sur le bas de la sheet (boutons Ajouter/Annuler/Supprimer inaccessibles).
  return createPortal(
    <div onClick={onClose} style={{
      // 600 : au-dessus de .bottom-nav (200) et du bouton assistant (500),
      // sous .modal-overlay (999).
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,.45)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      opacity: visible ? 1 : 0,
      transition: 'opacity .24s ease',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 560,
        maxHeight: `${maxHeight}vh`,
        background: 'var(--card)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        boxShadow: '0 -8px 32px rgba(0,0,0,.35)',
        transform: `translateY(${translateY}px)`,
        transition: moving.current ? 'none' : 'transform .26s cubic-bezier(.22,.61,.36,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Poignée + titre : zone de drag */}
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          style={{
            padding: '10px 20px 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            touchAction: 'none', flexShrink: 0, position: 'relative',
          }}>
          <div style={{ width: 38, height: 5, borderRadius: 999, background: 'var(--border)', marginBottom: title ? 10 : 0 }} />
          {title && (
            <h3 style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 18, margin: 0, color: 'var(--text)' }}>
              {title}
            </h3>
          )}
          {/* Fermeture explicite au doigt (le drag/overlay ne suffit pas toujours) */}
          <button onClick={onClose} type="button" aria-label="Fermer"
            style={{
              position: 'absolute', top: 10, right: 14,
              width: 30, height: 30, borderRadius: 999,
              background: 'rgba(128,128,128,.14)', border: 'none',
              color: 'var(--muted)', fontSize: 15, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
            ✕
          </button>
        </div>

        {/* Contenu scrollable */}
        <div style={{ padding: '6px 20px calc(24px + env(safe-area-inset-bottom, 0px))', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
