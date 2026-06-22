import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% des traces en prod, 0% en dev (pour ne pas saturer)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // Ne pas envoyer les erreurs en local (juste les afficher)
  enabled: process.env.NODE_ENV === 'production',

  debug: false,
})
