"use client"

import { useState } from 'react'
import { Trash2, Check, RotateCcw, HandCoins, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { genId, todayISO, fmtDate } from '../../utils/dates'
import StatCard from '../shared/StatCard'
import EmptyState from '../shared/EmptyState'

const blank = { person: '', amount: '', direction: 'je_dois', date: todayISO(), note: '' }

export default function Dettes() {
  const { debts, setDebts } = useApp()
  const [form, setForm] = useState(blank)
  const [filter, setFilter] = useState('actives')

  const add = () => {
    if (!form.person.trim() || !form.amount) return
    setDebts(p => [...p, { ...form, amount: +form.amount, id: genId(), paid: false, paidAt: null }])
    setForm({ ...blank, date: todayISO() })
  }

  const togglePaid = (id) => setDebts(p => p.map(d => d.id === id
    ? { ...d, paid: !d.paid, paidAt: !d.paid ? todayISO() : null }
    : d
  ))
  const del = (id) => setDebts(p => p.filter(d => d.id !== id))

  const actives = debts.filter(d => !d.paid)
  const jeDoisTotal   = actives.filter(d => d.direction === 'je_dois').reduce((s, d) => s + d.amount, 0)
  const onMeDoitTotal = actives.filter(d => d.direction === 'on_me_doit').reduce((s, d) => s + d.amount, 0)
  const net = onMeDoitTotal - jeDoisTotal

  const shown = debts
    .filter(d => filter === 'toutes' ? true : filter === 'actives' ? !d.paid : d.paid)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="page-enter">
      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <StatCard icon={<ArrowUpRight size={22} />}   value={`${jeDoisTotal.toLocaleString()} F`}   label="Je dois"    color="#f87171" />
        <StatCard icon={<ArrowDownLeft size={22} />}  value={`${onMeDoitTotal.toLocaleString()} F`} label="On me doit" color="#4ade80" />
        <StatCard icon={<HandCoins size={22} />}      value={`${net.toLocaleString()} F`}           label="Solde net"  color={net >= 0 ? '#4ade80' : '#f87171'} />
      </div>

      {/* Formulaire ajout */}
      <div className="card" style={{ padding: 18, marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Noter une dette</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <input placeholder="Nom de la personne" value={form.person} onChange={e => setForm({ ...form, person: e.target.value })} />
          <input type="number" placeholder="Montant (F)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <select value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}>
            <option value="je_dois">Je dois à cette personne</option>
            <option value="on_me_doit">Cette personne me doit</option>
          </select>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <input placeholder="Note (optionnel — pourquoi, quand rembourser...)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ marginBottom: 12 }} />
        <button className="btn-gold" onClick={add} disabled={!form.person.trim() || !form.amount}>Ajouter</button>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['actives', 'En cours'], ['toutes', 'Toutes'], ['payees', 'Réglées']].map(([k, label]) => (
          <button key={k} className={`filter-pill${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>

      {/* Liste */}
      {shown.length === 0 ? (
        <EmptyState
          icon={<HandCoins size={42} />}
          msg={filter === 'payees' ? "Rien de réglé pour l'instant." : "Pas de dette. C'est sain."}
          sub={filter === 'actives' ? 'Tant mieux — ou note celles à suivre ci-dessus.' : null}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="stagger">
          {shown.map(d => {
            const isDebt = d.direction === 'je_dois'
            const color = isDebt ? '#f87171' : '#4ade80'
            return (
              <div key={d.id} className="card" style={{
                padding: '12px 14px',
                borderLeft: `3px solid ${color}`,
                opacity: d.paid ? 0.55 : 1,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14, textDecoration: d.paid ? 'line-through' : 'none' }}>{d.person}</strong>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {isDebt ? 'Je dois' : 'Me doit'} · {fmtDate(d.date)}
                    </span>
                  </div>
                  {d.note && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{d.note}</div>}
                </div>
                <div style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 16, color, whiteSpace: 'nowrap' }}>
                  {d.amount.toLocaleString()} F
                </div>
                <button className="btn-icon" onClick={() => togglePaid(d.id)} title={d.paid ? 'Rouvrir' : 'Marquer réglée'}>
                  {d.paid ? <RotateCcw size={14} /> : <Check size={14} />}
                </button>
                <button className="btn-icon" onClick={() => del(d.id)} title="Supprimer">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
