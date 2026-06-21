"use client"

import { useState } from 'react'
import { Wallet, Repeat, HandCoins, PiggyBank } from 'lucide-react'
import Depenses from './Expenses'
import Abonnements from './Subscriptions'
import Dettes from './Debts'
import Epargne from './Savings'
import PageHeader from '../shared/PageHeader'
import StatCard from '../shared/StatCard'
import { useApp } from '../../context/AppContext'
import { todayISO } from '../../utils/dates'
import { computeNextRenewal } from '../../utils/subscriptions'

function fmtFCFA(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} F`
}

// Vue d'ensemble : avant, il fallait ouvrir les 4 onglets un par un pour savoir
// où on en est financièrement — ces 4 chiffres donnent la photo globale d'un coup d'œil.
function FinanceOverview() {
  const { expenses, subscriptions, debts, savings } = useApp()
  const now = todayISO()
  const monthKey = now.slice(0, 7)

  const monthExpenses = expenses
    .filter(e => (e.date || '').startsWith(monthKey))
    .reduce((s, e) => s + e.amount, 0)

  const debtIOwe = debts
    .filter(d => !d.paid && d.direction === 'je_dois')
    .reduce((s, d) => s + d.amount, 0)
  const debtOwedToMe = debts
    .filter(d => !d.paid && d.direction === 'on_me_doit')
    .reduce((s, d) => s + d.amount, 0)

  const totalSavings = savings.reduce((s, g) => s + g.current, 0)

  const nextSub = subscriptions
    .map(s => ({ ...s, _next: s.nextRenewal || computeNextRenewal(s.startDate || now, s.cycle || 'Mensuel') }))
    .filter(s => s._next >= now)
    .sort((a, b) => a._next.localeCompare(b._next))[0]

  return (
    <div className="grid-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
      <StatCard icon={<Wallet size={18} />} value={fmtFCFA(monthExpenses)} label="Dépensé ce mois" color="#f59e0b" />
      <StatCard icon={<HandCoins size={18} />}
        value={debtIOwe > 0 ? fmtFCFA(debtIOwe) : debtOwedToMe > 0 ? `+${fmtFCFA(debtOwedToMe)}` : '0 F'}
        label={debtIOwe > 0 ? 'Tu dois' : debtOwedToMe > 0 ? 'On te doit' : 'Aucune dette'}
        color={debtIOwe > 0 ? '#f87171' : '#4ade80'} />
      <StatCard icon={<PiggyBank size={18} />} value={fmtFCFA(totalSavings)} label="Épargné au total" color="#5B8DBF" />
      <StatCard icon={<Repeat size={18} />}
        value={nextSub ? fmtFCFA(nextSub.amount) : '—'}
        label={nextSub ? `${nextSub.name} bientôt` : 'Pas d\'abonnement'}
        color="#818cf8" />
    </div>
  )
}

export default function Finances() {
  const [sub, setSub] = useState('depenses')

  const tabs = [
    { id: 'depenses',    label: 'Dépenses',    icon: Wallet },
    { id: 'abonnements', label: 'Abonnements', icon: Repeat },
    { id: 'dettes',      label: 'Dettes',      icon: HandCoins },
    { id: 'epargne',     label: 'Épargne',     icon: PiggyBank },
  ]

  return (
    <div>
      <PageHeader title="Finances" sub="Dépenses, abonnements, dettes, épargne" />
      <FinanceOverview />
      <div className="subtab-bar" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              className={`subtab${sub === t.id ? ' active' : ''}`}
              onClick={() => setSub(t.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>
      {sub === 'depenses'    && <Depenses />}
      {sub === 'abonnements' && <Abonnements />}
      {sub === 'dettes'      && <Dettes />}
      {sub === 'epargne'     && <Epargne />}
    </div>
  )
}
