"use client"

import { useState, useCallback } from 'react'

let storageWarned = false

export function useLS<T>(key: string, def: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key)
      return s !== null ? (JSON.parse(s) as T) : def
    } catch { return def }
  })

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setVal(prev => {
      const next = typeof v === 'function' ? (v as (prev: T) => T)(prev) : v
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch (err) {
        if (!storageWarned) {
          storageWarned = true
          console.error('[Personal OS] localStorage plein ou indisponible:', err)
          alert('⚠️ Stockage plein — tes données ne sont peut-être pas sauvegardées. Exporte une backup depuis la sidebar.')
        }
      }
      return next
    })
  }, [key])

  return [val, set]
}
