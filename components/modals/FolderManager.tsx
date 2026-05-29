"use client"

import { useState } from 'react'
import type { Folder } from '@/types'
import { haptic } from '@/utils/haptics'
import { X, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Check } from 'lucide-react'

// Palette curée — alignée sur les accents du design system (cohérence visuelle).
const FOLDER_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#f472b6', '#94a3b8']

interface Props {
  folders: Folder[]
  onAdd: (name: string, color: string, emoji?: string) => void
  onUpdate: (id: string, patch: Partial<Folder>) => void
  onDelete: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onClose: () => void
}

function Swatches({ value, onPick }: { value: string; onPick: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {FOLDER_COLORS.map(c => {
        const active = value === c
        return (
          <button key={c} type="button" onClick={() => onPick(c)} aria-label={`Couleur ${c}`}
            style={{
              width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, background: c,
              border: active ? '2px solid var(--text)' : '2px solid transparent',
              boxShadow: active ? `0 0 0 2px var(--modal-bg), 0 0 10px ${c}66` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform var(--dur-fast) var(--ease-spring)',
            }}>
            {active && <Check size={13} color="#fff" strokeWidth={3} />}
          </button>
        )
      })}
    </div>
  )
}

export default function FolderManager({ folders, onAdd, onUpdate, onDelete, onMove, onClose }: Props) {
  const sorted = [...folders].sort((a, b) => a.order - b.order)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(FOLDER_COLORS[0])
  const [newEmoji, setNewEmoji] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editEmoji, setEditEmoji] = useState('')

  const startEdit = (f: Folder) => {
    setEditingId(f.id); setEditName(f.name); setEditColor(f.color); setEditEmoji(f.emoji || '')
  }
  const saveEdit = () => {
    if (!editName.trim()) return
    onUpdate(editingId!, { name: editName.trim(), color: editColor, emoji: editEmoji.trim() || undefined })
    setEditingId(null)
  }
  const add = () => {
    if (!newName.trim()) return
    haptic(3)
    onAdd(newName, newColor, newEmoji.trim() || undefined)
    setNewName(''); setNewEmoji(''); setNewColor(FOLDER_COLORS[0])
  }
  const confirmDelete = (f: Folder) => {
    if (typeof window !== 'undefined' && !confirm(`Supprimer le dossier « ${f.name} » ? Les tâches associées passeront « Sans dossier » (elles ne seront pas supprimées).`)) return
    haptic(8)
    onDelete(f.id)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, color: 'var(--accent-1)', margin: 0 }}>Gérer les dossiers</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
        </div>

        {/* Liste existante */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {sorted.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
              Aucun dossier. Crée ton premier ci-dessous.
            </p>
          )}
          {sorted.map((f, i) => editingId === f.id ? (
            <div key={f.id} style={{ background: 'var(--surface-deep)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={editEmoji} onChange={e => setEditEmoji(e.target.value)} placeholder="🎯"
                  maxLength={2} style={{ width: 52, textAlign: 'center' }} aria-label="Emoji" />
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nom du dossier"
                  autoFocus onKeyDown={e => { if (e.key === 'Enter') saveEdit() }} style={{ flex: 1 }} />
              </div>
              <Swatches value={editColor} onPick={setEditColor} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-gold" onClick={saveEdit} disabled={!editName.trim()} style={{ fontSize: 13 }}>Enregistrer</button>
                <button className="btn-ghost" onClick={() => setEditingId(null)} style={{ fontSize: 13 }}>Annuler</button>
              </div>
            </div>
          ) : (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface-deep)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: f.color, flexShrink: 0,
                boxShadow: `0 0 8px ${f.color}55` }} />
              <span style={{ fontSize: 14, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.emoji && <span style={{ marginRight: 6 }}>{f.emoji}</span>}{f.name}
              </span>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button className="btn-icon" onClick={() => onMove(f.id, -1)} disabled={i === 0} title="Monter"><ChevronUp size={15} /></button>
                <button className="btn-icon" onClick={() => onMove(f.id, 1)} disabled={i === sorted.length - 1} title="Descendre"><ChevronDown size={15} /></button>
                <button className="btn-icon" onClick={() => startEdit(f)} title="Modifier"><Pencil size={14} /></button>
                <button className="btn-icon" onClick={() => confirmDelete(f)} title="Supprimer" style={{ color: '#f87171' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Ajout */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
            Nouveau dossier
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} placeholder="🎯"
              maxLength={2} style={{ width: 52, textAlign: 'center' }} aria-label="Emoji (optionnel)" />
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom du dossier"
              onKeyDown={e => { if (e.key === 'Enter') add() }} style={{ flex: 1 }} />
          </div>
          <Swatches value={newColor} onPick={setNewColor} />
          <button className="btn-gold" onClick={add} disabled={!newName.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={15} /> Ajouter le dossier
          </button>
        </div>
      </div>
    </div>
  )
}
