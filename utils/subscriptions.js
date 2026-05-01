import { todayISO } from './dates'

export const advanceCycle = (dateISO, cycle) => {
  const d = new Date(dateISO + 'T00:00:00')
  if (cycle === 'Mensuel')          d.setMonth(d.getMonth() + 1)
  else if (cycle === 'Trimestriel') d.setMonth(d.getMonth() + 3)
  else if (cycle === 'Annuel')      d.setFullYear(d.getFullYear() + 1)
  else if (cycle === 'Hebdomadaire') d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

export const computeNextRenewal = (startDate, cycle) => {
  if (!startDate) return ''
  let cur = startDate
  const now = todayISO()
  let safety = 0
  while (cur <= now && safety < 200) { cur = advanceCycle(cur, cycle); safety++ }
  return cur
}

export const monthlyEquiv = (amount, cycle) => {
  if (cycle === 'Annuel')       return amount / 12
  if (cycle === 'Trimestriel')  return amount / 3
  if (cycle === 'Hebdomadaire') return amount * 4.33
  return amount
}
