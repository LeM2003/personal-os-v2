// @ts-nocheck — migration TypeScript en attente
"use client"

import { useState } from 'react'
import { genId, todayISO } from '../../utils/dates'

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

export default function TextImport({ onImport, onClose }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [selected, setSelected] = useState({ taches: [], devoirs: [], examens: [] })

  const parse = async () => {
    if (!text.trim()) return

    setLoading(true)
    setError('')
    setPreview(null)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'parse_tasks',
          messages: [{ role: 'user', content: text }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `Erreur serveur (${res.status})`)
      }

      const data = await res.json()
      const content = data.content || ''

      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : content
      const parsed = JSON.parse(jsonStr)
      const result = {
        taches: parsed.taches || [],
        devoirs: parsed.devoirs || [],
        examens: parsed.examens || [],
      }

      setPreview(result)
      setSelected({
        taches: result.taches.map((_, i) => i),
        devoirs: result.devoirs.map((_, i) => i),
        examens: result.examens.map((_, i) => i),
      })
    } catch (e) {
      setError(e.message || 'Erreur lors de l\'analyse du texte.')
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (type, idx) => {
    setSelected(prev => ({
      ...prev,
      [type]: prev[type].includes(idx)
        ? prev[type].filter(i => i !== idx)
        : [...prev[type], idx],
    }))
  }

  const totalSelected = selected.taches.length + selected.devoirs.length + selected.examens.length

  const confirm = () => {
    if (!preview) return

    const newTasks = selected.taches.map(i => {
      const t = preview.taches[i]
      return {
        id: genId(), name: t.name, project: t.project || '',
        priority: t.priority || 'Important', duration: t.duration || 25,
        deadline: t.deadline || '', flexible: !!t.flexible,
        status: 'À faire', createdAt: todayISO(), lastCompletedAt: null,
        recurring: false, recurrence: 'daily', recurrenceDays: [], recurrenceTime: '',
      }
    })

    const newDevoirs = selected.devoirs.map(i => {
      const d = preview.devoirs[i]
      return {
        id: genId(), matiere: d.matiere || '',
        description: d.description || '',
        dateRendu: d.dateRendu || '', statut: 'À faire',
        priorite: d.priorite || 'Important',
      }
    })

    const newExamens = selected.examens.map(i => {
      const e = preview.examens[i]
      return {
        id: genId(), matiere: e.matiere || '',
        date: e.date || '', heure: e.heure || '08:00',
        salle: e.salle || '', chapitres: e.chapitres || '',
        totalChapitres: e.totalChapitres || 3, chapitresRevises: 0,
      }
    })

    onImport({ taches: newTasks, devoirs: newDevoirs, examens: newExamens })
    onClose()
  }

  const priorityBadge = (p) => {
    const colors = { Critique: '#f87171', Important: '#5B8DBF', Optionnel: '#9ca3af' }
    const emoji = { Critique: '🔴', Important: '🟡', Optionnel: '⚪' }
    return (
      <span style={{ fontSize: 11, color: colors[p] || '#9ca3af' }}>
        {emoji[p] || ''} {p}
      </span>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
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
                        ✅ Taches ({preview.taches.length})
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
                            <p style={{ fontSize: 14, margin: 0 }}>{t.name}</p>
                            <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                              {priorityBadge(t.priority)}
                              {t.deadline && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📅 {t.deadline}</span>}
                              {t.duration > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>⏱ {t.duration}min</span>}
                              {t.project && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📁 {t.project}</span>}
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
                              <strong>{d.matiere}</strong>
                              {d.description && <span style={{ color: '#9ca3af' }}> — {d.description}</span>}
                            </p>
                            <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                              {priorityBadge(d.priorite)}
                              {d.dateRendu && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📅 A rendre : {d.dateRendu}</span>}
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
                      {preview.examens.map((e, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px',
                          background: selected.examens.includes(i) ? 'rgba(245,158,11,.05)' : 'transparent',
                          border: `1px solid ${selected.examens.includes(i) ? 'rgba(245,158,11,.2)' : 'var(--border)'}`,
                          borderRadius: 8, marginBottom: 6, cursor: 'pointer', transition: 'all .15s' }}>
                          <input type="checkbox" checked={selected.examens.includes(i)}
                            onChange={() => toggleItem('examens', i)}
                            style={{ width: 'auto', marginTop: 2, accentColor: '#f59e0b' }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, margin: 0 }}><strong>{e.matiere}</strong></p>
                            <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                              {e.date && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📅 {e.date}</span>}
                              {e.heure && <span style={{ fontSize: 11, color: 'var(--muted)' }}>⏰ {e.heure}</span>}
                              {e.salle && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📍 {e.salle}</span>}
                              {e.chapitres && <span style={{ fontSize: 11, color: 'var(--muted)' }}>📖 {e.chapitres}</span>}
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
