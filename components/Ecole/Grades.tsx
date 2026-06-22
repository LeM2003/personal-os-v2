"use client"

import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { genId, todayISO } from '../../utils/dates'
import { haptic, hapticSuccess } from '../../utils/haptics'
import type { Grade, Subject } from '@/types'
import BottomSheet from '../shared/BottomSheet'
import { confirmDialog } from '../shared/ConfirmDialog'

const TYPES = ['Contrôle', 'DS', 'Oral']

const gradeColor = (n: number) => {
  if (n < 10) return '#f87171'
  if (n < 12) return '#fb923c'
  if (n >= 16) return '#4ade80'
  return '#5B8DBF'
}

const fmtShortDate = (iso: string | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  const m = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'][d.getMonth()]
  return `${d.getDate().toString().padStart(2, '0')} ${m}`
}

// Initiale auto à partir du nom (première lettre majuscule, fallback ?)
const autoShort = (name: string) => {
  const s = (name || '').trim()
  if (!s) return '?'
  return s[0].toUpperCase()
}

interface SubjectStat {
  id: string
  subj: Subject | undefined
  avg: number
  count: number
  last: string | null
}

interface NoteDraft {
  subjectId: string
  grade: number
  coef: number
  type: string
  title: string
  date: string
}

interface SubjectDraft {
  name: string
  short: string
  coef: number
}

export default function Notes() {
  const { notes, setNotes, subjects, setSubjects } = useApp()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [manageOpen, setManageOpen] = useState(false)

  const subjById = useMemo(
    () => Object.fromEntries(subjects.map(s => [s.id, s])),
    [subjects]
  )

  // Moyennes par matière (pondérées par coef des notes)
  const subjectStats = useMemo<SubjectStat[]>(() => {
    const m = new Map<string, { w: number; c: number; count: number; last: string | null }>()
    for (const n of notes) {
      if (!subjById[n.subjectId]) continue  // matière supprimée : ignore
      if (!m.has(n.subjectId)) m.set(n.subjectId, { w: 0, c: 0, count: 0, last: null })
      const s = m.get(n.subjectId)!
      s.w += n.grade * (n.coef || 1)
      s.c += (n.coef || 1)
      s.count++
      const nDate = n.date ?? ''
      if (!s.last || nDate > s.last) s.last = nDate
    }
    return Array.from(m.entries()).map(([id, s]) => ({
      id, subj: subjById[id], avg: s.c > 0 ? s.w / s.c : 0, count: s.count, last: s.last,
    }))
  }, [notes, subjById])

  // Moyenne générale pondérée (coef matière × moyenne matière)
  const generalAvg = useMemo(() => {
    let w = 0, c = 0
    for (const stat of subjectStats) {
      const coefMat = stat.subj?.coef || 1
      w += stat.avg * coefMat
      c += coefMat
    }
    return c > 0 ? w / c : 0
  }, [subjectStats])

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8),
    [notes]
  )

  const hasSubjects = subjects.length > 0
  const hasNotes = notes.length > 0

  const openAdd = () => {
    if (!hasSubjects) { haptic(5); setManageOpen(true); return }
    haptic(5); setEditId(null); setSheetOpen(true)
  }
  const openEdit = (noteId: string) => { setEditId(noteId); setSheetOpen(true) }
  const closeSheet = () => { setSheetOpen(false); setEditId(null) }

  const saveNote = (draft: NoteDraft) => {
    if (editId) {
      setNotes(p => p.map(n => n.id === editId ? { ...n, ...draft } : n))
    } else {
      setNotes(p => [...p, { id: genId(), ...draft }])
    }
    hapticSuccess()
    closeSheet()
  }

  const deleteNote = (id: string) => {
    setNotes(p => p.filter(n => n.id !== id))
    haptic(8)
    closeSheet()
  }

  // ─── Gestion matières ───
  const createSubject = (draft: SubjectDraft): Subject => {
    const subj: Subject = {
      id: genId(),
      name: draft.name.trim(),
      short: (draft.short || autoShort(draft.name)).slice(0, 3),
      coef: Math.max(1, Math.min(20, +draft.coef || 1)),
    }
    setSubjects(p => [...p, subj])
    haptic(5)
    return subj
  }
  const updateSubject = (id: string, patch: Partial<Subject>) => {
    setSubjects(p => p.map(s => s.id === id ? {
      ...s, ...patch,
      coef: Math.max(1, Math.min(20, +(patch.coef ?? 0) || s.coef || 1)),
      short: ((patch.short ?? s.short) || '').slice(0, 3),
    } : s))
  }
  const deleteSubject = async (id: string) => {
    const affected = notes.filter(n => n.subjectId === id).length
    const msg = affected > 0
      ? `Supprimer cette matière ? Les ${affected} note${affected > 1 ? 's' : ''} associée${affected > 1 ? 's' : ''} seront aussi effacée${affected > 1 ? 's' : ''}.`
      : 'Supprimer cette matière ?'
    if (!(await confirmDialog(msg, { danger: true }))) return
    setSubjects(p => p.filter(s => s.id !== id))
    setNotes(p => p.filter(n => n.subjectId !== id))
    haptic(8)
  }

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Barre d'actions : gérer matières */}
      {(hasSubjects || hasNotes) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button onClick={() => setManageOpen(true)} type="button"
            className="btn-ghost"
            style={{
              fontSize: 12, padding: '7px 13px',
              border: '1px solid rgba(91,141,191,.3)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
            ⚙️ Gérer mes matières ({subjects.length})
          </button>
        </div>
      )}

      {!hasNotes ? (
        <EmptyState hasSubjects={hasSubjects} onAdd={openAdd} onManage={() => setManageOpen(true)} />
      ) : (
        <>
          <HeroAvg avg={generalAvg} stats={subjectStats} />

          {subjectStats.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <SectionTitle>Par matière</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {subjectStats
                  .sort((a, b) => a.avg - b.avg)
                  .map(s => <SubjectRow key={s.id} stat={s} />)}
              </div>
            </section>
          )}

          <section>
            <SectionTitle>Dernières notes</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentNotes.map(n => (
                <RecentNote key={n.id} note={n} subj={subjById[n.subjectId]}
                  onEdit={() => openEdit(n.id)} />
              ))}
            </div>
          </section>
        </>
      )}

      <FAB onClick={openAdd} />

      {/* Bottom sheet ajout / édition */}
      <AddNoteSheet
        open={sheetOpen}
        onClose={closeSheet}
        onSave={saveNote}
        onDelete={editId ? () => deleteNote(editId) : null}
        onCreateSubject={createSubject}
        subjects={subjects}
        initial={editId ? notes.find(n => n.id === editId) : null}
      />

      {/* Bottom sheet gestion matières */}
      <SubjectManagerSheet
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        subjects={subjects}
        onCreate={createSubject}
        onUpdate={updateSubject}
        onDelete={deleteSubject}
        countForSubject={(id: string) => notes.filter(n => n.subjectId === id).length}
      />
    </div>
  )
}

// ───────────── Bloc moyenne générale ─────────────
function HeroAvg({ avg, stats }: { avg: number; stats: SubjectStat[] }) {
  const shown = stats.slice(0, 6)
  return (
    <div style={{
      // Carte inversée : fond = couleur du texte du thème, texte = couleur du fond
      // (un texte clair codé en dur devient invisible en thème sombre)
      background: 'var(--text)', color: 'var(--bg)',
      borderRadius: 16, padding: '16px 18px', marginBottom: 18,
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 4px 14px rgba(0,0,0,.12)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, opacity: .6, fontWeight: 500, letterSpacing: .3, textTransform: 'uppercase' }}>
          Moyenne générale
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <span style={{ fontFamily: 'Fraunces', fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            {avg.toFixed(1).replace('.', ',')}
          </span>
          <span style={{ fontSize: 13, opacity: .6 }}>/20</span>
        </div>
      </div>
      <MiniBars data={shown} />
    </div>
  )
}

function MiniBars({ data }: { data: SubjectStat[] }) {
  if (!data.length) return null
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 36 }}>
      {data.map((s: SubjectStat) => {
        const h = Math.max(4, (s.avg / 20) * 36)
        return (
          <div key={s.id}
            title={`${s.subj?.name || '?'} — ${s.avg.toFixed(1)}/20`}
            style={{ width: 6, height: h, background: gradeColor(s.avg), borderRadius: 2, opacity: .9 }} />
        )
      })}
    </div>
  )
}

function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
      <h3 style={{
        fontFamily: 'Fraunces', fontSize: 17, fontWeight: 700, letterSpacing: -.3,
        margin: 0, color: 'var(--text)',
      }}>
        {children}
      </h3>
      {right}
    </div>
  )
}

function SubjectRow({ stat }: { stat: SubjectStat }) {
  const c = gradeColor(stat.avg)
  return (
    <div className="card" style={{
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
      borderRadius: 14,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: c + '18', color: c,
        fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {stat.subj?.short || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{stat.subj?.name || '?'}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {stat.count} note{stat.count > 1 ? 's' : ''} · coef {stat.subj?.coef || 1}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 700, color: c, letterSpacing: -.3 }}>
          {stat.avg.toFixed(1).replace('.', ',')}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2 }}>/20</span>
      </div>
    </div>
  )
}

function RecentNote({ note, subj, onEdit }: { note: Grade; subj: Subject | undefined; onEdit: () => void }) {
  const c = gradeColor(note.grade)
  return (
    <button onClick={onEdit} type="button" className="card"
      style={{
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
        borderRadius: 14, width: '100%', textAlign: 'left', cursor: 'pointer',
        border: 'none',
      }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: c + '18', color: c,
        fontFamily: 'Fraunces', fontSize: 15, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {subj?.short || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{subj?.name || '—'}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>· coef {note.coef}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {note.title || note.type} · {fmtShortDate(note.date)}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 700, color: c, letterSpacing: -.3 }}>
          {String(note.grade).replace('.', ',')}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2 }}>/20</span>
      </div>
    </button>
  )
}

// ───────────── État vide ─────────────
function EmptyState({ hasSubjects, onAdd, onManage }: { hasSubjects: boolean; onAdd: () => void; onManage: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 24px 0', textAlign: 'center',
    }}>
      <div style={{ position: 'relative', width: 200, height: 180, margin: '12px 0 24px' }}>
        <DecoCard label="MATHS"   grade="14/20" color="#5B8DBF" top={10}  left={20}  w={120} rot={-8} />
        <DecoCard label="ANGLAIS" grade="16/20" color="#4ade80" top={52}  right={0}  w={130} rot={6} />
        <DecoCard label="SVT"     grade="15/20" color="#5B8DBF" top={108} left={40}  w={110} rot={-3} />
      </div>

      <h2 style={{
        fontFamily: 'Fraunces', fontSize: 26, fontWeight: 700,
        letterSpacing: -.6, margin: 0, marginBottom: 10, lineHeight: 1.1,
        color: 'var(--text)',
      }}>
        Chaque note raconte ta progression.
      </h2>
      <p style={{
        fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5,
        maxWidth: 300,
      }}>
        {hasSubjects
          ? 'Ajoute ta première note pour voir tes moyennes, tes tendances et les matières où tu brilles.'
          : 'Commence par ajouter tes matières (celles de ton cursus) pour pouvoir saisir des notes.'}
      </p>

      <button onClick={hasSubjects ? onAdd : onManage} type="button"
        style={{
          marginTop: 28, background: '#5B8DBF', color: '#fff',
          padding: '14px 28px', borderRadius: 999,
          fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
          boxShadow: '0 6px 18px rgba(91,141,191,.4)',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: 'DM Sans',
        }}>
        <span style={{ fontSize: 18, fontWeight: 400 }}>+</span>
        {hasSubjects ? 'Ajouter ma première note' : 'Créer ma première matière'}
      </button>
    </div>
  )
}

function DecoCard({ label, grade, color, top, left, right, w, rot }: { label: string; grade: string; color: string; top: number; left?: number; right?: number; w: number; rot: number }) {
  return (
    <div style={{
      position: 'absolute', top, left, right,
      width: w, height: 68,
      background: 'var(--card)',
      borderRadius: 12,
      border: '1px solid rgba(91,141,191,.15)',
      transform: `rotate(${rot}deg)`,
      padding: '10px 12px',
      boxShadow: '0 4px 14px rgba(91,141,191,.12)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: .3 }}>{label}</div>
      <div style={{ fontFamily: 'Fraunces', fontSize: 24, fontWeight: 700, color, letterSpacing: -.5 }}>
        {grade}
      </div>
    </div>
  )
}

function FAB({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} type="button"
      style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        bottom: 90,
        background: '#5B8DBF', color: '#fff',
        borderRadius: 999, padding: '14px 24px',
        boxShadow: '0 8px 24px rgba(91,141,191,.45)',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 15, fontWeight: 600, border: 'none', cursor: 'pointer',
        zIndex: 30, fontFamily: 'DM Sans',
      }}>
      <span style={{ fontSize: 20, fontWeight: 300, lineHeight: 1 }}>+</span>
      Nouvelle note
    </button>
  )
}

// ───────────── Bottom sheet ajout / édition note ─────────────
interface AddNoteSheetProps {
  open: boolean
  onClose: () => void
  onSave: (draft: NoteDraft) => void
  onDelete: (() => void) | null
  onCreateSubject: (draft: SubjectDraft) => Subject
  subjects: Subject[]
  initial: Grade | null | undefined
}

function AddNoteSheet({ open, onClose, onSave, onDelete, onCreateSubject, subjects, initial }: AddNoteSheetProps) {
  const [subjectId, setSubjectId] = useState(initial?.subjectId || subjects[0]?.id || '')
  const [gradeStr,  setGradeStr]  = useState(initial ? String(initial.grade).replace('.', ',') : '')
  const [type,      setType]      = useState(initial?.type || 'Contrôle')
  const [coef,      setCoef]      = useState(initial?.coef || 1)
  const [title,     setTitle]     = useState(initial?.title || '')
  const [date,      setDate]      = useState(initial?.date || todayISO())

  const [showNewSubj, setShowNewSubj] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newShort,   setNewShort]   = useState('')
  const [newCoef,    setNewCoef]    = useState(1)

  // Reset sur ré-ouverture
  const [lastKey, setLastKey] = useState<string | null>(null)
  const currentKey = (open ? 'open' : 'closed') + '-' + (initial?.id || 'new')
  if (currentKey !== lastKey && open) {
    setSubjectId(initial?.subjectId || subjects[0]?.id || '')
    setGradeStr(initial ? String(initial.grade).replace('.', ',') : '')
    setType(initial?.type || 'Contrôle')
    setCoef(initial?.coef || 1)
    setTitle(initial?.title || '')
    setDate(initial?.date || todayISO())
    setShowNewSubj(false)
    setNewName(''); setNewShort(''); setNewCoef(1)
    setLastKey(currentKey)
  }

  const press = (k: string) => {
    haptic(3)
    if (k === '⌫') return setGradeStr(s => s.slice(0, -1))
    if (k === ',') {
      if (gradeStr.includes(',') || gradeStr === '') return
      return setGradeStr(s => s + ',')
    }
    setGradeStr(s => {
      const next = s + k
      const parsed = parseFloat(next.replace(',', '.'))
      if (isNaN(parsed) || parsed > 20) return s
      const [, dec] = next.split(',')
      if (dec && dec.length > 1) return s
      return next
    })
  }

  const parsedGrade = parseFloat(gradeStr.replace(',', '.'))
  const valid = subjectId && !isNaN(parsedGrade) && parsedGrade >= 0 && parsedGrade <= 20
  const gradeColorNow = !isNaN(parsedGrade) ? gradeColor(parsedGrade) : '#8891a0'

  const handleSave = () => {
    if (!valid) return
    onSave({
      subjectId, grade: parsedGrade, coef: Math.max(1, coef || 1),
      type, title: title.trim(), date,
    })
  }

  const handleCreateSubj = () => {
    if (!newName.trim()) return
    const s = onCreateSubject({ name: newName, short: newShort, coef: newCoef })
    setSubjectId(s.id)
    setShowNewSubj(false)
    setNewName(''); setNewShort(''); setNewCoef(1)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={initial ? 'Modifier la note' : 'Nouvelle note'}>
      {/* Sélecteur matière */}
      <div style={{ marginBottom: 14 }}>
        <Label>Matière</Label>
        {subjects.length === 0 && !showNewSubj && (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            Aucune matière — crées-en une pour commencer.
          </p>
        )}
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto',
          paddingBottom: 4, marginLeft: -4, marginRight: -4, padding: '0 4px 4px',
          scrollbarWidth: 'none',
        }}>
          {subjects.map((s: Subject) => {
            const active = s.id === subjectId
            return (
              <button key={s.id} onClick={() => { setSubjectId(s.id); haptic(3) }} type="button"
                style={{
                  flexShrink: 0,
                  padding: '8px 14px', borderRadius: 999,
                  background: active ? '#5B8DBF' : 'rgba(11,18,32,.05)',
                  color: active ? '#fff' : 'var(--text)',
                  border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: active ? 'rgba(255,255,255,.22)' : '#5B8DBF',
                  color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Fraunces', fontSize: 11, fontWeight: 700,
                }}>{s.short}</span>
                {s.name}
              </button>
            )
          })}
          {!showNewSubj && (
            <button onClick={() => setShowNewSubj(true)} type="button"
              style={{
                flexShrink: 0,
                padding: '8px 14px', borderRadius: 999,
                background: 'transparent',
                color: '#5B8DBF',
                border: '1px dashed rgba(91,141,191,.4)', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans',
              }}>
              + Nouvelle matière
            </button>
          )}
        </div>

        {showNewSubj && (
          <div style={{
            marginTop: 10, padding: 12,
            background: 'rgba(91,141,191,.06)',
            border: '1px solid rgba(91,141,191,.2)', borderRadius: 12,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px', gap: 6, marginBottom: 8 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nom (ex: Marketing)" autoFocus style={{ fontSize: 13 }} />
              <input value={newShort} onChange={e => setNewShort(e.target.value.slice(0, 3))}
                placeholder="Mkt" style={{ fontSize: 13, textAlign: 'center' }} />
              <input type="number" min={1} max={20} value={newCoef}
                onChange={e => setNewCoef(Math.max(1, Math.min(20, +e.target.value || 1)))}
                placeholder="coef" style={{ fontSize: 13, textAlign: 'center' }} />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleCreateSubj} disabled={!newName.trim()} type="button"
                className="btn-gold" style={{ flex: 1, fontSize: 13 }}>
                Créer
              </button>
              <button onClick={() => setShowNewSubj(false)} type="button"
                className="btn-ghost" style={{ fontSize: 13 }}>
                Annuler
              </button>
            </div>
            <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
              Nom · initiale (2-3 lettres) · coef de la matière
            </p>
          </div>
        )}
      </div>

      {/* Grade display */}
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8,
        padding: '4px 0 12px',
      }}>
        <span style={{
          fontFamily: 'Fraunces', fontSize: 76, fontWeight: 700,
          color: gradeColorNow, letterSpacing: -2, lineHeight: 1,
          minWidth: 80, textAlign: 'right',
        }}>{gradeStr || '—'}</span>
        <span style={{ fontSize: 24, color: 'var(--muted)', fontWeight: 500 }}>/20</span>
      </div>

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {['1','2','3','4','5','6','7','8','9',',','0','⌫'].map(k => (
          <button key={k} onClick={() => press(k)} type="button"
            style={{
              padding: '14px 0', textAlign: 'center',
              background: k === '⌫' ? 'transparent' : 'var(--card)',
              border: '1px solid rgba(11,18,32,.06)',
              borderRadius: 12,
              fontFamily: 'Fraunces', fontSize: 22, fontWeight: 600,
              color: k === '⌫' ? 'var(--muted)' : 'var(--text)',
              cursor: 'pointer', letterSpacing: -.3,
            }}>
            {k}
          </button>
        ))}
      </div>

      {/* Type + coef */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{
          flex: 1, display: 'flex', gap: 4,
          background: 'rgba(11,18,32,.05)', borderRadius: 10, padding: 3,
        }}>
          {TYPES.map(t => {
            const active = type === t
            return (
              <button key={t} onClick={() => { setType(t); haptic(3) }} type="button"
                style={{
                  flex: 1, textAlign: 'center', padding: '8px 0',
                  borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: active ? 'var(--card)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--muted)',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
                  border: 'none', cursor: 'pointer', fontFamily: 'DM Sans',
                }}>
                {t}
              </button>
            )
          })}
        </div>
        <div style={{
          padding: '6px 10px', borderRadius: 10,
          background: 'rgba(11,18,32,.05)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600 }}>coef</span>
          <input
            type="number" min={1} max={10} value={coef}
            onChange={e => setCoef(Math.max(1, Math.min(10, +e.target.value || 1)))}
            style={{
              width: 36, fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700,
              background: 'transparent', border: 'none', color: 'var(--text)',
              padding: 0, textAlign: 'center',
            }} />
        </div>
      </div>

      {/* Titre + date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 8, marginBottom: 16 }}>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Intitulé (ex: Contrôle ch. 6)"
          style={{ fontSize: 14 }} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: 14 }} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSave} disabled={!valid} type="button"
          style={{
            flex: 1, background: valid ? '#5B8DBF' : 'rgba(91,141,191,.3)',
            color: '#fff', borderRadius: 14, padding: '14px 0',
            fontSize: 15, fontWeight: 700, border: 'none',
            cursor: valid ? 'pointer' : 'not-allowed',
            fontFamily: 'DM Sans',
            boxShadow: valid ? '0 4px 14px rgba(91,141,191,.35)' : 'none',
          }}>
          {initial ? 'Enregistrer' : 'Ajouter la note'}
        </button>
        {onDelete && (
          <button onClick={onDelete} type="button"
            style={{
              background: 'transparent', color: '#f87171',
              border: '1px solid rgba(248,113,113,.35)', borderRadius: 14,
              padding: '14px 18px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'DM Sans',
            }}>
            Supprimer
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

// ───────────── Bottom sheet gestion matières ─────────────
interface SubjectManagerSheetProps {
  open: boolean
  onClose: () => void
  subjects: Subject[]
  onCreate: (draft: SubjectDraft) => Subject
  onUpdate: (id: string, patch: Partial<Subject>) => void
  onDelete: (id: string) => void
  countForSubject: (id: string) => number
}

function SubjectManagerSheet({ open, onClose, subjects, onCreate, onUpdate, onDelete, countForSubject }: SubjectManagerSheetProps) {
  const [name,  setName]  = useState('')
  const [short, setShort] = useState('')
  const [coef,  setCoef]  = useState(1)

  const add = () => {
    if (!name.trim()) return
    onCreate({ name, short, coef })
    setName(''); setShort(''); setCoef(1)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Mes matières">
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
        Ajoute les matières de ton cursus. Le <strong>coef</strong> sert à calculer ta moyenne générale (ex: Maths coef 7).
      </p>

      {/* Formulaire ajout */}
      <div style={{
        padding: 12, marginBottom: 16,
        background: 'rgba(91,141,191,.06)',
        border: '1px solid rgba(91,141,191,.2)', borderRadius: 12,
      }}>
        <Label>Nouvelle matière</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 64px 64px', gap: 6, marginBottom: 8 }}>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Nom" style={{ fontSize: 13 }} />
          <input value={short} onChange={e => setShort(e.target.value.slice(0, 3))}
            placeholder={autoShort(name)} style={{ fontSize: 13, textAlign: 'center' }} />
          <input type="number" min={1} max={20} value={coef}
            onChange={e => setCoef(Math.max(1, Math.min(20, +e.target.value || 1)))}
            style={{ fontSize: 13, textAlign: 'center' }} />
        </div>
        <button onClick={add} disabled={!name.trim()} type="button"
          className="btn-gold" style={{ width: '100%', fontSize: 13 }}>
          + Ajouter
        </button>
        <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
          Nom · initiale (auto: "{autoShort(name)}") · coefficient
        </p>
      </div>

      {/* Liste éditable */}
      {subjects.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>
          Pas encore de matière.
        </p>
      ) : (
        <>
          <Label>Tes matières ({subjects.length})</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {subjects.map((s: Subject) => (
              <SubjectEditRow key={s.id} subj={s}
                count={countForSubject(s.id)}
                onUpdate={(patch: Partial<Subject>) => onUpdate(s.id, patch)}
                onDelete={() => onDelete(s.id)} />
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  )
}

function SubjectEditRow({ subj, count, onUpdate, onDelete }: { subj: Subject; count: number; onUpdate: (patch: Partial<Subject>) => void; onDelete: () => void }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 12,
      background: 'var(--card)',
      border: '1px solid rgba(11,18,32,.06)',
      display: 'grid', gridTemplateColumns: '40px 1fr 56px 56px 32px',
      gap: 8, alignItems: 'center',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'rgba(91,141,191,.15)', color: '#5B8DBF',
        fontFamily: 'Fraunces', fontWeight: 700, fontSize: 15,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{subj.short}</div>
      <input value={subj.name} onChange={e => onUpdate({ name: e.target.value })}
        style={{ fontSize: 13, fontWeight: 600, padding: '6px 8px' }} />
      <input value={subj.short} onChange={e => onUpdate({ short: e.target.value })}
        maxLength={3}
        style={{ fontSize: 12, textAlign: 'center', padding: '6px 4px' }} />
      <input type="number" min={1} max={20} value={subj.coef}
        onChange={e => onUpdate({ coef: +e.target.value })}
        style={{ fontSize: 12, textAlign: 'center', padding: '6px 4px' }} />
      <button onClick={onDelete} type="button"
        title={count > 0 ? `Supprimer (et ${count} note${count > 1 ? 's' : ''})` : 'Supprimer'}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#f87171', fontSize: 16, padding: 0,
        }}>
        ✕
      </button>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, color: 'var(--muted)',
      textTransform: 'uppercase', letterSpacing: .8,
      marginBottom: 6, fontWeight: 600,
    }}>{children}</p>
  )
}
