'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  handleReset = () => {
    if (typeof window === 'undefined') return
    const ok = window.confirm(
      "Réinitialiser l'app va effacer tes données locales (tâches, finances, profil) sur cet appareil. " +
      "Tes éventuelles sauvegardes exportées en .json ne sont pas concernées. Continuer ?"
    )
    if (!ok) return
    try {
      // On vide UNIQUEMENT les clés Personal OS, pas tout le localStorage du navigateur
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && (k.startsWith('pos_') || k === 'onboardingDone')) keys.push(k)
      }
      keys.forEach(k => localStorage.removeItem(k))
    } catch { /* ignore */ }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || 'Erreur inconnue'
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          padding: 24,
        }}>
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '32px 28px',
            maxWidth: 440,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            backdropFilter: 'blur(12px)',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
              fontSize: 28,
            }}>
              ⚠️
            </div>

            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text)',
              margin: 0,
              letterSpacing: '-0.5px',
            }}>
              Oups, quelque chose s&apos;est cassé
            </h2>

            <p style={{
              fontSize: 14,
              color: 'var(--muted)',
              marginTop: 10,
              lineHeight: 1.5,
              maxWidth: 320,
            }}>
              Une erreur inattendue est survenue. Si recharger ne suffit pas,
              réinitialise les données locales de cet appareil.
            </p>

            {/* Détails techniques de l'erreur */}
            <details style={{
              marginTop: 16,
              width: '100%',
              maxWidth: 360,
              textAlign: 'left',
              fontSize: 12,
              color: 'var(--muted)',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, padding: '6px 0' }}>
                Détails techniques
              </summary>
              <pre style={{
                marginTop: 6,
                padding: '10px 12px',
                background: 'var(--surface-deep, rgba(0,0,0,0.25))',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 11,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 160,
                overflow: 'auto',
                fontFamily: 'monospace',
              }}>{msg}</pre>
            </details>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, width: '100%', maxWidth: 280 }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '13px 24px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--gold)',
                  color: '#060d1a',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Recharger la page
              </button>

              <button
                onClick={this.handleReset}
                style={{
                  padding: '11px 24px',
                  borderRadius: 12,
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  background: 'transparent',
                  color: '#f87171',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Réinitialiser l&apos;app (vide les données)
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
