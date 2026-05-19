"use client"

interface BackupModalProps {
  importRef: React.RefObject<HTMLInputElement | null>
  onExport: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  onOpenCalendar: () => void
  onClose: () => void
}

export default function BackupModal({ importRef, onExport, onImport, onOpenCalendar, onClose }: BackupModalProps) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, marginBottom: 8, color: '#5B8DBF' }}>💾 Tes données, en sécurité</h3>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          Tout vit dans ton navigateur. Fais un export de temps en temps — on ne sait jamais.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-gold" onClick={onExport} style={{ textAlign: 'left', padding: '12px 16px' }}>
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
          <input ref={importRef} type="file" accept=".json" onChange={onImport} style={{ display: 'none' }} />
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button className="btn-ghost" onClick={() => { onClose(); onOpenCalendar() }} style={{ textAlign: 'left', padding: '12px 16px' }}>
            📅 Exporter vers Calendrier (.ics)
            <span style={{ display: 'block', fontSize: 11, fontWeight: 400, marginTop: 2, color: 'var(--muted)' }}>
              Choisis ce qui part dans Google/Samsung Agenda
            </span>
          </button>
        </div>
        <button className="btn-ghost" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>Fermer</button>
      </div>
    </div>
  )
}
