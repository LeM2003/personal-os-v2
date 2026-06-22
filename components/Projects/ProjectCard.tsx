"use client"

import { safeParse } from '../../utils/safeParse'
import { fmtDate } from '../../utils/dates'
import AbstractMark from '../shared/AbstractMark'
import ProjectSteps from './ProjectSteps'
import ProjectAiAnalysis, { type ProjectAiResult } from './ProjectAiAnalysis'
import type { Project, Task } from '@/types'
import {
  FileText, Rocket, Bot, Pencil, X,
  ChevronUp, ChevronDown, CheckCircle2,
} from 'lucide-react'

const COVER_TONES = [
  { bg: 'rgba(91,141,191,0.14)', accent: '#5B8DBF', mark: 'rings' as const },
  { bg: 'rgba(167,139,250,0.14)', accent: '#a78bfa', mark: 'offset' as const },
  { bg: 'rgba(251,146,60,0.14)', accent: '#fb923c', mark: 'bars' as const },
  { bg: 'rgba(74,222,128,0.12)', accent: '#4ade80', mark: 'arc' as const },
  { bg: 'rgba(248,113,113,0.12)', accent: '#f87171', mark: 'grid' as const },
]
const toneFor = (name: string) => {
  const n = name || ''
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h + n.charCodeAt(i)) % COVER_TONES.length
  return COVER_TONES[h]
}

interface ProjectCardProps {
  proj: Project
  tasks: Task[]
  pct: number
  isExpanded: boolean
  isEditing: boolean
  isAnalyzing: boolean
  newStep: string
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
  onPromote: () => void
  onAnalyze: () => void
  onNewStepChange: (v: string) => void
  onAddStep: () => void
  onToggleStep: (stepId: string) => void
  onDelStep: (stepId: string) => void
  onMoveStep: (stepId: string, dir: number) => void
  onNotesChange: (notes: string) => void
}

export default function ProjectCard({
  proj, tasks, pct, isExpanded, isEditing, isAnalyzing, newStep,
  onToggleExpand, onEdit, onDelete, onPromote, onAnalyze,
  onNewStepChange, onAddStep, onToggleStep, onDelStep, onMoveStep, onNotesChange,
}: ProjectCardProps) {
  const linked = tasks.filter(t => t.project === proj.name)
  const steps = proj.steps || []
  const ai = safeParse<ProjectAiResult | null>(proj.aiAnalysis, null)
  const scoreColor: string | null = !ai ? null : (ai.score_faisabilite ?? 0) >= 7 ? '#4ade80' : (ai.score_faisabilite ?? 0) >= 4 ? '#5B8DBF' : '#f87171'
  const isIdee = (proj.type || 'projet') === 'idee'
  const stepsDone = steps.filter(s => s.done).length
  const tone = toneFor(proj.name)

  return (
    <div className="card" style={{
      padding: 20, marginBottom: 16,
      background: isEditing ? 'rgba(91,141,191,.03)' : undefined,
      overflow: 'hidden',
    }}>
      {/* Bandeau moodboard — identité visuelle du projet */}
      <div
      onClick={onToggleExpand}
      style={{
        margin: '-20px -20px 16px',
        height: 76,
        background: tone.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 18px',
        position: 'relative', overflow: 'hidden',
        cursor: 'pointer',
      }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, zIndex: 1 }}>
        <span style={{
          fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
          fontFamily: 'Fraunces', fontWeight: 700,
          color: tone.accent, opacity: 0.85,
        }}>
          {isIdee ? 'Idée' : 'Projet'}
        </span>
        <span style={{
          fontSize: 22, fontFamily: 'Fraunces', fontWeight: 700,
          letterSpacing: '-0.4px', color: 'var(--text)',
          lineHeight: 1.1, maxWidth: 260,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{proj.name}</span>
      </div>
      <div style={{
        position: 'absolute', right: -10, top: -12,
        opacity: 0.55, pointerEvents: 'none',
        '--gold': tone.accent,
      } as React.CSSProperties}>
        <AbstractMark variant={tone.mark} tone="accent" size={104} />
      </div>
      <div style={{
        zIndex: 1, fontSize: 13, fontWeight: 700,
        color: pct === 100 ? '#4ade80' : tone.accent,
        background: 'var(--card)',
        borderRadius: 999, padding: '5px 11px',
        border: `1px solid ${pct === 100 ? 'rgba(74,222,128,.35)' : tone.accent + '55'}`,
      }}>
        {pct}%
      </div>
      </div>

      {/* Header badges & objectif */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onToggleExpand}>
          {ai && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span className="badge" style={{ background: `${scoreColor}22`, color: scoreColor!, fontSize: 12 }}>
                ★ {ai.score_faisabilite}/10
              </span>
              {ai.priorite_recommandee && <span className="badge badge-yellow">{ai.priorite_recommandee}</span>}
            </div>
          )}
          {proj.objective && <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 4px', lineHeight: 1.5 }}>{proj.objective}</p>}
          {proj.targetDate && <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>Cible : {fmtDate(proj.targetDate)}</p>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {isIdee && (
            <button className="btn-gold" style={{ fontSize: 11, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            onClick={onPromote}>
            <Rocket size={13} /> Promouvoir
            </button>
          )}
          <button className="btn-gold" style={{ fontSize: 11, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? <><span className="spinner" />Analyse…</> : <><Bot size={13} /> IA</>}
          </button>
          <button className="btn-icon" onClick={onEdit} title="Modifier"><Pencil size={15} /></button>
          <button className="btn-icon" onClick={onDelete} title="Supprimer"><X size={15} /></button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {steps.length > 0 && `${stepsDone}/${steps.length} étapes`}
            {steps.length > 0 && linked.length > 0 && ' · '}
            {linked.length > 0 && `${linked.filter(t => t.status === 'Terminé').length}/${linked.length} tâches`}
            {steps.length === 0 && linked.length === 0 && 'Aucune étape ni tâche'}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#4ade80' : '#5B8DBF' }}>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className={`progress-fill${pct === 100 ? ' green' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Expand toggle */}
      <button className="btn-ghost" onClick={onToggleExpand}
      style={{ width: '100%', fontSize: 12, padding: '6px 12px', marginBottom: isExpanded ? 14 : 0 }}>
      {isExpanded
      ? <><ChevronUp size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Replier</>
      : <><ChevronDown size={13} style={{ display: 'inline', verticalAlign: -2 }} /> Détails — étapes, notes, tâches</>}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ marginTop: 8 }}>
          <ProjectSteps
            steps={steps}
            newStep={newStep}
            onNewStepChange={onNewStepChange}
            onAddStep={onAddStep}
            onToggleStep={onToggleStep}
            onDelStep={onDelStep}
            onMoveStep={onMoveStep}
          />

          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8, fontFamily: 'Fraunces', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
            <FileText size={12} /> Notes / Plan
            </p>
            <textarea
            rows={4}
            value={proj.notes || ''}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="Ecris ton plan, tes idées, ta stratégie..."
            style={{ fontSize: 13, lineHeight: 1.6 }}
            />
          </div>

          {linked.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8, fontFamily: 'Fraunces', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={12} /> Tâches liées ({linked.filter(t => t.status === 'Terminé').length}/{linked.length})
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {linked.map(t => (
                  <span key={t.id} style={{
                    background: t.status === 'Terminé' ? 'rgba(34,197,94,.1)' : 'var(--pill-bg)',
                    border: `1px solid ${t.status === 'Terminé' ? 'rgba(34,197,94,.3)' : 'var(--border)'}`,
                    color: t.status === 'Terminé' ? '#4ade80' : 'var(--muted)',
                    borderRadius: 6, padding: '3px 10px', fontSize: 12,
                  }}>
                  {t.status === 'Terminé' ? '✓ ' : t.status === 'En cours' ? '◉ ' : ''}{t.name}
                  </span>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
              Astuce : dans Tâches, mets le nom du projet dans « Projet lié » pour les rattacher ici.
              </p>
            </div>
          )}

          {ai && <ProjectAiAnalysis ai={ai} scoreColor={scoreColor} />}
        </div>
      )}
    </div>
  )
}
