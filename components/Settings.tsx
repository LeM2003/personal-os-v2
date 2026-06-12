"use client"

import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { haptic } from '@/utils/haptics'
import {
  Sun, Moon, Monitor, Check, Sparkles, User, Save, RotateCcw,
  MessageSquare, Coffee, ExternalLink, Inbox, Shield, Bell,
} from 'lucide-react'
import FeedbackModal from './modals/FeedbackModal'
import AccountModal from './modals/AccountModal'
import { createClient } from '@/lib/supabase/client'

// 👇 Remplis ces deux champs quand tu as les comptes
const WAVE_NUMBER  : string = '+221783019983'
const KOFI_URL     : string = ''   // ex: 'https://ko-fi.com/mouhamadou'
const LINKEDIN_URL : string = 'https://www.linkedin.com/in/mouhamadou-diouf-364309276'

const THEMES = [
  { id: 'dark',   label: 'Sombre', Icon: Moon },
  { id: 'light',  label: 'Clair',  Icon: Sun },
  { id: 'system', label: 'Auto',   Icon: Monitor },
]

const ACCENTS = [
  { id: 'cyan',    label: 'Cyan',     c1: '#38bdf8', c2: '#818cf8' },
  { id: 'violet',  label: 'Violet',   c1: '#a78bfa', c2: '#818cf8' },
  { id: 'emerald', label: 'Émeraude', c1: '#34d399', c2: '#22d3ee' },
  { id: 'amber',   label: 'Ambre',    c1: '#fbbf24', c2: '#fb923c' },
  { id: 'rose',    label: 'Rose',     c1: '#fb7185', c2: '#f472b6' },
  { id: 'blue',    label: 'Bleu',     c1: '#60a5fa', c2: '#3b82f6' },
]

const SIZES = [
  { id: 'sm', label: 'Petit' },
  { id: 'md', label: 'Moyen' },
  { id: 'lg', label: 'Grand' },
]

const TAB_OPTS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'taches',    label: 'Tâches' },
  { id: 'projets',   label: 'Projets' },
  { id: 'ecole',     label: 'École' },
  { id: 'finances',  label: 'Finances' },
  { id: 'stats',     label: 'Statistiques' },
]

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="card" style={{ padding: 22, marginBottom: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h2>
        {sub && <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.5 }}>{sub}</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{children}</div>
    </section>
  )
}

function Row({ label, hint, children, stack }: { label: string; hint?: string; children: React.ReactNode; stack?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: stack ? 'column' : 'row',
      alignItems: stack ? 'stretch' : 'center',
      justifyContent: 'space-between',
      gap: stack ? 10 : 16,
      flexWrap: 'wrap',
    }}>
      <div style={{ minWidth: stack ? undefined : 140 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, maxWidth: '40ch', lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => { haptic(3); onChange() }}
      style={{
        width: 46, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 3,
        background: on ? 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' : 'var(--bar-bg)',
        display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start',
        transition: 'background var(--dur-base)',
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: '#fff', flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0,0,0,.3)', transition: 'transform var(--dur-base) var(--ease-spring)',
      }} />
    </button>
  )
}

export default function Settings() {
  const {
    theme, setTheme, accent, setAccent, fontScale, setFontScale,
    reduceMotionPref, setReduceMotionPref, defaultTab, setDefaultTab,
    setProfileModal, setBackupModal, profile,
    notifEnabled, setNotifEnabled, enableNotifications,
  } = useApp()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [newFeedbacks, setNewFeedbacks] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pushTest, setPushTest] = useState<'idle' | 'sending' | 'ok' | 'no_sub' | 'error'>('idle')

  // Envoie une vraie notification Web Push de test via le serveur
  const testPush = async () => {
    haptic(3)
    setPushTest('sending')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { setPushTest('no_sub'); return }
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) setPushTest('ok')
      else if (res.status === 404) setPushTest('no_sub')
      else setPushTest('error')
    } catch {
      setPushTest('error')
    }
    setTimeout(() => setPushTest('idle'), 6000)
  }

  // Fetch count feedbacks non-lus (visible uniquement si superadmin/admin)
  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        const supabase = createClient()
        const { data: prof } = await supabase
          .from('profiles').select('role').single()
        if (!prof || !['admin', 'superadmin'].includes(prof.role)) return
        setIsAdmin(true)
        const { count } = await supabase
          .from('feedback').select('*', { count: 'exact', head: true })
          .eq('status', 'new')
        setNewFeedbacks(count ?? 0)
      } catch { /* ignore */ }
    }
    fetchFeedbacks()
  }, [])

  const resetAppearance = () => {
    if (typeof window !== 'undefined' && !confirm('Réinitialiser l\'apparence (thème, accent, taille, animations) ?')) return
    haptic(8)
    setTheme('dark'); setAccent('cyan'); setFontScale('md'); setReduceMotionPref(false)
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Réglages</h1>
          <p className="page-sub">Personnalise l&apos;apparence et le comportement de ton Personal OS.</p>
        </div>
        <button className="btn-ghost" onClick={resetAppearance} style={{ fontSize: 12 }}>
          <RotateCcw size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 5 }} /> Réinitialiser
        </button>
      </div>

      {/* ── Live preview ── */}
      <div className="card-gold" style={{ padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
        background: 'linear-gradient(135deg, var(--gold-dim), transparent)' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--glow-cyan)' }}>
          <Sparkles size={24} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700 }}>
            Aperçu en direct
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            Chaque réglage s&apos;applique instantanément à toute l&apos;app.
          </div>
          <div className="progress-track" style={{ marginTop: 10, maxWidth: 260 }}>
            <div className="progress-fill" style={{ width: '68%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge badge-yellow">Accent</span>
          <button className="btn-gold" style={{ pointerEvents: 'none' }}>Bouton</button>
        </div>
      </div>

      {/* ── Apparence ── */}
      <Section title="Apparence" sub="Thème, couleur d'accent et taille d'affichage.">
        <Row label="Thème" hint="« Auto » suit les réglages de ton système.">
          <div className="subtab-bar">
            {THEMES.map(({ id, label, Icon }) => (
              <button key={id} className={`subtab${theme === id ? ' active' : ''}`}
                onClick={() => { haptic(3); setTheme(id) }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Couleur d'accent" hint="Teinte les boutons, liens, états actifs et dégradés." stack>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {ACCENTS.map(a => {
              const active = accent === a.id
              return (
                <button key={a.id} onClick={() => { haptic(3); setAccent(a.id) }} title={a.label} aria-label={a.label}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                    background: `linear-gradient(135deg, ${a.c1}, ${a.c2})`,
                    border: active ? '2px solid var(--text)' : '2px solid transparent',
                    boxShadow: active ? `0 0 0 2px var(--bg), 0 0 14px ${a.c1}66` : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform var(--dur-fast) var(--ease-spring), box-shadow var(--dur-base)',
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.12)' }}
                  onMouseOut={e => { e.currentTarget.style.transform = '' }}>
                  {active && <Check size={16} color="#fff" strokeWidth={3} />}
                </button>
              )
            })}
          </div>
        </Row>

        <Row label="Taille d'affichage" hint="Agrandit ou réduit texte et interface.">
          <div className="subtab-bar">
            {SIZES.map(s => (
              <button key={s.id} className={`subtab${fontScale === s.id ? ' active' : ''}`}
                onClick={() => { haptic(3); setFontScale(s.id) }}>
                {s.label}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Réduire les animations" hint="Désactive les orbes de fond et les transitions animées.">
          <Toggle on={reduceMotionPref} onChange={() => setReduceMotionPref(v => !v)} />
        </Row>
      </Section>

      {/* ── Notifications ── */}
      <Section title="Notifications" sub="Rappels de tes examens, devoirs et routines quand l'app est ouverte.">
        <Row label="Rappels intelligents" hint={notifEnabled ? 'Activés' : 'Désactivés'}>
          <button className="btn-ghost" style={{ fontSize: 13,
            color: notifEnabled ? '#4ade80' : undefined }}
            onClick={() => { haptic(3); notifEnabled ? setNotifEnabled(false) : enableNotifications() }}>
            {notifEnabled ? 'Activées ✓' : 'Activer'}
          </button>
        </Row>
        {notifEnabled && (
          <Row label="Tester les notifications" hint={
            pushTest === 'ok' ? 'Notification envoyée — vérifie ton appareil 🎉'
            : pushTest === 'no_sub' ? 'Aucun abonnement — réactive les rappels (connexion requise)'
            : pushTest === 'error' ? "L'envoi a échoué — réessaie plus tard"
            : 'Envoie une notification de test à cet appareil.'
          }>
            <button className="btn-ghost" style={{ fontSize: 13,
              color: pushTest === 'ok' ? '#4ade80' : pushTest === 'error' || pushTest === 'no_sub' ? '#f87171' : undefined }}
              disabled={pushTest === 'sending'}
              onClick={testPush}>
              {pushTest === 'sending' ? 'Envoi…' : pushTest === 'ok' ? 'Envoyée ✓' : 'Tester 🔔'}
            </button>
          </Row>
        )}
      </Section>

      {/* ── Comportement ── */}
      <Section title="Comportement" sub="Comment l'app se lance.">
        <Row label="Onglet au démarrage" hint="L'écran ouvert au lancement d'une nouvelle session." stack>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TAB_OPTS.map(t => (
              <button key={t.id} className={`filter-pill${defaultTab === t.id ? ' active' : ''}`}
                onClick={() => { haptic(3); setDefaultTab(t.id) }}>
                {t.label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* ── Profil & données ── */}
      <Section title="Profil & données" sub="Identité et sauvegarde.">
        <Row label="Ton profil" hint={profile ? `${profile.prenom}${profile.nom ? ' ' + profile.nom : ''}` : 'Non configuré'}>
          <button className="btn-ghost" onClick={() => setProfileModal(true)} style={{ fontSize: 13 }}>
            <User size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 5 }} /> Modifier
          </button>
        </Row>
        <Row label="Sauvegarde / Restauration" hint="Exporte ou réimporte toutes tes données.">
          <button className="btn-ghost" onClick={() => setBackupModal(true)} style={{ fontSize: 13 }}>
            <Save size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 5 }} /> Gérer
          </button>
        </Row>
        <Row label="Mon compte" hint="Email, mot de passe, suppression de compte.">
          <button className="btn-ghost" onClick={() => setAccountOpen(true)} style={{ fontSize: 13 }}>
            <Shield size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 5 }} /> Gérer
          </button>
        </Row>
      </Section>

      {/* ── Soutenir & Contact ── */}
      <Section title="Soutenir & Contact" sub="Cet app est un projet indépendant. Chaque retour et chaque soutien compte.">
        <Row label="Donner mon avis" hint="Bug, idée, compliment — je lis tout.">
          <button className="btn-ghost" onClick={() => { haptic(3); setFeedbackOpen(true) }}
            style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={13} /> Écrire
          </button>
        </Row>

        {(WAVE_NUMBER || KOFI_URL) && (
          <Row label="Offrir un café ☕" hint="Si Personal OS t'aide, tu peux me soutenir — sans obligation." stack>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {WAVE_NUMBER && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--surface-deep)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px' }}>
                  <span style={{ fontSize: 20 }}>🌊</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Wave</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--accent-1)', fontFamily: 'monospace' }}>
                      {WAVE_NUMBER}
                    </p>
                  </div>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}
                    onClick={() => {
                      haptic(3)
                      navigator.clipboard.writeText(WAVE_NUMBER)
                        .then(() => alert('Numéro copié ! Ouvre Wave et envoie à ce numéro.'))
                        .catch(() => alert('Numéro : ' + WAVE_NUMBER))
                    }}>
                    Copier
                  </button>
                </div>
              )}
              {KOFI_URL && (
                <a href={KOFI_URL} target="_blank" rel="noreferrer"
                  className="btn-ghost"
                  style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                  <Coffee size={13} /> Ko-fi
                </a>
              )}
            </div>
          </Row>
        )}

        <Row label="Me contacter" hint="LinkedIn — pour collaborations, questions, retours longs.">
          <a href={LINKEDIN_URL} target="_blank" rel="noreferrer"
            className="btn-ghost"
            style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <ExternalLink size={13} /> LinkedIn
          </a>
        </Row>

        {/* ── Admin : feedbacks reçus (superadmin uniquement) ── */}
        {isAdmin && (
          <Row label="Feedbacks reçus" hint={newFeedbacks > 0 ? `${newFeedbacks} nouveau${newFeedbacks > 1 ? 'x' : ''}` : 'Aucun nouveau'}>
            <a href="https://supabase.com/dashboard/project/jhsiecozuzmuxkgxnixm/editor?schema=public&table=feedback"
              target="_blank" rel="noreferrer" className="btn-ghost"
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
                color: newFeedbacks > 0 ? 'var(--accent-1)' : undefined }}>
              <Inbox size={13} />
              Voir tout
              {newFeedbacks > 0 && (
                <span style={{ background: 'var(--accent-1)', color: 'var(--bg)', borderRadius: 999,
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', lineHeight: 1.6 }}>
                  {newFeedbacks}
                </span>
              )}
            </a>
          </Row>
        )}

        {/* Signature builder */}
        <div style={{ marginTop: 4, padding: '14px 16px', borderRadius: 12,
          background: 'linear-gradient(135deg, var(--gold-dim), transparent)',
          border: '1px solid rgba(56,189,248,.15)' }}>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>
            Personal OS est construit avec passion par{' '}
            <span style={{ color: 'var(--text)', fontStyle: 'normal', fontWeight: 600 }}>Mouhamadou Diouf</span>,
            étudiant en master IA à Dakar. Gratuit pendant que je construis.
          </p>
        </div>
      </Section>

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
      {accountOpen && <AccountModal onClose={() => setAccountOpen(false)}
        onLoggedOut={() => { window.location.href = '/' }} />}
    </div>
  )
}
