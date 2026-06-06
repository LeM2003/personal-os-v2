"use client"

import { createContext, useContext } from 'react'
import type { Expense, Subscription, Debt, SavingsEntry, Budgets } from '@/types'
import { useLS } from '@/hooks/useLocalStorage'
import { useSyncedCollection } from '@/hooks/useSyncedCollection'
import { expenseToRow, rowToExpense } from '@/lib/supabase/mappers'

interface FinanceContextValue {
  expenses: Expense[]
  setExpenses: (v: Expense[] | ((prev: Expense[]) => Expense[])) => void
  subscriptions: Subscription[]
  setSubscriptions: (v: Subscription[] | ((prev: Subscription[]) => Subscription[])) => void
  debts: Debt[]
  setDebts: (v: Debt[] | ((prev: Debt[]) => Debt[])) => void
  savings: SavingsEntry[]
  setSavings: (v: SavingsEntry[] | ((prev: SavingsEntry[]) => SavingsEntry[])) => void
  budgets: Budgets
  setBudgets: (v: Budgets | ((prev: Budgets) => Budgets)) => void
  objectif: string
  setObjectif: (v: string | ((prev: string) => string)) => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  // Dépenses synchronisées via le moteur unifié (delete + vidage gérés automatiquement)
  const [expenses, setExpenses] = useSyncedCollection<Expense>({
    storageKey: 'pos_expenses', table: 'expenses', toRow: expenseToRow, fromRow: rowToExpense,
    getId: e => e.id, defaultValue: [], orderBy: { column: 'occurred_at', ascending: false },
  })
  const [subscriptions, setSubscriptions] = useLS<Subscription[]>('pos_subscriptions', [])
  const [debts,         setDebts]         = useLS<Debt[]>('pos_debts',                 [])
  const [savings,       setSavings]       = useLS<SavingsEntry[]>('pos_savings',       [])
  const [budgets,       setBudgets]       = useLS<Budgets>('pos_budgets',               {})
  const [objectif,      setObjectif]      = useLS<string>('pos_objectif',              '')

  return (
    <FinanceContext.Provider value={{ expenses, setExpenses, subscriptions, setSubscriptions, debts, setDebts, savings, setSavings, budgets, setBudgets, objectif, setObjectif }}>
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinanceContext(): FinanceContextValue {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinanceContext doit être utilisé dans <FinanceProvider>')
  return ctx
}
