"use client"

import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react'

const STORAGE_KEY = 'pos_fab_position'
const SNAP_MARGIN = 16 // px depuis le bord

interface DragPosition {
  x?: number
  y?: number
  right?: number
  bottom?: number
}

interface DraggableResult {
  ref: React.RefObject<HTMLButtonElement | null>
  style: CSSProperties
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void
    onTouchStart: (e: React.TouchEvent) => void
  }
  dragging: boolean
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max)
}

export function useDraggable(defaultPos: DragPosition = { right: 20, bottom: 80 }): DraggableResult {
  const [pos, setPos] = useState<DragPosition>(defaultPos)
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  const startRef = useRef<{ clientX: number; clientY: number; elX: number; elY: number } | null>(null)
  const posRef = useRef(pos)
  posRef.current = pos

  // Charger la position sauvegardée
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as DragPosition | null
      if (saved && typeof saved.x === 'number') {
        setPos({ x: saved.x, y: saved.y })
      }
    } catch {}
  }, [])

  const getAbsPos = useCallback(() => {
    const el = ref.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
  }, [])

  const onStart = useCallback((clientX: number, clientY: number) => {
    const abs = getAbsPos()
    if (!abs) return
    startRef.current = { clientX, clientY, elX: abs.x, elY: abs.y }
    setDragging(true)
  }, [getAbsPos])

  const onMove = useCallback((clientX: number, clientY: number) => {
    if (!startRef.current || !ref.current) return
    const dx = clientX - startRef.current.clientX
    const dy = clientY - startRef.current.clientY
    const newX = startRef.current.elX + dx
    const newY = startRef.current.elY + dy
    const vw = window.innerWidth
    const vh = window.innerHeight
    const w = ref.current.offsetWidth || 52
    const h = ref.current.offsetHeight || 52
    setPos({
      x: clamp(newX, SNAP_MARGIN, vw - w - SNAP_MARGIN),
      y: clamp(newY, SNAP_MARGIN, vh - h - SNAP_MARGIN),
    })
  }, [])

  const onEnd = useCallback(() => {
    if (!startRef.current) return
    startRef.current = null
    setDragging(false)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)) } catch {}
  }, [])

  useEffect(() => {
    if (!dragging) return
    const move = (e: MouseEvent | TouchEvent) => {
      const touch = (e as TouchEvent).touches?.[0]
      onMove(touch?.clientX ?? (e as MouseEvent).clientX, touch?.clientY ?? (e as MouseEvent).clientY)
    }
    const end = () => onEnd()
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', end)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
    }
  }, [dragging, onMove, onEnd])

  const style: CSSProperties = pos.x !== undefined ? {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    right: 'auto',
    bottom: 'auto',
    cursor: dragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    touchAction: 'none',
  } : {
    position: 'fixed',
    right: pos.right ?? 20,
    bottom: pos.bottom ?? 76,
    cursor: 'grab',
    touchAction: 'none',
  }

  const handlers = {
    onMouseDown: (e: React.MouseEvent) => { e.preventDefault(); onStart(e.clientX, e.clientY) },
    onTouchStart: (e: React.TouchEvent) => { onStart(e.touches[0].clientX, e.touches[0].clientY) },
  }

  return { ref, style, handlers, dragging }
}
