"use client"

import { useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }

let nextId = 1
let listeners: Array<(items: ToastItem[]) => void> = []
let items: ToastItem[] = []

function emit() {
  listeners.forEach(l => l(items))
}

export function toast(message: string, type: ToastType = 'info') {
  const id = nextId++
  items = [...items, { id, message, type }]
  emit()
  setTimeout(() => {
    items = items.filter(i => i.id !== id)
    emit()
  }, 3200)
}

const ICON: Record<ToastType, string> = { success: '✅', error: '⚠️', info: 'ℹ️' }
const BORDER: Record<ToastType, string> = { success: '#4ade80', error: '#f87171', info: 'var(--accent-1)' }

export default function ToastHost() {
  const [list, setList] = useState<ToastItem[]>([])

  useEffect(() => {
    listeners.push(setList)
    return () => { listeners = listeners.filter(l => l !== setList) }
  }, [])

  if (list.length === 0) return null

  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 86px)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none',
    }}>
      {list.map(item => (
        <div key={item.id} style={{
          pointerEvents: 'auto', maxWidth: '90vw', background: 'var(--modal-bg)',
          border: `1px solid ${BORDER[item.type]}`, borderRadius: 12, padding: '10px 14px',
          fontSize: 13.5, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,.25)', animation: 'slideUp .25s cubic-bezier(.32,.72,0,1) both',
        }}>
          <span>{ICON[item.type]}</span>
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  )
}
