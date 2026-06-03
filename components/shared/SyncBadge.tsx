"use client"

import { useEffect, useState } from 'react'
import { Cloud, CloudOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Badge discret indiquant l'état de synchronisation des données.
 *  - Connecté + online → "Synchronisé" (cloud)
 *  - Hors ligne → "Hors ligne" (cloud barré) : données en local, re-sync auto au retour
 *  - Non connecté → rien (mode local pur, pas de promesse de sync)
 */
export default function SyncBadge() {
  const [online, setOnline] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    setOnline(navigator.onLine)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) =>
      setAuthed(!!session?.user))

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      subscription.unsubscribe()
    }
  }, [])

  if (!authed) return null // mode local pur — pas de badge trompeur

  const offline = !online
  return (
    <span title={offline
      ? 'Hors ligne — tes données sont sauvegardées localement et se synchroniseront au retour du réseau.'
      : 'Synchronisé — tes données sont sauvegardées en ligne.'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
        background: offline ? 'rgba(248,113,113,.1)' : 'rgba(74,222,128,.1)',
        border: `1px solid ${offline ? 'rgba(248,113,113,.25)' : 'rgba(74,222,128,.25)'}`,
        color: offline ? '#f87171' : '#4ade80',
        whiteSpace: 'nowrap',
      }}>
      {offline ? <CloudOff size={12} /> : <Cloud size={12} />}
      {offline ? 'Hors ligne' : 'Synchronisé'}
    </span>
  )
}
