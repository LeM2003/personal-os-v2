<div align="center">

# 🧠 Personal OS V2

### Dashboard de pilotage personnel pour étudiants & entrepreneurs.
### Tâches · projets · examens · finances · habits · assistant IA — en un seul endroit.

[![Next.js](https://img.shields.io/badge/Next.js-16.2-000?style=flat&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3FCF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-Android%20APK-5A0FC8?style=flat&logo=pwa&logoColor=white)](https://github.com/LeM2003/personal-os-v2/releases/latest)

**[🌐 personal-os.click](https://personal-os.click)** · **[📲 Télécharger l'APK](https://github.com/LeM2003/personal-os-v2/releases/latest)** · **[🎯 Roadmap](#-roadmap)** · **[💬 Feedback](https://github.com/LeM2003/personal-os-v2/issues)**

</div>

---

## 📲 Essayer / Installer

| Plateforme | Comment |
|---|---|
| 🌐 **Web** (instantané) | **[personal-os.click](https://personal-os.click)** |
| 🤖 **Android** (APK) | **[Dernière release](https://github.com/LeM2003/personal-os-v2/releases/latest)** → ouvrir le `.apk` → autoriser l'installation |
| 🍎 **iPhone** (PWA) | Safari → Partager → « Sur l'écran d'accueil » |

> Gratuit · fonctionne hors ligne · données synchronisées sur tous tes appareils.

---

## 🎯 Pourquoi Personal OS V2

Les outils existants sont **fragmentés** : Notion pour les notes, Todoist pour les tâches, Google Calendar pour l'agenda, Excel pour les finances, l'agenda papier pour les habitudes. Résultat : 10 apps ouvertes, contexte perdu, friction permanente.

**Personal OS V2** réunit tout dans **un seul tableau de bord intelligent**, avec un assistant IA qui comprend ton mode (Étudiant / Entrepreneur / Hybride) et t'aide à exécuter — pas juste à lister.

Conçu pour les **étudiants africains qui construisent** : profil dual, contraintes budgétaires (FCFA), pas de fioritures, exécution rapide.

---

## ✨ Features principales

### 📋 Productivité
- **Tâches** avec ajout rapide, swipe (terminer / supprimer), filtres par projet
- **Projets** en vue Liste + vue Kanban (drag-and-drop)
- **Habit tracker 90 jours** style GitHub-graph + streaks header
- **Vue Calendrier** *(roadmap V2.3)*

### 🎓 Module École
- Examens avec notifications J-3 / J-1 / J-0
- Devoirs avec deadlines + estimation temps
- Plan de révision IA généré par Groq

### 💰 Module Finances
- Dépenses & revenus multi-devises (XOF, EUR, USD)
- Paiements adaptés au contexte africain (Wave, Orange Money, Free Money)
- Catégorisation IA automatique
- Graphique camembert par catégorie

### 🤖 Assistant IA (Groq)
- Conversation contextualisée (mode profil + heure)
- Actions directes : `create_task`, `create_exam`, `create_idea`, `create_devoir`, `create_expense`
- Streaming temps réel
- Analyse projet IA + score

### 🎨 UX / Design
- Design system **"Neural OS"** : glassmorphisme, gradients cyan→violet→or, animations spring
- Thèmes sombre + clair (orbes dynamiques en sombre, ombres vraies en clair)
- PWA avec notifications Push (Service Worker v6)
- Mobile-first responsive

---

## 🛠️ Stack

| Couche | Tech |
|---|---|
| **Framework** | Next.js 16.2 (App Router, `proxy.ts`) |
| **Frontend** | React 19, TypeScript 5, Tailwind v4 |
| **Backend** | Supabase (Postgres + Auth + RLS) — 12 tables, migrations versionnées |
| **Sync** | Moteur unifié localStorage ⇄ Supabase (pull/push différentiel, offline-first) |
| **Auth** | Supabase email/password, token Bearer pour les API routes |
| **Emails** | Resend (domaine vérifié `personal-os.click`) |
| **IA** | Groq SDK (Llama 3.3 70B) — assistant + génération de tâches |
| **Notifications** | Web Push VAPID + Service Worker + Cron Vercel |
| **PWA / APK** | Manifest + SW custom · APK Android (TWA, signé) |
| **Animations** | Framer Motion 12 · **Icons** Lucide React |
| **Deploy** | Vercel · domaine `personal-os.click` |

---

## 🚀 Quick start

```bash
# 1. Cloner
git clone https://github.com/LeM2003/personal-os-v2.git
cd personal-os-v2

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir :
#   GROQ_API_KEY                    (https://console.groq.com)
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY

# 4. Lancer en dev
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

### Pré-requis
- Node.js 20+ (LTS recommandé)
- Compte [Groq](https://console.groq.com) pour la clé API IA (gratuit)
- Compte [Supabase](https://supabase.com) pour le backend (gratuit jusqu'à 500 MB DB + 50k MAU)

---

## 📂 Architecture

```
personal-os-v2/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── api/
│   │   ├── ai/             # Endpoints IA structurés (parse_tasks, analyze_project, weekly_report)
│   │   └── assistant/      # Streaming chat + actions IA
│   ├── page.tsx            # Dashboard principal
│   └── layout.tsx
├── components/             # UI components (cards, modals, kanban, charts)
├── context/                # React Context (theme, profile)
├── data/                   # localStorage helpers → migration Supabase en cours
├── hooks/                  # Custom hooks (useTheme, useStreak, useNotifications)
├── public/                 # PWA assets (icons, sw.js, manifest)
└── supabase/migrations/    # Migrations SQL versionnées (11 tables + RLS)
```

---

## 🎯 Roadmap

- [x] **V2.0** — Refonte UI + migration TypeScript complète
- [x] **V2.1** — Backend Supabase (schéma SQL complet, 11 tables + RLS)
- [ ] **V2.2** — Auth Supabase (email/password + magic link)
- [ ] **V2.3** — Migration `localStorage` → Supabase + sync multi-device (Realtime)
- [ ] **V2.4** — Vue Calendrier hebdo
- [ ] **V2.5** — Mode collaboratif (workspaces partagés)
- [ ] **V3.0** — Pricing FCFA + lancement campus UCAD

Voir les [issues](https://github.com/LeM2003/personal-os-v2/issues) pour le détail.

---

## 🤝 Feedback

Tu utilises Personal OS V2 ? Ouvre une [issue](https://github.com/LeM2003/personal-os-v2/issues) ou écris-moi sur [LinkedIn](https://www.linkedin.com/in/mouhamadou-diouf). Tout retour compte.

---

## 📝 Build in public

Ce projet est développé en transparence sur LinkedIn (#BuildInPublic). Suis l'avancée :
- [Profil Mouhamadou Diouf](https://www.linkedin.com/in/mouhamadou-diouf)
- Hashtag : `#PersonalOS`

---

## ⚖️ Licence

Code visible pour transparence et apprentissage. Tous droits réservés — pas de revente, pas de fork commercial sans accord. Pour collaborer : [contact](mailto:Mouhamadoud_Diouf@proton.me).

---

<div align="center">

**Construit avec ☕ et conviction à Dakar 🇸🇳 par [Mouhamadou Diouf](https://github.com/LeM2003)**

*AI Product Builder · [mouhamadou-diouf.com](https://mouhamadou-diouf.com) (bientôt)*

</div>
