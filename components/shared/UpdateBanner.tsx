// @ts-nocheck — migration TypeScript en attente
"use client"

import { useEffect, useState } from 'react'

export default function UpdateBanner() {
  const [show, setShow] = useState(false)
  const [reg, setReg] = useState(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then(registration => {
      setReg(registration)

      // Détecter quand un nouveau SW attend
      const checkWaiting = () => {
        if (registration.waiting) setShow(true)
      }
      checkWaiting()
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShow(true)
          }
        })
      })
    })

    // Recharger quand le nouveau SW prend le contrôle
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) { refreshing = true; window.location.reload() }
    })
  }, [])

  const update = () => {
    reg?.waiting?.postMessage({ type: 'SKIP_WAITING' })
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
      color: '#fff', padding: '10px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      boxShadow: '0 2px 12px rgba(56,189,248,.3)',
      animation: 'slideDown .3s ease both',
    }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>
        🚀 Nouvelle version disponible
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={update}
          style={{ background: 'rgba(255,255,255,.9)', color: '#0f172a', border: 'none', borderRadius: 8,
            padding: '5px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          Actualiser
        </button>
        <button onClick={() => setShow(false)}
          style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', borderRadius: 8,
            padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>
          ✕
        </button>
      </div>
    </div>
  )
}
