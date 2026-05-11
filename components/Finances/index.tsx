// @ts-nocheck — migration TypeScript en attente
"use client"

import { useState } from 'react'
import { Wallet, Repeat, HandCoins, PiggyBank } from 'lucide-react'
import Depenses from './Expenses'
import Abonnements from './Subscriptions'
import Dettes from './Debts'
import Epargne from './Savings'
import PageHeader from '../shared/PageHeader'

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
