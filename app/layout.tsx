import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { DM_Sans, Fraunces } from 'next/font/google'
import SwRegister from '@/components/shared/SwRegister'
import UpdateBanner from '@/components/shared/UpdateBanner'
import WhatsNew from '@/components/shared/WhatsNew'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const SITE_URL = 'https://personal-os.click'
const TITLE = 'Personal OS — Toute ta vie, organisée. Une seule app.'
const DESCRIPTION =
  'Tâches, budget en FCFA, école, projets, habitudes — tout au même endroit. ' +
  'Gratuit, hors ligne, prêt en 30 secondes. Pensé pour les étudiants et entrepreneurs.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s · Personal OS' },
  description: DESCRIPTION,
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Personal OS' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Personal OS',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export const viewport: Viewport = {
  themeColor: '#0B1220',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark">
      <body className={`${dmSans.variable} ${fraunces.variable}`}>
        <SwRegister />
        <UpdateBanner />
        <WhatsNew />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
