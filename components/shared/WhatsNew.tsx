"use client"

import { useEffect, useState } from 'react'
import { CHANGELOG, LATEST_VERSION } from '@/utils/changelog'

const STORAGE_KEY = 'pos_seen_changelog'

// Affiche les nouveautés aux utilisateurs qui rouvrent l'app après une mise à
// jour — contrairement à UpdateBanner (qui dit juste "il y a une nouvelle
// version", sans détail), ici on dit concrètement ce qui a changé.
// Les nouveaux utilisateurs (1re visite, rien en localStorage) ne voient rien :
// leur premier contact avec l'app, c'est l'onboarding, pas un changelog.
export default function WhatsNew() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let seen: string | null = null
    try { seen = localStorage.getItem(STORAGE_KEY) } catch { /* ignore */ }

    if (seen === null) {
      // Première visite jamais vue : on marque la version actuelle comme vue,
      // sans rien afficher.
      try { localStorage.setItem(STORAGE_KEY, LATEST_VERSION) } catch { /* ignore */ }
      return
    }
    if (seen !== LATEST_VERSION) setShow(true)
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, LATEST_VERSION) } catch { /* ignore */ }
    setShow(false)
  }

  if (!show) return null
  const latest = CHANGELOG[0]
  if (!latest) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={dismiss}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--modal-bg)', border: '1px solid var(--border)',
        borderRadius: '20px 20px 0 0', padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)',
        maxWidth: 480, width: '100%', animation: 'slideUp .3s cubic-bezier(.32,.72,0,1) both',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--accent-1)', letterSpacing: 1, textTransform: 'uppercase' }}>
          ✨ Quoi de neuf — {latest.date}
        </p>
        <ul style={{ margin: '12px 0 18px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {latest.items.map((item, i) => (
            <li key={i} style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.45, display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--accent-1)', flexShrink: 0 }}>•</span>{item}
            </li>
          ))}
        </ul>
        <button onClick={dismiss} style={{
          width: '100%', background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
          color: '#fff', border: 'none', borderRadius: 12, padding: '12px 16px',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>
          Compris
        </button>
      </div>
    </div>
  )
}
