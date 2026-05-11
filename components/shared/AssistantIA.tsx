"use client"

import { useState, useRef, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { X, Send, Bot, Sparkles, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { genId, todayISO } from '@/utils/dates'
import type { Task, Project, Exam, Homework, Expense } from '@/types'

// ── Types ────────────────────────────────────────────────────────────────────

type ActionType =
  | 'create_task' | 'create_idea' | 'create_exam' | 'create_devoir' | 'create_expense'
  | 'complete_task' | 'delete_task'
  | 'update_task_deadline' | 'update_task_priority'
  | 'complete_devoir'
  | 'start_pomodoro'

interface ParsedAction {
  type: ActionType
  data: Record<string, unknown>
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  actionConfirmed?: boolean
}

// ── Parsing ──────────────────────────────────────────────────────────────────

function parseAction(text: string): ParsedAction | null {
  // Cherche [ACTION:type:{...}] à la fin du texte (robuste aux sauts de ligne)
  const match = text.match(/\[ACTION:([a-z_]+):([\s\S]*?)\]\s*$/)
  if (!match) return null
  try {
    return { type: match[1] as ActionType, data: JSON.parse(match[2]) }
  } catch { return null }
}

function stripAction(text: string): string {
  return text.replace(/\[ACTION:[a-z_]+:[\s\S]*?\]\s*$/g, '').trim()
}

// ── Métadonnées des actions ───────────────────────────────────────────────────

const ACTION_META: Record<string, { icon: string; label: string; color: string; verb?: string }> = {
  create_task:           { icon: '✅', label: 'Tâche',         color: '#38bdf8', verb: 'Créer' },
  create_idea:           { icon: '💡', label: 'Idée / Projet', color: '#f59e0b', verb: 'Créer' },
  create_exam:           { icon: '🎓', label: 'Examen',        color: '#f87171', verb: 'Créer' },
  create_devoir:         { icon: '📋', label: 'Devoir',        color: '#a78bfa', verb: 'Créer' },
  create_expense:        { icon: '💸', label: 'Dépense',       color: '#4ade80', verb: 'Créer' },
  complete_task:         { icon: '✅', label: 'Tâche',         color: '#4ade80', verb: 'Marquer terminé' },
  delete_task:           { icon: '🗑️', label: 'Tâche',         color: '#f87171', verb: 'Supprimer' },
  update_task_deadline:  { icon: '📅', label: 'Deadline',      color: '#38bdf8', verb: 'Modifier' },
  update_task_priority:  { icon: '⚡', label: 'Priorité',      color: '#f59e0b', verb: 'Modifier' },
  complete_devoir:       { icon: '📋', label: 'Devoir',        color: '#4ade80', verb: 'Marquer rendu' },
  start_pomodoro:        { icon: '⏱️', label: 'Pomodoro',      color: '#38bdf8', verb: 'Lancer' },
}

const WHERE_TO_FIND: Partial<Record<ActionType, string>> = {
  create_task:          '→ Onglet Tâches',
  create_idea:          '→ Onglet Projets & Idées',
  create_exam:          '→ Onglet École',
  create_devoir:        '→ Onglet École',
  create_expense:       '→ Onglet Finances',
  complete_task:        '→ Tâche mise à jour',
  delete_task:          '→ Tâche supprimée',
  update_task_deadline: '→ Deadline mise à jour',
  update_task_priority: '→ Priorité mise à jour',
  complete_devoir:      '→ Devoir marqué comme rendu',
  start_pomodoro:       '→ Timer lancé',
}

function actionSummary(action: ParsedAction): string {
  const d = action.data
  switch (action.type) {
    case 'create_task':
      return `"${d.name}" · ${d.priority || 'Important'}${d.deadline ? ` · ${d.deadline}` : ''}`
    case 'create_idea':
      return `"${d.name}"${d.objective ? ` · ${d.objective}` : ''}`
    case 'create_exam':
      return `${d.matiere} le ${d.date}${d.heure ? ' à ' + d.heure : ''}`
    case 'create_devoir':
      return `${d.matiere}${d.dateRendu ? ' avant ' + d.dateRendu : ''}`
    case 'create_expense':
      return `${d.name} — ${d.amount} FCFA`
    case 'complete_task':
    case 'delete_task':
    case 'start_pomodoro':
      return `"${d.name}"`
    case 'update_task_deadline':
      return `"${d.name}" → ${d.deadline}`
    case 'update_task_priority':
      return `"${d.name}" → ${d.priority}`
    case 'complete_devoir':
      return `${d.matiere}`
    default:
      return JSON.stringify(d)
  }
}

// ── ActionCard ────────────────────────────────────────────────────────────────

interface ActionCardProps {
  action: ParsedAction
  onConfirm: () => void
  confirmed: boolean
}

function ActionCard({ action, onConfirm, confirmed }: ActionCardProps) {
  const meta = ACTION_META[action.type] || { icon: '⚡', label: 'Action', color: '#38bdf8', verb: 'Exécuter' }
  const isDestructive = action.type === 'delete_task'

  if (confirmed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10,
        background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', marginTop: 8 }}>
        <CheckCircle2 size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: 12, color: '#4ade80', fontWeight: 600 }}>
            {meta.label} — {meta.verb?.toLowerCase()} ✓
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>
            {WHERE_TO_FIND[action.type]}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 12,
      background: `${meta.color}10`, border: `1px solid ${meta.color}30`,
      position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 15 }}>{meta.icon}</span>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: meta.color,
          textTransform: 'uppercase', letterSpacing: .8 }}>
          {meta.verb} {meta.label}
        </p>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
        {actionSummary(action)}
      </p>
      <button onClick={onConfirm}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8,
          border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
          fontFamily: 'var(--font-dm-sans, DM Sans)',
          background: isDestructive ? '#f87171' : `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
          color: '#fff' }}>
        {isDestructive ? <Trash2 size={13} /> : <Plus size={13} />}
        Confirmer
      </button>
    </div>
  )
}

// ── Message ───────────────────────────────────────────────────────────────────

interface MessageProps {
  msg: Message
  onConfirmAction: (msgId: string, action: ParsedAction) => void
}

function MessageBubble({ msg, onConfirmAction }: MessageProps) {
  const isUser = msg.role === 'user'
  const action = !isUser ? parseAction(msg.content) : null
  const displayText = !isUser ? stripAction(msg.content) : msg.content

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row', marginBottom: 14 }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2 }}>
          <Bot size={15} color="#fff" />
        </div>
      )}
      <div style={{ maxWidth: '82%' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser
            ? 'linear-gradient(135deg, var(--accent-1), var(--accent-2))'
            : 'var(--surface-elevated)',
          border: isUser ? 'none' : '1px solid var(--border)',
          color: isUser ? '#fff' : 'var(--text)',
          fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {displayText}
          {msg.streaming && !displayText && <span style={{ opacity: .4 }}>…</span>}
          {msg.streaming && displayText && <span style={{ opacity: .5, marginLeft: 4 }}>▋</span>}
        </div>
        {action && !msg.streaming && (
          <ActionCard
            action={action}
            confirmed={!!msg.actionConfirmed}
            onConfirm={() => onConfirmAction(msg.id, action)}
          />
        )}
      </div>
    </div>
  )
}

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Qu'est-ce que j'ai aujourd'hui ?",
  "Aide-moi à prioriser ma journée",
  "Crée une tâche réviser Deep Learning demain",
  "Marque ma tâche la plus urgente comme terminée",
  "Quels examens approchent ?",
]

// ── AssistantIA principal ─────────────────────────────────────────────────────

interface AssistantIAProps {
  onClose: () => void
}

export default function AssistantIA({ onClose }: AssistantIAProps) {
  const app = useApp()

  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: `Bonjour ${app.profile?.prenom || ''} ! Je peux répondre à tes questions ET agir directement : créer des tâches, marquer comme terminé, changer une deadline, supprimer... Essaie !`,
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { inputRef.current?.focus() }, [])

  const buildContext = () => ({
    profile:  app.profile,
    tasks:    app.tasks    || [],
    examens:  app.examens  || [],
    devoirs:  app.devoirs  || [],
    projects: app.projects || [],
    expenses: app.expenses || [],
    streak:   app.streakData?.count || 0,
  })

  // ── Exécution des actions ──────────────────────────────────────────────────

  const executeAction = (action: ParsedAction) => {
    const { type, data } = action
    const today = todayISO()

    switch (type) {
      case 'create_task':
        app.setTasks(prev => [...prev, {
          id: genId(), name: String(data.name), priority: String(data.priority || 'Important'),
          status: 'À faire', deadline: String(data.deadline || ''),
          project: String(data.project || ''), recurring: false,
          duration: Number(data.duration) || 25, createdAt: today, lastCompletedAt: null,
          recurrence: 'daily', recurrenceDays: [], recurrenceTime: '',
        } as Task])
        break

      case 'create_idea':
        app.setProjects(prev => [...prev, {
          id: genId(), name: String(data.name), type: 'idee',
          objective: String(data.objective || ''), notes: '', steps: [],
          targetDate: '', status: 'En cours', createdAt: today,
        } as unknown as Project])
        break

      case 'create_exam':
        app.setExamens(prev => [...prev, {
          id: genId(), matiere: String(data.matiere), date: String(data.date || ''),
          heure: String(data.heure || '08:00'), salle: String(data.salle || ''),
        } as Exam])
        break

      case 'create_devoir':
        app.setDevoirs(prev => [...prev, {
          id: genId(), matiere: String(data.matiere),
          description: String(data.description || ''),
          dateRendu: String(data.dateRendu || ''), statut: 'À rendre',
        } as Homework])
        break

      case 'create_expense':
        app.setExpenses(prev => [...prev, {
          id: genId(), label: String(data.name), amount: Number(data.amount) || 0,
          category: String(data.category || 'Autre'), date: today,
        } as Expense])
        break

      case 'complete_task':
        app.setTasks(prev => prev.map(t =>
          t.id === String(data.id) ? { ...t, status: 'Terminé' as const, lastCompletedAt: today } : t
        ))
        break

      case 'delete_task':
        app.setTasks(prev => prev.filter(t => t.id !== String(data.id)))
        break

      case 'update_task_deadline':
        app.setTasks(prev => prev.map(t =>
          t.id === String(data.id) ? { ...t, deadline: String(data.deadline) } : t
        ))
        break

      case 'update_task_priority':
        app.setTasks(prev => prev.map(t =>
          t.id === String(data.id) ? { ...t, priority: String(data.priority) as Task['priority'] } : t
        ))
        break

      case 'complete_devoir':
        app.setDevoirs(prev => prev.map(d =>
          d.id === String(data.id) ? { ...d, statut: 'Rendu' as const } : d
        ))
        break

      case 'start_pomodoro': {
        const task = app.tasks?.find(t => t.id === String(data.id))
        if (task) {
          app.startPomo(task)
          onClose()
        }
        break
      }
    }
  }

  const handleConfirmAction = (msgId: string, action: ParsedAction) => {
    executeAction(action)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionConfirmed: true } : m))
  }

  // ── Envoi ─────────────────────────────────────────────────────────────────

  const send = async (text?: string) => {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')

    const userMsg: Message = { id: genId(), role: 'user', content: userText }
    const history = [...messages, userMsg]
    setMessages(history)
    setLoading(true)

    const streamingId = genId()
    setMessages(prev => [...prev, { id: streamingId, role: 'assistant', content: '', streaming: true }])

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          context: buildContext(),
        }),
      })

      if (!res.ok || !res.body) throw new Error('Erreur serveur')

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m =>
          m.id === streamingId ? { ...m, content: fullText } : m
        ))
      }

      setMessages(prev => prev.map(m =>
        m.id === streamingId ? { id: streamingId, role: 'assistant', content: fullText } : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === streamingId
          ? { id: streamingId, role: 'assistant', content: "Désolé, une erreur s'est produite. Réessaie." }
          : m
      ))
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 136px)',
      right: 20, zIndex: 500,
      width: 'min(380px, calc(100vw - 32px))',
      background: 'var(--modal-bg)',
      border: '1px solid rgba(56,189,248,.2)',
      borderRadius: 20,
      boxShadow: '0 24px 64px rgba(0,0,0,.5), 0 0 40px rgba(56,189,248,.06)',
      backdropFilter: 'blur(24px)',
      display: 'flex', flexDirection: 'column',
      maxHeight: 'min(540px, calc(100vh - 180px))',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Assistant IA</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--accent-1)' }}>
            ● Peut créer, modifier et supprimer
          </p>
        </div>
        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', scrollbarWidth: 'thin' }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} onConfirmAction={handleConfirmAction} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (premier message seulement) */}
      {messages.length === 1 && (
        <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)}
              style={{
                padding: '5px 12px', borderRadius: 999,
                border: '1px solid rgba(56,189,248,.2)',
                background: 'rgba(56,189,248,.05)',
                color: 'var(--accent-1)', fontSize: 11, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-dm-sans, DM Sans)',
              }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '8px 12px 12px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Pose une question ou demande une action..."
          rows={1}
          disabled={loading}
          style={{
            flex: 1, fontSize: 14, lineHeight: 1.5, resize: 'none',
            borderRadius: 12, maxHeight: 80, overflow: 'auto',
            padding: '9px 12px', background: 'rgba(255,255,255,.05)',
            border: '1px solid var(--border)',
          }}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          style={{
            width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: !input.trim() || loading
              ? 'rgba(56,189,248,.2)'
              : 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all .15s',
          }}>
          <Send size={16} color={!input.trim() || loading ? 'var(--muted)' : '#fff'} />
        </button>
      </div>
    </div>
  )
}
