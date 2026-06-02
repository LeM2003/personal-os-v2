"use client"

import { createContext, useContext, useEffect, useRef } from 'react'
import type { Expense, Subscription, Debt, SavingsEntry, Budgets } from '@/types'
import { useLS } from '@/hooks/useLocalStorage'
import { createClient } from '@/lib/supabase/client'
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
  const [expenses,      setExpenses]      = useLS<Expense[]>('pos_expenses',           [])
  const [subscriptions, setSubscriptions] = useLS<Subscription[]>('pos_subscriptions', [])
  const [debts,         setDebts]         = useLS<Debt[]>('pos_debts',                 [])
  const [savings,       setSavings]       = useLS<SavingsEntry[]>('pos_savings',       [])
  const [budgets,       setBudgets]       = useLS<Budgets>('pos_budgets',               {})
  const [objectif,      setObjectif]      = useLS<string>('pos_objectif',              '')

  /* ── Supabase sync : expenses (pull au mount + push debounced) ── */
  const isHydrating = useRef(false)
  const pushTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function hydrate() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        isHydrating.current = true
        const { data } = await supabase
          .from('expenses').select('*').eq('user_id', user.id).order('occurred_at', { ascending: false })
        if (data && data.length > 0) setExpenses(data.map(rowToExpense))
        setTimeout(() => { isHydrating.current = false }, 200)
      } catch { /* offline — localStorage persiste */ }
    }
    hydrate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isHydrating.current) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || expenses.length === 0) return
        await supabase.from('expenses').upsert(expenses.map(e => expenseToRow(e, user.id)), { onConflict: 'id' })
      } catch { /* offline */ }
    }, 3000)
  }, [expenses]) // eslint-disable-line react-hooks/exhaustive-deps

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
