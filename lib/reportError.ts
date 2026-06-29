import * as Sentry from '@sentry/nextjs'

/**
 * Point unique pour les erreurs jusqu'ici avalées en silence par les try/catch
 * "offline-safe" du moteur de sync. Les vraies pannes réseau (hors-ligne) sont
 * filtrées côté Sentry via `ignoreErrors` (instrumentation-client.ts) — donc on
 * peut reporter sans condition ici sans noyer le quota.
 */
export function reportError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(`[${context}]`, error, extra)
  }
  Sentry.captureException(error, { tags: { context }, extra })
}
