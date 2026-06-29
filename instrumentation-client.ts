import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // Replay : enregistre les sessions où une erreur survient (utile pour comprendre ce que l'utilisateur faisait)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,

  // Pas d'envoi en local
  enabled: process.env.NODE_ENV === 'production',

  // Filtre les erreurs qu'on ne veut pas voir (extensions navigateur, etc.)
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'top.GLOBALS',
    // Pannes réseau attendues (hors-ligne) remontées par le moteur de sync —
    // pas des bugs, juste l'utilisateur sans connexion.
    'Failed to fetch',
    'NetworkError',
    'Load failed',
  ],

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
