import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { rateLimit } from '@/utils/rateLimit'
import { getUserFromBearer } from '@/lib/supabase/token'

// Rate limit par utilisateur authentifié (pas par IP — un user derrière un NAT/4G
// partagé ne doit pas être bloqué par les requêtes d'un autre).
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const VALID_TASKS = new Set(['parse_tasks', 'weekly_report', 'analyze_project', 'analyze'])
const MAX_MESSAGES = 20
const MAX_CONTENT_LENGTH = 8000

export async function POST(req: NextRequest) {
  // Cet endpoint appelle une API IA payante (Groq) — il doit être réservé aux
  // utilisateurs connectés, sinon n'importe qui peut consommer le quota/le coût.
  const { user } = await getUserFromBearer(req.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { success, remaining } = limiter(user.id)

  if (!success) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(15 * 60),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
    }

    const { messages, task } = body as { messages?: unknown; task?: unknown }

    if (typeof task !== 'string' || !VALID_TASKS.has(task)) {
      return NextResponse.json({ error: 'task invalide' }, { status: 400 })
    }
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: 'messages invalide' }, { status: 400 })
    }
    const validRoles = new Set(['user', 'assistant'])
    for (const m of messages) {
      if (
        typeof m !== 'object' || m === null
        || !validRoles.has((m as Record<string, unknown>).role as string)
        || typeof (m as Record<string, unknown>).content !== 'string'
        || ((m as Record<string, unknown>).content as string).length === 0
        || ((m as Record<string, unknown>).content as string).length > MAX_CONTENT_LENGTH
      ) {
        return NextResponse.json({ error: 'messages invalide' }, { status: 400 })
      }
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY non configurée' }, { status: 500 })
    }

    const systemPrompts: Record<string, string> = {
      parse_tasks: `Tu es un assistant qui extrait des tâches, devoirs et examens à partir de texte brut.
Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de commentaire).

Le format attendu :
{
"taches": [
{ "name": "...", "project": "École" ou "", "priority": "Critique"|"Important"|"Optionnel", "duration": 60, "deadline": "YYYY-MM-DD" ou "", "flexible": false }
],
"devoirs": [
{ "matiere": "...", "description": "...", "dateRendu": "YYYY-MM-DD" ou "", "priorite": "Critique"|"Important"|"Optionnel" }
],
"examens": [
{ "matiere": "...", "date": "YYYY-MM-DD" ou "", "heure": "HH:MM", "salle": "", "chapitres": "...", "totalChapitres": 3, "chapitresRevises": 0 }
]
}

Règles :
- Si c'est un devoir/rendu/TP → mets dans "devoirs"
- Si c'est un examen/contrôle/partiel/DS → mets dans "examens"
- Si c'est une tâche générale → mets dans "taches"
- La date du jour est : ${new Date().toISOString().split('T')[0]}
- Si aucune date n'est précisée, laisse le champ vide ""
- Convertis les dates relatives en YYYY-MM-DD
- duration en minutes
- Si pas d'items d'un type, renvoie un tableau vide []`,

      weekly_report: `Tu es un assistant personnel qui génère un résumé de semaine en français.
Sois concis, motivant et structuré. Format : titre, points clés accomplis, points à améliorer, message de motivation.`,

      analyze_project: `Tu es un coach business pour entrepreneurs africains. Analyse ce projet et donne une évaluation claire, pratique et motivante. Réponds en français. Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks.
Format : {"score_faisabilite": 8, "priorite_recommandee": "Haute", "prochaines_etapes": ["etape 1", "etape 2", "etape 3"], "raison": "Explication courte et motivante"}`,

      analyze: `Tu es un assistant personnel qui analyse les données d'un dashboard étudiant-entrepreneur.
Donne des conseils courts et actionnables en français.`,
    }

    const systemPrompt = systemPrompts[task] || systemPrompts.analyze

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 1024,
    })

    const content = completion.choices[0]?.message?.content || ''
    return NextResponse.json(
      { content },
      { headers: { 'X-RateLimit-Remaining': String(remaining) } },
    )
  } catch (err) {
    console.error('Groq API error:', err)
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  }
}
