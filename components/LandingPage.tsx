"use client"

import { useState, useEffect } from 'react'
import InstallPrompt from './shared/InstallPrompt'
import { createClient } from '@/lib/supabase/client'

const PROBLEMS = [
  { icon: '📱', text: 'Tes notes dans WhatsApp. Tes deadlines dans ta tête. Ton budget, nulle part.' },
  { icon: '💸', text: 'L\'argent part, tu ne sais pas où. La fin du mois arrive trop vite.' },
  { icon: '🌀', text: 'Tu ouvres cinq apps. Tu n\'en utilises vraiment aucune.' },
]

const FEATURES = [
  { icon: '✅', title: 'Tâches & habitudes',  desc: 'Priorités, échéances, récurrences, timer Pomodoro. Ce qui doit être fait, et quand.' },
  { icon: '💰', title: 'Budget clair',         desc: 'Tes dépenses par catégorie, tes budgets, tes abonnements. Tu vois enfin où ça part.' },
  { icon: '📚', title: 'Côté études',          desc: 'Emploi du temps, devoirs, examens, révisions. Si tu étudies, tout est là.' },
  { icon: '🎯', title: 'Idées & projets',      desc: 'Note tes idées. Transforme celles qui tiennent en projets avec étapes et suivi.' },
  { icon: '📊', title: 'Ton tableau de bord',  desc: 'Ta semaine, ta discipline, ta performance. Un regard, et tu sais où tu en es.' },
  { icon: '🤖', title: 'IA quand tu veux',     desc: 'Importe une liste, analyse un projet, accélère un tri. L\'IA aide, sans s\'imposer.' },
]

const STATS = [
  { value: '0 FCFA', label: 'Pour commencer' },
  { value: '0',      label: 'Téléchargement' },
  { value: '30s',    label: 'Pour installer' },
  { value: '∞',      label: 'Hors connexion' },
]

const CTA_BTN = {
  background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
  color: '#fff', border: 'none', borderRadius: 12,
  padding: '16px 40px', fontSize: 17, fontWeight: 700,
  fontFamily: 'var(--font-fraunces, Fraunces)', cursor: 'pointer',
  transition: 'transform .15s var(--ease-spring, cubic-bezier(.34,1.56,.64,1)), box-shadow .2s',
  boxShadow: '0 4px 24px rgba(56,189,248,.3)',
}

import type { UserProfile } from '@/types'

const ROLE_TO_MODE: Record<string, 'etudiant' | 'entrepreneur' | 'les-deux' | 'custom'> = {
  'Étudiant': 'etudiant', 'Entrepreneur': 'entrepreneur',
  'Étudiant-entrepreneur': 'les-deux', 'Cadre': 'entrepreneur',
  'Directeur': 'entrepreneur', 'Freelance': 'entrepreneur',
  'Parent': 'custom', 'Autre': 'custom',
}

export default function LandingPage({ onStart }: { onStart: (profile: UserProfile) => void }) {
  const [showSetup,  setShowSetup]  = useState(false)
  const [showSticky, setShowSticky] = useState(false)
  const [authMode,   setAuthMode]   = useState<'signin' | 'signup'>('signup')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError,  setAuthError]  = useState('')
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    prenom: '', nom: '', role: 'Étudiant-entrepreneur',
  })

  const handleAuth = async () => {
    setAuthError('')
    if (!form.email.trim() || !form.password) { setAuthError('Email et mot de passe requis.'); return }
    if (authMode === 'signup' && !form.prenom.trim()) { setAuthError('Ton prénom est requis.'); return }
    if (authMode === 'signup' && form.password !== form.confirmPassword) { setAuthError('Les mots de passe ne correspondent pas.'); return }
    if (form.password.length < 6) { setAuthError('Le mot de passe doit faire au moins 6 caractères.'); return }

    setAuthLoading(true)
    const supabase = createClient()

    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: `${form.prenom.trim()} ${form.nom.trim()}`.trim() } },
      })
      if (error) { setAuthError(error.message); setAuthLoading(false); return }
      // Confirmation email requise → on prévient l'utilisateur
      if (!data.session) {
        setAuthError(''); setAuthLoading(false)
        alert('🎉 Compte créé ! Vérifie ton email pour confirmer, puis connecte-toi.')
        setAuthMode('signin'); return
      }
      onStart({ prenom: form.prenom.trim(), nom: form.nom.trim() || undefined, mode: ROLE_TO_MODE[form.role] || 'les-deux' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password })
      if (error) {
        setAuthError(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message)
        setAuthLoading(false); return
      }
      // Connexion réussie — récupère le profil Supabase si dispo, sinon prénom de l'email
      const prenom = form.email.split('@')[0]
      onStart({ prenom, mode: 'les-deux' })
    }
    setAuthLoading(false)
  }

  const handleForgotPassword = async () => {
    if (!form.email.trim()) { setAuthError('Entre ton email d\'abord, puis clique sur « Mot de passe oublié ».'); return }
    setAuthLoading(true); setAuthError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setAuthLoading(false)
    if (error) { setAuthError(error.message); return }
    alert('📧 Email envoyé ! Vérifie ta boîte (et les spams) pour réinitialiser ton mot de passe.')
  }

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden', position: 'relative' }}>

      {/* ── HERO ── */}
      <header style={{ padding: 'clamp(48px, 7vw, 80px) 20px clamp(32px, 5vw, 56px)', textAlign: 'center', maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(56,189,248,.08)', border: '1px solid rgba(56,189,248,.2)', borderRadius: 999, padding: '6px 16px', marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--accent-1)', fontWeight: 600, letterSpacing: .3 }}>Gratuit · Multi-appareils · Tes données sécurisées</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 'clamp(28px, 6.5vw, 52px)', fontWeight: 700, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.03em' }}>
          Tu as du mal à gérer ta vie ?{' '}
          <span style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
            Reprends-la en main.
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(15px, 2.5vw, 18px)', color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 540, margin: '0 auto 32px' }}>
          Un seul endroit pour tes tâches, ton argent, tes projets — et tes cours si tu étudies.
          Peu importe ce que tu fais ou d'où tu viens.
        </p>

        <div style={{ display: 'inline-flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
          <button onClick={() => setShowSetup(true)} style={CTA_BTN}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(56,189,248,.4)' }}
            onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(56,189,248,.3)' }}>
            Entrer →
          </button>
          <InstallPrompt variant="button" />
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: .3 }}>
          Données sécurisées · Synchronisées sur tous tes appareils
        </p>
        <button type="button" onClick={() => onStart({ prenom: 'toi', mode: 'les-deux' })}
          style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: 10,
            color: 'var(--accent-1)', fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-dm-sans, DM Sans)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          ou essaie d'abord sans compte →
        </button>
      </header>

      {/* ── STATS BAR ── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(20px, 5vw, 56px)', padding: '24px 20px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 700, margin: 0, background: i % 2 === 0 ? 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' : 'linear-gradient(135deg, var(--accent-2), var(--accent-3))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {s.value}
            </p>
            <p style={{ fontSize: 10, color: 'var(--muted)', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: .8 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── LE PROBLÈME ── */}
      <section style={{ padding: 'clamp(28px, 5vw, 48px) 20px', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700,
          textAlign: 'center', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Le <span style={{ color: '#f87171' }}>chaos</span>, on connaît.
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
          Gérer ses études, son travail, son argent, ses idées — sans système, c'est épuisant.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PROBLEMS.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'rgba(248,113,113,.05)', border: '1px solid rgba(248,113,113,.15)',
              borderRadius: 12, padding: '16px 18px',
            }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{p.icon}</span>
              <p style={{ fontSize: 14, color: 'var(--text)', margin: 0, lineHeight: 1.6, opacity: .9 }}>{p.text}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <p style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontWeight: 600, fontSize: 16, background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Personal OS, c'est un seul endroit pour tout ça.
          </p>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: 'clamp(28px, 5vw, 48px) 20px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700,
          textAlign: 'center', marginBottom: 8, letterSpacing: '-0.02em' }}>
          Ce qu'il te faut. <span style={{ color: '#5B8DBF' }}>Rien de plus.</span>
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' }}>
          Pas dix apps. Une seule, qui regroupe ce qui compte vraiment au quotidien.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {FEATURES.map((f, i) => (
            <div key={f.title}
              style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '22px 22px', transition: 'border-color .2s, transform .25s, box-shadow .25s', backdropFilter: 'blur(12px)', position: 'relative', overflow: 'hidden' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(56,189,248,.25)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,.2), 0 0 20px rgba(56,189,248,.06)' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: i % 3 === 0 ? 'linear-gradient(90deg, var(--accent-1), var(--accent-2))' : i % 3 === 1 ? 'linear-gradient(90deg, var(--accent-2), var(--accent-3))' : 'linear-gradient(90deg, var(--accent-3), var(--accent-1))', opacity: 0.6 }} />
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(56,189,248,.08)', border: '1px solid rgba(56,189,248,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, fontSize: 22 }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 15, fontWeight: 600, marginBottom: 8, letterSpacing: '-.01em' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA MILIEU ── */}
      <section style={{ padding: 'clamp(20px, 4vw, 32px) 20px', textAlign: 'center' }}>
        <button onClick={() => setShowSetup(true)}
          style={{ ...CTA_BTN, padding: '14px 36px', fontSize: 16 }}
          onMouseOver={e => (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'}
          onMouseOut={e => (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'}>
          Essayer
        </button>
      </section>

      {/* ── POUR QUI ── */}
      <section style={{ padding: 'clamp(24px, 4vw, 40px) 20px', background: 'var(--card)', borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Fraunces', fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Fait pour toi.
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, maxWidth: 480, margin: '0 auto 20px' }}>
            Peu importe ton rôle. Ce qui compte, c'est que tu veuilles reprendre la main.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
            {['Étudiant', 'Entrepreneur', 'Cadre', 'Directeur', 'Freelance', 'Parent', 'Side-hustler', 'Autodidacte'].map(r => (
              <span key={r} style={{ background: 'var(--gold-dim)', border: '1px solid rgba(91,141,191,.2)',
                borderRadius: 999, padding: '10px 20px', fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>
                {r}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section style={{ padding: 'clamp(28px, 5vw, 48px) 20px', maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700,
          textAlign: 'center', marginBottom: 24, letterSpacing: '-0.02em' }}>
          Trois étapes. C'est tout.
        </h2>
        {[
          { step: '1', title: 'Ton compte', desc: 'Email et mot de passe. Tes données sécurisées, accessibles sur tous tes appareils.' },
          { step: '2', title: 'Ton dashboard', desc: 'Une page vide qui n\'attend que tes vraies tâches, tes vraies dépenses, tes vrais projets.' },
          { step: '3', title: 'Ta vie, en main', desc: 'Tout reste dans ton navigateur. Même hors ligne. Même si tu changes d\'avis demain.' },
        ].map(s => (
          <div key={s.step} style={{ display: 'flex', gap: 16, marginBottom: 22, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: '#5B8DBF', color: '#0B1220',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Fraunces', fontWeight: 700, fontSize: 17 }}>
              {s.step}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>{s.title}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: 'clamp(36px, 6vw, 64px) 20px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 'clamp(20px, 5vw, 32px)', fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
          Prêt à reprendre la main ?
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px', lineHeight: 1.6 }}>
          Gratuit. Rapide. Sans condition.
        </p>
        <button onClick={() => setShowSetup(true)} style={CTA_BTN}
          onMouseOver={e => { const t = e.currentTarget as HTMLButtonElement; t.style.transform = 'translateY(-2px)'; t.style.boxShadow = '0 6px 30px rgba(91,141,191,.4)' }}
          onMouseOut={e => { const t = e.currentTarget as HTMLButtonElement; t.style.transform = 'translateY(0)'; t.style.boxShadow = '0 4px 24px rgba(91,141,191,.28)' }}>
          Entrer
        </button>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
          Pas de carte. Pas de spam. Juste toi et ton tableau.
        </p>
      </section>

      {/* ── CRÉATEUR ── */}
      <section style={{ padding: 'clamp(28px, 5vw, 48px) 20px', background: 'var(--card)',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: '#5B8DBF', color: '#0B1220',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Fraunces', fontWeight: 700, fontSize: 22,
            boxShadow: '0 4px 16px rgba(91,141,191,.25)',
          }}>
            MD
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>
              Mouhamadou Diouf
            </p>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 10px' }}>
              Étudiant en master IA, entrepreneur. J'ai construit Personal OS parce que
              j'avais moi-même besoin de reprendre la main. Si ça t'aide aussi, dis-le moi.
            </p>
            <a href="https://www.linkedin.com/in/mouhamadou-diouf-364309276" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: '#5B8DBF', textDecoration: 'none', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Me joindre sur LinkedIn →
            </a>
          </div>
        </div>
        <p style={{ maxWidth: 560, margin: '24px auto 0', fontSize: 12, color: 'var(--muted)',
          textAlign: 'center', lineHeight: 1.6, fontStyle: 'italic' }}>
          Gratuit pendant que je construis. Quand ce sera mûr, certaines fonctionnalités
          deviendront payantes — mais ce qui est là aujourd'hui restera accessible.
        </p>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '28px 20px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Fraunces', fontWeight: 700, color: '#5B8DBF', fontSize: 16, marginBottom: 4 }}>
          Personal OS
        </p>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 0 }}>
          Un projet indépendant · Fait à Dakar · 2026
        </p>
      </footer>

      {/* ── STICKY CTA MOBILE ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 998,
        padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'linear-gradient(to top, var(--bg) 60%, transparent)',
        textAlign: 'center',
        transform: showSticky && !showSetup ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .3s ease',
        pointerEvents: showSticky && !showSetup ? 'auto' : 'none',
      }}>
        <button onClick={() => setShowSetup(true)}
          style={{ ...CTA_BTN, width: '100%', maxWidth: 400, padding: '14px 20px', fontSize: 15 }}>
          Entrer
        </button>
      </div>

      {/* ── AUTH MODAL ── */}
      {showSetup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
          onClick={() => setShowSetup(false)}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
            padding: 28, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>

            {/* Toggle signin / signup */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--input-bg)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
              {(['signup', 'signin'] as const).map(mode => (
                <button key={mode} type="button"
                  onClick={() => { setAuthMode(mode); setAuthError('') }}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
                    fontWeight: 700, fontFamily: 'var(--font-dm-sans, DM Sans)',
                    background: authMode === mode ? 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' : 'transparent',
                    color: authMode === mode ? '#fff' : 'var(--muted)',
                    transition: 'all var(--dur-base)',
                  }}>
                  {mode === 'signup' ? 'Créer un compte' : 'Se connecter'}
                </button>
              ))}
            </div>

            <h3 style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 20, marginBottom: 4, color: 'var(--accent-1)' }}>
              {authMode === 'signup' ? 'Content de te voir.' : 'Bon retour !'}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
              {authMode === 'signup'
                ? 'Crée ton compte pour accéder à Personal OS sur tous tes appareils.'
                : 'Connecte-toi pour retrouver ton tableau de bord.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Signup uniquement : prénom + nom + rôle */}
              {authMode === 'signup' && <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })}
                    placeholder="Prénom *" autoFocus style={{ flex: 1 }}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()} />
                  <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                    placeholder="Nom (optionnel)" style={{ flex: 1 }}
                    onKeyDown={e => e.key === 'Enter' && handleAuth()} />
                </div>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option>Étudiant-entrepreneur</option><option>Étudiant</option>
                  <option>Entrepreneur</option><option>Cadre</option>
                  <option>Freelance</option><option>Parent</option><option>Autre</option>
                </select>
              </>}

              {/* Email + mot de passe */}
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="Email *" autoFocus={authMode === 'signin'}
                onKeyDown={e => e.key === 'Enter' && handleAuth()} />
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Mot de passe * (6 caractères min)"
                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                onKeyDown={e => e.key === 'Enter' && handleAuth()} />
              {authMode === 'signup' && (
                <input type="password" value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Confirmer le mot de passe *"
                  autoComplete="new-password"
                  onKeyDown={e => e.key === 'Enter' && handleAuth()} />
              )}
            </div>

            {authMode === 'signin' && (
              <button type="button" onClick={handleForgotPassword}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0 0',
                  color: 'var(--accent-1)', fontSize: 12, fontFamily: 'var(--font-dm-sans, DM Sans)',
                  textAlign: 'right', width: '100%' }}>
                Mot de passe oublié ?
              </button>
            )}

            {/* Message d'erreur */}
            {authError && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8,
                background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)',
                fontSize: 13, color: '#fca5a5' }}>
                {authError}
              </div>
            )}

            <button onClick={handleAuth} disabled={authLoading}
              style={{ width: '100%', marginTop: 16,
                background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
                color: '#fff', border: 'none', borderRadius: 10, padding: '13px 20px', fontSize: 15,
                fontWeight: 700, fontFamily: 'var(--font-fraunces, Fraunces)', cursor: authLoading ? 'not-allowed' : 'pointer',
                opacity: authLoading ? .6 : 1, transition: 'opacity .2s' }}>
              {authLoading ? '…' : authMode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
            </button>

            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, textAlign: 'center', lineHeight: 1.5 }}>
              {authMode === 'signup'
                ? 'En créant un compte tu acceptes que tes données soient stockées de façon sécurisée.'
                : 'Tes données sont chiffrées et sécurisées.'}
            </p>

            {/* Mode invité : zéro friction pour découvrir l'app (lien partagé) */}
            {authMode === 'signup' && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <button type="button" onClick={() => onStart({ prenom: 'toi', mode: 'les-deux' })}
                  style={{ background: 'none', border: '1px dashed rgba(56,189,248,.4)', borderRadius: 10,
                    cursor: 'pointer', padding: '10px 18px', width: '100%',
                    color: 'var(--accent-1)', fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-dm-sans, DM Sans)' }}>
                  👀 Essayer d'abord sans compte
                </button>
                <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
                  Tes données restent sur cet appareil. Crée un compte plus tard pour les synchroniser.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
