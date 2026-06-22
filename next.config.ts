import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Org & project Sentry
  org: 'le-m',
  project: 'personal-os-v2',

  // Auth token chargé depuis l'env (ne JAMAIS commiter)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Silencieux en local, verbeux en CI
  silent: !process.env.CI,

  // Upload source maps automatique pour des stack traces lisibles
  widenClientFileUpload: true,

  // Tunneling pour bypasser les bloqueurs de pub (les erreurs sont quand même remontées)
  tunnelRoute: '/monitoring',
});
