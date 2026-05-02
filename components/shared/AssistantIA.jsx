"use client"

import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { X, Send, Bot, Sparkles, CheckCircle2, Plus } from 'lucide-react'
import { genId, todayISO } from '../../utils/dates'

const SUGGESTIONS = [
  "Qu'est-ce que j'ai aujourd'hui ?",
  "Aide-moi à prioriser ma journée",
  "Crée une tâche réviser Deep Learning demain",
  "Résume ma semaine",
  "Quels examens approchent ?",
]

// Parse [ACTION:type:{json}] from text
function parseAction(text) {
  const match = text.match(/\[ACTION:(\w+):(\{.*?\})\]/)
  if (!match) return null
  try {
    return { type: match[1], data: JSON.parse(match[2]) }
  } catch { return null }
}

// Strip action tag from displayed text
function stripAction(text) {
  return text.replace(/\[ACTION:\w+:\{.*?\}\]/g, '').trim()
}

const ACTION_LABELS = {
  create_task:    { icon: '✅', label: 'Tâche', color: '#38bdf8' },
  create_idea:    { icon: '💡', label: 'Idée / Projet', color: '#f59e0b' },
  create_exam:    { icon: '🎓', label: 'Examen', color: '#f87171' },
  create_devoir:  { icon: '📋', label: 'Devoir', color: '#a78bfa' },
  create_expense: { icon: '💸', label: 'Dépense', color: '#4ade80' },
}

function ActionCard({ action, onConfirm, confirmed }) {
  const meta = ACTION_LABELS[action.type] || { icon: '⚡', label: 'Action', color: '#38bdf8' }
  const d = action.data

  const summary = action.type === 'create_task'
    ? `"${d.name}" · ${d.priority || 'Important'}${d.deadline ? ` · ${d.deadline}` : ''}`
    : action.type === 'create_idea'
    ? `"${d.name}"${d.objective ? ` · ${d.objective}` : ''}`
    : action.type === 'create_exam'
    ? `${d.matiere} le ${d.date}${d.heure ? ' à ' + d.heure : ''}`
    : action.type === 'create_devoir'
    ? `${d.matiere}${d.dateRendu ? ' avant ' + d.dateRendu : ''}`
    : action.type === 'create_expense'
    ? `${d.name} — ${d.amount} FCFA`
    : JSON.stringify(d)

  const whereToFind = {
    create_task:    '→ Onglet Tâches (filtre "Tout")',
    create_idea:    '→ Onglet Projets & Idées',
    create_exam:    '→ Onglet École',
    create_devoir:  '→ Onglet École',
    create_expense: '→ Onglet Finances',
  }

  if (confirmed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', marginTop: 8 }}>
        <CheckCircle2 size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: 12, color: '#4ade80', fontWeight: 600 }}>
            {meta.label} créé ✓
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>
            {whereToFind[action.type]}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 12, background: `${meta.color}10`, border: `1px solid ${meta.color}30`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${meta.color}, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{meta.icon}</span>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: .8 }}>
          Créer {meta.label}
        </p>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{summary}</p>
      <button onClick={onConfirm}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`, color: '#fff',
          fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-dm-sans, DM Sans)' }}>
        <Plus size={14} /> Confirmer
      </button>
    </div>
  )
}

function Message({ msg, onConfirmAction }) {
  const isUser = msg.role === 'user'
  const action = !isUser ? parseAction(msg.content) : null
  const displayText = !isUser ? stripAction(msg.content) : msg.content

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row', marginBottom: 14, animation: 'staggerIn .25s ease both' }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <Bot size={15} color="#fff" />
        </div>
      )}
      <div style={{ maxWidth: '82%' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser ? 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' : 'rgba(255,255,255,.05)',
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
            confirmed={msg.actionConfirmed}
            onConfirm={() => onConfirmAction(msg.id, action)}
          />
        )}
      </div>
    </div>
  )
}

export default function AssistantIA({ onClose }) {
  const app = useApp()
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Bonjour ${app.profile?.prenom || ''} ! Je suis ton assistant. Je peux répondre à tes questions ET créer des tâches, examens, idées directement dans l'app. Essaie de me dire *"Crée une tâche..."* !`
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { inputRef.current?.focus() }, [])

  const buildContext = () => ({
    profile: app.profile,
    tasks: app.tasks || [],
    examens: app.examens || [],
    devoirs: app.devoirs || [],
    projects: app.projects || [],
    expenses: app.expenses || [],
    streak: app.streakData?.count || 0,
  })

  const executeAction = (action) => {
    const { type, data } = action
    const today = todayISO()

    if (type === 'create_task') {
      app.setTasks(prev => [...prev, {
        id: genId(), name: data.name, priority: data.priority || 'Important',
        status: 'À faire', deadline: data.deadline || '', project: data.project || '',
        recurring: false, flexible: false, duration: 25,
        createdAt: today, lastCompletedAt: null,
        recurrence: 'daily', recurrenceDays: [], recurrenceTime: '',
      }])
    } else if (type === 'create_idea') {
      app.setProjects(prev => [...prev, {
        id: genId(), name: data.name, type: 'idee',
        objective: data.objective || '', notes: '', steps: [],
        targetDate: '', status: 'En cours', createdAt: today,
      }])
    } else if (type === 'create_exam') {
      app.setExamens(prev => [...prev, {
        id: genId(), matiere: data.matiere, date: data.date || '',
        heure: data.heure || '08:00', salle: data.salle || '',
        chapitres: '', totalChapitres: 3, chapitresRevises: 0,
      }])
    } else if (type === 'create_devoir') {
      app.setDevoirs(prev => [...prev, {
        id: genId(), matiere: data.matiere, description: data.description || '',
        dateRendu: data.dateRendu || '', statut: 'À faire',
        priorite: data.priorite || 'Important',
      }])
    } else if (type === 'create_expense') {
      app.setExpenses(prev => [...prev, {
        id: genId(), name: data.name, amount: Number(data.amount) || 0,
        category: data.category || 'Autre', date: today, note: '',
      }])
    }
  }

  const handleConfirmAction = (msgId, action) => {
    executeAction(action)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, actionConfirmed: true } : m))
  }

  const send = async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return
    setInput('')

    const userMsg = { id: genId(), role: 'user', content: userText }
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

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map(m => m.id === streamingId ? { ...m, content: fullText } : m))
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

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 136px)', right: 20, zIndex: 500,
      width: 'min(380px, calc(100vw - 32px))',
      background: 'rgba(8, 14, 26, 0.96)',
      border: '1px solid rgba(56,189,248,.2)',
      borderRadius: 20,
      boxShadow: '0 24px 64px rgba(0,0,0,.5), 0 0 40px rgba(56,189,248,.06)',
      backdropFilter: 'blur(24px)',
      display: 'flex', flexDirection: 'column',
      maxHeight: 'min(540px, calc(100vh - 180px))',
      animation: 'modalIn .3s cubic-bezier(.34,1.56,.64,1) both',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Assistant IA</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--accent-1)' }}>● Peut créer des tâches, examens, idées</p>
        </div>
        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', scrollbarWidth: 'thin' }}>
        {messages.map(msg => (
          <Message key={msg.id} msg={msg} onConfirmAction={handleConfirmAction} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)}
              style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(56,189,248,.2)', background: 'rgba(56,189,248,.05)', color: 'var(--accent-1)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-dm-sans, DM Sans)', transition: 'all .15s' }}>
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
          placeholder="Pose une question ou crée quelque chose..."
          rows={1}
          disabled={loading}
          style={{ flex: 1, fontSize: 14, lineHeight: 1.5, resize: 'none', borderRadius: 12, maxHeight: 80, overflow: 'auto', padding: '9px 12px', background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)' }}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          style={{ width: 38, height: 38, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: !input.trim() || loading ? 'rgba(56,189,248,.2)' : 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
          <Send size={16} color={!input.trim() || loading ? 'var(--muted)' : '#fff'} />
        </button>
      </div>
    </div>
  )
}
