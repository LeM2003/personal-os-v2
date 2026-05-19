import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'
import { rateLimit } from '@/utils/rateLimit'

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { success, remaining } = limiter(ip)

  if (!success) {
    return new Response(
      JSON.stringify({ error: 'Trop de requêtes. Réessayez dans quelques minutes.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(15 * 60),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  if (!process.env.GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY non configurée' }), { status: 500 })
  }

  const { messages, context } = await req.json()

  const today = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const ctx = context || {}
  const tasks = (ctx.tasks || []) as Record<string, unknown>[]
  const examens = (ctx.examens || []) as Record<string, unknown>[]
  const devoirs = (ctx.devoirs || []) as Record<string, unknown>[]
  const projects = (ctx.projects || []) as Record<string, unknown>[]
  const expenses = (ctx.expenses || []) as Record<string, unknown>[]
  const profile = (ctx.profile || {}) as Record<string, unknown>
  const streak = (ctx.streak || 0) as number

  const pendingTasks = tasks
    .filter(t => t.status !== 'Terminé' && !t.recurring)
    .slice(0, 10)
    .map(t => `[${t.id}] "${t.name}" — ${t.status}${t.deadline ? ' · deadline ' + t.deadline : ''}${t.priority ? ' · ' + t.priority : ''}`)
    .join('\n')

  const recurringTasks = tasks
    .filter(t => t.recurring && t.status !== 'Terminé')
    .slice(0, 5)
    .map(t => `[${t.id}] "${t.name}" (récurrente)`)
    .join('\n')

  const urgentToday = tasks
    .filter(t => t.status !== 'Terminé' && !t.recurring && t.deadline === today)
    .map(t => `[${t.id}] "${t.name}"`)
    .join(', ')

  const upcomingExams = examens
    .filter(e => String(e.date) >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 5)
    .map(e => `[${e.id}] ${e.matiere} le ${e.date}${e.heure ? ' à ' + e.heure : ''}`)
    .join('\n')

  const pendingDevoirs = devoirs
    .filter(d => d.statut !== 'Rendu')
    .slice(0, 5)
    .map(d => `[${d.id}] ${d.matiere}${d.dateRendu ? ' — avant ' + d.dateRendu : ''}`)
    .join('\n')

  const activeProjects = projects
    .filter(p => p.status !== 'Terminé')
    .slice(0, 5)
    .map(p => `[${p.id}] "${p.name}"`)
    .join('\n')

  const weekExpenses = expenses
    .filter(e => String(e.date) >= new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
    .reduce((s, e) => s + (Number(e.amount) || 0), 0)

  const hour = new Date().getHours()
  const timeContext = hour < 7 ? 'tôt le matin'
    : hour < 12 ? 'ce matin'
    : hour < 14 ? 'à l\'heure du déjeuner'
    : hour < 18 ? 'cet après-midi'
    : hour < 21 ? 'ce soir'
    : 'tard le soir'

  const modeContext = profile.mode === 'etudiant'
    ? 'étudiant(e)'
    : profile.mode === 'entrepreneur'
    ? 'professionnel(le) / entrepreneur(e)'
    : 'étudiant(e) ET entrepreneur(e)'

  const systemPrompt = `Tu es l'assistant personnel de ${profile.prenom || 'l\'utilisateur'}, intégré dans Personal OS.

**PROFIL** : ${modeContext}
**MOMENT** : ${todayLabel}, ${timeContext}
**STREAK** : ${streak} jour(s) consécutifs

═══ DONNÉES ACTUELLES (avec IDs pour les actions) ═══

TÂCHES URGENTES AUJOURD'HUI :
${urgentToday || 'Aucune'}

TÂCHES EN ATTENTE :
${pendingTasks || 'Aucune'}

TÂCHES RÉCURRENTES :
${recurringTasks || 'Aucune'}

PROCHAINS EXAMENS :
${upcomingExams || 'Aucun'}

DEVOIRS À RENDRE :
${pendingDevoirs || 'Aucun'}

PROJETS ACTIFS :
${activeProjects || 'Aucun'}

DÉPENSES (7 derniers jours) : ${weekExpenses.toLocaleString('fr-FR')} FCFA

═══ COMPORTEMENT ═══

- Réponds en français, de façon concise et directe (3-5 phrases max)
- Sois encourageant comme un assistant personnel bienveillant
- N'invente JAMAIS de données absentes du contexte
- Utilise les IDs entre crochets pour les actions de modification

═══ ACTIONS DISPONIBLES ═══

Inclus UN SEUL bloc action à la toute fin de ta réponse quand l'utilisateur veut agir.
Format exact — JSON sur une seule ligne sans retour à la ligne dans le JSON :

CRÉER une tâche :
[ACTION:create_task:{"name":"...","priority":"Critique|Important|Optionnel","deadline":"YYYY-MM-DD ou vide","duration":25}]

CRÉER un projet/idée :
[ACTION:create_idea:{"name":"...","objective":"..."}]

CRÉER un examen :
[ACTION:create_exam:{"matiere":"...","date":"YYYY-MM-DD","heure":"HH:MM","salle":""}]

CRÉER un devoir :
[ACTION:create_devoir:{"matiere":"...","description":"...","dateRendu":"YYYY-MM-DD","priorite":"Important"}]

CRÉER une dépense :
[ACTION:create_expense:{"name":"...","amount":0,"category":"Alimentation|Transport|Loisirs|Santé|Autre"}]

MARQUER une tâche comme terminée :
[ACTION:complete_task:{"id":"id_exact_de_la_tache","name":"nom affiché"}]

MODIFIER la deadline d'une tâche :
[ACTION:update_task_deadline:{"id":"id_exact","name":"nom affiché","deadline":"YYYY-MM-DD"}]

MODIFIER la priorité d'une tâche :
[ACTION:update_task_priority:{"id":"id_exact","name":"nom affiché","priority":"Critique|Important|Optionnel"}]

SUPPRIMER une tâche :
[ACTION:delete_task:{"id":"id_exact","name":"nom affiché"}]

MARQUER un devoir comme rendu :
[ACTION:complete_devoir:{"id":"id_exact","matiere":"matière"}]

LANCER le pomodoro sur une tâche :
[ACTION:start_pomodoro:{"id":"id_exact","name":"nom affiché","duration":25}]

Règles absolues :
- Utilise UNIQUEMENT les IDs qui apparaissent dans les données ci-dessus (entre crochets [])
- N'invente jamais un ID
- La date du jour est ${today} — convertis les dates relatives (demain, vendredi prochain...)
- Si tu n'es pas sûr de l'ID, pose la question plutôt que d'agir
- Le bloc ACTION doit être à la toute fin du message, sur sa propre ligne`

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.4,
      max_tokens: 600,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) controller.enqueue(encoder.encode(text))
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
        'X-RateLimit-Remaining': String(remaining),
      },
    })
  } catch (err) {
    console.error('[assistant] Groq stream error:', err)
    return new Response(JSON.stringify({ error: 'Erreur IA' }), { status: 500 })
  }
}
