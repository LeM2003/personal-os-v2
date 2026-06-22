"use client"

import type { ProjectType } from '@/types'
import { Lightbulb, Target, Pencil } from 'lucide-react'

export interface ProjectFormState {
  name: string
  objective: string
  targetDate: string
  type: ProjectType
  notes: string
}

export const blankProject: ProjectFormState = {
  name: '', objective: '', targetDate: '', type: 'projet', notes: '',
}

interface ProjectFormProps {
  form: ProjectFormState
  setForm: (form: ProjectFormState) => void
  editingId: string | null
  onSave: () => void
  onCancel: () => void
}

export default function ProjectForm({ form, setForm, editingId, onSave, onCancel }: ProjectFormProps) {
  return (
    <div className="card" style={{ padding: 20, marginBottom: 20, border: '1px solid rgba(91,141,191,.3)' }}>
      <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
        {editingId ? <><Pencil size={15} /> Modifier</>
        : form.type === 'idee' ? <><Lightbulb size={15} /> Nouvelle idée</>
        : <><Target size={15} /> Nouveau projet</>}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
        placeholder={form.type === 'idee' ? "Nom de l'idée *" : "Nom du projet *"} autoFocus />
        <textarea rows={2} value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })}
        placeholder="Objectif final (ex : atteindre 10K abonnés)" />
        <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
        placeholder="Notes / Plan détaillé (optionnel)" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid-2">
          <input type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ProjectType })}>
            <option value="projet">Projet</option>
            <option value="idee">Idée</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn-gold" onClick={onSave}>{editingId ? 'Enregistrer' : 'Créer'}</button>
        <button className="btn-ghost" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  )
}
