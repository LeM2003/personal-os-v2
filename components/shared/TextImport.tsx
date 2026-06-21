"use client"

import { useState } from 'react'
import { genId, todayISO } from '../../utils/dates'
import { authFetch } from '../../utils/authFetch'
import type { Task, Homework, Exam } from '@/types'

interface ImportResult {
  taches: Task[]
  devoirs: Homework[]
  examens: Exam[]
}

interface TextImportProps {
  onImport: (result: ImportResult) => void
  onClose: () => void
}

type PreviewData = {
  taches: Record<string, unknown>[]
  devoirs: Record<string, unknown>[]
  examens: Record<string, unknown>[]
} | null

interface SelectedMap {
  taches: number[]
  devoirs: number[]
  examens: number[]
}

const SYSTEM_PROMPT = `Tu es un assistant qui extrait des tâches, devoirs et examens à partir de texte brut.
Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de commentaire).

Le format attendu :
{
"taches": [
  { "name": "...", "project": "École" ou "", "priority": "Critique"|"Important"|"Optionnel", "duration": 60, "deadline": "YYYY-MM-DD" ou "", "flexible": false }
],
"devoirs": [
  { "matiere": "...", "description": "...", "dateRendu": "YYYY-MM-DD" ou "", "priorite": "Critique"|"Important"|"Optionnel" }
],
"examens": [
  { "matiere": "...", "date": "YYYY-MM-DD" ou "", "heure": "HH:MM", "salle": "", "chapitres": "...", "totalChapitres": 3, "chapitresRevises": 0 }
]
}

Règles :
- Si c'est un devoir/rendu/TP → mets dans "devoirs"
- Si c'est un examen/contrôle/partiel/DS → mets dans "examens"
- Si c'est une tâche générale → mets dans "taches"
- La date du jour est : {{TODAY}}
- Si aucune date n'est précisée, laisse le champ vide ""
- Convertis les dates relatives ("lundi prochain", "dans 3 jours") en YYYY-MM-DD
- duration en minutes
- Si pas d'items d'un type, renvoie un tableau vide []`

export default function TextImport({ onImport, onClose }: TextImportProps) {
const [text, setText] = useState('')
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')
const [preview, setPreview] = useState<PreviewData>(null)
const [selected, setSelected] = useState<SelectedMap>({ taches: [], devoirs: [], examens: [] })

const parse = async () => {
  if (!text.trim()) return

  setLoading(true)
  setError('')
  setPreview(null)

  try {
    const res = await authFetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'parse_tasks',
        messages: [{ role: 'user', content: text }],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>
      throw new Error((err?.error as string) || `Erreur serveur (${res.status})`)
    }

    const data = await res.json()
    const content = data.content || ''

    const jsonMatch = (content as string).match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : content
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    const result: PreviewData = {
      taches: (Array.isArray(parsed.taches) ? parsed.taches : []) as Record<string, unknown>[],
      devoirs: (Array.isArray(parsed.devoirs) ? parsed.devoirs : []) as Record<string, unknown>[],
      examens: (Array.isArray(parsed.examens) ? parsed.examens : []) as Record<string, unknown>[],
    }

    setPreview(result)
    setSelected({
      taches: result.taches.map((_: Record<string, unknown>, i: number) => i),
      devoirs: result.devoirs.map((_: Record<string, unknown>, i: number) => i),
      examens: result.examens.map((_: Record<string, unknown>, i: number) => i),
    })
  } catch (err: unknown) {
    setError((err as Error).message || 'Erreur lors de l\'analyse du texte.')
  } finally {
    setLoading(false)
  }
}

const toggleItem = (type: keyof SelectedMap, idx: number) => {
  setSelected(prev => ({
    ...prev,
    [type]: prev[type].includes(idx)
      ? prev[type].filter((i: number) => i !== idx)
      : [...prev[type], idx],
  }))
}

const totalSelected = selected.taches.length + selected.devoirs.length + selected.examens.length

const confirm = () => {
  if (!preview) return

  const newTasks: Task[] = selected.taches.map((i: number) => {
    const t = preview.taches[i] as Record<string, unknown>
    return {
      id: genId(), name: t.name as string, project: (t.project as string) || '',
      priority: (t.priority as Task['priority']) || 'Important', duration: (t.duration as number) || 25,
      deadline: (t.deadline as string) || '', flexible: !!t.flexible,
      status: 'À faire', createdAt: todayISO(), lastCompletedAt: null,
      recurring: false, recurrence: 'daily', recurrenceDays: [], recurrenceTime: '',
    }
  })

  const newDevoirs: Homework[] = selected.devoirs.map((i: number) => {
    const d = preview.devoirs[i] as Record<string, unknown>
    return {
      id: genId(), matiere: (d.matiere as string) || '',
      description: (d.description as string) || '',
      dateRendu: (d.dateRendu as string) || '', statut: 'À faire',
      priorite: (d.priorite as Homework['priorite']) || 'Important',
    }
  })

  const newExamens: Exam[] = selected.examens.map((i: number) => {
    const e = preview.examens[i] as Record<string, unknown>
    return {
      id: genId(), matiere: (e.matiere as string) || '',
      date: (e.date as string) || '', heure: (e.heure as string) || '08:00',
      salle: (e.salle as string) || '', chapitres: (e.chapitres as string) || '',
      totalChapitres: (e.totalChapitres as number) || 3, chapitresRevises: 0,
    }
  })

  onImport({ taches: newTasks, devoirs: newDevoirs, examens: newExamens })
  onClose()
}

const priorityBadge = (p: string) => {
  const colors: Record<string, string> = { Critique: '#f87171', Important: '#5B8DBF', Optionnel: '#9ca3af' }
  const emoji: Record<string, string> = { Critique: '🔴', Important: '🟡', Optionnel: '⚪' }
  return (
    <span style={{ fontSize: 11, color: colors[p] || '#9ca3af' }}>
      {emoji[p] || ''} {p}
    </span>
  )
}

return (
  <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
    <div className="modal-box" onClick={e => e.stopPropagation()}
    style={{ maxWidth: 620, maxHeight: '85vh', overflow: 'auto' }}>

    <h3 style={{ fontSize: 18, marginBottom: 4, color: '#5B8DBF' }}>
      📋 Import intelligent
    </h3>
    <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
      Colle du texte brut (planning, messages WhatsApp, capture d'ecran OCR...)
      et l'IA detecte automatiquement les taches, devoirs et examens.
    </p>

    {/* Textarea */}
    {!preview && (
      <>
        <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Exemples :\n- Examen Deep Learning le 20 avril à 8h, Grand Amphi\n- Rendre TP Spark avant vendredi\n- Réviser chapitres 4 et 5 de Machine Learning\n- Envoyer devis client Ndiaye avant mercredi`}
        rows={8}
        autoFocus
        style={{ marginBottom: 12, fontSize: 14, lineHeight: 1.6 }}
        />

        {error && (
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#f87171' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-gold" onClick={parse} disabled={loading || !text.trim()}
          style={{ opacity: loading || !text.trim() ? 0.5 : 1 }}>
            {loading ? '⏳ Analyse en cours...' : '🤖 Analyser avec l\'IA'}
          </button>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
        </div>
      </>
    )}

    {/* Preview */}
    {preview && (
      <>
        <div style={{ marginBottom: 16 }}>
          {preview.taches.length === 0 && preview.devoirs.length === 0 && preview.examens.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🤔</p>
            <p>Aucun element detecte. Essaie avec un texte plus detaille.</p>
          </div>
          ) : (
          <>
            {/* Taches */}
            {preview.taches.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#5B8DBF', marginBottom: 8, fontFamily: 'Fraunces' }}>
                  ✅ Tâches ({preview.taches.length})
                </p>
                {preview.taches.map((t, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px',
                  background: selected.taches.includes(i) ? 'rgba(91,141,191,.05)' : 'transparent',
                  border: `1px solid ${selected.taches.includes(i) ? 'rgba(91,141,191,.2)' : 'var(--border)'}`,
                  borderRadius: 8, marginBottom: 6, cursor: 'pointer', transition: 'all .15s' }}>
                    <input type="checkbox" checked={selected.taches.includes(i)}
                    onChange={() => toggleItem('taches', i)}
                    style={{ width: 'auto', marginTop: 2, accentColor: '#5B8DBF' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, margin: 0 }}>{t.name as string}</p>
                      <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                        {priorityBadge(t.priority as string)}
                        {Boolean(t.deadline) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📅 {String(t.deadline)}</span>}
                        {(t.duration as number) > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>⏱ {String(t.duration)}min</span>}
                        {Boolean(t.project) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📁 {String(t.project)}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Devoirs */}
            {preview.devoirs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6', marginBottom: 8, fontFamily: 'Fraunces' }}>
                  📋 Devoirs ({preview.devoirs.length})
                </p>
                {preview.devoirs.map((d, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px',
                  background: selected.devoirs.includes(i) ? 'rgba(139,92,246,.05)' : 'transparent',
                  border: `1px solid ${selected.devoirs.includes(i) ? 'rgba(139,92,246,.2)' : 'var(--border)'}`,
                  borderRadius: 8, marginBottom: 6, cursor: 'pointer', transition: 'all .15s' }}>
                    <input type="checkbox" checked={selected.devoirs.includes(i)}
                    onChange={() => toggleItem('devoirs', i)}
                    style={{ width: 'auto', marginTop: 2, accentColor: '#8b5cf6' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, margin: 0 }}>
                        <strong>{d.matiere as string}</strong>
                        {Boolean(d.description) && <span style={{ color: '#9ca3af' }}> — {String(d.description)}</span>}
                      </p>
                      <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                        {priorityBadge(d.priorite as string)}
                        {Boolean(d.dateRendu) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📅 A rendre : {String(d.dateRendu)}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Examens */}
            {preview.examens.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 8, fontFamily: 'Fraunces' }}>
                  🎓 Examens ({preview.examens.length})
                </p>
                {preview.examens.map((ex, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px',
                  background: selected.examens.includes(i) ? 'rgba(245,158,11,.05)' : 'transparent',
                  border: `1px solid ${selected.examens.includes(i) ? 'rgba(245,158,11,.2)' : 'var(--border)'}`,
                  borderRadius: 8, marginBottom: 6, cursor: 'pointer', transition: 'all .15s' }}>
                    <input type="checkbox" checked={selected.examens.includes(i)}
                    onChange={() => toggleItem('examens', i)}
                    style={{ width: 'auto', marginTop: 2, accentColor: '#f59e0b' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, margin: 0 }}><strong>{ex.matiere as string}</strong></p>
                      <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                        {Boolean(ex.date) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📅 {String(ex.date)}</span>}
                        {Boolean(ex.heure) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>⏰ {String(ex.heure)}</span>}
                        {Boolean(ex.salle) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {String(ex.salle)}</span>}
                        {Boolean(ex.chapitres) && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📖 {String(ex.chapitres)}</span>}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {totalSelected > 0 && (
            <button className="btn-gold" onClick={confirm}>
              ✅ Importer {totalSelected} element{totalSelected > 1 ? 's' : ''}
            </button>
          )}
          <button className="btn-ghost" onClick={() => { setPreview(null); setSelected({ taches: [], devoirs: [], examens: [] }) }}>
            ← Modifier le texte
          </button>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
        </div>
      </>
    )}
  </div>
  </div>
)
}
