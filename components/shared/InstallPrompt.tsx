"use client"

import { useEffect, useState } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'

const DISMISS_KEY    = 'pos-install-dismissed-at'
const DISMISS_DAYS   = 7  // re-propose après 7 jours

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

export default function InstallPrompt({ variant = 'banner' }: { variant?: 'banner' | 'inline' | 'button' | 'card' }) {
  const isButton = variant === 'button'
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)
  const [showGeneric, setShowGeneric] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try {
      const ts = localStorage.getItem(DISMISS_KEY)
      if (!ts) return false
      return Date.now() - Number(ts) < DISMISS_DAYS * 86_400_000
    } catch { return false }
  })

  useEffect(() => {
    if (isStandalone()) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    const onInstalled = () => setDeferred(null)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Déjà installée → rien à proposer. Le rappel "dismissed 7j" ne s'applique PAS
  // au bouton explicite de la landing (l'utilisateur a délibérément cliqué dessus).
  if (isStandalone()) return null
  if (dismissed && !isButton) return null

  const handleInstall = async () => {
    if (deferred) {
      deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') setDeferred(null)
    } else if (isIOS()) {
      setShowIOS(true)
    } else {
      // Android sans prompt natif (event pas encore émis), desktop, Firefox… :
      // au lieu de ne rien faire, on explique l'installation manuelle.
      setShowGeneric(true)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }

  // Le bouton explicite de la landing reste TOUJOURS visible (fallback instructions),
  // même sans prompt natif. Les variantes auto (banner/card) ne s'affichent que si
  // un chemin d'installation natif est dispo, pour ne pas être intrusives.
  const canShow = deferred || isIOS()
  if (!canShow && !isButton) return null

  // ── Card variant (Dashboard — contextuel, non-intrusif) ──
  if (variant === 'card') {
    return (
      <>
        <div style={{
          marginBottom: 16, borderRadius: 14, overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(56,189,248,.06), rgba(129,140,248,.04))',
          border: '1px solid rgba(56,189,248,.18)',
          display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>📲</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 14, fontWeight: 700, margin: 0 }}>
              Installe l&apos;app pour tes rappels
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
              Reçois tes notifications même quand tu n&apos;as pas le navigateur ouvert.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={handleInstall}
              style={{
                background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 14px', fontSize: 12, fontWeight: 700,
                fontFamily: 'var(--font-dm-sans, DM Sans)', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
              Installer
            </button>
            <button onClick={handleDismiss} aria-label="Masquer"
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
              <X size={15} />
            </button>
          </div>
        </div>
        {showIOS && <IOSInstructions onClose={() => setShowIOS(false)} />}
      </>
    )
  }

  // ── Button variant (embedded in landing) ──
  if (variant === 'button') {
    return (
      <>
        <button onClick={handleInstall}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            borderRadius: 12, padding: '14px 24px',
            fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans', cursor: 'pointer',
            transition: 'border-color var(--dur-base) var(--ease-ios), background var(--dur-base) var(--ease-ios)',
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = '#5B8DBF'; e.currentTarget.style.background = 'var(--gold-dim)' }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}>
          <Download size={16} /> Installer sur ton appareil
        </button>
        {showIOS && <IOSInstructions onClose={() => setShowIOS(false)} />}
        {showGeneric && <GenericInstructions onClose={() => setShowGeneric(false)} />}
      </>
    )
  }

  // ── Banner variant (default, bottom of screen) ──
  return (
    <>
      <div style={{
        position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 997,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,.3)',
        animation: 'modalIn var(--dur-slow) var(--ease-ios) both',
        maxWidth: 520, margin: '0 auto',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'var(--gold-dim)', border: '1px solid rgba(91,141,191,.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B8DBF',
        }}>
          <Download size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'Fraunces', fontWeight: 600, fontSize: 14, margin: 0 }}>
            Installer Personal OS
          </p>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0' }}>
            Comme une vraie app, sur ton écran d'accueil
          </p>
        </div>
        <button onClick={handleInstall}
          style={{
            background: '#5B8DBF', color: '#0B1220', border: 'none', borderRadius: 8,
            padding: '8px 14px', fontSize: 13, fontWeight: 700, fontFamily: 'DM Sans',
            cursor: 'pointer', flexShrink: 0,
            transition: 'transform var(--dur-fast) var(--ease-ios), filter var(--dur-base) var(--ease-ios)',
          }}
          onMouseOver={e => e.currentTarget.style.filter = 'brightness(1.08)'}
          onMouseOut={e => e.currentTarget.style.filter = 'brightness(1)'}>
          Installer
        </button>
        <button onClick={handleDismiss} aria-label="Masquer"
          style={{
            background: 'transparent', border: 'none', color: 'var(--muted)',
            cursor: 'pointer', padding: 4, borderRadius: 6, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <X size={16} />
        </button>
      </div>
      {showIOS && <IOSInstructions onClose={() => setShowIOS(false)} />}
    </>
  )
}

function IOSInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 4, color: '#5B8DBF' }}>
          Installer sur ton iPhone
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Safari te permet d'ajouter Personal OS à ton écran d'accueil.
          Deux étapes :
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center',
            padding: '14px 16px', background: 'var(--surface-deep)',
            border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: '#5B8DBF', color: '#0B1220',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Share size={16} />
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <strong>1.</strong> Appuie sur le bouton <em>Partager</em> en bas de Safari
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center',
            padding: '14px 16px', background: 'var(--surface-deep)',
            border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: '#5B8DBF', color: '#0B1220',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={16} />
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <strong>2.</strong> Choisis <em>« Sur l'écran d'accueil »</em>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 16, textAlign: 'center' }}>
          Personal OS apparaîtra comme une vraie app, plein écran.
        </p>
        <button onClick={onClose} className="btn-ghost" style={{ width: '100%', marginTop: 16 }}>
          Compris
        </button>
      </div>
    </div>
  )
}

function GenericInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: 'Fraunces', fontSize: 20, marginBottom: 4, color: '#5B8DBF' }}>
          Installer Personal OS
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Pas besoin de télécharger un fichier : Personal OS s'installe directement depuis
          ton navigateur, et fonctionne même hors connexion.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center',
            padding: '14px 16px', background: 'var(--surface-deep)',
            border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: '#5B8DBF', color: '#0B1220',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={16} />
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <strong>Android (Chrome) :</strong> menu <em>⋮</em> en haut à droite →
              <em> « Installer l'application »</em> (ou <em>« Ajouter à l'écran d'accueil »</em>)
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center',
            padding: '14px 16px', background: 'var(--surface-deep)',
            border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: '#5B8DBF', color: '#0B1220',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Download size={16} />
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <strong>Ordinateur (Chrome / Edge) :</strong> clique sur l'icône
              d'installation <em>⊕</em> dans la barre d'adresse, à droite
            </div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
          Tu peux aussi simplement continuer dans ton navigateur — tout marche déjà,
          même sans installer.
        </p>
        <button onClick={onClose} className="btn-ghost" style={{ width: '100%', marginTop: 16 }}>
          Compris
        </button>
      </div>
    </div>
  )
}
