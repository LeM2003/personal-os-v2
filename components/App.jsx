"use client"

import { lazy, Suspense, useState } from 'react'
import { useApp } from '../context/AppContext'

const LandingPage = lazy(() => import('./LandingPage'))
const Onboarding  = lazy(() => import('./Onboarding'))
const Dashboard   = lazy(() => import('./Dashboard'))
const Taches      = lazy(() => import('./Taches'))
const Projets     = lazy(() => import('./Projets'))
const Ecole       = lazy(() => import('./Ecole'))
const Finances    = lazy(() => import('./Finances'))
const Ajustements = lazy(() => import('./Ajustements'))
const Stats       = lazy(() => import('./Stats'))

const TabFallback = () => (
  <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
    Chargement…
  </div>
)
import PomodoroModal from './shared/PomodoroModal'
import GlobalSearch from './shared/GlobalSearch'
import InstallPrompt from './shared/InstallPrompt'
import MissedReminders from './shared/MissedReminders'
import BottomSheet from './shared/BottomSheet'
import { downloadICS, countICSItems } from '../utils/icsExport'
import {
  LayoutDashboard, CheckSquare, Target, GraduationCap, Wallet,
  BarChart3, RefreshCw, Search, User, Bell, BellOff, Save,
  Sun, Moon, LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'

const ICON_SIZE = 18

const TABS = [
  { id: 'dashboard',   icon: <LayoutDashboard size={ICON_SIZE} />,  label: 'Dashboard'      },
  { id: 'taches',      icon: <CheckSquare size={ICON_SIZE} />,      label: 'Tâches'          },
  { id: 'projets',     icon: <Target size={ICON_SIZE} />,           label: 'Projets & Idées' },
  { id: 'ecole',       icon: <GraduationCap size={ICON_SIZE} />,    label: 'École'           },
  { id: 'finances',    icon: <Wallet size={ICON_SIZE} />,           label: 'Finances'        },
  { id: 'stats',       icon: <BarChart3 size={ICON_SIZE} />,        label: 'Statistiques'    },
  { id: 'ajustements', icon: <RefreshCw size={ICON_SIZE} />,        label: 'Ajustements'     },
]

function ProfileModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({ prenom: profile?.prenom || '', nom: profile?.nom || '', role: profile?.role || 'Étudiant-entrepreneur' })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, marginBottom: 16, color: '#5B8DBF' }}>👤 Toi</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} placeholder="Prénom *" autoFocus />
          <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Nom (optionnel)" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option>Étudiant-entrepreneur</option><option>Étudiant</option>
            <option>Entrepreneur</option><option>Freelance</option><option>Autre</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button className="btn-gold" onClick={() => onSave(form)} disabled={!form.prenom.trim()}>Enregistrer</button>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

function CalendarExportModal({ open, data, onClose }) {
  const counts = countICSItems(data)
  const [inc, setInc] = useState({
    recurringTasks: counts.recurringTasks > 0,
    oneshotTasks:   counts.oneshotTasks > 0,
    examens:        counts.examens > 0,
    devoirs:        counts.devoirs > 0,
    subscriptions:  counts.subscriptions > 0,
  })

  const ROWS = [
    { key: 'recurringTasks', label: 'Tâches récurrentes', hint: 'Limitées à 1 an (365 occurrences max)' },
    { key: 'oneshotTasks',   label: 'Tâches ponctuelles', hint: 'Avec deadline, non terminées' },
    { key: 'examens',        label: 'Examens',            hint: 'Rappel 24h avant' },
    { key: 'devoirs',        label: 'Devoirs',            hint: 'Non rendus, rappel 24h avant' },
    { key: 'subscriptions',  label: 'Abonnements',        hint: 'Renouvellement mensuel/annuel' },
  ]

  const totalSelected = ROWS.reduce((n, r) => n + (inc[r.key] ? counts[r.key] : 0), 0)

  const handleDownload = () => {
    downloadICS(data, inc)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="📅 Export Calendrier">
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
        Choisis ce qui part dans ton agenda. Les tâches récurrentes sont plafonnées à 1 an pour éviter le spam.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {ROWS.map(r => {
          const n = counts[r.key]
          const disabled = n === 0
          return (
            <label key={r.key}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                borderRadius: 8, border: '1px solid var(--border)', cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.4 : 1, background: inc[r.key] ? 'rgba(91,141,191,.06)' : 'transparent' }}>
              <input type="checkbox" checked={inc[r.key]} disabled={disabled}
                onChange={e => setInc({ ...inc, [r.key]: e.target.checked })}
                style={{ marginTop: 3, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                  {r.label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({n})</span>
                </p>
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>{r.hint}</p>
              </div>
            </label>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-gold" onClick={handleDownload} disabled={totalSelected === 0}>
          ⬇️ Télécharger ({totalSelected})
        </button>
        <button className="btn-ghost" onClick={onClose}>Annuler</button>
      </div>
    </BottomSheet>
  )
}

export default function App() {
  const app = useApp()
  const {
    tab, setTab, profile, setProfile,
    adjustments, pomo, pausePomo, stopPomo, donePomo,
    theme, toggleTheme, notifEnabled, setNotifEnabled, enableNotifications,
    searchOpen, setSearchOpen,
    profileModal, setProfileModal, backupModal, setBackupModal,
    importRef, exportData, importData,
    tasks, devoirs, examens, projects, subscriptions,
  } = app
  const [mobileMore, setMobileMore] = useState(false)
  const [loggedOut, setLoggedOut] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [icsModal, setIcsModal] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(() => {
    try { return localStorage.getItem('onboardingDone') === '1' } catch { return false }
  })

  const logout = () => setLoggedOut(true)
  const handleStart = (formData) => {
    setProfile(formData)
    setLoggedOut(false)
  }
  const handleOnboardingFinish = (nextProfile) => {
    setProfile(nextProfile)
    try { localStorage.setItem('onboardingDone', '1') } catch { /* ignore */ }
    setOnboardingDone(true)
  }

  const adjBadge = adjustments.length > 0 && (
    <span style={{ background: '#f87171', color: '#fff', borderRadius: '50%', width: 18, height: 18,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginLeft: 'auto' }}>
      {adjustments.length}
    </span>
  )

  // ── Nouveau visiteur OU déconnecté → Landing Page ──
  if (!profile || loggedOut) {
    return (
      <Suspense fallback={<TabFallback />}>
        <LandingPage onStart={handleStart} />
      </Suspense>
    )
  }

  // ── Premier lancement après login → Onboarding 3 écrans ──
  if (!onboardingDone) {
    return (
      <Suspense fallback={<TabFallback />}>
        <Onboarding profile={profile} onFinish={handleOnboardingFinish} />
      </Suspense>
    )
  }

  return (
    <div>
      {/* SIDEBAR */}
      <aside className={`sidebar${sidebarOpen ? '' : ' collapsed'}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 8, marginBottom: 28 }}>
          {sidebarOpen ? (
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: '#5B8DBF', letterSpacing: '-0.5px' }}>Personal OS</h1>
              <p style={{ color: 'var(--muted)', fontSize: 11, marginTop: 3 }}>Ton tableau de bord personnel</p>
            </div>
          ) : (
            <span style={{ fontSize: 20, fontWeight: 800, color: '#5B8DBF' }}>P</span>
          )}
          <button className="btn-icon" onClick={() => setSidebarOpen(s => !s)}
            title={sidebarOpen ? 'Réduire' : 'Ouvrir'} style={{ flexShrink: 0 }}>
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        </div>

        {sidebarOpen ? (
          <button onClick={() => setSearchOpen(true)} aria-label="Rechercher"
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px',
              background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--muted)', fontSize: 13, cursor: 'pointer', marginBottom: 16,
              fontFamily: 'DM Sans', transition: 'border-color .2s' }}>
            <Search size={14} />
            <span style={{ flex: 1, textAlign: 'left' }}>Rechercher...</span>
            <kbd style={{ background: 'var(--bar-bg)', border: '1px solid var(--border)', borderRadius: 4,
              padding: '1px 6px', fontSize: 10 }}>⌘K</kbd>
          </button>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="btn-icon"
            style={{ width: '100%', marginBottom: 12 }} title="Rechercher">
            <Search size={16} />
          </button>
        )}

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {TABS.map(t => (
            <div key={t.id} className={`nav-item${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}
              title={!sidebarOpen ? t.label : undefined}
              style={!sidebarOpen ? { justifyContent: 'center', padding: '10px 0' } : undefined}>
              <span className="nav-icon">{t.icon}</span>
              {sidebarOpen && <span style={{ flex: 1 }}>{t.label}</span>}
              {sidebarOpen && t.id === 'ajustements' && adjustments.length > 0 && adjBadge}
              {!sidebarOpen && t.id === 'ajustements' && adjustments.length > 0 && (
                <span style={{ position: 'absolute', top: 2, right: 2, background: '#f87171', color: '#fff',
                  borderRadius: '50%', width: 14, height: 14, fontSize: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {adjustments.length}
                </span>
              )}
            </div>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sidebarOpen ? (
            <>
              {profile && (
                <button className="btn-ghost" style={{ width: '100%', fontSize: 12, padding: '8px 12px', textAlign: 'left' }}
                  onClick={() => setProfileModal(true)}>
                  <User size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> {profile.prenom} {profile.nom || ''} <span style={{ color: 'var(--muted)', fontSize: 11 }}>— Modifier</span>
                </button>
              )}
              <button className="btn-ghost" style={{ width: '100%', fontSize: 12, padding: '8px 12px',
                color: notifEnabled ? '#4ade80' : undefined }}
                onClick={notifEnabled ? () => setNotifEnabled(false) : enableNotifications}>
                {notifEnabled
                  ? <><Bell size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Notifications activées</>
                  : <><BellOff size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Activer les notifications</>}
              </button>
              {notifEnabled && (
                <p style={{ fontSize: 10, color: 'var(--muted)', padding: '0 12px', margin: 0, lineHeight: 1.4 }}>
                  Fonctionne uniquement quand l'app est ouverte. Pour les rappels hors-ligne, ajoute l'app à ton écran d'accueil.
                </p>
              )}
              <button className="btn-ghost" style={{ width: '100%', fontSize: 12, padding: '8px 12px' }}
                onClick={() => setBackupModal(true)}>
                <Save size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Sauvegarde / Restauration
              </button><button className="btn-ghost" style={{ width: '100%', fontSize: 12, padding: '8px 12px' }}
                onClick={toggleTheme}>
                {theme === 'dark'
                  ? <><Sun size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Thème clair</>
                  : <><Moon size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Thème sombre</>}
              </button>
              <button className="btn-ghost" style={{ width: '100%', fontSize: 12, padding: '8px 12px',
                color: '#f87171', borderColor: 'rgba(248,113,113,.25)', marginTop: 4 }}
                onClick={logout}>
                <LogOut size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} /> Déconnexion
              </button>
            </>
          ) : (
            <>
              <button className="btn-icon" onClick={() => setProfileModal(true)} title="Profil"><User size={16} /></button>
              <button className="btn-icon" onClick={toggleTheme} title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button className="btn-icon" onClick={() => setBackupModal(true)} title="Sauvegarde"><Save size={16} /></button>
              <button className="btn-icon" onClick={logout} title="Déconnexion" style={{ color: '#f87171' }}><LogOut size={16} /></button>
            </>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-content" style={!sidebarOpen ? { marginLeft: 68 } : undefined}>
        <MissedReminders />
        <div className="page-enter" key={tab}>
          <Suspense fallback={<TabFallback />}>
            {tab === 'dashboard'   && <Dashboard />}
            {tab === 'taches'      && <Taches />}
            {tab === 'projets'     && <Projets />}
            {tab === 'ecole'       && <Ecole />}
            {tab === 'finances'    && <Finances />}
            {tab === 'stats'       && <Stats />}
            {tab === 'ajustements' && <Ajustements />}
          </Suspense>
        </div>
      </main>

      {/* BOTTOM NAV (mobile) — 5 onglets principaux */}
      <nav className="bottom-nav">
        {TABS.filter(t => ['dashboard', 'taches', 'projets', 'finances', 'stats'].includes(t.id)).map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setMobileMore(false) }} aria-label={t.label}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 2, padding: '4px 6px', flex: 1,
              color: tab === t.id ? '#5B8DBF' : 'var(--muted)' }}>
            <span>{t.icon}</span>
            <span style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 500 }}>{t.label.split(' ')[0]}</span>
          </button>
        ))}
        <button onClick={() => setMobileMore(m => !m)} aria-label="Plus d'options"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 2, padding: '4px 6px', flex: 1, position: 'relative',
            color: ['ecole', 'ajustements'].includes(tab) ? '#5B8DBF' : 'var(--muted)' }}>
          <MoreHorizontal size={20} />
          <span style={{ fontSize: 9, fontFamily: 'DM Sans', fontWeight: 500 }}>Plus</span>
          {adjustments.length > 0 && (
            <span style={{ position: 'absolute', top: 0, right: 2, background: '#f87171', color: '#fff',
              borderRadius: '50%', width: 14, height: 14, fontSize: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
              {adjustments.length}
            </span>
          )}
        </button>
      </nav>

      {/* MOBILE MORE MENU */}
      {mobileMore && (
        <div style={{ position: 'fixed', bottom: 62, left: 0, right: 0, zIndex: 201,
          padding: '0 10px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
            padding: 8, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 180,
            boxShadow: '0 -4px 20px rgba(0,0,0,.3)' }}>
            {TABS.filter(t => ['ecole', 'ajustements'].includes(t.id)).map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setMobileMore(false) }}
                style={{ background: tab === t.id ? 'var(--gold-dim)' : 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8,
                  color: tab === t.id ? '#5B8DBF' : 'var(--text)', fontFamily: 'DM Sans', fontSize: 14,
                  fontWeight: tab === t.id ? 600 : 400, width: '100%', textAlign: 'left' }}>
                <span>{t.icon}</span>
                {t.label}
                {t.id === 'ajustements' && adjustments.length > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#f87171', color: '#fff', borderRadius: '50%',
                    width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700 }}>{adjustments.length}</span>
                )}
              </button>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <button onClick={() => { setMobileMore(false); toggleTheme() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 10, padding: '10px 14px', borderRadius: 8, color: 'var(--text)', fontFamily: 'DM Sans',
                fontSize: 14, width: '100%', textAlign: 'left' }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              {theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
            </button>
            <button onClick={() => { setMobileMore(false); notifEnabled ? setNotifEnabled(false) : enableNotifications() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 10, padding: '10px 14px', borderRadius: 8, color: notifEnabled ? '#4ade80' : 'var(--text)',
                fontFamily: 'DM Sans', fontSize: 14, width: '100%', textAlign: 'left' }}>
              {notifEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              {notifEnabled ? 'Notifications ON' : 'Notifications'}
            </button>
            <button onClick={() => { setMobileMore(false); setBackupModal(true) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 10, padding: '10px 14px', borderRadius: 8, color: 'var(--text)', fontFamily: 'DM Sans',
                fontSize: 14, width: '100%', textAlign: 'left' }}>
              <Save size={18} />
              Sauvegarde
            </button>
            {profile && (
              <button onClick={() => { setMobileMore(false); setProfileModal(true) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  gap: 10, padding: '10px 14px', borderRadius: 8, color: 'var(--text)', fontFamily: 'DM Sans',
                  fontSize: 14, width: '100%', textAlign: 'left' }}>
                <User size={18} />
                {profile.prenom}
              </button>
            )}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <button onClick={() => { setMobileMore(false); logout() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 10, padding: '10px 14px', borderRadius: 8, color: '#f87171', fontFamily: 'DM Sans',
                fontSize: 14, width: '100%', textAlign: 'left' }}>
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>
      )}

      {/* MODIFIER PROFIL */}
      {profileModal && (
        <ProfileModal profile={profile} onSave={p => { setProfile(p); setProfileModal(false) }} onClose={() => setProfileModal(false)} />
      )}

      {/* BACKUP / RESTORE */}
      {backupModal && (
        <div className="modal-overlay" onClick={() => setBackupModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#5B8DBF' }}>💾 Tes données, en sécurité</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Tout vit dans ton navigateur. Fais un export de temps en temps — on ne sait jamais.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-gold" onClick={exportData} style={{ textAlign: 'left', padding: '12px 16px' }}>
                ⬇️ Télécharger tout (JSON)
                <span style={{ display: 'block', fontSize: 11, fontWeight: 400, marginTop: 2, color: 'rgba(15,23,42,.7)' }}>
                  Tâches, projets, finances, école, profil
                </span>
              </button>
              <button className="btn-ghost" onClick={() => importRef.current?.click()} style={{ textAlign: 'left', padding: '12px 16px' }}>
                ⬆️ Restaurer un fichier
                <span style={{ display: 'block', fontSize: 11, fontWeight: 400, marginTop: 2, color: 'var(--muted)' }}>
                  Attention : ça remplace ce que tu as là
                </span>
              </button>
              <input ref={importRef} type="file" accept=".json" onChange={importData} style={{ display: 'none' }} />
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button className="btn-ghost" onClick={() => { setBackupModal(false); setIcsModal(true) }}
                style={{ textAlign: 'left', padding: '12px 16px' }}>
                📅 Exporter vers Calendrier (.ics)
                <span style={{ display: 'block', fontSize: 11, fontWeight: 400, marginTop: 2, color: 'var(--muted)' }}>
                  Choisis ce qui part dans Google/Samsung Agenda
                </span>
              </button>
            </div>
            <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={() => setBackupModal(false)}>Fermer</button>
          </div>
        </div>
      )}

      {/* POMODORO */}
      {pomo && <PomodoroModal pomo={pomo} onPause={pausePomo} onStop={stopPomo} onDone={donePomo} />}

      {/* GLOBAL SEARCH */}
      {searchOpen && (
        <GlobalSearch
          tasks={tasks} devoirs={devoirs} examens={examens} projects={projects}
          onNavigate={setTab} onClose={() => setSearchOpen(false)}
        />
      )}


      {/* EXPORT CALENDRIER (.ICS) */}
      <CalendarExportModal
        open={icsModal}
        data={{ tasks, examens, devoirs, subscriptions }}
        onClose={() => setIcsModal(false)}
      />

      <InstallPrompt />
    </div>
  )
}
