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

export default function Onboarding({ profile, onFinish }) {
  const [step, setStep] = useState(0)
  const [contexte, setContexte] = useState(profile?.contexte || '')
  const [objectif, setObjectif] = useState(profile?.objectif || '')
  const [pasted, setPasted] = useState('')

  const finish = (patch = {}) => {
    const next = {
      ...profile,
      ...(contexte ? { contexte } : {}),
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

  // ──────────────── Screen 2 : Profil (contexte + objectif)
  if (step === 1) return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <Screen>
        <Progress step={1} />

        <div style={{ padding: '20px 0 0' }}>
          <h1 style={{
            fontFamily: 'Fraunces', fontSize: 28, fontWeight: 700,
            letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0, color: 'var(--text)',
          }}>Dis-nous-en un peu plus.</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
            Deux éléments — rien de plus. Tu pourras ajuster plus tard.
          </p>
        </div>

        <div style={{ padding: '28px 0 0', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Contexte — chips */}
          <div>
            <div style={{
              fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
              letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
            }}>Contexte</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CONTEXTES.map(c => {
                const on = contexte === c
                return (
                  <button key={c} type="button"
                    onClick={() => setContexte(on ? '' : c)}
                    style={{
                      padding: '9px 14px', borderRadius: 999, cursor: 'pointer',
                      background: on ? 'var(--gold)' : 'var(--card)',
                      color: on ? '#fff' : 'var(--text)',
                      border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
                      fontSize: 13.5, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                    }}>{c}</button>
                )
              })}
            </div>
          </div>

          {/* Objectif — textarea */}
          <div>
            <div style={{
              fontSize: 11.5, fontWeight: 600, color: 'var(--muted)',
              letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
            }}>Objectif principal</div>
            <textarea
              value={objectif}
              onChange={e => setObjectif(e.target.value)}
              placeholder="Une chose qui compte pour toi en ce moment"
              rows={3}
              style={{ fontSize: 14.5, lineHeight: 1.5, resize: 'vertical' }}
            />
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.4 }}>
              Ex : réussir mon semestre, lancer mon projet, mieux m'organiser.
            </div>
          </div>
        </div>

        <Footer
          primary="Continuer"
          onPrimary={() => setStep(2)}
          secondary="Passer cette étape"
          onSecondary={() => setStep(2)}
        />
      </Screen>
    </div>
  )

  // ──────────────── Screen 3 : Import rapide ou démarrer à vide
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <Screen>
        <Progress step={2} />

        <div style={{ padding: '20px 0 0' }}>
          <h1 style={{
            fontFamily: 'Fraunces', fontSize: 28, fontWeight: 700,
            letterSpacing: '-0.8px', lineHeight: 1.1, margin: 0, color: 'var(--text)',
          }}>Démarrer vite ?</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
            Colle ce que tu as sous la main — emploi du temps, matières, cours.
            Tu pourras l'importer dans École plus tard.
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
              ✦ Import rapide
            </div>
            <textarea
              value={pasted}
              onChange={e => setPasted(e.target.value)}
              placeholder={'Lundi · 9h Maths · 11h Anglais\nMardi · 10h Programmation · 14h Design\n…'}
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
