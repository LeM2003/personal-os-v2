"use client"

import { lazy, Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDraggable } from '@/hooks/useDraggable'
import { useApp } from '@/context/AppContext'
import PomodoroModal from './shared/PomodoroModal'
import GlobalSearch from './shared/GlobalSearch'
import InstallPrompt from './shared/InstallPrompt'
import MissedReminders from './shared/MissedReminders'
import AssistantIA from './shared/AssistantIA'
import PageTransition from './shared/PageTransition'
import { haptic } from '@/utils/haptics'
import ProfileModal from './modals/ProfileModal'
import BackupModal from './modals/BackupModal'
import CalendarExportModal from './modals/CalendarExportModal'
import {
  LayoutDashboard, CheckSquare, Target, GraduationCap, Wallet,
  BarChart3, RefreshCw, Search, User, Bell, BellOff, Save,
  Sun, Moon, LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen
} from 'lucide-react'

const LandingPage = lazy(() => import('./LandingPage'))
const Onboarding  = lazy(() => import('./Onboarding'))
const Dashboard   = lazy(() => import('./Dashboard'))
const Tasks       = lazy(() => import('./Tasks'))
const Projects    = lazy(() => import('./Projects'))
const Education   = lazy(() => import('./Ecole'))
const Finances    = lazy(() => import('./Finances'))
const Adjustments = lazy(() => import('./Adjustments'))
const Stats       = lazy(() => import('./Stats'))

const TabFallback = () => (
  <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
    Chargement…
  </div>
)

const ICON_SIZE = 18

const ALL_TABS = [
  { id: 'dashboard',   icon: <LayoutDashboard size={ICON_SIZE} />,  label: 'Dashboard'      },
  { id: 'taches',      icon: <CheckSquare size={ICON_SIZE} />,      label: 'Tâches'          },
  { id: 'projets',     icon: <Target size={ICON_SIZE} />,           label: 'Projets & Idées' },
  { id: 'ecole',       icon: <GraduationCap size={ICON_SIZE} />,    label: 'École'           },
  { id: 'finances',    icon: <Wallet size={ICON_SIZE} />,           label: 'Finances'        },
  { id: 'stats',       icon: <BarChart3 size={ICON_SIZE} />,        label: 'Statistiques'    },
  { id: 'ajustements', icon: <RefreshCw size={ICON_SIZE} />,        label: 'Ajustements'     },
]

const MODE_TABS: Record<string, string[]> = {
  'etudiant':     ['dashboard', 'taches', 'ecole', 'finances', 'stats', 'ajustements'],
  'entrepreneur': ['dashboard', 'taches', 'projets', 'finances', 'stats', 'ajustements'],
  'les-deux':     ['dashboard', 'taches', 'projets', 'ecole', 'finances', 'stats', 'ajustements'],
  'custom':       ['dashboard', 'taches', 'projets', 'ecole', 'finances', 'stats', 'ajustements'],
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
    tasks, devoirs, examens, projects, expenses, subscriptions,
  } = app
  const searchParams = useSearchParams()
  const [mobileMore, setMobileMore] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const fab = useDraggable({ right: 20, bottom: 76 })
  const { financeFormOpen, setFinanceFormOpen } = app
  const [loggedOut, setLoggedOut] = useState(false)

  // Gérer les ?tab= URL params (raccourcis PWA, deep links)
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['dashboard', 'taches', 'projets', 'ecole', 'finances', 'stats', 'ajustements'].includes(tabParam)) {
      setTab(tabParam)
    }
  }, [searchParams, setTab])

  // Onglets filtrés selon le mode du profil
  const mode = profile?.mode ?? 'les-deux'
  const allowedIds = mode === 'custom' && profile?.customTabs?.length
    ? profile.customTabs
    : MODE_TABS[mode] || MODE_TABS['les-deux']
  const TABS = ALL_TABS.filter(t => allowedIds.includes(t.id))
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [icsModal, setIcsModal] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(() => {
    try { return localStorage.getItem('onboardingDone') === '1' } catch { return false }
  })

  const logout = () => {
    if (typeof window !== 'undefined' && confirm('Veux-tu te deconnecter ? Tes donnees restent sauvegardees — tu pourras te reconnecter avec le meme prenom.')) {
      setLoggedOut(true)
    }
  }
  const handleStart = (formData: typeof profile) => {
    setProfile(formData)
    setLoggedOut(false)
  }
  const handleOnboardingFinish = (nextProfile: typeof profile) => {
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
      <aside className={`sidebar${sidebarOpen ? '' : ' collapsed'}`} role="navigation" aria-label="Navigation principale">
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
            <div key={t.id} className={`nav-item${tab === t.id ? ' active' : ''}`} onClick={() => { haptic(3); setTab(t.id) }}
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
      <main className="main-content" style={!sidebarOpen ? { marginLeft: 68 } : undefined} role="main">
        <MissedReminders />
        <PageTransition tabKey={tab}>
          <Suspense fallback={<TabFallback />}>
            {tab === 'dashboard'   && <Dashboard />}
            {tab === 'taches'      && <Tasks />}
            {tab === 'projets'     && <Projects />}
            {tab === 'ecole'       && <Education />}
            {tab === 'finances'    && <Finances />}
            {tab === 'stats'       && <Stats />}
            {tab === 'ajustements' && <Adjustments />}
          </Suspense>
        </PageTransition>
      </main>

      {/* BOTTOM NAV (mobile) — 5 onglets principaux */}
      <nav className="bottom-nav" role="navigation" aria-label="Navigation mobile">
        {TABS.filter(t => ['dashboard', 'taches', 'projets', 'finances', 'stats'].includes(t.id)).map(t => (
          <button key={t.id} onClick={() => { haptic(3); setTab(t.id); setMobileMore(false) }} aria-label={t.label}
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

      {/* MOBILE MORE MENU — Bottom Sheet */}
      {mobileMore && (
        <>
          {/* Overlay */}
          <div onClick={() => setMobileMore(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)', animation: 'overlayIn .2s ease both' }} />

          {/* Sheet */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
            background: 'var(--modal-bg)',
            border: '1px solid var(--border)',
            borderRadius: '24px 24px 0 0',
            padding: '0 0 calc(env(safe-area-inset-bottom, 0px) + 16px)',
            boxShadow: '0 -8px 40px rgba(0,0,0,.3), 0 0 0 1px rgba(56,189,248,.05)',
            animation: 'slideUp .3s cubic-bezier(.32,.72,0,1) both',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,.15)' }} />
            </div>

            {/* Profil card */}
            <div style={{ margin: '8px 16px 16px', padding: '16px', borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(56,189,248,.08), rgba(129,140,248,.06))',
              border: '1px solid rgba(56,189,248,.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {profile?.prenom?.[0] || 'M'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                    {profile?.prenom} {profile?.nom || ''}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                    {profile?.mode === 'etudiant' ? '📚 Étudiant'
                      : profile?.mode === 'entrepreneur' ? '🚀 Professionnel'
                      : profile?.mode === 'les-deux' ? '⚡ Étudiant · Pro'
                      : '🎛️ Mode personnalisé'}
                  </p>
                </div>
                <button onClick={() => { setMobileMore(false); setProfileModal(true) }}
                  style={{ background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.2)', borderRadius: 8,
                    padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--accent-1)', fontWeight: 600,
                    fontFamily: 'var(--font-dm-sans, DM Sans)' }}>
                  Modifier
                </button>
              </div>
            </div>

            {/* Onglets supplémentaires */}
            {TABS.filter(t => !['dashboard','taches','projets','finances','stats'].includes(t.id)).length > 0 && (<>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1.2,
                textTransform: 'uppercase', padding: '0 20px', margin: '0 0 6px' }}>Navigation</p>
              {TABS.filter(t => !['dashboard','taches','projets','finances','stats'].includes(t.id)).map(t => (
                <button key={t.id} onClick={() => { haptic(3); setTab(t.id); setMobileMore(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                    background: tab === t.id ? 'rgba(56,189,248,.08)' : 'none',
                    border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                    color: tab === t.id ? 'var(--accent-1)' : 'var(--text)',
                    fontFamily: 'var(--font-dm-sans, DM Sans)', fontSize: 15, fontWeight: tab === t.id ? 600 : 400 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10,
                    background: tab === t.id ? 'rgba(56,189,248,.15)' : 'var(--surface-elevated)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {t.icon}
                  </div>
                  <span style={{ flex: 1 }}>{t.label}</span>
                  {t.id === 'ajustements' && adjustments.length > 0 && (
                    <span style={{ background: '#f87171', color: '#fff', borderRadius: 999,
                      padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{adjustments.length}</span>
                  )}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '8px 16px' }} />
            </>)}

            {/* Paramètres */}
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1.2,
              textTransform: 'uppercase', padding: '0 20px', margin: '0 0 6px' }}>Paramètres</p>

            <button onClick={() => { setMobileMore(false); toggleTheme() }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                color: 'var(--text)', fontFamily: 'var(--font-dm-sans, DM Sans)', fontSize: 15 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 500 }}>{theme === 'dark' ? 'Thème clair' : 'Thème sombre'}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Actuellement : {theme === 'dark' ? 'sombre' : 'clair'}</p>
              </div>
            </button>

            <button onClick={() => { setMobileMore(false); notifEnabled ? setNotifEnabled(false) : enableNotifications() }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                color: 'var(--text)', fontFamily: 'var(--font-dm-sans, DM Sans)', fontSize: 15 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10,
                background: notifEnabled ? 'rgba(74,222,128,.12)' : 'var(--surface-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {notifEnabled ? <Bell size={18} style={{ color: '#4ade80' }} /> : <BellOff size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Notifications</p>
                <p style={{ margin: 0, fontSize: 12, color: notifEnabled ? '#4ade80' : 'var(--muted)' }}>
                  {notifEnabled ? 'Activées — rappels intelligents' : 'Désactivées'}
                </p>
              </div>
            </button>

            <button onClick={() => { setMobileMore(false); setBackupModal(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                color: 'var(--text)', fontFamily: 'var(--font-dm-sans, DM Sans)', fontSize: 15 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Save size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Sauvegarde</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Export / restauration</p>
              </div>
            </button>

            <div style={{ height: 1, background: 'var(--border)', margin: '8px 16px' }} />

            {/* Déconnexion */}
            <button onClick={() => { setMobileMore(false); logout() }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                fontFamily: 'var(--font-dm-sans, DM Sans)', fontSize: 15, color: '#f87171', marginBottom: 4 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(248,113,113,.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogOut size={18} style={{ color: '#f87171' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Déconnexion</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(248,113,113,.6)' }}>Effacer et recommencer</p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* MODIFIER PROFIL */}
      {profileModal && (
        <ProfileModal profile={profile} onSave={p => { setProfile(p); setProfileModal(false) }} onClose={() => setProfileModal(false)} />
      )}

      {/* BACKUP / RESTORE */}
      {backupModal && (
        <BackupModal
          importRef={importRef}
          onExport={exportData}
          onImport={importData}
          onOpenCalendar={() => setIcsModal(true)}
          onClose={() => setBackupModal(false)}
        />
      )}

      {/* POMODORO */}
      {pomo && <PomodoroModal pomo={pomo} onPause={pausePomo} onStop={stopPomo} onDone={donePomo} />}

      {/* GLOBAL SEARCH */}
      {searchOpen && (
        <GlobalSearch
          tasks={tasks} devoirs={devoirs} examens={examens} projects={projects} expenses={expenses}
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

      {/* ── FAB Finances — "+" dépense ── */}
      {tab === 'finances' && !financeFormOpen && !mobileMore && (
        <button
          onClick={() => setFinanceFormOpen(true)}
          title="Ajouter une dépense"
          style={{
            position: 'fixed', bottom: 148, right: 20, zIndex: 488,
            width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #4ade80, #22c55e)',
            boxShadow: '0 4px 16px rgba(74,222,128,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff',
            transition: 'transform .2s cubic-bezier(.34,1.56,.64,1)',
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.12)' }}
          onMouseOut={e => { e.currentTarget.style.transform = '' }}>
          +
        </button>
      )}

      {/* ── Bouton flottant Assistant IA (draggable) ── */}
      {!mobileMore && (
        <button
          ref={fab.ref}
          {...fab.handlers}
        onClick={(e) => {
          // N'ouvre/ferme que si ce n'était pas un drag
          if (!fab.dragging) setAssistantOpen(o => !o)
        }}
        title="Assistant IA — glisse pour déplacer"
        style={{
          ...fab.style,
          zIndex: 490,
          width: 52, height: 52, borderRadius: '50%', border: 'none',
          background: assistantOpen
            ? 'linear-gradient(135deg, var(--accent-2), var(--accent-1))'
            : 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
          boxShadow: fab.dragging
            ? '0 8px 32px rgba(56,189,248,.6)'
            : '0 4px 20px rgba(56,189,248,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: fab.dragging ? 'none' : 'transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s',
          transform: fab.dragging ? 'scale(1.15)' : assistantOpen ? 'scale(0.9) rotate(10deg)' : 'scale(1)',
        }}
      >
        <span style={{ fontSize: 22 }}>{assistantOpen ? '✕' : '🤖'}</span>
      </button>
      )}

      {/* ── Panel Assistant IA ── */}
      {assistantOpen && <AssistantIA onClose={() => setAssistantOpen(false)} />}
    </div>
  )
}
