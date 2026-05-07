"use client"

import { useState, useEffect, useRef, useCallback } from 'react'

const STORAGE_KEY = 'pos_fab_position'
const SNAP_MARGIN = 16 // px from edge

function clamp(val, min, max) { return Math.min(Math.max(val, min), max) }

export function useDraggable(defaultPos = { right: 20, bottom: 80 }) {
  const [pos, setPos] = useState(defaultPos)
  const [dragging, setDragging] = useState(false)
  const ref = useRef(null)
  const startRef = useRef(null)
  const posRef = useRef(pos)
  posRef.current = pos

  // Load saved position
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
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

  const onStart = useCallback((clientX, clientY) => {
    const abs = getAbsPos()
    if (!abs) return
    startRef.current = { clientX, clientY, elX: abs.x, elY: abs.y }
    setDragging(true)
  }, [getAbsPos])

  const onMove = useCallback((clientX, clientY) => {
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
    // Save position
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)) } catch {}
  }, [])

  useEffect(() => {
    if (!dragging) return
    const move = (e) => onMove(e.clientX ?? e.touches?.[0]?.clientX, e.clientY ?? e.touches?.[0]?.clientY)
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

  const style = pos.x !== undefined ? {
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
    onMouseDown: (e) => { e.preventDefault(); onStart(e.clientX, e.clientY) },
    onTouchStart: (e) => { onStart(e.touches[0].clientX, e.touches[0].clientY) },
  }

  return { ref, style, handlers, dragging }
}
