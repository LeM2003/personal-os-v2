// @ts-nocheck — migration TypeScript en attente
"use client"

import { useState } from 'react'
import AbstractMark from './shared/AbstractMark'

const PROMISES = [
  { mark: 'rings', label: 'Tout à un seul endroit',
    sub: 'Tâches, finances, apprentissage, projets.' },
  { mark: 'arc',   label: 'Un rythme qui te respecte',
    sub: 'Des rappels doux, jamais de pression inutile.' },
  { mark: 'bars',  label: 'Des données qui te parlent',
    sub: 'Tu vois ce que tu fais vraiment, sur la durée.' },
]

const CONTEXTES = ['Études', 'Formation', 'Travail', 'Freelance', 'Autre']

function Progress({ step, total = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '18px 0 8px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 3, borderRadius: 999,
          width: i === step ? 28 : 16,
          background: i <= step ? 'var(--gold)' : 'var(--border)',
          transition: 'all 220ms',
        }}/>
      ))}
    </div>
  )
}

function Screen({ children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      minHeight: '100dvh', maxWidth: 520, margin: '0 auto',
      padding: '0 20px 24px',
    }}>
      {children}
    </div>
  )
}

function Footer({ primary, onPrimary, disabled, secondary, onSecondary }) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button className="btn-gold" onClick={onPrimary} disabled={disabled}
        style={{
          width: '100%', borderRadius: 14, padding: '15px',
          fontSize: 15.5, fontWeight: 600,
          opacity: disabled ? 0.55 : 1,
        }}>{primary}</button>
      {secondary && (
        <button onClick={onSecondary}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 500, color: 'var(--muted)',
            padding: 6, fontFamily: "'DM Sans', sans-serif",
          }}>{secondary}</button>
      )}
    </div>
  )
}

const MODES = [
  {
    id: 'etudiant',
    emoji: '📚',
    label: 'Étudiant',
    sub: 'Cours, examens, devoirs, budget étudiant',
    color: '#38bdf8',
  },
  {
    id: 'entrepreneur',
    emoji: '🚀',
    label: 'Professionnel / Entrepreneur',
    sub: 'Projets, clients, finances, productivité',
    color: '#818cf8',
  },
  {
    id: 'les-deux',
    emoji: '⚡',
    label: 'Les deux',
    sub: 'Tout — études et projets en même temps',
    color: '#f59e0b',
  },
  {
    id: 'custom',
    emoji: '🎛️',
    label: 'Personnalisé',
    sub: 'Tu choisis exactement les modules que tu veux',
    color: '#4ade80',
  },
]

const ALL_MODULE_OPTIONS = [
  { id: 'taches',      emoji: '✅', label: 'Tâches & habitudes' },
  { id: 'projets',     emoji: '🎯', label: 'Projets & Idées' },
  { id: 'ecole',       emoji: '📚', label: 'École' },
  { id: 'finances',    emoji: '💰', label: 'Finances' },
  { id: 'stats',       emoji: '📊', label: 'Statistiques' },
  { id: 'ajustements', emoji: '🔄', label: 'Ajustements' },
]

export default function Onboarding({ profile, onFinish }) {
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState(profile?.mode || '')
  const [objectif, setObjectif] = useState(profile?.objectif || '')
  const [pasted, setPasted] = useState('')
  const [customTabs, setCustomTabs] = useState(
    profile?.customTabs || ['taches', 'finances', 'stats', 'ajustements']
  )

  const toggleCustomTab = (id) => {
    if (id === 'dashboard') return // dashboard toujours présent
    setCustomTabs(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const finish = (patch = {}) => {
    const next = {
      ...profile,
      ...(mode ? { mode } : { mode: 'les-deux' }),
      ...(mode === 'custom' ? { customTabs: ['dashboard', ...customTabs.filter(t => t !== 'dashboard')] } : {}),
      ...(objectif.trim() ? { objectif: objectif.trim() } : {}),
      ...patch,
    }
    onFinish(next)
  }

  // ──────────────── Screen 1 : Welcome + promesses
  if (step === 0) return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <Screen>
        <Progress step={0} />

        <div style={{ textAlign: 'center', padding: '28px 4px 6px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
            <AbstractMark variant="rings" tone="accent" size={92} />
          </div>
          <h1 style={{
            fontFamily: 'Fraunces', fontSize: 34, fontWeight: 700,
            letterSpacing: '-1px', lineHeight: 1.05, margin: 0, color: 'var(--text)',
          }}>
            Bienvenue{profile?.prenom ? `, ${profile.prenom}` : ''}.
          </h1>
          <p style={{
            fontSize: 15, color: 'var(--muted)', marginTop: 12,
            lineHeight: 1.5, maxWidth: 320, margin: '12px auto 0',
          }}>
            Personal OS est un tableau de bord calme, pour y voir clair un jour à la fois.
          </p>
        </div>

        <div style={{ padding: '36px 0 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PROMISES.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ flexShrink: 0 }}>
                <AbstractMark variant={p.mark} tone="accent" size={46} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700,
                  color: 'var(--text)', letterSpacing: '-0.2px',
                }}>{p.label}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2, lineHeight: 1.45 }}>
                  {p.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Footer primary="Commencer" onPrimary={() => setStep(1)} />
      </Screen>
    </div>
  )

  // ──────────────── Screen 2 : Choix du MODE
  if (step === 1) return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <Screen>
        <Progress step={1} />

        <div style={{ padding: '20px 0 0' }}>
          <h1 style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0 }}>
            Tu es plutôt…
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
            On adapte l'app à ton profil. Tu peux changer ça plus tard.
          </p>
        </div>

        <div style={{ padding: '28px 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {MODES.map(m => {
            const on = mode === m.id
            return (
              <button key={m.id} type="button" onClick={() => setMode(m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '18px 20px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                  background: on ? `linear-gradient(135deg, ${m.color}18, ${m.color}08)` : 'var(--card)',
                  border: `2px solid ${on ? m.color : 'var(--border)'}`,
                  transition: 'all .2s', width: '100%',
                  boxShadow: on ? `0 0 20px ${m.color}20` : 'none',
                }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: on ? `${m.color}20` : 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, border: `1px solid ${on ? m.color + '40' : 'var(--border)'}` }}>
                  {m.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 18, fontWeight: 700, color: on ? m.color : 'var(--text)', marginBottom: 3 }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>{m.sub}</div>
                </div>
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${on ? m.color : 'var(--border)'}`, background: on ? m.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}>
                  {on && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Sélecteur modules custom */}
        {mode === 'custom' && (
          <div style={{ padding: '16px 0 0', animation: 'pageIn .3s ease both' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
              Choisis tes modules
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* Dashboard toujours activé */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(56,189,248,.08)', border: '1px solid rgba(56,189,248,.2)', opacity: 0.6 }}>
                <span style={{ fontSize: 16 }}>🏠</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-1)' }}>Dashboard</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--muted)' }}>toujours</span>
              </div>
              {ALL_MODULE_OPTIONS.map(mod => {
                const active = customTabs.includes(mod.id)
                return (
                  <button key={mod.id} type="button" onClick={() => toggleCustomTab(mod.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                      background: active ? 'rgba(74,222,128,.08)' : 'var(--card)',
                      border: `1px solid ${active ? 'rgba(74,222,128,.3)' : 'var(--border)'}`,
                      transition: 'all .15s', width: '100%' }}>
                    <span style={{ fontSize: 16 }}>{mod.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#4ade80' : 'var(--muted)', flex: 1 }}>{mod.label}</span>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? '#4ade80' : 'var(--border)'}`, background: active ? '#4ade80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {active && <span style={{ color: '#0B1220', fontSize: 10, fontWeight: 800 }}>✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
            {customTabs.length === 0 && (
              <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>Sélectionne au moins un module</p>
            )}
          </div>
        )}

        {/* Objectif */}
        <div style={{ padding: '24px 0 0' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Objectif principal (optionnel)
          </div>
          <textarea value={objectif} onChange={e => setObjectif(e.target.value)}
            placeholder="Une chose qui compte pour toi en ce moment" rows={2}
            style={{ fontSize: 14, lineHeight: 1.5, resize: 'none' }} />
        </div>

        <Footer
          primary="Continuer"
          onPrimary={() => setStep(2)}
          disabled={!mode || (mode === 'custom' && customTabs.length === 0)}
          secondary="Passer"
          onSecondary={() => { setMode('les-deux'); setStep(2) }}
        />
      </Screen>
    </div>
  )

  // ──────────────── Screen 3 : Import rapide ou démarrer à vide (adapté au mode)
  const isStudent = mode === 'etudiant' || mode === 'les-deux'
  const isPro = mode === 'entrepreneur' || mode === 'custom'

  const screen3Config = isPro && !isStudent ? {
    title: 'Démarrer vite ?',
    sub: 'Colle ta liste de tâches, tes projets en cours ou ton planning de la semaine.',
    placeholder: 'Projet site e-commerce — deadline 15 mai\nAppeler client Ndiaye\nPréparer devis marketing\n...',
    importLabel: 'Import tâches / projets',
  } : {
    title: 'Démarrer vite ?',
    sub: "Colle ce que tu as sous la main — emploi du temps, matières, cours. Tu pourras l'importer dans École plus tard.",
    placeholder: 'Lundi · 9h Maths · 11h Anglais\nMardi · 10h Programmation · 14h Design\n…',
    importLabel: 'Import emploi du temps',
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <Screen>
        <Progress step={2} />

        <div style={{ padding: '20px 0 0' }}>
          <h1 style={{
            fontFamily: 'var(--font-fraunces, Fraunces)', fontSize: 28, fontWeight: 700,
            letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0, color: 'var(--text)',
          }}>{screen3Config.title}</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
            {screen3Config.sub}
          </p>
        </div>

        {/* Paste zone */}
        <div style={{ padding: '22px 0 0' }}>
          <div style={{
            background: 'var(--card)', border: '1px dashed rgba(91,141,191,0.35)',
            borderRadius: 14, padding: 14, minHeight: 140,
          }}>
            <div style={{
              fontSize: 11.5, fontWeight: 600, color: 'var(--gold)',
              letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
            }}>
              ✦ {screen3Config.importLabel}
            </div>
            <textarea
              value={pasted}
              onChange={e => setPasted(e.target.value)}
              placeholder={screen3Config.placeholder}
              rows={5}
              style={{
                fontSize: 13.5, lineHeight: 1.55, resize: 'vertical',
                background: 'transparent', border: 'none', padding: 0,
                fontFamily: "'DM Sans', sans-serif", width: '100%',
              }}
            />
          </div>
        </div>

        {/* Separator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '24px 0 0',
        }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: 0.6 }}>OU</div>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        </div>

        {/* Start empty */}
        <div style={{ padding: '18px 0 0' }}>
          <button
            onClick={() => finish({ pendingImport: null })}
            style={{
              width: '100%', background: 'var(--card)',
              border: '1px solid var(--border)', borderRadius: 14,
              padding: '14px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
            }}>
            <AbstractMark variant="grid" tone="muted" size={36}/>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'Fraunces', fontSize: 15, fontWeight: 700,
                color: 'var(--text)',
              }}>Commencer à vide</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                Tu ajoutes au fur et à mesure.
              </div>
            </div>
            <span style={{ color: 'var(--muted)', fontSize: 18 }}>→</span>
          </button>
        </div>

        <Footer
          primary={pasted.trim() ? 'Enregistrer et continuer' : 'Continuer'}
          onPrimary={() => finish(pasted.trim() ? { pendingImport: pasted.trim() } : {})}
          secondary="Je le ferai plus tard"
          onSecondary={() => finish()}
        />
      </Screen>
    </div>
  )
}
