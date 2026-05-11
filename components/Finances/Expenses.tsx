// @ts-nocheck — migration TypeScript en attente
"use client"

import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { genId, todayISO, fmtDate, fmtMonth } from '../../utils/dates'
import { CAT_COLORS } from '../../utils/constants'
import EmptyState from '../shared/EmptyState'
import SegmentedControl from '../shared/SegmentedControl'
import AbstractMark from '../shared/AbstractMark'
import BottomSheet from '../shared/BottomSheet'

const CATS = ['Alimentation', 'Transport', 'Télécom', 'Santé', 'Business', 'École', 'Loisirs', 'Autre']

function DonutChart({ data, total, size = 140 }) {
  if (total === 0 || !data.some(d => d.value > 0)) return null
  const cx = size / 2, cy = size / 2
  const r = size * 0.40, ir = size * 0.26
  const polarXY = (angle, radius) => ({
    x: cx + radius * Math.cos((angle - 90) * Math.PI / 180),
    y: cy + radius * Math.sin((angle - 90) * Math.PI / 180),
  })
  let start = 0
  const segments = data.filter(d => d.value > 0).map(d => {
    const angle = (d.value / total) * 360
    const s = { ...d, start, angle }
    start += angle
    return s
  })
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {segments.map((seg, i) => {
        const s = polarXY(seg.start, r), e = polarXY(seg.start + seg.angle, r)
        const is = polarXY(seg.start + seg.angle, ir), ie = polarXY(seg.start, ir)
        const large = seg.angle > 180 ? 1 : 0
        return (
          <path key={i} d={`M${s.x},${s.y} A${r},${r} 0 ${large} 1 ${e.x},${e.y} L${is.x},${is.y} A${ir},${ir} 0 ${large} 0 ${ie.x},${ie.y} Z`}
            fill={seg.color} opacity={0.9} />
        )
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 13, fontWeight: 800, fill: 'var(--text)', fontFamily: 'var(--font-fraunces, Fraunces)' }}>
        {total >= 1000 ? `${Math.round(total/1000)}K` : total.toLocaleString('fr-FR')}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--muted)' }}>FCFA</text>
    </svg>
  )
}

export default function Depenses() {
  const { expenses, setExpenses, budgets, setBudgets, financeFormOpen, setFinanceFormOpen } = useApp()
  const showForm = financeFormOpen
  const setShowForm = setFinanceFormOpen
  const [editBudget, setEditBudget] = useState(false)
  const [budgetDraft, setBudgetDraft] = useState({})
  const blank = { amount: '', category: 'Alimentation', date: todayISO(), type: 'Variable', note: '' }
  const [form, setForm] = useState(blank)
  const [editingId, setEditingId] = useState(null)
  const [fPeriod, setFPeriod] = useState('Mois')
  const [heroPeriod, setHeroPeriod] = useState('month')
  const [visibleCount, setVisibleCount] = useState(20)
  const [selYear, setSelYear] = useState(new Date().getFullYear())
  const [selMonth, setSelMonth] = useState(new Date().getMonth())

  const openEdit = exp => {
    setEditingId(exp.id)
    setForm({ amount: String(exp.amount), category: exp.category, date: exp.date, type: exp.type, note: exp.note || '' })
    setShowForm(true)
  }
  const closeForm = () => { setEditingId(null); setForm({ ...blank, date: todayISO() }); setShowForm(false) }

  const add = () => {
    if (!form.amount) return
    if (editingId) {
      setExpenses(p => p.map(e => e.id === editingId ? { ...e, ...form, amount: +form.amount } : e))
      closeForm()
    } else {
      setExpenses(p => [...p, { ...form, amount: +form.amount, id: genId() }])
      setForm({ ...blank, date: todayISO() })
    }
  }

  const now = todayISO()
  const weekAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] })()
  const currentMonthStart = (() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] })()
  // Selected month boundaries for navigation
  const selMonthStart = new Date(selYear, selMonth, 1).toISOString().split('T')[0]
  const selMonthEnd   = new Date(selYear, selMonth + 1, 0).toISOString().split('T')[0]
  const isCurrentMonth = selYear === new Date().getFullYear() && selMonth === new Date().getMonth()
  // monthStart used for budget calculations = current month
  const monthStart = currentMonthStart

  const todayTotal = expenses.filter(e => e.date === now).reduce((s, e) => s + e.amount, 0)
  const weekTotal  = expenses.filter(e => e.date >= weekAgo).reduce((s, e) => s + e.amount, 0)
  const monthTotal = expenses.filter(e => e.date >= monthStart).reduce((s, e) => s + e.amount, 0)

  const catTotals = {}
  CATS.forEach(c => { catTotals[c] = expenses.filter(e => e.date >= monthStart && e.category === c).reduce((s, x) => s + x.amount, 0) })
  const maxVal = Math.max(...Object.values(catTotals), 1)

  const totalBudget = CATS.reduce((s, c) => s + (budgets[c] || 0), 0)
  const totalDepenses = monthTotal
  const budgetRestant = totalBudget - totalDepenses
  const hasBudgets = CATS.some(c => budgets[c] > 0)

  const openBudgetEdit = () => {
    setBudgetDraft(Object.fromEntries(CATS.map(c => [c, budgets[c] || ''])))
    setEditBudget(true)
  }
  const saveBudgets = () => {
    const cleaned = Object.fromEntries(Object.entries(budgetDraft).map(([k, v]) => [k, v === '' ? 0 : +v]))
    setBudgets(cleaned)
    setEditBudget(false)
  }

  const budgetBarColor = (pct) => {
    if (pct >= 100) return '#f87171'
    if (pct >= 80)  return '#f97316'
    if (pct >= 60)  return '#5B8DBF'
    return '#4ade80'
  }

  const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date))

  const prevMonth = () => {
    if (selMonth === 0) { setSelMonth(11); setSelYear(y => y - 1) }
    else setSelMonth(m => m - 1)
    setVisibleCount(20)
  }
  const nextMonth = () => {
    if (isCurrentMonth) return
    if (selMonth === 11) { setSelMonth(0); setSelYear(y => y + 1) }
    else setSelMonth(m => m + 1)
    setVisibleCount(20)
  }
  const goCurrentMonth = () => {
    setSelYear(new Date().getFullYear())
    setSelMonth(new Date().getMonth())
    setVisibleCount(20)
  }

  // Period filter for history
  const filteredHistory = sorted.filter(e => {
    if (fPeriod === 'Tout') return true
    if (fPeriod === "Aujourd'hui") return e.date === now
    if (fPeriod === '7 jours') return e.date >= weekAgo
    if (fPeriod === 'Mois') return e.date >= selMonthStart && e.date <= selMonthEnd
    return true
  })
  const filteredTotal = filteredHistory.reduce((s, e) => s + e.amount, 0)
  const hasMore = visibleCount < filteredHistory.length

  return (
    <div>
      {/* ── Hero dépenses — 1 carte + SegmentedControl ── */}
      {(() => {
        const heroValue = heroPeriod === 'day' ? todayTotal : heroPeriod === 'week' ? weekTotal : monthTotal
        const heroLabel = heroPeriod === 'day' ? "Aujourd'hui"
          : heroPeriod === 'week' ? '7 derniers jours'
          : 'Ce mois-ci'
        const heroCount = heroPeriod === 'day'
          ? expenses.filter(e => e.date === now).length
          : heroPeriod === 'week'
          ? expenses.filter(e => e.date >= weekAgo).length
          : expenses.filter(e => e.date >= monthStart).length
        return (
          <div className="card" style={{
            padding: '20px 22px', marginBottom: 20,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -14, top: -14, opacity: 0.35, pointerEvents: 'none' }}>
              <AbstractMark variant="stack" tone="accent" size={110} />
            </div>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <SegmentedControl value={heroPeriod} onChange={setHeroPeriod} size="sm"
                options={[
                  { value: 'day',   label: "Aujourd'hui" },
                  { value: 'week',  label: '7 jours' },
                  { value: 'month', label: 'Mois' },
                ]} />
            </div>
            <p style={{
              fontSize: 10.5, fontWeight: 700, color: 'var(--muted)',
              letterSpacing: 1.1, textTransform: 'uppercase',
              margin: '0 0 6px', position: 'relative',
            }}>Dépensé · {heroLabel}</p>
            <div style={{
              fontFamily: 'Fraunces', fontSize: 40, fontWeight: 700,
              letterSpacing: '-1.5px', lineHeight: 1, color: 'var(--text)',
              position: 'relative',
            }}>
              {heroValue.toLocaleString('fr-FR')}
              <span style={{ fontSize: 18, color: 'var(--muted)', marginLeft: 6, fontWeight: 600 }}>FCFA</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '8px 0 0', position: 'relative' }}>
              {heroCount === 0 ? 'Aucune entrée sur cette période.'
                : `${heroCount} entrée${heroCount > 1 ? 's' : ''} sur la période.`}
            </p>
          </div>
        )
      })()}

      {/* Résumé budget global */}
      {hasBudgets && (
        <div className="card" style={{ padding: 20, marginBottom: 20,
          border: `1px solid ${budgetRestant < 0 ? 'rgba(248,113,113,.3)' : budgetRestant < totalBudget * 0.2 ? 'rgba(249,115,22,.3)' : 'rgba(74,222,128,.2)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8 }}>
              📊 Budget du mois
            </p>
            <span style={{ fontSize: 22, fontWeight: 800,
              color: budgetRestant < 0 ? '#f87171' : budgetRestant < totalBudget * 0.2 ? '#f97316' : '#4ade80' }}>
              {budgetRestant >= 0 ? `${budgetRestant.toLocaleString('fr-FR')} FCFA restants` : `⚠️ Dépassé de ${Math.abs(budgetRestant).toLocaleString('fr-FR')} FCFA`}
            </span>
          </div>
          <div style={{ background: 'var(--bar-bg)', borderRadius: 999, height: 8, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{
              height: '100%', borderRadius: 999, transition: 'width .5s ease',
              background: budgetBarColor(Math.round((totalDepenses / totalBudget) * 100)),
              width: `${Math.min((totalDepenses / totalBudget) * 100, 100)}%`
            }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            {totalDepenses.toLocaleString('fr-FR')} / {totalBudget.toLocaleString('fr-FR')} FCFA dépensés
            ({Math.round((totalDepenses / totalBudget) * 100)}%)
          </p>
        </div>
      )}

      {/* ── Catégories + Donut ── */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <p style={{ fontFamily: 'var(--font-fraunces, Fraunces)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, margin: 0 }}>
            Répartition ce mois
          </p>
          {!editBudget
            ? <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={openBudgetEdit}>
                ✏️ {hasBudgets ? 'Budgets' : 'Définir budgets'}
              </button>
            : <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn-gold" style={{ fontSize: 11, padding: '4px 10px' }} onClick={saveBudgets}>Enregistrer</button>
                <button className="btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setEditBudget(false)}>Annuler</button>
              </div>
          }
        </div>

        {editBudget ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Budget mensuel par catégorie (0 = pas de limite)</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="grid-2">
              {CATS.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: CAT_COLORS[cat], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 80, flexShrink: 0 }}>{cat}</span>
                  <input type="number" min={0} step={500} value={budgetDraft[cat] ?? ''}
                    onChange={e => setBudgetDraft({ ...budgetDraft, [cat]: e.target.value })}
                    placeholder="FCFA" style={{ flex: 1, fontSize: 12 }} />
                </div>
              ))}
            </div>
          </div>
        ) : CATS.filter(c => catTotals[c] > 0 || budgets[c] > 0).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>💰</p>
            <p>Aucune dépense ce mois. Commence à enregistrer.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Donut */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <DonutChart
                size={130}
                total={monthTotal}
                data={CATS.filter(c => catTotals[c] > 0).map(c => ({ value: catTotals[c], color: CAT_COLORS[c], label: c }))}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 150 }}>
                {CATS.filter(c => catTotals[c] > 0).map(c => (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[c] }} />
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Barres */}
            <div style={{ flex: 1, minWidth: 180 }}>
              {CATS.map(cat => {
                const spent = catTotals[cat]
                const budget = budgets[cat] || 0
                if (spent === 0 && budget === 0) return null
                const pct = budget > 0 ? Math.round((spent / budget) * 100) : null
                const barColor = pct !== null ? budgetBarColor(pct) : CAT_COLORS[cat]
                const barWidth = budget > 0 ? `${Math.min((spent / budget) * 100, 100)}%` : `${(spent / maxVal) * 100}%`
                return (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                      <span style={{ fontSize: 12, color: CAT_COLORS[cat], fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[cat] }} />
                        {cat}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {spent.toLocaleString('fr-FR')}{budget > 0 && ` / ${budget.toLocaleString('fr-FR')}`}
                        {pct !== null && <span style={{ marginLeft: 5, fontWeight: 700, color: barColor }}>{pct}%</span>}
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: barWidth, background: barColor, boxShadow: `0 0 8px ${barColor}40` }} />
                    </div>
                    {pct !== null && pct >= 100 && <p style={{ fontSize: 10, color: '#f87171', marginTop: 2 }}>⚠️ Budget dépassé</p>}
                    {pct !== null && pct >= 80 && pct < 100 && <p style={{ fontSize: 10, color: '#f97316', marginTop: 2 }}>Attention — {(budget-spent).toLocaleString('fr-FR')} FCFA restants</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── BottomSheet Formulaire ── */}
      <BottomSheet open={showForm} onClose={closeForm} title={editingId ? '✏️ Modifier' : '+ Ajouter une dépense'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
            placeholder="Montant en FCFA *" min={0} autoFocus />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {CATS.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="Variable">Variable</option>
              <option value="Fixe">Fixe</option>
            </select>
          </div>
          <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Note (optionnel)" />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn-gold" onClick={add} style={{ flex: 1 }}>
              {editingId ? 'Enregistrer' : 'Ajouter'}
            </button>
            <button className="btn-ghost" onClick={closeForm}>Annuler</button>
          </div>
        </div>
      </BottomSheet>

      {/* History */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
          <p style={{ fontFamily: 'Fraunces', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: .8, margin: 0 }}>
            Historique
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {["Aujourd'hui", '7 jours', 'Mois', 'Tout'].map(p => (
              <button key={p} className={`filter-pill${fPeriod === p ? ' active' : ''}`}
                onClick={() => { setFPeriod(p); setVisibleCount(20) }}>{p}</button>
            ))}
          </div>
        </div>

        {/* Month navigator (visible when "Mois" is selected) */}
        {fPeriod === 'Mois' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
            <button className="btn-icon" onClick={prevMonth}
              style={{ fontSize: 14, padding: '2px 8px' }} aria-label="Mois précédent">←</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: isCurrentMonth ? '#5B8DBF' : 'var(--text)',
              textTransform: 'capitalize', minWidth: 140, textAlign: 'center' }}>
              {fmtMonth(selYear, selMonth)}
            </span>
            <button className="btn-icon" onClick={nextMonth} disabled={isCurrentMonth}
              style={{ fontSize: 14, padding: '2px 8px', opacity: isCurrentMonth ? .3 : 1 }} aria-label="Mois suivant">→</button>
            {!isCurrentMonth && (
              <button className="btn-ghost" onClick={goCurrentMonth}
                style={{ fontSize: 10, padding: '3px 8px' }}>Ce mois</button>
            )}
          </div>
        )}

        {/* Compteur filtre */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
          padding: '8px 12px', background: 'rgba(91,141,191,.05)', borderRadius: 8, border: '1px solid rgba(91,141,191,.15)' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {filteredHistory.length} depense{filteredHistory.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#5B8DBF' }}>
            {filteredTotal.toLocaleString('fr-FR')} FCFA
          </span>
        </div>

        {filteredHistory.length === 0 ? <EmptyState mark="stack" tone="muted" title="Rien sur cette période." /> : (
          <>
            {filteredHistory.slice(0, visibleCount).map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: '1px solid var(--border)',
                background: editingId === e.id ? 'rgba(91,141,191,.04)' : undefined,
                borderRadius: editingId === e.id ? 6 : undefined }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: CAT_COLORS[e.category] || '#6b7280', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14 }}>{e.note || e.category}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>{fmtDate(e.date)} · {e.category} · {e.type}</p>
                </div>
                <span style={{ fontWeight: 700, color: '#5B8DBF', whiteSpace: 'nowrap', fontSize: 14 }}>
                  {e.amount.toLocaleString('fr-FR')} FCFA
                </span>
                <button className="btn-icon" title="Modifier" onClick={() => openEdit(e)}
                  style={{ color: editingId === e.id ? '#5B8DBF' : undefined }}>✏️</button>
                <button className="btn-icon" onClick={() => setExpenses(p => p.filter(x => x.id !== e.id))} aria-label="Supprimer la dépense">✕</button>
              </div>
            ))}
            {hasMore && (
              <button className="btn-ghost" onClick={() => setVisibleCount(v => v + 20)}
                style={{ width: '100%', marginTop: 14, fontSize: 13, padding: '10px 16px' }}>
                Charger plus ({filteredHistory.length - visibleCount} restantes)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
