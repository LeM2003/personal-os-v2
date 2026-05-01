"use client"

import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import EmploiDuTemps from './EmploiDuTemps'
import DevoirsExamens from './DevoirsExamens'
import Notes from './Notes'
import TextImport from '../shared/TextImport'
import PageHeader from '../shared/PageHeader'
import { parseSchedule } from '../../utils/scheduleParser'

export default function Ecole() {
  const { courses, setCourses, devoirs, setDevoirs, examens, setExamens, tasks, setTasks, profile, setProfile } = useApp()
  const [sub, setSub] = useState('emploi')
  const [showImport, setShowImport] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const pending = profile?.pendingImport?.trim() || ''
  const parsed = useMemo(() => pending ? parseSchedule(pending) : [], [pending])
  const showBanner = !bannerDismissed && pending.length > 0

  const confirmImport = () => {
    if (parsed.length > 0) setCourses(p => [...p, ...parsed])
    setProfile(p => ({ ...(p || {}), pendingImport: '' }))
    setBannerDismissed(true)
    setSub('emploi')
  }

  const ignoreImport = () => {
    setProfile(p => ({ ...(p || {}), pendingImport: '' }))
    setBannerDismissed(true)
  }

  const handleImport = ({ taches, devoirs: newDevoirs, examens: newExamens }) => {
    if (taches.length > 0 && setTasks) setTasks(p => [...p, ...taches])
    if (newDevoirs.length > 0) setDevoirs(p => [...p, ...newDevoirs])
    if (newExamens.length > 0) setExamens(p => [...p, ...newExamens])
  }

  return (
    <div>
      <PageHeader title="École" sub="Emploi du temps, devoirs, examens"
        action={
          <button className="btn-ghost" onClick={() => setShowImport(true)}
            style={{ fontSize: 12, padding: '7px 13px', border: '1px solid rgba(91,141,191,.3)' }}>
            📋 Import IA
          </button>
        } />

      {showBanner && (
        <div className="card" style={{
          padding: 18, marginBottom: 20,
          background: 'rgba(91,141,191,.08)',
          border: '1px solid rgba(91,141,191,.3)',
          borderLeft: '3px solid #5B8DBF',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                📅 Tu avais collé un emploi du temps
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {parsed.length > 0
                  ? `${parsed.length} cours détecté${parsed.length > 1 ? 's' : ''} — vérifie l'aperçu puis confirme.`
                  : "Rien n'a pu être lu automatiquement. Ton format n'est peut-être pas reconnu — tu peux ignorer et saisir à la main."}
              </div>
            </div>
            <button className="btn-icon" onClick={ignoreImport} title="Ignorer" aria-label="Ignorer l'import">✕</button>
          </div>

          {parsed.length === 0 && (
            <div style={{
              padding: 12, marginBottom: 12, borderRadius: 8,
              background: 'var(--card)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--muted)', lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Formats reconnus
              </div>
              <div>• <b>Jours</b> : lundi, mardi… ou monday, tuesday…</div>
              <div>• <b>Heures</b> : 8h-10h, 08:00-10:00, 8h à 10h</div>
              <div>• <b>Dates</b> : 24-03-2026, 24/03/2026, 24.03.2026, 2026-03-24</div>
              <div style={{ marginTop: 6, fontStyle: 'italic' }}>
                Astuce : copie-colle directement depuis ton portail, sans nettoyer.
              </div>
            </div>
          )}

          {parsed.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, maxHeight: 220, overflowY: 'auto' }}>
              {parsed.map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  fontSize: 13,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, minWidth: 70 }}>{c.jour}</span>
                  <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {c.heureDebut}–{c.heureFin}
                  </span>
                  <span style={{ flex: 1 }}>{c.nom}</span>
                  {c.salle && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {c.salle}</span>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {parsed.length > 0 && (
              <button className="btn-gold" onClick={confirmImport}>
                ✓ Ajouter ces {parsed.length} cours
              </button>
            )}
            <button className="btn-ghost" onClick={ignoreImport}>Ignorer</button>
          </div>
        </div>
      )}

      <div className="subtab-bar" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={`subtab${sub === 'emploi' ? ' active' : ''}`} onClick={() => setSub('emploi')}>📅 Emploi du temps</button>
        <button className={`subtab${sub === 'devoirs' ? ' active' : ''}`} onClick={() => setSub('devoirs')}>📝 Devoirs & Examens</button>
        <button className={`subtab${sub === 'notes' ? ' active' : ''}`} onClick={() => setSub('notes')}>📊 Notes</button>
      </div>
      {sub === 'emploi' && <EmploiDuTemps />}
      {sub === 'devoirs' && <DevoirsExamens />}
      {sub === 'notes' && <Notes />}

      {showImport && (
        <TextImport onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
