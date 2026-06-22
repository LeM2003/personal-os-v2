// Historique des nouveautés affichées aux utilisateurs existants (composant WhatsNew).
// Ajoute une entrée en tête de tableau à chaque fonctionnalité notable livrée.
export interface ChangelogEntry {
  version: string
  date: string
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2026-06-22',
    date: '22 juin 2026',
    items: [
      'Confirmations et notifications repensées : fini les pop-ups du navigateur, place à des messages intégrés et plus clairs',
      'Panneau « Quoi de neuf » accessible à tout moment depuis les Réglages',
    ],
  },
  {
    version: '2026-06-21',
    date: '21 juin 2026',
    items: [
      'Score de productivité pondéré sur le Dashboard et dans la notif du soir',
      'Vue d\'ensemble sur la page Finances (dépenses, dettes, épargne, abonnements)',
    ],
  },
]

export const LATEST_VERSION = CHANGELOG[0]?.version ?? ''
