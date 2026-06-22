"use client"

import type { ProjectStep } from '@/types'
import { ClipboardList, CheckCircle2, Circle } from 'lucide-react'

interface ProjectStepsProps {
  steps: ProjectStep[]
  newStep: string
  onNewStepChange: (v: string) => void
  onAddStep: () => void
  onToggleStep: (stepId: string) => void
  onDelStep: (stepId: string) => void
  onMoveStep: (stepId: string, dir: number) => void
}

export default function ProjectSteps({ steps, newStep, onNewStepChange, onAddStep, onToggleStep, onDelStep, onMoveStep }: ProjectStepsProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10, fontFamily: 'Fraunces', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
      <ClipboardList size={12} /> Étapes du workflow
      </p>

      {steps.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Aucune étape — ajoutes-en pour suivre ta progression.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {steps.map((step, idx) => (
          <div key={step.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
            background: step.done ? 'rgba(74,222,128,.06)' : 'rgba(91,141,191,.03)',
            border: `1px solid ${step.done ? 'rgba(74,222,128,.2)' : 'var(--border)'}`,
          }}>
            <button onClick={() => onToggleStep(step.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'inline-flex' }}>
            {step.done
            ? <CheckCircle2 size={17} style={{ color: '#4ade80' }} />
            : <Circle size={17} style={{ color: 'var(--muted)' }} />}
            </button>
            <span style={{
              flex: 1, fontSize: 13,
              textDecoration: step.done ? 'line-through' : 'none',
              color: step.done ? 'var(--muted)' : 'var(--text)',
            }}>
            {step.text}
            </span>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="btn-icon" style={{ fontSize: 12, width: 32, height: 32 }}
              onClick={() => onMoveStep(step.id, -1)} disabled={idx === 0}>↑</button>
              <button className="btn-icon" style={{ fontSize: 12, width: 32, height: 32 }}
              onClick={() => onMoveStep(step.id, 1)} disabled={idx === steps.length - 1}>↓</button>
              <button className="btn-icon" style={{ fontSize: 11 }}
              onClick={() => onDelStep(step.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input value={newStep} onChange={e => onNewStepChange(e.target.value)}
        placeholder="Ajouter une étape..."
        onKeyDown={e => { if (e.key === 'Enter') onAddStep() }}
        style={{ flex: 1, fontSize: 13 }} />
        <button className="btn-gold" style={{ fontSize: 12, padding: '7px 14px', flexShrink: 0 }}
        onClick={onAddStep} disabled={!newStep.trim()}>
        + Ajouter
        </button>
      </div>
    </div>
  )
}
