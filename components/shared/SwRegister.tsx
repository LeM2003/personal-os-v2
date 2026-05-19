"use client"

import { useEffect } from 'react'

export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          // Essayer d'activer le periodic sync si supporté
          if ('periodicSync' in reg) {
            const psync = (reg as ServiceWorkerRegistration & { periodicSync: { register: (tag: string, opts: { minInterval: number }) => Promise<void> } }).periodicSync
            psync.register('pos-check-reminders', { minInterval: 60 * 60 * 1000 })
              .catch(() => {})
          }
        })
        .catch(() => {})
    }
  }, [])

  return null
}
