"use client"

import { useEffect, useState } from 'react'

interface ConfirmRequest {
  message: string
  danger?: boolean
  confirmLabel?: string
  cancelLabel?: string
  resolve: (ok: boolean) => void
}

let listeners: Array<(req: ConfirmRequest | null) => void> = []

function emit(req: ConfirmRequest | null) {
  listeners.forEach(l => l(req))
}

export function confirmDialog(message: string, opts: Omit<ConfirmRequest, 'message' | 'resolve'> = {}): Promise<boolean> {
  return new Promise(resolve => {
    emit({ message, resolve, ...opts })
  })
}

export default function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null)

  useEffect(() => {
    listeners.push(setReq)
    return () => { listeners = listeners.filter(l => l !== setReq) }
  }, [])

  if (!req) return null

  const close = (ok: boolean) => {
    req.resolve(ok)
    setReq(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.6)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={() => close(false)}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--modal-bg)', border: '1px solid var(--border)', borderRadius: 16,
        padding: 20, maxWidth: 380, width: '100%', animation: 'slideUp .25s cubic-bezier(.32,.72,0,1) both',
      }}>
        <p style={{ margin: '0 0 18px', fontSize: 14.5, color: 'var(--text)', lineHeight: 1.5 }}>{req.message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => close(false)} style={{
            flex: 1, background: 'var(--bar-bg)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '11px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            {req.cancelLabel ?? 'Annuler'}
          </button>
          <button onClick={() => close(true)} style={{
            flex: 1, background: req.danger ? '#f87171' : 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
            color: '#fff', border: 'none', borderRadius: 12, padding: '11px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>
            {req.confirmLabel ?? 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}
