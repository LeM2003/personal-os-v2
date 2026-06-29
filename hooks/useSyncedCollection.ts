"use client"

import { useEffect, useRef } from 'react'
import { useLS } from './useLocalStorage'
import { createClient } from '@/lib/supabase/client'
import { reportError } from '@/lib/reportError'

/**
 * Moteur de synchronisation unifié localStorage ⇄ Supabase.
 *
 * Un seul mécanisme robuste pour TOUTES les collections (tasks, folders, projects,
 * expenses, exams, …). Remplace le pattern dupliqué et fragile des contextes.
 *
 * Garanties :
 *  - PULL au mount : si l'user est connecté, Supabase fait autorité (sinon localStorage).
 *  - PUSH différentiel debounced : upsert des présents + DELETE de ce qui a disparu localement.
 *    → règle d'un coup : suppression propagée ET vidage complet possible.
 *  - Anti-race : aucun push n'est émis avant la fin de l'hydratation (ref `hydrated`).
 *  - Offline-safe : toute erreur (réseau ou réponse Postgrest) est reportée via Sentry
 *    (`reportError`) mais n'interrompt jamais le flux — localStorage reste la source locale.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

interface SyncConfig<T> {
  storageKey: string
  table: string
  toRow: (item: T, userId: string) => Row
  fromRow: (row: Row) => T
  getId: (item: T) => string
  defaultValue: T[]
  orderBy?: { column: string; ascending?: boolean }
  debounceMs?: number
}

export function useSyncedCollection<T>(
  config: SyncConfig<T>,
): [T[], (v: T[] | ((prev: T[]) => T[])) => void] {
  const [items, setItems] = useLS<T[]>(config.storageKey, config.defaultValue)

  const hydrated   = useRef(false)              // true une fois le pull initial terminé
  const remoteIds  = useRef<Set<string>>(new Set()) // IDs connus côté Supabase
  const pushTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const itemsRef   = useRef(items)
  itemsRef.current = items

  // ── PULL : Supabase fait autorité (au démarrage + à chaque connexion) ──
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function pull(user: any) {
      if (!user) { hydrated.current = true; return }
      try {
        let query = supabase.from(config.table).select('*').eq('user_id', user.id)
        if (config.orderBy) {
          query = query.order(config.orderBy.column, { ascending: config.orderBy.ascending ?? true })
        }
        const { data, error } = await query
        if (error) { reportError('sync.pull', error, { table: config.table }); return }
        if (cancelled || !data) return
        const serverIds = new Set(data.map(r => r.id as string))
        remoteIds.current = serverIds
        // MERGE (pas d'écrasement) : le serveur fait autorité sur les IDs qu'il
        // connaît, mais on PRÉSERVE les éléments locaux absents du serveur — typiquement
        // ceux créés hors-ligne et pas encore poussés. Un simple setItems(serverData)
        // les détruisait au pull suivant la reconnexion (cause racine du "plus de tâches").
        // Ils seront upsertés au prochain push (remoteIds = serverIds → aucun DELETE diff).
        const serverItems = data.map(config.fromRow)
        const localOnly = itemsRef.current.filter(i => !serverIds.has(config.getId(i)))
        setItems([...serverItems, ...localOnly])
      } catch (err) {
        reportError('sync.pull.exception', err, { table: config.table })
      } finally {
        if (!cancelled) hydrated.current = true
      }
    }

    // Pull initial
    supabase.auth.getUser().then(({ data: { user } }) => pull(user))

    // Re-pull à la connexion (cas : login en cours de session, nouvel appareil)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) pull(session.user)
    })

    return () => { cancelled = true; subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── PUSH différentiel debounced ──
  useEffect(() => {
    if (!hydrated.current) return            // jamais pusher avant la fin du pull
    if (pushTimer.current) clearTimeout(pushTimer.current)

    pushTimer.current = setTimeout(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const current = itemsRef.current
        const currentIds = new Set(current.map(config.getId))

        // 1) upsert des éléments présents
        if (current.length > 0) {
          const { error: upsertError } = await supabase.from(config.table)
            .upsert(current.map(i => config.toRow(i, user.id)), { onConflict: 'id' })
          if (upsertError) { reportError('sync.push.upsert', upsertError, { table: config.table }); return }
        }

        // 2) DELETE différentiel : ce qui était en base mais n'existe plus localement
        const toDelete = [...remoteIds.current].filter(id => !currentIds.has(id))
        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase.from(config.table).delete().in('id', toDelete).eq('user_id', user.id)
          if (deleteError) { reportError('sync.push.delete', deleteError, { table: config.table }); return }
        }

        // 3) la base reflète maintenant l'état local
        remoteIds.current = currentIds
      } catch (err) {
        reportError('sync.push.exception', err, { table: config.table })
      }
    }, config.debounceMs ?? 2500)

    return () => { if (pushTimer.current) clearTimeout(pushTimer.current) }
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps

  return [items, setItems]
}
