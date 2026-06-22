"use client"

import { Bot } from 'lucide-react'

export interface ProjectAiResult {
  score_faisabilite?: number
  priorite_recommandee?: string
  raison?: string
  prochaines_etapes?: string[]
}

interface ProjectAiAnalysisProps {
  ai: ProjectAiResult
  scoreColor: string | null
}

export default function ProjectAiAnalysis({ ai, scoreColor }: ProjectAiAnalysisProps) {
  return (
    <div className="ai-block">
      <p style={{ color: '#5B8DBF', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
      <Bot size={13} /> Analyse IA
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="grid-2">
        <div>
          <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 5 }}>Score de faisabilité</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'Fraunces', fontWeight: 800, fontSize: 28, color: scoreColor ?? undefined }}>{ai.score_faisabilite}</span>
            <span style={{ color: 'var(--muted)', fontSize: 16 }}>/10</span>
          </div>
        </div>
        <div>
          <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 5 }}>Raison</p>
          <p style={{ fontSize: 13, color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>{ai.raison}</p>
        </div>
      </div>
      {(ai.prochaines_etapes?.length ?? 0) > 0 && (
        <div>
          <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>Prochaines étapes suggérées</p>
          {(ai.prochaines_etapes ?? []).map((step: string, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
              <span style={{ color: '#5B8DBF', fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
