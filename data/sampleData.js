import { genId, todayISO } from '../utils/dates'

const today = todayISO()

const future = (days) => {
  const d = new Date(); d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const past = (days) => {
  const d = new Date(); d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

/* ─────────────────────────────────────────
   TÂCHES
   Mix : school + business + terminées sur 7j
   pour alimenter le streak et les stats
───────────────────────────────────────── */
export const SAMPLE_TASKS = [

  /* ── Business — en cours / à faire ── */
  { id: genId(), name: 'Finaliser maquette Figma — Site Cabinet Diallo',
    project: 'Freelance Web', priority: 'Critique', duration: 90,
    deadline: future(1), flexible: false, status: 'En cours', createdAt: today },

  { id: genId(), name: 'Envoyer devis pour refonte site artisanat',
    project: 'Freelance Web', priority: 'Critique', duration: 30,
    deadline: future(2), flexible: false, status: 'À faire', createdAt: today },

  { id: genId(), name: 'Rédiger business plan — Boutique artisanat en ligne',
    project: 'Boutique Artisanat Sénégal', priority: 'Important', duration: 120,
    deadline: future(5), flexible: true, status: 'À faire', createdAt: today },

  { id: genId(), name: 'Créer compte Stripe + tester paiement mobile money',
    project: 'Boutique Artisanat Sénégal', priority: 'Important', duration: 60,
    deadline: future(7), flexible: true, status: 'À faire', createdAt: today },

  { id: genId(), name: 'Publier post LinkedIn sur projet IA en cours',
    project: 'Personal Branding', priority: 'Optionnel', duration: 20,
    deadline: future(3), flexible: true, status: 'À faire', createdAt: today },

  /* ── École — à faire ── */
  { id: genId(), name: 'Réviser réseaux de neurones convolutifs (CNN) — chap. 5',
    project: 'École', priority: 'Critique', duration: 120,
    deadline: future(3), flexible: false, status: 'À faire', createdAt: today },

  { id: genId(), name: 'TP Spark — traitement dataset tweets sénégalais',
    project: 'École', priority: 'Important', duration: 180,
    deadline: future(4), flexible: false, status: 'En cours', createdAt: today },

  { id: genId(), name: 'Lire article : Transformer architecture (Attention is All You Need)',
    project: 'École', priority: 'Important', duration: 60,
    deadline: future(6), flexible: true, status: 'À faire', createdAt: today },

  /* ── Terminées hier — alimentent les stats ── */
  { id: genId(), name: 'Préparer slides exposé — Algorithmes de clustering',
    project: 'École', priority: 'Critique', duration: 90,
    deadline: past(1), flexible: false, status: 'Terminé', createdAt: past(1) },

  { id: genId(), name: 'Envoyer proposition commerciale à M. Ndiaye (client)',
    project: 'Freelance Web', priority: 'Critique', duration: 45,
    deadline: past(1), flexible: false, status: 'Terminé', createdAt: past(1) },

  /* ── Terminées avant-hier ── */
  { id: genId(), name: 'Corriger bugs formulaire contact — projet cabinet',
    project: 'Freelance Web', priority: 'Important', duration: 60,
    deadline: past(2), flexible: false, status: 'Terminé', createdAt: past(2) },

  { id: genId(), name: 'Lire chap. 3 : Introduction au Deep Learning',
    project: 'École', priority: 'Important', duration: 75,
    deadline: past(2), flexible: true, status: 'Terminé', createdAt: past(2) },

  /* ── Terminées il y a 3 jours ── */
  { id: genId(), name: 'Configurer hébergement Netlify — site vitrine',
    project: 'Freelance Web', priority: 'Critique', duration: 40,
    deadline: past(3), flexible: false, status: 'Terminé', createdAt: past(3) },

  /* ── Habitudes récurrentes ── */
  { id: genId(), name: 'Prière du Fadjr',
    project: '', priority: 'Critique', duration: 20,
    deadline: today, flexible: false, status: 'Terminé',
    createdAt: today, lastCompletedAt: today,
    recurring: true, recurrence: 'daily', recurrenceDays: [], recurrenceTime: '05:30' },

  { id: genId(), name: 'Running — 30 min Corniche',
    project: '', priority: 'Important', duration: 35,
    deadline: today, flexible: false, status: 'À faire',
    createdAt: today, lastCompletedAt: null,
    recurring: true, recurrence: 'weekly',
    recurrenceDays: ['Lundi', 'Mercredi', 'Vendredi'], recurrenceTime: '06:30' },

  { id: genId(), name: 'Lecture — 20 min (business / IA)',
    project: '', priority: 'Important', duration: 20,
    deadline: today, flexible: true, status: 'À faire',
    createdAt: today, lastCompletedAt: null,
    recurring: true, recurrence: 'daily', recurrenceDays: [], recurrenceTime: '21:00' },

  { id: genId(), name: 'Revue du jour — 3 choses accomplies',
    project: '', priority: 'Optionnel', duration: 10,
    deadline: today, flexible: true, status: 'À faire',
    createdAt: today, lastCompletedAt: null,
    recurring: true, recurrence: 'daily', recurrenceDays: [], recurrenceTime: '22:30' },
]

/* ─────────────────────────────────────────
   PROJETS
───────────────────────────────────────── */
export const SAMPLE_PROJECTS = [
  { id: genId(),
    name: 'Freelance Web',
    objective: 'Générer 150 000 FCFA/mois en créant des sites pour PME et cabinets à Dakar',
    targetDate: future(60),
    status: 'En cours',
    aiAnalysis: null,
    createdAt: past(30) },

  { id: genId(),
    name: 'Boutique Artisanat Sénégal',
    objective: 'Lancer une boutique e-commerce vendant de l\'artisanat sénégalais aux diasporas (France, USA)',
    targetDate: future(120),
    status: 'En cours',
    aiAnalysis: null,
    createdAt: past(15) },

  { id: genId(),
    name: 'Personal Branding',
    objective: 'Construire une présence LinkedIn + GitHub pour montrer mes compétences IA et attirer des opportunités',
    targetDate: future(45),
    status: 'En cours',
    aiAnalysis: null,
    createdAt: past(7) },
]

/* ─────────────────────────────────────────
   EMPLOI DU TEMPS — Master IA / Data Science
───────────────────────────────────────── */
export const SAMPLE_COURSES = [
  { id: genId(), nom: 'Machine Learning',          jour: 'Lundi',    heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 204',   professeur: 'Dr. Diallo',    color: '#6366f1' },
  { id: genId(), nom: 'Big Data & Cloud',           jour: 'Lundi',    heureDebut: '14:00', heureFin: '16:00', salle: 'Labo Réseau', professeur: 'M. Ndiaye',     color: '#3b82f6' },
  { id: genId(), nom: 'Deep Learning',              jour: 'Mardi',    heureDebut: '08:00', heureFin: '11:00', salle: 'Amphi B',     professeur: 'Dr. Fall',      color: '#ec4899' },
  { id: genId(), nom: 'Statistiques Avancées',      jour: 'Mercredi', heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 101',   professeur: 'Mme. Sarr',     color: '#f59e0b' },
  { id: genId(), nom: 'Traitement du Langage (TAL)',jour: 'Mercredi', heureDebut: '14:00', heureFin: '16:00', salle: 'Labo IA',     professeur: 'Dr. Mbaye',     color: '#14b8a6' },
  { id: genId(), nom: 'Vision par Ordinateur',      jour: 'Jeudi',    heureDebut: '10:00', heureFin: '12:00', salle: 'Labo IA',     professeur: 'Dr. Fall',      color: '#10b981' },
  { id: genId(), nom: 'Bases de Données NoSQL',     jour: 'Vendredi', heureDebut: '08:00', heureFin: '10:00', salle: 'Salle 204',   professeur: 'M. Diop',       color: '#8b5cf6' },
  { id: genId(), nom: 'Projet de Fin d\'Études',    jour: 'Vendredi', heureDebut: '14:00', heureFin: '17:00', salle: 'Salle Projet',professeur: 'Dr. Diallo',    color: '#ef4444' },
]

/* ─────────────────────────────────────────
   DEVOIRS
───────────────────────────────────────── */
export const SAMPLE_DEVOIRS = [
  { id: genId(), matiere: 'Big Data & Cloud',
    description: 'TP Spark : pipeline de traitement de 1M tweets — rapport + code GitHub',
    dateRendu: future(4), statut: 'En cours', priorite: 'Critique' },

  { id: genId(), matiere: 'Statistiques Avancées',
    description: 'Exercices séries 4 & 5 — régression logistique + tests d\'hypothèse',
    dateRendu: future(6), statut: 'À faire', priorite: 'Important' },

  { id: genId(), matiere: 'Traitement du Langage (TAL)',
    description: 'Implémenter un tokenizer pour le wolof avec HuggingFace Tokenizers',
    dateRendu: future(10), statut: 'À faire', priorite: 'Important' },

  { id: genId(), matiere: 'Machine Learning',
    description: 'Mini-projet : comparaison SVM vs Random Forest sur dataset santé Afrique',
    dateRendu: future(14), statut: 'À faire', priorite: 'Important' },

  { id: genId(), matiere: 'Bases de Données NoSQL',
    description: 'TP MongoDB : modélisation et requêtes agrégation — e-commerce',
    dateRendu: past(2), statut: 'Rendu', priorite: 'Important' },
]

/* ─────────────────────────────────────────
   EXAMENS
───────────────────────────────────────── */
export const SAMPLE_EXAMENS = [
  { id: genId(), matiere: 'Deep Learning',
    date: future(12), heure: '08:00', salle: 'Grand Amphi',
    chapitres: 'Perceptron, CNN, RNN, LSTM, Backpropagation',
    totalChapitres: 5, chapitresRevises: 2 },

  { id: genId(), matiere: 'Machine Learning',
    date: future(18), heure: '10:00', salle: 'Amphi B',
    chapitres: 'Régression, Classification, Clustering, SVM, Ensemble Methods',
    totalChapitres: 5, chapitresRevises: 3 },

  { id: genId(), matiere: 'Statistiques Avancées',
    date: future(22), heure: '08:00', salle: 'Salle 101',
    chapitres: 'Probabilités, Inférence, Tests, Régression, Bayésien',
    totalChapitres: 5, chapitresRevises: 1 },
]

/* ─────────────────────────────────────────
   DÉPENSES — 8 derniers jours
   Prix réalistes Dakar (FCFA)
───────────────────────────────────────── */
export const SAMPLE_EXPENSES = [
  /* Aujourd'hui */
  { id: genId(), amount: 200,  category: 'Transport',  date: today, type: 'Variable', note: 'Bus — université' },
  { id: genId(), amount: 1500, category: 'Nourriture', date: today, type: 'Variable', note: 'Thiéboudienne midi' },

  /* Hier */
  { id: genId(), amount: 200,  category: 'Transport',  date: past(1), type: 'Variable', note: 'Bus — aller' },
  { id: genId(), amount: 200,  category: 'Transport',  date: past(1), type: 'Variable', note: 'Bus — retour' },
  { id: genId(), amount: 2000, category: 'Nourriture', date: past(1), type: 'Variable', note: 'Déjeuner + jus bissap' },
  { id: genId(), amount: 500,  category: 'École',      date: past(1), type: 'Variable', note: 'Photocopies polycopiés ML' },

  /* Il y a 2 jours */
  { id: genId(), amount: 200,  category: 'Transport',  date: past(2), type: 'Variable', note: 'Bus' },
  { id: genId(), amount: 1800, category: 'Nourriture', date: past(2), type: 'Variable', note: 'Sandwich + boisson' },
  { id: genId(), amount: 2000, category: 'Business',   date: past(2), type: 'Variable', note: 'Données internet — travail client' },

  /* Il y a 3 jours */
  { id: genId(), amount: 400,  category: 'Transport',  date: past(3), type: 'Variable', note: 'Bus aller-retour' },
  { id: genId(), amount: 2500, category: 'Nourriture', date: past(3), type: 'Variable', note: 'Déjeuner café numérique' },
  { id: genId(), amount: 1000, category: 'École',      date: past(3), type: 'Variable', note: 'Impression rapport TP' },

  /* Il y a 4 jours */
  { id: genId(), amount: 200,  category: 'Transport',  date: past(4), type: 'Variable', note: 'Bus' },
  { id: genId(), amount: 1500, category: 'Nourriture', date: past(4), type: 'Variable', note: 'Déjeuner' },
  { id: genId(), amount: 2000, category: 'Loisirs',    date: past(4), type: 'Variable', note: 'Sortie avec amis — weekend' },
  { id: genId(), amount: 3000, category: 'Nourriture', date: past(4), type: 'Variable', note: 'Dîner en famille' },

  /* Il y a 5 jours */
  { id: genId(), amount: 400,  category: 'Transport',  date: past(5), type: 'Variable', note: 'Bus aller-retour' },
  { id: genId(), amount: 1800, category: 'Nourriture', date: past(5), type: 'Variable', note: 'Déjeuner + café' },
  { id: genId(), amount: 1500, category: 'Business',   date: past(5), type: 'Variable', note: 'Achat template Figma — client' },

  /* Il y a 6 jours */
  { id: genId(), amount: 200,  category: 'Transport',  date: past(6), type: 'Variable', note: 'Bus' },
  { id: genId(), amount: 2000, category: 'Nourriture', date: past(6), type: 'Variable', note: 'Thiéboudienne + jus' },
  { id: genId(), amount: 2000, category: 'Autre',      date: past(6), type: 'Variable', note: 'Crédit téléphone' },

  /* Il y a 7 jours */
  { id: genId(), amount: 400,  category: 'Transport',  date: past(7), type: 'Variable', note: 'Bus aller-retour' },
  { id: genId(), amount: 1500, category: 'Nourriture', date: past(7), type: 'Variable', note: 'Déjeuner café' },
  { id: genId(), amount: 500,  category: 'École',      date: past(7), type: 'Variable', note: 'Stylos + cahier' },
]

/* ─────────────────────────────────────────
   ABONNEMENTS
───────────────────────────────────────── */
export const SAMPLE_SUBS = [
  { id: genId(), name: 'Claude Pro',  amount: 13000, startDate: past(8),  cycle: 'Mensuel',   category: 'Business',
    nextRenewal: future(22) },

  { id: genId(), name: 'Canva Pro',   amount:  6000, startDate: past(23), cycle: 'Mensuel',   category: 'Business',
    nextRenewal: future(7) },

  { id: genId(), name: 'Netlify Pro', amount:  5500, startDate: past(45), cycle: 'Mensuel',   category: 'Business',
    nextRenewal: future(15) },

  { id: genId(), name: 'Nom de domaine (.com)', amount: 6000, startDate: past(180), cycle: 'Annuel', category: 'Business',
    nextRenewal: future(185) },
]
